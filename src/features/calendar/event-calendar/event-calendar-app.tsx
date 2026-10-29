import * as React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { EventCalendar } from "@/components/reui/event-calendar/event-calendar"
import type { EventCalendarRenderEventProps } from "@/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content"
import { EVENT_CALENDAR_FADE_TRUNCATE } from "@/components/reui/event-calendar/event-calendar-event"
import {
  EventCalendarNavNext,
  EventCalendarNavPrev,
  EventCalendarNavToday,
  EventCalendarTitle,
  EventCalendarToolbar,
  EventCalendarViewSwitcher,
} from "@/components/reui/event-calendar/event-calendar-nav"
import type {
  EventCalendarOccurrence,
  EventCalendarProposedUpdate,
  EventCalendarSlotDraft,
  EventCalendarSlotInfo,
} from "@/components/reui/event-calendar/event-calendar-types"
import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame"
import { format } from "date-fns"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  addCalendar,
  addEvent,
  createDraft,
  deleteEvent,
  draftFromEvent,
  findLockedConflict,
  mergeHiddenEvents,
  nextCalendarId,
  nextEventId,
  prepareEvent,
  recolorCalendarEvents,
  removeCalendar,
  removeCalendarEvents,
  toggleHidden,
  unhideCalendar,
  updateCalendar,
  updateEvent,
  visibleEvents,
} from "../lib/calendar-crud"
import { CalendarDialog } from "./calendar-dialog"
import type { CalendarDialogState } from "./calendar-dialog"
import { CalendarsMenu } from "./calendars-menu"
import { ANCHOR, buildEvents, CALENDARS, HOLIDAY } from "./data"
import type { AppEvent, CalendarCategory, EventData } from "./data"
import { AttendeeStack } from "./event-fields"
import { EventSheet } from "./event-sheet"
import type { EventDraft, EventSheetState } from "./event-sheet"
import { RepeatIcon, PlusIcon } from "@phosphor-icons/react"

const errorToast = (message: string) =>
  toast.error(message, { classNames: { icon: "text-destructive" } })

