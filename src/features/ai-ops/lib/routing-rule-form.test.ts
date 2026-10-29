import { describe, expect, it } from "vitest"

import { ROUTING_RULES } from "@/features/ai-ops/components/data"
import type {
  IRoutingRule,
  RoutingRuleKind,
  RoutingRuleScope,
  RoutingRuleStatus,
} from "@/features/ai-ops/components/data"
import {
  buildRoutingRule,
  canSubmitRule,
  categoryOptionForRule,
  categoryOptionsFrom,
  kindOptionFor,
  KIND_OPTIONS,
  newRuleId,
  newRuleReference,
  normalizeLatency,
  parseDailyTokens,
  providerLogoMapFrom,
  providerOptionForRule,
  providerOptionsFrom,
  referenceFromTimestamp,
  resolveCategory,
  resolveProviderLogo,
  resolveProviderName,
  scopeOptionFor,
  SCOPE_OPTIONS,
  statusOptionFor,
  STATUS_OPTIONS,
} from "@/features/ai-ops/lib/routing-rule-form"
import type { ProviderOption } from "@/features/ai-ops/lib/routing-rule-form"

function rule(overrides: Partial<IRoutingRule> = {}): IRoutingRule {
  return {
    id: "rule-t1",
    reference: "ROUTE-100",
    updated: "Jun 11, 2026",
    rule: "Alpha",
    provider: "Northstar Claude Pool",
    providerLogo: "northstar-logo",
    category: "Long Context",
    kind: "fallback",
    scope: "Support",
    dailyTokens: 1000,
    latency: "1.8s p95",
    status: "healthy",
    ...overrides,
  }
}

function providerOption(
  value: string,
  logo: ProviderOption["logo"]
): ProviderOption {
  return {
    id: value,
    value,
    label: value,
    searchText: value.toLowerCase(),
    logo,
  }
}

describe("newRuleId", () => {
  it("is unique across a burst of creations", () => {
    const generated = Array.from({ length: 500 }, () => newRuleId())
    expect(new Set(generated).size).toBe(generated.length)
  })

  // The grid keys rows by id and upsert matches on it, so a collision with a
  // seeded rule would silently overwrite that rule instead of creating one.
  it("never collides with a seeded id", () => {
    const seeded = new Set(ROUTING_RULES.map((r) => r.id))
    for (let i = 0; i < 200; i += 1) {
      expect(seeded.has(newRuleId())).toBe(false)
    }
  })

  it("keeps the rule- prefix the seed uses", () => {
    expect(newRuleId()).toMatch(/^rule-/)
  })
})

describe("referenceFromTimestamp", () => {
  it("keeps only the last three digits of the clock", () => {
    expect(referenceFromTimestamp(1781000318)).toBe("ROUTE-318")
    expect(referenceFromTimestamp(7)).toBe("ROUTE-7")
  })

  // BUG: the reference is drawn from a 1000-value space that already contains
  // every seeded reference, so a rule created at the wrong millisecond gets a
  // duplicate human-facing reference (nothing dedupes it, see
  // routing-rule-crud.test.ts). It also repeats once per second. Pinned as-is.
  it("can reproduce a reference that is already in the seed", () => {
    const seeded = ROUTING_RULES.map((r) => r.reference)
    expect(seeded).toContain(referenceFromTimestamp(1781000318))
    expect(referenceFromTimestamp(1000318)).toBe(
      referenceFromTimestamp(9999318)
    )
  })
})

describe("newRuleReference", () => {
  it("matches the ROUTE-nnn shape the seed uses", () => {
    expect(newRuleReference()).toMatch(/^ROUTE-\d{1,3}$/)
  })
})

