import { Fragment, useMemo } from "react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { PEOPLE, PERSON_BY_ID } from "./data"
import type { CalendarCategory, Person } from "./data"

// 15-minute time steps shared by the start/end selects.
const TIME_LABELS = new Map<string, string>()
const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hours = Math.floor(i / 4)
  const minutes = (i % 4) * 15
  const value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
  const suffix = hours < 12 ? "AM" : "PM"
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  const label = `${hour12}:${String(minutes).padStart(2, "0")} ${suffix}`
  TIME_LABELS.set(value, label)
  return { value, label }
})

/** Format any "HH:mm" (including off-grid snaps) as a 12-hour label. */
function formatTimeValue(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number)
  const suffix = h < 12 ? "AM" : "PM"
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`
}

/** A calendar's color swatch (matches the round event-chip dots). */
export function CalendarDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  )
}

/** Small avatar for a guest (person). */
function PersonAvatar({
  person,
  className = "size-5",
}: {
  person: Person
  className?: string
}) {
  return (
    <Avatar className={className}>
      <AvatarImage src={person.image} alt="" loading="lazy" />
      <AvatarFallback className="text-[8px]">{person.initials}</AvatarFallback>
    </Avatar>
  )
}

/** Start/end 15-minute time picker (96 options). */
export function TimeSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(next: string | null) => next && onChange(next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue>
          {(current: string | null) =>
            current
              ? (TIME_LABELS.get(current) ?? formatTimeValue(current))
              : null
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {TIME_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Calendar-date picker; value is a "yyyy-MM-dd" string. */
export function DateField({
  id,
  value,
  onSelect,
  disabled,
}: {
  id?: string
  value: string
  onSelect: (iso: string) => void
  disabled?: boolean
}) {
  const selected = new Date(`${value}T00:00:00`)
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-start font-normal"
          />
        }
      >
        {format(selected, "PPP")}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0!">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date: Date | undefined) =>
            date && onSelect(format(date, "yyyy-MM-dd"))
          }
        />
      </PopoverContent>
    </Popover>
  )
}

/** Owning-calendar (category) picker; a color dot plus the calendar name. */
export function CalendarSelect({
  id,
  value,
  calendars,
  onChange,
  disabled,
}: {
  id?: string
  value: string
  calendars: CalendarCategory[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <Select
      value={value}
      onValueChange={(next: string | null) => next && onChange(next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue>
          {(current: string | null) => {
            const calendar = current
              ? calendars.find((entry) => entry.id === current)
              : undefined
            return calendar ? (
              <span className="flex min-w-0 items-center gap-2">
                <CalendarDot color={calendar.color} />
                <span className="truncate">{calendar.name}</span>
              </span>
            ) : (
              "Select calendar"
            )
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {calendars.map((calendar) => (
          <SelectItem key={calendar.id} value={calendar.id}>
            <span className="flex items-center gap-2">
              <CalendarDot color={calendar.color} />
              {calendar.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Overlapping guest-avatar stack (view sheet + event chips). */
export function AttendeeStack({
  ids,
  max = 5,
  size = "size-6",
}: {
  ids: string[]
  max?: number
  size?: string
}) {
  const shown = ids.slice(0, max)
  const extra = ids.length - shown.length
  return (
    <AvatarGroup>
      {shown.map((id) => {
        const person = PERSON_BY_ID.get(id)
        if (!person) return null
        return <PersonAvatar key={id} person={person} className={size} />
      })}
      {extra > 0 && (
        <AvatarGroupCount
          className={cn(
            "bg-muted text-[10px] font-medium text-muted-foreground",
            size
          )}
        >
          +{extra}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  )
}

/** Multi-select guests picker: shadcn Combobox with avatar chips + a searchable
 *  people list. Controlled by guest ids (mapped to/from person objects). */
export function GuestsCombobox({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const anchor = useComboboxAnchor()
  // Stable reference so Base UI's controlled Combobox does not re-sync (and
  // echo onValueChange) on every parent render.
  const selected = useMemo(
    () =>
      value
        .map((personId) => PERSON_BY_ID.get(personId))
        .filter((person): person is Person => Boolean(person)),
    [value]
  )

  return (
    <Combobox
      multiple
      disabled={disabled}
      items={PEOPLE}
      itemToStringValue={(person: Person) => person.name}
      value={selected}
      onValueChange={(next: Person[]) =>
        onChange(next.map((person) => person.id))
      }
    >
      <ComboboxChips
        ref={anchor}
        className="has-data-[slot=combobox-chip]:pl-1"
      >
        <ComboboxValue>
          {(items: Person[]) => (
            <Fragment>
              {items.map((person) => (
                <ComboboxChip
                  key={person.id}
                  showRemove
                  className="gap-1.5 rounded-full"
                >
                  <PersonAvatar person={person} className="size-4" />
                  {person.name}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput id={id} placeholder="Add guests..." />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent
        anchor={anchor}
        className="w-(--anchor-width) min-w-(--anchor-width)"
      >
        <ComboboxEmpty>No people found.</ComboboxEmpty>
        <ComboboxList>
          {(person: Person) => (
            <ComboboxItem key={person.id} value={person}>
              <Item size="xs" className="p-0">
                <PersonAvatar person={person} className="size-6" />
                <ItemContent>
                  <ItemTitle className="whitespace-nowrap">
                    {person.name}
                  </ItemTitle>
                  <ItemDescription>{person.role}</ItemDescription>
                </ItemContent>
              </Item>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
