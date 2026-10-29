import { BUCKET_ORDER } from "../components/data"
import type {
  Activity,
  ActivityOutcome,
  ActivityType,
  BucketKey,
} from "../components/data"

/**
 * Pure model behind the activity log: the type/owner filters, the day-bucket
 * grouping, the sheet's form -> record build, and the entry CRUD. The
 * components keep their useState, their toasts, and their collapsible state;
 * only the computation lives here.
 *
 * Nothing mutates its argument. The log is seeded from ACTIVITIES, a
 * module-level constant every mount shares by reference, so an in-place edit
 * would leak into every later navigation and survive a reload of the page.
 */

// ── Filters ──

/**
 * Both filters carry the literal "all" as their off position, which is why they
 * are typed as plain strings rather than the unions: "all" is not an
 * ActivityType and not an owner id, and the two filters are ANDed so a type and
 * an owner narrow together.
 */
export function filterActivities(
  activities: Activity[],
  typeFilter: string,
  ownerFilter: string
): Activity[] {
  return activities.filter(
    (activity) =>
      (typeFilter === "all" || activity.type === typeFilter) &&
      (ownerFilter === "all" || activity.ownerId === ownerFilter)
  )
}

export interface ActivityBucket {
  key: BucketKey
  entries: Activity[]
}

/**
 * Group into day buckets for the timeline.
 *
 * BUCKET_ORDER drives the output order, not the order the records happen to be
 * in, so "Today" always sits above "Earlier" however the log was edited. Empty
 * buckets are dropped rather than rendered as a heading with nothing under it,
 * which is also what lets the caller show the empty state on an empty result.
 */
export function groupIntoBuckets(activities: Activity[]): ActivityBucket[] {
  return BUCKET_ORDER.map((key) => ({
    key,
    entries: activities.filter((activity) => activity.bucket === key),
  })).filter((bucket) => bucket.entries.length > 0)
}

/**
 * The first two entries start expanded so the log does not open as a wall of
 * collapsed cards. Controlled from the seed order, so it is decided once and
 * never re-derived as the filter changes (an uncontrolled defaultOpen that
 * moved with the filter made Base UI warn about a changing default).
 */
export function initialOpenIds(activities: Activity[]): Set<string> {
  return new Set(activities.slice(0, 2).map((activity) => activity.id))
}

export function toggleOpenId(
  openIds: ReadonlySet<string>,
  id: string,
  open: boolean
): Set<string> {
  const next = new Set(openIds)
  if (open) next.add(id)
  else next.delete(id)
  return next
}

// ── Sheet form model ──

export interface ActivityRef {
  id: string
  ref: string
}

/**
 * The id and the human-facing reference are minted as a pair from one sequence
 * value, so ACT-123456 is always act-123456. The seed pairs read the same way,
 * and the timeline shows the ref on a copy button, so a record whose two halves
 * disagreed would be uncopyable in practice.
 */
export function activityRefFrom(seq: number): ActivityRef {
  const suffix = String(seq).slice(-6)
  return { id: `act-${suffix}`, ref: `ACT-${suffix}` }
}

// Monotonic within the session so a new entry never collides with a seed id
// (4-digit) or a prior create - a colliding id would be misread as an update.
let activitySeq = Date.now()

export function newActivityRef(): ActivityRef {
  activitySeq += 1
  return activityRefFrom(activitySeq)
}

export interface ActivityFormValues {
  title: string
  detail: string
  account: string
  deal: string
  time: string
  type: ActivityType
  outcome: ActivityOutcome
  ownerId: string
  bucket: BucketKey
}

/**
 * Builds the record the log will store.
 *
 * `base` is the record being edited, or null for a create. An edit keeps both
 * halves of the existing reference so a saved entry does not change the id the
 * user may already have copied out of it.
 *
 * Every text field is trimmed here rather than trusted from the input, because
 * account and deal are compared against "" downstream to decide whether to show
 * "Not set", and a stray space would defeat that.
 */
export function buildActivity(
  values: ActivityFormValues,
  base: Activity | null
): Activity {
  const generated = base ? null : newActivityRef()
  return {
    id: base?.id ?? generated!.id,
    ref: base?.ref ?? generated!.ref,
    bucket: values.bucket,
    type: values.type,
    outcome: values.outcome,
    title: values.title.trim(),
    account: values.account.trim(),
    deal: values.deal.trim(),
    time: values.time.trim(),
    detail: values.detail.trim(),
    ownerId: values.ownerId,
  }
}

/** The submit button stays disabled until a title is typed. */
export function canSubmitActivity(title: string): boolean {
  return title.trim().length > 0
}

// ── Entry CRUD ──

export function activityExists(activities: Activity[], id: string): boolean {
  return activities.some((item) => item.id === id)
}

/**
 * Create or update in one call, keyed on the id.
 *
 * A create prepends so the new entry is at the top of its day bucket; an update
 * replaces in place so the entry does not jump position while its card is open.
 */
export function upsertActivity(
  activities: Activity[],
  activity: Activity
): Activity[] {
  return activityExists(activities, activity.id)
    ? activities.map((item) => (item.id === activity.id ? activity : item))
    : [activity, ...activities]
}

export function deleteActivity(activities: Activity[], id: string): Activity[] {
  return activities.filter((item) => item.id !== id)
}
