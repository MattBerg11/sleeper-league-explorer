/** Row types matching the Supabase database tables */

export interface NFLStateRow {
  id: string
  season: string
  season_type: string
  week: number
  display_week: number
  season_start_date: string | null
  leg: number
  league_season: string | null
  league_create_season: string | null
  synced_at: string
}

export interface PlayerRow {
  player_id: string
  first_name: string
  last_name: string
  full_name: string | null
  position: string | null
  team: string | null
  age: number | null
  years_exp: number | null
  number: string | null
  height: string | null
  weight: string | null
  college: string | null
  status: string | null
  injury_status: string | null
  injury_body_part: string | null
  injury_notes: string | null
  fantasy_positions: string[] | null
  depth_chart_position: string | null
  depth_chart_order: number | null
  sport: string | null
  active: boolean | null
  search_rank: number | null
  search_full_name: string | null
  synced_at: string
}

export interface LeagueRow {
  league_id: string
  name: string
  season: string
  season_type: string
  status: string
  sport: string
  total_rosters: number
  previous_league_id: string | null
  draft_id: string | null
  avatar: string | null
  settings: Record<string, unknown>
  scoring_settings: Record<string, number>
  roster_positions: string[]
  metadata: Record<string, unknown> | null
  synced_at: string
}

export interface OwnerRow {
  league_id: string
  user_id: string
  display_name: string
  avatar: string | null
  team_name: string | null
  metadata: Record<string, unknown> | null
  synced_at: string
}

export interface RosterRow {
  league_id: string
  roster_id: number
  owner_id: string | null
  players: string[] | null
  starters: string[] | null
  reserve: string[] | null
  taxi: string[] | null
  wins: number
  losses: number
  ties: number
  fpts: number
  fpts_decimal: number
  fpts_against: number
  fpts_against_decimal: number
  settings: Record<string, unknown>
  metadata: Record<string, unknown> | null
  synced_at: string
}

export interface MatchupRow {
  league_id: string
  week: number
  roster_id: number
  matchup_id: number | null
  points: number | null
  custom_points: number | null
  starters: string[] | null
  starters_points: number[] | null
  players: string[] | null
  players_points: Record<string, number> | null
  synced_at: string
}

export interface TransactionRow {
  league_id: string
  transaction_id: string
  type: string
  status: string
  creator: string | null
  created: number | null
  roster_ids: number[]
  adds: Record<string, number> | null
  drops: Record<string, number> | null
  draft_picks: unknown[]
  waiver_budget: unknown[]
  settings: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  leg: number | null
  status_updated: number | null
  consenter_ids: number[] | null
  synced_at: string
}

export interface DraftRow {
  draft_id: string
  league_id: string
  type: string
  status: string
  season: string
  sport: string
  settings: Record<string, unknown>
  metadata: Record<string, unknown> | null
  start_time: number | null
  created: number | null
  last_picked: number | null
  last_message_time: number | null
  slot_to_roster_id: Record<string, number> | null
  draft_order: Record<string, number> | null
  synced_at: string
}

export interface DraftPickRow {
  draft_id: string
  pick_no: number
  round: number
  draft_slot: number
  roster_id: number
  player_id: string
  metadata: Record<string, unknown> | null
  is_keeper: boolean | null
  synced_at: string
}

export interface TradedPickRow {
  league_id: string
  season: string
  round: number
  roster_id: number
  previous_owner_id: number
  owner_id: number
  synced_at: string
}

export interface PlayoffBracketRow {
  league_id: string
  round: number
  match_id: number
  team1_roster_id: number | null
  team2_roster_id: number | null
  winner_roster_id: number | null
  loser_roster_id: number | null
  placement: number | null
  synced_at: string
}

/** View types */
export interface StandingsRow {
  league_id: string
  roster_id: number
  owner_id: string | null
  display_name: string | null
  team_name: string | null
  owner_avatar: string | null
  wins: number
  losses: number
  ties: number
  total_points_for: number
  total_points_against: number
  season: string
  league_name: string
}

export interface MatchupPairRow {
  league_id: string
  week: number
  matchup_id: number
  team1_roster_id: number
  team1_points: number | null
  team2_roster_id: number
  team2_points: number | null
  team1_name: string | null
  team2_name: string | null
  team1_team_name: string | null
  team2_team_name: string | null
}
