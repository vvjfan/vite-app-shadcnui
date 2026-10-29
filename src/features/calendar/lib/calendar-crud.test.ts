import { addDays, addMinutes } from "date-fns"
import { describe, expect, it } from "vitest"

import type {
  EventCalendarOccurrence,
  EventCalendarRecurrenceRule,
} from "@/components/reui/event-calendar/event-calendar-types"
import {
  ANCHOR,
  buildEvents,
  CALENDARS,
} from "@/features/calendar/event-calendar/data"
import type {
  AppEvent,
  CalendarCategory,
  EventData,
} from "@/features/calendar/event-calendar/data"
import type { EventDraft } from "@/features/calendar/event-calendar/event-sheet"
import {
  addCalendar,
  addEvent,
  createDraft,
  DEFAULT_CALENDAR_ID,
  deleteEvent,
  draftFromEvent,
  draftRange,
  findLockedConflict,
  mergeHiddenEvents,
  nextCalendarId,
  nextEventId,
  prepareEvent,
  recolorCalendarEvents,
  recurrenceLabel,
  removeCalendar,
  removeCalendarEvents,
  toggleHidden,
  unhideCalendar,
  updateCalendar,
  updateEvent,
  visibleEvents,
} from "@/features/calendar/lib/calendar-crud"

// ── Fixtures ──

const at = (iso: string) => new Date(iso)

function event(overrides: Partial<AppEvent> = {}): AppEvent {
  return {
    id: "e1",
    title: "Sync",
    start: at("2026-07-06T09:00:00"),
    end: at("2026-07-06T10:00:00"),
    color: "var(--color-blue-500)",
    resourceId: "work",
    ...overrides,
  }
}

function occurrenceOf(
  source: AppEvent,
  start = source.start,
  end = source.end,
  isRecurring = false
): EventCalendarOccurrence<EventData> {
  return {
    key: `${source.id}::${start.toISOString()}`,
    eventId: source.id,
    event: source,
    start,
    end,
    allDay: source.allDay ?? false,
    isRecurring,
  }
}

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: "Sync",
    description: "",
    location: "",
    calendarId: "work",
    attendees: [],
    date: "2026-07-06",
    dateEnd: "2026-07-06",
    start: "09:00",
    end: "10:00",
    allDay: false,
    ...overrides,
  }
}

const calendars: CalendarCategory[] = [
  { id: "work", name: "Work", color: "var(--color-blue-500)" },
  { id: "focus", name: "Focus", color: "var(--color-amber-500)" },
]

// ── The Calendars filter ──

describe("visibleEvents", () => {
  const events = [
    event({ id: "a", resourceId: "work" }),
    event({ id: "b", resourceId: "focus" }),
    event({ id: "c", resourceId: undefined }),
  ]

  it("returns everything when nothing is hidden", () => {
    expect(visibleEvents(events, new Set())).toHaveLength(3)
  })

  it("drops only the events owned by a hidden calendar", () => {
    expect(visibleEvents(events, new Set(["work"])).map((e) => e.id)).toEqual([
      "b",
      "c",
    ])
  })

  // An event with no calendar answers to no filter, so hiding everything must
  // still leave it on the grid rather than emptying the month.
  it("keeps an event that belongs to no calendar", () => {
    const hidden = new Set(["work", "focus"])
    expect(visibleEvents(events, hidden).map((e) => e.id)).toEqual(["c"])
  })

  it("returns a new array and does not mutate the source", () => {
    const result = visibleEvents(events, new Set(["work"]))
    expect(result).not.toBe(events)
    expect(events).toHaveLength(3)
  })

  it("hides every event of a calendar in the real seed data", () => {
    const seed = buildEvents(ANCHOR)
    const meetings = seed.filter((e) => e.resourceId === "meetings")
    expect(meetings.length).toBeGreaterThan(0)
    expect(visibleEvents(seed, new Set(["meetings"]))).toHaveLength(
      seed.length - meetings.length
    )
  })
})

