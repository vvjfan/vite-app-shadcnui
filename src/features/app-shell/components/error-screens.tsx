import type { ReactNode } from "react"
import { Link, useRouter, useRouterState } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowClockwiseIcon as RefreshCwIcon,
  MagnifyingGlassMinusIcon as SearchXIcon,
  WarningIcon as TriangleAlertIcon,
} from "@phosphor-icons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// The two states that replace a whole page rather than render inside one: a route
// that does not exist, and a route that threw. Both are mounted from routes/__root.tsx.
//
// Height comes in through `className` because each screen has two homes. At the root
// it is the only thing on the page and has to fill the viewport itself; as the
// router's defaultNotFoundComponent (router.tsx) it renders in the app shell's
// content region, which already sets the page height and would otherwise overflow.

/** Faint dot field, echoing the sign-in sidebar, faded out towards the edges. */
function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(currentColor_1px,transparent_1px)] [mask-image:radial-gradient(72%_60%_at_50%_45%,black,transparent)] [background-size:16px_16px] text-muted-foreground/20"
    />
  )
}

function Screen({
  className,
  icon,
  eyebrow,
  title,
  description,
  children,
}: {
  className?: string
  icon: ReactNode
  eyebrow: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "relative flex w-full flex-col items-center justify-center px-6 py-16",
        className
      )}
    >
      <Backdrop />

      <div className="relative flex w-full max-w-md flex-col items-center text-center">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-xs [&_svg]:size-5">
          {icon}
        </div>

        <span className="mt-6 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {eyebrow}
        </span>
        <h1 className="mt-2 text-3xl leading-tight font-semibold text-balance">
          {title}
        </h1>
        <p className="mt-3 text-base text-pretty text-muted-foreground">
          {description}
        </p>

        {children}
      </div>
    </div>
  )
}

export function NotFound({ className }: { className?: string }) {
  const router = useRouter()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  // A 404 opened directly (pasted link, bookmark) has nothing behind it, so
  // history.back() would either do nothing or leave the app entirely.
  function goBack() {
    if (router.history.canGoBack()) router.history.back()
    else void router.navigate({ to: "/home" })
  }

  return (
    <Screen
      className={className}
      icon={<SearchXIcon aria-hidden="true" />}
      eyebrow="Error 404"
      title="Page not found"
      description="That page does not exist, or it has moved. Head back to the dashboard to pick up where you left off."
    >
      <p className="mt-5 max-w-full truncate rounded-md border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs text-muted-foreground">
        {pathname}
      </p>

      <div className="mt-8 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        <Button size="lg" render={<Link to="/home" />} nativeButton={false}>
          Back to dashboard
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
        <Button size="lg" variant="outline" type="button" onClick={goBack}>
          <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
          Go back
        </Button>
      </div>
    </Screen>
  )
}

export function RouteError({
  error,
  className,
}: {
  error: unknown
  className?: string
}) {
  const router = useRouter()

  return (
    <Screen
      className={className}
      icon={
        <TriangleAlertIcon aria-hidden="true" className="text-destructive" />
      }
      eyebrow="Error"
      title="Something went wrong"
      description="This page could not be loaded. Trying again re-runs the requests behind it."
    >
      {error instanceof Error && error.message ? (
        <p className="mt-5 max-w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-left font-mono text-xs break-words text-muted-foreground">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
      ) : null}

      <div className="mt-8 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row">
        {/* reset() only clears the boundary; invalidate() re-runs the loaders AND
            resets it, which is the retry a failed route actually needs. */}
        <Button
          size="lg"
          type="button"
          onClick={() => void router.invalidate()}
        >
          <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
          Try again
        </Button>
        <Button
          size="lg"
          variant="outline"
          render={<Link to="/home" />}
          nativeButton={false}
        >
          Back to dashboard
        </Button>
      </div>
    </Screen>
  )
}
