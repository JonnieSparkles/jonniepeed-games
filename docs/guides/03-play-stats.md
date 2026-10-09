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

Done once, in order. Run the terminal steps from the `stats/` folder.

1. **Create the database:** `wrangler d1 create jonniepeed-games-stats`. Wrangler then offers to add it to the config for you: answer **no**. The config already has a `DB` entry waiting; a second entry under another name would leave the Worker without its database. Copy the `database_id` it prints into the `DB` entry in `stats/wrangler.jsonc` (replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`) and commit it. If you answered yes by mistake, `git checkout wrangler.jsonc` undoes it; `wrangler d1 list` shows the ID again. If Wrangler asks whether local development should use the remote database, answer **no**.
2. **Create the table:** `wrangler d1 execute jonniepeed-games-stats --remote --file=schema.sql`, and answer yes when it asks to proceed. It ends with "Executed 3 queries".
3. **Put the Worker online:** `wrangler deploy` (or the GitHub workflow below). It ends with `stats.jonniepeed.games (custom domain)`. The [certificate notes](00-leaderboards.md#if-the-scores-certificate-wont-issue) in the leaderboard guide apply if the address doesn't work.
4. **Lock the dashboards with Cloudflare Access** (free for up to 50 users). In the Cloudflare dashboard, open **Zero Trust**. An Access setup has two parts: a **policy** says who may in, and an **application** says which address to guard. Saving a policy alone guards nothing.
   1. **Access controls → Policies:** create a policy with action **Allow**, include **Emails**, and your address. Leave MFA and just-in-time access off; the remote desktop (RDP) settings don't apply to a web page.
   2. **Access controls → Applications → Add an application → Self-hosted and private → Public DNS → Continue.** Destination: subdomain `stats`, domain `jonniepeed.games`, path `dash`. Don't leave the path empty: games must still be able to post to `/v1/`. Pages under `/dash/` are covered. Leave browser rendering off.
   3. Under **Access policies**, add the existing policy from step 1. Keep "Accept all available identity providers" on. Save the application.
   4. Check it in the list under **Applications**: it should show destination `stats.jonniepeed.games/dash` and your policy.
5. **Find the two values the Worker needs.**
   - **Team domain:** Zero Trust makes a team name for you (something like `super-hall-d326`); you can rename it in Zero Trust settings. The team domain is `<team name>.cloudflareaccess.com`. The surest way to see it: open `https://stats.jonniepeed.games/dash/`; the Cloudflare sign-in page's address starts with it. A rename takes a while to settle (see "If you can't get in" below), so rename before this step, not after.
   - **AUD tag:** open the application → **Additional settings** tab, and copy the **Application Audience (AUD) Tag**, a 64-character string. Not the Application ID beside it. It's also the `kid=` value in the sign-in page's address.
6. **Give them to the Worker.** They're settings, not passwords, but they live in Cloudflare so a deploy never overwrites them. Each command asks for the value; paste it and press Enter:
   ```sh
   wrangler secret put ACCESS_TEAM_DOMAIN   # e.g. sparklelabs.cloudflareaccess.com
   wrangler secret put ACCESS_AUD           # the AUD tag
   ```
7. **Open https://stats.jonniepeed.games/dash/** and sign in. You should see the Play stats page, empty until the games report.
8. Optionally run `BASE=https://stats.jonniepeed.games node test/smoke.mjs` from `stats/`. It writes only rows for the hidden `test` game.
9. **Put the games online:** Actions tab → **Deploy to GitHub Pages** → Run workflow. From then on every run reports.

Do this a few days before announcing anything, so the dashboards have ordinary days to compare against.

### If you can't get in

What the dashboard page says tells you where it's stuck:

| You see | It means | Fix |
| --- | --- | --- |
| "Play stats are locked", with no Cloudflare sign-in first | Access isn't guarding the page, or the Worker has no Access values yet | Check the application exists with path `dash` (step 4), then set both values (step 6) |
| A Cloudflare sign-in, then "Play stats are locked" | Access works; the Worker is missing one of the two values | Run both `wrangler secret put` commands (step 6) |
| A Cloudflare sign-in, then "Sign in first" | The Worker didn't accept the sign-in | Run `wrangler tail` in `stats/` and load the page: a `dash_denied` line names the reason. `audience`: re-enter the AUD tag (check it against `kid=` in the sign-in address). `unknown_key` or an `error`: `ACCESS_TEAM_DOMAIN` is wrong or its team isn't answering yet (open `https://<team domain>/cdn-cgi/access/certs`; it should show `{"keys":[`) |
| "Unable to find your Access organization" | A team rename hasn't settled yet | Wait and try again; it can take a while. The Worker accepts sign-ins issued under either name meanwhile, as long as `ACCESS_TEAM_DOMAIN` is the name whose `/cdn-cgi/access/certs` page works |

"Sign in with Cloudflare" uses your Cloudflare account, so in a browser already signed in to Cloudflare it goes straight through. One-time PIN (a code by email) is the other option, under Zero Trust's login methods.

## Deploying the Worker

Only changes in `stats/` need a Worker deploy: `games.json` (including switching a game on or off) or `src/`. Changing which stats a game sends is a site change only. When a change touches both, the Worker goes live on merge and the games with the next Pages deploy, which is the right order.

- **Automatic:** merging a change to `stats/` into `main` runs **Deploy Play Stats Worker** by itself. It's the only automatic deploy in the repo (Pages and the leaderboard Worker stay manual). It runs the Access check test, refuses to deploy while the database ID is still the placeholder, deploys from `stats/` with the pinned Wrangler version, then runs the smoke test against the live Worker (test rows only). If it fails, the old Worker keeps running; check the Actions tab.
- **By hand:** Actions tab → **Deploy Play Stats Worker** → Run workflow, for a redeploy without a change.
- **Terminal:** `wrangler deploy` from `stats/`.

It uses the same `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets as the leaderboard Worker. If the token can deploy `scores/` (which also binds D1 and a rate limiter), it can deploy this; on a permissions error, edit the token in Cloudflare.

## Reading the dashboards

- **Runs:** every run started. **Sittings:** page visits with at least one run; runs per sitting is a good sign of interest, since someone who plays five in a row cares more than someone who plays one and leaves.
- **Finished:** reached the end screen (game over or a win). **Quit:** left mid-run and never came back. **No end yet:** still playing, or the page closed before it could report; old ones are mostly the latter.
- **Run length** is play time as each game counts it (Crack and Stick Army leave out pauses), including quits. Medians, not averages: a few very long runs would pull an average up.
- **Score** and the game's own stats show a median, the middle half and a histogram, or the most common values for text. Per-game spreads read the latest 2,000 runs in the window.
- **Names** come from saved runs on the boards. "Back another day" counts initials saved on more than one (UTC) day. AAA is the picker's default, so it's left out of the counts and is likely several people.
- **Where runs came from** is the referring site's hostname. Direct covers typed links, apps that don't pass a referrer, and reloads. `jonniepeed.games` means the studio shelf. Past the top 12, the rest share one "Other sites" row, so the shares add up to every run.
- **Boards:** a game with a leaderboard gets board pills (All boards, Board 3, Board 2…) on its page, and the choice is kept in the address (`?board=3`) so a link opens the same view. One board narrows every figure on the page, including names and saves. All boards adds a **By board** table, one row per board, for comparing play before and after a board change; each name's best is shown with its board, since scores on different boards follow different rules. Only boards seen in play stats appear, so runs from before play stats existed aren't counted.
- Days are Eastern time. The window buttons are 7, 30 and 90 days; `?days=` takes 1–365. A window is whole Eastern days: 7 days is today and the six before it, from midnight.

## Turning a game's stats off and on

Each game in `stats/games.json` can be switched off:

```json
"stick-army": { "name": "Stick Army", "reporting": false }
```

- **Off** (`"reporting": false`): the Worker refuses new reports from that game. The game itself is unaffected; its reports are refused quietly. Its past runs stay on the dashboards.
- **On:** remove `"reporting": false` (or set it to `true`).

Either way, merging the change deploys the stats Worker by itself. No site deploy is needed.

**When to turn a game on is the owner's call.** A game in early development should be off, so testing doesn't fill the numbers. The usual moment is when it goes to public testing or moves to the Side A shelf. Ask Jonnie before turning it on, and the [promotion checklist](../../README.md#side-b-and-promotion) has a step for it so it isn't forgotten. Plays on `localhost` never reach the real stats either way.

## Adding a game

1. Add its folder name and display name to `stats/games.json` with `"reporting": false`; merging it deploys the Worker. Wire up the steps below as usual; the game starts reporting only once it's switched on (see above).
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
- Both answer `{ok:true}`, or 400 `{ok:false,error}` naming the first bad field (`bad_run`, `bad_visit`, `bad_game`, `bad_board`, `bad_device`, `bad_orientation`, `bad_host`, `bad_from`, `bad_outcome`, `bad_time`, `bad_score`, `bad_input`, `bad_score_run`, `bad_stats`, `bad_json`, `body_too_large`, `reporting_off` for a game switched off in `games.json`), 429 `rate_limited`, or 503 `unavailable`.
- `game: "test"` is accepted and never shown.
- `/dash/`, `/dash/<game>/`, `/dash/api/overview?days=N` and `/dash/api/game?game=<id>&days=N` need a valid Access token. Without one they answer 403; before Access is configured, 503 `locked`.

Like the scores API, `/v1/` is baked into published copies, so it stays compatible: add fields, don't rename or remove them, and don't change what a path means. A breaking change is a new version.
