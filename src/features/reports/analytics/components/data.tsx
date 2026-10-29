import type { ChartConfig } from "@/components/ui/chart"

export type PeriodKey = "7d" | "30d" | "90d" | "12m"
export type MixPeriodKey = "5D" | "2W" | "1M"
export type FunnelStageKey =
  "accountCreated" | "inviteSent" | "savedReport" | "weekFourRetained"
export type SegmentKey = "organic" | "partner" | "sales" | "imported"
export type RiskState = "healthy" | "watch" | "drop_off"

export interface StageMetric {
  key: FunnelStageKey
  label: string
  color: string
}

export interface FunnelPoint {
  period: string
  accountCreated: number
  inviteSent: number
  savedReport: number
  weekFourRetained: number
}

export interface StageBreakdownRow {
  id: string
  segment: string
  cohort: string
  owner: string
  ownerAvatar: string
  ownerInitials: string
  accountCreated: number
  inviteSent: number
  savedReport: number
  weekFourRetained: number
  dropOff: string
  risk: RiskState
  updatedAt: string
}

export interface SegmentMixPoint {
  source: string
  workspaces: number
  fill: string
}

export const chartConfig = {
  accountCreated: {
    label: "Account Created",
    color: "var(--color-indigo-400)",
  },
  inviteSent: {
    label: "Invite Sent",
    color: "var(--color-indigo-500)",
  },
  savedReport: {
    label: "Saved Report",
    color: "var(--color-indigo-600)",
  },
  weekFourRetained: {
    label: "Week Four Retained",
    color: "var(--color-indigo-700)",
  },
} satisfies ChartConfig

export const mixChartConfig = {
  workspaces: { label: "Workspaces" },
  organic: { label: "Organic Trial", color: "var(--color-blue-500)" },
  partner: { label: "Partner Led", color: "var(--color-sky-500)" },
  sales: { label: "Sales Assisted", color: "var(--color-orange-500)" },
  imported: { label: "Imported", color: "var(--color-indigo-500)" },
  dormant: { label: "Dormant", color: "var(--color-slate-500)" },
} satisfies ChartConfig

export const stageMetrics: StageMetric[] = [
  {
    key: "accountCreated",
    label: "Account Created",
    color: chartConfig.accountCreated.color,
  },
  {
    key: "inviteSent",
    label: "Invite Sent",
    color: chartConfig.inviteSent.color,
  },
  {
    key: "savedReport",
    label: "Saved Report",
    color: chartConfig.savedReport.color,
  },
  {
    key: "weekFourRetained",
    label: "Week Four Retained",
    color: chartConfig.weekFourRetained.color,
  },
]

