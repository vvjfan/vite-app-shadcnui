import * as React from "react"
import type { ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
} from "date-fns"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import { Badge } from "@/components/reui/badge"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxSeparator,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { newTaskId } from "../lib/board"
import {
  boardTaskDefaultValues,
  boardTaskSchema,
  TASK_PRIORITY_VALUES,
} from "../lib/task-schema"
import type { BoardTaskFormInput, DueDateFormValue } from "../lib/task-schema"
import { TASK_STATUS_ORDER } from "@/lib/data/planner/types"
import type {
  Person,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/data/planner/types"
import {
  CalendarIcon,
  CalendarBlankIcon as CalendarSearchIcon,
  CheckCircleIcon as CircleCheckIcon,
  CircleDashedIcon,
  RadioButtonIcon as CircleDotIcon,
  CircleIcon,
  FlagIcon,
  SpinnerIcon as LoaderIcon,
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
  WarningIcon as TriangleAlertIcon,
  UserIcon,
} from "@phosphor-icons/react"

// ── Inline option shapes ──

interface InlineOption {
  id: string
  value: string
  label: string
  searchText: string
}

interface StatusOption extends InlineOption {
  status: TaskStatus
}

interface PriorityOption extends InlineOption {
  priority: TaskPriority
}

interface AssigneeOption extends InlineOption {
  person: Person | null
}

const STATUS_OPTIONS: StatusOption[] = TASK_STATUS_ORDER.map((status) => ({
  id: status,
  value: status,
  label: status,
  status,
  searchText: status.toLowerCase(),
}))

const PRIORITY_OPTIONS: PriorityOption[] = TASK_PRIORITY_VALUES.map(
  (priority) => ({
    id: priority,
    value: priority,
    label: priority,
    priority,
    searchText: priority.toLowerCase(),
  })
)

const NO_ASSIGNEE_OPTION: AssigneeOption = {
  id: "unassigned",
  value: "",
  label: "No assignee",
  searchText: "no assignee unassigned nobody clear",
  person: null,
}

const CREATE_TIPS = [
  { icon: "✨", text: "Lead with the outcome, not every checklist item." },
  { icon: "🎯", text: "Pick one owner so the card never stalls." },
  { icon: "🏷️", text: "Set the column so the card lands where work happens." },
]

// ── Status / priority glyphs ──

const STATUS_META: Record<
  TaskStatus,
  { icon: typeof CircleIcon; className: string }
> = {
  Backlog: { icon: CircleDashedIcon, className: "text-muted-foreground" },
  Todo: { icon: CircleIcon, className: "text-sky-500" },
  "In Progress": { icon: LoaderIcon, className: "text-amber-500" },
  Review: { icon: CircleDotIcon, className: "text-violet-500" },
  Done: { icon: CircleCheckIcon, className: "text-emerald-500" },
}

function StatusGlyph({ status }: { status: TaskStatus }) {
  const { icon: Icon, className } = STATUS_META[status]
  return (
    <Icon className={cn("size-4 shrink-0", className)} aria-hidden="true" />
  )
}

function PriorityBars({ level }: { level: 1 | 2 | 3 }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      className="size-4 shrink-0"
    >
      <rect x="3" y="9" width="2.5" height="4" rx="1" fill="currentColor" />
      <rect
        x="7"
        y="6"
        width="2.5"
        height="7"
        rx="1"
        fill="currentColor"
        opacity={level >= 2 ? "1" : "0.28"}
      />
      <rect
        x="11"
        y="3"
        width="2.5"
        height="10"
        rx="1"
        fill="currentColor"
        opacity={level >= 3 ? "1" : "0.28"}
      />
    </svg>
  )
}

function PriorityGlyph({ priority }: { priority: TaskPriority }) {
  switch (priority) {
    case "Urgent":
      return (
        <TriangleAlertIcon
          className="size-4 shrink-0 text-amber-500"
          aria-hidden="true"
        />
      )
    case "High":
      return <PriorityBars level={3} />
    case "Medium":
      return <PriorityBars level={2} />
    case "Low":
      return <PriorityBars level={1} />
  }
}

