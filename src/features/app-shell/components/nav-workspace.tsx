import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useTheme } from "@/components/theme-provider"
import { toast } from "sonner"

import { signOut } from "@/lib/auth/session"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { ProfileDialogTab } from "@/features/settings/components/data"
import { SettingsDialog } from "@/features/settings/components/settings-dialog"
import { WORKSPACES } from "./data"
import type { Workspace } from "./data"
import {
  ManageOrganizationsDialog,
  NewOrganizationDialog,
} from "./organization-dialogs"
import type { OrganizationDraft } from "./organization-dialogs"
import { findWorkspaceLogo } from "./workspace-logos"
import {
  activeWorkspace as resolveActiveWorkspace,
  addWorkspace,
  createWorkspace,
  deleteWorkspace,
  getWorkspaceInitials,
  renameWorkspace,
} from "../lib/organizations"
import {
  SunIcon,
  MoonIcon,
  MonitorIcon,
  CheckIcon,
  DotsThreeIcon as MoreHorizontalIcon,
  PlusIcon,
  SlidersHorizontalIcon,
  UserIcon,
  CreditCardIcon,
  GearIcon as SettingsIcon,
  PaletteIcon,
  SignOutIcon as LogOutIcon,
} from "@phosphor-icons/react"

// ── Constants ──

const THEMES = [
  {
    value: "light",
    label: "Light",
    icon: <SunIcon className="size-3.5" aria-hidden="true" />,
  },
  {
    value: "dark",
    label: "Dark",
    icon: <MoonIcon className="size-3.5" aria-hidden="true" />,
  },
  {
    value: "system",
    label: "System",
    icon: <MonitorIcon className="size-3.5" aria-hidden="true" />,
  },
] as const

// ── Theme Toggle ──

