import { describe, expect, it } from "vitest"

import { ORDERS } from "../components/data"
import type { OrderChannel, OrderRecord, OrderStatus } from "../components/data"
import {
  buildOrderPayload,
  canSubmitOrder,
  deriveInitials,
  newOrderId,
  optionFor,
  orderFormValues,
  toNumber,
  toOption,
  CHANNEL_OPTIONS,
  CHANNEL_VALUES,
  STAGE_OPTIONS,
  STAGE_VALUES,
  STATUS_OPTIONS,
  STATUS_VALUES,
} from "./order-form"
import type { OrderFormValues } from "./order-form"

const SEED_SNAPSHOT = JSON.stringify(ORDERS)

// Keyed by the union so adding a member to OrderStatus / OrderChannel breaks
// this file rather than shipping a dropdown that cannot offer the new value back.
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

function values(overrides: Partial<OrderFormValues> = {}): OrderFormValues {
  return {
    product: "Wire up billing",
    customer: "Ada Lovelace",
    sku: "BIL-01",
    status: STATUS_OPTIONS[0],
    channel: CHANNEL_OPTIONS[0],
    stage: STAGE_OPTIONS[0],
    quantity: "2",
    amount: "8",
    progress: "40",
    ...overrides,
  }
}

const FIXED_NOW = new Date(2026, 6, 25)

describe("option lists", () => {
  it("covers every member of OrderStatus", () => {
    expect([...STATUS_VALUES].sort()).toEqual(Object.keys(ALL_STATUSES).sort())
  })

  it("covers every member of OrderChannel", () => {
    expect([...CHANNEL_VALUES].sort()).toEqual(Object.keys(ALL_CHANNELS).sort())
  })

  // `stage` is a free string on OrderRecord rather than a union, so the only
  // guarantee available is that nothing already in the queue is missing from it.
  it("offers every stage the seed data actually uses", () => {
    for (const seed of ORDERS) {
      expect(STAGE_VALUES).toContain(seed.stage)
    }
  })

  it("offers every status and project the seed data actually uses", () => {
    for (const seed of ORDERS) {
      expect(STATUS_VALUES).toContain(seed.status)
      expect(CHANNEL_VALUES).toContain(seed.channel)
    }
  })

  it("builds one option per value, searchable in lower case", () => {
    expect(toOption("In Progress")).toEqual({
      id: "In Progress",
      value: "In Progress",
      label: "In Progress",
      searchText: "in progress",
    })
    expect(STATUS_OPTIONS).toHaveLength(STATUS_VALUES.length)
    expect(CHANNEL_OPTIONS).toHaveLength(CHANNEL_VALUES.length)
    expect(STAGE_OPTIONS).toHaveLength(STAGE_VALUES.length)
  })

  it("gives every option a unique id within its list", () => {
    for (const list of [STATUS_OPTIONS, CHANNEL_OPTIONS, STAGE_OPTIONS]) {
      expect(new Set(list.map((o) => o.id)).size).toBe(list.length)
    }
  })
})

describe("optionFor", () => {
  it("finds the existing option, by identity not by copy", () => {
    expect(optionFor(STATUS_OPTIONS, "Blocked")).toBe(
      STATUS_OPTIONS.find((o) => o.value === "Blocked")
    )
  })

  it("resolves every status and channel in the seed data", () => {
    for (const seed of ORDERS) {
      expect(optionFor(STATUS_OPTIONS, seed.status).value).toBe(seed.status)
      expect(optionFor(CHANNEL_OPTIONS, seed.channel).value).toBe(seed.channel)
    }
  })

  // A record whose stage predates the current suggestion list must still open
  // showing its own stage instead of silently snapping to "Backlog" and saving
  // that back on the next submit.
  it("synthesises an option for a value outside the list", () => {
    expect(optionFor(STAGE_OPTIONS, "Archived")).toEqual({
      id: "Archived",
      value: "Archived",
      label: "Archived",
      searchText: "archived",
    })
  })

  it("is case sensitive, so a differently-cased value is synthesised", () => {
    expect(optionFor(STATUS_OPTIONS, "blocked").value).toBe("blocked")
  })

  it("does not mutate the option list it searches", () => {
    const before = JSON.stringify(STAGE_OPTIONS)
    optionFor(STAGE_OPTIONS, "Archived")
    expect(JSON.stringify(STAGE_OPTIONS)).toBe(before)
  })
})

