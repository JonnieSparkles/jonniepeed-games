# SPEC-001: Leaderboards

Shared online high score boards for Thimbleful and Don't Step on the Crack, in the style of a classic arcade: top 50 per game, three initials, entered only when your run makes the table.

Status: ready to build. Read AGENTS.md and README.md first. Every rule there still applies.

## Open decision

- **API hostname.** `scores.sparklelabs.org` or `scores.games.sparklelabs.org`. Both work as a Worker Custom Domain on the `sparklelabs.org` Cloudflare zone. It appears in exactly two places: the `API` constant in `site/assets/leaderboard.js` and `routes` in `scores/wrangler.jsonc`. Ask Jonnie if it isn't settled.

## Architecture

```
game page (GitHub Pages, games.sparklelabs.org, or Arweave)
    │  site/assets/leaderboard.js
    ▼
Cloudflare Worker  (scores/, custom domain above)
    ▼
Cloudflare D1  (one table: scores)
```

- The Worker owns every rule: which games and boards exist, sort order, limits, validation. Games don't repeat those rules.
- Each game draws its own board in its own style. `leaderboard.js` handles data plus one unstyled initials widget.
- Nothing about the leaderboard may break a game. If the Worker is slow, down or rejects something, the game behaves exactly as it does today, just without a board.

## Decisions (already made, don't revisit)

- One shared table with a `game` column, not a table per game. Extra per-game numbers go in a `meta` JSON column.
- Game IDs are the folder names: `thimbleful`, `dont-step-on-the-crack`. Permanent.
- Boards hold the **top 50**. Every run counts, so one player can appear many times (arcade style). No accounts.
- Names are exactly **3 characters**, A–Z and 0–9, entered with an arcade-style letter picker. No text box, so phones never open the keyboard.
- **Board numbers.** Each game has a `BOARD` constant. Bump it by hand only when scoring changes so old scores aren't comparable (difficulty, what counts as a point). Art, sound and bug fixes don't bump it.
- Each copy of a game sends its own `BOARD` and shows that board. Old boards stay open: old copies (for example Arweave uploads) keep submitting to them.
- **Board `0` is the test board** for every game. Always allowed, never shown by a real game.
- API paths are versioned (`/v1/...`). CORS allows any origin (`*`), since Arweave gateways serve from changing domains. There are no cookies or logins.
- No rate limiting, no admin UI, no countdown on initials entry. Bad scores are deleted by hand (see the guide).
- Cheating isn't a priority. Validation only keeps data sane.

## Files

```
scores/                       the Worker. Not published (outside site/)
  wrangler.jsonc              Worker config: D1 binding "DB", custom domain route
  schema.sql                  table and indexes
  games.json                  per-game rules (the one place to edit for new games and boards)
  blocklist.json              3-character names that are refused
  src/index.js                the Worker
  test/smoke.mjs              API tests (Node, no dependencies)
site/assets/leaderboard.js    shared client: data calls + initials widget
tools/check_boards.py         fails if a game's BOARD isn't allowed in scores/games.json
docs/guides/leaderboards.md   operating guide (setup, deploy, add a game, bump a board, delete a score)
```

