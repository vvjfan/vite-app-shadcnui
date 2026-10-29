import { useMemo, useState } from "react"
import { Badge } from "@/components/reui/badge"
import { DataGrid } from "@/components/reui/data-grid/data-grid"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type { PaginationState, SortingState } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { OrderRecord } from "./data"
import { createOrderColumns } from "./order-columns"
import {
  MagnifyingGlassIcon as SearchIcon,
  XIcon,
  FunnelIcon as FilterIcon,
  PlusIcon,
} from "@phosphor-icons/react"

export function OrderTable({
  orders,
  totalCount,
  query,
  exceptionsOnly,
  selectedOrderId,
  onQueryChange,
  onExceptionsToggle,
  onCreateOrder,
  onViewOrder,
  onEditOrder,
  onDeleteOrder,
}: {
  orders: OrderRecord[]
  totalCount: number
  query: string
  exceptionsOnly: boolean
  selectedOrderId: string | null
  onQueryChange: (query: string) => void
  onExceptionsToggle: () => void
  onCreateOrder: () => void
  onViewOrder: (order: OrderRecord) => void
  onEditOrder: (order: OrderRecord) => void
  onDeleteOrder: (order: OrderRecord) => void
}) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "amount", desc: true },
  ])

  const columns = useMemo(
    () =>
      createOrderColumns({
        selectedOrderId,
        onView: onViewOrder,
        onEdit: onEditOrder,
        onDelete: onDeleteOrder,
      }),
    [onDeleteOrder, onEditOrder, onViewOrder, selectedOrderId]
  )

  const resetPagination = () => {
    setPagination((current) =>
      current.pageIndex === 0 ? current : { ...current, pageIndex: 0 }
    )
  }

  const handleSearchChange = (value: string) => {
    onQueryChange(value)
    resetPagination()
  }

  const handleExceptionsToggle = () => {
    onExceptionsToggle()
    resetPagination()
  }

  const table = useReactTable({
    data: orders,
    columns,
    pageCount: Math.ceil(orders.length / pagination.pageSize),
    state: { pagination, sorting },
    columnResizeMode: "onChange",
    getRowId: (row) => row.id,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <DataGrid
      table={table}
      recordCount={orders.length}
      emptyMessage="No tasks match the current view."
      tableLayout={{
        dense: true,
        rowBorder: true,
        headerSticky: false,
        columnsVisibility: false,
        columnsResizable: true,
        columnsMovable: false,
        width: "fixed",
      }}
      tableClassNames={{
        bodyRow: "[&>td]:h-16",
      }}
    >
      <Frame dense className="min-w-0">
        <FrameHeader className="flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-px">
            <FrameTitle>Task Queue</FrameTitle>
            <FrameDescription>
              {orders.length} of {totalCount} tasks
            </FrameDescription>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <InputGroup className="w-full sm:min-w-56 lg:w-64">
              <InputGroupAddon>
                <SearchIcon aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search tasks"
                aria-label="Search tasks"
              />
              {query.length > 0 ? (
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label="Clear search"
                    onClick={() => handleSearchChange("")}
                  >
                    <XIcon aria-hidden="true" />
                  </InputGroupButton>
                </InputGroupAddon>
              ) : null}
            </InputGroup>
            <Button
              type="button"
              variant={exceptionsOnly ? "secondary" : "outline"}
              aria-pressed={exceptionsOnly}
              onClick={handleExceptionsToggle}
            >
              <FilterIcon aria-hidden="true" />
              Exceptions
              {exceptionsOnly ? (
                <Badge variant="info-outline">{orders.length}</Badge>
              ) : null}
            </Button>
            <Button type="button" onClick={onCreateOrder}>
              <PlusIcon aria-hidden="true" />
              New task
            </Button>
          </div>
        </FrameHeader>
        <FramePanel className="p-0!">
          <DataGridScrollArea>
            <DataGridTable />
          </DataGridScrollArea>
        </FramePanel>
        <FrameFooter>
          <DataGridPagination
            sizes={[5, 10]}
            info="{from} - {to} of {count} tasks"
            className="py-0"
          />
        </FrameFooter>
      </Frame>
    </DataGrid>
  )
}
