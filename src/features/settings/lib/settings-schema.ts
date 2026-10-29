import { z } from "zod"

import {
  ACCESS_ROLE_OPTIONS,
  BILLING_IDENTITY,
  DIGEST_OPTIONS,
  INVOICE_CADENCE_OPTIONS,
  LANDING_VIEW_OPTIONS,
  LANGUAGE_OPTIONS,
  PLAN_OPTIONS,
  PROFILE_IDENTITY,
  ROLE_OPTIONS,
  SPEND_LIMIT_OPTIONS,
  TEAM_VISIBILITY_OPTIONS,
  THEME_OPTIONS,
  TIMEZONE_OPTIONS,
  WEEK_START_OPTIONS,
  WORKSPACE_IDENTITY,
} from "../components/data"
import type { ProfileSelectOption } from "../components/data"

/**
 * Validation behind the settings dialog. One schema per tab, composed into a
 * single nested object so a field name (`profile.email`, `billing.email`) also
 * says which tab owns it, which is what lets the dialog jump to the first tab
 * with an error on submit.
 *
 * Controls that carry no rule of their own (switches, the two image pickers,
 * the optional tax/PO references) are still part of the schema: the form owns a
 * real value for every control, they just have nothing to fail.
 */

// ── Shared shapes ──

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** Dotted host, e.g. atlashq.app or mail.atlashq.co.uk. */
const DOMAIN_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i
/** Host as above, with an optional path: ava.atlashq.app/team. */
const WEBSITE_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+(\/\S*)?$/i
/** Any scheme prefix (https://, http://, ftp://) the website field must not carry. */
const SCHEME_PREFIX_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i
/** Lowercase URL slug: "hq", "atlas-hq". */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
const USERNAME_PATTERN = /^[a-zA-Z0-9_-]+$/

const BIO_MAX_LENGTH = 280

function requiredText(message: string) {
  return z.string().trim().min(1, message)
}

function emailText(emptyMessage: string) {
  return requiredText(emptyMessage).regex(
    EMAIL_PATTERN,
    "Enter a valid email address."
  )
}

/**
 * A value the matching Select actually offers. The select can only produce
 * these, so this guards restored or hand-edited values rather than typing.
 */
function optionValue(options: ProfileSelectOption[], message: string) {
  return z
    .string()
    .refine(
      (value) => options.some((option) => option.value === value),
      message
    )
}

/** Free text with no rule of its own; trimmed so the payload stays tidy. */
const optionalText = z.string().trim()

// ── Per tab ──

export const profileSettingsSchema = z.object({
  /** Preview URL of the picked image, or null once it is removed. */
  avatarUrl: z.string().nullable(),
  name: requiredText("Enter your full name."),
  email: emailText("Enter an email address."),
  username: requiredText("Enter a username.").regex(
    USERNAME_PATTERN,
    "Use letters, numbers, hyphens, and underscores only."
  ),
  role: optionValue(ROLE_OPTIONS, "Choose a role."),
  timezone: optionValue(TIMEZONE_OPTIONS, "Choose a time zone."),
  // Optional. The field renders behind an https:// addon, so the value is the
  // host (and optional path) on its own.
  website: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value === "") return

      if (SCHEME_PREFIX_PATTERN.test(value)) {
        ctx.addIssue({
          code: "custom",
          message: "Enter the address without https://.",
        })
        return
      }

      if (!WEBSITE_PATTERN.test(value)) {
        ctx.addIssue({
          code: "custom",
          message: "Enter a valid website address.",
        })
      }
    }),
  bio: z
    .string()
    .trim()
    .max(
      BIO_MAX_LENGTH,
      `Keep the bio to ${BIO_MAX_LENGTH} characters or fewer.`
    ),
})

export const workspaceSettingsSchema = z.object({
  logoUrl: z.string().nullable(),
  name: requiredText("Enter a workspace name."),
  // Rendered before a fixed domain suffix, so only the subdomain is validated.
  subdomain: requiredText("Enter a workspace URL.").regex(
    SLUG_PATTERN,
    "Use lowercase letters, numbers, and hyphens."
  ),
  supportEmail: emailText("Enter a support email."),
  landingView: optionValue(LANDING_VIEW_OPTIONS, "Choose a landing view."),
  externalSharing: z.boolean(),
})

export const teamSettingsSchema = z.object({
  // Rendered after an @ addon, so the value is the bare domain.
  inviteDomain: requiredText("Enter an invite domain.").regex(
    DOMAIN_PATTERN,
    "Enter a valid domain, like atlashq.app."
  ),
  defaultRole: optionValue(ACCESS_ROLE_OPTIONS, "Choose a default role."),
  inviteApproval: z.boolean(),
  memberInvites: z.boolean(),
  visibility: optionValue(TEAM_VISIBILITY_OPTIONS, "Choose team visibility."),
})

