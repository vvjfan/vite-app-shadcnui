import { createMemoryHistory, createRouter } from "@tanstack/react-router"
import { describe, expect, it } from "vitest"
import { routeTree } from "@/routeTree.gen"

describe("Vite dashboard routing", () => {
  it.each([
    "/home",
    "/tasks/my",
    "/tasks/team",
    "/tasks/board",
    "/tasks/calendar",
    "/reports/activity",
    "/reports/analytics",
    "/reports/ai-ops",
    "/sign-in",
  ])("loads %s through client-side routing", async (path) => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [path] }),
      isServer: false,
      origin: "http://localhost",
    })
    await router.load()
    expect(router.state.matches.length).toBeGreaterThan(1)
    expect(router.state.matches.at(-1)?.status).toBe("success")
    expect(router.state.location.pathname).toBe(path)
    if (path !== "/sign-in") {
      expect(
        router.state.matches.some((match) => match.routeId === "/_app")
      ).toBe(true)
    }
  })

  it.each([
    ["/", "/home"],
    ["/tasks", "/tasks/my"],
    ["/reports", "/reports/activity"],
  ])("redirects %s to %s", async (path, target) => {
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: [path] }),
      isServer: false,
      origin: "http://localhost",
    })
    await router.load()
    expect(router.state.location.pathname).toBe(target)
    expect(router.state.matches.at(-1)?.status).toBe("success")
  })
})
