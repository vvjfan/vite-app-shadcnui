import * as React from "react"
import type { ReactNode } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/reui/badge"
import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  buildRoutingRule,
  categoryOptionForRule,
  categoryOptionsFrom,
  kindOptionFor,
  KIND_OPTIONS,
  providerLogoMapFrom,
  providerOptionForRule,
  providerOptionsFrom,
  scopeOptionFor,
  SCOPE_OPTIONS,
  statusOptionFor,
  STATUS_OPTIONS,
} from "../lib/routing-rule-form"
import type {
  InlineOption,
  KindOption,
  ProviderOption,
  ScopeOption,
  StatusOption,
} from "../lib/routing-rule-form"
import { routingRuleFormSchema } from "../lib/routing-rule-schema"
import type { RoutingRuleFormValues } from "../lib/routing-rule-schema"
import type { IRoutingRule } from "./data"
import { KindBadge, StatusBadge } from "./routing-rule-columns"
import {
  BuildingsIcon as Building2Icon,
  FlagIcon,
  GaugeIcon,
  StackIcon as LayersIcon,
  PencilSimpleIcon as PencilIcon,
  PathIcon as RouteIcon,
  TagIcon,
  TrashIcon as Trash2Icon,
} from "@phosphor-icons/react"

// A neutral fallback node for brand-new rules whose provider has no logo yet.
const DEFAULT_PROVIDER_LOGO: ReactNode = <RouteIcon aria-hidden="true" />

const CREATE_TIPS = [
  { icon: "🧭", text: "Name the rule by the work it routes, not the model." },
  {
    icon: "🛡️",
    text: "Match the kind and scope so failover stays predictable.",
  },
  { icon: "📊", text: "Keep the daily token budget close to real usage." },
]

// ── Glyph helpers ──

function ProviderGlyph({ logo }: { logo: ReactNode }) {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">
      {logo}
    </span>
  )
}

function formatTokens(tokens: number) {
  return tokens.toLocaleString("en-US")
}

// ── Generic single-select combobox pill ──

