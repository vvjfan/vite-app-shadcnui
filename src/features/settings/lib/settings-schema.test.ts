import { describe, expect, it } from "vitest"
import type { ZodType } from "zod"

import {
  billingSettingsSchema,
  firstInvalidSection,
  preferencesSettingsSchema,
  profileSettingsSchema,
  SETTINGS_DEFAULT_VALUES,
  SETTINGS_SECTIONS,
  settingsSchema,
  teamSettingsSchema,
  workspaceSettingsSchema,
} from "@/features/settings/lib/settings-schema"

/** Every message raised for one field, in schema order. */
function messagesFor(
  schema: ZodType,
  values: unknown,
  field: string
): string[] {
  const result = schema.safeParse(values)
  if (result.success) return []
  return result.error.issues
    .filter((issue) => issue.path.join(".") === field)
    .map((issue) => issue.message)
}

/** The message react-hook-form would show (criteriaMode "firstError"). */
function messageFor(
  schema: ZodType,
  values: unknown,
  field: string
): string | null {
  return messagesFor(schema, values, field)[0] ?? null
}

const profile = (overrides: Record<string, unknown> = {}) => ({
  ...SETTINGS_DEFAULT_VALUES.profile,
  ...overrides,
})
const workspace = (overrides: Record<string, unknown> = {}) => ({
  ...SETTINGS_DEFAULT_VALUES.workspace,
  ...overrides,
})
const team = (overrides: Record<string, unknown> = {}) => ({
  ...SETTINGS_DEFAULT_VALUES.team,
  ...overrides,
})
const billing = (overrides: Record<string, unknown> = {}) => ({
  ...SETTINGS_DEFAULT_VALUES.billing,
  ...overrides,
})
const preferences = (overrides: Record<string, unknown> = {}) => ({
  ...SETTINGS_DEFAULT_VALUES.preferences,
  ...overrides,
})

