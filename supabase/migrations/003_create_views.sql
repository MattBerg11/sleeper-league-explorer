-- Standings view: roster + owner info
CREATE OR REPLACE VIEW standings
WITH (security_invoker = true) AS
SELECT
  r.league_id,
  r.roster_id,
  r.owner_id,
  o.display_name,
  o.team_name,
  o.avatar AS owner_avatar,
  r.wins,
  r.losses,
  r.ties,
  r.fpts + r.fpts_decimal / 100.0 AS total_points_for,
  r.fpts_against + r.fpts_against_decimal / 100.0 AS total_points_against,
  l.season,
  l.name AS league_name
FROM rosters r
LEFT JOIN owners o ON r.league_id = o.league_id AND r.owner_id = o.user_id
LEFT JOIN leagues l ON r.league_id = l.league_id
ORDER BY r.wins DESC, (r.fpts + r.fpts_decimal / 100.0) DESC;

-- Matchup pairs view: combines both sides of a matchup
CREATE OR REPLACE VIEW matchup_pairs
WITH (security_invoker = true) AS
SELECT
  m1.league_id,
  m1.week,
  m1.matchup_id,
  m1.roster_id AS team1_roster_id,
  m1.points AS team1_points,
  m2.roster_id AS team2_roster_id,
  m2.points AS team2_points,
  o1.display_name AS team1_name,
  o2.display_name AS team2_name,
  o1.team_name AS team1_team_name,
  o2.team_name AS team2_team_name
FROM matchups m1
JOIN matchups m2 ON m1.league_id = m2.league_id
  AND m1.week = m2.week
  AND m1.matchup_id = m2.matchup_id
  AND m1.roster_id < m2.roster_id
LEFT JOIN rosters r1 ON m1.league_id = r1.league_id AND m1.roster_id = r1.roster_id
LEFT JOIN rosters r2 ON m2.league_id = r2.league_id AND m2.roster_id = r2.roster_id
LEFT JOIN owners o1 ON r1.league_id = o1.league_id AND r1.owner_id = o1.user_id
LEFT JOIN owners o2 ON r2.league_id = o2.league_id AND r2.owner_id = o2.user_id
WHERE m1.matchup_id IS NOT NULL;
