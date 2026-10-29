import { describe, expect, it } from "vitest"

import type { Filter } from "@/components/reui/filters"
import { ROUTING_RULES } from "@/features/ai-ops/components/data"
import type {
  IRoutingRule,
  RoutingRuleKind,
  RoutingRuleStatus,
} from "@/features/ai-ops/components/data"
import {
  applyFiltersToData,
  filterFieldValue,
  getActiveFilters,
  serializeActiveFiltersKey,
} from "@/features/ai-ops/lib/filter-routing-rules"

function rule(overrides: Partial<IRoutingRule> = {}): IRoutingRule {
  return {
    id: "rule-t1",
    reference: "ROUTE-100",
    updated: "Jun 11, 2026",
    rule: "Long context summaries",
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
  rule({ id: "a", reference: "ROUTE-100", rule: "Alpha", dailyTokens: 100 }),
  rule({
    id: "b",
    reference: "ROUTE-200",
    rule: "Beta",
    kind: "primary",
    status: "paused",
    provider: "OpenRoute Primary",
    dailyTokens: 200,
  }),
  rule({
    id: "c",
    reference: "ROUTE-300",
    rule: "Gamma",
    kind: "batch",
    status: "blocked",
    provider: "Batch Summarizer Fleet",
    dailyTokens: 300,
  }),
]

const ids = (result: IRoutingRule[]) => result.map((r) => r.id)

describe("getActiveFilters", () => {
  it("keeps a filter the user has actually filled in", () => {
    const active = getActiveFilters([
      filter("reference", "contains", ["route"]),
    ])
    expect(active).toHaveLength(1)
  })

  // The grid seeds exactly this row on mount and on Clear. If it counted as
  // active the whole grid would be filtered by an empty string.
  it("drops the blank default row the grid starts with", () => {
    expect(getActiveFilters([filter("reference", "contains", [""])])).toEqual(
      []
    )
  })

  it("drops a row with no values at all", () => {
    expect(getActiveFilters([filter("reference", "contains", [])])).toEqual([])
    expect(
      getActiveFilters([
        { id: "x", field: "reference", operator: "contains", values: [] },
      ])
    ).toEqual([])
  })

  it("drops whitespace-only values", () => {
    expect(
      getActiveFilters([filter("reference", "contains", ["   ", "\t"])])
    ).toEqual([])
  })

  it("keeps the row when at least one value is real", () => {
    expect(
      getActiveFilters([filter("reference", "contains", ["", "route"])])
    ).toHaveLength(1)
  })

  it("drops rows whose values are all null or undefined", () => {
    expect(getActiveFilters([filter("status", "is", [null])])).toEqual([])
    expect(getActiveFilters([filter("status", "is", [undefined])])).toEqual([])
    expect(
      getActiveFilters([filter("status", "is", [null, undefined])])
    ).toEqual([])
  })

  it("drops rows whose values are all empty arrays", () => {
    expect(getActiveFilters([filter("status", "is_any_of", [[], []])])).toEqual(
      []
    )
    expect(
      getActiveFilters([filter("status", "is_any_of", [[], ["healthy"]])])
    ).toHaveLength(1)
  })

  // BUG (also a divergence from the tasks copy of this evaluator): the tasks
  // version short-circuits `empty` / `not_empty` to always-active because those
  // operators carry no values by design. This copy does not, so picking
  // "Is empty" in the UI silently does nothing and the matching branches in
  // applyFiltersToData are unreachable. Pinned as-is; the user decides.
  it("drops empty and not_empty because they carry no values", () => {
    expect(getActiveFilters([filter("latency", "empty", [])])).toEqual([])
    expect(getActiveFilters([filter("latency", "not_empty", [])])).toEqual([])
  })

  it("returns a new array and leaves the input alone", () => {
    const input = [
      filter("reference", "contains", ["route"]),
      filter("status", "is", [""]),
    ]
    const active = getActiveFilters(input)
    expect(active).not.toBe(input)
    expect(input).toHaveLength(2)
  })
})

describe("serializeActiveFiltersKey", () => {
  // createFilter stamps a fresh id on every row, so the grid would refilter on
  // every keystroke if the id were part of the key.
  it("ignores the filter id", () => {
    const a: Filter = {
      id: "1",
      field: "status",
      operator: "is",
      values: ["healthy"],
    }
    const b: Filter = {
      id: "2",
      field: "status",
      operator: "is",
      values: ["healthy"],
    }
    expect(serializeActiveFiltersKey([a])).toBe(serializeActiveFiltersKey([b]))
  })

  it("changes when the field, operator or values change", () => {
    const base = serializeActiveFiltersKey([
      filter("status", "is", ["healthy"]),
    ])
    expect(
      serializeActiveFiltersKey([filter("kind", "is", ["healthy"])])
    ).not.toBe(base)
    expect(
      serializeActiveFiltersKey([filter("status", "is_not", ["healthy"])])
    ).not.toBe(base)
    expect(
      serializeActiveFiltersKey([filter("status", "is", ["paused"])])
    ).not.toBe(base)
  })

  it("serialises an empty list to an empty array literal", () => {
    expect(serializeActiveFiltersKey([])).toBe("[]")
  })
})

describe("filterFieldValue", () => {
  it("reads a declared field off the rule", () => {
    expect(filterFieldValue(rules[0], "reference")).toBe("ROUTE-100")
    expect(filterFieldValue(rules[0], "dailyTokens")).toBe(100)
  })

  // An unknown field must not throw; applyFiltersToData coerces it to "".
  it("returns undefined for a field the rule does not have", () => {
    expect(filterFieldValue(rules[0], "nope")).toBeUndefined()
  })
})

describe("applyFiltersToData", () => {
  it("returns every rule when nothing is active", () => {
    expect(ids(applyFiltersToData(rules, []))).toEqual(["a", "b", "c"])
    expect(
      ids(applyFiltersToData(rules, [filter("reference", "contains", [""])]))
    ).toEqual(["a", "b", "c"])
  })

  it("returns a new array and never mutates the input", () => {
    const input = [...rules]
    const result = applyFiltersToData(input, [])
    expect(result).not.toBe(input)
    result.push(rule({ id: "z" }))
    expect(input).toHaveLength(3)
    expect(ids(rules)).toEqual(["a", "b", "c"])
  })

  it("narrows across several active rows", () => {
    const result = applyFiltersToData(rules, [
      filter("status", "is_not", ["healthy"]),
      filter("dailyTokens", "greater_than", [250]),
    ])
    expect(ids(result)).toEqual(["c"])
  })

  it("returns nothing when no rule matches", () => {
    expect(
      applyFiltersToData(rules, [filter("reference", "contains", ["zzz"])])
    ).toEqual([])
  })

  describe("operators", () => {
    it("is / is_not compare by strict membership", () => {
      expect(
        ids(applyFiltersToData(rules, [filter("status", "is", ["paused"])]))
      ).toEqual(["b"])
      expect(
        ids(applyFiltersToData(rules, [filter("status", "is_not", ["paused"])]))
      ).toEqual(["a", "c"])
    })

    it("is with several values behaves as a multi-select", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("status", "is", ["paused", "blocked"]),
          ])
        )
      ).toEqual(["b", "c"])
    })

    it("is_any_of / is_not_any_of match any listed value", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("kind", "is_any_of", ["primary", "batch"]),
          ])
        )
      ).toEqual(["b", "c"])
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("kind", "is_not_any_of", ["primary", "batch"]),
          ])
        )
      ).toEqual(["a"])
    })

    it("contains is case insensitive and ORs its tokens", () => {
      expect(
        ids(applyFiltersToData(rules, [filter("rule", "contains", ["ALPHA"])]))
      ).toEqual(["a"])
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("rule", "contains", ["alpha", "beta"]),
          ])
        )
      ).toEqual(["a", "b"])
    })

    // Blank tokens are stripped, so a half-typed value cannot empty the grid.
    it("contains ignores blank tokens and keeps everything if only blanks remain", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("rule", "contains", ["  ", "gamma"]),
          ])
        )
      ).toEqual(["c"])
    })

    it("not_contains excludes every match", () => {
      expect(
        ids(
          applyFiltersToData(rules, [filter("rule", "not_contains", ["alpha"])])
        )
      ).toEqual(["b", "c"])
    })

    // BUG: unlike `contains`, not_contains does not strip blank tokens, and
    // every string contains "". A row such as ["", "alpha"] survives
    // getActiveFilters and then rejects every rule. Pinned as-is.
    it("not_contains with a blank value rejects everything", () => {
      expect(
        applyFiltersToData(rules, [
          filter("rule", "not_contains", ["", "alpha"]),
        ])
      ).toEqual([])
    })

    it("starts_with and ends_with are case insensitive", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("reference", "starts_with", ["route-2"]),
          ])
        )
      ).toEqual(["b"])
      expect(
        ids(
          applyFiltersToData(rules, [filter("reference", "ends_with", ["300"])])
        )
      ).toEqual(["c"])
    })

    it("equals / not_equals only look at the first value", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("rule", "equals", ["Beta", "Gamma"]),
          ])
        )
      ).toEqual(["b"])
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("rule", "not_equals", ["Beta", "Gamma"]),
          ])
        )
      ).toEqual(["a", "c"])
    })

    it("greater_than / less_than coerce to numbers", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("dailyTokens", "greater_than", [150]),
          ])
        )
      ).toEqual(["b", "c"])
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("dailyTokens", "less_than", ["250"]),
          ])
        )
      ).toEqual(["a", "b"])
    })

    it("greater_than_or_equal / less_than_or_equal include the bound", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("dailyTokens", "greater_than_or_equal", [200]),
          ])
        )
      ).toEqual(["b", "c"])
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("dailyTokens", "less_than_or_equal", [200]),
          ])
        )
      ).toEqual(["a", "b"])
    })

    it("between is inclusive on both ends", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("dailyTokens", "between", [100, 200]),
          ])
        )
      ).toEqual(["a", "b"])
    })

    it("not_between excludes the inclusive range", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("dailyTokens", "not_between", [100, 200]),
          ])
        )
      ).toEqual(["c"])
    })

    // A half-filled range must not hide rows while the user is still typing.
    it("between and not_between are no-ops with fewer than two bounds", () => {
      expect(
        ids(
          applyFiltersToData(rules, [filter("dailyTokens", "between", [100])])
        )
      ).toEqual(["a", "b", "c"])
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("dailyTokens", "not_between", [100]),
          ])
        )
      ).toEqual(["a", "b", "c"])
    })

    // Reached only with a stray value, since getActiveFilters drops a valueless
    // empty/not_empty row. See the bug note in the getActiveFilters block.
    it("empty and not_empty test the coerced field value", () => {
      const withBlank = [
        rule({ id: "a", latency: "" }),
        rule({ id: "b", latency: "1.8s p95" }),
      ]
      expect(
        ids(applyFiltersToData(withBlank, [filter("latency", "empty", ["x"])]))
      ).toEqual(["a"])
      expect(
        ids(
          applyFiltersToData(withBlank, [filter("latency", "not_empty", ["x"])])
        )
      ).toEqual(["b"])
    })

    // BUG: the reui Filters UI offers includes_all / excludes_all as soon as a
    // select holds two values, but neither operator is implemented, so they
    // fall through to `default` and quietly filter nothing.
    it("an unknown operator matches everything", () => {
      expect(
        ids(
          applyFiltersToData(rules, [
            filter("status", "includes_all", ["healthy"]),
          ])
        )
      ).toEqual(["a", "b", "c"])
    })

    it("a missing field is treated as the empty string", () => {
      expect(
        ids(applyFiltersToData(rules, [filter("nope", "empty", ["x"])]))
      ).toEqual(["a", "b", "c"])
      expect(
        applyFiltersToData(rules, [filter("nope", "not_empty", ["x"])])
      ).toEqual([])
    })
  })
})

