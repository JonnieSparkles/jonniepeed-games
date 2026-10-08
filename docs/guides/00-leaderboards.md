# 00: Online leaderboards

Built from [SPEC-001](../../specs/SPEC-001-leaderboards.md) and [SPEC-007](../../specs/SPEC-007-leaderboard-v2.md) (run tokens, `/v2/`), which record the decisions and why. This guide is the source of truth for how things work now.

Shared arcade boards hold the top 50 runs for each game in `scores/games.json`. Each run has three initials, a score and an input icon. There are no accounts or admin page. Each run gets a token from the Worker when it starts, and a save is checked against it; see [Protection](#protection). Games show their top 10 at game over, plus the player's row if it is lower. **See all** opens a scrollable list of 50 inside the end screen. The initials picker uses buttons and keyboard controls, never a phone text keyboard. Failed or timed-out API calls leave the game playable.

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

The production API is https://scores.jonniepeed.games/. Nothing has been uploaded to Arweave yet. From the first Arweave upload onward, this address in `site/assets/leaderboard.js` is baked into immutable copies, so `scores.jonniepeed.games` becomes permanent at that point. So does the API version those copies call (`/v2/`). Retiring it later quietly removes the boards from those copies, which [API versions](#api-versions) allows.

## Protection

Anyone can call the API, so the Worker checks every save. None of this needs looking after day to day.

- **Run tokens.** When real play begins, the game asks `POST /v2/start` for a token. The token is signed with `RUN_SECRET` for that game and board and carries its own run ID and start time. Nothing is stored. A token saves one row, ever.
- **Time.** A run can't claim more play time than its token has existed (`time_ms` up to the token's age plus 5 s). Tokens last 24 hours.
- **Score caps.** A score can't come faster than a perfect player could earn it: at most `perSecond × seconds + grace`, from the board's `plausible` rule. See [Score caps](#score-caps).
- **Rate limit.** Twenty saved runs a minute per connection, counted per Cloudflare location (the `SUBMITS` binding in `wrangler.jsonc`). The IP is used in memory only and never stored.

Refused saves answer `rejected` with no reason, and the game says nothing: the board comes back without the row. Each refusal logs one line (game, board, score, time and the check that failed, never the IP), so "why didn't my score save?" can be answered; see [Why didn't a score save?](#why-didnt-a-score-save).

What this stops: floods, scripts that post without playing, replays, and impossible scores like 9999 in a few seconds. What it doesn't stop: a bot that really plays, or someone who edits the game in their browser, plays a full-length run and swaps in a believable score. Clean those up with the [admin recipes](#admin-recipes).

If the Worker has no `RUN_SECRET`, `start` and `submit` answer `unavailable` and games quietly run without saving. The deploy workflow checks for this. Rotating the secret (`wrangler secret put RUN_SECRET` again) is optional; runs in progress at that moment just don't save.

### Score caps

Each board that takes new runs has `"plausible": { "perSecond": N, "grace": N }` and a `time_ms` meta key. A cap is sized from the game's code, not from players, so no honest run can reach it:

1. Work out the fastest a perfect player could score, with every power-up and bonus. Thimbleful: at full storm a drop every 0.38 s, about 1 in 9 gold (3 points), so about 3.2 points/s.
2. Set `perSecond` about 40% above that. Where the ceiling you worked out already ignores something that slows every real run, it can sit closer. Crack's fastest movement is tap-walking: a 1.35 ft stride about every 0.18 s, about 7.5 ft/s, on a sidewalk with no cracks at all. Heelies (7 ft/s) and moon shoes (about 5.5 ft/s) are slower. Real streets have a joint every 5 ft, so `perSecond` is 8.
3. Set `grace` to cover the biggest single burst on a short run. Crack: a pair of shoes can add about 80 ft, so `grace` is 100.
4. Where the code gives no clear ceiling, use the expert balance bot's best rate, doubled.

A cap is set once, when a board is created. A change that makes a game score faster is a scoring change, which bumps the board, and whoever makes it rechecks the cap on the new board. Raising a cap is always safe and needs no bump; before lowering one, run [Check the score caps](#check-the-score-caps).

`tools/check_boards.py` fails if a game's newest board, or the board its `BOARD` names, has no cap. Boards without one (Thimbleful 1–2, Crack 1) stay readable but take no new runs.

## One-time setup (Jonnie's Cloudflare account)

1. Install Node 22 or newer and Wrangler 4 (`npm install -g wrangler@4.148.0`). Run `wrangler login`.
2. From `scores/`, run `wrangler d1 create jonniepeed-games-scores`. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc` with the returned ID. Keep the binding named `DB`.
3. Apply the schema: `wrangler d1 execute jonniepeed-games-scores --remote --file=schema.sql`.
4. Set the run secret: `wrangler secret put RUN_SECRET`, and paste any long random string (`openssl rand -base64 32` makes one). Nobody needs to know it afterwards; it lives only in Cloudflare and survives every deploy.
5. Run `wrangler deploy`. Confirm the Worker Custom Domain in Cloudflare's Workers dashboard and that `/v2/top?game=<game-id>&board=1` returns JSON for a game id in `games.json`. Cloudflare normally supplies the Custom Domain certificate.
6. Run `BASE=https://<Worker-Custom-Domain> node test/smoke.mjs`. It writes only to a newly selected random negative test board, never a real board, and saves only a couple of rows. All boards ≤ 0 are test boards; real games never display them.
7. Run `python3 tools/check_boards.py` and `python3 tools/stamp.py` from the repository root. Deploy the site by manually running **Deploy to GitHub Pages**. Do not add automatic workflow triggers.

The hostname is configured in exactly two places: `API` in the shared client and the Worker route. No other production hostname setting is needed. Cloudflare credentials and `RUN_SECRET` belong in login/environment settings and Cloudflare, never in repository files.

## Deploying the Worker

Only changes in `scores/` need a Worker deploy: `games.json`, `blocklist.json` or `src/`. Changes in `site/` (how boards look, game code) only need the Pages deploy. A deploy replaces the Worker's code; scores live in D1 and are never touched.

Two ways, both by hand:

- **GitHub:** Actions tab → **Deploy Leaderboard Worker** → Run workflow. It runs `check_boards.py`, deploys from `scores/` with the pinned Wrangler version, then checks the live Worker answers for every game in `games.json` and hands out run tokens (test board 0, no writes). A failed token check means `RUN_SECRET` isn't set.
- **Terminal:** `wrangler deploy` from `scores/`.

When a change touches both, deploy the Worker first, then the site.

One-time setup for the GitHub workflow (repository **Settings → Secrets and variables → Actions → New repository secret**):

1. `CLOUDFLARE_API_TOKEN`: in Cloudflare, **My Profile → API Tokens → Create Token**, use the **Edit Cloudflare Workers** template, limit it to your account and the `jonniepeed.games` zone, and create it. Cloudflare shows the token once.
2. `CLOUDFLARE_ACCOUNT_ID`: the Account ID shown in the Cloudflare dashboard (Workers & Pages overview, or the account home page).

If a run fails with a permissions error, edit the token in Cloudflare rather than adding secrets anywhere in the repository. Never commit the token.

### If the scores certificate won't issue

New `*.jonniepeed.games` addresses do not automatically need their own CAA records. `jonniepeed.games` uses A records to GitHub Pages; A records do not redirect CAA lookup to GitHub. With no CAA records on the requested hostname, lookup climbs to the apex and uses its policy. Only `www.jonniepeed.games` is a CNAME to GitHub Pages, so that name follows its CNAME target during CAA lookup; sibling names such as `scores.jonniepeed.games` do not.

If no applicable CAA policy restricts issuance, no extra CAA records are required. If an applicable policy exists, it must authorize the certificate authorities used by the service. For Cloudflare Custom Domains, allow `issue` for `pki.goog`, `letsencrypt.org` and `ssl.com`. Keep Let's Encrypt allowed for GitHub Pages at the apex too. Check the exact hostname, any CNAME target and the inherited apex policy when **SSL/TLS → Edge Certificates** reports "CAA records block issuance". For a service hostname without a CNAME, add an explicit policy only when it needs to override an inherited restriction. A CNAME cannot coexist with CAA records at the same name; correct its target's policy or change the DNS layout instead. Keep the required authorizations for renewals.

After correcting CAA, a stuck certificate can take a while to retry. If it stays in error, remove the Worker's custom domain and run `wrangler deploy` again to order a fresh one.

## Local development

Use the existing checkout. A cloud task is already isolated; do not create a Git worktree unless requested.

```sh
cd scores
wrangler d1 execute jonniepeed-games-scores --local --file=schema.sql
wrangler dev --local --port 8787 --var RUN_SECRET:local-dev-only
```

The `--var` gives the local Worker a known run secret, so the tests can sign their own tokens. Without it, local games run but never save.

Leave the Worker running. In another terminal, serve the site from the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

Open the site on localhost or 127.0.0.1. Those two hostnames automatically use the local Worker on port 8787. All other page hostnames use the production API. Local D1 needs no Cloudflare login and works with the database ID placeholder. Wrangler stores local state in ignored `scores/.wrangler/`; schema application is repeatable and does not erase scores.

From `scores/`, run `node test/smoke.mjs`. Each run starts with an empty random negative board. The test never deletes any scores. The smoke runner prints one PASS/FAIL per case and exits nonzero on failure. Against the local Worker it also signs its own backdated tokens (with `local-dev-only`, or `RUN_SECRET` if set) to fill boards and test ranking, expiry and the rate limit; each request claims its own connection, which only the local Worker honours. Against the live Worker those cases are skipped, and it plays one real run end to end. To check the games, finish a qualifying run and test OK, Skip, refused initials and See all; fill a local board to test a losing run. Test portrait, short landscape and desktop, including full screen. Stop the Worker and finish another run: the original end screen should appear without an online board.

The optional browser regression runner is `python3 scores/test/games.py` from the repository root. It requires Python Playwright (`python3 -m pip install playwright`, then `python3 -m playwright install chromium`), plus the two local servers above. If system Chromium is already installed, use `CHROMIUM=/usr/bin/chromium python3 scores/test/games.py` instead of downloading a browser. It seeds isolated negative boards, drives the actual end-screen handlers with deterministic finished scores, tests the UI in all three orientations, and saves screenshots in a temporary directory (or `SCREENSHOTS=<directory>`). Its API interception changes the test board numbers and signs backdated tokens for the long test runs, leaving production boards untouched. It also checks a run whose token never arrived (no picker) and a refused save (the board without the row).

Run `node scores/test/versions.mjs` from the root to test historical-rule isolation. It starts its own ephemeral Wrangler/D1 instance with a synthetic next board and a test-only blocked name, verifies both rule sets and caps, that a board without a cap is read-only, test-board selection and name refusal, then removes that temporary database. It never contacts the live Worker or changes the production blocklist. If Wrangler is not on PATH, set `WRANGLER=/absolute/path/to/wrangler`.

## Adding a game

Checklist, in this order:

1. Choose a permanent folder/game ID and initial positive board number. Add its `boards` mapping to `scores/games.json`; put the full score range, integer meta (including `time_ms`), tie-breaks and a [score cap](#score-caps) inside the initial board entry. Add a blocked name only in `blocklist.json`, not in game code.
2. Deploy the Worker first, so the new game's board is accepted before any site copy uses it.
3. Include `../assets/leaderboard.js` before `game.js`, and add `const BOARD = 1;` to `game.js`. Use board-specific local-best keys without migrating old keys.
4. When real play begins, call `Leaderboard.start(game, BOARD)` and keep the promise on the run; don't wait for it. Reset input to `keys`. Record `touch` only when touch or pen drives the play area; menus do not count. Exclude demos and watch modes.
5. At game over, freeze the score/meta (with `time_ms`) and await the run's token. With a token, load placement and show the result in the game's end screen: a qualifying run gets the picker, other runs get the board. Without one, load the board only (no score), so the game never asks for initials it can't save. A null load adds nothing. Guard asynchronous responses against restarts, and prevent game keyboard shortcuts while the picker is open.
6. On OK, save initials, submit the frozen run with its token, and draw the returned board with `rank` highlighted. On `name_not_allowed`, keep the picker open with “Try other initials.” Any other refusal draws the original board, saying nothing. On Skip, display the original board without submitting. Keep the same token for retries. Destroy the picker on restart.
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
      "tieBreak": [],
      "plausible": { "perSecond": 6, "grace": 20 }
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
  run = { start: Leaderboard.start('pebble-hop', BOARD), input: 'keys' }; // token arrives in the background
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
  const token = await ended.start; // null if the Worker couldn't be reached when the run began
  const payload = { game: 'pebble-hop', board: BOARD, token,
    score: points, input: ended.input, meta: { time_ms: Math.round(seconds * 1000) } };
  // Without a token the run can't be saved: load the board only, so there's no placement and no picker.
  const data = token ? await Leaderboard.load(payload.game, BOARD, points, payload.meta) : await Leaderboard.load(payload.game, BOARD);
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

Hide/reset the board and invalidate `run` when leaving an end screen. A game also guards or skips the client when `window.Leaderboard` is unavailable; see the existing integrations. The shared client bounds requests to about four seconds and retries a network-failed start or submit once (a submit with the same token). It resolves failures instead of throwing into game code: `start` resolves to a token or null, and a refused submit resolves like a failed one. Initials use `jpg-initials` storage with an `AAA` default. Picker keys: letters/digits fill and advance, Left/Right select, Up/Down cycle A–Z then 0–9, Backspace selects the preceding slot, Enter confirms, Escape skips. Native buttons also support Tab and Space.

### End-screen board conventions

These are a starting point, not a template. Games should feel related so we don't rebuild the basics every time, but each one can do its end screen its own way. Copy from whichever game is closest (`showLeaderboard`, `drawLeaderboard` and the `.lb-` CSS), then change what suits the game.

The one rule worth keeping everywhere:

- **Nothing pops in under a finger.** Scores arrive a moment after game over. Never let the board or the initials picker appear in place of buttons someone may already be reaching for. Give the result a beat first. Don't Step on a Crack does it with Mom's call: the board only shows once the call is answered. Thimbleful shows "Checking the leaderboard…" where its buttons go, then asks "New high score! You're #N" with Enter initials and Skip, and only opens the picker when asked. If scores are slow, Thimbleful brings its buttons back after a couple of seconds and offers initials inside the board when it arrives.

Defaults the current games share:

- **Picker:** heading "New high score!" and a status line "You're #N. Enter your initials." OK is styled as the game's primary button (`.lb-ok`), Skip as a text link (`.lb-skip`). The shared client scrolls the whole picker into view when it opens.
- **One decision at a time:** while the picker is open, add `lb-entering` to the end screen's container so its own buttons (play again and so on) are hidden. After OK or Skip, remove it and focus the main replay button with `preventScroll`. Thimbleful also places the board below its buttons, so the buttons stay put when the board opens.
- **Top 10 in full:** no inner scroll for the top 10. "See all N" switches to a scrolling list of all 50 (`.lb-all`, sticky header), and "Show top 10" switches back.
- **Your row:** highlighted (`.lb-you`) and scrolled into view with `scrollIntoView({ block: 'nearest' })`. Below 10th, a gap row then your row.
- **Columns:** rank (narrow, muted), name (left), score, any extra columns, then the input icon. The icon column's header is visually hidden (`.lb-sr`) but still read by screen readers.
- Check portrait, landscape (including a short landscape phone) and desktop, and the game's full screen mode.

## Changing an existing game

| Change | Action |
| --- | --- |
| Raise `maxScore`, raise a score cap, add an optional meta key, widen a meta range, restyle game rows | Safe without a board bump. Deploy Worker rule changes first. |
| Change difficulty, score meaning, how fast points can come, `higherIsBetter`, `tieBreak`, or lower `maxScore` | New board: copy the newest `boards` entry to the next positive number, edit the new entry and recheck its [score cap](#score-caps) against the new code, deploy Worker first, then bump the game's `BOARD`, write its [What's new note](#whats-new-notes), run the checker and deploy site. |
| Lower a score cap | Run [Check the score caps](#check-the-score-caps) first; no real row may exceed the new cap. |
| Rename game ID, remove an accepted board or meta key, narrow a meta range, or change what a `/v2/` path means | Never within a version. A breaking API change is a new version; see [API versions](#api-versions). |

Old boards stay readable. Boards with a score cap keep taking runs after a bump, so a stale copy can still post to the board it was built for. Local best keys include BOARD and are not migrated. Each game has a `boards` object whose keys are positive board numbers and whose values contain that board's full rules. For example, to bump from 1 to 2, copy `boards["1"]` to `boards["2"]` and edit only the new entry. Keep board 1 and its scoring/ranking meaning intact. Deploy the Worker, then change the game's `BOARD` to 2, run the checker and local tests, write the What's new note, stamp links, and deploy the site. Never reuse an old number. Update tests for the new rules while retaining coverage for historical boards.

Test boards (all numbers ≤ 0) use the full rules of the newest positive board, chosen by numeric board number, independently for each game. Thus every new smoke run tests the current rules; test board 0 is still supported. Old positive boards always use their own entries, even when the newest board changes direction, limits, meta or tie-breaks.

### What's new notes

Every board bump resets the high scores, so it comes with a note that tells returning players why. A game without a note gets one at its next bump. Changes that keep the board get no note.

- **Where:** a "What's new" button on the title screen, next to High scores. Anyone can open it.
- **The dot:** the button has a dot until the note has been opened once on that device. Store the board it was opened for (for example `dsotc-news-seen`), so the next bump brings the dot back. If storage fails, show no dot rather than one that never goes away. With reduced motion, the dot doesn't pulse.
- **What it says:** only the latest change, in a few short lines (about four), then one line saying the high scores start over because the rules changed. No history; older boards are listed in the game's living doc.
- **The date:** a small line under the heading with the day the change goes live ("October 7, 2026", in a `<time>` element). Updates can be frequent, so the day matters, not just the month. If the merge slips, fix the date before deploying.
- **Old best:** if the device has a local best from an earlier board, show it ("Your best before: 312 ft").
- **Behaviour:** a dialog over the title screen with one button. Focus moves to the button, and Esc closes it. A key that would start the game closes the note instead of starting a run. It never appears during a run or on the end screen.
- **Where the text lives:** in the game's own page, tagged with the board it describes (Crack uses `data-board` on its `#news` card), so a bump is one edit. Style it like the game.

Don't Step on a Crack is the reference: `openNews` and `syncNews` in its `game.js`, and the `#news` card in its `index.html`.

## games.json field reference

- `boards`: object mapping each accepted positive board number (JSON string key, such as `"1"`) to its full rules. Every number ≤ 0 is also accepted for testing and uses the numerically newest positive board's rules. Never show test boards in real games. Keep every old entry. The following fields live inside each board entry:
- `higherIsBetter`: true sorts scores descending; false sorts ascending.
- `maxScore`: integer score range, inclusive 0 to this maximum.
- `meta`: allowed optional integer keys, each with inclusive `min`/`max`. Sent unknown keys, non-integers or out-of-range values are refused. An omitted meta object is stored as NULL; a provided object may be empty. A game sends only the keys declared on its board, frozen at game over.
- `tieBreak`: ordered `[metaKey, "asc"|"desc"]` pairs after score; absent values sort last (only rows saved before `/v2/` lack meta). An empty list means score is the only ranking field before time. After all ties, earlier creation time and ID win. A new run tying 50th never qualifies.
- `plausible`: the [score cap](#score-caps), `{ "perSecond": number > 0, "grace": number >= 0 }`. A save is refused when `score > perSecond × time_ms / 1000 + grace`. Required on a board that takes new runs, along with a `time_ms` meta key. A board without it is read-only. It assumes points pile up over time; a lower-is-better board would set it loose enough never to bind.

## API and validation

`POST /v2/start` with `{game, board}` returns `{ok, token}` for a board that takes new runs. The token is `<run id>.<issued ms>.<signature>`; games treat it as opaque.

`GET /v2/top?game=<id>&board=<integer>` returns `{ok, game, board, scores}` for any accepted board, including read-only ones. Add `score` and URL-encoded JSON `meta` for `placement` (1–50 or null). A row has rank, name, score, input and meta.

`POST /v2/submit` accepts game, board, token, name, score, input and meta (with `time_ms`); returns `{ok, id, rank, scores}`. The run ID comes from the token. Repeating a token returns the original row, even if another valid payload is sent; it does not change that run. Rows outside 50 are stored with null rank. Checks run in this order: the fields, then the token, time and score cap, then the rate limit.

All responses are JSON with CORS `*`; any OPTIONS path allows GET/POST/OPTIONS and Content-Type. There are no cookies. Bodies above 2048 bytes fail with `body_too_large`; malformed JSON fails with `bad_json`. Input failures use status 400 and `{ok:false,error}`: `bad_game`, `bad_board` (also a board without a score cap, on start and submit), `bad_name` (exactly three A–Z/0–9), `name_not_allowed`, `bad_score`, `bad_input` (touch or keys), `bad_meta` (also a missing `time_ms`). A missing, altered, expired or mismatched token, too much claimed time, or a score over the cap all answer 400 `rejected`, with no reason. Too many saves from one connection answer 429 `rate_limited`. Every `/v1/` path answers 410 `gone`. Unknown paths/methods return 404 `not_found`; a database failure or missing `RUN_SECRET` returns 503 `unavailable` with the same JSON/CORS format.

### API versions

Within a version the API stays compatible: never rename game IDs, remove boards or meta keys, narrow meta ranges, or change what a path means. A breaking change is a new version. It may retire the old one: retired paths answer 410, which the shared client treats like the Worker being down, so old copies lose only the board, never the game. `/v1/` was retired this way when `/v2/` added run tokens (SPEC-007).

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

### Why didn't a score save?

Refused saves log one line each. In the Cloudflare dashboard, open **Workers & Pages → jonniepeed-games-scores → Logs** (Workers Logs, turned on by `observability` in `wrangler.jsonc`) and search for `rejected`. From a terminal, `wrangler tail` in `scores/` shows them live. A line looks like `{"rejected":"score","game":"thimbleful","board":3,"score":900,"time_ms":60000}`. The reason is one of:

- `token`: missing, altered, or for another game or board.
- `expired`: older than 24 hours.
- `time`: the run claimed more play time than its token had existed.
- `score`: over the board's cap. If that run was honest, the cap is too low; raise it.

A run that never got a token (offline at the start) doesn't reach the Worker at all: the game just shows the board. A `rate_limited` answer isn't logged.

### Check the score caps

Dashboard SQL. The fastest saved runs on each board, as points (or feet) per second. Compare with each board's `plausible` rule before lowering one.

```sql
SELECT game, board, name, score, json_extract(meta, '$.time_ms') AS ms,
       ROUND(score * 1000.0 / json_extract(meta, '$.time_ms'), 2) AS per_s
FROM scores WHERE board > 0 AND json_extract(meta, '$.time_ms') > 0
ORDER BY per_s DESC LIMIT 20;
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
