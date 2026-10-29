import { createFileRoute } from "@tanstack/react-router"

import { EventCalendarApp } from "@/features/calendar/event-calendar/event-calendar-app"

// Calendar = @reui/event-calendar-1 (full event calendar; month/week/day/agenda,
// drag-to-reschedule). Self-contained demo data.
export const Route = createFileRoute("/_app/tasks/calendar")({
  component: CalendarPage,
})

function CalendarPage() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Calendar
      </h1>
      <EventCalendarApp />
    </div>
  )
}
