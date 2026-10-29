import { describe, expect, it } from "vitest"

import {
  CALENDAR_ACCOUNTS,
  TIMEZONE,
  TODAY,
  toDayKey,
  UPCOMING_EVENTS,
} from "@/features/app-shell/components/data"
import type {
  CalendarAccount,
  CalendarItem,
  UpcomingEvent,
} from "@/features/app-shell/components/data"
import {
  accountCalendarClause,
  availabilityDescription,
  availabilityLink,
  datesWithEvents,
  dayHeading,
  dayKeyToDate,
  monthPosition,
  newAccountId,
  newCalendarId,
  newEventId,
  removeAccount,
  removeCalendarItem,
  removeEvent,
  setCalendarItemColor,
  stepMonth,
  submitAccount,
  submitCalendarItem,
  submitEvent,
  toggleCalendarItem,
  visibleEvents,
} from "@/features/app-shell/lib/calendar-panel"

// ── Fixtures ──

const item = (overrides: Partial<CalendarItem> = {}): CalendarItem => ({
  id: "c1",
  label: "Work",
  color: "#4f46e5",
  enabled: true,
  ...overrides,
})

const account = (
  overrides: Partial<CalendarAccount> = {}
): CalendarAccount => ({
  id: "a1",
  email: "nick@company.io",
  items: [],
  ...overrides,
})

const event = (overrides: Partial<UpcomingEvent> = {}): UpcomingEvent => ({
  id: "e1",
  title: "Standup",
  date: "2026-07-25",
  startTime: "9:00 AM",
  endTime: "9:30 AM",
  calendarColor: "#4f46e5",
  ...overrides,
})

const accounts = (): CalendarAccount[] => [
  account({
    id: "work",
    items: [
      item({ id: "c1", label: "Work" }),
      item({ id: "c2", label: "Ops" }),
    ],
  }),
  account({
    id: "personal",
    email: "nick@gmail.com",
    items: [item({ id: "c3", label: "Family", enabled: false })],
  }),
]

const todayKey = toDayKey(TODAY)

// ── Ids ──

describe("id factories", () => {
  it("never repeats an id", () => {
    const ids = Array.from({ length: 200 }, () => newCalendarId())
    expect(new Set(ids).size).toBe(ids.length)
  })

  // The three counters are seeded from the same clock reading, so only the
  // prefix keeps a calendar, an account and an event apart.
  it("keeps the three sequences in separate namespaces", () => {
    expect(newCalendarId()).toMatch(/^cal-\d+$/)
    expect(newAccountId()).toMatch(/^acct-\d+$/)
    expect(newEventId()).toMatch(/^evt-\d+$/)
    expect(new Set([newCalendarId(), newAccountId(), newEventId()]).size).toBe(
      3
    )
  })

  // submitCalendarItem and submitEvent key on the id, so a generated id that
  // collided with a seed id would make an insert silently read as an update.
  it("cannot collide with any seed id", () => {
    const seedIds = new Set([
      ...CALENDAR_ACCOUNTS.map((a) => a.id),
      ...CALENDAR_ACCOUNTS.flatMap((a) => a.items.map((i) => i.id)),
      ...UPCOMING_EVENTS.map((e) => e.id),
    ])
    for (let n = 0; n < 50; n++) {
      expect(seedIds.has(newCalendarId())).toBe(false)
      expect(seedIds.has(newAccountId())).toBe(false)
      expect(seedIds.has(newEventId())).toBe(false)
    }
  })
})

// ── Calendars ──

