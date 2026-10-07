# 00: Online leaderboards

Built from [SPEC-001](../../specs/SPEC-001-leaderboards.md), which records the decisions and why. This guide is the source of truth for how things work now.

Shared arcade boards hold the top 50 runs for each game in `scores/games.json`. Each run has three initials, a score and an input icon. Every run counts; there are no accounts, rate limits or admin page. Games show their top 10 at game over, plus the player's row if it is lower. **See all** opens a scrollable list of 50 inside the end screen. The initials picker uses buttons and keyboard controls, never a phone text keyboard. Failed or timed-out API calls leave the game playable.

```text
game page (Pages, custom domain or Arweave)
    │ site/assets/leaderboard.js
    ▼
Cloudflare Worker (scores/, Worker Custom Domain)
    ▼
Cloudflare D1 (scores table)
```

The Worker owns validation, board membership, limits and ranking. Each game owns its board's appearance. Permanent game IDs are folder names. `scores/games.json` defines rules, `scores/blocklist.json` is a JSON array of refused three-character names, `scores/schema.sql` defines storage, and `scores/src/index.js` serves the API. `scores/test/smoke.mjs` tests it with plain Node. `tools/check_boards.py` checks each game's `BOARD` and runs before the manual Pages upload.

The blocklist holds about 30 obvious profanities and slurs, plus a few look-alike spellings. It deliberately leaves out ordinary words that some lists wrongly block (such as `GAY` or `JEW`). It stops casual abuse, not a determined troll: use the delete recipes below for anything that gets through. To change it, edit the array (uppercase, exactly three of A–Z/0–9) and deploy the Worker. The smoke test checks that its first entry is refused.

## One-time setup (Jonnie's Cloudflare account)

1. Install Node 22 or newer and Wrangler 4 (`npm install -g wrangler@4.148.0`). Run `wrangler login`.
2. From `scores/`, run `wrangler d1 create jonniepeed-games-scores`. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc` with the returned ID. Keep the binding named `DB`.
3. Apply the schema: `wrangler d1 execute jonniepeed-games-scores --remote --file=schema.sql`.
4. Run `wrangler deploy`. Confirm the Worker Custom Domain in Cloudflare's Workers dashboard and that `/v1/top?game=<game-id>&board=1` returns JSON for a game id in `games.json`. Cloudflare normally supplies the Custom Domain certificate. If the two-level name asks for a paid certificate product, fall back to the single-level `scores` name on the same zone, editing only `API` in `site/assets/leaderboard.js` and `routes` in `scores/wrangler.jsonc`, and tell Jonnie.
5. Run `BASE=https://<Worker-Custom-Domain> node test/smoke.mjs`. It writes only to a newly selected random negative test board, never a real board. All boards ≤ 0 are test boards; real games never display them.
6. Run `python3 tools/check_boards.py` and `python3 tools/stamp.py` from the repository root. Deploy the site by manually running **Deploy to GitHub Pages**. Do not add automatic workflow triggers.

The hostname is configured in exactly two places: `API` in the shared client and the Worker route. No other production hostname setting is needed. Cloudflare credentials belong in login/environment settings, never in repository files.

### If the scores certificate won't issue

`games.sparklelabs.org` is a CNAME to GitHub Pages (`jonniesparkles.github.io`). When a certificate authority checks `scores.games.sparklelabs.org` and finds no CAA records on that exact name, it climbs to `games.sparklelabs.org`, follows the CNAME, and finds GitHub's CAA records. Those only allow DigiCert, Sectigo and Let's Encrypt, so a Cloudflare certificate from Google Trust Services fails with a "CAA records block issuance" error under **SSL/TLS → Edge Certificates**.

The fix (already in place) is CAA records on `scores.games` itself, so the check stops there: three `CAA` records named `scores.games`, tag **Only allow specific hostnames** (`issue`), for `pki.goog`, `letsencrypt.org` and `ssl.com`. Cloudflare adds its own CAA records alongside them, which is what the dashboard's warning means. Don't delete them, or renewals can fail the same way. After adding them, a stuck certificate can take a while to retry. If it stays in error, delete the certificate, remove the Worker's custom domain and run `wrangler deploy` again to order a fresh one.

