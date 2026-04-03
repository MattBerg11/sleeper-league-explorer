import { useState, useMemo, useCallback } from 'react'
import { ArrowRightLeft, Plus, Minus, FileX, List, LayoutGrid, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useTransactions, usePlayerMap, useRosters, useOwners } from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDisplayName } from '@/hooks/use-display-name'
import { ErrorAlert } from '@/components/error-alert'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { TransactionRow } from '@sleeper-explorer/shared'

interface TradeDraftPick {
  season: string
  round: number
  roster_id: number
  previous_owner_id: number
  owner_id: number
}

const TYPE_KEYS = ['trade', 'waiver', 'free_agent', 'commissioner'] as const

const TYPE_LABELS: Record<string, string> = {
  trade: 'Trade',
  waiver: 'Waiver',
  free_agent: 'Free Agent',
  commissioner: 'Commissioner',
}

const TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'win' | 'loss'> = {
  trade: 'default',
  waiver: 'secondary',
  free_agent: 'win',
  commissioner: 'outline',
}

type GroupBy = 'none' | 'week' | 'team'
type ViewMode = 'list' | 'grid'

function resolvePlayerName(playerMap: Map<string, string> | undefined, playerId: string): string {
  return playerMap?.get(playerId) ?? playerId
}

interface TradeCardProps {
  tx: TransactionRow
  playerMap: Map<string, string> | undefined
  rosterToOwnerName: Map<number, string>
}

