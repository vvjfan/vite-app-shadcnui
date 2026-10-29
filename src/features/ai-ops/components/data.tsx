import type { ReactNode } from "react"
import type { BadgeProps } from "@/components/reui/badge"

import type { ChartConfig } from "@/components/ui/chart"
import {
  TrendUpIcon as TrendingUp,
  TrendDownIcon as TrendingDown,
  DatabaseIcon,
  BrainIcon,
  ShieldCheckIcon,
  SparkleIcon as SparklesIcon,
  PackageIcon,
  StackIcon as LayersIcon,
} from "@phosphor-icons/react"

export type DashboardPeriodKey = "7d" | "30d" | "90d"

export interface ProviderMetric {
  title: string
  valueBold: string
  valueFaint: string
  badge: string
  badgeIcon?: ReactNode
  variant: BadgeProps["variant"]
  description: string
  comparisonLabel: string
  comparisonValue: string
  icon: ReactNode
}

export type FailoverStatus = "completed" | "active" | "pending"

export type FailoverFeedbackAssignee = {
  id: string
  name: string
  initials: string
  avatar?: string
}

export type FailoverFeedback = {
  priority: "High" | "Medium" | "Low"
  status: "Healthy" | "Watching" | "Blocked"
  surface: string
  title: string
  description: string
  comments: number
  due: string
  assignees: FailoverFeedbackAssignee[]
  overflowCount: number
}

export type FailoverStep = {
  id: number
  title: string
  status: FailoverStatus
  feedback: FailoverFeedback
  owner: {
    name: string
    role: string
    avatar?: string
  }
}

export type RoutingRuleStatus = "healthy" | "at_risk" | "paused" | "blocked"
export type RoutingRuleKind = "primary" | "fallback" | "guardrail" | "batch"
export type RoutingRuleScope = "Support" | "Finance" | "Safety" | "Platform"

export interface IRoutingRule {
  id: string
  reference: string
  updated: string
  rule: string
  provider: string
  providerLogo: ReactNode
  category: string
  kind: RoutingRuleKind
  scope: RoutingRuleScope
  dailyTokens: number
  latency: string
  status: RoutingRuleStatus
}

const trendUpIcon = <TrendingUp className="size-3.5" aria-hidden="true" />

const trendDownIcon = <TrendingDown className="size-3.5" aria-hidden="true" />

export const providerMetrics: ProviderMetric[] = [
  {
    title: "Provider Health",
    valueBold: "99.94",
    valueFaint: "%",
    badge: "+0.41%",
    badgeIcon: trendUpIcon,
    variant: "success-light",
    description: "4 providers healthy at 09:45.",
    comparisonLabel: "Failover ready",
    comparisonValue: "2 pools",
    icon: <DatabaseIcon aria-hidden="true" />,
  },
  {
    title: "Token Volume",
    valueBold: "48.2",
    valueFaint: "M",
    badge: "+12.6%",
    badgeIcon: trendUpIcon,
    variant: "info-light",
    description: "Support Reply Draft used 2.4M today.",
    comparisonLabel: "Daily budget",
    comparisonValue: "61%",
    icon: <BrainIcon aria-hidden="true" />,
  },
  {
    title: "Safety Drift",
    valueBold: "3",
    valueFaint: " policies",
    badge: "-18.0%",
    badgeIcon: trendDownIcon,
    variant: "warning-light",
    description: "PII Redaction review due by 14:00.",
    comparisonLabel: "Review SLA",
    comparisonValue: "6h",
    icon: <ShieldCheckIcon aria-hidden="true" />,
  },
]

export const activityRangeOptions: {
  label: string
  value: DashboardPeriodKey
}[] = [
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "Last 90 Days", value: "90d" },
]

export const tokenActivityChartConfig = {
  input: {
    label: "Input Tokens",
    color: "var(--color-blue-600)",
  },
  output: {
    label: "Output Tokens",
    color: "var(--color-orange-500)",
  },
  blocked: {
    label: "Blocked Calls",
    color: "var(--color-slate-600)",
  },
} satisfies ChartConfig

export const tokenActivityData: Record<
  DashboardPeriodKey,
  { time: string; input: number; output: number; blocked: number }[]
> = {
  "7d": [
    { time: "Thu", input: 32, output: 14, blocked: 3 },
    { time: "Fri", input: 38, output: 16, blocked: 4 },
    { time: "Sat", input: 29, output: 11, blocked: 2 },
    { time: "Sun", input: 25, output: 10, blocked: 2 },
    { time: "Mon", input: 41, output: 18, blocked: 5 },
    { time: "Tue", input: 46, output: 20, blocked: 6 },
    { time: "Wed", input: 48, output: 22, blocked: 4 },
  ],
  "30d": [
    { time: "May 13", input: 112, output: 48, blocked: 9 },
    { time: "May 18", input: 128, output: 54, blocked: 11 },
    { time: "May 23", input: 146, output: 62, blocked: 13 },
    { time: "May 28", input: 139, output: 58, blocked: 10 },
    { time: "Jun 2", input: 164, output: 71, blocked: 12 },
    { time: "Jun 7", input: 181, output: 79, blocked: 15 },
    { time: "Jun 11", input: 196, output: 84, blocked: 14 },
  ],
  "90d": [
    { time: "Mar", input: 430, output: 184, blocked: 35 },
    { time: "Mar 15", input: 486, output: 206, blocked: 41 },
    { time: "Apr", input: 522, output: 224, blocked: 38 },
    { time: "Apr 15", input: 548, output: 238, blocked: 44 },
    { time: "May", input: 612, output: 264, blocked: 49 },
    { time: "May 15", input: 668, output: 291, blocked: 53 },
    { time: "Jun", input: 721, output: 318, blocked: 58 },
  ],
}

