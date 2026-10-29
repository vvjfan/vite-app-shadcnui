/**
 * "1 subtask" / "2 subtasks" for the counted copy the task queue renders. Only
 * exactly one reads as singular, so an emptied count still says "0 subtasks".
 */
export function pluralize(count: number, noun = "subtask"): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`
}
