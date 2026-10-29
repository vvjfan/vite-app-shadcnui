import * as React from "react"
import { Fragment, useCallback, useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { Badge } from "@/components/reui/badge"
import type { BadgeProps } from "@/components/reui/badge"
import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame"
import { Gantt } from "@/components/reui/gantt/gantt"
import type { GanttColumn } from "@/components/reui/gantt/gantt"
import { GANTT_COLORS } from "@/components/reui/gantt/gantt-bar"
import {
  GanttNavNext,
  GanttNavPrev,
  GanttNavToday,
  GanttScaleSwitcher,
  GanttTitle,
  GanttToolbar,
} from "@/components/reui/gantt/gantt-nav"
import type {
  GanttInteractions,
  GanttOccurrence,
  GanttProposedUpdate,
  GanttResource,
  GanttResourceReorder,
  GanttSlotDraft,
} from "@/components/reui/gantt/gantt-types"
import { GanttView } from "@/components/reui/gantt/gantt-view"
import { addDays, format } from "date-fns"
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
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
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
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { buildDemoBars, buildTaskMeta, DEMO_PEOPLE, DEMO_TASKS } from "./data"
import type {
  DemoBar,
  DemoPerson,
  DemoPriority,
  DemoStatus,
  DemoTaskMeta,
} from "./data"
import { listFormSchema } from "../lib/list-form-schema"
import type { ListFormValues } from "../lib/list-form-schema"
import { taskFormSchema } from "../lib/task-form-schema"
import type { TaskFormValues } from "../lib/task-form-schema"
import {
  appendList,
  appendTaskToList,
  filterTasksByAssignee,
  findSubtreeIds,
  findTaskTitle,
  removeTask,
  renameTask,
  UNASSIGNED,
} from "../lib/task-tree"
import {
  addBar,
  addMeta,
  dayStart,
  dueOf,
  findLockedConflict as findLockedConflictIn,
  findLockedInSubtree,
  isAssigned,
  latestBarByTask,
  removeBar,
  removeBarsForTasks,
  removeMeta,
  rollupProgress,
  setMetaFields,
  setMetaPriority,
  setMetaStatus,
  toggleMetaAssignee,
  touchMeta,
  updateBar,
} from "../lib/task-state"
import {
  CheckCircleIcon as CircleCheckIcon,
  InfoIcon,
  WarningCircleIcon as AlertCircleIcon,
  ListChecksIcon,
  LockIcon,
  FlagIcon,
  PlusIcon,
  PencilSimpleIcon as PencilIcon,
  CopyIcon,
  CalendarIcon,
  TrashIcon as Trash2Icon,
  CaretDownIcon as ChevronDownIcon,
  DotsThreeIcon as MoreHorizontalIcon,
  UsersIcon,
} from "@phosphor-icons/react"

/**
 * Deterministic anchor so screenshots and tests never drift.
 *
 * The view centers today when today falls inside the anchor's period, and the
 * anchor itself otherwise - so the project is built symmetrically AROUND this
 * instant rather than trailing behind it. That keeps the opening composition
 * balanced in both branches instead of leaving the work stranded to one side.
 */
const ANCHOR = new Date("2026-07-19T12:00:00")

/** Stable identity: a fresh i18n object per render would churn settings. */
const DEMO_I18N = { labels: { resources: "Name" } }

/** Global timeline limits: travel stays within the project horizon. */
const DEMO_RANGE_BOUNDS = {
  min: new Date("2026-01-01T00:00:00"),
  max: new Date("2027-12-31T23:59:59"),
}

// Toast glyphs: colored per context (success green, info muted, error red),
// paired with a short title + a detail line (donor: solution-agents-1).
const TOAST_SUCCESS_ICON = (
  <CircleCheckIcon className="size-[18px] text-green-600" aria-hidden="true" />
)
const TOAST_INFO_ICON = (
  <InfoIcon className="size-[18px] text-muted-foreground" aria-hidden="true" />
)
const TOAST_ERROR_ICON = (
  <AlertCircleIcon
    className="size-[18px] text-destructive"
    aria-hidden="true"
  />
)

const notifySuccess = (title: string, description: string) =>
  toast.success(title, { description, icon: TOAST_SUCCESS_ICON })
const notifyInfo = (title: string, description: string) =>
  toast(title, { description, icon: TOAST_INFO_ICON })
const notifyError = (title: string, description: string) =>
  toast.error(title, {
    description,
    icon: TOAST_ERROR_ICON,
    classNames: { icon: "text-destructive" },
  })

// Status badge follows the reviewed data-grid convention (grouping-1,
// data-grid-base-2): soft `-light` variants per state, `outline` for the quiet
// "Todo" (its border reads better than a secondary fill in a dense tree). The
// `dot` still drives the tree row + dialog swatches.
// Labels are the planner's shared status wording (TASK_STATUS_ORDER and the
// board columns), so a state reads the same on every page.
const STATUS_META: Record<
  DemoStatus,
  { label: string; badge: BadgeProps["variant"]; dot: string }
> = {
  todo: {
    label: "Todo",
    badge: "outline",
    dot: "border-muted-foreground/40 border-2 bg-transparent",
  },
  progress: { label: "In Progress", badge: "info-light", dot: "bg-blue-500" },
  review: { label: "Review", badge: "warning-light", dot: "bg-amber-500" },
  done: { label: "Done", badge: "success-light", dot: "bg-emerald-500" },
}
const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, meta]) => ({
  value: value as DemoStatus,
  label: meta.label,
}))

const PRIORITY_META = {
  urgent: { label: "Urgent", flag: "text-destructive" },
  high: { label: "High", flag: "text-amber-500" },
  normal: { label: "Normal", flag: "text-blue-500" },
  low: { label: "Low", flag: "text-muted-foreground" },
} as const
const PRIORITY_OPTIONS = Object.entries(PRIORITY_META).map(([value, meta]) => ({
  value: value as DemoPriority,
  label: meta.label,
}))

const COLUMN_OPTIONS = [
  { id: "status", label: "Status" },
  { id: "assignee", label: "Assignee" },
  { id: "due", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "updated", label: "Updated" },
] as const

// Default task-table columns (best-practice set: state, owner, deadline).
// Priority and Updated stay available through the columns menu.
const DEFAULT_VISIBLE_COLUMNS = ["status", "assignee", "due"]

/** Assignee filter: the roster plus a sentinel for tasks with no owner. */
const ASSIGNEE_OPTIONS: { key: string; name: string; image?: string }[] = [
  ...DEMO_PEOPLE.map((person) => ({
    key: person.name,
    name: person.name,
    image: person.image,
  })),
  { key: UNASSIGNED, name: "Unassigned" },
]

const initialsOf = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")

/**
 * Both dialogs keep their submit button in the footer, outside the scrolling
 * <form>, so the buttons reach their form through these ids.
 */
const TASK_FORM_ID = "gantt-task-form"
const LIST_FORM_ID = "gantt-list-form"

/** List create/rename dialog state (lists have no bars, so no Draft fields). */
interface ListDraft {
  mode: "create" | "rename"
  listId?: string
  title: string
}

