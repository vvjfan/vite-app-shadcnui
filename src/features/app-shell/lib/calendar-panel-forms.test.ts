import { describe, expect, it } from "vitest"
import type { z } from "zod"

import {
  COLOR_OPTIONS,
  toDayKey,
  UPCOMING_EVENTS,
} from "@/features/app-shell/components/data"
import {
  accountFormSchema,
  calendarItemFormSchema,
  CALENDAR_COLOR_VALUES,
  eventFormSchema,
  EMAIL_PATTERN,
  formatMinutes,
  normalizeTime,
  parseDayKey,
  parseTimeToMinutes,
} from "@/features/app-shell/lib/calendar-panel-forms"
import type { EventFormValues } from "@/features/app-shell/lib/calendar-panel-forms"

/** Every message the schema produced, grouped by the field it was reported on. */
function errorsByField(
  schema: z.ZodType<unknown, unknown>,
  value: unknown
): Record<string, string[]> {
  const result = schema.safeParse(value)
  if (result.success) return {}
  const grouped: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "(form)"
    grouped[key] = [...(grouped[key] ?? []), issue.message]
  }
  return grouped
}

const BLUE = COLOR_OPTIONS[0].value

// ── parseTimeToMinutes ──

describe("parseTimeToMinutes", () => {
  it("reads the canonical h:mm AM/PM form", () => {
    expect(parseTimeToMinutes("9:00 AM")).toBe(540)
    expect(parseTimeToMinutes("9:30 AM")).toBe(570)
    expect(parseTimeToMinutes("1:00 PM")).toBe(780)
    expect(parseTimeToMinutes("11:59 PM")).toBe(1439)
  })

  it("puts 12 AM at midnight and 12 PM at noon", () => {
    expect(parseTimeToMinutes("12:00 AM")).toBe(0)
    expect(parseTimeToMinutes("12:30 AM")).toBe(30)
    expect(parseTimeToMinutes("12:00 PM")).toBe(720)
    expect(parseTimeToMinutes("12:45 PM")).toBe(765)
  })

  it("tolerates casing, padding, a missing space and missing minutes", () => {
    expect(parseTimeToMinutes("09:05 am")).toBe(545)
    expect(parseTimeToMinutes("9:00am")).toBe(540)
    expect(parseTimeToMinutes("  9:00 AM  ")).toBe(540)
    expect(parseTimeToMinutes("9 AM")).toBe(540)
    expect(parseTimeToMinutes("9 pM")).toBe(1260)
  })

  it("rejects hours and minutes outside the 12-hour clock", () => {
    expect(parseTimeToMinutes("13:00 PM")).toBeNull()
    expect(parseTimeToMinutes("0:30 AM")).toBeNull()
    expect(parseTimeToMinutes("9:60 AM")).toBeNull()
    expect(parseTimeToMinutes("9:5 AM")).toBeNull()
  })

  it("requires a meridiem, and rejects anything that is not a time", () => {
    expect(parseTimeToMinutes("9:00")).toBeNull()
    expect(parseTimeToMinutes("21:00")).toBeNull()
    expect(parseTimeToMinutes("9:00 XM")).toBeNull()
    expect(parseTimeToMinutes("morning")).toBeNull()
    expect(parseTimeToMinutes("")).toBeNull()
  })
})

// ── formatMinutes / normalizeTime ──

describe("formatMinutes", () => {
  it("renders the canonical form, including both noons", () => {
    expect(formatMinutes(0)).toBe("12:00 AM")
    expect(formatMinutes(5)).toBe("12:05 AM")
    expect(formatMinutes(540)).toBe("9:00 AM")
    expect(formatMinutes(720)).toBe("12:00 PM")
    expect(formatMinutes(1439)).toBe("11:59 PM")
  })

  it("wraps around the day rather than producing a 24th hour", () => {
    expect(formatMinutes(1440)).toBe("12:00 AM")
    expect(formatMinutes(-60)).toBe("11:00 PM")
  })
})

describe("normalizeTime", () => {
  it("canonicalizes an accepted time", () => {
    expect(normalizeTime("9 am")).toBe("9:00 AM")
    expect(normalizeTime("09:05 pm")).toBe("9:05 PM")
    expect(normalizeTime(" 12:00am ")).toBe("12:00 AM")
  })

  it("leaves every seeded event time exactly as it is", () => {
    for (const event of UPCOMING_EVENTS) {
      expect(normalizeTime(event.startTime)).toBe(event.startTime)
      expect(normalizeTime(event.endTime)).toBe(event.endTime)
    }
  })

  it("returns null for a string that was never a time", () => {
    expect(normalizeTime("noon-ish")).toBeNull()
  })
})

// ── parseDayKey ──

