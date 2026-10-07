# SPEC-006: In-game feedback

A **Send feedback** button inside each game opens a short text box. The message goes to a small Worker along with the context a bug report needs: which game, which board, how the last run went, phone or desktop, portrait or landscape. Jonnie reads the messages. Nothing is shown publicly.

Status: draft, not built. Answer the open questions at the end before building. Once built, the operating guide (`docs/guides/02-feedback.md`) and the code become the source of truth, as with [SPEC-001](SPEC-001-leaderboards.md).

## Why

Feedback so far comes from playtesters Jonnie talks to. A box in the game reaches everyone else, at the moment they think of something, and it captures context people wouldn't think to mention.

## Architecture

```
game page (Pages, custom domain or Arweave)
    │  site/assets/feedback.js
    ▼
Cloudflare Worker  (feedback/, feedback.jonniepeed.games)
    ├─▶ Cloudflare D1  (one table: feedback)
    └─▶ optional: forward each message (see open questions)
```

- It's a separate service, following the naming rule in AGENTS.md: folder `feedback/`, Worker and database `jonniepeed-games-feedback`, address `feedback.jonniepeed.games`. It shares nothing with `scores/`.
- Deployed only by hand, with a new `Deploy Feedback Worker` workflow (`workflow_dispatch` only) modelled on the leaderboard one.
- **Nothing about feedback may break a game.** If the Worker is slow, down or refuses a message, the game carries on. The typed text is kept so the player can try again.

## Decisions

- **Private.** Messages are stored and read by Jonnie, never displayed. No moderation or profanity filter is needed.
- **No accounts, and no IP addresses stored.** The rate limiter may key on the connection's IP in memory, but it never reaches the database.
- **Context is attached automatically, and the player can see it.** A line under the box shows what's sent with the message, for example "Sending with: Don't Step on a Crack · board 2 · 140 ft · phone, portrait".
- **Short.** Text is 1–500 characters after trimming.
- **No Turnstile for now.** Turnstile site keys are tied to hostnames, and Arweave gateways serve from changing domains, so it would break those copies. Spam is handled by a rate limit, a hidden honeypot field, a minimum time before sending and the length cap. Revisit only if spam gets through.
- **The API is permanent, like scores.** From the first Arweave upload, the address in `feedback.js` is baked into immutable copies. Paths are versioned (`/v1/`), CORS allows any origin, and the API stays backward compatible.
- A `game` of `test` is accepted for smoke tests, never forwarded, and deleted with one recipe.

## Files

```
feedback/                      the Worker. Not published (outside site/)
  wrangler.jsonc               Worker config: D1 binding "DB", rate limit binding, custom domain route
  schema.sql                   table and index
  games.json                   game IDs allowed to send feedback (folder names, plus "test")
  src/index.js                 the Worker
  test/smoke.mjs               API tests (Node, no dependencies), local or live
  test/games.py                browser checks: the form in each game, all three layouts
site/assets/feedback.js        shared client: send() and an unstyled form
.github/workflows/feedback-worker.yml   manual deploy, like the leaderboard one
docs/guides/02-feedback.md     operating guide
```

