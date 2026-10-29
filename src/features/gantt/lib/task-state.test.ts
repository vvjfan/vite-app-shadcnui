import { describe, expect, it } from "vitest"

import type { GanttResource } from "@/components/reui/gantt/gantt-types"
import {
  buildDemoBars,
  buildTaskMeta,
  DEMO_PEOPLE,
  DEMO_TASKS,
} from "@/features/gantt/components/data"
import type {
  DemoBar,
  DemoPriority,
  DemoStatus,
} from "@/features/gantt/components/data"
import {
  addBar,
  addMeta,
  dayStart,
  dueOf,
  findLockedConflict,
  findLockedInSubtree,
  isAssigned,
  latestBarByTask,
  removeBar,
  removeBarsForTasks,
  removeMeta,
  rollupProgress,
  setMetaFields,
  setMetaPriority,
  setMetaStatus,
  toggleMetaAssignee,
  touchMeta,
  updateBar,
} from "@/features/gantt/lib/task-state"
import type { TaskMetaMap } from "@/features/gantt/lib/task-state"
import { findSubtreeIds } from "@/features/gantt/lib/task-tree"

/** The demo's own deterministic anchor, so seed bars and metadata line up. */
const ANCHOR = new Date("2026-07-19T12:00:00")
const SEED_BARS = buildDemoBars(ANCHOR)
const SEED_META = buildTaskMeta(ANCHOR)

const DAY = 24 * 60 * 60 * 1000
const day = (offset: number) =>
  new Date(dayStart(ANCHOR).getTime() + offset * DAY)

function bar(
  id: string,
  resourceId: string,
  startOffset: number,
  days: number,
  extra: Partial<DemoBar> = {}
): DemoBar {
  return {
    id,
    title: id,
    start: day(startOffset),
    end: day(startOffset + days),
    allDay: true,
    resourceId,
    ...extra,
  }
}

const ids = (bars: DemoBar[]) => bars.map((entry) => entry.id)

function meta(overrides: Partial<TaskMetaMap> = {}): TaskMetaMap {
  return {
    "task-1": {
      status: "todo",
      priority: "normal",
      assignees: ["Mira Stone"],
      updated: day(-3),
    },
    "task-2": {
      status: "progress",
      priority: "high",
      updated: day(-1),
    },
    ...overrides,
  }
}

describe("dayStart", () => {
  it("drops the time of day", () => {
    const start = dayStart(new Date("2026-07-19T23:59:59.999"))
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
    expect(start.getMilliseconds()).toBe(0)
    expect(start.getDate()).toBe(19)
  })

  // The caller passes state dates straight in, so a shared Date must not be
  // rewound in place.
  it("returns a copy rather than editing the argument", () => {
    const source = new Date("2026-07-19T12:00:00")
    expect(dayStart(source)).not.toBe(source)
    expect(source.getHours()).toBe(12)
  })
})

describe("dueOf", () => {
  // Bar ends are exclusive midnights, so the day a user calls "due" is the one
  // before the end instant.
  it("turns an exclusive midnight end into the inclusive due day", () => {
    expect(dueOf(new Date("2026-07-20T00:00:00")).getDate()).toBe(19)
  })

  it("leaves a same-day end on that day", () => {
    expect(dueOf(new Date("2026-07-19T09:30:00")).getDate()).toBe(19)
  })
})