describe("profileSettingsSchema", () => {
  it("accepts the seeded profile", () => {
    expect(profileSettingsSchema.safeParse(profile()).success).toBe(true)
  })

  describe("avatar", () => {
    it("accepts a preview url", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ avatarUrl: "blob:http://localhost/abc" }),
          "avatarUrl"
        )
      ).toBeNull()
    })

    it("accepts null once the image is removed", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ avatarUrl: null }),
          "avatarUrl"
        )
      ).toBeNull()
    })
  })

  describe("full name", () => {
    it("is required", () => {
      expect(
        messageFor(profileSettingsSchema, profile({ name: "" }), "name")
      ).toBe("Enter your full name.")
    })

    it("rejects whitespace only", () => {
      expect(
        messageFor(profileSettingsSchema, profile({ name: "   " }), "name")
      ).toBe("Enter your full name.")
    })

    it("trims the submitted value", () => {
      const result = profileSettingsSchema.parse(
        profile({ name: "  Ava Chen  " })
      )
      expect(result.name).toBe("Ava Chen")
    })
  })

  describe("email", () => {
    it("is required", () => {
      expect(
        messageFor(profileSettingsSchema, profile({ email: "" }), "email")
      ).toBe("Enter an email address.")
    })

    it("must look like an email address", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ email: "ava@atlashq" }),
          "email"
        )
      ).toBe("Enter a valid email address.")
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ email: "ava.atlashq.app" }),
          "email"
        )
      ).toBe("Enter a valid email address.")
    })

    it("accepts a plus tag and a subdomain", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ email: "ava+launch@mail.atlashq.app" }),
          "email"
        )
      ).toBeNull()
    })
  })

  describe("username", () => {
    it("is required", () => {
      expect(
        messageFor(profileSettingsSchema, profile({ username: "" }), "username")
      ).toBe("Enter a username.")
    })

    it("rejects spaces and punctuation", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ username: "ava chen" }),
          "username"
        )
      ).toBe("Use letters, numbers, hyphens, and underscores only.")
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ username: "ava.chen" }),
          "username"
        )
      ).toBe("Use letters, numbers, hyphens, and underscores only.")
    })

    it("accepts letters, numbers, hyphens and underscores", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ username: "ava_chen-01" }),
          "username"
        )
      ).toBeNull()
    })
  })

  describe("role and time zone", () => {
    it("accept any value the select offers", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ role: "design-lead", timezone: "singapore" }),
          "role"
        )
      ).toBeNull()
    })

    it("reject a value that is not on the list", () => {
      expect(
        messageFor(profileSettingsSchema, profile({ role: "ceo" }), "role")
      ).toBe("Choose a role.")
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ timezone: "mars" }),
          "timezone"
        )
      ).toBe("Choose a time zone.")
    })
  })

  describe("website", () => {
    it("is optional", () => {
      expect(
        messageFor(profileSettingsSchema, profile({ website: "" }), "website")
      ).toBeNull()
    })

    it("accepts a host and an optional path", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ website: "ava.atlashq.app" }),
          "website"
        )
      ).toBeNull()
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ website: "ava.atlashq.app/team" }),
          "website"
        )
      ).toBeNull()
    })

    it("rejects a scheme, since the field renders behind an https:// addon", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ website: "https://ava.atlashq.app" }),
          "website"
        )
      ).toBe("Enter the address without https://.")
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ website: "http://ava.atlashq.app" }),
          "website"
        )
      ).toBe("Enter the address without https://.")
    })

    it("rejects anything that is not a host", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ website: "ava" }),
          "website"
        )
      ).toBe("Enter a valid website address.")
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ website: "my site .app" }),
          "website"
        )
      ).toBe("Enter a valid website address.")
    })
  })

  describe("bio", () => {
    it("is optional", () => {
      expect(
        messageFor(profileSettingsSchema, profile({ bio: "" }), "bio")
      ).toBeNull()
    })

    it("accepts 280 characters", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ bio: "a".repeat(280) }),
          "bio"
        )
      ).toBeNull()
    })

    it("rejects 281 characters", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ bio: "a".repeat(281) }),
          "bio"
        )
      ).toBe("Keep the bio to 280 characters or fewer.")
    })

    it("counts the trimmed value", () => {
      expect(
        messageFor(
          profileSettingsSchema,
          profile({ bio: `  ${"a".repeat(280)}  ` }),
          "bio"
        )
      ).toBeNull()
    })
  })
})

describe("workspaceSettingsSchema", () => {
  it("accepts the seeded workspace", () => {
    expect(workspaceSettingsSchema.safeParse(workspace()).success).toBe(true)
  })

  it("requires a workspace name", () => {
    expect(
      messageFor(workspaceSettingsSchema, workspace({ name: "" }), "name")
    ).toBe("Enter a workspace name.")
  })

  describe("subdomain", () => {
    it("is required", () => {
      expect(
        messageFor(
          workspaceSettingsSchema,
          workspace({ subdomain: "" }),
          "subdomain"
        )
      ).toBe("Enter a workspace URL.")
    })

    it("accepts a lowercase slug", () => {
      expect(
        messageFor(
          workspaceSettingsSchema,
          workspace({ subdomain: "atlas-hq2" }),
          "subdomain"
        )
      ).toBeNull()
    })

    it("rejects uppercase, spaces, and stray hyphens", () => {
      const message = "Use lowercase letters, numbers, and hyphens."
      expect(
        messageFor(
          workspaceSettingsSchema,
          workspace({ subdomain: "Atlas" }),
          "subdomain"
        )
      ).toBe(message)
      expect(
        messageFor(
          workspaceSettingsSchema,
          workspace({ subdomain: "atlas hq" }),
          "subdomain"
        )
      ).toBe(message)
      expect(
        messageFor(
          workspaceSettingsSchema,
          workspace({ subdomain: "-hq" }),
          "subdomain"
        )
      ).toBe(message)
      expect(
        messageFor(
          workspaceSettingsSchema,
          workspace({ subdomain: "hq-" }),
          "subdomain"
        )
      ).toBe(message)
    })
  })

  describe("support email", () => {
    it("is required", () => {
      expect(
        messageFor(
          workspaceSettingsSchema,
          workspace({ supportEmail: "" }),
          "supportEmail"
        )
      ).toBe("Enter a support email.")
    })

    it("must look like an email address", () => {
      expect(
        messageFor(
          workspaceSettingsSchema,
          workspace({ supportEmail: "support at atlashq.app" }),
          "supportEmail"
        )
      ).toBe("Enter a valid email address.")
    })
  })

  it("rejects a landing view that is not on the list", () => {
    expect(
      messageFor(
        workspaceSettingsSchema,
        workspace({ landingView: "reports" }),
        "landingView"
      )
    ).toBe("Choose a landing view.")
  })

  it("keeps external sharing a boolean", () => {
    expect(
      workspaceSettingsSchema.safeParse(workspace({ externalSharing: "yes" }))
        .success
    ).toBe(false)
    expect(
      messageFor(
        workspaceSettingsSchema,
        workspace({ externalSharing: false }),
        "externalSharing"
      )
    ).toBeNull()
  })
})