interface Draft {
  mode: "edit" | "task" | "schedule"
  barId?: string
  taskId?: string
  groupId: string
  title: string
  start: Date
  /** Inclusive; saved as an exclusive midnight end. */
  due: Date
  color: string
  status: DemoStatus
  priority: DemoPriority
  /** DEMO_PEOPLE names; empty means unassigned. */
  assignees: string[]
  readOnly?: boolean
}

interface DemoSettings {
  weekStartsOn: 0 | 1
  scrollbars: "custom" | "native"
  interval: number
  snapDuration: number
  barLabel: "inside" | "outside" | "auto"
  timelineLines: "vertical" | "both" | "none"
  offscreenChips: boolean
  panelResize: boolean
  infiniteScroll: boolean
  checkboxes: boolean
  summaryBars: boolean
  stickyNav: boolean
  parentScheduling: boolean
  dragCreate: boolean
  zoomMax: number
  nowIndicator: boolean
  offDaysOn: boolean
  displayScheduleHint: boolean
  displayCreateTaskHint: boolean
  zoomControl: boolean
  reorder: boolean
  navButtonVariant: "ghost" | "outline" | "secondary" | "default"
  navButtonSize: "sm" | "default"
  loading: boolean
}

const DEFAULT_DEMO_INTERACTIONS: GanttInteractions = {
  drag: true,
  resize: true,
  selectSlot: true,
}

const DEFAULT_DEMO_SETTINGS: DemoSettings = {
  weekStartsOn: 0,
  scrollbars: "custom",
  interval: 60,
  snapDuration: 15,
  barLabel: "outside",
  // "both": the row separators this block has always drawn are now an
  // explicit choice rather than a hardcoded border
  timelineLines: "both",
  offscreenChips: true,
  panelResize: true,
  infiniteScroll: true,
  checkboxes: true,
  summaryBars: true,
  stickyNav: false,
  parentScheduling: false,
  // A task board schedules through the row's own Add Task flow, not by
  // painting on the timeline - so the grid keeps the whole drag for panning.
  // Both stay switchable in the settings panel.
  dragCreate: false,
  zoomMax: 3,
  nowIndicator: true,
  offDaysOn: true,
  displayScheduleHint: false,
  displayCreateTaskHint: true,
  zoomControl: true,
  reorder: true,
  navButtonVariant: "ghost",
  navButtonSize: "sm",
  loading: false,
}

