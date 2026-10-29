import { addDays, addMinutes, format, subDays } from "date-fns"

import type {
  EventCalendarOccurrence,
  EventCalendarRecurrenceRule,
} from "@/components/reui/event-calendar/event-calendar-types"
import { CALENDARS } from "../event-calendar/data"
import type {
  AppEvent,
  CalendarCategory,
  EventData,
} from "../event-calendar/data"
import type { EventDraft } from "../event-calendar/event-sheet"

/**
 * Pure model behind the event calendar: the draft <-> event conversions, the
 * locked-overlap rule, event CRUD, and calendar (category) CRUD including the
 * delete cascade. The component keeps its useState, its refs, and its toasts;
 * only the computation lives here so it can be exercised without rendering.
 *
 * Nothing mutates its argument. The event list is seeded from buildEvents() and
 * the calendars from CALENDARS, a module-level constant shared by every mount,
 * so an in-place edit would leak across navigations and survive a reload.
 */

/** Fallback owner when an event carries no resourceId of its own. */
export const DEFAULT_CALENDAR_ID = CALENDARS[0].id

const WEEKDAY_NAMES: Record<string, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
}

/** Display-only recurrence summary shown in the view sheet, e.g. "Repeats
 *  weekly on Monday". */
export function recurrenceLabel(
  recurrence: EventCalendarRecurrenceRule | string | undefined
): string | undefined {
  if (!recurrence) return undefined
  const freq =
    typeof recurrence === "string"
      ? recurrence.match(/FREQ=(\w+)/i)?.[1]?.toLowerCase()
      : recurrence.freq
  const labels: Record<string, string> = {
    daily: "Repeats daily",
    weekly: "Repeats weekly",
    monthly: "Repeats monthly",
    yearly: "Repeats yearly",
  }
  const base = (freq && labels[freq]) || "Repeats"
  // Name the weekday(s) for a structured weekly series.
  if (typeof recurrence !== "string" && recurrence.freq === "weekly") {
    const days = (recurrence.byWeekday ?? [])
      .map((entry) => (typeof entry === "string" ? entry : entry.day))
      .map((code) => WEEKDAY_NAMES[code])
      .filter(Boolean)
    if (days.length) return `${base} on ${days.join(", ")}`
  }
  return base
}

/** Hydrate the edit buffer from a clicked occurrence. */
export function draftFromEvent(
  occurrence: EventCalendarOccurrence<EventData>
): EventDraft {
  const event = occurrence.event
  // Read the clicked OCCURRENCE's times: a recurring event expands into
  // instances, and event.start/end is only the series template - so Friday's
  // standup must show Friday, not the series' Monday anchor.
  const { start, end } = occurrence
  const allDay = occurrence.allDay ?? false
  const lastDay = allDay ? subDays(end, 1) : end
  return {
    id: event.id,
    title: event.title,
    description: event.data?.description ?? "",
    location: event.data?.location ?? "",
    calendarId: event.resourceId ?? DEFAULT_CALENDAR_ID,
    attendees: event.data?.attendees ?? [],
    date: format(start, "yyyy-MM-dd"),
    dateEnd: format(lastDay < start ? start : lastDay, "yyyy-MM-dd"),
    start: format(start, "HH:mm"),
    end: format(end, "HH:mm"),
    allDay,
    readOnly: event.readOnly,
    recurrenceLabel: recurrenceLabel(event.recurrence),
  }
}

/**
 * The blank draft behind a quick-add or a drag-create.
 *
 * Slot ends are exclusive, so an all-day drag hands back the day AFTER the last
 * selected one; the draft stores the inclusive last day instead, which is what
 * the two date fields show. The calendar defaults to the first calendar that
 * still exists rather than a frozen constant, because the seed default can have
 * been deleted from the Calendars menu.
 */
