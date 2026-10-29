import * as React from "react"
import { useRef, useState } from "react"
import type { ComponentProps, ReactNode } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Kanban,
  KanbanBoard as KanbanBoardPrimitive,
  KanbanColumn,
  KanbanColumnContent,
  KanbanColumnHandle,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
} from "@/components/reui/kanban"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { BOARD_COLUMNS, groupTasksByStatus } from "./data"
import { BoardTaskSheet } from "./task-sheet"
import type { BoardTaskSheetState } from "./task-sheet"
import {
  containsTask,
  countTasks,
  removeTask,
  removeToast,
  stampColumnStatuses,
  submitTask,
  submitToast,
} from "../lib/board"
import type { BoardColumns } from "../lib/board"
import { indexById } from "@/lib/data/planner/services"
import { TASK_PRIORITY_BADGES, TASK_STATUS_DOT } from "@/lib/data/planner/types"
import type { Person, Task, TaskStatus } from "@/lib/data/planner/types"
import {
  CalendarDotsIcon as CalendarDaysIcon,
  ArrowRightIcon,
  DotsSixVerticalIcon as GripVerticalIcon,
  PlusIcon,
} from "@phosphor-icons/react"

function BoardScrollArea({ children }: { children: ReactNode }) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className="relative w-full min-w-0 pb-3"
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="w-full rounded-lg transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        <ScrollAreaPrimitive.Content
          data-slot="scroll-area-content"
          className="w-max min-w-full"
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollAreaPrimitive.Scrollbar
        data-slot="scroll-area-scrollbar"
        data-orientation="horizontal"
        orientation="horizontal"
        className="flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent"
      >
        <ScrollAreaPrimitive.Thumb
          data-slot="scroll-area-thumb"
          className="relative flex-1 rounded-full bg-foreground/15"
        />
      </ScrollAreaPrimitive.Scrollbar>
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function completionRingColor(rate: number) {
  if (rate >= 75) return "text-emerald-500"
  if (rate >= 40) return "text-amber-500"
  return "text-rose-500"
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <Badge variant="outline" className="gap-1.5">
      <span
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          TASK_STATUS_DOT[status]
        )}
        aria-hidden="true"
      />
      {status}
    </Badge>
  )
}

function DueBadge({ dueLabel }: { dueLabel: string }) {
  return (
    <Badge variant="outline" className="gap-1.5 bg-background font-normal">
      <CalendarDaysIcon
        className="size-3.5 text-muted-foreground"
        aria-hidden="true"
      />
      <span className="tabular-nums">{dueLabel}</span>
    </Badge>
  )
}

function CompletionRing({ rate }: { rate: number | null }) {
  if (rate === null) {
    return (
      <span
        className="flex items-center gap-1.5 text-xs text-muted-foreground tabular-nums"
        aria-label="Completion not available"
      >
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border">
          -
        </span>
      </span>
    )
  }

  const radius = 9
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (rate / 100) * circumference

  return (
    <span
      className="flex items-center gap-1.5"
      aria-label={`${rate}% complete`}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn("size-5 shrink-0", completionRingColor(rate))}
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          className="stroke-border"
          strokeWidth="2.5"
        />
        <circle
          cx="12"
          cy="12"
          r={radius}
          fill="none"
          className="stroke-current"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 12 12)"
        />
      </svg>
      <span className="text-xs text-foreground tabular-nums">{rate}%</span>
    </span>
  )
}

function TaskTitleAffordance({
  title,
  isDone,
  onOpen,
}: {
  title: string
  isDone?: boolean
  onOpen?: () => void
}) {
  return (
    <span className="group/task-title inline-flex max-w-full min-w-0 items-start gap-1">
      <button
        type="button"
        data-slot="kanban-task-title"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          onOpen?.()
        }}
        className={cn(
          "line-clamp-2 cursor-pointer rounded-sm py-0.25 text-left transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none",
          isDone && "text-muted-foreground line-through"
        )}
        aria-label={`Open ${title}`}
      >
        {title}
      </button>
      <ArrowRightIcon
        className="mt-1 size-3 shrink-0 -translate-x-1 opacity-0 transition-all group-hover/task-title:translate-x-0 group-hover/task-title:opacity-100"
        aria-hidden="true"
      />
    </span>
  )
}

