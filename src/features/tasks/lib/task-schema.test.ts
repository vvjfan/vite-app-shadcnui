import { describe, expect, it } from "vitest"

import {
  TASKS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_ORDER,
} from "../components/data"
import type { TaskPriority, TaskStatus } from "../components/data"
import {
  dueDateFromIso,
  taskDefaultValues,
  taskSchema,
  UNASSIGNED_ID,
} from "./task-schema"

// Keyed by the unions so a new TaskStatus / TaskPriority breaks this file rather
// than shipping a dropdown the schema then rejects.
const ALL_STATUSES: Record<TaskStatus, true> = {
  Backlog: true,
  Todo: true,
  "In Progress": true,
  Review: true,
  Done: true,
  Cancelled: true,
}
const ALL_PRIORITIES: Record<TaskPriority, true> = {
  Urgent: true,
  High: true,
  Medium: true,
  Low: true,
}

const REFERENCE_DAY = new Date(2026, 6, 25)

function values(overrides: Record<string, unknown> = {}) {
  return {
    title: "Wire the reporting export",
    description: "Server-side PDF with itemized task summaries.",
    status: "Todo",
    priority: "High",
    assigneeId: "maya",
    project: "Workspace Access",
    dueDate: null,
    ...overrides,
  }
}

function customDueDate(date: Date) {
  return { type: "custom", id: "custom-date", label: "Aug 12", date }
}

