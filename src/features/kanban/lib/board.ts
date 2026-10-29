import type { Task, TaskStatus } from "@/lib/data/planner/types"
import { TASK_STATUS_ORDER } from "@/lib/data/planner/types"

/**
 * Pure board state for the kanban feature: the column record keyed by status,
 * plus every read and write the board performs on it. Nothing here touches
 * React - the component keeps its useState and handlers and calls in.
 *
 * Every function returns a NEW board (and new column arrays); the argument is
 * never mutated, so a caller can safely hand in the current state object.
 */
export type BoardColumns = Record<string, Task[]>

/** Total cards on the board, across every column. */
export function countTasks(columns: BoardColumns): number {
  return Object.values(columns).reduce((count, list) => count + list.length, 0)
}

/** Whether any column already holds this card. */
export function containsTask(columns: BoardColumns, taskId: string): boolean {
  return Object.values(columns).some((list) =>
    list.some((task) => task.id === taskId)
  )
}

/** The card record itself, wherever it sits. */
export function findTask(
  columns: BoardColumns,
  taskId: string
): Task | undefined {
  for (const list of Object.values(columns)) {
    const found = list.find((task) => task.id === taskId)
    if (found) return found
  }
  return undefined
}

/**
 * Which status column a card currently sits in. Searched in TASK_STATUS_ORDER
 * rather than key order so the answer never depends on how the record was built.
 */
export function findTaskStatus(
  columns: BoardColumns,
  taskId: string
): TaskStatus | undefined {
  return TASK_STATUS_ORDER.find((status) =>
    (columns[status] ?? []).some((task) => task.id === taskId)
  )
}

/**
 * Moving a card between columns is a status change: re-stamp each task's status
 * to its column so the card's status chip stays coherent with its position.
 * Cards already carrying the right status keep their identity.
 */
export function stampColumnStatuses(columns: BoardColumns): BoardColumns {
  const stamped: BoardColumns = {}
  for (const [status, tasks] of Object.entries(columns)) {
    stamped[status] = tasks.map((task) =>
      task.status === status ? task : { ...task, status: status as TaskStatus }
    )
  }
  return stamped
}

/** Insert a card into one column at `index` (clamped); the head by default. */
export function insertTask(
  columns: BoardColumns,
  status: string,
  task: Task,
  index = 0
): BoardColumns {
  const list = columns[status] ?? []
  const at = Math.max(0, Math.min(index, list.length))
  return {
    ...columns,
    [status]: [...list.slice(0, at), task, ...list.slice(at)],
  }
}

/** New card: it lands at the head of the column its status names. */
export function createTask(columns: BoardColumns, task: Task): BoardColumns {
  return insertTask(columns, task.status, task, 0)
}

/** Replace a card in place, wherever it sits. An unknown id changes nothing. */
export function updateTask(columns: BoardColumns, task: Task): BoardColumns {
  const next: BoardColumns = {}
  for (const [status, list] of Object.entries(columns)) {
    next[status] = list.map((item) => (item.id === task.id ? task : item))
  }
  return next
}

/** Drop a card from every column. An unknown id changes nothing. */
export function removeTask(
  columns: BoardColumns,
  taskId: string
): BoardColumns {
  const next: BoardColumns = {}
  for (const [status, list] of Object.entries(columns)) {
    next[status] = list.filter((item) => item.id !== taskId)
  }
  return next
}

/**
 * Cross-column move: pull the card out of its source column and insert it into
 * `toStatus` at `toIndex`, re-stamping its status. A move whose destination is
 * the card's current column is a no-op and returns the board untouched.
 */
export function moveTask(
  columns: BoardColumns,
  taskId: string,
  toStatus: TaskStatus,
  toIndex = 0
): BoardColumns {
  const fromStatus = findTaskStatus(columns, taskId)
  if (fromStatus === toStatus) return columns
  const task = findTask(columns, taskId)
  if (!task) return columns
  const moved = task.status === toStatus ? task : { ...task, status: toStatus }
  return insertTask(removeTask(columns, taskId), toStatus, moved, toIndex)
}

/**
 * The task sheet's save: create the card when the board has never seen its id,
 * otherwise update it. An update that also changes the status relocates the card
 * to the head of the target column.
 */
export function submitTask(columns: BoardColumns, task: Task): BoardColumns {
  if (!containsTask(columns, task.id)) return createTask(columns, task)
  const fromStatus = findTaskStatus(columns, task.id)
  const updated = updateTask(columns, task)
  return fromStatus === task.status
    ? updated
    : moveTask(updated, task.id, task.status, 0)
}

/**
 * Id for a card created from the sheet. Four hex characters off a UUID, with a
 * timestamp tail where crypto.randomUUID is unavailable.
 */
export function newTaskId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `TASK-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
  }
  return `TASK-${String(Date.now()).slice(-4)}`
}

export interface TaskToastCopy {
  title: string
  description: string
}

/** Toast copy for a sheet save; `existed` picks the update wording. */
export function submitToast(task: Task, existed: boolean): TaskToastCopy {
  return existed
    ? {
        title: "Task updated",
        description: `${task.id} "${task.title}" was updated.`,
      }
    : {
        title: "Task created",
        description: `${task.id} "${task.title}" was added to ${task.status}.`,
      }
}

/** Toast copy for a delete. */
export function removeToast(task: Task): TaskToastCopy {
  return {
    title: "Task deleted",
    description: `${task.id} "${task.title}" was removed from the board.`,
  }
}
