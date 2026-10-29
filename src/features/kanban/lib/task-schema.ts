import { format, parse, startOfDay } from "date-fns"
import { z } from "zod"

import {
  TASK_PRIORITY_BADGES,
  TASK_STATUS_ORDER,
} from "@/lib/data/planner/types"
import type { Task, TaskPriority } from "@/lib/data/planner/types"

/**
 * Client-side validation for the kanban task sheet.
 *
 * Neither union is retyped here: the status list is TASK_STATUS_ORDER and the
 * priority list is read off TASK_PRIORITY_BADGES, both from the planner data
 * module, so a new TaskStatus or TaskPriority widens the dropdowns and this
 * schema together (the test asserts both lists stay exhaustive).
 */

/** Exhaustive over TaskPriority, weakest first - the order the pills read in. */
export const TASK_PRIORITY_VALUES = Object.keys(
  TASK_PRIORITY_BADGES
) as TaskPriority[]

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
 * A stored card date ("Aug 12") back into the picker's value. A label that does
 * not parse resolves to no due date rather than an Invalid Date, so a bad
 * record opens as empty instead of blocking the sheet on a field the user never
 * touched. `today` supplies the year the label omits.
 */
export function dueDateFromLabel(
  dueDate: string,
  today: Date = startOfDay(new Date())
): DueDateFormValue {
  if (!dueDate) return null
  const parsed = parse(dueDate, "MMM d", today)
  if (Number.isNaN(parsed.getTime())) return null
  return {
    type: "custom",
    id: "custom-date",
    label: format(parsed, "MMM d"),
    date: parsed,
  }
}

// ── Schema ──

export const boardTaskSchema = z.object({
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
  priority: z.enum(TASK_PRIORITY_VALUES, { error: "Choose a priority." }),
  // "" is the unassigned option; the ids themselves come from the team prop, so
  // they are not a union this module can constrain.
  assigneeId: z.string(),
  dueDate: dueDateSchema,
})

export type BoardTaskFormInput = z.infer<typeof boardTaskSchema>

// ── Defaults ──

/** Blank create defaults: a Todo card, medium priority, nobody, no due date. */
export const BOARD_TASK_CREATE_DEFAULTS: BoardTaskFormInput = {
  title: "",
  description: "",
  status: TASK_STATUS_ORDER[1],
  priority: TASK_PRIORITY_VALUES[1],
  assigneeId: "",
  dueDate: null,
}

/** The values the sheet opens with: an existing card's, or the create blanks. */
export function boardTaskDefaultValues(
  source: Task | null,
  today?: Date
): BoardTaskFormInput {
  if (!source) return { ...BOARD_TASK_CREATE_DEFAULTS }
  return {
    title: source.title,
    description: source.description,
    status: source.status,
    priority: source.priority,
    assigneeId: source.assigneeId,
    dueDate: dueDateFromLabel(source.dueDate, today),
  }
}
