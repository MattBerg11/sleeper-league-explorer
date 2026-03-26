import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ErrorAlert } from '@/components/error-alert'
import { usePlayers } from '@/hooks/use-league-data'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
const PAGE_SIZE = 50

export function PlayerExplorerPage() {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<string>('')
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search, 300)

  const { data, isLoading, error } = usePlayers({
    search: debouncedSearch || undefined,
    position: position || undefined,
    page,
    pageSize: PAGE_SIZE,
  })

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
        <Select
          value={position}
          onChange={(e) => handlePositionChange(e.target.value)}
          className="w-32"
        >
          {POSITIONS.map((pos) => (
            <option key={pos} value={pos === 'All' ? '' : pos}>
              {pos}
            </option>
          ))}
        </Select>
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
            <div className="space-y-3">
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
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-400">
                        No players found
                      </TableCell>
                    </TableRow>
                  ) : (
                    players.map((player) => (
                      <TableRow key={player.player_id}>
                        <TableCell className="font-medium">{player.full_name ?? `${player.first_name} ${player.last_name}`}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{player.position ?? 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{player.team ?? '-'}</TableCell>
                        <TableCell>{player.age ?? '-'}</TableCell>
                        <TableCell>
                          <Badge variant={player.status === 'Active' ? 'win' : 'outline'}>
                            {player.status ?? 'Unknown'}
                          </Badge>
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