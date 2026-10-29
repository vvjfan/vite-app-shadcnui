import type { ReactNode } from "react"
import { format } from "date-fns"

import type {
  IRoutingRule,
  RoutingRuleKind,
  RoutingRuleScope,
  RoutingRuleStatus,
} from "../components/data"

/**
 * Pure form logic behind the routing rule sheet: the option lists it offers,
 * the id/reference generators for a brand-new rule, and the value resolution
 * that turns the form fields into an IRoutingRule.
 */

// ── Option shapes ──

export interface InlineOption {
  id: string
  value: string
  label: string
  searchText: string
}

export interface ProviderOption extends InlineOption {
  logo: ReactNode
}

export interface KindOption extends InlineOption {
  kind: RoutingRuleKind
}

export interface ScopeOption extends InlineOption {
  scope: RoutingRuleScope
}

export interface StatusOption extends InlineOption {
  status: RoutingRuleStatus
}

export const KIND_LABEL: Record<RoutingRuleKind, string> = {
  primary: "Primary",
  fallback: "Fallback",
  guardrail: "Guardrail",
  batch: "Batch",
}

export const STATUS_LABEL: Record<RoutingRuleStatus, string> = {
  healthy: "Healthy",
  at_risk: "At Risk",
  paused: "Paused",
  blocked: "Blocked",
}

export const KIND_OPTIONS: KindOption[] = (
  ["primary", "fallback", "guardrail", "batch"] as RoutingRuleKind[]
).map((kind) => ({
  id: kind,
  value: kind,
  label: KIND_LABEL[kind],
  searchText: KIND_LABEL[kind].toLowerCase(),
  kind,
}))

export const SCOPE_OPTIONS: ScopeOption[] = (
  ["Support", "Finance", "Safety", "Platform"] as RoutingRuleScope[]
).map((scope) => ({
  id: scope,
  value: scope,
  label: scope,
  searchText: scope.toLowerCase(),
  scope,
}))

export const STATUS_OPTIONS: StatusOption[] = (
  ["healthy", "at_risk", "paused", "blocked"] as RoutingRuleStatus[]
).map((status) => ({
  id: status,
  value: status,
  label: STATUS_LABEL[status],
  searchText: STATUS_LABEL[status].toLowerCase(),
  status,
}))

// ── Map an existing rule back onto the form's option objects ──

export function kindOptionFor(kind: RoutingRuleKind): KindOption {
  return KIND_OPTIONS.find((option) => option.kind === kind) ?? KIND_OPTIONS[0]
}

export function scopeOptionFor(scope: RoutingRuleScope): ScopeOption {
  return (
    SCOPE_OPTIONS.find((option) => option.scope === scope) ?? SCOPE_OPTIONS[0]
  )
}

export function statusOptionFor(status: RoutingRuleStatus): StatusOption {
  return (
    STATUS_OPTIONS.find((option) => option.status === status) ??
    STATUS_OPTIONS[0]
  )
}

// ── Option lists derived from the rules currently in the grid ──

/** Unique providers, first logo wins, in first-seen order. */
export function providerOptionsFrom(rules: IRoutingRule[]): ProviderOption[] {
  const seen = new Map<string, ProviderOption>()

  rules.forEach((rule) => {
    if (!seen.has(rule.provider)) {
      seen.set(rule.provider, {
        id: rule.provider,
        value: rule.provider,
        label: rule.provider,
        searchText: rule.provider.toLowerCase(),
        logo: rule.providerLogo,
      })
    }
  })

  return Array.from(seen.values())
}

export function categoryOptionsFrom(rules: IRoutingRule[]): InlineOption[] {
  const seen = new Map<string, InlineOption>()

  rules.forEach((rule) => {
    if (!seen.has(rule.category)) {
      seen.set(rule.category, {
        id: rule.category,
        value: rule.category,
        label: rule.category,
        searchText: rule.category.toLowerCase(),
      })
    }
  })

  return Array.from(seen.values())
}

export function providerLogoMapFrom(
  rules: IRoutingRule[]
): Map<string, ReactNode> {
  const map = new Map<string, ReactNode>()

  rules.forEach((rule) => {
    if (!map.has(rule.provider)) {
      map.set(rule.provider, rule.providerLogo)
    }
  })

  return map
}