describe("toggleCalendarItem", () => {
  it("flips only the target item", () => {
    const next = toggleCalendarItem(accounts(), "c1")
    expect(next[0].items.map((i) => i.enabled)).toEqual([false, true])
    expect(next[1].items[0].enabled).toBe(false)
  })

  it("goes both ways", () => {
    const off = toggleCalendarItem(accounts(), "c3")
    expect(off[1].items[0].enabled).toBe(true)
    expect(toggleCalendarItem(off, "c3")[1].items[0].enabled).toBe(false)
  })

  it("leaves everything alone for an unknown id", () => {
    const source = accounts()
    expect(toggleCalendarItem(source, "nope")).toEqual(source)
  })

  // The checkbox row is rendered from inside an account group but does not know
  // which account it belongs to, so the match is by item id across the whole
  // tree. Seed and generated ids are unique, so exactly one item can match.
  it("searches every account, not just the first", () => {
    const next = toggleCalendarItem(accounts(), "c3")
    expect(next[1].items[0].enabled).toBe(true)
  })

  it("returns a new array and does not mutate the input", () => {
    const source = accounts()
    const next = toggleCalendarItem(source, "c1")
    expect(next).not.toBe(source)
    expect(source[0].items[0].enabled).toBe(true)
  })
})

describe("setCalendarItemColor", () => {
  it("recolors only the target and keeps its other fields", () => {
    const next = setCalendarItemColor(accounts(), "c3", "#16a34a")
    expect(next[1].items[0]).toEqual({
      id: "c3",
      label: "Family",
      color: "#16a34a",
      enabled: false,
    })
    expect(next[0].items.map((i) => i.color)).toEqual(["#4f46e5", "#4f46e5"])
  })

  it("leaves everything alone for an unknown id", () => {
    const source = accounts()
    expect(setCalendarItemColor(source, "nope", "#000000")).toEqual(source)
  })

  it("does not mutate the input", () => {
    const source = accounts()
    setCalendarItemColor(source, "c1", "#000000")
    expect(source[0].items[0].color).toBe("#4f46e5")
  })
})

describe("submitCalendarItem", () => {
  const values = { label: "Travel", color: "#0d9488" }

  it("appends a new calendar to the named account, enabled", () => {
    const next = submitCalendarItem(
      accounts(),
      { mode: "create", accountId: "personal" },
      values
    )
    expect(next[0].items).toHaveLength(2)
    expect(next[1].items).toHaveLength(2)
    const created = next[1].items[1]
    expect(created.label).toBe("Travel")
    expect(created.color).toBe("#0d9488")
    expect(created.enabled).toBe(true)
    expect(created.id).toMatch(/^cal-\d+$/)
  })

  it("renames in place, keeping id, enabled and position", () => {
    const next = submitCalendarItem(
      accounts(),
      { mode: "edit", accountId: "personal", item: item({ id: "c3" }) },
      values
    )
    expect(next[1].items).toEqual([
      { id: "c3", label: "Travel", color: "#0d9488", enabled: false },
    ])
  })

  // The dialog always hands an item along with mode "edit", so this is the
  // unreachable half of the branch: with nothing to edit it falls through to the
  // create path rather than throwing.
  it("falls through to a create when edit mode carries no item", () => {
    const next = submitCalendarItem(
      accounts(),
      { mode: "edit", accountId: "work" },
      values
    )
    expect(next[0].items).toHaveLength(3)
  })

  it("changes nothing when the account id is unknown", () => {
    const source = accounts()
    expect(
      submitCalendarItem(source, { mode: "create", accountId: "nope" }, values)
    ).toEqual(source)
  })

  it("does not mutate the input", () => {
    const source = accounts()
    submitCalendarItem(source, { mode: "create", accountId: "work" }, values)
    expect(source[0].items).toHaveLength(2)
  })
})

describe("removeCalendarItem", () => {
  it("removes only the target calendar", () => {
    const next = removeCalendarItem(accounts(), "work", "c1")
    expect(next[0].items.map((i) => i.id)).toEqual(["c2"])
    expect(next[1].items).toHaveLength(1)
  })

  // Unlike the toggles, a delete is scoped to the account the menu was opened
  // from, so an id living in two accounts could only ever lose one copy.
  it("ignores a matching id in another account", () => {
    const source = [
      account({ id: "work", items: [item({ id: "shared" })] }),
      account({ id: "personal", items: [item({ id: "shared" })] }),
    ]
    const next = removeCalendarItem(source, "work", "shared")
    expect(next[0].items).toHaveLength(0)
    expect(next[1].items).toHaveLength(1)
  })

  it("changes nothing for an unknown account or item", () => {
    const source = accounts()
    expect(removeCalendarItem(source, "nope", "c1")).toEqual(source)
    expect(removeCalendarItem(source, "work", "nope")).toEqual(source)
  })

  it("does not mutate the input", () => {
    const source = accounts()
    removeCalendarItem(source, "work", "c1")
    expect(source[0].items).toHaveLength(2)
  })
})

