import { describe, expect, it } from "vitest"

import { ORDERS } from "../components/data"
import type { OrderRecord, OrderStatus } from "../components/data"
import { filterOrders } from "./filter-orders"

function order(overrides: Partial<OrderRecord>): OrderRecord {
  return {
    id: "RVO-1",
    customer: "Ada Lovelace",
    initials: "AL",
    image: "",
    product: "Aero Carry Kit",
    sku: "AERO-30L",
    channel: "Product",
    quantity: 1,
    date: "Aug 04, 2025",
    amount: 100,
    stage: "Shipped",
    progress: 100,
    status: "Done",
    ...overrides,
  }
}

const orders: OrderRecord[] = [
  order({ id: "RVO-1", product: "Aero Carry Kit", status: "Done" }),
  order({
    id: "RVO-2",
    customer: "Leo Grant",
    product: "Pulse Desk Lamp",
    status: "In Progress",
  }),
  order({
    id: "RVO-3",
    customer: "Nora Vale",
    product: "Orbit Weekender",
    status: "Review",
  }),
]

// One record per member of OrderStatus. Declaring it as a Record keyed by the
// union means adding a fifth status breaks this file rather than silently
// leaving the new status untested against the exceptions filter.
const STATUS_FIXTURE_IDS: Record<OrderStatus, string> = {
  "In Progress": "ST-PROGRESS",
  Review: "ST-REVIEW",
  Blocked: "ST-BLOCKED",
  Done: "ST-DONE",
}

const everyStatus: OrderRecord[] = (
  Object.entries(STATUS_FIXTURE_IDS) as [OrderStatus, string][]
).map(([status, id]) => order({ id, status }))