describe("mergeHiddenEvents", () => {
  const previous = [
    event({ id: "a", resourceId: "work" }),
    event({ id: "hidden", resourceId: "focus" }),
  ]

  // The grid only ever receives the visible subset, so the list it hands back
  // after a drag is missing the hidden events entirely. Without the merge, one
  // drag while a calendar is filtered out would delete that calendar's events.
  it("restores the events the grid never saw", () => {
    const fromGrid = [event({ id: "a", resourceId: "work", title: "Moved" })]
    const merged = mergeHiddenEvents(previous, fromGrid, new Set(["focus"]))
    expect(merged.map((e) => e.id)).toEqual(["a", "hidden"])
    expect(merged[0].title).toBe("Moved")
  })

  it("adds nothing when no calendar is hidden", () => {
    const fromGrid = [previous[0]]
    expect(mergeHiddenEvents(previous, fromGrid, new Set())).toEqual(fromGrid)
  })

  it("returns a new array and does not mutate either input", () => {
    const fromGrid = [previous[0]]
    const merged = mergeHiddenEvents(previous, fromGrid, new Set(["focus"]))
    expect(merged).not.toBe(fromGrid)
    expect(merged).not.toBe(previous)
    expect(previous).toHaveLength(2)
    expect(fromGrid).toHaveLength(1)
  })
})

describe("toggleHidden", () => {
  it("hides a visible calendar and reveals a hidden one", () => {
    const hidden = toggleHidden(new Set(), "work")
    expect([...hidden]).toEqual(["work"])
    expect([...toggleHidden(hidden, "work")]).toEqual([])
  })

  it("never mutates the source set", () => {
    const source = new Set(["work"])
    toggleHidden(source, "focus")
    toggleHidden(source, "work")
    expect([...source]).toEqual(["work"])
  })
})

describe("unhideCalendar", () => {
  it("removes the calendar from the hidden set", () => {
    expect([...unhideCalendar(new Set(["work", "focus"]), "work")]).toEqual([
      "focus",
    ])
  })

  // Identity is the React bail-out signal: saving onto an already-visible
  // calendar must not queue a pointless re-render of the whole grid.
  it("returns the very same set when the calendar was not hidden", () => {
    const source = new Set(["focus"])
    expect(unhideCalendar(source, "work")).toBe(source)
  })

  it("does not mutate the source set", () => {
    const source = new Set(["work"])
    unhideCalendar(source, "work")
    expect([...source]).toEqual(["work"])
  })
})

// ── The locked-overlap rule ──

describe("findLockedConflict", () => {
  const locked = event({
    id: "locked",
    title: "Focus block",
    readOnly: true,
    resourceId: "focus",
    start: at("2026-07-15T14:00:00"),
    end: at("2026-07-15T16:00:00"),
  })
  const events = [event({ id: "free" }), locked]

  it("reports the locked event a proposed range overlaps", () => {
    const hit = findLockedConflict(
      events,
      at("2026-07-15T15:00:00"),
      at("2026-07-15T17:00:00"),
      undefined,
      "focus"
    )
    expect(hit?.id).toBe("locked")
  })

  it("ignores events that are not locked", () => {
    const hit = findLockedConflict(
      [event({ id: "free" })],
      at("2026-07-06T09:30:00"),
      at("2026-07-06T09:45:00"),
      undefined,
      "work"
    )
    expect(hit).toBeUndefined()
  })

  // Ends are exclusive, so a block butted up against a locked one is legal.
  it("allows a range that starts exactly when the locked event ends", () => {
    expect(
      findLockedConflict(
        events,
        at("2026-07-15T16:00:00"),
        at("2026-07-15T17:00:00"),
        undefined,
        "focus"
      )
    ).toBeUndefined()
    expect(
      findLockedConflict(
        events,
        at("2026-07-15T13:00:00"),
        at("2026-07-15T14:00:00"),
        undefined,
        "focus"
      )
    ).toBeUndefined()
  })

  // Resizing the locked event itself must not be blocked by itself.
  it("skips the event named by excludeId", () => {
    expect(
      findLockedConflict(
        events,
        at("2026-07-15T14:30:00"),
        at("2026-07-15T15:30:00"),
        "locked",
        "focus"
      )
    ).toBeUndefined()
  })

  it("only blocks moves onto the locked event's own calendar", () => {
    expect(
      findLockedConflict(
        events,
        at("2026-07-15T14:30:00"),
        at("2026-07-15T15:30:00"),
        undefined,
        "work"
      )
    ).toBeUndefined()
  })

  // A locked event with no calendar of its own is a global block, and a
  // proposal with no target calendar is checked against every locked event.
  it("blocks across all calendars when either side has no calendar", () => {
    const globalLock = [{ ...locked, resourceId: undefined }]
    expect(
      findLockedConflict(
        globalLock,
        at("2026-07-15T14:30:00"),
        at("2026-07-15T15:30:00"),
        undefined,
        "work"
      )?.id
    ).toBe("locked")
    expect(
      findLockedConflict(
        events,
        at("2026-07-15T14:30:00"),
        at("2026-07-15T15:30:00")
      )?.id
    ).toBe("locked")
  })

  it("finds the one locked event in the real seed data", () => {
    const seed = buildEvents(ANCHOR)
    const lockedSeed = seed.filter((e) => e.readOnly)
    expect(lockedSeed.map((e) => e.id)).toEqual(["focus-block"])
    const hit = findLockedConflict(
      seed,
      addMinutes(lockedSeed[0].start, 30),
      addMinutes(lockedSeed[0].start, 60),
      undefined,
      lockedSeed[0].resourceId
    )
    expect(hit?.id).toBe("focus-block")
  })
})

