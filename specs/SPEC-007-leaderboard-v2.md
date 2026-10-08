# SPEC-007: Leaderboard v2

Make the boards harder to spoil without turning them into a security project. Each run gets a signed token from the Worker when it starts. Submits need a valid token, a believable time and a believable score, and they are rate limited. The API moves to `/v2/` and `/v1/` is retired. Old copies of the games keep playing; they just stop showing boards.

Status: built on the `leaderboard-v2` branch. Now that it's built, `docs/guides/00-leaderboards.md` and the code are the source of truth, as with [SPEC-001](SPEC-001-leaderboards.md). This spec records the decisions and why, updated with the choices made during the build (see [Build notes](#build-notes)).

## Why

Anyone can post to `/v1/submit` today. The Worker checks the score cap, meta ranges, names and duplicate run IDs, which stops nonsense but not a believable fake, a script, or a flood. One person with curl could fill a board in a minute.

## What it stops, and what it doesn't

Stops:
- Floods: too many submits from one connection are refused.
- Posting without playing: a submit needs a token issued at least as long ago as the run claims to have lasted.
- Obvious fakes: a score faster than a perfect player could earn it is refused, like 9999 in a few seconds.
- Replays: a token saves one row, ever.

Doesn't stop:
- A bot that really plays the game, or someone who edits the game in dev tools, waits out a real-length run and swaps in a human-looking score. The checks keep those scores believable. Clean them up by hand with the delete recipes in the guide.

The Worker code is public and this spec adds nothing an attacker couldn't read there. Protection rests on the secret, which never goes in the repo.

## Decisions

- **Swap to `/v2/` and retire `/v1/`.** Every `/v1/` path answers `410 {ok:false, error:'gone'}`. Old copies of `leaderboard.js` treat that like the Worker being down: no initials prompt, no board, and the game plays and ends as usual. The title-screen Scores button shows its existing "Couldn't load the scores" message. No board is reset; every row stays.
- **Silent failure everywhere.** If a run has no token or a submit is refused, the player isn't told. A new copy never asks for initials it can't save.
- **Tokens are stateless.** HMAC-signed, nothing stored, no new table.
- **No Turnstile.** As in SPEC-006, it's tied to hostnames and would break Arweave copies. HMAC tokens don't care which host serves the game.
- **No accounts, no IPs stored.** The rate limiter keys on the connection's IP in memory only.
- **This replaces the rule that old copies must keep working.** New rule: within a version the API stays compatible; a new version may retire the old one, and old copies lose only the board, never the game. README, AGENTS.md and the guide change to match.

## API (`scores.jonniepeed.games`)

### `POST /v2/start`

Body `{game, board}`. Validates both as `/v1/top` did (test boards ≤ 0 allowed), and refuses boards without `plausible` rules (see below) with `bad_board`.

Returns `{ok:true, token}` where

```
token   = run_id + "." + issued + "." + sig
run_id  = crypto.randomUUID()          (chosen by the Worker, not the client)
issued  = Date.now() on the Worker, in ms
sig     = base64url(HMAC-SHA256(RUN_SECRET, game + "|" + board + "|" + run_id + "|" + issued))
```

If `RUN_SECRET` is missing, answer `503 unavailable`, so games quietly run without boards.

### `GET /v2/top`

Same as `/v1/top` today, including `placement`.

### `POST /v2/submit`

Body `{game, board, token, name, score, input, meta}`. `run_id` is gone; it comes from the token. Checks in this order:

1. **Fields:** as `/v1/submit` did (`bad_game`, `bad_board`, `bad_score`, `bad_meta`, `bad_name`, `name_not_allowed`, `bad_input`). `meta.time_ms` is required.
2. **Token:** parses, signature matches this game and board, and `issued` is no more than 24 h old.
3. **Time:** Worker `now − issued ≥ time_ms − 5000`. The run can't have lasted longer than the token has existed. Pauses only add real time. The 5 s slack covers a start request that's retried a few seconds into the run on a flaky connection.
4. **Score:** `score ≤ perSecond × time_ms / 1000 + grace`, from the board's `plausible` rule.
5. **Rate limit:** more than 20 saved runs per 60 s from one IP (`cf-connecting-ip`) → `429 rate_limited`. Each save needs a finished run that made the board, so one player can't come close. The headroom is for players who share a connection: a school, an office, or phones on one carrier. It comes last so only runs that would be saved count; refusals cost no database writes anyway. A repeat of a token that already saved (a retry after a lost response) returns its row before the limit and isn't counted; Codex caught this in review.

Failures of 2–4 all answer `400 {ok:false, error:'rejected'}`, with no reason given. The Worker logs one line per rejection: game, board, score, time_ms and which check failed. It never logs the IP. Turn on Workers Logs (`"observability": {"enabled": true}`) if the plan includes it, so "why didn't my score save?" can be answered.

