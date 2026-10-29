import * as React from "react"
import { useEffect, useRef } from "react"
import { Badge } from "@/components/reui/badge"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Controller, useForm } from "react-hook-form"

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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { eventFormSchema } from "../lib/event-form-schema"
import type { EventFormValues } from "../lib/event-form-schema"
import type { CalendarCategory } from "./data"
import {
  AttendeeStack,
  CalendarDot,
  CalendarSelect,
  DateField,
  GuestsCombobox,
  TimeSelect,
} from "./event-fields"
import {
  XIcon,
  ClockIcon,
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  FileTextIcon,
  TrashIcon as Trash2Icon,
  PencilSimpleIcon as PencilIcon,
  InfoIcon,
} from "@phosphor-icons/react"

export const EVENT_FORM_ID = "event-calendar-form"

/** The edit buffer. The owning calendar (calendarId) is the event's resourceId;
 *  dates are "yyyy-MM-dd", times are "HH:mm". */
export interface EventDraft {
  id?: string
  title: string
  description: string
  location: string
  calendarId: string
  attendees: string[]
  date: string
  /** Inclusive last day. */
  dateEnd: string
  start: string
  end: string
  allDay: boolean
  readOnly?: boolean
  /** Display-only recurrence summary, e.g. "Repeats weekly". */
  recurrenceLabel?: string
}

export type EventSheetMode = "view" | "edit" | "create"

export interface EventSheetState {
  mode: EventSheetMode
  draft: EventDraft
}

interface EventSheetProps {
  state: EventSheetState | null
  error: string | null
  calendars: CalendarCategory[]
  onOpenChange: (open: boolean) => void
  onDraftChange: (draft: EventDraft) => void
  onEdit: () => void
  onSave: () => void
  onDelete: () => void
}

const toDate = (day: string, time: string) => new Date(`${day}T${time}:00`)

/** ReUI inline dot separator between two rendered segments. */
function Dot() {
  return (
    <span
      aria-hidden="true"
      className="size-1 shrink-0 rounded-full bg-muted-foreground/40"
    />
  )
}

/** The "when" split into a date part and (for timed events) a time-range part,
 *  respecting all-day + multi-day spans. */