// ── Draft <-> event conversion ──

describe("draftRange", () => {
  it("reads a timed draft straight off its date and time fields", () => {
    const { start, end } = draftRange(draft())
    expect(start).toEqual(at("2026-07-06T09:00:00"))
    expect(end).toEqual(at("2026-07-06T10:00:00"))
  })

  // The draft stores the INCLUSIVE last day but the calendar stores an
  // exclusive end, so a one-day all-day event must end at midnight the day
  // after, otherwise the month view paints a zero-width bar.
  it("turns the inclusive all-day last day into an exclusive end", () => {
    const { start, end } = draftRange(
      draft({ allDay: true, date: "2026-07-06", dateEnd: "2026-07-08" })
    )
    expect(start).toEqual(at("2026-07-06T00:00:00"))
    expect(end).toEqual(at("2026-07-09T00:00:00"))
  })

  it("ignores the time fields entirely for an all-day draft", () => {
    const { start, end } = draftRange(
      draft({ allDay: true, start: "13:00", end: "23:45" })
    )
    expect(start).toEqual(at("2026-07-06T00:00:00"))
    expect(end).toEqual(at("2026-07-07T00:00:00"))
  })
})

describe("prepareEvent", () => {
  it("builds the fields to store for a valid draft", () => {
    const result = prepareEvent(
      [],
      draft({ title: "  Design review  " }),
      calendars
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.title).toBe("Design review")
    expect(result.fields.color).toBe("var(--color-blue-500)")
    expect(result.fields.resourceId).toBe("work")
    expect(result.fields.allDay).toBe(false)
  })

  // A blank title is accepted rather than blocking the save; the grid needs
  // something to render, so it becomes "Untitled".
  it("falls back to Untitled for a blank or whitespace title", () => {
    for (const title of ["", "   "]) {
      const result = prepareEvent([], draft({ title }), calendars)
      expect(result.ok && result.fields.title).toBe("Untitled")
    }
  })

  // The view sheet decides whether to render each detail row by testing the
  // field for presence, so an empty box must store undefined, never "".
  it("drops blank optional fields instead of storing empty strings", () => {
    const result = prepareEvent(
      [],
      draft({ description: "   ", location: "", attendees: [] }),
      calendars
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fields.data.description).toBeUndefined()
    expect(result.fields.data.location).toBeUndefined()
    expect(result.fields.data.attendees).toBeUndefined()
  })

  it("trims the description and location it does keep", () => {
    const result = prepareEvent(
      [],
      draft({ description: "  notes  ", location: "  Room 2  " }),
      calendars
    )
    expect(result.ok && result.fields.data.description).toBe("notes")
    expect(result.ok && result.fields.data.location).toBe("Room 2")
  })

  it("rejects a range that ends at or before its start", () => {
    expect(prepareEvent([], draft({ end: "09:00" }), calendars)).toEqual({
      ok: false,
      error: "End must be after start.",
    })
    expect(prepareEvent([], draft({ end: "08:00" }), calendars)).toEqual({
      ok: false,
      error: "End must be after start.",
    })
  })

  it("rejects a save that would overlap a locked event", () => {
    const locked = event({
      id: "locked",
      title: "Focus block",
      readOnly: true,
      start: at("2026-07-06T09:30:00"),
      end: at("2026-07-06T10:30:00"),
    })
    expect(prepareEvent([locked], draft(), calendars)).toEqual({
      ok: false,
      error: 'Overlaps the locked "Focus block" event.',
    })
  })

  it("rejects a draft pointing at a calendar that no longer exists", () => {
    expect(
      prepareEvent([], draft({ calendarId: "deleted" }), calendars)
    ).toEqual({ ok: false, error: "Choose a calendar." })
  })

  // The three failures are ordered so the message names the field the user just
  // touched, not a knock-on effect of it.
  it("reports an impossible range before an overlap or a missing calendar", () => {
    const locked = event({
      id: "locked",
      title: "Focus block",
      readOnly: true,
      start: at("2026-07-06T00:00:00"),
      end: at("2026-07-07T00:00:00"),
    })
    const result = prepareEvent(
      [locked],
      draft({ end: "09:00", calendarId: "deleted" }),
      calendars
    )
    expect(result).toEqual({ ok: false, error: "End must be after start." })
  })

  it("re-reads the color from the calendar on every save", () => {
    const recolored = updateCalendar(calendars, "work", {
      name: "Work",
      color: "var(--color-pink-500)",
    })
    const result = prepareEvent([], draft(), recolored)
    expect(result.ok && result.fields.color).toBe("var(--color-pink-500)")
  })

  it("does not mutate the events it checks against", () => {
    const events = buildEvents(ANCHOR)
    const before = JSON.stringify(events)
    prepareEvent(events, draft(), CALENDARS)
    expect(JSON.stringify(events)).toBe(before)
  })
})

