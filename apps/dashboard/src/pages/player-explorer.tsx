import { useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePlayers } from '@/hooks/use-league-data'

const POSITIONS = ['All', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const

export function PlayerExplorerPage() {
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<string>('')
  const { data: players = [], isLoading, error } = usePlayers({
    search: search || undefined,
    position: position || undefined,
  })

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Player Explorer</h2>

      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={position}
          onChange={(e) => setPosition(e.target.value)}
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
          <CardTitle>Players</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : error ? (
            <div className="text-loss">Error loading players: {error.message}</div>
          ) : (
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}