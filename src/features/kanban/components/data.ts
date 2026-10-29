import type { Task, TaskStatus } from "@/lib/data/planner/types"
import { TASK_STATUS_ORDER } from "@/lib/data/planner/types"

// Column chrome carried by each status column. The className treatments are the
// block's shipped surface tints, retargeted to the five planner statuses.
export interface BoardColumn {
  title: string
  surfaceClassName: string
  borderClassName: string
  addClassName: string
}

export const BOARD_COLUMNS: Record<string, BoardColumn> = {
  Backlog: {
    title: "Backlog",
    surfaceClassName: "bg-muted/25 dark:bg-muted/10",
    borderClassName: "border-border",
    addClassName: "hover:border-muted-foreground/40 hover:bg-muted/35",
  },
  Todo: {
    title: "Todo",
    surfaceClassName: "bg-info/[0.045] dark:bg-info/10",
    borderClassName: "border-info/20 dark:border-info/25",
    addClassName: "hover:border-info/35 hover:bg-info/[0.06]",
  },
  "In Progress": {
    title: "In Progress",
    surfaceClassName: "bg-primary/[0.045] dark:bg-primary/10",
    borderClassName: "border-primary/20 dark:border-primary/25",
    addClassName: "hover:border-primary/35 hover:bg-primary/[0.06]",
  },
  Review: {
    title: "Review",
    surfaceClassName: "bg-warning/[0.045] dark:bg-warning/10",
    borderClassName: "border-warning/20 dark:border-warning/25",
    addClassName: "hover:border-warning/35 hover:bg-warning/[0.06]",
  },
  Done: {
    title: "Done",
    surfaceClassName: "bg-success/[0.045] dark:bg-success/10",
    borderClassName: "border-success/20 dark:border-success/25",
    addClassName: "hover:border-success/35 hover:bg-success/[0.06]",
  },
}

// Group a flat task list into the five ordered status columns (TASK_STATUS_ORDER).
// Seeds every column so empty statuses still render their empty state.
export function groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups = Object.fromEntries(
    TASK_STATUS_ORDER.map((status) => [status, [] as Task[]])
  ) as Record<TaskStatus, Task[]>

  for (const task of tasks) {
    const bucket = groups[task.status] ?? (groups[task.status] = [])
    bucket.push(task)
  }

  return groups
}
