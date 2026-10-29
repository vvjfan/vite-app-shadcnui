import { describe, expect, it } from "vitest"

import type { GanttResource } from "@/components/reui/gantt/gantt-types"
import { buildTaskMeta, DEMO_TASKS } from "@/features/gantt/components/data"
import type { DemoTaskMeta } from "@/features/gantt/components/data"
import {
  appendList,
  appendTaskToList,
  filterTasksByAssignee,
  findSubtreeIds,
  findTaskTitle,
  removeTask,
  renameTask,
  subtreeIds,
  UNASSIGNED,
} from "@/features/gantt/lib/task-tree"

/** The demo's own deterministic anchor, so the seed metadata matches the app. */
const ANCHOR = new Date("2026-07-19T12:00:00")
const SEED_META = buildTaskMeta(ANCHOR)

/** Small tree: one list, one leaf, one parent with two children. */
function tree(): GanttResource[] {
  return [
    {
      id: "list-a",
      title: "List A",
      children: [
        { id: "leaf", title: "Leaf" },
        {
          id: "parent",
          title: "Parent",
          children: [
            { id: "child-1", title: "Child 1" },
            { id: "child-2", title: "Child 2" },
          ],
        },
      ],
    },
    {
      id: "list-b",
      title: "List B",
      children: [{ id: "solo", title: "Solo" }],
    },
  ]
}

const titles = (nodes: GanttResource[]) => nodes.map((node) => node.title)
const idsOf = (nodes: GanttResource[]) => nodes.map((node) => node.id)

describe("subtreeIds", () => {
  it("returns just the node for a leaf", () => {
    expect(subtreeIds({ id: "leaf", title: "Leaf" })).toEqual(["leaf"])
  })

  it("returns the node first, then every descendant", () => {
    expect(subtreeIds(tree()[0])).toEqual([
      "list-a",
      "leaf",
      "parent",
      "child-1",
      "child-2",
    ])
  })

  it("walks the real seed tree to full depth", () => {
    // bug-tracking holds 7 tasks, one of which ("mobile-crash") has 2 subtasks.
    expect(subtreeIds(DEMO_TASKS[0])).toHaveLength(10)
    expect(subtreeIds(DEMO_TASKS[0])).toContain("crash-android")
  })
})

describe("findSubtreeIds", () => {
  it("finds a node nested two levels down", () => {
    expect(findSubtreeIds(tree(), "parent")).toEqual([
      "parent",
      "child-1",
      "child-2",
    ])
  })

  // An empty result is how every caller decides there is nothing to delete, so
  // an unknown id must not resolve to a partial subtree.
  it("returns nothing for an unknown id", () => {
    expect(findSubtreeIds(tree(), "nope")).toEqual([])
  })

  it("resolves the real seed subtask group", () => {
    expect(findSubtreeIds(DEMO_TASKS, "mobile-crash")).toEqual([
      "mobile-crash",
      "crash-ios",
      "crash-android",
    ])
  })
})

describe("findTaskTitle", () => {
  it("finds titles at every depth", () => {
    expect(findTaskTitle(tree(), "list-a")).toBe("List A")
    expect(findTaskTitle(tree(), "leaf")).toBe("Leaf")
    expect(findTaskTitle(tree(), "child-2")).toBe("Child 2")
  })

  it("returns undefined for an unknown id, so callers can fall back", () => {
    expect(findTaskTitle(tree(), "nope")).toBeUndefined()
  })

  it("reads the real seed titles", () => {
    expect(findTaskTitle(DEMO_TASKS, "release-24")).toBe("Release 2.4")
    expect(findTaskTitle(DEMO_TASKS, "crash-ios")).toBe("iOS audit")
  })
})

