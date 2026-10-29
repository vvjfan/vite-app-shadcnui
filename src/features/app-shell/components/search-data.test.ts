import { describe, expect, it } from "vitest"

import {
  ASSIGNEES,
  TASKS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_ORDER,
} from "@/features/tasks/components/data"
import { NAV_MAIN, SAVED_VIEWS } from "./data"
import {
  DEFAULT_ITEMS,
  SEARCH_GROUP_ORDER,
  groupItems,
  searchItems,
} from "./search-data"
import type { SearchGroup, SearchItem } from "./search-data"

// groupItems takes its input as an argument, so it can be driven with fixtures.
// searchItems cannot: it closes over the module-level catalogue, so everything
// below it is asserted against the real NAV_MAIN, SAVED_VIEWS and TASKS seeds.
function item(
  id: string,
  group: SearchGroup,
  label = `Item ${id}`
): SearchItem {
  return { id, group, label, icon: null, to: "/home" }
}

const ids = (items: SearchItem[]) => items.map((entry) => entry.id)

// Every routed entry in NAV_MAIN, derived rather than hand-listed so that adding
// a route to the sidebar without it appearing in search fails these tests.
const routedNavParents = NAV_MAIN.filter((nav) => nav.to)
const routedNavChildren = NAV_MAIN.flatMap((nav) =>
  (nav.children ?? [])
    .filter((child) => child.to)
    .map((child) => ({ child, parent: nav }))
)

describe("DEFAULT_ITEMS", () => {
  it("is what an untouched palette shows: pages and saved views, no tasks", () => {
    expect(DEFAULT_ITEMS.map((entry) => entry.group)).not.toContain("Tasks")
    expect(DEFAULT_ITEMS).toHaveLength(
      routedNavParents.length + routedNavChildren.length + SAVED_VIEWS.length
    )
  })

  it("lists every routed nav parent as a Page item", () => {
    for (const nav of routedNavParents) {
      const entry = DEFAULT_ITEMS.find((page) => page.id === `page-${nav.id}`)
      expect(entry, `missing page item for nav ${nav.id}`).toBeDefined()
      expect(entry?.group).toBe("Pages")
      expect(entry?.label).toBe(nav.label)
      expect(entry?.to).toBe(nav.to)
      // A parent is its own destination, so there is no parent to name above it.
      expect(entry?.hint).toBeUndefined()
    }
  })

  it("lists every routed nav child as a Page item hinted with its section", () => {
    for (const { child, parent } of routedNavChildren) {
      const entry = DEFAULT_ITEMS.find((page) => page.id === `page-${child.id}`)
      expect(entry, `missing page item for nav child ${child.id}`).toBeDefined()
      expect(entry?.group).toBe("Pages")
      expect(entry?.label).toBe(child.label)
      expect(entry?.to).toBe(child.to)
      // "Board" and "Calendar" mean nothing on their own, so the row shows the
      // section they live under.
      expect(entry?.hint).toBe(parent.label)
    }
  })

  // BUG (pinned, not fixed): the Settings entry in NAV_MAIN opens a dialog and
  // therefore carries no `to`, so it is skipped when the page items are built.
  // A user who can plainly read "Settings" in the sidebar and reaches for the
  // palette instead is told there are no matches.
  it("omits nav entries that open a dialog rather than navigating", () => {
    const dialogOnly = NAV_MAIN.filter((nav) => !nav.to)
    expect(dialogOnly.map((nav) => nav.label)).toContain("Settings")
    for (const nav of dialogOnly) {
      expect(
        DEFAULT_ITEMS.find((page) => page.id === `page-${nav.id}`)
      ).toBeUndefined()
    }
    expect(searchItems("settings")).toEqual([])
  })

  it("lists every saved view with its count as the hint", () => {
    for (const view of SAVED_VIEWS) {
      const entry = DEFAULT_ITEMS.find((v) => v.id === `view-${view.id}`)
      expect(entry, `missing view item for ${view.id}`).toBeDefined()
      expect(entry?.group).toBe("Views")
      expect(entry?.label).toBe(view.name)
      expect(entry?.hint).toBe(`${view.count} tasks`)
      expect(entry?.to).toBe(view.to)
    }
  })

  // The ids become DOM ids and the aria-activedescendant value in the palette,
  // so a collision would point the screen reader at the wrong row. Task ids are
  // "1".."16" and page ids are slugs, so only the prefixes keep them apart.
  it("gives every item a unique id", () => {
    const catalogue = [
      ...DEFAULT_ITEMS,
      ...TASKS.flatMap((task) => searchItems(task.taskKey, 1000)),
    ]
    const unique = new Set(catalogue)
    expect(unique.size).toBe(DEFAULT_ITEMS.length + TASKS.length)
    expect(new Set([...unique].map((entry) => entry.id)).size).toBe(unique.size)
  })
})

