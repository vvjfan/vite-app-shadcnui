import { useState } from "react"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { cn } from "@/lib/utils"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  chartConfig,
  funnelData,
  periodChanges,
  rangeOptions,
  stageMetrics,
} from "./data"
import type { PeriodKey } from "./data"
import {
  TrendUpIcon as TrendingUp,
  TrendDownIcon as TrendingDown,
} from "@phosphor-icons/react"

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: {
    dataKey: string
    color: string
    value: number
    payload: unknown
  }[]
  label?: string
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="min-w-[200px] rounded-lg border bg-popover p-4 shadow-lg backdrop-blur-sm">
        <div className="mb-3.5 border-b border-border/50 pb-2 text-sm font-semibold text-popover-foreground">
          {label}
        </div>
        <div className="space-y-1.5">
          {stageMetrics.map((stage) => {
            const dataPoint = payload.find((p) => p.dataKey === stage.key)
            const value = dataPoint?.value || 0
            return (
              <div
                key={stage.key}
                className="flex items-center justify-between gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 rounded-sm"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-medium text-muted-foreground">
                    {stage.label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-popover-foreground">
                  {value.toLocaleString()}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  return null
}

export function ActivationFunnelChart() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("30d")
  const currentData = funnelData[selectedPeriod] || []
  const latestData = currentData[currentData.length - 1] || {}

  return (
    <Frame dense className="flex h-full w-full flex-col">
      <FrameHeader className="flex flex-row items-center justify-between gap-2 px-2! py-1.5!">
        <FrameTitle>Activation Funnel</FrameTitle>
        <Select
          value={selectedPeriod}
          onValueChange={(value) => {
            if (value) setSelectedPeriod(value)
          }}
          items={rangeOptions}
        >
          <SelectTrigger className="w-fit min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className="w-40"
            align="start"
          >
            {rangeOptions.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FrameHeader>
      <FramePanel className="flex flex-1 flex-col gap-6">
        <div className="grid grid-cols-2 gap-6 p-2 md:grid-cols-4">
          {stageMetrics.map((stage) => {
            const value = latestData[
              stage.key as keyof typeof latestData
            ] as number
            const change = periodChanges[selectedPeriod]?.[stage.key] ?? 0
            return (
              <div key={stage.key} className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="h-12 w-0.5 rounded-full bg-border" />
                  <div className="flex flex-col gap-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      {stage.label}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base leading-none font-semibold">
                        {value?.toLocaleString()}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium [&_svg]:size-4",
                          change >= 0 ? "text-emerald-500" : "text-destructive"
                        )}
                      >
                        {change >= 0 ? (
                          <TrendingUp aria-hidden="true" />
                        ) : (
                          <TrendingDown aria-hidden="true" />
                        )}
                        {Math.abs(change)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <ChartContainer
          config={chartConfig}
          className="mt-auto h-[250px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={currentData}
            margin={{ top: 10, bottom: 10, left: 5, right: 5 }}
          >
            <defs>
              <linearGradient
                id="fillAccountCreated"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-accountCreated)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-accountCreated)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillInviteSent" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-inviteSent)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-inviteSent)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillSavedReport" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-savedReport)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-savedReport)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="fillWeekFourRetained"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-weekFourRetained)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-weekFourRetained)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="var(--border)"
            />
            <XAxis
              dataKey="period"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tick={{ fontSize: 12 }}
            />
            <YAxis hide />
            <ChartTooltip content={<CustomTooltip />} />
            <Area
              dataKey="weekFourRetained"
              type="natural"
              fill="url(#fillWeekFourRetained)"
              stroke="var(--color-weekFourRetained)"
              stackId="a"
              isAnimationActive={false}
            />
            <Area
              dataKey="savedReport"
              type="natural"
              fill="url(#fillSavedReport)"
              stroke="var(--color-savedReport)"
              stackId="a"
              isAnimationActive={false}
            />
            <Area
              dataKey="inviteSent"
              type="natural"
              fill="url(#fillInviteSent)"
              stroke="var(--color-inviteSent)"
              stackId="a"
              isAnimationActive={false}
            />
            <Area
              dataKey="accountCreated"
              type="natural"
              fill="url(#fillAccountCreated)"
              stroke="var(--color-accountCreated)"
              stackId="a"
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartContainer>
      </FramePanel>
    </Frame>
  )
}
