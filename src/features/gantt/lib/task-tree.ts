import type { GanttResource } from "@/components/reui/gantt/gantt-types"

import type { DemoTaskMeta } from "../components/data"

/**
 * Pure helpers over the gantt's task tree. A node is either a list (depth 0), a
 * parent task or a leaf task; children live on `node.children`.
 *
 * Every function returns a NEW tree and never mutates the nodes it was given,
 * so the seed export stays intact across a session of edits.
 */

/** Sentinel key for the "no owner" row in the assignee filter. */
export const UNASSIGNED = "unassigned"

/** Ids of the node and every descendant. */
export function subtreeIds(node: GanttResource): string[] {
  return [node.id, ...(node.children ?? []).flatMap(subtreeIds)]
}

/** Ids of `id` and its descendants, or an empty list when it is not in the tree. */
export function findSubtreeIds(nodes: GanttResource[], id: string): string[] {
  for (const node of nodes) {
    if (node.id === id) return subtreeIds(node)
    if (node.children) {
      const found = findSubtreeIds(node.children, id)
      if (found.length > 0) return found
    }
  }
  return []
}

/** Depth-first title lookup; undefined when the id is not in the tree. */
export function findTaskTitle(
  nodes: GanttResource[],
  id: string
): string | undefined {
  for (const node of nodes) {
    if (node.id === id) return node.title
    if (node.children?.length) {
      const found = findTaskTitle(node.children, id)
      if (found !== undefined) return found
    }
  }
  return undefined
}

/** Rename one node at any depth. An unknown id leaves the tree as it was. */
export function renameTask(
  nodes: GanttResource[],
  id: string,
  title: string
): GanttResource[] {
  return nodes.map((node) => {
    if (node.id === id) return { ...node, title }
    if (!node.children?.length) return node
    return { ...node, children: renameTask(node.children, id, title) }
  })
}

/** Remove one node and, with it, its whole subtree. */
export function removeTask(
  nodes: GanttResource[],
  id: string
): GanttResource[] {
  return nodes.flatMap((node) => {
    if (node.id === id) return []
    if (!node.children?.length) return [node]
    return [{ ...node, children: removeTask(node.children, id) }]
  })
}

/** Append an empty list to the root level. */
export function appendList(
  nodes: GanttResource[],
  id: string,
  title: string
): GanttResource[] {
  return [...nodes, { id, title, children: [] }]
}

/**
 * Append a task to a ROOT-LEVEL list. Only top-level nodes are candidates, so a
 * groupId naming a nested parent (or a list that is gone) leaves the tree as it
 * was; the task's meta and bar are still written by the caller.
 */
export function appendTaskToList(
  nodes: GanttResource[],
  listId: string,
  taskId: string,
  title: string
): GanttResource[] {
  return nodes.map((group) =>
    group.id === listId
      ? {
          ...group,
          children: [...(group.children ?? []), { id: taskId, title }],
        }
      : group
  )
}

/**
 * Assignee filter over the task tree: a leaf survives when any of its owners is
 * shown (or it is unassigned and Unassigned is shown); a list or parent survives
 * only while it still holds a visible descendant.
 */
export function filterTasksByAssignee(
  nodes: GanttResource[],
  taskMeta: Record<string, DemoTaskMeta>,
  hidden: Set<string>
): GanttResource[] {
  if (hidden.size === 0) return nodes
  const selfVisible = (id: string) => {
    const owners = taskMeta[id]?.assignees ?? []
    return owners.length === 0
      ? !hidden.has(UNASSIGNED)
      : owners.some((name) => !hidden.has(name))
  }
  return nodes.flatMap((node) => {
    if (node.children?.length) {
      const children = filterTasksByAssignee(node.children, taskMeta, hidden)
      // keep a parent when a descendant matches, or the parent itself is a task
      // assigned to a shown owner (lists have no owners, so only children count)
      const ownMatch = taskMeta[node.id] !== undefined && selfVisible(node.id)
      return children.length || ownMatch ? [{ ...node, children }] : []
    }
    return selfVisible(node.id) ? [node] : []
  })
}
