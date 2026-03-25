import { z } from 'zod'

// NFL State
export const nflStateSchema = z.object({
  season: z.string(),
  season_type: z.string(),
  week: z.number(),
  display_week: z.number(),
  season_start_date: z.string().optional(),
  leg: z.number(),
  league_season: z.string().optional(),
  league_create_season: z.string().optional(),
})
export type NFLState = z.infer<typeof nflStateSchema>

// Player (from the Record<string, Player> response)
export const playerSchema = z.object({
  player_id: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string().nullish(),
  position: z.string().nullish(),
  team: z.string().nullish(),
  age: z.number().nullish(),
  years_exp: z.number().nullish(),
  number: z.union([z.number(), z.string()]).nullish(),
  height: z.string().nullish(),
  weight: z.string().nullish(),
  college: z.string().nullish(),
  status: z.string().nullish(),
  injury_status: z.string().nullish(),
  injury_body_part: z.string().nullish(),
  injury_notes: z.string().nullish(),
  fantasy_positions: z.array(z.string()).nullish(),
  depth_chart_position: z.string().nullish(),
  depth_chart_order: z.number().nullish(),
  sport: z.string().optional(),
  active: z.boolean().optional(),
  search_rank: z.number().nullish(),
  search_full_name: z.string().nullish(),
}).passthrough()
export type Player = z.infer<typeof playerSchema>

export const playersResponseSchema = z.record(z.string(), playerSchema)
export type PlayersResponse = z.infer<typeof playersResponseSchema>

// League
export const leagueSchema = z.object({
  league_id: z.string(),
  name: z.string(),
  season: z.string(),
  season_type: z.string(),
  status: z.string(),
  sport: z.string(),
  total_rosters: z.number(),
  previous_league_id: z.string().nullish(),
  draft_id: z.string().nullish(),
  avatar: z.string().nullish(),
  settings: z.record(z.string(), z.unknown()).default({}),
  scoring_settings: z.record(z.string(), z.number()).default({}),
  roster_positions: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).nullish(),
}).passthrough()
export type League = z.infer<typeof leagueSchema>

// Owner (User in a league context)
export const ownerSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  avatar: z.string().nullish(),
  metadata: z.object({
    team_name: z.string().optional(),
  }).passthrough().nullish(),
}).passthrough()
export type Owner = z.infer<typeof ownerSchema>

// Roster
export const rosterSchema = z.object({
  roster_id: z.number(),
  league_id: z.string(),
  owner_id: z.string().nullish(),
  players: z.array(z.string()).nullish(),
  starters: z.array(z.string()).nullish(),
  reserve: z.array(z.string()).nullish(),
  taxi: z.array(z.string()).nullish(),
  settings: z.object({
    wins: z.number().optional(),
    losses: z.number().optional(),
    ties: z.number().optional(),
    fpts: z.number().optional(),
    fpts_decimal: z.number().optional(),
    fpts_against: z.number().optional(),
    fpts_against_decimal: z.number().optional(),
  }).passthrough().default({}),
  metadata: z.record(z.string(), z.unknown()).nullish(),
}).passthrough()
export type Roster = z.infer<typeof rosterSchema>

// Matchup
export const matchupSchema = z.object({
  roster_id: z.number(),
  matchup_id: z.number().nullish(),
  points: z.number().nullish(),
  custom_points: z.number().nullish(),
  starters: z.array(z.string()).nullish(),
  starters_points: z.array(z.number()).nullish(),
  players: z.array(z.string()).nullish(),
  players_points: z.record(z.string(), z.number()).nullish(),
}).passthrough()
export type Matchup = z.infer<typeof matchupSchema>

// Transaction
export const transactionSchema = z.object({
  transaction_id: z.string(),
  type: z.string(),
  status: z.string(),
  creator: z.string().nullish(),
  created: z.number().nullish(),
  roster_ids: z.array(z.number()).default([]),
  adds: z.record(z.string(), z.number()).nullish(),
  drops: z.record(z.string(), z.number()).nullish(),
  draft_picks: z.array(z.unknown()).default([]),
  waiver_budget: z.array(z.unknown()).default([]),
  settings: z.record(z.string(), z.unknown()).nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  leg: z.number().nullish(),
  status_updated: z.number().nullish(),
  consenter_ids: z.array(z.number()).nullish(),
}).passthrough()
export type Transaction = z.infer<typeof transactionSchema>

// Draft
export const draftSchema = z.object({
  draft_id: z.string(),
  league_id: z.string(),
  type: z.string(),
  status: z.string(),
  season: z.string(),
  sport: z.string(),
  settings: z.record(z.string(), z.unknown()).default({}),
  metadata: z.record(z.string(), z.unknown()).nullish(),
  start_time: z.number().nullish(),
  created: z.number().nullish(),
  last_picked: z.number().nullish(),
  last_message_time: z.number().nullish(),
  slot_to_roster_id: z.record(z.string(), z.number()).nullish(),
  draft_order: z.record(z.string(), z.number()).nullish(),
}).passthrough()
export type Draft = z.infer<typeof draftSchema>

// Draft Pick
export const draftPickSchema = z.object({
  round: z.number(),
  pick_no: z.number(),
  draft_slot: z.number(),
  roster_id: z.number(),
  player_id: z.string(),
  metadata: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    team: z.string().optional(),
    position: z.string().optional(),
  }).passthrough().nullish(),
  is_keeper: z.boolean().nullish(),
}).passthrough()
export type DraftPick = z.infer<typeof draftPickSchema>

// Traded Pick
export const tradedPickSchema = z.object({
  season: z.string(),
  round: z.number(),
  roster_id: z.number(),
  previous_owner_id: z.number(),
  owner_id: z.number(),
}).passthrough()
export type TradedPick = z.infer<typeof tradedPickSchema>

// Playoff Bracket Matchup
export const playoffMatchupSchema = z.object({
  r: z.number(),
  m: z.number(),
  t1: z.number().nullish(),
  t2: z.number().nullish(),
  w: z.number().nullish(),
  l: z.number().nullish(),
  p: z.number().optional(),
}).passthrough()
export type PlayoffMatchup = z.infer<typeof playoffMatchupSchema>