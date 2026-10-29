/**
 * Simulated, frontend-only auth session. Persisted in localStorage so a reload keeps the
 * user signed in; SSR-safe (no window -> treated as signed out). This is the swap seam:
 * replace the internals with a real auth API (the signatures can stay) without touching
 * the routes, the guard, or the sign-in UI.
 */

const STORAGE_KEY = "reui-template.session"

export interface Session {
  email: string
  name: string
  provider: string
}

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

export function getSession(): Session | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return getSession() !== null
}

// Derive a display name from the email local-part (e.g. "maya.perez" -> "Maya Perez").
function nameFromEmail(email: string): string {
  const handle = email.split("@")[0] || "there"
  const name = handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
  return name || "there"
}

export function signIn(input: { email?: string; provider?: string }): Session {
  const provider = input.provider ?? "email"
  const email = input.email ?? `you@${provider}.example`
  const session: Session = { email, name: nameFromEmail(email), provider }
  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  }
  return session
}

export function signOut(): void {
  if (isBrowser()) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