export function GanttDemo() {
  const [bars, setBars] = useState<DemoBar[]>(() => buildDemoBars(ANCHOR))
  const [tasks, setTasks] = useState<GanttResource[]>(DEMO_TASKS)
  const [taskMeta, setTaskMeta] = useState<Record<string, DemoTaskMeta>>(() =>
    buildTaskMeta(ANCHOR)
  )
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    DEFAULT_VISIBLE_COLUMNS
  )
  const [draft, setDraft] = useState<Draft | null>(null)
  // Pending destructive action, confirmed through a single AlertDialog.
  const [confirmDelete, setConfirmDelete] = useState<{
    title: string
    description: string
    confirmLabel: string
    run: () => void
  } | null>(null)
  // List create/rename dialog (lists have no bars, so a light dialog of its own).
  const [listDraft, setListDraft] = useState<ListDraft | null>(null)
  const [interactions, setInteractions] = useState<GanttInteractions>(
    DEFAULT_DEMO_INTERACTIONS
  )
  // Fixed config: the surfaced toolbar control is now the assignee filter, not
  // a developer settings panel, so these gantt options stay constant.
  const settings = DEFAULT_DEMO_SETTINGS
  const [hiddenAssignees, setHiddenAssignees] = useState<Set<string>>(
    () => new Set()
  )
  const toggleAssignee = (key: string) =>
    setHiddenAssignees((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const barsRef = useRef(bars)
  React.useLayoutEffect(() => {
    barsRef.current = bars
  })
  const tasksRef = useRef(tasks)
  React.useLayoutEffect(() => {
    tasksRef.current = tasks
  })
  const idRef = useRef(1)

  // Assignee filter view: hidden owners drop their rows (bars with no row are
  // never rendered), while edits, adds and deletes still act on the full tree.
  // Rollups read this filtered tree so the tree % matches the grid summary bars.
  const visibleTasks = useMemo(
    () => filterTasksByAssignee(tasks, taskMeta, hiddenAssignees),
    [tasks, taskMeta, hiddenAssignees]
  )
  const isFiltering = hiddenAssignees.size > 0

  // Deterministic "today": edits stamp the anchor so screenshots never drift
  const touchTask = useCallback((taskId: string) => {
    setTaskMeta((prev) => touchMeta(prev, taskId, dayStart(ANCHOR)))
  }, [])

  /** Business rule: nothing may overlap a locked bar on the same task row. */
  const findLockedConflict = useCallback(
    (start: Date, end: Date, excludeId?: string, resourceId?: string) =>
      findLockedConflictIn(barsRef.current, start, end, excludeId, resourceId),
    []
  )

  const canDropEvent = useCallback(
    (update: GanttProposedUpdate) => {
      if (update.event.readOnly) return false
      return !findLockedConflict(
        update.start,
        update.end,
        update.event.id,
        update.resourceId ?? update.event.resourceId
      )
    },
    [findLockedConflict]
  )

  const handleEventUpdate = useCallback(
    (update: GanttProposedUpdate) => {
      if (update.event.readOnly) {
        notifyError("Task locked", `"${update.event.title}" can't be moved.`)
        return false
      }
      const hit = findLockedConflict(
        update.start,
        update.end,
        update.event.id,
        update.resourceId ?? update.event.resourceId
      )
      if (hit) {
        notifyError(
          "Overlap blocked",
          `That would overlap the locked "${hit.title}".`
        )
        return false
      }
      const taskId = update.resourceId ?? update.event.resourceId
      if (taskId) touchTask(taskId)
      if (update.source === "drag") {
        notifySuccess(
          "Task moved",
          `"${update.event.title}" now starts ${format(update.start, "EEE, MMM d")}.`
        )
      } else if (update.source !== "api") {
        notifySuccess(
          "Schedule updated",
          `"${update.event.title}" is due ${format(dueOf(update.end), "MMM d")}.`
        )
      }
    },
    [findLockedConflict, touchTask]
  )

  /** Tree reorder: the locked release gate is pinned to demo live validation. */
  const canReorderResource = useCallback(
    (proposal: GanttResourceReorder) => proposal.resourceId !== "perf-audit",
    []
  )
  const handleResourceReorder = useCallback(
    (proposal: GanttResourceReorder) => {
      setTasks(proposal.resources)
      const title =
        findTaskTitle(proposal.resources, proposal.resourceId) ??
        proposal.resourceId
      notifyInfo("Task reordered", `"${title}" moved to a new position.`)
    },
    []
  )
  /** A drop released on the locked row - canReorderResource blocked it live. */
  const handleResourceReorderReject = useCallback(
    (proposal: GanttResourceReorder) => {
      if (proposal.resourceId === "perf-audit") {
        notifyError("Task locked", "Perf audit is pinned and can't be moved.")
      }
    },
    []
  )

  /**
   * Parent rollup: duration-weighted progress across the subtree's bars. Walks
   * the filtered tree so the tree % matches the gantt's own summary-bar % when
   * an assignee is hidden.
   */
  const rollupByParent = useMemo(
    () => rollupProgress(visibleTasks, bars),
    [visibleTasks, bars]
  )

  /** Tree nodes: lists get an icon + count, parents a rollup %, tasks a dot. */
  const renderResourceLabel = useCallback(
    ({
      resource,
      depth,
      isGroup,
    }: {
      resource: GanttResource
      depth: number
      isGroup: boolean
    }) => {
      const rollup = isGroup ? (rollupByParent.get(resource.id) ?? null) : null
      // Progress reads as a compact ring (Linear/Asana parent-row pattern), not
      // a bare "%"; the exact figure stays in the tooltip.
      const rollupChip =
        rollup !== null ? (
          <TooltipProvider delay={300} closeDelay={0}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <span
                    role="img"
                    aria-label={`${rollup}% complete`}
                    className="ms-0.5 inline-flex"
                  />
                }
              >
                <ProgressRing value={rollup} />
              </TooltipTrigger>
              <TooltipContent side="top">{`${rollup}% complete`}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null
      if (depth === 0) {
        return (
          <span className="flex min-w-0 items-center gap-1.5">
            <ListChecksIcon
              className="size-3.5 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate">{resource.title}</span>
            {rollupChip}
          </span>
        )
      }
      const status = taskMeta[resource.id]?.status ?? "todo"
      const locked = barsRef.current.some(
        (bar) => bar.resourceId === resource.id && bar.readOnly
      )
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              STATUS_META[status].dot
            )}
          />
          <span className="truncate">{resource.title}</span>
          {locked && (
            <LockIcon
              className="size-3 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          )}
          {rollupChip}
        </span>
      )
    },
    [taskMeta, rollupByParent]
  )

  /** Latest-ending bar per task; the due column reads live bar ends. */
  const barByTask = useMemo(() => latestBarByTask(bars), [bars])

  const taskTitleOf = useCallback(
    (taskId: string | undefined) =>
      taskId ? (findTaskTitle(tasksRef.current, taskId) ?? "") : "",
    []
  )

  const openCreateTask = useCallback((groupId?: string) => {
    setDraft({
      mode: "task",
      groupId: groupId ?? tasksRef.current[0]?.id ?? "bug-tracking",
      title: "",
      start: dayStart(ANCHOR),
      due: addDays(dayStart(ANCHOR), 2),
      color: GANTT_COLORS[0].value,
      status: "todo",
      priority: "normal",
      assignees: [],
    })
  }, [])

  // ----- list CRUD (create/rename via the list dialog; delete via confirm) --
  const openCreateList = useCallback(
    () => setListDraft({ mode: "create", title: "" }),
    []
  )
  const openRenameList = useCallback(
    (listId: string, title: string) =>
      setListDraft({ mode: "rename", listId, title }),
    []
  )
  const saveList = (values: ListFormValues) => {
    if (!listDraft) return
    const title = values.title
    if (listDraft.mode === "create") {
      setTasks((prev) =>
        appendList(prev, `list-demo-${idRef.current++}`, title)
      )
      notifySuccess("List added", `"${title}" was created.`)
    } else if (listDraft.listId) {
      setTasks((prev) => renameTask(prev, listDraft.listId!, title))
      notifySuccess("List renamed", `Renamed to "${title}".`)
    }
    setListDraft(null)
  }

  const openSchedule = useCallback(
    (start: Date, end: Date | undefined, taskId: string | undefined) => {
      if (!taskId) return
      const startDay = dayStart(start)
      setDraft({
        mode: "schedule",
        taskId,
        groupId: "",
        title: taskTitleOf(taskId),
        start: startDay,
        due: end ? dueOf(end) : startDay,
        color: GANTT_COLORS[0].value,
        // schedule mode never edits task fields; they are hidden there
        status: "todo",
        priority: "normal",
        assignees: [],
      })
    },
    [taskTitleOf]
  )

  const openEditBar = useCallback(
    (event: DemoBar) => {
      setDraft({
        mode: "edit",
        barId: event.id,
        taskId: event.resourceId,
        groupId: "",
        title: event.title,
        start: dayStart(event.start),
        due: dueOf(event.end),
        color: event.color ?? GANTT_COLORS[0].value,
        status: event.resourceId
          ? (taskMeta[event.resourceId]?.status ?? "todo")
          : "todo",
        priority: event.resourceId
          ? (taskMeta[event.resourceId]?.priority ?? "normal")
          : "normal",
        assignees: event.resourceId
          ? (taskMeta[event.resourceId]?.assignees ?? [])
          : [],
        readOnly: event.readOnly,
      })
    },
    [taskMeta]
  )
  const openEdit = useCallback(
    (occurrence: GanttOccurrence) => openEditBar(occurrence.event as DemoBar),
    [openEditBar]
  )

  // ----- tree row-actions CRUD (wired to the actions column dropdown) -----
  /** Edit the task's bar, or schedule it if it has none yet. */
  const openEditTask = useCallback(
    (taskId: string) => {
      const bar = barsRef.current.find((entry) => entry.resourceId === taskId)
      if (bar) openEditBar(bar)
      else openSchedule(dayStart(ANCHOR), undefined, taskId)
    },
    [openEditBar, openSchedule]
  )
  /** Toggle one owner on a task (multi-assignee). */
  const toggleTaskAssignee = useCallback(
    (taskId: string, name: string) => {
      const added = !isAssigned(taskMeta, taskId, name)
      setTaskMeta((prev) =>
        toggleMetaAssignee(prev, taskId, name, dayStart(ANCHOR))
      )
      notifySuccess(
        "Assignee updated",
        added
          ? `${name} assigned to "${taskTitleOf(taskId)}".`
          : `${name} removed from "${taskTitleOf(taskId)}".`
      )
    },
    [taskMeta, taskTitleOf]
  )
  const updateStatus = useCallback(
    (taskId: string, status: DemoStatus) => {
      setTaskMeta((prev) =>
        setMetaStatus(prev, taskId, status, dayStart(ANCHOR))
      )
      notifySuccess(
        "Status updated",
        `"${taskTitleOf(taskId)}" marked ${STATUS_META[status].label}.`
      )
    },
    [taskTitleOf]
  )
  const updatePriority = useCallback(
    (taskId: string, priority: DemoPriority) => {
      setTaskMeta((prev) =>
        setMetaPriority(prev, taskId, priority, dayStart(ANCHOR))
      )
      notifySuccess(
        "Priority updated",
        `"${taskTitleOf(taskId)}" set to ${PRIORITY_META[priority].label}.`
      )
    },
    [taskTitleOf]
  )
  const deleteTaskById = useCallback(
    (taskId: string) => {
      const removed = findSubtreeIds(tasksRef.current, taskId)
      const locked = findLockedInSubtree(barsRef.current, removed)
      if (locked) {
        notifyError("Task locked", `"${locked.title}" blocks deletion.`)
        return
      }
      const title = taskTitleOf(taskId)
      setTasks((prev) => removeTask(prev, taskId))
      setBars((prev) => removeBarsForTasks(prev, removed))
      setTaskMeta((prev) => removeMeta(prev, removed))
      notifySuccess("Removed", `"${title}" was deleted.`)
    },
    [taskTitleOf]
  )
  /** Stage a task/list deletion for AlertDialog confirmation (locked-safe). */
  const requestDeleteTask = useCallback(
    (taskId: string, isList: boolean) => {
      const removed = findSubtreeIds(tasksRef.current, taskId)
      const locked = findLockedInSubtree(barsRef.current, removed)
      if (locked) {
        notifyError("Can't delete", `"${locked.title}" is locked.`)
        return
      }
      const title = taskTitleOf(taskId)
      const childCount = removed.length - 1
      const items = `${childCount} ${isList ? "task" : "subtask"}${childCount === 1 ? "" : "s"}`
      setConfirmDelete({
        title: isList ? "Delete List?" : "Delete Task?",
        description:
          childCount > 0
            ? `"${title}" and its ${items} will be permanently removed.`
            : `"${title}" will be permanently removed.`,
        confirmLabel: isList ? "Delete List" : "Delete Task",
        run: () => deleteTaskById(taskId),
      })
    },
    [taskTitleOf, deleteTaskById]
  )

  const columns = useMemo<GanttColumn[]>(() => {
    const defs: Record<string, GanttColumn> = {
      status: {
        id: "status",
        title: "Status",
        width: 96,
        render: ({ resource, depth }) => {
          const meta = taskMeta[resource.id]
          if (depth === 0 || !meta) return null
          const status = STATUS_META[meta.status]
          return (
            <Badge variant={status.badge} radius="full">
              {status.label}
            </Badge>
          )
        },
      },
      due: {
        id: "due",
        title: "Due date",
        width: 72,
        render: ({ resource, depth }) => {
          if (depth === 0) return null
          const bar = barByTask.get(resource.id)
          if (!bar) return null
          const overdue =
            dueOf(bar.end).getTime() < dayStart(ANCHOR).getTime() &&
            taskMeta[resource.id]?.status !== "done"
          return (
            <span
              className={cn(
                "truncate",
                overdue ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {format(dueOf(bar.end), "MMM d")}
            </span>
          )
        },
      },
      updated: {
        id: "updated",
        title: "Updated",
        width: 84,
        render: ({ resource, depth }) => {
          const meta = taskMeta[resource.id]
          if (depth === 0 || !meta) return null
          return (
            <span className="truncate text-muted-foreground">
              {format(meta.updated, "MMM d")}
            </span>
          )
        },
      },
      assignee: {
        id: "assignee",
        // Avatar-only keeps the column compact enough to be default-visible
        // beside Status and Due; names are revealed on hover (task-table norm).
        // One owner shows one avatar; several show an overlapping stack + count.
        title: "Assignee",
        width: 72,
        render: ({ resource, depth }) => {
          const meta = taskMeta[resource.id]
          if (depth === 0 || !meta) return null
          return <AssigneeCell names={meta.assignees ?? []} />
        },
      },
      priority: {
        id: "priority",
        title: "Priority",
        width: 96,
        render: ({ resource, depth }) => {
          const meta = taskMeta[resource.id]
          if (depth === 0 || !meta) return null
          const priority = PRIORITY_META[meta.priority]
          return (
            <span className="flex min-w-0 items-center gap-1.5">
              <FlagIcon
                className={cn("size-3 shrink-0", priority.flag)}
                aria-hidden="true"
              />
              <span className="truncate text-muted-foreground">
                {priority.label}
              </span>
            </span>
          )
        },
      },
    }
    const dataColumns = COLUMN_OPTIONS.filter((option) =>
      visibleColumns.includes(option.id)
    ).map((option) => defs[option.id])
    // Always-on trailing actions column: per-row CRUD (edit/assign/status/
    // delete for tasks; add/rename/delete for lists).
    const actionsColumn: GanttColumn = {
      id: "actions",
      title: "",
      width: 32,
      render: ({ resource, depth }) => (
        <RowActionsMenu
          resource={resource}
          isList={depth === 0}
          meta={taskMeta[resource.id]}
          hasBar={barByTask.has(resource.id)}
          onEdit={openEditTask}
          onAddTask={openCreateTask}
          onRenameList={openRenameList}
          onAssign={toggleTaskAssignee}
          onStatus={updateStatus}
          onPriority={updatePriority}
          onDelete={requestDeleteTask}
        />
      ),
    }
    return [...dataColumns, actionsColumn]
  }, [
    barByTask,
    taskMeta,
    visibleColumns,
    openEditTask,
    openCreateTask,
    openRenameList,
    toggleTaskAssignee,
    updateStatus,
    updatePriority,
    requestDeleteTask,
  ])

  /** The add/remove columns dropdown, rendered by the gantt header slot. */
  const columnsMenu = (
    <DropdownMenu>
      <TooltipProvider delay={600} closeDelay={0} timeout={300}>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Add or remove columns"
                    className="text-muted-foreground hover:text-foreground"
                  />
                }
              />
            }
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Add or remove columns</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Columns</DropdownMenuLabel>
          {COLUMN_OPTIONS.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.id}
              checked={visibleColumns.includes(option.id)}
              onCheckedChange={(checked: boolean) =>
                setVisibleColumns((prev) =>
                  COLUMN_OPTIONS.map((candidate) => candidate.id).filter(
                    (id) => (id === option.id ? checked : prev.includes(id))
                  )
                )
              }
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  /**
   * Submit handler for the task dialog. The schema has already checked the
   * fields; what is left is the live business rule, which needs the current
   * bars. Returns the message to show when it blocks the save, else null.
   */
  const saveDraft = (values: TaskFormValues): string | null => {
    if (!draft) return null
    const start = dayStart(values.start)
    const end = addDays(dayStart(values.due), 1)
    const hit = findLockedConflict(start, end, draft.barId, draft.taskId)
    if (hit) {
      return `Overlaps the locked "${hit.title}" bar.`
    }
    const title = values.title
    if (draft.mode === "edit" && draft.barId) {
      setBars((prev) =>
        updateBar(prev, draft.barId!, {
          title,
          start,
          end,
          color: values.color,
        })
      )
      if (draft.taskId) {
        // only the task's primary bar carries its name; extra scheduled
        // bars keep their own titles without renaming the tree node
        if (draft.barId === `bar-${draft.taskId}`) {
          setTasks((prev) => renameTask(prev, draft.taskId!, title))
        }
        setTaskMeta((prev) =>
          setMetaFields(
            prev,
            draft.taskId!,
            {
              status: values.status,
              priority: values.priority,
              assignees: values.assignees,
            },
            dayStart(ANCHOR)
          )
        )
      }
    } else if (draft.mode === "schedule" && draft.taskId) {
      setBars((prev) =>
        addBar(prev, {
          id: `bar-demo-${idRef.current++}`,
          title,
          start,
          end,
          allDay: true,
          color: values.color,
          resourceId: draft.taskId,
        })
      )
      touchTask(draft.taskId)
    } else if (draft.mode === "task") {
      const taskId = `task-demo-${idRef.current++}`
      setTasks((prev) => appendTaskToList(prev, values.groupId, taskId, title))
      setTaskMeta((prev) =>
        addMeta(
          prev,
          taskId,
          {
            status: values.status,
            priority: values.priority,
            assignees: values.assignees,
          },
          dayStart(ANCHOR)
        )
      )
      setBars((prev) =>
        addBar(prev, {
          id: `bar-${taskId}`,
          title,
          start,
          end,
          allDay: true,
          color: values.color,
          resourceId: taskId,
        })
      )
      notifySuccess("Task added", `"${title}" added to the list.`)
    }
    setDraft(null)
    return null
  }

  const deleteDraftTask = () => {
    if (!draft?.taskId || draft.readOnly) return
    const removed = findSubtreeIds(tasksRef.current, draft.taskId)
    const locked = findLockedInSubtree(barsRef.current, removed)
    if (locked) {
      notifyError("Task locked", `"${locked.title}" blocks deletion.`)
      return
    }
    const title = taskTitleOf(draft.taskId)
    setTasks((prev) => removeTask(prev, draft.taskId!))
    setBars((prev) => removeBarsForTasks(prev, removed))
    setTaskMeta((prev) => removeMeta(prev, removed))
    setDraft(null)
    notifySuccess("Removed", `"${title}" was deleted.`)
  }

  // ----- bar right-click actions (wired to the headless renderEventMenu) -----
  const copyTaskLink = (bar: DemoBar) => {
    const base = typeof window !== "undefined" ? window.location.origin : ""
    navigator.clipboard
      ?.writeText(`${base}/tasks/${bar.resourceId ?? bar.id}`)
      .catch(() => {})
    notifySuccess("Link copied", "Task link copied to your clipboard.")
  }
  const unscheduleBar = (bar: DemoBar) => {
    if (bar.readOnly) {
      notifyError("Task locked", `"${bar.title}" can't be unscheduled.`)
      return
    }
    setBars((prev) => removeBar(prev, bar.id))
    notifyInfo("Unscheduled", `"${bar.title}" removed from the timeline.`)
  }
  const deleteBarTask = (bar: DemoBar) => {
    if (bar.readOnly) {
      notifyError("Task locked", `"${bar.title}" can't be deleted.`)
      return
    }
    const taskId = bar.resourceId
    if (!taskId) {
      setBars((prev) => removeBar(prev, bar.id))
      return
    }
    const removed = findSubtreeIds(tasksRef.current, taskId)
    const title = taskTitleOf(taskId)
    setTasks((prev) => removeTask(prev, taskId))
    setBars((prev) => removeBarsForTasks(prev, removed))
    setTaskMeta((prev) => removeMeta(prev, removed))
    notifySuccess("Removed", `"${title}" was deleted.`)
  }
  /** Confirm before the bar-menu delete. */
  const requestDeleteBar = (bar: DemoBar) => {
    if (bar.readOnly) {
      notifyError("Can't delete", `"${bar.title}" is locked.`)
      return
    }
    setConfirmDelete({
      title: "Delete Task?",
      description: `"${bar.title}" will be permanently removed.`,
      confirmLabel: "Delete Task",
      run: () => deleteBarTask(bar),
    })
  }

  const groups = tasks.map((group) => ({ id: group.id, title: group.title }))

  return (
    <div className="flex h-full w-full flex-col bg-background">
      <Frame dense className="min-h-0 flex-1">
        <Gantt
          events={bars}
          onEventsChange={setBars}
          defaultScale="month"
          defaultDate={ANCHOR}
          rangeBounds={DEMO_RANGE_BOUNDS}
          resources={visibleTasks}
          interactions={interactions}
          onInteractionsChange={setInteractions}
          weekStartsOn={settings.weekStartsOn}
          loading={settings.loading}
          snapDuration={settings.snapDuration}
          interval={settings.interval}
          scrollbars={settings.scrollbars}
          nowIndicator={settings.nowIndicator}
          offDays={settings.offDaysOn}
          displayScheduleHint={settings.displayScheduleHint}
          displayCreateTaskHint={settings.displayCreateTaskHint}
          dragCreate={settings.dragCreate}
          onCreateTask={() => openCreateTask()}
          canCreateTask={() => true}
          zoomControl={settings.zoomControl}
          barLabel={settings.barLabel}
          timelineLines={settings.timelineLines}
          offscreenIndicators={settings.offscreenChips}
          stickyNav={settings.stickyNav}
          parentScheduling={settings.parentScheduling}
          rowCheckboxes={settings.checkboxes}
          summaryBars={settings.summaryBars}
          zoomRange={{ min: 0.5, max: settings.zoomMax }}
          infiniteScroll={settings.infiniteScroll}
          navButtonVariant={settings.navButtonVariant}
          navButtonSize={settings.navButtonSize}
          columns={columns}
          columnsMenu={columnsMenu}
          // a task gantt: every task row owns exactly one bar, so the row
          // never grows lanes and a second concurrent bar is refused
          scheduleMode="single"
          treePanel={{ width: 520, resizable: settings.panelResize }}
          i18n={DEMO_I18N}
          onEventClick={openEdit}
          onSlotClick={(slot) =>
            openSchedule(slot.date, slot.end, slot.resourceId)
          }
          onSelectSlot={(slot: GanttSlotDraft) =>
            openSchedule(slot.start, slot.end, slot.resourceId)
          }
          onEventUpdate={handleEventUpdate}
          canDropEvent={canDropEvent}
          canSelectSlot={(slot) => {
            // one schedule per task: no add-hint on a task that already has one
            if (
              slot.resourceId &&
              barsRef.current.some((bar) => bar.resourceId === slot.resourceId)
            ) {
              return false
            }
            return !findLockedConflict(
              slot.start,
              slot.end,
              undefined,
              slot.resourceId
            )
          }}
          onResourceReorder={
            settings.reorder && !isFiltering ? handleResourceReorder : undefined
          }
          onResourceReorderReject={
            settings.reorder && !isFiltering
              ? handleResourceReorderReject
              : undefined
          }
          canReorderResource={canReorderResource}
          renderResourceLabel={renderResourceLabel}
          renderEventMenu={({ occurrence }) => {
            const bar = occurrence.event
            return (
              <>
                <ContextMenuItem onClick={() => openEdit(occurrence)}>
                  <PencilIcon className="size-4" aria-hidden="true" />
                  Edit Task
                </ContextMenuItem>
                <ContextMenuItem onClick={() => copyTaskLink(bar)}>
                  <CopyIcon className="size-4" aria-hidden="true" />
                  Copy Task Link
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => unscheduleBar(bar)}
                  disabled={bar.readOnly}
                >
                  <CalendarIcon className="size-4" aria-hidden="true" />
                  Unschedule
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => requestDeleteBar(bar)}
                  disabled={bar.readOnly}
                >
                  <Trash2Icon className="size-4" aria-hidden="true" />
                  Delete Task
                </ContextMenuItem>
              </>
            )
          }}
          className="min-h-0 flex-1"
        >
          {/* Toolbar row as the Frame header; the FramePanel below holds the
              grid. Nav controls stay inside <Gantt> to keep the gantt context. */}
          <FrameHeader className="flex-row flex-wrap items-center gap-2 px-3">
            <TooltipProvider delay={600} closeDelay={0} timeout={300}>
              <GanttNavToday />
              <GanttScaleSwitcher />
              <div className="flex items-center">
                <GanttNavPrev />
                <GanttNavNext />
              </div>
              <GanttTitle />
              <div className="grow" />
              <GanttToolbar>
                <TaskAssigneeMenu
                  options={ASSIGNEE_OPTIONS}
                  hidden={hiddenAssignees}
                  onToggle={toggleAssignee}
                />
                {/* Split control: primary adds a task, the menu adds a task
                    or a new list. A ButtonGroupSeparator divides the two. */}
                <ButtonGroup className="**:data-[slot=button]:border-r-0">
                  <Button onClick={() => openCreateTask()}>
                    <PlusIcon className="size-4" aria-hidden="true" />
                    Add Task
                  </Button>
                  <ButtonGroupSeparator className="bg-primary/72" />
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          size="icon"
                          aria-label="More create options"
                          className="w-7! rounded-l-none border-l border-primary-foreground/20"
                        />
                      }
                    >
                      <ChevronDownIcon className="size-4" aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openCreateTask()}>
                        <PlusIcon className="size-4" aria-hidden="true" />
                        New Task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={openCreateList}>
                        <ListChecksIcon className="size-4" aria-hidden="true" />
                        New List
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </ButtonGroup>
              </GanttToolbar>
            </TooltipProvider>
          </FrameHeader>
          <FramePanel className="flex min-h-0 flex-1 flex-col p-0! shadow-none!">
            <GanttView />
          </FramePanel>
        </Gantt>
      </Frame>

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => {
          if (!open) setDraft(null)
        }}
      >
        <DialogContent className="flex max-h-[calc(100svh-2rem)] flex-col overflow-hidden sm:max-w-md">
          <DialogHeader className="shrink-0">
            <DialogTitle>
              {draft?.mode === "edit"
                ? "Edit Task"
                : draft?.mode === "schedule"
                  ? "Schedule Task"
                  : "New Task"}
            </DialogTitle>
            <DialogDescription>
              {draft?.mode === "edit"
                ? "Update the task details below."
                : draft?.mode === "schedule"
                  ? `Adds another bar to "${findTaskTitle(tasks, draft.taskId ?? "") ?? ""}".`
                  : "Fill in the details for the new task."}
            </DialogDescription>
          </DialogHeader>
          {/* The dialog body is a real <form>; the footer's Save reaches it
              through form="gantt-task-form". Keying it per opened record
              remounts it, so react-hook-form re-seeds from the fresh draft. */}
          {draft && (
            <TaskDialogForm
              key={`${draft.mode}:${draft.barId ?? ""}:${draft.taskId ?? ""}`}
              draft={draft}
              groups={groups}
              onSubmit={saveDraft}
            />
          )}
          <DialogFooter className="shrink-0">
            {draft?.mode === "edit" && draft.taskId && (
              <Button
                variant="outline"
                className="me-auto text-destructive hover:text-destructive"
                disabled={draft.readOnly}
                onClick={() =>
                  draft.taskId &&
                  setConfirmDelete({
                    title: "Delete Task?",
                    description: `"${taskTitleOf(draft.taskId)}" will be permanently removed.`,
                    confirmLabel: "Delete Task",
                    run: deleteDraftTask,
                  })
                }
              >
                Delete Task
              </Button>
            )}
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form={TASK_FORM_ID}
              disabled={draft?.readOnly}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmDelete !== null}
        onOpenChange={(open: boolean) => {
          if (!open) setConfirmDelete(null)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDelete?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                confirmDelete?.run()
                setConfirmDelete(null)
              }}
            >
              {confirmDelete?.confirmLabel ?? "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={listDraft !== null}
        onOpenChange={(open) => {
          if (!open) setListDraft(null)
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {listDraft?.mode === "rename" ? "Rename List" : "New List"}
            </DialogTitle>
            <DialogDescription>
              {listDraft?.mode === "rename"
                ? "Update the list name."
                : "Create a new task list."}
            </DialogDescription>
          </DialogHeader>
          {/* Keyed the same way as the task dialog: a remount per opened list
              re-seeds the name from the draft. */}
          {listDraft && (
            <ListDialogForm
              key={`${listDraft.mode}:${listDraft.listId ?? ""}`}
              listDraft={listDraft}
              onSubmit={saveList}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setListDraft(null)}>
              Cancel
            </Button>
            <Button type="submit" form={LIST_FORM_ID}>
              {listDraft?.mode === "rename" ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * The task dialog's body: a real <form> whose submit button sits in the dialog
 * footer and reaches it through form={TASK_FORM_ID}, so Enter submits too.
 *
 * Fields are validated on blur and then live while one is being corrected;
 * nothing is disabled to hold a save back. `onSubmit` runs the caller's live
 * rule (no overlapping a locked bar) and returns the message when it refuses.
 */
function TaskDialogForm({
  draft,
  groups,
  onSubmit,
}: {
  draft: Draft
  groups: { id: string; title: string }[]
  onSubmit: (values: TaskFormValues) => string | null
}) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      mode: draft.mode,
      title: draft.title,
      groupId: draft.groupId,
      status: draft.status,
      priority: draft.priority,
      assignees: draft.assignees,
      start: draft.start,
      due: draft.due,
      color: draft.color,
    },
    mode: "onTouched",
  })
  // The range rule is reported on `due`, so moving `start` re-checks it.
  const recheckRange = () => void form.trigger("due")
  const conflict = form.formState.errors.root?.message

  return (
    /* -mx-1/px-1 on the scroll box: scrolling makes overflow-x compute to auto
       too, which would clip the 3px focus ring off the sides of every
       full-width field. The padding gives the ring room; the negative margin
       keeps the fields aligned with the footer. */
    <form
      id={TASK_FORM_ID}
      noValidate
      onSubmit={form.handleSubmit((values) => {
        const message = onSubmit(values)
        if (message) form.setError("root", { message })
      })}
      className="-mx-1 mt-2 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1"
    >
      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <Field
            className="gap-1.5"
            data-invalid={fieldState.invalid || undefined}
          >
            <FieldLabel htmlFor="gantt-demo-title">Title</FieldLabel>
            <Input
              {...field}
              id="gantt-demo-title"
              disabled={draft.readOnly}
              autoFocus
              placeholder="Task title"
              aria-invalid={fieldState.invalid || undefined}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      {draft.mode === "task" && (
        <Controller
          control={form.control}
          name="groupId"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="gantt-demo-group">List</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(value: string | null) => {
                  if (value) field.onChange(value)
                }}
              >
                <SelectTrigger
                  id="gantt-demo-group"
                  className="w-full"
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid || undefined}
                >
                  <SelectValue>
                    {(current: string | null) => {
                      // block body, not a bare `?? ""`: prettier wraps a
                      // long expression so the empty string lands on its
                      // own line, and the registry's style-token cleanup
                      // strips standalone "" lines - which silently
                      // deletes the operand from the shipped file
                      const group = groups.find((g) => g.id === current)
                      return group?.title ?? "Select group"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      )}
      {draft.mode !== "schedule" && (
        <Controller
          control={form.control}
          name="status"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="gantt-demo-status">Status</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(value: string | null) => {
                  if (value) field.onChange(value)
                }}
                disabled={draft.readOnly}
              >
                <SelectTrigger
                  id="gantt-demo-status"
                  className="w-full"
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid || undefined}
                >
                  <SelectValue>
                    {(current: string | null) => (
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            STATUS_META[(current as DemoStatus) ?? "todo"].dot
                          )}
                        />
                        {STATUS_META[(current as DemoStatus) ?? "todo"].label}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            STATUS_META[option.value].dot
                          )}
                        />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      )}
      {draft.mode !== "schedule" && (
        <Controller
          control={form.control}
          name="priority"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="gantt-demo-priority">Priority</FieldLabel>
              <Select
                value={field.value}
                onValueChange={(value: string | null) => {
                  if (value) field.onChange(value)
                }}
                disabled={draft.readOnly}
              >
                <SelectTrigger
                  id="gantt-demo-priority"
                  className="w-full"
                  onBlur={field.onBlur}
                  aria-invalid={fieldState.invalid || undefined}
                >
                  <SelectValue>
                    {(current: string | null) => {
                      const priority =
                        PRIORITY_META[(current as DemoPriority) ?? "normal"]
                      return (
                        <span className="flex items-center gap-2">
                          <FlagIcon
                            className={cn("size-3.5", priority.flag)}
                            aria-hidden="true"
                          />
                          {priority.label}
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex items-center gap-2">
                        <FlagIcon
                          className={cn(
                            "size-3.5",
                            PRIORITY_META[option.value].flag
                          )}
                          aria-hidden="true"
                        />
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      )}
      {draft.mode !== "schedule" && (
        <Controller
          control={form.control}
          name="assignees"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="gantt-demo-assignees">Assignee</FieldLabel>
              <AssigneeCombobox
                id="gantt-demo-assignees"
                value={field.value}
                onChange={field.onChange}
                disabled={draft.readOnly}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      )}
      <div className="flex gap-3">
        <Controller
          control={form.control}
          name="start"
          render={({ field, fieldState }) => (
            <Field
              className="min-w-0 flex-1 gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="gantt-demo-start">Start</FieldLabel>
              <DateField
                id="gantt-demo-start"
                value={field.value}
                disabled={draft.readOnly}
                invalid={fieldState.invalid}
                onChange={(value) => {
                  field.onChange(value)
                  recheckRange()
                }}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="due"
          render={({ field, fieldState }) => (
            <Field
              className="min-w-0 flex-1 gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="gantt-demo-due">Due</FieldLabel>
              <DateField
                id="gantt-demo-due"
                value={field.value}
                disabled={draft.readOnly}
                invalid={fieldState.invalid}
                onChange={(value) => {
                  field.onChange(value)
                  recheckRange()
                }}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
      <Controller
        control={form.control}
        name="color"
        render={({ field, fieldState }) => (
          <Field
            orientation="horizontal"
            className="justify-between gap-3"
            data-invalid={fieldState.invalid || undefined}
          >
            <FieldLabel>Color</FieldLabel>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex flex-wrap justify-end gap-1.5">
                {GANTT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    aria-label={color.name}
                    aria-pressed={field.value === color.value}
                    className={cn(
                      "size-5 cursor-pointer rounded-full border",
                      field.value === color.value &&
                        "ring-2 ring-ring ring-offset-1"
                    )}
                    style={{ background: color.value }}
                    onClick={() => field.onChange(color.value)}
                  />
                ))}
              </div>
              <FieldError errors={[fieldState.error]} />
            </div>
          </Field>
        )}
      />
      {/* The locked-bar rule can only be judged against the live timeline, so
          it is raised on submit and shown for the form as a whole. */}
      {conflict && <FieldError>{conflict}</FieldError>}
    </form>
  )
}

/** The list dialog's body: one name, same external-submit wiring. */
function ListDialogForm({
  listDraft,
  onSubmit,
}: {
  listDraft: ListDraft
  onSubmit: (values: ListFormValues) => void
}) {
  const form = useForm<ListFormValues>({
    resolver: zodResolver(listFormSchema),
    defaultValues: { title: listDraft.title },
    mode: "onTouched",
  })

  return (
    <form
      id={LIST_FORM_ID}
      noValidate
      onSubmit={form.handleSubmit(onSubmit)}
      className="mt-2"
    >
      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <Field
            className="gap-1.5"
            data-invalid={fieldState.invalid || undefined}
          >
            <FieldLabel htmlFor="gantt-demo-list">Name</FieldLabel>
            <Input
              {...field}
              id="gantt-demo-list"
              autoFocus
              placeholder="List name"
              aria-invalid={fieldState.invalid || undefined}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </form>
  )
}

/**
 * Compact completion ring for parent/list rows (reviewed data-grid donor:
 * grouping-1 CompletionCell). Muted track + accent arc; green once complete.
 */
function ProgressRing({ value }: { value: number }) {
  const radius = 9
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (value / 100) * circumference
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn(
        "size-4 shrink-0",
        value >= 100 ? "text-emerald-500" : "text-primary"
      )}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        className="stroke-border"
        strokeWidth="3"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        fill="none"
        className="stroke-current"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 12 12)"
      />
    </svg>
  )
}