describe("findLockedConflict", () => {
  const locked = bar("bar-locked", "r1", 0, 4, { readOnly: true })
  const open = bar("bar-open", "r1", 6, 2)
  const bars = [locked, open]

  it("returns the locked bar an overlapping range would hit", () => {
    expect(findLockedConflict(bars, day(2), day(6), undefined, "r1")).toBe(
      locked
    )
  })

  it("ignores bars on other rows", () => {
    expect(
      findLockedConflict(bars, day(0), day(4), undefined, "r2")
    ).toBeUndefined()
  })

  // A brand-new row cannot conflict with anything.
  it("returns nothing when no row is named", () => {
    expect(findLockedConflict(bars, day(0), day(4))).toBeUndefined()
  })

  it("does not report a bar against itself", () => {
    expect(
      findLockedConflict(bars, day(0), day(4), "bar-locked", "r1")
    ).toBeUndefined()
  })

  // Ranges are half-open, so a bar that starts exactly where the locked one
  // ends is legal and must schedule without complaint.
  it("allows a range that only touches the locked bar's edges", () => {
    expect(
      findLockedConflict(bars, day(4), day(6), undefined, "r1")
    ).toBeUndefined()
    expect(
      findLockedConflict(bars, day(-2), day(0), undefined, "r1")
    ).toBeUndefined()
  })

  it("ignores unlocked overlaps", () => {
    expect(
      findLockedConflict(bars, day(6), day(8), undefined, "r1")
    ).toBeUndefined()
  })

  it("finds the seed's locked release gate", () => {
    const hit = findLockedConflict(
      SEED_BARS,
      day(1),
      day(4),
      undefined,
      "perf-audit"
    )
    expect(hit?.id).toBe("bar-perf-audit")
    expect(hit?.readOnly).toBe(true)
  })
})

describe("findLockedInSubtree", () => {
  it("reports a locked bar sitting anywhere in the doomed subtree", () => {
    const bars = [bar("bar-a", "child", 0, 2, { readOnly: true })]
    expect(findLockedInSubtree(bars, ["parent", "child"])?.id).toBe("bar-a")
  })

  it("returns nothing when the subtree holds no locked bar", () => {
    const bars = [bar("bar-a", "child", 0, 2)]
    expect(findLockedInSubtree(bars, ["parent", "child"])).toBeUndefined()
  })

  it("ignores locked bars outside the subtree", () => {
    const bars = [bar("bar-a", "other", 0, 2, { readOnly: true })]
    expect(findLockedInSubtree(bars, ["parent"])).toBeUndefined()
  })

  // Deleting the "Release 2.4" list would take the locked perf-audit bar with
  // it, which is exactly what the delete guard refuses.
  it("blocks deleting the seed list that holds the locked bar", () => {
    const subtree = findSubtreeIds(DEMO_TASKS, "release-24")
    expect(findLockedInSubtree(SEED_BARS, subtree)?.id).toBe("bar-perf-audit")
  })

  // BUG (pinned, not fixed): the bar right-click menu's "Delete Task" guards on
  // the clicked bar's own readOnly flag only, and never consults this helper. A
  // parent whose SUBTASK carries the locked bar therefore deletes fine from the
  // bar menu while the identical action in the row-actions menu is refused.
  it("catches a locked descendant that the clicked bar's own flag misses", () => {
    const parentBar = bar("bar-parent", "parent", 0, 2)
    const bars = [
      parentBar,
      bar("bar-child", "child", 2, 2, { readOnly: true }),
    ]
    expect(parentBar.readOnly).toBeUndefined()
    expect(findLockedInSubtree(bars, ["parent", "child"])?.id).toBe("bar-child")
  })
})

describe("latestBarByTask", () => {
  it("keeps the latest-ending bar per task", () => {
    const early = bar("bar-1", "r1", 0, 2)
    const late = bar("bar-2", "r1", 5, 2)
    expect(latestBarByTask([early, late]).get("r1")).toBe(late)
    expect(latestBarByTask([late, early]).get("r1")).toBe(late)
  })

  it("keeps the first bar when two end at the same instant", () => {
    const first = bar("bar-1", "r1", 0, 2)
    const second = bar("bar-2", "r1", 0, 2)
    expect(latestBarByTask([first, second]).get("r1")).toBe(first)
  })

  it("skips bars that belong to no row", () => {
    const orphan = { ...bar("bar-1", "r1", 0, 2), resourceId: undefined }
    expect(latestBarByTask([orphan]).size).toBe(0)
  })

  it("indexes every seed bar by its task", () => {
    const map = latestBarByTask(SEED_BARS)
    expect(map.size).toBe(SEED_BARS.length)
    expect(map.get("perf-audit")?.id).toBe("bar-perf-audit")
  })
})

