import type { ReactNode } from "react"
import type { LinkProps } from "@tanstack/react-router"
import {
  HouseIcon as HomeIcon,
  ListChecksIcon as ListTodoIcon,
  ChartBarIcon as ChartColumnIcon,
  GearIcon as SettingsIcon,
  UserCircleIcon as CircleUserIcon,
  SquaresFourIcon as LayoutDashboardIcon,
  CalendarDotsIcon as CalendarDaysIcon,
  PulseIcon as ActivityIcon,
} from "@phosphor-icons/react"

// ── Left Sidebar Types ──

export type NavChild = {
  id: string
  label: string
  to?: LinkProps["to"]
  // Match the route exactly (for index children whose path prefixes siblings).
  exact?: boolean
  isActive?: boolean
}

export type NavItem = {
  id: string
  label: string
  icon: ReactNode
  to?: LinkProps["to"]
  badge?: string | number
  isActive?: boolean
  children?: NavChild[]
  // Opens the settings dialog instead of navigating to a route.
  dialog?: boolean
}

export type Workspace = {
  id: string
  name: string
  tier?: string
  imageUrl?: string
  /** A mark from WORKSPACE_LOGOS, used when there is no imageUrl. */
  logoId?: string
  avatarClassName?: string
}

// ── Saved View Type ──

export type SavedView = {
  id: string
  name: string
  // Opens the matching task view.
  to: LinkProps["to"]
  icon: ReactNode
  count: number
  // Badge variant for the count.
  countVariant:
    "info-light" | "success-light" | "warning-light" | "destructive-light"
}

// ── Saved Views ──

export const SAVED_VIEWS: SavedView[] = [
  {
    id: "sv1",
    name: "Assigned to me",
    to: "/tasks/my",
    icon: <CircleUserIcon aria-hidden="true" />,
    count: 12,
    countVariant: "success-light",
  },
  {
    id: "sv2",
    name: "Active sprint",
    to: "/tasks/board",
    icon: <LayoutDashboardIcon aria-hidden="true" />,
    count: 24,
    countVariant: "info-light",
  },
  {
    id: "sv3",
    name: "Week ahead",
    to: "/tasks/calendar",
    icon: <CalendarDaysIcon aria-hidden="true" />,
    count: 8,
    countVariant: "warning-light",
  },
  {
    id: "sv4",
    name: "Recent activity",
    to: "/reports/activity",
    icon: <ActivityIcon aria-hidden="true" />,
    count: 4,
    countVariant: "destructive-light",
  },
]

// ── Workspaces ──

export const WORKSPACES: Workspace[] = [
  {
    id: "claude",
    name: "Claude",
    tier: "Enterprise",
    imageUrl: "https://github.com/claude.png",
    avatarClassName: "",
  },
  {
    id: "vercel",
    name: "Vercel",
    tier: "Pro",
    imageUrl: "https://github.com/vercel.png",
    avatarClassName: "",
  },
  {
    id: "openai",
    name: "OpenAI",
    tier: "Team",
    imageUrl: "https://github.com/openai.png",
    avatarClassName: "",
  },
]

// ── Left Nav Main ──

