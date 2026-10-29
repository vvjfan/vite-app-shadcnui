import { z } from "zod"

import type { DemoPriority, DemoStatus } from "../components/data"
import { dayStart } from "./task-state"

/**
 * Validation for the gantt's task dialog. One schema covers its three modes:
 *
 * - `task`     a brand-new task, so it also needs the list it lands in
 * - `edit`     an existing bar plus its task fields
 * - `schedule` another bar on a task that already exists (task fields hidden)
 *
 * `mode` travels with the values so the list rule can stay conditional without
 * a second schema; every other rule is shared by all three dialogs.
 */

export const TASK_FORM_MODES = ["edit", "task", "schedule"] as const

/** `as const satisfies`: literal inference for zod, checked against the data types. */
const TASK_STATUS_VALUES = [
  "todo",
  "progress",
  "review",
  "done",
] as const satisfies readonly DemoStatus[]

const TASK_PRIORITY_VALUES = [
  "low",
  "normal",
  "high",
  "urgent",
] as const satisfies readonly DemoPriority[]

/** Titles ride a single tree row, so they stay short enough to read there. */
export const TASK_TITLE_MAX = 80

export const taskFormSchema = z
  .object({
    mode: z.enum(TASK_FORM_MODES),
    title: z
      .string({ error: "Enter a title." })
      .trim()
      .min(1, "Enter a title.")
      .max(TASK_TITLE_MAX, `Use ${TASK_TITLE_MAX} characters or fewer.`),
    groupId: z.string({ error: "Choose a list." }),
    status: z.enum(TASK_STATUS_VALUES, { error: "Choose a status." }),
    priority: z.enum(TASK_PRIORITY_VALUES, { error: "Choose a priority." }),
    assignees: z.array(z.string().trim().min(1, "Choose an assignee.")),
    start: z.date({ error: "Choose a start date." }),
    due: z.date({ error: "Choose a due date." }),
    color: z.string({ error: "Pick a color." }).min(1, "Pick a color."),
  })
  .superRefine((values, ctx) => {
    // Only a new task picks its list; edit and schedule act on a task that
    // already sits somewhere in the tree.
    if (values.mode === "task" && values.groupId.trim() === "") {
      ctx.addIssue({
        code: "custom",
        path: ["groupId"],
        message: "Choose a list.",
      })
    }

    // The bar is saved as [start, due + 1 day), so an equal pair is a valid
    // one-day bar; only an earlier due date is refused. Compared by day, the
    // same way the dialog saves it.
    if (dayStart(values.due).getTime() < dayStart(values.start).getTime()) {
      ctx.addIssue({
        code: "custom",
        path: ["due"],
        message: "Due date must be on or after the start date.",
      })
    }

    if (new Set(values.assignees).size !== values.assignees.length) {
      ctx.addIssue({
        code: "custom",
        path: ["assignees"],
        message: "Each assignee can only be added once.",
      })
    }
  })

export type TaskFormValues = z.infer<typeof taskFormSchema>
