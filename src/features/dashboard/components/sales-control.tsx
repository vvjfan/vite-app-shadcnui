import { ChannelChart, RevenueChart } from "./analytics-charts"
import type { ChannelFocus } from "./analytics-charts"
import type { Period } from "./data"

export function SalesControl({
  period,
  channelFocus,
  onChannelFocusToggle,
}: {
  period: Period
  channelFocus: ChannelFocus
  onChannelFocusToggle: () => void
}) {
  return (
    <section
      className="grid min-w-0 gap-4.5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]"
      aria-label="Task analytics"
    >
      <RevenueChart period={period} />
      <ChannelChart focus={channelFocus} onFocusToggle={onChannelFocusToggle} />
    </section>
  )
}