## Database (`scores/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS scores (
  id         INTEGER PRIMARY KEY,
  game       TEXT    NOT NULL,
  board      INTEGER NOT NULL,
  run_id     TEXT    NOT NULL UNIQUE,   -- one row per run; makes retries safe
  name       TEXT    NOT NULL,          -- 3 chars, A-Z 0-9
  score      INTEGER NOT NULL,
  meta       TEXT,                      -- JSON object of the game's extra fields, or NULL
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS scores_by_board ON scores (game, board, score);
```

## Game rules (`scores/games.json`)

```json
{
  "thimbleful": {
    "boards": [1],
    "higherIsBetter": true,
    "maxScore": 10000,
    "meta": {
      "time_ms": { "min": 0, "max": 86400000 }
    },
    "tieBreak": []
  },
  "dont-step-on-the-crack": {
    "boards": [1],
    "higherIsBetter": true,
    "maxScore": 1000000,
    "meta": {
      "time_ms": { "min": 0, "max": 86400000 },
      "steps":   { "min": 0, "max": 1000000 },
      "streak":  { "min": 0, "max": 1000000 }
    },
    "tieBreak": [["time_ms", "asc"]]
  }
}
```

Field meanings (document these in the guide too, since JSON has no comments):

- `boards`: board numbers this game accepts. `0` is always accepted on top of these.
- `higherIsBetter`: sort direction for `score`.
- `maxScore`: scores must be integers from 0 to this.
- `meta`: the extra fields a game sends. Every listed key is required, must be an integer within `min`–`max`, and unknown keys are refused.
- `tieBreak`: list of `[metaKey, "asc"|"desc"]` used when scores are equal. After those, the earlier entry wins (an arcade tie doesn't knock anyone down).

The Worker builds its SQL `ORDER BY` only from this file, never from request input. Meta keys are read with `json_extract(meta, '$.key')`.

## API

All responses are JSON. All have `Access-Control-Allow-Origin: *`. `OPTIONS` on any path answers the preflight (methods `GET, POST, OPTIONS`, header `Content-Type`). Errors are `{"ok": false, "error": "<code>"}` with status 400 (bad input) or 404 (unknown path). Request bodies over 2 KB are refused.

### `GET /v1/top?game=<id>&board=<n>`

Optional: `&score=<n>&meta=<url-encoded JSON>` to ask where a finished run would place.

```json
{
  "ok": true,
  "game": "dont-step-on-the-crack",
  "board": 1,
  "scores": [
    { "rank": 1, "name": "JON", "score": 412, "meta": { "time_ms": 93000, "steps": 410, "streak": 61 } }
  ],
  "placement": 7
}
```

- `scores` is the top 50 in order.
- `placement` appears only when `score` was sent: the rank (1–50) the run would get, or `null` if it wouldn't make the table. A run that only ties the 50th entry doesn't make it. Compute it in JS with the same rules as the SQL order, and cover that with tests.

### `POST /v1/submit`

```json
{ "game": "thimbleful", "board": 1, "run_id": "uuid", "name": "JON", "score": 38, "meta": { "time_ms": 61000 } }
```

```json
{ "ok": true, "id": 123, "rank": 7, "scores": [ "...top 50, same shape as /v1/top..." ] }
```

- `rank` is the new row's rank, or `null` if it landed outside the top 50.
- A repeated `run_id` doesn't insert again. Return `ok` with that existing row's `id` and `rank`.
- Validation, with error codes: unknown game `bad_game`; board not `0` and not in `boards` `bad_board`; `run_id` not 8–64 chars of `A-Za-z0-9-` `bad_run_id`; name not exactly 3 of `A-Z0-9` `bad_name`; name in the blocklist `name_not_allowed`; score not an integer in range `bad_score`; meta wrong `bad_meta`.

## Client (`site/assets/leaderboard.js`)

A plain script (the games don't use modules) that defines `window.Leaderboard`. Games include it with a relative path (`../assets/leaderboard.js`) so it works on Pages and inside an Arweave manifest. `tools/stamp.py` handles its `?v=` link.

- `API`: the hostname above. When the page is on `localhost` or `127.0.0.1`, use `http://localhost:8787` (`wrangler dev`) instead.
- `Leaderboard.newRunId()`: `crypto.randomUUID()`, with a fallback where that's missing.
- `Leaderboard.load(game, board, score?, meta?)`: calls `/v1/top`. Resolves to the response or `null`.
- `Leaderboard.submit({game, board, run_id, name, score, meta})`: calls `/v1/submit`, retries once on a network error with the same `run_id`. Resolves to the response or `null`, or `{ok:false, error}` for a 400 so the game can react to `name_not_allowed`.
- Every call times out after about 4 seconds, and nothing ever throws into game code.
- `Leaderboard.initials()` / `Leaderboard.saveInitials(s)`: last used initials in localStorage key `jpg-initials`, default `AAA`, wrapped in try/catch like the games' existing storage.
- `Leaderboard.entry(container, {initials, onDone(name), onSkip()})`: builds the initials picker as plain DOM with `lb-` class names and no styling, so each game styles it:
  - Three slots, each with an up and down button. Letters cycle A–Z then 0–9 and wrap.
  - Pre-filled with `Leaderboard.initials()`.
  - Keyboard: typing a letter or digit sets the current slot and moves to the next; Left/Right move between slots; Up/Down cycle; Backspace moves back; Enter is OK; Escape is Skip.
  - Buttons: **OK** (calls `onDone`) and **Skip** (calls `onSkip`, nothing is saved).
  - Usable with touch, mouse and keyboard. Buttons have accessible labels.

## Game-over flow (both games)

1. Only real runs count: not the Crack title-screen demo walk, not Thimbleful's "Just watch". Create a fresh `run_id` when a run starts.
2. At game over, call `Leaderboard.load(game, BOARD, score, meta)` right away, so the answer is usually back by the time the end screen shows.
3. If `placement` is a number, show the initials picker in the end screen. On OK: save the initials, submit, then show the board with the new row highlighted. If the answer is `name_not_allowed`, show a short "Try other initials" and keep the picker open. On Skip: show the board without submitting.
4. If `placement` is `null`, just show the board.
5. If `load` returned `null`, show nothing extra. The end screen is exactly today's.
6. **The board view at game over** shows the top 10. If the player's row is below 10th, add a gap row ("…") and their row underneath. A **See all** button shows the full 50 in a scrollable list inside the same screen.
7. While the picker is open, the game's own keyboard shortcuts must not fire. Both games have a window `keydown` handler (`thimbleful/game.js`, `dont-step-on-the-crack/game.js`) that has to ignore keys while entry is open.

