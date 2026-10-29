import { logoAvatarFields } from "../components/workspace-logos"
import type { Workspace } from "../components/data"
import type { OrganizationDraft } from "../components/organization-dialogs"

/**
 * Pure organization (workspace) mutations for the sidebar's workspace menu. The
 * component keeps its useState and its toasts; the list transitions live here so
 * they can be exercised without rendering a dropdown.
 *
 * Nothing mutates its argument. The menu seeds its state from WORKSPACES, a
 * module-level constant, so an in-place edit would leak into every later mount.
 *
 * logoAvatarFields is imported from the components folder because the marks it
 * resolves are JSX; only its return value is used here, and it is itself pure.
 */

// Seeded from the clock so a new organization can never collide with the ids
// already in WORKSPACES ("claude", "vercel", "openai"), however many are
// created in a session.
let nextWorkspaceId = Date.now()

export function createWorkspace(draft: OrganizationDraft): Workspace {
  return {
    id: `ws-${nextWorkspaceId++}`,
    name: draft.name,
    // Not surfaced anywhere in the UI today, but the type carries it and every
    // seeded organization has one, so a new one should not be the odd record.
    tier: "Free",
    ...(draft.logoId ? logoAvatarFields(draft.logoId) : {}),
  }
}

export function addWorkspace(
  workspaces: Workspace[],
  workspace: Workspace
): Workspace[] {
  return [...workspaces, workspace]
}

/**
 * Rename, and optionally re-logo. A null logoId means "keep the current avatar",
 * which is how the three seeded organizations hold on to their remote image, so
 * the existing imageUrl/logoId are left exactly as they are.
 */
export function renameWorkspace(
  workspaces: Workspace[],
  id: string,
  draft: OrganizationDraft
): Workspace[] {
  return workspaces.map((workspace) =>
    workspace.id === id
      ? {
          ...workspace,
          name: draft.name,
          ...(draft.logoId ? logoAvatarFields(draft.logoId) : {}),
        }
      : workspace
  )
}

export interface WorkspaceDeletion {
  workspaces: Workspace[]
  activeId: string
  /** The removed organization, or null when the delete was refused. */
  deleted: Workspace | null
}

/**
 * Delete, guarded. The last organization cannot go: the sidebar always renders
 * one, and there would be nothing to switch into. The manage dialog disables the
 * control at that point too, but this is the guard that actually protects the
 * invariant.
 *
 * Deleting the organization you are in has to land you somewhere, so the active
 * id follows the first survivor. Returns `deleted: null` when nothing happened,
 * which is also the caller's signal not to toast.
 */
export function deleteWorkspace(
  workspaces: Workspace[],
  id: string,
  activeId: string
): WorkspaceDeletion {
  const target = workspaces.find((workspace) => workspace.id === id)
  const remaining = workspaces.filter((workspace) => workspace.id !== id)
  if (!target || remaining.length === 0) {
    return { workspaces, activeId, deleted: null }
  }
  return {
    workspaces: remaining,
    activeId: activeId === id ? remaining[0].id : activeId,
    deleted: target,
  }
}

/**
 * The organization the shell is currently in. Falls back to the first rather
 * than rendering an empty header, which is what a stale active id would leave.
 */
export function activeWorkspace(
  workspaces: Workspace[],
  activeId: string
): Workspace {
  return (
    workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0]
  )
}

/** Avatar fallback for an organization with no picked mark and no image. */
export function getWorkspaceInitials(name: string): string {
  return name.charAt(0).toUpperCase()
}
