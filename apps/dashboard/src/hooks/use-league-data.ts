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
  limit?: number
}

export function usePlayers(options: PlayerFilterOptions = {}) {
  const { search, position, limit = 100 } = options
  return useQuery<PlayerRow[]>({
    queryKey: ['players', search, position, limit],
    queryFn: async () => {
      if (!supabase) return []
      let query = supabase
        .from('players')
        .select('*')
        .order('search_rank', { ascending: true, nullsFirst: false })
        .limit(limit)
      if (search) {
        query = query.ilike('full_name', `%${search}%`)
      }
      if (position) {
        query = query.eq('position', position)
      }
      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as PlayerRow[]
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