describe("renameTask", () => {
  it("renames a list", () => {
    expect(titles(renameTask(tree(), "list-a", "Renamed"))).toEqual([
      "Renamed",
      "List B",
    ])
  })

  it("renames a node nested two levels down", () => {
    const next = renameTask(tree(), "child-1", "Renamed")
    expect(findTaskTitle(next, "child-1")).toBe("Renamed")
    expect(findTaskTitle(next, "child-2")).toBe("Child 2")
  })

  it("leaves the tree alone for an unknown id", () => {
    expect(renameTask(tree(), "nope", "x")).toEqual(tree())
  })

  it("accepts an empty title, since the caller substitutes its own default", () => {
    expect(findTaskTitle(renameTask(tree(), "leaf", ""), "leaf")).toBe("")
  })

  // The seed is a module-level constant shared with every later render.
  it("never mutates the seed tree", () => {
    renameTask(DEMO_TASKS, "release-24", "Mutated")
    expect(DEMO_TASKS[1].title).toBe("Release 2.4")
  })
})

describe("removeTask", () => {
  it("removes a leaf and leaves its siblings", () => {
    const next = removeTask(tree(), "leaf")
    expect(idsOf(next[0].children ?? [])).toEqual(["parent"])
  })

  // Deleting a parent task takes its subtasks with it; the caller relies on this
  // matching findSubtreeIds so the bars and metadata are cleared in step.
  it("removes a parent together with its children", () => {
    const next = removeTask(tree(), "parent")
    expect(idsOf(next[0].children ?? [])).toEqual(["leaf"])
    expect(findTaskTitle(next, "child-1")).toBeUndefined()
  })

  // Deleting a list deletes every task it holds; nothing is re-parented.
  it("removes a list together with its tasks", () => {
    const next = removeTask(tree(), "list-a")
    expect(idsOf(next)).toEqual(["list-b"])
    expect(findTaskTitle(next, "leaf")).toBeUndefined()
    expect(findTaskTitle(next, "child-1")).toBeUndefined()
  })

  // There is no "cannot delete the last list" guard: the tree can empty out.
  it("allows every list to be removed", () => {
    let next = tree()
    for (const id of ["list-a", "list-b"]) next = removeTask(next, id)
    expect(next).toEqual([])
  })

  it("leaves the tree alone for an unknown id", () => {
    expect(removeTask(tree(), "nope")).toEqual(tree())
  })

  it("never mutates the seed tree", () => {
    const before = DEMO_TASKS[0].children?.length
    removeTask(DEMO_TASKS, "login-redirect")
    expect(DEMO_TASKS[0].children?.length).toBe(before)
  })
})

describe("appendList", () => {
  it("appends an empty list at the root", () => {
    const next = appendList(tree(), "list-c", "List C")
    expect(idsOf(next)).toEqual(["list-a", "list-b", "list-c"])
    expect(next[2].children).toEqual([])
  })

  it("returns a new array and leaves the source alone", () => {
    const source = tree()
    const next = appendList(source, "list-c", "List C")
    expect(next).not.toBe(source)
    expect(source).toHaveLength(2)
  })
})

describe("appendTaskToList", () => {
  it("appends the task to the end of the named list", () => {
    const next = appendTaskToList(tree(), "list-b", "new-task", "New task")
    expect(idsOf(next[1].children ?? [])).toEqual(["solo", "new-task"])
  })

  it("touches only the target list", () => {
    const next = appendTaskToList(tree(), "list-b", "new-task", "New task")
    expect(next[0]).toEqual(tree()[0])
  })

  // BUG (pinned, not fixed): only ROOT-level lists can receive a task, and an
  // unknown groupId is silently ignored here. The caller still writes the task's
  // metadata and bar, so a task created while its list is gone (the dialog falls
  // back to the hardcoded "bug-tracking" id when every list has been deleted)
  // leaves an orphan bar with no row to render in and no way to reach it.
  it("silently drops the task when the list id is unknown", () => {
    expect(appendTaskToList(tree(), "gone", "new-task", "New")).toEqual(tree())
  })

  it("refuses a nested parent as the destination", () => {
    expect(appendTaskToList(tree(), "parent", "new-task", "New")).toEqual(
      tree()
    )
  })

  it("never mutates the seed tree", () => {
    const before = DEMO_TASKS[1].children?.length
    appendTaskToList(DEMO_TASKS, "release-24", "new-task", "New")
    expect(DEMO_TASKS[1].children?.length).toBe(before)
  })
})

