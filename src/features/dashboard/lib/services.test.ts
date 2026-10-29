import { describe, expect, it } from "vitest"

import { ORDERS } from "../components/data"
import { getOrder, getOrders } from "./services"

describe("dashboard orders service", () => {
  it("getOrders resolves the full ORDERS seed", async () => {
    const orders = await getOrders()
    expect(orders).toEqual(ORDERS)
    expect(orders.length).toBeGreaterThan(0)
  })

  it("getOrder resolves a known order by id", async () => {
    const order = await getOrder("TASK-2048")
    expect(order?.customer).toBe("Mira Stone")
  })

  it("getOrder resolves undefined for an unknown id", async () => {
    expect(await getOrder("does-not-exist")).toBeUndefined()
  })
})
