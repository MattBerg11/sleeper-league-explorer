---
description: 'React + shadcn/ui + TanStack development guide for the Sleeper League Explorer dashboard'
applyTo: 'apps/dashboard/**/*.ts, apps/dashboard/**/*.tsx, apps/dashboard/**/*.css'
---

# React + shadcn/ui + TanStack Guide

## Tech Stack
- TypeScript (strict mode)
- React 19 + Vite 6
- shadcn/ui "New York" style
- Tailwind CSS v4 (CSS-first)
- TanStack Router (file-based routing)
- TanStack React Query (data fetching)
- TanStack Table (data tables)
- Recharts (charts)
- Zod (validation)

## Code Style

- NEVER use `any` — always use proper TypeScript types
- Function components only — no class components
- Validate external data with Zod `safeParse`
- Use `@/` import alias for all internal imports
- No comments unless explaining non-obvious business logic

## Component Patterns

```typescript
interface Props {
  title: string
  children: React.ReactNode
}

export function Card({ title, children }: Props) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </div>
  )
}
```

## Data Fetching

Use TanStack React Query for all data:
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['rosters', leagueId],
  queryFn: () => fetchRosters(leagueId),
  staleTime: 5 * 60 * 1000,
})

if (isLoading) return <Skeleton className="h-48" />
if (error) return <ErrorAlert error={error} />
```

## Routing

File-based routes in `src/routes/`:
```typescript
export const Route = createFileRoute('/matchups')({
  component: MatchupsPage,
})
```

## UI Components

Always prefer shadcn/ui:
```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
```

## Accessibility

- Semantic HTML first (`<button>`, `<nav>`, `<main>`, `<table>`)
- ARIA attributes only when no semantic equivalent exists
- All interactive elements keyboard accessible
- Color alone never conveys meaning — use icons/text alongside
