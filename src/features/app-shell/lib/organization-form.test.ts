import { describe, expect, it } from "vitest"
import type { z } from "zod"

import { WORKSPACE_LOGOS } from "@/features/app-shell/components/workspace-logos"
import {
  organizationFormSchema,
  WORKSPACE_LOGO_IDS,
} from "@/features/app-shell/lib/organization-form"

/** Every message the schema produced, grouped by the field it was reported on. */
function errorsByField(
  schema: z.ZodType<unknown, unknown>,
  value: unknown
): Record<string, string[]> {
  const result = schema.safeParse(value)
  if (result.success) return {}
  const grouped: Record<string, string[]> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "(form)"
    grouped[key] = [...(grouped[key] ?? []), issue.message]
  }
  return grouped
}

describe("organizationFormSchema", () => {
  it("accepts a name and a mark, trimming the name", () => {
    const result = organizationFormSchema.safeParse({
      name: "  Acme Inc  ",
      logoId: WORKSPACE_LOGOS[0].id,
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      name: "Acme Inc",
      logoId: WORKSPACE_LOGOS[0].id,
    })
  })

  it("requires a name", () => {
    expect(
      errorsByField(organizationFormSchema, { name: "", logoId: null })
    ).toEqual({ name: ["Enter an organization name."] })
    expect(
      errorsByField(organizationFormSchema, { name: "   ", logoId: null })
    ).toEqual({ name: ["Enter an organization name."] })
  })

  it("caps the name at 60 characters, measured after trimming", () => {
    expect(
      organizationFormSchema.safeParse({ name: "a".repeat(60), logoId: null })
        .success
    ).toBe(true)
    expect(
      organizationFormSchema.safeParse({
        name: `  ${"a".repeat(60)}  `,
        logoId: null,
      }).success
    ).toBe(true)
    expect(
      errorsByField(organizationFormSchema, {
        name: "a".repeat(61),
        logoId: null,
      })
    ).toEqual({ name: ["Use 60 characters or fewer."] })
  })

  it("treats a null logo as the valid 'keep the current avatar' choice", () => {
    const result = organizationFormSchema.safeParse({
      name: "Acme Inc",
      logoId: null,
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ name: "Acme Inc", logoId: null })
  })

  it("accepts every mark the picker offers", () => {
    expect(WORKSPACE_LOGO_IDS).toEqual(WORKSPACE_LOGOS.map((logo) => logo.id))
    for (const logoId of WORKSPACE_LOGO_IDS) {
      expect(
        organizationFormSchema.safeParse({ name: "Acme Inc", logoId }).success
      ).toBe(true)
    }
  })

  it("rejects a mark that does not exist", () => {
    expect(
      errorsByField(organizationFormSchema, {
        name: "Acme Inc",
        logoId: "netscape",
      })
    ).toEqual({ logoId: ["Pick a logo."] })
  })

  it("reports both broken fields at once", () => {
    expect(
      errorsByField(organizationFormSchema, { name: " ", logoId: "netscape" })
    ).toEqual({
      name: ["Enter an organization name."],
      logoId: ["Pick a logo."],
    })
  })
})
