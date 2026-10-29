import { useState } from "react"
import { Link, useLocation } from "@tanstack/react-router"
import { toast } from "sonner"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { SettingsDialog } from "@/features/settings/components/settings-dialog"
import { BulletSeparator } from "./bullet-separator"
import { NAV_MAIN } from "./data"
import { useRightSidebar } from "./right-sidebar"
import {
  HouseIcon,
  DotsThreeIcon as MoreHorizontalIcon,
  CopyIcon,
  ShareNetworkIcon as Share2Icon,
  DownloadSimpleIcon as DownloadIcon,
  GearIcon as SettingsIcon,
  SidebarIcon as PanelRightIcon,
} from "@phosphor-icons/react"

export function AppHeader() {
  const { isOpen, toggle, mobileOpen, toggleMobile } = useRightSidebar()
  const isMobile = useIsMobile()
  const [settingsOpen, setSettingsOpen] = useState(false)
  // Current page drives the breadcrumb leaf. Matched against NAV_MAIN (single
  // source of truth for route -> label) so the crumb, sidebar, and nav stay in sync.
  const pathname = useLocation({ select: (location) => location.pathname })
  // Breadcrumb reflects the section: the top-level nav item is the root, and a
  // matched sub-page (e.g. Tasks -> Board) is appended as the leaf.
  const currentPage = NAV_MAIN.find(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`)
  )
  const currentChild = currentPage?.children?.find(
    (child) => pathname === child.to || pathname.startsWith(`${child.to}/`)
  )
  // Home is its own breadcrumb root: show just "Home".
  const isHome = currentPage?.to === "/home"

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-(--header-height) shrink-0 items-center gap-2 bg-background",
        // Matches the page container's px-4.5 so the header lines up with content.
        "px-4.5"
      )}
    >
      {/* Left ── Mobile trigger + breadcrumb */}
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1 md:hidden" />
        <Breadcrumb>
          <BreadcrumbList>
            {isHome ? (
              <BreadcrumbItem>
                <BreadcrumbPage className="flex items-center gap-1.5">
                  <HouseIcon className="size-4" aria-hidden="true" />
                  Home
                </BreadcrumbPage>
              </BreadcrumbItem>
            ) : currentPage && currentChild ? (
              <>
                <BreadcrumbItem className="hidden items-center md:flex">
                  <BreadcrumbLink render={<Link to={currentPage.to ?? "/"} />}>
                    {currentPage.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden items-center md:flex">
                  <BulletSeparator />
                </BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentChild.label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {currentPage?.label ?? "Overview"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Right ── Filters, team, actions */}
      <div
        role="toolbar"
        aria-label="Header actions"
        className="ml-auto flex shrink-0 items-center gap-3"
      >
        <AvatarGroup>
          <Avatar className="size-6">
            <AvatarImage
              src="https://images.unsplash.com/photo-1485206412256-701ccc5b93ca?w=96&h=96&dpr=2&q=80"
              alt="Nick Johnson"
            />
            <AvatarFallback>NJ</AvatarFallback>
          </Avatar>
          <Avatar className="size-6">
            <AvatarImage
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80"
              alt="Alex Johnson (away)"
            />
            <AvatarFallback>AJ</AvatarFallback>
          </Avatar>
          <Avatar className="size-6">
            <AvatarImage
              src="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=96&h=96&dpr=2&q=80"
              alt="Sarah Chen"
            />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
        </AvatarGroup>

        <Separator orientation="vertical" className="my-auto h-4" />

        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="More options"
                className="shrink-0 text-muted-foreground"
              />
            }
          >
            <MoreHorizontalIcon aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  void navigator.clipboard?.writeText(window.location.href)
                  toast.success("Link copied", {
                    description: "This view's link is on your clipboard.",
                  })
                }}
              >
                <CopyIcon aria-hidden="true" />
                Copy link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.success("Schedule shared", {
                    description: "A view-only schedule link is ready to share.",
                  })
                }
              >
                <Share2Icon aria-hidden="true" />
                Share schedule
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  toast.success("Export ready", {
                    description: "Your workspace summary is downloading.",
                  })
                }
              >
                <DownloadIcon aria-hidden="true" />
                Export
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  // Defer so the menu finishes closing before the dialog opens,
                  // avoiding the close/open pointer race that would dismiss it.
                  requestAnimationFrame(() => setSettingsOpen(true))
                }}
              >
                <SettingsIcon aria-hidden="true" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings dialog opened from the More-options menu (controlled). */}
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

        {/* Right panel toggle - mobile opens Sheet, desktop animates in-flow width */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={isMobile ? toggleMobile : toggle}
          aria-label={
            (isMobile ? mobileOpen : isOpen)
              ? "Close context panel"
              : "Open context panel"
          }
          aria-expanded={isMobile ? mobileOpen : isOpen}
        >
          <PanelRightIcon aria-hidden="true" />
        </Button>
      </div>
    </header>
  )
}
