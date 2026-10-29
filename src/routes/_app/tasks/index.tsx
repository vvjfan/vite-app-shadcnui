import { createFileRoute, redirect } from "@tanstack/react-router"

// Tasks opens on My tasks.
export const Route = createFileRoute("/_app/tasks/")({
  beforeLoad: () => {
    throw redirect({ to: "/tasks/my" })
  },
})
