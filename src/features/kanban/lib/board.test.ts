import { afterEach, describe, expect, it, vi } from "vitest"

import { groupTasksByStatus } from "@/features/kanban/components/data"
import {
  containsTask,
  countTasks,
  createTask,
  findTask,
  findTaskStatus,
  insertTask,
  moveTask,
  newTaskId,
  removeTask,
  removeToast,
  stampColumnStatuses,
  submitTask,
  submitToast,
  updateTask,
} from "@/features/kanban/lib/board"
import type { BoardColumns } from "@/features/kanban/lib/board"
import { TASKS } from "@/lib/data/planner/seed/tasks"
import type { Task, TaskStatus } from "@/lib/data/planner/types"
import { TASK_STATUS_ORDER } from "@/lib/data/planner/types"

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    title: `Task ${id}`,
    description: "",
    status: "Todo",
    priority: "Medium",
    assigneeId: "U-1",
    projectId: "PRJ-1",
    dueDate: "Jul 12",
    tags: [],
    progress: 0,
    subtasks: [],
    ...overrides,
  }
}

/** Three-column board: Todo holds A and B, In Progress holds C, Done is empty. */
function board(): BoardColumns {
  return {
    Todo: [task("A"), task("B")],
    "In Progress": [task("C", { status: "In Progress" })],
    Done: [],
  }
}

const ids = (columns: BoardColumns, status: string) =>
  (columns[status] ?? []).map((item) => item.id)

describe("board reads", () => {
  it("counts every card across every column", () => {
    expect(countTasks(board())).toBe(3)
    expect(countTasks({})).toBe(0)
  })

  it("finds a card and its column wherever it sits", () => {
    expect(findTask(board(), "C")?.title).toBe("Task C")
    expect(findTaskStatus(board(), "C")).toBe("In Progress")
    expect(containsTask(board(), "C")).toBe(true)
  })

  it("reports nothing for an unknown id", () => {
    expect(findTask(board(), "nope")).toBeUndefined()
    expect(findTaskStatus(board(), "nope")).toBeUndefined()
    expect(containsTask(board(), "nope")).toBe(false)
  })

  // findTaskStatus walks TASK_STATUS_ORDER, so a card parked under a key that is
  // not one of the five statuses reads as "no column" rather than throwing.
  it("ignores columns outside the five planner statuses", () => {
    expect(findTaskStatus({ Archive: [task("Z")] }, "Z")).toBeUndefined()
    expect(containsTask({ Archive: [task("Z")] }, "Z")).toBe(true)
  })

  it("counts the whole real seed once grouped into columns", () => {
    const columns = groupTasksByStatus(TASKS)
    expect(countTasks(columns)).toBe(TASKS.length)
    for (const seeded of TASKS) {
      expect(findTaskStatus(columns, seeded.id)).toBe(seeded.status)
    }
  })
})

describe("stampColumnStatuses", () => {
  // The drag primitive hands back the moved card still carrying its old status,
  // so the chip on the card would contradict the column it now sits in.
  it("rewrites a card's status to the column it landed in", () => {
    const dropped: BoardColumns = {
      Todo: [],
      Done: [task("A", { status: "Todo" })],
    }
    expect(stampColumnStatuses(dropped).Done[0].status).toBe("Done")
  })

  it("keeps object identity for cards already in the right column", () => {
    const source = board()
    const stamped = stampColumnStatuses(source)
    expect(stamped.Todo[0]).toBe(source.Todo[0])
  })

  it("returns a new board and leaves the input alone", () => {
    const source: BoardColumns = { Done: [task("A", { status: "Todo" })] }
    const stamped = stampColumnStatuses(source)
    expect(stamped).not.toBe(source)
    expect(stamped.Done).not.toBe(source.Done)
    expect(source.Done[0].status).toBe("Todo")
  })

  it("handles every status in the union", () => {
    const scattered: BoardColumns = Object.fromEntries(
      TASK_STATUS_ORDER.map((status) => [
        status,
        [task(`card-${status}`, { status: "Backlog" })],
      ])
    )
    const stamped = stampColumnStatuses(scattered)
    for (const status of TASK_STATUS_ORDER) {
      expect(stamped[status][0].status).toBe(status)
    }
  })
})

