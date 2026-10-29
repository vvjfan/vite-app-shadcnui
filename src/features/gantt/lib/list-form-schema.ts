import { z } from "zod"

/**
 * Validation for the gantt's list dialog (create and rename). A list is only a
 * name: it owns no bar, so nothing else is asked for.
 */

/** Lists head the tree panel, so their names stay short enough to read there. */
export const LIST_TITLE_MAX = 60

export const listFormSchema = z.object({
  title: z
    .string({ error: "Enter a list name." })
    .trim()
    .min(1, "Enter a list name.")
    .max(LIST_TITLE_MAX, `Use ${LIST_TITLE_MAX} characters or fewer.`),
})

export type ListFormValues = z.infer<typeof listFormSchema>
