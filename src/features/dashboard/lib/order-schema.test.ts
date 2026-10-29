import { describe, expect, it } from "vitest"

import { ORDERS } from "../components/data"
import type { OrderChannel, OrderStatus } from "../components/data"
import { buildOrderPayload, orderFormValues } from "./order-form"
import {
  orderDefaultValues,
  orderSchema,
  toOrderFormValues,
} from "./order-schema"

// Keyed by the union so adding a member to OrderStatus / OrderChannel breaks
// this file rather than shipping a dropdown the schema then rejects.
const ALL_STATUSES: Record<OrderStatus, true> = {
  Done: true,
  "In Progress": true,
  Blocked: true,
  Review: true,
}
const ALL_CHANNELS: Record<OrderChannel, true> = {
  Product: true,
  Platform: true,
  Growth: true,
  Ops: true,
}

function values(overrides: Record<string, unknown> = {}) {
  return {
    product: "Wire up billing",
    customer: "Ada Lovelace",
    sku: "BIL-01",
    status: "Review",
    channel: "Growth",
    stage: "In review",
    quantity: "2",
    amount: "8",
    progress: "40",
    ...overrides,
  }
}

/** The message the sheet would show under one field, or undefined if it passed. */
function messageFor(input: Record<string, unknown>, field: string) {
  const result = orderSchema.safeParse(input)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("orderSchema", () => {
  it("accepts a filled-in form", () => {
    const result = orderSchema.safeParse(values())
    expect(result.success).toBe(true)
  })

  it("trims the text fields it passes on", () => {
    const result = orderSchema.parse(
      values({
        product: "  Wire up billing  ",
        customer: " Ada ",
        sku: " BIL-01 ",
      })
    )
    expect(result.product).toBe("Wire up billing")
    expect(result.customer).toBe("Ada")
    expect(result.sku).toBe("BIL-01")
  })

  describe("product", () => {
    it("is required", () => {
      expect(messageFor(values({ product: "" }), "product")).toBe(
        "Enter a deliverable name."
      )
    })

    it("rejects whitespace alone", () => {
      expect(messageFor(values({ product: "   " }), "product")).toBe(
        "Enter a deliverable name."
      )
    })

    it("caps at 120 characters", () => {
      expect(messageFor(values({ product: "x".repeat(121) }), "product")).toBe(
        "Use 120 characters or fewer."
      )
      expect(
        messageFor(values({ product: "x".repeat(120) }), "product")
      ).toBeUndefined()
    })
  })

  describe("customer", () => {
    it("is optional", () => {
      expect(messageFor(values({ customer: "" }), "customer")).toBeUndefined()
    })

    it("caps at 80 characters", () => {
      expect(messageFor(values({ customer: "x".repeat(81) }), "customer")).toBe(
        "Use 80 characters or fewer."
      )
    })
  })

  describe("sku", () => {
    it("is optional", () => {
      expect(messageFor(values({ sku: "" }), "sku")).toBeUndefined()
    })

    it("caps at 32 characters", () => {
      expect(messageFor(values({ sku: "x".repeat(33) }), "sku")).toBe(
        "Use 32 characters or fewer."
      )
    })
  })

  describe("status", () => {
    it("accepts every OrderStatus", () => {
      for (const status of Object.keys(ALL_STATUSES)) {
        expect(messageFor(values({ status }), "status")).toBeUndefined()
      }
    })

    it("rejects a value outside the union", () => {
      expect(messageFor(values({ status: "Shipped" }), "status")).toBe(
        "Choose a status."
      )
    })

    it("rejects a missing value", () => {
      expect(messageFor(values({ status: undefined }), "status")).toBe(
        "Choose a status."
      )
    })
  })

  describe("channel", () => {
    it("accepts every OrderChannel", () => {
      for (const channel of Object.keys(ALL_CHANNELS)) {
        expect(messageFor(values({ channel }), "channel")).toBeUndefined()
      }
    })

    it("rejects a value outside the union", () => {
      expect(messageFor(values({ channel: "Retail" }), "channel")).toBe(
        "Choose a project."
      )
    })
  })

  describe("stage", () => {
    it("is required", () => {
      expect(messageFor(values({ stage: "  " }), "stage")).toBe(
        "Choose a stage."
      )
    })

    it("accepts a stage outside the suggested list", () => {
      expect(
        messageFor(values({ stage: "Waiting on legal" }), "stage")
      ).toBeUndefined()
    })
  })

  describe("quantity", () => {
    it("is required", () => {
      expect(messageFor(values({ quantity: "" }), "quantity")).toBe(
        "Enter a number of subtasks."
      )
    })

    it("rejects text", () => {
      expect(messageFor(values({ quantity: "two" }), "quantity")).toBe(
        "Enter a number of subtasks."
      )
    })

    it("rejects a fraction", () => {
      expect(messageFor(values({ quantity: "1.5" }), "quantity")).toBe(
        "Enter a whole number."
      )
    })

    it("rejects a negative count", () => {
      expect(messageFor(values({ quantity: "-1" }), "quantity")).toBe(
        "Enter 0 or more."
      )
    })

    it("accepts zero", () => {
      expect(messageFor(values({ quantity: "0" }), "quantity")).toBeUndefined()
    })
  })

  describe("amount", () => {
    it("is required", () => {
      expect(messageFor(values({ amount: "" }), "amount")).toBe(
        "Enter an estimate in hours."
      )
    })

    it("rejects a negative estimate", () => {
      expect(messageFor(values({ amount: "-2" }), "amount")).toBe(
        "Enter 0 or more."
      )
    })

    it("accepts half hours", () => {
      expect(messageFor(values({ amount: "1.5" }), "amount")).toBeUndefined()
    })
  })

  describe("progress", () => {
    it("is required", () => {
      expect(messageFor(values({ progress: "" }), "progress")).toBe(
        "Enter a progress value."
      )
    })

    it("rejects a value over 100", () => {
      expect(messageFor(values({ progress: "101" }), "progress")).toBe(
        "Enter a value between 0 and 100."
      )
    })

    it("rejects a negative value", () => {
      expect(messageFor(values({ progress: "-1" }), "progress")).toBe(
        "Enter a value between 0 and 100."
      )
    })

    it("accepts both ends of the range", () => {
      expect(messageFor(values({ progress: "0" }), "progress")).toBeUndefined()
      expect(
        messageFor(values({ progress: "100" }), "progress")
      ).toBeUndefined()
    })
  })
})

describe("orderDefaultValues", () => {
  it("opens a create on the blank defaults", () => {
    const defaults = orderDefaultValues(null)
    expect(defaults).toEqual({
      product: "",
      customer: "",
      sku: "",
      status: "In Progress",
      channel: "Product",
      stage: "Backlog",
      quantity: "0",
      amount: "0",
      progress: "0",
    })
  })

  it("only fails on the empty deliverable name", () => {
    const result = orderSchema.safeParse(orderDefaultValues(null))
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "product",
    ])
  })

  it("seeds an edit from the record", () => {
    const order = ORDERS[0]
    expect(orderDefaultValues(order)).toEqual({
      product: order.product,
      customer: order.customer,
      sku: order.sku,
      status: order.status,
      channel: order.channel,
      stage: order.stage,
      quantity: String(order.quantity),
      amount: String(order.amount),
      progress: String(order.progress),
    })
  })

  it("re-validates every seed record", () => {
    for (const order of ORDERS) {
      const result = orderSchema.safeParse(orderDefaultValues(order))
      expect(result.success, `${order.id} failed to validate`).toBe(true)
    }
  })
})

describe("toOrderFormValues", () => {
  it("builds the same payload the untyped form values did", () => {
    for (const order of ORDERS) {
      const parsed = orderSchema.parse(orderDefaultValues(order))
      expect(buildOrderPayload(toOrderFormValues(parsed), order)).toEqual(
        buildOrderPayload(orderFormValues(order), order)
      )
    }
  })

  it("keeps a stage that is not in the suggested list", () => {
    const parsed = orderSchema.parse(values({ stage: "Waiting on legal" }))
    expect(toOrderFormValues(parsed).stage).toEqual({
      id: "Waiting on legal",
      value: "Waiting on legal",
      label: "Waiting on legal",
      searchText: "waiting on legal",
    })
  })
})
