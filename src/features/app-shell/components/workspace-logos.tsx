import type { ReactNode } from "react"

/**
 * Logos offered when creating or editing an organization.
 *
 * Two kinds. Claude, Vercel and OpenAI reuse the very images the seeded
 * organizations already carry, so picking one gives the identical full-bleed
 * avatar rather than a lookalike drawing.
 *
 * The rest are drawn inline, because nothing ships them: lucide dropped its
 * brand set, the registry has blocks and UI icons but no brand marks, and the
 * remaining GitHub handles are unrelated personal accounts. Those are
 * simplified marks, not official assets; monochrome ones use currentColor so
 * they invert with the theme, and the rest keep the brand colour.
 */

export type WorkspaceLogo = {
  id: string
  label: string
  /** A full-bleed avatar image, exactly as the seeded organizations use. */
  imageUrl?: string
  /** An inline mark, inset inside the avatar. */
  icon?: ReactNode
}

const svg = "size-full"

/** Cursor: an isometric cube. */
function CursorMark() {
  return (
    <svg viewBox="0 0 24 24" className={svg} aria-hidden="true">
      <g fill="currentColor">
        <path d="M12 2.2 21 7.3l-9 5.2-9-5.2z" opacity="0.55" />
        <path d="M3 7.9v8.4l8.4 5v-8.6z" opacity="0.85" />
        <path d="M21 7.9v8.4l-8.4 5v-8.6z" />
      </g>
    </svg>
  )
}

/** Lovable: a heart, orange into violet. */
function LovableMark() {
  return (
    <svg viewBox="0 0 24 24" className={svg} aria-hidden="true">
      <defs>
        <linearGradient id="wl-lovable" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF8A3D" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path
        d="M12 20.4S3.4 15.3 3.4 9.6a4.6 4.6 0 0 1 8.6-2.3 4.6 4.6 0 0 1 8.6 2.3c0 5.7-8.6 10.8-8.6 10.8Z"
        fill="url(#wl-lovable)"
      />
    </svg>
  )
}

/** Replit: three offset blocks. */
function ReplitMark() {
  return (
    <svg viewBox="0 0 24 24" className={svg} aria-hidden="true">
      <g fill="#F26207">
        <rect x="4" y="3.6" width="7.6" height="6.4" rx="1.4" />
        <rect x="12.4" y="8.8" width="7.6" height="6.4" rx="1.4" />
        <rect x="4" y="14" width="7.6" height="6.4" rx="1.4" />
      </g>
    </svg>
  )
}

/** VS Code: the folded ribbon. */
function VSCodeMark() {
  return (
    <svg viewBox="0 0 24 24" className={svg} aria-hidden="true">
      <path
        d="M23.15 2.587 18.21.21a1.494 1.494 0 0 0-1.705.29l-9.46 8.63-4.12-3.128a.999.999 0 0 0-1.276.057L.327 7.261A1 1 0 0 0 .326 8.74L3.899 12 .326 15.26a1 1 0 0 0 .001 1.479L1.65 17.94a.999.999 0 0 0 1.276.057l4.12-3.128 9.46 8.63a1.492 1.492 0 0 0 1.704.29l4.942-2.377A1.5 1.5 0 0 0 24 20.06V3.939a1.5 1.5 0 0 0-.85-1.352Zm-5.146 14.861L10.826 12l7.178-5.448v10.896Z"
        fill="#3B82F6"
      />
    </svg>
  )
}

// The three seeded organizations lead, and they carry their real avatars.
export const WORKSPACE_LOGOS: WorkspaceLogo[] = [
  { id: "claude", label: "Claude", imageUrl: "https://github.com/claude.png" },
  { id: "vercel", label: "Vercel", imageUrl: "https://github.com/vercel.png" },
  { id: "openai", label: "OpenAI", imageUrl: "https://github.com/openai.png" },
  { id: "cursor", label: "Cursor", icon: <CursorMark /> },
  { id: "lovable", label: "Lovable", icon: <LovableMark /> },
  { id: "replit", label: "Replit", icon: <ReplitMark /> },
  { id: "vscode", label: "VS Code", icon: <VSCodeMark /> },
]

export function findWorkspaceLogo(id?: string): WorkspaceLogo | undefined {
  return id ? WORKSPACE_LOGOS.find((logo) => logo.id === id) : undefined
}

/**
 * The avatar fields a chosen logo implies. An image logo sets imageUrl, which
 * AvatarImage paints full-bleed; a drawn one sets logoId and must clear any
 * imageUrl, or the old image keeps painting over the mark.
 */
export function logoAvatarFields(logoId: string): {
  imageUrl?: string
  logoId?: string
} {
  const logo = findWorkspaceLogo(logoId)
  if (!logo) return {}
  return logo.imageUrl
    ? { imageUrl: logo.imageUrl, logoId: undefined }
    : { imageUrl: undefined, logoId: logo.id }
}
