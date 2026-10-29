import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { Button } from "@/components/ui/button"

// Keep Tempo's button smoke check in the target's existing Node test environment.
describe("Button", () => {
  it("renders its label as an accessible native button", () => {
    const markup = renderToStaticMarkup(<Button>Click me</Button>)
    expect(markup).toContain("<button")
    expect(markup).toContain("Click me")
    expect(markup).toContain('data-slot="button"')
  })
})
