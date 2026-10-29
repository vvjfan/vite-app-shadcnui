import * as React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { Badge } from "@/components/reui/badge"
import { Frame, FrameHeader, FramePanel } from "@/components/reui/frame"
import { IconStack } from "@/components/reui/icon-stack"
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineItem,
  TimelineTitle,
} from "@/components/reui/timeline"
import {
  CaretRightIcon as ChevronRightIcon,
  CopyIcon,
  UsersIcon,
  TrayIcon as InboxIcon,
  FunnelIcon as FilterIcon,
  PlusIcon,
  DotsThreeIcon as MoreHorizontalIcon,
  EyeIcon,
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  deleteActivity,
  filterActivities,
  groupIntoBuckets,
  initialOpenIds,
  toggleOpenId,
  upsertActivity,
  activityExists,
} from "../lib/activity-log"
import {
  ACTIVITIES,
  activityTypeLabel,
  bucketLabel,
  outcomeDotClass,
  outcomeLabel,
  outcomeVariant,
  OWNER_FILTER_OPTIONS,
  OWNERS,
  TOAST_INFO_ICON,
  TOAST_SUCCESS_ICON,
  TYPE_FILTER_OPTIONS,
} from "./data"
import type { Activity, ActivityType } from "./data"
import { ActivitySheet } from "./activity-sheet"
import type { ActivitySheetState } from "./activity-sheet"

type ActivityEntryAction = "view" | "edit" | "delete"

function ActivityEntryContent({ activity }: { activity: Activity }) {
  const owner = OWNERS[activity.ownerId]

  const handleCopyRef = useCallback(() => {
    toast.success("Reference copied", {
      description: `${activity.ref} for ${activity.account} is on your clipboard.`,
      icon: TOAST_SUCCESS_ICON,
    })
  }, [activity.account, activity.ref])

  return (
    <div className="space-y-2.5">
      <p className="text-xs leading-5 text-muted-foreground">
        {activity.detail}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t pt-2">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage src={owner.avatar} alt={owner.name} />
            <AvatarFallback className="text-[10px]">
              {owner.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium text-foreground">
              {owner.name}
            </span>
            <span className="truncate text-[11px] text-muted-foreground">
              {owner.role}
            </span>
          </span>
        </div>

        <Button
          variant="outline"
          size="xs"
          type="button"
          onClick={handleCopyRef}
        >
          <CopyIcon className="size-3.5" aria-hidden="true" />
          {activity.ref}
        </Button>
      </div>
    </div>
  )
}

function ActivityActionsMenu({
  activity,
  onAction,
}: {
  activity: Activity
  onAction: (action: ActivityEntryAction, activity: Activity) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            className="shrink-0 text-muted-foreground"
            aria-label={`Actions for ${activity.title}`}
          />
        }
      >
        <MoreHorizontalIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onAction("view", activity)}>
            <EyeIcon className="size-4" aria-hidden="true" />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("edit", activity)}>
            <PencilIcon className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onAction("delete", activity)}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ActivityEntry({
  activity,
  step,
  open,
  onOpenChange,
  onAction,
}: {
  activity: Activity
  step: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onAction: (action: ActivityEntryAction, activity: Activity) => void
}) {
  return (
    <TimelineItem step={step} className="ms-0! pb-6">
      <TimelineHeader>
        <div className="flex w-full min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <TimelineTitle className="text-sm font-semibold">
              {activity.title}
            </TimelineTitle>
            <Badge
              variant={outcomeVariant[activity.outcome]}
              className="gap-1.5"
            >
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  outcomeDotClass[activity.outcome]
                )}
                aria-hidden="true"
              />
              {outcomeLabel[activity.outcome]}
            </Badge>
          </div>
          <ActivityActionsMenu activity={activity} onAction={onAction} />
        </div>
      </TimelineHeader>
      <TimelineContent className="mt-1.5">
        <Frame stacked dense spacing="sm">
          <Collapsible
            className="group/collapsible"
            open={open}
            onOpenChange={onOpenChange}
          >
            <CollapsibleTrigger
              type="button"
              className="flex w-full"
              aria-label={`Toggle ${activity.title} details`}
            >
              <FrameHeader className="flex grow flex-row items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col items-start gap-0.5">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {activity.account}
                  </span>
                  <span className="min-w-0 truncate text-xs text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
                <ChevronRightIcon
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-open/collapsible:rotate-90"
                  aria-hidden="true"
                />
              </FrameHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <FramePanel className="space-y-2.5">
                <ActivityEntryContent activity={activity} />
              </FramePanel>
            </CollapsibleContent>
          </Collapsible>
        </Frame>
      </TimelineContent>
    </TimelineItem>
  )
}

