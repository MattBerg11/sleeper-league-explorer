-- Player weekly stats from Sleeper API /stats/nfl/regular/{season}/{week}
CREATE TABLE IF NOT EXISTS player_weekly_stats (
  player_id TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}',
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (player_id, season, week)
);

-- Index for efficient week-based lookups
CREATE INDEX IF NOT EXISTS idx_player_weekly_stats_season_week 
  ON player_weekly_stats(season, week);

-- Enable RLS
ALTER TABLE player_weekly_stats ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON player_weekly_stats FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "Service role write access" ON player_weekly_stats FOR ALL USING (auth.role() = 'service_role');