import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types"
import {
  addDays,
  addMinutes,
  setHours,
  startOfDay,
  startOfWeek,
} from "date-fns"

// Fixed anchor so the demo is deterministic (stable screenshots) and the
// calendar opens on a populated week. Everything below is derived from it, so
// the fixtures never read the runtime clock.
export const ANCHOR = new Date("2026-07-08T12:00:00")

// A company holiday, marked as a custom off day (weekends are off by default).
export const HOLIDAY = new Date("2026-07-16T00:00:00")

/**
 * A calendar in one person's account: a labeled, color-coded category (Work,
 * Meetings, Focus, ...), not a teammate. Every event belongs to exactly one
 * calendar via its resourceId, which drives both the --ec-event-color css var
 * (color-by-calendar) and the Calendars filter.
 */
export interface CalendarCategory {
  id: string
  name: string
  color: string
}

export const CALENDARS: CalendarCategory[] = [
  { id: "work", name: "Work", color: "var(--color-blue-500)" },
  { id: "meetings", name: "Meetings", color: "var(--color-violet-500)" },
  { id: "focus", name: "Focus", color: "var(--color-amber-500)" },
  { id: "personal", name: "Personal", color: "var(--color-emerald-500)" },
  { id: "travel", name: "Travel", color: "var(--color-rose-500)" },
]

export const CALENDAR_BY_ID = new Map(CALENDARS.map((c) => [c.id, c]))

/** Color choices offered by the add/edit calendar dialog. */
export const CALENDAR_COLOR_OPTIONS: { name: string; value: string }[] = [
  { name: "Blue", value: "var(--color-blue-500)" },
  { name: "Violet", value: "var(--color-violet-500)" },
  { name: "Amber", value: "var(--color-amber-500)" },
  { name: "Emerald", value: "var(--color-emerald-500)" },
  { name: "Rose", value: "var(--color-rose-500)" },
  { name: "Cyan", value: "var(--color-cyan-500)" },
  { name: "Orange", value: "var(--color-orange-500)" },
  { name: "Teal", value: "var(--color-teal-500)" },
  { name: "Pink", value: "var(--color-pink-500)" },
  { name: "Indigo", value: "var(--color-indigo-500)" },
  { name: "Sky", value: "var(--color-sky-500)" },
]

/**
 * A person the owner meets with. People are the event guests (attendees), kept
 * separate from calendars: a calendar is a category, a guest is a real contact
 * with a portrait.
 */
export interface Person {
  id: string
  name: string
  role: string
  image: string
  initials: string
}

export const PEOPLE: Person[] = [
  {
    id: "mira",
    name: "Mira Stone",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    initials: "MS",
    role: "Product Lead",
  },
  {
    id: "leo",
    name: "Leo Grant",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    initials: "LG",
    role: "Engineering",
  },
  {
    id: "nora",
    name: "Nora Vale",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    initials: "NV",
    role: "Design",
  },
  {
    id: "theo",
    name: "Theo Park",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
    initials: "TP",
    role: "Program",
  },
  {
    id: "sana",
    name: "Sana Qureshi",
    image:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
    initials: "SQ",
    role: "Marketing",
  },
]

export const PERSON_BY_ID = new Map(PEOPLE.map((p) => [p.id, p]))

/** Per-event payload. The owning calendar is the event's resourceId, so it is
 *  deliberately NOT duplicated here. */
export interface EventData {
  description?: string
  location?: string
  /** Guest person ids (contacts invited to the event). */
  attendees?: string[]
}

export type AppEvent = CalendarEvent<EventData>

/**
 * A believable month in one professional's calendar. Covers every case the
 * calendar must survive: a weekly recurring series (display-only), multi-day
 * all-day bars, a locked (readOnly) focus block, timed meetings with guests,
 * and events across all five calendars so the filter and legend are populated.
 * All calendars start visible; the month stays calm because the event set is
 * intentionally light.
 */
