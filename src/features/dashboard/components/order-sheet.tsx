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
import { STATUS_BADGES, STATUS_DOT } from "./data"
import type { OrderRecord, OrderStatus } from "./data"
import {
  buildOrderPayload,
  optionFor,
  CHANNEL_OPTIONS,
  STAGE_OPTIONS,
  STATUS_OPTIONS,
} from "../lib/order-form"
import type { InlineOption } from "../lib/order-form"
import {
  orderDefaultValues,
  orderSchema,
  toOrderFormValues,
} from "../lib/order-schema"
import type { OrderFormInput } from "../lib/order-schema"
import {
  FlagIcon,
  FolderIcon,
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"

// ── Small glyphs ──

function StatusDot({ status }: { status: OrderStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[status])}
    />
  )
}

// ── Generic single-select combobox pill (adapted from the tasks sheet) ──

function InlineSingleCombobox({
  ariaLabel,
  value,
  items,
  searchPlaceholder,
  emptyMessage,
  renderOption,
  onValueChange,
}: {
  ariaLabel: string
  value: InlineOption
  items: InlineOption[]
  searchPlaceholder: string
  emptyMessage: string
  renderOption: (option: InlineOption) => ReactNode
  onValueChange: (option: InlineOption) => void
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
      itemToStringValue={(item: InlineOption) => item.searchText}
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
          {(selectedOption: InlineOption | null) =>
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
          {(item: InlineOption) => (
            <ComboboxItem key={item.id} value={item}>
              {renderOption(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// ── Delete confirmation (mirrors the tasks sheet DeleteConfirm) ──

function DeleteConfirm({
  orderTitle,
  onConfirm,
  children,
}: {
  orderTitle: string
  onConfirm: () => void
  children: React.ReactNode
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={children as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete task?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{orderTitle}&rdquo; will be removed from the queue. This
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

function OrderView({ order }: { order: OrderRecord }) {
  return (
    <div className="flex min-h-full flex-col px-6 pt-8 pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {order.id}
          </Badge>
          <span className="truncate text-xs text-muted-foreground">
            {order.channel}
          </span>
        </div>
        <SheetTitle className="text-2xl leading-tight font-semibold text-balance">
          {order.product}
        </SheetTitle>
        <div className="mt-1 flex min-w-0 items-center gap-2">
          <Avatar className="size-6">
            <AvatarImage src={order.image} alt={order.customer} />
            <AvatarFallback className="text-[10px]">
              {order.initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm text-muted-foreground">
            {order.customer}
          </span>
        </div>
      </div>

      <div className="mt-6 divide-y rounded-lg border">
        <DetailRow label="Status">
          <span className="flex min-w-0 items-center gap-2">
            <Badge variant={STATUS_BADGES[order.status]} className="gap-1.5">
              <StatusDot status={order.status} />
              {order.status}
            </Badge>
          </span>
        </DetailRow>
        <DetailRow label="Assignee">
          <span className="flex min-w-0 items-center gap-2">
            <Avatar className="size-5">
              <AvatarImage src={order.image} alt={order.customer} />
              <AvatarFallback className="text-[9px]">
                {order.initials}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{order.customer}</span>
          </span>
        </DetailRow>
        <DetailRow label="Deliverable">
          <span className="truncate">{order.product}</span>
        </DetailRow>
        <DetailRow label="Reference">
          <span className="truncate font-mono text-xs">{order.sku}</span>
        </DetailRow>
        <DetailRow label="Project">
          <span className="flex min-w-0 items-center gap-2">
            <FolderIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate">{order.channel}</span>
          </span>
        </DetailRow>
        <DetailRow label="Stage">
          <span className="truncate">{order.stage}</span>
        </DetailRow>
        <DetailRow label="Progress">
          <span className="flex min-w-0 items-center gap-2">
            <span className="block h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn(
                  "block h-full rounded-full",
                  STATUS_DOT[order.status]
                )}
                style={{ width: `${order.progress}%` }}
              />
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {order.progress}%
            </span>
          </span>
        </DetailRow>
        <DetailRow label="Estimate">
          <span className="tabular-nums">{order.amount}h</span>
        </DetailRow>
        <DetailRow label="Subtasks">
          <span className="tabular-nums">{order.quantity}</span>
        </DetailRow>
        <DetailRow label="Created">{order.date}</DetailRow>
      </div>
    </div>
  )
}

// ── Order sheet (create / view / edit) ──

const FORM_ID = "order-sheet-form"

export type OrderSheetMode = "create" | "view" | "edit"

export interface OrderSheetState {
  mode: OrderSheetMode
  order?: OrderRecord | null
}

export function OrderSheet({
  state,
  onOpenChange,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  state: OrderSheetState | null
  onOpenChange: (open: boolean) => void
  onSubmit: (order: OrderRecord) => void
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: (order: OrderRecord) => void
}) {
  const open = state !== null
  const mode = state?.mode ?? null
  const baseOrder =
    state && state.mode !== "create" ? (state.order ?? null) : null

  const form = useForm<OrderFormInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: orderDefaultValues(null),
    // Validate on blur, then live while the field is being corrected.
    mode: "onTouched",
  })
  const { errors } = form.formState

  // Re-seed the form whenever the sheet opens or switches record/mode. `state`
  // only changes on an explicit open/mode transition (never on field typing),
  // so in-progress edits are preserved. reset() also clears the messages and the
  // touched flags, which is what makes a reopened sheet read as untouched.
  React.useEffect(() => {
    if (!state) return
    const source = state.mode !== "create" ? (state.order ?? null) : null
    form.reset(orderDefaultValues(source))
  }, [state, form])

  function handleValid(values: OrderFormInput) {
    const order = buildOrderPayload(toOrderFormValues(values), baseOrder)

    onSubmit(order)
    onOpenChange(false)
  }

  const viewOrder = mode === "view" ? baseOrder : null
  const sheetDescription =
    mode === "edit"
      ? "Update this task's details."
      : "Add a deliverable, assignee, project, stage, status, and estimate."

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="inset-y-4! right-4! left-auto! flex h-[calc(100svh-2rem)]! w-[min(29rem,calc(100vw-2rem))]! max-w-none! flex-col overflow-hidden rounded-xl border outline-none"
      >
        <SheetHeader className="sr-only p-0">
          <SheetTitle>
            {mode === "view"
              ? "Task details"
              : mode === "edit"
                ? "Edit task"
                : "Create task"}
          </SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {viewOrder ? (
              <OrderView order={viewOrder} />
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
                    name="product"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor="order-sheet-title">
                          Deliverable name
                        </FieldLabel>
                        <Input
                          {...field}
                          id="order-sheet-title"
                          placeholder="Deliverable name"
                          aria-invalid={fieldState.invalid || undefined}
                          autoFocus
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                </FieldGroup>

                {/* Metadata pills. Each holds a union value, so the messages sit
                    under the row rather than splitting it into stacked fields. */}
                <div
                  className="mt-5 flex flex-wrap items-center gap-2"
                  aria-label="Task metadata"
                >
                  <Controller
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select task status"
                        value={optionFor(STATUS_OPTIONS, field.value)}
                        items={STATUS_OPTIONS}
                        searchPlaceholder="Change status"
                        emptyMessage="No statuses found."
                        onValueChange={(option) => field.onChange(option.value)}
                        renderOption={(option) => (
                          <span className="flex min-w-0 items-center gap-2">
                            <StatusDot status={option.value as OrderStatus} />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="channel"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select task project"
                        value={optionFor(CHANNEL_OPTIONS, field.value)}
                        items={CHANNEL_OPTIONS}
                        searchPlaceholder="Change project"
                        emptyMessage="No projects found."
                        onValueChange={(option) => field.onChange(option.value)}
                        renderOption={(option) => (
                          <span className="flex min-w-0 items-center gap-2">
                            <FolderIcon
                              className="size-4 shrink-0 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )}
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="stage"
                    render={({ field }) => (
                      <InlineSingleCombobox
                        ariaLabel="Select task stage"
                        value={optionFor(STAGE_OPTIONS, field.value)}
                        items={STAGE_OPTIONS}
                        searchPlaceholder="Change stage"
                        emptyMessage="No stages found."
                        onValueChange={(option) => field.onChange(option.value)}
                        renderOption={(option) => (
                          <span className="flex min-w-0 items-center gap-2">
                            <FlagIcon
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
                  errors={[errors.status, errors.channel, errors.stage]}
                />

                <FieldGroup className="mt-6 gap-4">
                  <Controller
                    control={form.control}
                    name="customer"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor="order-sheet-customer">
                          Assignee
                        </FieldLabel>
                        <Input
                          {...field}
                          id="order-sheet-customer"
                          placeholder="Assignee name"
                          aria-invalid={fieldState.invalid || undefined}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="sku"
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor="order-sheet-sku">
                          Reference
                        </FieldLabel>
                        <Input
                          {...field}
                          id="order-sheet-sku"
                          placeholder="e.g. WEB-142"
                          className="font-mono"
                          aria-invalid={fieldState.invalid || undefined}
                        />
                        <FieldError errors={[fieldState.error]} />
                      </Field>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Controller
                      control={form.control}
                      name="quantity"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid || undefined}>
                          <FieldLabel htmlFor="order-sheet-quantity">
                            Subtasks
                          </FieldLabel>
                          <Input
                            {...field}
                            id="order-sheet-quantity"
                            type="number"
                            min={0}
                            step={1}
                            aria-invalid={fieldState.invalid || undefined}
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="amount"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid || undefined}>
                          <FieldLabel htmlFor="order-sheet-amount">
                            Estimate (h)
                          </FieldLabel>
                          <Input
                            {...field}
                            id="order-sheet-amount"
                            type="number"
                            min={0}
                            step={1}
                            aria-invalid={fieldState.invalid || undefined}
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                    <Controller
                      control={form.control}
                      name="progress"
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid || undefined}>
                          <FieldLabel htmlFor="order-sheet-progress">
                            Progress (%)
                          </FieldLabel>
                          <Input
                            {...field}
                            id="order-sheet-progress"
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            aria-invalid={fieldState.invalid || undefined}
                          />
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  </div>
                </FieldGroup>
              </form>
            )}
          </ScrollArea>
        </div>

        <SheetFooter className="shrink-0 gap-3 border-t bg-muted">
          {viewOrder ? (
            <div className="flex w-full items-center justify-end gap-2">
              <DeleteConfirm
                orderTitle={viewOrder.product}
                onConfirm={() => onDelete(viewOrder)}
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
              {mode === "edit" && baseOrder ? (
                <DeleteConfirm
                  orderTitle={baseOrder.product}
                  onConfirm={() => onDelete(baseOrder)}
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
                {mode === "edit" ? "Save changes" : "Create task"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
