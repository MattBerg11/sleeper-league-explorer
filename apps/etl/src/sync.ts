import { MAX_REGULAR_SEASON_WEEKS, MAX_ROUNDS } from '@sleeper-explorer/shared'
import type { SupabaseClient, League, PlayersResponse } from '@sleeper-explorer/shared'

import { createSleeperClient } from './sleeper-client'
import type { SleeperClient } from './sleeper-client'
import {
  transformNFLState,
  transformPlayer,
  transformLeague,
  transformOwner,
  transformRoster,
  transformMatchup,
  transformTransaction,
  transformDraft,
  transformDraftPick,
  transformTradedPick,
  transformPlayoffMatchup,
} from './transformers'

export type SyncMode = 'full' | 'players-only' | 'leagues-only'

export interface SyncOptions {
  supabase: SupabaseClient
  leagueIds: string[]
  syncMode: SyncMode
}

export interface SyncEntityResult {
  entity: string
  success: boolean
  count?: number
  error?: string
}

export interface SyncResult {
  results: SyncEntityResult[]
}

const PLAYER_BATCH_SIZE = 500

async function upsertBatch(
  supabase: SupabaseClient,
  table: string,
  rows: unknown[],
  onConflict: string,
): Promise<void> {
  if (rows.length === 0) return
  const { error } = await supabase
    .from(table)
    .upsert(rows as Record<string, unknown>[], { onConflict })
  if (error) {
    throw new Error(`Upsert to ${table} failed: ${error.message}`)
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

// --- Individual sync functions ---

async function syncNFLState(
  client: SleeperClient,
  supabase: SupabaseClient,
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing nfl_state...')
    const state = await client.getNFLState()
    const row = transformNFLState(state)
    await upsertBatch(supabase, 'nfl_state', [row] as unknown[], 'id')
    console.log(`Synced nfl_state (season: ${state.season}, week: ${state.week})`)
    return { entity: 'nfl_state', success: true, count: 1 }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync nfl_state: ${message}`)
    return { entity: 'nfl_state', success: false, error: message }
  }
}

async function syncPlayers(
  client: SleeperClient,
  supabase: SupabaseClient,
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing players...')
    const players: PlayersResponse = await client.getPlayers()
    const rows = Object.values(players).map(transformPlayer)

    const batches = chunk(rows, PLAYER_BATCH_SIZE)
    for (let i = 0; i < batches.length; i++) {
      await upsertBatch(supabase, 'players', batches[i]!, 'player_id')
    }

    console.log(`Synced ${rows.length.toLocaleString()} players in ${batches.length} batches`)
    return { entity: 'players', success: true, count: rows.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync players: ${message}`)
    return { entity: 'players', success: false, error: message }
  }
}

/**
 * Traverse the league history chain starting from the given league IDs.
 * Follows `previous_league_id` to collect all historical league IDs.
 */