function InlineSingleCombobox<T extends InlineOption>({
  ariaLabel,
  value,
  items,
  searchPlaceholder,
  emptyMessage,
  renderOption,
  onValueChange,
}: {
  ariaLabel: string
  value: T
  items: T[]
  searchPlaceholder: string
  emptyMessage: string
  renderOption: (option: T) => ReactNode
  onValueChange: (option: T) => void
}) {
  return (
    <Combobox
      items={items}
      value={value}
      modal={false}
      onValueChange={(nextOption) => {
        if (nextOption) {
          onValueChange(nextOption)
        }
      }}
      itemToStringValue={(item: T) => item.searchText}
      isItemEqualToValue={(item, selected) => item.id === selected.id}
      autoHighlight
    >
      <ComboboxTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="max-w-full justify-between gap-2 font-normal"
            aria-label={ariaLabel}
          />
        }
      >
        <ComboboxValue>
          {(selectedOption: T | null) =>
            selectedOption ? renderOption(selectedOption) : null
          }
        </ComboboxValue>
      </ComboboxTrigger>

      <ComboboxContent className="pointer-events-auto min-w-60">
        <ComboboxInput
          showTrigger={false}
          placeholder={searchPlaceholder}
          className="mb-1"
        />
        <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        <ComboboxList>
          {(item: T) => (
            <ComboboxItem key={item.id} value={item}>
              {renderOption(item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// ── Delete confirmation ──

function DeleteConfirm({
  ruleName,
  onConfirm,
  children,
}: {
  ruleName: string
  onConfirm: () => void
  children: React.ReactNode
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={children as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete routing rule?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{ruleName}&rdquo; will be removed from the policy. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ── Read-only detail view ──

function DetailRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] items-center gap-3 px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0 font-medium">{children}</div>
    </div>
  )
}

function RoutingRuleView({ rule }: { rule: IRoutingRule }) {
  return (
    <div className="flex min-h-full flex-col px-6 pt-8 pb-6">
      <div className="flex flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            {rule.reference}
          </Badge>
          <span className="truncate text-xs text-muted-foreground">
            Updated {rule.updated}
          </span>
        </div>
        <SheetTitle className="text-2xl leading-tight font-semibold text-balance">
          {rule.rule}
        </SheetTitle>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <ProviderGlyph logo={rule.providerLogo} />
          <span className="truncate">
            {rule.provider} / {rule.category}
          </span>
        </div>
      </div>

      <div className="mt-6 divide-y rounded-lg border">
        <DetailRow label="Provider">
          <span className="flex min-w-0 items-center gap-2">
            <ProviderGlyph logo={rule.providerLogo} />
            <span className="truncate">{rule.provider}</span>
          </span>
        </DetailRow>
        <DetailRow label="Category">
          <span className="truncate">{rule.category}</span>
        </DetailRow>
        <DetailRow label="Kind">
          <KindBadge kind={rule.kind} />
        </DetailRow>
        <DetailRow label="Scope">
          <span className="truncate">{rule.scope}</span>
        </DetailRow>
        <DetailRow label="Status">
          <StatusBadge status={rule.status} />
        </DetailRow>
        <DetailRow label="Daily tokens">
          <span className="tabular-nums">{formatTokens(rule.dailyTokens)}</span>
        </DetailRow>
        <DetailRow label="Latency">
          <span className="truncate">{rule.latency}</span>
        </DetailRow>
        <DetailRow label="Reference">
          <span className="font-mono text-xs">{rule.reference}</span>
        </DetailRow>
        <DetailRow label="Updated">{rule.updated}</DetailRow>
      </div>
    </div>
  )
}

// ── Option lookups ──

/**
 * The option object behind a stored value. Falls back to one rebuilt from the
 * rule being edited, so a provider whose only other rule was deleted (and is
 * therefore no longer in the derived list) still renders and still saves.
 */
function findProviderOption(
  value: string,
  options: ProviderOption[],
  baseRule: IRoutingRule | null
): ProviderOption | null {
  const match = options.find((option) => option.value === value)
  if (match) return match
  if (baseRule && baseRule.provider === value) {
    return providerOptionForRule(baseRule, options)
  }
  return null
}

function findCategoryOption(
  value: string,
  options: InlineOption[],
  baseRule: IRoutingRule | null
): InlineOption | null {
  const match = options.find((option) => option.value === value)
  if (match) return match
  if (baseRule && baseRule.category === value) {
    return categoryOptionForRule(baseRule, options)
  }
  return null
}

// ── Routing rule sheet (create / view / edit) ──

const FORM_ID = "routing-rule-sheet-form"

/**
 * The create/edit body. The form holds the picked provider and category as
 * their plain values and resolves them back to option objects for the pills,
 * so nothing but this component has to know an option carries a logo node.
 *
 * It is mounted with a key, so opening the sheet on a different rule re-seeds
 * every field from that rule.
 */
function RoutingRuleForm({
  mode,
  rule,
  providerOptions,
  categoryOptions,
  onValid,
}: {
  mode: "create" | "edit"
  rule: IRoutingRule | null
  providerOptions: ProviderOption[]
  categoryOptions: InlineOption[]
  onValid: (values: RoutingRuleFormValues) => void
}) {
  const form = useForm<RoutingRuleFormValues>({
    resolver: zodResolver(routingRuleFormSchema),
    defaultValues: {
      ruleName: rule?.rule ?? "",
      // Both lists are derived from the rules in the grid, so a new rule starts
      // on the first of each and an empty grid starts on nothing at all.
      provider: rule?.provider ?? providerOptions[0]?.value ?? "",
      category: rule?.category ?? categoryOptions[0]?.value ?? "",
      kind: rule?.kind ?? KIND_OPTIONS[0].kind,
      scope: rule?.scope ?? SCOPE_OPTIONS[0].scope,
      status: rule?.status ?? STATUS_OPTIONS[0].status,
      dailyTokens: rule ? String(rule.dailyTokens) : "",
      latency: rule?.latency ?? "",
    },
    mode: "onTouched",
  })

  return (
    <form
      id={FORM_ID}
      className="flex min-h-full flex-col border-0 px-6 pt-8 pb-6"
      onSubmit={form.handleSubmit(onValid)}
      noValidate
    >
      <FieldGroup className="gap-4">
        <Controller
          control={form.control}
          name="ruleName"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="routing-rule-name">Rule name</FieldLabel>
              <Input
                {...field}
                id="routing-rule-name"
                placeholder="Rule name"
                autoFocus
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </FieldGroup>

      <div
        className="mt-5 flex flex-wrap items-center gap-2"
        aria-label="Routing rule metadata"
      >
        <Controller
          control={form.control}
          name="provider"
          render={({ field }) => {
            const option = findProviderOption(
              field.value,
              providerOptions,
              rule
            )
            return option ? (
              <InlineSingleCombobox
                ariaLabel="Select provider"
                value={option}
                items={providerOptions}
                searchPlaceholder="Change provider"
                emptyMessage="No providers found."
                onValueChange={(next) => field.onChange(next.value)}
                renderOption={(item) => (
                  <span className="flex min-w-0 items-center gap-2">
                    <ProviderGlyph logo={item.logo} />
                    <span className="truncate">{item.label}</span>
                  </span>
                )}
              />
            ) : (
              <></>
            )
          }}
        />
        <Controller
          control={form.control}
          name="category"
          render={({ field }) => {
            const option = findCategoryOption(
              field.value,
              categoryOptions,
              rule
            )
            return option ? (
              <InlineSingleCombobox
                ariaLabel="Select category"
                value={option}
                items={categoryOptions}
                searchPlaceholder="Change category"
                emptyMessage="No categories found."
                onValueChange={(next) => field.onChange(next.value)}
                renderOption={(item) => (
                  <span className="flex min-w-0 items-center gap-2">
                    <TagIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </span>
                )}
              />
            ) : (
              <></>
            )
          }}
        />
        <Controller
          control={form.control}
          name="kind"
          render={({ field }) => (
            <InlineSingleCombobox<KindOption>
              ariaLabel="Select kind"
              value={kindOptionFor(field.value)}
              items={KIND_OPTIONS}
              searchPlaceholder="Change kind"
              emptyMessage="No kinds found."
              onValueChange={(option) => field.onChange(option.kind)}
              renderOption={(option) => (
                <span className="flex min-w-0 items-center gap-2">
                  <RouteIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{option.label}</span>
                </span>
              )}
            />
          )}
        />
        <Controller
          control={form.control}
          name="scope"
          render={({ field }) => (
            <InlineSingleCombobox<ScopeOption>
              ariaLabel="Select scope"
              value={scopeOptionFor(field.value)}
              items={SCOPE_OPTIONS}
              searchPlaceholder="Change scope"
              emptyMessage="No scopes found."
              onValueChange={(option) => field.onChange(option.scope)}
              renderOption={(option) => (
                <span className="flex min-w-0 items-center gap-2">
                  <LayersIcon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{option.label}</span>
                </span>
              )}
            />
          )}
        />
        <Controller
          control={form.control}
          name="status"
          render={({ field }) => (
            <InlineSingleCombobox<StatusOption>
              ariaLabel="Select status"
              value={statusOptionFor(field.value)}
              items={STATUS_OPTIONS}
              searchPlaceholder="Change status"
              emptyMessage="No statuses found."
              onValueChange={(option) => field.onChange(option.status)}
              renderOption={(option) => (
                <span className="flex min-w-0 items-center gap-2">
                  <StatusBadge status={option.status} />
                </span>
              )}
            />
          )}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Controller
          control={form.control}
          name="dailyTokens"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="routing-rule-tokens">
                <span className="flex items-center gap-1.5">
                  <GaugeIcon
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Daily tokens
                </span>
              </FieldLabel>
              <Input
                {...field}
                id="routing-rule-tokens"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="0"
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="latency"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="routing-rule-latency">
                <span className="flex items-center gap-1.5">
                  <Building2Icon
                    className="size-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                  Latency
                </span>
              </FieldLabel>
              <Input
                {...field}
                id="routing-rule-latency"
                placeholder="1.8s p95"
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      {mode === "create" ? (
        <div className="mt-8 border-t pt-5">
          <div className="flex min-w-0 items-center gap-2">
            <FlagIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className="truncate text-sm font-medium">Quick tips</span>
          </div>
          <div className="mt-2 flex flex-col gap-1">
            {CREATE_TIPS.map((tip) => (
              <div
                key={tip.text}
                className="flex min-w-0 items-start gap-2 py-0.5 text-sm leading-snug text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-[13px] leading-none"
                >
                  {tip.icon}
                </span>
                <span>{tip.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  )
}

export type RoutingRuleSheetMode = "create" | "view" | "edit"

export interface RoutingRuleSheetState {
  mode: RoutingRuleSheetMode
  rule?: IRoutingRule | null
}

export function RoutingRuleSheet({
  state,
  rules,
  onOpenChange,
  onSubmit,
  onEdit,
  onCancelEdit,
  onDelete,
}: {
  state: RoutingRuleSheetState | null
  rules: IRoutingRule[]
  onOpenChange: (open: boolean) => void
  onSubmit: (rule: IRoutingRule) => void
  onEdit: () => void
  onCancelEdit: () => void
  onDelete: (rule: IRoutingRule) => void
}) {
  const open = state !== null
  const mode = state?.mode ?? null
  const baseRule =
    state && state.mode !== "create" ? (state.rule ?? null) : null

  // Unique providers (with their logo) and categories drawn from current rules.
  const providerOptions = React.useMemo<ProviderOption[]>(
    () => providerOptionsFrom(rules),
    [rules]
  )

  const categoryOptions = React.useMemo<InlineOption[]>(
    () => categoryOptionsFrom(rules),
    [rules]
  )

  const providerLogoMap = React.useMemo<Map<string, ReactNode>>(
    () => providerLogoMapFrom(rules),
    [rules]
  )

  function handleValid(values: RoutingRuleFormValues) {
    const rule: IRoutingRule = buildRoutingRule({
      baseRule,
      ruleName: values.ruleName,
      provider: findProviderOption(values.provider, providerOptions, baseRule),
      category: findCategoryOption(values.category, categoryOptions, baseRule),
      logoMap: providerLogoMap,
      fallbackLogo: DEFAULT_PROVIDER_LOGO,
      kind: values.kind,
      scope: values.scope,
      status: values.status,
      dailyTokens: values.dailyTokens,
      latency: values.latency,
    })

    onSubmit(rule)
    onOpenChange(false)
  }

  const viewRule = mode === "view" ? baseRule : null
  const sheetDescription =
    mode === "edit"
      ? "Update this routing rule's details."
      : "Add a rule name, provider, category, kind, scope, token budget, latency, and status."

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="inset-y-4! right-4! left-auto! flex h-[calc(100svh-2rem)]! w-[min(29rem,calc(100vw-2rem))]! max-w-none! flex-col overflow-hidden rounded-xl border outline-none"
      >
        <SheetHeader className="sr-only p-0">
          <SheetTitle>
            {mode === "view"
              ? "Routing rule details"
              : mode === "edit"
                ? "Edit routing rule"
                : "Create routing rule"}
          </SheetTitle>
          <SheetDescription>{sheetDescription}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            {viewRule ? (
              <RoutingRuleView rule={viewRule} />
            ) : (
              <RoutingRuleForm
                // Keyed so the form re-seeds from its defaultValues whenever
                // the sheet opens on a different rule or switches mode.
                key={`${mode}:${baseRule?.id ?? "new"}`}
                mode={mode === "edit" ? "edit" : "create"}
                rule={baseRule}
                providerOptions={providerOptions}
                categoryOptions={categoryOptions}
                onValid={handleValid}
              />
            )}
          </ScrollArea>
        </div>

        <SheetFooter className="shrink-0 gap-3 border-t bg-muted">
          {viewRule ? (
            <div className="flex w-full items-center justify-end gap-2">
              <DeleteConfirm
                ruleName={viewRule.rule}
                onConfirm={() => onDelete(viewRule)}
              >
                <Button type="button" variant="outline">
                  <Trash2Icon className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </DeleteConfirm>
              <Button type="button" onClick={onEdit}>
                <PencilIcon className="size-4" aria-hidden="true" />
                Edit
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-end gap-2">
              {mode === "edit" && baseRule ? (
                <DeleteConfirm
                  ruleName={baseRule.rule}
                  onConfirm={() => onDelete(baseRule)}
                >
                  <Button type="button" variant="outline" className="me-auto">
                    <Trash2Icon className="size-4" aria-hidden="true" />
                    Delete
                  </Button>
                </DeleteConfirm>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={
                  mode === "edit" ? onCancelEdit : () => onOpenChange(false)
                }
              >
                Cancel
              </Button>
              {/* Outside the form on purpose: the footer is a sibling of the
                  scroll area, so it submits by id. */}
              <Button type="submit" form={FORM_ID}>
                {mode === "edit" ? "Save changes" : "Create rule"}
              </Button>
            </div>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
