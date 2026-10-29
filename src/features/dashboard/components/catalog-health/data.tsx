import type { ReactNode } from "react"

import type { ChartConfig } from "@/components/ui/chart"
import {
  CheckCircleIcon as CircleCheckIcon,
  ClockIcon,
  WarningIcon as TriangleAlertIcon,
  TargetIcon,
} from "@phosphor-icons/react"

export const PERIODS = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
] as const

export type PeriodKey = (typeof PERIODS)[number]["value"]

export type MetricTone = "positive" | "negative" | "warning" | "neutral"

export type PerformanceMetric = {
  id: string
  label: string
  unit: string
  value: string
  delta: string
  tone: MetricTone
  summary: string
  icon: ReactNode
  chartData: { marker: string; value: number }[]
}

export const chartConfig = {
  trend: {
    label: "Trend",
    color: "var(--color-muted-foreground)",
  },
} satisfies ChartConfig

function trend(values: number[], prefix = "P") {
  return values.map((value, index) => ({
    marker: `${prefix}${index + 1}`,
    value,
  }))
}

// Labels + icons shared across periods: the task-delivery KPIs the overview surfaces
// (completed, in progress, overdue, on-time rate).
const metricDetails = {
  completed: {
    id: "completed",
    label: "Tasks Completed",
    unit: "tasks",
    icon: (
      <CircleCheckIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    ),
  },
  inProgress: {
    id: "inProgress",
    label: "In Progress",
    unit: "tasks",
    icon: (
      <ClockIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    ),
  },
  overdue: {
    id: "overdue",
    label: "Overdue",
    unit: "tasks",
    icon: (
      <TriangleAlertIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    ),
  },
  onTime: {
    id: "onTime",
    label: "On-Time Rate",
    unit: "%",
    icon: (
      <TargetIcon
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    ),
  },
} satisfies Record<
  string,
  Pick<PerformanceMetric, "id" | "label" | "unit" | "icon">
>

export const performanceMetrics: Record<PeriodKey, PerformanceMetric[]> = {
  week: [
    {
      ...metricDetails.completed,
      value: "128",
      delta: "+8.2%",
      tone: "positive",
      summary: "Above target",
      chartData: trend(
        [43, 51, 47, 55, 52, 59, 49, 64, 58, 57, 72, 50, 76, 79, 57, 69],
        "D"
      ),
    },
    {
      ...metricDetails.inProgress,
      value: "34",
      delta: "+5.1%",
      tone: "neutral",
      summary: "On pace",
      chartData: trend(
        [28, 25, 31, 27, 36, 32, 43, 37, 48, 45, 58, 55, 61, 75, 73, 52],
        "D"
      ),
    },
    {
      ...metricDetails.overdue,
      value: "6",
      delta: "-2",
      tone: "warning",
      summary: "Needs attention",
      chartData: trend(
        [18, 26, 24, 31, 29, 38, 34, 44, 40, 47, 43, 52, 49, 58, 54, 63],
        "D"
      ),
    },
    {
      ...metricDetails.onTime,
      value: "92%",
      delta: "+1.4%",
      tone: "positive",
      summary: "Healthy",
      chartData: trend(
        [72, 49, 63, 42, 45, 67, 50, 47, 69, 65, 44, 55, 38, 49, 58, 42],
        "D"
      ),
    },
  ],
  month: [
    {
      ...metricDetails.completed,
      value: "540",
      delta: "+12.8%",
      tone: "positive",
      summary: "Ahead of target",
      chartData: trend(
        [38, 46, 42, 54, 48, 61, 52, 67, 59, 74, 63, 71, 66, 80],
        "W"
      ),
    },
    {
      ...metricDetails.inProgress,
      value: "41",
      delta: "+9.4%",
      tone: "neutral",
      summary: "Steady flow",
      chartData: trend(
        [30, 39, 35, 48, 42, 53, 47, 61, 55, 68, 59, 70, 64, 76],
        "W"
      ),
    },
    {
      ...metricDetails.overdue,
      value: "9",
      delta: "-3",
      tone: "warning",
      summary: "Trending down",
      chartData: trend(
        [22, 31, 27, 40, 34, 47, 41, 55, 48, 62, 54, 68, 60, 74],
        "W"
      ),
    },
    {
      ...metricDetails.onTime,
      value: "89%",
      delta: "-2.1%",
      tone: "warning",
      summary: "Watch review stage",
      chartData: trend(
        [70, 62, 67, 54, 59, 49, 55, 43, 50, 39, 45, 34, 41, 31],
        "W"
      ),
    },
  ],
  year: [
    {
      ...metricDetails.completed,
      value: "6.2K",
      delta: "+18.4%",
      tone: "positive",
      summary: "Strong year",
      chartData: trend([32, 45, 38, 56, 47, 63, 54, 72, 61, 78, 69, 86], "M"),
    },
    {
      ...metricDetails.inProgress,
      value: "38",
      delta: "+11.2%",
      tone: "neutral",
      summary: "Consistent",
      chartData: trend([34, 43, 39, 51, 45, 59, 52, 66, 58, 73, 64, 79], "M"),
    },
    {
      ...metricDetails.overdue,
      value: "12",
      delta: "-5",
      tone: "warning",
      summary: "Improving",
      chartData: trend([28, 37, 33, 46, 40, 54, 47, 62, 55, 70, 63, 77], "M"),
    },
    {
      ...metricDetails.onTime,
      value: "91%",
      delta: "+0.6%",
      tone: "positive",
      summary: "Steady",
      chartData: trend([74, 64, 70, 57, 63, 50, 56, 43, 49, 38, 44, 33], "M"),
    },
  ],
}

export const performanceSummaries: Record<PeriodKey, string> = {
  week: "128 tasks were completed this week, 8% above target across all projects.",
  month: "540 tasks completed this month, tracking 13% ahead of the target.",
  year: "6.2K tasks completed year-to-date, up 18% on last year.",
}
