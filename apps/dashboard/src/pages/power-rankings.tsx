import { useState, useMemo } from 'react'
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { OwnerAvatar } from '@/components/owner-avatar'
import { ErrorAlert } from '@/components/error-alert'
import { useStandings, useAllMatchupPairs } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDisplayName } from '@/hooks/use-display-name'
import { cn } from '@/lib/utils'

interface TeamMetrics {
  rosterId: number
  displayName: string
  teamName: string | null
  ownerAvatar: string | null
  winPct: number
  ppg: number
  consistency: number
  recentForm: number
  sos: number
  powerScore: number
  winPctPct: number
  ppgPct: number
  consistencyPct: number
  recentFormPct: number
  sosPct: number
}

function percentileRank(values: number[], value: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  const idx = sorted.indexOf(value)
  if (sorted.length <= 1) return 100
  return Math.round((idx / (sorted.length - 1)) * 100)
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function getScoreColor(percentile: number): string {
  if (percentile >= 75) return 'text-win'
  if (percentile >= 40) return 'text-highlight'
  return 'text-loss'
}

function getScoreBgClass(percentile: number): string {
  if (percentile >= 75) return 'bg-win/10 text-win border-win/30'
  if (percentile >= 40) return 'bg-highlight/10 text-highlight border-highlight/30'
  return 'bg-loss/10 text-loss border-loss/30'
}

export function PowerRankingsPage() {
  const { leagueId } = useLeagueContext()
  const { data: standings = [], isLoading: standingsLoading, error: standingsError } = useStandings(leagueId)
  const { data: allMatchups = [], isLoading: matchupsLoading, error: matchupsError } = useAllMatchupPairs(leagueId)
  const { getName } = useDisplayName()

  const [expandedTeam, setExpandedTeam] = useState<number | null>(null)

  const isLoading = standingsLoading || matchupsLoading
  const error = standingsError ?? matchupsError

  const rankings = useMemo(() => {
    if (standings.length === 0 || allMatchups.length === 0) return []

    const weeklyScores = new Map<number, { week: number; points: number; won: boolean }[]>()
    const opponentPoints = new Map<number, number[]>()

    for (const m of allMatchups) {
      const t1Pts = m.team1_points ?? 0
      const t2Pts = m.team2_points ?? 0

      const t1Scores = weeklyScores.get(m.team1_roster_id) ?? []
      t1Scores.push({ week: m.week, points: t1Pts, won: t1Pts > t2Pts })
      weeklyScores.set(m.team1_roster_id, t1Scores)

      const t2Scores = weeklyScores.get(m.team2_roster_id) ?? []
      t2Scores.push({ week: m.week, points: t2Pts, won: t2Pts > t1Pts })
      weeklyScores.set(m.team2_roster_id, t2Scores)

      const t1Opp = opponentPoints.get(m.team1_roster_id) ?? []
      t1Opp.push(t2Pts)
      opponentPoints.set(m.team1_roster_id, t1Opp)

      const t2Opp = opponentPoints.get(m.team2_roster_id) ?? []
      t2Opp.push(t1Pts)
      opponentPoints.set(m.team2_roster_id, t2Opp)
    }

    const rawMetrics = standings.map((s) => {
      const gamesPlayed = s.wins + s.losses + s.ties
      const winPct = gamesPlayed > 0 ? s.wins / gamesPlayed : 0
      const ppg = gamesPlayed > 0 ? s.total_points_for / gamesPlayed : 0

      const scores = weeklyScores.get(s.roster_id) ?? []
      const weekPoints = scores.map((sc) => sc.points)
      const stdDev = standardDeviation(weekPoints)
      const consistency = stdDev > 0 ? 1 / stdDev : 1

      const sortedWeeks = [...scores].sort((a, b) => b.week - a.week)
      const last3 = sortedWeeks.slice(0, 3)
      const recentWins = last3.filter((w) => w.won).length
      const recentPpg = last3.length > 0
        ? last3.reduce((s, w) => s + w.points, 0) / last3.length
        : 0
      const recentForm = recentWins * 33.33 + recentPpg * 0.1

      const oppPts = opponentPoints.get(s.roster_id) ?? []
      const sos = oppPts.length > 0
        ? oppPts.reduce((sum, p) => sum + p, 0) / oppPts.length
        : 0

      return {
        rosterId: s.roster_id,
        displayName: s.display_name ?? `Team ${s.roster_id}`,
        teamName: s.team_name,
        ownerAvatar: s.owner_avatar,
        winPct,
        ppg,
        consistency,
        recentForm,
        sos,
      }
    })

    const winPcts = rawMetrics.map((m) => m.winPct)
    const ppgs = rawMetrics.map((m) => m.ppg)
    const consistencies = rawMetrics.map((m) => m.consistency)
    const recentForms = rawMetrics.map((m) => m.recentForm)
    const sosValues = rawMetrics.map((m) => m.sos)

    const teams: TeamMetrics[] = rawMetrics.map((m) => {
      const winPctPct = percentileRank(winPcts, m.winPct)
      const ppgPct = percentileRank(ppgs, m.ppg)
      const consistencyPct = percentileRank(consistencies, m.consistency)
      const recentFormPct = percentileRank(recentForms, m.recentForm)
      const sosPct = percentileRank(sosValues, m.sos)

      const powerScore =
        winPctPct * 0.25 +
        ppgPct * 0.30 +
        consistencyPct * 0.20 +
        recentFormPct * 0.15 +
        sosPct * 0.10

      return { ...m, winPctPct, ppgPct, consistencyPct, recentFormPct, sosPct, powerScore }
    })

    return teams.sort((a, b) => b.powerScore - a.powerScore)
  }, [standings, allMatchups])

  const standingsRankMap = useMemo(() => {
    const sorted = [...standings].sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins
      return b.total_points_for - a.total_points_for
    })
    const map = new Map<number, number>()
    sorted.forEach((s, i) => map.set(s.roster_id, i + 1))
    return map
  }, [standings])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Power Rankings</h2>
        <div role="status" aria-label="Loading...">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorAlert error={error} title="Error loading rankings data" />
  }

  if (rankings.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Power Rankings</h2>
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            No data available yet. Rankings will appear once matchups have been played.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Power Rankings</h2>
        <p className="mt-1 text-sm text-gray-400">
          Composite rankings based on win rate, scoring, consistency, recent form, and strength of schedule.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>
            <CardTitle>Rankings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rankings.map((team, idx) => {
              const powerRank = idx + 1
              const standingsRank = standingsRankMap.get(team.rosterId) ?? powerRank
              const movement = standingsRank - powerRank
              const isExpanded = expandedTeam === team.rosterId
              const powerPct = Math.round(team.powerScore)

              return (
                <div key={team.rosterId}>
                  <button
                    type="button"
                    onClick={() => setExpandedTeam(isExpanded ? null : team.rosterId)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border border-gray-700/50 p-3 text-left transition-colors hover:bg-gray-800/50',
                      isExpanded && 'bg-gray-800/30',
                    )}
                  >
                    <span className="w-8 text-center text-lg font-bold text-gray-400">
                      {powerRank}
                    </span>

                    <OwnerAvatar
                      avatarId={team.ownerAvatar}
                      name={getName({ display_name: team.displayName, team_name: team.teamName })}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-100">
                        {getName({ display_name: team.displayName, team_name: team.teamName })}
                      </p>
                      {team.teamName && (
                        <p className="truncate text-xs text-gray-400">{team.displayName}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <MovementBadge movement={movement} />
                      <span
                        className={cn(
                          'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold',
                          getScoreBgClass(powerPct),
                        )}
                      >
                        {team.powerScore.toFixed(1)}
                      </span>
                    </div>

                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-1 rounded-lg border border-gray-700/30 bg-gray-800/20 p-4">
                      <MetricBreakdown team={team} />
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Metric Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {expandedTeam ? (
                <TeamRadarChart
                  team={rankings.find((t) => t.rosterId === expandedTeam) ?? rankings[0]}
                />
              ) : (
                <TopTeamsRadarChart teams={rankings.slice(0, 3)} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scoring Weights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <WeightBar label="Points Per Game" weight={30} />
                <WeightBar label="Win %" weight={25} />
                <WeightBar label="Consistency" weight={20} />
                <WeightBar label="Recent Form" weight={15} />
                <WeightBar label="Strength of Schedule" weight={10} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function MovementBadge({ movement }: { movement: number }) {
  if (movement > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-win">
        <TrendingUp className="h-3 w-3" />
        +{movement}
      </span>
    )
  }
  if (movement < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs font-semibold text-loss">
        <TrendingDown className="h-3 w-3" />
        {movement}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-gray-500">
      <Minus className="h-3 w-3" />
    </span>
  )
}

function MetricBreakdown({ team }: { team: TeamMetrics }) {
  const metrics = [
    { label: 'Points Per Game', raw: team.ppg.toFixed(2), pct: team.ppgPct, weight: '30%' },
    { label: 'Win %', raw: `${(team.winPct * 100).toFixed(1)}%`, pct: team.winPctPct, weight: '25%' },
    { label: 'Consistency', raw: `σ = ${team.consistency > 0 ? (1 / team.consistency).toFixed(2) : '0'}`, pct: team.consistencyPct, weight: '20%' },
    { label: 'Recent Form', raw: team.recentForm.toFixed(1), pct: team.recentFormPct, weight: '15%' },
    { label: 'Strength of Schedule', raw: team.sos.toFixed(2), pct: team.sosPct, weight: '10%' },
  ]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 gap-y-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Metric</span>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Value</span>
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-gray-500 sm:block">Percentile</span>
        <span className="hidden text-xs font-semibold uppercase tracking-wider text-gray-500 sm:block">Weight</span>
        {metrics.map((m) => (
          <MetricRow key={m.label} {...m} />
        ))}
      </div>
    </div>
  )
}

function MetricRow({ label, raw, pct, weight }: { label: string; raw: string; pct: number; weight: string }) {
  return (
    <>
      <span className="text-gray-300">{label}</span>
      <span className="text-right font-mono text-gray-100">{raw}</span>
      <span className={cn('hidden text-right font-mono sm:block', getScoreColor(pct))}>
        {pct}th
      </span>
      <span className="hidden text-right text-gray-500 sm:block">{weight}</span>
    </>
  )
}

const RADAR_METRICS = [
  { key: 'ppgPct', label: 'PPG' },
  { key: 'winPctPct', label: 'Win %' },
  { key: 'consistencyPct', label: 'Consistency' },
  { key: 'recentFormPct', label: 'Recent Form' },
  { key: 'sosPct', label: 'SOS' },
] as const

const RADAR_COLORS = ['#60a5fa', '#f87171', '#34d399']

function TeamRadarChart({ team }: { team: TeamMetrics }) {
  const { getName } = useDisplayName()
  const data = RADAR_METRICS.map((m) => ({
    metric: m.label,
    value: team[m.key],
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data}>
        <PolarGrid stroke="var(--color-chart-grid)" />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: 'var(--color-chart-axis)', fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: 'var(--color-chart-axis)', fontSize: 10 }}
        />
        <Radar
          name={getName({ display_name: team.displayName, team_name: team.teamName })}
          dataKey="value"
          stroke="#60a5fa"
          fill="#60a5fa"
          fillOpacity={0.3}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-chart-tooltip-bg)',
            border: '1px solid var(--color-chart-tooltip-border)',
            color: 'var(--color-chart-tooltip-text)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number) => [`${value}th percentile`, '']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

function TopTeamsRadarChart({ teams }: { teams: TeamMetrics[] }) {
  const { getName } = useDisplayName()
  const data = RADAR_METRICS.map((m) => {
    const entry: Record<string, string | number> = { metric: m.label }
    teams.forEach((t, i) => {
      entry[`team${i}`] = t[m.key]
    })
    return entry
  })

  return (
    <div>
      <p className="mb-2 text-xs text-gray-400">Top 3 teams — click a team for individual view</p>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--color-chart-grid)" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: 'var(--color-chart-axis)', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'var(--color-chart-axis)', fontSize: 10 }}
          />
          {teams.map((t, i) => (
            <Radar
              key={t.rosterId}
              name={getName({ display_name: t.displayName, team_name: t.teamName })}
              dataKey={`team${i}`}
              stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
              fill={RADAR_COLORS[i % RADAR_COLORS.length]}
              fillOpacity={0.15}
            />
          ))}
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-chart-tooltip-bg)',
              border: '1px solid var(--color-chart-tooltip-border)',
              color: 'var(--color-chart-tooltip-text)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}th percentile`, '']}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-3">
        {teams.map((t, i) => (
          <div key={t.rosterId} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: RADAR_COLORS[i % RADAR_COLORS.length] }}
            />
            {getName({ display_name: t.displayName, team_name: t.teamName })}
          </div>
        ))}
      </div>
    </div>
  )
}

function WeightBar({ label, weight }: { label: string; weight: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 flex-shrink-0 text-gray-300">{label}</span>
      <div className="flex-1">
        <div className="h-2 overflow-hidden rounded-full bg-gray-700/50">
          <div
            className="h-full rounded-full bg-accent/60"
            style={{ width: `${weight * 3.33}%` }}
          />
        </div>
      </div>
      <span className="w-8 text-right font-mono text-xs text-gray-400">{weight}%</span>
    </div>
  )
}