// ── Accounts ──

describe("submitAccount", () => {
  it("appends a new account with no calendars", () => {
    const next = submitAccount(
      accounts(),
      { mode: "create" },
      { email: "nick@work.dev" }
    )
    expect(next).toHaveLength(3)
    expect(next[2].email).toBe("nick@work.dev")
    expect(next[2].items).toEqual([])
    expect(next[2].id).toMatch(/^acct-\d+$/)
  })

  it("edits the email in place and keeps the account's calendars", () => {
    const next = submitAccount(
      accounts(),
      { mode: "edit", accountId: "work", email: "nick@company.io" },
      { email: "nick@newco.io" }
    )
    expect(next).toHaveLength(2)
    expect(next[0].email).toBe("nick@newco.io")
    expect(next[0].items.map((i) => i.id)).toEqual(["c1", "c2"])
    expect(next[1].email).toBe("nick@gmail.com")
  })

  // Reachable only if the dialog ever opened in edit mode with no account, and
  // it appends rather than throwing. Pinned because the create branch is also
  // what an unknown-account edit would silently become.
  it("falls through to a create when edit mode carries no account id", () => {
    const next = submitAccount(
      accounts(),
      { mode: "edit" },
      { email: "ghost@x.io" }
    )
    expect(next).toHaveLength(3)
  })

  it("does not mutate the input", () => {
    const source = accounts()
    submitAccount(source, { mode: "create" }, { email: "a@b.io" })
    submitAccount(
      source,
      { mode: "edit", accountId: "work" },
      { email: "a@b.io" }
    )
    expect(source).toHaveLength(2)
    expect(source[0].email).toBe("nick@company.io")
  })
})

describe("removeAccount", () => {
  it("removes the account and cascades its calendars away with it", () => {
    const next = removeAccount(accounts(), "work")
    expect(next.map((a) => a.id)).toEqual(["personal"])
    const remainingItems = next.flatMap((a) => a.items.map((i) => i.id))
    expect(remainingItems).toEqual(["c3"])
  })

  it("leaves the other accounts and their calendars intact", () => {
    const next = removeAccount(accounts(), "personal")
    expect(next[0].items.map((i) => i.id)).toEqual(["c1", "c2"])
  })

  it("changes nothing for an unknown id", () => {
    const source = accounts()
    expect(removeAccount(source, "nope")).toEqual(source)
  })

  it("does not mutate the input", () => {
    const source = accounts()
    removeAccount(source, "work")
    expect(source).toHaveLength(2)
  })
})

describe("accountCalendarClause", () => {
  it("says nothing for an account with no calendars", () => {
    expect(accountCalendarClause(0)).toBe("")
  })

  it("stays singular for exactly one", () => {
    expect(accountCalendarClause(1)).toBe(" and its 1 calendar")
  })

  it("pluralises beyond one", () => {
    expect(accountCalendarClause(3)).toBe(" and its 3 calendars")
  })

  // Both seeded accounts carry calendars, so the confirmation always names them.
  it("names the calendars of every real seeded account", () => {
    for (const seeded of CALENDAR_ACCOUNTS) {
      expect(accountCalendarClause(seeded.items.length)).toContain(
        `${seeded.items.length} calendar`
      )
    }
  })
})

// ── Events ──