async function resolveLeagueChain(
  client: SleeperClient,
  startIds: string[],
): Promise<League[]> {
  const visited = new Set<string>()
  const allLeagues: League[] = []
  const queue = [...startIds]

  while (queue.length > 0) {
    const leagueId = queue.shift()!
    if (visited.has(leagueId)) continue
    visited.add(leagueId)

    try {
      const league = await client.getLeague(leagueId)
      allLeagues.push(league)
      if (league.previous_league_id) {
        queue.push(league.previous_league_id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`Could not fetch league ${leagueId}: ${message}`)
    }
  }

  return allLeagues
}

async function syncLeagues(
  client: SleeperClient,
  supabase: SupabaseClient,
  startIds: string[],
): Promise<{ result: SyncEntityResult; leagues: League[] }> {
  try {
    console.log('Syncing leagues (including history)...')
    const leagues = await resolveLeagueChain(client, startIds)
    const rows = leagues.map(transformLeague)
    await upsertBatch(supabase, 'leagues', rows, 'league_id')
    console.log(`Synced ${leagues.length} leagues`)
    return {
      result: { entity: 'leagues', success: true, count: leagues.length },
      leagues,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync leagues: ${message}`)
    return {
      result: { entity: 'leagues', success: false, error: message },
      leagues: [],
    }
  }
}

async function syncOwners(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing owners...')
    let totalCount = 0
    for (const league of leagues) {
      const owners = await client.getLeagueUsers(league.league_id)
      const rows = owners.map((o) => transformOwner(o, league.league_id))
      await upsertBatch(supabase, 'owners', rows, 'league_id,user_id')
      totalCount += rows.length
    }
    console.log(`Synced ${totalCount} owners across ${leagues.length} leagues`)
    return { entity: 'owners', success: true, count: totalCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync owners: ${message}`)
    return { entity: 'owners', success: false, error: message }
  }
}

async function syncRosters(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing rosters...')
    let totalCount = 0
    for (const league of leagues) {
      const rosters = await client.getLeagueRosters(league.league_id)
      const rows = rosters.map(transformRoster)
      await upsertBatch(supabase, 'rosters', rows, 'league_id,roster_id')
      totalCount += rows.length
    }
    console.log(`Synced ${totalCount} rosters`)
    return { entity: 'rosters', success: true, count: totalCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync rosters: ${message}`)
    return { entity: 'rosters', success: false, error: message }
  }
}

async function syncMatchups(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing matchups...')
    let totalCount = 0
    for (const league of leagues) {
      for (let week = 1; week <= MAX_REGULAR_SEASON_WEEKS; week++) {
        const matchups = await client.getLeagueMatchups(league.league_id, week)
        if (matchups.length === 0) continue
        const rows = matchups.map((m) => transformMatchup(m, league.league_id, week))
        await upsertBatch(supabase, 'matchups', rows, 'league_id,week,roster_id')
        totalCount += rows.length
      }
    }
    console.log(`Synced ${totalCount.toLocaleString()} matchup rows`)
    return { entity: 'matchups', success: true, count: totalCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync matchups: ${message}`)
    return { entity: 'matchups', success: false, error: message }
  }
}

async function syncTransactions(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing transactions...')
    let totalCount = 0
    for (const league of leagues) {
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const transactions = await client.getLeagueTransactions(league.league_id, round)
        if (transactions.length === 0) continue
        const rows = transactions.map((t) => transformTransaction(t, league.league_id))
        await upsertBatch(supabase, 'transactions', rows, 'league_id,transaction_id')
        totalCount += rows.length
      }
    }
    console.log(`Synced ${totalCount.toLocaleString()} transactions`)
    return { entity: 'transactions', success: true, count: totalCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync transactions: ${message}`)
    return { entity: 'transactions', success: false, error: message }
  }
}

async function syncDrafts(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<{ result: SyncEntityResult; draftIds: string[] }> {
  try {
    console.log('Syncing drafts...')
    const draftIds: string[] = []
    const rows: unknown[] = []

    for (const league of leagues) {
      if (!league.draft_id) continue
      try {
        const draft = await client.getDraft(league.draft_id)
        rows.push(transformDraft(draft))
        draftIds.push(draft.draft_id)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(`Skipping draft ${league.draft_id}: ${message}`)
      }
    }

    if (rows.length > 0) {
      await upsertBatch(supabase, 'drafts', rows, 'draft_id')
    }

    console.log(`Synced ${rows.length} drafts`)
    return {
      result: { entity: 'drafts', success: true, count: rows.length },
      draftIds,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync drafts: ${message}`)
    return {
      result: { entity: 'drafts', success: false, error: message },
      draftIds: [],
    }
  }
}

async function syncDraftPicks(
  client: SleeperClient,
  supabase: SupabaseClient,
  draftIds: string[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing draft picks...')
    let totalCount = 0
    for (const draftId of draftIds) {
      const picks = await client.getDraftPicks(draftId)
      if (picks.length === 0) continue
      const rows = picks.map((p) => transformDraftPick(p, draftId))
      await upsertBatch(supabase, 'draft_picks', rows, 'draft_id,pick_no')
      totalCount += rows.length
    }
    console.log(`Synced ${totalCount.toLocaleString()} draft picks`)
    return { entity: 'draft_picks', success: true, count: totalCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync draft picks: ${message}`)
    return { entity: 'draft_picks', success: false, error: message }
  }
}

async function syncTradedPicks(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing traded picks...')
    let totalCount = 0
    for (const league of leagues) {
      const picks = await client.getTradedPicks(league.league_id)
      if (picks.length === 0) continue
      const rows = picks.map((p) => transformTradedPick(p, league.league_id))
      await upsertBatch(supabase, 'traded_picks', rows, 'league_id,season,round,roster_id,owner_id')
      totalCount += rows.length
    }
    console.log(`Synced ${totalCount} traded picks`)
    return { entity: 'traded_picks', success: true, count: totalCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync traded picks: ${message}`)
    return { entity: 'traded_picks', success: false, error: message }
  }
}

