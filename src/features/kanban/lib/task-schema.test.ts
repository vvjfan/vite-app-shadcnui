import { describe, expect, it } from "vitest"

import { TASKS } from "@/lib/data/planner/seed/tasks"
import { TASK_STATUS_ORDER } from "@/lib/data/planner/types"
import type { TaskPriority, TaskStatus } from "@/lib/data/planner/types"
import {
  boardTaskDefaultValues,
  boardTaskSchema,
  dueDateFromLabel,
  BOARD_TASK_CREATE_DEFAULTS,
  TASK_PRIORITY_VALUES,
} from "./task-schema"

// Keyed by the unions so a new TaskStatus / TaskPriority breaks this file rather
// than shipping a dropdown the schema then rejects.
const ALL_STATUSES: Record<TaskStatus, true> = {
  Backlog: true,
  Todo: true,
  "In Progress": true,
  Review: true,
  Done: true,
}
const ALL_PRIORITIES: Record<TaskPriority, true> = {
  Low: true,
  Medium: true,
  High: true,
  Urgent: true,
}

const REFERENCE_DAY = new Date(2026, 6, 25)

function values(overrides: Record<string, unknown> = {}) {
  return {
    title: "Offline sync conflict handling",
    description: "Resolve write conflicts when a device reconnects.",
    status: "Todo",
    priority: "High",
    assigneeId: "maya",
    dueDate: null,
    ...overrides,
  }
}

function customDueDate(date: Date) {
  return { type: "custom", id: "custom-date", label: "Aug 12", date }
}

/** The message the sheet would show under one field, or undefined if it passed. */
function messageFor(input: Record<string, unknown>, field: string) {
  const result = boardTaskSchema.safeParse(input)
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
    expect([...TASK_PRIORITY_VALUES].sort()).toEqual(
      Object.keys(ALL_PRIORITIES).sort()
    )
  })

  it("orders the priorities weakest first", () => {
    expect(TASK_PRIORITY_VALUES).toEqual(["Low", "Medium", "High", "Urgent"])
  })
})

describe("boardTaskSchema", () => {
  it("accepts a filled-in form", () => {
    expect(boardTaskSchema.safeParse(values()).success).toBe(true)
  })

  it("trims the text fields it passes on", () => {
    const result = boardTaskSchema.parse(
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
      expect(messageFor(values({ status: "Cancelled" }), "status")).toBe(
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
    it("accepts the unassigned empty id", () => {
      expect(
        messageFor(values({ assigneeId: "" }), "assigneeId")
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
      expect(messageFor(values({ dueDate: "Aug 12" }), "dueDate")).toBe(
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

describe("dueDateFromLabel", () => {
  it("reads a stored label into a custom pick", () => {
    const value = dueDateFromLabel("Aug 12", REFERENCE_DAY)
    expect(value).not.toBeNull()
    expect(value?.type).toBe("custom")
    expect(value?.label).toBe("Aug 12")
    expect(value?.date.getMonth()).toBe(7)
    expect(value?.date.getDate()).toBe(12)
    expect(value?.date.getFullYear()).toBe(2026)
  })

  it("reads an empty label as no due date", () => {
    expect(dueDateFromLabel("", REFERENCE_DAY)).toBeNull()
  })

  it("reads an unparseable label as no due date", () => {
    expect(dueDateFromLabel("someday", REFERENCE_DAY)).toBeNull()
  })

  it("always produces a value the schema accepts", () => {
    for (const label of ["Aug 12", "", "someday", "Feb 30"]) {
      const result = boardTaskSchema.safeParse(
        values({ dueDate: dueDateFromLabel(label, REFERENCE_DAY) })
      )
      expect(result.success, `${label} produced an invalid due date`).toBe(true)
    }
  })
})

describe("boardTaskDefaultValues", () => {
  it("opens a create on a Todo card at medium priority", () => {
    expect(boardTaskDefaultValues(null)).toEqual(BOARD_TASK_CREATE_DEFAULTS)
    expect(BOARD_TASK_CREATE_DEFAULTS.status).toBe("Todo")
    expect(BOARD_TASK_CREATE_DEFAULTS.priority).toBe("Medium")
  })

  it("only fails on the empty title", () => {
    const result = boardTaskSchema.safeParse(boardTaskDefaultValues(null))
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "title",
    ])
  })

  it("seeds an edit from the card", () => {
    const task = TASKS[0]
    const defaults = boardTaskDefaultValues(task, REFERENCE_DAY)
    expect(defaults.title).toBe(task.title)
    expect(defaults.description).toBe(task.description)
    expect(defaults.status).toBe(task.status)
    expect(defaults.priority).toBe(task.priority)
    expect(defaults.assigneeId).toBe(task.assigneeId)
    expect(defaults.dueDate).toEqual(
      dueDateFromLabel(task.dueDate, REFERENCE_DAY)
    )
  })

  it("re-validates every seed card", () => {
    for (const task of TASKS) {
      const result = boardTaskSchema.safeParse(
        boardTaskDefaultValues(task, REFERENCE_DAY)
      )
      expect(result.success, `${task.id} failed to validate`).toBe(true)
    }
  })
})