describe("filterTasksByAssignee", () => {
  const meta: Record<string, DemoTaskMeta> = {
    leaf: {
      status: "todo",
      priority: "normal",
      assignees: ["Mira Stone"],
      updated: ANCHOR,
    },
    parent: {
      status: "progress",
      priority: "high",
      assignees: ["Mira Stone", "Leo Grant"],
      updated: ANCHOR,
    },
    "child-1": {
      status: "todo",
      priority: "low",
      assignees: ["Leo Grant"],
      updated: ANCHOR,
    },
    // no assignees at all: only visible while Unassigned is shown
    "child-2": { status: "todo", priority: "low", updated: ANCHOR },
    solo: {
      status: "done",
      priority: "urgent",
      assignees: ["Nora Vale"],
      updated: ANCHOR,
    },
  }

  // The unfiltered case runs on every render, so it must not rebuild the tree.
  it("returns the very same tree when nothing is hidden", () => {
    const source = tree()
    expect(filterTasksByAssignee(source, meta, new Set())).toBe(source)
  })

  it("drops the rows of a hidden owner", () => {
    const next = filterTasksByAssignee(tree(), meta, new Set(["Nora Vale"]))
    expect(idsOf(next)).toEqual(["list-a"])
  })

  it("keeps a task while any one of its owners is shown", () => {
    const next = filterTasksByAssignee(tree(), meta, new Set(["Mira Stone"]))
    // parent is owned by Mira and Leo, so hiding Mira alone keeps it
    expect(findTaskTitle(next, "parent")).toBe("Parent")
    expect(findTaskTitle(next, "leaf")).toBeUndefined()
  })

  it("hides unassigned rows only under the Unassigned sentinel", () => {
    expect(
      findTaskTitle(
        filterTasksByAssignee(tree(), meta, new Set([UNASSIGNED])),
        "child-2"
      )
    ).toBeUndefined()
    expect(
      findTaskTitle(
        filterTasksByAssignee(tree(), meta, new Set(["Leo Grant"])),
        "child-2"
      )
    ).toBe("Child 2")
  })

  // A parent is itself a task: it survives on its own owner even once every one
  // of its children has been filtered away, and then renders with no children.
  it("keeps a matching parent whose children are all hidden", () => {
    const next = filterTasksByAssignee(
      tree(),
      meta,
      new Set(["Leo Grant", UNASSIGNED])
    )
    const parent = next[0].children?.find((node) => node.id === "parent")
    expect(parent).toBeDefined()
    expect(parent?.children).toEqual([])
  })

  // Lists carry no metadata of their own, so an empty list disappears entirely.
  it("drops a list once every task under it is hidden", () => {
    const next = filterTasksByAssignee(tree(), meta, new Set(["Nora Vale"]))
    expect(idsOf(next)).not.toContain("list-b")
  })

  it("returns an empty tree when every owner is hidden", () => {
    const everyone = new Set([
      "Mira Stone",
      "Leo Grant",
      "Nora Vale",
      "Theo Park",
      UNASSIGNED,
    ])
    expect(filterTasksByAssignee(tree(), meta, everyone)).toEqual([])
  })

  it("filters the real seed tree without mutating it", () => {
    const before = JSON.stringify(DEMO_TASKS)
    const next = filterTasksByAssignee(
      DEMO_TASKS,
      SEED_META,
      new Set(["Mira Stone"])
    )
    expect(JSON.stringify(DEMO_TASKS)).toBe(before)
    // "login-redirect" is co-owned by Leo Grant, so it survives hiding Mira
    expect(findTaskTitle(next, "login-redirect")).toBe("Login redirect")
    // "form-validation" is Mira's alone
    expect(findTaskTitle(next, "form-validation")).toBeUndefined()
  })

  it("keeps every unassigned seed row when only named owners are hidden", () => {
    const next = filterTasksByAssignee(
      DEMO_TASKS,
      SEED_META,
      new Set(["Mira Stone", "Leo Grant", "Nora Vale", "Theo Park"])
    )
    for (const [id, entry] of Object.entries(SEED_META)) {
      if ((entry.assignees ?? []).length === 0) {
        expect(findTaskTitle(next, id)).toBeDefined()
      }
    }
  })
})
