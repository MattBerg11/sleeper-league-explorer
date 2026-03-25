# Sleeper League Explorer

> Interactive fantasy football data explorer powered by the Sleeper API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?logo=pnpm&logoColor=white)](https://pnpm.io)

## Overview

Sleeper League Explorer syncs data from the [Sleeper Fantasy Football API](https://docs.sleeper.com/) into a Supabase Postgres database, then renders a rich interactive dashboard for exploring leagues, players, matchups, drafts, transactions, and playoffs.

## Architecture

```mermaid
graph LR
    A[Sleeper API] -->|GitHub Actions ETL| B[Supabase Postgres]
    B -->|PostgREST| C[React Dashboard]
    C -->|GitHub Pages| D[Browser]
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite 6, shadcn/ui, Tailwind CSS v4, TanStack Router/Query/Table, Recharts |
| **Backend** | Supabase (Postgres, RLS, PostgREST) |
| **ETL** | TypeScript, Zod, GitHub Actions (cron) |
| **Package Manager** | pnpm workspaces |

## Monorepo Structure

```
apps/
  dashboard/     → React SPA deployed to GitHub Pages
  etl/           → ETL sync scripts run via GitHub Actions
packages/
  shared/        → Shared types, Zod schemas, Supabase client
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Start dashboard dev server
pnpm --filter dashboard dev

# Run ETL sync locally
pnpm --filter etl sync
```

## Environment Variables

| Variable | Description | Used By |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | Dashboard |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (public reads) | Dashboard |
| `SUPABASE_URL` | Supabase project URL | ETL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (writes) | ETL |
| `LEAGUE_IDS` | Comma-separated Sleeper league IDs | ETL |

## License

Private repository — all rights reserved.
