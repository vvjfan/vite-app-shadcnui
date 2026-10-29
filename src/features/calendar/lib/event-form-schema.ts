import { z } from "zod"

/**
 * Validation for the event sheet's create/edit form.
 *
 * The sheet keeps its lifted draft (the parent owns the EventDraft and does the
 * save), so this schema covers exactly the draft fields the form edits. Dates
 * are "yyyy-MM-dd" and times are "HH:mm", both zero padded, which is why the
 * cross-field rules can compare them as plain strings: lexicographic order and
 * chronological order agree for those two formats.
 *
 * The end-after-start rule is reported on the field the user can fix - the end
 * date, or the end time - so the message lands next to the control that has to
 * change.
 */

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const EVENT_TITLE_MAX = 80
export const EVENT_LOCATION_MAX = 120
export const EVENT_DESCRIPTION_MAX = 2000

export const eventFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Enter a title.")
      .max(EVENT_TITLE_MAX, `Use ${EVENT_TITLE_MAX} characters or fewer.`),
    calendarId: z.string().min(1, "Choose a calendar."),
    allDay: z.boolean(),
    date: z.string().regex(DATE_PATTERN, "Choose a start date."),
    dateEnd: z.string().regex(DATE_PATTERN, "Choose an end date."),
    start: z.string().regex(TIME_PATTERN, "Choose a start time."),
    end: z.string().regex(TIME_PATTERN, "Choose an end time."),
    location: z
      .string()
      .trim()
      .max(
        EVENT_LOCATION_MAX,
        `Use ${EVENT_LOCATION_MAX} characters or fewer.`
      ),
    description: z
      .string()
      .trim()
      .max(
        EVENT_DESCRIPTION_MAX,
        `Use ${EVENT_DESCRIPTION_MAX} characters or fewer.`
      ),
    attendees: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    const datesReadable =
      DATE_PATTERN.test(values.date) && DATE_PATTERN.test(values.dateEnd)

    // A backwards span is a date problem first: reporting the time as well
    // would put two messages on one mistake.
    if (datesReadable && values.dateEnd < values.date) {
      ctx.addIssue({
        code: "custom",
        path: ["dateEnd"],
        message: "End date must be on or after the start date.",
      })
      return
    }

    // An all-day event owns whole days, so its times are not part of the span.
    if (values.allDay) return

    const timesReadable =
      TIME_PATTERN.test(values.start) && TIME_PATTERN.test(values.end)
    if (!datesReadable || !timesReadable) return

    // Only a single-day event can have its end fall before its start; a later
    // end date already puts the end instant ahead of the start.
    if (values.date === values.dateEnd && values.end <= values.start) {
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "End time must be after the start time.",
      })
    }
  })

export type EventFormValues = z.infer<typeof eventFormSchema>
