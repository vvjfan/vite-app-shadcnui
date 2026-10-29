import { z } from "zod"

import {
  activityTypeLabel,
  outcomeLabel,
  BUCKET_ORDER,
  OWNERS,
} from "../components/data"
import type {
  Activity,
  ActivityOutcome,
  ActivityType,
} from "../components/data"
import type { ActivityFormValues } from "./activity-log"

/**
 * Client-side validation for the activity sheet.
 *
 * No literal is retyped here. Each list is read off the label map the data
 * module keys by its union (or, for owners, off the OWNERS record), so a new
 * ActivityType / ActivityOutcome / BucketKey / owner widens the dropdowns and
 * this schema together.
 */

export const ACTIVITY_TYPE_VALUES = Object.keys(
  activityTypeLabel
) as ActivityType[]

export const ACTIVITY_OUTCOME_VALUES = Object.keys(
  outcomeLabel
) as ActivityOutcome[]

/** Owner ids are seed data, not a union, but they are still a closed set. */
export const OWNER_IDS = Object.keys(OWNERS)

// ── Schema ──

export const activitySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter an activity title." })
    .max(120, { error: "Use 120 characters or fewer." }),
  detail: z.string().trim().max(500, { error: "Use 500 characters or fewer." }),
  account: z.string().trim().max(80, { error: "Use 80 characters or fewer." }),
  deal: z.string().trim().max(80, { error: "Use 80 characters or fewer." }),
  // A stamp or a weekday, e.g. "9:12 AM" or "Tue 10:15 AM". Free text, but it
  // sits on one line in the timeline, so it stays short.
  time: z.string().trim().max(20, { error: "Use 20 characters or fewer." }),
  type: z.enum(ACTIVITY_TYPE_VALUES, { error: "Choose a type." }),
  outcome: z.enum(ACTIVITY_OUTCOME_VALUES, { error: "Choose an outcome." }),
  ownerId: z.enum(OWNER_IDS, { error: "Choose an owner." }),
  bucket: z.enum(BUCKET_ORDER, { error: "Choose a day." }),
})

export type ActivityFormInput = z.infer<typeof activitySchema>

// ── Defaults ──

export const DEFAULT_OUTCOME: ActivityOutcome = "logged"

/** The values the sheet opens with: an existing entry's, or blank create ones. */
export function activityDefaultValues(
  source: Activity | null
): ActivityFormInput {
  if (!source) {
    return {
      title: "",
      detail: "",
      account: "",
      deal: "",
      time: "",
      type: ACTIVITY_TYPE_VALUES[0],
      outcome: DEFAULT_OUTCOME,
      ownerId: OWNER_IDS[0],
      bucket: BUCKET_ORDER[0],
    }
  }

  return {
    title: source.title,
    detail: source.detail,
    account: source.account,
    deal: source.deal,
    time: source.time,
    type: source.type,
    outcome: source.outcome,
    ownerId: source.ownerId,
    bucket: source.bucket,
  }
}

/** The validated values, in the shape buildActivity already takes. */
export function toActivityFormValues(
  input: ActivityFormInput
): ActivityFormValues {
  return {
    title: input.title,
    detail: input.detail,
    account: input.account,
    deal: input.deal,
    time: input.time,
    type: input.type,
    outcome: input.outcome,
    ownerId: input.ownerId,
    bucket: input.bucket,
  }
}
