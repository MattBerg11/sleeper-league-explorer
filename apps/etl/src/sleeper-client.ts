import {
  SLEEPER_API_BASE,
  nflStateSchema,
  playersResponseSchema,
  leagueSchema,
  ownerSchema,
  rosterSchema,
  matchupSchema,
  transactionSchema,
  draftSchema,
  draftPickSchema,
  tradedPickSchema,
  playoffMatchupSchema,
  playerStatsResponseSchema,
} from '@sleeper-explorer/shared'
import type {
  NFLState,
  PlayersResponse,
  League,
  Owner,
  Roster,
  Matchup,
  Transaction,
  Draft,
  DraftPick,
  TradedPick,
  PlayoffMatchup,
  PlayerStatsResponse,
} from '@sleeper-explorer/shared'
import type { ZodType, ZodTypeDef } from 'zod'

/** Minimum ms between consecutive requests */
const RATE_LIMIT_DELAY_MS = 100

let lastRequestTime = 0

async function rateLimitDelay(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise<void>((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS - elapsed))
  }
  lastRequestTime = Date.now()
}

async function fetchJson(url: string): Promise<unknown> {
  await rateLimitDelay()
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Sleeper API error: ${response.status} ${response.statusText} for ${url}`)
  }
  return response.json() as Promise<unknown>
}

function parseObject<T>(data: unknown, schema: ZodType<T, ZodTypeDef, unknown>, label: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    console.error(`Validation failed for ${label}:`, result.error.issues)
    throw new Error(`Validation failed for ${label}`)
  }
  return result.data
}

function parseArray<T>(data: unknown, schema: ZodType<T, ZodTypeDef, unknown>, label: string): T[] {
  if (!Array.isArray(data)) {
    console.warn(`Expected array for ${label}, got ${typeof data}`)
    return []
  }
  const validated: T[] = []
  for (let i = 0; i < data.length; i++) {
    const result = schema.safeParse(data[i])
    if (result.success) {
      validated.push(result.data)
    } else {
      console.warn(`Skipping invalid item ${i} in ${label}:`, result.error.issues[0]?.message)
    }
  }
  return validated
}

export interface SleeperClient {
  getNFLState(): Promise<NFLState>
  getPlayers(): Promise<PlayersResponse>
  getLeague(leagueId: string): Promise<League>
  getLeagueUsers(leagueId: string): Promise<Owner[]>
  getLeagueRosters(leagueId: string): Promise<Roster[]>
  getLeagueMatchups(leagueId: string, week: number): Promise<Matchup[]>
  getLeagueTransactions(leagueId: string, round: number): Promise<Transaction[]>
  getDraft(draftId: string): Promise<Draft>
  getDraftPicks(draftId: string): Promise<DraftPick[]>
  getTradedPicks(leagueId: string): Promise<TradedPick[]>
  getWinnersBracket(leagueId: string): Promise<PlayoffMatchup[]>
  getPlayerStats(season: string, week: number): Promise<PlayerStatsResponse>
}

export function createSleeperClient(): SleeperClient {
  const base = SLEEPER_API_BASE

  return {
    async getNFLState(): Promise<NFLState> {
      const data = await fetchJson(`${base}/state/nfl`)
      return parseObject(data, nflStateSchema, 'nfl_state')
    },

    async getPlayers(): Promise<PlayersResponse> {
      const data = await fetchJson(`${base}/players/nfl`)
      return parseObject(data, playersResponseSchema, 'players')
    },

    async getLeague(leagueId: string): Promise<League> {
      const data = await fetchJson(`${base}/league/${leagueId}`)
      return parseObject(data, leagueSchema, `league:${leagueId}`)
    },

    async getLeagueUsers(leagueId: string): Promise<Owner[]> {
      const data = await fetchJson(`${base}/league/${leagueId}/users`)
      return parseArray(data, ownerSchema, `league_users:${leagueId}`)
    },

    async getLeagueRosters(leagueId: string): Promise<Roster[]> {
      const data = await fetchJson(`${base}/league/${leagueId}/rosters`)
      return parseArray(data, rosterSchema, `league_rosters:${leagueId}`)
    },

    async getLeagueMatchups(leagueId: string, week: number): Promise<Matchup[]> {
      const data = await fetchJson(`${base}/league/${leagueId}/matchups/${week}`)
      return parseArray(data, matchupSchema, `league_matchups:${leagueId}:week${week}`)
    },

    async getLeagueTransactions(leagueId: string, round: number): Promise<Transaction[]> {
      const data = await fetchJson(`${base}/league/${leagueId}/transactions/${round}`)
      return parseArray(data, transactionSchema, `league_transactions:${leagueId}:round${round}`)
    },

    async getDraft(draftId: string): Promise<Draft> {
      const data = await fetchJson(`${base}/draft/${draftId}`)
      return parseObject(data, draftSchema, `draft:${draftId}`)
    },

    async getDraftPicks(draftId: string): Promise<DraftPick[]> {
      const data = await fetchJson(`${base}/draft/${draftId}/picks`)
      return parseArray(data, draftPickSchema, `draft_picks:${draftId}`)
    },

    async getTradedPicks(leagueId: string): Promise<TradedPick[]> {
      const data = await fetchJson(`${base}/league/${leagueId}/traded_picks`)
      return parseArray(data, tradedPickSchema, `traded_picks:${leagueId}`)
    },

    async getWinnersBracket(leagueId: string): Promise<PlayoffMatchup[]> {
      const data = await fetchJson(`${base}/league/${leagueId}/winners_bracket`)
      return parseArray(data, playoffMatchupSchema, `winners_bracket:${leagueId}`)
    },

    async getPlayerStats(season: string, week: number): Promise<PlayerStatsResponse> {
      const data = await fetchJson(`${base}/stats/nfl/regular/${season}/${week}`)
      return parseObject(data, playerStatsResponseSchema, `player_stats:${season}:week${week}`)
    },
  }
}