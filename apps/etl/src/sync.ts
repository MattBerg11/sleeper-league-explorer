import { MAX_REGULAR_SEASON_WEEKS, MAX_ROUNDS } from '@sleeper-explorer/shared'
import type { SupabaseClient, League, PlayersResponse, PlayerWeeklyStatsRow } from '@sleeper-explorer/shared'

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

/*
 * ═══════════════════════════════════════════════════════════════════════
 *  Sync Schedule & Strategy (Task 29)
 * ═══════════════════════════════════════════════════════════════════════
 *
 *  Table                Schedule            Strategy
 *  ────────────────────────────────────────────────────────────────────
 *  nfl_state            daily               Always upsert
 *  players              daily               Full upsert (11k+ rows, idempotent via PK)
 *  leagues              every 6h            Full upsert (settings can change)
 *  owners               every 6h            Full upsert (team names can change)
 *  rosters              every 6h            Full upsert (roster moves happen constantly)
 *  matchups             every 6h            All weeks 1 through current week
 *  transactions         every 6h            All rounds 1 through current week
 *  drafts               every 6h            Skip if already complete in DB
 *  draft_picks          every 6h            Skip if parent draft already complete in DB
 *  traded_picks         every 6h            Full upsert (trades can happen anytime)
 *  playoff_brackets     every 6h            Full upsert (safe default)
 *
 *  Sync Modes:
 *  - full:         Runs everything (nfl_state, players, all league data for all weeks)
 *  - daily:        nfl_state + league metadata (leagues, owners, rosters)
 *                  Does NOT include players — use 'players-only' separately.
 *                  Only syncs owners/rosters for active (non-complete) leagues.
 *  - players-only: Players only (heavy — 11k+ rows). Run separately on its own schedule.
 *  - leagues-only: Incremental league data sync (cron every 6h)
 *                  Syncs nfl_state first, then active leagues only.
 *                  Skips completed historical leagues (status === "complete").
 *                  Matchups/transactions sync all weeks 1 through current week.
 *                  Drafts skipped if already complete in DB.
 *  - initiate:     One-time sync for NEW leagues not yet in DB.
 *                  Runs full historical sync (all weeks) for new leagues only.
 *
 * ═══════════════════════════════════════════════════════════════════════
 */

export type SyncMode = 'full' | 'players-only' | 'leagues-only' | 'daily' | 'initiate'

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

// --- Helpers for incremental sync ---

/**
 * Fetch the current NFL week from the database.
 * Falls back to the Sleeper API if no nfl_state row exists yet.
 */
async function getCurrentWeek(
  client: SleeperClient,
  supabase: SupabaseClient,
): Promise<number> {
  const { data, error } = await supabase
    .from('nfl_state')
    .select('week')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()

  if (!error && data && typeof (data as Record<string, unknown>)['week'] === 'number') {
    return (data as Record<string, unknown>)['week'] as number
  }

  // Fallback: fetch from Sleeper API
  console.log('No nfl_state in DB, fetching current week from Sleeper API...')
  const state = await client.getNFLState()
  return state.week
}

/**
 * Return draft_ids that already exist with status 'complete' in the DB.
 */
