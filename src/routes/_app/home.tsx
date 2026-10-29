import { createFileRoute, useRouter } from "@tanstack/react-router"

import { Frame, FramePanel } from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { RevenueDashboard } from "@/features/dashboard/components/revenue-dashboard"
import { parseDashboardSearch } from "@/features/dashboard/lib/dashboard-search"
import { getOrders } from "@/features/dashboard/lib/services"

// List state (search + exceptions filter) lives in the URL so a filtered view is a
// shareable link. Both are optional -> absent from the URL when at their default.
export const Route = createFileRoute("/_app/home")({
  validateSearch: parseDashboardSearch,
  loader: async () => ({ orders: await getOrders() }),
  component: DashboardPage,
  pendingComponent: DashboardPending,
  errorComponent: DashboardError,
})

function DashboardPage() {
  const { orders } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <RevenueDashboard
      orders={orders}
      query={search.q ?? ""}
      exceptionsOnly={search.exceptions ?? false}
      onQueryChange={(query) =>
        void navigate({
          search: (prev) => ({ ...prev, q: query || undefined }),
          replace: true,
        })
      }
      onExceptionsToggle={() =>
        void navigate({
          search: (prev) => ({
            ...prev,
            exceptions: prev.exceptions ? undefined : true,
          }),
        })
      }
    />
  )
}

function DashboardPending() {
  return (
    <div className="flex w-full flex-col gap-4.5" aria-busy="true">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <div className="grid gap-4.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <Skeleton className="h-[360px] w-full rounded-xl" />
        <Skeleton className="h-[360px] w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  )
}

function DashboardError({ error }: { error: unknown }) {
  // reset() only clears the error boundary; router.invalidate() re-runs the loader
  // AND resets the boundary - the correct retry for a loader failure.
  const router = useRouter()

  return (
    <div className="w-full">
      <Frame dense>
        <FramePanel className="flex flex-col items-start gap-3 py-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">
              Could not load the dashboard
            </h2>
            <p className="text-xs text-muted-foreground">
              {(error instanceof Error ? error.message : "") ||
                "Something went wrong while loading the dashboard."}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void router.invalidate()}
          >
            Try again
          </Button>
        </FramePanel>
      </Frame>
    </div>
  )
}
