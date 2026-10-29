import type { Notification, NotificationAction } from "../components/data"

export type NotificationFilter = "all" | "unread"

/**
 * `unread` is optional and 12 of the 19 seed records omit it entirely, so every
 * read on it would need a Boolean() guard. Normalising once at seed time means
 * the rest of the code can treat it as a plain boolean, and "mark all as read"
 * visibly changes every row instead of appearing to skip the 12 undefined ones.
 */
export function seedNotifications(source: Notification[]): Notification[] {
  return source.map((n) => ({ ...n, unread: Boolean(n.unread) }))
}

export function unreadCount(items: Notification[]): number {
  return items.filter((n) => n.unread).length
}

/**
 * Deliberately preserves the source order rather than sorting by recency: the
 * records carry only a pre-baked relative string ("2m ago"), no date, and the
 * seed order is not strictly monotonic, so any sort would surface that.
 */
export function visibleNotifications(
  items: Notification[],
  filter: NotificationFilter
): Notification[] {
  return filter === "unread" ? items.filter((n) => n.unread) : items
}

export function markRead(items: Notification[], id: string): Notification[] {
  return items.map((n) => (n.id === id ? { ...n, unread: false } : n))
}

export function toggleRead(items: Notification[], id: string): Notification[] {
  return items.map((n) => (n.id === id ? { ...n, unread: !n.unread } : n))
}

export function markAllRead(items: Notification[]): Notification[] {
  return items.map((n) => (n.unread ? { ...n, unread: false } : n))
}

export function dismiss(items: Notification[], id: string): Notification[] {
  return items.filter((n) => n.id !== id)
}

/** "1 notification" / "2 notifications", matching the panel's other copy. */
export function pluralize(count: number, noun = "notification"): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}

/**
 * What a per-notification action button does once pressed. Accept/Decline style
 * choices resolve the notification and take it out of the list; everything else
 * is an acknowledgement, so the row stays but stops being unread.
 */
export type ActionOutcome = "resolve" | "acknowledge"

const RESOLVING_ACTIONS = new Set([
  "approve",
  "accept",
  "decline",
  "join",
  "rate",
])

export function actionOutcome(action: NotificationAction): ActionOutcome {
  return RESOLVING_ACTIONS.has(action.label.toLowerCase())
    ? "resolve"
    : "acknowledge"
}

/**
 * Confirmation copy for an action button. Keyed off the label because the
 * `action` field on NotificationAction is declared but populated nowhere in the
 * seed data, so there is no id to switch on.
 *
 * The descriptions say what happened rather than naming the record, which is
 * the opposite of the calendar panel's toasts. Every title carrying actions is
 * a category label ("Pending approval", "Feedback requested"), so interpolating
 * it produces things like "Pending approval was approved". The row the user just
 * pressed also changes in front of them, so the record is never ambiguous.
 */
export function actionToast(action: NotificationAction): {
  title: string
  description: string
} {
  switch (action.label.toLowerCase()) {
    case "approve":
      return {
        title: "Approval sent",
        description: "The team has been notified and can ship.",
      }
    case "review":
      return {
        title: "Added to your queue",
        description: "It is waiting in your review list.",
      }
    case "accept":
      return {
        title: "Invitation accepted",
        description: "You now have access to the workspace.",
      }
    case "join":
      return {
        title: "You're in",
        description: "The event was added to your calendar.",
      }
    case "decline":
      return {
        title: "Declined",
        description: "The sender has been notified.",
      }
    case "rate":
      return {
        title: "Thanks for the feedback",
        description: "Your rating was recorded.",
      }
    case "later":
      return {
        title: "Snoozed",
        description: "This will come back tomorrow.",
      }
    default:
      return { title: action.label, description: "Done." }
  }
}