describe("deriveInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(deriveInitials("Ada Lovelace")).toBe("AL")
    expect(deriveInitials("Sana Qureshi")).toBe("SQ")
  })

  it("takes the first two letters of a single word", () => {
    expect(deriveInitials("Ada")).toBe("AD")
    expect(deriveInitials("x")).toBe("X")
  })

  it("upper-cases whatever it takes", () => {
    expect(deriveInitials("ada lovelace")).toBe("AL")
  })

  it("ignores a third word", () => {
    expect(deriveInitials("Ada Byron Lovelace")).toBe("AB")
  })

  it("collapses stray whitespace instead of reading it as a word", () => {
    expect(deriveInitials("  Ada   Lovelace  ")).toBe("AL")
    expect(deriveInitials("\tAda\nLovelace")).toBe("AL")
  })

  it("falls back to NA for an empty or whitespace-only name", () => {
    expect(deriveInitials("")).toBe("NA")
    expect(deriveInitials("   ")).toBe("NA")
  })

  // Every seed record was hand-authored with its own initials; if derivation
  // disagreed, editing a record would silently rewrite its avatar.
  it("reproduces the initials stored on every seed record", () => {
    for (const seed of ORDERS) {
      expect(deriveInitials(seed.customer)).toBe(seed.initials)
    }
  })
})

describe("toNumber", () => {
  it("parses a plain number", () => {
    expect(toNumber("12")).toBe(12)
    expect(toNumber("8.5")).toBe(8.5)
    expect(toNumber("-5")).toBe(-5)
  })

  // An emptied number input hands back "", which Number() reads as 0. That is
  // what makes a cleared Estimate field save as 0 rather than NaN.
  it("reads an empty or whitespace string as zero", () => {
    expect(toNumber("")).toBe(0)
    expect(toNumber("   ")).toBe(0)
  })

  it("falls back to zero for anything non-finite", () => {
    expect(toNumber("abc")).toBe(0)
    expect(toNumber("Infinity")).toBe(0)
    expect(toNumber("-Infinity")).toBe(0)
    expect(toNumber("NaN")).toBe(0)
  })

  it("tolerates the padding a paste can leave behind", () => {
    expect(toNumber(" 7 ")).toBe(7)
    expect(toNumber("1e3")).toBe(1000)
  })
})