interface TaskCardProps extends Omit<
  ComponentProps<typeof KanbanItem>,
  "value" | "children"
> {
  task: Task
  assignee?: Person
  asHandle?: boolean
  isOverlay?: boolean
  isDone?: boolean
  onOpen?: () => void
}

function TaskCard({
  task,
  assignee,
  asHandle,
  isOverlay,
  isDone,
  onOpen,
  ...props
}: TaskCardProps) {
  const card = (
    <Card
      size="sm"
      className={cn(
        "bg-card p-0 shadow-xs transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-sm",
        isOverlay && "shadow-lg",
        isDone && "bg-muted/40"
      )}
    >
      <CardContent className="flex min-h-[8.75rem] flex-col p-3">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <Badge variant={TASK_PRIORITY_BADGES[task.priority]}>
              {task.priority}
            </Badge>
            <span className="truncate text-xs text-muted-foreground tabular-nums">
              {task.id}
            </span>
            {task.tags[0] ? (
              <span className="text-xs text-muted-foreground tabular-nums">
                {task.tags[0]}
              </span>
            ) : null}
          </div>
          <StatusBadge status={task.status} />
        </div>

        <h3 className="mt-3 min-h-10 text-sm leading-5 font-medium">
          <TaskTitleAffordance
            title={task.title}
            isDone={isDone}
            onOpen={onOpen}
          />
        </h3>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src={assignee?.image} alt={assignee?.name} />
              <AvatarFallback>{assignee?.initials}</AvatarFallback>
            </Avatar>
            <span className="truncate text-xs font-medium text-muted-foreground">
              {assignee?.name}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <DueBadge dueLabel={task.dueDate} />
            <CompletionRing rate={task.progress} />
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <KanbanItem value={task.id} {...props}>
      {asHandle && !isOverlay ? (
        <KanbanItemHandle className="block">{card}</KanbanItemHandle>
      ) : (
        card
      )}
    </KanbanItem>
  )
}

interface StatusColumnProps extends Omit<
  ComponentProps<typeof KanbanColumn>,
  "children"
> {
  tasks: Task[]
  people: Record<string, Person>
  isOverlay?: boolean
  onOpenTask?: (task: Task) => void
}

function StatusColumn({
  value,
  tasks,
  people,
  isOverlay,
  onOpenTask,
  ...props
}: StatusColumnProps) {
  const column = BOARD_COLUMNS[String(value)] ?? BOARD_COLUMNS.Backlog
  const isDone = String(value) === "Done"

  return (
    <KanbanColumn
      value={String(value)}
      className="w-[17.5rem] min-w-[17.5rem]"
      {...props}
    >
      <section
        className={cn(
          "flex min-h-[16rem] flex-col gap-2 rounded-lg border p-2.5 transition-colors",
          column.surfaceClassName,
          column.borderClassName,
          isOverlay && "shadow-lg"
        )}
        aria-label={`${column.title} tasks`}
      >
        <div className="flex h-8 items-center gap-2 px-0.5">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{column.title}</h3>
            <Badge variant="outline" className="bg-background">
              {tasks.length}
            </Badge>
          </div>
          <KanbanColumnHandle
            className="opacity-100!"
            render={({ className, ...handleProps }) => (
              <Button
                {...handleProps}
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`Move ${column.title} column`}
                className={cn(
                  "ml-auto cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing",
                  className
                )}
              >
                <GripVerticalIcon aria-hidden="true" />
              </Button>
            )}
          />
        </div>

        <KanbanColumnContent value={String(value)} className="min-h-28 gap-2">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                assignee={people[task.assigneeId]}
                asHandle={!isOverlay}
                isOverlay={isOverlay}
                isDone={isDone}
                onOpen={onOpenTask ? () => onOpenTask(task) : undefined}
              />
            ))
          ) : (
            <div
              className={cn(
                "rounded-lg border border-dashed border-border/70 bg-background/55 px-3 py-6 text-center text-xs text-muted-foreground transition-colors",
                column.addClassName
              )}
            >
              No tasks
            </div>
          )}
        </KanbanColumnContent>
      </section>
    </KanbanColumn>
  )
}