describe("submitEvent", () => {
  const values = {
    title: "Retro",
    date: "2026-07-26",
    startTime: "4:00 PM",
    endTime: "4:45 PM",
    calendarColor: "#0d9488",
  }

  it("appends a created event with a generated id", () => {
    const next = submitEvent([event()], { mode: "create" }, values)
    expect(next).toHaveLength(2)
    expect(next[1].id).toMatch(/^evt-\d+$/)
    expect(next[1].title).toBe("Retro")
  })

  it("updates in place, keeping id, position and attendees", () => {
    const source = [
      event({
        id: "e1",
        attendees: [{ fallback: "SC", color: "bg-violet-500" }],
      }),
      event({ id: "e2", title: "Sync" }),
    ]
    const next = submitEvent(source, { mode: "edit", event: source[0] }, values)
    expect(next.map((e) => e.id)).toEqual(["e1", "e2"])
    expect(next[0].title).toBe("Retro")
    expect(next[0].attendees).toHaveLength(1)
    expect(next[1].title).toBe("Sync")
  })

  it("changes nothing when the edited event is no longer in the list", () => {
    const source = [event({ id: "e1" })]
    const next = submitEvent(
      source,
      { mode: "edit", event: event({ id: "gone" }) },
      values
    )
    expect(next).toEqual(source)
  })

  // The dialog opens read-only on "view" and only submits after switching to
  // "edit", so this is the unreachable branch: a submit from view mode would
  // file a second copy rather than updating the record on screen.
  it("treats a submit in view mode as a create", () => {
    const source = [event({ id: "e1" })]
    const next = submitEvent(source, { mode: "view", event: source[0] }, values)
    expect(next).toHaveLength(2)
  })

  it("does not mutate the input", () => {
    const source = [event({ id: "e1" })]
    submitEvent(source, { mode: "create" }, values)
    submitEvent(source, { mode: "edit", event: source[0] }, values)
    expect(source).toHaveLength(1)
    expect(source[0].title).toBe("Standup")
  })
})

describe("removeEvent", () => {
  it("removes only the target", () => {
    const source = [
      event({ id: "e1" }),
      event({ id: "e2" }),
      event({ id: "e3" }),
    ]
    expect(removeEvent(source, "e2").map((e) => e.id)).toEqual(["e1", "e3"])
  })

  it("leaves the list alone for an unknown id", () => {
    const source = [event({ id: "e1" })]
    expect(removeEvent(source, "nope")).toHaveLength(1)
  })

  it("returns a new array and does not mutate the input", () => {
    const source = [event({ id: "e1" })]
    const next = removeEvent(source, "e1")
    expect(next).not.toBe(source)
    expect(source).toHaveLength(1)
  })
})

// ── Calendar <-> events wiring ──

describe("datesWithEvents", () => {
  it("collapses several events on one day into a single dotted day", () => {
    const days = datesWithEvents([
      event({ id: "e1", date: "2026-07-25" }),
      event({ id: "e2", date: "2026-07-25" }),
      event({ id: "e3", date: "2026-07-26" }),
    ])
    expect([...days]).toEqual(["2026-07-25", "2026-07-26"])
  })

  it("has nothing to dot for an empty list", () => {
    expect(datesWithEvents([]).size).toBe(0)
  })

  // The dots are the only signal that a day is busy, so every seeded day must
  // be represented exactly once.
  it("covers every distinct day in the real seed", () => {
    const days = datesWithEvents(UPCOMING_EVENTS)
    expect(days.size).toBe(new Set(UPCOMING_EVENTS.map((e) => e.date)).size)
    expect(days.has(todayKey)).toBe(true)
  })
})