async function syncPlayoffBrackets(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing playoff brackets...')
    let totalCount = 0
    for (const league of leagues) {
      const matchups = await client.getWinnersBracket(league.league_id)
      if (matchups.length === 0) continue
      const rows = matchups.map((m) => transformPlayoffMatchup(m, league.league_id))
      await upsertBatch(supabase, 'playoff_brackets', rows, 'league_id,round,match_id')
      totalCount += rows.length
    }
    console.log(`Synced ${totalCount} playoff bracket matchups`)
    return { entity: 'playoff_brackets', success: true, count: totalCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync playoff brackets: ${message}`)
    return { entity: 'playoff_brackets', success: false, error: message }
  }
}

// --- Main sync orchestrator ---

export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const { supabase, leagueIds, syncMode } = options
  const client = createSleeperClient()
  const results: SyncEntityResult[] = []

  // Wave 1: NFL state, players, leagues (parallel)
  if (syncMode === 'players-only') {
    const playersResult = await syncPlayers(client, supabase)
    results.push(playersResult)
    return { results }
  }

  if (syncMode === 'leagues-only') {
    const { result: leaguesResult, leagues } = await syncLeagues(client, supabase, leagueIds)
    results.push(leaguesResult)
    if (!leaguesResult.success || leagues.length === 0) return { results }

    // Also sync league-dependent entities
    const ownersResult = await syncOwners(client, supabase, leagues)
    results.push(ownersResult)

    const rostersResult = await syncRosters(client, supabase, leagues)
    results.push(rostersResult)

    const [matchupsResult, txResult, draftsData, tradedResult, playoffResult] = await Promise.all([
      syncMatchups(client, supabase, leagues),
      syncTransactions(client, supabase, leagues),
      syncDrafts(client, supabase, leagues),
      syncTradedPicks(client, supabase, leagues),
      syncPlayoffBrackets(client, supabase, leagues),
    ])
    results.push(matchupsResult, txResult, draftsData.result, tradedResult, playoffResult)

    if (draftsData.draftIds.length > 0) {
      const draftPicksResult = await syncDraftPicks(client, supabase, draftsData.draftIds)
      results.push(draftPicksResult)
    }

    return { results }
  }

  // Full sync
  // Wave 1: nfl_state + players + leagues (parallel)
  const [nflStateResult, playersResult, leaguesData] = await Promise.all([
    syncNFLState(client, supabase),
    syncPlayers(client, supabase),
    syncLeagues(client, supabase, leagueIds),
  ])
  results.push(nflStateResult, playersResult, leaguesData.result)

  const { leagues } = leaguesData
  if (leagues.length === 0) {
    console.warn('No leagues found. Skipping league-dependent sync.')
    return { results }
  }

  // Wave 2: owners
  const ownersResult = await syncOwners(client, supabase, leagues)
  results.push(ownersResult)

  // Wave 3: rosters
  const rostersResult = await syncRosters(client, supabase, leagues)
  results.push(rostersResult)

  // Wave 4: matchups, transactions, drafts, traded_picks, playoff_brackets (parallel)
  const [matchupsResult, txResult, draftsData, tradedResult, playoffResult] = await Promise.all([
    syncMatchups(client, supabase, leagues),
    syncTransactions(client, supabase, leagues),
    syncDrafts(client, supabase, leagues),
    syncTradedPicks(client, supabase, leagues),
    syncPlayoffBrackets(client, supabase, leagues),
  ])
  results.push(matchupsResult, txResult, draftsData.result, tradedResult, playoffResult)

  // Wave 5: draft picks (needs draft IDs from wave 4)
  if (draftsData.draftIds.length > 0) {
    const draftPicksResult = await syncDraftPicks(client, supabase, draftsData.draftIds)
    results.push(draftPicksResult)
  }

  return { results }
}