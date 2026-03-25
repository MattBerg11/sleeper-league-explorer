import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useDrafts, useDraftPicks, usePlayerMap } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { cn } from '@/lib/utils'

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-red-500/20 text-red-400 border-red-500/30',
  RB: 'bg-green-500/20 text-green-400 border-green-500/30',
  WR: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  TE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  K: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  DEF: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export function DraftRecapPage() {
  const { leagueId } = useLeagueContext()
  const { data: drafts = [], isLoading: draftsLoading } = useDrafts(leagueId)
  const draftId = drafts[0]?.draft_id ?? ''
  const { data: picks = [], isLoading: picksLoading } = useDraftPicks(draftId)
  const { data: playerMap } = usePlayerMap()

  const isLoading = draftsLoading || picksLoading

  const draftBoard = useMemo(() => {
    if (picks.length === 0) return { rounds: 0, cols: 0, grid: new Map() }
    const maxRound = Math.max(...picks.map((p) => p.round))
    const maxSlot = Math.max(...picks.map((p) => p.draft_slot))
    const grid = new Map<string, typeof picks[number]>()
    for (const pick of picks) {
      grid.set(`${pick.round}-${pick.draft_slot}`, pick)
    }
    return { rounds: maxRound, cols: maxSlot, grid }
  }, [picks])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-100">Draft Recap</h2>
        <Skeleton className="h-[600px]" />
      </div>
    )
  }

  if (picks.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-100">Draft Recap</h2>
        <Card>
          <CardContent className="p-8 text-center text-gray-400">
            No draft data available
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Draft Recap</h2>
      <Card>
        <CardHeader>
          <CardTitle>Draft Board � {drafts[0]?.season ?? ''}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `auto repeat(${draftBoard.cols}, minmax(120px, 1fr))` }}
          >
            {/* Header row */}
            <div className="p-2 text-xs font-medium text-gray-500" />
            {Array.from({ length: draftBoard.cols }, (_, i) => (
              <div key={i} className="p-2 text-center text-xs font-medium text-gray-500">
                Slot {i + 1}
              </div>
            ))}

            {/* Draft grid */}
            {Array.from({ length: draftBoard.rounds }, (_, round) => [
              <div key={`r${round + 1}`} className="flex items-center p-2 text-xs font-medium text-gray-500">
                Rd {round + 1}
              </div>,
              ...Array.from({ length: draftBoard.cols }, (_, slot) => {
                const pick = draftBoard.grid.get(`${round + 1}-${slot + 1}`)
                if (!pick) return <div key={`${round + 1}-${slot + 1}`} className="rounded border border-gray-800/50 p-2" />
                const meta = pick.metadata as Record<string, string> | null
                const position = meta?.position ?? ''
                const colorClass = POSITION_COLORS[position] ?? 'bg-gray-700/30 text-gray-400 border-gray-600/50'
                return (
                  <div
                    key={`${round + 1}-${slot + 1}`}
                    className={cn('rounded border p-2 text-xs', colorClass)}
                  >
                    <div className="font-medium">{meta?.first_name?.[0]}. {meta?.last_name ?? playerMap?.get(pick.player_id) ?? pick.player_id}</div>
                    <div className="flex justify-between text-[10px] opacity-70">
                      <span>{position}</span>
                      <span>{meta?.team ?? ''}</span>
                    </div>
                  </div>
                )
              }),
            ]).flat()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}