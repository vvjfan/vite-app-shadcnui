import { describe, expect, it } from "vitest"

import { TASK_STATUS_ORDER, TASKS } from "@/features/tasks/components/data"
import type { ISubIssue, ITask } from "@/features/tasks/components/data"
import {
  DEMO_UPDATED_AT,
  deleteTask,
  moveTaskToReview,
  setSubIssueCompletion,
  setTaskCompletion,
  taskExists,
  upsertTask,
} from "@/features/tasks/lib/task-mutations"

function subIssue(overrides: Partial<ISubIssue> = {}): ISubIssue {
  return {
    id: "s1",
    title: "Sub one",
    status: "Todo",
    priority: "Medium",
    assignee: null,
    dueAt: "2026-04-01",
    dueDateLabel: "Apr 1",
    ...overrides,
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

const rows = [
  task({ id: "1", taskKey: "T-1" }),
  task({ id: "2", taskKey: "T-2", status: "In Progress", statusOrder: 2 }),
  task({ id: "3", taskKey: "T-3", status: "Cancelled", statusOrder: 5 }),
]

describe("setTaskCompletion", () => {
  it("marks a task done and stamps it as just updated", () => {
    const [updated] = setTaskCompletion(rows, "1", true)

    expect(updated.status).toBe("Done")
    expect(updated.statusOrder).toBe(TASK_STATUS_ORDER.indexOf("Done"))
    expect(updated.updatedAt).toBe(DEMO_UPDATED_AT)
    expect(updated.updatedLabel).toBe("Just now")
  })

  // Unchecking returns to Todo rather than the previous status, because the row
  // checkbox is a two-state control with nowhere to store the old value.
  it("sends an unchecked task back to Todo", () => {
    const [updated] = setTaskCompletion(
      setTaskCompletion(rows, "1", true),
      "1",
      false
    )

    expect(updated.status).toBe("Todo")
    expect(updated.statusOrder).toBe(TASK_STATUS_ORDER.indexOf("Todo"))
  })

  // Guard: ticking a cancelled task would silently resurrect abandoned work.
  it("refuses to complete a cancelled task", () => {
    const next = setTaskCompletion(rows, "3", true)

    expect(next[2]).toBe(rows[2])
    expect(next[2].status).toBe("Cancelled")
  })

  it("touches only the target record", () => {
    const next = setTaskCompletion(rows, "1", true)

    expect(next[1]).toBe(rows[1])
    expect(next[2]).toBe(rows[2])
  })

  it("does nothing for an unknown id", () => {
    const next = setTaskCompletion(rows, "nope", true)

    expect(next).toHaveLength(3)
    expect(next.every((t, index) => t === rows[index])).toBe(true)
  })

  it("returns a new array and never mutates the input", () => {
    const next = setTaskCompletion(rows, "1", true)

    expect(next).not.toBe(rows)
    expect(rows[0].status).toBe("Todo")
  })

  it("leaves the seed constant intact", () => {
    const before = TASKS.map((t) => t.status)
    setTaskCompletion(TASKS, TASKS[0].id, true)
    expect(TASKS.map((t) => t.status)).toEqual(before)
  })
})

describe("moveTaskToReview", () => {
  it("moves the target into review and stamps it", () => {
    const next = moveTaskToReview(rows, "2")

    expect(next[1].status).toBe("Review")
    expect(next[1].statusOrder).toBe(TASK_STATUS_ORDER.indexOf("Review"))
    expect(next[1].updatedAt).toBe(DEMO_UPDATED_AT)
    expect(next[0]).toBe(rows[0])
  })

  it("does nothing for an unknown id", () => {
    expect(moveTaskToReview(rows, "nope").every((t, i) => t === rows[i])).toBe(
      true
    )
  })

  // BUG (pinned, not fixed): unlike setTaskCompletion, this has no cancelled
  // guard, so the row menu can pull an abandoned task back into Review. The two
  // paths disagree about whether cancelled work is editable.
  it("reopens a cancelled task", () => {
    expect(moveTaskToReview(rows, "3")[2].status).toBe("Review")
  })

  it("returns a new array and leaves the seed constant intact", () => {
    const before = TASKS.map((t) => t.status)
    const next = moveTaskToReview(TASKS, TASKS[0].id)

    expect(next).not.toBe(TASKS)
    expect(TASKS.map((t) => t.status)).toEqual(before)
  })
})

describe("setSubIssueCompletion", () => {
  const withSubs = [
    task({
      id: "p",
      subIssues: [
        subIssue({ id: "s1" }),
        subIssue({ id: "s2", status: "Done" }),
        subIssue({ id: "s3", status: "Cancelled" }),
      ],
      subtasksCompleted: 1,
      subtasksTotal: 3,
    }),
    task({ id: "other" }),
  ]

  it("completes one sub-issue and recounts the parent badge", () => {
    const [parent] = setSubIssueCompletion(withSubs, "p", "s1", true)

    expect(parent.subIssues?.map((s) => s.status)).toEqual([
      "Done",
      "Done",
      "Cancelled",
    ])
    // The counter is derived, not incremented, so it cannot drift out of sync.
    expect(parent.subtasksCompleted).toBe(2)
    expect(parent.updatedAt).toBe(DEMO_UPDATED_AT)
  })

  it("uncompletes back to Todo and recounts down", () => {
    const [parent] = setSubIssueCompletion(withSubs, "p", "s2", false)

    expect(parent.subIssues?.[1].status).toBe("Todo")
    expect(parent.subtasksCompleted).toBe(0)
  })

  // Same guard as the parent row: a cancelled sub-issue stays cancelled.
  it("refuses to complete a cancelled sub-issue", () => {
    const [parent] = setSubIssueCompletion(withSubs, "p", "s3", true)

    expect(parent.subIssues?.[2].status).toBe("Cancelled")
    expect(parent.subtasksCompleted).toBe(1)
  })

  it("leaves other tasks and tasks without sub-issues alone", () => {
    const next = setSubIssueCompletion(withSubs, "p", "s1", true)
    expect(next[1]).toBe(withSubs[1])

    const untouched = setSubIssueCompletion(withSubs, "other", "s1", true)
    expect(untouched[1]).toBe(withSubs[1])
  })

  it("does nothing for an unknown task id", () => {
    expect(
      setSubIssueCompletion(withSubs, "nope", "s1", true).every(
        (t, i) => t === withSubs[i]
      )
    ).toBe(true)
  })

  // BUG (pinned, not fixed): an unknown sub-issue id still rebuilds the parent
  // and stamps it "Just now", so a stale id nudges the task to the top of the
  // Updated sort without changing anything.
  it("still stamps the parent for an unknown sub-issue id", () => {
    const [parent] = setSubIssueCompletion(withSubs, "p", "nope", true)

    expect(parent).not.toBe(withSubs[0])
    expect(parent.updatedAt).toBe(DEMO_UPDATED_AT)
    expect(parent.subIssues?.map((s) => s.status)).toEqual([
      "Todo",
      "Done",
      "Cancelled",
    ])
  })

  it("never mutates the input tasks or their sub-issues", () => {
    setSubIssueCompletion(withSubs, "p", "s1", true)

    expect(withSubs[0].subIssues?.[0].status).toBe("Todo")
    expect(withSubs[0].subtasksCompleted).toBe(1)
  })

  it("leaves the seed constant intact", () => {
    const seeded = TASKS.find((t) => t.subIssues?.length)
    expect(seeded).toBeDefined()

    const before = seeded!.subIssues!.map((s) => s.status)
    setSubIssueCompletion(TASKS, seeded!.id, seeded!.subIssues![0].id, true)

    expect(seeded!.subIssues!.map((s) => s.status)).toEqual(before)
  })
})

describe("taskExists", () => {
  it("tells a known id from an unknown one", () => {
    expect(taskExists(rows, "2")).toBe(true)
    expect(taskExists(rows, "nope")).toBe(false)
    expect(taskExists([], "1")).toBe(false)
  })

  it("recognises every seed id", () => {
    expect(TASKS.every((t) => taskExists(TASKS, t.id))).toBe(true)
  })
})

describe("upsertTask", () => {
  const created = task({ id: "new", taskKey: "T-NEW", title: "Brand new" })

  it("puts a new task on top of the queue where the user can see it", () => {
    const next = upsertTask(rows, created)

    expect(next.map((t) => t.id)).toEqual(["new", "1", "2", "3"])
    expect(next[0]).toBe(created)
  })

  it("replaces an existing task in place without reordering", () => {
    const edited = { ...rows[1], title: "Edited" }
    const next = upsertTask(rows, edited)

    expect(next.map((t) => t.id)).toEqual(["1", "2", "3"])
    expect(next[1].title).toBe("Edited")
  })

  it("touches only the target record", () => {
    const next = upsertTask(rows, { ...rows[1], title: "Edited" })

    expect(next[0]).toBe(rows[0])
    expect(next[2]).toBe(rows[2])
  })

  // Ids come from crypto.randomUUID in the task sheet, so a collision with a
  // seed id must update that row rather than create a duplicate key in the grid.
  it("updates rather than duplicates when an id collides with a seed id", () => {
    const collided = task({ id: TASKS[0].id, taskKey: "T-DUP", title: "Clash" })
    const next = upsertTask(TASKS, collided)

    expect(next).toHaveLength(TASKS.length)
    expect(next.filter((t) => t.id === TASKS[0].id)).toHaveLength(1)
    expect(next[0].title).toBe("Clash")
  })

  it("keeps every id unique after inserting into the seed data", () => {
    const ids = upsertTask(TASKS, created).map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(TASKS.length + 1)
  })

  it("returns a new array and never mutates the seed constant", () => {
    const before = TASKS.map((t) => t.id)
    const next = upsertTask(TASKS, created)

    expect(next).not.toBe(TASKS)
    expect(TASKS.map((t) => t.id)).toEqual(before)
  })

  it("seeds an empty queue", () => {
    expect(upsertTask([], created).map((t) => t.id)).toEqual(["new"])
  })
})

describe("deleteTask", () => {
  it("removes only the target", () => {
    expect(deleteTask(rows, "2").map((t) => t.id)).toEqual(["1", "3"])
  })

  it("leaves the queue alone for an unknown id", () => {
    const next = deleteTask(rows, "nope")

    expect(next.map((t) => t.id)).toEqual(["1", "2", "3"])
    expect(next).not.toBe(rows)
  })

  // There is deliberately no "cannot delete the last one" guard: the grid has an
  // empty state, and the confirm dialog is the only thing standing in the way.
  it("allows deleting the final task", () => {
    expect(deleteTask([rows[0]], "1")).toEqual([])
  })

  it("never mutates the seed constant", () => {
    const before = TASKS.map((t) => t.id)
    const next = deleteTask(TASKS, TASKS[0].id)

    expect(next).toHaveLength(TASKS.length - 1)
    expect(TASKS.map((t) => t.id)).toEqual(before)
  })

  it("removes exactly one seed record", () => {
    const target = TASKS[3]
    const next = deleteTask(TASKS, target.id)

    expect(next.some((t) => t.id === target.id)).toBe(false)
    expect(next.map((t) => t.id)).toEqual(
      TASKS.filter((t) => t.id !== target.id).map((t) => t.id)
    )
  })
})
