import { Outlet, createFileRoute } from "@tanstack/react-router"
import { useTheme } from "@/components/theme-provider"
import { Toaster } from "sonner"

import { TooltipProvider } from "@/components/ui/tooltip"
import { AppShell } from "@/features/app-shell/components/app-shell"

// Client-side layout shared by all dashboard routes.
export const Route = createFileRoute("/_app")({
  component: AppLayout,
})

function AppLayout() {
  // Signed-in surfaces (e.g. the AI Ops routing grid) fire sonner toasts; mount the
  // Toaster once here, theme-matched to the app theme provider so it tracks light/dark.
  const { resolvedTheme } = useTheme()

  return (
    <TooltipProvider>
      {/* First tab stop on every signed-in page: parks off-screen until focused so a
          keyboard user can jump past the sidebar instead of tabbing through it. */}
      <a
        href="#main-content"
        className="fixed start-2 top-2 z-50 -translate-y-16 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium whitespace-nowrap shadow-xs focus:translate-y-0"
      >
        Skip to main content
      </a>
      <AppShell>
        {/* tabIndex -1 so the skip link's target actually takes focus, not just scroll */}
        <div
          id="main-content"
          tabIndex={-1}
          className="flex flex-1 flex-col gap-4.5 outline-none"
        >
          <Outlet />
        </div>
      </AppShell>
      <Toaster theme={resolvedTheme === "dark" ? "dark" : "light"} />
    </TooltipProvider>
  )
}