## Database (`feedback/schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS feedback (
  id         INTEGER PRIMARY KEY,
  message_id TEXT    NOT NULL UNIQUE,   -- from the client; makes retries safe
  game       TEXT    NOT NULL,
  board      INTEGER,                   -- NULL for games without online scores (Stick Army)
  text       TEXT    NOT NULL,
  context    TEXT,                      -- JSON object, see below
  agent      TEXT,                      -- browser and OS, from User-Agent, first 160 characters
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS feedback_by_time ON feedback (created_at);
```

## API

All responses are JSON with `Access-Control-Allow-Origin: *`. `OPTIONS` answers the preflight. Request bodies over 4 KB are refused (500 characters of emoji can approach 2 KB on their own).

### `POST /v1/feedback`

```json
{
  "message_id": "uuid",
  "game": "dont-step-on-a-crack",
  "board": 2,
  "text": "the squirrel got me on the first street, felt unfair",
  "context": {
    "build": "a1b2c3d4e5", "from": "over", "input": "touch",
    "screen": "390x844", "orientation": "portrait", "fullscreen": false, "reduced_motion": false,
    "run": { "ft": 140, "time_ms": 93000, "street": 2 }
  },
  "website": ""
}
```

Answer: `{ "ok": true }`. A repeated `message_id` returns `ok` without inserting again.

Validation and error codes:
- `game` isn't in `games.json`: `bad_game`.
- `board` is neither a safe integer nor missing/null: `bad_board`.
- `message_id` isn't 8–64 characters of `A-Za-z0-9-`: `bad_message_id`.
- `text` is empty or over 500 characters after trimming: `bad_text`. Control characters other than newline are stripped first.
- `context` isn't an object of known keys with sane values: `bad_context`. Known keys:
  - `build` is the game script's `?v=` hash;
  - `from` is `pause`, `over` or `title`;
  - `input` is `touch` or `keys`;
  - `screen` is `WxH`;
  - `orientation`, `fullscreen` and `reduced_motion` are simple values;
  - `run` is an object of up to 8 integers with short lowercase keys.
- Too many messages from one connection: `rate_limited`, status 429. Use the Workers rate limiting binding, about 3 per minute. Confirm it's available on the account's plan; if not, fall back to a count of recent rows per game and a global hourly cap.
- Body problems: `body_too_large` and `bad_json`. Unknown paths return 404.

The honeypot `website` field must be empty. If it isn't, answer `ok` but store nothing, so bots learn nothing.

There is no read endpoint. Jonnie reads messages in the D1 console or by forwarding (below).

## Client (`site/assets/feedback.js`)

A classic script that defines `window.Feedback`, loaded with a relative path before `game.js`, like `leaderboard.js`. On `localhost` or `127.0.0.1` it uses the local Worker (`wrangler dev --port 8788`).

- `Feedback.send({message_id, game, board, text, context})`: posts, retries once on a network error with the same `message_id`, and times out after about 6 seconds. It resolves to the response, `{ok:false, error}` or `null`, and never throws.
- `Feedback.form(container, {game, board, context, summary, onClose})` builds plain DOM with `fb-` class names and no styling. Each game styles it to match.
  - A heading ("Send feedback"), a textarea with a 500-character limit and a live counter, and a placeholder: "What's fun, what's broken, what you'd add".
  - Below the box: "Please don't include personal info." Then the "Sending with: …" line from `summary`.
  - A honeypot field, hidden from sight, the tab order and the accessibility tree.
  - **Send** and **Cancel** buttons, and a polite live status line.
  - Send is refused, quietly, until the form has been open for 2 seconds.
  - States:
    - sending: buttons disabled;
    - sent: "Thanks! Jonnie reads every one." with a Close button;
    - failed: "Couldn't send. Try again." with the text kept.
  - Keyboard: keystrokes inside the form never reach the game's shortcuts (`stopPropagation`, like the initials picker). Esc cancels. Ctrl/Cmd+Enter sends.
  - The draft is kept in memory for the page visit, so cancelling and reopening doesn't lose it.
  - Phones: when the on-screen keyboard opens, the box and Send button stay visible. Test portrait and landscape phones.
- `context` is a function the game passes in. The form calls it when opened and adds `screen`, `orientation`, `fullscreen`, `reduced_motion` and `build` itself.

## In the games

Every game gets a **Send feedback** button in its own style. A game being built later adds it as part of its setup checklist.

| Game | Where | `from` | `run` context |
| --- | --- | --- | --- |
| Don't Step on a Crack | pause card (`#pause` stack), and the game-over phone (`#after`, next to "Walk it again") | `pause`, `over` | `ft`, `time_ms`, `steps`, `streak`, `street` (stage index), `hp` |
| Thimbleful | the overlay card, as a link button like High scores. It appears on the title and after a run, so at game over it carries the run | `title`, `over` | `score`, `time_ms`, `spills` |
| Stick Army | pause screen (`#pauseScreen`) and game over (`#overScreen`) | `pause`, `over` | `score`, `wave`, `coins`, `squad` |