A valid submit inserts with the token's `run_id`. Posting the same token again returns the original row, as now.

### `/v1/*`

`410 {ok:false, error:'gone'}`.

## Rules (`scores/games.json`)

Each board that takes new scores gets a `plausible` rule:

```json
"plausible": { "perSecond": 4.5, "grace": 15 }
```

- **Set once, never tuned.** The rule is sized from the scoring code, not from players, so no honest run can hit it. It's set when a board is created. Anything that makes a game score faster is a scoring change, which already bumps the board, so the rule only gets revisited at a bump. Jonnie never touches it.
- It's required on each game's newest board. `tools/check_boards.py` fails if it's missing, or if that board has no `time_ms` meta.
- Older boards without it stay readable through `/v2/top` but take no new scores. After a future bump, the previous board keeps its rule, so stale copies can still post there.
- **Starting values,** from the scoring code:
  - `thimbleful` board 3: `perSecond: 4.5, grace: 15`. At full storm a drop comes about every 0.38 s and about 1 in 9 is gold (3 points), so perfect play tops out near 3.2 points/s. The best real run is 1.7.
  - `dont-step-on-a-crack` board 2: `perSecond: 8, grace: 100`. The fastest movement is tap-walking: a 1.35 ft stride about every 0.18 s, about 7.5 ft/s, and that's on a sidewalk with no cracks at all. Heelies (7 ft/s for 6 s) and moon shoes (up to 6 ft per 1.1 s for 15 s) are slower, though a pair can add about 80 ft in a burst; the grace covers that on a short run. The best real run is 1.9 ft/s. (The draft said 4 ft/s; the review found tap-walking, which an expert could exceed it with on a clear stretch.)
- Before shipping, confirm these against the scoring code once more and against every row on the current boards. Nothing real should fail:

  ```sql
  SELECT game, board, name, score, json_extract(meta,'$.time_ms') AS ms,
         score * 1000.0 / json_extract(meta,'$.time_ms') AS per_s
  FROM scores WHERE board > 0 ORDER BY per_s DESC LIMIT 20;
  ```

- Changing `plausible` never needs a board bump; it doesn't change ranking. Raising it is always safe. Before lowering it, run the query above.
- New games: work out the fastest a perfect player could score from the code, including power-ups and bonuses. Set `perSecond` about 40% above that, and `grace` to cover the biggest single burst. Where the code doesn't give a clear ceiling, use the expert balance bot's best rate, doubled.

## Worker (`scores/`)

- `src/index.js`: the endpoints above. Use Web Crypto (`crypto.subtle`, HMAC SHA-256) and compare signatures in constant time.
- `wrangler.jsonc`: add a rate limit binding:

  ```jsonc
  "ratelimits": [{ "name": "SUBMITS", "namespace_id": "<unused positive integer>", "simple": { "limit": 20, "period": 60 } }]
  ```

  Confirm the binding works on the account's plan (it needs Wrangler 4.36+). It counts per Cloudflare location and is approximate, which is fine here. If the plan doesn't have it, fall back to a per-board cap: refuse a submit when the board already has 20 rows from the last minute.
- `RUN_SECRET` is a Worker secret (`wrangler secret put RUN_SECRET`), never in the repo. For local development run `wrangler dev --var RUN_SECRET:local-dev-only`. `.dev.vars` is git-ignored in case anyone uses one.
- Rotating the secret is optional. Runs in progress at that moment just don't save.

## Client (`site/assets/leaderboard.js`)

- `start(game, board)` returns a promise of a token or `null`. It's bounded to about 4 s with the existing one-time network retry, and never throws.
- `load` uses `/v2/top`. `submit` uses `/v2/submit` and sends `token` instead of `run_id`.
- Remove `newRunId`.
- `request()` currently accepts only successful responses that include a `scores` array. Let `start` check for `token` instead.
- Any refusal (`rejected`, `rate_limited`, `gone`, errors) resolves to "not saved", the same as a network failure. Only `name_not_allowed` still asks for other initials.

## Games (Thimbleful, Don't Step on a Crack)

- **Run start:** replace `id: Leaderboard.newRunId()` with `start: Leaderboard.start(GAME, BOARD)`. Call it when real play begins, never for demos. Don't wait for it; the run starts at once.
- **Game over:** `await` the run's `start`.
  - If there's a token: load with the score, as now. A placement shows the picker, and the submit sends the token.
  - If there's no token: load without the score and show the board only, with no "New high score!" heading and no picker. If the load fails too, show nothing, as now.
- No player-facing change otherwise, no board bump, and no What's new note.
- Stick Army isn't on the boards yet. When it joins, it follows the guide's checklist, which now includes `start` and `plausible`.

## Tests

