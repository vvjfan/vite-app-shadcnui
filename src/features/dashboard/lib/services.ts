import { simulateLatency } from "@/lib/data/delay"
import { ORDERS } from "../components/data"
import type { OrderRecord } from "../components/data"

/**
 * Simulated order data access for the dashboard. The route loader calls these; the
 * dashboard components take the result as props and never import the seed directly.
 * Swap the internals for a real API (fetch/DB) without touching routes or components -
 * the async signatures stay identical.
 */

export async function getOrders(): Promise<OrderRecord[]> {
  await simulateLatency()
  return ORDERS
}

export async function getOrder(id: string): Promise<OrderRecord | undefined> {
  await simulateLatency()
  return ORDERS.find((order) => order.id === id)
}
