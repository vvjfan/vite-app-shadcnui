import { z } from "zod"

import type { OrderRecord } from "../components/data"
import {
  optionFor,
  orderFormValues,
  CHANNEL_OPTIONS,
  CHANNEL_VALUES,
  STAGE_OPTIONS,
  STATUS_OPTIONS,
  STATUS_VALUES,
} from "./order-form"
import type { OrderFormValues } from "./order-form"

/**
 * Client-side validation for the order sheet.
 *
 * The unions are not retyped here: STATUS_VALUES / CHANNEL_VALUES are the
 * runtime lists order-form.ts declares from OrderStatus / OrderChannel, so a new
 * member of either union widens the dropdown and this schema together.
 *
 * The three numeric fields stay strings, because that is what an
 * `<input type="number">` hands back (and an emptied one hands back ""). They
 * are validated here and coerced by buildOrderPayload, which is unchanged.
 */

// ── Numeric text fields ──

/**
 * A number typed into a text input. One issue at most per field: the first
 * failing rule returns, so the sheet never stacks "Enter a number." on top of a
 * range message for the same box.
 */
function numericField(config: {
  required: string
  range: string
  min: number
  max?: number
  whole?: boolean
}) {
  return z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      if (value.length === 0) {
        ctx.addIssue({ code: "custom", message: config.required })
        return
      }
      const parsed = Number(value)
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({ code: "custom", message: config.required })
        return
      }
      if (config.whole && !Number.isInteger(parsed)) {
        ctx.addIssue({ code: "custom", message: "Enter a whole number." })
        return
      }
      if (
        parsed < config.min ||
        (config.max !== undefined && parsed > config.max)
      ) {
        ctx.addIssue({ code: "custom", message: config.range })
      }
    })
}

// ── Schema ──

export const orderSchema = z.object({
  product: z
    .string()
    .trim()
    .min(1, { error: "Enter a deliverable name." })
    .max(120, { error: "Use 120 characters or fewer." }),
  customer: z.string().trim().max(80, { error: "Use 80 characters or fewer." }),
  sku: z.string().trim().max(32, { error: "Use 32 characters or fewer." }),
  status: z.enum(STATUS_VALUES, { error: "Choose a status." }),
  channel: z.enum(CHANNEL_VALUES, { error: "Choose a project." }),
  // `stage` is a free string on OrderRecord, so it is required rather than
  // constrained: a record carrying a stage outside the suggestions still saves.
  stage: z.string().trim().min(1, { error: "Choose a stage." }),
  quantity: numericField({
    required: "Enter a number of subtasks.",
    range: "Enter 0 or more.",
    min: 0,
    whole: true,
  }),
  amount: numericField({
    required: "Enter an estimate in hours.",
    range: "Enter 0 or more.",
    min: 0,
  }),
  progress: numericField({
    required: "Enter a progress value.",
    range: "Enter a value between 0 and 100.",
    min: 0,
    max: 100,
  }),
})

export type OrderFormInput = z.infer<typeof orderSchema>

// ── Form <-> record bridges ──

/**
 * The values the sheet opens with: an existing record's, or the blank create
 * defaults. Delegates to orderFormValues so the two hydration paths cannot
 * drift, and flattens the option objects down to the union values the schema
 * validates.
 */
export function orderDefaultValues(source: OrderRecord | null): OrderFormInput {
  const values = orderFormValues(source)
  return {
    product: values.product,
    customer: values.customer,
    sku: values.sku,
    status: source?.status ?? STATUS_VALUES[0],
    channel: source?.channel ?? CHANNEL_VALUES[0],
    stage: values.stage.value,
    quantity: values.quantity,
    amount: values.amount,
    progress: values.progress,
  }
}

/** Back to the option-shaped values buildOrderPayload already takes. */
export function toOrderFormValues(input: OrderFormInput): OrderFormValues {
  return {
    product: input.product,
    customer: input.customer,
    sku: input.sku,
    status: optionFor(STATUS_OPTIONS, input.status),
    channel: optionFor(CHANNEL_OPTIONS, input.channel),
    stage: optionFor(STAGE_OPTIONS, input.stage),
    quantity: input.quantity,
    amount: input.amount,
    progress: input.progress,
  }
}
