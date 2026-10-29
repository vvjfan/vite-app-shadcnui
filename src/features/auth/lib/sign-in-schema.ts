import { z } from "zod"

/**
 * Validation behind the magic-link sign-in form. One field, one rule: the value
 * has to look like an email address. The shape is deliberately the same loose
 * check the form used before (something@something.tld, no whitespace) so the
 * simulated session keeps accepting the same addresses.
 */

export const WORK_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const signInSchema = z.object({
  // Trimmed first, so " ava@atlashq.app " passes and signs in as the trimmed
  // address, exactly like the hand-rolled handler did.
  email: z
    .string()
    .trim()
    .regex(WORK_EMAIL_PATTERN, "Enter a valid work email."),
})

export type SignInValues = z.infer<typeof signInSchema>