## Local development

Use the existing checkout. A cloud task is already isolated; do not create a Git worktree unless requested.

```sh
cd scores
wrangler d1 execute jonniepeed-games-scores --local --file=schema.sql
wrangler dev --local --port 8787
```

Leave the Worker running. In another terminal, serve the site from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

Open the site on localhost or 127.0.0.1. Those two hostnames automatically use the local Worker on port 8787. All other page hostnames use the production API. Local D1 needs no Cloudflare login and works with the database ID placeholder. Wrangler stores local state in ignored `scores/.wrangler/`; schema application is repeatable and does not erase scores.

From `scores/`, run `node test/smoke.mjs`. Each run starts with an empty random negative board. The test never deletes any scores. The smoke runner prints one PASS/FAIL per case and exits nonzero on failure. To check the games, finish a qualifying run and test OK, Skip, refused initials and See all; fill a local board to test a losing run. Test portrait, short landscape and desktop, including full screen. Stop the Worker and finish another run: the original end screen should appear without an online board.

The optional browser regression runner is `python3 scores/test/games.py` from the repository root. It requires Python Playwright (`python3 -m pip install playwright`, then `python3 -m playwright install chromium`), plus the two local servers above. If system Chromium is already installed, use `CHROMIUM=/usr/bin/chromium python3 scores/test/games.py` instead of downloading a browser. It seeds isolated negative boards, drives the actual end-screen handlers with deterministic finished scores, tests the UI in all three orientations, and saves screenshots in a temporary directory (or `SCREENSHOTS=<directory>`). Its API interception changes only the test board numbers, leaving production boards untouched.

Run `node scores/test/versions.mjs` from the root to test historical-rule isolation. It starts its own ephemeral Wrangler/D1 instance with a second board and a test-only blocked name, verifies both rule sets, test-board selection and name refusal, then removes that temporary database. It never contacts the live Worker or changes the production blocklist. If Wrangler is not on PATH, set `WRANGLER=/absolute/path/to/wrangler`.

## Adding a game

Checklist, in this order:

1. Choose a permanent folder/game ID and initial positive board number. Add its `boards` mapping to `scores/games.json`; put the full score range, optional integer meta and tie-breaks inside the initial board entry. Add a blocked name only in `blocklist.json`, not in game code.
2. Deploy the Worker first, so the new game's board is accepted before any site copy uses it.
3. Include `../assets/leaderboard.js` before `game.js`, and add `const BOARD = 1;` to `game.js`. Use board-specific local-best keys without migrating old keys.
4. At real run start, generate a fresh run ID and reset input to `keys`. Record `touch` only when touch or pen drives the play area; menus do not count. Exclude demos and watch modes.
5. At game over, freeze the score/meta, load placement immediately, and show the result in the game's end screen. A qualifying run gets the picker; other runs get the board. A null load adds nothing. Guard asynchronous responses against restarts, and prevent game keyboard shortcuts while the picker is open.
6. On OK, save initials, submit the frozen run, and draw the returned board with `rank` highlighted. On `name_not_allowed`, keep the picker open with “Try other initials.” On Skip, display the original board without submitting. Keep the same run ID for retries. Destroy the picker on restart.
7. Draw rank, initials, score, any game-specific meta and a touch/keyboard icon with an accessible label. Show 10 rows, then “…” and the player's row when below 10; See all must show up to 50 in a scrollable region. Style `.lb-` picker elements to match the game; the shared script adds no CSS.
8. Run `python3 tools/check_boards.py`. Test against the local Worker and verify all end-screen flows and orientations. Rebuild social cards after game-art changes with `python3 tools/og/make.py`, then run `python3 tools/stamp.py`. Deploy the site after the Worker.

### Worked example: pebble-hop

