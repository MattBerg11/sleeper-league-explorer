-- Enable Row Level Security on all tables
ALTER TABLE nfl_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE traded_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playoff_brackets ENABLE ROW LEVEL SECURITY;

-- Public read access (anon key)
CREATE POLICY "Public read access" ON nfl_state FOR SELECT USING (true);
CREATE POLICY "Public read access" ON players FOR SELECT USING (true);
CREATE POLICY "Public read access" ON leagues FOR SELECT USING (true);
CREATE POLICY "Public read access" ON owners FOR SELECT USING (true);
CREATE POLICY "Public read access" ON rosters FOR SELECT USING (true);
CREATE POLICY "Public read access" ON matchups FOR SELECT USING (true);
CREATE POLICY "Public read access" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON drafts FOR SELECT USING (true);
CREATE POLICY "Public read access" ON draft_picks FOR SELECT USING (true);
CREATE POLICY "Public read access" ON traded_picks FOR SELECT USING (true);
CREATE POLICY "Public read access" ON playoff_brackets FOR SELECT USING (true);

-- Service role write access (for ETL)
CREATE POLICY "Service role write access" ON nfl_state FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON players FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON leagues FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON owners FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON rosters FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON matchups FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON drafts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON draft_picks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON traded_picks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role write access" ON playoff_brackets FOR ALL USING (auth.role() = 'service_role');
