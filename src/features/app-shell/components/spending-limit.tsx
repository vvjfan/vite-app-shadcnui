import {
  Frame,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"

import { Progress } from "@/components/ui/progress"
import { SidebarGroup } from "@/components/ui/sidebar"

const AI_USAGE = {
  used: 8240,
  total: 10000,
  label: "Usage Limit",
  resetLabel: "Your usage resets at the end of the month",
} as const

export function SpendingLimit() {
  const pct = Math.round((AI_USAGE.used / AI_USAGE.total) * 100)
  const freePct = 100 - pct

  return (
    <SidebarGroup className="overflow-hidden group-data-[collapsible=icon]:hidden">
      <Frame
        spacing="sm"
        dense
        className="mx-auto shrink-0 overflow-hidden border border-zinc-700 bg-zinc-900/90 md:w-[230px]"
      >
        <FrameHeader className="bg-zinc-900/90">
          <FrameTitle className="text-xs text-warning">
            {AI_USAGE.label}
          </FrameTitle>
        </FrameHeader>
        <FramePanel className="space-y-3 border-zinc-700 bg-zinc-900/80 text-zinc-100">
          <p className="text-xs leading-snug text-zinc-400">
            {AI_USAGE.resetLabel}
          </p>

          <div className="relative h-1.5 overflow-hidden rounded-sm bg-muted/55">
            <div
              className="pointer-events-none absolute inset-0 text-white opacity-20"
              aria-hidden="true"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(-45deg, currentColor 0, currentColor 1px, transparent 0, transparent 4px)",
              }}
            />
            <Progress
              value={pct}
              className="absolute inset-0 gap-0 **:data-[slot=progress-indicator]:rounded-none **:data-[slot=progress-indicator]:bg-success **:data-[slot=progress-track]:h-full **:data-[slot=progress-track]:rounded-none **:data-[slot=progress-track]:bg-transparent"
            />
          </div>

          <div className="flex items-center justify-between text-xs leading-none text-zinc-300">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-zinc-100">{pct}%</span>
              <span className="text-zinc-400">Used</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-zinc-100">{freePct}%</span>
              <span className="text-zinc-400">Free</span>
            </div>
          </div>
        </FramePanel>
      </Frame>
    </SidebarGroup>
  )
}
