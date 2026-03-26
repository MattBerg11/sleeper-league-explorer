import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { z } from 'zod'
import { Layout } from '@/components/layout'
import { ErrorAlert } from '@/components/error-alert'
import { LeagueProvider } from '@/hooks/use-league-context'
import { LeagueOverviewPage } from '@/pages/league-overview'
import { PlayerExplorerPage } from '@/pages/player-explorer'
import { MatchupHistoryPage } from '@/pages/matchup-history'
import { DraftRecapPage } from '@/pages/draft-recap'
import { TransactionFeedPage } from '@/pages/transaction-feed'
import { PlayoffPicturePage } from '@/pages/playoff-picture'
import { HeadToHeadPage } from '@/pages/head-to-head'
import { PowerRankingsPage } from '@/pages/power-rankings'
import { NotFoundPage } from '@/pages/not-found'

const searchSchema = z.object({
  league: z.string().optional().catch(undefined),
  season: z.string().optional().catch(undefined),
})

function RouteErrorFallback({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <ErrorAlert
        error={error}
        reset={reset}
        title="Page Error"
      />
    </div>
  )
}

const rootRoute = createRootRoute({
  component: () => (
    <LeagueProvider>
      <Layout>
        <Outlet />
      </Layout>
    </LeagueProvider>
  ),
  notFoundComponent: NotFoundPage,
  validateSearch: searchSchema,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LeagueOverviewPage,
})

const playersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/players',
  component: PlayerExplorerPage,
})

const matchupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/matchups',
  component: MatchupHistoryPage,
})

const draftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/draft',
  component: DraftRecapPage,
})

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/transactions',
  component: TransactionFeedPage,
})

const playoffsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/playoffs',
  component: PlayoffPicturePage,
})

const h2hRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/h2h',
  component: HeadToHeadPage,
})

const rankingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/rankings',
  component: PowerRankingsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  playersRoute,
  matchupsRoute,
  draftRoute,
  transactionsRoute,
  playoffsRoute,
  h2hRoute,
  rankingsRoute,
])

export const router = createRouter({
  routeTree,
  basepath: '/sleeper-league-explorer',
  defaultErrorComponent: RouteErrorFallback,
  defaultNotFoundComponent: NotFoundPage,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}