import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { Layout } from '@/components/layout'
import { LeagueOverviewPage } from '@/pages/league-overview'
import { PlayerExplorerPage } from '@/pages/player-explorer'
import { MatchupHistoryPage } from '@/pages/matchup-history'
import { DraftRecapPage } from '@/pages/draft-recap'
import { TransactionFeedPage } from '@/pages/transaction-feed'
import { PlayoffPicturePage } from '@/pages/playoff-picture'

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
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
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}