describe("insertTask", () => {
  it("puts the card at the head by default", () => {
    expect(ids(insertTask(board(), "Todo", task("N")), "Todo")).toEqual([
      "N",
      "A",
      "B",
    ])
  })

  it("honours an explicit index", () => {
    expect(ids(insertTask(board(), "Todo", task("N"), 1), "Todo")).toEqual([
      "A",
      "N",
      "B",
    ])
  })

  // An index past the end must append rather than leave a hole in the array.
  it("clamps an out-of-range index to the ends", () => {
    expect(ids(insertTask(board(), "Todo", task("N"), 99), "Todo")).toEqual([
      "A",
      "B",
      "N",
    ])
    expect(ids(insertTask(board(), "Todo", task("N"), -5), "Todo")).toEqual([
      "N",
      "A",
      "B",
    ])
  })

  it("creates a column that does not exist yet", () => {
    expect(ids(insertTask({}, "Review", task("N")), "Review")).toEqual(["N"])
  })

  it("does not mutate the source board", () => {
    const source = board()
    insertTask(source, "Todo", task("N"))
    expect(ids(source, "Todo")).toEqual(["A", "B"])
  })
})

describe("createTask", () => {
  it("adds the card to the head of the column its status names", () => {
    const next = createTask(board(), task("N", { status: "In Progress" }))
    expect(ids(next, "In Progress")).toEqual(["N", "C"])
    expect(ids(next, "Todo")).toEqual(["A", "B"])
  })

  it("returns a new board and leaves the input alone", () => {
    const source = board()
    const next = createTask(source, task("N"))
    expect(next).not.toBe(source)
    expect(countTasks(source)).toBe(3)
  })
})

describe("updateTask", () => {
  it("replaces only the target record", () => {
    const next = updateTask(board(), task("B", { title: "Renamed" }))
    expect(next.Todo[1].title).toBe("Renamed")
    expect(next.Todo[0].title).toBe("Task A")
    expect(next["In Progress"][0].title).toBe("Task C")
  })

  it("keeps the card in place rather than moving it", () => {
    expect(ids(updateTask(board(), task("B", { title: "x" })), "Todo")).toEqual(
      ["A", "B"]
    )
  })

  it("changes nothing for an unknown id", () => {
    const next = updateTask(board(), task("nope"))
    expect(countTasks(next)).toBe(3)
    expect(ids(next, "Todo")).toEqual(["A", "B"])
  })

  it("does not mutate the source board", () => {
    const source = board()
    updateTask(source, task("B", { title: "Renamed" }))
    expect(source.Todo[1].title).toBe("Task B")
  })
})

describe("removeTask", () => {
  it("removes only the target card", () => {
    const next = removeTask(board(), "A")
    expect(ids(next, "Todo")).toEqual(["B"])
    expect(ids(next, "In Progress")).toEqual(["C"])
    expect(countTasks(next)).toBe(2)
  })

  it("keeps every column key, so an emptied column still renders", () => {
    const next = removeTask(board(), "C")
    expect(Object.keys(next)).toEqual(["Todo", "In Progress", "Done"])
    expect(next["In Progress"]).toEqual([])
  })

  it("changes nothing for an unknown id", () => {
    expect(countTasks(removeTask(board(), "nope"))).toBe(3)
  })

  // There is no "cannot delete the last card" guard: the board is allowed to
  // empty out completely and the header then reads "0 tasks".
  it("allows the board to be emptied entirely", () => {
    let next = board()
    for (const id of ["A", "B", "C"]) next = removeTask(next, id)
    expect(countTasks(next)).toBe(0)
    expect(Object.keys(next)).toHaveLength(3)
  })

  it("does not mutate the source board", () => {
    const source = board()
    removeTask(source, "A")
    expect(countTasks(source)).toBe(3)
  })
})

