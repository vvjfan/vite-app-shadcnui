import type { SortingState } from "@tanstack/react-table"
import { describe, expect, it } from "vitest"

import { TASKS } from "@/features/tasks/components/data"
import type { ITask, TaskOrdering } from "@/features/tasks/components/data"
import {
  compareTasksBySorting,
  getOrderingFromSorting,
  getSortingState,
  paginateTasks,
  sortTasks,
} from "@/features/tasks/lib/sort-tasks"

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

const byPriorityDesc: SortingState = [{ id: "priority", desc: true }]
const byPriorityAsc: SortingState = [{ id: "priority", desc: false }]

describe("getSortingState", () => {
  it("maps every ordering option onto a real column id", () => {
    const expected: Record<TaskOrdering, string> = {
      status: "status",
      priority: "priority",
      "due-date": "dueDate",
      updated: "updated",
    }

    for (const [ordering, columnId] of Object.entries(expected)) {
      expect(getSortingState(ordering as TaskOrdering, "asc")).toEqual([
        { id: columnId, desc: false },
      ])
    }
  })

  it("carries the direction through", () => {
    expect(getSortingState("updated", "desc")).toEqual([
      { id: "updated", desc: true },
    ])
  })
})

describe("getOrderingFromSorting", () => {
  it("leaves the popover untouched when the table has no primary sort", () => {
    expect(getOrderingFromSorting([])).toBeNull()
  })

  it("maps every sortable column back to its ordering option", () => {
    expect(getOrderingFromSorting([{ id: "priority", desc: true }])).toEqual({
      ordering: "priority",
      orderDirection: "desc",
    })
    expect(getOrderingFromSorting([{ id: "status", desc: false }])).toEqual({
      ordering: "status",
      orderDirection: "asc",
    })
    expect(getOrderingFromSorting([{ id: "dueDate", desc: false }])).toEqual({
      ordering: "due-date",
      orderDirection: "asc",
    })
    expect(getOrderingFromSorting([{ id: "updated", desc: true }])).toEqual({
      ordering: "updated",
      orderDirection: "desc",
    })
  })

  // Sorting by a column with no ordering option (title, estimate) would leave a
  // stale label in the popover, so it resets to the queue default instead.
  it("falls back to the priority default for an unmapped column", () => {
    expect(getOrderingFromSorting([{ id: "title", desc: false }])).toEqual({
      ordering: "priority",
      orderDirection: "desc",
    })
  })

  it("round-trips with getSortingState", () => {
    for (const ordering of [
      "status",
      "priority",
      "due-date",
      "updated",
    ] as TaskOrdering[]) {
      expect(getOrderingFromSorting(getSortingState(ordering, "asc"))).toEqual({
        ordering,
        orderDirection: "asc",
      })
    }
  })
})