describe("draftFromEvent", () => {
  it("hydrates a timed event into the edit buffer", () => {
    const source = event({
      id: "design-review",
      title: "Design review",
      data: { location: "Zoom", description: "Mockups", attendees: ["nora"] },
    })
    const result = draftFromEvent(occurrenceOf(source))
    expect(result).toMatchObject({
      id: "design-review",
      title: "Design review",
      description: "Mockups",
      location: "Zoom",
      attendees: ["nora"],
      calendarId: "work",
      date: "2026-07-06",
      dateEnd: "2026-07-06",
      start: "09:00",
      end: "10:00",
      allDay: false,
    })
  })

  it("blanks the optional fields an event does not carry", () => {
    const result = draftFromEvent(occurrenceOf(event({ data: undefined })))
    expect(result.description).toBe("")
    expect(result.location).toBe("")
    expect(result.attendees).toEqual([])
  })

  // The stored end is exclusive, so it has to come back one day for the two
  // date fields, or a single-day all-day event would open showing two days.
  it("converts the exclusive all-day end back to an inclusive last day", () => {
    const source = event({
      allDay: true,
      start: at("2026-07-09T00:00:00"),
      end: at("2026-07-11T00:00:00"),
    })
    const result = draftFromEvent(occurrenceOf(source))
    expect(result.date).toBe("2026-07-09")
    expect(result.dateEnd).toBe("2026-07-10")
  })

  it("falls back to the default calendar when an event has no resourceId", () => {
    const result = draftFromEvent(
      occurrenceOf(event({ resourceId: undefined }))
    )
    expect(result.calendarId).toBe(DEFAULT_CALENDAR_ID)
    expect(result.calendarId).toBe("work")
  })

  // A recurring event expands into instances and event.start is only the series
  // template, so the clicked Monday must be the one that opens.
  it("reads the clicked occurrence's times, not the series anchor", () => {
    const seed = buildEvents(ANCHOR)
    const series = seed.find((e) => e.id === "weekly-planning")!
    const third = addDays(series.start, 14)
    const result = draftFromEvent(
      occurrenceOf(series, third, addMinutes(third, 30), true)
    )
    expect(result.date).not.toBe("2026-07-06")
    expect(result.date).toBe("2026-07-20")
    expect(result.start).toBe("09:30")
    expect(result.recurrenceLabel).toBe("Repeats weekly on Monday")
  })

  it("carries the locked flag through so the view sheet can hide Edit", () => {
    const seed = buildEvents(ANCHOR)
    const locked = seed.find((e) => e.id === "focus-block")!
    expect(draftFromEvent(occurrenceOf(locked)).readOnly).toBe(true)
  })
})

