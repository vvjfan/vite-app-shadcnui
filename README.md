# Tempo on Vite

The Tempo task dashboard, ported from `reui-templates/tempo-tasks` to the existing Vite + React application. Routing uses client-side TanStack Router. There is no TanStack Start dependency, SSR server, or server entry point.

## Run and validate

```sh
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm preview
```

## Features

- Home dashboard with charts and task queue CRUD, URL search, filters, sorting, and pagination.
- My tasks Gantt timeline, Team tasks data grid, Kanban board, and event calendar.
- Activity, Analytics, and AI Ops reports with their editing dialogs.
- Workspace settings, organizations, notifications, search, context calendar, and simulated sign-in/sign-out.
- Keyboard navigation, skip link, responsive sidebars, and light/dark/system themes. Press `d` outside an editable field to switch themes.

The application preserves the target's `base-mira` shadcn style, Phosphor icon library, CSS-first Tailwind configuration, theme tokens, local Inter font, and Chinese fallback stack. Missing primitives come from the official Mira registry; ReUI feature components come from Tempo. The only global CSS fix is a missing semicolon in the existing font declaration.

Recharts 3.8.0 supplies the original charts. TanStack Table 8.21.3 matches Tempo's data-grid API. These are the two dependency changes required by the port.

Demo services, authentication, and feature persistence behave as in the source: authentication and some preferences use localStorage; task edits are in-memory demo state, not a shared backend. Public avatars use external URLs. Deploy the built `dist/` directory on a host configured to serve `index.html` for client-side routes.

The copied source's license is in `TEMPO-LICENSE.md`.
