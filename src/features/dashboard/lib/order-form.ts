import { format } from "date-fns"

import type { OrderChannel, OrderRecord, OrderStatus } from "../components/data"

/**
 * Pure form model behind the order sheet: the reference option lists, the
 * record -> form hydration, and the form -> record payload build. The component
 * keeps the useState and the effect; only the computation lives here.
 */

// ── Enum / reference option lists ──
// The page ships no runtime arrays for these, so they are declared from the
// OrderRecord unions. STATUS_VALUES and CHANNEL_VALUES must stay exhaustive over
// OrderStatus / OrderChannel or a seed record would open in the sheet showing a
// status the dropdown cannot offer back.

export const STATUS_VALUES: OrderStatus[] = [
  "In Progress",
  "Review",
  "Blocked",
  "Done",
]
export const CHANNEL_VALUES: OrderChannel[] = [
  "Product",
  "Platform",
  "Growth",
  "Ops",
]
// `stage` is a free string on OrderRecord, not a union, so this list is the
// suggested set rather than an exhaustive one.
export const STAGE_VALUES: string[] = [
  "Backlog",
  "In progress",
  "In review",
  "Blocked",
  "Merged",
]

export interface InlineOption {
  id: string
  value: string
  label: string
  searchText: string
}

export function toOption(value: string): InlineOption {
  return {
    id: value,
    value,
    label: value,
    searchText: value.toLowerCase(),
  }
}

export const STATUS_OPTIONS: InlineOption[] = STATUS_VALUES.map(toOption)
export const CHANNEL_OPTIONS: InlineOption[] = CHANNEL_VALUES.map(toOption)
export const STAGE_OPTIONS: InlineOption[] = STAGE_VALUES.map(toOption)

/**
 * Looks a stored value up in its option list, falling back to a synthesised
 * option. The fallback matters for `stage`, which is a free string: a record
 * carrying a stage outside STAGE_VALUES still opens with its own value shown
 * instead of silently snapping to the first suggestion.
 */
export function optionFor(
  options: InlineOption[],
  value: string
): InlineOption {
  return options.find((option) => option.value === value) ?? toOption(value)
}

// ── Field derivation ──

/** Avatar fallback for a record that carries no image. */
export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "NA"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

/** Number inputs hand back strings, and an emptied one hands back "". */
export function toNumber(input: string): number {
  const parsed = Number(input)
  return Number.isFinite(parsed) ? parsed : 0
}

// Monotonic within the session so a new order never collides with a seed id
// (4-digit) or a prior create - a colliding id would be misread as an update.
let orderSeq = Date.now()

export function newOrderId(): string {
  orderSeq += 1
  return `TASK-${String(orderSeq).slice(-6)}`
}

// ── Form values ──

export interface OrderFormValues {
  product: string
  customer: string
  sku: string
  status: InlineOption
  channel: InlineOption
  stage: InlineOption
  /** raw <input type="number"> text, not yet coerced */
  quantity: string
  amount: string
  progress: string
}

/**
 * Hydration for the sheet: the values a record should present in the form, or
 * the blank defaults when there is no record (create). Returning the whole set
 * either way keeps the two paths from drifting, which is how a create ends up
 * inheriting a leftover field from the record viewed just before it.
 */
export function orderFormValues(source: OrderRecord | null): OrderFormValues {
  if (!source) {
    return {
      product: "",
      customer: "",
      sku: "",
      status: STATUS_OPTIONS[0],
      channel: CHANNEL_OPTIONS[0],
      stage: STAGE_OPTIONS[0],
      quantity: "0",
      amount: "0",
      progress: "0",
    }
  }

  return {
    product: source.product,
    customer: source.customer,
    sku: source.sku,
    status: optionFor(STATUS_OPTIONS, source.status),
    channel: optionFor(CHANNEL_OPTIONS, source.channel),
    stage: optionFor(STAGE_OPTIONS, source.stage),
    quantity: String(source.quantity),
    amount: String(source.amount),
    progress: String(source.progress),
  }
}

/** The submit button is disabled until a deliverable name is typed. */
export function canSubmitOrder(product: string): boolean {
  return product.trim().length > 0
}

/**
 * Builds the record the queue will store.
 *
 * `baseOrder` is the record being edited, or null for a create. An edit keeps
 * the fields the form never exposes (id, image, date) so saving cannot quietly
 * re-stamp a task's creation date; a create mints a fresh id and stamps today.
 * `now` is injectable purely so the stamp is assertable.
 *
 * Every numeric field is coerced and clamped here rather than trusted from the
 * form. The inputs hand back strings, an emptied one hands back "", and the
 * progress value is rendered straight into a CSS width, so the clamp is what
 * guarantees the stored record is in range whatever the form reports.
 */
export function buildOrderPayload(
  values: OrderFormValues,
  baseOrder: OrderRecord | null,
  now: Date = new Date()
): OrderRecord {
  const trimmedCustomer = values.customer.trim()

  return {
    id: baseOrder?.id ?? newOrderId(),
    customer: trimmedCustomer || "Unassigned",
    initials: trimmedCustomer ? deriveInitials(trimmedCustomer) : "NA",
    image: baseOrder?.image ?? "",
    product: values.product.trim(),
    sku: values.sku.trim() || "NEW-000",
    channel: values.channel.value as OrderChannel,
    quantity: Math.max(0, Math.round(toNumber(values.quantity))),
    date: baseOrder?.date ?? format(now, "MMM d, yyyy"),
    amount: Math.max(0, toNumber(values.amount)),
    stage: values.stage.value,
    progress: Math.min(100, Math.max(0, toNumber(values.progress))),
    status: values.status.value as OrderStatus,
  }
}
