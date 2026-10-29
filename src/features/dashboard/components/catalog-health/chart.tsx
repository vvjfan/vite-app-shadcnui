import { useState } from "react"
import type { ComponentProps } from "react"
import { Link } from "@tanstack/react-router"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FramePanel,
} from "@/components/reui/frame"
import { Line, LineChart, XAxis } from "recharts"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  chartConfig,
  performanceMetrics,
  performanceSummaries,
  PERIODS,
} from "./data"
import type { PerformanceMetric, MetricTone, PeriodKey } from "./data"
import { DotField } from "./dot-field"
import {
  QuestionIcon as HelpCircleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react"

// Each delta renders as a tone-colored chip so health reads at a glance.
const toneBadgeVariant: Record<
  MetricTone,
  ComponentProps<typeof Badge>["variant"]
> = {
  positive: "success-light",
  negative: "destructive-light",
  warning: "warning-light",
  neutral: "secondary",
}

const MiniTrendTooltip = ({
  active,
  payload,
  metric,
}: {
  active?: boolean
  payload?: {
    value: number
    payload: { marker: string; value: number }
  }[]
  metric: PerformanceMetric
}) => {
  if (active && payload && payload.length) {
    const point = payload[0].payload

    return (
      <div className="min-w-28 rounded-lg border bg-popover p-2.5 shadow-sm">
        <div className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {metric.label} / {point.marker}
        </div>
        <div className="text-sm font-semibold text-popover-foreground tabular-nums">
          {point.value.toLocaleString()} {metric.unit}
        </div>
      </div>
    )
  }

  return null
}

function MiniTrendChart({ metric }: { metric: PerformanceMetric }) {
  return (
    <ChartContainer
      config={chartConfig}
      initialDimension={{ width: 104, height: 48 }}
      className="aspect-auto h-12 w-full min-w-0 opacity-75 sm:w-24 sm:shrink-0"
      aria-label={`${metric.label} trend`}
    >
      <LineChart
        data={metric.chartData}
        margin={{ top: 6, right: 2, bottom: 6, left: 2 }}
      >
        <XAxis dataKey="marker" hide />
        <ChartTooltip content={<MiniTrendTooltip metric={metric} />} />
        <Line
          type="natural"
          dataKey="value"
          stroke="var(--color-trend)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{
            r: 2.5,
            fill: "var(--background)",
            stroke: "var(--color-trend)",
            strokeWidth: 1.5,
          }}
          isAnimationActive={false}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </LineChart>
    </ChartContainer>
  )
}

function MetricCell({
  metric,
  index,
  isLast,
}: {
  metric: PerformanceMetric
  index: number
  isLast: boolean
}) {
  const leadingDividerVisibility =
    index === 0 ? null : index === 2 ? "lg:block" : "sm:block"

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 border-border/70 py-3 sm:py-0",
        isLast ? "pr-2" : "pe-5",
        index > 0 && "border-t sm:border-t-0",
        index >= 2 && "sm:border-t lg:border-t-0"
      )}
    >
      {leadingDividerVisibility && (
        <div
          className={cn(
            "mb-2 hidden h-18 w-px shrink-0 self-center bg-border/70",
            leadingDividerVisibility
          )}
          aria-hidden
        />
      )}
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col",
          index === 0 ? "ps-1.5" : "ps-1.5 sm:ps-5"
        )}
      >
        <div className="mb-2 flex min-w-0 items-center gap-2">
          {metric.icon}
          <span className="text-xs font-medium whitespace-nowrap">
            {metric.label}
          </span>
        </div>

        {/* The caption row spans the cell rather than sharing it with the
            sparkline, which ellipsised the longer captions at 1280px. */}
        <div className="flex min-h-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <span className="text-xl font-semibold">{metric.value}</span>
            <MiniTrendChart metric={metric} />
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <Badge variant={toneBadgeVariant[metric.tone]} size="sm">
              {metric.delta}
            </Badge>
            <span className="truncate text-xs text-muted-foreground">
              {metric.summary}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Chart() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("week")
  const metrics = performanceMetrics[selectedPeriod]

  return (
    <Frame dense className="w-full text-foreground">
      <FramePanel className="isolate [&::before]:z-0">
        {/* Dot field, anchored at the top and fading out by the middle */}
        <DotField className="[mask-image:linear-gradient(to_bottom,black,transparent_70%)] text-muted-foreground" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col gap-4 px-1.5 pt-1 pb-1 sm:flex-row sm:items-start sm:justify-between">
            <div className="mb-5 flex min-w-0 flex-col gap-1">
              <h2 className="text-sm font-semibold">Performance Overview</h2>
            </div>

            <Tabs
              value={selectedPeriod}
              onValueChange={(value) => setSelectedPeriod(value as PeriodKey)}
              className="w-full shrink-0 sm:w-auto"
            >
              <TabsList className="grid h-9 w-full grid-cols-3 sm:w-auto">
                {PERIODS.map((period) => (
                  <TabsTrigger
                    key={period.value}
                    value={period.value}
                    className="text-xs sm:min-w-16"
                  >
                    {period.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Stats */}
          <div className="grid items-stretch sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric, index) => (
              <MetricCell
                key={metric.id}
                metric={metric}
                index={index}
                isLast={index === metrics.length - 1}
              />
            ))}
          </div>
        </div>
      </FramePanel>

      {/* Footer */}
      <FrameFooter className="px-4 py-1.5! sm:flex-row sm:items-center sm:justify-between">
        <FrameDescription className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HelpCircleIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {performanceSummaries[selectedPeriod]}
        </FrameDescription>
        <Button
          render={<Link to="/reports/analytics" />}
          nativeButton={false}
          variant="ghost"
          size="sm"
          className="-me-2 shrink-0 hover:text-primary"
        >
          Show full analytics
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </FrameFooter>
    </Frame>
  )
}
