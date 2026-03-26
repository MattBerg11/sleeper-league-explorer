import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { Layout } from '@/components/layout'
import { ErrorAlert } from '@/components/error-alert'
import { LeagueOverviewPage } from '@/pages/league-overview'
import { PlayerExplorerPage } from '@/pages/player-explorer'
import { MatchupHistoryPage } from '@/pages/matchup-history'
import { DraftRecapPage } from '@/pages/draft-recap'
import { TransactionFeedPage } from '@/pages/transaction-feed'
import { PlayoffPicturePage } from '@/pages/playoff-picture'
import { NotFoundPage } from '@/pages/not-found'

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
    <Layout>
      <Outlet />
    </Layout>
  ),
  notFoundComponent: NotFoundPage,
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  playersRoute,
  matchupsRoute,
  draftRoute,
  transactionsRoute,
  playoffsRoute,
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