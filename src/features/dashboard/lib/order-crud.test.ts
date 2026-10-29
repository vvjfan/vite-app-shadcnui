import { describe, expect, it } from "vitest"

import { ORDERS } from "../components/data"
import type { OrderRecord } from "../components/data"
import type { OrderSheetState } from "../components/order-sheet"
import {
  deleteToast,
  orderExists,
  removeOrder,
  selectionAfterDelete,
  sheetAfterCancelEdit,
  sheetAfterEdit,
  submitToast,
  upsertOrder,
} from "./order-crud"
import { newOrderId } from "./order-form"

function order(overrides: Partial<OrderRecord> = {}): OrderRecord {
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

const queue: OrderRecord[] = [
  order({ id: "RVO-1" }),
  order({ id: "RVO-2", product: "Pulse Desk Lamp" }),
  order({ id: "RVO-3", product: "Orbit Weekender" }),
]

const SEED_SNAPSHOT = JSON.stringify(ORDERS)

describe("orderExists", () => {
  it("recognises an id already in the queue", () => {
    expect(orderExists(queue, "RVO-2")).toBe(true)
  })

  it("rejects an unknown id and an empty queue", () => {
    expect(orderExists(queue, "RVO-9")).toBe(false)
    expect(orderExists([], "RVO-1")).toBe(false)
  })

  it("is exact, not a prefix or case-insensitive match", () => {
    expect(orderExists(queue, "RVO")).toBe(false)
    expect(orderExists(queue, "rvo-2")).toBe(false)
  })
})

describe("upsertOrder", () => {
  describe("create", () => {
    it("puts a new record at the top of the queue", () => {
      const created = order({ id: "TASK-999999", product: "Wire up billing" })
      const next = upsertOrder(queue, created)

      expect(next.map((o) => o.id)).toEqual([
        "TASK-999999",
        "RVO-1",
        "RVO-2",
        "RVO-3",
      ])
      expect(next[0]).toBe(created)
    })

    it("creates into an empty queue", () => {
      const created = order({ id: "TASK-999999" })
      expect(upsertOrder([], created)).toEqual([created])
    })
  })

  describe("update", () => {
    it("replaces the target in place, leaving position and neighbours alone", () => {
      const edited = order({ id: "RVO-2", product: "Pulse Desk Lamp v2" })
      const next = upsertOrder(queue, edited)

      expect(next.map((o) => o.id)).toEqual(["RVO-1", "RVO-2", "RVO-3"])
      expect(next[1]).toBe(edited)
      // Untouched rows keep their identity so React can skip re-rendering them.
      expect(next[0]).toBe(queue[0])
      expect(next[2]).toBe(queue[2])
    })

    it("touches only the target record's fields", () => {
      const edited = order({ id: "RVO-2", status: "Blocked", amount: 7 })
      const next = upsertOrder(queue, edited)

      expect(next[1].status).toBe("Blocked")
      expect(next[0].status).toBe(queue[0].status)
      expect(next[2].status).toBe(queue[2].status)
    })

    // The id is the whole create-vs-update decision, which is why the sheet's
    // generated ids must never land on a seed id.
    it("updates rather than duplicates when the id matches a seed record", () => {
      const edited = { ...ORDERS[0], product: "Renamed by the sheet" }
      const next = upsertOrder(ORDERS, edited)

      expect(next).toHaveLength(ORDERS.length)
      expect(next[0].product).toBe("Renamed by the sheet")
      expect(next.filter((o) => o.id === ORDERS[0].id)).toHaveLength(1)
    })

    it("never collides a freshly generated id with a seed record", () => {
      const seedIds = new Set(ORDERS.map((o) => o.id))
      for (let i = 0; i < 50; i += 1) {
        const id = newOrderId()
        expect(seedIds.has(id)).toBe(false)
        expect(orderExists(ORDERS, id)).toBe(false)
        expect(upsertOrder(ORDERS, order({ id }))).toHaveLength(
          ORDERS.length + 1
        )
      }
    })
  })

  describe("immutability", () => {
    it("returns a new array on both paths and mutates neither input", () => {
      const before = JSON.stringify(queue)

      const created = upsertOrder(queue, order({ id: "TASK-999999" }))
      const updated = upsertOrder(queue, order({ id: "RVO-2", amount: 1 }))

      expect(created).not.toBe(queue)
      expect(updated).not.toBe(queue)
      expect(JSON.stringify(queue)).toBe(before)
    })

    it("leaves the ORDERS seed constant intact", () => {
      upsertOrder(ORDERS, order({ id: "TASK-999998" }))
      upsertOrder(ORDERS, { ...ORDERS[2], status: "Blocked" })
      expect(JSON.stringify(ORDERS)).toBe(SEED_SNAPSHOT)
    })

    it("does not copy the record it was handed", () => {
      // The sheet closes on submit but the toast still reads off the same object.
      const created = order({ id: "TASK-999997" })
      expect(upsertOrder(queue, created)[0]).toBe(created)
    })
  })
})

describe("removeOrder", () => {
  it("removes only the named record", () => {
    expect(removeOrder(queue, "RVO-2").map((o) => o.id)).toEqual([
      "RVO-1",
      "RVO-3",
    ])
  })

  it("removes the first and the last without disturbing the rest", () => {
    expect(removeOrder(queue, "RVO-1").map((o) => o.id)).toEqual([
      "RVO-2",
      "RVO-3",
    ])
    expect(removeOrder(queue, "RVO-3").map((o) => o.id)).toEqual([
      "RVO-1",
      "RVO-2",
    ])
  })

  it("leaves the queue alone for an unknown id", () => {
    expect(removeOrder(queue, "RVO-9").map((o) => o.id)).toEqual([
      "RVO-1",
      "RVO-2",
      "RVO-3",
    ])
  })

  // There is deliberately no "cannot delete the last one" guard: the queue is
  // allowed to reach zero records. Pinning it because the table then shows
  // "No tasks match the current view.", which reads as a filter problem even
  // when no filter is active.
  it("allows the queue to be emptied completely", () => {
    let remaining: OrderRecord[] = ORDERS
    for (const record of ORDERS) {
      remaining = removeOrder(remaining, record.id)
    }
    expect(remaining).toEqual([])
  })

  it("returns a new array and mutates neither the queue nor the seed", () => {
    const before = JSON.stringify(queue)
    const next = removeOrder(queue, "RVO-2")

    expect(next).not.toBe(queue)
    expect(JSON.stringify(queue)).toBe(before)

    removeOrder(ORDERS, ORDERS[0].id)
    expect(JSON.stringify(ORDERS)).toBe(SEED_SNAPSHOT)
  })

  it("returns a new array even when nothing is removed", () => {
    expect(removeOrder(queue, "RVO-9")).not.toBe(queue)
  })
})

describe("selectionAfterDelete", () => {
  it("clears the highlight when the selected record is the one deleted", () => {
    expect(selectionAfterDelete("RVO-2", "RVO-2")).toBeNull()
  })

  it("keeps the highlight when some other record is deleted", () => {
    expect(selectionAfterDelete("RVO-1", "RVO-2")).toBe("RVO-1")
  })

  it("stays null when nothing was selected", () => {
    expect(selectionAfterDelete(null, "RVO-2")).toBeNull()
  })
})

describe("toast copy", () => {
  const record = order({ id: "TASK-2048", product: "Ship responsive nav bar" })

  it("distinguishes a create from an update", () => {
    expect(submitToast(record, false).title).toBe("Task created")
    expect(submitToast(record, true).title).toBe("Task updated")
  })

  // A create prepends, so it can land off the current page or outside the active
  // filter. The copy says where it went precisely because it may not be visible.
  it("names the record and says where a created task went", () => {
    expect(submitToast(record, false).description).toBe(
      'TASK-2048 "Ship responsive nav bar" was added to the top of the queue.'
    )
  })

  it("names the record on update and on delete", () => {
    expect(submitToast(record, true).description).toBe(
      'TASK-2048 "Ship responsive nav bar" was updated.'
    )
    expect(deleteToast(record)).toEqual({
      title: "Task deleted",
      description:
        'TASK-2048 "Ship responsive nav bar" was removed from the queue.',
    })
  })

  it("produces non-empty copy for every seed record", () => {
    for (const seed of ORDERS) {
      for (const copy of [
        submitToast(seed, true),
        submitToast(seed, false),
        deleteToast(seed),
      ]) {
        expect(copy.title.length).toBeGreaterThan(0)
        expect(copy.description).toContain(seed.id)
        expect(copy.description).toContain(seed.product)
      }
    }
  })
})

describe("sheet mode transitions", () => {
  const record = order({ id: "RVO-1" })
  const viewState: OrderSheetState = { mode: "view", order: record }
  const editState: OrderSheetState = { mode: "edit", order: record }
  const createState: OrderSheetState = { mode: "create" }

  describe("sheetAfterEdit", () => {
    it("switches a viewed record into the edit form", () => {
      expect(sheetAfterEdit(viewState)).toEqual({ mode: "edit", order: record })
    })

    it("keeps the same record object so the form does not re-hydrate blank", () => {
      expect(sheetAfterEdit(viewState)?.order).toBe(record)
    })

    it("is idempotent on a sheet that is already editing", () => {
      expect(sheetAfterEdit(editState)).toEqual(editState)
    })

    it("leaves a create in place - there is nothing to switch to", () => {
      expect(sheetAfterEdit(createState)).toBe(createState)
    })

    it("leaves a closed sheet closed", () => {
      expect(sheetAfterEdit(null)).toBeNull()
      expect(sheetAfterEdit({ mode: "edit", order: null })).toEqual({
        mode: "edit",
        order: null,
      })
    })
  })

  describe("sheetAfterCancelEdit", () => {
    it("falls back to the read-only view of the same record", () => {
      const next = sheetAfterCancelEdit(editState)
      expect(next).toEqual({ mode: "view", order: record })
      expect(next?.order).toBe(record)
    })

    // Asymmetric with sheetAfterEdit on purpose: a cancelled create has no
    // record to fall back to, so the whole sheet closes instead of stranding the
    // user on an empty read-only view.
    it("closes the sheet entirely when cancelling a create", () => {
      expect(sheetAfterCancelEdit(createState)).toBeNull()
      expect(sheetAfterCancelEdit({ mode: "edit", order: null })).toBeNull()
    })

    it("leaves a closed sheet closed", () => {
      expect(sheetAfterCancelEdit(null)).toBeNull()
    })
  })

  it("round-trips view -> edit -> cancel back to the same view", () => {
    const edited = sheetAfterEdit(viewState)
    expect(edited?.mode).toBe("edit")
    expect(sheetAfterCancelEdit(edited)).toEqual(viewState)
  })
})