Add this entry to `games.json` (alongside the existing entries):

```json
"pebble-hop": {
  "boards": {
    "1": {
      "higherIsBetter": true, "maxScore": 100000,
      "meta": { "time_ms": { "min": 0, "max": 86400000 } },
      "tieBreak": []
    }
  }
}
```

In `site/pebble-hop/index.html`, include the client and an initially hidden board container inside the end screen:

```html
<section id="board" aria-label="Online high scores" hidden></section>
<script src="../assets/leaderboard.js"></script>
<script src="game.js"></script>
```

Adapt these lines to the game's existing start, pointer and key handlers:

```js
const BOARD = 1;
const BEST_KEY = 'pebble-hop-best-' + BOARD;
let run = null, picker = null;
function beginRun() {
  picker?.destroy(); picker = null;
  board.hidden = true; board.replaceChildren();
  run = { id: Leaderboard.newRunId(), input: 'keys' };
  // Start the game's own simulation here; demos do not call this.
}
// Inside the existing play-area pointerdown, after checking actual play mode:
if (e.pointerType === 'touch' || e.pointerType === 'pen') run.input = 'touch';
// At the start of the game's window keydown handler:
if (picker) return;
```

Use `document.getElementById('board')` for `board`. The example below assumes `drawBoard(scores, highlightedRank)` is your game's renderer; copy/adapt `drawLeaderboard` from either existing game's `game.js` for table creation, accessible input icons, top 10 plus player row and See all. Also copy/adapt its `.lb-` CSS from that game's `index.html`. No game repeats the Worker's limits or ranking rules.

```js
async function finished(points, seconds) {
  const ended = run;
  const payload = { game: 'pebble-hop', board: BOARD, run_id: ended.id,
    score: points, input: ended.input, meta: { time_ms: Math.round(seconds * 1000) } };
  const data = await Leaderboard.load(payload.game, BOARD, points, payload.meta);
  if (run !== ended || !data) return; // Also check the game's current end-screen state.
  board.hidden = false;
  if (typeof data.placement !== 'number') { drawBoard(data.scores); return; }
  const message = document.createElement('p'); message.setAttribute('role', 'status'); board.append(message);
  let busy = false;
  picker = Leaderboard.entry(board, {
    initials: Leaderboard.initials(),
    async onDone(name) {
      if (busy) return;
      busy = true; picker.setBusy(true); Leaderboard.saveInitials(name);
      const result = await Leaderboard.submit({ ...payload, name });
      if (run !== ended) return;
      busy = false;
      if (result?.error === 'name_not_allowed') {
        message.textContent = 'Try other initials'; picker.setBusy(false); return;
      }
      picker.destroy(); picker = null;
      drawBoard(result?.ok ? result.scores : data.scores, result?.ok ? result.rank : null);
    },
    onSkip() { if (busy) return; picker.destroy(); picker = null; drawBoard(data.scores); }
  });
}
```

Hide/reset the board and invalidate `run` when leaving an end screen. A game also guards or skips the client when `window.Leaderboard` is unavailable; see the existing integrations. The shared client bounds requests to about four seconds and retries a network-failed submit once using the same run ID. It resolves failures instead of throwing into game code. Initials use `jpg-initials` storage with an `AAA` default. Picker keys: letters/digits fill and advance, Left/Right select, Up/Down cycle A–Z then 0–9, Backspace selects the preceding slot, Enter confirms, Escape skips. Native buttons also support Tab and Space.

### End-screen board conventions

Both games follow these, so a new game should too. Copy from either game's `showLeaderboard` and `drawLeaderboard` and its `.lb-` CSS.