describe("parseDayKey", () => {
  it("reads a day key at local midnight", () => {
    const date = parseDayKey("2026-07-25")
    expect(date).not.toBeNull()
    expect(date!.getFullYear()).toBe(2026)
    expect(date!.getMonth()).toBe(6)
    expect(date!.getDate()).toBe(25)
    // Local midnight, not a UTC instant: `new Date("2026-07-25")` lands at the
    // zone's offset (05:00 in +05:00) or on the previous day behind UTC.
    expect(date!.getHours()).toBe(0)
    expect(date!.getMinutes()).toBe(0)
  })

  it("round-trips through toDayKey, the writer the calendar uses", () => {
    for (const key of ["2026-01-01", "2026-02-28", "2026-12-31"]) {
      expect(toDayKey(parseDayKey(key)!)).toBe(key)
    }
  })

  it("rejects a day that does not exist instead of rolling it forward", () => {
    expect(parseDayKey("2026-02-30")).toBeNull()
    expect(parseDayKey("2026-04-31")).toBeNull()
    expect(parseDayKey("2026-13-01")).toBeNull()
    expect(parseDayKey("2026-00-10")).toBeNull()
    expect(parseDayKey("2026-01-00")).toBeNull()
  })

  it("accepts a real leap day and rejects a fake one", () => {
    expect(parseDayKey("2028-02-29")).not.toBeNull()
    expect(parseDayKey("2026-02-29")).toBeNull()
  })

  it("rejects anything that is not a padded yyyy-mm-dd key", () => {
    expect(parseDayKey("2026-7-25")).toBeNull()
    expect(parseDayKey("25/07/2026")).toBeNull()
    expect(parseDayKey("2026-07-25T00:00:00")).toBeNull()
    expect(parseDayKey("")).toBeNull()
    // Two-digit years map into the 1900s in the Date constructor, so "0099"
    // would silently become 1999 without the round-trip check.
    expect(parseDayKey("0099-01-01")).toBeNull()
  })
})

// ── Calendar form ──

describe("calendarItemFormSchema", () => {
  it("accepts a name and a known color, trimming the name", () => {
    const result = calendarItemFormSchema.safeParse({
      label: "  Side projects  ",
      color: BLUE,
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ label: "Side projects", color: BLUE })
  })

  it("requires a name", () => {
    expect(
      errorsByField(calendarItemFormSchema, { label: "", color: BLUE })
    ).toEqual({ label: ["Enter a calendar name."] })
    expect(
      errorsByField(calendarItemFormSchema, { label: "   ", color: BLUE })
    ).toEqual({ label: ["Enter a calendar name."] })
  })

  it("caps the name at 60 characters, measured after trimming", () => {
    expect(
      calendarItemFormSchema.safeParse({ label: "a".repeat(60), color: BLUE })
        .success
    ).toBe(true)
    expect(
      calendarItemFormSchema.safeParse({
        label: ` ${"a".repeat(60)} `,
        color: BLUE,
      }).success
    ).toBe(true)
    expect(
      errorsByField(calendarItemFormSchema, {
        label: "a".repeat(61),
        color: BLUE,
      })
    ).toEqual({ label: ["Use 60 characters or fewer."] })
  })

  it("only accepts colors the picker offers", () => {
    for (const value of CALENDAR_COLOR_VALUES) {
      expect(
        calendarItemFormSchema.safeParse({ label: "Work", color: value })
          .success
      ).toBe(true)
    }
    expect(
      errorsByField(calendarItemFormSchema, { label: "Work", color: "#123456" })
    ).toEqual({ color: ["Pick a color."] })
  })
})

// ── Account form ──

describe("accountFormSchema", () => {
  it("accepts an address, trimming it", () => {
    const result = accountFormSchema.safeParse({ email: "  you@company.io " })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ email: "you@company.io" })
  })

  it("requires an address, and says so once", () => {
    expect(errorsByField(accountFormSchema, { email: "" })).toEqual({
      email: ["Enter an email address."],
    })
    expect(errorsByField(accountFormSchema, { email: "   " })).toEqual({
      email: ["Enter an email address."],
    })
  })

  it("rejects an address that is not one", () => {
    for (const email of [
      "you",
      "you@company",
      "you company@x.io",
      "@company.io",
    ]) {
      expect(errorsByField(accountFormSchema, { email })).toEqual({
        email: ["Enter a valid email address."],
      })
    }
  })

  it("applies the same rule the sign-in form applies", () => {
    expect(EMAIL_PATTERN.test("you@company.io")).toBe(true)
    expect(EMAIL_PATTERN.test("you@company")).toBe(false)
  })
})

// ── Event form ──

function eventValues(
  overrides: Partial<EventFormValues> = {}
): EventFormValues {
  return {
    title: "Design review",
    date: "2026-07-25",
    startTime: "9:00 AM",
    endTime: "9:30 AM",
    calendarColor: BLUE,
    ...overrides,
  }
}