describe("visibleEvents", () => {
  it("narrows to the selected day", () => {
    const source = [
      event({ id: "e1", date: "2026-07-25" }),
      event({ id: "e2", date: "2026-07-26" }),
      event({ id: "e3", date: "2026-07-25" }),
    ]
    expect(visibleEvents(source, "2026-07-25").map((e) => e.id)).toEqual([
      "e1",
      "e3",
    ])
  })

  it("returns nothing for a day with no events", () => {
    expect(visibleEvents([event()], "2026-01-01")).toEqual([])
  })

  it("falls back to every event, sorted by day, when nothing is selected", () => {
    const source = [
      event({ id: "e1", date: "2026-07-26" }),
      event({ id: "e2", date: "2026-07-24" }),
      event({ id: "e3", date: "2026-07-25" }),
    ]
    expect(visibleEvents(source, null).map((e) => e.id)).toEqual([
      "e2",
      "e3",
      "e1",
    ])
  })

  // BUG (pinned, not fixed): the day list is only ever filtered, never ordered
  // by start time, so an event created for an earlier hour lands at the bottom
  // of the day instead of in its slot.
  it("keeps insertion order within a day rather than sorting by start time", () => {
    const source = [
      event({ id: "late", date: "2026-07-25", startTime: "2:00 PM" }),
      event({ id: "early", date: "2026-07-25", startTime: "7:00 AM" }),
    ]
    expect(visibleEvents(source, "2026-07-25").map((e) => e.id)).toEqual([
      "late",
      "early",
    ])
    expect(visibleEvents(source, null).map((e) => e.id)).toEqual([
      "late",
      "early",
    ])
  })

  // BUG (pinned, not fixed): the unselected list is labelled "Up Next" but is
  // not filtered to future days, and sorting ascending puts the oldest first, so
  // the panel opens on an event that has already happened.
  it("leads the unselected list with past events", () => {
    const past = UPCOMING_EVENTS.filter((e) => e.date < todayKey)
    expect(past.length).toBeGreaterThan(0)
    expect(visibleEvents(UPCOMING_EVENTS, null)[0].date).toBe(past[0].date)
  })

  it("sorts a copy, so the source array keeps its own order", () => {
    const source = [
      event({ id: "e1", date: "2026-07-26" }),
      event({ id: "e2", date: "2026-07-24" }),
    ]
    const next = visibleEvents(source, null)
    expect(next).not.toBe(source)
    expect(source.map((e) => e.id)).toEqual(["e1", "e2"])
  })

  it("shows the real seeded events filed under today", () => {
    const today = visibleEvents(UPCOMING_EVENTS, todayKey)
    expect(today.length).toBe(
      UPCOMING_EVENTS.filter((e) => e.date === todayKey).length
    )
    expect(today.every((e) => e.date === todayKey)).toBe(true)
  })

  // BUG (pinned, not fixed): a calendar switched off in "My Calendars" still
  // shows its events here. `enabled` is read by the checkbox and the strike
  // through only, and events carry a colour rather than a calendar id, so there
  // is nothing to filter on.
  it("ignores whether the event's calendar is enabled", () => {
    const disabledColor = accounts()[1].items[0].color
    const source = [event({ id: "e1", calendarColor: disabledColor })]
    expect(visibleEvents(source, source[0].date)).toHaveLength(1)
  })
})

describe("dayHeading", () => {
  it("labels the unselected list Up Next", () => {
    expect(dayHeading(undefined, todayKey)).toBe("Up Next")
  })

  it("labels today by name rather than by date", () => {
    expect(dayHeading(TODAY, todayKey)).toBe("Today")
  })

  it("spells out any other day", () => {
    // Derived from today rather than hardcoded: a fixed date eventually becomes
    // today, and then this test asserts the wrong branch.
    const other = new Date(TODAY)
    other.setDate(other.getDate() + 1)
    expect(dayHeading(other, todayKey)).toBe(
      other.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    )
  })

  // A Date carrying a time of day still has to read as "Today", because the
  // calendar hands back whatever the day cell was constructed with.
  it("compares by day key, not by instant", () => {
    const later = new Date(TODAY)
    later.setHours(23, 59, 0, 0)
    expect(dayHeading(later, todayKey)).toBe("Today")
  })
})

