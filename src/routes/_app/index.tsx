import { createFileRoute, redirect } from "@tanstack/react-router"

// The signed-in app opens on the Home page. Hitting the app root (`/`) redirects
// to `/home` in `beforeLoad`, so first load lands on a real page instead of a
// placeholder. Redirect-only route - no component is ever rendered.
export const Route = createFileRoute("/_app/")({
  beforeLoad: () => {
    throw redirect({ to: "/home" })
  },
})