describe("moveTask", () => {
  it("removes the card from the source column and inserts it in the target", () => {
    const next = moveTask(board(), "A", "Done")
    expect(ids(next, "Todo")).toEqual(["B"])
    expect(ids(next, "Done")).toEqual(["A"])
    expect(countTasks(next)).toBe(3)
  })

  it("inserts at the requested index", () => {
    const crowded = insertTask(board(), "Done", task("D", { status: "Done" }))
    expect(ids(moveTask(crowded, "A", "Done", 1), "Done")).toEqual(["D", "A"])
    expect(ids(moveTask(crowded, "A", "Done", 0), "Done")).toEqual(["A", "D"])
  })

  it("re-stamps the moved card's status", () => {
    expect(findTask(moveTask(board(), "A", "Review"), "A")?.status).toBe(
      "Review"
    )
  })

  // Same-column drops are handled by the board primitive, so a move whose
  // destination is the source must not reshuffle the column.
  it("is a no-op when the destination is the source column", () => {
    const source = board()
    expect(moveTask(source, "A", "Todo")).toBe(source)
    expect(moveTask(source, "A", "Todo", 5)).toBe(source)
  })

  it("is a no-op for an unknown id", () => {
    const source = board()
    expect(moveTask(source, "nope", "Done")).toBe(source)
  })

  it("moves into every status in the union", () => {
    for (const status of TASK_STATUS_ORDER) {
      const next = moveTask(board(), "C", status)
      expect(findTaskStatus(next, "C")).toBe(status)
      expect(countTasks(next)).toBe(3)
    }
  })

  it("does not mutate the source board", () => {
    const source = board()
    moveTask(source, "A", "Done")
    expect(ids(source, "Todo")).toEqual(["A", "B"])
    expect(ids(source, "Done")).toEqual([])
  })
})

describe("submitTask", () => {
  it("creates a card the board has never seen", () => {
    const next = submitTask(board(), task("N", { status: "Done" }))
    expect(ids(next, "Done")).toEqual(["N"])
    expect(countTasks(next)).toBe(4)
  })

  it("updates in place when the status is unchanged", () => {
    const next = submitTask(board(), task("B", { title: "Edited" }))
    expect(ids(next, "Todo")).toEqual(["A", "B"])
    expect(findTask(next, "B")?.title).toBe("Edited")
    expect(countTasks(next)).toBe(3)
  })

  it("relocates to the head of the target column when the status changes", () => {
    const next = submitTask(
      board(),
      task("A", { status: "In Progress", title: "Edited" })
    )
    expect(ids(next, "Todo")).toEqual(["B"])
    expect(ids(next, "In Progress")).toEqual(["A", "C"])
    expect(findTask(next, "A")?.title).toBe("Edited")
    expect(countTasks(next)).toBe(3)
  })

  // The edited record itself must land on the board; a stale copy here would
  // silently drop the user's changes on a status change.
  it("keeps the submitted record's identity through a relocation", () => {
    const edited = task("A", { status: "Review" })
    expect(submitTask(board(), edited).Review[0]).toBe(edited)
  })

  it("never duplicates the card across columns", () => {
    const next = submitTask(board(), task("C", { status: "Backlog" }))
    expect(next["In Progress"]).toEqual([])
    expect(ids(next, "Backlog")).toEqual(["C"])
  })

  it("does not mutate the source board", () => {
    const source = board()
    submitTask(source, task("A", { status: "Done" }))
    expect(ids(source, "Todo")).toEqual(["A", "B"])
    expect(ids(source, "Done")).toEqual([])
  })

  it("never mutates the seed rows it was grouped from", () => {
    const columns = groupTasksByStatus(TASKS)
    const first = TASKS[0]
    submitTask(columns, { ...first, status: "Backlog", title: "Edited" })
    expect(TASKS[0].title).toBe(first.title)
    expect(TASKS[0].status).toBe(first.status)
  })
})

