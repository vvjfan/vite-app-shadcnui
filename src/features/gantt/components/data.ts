import type {
  GanttEvent,
  GanttResource,
} from "@/components/reui/gantt/gantt-types"

// Keys, not copy: these four map onto the planner's shared status wording
// (Todo, In Progress, Review, Done) through STATUS_META in the demo.
type DemoStatus = "todo" | "progress" | "review" | "done"
type DemoPriority = "low" | "normal" | "high" | "urgent"

interface DemoBarData {
  description?: string
}

type DemoBar = GanttEvent<DemoBarData>

interface DemoPerson {
  name: string
  image: string
  role: string
}

const DEMO_PEOPLE: DemoPerson[] = [
  {
    name: "Mira Stone",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&dpr=2&q=80",
    role: "Engineering",
  },
  {
    name: "Leo Grant",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&dpr=2&q=80",
    role: "Design",
  },
  {
    name: "Nora Vale",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&dpr=2&q=80",
    role: "QA",
  },
  {
    name: "Theo Park",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&dpr=2&q=80",
    role: "Product",
  },
]

/** Task tree: two lists, one task with subtasks (parents roll up progress). */
const DEMO_TASKS: GanttResource[] = [
  {
    id: "bug-tracking",
    title: "Bug Tracking",
    children: [
      { id: "login-redirect", title: "Login redirect" },
      { id: "access-rules", title: "Access rules" },
      {
        id: "mobile-crash",
        title: "Mobile crash",
        children: [
          { id: "crash-ios", title: "iOS audit" },
          { id: "crash-android", title: "Android audit" },
        ],
      },
      { id: "button-text", title: "Button truncation" },
      { id: "offline-sync", title: "Offline sync" },
      { id: "api-keys", title: "API key rotation" },
      // unscheduled: shows the "click to add a schedule" hint
      { id: "session-replay", title: "Session replay" },
    ],
  },
  {
    id: "release-24",
    title: "Release 2.4",
    children: [
      { id: "data-export", title: "Data export" },
      { id: "form-validation", title: "Form validation" },
      { id: "nav-focus", title: "Nav focus" },
      { id: "perf-audit", title: "Perf audit" },
      { id: "changelog", title: "Changelog" },
      // unscheduled: shows the "click to add a schedule" hint
      { id: "release-notes", title: "Release notes" },
    ],
  },
]

interface DemoTaskMeta {
  status: DemoStatus
  priority: DemoPriority
  /** DEMO_PEOPLE names; empty/undefined renders the unassigned placeholder. */
  assignees?: string[]
  updated: Date
}

/** Deterministic task attributes around the anchor date. */
function buildTaskMeta(anchor: Date): Record<string, DemoTaskMeta> {
  const daysAgo = (offset: number) => {
    const date = new Date(anchor)
    date.setDate(date.getDate() - offset)
    date.setHours(0, 0, 0, 0)
    return date
  }
  return {
    // multi-assignee
    "login-redirect": {
      status: "done",
      priority: "normal",
      assignees: ["Mira Stone", "Leo Grant"],
      updated: daysAgo(1),
    },
    // single
    "access-rules": {
      status: "progress",
      priority: "high",
      assignees: ["Leo Grant"],
      updated: daysAgo(0),
    },
    // multi-assignee (3)
    "mobile-crash": {
      status: "progress",
      priority: "urgent",
      assignees: ["Mira Stone", "Nora Vale", "Theo Park"],
      updated: daysAgo(0),
    },
    "crash-ios": {
      status: "progress",
      priority: "urgent",
      assignees: ["Nora Vale"],
      updated: daysAgo(0),
    },
    // unassigned
    "crash-android": {
      status: "todo",
      priority: "high",
      updated: daysAgo(2),
    },
    "button-text": {
      status: "review",
      priority: "low",
      assignees: ["Theo Park"],
      updated: daysAgo(1),
    },
    // multi-assignee
    "offline-sync": {
      status: "todo",
      priority: "normal",
      assignees: ["Leo Grant", "Theo Park"],
      updated: daysAgo(3),
    },
    "api-keys": {
      status: "done",
      priority: "high",
      assignees: ["Nora Vale"],
      updated: daysAgo(4),
    },
    // multi-assignee
    "data-export": {
      status: "progress",
      priority: "normal",
      assignees: ["Theo Park", "Mira Stone"],
      updated: daysAgo(0),
    },
    "form-validation": {
      status: "todo",
      priority: "normal",
      assignees: ["Mira Stone"],
      updated: daysAgo(2),
    },
    // unassigned
    "nav-focus": {
      status: "todo",
      priority: "low",
      updated: daysAgo(5),
    },
    "perf-audit": {
      status: "review",
      priority: "urgent",
      assignees: ["Leo Grant"],
      updated: daysAgo(1),
    },
    // unassigned
    changelog: {
      status: "todo",
      priority: "low",
      updated: daysAgo(6),
    },
    // unassigned
    "session-replay": {
      status: "todo",
      priority: "normal",
      updated: daysAgo(1),
    },
    // unassigned
    "release-notes": {
      status: "todo",
      priority: "low",
      updated: daysAgo(2),
    },
  }
}

