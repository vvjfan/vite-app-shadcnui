import { AcquisitionMixChart } from "./acquisition-mix-chart"
import { ActivationFunnelChart } from "./activation-funnel-chart"
import { StageBreakdownGrid } from "./stage-breakdown-grid"

export function ActivationReport() {
  return (
    <div className="@container flex w-full flex-col gap-4.5">
      <div className="grid grid-cols-1 items-stretch gap-4.5 @5xl:auto-rows-fr @5xl:grid-cols-12">
        <div className="flex h-full @5xl:col-span-8">
          <ActivationFunnelChart />
        </div>
        <div className="flex h-full @5xl:col-span-4">
          <AcquisitionMixChart />
        </div>
      </div>
      <StageBreakdownGrid />
    </div>
  )
}
