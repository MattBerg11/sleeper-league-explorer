import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  LeagueRow,
  StandingsRow,
  RosterRow,
  MatchupPairRow,
  PlayerRow,
  TransactionRow,
  DraftRow,
  DraftPickRow,
  PlayoffBracketRow,
  OwnerRow,
  NFLStateRow,
  TradedPickRow,
} from '@sleeper-explorer/shared'

const STALE_TIME = 5 * 60 * 1000

export function useLeagues() {
  return useQuery<LeagueRow[]>({
    queryKey: ['leagues'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
      if (error) throw error
      return (data ?? []) as LeagueRow[]
    },
    staleTime: STALE_TIME,
  })
}

export function useStandings(leagueId: string) {
  return useQuery<StandingsRow[]>({
    queryKey: ['standings', leagueId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('standings')
        .select('*')
        .eq('league_id', leagueId)
      if (error) throw error
      return (data ?? []) as StandingsRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

export function useRosters(leagueId: string) {
  return useQuery<RosterRow[]>({
    queryKey: ['rosters', leagueId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('rosters')
        .select('*')
        .eq('league_id', leagueId)
      if (error) throw error
      return (data ?? []) as RosterRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

export function useMatchupPairs(leagueId: string, week: number) {
  return useQuery<MatchupPairRow[]>({
    queryKey: ['matchup-pairs', leagueId, week],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('matchup_pairs')
        .select('*')
        .eq('league_id', leagueId)
        .eq('week', week)
      if (error) throw error
      return (data ?? []) as MatchupPairRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId && week > 0,
  })
}

export function useAllMatchupPairs(leagueId: string) {
  return useQuery<MatchupPairRow[]>({
    queryKey: ['matchup-pairs-all', leagueId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('matchup_pairs')
        .select('*')
        .eq('league_id', leagueId)
        .order('week', { ascending: true })
      if (error) throw error
      return (data ?? []) as MatchupPairRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

interface PlayerFilterOptions {
  search?: string
  position?: string
  active?: boolean
  page?: number
  pageSize?: number
}

interface PlayersResult {
  players: PlayerRow[]
  totalCount: number
}

export function usePlayers(options: PlayerFilterOptions = {}) {
  const { search, position, active, page = 1, pageSize = 50 } = options
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return useQuery<PlayersResult>({
    queryKey: ['players', search, position, active, page, pageSize],
    queryFn: async () => {
      if (!supabase) return { players: [], totalCount: 0 }
      let query = supabase
        .from('players')
        .select('*', { count: 'exact' })
        .order('search_rank', { ascending: true, nullsFirst: false })
        .range(from, to)
      if (search) {
        const escaped = search.replace(/%/g, '\\%').replace(/_/g, '\\_')
        query = query.ilike('full_name', `%${escaped}%`)
      }
      if (position) {
        query = query.eq('position', position)
      }
      if (active !== undefined) {
        query = query.eq('active', active)
      }
      const { data, error, count } = await query
      if (error) throw error
      return {
        players: (data ?? []) as PlayerRow[],
        totalCount: count ?? 0,
      }
    },
    staleTime: STALE_TIME,
  })
}

export function useTransactions(leagueId: string) {
  return useQuery<TransactionRow[]>({
    queryKey: ['transactions', leagueId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('league_id', leagueId)
        .order('created', { ascending: false })
      if (error) throw error
      return (data ?? []) as TransactionRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

export function useDrafts(leagueId: string) {
  return useQuery<DraftRow[]>({
    queryKey: ['drafts', leagueId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('drafts')
        .select('*')
        .eq('league_id', leagueId)
      if (error) throw error
      return (data ?? []) as DraftRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

export function useDraftPicks(draftId: string) {
  return useQuery<DraftPickRow[]>({
    queryKey: ['draft-picks', draftId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('draft_picks')
        .select('*')
        .eq('draft_id', draftId)
        .order('pick_no', { ascending: true })
      if (error) throw error
      return (data ?? []) as DraftPickRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!draftId,
  })
}

export function usePlayoffBracket(leagueId: string) {
  return useQuery<PlayoffBracketRow[]>({
    queryKey: ['playoff-bracket', leagueId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('playoff_brackets')
        .select('*')
        .eq('league_id', leagueId)
        .order('round', { ascending: true })
      if (error) throw error
      return (data ?? []) as PlayoffBracketRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

export function useTradedPicks(leagueId: string) {
  return useQuery<TradedPickRow[]>({
    queryKey: ['traded-picks', leagueId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('traded_picks')
        .select('*')
        .eq('league_id', leagueId)
      if (error) throw error
      return (data ?? []) as TradedPickRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

export function useOwners(leagueId: string) {
  return useQuery<OwnerRow[]>({
    queryKey: ['owners', leagueId],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('league_id', leagueId)
      if (error) throw error
      return (data ?? []) as OwnerRow[]
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

export function usePlayerMap() {
  return useQuery<Map<string, string>>({
    queryKey: ['player-map'],
    queryFn: async () => {
      if (!supabase) return new Map<string, string>()
      const map = new Map<string, string>()
      const PAGE_SIZE = 5000
      let from = 0
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from('player_names')
          .select('player_id, name')
          .range(from, from + PAGE_SIZE - 1)
        if (error) throw error
        const rows = (data ?? []) as { player_id: string; name: string }[]
        for (const p of rows) {
          if (p.name) map.set(p.player_id, p.name)
        }
        hasMore = rows.length === PAGE_SIZE
        from += PAGE_SIZE
      }

      return map
    },
    staleTime: 30 * 60 * 1000,
  })
}

export function usePlayerSeasonPoints(leagueId: string) {
  return useQuery<Map<string, number>>({
    queryKey: ['player-season-points', leagueId],
    queryFn: async () => {
      if (!supabase) return new Map<string, number>()
      const { data, error } = await supabase
        .from('matchups')
        .select('players_points')
        .eq('league_id', leagueId)
      if (error) throw error
      const totals = new Map<string, number>()
      for (const row of data ?? []) {
        const pp = row.players_points as Record<string, number> | null
        if (!pp) continue
        for (const [playerId, pts] of Object.entries(pp)) {
          totals.set(playerId, (totals.get(playerId) ?? 0) + pts)
        }
      }
      return totals
    },
    staleTime: STALE_TIME,
    enabled: !!leagueId,
  })
}

export function useLastSynced() {
  return useQuery<string | null>({
    queryKey: ['last-synced'],
    queryFn: async () => {
      if (!supabase) return null
      const { data, error } = await supabase
        .from('leagues')
        .select('synced_at')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single()
      if (error) return null
      return (data as { synced_at: string })?.synced_at ?? null
    },
    staleTime: STALE_TIME,
  })
}

export function useNFLState() {
  return useQuery<NFLStateRow | null>({
    queryKey: ['nfl-state'],
    queryFn: async () => {
      if (!supabase) return null
      const { data, error } = await supabase
        .from('nfl_state')
        .select('*')
        .order('synced_at', { ascending: false })
        .limit(1)
        .single()
      if (error) {
        if (error.code === 'PGRST116') return null // no rows
        throw error
      }
      return data as NFLStateRow
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - NFL state rarely changes
  })
}