describe("newOrderId", () => {
  it("uses the TASK- prefix with a fixed six-digit body", () => {
    expect(newOrderId()).toMatch(/^TASK-\d{6}$/)
  })

  it("never repeats within a session", () => {
    const ids = Array.from({ length: 500 }, () => newOrderId())
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Six digits versus the seed's four is what keeps a create from being read as
  // an update by upsertOrder.
  it("never collides with a seed id", () => {
    const seedIds = new Set(ORDERS.map((o) => o.id))
    for (let i = 0; i < 200; i += 1) {
      expect(seedIds.has(newOrderId())).toBe(false)
    }
  })

  // The body is the last six digits of a counter, so it advances by exactly one
  // per create and wraps at 1,000,000 rather than growing without bound. The
  // modulo is what keeps this assertion honest across that wrap.
  it("advances by exactly one per call", () => {
    const first = Number(newOrderId().slice(5))
    const second = Number(newOrderId().slice(5))
    expect((second - first + 1_000_000) % 1_000_000).toBe(1)
  })
})

describe("canSubmitOrder", () => {
  it("requires a deliverable name", () => {
    expect(canSubmitOrder("Wire up billing")).toBe(true)
  })

  it("rejects an empty or whitespace-only name", () => {
    expect(canSubmitOrder("")).toBe(false)
    expect(canSubmitOrder("   ")).toBe(false)
    expect(canSubmitOrder("\n\t")).toBe(false)
  })
})

describe("orderFormValues", () => {
  it("hydrates every field from a record", () => {
    const seed = ORDERS[1]
    const hydrated = orderFormValues(seed)

    expect(hydrated.product).toBe(seed.product)
    expect(hydrated.customer).toBe(seed.customer)
    expect(hydrated.sku).toBe(seed.sku)
    expect(hydrated.status.value).toBe(seed.status)
    expect(hydrated.channel.value).toBe(seed.channel)
    expect(hydrated.stage.value).toBe(seed.stage)
  })

  it("stringifies the numeric fields for the number inputs", () => {
    const hydrated = orderFormValues(ORDERS[1])
    expect(hydrated.quantity).toBe("2")
    expect(hydrated.amount).toBe("12")
    expect(hydrated.progress).toBe("62")
  })

  it("returns blank defaults for a create", () => {
    expect(orderFormValues(null)).toEqual({
      product: "",
      customer: "",
      sku: "",
      status: STATUS_OPTIONS[0],
      channel: CHANNEL_OPTIONS[0],
      stage: STAGE_OPTIONS[0],
      quantity: "0",
      amount: "0",
      progress: "0",
    })
  })

  // The create defaults are the first entry of each list, so a new task starts
  // as "In Progress" / "Product" / "Backlog" rather than as finished work.
  it("defaults a create to the first option of every list", () => {
    const blank = orderFormValues(null)
    expect(blank.status.value).toBe("In Progress")
    expect(blank.channel.value).toBe("Product")
    expect(blank.stage.value).toBe("Backlog")
  })

  it("returns a fresh object each call and never mutates the record", () => {
    const seed = ORDERS[0]
    const before = JSON.stringify(seed)

    const first = orderFormValues(seed)
    const second = orderFormValues(seed)

    expect(first).not.toBe(second)
    expect(JSON.stringify(seed)).toBe(before)
  })

  it("hydrates every seed record without losing a value", () => {
    for (const seed of ORDERS) {
      const hydrated = orderFormValues(seed)
      expect(hydrated.status.value).toBe(seed.status)
      expect(hydrated.channel.value).toBe(seed.channel)
      expect(hydrated.stage.value).toBe(seed.stage)
    }
  })
})

describe("buildOrderPayload", () => {
  describe("create", () => {
    it("mints an id, stamps today, and starts with no avatar image", () => {
      const created = buildOrderPayload(values(), null, FIXED_NOW)

      expect(created.id).toMatch(/^TASK-\d{6}$/)
      expect(created.date).toBe("Jul 25, 2026")
      expect(created.image).toBe("")
    })

    // BUG (pinned, not fixed): the seed records pad the day ("Jul 04, 2026"),
    // but the create stamp uses "d" rather than "dd", so a task created on a
    // single-digit day renders as "Jul 5, 2026" next to padded seed rows.
    it("stamps a single-digit day without padding", () => {
      const created = buildOrderPayload(values(), null, new Date(2026, 6, 5))
      expect(created.date).toBe("Jul 5, 2026")
    })

    it("mints a different id for each create", () => {
      const a = buildOrderPayload(values(), null, FIXED_NOW)
      const b = buildOrderPayload(values(), null, FIXED_NOW)
      expect(a.id).not.toBe(b.id)
    })

    it("falls back to an unassigned owner when no assignee is typed", () => {
      const created = buildOrderPayload(
        values({ customer: "   " }),
        null,
        FIXED_NOW
      )
      expect(created.customer).toBe("Unassigned")
      expect(created.initials).toBe("NA")
    })

    // BUG (pinned, not fixed): every task created without a reference gets the
    // literal "NEW-000", so two blank-reference creates share a reference that
    // renders in the Deliverable column as if it were meaningful.
    it("falls back to the same placeholder reference for every blank sku", () => {
      const a = buildOrderPayload(values({ sku: "" }), null, FIXED_NOW)
      const b = buildOrderPayload(values({ sku: "  " }), null, FIXED_NOW)
      expect(a.sku).toBe("NEW-000")
      expect(b.sku).toBe("NEW-000")
    })
  })

  describe("update", () => {
    const base = ORDERS[0]

    it("keeps the fields the form never exposes", () => {
      const updated = buildOrderPayload(
        values({ product: "Renamed" }),
        base,
        FIXED_NOW
      )
      expect(updated.id).toBe(base.id)
      expect(updated.image).toBe(base.image)
      // Saving an edit must not re-stamp the task's creation date.
      expect(updated.date).toBe(base.date)
    })

    it("writes back the edited fields", () => {
      const updated = buildOrderPayload(
        values({
          product: "Renamed",
          customer: "Leo Grant",
          status: optionFor(STATUS_OPTIONS, "Blocked"),
          channel: optionFor(CHANNEL_OPTIONS, "Ops"),
          stage: optionFor(STAGE_OPTIONS, "In review"),
        }),
        base,
        FIXED_NOW
      )

      expect(updated.product).toBe("Renamed")
      expect(updated.customer).toBe("Leo Grant")
      expect(updated.initials).toBe("LG")
      expect(updated.status).toBe("Blocked")
      expect(updated.channel).toBe("Ops")
      expect(updated.stage).toBe("In review")
    })

    it("never mutates the record it is based on, or the seed", () => {
      buildOrderPayload(values({ product: "Renamed" }), base, FIXED_NOW)
      expect(JSON.stringify(ORDERS)).toBe(SEED_SNAPSHOT)
    })

    it("returns a new object rather than the base record", () => {
      expect(buildOrderPayload(values(), base, FIXED_NOW)).not.toBe(base)
    })

    // Opening a record and saving it untouched has to be a no-op, otherwise
    // every view-then-save quietly rewrites a field.
    it("round-trips every seed record unchanged", () => {
      for (const seed of ORDERS) {
        expect(
          buildOrderPayload(orderFormValues(seed), seed, FIXED_NOW)
        ).toEqual(seed)
      }
    })
  })

  describe("text normalisation", () => {
    it("trims the free-text fields", () => {
      const created = buildOrderPayload(
        values({
          product: "  Wire up billing  ",
          customer: "  Ada Lovelace  ",
          sku: "  BIL-01  ",
        }),
        null,
        FIXED_NOW
      )

      expect(created.product).toBe("Wire up billing")
      expect(created.customer).toBe("Ada Lovelace")
      expect(created.sku).toBe("BIL-01")
    })
  })

  describe("numeric coercion", () => {
    function built(overrides: Partial<OrderFormValues>): OrderRecord {
      return buildOrderPayload(values(overrides), null, FIXED_NOW)
    }

    it("rounds subtasks to a whole number and floors them at zero", () => {
      expect(built({ quantity: "2.6" }).quantity).toBe(3)
      expect(built({ quantity: "2.4" }).quantity).toBe(2)
      expect(built({ quantity: "-4" }).quantity).toBe(0)
      expect(built({ quantity: "" }).quantity).toBe(0)
      expect(built({ quantity: "abc" }).quantity).toBe(0)
    })

    // The estimate is hours and is deliberately NOT rounded, so half-hours
    // survive even though the input steps by 1.
    it("floors the estimate at zero but keeps fractions", () => {
      expect(built({ amount: "8.5" }).amount).toBe(8.5)
      expect(built({ amount: "-1" }).amount).toBe(0)
      expect(built({ amount: "" }).amount).toBe(0)
    })

    // progress is rendered straight into a CSS width, so an out-of-range value
    // would overflow the bar. The number input's own min/max only guard the
    // submit path; this clamp guards the record itself.
    it("clamps progress into 0-100", () => {
      expect(built({ progress: "150" }).progress).toBe(100)
      expect(built({ progress: "-20" }).progress).toBe(0)
      expect(built({ progress: "42" }).progress).toBe(42)
      expect(built({ progress: "100" }).progress).toBe(100)
      expect(built({ progress: "abc" }).progress).toBe(0)
    })
  })

  describe("every status and channel survives a build", () => {
    it.each(Object.keys(ALL_STATUSES) as OrderStatus[])(
      "keeps the %s status",
      (status) => {
        const created = buildOrderPayload(
          values({ status: optionFor(STATUS_OPTIONS, status) }),
          null,
          FIXED_NOW
        )
        expect(created.status).toBe(status)
      }
    )

    it.each(Object.keys(ALL_CHANNELS) as OrderChannel[])(
      "keeps the %s project",
      (channel) => {
        const created = buildOrderPayload(
          values({ channel: optionFor(CHANNEL_OPTIONS, channel) }),
          null,
          FIXED_NOW
        )
        expect(created.channel).toBe(channel)
      }
    )

    it.each(STAGE_VALUES)("keeps the %s stage", (stage) => {
      const created = buildOrderPayload(
        values({ stage: optionFor(STAGE_OPTIONS, stage) }),
        null,
        FIXED_NOW
      )
      expect(created.stage).toBe(stage)
    })
  })
})