describe("recurrenceLabel", () => {
  it("returns undefined for an event with no recurrence", () => {
    expect(recurrenceLabel(undefined)).toBeUndefined()
  })

  it.each([
    ["daily", "Repeats daily"],
    ["weekly", "Repeats weekly"],
    ["monthly", "Repeats monthly"],
    ["yearly", "Repeats yearly"],
  ] as const)("labels a %s rule", (freq, expected) => {
    expect(recurrenceLabel({ freq })).toBe(expected)
  })

  it("names the weekdays of a structured weekly series", () => {
    expect(
      recurrenceLabel({
        freq: "weekly",
        byWeekday: ["MO", "WE"],
      })
    ).toBe("Repeats weekly on Monday, Wednesday")
  })

  it("reads the frequency out of a raw RRULE string", () => {
    expect(recurrenceLabel("RRULE:FREQ=MONTHLY;COUNT=4")).toBe(
      "Repeats monthly"
    )
  })

  // A raw string carries no structured byWeekday, so the day names are skipped
  // rather than guessed at.
  it("does not name weekdays for a raw weekly RRULE string", () => {
    expect(recurrenceLabel("RRULE:FREQ=WEEKLY;BYDAY=MO")).toBe("Repeats weekly")
  })

  it("falls back to a bare Repeats for an unrecognised frequency", () => {
    expect(recurrenceLabel("RRULE:FREQ=HOURLY")).toBe("Repeats")
    expect(
      recurrenceLabel({
        freq: "hourly",
      } as unknown as EventCalendarRecurrenceRule)
    ).toBe("Repeats")
  })

  it("ignores weekday codes it does not know", () => {
    expect(
      recurrenceLabel({
        freq: "weekly",
        byWeekday: ["XX"],
      } as unknown as EventCalendarRecurrenceRule)
    ).toBe("Repeats weekly")
  })
})

describe("createDraft", () => {
  const clicked = at("2026-07-06T14:00:00")

  // A quick-add has to be savable without touching the time fields, and
  // prepareEvent rejects a zero-length range, hence the 30 minute default.
  it("gives a timed quick-add a 30 minute default span", () => {
    const result = createDraft(clicked, false, undefined, undefined, calendars)
    expect(result.start).toBe("14:00")
    expect(result.end).toBe("14:30")
    expect(result.date).toBe("2026-07-06")
    expect(result.dateEnd).toBe("2026-07-06")
  })

  it("keeps a dragged timed span", () => {
    const result = createDraft(
      clicked,
      false,
      at("2026-07-06T16:15:00"),
      undefined,
      calendars
    )
    expect(result.end).toBe("16:15")
  })

  // Slot ends are exclusive: a two-day all-day drag arrives as the 8th, which
  // is the day after the last selected one.
  it("stores the inclusive last day of an all-day drag", () => {
    const result = createDraft(
      at("2026-07-06T00:00:00"),
      true,
      at("2026-07-08T00:00:00"),
      undefined,
      calendars
    )
    expect(result.date).toBe("2026-07-06")
    expect(result.dateEnd).toBe("2026-07-07")
    expect(result.allDay).toBe(true)
    expect(result.start).toBe("09:00")
    expect(result.end).toBe("10:00")
  })

  it("never lets the end day fall before the start day", () => {
    const result = createDraft(
      clicked,
      true,
      at("2026-07-01T00:00:00"),
      undefined,
      calendars
    )
    expect(result.dateEnd).toBe(result.date)
  })

  it("opens with no id so the save is treated as a create", () => {
    expect(
      createDraft(clicked, false, undefined, undefined, calendars).id
    ).toBeUndefined()
  })

  it("honours the calendar the slot was clicked on", () => {
    expect(
      createDraft(clicked, false, undefined, "focus", calendars).calendarId
    ).toBe("focus")
  })

  // The seed default can have been deleted from the Calendars menu, so the
  // fallback is the first calendar that still exists.
  it("defaults to the first surviving calendar", () => {
    const survivors = removeCalendar(calendars, "work")
    expect(
      createDraft(clicked, false, undefined, undefined, survivors).calendarId
    ).toBe("focus")
  })

  // BUG: with every calendar deleted there is nothing to fall back to, so the
  // draft points at the seed default ("work") which no longer exists. The
  // resulting save fails with "Choose a calendar." and the Calendar dropdown is
  // empty, so the sheet cannot be completed. Nothing guards against deleting
  // the last calendar in the first place.
  it("falls back to a calendar that does not exist once all are deleted", () => {
    const none: CalendarCategory[] = []
    const result = createDraft(clicked, false, undefined, undefined, none)
    expect(result.calendarId).toBe(DEFAULT_CALENDAR_ID)
    expect(prepareEvent([], result, none)).toEqual({
      ok: false,
      error: "Choose a calendar.",
    })
  })
})

