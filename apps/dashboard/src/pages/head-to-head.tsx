import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { OwnerAvatar } from '@/components/owner-avatar'
import { useStandings, useAllMatchupPairs } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDisplayName } from '@/hooks/use-display-name'
import { ErrorAlert } from '@/components/error-alert'
import { cn } from '@/lib/utils'

const MAX_WEEKS = 18

export function HeadToHeadPage() {
  const { leagueId } = useLeagueContext()
  const { getName } = useDisplayName()
  const { data: standings = [], isLoading: standingsLoading, error } = useStandings(leagueId)
  const { data: allMatchups = [], isLoading: matchupsLoading } = useAllMatchupPairs(leagueId)

  const [team1Id, setTeam1Id] = useState<number | null>(null)
  const [team2Id, setTeam2Id] = useState<number | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null) // null = "All"

  const isLoading = standingsLoading || matchupsLoading

  const maxWeekWithData = useMemo(() => {
    if (allMatchups.length === 0) return MAX_WEEKS
    return Math.max(...allMatchups.map((m) => m.week))
  }, [allMatchups])

  const weeks = useMemo(
    () => Array.from({ length: maxWeekWithData }, (_, i) => i + 1),
    [maxWeekWithData],
  )

  const h2hMatchups = useMemo(() => {
    if (team1Id == null || team2Id == null) return []
    return allMatchups
      .filter(
        (m) =>
          (m.team1_roster_id === team1Id && m.team2_roster_id === team2Id) ||
          (m.team1_roster_id === team2Id && m.team2_roster_id === team1Id),
      )
      .sort((a, b) => a.week - b.week)
  }, [allMatchups, team1Id, team2Id])

  const filteredMatchups = useMemo(() => {
    if (selectedWeek == null) return h2hMatchups
    return h2hMatchups.filter((m) => m.week === selectedWeek)
  }, [h2hMatchups, selectedWeek])

  const record = useMemo(() => {
    let team1Wins = 0
    let team2Wins = 0
    let ties = 0
    for (const m of filteredMatchups) {
      const t1Score =
        m.team1_roster_id === team1Id ? (m.team1_points ?? 0) : (m.team2_points ?? 0)
      const t2Score =
        m.team1_roster_id === team1Id ? (m.team2_points ?? 0) : (m.team1_points ?? 0)
      if (t1Score > t2Score) team1Wins++
      else if (t2Score > t1Score) team2Wins++
      else ties++
    }
    return { team1Wins, team2Wins, ties }
  }, [filteredMatchups, team1Id])

  const team1Info = standings.find((s) => s.roster_id === team1Id)
  const team2Info = standings.find((s) => s.roster_id === team2Id)

  const comparisonData = useMemo(() => {
    if (team1Id == null || team2Id == null || allMatchups.length === 0) return []
    const weekMap = new Map<number, { week: number; team1: number | null; team2: number | null }>()

    for (const m of allMatchups) {
      if (m.team1_roster_id === team1Id || m.team2_roster_id === team1Id) {
        const score = m.team1_roster_id === team1Id ? m.team1_points : m.team2_points
        const entry = weekMap.get(m.week) ?? { week: m.week, team1: null, team2: null }
        entry.team1 = score
        weekMap.set(m.week, entry)
      }
      if (m.team1_roster_id === team2Id || m.team2_roster_id === team2Id) {
        const score = m.team1_roster_id === team2Id ? m.team1_points : m.team2_points
        const entry = weekMap.get(m.week) ?? { week: m.week, team1: null, team2: null }
        entry.team2 = score
        weekMap.set(m.week, entry)
      }
    }

    return [...weekMap.values()].sort((a, b) => a.week - b.week)
  }, [allMatchups, team1Id, team2Id])

  function handleTeamSelect(rosterId: number) {
    if (team1Id === rosterId) {
      setTeam1Id(team2Id)
      setTeam2Id(null)
    } else if (team2Id === rosterId) {
      setTeam2Id(null)
    } else if (team1Id == null) {
      setTeam1Id(rosterId)
    } else if (team2Id == null) {
      setTeam2Id(rosterId)
    } else {
      setTeam2Id(rosterId)
    }
  }

  function getTeamName(s: { display_name: string | null; team_name?: string | null; roster_id: number }) {
    return getName({ display_name: s.display_name ?? `Team ${s.roster_id}`, team_name: s.team_name })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Head-to-Head</h2>
        <div role="status" aria-label="Loading...">
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorAlert error={error} title="Error loading data" />
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Head-to-Head</h2>

      {/* Week Selector Tablist */}
      <div className="overflow-x-auto" role="tablist" aria-label="Week selector">
        <div className="flex gap-1 pb-1">
          <button
            role="tab"
            aria-selected={selectedWeek == null}
            onClick={() => setSelectedWeek(null)}
            className={cn(
              'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              selectedWeek == null
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-gray-400 hover:text-gray-200',
            )}
          >
            All
          </button>
          {weeks.map((w) => (
            <button
              key={w}
              role="tab"
              aria-selected={selectedWeek === w}
              onClick={() => setSelectedWeek(w)}
              className={cn(
                'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                selectedWeek === w
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-gray-400 hover:text-gray-200',
              )}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Team Selector */}
      <div>
        <p className="mb-2 text-sm text-gray-400">Select two teams:</p>
        <div className="flex flex-wrap gap-2">
          {standings.map((s) => (
            <button
              key={s.roster_id}
              onClick={() => handleTeamSelect(s.roster_id)}
              title={getTeamName(s)}
              className={cn(
                'rounded-lg p-0.5 transition-colors',
                team1Id === s.roster_id
                  ? 'ring-2 ring-accent bg-accent/10'
                  : team2Id === s.roster_id
                    ? 'ring-2 ring-highlight bg-highlight/10'
                    : 'hover:bg-bg-secondary',
              )}
              aria-pressed={team1Id === s.roster_id || team2Id === s.roster_id}
            >
              <OwnerAvatar
                avatarId={s.owner_avatar}
                name={getTeamName(s)}
                size="sm"
              />
            </button>
          ))}
        </div>
      </div>

      {team1Id != null && team2Id != null && (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-center">
                  <OwnerAvatar
                    avatarId={team1Info?.owner_avatar}
                    name={team1Info ? getTeamName(team1Info) : 'Team 1'}
                    size="lg"
                  />
                  <div>
                    <p className="font-semibold text-gray-100">
                      {team1Info ? getTeamName(team1Info) : 'Unknown'}
                    </p>
                    <p className="text-3xl font-bold text-win">{record.team1Wins}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">
                    {selectedWeek != null ? `Week ${selectedWeek}` : 'Record'}
                  </p>
                  {record.ties > 0 && <p className="text-lg text-gray-500">{record.ties} ties</p>}
                </div>
                <div className="flex items-center gap-3 text-center">
                  <div>
                    <p className="font-semibold text-gray-100">
                      {team2Info ? getTeamName(team2Info) : 'Unknown'}
                    </p>
                    <p className="text-3xl font-bold text-win">{record.team2Wins}</p>
                  </div>
                  <OwnerAvatar
                    avatarId={team2Info?.owner_avatar}
                    name={team2Info ? getTeamName(team2Info) : 'Team 2'}
                    size="lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedWeek != null ? `Week ${selectedWeek} Matchup` : 'Matchup History'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMatchups.length === 0 ? (
                <p className="py-4 text-center text-gray-400">
                  {selectedWeek != null
                    ? `No matchup between these teams in Week ${selectedWeek}`
                    : "These teams haven't played each other yet this season"}
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredMatchups.map((m) => {
                    const t1Score =
                      m.team1_roster_id === team1Id ? m.team1_points : m.team2_points
                    const t2Score =
                      m.team1_roster_id === team1Id ? m.team2_points : m.team1_points
                    const t1Won = (t1Score ?? 0) > (t2Score ?? 0)
                    const t2Won = (t2Score ?? 0) > (t1Score ?? 0)
                    return (
                      <div
                        key={m.week}
                        className="flex items-center justify-between rounded-lg border border-gray-700/50 p-3"
                      >
                        <span className="w-16 text-sm text-gray-400">Week {m.week}</span>
                        <div className="flex items-center gap-4">
                          <span
                            className={`font-mono text-lg font-bold ${t1Won ? 'text-win' : 'text-gray-300'}`}
                          >
                            {t1Score?.toFixed(2) ?? '-'}
                          </span>
                          {t1Won && <Badge variant="win">W</Badge>}
                          {!t1Won && !t2Won && <Badge variant="secondary">T</Badge>}
                          {t2Won && <Badge variant="loss">L</Badge>}
                        </div>
                        <div className="flex items-center gap-4">
                          {t2Won && <Badge variant="win">W</Badge>}
                          {!t1Won && !t2Won && <Badge variant="secondary">T</Badge>}
                          {t1Won && <Badge variant="loss">L</Badge>}
                          <span
                            className={`font-mono text-lg font-bold ${t2Won ? 'text-win' : 'text-gray-300'}`}
                          >
                            {t2Score?.toFixed(2) ?? '-'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {comparisonData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Scoring Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-8">
                  {/* Line Chart */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-400">Trend</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={comparisonData}>
                        <CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="3 3" />
                        <XAxis dataKey="week" stroke="var(--color-chart-axis)" />
                        <YAxis stroke="var(--color-chart-axis)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-chart-tooltip-bg)',
                            border: '1px solid var(--color-chart-tooltip-border)',
                            borderRadius: '0.5rem',
                            color: 'var(--color-chart-tooltip-text)',
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="team1"
                          name={team1Info ? getTeamName(team1Info) : 'Team 1'}
                          stroke="#60a5fa"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="team2"
                          name={team2Info ? getTeamName(team2Info) : 'Team 2'}
                          stroke="#f87171"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Bar Chart */}
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-400">Week by Week</p>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={comparisonData}>
                        <CartesianGrid stroke="var(--color-chart-grid)" strokeDasharray="3 3" />
                        <XAxis dataKey="week" stroke="var(--color-chart-axis)" />
                        <YAxis stroke="var(--color-chart-axis)" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-chart-tooltip-bg)',
                            border: '1px solid var(--color-chart-tooltip-border)',
                            borderRadius: '0.5rem',
                            color: 'var(--color-chart-tooltip-text)',
                          }}
                        />
                        <Legend />
                        <Bar dataKey="team1" name={team1Info ? getTeamName(team1Info) : 'Team 1'} fill="#60a5fa" />
                        <Bar dataKey="team2" name={team2Info ? getTeamName(team2Info) : 'Team 2'} fill="#f87171" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {(team1Id == null || team2Id == null) && (
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            Select two teams above to view their head-to-head history
          </CardContent>
        </Card>
      )}
    </div>
  )
}
