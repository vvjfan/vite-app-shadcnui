import { Badge } from "@/components/reui/badge"
import type { BadgeProps } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  Timeline,
  TimelineContent,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline"
import {
  CheckIcon,
  CaretRightIcon as ChevronRightIcon,
  CircleIcon,
  FlagIcon,
  ChatIcon as MessageSquareIcon,
  CalendarIcon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Spinner } from "@/components/ui/spinner"
import { failoverSteps } from "./data"
import type { FailoverFeedback, FailoverStatus } from "./data"

const feedbackPriorityVariant: Record<
  FailoverFeedback["priority"],
  BadgeProps["variant"]
> = {
  High: "warning-light",
  Medium: "info-light",
  Low: "success-light",
}

const feedbackStatusVariant: Record<
  FailoverFeedback["status"],
  BadgeProps["variant"]
> = {
  Healthy: "success-light",
  Watching: "warning-light",
  Blocked: "destructive-light",
}

const feedbackStatusDotClass: Record<FailoverFeedback["status"], string> = {
  Healthy: "bg-success",
  Watching: "bg-warning",
  Blocked: "bg-destructive",
}

function StatusIcon({ status }: { status: FailoverStatus }) {
  if (status === "completed") {
    return <CheckIcon className="size-3" />
  }

  if (status === "active") {
    return <Spinner className="size-3" />
  }

  return <CircleIcon className="size-3" />
}

function FeedbackContent({ feedback }: { feedback: FailoverFeedback }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant={feedbackPriorityVariant[feedback.priority]}
          className="gap-1.5"
        >
          <FlagIcon className="size-3.5" aria-hidden="true" />
          {feedback.priority}
        </Badge>
        <Badge
          variant={feedbackStatusVariant[feedback.status]}
          className="gap-1.5"
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              feedbackStatusDotClass[feedback.status]
            )}
            aria-hidden="true"
          />
          {feedback.status}
        </Badge>
      </div>

      <div className="space-y-1">
        <div className="text-sm leading-5 font-semibold text-foreground">
          {feedback.title}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          {feedback.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5 border-t pt-2">
        <AvatarGroup
          aria-label={`Assignees for ${feedback.title}`}
          className="-space-x-1"
        >
          {feedback.assignees.map((assignee) => (
            <Avatar key={assignee.id} className="size-6">
              <AvatarImage src={assignee.avatar} alt={assignee.name} />
              <AvatarFallback className="text-[10px]">
                {assignee.initials}
              </AvatarFallback>
            </Avatar>
          ))}
          {feedback.overflowCount > 0 ? (
            <AvatarGroupCount className="size-6 border bg-background text-[10px] tabular-nums">
              +{feedback.overflowCount}
            </AvatarGroupCount>
          ) : null}
        </AvatarGroup>

        <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MessageSquareIcon className="size-3.5" aria-hidden="true" />
            <span className="font-medium text-foreground tabular-nums">
              {feedback.comments}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="size-3.5" aria-hidden="true" />
            <span className="font-medium text-foreground">{feedback.due}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

export function ProviderFailoverTimeline() {
  return (
    <Frame dense className="h-full w-full" aria-labelledby="timeline-title">
      <FrameHeader>
        <div className="flex flex-col gap-0.5">
          <FrameTitle id="timeline-title" className="text-base font-semibold">
            Provider Failover
          </FrameTitle>
          <FrameDescription className="text-xs">
            3 failover checks, 1 blocked
          </FrameDescription>
        </div>
      </FrameHeader>

      <FramePanel className="flex flex-1 flex-col">
        <Timeline defaultValue={2}>
          {failoverSteps.map((step) => (
            <TimelineItem key={step.id} step={step.id} className="ms-8 pb-8">
              <TimelineHeader className="items-center">
                <TimelineSeparator className="bg-border group-data-[orientation=vertical]/timeline:-left-6 group-data-[orientation=vertical]/timeline:h-[calc(100%-1.25rem-0.5rem)] group-data-[orientation=vertical]/timeline:translate-y-6" />
                <div className="flex flex-wrap items-center gap-2">
                  <TimelineTitle className="text-sm leading-5 font-semibold">
                    {step.title}
                  </TimelineTitle>
                </div>
                <TimelineIndicator
                  className={cn(
                    "flex size-5 items-center justify-center border-none bg-muted text-muted-foreground group-data-completed/timeline-item:bg-primary group-data-completed/timeline-item:text-primary-foreground group-data-[orientation=vertical]/timeline:-left-6",
                    step.status === "active" && "ring-2 ring-primary/20"
                  )}
                >
                  <StatusIcon status={step.status} />
                </TimelineIndicator>
              </TimelineHeader>
              <TimelineContent className="mt-2">
                <Frame stacked dense spacing="sm">
                  <Collapsible
                    defaultOpen={step.id === 2}
                    className="group/collapsible"
                  >
                    <CollapsibleTrigger
                      type="button"
                      className="flex w-full min-w-0 overflow-hidden"
                      aria-label={`Toggle ${step.title} details`}
                    >
                      <FrameHeader className="flex min-w-0 grow flex-row items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="size-5">
                            <AvatarImage
                              src={step.owner.avatar}
                              alt={step.owner.name}
                            />
                            <AvatarFallback className="text-[9px]">
                              {step.owner.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                            {step.owner.name} / {step.owner.role}
                          </span>
                        </div>
                        <ChevronRightIcon
                          className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-open/collapsible:rotate-90"
                          aria-hidden="true"
                        />
                      </FrameHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <FramePanel className="space-y-3.5">
                        <FeedbackContent feedback={step.feedback} />
                      </FramePanel>
                    </CollapsibleContent>
                  </Collapsible>
                </Frame>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </FramePanel>
    </Frame>
  )
}
