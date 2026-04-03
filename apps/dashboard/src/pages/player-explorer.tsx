import { useState, useMemo } from 'react'
import { Search, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorAlert } from '@/components/error-alert'
import { TeamLogo } from '@/components/team-logo'
import { usePlayers, useRosters } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
const PAGE_SIZE = 50

function getInjuryBadgeVariant(status: string): 'destructive' | 'outline' {
  switch (status.toLowerCase()) {
    case 'out':
    case 'ir':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getInjuryBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'out':
    case 'ir':
      return 'bg-red-600 text-white'
    case 'doubtful':
      return 'border-orange-500 text-orange-400'
    case 'questionable':
      return 'border-yellow-500 text-yellow-400'
    default:
      return ''
  }
}

export function PlayerExplorerPage() {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<string>('')
  const [page, setPage] = useState(1)
  const [showInactive, setShowInactive] = useState(false)

  const { leagueId } = useLeagueContext()

  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, error } = usePlayers({
    search: debouncedSearch || undefined,
    position: position || undefined,
    active: showInactive ? undefined : true,
    page,
    pageSize: PAGE_SIZE,
  })

  const { data: rosters } = useRosters(leagueId)

  const rosteredPlayerIds = useMemo(() => {
    const ids = new Set<string>()
    if (rosters) {
      for (const roster of rosters) {
        if (roster.players) {
          for (const id of roster.players) {
            ids.add(id)
          }
        }
      }
    }
    return ids
  }, [rosters])

  const players = data?.players ?? []
  const totalCount = data?.totalCount ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const from = (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, totalCount)

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  const handlePositionChange = (value: string) => {
    setPosition(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Player Explorer</h2>

      <div className="flex flex-wrap gap-4">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={position || '__all__'} onValueChange={(v) => handlePositionChange(v === '__all__' ? '' : v)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            {POSITIONS.map((pos) => (
              <SelectItem key={pos} value={pos === 'All' ? '__all__' : pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showInactive ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setShowInactive((prev) => !prev)
            setPage(1)
          }}
          className="self-center"
        >
          {showInactive ? 'Showing All' : 'Active Only'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Players</CardTitle>
            {totalCount > 0 && (
              <span className="text-sm text-gray-400">
                Showing {from}–{to} of {totalCount.toLocaleString()}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div role="status" aria-label="Loading players" className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : error ? (
            <ErrorAlert error={error} title="Error loading players" />
          ) : (
            <>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Exp</TableHead>
                    <TableHead>Depth</TableHead>
                    <TableHead>Injury</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Roster</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-8 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <Users className="h-8 w-8" />
                          <p>No players found</p>
                          <p className="text-xs">Try adjusting your search or filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    players.map((player) => (
                      <TableRow key={player.player_id}>
                        <TableCell className="text-muted-foreground">{player.search_rank ?? '-'}</TableCell>
                        <TableCell className="font-medium">{player.full_name ?? `${player.first_name} ${player.last_name}`}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{player.position ?? 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <TeamLogo team={player.team} size="sm" />
                            <span>{player.team ?? '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{player.age ?? '-'}</TableCell>
                        <TableCell>{player.years_exp != null ? `${player.years_exp}y` : '-'}</TableCell>
                        <TableCell>
                          {player.depth_chart_position
                            ? `${player.depth_chart_position}${player.depth_chart_order != null ? ` #${player.depth_chart_order}` : ''}`
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {player.injury_status ? (
                            <Badge
                              variant={getInjuryBadgeVariant(player.injury_status)}
                              className={getInjuryBadgeClass(player.injury_status)}
                            >
                              {player.injury_status}
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant={player.status === 'Active' ? 'win' : 'outline'}>
                            {player.status ?? 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {leagueId ? (
                            <Badge variant={rosteredPlayerIds.has(player.player_id) ? 'secondary' : 'outline'}>
                              {rosteredPlayerIds.has(player.player_id) ? 'Rostered' : 'Available'}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              </div>

              {/* Pagination Controls */}
              {totalCount > PAGE_SIZE && (
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}