import { z } from "zod"

import type { RiskState } from "../components/data"

/**
 * Validation for the segment sheet's create/edit form.
 *
 * The stage counts are <input type="number"> fields, so they arrive as text and
 * stay text here: buildSegmentRow() is what turns them into numbers. An EMPTY
 * numeric input is deliberately allowed - it means "none yet" and submits as 0,
 * which is what toCount("") already produced. Anything typed has to be a whole
 * number, so "-4" and "1.5" are rejected rather than silently floored.
 */

const WHOLE_NUMBER = /^\d+$/

/** Message shared by every count field, so the rule reads the same everywhere. */
export const WHOLE_NUMBER_MESSAGE = "Enter a whole number, 0 or more."

/** A numeric text field: empty (meaning 0), otherwise a whole number in range. */
function countField(max?: number) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") return
      if (!WHOLE_NUMBER.test(value)) {
        ctx.addIssue({ code: "custom", message: WHOLE_NUMBER_MESSAGE })
        return
      }
      if (max !== undefined && Number(value) > max) {
        ctx.addIssue({ code: "custom", message: `Enter 0 to ${max}.` })
      }
    })
}

export const SEGMENT_NAME_MAX = 60
export const SEGMENT_TEXT_MAX = 60
export const DROP_OFF_MAX = 100

export const RISK_VALUES = [
  "healthy",
  "watch",
  "drop_off",
] as const satisfies readonly RiskState[]

export const segmentFormSchema = z.object({
  segment: z
    .string()
    .trim()
    .min(1, "Enter a segment name.")
    .max(SEGMENT_NAME_MAX, `Use ${SEGMENT_NAME_MAX} characters or fewer.`),
  // A cohort and an owner are optional: a fresh segment often has neither, and
  // buildSegmentRow() already falls back to "Unassigned" for a blank owner.
  cohort: z
    .string()
    .trim()
    .max(SEGMENT_TEXT_MAX, `Use ${SEGMENT_TEXT_MAX} characters or fewer.`),
  owner: z
    .string()
    .trim()
    .max(SEGMENT_TEXT_MAX, `Use ${SEGMENT_TEXT_MAX} characters or fewer.`),
  accountCreated: countField(),
  inviteSent: countField(),
  savedReport: countField(),
  weekFourRetained: countField(),
  dropOff: countField(DROP_OFF_MAX),
  risk: z.enum(RISK_VALUES, "Choose a risk state."),
})

export type SegmentFormValues = z.infer<typeof segmentFormSchema>