describe("newTaskId", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("uses the first four uuid characters, upper-cased", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "a1b2c3d4-0000-0000-0000-000000000000",
    })
    expect(newTaskId()).toBe("TASK-A1B2")
  })

  it("falls back to a timestamp tail when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {})
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1_700_000_009_876))
    expect(newTaskId()).toBe("TASK-9876")
    vi.useRealTimers()
  })

  it("always produces the TASK- prefix with a four character tail", () => {
    expect(newTaskId()).toMatch(/^TASK-[0-9A-F]{4}$/)
  })

  // BUG (pinned, not fixed): the id is only four hex characters, so it can land
  // on an id already in the seed. Every seeded id is TASK-1024..TASK-1047 and
  // those digits are all valid hex, so a uuid beginning "1024" produces a
  // duplicate id. submitTask then treats the "new" card as an edit of the seeded
  // one and the created task silently overwrites it instead of being added.
  it("can collide with a seeded id", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => "1024ffff-0000-0000-0000-000000000000",
    })
    const generated = newTaskId()
    expect(generated).toBe("TASK-1024")
    expect(TASKS.some((seeded) => seeded.id === generated)).toBe(true)

    const columns = groupTasksByStatus(TASKS)
    const before = countTasks(columns)
    const next = submitTask(columns, task(generated, { status: "Backlog" }))
    expect(countTasks(next)).toBe(before)
  })

  // BUG (pinned, not fixed): the fallback keeps only the last four digits of the
  // epoch millisecond count, which repeats every ten seconds, so two cards
  // created ten seconds apart get the same id.
  it("repeats the fallback id every ten seconds", () => {
    vi.stubGlobal("crypto", {})
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1_700_000_000_000))
    const first = newTaskId()
    vi.setSystemTime(new Date(1_700_000_010_000))
    expect(newTaskId()).toBe(first)
    vi.useRealTimers()
  })
})

describe("toast copy", () => {
  const card = task("TASK-9001", { title: "Ship the nav", status: "Review" })

  it("says where a created card landed", () => {
    expect(submitToast(card, false)).toEqual({
      title: "Task created",
      description: 'TASK-9001 "Ship the nav" was added to Review.',
    })
  })

  it("switches to update wording for an existing card", () => {
    expect(submitToast(card, true)).toEqual({
      title: "Task updated",
      description: 'TASK-9001 "Ship the nav" was updated.',
    })
  })

  it("names the card that was deleted", () => {
    expect(removeToast(card)).toEqual({
      title: "Task deleted",
      description: 'TASK-9001 "Ship the nav" was removed from the board.',
    })
  })

  it("produces non-empty copy for every real seed row", () => {
    for (const seeded of TASKS) {
      for (const existed of [true, false]) {
        const copy = submitToast(seeded, existed)
        expect(copy.title.length).toBeGreaterThan(0)
        expect(copy.description).toContain(seeded.id)
      }
      expect(removeToast(seeded).description).toContain(seeded.title)
    }
  })
})

describe("groupTasksByStatus", () => {
  it("seeds every status column so empty ones still render", () => {
    const columns = groupTasksByStatus([])
    expect(Object.keys(columns)).toEqual(TASK_STATUS_ORDER)
    for (const status of TASK_STATUS_ORDER) {
      expect(columns[status]).toEqual([])
    }
  })

  it("files each seed row under its own status", () => {
    const columns = groupTasksByStatus(TASKS)
    for (const status of TASK_STATUS_ORDER) {
      expect(columns[status].map((item) => item.id)).toEqual(
        TASKS.filter((item) => item.status === status).map((item) => item.id)
      )
    }
  })

  // The grouped board is the component's initial state and is written to on
  // every edit, so it must not alias the seed array.
  it("returns fresh arrays rather than aliasing the source", () => {
    const columns = groupTasksByStatus(TASKS)
    const status: TaskStatus = "Done"
    expect(columns[status]).not.toBe(TASKS)
    removeTask(columns, TASKS[0].id)
    expect(TASKS).toHaveLength(24)
  })
})
