import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import type { FieldError as RhfFieldError } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  accountFormSchema,
  calendarItemFormSchema,
  eventFormSchema,
  normalizeTime,
  parseDayKey,
} from "../lib/calendar-panel-forms"
import type {
  AccountFormValues,
  CalendarItemFormValues,
  EventFormValues,
} from "../lib/calendar-panel-forms"
import { COLOR_OPTIONS, toDayKey } from "./data"
import type { CalendarItem, UpcomingEvent } from "./data"
import {
  CalendarIcon,
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"

// ── Shared color swatch picker ──

/**
 * Driven by a Controller rather than a plain input: the swatches are buttons,
 * so there is no native value to spread a field onto. It takes value/onChange
 * directly and reports its own error, the way the text fields do.
 */
function ColorField({
  value,
  onChange,
  onBlur,
  invalid,
  error,
}: {
  value: string
  onChange: (color: string) => void
  onBlur?: () => void
  invalid?: boolean
  error?: RhfFieldError
}) {
  return (
    <Field className="gap-2.5" data-invalid={invalid || undefined}>
      <FieldLabel>Color</FieldLabel>
      <div
        role="group"
        aria-label="Color"
        aria-invalid={invalid || undefined}
        onBlur={onBlur}
        className="flex flex-wrap gap-2"
      >
        {COLOR_OPTIONS.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              aria-label={option.id}
              onClick={() => onChange(option.value)}
              className={cn(
                "size-6 rounded-full ring-offset-background transition outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selected && "ring-2 ring-ring ring-offset-2"
              )}
              style={{ backgroundColor: option.value }}
            />
          )
        })}
      </div>
      <FieldError errors={[error]} />
    </Field>
  )
}

// ── Calendar (name + color) ──

const CALENDAR_FORM_ID = "panel-calendar-form"

export interface CalendarItemDialogState {
  mode: "create" | "edit"
  /** Account the calendar belongs to (create) or lives in (edit). */
  accountId: string
  item?: CalendarItem
}

