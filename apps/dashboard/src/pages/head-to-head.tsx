import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { OwnerAvatar } from '@/components/owner-avatar'
import {
  useStandings,
  useAllMatchupPairs,
  useRawMatchups,
  usePlayerWeeklyStats,
  usePlayerPositions,
} from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDisplayName } from '@/hooks/use-display-name'
import { ErrorAlert } from '@/components/error-alert'
import { cn } from '@/lib/utils'

const MAX_WEEKS = 18

const POSITION_STATS: Record<string, { key: string; label: string }[]> = {
  QB: [
    { key: 'pass_yd', label: 'Pass Yards' },
    { key: 'pass_td', label: 'Pass TDs' },
    { key: 'pass_cmp', label: 'Completions' },
    { key: 'rush_yd', label: 'Rush Yards' },
    { key: 'pass_int', label: 'INTs' },
    { key: 'rush_td', label: 'Rush TDs' },
  ],
  RB: [
    { key: 'rush_yd', label: 'Rush Yards' },
    { key: 'rush_td', label: 'Rush TDs' },
    { key: 'rec', label: 'Receptions' },
    { key: 'rec_yd', label: 'Rec Yards' },
    { key: 'rush_att', label: 'Carries' },
    { key: 'fum', label: 'Fumbles' },
  ],
  WR: [
    { key: 'rec', label: 'Receptions' },
    { key: 'rec_yd', label: 'Rec Yards' },
    { key: 'rec_td', label: 'Rec TDs' },
    { key: 'rec_tgt', label: 'Targets' },
    { key: 'rec_yac', label: 'YAC' },
    { key: 'rush_yd', label: 'Rush Yards' },
  ],
  TE: [
    { key: 'rec', label: 'Receptions' },
    { key: 'rec_yd', label: 'Rec Yards' },
    { key: 'rec_td', label: 'Rec TDs' },
    { key: 'rec_tgt', label: 'Targets' },
    { key: 'rec_yac', label: 'YAC' },
    { key: 'rush_yd', label: 'Rush Yards' },
  ],
  K: [
    { key: 'fgm', label: 'FG Made' },
    { key: 'fga', label: 'FG Att' },
    { key: 'xpm', label: 'XP Made' },
    { key: 'xpa', label: 'XP Att' },
    { key: 'fgm_40_49', label: 'FG 40-49' },
    { key: 'fgm_50p', label: 'FG 50+' },
  ],
  DEF: [
    { key: 'sack', label: 'Sacks' },
    { key: 'int', label: 'INTs' },
    { key: 'ff', label: 'Forced Fum' },
    { key: 'fum_rec', label: 'Fum Rec' },
    { key: 'def_td', label: 'Def TDs' },
    { key: 'safe', label: 'Safeties' },
  ],
}

