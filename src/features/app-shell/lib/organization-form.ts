import { z } from "zod"

import { WORKSPACE_LOGOS } from "../components/workspace-logos"

/**
 * Validation for the organization dialogs (create, and the edit mode inside the
 * manage dialog). Kept apart from the components so the rules can be exercised
 * without rendering a dialog; the forms hand it to react-hook-form through
 * zodResolver.
 *
 * The name is trimmed before it is checked, so the parsed output is already the
 * value the sidebar should store.
 */

/** The marks the picker offers. */
export const WORKSPACE_LOGO_IDS: string[] = WORKSPACE_LOGOS.map(
  (logo) => logo.id
)

export const organizationFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Enter an organization name." })
    .max(60, { message: "Use 60 characters or fewer." }),
  /**
   * `null` is the picker's "keep the current avatar" choice, which is how the
   * seeded organizations hold on to their remote image, so it stays valid. Any
   * other value has to name a mark that actually exists.
   */
  logoId: z
    .string()
    .nullable()
    .refine((value) => value === null || WORKSPACE_LOGO_IDS.includes(value), {
      message: "Pick a logo.",
    }),
})

export type OrganizationFormValues = z.infer<typeof organizationFormSchema>
