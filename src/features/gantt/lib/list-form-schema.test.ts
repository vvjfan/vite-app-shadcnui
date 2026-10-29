import { describe, expect, it } from "vitest"

import {
  LIST_TITLE_MAX,
  listFormSchema,
} from "@/features/gantt/lib/list-form-schema"

/** Messages raised against the only field the list dialog has. */
function messagesFor(input: unknown): string[] {
  const result = listFormSchema.safeParse(input)
  if (result.success) return []
  return result.error.issues.map((issue) => issue.message)
}

describe("listFormSchema", () => {
  it("accepts a named list", () => {
    const result = listFormSchema.safeParse({ title: "Release 3.2" })
    expect(result.success).toBe(true)
  })

  it("requires a name", () => {
    expect(messagesFor({ title: "" })).toEqual(["Enter a list name."])
  })

  it("does not count whitespace as a name", () => {
    expect(messagesFor({ title: "   " })).toEqual(["Enter a list name."])
  })

  it("reports a missing name with the same message", () => {
    expect(messagesFor({})).toEqual(["Enter a list name."])
    expect(messagesFor({ title: 42 })).toEqual(["Enter a list name."])
  })

  it(`accepts exactly ${LIST_TITLE_MAX} characters`, () => {
    const result = listFormSchema.safeParse({
      title: "l".repeat(LIST_TITLE_MAX),
    })
    expect(result.success).toBe(true)
  })

  it("rejects a longer name", () => {
    expect(messagesFor({ title: "l".repeat(LIST_TITLE_MAX + 1) })).toEqual([
      `Use ${LIST_TITLE_MAX} characters or fewer.`,
    ])
  })

  it("trims the saved name", () => {
    const result = listFormSchema.safeParse({ title: "  Backlog  " })
    expect(result.success && result.data.title).toBe("Backlog")
  })

  it("reports the field the message belongs to", () => {
    const result = listFormSchema.safeParse({ title: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["title"])
    }
  })
})
