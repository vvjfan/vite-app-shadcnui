import { createFileRoute } from "@tanstack/react-router"

import { TaskManagementGridView } from "@/features/tasks/components/data-grid-view"

// Team tasks = the @reui/data-grid-expansion-1 task grid (verbatim, own demo data).
export const Route = createFileRoute("/_app/tasks/team")({
  component: TeamTasksPage,
})

function TeamTasksPage() {
  return (
    <div
      className="flex w-full flex-col gap-4.5"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Team tasks
      </h1>
      <TaskManagementGridView />
    </div>
  )
}
