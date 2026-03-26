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
import { useStandings, useRosters, useOwners, useLeagues, usePlayoffBracket } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDisplayName } from '@/hooks/use-display-name'
import { ErrorAlert } from '@/components/error-alert'
import { OwnerAvatar } from '@/components/owner-avatar'
import { cn } from '@/lib/utils'
import type { StandingsRow } from '@sleeper-explorer/shared'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

const columnHelper = createColumnHelper<StandingsRow>()

const RADAR_COLORS = ['#60a5fa', '#f87171', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'] as const

const RADAR_METRICS = [
  { key: 'winPct', label: 'Win %' },
  { key: 'ppg', label: 'PPG' },
  { key: 'pag', label: 'PA/G' },
  { key: 'rosterSize', label: 'Roster Size' },
  { key: 'benchDepth', label: 'Bench Depth' },
  { key: 'starterCount', label: 'Starters' },
] as const

interface TeamRadarData {
  rosterId: number
  name: string
  winPct: number
  ppg: number
  pag: number
  rosterSize: number
  benchDepth: number
  starterCount: number
}

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
  const { data: playoffBracket = [] } = usePlayoffBracket(leagueId)
  const { getName } = useDisplayName()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'total_points_for', desc: true }])
  const [activeTab, setActiveTab] = useState<TabId>('standings')
  const [customSelectedTeamIds, setCustomSelectedTeamIds] = useState<Set<number> | null>(null)

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
          ownerName: owner ? getName(owner) : `Team ${r.roster_id}`,
          starterCount,
          benchCount,
          irCount,
          taxiCount,
          totalCount,
        }
      }),
    [rosters, ownerMap, getName],
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

  const placementMap = useMemo(() => {
    const map = new Map<number, number>()
    for (const matchup of playoffBracket) {
      if (matchup.placement != null) {
        if (matchup.winner_roster_id != null) {
          map.set(matchup.winner_roster_id, matchup.placement)
        }
        if (matchup.loser_roster_id != null) {
          map.set(matchup.loser_roster_id, matchup.placement + 1)
        }
      }
    }
    return map
  }, [playoffBracket])

  const radarTeamData = useMemo<TeamRadarData[]>(() => {
    if (standings.length === 0) return []
    return standings.map((s) => {
      const gamesPlayed = Math.max(1, s.wins + s.losses + s.ties)
      const roster = rostersWithOwner.find((r) => r.roster_id === s.roster_id)
      return {
        rosterId: s.roster_id,
        name: getName({ display_name: s.display_name ?? `Team ${s.roster_id}`, team_name: s.team_name }),
        winPct: ((s.wins + s.ties * 0.5) / gamesPlayed) * 100,
        ppg: s.total_points_for / gamesPlayed,
        pag: s.total_points_against / gamesPlayed,
        rosterSize: roster?.totalCount ?? 0,
        benchDepth: roster?.benchCount ?? 0,
        starterCount: roster?.starterCount ?? 0,
      }
    })
  }, [standings, rostersWithOwner, getName])

  const defaultSelectedIds = useMemo(() => {
    if (radarTeamData.length === 0) return new Set<number>()
    return new Set(
      [...radarTeamData]
        .sort((a, b) => b.winPct - a.winPct)
        .slice(0, 3)
        .map((t) => t.rosterId),
    )
  }, [radarTeamData])

  const activeTeamIds = customSelectedTeamIds ?? defaultSelectedIds

  const radarChartData = useMemo(() => {
    if (radarTeamData.length === 0) return []
    const ranges = RADAR_METRICS.map((m) => {
      const values = radarTeamData.map((t) => t[m.key])
      const min = Math.min(...values)
      const max = Math.max(...values)
      return { min, range: max - min || 1 }
    })
    return RADAR_METRICS.map((m, i) => {
      const entry: Record<string, number | string> = { metric: m.label }
      for (const team of radarTeamData) {
        if (activeTeamIds.has(team.rosterId)) {
          entry[`roster_${team.rosterId}`] = Math.round(
            ((team[m.key] - ranges[i].min) / ranges[i].range) * 100,
          )
        }
      }
      return entry
    })
  }, [radarTeamData, activeTeamIds])

  const toggleTeam = (rosterId: number) => {
    const next = new Set(activeTeamIds)
    if (next.has(rosterId)) {
      next.delete(rosterId)
    } else {
      next.add(rosterId)
    }
    setCustomSelectedTeamIds(next)
  }

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
      cell: (info) => {
        const placement = placementMap.get(info.row.original.roster_id)
        return (
          <div className="flex items-center gap-2">
            <OwnerAvatar
              avatarId={info.row.original.owner_avatar}
              name={getName({ display_name: info.row.original.display_name ?? 'Unknown', team_name: info.row.original.team_name })}
              size="sm"
            />
            {league?.status === 'complete' && placement != null && (
              <PlacementIcon placement={placement} totalTeams={standings.length} />
            )}
            <Link
              to="/matchups"
              search={(prev) => prev}
              className="font-medium text-gray-100 hover:text-accent hover:underline"
            >
              {getName({ display_name: info.row.original.display_name ?? `Team ${info.row.original.roster_id}`, team_name: info.row.original.team_name })}
            </Link>
          </div>
        )
      },
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
  ], [rankMap, getName, placementMap, league, standings])

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
            <p className="text-xl font-bold text-highlight">{highestScorer ? getName({ display_name: highestScorer.display_name ?? 'N/A', team_name: highestScorer.team_name }) : 'N/A'}</p>
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
              {sortedByPoints.map((team, idx) => {
                const placement = placementMap.get(team.roster_id)
                return (
                <div key={team.roster_id} className="flex items-center gap-3 rounded-lg border border-gray-700/50 p-3">
                  <span className="w-8 text-center font-mono text-lg font-bold text-gray-400">{idx + 1}</span>
                  <OwnerAvatar avatarId={team.owner_avatar} name={getName({ display_name: team.display_name ?? 'Unknown', team_name: team.team_name })} size="md" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1 font-medium text-gray-100">
                      {league?.status === 'complete' && placement != null && (
                        <PlacementIcon placement={placement} totalTeams={standings.length} />
                      )}
                      {getName({ display_name: team.display_name ?? 'Unknown', team_name: team.team_name })}
                    </div>
                    <div className="text-xs text-gray-400">{team.wins}W-{team.losses}L</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-highlight">{team.total_points_for.toFixed(1)}</div>
                    <div className="text-xs text-gray-400">Avg {(team.total_points_for / Math.max(1, team.wins + team.losses + team.ties)).toFixed(1)}/wk</div>
                  </div>
                </div>
                )
              })}
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
            <div className="mb-4 flex flex-wrap gap-2">
              {radarTeamData.map((team) => (
                <button
                  key={team.rosterId}
                  onClick={() => toggleTeam(team.rosterId)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    activeTeamIds.has(team.rosterId)
                      ? 'bg-accent/20 text-accent ring-1 ring-accent/50'
                      : 'bg-bg-secondary text-gray-400 hover:text-gray-100',
                  )}
                >
                  {team.name}
                </button>
              ))}
            </div>
            {activeTeamIds.size > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="var(--color-chart-grid)" />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: 'var(--color-chart-axis)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-chart-tooltip-bg)',
                      border: '1px solid var(--color-chart-tooltip-border)',
                      borderRadius: '0.5rem',
                      color: 'var(--color-chart-tooltip-text)',
                    }}
                  />
                  <Legend />
                  {radarTeamData
                    .filter((t) => activeTeamIds.has(t.rosterId))
                    .map((team, idx) => (
                      <Radar
                        key={team.rosterId}
                        name={team.name}
                        dataKey={`roster_${team.rosterId}`}
                        stroke={RADAR_COLORS[idx % RADAR_COLORS.length]}
                        fill={RADAR_COLORS[idx % RADAR_COLORS.length]}
                        fillOpacity={0.15}
                      />
                    ))}
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-8 text-center text-gray-400">Select teams to compare</p>
            )}
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

interface PlacementIconProps {
  placement: number
  totalTeams: number
}

function PlacementIcon({ placement, totalTeams }: PlacementIconProps) {
  if (placement === 1) return <span title="Champion">🏆</span>
  if (placement === 2) return <span title="Runner-up">🥈</span>
  if (placement === 3) return <span title="3rd Place">🥉</span>
  if (placement === totalTeams) return <span title="Last Place">🚽</span>
  return null
}