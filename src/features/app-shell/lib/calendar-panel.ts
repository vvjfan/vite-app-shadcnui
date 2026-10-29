import { TIMEZONE, toDayKey } from "../components/data"
import type {
  CalendarAccount,
  CalendarItem,
  UpcomingEvent,
} from "../components/data"
import type {
  AccountDialogState,
  CalendarItemDialogState,
  EventDialogState,
} from "../components/calendar-panel-dialogs"

/**
 * Pure state transitions for the right-hand calendar panel. The component keeps
 * its useState, its dialogs and its toasts; every list transition and every
 * derived string lives here so it can be exercised without rendering.
 *
 * Nothing mutates its argument. The panel seeds its state straight from
 * CALENDAR_ACCOUNTS and UPCOMING_EVENTS, module-level constants shared by every
 * mount, so an in-place edit would leak into the next one and survive a
 * navigation away from the page.
 */

// Monotonic ids so a new record can never collide with a seed id (which would
// make an insert read as an update). Seeded from the clock, so reopening the
// panel in the same session cannot restart the counter either.
let calendarSeq = Date.now()
let accountSeq = Date.now()
let eventSeq = Date.now()

export const newCalendarId = () => `cal-${calendarSeq++}`
export const newAccountId = () => `acct-${accountSeq++}`
export const newEventId = () => `evt-${eventSeq++}`

/** The fields the calendar dialog collects. Id and enabled are not editable. */
export type CalendarItemValues = Pick<CalendarItem, "label" | "color">

export type AccountValues = { email: string }

/** The fields the event dialog collects. Attendees are not editable here. */
export type EventValues = Omit<UpcomingEvent, "id" | "attendees">

// ── Calendars (nested inside their account) ──

/**
 * Both toggles match on the item id across every account rather than inside one,
 * because the checkbox row does not know which account it was rendered under.
 * Item ids are unique across the seed and every generated id is monotonic, so
 * exactly one item can match.
 */
export function toggleCalendarItem(
  accounts: CalendarAccount[],
  itemId: string
): CalendarAccount[] {
  return accounts.map((account) => ({
    ...account,
    items: account.items.map((item) =>
      item.id === itemId ? { ...item, enabled: !item.enabled } : item
    ),
  }))
}

export function setCalendarItemColor(
  accounts: CalendarAccount[],
  itemId: string,
  color: string
): CalendarAccount[] {
  return accounts.map((account) => ({
    ...account,
    items: account.items.map((item) =>
      item.id === itemId ? { ...item, color } : item
    ),
  }))
}

/**
 * Create or rename in one call, driven by the dialog's mode. An edit keeps the
 * item in place so the row does not jump; a create appends, which is the order
 * the account group renders.
 */
export function submitCalendarItem(
  accounts: CalendarAccount[],
  state: CalendarItemDialogState,
  values: CalendarItemValues
): CalendarAccount[] {
  const { mode, accountId, item } = state
  return accounts.map((account) => {
    if (account.id !== accountId) return account
    if (mode === "edit" && item) {
      return {
        ...account,
        items: account.items.map((current) =>
          current.id === item.id ? { ...current, ...values } : current
        ),
      }
    }
    return {
      ...account,
      items: [
        ...account.items,
        { id: newCalendarId(), enabled: true, ...values },
      ],
    }
  })
}

/**
 * Scoped to one account on purpose, unlike the toggles: a delete is destructive,
 * so it only ever touches the account the menu was opened from.
 */
export function removeCalendarItem(
  accounts: CalendarAccount[],
  accountId: string,
  itemId: string
): CalendarAccount[] {
  return accounts.map((account) =>
    account.id === accountId
      ? {
          ...account,
          items: account.items.filter((current) => current.id !== itemId),
        }
      : account
  )
}

// ── Accounts ──

export function submitAccount(
  accounts: CalendarAccount[],
  state: AccountDialogState,
  values: AccountValues
): CalendarAccount[] {
  const { mode, accountId } = state
  if (mode === "edit" && accountId) {
    return accounts.map((account) =>
      account.id === accountId ? { ...account, ...values } : account
    )
  }
  return [...accounts, { id: newAccountId(), email: values.email, items: [] }]
}