export function EventCalendarApp() {
  const [events, setEvents] = useState<AppEvent[]>(() => buildEvents(ANCHOR))
  // Follows the grid so the toolbar's Add event opens on the month being looked
  // at. Seeded from ANCHOR because that is where the calendar itself opens.
  const [visibleDate, setVisibleDate] = useState<Date>(ANCHOR)
  const [sheet, setSheet] = useState<EventSheetState | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Calendars filter: which calendars are hidden from the grid. All start
  // visible; the owner hides any from the Calendars menu.
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  // The owner's calendars, with full CRUD from the Calendars menu.
  const [calendars, setCalendars] = useState<CalendarCategory[]>(CALENDARS)
  // Add/edit calendar dialog + a delete confirmation target.
  const [calendarDialog, setCalendarDialog] =
    useState<CalendarDialogState | null>(null)
  const [calendarToDelete, setCalendarToDelete] =
    useState<CalendarCategory | null>(null)
  const calendarIdRef = useRef(1)

  const idRef = useRef(1)
  // Latest-value refs so the stable callbacks below read fresh state without
  // re-subscribing the calendar on every edit.
  const eventsRef = useRef(events)
  React.useLayoutEffect(() => {
    eventsRef.current = events
  })
  const hiddenRef = useRef(hidden)
  React.useLayoutEffect(() => {
    hiddenRef.current = hidden
  })
  const calendarsRef = useRef(calendars)
  React.useLayoutEffect(() => {
    calendarsRef.current = calendars
  })
  // Only events on a visible calendar reach the grid. Derived during render -
  // no effect mirrors this.
  const gridEvents = useMemo(
    () => visibleEvents(events, hidden),
    [events, hidden]
  )

  // The grid is controlled, so a drag/resize emits only the *visible* subset.
  // Merge the hidden events back so filtering never drops them.
  const handleEventsChange = useCallback((next: AppEvent[]) => {
    setEvents((prev) => mergeHiddenEvents(prev, next, hiddenRef.current))
  }, [])

  const toggleCalendar = useCallback((id: string) => {
    setHidden((prev) => toggleHidden(prev, id))
  }, [])

  // ---- Calendar CRUD (from the Calendars menu) ---------------------------
  const openCreateCalendar = useCallback(
    () => setCalendarDialog({ mode: "create" }),
    []
  )
  const openEditCalendar = useCallback(
    (calendar: CalendarCategory) =>
      setCalendarDialog({ mode: "edit", calendar }),
    []
  )

  // Read the dialog from render scope so the setters below stay at top level
  // (never nest a setState in another setState updater - it breaks in StrictMode).
  const submitCalendar = useCallback(
    (values: { name: string; color: string }) => {
      if (!calendarDialog) return
      if (calendarDialog.mode === "edit" && calendarDialog.calendar) {
        const id = calendarDialog.calendar.id
        setCalendars((prev) => updateCalendar(prev, id, values))
        // Re-stamp the calendar's events so the grid reflects a color change.
        setEvents((prev) => recolorCalendarEvents(prev, id, values.color))
        toast.success("Calendar updated.")
      } else {
        const id = nextCalendarId(calendarIdRef.current++)
        setCalendars((prev) => addCalendar(prev, id, values))
        toast.success(`${values.name} calendar added.`)
      }
      setCalendarDialog(null)
    },
    [calendarDialog]
  )

  const requestDeleteCalendar = useCallback(
    (calendar: CalendarCategory) => setCalendarToDelete(calendar),
    []
  )
  // Deleting a calendar removes it, its events, and any hidden flag.
  const confirmDeleteCalendar = useCallback(() => {
    if (!calendarToDelete) return
    const id = calendarToDelete.id
    setCalendars((prev) => removeCalendar(prev, id))
    setEvents((prev) => removeCalendarEvents(prev, id))
    setHidden((prev) => unhideCalendar(prev, id))
    toast.success(`${calendarToDelete.name} calendar deleted.`)
    setCalendarToDelete(null)
  }, [calendarToDelete])

  // ---- Business rule: nothing may overlap a locked event on the same
  //      calendar. Shared by drags, resizes, and form saves. -----------------
  const lockedConflict = useCallback(
    (start: Date, end: Date, excludeId?: string, calendarId?: string) =>
      findLockedConflict(eventsRef.current, start, end, excludeId, calendarId),
    []
  )

  /** Live drag feedback (invalid cursor). */
  const canDropEvent = useCallback(
    (update: EventCalendarProposedUpdate<EventData>) => {
      if (update.event.readOnly) return false
      if (update.occurrence?.isRecurring) return false
      return !lockedConflict(
        update.start,
        update.end,
        update.event.id,
        update.resourceId ?? update.event.resourceId
      )
    },
    [lockedConflict]
  )

  /** Commit gate with toasts on rejection. */
  const handleEventUpdate = useCallback(
    (update: EventCalendarProposedUpdate<EventData>) => {
      if (update.event.readOnly) {
        errorToast(`"${update.event.title}" is locked.`)
        return false
      }
      if (update.occurrence?.isRecurring) {
        toast.info("Recurring events keep their series schedule.", {
          classNames: { icon: "text-amber-500" },
        })
        return false
      }
      const hit = lockedConflict(
        update.start,
        update.end,
        update.event.id,
        update.resourceId ?? update.event.resourceId
      )
      if (hit) {
        errorToast(`That would overlap the locked "${hit.title}" event.`)
        return false
      }
      // Accepted moves commit silently; the grid is the feedback.
    },
    [lockedConflict]
  )

  const handleDragBlocked = useCallback(
    (
      occurrence: EventCalendarOccurrence<EventData>,
      info: { gesture: "move" | "resize"; reason: string }
    ) => {
      if (info.reason === "readOnly") {
        errorToast(`"${occurrence.event.title}" is locked and can't be moved.`)
      }
    },
    []
  )

  // ---- Sheet open helpers -------------------------------------------------
  const openCreate = useCallback(
    (date: Date, allDay = false, end?: Date, calendarId?: string) => {
      setError(null)
      setSheet({
        mode: "create",
        draft: createDraft(date, allDay, end, calendarId, calendarsRef.current),
      })
    },
    []
  )

  const openView = useCallback(
    (occurrence: EventCalendarOccurrence<EventData>) => {
      setError(null)
      setSheet({ mode: "view", draft: draftFromEvent(occurrence) })
    },
    []
  )

  const startEdit = useCallback(() => {
    setError(null)
    setSheet((prev) => (prev ? { mode: "edit", draft: prev.draft } : prev))
  }, [])

  const updateDraft = useCallback((draft: EventDraft) => {
    setSheet((prev) => (prev ? { ...prev, draft } : prev))
  }, [])

  const closeSheet = useCallback((open: boolean) => {
    if (!open) {
      setSheet(null)
      setError(null)
    }
  }, [])

  const saveDraft = useCallback(() => {
    if (!sheet) return
    const draft = sheet.draft
    const prepared = prepareEvent(
      eventsRef.current,
      draft,
      calendarsRef.current
    )
    if (!prepared.ok) {
      setError(prepared.error)
      return
    }
    const fields = prepared.fields
    if (draft.id) {
      const id = draft.id
      setEvents((prev) => updateEvent(prev, id, fields))
    } else {
      const id = nextEventId(idRef.current++)
      setEvents((prev) => addEvent(prev, id, fields))
    }
    // Reveal the target calendar if it was filtered out, so the saved event
    // isn't silently hidden.
    setHidden((prev) => unhideCalendar(prev, draft.calendarId))
    setError(null)
    setSheet(null)
  }, [sheet])

  const deleteDraft = useCallback(() => {
    const id = sheet?.draft.id
    if (!id) return
    setEvents((prev) => deleteEvent(prev, id))
    toast.success("Event deleted.")
    setSheet(null)
  }, [sheet])

  // ---- Consumer-owned chip content (the headless contract) ----------------
  const renderEvent = useCallback(
    ({
      occurrence,
      segment,
      view,
    }: EventCalendarRenderEventProps<EventData>) => {
      const event = occurrence.event
      const attendees = event.data?.attendees ?? []
      // strictly > 24h => a cross-day bar (matches the primitive)
      const isBar =
        occurrence.allDay ||
        occurrence.end.getTime() - occurrence.start.getTime() >
          24 * 60 * 60 * 1000
      const timedBlock =
        !isBar &&
        (view === "week" ||
          view === "day" ||
          view === "days" ||
          view === "resource")
      const stacked =
        timedBlock && (segment.endMin ?? 0) - (segment.startMin ?? 0) >= 45
      return (
        <>
          {!timedBlock && (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-(--ec-event-color)"
            />
          )}
          {occurrence.isRecurring && (
            <RepeatIcon
              className="size-2.5 shrink-0 opacity-70"
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              "font-medium",
              stacked ? EVENT_CALENDAR_FADE_TRUNCATE : "truncate"
            )}
          >
            {event.title}
          </span>
          {!occurrence.allDay &&
            segment.isStart &&
            (view === "month" ? (
              <span className="shrink-0 text-xs text-muted-foreground">
                {format(occurrence.start, "h:mm a")}
              </span>
            ) : (
              <span
                className={cn(
                  "hidden text-muted-foreground @[8rem]:inline",
                  stacked ? EVENT_CALENDAR_FADE_TRUNCATE : "truncate"
                )}
              >
                {format(occurrence.start, "h:mm a")} -{" "}
                {format(occurrence.end, "h:mm a")}
              </span>
            ))}
          {/* Stacked attendee avatars on chips with room (meetings read
              distinct from solo events). */}
          {attendees.length > 0 && segment.isStart && (
            <span
              className={cn(
                "hidden shrink-0 @[9rem]:flex",
                stacked ? "absolute end-1 top-1" : "ms-auto"
              )}
            >
              <AttendeeStack ids={attendees} max={3} size="size-4" />
            </span>
          )}
        </>
      )
    },
    []
  )

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-background">
      <Frame dense className="min-h-0 flex-1">
        <EventCalendar
          events={gridEvents}
          onEventsChange={handleEventsChange}
          defaultView="month"
          defaultDate={ANCHOR}
          onDateChange={setVisibleDate}
          weekStartsOn={1}
          views={["month", "week", "day", "agenda"]}
          navButtonSize="default"
          nowIndicator
          scrollToHour={7}
          snapDuration={15}
          scrollMode="contained"
          scrollbars="custom"
          showDayAddButton
          offDays={{ dates: [HOLIDAY] }}
          onEventClick={openView}
          onSlotClick={(slot: EventCalendarSlotInfo) =>
            openCreate(slot.date, slot.allDay, slot.end, slot.resourceId)
          }
          onSelectSlot={(slot: EventCalendarSlotDraft) =>
            openCreate(slot.start, slot.allDay, slot.end, slot.resourceId)
          }
          onEventUpdate={handleEventUpdate}
          onDragBlocked={handleDragBlocked}
          canDropEvent={canDropEvent}
          renderEvent={renderEvent}
          className="min-h-0 flex-1"
        >
          {/* Toolbar row as the Frame header; the FramePanel below holds the
              calendar grid. Nav controls stay inside <EventCalendar> to keep
              its context. On mobile the toolbar wraps onto its own row while
              the nav (Today/view/prev-next/title) stays on one line. */}
          <FrameHeader className="flex-row flex-wrap items-center gap-1 px-2">
            <TooltipProvider delay={600} closeDelay={0} timeout={300}>
              <EventCalendarNavToday />
              <EventCalendarViewSwitcher />
              <div className="flex items-center">
                <EventCalendarNavPrev />
                <EventCalendarNavNext />
              </div>
              <EventCalendarTitle className="ms-3" />
              <div className="grow" />
              <EventCalendarToolbar>
                <CalendarsMenu
                  calendars={calendars}
                  hidden={hidden}
                  onToggle={toggleCalendar}
                  onNewCalendar={openCreateCalendar}
                  onEditCalendar={openEditCalendar}
                  onDeleteCalendar={requestDeleteCalendar}
                />
                <Button onClick={() => openCreate(visibleDate, false)}>
                  <PlusIcon className="size-4" aria-hidden="true" />
                  Add event
                </Button>
              </EventCalendarToolbar>
            </TooltipProvider>
          </FrameHeader>
          {/* Match My tasks: the FramePanel's top border is the single divider
              under the FrameHeader. The calendar view also renders its own
              border-t, which doubled that line, so drop the view's border-t
              (scoped to the event-calendar-content child) and keep the panel's. */}
          <FramePanel className="flex min-h-0 flex-1 flex-col p-0! shadow-none! [&_[data-slot=event-calendar-content]>*]:border-t-0!">
            <EventCalendarContent />
          </FramePanel>
        </EventCalendar>
      </Frame>

      <EventSheet
        state={sheet}
        error={error}
        calendars={calendars}
        onOpenChange={closeSheet}
        onDraftChange={updateDraft}
        onEdit={startEdit}
        onSave={saveDraft}
        onDelete={deleteDraft}
      />

      <CalendarDialog
        state={calendarDialog}
        onOpenChange={(open) => !open && setCalendarDialog(null)}
        onSubmit={submitCalendar}
      />

      <AlertDialog
        open={calendarToDelete !== null}
        onOpenChange={(open) => !open && setCalendarToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {calendarToDelete?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the calendar and its events. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteCalendar}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