async function getCompleteDraftIds(
  supabase: SupabaseClient,
  draftIds: string[],
): Promise<Set<string>> {
  if (draftIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('drafts')
    .select('draft_id')
    .in('draft_id', draftIds)
    .eq('status', 'complete')

  if (error || !data) return new Set()
  return new Set(
    (data as Record<string, unknown>[]).map((r) => r['draft_id'] as string),
  )
}

/**
 * Return league_ids that already exist in the DB.
 */
async function getExistingLeagueIds(
  supabase: SupabaseClient,
  leagueIds: string[],
): Promise<Set<string>> {
  if (leagueIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('leagues')
    .select('league_id')
    .in('league_id', leagueIds)

  if (error || !data) return new Set()
  return new Set(
    (data as Record<string, unknown>[]).map((r) => r['league_id'] as string),
  )
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
    for (const batch of batches) {
      await upsertBatch(supabase, 'players', batch, 'player_id')
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
    const leagueId = queue.shift()
    if (!leagueId) continue
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

/** Sync matchups for ALL weeks (used by full sync and initiate mode). */
async function syncMatchups(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing matchups (all weeks)...')
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

/** Sync matchups for all weeks 1 through currentWeek (incremental with backfill). */
async function syncMatchupsIncremental(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
  currentWeek: number,
): Promise<SyncEntityResult> {
  try {
    const maxWeek = Math.min(currentWeek, MAX_REGULAR_SEASON_WEEKS)
    console.log(`Syncing matchups (weeks 1-${maxWeek})...`)
    let totalCount = 0
    for (const league of leagues) {
      for (let week = 1; week <= maxWeek; week++) {
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

/** Sync transactions for ALL rounds (used by full sync and initiate mode). */
async function syncTransactions(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing transactions (all rounds)...')
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

/** Sync transactions for all rounds 1 through currentWeek (incremental with backfill). */
async function syncTransactionsIncremental(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
  currentWeek: number,
): Promise<SyncEntityResult> {
  try {
    const maxRound = Math.min(currentWeek, MAX_ROUNDS)
    console.log(`Syncing transactions (rounds 1-${maxRound})...`)
    let totalCount = 0
    for (const league of leagues) {
      for (let round = 1; round <= maxRound; round++) {
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

/** Sync all drafts (full mode — always fetches and upserts). */
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

/**
 * Sync drafts incrementally — skip drafts already marked 'complete' in DB.
 * Only fetches drafts that are new or still in 'drafting' status.
 */
async function syncDraftsIncremental(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
): Promise<{ result: SyncEntityResult; draftIds: string[] }> {
  try {
    console.log('Syncing drafts (incremental — skipping already-complete)...')

    // Collect all candidate draft IDs
    const candidateDraftIds = leagues
      .map((l) => l.draft_id)
      .filter((id): id is string => id != null)

    // Check which drafts are already complete in DB
    const completeDraftIds = await getCompleteDraftIds(supabase, candidateDraftIds)
    const skippedCount = completeDraftIds.size
    if (skippedCount > 0) {
      console.log(`Skipping ${skippedCount} already-complete draft(s)`)
    }

    const draftIds: string[] = []
    const rows: unknown[] = []

    for (const league of leagues) {
      if (!league.draft_id) continue
      if (completeDraftIds.has(league.draft_id)) continue

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

    console.log(`Synced ${rows.length} drafts (skipped ${skippedCount} complete)`)
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

async function syncPlayerStats(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
  currentWeek: number,
): Promise<SyncEntityResult> {
  try {
    console.log('Syncing player weekly stats...')

    // Collect all rostered player IDs across all leagues
    const rosteredPlayerIds = new Set<string>()
    for (const league of leagues) {
      const rosters = await client.getLeagueRosters(league.league_id)
      for (const roster of rosters) {
        if (roster.players) {
          for (const playerId of roster.players) {
            rosteredPlayerIds.add(playerId)
          }
        }
      }
    }

    if (rosteredPlayerIds.size === 0) {
      console.log('No rostered players found, skipping stats sync')
      return { entity: 'player_weekly_stats', success: true, count: 0 }
    }

    console.log(`Found ${rosteredPlayerIds.size} rostered players across ${leagues.length} league(s)`)

    // Determine the season from the first league
    const season = leagues[0].season
    const maxWeek = Math.min(currentWeek, MAX_REGULAR_SEASON_WEEKS)

    let totalCount = 0

    for (let week = 1; week <= maxWeek; week++) {
      const allStats = await client.getPlayerStats(season, week)

      // Filter to only rostered players and create rows
      const rows: PlayerWeeklyStatsRow[] = []
      for (const [playerId, stats] of Object.entries(allStats)) {
        if (!rosteredPlayerIds.has(playerId)) continue
        // Skip players with no meaningful stats (just ranking data)
        if (!stats['gp'] && !stats['pts_std']) continue

        rows.push({
          player_id: playerId,
          season,
          week,
          stats,
          synced_at: new Date().toISOString(),
        })
      }

      if (rows.length > 0) {
        // Batch upsert in chunks to avoid payload limits
        const batches = chunk(rows, PLAYER_BATCH_SIZE)
        for (const batch of batches) {
          await upsertBatch(supabase, 'player_weekly_stats', batch, 'player_id,season,week')
        }
        totalCount += rows.length
      }

      console.log(`  Week ${week}: ${rows.length} player stats`)
    }

    console.log(`Synced ${totalCount.toLocaleString()} player stat rows across ${maxWeek} weeks`)
    return { entity: 'player_weekly_stats', success: true, count: totalCount }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`Failed to sync player stats: ${message}`)
    return { entity: 'player_weekly_stats', success: false, error: message }
  }
}

// --- Sync orchestrators per mode ---

/** Full historical sync for a set of leagues (all weeks, all rounds). */
async function runLeagueFullSync(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
  results: SyncEntityResult[],
): Promise<void> {
  // Owners + rosters first (sequential to avoid rate-limiting issues)
  const ownersResult = await syncOwners(client, supabase, leagues)
  results.push(ownersResult)

  const rostersResult = await syncRosters(client, supabase, leagues)
  results.push(rostersResult)

  // Parallel: matchups (all weeks), transactions (all rounds), drafts, traded picks, playoffs
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

  // Player weekly stats (needs rosters to determine rostered players)
  const fullSyncWeek = await getCurrentWeek(client, supabase)
  const playerStatsResult = await syncPlayerStats(client, supabase, leagues, fullSyncWeek)
  results.push(playerStatsResult)
}

/** Incremental sync for leagues (current + previous week only, skip complete drafts). */
async function runLeagueIncrementalSync(
  client: SleeperClient,
  supabase: SupabaseClient,
  leagues: League[],
  currentWeek: number,
  results: SyncEntityResult[],
): Promise<void> {
  // Owners + rosters: always full upsert
  const ownersResult = await syncOwners(client, supabase, leagues)
  results.push(ownersResult)

  const rostersResult = await syncRosters(client, supabase, leagues)
  results.push(rostersResult)

  // Parallel: incremental matchups/transactions, incremental drafts, traded picks, playoffs
  const [matchupsResult, txResult, draftsData, tradedResult, playoffResult] = await Promise.all([
    syncMatchupsIncremental(client, supabase, leagues, currentWeek),
    syncTransactionsIncremental(client, supabase, leagues, currentWeek),
    syncDraftsIncremental(client, supabase, leagues),
    syncTradedPicks(client, supabase, leagues),
    syncPlayoffBrackets(client, supabase, leagues),
  ])
  results.push(matchupsResult, txResult, draftsData.result, tradedResult, playoffResult)

  if (draftsData.draftIds.length > 0) {
    const draftPicksResult = await syncDraftPicks(client, supabase, draftsData.draftIds)
    results.push(draftPicksResult)
  }

  // Player weekly stats (needs rosters to determine rostered players)
  const playerStatsResult = await syncPlayerStats(client, supabase, leagues, currentWeek)
  results.push(playerStatsResult)
}

// --- Main sync orchestrator ---

export async function runSync(options: SyncOptions): Promise<SyncResult> {
  const { supabase, leagueIds, syncMode } = options
  const client = createSleeperClient()
  const results: SyncEntityResult[] = []

  // --- daily mode: nfl_state + league metadata (no players) ---
  if (syncMode === 'daily') {
    console.log('Running daily sync (nfl_state + league metadata)...')
    const nflStateResult = await syncNFLState(client, supabase)
    results.push(nflStateResult)

    // Resolve the full league chain
    console.log('Resolving league chains...')
    const allLeagues = await resolveLeagueChain(client, leagueIds)
    if (allLeagues.length === 0) {
      console.warn('No leagues found from provided IDs.')
      results.push({ entity: 'leagues', success: true, count: 0 })
      return { results }
    }

    // Only upsert active (non-complete) leagues to avoid overwriting historical data
    const activeLeagues = allLeagues.filter((l) => l.status !== 'complete')
    const skippedCount = allLeagues.length - activeLeagues.length
    if (skippedCount > 0) {
      console.log(`Skipping ${skippedCount} completed historical league(s)`)
    }

    if (activeLeagues.length > 0) {
      const leagueRows = activeLeagues.map(transformLeague)
      await upsertBatch(supabase, 'leagues', leagueRows, 'league_id')
      console.log(`Synced ${activeLeagues.length} active league(s)`)
      results.push({ entity: 'leagues', success: true, count: activeLeagues.length })

      // Sync owners + rosters for active leagues only
      const ownersResult = await syncOwners(client, supabase, activeLeagues)
      results.push(ownersResult)

      const rostersResult = await syncRosters(client, supabase, activeLeagues)
      results.push(rostersResult)
    } else {
      console.log('All leagues are completed. Nothing to sync.')
      results.push({ entity: 'leagues', success: true, count: 0 })
    }

    return { results }
  }

  // --- players-only mode (legacy, prefer 'daily') ---
  if (syncMode === 'players-only') {
    const playersResult = await syncPlayers(client, supabase)
    results.push(playersResult)
    return { results }
  }

  // --- initiate mode: only sync leagues NOT already in DB ---
  if (syncMode === 'initiate') {
    console.log('Running initiate sync (new leagues only)...')

    // Resolve the full league chain from the provided IDs
    const allLeagues = await resolveLeagueChain(client, leagueIds)
    if (allLeagues.length === 0) {
      console.warn('No leagues found from provided IDs.')
      return { results }
    }

    // Determine which leagues are already in the database
    const allLeagueIds = allLeagues.map((l) => l.league_id)
    const existingIds = await getExistingLeagueIds(supabase, allLeagueIds)

    const newLeagues = allLeagues.filter((l) => !existingIds.has(l.league_id))
    const skippedCount = allLeagues.length - newLeagues.length

    if (skippedCount > 0) {
      console.log(`Skipping ${skippedCount} league(s) already in DB`)
    }

    if (newLeagues.length === 0) {
      console.log('All leagues already exist in DB. Nothing to initiate.')
      results.push({ entity: 'initiate', success: true, count: 0 })
      return { results }
    }

    console.log(`Initiating full sync for ${newLeagues.length} new league(s)...`)

    // Upsert the new league rows
    const leagueRows = newLeagues.map(transformLeague)
    await upsertBatch(supabase, 'leagues', leagueRows, 'league_id')
    results.push({ entity: 'leagues', success: true, count: newLeagues.length })

    // Run full historical sync for new leagues only
    await runLeagueFullSync(client, supabase, newLeagues, results)

    return { results }
  }

  // --- leagues-only mode (incremental) ---
  if (syncMode === 'leagues-only') {
    // Sync nfl_state first so current week is available in DB
    const nflStateResult = await syncNFLState(client, supabase)
    results.push(nflStateResult)

    // Resolve the full league chain but only upsert active (non-complete) leagues
    console.log('Resolving league chains...')
    const allLeagues = await resolveLeagueChain(client, leagueIds)
    if (allLeagues.length === 0) {
      console.warn('No leagues found from provided IDs.')
      results.push({ entity: 'leagues', success: true, count: 0 })
      return { results }
    }

    const activeLeagues = allLeagues.filter((l) => l.status !== 'complete')
    const skippedCount = allLeagues.length - activeLeagues.length
    if (skippedCount > 0) {
      console.log(`Skipping ${skippedCount} completed historical league(s)`)
    }

    if (activeLeagues.length === 0) {
      console.log('All leagues are completed. Nothing to sync incrementally.')
      results.push({ entity: 'leagues', success: true, count: 0 })
      return { results }
    }

    // Upsert only active league rows
    const leagueRows = activeLeagues.map(transformLeague)
    await upsertBatch(supabase, 'leagues', leagueRows, 'league_id')
    console.log(`Synced ${activeLeagues.length} active league(s) (skipped ${skippedCount} complete)`)
    results.push({ entity: 'leagues', success: true, count: activeLeagues.length })

    // Determine current week for incremental sync
    const currentWeek = await getCurrentWeek(client, supabase)
    console.log(`Incremental sync using current week: ${currentWeek}`)

    // Only sync dependent entities for active leagues
    await runLeagueIncrementalSync(client, supabase, activeLeagues, currentWeek, results)

    return { results }
  }

  // --- full mode ---
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

  // Full historical sync for all leagues
  await runLeagueFullSync(client, supabase, leagues, results)

  return { results }
}