/**
 * Calendars are nested inside their account, so removing the account takes its
 * calendars with it. The confirmation copy says so, which is why the count is
 * read before this runs.
 */
export function removeAccount(
  accounts: CalendarAccount[],
  accountId: string
): CalendarAccount[] {
  return accounts.filter((account) => account.id !== accountId)
}

/**
 * The clause naming what a removal takes with it. Dropped entirely for an empty
 * account, and singular for exactly one, matching the gantt delete confirmation.
 */
export function accountCalendarClause(count: number): string {
  return count > 0 ? ` and its ${count} calendar${count === 1 ? "" : "s"}` : ""
}

// ── Events ──

export function submitEvent(
  events: UpcomingEvent[],
  state: EventDialogState,
  values: EventValues
): UpcomingEvent[] {
  const { mode, event } = state
  if (mode === "edit" && event) {
    return events.map((current) =>
      current.id === event.id ? { ...current, ...values } : current
    )
  }
  return [...events, { id: newEventId(), ...values }]
}

export function removeEvent(
  events: UpcomingEvent[],
  id: string
): UpcomingEvent[] {
  return events.filter((current) => current.id !== id)
}

// ── Calendar <-> events wiring ──

/** Days that carry at least one event, which is what dots the mini calendar. */
export function datesWithEvents(events: UpcomingEvent[]): Set<string> {
  return new Set(events.map((event) => event.date))
}

/**
 * The list under the mini calendar. A selected day narrows it to that day; no
 * selection falls back to every event sorted by day, so the list is never
 * empty-by-default.
 */
export function visibleEvents(
  events: UpcomingEvent[],
  selectedKey: string | null
): UpcomingEvent[] {
  return selectedKey
    ? events.filter((event) => event.date === selectedKey)
    : [...events].sort((a, b) => a.date.localeCompare(b.date))
}

export function dayHeading(date: Date | undefined, todayKey: string): string {
  if (!date) return "Up Next"
  return toDayKey(date) === todayKey
    ? "Today"
    : date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
}

/**
 * Local midnight for a `yyyy-mm-dd` key. The `T00:00:00` suffix with no `Z` is
 * load-bearing: a bare `yyyy-mm-dd` is parsed as UTC, which in any zone behind
 * UTC lands on the previous day, and this Date is fed straight back to toDayKey
 * through the calendar selection.
 */
export function dayKeyToDate(key: string): Date {
  return new Date(`${key}T00:00:00`)
}

// ── Month navigation ──

/** Always the first of the month, so stepping out of a 31st cannot overshoot. */
export function stepMonth(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1)
}

/**
 * Where the month in view sits relative to today. Drives whether the "back to
 * today" affordance shows at all, and which direction its arrow points.
 */
export function monthPosition(
  month: Date,
  today: Date
): "past" | "current" | "future" {
  const year = month.getFullYear()
  const todayYear = today.getFullYear()
  if (year === todayYear && month.getMonth() === today.getMonth()) {
    return "current"
  }
  if (
    year < todayYear ||
    (year === todayYear && month.getMonth() < today.getMonth())
  ) {
    return "past"
  }
  return "future"
}

// ── Share availability ──

export function availabilityLink(
  origin: string,
  email: string,
  dayKey: string
): string {
  return `${origin}/availability/${email.split("@")[0]}?day=${dayKey}`
}

/**
 * Says how busy the day already is, so the person handed the link knows what
 * they are booking around. Times are quoted in the account timezone because the
 * link is meant to leave this machine.
 */
export function availabilityDescription(
  events: UpcomingEvent[],
  dayKey: string,
  todayKey: string
): string {
  const busy = events.filter((event) => event.date === dayKey).length
  const dayText =
    dayKey === todayKey
      ? "today"
      : `on ${dayKeyToDate(dayKey).toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}`
  return `Anyone with the link can book a free slot ${dayText}, around your ${busy} scheduled event${busy === 1 ? "" : "s"}. Times shown in ${TIMEZONE.abbreviation}.`
}