describe("compareTasksBySorting", () => {
  it("treats everything as equal when nothing is sorted", () => {
    const a = task({ id: "a", priorityValue: 4 })
    const b = task({ id: "b", priorityValue: 1 })

    expect(compareTasksBySorting(a, b, [], true)).toBe(0)
  })

  it("sorts by priority value by default", () => {
    const low = task({ taskKey: "T-1", priorityValue: 1 })
    const high = task({ taskKey: "T-2", priorityValue: 4 })

    expect(compareTasksBySorting(low, high, byPriorityAsc, false)).toBeLessThan(
      0
    )
    expect(
      compareTasksBySorting(low, high, byPriorityDesc, false)
    ).toBeGreaterThan(0)
  })

  it("sorts by status order, due date and updated timestamp", () => {
    const first = task({
      taskKey: "T-1",
      statusOrder: 0,
      dueAt: "2026-01-01",
      updatedAt: "2026-01-01T00:00:00Z",
    })
    const second = task({
      taskKey: "T-2",
      statusOrder: 5,
      dueAt: "2026-12-31",
      updatedAt: "2026-12-31T00:00:00Z",
    })

    for (const columnId of ["status", "dueDate", "updated"]) {
      expect(
        compareTasksBySorting(
          first,
          second,
          [{ id: columnId, desc: false }],
          false
        )
      ).toBeLessThan(0)
    }
  })

  // Anything the settings popover cannot produce still has to sort somehow, and
  // priority is the queue default.
  it("falls back to priority for an unknown column id", () => {
    const low = task({ taskKey: "T-1", priorityValue: 1 })
    const high = task({ taskKey: "T-2", priorityValue: 4 })

    expect(
      compareTasksBySorting(low, high, [{ id: "estimate", desc: false }], false)
    ).toBeLessThan(0)
  })

  // Without a tie-break the grid reshuffles equal rows on every re-render, which
  // reads as flicker.
  it("breaks ties on taskKey", () => {
    const a = task({ taskKey: "REUI-100" })
    const b = task({ taskKey: "REUI-200" })

    expect(compareTasksBySorting(a, b, byPriorityAsc, false)).toBeLessThan(0)
    expect(compareTasksBySorting(a, a, byPriorityAsc, false)).toBe(0)
  })

  it("orders two completed tasks by recency when the switch is on", () => {
    const older = task({
      taskKey: "T-1",
      status: "Done",
      priorityValue: 4,
      updatedAt: "2026-01-01T00:00:00Z",
    })
    const newer = task({
      taskKey: "T-2",
      status: "Cancelled",
      priorityValue: 1,
      updatedAt: "2026-02-01T00:00:00Z",
    })

    // Recency wins over the priority column for a completed pair.
    expect(
      compareTasksBySorting(older, newer, byPriorityAsc, true)
    ).toBeLessThan(0)
    // With the switch off the same pair falls back to priority, flipping them.
    expect(
      compareTasksBySorting(older, newer, byPriorityAsc, false)
    ).toBeGreaterThan(0)
  })

  it("only uses recency when both tasks are completed", () => {
    const done = task({
      taskKey: "T-1",
      status: "Done",
      priorityValue: 1,
      updatedAt: "2026-01-01T00:00:00Z",
    })
    const open = task({
      taskKey: "T-2",
      status: "Todo",
      priorityValue: 4,
      updatedAt: "2026-02-01T00:00:00Z",
    })

    expect(compareTasksBySorting(done, open, byPriorityAsc, true)).toBeLessThan(
      0
    )
  })

  // BUG (pinned, not fixed): mixing two comparison keys makes the comparator
  // inconsistent. Here A must come after C (priority), C after B (priority), and
  // B after A (recency), which is a cycle. Array.prototype.sort is only defined
  // for a consistent comparator, so the resulting order of a queue holding both
  // completed and open work is implementation-defined.
  it("is not transitive across completed and open tasks", () => {
    const a = task({
      taskKey: "T-A",
      status: "Done",
      priorityValue: 5,
      updatedAt: "2026-01-01T00:00:00Z",
    })
    const b = task({
      taskKey: "T-B",
      status: "Done",
      priorityValue: 1,
      updatedAt: "2026-01-02T00:00:00Z",
    })
    const c = task({ taskKey: "T-C", status: "Todo", priorityValue: 3 })

    expect(compareTasksBySorting(a, b, byPriorityAsc, true)).toBeLessThan(0)
    expect(compareTasksBySorting(b, c, byPriorityAsc, true)).toBeLessThan(0)
    // Transitivity would demand a < c here, but priority puts a last.
    expect(compareTasksBySorting(a, c, byPriorityAsc, true)).toBeGreaterThan(0)
  })
})

describe("sortTasks", () => {
  it("returns a new array and never mutates the input", () => {
    const rows = [
      task({ id: "1", taskKey: "T-1", priorityValue: 1 }),
      task({ id: "2", taskKey: "T-2", priorityValue: 4 }),
    ]
    const sorted = sortTasks(rows, byPriorityDesc, false)

    expect(sorted).not.toBe(rows)
    expect(rows.map((t) => t.id)).toEqual(["1", "2"])
    expect(sorted.map((t) => t.id)).toEqual(["2", "1"])
  })

  it("keeps the seed constant intact", () => {
    const before = TASKS.map((t) => t.taskKey)
    sortTasks(TASKS, byPriorityDesc, true)
    expect(TASKS.map((t) => t.taskKey)).toEqual(before)
  })

  it("puts the urgent seed tasks first for the default queue order", () => {
    const sorted = sortTasks(TASKS, byPriorityDesc, true)

    expect(sorted).toHaveLength(TASKS.length)
    // Urgent (4) first, then the taskKey tie-break, also reversed by desc.
    expect(sorted.slice(0, 3).map((t) => t.taskKey)).toEqual([
      "REUI-241",
      "REUI-227",
      "REUI-202",
    ])
  })

  it("returns an empty array for an empty queue", () => {
    expect(sortTasks([], byPriorityDesc, true)).toEqual([])
  })
})

describe("paginateTasks", () => {
  const rows = Array.from({ length: 12 }, (_, index) =>
    task({ id: String(index), taskKey: `T-${index}` })
  )

  it("slices the requested page", () => {
    expect(paginateTasks(rows, 0, 5).map((t) => t.id)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ])
    expect(paginateTasks(rows, 1, 5).map((t) => t.id)).toEqual([
      "5",
      "6",
      "7",
      "8",
      "9",
    ])
  })

  it("returns a short final page rather than padding it", () => {
    expect(paginateTasks(rows, 2, 5)).toHaveLength(2)
  })

  // Filtering can shrink the queue while the user sits on a later page, and an
  // out-of-range slice must be empty rather than throw.
  it("returns nothing for a page past the end", () => {
    expect(paginateTasks(rows, 9, 5)).toEqual([])
  })

  it("returns a new array and never mutates the input", () => {
    const page = paginateTasks(rows, 0, 12)

    expect(page).not.toBe(rows)
    expect(rows).toHaveLength(12)
  })
})
