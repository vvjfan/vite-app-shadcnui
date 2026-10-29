import { describe, expect, it } from "vitest"

import { ORDERS } from "../components/data"
import { pluralize } from "./pluralize"

describe("pluralize", () => {
  it("singularises exactly one", () => {
    expect(pluralize(1)).toBe("1 subtask")
  })

  it("pluralises zero and many", () => {
    expect(pluralize(0)).toBe("0 subtasks")
    expect(pluralize(6)).toBe("6 subtasks")
  })

  it("takes another noun", () => {
    expect(pluralize(1, "task")).toBe("1 task")
    expect(pluralize(3, "task")).toBe("3 tasks")
  })

  // The Estimate column renders this for every row on the landing page, and the
  // seed carries a record with a subtask count of exactly one.
  it("reads correctly for every seed record", () => {
    expect(ORDERS.some((order) => order.quantity === 1)).toBe(true)
    for (const order of ORDERS) {
      const caption = pluralize(order.quantity)
      expect(caption.endsWith("subtasks")).toBe(order.quantity !== 1)
    }
  })
})
