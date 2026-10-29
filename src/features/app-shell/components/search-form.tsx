import { useEffect, useId, useMemo, useRef, useState } from "react"
import type { ComponentProps } from "react"
import { useNavigate } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar"
import { groupItems, searchItems } from "./search-data"
import type { SearchItem } from "./search-data"
import {
  ArrowElbowDownLeftIcon as CornerDownLeftIcon,
  MagnifyingGlassIcon as SearchIcon,
} from "@phosphor-icons/react"

export function SearchForm({ ...props }: ComponentProps<"form">) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const searchInputId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Group first, then flatten: the keyboard walks the list in the same order
  // it is painted, so the highlight never appears to jump around.
  const groups = useMemo(() => groupItems(searchItems(query)), [query])
  const results = useMemo(() => groups.flatMap((g) => g.items), [groups])

  // A new query re-ranks everything, so start from the top again.
  const [previousQuery, setPreviousQuery] = useState(query)
  if (previousQuery !== query) {
    setPreviousQuery(query)
    setActiveIndex(0)
  }

  // Reset on open rather than on close: the palette should always start blank,
  // whichever way the last one was dismissed.
  const [previousOpen, setPreviousOpen] = useState(open)
  if (previousOpen !== open) {
    setPreviousOpen(open)
    if (open) {
      setQuery("")
      setActiveIndex(0)
    }
  }

  // Keep the highlighted row in view while arrowing past the fold.
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  function openItem(item: SearchItem) {
    setOpen(false)
    void navigate({ to: item.to })
  }

  function onInputKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveIndex((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0
      )
    } else if (event.key === "Enter") {
      event.preventDefault()
      const item = results[activeIndex]
      if (item) openItem(item)
    }
  }

  return (
    <form {...props}>
      {/* Sidebar */}
      <SidebarGroup className="py-0">
        <SidebarGroupContent className="relative">
          {/* Collapsing animates width AND padding on the sidebar's own
              200ms/linear curve, so nothing snaps mid-flight. overflow-hidden
              clips the label instead of letting it spill past the icon rail. */}
          <Button
            id="search"
            type="button"
            variant="outline"
            aria-label="Search"
            className="h-8 w-full justify-start overflow-hidden border-none bg-zinc-800 pl-7 font-normal transition-[width,padding] duration-200 ease-linear hover:bg-zinc-700 hover:text-white focus-visible:bg-zinc-700 focus-visible:text-white in-data-[state=collapsed]:w-8! in-data-[state=collapsed]:pl-4!"
            onClick={() => setOpen(true)}
          >
            {/* Kept in the DOM for the accessible name; faded and clipped when
                collapsed. nowrap stops it reflowing as the rail narrows. */}
            <span className="whitespace-nowrap opacity-100 transition-opacity duration-200 ease-linear in-data-[state=collapsed]:opacity-0">
              Search...
            </span>
          </Button>
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 opacity-50 transition-[left] duration-200 ease-linear select-none in-data-[state=collapsed]:left-[9px]"
          />
          <Kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 bg-zinc-700 text-zinc-200 opacity-100 transition-opacity duration-200 ease-linear in-data-[state=collapsed]:opacity-0">
            ⌘K
          </Kbd>
        </SidebarGroupContent>
      </SidebarGroup>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-0 p-0 **:data-[slot=dialog-close]:top-4 **:data-[slot=dialog-close]:right-3 **:data-[slot=dialog-close]:opacity-60">
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search pages, saved views and tasks.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 border-b px-4 py-2">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none size-4 shrink-0 opacity-60 select-none"
            />
            <Input
              id={searchInputId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              className="h-10 border-none p-0 shadow-none outline-none focus-visible:ring-0 dark:bg-transparent"
              autoFocus
              placeholder="Search pages, views and tasks..."
              aria-label="Search"
              // The listbox lives below, so announce the pairing.
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results"
              aria-activedescendant={results[activeIndex]?.id}
              autoComplete="off"
            />
          </div>

          <div
            ref={listRef}
            id="search-results"
            role="listbox"
            aria-label="Search results"
            className="max-h-80 overflow-y-auto p-1.5"
          >
            {results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No matches for &ldquo;{query.trim()}&rdquo;.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.group} className="mb-1 last:mb-0">
                  <div className="px-2 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {group.group}
                  </div>
                  {group.items.map((item) => {
                    const index = results.indexOf(item)
                    const active = index === activeIndex
                    return (
                      <button
                        key={item.id}
                        id={item.id}
                        type="button"
                        role="option"
                        aria-selected={active}
                        data-active={active}
                        // Pointer and keyboard share one highlight, so moving
                        // the mouse does not fight the arrow keys.
                        onMouseMove={() => setActiveIndex(index)}
                        onClick={() => openItem(item)}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          active
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground"
                        )}
                      >
                        {item.icon ? (
                          <span className="shrink-0 opacity-60 [&_svg]:size-4">
                            {item.icon}
                          </span>
                        ) : (
                          <span
                            className="size-4 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          {item.label}
                        </span>
                        {item.hint && (
                          <span className="shrink-0 truncate text-xs text-muted-foreground">
                            {item.hint}
                          </span>
                        )}
                        {active && (
                          <CornerDownLeftIcon
                            className="size-3.5 shrink-0 opacity-60"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </form>
  )
}