export function CalendarItemDialog({
  state,
  onOpenChange,
  onSubmit,
}: {
  state: CalendarItemDialogState | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { label: string; color: string }) => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {state && (
          // Keyed so the form remounts and re-seeds from its defaultValues on
          // each open, rather than reopening on the last record's values.
          <CalendarItemForm
            key={state.item?.id ?? `new-${state.accountId}`}
            state={state}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CalendarItemForm({
  state,
  onSubmit,
}: {
  state: CalendarItemDialogState
  onSubmit: (values: { label: string; color: string }) => void
}) {
  const isEdit = state.mode === "edit"
  // The dialog keys this component, so defaultValues re-seed on every open.
  const form = useForm<CalendarItemFormValues>({
    resolver: zodResolver(calendarItemFormSchema),
    defaultValues: {
      label: state.item?.label ?? "",
      color: state.item?.color ?? COLOR_OPTIONS[0].value,
    },
    // Validate on blur, then live while the message is being corrected.
    mode: "onTouched",
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit calendar" : "New calendar"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Rename this calendar or change its color."
            : "Name your calendar and choose a color."}
        </DialogDescription>
      </DialogHeader>

      {/* noValidate so the browser's own bubbles never pre-empt the messages. */}
      <form
        id={CALENDAR_FORM_ID}
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          control={form.control}
          name="label"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="panel-calendar-name">Name</FieldLabel>
              <Input
                {...field}
                id="panel-calendar-name"
                placeholder="e.g. Side projects"
                autoComplete="off"
                autoFocus
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="color"
          render={({ field, fieldState }) => (
            <ColorField
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
              error={fieldState.error}
            />
          )}
        />
      </form>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        {/* Enabled whatever the fields hold: submitting is what reveals the
            messages, rather than a dead button with no explanation. */}
        <Button type="submit" form={CALENDAR_FORM_ID}>
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </>
  )
}

// ── Account (email) ──

const ACCOUNT_FORM_ID = "panel-account-form"

export interface AccountDialogState {
  mode: "create" | "edit"
  accountId?: string
  email?: string
}

export function AccountDialog({
  state,
  onOpenChange,
  onSubmit,
}: {
  state: AccountDialogState | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { email: string }) => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {state && (
          <AccountForm
            key={state.accountId ?? "new"}
            state={state}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AccountForm({
  state,
  onSubmit,
}: {
  state: AccountDialogState
  onSubmit: (values: { email: string }) => void
}) {
  const isEdit = state.mode === "edit"
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { email: state.email ?? "" },
    mode: "onTouched",
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit account" : "Add account"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the address this account syncs from."
            : "Connect another calendar account to this workspace."}
        </DialogDescription>
      </DialogHeader>

      {/* noValidate matters here: the input is type="email", so without it the
          browser blocks submit with its own bubble before the resolver runs. */}
      <form
        id={ACCOUNT_FORM_ID}
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="panel-account-email">Email</FieldLabel>
              <Input
                {...field}
                id="panel-account-email"
                type="email"
                placeholder="you@company.io"
                autoComplete="off"
                autoFocus
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </form>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" form={ACCOUNT_FORM_ID}>
          {isEdit ? "Save" : "Add account"}
        </Button>
      </DialogFooter>
    </>
  )
}

// ── Event (view / create / edit) ──

const EVENT_FORM_ID = "panel-event-form"

export interface EventDialogState {
  mode: "create" | "view" | "edit"
  event?: UpcomingEvent
  /** `yyyy-mm-dd` the create form starts on (the day the user is viewing). */
  defaultDate?: string
}

export function EventDialog({
  state,
  onOpenChange,
  onEdit,
  onSubmit,
  onRequestDelete,
}: {
  state: EventDialogState | null
  onOpenChange: (open: boolean) => void
  onEdit: () => void
  onSubmit: (values: {
    title: string
    date: string
    startTime: string
    endTime: string
    calendarColor: string
  }) => void
  /** Asks the panel to confirm the delete; see EventView for why. */
  onRequestDelete: (event: UpcomingEvent) => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {state?.mode === "view" && state.event ? (
          <EventView
            event={state.event}
            onEdit={onEdit}
            onRequestDelete={onRequestDelete}
          />
        ) : state ? (
          <EventForm
            key={state.event?.id ?? "new"}
            state={state}
            onSubmit={onSubmit}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm text-foreground">
        {children}
      </span>
    </div>
  )
}

/**
 * Read-only detail view. Delete does NOT open a nested AlertDialog here: an
 * alert nested inside this Dialog cannot be dismissed (its Cancel leaves both
 * modals open and blocks the page), so it hands the record to the panel, which
 * confirms with a sibling AlertDialog instead.
 */
function EventView({
  event,
  onEdit,
  onRequestDelete,
}: {
  event: UpcomingEvent
  onEdit: () => void
  onRequestDelete: (event: UpcomingEvent) => void
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: event.calendarColor }}
            aria-hidden="true"
          />
          {event.title}
        </DialogTitle>
        <DialogDescription>Event details.</DialogDescription>
      </DialogHeader>

      <div className="divide-y rounded-lg border px-3">
        <DetailRow label="Date">
          {new Date(`${event.date}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </DetailRow>
        <DetailRow label="Starts">{event.startTime}</DetailRow>
        <DetailRow label="Ends">{event.endTime}</DetailRow>
        <DetailRow label="Attendees">
          {event.attendees && event.attendees.length > 0
            ? event.attendees.map((a) => a.fallback).join(", ")
            : "No attendees"}
        </DetailRow>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onRequestDelete(event)}
        >
          <Trash2Icon className="size-4" aria-hidden="true" />
          Delete
        </Button>
        <Button type="button" onClick={onEdit}>
          <PencilIcon className="size-4" aria-hidden="true" />
          Edit
        </Button>
      </DialogFooter>
    </>
  )
}

function EventForm({
  state,
  onSubmit,
}: {
  state: EventDialogState
  onSubmit: (values: {
    title: string
    date: string
    startTime: string
    endTime: string
    calendarColor: string
  }) => void
}) {
  const isEdit = state.mode === "edit"
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: state.event?.title ?? "",
      date: state.event?.date ?? state.defaultDate ?? "",
      startTime: state.event?.startTime ?? "9:00 AM",
      endTime: state.event?.endTime ?? "9:30 AM",
      calendarColor: state.event?.calendarColor ?? COLOR_OPTIONS[0].value,
    },
    mode: "onTouched",
  })

  // Controlled so picking a day dismisses the calendar. Base UI popovers close
  // only on outside press or Escape, so otherwise it sits over the rest of the
  // form after the choice is already made.
  const [dateOpen, setDateOpen] = useState(false)

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit event" : "New event"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update this event's details."
            : "Add an event to your Up Next list."}
        </DialogDescription>
      </DialogHeader>

      <form
        id={EVENT_FORM_ID}
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          // The schema guarantees both times parse, so the fallbacks never run;
          // storing the canonical form keeps "9 am" from landing in the list
          // next to "9:30 AM". Every other value is already trimmed by zod.
          onSubmit({
            ...values,
            startTime: normalizeTime(values.startTime) ?? values.startTime,
            endTime: normalizeTime(values.endTime) ?? values.endTime,
          })
        )}
      >
        <Controller
          control={form.control}
          name="title"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="panel-event-title">Title</FieldLabel>
              <Input
                {...field}
                id="panel-event-title"
                placeholder="e.g. Design review"
                autoComplete="off"
                autoFocus
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {/* A Calendar in a Popover has no native value to spread a field onto,
            so the Controller drives it by value/onChange. */}
        <Controller
          control={form.control}
          name="date"
          render={({ field, fieldState }) => {
            // Parsed at local midnight, matching how the read view renders it.
            const selectedDate = parseDayKey(field.value) ?? undefined
            return (
              <Field
                className="gap-1.5"
                data-invalid={fieldState.invalid || undefined}
              >
                <FieldLabel htmlFor="panel-event-date">Date</FieldLabel>
                {/* @reui/c-calendar-24: a Calendar in a Popover behind a trigger
                    that shows the chosen day. Adapted to this project's Base UI
                    setup with the render prop, since the shipped example nests a
                    Button inside PopoverTrigger, a button inside a button here. */}
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.invalid || undefined}
                    render={
                      <Button
                        id="panel-event-date"
                        variant="outline"
                        className="group/pick-date w-full justify-between font-normal"
                      />
                    }
                  >
                    <span
                      className={cn(
                        "truncate",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      {selectedDate
                        ? format(selectedDate, "PPP")
                        : "Pick a date"}
                    </span>
                    <CalendarIcon
                      aria-hidden="true"
                      className="opacity-60 transition-opacity group-hover/pick-date:opacity-100"
                    />
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      // Stored as a YYYY-MM-DD key, and toDayKey reads local
                      // parts: toISOString would roll back a day in any zone
                      // ahead of UTC.
                      onSelect={(day) => {
                        field.onChange(day ? toDayKey(day) : "")
                        setDateOpen(false)
                      }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )
          }}
        />

        <div className="grid grid-cols-2 gap-3">
          <Controller
            control={form.control}
            name="startTime"
            render={({ field, fieldState }) => (
              <Field
                className="gap-1.5"
                data-invalid={fieldState.invalid || undefined}
              >
                <FieldLabel htmlFor="panel-event-start">Starts</FieldLabel>
                <Input
                  {...field}
                  id="panel-event-start"
                  placeholder="9:00 AM"
                  autoComplete="off"
                  // The pair rule is reported on the end time, and the resolver
                  // only writes back the error for the field that changed, so
                  // fixing the start here would otherwise leave "End time must
                  // be after the start time." sitting under a now-valid pair.
                  // Only nudged once that message could already be showing.
                  onChange={(changeEvent) => {
                    field.onChange(changeEvent)
                    if (
                      form.formState.isSubmitted ||
                      form.getFieldState("endTime").isTouched
                    ) {
                      void form.trigger("endTime")
                    }
                  }}
                  aria-invalid={fieldState.invalid || undefined}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="endTime"
            render={({ field, fieldState }) => (
              <Field
                className="gap-1.5"
                data-invalid={fieldState.invalid || undefined}
              >
                <FieldLabel htmlFor="panel-event-end">Ends</FieldLabel>
                <Input
                  {...field}
                  id="panel-event-end"
                  placeholder="9:30 AM"
                  autoComplete="off"
                  aria-invalid={fieldState.invalid || undefined}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>

        <Controller
          control={form.control}
          name="calendarColor"
          render={({ field, fieldState }) => (
            <ColorField
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
              error={fieldState.error}
            />
          )}
        />
      </form>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" form={EVENT_FORM_ID}>
          {isEdit ? "Save changes" : "Create event"}
        </Button>
      </DialogFooter>
    </>
  )
}
