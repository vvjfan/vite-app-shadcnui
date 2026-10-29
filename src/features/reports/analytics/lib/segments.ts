import type {
  RiskState,
  SegmentKey,
  StageBreakdownRow,
} from "../components/data"

/**
 * Pure model behind the Stage Breakdown grid: the segment filter, the percent
 * formatting the stage cells render, the sheet's form -> row build, and the row
 * CRUD. The components keep their useState, their toasts, and their table
 * instance; only the computation lives here.
 *
 * Nothing mutates its argument. The grid is seeded from stageBreakdownRows, a
 * module-level constant every mount shares by reference, so an in-place edit
 * would leak into every later navigation and survive a reload of the page.
 */

// ── The segment filter ──

/**
 * Which rows each segment bucket contains, keyed by row id.
 *
 * This is a hard-coded allowlist rather than a field on the row: StageBreakdownRow
 * has no segment-key column, so the demo data pins the membership here instead.
 */
export const SEGMENT_ROWS: Record<SegmentKey, string[]> = {
  organic: ["SEG-307", "FEA-118"],
  partner: ["COH-071", "EXP-224"],
  sales: ["MET-609"],
  imported: ["EVT-1842"],
}

/**
 * Rows for the selected segment. "all" returns the SAME array rather than a
 * copy: it is handed straight to useReactTable, which rebuilds its row model
 * whenever the data identity changes, and nothing downstream mutates it.
 */
export function getRows(
  rows: StageBreakdownRow[],
  segment: SegmentKey | "all"
): StageBreakdownRow[] {
  if (segment === "all") return rows

  const ids = SEGMENT_ROWS[segment]
  return rows.filter((row) => ids.includes(row.id))
}

/**
 * Stage counts read as a share of the cohort that reached account-created, so a
 * row with no accounts shows "0%" instead of NaN%.
 */
export function formatPercent(numerator: number, denominator: number): string {
  if (!denominator) return "0%"
  return `${Math.round((numerator / denominator) * 100)}%`
}

// ── Sheet form model ──

/** Avatar fallback for an owner the seed data has no portrait for. */
export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** Parse the stored "42%" string back to a plain number string for the input. */
export function dropOffToNumber(dropOff: string): string {
  const parsed = Number.parseInt(dropOff.replace(/[^0-9-]/g, ""), 10)
  return Number.isNaN(parsed) ? "" : String(parsed)
}

/** Number inputs hand back strings, and an emptied one hands back "". */
export function toCount(value: string): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
}

/** `SEG-` plus the low six digits of the sequence. */
export function segmentIdFrom(seq: number): string {
  return `SEG-${String(seq).slice(-6)}`
}

// Monotonic within the session so a new row never collides with a seed id or a
// prior create - a colliding id would be misread as an update (overwrite).
let segmentSeq = Date.now()

export function newSegmentId(): string {
  segmentSeq += 1
  return segmentIdFrom(segmentSeq)
}

export interface SegmentFormValues {
  segment: string
  cohort: string
  owner: string
  /** raw <input type="number"> text, not yet coerced */
  accountCreated: string
  inviteSent: string
  savedReport: string
  weekFourRetained: string
  dropOff: string
  risk: RiskState
}

/**
 * Builds the row the grid will store.
 *
 * `base` is the row being edited, or null for a create. An edit keeps the id so
 * the upsert replaces in place; a create mints a fresh one. The portrait is
 * dropped as soon as the owner name changes, because the avatar belongs to the
 * person who was named before, and the initials are re-derived from the new
 * name so the fallback never shows someone else's letters.
 */
export function buildSegmentRow(
  values: SegmentFormValues,
  base: StageBreakdownRow | null
): StageBreakdownRow {
  const ownerName = values.owner.trim() || "Unassigned"
  const nameChanged = base ? base.owner !== ownerName : true
  const dropOffValue = values.dropOff.trim()

  return {
    id: base?.id ?? newSegmentId(),
    segment: values.segment.trim(),
    cohort: values.cohort.trim(),
    owner: ownerName,
    ownerAvatar: nameChanged ? "" : (base?.ownerAvatar ?? ""),
    ownerInitials: initialsFor(ownerName),
    accountCreated: toCount(values.accountCreated),
    inviteSent: toCount(values.inviteSent),
    savedReport: toCount(values.savedReport),
    weekFourRetained: toCount(values.weekFourRetained),
    dropOff: dropOffValue === "" ? "0%" : `${toCount(dropOffValue)}%`,
    risk: values.risk,
    updatedAt: "Just now",
  }
}

/** The submit button stays disabled until a segment name is typed. */
export function canSubmitSegment(segment: string): boolean {
  return segment.trim().length > 0
}

// ── Row CRUD ──

export function segmentExists(rows: StageBreakdownRow[], id: string): boolean {
  return rows.some((item) => item.id === id)
}

/**
 * Create or update in one call, keyed on the id.
 *
 * A create prepends so the new segment is visible without paging; an update
 * replaces in place so the row does not jump under the user's cursor. The id
 * therefore decides which of the two happens, which is why the sheet's
 * generated ids must never collide with a seed id.
 */
export function upsertSegment(
  rows: StageBreakdownRow[],
  row: StageBreakdownRow
): StageBreakdownRow[] {
  return segmentExists(rows, row.id)
    ? rows.map((item) => (item.id === row.id ? row : item))
    : [row, ...rows]
}

export function deleteSegment(
  rows: StageBreakdownRow[],
  id: string
): StageBreakdownRow[] {
  return rows.filter((item) => item.id !== id)
}

/**
 * A created row is in no SEGMENT_ROWS bucket, so it would be hidden the moment
 * the filter is anything but "all". Resetting the filter on create is what
 * makes the row the user just made visible. An update keeps the current filter,
 * since an existing row is already in whatever bucket it belongs to.
 */
export function segmentAfterSubmit(
  segment: SegmentKey | "all",
  exists: boolean
): SegmentKey | "all" {
  return exists ? segment : "all"
}