function PositionSpiderChart({
  position,
  team1Stats,
  team2Stats,
  team1Name,
  team2Name,
}: {
  position: string
  team1Stats: Record<string, number>
  team2Stats: Record<string, number>
  team1Name: string
  team2Name: string
}) {
  const statConfig = POSITION_STATS[position]
  if (!statConfig) return null

  const data = statConfig.map(({ key, label }) => ({
    stat: label,
    team1: team1Stats[key] ?? 0,
    team2: team2Stats[key] ?? 0,
  }))

  const hasData = data.some((d) => d.team1 > 0 || d.team2 > 0)
  if (!hasData) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{position}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <RadarChart data={data}>
            <PolarGrid stroke="var(--color-chart-grid)" />
            <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--color-chart-axis)', fontSize: 10 }} />
            <PolarRadiusAxis tick={{ fill: 'var(--color-chart-axis)', fontSize: 9 }} />
            <Radar name={team1Name} dataKey="team1" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.25} />
            <Radar name={team2Name} dataKey="team2" stroke="#f87171" fill="#f87171" fillOpacity={0.25} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-chart-tooltip-bg)',
                border: '1px solid var(--color-chart-tooltip-border)',
                borderRadius: '0.5rem',
                color: 'var(--color-chart-tooltip-text)',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function HeadToHeadPage() {
  const { leagueId, season } = useLeagueContext()
  const { getName } = useDisplayName()
  const { data: standings = [], isLoading: standingsLoading, error } = useStandings(leagueId)
  const { data: allMatchups = [], isLoading: matchupsLoading } = useAllMatchupPairs(leagueId)

  const [team1Id, setTeam1Id] = useState<number | null>(null)
  const [team2Id, setTeam2Id] = useState<number | null>(null)
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null) // null = "All"

  // Spider chart data hooks
  const { data: weekMatchups = [] } = useRawMatchups(leagueId, selectedWeek ?? 0)
  const { data: weeklyStats, isLoading: weeklyStatsLoading } = usePlayerWeeklyStats(
    season,
    selectedWeek,
  )
  const { data: positionMap } = usePlayerPositions()

  // Toggle group sliding indicator
  const toggleRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)

  const updateIndicator = useCallback(() => {
    if (!toggleRef.current) return
    const idx = selectedWeek === null ? 0 : selectedWeek
    const buttons = toggleRef.current.querySelectorAll('button')
    const button = buttons[idx]
    if (button) {
      setIndicatorStyle({
        left: button.offsetLeft,
        width: button.offsetWidth,
      })
    }
  }, [selectedWeek])

  useEffect(() => {
    updateIndicator()
  }, [updateIndicator])

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

  const { team1PosSummary, team2PosSummary } = useMemo(() => {
    const empty = {
      team1PosSummary: {} as Record<string, Record<string, number>>,
      team2PosSummary: {} as Record<string, Record<string, number>>,
    }
    if (!weeklyStats?.length || !positionMap || !weekMatchups?.length) return empty
    if (team1Id == null || team2Id == null) return empty

    const team1Matchup = weekMatchups.find((m) => m.roster_id === team1Id)
    const team2Matchup = weekMatchups.find((m) => m.roster_id === team2Id)
    if (!team1Matchup?.players || !team2Matchup?.players) return empty

    const statsMap = new Map<string, Record<string, number>>()
    for (const row of weeklyStats) {
      statsMap.set(row.player_id, row.stats)
    }

    function aggregateByPosition(playerIds: string[]) {
      const result: Record<string, Record<string, number>> = {}
      for (const pid of playerIds) {
        const pos = positionMap?.get(pid)
        if (!pos || !POSITION_STATS[pos]) continue
        const stats = statsMap.get(pid)
        if (!stats) continue
        if (!result[pos]) result[pos] = {}
        for (const { key } of POSITION_STATS[pos]) {
          result[pos][key] = (result[pos][key] ?? 0) + (stats[key] ?? 0)
        }
      }
      return result
    }

    return {
      team1PosSummary: aggregateByPosition(team1Matchup.players),
      team2PosSummary: aggregateByPosition(team2Matchup.players),
    }
  }, [weeklyStats, positionMap, weekMatchups, team1Id, team2Id])

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
        <div ref={toggleRef} className="relative inline-flex rounded-md border border-gray-700/50 bg-bg-secondary">
          {indicatorStyle && (
            <div
              className="absolute inset-y-0 rounded-md bg-accent transition-all duration-300 ease-out"
              style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
            />
          )}
          <button
            role="tab"
            aria-selected={selectedWeek == null}
            onClick={() => setSelectedWeek(null)}
            className={cn(
              'relative z-10 shrink-0 px-3 py-1.5 text-sm font-medium transition-colors',
              selectedWeek == null ? 'text-white' : 'text-gray-400 hover:text-gray-200',
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
                'relative z-10 shrink-0 px-3 py-1.5 text-sm font-medium transition-colors',
                selectedWeek === w ? 'text-white' : 'text-gray-400 hover:text-gray-200',
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
                    size="xl"
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
                    size="xl"
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
                        </div>
                        <div className="flex items-center gap-4">
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
              </CardContent>
            </Card>
          )}

          {selectedWeek != null && (
            <Card>
              <CardHeader>
                <CardTitle>Position Breakdown — Week {selectedWeek}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.keys(POSITION_STATS).map((pos) => (
                    <PositionSpiderChart
                      key={pos}
                      position={pos}
                      team1Stats={team1PosSummary[pos] ?? {}}
                      team2Stats={team2PosSummary[pos] ?? {}}
                      team1Name={team1Info ? getTeamName(team1Info) : 'Team 1'}
                      team2Name={team2Info ? getTeamName(team2Info) : 'Team 2'}
                    />
                  ))}
                </div>
                {!weeklyStatsLoading && Object.keys(team1PosSummary).length === 0 && (
                  <p className="py-4 text-center text-sm text-gray-400">
                    No player stats available for this week. Run the ETL sync to populate stats.
                  </p>
                )}
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
