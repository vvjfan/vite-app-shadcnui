import * as React from "react"

import { useCallback, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { Badge } from "@/components/reui/badge"
import { DataGrid } from "@/components/reui/data-grid/data-grid"
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header"
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
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  deleteSegment,
  formatPercent,
  getRows,
  segmentAfterSubmit,
  segmentExists,
  upsertSegment,
} from "../lib/segments"
import { segmentOptions, stageBreakdownRows } from "./data"
import type { RiskState, SegmentKey, StageBreakdownRow } from "./data"
import { SegmentSheet } from "./segment-sheet"
import type { SegmentSheetState } from "./segment-sheet"
import {
  DownloadSimpleIcon as DownloadIcon,
  EyeIcon,
  DotsThreeIcon as MoreHorizontalIcon,
  PencilSimpleIcon as PencilIcon,
  PlusIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"

type SegmentRowAction = "view" | "edit" | "delete"

const RISK_LABEL: Record<RiskState, string> = {
  healthy: "Healthy",
  watch: "Watch",
  drop_off: "Drop Off",
}

const RISK_VARIANT: Record<
  RiskState,
  "success-light" | "warning-light" | "destructive-light"
> = {
  healthy: "success-light",
  watch: "warning-light",
  drop_off: "destructive-light",
}

function SegmentCell({ row }: { row: StageBreakdownRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-medium text-foreground">
        {row.segment}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {row.id} - {row.cohort}
      </span>
    </div>
  )
}

function OwnerCell({ row }: { row: StageBreakdownRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar className="size-5 shrink-0">
        <AvatarImage src={row.ownerAvatar} alt="" />
        <AvatarFallback className="text-[9px]">
          {row.ownerInitials}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm text-muted-foreground">
        {row.owner}
      </span>
    </div>
  )
}

function StageCell({ value, total }: { value: number; total: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground tabular-nums">
        {value.toLocaleString()}
      </span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatPercent(value, total)}
      </span>
    </div>
  )
}

function RowActions({
  row,
  onAction,
}: {
  row: StageBreakdownRow
  onAction: (action: SegmentRowAction, row: StageBreakdownRow) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon-sm" variant="ghost" aria-label="Segment actions" />
        }
      >
        <MoreHorizontalIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onAction("view", row)}>
            <EyeIcon className="size-4" aria-hidden="true" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAction("edit", row)}>
            <PencilIcon className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => onAction("delete", row)}
          >
            <Trash2Icon className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function buildColumns(
  onAction: (action: SegmentRowAction, row: StageBreakdownRow) => void
): ColumnDef<StageBreakdownRow>[] {
  return [
    {
      accessorKey: "segment",
      id: "segment",
      header: ({ column }) => (
        <DataGridColumnHeader title="Segment" column={column} />
      ),
      cell: ({ row }) => <SegmentCell row={row.original} />,
      enableSorting: true,
      minSize: 260,
      meta: {
        autoSize: true,
        headerClassName: "ps-5",
        cellClassName: "ps-5",
      },
    },
    {
      accessorKey: "owner",
      id: "owner",
      header: ({ column }) => (
        <DataGridColumnHeader title="Owner" column={column} />
      ),
      cell: ({ row }) => <OwnerCell row={row.original} />,
      size: 160,
      enableSorting: true,
      meta: {
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
      },
    },
    {
      accessorKey: "inviteSent",
      id: "inviteSent",
      header: ({ column }) => (
        <DataGridColumnHeader title="Invites" column={column} />
      ),
      cell: ({ row }) => (
        <StageCell
          value={row.original.inviteSent}
          total={row.original.accountCreated}
        />
      ),
      size: 130,
      enableSorting: true,
    },
    {
      accessorKey: "savedReport",
      id: "savedReport",
      header: ({ column }) => (
        <DataGridColumnHeader title="Saved Reports" column={column} />
      ),
      cell: ({ row }) => (
        <StageCell
          value={row.original.savedReport}
          total={row.original.accountCreated}
        />
      ),
      size: 150,
      enableSorting: true,
      meta: {
        headerClassName: "hidden md:table-cell",
        cellClassName: "hidden md:table-cell",
      },
    },
    {
      accessorKey: "weekFourRetained",
      id: "weekFourRetained",
      header: ({ column }) => (
        <DataGridColumnHeader title="W4 Retained" column={column} />
      ),
      cell: ({ row }) => (
        <StageCell
          value={row.original.weekFourRetained}
          total={row.original.accountCreated}
        />
      ),
      size: 140,
      enableSorting: true,
      meta: {
        headerClassName: "hidden xl:table-cell",
        cellClassName: "hidden xl:table-cell",
      },
    },
    {
      accessorKey: "risk",
      id: "risk",
      header: ({ column }) => (
        <DataGridColumnHeader title="Risk" column={column} />
      ),
      cell: ({ row }) => (
        <Badge variant={RISK_VARIANT[row.original.risk]}>
          {RISK_LABEL[row.original.risk]}
        </Badge>
      ),
      size: 120,
      enableSorting: true,
      meta: {
        headerClassName: "hidden md:table-cell",
        cellClassName: "hidden md:table-cell",
      },
    },
    {
      accessorKey: "updatedAt",
      id: "updatedAt",
      header: ({ column }) => (
        <DataGridColumnHeader title="Updated" column={column} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.updatedAt}
        </span>
      ),
      size: 120,
      enableSorting: true,
      meta: {
        headerClassName: "hidden lg:table-cell",
        cellClassName: "hidden lg:table-cell",
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => <RowActions row={row.original} onAction={onAction} />,
      size: 56,
      enableSorting: false,
      enableResizing: false,
      meta: {
        headerClassName: "pe-5",
        cellClassName: "pe-5 text-end",
      },
    },
  ]
}

