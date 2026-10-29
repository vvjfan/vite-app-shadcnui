import { describe, expect, it } from "vitest"

import { TASKS } from "@/features/tasks/components/data"
import type { ISubIssue, ITask } from "@/features/tasks/components/data"
import {
  buildSubIssueRows,
  buildTaskRows,
  getDefaultExpandedTaskIds,
  toggleExpandedTaskId,
} from "@/features/tasks/lib/task-rows"

function subIssue(id: string, title = `Sub ${id}`): ISubIssue {
  return {
    id,
    title,
    status: "Todo",
    priority: "Medium",
    assignee: null,
    dueAt: "2026-04-01",
    dueDateLabel: "Apr 1",
  }
}

function task(overrides: Partial<ITask> = {}): ITask {
  return {
    id: "t1",
    taskKey: "TEST-1",
    title: "Ship the queue",
    project: "Task Delivery",
    type: "Feature",
    status: "Todo",
    statusOrder: 1,
    priority: "High",
    priorityValue: 3,
    assignee: null,
    dueAt: "2026-04-01",
    dueDateLabel: "Apr 1",
    updatedAt: "2026-03-01T10:00:00Z",
    updatedLabel: "1d ago",
    estimate: "3 pts",
    subtasksCompleted: 0,
    subtasksTotal: 0,
    ...overrides,
  }
}

const parent = task({ id: "p", subIssues: [subIssue("p-1"), subIssue("p-2")] })
const childless = task({ id: "c" })

describe("buildSubIssueRows", () => {
  it("wraps each sub-issue and keeps a link back to its parent", () => {
    const rows = buildSubIssueRows(parent)

    expect(rows.map((row) => row.id)).toEqual(["p-1", "p-2"])
    expect(rows.every((row) => row.kind === "subIssue")).toBe(true)
    expect(rows[0].task).toBe(parent)
  })

  it("returns an empty list when the task has no sub-issues", () => {
    expect(buildSubIssueRows(childless)).toEqual([])
  })
})

describe("buildTaskRows", () => {
  it("emits one row per task when sub-tasks are off", () => {
    const rows = buildTaskRows([parent, childless], false, { p: true })

    expect(rows.map((row) => row.id)).toEqual(["p", "c"])
    // No subRows means the disclosure chevron cannot render at all.
    expect(rows.every((row) => row.kind === "task" && !row.subRows)).toBe(true)
  })

  it("attaches sub-rows without flattening them while collapsed", () => {
    const rows = buildTaskRows([parent, childless], true)

    expect(rows.map((row) => row.id)).toEqual(["p", "c"])
    expect(rows[0].kind === "task" && rows[0].subRows).toHaveLength(2)
  })

  it("flattens the sub-rows of an expanded task in order", () => {
    const rows = buildTaskRows([parent, childless], true, { p: true })

    expect(rows.map((row) => row.id)).toEqual(["p", "p-1", "p-2", "c"])
    expect(rows.map((row) => row.kind)).toEqual([
      "task",
      "subIssue",
      "subIssue",
      "task",
    ])
  })

  it("ignores an expanded id for a task that has nothing to show", () => {
    expect(
      buildTaskRows([childless], true, { c: true }).map((r) => r.id)
    ).toEqual(["c"])
  })

  it("defaults to everything collapsed", () => {
    expect(buildTaskRows([parent], true)).toHaveLength(1)
  })

  it("returns a new array and never mutates its inputs", () => {
    const tasks = [parent]
    const expanded = { p: true }
    const rows = buildTaskRows(tasks, true, expanded)

    expect(rows).not.toBe(tasks)
    expect(tasks).toHaveLength(1)
    expect(expanded).toEqual({ p: true })
  })

  it("keeps the seed data countable and untouched", () => {
    const before = TASKS.map((t) => t.id)
    const collapsed = buildTaskRows(TASKS, true)

    expect(collapsed).toHaveLength(TASKS.length)
    expect(TASKS.map((t) => t.id)).toEqual(before)
  })

  it("adds exactly the sub-issues of the tasks that are expanded", () => {
    const allExpanded = Object.fromEntries(TASKS.map((t) => [t.id, true]))
    const subIssueCount = TASKS.reduce(
      (total, t) => total + (t.subIssues?.length ?? 0),
      0
    )

    expect(subIssueCount).toBeGreaterThan(0)
    expect(buildTaskRows(TASKS, true, allExpanded)).toHaveLength(
      TASKS.length + subIssueCount
    )
  })

  // getRowId reads this id, so a collision between a task and a sub-issue would
  // make TanStack render the wrong row.
  it("gives every row a unique id on the real seed data", () => {
    const allExpanded = Object.fromEntries(TASKS.map((t) => [t.id, true]))
    const ids = buildTaskRows(TASKS, true, allExpanded).map((row) => row.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("getDefaultExpandedTaskIds", () => {
  it("opens the first task that has sub-issues", () => {
    const rows = buildTaskRows([childless, parent], true)
    expect(getDefaultExpandedTaskIds(rows)).toEqual({ p: true })
  })

  it("opens nothing when no row can expand", () => {
    expect(getDefaultExpandedTaskIds(buildTaskRows([childless], true))).toEqual(
      {}
    )
    expect(getDefaultExpandedTaskIds([])).toEqual({})
  })

  // Sub-tasks off means buildTaskRows drops subRows entirely, so nothing is
  // expandable and the default must stay empty.
  it("opens nothing when sub-tasks are disabled", () => {
    expect(getDefaultExpandedTaskIds(buildTaskRows([parent], false))).toEqual(
      {}
    )
  })

  it("opens the first expandable seed task", () => {
    const firstWithSubIssues = TASKS.find((t) => t.subIssues?.length)

    expect(firstWithSubIssues).toBeDefined()
    expect(getDefaultExpandedTaskIds(buildTaskRows(TASKS, true))).toEqual({
      [firstWithSubIssues!.id]: true,
    })
  })
})

describe("toggleExpandedTaskId", () => {
  it("opens a collapsed task", () => {
    expect(toggleExpandedTaskId({}, "p")).toEqual({ p: true })
  })

  // Collapsing deletes the key rather than storing false, so the map always
  // describes exactly what is open.
  it("removes the key instead of storing false", () => {
    const next = toggleExpandedTaskId({ p: true }, "p")

    expect(next).toEqual({})
    expect("p" in next).toBe(false)
  })

  it("leaves the other entries alone", () => {
    expect(toggleExpandedTaskId({ a: true, b: true }, "a")).toEqual({ b: true })
  })

  it("returns a new object and never mutates the input", () => {
    const current = { p: true }

    expect(toggleExpandedTaskId(current, "p")).not.toBe(current)
    expect(toggleExpandedTaskId(current, "other")).not.toBe(current)
    expect(current).toEqual({ p: true })
  })
})
