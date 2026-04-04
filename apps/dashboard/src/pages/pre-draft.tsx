import { useMemo, useState } from 'react'
import { Clipboard, Plus, Minus, ArrowRightLeft, Users, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorAlert } from '@/components/error-alert'
import { OwnerAvatar } from '@/components/owner-avatar'
import { RosterPopup } from '@/components/roster-popup'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useRosters,
  useOwners,
  useTransactions,
  useTradedPicks,
  usePlayerMap,
  useLeagues,
  useStandings,
} from '@/hooks/use-league-data'
import { useLeagueContext } from '@/hooks/use-league-context'
import { useDisplayName } from '@/hooks/use-display-name'
import { cn, formatRelativeTime } from '@/lib/utils'

// --- Types ---

interface DraftPick {
  round: number
  originalRosterId: number
  type: 'own' | 'acquired' | 'traded'
}

interface TeamPickInfo {
  rosterId: number
  basePicks: number
  tradedAway: number
  acquired: number
  totalPicks: number
  picks: DraftPick[]
}

type StrengthTier = 'Strong' | 'Average' | 'Rebuilding'

type SortOption = 'default' | 'faab' | 'strength' | 'capital' | 'roster-size'

// --- Constants ---

const TYPE_LABELS: Record<string, string> = {
  trade: 'Trade',
  waiver: 'Waiver',
  free_agent: 'Free Agent',
  commissioner: 'Commissioner',
}

const TYPE_VARIANTS: Record<string, 'default' | 'secondary' | 'win' | 'outline'> = {
  trade: 'default',
  waiver: 'secondary',
  free_agent: 'win',
  commissioner: 'outline',
}

const TIER_STYLES: Record<StrengthTier, string> = {
  Strong: 'bg-win/10 text-win border-win/30',
  Average: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Rebuilding: 'bg-loss/10 text-loss border-loss/30',
}

const TIER_ORDER: Record<StrengthTier, number> = {
  Strong: 0,
  Average: 1,
  Rebuilding: 2,
}

const SORT_LABELS: Record<SortOption, string> = {
  default: 'Default',
  faab: 'FAAB Spent',
  strength: 'Strength Tier',
  capital: 'Draft Capital',
  'roster-size': 'Roster Size',
}

// --- Helper functions ---

function getWaiverBudget(settings: Record<string, unknown>): number | null {
  const used = settings['waiver_budget_used']
  if (typeof used === 'number') return used
  return null
}

function computeStrengthTier(fpts: number, allFpts: number[]): StrengthTier {
  if (allFpts.length === 0) return 'Average'
  if (Math.max(...allFpts) === Math.min(...allFpts)) return 'Average'
  const sorted = [...allFpts].sort((a, b) => b - a)
  const topThreshold = sorted[Math.floor(sorted.length / 3)] ?? 0
  const bottomThreshold = sorted[Math.floor((sorted.length * 2) / 3)] ?? 0
  if (fpts >= topThreshold) return 'Strong'
  if (fpts <= bottomThreshold) return 'Rebuilding'
  return 'Average'
}

function computeTeamPicks(
  rosterId: number,
  totalRounds: number,
  tradedPicks: { round: number; roster_id: number; owner_id: number; previous_owner_id: number }[],
): TeamPickInfo {
  const picks: DraftPick[] = []

  // Start with own picks (one per round)
  for (let round = 1; round <= totalRounds; round++) {
    picks.push({ round, originalRosterId: rosterId, type: 'own' })
  }

  let tradedAway = 0
  let acquired = 0

  for (const tp of tradedPicks) {
    if (tp.roster_id === rosterId && tp.owner_id !== rosterId) {
      // Our pick was traded away — mark it as traded
      const idx = picks.findIndex(
        (p) => p.round === tp.round && p.originalRosterId === rosterId && p.type === 'own',
      )
      if (idx !== -1) {
        picks[idx] = { round: tp.round, originalRosterId: rosterId, type: 'traded' }
      }
      tradedAway++
    }
    if (tp.owner_id === rosterId && tp.roster_id !== rosterId) {
      // We acquired someone else's pick
      picks.push({ round: tp.round, originalRosterId: tp.roster_id, type: 'acquired' })
      acquired++
    }
  }

  return {
    rosterId,
    basePicks: totalRounds,
    tradedAway,
    acquired,
    totalPicks: totalRounds - tradedAway + acquired,
    picks,
  }
}

// --- Skeleton components ---

function HeaderSkeleton() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-8 w-28 rounded-lg" />
    </div>
  )
}

function ActivityFeedSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-5 w-16 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TeamCardSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DraftCapitalSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-48 w-full" />
      </CardContent>
    </Card>
  )
}

// --- Sub-components ---

function StatusBadge({ status }: { status: string }) {
  if (status === 'pre_draft') {
    return (
      <Badge variant="default" className="gap-1">
        <Clipboard className="h-3 w-3" />
        Draft Pending
      </Badge>
    )
  }
  if (status === 'complete') {
    return (
      <Badge variant="secondary" className="gap-1">
        Draft Complete
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1">
      {status.replace(/_/g, ' ')}
    </Badge>
  )
}

interface ActivityItemProps {
  type: string
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  created: number | null
  playerMap: Map<string, string> | undefined
  rosterToName: Map<number, string>
}

function ActivityItem({ type, adds, drops, created, playerMap, rosterToName }: ActivityItemProps) {
  const addEntries = adds ? Object.entries(adds) : []
  const dropEntries = drops ? Object.entries(drops) : []

  const involvedRosterIds = new Set<number>()
  for (const [, rosterId] of addEntries) involvedRosterIds.add(rosterId)
  for (const [, rosterId] of dropEntries) involvedRosterIds.add(rosterId)
  const teamNames = Array.from(involvedRosterIds).map((id) => rosterToName.get(id) ?? `Roster ${id}`)

  return (
    <div className="flex items-start gap-3 border-b border-gray-700/30 pb-3 last:border-0 last:pb-0">
      <Badge variant={TYPE_VARIANTS[type] ?? 'outline'} className="mt-0.5 shrink-0">
        {TYPE_LABELS[type] ?? type}
      </Badge>
      <div className="min-w-0 flex-1 space-y-1">
        {addEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-gray-300">
            <Plus className="h-3 w-3 text-win" />
            {addEntries.map(([playerId]) => (
              <span key={playerId} className="text-gray-100">
                {playerMap?.get(playerId) ?? playerId}
              </span>
            ))}
          </div>
        )}
        {dropEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-gray-300">
            <Minus className="h-3 w-3 text-loss" />
            {dropEntries.map(([playerId]) => (
              <span key={playerId} className="text-gray-100">
                {playerMap?.get(playerId) ?? playerId}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          {teamNames.length > 0 && <span>{teamNames.join(' • ')}</span>}
          {created && <span>· {formatRelativeTime(created)}</span>}
        </div>
      </div>
    </div>
  )
}

interface TeamCardProps {
  roster: {
    roster_id: number
    owner_id: string | null
    players: string[] | null
    fpts: number
    settings: Record<string, unknown>
  }
  owner: { display_name: string; team_name?: string | null; avatar: string | null } | undefined
  strengthTier: StrengthTier
  pickInfo: TeamPickInfo
  getName: (owner: { display_name: string; team_name?: string | null }) => string
  playerMap: Map<string, string> | undefined
  rosterToName: Map<number, string>
  seasonTradedPicks: { round: number; roster_id: number; owner_id: number; previous_owner_id: number }[]
  rosterToSlot: Map<number, number>
}

function TeamCard({ roster, owner, strengthTier, pickInfo, getName, playerMap, rosterToName, seasonTradedPicks, rosterToSlot }: TeamCardProps) {
  const [showPicks, setShowPicks] = useState(false)
  const [showPlayers, setShowPlayers] = useState(false)
  const displayName = owner ? getName(owner) : `Roster ${roster.roster_id}`
  const rosterSize = roster.players?.length ?? 0
  const budgetUsed = getWaiverBudget(roster.settings)

  const pickDetails = useMemo(() => {
    const sorted = [...pickInfo.picks].sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round
      const slotA = rosterToSlot.get(a.originalRosterId) ?? 0
      const slotB = rosterToSlot.get(b.originalRosterId) ?? 0
      return slotA - slotB
    })

    return sorted.map((pick) => {
      const slot = rosterToSlot.get(pick.originalRosterId)
      const slotStr = slot ? `${pick.round}.${String(slot).padStart(2, '0')}` : `Rd ${pick.round}`

      if (pick.type === 'own') {
        return { round: pick.round, slot: slotStr, label: 'Own pick', type: 'own' as const }
      }
      if (pick.type === 'acquired') {
        const fromName = rosterToName.get(pick.originalRosterId) ?? `Roster ${pick.originalRosterId}`
        return { round: pick.round, slot: slotStr, label: `from ${fromName}`, type: 'acquired' as const }
      }
      // traded
      const tradedTo = seasonTradedPicks.find(
        (p) => p.roster_id === roster.roster_id && p.round === pick.round && p.owner_id !== roster.roster_id,
      )
      const toName = tradedTo
        ? (rosterToName.get(tradedTo.owner_id) ?? `Roster ${tradedTo.owner_id}`)
        : 'Unknown'
      return { round: pick.round, slot: slotStr, label: `to ${toName}`, type: 'traded' as const }
    })
  }, [pickInfo, roster.roster_id, seasonTradedPicks, rosterToName, rosterToSlot])

  return (
    <Card className="transition-colors hover:border-gray-600/70">
      <CardContent className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <OwnerAvatar
            avatarId={owner?.avatar}
            name={displayName}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-100">{displayName}</p>
            <p className="text-xs text-gray-500">
              {rosterSize} player{rosterSize !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-bg-primary/50 p-2.5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Waiver Budget</p>
            <p className="text-sm font-bold text-gray-100">
              {budgetUsed !== null ? `$${budgetUsed}` : 'N/A'}
            </p>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPicks((v) => !v)}
              className="w-full cursor-pointer rounded-lg bg-bg-primary/50 p-2.5 text-center ring-1 ring-transparent transition-colors hover:bg-bg-primary/70 hover:ring-gray-600/50"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Draft Picks</p>
              <p className="text-sm font-bold text-gray-100">{pickInfo.totalPicks}</p>
              {(pickInfo.tradedAway > 0 || pickInfo.acquired > 0) && (
                <p className="text-[10px] text-gray-500">
                  {pickInfo.tradedAway > 0 && <span className="text-loss">-{pickInfo.tradedAway}</span>}
                  {pickInfo.tradedAway > 0 && pickInfo.acquired > 0 && ' / '}
                  {pickInfo.acquired > 0 && <span className="text-win">+{pickInfo.acquired}</span>}
                </p>
              )}
            </button>
            {showPicks && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPicks(false)} />
                <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-gray-700/50 bg-bg-secondary p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-300">
                      Draft Picks ({pickInfo.totalPicks} total)
                    </p>
                    <button type="button" onClick={() => setShowPicks(false)}>
                      <X className="h-3.5 w-3.5 text-gray-500 hover:text-gray-300" />
                    </button>
                  </div>
                  <div className="mb-2 h-px bg-gray-700/50" />
                  <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
                    {pickDetails.map((pick, i) => (
                      <div key={`${pick.round}-${i}`} className="flex items-center gap-2 text-xs">
                        <span
                          className={cn(
                            'inline-block h-2 w-2 shrink-0 rounded-full',
                            pick.type === 'own' && 'bg-accent/60',
                            pick.type === 'acquired' && 'bg-win/60',
                            pick.type === 'traded' && 'bg-gray-700/40',
                          )}
                        />
                        <span className="w-10 shrink-0 font-mono font-medium text-gray-300">{pick.slot}</span>
                        <span
                          className={cn(
                            'truncate',
                            pick.type === 'own' && 'text-gray-400',
                            pick.type === 'acquired' && 'text-win',
                            pick.type === 'traded' && 'text-loss line-through',
                          )}
                        >
                          {pick.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="rounded-lg bg-bg-primary/50 p-2.5 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Strength</p>
            <Badge
              className={cn(
                'mt-1 text-[10px]',
                TIER_STYLES[strengthTier],
              )}
            >
              {strengthTier}
            </Badge>
          </div>
          <button
            type="button"
            onClick={() => setShowPlayers(true)}
            className="cursor-pointer rounded-lg bg-bg-primary/50 p-2.5 text-center ring-1 ring-transparent transition-colors hover:bg-bg-primary/70 hover:ring-gray-600/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Roster Size</p>
            <p className="text-sm font-bold text-gray-100">{rosterSize}</p>
          </button>
        </div>
      </CardContent>
      <RosterPopup
        open={showPlayers}
        onClose={() => setShowPlayers(false)}
        title={`${displayName} — Roster`}
        players={roster.players ?? []}
        playerMap={playerMap}
      />
    </Card>
  )
}

interface DraftCapitalTableProps {
  rosters: { roster_id: number; owner_id: string | null }[]
  owners: { user_id: string; display_name: string; team_name: string | null }[]
  teamPicks: Map<number, TeamPickInfo>
  totalRounds: number
  getName: (owner: { display_name: string; team_name?: string | null }) => string
}

function DraftCapitalTable({ rosters, owners, teamPicks, totalRounds, getName }: DraftCapitalTableProps) {
  const ownerMap = new Map(owners.map((o) => [o.user_id, o]))
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-4 w-4 text-accent" />
          Draft Capital Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-bg-secondary">Team</TableHead>
              {rounds.map((r) => (
                <TableHead key={r} className="text-center">R{r}</TableHead>
              ))}
              <TableHead className="text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rosters.map((roster) => {
              const owner = roster.owner_id ? ownerMap.get(roster.owner_id) : undefined
              const name = owner ? getName(owner) : `Roster ${roster.roster_id}`
              const info = teamPicks.get(roster.roster_id)

              return (
                <TableRow key={roster.roster_id}>
                  <TableCell className="sticky left-0 bg-bg-secondary font-medium">
                    <span className="truncate">{name}</span>
                  </TableCell>
                  {rounds.map((r) => {
                    const roundPicks = info?.picks.filter((p) => p.round === r) ?? []
                    const hasOwn = roundPicks.some((p) => p.type === 'own')
                    const hasAcquired = roundPicks.some((p) => p.type === 'acquired')
                    const hasTraded = roundPicks.some((p) => p.type === 'traded')
                    const count = roundPicks.filter((p) => p.type !== 'traded').length
                    return (
                      <TableCell key={r} className="text-center">
                        {count === 0 && hasTraded && (
                          <span className="inline-block h-3 w-3 rounded-full bg-gray-700/40" title="Traded away" />
                        )}
                        {count === 1 && hasOwn && !hasAcquired && (
                          <span className="inline-block h-3 w-3 rounded-full bg-accent/60" title="Own pick" />
                        )}
                        {count === 1 && hasAcquired && !hasOwn && (
                          <span className="inline-block h-3 w-3 rounded-full bg-win/60" title="Acquired pick" />
                        )}
                        {count > 1 && (
                          <span className="inline-block rounded-full bg-win/60 px-1.5 text-[10px] font-bold text-white" title={`${count} picks`}>
                            {count}
                          </span>
                        )}
                        {count === 1 && hasOwn && hasAcquired && (
                          <span className="inline-block h-3 w-3 rounded-full bg-win/60" title="Own + Acquired" />
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center font-semibold">
                    {info?.totalPicks ?? 0}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        <div className="mt-3 flex items-center gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent/60" /> Own pick
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-win/60" /> Acquired
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-700/40" /> Traded away
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Main Page ---

export function PreDraftPage() {
  const { leagueId, season } = useLeagueContext()
  const { data: leagues = [] } = useLeagues()
  const { data: rosters = [], isLoading: rostersLoading, error: rostersError } = useRosters(leagueId)
  const { data: owners = [], isLoading: ownersLoading } = useOwners(leagueId)
  const { data: transactions = [], isLoading: txLoading } = useTransactions(leagueId)
  const { data: tradedPicks = [], isLoading: picksLoading } = useTradedPicks(leagueId)
  const { data: playerMap } = usePlayerMap()
  const { data: standings = [] } = useStandings(leagueId)
  const { getName } = useDisplayName()
  const [sortBy, setSortBy] = useState<SortOption>('default')

  const currentLeague = useMemo(
    () => leagues.find((l) => l.league_id === leagueId),
    [leagues, leagueId],
  )

  const totalRosters = currentLeague?.total_rosters ?? 12
  const leagueStatus = currentLeague?.status ?? ''

  // Build roster → owner name map
  const ownerMap = useMemo(
    () => new Map(owners.map((o) => [o.user_id, o])),
    [owners],
  )

  const rosterToName = useMemo(() => {
    const map = new Map<number, string>()
    for (const r of rosters) {
      const owner = r.owner_id ? ownerMap.get(r.owner_id) : undefined
      map.set(r.roster_id, owner ? getName(owner) : `Roster ${r.roster_id}`)
    }
    return map
  }, [rosters, ownerMap, getName])

  // Estimate draft slots: reverse standings order (worst record picks first = slot 1)
  const rosterToSlot = useMemo(() => {
    const map = new Map<number, number>()
    // standings is already sorted by wins DESC, so reverse it for draft order
    const reversed = [...standings].reverse()
    reversed.forEach((s, i) => map.set(s.roster_id, i + 1))
    return map
  }, [standings])

  // Recent 10 transactions
  const recentTransactions = useMemo(
    () => transactions.slice(0, 10),
    [transactions],
  )

  // Filter traded picks to the relevant season
  const seasonTradedPicks = useMemo(
    () => tradedPicks.filter((p) => p.season === season),
    [tradedPicks, season],
  )

  // Compute team picks for each roster
  const teamPicks = useMemo(() => {
    const map = new Map<number, TeamPickInfo>()
    for (const roster of rosters) {
      map.set(
        roster.roster_id,
        computeTeamPicks(roster.roster_id, totalRosters, seasonTradedPicks),
      )
    }
    return map
  }, [rosters, seasonTradedPicks, totalRosters])

  // Compute strength tiers
  const allFpts = useMemo(() => rosters.map((r) => r.fpts), [rosters])

  const strengthTiers = useMemo(() => {
    const map = new Map<number, StrengthTier>()
    for (const roster of rosters) {
      map.set(roster.roster_id, computeStrengthTier(roster.fpts, allFpts))
    }
    return map
  }, [rosters, allFpts])

  const sortedRosters = useMemo(() => {
    const list = [...rosters]
    switch (sortBy) {
      case 'faab':
        return list.sort((a, b) => (getWaiverBudget(b.settings) ?? 0) - (getWaiverBudget(a.settings) ?? 0))
      case 'strength':
        return list.sort(
          (a, b) =>
            (TIER_ORDER[strengthTiers.get(a.roster_id) ?? 'Average'] ?? 1) -
            (TIER_ORDER[strengthTiers.get(b.roster_id) ?? 'Average'] ?? 1),
        )
      case 'capital':
        return list.sort(
          (a, b) =>
            (teamPicks.get(b.roster_id)?.totalPicks ?? 0) -
            (teamPicks.get(a.roster_id)?.totalPicks ?? 0),
        )
      case 'roster-size':
        return list.sort((a, b) => (b.players?.length ?? 0) - (a.players?.length ?? 0))
      default:
        return list.sort((a, b) => a.roster_id - b.roster_id)
    }
  }, [rosters, sortBy, strengthTiers, teamPicks])

  const isLoading = rostersLoading || ownersLoading || txLoading || picksLoading

  if (rostersError) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Pre-Draft War Room</h2>
        <ErrorAlert error={rostersError} title="Failed to load roster data" />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <TeamCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <DraftCapitalSkeleton />
          <ActivityFeedSkeleton />
        </div>
      </div>
    )
  }

  if (rosters.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-100 sm:text-2xl">Pre-Draft War Room</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-3 h-10 w-10 text-gray-600" />
            <p className="text-sm text-gray-400">No rosters found for this league.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-100 sm:text-2xl">
            <Clipboard className="h-6 w-6 text-accent" />
            Pre-Draft War Room
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            {season} Season — {rosters.length} teams
          </p>
        </div>
        <StatusBadge status={leagueStatus} />
      </div>

      {/* Sort Control */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-400">Sort by:</span>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value} className="text-xs">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Team Cards Gallery — full width responsive grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedRosters.map((roster) => {
          const owner = roster.owner_id ? ownerMap.get(roster.owner_id) : undefined
          return (
            <TeamCard
              key={roster.roster_id}
              roster={roster}
              owner={owner}
              strengthTier={strengthTiers.get(roster.roster_id) ?? 'Average'}
              pickInfo={teamPicks.get(roster.roster_id) ?? {
                rosterId: roster.roster_id,
                basePicks: totalRosters,
                tradedAway: 0,
                acquired: 0,
                totalPicks: totalRosters,
                picks: [],
              }}
              getName={getName}
              playerMap={playerMap}
              rosterToName={rosterToName}
              seasonTradedPicks={seasonTradedPicks}
              rosterToSlot={rosterToSlot}
            />
          )
        })}
      </div>

      {/* Draft Capital + Activity Feed side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
        {/* Draft Capital Table — left, wider */}
        <div className="overflow-x-auto">
          <DraftCapitalTable
            rosters={rosters}
            owners={owners}
            teamPicks={teamPicks}
            totalRounds={totalRosters}
            getName={getName}
          />
        </div>

        {/* Activity Feed — right, narrower */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-4 w-4 text-accent" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length === 0 ? (
              <p className="text-center text-sm text-gray-500">No recent transactions</p>
            ) : (
              recentTransactions.map((tx) => (
                <ActivityItem
                  key={tx.transaction_id}
                  type={tx.type}
                  adds={tx.adds}
                  drops={tx.drops}
                  created={tx.created}
                  playerMap={playerMap}
                  rosterToName={rosterToName}
                />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
