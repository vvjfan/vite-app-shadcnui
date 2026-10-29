import { describe, expect, it } from "vitest"

import { ACTIVITIES, BUCKET_ORDER, OWNERS } from "../components/data"
import type {
  ActivityOutcome,
  ActivityType,
  BucketKey,
} from "../components/data"
import { buildActivity } from "./activity-log"
import {
  activityDefaultValues,
  activitySchema,
  toActivityFormValues,
  ACTIVITY_OUTCOME_VALUES,
  ACTIVITY_TYPE_VALUES,
  OWNER_IDS,
} from "./activity-schema"

// Keyed by the unions so a new ActivityType / ActivityOutcome / BucketKey breaks
// this file rather than shipping a dropdown the schema then rejects.
const ALL_TYPES: Record<ActivityType, true> = {
  call: true,
  email: true,
  meeting: true,
  note: true,
  task: true,
}
const ALL_OUTCOMES: Record<ActivityOutcome, true> = {
  connected: true,
  voicemail: true,
  "no-answer": true,
  replied: true,
  "deal-won": true,
  "stage-moved": true,
  scheduled: true,
  logged: true,
}
const ALL_BUCKETS: Record<BucketKey, true> = {
  today: true,
  yesterday: true,
  "this-week": true,
  earlier: true,
}

function values(overrides: Record<string, unknown> = {}) {
  return {
    title: "Procurement call",
    detail: "Budget approved and RevOps joined security review.",
    account: "Apex Manufacturing",
    deal: "Enterprise Plan",
    time: "9:12 AM",
    type: "call",
    outcome: "connected",
    ownerId: "mira-stone",
    bucket: "today",
    ...overrides,
  }
}