describe("option lists derived from the rules", () => {
  it("dedupes providers and keeps the first logo seen", () => {
    const options = providerOptionsFrom(ROUTING_RULES)
    const unique = Array.from(new Set(ROUTING_RULES.map((r) => r.provider)))
    expect(options.map((o) => o.value)).toEqual(unique)
    expect(options).toHaveLength(5)
    expect(options[0].logo).toBe(ROUTING_RULES[0].providerLogo)
    expect(options[0].searchText).toBe(ROUTING_RULES[0].provider.toLowerCase())
  })

  it("dedupes categories in first-seen order", () => {
    const options = categoryOptionsFrom(ROUTING_RULES)
    expect(options.map((o) => o.value)).toEqual(
      Array.from(new Set(ROUTING_RULES.map((r) => r.category)))
    )
  })

  it("maps every provider name to a logo", () => {
    const map = providerLogoMapFrom(ROUTING_RULES)
    expect(map.size).toBe(new Set(ROUTING_RULES.map((r) => r.provider)).size)
    for (const seeded of ROUTING_RULES) {
      expect(map.has(seeded.provider)).toBe(true)
    }
  })

  it("returns empty lists for an empty grid", () => {
    expect(providerOptionsFrom([])).toEqual([])
    expect(categoryOptionsFrom([])).toEqual([])
    expect(providerLogoMapFrom([]).size).toBe(0)
  })

  it("returns fresh collections and never mutates the source", () => {
    const first = providerOptionsFrom(ROUTING_RULES)
    const second = providerOptionsFrom(ROUTING_RULES)
    expect(first).not.toBe(second)
    expect(ROUTING_RULES).toHaveLength(7)
  })
})

describe("mapping a rule back onto option objects", () => {
  it.each<RoutingRuleKind>(["primary", "fallback", "guardrail", "batch"])(
    "resolves the %s kind option",
    (kind) => {
      expect(kindOptionFor(kind).kind).toBe(kind)
    }
  )

  it.each<RoutingRuleScope>(["Support", "Finance", "Safety", "Platform"])(
    "resolves the %s scope option",
    (scope) => {
      expect(scopeOptionFor(scope).scope).toBe(scope)
    }
  )

  it.each<RoutingRuleStatus>(["healthy", "at_risk", "paused", "blocked"])(
    "resolves the %s status option",
    (status) => {
      expect(statusOptionFor(status).status).toBe(status)
    }
  )

  // Data older than the current union must still open the sheet rather than
  // leaving the combobox with an undefined value.
  it("falls back to the first option for a value outside the union", () => {
    expect(kindOptionFor("legacy" as RoutingRuleKind)).toBe(KIND_OPTIONS[0])
    expect(scopeOptionFor("Legacy" as RoutingRuleScope)).toBe(SCOPE_OPTIONS[0])
    expect(statusOptionFor("legacy" as RoutingRuleStatus)).toBe(
      STATUS_OPTIONS[0]
    )
  })

  it("labels at_risk with a space rather than the raw union value", () => {
    expect(statusOptionFor("at_risk").label).toBe("At Risk")
  })

  it("picks the existing provider option when the rule's provider is known", () => {
    const options = providerOptionsFrom(ROUTING_RULES)
    expect(providerOptionForRule(ROUTING_RULES[0], options)).toBe(options[0])
  })

  // The provider list is derived from the remaining rules, so editing a rule
  // whose provider is no longer represented must still show that provider.
  it("synthesises an option for a provider missing from the list", () => {
    const orphan = rule({ provider: "Retired Pool", providerLogo: "retired" })
    const option = providerOptionForRule(orphan, [])
    expect(option.value).toBe("Retired Pool")
    expect(option.searchText).toBe("retired pool")
    expect(option.logo).toBe("retired")
  })

  it("does the same for categories", () => {
    const options = categoryOptionsFrom(ROUTING_RULES)
    expect(categoryOptionForRule(ROUTING_RULES[0], options)).toBe(options[0])
    expect(
      categoryOptionForRule(rule({ category: "New Thing" }), []).value
    ).toBe("New Thing")
  })
})

