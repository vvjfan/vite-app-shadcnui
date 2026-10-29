import type { Filter } from "@/components/reui/filters"

import type { IRoutingRule } from "../components/data"
import { applyFiltersToData } from "./filter-routing-rules"

/**
 * Create / update / delete over the routing rule grid's dual state: the full
 * `rules` list and the `filtered` list the table actually renders. Every
 * function returns new arrays; the ROUTING_RULES seed constant is never
 * touched.
 */

export interface RoutingRuleCommit {
  rules: IRoutingRule[]
  filtered: IRoutingRule[]
  /** True when the submit created a rule rather than updating an existing one. */
  created: boolean
}

export interface ToastCopy {
  title: string
  description: string
}

export function ruleExists(rules: IRoutingRule[], id: string): boolean {
  return rules.some((item) => item.id === id)
}

/**
 * Replace the rule with a matching id, or prepend it when it is new. Prepending
 * (rather than appending) is what lets a fresh rule show up on page 1.
 */
export function upsertRule(
  rules: IRoutingRule[],
  rule: IRoutingRule
): IRoutingRule[] {
  return ruleExists(rules, rule.id)
    ? rules.map((item) => (item.id === rule.id ? rule : item))
    : [rule, ...rules]
}

export function deleteRule(rules: IRoutingRule[], id: string): IRoutingRule[] {
  return rules.filter((item) => item.id !== id)
}

/** Upsert plus the re-filtered view, so both halves of the state stay in sync. */
export function commitRule(
  rules: IRoutingRule[],
  rule: IRoutingRule,
  filters: Filter[]
): RoutingRuleCommit {
  const created = !ruleExists(rules, rule.id)
  const next = upsertRule(rules, rule)

  return {
    rules: next,
    filtered: applyFiltersToData(next, filters),
    created,
  }
}

/** Delete plus the re-filtered view. */
export function commitDeleteRule(
  rules: IRoutingRule[],
  rule: IRoutingRule,
  filters: Filter[]
): Omit<RoutingRuleCommit, "created"> {
  const next = deleteRule(rules, rule.id)

  return {
    rules: next,
    filtered: applyFiltersToData(next, filters),
  }
}

export function ruleSubmitToast(
  rule: IRoutingRule,
  created: boolean
): ToastCopy {
  return {
    title: created ? "Routing rule created" : "Routing rule updated",
    description: created
      ? `${rule.reference} "${rule.rule}" was added to the list.`
      : `${rule.reference} "${rule.rule}" was updated.`,
  }
}

export function ruleDeleteToast(rule: IRoutingRule): ToastCopy {
  return {
    title: "Routing rule deleted",
    description: `${rule.reference} "${rule.rule}" was removed from the policy.`,
  }
}
