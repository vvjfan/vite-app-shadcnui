import { describe, expect, it } from "vitest"

import {
  TASK_TITLE_MAX,
  taskFormSchema,
} from "@/features/gantt/lib/task-form-schema"
import type { TaskFormValues } from "@/features/gantt/lib/task-form-schema"

/** A complete, valid "new task" payload; each test bends one field out of shape. */
const VALID: TaskFormValues = {
  mode: "task",
  title: "Ship the release notes",
  groupId: "bug-tracking",
  status: "todo",
  priority: "normal",
  assignees: ["Sofia Reyes"],
  start: new Date("2026-07-19T00:00:00"),
  due: new Date("2026-07-21T00:00:00"),
  color: "#3b82f6",
}

const values = (patch: Record<string, unknown>) => ({ ...VALID, ...patch })

/** Messages raised against one field, in issue order. */
function messagesFor(input: unknown, field: string): string[] {
  const result = taskFormSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message)
}

describe("taskFormSchema", () => {
  describe("a complete task", () => {
    it("accepts the new-task payload", () => {
      const result = taskFormSchema.safeParse(VALID)
      expect(result.success).toBe(true)
    })

    it("accepts edit and schedule modes, which carry no list", () => {
      expect(
        taskFormSchema.safeParse(values({ mode: "edit", groupId: "" })).success
      ).toBe(true)
      expect(
        taskFormSchema.safeParse(values({ mode: "schedule", groupId: "" }))
          .success
      ).toBe(true)
    })

    it("rejects a mode outside the three dialogs", () => {
      const result = taskFormSchema.safeParse(values({ mode: "archive" }))
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.path).toEqual(["mode"])
      }
    })
  })

  describe("title", () => {
    it("requires one", () => {
      expect(messagesFor(values({ title: "" }), "title")).toEqual([
        "Enter a title.",
      ])
    })

    it("does not count whitespace as a title", () => {
      expect(messagesFor(values({ title: "   " }), "title")).toEqual([
        "Enter a title.",
      ])
    })

    it("reports a missing title with the same message", () => {
      expect(messagesFor(values({ title: undefined }), "title")).toEqual([
        "Enter a title.",
      ])
    })

    it(`accepts exactly ${TASK_TITLE_MAX} characters`, () => {
      const result = taskFormSchema.safeParse(
        values({ title: "t".repeat(TASK_TITLE_MAX) })
      )
      expect(result.success).toBe(true)
    })

    it("rejects a longer title", () => {
      expect(
        messagesFor(values({ title: "t".repeat(TASK_TITLE_MAX + 1) }), "title")
      ).toEqual([`Use ${TASK_TITLE_MAX} characters or fewer.`])
    })

    it("trims the saved title", () => {
      const result = taskFormSchema.safeParse(
        values({ title: "  Fix login  " })
      )
      expect(result.success && result.data.title).toBe("Fix login")
    })
  })

  describe("list", () => {
    it("is required for a new task", () => {
      expect(messagesFor(values({ groupId: "" }), "groupId")).toEqual([
        "Choose a list.",
      ])
    })

    it("does not count whitespace as a list", () => {
      expect(messagesFor(values({ groupId: "  " }), "groupId")).toEqual([
        "Choose a list.",
      ])
    })

    it("reports a missing list with the same message", () => {
      expect(messagesFor(values({ groupId: undefined }), "groupId")).toEqual([
        "Choose a list.",
      ])
    })

    it("is not asked for when editing or scheduling", () => {
      expect(
        messagesFor(values({ mode: "edit", groupId: "" }), "groupId")
      ).toEqual([])
      expect(
        messagesFor(values({ mode: "schedule", groupId: "" }), "groupId")
      ).toEqual([])
    })
  })

  describe("status", () => {
    it("accepts every status the board renders", () => {
      for (const status of ["todo", "progress", "review", "done"]) {
        expect(taskFormSchema.safeParse(values({ status })).success).toBe(true)
      }
    })

    it("rejects anything else", () => {
      expect(messagesFor(values({ status: "blocked" }), "status")).toEqual([
        "Choose a status.",
      ])
      expect(messagesFor(values({ status: undefined }), "status")).toEqual([
        "Choose a status.",
      ])
    })
  })

  describe("priority", () => {
    it("accepts every priority the board renders", () => {
      for (const priority of ["low", "normal", "high", "urgent"]) {
        expect(taskFormSchema.safeParse(values({ priority })).success).toBe(
          true
        )
      }
    })

    it("rejects anything else", () => {
      expect(messagesFor(values({ priority: "later" }), "priority")).toEqual([
        "Choose a priority.",
      ])
      expect(messagesFor(values({ priority: undefined }), "priority")).toEqual([
        "Choose a priority.",
      ])
    })
  })

  describe("assignees", () => {
    it("allows an unassigned task", () => {
      const result = taskFormSchema.safeParse(values({ assignees: [] }))
      expect(result.success).toBe(true)
    })

    it("allows several owners", () => {
      const result = taskFormSchema.safeParse(
        values({ assignees: ["Sofia Reyes", "Marcus Chen"] })
      )
      expect(result.success).toBe(true)
    })

    it("rejects a blank name", () => {
      expect(messagesFor(values({ assignees: ["  "] }), "assignees")).toEqual([
        "Choose an assignee.",
      ])
    })

    it("rejects the same owner twice", () => {
      expect(
        messagesFor(
          values({ assignees: ["Sofia Reyes", "Sofia Reyes"] }),
          "assignees"
        )
      ).toEqual(["Each assignee can only be added once."])
    })
  })

  describe("date range", () => {
    it("requires a start date", () => {
      expect(messagesFor(values({ start: undefined }), "start")).toEqual([
        "Choose a start date.",
      ])
      expect(messagesFor(values({ start: "2026-07-19" }), "start")).toEqual([
        "Choose a start date.",
      ])
    })

    it("requires a due date", () => {
      expect(messagesFor(values({ due: undefined }), "due")).toEqual([
        "Choose a due date.",
      ])
      expect(messagesFor(values({ due: "2026-07-21" }), "due")).toEqual([
        "Choose a due date.",
      ])
    })

    it("rejects a due date before the start", () => {
      expect(
        messagesFor(
          values({
            start: new Date("2026-07-21T00:00:00"),
            due: new Date("2026-07-19T00:00:00"),
          }),
          "due"
        )
      ).toEqual(["Due date must be on or after the start date."])
    })

    it("accepts a one-day task that starts and ends the same day", () => {
      const result = taskFormSchema.safeParse(
        values({
          start: new Date("2026-07-19T00:00:00"),
          due: new Date("2026-07-19T00:00:00"),
        })
      )
      expect(result.success).toBe(true)
    })

    it("compares by day, not by clock time", () => {
      const result = taskFormSchema.safeParse(
        values({
          start: new Date("2026-07-19T18:00:00"),
          due: new Date("2026-07-19T09:00:00"),
        })
      )
      expect(result.success).toBe(true)
    })
  })

  describe("color", () => {
    it("requires one", () => {
      expect(messagesFor(values({ color: "" }), "color")).toEqual([
        "Pick a color.",
      ])
      expect(messagesFor(values({ color: undefined }), "color")).toEqual([
        "Pick a color.",
      ])
    })
  })
})
