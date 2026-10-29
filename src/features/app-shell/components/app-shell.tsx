import type { ReactNode } from "react"

import { AppHeader } from "./app-header"
import { SidebarShell } from "./sidebar-shell"

// Signed-in app shell: dark nav rail + breadcrumb header + slide-in calendar panel.
// The routed page renders in the content region (where the block's demo cards were).
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarShell>
      {/* Header */}
      <AppHeader />
      {/* No top padding: the sticky header already sits above the content, so a
          pt here would read as a double gap under it.

          isolate makes the page its own stacking context. Panels raise their
          own layers freely (the gantt pins its column header at z-30), and
          without this those beat the header's z-20 and paint over it as the
          page scrolls. Scoping them keeps the whole page under the header, and
          the cursor-following drag clones are unaffected: they mount on
          document.body, outside this container. */}
      <div className="isolate flex flex-1 flex-col gap-4.5 px-4.5 pb-4.5">
        {children}
      </div>
    </SidebarShell>
  )
}
