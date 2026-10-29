import type { ReactNode } from "react"
import type { LinkProps } from "@tanstack/react-router"

import { TASKS } from "@/features/tasks/components/data"
import { NAV_MAIN, SAVED_VIEWS } from "./data"

export type SearchGroup = "Pages" | "Views" | "Tasks"

export type SearchItem = {
  id: string
  group: SearchGroup
  label: string
  /** Secondary line, e.g. the parent section or a task's project. */
  hint?: string
  icon: ReactNode
  to: LinkProps["to"]
  /** Extra text matched against but not shown. */
  keywords?: string
}

/** Every routed nav entry, parents and children alike. */
const PAGE_ITEMS: SearchItem[] = NAV_MAIN.flatMap((item) => {
  const self: SearchItem[] = item.to
    ? [
        {
          id: `page-${item.id}`,
          group: "Pages",
          label: item.label,
          icon: item.icon,
          to: item.to,
        },
      ]
    : []
  const children: SearchItem[] = (item.children ?? [])
    .filter((child) => child.to)
    .map((child) => ({
      id: `page-${child.id}`,
      group: "Pages",
      label: child.label,
      hint: item.label,
      icon: item.icon,
      to: child.to,
    }))
  return [...self, ...children]
})

const VIEW_ITEMS: SearchItem[] = SAVED_VIEWS.map((view) => ({
  id: `view-${view.id}`,
  group: "Views",
  label: view.name,
  hint: `${view.count} tasks`,
  icon: view.icon,
  to: view.to,
}))

const TASK_ITEMS: SearchItem[] = TASKS.map((task) => ({
  id: `task-${task.id}`,
  group: "Tasks",
  label: task.title,
  hint: `${task.taskKey} · ${task.project}`,
  icon: null,
  to: "/tasks/team",
  keywords: [
    task.taskKey,
    task.project,
    task.status,
    task.priority,
    task.assignee?.name ?? "",
  ].join(" "),
}))

const ALL_ITEMS: SearchItem[] = [...PAGE_ITEMS, ...VIEW_ITEMS, ...TASK_ITEMS]

/** Shown before anything is typed: the places worth jumping to. */
export const DEFAULT_ITEMS: SearchItem[] = [...PAGE_ITEMS, ...VIEW_ITEMS]

export const SEARCH_GROUP_ORDER: SearchGroup[] = ["Pages", "Views", "Tasks"]

/**
 * Case-insensitive substring match. A hit on the start of the label outranks
 * one in the middle, which outranks a hit only in the hidden keywords, so
 * "board" surfaces the Board page above a task that merely mentions it.
 */
function rank(item: SearchItem, query: string): number {
  const label = item.label.toLowerCase()
  if (label.startsWith(query)) return 0
  if (label.includes(query)) return 1
  const hint = item.hint?.toLowerCase() ?? ""
  if (hint.includes(query)) return 2
  if ((item.keywords?.toLowerCase() ?? "").includes(query)) return 3
  return -1
}

export function searchItems(query: string, limit = 12): SearchItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return DEFAULT_ITEMS

  return ALL_ITEMS.map((item) => ({ item, score: rank(item, q) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((entry) => entry.item)
}

/** Groups results while preserving the ranked order inside each group. */
export function groupItems(
  items: SearchItem[]
): { group: SearchGroup; items: SearchItem[] }[] {
  return SEARCH_GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0)
}
