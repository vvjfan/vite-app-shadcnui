import { createContext, useContext, useState } from "react"
import type { CSSProperties, ReactNode } from "react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"

import { CalendarPanel } from "./calendar-panel"

// ── Context ──
// Desktop uses `isOpen` (in-flow width animation).
// Mobile uses `mobileOpen` (Sheet drawer) - separate state so both
// can be toggled independently from the header.

type RightSidebarContextType = {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
  mobileOpen: boolean
  toggleMobile: () => void
}

const RightSidebarContext = createContext<RightSidebarContextType>({
  isOpen: true,
  toggle: () => {},
  open: () => {},
  close: () => {},
  mobileOpen: false,
  toggleMobile: () => {},
})

export function RightSidebarProvider({ children }: { children: ReactNode }) {
  // Right context panel defaults closed (matches the deployed state).
  const [isOpen, setIsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <RightSidebarContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen((o) => !o),
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        mobileOpen,
        toggleMobile: () => setMobileOpen((o) => !o),
      }}
    >
      {children}
    </RightSidebarContext.Provider>
  )
}

export function useRightSidebar() {
  return useContext(RightSidebarContext)
}

// ── Component ──

export function RightSidebar() {
  const { isOpen, mobileOpen, toggleMobile } = useRightSidebar()
  const isMobile = useIsMobile()

  return (
    <>
      {/* Mobile - native Sheet drawer, controlled by mobileOpen from context */}
      {isMobile && (
        <Sheet
          open={mobileOpen}
          onOpenChange={(open) => !open && toggleMobile()}
        >
          <SheetContent
            side="right"
            className="w-[300px] p-0 [&>button]:hidden"
            style={{ "--sidebar-width": "300px" } as CSSProperties}
          >
            <SheetTitle className="sr-only">Context panel</SheetTitle>
            <SheetDescription className="sr-only">
              Right-side context panel with calendar and activity.
            </SheetDescription>
            <CalendarPanel />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop - in-flow, animated width */}
      {!isMobile && (
        <div
          role="complementary"
          aria-label="Context panel"
          // `inert` (not just aria-hidden) so the collapsed panel's controls
          // leave the tab order and a11y tree while the width transition stays.
          inert={!isOpen}
          className={cn(
            "sticky top-0 h-svh shrink-0 overflow-hidden",
            "flex border-l bg-background transition-[width] duration-300 ease-in-out",
            isOpen ? "w-[280px]" : "w-0"
          )}
        >
          <div className="flex w-[280px] shrink-0">
            <CalendarPanel />
          </div>
        </div>
      )}
    </>
  )
}
