import { useState } from "react"
import { Link, useLocation } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import { DialogTrigger } from "@/components/ui/dialog"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { SettingsDialog } from "@/features/settings/components/settings-dialog"
import { NAV_MAIN } from "./data"
import type { NavChild, NavItem } from "./data"
import { CaretRightIcon as ChevronRightIcon } from "@phosphor-icons/react"

function NavSubItem({ child }: { child: NavChild }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const active = child.to
    ? child.exact
      ? pathname === child.to
      : pathname === child.to || pathname.startsWith(`${child.to}/`)
    : child.isActive

  return (
    <SidebarMenuSubItem>
      {/* Sidebar */}
      <SidebarMenuSubButton
        render={child.to ? <Link to={child.to} /> : <a href="#" />}
        isActive={active}
      >
        {child.label}
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}

function NavSubMenu({ id, children }: { id: string; children: NavChild[] }) {
  return (
    <SidebarMenuSub id={`subnav-${id}`}>
      {children.map((child) => (
        <NavSubItem key={child.id} child={child} />
      ))}
    </SidebarMenuSub>
  )
}

function CollapsibleNavItem({
  item,
}: {
  item: NavItem & { children: NavChild[] }
}) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const active = item.to
    ? pathname === item.to || pathname.startsWith(`${item.to}/`)
    : item.children.some((c) => c.isActive)
  const [open, setOpen] = useState(active)

  // useState only seeds the first render, so a section entered from elsewhere
  // (search, a saved view, a link) stayed shut over its own active child.
  // Only force it open: leaving is not a reason to fight a manual collapse.
  const [previousActive, setPreviousActive] = useState(active)
  if (previousActive !== active) {
    setPreviousActive(active)
    if (active) setOpen(true)
  }

  return (
    <SidebarMenuItem>
      {/* Sidebar */}
      <SidebarMenuButton
        tooltip={item.label}
        isActive={active}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={`subnav-${item.id}`}
      >
        {item.icon}
        <span>{item.label}</span>
        <ChevronRightIcon
          className={cn(
            "ml-auto size-4 shrink-0 opacity-60 transition-transform duration-200 group-data-[collapsible=icon]:hidden",
            open && "rotate-90"
          )}
          aria-hidden="true"
        />
      </SidebarMenuButton>

      {open && <NavSubMenu id={item.id} children={item.children} />}
    </SidebarMenuItem>
  )
}

function LeafNavItem({ item }: { item: NavItem }) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const active = item.to
    ? pathname === item.to || pathname.startsWith(`${item.to}/`)
    : item.isActive

  return (
    <SidebarMenuItem>
      {/* Sidebar */}
      <SidebarMenuButton
        tooltip={item.label}
        isActive={active}
        render={item.to ? <Link to={item.to} /> : <a href="#" />}
      >
        {item.icon}
        <span>{item.label}</span>
        {item.badge !== undefined && (
          <SidebarMenuBadge>
            <div className="relative mr-1 size-1.5 rounded-full bg-emerald-500 before:absolute before:inset-0 before:animate-ping before:rounded-full before:bg-emerald-400 before:opacity-80 before:duration-1500 after:absolute after:inset-0 after:animate-ping after:rounded-full after:bg-emerald-400 after:opacity-40 after:delay-500 after:duration-1500" />
          </SidebarMenuBadge>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function DialogNavItem({ item }: { item: NavItem }) {
  return (
    <SidebarMenuItem>
      {/* Opens the settings dialog instead of navigating. */}
      <SettingsDialog>
        <SidebarMenuButton tooltip={item.label} render={<DialogTrigger />}>
          {item.icon}
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SettingsDialog>
    </SidebarMenuItem>
  )
}

export function NavMain() {
  return (
    <SidebarGroup>
      {/* Sidebar */}
      <SidebarGroupLabel className="in-data-[state=collapsed]:hidden">
        Platform
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.25">
          {NAV_MAIN.map((item) =>
            item.children ? (
              <CollapsibleNavItem
                key={item.id}
                item={item as NavItem & { children: NavChild[] }}
              />
            ) : item.dialog ? (
              <DialogNavItem key={item.id} item={item} />
            ) : (
              <LeafNavItem key={item.id} item={item} />
            )
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
