import { useMediaQuery } from "@/hooks/use-media-query"
import { useState } from "react"
import type { ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTheme } from "@/components/theme-provider"
import { Controller, useForm } from "react-hook-form"
import type { Control, FieldErrors } from "react-hook-form"
import { toast } from "sonner"

import { useFileUpload } from "@/hooks/use-file-upload"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/reui/badge"
import {
  InfoIcon,
  UploadSimpleIcon as UploadIcon,
  XIcon,
} from "@phosphor-icons/react"

import {
  firstInvalidSection,
  settingsSchema,
  SETTINGS_DEFAULT_VALUES,
} from "../lib/settings-schema"
import type { SettingsValues } from "../lib/settings-schema"
import {
  ACCESS_ROLE_OPTIONS,
  DIGEST_OPTIONS,
  INVOICE_CADENCE_OPTIONS,
  LANDING_VIEW_OPTIONS,
  LANGUAGE_OPTIONS,
  PLAN_OPTIONS,
  PROFILE_DIALOG_SURFACE,
  PROFILE_DIALOG_TABS,
  PROFILE_IDENTITY,
  ROLE_OPTIONS,
  SPEND_LIMIT_OPTIONS,
  TEAM_VISIBILITY_OPTIONS,
  THEME_OPTIONS,
  TIMEZONE_OPTIONS,
  WEEK_START_OPTIONS,
  WORKSPACE_IDENTITY,
} from "./data"
import type { ProfileDialogTab, ProfileSelectOption } from "./data"

const DIALOG_INSET_SEPARATOR_CLASS = "border-border w-full"
const SETTINGS_FORM_ID = "settings-dialog-form"

/** Everything <FieldError /> needs from a react-hook-form field error. */
type FieldMessage = { message?: string } | undefined

type SettingsControl = Control<SettingsValues>

