import { createFileRoute } from "@tanstack/react-router"

import { ActivityTimeline } from "@/features/reports/activity/components/activity-timeline"

// Activity = @reui/solution-crm-5 (verbatim, its own demo data + design).
export const Route = createFileRoute("/_app/reports/activity")({
  component: ActivityPage,
})

function ActivityPage() {
  return (
    <div
      className="flex w-full flex-col gap-4.5"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Activity
      </h1>
      <ActivityTimeline />
    </div>
  )
}