/**
 * Option to preselect when hydrating the form from `rule`. Falls back to an
 * option synthesised from the rule itself so a provider that is no longer in
 * the list (its only other rule was deleted) still renders.
 */
export function providerOptionForRule(
  rule: IRoutingRule,
  options: ProviderOption[]
): ProviderOption {
  return (
    options.find((option) => option.value === rule.provider) ?? {
      id: rule.provider,
      value: rule.provider,
      label: rule.provider,
      searchText: rule.provider.toLowerCase(),
      logo: rule.providerLogo,
    }
  )
}

export function categoryOptionForRule(
  rule: IRoutingRule,
  options: InlineOption[]
): InlineOption {
  return (
    options.find((option) => option.value === rule.category) ?? {
      id: rule.category,
      value: rule.category,
      label: rule.category,
      searchText: rule.category.toLowerCase(),
    }
  )
}

// ── Id generation for brand-new rules ──

export function newRuleId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `rule-${crypto.randomUUID().slice(0, 8)}`
  }
  return `rule-${Date.now()}`
}

/** Extracted so the reference derivation can be exercised without a clock. */
export function referenceFromTimestamp(ms: number): string {
  return `ROUTE-${String(ms).slice(-3)}`
}

export function newRuleReference(): string {
  return referenceFromTimestamp(Date.now())
}

// ── Field level resolution ──

export function canSubmitRule(ruleName: string): boolean {
  return ruleName.trim().length > 0
}

/** Strips thousands separators; anything unparseable or negative becomes 0. */
export function parseDailyTokens(raw: string): number {
  const parsed = Number(raw.replace(/,/g, ""))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

export function normalizeLatency(raw: string): string {
  return raw.trim() || "--"
}

export function resolveProviderName(
  chosenProvider: ProviderOption | null,
  baseRule: IRoutingRule | null
): string {
  return chosenProvider?.value ?? baseRule?.provider ?? "Custom"
}

/**
 * Provider logo, in priority order: the picked option, any rule already using
 * that provider name, the rule being edited, then the caller's fallback node.
 * The fallback is injected because this module stays free of JSX.
 */
export function resolveProviderLogo({
  chosenProvider,
  providerName,
  logoMap,
  baseRule,
  fallback,
}: {
  chosenProvider: ProviderOption | null
  providerName: string
  logoMap: Map<string, ReactNode>
  baseRule: IRoutingRule | null
  fallback: ReactNode
}): ReactNode {
  return (
    chosenProvider?.logo ??
    logoMap.get(providerName) ??
    baseRule?.providerLogo ??
    fallback
  )
}

export function resolveCategory(
  chosenCategory: InlineOption | null,
  baseRule: IRoutingRule | null
): string {
  return chosenCategory?.value ?? baseRule?.category ?? "General"
}

// ── Assemble the record the grid stores ──

export interface RoutingRuleDraft {
  /** The rule being edited, or null when creating. */
  baseRule: IRoutingRule | null
  ruleName: string
  provider: ProviderOption | null
  category: InlineOption | null
  logoMap: Map<string, ReactNode>
  fallbackLogo: ReactNode
  kind: RoutingRuleKind
  scope: RoutingRuleScope
  status: RoutingRuleStatus
  dailyTokens: string
  latency: string
  /** Injectable clock so the stamped `updated` date can be asserted. */
  now?: Date
}

export function buildRoutingRule(draft: RoutingRuleDraft): IRoutingRule {
  const { baseRule } = draft
  const providerName = resolveProviderName(draft.provider, baseRule)

  return {
    id: baseRule?.id ?? newRuleId(),
    reference: baseRule?.reference ?? newRuleReference(),
    updated: format(draft.now ?? new Date(), "MMM d, yyyy"),
    rule: draft.ruleName.trim(),
    provider: providerName,
    providerLogo: resolveProviderLogo({
      chosenProvider: draft.provider,
      providerName,
      logoMap: draft.logoMap,
      baseRule,
      fallback: draft.fallbackLogo,
    }),
    category: resolveCategory(draft.category, baseRule),
    kind: draft.kind,
    scope: draft.scope,
    dailyTokens: parseDailyTokens(draft.dailyTokens),
    latency: normalizeLatency(draft.latency),
    status: draft.status,
  }
}