function ThemeSegmentedToggle() {
  const { theme, setTheme } = useTheme()
  const currentTheme = theme

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-0.5 rounded-full bg-muted/60 p-0.5"
    >
      {THEMES.map(({ value, label, icon }) => {
        const isActive = currentTheme === value
        return (
          <Button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            variant="ghost"
            size="icon-xs"
            onClick={() => setTheme(value)}
            className={cn(
              "rounded-full",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {icon}
          </Button>
        )
      })}
    </div>
  )
}

// ── Workspace Helpers ──

function WorkspaceAvatar({
  workspace,
  className,
  size = "default",
}: {
  workspace: Workspace
  className?: string
  size?: "default" | "sm" | "lg"
}) {
  const initials = getWorkspaceInitials(workspace.name)
  const logo = findWorkspaceLogo(workspace.logoId)
  return (
    <Avatar size={size} className={cn("shrink-0", className)}>
      {workspace.imageUrl ? (
        <AvatarImage src={workspace.imageUrl} alt={workspace.name} />
      ) : null}
      {/* A chosen mark stands in for the initial; the initial is still the
          fallback for organizations created before a logo was pickable. */}
      <AvatarFallback
        className={cn(
          "border border-border text-sm font-medium",
          // A drawn mark sits on white, the way the real brand avatars do (the
          // OpenAI one is a white tile). text-zinc-900 comes with it, because
          // the monochrome marks paint in currentColor and would otherwise be
          // white on white in dark mode.
          logo ? "bg-white text-zinc-900" : "bg-background text-foreground",
          workspace.avatarClassName
        )}
      >
        {/* size-full! on the svg is load-bearing: SidebarMenuButton sets
            [&_svg]:size-4 on every descendant, which forced the mark to 16px
            inside a smaller box, so it overflowed from the top-left corner and
            read as off-centre. */}
        {logo ? (
          <span className="flex size-[70%] items-center justify-center [&_svg]:size-full!">
            {logo.icon}
          </span>
        ) : (
          initials
        )}
      </AvatarFallback>
    </Avatar>
  )
}

function WorkspaceItem({
  workspace,
  isActive,
  onSelect,
}: {
  workspace: Workspace
  isActive: boolean
  onSelect: (id: string) => void
}) {
  return (
    <DropdownMenuItem onClick={() => onSelect(workspace.id)}>
      <WorkspaceAvatar workspace={workspace} className="size-5!" />
      <span className="flex-1 truncate text-sm font-medium">
        {workspace.name}
      </span>
      {isActive && (
        <CheckIcon
          className="ml-auto size-3.5 shrink-0 opacity-60"
          aria-hidden="true"
        />
      )}
    </DropdownMenuItem>
  )
}

// ── Nav Workspace ──

export function NavWorkspace() {
  const navigate = useNavigate()
  const [workspaces, setWorkspaces] = useState<Workspace[]>(WORKSPACES)
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("claude")
  const { isMobile } = useSidebar()

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<ProfileDialogTab>("profile")
  const [newOrgOpen, setNewOrgOpen] = useState(false)
  const [manageOrgsOpen, setManageOrgsOpen] = useState(false)

  // Open the settings dialog on a specific tab. Deferred a frame so the menu
  // finishes closing before the dialog opens (avoids the close/open race).
  function openSettings(tab: ProfileDialogTab) {
    setSettingsTab(tab)
    requestAnimationFrame(() => setSettingsOpen(true))
  }

  function handleSignOut() {
    signOut()
    void navigate({ to: "/sign-in", search: { redirect: "/home" } })
  }

  // Same deferral as openSettings: let the menu finish closing before the
  // dialog opens, or the close/open pointer race dismisses it immediately.
  // A timeout rather than a frame, because requestAnimationFrame does not run
  // in a background tab, which would swallow the dialog entirely.
  function openNewOrganization() {
    setTimeout(() => setNewOrgOpen(true), 0)
  }

  function openManageOrganizations() {
    setTimeout(() => setManageOrgsOpen(true), 0)
  }

  function handleCreateOrganization(draft: OrganizationDraft) {
    const workspace = createWorkspace(draft)
    setWorkspaces((prev) => addWorkspace(prev, workspace))
    // Creating an organization is an act of switching into it.
    setActiveWorkspaceId(workspace.id)
    setNewOrgOpen(false)
    toast.success("Organization created", {
      description: `You are now working in ${workspace.name}.`,
    })
  }

  function handleRenameOrganization(id: string, draft: OrganizationDraft) {
    setWorkspaces((prev) => renameWorkspace(prev, id, draft))
    toast.success("Organization updated", {
      description: `${draft.name} was saved.`,
    })
  }

  function handleDeleteOrganization(id: string) {
    const next = deleteWorkspace(workspaces, id, activeWorkspaceId)
    // The dialog disables the control at this point too; the guard inside
    // deleteWorkspace is what actually protects the invariant.
    if (!next.deleted) return
    setWorkspaces(next.workspaces)
    setActiveWorkspaceId(next.activeId)
    toast.success("Organization deleted", {
      description: `${next.deleted.name} was removed.`,
    })
  }

  const activeWorkspace = resolveActiveWorkspace(workspaces, activeWorkspaceId)

  return (
    <>
      <SidebarMenu>
        {/* Sidebar */}
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="-ml-1 bg-transparent pr-0! group-data-[collapsible=icon]:-ml-1!"
              render={<SidebarMenuButton aria-label="Open workspace menu" />}
            >
              <WorkspaceAvatar workspace={activeWorkspace} size="sm" />
              <span className="truncate text-sm font-medium">
                {activeWorkspace.name}
              </span>
              <MoreHorizontalIcon
                className="mr-1 ml-auto size-4 shrink-0 opacity-50"
                aria-hidden="true"
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              side={isMobile ? "top" : "right"}
              align="end"
              sideOffset={8}
              className="w-60"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Organizations
                </DropdownMenuLabel>
                {workspaces.map((workspace) => (
                  <WorkspaceItem
                    key={workspace.id}
                    workspace={workspace}
                    isActive={activeWorkspaceId === workspace.id}
                    onSelect={setActiveWorkspaceId}
                  />
                ))}
                <DropdownMenuItem onClick={openNewOrganization}>
                  <PlusIcon aria-hidden="true" className="mx-0.5" />
                  New Organization
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openManageOrganizations}>
                  <SlidersHorizontalIcon
                    aria-hidden="true"
                    className="mx-0.5"
                  />
                  Manage Organizations
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Account
                </DropdownMenuLabel>

                <DropdownMenuItem onClick={() => openSettings("profile")}>
                  <UserIcon aria-hidden="true" />
                  Profile
                  <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSettings("billing")}>
                  <CreditCardIcon aria-hidden="true" />
                  Billing
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openSettings("preferences")}>
                  <SettingsIcon aria-hidden="true" />
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-default focus:bg-transparent!">
                  <PaletteIcon aria-hidden="true" />
                  Theme
                  <div className="ml-auto">
                    <ThemeSegmentedToggle />
                  </div>
                </DropdownMenuItem>
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOutIcon aria-hidden="true" />
                  Sign Out
                  <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Settings dialog opened from the account menu (Profile/Billing/Preferences). */}
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultTab={settingsTab}
      />

      {/* Sibling of the menu, not a child: a dialog rendered inside the
          dropdown unmounts with its trigger the moment the menu closes. */}
      <NewOrganizationDialog
        open={newOrgOpen}
        onOpenChange={setNewOrgOpen}
        onSubmit={handleCreateOrganization}
      />

      <ManageOrganizationsDialog
        open={manageOrgsOpen}
        onOpenChange={setManageOrgsOpen}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onRename={handleRenameOrganization}
        onDelete={handleDeleteOrganization}
      />
    </>
  )
}
