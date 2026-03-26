import { useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { usePlayoffBracket, useOwners, useRosters } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { ErrorAlert } from '@/components/error-alert'
import { cn } from '@/lib/utils'

export function PlayoffPicturePage() {
  const { leagueId } = useLeagueContext()
  const { data: bracket = [], isLoading, error } = usePlayoffBracket(leagueId)
  const { data: owners = [] } = useOwners(leagueId)
  const { data: rosters = [] } = useRosters(leagueId)

  const rosterNameMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const roster of rosters) {
      if (!roster.owner_id) continue
      const owner = owners.find((o) => o.user_id === roster.owner_id)
      if (owner) {
        map.set(roster.roster_id, owner.team_name ?? owner.display_name)
      }
    }
    return map
  }, [rosters, owners])

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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Playoff Picture</h2>
        <div className="flex gap-8">
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
          <CardContent className="p-8 text-center text-gray-400">
            No playoff bracket data available
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Playoff Picture</h2>

      <div className="flex gap-8 overflow-auto pb-4">
        {rounds.map(({ round, matchups }) => (
          <div key={round} className="min-w-[280px] space-y-4">
            <h3 className="text-center text-sm font-semibold text-gray-400">
              Round {round}
            </h3>
            {matchups.map((matchup) => (
              <Card key={matchup.match_id}>
                <CardContent className="space-y-2 p-4">
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2',
                      matchup.winner_roster_id === matchup.team1_roster_id
                        ? 'bg-win/10 text-win'
                        : 'bg-gray-800/30 text-gray-300',
                    )}
                  >
                    <span className="font-medium">{getTeamName(matchup.team1_roster_id)}</span>
                    {matchup.winner_roster_id === matchup.team1_roster_id && (
                      <Trophy className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-center text-xs text-gray-500">vs</div>
                  <div
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2',
                      matchup.winner_roster_id === matchup.team2_roster_id
                        ? 'bg-win/10 text-win'
                        : 'bg-gray-800/30 text-gray-300',
                    )}
                  >
                    <span className="font-medium">{getTeamName(matchup.team2_roster_id)}</span>
                    {matchup.winner_roster_id === matchup.team2_roster_id && (
                      <Trophy className="h-4 w-4" />
                    )}
                  </div>
                  {matchup.placement && (
                    <div className="text-center">
                      <Badge variant="secondary">Place: {matchup.placement}</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}