/** The message the sheet would show under one field, or undefined if it passed. */
function messageFor(input: Record<string, unknown>, field: string) {
  const result = taskSchema.safeParse(input)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("option lists", () => {
  it("covers every member of TaskStatus", () => {
    expect([...TASK_STATUS_ORDER].sort()).toEqual(
      Object.keys(ALL_STATUSES).sort()
    )
  })

  it("covers every member of TaskPriority", () => {
    expect([...TASK_PRIORITY_ORDER].sort()).toEqual(
      Object.keys(ALL_PRIORITIES).sort()
    )
  })
})

describe("taskSchema", () => {
  it("accepts a filled-in form", () => {
    expect(taskSchema.safeParse(values()).success).toBe(true)
  })

  it("trims the text fields it passes on", () => {
    const result = taskSchema.parse(
      values({ title: "  Ship it  ", description: "  Later.  " })
    )
    expect(result.title).toBe("Ship it")
    expect(result.description).toBe("Later.")
  })

  describe("title", () => {
    it("is required", () => {
      expect(messageFor(values({ title: "" }), "title")).toBe(
        "Enter a task name."
      )
    })

    it("rejects whitespace alone", () => {
      expect(messageFor(values({ title: "   " }), "title")).toBe(
        "Enter a task name."
      )
    })

    it("caps at 120 characters", () => {
      expect(messageFor(values({ title: "x".repeat(121) }), "title")).toBe(
        "Use 120 characters or fewer."
      )
      expect(
        messageFor(values({ title: "x".repeat(120) }), "title")
      ).toBeUndefined()
    })
  })

  describe("description", () => {
    it("is optional", () => {
      expect(
        messageFor(values({ description: "" }), "description")
      ).toBeUndefined()
    })

    it("caps at 500 characters", () => {
      expect(
        messageFor(values({ description: "x".repeat(501) }), "description")
      ).toBe("Use 500 characters or fewer.")
    })
  })

  describe("status", () => {
    it("accepts every TaskStatus", () => {
      for (const status of Object.keys(ALL_STATUSES)) {
        expect(messageFor(values({ status }), "status")).toBeUndefined()
      }
    })

    it("rejects a value outside the union", () => {
      expect(messageFor(values({ status: "Shipped" }), "status")).toBe(
        "Choose a status."
      )
    })

    it("rejects a missing value", () => {
      expect(messageFor(values({ status: undefined }), "status")).toBe(
        "Choose a status."
      )
    })
  })

  describe("priority", () => {
    it("accepts every TaskPriority", () => {
      for (const priority of Object.keys(ALL_PRIORITIES)) {
        expect(messageFor(values({ priority }), "priority")).toBeUndefined()
      }
    })

    it("rejects a value outside the union", () => {
      expect(messageFor(values({ priority: "Blocker" }), "priority")).toBe(
        "Choose a priority."
      )
    })
  })

  describe("assigneeId", () => {
    it("accepts the unassigned option", () => {
      expect(
        messageFor(values({ assigneeId: UNASSIGNED_ID }), "assigneeId")
      ).toBeUndefined()
    })

    it("rejects an empty id", () => {
      expect(messageFor(values({ assigneeId: "" }), "assigneeId")).toBe(
        "Choose an assignee."
      )
    })
  })

  describe("project", () => {
    it("is required", () => {
      expect(messageFor(values({ project: "  " }), "project")).toBe(
        "Choose a project."
      )
    })

    it("accepts a project outside the page's list", () => {
      expect(
        messageFor(values({ project: "Skunkworks" }), "project")
      ).toBeUndefined()
    })
  })

  describe("dueDate", () => {
    it("accepts no due date", () => {
      expect(messageFor(values({ dueDate: null }), "dueDate")).toBeUndefined()
    })

    it("accepts a preset", () => {
      expect(
        messageFor(
          values({
            dueDate: {
              type: "preset",
              id: "end-of-week",
              label: "End of week",
              date: REFERENCE_DAY,
            },
          }),
          "dueDate"
        )
      ).toBeUndefined()
    })

    it("accepts a custom pick", () => {
      expect(
        messageFor(values({ dueDate: customDueDate(REFERENCE_DAY) }), "dueDate")
      ).toBeUndefined()
    })

    it("rejects a date that did not parse", () => {
      expect(
        messageFor(
          values({ dueDate: customDueDate(new Date("not a date")) }),
          "dueDate"
        )
      ).toBe("Choose a valid due date.")
    })

    it("rejects a bare string", () => {
      expect(messageFor(values({ dueDate: "2026-08-12" }), "dueDate")).toBe(
        "Choose a valid due date."
      )
    })

    it("rejects an option with no date", () => {
      expect(
        messageFor(
          values({
            dueDate: { type: "custom", id: "custom-date", label: "Aug 12" },
          }),
          "dueDate"
        )
      ).toBe("Choose a valid due date.")
    })
  })
})

describe("dueDateFromIso", () => {
  it("reads a stored date into a custom pick", () => {
    const value = dueDateFromIso("2026-08-12")
    expect(value).not.toBeNull()
    expect(value?.type).toBe("custom")
    expect(value?.label).toBe("Aug 12")
    expect(value?.date.getMonth()).toBe(7)
    expect(value?.date.getDate()).toBe(12)
    expect(value?.date.getFullYear()).toBe(2026)
  })

  it("reads an empty value as no due date", () => {
    expect(dueDateFromIso("")).toBeNull()
  })

  it("reads an unparseable value as no due date", () => {
    expect(dueDateFromIso("someday")).toBeNull()
  })

  it("always produces a value the schema accepts", () => {
    for (const stored of ["2026-08-12", "", "someday", "2026-02-31"]) {
      const result = taskSchema.safeParse(
        values({ dueDate: dueDateFromIso(stored) })
      )
      expect(result.success, `${stored} produced an invalid due date`).toBe(
        true
      )
    }
  })
})

describe("taskDefaultValues", () => {
  it("opens a create on the first project, unassigned", () => {
    expect(taskDefaultValues(null, "Workspace Access")).toEqual({
      title: "",
      description: "",
      status: "Todo",
      priority: "Medium",
      assigneeId: UNASSIGNED_ID,
      project: "Workspace Access",
      dueDate: null,
    })
  })

  it("falls back to General when the page offers no projects", () => {
    expect(taskDefaultValues(null, "").project).toBe("General")
  })

  it("only fails on the empty title", () => {
    const result = taskSchema.safeParse(taskDefaultValues(null, "Inbox"))
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "title",
    ])
  })

  it("seeds an edit from the record", () => {
    const task = TASKS[0]
    const defaults = taskDefaultValues(task, "Inbox")
    expect(defaults.title).toBe(task.title)
    expect(defaults.description).toBe(task.description ?? "")
    expect(defaults.status).toBe(task.status)
    expect(defaults.priority).toBe(task.priority)
    expect(defaults.assigneeId).toBe(task.assignee?.id ?? UNASSIGNED_ID)
    expect(defaults.project).toBe(task.project)
    expect(defaults.dueDate).toEqual(dueDateFromIso(task.dueAt))
  })

  it("re-validates every seed record", () => {
    for (const task of TASKS) {
      const result = taskSchema.safeParse(taskDefaultValues(task, "Inbox"))
      expect(result.success, `${task.taskKey} failed to validate`).toBe(true)
    }
  })
})
