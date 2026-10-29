import { useMemo, useState } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/reui/badge"
import { Rating } from "@/components/reui/rating"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  actionOutcome,
  actionToast,
  dismiss as dismissNotification,
  markAllRead,
  markRead,
  pluralize,
  seedNotifications,
  toggleRead,
  unreadCount as countUnread,
  visibleNotifications,
} from "../lib/notifications"
import type { NotificationFilter } from "../lib/notifications"
import { NOTIFICATIONS } from "./data"
import type {
  Notification,
  NotificationAction,
  NotificationGroupMember,
  NotificationType,
  NotificationVariant,
} from "./data"
import {
  ChatIcon as MessageSquareIcon,
  PaperclipIcon,
  UserPlusIcon,
  CreditCardIcon,
  ShieldWarningIcon as ShieldAlertIcon,
  SparkleIcon as SparklesIcon,
  RocketLaunchIcon as RocketIcon,
  PulseIcon as ActivityIcon,
  WarningCircleIcon as AlertCircleIcon,
  CheckCircleIcon as CircleCheckIcon,
  LinkIcon,
  StarIcon,
  ThumbsUpIcon,
  UsersIcon,
  SmileyIcon as SmileIcon,
  CalendarIcon,
  DownloadSimpleIcon as DownloadIcon,
  ChecksIcon as CheckCheckIcon,
  CheckIcon,
  XIcon,
  BellIcon,
} from "@phosphor-icons/react"

const NOTIFICATION_ICONS: Record<NotificationType, ReactNode> = {
  mention: <MessageSquareIcon aria-hidden="true" />,
  comment: <MessageSquareIcon aria-hidden="true" />,
  share: <PaperclipIcon aria-hidden="true" />,
  invite: <UserPlusIcon aria-hidden="true" />,
  billing: <CreditCardIcon aria-hidden="true" />,
  security: <ShieldAlertIcon aria-hidden="true" />,
  feature: <SparklesIcon aria-hidden="true" />,
  deployment: <RocketIcon aria-hidden="true" />,
  usage: <ActivityIcon aria-hidden="true" />,
  system: <AlertCircleIcon aria-hidden="true" />,
  task: <CircleCheckIcon aria-hidden="true" />,
  approval: <CircleCheckIcon aria-hidden="true" />,
  integration: <LinkIcon aria-hidden="true" />,
  achievement: <StarIcon aria-hidden="true" />,
  feedback: <ThumbsUpIcon aria-hidden="true" />,
  team_join: <UsersIcon aria-hidden="true" />,
  reaction: <SmileIcon aria-hidden="true" />,
  review: <StarIcon aria-hidden="true" />,
  event: <CalendarIcon aria-hidden="true" />,
}

const VARIANT_COLORS: Record<NotificationVariant, string> = {
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
}

// ── Notification Avatar Group ──

function NotifAvatarGroup({
  members,
  count,
}: {
  members: NotificationGroupMember[]
  count?: number
}) {
  return (
    <AvatarGroup className="mt-1.5 -space-x-1">
      {members.map((m) => (
        <Avatar key={m.src} className="size-5">
          <AvatarImage src={m.src} alt={m.fallback} />
          <AvatarFallback className="text-[9px]">{m.fallback}</AvatarFallback>
        </Avatar>
      ))}
      {count && count > 0 ? (
        <AvatarGroupCount className="size-5 text-[9px] leading-none">
          +{count}
        </AvatarGroupCount>
      ) : null}
    </AvatarGroup>
  )
}

// ── Segmented Meta Badge ──

function MetaBadge({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <span className="inline-flex h-[18px] shrink-0 items-center overflow-hidden rounded-sm border border-border/60 text-[10px] font-medium">
      <span className="flex h-full items-center border-r border-border/50 bg-muted/60 px-1.5 leading-none text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "flex h-full items-center px-1.5 leading-none",
          color || "text-foreground"
        )}
      >
        {value}
      </span>
    </span>
  )
}

// ── Mini Progress Bar ──

function MiniProgress({
  value,
  variant = "default",
}: {
  value: number
  variant?: "default" | "success"
}) {
  const indicatorColor =
    variant === "success"
      ? "**:data-[slot=progress-indicator]:bg-success"
      : value >= 80
        ? "**:data-[slot=progress-indicator]:bg-warning"
        : "**:data-[slot=progress-indicator]:bg-primary"

  return (
    <div className="relative mt-1.5 h-1 overflow-hidden rounded-full bg-muted/55">
      <div
        className="pointer-events-none absolute inset-0 text-muted-foreground opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-45deg, currentColor 0, currentColor 1px, transparent 0, transparent 4px)",
        }}
      />
      <Progress
        value={value}
        className={cn(
          "absolute inset-0 gap-0",
          "**:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:rounded-none **:data-[slot=progress-track]:bg-transparent",
          "**:data-[slot=progress-indicator]:rounded-none",
          indicatorColor
        )}
      />
    </div>
  )
}

