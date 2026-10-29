import { Badge } from "@/components/reui/badge"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import type { ColumnDef } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { STATUS_BADGES, STATUS_DOT } from "./data"
import type { OrderRecord } from "./data"
import { pluralize } from "../lib/pluralize"
import {
  EyeIcon,
  DotsThreeIcon as MoreHorizontalIcon,
  PencilSimpleIcon as PencilIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"

function OrderCell({
  order,
  onView,
}: {
  order: OrderRecord
  onView: (order: OrderRecord) => void
}) {
  return (
    <div className="min-w-0">
      <button
        type="button"
        className="block max-w-full truncate text-left text-sm font-medium underline-offset-2 transition-colors hover:text-primary hover:underline"
        aria-label={`View task ${order.id}`}
        onClick={(event) => {
          event.stopPropagation()
          onView(order)
        }}
      >
        {order.id}
      </button>
      <div className="truncate text-xs text-muted-foreground">{order.date}</div>
    </div>
  )
}

function CustomerCell({ order }: { order: OrderRecord }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative shrink-0">
        <Avatar className="size-8">
          <AvatarImage src={order.image} alt={order.customer} />
          <AvatarFallback>{order.initials}</AvatarFallback>
        </Avatar>
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-0 bottom-0.5 size-2 rounded-full ring-2 ring-background",
            STATUS_DOT[order.status]
          )}
        />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{order.customer}</div>
        <div className="truncate text-xs text-muted-foreground">
          {order.channel}
        </div>
      </div>
    </div>
  )
}

function ProductCell({ order }: { order: OrderRecord }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm font-medium">{order.product}</div>
      <div className="truncate font-mono text-xs text-muted-foreground">
        {order.sku}
      </div>
    </div>
  )
}

function FulfillmentCell({ order }: { order: OrderRecord }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="truncate text-sm font-medium">{order.stage}</span>
      <div className="flex min-w-0 items-center gap-2">
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
      </div>
    </div>
  )
}

function AmountCell({ order }: { order: OrderRecord }) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-medium tabular-nums">{order.amount}h</div>
      <div className="text-xs text-muted-foreground tabular-nums">
        {pluralize(order.quantity)}
      </div>
    </div>
  )
}

function StatusCell({ order }: { order: OrderRecord }) {
  return (
    <Badge variant={STATUS_BADGES[order.status]} className="gap-1.5">
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", STATUS_DOT[order.status])}
      />
      {order.status}
    </Badge>
  )
}

function ActionsCell({
  order,
  selected,
  onView,
  onEdit,
  onDelete,
}: {
  order: OrderRecord
  selected: boolean
  onView: (order: OrderRecord) => void
  onEdit: (order: OrderRecord) => void
  onDelete: (order: OrderRecord) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="icon-sm"
            variant={selected ? "secondary" : "ghost"}
            aria-label={`Task actions for ${order.id}`}
            aria-pressed={selected}
          />
        }
      >
        <MoreHorizontalIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onView(order)}>
            <EyeIcon className="size-4" aria-hidden="true" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(order)}>
            <PencilIcon className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onDelete(order)}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function createOrderColumns({
  selectedOrderId,
  onView,
  onEdit,
  onDelete,
}: {
  selectedOrderId: string | null
  onView: (order: OrderRecord) => void
  onEdit: (order: OrderRecord) => void
  onDelete: (order: OrderRecord) => void
}): ColumnDef<OrderRecord>[] {
  return [
    {
      accessorKey: "id",
      id: "id",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <OrderCell order={row.original} onView={onView} />,
      size: 144,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Task",
        cellClassName: "ps-4!",
        headerClassName: "ps-4!",
      },
    },
    {
      accessorKey: "customer",
      id: "customer",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <CustomerCell order={row.original} />,
      size: 224,
      minSize: 190,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Assignee",
        autoSize: true,
      },
    },
    {
      accessorKey: "product",
      id: "product",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <ProductCell order={row.original} />,
      size: 196,
      minSize: 160,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Deliverable",
      },
    },
    {
      accessorKey: "progress",
      id: "fulfillment",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <FulfillmentCell order={row.original} />,
      size: 196,
      minSize: 160,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Progress",
      },
    },
    {
      accessorKey: "amount",
      id: "amount",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <AmountCell order={row.original} />,
      size: 120,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Estimate",
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader column={column} visibility={true} />
      ),
      cell: ({ row }) => <StatusCell order={row.original} />,
      size: 128,
      enableSorting: true,
      enableHiding: false,
      enableResizing: true,
      meta: {
        headerTitle: "Status",
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ActionsCell
          order={row.original}
          selected={selectedOrderId === row.original.id}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
      size: 88,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      meta: {
        cellClassName: "pe-4!",
        headerClassName: "pe-4!",
      },
    },
  ]
}