// ── Event CRUD ──

describe("event ids", () => {
  it("numbers events sequentially", () => {
    expect(nextEventId(1)).toBe("evt-1")
    expect(nextEventId(2)).toBe("evt-2")
  })

  // A generated id colliding with a seed id would be misread as an update, so
  // the create would silently overwrite an existing event.
  it("never collides with a seed event id", () => {
    const seedIds = new Set(buildEvents(ANCHOR).map((e) => e.id))
    const generated = Array.from({ length: 50 }, (_, i) => nextEventId(i + 1))
    expect(new Set(generated).size).toBe(generated.length)
    for (const id of generated) expect(seedIds.has(id)).toBe(false)
  })
})

describe("addEvent", () => {
  const fields = {
    title: "New",
    color: "var(--color-blue-500)",
    start: at("2026-07-07T09:00:00"),
    end: at("2026-07-07T10:00:00"),
    allDay: false,
    resourceId: "work",
    data: {},
  }

  it("appends the new event with the id it was given", () => {
    const events = [event({ id: "a" })]
    const next = addEvent(events, "evt-1", fields)
    expect(next.map((e) => e.id)).toEqual(["a", "evt-1"])
    expect(next[1].title).toBe("New")
  })

  it("returns a new array and leaves the seed constant untouched", () => {
    const seed = buildEvents(ANCHOR)
    const next = addEvent(seed, "evt-1", fields)
    expect(next).not.toBe(seed)
    expect(next).toHaveLength(seed.length + 1)
    expect(seed.some((e) => e.id === "evt-1")).toBe(false)
  })
})

describe("updateEvent", () => {
  const fields = {
    title: "Renamed",
    color: "var(--color-amber-500)",
    start: at("2026-07-07T11:00:00"),
    end: at("2026-07-07T12:00:00"),
    allDay: false,
    resourceId: "focus",
    data: { location: "Room 2" },
  }

  it("touches only the target event", () => {
    const events = [event({ id: "a" }), event({ id: "b" })]
    const next = updateEvent(events, "b", fields)
    expect(next[0]).toBe(events[0])
    expect(next[1].title).toBe("Renamed")
    expect(next[1].resourceId).toBe("focus")
  })

  it("leaves the list alone for an unknown id", () => {
    const events = [event({ id: "a" })]
    expect(updateEvent(events, "nope", fields)).toEqual(events)
  })

  it("does not mutate the source array or its records", () => {
    const events = [event({ id: "a", title: "Sync" })]
    updateEvent(events, "a", fields)
    expect(events[0].title).toBe("Sync")
  })

  // Fields the sheet never exposes have to survive, or editing a locked event's
  // title would quietly unlock it.
  it("keeps the fields the sheet does not expose", () => {
    const events = [event({ id: "a", readOnly: true })]
    expect(updateEvent(events, "a", fields)[0].readOnly).toBe(true)
  })

  // BUG: the sheet opens a single OCCURRENCE of a recurring series but the save
  // writes back to the SERIES, keeping the recurrence rule while moving its
  // anchor to the clicked instance. Opening the third weekly-planning Monday
  // and pressing Save with nothing changed drops the two earlier Mondays and
  // invents two later ones. Nothing in the sheet says a series is being edited
  // and there is no "this occurrence only" option. deleteEvent has the mirror
  // of this: deleting from one occurrence removes the whole series.
  it("moves the whole series when one occurrence is saved unchanged", () => {
    const seed = buildEvents(ANCHOR)
    const series = seed.find((e) => e.id === "weekly-planning")!
    const third = addDays(series.start, 14)
    const buffer = draftFromEvent(
      occurrenceOf(series, third, addMinutes(third, 30), true)
    )
    const prepared = prepareEvent(seed, buffer, CALENDARS)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return

    const saved = updateEvent(seed, series.id, prepared.fields).find(
      (e) => e.id === series.id
    )!
    expect(saved.start).toEqual(third)
    expect(saved.start).not.toEqual(series.start)
    expect(saved.recurrence).toEqual(series.recurrence)
  })
})

