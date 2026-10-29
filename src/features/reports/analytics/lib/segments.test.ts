import { describe, expect, it } from "vitest"

import { stageBreakdownRows } from "@/features/reports/analytics/components/data"
import type {
  RiskState,
  SegmentKey,
  StageBreakdownRow,
} from "@/features/reports/analytics/components/data"
import {
  buildSegmentRow,
  canSubmitSegment,
  deleteSegment,
  dropOffToNumber,
  formatPercent,
  getRows,
  initialsFor,
  newSegmentId,
  SEGMENT_ROWS,
  segmentAfterSubmit,
  segmentExists,
  segmentIdFrom,
  toCount,
  upsertSegment,
} from "@/features/reports/analytics/lib/segments"
import type { SegmentFormValues } from "@/features/reports/analytics/lib/segments"

// ── Fixtures ──

function row(overrides: Partial<StageBreakdownRow> = {}): StageBreakdownRow {
  return {
    id: "SEG-307",
    segment: "Trial workspaces over 20 seats",
    cohort: "May activation cohort",
    owner: "Mira Stone",
    ownerAvatar: "https://example.test/mira.jpg",
    ownerInitials: "MS",
    accountCreated: 1000,
    inviteSent: 700,
    savedReport: 500,
    weekFourRetained: 250,
    dropOff: "42%",
    risk: "healthy",
    updatedAt: "8 min ago",
    ...overrides,
  }
}

function values(overrides: Partial<SegmentFormValues> = {}): SegmentFormValues {
  return {
    segment: "New segment",
    cohort: "July cohort",
    owner: "Mira Stone",
    accountCreated: "100",
    inviteSent: "80",
    savedReport: "60",
    weekFourRetained: "40",
    dropOff: "20",
    risk: "healthy",
    ...overrides,
  }
}

const SEGMENT_KEYS: SegmentKey[] = ["organic", "partner", "sales", "imported"]

// ── The segment filter ──

describe("getRows", () => {
  it("returns every row for the all filter", () => {
    expect(getRows(stageBreakdownRows, "all")).toHaveLength(
      stageBreakdownRows.length
    )
  })

  // "all" hands the array straight back rather than copying it. useReactTable
  // rebuilds its whole row model when the data identity changes, so a fresh
  // array on every render would be wasted work. Nothing downstream mutates it.
  it("hands back the same array for the all filter", () => {
    expect(getRows(stageBreakdownRows, "all")).toBe(stageBreakdownRows)
  })

  it.each(SEGMENT_KEYS)("keeps only the %s bucket's rows", (segment) => {
    const result = getRows(stageBreakdownRows, segment)
    expect(result.map((r) => r.id).sort()).toEqual(
      [...SEGMENT_ROWS[segment]].sort()
    )
  })

  // Every seed row must live in exactly one bucket, or a row would be reachable
  // only through "All Segments" and look like it had been deleted.
  it("partitions the seed rows across the four buckets", () => {
    const bucketed = SEGMENT_KEYS.flatMap((key) => SEGMENT_ROWS[key])
    expect(new Set(bucketed).size).toBe(bucketed.length)
    expect(bucketed.sort()).toEqual(stageBreakdownRows.map((r) => r.id).sort())
  })

  it("returns an empty list when the bucket's rows have all been deleted", () => {
    const remaining = deleteSegment(stageBreakdownRows, "MET-609")
    expect(getRows(remaining, "sales")).toEqual([])
  })

  it("returns a new array for a specific segment and never mutates the source", () => {
    const result = getRows(stageBreakdownRows, "organic")
    expect(result).not.toBe(stageBreakdownRows)
    expect(stageBreakdownRows).toHaveLength(6)
  })

  // BUG: SEGMENT_ROWS is a frozen id allowlist, so a segment created at runtime
  // belongs to no bucket and disappears the moment the filter is anything but
  // "All Segments". The grid papers over this by resetting the filter to "all"
  // on create (see segmentAfterSubmit), but the row is still unreachable from
  // every other option, and the row's own name has no bearing on which bucket
  // it lands in. Pinned as-is.
  it("hides a newly created row from every segment bucket", () => {
    const created = buildSegmentRow(values({ segment: "Organic trials" }), null)
    const rows = upsertSegment(stageBreakdownRows, created)
    expect(getRows(rows, "all")).toContain(created)
    for (const key of SEGMENT_KEYS) {
      expect(getRows(rows, key)).not.toContain(created)
    }
  })
})

