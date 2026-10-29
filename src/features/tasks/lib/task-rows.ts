import type {
  ISubIssueRow,
  ITask,
  ITaskRow,
  TaskTableRow,
} from "../components/data"

/** Only expanded task ids are present; collapsing deletes the key rather than storing false. */
export type ExpandedTaskIds = Record<string, boolean>

export function buildSubIssueRows(task: ITask): ISubIssueRow[] {
  return (task.subIssues ?? []).map((subIssue) => ({
    kind: "subIssue",
    id: subIssue.id,
    task,
    subIssue,
  }))
}

/**
 * Flattens tasks into grid rows. Sub-issues are attached as `subRows` whenever
 * sub-tasks are enabled, but they are only emitted as their own rows for tasks
 * the user has expanded, which is what makes the disclosure toggle work with a
 * manually paginated table.
 */
export function buildTaskRows(
  tasks: ITask[],
  includeSubTasks: boolean,
  expandedTaskIds: ExpandedTaskIds = {}
): TaskTableRow[] {
  return tasks.flatMap((task) => {
    const subRows = includeSubTasks ? buildSubIssueRows(task) : undefined
    const taskRow: ITaskRow = {
      kind: "task",
      id: task.id,
      task,
      subRows,
    }

    if (!includeSubTasks || !expandedTaskIds[task.id] || !subRows?.length) {
      return [taskRow]
    }

    return [taskRow, ...subRows]
  })
}

/**
 * Opens the first expandable row on first paint so the sub-task affordance is
 * discoverable without the user hunting for a chevron.
 */
export function getDefaultExpandedTaskIds(
  taskRows: TaskTableRow[]
): ExpandedTaskIds {
  const firstExpandableRow = taskRows.find(
    (row) => row.kind === "task" && row.subRows?.length
  )

  if (!firstExpandableRow) {
    return {}
  }

  return { [firstExpandableRow.id]: true }
}

/** Collapsing removes the key entirely, keeping the map to just what is open. */
export function toggleExpandedTaskId(
  current: ExpandedTaskIds,
  taskId: string
): ExpandedTaskIds {
  if (!current[taskId]) {
    return { ...current, [taskId]: true }
  }

  const nextExpandedTaskIds = { ...current }
  delete nextExpandedTaskIds[taskId]

  return nextExpandedTaskIds
}
