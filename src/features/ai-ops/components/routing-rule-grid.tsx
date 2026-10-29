import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { DataGrid } from "@/components/reui/data-grid/data-grid"
import { DataGridPagination } from "@/components/reui/data-grid/data-grid-pagination"
import { DataGridScrollArea } from "@/components/reui/data-grid/data-grid-scroll-area"
import { DataGridTable } from "@/components/reui/data-grid/data-grid-table"
import { createFilter, Filters } from "@/components/reui/filters"
import type { Filter, FilterFieldConfig } from "@/components/reui/filters"
import {
  Frame,
  FrameDescription,
  FrameFooter,
  FrameHeader,
  FramePanel,
  FrameTitle,
} from "@/components/reui/frame"
import type {
  ColumnSizingState,
  PaginationState,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table"
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
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
import { Button } from "@/components/ui/button"
import { Item, ItemMedia } from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  applyFiltersToData,
  getActiveFilters,
  serializeActiveFiltersKey,
} from "../lib/filter-routing-rules"
import {
  commitDeleteRule,
  commitRule,
  ruleDeleteToast,
  ruleSubmitToast,
} from "../lib/routing-rule-crud"
import { ROUTING_RULES } from "./data"
import type { IRoutingRule, RoutingRuleKind, RoutingRuleStatus } from "./data"
import { columns, KindBadge, StatusBadge } from "./routing-rule-columns"
import type { RoutingRuleTableMeta } from "./routing-rule-columns"
import { RoutingRuleSheet } from "./routing-rule-sheet"
import type { RoutingRuleSheetState } from "./routing-rule-sheet"
import {
  HashIcon,
  BuildingsIcon as Building2Icon,
  PathIcon as RouteIcon,
  RadioButtonIcon as CircleDotIcon,
  DownloadSimpleIcon as DownloadIcon,
  FunnelIcon as FilterIcon,
  FunnelXIcon,
  PlusIcon,
} from "@phosphor-icons/react"

const STATUS_OPTIONS: { value: RoutingRuleStatus; label: string }[] = [
  { value: "healthy", label: "Healthy" },
  { value: "at_risk", label: "At Risk" },
  { value: "paused", label: "Paused" },
  { value: "blocked", label: "Blocked" },
]

const KIND_OPTIONS: { value: RoutingRuleKind; label: string }[] = [
  { value: "primary", label: "Primary" },
  { value: "fallback", label: "Fallback" },
  { value: "guardrail", label: "Guardrail" },
  { value: "batch", label: "Batch" },
]

const PROVIDER_FILTER_OPTIONS = Array.from(
  new Map(
    ROUTING_RULES.map((rule) => [
      rule.provider,
      {
        value: rule.provider,
        label: rule.provider,
        icon: (
          <Item
            render={<span />}
            className="w-auto shrink-0 border-0 p-0 [&_svg]:size-4"
          >
            <ItemMedia variant="icon" className="size-auto">
              {rule.providerLogo}
            </ItemMedia>
          </Item>
        ),
      },
    ])
  ).values()
)

function renderSelectedCount(values: unknown[]) {
  if (values.length === 0) return "Select..."
  if (values.length > 1) return `${values.length} selected`
  return null
}

const filterFields: FilterFieldConfig[] = [
  {
    key: "reference",
    label: "Reference",
    icon: <HashIcon className="size-3.5" aria-hidden />,
    type: "text",
    className: "w-44",
    placeholder: "Search...",
  },
  {
    key: "provider",
    label: "Provider",
    icon: <Building2Icon className="size-3.5" aria-hidden />,
    type: "select",
    searchable: true,
    className: "w-[200px]",
    options: PROVIDER_FILTER_OPTIONS,
  },
  {
    key: "kind",
    label: "Kind",
    icon: <RouteIcon className="size-3.5" aria-hidden />,
    type: "select",
    searchable: false,
    className: "w-[156px]",
    options: KIND_OPTIONS,
    customValueRenderer: (values) => {
      const state = renderSelectedCount(values)
      if (state) return state

      return <KindBadge kind={values[0] as RoutingRuleKind} />
    },
  },
  {
    key: "status",
    label: "Status",
    icon: <CircleDotIcon className="size-3.5" aria-hidden />,
    type: "select",
    searchable: false,
    className: "w-[156px]",
    options: STATUS_OPTIONS,
    customValueRenderer: (values) => {
      const state = renderSelectedCount(values)
      if (state) return state

      return <StatusBadge status={values[0] as RoutingRuleStatus} />
    },
  },
]

/** Single default row: Reference | contains | empty - inactive until user types (see getActiveFilters). */
function createDefaultRoutingRuleFilters(): Filter[] {
  return [createFilter("reference", "contains", [""])]
}

const RULE_COLUMN_ID = "rule"
const RULE_COLUMN_DEFAULT_SIZE = 300

