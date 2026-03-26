import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { OwnerAvatar } from '@/components/owner-avatar'
import { useStandings, useAllMatchupPairs } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { ErrorAlert } from '@/components/error-alert'

export function HeadToHeadPage() {
  const { leagueId } = useLeagueContext()
  const { data: standings = [], isLoading: standingsLoading, error } = useStandings(leagueId)
  const { data: allMatchups = [], isLoading: matchupsLoading } = useAllMatchupPairs(leagueId)

  const [team1Id, setTeam1Id] = useState<number | null>(null)
  const [team2Id, setTeam2Id] = useState<number | null>(null)

  const isLoading = standingsLoading || matchupsLoading

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

  const record = useMemo(() => {
    let team1Wins = 0
    let team2Wins = 0
    let ties = 0
    for (const m of h2hMatchups) {
      const t1Score =
        m.team1_roster_id === team1Id ? (m.team1_points ?? 0) : (m.team2_points ?? 0)
      const t2Score =
        m.team1_roster_id === team1Id ? (m.team2_points ?? 0) : (m.team1_points ?? 0)
      if (t1Score > t2Score) team1Wins++
      else if (t2Score > t1Score) team2Wins++
      else ties++
    }
    return { team1Wins, team2Wins, ties }
  }, [h2hMatchups, team1Id])

  const team1Info = standings.find((s) => s.roster_id === team1Id)
  const team2Info = standings.find((s) => s.roster_id === team2Id)

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-gray-400">Team 1</label>
          <Select
            value={String(team1Id ?? '')}
            onChange={(e) => setTeam1Id(e.target.value ? Number(e.target.value) : null)}
            className="w-full"
          >
            <option value="">Select a team...</option>
            {standings.map((s) => (
              <option key={s.roster_id} value={s.roster_id}>
                {s.team_name ?? s.display_name ?? `Team ${s.roster_id}`}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-gray-400">Team 2</label>
          <Select
            value={String(team2Id ?? '')}
            onChange={(e) => setTeam2Id(e.target.value ? Number(e.target.value) : null)}
            className="w-full"
          >
            <option value="">Select a team...</option>
            {standings
              .filter((s) => s.roster_id !== team1Id)
              .map((s) => (
                <option key={s.roster_id} value={s.roster_id}>
                  {s.team_name ?? s.display_name ?? `Team ${s.roster_id}`}
                </option>
              ))}
          </Select>
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
                    name={team1Info?.team_name ?? team1Info?.display_name ?? 'Team 1'}
                    size="lg"
                  />
                  <div>
                    <p className="font-semibold text-gray-100">
                      {team1Info?.team_name ?? team1Info?.display_name}
                    </p>
                    <p className="text-3xl font-bold text-win">{record.team1Wins}</p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-400">Record</p>
                  {record.ties > 0 && <p className="text-lg text-gray-500">{record.ties} ties</p>}
                </div>
                <div className="flex items-center gap-3 text-center">
                  <div>
                    <p className="font-semibold text-gray-100">
                      {team2Info?.team_name ?? team2Info?.display_name}
                    </p>
                    <p className="text-3xl font-bold text-win">{record.team2Wins}</p>
                  </div>
                  <OwnerAvatar
                    avatarId={team2Info?.owner_avatar}
                    name={team2Info?.team_name ?? team2Info?.display_name ?? 'Team 2'}
                    size="lg"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matchup History</CardTitle>
            </CardHeader>
            <CardContent>
              {h2hMatchups.length === 0 ? (
                <p className="py-4 text-center text-gray-400">
                  No matchups found between these teams
                </p>
              ) : (
                <div className="space-y-2">
                  {h2hMatchups.map((m) => {
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