describe("rollupProgress", () => {
  const nodes: GanttResource[] = [
    {
      id: "list",
      title: "List",
      children: [
        { id: "a", title: "A" },
        { id: "b", title: "B" },
      ],
    },
  ]

  it("weights each bar's progress by its duration", () => {
    // 100% over 2 days and 0% over 2 days average to 50%.
    const bars = [
      bar("bar-a", "a", 0, 2, { progress: 100 }),
      bar("bar-b", "b", 0, 2, { progress: 0 }),
    ]
    expect(rollupProgress(nodes, bars).get("list")).toBe(50)
  })

  // Pinned: a bar with no progress figure still adds its duration to the total,
  // so unscheduled work drags the parent percentage down as if it were 0%.
  it("counts a bar with no progress as zero rather than skipping it", () => {
    const bars = [
      bar("bar-a", "a", 0, 2, { progress: 100 }),
      bar("bar-b", "b", 0, 6),
    ]
    expect(rollupProgress(nodes, bars).get("list")).toBe(25)
  })

  it("maps a parent with no measurable bar to null", () => {
    expect(rollupProgress(nodes, [bar("bar-a", "a", 0, 2)]).get("list")).toBe(
      null
    )
    expect(rollupProgress(nodes, []).get("list")).toBe(null)
  })

  it("gives leaves no entry at all, so only parents show a ring", () => {
    const map = rollupProgress(nodes, [bar("bar-a", "a", 0, 2)])
    expect(map.has("a")).toBe(false)
    expect(map.has("list")).toBe(true)
  })

  it("rolls a nested parent up on its own children only", () => {
    const deep: GanttResource[] = [
      {
        id: "list",
        title: "List",
        children: [
          {
            id: "parent",
            title: "Parent",
            children: [{ id: "child", title: "Child" }],
          },
          { id: "loner", title: "Loner" },
        ],
      },
    ]
    const bars = [
      bar("bar-child", "child", 0, 2, { progress: 100 }),
      bar("bar-loner", "loner", 0, 2, { progress: 0 }),
    ]
    const map = rollupProgress(deep, bars)
    expect(map.get("parent")).toBe(100)
    expect(map.get("list")).toBe(50)
  })

  it("excludes the parent's own bar from its rollup", () => {
    const bars = [
      bar("bar-list", "list", 0, 10, { progress: 0 }),
      bar("bar-a", "a", 0, 2, { progress: 100 }),
    ]
    expect(rollupProgress(nodes, bars).get("list")).toBe(100)
  })

  it("rounds to a whole percent on the real seed tree", () => {
    const map = rollupProgress(DEMO_TASKS, SEED_BARS)
    // iOS audit is 60% over 4 days; the Android audit has no figure over 5 days,
    // so the parent reads round(60 * 4 / 9) = 27.
    expect(map.get("mobile-crash")).toBe(27)
    expect(Number.isInteger(map.get("bug-tracking"))).toBe(true)
  })

  it("does not mutate the tree or the bars", () => {
    const bars = [bar("bar-a", "a", 0, 2, { progress: 40 })]
    const before = JSON.stringify({ nodes, bars })
    rollupProgress(nodes, bars)
    expect(JSON.stringify({ nodes, bars })).toBe(before)
  })
})

