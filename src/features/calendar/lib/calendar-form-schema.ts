import { z } from "zod"

import { CALENDAR_COLOR_OPTIONS } from "../event-calendar/data"

/**
 * Validation for the add/edit calendar dialog (a name and a color swatch).
 *
 * The dialog submits `{ name, color }` to the calendars menu, so the schema
 * owns exactly those two fields. `.trim()` runs before the length checks, which
 * means a name of only spaces fails as empty AND the parsed value the submit
 * handler forwards is already trimmed - the dialog no longer trims by hand.
 */

/** The swatches the picker offers; anything else is not a calendar color. */
export const CALENDAR_COLOR_VALUES: string[] = CALENDAR_COLOR_OPTIONS.map(
  (option) => option.value
)

export const CALENDAR_NAME_MAX = 40

export const calendarFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a calendar name.")
    .max(CALENDAR_NAME_MAX, `Use ${CALENDAR_NAME_MAX} characters or fewer.`),
  // The picker is seeded with the first swatch, so this only fires if a stored
  // calendar carries a color that is no longer offered.
  color: z
    .string()
    .refine(
      (value) => CALENDAR_COLOR_VALUES.includes(value),
      "Choose a color."
    ),
})

export type CalendarFormValues = z.infer<typeof calendarFormSchema>