describe("deleteEvent", () => {
  it("removes only the target event", () => {
    const events = [event({ id: "a" }), event({ id: "b" }), event({ id: "c" })]
    expect(deleteEvent(events, "b").map((e) => e.id)).toEqual(["a", "c"])
  })

  it("leaves the list alone for an unknown id", () => {
    const events = [event({ id: "a" })]
    expect(deleteEvent(events, "nope")).toHaveLength(1)
  })

  it("returns a new array and never mutates the seed constant", () => {
    const seed = buildEvents(ANCHOR)
    const next = deleteEvent(seed, "roadmap")
    expect(next).not.toBe(seed)
    expect(next).toHaveLength(seed.length - 1)
    expect(seed.some((e) => e.id === "roadmap")).toBe(true)
  })

  it("empties the list when the last event is deleted", () => {
    expect(deleteEvent([event({ id: "a" })], "a")).toEqual([])
  })
})

// ── Calendar (category) CRUD ──

describe("calendar ids", () => {
  it("numbers calendars sequentially", () => {
    expect(nextCalendarId(1)).toBe("cal-1")
    expect(nextCalendarId(2)).toBe("cal-2")
  })

  // A collision would make a create land on an existing calendar's events.
  it("never collides with a seed calendar id", () => {
    const seedIds = new Set(CALENDARS.map((c) => c.id))
    const generated = Array.from({ length: 50 }, (_, i) =>
      nextCalendarId(i + 1)
    )
    expect(new Set(generated).size).toBe(generated.length)
    for (const id of generated) expect(seedIds.has(id)).toBe(false)
  })
})

describe("addCalendar", () => {
  it("appends the new calendar so the menu order above it is stable", () => {
    const next = addCalendar(CALENDARS, "cal-1", {
      name: "Side projects",
      color: "var(--color-teal-500)",
    })
    expect(next).toHaveLength(CALENDARS.length + 1)
    expect(next[next.length - 1]).toEqual({
      id: "cal-1",
      name: "Side projects",
      color: "var(--color-teal-500)",
    })
  })

  it("returns a new array and never mutates the CALENDARS constant", () => {
    const next = addCalendar(CALENDARS, "cal-1", { name: "X", color: "red" })
    expect(next).not.toBe(CALENDARS)
    expect(CALENDARS).toHaveLength(5)
    expect(CALENDARS.some((c) => c.id === "cal-1")).toBe(false)
  })
})

describe("updateCalendar", () => {
  it("renames and recolors only the target calendar", () => {
    const next = updateCalendar(calendars, "focus", {
      name: "Deep work",
      color: "var(--color-teal-500)",
    })
    expect(next[0]).toBe(calendars[0])
    expect(next[1]).toEqual({
      id: "focus",
      name: "Deep work",
      color: "var(--color-teal-500)",
    })
  })

  it("leaves the list alone for an unknown id", () => {
    expect(
      updateCalendar(calendars, "nope", { name: "X", color: "red" })
    ).toEqual(calendars)
  })

  it("does not mutate the source records", () => {
    const source = [{ id: "work", name: "Work", color: "blue" }]
    updateCalendar(source, "work", { name: "Job", color: "red" })
    expect(source[0]).toEqual({ id: "work", name: "Work", color: "blue" })
  })
})