- **Picker:** heading "New high score!" and a status line "You're #N. Enter your initials." OK is styled as the game's primary button (`.lb-ok`), Skip as a text link (`.lb-skip`). The shared client scrolls the whole picker into view when it opens.
- **One decision at a time:** while the picker is open, add `lb-entering` to the end screen's container so its own buttons (play again and so on) are hidden. After OK or Skip, remove it and focus the main replay button with `preventScroll`.
- **Top 10 in full:** no inner scroll for the top 10. "See all N" switches to a scrolling list of all 50 (`.lb-all`, sticky header), and "Show top 10" switches back.
- **Your row:** highlighted (`.lb-you`) and scrolled into view with `scrollIntoView({ block: 'nearest' })`. Below 10th, a gap row then your row.
- **Columns:** rank (narrow, muted), name (left), score, any extra columns, then the input icon. The icon column's header is visually hidden (`.lb-sr`) but still read by screen readers.
- Check portrait, landscape (including a short landscape phone) and desktop, and the game's full screen mode.

## Changing an existing game

| Change | Action |
| --- | --- |
| Raise `maxScore`, add an optional meta key, widen a meta range, restyle game rows | Safe without a board bump. Deploy Worker rule changes first. |
| Change difficulty, score meaning, `higherIsBetter`, `tieBreak`, or lower `maxScore` | New board: copy the newest `boards` entry to the next positive number, edit the new entry, deploy Worker first, then bump the game's `BOARD`, run the checker and deploy site. |
| Rename game ID, remove an accepted board or meta key, narrow a meta range, change an existing `/v1/` path's meaning | Never. Keep the existing contract; breaking API changes require `/v2/` alongside `/v1/`. |

Old boards stay open, including old Arweave copies. This is the exception to the repository's no-backward-compatibility rule. Local best keys include BOARD and are not migrated. Each game has a `boards` object whose keys are positive board numbers and whose values contain that board's full rules. For example, to bump from 1 to 2, copy `boards["1"]` to `boards["2"]` and edit only the new entry. Keep board 1 and its scoring/ranking meaning intact. Deploy the Worker, then change the game's `BOARD` to 2, run the checker and local tests, stamp links, and deploy the site. Never reuse an old number. Update tests for the new rules while retaining coverage for historical boards.

Test boards (all numbers ≤ 0) use the full rules of the newest positive board, chosen by numeric board number, independently for each game. Thus every new smoke run tests the current rules; test board 0 is still supported. Old positive boards always use their own entries, even when the newest board changes direction, limits, meta or tie-breaks.

## games.json field reference

- `boards`: object mapping each accepted positive board number (JSON string key, such as `"1"`) to its full rules. Every number ≤ 0 is also accepted for testing and uses the numerically newest positive board's rules. Never show test boards in real games. Keep every old entry. The following fields live inside each board entry:
- `higherIsBetter`: true sorts scores descending; false sorts ascending.
- `maxScore`: integer score range, inclusive 0 to this maximum.
- `meta`: allowed optional integer keys, each with inclusive `min`/`max`. Sent unknown keys, non-integers or out-of-range values are refused. An omitted meta object is stored as NULL; a provided object may be empty. A game sends only the keys declared on its board, frozen at game over.
- `tieBreak`: ordered `[metaKey, "asc"|"desc"]` pairs after score; absent values sort last. An empty list means score is the only ranking field before time. After all ties, earlier creation time and ID win. A new run tying 50th never qualifies.

## API and validation

`GET /v1/top?game=<id>&board=<integer>` returns `{ok, game, board, scores}`. Add `score` and URL-encoded JSON `meta` for `placement` (1–50 or null). A row has rank, name, score, input and meta. `POST /v1/submit` accepts game, board, run_id, name, score, input and optional meta; returns `{ok, id, rank, scores}`. Repeating a run ID returns the original row, even if another valid payload is sent; it does not change that run. Rows outside 50 are stored with null rank.

All responses are JSON with CORS `*`; any OPTIONS path allows GET/POST/OPTIONS and Content-Type. There are no cookies. Bodies above 2048 bytes fail with `body_too_large`; malformed JSON fails with `bad_json`. Input failures use status 400 and `{ok:false,error}`: `bad_game`, `bad_board`, `bad_run_id` (8–64 characters A–Z/a–z/0–9/hyphen), `bad_name` (exactly three A–Z/0–9), `name_not_allowed`, `bad_score`, `bad_input` (touch or keys), `bad_meta`. Unknown paths/methods return 404 `not_found`; database failure returns 503 `unavailable` with the same JSON/CORS format.

