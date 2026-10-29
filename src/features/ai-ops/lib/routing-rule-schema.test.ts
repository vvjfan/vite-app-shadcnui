import { describe, expect, it } from "vitest"

import {
  KIND_OPTIONS,
  parseDailyTokens,
  SCOPE_OPTIONS,
  STATUS_OPTIONS,
} from "@/features/ai-ops/lib/routing-rule-form"
import {
  DAILY_TOKENS_MAX,
  DAILY_TOKENS_MESSAGE,
  DAILY_TOKENS_RANGE_MESSAGE,
  KIND_VALUES,
  LATENCY_MAX,
  routingRuleFormSchema,
  RULE_NAME_MAX,
  SCOPE_VALUES,
  STATUS_VALUES,
} from "@/features/ai-ops/lib/routing-rule-schema"

function values(overrides: Record<string, unknown> = {}) {
  return {
    ruleName: "Support triage",
    provider: "Northstar Claude Pool",
    category: "Long Context",
    kind: "primary",
    scope: "Support",
    status: "healthy",
    dailyTokens: "1200",
    latency: "1.8s p95",
    ...overrides,
  }
}

/** First message for a field, or undefined when the field is valid. */
function messageFor(
  overrides: Record<string, unknown>,
  field: string
): string | undefined {
  const result = routingRuleFormSchema.safeParse(values(overrides))
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("routingRuleFormSchema", () => {
  it("accepts a filled in rule", () => {
    expect(routingRuleFormSchema.safeParse(values()).success).toBe(true)
  })

  it("trims the text it hands back", () => {
    const result = routingRuleFormSchema.safeParse(
      values({ ruleName: "  Triage  ", latency: "  2s p95  " })
    )
    expect(result.data).toMatchObject({ ruleName: "Triage", latency: "2s p95" })
  })

  // ── Rule name ──

  it("rejects an empty rule name", () => {
    expect(messageFor({ ruleName: "" }, "ruleName")).toBe("Enter a rule name.")
  })

  it("rejects a rule name of only spaces", () => {
    expect(messageFor({ ruleName: "   " }, "ruleName")).toBe(
      "Enter a rule name."
    )
  })

  it("rejects a rule name past the length limit", () => {
    expect(
      messageFor({ ruleName: "r".repeat(RULE_NAME_MAX + 1) }, "ruleName")
    ).toBe("Use 60 characters or fewer.")
  })

  // ── Selects ──

  it("accepts every kind, scope and status the pickers offer", () => {
    for (const kind of KIND_VALUES) {
      expect(routingRuleFormSchema.safeParse(values({ kind })).success).toBe(
        true
      )
    }
    for (const scope of SCOPE_VALUES) {
      expect(routingRuleFormSchema.safeParse(values({ scope })).success).toBe(
        true
      )
    }
    for (const status of STATUS_VALUES) {
      expect(routingRuleFormSchema.safeParse(values({ status })).success).toBe(
        true
      )
    }
  })

  it("stays in step with the option lists the sheet renders", () => {
    expect(KIND_OPTIONS.map((option) => option.kind)).toEqual([...KIND_VALUES])
    expect(SCOPE_OPTIONS.map((option) => option.scope)).toEqual([
      ...SCOPE_VALUES,
    ])
    expect(STATUS_OPTIONS.map((option) => option.status)).toEqual([
      ...STATUS_VALUES,
    ])
  })

  it("rejects an unknown kind, scope or status", () => {
    expect(messageFor({ kind: "shadow" }, "kind")).toBe("Choose a kind.")
    expect(messageFor({ scope: "Legal" }, "scope")).toBe("Choose a scope.")
    expect(messageFor({ status: "on_fire" }, "status")).toBe("Choose a status.")
  })

  it("allows an empty provider and category, since both lists come from the grid", () => {
    const result = routingRuleFormSchema.safeParse(
      values({ provider: "", category: "" })
    )
    expect(result.success).toBe(true)
  })

  // ── Daily tokens ──

  it("accepts an empty budget, which submits as 0", () => {
    const parsed = routingRuleFormSchema.parse(values({ dailyTokens: "" }))
    expect(parsed.dailyTokens).toBe("")
    // The schema lets it through; parseDailyTokens is what turns it into 0.
    expect(parseDailyTokens(parsed.dailyTokens)).toBe(0)
  })

  it("accepts zero and the top of the range", () => {
    expect(
      routingRuleFormSchema.safeParse(values({ dailyTokens: "0" })).success
    ).toBe(true)
    expect(
      routingRuleFormSchema.safeParse(
        values({ dailyTokens: String(DAILY_TOKENS_MAX) })
      ).success
    ).toBe(true)
  })

  it("rejects a budget over the range", () => {
    expect(
      messageFor({ dailyTokens: String(DAILY_TOKENS_MAX + 1) }, "dailyTokens")
    ).toBe(DAILY_TOKENS_RANGE_MESSAGE)
    expect(DAILY_TOKENS_RANGE_MESSAGE).toBe("Enter 0 to 100,000,000.")
  })

  it("rejects a negative budget", () => {
    expect(messageFor({ dailyTokens: "-1" }, "dailyTokens")).toBe(
      DAILY_TOKENS_MESSAGE
    )
  })

  it("rejects a fractional budget", () => {
    expect(messageFor({ dailyTokens: "12.5" }, "dailyTokens")).toBe(
      DAILY_TOKENS_MESSAGE
    )
  })

  it("rejects text in the budget", () => {
    expect(messageFor({ dailyTokens: "lots" }, "dailyTokens")).toBe(
      DAILY_TOKENS_MESSAGE
    )
  })

  // ── Latency ──

  it("accepts an empty latency", () => {
    expect(
      routingRuleFormSchema.safeParse(values({ latency: "" })).success
    ).toBe(true)
  })

  it("rejects a latency past the length limit", () => {
    expect(
      messageFor({ latency: "l".repeat(LATENCY_MAX + 1) }, "latency")
    ).toBe("Use 24 characters or fewer.")
  })
})
