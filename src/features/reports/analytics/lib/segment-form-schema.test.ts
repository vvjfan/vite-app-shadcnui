import { describe, expect, it } from "vitest"

import { buildSegmentRow } from "@/features/reports/analytics/lib/segments"
import {
  DROP_OFF_MAX,
  RISK_VALUES,
  SEGMENT_NAME_MAX,
  SEGMENT_TEXT_MAX,
  segmentFormSchema,
  WHOLE_NUMBER_MESSAGE,
} from "@/features/reports/analytics/lib/segment-form-schema"

function values(overrides: Record<string, unknown> = {}) {
  return {
    segment: "Self-serve trials",
    cohort: "May activation cohort",
    owner: "Mira Stone",
    accountCreated: "120",
    inviteSent: "80",
    savedReport: "40",
    weekFourRetained: "20",
    dropOff: "35",
    risk: "watch",
    ...overrides,
  }
}

/** First message for a field, or undefined when the field is valid. */
function messageFor(
  overrides: Record<string, unknown>,
  field: string
): string | undefined {
  const result = segmentFormSchema.safeParse(values(overrides))
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("segmentFormSchema", () => {
  it("accepts a filled in segment", () => {
    expect(segmentFormSchema.safeParse(values()).success).toBe(true)
  })

  it("trims the text it hands back", () => {
    const result = segmentFormSchema.safeParse(
      values({ segment: "  Trials  ", cohort: "  May  ", owner: "  Mira  " })
    )
    expect(result.data).toMatchObject({
      segment: "Trials",
      cohort: "May",
      owner: "Mira",
    })
  })

  // ── Segment name ──

  it("rejects an empty segment name", () => {
    expect(messageFor({ segment: "" }, "segment")).toBe("Enter a segment name.")
  })

  it("rejects a segment name of only spaces", () => {
    expect(messageFor({ segment: "   " }, "segment")).toBe(
      "Enter a segment name."
    )
  })

  it("rejects a segment name past the length limit", () => {
    expect(
      messageFor({ segment: "s".repeat(SEGMENT_NAME_MAX + 1) }, "segment")
    ).toBe("Use 60 characters or fewer.")
  })

  // ── Optional text ──

  it("accepts an empty cohort and owner", () => {
    expect(
      segmentFormSchema.safeParse(values({ cohort: "", owner: "" })).success
    ).toBe(true)
  })

  it("rejects a cohort or owner past the length limit", () => {
    const tooLong = "x".repeat(SEGMENT_TEXT_MAX + 1)
    expect(messageFor({ cohort: tooLong }, "cohort")).toBe(
      "Use 60 characters or fewer."
    )
    expect(messageFor({ owner: tooLong }, "owner")).toBe(
      "Use 60 characters or fewer."
    )
  })

  // ── Stage counts ──

  it("accepts an empty count, which submits as 0", () => {
    const parsed = segmentFormSchema.parse(values({ accountCreated: "" }))
    expect(parsed.accountCreated).toBe("")
    // The schema lets it through; the row builder is what turns it into 0.
    expect(buildSegmentRow(parsed, null)).toMatchObject({ accountCreated: 0 })
  })

  it("accepts zero", () => {
    expect(
      segmentFormSchema.safeParse(values({ inviteSent: "0" })).success
    ).toBe(true)
  })

  it("rejects a negative count", () => {
    expect(messageFor({ inviteSent: "-4" }, "inviteSent")).toBe(
      WHOLE_NUMBER_MESSAGE
    )
  })

  it("rejects a fractional count", () => {
    expect(messageFor({ savedReport: "1.5" }, "savedReport")).toBe(
      WHOLE_NUMBER_MESSAGE
    )
  })

  it("rejects text in a count", () => {
    expect(messageFor({ weekFourRetained: "many" }, "weekFourRetained")).toBe(
      WHOLE_NUMBER_MESSAGE
    )
  })

  it("checks every count field", () => {
    const result = segmentFormSchema.safeParse(
      values({
        accountCreated: "a",
        inviteSent: "b",
        savedReport: "c",
        weekFourRetained: "d",
      })
    )
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0]).sort()).toEqual([
      "accountCreated",
      "inviteSent",
      "savedReport",
      "weekFourRetained",
    ])
  })

  // ── Drop-off ──

  it("accepts a drop-off at each end of the range", () => {
    expect(segmentFormSchema.safeParse(values({ dropOff: "0" })).success).toBe(
      true
    )
    expect(
      segmentFormSchema.safeParse(values({ dropOff: String(DROP_OFF_MAX) }))
        .success
    ).toBe(true)
  })

  it("rejects a drop-off over 100", () => {
    expect(messageFor({ dropOff: "101" }, "dropOff")).toBe("Enter 0 to 100.")
  })

  it("rejects a negative drop-off with the whole-number message", () => {
    expect(messageFor({ dropOff: "-1" }, "dropOff")).toBe(WHOLE_NUMBER_MESSAGE)
  })

  it("accepts an empty drop-off, which submits as 0%", () => {
    expect(segmentFormSchema.safeParse(values({ dropOff: "" })).success).toBe(
      true
    )
  })

  // ── Risk ──

  it("accepts every risk state the picker offers", () => {
    for (const risk of RISK_VALUES) {
      expect(segmentFormSchema.safeParse(values({ risk })).success).toBe(true)
    }
  })

  it("rejects an unknown risk state", () => {
    expect(messageFor({ risk: "on_fire" }, "risk")).toBe("Choose a risk state.")
  })
})