export const funnelData: Record<PeriodKey, FunnelPoint[]> = {
  "7d": [
    {
      period: "Mon",
      accountCreated: 642,
      inviteSent: 451,
      savedReport: 302,
      weekFourRetained: 168,
    },
    {
      period: "Tue",
      accountCreated: 688,
      inviteSent: 492,
      savedReport: 330,
      weekFourRetained: 181,
    },
    {
      period: "Wed",
      accountCreated: 604,
      inviteSent: 409,
      savedReport: 255,
      weekFourRetained: 139,
    },
    {
      period: "Thu",
      accountCreated: 731,
      inviteSent: 518,
      savedReport: 354,
      weekFourRetained: 196,
    },
    {
      period: "Fri",
      accountCreated: 675,
      inviteSent: 462,
      savedReport: 309,
      weekFourRetained: 174,
    },
    {
      period: "Sat",
      accountCreated: 548,
      inviteSent: 366,
      savedReport: 218,
      weekFourRetained: 126,
    },
    {
      period: "Sun",
      accountCreated: 522,
      inviteSent: 341,
      savedReport: 204,
      weekFourRetained: 118,
    },
  ],
  "30d": [
    {
      period: "W1",
      accountCreated: 2840,
      inviteSent: 1980,
      savedReport: 1264,
      weekFourRetained: 684,
    },
    {
      period: "W2",
      accountCreated: 3158,
      inviteSent: 2294,
      savedReport: 1512,
      weekFourRetained: 822,
    },
    {
      period: "W3",
      accountCreated: 2976,
      inviteSent: 2106,
      savedReport: 1298,
      weekFourRetained: 708,
    },
    {
      period: "W4",
      accountCreated: 2618,
      inviteSent: 1742,
      savedReport: 1016,
      weekFourRetained: 552,
    },
    {
      period: "W5",
      accountCreated: 3384,
      inviteSent: 2496,
      savedReport: 1664,
      weekFourRetained: 938,
    },
    {
      period: "W6",
      accountCreated: 3572,
      inviteSent: 2638,
      savedReport: 1788,
      weekFourRetained: 1014,
    },
  ],
  "90d": [
    {
      period: "Jan",
      accountCreated: 11240,
      inviteSent: 7920,
      savedReport: 5088,
      weekFourRetained: 2830,
    },
    {
      period: "Feb",
      accountCreated: 12480,
      inviteSent: 9042,
      savedReport: 5948,
      weekFourRetained: 3290,
    },
    {
      period: "Mar",
      accountCreated: 10890,
      inviteSent: 7240,
      savedReport: 4388,
      weekFourRetained: 2364,
    },
    {
      period: "Apr",
      accountCreated: 9820,
      inviteSent: 6124,
      savedReport: 3542,
      weekFourRetained: 1908,
    },
    {
      period: "May",
      accountCreated: 13180,
      inviteSent: 9690,
      savedReport: 6426,
      weekFourRetained: 3662,
    },
    {
      period: "Jun",
      accountCreated: 14260,
      inviteSent: 10648,
      savedReport: 7210,
      weekFourRetained: 4148,
    },
  ],
  "12m": [
    {
      period: "Q1",
      accountCreated: 35840,
      inviteSent: 25190,
      savedReport: 16120,
      weekFourRetained: 8932,
    },
    {
      period: "Q2",
      accountCreated: 40210,
      inviteSent: 29880,
      savedReport: 19940,
      weekFourRetained: 11380,
    },
    {
      period: "Q3",
      accountCreated: 33680,
      inviteSent: 22290,
      savedReport: 13540,
      weekFourRetained: 7328,
    },
    {
      period: "Q4",
      accountCreated: 31140,
      inviteSent: 19820,
      savedReport: 11760,
      weekFourRetained: 6412,
    },
    {
      period: "Q1 24",
      accountCreated: 38620,
      inviteSent: 28340,
      savedReport: 18860,
      weekFourRetained: 10620,
    },
    {
      period: "Q2 24",
      accountCreated: 42180,
      inviteSent: 31760,
      savedReport: 21620,
      weekFourRetained: 12344,
    },
  ],
}

export const periodChanges: Record<
  PeriodKey,
  Record<FunnelStageKey, number>
> = {
  "7d": {
    accountCreated: -3,
    inviteSent: 6,
    savedReport: -8,
    weekFourRetained: 4,
  },
  "30d": {
    accountCreated: 14,
    inviteSent: 19,
    savedReport: 11,
    weekFourRetained: -6,
  },
  "90d": {
    accountCreated: 9,
    inviteSent: 16,
    savedReport: -7,
    weekFourRetained: 12,
  },
  "12m": {
    accountCreated: 18,
    inviteSent: 22,
    savedReport: 14,
    weekFourRetained: -5,
  },
}

export const rangeOptions = [
  { label: "Last 7 days", value: "7d" },
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 12 months", value: "12m" },
]

export const segmentOptions = [
  { label: "All Segments", value: "all" },
  { label: "Organic Trial", value: "organic" },
  { label: "Partner Led", value: "partner" },
  { label: "Sales Assisted", value: "sales" },
  { label: "Imported Accounts", value: "imported" },
]

export const MIX_PERIODS = {
  "5D": { key: "5D", label: "5D" },
  "2W": { key: "2W", label: "2W" },
  "1M": { key: "1M", label: "1M" },
} as const

