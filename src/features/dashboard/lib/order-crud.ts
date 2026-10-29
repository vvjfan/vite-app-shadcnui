import type { OrderRecord } from "../components/data"
import type { OrderSheetState } from "../components/order-sheet"

/**
 * Pure task-queue mutations for the dashboard. The component keeps its useState
 * and its toast calls; every list transition lives here so it can be exercised
 * without rendering.
 *
 * Nothing mutates its argument. The queue is seeded from ORDERS, a module-level
 * constant the route loader hands out by reference, so an in-place edit would
 * leak into every later navigation and survive a reload of the page.
 */

export function orderExists(orders: OrderRecord[], id: string): boolean {
  return orders.some((item) => item.id === id)
}

/**
 * Create or update in one call, keyed on the id.
 *
 * A create prepends so the new task is visible without scrolling or paging; an
 * update replaces in place so the row does not jump under the user's cursor.
 * The id therefore decides which of the two happens, which is why the sheet's
 * generated ids must never collide with a seed id.
 */
export function upsertOrder(
  orders: OrderRecord[],
  order: OrderRecord
): OrderRecord[] {
  return orderExists(orders, order.id)
    ? orders.map((item) => (item.id === order.id ? order : item))
    : [order, ...orders]
}

export function removeOrder(orders: OrderRecord[], id: string): OrderRecord[] {
  return orders.filter((item) => item.id !== id)
}

/**
 * The row highlight has to let go of a record that no longer exists, otherwise
 * a later create that reused the id would come back pre-selected.
 */
export function selectionAfterDelete(
  selectedOrderId: string | null,
  deletedId: string
): string | null {
  return selectedOrderId === deletedId ? null : selectedOrderId
}

export interface OrderToast {
  title: string
  description: string
}

/**
 * Confirmation copy for a sheet submit. The queue can be filtered or paged, so
 * a created task may land off-screen; naming the record and saying where it
 * went is what makes the change legible.
 */
export function submitToast(order: OrderRecord, exists: boolean): OrderToast {
  return {
    title: exists ? "Task updated" : "Task created",
    description: exists
      ? `${order.id} "${order.product}" was updated.`
      : `${order.id} "${order.product}" was added to the top of the queue.`,
  }
}

export function deleteToast(order: OrderRecord): OrderToast {
  return {
    title: "Task deleted",
    description: `${order.id} "${order.product}" was removed from the queue.`,
  }
}

/**
 * View -> edit for the record already on screen. A sheet with no record (a
 * create in progress) is already a form, so there is nothing to switch to and
 * the state is returned untouched.
 */
export function sheetAfterEdit(
  state: OrderSheetState | null
): OrderSheetState | null {
  return state?.order ? { mode: "edit", order: state.order } : state
}

/**
 * Cancel out of edit. Deliberately asymmetric with sheetAfterEdit: cancelling an
 * edit falls back to the read-only view of the same record, but cancelling a
 * create has nothing to fall back to, so the sheet closes entirely.
 */
export function sheetAfterCancelEdit(
  state: OrderSheetState | null
): OrderSheetState | null {
  return state?.order ? { mode: "view", order: state.order } : null
}