describe("teamSettingsSchema", () => {
  it("accepts the seeded team defaults", () => {
    expect(teamSettingsSchema.safeParse(team()).success).toBe(true)
  })

  describe("invite domain", () => {
    it("is required", () => {
      expect(
        messageFor(
          teamSettingsSchema,
          team({ inviteDomain: "" }),
          "inviteDomain"
        )
      ).toBe("Enter an invite domain.")
    })

    it("accepts a multi-level domain", () => {
      expect(
        messageFor(
          teamSettingsSchema,
          team({ inviteDomain: "mail.atlashq.co.uk" }),
          "inviteDomain"
        )
      ).toBeNull()
    })

    it("rejects an address or a bare label", () => {
      const message = "Enter a valid domain, like atlashq.app."
      expect(
        messageFor(
          teamSettingsSchema,
          team({ inviteDomain: "ava@atlashq.app" }),
          "inviteDomain"
        )
      ).toBe(message)
      expect(
        messageFor(
          teamSettingsSchema,
          team({ inviteDomain: "atlashq" }),
          "inviteDomain"
        )
      ).toBe(message)
      expect(
        messageFor(
          teamSettingsSchema,
          team({ inviteDomain: "atlashq.app/team" }),
          "inviteDomain"
        )
      ).toBe(message)
    })
  })

  it("rejects a default role that is not on the list", () => {
    expect(
      messageFor(
        teamSettingsSchema,
        team({ defaultRole: "owner" }),
        "defaultRole"
      )
    ).toBe("Choose a default role.")
  })

  it("rejects a visibility that is not on the list", () => {
    expect(
      messageFor(
        teamSettingsSchema,
        team({ visibility: "secret" }),
        "visibility"
      )
    ).toBe("Choose team visibility.")
  })

  it("keeps the invite switches booleans", () => {
    expect(
      teamSettingsSchema.safeParse(team({ inviteApproval: "on" })).success
    ).toBe(false)
    expect(
      teamSettingsSchema.safeParse(team({ memberInvites: 1 })).success
    ).toBe(false)
  })
})

describe("billingSettingsSchema", () => {
  it("accepts the seeded billing details", () => {
    expect(billingSettingsSchema.safeParse(billing()).success).toBe(true)
  })

  it("rejects a plan that is not on the list", () => {
    expect(
      messageFor(billingSettingsSchema, billing({ plan: "free" }), "plan")
    ).toBe("Choose a plan.")
  })

  describe("billing email", () => {
    it("is required", () => {
      expect(
        messageFor(
          billingSettingsSchema,
          billing({ billingEmail: "" }),
          "billingEmail"
        )
      ).toBe("Enter a billing email.")
    })

    it("must look like an email address", () => {
      expect(
        messageFor(
          billingSettingsSchema,
          billing({ billingEmail: "ap@atlashq" }),
          "billingEmail"
        )
      ).toBe("Enter a valid email address.")
    })
  })

  it("requires a legal name", () => {
    expect(
      messageFor(
        billingSettingsSchema,
        billing({ legalName: "  " }),
        "legalName"
      )
    ).toBe("Enter the legal name.")
  })

  it("leaves the tax id and purchase order optional", () => {
    const result = billingSettingsSchema.safeParse(
      billing({ taxId: "", purchaseOrder: "  " })
    )

    expect(result.success).toBe(true)
    expect(result.data?.purchaseOrder).toBe("")
  })

  it("rejects spend limits and cadences that are not on the list", () => {
    expect(
      messageFor(
        billingSettingsSchema,
        billing({ spendLimit: "42" }),
        "spendLimit"
      )
    ).toBe("Choose a spend limit.")
    expect(
      messageFor(
        billingSettingsSchema,
        billing({ invoiceCadence: "daily" }),
        "invoiceCadence"
      )
    ).toBe("Choose an invoice cadence.")
  })

  it("keeps payment approval a boolean", () => {
    expect(
      billingSettingsSchema.safeParse(billing({ paymentApproval: null }))
        .success
    ).toBe(false)
  })
})