function TradeCard({ tx, playerMap, rosterToOwnerName }: TradeCardProps) {
  const addsByRoster = useMemo(() => {
    const map = new Map<number, string[]>()
    if (tx.adds) {
      for (const [playerId, rosterId] of Object.entries(tx.adds)) {
        const list = map.get(rosterId) ?? []
        list.push(playerId)
        map.set(rosterId, list)
      }
    }
    return map
  }, [tx.adds])

  const draftPicksByReceiver = useMemo(() => {
    const map = new Map<number, TradeDraftPick[]>()
    const picks = (tx.draft_picks ?? []) as TradeDraftPick[]
    for (const pick of picks) {
      const list = map.get(pick.owner_id) ?? []
      list.push(pick)
      map.set(pick.owner_id, list)
    }
    return map
  }, [tx.draft_picks])

  const involvedRosterIds = useMemo(() => {
    const ids = new Set<number>([...addsByRoster.keys(), ...draftPicksByReceiver.keys()])
    return [...ids]
  }, [addsByRoster, draftPicksByReceiver])

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-accent" />
            <Badge variant="default">Trade</Badge>
            <span className="text-xs text-gray-500">
              {tx.created ? formatRelativeTime(tx.created) : 'Unknown date'}
            </span>
          </div>
          <Badge variant="outline">{tx.status}</Badge>
        </div>

        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${involvedRosterIds.length}, 1fr)` }}
        >
          {involvedRosterIds.map((rosterId) => {
            const playerAdds = addsByRoster.get(rosterId) ?? []
            const pickAdds = draftPicksByReceiver.get(rosterId) ?? []
            return (
              <div key={rosterId} className="space-y-2">
                <p className="font-semibold text-gray-100 text-sm border-b border-gray-700/50 pb-1">
                  {rosterToOwnerName.get(rosterId) ?? `Roster ${rosterId}`}
                </p>
                {(playerAdds.length > 0 || pickAdds.length > 0) && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                      Receives
                    </p>
                    {playerAdds.map((playerId) => (
                      <div key={playerId} className="flex items-center gap-1.5 text-sm">
                        <Plus className="h-3 w-3 text-win" />
                        <span className="text-gray-200">
                          {resolvePlayerName(playerMap, playerId)}
                        </span>
                      </div>
                    ))}
                    {pickAdds.map((pick) => {
                      const fromName =
                        rosterToOwnerName.get(pick.previous_owner_id) ??
                        `Roster ${pick.previous_owner_id}`
                      return (
                        <div
                          key={`${pick.season}-${pick.round}-${pick.previous_owner_id}`}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <Plus className="h-3 w-3 text-win" />
                          <span className="text-gray-200">
                            {pick.season} Round {pick.round} Pick
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (from {fromName})
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {involvedRosterIds.length === 2 && (
          <p className="text-center text-xs text-muted-foreground mt-3">
            ←── traded ──→
          </p>
        )}
      </CardContent>
    </Card>
  )
}

interface NonTradeCardProps {
  tx: TransactionRow
  playerMap: Map<string, string> | undefined
  rosterToOwnerName: Map<number, string>
  rosters: { roster_id: number; owner_id: string | null }[]
}

function NonTradeCard({ tx, playerMap, rosterToOwnerName, rosters }: NonTradeCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-5 w-5 text-accent" />
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={TYPE_VARIANTS[tx.type] ?? 'outline'}>
                  {TYPE_LABELS[tx.type] ?? tx.type}
                </Badge>
                <span className="text-xs text-gray-500">
                  {tx.created ? formatRelativeTime(tx.created) : 'Unknown date'}
                </span>
                {tx.creator && rosterToOwnerName.size > 0 && (() => {
                  const creatorRoster = rosters.find((r) => r.owner_id === tx.creator)
                  const creatorName = creatorRoster
                    ? rosterToOwnerName.get(creatorRoster.roster_id)
                    : null
                  return creatorName ? (
                    <span className="text-xs text-muted-foreground">by {creatorName}</span>
                  ) : null
                })()}
              </div>
              <div className="mt-2 space-y-1">
                {tx.adds && Object.entries(tx.adds).map(([playerId, rosterId]) => (
                  <div key={`add-${playerId}`} className="flex items-center gap-2 text-sm">
                    <Plus className="h-3 w-3 text-win" />
                    <span className="text-win">Added</span>
                    <span className="text-gray-300">{resolvePlayerName(playerMap, playerId)}</span>
                    {rosterToOwnerName.has(rosterId) && (
                      <span className="text-xs text-muted-foreground">
                        → {rosterToOwnerName.get(rosterId)}
                      </span>
                    )}
                  </div>
                ))}
                {tx.drops && Object.entries(tx.drops).map(([playerId, rosterId]) => (
                  <div key={`drop-${playerId}`} className="flex items-center gap-2 text-sm">
                    <Minus className="h-3 w-3 text-loss" />
                    <span className="text-loss">Dropped</span>
                    <span className="text-gray-300">{resolvePlayerName(playerMap, playerId)}</span>
                    {rosterToOwnerName.has(rosterId) && (
                      <span className="text-xs text-muted-foreground">
                        from {rosterToOwnerName.get(rosterId)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Badge variant="outline">{tx.status}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}

interface TransactionCardProps {
  tx: TransactionRow
  playerMap: Map<string, string> | undefined
  rosterToOwnerName: Map<number, string>
  rosters: { roster_id: number; owner_id: string | null }[]
}

function TransactionCard({ tx, playerMap, rosterToOwnerName, rosters }: TransactionCardProps) {
  if (tx.type === 'trade') {
    return <TradeCard tx={tx} playerMap={playerMap} rosterToOwnerName={rosterToOwnerName} />
  }
  return <NonTradeCard tx={tx} playerMap={playerMap} rosterToOwnerName={rosterToOwnerName} rosters={rosters} />
}

interface TransactionGroup {
  key: string
  label: string
  transactions: TransactionRow[]
}

function groupTransactions(
  transactions: TransactionRow[],
  groupBy: GroupBy,
  rosterToOwnerName: Map<number, string>,
): TransactionGroup[] {
  if (groupBy === 'none') {
    return [{ key: '__all__', label: '', transactions }]
  }

  if (groupBy === 'week') {
    const groups = new Map<string, TransactionRow[]>()
    for (const tx of transactions) {
      const key = tx.leg != null ? `week-${tx.leg}` : 'offseason'
      const list = groups.get(key) ?? []
      list.push(tx)
      groups.set(key, list)
    }

    const sorted = [...groups.entries()].sort(([a], [b]) => {
      if (a === 'offseason') return 1
      if (b === 'offseason') return -1
      const weekA = parseInt(a.replace('week-', ''), 10)
      const weekB = parseInt(b.replace('week-', ''), 10)
      return weekB - weekA
    })

    return sorted.map(([key, txs]) => ({
      key,
      label: key === 'offseason' ? 'Offseason' : `Week ${key.replace('week-', '')}`,
      transactions: txs,
    }))
  }

  // groupBy === 'team'
  const groups = new Map<number, TransactionRow[]>()
  for (const tx of transactions) {
    const rosterIds = tx.roster_ids ?? []
    if (rosterIds.length === 0) {
      const unknownList = groups.get(-1) ?? []
      unknownList.push(tx)
      groups.set(-1, unknownList)
    } else {
      for (const rosterId of rosterIds) {
        const list = groups.get(rosterId) ?? []
        list.push(tx)
        groups.set(rosterId, list)
      }
    }
  }

  const sorted = [...groups.entries()].sort(([a], [b]) => {
    if (a === -1) return 1
    if (b === -1) return -1
    const nameA = rosterToOwnerName.get(a) ?? ''
    const nameB = rosterToOwnerName.get(b) ?? ''
    return nameA.localeCompare(nameB)
  })

  return sorted.map(([rosterId, txs]) => ({
    key: `team-${rosterId}`,
    label: rosterId === -1 ? 'Unknown Team' : (rosterToOwnerName.get(rosterId) ?? `Roster ${rosterId}`),
    transactions: txs,
  }))
}

interface CollapsibleGroupProps {
  group: TransactionGroup
  viewMode: ViewMode
  playerMap: Map<string, string> | undefined
  rosterToOwnerName: Map<number, string>
  rosters: { roster_id: number; owner_id: string | null }[]
}

function CollapsibleGroup({ group, viewMode, playerMap, rosterToOwnerName, rosters }: CollapsibleGroupProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 text-sm font-semibold text-gray-200 hover:text-gray-100 transition-colors w-full"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span>{group.label}</span>
        <Badge variant="secondary" className="ml-1 text-xs">
          {group.transactions.length}
        </Badge>
      </button>
      {open && (
        <TransactionList
          transactions={group.transactions}
          viewMode={viewMode}
          playerMap={playerMap}
          rosterToOwnerName={rosterToOwnerName}
          rosters={rosters}
        />
      )}
    </div>
  )
}

interface TransactionListProps {
  transactions: TransactionRow[]
  viewMode: ViewMode
  playerMap: Map<string, string> | undefined
  rosterToOwnerName: Map<number, string>
  rosters: { roster_id: number; owner_id: string | null }[]
}

function TransactionList({ transactions, viewMode, playerMap, rosterToOwnerName, rosters }: TransactionListProps) {
  return (
    <div
      className={cn(
        viewMode === 'grid'
          ? 'grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          : 'space-y-3',
      )}
    >
      {transactions.map((tx) => (
        <TransactionCard
          key={tx.transaction_id}
          tx={tx}
          playerMap={playerMap}
          rosterToOwnerName={rosterToOwnerName}
          rosters={rosters}
        />
      ))}
    </div>
  )
}

export function TransactionFeedPage() {
  const { leagueId } = useLeagueContext()
  const { data: transactions = [], isLoading, error } = useTransactions(leagueId)
  const { data: playerMap } = usePlayerMap()
  const { data: rosters = [] } = useRosters(leagueId)
  const { data: owners = [] } = useOwners(leagueId)
  const { getName } = useDisplayName()
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const rosterToOwnerName = useMemo(() => {
    const ownerMap = new Map(owners.map((o) => [o.user_id, o]))
    const map = new Map<number, string>()
    for (const r of rosters) {
      if (r.owner_id) {
        const owner = ownerMap.get(r.owner_id)
        map.set(r.roster_id, owner ? getName(owner) : `Roster ${r.roster_id}`)
      } else {
        map.set(r.roster_id, `Roster ${r.roster_id}`)
      }
    }
    return map
  }, [rosters, owners, getName])

  const availableTypes = useMemo(() => {
    const set = new Set(transactions.map((t) => t.type))
    return TYPE_KEYS.filter((k) => set.has(k))
  }, [transactions])

  const toggleType = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedTypes(new Set())
  }, [])

  const isAllActive = selectedTypes.size === 0

  const filtered = useMemo(() => {
    if (selectedTypes.size === 0) return transactions
    return transactions.filter((t) => selectedTypes.has(t.type))
  }, [transactions, selectedTypes])

  const groups = useMemo(
    () => groupTransactions(filtered, groupBy, rosterToOwnerName),
    [filtered, groupBy, rosterToOwnerName],
  )

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Transactions</h2>
        <div role="status" aria-label="Loading transactions" className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorAlert error={error} title="Error loading transactions" />
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Transactions</h2>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type filter tablist */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by type">
          <button
            type="button"
            onClick={selectAll}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              isAllActive
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-gray-400 hover:text-gray-200',
            )}
          >
            All
          </button>
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleType(type)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                selectedTypes.has(type)
                  ? 'bg-accent text-white'
                  : 'bg-bg-secondary text-gray-400 hover:text-gray-200',
              )}
            >
              {TYPE_LABELS[type] ?? type}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Group-by select */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Grouping</SelectItem>
              <SelectItem value="week">By Week</SelectItem>
              <SelectItem value="team">By Team</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode toggle */}
          <div className="flex items-center rounded-md border border-gray-700/50">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction content */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <FileX className="h-8 w-8" />
              <p>No transactions found</p>
              <p className="text-xs">
                {selectedTypes.size > 0
                  ? 'Try selecting a different type filter'
                  : 'Transaction data will appear once activity occurs'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : groupBy === 'none' ? (
        <TransactionList
          transactions={filtered}
          viewMode={viewMode}
          playerMap={playerMap}
          rosterToOwnerName={rosterToOwnerName}
          rosters={rosters}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <CollapsibleGroup
              key={group.key}
              group={group}
              viewMode={viewMode}
              playerMap={playerMap}
              rosterToOwnerName={rosterToOwnerName}
              rosters={rosters}
            />
          ))}
        </div>
      )}
    </div>
  )
}