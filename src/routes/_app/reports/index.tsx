import { createFileRoute, redirect } from "@tanstack/react-router"

// Reports opens on Activity.
export const Route = createFileRoute("/_app/reports/")({
  beforeLoad: () => {
    throw redirect({ to: "/reports/activity" })
  },
})
