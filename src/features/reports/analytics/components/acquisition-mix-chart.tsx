import { useMemo, useState } from "react"
import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import { LabelList, Pie, PieChart } from "recharts"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Item, ItemMedia } from "@/components/ui/item"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MIX_PERIODS, mixChartConfig, segmentMixData } from "./data"
import type { MixPeriodKey } from "./data"
import {
  TrendUpIcon as TrendingUp,
  ChartPieIcon as PieChartIcon,
  InfoIcon,
} from "@phosphor-icons/react"

const SOURCE_LABELS: Record<string, string> = {
  organic: "Organic Trial",
  partner: "Partner Led",
  sales: "Sales Assisted",
  imported: "Imported",
  dormant: "Dormant",
}

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean
  payload?: {
    name: string
    color: string
    value: number
    payload: { source: string }
  }[]
}) => {
  if (active && payload && payload.length) {
    const source = payload[0].payload.source

    return (
      <div className="min-w-[150px] rounded-lg border bg-popover p-4 shadow-lg backdrop-blur-sm">
        <div className="mb-3 border-b border-border/50 pb-2 text-sm font-semibold tracking-wider text-popover-foreground uppercase">
          {SOURCE_LABELS[source] ?? source}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="size-2 rounded-sm"
              style={{ backgroundColor: payload[0].color }}
            />
            <span className="text-xs font-medium text-muted-foreground">
              Workspaces
            </span>
          </div>
          <span className="text-sm font-semibold text-popover-foreground">
            {payload[0].value.toLocaleString()}
          </span>
        </div>
      </div>
    )
  }
  return null
}

export function AcquisitionMixChart() {
  const [selectedPeriod, setSelectedPeriod] = useState<MixPeriodKey>("5D")

  const { currentData, totalWorkspaces } = useMemo(() => {
    const data = segmentMixData[selectedPeriod] || []
    const total = data.reduce((sum, item) => sum + item.workspaces, 0)
    return { currentData: data, totalWorkspaces: total }
  }, [selectedPeriod])

  return (
    <Frame dense className="flex h-full w-full flex-col">
      <FrameHeader className="flex flex-row items-center justify-between gap-2 px-2! py-1.5!">
        <div className="flex items-center gap-2">
          <FrameTitle>Segment Mix</FrameTitle>
          <Badge variant="success-light" className="gap-1 border-none">
            <TrendingUp className="size-3.5" aria-hidden="true" />
            <span>+8.6%</span>
          </Badge>
        </div>
        <Button
          variant="outline"
          onClick={() =>
            toast.success("Summary exported", {
              description: "Segment mix summary is ready.",
            })
          }
        >
          Export
        </Button>
      </FrameHeader>

      <FramePanel className="flex flex-1 flex-col gap-6">
        <div className="flex flex-1 flex-col gap-6">
          <div className="flex items-center gap-3 px-2">
            <Item className="flex size-10.5 items-center justify-center border-2 border-background bg-muted p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-5 [&_svg]:text-accent-foreground">
              <ItemMedia variant="icon" className="size-auto">
                <PieChartIcon aria-hidden="true" />
              </ItemMedia>
            </Item>
            <div>
              <div className="text-sm font-medium text-muted-foreground">
                Activated Workspaces
              </div>
              <div className="text-2xl font-bold">
                {totalWorkspaces.toLocaleString()}
              </div>
            </div>
          </div>

          <Tabs
            value={selectedPeriod}
            onValueChange={(value) => {
              if (value) setSelectedPeriod(value as MixPeriodKey)
            }}
            className="w-full"
          >
            <TabsList className="w-full">
              {Object.values(MIX_PERIODS).map((period) => (
                <TabsTrigger
                  key={period.key}
                  value={period.key}
                  className="flex-1 data-active:shadow-sm"
                >
                  {period.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <ChartContainer
            config={mixChartConfig}
            className="mx-auto mt-auto aspect-square max-h-[200px] w-full overflow-visible"
          >
            <PieChart className="overflow-visible">
              <ChartTooltip content={<CustomTooltip />} />
              <Pie
                data={currentData}
                innerRadius={35}
                outerRadius={100}
                dataKey="workspaces"
                nameKey="source"
                strokeWidth={4}
                stroke="var(--background)"
                cornerRadius={8}
                paddingAngle={2}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="workspaces"
                  stroke="none"
                  fontSize={10}
                  fontWeight={600}
                  fill="white"
                  formatter={(value) =>
                    typeof value === "number" && value >= 1000
                      ? `${(value / 1000).toFixed(1)}k`
                      : value
                  }
                />
              </Pie>
            </PieChart>
          </ChartContainer>

          <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
            <InfoIcon className="size-3.5" aria-hidden="true" />
            <span>Mix reflects retained workspaces in the active cohort.</span>
          </div>
        </div>
      </FramePanel>
    </Frame>
  )
}
