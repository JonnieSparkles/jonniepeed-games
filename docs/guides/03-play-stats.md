# 03: Play stats

Built from [SPEC-009](../../specs/SPEC-009-play-stats.md), which records the decisions and why. This guide is the source of truth for how things work now.

Every game reports each run: when it started, how it ended, how long it lasted, and whatever that game counts. Two private dashboards read the reports back, one for all games and one per game. They're for judging whether people play, how long, how far they get and where they come from, especially around an announcement.

```text
game page (Pages, custom domain or Arweave)
    │ site/assets/stats.js  (sendBeacon, never awaited)
    ▼
Cloudflare Worker (stats/, stats.jonniepeed.games)
    ├─▶ Cloudflare D1 jonniepeed-games-stats (runs table)
    └─▶ reads D1 jonniepeed-games-scores for initials (never writes)
    ▲
dashboards at stats.jonniepeed.games/dash/, behind Cloudflare Access
```

`stats/games.json` lists the games that may report, with their display names. `stats/schema.sql` defines storage, `stats/src/index.js` serves the write API and the dashboards, `stats/src/access.js` checks the Cloudflare Access token, and `stats/src/dash.html` is the dashboard page. Tests are in `stats/test/`.

## What's collected, and what isn't

Each run sends a start, and an end at game over. When the page is hidden mid-run (tab closed, phone locked, another app), it sends a provisional end marked `quit` with the progress so far; if the player comes back and finishes, the real end replaces it. Leaving a run from a menu (Crack's Title screen, restarting from pause) reports `quit` too.

A report carries the fields in [SPEC-009](../../specs/SPEC-009-play-stats.md#what-a-run-reports): a random run ID, a random visit ID, game and board, phone/tablet/desktop, orientation, the page's hostname, the referring site's hostname, outcome, play time, score, touch or keys, the run ID from the leaderboard token, and the game's own `stats`.

- **Nothing is stored on the device.** The visit ID lives in memory for one page load. `stats.js` never reads or writes local storage, so the games need no notice or toggle. Keep it that way: a device ID or reading saved initials would change that (see SPEC-009, "Not doing now").
- **No IP address, user agent or cookie is stored.** The rate limit keys on the connection in memory only.
- **Automated browsers send nothing** (`navigator.webdriver`), so harnesses and balance bots don't count. Neither do `file://` previews.
- **Reports never touch the game.** They go out with `navigator.sendBeacon` (falling back to `fetch` with `keepalive`), nothing waits for them, and every call is wrapped so a failure stays inside `stats.js`.
- **Initials come only from the boards.** A run that got a leaderboard token reports the run ID inside it; the saved score row has the same `run_id`. Runs that weren't saved, and games with no board, have no names.

## One-time setup (Jonnie's Cloudflare account)

1. From `stats/`, run `wrangler d1 create jonniepeed-games-stats`. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `stats/wrangler.jsonc` with the returned ID and commit it.
2. Apply the schema: `wrangler d1 execute jonniepeed-games-stats --remote --file=schema.sql`.
3. Deploy the Worker (see below). Confirm the Worker Custom Domain `stats.jonniepeed.games` in the Workers dashboard. The [certificate notes](00-leaderboards.md#if-the-scores-certificate-wont-issue) in the leaderboard guide apply here too.
4. Set up Cloudflare Access, which is free for up to 50 users:
   1. In the Cloudflare dashboard open **Zero Trust**. The first time, pick a team name (for example `jonniepeed`) and the Free plan. Your team domain is then `<team>.cloudflareaccess.com`.
   2. **Access → Applications → Add an application → Self-hosted.** Name it "Play stats". Add the public hostname `stats.jonniepeed.games` with path `dash`. Sub-paths (`/dash/thimbleful/` and the data behind them) inherit it. Don't protect the whole hostname: games must be able to post to `/v1/`.
   3. Add a policy: action **Allow**, include **Emails**, and list your own address (and anyone else who should see the numbers). Login with **One-time PIN** is on by default; Google works too if you add it under **Settings → Authentication**.
   4. Save, then copy the application's **Audience (AUD) tag** from its overview.
5. Give the Worker those two values. They're settings, not passwords, but they live in Cloudflare so a deploy never overwrites them:
   ```sh
   wrangler secret put ACCESS_TEAM_DOMAIN   # e.g. jonniepeed.cloudflareaccess.com
   wrangler secret put ACCESS_AUD           # the AUD tag from step 4.4
   ```
   Until both are set, the dashboards answer "locked" to everyone.
6. Open https://stats.jonniepeed.games/dash/, sign in, and check that it loads.
7. Run `BASE=https://stats.jonniepeed.games node test/smoke.mjs` from `stats/`. It writes only rows for the hidden `test` game and checks the dashboards don't answer without Access.
8. Deploy the site with **Deploy to GitHub Pages**, so the games start reporting.

Do this a few days before announcing anything, so the dashboards have ordinary days to compare against.

## Deploying the Worker

Only changes in `stats/` need a Worker deploy: `games.json` or `src/`. Changing which stats a game sends is a site change only. When a change touches both, deploy the Worker first, then the site.

- **GitHub:** Actions tab → **Deploy Play Stats Worker** → Run workflow. It runs the Access check test, refuses to deploy while the database ID is still the placeholder, deploys from `stats/` with the pinned Wrangler version, then runs the smoke test against the live Worker (test rows only).
- **Terminal:** `wrangler deploy` from `stats/`.

It uses the same `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets as the leaderboard Worker. If the token can deploy `scores/` (which also binds D1 and a rate limiter), it can deploy this; on a permissions error, edit the token in Cloudflare.

## Reading the dashboards

- **Runs:** every run started. **Sittings:** page visits with at least one run; runs per sitting is a good sign of interest, since someone who plays five in a row cares more than someone who plays one and leaves.
- **Finished:** reached the end screen (game over or a win). **Quit:** left mid-run and never came back. **No end yet:** still playing, or the page closed before it could report; old ones are mostly the latter.
- **Run length** is play time as each game counts it (Crack and Stick Army leave out pauses), including quits. Medians, not averages: a few very long runs would pull an average up.
- **Score** and the game's own stats show a median, the middle half and a histogram, or the most common values for text. Per-game spreads read the latest 2,000 runs in the window.
- **Names** come from saved runs on the boards. "Back another day" counts initials saved on more than one (UTC) day. AAA is the picker's default, so it's left out of the counts and is likely several people.
- **Where runs came from** is the referring site's hostname. Direct covers typed links, apps that don't pass a referrer, and reloads. `jonniepeed.games` means the studio shelf. Past the top 12, the rest share one "Other sites" row, so the shares add up to every run.
- Days are Eastern time. The window buttons are 7, 30 and 90 days; `?days=` takes 1–365. A window is whole Eastern days: 7 days is today and the six before it, from midnight.

## Adding a game

1. Add its folder name and display name to `stats/games.json`. Deploy the Worker first.
2. Include `../assets/stats.js` before `game.js` (after `leaderboard.js` if it has one).
3. When real play begins (never for demos or watch modes), start a run and keep the handle on the game's run state:
   ```js
   statsRun = window.PlayStats ? PlayStats.start('pebble-hop', { board: BOARD, token: lbRun && lbRun.start, progress: runReport }) : null;
   ```
   `token` is the promise from `Leaderboard.start`, if the game has a board. `progress` returns the same shape as an end report, for a run left mid-way; read live state in it, and call `PlayStats.start` before resetting that state, so a run still open reports its real progress.
4. At game over, report: `PlayStats.end(statsRun, runReport())`, where `runReport()` returns `{ score, time_ms, input, won, stats }`. `input` is `lbRun.input` where the game tracks it; otherwise `stats.js` uses touch if a touch landed during the run. `won: true` makes the outcome `won`. `end` can be called again for the same run; the last report wins. If a run carries on after an end (a winner who keeps going), call `PlayStats.resume(statsRun)` so hiding the page mid-run reports it again.
5. When the player leaves a run from a menu, call `PlayStats.quit(statsRun)` before the state is reset.
6. Pick a few `stats` that answer "how far did they get": up to 24 short lowercase keys (`a-z`, digits, `_`), each a number, a boolean or text up to 40 characters. Numbers get histograms; text gets its most common values. Anything else is dropped in the client so one bad stat never loses the run.
7. List the stats in the game's living doc and in SPEC-009's table, run `python3 tools/stamp.py`, and add the game to `stats/test/games.py`.

## Local development

Run the scores Worker as in [the leaderboard guide](00-leaderboards.md#local-development), then the stats Worker in another terminal, sharing the scores Worker's local state so the dashboards can read initials:

```sh
cd stats
wrangler d1 execute jonniepeed-games-stats --local --persist-to ../scores/.wrangler/state --file=schema.sql
wrangler dev --local --port 8789 --inspector-port 9230 --local-upstream localhost:8789 \
  --persist-to ../scores/.wrangler/state --var DASH_OPEN:local-dev-only
```

- `--var DASH_OPEN:local-dev-only` opens the dashboards without Access, and only when the request's host is `localhost` or `127.0.0.1`. `--local-upstream` keeps that host as it is (otherwise Wrangler swaps in `stats.jonniepeed.games` and the dashboards stay locked). Never set `DASH_OPEN` on the deployed Worker.
- `--inspector-port 9230` keeps it from fighting the scores Worker over the debugger port.
- Pages on `localhost` or `127.0.0.1` report to the local Worker on port 8789. Playwright and other automated browsers don't report at all; the browser test below un-hides itself to check what a real browser would send.
- `python3 stats/test/seed.py` writes 90 days of made-up runs and saves to SQL files and prints the two commands that load them into the local databases. Never point those commands at `--remote`.

Tests:

- `node stats/test/smoke.mjs` against the local Worker: validation, the quit/finish rules, test rows staying hidden, initials from a saved score (it saves one on a negative test board through the local scores Worker), the pages, and the rate limit. With `BASE=https://stats.jonniepeed.games` it runs the live-safe subset.
- `node stats/test/access.mjs`: the Access token check, with keys made in the test. Never contacts Cloudflare.
- `CHROMIUM=/usr/bin/chromium python3 stats/test/games.py`, with the site served on port 8000: what each game reports at start, game over, hidden mid-run, restart and quit. It records beacons in the page, so no Worker is needed.

## Admin recipes

In the Cloudflare dashboard, open **Workers & Pages → D1 → jonniepeed-games-stats → Console**. Use `--local` instead of `--remote` for local data.

Runs per day for one game, Eastern time:

```sql
SELECT date(started_at, '-4 hours') AS day, COUNT(*) AS runs,
       SUM(outcome IN ('over', 'won')) AS finished, COUNT(DISTINCT visit) AS sittings
FROM runs WHERE game = 'stick-army' GROUP BY day ORDER BY day DESC LIMIT 30;
```

(`-4 hours` is daylight time; use `-5 hours` in winter. The dashboards handle this themselves.)

How far Stick Army runs get:

```sql
SELECT json_extract(stats, '$.wave') AS wave, COUNT(*) AS runs FROM runs
WHERE game = 'stick-army' AND outcome IS NOT NULL GROUP BY wave ORDER BY wave;
```

Clear the test rows written by smoke tests and deploy checks:

```sh
wrangler d1 execute jonniepeed-games-stats --remote --command="DELETE FROM runs WHERE game = 'test';"
```

Delete runs older than a year:

```sh
wrangler d1 execute jonniepeed-games-stats --remote --command="DELETE FROM runs WHERE started_at < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year');"
```

D1 Time Travel works here as it does for scores; see [Undo a database mistake](00-leaderboards.md#undo-a-database-mistake).

## Limits

- Bodies over 8 KB are refused (well above the largest valid report), and 120 reports a minute per connection (counted per Cloudflare location). A run sends two or three.
- A run's stats: 24 keys, numbers within ±10¹², text up to 40 characters. Play time up to 24 hours.
- On the Workers Free plan, D1 allows 100,000 rows written and 5 million read a day. Index updates count as writes, so a run costs about five (the start and its three indexes, then the end): roughly 15,000 runs a day before it matters. Each dashboard load reads every run in its window a few times.

## API

All write responses are JSON with `Access-Control-Allow-Origin: *`. Requests can be `text/plain` (what `sendBeacon` sends), so there's no preflight.

- `POST /v1/start` with `run`, `visit`, `game`, `board` (optional), `device`, `orientation`, `host`, `from` (optional). Repeats are ignored.
- `POST /v1/end` with the start fields plus `outcome` (`over`, `won` or `quit`), `time_ms`, and optional `score`, `input`, `score_run`, `stats`. It creates the row if the start was lost. A `quit` never replaces a finished run; a finish always replaces a `quit`.
- Both answer `{ok:true}`, or 400 `{ok:false,error}` naming the first bad field (`bad_run`, `bad_visit`, `bad_game`, `bad_board`, `bad_device`, `bad_orientation`, `bad_host`, `bad_from`, `bad_outcome`, `bad_time`, `bad_score`, `bad_input`, `bad_score_run`, `bad_stats`, `bad_json`, `body_too_large`), 429 `rate_limited`, or 503 `unavailable`.
- `game: "test"` is accepted and never shown.
- `/dash/`, `/dash/<game>/`, `/dash/api/overview?days=N` and `/dash/api/game?game=<id>&days=N` need a valid Access token. Without one they answer 403; before Access is configured, 503 `locked`.

Like the scores API, `/v1/` is baked into published copies, so it stays compatible: add fields, don't rename or remove them, and don't change what a path means. A breaking change is a new version.