## Admin recipes

In Cloudflare dashboard, open **Workers & Pages → D1 → jonniepeed-games-scores → Console**, paste the SQL below and run it. Inspect selected IDs before deleting. The terminal equivalents run from `scores/` and require your Cloudflare login. Use `--local` instead of `--remote` for local test data. Nothing in the client deletes or edits rows.

### See a board with IDs

Dashboard SQL. Replace `<game-id>` and the board number. Match `ORDER BY` to that board in `games.json`: `score DESC` when `higherIsBetter` is true, otherwise `ASC`; then one `json_extract(meta, '$.<key>')` term per `tieBreak` pair, with that direction and `NULLS LAST`; then `created_at ASC, id ASC`. The query below is higher-is-better with no meta tie-break.

```sql
SELECT id, name, score, input, meta, created_at FROM scores
WHERE game = '<game-id>' AND board = 1
ORDER BY score DESC, created_at ASC, id ASC LIMIT 50;
```

```sh
wrangler d1 execute jonniepeed-games-scores --remote --command="SELECT id, name, score, input, meta, created_at FROM scores WHERE game = '<game-id>' AND board = 1 ORDER BY score DESC, created_at ASC, id ASC LIMIT 50;"
```

### Find by initials

Dashboard: run `SELECT * FROM scores WHERE name = 'JON' ORDER BY created_at DESC;`.

```sh
wrangler d1 execute jonniepeed-games-scores --remote --command="SELECT * FROM scores WHERE name = 'JON' ORDER BY created_at DESC;"
```

### Delete one score

Dashboard: first run `SELECT * FROM scores WHERE id = 123;`, then `DELETE FROM scores WHERE id = 123;` after confirming the row.

```sh
wrangler d1 execute jonniepeed-games-scores --remote --command="SELECT * FROM scores WHERE id = 123;"
wrangler d1 execute jonniepeed-games-scores --remote --command="DELETE FROM scores WHERE id = 123;"
```

### Reset a board

Dashboard: select the game's board first, then run `DELETE FROM scores WHERE game = '<game-id>' AND board = 1;`. Always constrain both game and board.

```sh
wrangler d1 execute jonniepeed-games-scores --remote --command="DELETE FROM scores WHERE game = '<game-id>' AND board = 1;"
```

Wipe when the same rules need a clean slate; no deploy is needed. Bump when scoring rules change; keep the old board and deploy Worker support first.

### Clear all test boards

Dashboard: run `DELETE FROM scores WHERE board <= 0;`. This includes board 0 and every random negative smoke board; never use an unconstrained DELETE.

```sh
wrangler d1 execute jonniepeed-games-scores --remote --command='DELETE FROM scores WHERE board <= 0;'
```

### Undo a database mistake

D1 Time Travel is always enabled on production D1. The Workers Free plan retains **7 days**; Paid retains 30 days. This was checked against Cloudflare's [Time Travel reference](https://developers.cloudflare.com/d1/reference/time-travel/). Restoring rolls back the whole database, including other games and scores added since the chosen instant, so pick the point immediately before the mistake and keep the returned undo bookmark.

Dashboard: open the database's **Time Travel** tab, select a timestamp before the mistake, review the restore and confirm it. Terminal:

```sh
wrangler d1 time-travel info jonniepeed-games-scores --timestamp='2026-10-06T12:00:00Z'
wrangler d1 time-travel restore jonniepeed-games-scores --timestamp='2026-10-06T12:00:00Z'
```

Replace the sample timestamp. Save the previous bookmark printed by restore. To undo that restore, use `wrangler d1 time-travel restore jonniepeed-games-scores --bookmark=<previous-bookmark>`. Time Travel is not available for local D1; preserve local data separately if needed.
