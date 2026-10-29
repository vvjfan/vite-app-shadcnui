import { createFileRoute, redirect } from "@tanstack/react-router"

import { isAuthenticated } from "@/lib/auth/session"
import { Auth } from "@/features/auth/components/auth"

// Sanitize the post-sign-in target to a same-origin path (prevents open-redirect).
// Defaults to the Home page.
function sanitizeRedirect(value: unknown): string {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/home"
}

// @reui/auth-3 (magic-link + social sign-in), wired to the simulated auth session.
// An already-signed-in visitor is redirected to their target.
export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: sanitizeRedirect(search.redirect),
  }),
  beforeLoad: ({ search }) => {
    if (isAuthenticated()) {
      throw redirect({ to: search.redirect })
    }
  },
  component: SignInPage,
})

function SignInPage() {
  const search = Route.useSearch()

  return (
    <div className="min-h-svh w-full bg-background">
      <Auth redirect={search.redirect} />
    </div>
  )
}
