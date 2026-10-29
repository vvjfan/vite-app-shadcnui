import { useState, useSyncExternalStore } from "react"
import type { ReactNode } from "react"
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  activityRangeOptions,
  tokenActivityChartConfig,
  tokenActivityData,
} from "./data"
import type { DashboardPeriodKey } from "./data"

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: {
    dataKey: string
    color: string
    value: number
    payload: unknown
  }[]
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="min-w-[120px] space-y-1.5 border bg-popover p-3 text-popover-foreground shadow-lg">
        {payload.map((item) => (
          <div key={item.dataKey}>
            <div className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
              {item.dataKey}:
            </div>
            <div className="text-sm font-semibold tabular-nums">
              {item.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}

const ChartLegendItem = ({
  label,
  color,
}: {
  label: string
  color: string
}) => (
  <div className="flex items-center gap-2">
    <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
  </div>
)

function subscribeToStore() {
  return () => {}
}

function ChartRenderGate({
  children,
  className,
}: {
  children: ReactNode
  className: string
}) {
  const mounted = useSyncExternalStore(
    subscribeToStore,
    () => true,
    () => false
  )

  if (!mounted) {
    return <div className={className} aria-hidden="true" />
  }

  return children
}

export function TokenActivityChart() {
  const [selectedPeriod, setSelectedPeriod] =
    useState<DashboardPeriodKey>("30d")
  const currentData = tokenActivityData[selectedPeriod]

  return (
    <Frame dense className="h-full w-full">
      <FrameHeader className="flex-col gap-3 @4xl:flex-row @4xl:items-center @4xl:justify-between">
        <div className="flex flex-col gap-0.5">
          <FrameTitle className="text-base font-semibold">
            Token Activity
          </FrameTitle>
          <FrameDescription className="text-xs">
            Input, output, and blocked calls
          </FrameDescription>
        </div>
        <Select
          value={selectedPeriod}
          onValueChange={(value) =>
            setSelectedPeriod(value as DashboardPeriodKey)
          }
          items={activityRangeOptions}
        >
          <SelectTrigger className="w-fit min-w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            className="w-40"
            align="start"
          >
            {activityRangeOptions.map((period) => (
              <SelectItem key={period.value} value={period.value}>
                {period.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FrameHeader>

      <FramePanel className="flex flex-1 flex-col">
        <div className="mt-auto space-y-6">
          <ChartRenderGate className="-ms-4 h-[300px] w-full">
            <ChartContainer
              config={tokenActivityChartConfig}
              className="-ms-4 h-[300px] w-full"
            >
              <LineChart
                data={currentData}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="4 8"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  tickMargin={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 }}
                  tickMargin={10}
                />
                <ChartTooltip content={<CustomTooltip />} />
                <Line
                  dataKey="input"
                  type="monotone"
                  stroke="var(--color-blue-600)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="output"
                  type="monotone"
                  stroke="var(--color-orange-500)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="blocked"
                  type="monotone"
                  stroke="var(--color-slate-600)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          </ChartRenderGate>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <ChartLegendItem
              label="Input"
              color={tokenActivityChartConfig.input.color}
            />
            <ChartLegendItem
              label="Output"
              color={tokenActivityChartConfig.output.color}
            />
            <ChartLegendItem
              label="Blocked"
              color={tokenActivityChartConfig.blocked.color}
            />
          </div>
        </div>
      </FramePanel>
    </Frame>
  )
}
