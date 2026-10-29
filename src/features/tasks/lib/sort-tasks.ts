import type { SortingState } from "@tanstack/react-table"

import type { ITask, TaskOrdering } from "../components/data"
import { COMPLETED_STATUSES } from "./filter-tasks"

export type OrderDirection = "asc" | "desc"

/** Sorting column ids the grid understands, keyed by the queue "Ordering" select. */
const ORDERING_TO_COLUMN_ID: Record<TaskOrdering, string> = {
  status: "status",
  priority: "priority",
  "due-date": "dueDate",
  updated: "updated",
}

const COLUMN_ID_TO_ORDERING: Record<string, TaskOrdering> = {
  status: "status",
  priority: "priority",
  dueDate: "due-date",
  updated: "updated",
}

/** Settings popover -> table state. */
export function getSortingState(
  ordering: TaskOrdering,
  orderDirection: OrderDirection
): SortingState {
  return [
    {
      id: ORDERING_TO_COLUMN_ID[ordering] ?? "priority",
      desc: orderDirection === "desc",
    },
  ]
}

/**
 * Column header click -> settings popover, so sorting from the table keeps the
 * "Ordering" select in sync. Returns null when there is no primary sort, which
 * is the caller's signal to leave the popover state untouched. A column that
 * does not map to an ordering option resets to the priority default rather than
 * leaving a stale label behind.
 */
export function getOrderingFromSorting(
  sorting: SortingState
): { ordering: TaskOrdering; orderDirection: OrderDirection } | null {
  const primarySort = sorting[0]
  if (!primarySort) return null

  const ordering = COLUMN_ID_TO_ORDERING[primarySort.id]

  if (!ordering) {
    return { ordering: "priority", orderDirection: "desc" }
  }

  return { ordering, orderDirection: primarySort.desc ? "desc" : "asc" }
}

/**
 * Comparator for the queue. `taskKey` is the tie-breaker everywhere so equal
 * priorities/dates keep a stable, readable order. When
 * `orderCompletedByRecency` is on, two finished tasks are compared by
 * `updatedAt` instead of the active sort column, which floats freshly completed
 * work to the top of the done pile.
 */
export function compareTasksBySorting(
  taskA: ITask,
  taskB: ITask,
  sorting: SortingState,
  orderCompletedByRecency: boolean
): number {
  const primarySort = sorting[0]
  if (!primarySort) return 0

  const isDescending = primarySort?.desc ?? false
  const direction = isDescending ? -1 : 1

  const aCompleted = COMPLETED_STATUSES.includes(taskA.status)
  const bCompleted = COMPLETED_STATUSES.includes(taskB.status)

  let baseValue: number

  if (orderCompletedByRecency && aCompleted && bCompleted) {
    baseValue =
      taskA.updatedAt.localeCompare(taskB.updatedAt) ||
      taskA.taskKey.localeCompare(taskB.taskKey)
  } else {
    switch (primarySort?.id) {
      case "status":
        baseValue =
          taskA.statusOrder - taskB.statusOrder ||
          taskA.taskKey.localeCompare(taskB.taskKey)
        break
      case "dueDate":
        baseValue =
          taskA.dueAt.localeCompare(taskB.dueAt) ||
          taskA.taskKey.localeCompare(taskB.taskKey)
        break
      case "updated":
        baseValue =
          taskA.updatedAt.localeCompare(taskB.updatedAt) ||
          taskA.taskKey.localeCompare(taskB.taskKey)
        break
      case "priority":
      default:
        baseValue =
          taskA.priorityValue - taskB.priorityValue ||
          taskA.taskKey.localeCompare(taskB.taskKey)
        break
    }
  }

  return baseValue * direction
}

/** Sorts a copy so the caller's array (and React state) is left untouched. */
export function sortTasks(
  tasks: ITask[],
  sorting: SortingState,
  orderCompletedByRecency: boolean
): ITask[] {
  return [...tasks].sort((taskA, taskB) =>
    compareTasksBySorting(taskA, taskB, sorting, orderCompletedByRecency)
  )
}

/** The slice of the sorted queue the current page shows. */
export function paginateTasks(
  tasks: ITask[],
  pageIndex: number,
  pageSize: number
): ITask[] {
  const startIndex = pageIndex * pageSize

  return tasks.slice(startIndex, startIndex + pageSize)
}
