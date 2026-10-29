import { format } from "date-fns"

import type { BadgeProps } from "@/components/reui/badge"
import type { ChartConfig } from "@/components/ui/chart"

/**
 * Dashboard demo data: the task-queue domain plus the completion + per-project chart
 * series. Self-contained - the dashboard owns its own mock data. Swap ORDERS for a real
 * query in the dashboard's lib/services.ts when a backend replaces the mock. (Internal
 * type/field names are kept generic; the fields carry task data.)
 */

// ── Task domain ──

export type OrderStatus = "Done" | "In Progress" | "Blocked" | "Review"
export type OrderChannel = "Product" | "Platform" | "Growth" | "Ops"

export interface OrderRecord {
  id: string
  /** assignee name */
  customer: string
  initials: string
  image: string
  /** task title */
  product: string
  /** task reference */
  sku: string
  /** project */
  channel: OrderChannel
  /** sub-tasks */
  quantity: number
  date: string
  /** estimate, in hours */
  amount: number
  /** progress stage */
  stage: string
  progress: number
  status: OrderStatus
}

export const STATUS_BADGES: Record<OrderStatus, BadgeProps["variant"]> = {
  Done: "success-light",
  "In Progress": "warning-light",
  Blocked: "destructive-light",
  Review: "info-light",
}

export const STATUS_DOT: Record<OrderStatus, string> = {
  Done: "bg-success",
  "In Progress": "bg-warning",
  Blocked: "bg-destructive",
  Review: "bg-info",
}

const AVATAR = {
  mira: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
  leo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
  nora: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
  theo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
  sana: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
  alex: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80",
} as const

/**
 * Local midnight today, resolved once at module load so every seed date below
 * is an offset from the same anchor. Built the way the calendar panel builds
 * its own, which is what keeps the two views agreeing on which day is today.
 */
const TODAY = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

/**
 * A seed date `offset` days from today, so the queue never reads as stale. The
 * padded day is carried over from the original seed: order-form's tests pin it
 * as a known mismatch with the unpadded date a created task is stamped with.
 */
function relativeDate(offset: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offset)
  return format(d, "MMM dd, yyyy")
}

// Simulated task queue.
export const ORDERS: OrderRecord[] = [
  {
    id: "TASK-2048",
    customer: "Mira Stone",
    initials: "MS",
    image: AVATAR.mira,
    product: "Ship responsive nav bar",
    sku: "WEB-142",
    channel: "Product",
    quantity: 3,
    date: relativeDate(0),
    amount: 8,
    stage: "Merged",
    progress: 100,
    status: "Done",
  },
  {
    id: "TASK-2049",
    customer: "Leo Grant",
    initials: "LG",
    image: AVATAR.leo,
    product: "Rework onboarding flow",
    sku: "PLT-88",
    channel: "Platform",
    quantity: 2,
    date: relativeDate(0),
    amount: 12,
    stage: "In progress",
    progress: 62,
    status: "In Progress",
  },
  {
    id: "TASK-2050",
    customer: "Nora Vale",
    initials: "NV",
    image: AVATAR.nora,
    product: "Audit permission checks",
    sku: "SEC-30",
    channel: "Growth",
    quantity: 1,
    date: relativeDate(-1),
    amount: 6,
    stage: "In review",
    progress: 40,
    status: "Review",
  },
  {
    id: "TASK-2051",
    customer: "Theo Park",
    initials: "TP",
    image: AVATAR.theo,
    product: "Migrate design tokens",
    sku: "WEB-150",
    channel: "Product",
    quantity: 6,
    date: relativeDate(-1),
    amount: 4,
    stage: "Merged",
    progress: 100,
    status: "Done",
  },
  {
    id: "TASK-2052",
    customer: "Sana Qureshi",
    initials: "SQ",
    image: AVATAR.sana,
    product: "Fix flaky e2e suite",
    sku: "OPS-12",
    channel: "Ops",
    quantity: 2,
    date: relativeDate(-2),
    amount: 16,
    stage: "Blocked",
    progress: 35,
    status: "Blocked",
  },
  {
    id: "TASK-2053",
    customer: "Alex Johnson",
    initials: "AJ",
    image: AVATAR.alex,
    product: "Add usage analytics events",
    sku: "PLT-91",
    channel: "Platform",
    quantity: 4,
    date: relativeDate(-2),
    amount: 20,
    stage: "In progress",
    progress: 84,
    status: "In Progress",
  },
]

export type Period = "month" | "quarter"

// Types (internal field names kept; the series now carry task counts).
export interface RevenuePoint {
  label: string
  /** completed */
  online: number
  /** in progress */
  store: number
  /** total active */
  revenue: number
  target: number
  /** on-time completions */
  grossProfit: number
}

export interface ChannelPoint {
  label: string
  /** Product */
  direct: number
  /** Platform */
  partners: number
  /** Growth */
  marketplace: number
}

// Chart Series (completed + in-progress sum to the day's total active tasks).
export const MONTH_REVENUE: RevenuePoint[] = [
  {
    label: "Jul 13",
    online: 17,
    store: 11,
    revenue: 28,
    target: 30,
    grossProfit: 15,
  },
  {
    label: "Jul 14",
    online: 22,
    store: 14,
    revenue: 36,
    target: 31,
    grossProfit: 20,
  },
  {
    label: "Jul 15",
    online: 19,
    store: 13,
    revenue: 32,
    target: 28,
    grossProfit: 17,
  },
  {
    label: "Jul 16",
    online: 20,
    store: 12,
    revenue: 32,
    target: 29,
    grossProfit: 18,
  },
]

export const QUARTER_REVENUE: RevenuePoint[] = [
  {
    label: "Jun 01",
    online: 31,
    store: 21,
    revenue: 52,
    target: 50,
    grossProfit: 28,
  },
  {
    label: "Jun 08",
    online: 41,
    store: 27,
    revenue: 68,
    target: 62,
    grossProfit: 38,
  },
  {
    label: "Jun 15",
    online: 36,
    store: 25,
    revenue: 61,
    target: 64,
    grossProfit: 33,
  },
  {
    label: "Jun 22",
    online: 48,
    store: 30,
    revenue: 78,
    target: 70,
    grossProfit: 44,
  },
  {
    label: "Jun 30",
    online: 42,
    store: 28,
    revenue: 70,
    target: 60,
    grossProfit: 39,
  },
  {
    label: "Jul 16",
    online: 45,
    store: 30,
    revenue: 75,
    target: 67,
    grossProfit: 42,
  },
]

export const CHANNEL_VOLUME: ChannelPoint[] = [
  { label: "Fri", direct: 12, partners: 6, marketplace: 8 },
  { label: "Sat", direct: 16, partners: 8, marketplace: 11 },
  { label: "Sun", direct: 14, partners: 7, marketplace: 9 },
  { label: "Mon", direct: 18, partners: 12, marketplace: 16 },
]

// Chart Config (labels render in the tooltips / legends).
export const REVENUE_CHART_CONFIG = {
  online: {
    label: "Completed",
    color: "var(--color-sky-500)",
  },
  store: {
    label: "In Progress",
    color: "var(--color-violet-500)",
  },
  target: {
    label: "Target",
    color: "var(--color-slate-500)",
  },
} satisfies ChartConfig

export const CHANNEL_CHART_CONFIG = {
  direct: {
    label: "Product",
    color: "var(--color-cyan-500)",
  },
  partners: {
    label: "Platform",
    color: "var(--color-violet-500)",
  },
  marketplace: {
    label: "Growth",
    color: "var(--color-amber-400)",
  },
} satisfies ChartConfig
