import type { GanttResource } from "@/components/reui/gantt/gantt-types"

import type {
  DemoBar,
  DemoPriority,
  DemoStatus,
  DemoTaskMeta,
} from "../components/data"
import { subtreeIds } from "./task-tree"

/**
 * Pure operations over the gantt's two flat state trees: the timeline bars and
 * the per-task metadata map. They sit beside the task tree in task-tree.ts and
 * are written together whenever a task is created or deleted.
 *
 * Nothing here mutates its arguments; each call returns a new array or record.
 */

export type TaskMetaMap = Record<string, DemoTaskMeta>

// ── Day helpers ──

/** Midnight of the given date, as a copy. */
export function dayStart(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

/** Exclusive midnight end -> inclusive due day. */
export function dueOf(end: Date): Date {
  return dayStart(new Date(end.getTime() - 1))
}

// ── Bars ──

/**
 * Business rule: nothing may overlap a locked bar on the same task row. A
 * brand-new row (no resourceId) cannot conflict with anything.
 */
export function findLockedConflict(
  bars: DemoBar[],
  start: Date,
  end: Date,
  excludeId?: string,
  resourceId?: string
): DemoBar | undefined {
  if (resourceId === undefined) return undefined
  return bars.find(
    (bar) =>
      bar.readOnly &&
      bar.id !== excludeId &&
      bar.resourceId === resourceId &&
      bar.start < end &&
      bar.end > start
  )
}

/** The locked bar, if any, sitting anywhere in a subtree about to be deleted. */
export function findLockedInSubtree(
  bars: DemoBar[],
  taskIds: string[]
): DemoBar | undefined {
  return bars.find(
    (bar) => bar.readOnly && bar.resourceId && taskIds.includes(bar.resourceId)
  )
}

/** Latest-ending bar per task; the due column reads live bar ends. */
export function latestBarByTask(bars: DemoBar[]): Map<string, DemoBar> {
  const map = new Map<string, DemoBar>()
  for (const bar of bars) {
    if (!bar.resourceId) continue
    const current = map.get(bar.resourceId)
    if (!current || bar.end.getTime() > current.end.getTime()) {
      map.set(bar.resourceId, bar)
    }
  }
  return map
}

/**
 * Parent rollup: duration-weighted progress across the subtree's bars, keyed by
 * parent id. A parent whose subtree has no bar carrying a progress figure maps
 * to null and shows no ring; bars without a figure still count toward the
 * duration total, so unscheduled work reads as 0% done.
 */
export function rollupProgress(
  nodes: GanttResource[],
  bars: DemoBar[]
): Map<string, number | null> {
  const map = new Map<string, number | null>()
  const walk = (node: GanttResource) => {
    if (!node.children?.length) return
    const ids = new Set(subtreeIds(node).slice(1))
    let weighted = 0
    let total = 0
    let sawProgress = false
    for (const bar of bars) {
      if (!bar.resourceId || !ids.has(bar.resourceId)) continue
      const duration = Math.max(bar.end.getTime() - bar.start.getTime(), 1)
      total += duration
      if (typeof bar.progress === "number") {
        sawProgress = true
        weighted += bar.progress * duration
      }
    }
    map.set(
      node.id,
      sawProgress && total > 0 ? Math.round(weighted / total) : null
    )
    node.children.forEach(walk)
  }
  nodes.forEach(walk)
  return map
}

/** Schedule a new bar. */
export function addBar(bars: DemoBar[], bar: DemoBar): DemoBar[] {
  return [...bars, bar]
}

/** Apply the dialog's schedule fields to one bar; other bars are untouched. */
export function updateBar(
  bars: DemoBar[],
  barId: string,
  patch: Pick<DemoBar, "title" | "start" | "end" | "color">
): DemoBar[] {
  return bars.map((bar) => (bar.id === barId ? { ...bar, ...patch } : bar))
}

/** Unschedule: drop one bar and leave its task in the tree. */
export function removeBar(bars: DemoBar[], barId: string): DemoBar[] {
  return bars.filter((bar) => bar.id !== barId)
}

/** Drop every bar belonging to the given tasks. Bars with no row survive. */
export function removeBarsForTasks(
  bars: DemoBar[],
  taskIds: string[]
): DemoBar[] {
  return bars.filter(
    (bar) => !bar.resourceId || !taskIds.includes(bar.resourceId)
  )
}

// ── Task metadata ──

/** Stamp the "updated" column without touching any other field. */
export function touchMeta(
  meta: TaskMetaMap,
  taskId: string,
  at: Date
): TaskMetaMap {
  return meta[taskId]
    ? { ...meta, [taskId]: { ...meta[taskId], updated: at } }
    : meta
}

export function setMetaStatus(
  meta: TaskMetaMap,
  taskId: string,
  status: DemoStatus,
  at: Date
): TaskMetaMap {
  return meta[taskId]
    ? { ...meta, [taskId]: { ...meta[taskId], status, updated: at } }
    : meta
}

export function setMetaPriority(
  meta: TaskMetaMap,
  taskId: string,
  priority: DemoPriority,
  at: Date
): TaskMetaMap {
  return meta[taskId]
    ? { ...meta, [taskId]: { ...meta[taskId], priority, updated: at } }
    : meta
}

/** Whether the named person already owns this task. */
export function isAssigned(
  meta: TaskMetaMap,
  taskId: string,
  name: string
): boolean {
  return (meta[taskId]?.assignees ?? []).includes(name)
}

/** Toggle one owner on a task (multi-assignee); appended when added. */
export function toggleMetaAssignee(
  meta: TaskMetaMap,
  taskId: string,
  name: string,
  at: Date
): TaskMetaMap {
  const entry = meta[taskId]
  if (!entry) return meta
  const list = entry.assignees ?? []
  const added = !list.includes(name)
  return {
    ...meta,
    [taskId]: {
      ...entry,
      assignees: added ? [...list, name] : list.filter((n) => n !== name),
      updated: at,
    },
  }
}

/** The edit dialog's task fields, applied together. */
export function setMetaFields(
  meta: TaskMetaMap,
  taskId: string,
  fields: Pick<DemoTaskMeta, "status" | "priority" | "assignees">,
  at: Date
): TaskMetaMap {
  return meta[taskId]
    ? { ...meta, [taskId]: { ...meta[taskId], ...fields, updated: at } }
    : meta
}

/** Metadata for a task that did not exist before. */
export function addMeta(
  meta: TaskMetaMap,
  taskId: string,
  fields: Pick<DemoTaskMeta, "status" | "priority" | "assignees">,
  at: Date
): TaskMetaMap {
  return { ...meta, [taskId]: { ...fields, updated: at } }
}

/** Forget metadata for every task in a deleted subtree. */
export function removeMeta(meta: TaskMetaMap, taskIds: string[]): TaskMetaMap {
  const next = { ...meta }
  for (const id of taskIds) delete next[id]
  return next
}