function getAutoRuleColumnSize(
  containerWidth: number,
  columnVisibility: VisibilityState
) {
  const occupiedWidth = columns.reduce((total, column) => {
    if (
      !column.id ||
      column.id === RULE_COLUMN_ID ||
      columnVisibility[column.id] === false
    ) {
      return total
    }

    return total + (typeof column.size === "number" ? column.size : 0)
  }, 0)

  return Math.max(
    RULE_COLUMN_DEFAULT_SIZE,
    Math.round(containerWidth - occupiedWidth)
  )
}

export function RoutingRuleGrid() {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 5,
  })
  const [sorting, setSorting] = useState<SortingState>([
    { id: "reference", desc: true },
  ])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
  const [filters, setFilters] = useState<Filter[]>(
    createDefaultRoutingRuleFilters
  )

  // Grid-owned copy of the seed. All create/update/delete mutate this; the
  // module-level ROUTING_RULES constant is only the initial value.
  const [rules, setRules] = useState<IRoutingRule[]>(ROUTING_RULES)
  const rulesRef = useRef(rules)
  React.useLayoutEffect(() => {
    rulesRef.current = rules
  })
  const filtersRef = useRef(filters)
  React.useLayoutEffect(() => {
    filtersRef.current = filters
  })
  const [sheet, setSheet] = useState<RoutingRuleSheetState | null>(null)
  const [ruleToDelete, setRuleToDelete] = useState<IRoutingRule | null>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [filteredData, setFilteredData] =
    useState<IRoutingRule[]>(ROUTING_RULES)
  const [gridWidth, setGridWidth] = useState(0)
  const isInitialLoad = useRef(true)
  const gridWidthRef = useRef<HTMLDivElement>(null)
  const hasManualColumnSizing = useRef(false)
  const lastAppliedActiveKey = useRef<string>(
    serializeActiveFiltersKey(
      getActiveFilters(createDefaultRoutingRuleFilters())
    )
  )

  const applyFilters = useCallback((newFilters: Filter[]) => {
    return applyFiltersToData(rulesRef.current, newFilters)
  }, [])

  // Create (new rule) or update (existing) from the routing rule sheet.
  const handleSubmitRule = useCallback((rule: IRoutingRule) => {
    const {
      rules: next,
      filtered,
      created,
    } = commitRule(rulesRef.current, rule, filtersRef.current)
    rulesRef.current = next
    setRules(next)
    setFilteredData(filtered)
    // A new rule prepends to the source list; jump to the first page so it is
    // actually visible instead of being stranded on a later page by the sort.
    if (created) setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    const copy = ruleSubmitToast(rule, created)
    toast.success(copy.title, { description: copy.description })
  }, [])

  const performDeleteRule = useCallback((rule: IRoutingRule) => {
    const { rules: next, filtered } = commitDeleteRule(
      rulesRef.current,
      rule,
      filtersRef.current
    )
    rulesRef.current = next
    setRules(next)
    setFilteredData(filtered)
    setSheet(null)
    const copy = ruleDeleteToast(rule)
    toast.success(copy.title, { description: copy.description })
  }, [])

  const openCreateRule = useCallback(() => setSheet({ mode: "create" }), [])
  const openViewRule = useCallback(
    (rule: IRoutingRule) => setSheet({ mode: "view", rule }),
    []
  )
  const openEditRule = useCallback(
    (rule: IRoutingRule) => setSheet({ mode: "edit", rule }),
    []
  )
  const startEditRule = useCallback(
    () =>
      setSheet((prev) =>
        prev?.rule ? { mode: "edit", rule: prev.rule } : prev
      ),
    []
  )
  const cancelEditRule = useCallback(
    () =>
      setSheet((prev) =>
        prev?.rule ? { mode: "view", rule: prev.rule } : null
      ),
    []
  )
  const closeSheet = useCallback((open: boolean) => {
    if (!open) setSheet(null)
  }, [])

  const tableMeta: RoutingRuleTableMeta = {
    onView: openViewRule,
    onEdit: openEditRule,
    onDelete: setRuleToDelete,
  }

  const simulateAsyncFiltering = useCallback(
    async (newFilters: Filter[]) => {
      setIsLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 400))
      setFilteredData(applyFilters(newFilters))
      setIsLoading(false)
    },
    [applyFilters]
  )

  const handleFiltersChange = useCallback(
    (newFilters: Filter[]) => {
      setFilters(newFilters)
      const newActive = getActiveFilters(newFilters)
      const nextKey = serializeActiveFiltersKey(newActive)
      if (nextKey === lastAppliedActiveKey.current) return
      lastAppliedActiveKey.current = nextKey
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
      simulateAsyncFiltering(newFilters)
    },
    [simulateAsyncFiltering]
  )

  useEffect(() => {
    if (isInitialLoad.current) {
      setFilteredData(applyFilters(filters))
      isInitialLoad.current = false
    }
  }, [filters, applyFilters])

  useEffect(() => {
    const element = gridWidthRef.current

    if (!element) return

    const syncGridWidth = () => {
      setGridWidth(element.clientWidth)
    }

    syncGridWidth()

    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(syncGridWidth)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (gridWidth <= 0 || hasManualColumnSizing.current) return

    const nextRuleWidth = getAutoRuleColumnSize(gridWidth, columnVisibility)

    setColumnSizing((current) =>
      current[RULE_COLUMN_ID] === nextRuleWidth
        ? current
        : {
            ...current,
            [RULE_COLUMN_ID]: nextRuleWidth,
          }
    )
  }, [columnVisibility, gridWidth])

  const [columnOrder, setColumnOrder] = useState<string[]>(
    columns.map((c) => c.id as string)
  )

  const handleColumnSizingChange = useCallback(
    (
      updater:
        ColumnSizingState | ((old: ColumnSizingState) => ColumnSizingState)
    ) => {
      hasManualColumnSizing.current = true
      setColumnSizing(updater)
    },
    []
  )

  const table = useReactTable({
    columns,
    data: filteredData,
    meta: tableMeta,
    pageCount: Math.ceil(filteredData.length / pagination.pageSize),
    getRowId: (row) => row.id,
    state: {
      pagination,
      sorting,
      columnOrder,
      columnSizing,
      columnVisibility,
    },
    columnResizeMode: "onChange",
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  /** Show Clear whenever any filter row is visible (including empty placeholders). */
  const showClearButton = filters.length > 0

  return (
    <TooltipProvider delay={200}>
      <DataGrid
        table={table}
        isLoading={isLoading}
        loadingMode="skeleton"
        recordCount={filteredData.length}
        emptyMessage={
          !isLoading && filteredData.length === 0
            ? "No routing rules match these filters."
            : undefined
        }
        tableLayout={{
          columnsPinnable: true,
          columnsResizable: true,
          columnsMovable: true,
          columnsVisibility: true,
          headerSticky: true,
          dense: true,
        }}
      >
        <Frame dense spacing="sm" className="w-full">
          <FrameHeader className="flex-col items-start gap-3 @4xl:flex-row @4xl:items-center @4xl:justify-between">
            <div className="flex flex-col gap-0.5">
              <FrameTitle className="text-balance">Routing Rules</FrameTitle>
              <FrameDescription className="text-xs text-pretty">
                7 rules, 1 at risk, p95 refreshed 09:45.
              </FrameDescription>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  toast.success("Summary exported", {
                    description: "Routing policy summary is ready.",
                  })
                }
              >
                <DownloadIcon aria-hidden />
                Export
              </Button>
              <Button type="button" onClick={openCreateRule}>
                <PlusIcon aria-hidden />
                New rule
              </Button>
            </div>
          </FrameHeader>
          <FramePanel className="p-0! shadow-none!">
            <div className="flex flex-wrap items-center justify-between gap-2 px-(--frame-panel-header-px) py-(--frame-panel-header-py)">
              <Filters
                className="max-w-full min-w-0 overflow-x-auto"
                filters={filters}
                fields={filterFields}
                onChange={handleFiltersChange}
                size="default"
                trigger={
                  <Button type="button" variant="outline" aria-label="Filters">
                    <FilterIcon aria-hidden />
                    Filters
                  </Button>
                }
              />
              {showClearButton && (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => {
                    const next = createDefaultRoutingRuleFilters()
                    lastAppliedActiveKey.current = serializeActiveFiltersKey(
                      getActiveFilters(next)
                    )
                    setFilters(next)
                    simulateAsyncFiltering(next)
                  }}
                  disabled={isLoading}
                >
                  <FunnelXIcon className="size-3.5" aria-hidden />
                  Clear
                </Button>
              )}
            </div>
            <Separator />
            <div ref={gridWidthRef} className="w-full">
              <DataGridScrollArea className="[&_tr>*:first-child]:ps-(--frame-panel-header-px) [&_tr>*:last-child]:pe-(--frame-panel-header-px)">
                <DataGridTable />
              </DataGridScrollArea>
            </div>
          </FramePanel>
          <FrameFooter>
            <DataGridPagination />
          </FrameFooter>
        </Frame>
      </DataGrid>

      <RoutingRuleSheet
        state={sheet}
        rules={rules}
        onOpenChange={closeSheet}
        onSubmit={handleSubmitRule}
        onEdit={startEditRule}
        onCancelEdit={cancelEditRule}
        onDelete={performDeleteRule}
      />

      <AlertDialog
        open={ruleToDelete !== null}
        onOpenChange={(open) => !open && setRuleToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete routing rule?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{ruleToDelete?.rule}&rdquo; will be removed from the
              policy. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (ruleToDelete) performDeleteRule(ruleToDelete)
                setRuleToDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