describe("formatPercent", () => {
  it("reads a stage count as a share of the cohort", () => {
    expect(formatPercent(50, 100)).toBe("50%")
    expect(formatPercent(1046, 1428)).toBe("73%")
  })

  it("rounds to the nearest whole percent", () => {
    expect(formatPercent(1, 3)).toBe("33%")
    expect(formatPercent(2, 3)).toBe("67%")
  })

  // A row with no accounts would otherwise render "NaN%" in every stage cell.
  it("returns 0% rather than NaN% when the cohort is empty", () => {
    expect(formatPercent(0, 0)).toBe("0%")
    expect(formatPercent(42, 0)).toBe("0%")
  })

  it("handles a zero numerator", () => {
    expect(formatPercent(0, 500)).toBe("0%")
  })

  // Stage counts are typed by hand in the sheet, so a stage can exceed the
  // cohort it is measured against. The value is shown, not clamped.
  it("reports over 100% when a stage exceeds the cohort", () => {
    expect(formatPercent(150, 100)).toBe("150%")
  })

  it("formats every stage of every seed row", () => {
    for (const seed of stageBreakdownRows) {
      for (const stage of [
        seed.inviteSent,
        seed.savedReport,
        seed.weekFourRetained,
      ]) {
        expect(formatPercent(stage, seed.accountCreated)).toMatch(/^\d+%$/)
      }
    }
  })
})

// ── Sheet form model ──

describe("initialsFor", () => {
  it("takes the first and last initial of a full name", () => {
    expect(initialsFor("Mira Stone")).toBe("MS")
  })

  // A middle name must not push the surname's initial out, or "Ada B Lovelace"
  // would read "AB" next to a row owned by "Ada Byron".
  it("skips middle names", () => {
    expect(initialsFor("Ada Byron Lovelace")).toBe("AL")
  })

  it("takes the first two letters of a single name", () => {
    expect(initialsFor("Kenji")).toBe("KE")
  })

  it("uppercases whatever it derives", () => {
    expect(initialsFor("mira stone")).toBe("MS")
    expect(initialsFor("kenji")).toBe("KE")
  })

  it("collapses stray whitespace", () => {
    expect(initialsFor("  Mira   Stone  ")).toBe("MS")
  })

  it("falls back to ? for an empty or whitespace name", () => {
    expect(initialsFor("")).toBe("?")
    expect(initialsFor("   ")).toBe("?")
  })

  it("reproduces the initials the seed rows ship with", () => {
    for (const seed of stageBreakdownRows) {
      expect(initialsFor(seed.owner)).toBe(seed.ownerInitials)
    }
  })
})

describe("dropOffToNumber", () => {
  it("strips the percent sign for the number input", () => {
    expect(dropOffToNumber("42%")).toBe("42")
  })

  it("passes a bare number through", () => {
    expect(dropOffToNumber("0")).toBe("0")
  })

  it("returns an empty string when there is no number to show", () => {
    expect(dropOffToNumber("")).toBe("")
    expect(dropOffToNumber("n/a")).toBe("")
  })

  it("keeps a leading minus", () => {
    expect(dropOffToNumber("-5%")).toBe("-5")
  })

  it("round-trips every seed row's drop-off", () => {
    for (const seed of stageBreakdownRows) {
      expect(`${dropOffToNumber(seed.dropOff)}%`).toBe(seed.dropOff)
    }
  })
})

describe("toCount", () => {
  it("parses a typed count", () => {
    expect(toCount("1428")).toBe(1428)
  })

  it("treats an emptied or unparseable input as zero", () => {
    expect(toCount("")).toBe(0)
    expect(toCount("abc")).toBe(0)
  })

  // min={0} on a number input is advisory, so a pasted negative is clamped
  // rather than trusted.
  it("clamps a negative count to zero", () => {
    expect(toCount("-5")).toBe(0)
  })

  it("truncates a decimal rather than rounding it", () => {
    expect(toCount("12.9")).toBe(12)
  })

  // BUG: a number input accepts exponent notation, and parseInt stops at the
  // "e", so typing 1e3 stores 1 instead of 1000 with no warning. Pinned as-is.
  it("keeps only the mantissa of exponent notation", () => {
    expect(toCount("1e3")).toBe(1)
  })
})

