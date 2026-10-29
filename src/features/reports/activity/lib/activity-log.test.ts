import { describe, expect, it } from "vitest"

import {
  ACTIVITIES,
  BUCKET_ORDER,
  OWNERS,
  activityTypeLabel,
  outcomeLabel,
} from "@/features/reports/activity/components/data"
import type {
  Activity,
  ActivityOutcome,
  ActivityType,
} from "@/features/reports/activity/components/data"
import {
  activityExists,
  activityRefFrom,
  buildActivity,
  canSubmitActivity,
  deleteActivity,
  filterActivities,
  groupIntoBuckets,
  initialOpenIds,
  newActivityRef,
  toggleOpenId,
  upsertActivity,
} from "@/features/reports/activity/lib/activity-log"
import type { ActivityFormValues } from "@/features/reports/activity/lib/activity-log"

// ── Fixtures ──

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: "act-1",
    ref: "ACT-1",
    bucket: "today",
    type: "call",
    outcome: "connected",
    title: "Budget Call",
    account: "Brightwave Media",
    deal: "Pro Annual",
    time: "9:12 AM",
    detail: "Budget approved.",
    ownerId: "mira-stone",
    ...overrides,
  }
}

function values(
  overrides: Partial<ActivityFormValues> = {}
): ActivityFormValues {
  return {
    title: "Budget Call",
    detail: "Budget approved.",
    account: "Brightwave Media",
    deal: "Pro Annual",
    time: "9:12 AM",
    type: "call",
    outcome: "connected",
    ownerId: "mira-stone",
    bucket: "today",
    ...overrides,
  }
}

const TYPES = Object.keys(activityTypeLabel) as ActivityType[]
const OUTCOMES = Object.keys(outcomeLabel) as ActivityOutcome[]
const OWNER_IDS = Object.keys(OWNERS)

// ── Filters ──

describe("filterActivities", () => {
  const entries = [
    activity({ id: "a", type: "call", ownerId: "mira-stone" }),
    activity({ id: "b", type: "email", ownerId: "leo-grant" }),
    activity({ id: "c", type: "call", ownerId: "leo-grant" }),
  ]

  it("returns everything when both filters are off", () => {
    expect(filterActivities(entries, "all", "all")).toHaveLength(3)
  })

  it("narrows by type", () => {
    expect(filterActivities(entries, "call", "all").map((a) => a.id)).toEqual([
      "a",
      "c",
    ])
  })

  it("narrows by owner", () => {
    expect(
      filterActivities(entries, "all", "leo-grant").map((a) => a.id)
    ).toEqual(["b", "c"])
  })

  // The two filters are ANDed, so picking a type and an owner narrows rather
  // than widening: "calls" plus "Leo" is Leo's calls, not every call and
  // everything of Leo's.
  it("ANDs the two filters", () => {
    expect(
      filterActivities(entries, "call", "leo-grant").map((a) => a.id)
    ).toEqual(["c"])
  })

  it("returns nothing when the combination matches no entry", () => {
    expect(filterActivities(entries, "meeting", "leo-grant")).toEqual([])
  })

  // Both sides are generated slugs rather than typed text, so the comparison is
  // exact on purpose; a case-insensitive match here would be meaningless.
  it("matches the slugs exactly", () => {
    expect(filterActivities(entries, "CALL", "all")).toEqual([])
    expect(filterActivities(entries, "all", "Leo-Grant")).toEqual([])
  })

  it("returns a new array and does not mutate the source", () => {
    const result = filterActivities(entries, "call", "all")
    expect(result).not.toBe(entries)
    expect(entries).toHaveLength(3)
  })

  it.each(TYPES)("selects every %s in the real seed data", (type) => {
    const result = filterActivities(ACTIVITIES, type, "all")
    expect(result).toHaveLength(
      ACTIVITIES.filter((a) => a.type === type).length
    )
    expect(result.every((a) => a.type === type)).toBe(true)
  })

  it.each(OWNER_IDS)("selects every entry owned by %s", (ownerId) => {
    const result = filterActivities(ACTIVITIES, "all", ownerId)
    expect(result).toHaveLength(
      ACTIVITIES.filter((a) => a.ownerId === ownerId).length
    )
    expect(result.every((a) => a.ownerId === ownerId)).toBe(true)
  })

  // Every seed entry must be reachable from some owner option, or the log would
  // hold rows that no filter can surface.
  it("covers every seed entry across the owner options", () => {
    const reachable = OWNER_IDS.flatMap((id) =>
      filterActivities(ACTIVITIES, "all", id)
    )
    expect(reachable).toHaveLength(ACTIVITIES.length)
  })
})