describe("toDayKey and dayKeyToDate", () => {
  it("pads the month and the day to two digits", () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe("2026-01-05")
  })

  // The panel's whole day model is local. toISOString() would convert to UTC
  // first and so name the previous day for a local midnight in any zone ahead of
  // UTC, which would file an event under the wrong dot.
  it("names the local day, never the UTC one", () => {
    const localMidnight = new Date(2026, 0, 1)
    expect(toDayKey(localMidnight)).toBe("2026-01-01")
    if (localMidnight.getTimezoneOffset() < 0) {
      // Only true in a zone ahead of UTC, which is exactly the case toDayKey
      // exists to survive.
      expect(localMidnight.toISOString().slice(0, 10)).toBe("2025-12-31")
    }
  })

  it("parses a day key back to local midnight", () => {
    const parsed = dayKeyToDate("2026-01-01")
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(0)
    expect(parsed.getDate()).toBe(1)
    expect(parsed.getHours()).toBe(0)
  })

  // This round trip is the event date follow-through: submitting an event feeds
  // its day key straight back into the calendar selection, which reads it with
  // toDayKey again. Any UTC hop would land the selection a day off.
  it("round trips every seeded event day", () => {
    for (const seeded of UPCOMING_EVENTS) {
      expect(toDayKey(dayKeyToDate(seeded.date))).toBe(seeded.date)
    }
  })
})

// ── Month navigation ──

describe("stepMonth", () => {
  it("steps forward across a year boundary", () => {
    const next = stepMonth(new Date(2026, 11, 15), 1)
    expect(next.getFullYear()).toBe(2027)
    expect(next.getMonth()).toBe(0)
  })

  it("steps back across a year boundary", () => {
    const next = stepMonth(new Date(2026, 0, 15), -1)
    expect(next.getFullYear()).toBe(2025)
    expect(next.getMonth()).toBe(11)
  })

  // Normalising to the 1st is what stops a 31st from overshooting a short month
  // (Jan 31 plus a month would otherwise land in March).
  it("always lands on the first of the month", () => {
    const next = stepMonth(new Date(2026, 0, 31), 1)
    expect(next.getMonth()).toBe(1)
    expect(next.getDate()).toBe(1)
  })

  it("does not mutate the month it was given", () => {
    const month = new Date(2026, 0, 15)
    const before = month.getTime()
    stepMonth(month, 1)
    expect(month.getTime()).toBe(before)
  })
})

describe("monthPosition", () => {
  const today = new Date(2026, 6, 25)

  it("recognises the month in view as the current one", () => {
    expect(monthPosition(new Date(2026, 6, 1), today)).toBe("current")
  })

  it("calls an earlier month in the same year past", () => {
    expect(monthPosition(new Date(2026, 5, 1), today)).toBe("past")
  })

  it("calls any month of an earlier year past", () => {
    expect(monthPosition(new Date(2025, 11, 1), today)).toBe("past")
  })

  it("calls a later month in the same year future", () => {
    expect(monthPosition(new Date(2026, 7, 1), today)).toBe("future")
  })

  it("calls any month of a later year future", () => {
    expect(monthPosition(new Date(2027, 0, 1), today)).toBe("future")
  })
})

// ── Share availability ──

describe("availabilityLink", () => {
  it("uses the local part of the email as the handle", () => {
    expect(
      availabilityLink("https://app.io", "nick@company.io", "2026-07-25")
    ).toBe("https://app.io/availability/nick?day=2026-07-25")
  })

  // The panel passes "" for origin when there is no window, so the link has to
  // stay a usable relative path rather than becoming "undefined/...".
  it("stays relative with no origin", () => {
    expect(availabilityLink("", "nick@company.io", "2026-07-25")).toBe(
      "/availability/nick?day=2026-07-25"
    )
  })
})

