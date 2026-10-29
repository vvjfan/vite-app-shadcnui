import { createFileRoute, useRouter } from "@tanstack/react-router"

import { Frame, FramePanel } from "@/components/reui/frame"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { KanbanBoard } from "@/features/kanban/components/kanban-board"
import { getTasks, getTeam } from "@/lib/data/planner/services"

// Board = the planner Kanban; it needs the planner tasks + roster, so the route loads them.
export const Route = createFileRoute("/_app/tasks/board")({
  loader: async () => {
    const [tasks, team] = await Promise.all([getTasks(), getTeam()])
    return { tasks, team }
  },
  component: BoardPage,
  pendingComponent: BoardPending,
  errorComponent: BoardError,
})

function BoardPage() {
  const { tasks, team } = Route.useLoaderData()

  return (
    <div
      className="flex w-full flex-col gap-4.5"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Task board
      </h1>
      <KanbanBoard tasks={tasks} team={team} />
    </div>
  )
}

function BoardPending() {
  return (
    <div className="flex gap-3 overflow-hidden px-1" aria-busy="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex w-[17.5rem] shrink-0 flex-col gap-2">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-[8.75rem] w-full rounded-lg" />
          <Skeleton className="h-[8.75rem] w-full rounded-lg" />
        </div>
      ))}
    </div>
  )
}

function BoardError({ error }: { error: unknown }) {
  const router = useRouter()

  return (
    <div className="w-full">
      <Frame dense>
        <FramePanel className="flex flex-col items-start gap-3 py-8">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">Could not load the board</h2>
            <p className="text-xs text-muted-foreground">
              {(error instanceof Error ? error.message : "") ||
                "Something went wrong while loading tasks."}
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
