import { format } from "date-fns"
import { z } from "zod"

import { TASK_PRIORITY_ORDER, TASK_STATUS_ORDER } from "../components/data"
import type { ITask } from "../components/data"

/**
 * Client-side validation for the tasks sheet.
 *
 * Neither union is retyped here: TASK_STATUS_ORDER and TASK_PRIORITY_ORDER are
 * the runtime lists the tasks data module declares from TaskStatus /
 * TaskPriority, so a new member widens the dropdowns and this schema together.
 */

// ── Due date ──

/**
 * The due-date combobox holds either nothing or a resolved option: a preset
 * ("End of week") or a custom pick, each carrying the Date it stands for.
 * `z.date()` rejects an Invalid Date, so a value that failed to parse can never
 * reach the payload, where it would format as "Invalid Date".
 */
const dueDateOptionSchema = z.object({
  type: z.enum(["preset", "custom"]),
  id: z.string().min(1),
  label: z.string(),
  date: z.date(),
})

// A union rather than .nullable() so the message lands on the field itself
// instead of on `dueDate.date`, which no control is labelled by.
export const dueDateSchema = z.union([z.null(), dueDateOptionSchema], {
  error: "Choose a valid due date.",
})

export type DueDateFormValue = z.infer<typeof dueDateSchema>

/**
 * A stored `dueAt` ("2026-08-12") back into the picker's value. Read at local
 * midnight so the pill shows the day that was saved whatever the timezone. A
 * value that does not parse resolves to no due date rather than an Invalid
 * Date, so a bad record opens as empty instead of blocking the sheet on a field
 * the user never touched.
 */
export function dueDateFromIso(dueAt: string): DueDateFormValue {
  if (!dueAt) return null
  const date = new Date(`${dueAt}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return {
    type: "custom",
    id: "custom-date",
    label: format(date, "MMM d"),
    date,
  }
}

// ── Schema ──

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter a task name." })
    .max(120, { error: "Use 120 characters or fewer." }),
  description: z
    .string()
    .trim()
    .max(500, { error: "Use 500 characters or fewer." }),
  status: z.enum(TASK_STATUS_ORDER, { error: "Choose a status." }),
  priority: z.enum(TASK_PRIORITY_ORDER, { error: "Choose a priority." }),
  // "unassigned" is a real option here, so the only failure is an empty value:
  // the assignee ids themselves are seed data, not a union.
  assigneeId: z.string().trim().min(1, { error: "Choose an assignee." }),
  project: z.string().trim().min(1, { error: "Choose a project." }),
  dueDate: dueDateSchema,
})

export type TaskFormInput = z.infer<typeof taskSchema>

// ── Defaults ──

export const UNASSIGNED_ID = "unassigned"

/** The project a task falls back to when the board offers no project list. */
export const FALLBACK_PROJECT = "General"

/**
 * The values the sheet opens with. `fallbackProject` is the first project the
 * page offers, since a create has to start somewhere and the project field is
 * required.
 */
export function taskDefaultValues(
  source: ITask | null,
  fallbackProject: string
): TaskFormInput {
  if (!source) {
    return {
      title: "",
      description: "",
      status: TASK_STATUS_ORDER[1],
      priority: TASK_PRIORITY_ORDER[2],
      assigneeId: UNASSIGNED_ID,
      project: fallbackProject || FALLBACK_PROJECT,
      dueDate: null,
    }
  }

  return {
    title: source.title,
    description: source.description ?? "",
    status: source.status,
    priority: source.priority,
    assigneeId: source.assignee?.id ?? UNASSIGNED_ID,
    project: source.project || fallbackProject || FALLBACK_PROJECT,
    dueDate: dueDateFromIso(source.dueAt),
  }
}
