import { describe, expect, it } from "vitest"

import { CALENDAR_COLOR_OPTIONS } from "@/features/calendar/event-calendar/data"
import {
  CALENDAR_COLOR_VALUES,
  CALENDAR_NAME_MAX,
  calendarFormSchema,
} from "@/features/calendar/lib/calendar-form-schema"

const COLOR = CALENDAR_COLOR_OPTIONS[0].value

/** First message for a field, or undefined when the field is valid. */
function messageFor(
  input: Record<string, unknown>,
  field: string
): string | undefined {
  const result = calendarFormSchema.safeParse(input)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

function values(overrides: Record<string, unknown> = {}) {
  return { name: "Side projects", color: COLOR, ...overrides }
}

describe("calendarFormSchema", () => {
  it("accepts a name and one of the offered colors", () => {
    const result = calendarFormSchema.safeParse(values())
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: "Side projects", color: COLOR })
  })

  it("trims the name it hands back, so the dialog submits a clean value", () => {
    const result = calendarFormSchema.safeParse(values({ name: "  Travel  " }))
    expect(result.data?.name).toBe("Travel")
  })

  it("rejects an empty name", () => {
    expect(messageFor(values({ name: "" }), "name")).toBe(
      "Enter a calendar name."
    )
  })

  it("rejects a name of only spaces, because trim runs first", () => {
    expect(messageFor(values({ name: "   " }), "name")).toBe(
      "Enter a calendar name."
    )
  })

  it("accepts a name at the length limit", () => {
    const name = "n".repeat(CALENDAR_NAME_MAX)
    expect(calendarFormSchema.safeParse(values({ name })).success).toBe(true)
  })

  it("rejects a name past the length limit", () => {
    const name = "n".repeat(CALENDAR_NAME_MAX + 1)
    expect(messageFor(values({ name }), "name")).toBe(
      "Use 40 characters or fewer."
    )
  })

  it("rejects a color that is not one of the swatches", () => {
    expect(messageFor(values({ color: "#bada55" }), "color")).toBe(
      "Choose a color."
    )
  })

  it("accepts every swatch the picker offers", () => {
    for (const color of CALENDAR_COLOR_VALUES) {
      expect(calendarFormSchema.safeParse(values({ color })).success).toBe(true)
    }
  })

  it("reports both fields at once when both are wrong", () => {
    const result = calendarFormSchema.safeParse({ name: " ", color: "nope" })
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message).sort()).toEqual([
      "Choose a color.",
      "Enter a calendar name.",
    ])
  })
})