export const NAV_MAIN: NavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon aria-hidden="true" />,
    to: "/home",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: <ListTodoIcon aria-hidden="true" />,
    to: "/tasks",
    children: [
      { id: "tasks-my", label: "My tasks", to: "/tasks/my" },
      { id: "tasks-team", label: "Team tasks", to: "/tasks/team" },
      { id: "tasks-board", label: "Board", to: "/tasks/board" },
      { id: "tasks-calendar", label: "Calendar", to: "/tasks/calendar" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: <ChartColumnIcon aria-hidden="true" />,
    to: "/reports",
    children: [
      { id: "reports-activity", label: "Activity", to: "/reports/activity" },
      { id: "reports-analytics", label: "Analytics", to: "/reports/analytics" },
      { id: "reports-ai-ops", label: "AI Ops", to: "/reports/ai-ops" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    icon: <SettingsIcon aria-hidden="true" />,
    dialog: true,
  },
]

// ── Notification Types ──

export type NotificationType =
  | "mention"
  | "comment"
  | "share"
  | "invite"
  | "billing"
  | "security"
  | "feature"
  | "deployment"
  | "usage"
  | "system"
  | "task"
  | "approval"
  | "integration"
  | "achievement"
  | "feedback"
  | "team_join"
  | "reaction"
  | "review"
  | "event"

export type NotificationVariant = "info" | "success" | "warning" | "destructive"

export type NotificationAction = {
  label: string
  variant?: "default" | "outline" | "destructive"
  action?: string
}

export type NotificationAttachment = {
  name: string
  size: string
  url?: string
}

export type NotificationAvatar = {
  src: string
  fallback: string
}

export type NotificationGroupMember = {
  src: string
  fallback: string
  online?: boolean
}

export type NotificationMeta = {
  label: string
  value: string
  color?: string
}

export type Notification = {
  id: string
  type: NotificationType
  variant?: NotificationVariant
  title: string
  body?: string
  time: string
  unread?: boolean
  avatar?: NotificationAvatar
  username?: string
  link?: string
  badge?: string
  actions?: NotificationAction[]
  attachment?: NotificationAttachment
  meta?: NotificationMeta
  progress?: number
  progressVariant?: "default" | "success"
  avatarGroup?: NotificationGroupMember[]
  avatarGroupCount?: number
  rating?: number
  eventDate?: string
  eventTime?: string
}

// ── Notifications Data ──

export const NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    type: "mention",
    title: "mentioned you in",
    body: '"Can you review the changes?"',
    time: "2m ago",
    unread: false,
    avatar: {
      src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
      fallback: "SR",
    },
    username: "@sarah_smith",
    link: "#PR-1024",
  },
  {
    id: "n2",
    type: "approval",
    variant: "warning",
    title: "Pending approval",
    body: "Design System v2.0 release requires your approval before deployment.",
    time: "5m ago",
    unread: true,
    actions: [
      { label: "Approve", variant: "default" },
      { label: "Review", variant: "outline" },
    ],
    meta: { label: "Priority", value: "High", color: "text-warning" },
  },
  {
    id: "n3",
    type: "share",
    title: "shared",
    body: "Project Timeline",
    time: "15m ago",
    unread: true,
    avatar: {
      src: "https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80",
      fallback: "MA",
    },
    username: "@maverick",
    attachment: {
      name: "project-plan.pdf",
      size: "2mb",
    },
  },
  {
    id: "n4",
    type: "task",
    variant: "info",
    title: "Task assigned to you",
    body: "Implement user authentication flow for the mobile app.",
    time: "30m ago",
    unread: true,
    meta: { label: "Due", value: "Tomorrow", color: "text-destructive" },
  },
  {
    id: "n4b",
    type: "team_join",
    variant: "success",
    title: "4 people joined your workspace",
    body: "Sarah, Mike, Emma and James just joined ReUI Pro.",
    time: "45m ago",
    unread: true,
    avatarGroup: [
      {
        src: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
        fallback: "SC",
        online: true,
      },
      {
        src: "https://images.unsplash.com/photo-1584308972272-9e4e7685e80f?w=96&h=96&dpr=2&q=80",
        fallback: "MR",
      },
      {
        src: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
        fallback: "EW",
      },
    ],
    avatarGroupCount: 1,
  },
  {
    id: "n4c",
    type: "reaction",
    variant: "info",
    title: "Reactions on your comment",
    body: "Sarah and 2 others reacted to your comment in #design-system.",
    time: "1h ago",
    avatarGroup: [
      {
        src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
        fallback: "SR",
        online: true,
      },
      {
        src: "https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80",
        fallback: "MA",
      },
    ],
    avatarGroupCount: 1,
    badge: "👍 5",
  },
  {
    id: "n4d",
    type: "review",
    variant: "success",
    title: "New feedback received",
    body: "Emma left feedback on Design System v2.0.",
    time: "2h ago",
    avatar: {
      src: "https://images.unsplash.com/photo-1485893086445-ed75865251e0?w=96&h=96&dpr=2&q=80",
      fallback: "EW",
    },
    username: "@emma",
    rating: 4,
  },
  {
    id: "n4e",
    type: "event",
    variant: "info",
    title: "Upcoming event reminder",
    body: "Design system review with the product team.",
    time: "3h ago",
    unread: true,
    eventDate: "Mar 3, 2026",
    eventTime: "10:00 to 11:00 AM",
    meta: { label: "Where", value: "Google Meet", color: "text-info" },
    actions: [
      { label: "Join", variant: "default" },
      { label: "Decline", variant: "outline" },
    ],
  },
  {
    id: "n5",
    type: "invite",
    variant: "info",
    title: "Team Invitation",
    body: "Alex invited you to join ReUI Pro.",
    time: "1h ago",
    unread: false,
    actions: [
      { label: "Accept", variant: "default" },
      { label: "Decline", variant: "outline" },
    ],
  },
  {
    id: "n6",
    type: "integration",
    variant: "success",
    title: "Slack connected",
    body: "Your Slack workspace is now synced with notifications.",
    time: "2h ago",
  },
  {
    id: "n7",
    type: "billing",
    variant: "info",
    title: "Plan renewed",
    body: "Your Pro plan renewed for another month.",
    time: "3h ago",
    badge: "Pro",
  },
  {
    id: "n8",
    type: "achievement",
    variant: "success",
    title: "Monthly milestone reached!",
    body: "100 of 100 tasks completed this month. Outstanding work!",
    time: "4h ago",
    progress: 100,
    progressVariant: "success",
    meta: { label: "Goal", value: "100 tasks", color: "text-success" },
  },
  {
    id: "n9",
    type: "security",
    variant: "destructive",
    title: "New sign-in detected",
    body: "We noticed a new login from Mac OS, Chrome.",
    time: "Yesterday",
  },
  {
    id: "n10",
    type: "feedback",
    variant: "info",
    title: "Feedback requested",
    body: "How was your experience with the new dashboard?",
    time: "Yesterday",
    actions: [
      { label: "Rate", variant: "default" },
      { label: "Later", variant: "outline" },
    ],
  },
  {
    id: "n11",
    type: "feature",
    variant: "warning",
    title: "Introducing AI Copilot",
    body: "Generate code, fix bugs, and write tests faster with our new AI assistant.",
    time: "2 days ago",
  },
  {
    id: "n12",
    type: "comment",
    variant: "info",
    title: "New comment on Issue #84",
    body: '"I think we should prioritize this for the next sprint..."',
    time: "3 days ago",
  },
  {
    id: "n13",
    type: "deployment",
    variant: "success",
    title: "Deployment successful",
    body: "Production branch deployed to Vercel.",
    time: "4 days ago",
    meta: { label: "Env", value: "Production", color: "text-success" },
  },
  {
    id: "n14",
    type: "usage",
    variant: "warning",
    title: "API usage at 80%",
    body: "You've used 80% of your monthly API quota.",
    time: "5 days ago",
    progress: 80,
  },
  {
    id: "n15",
    type: "system",
    variant: "info",
    title: "Scheduled maintenance",
    body: "We'll be performing maintenance on Feb 28, 2026 at 2:00 AM UTC.",
    time: "1 week ago",
  },
]