interface KanbanBoardProps {
  tasks: Task[]
  team: Person[]
}

export function KanbanBoard({ tasks, team }: KanbanBoardProps) {
  const people = indexById(team)
  const [columns, setColumns] = useState<BoardColumns>(() =>
    groupTasksByStatus(tasks)
  )
  const columnsRef = useRef(columns)
  React.useLayoutEffect(() => {
    columnsRef.current = columns
  })
  const [sheet, setSheet] = useState<BoardTaskSheetState | null>(null)

  const totalTasks = countTasks(columns)

  // Moving a card between columns is a status change: re-stamp each task's status
  // to its column so the card's status chip stays coherent with its position.
  const handleValueChange = (next: BoardColumns) => {
    setColumns(stampColumnStatuses(next))
  }

  // ---- Sheet + CRUD ------------------------------------------------------
  const openCreate = () => setSheet({ mode: "create" })
  const openView = (task: Task) => setSheet({ mode: "view", task })
  const startEdit = () =>
    setSheet((prev) => (prev?.task ? { mode: "edit", task: prev.task } : prev))
  const cancelEdit = () =>
    setSheet((prev) => (prev?.task ? { mode: "view", task: prev.task } : null))
  const closeSheet = (open: boolean) => {
    if (!open) setSheet(null)
  }

  // Create (new card) or update (existing) from the task sheet. Moving a task to
  // a new status relocates it to the head of the target column.
  const handleSubmitTask = (task: Task) => {
    const exists = containsTask(columnsRef.current, task.id)
    setColumns((prev) => submitTask(prev, task))
    const copy = submitToast(task, exists)
    toast.success(copy.title, { description: copy.description })
  }

  const performDeleteTask = (task: Task) => {
    setColumns((prev) => removeTask(prev, task.id))
    setSheet(null)
    const copy = removeToast(task)
    toast.success(copy.title, { description: copy.description })
  }

  return (
    <div className="w-full min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {totalTasks} task{totalTasks === 1 ? "" : "s"} across{" "}
          {Object.keys(columns).length} columns
        </p>
        <Button type="button" onClick={openCreate}>
          <PlusIcon className="size-4" aria-hidden="true" />
          New task
        </Button>
      </div>
      <Kanban
        value={columns}
        onValueChange={handleValueChange}
        getItemValue={(item) => item.id}
        className="w-full"
      >
        <BoardScrollArea>
          <KanbanBoardPrimitive className="grid min-w-max auto-cols-[17.5rem] grid-flow-col grid-cols-none gap-4.5 pb-2">
            {Object.entries(columns).map(([columnId, columnTasks]) => (
              <StatusColumn
                key={columnId}
                value={columnId}
                tasks={columnTasks}
                people={people}
                onOpenTask={openView}
              />
            ))}
          </KanbanBoardPrimitive>
        </BoardScrollArea>

        <KanbanOverlay>
          {({ value, variant }) => {
            if (variant === "column") {
              const columnTasks = columns[String(value)] ?? []

              return (
                <StatusColumn
                  value={String(value)}
                  tasks={columnTasks}
                  people={people}
                  isOverlay
                />
              )
            }

            const taskColumn = Object.entries(columns).find(([, columnTasks]) =>
              columnTasks.some((item) => item.id === value)
            )
            const task = taskColumn?.[1].find((item) => item.id === value)

            if (!task) {
              return null
            }

            return (
              <TaskCard
                task={task}
                assignee={people[task.assigneeId]}
                isOverlay
                isDone={taskColumn?.[0] === "Done"}
              />
            )
          }}
        </KanbanOverlay>
      </Kanban>

      <BoardTaskSheet
        state={sheet}
        team={team}
        onOpenChange={closeSheet}
        onSubmit={handleSubmitTask}
        onEdit={startEdit}
        onCancelEdit={cancelEdit}
        onDelete={performDeleteTask}
      />
    </div>
  )
}
