import type { Filter } from "@/components/reui/filters"

import type { IRoutingRule } from "../components/data"

/**
 * Filter evaluator for the routing rule grid.
 *
 * NOTE: this is a second copy of the evaluator that also lives in
 * src/features/tasks/components/data-grid-view.tsx. The two have diverged (see
 * `getActiveFilters` below), so they are deliberately kept apart until someone
 * decides which behaviour is correct.
 */

/**
 * Drop filter rows the user has not filled in yet, so a freshly added (blank)
 * row does not wipe the grid.
 *
 * Divergence from the tasks copy: that one short-circuits `empty` /
 * `not_empty` to always-active because those operators carry no values by
 * design. This copy does not, so those two operators are dropped here and
 * their branches in `applyFiltersToData` are unreachable from the UI.
 */
export function getActiveFilters(filters: Filter[]): Filter[] {
  return filters.filter((filter) => {
    const { values } = filter
    if (!values || values.length === 0) return false
    if (
      values.every((value) => typeof value === "string" && value.trim() === "")
    )
      return false
    if (values.every((value) => value === null || value === undefined))
      return false
    if (values.every((value) => Array.isArray(value) && value.length === 0))
      return false
    return true
  })
}

/** Stable key for comparing whether applied (active) filters meaningfully changed. */
export function serializeActiveFiltersKey(active: Filter[]): string {
  return JSON.stringify(
    active.map((f) => ({
      field: f.field,
      operator: f.operator,
      values: f.values,
    }))
  )
}

/** Read an arbitrary filter field off a rule without widening IRoutingRule. */
export function filterFieldValue(item: IRoutingRule, field: string): unknown {
  return item[field as keyof IRoutingRule]
}

/**
 * Apply every active filter to `data`, narrowing left to right (AND across
 * rows, OR across the values inside one row). Always returns a new array.
 */
export function applyFiltersToData(
  data: IRoutingRule[],
  filters: Filter[]
): IRoutingRule[] {
  const active = getActiveFilters(filters)
  let result = [...data]

  active.forEach((filter) => {
    const { field, operator, values } = filter

    result = result.filter((item) => {
      const raw = filterFieldValue(item, field)
      const fieldValue = raw != null ? raw : ""

      switch (operator) {
        case "is":
          return values.includes(fieldValue)
        case "is_not":
          return !values.includes(fieldValue)
        case "is_any_of":
          return values.some((v) => fieldValue === v)
        case "is_not_any_of":
          return !values.some((v) => fieldValue === v)
        case "contains": {
          const tokens = values.map((v) => String(v).trim()).filter(Boolean)
          if (tokens.length === 0) return true
          return tokens.some((token) =>
            String(fieldValue).toLowerCase().includes(token.toLowerCase())
          )
        }
        case "not_contains":
          return !values.some((v) =>
            String(fieldValue).toLowerCase().includes(String(v).toLowerCase())
          )
        case "starts_with":
          return values.some((v) =>
            String(fieldValue).toLowerCase().startsWith(String(v).toLowerCase())
          )
        case "ends_with":
          return values.some((v) =>
            String(fieldValue).toLowerCase().endsWith(String(v).toLowerCase())
          )
        case "equals":
          return fieldValue === values[0]
        case "not_equals":
          return fieldValue !== values[0]
        case "greater_than":
          return Number(fieldValue) > Number(values[0])
        case "less_than":
          return Number(fieldValue) < Number(values[0])
        case "greater_than_or_equal":
          return Number(fieldValue) >= Number(values[0])
        case "less_than_or_equal":
          return Number(fieldValue) <= Number(values[0])
        case "between":
          if (values.length >= 2) {
            const min = Number(values[0])
            const max = Number(values[1])
            return Number(fieldValue) >= min && Number(fieldValue) <= max
          }
          return true
        case "not_between":
          if (values.length >= 2) {
            const min = Number(values[0])
            const max = Number(values[1])
            return Number(fieldValue) < min || Number(fieldValue) > max
          }
          return true
        case "empty":
          return fieldValue === "" || fieldValue == null
        case "not_empty":
          return fieldValue !== "" && fieldValue != null
        default:
          return true
      }
    })
  })

  return result
}