describe("searchItems", () => {
  describe("empty query", () => {
    it("returns the default items", () => {
      expect(searchItems("")).toEqual(DEFAULT_ITEMS)
    })

    it("treats a whitespace-only query as no query at all", () => {
      expect(searchItems("   ")).toEqual(DEFAULT_ITEMS)
      expect(searchItems("\t\n ")).toEqual(DEFAULT_ITEMS)
    })

    // BUG (pinned, not fixed): the empty-query branch returns before the slice,
    // so the caller's cap is ignored. DEFAULT_ITEMS is already 14 items against
    // a default limit of 12, meaning the palette overruns its own limit the
    // moment it opens, and searchItems("", 2) hands back all 14.
    it("ignores the limit argument", () => {
      expect(searchItems("", 2)).toHaveLength(DEFAULT_ITEMS.length)
      expect(searchItems("").length).toBeGreaterThan(12)
    })

    // BUG (pinned, not fixed): every other path builds a fresh array, but this
    // one hands out the exported module constant itself. A caller doing
    // something as ordinary as sorting the returned array would permanently
    // reorder the default palette for the rest of the session.
    it("returns the DEFAULT_ITEMS array itself rather than a copy", () => {
      expect(searchItems("")).toBe(DEFAULT_ITEMS)
      expect(searchItems("   ")).toBe(DEFAULT_ITEMS)
    })
  })

  describe("matching", () => {
    it("finds a page by its label", () => {
      expect(ids(searchItems("board"))).toContain("page-tasks-board")
    })

    it("is case insensitive", () => {
      expect(ids(searchItems("BOARD"))).toEqual(ids(searchItems("board")))
      expect(ids(searchItems("BoArD"))).toEqual(ids(searchItems("board")))
      expect(ids(searchItems("REUI-241"))).toEqual(["task-1"])
      expect(ids(searchItems("reui-241"))).toEqual(["task-1"])
    })

    it("trims surrounding whitespace", () => {
      expect(ids(searchItems("  board  "))).toEqual(ids(searchItems("board")))
      expect(ids(searchItems("\tai ops\n"))).toEqual(["page-reports-ai-ops"])
    })

    it("returns an empty list when nothing matches", () => {
      expect(searchItems("zzzz-no-such-thing")).toEqual([])
      expect(searchItems("qqq")).toEqual([])
    })

    it("matches a page child by the section it sits under", () => {
      // "Board" and "Calendar" have no "reports" in them, so a section-wide
      // query can only reach them through the hint.
      expect(ids(searchItems("reports"))).toEqual([
        "page-reports",
        "page-reports-activity",
        "page-reports-analytics",
        "page-reports-ai-ops",
      ])
    })

    it("matches a task by its key and by its project through the hint", () => {
      expect(ids(searchItems("reui-238"))).toEqual(["task-2"])
      const registryApi = TASKS.filter(
        (task) => task.project === "Registry API"
      )
      expect(registryApi.length).toBeGreaterThan(1)
      for (const task of registryApi) {
        expect(ids(searchItems("registry api", 1000))).toContain(
          `task-${task.id}`
        )
      }
    })

    it("matches a task by assignee name, which is hidden in the keywords", () => {
      // The assignee is never rendered in the result row, so this match only
      // works because the name is folded into the invisible keyword blob.
      const maya = TASKS.filter((task) => task.assignee?.name === "Maya Perez")
      expect(ids(searchItems("maya"))).toEqual(
        maya.map((task) => `task-${task.id}`)
      )
      for (const person of ASSIGNEES) {
        const assigned = TASKS.filter((task) => task.assignee?.id === person.id)
        if (assigned.length === 0) continue
        const found = ids(searchItems(person.name.toLowerCase(), 1000))
        for (const task of assigned) {
          expect(found, `${person.name} should find ${task.taskKey}`).toContain(
            `task-${task.id}`
          )
        }
      }
    })

    // Every member of the status and priority unions is folded into the keyword
    // blob, so adding a seventh status must not quietly become unsearchable.
    it("matches every TaskStatus through the keywords", () => {
      for (const status of TASK_STATUS_ORDER) {
        const withStatus = TASKS.filter((task) => task.status === status)
        if (withStatus.length === 0) continue
        const found = ids(searchItems(status.toLowerCase(), 1000))
        for (const task of withStatus) {
          expect(found, `${status} should find ${task.taskKey}`).toContain(
            `task-${task.id}`
          )
        }
      }
    })

    it("matches every TaskPriority through the keywords", () => {
      for (const priority of TASK_PRIORITY_ORDER) {
        const withPriority = TASKS.filter((task) => task.priority === priority)
        if (withPriority.length === 0) continue
        const found = ids(searchItems(priority.toLowerCase(), 1000))
        for (const task of withPriority) {
          expect(found, `${priority} should find ${task.taskKey}`).toContain(
            `task-${task.id}`
          )
        }
      }
    })

    it("matches a saved view through its count hint", () => {
      // The hint is "12 tasks", so the count is searchable even though nobody
      // would think to type it. Pinned because it is the only way a bare number
      // returns anything at all.
      const assigned = SAVED_VIEWS.find((view) => view.id === "sv1")
      expect(ids(searchItems(`${assigned?.count} tasks`))).toEqual(["view-sv1"])
    })

    it("does not match on fields left out of the item, such as task type", () => {
      // `type` (Feature, Bug, Ops, Research) is neither label, hint nor keyword.
      // "research" therefore finds nothing, even though the grid shows the type.
      expect(TASKS.some((task) => task.type === "Research")).toBe(true)
      expect(searchItems("research")).toEqual([])
    })
  })

  describe("ranking", () => {
    // "review" is the one query in the seed data that exercises all four tiers
    // at once: it starts a task title, sits inside three others, is the project
    // name behind two hints, and is the status on a task it matches no other way.
    it("orders label-prefix, then label-includes, then hint, then keywords", () => {
      expect(ids(searchItems("review"))).toEqual([
        // rank 0: title starts with "Review"
        "task-16",
        // rank 1: "review" inside the title
        "task-4",
        "task-7",
        "task-8",
        // rank 2: hint carries the project "Review Ops"
        "task-15",
        // rank 3: only the hidden status keyword says "Review"
        "task-3",
      ])
    })

    it("puts a page whose label starts with the query above one that contains it", () => {
      const results = ids(searchItems("tasks"))
      expect(results.indexOf("page-tasks")).toBeLessThan(
        results.indexOf("page-tasks-my")
      )
      expect(results.indexOf("page-tasks-my")).toBeLessThan(
        // "Board" only matches through its "Tasks" hint.
        results.indexOf("page-tasks-board")
      )
    })

    it("keeps ties in catalogue order: pages, then views, then tasks", () => {
      // Nothing about "maya" is a label or a hint, so all three hits share
      // rank 3 and the sort must leave them in seed order.
      expect(ids(searchItems("maya"))).toEqual(["task-1", "task-7", "task-10"])
      const tasksQuery = ids(searchItems("task"))
      expect(tasksQuery[0]).toBe("page-tasks")
    })
  })

  describe("limit", () => {
    it("caps the result count at 12 by default", () => {
      expect(searchItems("a", 1000).length).toBeGreaterThan(12)
      expect(searchItems("a")).toHaveLength(12)
    })

    it("honours an explicit limit", () => {
      expect(searchItems("a", 3)).toHaveLength(3)
      expect(searchItems("a", 1)).toHaveLength(1)
      expect(searchItems("a", 0)).toEqual([])
    })

    it("keeps the highest ranked items when it truncates", () => {
      expect(ids(searchItems("review", 2))).toEqual(["task-16", "task-4"])
    })

    it("returns fewer than the limit when fewer things match", () => {
      expect(searchItems("reui-238", 12)).toHaveLength(1)
    })
  })

  describe("immutability and identity", () => {
    it("returns a new array for a non-empty query", () => {
      expect(searchItems("board")).not.toBe(searchItems("board"))
    })

    // searchItems sorts, so a sort applied to the shared catalogue instead of to
    // a fresh copy would leave the default palette permanently re-ordered.
    it("never reorders DEFAULT_ITEMS", () => {
      const before = ids(DEFAULT_ITEMS)
      searchItems("review")
      searchItems("a", 1000)
      searchItems("zzz")
      expect(ids(DEFAULT_ITEMS)).toEqual(before)
    })

    it("leaves the NAV_MAIN, SAVED_VIEWS and TASKS seeds untouched", () => {
      const navBefore = NAV_MAIN.map((nav) => nav.id).join()
      const viewsBefore = JSON.stringify(SAVED_VIEWS.map((view) => view.name))
      const tasksBefore = JSON.stringify(
        TASKS.map((task) => `${task.taskKey}|${task.status}|${task.priority}`)
      )
      searchItems("review")
      searchItems("")
      groupItems(searchItems("task"))
      expect(NAV_MAIN.map((nav) => nav.id).join()).toBe(navBefore)
      expect(JSON.stringify(SAVED_VIEWS.map((view) => view.name))).toBe(
        viewsBefore
      )
      expect(
        JSON.stringify(
          TASKS.map((task) => `${task.taskKey}|${task.status}|${task.priority}`)
        )
      ).toBe(tasksBefore)
    })

    // The palette highlights rows with results.indexOf(item), so the objects
    // handed back must be the same instances every call, not fresh copies.
    it("hands back stable item instances across calls", () => {
      expect(searchItems("board")[0]).toBe(searchItems("board")[0])
      expect(searchItems("")[0]).toBe(DEFAULT_ITEMS[0])
    })
  })
})