describe("preferencesSettingsSchema", () => {
  it("accepts the seeded preferences", () => {
    expect(preferencesSettingsSchema.safeParse(preferences()).success).toBe(
      true
    )
  })

  it("rejects values that are not on their list", () => {
    expect(
      messageFor(
        preferencesSettingsSchema,
        preferences({ theme: "sepia" }),
        "theme"
      )
    ).toBe("Choose a theme.")
    expect(
      messageFor(
        preferencesSettingsSchema,
        preferences({ language: "fr" }),
        "language"
      )
    ).toBe("Choose a language.")
    expect(
      messageFor(
        preferencesSettingsSchema,
        preferences({ timezone: "mars" }),
        "timezone"
      )
    ).toBe("Choose a time zone.")
    expect(
      messageFor(
        preferencesSettingsSchema,
        preferences({ weekStart: "tuesday" }),
        "weekStart"
      )
    ).toBe("Choose the first day of week.")
    expect(
      messageFor(
        preferencesSettingsSchema,
        preferences({ digest: "never" }),
        "digest"
      )
    ).toBe("Choose a digest cadence.")
  })

  it("keeps the smooth cursor a boolean", () => {
    expect(
      preferencesSettingsSchema.safeParse(preferences({ smoothCursor: "true" }))
        .success
    ).toBe(false)
  })
})

describe("settingsSchema", () => {
  it("accepts the stored settings the dialog opens with", () => {
    const result = settingsSchema.safeParse(SETTINGS_DEFAULT_VALUES)

    expect(result.success).toBe(true)
  })

  it("seeds the selects from the identity labels", () => {
    expect(SETTINGS_DEFAULT_VALUES.profile.role).toBe("staff-product-lead")
    expect(SETTINGS_DEFAULT_VALUES.profile.timezone).toBe("new-york")
  })

  it("reports errors under the tab that owns the field", () => {
    const result = settingsSchema.safeParse({
      ...SETTINGS_DEFAULT_VALUES,
      billing: billing({ billingEmail: "nope" }),
    })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toEqual(["billing", "billingEmail"])
  })

  it("collects errors from more than one tab at once", () => {
    const result = settingsSchema.safeParse({
      ...SETTINGS_DEFAULT_VALUES,
      profile: profile({ name: "" }),
      team: team({ inviteDomain: "" }),
    })

    expect(result.success).toBe(false)
    const sections = new Set(result.error?.issues.map((issue) => issue.path[0]))
    expect(sections).toEqual(new Set(["profile", "team"]))
  })
})

describe("firstInvalidSection", () => {
  it("returns null when nothing failed", () => {
    expect(firstInvalidSection({})).toBeNull()
  })

  it("returns the earliest tab in tab order", () => {
    expect(firstInvalidSection({ billing: {}, workspace: {} })).toBe(
      "workspace"
    )
    expect(firstInvalidSection({ preferences: {} })).toBe("preferences")
  })

  it("ignores tabs with no error", () => {
    expect(firstInvalidSection({ profile: undefined, team: {} })).toBe("team")
  })

  it("covers every tab the dialog renders", () => {
    expect(SETTINGS_SECTIONS).toEqual([
      "profile",
      "workspace",
      "team",
      "billing",
      "preferences",
    ])
  })
})
