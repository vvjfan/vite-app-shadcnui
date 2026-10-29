import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CalendarCategory } from "./data"
import {
  CaretDownIcon as ChevronDownIcon,
  DotsThreeIcon as MoreHorizontalIcon,
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
  PlusIcon,
} from "@phosphor-icons/react"

/**
 * Toolbar control that doubles as the color legend and the calendar manager.
 * The trigger stacks a color dot per visible calendar. Each row is a
 * keyboard-operable checkbox item whose visual is a colored checkbox (toggles
 * visibility); a "more" button appears on hover/focus and opens an Edit/Delete
 * submenu. "New calendar" opens the add dialog.
 */
export function CalendarsMenu({
  calendars,
  hidden,
  onToggle,
  onNewCalendar,
  onEditCalendar,
  onDeleteCalendar,
}: {
  calendars: CalendarCategory[]
  hidden: Set<string>
  onToggle: (id: string) => void
  onNewCalendar: () => void
  onEditCalendar: (calendar: CalendarCategory) => void
  onDeleteCalendar: (calendar: CalendarCategory) => void
}) {
  const visible = calendars.filter((calendar) => !hidden.has(calendar.id))
  // Keep at least one calendar; deleting the last one is disallowed.
  const canDelete = calendars.length > 1
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" />}>
        {visible.length > 0 && (
          <span className="flex -space-x-1" aria-hidden="true">
            {visible.map((calendar) => (
              <span
                key={calendar.id}
                className="size-2.5 rounded-full ring-2 ring-background"
                style={{ backgroundColor: calendar.color }}
              />
            ))}
          </span>
        )}
        Calendars
        <ChevronDownIcon className="size-4 opacity-50" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Calendars</DropdownMenuLabel>
          {calendars.map((calendar) => {
            const on = !hidden.has(calendar.id)
            return (
              // Two separate menu items per row so neither nests an interactive
              // control in the other; the "more" trigger reveals on hover/focus.
              <div
                key={calendar.id}
                className="group/cal flex items-center gap-0.5 rounded-md hover:bg-accent"
              >
                <DropdownMenuCheckboxItem
                  checked={on}
                  closeOnClick={false}
                  onCheckedChange={() => onToggle(calendar.id)}
                  className="min-w-0 flex-1 gap-2 pr-2 [&_[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden"
                >
                  {/* Colored checkbox is the visual; the checkbox item owns the
                      toggle + a11y, so this control is inert. The item's
                      focus:**:text-accent-foreground hover cascade recolors ALL
                      descendants (incl. the tick's <path>, not just the <svg>),
                      so mirror that reach with **:text-white! to keep the tick
                      white on hover. */}
                  <Checkbox
                    checked={on}
                    aria-hidden="true"
                    tabIndex={-1}
                    className="pointer-events-none **:text-white!"
                    style={
                      on
                        ? {
                            backgroundColor: calendar.color,
                            borderColor: calendar.color,
                          }
                        : undefined
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {calendar.name}
                  </span>
                </DropdownMenuCheckboxItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger
                    aria-label={`${calendar.name} options`}
                    className="shrink-0 justify-center px-1.5 opacity-0 group-focus-within/cal:opacity-100 group-hover/cal:opacity-100 data-[popup-open]:opacity-100 [&>svg:last-child]:hidden"
                  >
                    <MoreHorizontalIcon aria-hidden="true" />
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => onEditCalendar(calendar)}>
                      <PencilIcon aria-hidden="true" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={!canDelete}
                      onClick={() => onDeleteCalendar(calendar)}
                    >
                      <Trash2Icon aria-hidden="true" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </div>
            )
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onNewCalendar}>
          <PlusIcon aria-hidden="true" />
          New calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
