import { useMemo } from 'react'
import { Trophy, CalendarX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlayoffBracket, useOwners, useRosters, useAllMatchupPairs, useLeagues } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDisplayName } from '@/hooks/use-display-name'
import { ErrorAlert } from '@/components/error-alert'
import { OwnerAvatar } from '@/components/owner-avatar'
import { cn } from '@/lib/utils'
import type { PlayoffBracketRow } from '@sleeper-explorer/shared'

function getRoundLabel(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - round
  if (roundsFromEnd === 0) return 'Championship'
  if (roundsFromEnd === 1) return 'Semifinals'
  if (roundsFromEnd === 2) return 'Quarterfinals'
  return `Round ${round}`
}

function getPlacementLabel(placement: number): string {
  switch (placement) {
    case 1: return '🏆 Champion'
    case 2: return '🥈 Runner-Up'
    case 3: return '🥉 3rd Place'
    default: return `${placement}th Place`
  }
}

interface MatchupScores {
  team1Points: number | null
  team2Points: number | null
}

export function PlayoffPicturePage() {
  const { leagueId } = useLeagueContext()
  const { data: bracket = [], isLoading, error } = usePlayoffBracket(leagueId)
  const { data: owners = [] } = useOwners(leagueId)
  const { data: rosters = [] } = useRosters(leagueId)
  const { data: allMatchups = [] } = useAllMatchupPairs(leagueId)
  const { data: leagues = [] } = useLeagues()
  const { getName } = useDisplayName()

  const currentLeague = leagues.find((l) => l.league_id === leagueId)
  const playoffStartWeek = (currentLeague?.settings?.playoff_week_start as number | undefined) ?? 15

  const rosterNameMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const roster of rosters) {
      if (!roster.owner_id) continue
      const owner = owners.find((o) => o.user_id === roster.owner_id)
      if (owner) {
        map.set(roster.roster_id, getName(owner))
      }
    }
    return map
  }, [rosters, owners, getName])

  const rosterAvatarMap = useMemo(() => {
    const map = new Map<number, string | null>()
    for (const roster of rosters) {
      if (!roster.owner_id) continue
      const owner = owners.find((o) => o.user_id === roster.owner_id)
      if (owner) {
        map.set(roster.roster_id, owner.avatar)
      }
    }
    return map
  }, [rosters, owners])

  const playoffScoreMap = useMemo(() => {
    const map = new Map<string, MatchupScores>()
    for (const matchup of allMatchups) {
      if (matchup.week < playoffStartWeek) continue
      // Key by sorted roster IDs + week to handle either order
      const ids = [matchup.team1_roster_id, matchup.team2_roster_id].sort((a, b) => a - b)
      const key = `${matchup.week}-${ids[0]}-${ids[1]}`
      map.set(key, {
        team1Points: matchup.team1_points,
        team2Points: matchup.team2_points,
      })
    }
    return map
  }, [allMatchups, playoffStartWeek])

  function getScores(bracketMatchup: PlayoffBracketRow): MatchupScores | null {
    if (bracketMatchup.team1_roster_id === null || bracketMatchup.team2_roster_id === null) {
      return null
    }
    const week = playoffStartWeek + bracketMatchup.round - 1
    const ids = [bracketMatchup.team1_roster_id, bracketMatchup.team2_roster_id].sort((a, b) => a - b)
    const key = `${week}-${ids[0]}-${ids[1]}`
    const entry = playoffScoreMap.get(key)
    if (!entry) return null
    // Align scores with bracket team order (matchup_pairs may have them swapped)
    const matchup = allMatchups.find(
      (m) => m.week === week &&
        ((m.team1_roster_id === bracketMatchup.team1_roster_id && m.team2_roster_id === bracketMatchup.team2_roster_id) ||
         (m.team1_roster_id === bracketMatchup.team2_roster_id && m.team2_roster_id === bracketMatchup.team1_roster_id))
    )
    if (!matchup) return null
    if (matchup.team1_roster_id === bracketMatchup.team1_roster_id) {
      return { team1Points: matchup.team1_points, team2Points: matchup.team2_points }
    }
    return { team1Points: matchup.team2_points, team2Points: matchup.team1_points }
  }

  const totalRounds = useMemo(() => {
    if (bracket.length === 0) return 0
    return Math.max(...bracket.map((m) => m.round))
  }, [bracket])

  const rounds = useMemo(() => {
    const roundMap = new Map<number, typeof bracket>()
    for (const matchup of bracket) {
      const existing = roundMap.get(matchup.round) ?? []
      existing.push(matchup)
      roundMap.set(matchup.round, existing)
    }
    return Array.from(roundMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([round, matchups]) => ({ round, matchups }))
  }, [bracket])

  function getTeamName(rosterId: number | null): string {
    if (rosterId === null) return 'TBD'
    return rosterNameMap.get(rosterId) ?? `Team ${rosterId}`
  }

  function getAvatarId(rosterId: number | null): string | null | undefined {
    if (rosterId === null) return undefined
    return rosterAvatarMap.get(rosterId)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Playoff Picture</h2>
        <div role="status" aria-label="Loading playoff bracket" className="flex gap-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-96 w-64" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorAlert error={error} title="Error loading playoff bracket" />
  }

  if (bracket.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Playoff Picture</h2>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <CalendarX className="h-8 w-8" />
              <p>No playoff bracket data available</p>
              <p className="text-xs">Bracket data will appear once the playoffs begin</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Playoff Picture</h2>

      <div className="flex gap-8 overflow-auto pb-4">
        {rounds.map(({ round, matchups }, roundIndex) => (
          <div key={round} className="flex items-center gap-4">
            <div className="min-w-[300px] space-y-4">
              <h3 className="text-center text-sm font-semibold text-gray-400">
                {getRoundLabel(round, totalRounds)}
              </h3>
              {matchups.map((matchup) => {
                const scores = getScores(matchup)
                const team1IsWinner = matchup.winner_roster_id !== null && matchup.winner_roster_id === matchup.team1_roster_id
                const team2IsWinner = matchup.winner_roster_id !== null && matchup.winner_roster_id === matchup.team2_roster_id
                const hasResult = matchup.winner_roster_id !== null

                return (
                  <Card key={matchup.match_id}>
                    <CardContent className="space-y-1 p-3">
                      {/* Team 1 */}
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2',
                          team1IsWinner
                            ? 'bg-win/10'
                            : hasResult
                              ? 'bg-gray-800/20'
                              : 'bg-gray-800/30',
                        )}
                      >
                        {matchup.team1_roster_id !== null && (
                          <OwnerAvatar
                            avatarId={getAvatarId(matchup.team1_roster_id)}
                            name={getTeamName(matchup.team1_roster_id)}
                            size="sm"
                          />
                        )}
                        <span
                          className={cn(
                            'flex-1 truncate',
                            team1IsWinner
                              ? 'font-bold text-win'
                              : hasResult
                                ? 'text-gray-500'
                                : 'font-medium text-gray-300',
                          )}
                        >
                          {getTeamName(matchup.team1_roster_id)}
                        </span>
                        {scores && (
                          <span
                            className={cn(
                              'tabular-nums',
                              team1IsWinner ? 'font-bold text-win' : 'text-gray-500',
                            )}
                          >
                            {scores.team1Points ?? '–'}
                          </span>
                        )}
                        {team1IsWinner && <Trophy className="h-4 w-4 shrink-0 text-win" />}
                      </div>

                      <div className="text-center text-[10px] font-medium tracking-wider text-gray-600">
                        VS
                      </div>

                      {/* Team 2 */}
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-3 py-2',
                          team2IsWinner
                            ? 'bg-win/10'
                            : hasResult
                              ? 'bg-gray-800/20'
                              : 'bg-gray-800/30',
                        )}
                      >
                        {matchup.team2_roster_id !== null && (
                          <OwnerAvatar
                            avatarId={getAvatarId(matchup.team2_roster_id)}
                            name={getTeamName(matchup.team2_roster_id)}
                            size="sm"
                          />
                        )}
                        <span
                          className={cn(
                            'flex-1 truncate',
                            team2IsWinner
                              ? 'font-bold text-win'
                              : hasResult
                                ? 'text-gray-500'
                                : 'font-medium text-gray-300',
                          )}
                        >
                          {getTeamName(matchup.team2_roster_id)}
                        </span>
                        {scores && (
                          <span
                            className={cn(
                              'tabular-nums',
                              team2IsWinner ? 'font-bold text-win' : 'text-gray-500',
                            )}
                          >
                            {scores.team2Points ?? '–'}
                          </span>
                        )}
                        {team2IsWinner && <Trophy className="h-4 w-4 shrink-0 text-win" />}
                      </div>

                      {matchup.placement && (
                        <div className="pt-1 text-center">
                          <Badge variant="secondary" className="text-xs">
                            {getPlacementLabel(matchup.placement)}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Connector between rounds */}
            {roundIndex < rounds.length - 1 && (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="h-16 w-px bg-gray-700" />
                <div className="h-2 w-2 rounded-full bg-gray-600" />
                <div className="h-16 w-px bg-gray-700" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}