import { describe, expect, it } from "vitest"

import type { Filter } from "@/components/reui/filters"
import { TASKS } from "@/features/tasks/components/data"
import type { ITask } from "@/features/tasks/components/data"
import {
  ACTIVE_STATUSES,
  applyFiltersToData,
  COMPLETED_STATUSES,
  countCompletedTasks,
  evaluateFilterOperator,
  filterFieldValue,
  getActiveFilters,
  getTaskTabCount,
  getVisibleTasks,
  hasVisibleFilterControls,
  isCompletedTask,
  isDefaultTaskFilter,
  matchesTaskTab,
} from "@/features/tasks/lib/filter-tasks"

function filter(
  field: string,
  operator: string,
  values: unknown[] = []
): Filter {
  return { id: `${field}-${operator}`, field, operator, values }
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

const DEFAULT_FILTER = filter("title", "contains", [""])

describe("getActiveFilters", () => {
  it("keeps a filter the user has actually filled in", () => {
    expect(getActiveFilters([filter("status", "is", ["Todo"])])).toHaveLength(1)
  })

  // These two operators clear their values by design, so a values check alone
  // would throw away the only condition the user picked.
  it("keeps empty and not_empty even though they carry no values", () => {
    const filters = [
      filter("assignee", "empty"),
      filter("assignee", "not_empty"),
    ]
    expect(getActiveFilters(filters)).toHaveLength(2)
  })

  it("drops a filter with no values at all", () => {
    expect(getActiveFilters([filter("status", "is", [])])).toHaveLength(0)
  })

  // The grid mounts an empty search row on purpose; treating it as active would
  // send an empty token through the evaluator on every keystroke.
  it("drops a filter whose values are all blank or whitespace", () => {
    expect(getActiveFilters([DEFAULT_FILTER])).toHaveLength(0)
    expect(
      getActiveFilters([filter("title", "contains", ["   "])])
    ).toHaveLength(0)
  })

  it("drops filters whose values are all null or all empty arrays", () => {
    expect(
      getActiveFilters([filter("assignee", "is", [null, null])])
    ).toHaveLength(0)
    expect(getActiveFilters([filter("assignee", "is", [[], []])])).toHaveLength(
      0
    )
  })

  it("keeps a filter as soon as one value is real", () => {
    expect(
      getActiveFilters([filter("title", "contains", ["", "audit"])])
    ).toHaveLength(1)
  })

  it("returns a new array and leaves the input alone", () => {
    const filters = [DEFAULT_FILTER, filter("status", "is", ["Todo"])]
    const active = getActiveFilters(filters)

    expect(active).not.toBe(filters)
    expect(filters).toHaveLength(2)
  })
})

describe("isDefaultTaskFilter / hasVisibleFilterControls", () => {
  it("recognises the seeded empty search row", () => {
    expect(isDefaultTaskFilter(DEFAULT_FILTER)).toBe(true)
    expect(isDefaultTaskFilter(filter("title", "contains", ["  "]))).toBe(true)
  })

  it("rejects anything the user has changed", () => {
    expect(isDefaultTaskFilter(filter("title", "contains", ["audit"]))).toBe(
      false
    )
    expect(isDefaultTaskFilter(filter("status", "contains", [""]))).toBe(false)
    expect(isDefaultTaskFilter(filter("title", "is", [""]))).toBe(false)
    expect(isDefaultTaskFilter(filter("title", "contains", ["", ""]))).toBe(
      false
    )
    expect(isDefaultTaskFilter(filter("title", "contains", []))).toBe(false)
  })

  // Clear / Save view only appear once there is something worth clearing, so the
  // untouched default row must not count as a visible control.
  it("hides the toolbar actions when only the default row is present", () => {
    expect(hasVisibleFilterControls([DEFAULT_FILTER])).toBe(false)
    expect(hasVisibleFilterControls([])).toBe(false)
  })

  it("shows the toolbar actions as soon as another row exists", () => {
    expect(
      hasVisibleFilterControls([DEFAULT_FILTER, filter("status", "is", [])])
    ).toBe(true)
  })
})

describe("filterFieldValue", () => {
  it("reads plain fields straight off the task", () => {
    expect(filterFieldValue(task({ status: "Review" }), "status")).toBe(
      "Review"
    )
    expect(filterFieldValue(task({ priorityValue: 4 }), "priorityValue")).toBe(
      4
    )
  })

  it("labels a missing assignee so the Unassigned option can match it", () => {
    expect(filterFieldValue(task(), "assignee")).toBe("Unassigned")
  })

  it("uses the assignee name, which is what the select stores", () => {
    const withAssignee = task({
      assignee: {
        id: "maya",
        name: "Maya Perez",
        initials: "MP",
        role: "Platform lead",
        tone: "",
      },
    })
    expect(filterFieldValue(withAssignee, "assignee")).toBe("Maya Perez")
  })

  // The search box has to reach sub-tasks, so "title" is really a blob of the
  // title, the project and every sub-issue title joined together.
  it("builds a search blob for the title field", () => {
    const withSub = task({
      title: "Parent",
      project: "Registry API",
      subIssues: [
        {
          id: "s1",
          title: "Child work",
          status: "Todo",
          priority: "Low",
          assignee: null,
          dueAt: "2026-04-01",
          dueDateLabel: "Apr 1",
        },
      ],
    })

    expect(filterFieldValue(withSub, "title")).toBe(
      "Parent Registry API Child work"
    )
  })

  it("returns undefined for a field the task does not have", () => {
    expect(filterFieldValue(task(), "nope")).toBeUndefined()
  })
})

describe("evaluateFilterOperator", () => {
  it("is / is_not compare against the whole value list", () => {
    expect(evaluateFilterOperator("Todo", "is", ["Todo", "Done"])).toBe(true)
    expect(evaluateFilterOperator("Review", "is", ["Todo"])).toBe(false)
    expect(evaluateFilterOperator("Review", "is_not", ["Todo"])).toBe(true)
    expect(evaluateFilterOperator("Todo", "is_not", ["Todo"])).toBe(false)
  })

  it("is_any_of / is_not_any_of behave like is / is_not", () => {
    expect(evaluateFilterOperator("Done", "is_any_of", ["Todo", "Done"])).toBe(
      true
    )
    expect(evaluateFilterOperator("Done", "is_any_of", ["Todo"])).toBe(false)
    expect(evaluateFilterOperator("Done", "is_not_any_of", ["Todo"])).toBe(true)
    expect(evaluateFilterOperator("Done", "is_not_any_of", ["Done"])).toBe(
      false
    )
  })

  it("contains matches any token, case-insensitively", () => {
    expect(evaluateFilterOperator("Audit trail", "contains", ["audit"])).toBe(
      true
    )
    expect(evaluateFilterOperator("Audit trail", "contains", ["AUDIT"])).toBe(
      true
    )
    expect(
      evaluateFilterOperator("Audit trail", "contains", ["nope", "trail"])
    ).toBe(true)
    expect(evaluateFilterOperator("Audit trail", "contains", ["nope"])).toBe(
      false
    )
  })

  it("contains trims tokens and matches everything when nothing is left", () => {
    expect(
      evaluateFilterOperator("Audit trail", "contains", ["  audit "])
    ).toBe(true)
    expect(evaluateFilterOperator("Audit trail", "contains", ["   "])).toBe(
      true
    )
    expect(evaluateFilterOperator("Audit trail", "contains", [])).toBe(true)
  })

  it("not_contains is the negation across every value", () => {
    expect(
      evaluateFilterOperator("Audit trail", "not_contains", ["nope"])
    ).toBe(true)
    expect(
      evaluateFilterOperator("Audit trail", "not_contains", ["AUDIT"])
    ).toBe(false)
  })

  it("starts_with / ends_with are case-insensitive", () => {
    expect(evaluateFilterOperator("Audit trail", "starts_with", ["aud"])).toBe(
      true
    )
    expect(
      evaluateFilterOperator("Audit trail", "starts_with", ["trail"])
    ).toBe(false)
    expect(evaluateFilterOperator("Audit trail", "ends_with", ["TRAIL"])).toBe(
      true
    )
    expect(evaluateFilterOperator("Audit trail", "ends_with", ["audit"])).toBe(
      false
    )
  })

  it("equals / not_equals only look at the first value", () => {
    expect(evaluateFilterOperator("Todo", "equals", ["Todo", "Done"])).toBe(
      true
    )
    expect(evaluateFilterOperator("Done", "equals", ["Todo", "Done"])).toBe(
      false
    )
    expect(evaluateFilterOperator("Done", "not_equals", ["Todo"])).toBe(true)
    expect(evaluateFilterOperator("Todo", "not_equals", ["Todo"])).toBe(false)
  })

  it("coerces both sides for the numeric comparisons", () => {
    expect(evaluateFilterOperator(5, "greater_than", [3])).toBe(true)
    expect(evaluateFilterOperator(3, "greater_than", [3])).toBe(false)
    expect(evaluateFilterOperator("2", "less_than", ["3"])).toBe(true)
    expect(evaluateFilterOperator(3, "less_than", [3])).toBe(false)
    expect(evaluateFilterOperator(3, "greater_than_or_equal", [3])).toBe(true)
    expect(evaluateFilterOperator(2, "greater_than_or_equal", [3])).toBe(false)
    expect(evaluateFilterOperator(3, "less_than_or_equal", [3])).toBe(true)
    expect(evaluateFilterOperator(4, "less_than_or_equal", [3])).toBe(false)
  })

  it("between / not_between are inclusive and need two bounds", () => {
    expect(evaluateFilterOperator(5, "between", [1, 10])).toBe(true)
    expect(evaluateFilterOperator(1, "between", [1, 10])).toBe(true)
    expect(evaluateFilterOperator(10, "between", [1, 10])).toBe(true)
    expect(evaluateFilterOperator(11, "between", [1, 10])).toBe(false)
    expect(evaluateFilterOperator(11, "not_between", [1, 10])).toBe(true)
    expect(evaluateFilterOperator(5, "not_between", [1, 10])).toBe(false)
    // A half-filled range must not hide rows while the user is still typing.
    expect(evaluateFilterOperator(5, "between", [1])).toBe(true)
    expect(evaluateFilterOperator(5, "not_between", [1])).toBe(true)
  })

  it("empty / not_empty treat blank and nullish alike", () => {
    expect(evaluateFilterOperator("", "empty", [])).toBe(true)
    expect(evaluateFilterOperator(null, "empty", [])).toBe(true)
    expect(evaluateFilterOperator(undefined, "empty", [])).toBe(true)
    expect(evaluateFilterOperator("Todo", "empty", [])).toBe(false)
    expect(evaluateFilterOperator("Todo", "not_empty", [])).toBe(true)
    expect(evaluateFilterOperator("", "not_empty", [])).toBe(false)
    expect(evaluateFilterOperator(null, "not_empty", [])).toBe(false)
  })

  // BUG (pinned, not fixed): the filters component offers includes_all and
  // excludes_all for every multi-select field, but the evaluator has no case for
  // them, so they hit the default and silently match every row. The user picks a
  // condition and nothing changes.
  it("lets includes_all and excludes_all fall through to true", () => {
    expect(evaluateFilterOperator("Todo", "includes_all", ["Done"])).toBe(true)
    expect(evaluateFilterOperator("Todo", "excludes_all", ["Todo"])).toBe(true)
  })

  it("matches everything for an operator it does not handle", () => {
    expect(evaluateFilterOperator("Todo", "after", ["2026-01-01"])).toBe(true)
    expect(evaluateFilterOperator("Todo", "", [])).toBe(true)
  })

  // BUG (pinned, not fixed): contains strips blank tokens before comparing, but
  // not_contains, starts_with and ends_with do not. Every string contains,
  // starts with and ends with "", so one leftover blank value in the list makes
  // not_contains hide every row and makes starts_with / ends_with show every row.
  it("does not strip empty values the way contains does", () => {
    expect(
      evaluateFilterOperator("Audit trail", "contains", ["", "nope"])
    ).toBe(false)
    expect(
      evaluateFilterOperator("Audit trail", "not_contains", ["", "nope"])
    ).toBe(false)
    expect(
      evaluateFilterOperator("Audit trail", "starts_with", ["", "nope"])
    ).toBe(true)
    expect(
      evaluateFilterOperator("Audit trail", "ends_with", ["", "nope"])
    ).toBe(true)
  })
})

describe("applyFiltersToData", () => {
  const rows = [
    task({ id: "1", taskKey: "T-1", title: "Audit trail", status: "Todo" }),
    task({ id: "2", taskKey: "T-2", title: "Ship queue", status: "Done" }),
    task({ id: "3", taskKey: "T-3", title: "Audit hooks", status: "Review" }),
  ]

  it("returns everything when there is nothing active to apply", () => {
    expect(applyFiltersToData(rows, [])).toHaveLength(3)
    expect(applyFiltersToData(rows, [DEFAULT_FILTER])).toHaveLength(3)
  })

  it("ignores a whitespace-only search instead of emptying the grid", () => {
    expect(
      applyFiltersToData(rows, [filter("title", "contains", ["   "])])
    ).toHaveLength(3)
  })

  it("filters on the happy path, case-insensitively", () => {
    expect(
      applyFiltersToData(rows, [filter("title", "contains", ["AUDIT"])]).map(
        (t) => t.id
      )
    ).toEqual(["1", "3"])
  })

  it("returns an empty list when nothing matches", () => {
    expect(
      applyFiltersToData(rows, [filter("title", "contains", ["nothing"])])
    ).toHaveLength(0)
  })

  it("ANDs several filters together", () => {
    const result = applyFiltersToData(rows, [
      filter("title", "contains", ["audit"]),
      filter("status", "is", ["Review"]),
    ])
    expect(result.map((t) => t.id)).toEqual(["3"])
  })

  it("returns a new array and never mutates the input", () => {
    const source = [...rows]
    const result = applyFiltersToData(source, [])

    expect(result).not.toBe(source)
    expect(source).toHaveLength(3)
    expect(source.map((t) => t.id)).toEqual(["1", "2", "3"])
  })

  it("keeps the seed data untouched", () => {
    const before = TASKS.map((t) => t.id)
    applyFiltersToData(TASKS, [filter("title", "contains", ["audit"])])
    expect(TASKS.map((t) => t.id)).toEqual(before)
  })

  it("searches the real seed data by title", () => {
    const result = applyFiltersToData(TASKS, [
      filter("title", "contains", ["audit"]),
    ])
    // REUI-236 matches on its own title, REUI-227 matches case-insensitively
    // ("Audit session..."), REUI-194 matches only through a sub-issue title.
    expect(result.map((t) => t.taskKey)).toEqual([
      "REUI-236",
      "REUI-227",
      "REUI-194",
    ])
  })

  // The whole point of the title blob: typing a sub-task name must keep the
  // parent row on screen, otherwise the match would be invisible.
  it("keeps a parent row when only a sub-issue title matches", () => {
    const result = applyFiltersToData(TASKS, [
      filter("title", "contains", ["replay guard"]),
    ])
    expect(result.map((t) => t.taskKey)).toEqual(["REUI-241"])
    expect(
      result[0].subIssues?.some((s) => s.title.includes("replay guard"))
    ).toBe(true)
  })

  it("matches the Unassigned label on the real seed data", () => {
    const result = applyFiltersToData(TASKS, [
      filter("assignee", "is", ["Unassigned"]),
    ])
    expect(result.map((t) => t.taskKey)).toEqual(["REUI-205"])
  })

  it("filters the real seed data by assignee name", () => {
    const result = applyFiltersToData(TASKS, [
      filter("assignee", "is", ["Maya Perez"]),
    ])
    expect(result.map((t) => t.taskKey)).toEqual([
      "REUI-241",
      "REUI-224",
      "REUI-214",
    ])
  })

  // BUG (pinned, not fixed): because "title" resolves to a blob, the field
  // labelled "Task" also matches project names. Searching "Registry API"
  // returns two tasks whose titles contain neither word.
  it("matches project names through the title field", () => {
    const result = applyFiltersToData(TASKS, [
      filter("title", "contains", ["Registry API"]),
    ])
    expect(result.map((t) => t.taskKey)).toEqual(["REUI-241", "REUI-205"])
    expect(result.every((t) => !t.title.includes("Registry API"))).toBe(true)
  })

  // BUG (pinned, not fixed): the same blob makes the exact-match operators
  // unusable on titles. "is" compares against title + project + sub-issues, so
  // asking for a task by its exact title returns nothing.
  it("never matches a real title with the is operator", () => {
    expect(
      applyFiltersToData(TASKS, [filter("title", "is", [TASKS[0].title])])
    ).toHaveLength(0)
  })

  // BUG (pinned, not fixed): a null assignee is reported as "Unassigned", so the
  // Assignee "is empty" operator the filter UI offers can never match, even
  // though REUI-205 genuinely has no assignee.
  it("finds nothing for an empty assignee", () => {
    expect(
      applyFiltersToData(TASKS, [filter("assignee", "empty")])
    ).toHaveLength(0)
    expect(
      applyFiltersToData(TASKS, [filter("assignee", "not_empty")])
    ).toHaveLength(TASKS.length)
  })
})

describe("tab and completion filters", () => {
  it("classifies the status unions exactly once", () => {
    for (const status of [...ACTIVE_STATUSES, ...COMPLETED_STATUSES]) {
      expect(
        ACTIVE_STATUSES.includes(status) && COMPLETED_STATUSES.includes(status)
      ).toBe(false)
    }
    expect(isCompletedTask(task({ status: "Done" }))).toBe(true)
    expect(isCompletedTask(task({ status: "Cancelled" }))).toBe(true)
    expect(isCompletedTask(task({ status: "Backlog" }))).toBe(false)
  })

  it("matches every tab against every status", () => {
    expect(matchesTaskTab(task({ status: "Backlog" }), "all")).toBe(true)
    expect(matchesTaskTab(task({ status: "Done" }), "all")).toBe(true)
    expect(matchesTaskTab(task({ status: "Todo" }), "active")).toBe(true)
    expect(matchesTaskTab(task({ status: "In Progress" }), "active")).toBe(true)
    expect(matchesTaskTab(task({ status: "Review" }), "active")).toBe(true)
    // Backlog has its own tab, and finished work is never "active".
    expect(matchesTaskTab(task({ status: "Backlog" }), "active")).toBe(false)
    expect(matchesTaskTab(task({ status: "Done" }), "active")).toBe(false)
    expect(matchesTaskTab(task({ status: "Cancelled" }), "active")).toBe(false)
    expect(matchesTaskTab(task({ status: "Backlog" }), "backlog")).toBe(true)
    expect(matchesTaskTab(task({ status: "Todo" }), "backlog")).toBe(false)
  })

  it("hides completed work on the all tab when the switch is off", () => {
    const rows = [
      task({ id: "1", status: "Todo" }),
      task({ id: "2", status: "Done" }),
      task({ id: "3", status: "Cancelled" }),
    ]

    expect(getVisibleTasks(rows, "all", true).map((t) => t.id)).toEqual([
      "1",
      "2",
      "3",
    ])
    expect(getVisibleTasks(rows, "all", false).map((t) => t.id)).toEqual(["1"])
  })

  it("returns a new array and leaves the input alone", () => {
    const rows = [task({ id: "1" })]
    const visible = getVisibleTasks(rows, "all", true)

    expect(visible).not.toBe(rows)
    expect(rows).toHaveLength(1)
  })

  it("counts completed work across the real seed data", () => {
    expect(countCompletedTasks(TASKS)).toBe(
      TASKS.filter((t) => t.status === "Done" || t.status === "Cancelled")
        .length
    )
    expect(countCompletedTasks([])).toBe(0)
  })

  it("gives every tab the same count the grid will render", () => {
    for (const tab of ["all", "active", "backlog"] as const) {
      for (const showCompleted of [true, false]) {
        expect(getTaskTabCount(TASKS, tab, showCompleted)).toBe(
          getVisibleTasks(TASKS, tab, showCompleted).length
        )
      }
    }
  })

  it("counts the real seed data per tab", () => {
    expect(getTaskTabCount(TASKS, "all", true)).toBe(TASKS.length)
    expect(getTaskTabCount(TASKS, "all", false)).toBe(
      TASKS.length - countCompletedTasks(TASKS)
    )
    expect(getTaskTabCount(TASKS, "backlog", true)).toBe(
      TASKS.filter((t) => t.status === "Backlog").length
    )
    // Every task is either active, backlog or completed, so the tabs partition
    // the queue and nothing can go missing from all three.
    expect(
      getTaskTabCount(TASKS, "active", true) +
        getTaskTabCount(TASKS, "backlog", true) +
        countCompletedTasks(TASKS)
    ).toBe(TASKS.length)
  })

  // The active and backlog tabs contain no completed work by definition, so the
  // switch must not change their badge counts.
  it("leaves the active and backlog counts alone when completed work is hidden", () => {
    expect(getTaskTabCount(TASKS, "active", false)).toBe(
      getTaskTabCount(TASKS, "active", true)
    )
    expect(getTaskTabCount(TASKS, "backlog", false)).toBe(
      getTaskTabCount(TASKS, "backlog", true)
    )
  })
})
