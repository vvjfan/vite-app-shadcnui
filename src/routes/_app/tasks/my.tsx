import { createFileRoute } from "@tanstack/react-router"

import { GanttDemo } from "@/features/gantt/components/demo"

// My tasks = @reui/gantt-1 (Gantt timeline; drag-to-reschedule, dependencies).
export const Route = createFileRoute("/_app/tasks/my")({
  component: MyTasksPage,
})

function MyTasksPage() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        My tasks
      </h1>
      <GanttDemo />
    </div>
  )
}
