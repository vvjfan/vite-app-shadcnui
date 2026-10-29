import { describe, expect, it } from "vitest"

import { ORDERS } from "../components/data"
import { parseDashboardSearch } from "./dashboard-search"
import { filterOrders } from "./filter-orders"

describe("parseDashboardSearch", () => {
  it("passes a well-formed search through unchanged", () => {
    expect(parseDashboardSearch({ q: "onboarding", exceptions: true })).toEqual(
      {
        q: "onboarding",
        exceptions: true,
      }
    )
  })

  it("returns both keys undefined for an empty search", () => {
    expect(parseDashboardSearch({})).toEqual({
      q: undefined,
      exceptions: undefined,
    })
  })

  describe("q", () => {
    it("keeps a non-empty string verbatim, including its case", () => {
      expect(parseDashboardSearch({ q: "WEB-142" }).q).toBe("WEB-142")
    })

    // An empty q must collapse to undefined, not "". The route writes the search
    // back with `q: query || undefined`, so a "" that survived here would leave a
    // dangling `?q=` in the address bar of an unfiltered view.
    it("drops an empty string", () => {
      expect(parseDashboardSearch({ q: "" }).q).toBeUndefined()
    })

    // Whitespace is deliberately NOT trimmed: filterOrders trims the query
    // itself, so " " filters nothing, yet the input still shows a space and the
    // Clear button still appears. Pinning current behaviour.
    it("keeps a whitespace-only string", () => {
      expect(parseDashboardSearch({ q: " " }).q).toBe(" ")
      expect(parseDashboardSearch({ q: "  \t " }).q).toBe("  \t ")
    })

    it("preserves leading and trailing whitespace around real text", () => {
      expect(parseDashboardSearch({ q: "  nav  " }).q).toBe("  nav  ")
    })

    const NON_STRING_QUERIES: [string, unknown][] = [
      ["a number", 42],
      ["zero", 0],
      ["a boolean", true],
      ["null", null],
      ["undefined", undefined],
      ["an array", ["nav"]],
      ["an object", { text: "nav" }],
    ]

    it.each(NON_STRING_QUERIES)("drops %s", (_label, value) => {
      expect(parseDashboardSearch({ q: value }).q).toBeUndefined()
    })
  })

  describe("exceptions", () => {
    it("accepts the parsed boolean true", () => {
      expect(parseDashboardSearch({ exceptions: true }).exceptions).toBe(true)
    })

    // The router hands back a raw string when it cannot parse the value, so
    // ?exceptions=true has to work in both shapes or a shared link would open
    // with the filter silently off.
    it('accepts the string "true"', () => {
      expect(parseDashboardSearch({ exceptions: "true" }).exceptions).toBe(true)
    })

    // "TRUE"/"True" are in here on purpose: the check is case sensitive, so a
    // hand-typed ?exceptions=TRUE quietly does nothing.
    const REJECTED_EXCEPTIONS: [string, unknown][] = [
      ["false", false],
      ['"false"', "false"],
      ["1", 1],
      ['"1"', "1"],
      ['"TRUE"', "TRUE"],
      ['"True"', "True"],
      ['"yes"', "yes"],
      ['""', ""],
      ["null", null],
      ["undefined", undefined],
    ]

    it.each(REJECTED_EXCEPTIONS)(
      "drops %s rather than storing it",
      (_label, value) => {
        expect(
          parseDashboardSearch({ exceptions: value }).exceptions
        ).toBeUndefined()
      }
    )

    it("never returns false, only true or undefined", () => {
      // `false` in the URL would be indistinguishable from the default for the
      // user but would keep ?exceptions=false pinned to every subsequent link.
      for (const value of [false, "false", 0, "off"]) {
        expect(parseDashboardSearch({ exceptions: value }).exceptions).not.toBe(
          false
        )
      }
    })
  })

  describe("unknown keys", () => {
    it("drops anything that is not q or exceptions", () => {
      const parsed = parseDashboardSearch({
        q: "nav",
        exceptions: true,
        page: 3,
        sort: "amount",
      })
      expect(Object.keys(parsed).sort()).toEqual(["exceptions", "q"])
      expect(parsed).not.toHaveProperty("page")
      expect(parsed).not.toHaveProperty("sort")
    })

    it("drops unknown keys even when nothing valid is present", () => {
      const parsed = parseDashboardSearch({ tab: "queue" })
      expect(parsed).toEqual({ q: undefined, exceptions: undefined })
    })
  })

  it("returns a new object and never mutates the input", () => {
    const raw: Record<string, unknown> = {
      q: "nav",
      exceptions: "true",
      page: 2,
    }
    const parsed = parseDashboardSearch(raw)

    expect(parsed).not.toBe(raw)
    expect(raw).toEqual({ q: "nav", exceptions: "true", page: 2 })
  })

  // The parsed search is fed straight into filterOrders, so the two have to
  // agree on what "no filter" means.
  it("produces defaults that filter nothing out of the real queue", () => {
    const { q, exceptions } = parseDashboardSearch({})
    expect(filterOrders(ORDERS, q ?? "", exceptions ?? false)).toHaveLength(
      ORDERS.length
    )
  })

  it("round-trips a shared link into the expected result set", () => {
    const { q, exceptions } = parseDashboardSearch({
      q: "TASK-2052",
      exceptions: "true",
    })
    expect(
      filterOrders(ORDERS, q ?? "", exceptions ?? false).map((o) => o.id)
    ).toEqual(["TASK-2052"])
  })
})
