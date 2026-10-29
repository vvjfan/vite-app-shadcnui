import type { OrderRecord } from "../components/data"

function orderSearchBlob(order: OrderRecord): string {
  return [
    order.id,
    order.customer,
    order.product,
    order.channel,
    order.status,
    order.date,
  ]
    .join(" ")
    .toLowerCase()
}

/**
 * Pure task-queue filter used by the dashboard and the URL search params.
 * `query` matches any of the task's text fields; `exceptionsOnly` keeps only
 * tasks that still need action (anything not "Done").
 */
export function filterOrders(
  orders: OrderRecord[],
  query: string,
  exceptionsOnly: boolean
): OrderRecord[] {
  const normalizedQuery = query.trim().toLowerCase()

  return orders.filter((order) => {
    const matchesSearch =
      !normalizedQuery || orderSearchBlob(order).includes(normalizedQuery)
    const matchesFilter = !exceptionsOnly || order.status !== "Done"

    return matchesSearch && matchesFilter
  })
}