export const billingSettingsSchema = z.object({
  plan: optionValue(PLAN_OPTIONS, "Choose a plan."),
  billingEmail: emailText("Enter a billing email."),
  legalName: requiredText("Enter the legal name."),
  /** Documented as optional, and free-form across tax regimes. */
  taxId: optionalText,
  /** Optional reference the customer defines. */
  purchaseOrder: optionalText,
  spendLimit: optionValue(SPEND_LIMIT_OPTIONS, "Choose a spend limit."),
  invoiceCadence: optionValue(
    INVOICE_CADENCE_OPTIONS,
    "Choose an invoice cadence."
  ),
  paymentApproval: z.boolean(),
})

export const preferencesSettingsSchema = z.object({
  theme: optionValue(THEME_OPTIONS, "Choose a theme."),
  smoothCursor: z.boolean(),
  language: optionValue(LANGUAGE_OPTIONS, "Choose a language."),
  timezone: optionValue(TIMEZONE_OPTIONS, "Choose a time zone."),
  weekStart: optionValue(WEEK_START_OPTIONS, "Choose the first day of week."),
  digest: optionValue(DIGEST_OPTIONS, "Choose a digest cadence."),
})

// ── Composed ──

export const settingsSchema = z.object({
  profile: profileSettingsSchema,
  workspace: workspaceSettingsSchema,
  team: teamSettingsSchema,
  billing: billingSettingsSchema,
  preferences: preferencesSettingsSchema,
})

export type SettingsValues = z.infer<typeof settingsSchema>
export type SettingsSection = keyof SettingsValues

/** Tab order, which is also the order errors are reported in. */
export const SETTINGS_SECTIONS: SettingsSection[] = [
  "profile",
  "workspace",
  "team",
  "billing",
  "preferences",
]

/**
 * First tab holding an error, so an invalid submit can surface a message that
 * lives on a tab the user cannot currently see.
 */
export function firstInvalidSection(
  errors: Partial<Record<SettingsSection, unknown>>
): SettingsSection | null {
  return SETTINGS_SECTIONS.find((section) => errors[section] != null) ?? null
}

// ── Defaults ──

/** Seed a select from the label the identity record stores. */
function valueForLabel(options: ProfileSelectOption[], label: string): string {
  return (options.find((option) => option.label === label) ?? options[0]).value
}

/**
 * The stored settings the dialog re-seeds from every time it opens. Frontend
 * only: this stands in for the record a real app would load.
 */
export const SETTINGS_DEFAULT_VALUES: SettingsValues = {
  profile: {
    avatarUrl: PROFILE_IDENTITY.avatarFile.url,
    name: PROFILE_IDENTITY.name,
    email: PROFILE_IDENTITY.email,
    username: PROFILE_IDENTITY.username,
    role: valueForLabel(ROLE_OPTIONS, PROFILE_IDENTITY.role),
    timezone: valueForLabel(TIMEZONE_OPTIONS, PROFILE_IDENTITY.timezone),
    website: PROFILE_IDENTITY.website,
    bio: PROFILE_IDENTITY.bio,
  },
  workspace: {
    logoUrl: WORKSPACE_IDENTITY.logoFile.url,
    name: WORKSPACE_IDENTITY.name,
    subdomain: WORKSPACE_IDENTITY.subdomain,
    supportEmail: WORKSPACE_IDENTITY.supportEmail,
    landingView: LANDING_VIEW_OPTIONS[1].value,
    externalSharing: true,
  },
  team: {
    inviteDomain: WORKSPACE_IDENTITY.inviteDomain,
    defaultRole: ACCESS_ROLE_OPTIONS[0].value,
    inviteApproval: true,
    memberInvites: false,
    visibility: TEAM_VISIBILITY_OPTIONS[0].value,
  },
  billing: {
    plan: PLAN_OPTIONS[0].value,
    billingEmail: BILLING_IDENTITY.billingEmail,
    legalName: BILLING_IDENTITY.legalName,
    taxId: BILLING_IDENTITY.taxId,
    purchaseOrder: BILLING_IDENTITY.purchaseOrder,
    spendLimit: SPEND_LIMIT_OPTIONS[1].value,
    invoiceCadence: INVOICE_CADENCE_OPTIONS[0].value,
    paymentApproval: true,
  },
  preferences: {
    theme: THEME_OPTIONS[0].value,
    smoothCursor: true,
    language: LANGUAGE_OPTIONS[0].value,
    timezone: TIMEZONE_OPTIONS[0].value,
    weekStart: WEEK_START_OPTIONS[0].value,
    digest: DIGEST_OPTIONS[2].value,
  },
}