describe("segment ids", () => {
  it("formats an id from the low six digits of the sequence", () => {
    expect(segmentIdFrom(1771234567890)).toBe("SEG-567890")
  })

  it("mints a distinct id on every call", () => {
    const ids = Array.from({ length: 200 }, () => newSegmentId())
    expect(new Set(ids).size).toBe(ids.length)
  })

  // A generated id colliding with a seed id would be misread as an update, so
  // the create would silently overwrite an existing row.
  it("never collides with a seed row id", () => {
    const seedIds = new Set(stageBreakdownRows.map((r) => r.id))
    for (let i = 0; i < 200; i += 1) {
      const id = newSegmentId()
      expect(seedIds.has(id)).toBe(false)
      expect(id).toMatch(/^SEG-\d{6}$/)
    }
  })
})

describe("canSubmitSegment", () => {
  it("requires a non-blank segment name", () => {
    expect(canSubmitSegment("Trials")).toBe(true)
    expect(canSubmitSegment("")).toBe(false)
    expect(canSubmitSegment("   ")).toBe(false)
  })
})

describe("buildSegmentRow", () => {
  it("mints a fresh id for a create", () => {
    const created = buildSegmentRow(values(), null)
    expect(created.id).toMatch(/^SEG-\d{6}$/)
    expect(buildSegmentRow(values(), null).id).not.toBe(created.id)
  })

  it("keeps the id of the row being edited so the upsert replaces in place", () => {
    expect(buildSegmentRow(values(), row()).id).toBe("SEG-307")
  })

  it("trims the text fields", () => {
    const built = buildSegmentRow(
      values({ segment: "  Trials  ", cohort: "  July  ", owner: "  Mira  " }),
      null
    )
    expect(built.segment).toBe("Trials")
    expect(built.cohort).toBe("July")
    expect(built.owner).toBe("Mira")
  })

  it("names an ownerless row Unassigned", () => {
    const built = buildSegmentRow(values({ owner: "   " }), null)
    expect(built.owner).toBe("Unassigned")
    expect(built.ownerInitials).toBe("UN")
  })

  // The portrait belongs to the person who was named before, so keeping it
  // through a rename would show one owner's face beside another's name.
  it("drops the portrait when the owner is renamed", () => {
    const built = buildSegmentRow(values({ owner: "Leo Grant" }), row())
    expect(built.ownerAvatar).toBe("")
    expect(built.ownerInitials).toBe("LG")
  })

  it("keeps the portrait when the owner name is untouched", () => {
    const base = row()
    const built = buildSegmentRow(values({ owner: base.owner }), base)
    expect(built.ownerAvatar).toBe(base.ownerAvatar)
  })

  it("has no portrait to keep on a create", () => {
    expect(buildSegmentRow(values(), null).ownerAvatar).toBe("")
  })

  it("coerces and clamps every stage count", () => {
    const built = buildSegmentRow(
      values({
        accountCreated: "1428",
        inviteSent: "",
        savedReport: "-9",
        weekFourRetained: "abc",
      }),
      null
    )
    expect(built.accountCreated).toBe(1428)
    expect(built.inviteSent).toBe(0)
    expect(built.savedReport).toBe(0)
    expect(built.weekFourRetained).toBe(0)
  })

  it("stores the drop-off back as a percent string", () => {
    expect(buildSegmentRow(values({ dropOff: "37" }), null).dropOff).toBe("37%")
  })

  it("stores 0% for a blank drop-off", () => {
    expect(buildSegmentRow(values({ dropOff: "   " }), null).dropOff).toBe("0%")
  })

  it.each(["healthy", "watch", "drop_off"] as RiskState[])(
    "carries the %s risk state through",
    (risk) => {
      expect(buildSegmentRow(values({ risk }), null).risk).toBe(risk)
    }
  )

  // The grid's Updated column is a relative string with no timestamp behind it,
  // so a save can only ever stamp it "Just now".
  it("stamps the row as just updated", () => {
    expect(buildSegmentRow(values(), row()).updatedAt).toBe("Just now")
  })

  it("does not mutate the row it is editing", () => {
    const base = row()
    const snapshot = { ...base }
    buildSegmentRow(values({ segment: "Changed", owner: "Leo Grant" }), base)
    expect(base).toEqual(snapshot)
  })

  it("round-trips a seed row through the form unchanged apart from the stamp", () => {
    const seed = stageBreakdownRows[0]
    const built = buildSegmentRow(
      {
        segment: seed.segment,
        cohort: seed.cohort,
        owner: seed.owner,
        accountCreated: String(seed.accountCreated),
        inviteSent: String(seed.inviteSent),
        savedReport: String(seed.savedReport),
        weekFourRetained: String(seed.weekFourRetained),
        dropOff: dropOffToNumber(seed.dropOff),
        risk: seed.risk,
      },
      seed
    )
    expect(built).toEqual({ ...seed, updatedAt: "Just now" })
  })
})