### Thimbleful (`site/thimbleful/`)

- Add `const BOARD = 1;` at the top of `game.js`.
- Score: drops caught. Meta: `time_ms` from the play time (`el`, in seconds, × 1000, rounded).
- Hook into `end()`. The board and picker go in the existing overlay card under the end text, styled to match the card.
- Rows show rank, initials and drops.
- Local best key becomes `'thimbleful-best-' + BOARD`. The old key isn't migrated (no backward compatibility).

### Don't Step on the Crack (`site/dont-step-on-the-crack/`)

- Add `const BOARD=1;` near the other top constants in `game.js`.
- Score: `runResult.ft`. Meta: `time_ms` (`runResult.time` × 1000, rounded), `steps`, `streak` (`runResult.streak`). Ties rank the faster time first (set in `games.json`).
- Hook into `gameOver()` and `showOver()`. The board and picker go in the phone dialog's `#after` section, styled to match it. Make sure the dialog still fits on a short landscape phone. That's where "See all" scrolling matters most.
- Rows show rank, initials, feet and streak.
- Local best keys become `'dsotc-best-'+BOARD` and `'dsotc-best-streak-'+BOARD`. No migration.

## Board check (`tools/check_boards.py`)

- Finds every `site/*/game.js` with a `BOARD` constant, reads the game ID from the folder name, and fails (non-zero exit, clear message) if that game is missing from `scores/games.json` or its `BOARD` isn't in `boards`.
- Add it as a step in the existing Pages workflow, before upload, so a mismatch stops the deploy. Don't add any automatic triggers. The workflow stays manual.

## Tests (`scores/test/smoke.mjs`)

- Plain Node, no dependencies. Base URL from `BASE`, default `http://localhost:8787`.
- Use only board `0`, so running it against the live Worker only touches the test board. Use random `run_id`s.
- Cover: preflight headers; `top` on an empty board; valid submit for each game; repeated `run_id` returns the same row; `placement` for a winning score, a losing score and a score that only ties 50th (fill the board first); Crack tie-break by time; each validation error code; blocklisted name; unknown path 404.
- Print a pass/fail line per case and exit non-zero on any failure.

## Docs

- **`docs/guides/leaderboards.md`**, the operating guide, written for Jonnie and for agents:
  - What it is (the diagram above) and where each piece lives.
  - One-time setup: install Node and Wrangler, `wrangler login`, create the D1 database and put its ID in `wrangler.jsonc`, apply `schema.sql` to the remote database, deploy, confirm the custom domain, run the smoke test with `BASE` set to the live URL.
  - Local development: `wrangler dev`, apply the schema locally, serve `site/` on localhost so `leaderboard.js` uses the local Worker.
  - **Adding a game to the leaderboard**: checklist (entry in `games.json`, `BOARD = 1` in the game, game-over hookup, deploy the Worker, run `check_boards.py`, then deploy the site).
  - **Changing scoring (bump the board)**: checklist. Add the new number to `boards`, **deploy the Worker first**, then bump `BOARD` in the game, run `check_boards.py`, deploy the site.
  - The `games.json` field reference.
  - Deleting a bad score with `wrangler d1 execute` (example `SELECT` to find it and `DELETE ... WHERE id = ?`), and clearing the test board.
- **README.md**: add `scores/`, `specs/` and `docs/guides/` to Layout. Add a Standards bullet: games with scores follow `docs/guides/leaderboards.md`; scoring changes bump `BOARD`, Worker first. In "Adding a game", add a step pointing to the guide's checklist.
- **AGENTS.md**: short bullets matching the README ones, plus: run `python3 tools/check_boards.py` after touching `BOARD` or `games.json`.

## Done when

- The smoke test passes against `wrangler dev`.
- Both games, served locally against `wrangler dev`: a qualifying run shows the picker, OK saves and highlights the row, Skip shows the board, a non-qualifying run shows the board, and stopping the Worker leaves both games exactly as they are today.
- Both end screens work in portrait, landscape and desktop, including a full 50-row "See all".
- `tools/check_boards.py` passes, and fails when a `BOARD` is changed to an unlisted number.
- `python3 tools/stamp.py` has been run.
- Docs updated as above.

## Not in this spec (later, if wanted)

- High score table on the title screens (arcade attract mode).
- Showing which board is current, or naming boards.
- Rate limiting, an admin page, freezing old boards.

## Jonnie does (needs his Cloudflare account)

1. Pick the API hostname (Open decision above).
2. `wrangler login`, create the D1 database, put its ID in `scores/wrangler.jsonc`.
3. Apply `schema.sql` to the remote database, deploy the Worker, confirm the custom domain answers.
4. Run the smoke test against the live URL (board 0 only).
5. Run the "Deploy to GitHub Pages" workflow.
