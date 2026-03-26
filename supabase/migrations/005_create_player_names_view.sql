-- Lightweight view for player name lookups (reduces payload from ~2MB to ~200KB)
CREATE OR REPLACE VIEW player_names AS
SELECT
  player_id,
  COALESCE(full_name, first_name || ' ' || last_name) AS name
FROM players;

-- Enable RLS-like access for the view
ALTER VIEW player_names SET (security_invoker = on);