describe("bar writes", () => {
  const bars = [bar("bar-1", "r1", 0, 2), bar("bar-2", "r2", 3, 2)]

  it("addBar appends and returns a new array", () => {
    const next = addBar(bars, bar("bar-3", "r3", 6, 1))
    expect(ids(next)).toEqual(["bar-1", "bar-2", "bar-3"])
    expect(next).not.toBe(bars)
    expect(bars).toHaveLength(2)
  })

  it("updateBar rewrites only the target bar", () => {
    const next = updateBar(bars, "bar-2", {
      title: "Renamed",
      start: day(9),
      end: day(11),
      color: "var(--color-rose-500)",
    })
    expect(next[1].title).toBe("Renamed")
    expect(next[1].start).toEqual(day(9))
    expect(next[0]).toBe(bars[0])
  })

  it("updateBar keeps fields the dialog does not edit", () => {
    const locked = [bar("bar-1", "r1", 0, 2, { readOnly: true, progress: 30 })]
    const next = updateBar(locked, "bar-1", {
      title: "t",
      start: day(0),
      end: day(1),
      color: "red",
    })
    expect(next[0].progress).toBe(30)
    expect(next[0].readOnly).toBe(true)
    expect(next[0].resourceId).toBe("r1")
  })

  it("updateBar changes nothing for an unknown id", () => {
    const next = updateBar(bars, "nope", {
      title: "t",
      start: day(0),
      end: day(1),
      color: "red",
    })
    expect(next).toEqual(bars)
  })

  it("removeBar unschedules exactly one bar", () => {
    expect(ids(removeBar(bars, "bar-1"))).toEqual(["bar-2"])
    expect(ids(removeBar(bars, "nope"))).toEqual(["bar-1", "bar-2"])
    expect(bars).toHaveLength(2)
  })

  // Deleting a task must clear the whole subtree's schedule, or a deleted row's
  // bar would linger on the timeline with nothing to render in.
  it("removeBarsForTasks clears every bar in the subtree", () => {
    const subtree = [
      bar("bar-p", "parent", 0, 2),
      bar("bar-c", "child", 2, 2),
      bar("bar-x", "other", 4, 2),
    ]
    expect(ids(removeBarsForTasks(subtree, ["parent", "child"]))).toEqual([
      "bar-x",
    ])
  })

  it("removeBarsForTasks keeps bars that belong to no row", () => {
    const orphan = { ...bar("bar-o", "gone", 0, 2), resourceId: undefined }
    expect(ids(removeBarsForTasks([orphan], ["gone"]))).toEqual(["bar-o"])
  })

  it("removeBarsForTasks clears the seed subtree of a deleted list", () => {
    const subtree = findSubtreeIds(DEMO_TASKS, "bug-tracking")
    const next = removeBarsForTasks(SEED_BARS, subtree)
    expect(
      next.every((entry) => !subtree.includes(entry.resourceId ?? ""))
    ).toBe(true)
    expect(next.length).toBeLessThan(SEED_BARS.length)
    expect(SEED_BARS).toHaveLength(12)
  })
})

