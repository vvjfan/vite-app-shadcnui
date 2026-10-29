import { createFileRoute } from "@tanstack/react-router"

import { Dashboard } from "@/features/ai-ops/components/dashboard"

// @reui/solution-ai-ops-1 mounted on the app-shell content region. Developer
// refinements: routing grid Frame -> dense with edge inset, block header removed
// (sr-only h1 kept here), gap-4.5 between sections.
export const Route = createFileRoute("/_app/reports/ai-ops")({
  component: AiOpsPage,
})

function AiOpsPage() {
  return (
    <div
      className="flex w-full flex-col gap-4.5"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        AI Operations
      </h1>
      <Dashboard />
    </div>
  )
}
