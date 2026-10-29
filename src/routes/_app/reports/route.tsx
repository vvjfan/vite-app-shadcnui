import { Outlet, createFileRoute } from "@tanstack/react-router"

// Reports is a parent section: Activity / Analytics / AI Ops. The sidebar item
// expands to the sub-nav; each sub-route renders here.
export const Route = createFileRoute("/_app/reports")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