export function ActivityTimeline() {
  const [activities, setActivities] = useState<Activity[]>(ACTIVITIES)
  const activitiesRef = useRef(activities)
  React.useLayoutEffect(() => {
    activitiesRef.current = activities
  })
  const [sheet, setSheet] = useState<ActivitySheetState | null>(null)
  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(
    null
  )
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [ownerFilter, setOwnerFilter] = useState<string>("all")

  const handleOwnerChange = useCallback((value: string | null) => {
    if (!value) return
    setOwnerFilter(value)
  }, [])

  const handleResetFilters = useCallback(() => {
    setTypeFilter("all")
    setOwnerFilter("all")
    toast("Filters cleared", {
      description: `Showing all ${activities.length} activities across ${OWNER_FILTER_OPTIONS.length - 1} owners.`,
      icon: TOAST_INFO_ICON,
    })
  }, [activities.length])

  // Create (prepend) or update (map by id) from the activity sheet.
  const handleSubmitActivity = useCallback((activity: Activity) => {
    const exists = activityExists(activitiesRef.current, activity.id)
    setActivities((current) => upsertActivity(current, activity))
    toast.success(exists ? "Activity updated" : "Activity logged", {
      description: exists
        ? `${activity.ref} for ${activity.account || "no account"} was updated.`
        : `${activity.ref} for ${activity.account || "no account"} was added to the log.`,
      icon: TOAST_SUCCESS_ICON,
    })
  }, [])

  const performDeleteActivity = useCallback((activity: Activity) => {
    setActivities((current) => deleteActivity(current, activity.id))
    setSheet(null)
    toast("Activity deleted", {
      description: `${activity.ref} for ${activity.account || "no account"} was removed from the log.`,
      icon: TOAST_INFO_ICON,
    })
  }, [])

  const openCreate = useCallback(() => setSheet({ mode: "create" }), [])

  const handleEntryAction = useCallback(
    (action: ActivityEntryAction, activity: Activity) => {
      if (action === "view") {
        setSheet({ mode: "view", activity })
        return
      }
      if (action === "edit") {
        setSheet({ mode: "edit", activity })
        return
      }
      setActivityToDelete(activity)
    },
    []
  )

  const startEdit = useCallback(
    () =>
      setSheet((prev) =>
        prev?.activity ? { mode: "edit", activity: prev.activity } : prev
      ),
    []
  )

  const cancelEdit = useCallback(
    () =>
      setSheet((prev) =>
        prev?.activity ? { mode: "view", activity: prev.activity } : null
      ),
    []
  )

  const closeSheet = useCallback((open: boolean) => {
    if (!open) setSheet(null)
  }, [])

  const filtered = useMemo(
    () => filterActivities(activities, typeFilter, ownerFilter),
    [activities, typeFilter, ownerFilter]
  )

  const buckets = useMemo(() => groupIntoBuckets(filtered), [filtered])

  // Controlled open state: the first two entries start open; the user controls
  // each card after that. (An uncontrolled defaultOpen that changed with the
  // filter triggered a Base UI "changing default open state" warning.)
  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    initialOpenIds(ACTIVITIES)
  )

  const handleToggle = useCallback((id: string, open: boolean) => {
    setOpenIds((prev) => toggleOpenId(prev, id, open))
  }, [])

  const emptyActivityType =
    typeFilter === "all"
      ? "activity"
      : `${activityTypeLabel[typeFilter as ActivityType].toLowerCase()} activity`

  const isFiltered = typeFilter !== "all" || ownerFilter !== "all"

  return (
    <>
      <section className="w-full" aria-labelledby="page-heading">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Tabs
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as string)}
            className="w-full min-w-0 [scrollbar-width:none] overflow-x-auto [-ms-overflow-style:none] sm:w-auto [&::-webkit-scrollbar]:hidden"
          >
            <TabsList aria-label="Filter by activity type">
              {TYPE_FILTER_OPTIONS.map((option) => (
                <TabsTrigger
                  key={option.value}
                  value={option.value}
                  className="px-3"
                >
                  {option.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <Select
            value={ownerFilter}
            onValueChange={handleOwnerChange}
            items={OWNER_FILTER_OPTIONS}
          >
            <SelectTrigger className="w-[150px] sm:ml-auto">
              <UsersIcon
                className="size-4 text-muted-foreground"
                aria-hidden="true"
              />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" alignItemWithTrigger={false}>
              <SelectGroup>
                {OWNER_FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Button type="button" onClick={openCreate}>
            <PlusIcon className="size-4" aria-hidden="true" />
            Log activity
          </Button>
        </div>

        {buckets.length === 0 ? (
          <div className="flex min-h-[360px] w-full items-center justify-center px-4 py-10 md:py-12">
            <Empty className="w-full flex-none gap-6 border-0 bg-transparent p-0 md:p-0">
              <EmptyHeader className="max-w-108 items-center gap-5 text-center">
                <EmptyMedia className="mb-0">
                  <IconStack aria-hidden="true">
                    <InboxIcon strokeWidth="1.9" aria-hidden="true" />
                  </IconStack>
                </EmptyMedia>

                <div className="flex flex-col items-center gap-2">
                  <EmptyTitle className="text-xl font-semibold tracking-tight sm:text-2xl">
                    No Matching Activity
                  </EmptyTitle>
                  <EmptyDescription className="max-w-96 text-sm/relaxed">
                    No {emptyActivityType} logged for this filter. Calls,
                    emails, and meetings land here as your reps work the
                    pipeline.
                  </EmptyDescription>
                </div>
              </EmptyHeader>

              <EmptyContent className="max-w-none items-center gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetFilters}
                >
                  Clear Filters
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <div className="space-y-8">
            {buckets.map((bucket) => (
              <div key={bucket.key}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {bucketLabel[bucket.key]}
                  </h2>
                  <span className="h-px grow bg-border" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {bucket.entries.length}
                  </span>
                </div>

                <Timeline defaultValue={bucket.entries.length}>
                  {bucket.entries.map((activity, index) => (
                    <ActivityEntry
                      key={activity.id}
                      activity={activity}
                      step={index + 1}
                      open={openIds.has(activity.id)}
                      onOpenChange={(next) => handleToggle(activity.id, next)}
                      onAction={handleEntryAction}
                    />
                  ))}
                </Timeline>
              </div>
            ))}

            {isFiltered ? (
              <div className="flex justify-center pt-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                >
                  <FilterIcon className="size-4" aria-hidden="true" />
                  Clear Filters
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <ActivitySheet
        state={sheet}
        onOpenChange={closeSheet}
        onSubmit={handleSubmitActivity}
        onEdit={startEdit}
        onCancelEdit={cancelEdit}
        onDelete={performDeleteActivity}
      />

      <AlertDialog
        open={activityToDelete !== null}
        onOpenChange={(open) => !open && setActivityToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete activity?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{activityToDelete?.title}&rdquo; will be removed from the
              activity log. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (activityToDelete) performDeleteActivity(activityToDelete)
                setActivityToDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