describe("task metadata writes", () => {
  it("touchMeta stamps the updated date and nothing else", () => {
    const source = meta()
    const next = touchMeta(source, "task-1", day(0))
    expect(next["task-1"].updated).toEqual(day(0))
    expect(next["task-1"].status).toBe("todo")
    expect(next["task-2"]).toBe(source["task-2"])
  })

  // Lists have no metadata row, so a write against one must be a no-op instead
  // of inventing an entry the columns would then try to render.
  it("touchMeta returns the same map for an unknown task", () => {
    const source = meta()
    expect(touchMeta(source, "list-a", day(0))).toBe(source)
  })

  it.each<DemoStatus>(["todo", "progress", "review", "done"])(
    "setMetaStatus writes %s",
    (status) => {
      const next = setMetaStatus(meta(), "task-1", status, day(0))
      expect(next["task-1"].status).toBe(status)
      expect(next["task-1"].updated).toEqual(day(0))
    }
  )

  it.each<DemoPriority>(["low", "normal", "high", "urgent"])(
    "setMetaPriority writes %s",
    (priority) => {
      const next = setMetaPriority(meta(), "task-1", priority, day(0))
      expect(next["task-1"].priority).toBe(priority)
      expect(next["task-1"].updated).toEqual(day(0))
    }
  )

  it("setMetaStatus and setMetaPriority ignore unknown tasks", () => {
    const source = meta()
    expect(setMetaStatus(source, "nope", "done", day(0))).toBe(source)
    expect(setMetaPriority(source, "nope", "urgent", day(0))).toBe(source)
  })

  it("field writes touch only the target record", () => {
    const source = meta()
    const next = setMetaStatus(source, "task-1", "done", day(0))
    expect(next["task-2"]).toEqual(source["task-2"])
    expect(source["task-1"].status).toBe("todo")
  })

  it("isAssigned reads the owner list, including the empty case", () => {
    expect(isAssigned(meta(), "task-1", "Mira Stone")).toBe(true)
    expect(isAssigned(meta(), "task-1", "Leo Grant")).toBe(false)
    expect(isAssigned(meta(), "task-2", "Mira Stone")).toBe(false)
    expect(isAssigned(meta(), "nope", "Mira Stone")).toBe(false)
  })

  it("toggleMetaAssignee adds an owner to the end of the list", () => {
    const next = toggleMetaAssignee(meta(), "task-1", "Leo Grant", day(0))
    expect(next["task-1"].assignees).toEqual(["Mira Stone", "Leo Grant"])
  })

  it("toggleMetaAssignee removes an owner that is already there", () => {
    const next = toggleMetaAssignee(meta(), "task-1", "Mira Stone", day(0))
    expect(next["task-1"].assignees).toEqual([])
  })

  // A record seeded without the optional assignees key must still accept one.
  it("toggleMetaAssignee starts a list on an unassigned task", () => {
    const next = toggleMetaAssignee(meta(), "task-2", "Nora Vale", day(0))
    expect(next["task-2"].assignees).toEqual(["Nora Vale"])
  })

  it("toggleMetaAssignee ignores an unknown task", () => {
    const source = meta()
    expect(toggleMetaAssignee(source, "nope", "Mira Stone", day(0))).toBe(
      source
    )
  })

  it("setMetaFields applies status, priority and owners together", () => {
    const next = setMetaFields(
      meta(),
      "task-1",
      { status: "review", priority: "urgent", assignees: ["Nora Vale"] },
      day(0)
    )
    expect(next["task-1"]).toEqual({
      status: "review",
      priority: "urgent",
      assignees: ["Nora Vale"],
      updated: day(0),
    })
  })

  it("setMetaFields ignores an unknown task", () => {
    const source = meta()
    expect(
      setMetaFields(
        source,
        "nope",
        { status: "done", priority: "low", assignees: [] },
        day(0)
      )
    ).toBe(source)
  })

  // Creating a task is the one write that must add a row that was not there.
  it("addMeta creates the record for a brand-new task", () => {
    const next = addMeta(
      meta(),
      "task-3",
      { status: "progress", priority: "low", assignees: [] },
      day(0)
    )
    expect(next["task-3"]).toEqual({
      status: "progress",
      priority: "low",
      assignees: [],
      updated: day(0),
    })
    expect(Object.keys(next)).toHaveLength(3)
  })

  it("addMeta does not disturb the other records", () => {
    const source = meta()
    const next = addMeta(
      source,
      "task-3",
      { status: "todo", priority: "low", assignees: [] },
      day(0)
    )
    expect(next["task-1"]).toBe(source["task-1"])
    expect(Object.keys(source)).toHaveLength(2)
  })

  it("removeMeta forgets every id in the deleted subtree", () => {
    const source = meta({
      "task-3": { status: "done", priority: "low", updated: day(0) },
    })
    const next = removeMeta(source, ["task-1", "task-3"])
    expect(Object.keys(next)).toEqual(["task-2"])
    expect(Object.keys(source)).toHaveLength(3)
  })

  it("removeMeta tolerates ids that carry no metadata, such as lists", () => {
    const source = meta()
    expect(Object.keys(removeMeta(source, ["list-a"]))).toEqual([
      "task-1",
      "task-2",
    ])
  })

  it("clears the seed metadata for a deleted subtree", () => {
    const subtree = findSubtreeIds(DEMO_TASKS, "mobile-crash")
    const next = removeMeta(SEED_META, subtree)
    for (const id of subtree) expect(next[id]).toBeUndefined()
    expect(SEED_META["crash-ios"]).toBeDefined()
  })

  it("every seed owner name is one of the demo people", () => {
    const roster = DEMO_PEOPLE.map((person) => person.name)
    for (const entry of Object.values(SEED_META)) {
      for (const name of entry.assignees ?? []) {
        expect(roster).toContain(name)
      }
    }
  })
})