export function StageBreakdownGrid() {
  const [rows, setRows] = useState<StageBreakdownRow[]>(stageBreakdownRows)
  const rowsRef = useRef(rows)
  React.useLayoutEffect(() => {
    rowsRef.current = rows
  })
  const [sheet, setSheet] = useState<SegmentSheetState | null>(null)
  const [rowToDelete, setRowToDelete] = useState<StageBreakdownRow | null>(null)
  const [segment, setSegment] = useState<SegmentKey | "all">("all")
  const [sorting, setSorting] = useState<SortingState>([
    { id: "inviteSent", desc: true },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const data = useMemo(() => getRows(rows, segment), [rows, segment])

  const handleRowAction = useCallback(
    (action: SegmentRowAction, row: StageBreakdownRow) => {
      if (action === "view") {
        setSheet({ mode: "view", row })
        return
      }
      if (action === "edit") {
        setSheet({ mode: "edit", row })
        return
      }
      setRowToDelete(row)
    },
    []
  )

  const columns = useMemo(
    () => buildColumns(handleRowAction),
    [handleRowAction]
  )

  const handleSubmitSegment = useCallback((row: StageBreakdownRow) => {
    const exists = segmentExists(rowsRef.current, row.id)
    setRows((current) => upsertSegment(current, row))
    // A new row is not in any hard-coded segment bucket, so clear the segment
    // filter to "all" - otherwise the row the user just created stays hidden.
    setSegment((current) => segmentAfterSubmit(current, exists))
    toast.success(exists ? "Segment updated" : "Segment created", {
      description: exists
        ? `${row.id} "${row.segment}" was updated.`
        : `${row.id} "${row.segment}" was added to the breakdown.`,
    })
  }, [])

  const performDeleteSegment = useCallback((row: StageBreakdownRow) => {
    setRows((current) => deleteSegment(current, row.id))
    setSheet(null)
    toast.success("Segment deleted", {
      description: `${row.id} "${row.segment}" was removed from the breakdown.`,
    })
  }, [])

  const openCreateSegment = useCallback(() => setSheet({ mode: "create" }), [])

  const startEditSegment = useCallback(
    () =>
      setSheet((prev) => (prev?.row ? { mode: "edit", row: prev.row } : prev)),
    []
  )

  const cancelEditSegment = useCallback(
    () =>
      setSheet((prev) => (prev?.row ? { mode: "view", row: prev.row } : null)),
    []
  )

  const closeSegmentSheet = useCallback((open: boolean) => {
    if (!open) setSheet(null)
  }, [])

  const table = useReactTable({
    columns,
    data,
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <DataGrid
        table={table}
        recordCount={data.length}
        emptyMessage="No funnel segments match this filter."
        tableLayout={{
          columnsResizable: true,
          headerSticky: false,
          dense: true,
        }}
      >
        <Frame dense spacing="sm" className="w-full">
          <FrameHeader className="flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-col gap-0.5">
              <FrameTitle>Stage Breakdown</FrameTitle>
              <FrameDescription className="text-xs text-pretty">
                Segment cohorts by invite, report, and retained usage.
              </FrameDescription>
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto">
              <Select
                value={segment}
                onValueChange={(value) => {
                  if (value) {
                    setSegment(value)
                    setPagination((current) => ({ ...current, pageIndex: 0 }))
                  }
                }}
                items={segmentOptions}
              >
                <SelectTrigger className="min-w-0 flex-1 sm:min-w-[170px] sm:flex-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className="w-52"
                  align="end"
                >
                  {segmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() =>
                  toast.success("Summary exported", {
                    description: "Stage breakdown summary is ready.",
                  })
                }
              >
                <DownloadIcon data-icon="inline-start" aria-hidden="true" />
                Export
              </Button>
              <Button type="button" onClick={openCreateSegment}>
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                New segment
              </Button>
            </div>
          </FrameHeader>
          <FramePanel className="p-0! shadow-none!">
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </FramePanel>
          <FrameFooter>
            <DataGridPagination />
          </FrameFooter>
        </Frame>
      </DataGrid>

      <SegmentSheet
        state={sheet}
        onOpenChange={closeSegmentSheet}
        onSubmit={handleSubmitSegment}
        onEdit={startEditSegment}
        onCancelEdit={cancelEditSegment}
        onDelete={performDeleteSegment}
      />

      <AlertDialog
        open={rowToDelete !== null}
        onOpenChange={(open) => !open && setRowToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete segment?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{rowToDelete?.segment}&rdquo; will be removed from the
              breakdown. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (rowToDelete) performDeleteSegment(rowToDelete)
                setRowToDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
