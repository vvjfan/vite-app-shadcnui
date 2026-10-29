import { createRootRoute } from "@tanstack/react-router"
import { App } from "@/App"
import { RouteProgress } from "@/components/route-progress"
import {
  NotFound,
  RouteError,
} from "@/features/app-shell/components/error-screens"

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: () => <NotFound className="min-h-svh" />,
  errorComponent: ({ error }) => (
    <RouteError error={error} className="min-h-svh" />
  ),
})

function RootLayout() {
  return (
    <>
      <RouteProgress />
      <App />
    </>
  )
}
