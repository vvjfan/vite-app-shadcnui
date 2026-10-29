import { ProviderFailoverTimeline } from "./provider-failover-timeline"
import { ProviderMetricCards } from "./provider-metric-cards"
import { RoutingRuleGrid } from "./routing-rule-grid"
import { TokenActivityChart } from "./token-activity-chart"

export function Dashboard() {
  return (
    <div className="@container flex w-full flex-col gap-4.5">
      <ProviderMetricCards />

      <div className="grid auto-rows-fr items-stretch gap-4.5 @5xl:grid-cols-3">
        <div className="min-w-0">
          <ProviderFailoverTimeline />
        </div>
        <div className="min-w-0 @5xl:col-span-2">
          <TokenActivityChart />
        </div>
      </div>

      <RoutingRuleGrid />
    </div>
  )
}