export const segmentMixData: Record<MixPeriodKey, SegmentMixPoint[]> = {
  "5D": [
    { source: "organic", workspaces: 318, fill: "var(--color-blue-500)" },
    { source: "partner", workspaces: 246, fill: "var(--color-sky-500)" },
    { source: "sales", workspaces: 184, fill: "var(--color-orange-500)" },
    { source: "imported", workspaces: 152, fill: "var(--color-indigo-500)" },
    { source: "dormant", workspaces: 76, fill: "var(--color-slate-500)" },
  ],
  "2W": [
    { source: "organic", workspaces: 1320, fill: "var(--color-blue-500)" },
    { source: "partner", workspaces: 948, fill: "var(--color-sky-500)" },
    { source: "sales", workspaces: 734, fill: "var(--color-orange-500)" },
    { source: "imported", workspaces: 516, fill: "var(--color-indigo-500)" },
    { source: "dormant", workspaces: 228, fill: "var(--color-slate-500)" },
  ],
  "1M": [
    { source: "organic", workspaces: 3572, fill: "var(--color-blue-500)" },
    { source: "partner", workspaces: 2638, fill: "var(--color-sky-500)" },
    { source: "sales", workspaces: 1788, fill: "var(--color-orange-500)" },
    { source: "imported", workspaces: 1014, fill: "var(--color-indigo-500)" },
    { source: "dormant", workspaces: 552, fill: "var(--color-slate-500)" },
  ],
}

export const stageBreakdownRows: StageBreakdownRow[] = [
  {
    id: "SEG-307",
    segment: "Trial workspaces over 20 seats",
    cohort: "May activation cohort",
    owner: "Mira Stone",
    ownerAvatar:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    ownerInitials: "MS",
    accountCreated: 1428,
    inviteSent: 1046,
    savedReport: 721,
    weekFourRetained: 418,
    dropOff: "42%",
    risk: "healthy",
    updatedAt: "8 min ago",
  },
  {
    id: "COH-071",
    segment: "Invite driven teams",
    cohort: "Q3 onboarding accounts",
    owner: "Leo Grant",
    ownerAvatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    ownerInitials: "LG",
    accountCreated: 1186,
    inviteSent: 902,
    savedReport: 534,
    weekFourRetained: 286,
    dropOff: "47%",
    risk: "watch",
    updatedAt: "18 min ago",
  },
  {
    id: "MET-609",
    segment: "Expansion accounts with automation",
    cohort: "Automation trial cohort",
    owner: "Nora Vale",
    ownerAvatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    ownerInitials: "NV",
    accountCreated: 964,
    inviteSent: 688,
    savedReport: 462,
    weekFourRetained: 301,
    dropOff: "35%",
    risk: "healthy",
    updatedAt: "24 min ago",
  },
  {
    id: "EVT-1842",
    segment: "Dormant admins",
    cohort: "Checklist nudge exposure",
    owner: "Sana Qureshi",
    ownerAvatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&dpr=2&q=80",
    ownerInitials: "SQ",
    accountCreated: 842,
    inviteSent: 486,
    savedReport: 248,
    weekFourRetained: 118,
    dropOff: "52%",
    risk: "drop_off",
    updatedAt: "42 min ago",
  },
  {
    id: "EXP-224",
    segment: "Template gallery default",
    cohort: "Invite copy refresh",
    owner: "Theo Park",
    ownerAvatar:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
    ownerInitials: "TP",
    accountCreated: 736,
    inviteSent: 548,
    savedReport: 388,
    weekFourRetained: 214,
    dropOff: "45%",
    risk: "watch",
    updatedAt: "1 hr ago",
  },
  {
    id: "FEA-118",
    segment: "Saved report adopters",
    cohort: "Bulk invite import",
    owner: "Kenji Tan",
    ownerAvatar:
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=96&h=96&dpr=2&q=80",
    ownerInitials: "KT",
    accountCreated: 628,
    inviteSent: 466,
    savedReport: 352,
    weekFourRetained: 226,
    dropOff: "36%",
    risk: "healthy",
    updatedAt: "2 hr ago",
  },
]
