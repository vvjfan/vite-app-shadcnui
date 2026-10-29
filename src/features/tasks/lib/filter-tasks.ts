import type { Filter } from "@/components/reui/filters"

import type { ITask, TaskStatus, TaskTab } from "../components/data"

/** Statuses the "Active" tab keeps. Backlog is deliberately excluded: it has its own tab. */
export const ACTIVE_STATUSES: TaskStatus[] = ["Todo", "In Progress", "Review"]

/** Statuses that count as finished work, hidden by the "Include completed" switch. */
export const COMPLETED_STATUSES: TaskStatus[] = ["Done", "Cancelled"]

/**
 * Drops filter rows the user has started but not filled in, so a half-built
 * condition never empties the grid. `empty` / `not_empty` carry no values by
 * design, so they are always considered active.
 */
export function getActiveFilters(filters: Filter[]): Filter[] {
  return filters.filter((filter) => {
    const { operator, values } = filter
    if (operator === "empty" || operator === "not_empty") return true
    if (!values || values.length === 0) return false
    if (
      values.every((value) => typeof value === "string" && value.trim() === "")
    ) {
      return false
    }
    if (values.every((value) => value == null)) return false
    if (values.every((value) => Array.isArray(value) && value.length === 0)) {
      return false
    }
    return true
  })
}

/**
 * The grid always mounts one empty `title contains ""` row so the search box is
 * visible. Recognising it lets the toolbar tell "no filters yet" apart from
 * "filters the user actually added".
 */
export function isDefaultTaskFilter(filter: Filter): boolean {
  if (filter.field !== "title" || filter.operator !== "contains") return false
  if (!filter.values || filter.values.length !== 1) return false

  return typeof filter.values[0] === "string" && filter.values[0].trim() === ""
}

export function hasVisibleFilterControls(filters: Filter[]): boolean {
  return filters.some((filter) => !isDefaultTaskFilter(filter))
}

/**
 * Maps a filter field key onto the value that gets compared.
 *
 * `title` intentionally returns a search blob (title + project + every
 * sub-issue title) so typing a sub-task name keeps its parent row on screen.
 * `assignee` collapses a null assignee to the literal "Unassigned" so the
 * select option of the same name can match it.
 */
export function filterFieldValue(item: ITask, field: string): unknown {
  switch (field) {
    case "title":
      return [
        item.title,
        item.project,
        ...(item.subIssues ?? []).map((subIssue) => subIssue.title),
      ].join(" ")
    case "assignee":
      return item.assignee?.name ?? "Unassigned"
    default:
      return item[field as keyof ITask]
  }
}

/**
 * The single operator evaluator behind every filter row. `fieldValue` is
 * expected to be already normalised by `taskMatchesFilter`; unknown operators
 * fall through to `true` so an unsupported condition never hides rows.
 */
export function evaluateFilterOperator(
  fieldValue: unknown,
  operator: string,
  values: unknown[]
): boolean {
  switch (operator) {
    case "is":
      return values.includes(fieldValue)
    case "is_not":
      return !values.includes(fieldValue)
    case "is_any_of":
      return values.some((value) => fieldValue === value)
    case "is_not_any_of":
      return !values.some((value) => fieldValue === value)
    case "contains": {
      const tokens = values.map((value) => String(value).trim()).filter(Boolean)

      if (tokens.length === 0) return true

      return tokens.some((token) =>
        String(fieldValue).toLowerCase().includes(token.toLowerCase())
      )
    }
    case "not_contains":
      return !values.some((value) =>
        String(fieldValue).toLowerCase().includes(String(value).toLowerCase())
      )
    case "starts_with":
      return values.some((value) =>
        String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase())
      )
    case "ends_with":
      return values.some((value) =>
        String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase())
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
}

/** Reads the field off the task, coerces null/undefined to "", then evaluates. */
export function taskMatchesFilter(task: ITask, filter: Filter): boolean {
  const raw = filterFieldValue(task, filter.field)
  const fieldValue = raw != null ? raw : ""

  return evaluateFilterOperator(fieldValue, filter.operator, filter.values)
}

/**
 * Applies every active filter as an AND chain and always returns a new array,
 * so callers can hand the result straight to React state.
 */
export function applyFiltersToData(data: ITask[], filters: Filter[]): ITask[] {
  const active = getActiveFilters(filters)
  let result = [...data]

  active.forEach((filter) => {
    result = result.filter((item) => taskMatchesFilter(item, filter))
  })

  return result
}

export function isCompletedTask(task: ITask): boolean {
  return COMPLETED_STATUSES.includes(task.status)
}

export function matchesTaskTab(task: ITask, tab: TaskTab): boolean {
  if (tab === "all") return true
  if (tab === "active") return ACTIVE_STATUSES.includes(task.status)

  return task.status === "Backlog"
}

/**
 * The rows the grid actually renders: the current tab, minus completed work
 * when the "Include completed" switch is off.
 */
export function getVisibleTasks(
  tasks: ITask[],
  tab: TaskTab,
  showCompleted: boolean
): ITask[] {
  return tasks.filter((task) => {
    if (!matchesTaskTab(task, tab)) return false
    if (!showCompleted && isCompletedTask(task)) return false

    return true
  })
}

export function countCompletedTasks(tasks: ITask[]): number {
  return tasks.filter(isCompletedTask).length
}

/** Badge count next to each tab label. */
export function getTaskTabCount(
  tasks: ITask[],
  tab: TaskTab,
  showCompleted: boolean
): number {
  const filteredTasks = showCompleted
    ? tasks
    : tasks.filter((task) => !isCompletedTask(task))

  if (tab === "active") {
    return filteredTasks.filter((task) => ACTIVE_STATUSES.includes(task.status))
      .length
  }

  if (tab === "backlog") {
    return filteredTasks.filter((task) => task.status === "Backlog").length
  }

  return filteredTasks.length
}