/** The message the sheet would show under one field, or undefined if it passed. */
function messageFor(input: Record<string, unknown>, field: string) {
  const result = activitySchema.safeParse(input)
  if (result.success) return undefined
  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

describe("option lists", () => {
  it("covers every member of ActivityType", () => {
    expect([...ACTIVITY_TYPE_VALUES].sort()).toEqual(
      Object.keys(ALL_TYPES).sort()
    )
  })

  it("covers every member of ActivityOutcome", () => {
    expect([...ACTIVITY_OUTCOME_VALUES].sort()).toEqual(
      Object.keys(ALL_OUTCOMES).sort()
    )
  })

  it("covers every day bucket", () => {
    expect([...BUCKET_ORDER].sort()).toEqual(Object.keys(ALL_BUCKETS).sort())
  })

  it("covers every seeded owner", () => {
    expect([...OWNER_IDS].sort()).toEqual(Object.keys(OWNERS).sort())
  })
})

describe("activitySchema", () => {
  it("accepts a filled-in form", () => {
    expect(activitySchema.safeParse(values()).success).toBe(true)
  })

  it("trims the text fields it passes on", () => {
    const result = activitySchema.parse(
      values({
        title: "  Procurement call  ",
        detail: "  Budget approved.  ",
        account: "  Apex  ",
        deal: "  Pro Annual  ",
        time: "  9:12 AM  ",
      })
    )
    expect(result.title).toBe("Procurement call")
    expect(result.detail).toBe("Budget approved.")
    expect(result.account).toBe("Apex")
    expect(result.deal).toBe("Pro Annual")
    expect(result.time).toBe("9:12 AM")
  })

  describe("title", () => {
    it("is required", () => {
      expect(messageFor(values({ title: "" }), "title")).toBe(
        "Enter an activity title."
      )
    })

    it("rejects whitespace alone", () => {
      expect(messageFor(values({ title: "   " }), "title")).toBe(
        "Enter an activity title."
      )
    })

    it("caps at 120 characters", () => {
      expect(messageFor(values({ title: "x".repeat(121) }), "title")).toBe(
        "Use 120 characters or fewer."
      )
      expect(
        messageFor(values({ title: "x".repeat(120) }), "title")
      ).toBeUndefined()
    })
  })

  describe("detail", () => {
    it("is optional", () => {
      expect(messageFor(values({ detail: "" }), "detail")).toBeUndefined()
    })

    it("caps at 500 characters", () => {
      expect(messageFor(values({ detail: "x".repeat(501) }), "detail")).toBe(
        "Use 500 characters or fewer."
      )
    })
  })

  describe("account and deal", () => {
    it("are optional", () => {
      expect(messageFor(values({ account: "" }), "account")).toBeUndefined()
      expect(messageFor(values({ deal: "" }), "deal")).toBeUndefined()
    })

    it("cap at 80 characters", () => {
      expect(messageFor(values({ account: "x".repeat(81) }), "account")).toBe(
        "Use 80 characters or fewer."
      )
      expect(messageFor(values({ deal: "x".repeat(81) }), "deal")).toBe(
        "Use 80 characters or fewer."
      )
    })
  })

  describe("time", () => {
    it("is optional", () => {
      expect(messageFor(values({ time: "" }), "time")).toBeUndefined()
    })

    it("accepts a weekday stamp", () => {
      expect(
        messageFor(values({ time: "Tue 10:15 AM" }), "time")
      ).toBeUndefined()
    })

    it("caps at 20 characters", () => {
      expect(messageFor(values({ time: "x".repeat(21) }), "time")).toBe(
        "Use 20 characters or fewer."
      )
    })
  })

  describe("type", () => {
    it("accepts every ActivityType", () => {
      for (const type of Object.keys(ALL_TYPES)) {
        expect(messageFor(values({ type }), "type")).toBeUndefined()
      }
    })

    it("rejects a value outside the union", () => {
      expect(messageFor(values({ type: "sms" }), "type")).toBe("Choose a type.")
    })

    it("rejects a missing value", () => {
      expect(messageFor(values({ type: undefined }), "type")).toBe(
        "Choose a type."
      )
    })
  })

  describe("outcome", () => {
    it("accepts every ActivityOutcome", () => {
      for (const outcome of Object.keys(ALL_OUTCOMES)) {
        expect(messageFor(values({ outcome }), "outcome")).toBeUndefined()
      }
    })

    it("rejects a value outside the union", () => {
      expect(messageFor(values({ outcome: "ghosted" }), "outcome")).toBe(
        "Choose an outcome."
      )
    })
  })

  describe("ownerId", () => {
    it("accepts every seeded owner", () => {
      for (const ownerId of Object.keys(OWNERS)) {
        expect(messageFor(values({ ownerId }), "ownerId")).toBeUndefined()
      }
    })

    it("rejects an unknown owner", () => {
      expect(messageFor(values({ ownerId: "nobody" }), "ownerId")).toBe(
        "Choose an owner."
      )
    })
  })

  describe("bucket", () => {
    it("accepts every day bucket", () => {
      for (const bucket of Object.keys(ALL_BUCKETS)) {
        expect(messageFor(values({ bucket }), "bucket")).toBeUndefined()
      }
    })

    it("rejects a value outside the union", () => {
      expect(messageFor(values({ bucket: "next-week" }), "bucket")).toBe(
        "Choose a day."
      )
    })
  })
})

describe("activityDefaultValues", () => {
  it("opens a create on a logged call for the first owner, today", () => {
    expect(activityDefaultValues(null)).toEqual({
      title: "",
      detail: "",
      account: "",
      deal: "",
      time: "",
      type: "call",
      outcome: "logged",
      ownerId: OWNER_IDS[0],
      bucket: "today",
    })
  })

  it("only fails on the empty title", () => {
    const result = activitySchema.safeParse(activityDefaultValues(null))
    expect(result.success).toBe(false)
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual([
      "title",
    ])
  })

  it("seeds an edit from the record", () => {
    const activity = ACTIVITIES[0]
    expect(activityDefaultValues(activity)).toEqual({
      title: activity.title,
      detail: activity.detail,
      account: activity.account,
      deal: activity.deal,
      time: activity.time,
      type: activity.type,
      outcome: activity.outcome,
      ownerId: activity.ownerId,
      bucket: activity.bucket,
    })
  })

  it("re-validates every seed record", () => {
    for (const activity of ACTIVITIES) {
      const result = activitySchema.safeParse(activityDefaultValues(activity))
      expect(result.success, `${activity.ref} failed to validate`).toBe(true)
    }
  })
})

describe("toActivityFormValues", () => {
  it("builds the record an edit already built", () => {
    for (const activity of ACTIVITIES) {
      const parsed = activitySchema.parse(activityDefaultValues(activity))
      expect(buildActivity(toActivityFormValues(parsed), activity)).toEqual(
        activity
      )
    }
  })
})