export function createDraft(
  date: Date,
  allDay: boolean,
  end: Date | undefined,
  calendarId: string | undefined,
  calendars: CalendarCategory[]
): EventDraft {
  const startDay = format(date, "yyyy-MM-dd")
  const lastDay =
    end && end > date
      ? format(allDay ? subDays(end, 1) : end, "yyyy-MM-dd")
      : startDay
  return {
    title: "",
    description: "",
    location: "",
    calendarId: calendarId ?? calendars[0]?.id ?? DEFAULT_CALENDAR_ID,
    attendees: [],
    date: startDay,
    dateEnd: lastDay < startDay ? startDay : lastDay,
    start: allDay ? "09:00" : format(date, "HH:mm"),
    // a timed quick-add defaults to 30 min so Save passes on the first try
    end: allDay ? "10:00" : format(end ?? addMinutes(date, 30), "HH:mm"),
    allDay,
  }
}

// ── Calendars filter (which calendars are hidden from the grid) ──

/** An event with no calendar of its own is never hidden by the filter. */
export function visibleEvents(
  events: AppEvent[],
  hidden: ReadonlySet<string>
): AppEvent[] {
  return events.filter((e) => !e.resourceId || !hidden.has(e.resourceId))
}

/**
 * The grid is controlled and only ever sees the visible subset, so a drag or a
 * resize emits a list with the hidden events missing. Merging them back is what
 * keeps filtering from quietly deleting them. Create/edit/delete go through the
 * CRUD helpers below on the full array, so only move/resize needs this.
 */
export function mergeHiddenEvents(
  previous: AppEvent[],
  next: AppEvent[],
  hidden: ReadonlySet<string>
): AppEvent[] {
  const hiddenEvents = previous.filter(
    (e) => e.resourceId && hidden.has(e.resourceId)
  )
  return [...next, ...hiddenEvents]
}

