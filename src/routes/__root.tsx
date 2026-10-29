import { createRootRoute, Link, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"

export const Route = createRootRoute({ component: RootLayout })

function RootLayout() {
  return (
    <>
      <nav aria-label="Main navigation" className="flex gap-4 border-b p-6">
        <Link
          to="/"
          activeOptions={{ exact: true }}
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring [&.active]:font-bold"
        >
          Home
        </Link>
        <Link
          to="/about"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-ring [&.active]:font-bold"
        >
          About
        </Link>
      </nav>
      <main>
        <Outlet />
      </main>
      <TanStackRouterDevtools />
    </>
  )
}