describe("availabilityDescription", () => {
  it("says today rather than spelling out the date", () => {
    const copy = availabilityDescription([], todayKey, todayKey)
    expect(copy).toContain("book a free slot today,")
    expect(copy).not.toContain("on today")
  })

  it("names any other day", () => {
    // Tomorrow, not a fixed date: hardcoding one means the test silently
    // switches to the "today" branch once the calendar reaches it.
    const tomorrow = new Date(TODAY)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const otherKey = toDayKey(tomorrow)
    const copy = availabilityDescription([], otherKey, todayKey)
    expect(copy).toContain(
      `on ${dayKeyToDate(otherKey).toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      })}`
    )
  })

  it("counts only the events on that day", () => {
    const source = [
      event({ id: "e1", date: "2026-07-25" }),
      event({ id: "e2", date: "2026-07-26" }),
    ]
    expect(availabilityDescription(source, "2026-07-25", todayKey)).toContain(
      "your 1 scheduled event."
    )
  })

  it("pluralises zero and many", () => {
    expect(availabilityDescription([], "2026-07-25", todayKey)).toContain(
      "your 0 scheduled events"
    )
    const busy = [
      event({ id: "e1", date: "2026-07-25" }),
      event({ id: "e2", date: "2026-07-25" }),
    ]
    expect(availabilityDescription(busy, "2026-07-25", todayKey)).toContain(
      "your 2 scheduled events"
    )
  })

  // The link is meant to leave this machine, so it has to quote the zone.
  it("always names the account timezone", () => {
    expect(
      availabilityDescription(UPCOMING_EVENTS, todayKey, todayKey)
    ).toContain(`Times shown in ${TIMEZONE.abbreviation}.`)
  })

  it("counts the real seeded events on today", () => {
    const busy = UPCOMING_EVENTS.filter((e) => e.date === todayKey).length
    expect(
      availabilityDescription(UPCOMING_EVENTS, todayKey, todayKey)
    ).toContain(`your ${busy} scheduled event`)
  })
})

// ── The seed constants ──

describe("the seed constants", () => {
  // The panel seeds its state directly from these module-level arrays, which
  // every mount shares, so an in-place edit would follow the user around the app.
  it("survives every transition untouched", () => {
    const accountsBefore = structuredClone(CALENDAR_ACCOUNTS)
    const eventsBefore = structuredClone(UPCOMING_EVENTS)
    const seededAccount = CALENDAR_ACCOUNTS[0]
    const seededItem = seededAccount.items[0]
    const seededEvent = UPCOMING_EVENTS[0]

    toggleCalendarItem(CALENDAR_ACCOUNTS, seededItem.id)
    setCalendarItemColor(CALENDAR_ACCOUNTS, seededItem.id, "#000000")
    submitCalendarItem(
      CALENDAR_ACCOUNTS,
      { mode: "create", accountId: seededAccount.id },
      { label: "Travel", color: "#000000" }
    )
    submitCalendarItem(
      CALENDAR_ACCOUNTS,
      { mode: "edit", accountId: seededAccount.id, item: seededItem },
      { label: "Travel", color: "#000000" }
    )
    removeCalendarItem(CALENDAR_ACCOUNTS, seededAccount.id, seededItem.id)
    submitAccount(CALENDAR_ACCOUNTS, { mode: "create" }, { email: "a@b.io" })
    submitAccount(
      CALENDAR_ACCOUNTS,
      { mode: "edit", accountId: seededAccount.id },
      { email: "a@b.io" }
    )
    removeAccount(CALENDAR_ACCOUNTS, seededAccount.id)

    submitEvent(
      UPCOMING_EVENTS,
      { mode: "create" },
      {
        title: "New",
        date: todayKey,
        startTime: "9:00 AM",
        endTime: "9:30 AM",
        calendarColor: "#000000",
      }
    )
    submitEvent(
      UPCOMING_EVENTS,
      { mode: "edit", event: seededEvent },
      {
        title: "New",
        date: todayKey,
        startTime: "9:00 AM",
        endTime: "9:30 AM",
        calendarColor: "#000000",
      }
    )
    removeEvent(UPCOMING_EVENTS, seededEvent.id)
    visibleEvents(UPCOMING_EVENTS, null)

    expect(CALENDAR_ACCOUNTS).toEqual(accountsBefore)
    expect(UPCOMING_EVENTS).toEqual(eventsBefore)
  })
})