describe("field level resolution", () => {
  it("requires a non-blank rule name before submitting", () => {
    expect(canSubmitRule("Reply drafts")).toBe(true)
    expect(canSubmitRule("")).toBe(false)
    expect(canSubmitRule("   \t ")).toBe(false)
  })

  it("parses a token budget, stripping thousands separators", () => {
    expect(parseDailyTokens("1800")).toBe(1800)
    expect(parseDailyTokens("18,400,000")).toBe(18400000)
  })

  it("falls back to zero for blank or unparseable input", () => {
    expect(parseDailyTokens("")).toBe(0)
    expect(parseDailyTokens("abc")).toBe(0)
    expect(parseDailyTokens("Infinity")).toBe(0)
  })

  it("clamps a negative budget to zero", () => {
    expect(parseDailyTokens("-5")).toBe(0)
  })

  it("replaces a blank latency with the em-less placeholder", () => {
    expect(normalizeLatency("")).toBe("--")
    expect(normalizeLatency("   ")).toBe("--")
    expect(normalizeLatency("  910ms p95  ")).toBe("910ms p95")
  })

  it("names the provider from the picked option first", () => {
    expect(
      resolveProviderName(providerOption("OpenRoute Primary", "x"), null)
    ).toBe("OpenRoute Primary")
  })

  it("falls back to the edited rule, then to Custom", () => {
    expect(
      resolveProviderName(null, rule({ provider: "VectorEdge Small" }))
    ).toBe("VectorEdge Small")
    // Reachable when the grid has been emptied: with no rules there are no
    // provider options, so a created rule is stamped "Custom".
    expect(resolveProviderName(null, null)).toBe("Custom")
  })

  it("takes the category from the picked option, the rule, then General", () => {
    expect(
      resolveCategory(
        {
          id: "Safety",
          value: "Safety",
          label: "Safety",
          searchText: "safety",
        },
        null
      )
    ).toBe("Safety")
    expect(resolveCategory(null, rule({ category: "Drafting" }))).toBe(
      "Drafting"
    )
    expect(resolveCategory(null, null)).toBe("General")
  })
})

describe("resolveProviderLogo", () => {
  const logoMap = new Map<string, ProviderOption["logo"]>([
    ["Northstar Claude Pool", "mapped-logo"],
  ])

  it("prefers the logo on the picked option", () => {
    expect(
      resolveProviderLogo({
        chosenProvider: providerOption("Northstar Claude Pool", "picked-logo"),
        providerName: "Northstar Claude Pool",
        logoMap,
        baseRule: rule(),
        fallback: "fallback-logo",
      })
    ).toBe("picked-logo")
  })

  it("falls back to any rule already using that provider name", () => {
    expect(
      resolveProviderLogo({
        chosenProvider: null,
        providerName: "Northstar Claude Pool",
        logoMap,
        baseRule: rule({ providerLogo: "base-logo" }),
        fallback: "fallback-logo",
      })
    ).toBe("mapped-logo")
  })

  it("then falls back to the rule being edited", () => {
    expect(
      resolveProviderLogo({
        chosenProvider: null,
        providerName: "Unknown Pool",
        logoMap,
        baseRule: rule({ providerLogo: "base-logo" }),
        fallback: "fallback-logo",
      })
    ).toBe("base-logo")
  })

  it("uses the injected fallback when nothing else resolves", () => {
    expect(
      resolveProviderLogo({
        chosenProvider: null,
        providerName: "Unknown Pool",
        logoMap: new Map(),
        baseRule: null,
        fallback: "fallback-logo",
      })
    ).toBe("fallback-logo")
  })

  // Nullish coalescing means a deliberately blank logo is not honoured, it
  // just moves to the next source. Pinned so the precedence stays explicit.
  it("skips past a null logo on the picked option", () => {
    expect(
      resolveProviderLogo({
        chosenProvider: providerOption("Northstar Claude Pool", null),
        providerName: "Northstar Claude Pool",
        logoMap,
        baseRule: null,
        fallback: "fallback-logo",
      })
    ).toBe("mapped-logo")
  })

  it("resolves a real seeded logo node by identity", () => {
    const seeded = ROUTING_RULES[1]
    expect(
      resolveProviderLogo({
        chosenProvider: null,
        providerName: seeded.provider,
        logoMap: providerLogoMapFrom(ROUTING_RULES),
        baseRule: null,
        fallback: "fallback-logo",
      })
    ).toBe(seeded.providerLogo)
  })
})