export function toggleHidden(
  hidden: ReadonlySet<string>,
  id: string
): Set<string> {
  const next = new Set(hidden)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

/**
 * Drop a calendar from the hidden set. Used twice: on save, so an event saved
 * onto a filtered-out calendar is not silently invisible, and on delete, so a
 * later calendar that reused the id does not come back pre-hidden.
 *
 * Returns the SAME set when the id was not hidden. That identity is load
 * bearing: it is handed straight to a React setState, which bails out of the
 * re-render only when the value is unchanged.
 */
export function unhideCalendar(hidden: Set<string>, id: string): Set<string> {
  if (!hidden.has(id)) return hidden
  const next = new Set(hidden)
  next.delete(id)
  return next
}

// ── The locked-overlap business rule ──

/**
 * Nothing may overlap a locked (readOnly) event on the same calendar. Shared by
 * drags, resizes, and form saves so all three reject the same moves.
 *
 * Overlap is half-open: ends are exclusive, so a block that starts exactly when
 * a locked one ends is allowed. A locked event with no calendar of its own, or
 * a proposal with no target calendar, deliberately blocks across all calendars
 * rather than being skipped.
 */
export function findLockedConflict(
  events: AppEvent[],
  start: Date,
  end: Date,
  excludeId?: string,
  calendarId?: string
): AppEvent | undefined {
  return events.find(
    (event) =>
      event.readOnly &&
      event.id !== excludeId &&
      (!event.resourceId || !calendarId || event.resourceId === calendarId) &&
      event.start < end &&
      event.end > start
  )
}

// ── Event CRUD ──

/** The fields a save writes. Everything else on an edited event survives. */
export interface EventFields {
  title: string
  color: string
  start: Date
  end: Date
  allDay: boolean
  resourceId: string
  data: EventData
}

/**
 * The instant range a draft describes. An all-day draft stores an inclusive
 * last day but the calendar stores an exclusive end, hence the +1 day.
 */
export function draftRange(draft: EventDraft): { start: Date; end: Date } {
  const start = draft.allDay
    ? new Date(`${draft.date}T00:00:00`)
    : new Date(`${draft.date}T${draft.start}:00`)
  const end = draft.allDay
    ? addDays(new Date(`${draft.dateEnd}T00:00:00`), 1)
    : new Date(`${draft.dateEnd}T${draft.end}:00`)
  return { start, end }
}

export type PreparedEvent =
  { ok: true; fields: EventFields } | { ok: false; error: string }

/**
 * Validate a draft and build the fields to store, or return the message the
 * sheet shows inline. Order matters: an impossible range is reported before an
 * overlap, and both before a missing calendar, so the user fixes the field they
 * just touched rather than a consequence of it.
 *
 * The color is copied off the owning calendar on every save, which is what
 * keeps color-by-calendar true after a calendar is recolored.
 */
export function prepareEvent(
  events: AppEvent[],
  draft: EventDraft,
  calendars: CalendarCategory[]
): PreparedEvent {
  const { start, end } = draftRange(draft)
  if (end <= start) return { ok: false, error: "End must be after start." }

  const hit = findLockedConflict(events, start, end, draft.id, draft.calendarId)
  if (hit) {
    return { ok: false, error: `Overlaps the locked "${hit.title}" event.` }
  }

  const calendar = calendars.find((entry) => entry.id === draft.calendarId)
  if (!calendar) return { ok: false, error: "Choose a calendar." }

  return {
    ok: true,
    fields: {
      title: draft.title.trim() || "Untitled",
      color: calendar.color,
      start,
      end,
      allDay: draft.allDay,
      resourceId: draft.calendarId,
      // Blank optional fields are dropped rather than stored as "", so the view
      // sheet can test them for presence to decide whether to show the row.
      data: {
        description: draft.description.trim() || undefined,
        location: draft.location.trim() || undefined,
        attendees: draft.attendees.length ? draft.attendees : undefined,
      },
    },
  }
}

// Sequential within the session. Seed events use descriptive slugs
// ("weekly-planning"), so an "evt-" id can never collide with one.
export function nextEventId(seq: number): string {
  return `evt-${seq}`
}

/** A create appends; the grid places it by date, not by list position. */
export function addEvent(
  events: AppEvent[],
  id: string,
  fields: EventFields
): AppEvent[] {
  return [...events, { id, ...fields }]
}

/**
 * An edit merges over the stored event, so fields the sheet never exposes
 * (recurrence, readOnly, recurringEventId) survive the save.
 */
export function updateEvent(
  events: AppEvent[],
  id: string,
  fields: EventFields
): AppEvent[] {
  return events.map((event) =>
    event.id === id ? { ...event, ...fields } : event
  )
}

export function deleteEvent(events: AppEvent[], id: string): AppEvent[] {
  return events.filter((event) => event.id !== id)
}

// ── Calendar (category) CRUD ──

export interface CalendarValues {
  name: string
  color: string
}

// Sequential within the session. Seed calendars use word ids ("work",
// "meetings"), so a "cal-" id can never collide with one.
export function nextCalendarId(seq: number): string {
  return `cal-${seq}`
}

/** A new calendar appends, keeping the menu order stable for the ones above. */
export function addCalendar(
  calendars: CalendarCategory[],
  id: string,
  values: CalendarValues
): CalendarCategory[] {
  return [...calendars, { id, ...values }]
}

export function updateCalendar(
  calendars: CalendarCategory[],
  id: string,
  values: CalendarValues
): CalendarCategory[] {
  return calendars.map((c) => (c.id === id ? { ...c, ...values } : c))
}

/**
 * Events carry a copy of their calendar's color, so a recolor has to re-stamp
 * them or the grid keeps painting the old token until each event is re-saved.
 */
export function recolorCalendarEvents(
  events: AppEvent[],
  calendarId: string,
  color: string
): AppEvent[] {
  return events.map((e) => (e.resourceId === calendarId ? { ...e, color } : e))
}

export function removeCalendar(
  calendars: CalendarCategory[],
  id: string
): CalendarCategory[] {
  return calendars.filter((c) => c.id !== id)
}

/**
 * The delete cascade. Deleting a calendar DELETES the events that referenced
 * it rather than orphaning them onto a default calendar: an event has exactly
 * one calendar, and a re-homed event would silently change color and reappear
 * under a filter the user did not choose. The confirm dialog says so
 * ("This removes the calendar and its events").
 *
 * Events with no resourceId at all belong to no calendar and always survive.
 */
export function removeCalendarEvents(
  events: AppEvent[],
  calendarId: string
): AppEvent[] {
  return events.filter((e) => e.resourceId !== calendarId)
}
