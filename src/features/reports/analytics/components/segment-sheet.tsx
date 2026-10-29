import * as React from "react"
import type { ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import type { Control } from "react-hook-form"

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
import { segmentFormSchema } from "../lib/segment-form-schema"
import type { SegmentFormValues } from "../lib/segment-form-schema"
import { buildSegmentRow, dropOffToNumber } from "../lib/segments"
import type { RiskState, StageBreakdownRow } from "./data"
import {
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"

// Risk badge presentation, kept local so the sheet stays self-contained.
const RISK_LABEL: Record<RiskState, string> = {
  healthy: "Healthy",
  watch: "Watch",
  drop_off: "Drop Off",
}

const RISK_VARIANT: Record<
  RiskState,
  "success-light" | "warning-light" | "destructive-light"
> = {
  healthy: "success-light",
  watch: "warning-light",
  drop_off: "destructive-light",
}

// Inline single-select combobox pill (adapted from the tasks sheet).
interface RiskOption {
  id: RiskState
  value: RiskState
  label: string
  risk: RiskState
  searchText: string
}

const RISK_OPTIONS: RiskOption[] = (
  ["healthy", "watch", "drop_off"] as RiskState[]
).map((risk) => ({
  id: risk,
  value: risk,
  label: RISK_LABEL[risk],
  risk,
  searchText: RISK_LABEL[risk].toLowerCase(),
}))

function riskOptionFor(risk: RiskState): RiskOption {
  return RISK_OPTIONS.find((option) => option.risk === risk) ?? RISK_OPTIONS[0]
}

function RiskCombobox({
  value,
  onValueChange,
}: {
  value: RiskOption
  onValueChange: (option: RiskOption) => void
}) {
  return (
    <Combobox
      items={RISK_OPTIONS}
      value={value}
      modal={false}
      onValueChange={(nextOption) => {
        if (nextOption) onValueChange(nextOption)
      }}
      itemToStringValue={(item: RiskOption) => item.searchText}
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
            aria-label="Select risk state"
          />
        }
      >
        <ComboboxValue>
          {(selectedOption: RiskOption | null) =>
            selectedOption ? (
              <Badge variant={RISK_VARIANT[selectedOption.risk]}>
                {selectedOption.label}
              </Badge>
            ) : null
          }
        </ComboboxValue>
      </ComboboxTrigger>

      <ComboboxContent className="pointer-events-auto min-w-56">
        <ComboboxInput
          showTrigger={false}
          placeholder="Change risk state"
          className="mb-1"
        />
        <ComboboxEmpty>No risk states found.</ComboboxEmpty>
        <ComboboxList>
          {(item: RiskOption) => (
            <ComboboxItem key={item.id} value={item}>
              <Badge variant={RISK_VARIANT[item.risk]}>{item.label}</Badge>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// Delete confirmation (mirrors the tasks sheet DeleteConfirm).
function DeleteConfirm({
  segmentName,
  onConfirm,
  children,
}: {
  segmentName: string
  onConfirm: () => void
  children: React.ReactNode
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={children as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete segment?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{segmentName}&rdquo; will be removed from the breakdown. This
            cannot be undone.
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

// Read-only detail row.
function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[8rem_1fr] items-center gap-3 px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0 font-medium">{children}</div>
    </div>
  )
}

function SegmentView({ row }: { row: StageBreakdownRow }) {
  return (
    <div className="flex min-h-full flex-col px-6 pt-8 pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {row.id}
          </Badge>
          <span className="truncate text-xs text-muted-foreground">
            {row.cohort}
          </span>
        </div>
        <SheetTitle className="text-2xl leading-tight font-semibold text-balance">
          {row.segment}
        </SheetTitle>
      </div>

      <div className="mt-6 divide-y rounded-lg border">
        <DetailRow label="Cohort">{row.cohort}</DetailRow>
        <DetailRow label="Owner">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar className="size-5 shrink-0">
              <AvatarImage src={row.ownerAvatar} alt="" />
              <AvatarFallback className="text-[9px]">
                {row.ownerInitials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{row.owner}</span>
          </span>
        </DetailRow>
        <DetailRow label="Account created">
          <span className="tabular-nums">
            {row.accountCreated.toLocaleString()}
          </span>
        </DetailRow>
        <DetailRow label="Invites sent">
          <span className="tabular-nums">
            {row.inviteSent.toLocaleString()}
          </span>
        </DetailRow>
        <DetailRow label="Saved reports">
          <span className="tabular-nums">
            {row.savedReport.toLocaleString()}
          </span>
        </DetailRow>
        <DetailRow label="W4 retained">
          <span className="tabular-nums">
            {row.weekFourRetained.toLocaleString()}
          </span>
        </DetailRow>
        <DetailRow label="Drop-off">
          <span className="tabular-nums">{row.dropOff}</span>
        </DetailRow>
        <DetailRow label="Risk">
          <Badge variant={RISK_VARIANT[row.risk]}>{RISK_LABEL[row.risk]}</Badge>
        </DetailRow>
        <DetailRow label="Updated">{row.updatedAt}</DetailRow>
      </div>
    </div>
  )
}

// Segment sheet (create / view / edit).
const FORM_ID = "segment-sheet-form"

// The stage counts share one shape, so they share one field component.
type CountFieldName =
  | "accountCreated"
  | "inviteSent"
  | "savedReport"
  | "weekFourRetained"
  | "dropOff"

function CountField({
  control,
  name,
  id,
  label,
  max,
}: {
  control: Control<SegmentFormValues>
  name: CountFieldName
  id: string
  label: string
  max?: number
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field
          className="gap-1.5"
          data-invalid={fieldState.invalid || undefined}
        >
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...field}
            id={id}
            type="number"
            min={0}
            max={max}
            inputMode="numeric"
            placeholder="0"
            aria-invalid={fieldState.invalid || undefined}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  )
}

/**
 * The create/edit body. It is mounted with a key, so opening the sheet on a
 * different record re-seeds every field from that record's values.
 */
function SegmentForm({
  row,
  onValid,
}: {
  row: StageBreakdownRow | null
  onValid: (values: SegmentFormValues) => void
}) {
  const form = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentFormSchema),
    defaultValues: {
      segment: row?.segment ?? "",
      cohort: row?.cohort ?? "",
      owner: row?.owner ?? "",
      accountCreated: row ? String(row.accountCreated) : "",
      inviteSent: row ? String(row.inviteSent) : "",
      savedReport: row ? String(row.savedReport) : "",
      weekFourRetained: row ? String(row.weekFourRetained) : "",
      // Stored as "42%"; the input edits the bare number.
      dropOff: row ? dropOffToNumber(row.dropOff) : "",
      risk: row?.risk ?? RISK_OPTIONS[0].risk,
    },
    mode: "onTouched",
  })

  return (
    <form
      id={FORM_ID}
      className="flex min-h-full flex-col border-0 px-6 pt-8 pb-6"
      onSubmit={form.handleSubmit(onValid)}
      noValidate
    >
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="segment"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="segment-sheet-name">Segment name</FieldLabel>
              <Input
                {...field}
                id="segment-sheet-name"
                placeholder="Segment name"
                autoFocus
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <div
        className="mt-5 flex flex-wrap items-center gap-2"
        aria-label="Segment risk"
      >
        <Controller
          control={form.control}
          name="risk"
          render={({ field }) => (
            <RiskCombobox
              value={riskOptionFor(field.value)}
              onValueChange={(option) => field.onChange(option.risk)}
            />
          )}
        />
      </div>

      <FieldGroup className="mt-6 gap-4">
        <Controller
          control={form.control}
          name="cohort"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="segment-sheet-cohort">Cohort</FieldLabel>
              <Input
                {...field}
                id="segment-sheet-cohort"
                placeholder="e.g. May activation cohort"
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="owner"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="segment-sheet-owner">Owner</FieldLabel>
              <Input
                {...field}
                id="segment-sheet-owner"
                placeholder="e.g. Mira Stone"
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CountField
            control={form.control}
            name="accountCreated"
            id="segment-sheet-account-created"
            label="Account created"
          />
          <CountField
            control={form.control}
            name="inviteSent"
            id="segment-sheet-invite-sent"
            label="Invites sent"
          />
          <CountField
            control={form.control}
            name="savedReport"
            id="segment-sheet-saved-report"
            label="Saved reports"
          />
          <CountField
            control={form.control}
            name="weekFourRetained"
            id="segment-sheet-w4-retained"
            label="W4 retained"
          />
        </div>

        <CountField
          control={form.control}
          name="dropOff"
          id="segment-sheet-drop-off"
          label="Drop-off %"
          max={100}
        />
      </FieldGroup>
    </form>
  )
}

export type SegmentSheetMode = "create" | "view" | "edit"

export interface SegmentSheetState {
  mode: SegmentSheetMode
  row?: StageBreakdownRow | null
}

export function SegmentSheet({
  state,
  onOpenChange,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  state: SegmentSheetState | null
  onOpenChange: (open: boolean) => void
  onSubmit: (row: StageBreakdownRow) => void
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: (row: StageBreakdownRow) => void
}) {
  const open = state !== null
  const mode = state?.mode ?? null
  const baseRow = state && state.mode !== "create" ? (state.row ?? null) : null

  function handleValid(values: SegmentFormValues) {
    const row: StageBreakdownRow = buildSegmentRow(values, baseRow)
    onSubmit(row)
    onOpenChange(false)
  }

  const viewRow = mode === "view" ? baseRow : null
  const sheetDescription =
    mode === "edit"
      ? "Update this segment's cohort details and stage counts."
      : "Add a segment name, cohort, owner, stage counts, drop-off, and risk."

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="inset-y-4! right-4! left-auto! flex h-[calc(100svh-2rem)]! w-[min(29rem,calc(100vw-2rem))]! max-w-none! flex-col overflow-hidden rounded-xl border outline-none"
      >
        <SheetHeader className="sr-only p-0">
          <SheetTitle>
            {mode === "view"
              ? "Segment details"
              : mode === "edit"
                ? "Edit segment"
                : "Create segment"}
          </SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {viewRow ? (
              <SegmentView row={viewRow} />
            ) : (
              <SegmentForm
                // Keyed so the form re-seeds from its defaultValues whenever
                // the sheet opens on a different record or switches mode.
                key={`${mode}:${baseRow?.id ?? "new"}`}
                row={baseRow}
                onValid={handleValid}
              />
            )}
          </ScrollArea>
        </div>

        <SheetFooter className="shrink-0 gap-3 border-t bg-muted">
          {viewRow ? (
            <div className="flex w-full items-center justify-end gap-2">
              <DeleteConfirm
                segmentName={viewRow.segment}
                onConfirm={() => onDelete(viewRow)}
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
              {mode === "edit" && baseRow ? (
                <DeleteConfirm
                  segmentName={baseRow.segment}
                  onConfirm={() => onDelete(baseRow)}
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
              {/* Outside the form on purpose: the footer is a sibling of the
                  scroll area, so it submits by id. */}
              <Button type="submit" form={FORM_ID}>
                {mode === "edit" ? "Save changes" : "Create segment"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
