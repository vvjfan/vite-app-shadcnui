import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"

import { Logo } from "./logo"
import { NavMain } from "./nav-main"
import { NavSavedViews } from "./nav-saved-views"
import { NavWorkspace } from "./nav-workspace"
import { NotificationsPopover } from "./notifications-popover"
import { SearchForm } from "./search-form"
import { SpendingLimit } from "./spending-limit"

// ── Sidebar Rail Toggle (from sidebar-1 pattern) ──

function SidebarRailToggle() {
  const { state, toggleSidebar } = useSidebar()
  const isExpanded = state === "expanded"

  return (
    <button
      type="button"
      aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
      onClick={toggleSidebar}
      style={{
        left: isExpanded ? "var(--sidebar-width)" : "var(--sidebar-width-icon)",
      }}
      className={cn(
        // Desktop only: below md there is no docked sidebar to widen, so the rail
        // would float over the page as an artifact and a stray tab stop.
        "group/rail fixed top-1/2 z-30 hidden h-12 w-7 -translate-y-1/2 cursor-pointer items-center pl-2 outline-none md:flex",
        "transition-[left] duration-200 ease-linear"
      )}
    >
      <span className="flex flex-col items-center">
        <span
          aria-hidden="true"
          className={cn(
            "block h-2 w-0.5 rounded-t-full bg-foreground/40",
            "origin-bottom transition-all duration-100 ease-linear",
            isExpanded
              ? "group-hover/rail:rotate-40 group-hover/rail:bg-foreground/60"
              : "group-hover/rail:-rotate-40 group-hover/rail:bg-foreground/60"
          )}
        />
        <span
          aria-hidden="true"
          className={cn(
            "block h-2 w-0.5 rounded-b-full bg-foreground/40",
            "origin-top transition-all duration-100 ease-linear",
            isExpanded
              ? "group-hover/rail:-rotate-40 group-hover/rail:bg-foreground/60"
              : "group-hover/rail:rotate-40 group-hover/rail:bg-foreground/60"
          )}
        />
      </span>

      <span
        className={cn(
          "absolute left-full -ml-2 border border-border bg-foreground px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-background shadow-xs shadow-black/5",
          "rounded-md",
          "pointer-events-none transition-all duration-200 ease-out",
          "-translate-x-0.5 opacity-0",
          "group-hover/rail:translate-x-0 group-hover/rail:opacity-100"
        )}
      >
        {isExpanded ? "Collapse" : "Expand"}
      </span>
    </button>
  )
}

// ── App Sidebar ──

export function AppSidebar() {
  return (
    <>
      <Sidebar collapsible="icon" className="dark">
        {/* Header */}
        <SidebarHeader className="flex flex-row items-center justify-between in-data-[state=collapsed]:flex-col in-data-[state=collapsed]:items-start in-data-[state=collapsed]:justify-center">
          <div className="inline-flex min-h-10 items-center gap-2 px-0.5 transition-all duration-200 ease-linear">
            <Logo className="text-white" />
            <span className="text-sm font-medium text-zinc-100 in-data-[state=collapsed]:hidden">
              ReUI
            </span>
          </div>

          <div className="inline-flex items-center gap-0.5 in-data-[state=collapsed]:mx-auto in-data-[state=collapsed]:flex-col">
            <NotificationsPopover />
          </div>
        </SidebarHeader>

        {/* Sidebar */}
        <SidebarContent>
          <div className="py-2">
            <SearchForm />
          </div>

          {/* The nav landmark lets screen readers jump to (or past) the whole
              menu; SidebarContent is gap-0, so the wrapper changes no layout. */}
          <nav aria-label="Main" className="flex flex-col">
            <NavMain />
            <NavSavedViews />
          </nav>

          <div className="mt-auto">
            <SpendingLimit />
          </div>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="pb-2">
          <NavWorkspace />
        </SidebarFooter>
      </Sidebar>

      {/* Rendered outside the dark sidebar so the rail tick follows the content theme (visible on the light seam) and is not clipped by the sidebar overflow. */}
      <SidebarRailToggle />
    </>
  )
}
