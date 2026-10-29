import { memo } from "react"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { Badge } from "@/components/reui/badge"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
import {
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/reui/data-grid/data-grid-table"
import type { Row, Table, ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Item, ItemMedia } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import type { IRoutingRule, RoutingRuleKind, RoutingRuleStatus } from "./data"
import {
  DotsThreeIcon as MoreHorizontalIcon,
  EyeIcon,
  PencilSimpleIcon as PencilIcon,
  CopyIcon,
  TrashIcon as Trash2Icon,
  ArrowRightIcon,
} from "@phosphor-icons/react"

/**
 * Handlers passed to the table via `meta` so the module-level columns can
 * dispatch View / Edit / Delete without being rebuilt per render.
 */
export interface RoutingRuleTableMeta {
  onView: (rule: IRoutingRule) => void
  onEdit: (rule: IRoutingRule) => void
  onDelete: (rule: IRoutingRule) => void
}

function formatTokens(tokens: number) {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`
  return String(tokens)
}

export const StatusBadge = memo(function StatusBadge({
  status,
}: {
  status: RoutingRuleStatus
}) {
  if (status === "healthy")
    return <Badge variant="success-outline">Healthy</Badge>
  if (status === "at_risk")
    return <Badge variant="warning-outline">At Risk</Badge>
  if (status === "paused") return <Badge variant="info-outline">Paused</Badge>
  return <Badge variant="destructive-outline">Blocked</Badge>
})

const kindLabel: Record<RoutingRuleKind, string> = {
  primary: "Primary",
  fallback: "Fallback",
  guardrail: "Guardrail",
  batch: "Batch",
}

export const KindBadge = memo(function KindBadge({
  kind,
}: {
  kind: RoutingRuleKind
}) {
  return <Badge variant="secondary">{kindLabel[kind]}</Badge>
})

const RuleCell = memo(function RuleCell({ row }: { row: Row<IRoutingRule> }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Item className="flex size-8 shrink-0 items-center justify-center border-2 border-background bg-muted p-0 shadow-[0_1px_3px_0_rgba(0,0,0,0.14)] dark:border [&_svg]:size-4 [&_svg]:text-accent-foreground">
        <ItemMedia variant="icon" className="size-auto">
          {row.original.providerLogo}
        </ItemMedia>
      </Item>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">
          {row.original.rule}
        </div>
        <div
          className="truncate text-xs text-muted-foreground"
          title={`${row.original.provider} / ${row.original.category}`}
        >
          {row.original.provider} / {row.original.category}
        </div>
      </div>
    </div>
  )
})

const ScopeCell = memo(function ScopeCell({ row }: { row: Row<IRoutingRule> }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-medium text-foreground">
        {row.original.scope}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {row.original.latency}
      </span>
    </div>
  )
})

export function ActionsCell({
  row,
  table,
}: {
  row: Row<IRoutingRule>
  table: Table<IRoutingRule>
}) {
  const { copyToClipboard } = useCopyToClipboard()
  const meta = table.options.meta as RoutingRuleTableMeta | undefined

  const handleCopyRef = () => {
    copyToClipboard(row.original.reference)
    toast.success("Rule copied", { description: row.original.reference })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-7"
            aria-label="Routing rule actions"
          />
        }
      >
        <MoreHorizontalIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => meta?.onView(row.original)}>
            <EyeIcon className="size-4" aria-hidden="true" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => meta?.onEdit(row.original)}>
            <PencilIcon className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleCopyRef}>
            <CopyIcon className="size-4" aria-hidden="true" />
            Copy ID
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => meta?.onDelete(row.original)}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const columns: ColumnDef<IRoutingRule>[] = [
  {
    accessorKey: "id",
    id: "id",
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    enableSorting: false,
    size: 35,
    enableResizing: false,
    enableHiding: false,
    meta: {
      skeleton: <Skeleton className="size-4" />,
      headerClassName:
        "[--data-grid-header-cell-ps:var(--frame-panel-header-px)]",
      cellClassName: "[--data-grid-body-cell-ps:var(--frame-panel-px)]",
    },
  },
  {
    accessorKey: "reference",
    id: "reference",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row, table }) => (
      <div className="flex min-w-0 flex-col gap-0.5">
        <button
          type="button"
          onClick={() =>
            (table.options.meta as RoutingRuleTableMeta | undefined)?.onView(
              row.original
            )
          }
          className="group/ref inline-flex min-w-0 cursor-pointer items-center gap-1 truncate text-left font-mono text-xs font-medium text-foreground transition-colors hover:text-primary"
          aria-label={`Open ${row.original.reference}`}
        >
          <span className="border-b border-transparent py-0.25 transition-colors group-hover/ref:border-primary">
            {row.original.reference}
          </span>
          <ArrowRightIcon
            className="size-3 shrink-0 -translate-x-1 opacity-0 transition-all group-hover/ref:translate-x-0 group-hover/ref:opacity-100"
            aria-hidden="true"
          />
        </button>
        <span className="text-xs text-muted-foreground">
          {row.original.updated}
        </span>
      </div>
    ),
    size: 150,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Reference",
      skeleton: (
        <div className="flex min-w-0 flex-col gap-0.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-20" />
        </div>
      ),
    },
  },
  {
    accessorKey: "rule",
    id: "rule",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <RuleCell row={row} />,
    minSize: 150,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Rule",
      skeleton: (
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ),
    },
  },
  {
    accessorKey: "scope",
    id: "scope",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <ScopeCell row={row} />,
    size: 170,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Scope",
      skeleton: (
        <div className="flex flex-col gap-0.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
      ),
    },
  },
  {
    accessorKey: "kind",
    id: "kind",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <KindBadge kind={row.original.kind} />,
    size: 120,
    enableSorting: true,
    enableHiding: true,
    enableResizing: true,
    meta: {
      headerTitle: "Kind",
      skeleton: <Skeleton className="h-6 w-20 rounded-full" />,
    },
  },
  {
    accessorKey: "dailyTokens",
    id: "dailyTokens",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => {
      return (
        <span className="font-semibold tabular-nums">
          {formatTokens(row.original.dailyTokens)}
        </span>
      )
    },
    size: 100,
    enableSorting: true,
    enableHiding: true,
    meta: {
      headerTitle: "Tokens",
      skeleton: <Skeleton className="h-4 w-20" />,
    },
  },
  {
    accessorKey: "status",
    id: "status",
    header: ({ column }) => (
      <DataGridColumnHeader column={column} visibility={true} />
    ),
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    size: 90,
    enableSorting: true,
    enableHiding: true,
    enableResizing: false,
    meta: {
      headerTitle: "Status",
      skeleton: <Skeleton className="h-6 w-20 rounded-full" />,
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row, table }) => <ActionsCell row={row} table={table} />,
    size: 50,
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
    meta: {
      skeleton: <Skeleton className="size-7" />,
      headerClassName:
        "[--data-grid-header-cell-pe:var(--frame-panel-header-px)]",
      cellClassName: "[--data-grid-body-cell-pe:var(--frame-panel-px)]",
    },
  },
]
