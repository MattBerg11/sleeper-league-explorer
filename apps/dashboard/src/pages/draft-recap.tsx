import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useDrafts, useDraftPicks, useOwners, usePlayerMap, usePlayerSeasonPoints, useRosters, useTradedPicks } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDisplayName } from '@/hooks/use-display-name'
import { ErrorAlert } from '@/components/error-alert'
import { cn } from '@/lib/utils'
import { FileX } from 'lucide-react'

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
  const { getName } = useDisplayName()
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0)
  const { data: drafts = [], isLoading: draftsLoading, error: draftsError } = useDrafts(leagueId)
  const draft = drafts[selectedDraftIndex] ?? null
  const draftId = draft?.draft_id ?? ''
  const { data: picks = [], isLoading: picksLoading, error: picksError } = useDraftPicks(draftId)
  const error = draftsError ?? picksError
  const { data: playerMap } = usePlayerMap()
  const { data: rosters = [], isLoading: rostersLoading } = useRosters(leagueId)
  const { data: owners = [], isLoading: ownersLoading } = useOwners(leagueId)
  const { data: tradedPicks = [] } = useTradedPicks(leagueId)
  const { data: playerPoints } = usePlayerSeasonPoints(leagueId)

  const isLoading = draftsLoading || picksLoading || rostersLoading || ownersLoading

  const slotToRosterId = useMemo(() => {
    const map = new Map<number, number>()
    const slotMapping = draft?.slot_to_roster_id
    if (!slotMapping) return map
    for (const [slotStr, rosterId] of Object.entries(slotMapping)) {
      if (rosterId != null) {
        map.set(Number(slotStr), rosterId as number)
      }
    }
    return map
  }, [draft?.slot_to_roster_id])

  const slotToName = useMemo(() => {
    const map = new Map<number, string>()
    const slotMapping = draft?.slot_to_roster_id
    if (!slotMapping) return map
    const ownerMap = new Map(owners.map((o) => [o.user_id, o]))
    const rosterMap = new Map(rosters.map((r) => [r.roster_id, r]))
    for (const [slotStr, rosterId] of Object.entries(slotMapping)) {
      if (rosterId == null) continue
      const roster = rosterMap.get(rosterId)
      const owner = roster?.owner_id ? ownerMap.get(roster.owner_id) : undefined
      if (owner) {
        map.set(Number(slotStr), getName(owner))
      }
    }
    return map
  }, [draft?.slot_to_roster_id, rosters, owners, getName])

  const tradedPickSet = useMemo(() => {
    const set = new Set<string>()
    if (slotToRosterId.size > 0) {
      for (const pick of picks) {
        const originalRosterId = slotToRosterId.get(pick.draft_slot)
        if (originalRosterId != null && pick.roster_id !== originalRosterId) {
          set.add(`${pick.round}-${pick.draft_slot}`)
        }
      }
    }
    if (draft?.season) {
      for (const tp of tradedPicks) {
        if (tp.season === draft.season && tp.owner_id !== tp.roster_id) {
          set.add(`${tp.round}-roster-${tp.roster_id}`)
        }
      }
    }
    return set
  }, [picks, slotToRosterId, tradedPicks, draft?.season])

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
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Draft Recap</h2>
        <div role="status" aria-label="Loading draft data">
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Draft Recap</h2>
        <ErrorAlert error={error} title="Error loading draft data" />
      </div>
    )
  }

  if (picks.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Draft Recap</h2>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <FileX className="h-8 w-8" />
              <p>No draft data available</p>
              <p className="text-xs">Draft picks will appear once a draft has been completed</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isTraded = (pick: typeof picks[number]) =>
    tradedPickSet.has(`${pick.round}-${pick.draft_slot}`)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Draft Recap</h2>
        {drafts.length > 1 && (
          <Select value={String(selectedDraftIndex)} onValueChange={(v) => setSelectedDraftIndex(Number(v))}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select draft" />
            </SelectTrigger>
            <SelectContent>
              {drafts.map((d, i) => (
                <SelectItem key={d.draft_id} value={String(i)}>
                  {d.season} {'\u2014'} {d.metadata && typeof d.metadata === 'object' && 'name' in d.metadata ? String(d.metadata.name) : `Draft ${i + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Draft Board {'\u2014'} {draft?.season ?? ''}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          <div className="mb-3 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Badge variant="outline" className="px-1.5 py-0 text-[10px]">T</Badge>
              Traded pick
            </span>
            <span className="flex items-center gap-1">
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">K</Badge>
              Keeper
            </span>
          </div>
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `auto repeat(${draftBoard.cols}, minmax(100px, 1fr))` }}
          >
            {/* Header row */}
            <div className="p-2 text-xs font-medium text-gray-500" />
            {Array.from({ length: draftBoard.cols }, (_, i) => (
              <div key={i} className="p-2 text-center text-xs font-medium text-gray-500 truncate" title={slotToName.get(i + 1) ?? `Slot ${i + 1}`}>
                {slotToName.get(i + 1) ?? `Slot ${i + 1}`}
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
                const traded = isTraded(pick)
                const keeper = pick.is_keeper === true
                return (
                  <div
                    key={`${round + 1}-${slot + 1}`}
                    className={cn(
                      'relative rounded border p-2 text-xs',
                      colorClass,
                      traded && 'ring-1 ring-amber-400/60',
                    )}
                  >
                    {(traded || keeper) && (
                      <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                        {traded && (
                          <Badge variant="outline" className="px-1 py-0 text-[9px] leading-tight bg-amber-500/20 text-amber-400 border-amber-500/40">
                            T
                          </Badge>
                        )}
                        {keeper && (
                          <Badge variant="secondary" className="px-1 py-0 text-[9px] leading-tight">
                            K
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="font-medium">{meta?.first_name?.[0]}. {meta?.last_name ?? playerMap?.get(pick.player_id) ?? (playerMap ? pick.player_id : 'Loading...')}</div>
                    <div className="flex justify-between text-[10px] opacity-70">
                      <span>{position}</span>
                      <span>{meta?.team ?? ''}</span>
                    </div>
                    {playerPoints?.get(pick.player_id) != null && playerPoints.get(pick.player_id)! > 0 && (
                      <div className="mt-0.5">
                        <Badge variant="secondary" className="px-1 py-0 text-[9px]">
                          {playerPoints.get(pick.player_id)!.toFixed(1)} pts
                        </Badge>
                      </div>
                    )}
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