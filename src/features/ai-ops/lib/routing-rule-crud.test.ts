import { describe, expect, it } from "vitest"

import type { Filter } from "@/components/reui/filters"
import { ROUTING_RULES } from "@/features/ai-ops/components/data"
import type { IRoutingRule } from "@/features/ai-ops/components/data"
import {
  commitDeleteRule,
  commitRule,
  deleteRule,
  ruleDeleteToast,
  ruleExists,
  ruleSubmitToast,
  upsertRule,
} from "@/features/ai-ops/lib/routing-rule-crud"

function rule(overrides: Partial<IRoutingRule> = {}): IRoutingRule {
  return {
    id: "rule-t1",
    reference: "ROUTE-100",
    updated: "Jun 11, 2026",
    rule: "Alpha",
    provider: "Northstar Claude Pool",
    providerLogo: null,
    category: "Long Context",
    kind: "fallback",
    scope: "Support",
    dailyTokens: 1000,
    latency: "1.8s p95",
    status: "healthy",
    ...overrides,
  }
}

function filter(
  field: string,
  operator: string,
  values: unknown[] = []
): Filter {
  return { id: `${field}:${operator}`, field, operator, values }
}

const rules: IRoutingRule[] = [
  rule({ id: "a", rule: "Alpha", status: "healthy" }),
  rule({ id: "b", rule: "Beta", status: "paused" }),
  rule({ id: "c", rule: "Gamma", status: "healthy" }),
]

const ids = (list: IRoutingRule[]) => list.map((r) => r.id)

describe("ruleExists", () => {
  it("recognises an id that is present", () => {
    expect(ruleExists(rules, "b")).toBe(true)
  })

  it("rejects an unknown id, which is how create is told apart from update", () => {
    expect(ruleExists(rules, "nope")).toBe(false)
    expect(ruleExists([], "a")).toBe(false)
  })
})

describe("upsertRule", () => {
  it("prepends a new rule so it lands on the first page", () => {
    const next = upsertRule(rules, rule({ id: "d", rule: "Delta" }))
    expect(ids(next)).toEqual(["d", "a", "b", "c"])
  })

  it("replaces only the matching record and keeps its position", () => {
    const next = upsertRule(rules, rule({ id: "b", rule: "Beta renamed" }))
    expect(ids(next)).toEqual(["a", "b", "c"])
    expect(next[1].rule).toBe("Beta renamed")
    expect(next[0]).toBe(rules[0])
    expect(next[2]).toBe(rules[2])
  })

  it("returns a new array and leaves the source untouched", () => {
    const created = upsertRule(rules, rule({ id: "d" }))
    const updated = upsertRule(rules, rule({ id: "a", rule: "changed" }))
    expect(created).not.toBe(rules)
    expect(updated).not.toBe(rules)
    expect(ids(rules)).toEqual(["a", "b", "c"])
    expect(rules[0].rule).toBe("Alpha")
  })

  it("works on an empty list", () => {
    expect(ids(upsertRule([], rule({ id: "a" })))).toEqual(["a"])
  })

  // BUG: nothing checks the human-facing `reference` for collisions, only the
  // internal id, so two rules can share ROUTE-318. See the reference generator
  // in routing-rule-form.test.ts. Pinned as-is.
  it("allows a second rule with an already-used reference", () => {
    const next = upsertRule(rules, rule({ id: "d", reference: "ROUTE-100" }))
    expect(next.filter((r) => r.reference === "ROUTE-100")).toHaveLength(4)
  })
})

describe("deleteRule", () => {
  it("removes only the target", () => {
    expect(ids(deleteRule(rules, "b"))).toEqual(["a", "c"])
  })

  it("leaves the list alone for an unknown id", () => {
    expect(ids(deleteRule(rules, "nope"))).toEqual(["a", "b", "c"])
  })

  it("returns a new array and does not mutate the source", () => {
    const next = deleteRule(rules, "a")
    expect(next).not.toBe(rules)
    expect(ids(rules)).toEqual(["a", "b", "c"])
  })

  // There is no "cannot delete the last one" guard: the grid is allowed to
  // empty out and falls back to its empty message. Pinned so a future guard is
  // a deliberate change rather than an accident.
  it("has no last-rule guard and can empty the list", () => {
    const emptied = ["a", "b", "c"].reduce(deleteRule, rules)
    expect(emptied).toEqual([])
  })
})

