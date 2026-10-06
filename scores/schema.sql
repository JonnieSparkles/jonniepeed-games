CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY,
  game TEXT NOT NULL,
  board INTEGER NOT NULL,
  run_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  input TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS scores_by_board ON scores (game, board, score);
