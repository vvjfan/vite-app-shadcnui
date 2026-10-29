import { z } from "zod"

import { COLOR_OPTIONS } from "../components/data"

/**
 * Validation for the three forms the right-hand calendar panel opens: a
 * calendar (name + color), an account (email) and an Up Next event (title,
 * date, start, end, color).
 *
 * The schemas live here, apart from the dialogs, so every rule can be exercised
 * without rendering a modal. The dialogs hand them to react-hook-form through
 * zodResolver and render the messages with <FieldError>.
 *
 * Every text field is trimmed before it is checked, so the parsed output is
 * already the value the panel should store: "  Design review  " submits as
 * "Design review", the same way the hand-rolled handlers used to trim.
 */

// ── Colors ──

/** The swatches the color picker offers; anything else is not a real choice. */
export const CALENDAR_COLOR_VALUES: string[] = COLOR_OPTIONS.map(
  (option) => option.value
)

const colorSchema = z
  .string()
  .refine((value) => CALENDAR_COLOR_VALUES.includes(value), {
    message: "Pick a color.",
  })

// ── Times ("9:00 AM") ──

/**
 * `h:mm AM/PM`, the shape every seeded event uses. Minutes are optional so
 * "9 AM" is accepted (it normalizes to "9:00 AM"), and the meridiem is matched
 * case-insensitively, but it is required: "9:00" alone is ambiguous between
 * morning and evening and there is no 24-hour mode anywhere in this panel.
 */
const TIME_PATTERN = /^(\d{1,2})(?::(\d{2}))?\s*([ap])m$/i

/**
 * Minutes since local midnight, or null when the string is not a time. Used by
 * the schema for both the format rule and the end-after-start comparison, so
 * the two can never disagree about what a given string means.
 */
export function parseTimeToMinutes(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim())
  if (!match) return null

  const hour = Number(match[1])
  const minute = match[2] ? Number(match[2]) : 0
  if (hour < 1 || hour > 12) return null
  if (minute > 59) return null

  // 12 AM is midnight and 12 PM is noon, so the hour wraps before the offset.
  const hour24 = (hour % 12) + (match[3].toLowerCase() === "p" ? 12 : 0)
  return hour24 * 60 + minute
}

/** Minutes since midnight back to the canonical "9:00 AM" form. */
export function formatMinutes(totalMinutes: number): string {
  const minutes = ((Math.trunc(totalMinutes) % 1440) + 1440) % 1440
  const hour24 = Math.floor(minutes / 60)
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  const minute = `${minutes % 60}`.padStart(2, "0")
  return `${hour12}:${minute} ${hour24 < 12 ? "AM" : "PM"}`
}

/**
 * Canonicalizes an accepted time, or null if it was never a time. The dialog
 * runs this on submit so "9 am" is stored as "9:00 AM" and the event list keeps
 * reading as one set rather than echoing whatever casing was typed.
 */
export function normalizeTime(value: string): string | null {
  const minutes = parseTimeToMinutes(value)
  return minutes === null ? null : formatMinutes(minutes)
}

function timeSchema(emptyMessage: string) {
  return (
    z
      .string()
      .trim()
      .min(1, { message: emptyMessage })
      // Guarded on the empty string so a blank field reports only that it is
      // required, instead of stacking the format message underneath it.
      .refine(
        (value) => value.length === 0 || parseTimeToMinutes(value) !== null,
        {
          message: "Enter a time like 9:00 AM.",
        }
      )
  )
}

// ── Dates (`yyyy-mm-dd` day keys) ──

export const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * A `yyyy-mm-dd` key at local midnight, or null when it is not a real day.
 *
 * Built from the parts rather than `new Date(key)`, which reads a bare key as
 * UTC and so names the previous day in any zone behind UTC. The round-trip
 * check is what rejects a day that does not exist: `new Date(2026, 1, 30)`
 * silently rolls forward into March instead of going invalid.
 */
export function parseDayKey(value: string): Date | null {
  const trimmed = value.trim()
  if (!DAY_KEY_PATTERN.test(trimmed)) return null

  const [year, month, day] = trimmed.split("-").map(Number)
  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return date
}

// ── Email ──

/** Mirrors the rule the sign-in form applies to a work email. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Calendar (name + color) ──

export const calendarItemFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, { message: "Enter a calendar name." })
    .max(60, { message: "Use 60 characters or fewer." }),
  color: colorSchema,
})

export type CalendarItemFormValues = z.infer<typeof calendarItemFormSchema>

// ── Account (email) ──

export const accountFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Enter an email address." })
    .refine((value) => value.length === 0 || EMAIL_PATTERN.test(value), {
      message: "Enter a valid email address.",
    }),
})

export type AccountFormValues = z.infer<typeof accountFormSchema>

// ── Event (title + date + start + end + color) ──

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { message: "Enter a title." })
      .max(80, { message: "Use 80 characters or fewer." }),
    date: z
      .string()
      .trim()
      .min(1, { message: "Pick a date." })
      .refine((value) => value.length === 0 || parseDayKey(value) !== null, {
        message: "Enter a valid date.",
      }),
    startTime: timeSchema("Enter a start time."),
    endTime: timeSchema("Enter an end time."),
    calendarColor: colorSchema,
  })
  // Both times belong to the same day, so comparing minutes is enough. Reported
  // on endTime because that is the field the user changes to fix it. Skipped
  // while either side is unreadable: the format message is the useful one then.
  .superRefine((values, ctx) => {
    const start = parseTimeToMinutes(values.startTime)
    const end = parseTimeToMinutes(values.endTime)
    if (start === null || end === null) return
    if (end <= start) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "End time must be after the start time.",
      })
    }
  })

export type EventFormValues = z.infer<typeof eventFormSchema>
