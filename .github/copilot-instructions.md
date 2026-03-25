# Sleeper League Explorer — Copilot Workspace Instructions

## Project Overview

This is a TypeScript monorepo for syncing Sleeper Fantasy Football API data into Supabase and rendering an interactive dashboard on GitHub Pages.

## Monorepo Structure

```
apps/dashboard/     → React 19 + Vite SPA (GitHub Pages)
apps/etl/           → TypeScript ETL scripts (GitHub Actions)
packages/shared/    → Shared Zod schemas, Supabase client, types
```

**Package manager**: pnpm (workspaces)

## Key Conventions

- **No `any`** — strict TypeScript everywhere
- **Zod for validation** — all external data validated with `safeParse`
- **shadcn/ui "New York"** — prefer shadcn components over custom UI
- **Tailwind CSS v4** — CSS-first config via `@theme`, NO `tailwind.config.js`
- **`@/` imports** in apps, `@sleeper-explorer/shared` for cross-package
- **Dark mode default** — light mode available via toggle
- **SHA-pinned actions** — all GitHub Actions pinned to full commit SHA

## Sleeper API Quick Reference

- Base: `https://api.sleeper.app/v1`
- No auth, 1000 req/min
- Leagues: ALF (`1191901661710966784`), CIC (`1191050762075590656`)
- 11 entity types: nfl_state, players, leagues, owners, rosters, matchups, transactions, drafts, draft_picks, traded_picks, playoff_brackets

## Common Commands

```bash
pnpm install              # Install all dependencies
pnpm -r build             # Build all packages
pnpm -r typecheck         # Type check all packages
pnpm -r lint              # Lint all packages
pnpm -r test              # Run all tests
pnpm --filter dashboard dev    # Start dashboard dev server
pnpm --filter etl sync        # Run ETL sync
```