describe("eventFormSchema", () => {
  it("accepts a complete event, trimming the text fields", () => {
    const result = eventFormSchema.safeParse(
      eventValues({ title: "  Design review  ", startTime: " 9:00 AM " })
    )
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      title: "Design review",
      date: "2026-07-25",
      startTime: "9:00 AM",
      endTime: "9:30 AM",
      calendarColor: BLUE,
    })
  })

  it("requires a title and caps it at 80 characters", () => {
    expect(
      errorsByField(eventFormSchema, eventValues({ title: "  " }))
    ).toEqual({
      title: ["Enter a title."],
    })
    expect(
      eventFormSchema.safeParse(eventValues({ title: "a".repeat(80) })).success
    ).toBe(true)
    expect(
      errorsByField(eventFormSchema, eventValues({ title: "a".repeat(81) }))
    ).toEqual({ title: ["Use 80 characters or fewer."] })
  })

  it("requires a date, and requires it to be a real day", () => {
    expect(errorsByField(eventFormSchema, eventValues({ date: "" }))).toEqual({
      date: ["Pick a date."],
    })
    expect(
      errorsByField(eventFormSchema, eventValues({ date: "2026-02-30" }))
    ).toEqual({ date: ["Enter a valid date."] })
    expect(
      errorsByField(eventFormSchema, eventValues({ date: "July 25, 2026" }))
    ).toEqual({ date: ["Enter a valid date."] })
  })

  it("requires both times", () => {
    expect(
      errorsByField(eventFormSchema, eventValues({ startTime: "" }))
    ).toEqual({ startTime: ["Enter a start time."] })
    expect(
      errorsByField(eventFormSchema, eventValues({ endTime: "" }))
    ).toEqual({
      endTime: ["Enter an end time."],
    })
  })

  it("requires both times to be readable", () => {
    expect(
      errorsByField(eventFormSchema, eventValues({ startTime: "morning" }))
    ).toEqual({ startTime: ["Enter a time like 9:00 AM."] })
    expect(
      errorsByField(eventFormSchema, eventValues({ endTime: "25:00 PM" }))
    ).toEqual({ endTime: ["Enter a time like 9:00 AM."] })
  })

  it("requires the end time to be after the start time", () => {
    expect(
      errorsByField(
        eventFormSchema,
        eventValues({ startTime: "2:00 PM", endTime: "1:00 PM" })
      )
    ).toEqual({ endTime: ["End time must be after the start time."] })
  })

  it("rejects an end time equal to the start time", () => {
    expect(
      errorsByField(
        eventFormSchema,
        eventValues({ startTime: "9:00 AM", endTime: "9:00 AM" })
      )
    ).toEqual({ endTime: ["End time must be after the start time."] })
  })

  it("compares the times on the 24-hour clock, not on the printed digits", () => {
    // 11:00 AM -> 12:30 PM reads as a smaller hour but is later in the day.
    expect(
      eventFormSchema.safeParse(
        eventValues({ startTime: "11:00 AM", endTime: "12:30 PM" })
      ).success
    ).toBe(true)
    // 12:30 AM is half past midnight, so this one really does run backwards.
    expect(
      errorsByField(
        eventFormSchema,
        eventValues({ startTime: "11:00 PM", endTime: "12:30 AM" })
      )
    ).toEqual({ endTime: ["End time must be after the start time."] })
  })

  it("skips the comparison while a time is still unreadable", () => {
    expect(
      errorsByField(
        eventFormSchema,
        eventValues({ startTime: "2:00 PM", endTime: "" })
      )
    ).toEqual({ endTime: ["Enter an end time."] })
    expect(
      errorsByField(
        eventFormSchema,
        eventValues({ startTime: "later", endTime: "1:00 PM" })
      )
    ).toEqual({ startTime: ["Enter a time like 9:00 AM."] })
  })

  it("only accepts colors the picker offers", () => {
    expect(
      errorsByField(eventFormSchema, eventValues({ calendarColor: "red" }))
    ).toEqual({ calendarColor: ["Pick a color."] })
  })

  it("accepts every seeded event unchanged", () => {
    for (const event of UPCOMING_EVENTS) {
      expect(
        eventFormSchema.safeParse({
          title: event.title,
          date: event.date,
          startTime: event.startTime,
          endTime: event.endTime,
          calendarColor: event.calendarColor,
        }).success
      ).toBe(true)
    }
  })

  it("reports every broken field at once", () => {
    expect(
      errorsByField(
        eventFormSchema,
        eventValues({ title: "", date: "", startTime: "", endTime: "" })
      )
    ).toEqual({
      title: ["Enter a title."],
      date: ["Pick a date."],
      startTime: ["Enter a start time."],
      endTime: ["Enter an end time."],
    })
  })
})
