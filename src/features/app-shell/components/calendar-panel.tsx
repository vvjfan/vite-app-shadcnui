import { useMemo, useState } from "react"
import type { ComponentProps } from "react"
import { Badge } from "@/components/reui/badge"
import type { DayButton } from "react-day-picker"

import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  CALENDAR_ACCOUNTS,
  COLOR_OPTIONS,
  TODAY,
  TIMEZONE,
  toDayKey,
  UPCOMING_EVENTS,
  USER,
} from "./data"
import type { CalendarAccount, CalendarItem, UpcomingEvent } from "./data"
import {
  AccountDialog,
  CalendarItemDialog,
  EventDialog,
} from "./calendar-panel-dialogs"
import type {
  AccountDialogState,
  CalendarItemDialogState,
  EventDialogState,
} from "./calendar-panel-dialogs"
import {
  accountCalendarClause,
  availabilityDescription,
  availabilityLink,
  datesWithEvents as toDatesWithEvents,
  dayHeading as toDayHeading,
  dayKeyToDate,
  monthPosition,
  removeAccount,
  removeCalendarItem,
  removeEvent,
  setCalendarItemColor,
  stepMonth as nextMonth,
  submitAccount,
  submitCalendarItem,
  submitEvent as applyEventSubmit,
  toggleCalendarItem,
  visibleEvents as toVisibleEvents,
} from "../lib/calendar-panel"
import type {
  AccountValues,
  CalendarItemValues,
  EventValues,
} from "../lib/calendar-panel"
import {
  CheckIcon,
  DotsThreeIcon as MoreHorizontalIcon,
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
  CaretRightIcon as ChevronRightIcon,
  ArrowBendUpRightIcon as CornerUpRightIcon,
  ArrowBendUpLeftIcon as CornerUpLeftIcon,
  CaretLeftIcon as ChevronLeftIcon,
  PlusIcon,
  ShareNetworkIcon as Share2Icon,
  GlobeIcon,
  CalendarPlusIcon,
} from "@phosphor-icons/react"

// ── Color Picker ──