export const failoverSteps: FailoverStep[] = [
  {
    id: 1,
    title: "Primary Provider",
    status: "completed",
    feedback: {
      priority: "High",
      status: "Healthy",
      surface: "OpenRoute Primary",
      title: "Primary pool serving 78 percent",
      description: "p95 latency held at 910ms through 09:45.",
      comments: 5,
      due: "11:00",
      assignees: [
        {
          id: "leo-grant",
          name: "Leo Grant",
          initials: "LG",
          avatar:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
        },
        {
          id: "kenji-tan",
          name: "Kenji Tan",
          initials: "KT",
          avatar:
            "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=96&h=96&dpr=2&q=80",
        },
      ],
      overflowCount: 1,
    },
    owner: {
      name: "Leo Grant",
      role: "Platform engineer",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    },
  },
  {
    id: 2,
    title: "Fallback Routing",
    status: "active",
    feedback: {
      priority: "Medium",
      status: "Watching",
      surface: "Northstar Claude Pool",
      title: "Long context summaries rerouted",
      description: "ROUTE-318 shifted 18 percent at 09:20.",
      comments: 3,
      due: "Today",
      assignees: [
        {
          id: "mira-stone",
          name: "Mira Stone",
          initials: "MS",
          avatar:
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
        },
        {
          id: "theo-park",
          name: "Theo Park",
          initials: "TP",
          avatar:
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
        },
      ],
      overflowCount: 2,
    },
    owner: {
      name: "Mira Stone",
      role: "AI product operator",
      avatar:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    },
  },
  {
    id: 3,
    title: "Guardrail Runner",
    status: "pending",
    feedback: {
      priority: "Low",
      status: "Blocked",
      surface: "Local Guardrail Runner",
      title: "Medical refusal guard pending",
      description: "SAFE-0914 needs 6 examples before 16:00.",
      comments: 2,
      due: "16:00",
      assignees: [
        {
          id: "nora-vale",
          name: "Nora Vale",
          initials: "NV",
          avatar:
            "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
        },
        {
          id: "elijah-morgan",
          name: "Elijah Morgan",
          initials: "EM",
        },
      ],
      overflowCount: 0,
    },
    owner: {
      name: "Nora Vale",
      role: "Safety reviewer",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    },
  },
]

const providerIcons = {
  openroute: <DatabaseIcon aria-hidden="true" />,
  northstar: <SparklesIcon aria-hidden="true" />,
  vector: <PackageIcon aria-hidden="true" />,
  guardrail: <ShieldCheckIcon aria-hidden="true" />,
  batch: <LayersIcon aria-hidden="true" />,
} satisfies Record<string, ReactNode>

export const ROUTING_RULES: IRoutingRule[] = [
  {
    id: "rule-001",
    reference: "ROUTE-318",
    updated: "Jun 11, 2026",
    rule: "Long context summaries",
    provider: "Northstar Claude Pool",
    providerLogo: providerIcons.northstar,
    category: "Long Context",
    kind: "fallback",
    scope: "Support",
    dailyTokens: 18400000,
    latency: "1.8s p95",
    status: "healthy",
  },
  {
    id: "rule-002",
    reference: "ROUTE-319",
    updated: "Jun 11, 2026",
    rule: "High risk requests",
    provider: "Local Guardrail Runner",
    providerLogo: providerIcons.guardrail,
    category: "Safety",
    kind: "guardrail",
    scope: "Safety",
    dailyTokens: 4200000,
    latency: "620ms p95",
    status: "at_risk",
  },
  {
    id: "rule-003",
    reference: "ROUTE-320",
    updated: "Jun 10, 2026",
    rule: "Support reply drafts",
    provider: "OpenRoute Primary",
    providerLogo: providerIcons.openroute,
    category: "Drafting",
    kind: "primary",
    scope: "Support",
    dailyTokens: 2410000,
    latency: "910ms p95",
    status: "healthy",
  },
  {
    id: "rule-004",
    reference: "ROUTE-321",
    updated: "Jun 10, 2026",
    rule: "Invoice variance explainer",
    provider: "VectorEdge Small",
    providerLogo: providerIcons.vector,
    category: "Finance",
    kind: "primary",
    scope: "Finance",
    dailyTokens: 1830000,
    latency: "740ms p95",
    status: "healthy",
  },
  {
    id: "rule-005",
    reference: "ROUTE-322",
    updated: "Jun 9, 2026",
    rule: "Nightly account summary",
    provider: "Batch Summarizer Fleet",
    providerLogo: providerIcons.batch,
    category: "Batch",
    kind: "batch",
    scope: "Platform",
    dailyTokens: 840000,
    latency: "8.4s p95",
    status: "paused",
  },
  {
    id: "rule-006",
    reference: "ROUTE-323",
    updated: "Jun 9, 2026",
    rule: "Payment action review",
    provider: "Local Guardrail Runner",
    providerLogo: providerIcons.guardrail,
    category: "Safety",
    kind: "guardrail",
    scope: "Finance",
    dailyTokens: 1260000,
    latency: "680ms p95",
    status: "blocked",
  },
  {
    id: "rule-007",
    reference: "ROUTE-324",
    updated: "Jun 8, 2026",
    rule: "Renewal risk summary",
    provider: "Northstar Claude Pool",
    providerLogo: providerIcons.northstar,
    category: "Long Context",
    kind: "fallback",
    scope: "Support",
    dailyTokens: 3200000,
    latency: "2.1s p95",
    status: "healthy",
  },
]
