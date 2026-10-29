import { describe, expect, it } from "vitest"

import { signInSchema } from "@/features/auth/lib/sign-in-schema"

/** Every message the field can produce, in schema order. */
function messages(email: unknown): string[] {
  const result = signInSchema.safeParse({ email })
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe("signInSchema", () => {
  it("accepts a work email", () => {
    const result = signInSchema.safeParse({ email: "ava@atlashq.app" })

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ email: "ava@atlashq.app" })
  })

  it("accepts subdomains, plus tags and dotted local parts", () => {
    expect(messages("ava.chen+launch@mail.atlashq.co.uk")).toEqual([])
  })

  it("trims the value before validating and submits the trimmed address", () => {
    const result = signInSchema.safeParse({ email: "  ava@atlashq.app  " })

    expect(result.success).toBe(true)
    expect(result.data?.email).toBe("ava@atlashq.app")
  })

  it("rejects an empty value", () => {
    expect(messages("")).toEqual(["Enter a valid work email."])
  })

  it("rejects whitespace only", () => {
    expect(messages("   ")).toEqual(["Enter a valid work email."])
  })

  it("rejects a value with no @", () => {
    expect(messages("ava.atlashq.app")).toEqual(["Enter a valid work email."])
  })

  it("rejects a domain with no dot", () => {
    expect(messages("ava@atlashq")).toEqual(["Enter a valid work email."])
  })

  it("rejects a missing local part", () => {
    expect(messages("@atlashq.app")).toEqual(["Enter a valid work email."])
  })

  it("rejects an inner space", () => {
    expect(messages("ava chen@atlashq.app")).toEqual([
      "Enter a valid work email.",
    ])
  })

  it("rejects two @ signs", () => {
    expect(messages("ava@@atlashq.app")).toEqual(["Enter a valid work email."])
  })

  it("rejects a non-string value", () => {
    const result = signInSchema.safeParse({ email: 42 })

    expect(result.success).toBe(false)
  })
})
