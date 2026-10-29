import * as React from "react"
import { useCallback, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { ChannelFocus } from "./analytics-charts"
import { Chart as PerformanceChart } from "./catalog-health/chart"
import type { OrderRecord, Period } from "./data"
import { OrderSheet } from "./order-sheet"
import type { OrderSheetState } from "./order-sheet"
import { OrderTable } from "./order-table"
import { SalesControl } from "./sales-control"
import { filterOrders } from "../lib/filter-orders"
import {
  deleteToast,
  orderExists,
  removeOrder,
  selectionAfterDelete,
  sheetAfterCancelEdit,
  sheetAfterEdit,
  submitToast,
  upsertOrder,
} from "../lib/order-crud"

/**
 * Task-management overview dashboard. The app-shell provides the top header, so this
 * page renders none of its own. The developer swapped the top KPI cards for the chart-1
 * performance widget. Tasks arrive from the route loader and are lifted into local state
 * so the queue supports full create / view / edit / delete; the search/exceptions list
 * state lives in the URL (routes/_app/home.tsx).
 */

export function RevenueDashboard({
  orders: initialOrders,
  query,
  exceptionsOnly,
  onQueryChange,
  onExceptionsToggle,
}: {
  orders: OrderRecord[]
  query: string
  exceptionsOnly: boolean
  onQueryChange: (query: string) => void
  onExceptionsToggle: () => void
}) {
  const period: Period = "month"
  const [channelFocus, setChannelFocus] = useState<ChannelFocus>("all")
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders)
  const ordersRef = useRef(orders)
  React.useLayoutEffect(() => {
    ordersRef.current = orders
  })
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [sheet, setSheet] = useState<OrderSheetState | null>(null)
  const [orderToDelete, setOrderToDelete] = useState<OrderRecord | null>(null)

  const filteredOrders = useMemo(
    () => filterOrders(orders, query, exceptionsOnly),
    [orders, exceptionsOnly, query]
  )

  function handleChannelFocusToggle() {
    setChannelFocus((current) => (current === "direct" ? "all" : "direct"))
  }

  // Create (new order) or update (existing) from the order sheet.
  const handleSubmitOrder = useCallback((order: OrderRecord) => {
    const exists = orderExists(ordersRef.current, order.id)
    setOrders((current) => upsertOrder(current, order))
    const copy = submitToast(order, exists)
    toast.success(copy.title, { description: copy.description })
  }, [])

  const performDeleteOrder = useCallback((order: OrderRecord) => {
    setOrders((current) => removeOrder(current, order.id))
    setSheet(null)
    setSelectedOrderId((current) => selectionAfterDelete(current, order.id))
    const copy = deleteToast(order)
    toast.success(copy.title, { description: copy.description })
  }, [])

  const openViewOrder = useCallback((order: OrderRecord) => {
    setSelectedOrderId(order.id)
    setSheet({ mode: "view", order })
  }, [])

  const openCreateOrder = useCallback(() => {
    setSelectedOrderId(null)
    setSheet({ mode: "create" })
  }, [])

  const startEditOrder = useCallback((order: OrderRecord) => {
    setSelectedOrderId(order.id)
    setSheet({ mode: "edit", order })
  }, [])

  const editFromSheet = useCallback(() => {
    setSheet(sheetAfterEdit)
  }, [])

  const cancelEditOrder = useCallback(() => {
    setSheet(sheetAfterCancelEdit)
  }, [])

  const closeSheet = useCallback((open: boolean) => {
    if (!open) {
      setSheet(null)
      setSelectedOrderId(null)
    }
  }, [])

  const requestDeleteOrder = useCallback((order: OrderRecord) => {
    setOrderToDelete(order)
  }, [])

  return (
    // Every page owns exactly one h1, so the Frame headings below it (h2) start a
    // valid outline. The other pages declare theirs in the route file; Home's route
    // renders this component as its whole body, so the heading belongs on this root
    // rather than in a wrapper div that would duplicate these layout classes.
    <div
      className="flex w-full flex-col gap-4.5"
      aria-labelledby="page-heading"
    >
      <h1 id="page-heading" className="sr-only">
        Home
      </h1>

      {/* Performance overview (chart-1) - replaces dashboard-7's top KPI cards */}
      <PerformanceChart />

      {/* Analytics */}
      <SalesControl
        period={period}
        channelFocus={channelFocus}
        onChannelFocusToggle={handleChannelFocusToggle}
      />

      {/* Orders */}
      <OrderTable
        orders={filteredOrders}
        totalCount={orders.length}
        query={query}
        exceptionsOnly={exceptionsOnly}
        selectedOrderId={selectedOrderId}
        onQueryChange={onQueryChange}
        onExceptionsToggle={onExceptionsToggle}
        onCreateOrder={openCreateOrder}
        onViewOrder={openViewOrder}
        onEditOrder={startEditOrder}
        onDeleteOrder={requestDeleteOrder}
      />

      <OrderSheet
        state={sheet}
        onOpenChange={closeSheet}
        onSubmit={handleSubmitOrder}
        onEdit={editFromSheet}
        onCancelEdit={cancelEditOrder}
        onDelete={performDeleteOrder}
      />

      <AlertDialog
        open={orderToDelete !== null}
        onOpenChange={(open) => !open && setOrderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{orderToDelete?.product}&rdquo; will be removed from the
              queue. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (orderToDelete) performDeleteOrder(orderToDelete)
                setOrderToDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