describe("groupIntoBuckets", () => {
  it("groups the seed log into all four day buckets", () => {
    const buckets = groupIntoBuckets(ACTIVITIES)
    expect(buckets.map((b) => b.key)).toEqual(BUCKET_ORDER)
    expect(buckets.map((b) => b.entries.length)).toEqual([4, 2, 3, 3])
    expect(
      buckets.reduce((total, bucket) => total + bucket.entries.length, 0)
    ).toBe(ACTIVITIES.length)
  })

  // The seed order interleaves buckets (a "today" note sits after the
  // "yesterday" pair), so grouping has to follow BUCKET_ORDER or the headings
  // would come out in whatever order the records happen to be stored.
  it("orders buckets by BUCKET_ORDER, not by source order", () => {
    const entries = [
      activity({ id: "a", bucket: "earlier" }),
      activity({ id: "b", bucket: "today" }),
      activity({ id: "c", bucket: "this-week" }),
    ]
    expect(groupIntoBuckets(entries).map((b) => b.key)).toEqual([
      "today",
      "this-week",
      "earlier",
    ])
  })

  it("keeps the source order of the entries inside a bucket", () => {
    const entries = [
      activity({ id: "a", bucket: "today" }),
      activity({ id: "b", bucket: "yesterday" }),
      activity({ id: "c", bucket: "today" }),
    ]
    const today = groupIntoBuckets(entries)[0]
    expect(today.entries.map((a) => a.id)).toEqual(["a", "c"])
  })

  // An empty bucket would otherwise render a heading with a zero count and
  // nothing under it.
  it("drops buckets with no entries", () => {
    const buckets = groupIntoBuckets([activity({ bucket: "earlier" })])
    expect(buckets.map((b) => b.key)).toEqual(["earlier"])
  })

  // The timeline shows its empty state on an empty result, so a fully filtered
  // out log has to come back as no buckets at all.
  it("returns no buckets for an empty log", () => {
    expect(groupIntoBuckets([])).toEqual([])
  })

  it.each(BUCKET_ORDER)("handles a log made only of %s entries", (bucket) => {
    const buckets = groupIntoBuckets([activity({ bucket })])
    expect(buckets).toHaveLength(1)
    expect(buckets[0].key).toBe(bucket)
  })

  it("does not mutate the source list", () => {
    const entries = [activity({ id: "a" }), activity({ id: "b" })]
    groupIntoBuckets(entries)
    expect(entries.map((a) => a.id)).toEqual(["a", "b"])
  })
})

describe("initialOpenIds", () => {
  it("opens the first two entries of the seed log", () => {
    expect([...initialOpenIds(ACTIVITIES)]).toEqual(["act-2841", "act-2840"])
  })

  it("copes with a log shorter than two entries", () => {
    expect([...initialOpenIds([activity({ id: "only" })])]).toEqual(["only"])
    expect([...initialOpenIds([])]).toEqual([])
  })
})

