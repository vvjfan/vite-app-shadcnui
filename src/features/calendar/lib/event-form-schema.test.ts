import { describe, expect, it } from "vitest"

import {
  EVENT_DESCRIPTION_MAX,
  EVENT_LOCATION_MAX,
  EVENT_TITLE_MAX,
  eventFormSchema,
} from "@/features/calendar/lib/event-form-schema"

function values(overrides: Record<string, unknown> = {}) {
  return {
    title: "Design review",
    calendarId: "work",
    allDay: false,
    date: "2026-07-25",
    dateEnd: "2026-07-25",
    start: "09:00",
    end: "10:00",
    location: "",
    description: "",
    attendees: [],
    ...overrides,
  }
}

/** First message for a field, or undefined when the field is valid. */
function messageFor(
  overrides: Record<string, unknown>,
  field: string
): string | undefined {
  const result = eventFormSchema.safeParse(values(overrides))
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("eventFormSchema", () => {
  it("accepts a filled in timed event", () => {
    const result = eventFormSchema.safeParse(values())
    expect(result.success).toBe(true)
  })

  it("trims the text it hands back", () => {
    const result = eventFormSchema.safeParse(
      values({
        title: "  Standup  ",
        location: "  Room 2  ",
        description: "  Agenda  ",
      })
    )
    expect(result.data).toMatchObject({
      title: "Standup",
      location: "Room 2",
      description: "Agenda",
    })
  })

  // ── Title ──

  it("rejects an empty title", () => {
    expect(messageFor({ title: "" }, "title")).toBe("Enter a title.")
  })

  it("rejects a title of only spaces", () => {
    expect(messageFor({ title: "   " }, "title")).toBe("Enter a title.")
  })

  it("rejects a title past the length limit", () => {
    expect(
      messageFor({ title: "t".repeat(EVENT_TITLE_MAX + 1) }, "title")
    ).toBe("Use 80 characters or fewer.")
  })

  it("accepts a title at the length limit", () => {
    expect(
      eventFormSchema.safeParse(values({ title: "t".repeat(EVENT_TITLE_MAX) }))
        .success
    ).toBe(true)
  })

  // ── Calendar ──

  it("rejects a missing calendar", () => {
    expect(messageFor({ calendarId: "" }, "calendarId")).toBe(
      "Choose a calendar."
    )
  })

  // ── Dates and times ──

  it("rejects a date that is not yyyy-MM-dd", () => {
    expect(messageFor({ date: "25/07/2026" }, "date")).toBe(
      "Choose a start date."
    )
    expect(messageFor({ dateEnd: "" }, "dateEnd")).toBe("Choose an end date.")
  })

  it("rejects a time that is not HH:mm", () => {
    expect(messageFor({ start: "9am" }, "start")).toBe("Choose a start time.")
    expect(messageFor({ end: "24:00" }, "end")).toBe("Choose an end time.")
  })

  it("rejects an end date before the start date", () => {
    expect(messageFor({ dateEnd: "2026-07-24" }, "dateEnd")).toBe(
      "End date must be on or after the start date."
    )
  })

  it("reports a backwards span once, on the end date", () => {
    const result = eventFormSchema.safeParse(
      values({ dateEnd: "2026-07-24", start: "10:00", end: "09:00" })
    )
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "End date must be on or after the start date.",
    ])
  })

  it("rejects an end time that is not after the start time", () => {
    expect(messageFor({ start: "10:00", end: "09:00" }, "end")).toBe(
      "End time must be after the start time."
    )
  })

  it("rejects an end time equal to the start time", () => {
    expect(messageFor({ start: "10:00", end: "10:00" }, "end")).toBe(
      "End time must be after the start time."
    )
  })

  it("accepts an earlier end time when the event ends on a later day", () => {
    const result = eventFormSchema.safeParse(
      values({
        date: "2026-07-25",
        dateEnd: "2026-07-26",
        start: "23:00",
        end: "01:00",
      })
    )
    expect(result.success).toBe(true)
  })

  it("ignores the times for an all-day event", () => {
    const result = eventFormSchema.safeParse(
      values({ allDay: true, start: "10:00", end: "09:00" })
    )
    expect(result.success).toBe(true)
  })

  it("still checks the dates for an all-day event", () => {
    expect(messageFor({ allDay: true, dateEnd: "2026-07-24" }, "dateEnd")).toBe(
      "End date must be on or after the start date."
    )
  })

  // ── Optional text ──

  it("accepts empty optional fields and no guests", () => {
    const result = eventFormSchema.safeParse(
      values({ location: "", description: "", attendees: [] })
    )
    expect(result.success).toBe(true)
  })

  it("rejects a location past the length limit", () => {
    expect(
      messageFor({ location: "x".repeat(EVENT_LOCATION_MAX + 1) }, "location")
    ).toBe("Use 120 characters or fewer.")
  })

  it("rejects a description past the length limit", () => {
    expect(
      messageFor(
        { description: "x".repeat(EVENT_DESCRIPTION_MAX + 1) },
        "description"
      )
    ).toBe("Use 2000 characters or fewer.")
  })

  it("keeps the guest ids it was given", () => {
    const result = eventFormSchema.safeParse(
      values({ attendees: ["person-1", "person-2"] })
    )
    expect(result.data?.attendees).toEqual(["person-1", "person-2"])
  })
})