- Opening the form from pause keeps the game paused. Opening it from game over or the title doesn't start a run.
- `board` is the game's `BOARD`, or missing for Stick Army.
- `input` comes from the game's existing input flag (touch or keys) where it has one.

## Forwarding (if chosen)

If a `DISCORD_WEBHOOK_URL` secret is set, the Worker also posts each message there with `ctx.waitUntil`, so the player's answer never waits on it.
- Format: game name, board, `from`, the run numbers and screen on one line, then the text quoted.
- Send `allowed_mentions: {parse: []}` so a message can never ping anyone.
- Never forward `test` messages.
- A failed forward is ignored; the row is already in D1.

An email version would use Cloudflare's `send_email` binding to a verified address instead. Pick one (see open questions).

## Tests

- **`feedback/test/smoke.mjs`:** plain Node, `BASE` defaults to `http://localhost:8788`, and it uses `game: "test"`. It covers:
  - preflight;
  - a valid message, and a repeated `message_id`;
  - a message with no `board` or `context`;
  - each error code;
  - a filled honeypot (answers `ok`, stores nothing);
  - a body over 4 KB;
  - rate limiting;
  - an unknown path.
- **`feedback/test/games.py`:** with the local Worker and site servers, it opens the form from each hook point in each game, in portrait, landscape and desktop. It checks:
  - sending works, and the right context arrives;
  - keys typed in the box don't move, jump or pause the game;
  - Esc cancels, and the draft survives reopening;
  - with the Worker stopped, the failure message shows, the text is kept and the game still plays.

## Docs

- **`docs/guides/02-feedback.md`:**
  - what it is, with the diagram above;
  - one-time setup;
  - deploying;
  - local development;
  - adding the button to a game, as a checklist with Crack as the worked example;
  - forwarding;
  - admin recipes, as D1 console steps and as commands: newest 50, by game, one message by `id`, delete one, delete `test` rows, delete messages older than a year.
- **README.md:** add `feedback/` to Layout, and a Standards bullet: "Every game has a Send feedback button; see the feedback guide."
- **AGENTS.md:** short bullets:
  - games include `feedback.js` and offer Send feedback on pause and game over;
  - the feedback API stays backward compatible like scores;
  - only `feedback/` changes need a feedback Worker deploy, by hand.
- Each game's living doc gets one line saying where its button is.

## Done when

- The smoke test passes against `wrangler dev`.
- The browser checks pass in all three games and layouts, including with the Worker stopped.
- On a real phone, the keyboard never hides the Send button. This is a Jonnie check.
- A message sent from each game shows up in the D1 console with the right context, and in the forwarding channel if one is set.
- `python3 tools/stamp.py` has been run, and the docs are updated as above.

## Not in this spec

- A feedback button on the studio homepage.
- Screenshots or attachments.
- Replying to players, or any read or admin page.
- Ratings, thumbs, or votes on ideas.
- Turnstile, unless spam shows up.

## Open questions for Jonnie

1. **Where do you want to read messages?** Discord (a channel you'd make, plus a webhook), email (to which address), or only the D1 console. The recommendation is Discord or email, so messages actually get seen.
2. **Is the name right?** "Send feedback" on the button, and "Thanks! Jonnie reads every one." after sending. The thanks line says your name; change it if you'd rather not.
3. **Should messages expire?** The suggestion is to delete after a year, with a recipe, not automatically.

## Jonnie does (needs his Cloudflare account)

1. Create the D1 database `jonniepeed-games-feedback`, put its ID in `feedback/wrangler.jsonc`, and apply `schema.sql` remotely.
2. Deploy the Worker and confirm `feedback.jonniepeed.games` answers. The CAA notes in the leaderboard guide apply here too.
3. If forwarding: `wrangler secret put DISCORD_WEBHOOK_URL` (or set up the email binding).
4. Check the existing GitHub deploy token can deploy a second Worker with D1, then run the new **Deploy Feedback Worker** workflow once.
5. Run the smoke test against the live URL (it only writes `test` rows), then **Deploy to GitHub Pages**.
