import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { organizationFormSchema } from "../lib/organization-form"
import type { OrganizationFormValues } from "../lib/organization-form"
import type { Workspace } from "./data"
import { WORKSPACE_LOGOS } from "./workspace-logos"
import {
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"

/**
 * `null` means "keep whatever avatar this organization already has", which is
 * how the three seeded organizations hold on to their remote image. Picking a
 * mark replaces it, since an <AvatarImage> paints over the fallback and the
 * choice would otherwise look like it did nothing.
 */
export type OrganizationDraft = { name: string; logoId: string | null }

const FORM_ID = "organization-form"

/**
 * Which logo option an organization opens on when it is edited.
 *
 * An organization whose avatar is one of the offered images resolves to that
 * option, so the picker shows it selected rather than offering a separate
 * "keep current" tile holding the same picture. `null` is the fallback for a
 * custom avatar that matches nothing in the list, and means "leave it alone".
 */
function seedLogoId(workspace: Workspace): string | null {
  if (workspace.logoId) return workspace.logoId
  if (!workspace.imageUrl) return WORKSPACE_LOGOS[0].id
  const match = WORKSPACE_LOGOS.find(
    (logo) => logo.imageUrl === workspace.imageUrl
  )
  return match ? match.id : null
}

function LogoPicker({
  value,
  onChange,
  onBlur,
  invalid,
  currentImageUrl,
  currentName,
}: {
  value: string | null
  onChange: (logoId: string | null) => void
  onBlur?: () => void
  invalid?: boolean
  currentImageUrl?: string
  currentName?: string
}) {
  // Only offer "keep the current logo" when the current avatar is not already
  // one of the options below. Claude, Vercel and OpenAI use the very images
  // this list offers, so without this their own logo appeared twice: once as
  // "current" and again as itself.
  const currentIsOwnOption =
    currentImageUrl !== undefined &&
    WORKSPACE_LOGOS.some((logo) => logo.imageUrl === currentImageUrl)
  const showCurrent = currentImageUrl !== undefined && !currentIsOwnOption

  return (
    <div
      role="radiogroup"
      aria-label="Organization logo"
      aria-invalid={invalid || undefined}
      onBlur={onBlur}
      // A single row. Fixed 36px circles rather than a grid: 8 of them plus
      // gaps come to 330px, inside the 352px the dialog gives this field, so
      // edit mode (the 7 marks plus "keep current") still fits on one line.
      // flex-wrap only ever engages if that budget changes.
      className="flex flex-wrap gap-1.5"
    >
      {showCurrent && (
        <button
          type="button"
          role="radio"
          aria-checked={value === null}
          aria-label={`Keep the current ${currentName ?? ""} logo`.trim()}
          title="Current"
          onClick={() => onChange(null)}
          className={cn(
            "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border transition-colors",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            value === null
              ? "border-primary bg-accent"
              : "border-border hover:bg-accent/50"
          )}
        >
          {/* Full-bleed, the way AvatarImage renders it everywhere else. */}
          <img
            src={currentImageUrl}
            alt=""
            className="size-full object-cover"
          />
        </button>
      )}
      {WORKSPACE_LOGOS.map((logo) => {
        const selected = logo.id === value
        return (
          <button
            key={logo.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={logo.label}
            title={logo.label}
            onClick={() => onChange(logo.id)}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border transition-colors",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
              // Marks get the same white tile they render on in the avatar, so
              // the row reads as one set alongside the three real logos.
              logo.icon && "bg-white text-zinc-900",
              selected ? "border-primary" : "border-border hover:opacity-90"
            )}
          >
            {logo.imageUrl ? (
              <img
                src={logo.imageUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <span className="flex size-5 items-center justify-center [&_svg]:size-full!">
                {logo.icon}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function OrganizationForm({
  workspace,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  workspace?: Workspace
  submitLabel: string
  onSubmit: (draft: OrganizationDraft) => void
  onCancel?: () => void
}) {
  // Both dialogs key this component, so defaultValues re-seed on every open and
  // on every switch between organizations in the manage list.
  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(organizationFormSchema),
    defaultValues: {
      name: workspace?.name ?? "",
      logoId: workspace ? seedLogoId(workspace) : WORKSPACE_LOGOS[0].id,
    },
    // Validate on blur, then live while the message is being corrected.
    mode: "onTouched",
  })

  return (
    <>
      {/* noValidate so the browser's own bubbles never pre-empt the messages. */}
      <form
        id={FORM_ID}
        className="flex flex-col gap-4"
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="organization-name">Name</FieldLabel>
              <Input
                {...field}
                id="organization-name"
                placeholder="e.g. Acme Inc"
                autoComplete="off"
                autoFocus
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {/* The picker is a group of buttons, not an input, so the Controller
            drives it by value/onChange instead of spreading a field onto it. */}
        <Controller
          control={form.control}
          name="logoId"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel>Logo</FieldLabel>
              <LogoPicker
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={fieldState.invalid}
                currentImageUrl={workspace?.imageUrl}
                currentName={workspace?.name}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </form>

      <DialogFooter>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancel
          </DialogClose>
        )}
        {/* Enabled whatever the name holds: submitting is what reveals the
            message, rather than a dead button with no explanation. */}
        <Button type="submit" form={FORM_ID}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  )
}

// ── Create ──

export function NewOrganizationDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (draft: OrganizationDraft) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Keyed on open so the fields re-seed each time, rather than keeping
            whatever was entered into the last cancelled attempt. */}
        {open && (
          <>
            <DialogHeader>
              <DialogTitle>New organization</DialogTitle>
              <DialogDescription>
                Name your organization and pick a logo. You can invite people to
                it later.
              </DialogDescription>
            </DialogHeader>
            <OrganizationForm
              key={String(open)}
              submitLabel="Create"
              onSubmit={onSubmit}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Read / Update / Delete ──

export function ManageOrganizationsDialog({
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  onRename,
  onDelete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaces: Workspace[]
  activeWorkspaceId: string
  onRename: (id: string, draft: OrganizationDraft) => void
  onDelete: (id: string) => void
}) {
  // One dialog, three modes, rather than a dialog opening another dialog: a
  // modal stacked inside another dismissible surface is the trap this codebase
  // already hit once, where cancelling left both stuck open.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const editing = workspaces.find((w) => w.id === editingId)
  const isLast = workspaces.length <= 1

  // Reset on open rather than wrapping onOpenChange: the dialog always starts
  // on the list, and onOpenChange stays a straight pass-through to the parent's
  // setter, which is the shape the other dialogs here use.
  const [previousOpen, setPreviousOpen] = useState(open)
  if (previousOpen !== open) {
    setPreviousOpen(open)
    if (open) {
      setEditingId(null)
      setConfirmingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {/* Everything is gated on `open`. Leaving content mounted inside
            DialogContent while closed wedges this dialog permanently: neither
            the close button, the backdrop, nor Escape can dismiss it. */}
        {!open ? null : (
          <>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit organization" : "Organizations"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Rename this organization or change its logo."
                  : "Rename or remove the organizations in this workspace."}
              </DialogDescription>
            </DialogHeader>

            {editing ? (
              <OrganizationForm
                key={editing.id}
                workspace={editing}
                submitLabel="Save"
                onCancel={() => setEditingId(null)}
                onSubmit={(draft) => {
                  onRename(editing.id, draft)
                  setEditingId(null)
                }}
              />
            ) : (
              <>
                <div role="list" className="flex flex-col gap-1">
                  {workspaces.map((workspace) => {
                    const confirming = confirmingId === workspace.id
                    return (
                      <div
                        key={workspace.id}
                        role="listitem"
                        data-org-id={workspace.id}
                        className="flex min-h-9 items-center gap-2 rounded-md px-1"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {workspace.name}
                          {workspace.id === activeWorkspaceId && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              current
                            </span>
                          )}
                        </span>

                        {confirming ? (
                          // Confirmed inline rather than in an AlertDialog, so no
                          // modal is ever stacked on top of this one.
                          <>
                            <span className="text-xs text-muted-foreground">
                              Delete?
                            </span>
                            <Button
                              type="button"
                              size="xs"
                              variant="outline"
                              onClick={() => setConfirmingId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="button"
                              size="xs"
                              variant="destructive"
                              onClick={() => {
                                onDelete(workspace.id)
                                setConfirmingId(null)
                              }}
                            >
                              Delete
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="opacity-60 hover:opacity-100"
                              aria-label={`Edit ${workspace.name}`}
                              onClick={() => setEditingId(workspace.id)}
                            >
                              <PencilIcon aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="opacity-60 hover:opacity-100"
                              aria-label={`Delete ${workspace.name}`}
                              // A workspace with no organizations has nothing to
                              // switch to, so the last one cannot be removed.
                              disabled={isLast}
                              title={
                                isLast
                                  ? "You need at least one organization"
                                  : undefined
                              }
                              onClick={() => setConfirmingId(workspace.id)}
                            >
                              <Trash2Icon aria-hidden="true" />
                            </Button>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>

                <DialogFooter>
                  <DialogClose
                    render={<Button type="button" variant="outline" />}
                  >
                    Done
                  </DialogClose>
                </DialogFooter>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