// The tab rail flips from vertical to horizontal at lg (1024) so it never
// squeezes; the shared useIsMobile hook is fixed at 768, so track 1024 here.
function useIsBelow(breakpoint: number) {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`)
}

export function SettingsDialog({
  children,
  open: openProp,
  onOpenChange,
  defaultTab,
}: {
  // Trigger element (e.g. the sidebar button) for the self-contained variant.
  children?: ReactNode
  // Controlled variant (e.g. opened from the header dropdown menu item).
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Tab to show when the dialog opens (e.g. Profile/Billing/Preferences from
  // the workspace menu). Defaults to Profile.
  defaultTab?: ProfileDialogTab
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <TooltipProvider delay={200}>
      <Dialog open={open} onOpenChange={setOpen}>
        {/* Trigger (sidebar menu button) */}
        {children}

        {/* Content */}
        <DialogContent
          className="flex h-[min(88svh,48rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 **:data-[slot=dialog-close]:top-4 **:data-[slot=dialog-close]:right-4 sm:max-w-4xl lg:max-w-[60rem]"
          initialFocus={false}
        >
          {/* The dialog unmounts its content on close, so the form below mounts
              fresh on every open and re-seeds from the stored settings. */}
          <SettingsForm defaultTab={defaultTab} onDone={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}

function SettingsForm({
  defaultTab,
  onDone,
}: {
  defaultTab?: ProfileDialogTab
  onDone: () => void
}) {
  const isMobile = useIsBelow(1024)
  const [activeTab, setActiveTab] = useState<ProfileDialogTab>(
    defaultTab ?? "profile"
  )

  // Jump to the requested tab when the caller retargets it while open.
  const [previousTab, setPreviousTab] = useState(defaultTab)
  if (previousTab !== defaultTab) {
    setPreviousTab(defaultTab)
    setActiveTab(defaultTab ?? "profile")
  }

  // The app theme provider owns the live theme, so Preferences opens on it rather than on
  // the stored default: the dialog only mounts on open (a client interaction),
  // so the value is already resolved by the time the form seeds itself. A theme
  // the select never offers (a hand-edited localStorage entry) would fail the
  // schema, so only a known one is taken.
  const { theme, setTheme } = useTheme()
  const storedTheme = SETTINGS_DEFAULT_VALUES.preferences.theme
  const activeTheme = theme ?? storedTheme

  // Validate on blur, then live while a field is being corrected. Every control
  // is seeded from the stored settings, so the save payload is always complete.
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      ...SETTINGS_DEFAULT_VALUES,
      preferences: {
        ...SETTINGS_DEFAULT_VALUES.preferences,
        theme: THEME_OPTIONS.some((option) => option.value === activeTheme)
          ? activeTheme
          : storedTheme,
      },
    },
    mode: "onTouched",
  })
  const control = form.control

  const activeTabDetails =
    PROFILE_DIALOG_TABS.find((tab) => tab.value === activeTab) ??
    PROFILE_DIALOG_TABS[0]

  // Frontend-only template: there is no settings API, so a valid save confirms
  // and closes. `values` is the payload a real PATCH would send.
  const handleValid = (values: SettingsValues) => {
    toast.success(`${values.workspace.name} settings saved.`)
    onDone()
  }

  // Messages can land on a tab that is scrolled out of sight, so surface the
  // first tab that failed.
  const handleInvalid = (errors: FieldErrors<SettingsValues>) => {
    const section = firstInvalidSection(errors)
    if (section) setActiveTab(section)
  }

  return (
    <form
      id={SETTINGS_FORM_ID}
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={form.handleSubmit(handleValid, handleInvalid)}
      noValidate
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ProfileDialogTab)}
        orientation={isMobile ? "horizontal" : "vertical"}
        className="min-h-0 flex-1 flex-col gap-0 lg:flex-row lg:items-stretch"
      >
        <SidebarRail activeValue={activeTab} isMobile={isMobile} />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header */}
          <DialogHeader className="shrink-0 gap-0 px-6 py-0 text-left">
            <div
              className={cn(
                DIALOG_INSET_SEPARATOR_CLASS,
                "flex flex-col gap-1.5 border-b py-4 pr-12"
              )}
            >
              <DialogTitle className="text-lg leading-6">
                {activeTabDetails.title}
              </DialogTitle>
              <DialogDescription>
                {activeTabDetails.description}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Panels */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DialogTabPanel value="profile">
              <ProfileTabContent control={control} />
            </DialogTabPanel>

            <DialogTabPanel value="workspace">
              <WorkspaceTabContent control={control} />
            </DialogTabPanel>

            <DialogTabPanel value="team">
              <TeamTabContent control={control} />
            </DialogTabPanel>

            <DialogTabPanel value="billing">
              <BillingTabContent control={control} />
            </DialogTabPanel>

            <DialogTabPanel value="preferences">
              <PreferencesTabContent
                control={control}
                onThemeChange={setTheme}
              />
            </DialogTabPanel>
          </div>

          {/* Footer */}
          <DialogFooter className="m-0 border-0 bg-transparent! px-6 py-0">
            <div
              className={cn(
                DIALOG_INSET_SEPARATOR_CLASS,
                "flex shrink-0 items-center justify-end gap-2 border-t py-4"
              )}
            >
              <Button type="button" variant="outline" onClick={onDone}>
                {PROFILE_DIALOG_SURFACE.cancelLabel}
              </Button>
              <Button type="submit">{PROFILE_DIALOG_SURFACE.saveLabel}</Button>
            </div>
          </DialogFooter>
        </div>
      </Tabs>
    </form>
  )
}

function SidebarRail({
  activeValue,
  isMobile,
}: {
  activeValue: ProfileDialogTab
  isMobile: boolean
}) {
  return (
    <aside className="flex shrink-0 flex-col border-b bg-muted/20 py-3 pr-12 pl-5 lg:min-h-0 lg:w-56 lg:self-stretch lg:border-r lg:border-b-0 lg:py-4 lg:pr-5">
      <div className="min-w-0">
        {/* Bleed left only so the scroll viewport ends at the aside's pr-12, keeping the tabs clear of the dialog close button at every scroll position. */}
        {isMobile ? (
          <div className="-ml-5 [scrollbar-width:none] overflow-x-auto overflow-y-hidden py-1 pl-5 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <TabsList className="h-auto w-max min-w-max justify-start gap-1 bg-transparent p-0">
              {PROFILE_DIALOG_TABS.map((tab) => (
                <SidebarTrigger
                  key={tab.value}
                  tab={tab}
                  activeValue={activeValue}
                />
              ))}
            </TabsList>
          </div>
        ) : (
          <TabsList className="h-auto w-full flex-col items-stretch gap-1 bg-transparent p-0">
            {PROFILE_DIALOG_TABS.map((tab) => (
              <SidebarTrigger
                key={tab.value}
                tab={tab}
                activeValue={activeValue}
              />
            ))}
          </TabsList>
        )}
      </div>
    </aside>
  )
}

function SidebarTrigger({
  tab,
  activeValue,
}: {
  tab: (typeof PROFILE_DIALOG_TABS)[number]
  activeValue: ProfileDialogTab
}) {
  return (
    <TabsTrigger
      value={tab.value}
      className={cn(
        "w-full justify-start gap-3 px-3 py-1.5 shadow-none!",
        activeValue === tab.value ? "bg-muted!" : "bg-transparent"
      )}
    >
      {tab.icon}
      <span className="truncate">{tab.label}</span>
    </TabsTrigger>
  )
}

function DialogTabPanel({
  value,
  children,
}: {
  value: ProfileDialogTab
  children: ReactNode
}) {
  return (
    <TabsContent
      value={value}
      // Keep inactive panels mounted so the form's controls stay in the tree and
      // an error on a hidden tab is ready the moment the rail switches to it.
      // base-ui sets the [hidden] attribute on inactive panels; the attribute
      // selector outranks `flex` so they collapse instead of stacking.
      keepMounted
      className="mt-0 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden [&[hidden]]:hidden"
    >
      <ScrollArea
        className={cn(
          "min-h-0 flex-1",
          "**:data-[slot=scroll-area-scrollbar]:opacity-0 **:data-[slot=scroll-area-scrollbar]:transition-opacity **:data-[slot=scroll-area-scrollbar]:duration-150 hover:**:data-[slot=scroll-area-scrollbar]:opacity-100"
        )}
      >
        {children}
      </ScrollArea>
    </TabsContent>
  )
}

const SETTINGS_FIELD_GROUP_CLASS = "gap-4! py-5"

function ProfileTabContent({ control }: { control: SettingsControl }) {
  return (
    <FieldGroup className={SETTINGS_FIELD_GROUP_CLASS}>
      <Controller
        control={control}
        name="profile.avatarUrl"
        render={({ field }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.profilePhotoLabel}
            description={PROFILE_DIALOG_SURFACE.profilePhotoDescription}
            labelFor="profile-avatar"
          >
            <ImageUploadField
              inputId="profile-avatar"
              ariaLabel={PROFILE_DIALOG_SURFACE.uploadAvatarLabel}
              defaultFile={PROFILE_IDENTITY.avatarFile}
              alt={PROFILE_IDENTITY.avatarAlt}
              fallback={PROFILE_IDENTITY.initials}
              value={field.value}
              onValueChange={field.onChange}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="profile.name"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.nameLabel}
            description={PROFILE_DIALOG_SURFACE.nameDescription}
            labelFor="profile-name"
            error={fieldState.error}
          >
            <Input
              {...field}
              id="profile-name"
              aria-invalid={fieldState.invalid || undefined}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="profile.email"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.emailLabel}
            description={PROFILE_DIALOG_SURFACE.emailDescription}
            labelFor="profile-email"
            error={fieldState.error}
            titleAddon={
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      tabIndex={0}
                      className="inline-flex cursor-help rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  }
                >
                  <Badge variant="success-light" size="sm">
                    {PROFILE_DIALOG_SURFACE.verifiedLabel}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs p-3">
                  <p className="text-sm leading-5">
                    {PROFILE_DIALOG_SURFACE.verifiedTooltip}
                  </p>
                </TooltipContent>
              </Tooltip>
            }
          >
            <Input
              {...field}
              id="profile-email"
              aria-invalid={fieldState.invalid || undefined}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="profile.username"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.usernameLabel}
            description={PROFILE_DIALOG_SURFACE.usernameDescription}
            labelFor="profile-username"
            error={fieldState.error}
          >
            <InputGroup className="w-full">
              <InputGroupAddon align="inline-start">
                <InputGroupText>@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                {...field}
                id="profile-username"
                aria-invalid={fieldState.invalid || undefined}
              />
            </InputGroup>
          </SettingRow>
        )}
      />

      <SettingRow
        title={PROFILE_DIALOG_SURFACE.publicDetailsLabel}
        description={PROFILE_DIALOG_SURFACE.publicDetailsDescription}
        valign="start"
        titleAddon={
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={PROFILE_DIALOG_SURFACE.publicDetailsTooltip}
                />
              }
            >
              <InfoIcon className="size-4" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs p-3">
              <p className="text-sm leading-5">
                {PROFILE_DIALOG_SURFACE.publicDetailsTooltip}
              </p>
            </TooltipContent>
          </Tooltip>
        }
      >
        <FieldSet className="w-full gap-4!">
          <FieldLegend className="sr-only">
            {PROFILE_DIALOG_SURFACE.publicDetailsLabel}
          </FieldLegend>

          {/* Public Fields */}
          <FieldGroup className="gap-4!">
            <Controller
              control={control}
              name="profile.role"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="profile-role">
                    {PROFILE_DIALOG_SURFACE.roleLabel}
                  </FieldLabel>
                  <ProfileSelectField
                    id="profile-role"
                    options={ROLE_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="profile.timezone"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="profile-timezone">
                    {PROFILE_DIALOG_SURFACE.timezoneLabel}
                  </FieldLabel>
                  <ProfileSelectField
                    id="profile-timezone"
                    options={TIMEZONE_OPTIONS}
                    value={field.value}
                    onValueChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={control}
              name="profile.website"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="profile-website">
                    {PROFILE_DIALOG_SURFACE.websiteLabel}
                  </FieldLabel>
                  <InputGroup className="w-full">
                    <InputGroupAddon align="inline-start">
                      <InputGroupText>https://</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      {...field}
                      id="profile-website"
                      aria-invalid={fieldState.invalid || undefined}
                    />
                  </InputGroup>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>
      </SettingRow>

      <Controller
        control={control}
        name="profile.bio"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.bioLabel}
            description={PROFILE_DIALOG_SURFACE.bioDescription}
            labelFor="profile-bio"
            valign="start"
            error={fieldState.error}
          >
            <Textarea
              {...field}
              id="profile-bio"
              rows={4}
              aria-invalid={fieldState.invalid || undefined}
              className="mt-2 field-sizing-fixed min-h-0 w-full"
            />
          </SettingRow>
        )}
      />
    </FieldGroup>
  )
}

const WORKSPACE_FIELD_GROUP_CLASS = "gap-4! py-5"
function WorkspaceTabContent({ control }: { control: SettingsControl }) {
  return (
    <FieldGroup className={WORKSPACE_FIELD_GROUP_CLASS}>
      <Controller
        control={control}
        name="workspace.logoUrl"
        render={({ field }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.workspaceLogoLabel}
            description={PROFILE_DIALOG_SURFACE.workspaceLogoDescription}
            labelFor="workspace-logo"
            className="mb-0.5"
          >
            <ImageUploadField
              inputId="workspace-logo"
              ariaLabel={PROFILE_DIALOG_SURFACE.uploadWorkspaceLogoLabel}
              defaultFile={WORKSPACE_IDENTITY.logoFile}
              alt={WORKSPACE_IDENTITY.logoAlt}
              fallback={WORKSPACE_IDENTITY.logoFallback}
              shape="rounded"
              value={field.value}
              onValueChange={field.onChange}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="workspace.name"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.workspaceNameLabel}
            labelFor="workspace-name"
            className="mb-0.5"
            error={fieldState.error}
          >
            <Input
              {...field}
              id="workspace-name"
              aria-invalid={fieldState.invalid || undefined}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="workspace.subdomain"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.workspaceUrlLabel}
            description={PROFILE_DIALOG_SURFACE.workspaceUrlDescription}
            labelFor="workspace-subdomain"
            error={fieldState.error}
          >
            <InputGroup className="w-full">
              <InputGroupInput
                {...field}
                id="workspace-subdomain"
                aria-invalid={fieldState.invalid || undefined}
              />
              <InputGroupAddon align="inline-end">
                <InputGroupText>
                  {WORKSPACE_IDENTITY.domainSuffix}
                </InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="workspace.supportEmail"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.supportEmailLabel}
            description={PROFILE_DIALOG_SURFACE.supportEmailDescription}
            labelFor="workspace-support-email"
            error={fieldState.error}
          >
            <Input
              {...field}
              id="workspace-support-email"
              aria-invalid={fieldState.invalid || undefined}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="workspace.landingView"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.defaultLandingLabel}
            description={PROFILE_DIALOG_SURFACE.defaultLandingDescription}
            labelFor="workspace-landing-view"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="workspace-landing-view"
              options={LANDING_VIEW_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="workspace.externalSharing"
        render={({ field }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.externalSharingLabel}
            description={PROFILE_DIALOG_SURFACE.externalSharingDescription}
            labelFor="workspace-external-sharing"
            compact
          >
            <Switch
              id="workspace-external-sharing"
              size="sm"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              onBlur={field.onBlur}
            />
          </SettingRow>
        )}
      />
    </FieldGroup>
  )
}

function TeamTabContent({ control }: { control: SettingsControl }) {
  return (
    <FieldGroup className={SETTINGS_FIELD_GROUP_CLASS}>
      <Controller
        control={control}
        name="team.inviteDomain"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.inviteDomainLabel}
            description={PROFILE_DIALOG_SURFACE.inviteDomainDescription}
            labelFor="team-invite-domain"
            className="mb-0.5"
            error={fieldState.error}
          >
            <InputGroup className="w-full">
              <InputGroupAddon align="inline-start">
                <InputGroupText>@</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                {...field}
                id="team-invite-domain"
                aria-invalid={fieldState.invalid || undefined}
              />
            </InputGroup>
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="team.defaultRole"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.defaultRoleLabel}
            description={PROFILE_DIALOG_SURFACE.defaultRoleDescription}
            labelFor="team-default-role"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="team-default-role"
              options={ACCESS_ROLE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="team.inviteApproval"
        render={({ field }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.inviteApprovalsLabel}
            description={PROFILE_DIALOG_SURFACE.inviteApprovalsDescription}
            labelFor="team-invite-approval"
            compact
          >
            <Switch
              id="team-invite-approval"
              size="sm"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              onBlur={field.onBlur}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="team.memberInvites"
        render={({ field }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.memberInvitesLabel}
            description={PROFILE_DIALOG_SURFACE.memberInvitesDescription}
            labelFor="team-member-invites"
            compact
          >
            <Switch
              id="team-member-invites"
              size="sm"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              onBlur={field.onBlur}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="team.visibility"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.teamVisibilityLabel}
            description={PROFILE_DIALOG_SURFACE.teamVisibilityDescription}
            labelFor="team-visibility"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="team-visibility"
              options={TEAM_VISIBILITY_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />
    </FieldGroup>
  )
}

function BillingTabContent({ control }: { control: SettingsControl }) {
  return (
    <FieldGroup className={SETTINGS_FIELD_GROUP_CLASS}>
      <Controller
        control={control}
        name="billing.plan"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.planLabel}
            description={PROFILE_DIALOG_SURFACE.planDescription}
            labelFor="billing-plan"
            className="mb-0.5"
            titleAddon={
              <Badge variant="info-light" size="sm">
                {PROFILE_DIALOG_SURFACE.currentLabel}
              </Badge>
            }
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="billing-plan"
              options={PLAN_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="billing.billingEmail"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.billingEmailLabel}
            description={PROFILE_DIALOG_SURFACE.billingEmailDescription}
            labelFor="billing-email"
            error={fieldState.error}
          >
            <Input
              {...field}
              id="billing-email"
              aria-invalid={fieldState.invalid || undefined}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="billing.legalName"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.legalNameLabel}
            description={PROFILE_DIALOG_SURFACE.legalNameDescription}
            labelFor="billing-legal-name"
            error={fieldState.error}
          >
            <Input
              {...field}
              id="billing-legal-name"
              aria-invalid={fieldState.invalid || undefined}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="billing.taxId"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.taxIdLabel}
            description={PROFILE_DIALOG_SURFACE.taxIdDescription}
            labelFor="billing-tax-id"
            error={fieldState.error}
          >
            <Input
              {...field}
              id="billing-tax-id"
              aria-invalid={fieldState.invalid || undefined}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="billing.purchaseOrder"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.purchaseOrderLabel}
            description={PROFILE_DIALOG_SURFACE.purchaseOrderDescription}
            labelFor="billing-purchase-order"
            className="mb-0.5"
            error={fieldState.error}
          >
            <Input
              {...field}
              id="billing-purchase-order"
              aria-invalid={fieldState.invalid || undefined}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="billing.spendLimit"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.spendLimitLabel}
            description={PROFILE_DIALOG_SURFACE.spendLimitDescription}
            labelFor="billing-spend-limit"
            className="mb-2"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="billing-spend-limit"
              options={SPEND_LIMIT_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="billing.invoiceCadence"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.invoiceCadenceLabel}
            description={PROFILE_DIALOG_SURFACE.invoiceCadenceDescription}
            labelFor="billing-invoice-cadence"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="billing-invoice-cadence"
              options={INVOICE_CADENCE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="billing.paymentApproval"
        render={({ field }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.paymentApprovalLabel}
            description={PROFILE_DIALOG_SURFACE.paymentApprovalDescription}
            labelFor="billing-payment-approval"
            compact
          >
            <Switch
              id="billing-payment-approval"
              size="sm"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              onBlur={field.onBlur}
            />
          </SettingRow>
        )}
      />
    </FieldGroup>
  )
}

function PreferencesTabContent({
  control,
  onThemeChange,
}: {
  control: SettingsControl
  onThemeChange: (theme: "light" | "dark" | "system") => void
}) {
  return (
    <FieldGroup className={SETTINGS_FIELD_GROUP_CLASS}>
      <Controller
        control={control}
        name="preferences.theme"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.themeLabel}
            description={PROFILE_DIALOG_SURFACE.themeDescription}
            labelFor="profile-theme"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="profile-theme"
              options={THEME_OPTIONS}
              value={field.value}
              // Applied on pick, the way the workspace menu's toggle does it:
              // a theme you have to save to see is not a theme control.
              onValueChange={(value) => {
                field.onChange(value)
                onThemeChange(
                  value === "dark" || value === "system" ? value : "light"
                )
              }}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="preferences.smoothCursor"
        render={({ field }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.smoothCursorLabel}
            description={PROFILE_DIALOG_SURFACE.smoothCursorDescription}
            labelFor="profile-smooth-cursor"
            compact
          >
            <Switch
              id="profile-smooth-cursor"
              size="sm"
              checked={field.value}
              onCheckedChange={(checked) => field.onChange(checked)}
              onBlur={field.onBlur}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="preferences.language"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.languageLabel}
            description={PROFILE_DIALOG_SURFACE.languageDescription}
            labelFor="profile-language"
            className="mb-2"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="profile-language"
              options={LANGUAGE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="preferences.timezone"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.timezoneLabel}
            labelFor="preferences-timezone"
            className="mb-2"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="preferences-timezone"
              options={TIMEZONE_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="preferences.weekStart"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.weekStartLabel}
            description={PROFILE_DIALOG_SURFACE.weekStartDescription}
            labelFor="profile-week-start"
            className="mb-2"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="profile-week-start"
              options={WEEK_START_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />

      <Controller
        control={control}
        name="preferences.digest"
        render={({ field, fieldState }) => (
          <SettingRow
            title={PROFILE_DIALOG_SURFACE.digestLabel}
            description={PROFILE_DIALOG_SURFACE.digestDescription}
            labelFor="profile-digest"
            compact
            error={fieldState.error}
          >
            <ProfileSelectField
              id="profile-digest"
              options={DIGEST_OPTIONS}
              value={field.value}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              invalid={fieldState.invalid}
            />
          </SettingRow>
        )}
      />
    </FieldGroup>
  )
}

interface SettingRowProps {
  title: string
  description?: ReactNode
  children: ReactNode
  compact?: boolean
  stacked?: boolean
  labelFor?: string
  contentClassName?: string
  titleAddon?: ReactNode
  className?: string
  /** md+ grid: vertical alignment of label vs control (default center). Use start for tall blocks (textarea, multi-field). */
  valign?: "start" | "center"
  /** Validation message for the row's control, rendered under it. */
  error?: FieldMessage
}

function SettingRow({
  title,
  description,
  children,
  stacked,
  labelFor,
  contentClassName,
  titleAddon,
  className,
  valign = "center",
  error,
}: SettingRowProps) {
  return (
    <Field
      orientation={stacked ? "vertical" : "responsive"}
      data-invalid={error ? true : undefined}
      className={cn(
        /* Keep row internals aligned with the settings stack. */
        "gap-4! px-6 py-0",
        !stacked &&
          "@md/field-group:grid @md/field-group:grid-cols-[minmax(8.25rem,0.74fr)_minmax(0,1.26fr)]",
        !stacked &&
          (valign === "center"
            ? "@md/field-group:items-center @md/field-group:has-[>[data-slot=field-content]]:items-center!"
            : "@md/field-group:items-start"),
        className
      )}
    >
      <div
        className={cn(
          "flex w-full min-w-0 flex-col gap-0.5",
          stacked ? "w-full" : null
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          {labelFor ? (
            <FieldLabel htmlFor={labelFor}>
              <span className="capitalize">{title}</span>
            </FieldLabel>
          ) : (
            <FieldTitle>
              <span className="capitalize">{title}</span>
            </FieldTitle>
          )}
          {titleAddon}
        </div>

        {description ? (
          <FieldDescription className="text-sm">{description}</FieldDescription>
        ) : null}
      </div>

      <FieldContent
        className={cn(
          "w-full max-w-none min-w-0",
          stacked ? "max-w-none" : null,
          contentClassName
        )}
      >
        <div
          className={cn(
            "flex w-full min-w-0 justify-start",
            valign === "center" ? "items-center" : "items-start"
          )}
        >
          {children}
        </div>

        {/* Renders nothing until the row's control fails. */}
        <FieldError errors={[error]} />
      </FieldContent>
    </Field>
  )
}

function ProfileSelectField({
  id,
  options,
  value,
  onValueChange,
  onBlur,
  invalid,
}: {
  id: string
  options: ProfileSelectOption[]
  value: string
  onValueChange: (value: string) => void
  onBlur?: () => void
  invalid?: boolean
}) {
  // The form stores the option's value; the select works in option objects so
  // the trigger can render the label.
  const selected = options.find((option) => option.value === value) ?? null

  return (
    <Select
      value={selected}
      onValueChange={(option: ProfileSelectOption | null) => {
        if (option) onValueChange(option.value)
      }}
      items={options}
      isItemEqualToValue={(a, b) => a?.value === b?.value}
      modal={false}
    >
      <SelectTrigger
        id={id}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        className="w-full gap-2 rounded-lg px-4 py-2 text-sm font-normal text-foreground shadow-none"
      >
        <SelectValue>
          {(item: ProfileSelectOption | null) => item?.label ?? null}
        </SelectValue>
      </SelectTrigger>

      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        side="bottom"
        sideOffset={4}
      >
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option}
              className="rounded-sm py-1.5 pr-8 pl-2.5 text-sm"
            >
              <span className="flex min-w-0 flex-col items-start gap-px">
                <span className="truncate font-medium">{option.label}</span>
                <small className="truncate text-xs text-muted-foreground">
                  {option.description}
                </small>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function ImageUploadField({
  inputId,
  ariaLabel,
  defaultFile,
  alt,
  fallback,
  shape = "circle",
  value,
  onValueChange,
}: {
  inputId: string
  ariaLabel: string
  defaultFile: typeof PROFILE_IDENTITY.avatarFile
  alt: string
  fallback: string
  shape?: "circle" | "rounded"
  /** Preview URL held by the form, or null once the image is removed. */
  value: string | null
  onValueChange: (value: string | null) => void
}) {
  const [, { openFileDialog, getInputProps, clearFiles }] = useFileUpload({
    maxFiles: 1,
    accept: "image/*",
    multiple: false,
    initialFiles: [defaultFile],
    // Fires from the change/drop handler rather than inside a state updater,
    // so the form value can be set without updating during another render.
    onFilesAdded: (added) => onValueChange(added[0]?.preview ?? null),
  })

  const hasImage = Boolean(value)

  return (
    <div className="flex flex-wrap items-center justify-start gap-2">
      <Avatar className={cn("size-12", shape === "rounded" && "rounded-md")}>
        <AvatarImage src={value ?? undefined} alt={alt} />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>

      {/* Upload Actions */}
      <div className="relative inline-flex">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openFileDialog}
                aria-haspopup="dialog"
              />
            }
          >
            <UploadIcon data-icon="inline-start" aria-hidden="true" />
            {PROFILE_DIALOG_SURFACE.changeImageLabel}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-3">
            <p className="text-sm leading-5">
              {PROFILE_DIALOG_SURFACE.changeImageTooltip}
            </p>
          </TooltipContent>
        </Tooltip>
        <input
          {...getInputProps({ id: inputId })}
          className="sr-only"
          aria-label={ariaLabel}
          tabIndex={-1}
        />
      </div>

      {hasImage ? (
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  clearFiles()
                  onValueChange(null)
                }}
              />
            }
          >
            <XIcon data-icon="inline-start" aria-hidden="true" />
            {PROFILE_DIALOG_SURFACE.removeImageLabel}
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs p-3">
            <p className="text-sm leading-5">
              {PROFILE_DIALOG_SURFACE.removeImageTooltip}
            </p>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}