/**
 * Assignee column cell: a dashed placeholder when unassigned, one avatar for a
 * single owner, or an overlapping stack (+N) for several. Names on hover.
 */
function AssigneeCell({ names }: { names: string[] }) {
  const people = names
    .map((name) => DEMO_PEOPLE.find((person) => person.name === name))
    .filter((person): person is DemoPerson => Boolean(person))
  if (people.length === 0) {
    return (
      <span
        role="img"
        aria-label="Unassigned"
        className="size-5 shrink-0 rounded-full border border-dashed border-muted-foreground/40"
      />
    )
  }
  const shown = people.slice(0, 3)
  const overflow = people.length - shown.length
  const label = people.map((person) => person.name).join(", ")
  return (
    <TooltipProvider delay={300} closeDelay={0}>
      <Tooltip>
        <TooltipTrigger
          render={
            <span role="img" aria-label={label} className="inline-flex" />
          }
        >
          <AvatarGroup className="-space-x-1.5">
            {shown.map((person) => (
              <Avatar key={person.name} className="size-5">
                <AvatarImage src={person.image} alt="" />
                <AvatarFallback className="text-[9px]">
                  {initialsOf(person.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {overflow > 0 && (
              <AvatarGroupCount className="size-5 text-[9px]">
                +{overflow}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Multi-assignee picker (event-calendar-1 GuestsCombobox pattern): avatar chips
 * for the chosen owners + a searchable people list. Controlled by name array.
 */
function AssigneeCombobox({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string
  value: string[]
  onChange: (names: string[]) => void
  disabled?: boolean
}) {
  const anchor = useComboboxAnchor()
  // Stable reference so Base UI's controlled Combobox does not re-sync on every
  // parent render.
  const selected = useMemo(
    () =>
      value
        .map((name) => DEMO_PEOPLE.find((person) => person.name === name))
        .filter((person): person is DemoPerson => Boolean(person)),
    [value]
  )
  return (
    <Combobox
      multiple
      disabled={disabled}
      items={DEMO_PEOPLE}
      itemToStringValue={(person: DemoPerson) => person.name}
      value={selected}
      onValueChange={(next: DemoPerson[]) =>
        onChange(next.map((person) => person.name))
      }
    >
      <ComboboxChips
        ref={anchor}
        className="has-data-[slot=combobox-chip]:pl-1"
      >
        <ComboboxValue>
          {(items: DemoPerson[]) => (
            <Fragment>
              {items.map((person) => (
                <ComboboxChip
                  key={person.name}
                  showRemove
                  className="gap-1.5 rounded-full"
                >
                  <Avatar className="size-4">
                    <AvatarImage src={person.image} alt="" />
                    <AvatarFallback className="text-[8px]">
                      {initialsOf(person.name)}
                    </AvatarFallback>
                  </Avatar>
                  {person.name}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput id={id} placeholder="Add assignees..." />
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
          {(person: DemoPerson) => (
            <ComboboxItem key={person.name} value={person}>
              <Item size="xs" className="p-0">
                <Avatar className="size-6">
                  <AvatarImage src={person.image} alt="" />
                  <AvatarFallback className="text-[10px]">
                    {initialsOf(person.name)}
                  </AvatarFallback>
                </Avatar>
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

/**
 * Per-row actions menu (trailing column). Lists get add/delete; tasks get
 * edit-or-schedule plus inline assignee and status pickers, then delete.
 */
function RowActionsMenu({
  resource,
  isList,
  meta,
  hasBar,
  onEdit,
  onAddTask,
  onRenameList,
  onAssign,
  onStatus,
  onPriority,
  onDelete,
}: {
  resource: GanttResource
  isList: boolean
  meta?: DemoTaskMeta
  hasBar: boolean
  onEdit: (taskId: string) => void
  onAddTask: (groupId?: string) => void
  onRenameList: (listId: string, title: string) => void
  onAssign: (taskId: string, name: string) => void
  onStatus: (taskId: string, status: DemoStatus) => void
  onPriority: (taskId: string, priority: DemoPriority) => void
  onDelete: (taskId: string, isList: boolean) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            aria-label={`Actions for ${resource.title}`}
            className="text-muted-foreground hover:text-foreground"
          />
        }
      >
        <MoreHorizontalIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="end" className="w-48">
        {isList ? (
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onAddTask(resource.id)}>
              <PlusIcon className="size-4" aria-hidden="true" />
              Add Task
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onRenameList(resource.id, resource.title)}
            >
              <PencilIcon className="size-4" aria-hidden="true" />
              Rename List
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(resource.id, isList)}
            >
              <Trash2Icon className="size-4" aria-hidden="true" />
              Delete List
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : (
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => onEdit(resource.id)}>
              <PencilIcon className="size-4" aria-hidden="true" />
              {hasBar ? "Edit Task" : "Schedule Task"}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <UsersIcon className="size-4" aria-hidden="true" />
                Assignee
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-48">
                {/* Multi-select: toggle each owner; no checks = unassigned. */}
                {DEMO_PEOPLE.map((person) => (
                  <DropdownMenuCheckboxItem
                    key={person.name}
                    checked={meta?.assignees?.includes(person.name) ?? false}
                    onCheckedChange={() => onAssign(resource.id, person.name)}
                  >
                    <Avatar className="size-4">
                      <AvatarImage src={person.image} alt="" />
                      <AvatarFallback className="text-[8px]">
                        {initialsOf(person.name)}
                      </AvatarFallback>
                    </Avatar>
                    {person.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                {/* size-4 wrapper so the status dot lines up with the icon-led
                    items above (Edit/Assignee) instead of sitting narrower. */}
                <span className="flex size-4 items-center justify-center">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      STATUS_META[meta?.status ?? "todo"].dot
                    )}
                  />
                </span>
                Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                <DropdownMenuRadioGroup
                  value={meta?.status ?? "todo"}
                  onValueChange={(value: string) =>
                    onStatus(resource.id, value as DemoStatus)
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      <span className="flex size-4 items-center justify-center">
                        <span
                          aria-hidden
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            STATUS_META[option.value].dot
                          )}
                        />
                      </span>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FlagIcon
                  className={cn(
                    "size-4",
                    PRIORITY_META[meta?.priority ?? "normal"].flag
                  )}
                  aria-hidden="true"
                />
                Priority
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-40">
                <DropdownMenuRadioGroup
                  value={meta?.priority ?? "normal"}
                  onValueChange={(value: string) =>
                    onPriority(resource.id, value as DemoPriority)
                  }
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      <FlagIcon
                        className={cn(
                          "size-4",
                          PRIORITY_META[option.value].flag
                        )}
                        aria-hidden="true"
                      />
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(resource.id, isList)}
            >
              <Trash2Icon className="size-4" aria-hidden="true" />
              Delete Task
            </DropdownMenuItem>
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DateField({
  id,
  value,
  disabled,
  invalid,
  onChange,
}: {
  id?: string
  value: Date
  disabled?: boolean
  invalid?: boolean
  onChange: (value: Date) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className="w-full justify-start font-normal"
          />
        }
      >
        <CalendarIcon
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        {format(value, "MMM d, yyyy")}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0!">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(next: Date | undefined) => {
            if (next) {
              onChange(next)
              setOpen(false)
            }
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/**
 * Assignee filter: the toolbar's task-management control. Each row toggles one
 * owner in or out of the tree. The trigger renders the selected owners as an
 * avatar stack (capped at 4 with a +N overflow); it reads "None" when the
 * filter hides everyone.
 */
function TaskAssigneeMenu({
  options,
  hidden,
  onToggle,
}: {
  options: { key: string; name: string; image?: string }[]
  hidden: Set<string>
  onToggle: (key: string) => void
}) {
  const selected = options.filter((option) => !hidden.has(option.key))
  const shown = selected.slice(0, 4)
  const overflow = selected.length - shown.length
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            aria-label="Filter by assignee"
            className="gap-1.5"
          />
        }
      >
        {selected.length === 0 ? (
          <>
            <UsersIcon className="size-4" aria-hidden="true" />
            <span className="text-muted-foreground">None</span>
          </>
        ) : (
          <AvatarGroup className="-space-x-1.5">
            {shown.map((option) =>
              option.image ? (
                <Avatar key={option.key} className="size-5">
                  <AvatarImage src={option.image} alt="" />
                  <AvatarFallback className="text-[9px]">
                    {initialsOf(option.name)}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <span
                  key={option.key}
                  data-slot="avatar"
                  aria-hidden
                  className="flex size-5 shrink-0 rounded-full border border-dashed border-muted-foreground/30 bg-muted"
                />
              )
            )}
            {overflow > 0 && (
              <AvatarGroupCount className="size-5 text-[10px]">
                +{overflow}
              </AvatarGroupCount>
            )}
          </AvatarGroup>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        <p className="px-2 pt-1 text-xs font-medium text-muted-foreground">
          Assignee
        </p>
        <div className="flex flex-col gap-px">
          {options.map((option) => {
            const on = !hidden.has(option.key)
            return (
              <div
                key={option.key}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={`Toggle ${option.name}`}
                onClick={() => onToggle(option.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    onToggle(option.key)
                  }
                }}
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-accent"
              >
                <Checkbox
                  checked={on}
                  aria-hidden="true"
                  tabIndex={-1}
                  className="pointer-events-none"
                />
                {option.image ? (
                  <Avatar className="size-5">
                    <AvatarImage src={option.image} alt="" />
                    <AvatarFallback className="text-[9px]">
                      {initialsOf(option.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <span
                    aria-hidden
                    className="size-5 shrink-0 rounded-full border border-dashed border-muted-foreground/40"
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">
                  {option.name}
                </span>
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
