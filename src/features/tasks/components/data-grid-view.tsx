import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DataGrid } from "@/components/reui/data-grid/data-grid"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { createFilter, Filters } from "@/components/reui/filters"
import type { Filter, FilterFieldConfig } from "@/components/reui/filters"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import type {
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
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
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  applyFiltersToData,
  countCompletedTasks,
  getActiveFilters,
  getTaskTabCount,
  getVisibleTasks,
  hasVisibleFilterControls,
} from "../lib/filter-tasks"
import {
  compareTasksBySorting,
  getOrderingFromSorting,
  getSortingState,
  paginateTasks,
} from "../lib/sort-tasks"
import type { OrderDirection } from "../lib/sort-tasks"
import {
  deleteTask,
  moveTaskToReview,
  setSubIssueCompletion,
  setTaskCompletion,
  taskExists,
  upsertTask,
} from "../lib/task-mutations"
import {
  buildTaskRows,
  getDefaultExpandedTaskIds,
  toggleExpandedTaskId,
} from "../lib/task-rows"
import type { ExpandedTaskIds } from "../lib/task-rows"
import {
  createTaskColumns,
  PriorityBadge,
  ProjectBadge,
  StatusBadge,
} from "./columns"
import type { TaskAction } from "./columns"
import {
  ASSIGNEES,
  DISPLAY_PROPERTIES,
  ORDERING_OPTIONS,
  TASK_PRIORITY_ORDER,
  TASK_STATUS_ORDER,
  TASK_TABS,
  TASKS,
} from "./data"
import type {
  ISubIssue,
  ITask,
  TaskOrdering,
  TaskPriority,
  TaskProperty,
  TaskStatus,
  TaskTab,
} from "./data"
import { TaskSheet } from "./task-sheet"
import type { TaskSheetState } from "./task-sheet"
import {
  PlusIcon,
  FunnelIcon as FilterIcon,
  FunnelXIcon,
  FloppyDiskIcon as SaveIcon,
  SlidersIcon as Settings2Icon,
  CheckIcon,
} from "@phosphor-icons/react"

type TableDensity = "compact" | "comfortable"

type ToastTone = "success" | "neutral"

const toneStyles: Record<ToastTone, { dot: string }> = {
  success: { dot: "bg-emerald-500" },
  neutral: { dot: "bg-sky-500" },
}

const TABLE_DENSITY_OPTIONS: { value: TableDensity; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
]

const ORDER_DIRECTION_OPTIONS: { value: OrderDirection; label: string }[] = [
  { value: "asc", label: "Asc" },
  { value: "desc", label: "Desc" },
]

function showTaskToast({
  tone,
  title,
  description,
  primaryLabel,
}: {
  tone: ToastTone
  title: string
  description: string
  primaryLabel: string
}) {
  toast.custom((id) => (
    <div className="flex w-full max-w-[356px] flex-col gap-3 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1 flex size-2 shrink-0 rounded-full",
            toneStyles[tone].dot
          )}
          aria-hidden="true"
        />
        <div className="flex flex-1 flex-col gap-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="xs"
          variant="outline"
          className="flex-1"
          onClick={() => toast.dismiss(id)}
        >
          {primaryLabel}
        </Button>
        <Button size="xs" className="flex-1" onClick={() => toast.dismiss(id)}>
          Dismiss
        </Button>
      </div>
    </div>
  ))
}

function createDefaultTaskFilters(): Filter[] {
  return [createFilter("title", "contains", [""])]
}

function renderSelectedCount(values: unknown[]) {
  if (values.length === 0) return "Select..."
  if (values.length > 1) return `${values.length} selected`
  return null
}

