-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_search ON players(search_full_name);
CREATE INDEX IF NOT EXISTS idx_players_active ON players(active);

CREATE INDEX IF NOT EXISTS idx_leagues_season ON leagues(season);
CREATE INDEX IF NOT EXISTS idx_leagues_previous ON leagues(previous_league_id);

CREATE INDEX IF NOT EXISTS idx_owners_user_id ON owners(user_id);

CREATE INDEX IF NOT EXISTS idx_rosters_owner_id ON rosters(owner_id);

CREATE INDEX IF NOT EXISTS idx_matchups_week ON matchups(league_id, week);
CREATE INDEX IF NOT EXISTS idx_matchups_matchup_id ON matchups(league_id, week, matchup_id);

CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created);

CREATE INDEX IF NOT EXISTS idx_drafts_league_id ON drafts(league_id);

CREATE INDEX IF NOT EXISTS idx_draft_picks_player ON draft_picks(player_id);
CREATE INDEX IF NOT EXISTS idx_draft_picks_roster ON draft_picks(roster_id);