describe("groupItems", () => {
  it("splits items into the fixed Pages, Views, Tasks order", () => {
    const grouped = groupItems([
      item("t1", "Tasks"),
      item("v1", "Views"),
      item("p1", "Pages"),
    ])
    expect(grouped.map((entry) => entry.group)).toEqual([
      "Pages",
      "Views",
      "Tasks",
    ])
    expect(grouped.map((entry) => ids(entry.items))).toEqual([
      ["p1"],
      ["v1"],
      ["t1"],
    ])
  })

  it("drops groups with no items", () => {
    expect(
      groupItems([item("t1", "Tasks")]).map((entry) => entry.group)
    ).toEqual(["Tasks"])
    expect(
      groupItems([item("p1", "Pages"), item("t1", "Tasks")]).map(
        (entry) => entry.group
      )
    ).toEqual(["Pages", "Tasks"])
  })

  it("returns nothing at all for an empty list", () => {
    expect(groupItems([])).toEqual([])
  })

  it("preserves the ranked order inside each group", () => {
    // Deliberately interleaved: the group members are not adjacent in the input,
    // so a naive chunking implementation would reorder them.
    const grouped = groupItems([
      item("p1", "Pages"),
      item("t1", "Tasks"),
      item("p2", "Pages"),
      item("t2", "Tasks"),
      item("p3", "Pages"),
    ])
    expect(ids(grouped[0].items)).toEqual(["p1", "p2", "p3"])
    expect(ids(grouped[1].items)).toEqual(["t1", "t2"])
  })

  it("never mutates the input array and returns new arrays", () => {
    const source = [item("t1", "Tasks"), item("p1", "Pages")]
    const before = ids(source)
    const grouped = groupItems(source)
    expect(ids(source)).toEqual(before)
    for (const entry of grouped) {
      expect(entry.items).not.toBe(source)
    }
    // The items themselves must stay the same objects, see indexOf above.
    expect(grouped[0].items[0]).toBe(source[1])
  })

  it("covers every group in SEARCH_GROUP_ORDER", () => {
    const everyGroup = SEARCH_GROUP_ORDER.map((group) => item(group, group))
    expect(groupItems(everyGroup).map((entry) => entry.group)).toEqual(
      SEARCH_GROUP_ORDER
    )
  })

  it("keeps an unranked default palette in its declared order", () => {
    const grouped = groupItems(DEFAULT_ITEMS)
    expect(grouped.map((entry) => entry.group)).toEqual(["Pages", "Views"])
    expect(ids(grouped[0].items)).toEqual(
      ids(DEFAULT_ITEMS.filter((entry) => entry.group === "Pages"))
    )
  })

  describe("over real search results", () => {
    it("regroups across ranks while keeping ranked order within a group", () => {
      const ranked = searchItems("task")
      const grouped = groupItems(ranked)
      expect(grouped.map((entry) => entry.group)).toEqual([
        "Pages",
        "Views",
        "Tasks",
      ])
      // "Board" and "Calendar" rank below the task titles because they only
      // match through their hint, yet grouping lifts them back up under Pages.
      expect(ids(grouped[0].items)).toEqual([
        "page-tasks",
        "page-tasks-my",
        "page-tasks-team",
        "page-tasks-board",
        "page-tasks-calendar",
      ])
      expect(ids(grouped[2].items)).toEqual([
        "task-3",
        "task-8",
        "task-11",
        "task-16",
      ])
      for (const entry of grouped) {
        const positions = entry.items.map((each) => ranked.indexOf(each))
        expect(positions).toEqual([...positions].sort((a, b) => a - b))
      }
    })

    // BUG (pinned, not fixed): the limit is applied before grouping, so a whole
    // group can be silently docked. "task" matches all four saved views, but
    // "Recent activity" ranks 13th and is cut, and the palette shows a Views
    // group that looks complete while a matching view is missing with no hint
    // that more results exist.
    it("loses low-ranked members of a group to the limit", () => {
      const grouped = groupItems(searchItems("task"))
      const views = grouped.find((entry) => entry.group === "Views")
      expect(views?.items).toHaveLength(SAVED_VIEWS.length - 1)
      expect(ids(views?.items ?? [])).not.toContain("view-sv4")
      // The view does match; it is only the cap that hides it.
      expect(ids(searchItems("task", 1000))).toContain("view-sv4")
    })

    it("returns no groups when the search found nothing", () => {
      expect(groupItems(searchItems("zzzz-no-such-thing"))).toEqual([])
    })
  })
})
