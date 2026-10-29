import * as React from "react"
import type { ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/reui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { buildActivity } from "../lib/activity-log"
import {
  activityDefaultValues,
  activitySchema,
  toActivityFormValues,
  ACTIVITY_OUTCOME_VALUES,
  ACTIVITY_TYPE_VALUES,
} from "../lib/activity-schema"
import type { ActivityFormInput } from "../lib/activity-schema"
import {
  activityTypeIcon,
  activityTypeLabel,
  bucketLabel,
  BUCKET_ORDER,
  outcomeDotClass,
  outcomeLabel,
  outcomeVariant,
  OWNERS,
} from "./data"
import type {
  Activity,
  ActivityOutcome,
  ActivityType,
  BucketKey,
  Owner,
} from "./data"
import {
  CalendarDotsIcon as CalendarClockIcon,
  FlagIcon,
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"

// ── Inline option shapes ──

interface InlineOption {
  id: string
  value: string
  label: string
  searchText: string
}

interface TypeOption extends InlineOption {
  activityType: ActivityType
}

interface OutcomeOption extends InlineOption {
  outcome: ActivityOutcome
}

interface OwnerOption extends InlineOption {
  owner: Owner
}

interface BucketOption extends InlineOption {
  bucket: BucketKey
}

const TYPE_OPTIONS: TypeOption[] = ACTIVITY_TYPE_VALUES.map((activityType) => ({
  id: activityType,
  value: activityType,
  label: activityTypeLabel[activityType],
  activityType,
  searchText: activityTypeLabel[activityType].toLowerCase(),
}))

const OUTCOME_OPTIONS: OutcomeOption[] = ACTIVITY_OUTCOME_VALUES.map(
  (outcome) => ({
    id: outcome,
    value: outcome,
    label: outcomeLabel[outcome],
    outcome,
    searchText: outcomeLabel[outcome].toLowerCase(),
  })
)

const OWNER_OPTIONS: OwnerOption[] = Object.values(OWNERS).map((owner) => ({
  id: owner.id,
  value: owner.id,
  label: owner.name,
  owner,
  searchText: `${owner.name} ${owner.role}`.toLowerCase(),
}))

const BUCKET_OPTIONS: BucketOption[] = BUCKET_ORDER.map((bucket) => ({
  id: bucket,
  value: bucket,
  label: bucketLabel[bucket],
  bucket,
  searchText: bucketLabel[bucket].toLowerCase(),
}))

const CREATE_TIPS = [
  {
    icon: "📞",
    text: "Log the outcome first so the pipeline reads at a glance.",
  },
  { icon: "🏷️", text: "Tie every touch to an account and a deal." },
  { icon: "⏱️", text: "Keep the time short: a stamp or a weekday is plenty." },
]

// ── Glyphs ──

function TypeGlyph({ activityType }: { activityType: ActivityType }) {
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4"
      aria-hidden="true"
    >
      {activityTypeIcon[activityType]}
    </span>
  )
}

function OutcomeGlyph({ outcome }: { outcome: ActivityOutcome }) {
  return (
    <span
      className={cn("size-1.5 shrink-0 rounded-full", outcomeDotClass[outcome])}
      aria-hidden="true"
    />
  )
}

function OwnerGlyph({ owner }: { owner: Owner }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-5">
        <AvatarImage src={owner.avatar} alt={owner.name} />
        <AvatarFallback className="text-[9px]">
          {owner.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{owner.name}</span>
    </span>
  )
}

// ── Generic single-select combobox pill ──

function InlineSingleCombobox<T extends InlineOption>({
  ariaLabel,
  value,
  items,
  searchPlaceholder,
  emptyMessage,
  renderOption,
  onValueChange,
}: {
  ariaLabel: string
  value: T
  items: T[]
  searchPlaceholder: string
  emptyMessage: string
  renderOption: (option: T) => ReactNode
  onValueChange: (option: T) => void
}) {
  return (
    <Combobox
      items={items}
      value={value}
      modal={false}
      onValueChange={(nextOption) => {
        if (nextOption) {
          onValueChange(nextOption)
        }
      }}
      itemToStringValue={(item: T) => item.searchText}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      autoHighlight
    >
      <ComboboxTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-full justify-between gap-2 font-normal"
            aria-label={ariaLabel}
          />
        }
      >
        <ComboboxValue>
          {(selectedOption: T | null) =>
            selectedOption ? renderOption(selectedOption) : null
          }
        </ComboboxValue>
      </ComboboxTrigger>

      <ComboboxContent className="pointer-events-auto min-w-60">
        <ComboboxInput
          showTrigger={false}
          placeholder={searchPlaceholder}
          className="mb-1"
        />
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item: T) => (
            <ComboboxItem key={item.id} value={item}>
              {renderOption(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// ── Map an existing activity back onto the form's option objects ──

function typeOptionFor(activityType: ActivityType): TypeOption {
  return (
    TYPE_OPTIONS.find((option) => option.activityType === activityType) ??
    TYPE_OPTIONS[0]
  )
}

function outcomeOptionFor(outcome: ActivityOutcome): OutcomeOption {
  return (
    OUTCOME_OPTIONS.find((option) => option.outcome === outcome) ??
    OUTCOME_OPTIONS[0]
  )
}

function ownerOptionFor(ownerId: string): OwnerOption {
  return (
    OWNER_OPTIONS.find((option) => option.value === ownerId) ?? OWNER_OPTIONS[0]
  )
}

function bucketOptionFor(bucket: BucketKey): BucketOption {
  return (
    BUCKET_OPTIONS.find((option) => option.bucket === bucket) ??
    BUCKET_OPTIONS[0]
  )
}

// ── Delete confirmation ──

function DeleteConfirm({
  activityTitle,
  onConfirm,
  children,
}: {
  activityTitle: string
  onConfirm: () => void
  children: React.ReactNode
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={children as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete activity?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{activityTitle}&rdquo; will be removed from the activity log.
            This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Read-only detail view ──

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0 font-medium">{children}</div>
    </div>
  )
}

function ActivityView({ activity }: { activity: Activity }) {
  const owner = OWNERS[activity.ownerId]
  return (
    <div className="flex min-h-full flex-col px-6 pt-8 pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {activity.ref}
          </Badge>
          <span className="truncate text-xs text-muted-foreground">
            {activityTypeLabel[activity.type]}
          </span>
        </div>
        <SheetTitle className="text-2xl leading-tight font-semibold text-balance">
          {activity.title}
        </SheetTitle>
        {activity.detail ? (
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
            {activity.detail}
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground italic">
            No detail logged
          </p>
        )}
      </div>

      <div className="mt-6 divide-y rounded-lg border">
        <DetailRow label="Type">
          <span className="flex min-w-0 items-center gap-2">
            <TypeGlyph activityType={activity.type} />
            <span className="truncate">{activityTypeLabel[activity.type]}</span>
          </span>
        </DetailRow>
        <DetailRow label="Outcome">
          <Badge variant={outcomeVariant[activity.outcome]} className="gap-1.5">
            <OutcomeGlyph outcome={activity.outcome} />
            {outcomeLabel[activity.outcome]}
          </Badge>
        </DetailRow>
        <DetailRow label="Account">
          {activity.account || (
            <span className="text-muted-foreground">Not set</span>
          )}
        </DetailRow>
        <DetailRow label="Deal">
          {activity.deal || (
            <span className="text-muted-foreground">Not set</span>
          )}
        </DetailRow>
        <DetailRow label="Owner">
          {owner ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar className="size-5">
                <AvatarImage src={owner.avatar} alt={owner.name} />
                <AvatarFallback className="text-[9px]">
                  {owner.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{owner.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </DetailRow>
        <DetailRow label="Time">
          {activity.time || (
            <span className="text-muted-foreground">Not set</span>
          )}
        </DetailRow>
        <DetailRow label="Day">
          <span className="flex min-w-0 items-center gap-2">
            <CalendarClockIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate">{bucketLabel[activity.bucket]}</span>
          </span>
        </DetailRow>
      </div>
    </div>
  )
}

// ── Activity sheet (create / view / edit) ──

const FORM_ID = "activity-sheet-form"

export type ActivitySheetMode = "create" | "view" | "edit"

export interface ActivitySheetState {
  mode: ActivitySheetMode
  activity?: Activity | null
}

export function ActivitySheet({
  state,
  onOpenChange,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  state: ActivitySheetState | null
  onOpenChange: (open: boolean) => void
  onSubmit: (activity: Activity) => void
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: (activity: Activity) => void
}) {
  const open = state !== null
  const mode = state?.mode ?? null
  const baseActivity =
    state && state.mode !== "create" ? (state.activity ?? null) : null

  const form = useForm<ActivityFormInput>({
    resolver: zodResolver(activitySchema),
    defaultValues: activityDefaultValues(null),
    // Validate on blur, then live while the field is being corrected.
    mode: "onTouched",
  })
  const { errors } = form.formState

  // Re-seed on open / record or mode change. `state` only changes on an explicit
  // open/mode transition (never on field typing), so in-progress edits persist.
  // reset() also clears the messages and the touched flags, which is what makes
  // a reopened sheet read as untouched.
  React.useEffect(() => {
    if (!state) return
    const source = state.mode !== "create" ? (state.activity ?? null) : null
    form.reset(activityDefaultValues(source))
  }, [state, form])

  function handleValid(values: ActivityFormInput) {
    const activity: Activity = buildActivity(
      toActivityFormValues(values),
      baseActivity
    )

    onSubmit(activity)
    onOpenChange(false)
  }

  const viewActivity = mode === "view" ? baseActivity : null
  const sheetDescription =
    mode === "edit"
      ? "Update this activity's details."
      : "Log an activity with a title, detail, type, outcome, account, deal, owner, time, and day."

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="inset-y-4! right-4! left-auto! flex h-[calc(100svh-2rem)]! w-[min(29rem,calc(100vw-2rem))]! max-w-none! flex-col overflow-hidden rounded-xl border outline-none"
      >
        <SheetHeader className="sr-only p-0">
          <SheetTitle>
            {mode === "view"
              ? "Activity details"
              : mode === "edit"
                ? "Edit activity"
                : "Log activity"}
          </SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {viewActivity ? (
              <ActivityView activity={viewActivity} />
            ) : (
              <form
                id={FORM_ID}
                className="flex min-h-full flex-col border-0 px-6 pt-8 pb-6"
                onSubmit={form.handleSubmit(handleValid)}
                noValidate
              >
                <FieldGroup className="gap-4">
                  <Controller
                    control={form.control}
                    name="title"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor="activity-sheet-title">
                          Activity title
                        </FieldLabel>
                        <Input
                          {...field}
                          id="activity-sheet-title"
                          placeholder="Activity title"
                          aria-invalid={fieldState.invalid || undefined}
                          autoFocus
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="detail"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor="activity-sheet-detail">
                          Activity detail
                        </FieldLabel>
                        <Textarea
                          {...field}
                          id="activity-sheet-detail"
                          placeholder="Add the outcome, next step, or context..."
                          rows={2}
                          aria-invalid={fieldState.invalid || undefined}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                {/* Metadata pills. Each holds a union value or an owner id, so
                    the messages sit under the row rather than splitting it into
                    stacked fields. */}
                <div
                  className="mt-5 flex flex-wrap items-center gap-2"
                  aria-label="Activity metadata"
                >
                  <Controller
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select activity type"
                        value={typeOptionFor(field.value)}
                        items={TYPE_OPTIONS}
                        searchPlaceholder="Change type"
                        emptyMessage="No types found."
                        onValueChange={(option) =>
                          field.onChange(option.activityType)
                        }
                        renderOption={(option) => (
                          <span className="flex min-w-0 items-center gap-2">
                            <TypeGlyph activityType={option.activityType} />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="outcome"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select activity outcome"
                        value={outcomeOptionFor(field.value)}
                        items={OUTCOME_OPTIONS}
                        searchPlaceholder="Change outcome"
                        emptyMessage="No outcomes found."
                        onValueChange={(option) =>
                          field.onChange(option.outcome)
                        }
                        renderOption={(option) => (
                          <span className="flex min-w-0 items-center gap-2">
                            <OutcomeGlyph outcome={option.outcome} />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="ownerId"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select activity owner"
                        value={ownerOptionFor(field.value)}
                        items={OWNER_OPTIONS}
                        searchPlaceholder="Assign owner"
                        emptyMessage="No owners found."
                        onValueChange={(option) => field.onChange(option.value)}
                        renderOption={(option) => (
                          <OwnerGlyph owner={option.owner} />
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="bucket"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select activity day"
                        value={bucketOptionFor(field.value)}
                        items={BUCKET_OPTIONS}
                        searchPlaceholder="Change day"
                        emptyMessage="No days found."
                        onValueChange={(option) =>
                          field.onChange(option.bucket)
                        }
                        renderOption={(option) => (
                          <span className="flex min-w-0 items-center gap-2">
                            <CalendarClockIcon
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )}
                      />
                    )}
                  />
                </div>
                <FieldError
                  className="mt-2"
                  errors={[
                    errors.type,
                    errors.outcome,
                    errors.ownerId,
                    errors.bucket,
                  ]}
                />

                <FieldGroup className="mt-6 gap-4">
                  <Controller
                    control={form.control}
                    name="account"
                    render={({ field, fieldState }) => (
                      <Field
                        className="gap-1.5"
                        data-invalid={fieldState.invalid || undefined}
                      >
                        <FieldLabel htmlFor="activity-sheet-account">
                          Account
                        </FieldLabel>
                        <Input
                          {...field}
                          id="activity-sheet-account"
                          placeholder="Brightwave Media"
                          aria-invalid={fieldState.invalid || undefined}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="deal"
                    render={({ field, fieldState }) => (
                      <Field
                        className="gap-1.5"
                        data-invalid={fieldState.invalid || undefined}
                      >
                        <FieldLabel htmlFor="activity-sheet-deal">
                          Deal
                        </FieldLabel>
                        <Input
                          {...field}
                          id="activity-sheet-deal"
                          placeholder="Pro Annual"
                          aria-invalid={fieldState.invalid || undefined}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="time"
                    render={({ field, fieldState }) => (
                      <Field
                        className="gap-1.5"
                        data-invalid={fieldState.invalid || undefined}
                      >
                        <FieldLabel htmlFor="activity-sheet-time">
                          Time
                        </FieldLabel>
                        <Input
                          {...field}
                          id="activity-sheet-time"
                          placeholder="9:12 AM"
                          aria-invalid={fieldState.invalid || undefined}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                {mode === "create" ? (
                  <div className="mt-8 border-t pt-5">
                    <div className="flex min-w-0 items-center gap-2">
                      <FlagIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-medium">
                        Quick tips
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      {CREATE_TIPS.map((tip) => (
                        <div
                          key={tip.text}
                          className="flex min-w-0 items-start gap-2 py-0.5 text-sm leading-snug text-muted-foreground"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-0.5 shrink-0 text-[13px] leading-none"
                          >
                            {tip.icon}
                          </span>
                          <span>{tip.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </form>
            )}
          </ScrollArea>
        </div>

        <SheetFooter className="shrink-0 gap-3 border-t bg-muted">
          {viewActivity ? (
            <div className="flex w-full items-center justify-end gap-2">
              <DeleteConfirm
                activityTitle={viewActivity.title}
                onConfirm={() => onDelete(viewActivity)}
              >
                <Button type="button" variant="outline">
                  <Trash2Icon className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </DeleteConfirm>
              <Button type="button" onClick={onEdit}>
                <PencilIcon className="size-4" aria-hidden="true" />
                Edit
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-end gap-2">
              {mode === "edit" && baseActivity ? (
                <DeleteConfirm
                  activityTitle={baseActivity.title}
                  onConfirm={() => onDelete(baseActivity)}
                >
                  <Button type="button" variant="outline" className="me-auto">
                    <Trash2Icon className="size-4" aria-hidden="true" />
                    Delete
                  </Button>
                </DeleteConfirm>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={
                  mode === "edit" ? onCancelEdit : () => onOpenChange(false)
                }
              >
                Cancel
              </Button>
              <Button type="submit" form={FORM_ID}>
                {mode === "edit" ? "Save changes" : "Log activity"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
