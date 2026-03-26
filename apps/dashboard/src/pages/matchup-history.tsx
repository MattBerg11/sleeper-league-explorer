import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { ChevronLeft, ChevronRight, CalendarX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMatchupPairs, useAllMatchupPairs, useNFLState } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { ErrorAlert } from '@/components/error-alert'
import { cn } from '@/lib/utils'
import { MAX_REGULAR_SEASON_WEEKS } from '@sleeper-explorer/shared'

const TEAM_COLORS = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635',
  '#34d399', '#22d3ee', '#60a5fa', '#a78bfa',
  '#f472b6', '#e879f9', '#94a3b8', '#fca5a5',
]

export function MatchupHistoryPage() {
  const { leagueId } = useLeagueContext()
  const { data: nflState } = useNFLState()
  const [week, setWeek] = useState(1)

  // Auto-set week to current NFL week on first load
  useEffect(() => {
    if (nflState) {
      const currentWeek = nflState.display_week || nflState.week || 1
      // Clamp to valid range
      const clampedWeek = Math.max(1, Math.min(currentWeek, MAX_REGULAR_SEASON_WEEKS))
      setWeek(clampedWeek)
    }
  }, [nflState])

  const { data: matchups = [], isLoading, error } = useMatchupPairs(leagueId, week)
  const { data: allMatchups = [] } = useAllMatchupPairs(leagueId)

  const teams = useMemo(() => {
    const teamMap = new Map<number, string>()
    for (const m of allMatchups) {
      if (!teamMap.has(m.team1_roster_id)) {
        teamMap.set(m.team1_roster_id, m.team1_team_name ?? m.team1_name ?? `Team ${m.team1_roster_id}`)
      }
      if (!teamMap.has(m.team2_roster_id)) {
        teamMap.set(m.team2_roster_id, m.team2_team_name ?? m.team2_name ?? `Team ${m.team2_roster_id}`)
      }
    }
    return Array.from(teamMap.entries()).map(([id, name]) => ({ id, name }))
  }, [allMatchups])

  const chartData = useMemo(() => {
    const weekData = new Map<number, Record<string, number>>()

    for (const m of allMatchups) {
      const entry = weekData.get(m.week) ?? { _total: 0, _count: 0 }
      const pts1 = m.team1_points ?? 0
      const pts2 = m.team2_points ?? 0
      entry._total = (entry._total ?? 0) + pts1 + pts2
      entry._count = (entry._count ?? 0) + 2
      entry[`team_${m.team1_roster_id}`] = pts1
      entry[`team_${m.team2_roster_id}`] = pts2
      weekData.set(m.week, entry)
    }

    return Array.from(weekData.entries())
      .map(([w, data]) => ({
        week: `Wk ${w}`,
        avgScore: data._count > 0 ? Math.round((data._total / data._count) * 100) / 100 : 0,
        ...Object.fromEntries(
          Object.entries(data)
            .filter(([k]) => k.startsWith('team_'))
            .map(([k, v]) => [k, Math.round(v * 100) / 100]),
        ),
      }))
      .sort((a, b) => parseInt(a.week.slice(3)) - parseInt(b.week.slice(3)))
  }, [allMatchups])

  const [enabledTeams, setEnabledTeams] = useState<Set<number>>(new Set())

  const toggleTeam = (teamId: number) => {
    setEnabledTeams((prev) => {
      const next = new Set(prev)
      if (next.has(teamId)) next.delete(teamId)
      else next.add(teamId)
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Matchup History</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeek((w) => Math.max(1, w - 1))}
            disabled={week <= 1}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select
            value={String(week)}
            onChange={(e) => setWeek(Number(e.target.value))}
            className="w-32"
          >
            {Array.from({ length: MAX_REGULAR_SEASON_WEEKS }, (_, i) => i + 1).map((w) => (
              <option key={w} value={w}>Week {w}</option>
            ))}
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeek((w) => Math.min(MAX_REGULAR_SEASON_WEEKS, w + 1))}
            disabled={week >= MAX_REGULAR_SEASON_WEEKS}
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div role="status" aria-label="Loading matchups" className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : error ? (
        <ErrorAlert error={error} title="Error loading matchups" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {matchups.map((matchup) => {
            const team1Wins = (matchup.team1_points ?? 0) > (matchup.team2_points ?? 0)
            const team2Wins = (matchup.team2_points ?? 0) > (matchup.team1_points ?? 0)
            return (
              <Card key={matchup.matchup_id}>
                <CardContent className="p-4">
                  <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
                    <div className="flex-1 text-center">
                      <p className={`font-semibold ${team1Wins ? 'text-win' : 'text-gray-100'}`}>
                        {matchup.team1_team_name ?? matchup.team1_name ?? `Team ${matchup.team1_roster_id}`}
                      </p>
                      <p className={`text-2xl font-bold ${team1Wins ? 'text-win' : 'text-gray-300'}`}>
                        {matchup.team1_points?.toFixed(2) ?? '-'}
                      </p>
                      {team1Wins && <Badge variant="win">W</Badge>}
                    </div>
                    <span className="px-4 text-lg font-bold text-gray-500">vs</span>
                    <div className="flex-1 text-center">
                      <p className={`font-semibold ${team2Wins ? 'text-win' : 'text-gray-100'}`}>
                        {matchup.team2_team_name ?? matchup.team2_name ?? `Team ${matchup.team2_roster_id}`}
                      </p>
                      <p className={`text-2xl font-bold ${team2Wins ? 'text-win' : 'text-gray-300'}`}>
                        {matchup.team2_points?.toFixed(2) ?? '-'}
                      </p>
                      {team2Wins && <Badge variant="win">W</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {matchups.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <CalendarX className="h-8 w-8" />
                  <p>No matchups found for Week {week}</p>
                  <p className="text-xs">Try selecting a different week</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average Score by Week</CardTitle>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {teams.map((team, idx) => (
                <button
                  key={team.id}
                  onClick={() => toggleTeam(team.id)}
                  aria-pressed={enabledTeams.has(team.id)}
                  aria-label={`Toggle ${team.name} scoring line`}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border',
                    enabledTeams.has(team.id)
                      ? 'border-transparent text-white'
                      : 'border-gray-600 text-gray-400 hover:text-gray-200',
                  )}
                  style={
                    enabledTeams.has(team.id)
                      ? { backgroundColor: TEAM_COLORS[idx % TEAM_COLORS.length] }
                      : undefined
                  }
                >
                  {team.name}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div role="img" aria-label="Weekly scoring trend chart showing average score and per-team lines by week">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-chart-grid)" />
                <XAxis dataKey="week" stroke="var(--color-chart-axis)" />
                <YAxis stroke="var(--color-chart-axis)" />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--color-chart-tooltip-bg)', border: '1px solid var(--color-chart-tooltip-border)', borderRadius: '8px' }}
                  labelStyle={{ color: 'var(--color-chart-tooltip-text)' }}
                  itemStyle={{ color: 'var(--color-chart-line)' }}
                />
                <Line type="monotone" dataKey="avgScore" stroke="var(--color-chart-line)" strokeWidth={2} dot={{ fill: 'var(--color-chart-line)' }} name="League Avg" />
                {teams.map((team, idx) =>
                  enabledTeams.has(team.id) ? (
                    <Line
                      key={team.id}
                      type="monotone"
                      dataKey={`team_${team.id}`}
                      stroke={TEAM_COLORS[idx % TEAM_COLORS.length]}
                      strokeWidth={1.5}
                      dot={false}
                      name={team.name}
                    />
                  ) : null,
                )}
              </LineChart>
            </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}