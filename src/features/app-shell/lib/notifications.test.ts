import { describe, expect, it } from "vitest"

import { NOTIFICATIONS } from "@/features/app-shell/components/data"
import type { Notification } from "@/features/app-shell/components/data"
import {
  actionOutcome,
  actionToast,
  dismiss,
  markAllRead,
  markRead,
  pluralize,
  seedNotifications,
  toggleRead,
  unreadCount,
  visibleNotifications,
} from "@/features/app-shell/lib/notifications"

const item = (id: string, unread?: boolean): Notification => ({
  id,
  type: "system",
  title: `Notification ${id}`,
  time: "2m ago",
  ...(unread === undefined ? {} : { unread }),
})

describe("seedNotifications", () => {
  // 12 of the 19 seed records omit `unread` entirely.
  it("normalises a missing unread flag to false", () => {
    const seeded = seedNotifications([item("a"), item("b", true)])
    expect(seeded.map((n) => n.unread)).toEqual([false, true])
  })

  it("does not mutate the source array", () => {
    const source = [item("a")]
    seedNotifications(source)
    expect(source[0]).not.toHaveProperty("unread")
  })

  it("keeps the real seed data intact and countable", () => {
    const seeded = seedNotifications(NOTIFICATIONS)
    expect(seeded).toHaveLength(NOTIFICATIONS.length)
    expect(unreadCount(seeded)).toBe(
      NOTIFICATIONS.filter((n) => n.unread).length
    )
  })
})

describe("visibleNotifications", () => {
  const items = [item("a", true), item("b", false), item("c", true)]

  it("returns everything for the all filter", () => {
    expect(visibleNotifications(items, "all")).toHaveLength(3)
  })

  it("returns only unread for the unread filter", () => {
    expect(visibleNotifications(items, "unread").map((n) => n.id)).toEqual([
      "a",
      "c",
    ])
  })

  // The records carry only a relative string, so order must be left alone.
  it("preserves source order rather than sorting", () => {
    const shuffled = [item("c", true), item("a", true)]
    expect(visibleNotifications(shuffled, "unread").map((n) => n.id)).toEqual([
      "c",
      "a",
    ])
  })
})

describe("read transitions", () => {
  const items = [item("a", true), item("b", true)]

  it("markRead clears one flag and leaves the rest", () => {
    const next = markRead(items, "a")
    expect(next.map((n) => n.unread)).toEqual([false, true])
  })

  it("markRead on an already-read item is a no-op", () => {
    const next = markRead([item("a", false)], "a")
    expect(next[0].unread).toBe(false)
  })

  it("toggleRead goes both ways", () => {
    const read = toggleRead(items, "a")
    expect(read[0].unread).toBe(false)
    expect(toggleRead(read, "a")[0].unread).toBe(true)
  })

  it("markAllRead clears every flag", () => {
    expect(unreadCount(markAllRead(items))).toBe(0)
  })

  it("transitions never mutate the input", () => {
    markRead(items, "a")
    markAllRead(items)
    expect(items.map((n) => n.unread)).toEqual([true, true])
  })

  it("an unknown id changes nothing", () => {
    expect(markRead(items, "nope")).toEqual(items)
  })
})

describe("dismiss", () => {
  it("removes only the named notification", () => {
    const next = dismiss([item("a"), item("b"), item("c")], "b")
    expect(next.map((n) => n.id)).toEqual(["a", "c"])
  })

  it("leaves the list alone for an unknown id", () => {
    const items = [item("a")]
    expect(dismiss(items, "nope")).toHaveLength(1)
  })
})

describe("pluralize", () => {
  it("singularises exactly one", () => {
    expect(pluralize(1)).toBe("1 notification")
  })

  it("pluralises zero and many", () => {
    expect(pluralize(0)).toBe("0 notifications")
    expect(pluralize(5)).toBe("5 notifications")
  })
})

describe("actionOutcome", () => {
  it.each(["Approve", "Accept", "Decline", "Join", "Rate"])(
    "%s resolves the notification",
    (label) => {
      expect(actionOutcome({ label })).toBe("resolve")
    }
  )

  it.each(["Review", "Later"])("%s only acknowledges it", (label) => {
    expect(actionOutcome({ label })).toBe("acknowledge")
  })

  it("is case insensitive", () => {
    expect(actionOutcome({ label: "APPROVE" })).toBe("resolve")
  })

  // Every action label present in the seed data must be classified on purpose.
  it("covers every action label in the real data", () => {
    const labels = NOTIFICATIONS.flatMap((n) => n.actions ?? []).map(
      (a) => a.label
    )
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(["resolve", "acknowledge"]).toContain(actionOutcome({ label }))
    }
  })
})

describe("actionToast", () => {
  it("says what happened", () => {
    const copy = actionToast({ label: "Approve" })
    expect(copy.title).toBe("Approval sent")
    expect(copy.description).toBe("The team has been notified and can ship.")
  })

  it("falls back to the label for an unmapped action", () => {
    expect(actionToast({ label: "Snooze" }).title).toBe("Snooze")
  })

  // The titles carrying actions are category labels, so interpolating them
  // produced copy like "Pending approval was approved".
  it("never interpolates the notification title", () => {
    const titles = NOTIFICATIONS.filter((n) => n.actions?.length).map(
      (n) => n.title
    )
    for (const n of NOTIFICATIONS) {
      for (const action of n.actions ?? []) {
        const copy = actionToast(action)
        for (const title of titles) {
          expect(copy.description).not.toContain(title)
        }
      }
    }
  })

  it("produces non-empty copy for every real action label", () => {
    for (const n of NOTIFICATIONS) {
      for (const action of n.actions ?? []) {
        const copy = actionToast(action)
        expect(copy.title.length).toBeGreaterThan(0)
        expect(copy.description.length).toBeGreaterThan(0)
      }
    }
  })
})
