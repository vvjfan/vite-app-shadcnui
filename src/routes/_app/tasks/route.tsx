import { Outlet, createFileRoute } from "@tanstack/react-router"

// Tasks is a parent section: My tasks / Team tasks / Board / Calendar. The sidebar
// item expands to the sub-nav; each sub-route renders here.
export const Route = createFileRoute("/_app/tasks")({
  component: RouteComponent,
})

function RouteComponent() {
  return <Outlet />
}