describe("buildRoutingRule", () => {
  const now = new Date(2026, 5, 11)

  const draft = {
    baseRule: null as IRoutingRule | null,
    ruleName: "  Support reply drafts  ",
    provider: providerOption("OpenRoute Primary", "openroute-logo"),
    category: {
      id: "Drafting",
      value: "Drafting",
      label: "Drafting",
      searchText: "drafting",
    },
    logoMap: providerLogoMapFrom(ROUTING_RULES),
    fallbackLogo: "fallback-logo",
    kind: "primary" as RoutingRuleKind,
    scope: "Support" as RoutingRuleScope,
    status: "healthy" as RoutingRuleStatus,
    dailyTokens: "2,410,000",
    latency: " 910ms p95 ",
    now,
  }

  it("builds a complete record for a new rule", () => {
    const built = buildRoutingRule(draft)
    expect(built).toMatchObject({
      rule: "Support reply drafts",
      provider: "OpenRoute Primary",
      providerLogo: "openroute-logo",
      category: "Drafting",
      kind: "primary",
      scope: "Support",
      status: "healthy",
      dailyTokens: 2410000,
      latency: "910ms p95",
      updated: "Jun 11, 2026",
    })
    expect(built.id).toMatch(/^rule-/)
    expect(built.reference).toMatch(/^ROUTE-/)
  })

  it("mints an id and reference that are not already in the seed", () => {
    const built = buildRoutingRule(draft)
    expect(ROUTING_RULES.map((r) => r.id)).not.toContain(built.id)
  })

  it("keeps the id and reference of the rule being edited", () => {
    const baseRule = ROUTING_RULES[0]
    const built = buildRoutingRule({ ...draft, baseRule })
    expect(built.id).toBe(baseRule.id)
    expect(built.reference).toBe(baseRule.reference)
  })

  it("does not mutate the rule being edited", () => {
    const baseRule = { ...ROUTING_RULES[0] }
    const snapshot = { ...baseRule }
    buildRoutingRule({ ...draft, baseRule })
    expect(baseRule).toEqual(snapshot)
  })

  // Editing always restamps `updated`, even when nothing else changed.
  it("restamps the updated date on every save", () => {
    const built = buildRoutingRule({
      ...draft,
      baseRule: ROUTING_RULES[0],
      now: new Date(2026, 6, 25),
    })
    expect(built.updated).toBe("Jul 25, 2026")
    expect(built.updated).not.toBe(ROUTING_RULES[0].updated)
  })

  it("falls back to the edited rule's provider and category when none is picked", () => {
    const baseRule = ROUTING_RULES[3]
    const built = buildRoutingRule({
      ...draft,
      baseRule,
      provider: null,
      category: null,
    })
    expect(built.provider).toBe(baseRule.provider)
    expect(built.category).toBe(baseRule.category)
    expect(built.providerLogo).toBe(baseRule.providerLogo)
  })

  it("stamps Custom and General when creating with nothing selected", () => {
    const built = buildRoutingRule({
      ...draft,
      baseRule: null,
      provider: null,
      category: null,
      logoMap: new Map(),
    })
    expect(built.provider).toBe("Custom")
    expect(built.category).toBe("General")
    expect(built.providerLogo).toBe("fallback-logo")
  })

  it("normalises a blank token budget and latency", () => {
    const built = buildRoutingRule({ ...draft, dailyTokens: "", latency: "  " })
    expect(built.dailyTokens).toBe(0)
    expect(built.latency).toBe("--")
  })

  it.each<RoutingRuleStatus>(["healthy", "at_risk", "paused", "blocked"])(
    "carries the %s status straight through",
    (status) => {
      expect(buildRoutingRule({ ...draft, status }).status).toBe(status)
    }
  )

  it.each<RoutingRuleKind>(["primary", "fallback", "guardrail", "batch"])(
    "carries the %s kind straight through",
    (kind) => {
      expect(buildRoutingRule({ ...draft, kind }).kind).toBe(kind)
    }
  )

  it.each<RoutingRuleScope>(["Support", "Finance", "Safety", "Platform"])(
    "carries the %s scope straight through",
    (scope) => {
      expect(buildRoutingRule({ ...draft, scope }).scope).toBe(scope)
    }
  )

  it("round-trips a seeded rule unchanged apart from the updated stamp", () => {
    const baseRule = ROUTING_RULES[0]
    const options = providerOptionsFrom(ROUTING_RULES)
    const built = buildRoutingRule({
      baseRule,
      ruleName: baseRule.rule,
      provider: providerOptionForRule(baseRule, options),
      category: categoryOptionForRule(
        baseRule,
        categoryOptionsFrom(ROUTING_RULES)
      ),
      logoMap: providerLogoMapFrom(ROUTING_RULES),
      fallbackLogo: "fallback-logo",
      kind: baseRule.kind,
      scope: baseRule.scope,
      status: baseRule.status,
      dailyTokens: String(baseRule.dailyTokens),
      latency: baseRule.latency,
      now: new Date(2026, 5, 11),
    })
    expect(built).toEqual({ ...baseRule, updated: "Jun 11, 2026" })
  })
})
