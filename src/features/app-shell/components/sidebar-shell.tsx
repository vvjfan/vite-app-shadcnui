import { useEffect } from "react"
import type { CSSProperties, ReactNode } from "react"

import { cn } from "@/lib/utils"
import {
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar"

import { AppSidebar } from "./app-sidebar"
import { RightSidebar, RightSidebarProvider } from "./right-sidebar"

// ─────────────────────────────────────────────────────────────────────────────
// Theme tokens
//
// These CSS custom properties power the dark-zinc sidebar palette.
// Swap any value here to retheme the sidebar across both desktop and mobile.
// ─────────────────────────────────────────────────────────────────────────────

const SIDEBAR_STYLE = {
  "--sidebar-width": "250px",
  "--header-height": "50px",
  "--sidebar": "var(--color-zinc-900)",
  "--sidebar-foreground": "var(--color-zinc-100)",
  "--sidebar-border":
    "color-mix(in oklab, var(--color-zinc-700) 60%, transparent)",
  "--sidebar-accent": "var(--color-zinc-800)",
  "--sidebar-accent-foreground": "var(--color-zinc-100)",
  "--sidebar-primary": "var(--color-zinc-100)",
  "--sidebar-primary-foreground": "var(--color-zinc-900)",
  "--sidebar-ring": "var(--color-zinc-500)",
}

// ─────────────────────────────────────────────────────────────────────────────
// Behavioral classes
//
// Each entry is a group of space-separated Tailwind classes for one concern.
// Add, remove, or edit entries here to change interactive states globally.
// ─────────────────────────────────────────────────────────────────────────────

const SIDEBAR_THEME_CLASSES = [
  // Active nav buttons - background + text + icon
  "[&_[data-slot=sidebar-menu-button][data-active]]:bg-zinc-800! [&_[data-slot=sidebar-menu-button][data-active]]:hover:bg-zinc-800! [&_[data-slot=sidebar-menu-button][data-active]]:text-zinc-50 [&_[data-slot=sidebar-menu-button][data-active]>svg]:opacity-100 [&_[data-slot=sidebar-menu-button][data-active]>svg]:text-white",
  // Idle + hover nav buttons
  "**:data-[slot=sidebar-menu-button]:text-zinc-400 **:data-[slot=sidebar-menu-button]:hover:bg-zinc-800! **:data-[slot=sidebar-menu-button]:hover:text-zinc-100 [&_[data-slot=sidebar-menu-button]>svg]:opacity-50 [&_[data-slot=sidebar-menu-button]:hover>svg]:opacity-100",
  // Active sub-nav buttons
  "[&_[data-slot=sidebar-menu-sub-button][data-active]]:bg-zinc-800! [&_[data-slot=sidebar-menu-sub-button][data-active]]:hover:bg-zinc-800! [&_[data-slot=sidebar-menu-sub-button][data-active]]:text-zinc-50 [&_[data-slot=sidebar-menu-sub-button][data-active]>svg]:opacity-100 [&_[data-slot=sidebar-menu-sub-button][data-active]>svg]:text-white",
  // Idle + hover sub-nav buttons
  "**:data-[slot=sidebar-menu-sub-button]:text-zinc-400 **:data-[slot=sidebar-menu-sub-button]:hover:bg-zinc-800! **:data-[slot=sidebar-menu-sub-button]:hover:text-zinc-100 [&_[data-slot=sidebar-menu-sub-button]>svg]:opacity-50 [&_[data-slot=sidebar-menu-sub-button]:hover>svg]:opacity-100",
] as const

// Pre-split into individual tokens for classList.add / classList.remove
const SIDEBAR_CLASS_TOKENS = SIDEBAR_THEME_CLASSES.flatMap((c) => c.split(" "))

// ─────────────────────────────────────────────────────────────────────────────
// useMobileBodyTheme
//
// On mobile the sidebar renders as a Sheet portalled to <body>, so it sits
// outside SidebarProvider's DOM subtree. This hook injects the theme classes
// and CSS custom properties directly onto document.body while on mobile and
// cleans them up when the viewport returns to desktop.
// ─────────────────────────────────────────────────────────────────────────────

function useMobileBodyTheme(isMobile: boolean) {
  useEffect(() => {
    if (!isMobile) return

    const body = document.body

    body.classList.add(...SIDEBAR_CLASS_TOKENS)

    const prev: Record<string, string> = {}
    for (const [prop, value] of Object.entries(SIDEBAR_STYLE)) {
      prev[prop] = body.style.getPropertyValue(prop)
      body.style.setProperty(prop, value)
    }

    return () => {
      body.classList.remove(...SIDEBAR_CLASS_TOKENS)
      for (const [prop, prevValue] of Object.entries(prev)) {
        if (prevValue) body.style.setProperty(prop, prevValue)
        else body.style.removeProperty(prop)
      }
    }
  }, [isMobile])
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarBody
//
// Thin wrapper around SidebarInset that activates useMobileBodyTheme.
// ─────────────────────────────────────────────────────────────────────────────

function SidebarBody({ children }: { children: ReactNode }) {
  const { isMobile } = useSidebar()
  useMobileBodyTheme(isMobile)

  return (
    <SidebarInset className="ml-0! min-h-svh overflow-y-auto">
      {children}
    </SidebarInset>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarShell
//
// Top-level layout shell. Composes the right-sidebar context, the themed
// SidebarProvider (desktop), the app sidebar, the page body, and the right panel.
// ─────────────────────────────────────────────────────────────────────────────

export function SidebarShell({ children }: { children: ReactNode }) {
  return (
    <RightSidebarProvider>
      {/* Sidebar */}
      <SidebarProvider
        className={cn("h-screen", ...SIDEBAR_THEME_CLASSES)}
        style={SIDEBAR_STYLE as CSSProperties}
      >
        <AppSidebar />
        <SidebarBody>{children}</SidebarBody>
        <RightSidebar />
      </SidebarProvider>
    </RightSidebarProvider>
  )
}
