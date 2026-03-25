-- NFL State
CREATE TABLE IF NOT EXISTS nfl_state (
  id TEXT PRIMARY KEY,  -- e.g. 'nfl_2025'
  season TEXT NOT NULL,
  season_type TEXT NOT NULL,
  week INTEGER NOT NULL,
  display_week INTEGER NOT NULL,
  season_start_date TEXT,
  leg INTEGER NOT NULL,
  league_season TEXT,
  league_create_season TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players (11k+ records)
CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT,
  position TEXT,
  team TEXT,
  age INTEGER,
  years_exp INTEGER,
  number TEXT,
  height TEXT,
  weight TEXT,
  college TEXT,
  status TEXT,
  injury_status TEXT,
  injury_body_part TEXT,
  injury_notes TEXT,
  fantasy_positions JSONB,
  depth_chart_position TEXT,
  depth_chart_order INTEGER,
  sport TEXT,
  active BOOLEAN,
  search_rank INTEGER,
  search_full_name TEXT,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leagues
CREATE TABLE IF NOT EXISTS leagues (
  league_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  season_type TEXT NOT NULL,
  status TEXT NOT NULL,
  sport TEXT NOT NULL,
  total_rosters INTEGER NOT NULL,
  previous_league_id TEXT,
  draft_id TEXT,
  avatar TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  scoring_settings JSONB NOT NULL DEFAULT '{}',
  roster_positions JSONB NOT NULL DEFAULT '[]',
  metadata JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Owners (users per league)
CREATE TABLE IF NOT EXISTS owners (
  league_id TEXT NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar TEXT,
  team_name TEXT,
  metadata JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, user_id)
);

-- Rosters
CREATE TABLE IF NOT EXISTS rosters (
  league_id TEXT NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  roster_id INTEGER NOT NULL,
  owner_id TEXT,
  players JSONB,
  starters JSONB,
  reserve JSONB,
  taxi JSONB,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  ties INTEGER NOT NULL DEFAULT 0,
  fpts NUMERIC(10,2) NOT NULL DEFAULT 0,
  fpts_decimal NUMERIC(10,2) NOT NULL DEFAULT 0,
  fpts_against NUMERIC(10,2) NOT NULL DEFAULT 0,
  fpts_against_decimal NUMERIC(10,2) NOT NULL DEFAULT 0,
  settings JSONB NOT NULL DEFAULT '{}',
  metadata JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, roster_id)
);

-- Matchups
CREATE TABLE IF NOT EXISTS matchups (
  league_id TEXT NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  week INTEGER NOT NULL,
  roster_id INTEGER NOT NULL,
  matchup_id INTEGER,
  points NUMERIC(10,2),
  custom_points NUMERIC(10,2),
  starters JSONB,
  starters_points JSONB,
  players JSONB,
  players_points JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, week, roster_id)
);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  league_id TEXT NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  transaction_id TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  creator TEXT,
  created BIGINT,
  roster_ids JSONB,
  adds JSONB,
  drops JSONB,
  draft_picks JSONB,
  waiver_budget JSONB,
  settings JSONB,
  metadata JSONB,
  leg INTEGER,
  status_updated BIGINT,
  consenter_ids JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, transaction_id)
);

-- Drafts
CREATE TABLE IF NOT EXISTS drafts (
  draft_id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  season TEXT NOT NULL,
  sport TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  metadata JSONB,
  start_time BIGINT,
  created BIGINT,
  last_picked BIGINT,
  last_message_time BIGINT,
  slot_to_roster_id JSONB,
  draft_order JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Draft Picks
CREATE TABLE IF NOT EXISTS draft_picks (
  draft_id TEXT NOT NULL REFERENCES drafts(draft_id) ON DELETE CASCADE,
  pick_no INTEGER NOT NULL,
  round INTEGER NOT NULL,
  draft_slot INTEGER NOT NULL,
  roster_id INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  metadata JSONB,
  is_keeper BOOLEAN,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (draft_id, pick_no)
);

-- Traded Picks
CREATE TABLE IF NOT EXISTS traded_picks (
  league_id TEXT NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  round INTEGER NOT NULL,
  roster_id INTEGER NOT NULL,
  previous_owner_id INTEGER NOT NULL,
  owner_id INTEGER NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, season, round, roster_id, owner_id)
);

-- Playoff Brackets (winners bracket)
CREATE TABLE IF NOT EXISTS playoff_brackets (
  league_id TEXT NOT NULL REFERENCES leagues(league_id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  team1_roster_id INTEGER,
  team2_roster_id INTEGER,
  winner_roster_id INTEGER,
  loser_roster_id INTEGER,
  placement INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (league_id, round, match_id)
);
