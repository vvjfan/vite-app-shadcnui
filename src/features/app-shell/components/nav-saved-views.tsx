import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/reui/badge"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { SAVED_VIEWS } from "./data"
import type { SavedView } from "./data"
import { CaretDownIcon as ChevronDownIcon } from "@phosphor-icons/react"

// ── Saved View Item ──

function SavedViewItem({ view }: { view: SavedView }) {
  return (
    <SidebarMenuItem>
      {/* A saved filter that opens the matching task view */}
      <SidebarMenuButton tooltip={view.name} render={<Link to={view.to} />}>
        {view.icon}
        <span className="min-w-0 flex-1 truncate text-sm">{view.name}</span>
        <Badge variant={view.countVariant} className="shrink-0 tabular-nums">
          {view.count}
        </Badge>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

// ── Nav Saved Views ──

export function NavSavedViews() {
  const [open, setOpen] = useState(true)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      {/* Sidebar */}
      <SidebarGroupLabel
        render={
          <button
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-controls="saved-views-list"
          />
        }
        className="w-full cursor-pointer focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
      >
        Saved Views
        <ChevronDownIcon
          className={cn(
            "ml-auto size-4 shrink-0 opacity-60 transition-transform duration-200",
            !open && "-rotate-90"
          )}
          aria-hidden="true"
        />
      </SidebarGroupLabel>

      {open && (
        <SidebarGroupContent id="saved-views-list">
          <SidebarMenu className="gap-0.25">
            {SAVED_VIEWS.map((view) => (
              <SavedViewItem key={view.id} view={view} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      )}
    </SidebarGroup>
  )
}
