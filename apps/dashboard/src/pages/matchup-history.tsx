import { useState, useMemo, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMatchupPairs, useAllMatchupPairs, useNFLState } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { ErrorAlert } from '@/components/error-alert'
import { MAX_REGULAR_SEASON_WEEKS } from '@sleeper-explorer/shared'

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

  const chartData = useMemo(() => {
    const weeklyAvg = new Map<number, { total: number; count: number }>()
    for (const m of allMatchups) {
      const pts1 = m.team1_points ?? 0
      const pts2 = m.team2_points ?? 0
      const existing = weeklyAvg.get(m.week) ?? { total: 0, count: 0 }
      existing.total += pts1 + pts2
      existing.count += 2
      weeklyAvg.set(m.week, existing)
    }
    return Array.from(weeklyAvg.entries())
      .map(([w, { total, count }]) => ({
        week: `Wk ${w}`,
        avgScore: count > 0 ? Math.round((total / count) * 100) / 100 : 0,
      }))
      .sort((a, b) => parseInt(a.week.slice(3)) - parseInt(b.week.slice(3)))
  }, [allMatchups])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Matchup History</h2>
        <Select
          value={String(week)}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="w-32"
        >
          {Array.from({ length: MAX_REGULAR_SEASON_WEEKS }, (_, i) => i + 1).map((w) => (
            <option key={w} value={w}>Week {w}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
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
              <CardContent className="p-8 text-center text-gray-400">
                No matchups found for Week {week}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Average Score by Week</CardTitle>
          </CardHeader>
          <CardContent>
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
                <Line type="monotone" dataKey="avgScore" stroke="var(--color-chart-line)" strokeWidth={2} dot={{ fill: 'var(--color-chart-line)' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}