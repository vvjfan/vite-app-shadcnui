import type { BadgeProps } from "@/components/reui/badge"

// ── Shared planner domain ──
// Canonical types for the Tasks / Planner / Scheduler app. ReUI blocks are adapted
// to CARRY this data (the block design is unchanged). One source of truth so Tasks,
// Kanban, Calendar, Projects, Team and Reports all speak the same shapes.

export type TaskStatus = "Backlog" | "Todo" | "In Progress" | "Review" | "Done"
export type TaskPriority = "Low" | "Medium" | "High" | "Urgent"
export type ProjectStatus =
  "Planning" | "On Track" | "At Risk" | "Delayed" | "Completed"
export type MemberStatus = "online" | "away" | "offline"

// ── People ──

export interface Person {
  id: string
  name: string
  initials: string
  image: string
  role: string
  email: string
  status: MemberStatus
  /** Assigned open tasks - drives the workload meter. */
  workload: number
  tasksAssigned: number
  tasksCompleted: number
}

// ── Tasks ──

export interface Subtask {
  id: string
  title: string
  status: TaskStatus
  assigneeId: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  projectId: string
  /** Display date, e.g. "Aug 12". */
  dueDate: string
  tags: string[]
  progress: number
  subtasks: Subtask[]
}

// ── Projects ──

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  progress: number
  /** Team member ids. */
  memberIds: string[]
  leadId: string
  taskCount: number
  completedCount: number
  dueDate: string
}

// ── Badge maps (semantic Badge variants, never raw colors) ──

export const TASK_STATUS_DOT: Record<TaskStatus, string> = {
  Backlog: "bg-muted-foreground",
  Todo: "bg-info",
  "In Progress": "bg-primary",
  Review: "bg-warning",
  Done: "bg-success",
}

export const TASK_PRIORITY_BADGES: Record<TaskPriority, BadgeProps["variant"]> =
  {
    Low: "secondary",
    Medium: "info-light",
    High: "warning-light",
    Urgent: "destructive-light",
  }

// ── Ordered column definition for the Kanban board ──

export const TASK_STATUS_ORDER: TaskStatus[] = [
  "Backlog",
  "Todo",
  "In Progress",
  "Review",
  "Done",
]