function ColorPicker({
  currentColor,
  onSelect,
}: {
  currentColor: string
  onSelect: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5 px-2 py-1.5">
      {COLOR_OPTIONS.map((color) => {
        const isSelected = color.value === currentColor
        return (
          <button
            key={color.id}
            type="button"
            className={cn(
              "flex size-[18px] cursor-pointer items-center justify-center transition-shadow duration-100",
              "rounded-full",
              "hover:ring-2 hover:ring-ring hover:ring-offset-1",
              isSelected && "ring-2 ring-ring ring-offset-1"
            )}
            style={{ backgroundColor: color.value }}
            aria-label={color.id}
            aria-pressed={isSelected}
            onClick={() => onSelect(color.value)}
          >
            {isSelected && (
              <CheckIcon className="size-2.5 text-white" aria-hidden="true" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── Calendar Item Row ──

function CalendarItemRow({
  item,
  onToggle,
  onColorChange,
  onEdit,
  onDelete,
}: {
  item: CalendarItem
  onToggle: (id: string) => void
  onColorChange: (id: string, color: string) => void
  onEdit: (item: CalendarItem) => void
  onDelete: (item: CalendarItem) => void
}) {
  return (
    // pr-6 reserves the width the account row spends on its count badge, so
    // every options button in the section lines up in one column.
    <div className="group flex h-9 items-center gap-2 pr-6 pl-5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: item.color }}
        aria-hidden="true"
      />
      <Checkbox
        checked={item.enabled}
        onCheckedChange={() => onToggle(item.id)}
        aria-label={`Toggle ${item.label}`}
      />
      <span
        className={cn(
          "flex-1 truncate text-sm font-medium",
          item.enabled
            ? "text-foreground"
            : "text-muted-foreground line-through"
        )}
      >
        {item.label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Options for ${item.label}`}
              className="opacity-0 transition-opacity group-hover:opacity-100"
            />
          }
        >
          <MoreHorizontalIcon className="size-3.5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <ColorPicker
              currentColor={item.color}
              onSelect={(color) => onColorChange(item.id, color)}
            />
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <PencilIcon aria-hidden="true" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(item)}
            >
              <Trash2Icon aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ── Account Group ──

function AccountGroup({
  account,
  onToggle,
  onColorChange,
  onEditItem,
  onDeleteItem,
  onAddCalendar,
  onEditAccount,
  onDeleteAccount,
  defaultOpen = false,
}: {
  account: CalendarAccount
  onToggle: (id: string) => void
  onColorChange: (id: string, color: string) => void
  onEditItem: (accountId: string, item: CalendarItem) => void
  onDeleteItem: (accountId: string, item: CalendarItem) => void
  onAddCalendar: (accountId: string) => void
  onEditAccount: (account: CalendarAccount) => void
  onDeleteAccount: (account: CalendarAccount) => void
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div className="group/account flex items-center gap-0.5">
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              className="min-w-0 flex-1 justify-start px-1.5"
              size="sm"
              aria-label={`Toggle ${account.email}`}
            />
          }
        >
          <ChevronRightIcon
            className="size-3.5 shrink-0 opacity-60 transition-all duration-150 in-data-panel-open:rotate-90 in-data-panel-open:opacity-100"
            aria-hidden="true"
          />
          <span className="truncate">{account.email}</span>
        </CollapsibleTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Options for ${account.email}`}
                className="shrink-0 opacity-0 transition-opacity group-hover/account:opacity-100 aria-expanded:opacity-100"
              />
            }
          >
            <MoreHorizontalIcon className="size-3.5" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onAddCalendar(account.id)}>
                <CalendarPlusIcon aria-hidden="true" />
                Add calendar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditAccount(account)}>
                <PencilIcon aria-hidden="true" />
                Edit account
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDeleteAccount(account)}
              >
                <Trash2Icon aria-hidden="true" />
                Remove account
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {/* Count sits last so it lines up with the day count below. */}
        <Badge variant="outline" size="sm" className="mr-1 shrink-0">
          {account.items.length}
        </Badge>
      </div>
      <CollapsibleContent>
        <div className="py-0.5">
          {account.items.map((item) => (
            <CalendarItemRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              onColorChange={onColorChange}
              onEdit={(next) => onEditItem(account.id, next)}
              onDelete={(next) => onDeleteItem(account.id, next)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

// ── Event Card ──

function EventCard({
  event,
  onOpen,
  showDate = false,
}: {
  event: UpcomingEvent
  onOpen: (event: UpcomingEvent) => void
  /** Prefix the time with the day when the list spans more than one day. */
  showDate?: boolean
}) {
  const dayLabel = new Date(`${event.date}T00:00:00`).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric" }
  )
  return (
    <Button
      variant="ghost"
      onClick={() => onOpen(event)}
      aria-label={`Open ${event.title}`}
      className={cn("h-auto w-full items-start gap-2.5 px-3 py-2 text-left")}
    >
      <span
        className="w-1 shrink-0 self-stretch rounded-full"
        style={{ backgroundColor: event.calendarColor }}
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm leading-snug font-medium text-foreground">
          {event.title}
        </span>
        <span className="text-xs text-muted-foreground">
          {showDate && (
            <span className="font-medium">{dayLabel} &middot; </span>
          )}
          {event.startTime} to {event.endTime}
        </span>
      </div>
      {event.attendees && event.attendees.length > 0 && (
        <div className="ml-auto flex -space-x-1">
          {event.attendees.slice(0, 3).map((attendee, i) => (
            <Avatar
              key={`${attendee.fallback}-${i}`}
              className="size-5 border-2 border-background"
            >
              {attendee.src && (
                <AvatarImage src={attendee.src} alt={attendee.fallback} />
              )}
              <AvatarFallback
                className={cn("text-[8px] text-white", attendee.color)}
              >
                {attendee.fallback}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      )}
    </Button>
  )
}

// ── Calendar Panel ──

export function CalendarPanel() {
  const [date, setDate] = useState<Date | undefined>(TODAY)
  const [month, setMonth] = useState<Date>(TODAY)
  const [accounts, setAccounts] = useState<CalendarAccount[]>(CALENDAR_ACCOUNTS)
  const [events, setEvents] = useState<UpcomingEvent[]>(UPCOMING_EVENTS)

  // Mode-based dialogs (the house CRUD pattern).
  const [calendarDialog, setCalendarDialog] =
    useState<CalendarItemDialogState | null>(null)
  const [accountDialog, setAccountDialog] = useState<AccountDialogState | null>(
    null
  )
  const [eventDialog, setEventDialog] = useState<EventDialogState | null>(null)
  // Pending deletes, confirmed through an AlertDialog.
  const [itemToDelete, setItemToDelete] = useState<{
    accountId: string
    item: CalendarItem
  } | null>(null)
  const [accountToDelete, setAccountToDelete] =
    useState<CalendarAccount | null>(null)
  const [eventToDelete, setEventToDelete] = useState<UpcomingEvent | null>(null)

  const position = monthPosition(month, TODAY)
  const isCurrentMonth = position === "current"
  const isPast = position === "past"

  const accountClause = accountCalendarClause(
    accountToDelete?.items.length ?? 0
  )

  const monthLabel = month.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })

  // ── Calendar <-> events wiring ──
  // Dots, the day list and the day heading all read from `events`, so a create
  // or delete shows up in every surface at once.
  const datesWithEvents = useMemo(() => toDatesWithEvents(events), [events])

  const selectedKey = date ? toDayKey(date) : null
  const todayKey = toDayKey(TODAY)

  // No selection falls back to every event, so the list is never empty-by-default.
  const visibleEvents = useMemo(
    () => toVisibleEvents(events, selectedKey),
    [events, selectedKey]
  )

  const dayHeading = toDayHeading(date, todayKey)

  // ── Share availability ──
  // Hands out a booking link for the day in view, so someone can pick a free
  // slot without trading emails. Copies it and confirms with a toast, matching
  // how the rest of the app reports a copy.
  const { copyToClipboard } = useCopyToClipboard()

  const shareAvailability = () => {
    const shareKey = selectedKey ?? todayKey
    const origin = typeof window === "undefined" ? "" : window.location.origin
    copyToClipboard(availabilityLink(origin, USER.email, shareKey))

    toast.success("Availability link copied", {
      description: availabilityDescription(events, shareKey, todayKey),
    })
  }

  const stepMonth = (delta: number) =>
    setMonth((prev) => nextMonth(prev, delta))

  const goToToday = () => {
    setMonth(TODAY)
    setDate(TODAY)
  }

  const handleToggle = (id: string) => {
    setAccounts((prev) => toggleCalendarItem(prev, id))
  }

  const handleColorChange = (id: string, color: string) => {
    setAccounts((prev) => setCalendarItemColor(prev, id, color))
  }

  // ── Calendar CRUD ──

  const submitCalendar = (values: CalendarItemValues) => {
    if (!calendarDialog) return
    setAccounts((prev) => submitCalendarItem(prev, calendarDialog, values))
    setCalendarDialog(null)
  }

  const confirmDeleteItem = () => {
    if (!itemToDelete) return
    const { accountId, item } = itemToDelete
    setAccounts((prev) => removeCalendarItem(prev, accountId, item.id))
    setItemToDelete(null)
  }

  // ── Account CRUD ──

  const handleSubmitAccount = (values: AccountValues) => {
    if (!accountDialog) return
    setAccounts((prev) => submitAccount(prev, accountDialog, values))
    setAccountDialog(null)
  }

  const confirmDeleteAccount = () => {
    if (!accountToDelete) return
    const id = accountToDelete.id
    setAccounts((prev) => removeAccount(prev, id))
    setAccountToDelete(null)
  }

  // ── Event CRUD ──

  const handleSubmitEvent = (values: EventValues) => {
    if (!eventDialog) return
    setEvents((prev) => applyEventSubmit(prev, eventDialog, values))
    // Follow the record: land on the day it was filed under, so a save is never
    // invisible because the panel is scoped to a different day.
    setDate(dayKeyToDate(values.date))
    setMonth(dayKeyToDate(values.date))
    setEventDialog(null)
  }

  // Close the view dialog first, then confirm in a sibling alert (nesting an
  // alert inside the dialog leaves both stuck open).
  const requestDeleteEvent = (event: UpcomingEvent) => {
    setEventDialog(null)
    setEventToDelete(event)
  }

  const confirmDeleteEvent = () => {
    if (!eventToDelete) return
    const id = eventToDelete.id
    setEvents((prev) => removeEvent(prev, id))
    setEventToDelete(null)
  }

  return (
    <div className={cn("flex flex-1 flex-col overflow-hidden bg-background")}>
      {/* Mini calendar - fixed, always visible */}
      <div className="flex shrink-0 flex-col items-center border-b border-border px-1 py-2">
        <div className="flex w-full items-center justify-between px-2 pb-1">
          <span className="text-sm font-medium text-foreground">
            {monthLabel}
          </span>
          <div className="flex items-center justify-center gap-0.5">
            {!isCurrentMonth && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={goToToday}
                aria-label="Back to current month"
              >
                {isPast ? (
                  <CornerUpRightIcon className="size-3" aria-hidden="true" />
                ) : (
                  <CornerUpLeftIcon className="size-3" aria-hidden="true" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => stepMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => stepMonth(1)}
              aria-label="Next month"
            >
              <ChevronRightIcon className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          month={month}
          onMonthChange={setMonth}
          showOutsideDays
          hideNavigation
          className="w-full items-center justify-center p-0 [--cell-size:--spacing(7)]"
          classNames={{
            day_button: " rounded-md   ",
            today: cn("bg-accent text-foreground", "rounded-md"),
            month_caption: "hidden",
            nav: "hidden",
          }}
          components={{
            DayButton: ({
              children,
              modifiers,
              day,
              ...props
            }: ComponentProps<typeof DayButton>) => {
              const dateKey = toDayKey(day.date)
              const hasEvents =
                !modifiers.outside && datesWithEvents.has(dateKey)

              return (
                <CalendarDayButton day={day} modifiers={modifiers} {...props}>
                  {hasEvents ? (
                    <span
                      className="size-1 rounded-full bg-primary in-data-[selected-single=true]:bg-primary-foreground!"
                      aria-hidden="true"
                    />
                  ) : (
                    <span className="size-1" aria-hidden="true" />
                  )}
                  {children}
                </CalendarDayButton>
              )
            },
          }}
        />
      </div>

      {/* Scrollable content: My Calendars, Up Next, Quick Actions, Timezone */}
      <div className="max-h-full min-h-0 grow">
        <ScrollArea className="h-full grow">
          <div className="flex h-full flex-col">
            {/* My Calendars */}
            <div className="border-b border-border py-2">
              <div className="px-3 py-1">
                <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  My Calendars
                </span>
              </div>
              <div role="list" className="px-2">
                {accounts.map((account, i) => (
                  <div key={account.id} role="listitem">
                    <AccountGroup
                      account={account}
                      onToggle={handleToggle}
                      onColorChange={handleColorChange}
                      onEditItem={(accountId, item) =>
                        setCalendarDialog({ mode: "edit", accountId, item })
                      }
                      onDeleteItem={(accountId, item) =>
                        setItemToDelete({ accountId, item })
                      }
                      onAddCalendar={(accountId) =>
                        setCalendarDialog({ mode: "create", accountId })
                      }
                      onEditAccount={(next) =>
                        setAccountDialog({
                          mode: "edit",
                          accountId: next.id,
                          email: next.email,
                        })
                      }
                      onDeleteAccount={setAccountToDelete}
                      defaultOpen={i === 0}
                    />
                  </div>
                ))}
              </div>
              <div className="px-1.5 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAccountDialog({ mode: "create" })}
                  className="w-full justify-start px-2 text-sm text-muted-foreground"
                >
                  <PlusIcon className="size-3.5" aria-hidden="true" />
                  Add account
                </Button>
              </div>
            </div>

            {/* Up Next */}
            <div className="border-b border-border py-2">
              <div className="flex items-center justify-between gap-2 px-3 py-1">
                <span className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {dayHeading}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  {selectedKey && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setDate(undefined)}
                      className="h-5 px-1.5 text-[11px] font-normal text-muted-foreground"
                    >
                      Show all
                    </Button>
                  )}
                  <Badge variant="outline" size="sm">
                    {visibleEvents.length}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 px-1.5" role="list">
                {visibleEvents.map((event) => (
                  <div key={event.id} role="listitem">
                    <EventCard
                      event={event}
                      showDate={!selectedKey}
                      onOpen={(next) =>
                        setEventDialog({ mode: "view", event: next })
                      }
                    />
                  </div>
                ))}
                {visibleEvents.length === 0 && (
                  <p className="px-1.5 py-2 text-xs text-muted-foreground">
                    {selectedKey
                      ? "Nothing scheduled on this day."
                      : "Nothing scheduled. Create an event to get started."}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex grow flex-col gap-1 px-3 py-3">
              <Button
                variant="default"
                size="sm"
                onClick={() =>
                  setEventDialog({
                    mode: "create",
                    // Seed the day the user is looking at.
                    defaultDate: selectedKey ?? todayKey,
                  })
                }
                className="w-full justify-start"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                New Event
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareAvailability}
                className="w-full justify-start text-muted-foreground"
              >
                <Share2Icon aria-hidden="true" />
                Share Availability
              </Button>
            </div>

            {/* Timezone */}
            <Separator />
            <div className="flex items-center gap-2 px-3 py-2.5">
              <GlobeIcon
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-muted-foreground/60">
                  Your timezone
                </span>
                <span className="text-xs text-muted-foreground">
                  {TIMEZONE.abbreviation} ({TIMEZONE.offset}) &middot;{" "}
                  {TIMEZONE.region}
                </span>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* CRUD surfaces */}
      <CalendarItemDialog
        state={calendarDialog}
        onOpenChange={(open) => !open && setCalendarDialog(null)}
        onSubmit={submitCalendar}
      />

      <AccountDialog
        state={accountDialog}
        onOpenChange={(open) => !open && setAccountDialog(null)}
        onSubmit={handleSubmitAccount}
      />

      <EventDialog
        state={eventDialog}
        onOpenChange={(open) => !open && setEventDialog(null)}
        onEdit={() =>
          setEventDialog((prev) =>
            prev?.event ? { mode: "edit", event: prev.event } : prev
          )
        }
        onSubmit={handleSubmitEvent}
        onRequestDelete={requestDeleteEvent}
      />

      {/* Deletes are triggered from menus that unmount on close, so these
          AlertDialogs are controlled by pending-delete state instead. */}
      <AlertDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete calendar?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{itemToDelete?.item.label}&rdquo; and its events will be
              removed from this account. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteItem}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={eventToDelete !== null}
        onOpenChange={(open) => !open && setEventToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{eventToDelete?.title}&rdquo; will be removed from Up Next.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteEvent}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={accountToDelete !== null}
        onOpenChange={(open) => !open && setAccountToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove account?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{accountToDelete?.email}&rdquo;
              {accountClause} will be disconnected. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDeleteAccount}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