// ── Notification Item ──

type ItemHandlers = {
  onToggleRead: (id: string) => void
  onDismiss: (id: string) => void
  onAction: (notification: Notification, action: NotificationAction) => void
}

function NotificationItem({
  notification,
  onToggleRead,
  onDismiss,
  onAction,
}: { notification: Notification } & ItemHandlers) {
  const {
    id,
    type,
    variant = "info",
    title,
    body,
    time,
    unread,
    avatar,
    username,
    link,
    badge,
    actions,
    attachment,
    meta,
    progress,
    avatarGroup,
    avatarGroupCount,
    rating,
    eventDate,
    eventTime,
    progressVariant,
  } = notification

  const iconColor = VARIANT_COLORS[variant]
  const hasAvatar = Boolean(avatar)
  const hasActions = Boolean(actions?.length)

  // Anything nested inside the row is a real button, so the row itself must not
  // be one: that is what the old hasInteractiveChildren fork was working around,
  // at the cost of leaving every row with actions completely unclickable. The
  // row is a plain container now, the pointer shortcut is a convenience, and the
  // keyboard path is the explicit read/dismiss controls in the corner.
  function markReadOnRowClick() {
    if (unread) onToggleRead(id)
  }

  return (
    <div
      className={cn(
        "group/notif relative flex w-full items-start gap-2 p-2 text-left transition-colors",
        unread ? "cursor-pointer hover:bg-accent/40" : "hover:bg-accent/20"
      )}
      onClick={markReadOnRowClick}
    >
      {/* Left column: Avatar or Icon */}
      <div className="shrink-0">
        {hasAvatar ? (
          <Avatar size="sm">
            <AvatarImage src={avatar?.src} alt={avatar?.fallback} />
            <AvatarFallback>{avatar?.fallback}</AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={cn(
              "flex size-6 items-center justify-center [&_svg]:size-4",
              iconColor
            )}
          >
            {NOTIFICATION_ICONS[type]}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-1">
        {/* Title row. The control cluster is absolutely positioned, so the
            clearance is a manual number: 48px of buttons plus enough to leave
            the same optical gap the two icons have between themselves. The
            icons sit 5.7px inside their ghost buttons, so matching box edges
            would leave the badge looking crammed against the tick. */}
        <div className="flex items-start justify-between gap-2 pr-13.5">
          <p className="text-xs leading-snug text-foreground">
            {/* The dot alone conveys unread; give it a text equivalent. */}
            {unread && <span className="sr-only">Unread. </span>}
            {username && (
              <span className="font-medium text-primary">{username}</span>
            )}{" "}
            {hasAvatar ? (
              <>
                {title}{" "}
                {link && (
                  <span className="font-medium text-primary">{link}</span>
                )}
              </>
            ) : (
              <span className="font-medium">{title}</span>
            )}
          </p>
          {badge && (
            <Badge variant="outline" size="sm">
              {badge}
            </Badge>
          )}
        </div>

        {/* Body */}
        {body && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{body}</p>
        )}

        {/* Avatar group */}
        {avatarGroup && avatarGroup.length > 0 && (
          <NotifAvatarGroup members={avatarGroup} count={avatarGroupCount} />
        )}

        {/* Star rating */}
        {rating !== undefined && (
          <Rating rating={rating} size="sm" className="mt-0.5" />
        )}

        {/* Event date/time chip */}
        {(eventDate || eventTime) && (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-sm border border-border/50 bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
            <CalendarIcon
              aria-hidden="true"
              className="size-3 shrink-0 opacity-60"
            />
            {eventDate && (
              <span className="font-medium text-foreground">{eventDate}</span>
            )}
            {eventTime && <span className="opacity-70">{eventTime}</span>}
          </div>
        )}

        {/* Progress bar */}
        {progress !== undefined && (
          <MiniProgress value={progress} variant={progressVariant} />
        )}

        {/* Attachment */}
        {attachment && (
          <div className="flex items-center gap-1 py-1">
            <ButtonGroup>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={(event) => {
                  event.stopPropagation()
                  toast.success("Opening attachment", {
                    description: `${attachment.name} (${attachment.size}) is ready.`,
                  })
                }}
              >
                <PaperclipIcon aria-hidden="true" />
                {attachment.name}
                <span className="opacity-60">({attachment.size})</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-xs"
                aria-label={`Download ${attachment.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  toast.success("Download started", {
                    description: `${attachment.name} is downloading.`,
                  })
                }}
              >
                <DownloadIcon aria-hidden="true" />
              </Button>
            </ButtonGroup>
          </div>
        )}

        {/* Actions */}
        {hasActions && (
          <div className="flex items-center gap-1 py-1">
            {actions?.map((action) => (
              <Button
                key={action.label}
                type="button"
                size="xs"
                // "destructive" is in the union and used to collapse to default.
                variant={action.variant ?? "default"}
                // stopPropagation so choosing an action does not also fire the
                // row's mark-as-read on the way up.
                onClick={(event) => {
                  event.stopPropagation()
                  onAction(notification, action)
                }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Timestamp + Meta badge on the same line */}
        <div className="flex items-center gap-2 pt-0.5">
          {/* Unread marker lives down here now: the row controls occupy the
              top-right corner where it used to sit. */}
          {unread && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              aria-hidden="true"
            />
          )}
          <p className="text-[11px] text-muted-foreground">{time}</p>
          {meta && (
            <MetaBadge
              label={meta.label}
              value={meta.value}
              color={meta.color}
            />
          )}
        </div>
      </div>

      {/* Row controls, always present rather than revealed on hover: a
          hover-only control is unreachable feedback for keyboard users, and the
          focus-within reveal did not apply reliably here. Dimmed to 60% like
          the panel header's own icon button, so the list stays calm. */}
      <div className="absolute top-1 right-1 flex items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          // A stable name plus aria-pressed, rather than a label that flips
          // between "mark as read" and "mark as unread" when you activate it.
          className="opacity-60 hover:opacity-100"
          aria-label={`Mark "${title}" as read`}
          aria-pressed={!unread}
          onClick={(event) => {
            event.stopPropagation()
            onToggleRead(id)
          }}
        >
          <CheckIcon aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="opacity-60 hover:opacity-100"
          aria-label={`Dismiss "${title}"`}
          data-slot="notif-dismiss"
          onClick={(event) => {
            event.stopPropagation()
            onDismiss(id)
          }}
        >
          <XIcon aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

// ── Notifications Panel ──

function NotificationsPanel({
  items,
  visible,
  unreadCount,
  filter,
  onFilterChange,
  onMarkAllRead,
  announcement,
  ...handlers
}: {
  items: Notification[]
  visible: Notification[]
  unreadCount: number
  filter: NotificationFilter
  onFilterChange: (filter: NotificationFilter) => void
  onMarkAllRead: () => void
  announcement: string
} & ItemHandlers) {
  return (
    <>
      {/* The popup is role=dialog, so give it a real accessible name. */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <PopoverTitle className="truncate text-sm font-semibold">
            Notifications
          </PopoverTitle>
          {unreadCount > 0 && (
            // The bell's label and the live region already carry the number.
            <Badge size="xs" className="rounded-full!" aria-hidden="true">
              {unreadCount}
            </Badge>
          )}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-60 hover:opacity-100"
                  aria-label="Mark all as read"
                  disabled={unreadCount === 0}
                  onClick={onMarkAllRead}
                />
              }
            >
              <CheckCheckIcon className="size-3.5" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>Mark all as read</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Filter. Sibling of the scroll row below, never inside it: that flex
          row is what resolves the ScrollArea viewport's height. */}
      <Tabs
        value={filter}
        onValueChange={(value) => onFilterChange(value as NotificationFilter)}
      >
        <TabsList
          variant="line"
          aria-label="Filter notifications"
          className="gap-4 px-4"
        >
          <TabsTrigger value="all" className="gap-2 px-0 pb-2 text-xs">
            <span>All</span>
            <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground tabular-nums">
              {items.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="unread" className="gap-2 px-0 pb-2 text-xs">
            <span>Unread</span>
            <span className="inline-flex min-w-5 items-center justify-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground tabular-nums">
              {unreadCount}
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content */}
      <div className="relative flex max-h-full">
        <ScrollArea className="max-h-[320px] grow">
          <div role="list">
            {visible.map((notification, index) => (
              <div
                key={notification.id}
                role="listitem"
                data-notif-id={notification.id}
              >
                <NotificationItem notification={notification} {...handlers} />
                {index < visible.length - 1 && (
                  <Separator className="opacity-60" />
                )}
              </div>
            ))}
          </div>
          {visible.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-2 py-8">
              <p className="text-center text-xs text-muted-foreground">
                {filter === "unread"
                  ? "You're all caught up."
                  : "No notifications."}
              </p>
              {filter === "unread" && items.length > 0 && (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => onFilterChange("all")}
                >
                  Show all
                </Button>
              )}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Always mounted and initially empty: a live region that appears with
          text already in it is frequently not announced. */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  )
}

// ── Notifications Popover ──

export function NotificationsPopover() {
  // State lives here, not in the panel: PopoverContent portals without
  // keepMounted, so the panel unmounts on every close and would reset. This is
  // also the only level from which the bell dot can react to a change.
  const [items, setItems] = useState<Notification[]>(() =>
    seedNotifications(NOTIFICATIONS)
  )
  const [filter, setFilter] = useState<NotificationFilter>("all")
  const [announcement, setAnnouncement] = useState("")

  const unread = useMemo(() => countUnread(items), [items])
  const visible = useMemo(
    () => visibleNotifications(items, filter),
    [items, filter]
  )

  function handleToggleRead(id: string) {
    const wasUnread = items.find((n) => n.id === id)?.unread
    const next = toggleRead(items, id)
    setItems(next)
    setAnnouncement(
      `${wasUnread ? "Marked as read" : "Marked as unread"}. ${pluralize(
        countUnread(next)
      )} unread.`
    )
  }

  function handleMarkAllRead() {
    setAnnouncement(`All ${pluralize(unread)} marked as read.`)
    setItems(markAllRead(items))
    toast.success("All caught up", {
      description: `${pluralize(unread)} marked as read.`,
    })
  }

  function handleDismiss(id: string) {
    // Resolve the neighbour by id before removing anything: after the commit
    // the indices have all shifted, and an index-based lookup lands on the
    // wrong row (or misses, dropping focus out of the list entirely).
    const index = visible.findIndex((n) => n.id === id)
    const neighbourId = (visible[index + 1] ?? visible[index - 1])?.id
    const next = dismissNotification(items, id)
    setItems(next)
    setAnnouncement(
      `Notification dismissed. ${pluralize(next.length)} remaining.`
    )
    // The removed row takes focus with it, and this popover is non-modal, so
    // letting focus fall to <body> risks it closing. Queried from the document
    // rather than through a ref, because the popup is portalled. A timeout
    // rather than the repo's usual requestAnimationFrame: rAF never fires while
    // the tab is in the background, which would strand focus on <body> exactly
    // when the user tabs back in.
    if (!neighbourId) return
    setTimeout(() => {
      document
        .querySelector<HTMLButtonElement>(
          `[data-slot="popover-content"] [data-notif-id="${neighbourId}"] [data-slot="notif-dismiss"]`
        )
        ?.focus()
    }, 0)
  }

  function handleAction(
    notification: Notification,
    action: NotificationAction
  ) {
    const resolves = actionOutcome(action) === "resolve"
    const next = resolves
      ? dismissNotification(items, notification.id)
      : markRead(items, notification.id)
    setItems(next)
    const copy = actionToast(action)
    setAnnouncement(`${copy.title}. ${pluralize(countUnread(next))} unread.`)
    toast.success(copy.title, { description: copy.description })
  }

  function handleFilterChange(next: NotificationFilter) {
    setFilter(next)
    // Filtering to nothing is otherwise completely silent.
    if (next === "unread" && unread === 0) {
      setAnnouncement("No unread notifications.")
    }
  }

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setAnnouncement("")
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
            }
            className="relative bg-transparent text-zinc-200 hover:bg-zinc-700 [&_svg]:opacity-60 hover:[&_svg]:opacity-100"
          />
        }
      >
        <BellIcon aria-hidden="true" />
        {unread > 0 && (
          <span
            className="absolute top-0.5 right-1 size-1.5 rounded-full bg-zinc-100"
            aria-hidden="true"
          />
        )}
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-80 gap-0 p-0"
      >
        <NotificationsPanel
          items={items}
          visible={visible}
          unreadCount={unread}
          filter={filter}
          onFilterChange={handleFilterChange}
          onMarkAllRead={handleMarkAllRead}
          announcement={announcement}
          onToggleRead={handleToggleRead}
          onDismiss={handleDismiss}
          onAction={handleAction}
        />
      </PopoverContent>
    </Popover>
  )
}
