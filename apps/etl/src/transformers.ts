import type {
  NFLState,
  Player,
  League,
  Owner,
  Roster,
  Matchup,
  Transaction,
  Draft,
  DraftPick,
  TradedPick,
  PlayoffMatchup,
  NFLStateRow,
  PlayerRow,
  LeagueRow,
  OwnerRow,
  RosterRow,
  MatchupRow,
  TransactionRow,
  DraftRow,
  DraftPickRow,
  TradedPickRow,
  PlayoffBracketRow,
} from '@sleeper-explorer/shared'

function nowISO(): string {
  return new Date().toISOString()
}

export function transformNFLState(state: NFLState): NFLStateRow {
  return {
    id: `nfl_${state.season}`,
    season: state.season,
    season_type: state.season_type,
    week: state.week,
    display_week: state.display_week,
    season_start_date: state.season_start_date ?? null,
    leg: state.leg,
    league_season: state.league_season ?? null,
    league_create_season: state.league_create_season ?? null,
    synced_at: nowISO(),
  }
}

export function transformPlayer(player: Player): PlayerRow {
  return {
    player_id: player.player_id,
    first_name: player.first_name,
    last_name: player.last_name,
    full_name: player.full_name ?? null,
    position: player.position ?? null,
    team: player.team ?? null,
    age: player.age ?? null,
    years_exp: player.years_exp ?? null,
    number: player.number != null ? String(player.number) : null,
    height: player.height ?? null,
    weight: player.weight ?? null,
    college: player.college ?? null,
    status: player.status ?? null,
    injury_status: player.injury_status ?? null,
    injury_body_part: player.injury_body_part ?? null,
    injury_notes: player.injury_notes ?? null,
    fantasy_positions: player.fantasy_positions ?? null,
    depth_chart_position: player.depth_chart_position ?? null,
    depth_chart_order: player.depth_chart_order ?? null,
    sport: player.sport ?? null,
    active: player.active ?? null,
    search_rank: player.search_rank ?? null,
    search_full_name: player.search_full_name ?? null,
    synced_at: nowISO(),
  }
}

export function transformLeague(league: League): LeagueRow {
  return {
    league_id: league.league_id,
    name: league.name,
    season: league.season,
    season_type: league.season_type,
    status: league.status,
    sport: league.sport,
    total_rosters: league.total_rosters,
    previous_league_id: league.previous_league_id ?? null,
    draft_id: league.draft_id ?? null,
    avatar: league.avatar ?? null,
    settings: league.settings,
    scoring_settings: league.scoring_settings,
    roster_positions: league.roster_positions,
    metadata: league.metadata ?? null,
    synced_at: nowISO(),
  }
}

export function transformOwner(owner: Owner, leagueId: string): OwnerRow {
  return {
    league_id: leagueId,
    user_id: owner.user_id,
    display_name: owner.display_name,
    avatar: owner.avatar ?? null,
    team_name: owner.metadata?.team_name ?? null,
    metadata: (owner.metadata as Record<string, unknown> | null) ?? null,
    synced_at: nowISO(),
  }
}

export function transformRoster(roster: Roster): RosterRow {
  return {
    league_id: roster.league_id,
    roster_id: roster.roster_id,
    owner_id: roster.owner_id ?? null,
    players: roster.players ?? null,
    starters: roster.starters ?? null,
    reserve: roster.reserve ?? null,
    taxi: roster.taxi ?? null,
    wins: roster.settings.wins ?? 0,
    losses: roster.settings.losses ?? 0,
    ties: roster.settings.ties ?? 0,
    fpts: roster.settings.fpts ?? 0,
    fpts_decimal: roster.settings.fpts_decimal ?? 0,
    fpts_against: roster.settings.fpts_against ?? 0,
    fpts_against_decimal: roster.settings.fpts_against_decimal ?? 0,
    settings: roster.settings as Record<string, unknown>,
    metadata: (roster.metadata as Record<string, unknown> | null) ?? null,
    synced_at: nowISO(),
  }
}

export function transformMatchup(matchup: Matchup, leagueId: string, week: number): MatchupRow {
  return {
    league_id: leagueId,
    week,
    roster_id: matchup.roster_id,
    matchup_id: matchup.matchup_id ?? null,
    points: matchup.points ?? null,
    custom_points: matchup.custom_points ?? null,
    starters: matchup.starters ?? null,
    starters_points: matchup.starters_points ?? null,
    players: matchup.players ?? null,
    players_points: matchup.players_points ?? null,
    synced_at: nowISO(),
  }
}

export function transformTransaction(transaction: Transaction, leagueId: string): TransactionRow {
  return {
    league_id: leagueId,
    transaction_id: transaction.transaction_id,
    type: transaction.type,
    status: transaction.status,
    creator: transaction.creator ?? null,
    created: transaction.created ?? null,
    roster_ids: transaction.roster_ids,
    adds: transaction.adds ?? null,
    drops: transaction.drops ?? null,
    draft_picks: transaction.draft_picks,
    waiver_budget: transaction.waiver_budget,
    settings: (transaction.settings as Record<string, unknown> | null) ?? null,
    metadata: (transaction.metadata as Record<string, unknown> | null) ?? null,
    leg: transaction.leg ?? null,
    status_updated: transaction.status_updated ?? null,
    consenter_ids: transaction.consenter_ids ?? null,
    synced_at: nowISO(),
  }
}

export function transformDraft(draft: Draft): DraftRow {
  return {
    draft_id: draft.draft_id,
    league_id: draft.league_id,
    type: draft.type,
    status: draft.status,
    season: draft.season,
    sport: draft.sport,
    settings: draft.settings,
    metadata: (draft.metadata as Record<string, unknown> | null) ?? null,
    start_time: draft.start_time ?? null,
    created: draft.created ?? null,
    last_picked: draft.last_picked ?? null,
    last_message_time: draft.last_message_time ?? null,
    slot_to_roster_id: draft.slot_to_roster_id ?? null,
    draft_order: draft.draft_order ?? null,
    synced_at: nowISO(),
  }
}

export function transformDraftPick(pick: DraftPick, draftId: string): DraftPickRow {
  return {
    draft_id: draftId,
    pick_no: pick.pick_no,
    round: pick.round,
    draft_slot: pick.draft_slot,
    roster_id: pick.roster_id,
    player_id: pick.player_id,
    metadata: (pick.metadata as Record<string, unknown> | null) ?? null,
    is_keeper: pick.is_keeper ?? null,
    synced_at: nowISO(),
  }
}

export function transformTradedPick(pick: TradedPick, leagueId: string): TradedPickRow {
  return {
    league_id: leagueId,
    season: pick.season,
    round: pick.round,
    roster_id: pick.roster_id,
    previous_owner_id: pick.previous_owner_id,
    owner_id: pick.owner_id,
    synced_at: nowISO(),
  }
}

export function transformPlayoffMatchup(
  matchup: PlayoffMatchup,
  leagueId: string,
): PlayoffBracketRow {
  return {
    league_id: leagueId,
    round: matchup.r,
    match_id: matchup.m,
    team1_roster_id: matchup.t1 ?? null,
    team2_roster_id: matchup.t2 ?? null,
    winner_roster_id: matchup.w ?? null,
    loser_roster_id: matchup.l ?? null,
    placement: matchup.p ?? null,
    synced_at: nowISO(),
  }
}