-- One row per run. A start creates it; an end fills in how it went. See SPEC-009.
CREATE TABLE IF NOT EXISTS runs (
  id          INTEGER PRIMARY KEY,
  run_key     TEXT    NOT NULL UNIQUE,  -- random, made by the client for this run
  visit       TEXT    NOT NULL,         -- random, made by the client for this page load; never stored on the device
  game        TEXT    NOT NULL,
  board       INTEGER,                  -- the game's leaderboard board, NULL for games without one
  device      TEXT    NOT NULL,         -- phone | tablet | desktop
  orientation TEXT    NOT NULL,         -- portrait | landscape, when the run started
  host        TEXT    NOT NULL,         -- the page's hostname
  source      TEXT,                     -- the referring page's hostname, if any
  started_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ended_at    TEXT,
  outcome     TEXT,                     -- over | won | quit; NULL until the run reports an end
  time_ms     INTEGER,                  -- play time as the game counts it
  score       INTEGER,
  input       TEXT,                     -- touch | keys
  score_run   TEXT,                     -- run ID from the leaderboard token; matches scores.run_id when saved
  stats       TEXT                      -- JSON object: the game's own numbers
);
CREATE INDEX IF NOT EXISTS runs_by_game ON runs (game, started_at);
CREATE INDEX IF NOT EXISTS runs_by_time ON runs (started_at);