- **`scores/test/smoke.mjs`** (test boards only), moved to `/v2/`, plus:
  - `/v1/` paths answer 410.
  - Each of these is `rejected`: a missing token, a tampered token, a token for another game, a token for another board, and `time_ms` longer than the token's age.
  - A score over the rate is `rejected`.
  - A valid run: start, wait about 1.5 s, submit `time_ms: 1000` with a small score, and it saves. The same token again returns the same row.
- **`scores/test/versions.mjs`:** run its local instance with a test `RUN_SECRET`.
- **Rate limit:** the local Worker enforces the binding, so test it locally: the 21st saved run in a minute gets 429.
- **`scores/test/games.py`:** seed full boards with the long runs these tests need. Add:
  - Worker stopped at run start → no picker, the game ends normally.
  - A refused submit → the board shows without the row, and no error.
- **`tools/check_boards.py`:** fails when the newest board lacks `plausible` or `time_ms`.
- **Old client by hand:** serve `main`'s site against the new local Worker. Both games play and end normally and show no board.

## Docs

- **`docs/guides/00-leaderboards.md`:**
  - Overview: replace "no accounts, rate limits or admin page" with a short **Protection** section that says what's stopped and what isn't, as above.
  - One-time setup: `wrangler secret put RUN_SECRET`.
  - Local development: `--var RUN_SECRET:local-dev-only`.
  - Adding a game: `start` at run start, `plausible` on the board, and the token-aware end screen. Update the worked example.
  - Changing a game: add `plausible` to the table.
  - Replace the "Never" row and the "old boards stay open, including old Arweave copies" paragraph with the new version rule.
  - API reference: `/v2/`.
- **`.github/workflows/leaderboard-worker.yml`:** the post-deploy check calls `/v2/top`, and asks `/v2/start` for a token, which fails loudly if `RUN_SECRET` was never set.
- **README.md** "Online scores" bullet and **AGENTS.md** API bullet: within a version, never rename game IDs, remove boards or meta keys, or narrow meta ranges. A new version may retire the old one; old copies must lose only the board, never the game.
- **AGENTS.md** board-bump bullet: any change to how fast a game can score (pace, bonuses, power-ups) is a scoring change, so it bumps the board, and whoever makes it rechecks the new board's cap against the code. That's what keeps the caps from needing anyone to remember them.
- **Arweave note in the guide:** the version live at the first Arweave upload is baked into those copies. Retiring it later silently removes their boards, which the new rule allows.

## Deploy order

1. `wrangler secret put RUN_SECRET` (once).
2. Deploy the Worker. From this moment `/v1/` is gone, and the live site quietly shows no boards.
3. Deploy the site straight after. The gap is a few minutes and costs nothing but boards in that window.
4. Run the smoke test against the live Worker.

## Done when

- Smoke, versions and UI tests pass locally. Smoke passes live.
- Both games, against the local Worker:
  - A qualifying run saves.
  - A run with the Worker down at start shows no picker.
  - A refused submit shows the board without the row.
  - All of this works in portrait, landscape and desktop.
- The old client check passes.
- The `plausible` query shows no real row over its board's rule.
- `check_boards.py` and `stamp.py` have been run, and the docs are updated.

## Not in this spec

- Server-side replay or checking of runs.
- Accounts, device IDs, or counting unique players.
- An admin page.
- Turnstile.

## Build notes

Choices made while building:

- **Tests sign their own tokens.** Tests that need long runs or full boards can't wait out real time. Against the local Worker (known secret `local-dev-only`) or an isolated fixture, they sign tokens backdated by an hour. That also covers expiry (a token signed 25 h ago), so there's no test-only lifetime setting. Against the live Worker, `smoke.mjs` skips those cases and plays one real run end to end.
- **The local Worker honours a client-sent `cf-connecting-ip`, and Cloudflare replaces it in production.** Local tests give each request its own connection, so the rate limit stays out of the way except in its own test.
- **The rate limit comes last** (see the check order above), so refusals and validation errors never count toward it.
- **`games.py` seeds through the API** with signed tokens rather than raw SQL. Its finished runs claim 2,000 s of play, so their test scores sit under the caps.
- **The deploy workflow asks for a token**, so a missing `RUN_SECRET` fails the deploy check instead of quietly switching boards off.
- **The per-board fallback rate limit isn't built.** The binding worked locally. If the first deploy refuses it on the plan, the fallback goes in then.
- **Old copies against the new Worker:** both games played and ended normally and showed no board. The browser's own "Failed to load resource" console line for the 410 is the same one a down Worker produces.

## Jonnie does

1. `wrangler secret put RUN_SECRET` from `scores/` (any long random string; `openssl rand -base64 32`).
2. Deploy the Worker. The deploy itself fails if the plan refuses the rate limit binding (say so and the fallback goes in), and the workflow's check fails if the secret is missing.
3. Deploy the site straight after, then run the live smoke test: `BASE=https://scores.jonniepeed.games node test/smoke.mjs` from `scores/`.
