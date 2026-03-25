import { useMemo } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { SortingState } from '@tanstack/react-table'
import { useState } from 'react'
import { ArrowUpDown, TrendingUp, Users, Trophy } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useStandings } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import type { StandingsRow } from '@sleeper-explorer/shared'

const columnHelper = createColumnHelper<StandingsRow>()

export function LeagueOverviewPage() {
  const { leagueId } = useLeagueContext()
  const { data: standings = [], isLoading, error } = useStandings(leagueId)
  const [sorting, setSorting] = useState<SortingState>([])

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'rank',
      header: 'Rank',
      cell: (info) => (
        <span className="font-mono text-gray-400">{info.row.index + 1}</span>
      ),
    }),
    columnHelper.accessor('display_name', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting()}
        >
          Team <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => (
        <div>
          <span className="font-medium text-gray-100">{info.row.original.team_name ?? info.row.original.display_name ?? `Team ${info.row.original.roster_id}`}</span>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'record',
      header: 'W-L-T',
      cell: (info) => {
        const { wins, losses, ties } = info.row.original
        return (
          <div className="flex items-center gap-1">
            <Badge variant="win">{wins}W</Badge>
            <Badge variant="loss">{losses}L</Badge>
            {ties > 0 && <Badge variant="secondary">{ties}T</Badge>}
          </div>
        )
      },
    }),
    columnHelper.accessor('total_points_for', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting()}
        >
          PF <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => (
        <span className="font-mono text-highlight">{info.getValue().toFixed(2)}</span>
      ),
    }),
    columnHelper.accessor('total_points_against', {
      header: ({ column }) => (
        <button
          className="flex items-center gap-1"
          onClick={() => column.toggleSorting()}
        >
          PA <ArrowUpDown className="h-3 w-3" />
        </button>
      ),
      cell: (info) => (
        <span className="font-mono text-gray-400">{info.getValue().toFixed(2)}</span>
      ),
    }),
  ], [])

  const table = useReactTable({
    data: standings,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (error) {
    return <div className="text-loss">Error loading standings: {error.message}</div>
  }

  const totalTeams = standings.length
  const totalGames = standings.reduce((sum, s) => sum + s.wins + s.losses + s.ties, 0)
  const highestScorer = standings.reduce<StandingsRow | null>(
    (best, s) => (!best || s.total_points_for > best.total_points_for ? s : best),
    null,
  )

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">League Overview</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-100">{totalTeams}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Games Played</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-100">{totalGames}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Top Scorer</CardTitle>
            <Trophy className="h-4 w-4 text-highlight" />
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-highlight">{highestScorer?.team_name ?? highestScorer?.display_name ?? 'N/A'}</p>
            <p className="text-sm text-gray-400">{highestScorer?.total_points_for.toFixed(2) ?? '0'} pts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center text-gray-400">
                    No standings data available
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}