// ── Row CRUD ──

describe("segmentExists", () => {
  it("finds a seed row by id", () => {
    expect(segmentExists(stageBreakdownRows, "MET-609")).toBe(true)
  })

  it("does not find an id that is not there", () => {
    expect(segmentExists(stageBreakdownRows, "SEG-999999")).toBe(false)
  })

  it("is exact, not case-insensitive, because ids are generated not typed", () => {
    expect(segmentExists(stageBreakdownRows, "met-609")).toBe(false)
  })
})

describe("upsertSegment", () => {
  it("prepends a row whose id is new", () => {
    const created = buildSegmentRow(values(), null)
    const next = upsertSegment(stageBreakdownRows, created)
    expect(next[0]).toBe(created)
    expect(next).toHaveLength(stageBreakdownRows.length + 1)
  })

  // An update replaces in place so the row does not jump out from under the
  // cursor of whoever just saved it.
  it("replaces an existing row in place", () => {
    const edited = { ...stageBreakdownRows[2], segment: "Renamed" }
    const next = upsertSegment(stageBreakdownRows, edited)
    expect(next).toHaveLength(stageBreakdownRows.length)
    expect(next[2]).toBe(edited)
    expect(next.map((r) => r.id)).toEqual(stageBreakdownRows.map((r) => r.id))
  })

  it("touches only the row being updated", () => {
    const edited = { ...stageBreakdownRows[2], segment: "Renamed" }
    const next = upsertSegment(stageBreakdownRows, edited)
    next.forEach((item, index) => {
      if (index !== 2) expect(item).toBe(stageBreakdownRows[index])
    })
  })

  it("returns a new array and never mutates the seed constant", () => {
    const before = stageBreakdownRows.map((r) => ({ ...r }))
    const next = upsertSegment(
      stageBreakdownRows,
      buildSegmentRow(values(), null)
    )
    expect(next).not.toBe(stageBreakdownRows)
    expect(stageBreakdownRows).toEqual(before)
    expect(stageBreakdownRows).toHaveLength(6)
  })
})

describe("deleteSegment", () => {
  it("removes only the target row", () => {
    const next = deleteSegment(stageBreakdownRows, "MET-609")
    expect(next).toHaveLength(stageBreakdownRows.length - 1)
    expect(next.some((r) => r.id === "MET-609")).toBe(false)
    expect(next.map((r) => r.id)).toEqual(
      stageBreakdownRows.filter((r) => r.id !== "MET-609").map((r) => r.id)
    )
  })

  it("leaves the list alone for an unknown id", () => {
    expect(deleteSegment(stageBreakdownRows, "SEG-999999")).toHaveLength(6)
  })

  // Nothing guards the last row: the breakdown can be emptied entirely, which
  // is what the grid's "No funnel segments match this filter." state is for.
  it("allows deleting the last remaining row", () => {
    expect(deleteSegment([row()], "SEG-307")).toEqual([])
  })

  it("returns a new array and never mutates the seed constant", () => {
    const next = deleteSegment(stageBreakdownRows, "MET-609")
    expect(next).not.toBe(stageBreakdownRows)
    expect(stageBreakdownRows.some((r) => r.id === "MET-609")).toBe(true)
  })
})

describe("segmentAfterSubmit", () => {
  // A create lands in no bucket, so leaving the filter alone would hide the row
  // the user just made.
  it("clears the filter after a create", () => {
    expect(segmentAfterSubmit("organic", false)).toBe("all")
  })

  it("keeps the filter after an update", () => {
    expect(segmentAfterSubmit("organic", true)).toBe("organic")
    expect(segmentAfterSubmit("all", true)).toBe("all")
  })
})