describe("toggleOpenId", () => {
  it("opens and closes a card", () => {
    const opened = toggleOpenId(new Set(), "act-1", true)
    expect([...opened]).toEqual(["act-1"])
    expect([...toggleOpenId(opened, "act-1", false)]).toEqual([])
  })

  it("closing a card that was never open changes nothing", () => {
    expect([...toggleOpenId(new Set(["act-1"]), "act-2", false)]).toEqual([
      "act-1",
    ])
  })

  it("returns a new set and never mutates the source", () => {
    const source = new Set(["act-1"])
    const next = toggleOpenId(source, "act-2", true)
    expect(next).not.toBe(source)
    expect([...source]).toEqual(["act-1"])
  })
})

// ── Paired id / ref generation ──

describe("activity references", () => {
  it("mints the id and the ref from one sequence value", () => {
    expect(activityRefFrom(1771234567890)).toEqual({
      id: "act-567890",
      ref: "ACT-567890",
    })
  })

  // The timeline shows the ref on a copy button while the log is keyed by id,
  // so the two halves must always describe the same record.
  it("keeps the two halves in step", () => {
    for (let i = 0; i < 50; i += 1) {
      const minted = newActivityRef()
      expect(minted.ref).toBe(minted.id.toUpperCase())
      expect(minted.id).toMatch(/^act-\d{6}$/)
    }
  })

  it("holds that same pairing across the seed data", () => {
    for (const seed of ACTIVITIES) {
      expect(seed.ref).toBe(seed.id.toUpperCase())
    }
  })

  it("mints a distinct pair on every call", () => {
    const ids = Array.from({ length: 200 }, () => newActivityRef().id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Seed ids carry four digits and a generated one carries six, so a create can
  // never be misread as an update to a seed entry.
  it("never collides with a seed id or ref", () => {
    const seedIds = new Set(ACTIVITIES.map((a) => a.id))
    const seedRefs = new Set(ACTIVITIES.map((a) => a.ref))
    for (let i = 0; i < 200; i += 1) {
      const minted = newActivityRef()
      expect(seedIds.has(minted.id)).toBe(false)
      expect(seedRefs.has(minted.ref)).toBe(false)
    }
  })
})

describe("canSubmitActivity", () => {
  it("requires a non-blank title", () => {
    expect(canSubmitActivity("Budget Call")).toBe(true)
    expect(canSubmitActivity("")).toBe(false)
    expect(canSubmitActivity("   ")).toBe(false)
  })
})

describe("buildActivity", () => {
  it("mints a fresh id and ref for a create", () => {
    const created = buildActivity(values(), null)
    expect(created.id).toMatch(/^act-\d{6}$/)
    expect(created.ref).toBe(created.id.toUpperCase())
    expect(buildActivity(values(), null).id).not.toBe(created.id)
  })

  // The ref is on a copy button, so re-minting it on save would invalidate a
  // reference the user may already have pasted somewhere.
  it("keeps both halves of an edited entry's reference", () => {
    const base = ACTIVITIES[0]
    const built = buildActivity(values({ title: "Renamed" }), base)
    expect(built.id).toBe(base.id)
    expect(built.ref).toBe(base.ref)
    expect(built.title).toBe("Renamed")
  })

  // Account and deal are compared against "" downstream to decide whether to
  // show "Not set", which a stray space would defeat.
  it("trims every text field", () => {
    const built = buildActivity(
      values({
        title: "  Budget Call  ",
        detail: "  Approved  ",
        account: "   ",
        deal: "  Pro Annual  ",
        time: "  9:12 AM  ",
      }),
      null
    )
    expect(built.title).toBe("Budget Call")
    expect(built.detail).toBe("Approved")
    expect(built.account).toBe("")
    expect(built.deal).toBe("Pro Annual")
    expect(built.time).toBe("9:12 AM")
  })

  it.each(TYPES)("carries the %s type through", (type) => {
    expect(buildActivity(values({ type }), null).type).toBe(type)
  })

  it.each(OUTCOMES)("carries the %s outcome through", (outcome) => {
    expect(buildActivity(values({ outcome }), null).outcome).toBe(outcome)
  })

  it.each(BUCKET_ORDER)("carries the %s bucket through", (bucket) => {
    expect(buildActivity(values({ bucket }), null).bucket).toBe(bucket)
  })

  it.each(OWNER_IDS)("carries the %s owner through", (ownerId) => {
    expect(buildActivity(values({ ownerId }), null).ownerId).toBe(ownerId)
  })

  it("does not mutate the entry it is editing", () => {
    const base = { ...ACTIVITIES[0] }
    const snapshot = { ...base }
    buildActivity(values({ title: "Changed" }), base)
    expect(base).toEqual(snapshot)
  })

  it("round-trips a seed entry through the form unchanged", () => {
    const seed = ACTIVITIES[0]
    const built = buildActivity(
      {
        title: seed.title,
        detail: seed.detail,
        account: seed.account,
        deal: seed.deal,
        time: seed.time,
        type: seed.type,
        outcome: seed.outcome,
        ownerId: seed.ownerId,
        bucket: seed.bucket,
      },
      seed
    )
    expect(built).toEqual(seed)
  })
})

// ── Entry CRUD ──

describe("activityExists", () => {
  it("finds a seed entry by id", () => {
    expect(activityExists(ACTIVITIES, "act-2836")).toBe(true)
  })

  it("does not find an id that is not there", () => {
    expect(activityExists(ACTIVITIES, "act-999999")).toBe(false)
  })
})

describe("upsertActivity", () => {
  it("prepends an entry whose id is new", () => {
    const created = buildActivity(values(), null)
    const next = upsertActivity(ACTIVITIES, created)
    expect(next[0]).toBe(created)
    expect(next).toHaveLength(ACTIVITIES.length + 1)
  })

  // A create lands at the top of its day bucket, which is where the newest
  // touch belongs on a reverse-chronological timeline.
  it("puts a created entry first inside its own bucket", () => {
    const created = buildActivity(values({ bucket: "earlier" }), null)
    const buckets = groupIntoBuckets(upsertActivity(ACTIVITIES, created))
    const earlier = buckets.find((b) => b.key === "earlier")!
    expect(earlier.entries[0]).toBe(created)
  })

  it("replaces an existing entry in place", () => {
    const edited = { ...ACTIVITIES[3], title: "Renamed" }
    const next = upsertActivity(ACTIVITIES, edited)
    expect(next).toHaveLength(ACTIVITIES.length)
    expect(next[3]).toBe(edited)
    expect(next.map((a) => a.id)).toEqual(ACTIVITIES.map((a) => a.id))
  })

  it("touches only the entry being updated", () => {
    const edited = { ...ACTIVITIES[3], title: "Renamed" }
    upsertActivity(ACTIVITIES, edited).forEach((item, index) => {
      if (index !== 3) expect(item).toBe(ACTIVITIES[index])
    })
  })

  it("returns a new array and never mutates the seed constant", () => {
    const before = ACTIVITIES.map((a) => ({ ...a }))
    const next = upsertActivity(ACTIVITIES, buildActivity(values(), null))
    expect(next).not.toBe(ACTIVITIES)
    expect(ACTIVITIES).toEqual(before)
    expect(ACTIVITIES).toHaveLength(12)
  })
})

describe("deleteActivity", () => {
  it("removes only the target entry", () => {
    const next = deleteActivity(ACTIVITIES, "act-2836")
    expect(next).toHaveLength(ACTIVITIES.length - 1)
    expect(next.some((a) => a.id === "act-2836")).toBe(false)
    expect(next.map((a) => a.id)).toEqual(
      ACTIVITIES.filter((a) => a.id !== "act-2836").map((a) => a.id)
    )
  })

  it("leaves the log alone for an unknown id", () => {
    expect(deleteActivity(ACTIVITIES, "act-999999")).toHaveLength(
      ACTIVITIES.length
    )
  })

  // Nothing guards the last entry: the log can be emptied, which is what the
  // "No Matching Activity" empty state is for.
  it("allows deleting the last remaining entry", () => {
    expect(deleteActivity([activity({ id: "only" })], "only")).toEqual([])
  })

  // Emptying a bucket has to take its heading with it rather than leaving a
  // "Yesterday" label with a zero count.
  it("drops a bucket once its last entry is deleted", () => {
    const yesterday = ACTIVITIES.filter((a) => a.bucket === "yesterday")
    const remaining = yesterday.reduce(
      (log: Activity[], entry) => deleteActivity(log, entry.id),
      ACTIVITIES
    )
    expect(groupIntoBuckets(remaining).map((b) => b.key)).toEqual([
      "today",
      "this-week",
      "earlier",
    ])
  })

  it("returns a new array and never mutates the seed constant", () => {
    const next = deleteActivity(ACTIVITIES, "act-2836")
    expect(next).not.toBe(ACTIVITIES)
    expect(ACTIVITIES.some((a) => a.id === "act-2836")).toBe(true)
  })

  // The open-card set is keyed by id and is never pruned on delete, so an id
  // that has been removed stays in it. Harmless today (membership is only ever
  // tested for rendered rows) but pinned so a future id reuse is a test
  // failure, not a card that mysteriously opens itself.
  it("leaves a deleted entry's id in the open set", () => {
    const openIds = initialOpenIds(ACTIVITIES)
    deleteActivity(ACTIVITIES, "act-2841")
    expect(openIds.has("act-2841")).toBe(true)
  })
})

// ── Bucket / owner union coverage ──

describe("union coverage", () => {
  it("has a label for every activity type and outcome the sheet can set", () => {
    for (const type of TYPES) {
      expect(activityTypeLabel[type].length).toBeGreaterThan(0)
    }
    for (const outcome of OUTCOMES) {
      expect(outcomeLabel[outcome].length).toBeGreaterThan(0)
    }
  })

  it("has a bucket for every BucketKey the grouping can emit", () => {
    const built = BUCKET_ORDER.map((bucket) =>
      buildActivity(values({ bucket }), null)
    )
    expect(groupIntoBuckets(built).map((b) => b.key)).toEqual(BUCKET_ORDER)
  })

  it("only ever assigns owners that exist in OWNERS", () => {
    for (const seed of ACTIVITIES) {
      expect(OWNERS[seed.ownerId]).toBeDefined()
    }
    for (const ownerId of OWNER_IDS) {
      expect(
        OWNERS[buildActivity(values({ ownerId }), null).ownerId]
      ).toBeDefined()
    }
  })
})

// ── The two filters and the CRUD together ──

describe("filter and CRUD together", () => {
  // A created entry has to be visible under the filter that was active when it
  // was made, or the log would look like the save had failed.
  it("shows a created entry under a matching type and owner filter", () => {
    const created = buildActivity(
      values({ type: "meeting", ownerId: "nora-vale", bucket: "today" }),
      null
    )
    const log = upsertActivity(ACTIVITIES, created)
    expect(filterActivities(log, "meeting", "nora-vale")).toEqual([created])
  })

  it("hides a created entry from a filter it does not match", () => {
    const created = buildActivity(values({ type: "note" }), null)
    const log = upsertActivity(ACTIVITIES, created)
    expect(filterActivities(log, "call", "all")).not.toContain(created)
  })

  // Re-typing an entry has to move it out of the old filter and into the new
  // one, which only works because the update replaces the record wholesale.
  it("moves an edited entry between type filters", () => {
    const base = ACTIVITIES.find((a) => a.type === "call")!
    const edited = buildActivity(values({ type: "note" }), base)
    const log = upsertActivity(ACTIVITIES, edited)
    expect(filterActivities(log, "call", "all").map((a) => a.id)).not.toContain(
      base.id
    )
    expect(filterActivities(log, "note", "all").map((a) => a.id)).toContain(
      base.id
    )
  })
})
