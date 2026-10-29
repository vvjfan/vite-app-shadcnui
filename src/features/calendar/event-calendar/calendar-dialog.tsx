import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { calendarFormSchema } from "../lib/calendar-form-schema"
import type { CalendarFormValues } from "../lib/calendar-form-schema"

import { CALENDAR_COLOR_OPTIONS } from "./data"
import type { CalendarCategory } from "./data"

const FORM_ID = "calendar-form"

export interface CalendarDialogState {
  mode: "create" | "edit"
  calendar?: CalendarCategory
}

/** Add/edit calendar dialog: a name field and a color-swatch picker. */
export function CalendarDialog({
  state,
  onOpenChange,
  onSubmit,
}: {
  state: CalendarDialogState | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; color: string }) => void
}) {
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {state && (
          // Keyed so the form re-seeds from its defaultValues on each open.
          <CalendarForm
            key={state.calendar?.id ?? "new"}
            state={state}
            onSubmit={onSubmit}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CalendarForm({
  state,
  onSubmit,
}: {
  state: CalendarDialogState
  onSubmit: (values: { name: string; color: string }) => void
}) {
  const isEdit = state.mode === "edit"
  const form = useForm<CalendarFormValues>({
    resolver: zodResolver(calendarFormSchema),
    defaultValues: {
      name: state.calendar?.name ?? "",
      color: state.calendar?.color ?? CALENDAR_COLOR_OPTIONS[0].value,
    },
    mode: "onTouched",
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit calendar" : "New calendar"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Rename this calendar or change its color."
            : "Name your calendar and choose a color."}
        </DialogDescription>
      </DialogHeader>

      <form
        id={FORM_ID}
        className="flex flex-col gap-4"
        // The resolver hands back the trimmed name, so the submitted payload is
        // the same shape the menu always received.
        onSubmit={form.handleSubmit((values) =>
          onSubmit({ name: values.name, color: values.color })
        )}
        noValidate
      >
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field
              className="gap-1.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel htmlFor="calendar-name">Name</FieldLabel>
              <Input
                {...field}
                id="calendar-name"
                placeholder="e.g. Side projects"
                autoComplete="off"
                autoFocus
                aria-invalid={fieldState.invalid || undefined}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="color"
          render={({ field, fieldState }) => (
            <Field
              className="gap-2.5"
              data-invalid={fieldState.invalid || undefined}
            >
              <FieldLabel>Color</FieldLabel>
              <div
                role="group"
                aria-label="Calendar color"
                className="flex flex-wrap gap-2"
              >
                {CALENDAR_COLOR_OPTIONS.map((option) => {
                  const selected = field.value === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      aria-label={option.name}
                      onClick={() => field.onChange(option.value)}
                      onBlur={field.onBlur}
                      className={cn(
                        "size-6 rounded-full ring-offset-background transition outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        selected && "ring-2 ring-ring ring-offset-2"
                      )}
                      style={{ backgroundColor: option.value }}
                    />
                  )
                })}
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </form>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" form={FORM_ID}>
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </>
  )
}
