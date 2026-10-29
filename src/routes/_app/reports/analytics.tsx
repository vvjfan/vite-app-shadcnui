import { createFileRoute } from "@tanstack/react-router"

import { ActivationReport } from "@/features/reports/analytics/components/activation-report"

// Analytics = @reui/solution-analytics-3 (verbatim demo data; full-width + dense
// Frames to match the template surface).
export const Route = createFileRoute("/_app/reports/analytics")({
  component: AnalyticsPage,
})

function AnalyticsPage() {
  return (
    <div
      className="flex w-full flex-col gap-4.5"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Analytics
      </h1>
      <ActivationReport />
    </div>
  )
}