function AssigneeGlyph({ option }: { option: AssigneeOption }) {
  if (!option.person) {
    return (
      <span className="flex min-w-0 items-center gap-2">
        <UserIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="truncate text-muted-foreground">{option.label}</span>
      </span>
    )
  }
  const person = option.person
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-5">
        <AvatarImage src={person.image} alt={person.name} />
        <AvatarFallback className="text-[9px]">
          {person.initials}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{person.name}</span>
    </span>
  )
}

// ── Generic single-select combobox pill ──

function InlineSingleCombobox<T extends InlineOption>({
  ariaLabel,
  value,
  items,
  searchPlaceholder,
  emptyMessage,
  renderOption,
  onValueChange,
}: {
  ariaLabel: string
  value: T
  items: T[]
  searchPlaceholder: string
  emptyMessage: string
  renderOption: (option: T) => ReactNode
  onValueChange: (option: T) => void
}) {
  return (
    <Combobox
      items={items}
      value={value}
      modal={false}
      onValueChange={(nextOption) => {
        if (nextOption) {
          onValueChange(nextOption)
        }
      }}
      itemToStringValue={(item: T) => item.searchText}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      autoHighlight
    >
      <ComboboxTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-full justify-between gap-2 font-normal"
            aria-label={ariaLabel}
          />
        }
      >
        <ComboboxValue>
          {(selectedOption: T | null) =>
            selectedOption ? renderOption(selectedOption) : null
          }
        </ComboboxValue>
      </ComboboxTrigger>

      <ComboboxContent className="pointer-events-auto min-w-60">
        <ComboboxInput
          showTrigger={false}
          placeholder={searchPlaceholder}
          className="mb-1"
        />
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item: T) => (
            <ComboboxItem key={item.id} value={item}>
              {renderOption(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// ── Due-date combobox (presets + custom calendar) ──

type DueDatePreset = {
  type: "preset"
  id: string
  label: string
  date: Date
  searchText: string
}
type DueDateCustom = {
  type: "custom"
  id: "custom-date"
  label: string
  searchText: string
}
type DueDateNone = {
  type: "none"
  id: "no-date"
  label: string
  searchText: string
}
type DueDateOption = DueDateNone | DueDatePreset | DueDateCustom

// The picker's value shape is owned by the schema that validates it.
type DueDateValue = DueDateFormValue

const NO_DUE_DATE: DueDateNone = {
  type: "none",
  id: "no-date",
  label: "No due date",
  searchText: "no due date clear target empty",
}
const CUSTOM_DUE_DATE: DueDateCustom = {
  type: "custom",
  id: "custom-date",
  label: "Custom date...",
  searchText: "custom date calendar picker choose a date manual due date",
}

function upcomingWeekEnd(today: Date) {
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  return isSameDay(today, weekEnd) ? addWeeks(weekEnd, 1) : weekEnd
}

function upcomingMonthEnd(today: Date) {
  const monthEnd = endOfMonth(today)
  return isSameDay(today, monthEnd) ? endOfMonth(addMonths(today, 1)) : monthEnd
}

function DueDateTriggerLabel({ value }: { value: DueDateValue }) {
  const label = !value
    ? "Set due date"
    : value.type === "custom"
      ? format(value.date, "MMM d")
      : value.label
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CalendarIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span className={cn("truncate", !value && "text-muted-foreground")}>
        {label}
      </span>
    </span>
  )
}

function DueDateRow({ option }: { option: DueDateOption }) {
  if (option.type === "preset") {
    return (
      <span className="flex w-full min-w-0 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <CalendarIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="truncate">{option.label}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {format(option.date, "MMM d")}
        </span>
      </span>
    )
  }
  const Icon = option.type === "custom" ? CalendarSearchIcon : CalendarIcon
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Icon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <span
        className={cn(
          "truncate",
          option.type === "none" && "text-muted-foreground"
        )}
      >
        {option.label}
      </span>
    </span>
  )
}

function DueDateCombobox({
  value,
  onValueChange,
}: {
  value: DueDateValue
  onValueChange: (value: DueDateValue) => void
}) {
  const isMobile = useIsMobile()
  const today = React.useMemo(() => startOfDay(new Date()), [])
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const [draftDate, setDraftDate] = React.useState<Date | undefined>(
    value?.date ?? addDays(today, 1)
  )

  const presets = React.useMemo<DueDatePreset[]>(
    () => [
      {
        type: "preset",
        id: "tomorrow",
        label: "Tomorrow",
        date: addDays(today, 1),
        searchText: "tomorrow next day due date",
      },
      {
        type: "preset",
        id: "end-of-week",
        label: "End of week",
        date: upcomingWeekEnd(today),
        searchText: "end of week weekly due date",
      },
      {
        type: "preset",
        id: "next-sprint",
        label: "Next sprint",
        date: addWeeks(today, 2),
        searchText: "next sprint planning iteration",
      },
      {
        type: "preset",
        id: "end-of-month",
        label: "End of month",
        date: upcomingMonthEnd(today),
        searchText: "end of month monthly due date",
      },
    ],
    [today]
  )

  const selectedOption =
    value?.type === "preset"
      ? (presets.find((option) => option.id === value.id) ?? null)
      : !value
        ? NO_DUE_DATE
        : null

  const pickerKey = `${pickerOpen}:${value?.date.getTime() ?? ""}`
  const [previousPickerKey, setPreviousPickerKey] = React.useState(pickerKey)
  if (previousPickerKey !== pickerKey) {
    setPreviousPickerKey(pickerKey)
    if (pickerOpen) setDraftDate(value?.date ?? addDays(today, 1))
  }

  function handleOptionChange(nextOption: DueDateOption | null) {
    if (!nextOption) return
    if (nextOption.type === "none") {
      onValueChange(null)
      return
    }
    if (nextOption.type === "custom") {
      requestAnimationFrame(() => setPickerOpen(true))
      return
    }
    onValueChange({
      type: "preset",
      id: nextOption.id,
      label: nextOption.label,
      date: nextOption.date,
    })
  }

  function confirmCustomDate() {
    if (!draftDate) return
    onValueChange({
      type: "custom",
      id: "custom-date",
      label: format(draftDate, "MMM d"),
      date: startOfDay(draftDate),
    })
    setPickerOpen(false)
  }

  return (
    <>
      <Combobox
        items={[NO_DUE_DATE, ...presets, CUSTOM_DUE_DATE]}
        value={selectedOption}
        modal={false}
        onValueChange={handleOptionChange}
        itemToStringValue={(item: DueDateOption) => item.searchText}
        isItemEqualToValue={(item, selected) => item.id === selected.id}
        autoHighlight
      >
        <ComboboxTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="max-w-full justify-between gap-2 font-normal"
              aria-label="Select due date"
            />
          }
        >
          <DueDateTriggerLabel value={value} />
        </ComboboxTrigger>

        <ComboboxContent className="pointer-events-auto min-w-64">
          <ComboboxList>
            <ComboboxItem value={NO_DUE_DATE}>
              <DueDateRow option={NO_DUE_DATE} />
            </ComboboxItem>
            <ComboboxSeparator />
            {presets.map((option) => (
              <ComboboxItem key={option.id} value={option}>
                <DueDateRow option={option} />
              </ComboboxItem>
            ))}
            <ComboboxSeparator />
            <ComboboxItem value={CUSTOM_DUE_DATE}>
              <DueDateRow option={CUSTOM_DUE_DATE} />
            </ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="pointer-events-auto z-[70] flex w-auto max-w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden sm:max-w-none">
          <DialogHeader>
            <DialogTitle>Pick a due date</DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Calendar
              mode="single"
              selected={draftDate}
              onSelect={setDraftDate}
              defaultMonth={draftDate ?? today}
              numberOfMonths={isMobile ? 1 : 2}
              pagedNavigation
              showOutsideDays={false}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              Dismiss
            </DialogClose>
            <Button
              type="button"
              size="sm"
              onClick={confirmCustomDate}
              disabled={!draftDate}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ── Map an existing task back onto the form's option objects ──

function statusOptionFor(status: TaskStatus): StatusOption {
  return (
    STATUS_OPTIONS.find((option) => option.status === status) ??
    STATUS_OPTIONS[0]
  )
}

function priorityOptionFor(priority: TaskPriority): PriorityOption {
  return (
    PRIORITY_OPTIONS.find((option) => option.priority === priority) ??
    PRIORITY_OPTIONS[1]
  )
}

// ── Delete confirmation ──

function DeleteConfirm({
  taskTitle,
  onConfirm,
  children,
}: {
  taskTitle: string
  onConfirm: () => void
  children: React.ReactNode
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={children as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete task?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{taskTitle}&rdquo; will be removed from the board. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Read-only detail view ──

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0 font-medium">{children}</div>
    </div>
  )
}

function TaskView({
  task,
  people,
}: {
  task: Task
  people: Record<string, Person>
}) {
  const assignee = people[task.assigneeId]
  const subtaskDone = task.subtasks.filter((s) => s.status === "Done").length
  const subtaskLabel =
    task.subtasks.length > 0
      ? `${subtaskDone} of ${task.subtasks.length} done`
      : "None"
  return (
    <div className="flex min-h-full flex-col px-6 pt-8 pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {task.id}
          </Badge>
          {task.tags[0] ? (
            <span className="truncate text-xs text-muted-foreground">
              {task.tags[0]}
            </span>
          ) : null}
        </div>
        <SheetTitle className="text-2xl leading-tight font-semibold text-balance">
          {task.title}
        </SheetTitle>
        {task.description ? (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {task.description}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground italic">
            No description
          </p>
        )}
      </div>

      <div className="mt-6 divide-y rounded-lg border">
        <DetailRow label="Status">
          <span className="flex min-w-0 items-center gap-2">
            <StatusGlyph status={task.status} />
            <span className="truncate">{task.status}</span>
          </span>
        </DetailRow>
        <DetailRow label="Priority">
          <span className="flex min-w-0 items-center gap-2">
            <PriorityGlyph priority={task.priority} />
            <span className="truncate">{task.priority}</span>
          </span>
        </DetailRow>
        <DetailRow label="Assignee">
          {assignee ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage src={assignee.image} alt={assignee.name} />
                <AvatarFallback className="text-[9px]">
                  {assignee.initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{assignee.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </DetailRow>
        <DetailRow label="Due date">
          <span className={cn(!task.dueDate && "text-muted-foreground")}>
            {task.dueDate || "No due date"}
          </span>
        </DetailRow>
        <DetailRow label="Progress">{task.progress}%</DetailRow>
        <DetailRow label="Tags">
          {task.tags.length > 0 ? task.tags.join(", ") : "None"}
        </DetailRow>
        <DetailRow label="Sub-tasks">{subtaskLabel}</DetailRow>
      </div>
    </div>
  )
}

// ── Task sheet (create / view / edit) ──

const FORM_ID = "kanban-task-sheet-form"

export type BoardTaskSheetMode = "create" | "view" | "edit"

export interface BoardTaskSheetState {
  mode: BoardTaskSheetMode
  task?: Task | null
}

export function BoardTaskSheet({
  state,
  team,
  onOpenChange,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  state: BoardTaskSheetState | null
  team: Person[]
  onOpenChange: (open: boolean) => void
  onSubmit: (task: Task) => void
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: (task: Task) => void
}) {
  const open = state !== null
  const mode = state?.mode ?? null
  const baseTask =
    state && state.mode !== "create" ? (state.task ?? null) : null

  const people = React.useMemo(
    () =>
      team.reduce<Record<string, Person>>((map, person) => {
        map[person.id] = person
        return map
      }, {}),
    [team]
  )

  const assigneeOptions = React.useMemo<AssigneeOption[]>(
    () => [
      NO_ASSIGNEE_OPTION,
      ...team.map((person) => ({
        id: person.id,
        value: person.id,
        label: person.name,
        searchText: `${person.name} ${person.role}`.toLowerCase(),
        person,
      })),
    ],
    [team]
  )

  // Read in the re-seed effect, which stays keyed on `state` alone: `team` can
  // hand back a new array on any render, and a dep on it would reset the form
  // mid-edit.
  const assigneeOptionsRef = React.useRef(assigneeOptions)
  React.useLayoutEffect(() => {
    assigneeOptionsRef.current = assigneeOptions
  })
  const form = useForm<BoardTaskFormInput>({
    resolver: zodResolver(boardTaskSchema),
    defaultValues: boardTaskDefaultValues(null),
    // Validate on blur, then live while the field is being corrected.
    mode: "onTouched",
  })
  const { errors } = form.formState

  // Re-seed on open / record or mode change. `state` only changes on an explicit
  // open/mode transition, so in-progress edits are preserved. reset() also
  // clears the messages and the touched flags, which is what makes a reopened
  // sheet read as untouched.
  React.useEffect(() => {
    if (!state) return
    const source = state.mode !== "create" ? (state.task ?? null) : null
    const values = boardTaskDefaultValues(source)
    // A card assigned to someone no longer on the team opens as unassigned
    // rather than showing a name the dropdown cannot offer back.
    const known = assigneeOptionsRef.current.some(
      (option) => option.value === values.assigneeId
    )
    form.reset({
      ...values,
      assigneeId: known ? values.assigneeId : NO_ASSIGNEE_OPTION.value,
    })
  }, [state, form])

  function handleValid(values: BoardTaskFormInput) {
    const task: Task = {
      id: baseTask?.id ?? newTaskId(),
      title: values.title,
      description: values.description,
      status: values.status,
      priority: values.priority,
      assigneeId: values.assigneeId,
      projectId: baseTask?.projectId ?? "",
      dueDate: values.dueDate ? format(values.dueDate.date, "MMM d") : "",
      tags: baseTask?.tags ?? [],
      progress: baseTask?.progress ?? 0,
      subtasks: baseTask?.subtasks ?? [],
    }

    onSubmit(task)
    onOpenChange(false)
  }

  const viewTask = mode === "view" ? baseTask : null
  const sheetDescription =
    mode === "edit"
      ? "Update this task's details."
      : "Add a task title, description, status, priority, assignee, and due date."

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="inset-y-4! right-4! left-auto! flex h-[calc(100svh-2rem)]! w-[min(29rem,calc(100vw-2rem))]! max-w-none! flex-col overflow-hidden rounded-xl border outline-none"
      >
        <SheetHeader className="sr-only p-0">
          <SheetTitle>
            {mode === "view"
              ? "Task details"
              : mode === "edit"
                ? "Edit task"
                : "Create task"}
          </SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {viewTask ? (
              <TaskView task={viewTask} people={people} />
            ) : (
              <form
                id={FORM_ID}
                className="flex min-h-full flex-col border-0 px-6 pt-8 pb-6"
                onSubmit={form.handleSubmit(handleValid)}
                noValidate
              >
                <FieldGroup className="gap-4">
                  <Controller
                    control={form.control}
                    name="title"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor="kanban-task-title">
                          Task name
                        </FieldLabel>
                        <Input
                          {...field}
                          id="kanban-task-title"
                          placeholder="Task name"
                          aria-invalid={fieldState.invalid || undefined}
                          autoFocus
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="description"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor="kanban-task-description">
                          Task description
                        </FieldLabel>
                        <Textarea
                          {...field}
                          id="kanban-task-description"
                          placeholder="Add a description, acceptance criteria, or context..."
                          rows={2}
                          aria-invalid={fieldState.invalid || undefined}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                {/* Metadata pills. Each holds a union value or a resolved date,
                    so the messages sit under the row rather than splitting it
                    into stacked fields. */}
                <div
                  className="mt-5 flex flex-wrap items-center gap-2"
                  aria-label="Task metadata"
                >
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select task status"
                        value={statusOptionFor(field.value)}
                        items={STATUS_OPTIONS}
                        searchPlaceholder="Change status"
                        emptyMessage="No statuses found."
                        onValueChange={(option) =>
                          field.onChange(option.status)
                        }
                        renderOption={(option) => (
                          <span className="flex min-w-0 items-center gap-2">
                            <StatusGlyph status={option.status} />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select task priority"
                        value={priorityOptionFor(field.value)}
                        items={PRIORITY_OPTIONS}
                        searchPlaceholder="Change priority"
                        emptyMessage="No priorities found."
                        onValueChange={(option) =>
                          field.onChange(option.priority)
                        }
                        renderOption={(option) => (
                          <span className="flex min-w-0 items-center gap-2">
                            <PriorityGlyph priority={option.priority} />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select task assignee"
                        value={
                          assigneeOptions.find(
                            (option) => option.value === field.value
                          ) ?? NO_ASSIGNEE_OPTION
                        }
                        items={assigneeOptions}
                        searchPlaceholder="Assign to"
                        emptyMessage="No people found."
                        onValueChange={(option) => field.onChange(option.value)}
                        renderOption={(option) => (
                          <AssigneeGlyph option={option} />
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <DueDateCombobox
                        value={field.value}
                        onValueChange={field.onChange}
                      />
                    )}
                  />
                </div>
                <FieldError
                  className="mt-2"
                  errors={[
                    errors.status,
                    errors.priority,
                    errors.assigneeId,
                    errors.dueDate,
                  ]}
                />

                {mode === "create" ? (
                  <div className="mt-8 border-t pt-5">
                    <div className="flex min-w-0 items-center gap-2">
                      <FlagIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-medium">
                        Quick tips
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      {CREATE_TIPS.map((tip) => (
                        <div
                          key={tip.text}
                          className="flex min-w-0 items-start gap-2 py-0.5 text-sm leading-snug text-muted-foreground"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-[13px] leading-none"
                          >
                            {tip.icon}
                          </span>
                          <span>{tip.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </form>
            )}
          </ScrollArea>
        </div>

        <SheetFooter className="shrink-0 gap-3 border-t bg-muted">
          {viewTask ? (
            <div className="flex w-full items-center justify-end gap-2">
              <DeleteConfirm
                taskTitle={viewTask.title}
                onConfirm={() => onDelete(viewTask)}
              >
                <Button type="button" variant="outline">
                  <Trash2Icon className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </DeleteConfirm>
              <Button type="button" onClick={onEdit}>
                <PencilIcon className="size-4" aria-hidden="true" />
                Edit
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-end gap-2">
              {mode === "edit" && baseTask ? (
                <DeleteConfirm
                  taskTitle={baseTask.title}
                  onConfirm={() => onDelete(baseTask)}
                >
                  <Button type="button" variant="outline" className="me-auto">
                    <Trash2Icon className="size-4" aria-hidden="true" />
                    Delete
                  </Button>
                </DeleteConfirm>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={
                  mode === "edit" ? onCancelEdit : () => onOpenChange(false)
                }
              >
                Cancel
              </Button>
              <Button type="submit" form={FORM_ID}>
                {mode === "edit" ? "Save changes" : "Create task"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
