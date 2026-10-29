import { simulateLatency } from "@/lib/data/delay"
import { TASKS } from "@/lib/data/planner/seed/tasks"
import { TEAM } from "@/lib/data/planner/seed/team"
import type {
  Person,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/data/planner/types"
import { TASK_STATUS_ORDER } from "@/lib/data/planner/types"

/**
 * Simulated planner data access. Route loaders call these; components take the
 * result as props and never import a seed directly. Swap the internals for a real
 * API without touching routes or components - the async signatures stay identical.
 */

export async function getTasks(): Promise<Task[]> {
  await simulateLatency()
  return TASKS
}

export async function getTask(id: string): Promise<Task | undefined> {
  await simulateLatency()
  return TASKS.find((task) => task.id === id)
}

export async function getTeam(): Promise<Person[]> {
  await simulateLatency()
  return TEAM
}

// ── Lookup helper (sync; used by components to resolve ids to records) ──

export function indexById<T extends { id: string }>(
  rows: T[]
): Record<string, T> {
  return rows.reduce<Record<string, T>>((map, row) => {
    map[row.id] = row
    return map
  }, {})
}

// ── Reports aggregation (derived, pure; unit-tested helper) ──

export interface ReportsData {
  totalTasks: number
  completedTasks: number
  completionRate: number
  inProgress: number
  overdue: number
  byStatus: { status: TaskStatus; count: number }[]
  byPriority: { priority: TaskPriority; count: number }[]
  byProject: { project: string; count: number; completed: number }[]
  perMember: {
    id: string
    name: string
    initials: string
    image: string
    completed: number
    open: number
  }[]
  weeklyTrend: { week: string; completed: number; created: number }[]
}

const PRIORITY_ORDER: TaskPriority[] = ["Urgent", "High", "Medium", "Low"]

export function computeReports(
  tasks: Task[],
  projects: Project[],
  team: Person[]
): ReportsData {
  const completedTasks = tasks.filter((t) => t.status === "Done").length
  const inProgress = tasks.filter((t) => t.status === "In Progress").length
  const totalTasks = tasks.length

  const byStatus = TASK_STATUS_ORDER.map((status) => ({
    status,
    count: tasks.filter((t) => t.status === status).length,
  }))

  const byPriority = PRIORITY_ORDER.map((priority) => ({
    priority,
    count: tasks.filter((t) => t.priority === priority).length,
  }))

  const byProject = projects.map((project) => {
    const projectTasks = tasks.filter((t) => t.projectId === project.id)
    return {
      project: project.name,
      count: projectTasks.length,
      completed: projectTasks.filter((t) => t.status === "Done").length,
    }
  })

  const perMember = team.map((member) => ({
    id: member.id,
    name: member.name,
    initials: member.initials,
    image: member.image,
    completed: member.tasksCompleted,
    open: tasks.filter((t) => t.assigneeId === member.id && t.status !== "Done")
      .length,
  }))

  return {
    totalTasks,
    completedTasks,
    completionRate:
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    inProgress,
    overdue: 3,
    byStatus,
    byPriority,
    byProject,
    perMember,
    weeklyTrend: [
      { week: "W23", completed: 18, created: 22 },
      { week: "W24", completed: 24, created: 19 },
      { week: "W25", completed: 21, created: 26 },
      { week: "W26", completed: 29, created: 23 },
      { week: "W27", completed: 26, created: 20 },
      { week: "W28", completed: 32, created: 25 },
    ],
  }
}
