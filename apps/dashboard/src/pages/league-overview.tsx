import { useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { Link } from '@tanstack/react-router'
import { ArrowUpDown, TrendingUp, Users, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useStandings, useRosters, useOwners, useLeagues } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { ErrorAlert } from '@/components/error-alert'
import { OwnerAvatar } from '@/components/owner-avatar'
import { cn } from '@/lib/utils'
import type { StandingsRow } from '@sleeper-explorer/shared'

const columnHelper = createColumnHelper<StandingsRow>()

const TABS = [
  { id: 'standings', label: 'Standings' },
  { id: 'leaders', label: 'Scoring Leaders' },
  { id: 'rosters', label: 'Roster Breakdown' },
  { id: 'settings', label: 'League Settings' },
] as const

type TabId = (typeof TABS)[number]['id']

export function LeagueOverviewPage() {
  const { leagueId } = useLeagueContext()
  const { data: standings = [], isLoading, error } = useStandings(leagueId)
  const { data: rosters = [] } = useRosters(leagueId)
  const { data: owners = [] } = useOwners(leagueId)
  const { data: leagues = [] } = useLeagues()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'total_points_for', desc: true }])
  const [activeTab, setActiveTab] = useState<TabId>('standings')

  const rankMap = useMemo(() => {
    const sorted = [...standings].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      if (b.ties !== a.ties) return b.ties - a.ties
      return b.total_points_for - a.total_points_for
    })
    const map = new Map<number, number>()
    sorted.forEach((row, i) => map.set(row.roster_id, i + 1))
    return map
  }, [standings])

  const sortedByPoints = useMemo(
    () => [...standings].sort((a, b) => b.total_points_for - a.total_points_for).slice(0, 10),
    [standings],
  )

  const ownerMap = useMemo(() => {
    const map = new Map<string, (typeof owners)[number]>()
    for (const o of owners) map.set(o.user_id, o)
    return map
  }, [owners])

  const rostersWithOwner = useMemo(
    () =>
      rosters.map((r) => {
        const owner = r.owner_id ? ownerMap.get(r.owner_id) : undefined
        const starterCount = r.starters?.length ?? 0
        const totalCount = r.players?.length ?? 0
        const irCount = r.reserve?.length ?? 0
        const taxiCount = r.taxi?.length ?? 0
        const benchCount = Math.max(0, totalCount - starterCount - irCount - taxiCount)
        return {
          ...r,
          ownerName: owner?.team_name ?? owner?.display_name ?? `Team ${r.roster_id}`,
          starterCount,
          benchCount,
          irCount,
          taxiCount,
          totalCount,
        }
      }),
    [rosters, ownerMap],
  )

  const league = useMemo(
    () => leagues.find((l) => l.league_id === leagueId),
    [leagues, leagueId],
  )

  const positionCounts = useMemo(() => {
    if (!league) return []
    const counts = new Map<string, number>()
    for (const pos of league.roster_positions) {
      counts.set(pos, (counts.get(pos) ?? 0) + 1)
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [league])

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'rank',
      header: 'Rank',
      cell: (info) => (
        <span className="font-mono text-gray-400">{rankMap.get(info.row.original.roster_id) ?? '-'}</span>
      ),
    }),
    columnHelper.accessor('display_name', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting()}
        >
          Team <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => (
        <div className="flex items-center gap-2">
          <OwnerAvatar
            avatarId={info.row.original.owner_avatar}
            name={info.row.original.team_name ?? info.row.original.display_name ?? 'Unknown'}
            size="sm"
          />
          <Link
            to="/matchups"
            search={(prev) => prev}
            className="font-medium text-gray-100 hover:text-accent hover:underline"
          >
            {info.row.original.team_name ?? info.row.original.display_name ?? `Team ${info.row.original.roster_id}`}
          </Link>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'record',
      header: 'W-L-T',
      cell: (info) => {
        const { wins, losses, ties } = info.row.original
        return (
          <div className="flex items-center gap-1">
            <Badge variant="win">{wins}W</Badge>
            <Badge variant="loss">{losses}L</Badge>
            {ties > 0 && <Badge variant="secondary">{ties}T</Badge>}
          </div>
        )
      },
    }),
    columnHelper.display({
      id: 'win_pct',
      header: 'Win %',
      cell: (info) => {
        const { wins, losses, ties } = info.row.original
        const total = wins + losses + ties
        const pct = total > 0 ? (wins + ties * 0.5) / total : 0
        return <span className="font-mono">{(pct * 100).toFixed(1)}%</span>
      },
    }),
    columnHelper.accessor('total_points_for', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting()}
        >
          PF <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => (
        <span className="font-mono text-highlight">{info.getValue().toFixed(2)}</span>
      ),
    }),
    columnHelper.accessor('total_points_against', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting()}
        >
          PA <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => (
        <span className="font-mono text-gray-400">{info.getValue().toFixed(2)}</span>
      ),
    }),
  ], [rankMap])

  const table = useReactTable({
    data: standings,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading league overview" className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return <ErrorAlert error={error} title="Error loading standings" />
  }

  const totalTeams = standings.length
  const totalGames = standings.reduce((sum, s) => sum + s.wins + s.losses + s.ties, 0)
  const highestScorer = standings.reduce<StandingsRow | null>(
    (best, s) => (!best || s.total_points_for > best.total_points_for ? s : best),
    null,
  )

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">League Overview</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-100">{totalTeams}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Games Played</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-100">{totalGames}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Top Scorer</CardTitle>
            <Trophy className="h-4 w-4 text-highlight" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-highlight">{highestScorer?.team_name ?? highestScorer?.display_name ?? 'N/A'}</p>
            <p className="text-sm text-gray-400">{highestScorer?.total_points_for.toFixed(2) ?? '0'} pts</p>
          </CardContent>
        </Card>
      </div>

      <div role="tablist" aria-label="League overview sections" className="flex gap-1 rounded-lg bg-bg-secondary p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-accent/20 text-accent'
                : 'text-gray-400 hover:text-gray-100',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'standings' && (
        <Card>
          <CardHeader>
            <CardTitle>Standings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        aria-sort={
                          header.column.getIsSorted() === 'asc' ? 'ascending'
                          : header.column.getIsSorted() === 'desc' ? 'descending'
                          : undefined
                        }
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center text-gray-400">
                      No standings data available
                    </TableCell>
                  </TableRow>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'leaders' && (
        <Card>
          <CardHeader>
            <CardTitle>Scoring Leaders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedByPoints.map((team, idx) => (
                <div key={team.roster_id} className="flex items-center gap-3 rounded-lg border border-gray-700/50 p-3">
                  <span className="w-8 text-center font-mono text-lg font-bold text-gray-400">{idx + 1}</span>
                  <OwnerAvatar avatarId={team.owner_avatar} name={team.team_name ?? team.display_name ?? 'Unknown'} size="md" />
                  <div className="flex-1">
                    <div className="font-medium text-gray-100">{team.team_name ?? team.display_name}</div>
                    <div className="text-xs text-gray-400">{team.wins}W-{team.losses}L</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-highlight">{team.total_points_for.toFixed(1)}</div>
                    <div className="text-xs text-gray-400">Avg {(team.total_points_for / Math.max(1, team.wins + team.losses + team.ties)).toFixed(1)}/wk</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'rosters' && (
        <Card>
          <CardHeader>
            <CardTitle>Roster Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Starters</TableHead>
                  <TableHead>Bench</TableHead>
                  <TableHead>IR</TableHead>
                  <TableHead>Taxi</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rostersWithOwner.map((r) => (
                  <TableRow key={r.roster_id}>
                    <TableCell className="font-medium text-gray-100">{r.ownerName}</TableCell>
                    <TableCell>{r.starterCount}</TableCell>
                    <TableCell>{r.benchCount}</TableCell>
                    <TableCell>{r.irCount}</TableCell>
                    <TableCell>{r.taxiCount}</TableCell>
                    <TableCell>{r.totalCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        league ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>General</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <InfoRow label="League" value={league.name} />
                <InfoRow label="Season" value={league.season} />
                <InfoRow label="Status" value={league.status} />
                <InfoRow label="Teams" value={String(league.total_rosters)} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Roster Slots</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {positionCounts.map(([pos, count]) => (
                  <InfoRow key={pos} label={pos} value={String(count)} />
                ))}
              </CardContent>
            </Card>
            <Card className="sm:col-span-2">
              <CardHeader>
                <CardTitle>Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-3">
                  {Object.entries(league.scoring_settings).slice(0, 15).map(([key, val]) => (
                    <InfoRow key={key} label={key.replace(/_/g, ' ')} value={String(val)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-gray-400">
              League settings not available
            </CardContent>
          </Card>
        )
      )}
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-100">{value}</span>
    </div>
  )
}