function whenParts(draft: EventDraft): { date: string; time: string | null } {
  const start = toDate(draft.date, draft.allDay ? "00:00" : draft.start)
  const sameDay = draft.date === draft.dateEnd
  if (draft.allDay) {
    return {
      date: sameDay
        ? format(start, "EEEE, MMMM d")
        : `${format(start, "MMM d")} - ${format(toDate(draft.dateEnd, "00:00"), "MMM d")}`,
      time: null,
    }
  }
  const end = toDate(draft.dateEnd, draft.end)
  if (!sameDay) {
    return {
      date: `${format(start, "MMM d, h:mm a")} - ${format(end, "MMM d, h:mm a")}`,
      time: null,
    }
  }
  return {
    date: format(start, "EEEE, MMMM d"),
    time: `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
  }
}

/** Inclusive all-day span in days. */
function allDayDays(draft: EventDraft): number {
  const start = new Date(`${draft.date}T00:00:00`)
  const end = new Date(`${draft.dateEnd}T00:00:00`)
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

/** Timed duration, e.g. "1h 30m". */
function durationLabel(draft: EventDraft): string {
  const start = toDate(draft.date, draft.start)
  const end = toDate(draft.dateEnd, draft.end)
  const mins = Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60_000)
  )
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  if (hours && rest) return `${hours}h ${rest}m`
  if (hours) return `${hours}h`
  return `${rest}m`
}

/** The clock detail: a strong date/time line, then a muted meta line (all-day
 *  or duration, plus recurrence) with dot separators between segments. */
function WhenDetail({ draft }: { draft: EventDraft }) {
  const parts = whenParts(draft)
  const days = draft.allDay ? allDayDays(draft) : 0
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-1.5 text-foreground">
        <span>{parts.date}</span>
        {parts.time && (
          <>
            <Dot />
            <span>{parts.time}</span>
          </>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <span>{draft.allDay ? "All day" : durationLabel(draft)}</span>
        {draft.allDay && days > 1 && (
          <>
            <Dot />
            <span>{days} days</span>
          </>
        )}
        {draft.recurrenceLabel && (
          <>
            <Dot />
            <span>{draft.recurrenceLabel}</span>
          </>
        )}
      </div>
    </>
  )
}

export function EventSheet({
  state,
  error,
  calendars,
  onOpenChange,
  onDraftChange,
  onEdit,
  onSave,
  onDelete,
}: EventSheetProps) {
  const isForm = state?.mode === "edit" || state?.mode === "create"
  return (
    <Sheet open={state !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        initialFocus={false}
        className="inset-y-4! right-4! left-auto! flex h-[calc(100svh-2rem)]! w-[min(30rem,calc(100vw-2rem))]! max-w-none! flex-col gap-0 overflow-hidden rounded-xl border p-0 outline-none"
      >
        {state &&
          (isForm ? (
            <EventForm
              // Keyed so the form re-seeds from its defaultValues whenever a
              // different event (or a new draft) opens it.
              key={`${state.mode}:${state.draft.id ?? "new"}`}
              draft={state.draft}
              mode={state.mode as "edit" | "create"}
              error={error}
              calendars={calendars}
              onChange={onDraftChange}
              onSave={onSave}
              onDelete={onDelete}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <EventView
              draft={state.draft}
              calendars={calendars}
              onEdit={onEdit}
              onDelete={onDelete}
              onClose={() => onOpenChange(false)}
            />
          ))}
      </SheetContent>
    </Sheet>
  )
}

/** Header close button, shared by view + form. */
function CloseButton({ onClose }: { onClose: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="-me-1 shrink-0"
      onClick={onClose}
    >
      <XIcon className="size-4" aria-hidden="true" />
      <span className="sr-only">Close</span>
    </Button>
  )
}

/** A labeled detail row for the view mode: fixed-width icon gutter + content. */
function DetailRow({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-sm">{children}</div>
    </div>
  )
}

function EventView({
  draft,
  calendars,
  onEdit,
  onDelete,
  onClose,
}: {
  draft: EventDraft
  calendars: CalendarCategory[]
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const owner = calendars.find((entry) => entry.id === draft.calendarId)
  const attendees = draft.attendees ?? []
  return (
    <>
      {/* Header: title + status badges share one line. The calendar color is
          shown in the Calendar detail row below, not repeated here. */}
      <div className="flex shrink-0 items-center gap-2.5 border-b px-5 py-3">
        <SheetTitle className="min-w-0 shrink truncate text-lg leading-tight font-semibold">
          {draft.title}
        </SheetTitle>
        <SheetDescription className="sr-only">Event details.</SheetDescription>
        {draft.allDay && (
          <Badge variant="outline" className="shrink-0">
            All day
          </Badge>
        )}
        {draft.readOnly && (
          <Badge variant="warning-light" className="shrink-0">
            Locked
          </Badge>
        )}
        {/* spacer keeps the badges next to the title and the close at the edge */}
        <div aria-hidden="true" className="flex-1" />
        <CloseButton onClose={onClose} />
      </div>

      {/* Details */}
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-4 px-5 py-5">
            <DetailRow icon={<ClockIcon />}>
              <WhenDetail draft={draft} />
            </DetailRow>

            {owner && (
              <DetailRow icon={<CalendarIcon />}>
                <div className="flex items-center gap-2">
                  <CalendarDot color={owner.color} />
                  <span className="truncate text-foreground">{owner.name}</span>
                </div>
              </DetailRow>
            )}

            {draft.location && (
              <DetailRow icon={<MapPinIcon />}>
                <p className="text-foreground">{draft.location}</p>
              </DetailRow>
            )}

            {attendees.length > 0 && (
              <DetailRow icon={<UsersIcon />}>
                <div className="flex items-center gap-2">
                  <AttendeeStack ids={attendees} />
                  <span className="text-xs text-muted-foreground">
                    {attendees.length} guest{attendees.length > 1 ? "s" : ""}
                  </span>
                </div>
              </DetailRow>
            )}

            {draft.description && (
              <DetailRow icon={<FileTextIcon />}>
                <p className="leading-relaxed whitespace-pre-line text-foreground">
                  {draft.description}
                </p>
              </DetailRow>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 border-t bg-muted px-5 py-3">
        {draft.readOnly ? (
          <Button
            type="button"
            variant="outline"
            className="ms-auto"
            onClick={onClose}
          >
            Close
          </Button>
        ) : (
          <>
            <DeleteConfirm onDelete={onDelete}>
              <Button type="button" variant="outline" className="me-auto">
                <Trash2Icon className="size-4" aria-hidden="true" />
                Delete
              </Button>
            </DeleteConfirm>
            <Button type="button" onClick={onEdit}>
              <PencilIcon className="size-4" aria-hidden="true" />
              Edit
            </Button>
          </>
        )}
      </div>
    </>
  )
}

function EventForm({
  draft,
  mode,
  error,
  calendars,
  onChange,
  onSave,
  onDelete,
  onClose,
}: {
  draft: EventDraft
  mode: "edit" | "create"
  error: string | null
  calendars: CalendarCategory[]
  onChange: (draft: EventDraft) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: draft.title,
      calendarId: draft.calendarId,
      allDay: draft.allDay,
      date: draft.date,
      dateEnd: draft.dateEnd,
      start: draft.start,
      end: draft.end,
      location: draft.location,
      description: draft.description,
      attendees: draft.attendees,
    },
    mode: "onTouched",
  })

  // The parent owns the draft and reads it back in onSave(), so every edit is
  // mirrored up. The refs keep the subscription itself stable across the parent
  // re-renders that mirroring causes.
  const onChangeRef = useRef(onChange)
  React.useLayoutEffect(() => {
    onChangeRef.current = onChange
  })
  const draftRef = useRef(draft)
  React.useLayoutEffect(() => {
    draftRef.current = draft
  })
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ values }) => {
          // Spread over the draft so the fields the form does not edit (id,
          // readOnly, the recurrence label) survive.
          onChangeRef.current({ ...draftRef.current, ...values })
        },
      }),
    [form]
  )

  const allDay = form.watch("allDay")

  /**
   * The span rule lives on the end date and the end time, so a change to any
   * other part of the span has to re-check those two fields or a message that
   * was just fixed would linger. Pickers re-check on every pick rather than on
   * blur: picking a value is already a deliberate act.
   */
  const recheckSpan = () => void form.trigger(["dateEnd", "end"])

  return (
    <TooltipProvider>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
        <SheetTitle className="flex-1 text-base font-semibold">
          {mode === "edit" ? "Edit event" : "New event"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          {mode === "edit"
            ? "Update this event's details."
            : "Add a new event to your calendar."}
        </SheetDescription>
        <CloseButton onClose={onClose} />
      </div>

      {/* Form body */}
      <div className="min-h-0 flex-1">
        <ScrollArea className="h-full">
          <form
            id={EVENT_FORM_ID}
            className="flex flex-col gap-5 px-5 py-5"
            onSubmit={form.handleSubmit(() => onSave())}
            noValidate
          >
            <Controller
              control={form.control}
              name="title"
              render={({ field, fieldState }) => (
                <Field
                  className="gap-1.5"
                  data-invalid={fieldState.invalid || undefined}
                >
                  <FieldLabel htmlFor="event-title">Title</FieldLabel>
                  <Input
                    {...field}
                    id="event-title"
                    placeholder="Add title"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid || undefined}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="calendarId"
              render={({ field, fieldState }) => (
                <Field
                  className="gap-1.5"
                  data-invalid={fieldState.invalid || undefined}
                >
                  <FieldLabel htmlFor="event-calendar">Calendar</FieldLabel>
                  <CalendarSelect
                    id="event-calendar"
                    value={field.value}
                    calendars={calendars}
                    onChange={field.onChange}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="allDay"
              render={({ field }) => (
                <Field orientation="horizontal">
                  <FieldLabel
                    htmlFor="event-all-day"
                    className="flex items-center gap-1.5"
                  >
                    All day
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <span
                            tabIndex={0}
                            aria-label="About all-day events"
                            className="inline-flex cursor-help rounded-full text-muted-foreground/70 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        }
                      >
                        <InfoIcon className="size-3.5" aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-56">
                        All-day events span whole days. They show in the all-day
                        row and as bars across the month view.
                      </TooltipContent>
                    </Tooltip>
                  </FieldLabel>
                  <Switch
                    id="event-all-day"
                    checked={field.value}
                    onCheckedChange={(checked: boolean) => {
                      // Turning this on takes the times out of the span, so any
                      // time message has to go with them.
                      field.onChange(checked)
                      recheckSpan()
                    }}
                  />
                </Field>
              )}
            />

            <div className="flex gap-3">
              <Controller
                control={form.control}
                name="date"
                render={({ field, fieldState }) => (
                  <Field
                    className="min-w-0 flex-1 gap-1.5"
                    data-invalid={fieldState.invalid || undefined}
                  >
                    <FieldLabel htmlFor="event-start-date">Starts</FieldLabel>
                    <DateField
                      id="event-start-date"
                      value={field.value}
                      onSelect={(date) => {
                        field.onChange(date)
                        // Drag the end forward with the start rather than
                        // leaving an impossible span behind.
                        if (form.getValues("dateEnd") < date) {
                          form.setValue("dateEnd", date)
                        }
                        recheckSpan()
                      }}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name="dateEnd"
                render={({ field, fieldState }) => (
                  <Field
                    className="min-w-0 flex-1 gap-1.5"
                    data-invalid={fieldState.invalid || undefined}
                  >
                    <FieldLabel htmlFor="event-end-date">Ends</FieldLabel>
                    <DateField
                      id="event-end-date"
                      value={field.value}
                      onSelect={(dateEnd) => {
                        field.onChange(dateEnd)
                        recheckSpan()
                      }}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            {!allDay && (
              <div className="flex gap-3">
                <Controller
                  control={form.control}
                  name="start"
                  render={({ field, fieldState }) => (
                    <Field
                      className="min-w-0 flex-1 gap-1.5"
                      data-invalid={fieldState.invalid || undefined}
                    >
                      <FieldLabel htmlFor="event-start-time">From</FieldLabel>
                      <TimeSelect
                        id="event-start-time"
                        value={field.value}
                        onChange={(start) => {
                          field.onChange(start)
                          recheckSpan()
                        }}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
                <Controller
                  control={form.control}
                  name="end"
                  render={({ field, fieldState }) => (
                    <Field
                      className="min-w-0 flex-1 gap-1.5"
                      data-invalid={fieldState.invalid || undefined}
                    >
                      <FieldLabel htmlFor="event-end-time">To</FieldLabel>
                      <TimeSelect
                        id="event-end-time"
                        value={field.value}
                        onChange={(end) => {
                          field.onChange(end)
                          recheckSpan()
                        }}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              </div>
            )}

            <Controller
              control={form.control}
              name="location"
              render={({ field, fieldState }) => (
                <Field
                  className="gap-1.5"
                  data-invalid={fieldState.invalid || undefined}
                >
                  <FieldLabel htmlFor="event-location">Location</FieldLabel>
                  <Input
                    {...field}
                    id="event-location"
                    placeholder="Add a room or link"
                    autoComplete="off"
                    aria-invalid={fieldState.invalid || undefined}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="attendees"
              render={({ field, fieldState }) => (
                <Field
                  className="gap-1.5"
                  data-invalid={fieldState.invalid || undefined}
                >
                  <FieldLabel htmlFor="event-guests">Guests</FieldLabel>
                  <GuestsCombobox
                    id="event-guests"
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name="description"
              render={({ field, fieldState }) => (
                <Field
                  className="gap-1.5"
                  data-invalid={fieldState.invalid || undefined}
                >
                  <FieldLabel htmlFor="event-description">
                    Description
                  </FieldLabel>
                  <Textarea
                    {...field}
                    id="event-description"
                    placeholder="Add notes or an agenda"
                    rows={3}
                    aria-invalid={fieldState.invalid || undefined}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            {/* The save-time rules the schema cannot see: an overlap with a
                locked event, or a calendar that no longer exists. */}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </form>
        </ScrollArea>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2 border-t bg-muted px-5 py-3">
        {mode === "edit" && (
          <DeleteConfirm onDelete={onDelete}>
            <Button type="button" variant="outline" className="me-auto">
              <Trash2Icon className="size-4" aria-hidden="true" />
              Delete
            </Button>
          </DeleteConfirm>
        )}
        <Button
          type="button"
          variant="outline"
          className={cn(mode === "create" && "ms-auto")}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button type="submit" form={EVENT_FORM_ID}>
          {mode === "edit" ? "Save" : "Create event"}
        </Button>
      </div>
    </TooltipProvider>
  )
}

/** Delete confirmation dialog wrapping a trigger button. */
function DeleteConfirm({
  onDelete,
  children,
}: {
  onDelete: () => void
  children: React.ReactNode
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={children as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete event?</AlertDialogTitle>
          <AlertDialogDescription>
            This event will be removed from the calendar. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onDelete}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