export function TaskManagementGridView() {
  const [tasks, setTasks] = useState<ITask[]>(TASKS)
  const tasksRef = useRef(tasks)
  React.useLayoutEffect(() => {
    tasksRef.current = tasks
  })
  const [taskSheet, setTaskSheet] = useState<TaskSheetState | null>(null)
  const [taskToDelete, setTaskToDelete] = useState<ITask | null>(null)
  const [activeTab, setActiveTab] = useState<TaskTab>("all")
  const [ordering, setOrdering] = useState<TaskOrdering>("priority")
  const [orderDirection, setOrderDirection] = useState<OrderDirection>("desc")
  const [orderCompletedByRecency, setOrderCompletedByRecency] = useState(true)
  const [showCompleted, setShowCompleted] = useState(true)
  const [showSubIssues, setShowSubIssues] = useState(true)
  const [tableDensity, setTableDensity] = useState<TableDensity>("compact")
  const [columnsResizable, setColumnsResizable] = useState(true)
  const [columnsMovable, setColumnsMovable] = useState(true)
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "priority", desc: true },
  ])
  const [filters, setFilters] = useState<Filter[]>(createDefaultTaskFilters)
  const [expandedTaskIds, setExpandedTaskIds] = useState<ExpandedTaskIds>(() =>
    getDefaultExpandedTaskIds(buildTaskRows(TASKS, true))
  )
  const [visibleProperties, setVisibleProperties] = useState<
    Record<TaskProperty, boolean>
  >({
    status: true,
    assignee: true,
    priority: true,
    project: true,
    dueDate: false,
    estimate: false,
    updated: false,
  })

  useEffect(() => {
    setSorting(getSortingState(ordering, orderDirection))
  }, [orderDirection, ordering])

  useEffect(() => {
    if (showSubIssues) return
    setExpandedTaskIds({})
  }, [showSubIssues])

  useEffect(() => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }, [activeTab, filters, showCompleted, tasks])

  const handleTaskCompletionChange = useCallback(
    (taskId: string, completed: boolean) => {
      setTasks((current) => setTaskCompletion(current, taskId, completed))
    },
    []
  )

  const handleTaskAction = useCallback((action: TaskAction, task: ITask) => {
    if (action === "open" || action === "side-panel") {
      setTaskSheet({ mode: "view", task })
      return
    }

    if (action === "review") {
      setTasks((current) => moveTaskToReview(current, task.id))
      showTaskToast({
        tone: "success",
        title: "Moved to review",
        description: `${task.title} is ready for the next review step.`,
        primaryLabel: "Looks good",
      })
      return
    }

    // archive → confirm, then delete
    setTaskToDelete(task)
  }, [])

  const handleSubIssueCompletionChange = useCallback(
    (taskId: string, subIssueId: string, completed: boolean) => {
      setTasks((current) =>
        setSubIssueCompletion(current, taskId, subIssueId, completed)
      )
    },
    []
  )

  const handleSubIssueAction = useCallback(
    (action: TaskAction, task: ITask, subIssue: ISubIssue) => {
      if (action === "open") {
        showTaskToast({
          tone: "neutral",
          title: "Open sub-task",
          description: `Wire ${subIssue.title} to its nested detail route or drawer.`,
          primaryLabel: "Dismiss",
        })
        return
      }

      if (action === "side-panel") {
        showTaskToast({
          tone: "neutral",
          title: "Open side panel",
          description: `Connect ${subIssue.title} to your inline review drawer inside ${task.title}.`,
          primaryLabel: "Dismiss",
        })
        return
      }

      if (action === "review") {
        showTaskToast({
          tone: "success",
          title: "Move sub-task to review",
          description: `${subIssue.title} is ready for the next review step.`,
          primaryLabel: "Done",
        })
        return
      }

      showTaskToast({
        tone: "neutral",
        title: "Archive sub-task",
        description:
          "Use an alert dialog before wiring destructive archive behavior for nested work items.",
        primaryLabel: "Dismiss",
      })
    },
    []
  )

  const handleToggleTaskExpanded = useCallback((taskId: string) => {
    setExpandedTaskIds((current) => toggleExpandedTaskId(current, taskId))
  }, [])

  const columnVisibility = useMemo<VisibilityState>(
    () => ({
      status: visibleProperties.status,
      assignee: visibleProperties.assignee,
      priority: visibleProperties.priority,
      project: visibleProperties.project,
      dueDate: visibleProperties.dueDate,
      estimate: visibleProperties.estimate,
      updated: visibleProperties.updated,
    }),
    [visibleProperties]
  )

  const assigneeOptions = useMemo(
    () => [
      ...ASSIGNEES.map((person) => ({
        value: person.name,
        label: person.name,
      })),
      {
        value: "Unassigned",
        label: "Unassigned",
      },
    ],
    []
  )

  const projectOptions = useMemo(() => {
    return [...new Set(tasks.map((task) => task.project))]
      .sort()
      .map((project) => ({ value: project, label: project }))
  }, [tasks])

  const filterFields = useMemo<FilterFieldConfig[]>(
    () => [
      {
        key: "title",
        label: "Task",
        type: "text",
        className: "w-36",
        placeholder: "Search tasks...",
      },
      {
        key: "assignee",
        label: "Assignee",
        type: "select",
        searchable: true,
        className: "w-[180px]",
        options: assigneeOptions,
        customValueRenderer: (values, options) => {
          const state = renderSelectedCount(values)
          if (state) return state

          const option = options.find((item) => item.value === values[0])
          if (!option) return String(values[0])

          return option.label
        },
      },
      {
        key: "project",
        label: "Project",
        type: "select",
        searchable: true,
        className: "w-[180px]",
        options: projectOptions,
        customValueRenderer: (values) => {
          const state = renderSelectedCount(values)
          if (state) return state

          return <ProjectBadge project={String(values[0])} />
        },
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        searchable: false,
        className: "w-[150px]",
        options: TASK_STATUS_ORDER.map((status) => ({
          value: status,
          label: status,
        })),
        customValueRenderer: (values) => {
          const state = renderSelectedCount(values)
          if (state) return state

          return <StatusBadge status={values[0] as TaskStatus} />
        },
      },
      {
        key: "priority",
        label: "Priority",
        type: "select",
        searchable: false,
        className: "w-[130px]",
        options: TASK_PRIORITY_ORDER.map((priority) => ({
          value: priority,
          label: priority,
        })),
        customValueRenderer: (values) => {
          const state = renderSelectedCount(values)
          if (state) return state

          return <PriorityBadge priority={values[0] as TaskPriority} />
        },
      },
    ],
    [assigneeOptions, projectOptions]
  )

  const activeFilters = useMemo(() => getActiveFilters(filters), [filters])
  const hasVisibleFilters = useMemo(
    () => hasVisibleFilterControls(filters),
    [filters]
  )

  const filteredTasks = useMemo(
    () => applyFiltersToData(tasks, filters),
    [tasks, filters]
  )

  const visibleTasks = useMemo(
    () => getVisibleTasks(filteredTasks, activeTab, showCompleted),
    [activeTab, filteredTasks, showCompleted]
  )

  const completedTaskCount = useMemo(
    () => countCompletedTasks(filteredTasks),
    [filteredTasks]
  )

  const hiddenCompletedCount =
    !showCompleted && activeTab === "all" ? completedTaskCount : 0

  const emptyMessage = useMemo(() => {
    if (visibleTasks.length > 0) return undefined

    if (hiddenCompletedCount > 0) {
      return `All remaining tasks are completed. Turn on Include completed tasks to show ${hiddenCompletedCount} hidden ${hiddenCompletedCount === 1 ? "task" : "tasks"}.`
    }

    return "No tasks match this workspace view. Clear filters or switch tabs."
  }, [hiddenCompletedCount, visibleTasks.length])

  const settingsProperties = useMemo(() => DISPLAY_PROPERTIES, [])

  const columns = useMemo(
    () =>
      createTaskColumns({
        onCompletionChange: handleTaskCompletionChange,
        onAction: handleTaskAction,
        onSubIssueCompletionChange: handleSubIssueCompletionChange,
        onSubIssueAction: handleSubIssueAction,
        showSubIssues,
        expandedTaskIds,
        onToggleTaskExpanded: handleToggleTaskExpanded,
      }),
    [
      expandedTaskIds,
      handleSubIssueAction,
      handleSubIssueCompletionChange,
      handleTaskAction,
      handleTaskCompletionChange,
      handleToggleTaskExpanded,
      showSubIssues,
    ]
  )

  const handleSortingChange = useCallback((nextSorting: SortingState) => {
    setSorting(nextSorting)

    const next = getOrderingFromSorting(nextSorting)
    if (!next) return

    setOrdering(next.ordering)
    setOrderDirection(next.orderDirection)
  }, [])

  const sortedTasks = useMemo(
    () =>
      [...visibleTasks].sort((taskA, taskB) =>
        compareTasksBySorting(taskA, taskB, sorting, orderCompletedByRecency)
      ),
    [orderCompletedByRecency, sorting, visibleTasks]
  )

  const pagedTasks = useMemo(
    () => paginateTasks(sortedTasks, pagination.pageIndex, pagination.pageSize),
    [pagination.pageIndex, pagination.pageSize, sortedTasks]
  )

  const pagedParentTaskRows = useMemo(
    () => buildTaskRows(pagedTasks, showSubIssues),
    [pagedTasks, showSubIssues]
  )

  const pagedTaskRows = useMemo(
    () => buildTaskRows(pagedTasks, showSubIssues, expandedTaskIds),
    [expandedTaskIds, pagedTasks, showSubIssues]
  )

  useEffect(() => {
    if (!showSubIssues) {
      setExpandedTaskIds({})
      return
    }

    setExpandedTaskIds((current) =>
      Object.keys(current).length > 0
        ? current
        : getDefaultExpandedTaskIds(pagedParentTaskRows)
    )
  }, [pagedParentTaskRows, showSubIssues])

  const table = useReactTable({
    columns,
    data: pagedTaskRows,
    pageCount: Math.ceil(sortedTasks.length / pagination.pageSize),
    getRowId: (row) => row.id,
    state: {
      pagination,
      sorting,
      columnVisibility,
    },
    onPaginationChange: setPagination,
    onSortingChange: (updater) => {
      const nextSorting =
        typeof updater === "function" ? updater(sorting) : updater
      handleSortingChange(nextSorting)
    },
    manualSorting: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  function toggleProperty(property: TaskProperty) {
    setVisibleProperties((current) => ({
      ...current,
      [property]: !current[property],
    }))
  }

  function handleSaveView() {
    const filtersLabel =
      activeFilters.length > 0
        ? `Saved ${activeFilters.length} active ${
            activeFilters.length === 1 ? "filter" : "filters"
          }, visible columns, ${ordering} ${orderDirection} sorting, ${tableDensity} density, completed work ${showCompleted ? "included" : "hidden"}, and sub-tasks ${showSubIssues ? "enabled" : "collapsed"} in this task queue.`
        : `Saved the default task queue with the current visible columns, ${ordering} ${orderDirection} sorting, ${tableDensity} density, completed work ${showCompleted ? "included" : "hidden"}, and sub-tasks ${showSubIssues ? "enabled" : "collapsed"}.`

    showTaskToast({
      tone: "success",
      title: "Task view saved",
      description: filtersLabel,
      primaryLabel: "Done",
    })
  }

  // Create (new task) or update (existing) from the task sheet.
  const handleSubmitTask = useCallback((task: ITask) => {
    const exists = taskExists(tasksRef.current, task.id)
    setTasks((current) => upsertTask(current, task))
    showTaskToast({
      tone: "success",
      title: exists ? "Task updated" : "Task created",
      description: exists
        ? `${task.taskKey} "${task.title}" was updated.`
        : `${task.taskKey} "${task.title}" was added to the top of your queue.`,
      primaryLabel: "Done",
    })
  }, [])

  const performDeleteTask = useCallback((task: ITask) => {
    setTasks((current) => deleteTask(current, task.id))
    setTaskSheet(null)
    showTaskToast({
      tone: "neutral",
      title: "Task deleted",
      description: `${task.taskKey} "${task.title}" was removed from the queue.`,
      primaryLabel: "Done",
    })
  }, [])

  const openCreateTask = useCallback(() => setTaskSheet({ mode: "create" }), [])

  const startEditTask = useCallback(
    () =>
      setTaskSheet((prev) =>
        prev?.task ? { mode: "edit", task: prev.task } : prev
      ),
    []
  )

  const cancelEditTask = useCallback(
    () =>
      setTaskSheet((prev) =>
        prev?.task ? { mode: "view", task: prev.task } : null
      ),
    []
  )

  const closeTaskSheet = useCallback((open: boolean) => {
    if (!open) setTaskSheet(null)
  }, [])

  return (
    <>
      <DataGrid
        table={table}
        recordCount={visibleTasks.length}
        emptyMessage={emptyMessage}
        tableLayout={{
          columnsResizable,
          columnsMovable,
          headerSticky: true,
          dense: tableDensity === "compact",
        }}
      >
        <Frame dense variant="default" spacing="sm" className="w-full">
          <FrameHeader className="flex-row items-center justify-between gap-3">
            <div className="flex flex-col gap-px">
              <FrameTitle className="text-balance">Task Delivery</FrameTitle>
              <FrameDescription className="text-xs text-pretty">
                {visibleTasks.length} task
                {visibleTasks.length === 1 ? "" : "s"}
                {hiddenCompletedCount > 0
                  ? ` / ${hiddenCompletedCount} hidden`
                  : ""}
                {showSubIssues ? " / Sub-tasks on" : ""}
              </FrameDescription>
            </div>
            <Button type="button" onClick={openCreateTask}>
              <PlusIcon className="size-4" aria-hidden="true" />
              New task
            </Button>
          </FrameHeader>

          <FramePanel className="p-0 shadow-none!">
            {/* Tabs */}
            <div className="px-(--frame-panel-header-px) pt-(--frame-panel-header-py)">
              <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as TaskTab)}
              >
                <TabsList variant="line" className="gap-5">
                  {TASK_TABS.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-2 px-0 pb-3 text-sm"
                    >
                      <span>{tab.label}</span>
                      <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">
                        {getTaskTabCount(
                          filteredTasks,
                          tab.value,
                          showCompleted
                        )}
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            <Separator />

            {/* Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-(--frame-panel-header-px) py-(--frame-panel-header-py)">
              <Filters
                className="max-w-full min-w-0 overflow-x-auto"
                filters={filters}
                fields={filterFields}
                onChange={setFilters}
                trigger={
                  <Button type="button" variant="outline" aria-label="Filters">
                    <FilterIcon className="size-4" aria-hidden />
                    Filters
                  </Button>
                }
              />

              <div className="flex items-center justify-end gap-2">
                {hasVisibleFilters ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setFilters(createDefaultTaskFilters())}
                    >
                      <FunnelXIcon className="size-4" aria-hidden="true" />
                      Clear
                    </Button>
                    {activeFilters.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleSaveView}
                      >
                        <SaveIcon className="size-4" aria-hidden="true" />
                        Save view
                      </Button>
                    ) : null}
                  </>
                ) : null}
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button type="button" variant="outline">
                        <Settings2Icon className="size-4" aria-hidden="true" />
                        Settings
                      </Button>
                    }
                  />
                  <PopoverContent align="end" className="w-[320px] p-0">
                    <FieldGroup className="gap-3 px-3.5 py-3">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Queue
                        </div>
                        <div className="space-y-0">
                          <Field
                            orientation="horizontal"
                            className="min-h-9 items-center justify-between gap-3"
                          >
                            <FieldLabel className="text-sm font-normal">
                              Ordering
                            </FieldLabel>
                            <Select
                              value={ordering}
                              onValueChange={(value) =>
                                setOrdering(value as TaskOrdering)
                              }
                              items={ORDERING_OPTIONS}
                            >
                              <SelectTrigger
                                size="sm"
                                className="w-[132px] shrink-0"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectGroup>
                                  {ORDERING_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>

                          <Field
                            orientation="horizontal"
                            className="min-h-9 items-center justify-between gap-3"
                          >
                            <FieldLabel className="text-sm font-normal">
                              Direction
                            </FieldLabel>
                            <ToggleGroup
                              multiple={false}
                              value={[orderDirection]}
                              onValueChange={(value) => {
                                const nextValue = value[0]

                                if (nextValue) {
                                  setOrderDirection(nextValue as OrderDirection)
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="ml-auto w-[132px] shrink-0 justify-end"
                            >
                              {ORDER_DIRECTION_OPTIONS.map((option) => (
                                <ToggleGroupItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </Field>

                          <Field
                            orientation="horizontal"
                            className="min-h-9 items-center justify-between gap-3"
                          >
                            <FieldLabel className="text-sm font-normal">
                              Include completed
                            </FieldLabel>
                            <Switch
                              size="sm"
                              checked={showCompleted}
                              onCheckedChange={setShowCompleted}
                            />
                          </Field>

                          <Field
                            orientation="horizontal"
                            className="min-h-9 items-center justify-between gap-3"
                            data-disabled={!showCompleted || undefined}
                          >
                            <FieldLabel className="text-sm font-normal">
                              Done by recency
                            </FieldLabel>
                            <Switch
                              size="sm"
                              checked={orderCompletedByRecency}
                              disabled={!showCompleted}
                              onCheckedChange={setOrderCompletedByRecency}
                            />
                          </Field>

                          <Field
                            orientation="horizontal"
                            className="min-h-9 items-center justify-between gap-3"
                          >
                            <FieldLabel className="text-sm font-normal">
                              Show sub-tasks
                            </FieldLabel>
                            <Switch
                              size="sm"
                              checked={showSubIssues}
                              onCheckedChange={setShowSubIssues}
                            />
                          </Field>
                        </div>
                      </div>

                      <FieldSeparator className="-mx-3.5" />

                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Table
                        </div>
                        <div className="space-y-0">
                          <Field
                            orientation="horizontal"
                            className="min-h-9 items-center justify-between gap-3"
                          >
                            <FieldLabel className="text-sm font-normal">
                              Density
                            </FieldLabel>
                            <Select
                              value={tableDensity}
                              onValueChange={(value) =>
                                setTableDensity(value as TableDensity)
                              }
                              items={TABLE_DENSITY_OPTIONS}
                            >
                              <SelectTrigger
                                size="sm"
                                className="w-[132px] shrink-0"
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectGroup>
                                  {TABLE_DENSITY_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              </SelectContent>
                            </Select>
                          </Field>

                          <Field
                            orientation="horizontal"
                            className="min-h-9 items-center justify-between gap-3"
                          >
                            <FieldLabel className="text-sm font-normal">
                              Resizable columns
                            </FieldLabel>
                            <Switch
                              size="sm"
                              checked={columnsResizable}
                              onCheckedChange={setColumnsResizable}
                            />
                          </Field>

                          <Field
                            orientation="horizontal"
                            className="min-h-9 items-center justify-between gap-3"
                          >
                            <FieldLabel className="text-sm font-normal">
                              Movable columns
                            </FieldLabel>
                            <Switch
                              size="sm"
                              checked={columnsMovable}
                              onCheckedChange={setColumnsMovable}
                            />
                          </Field>
                        </div>
                      </div>

                      <FieldSeparator className="-mx-3.5" />

                      <div className="space-y-2.5">
                        <div className="text-xs font-medium text-muted-foreground">
                          Display properties
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {settingsProperties.map((property) => {
                            const active = visibleProperties[property.key]

                            return (
                              <Button
                                key={property.key}
                                type="button"
                                size="xs"
                                variant={active ? "secondary" : "outline"}
                                className={cn(
                                  "rounded-full",
                                  active && "border-foreground/10"
                                )}
                                onClick={() => toggleProperty(property.key)}
                              >
                                {active ? (
                                  <CheckIcon aria-hidden="true" />
                                ) : null}
                                {property.label}
                              </Button>
                            )
                          })}
                        </div>

                        {!showCompleted && hiddenCompletedCount > 0 ? (
                          <p className="pt-0.5 text-xs text-muted-foreground">
                            {hiddenCompletedCount} completed{" "}
                            {hiddenCompletedCount === 1
                              ? "task is"
                              : "tasks are"}{" "}
                            currently hidden from All tasks.
                          </p>
                        ) : null}
                      </div>
                    </FieldGroup>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            <DataGridScrollArea className="[&_tr>*:first-child]:ps-(--frame-panel-header-px) [&_tr>*:last-child]:pe-(--frame-panel-header-px)">
              <DataGridTable />
            </DataGridScrollArea>

            <Separator />

            <FrameFooter>
              <DataGridPagination />
            </FrameFooter>
          </FramePanel>
        </Frame>
      </DataGrid>

      <TaskSheet
        state={taskSheet}
        projects={projectOptions.map((option) => option.value)}
        onOpenChange={closeTaskSheet}
        onSubmit={handleSubmitTask}
        onEdit={startEditTask}
        onCancelEdit={cancelEditTask}
        onDelete={performDeleteTask}
      />

      <AlertDialog
        open={taskToDelete !== null}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{taskToDelete?.title}&rdquo; will be removed from the
              queue. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (taskToDelete) performDeleteTask(taskToDelete)
                setTaskToDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