describe("applyFiltersToData over the real seed", () => {
  it("passes every seeded rule through when nothing is active", () => {
    expect(applyFiltersToData(ROUTING_RULES, [])).toHaveLength(
      ROUTING_RULES.length
    )
  })

  it("never mutates the ROUTING_RULES seed", () => {
    const before = ROUTING_RULES.map((r) => r.id)
    applyFiltersToData(ROUTING_RULES, [
      filter("status", "is", ["healthy"]),
      filter("reference", "contains", ["route"]),
    ])
    expect(ROUTING_RULES.map((r) => r.id)).toEqual(before)
    expect(ROUTING_RULES).toHaveLength(7)
  })

  it("matches seeded references case-insensitively", () => {
    const result = applyFiltersToData(ROUTING_RULES, [
      filter("reference", "contains", ["route-32"]),
    ])
    expect(result.map((r) => r.reference)).toEqual(
      ROUTING_RULES.filter((r) => r.reference.startsWith("ROUTE-32")).map(
        (r) => r.reference
      )
    )
    expect(result.length).toBeGreaterThan(0)
  })

  // Every member of the status union has to be selectable in the grid, so each
  // one must agree with a plain scan of the seed.
  it.each<RoutingRuleStatus>(["healthy", "at_risk", "paused", "blocked"])(
    "filters the seed by status %s",
    (status) => {
      expect(
        applyFiltersToData(ROUTING_RULES, [filter("status", "is", [status])])
      ).toEqual(ROUTING_RULES.filter((r) => r.status === status))
    }
  )

  it.each<RoutingRuleKind>(["primary", "fallback", "guardrail", "batch"])(
    "filters the seed by kind %s",
    (kind) => {
      expect(
        applyFiltersToData(ROUTING_RULES, [filter("kind", "is", [kind])])
      ).toEqual(ROUTING_RULES.filter((r) => r.kind === kind))
    }
  )

  it("filters the seed by provider, which is the grid's other select", () => {
    const provider = ROUTING_RULES[0].provider
    expect(
      applyFiltersToData(ROUTING_RULES, [filter("provider", "is", [provider])])
    ).toEqual(ROUTING_RULES.filter((r) => r.provider === provider))
  })

  it("filters the seed by a numeric token budget", () => {
    expect(
      applyFiltersToData(ROUTING_RULES, [
        filter("dailyTokens", "between", [1_000_000, 4_000_000]),
      ])
    ).toEqual(
      ROUTING_RULES.filter(
        (r) => r.dailyTokens >= 1_000_000 && r.dailyTokens <= 4_000_000
      )
    )
  })

  it("returns nothing for a reference that is not in the seed", () => {
    expect(
      applyFiltersToData(ROUTING_RULES, [
        filter("reference", "contains", ["ROUTE-999"]),
      ])
    ).toEqual([])
  })
})