describe("recolorCalendarEvents", () => {
  // Events carry a copy of the color, so without the re-stamp the grid keeps
  // painting the old token until each event happens to be re-saved.
  it("re-stamps every event of that calendar and nothing else", () => {
    const events = [
      event({ id: "a", resourceId: "work", color: "blue" }),
      event({ id: "b", resourceId: "focus", color: "amber" }),
      event({ id: "c", resourceId: undefined, color: "grey" }),
    ]
    const next = recolorCalendarEvents(events, "work", "pink")
    expect(next.map((e) => e.color)).toEqual(["pink", "amber", "grey"])
    expect(next[1]).toBe(events[1])
  })

  it("does not mutate the source events", () => {
    const seed = buildEvents(ANCHOR)
    const before = seed
      .filter((e) => e.resourceId === "work")
      .map((e) => e.color)
    recolorCalendarEvents(seed, "work", "pink")
    expect(
      seed.filter((e) => e.resourceId === "work").map((e) => e.color)
    ).toEqual(before)
  })
})

describe("deleting a calendar", () => {
  it("removes only that calendar", () => {
    const next = removeCalendar(CALENDARS, "focus")
    expect(next.map((c) => c.id)).toEqual([
      "work",
      "meetings",
      "personal",
      "travel",
    ])
    expect(CALENDARS).toHaveLength(5)
  })

  it("leaves the list alone for an unknown id", () => {
    expect(removeCalendar(calendars, "nope")).toHaveLength(2)
  })

  // The cascade the confirm dialog promises: the events go with the calendar
  // rather than being re-homed onto another one.
  it("deletes the events that referenced it", () => {
    const seed = buildEvents(ANCHOR)
    const owned = seed.filter((e) => e.resourceId === "meetings")
    expect(owned.length).toBe(6)

    const next = removeCalendarEvents(seed, "meetings")
    expect(next).toHaveLength(seed.length - owned.length)
    expect(next.some((e) => e.resourceId === "meetings")).toBe(false)
  })

  // An event that belongs to no calendar answers to no cascade either.
  it("keeps events that have no calendar at all", () => {
    const events = [
      event({ id: "a", resourceId: "work" }),
      event({ id: "b", resourceId: undefined }),
    ]
    expect(removeCalendarEvents(events, "work").map((e) => e.id)).toEqual(["b"])
  })

  it("takes the locked focus block with the focus calendar", () => {
    const seed = buildEvents(ANCHOR)
    const next = removeCalendarEvents(seed, "focus")
    expect(next.some((e) => e.id === "focus-block")).toBe(false)
    // With the only locked event gone, nothing blocks that slot any more.
    expect(
      findLockedConflict(
        next,
        at("2026-07-15T14:30:00"),
        at("2026-07-15T15:30:00"),
        undefined,
        "focus"
      )
    ).toBeUndefined()
  })

  it("clears the calendar's hidden flag so a reused id is not pre-hidden", () => {
    expect([...unhideCalendar(new Set(["focus", "work"]), "focus")]).toEqual([
      "work",
    ])
  })

  it("never mutates the seed events or the CALENDARS constant", () => {
    const seed = buildEvents(ANCHOR)
    const eventCount = seed.length
    removeCalendarEvents(seed, "meetings")
    removeCalendar(CALENDARS, "meetings")
    expect(seed).toHaveLength(eventCount)
    expect(CALENDARS.map((c) => c.id)).toEqual([
      "work",
      "meetings",
      "focus",
      "personal",
      "travel",
    ])
  })

  // BUG: nothing stops the owner deleting every calendar. There is no "cannot
  // delete the last one" guard, and once the list is empty the calendar is
  // unusable - every event is gone and a new one can never be saved (see the
  // createDraft case above). Pinned as-is; the delete itself succeeds.
  it("allows deleting the last remaining calendar", () => {
    const one: CalendarCategory[] = [
      { id: "work", name: "Work", color: "blue" },
    ]
    expect(removeCalendar(one, "work")).toEqual([])
  })
})