/**
 * Deterministic day-precision task bars around the anchor: short bars for the
 * outside-label treatment, a parent summary span, a locked bar, and early and
 * late-month bars that exercise the off-screen jump chips.
 */
function buildDemoBars(anchor: Date): DemoBar[] {
  const day = (offset: number) => {
    const date = new Date(anchor)
    date.setDate(date.getDate() + offset)
    date.setHours(0, 0, 0, 0)
    return date
  }
  const bar = (
    id: string,
    title: string,
    startOffset: number,
    days: number,
    color: string,
    extra?: Partial<DemoBar>
  ): DemoBar => ({
    id: `bar-${id}`,
    title,
    start: day(startOffset),
    end: day(startOffset + days),
    allDay: true,
    color,
    resourceId: id,
    ...extra,
  })
  return [
    bar("login-redirect", "Login redirect", -8, 4, "var(--color-blue-500)", {
      progress: 100,
    }),
    bar("access-rules", "Access rules", -4, 5, "var(--color-violet-500)", {
      progress: 45,
      data: { description: "Role matrix rework." },
    }),
    bar("crash-ios", "iOS audit", -2, 4, "var(--color-cyan-500)", {
      progress: 60,
    }),
    bar("crash-android", "Android audit", 2, 5, "var(--color-teal-500)"),
    // ends before the anchor while not done: exercises the overdue treatment
    bar("button-text", "Button truncation", -6, 2, "var(--color-amber-500)", {
      progress: 70,
    }),
    bar("offline-sync", "Offline sync", 3, 6, "var(--color-emerald-500)", {
      progress: 20,
    }),
    bar("api-keys", "API key rotation", -7, 3, "var(--color-rose-500)", {
      progress: 100,
    }),
    bar("data-export", "Data export", 0, 4, "var(--color-blue-500)", {
      progress: 55,
    }),
    bar("form-validation", "Form validation", 4, 5, "var(--color-pink-500)", {
      progress: 10,
    }),
    bar("nav-focus", "Nav focus", 6, 4, "var(--color-orange-500)"),
    bar("perf-audit", "Perf audit", 1, 3, "var(--color-rose-500)", {
      progress: 50,
      readOnly: true,
      data: { description: "Locked release gate." },
    }),
    bar("changelog", "Changelog", 13, 4, "var(--color-indigo-500)", {
      data: { description: "Written once the release candidate is cut." },
    }),
  ]
}

export { buildDemoBars, buildTaskMeta, DEMO_PEOPLE, DEMO_TASKS }
export type {
  DemoBar,
  DemoBarData,
  DemoPerson,
  DemoPriority,
  DemoStatus,
  DemoTaskMeta,
}