describe("filterOrders", () => {
  it("returns every order when the query is empty and exceptions are off", () => {
    expect(filterOrders(orders, "", false)).toHaveLength(3)
  })

  it("matches the query against any text field, case-insensitively", () => {
    expect(filterOrders(orders, "aero", false).map((o) => o.id)).toEqual([
      "RVO-1",
    ])
    expect(filterOrders(orders, "LEO", false).map((o) => o.id)).toEqual([
      "RVO-2",
    ])
  })

  it("keeps only non-Done orders when exceptionsOnly is true", () => {
    expect(filterOrders(orders, "", true).map((o) => o.id)).toEqual([
      "RVO-2",
      "RVO-3",
    ])
  })

  it("combines the query and the exceptions filter", () => {
    expect(filterOrders(orders, "pulse", true).map((o) => o.id)).toEqual([
      "RVO-2",
    ])
    // "aero" matches RVO-1, but it is Done, so exceptions filters it out.
    expect(filterOrders(orders, "aero", true)).toHaveLength(0)
  })

  it("trims surrounding whitespace in the query", () => {
    expect(filterOrders(orders, "  orbit  ", false).map((o) => o.id)).toEqual([
      "RVO-3",
    ])
  })

  it("treats a whitespace-only query as no query at all", () => {
    expect(filterOrders(orders, "   ", false)).toHaveLength(3)
    expect(filterOrders(orders, "\t\n ", false)).toHaveLength(3)
  })

  it("returns an empty list when nothing matches", () => {
    expect(filterOrders(orders, "no-such-task", false)).toEqual([])
    expect(filterOrders(ORDERS, "no-such-task", true)).toEqual([])
  })

  describe("status coverage", () => {
    // "Blocked" is the only status that is neither the Done end-state nor one of
    // the two the fixtures above happen to use, so it is the one most likely to
    // be dropped by a future rewrite of the exceptions predicate.
    it("counts Blocked as an exception, not as finished work", () => {
      expect(filterOrders(everyStatus, "", true).map((o) => o.id)).toEqual([
        "ST-PROGRESS",
        "ST-REVIEW",
        "ST-BLOCKED",
      ])
    })

    it("excludes exactly one status - Done - and keeps every other member", () => {
      const kept = filterOrders(everyStatus, "", true).map((o) => o.status)
      expect(kept).toHaveLength(Object.keys(STATUS_FIXTURE_IDS).length - 1)
      expect(kept).not.toContain("Done")
    })

    it("matches the status text itself, including Blocked", () => {
      expect(
        filterOrders(everyStatus, "blocked", false).map((o) => o.id)
      ).toEqual(["ST-BLOCKED"])
      expect(
        filterOrders(everyStatus, "REVIEW", false).map((o) => o.id)
      ).toEqual(["ST-REVIEW"])
      expect(
        filterOrders(everyStatus, "in progress", false).map((o) => o.id)
      ).toEqual(["ST-PROGRESS"])
      expect(filterOrders(everyStatus, "done", false).map((o) => o.id)).toEqual(
        ["ST-DONE"]
      )
    })
  })

  describe("immutability", () => {
    // The queue is seeded from ORDERS, a module-level constant the route loader
    // hands out by reference. A filter that sorted or spliced in place would
    // corrupt the seed for every later navigation.
    it("returns a new array and never mutates the input", () => {
      const source = orders.slice()
      const before = JSON.stringify(source)
      const result = filterOrders(source, "aero", true)

      expect(result).not.toBe(source)
      expect(JSON.stringify(source)).toBe(before)
      expect(source).toHaveLength(3)
    })

    it("returns a new array even when nothing is filtered out", () => {
      expect(filterOrders(orders, "", false)).not.toBe(orders)
    })

    it("leaves the ORDERS seed untouched", () => {
      const before = JSON.stringify(ORDERS)
      filterOrders(ORDERS, "audit", true)
      filterOrders(ORDERS, "", true)
      expect(JSON.stringify(ORDERS)).toBe(before)
    })

    it("hands back the same record objects rather than copies", () => {
      // The table keys rows by id and the sheet holds onto the record it was
      // opened with, so filtering must not clone the records out from under it.
      expect(filterOrders(ORDERS, "", false)[0]).toBe(ORDERS[0])
    })
  })

  describe("against the ORDERS seed", () => {
    it("passes every seed record through an empty query", () => {
      expect(filterOrders(ORDERS, "", false)).toHaveLength(ORDERS.length)
    })

    it("keeps exactly the seed records that are not Done", () => {
      expect(filterOrders(ORDERS, "", true).map((o) => o.id)).toEqual(
        ORDERS.filter((o) => o.status !== "Done").map((o) => o.id)
      )
    })

    it("finds a seed record by id, assignee, title, project and date", () => {
      expect(filterOrders(ORDERS, "TASK-2050", false).map((o) => o.id)).toEqual(
        ["TASK-2050"]
      )
      expect(filterOrders(ORDERS, "sana", false).map((o) => o.id)).toEqual([
        "TASK-2052",
      ])
      expect(
        filterOrders(ORDERS, "onboarding", false).map((o) => o.id)
      ).toEqual(["TASK-2049"])
      expect(filterOrders(ORDERS, "ops", false).map((o) => o.id)).toEqual([
        "TASK-2052",
      ])
      // The seed dates are relative to today, so the query is taken from the
      // record: the two newest tasks share a date.
      expect(
        filterOrders(ORDERS, ORDERS[0].date, false).map((o) => o.id)
      ).toEqual(["TASK-2048", "TASK-2049"])
    })
  })

  describe("fields the search blob leaves out", () => {
    // BUG (pinned, not fixed): `sku` is not part of the search blob, but the
    // Deliverable column renders it under the task title and the input is
    // labelled "Search tasks", so typing a reference a user can plainly see on
    // screen returns "No tasks match the current view."
    it("does not match on sku, even though the table renders it", () => {
      expect(ORDERS.some((o) => o.sku === "WEB-142")).toBe(true)
      expect(filterOrders(ORDERS, "WEB-142", false)).toEqual([])
      expect(filterOrders(ORDERS, "SEC-30", false)).toEqual([])
    })

    // BUG (pinned, not fixed): same problem for `stage`. The Progress column
    // renders it as the row's headline text, yet searching for it finds nothing.
    it("does not match on stage, even though the table renders it", () => {
      expect(ORDERS.some((o) => o.stage === "Merged")).toBe(true)
      expect(filterOrders(ORDERS, "merged", false)).toEqual([])
    })

    it("ignores the numeric fields", () => {
      // TASK-2052 carries an estimate of 16 hours and 35% progress. 35 is the
      // number that proves the point whatever day the template is opened on: no
      // day of a month can read 35, where 16 can.
      const record = ORDERS.find((o) => o.id === "TASK-2052")
      expect(record?.amount).toBe(16)
      expect(record?.progress).toBe(35)
      expect(filterOrders(ORDERS, "35", false)).toEqual([])
    })

    // BUG (pinned, not fixed): the blob joins the fields with a single space, so
    // a query can straddle a field boundary. "product done" matches nothing a
    // user typed as a phrase; it matches because channel "Product" happens to sit
    // immediately before status "Done" in the concatenation.
    it("matches queries that span two adjacent fields", () => {
      expect(
        filterOrders(ORDERS, "product done", false).map((o) => o.id)
      ).toEqual(["TASK-2048", "TASK-2051"])
      expect(
        ORDERS.some((o) => o.product.toLowerCase().includes("product done"))
      ).toBe(false)
    })
  })
})