// ── Right Sidebar Types (from Sidebar 5) ──

export type CalendarItem = {
  id: string
  label: string
  color: string
  enabled: boolean
}

export type CalendarAccount = {
  id: string
  email: string
  items: CalendarItem[]
}

export type AvatarMember = {
  src?: string
  fallback: string
  color: string
}

export type UpcomingEvent = {
  id: string
  title: string
  /** Day the event sits on, as `yyyy-mm-dd`. Drives the mini calendar dots. */
  date: string
  startTime: string
  endTime: string
  calendarColor: string
  attendees?: AvatarMember[]
}

export type CalendarColor = {
  id: string
  value: string
}

// ── Right Sidebar User ──

export const USER = {
  name: "Nick Bold",
  email: "nick@reui.io",
  initials: "NB",
  avatar:
    "https://images.unsplash.com/photo-1543299750-19d1d6297053?w=96&h=96&dpr=2&q=80",
}

// ── Calendar Accounts ──

export const CALENDAR_ACCOUNTS: CalendarAccount[] = [
  {
    id: "work",
    email: "nick@reui.io",
    items: [
      { id: "work-main", label: "Work", color: "#4f46e5", enabled: true },
      {
        id: "work-personal",
        label: "Personal",
        color: "#16a34a",
        enabled: true,
      },
      {
        id: "work-meetings",
        label: "Meetings",
        color: "#9333ea",
        enabled: true,
      },
    ],
  },
  {
    id: "personal",
    email: "nick@gmail.com",
    items: [
      {
        id: "personal-main",
        label: "Personal",
        color: "#ea580c",
        enabled: true,
      },
      {
        id: "personal-family",
        label: "Family",
        color: "#e11d48",
        enabled: false,
      },
    ],
  },
]

// ── Today ──

