import { z } from "zod"

import type {
  RoutingRuleKind,
  RoutingRuleScope,
  RoutingRuleStatus,
} from "../components/data"

/**
 * Validation for the routing rule sheet's create/edit form.
 *
 * The form holds the picked provider and category as their plain string values
 * (the sheet resolves them back to option objects for the comboboxes, since an
 * option carries a ReactNode logo that has no business in a schema).
 *
 * Provider and category are deliberately NOT required: both lists are derived
 * from the rules already in the grid, so a policy emptied of rules offers
 * nothing to pick and buildRoutingRule() falls back to "Custom" / "General".
 * Kind, scope and status are closed sets and are checked as such.
 *
 * Daily tokens is an <input type="number">, so it arrives as text. An EMPTY
 * budget is allowed and submits as 0, matching parseDailyTokens("") - it reads
 * as "no budget set yet" rather than blocking the save.
 */

const WHOLE_NUMBER = /^\d+$/

export const DAILY_TOKENS_MAX = 100_000_000
export const RULE_NAME_MAX = 60
export const LATENCY_MAX = 24

/** Message for a budget that is not a whole number (negatives included). */
export const DAILY_TOKENS_MESSAGE = "Enter a whole number, 0 or more."
export const DAILY_TOKENS_RANGE_MESSAGE = `Enter 0 to ${DAILY_TOKENS_MAX.toLocaleString("en-US")}.`

export const KIND_VALUES = [
  "primary",
  "fallback",
  "guardrail",
  "batch",
] as const satisfies readonly RoutingRuleKind[]

export const SCOPE_VALUES = [
  "Support",
  "Finance",
  "Safety",
  "Platform",
] as const satisfies readonly RoutingRuleScope[]

export const STATUS_VALUES = [
  "healthy",
  "at_risk",
  "paused",
  "blocked",
] as const satisfies readonly RoutingRuleStatus[]

export const routingRuleFormSchema = z.object({
  ruleName: z
    .string()
    .trim()
    .min(1, "Enter a rule name.")
    .max(RULE_NAME_MAX, `Use ${RULE_NAME_MAX} characters or fewer.`),
  provider: z.string(),
  category: z.string(),
  kind: z.enum(KIND_VALUES, "Choose a kind."),
  scope: z.enum(SCOPE_VALUES, "Choose a scope."),
  status: z.enum(STATUS_VALUES, "Choose a status."),
  dailyTokens: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") return
      if (!WHOLE_NUMBER.test(value)) {
        ctx.addIssue({ code: "custom", message: DAILY_TOKENS_MESSAGE })
        return
      }
      if (Number(value) > DAILY_TOKENS_MAX) {
        ctx.addIssue({ code: "custom", message: DAILY_TOKENS_RANGE_MESSAGE })
      }
    }),
  // Free text, because the grid shows whatever the provider reports ("1.8s
  // p95"). Empty is fine; normalizeLatency() stores "--".
  latency: z
    .string()
    .trim()
    .max(LATENCY_MAX, `Use ${LATENCY_MAX} characters or fewer.`),
})

export type RoutingRuleFormValues = z.infer<typeof routingRuleFormSchema>