describe("commitRule", () => {
  const activeFilters = [filter("status", "is", ["healthy"])]

  it("reports created for a brand-new rule and refilters the view", () => {
    const commit = commitRule(
      rules,
      rule({ id: "d", rule: "Delta", status: "healthy" }),
      activeFilters
    )
    expect(commit.created).toBe(true)
    expect(ids(commit.rules)).toEqual(["d", "a", "b", "c"])
    expect(ids(commit.filtered)).toEqual(["d", "a", "c"])
  })

  it("reports an update for an existing id", () => {
    const commit = commitRule(
      rules,
      rule({ id: "a", rule: "Alpha v2", status: "healthy" }),
      activeFilters
    )
    expect(commit.created).toBe(false)
    expect(ids(commit.rules)).toEqual(["a", "b", "c"])
    expect(commit.rules[0].rule).toBe("Alpha v2")
  })

  // Both halves of the grid state have to agree, otherwise a created rule can
  // sit in `rules` while the table still renders the stale filtered list.
  it("drops the saved rule from the view when it no longer matches", () => {
    const commit = commitRule(
      rules,
      rule({ id: "a", status: "blocked" }),
      activeFilters
    )
    expect(ids(commit.rules)).toEqual(["a", "b", "c"])
    expect(ids(commit.filtered)).toEqual(["c"])
  })

  it("filters nothing when no filter row is active", () => {
    const commit = commitRule(rules, rule({ id: "d" }), [
      filter("reference", "contains", [""]),
    ])
    expect(ids(commit.filtered)).toEqual(["d", "a", "b", "c"])
  })

  it("returns fresh arrays for both halves", () => {
    const commit = commitRule(rules, rule({ id: "d" }), [])
    expect(commit.rules).not.toBe(rules)
    expect(commit.filtered).not.toBe(commit.rules)
    expect(ids(rules)).toEqual(["a", "b", "c"])
  })
})

describe("commitDeleteRule", () => {
  it("removes the rule from both halves of the state", () => {
    const commit = commitDeleteRule(rules, rules[1], [])
    expect(ids(commit.rules)).toEqual(["a", "c"])
    expect(ids(commit.filtered)).toEqual(["a", "c"])
  })

  it("re-applies the active filters to what is left", () => {
    const commit = commitDeleteRule(rules, rules[0], [
      filter("status", "is", ["healthy"]),
    ])
    expect(ids(commit.rules)).toEqual(["b", "c"])
    expect(ids(commit.filtered)).toEqual(["c"])
  })

  it("is a no-op for a rule that is already gone", () => {
    const commit = commitDeleteRule(rules, rule({ id: "ghost" }), [])
    expect(ids(commit.rules)).toEqual(["a", "b", "c"])
  })
})

describe("CRUD over the real seed", () => {
  it("never mutates ROUTING_RULES", () => {
    const before = ROUTING_RULES.map((r) => ({ ...r }))
    upsertRule(ROUTING_RULES, rule({ id: "rule-new" }))
    upsertRule(ROUTING_RULES, { ...ROUTING_RULES[0], rule: "renamed" })
    deleteRule(ROUTING_RULES, ROUTING_RULES[0].id)
    commitRule(ROUTING_RULES, rule({ id: "rule-new" }), [])
    commitDeleteRule(ROUTING_RULES, ROUTING_RULES[0], [])
    expect(ROUTING_RULES).toHaveLength(before.length)
    expect(ROUTING_RULES.map((r) => r.id)).toEqual(before.map((r) => r.id))
    expect(ROUTING_RULES[0].rule).toBe(before[0].rule)
  })

  it("updates one seeded rule and leaves the other six identical", () => {
    const target = ROUTING_RULES[2]
    const next = upsertRule(ROUTING_RULES, { ...target, status: "blocked" })
    expect(next).toHaveLength(ROUTING_RULES.length)
    expect(next[2].status).toBe("blocked")
    next.forEach((r, index) => {
      if (index !== 2) expect(r).toBe(ROUTING_RULES[index])
    })
  })

  it("deletes one seeded rule and keeps the rest in order", () => {
    const next = deleteRule(ROUTING_RULES, "rule-004")
    expect(next.map((r) => r.id)).toEqual(
      ROUTING_RULES.filter((r) => r.id !== "rule-004").map((r) => r.id)
    )
  })
})

describe("toast copy", () => {
  const saved = rule({ reference: "ROUTE-318", rule: "Long context summaries" })

  it("says created for a new rule", () => {
    const copy = ruleSubmitToast(saved, true)
    expect(copy.title).toBe("Routing rule created")
    expect(copy.description).toBe(
      'ROUTE-318 "Long context summaries" was added to the list.'
    )
  })

  it("says updated for an existing rule", () => {
    const copy = ruleSubmitToast(saved, false)
    expect(copy.title).toBe("Routing rule updated")
    expect(copy.description).toBe(
      'ROUTE-318 "Long context summaries" was updated.'
    )
  })

  it("names the removed rule on delete", () => {
    const copy = ruleDeleteToast(saved)
    expect(copy.title).toBe("Routing rule deleted")
    expect(copy.description).toBe(
      'ROUTE-318 "Long context summaries" was removed from the policy.'
    )
  })

  it("produces non-empty copy for every seeded rule", () => {
    for (const seeded of ROUTING_RULES) {
      for (const created of [true, false]) {
        const copy = ruleSubmitToast(seeded, created)
        expect(copy.title.length).toBeGreaterThan(0)
        expect(copy.description).toContain(seeded.reference)
        expect(copy.description).toContain(seeded.rule)
      }
      expect(ruleDeleteToast(seeded).description).toContain(seeded.reference)
    }
  })
})