export function buildEvents(anchor: Date): AppEvent[] {
  // Week is Monday-first to match the calendar's weekStartsOn={1}.
  const week = startOfWeek(startOfDay(anchor), { weekStartsOn: 1 })
  const at = (dayOffset: number, hour: number, minute = 0) =>
    addMinutes(setHours(addDays(week, dayOffset), hour), minute)
  const day = (dayOffset: number) => addDays(week, dayOffset)

  // Owned-by helper: stamps the resourceId (calendar) and its color so every
  // event reads color-by-calendar without repeating the token.
  const owned = (
    calendarId: string,
    event: Omit<AppEvent, "resourceId" | "color">
  ): AppEvent => ({
    ...event,
    resourceId: calendarId,
    color: CALENDAR_BY_ID.get(calendarId)!.color,
  })

  return [
    // ---- Weekly recurring planning block, one per Monday for the first three
    //      weeks (display-only; shows "Repeats weekly") ---------------------
    owned("meetings", {
      id: "weekly-planning",
      title: "Weekly planning",
      start: at(0, 9, 30),
      end: at(0, 10, 0),
      recurrence: { freq: "weekly", byWeekday: ["MO"], count: 3 },
      data: { location: "Zoom", attendees: ["leo", "nora"] },
    }),

    // ---- Prior week --------------------------------------------------------
    owned("personal", {
      id: "pto",
      title: "Time off",
      start: day(-5),
      end: day(-2),
      allDay: true,
    }),
    owned("meetings", {
      id: "one-on-one",
      title: "1:1 with Leo",
      start: at(-4, 11, 0),
      end: at(-4, 11, 30),
      data: { location: "Room 2", attendees: ["leo"] },
    }),

    // ---- Current week ------------------------------------------------------
    owned("work", {
      id: "design-review",
      title: "Design review",
      start: at(1, 10, 0),
      end: at(1, 11, 0),
      data: {
        location: "Zoom",
        description: "Walk through the onboarding flow mockups.",
        attendees: ["nora", "theo"],
      },
    }),
    owned("travel", {
      id: "offsite",
      title: "Offsite",
      start: day(3),
      end: day(5),
      allDay: true,
      data: {
        location: "Lakehouse",
        description: "Annual planning offsite and team dinner.",
      },
    }),

    // ---- Following week ----------------------------------------------------
    owned("meetings", {
      id: "roadmap",
      title: "Roadmap review",
      start: at(8, 13, 0),
      end: at(8, 14, 30),
      data: {
        location: "Boardroom",
        description: "Lock the Q3 roadmap and owners.",
        attendees: ["leo", "nora", "sana"],
      },
    }),
    owned("focus", {
      id: "focus-block",
      title: "Focus block",
      start: at(9, 14, 0),
      end: at(9, 16, 0),
      readOnly: true,
      data: { description: "Heads-down time. Please do not schedule over." },
    }),
    owned("meetings", {
      id: "client-call",
      title: "Client call: Northstar",
      start: at(11, 15, 0),
      end: at(11, 15, 30),
      data: { location: "Google Meet", attendees: ["mira"] },
    }),

    // ---- Week four ---------------------------------------------------------
    owned("meetings", {
      id: "interview",
      title: "Interview: System design",
      start: at(15, 10, 0),
      end: at(15, 10, 45),
      data: { location: "Room 3", description: "Candidate: Priya Nair" },
    }),
    owned("work", {
      id: "quarterly",
      title: "Quarterly planning",
      start: at(17, 13, 0),
      end: at(17, 14, 30),
      data: {
        location: "Boardroom",
        attendees: ["leo", "nora", "sana"],
      },
    }),

    // ---- Week five ---------------------------------------------------------
    owned("meetings", {
      id: "monthly-review",
      title: "Monthly review",
      start: at(22, 10, 0),
      end: at(22, 11, 0),
      data: {
        location: "Boardroom",
        attendees: ["leo", "nora", "theo", "sana"],
      },
    }),
    owned("work", {
      id: "release",
      title: "Release day",
      start: day(24),
      end: day(25),
      allDay: true,
      data: { description: "Coordinated GA rollout." },
    }),
  ]
}
