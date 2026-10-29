import { Badge } from "@/components/reui/badge"
import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import { Separator } from "@/components/ui/separator"

import { providerMetrics } from "./data"

export function ProviderMetricCards() {
  return (
    <div className="grid auto-rows-fr items-stretch gap-4.5 @4xl:grid-cols-3">
      {providerMetrics.map((metric) => (
        <Frame key={metric.title} dense className="h-full min-w-0">
          <FrameHeader className="flex-row items-center justify-between gap-3">
            <FrameTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </FrameTitle>
            <div className="[&_svg]:size-4 [&_svg]:text-muted-foreground">
              {metric.icon}
            </div>
          </FrameHeader>
          <FramePanel className="flex flex-1 flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-2xl font-medium tracking-tight text-foreground">
                {metric.valueBold}
                <span className="font-medium text-muted-foreground/40">
                  {metric.valueFaint}
                </span>
              </span>
              <Badge variant={metric.variant}>
                {metric.badgeIcon != null && metric.badgeIcon}
                <span>{metric.badge}</span>
              </Badge>
            </div>
            <Separator />
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">
                {metric.description}
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.comparisonLabel}:{" "}
                <span className="font-medium text-foreground">
                  {metric.comparisonValue}
                </span>
              </div>
            </div>
          </FramePanel>
        </Frame>
      ))}
    </div>
  )
}
