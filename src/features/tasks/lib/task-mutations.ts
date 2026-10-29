import type { ISubIssue, ITask } from "../components/data"
import { TASK_STATUS_ORDER } from "../components/data"

/**
 * The template has no clock-dependent backend, so every mutation stamps the
 * same demo timestamp. Keeping it fixed also keeps the "Updated" sort stable
 * between renders and inside tests.
 */
export const DEMO_UPDATED_AT = "2026-04-15T09:30:00.000Z"

const JUST_NOW_LABEL = "Just now"

function statusOrderFor(status: ITask["status"]): number {
  return TASK_STATUS_ORDER.indexOf(status)
}

/**
 * Row checkbox. Cancelled tasks are skipped on purpose: ticking a cancelled
 * item would silently resurrect it as Done.
 */
export function setTaskCompletion(
  tasks: ITask[],
  taskId: string,
  completed: boolean
): ITask[] {
  return tasks.map((task) => {
    if (task.id !== taskId || task.status === "Cancelled") {
      return task
    }

    const nextStatus = completed ? "Done" : "Todo"

    return {
      ...task,
      status: nextStatus,
      statusOrder: statusOrderFor(nextStatus),
      updatedAt: DEMO_UPDATED_AT,
      updatedLabel: JUST_NOW_LABEL,
    }
  })
}

/** Row menu "Move to review". */
export function moveTaskToReview(tasks: ITask[], taskId: string): ITask[] {
  return tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          status: "Review",
          statusOrder: statusOrderFor("Review"),
          updatedAt: DEMO_UPDATED_AT,
          updatedLabel: JUST_NOW_LABEL,
        }
      : task
  )
}

/**
 * Sub-task checkbox. Recomputes the parent's completed counter from the
 * sub-issues themselves so the "2/4" badge can never drift out of sync.
 */
export function setSubIssueCompletion(
  tasks: ITask[],
  taskId: string,
  subIssueId: string,
  completed: boolean
): ITask[] {
  return tasks.map((task) => {
    if (task.id !== taskId || !task.subIssues?.length) return task

    const nextSubIssues: ISubIssue[] = task.subIssues.map((subIssue) => {
      if (subIssue.id !== subIssueId || subIssue.status === "Cancelled") {
        return subIssue
      }

      return {
        ...subIssue,
        status: completed ? "Done" : "Todo",
      }
    })

    const nextCompletedCount = nextSubIssues.filter(
      (subIssue) => subIssue.status === "Done"
    ).length

    return {
      ...task,
      subIssues: nextSubIssues,
      subtasksCompleted: nextCompletedCount,
      updatedAt: DEMO_UPDATED_AT,
      updatedLabel: JUST_NOW_LABEL,
    }
  })
}

export function taskExists(tasks: ITask[], taskId: string): boolean {
  return tasks.some((task) => task.id === taskId)
}

/**
 * One entry point for the task sheet's create and edit modes: a known id
 * replaces that record in place, an unknown id lands on top of the queue where
 * the user can see what they just created.
 */
export function upsertTask(tasks: ITask[], task: ITask): ITask[] {
  return taskExists(tasks, task.id)
    ? tasks.map((item) => (item.id === task.id ? task : item))
    : [task, ...tasks]
}

export function deleteTask(tasks: ITask[], taskId: string): ITask[] {
  return tasks.filter((task) => task.id !== taskId)
}