/**
 * Local midnight today, so the panel always opens on the real current month.
 * Resolved once at module load rather than per render: the seeded events below
 * are offsets from it, and re-reading the clock later could drift them out of
 * step with the calendar's own "today" if the app is left open past midnight.
 * Midnight (not `new Date()`) keeps it comparable with the day keys below.
 */
export const TODAY = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

/**
 * Local-date `yyyy-mm-dd`. Deliberately not toISOString(), which converts to
 * UTC and so names the previous day for a local midnight in any +NN zone.
 */
export function toDayKey(value: Date): string {
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${value.getFullYear()}-${month}-${day}`
}

/** `yyyy-mm-dd` for a day relative to today. */
function relativeDay(offset: number): string {
  const d = new Date(TODAY)
  d.setDate(d.getDate() + offset)
  return toDayKey(d)
}

// ── Upcoming Events ──

// Spread across nearby days so the mini calendar has several dotted days to
// navigate; the panel derives both the dots and the day list from this array.
export const UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    id: "e1",
    title: "Weekly Team Standup",
    date: relativeDay(0),
    startTime: "9:00 AM",
    endTime: "9:30 AM",
    calendarColor: "#4f46e5",
    attendees: [
      {
        fallback: "SC",
        color: "bg-violet-500",
        src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=96&h=96&dpr=2&q=80",
      },
      {
        fallback: "ML",
        color: "bg-emerald-500",
        src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
      },
      {
        fallback: "EP",
        color: "bg-pink-500",
        src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
      },
    ],
  },
  {
    id: "e2",
    title: "Design Review · Component Library v3",
    date: relativeDay(0),
    startTime: "11:00 AM",
    endTime: "12:00 PM",
    calendarColor: "#9333ea",
    attendees: [
      {
        fallback: "AP",
        color: "bg-teal-500",
        src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
      },
    ],
  },
  {
    id: "e3",
    title: "Coffee with Alex",
    date: relativeDay(0),
    startTime: "2:00 PM",
    endTime: "2:30 PM",
    calendarColor: "#ea580c",
  },
  {
    id: "e4",
    title: "1:1 with Priya",
    date: relativeDay(1),
    startTime: "10:00 AM",
    endTime: "10:30 AM",
    calendarColor: "#2563eb",
    attendees: [
      {
        fallback: "PR",
        color: "bg-blue-500",
        src: "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80",
      },
    ],
  },
  {
    id: "e5",
    title: "Sprint Planning",
    date: relativeDay(1),
    startTime: "1:00 PM",
    endTime: "2:00 PM",
    calendarColor: "#4f46e5",
  },
  {
    id: "e6",
    title: "Roadmap Sync",
    date: relativeDay(3),
    startTime: "3:00 PM",
    endTime: "4:00 PM",
    calendarColor: "#9333ea",
  },
  {
    id: "e7",
    title: "Maintenance Window",
    date: relativeDay(4),
    startTime: "11:00 PM",
    endTime: "11:59 PM",
    calendarColor: "#6b7280",
  },
  {
    id: "e8",
    title: "Quarterly Review",
    date: relativeDay(7),
    startTime: "9:30 AM",
    endTime: "11:00 AM",
    calendarColor: "#16a34a",
  },
  {
    id: "e9",
    title: "Retro",
    date: relativeDay(-2),
    startTime: "4:00 PM",
    endTime: "4:45 PM",
    calendarColor: "#0d9488",
  },
]

// ── Color Options ──

export const COLOR_OPTIONS: CalendarColor[] = [
  { id: "tomato", value: "#e11d48" },
  { id: "flamingo", value: "#dc2626" },
  { id: "tangerine", value: "#ea580c" },
  { id: "banana", value: "#eab308" },
  { id: "sage", value: "#16a34a" },
  { id: "basil", value: "#0d9488" },
  { id: "peacock", value: "#2563eb" },
  { id: "blueberry", value: "#4f46e5" },
  { id: "lavender", value: "#9333ea" },
  { id: "grape", value: "#c026d3" },
  { id: "graphite", value: "#6b7280" },
  { id: "obsidian", value: "#1f2937" },
]

// ── Timezone ──

export const TIMEZONE = {
  abbreviation: "GMT+5",
  region: "Asia/Tashkent",
  label: "Uzbekistan Standard Time",
  offset: "+05:00",
}

// The demo reference date and its day helper live above UPCOMING_EVENTS, which
// seeds its dates from them. Event dots are derived from those events in the
// panel, so there is no standalone date set to keep in sync.
