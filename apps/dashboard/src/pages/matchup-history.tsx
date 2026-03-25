import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useMatchupPairs, useAllMatchupPairs } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { MAX_REGULAR_SEASON_WEEKS } from '@sleeper-explorer/shared'

export function MatchupHistoryPage() {
  const { leagueId } = useLeagueContext()
  const [week, setWeek] = useState(1)
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Matchup History</h2>
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
        <div className="text-loss">Error loading matchups: {error.message}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {matchups.map((matchup) => {
            const team1Wins = (matchup.team1_points ?? 0) > (matchup.team2_points ?? 0)
            const team2Wins = (matchup.team2_points ?? 0) > (matchup.team1_points ?? 0)
            return (
              <Card key={matchup.matchup_id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-center">
                      <p className={`font-semibold ${team1Wins ? 'text-win' : 'text-gray-100'}`}>
                        Team {matchup.team1_roster_id}
                      </p>
                      <p className={`text-2xl font-bold ${team1Wins ? 'text-win' : 'text-gray-300'}`}>
                        {matchup.team1_points?.toFixed(2) ?? '-'}
                      </p>
                      {team1Wins && <Badge variant="win">W</Badge>}
                    </div>
                    <span className="px-4 text-lg font-bold text-gray-500">vs</span>
                    <div className="flex-1 text-center">
                      <p className={`font-semibold ${team2Wins ? 'text-win' : 'text-gray-100'}`}>
                        Team {matchup.team2_roster_id}
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
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#f3f4f6' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Line type="monotone" dataKey="avgScore" stroke="#818cf8" strokeWidth={2} dot={{ fill: '#818cf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}