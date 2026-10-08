# AGENTS.md

Follow the **Standards** section in README.md on every change. In short:

- Games and scenes: full screen mode, work in portrait, landscape and desktop.
- Every page sets `*{touch-action:manipulation}` so quick taps don't zoom on iPhones.
- After any change in `site/`: run `python3 tools/stamp.py`.
- New or changed game art: run `python3 tools/og/make.py`.
- No backward compatibility for pages and paths: delete old paths, no redirects. Shared code and the scores API are the exceptions.
- Shared code in `site/` (anything more than one page loads, like `site/assets/leaderboard.js`) stays backward compatible: add, don't rename or remove, and don't change what an existing call does unless the same change updates every page that uses it. Check every page that loads it; games with harnesses must still pass them.
- Before adding scores to a game, or changing scoring, `BOARD` or `scores/games.json`, read `docs/guides/00-leaderboards.md`.
- Scoring or ranking changes bump the board; deploy the Worker first. Any change to how fast a game can score (pace, bonuses, power-ups) is a scoring change: recheck the new board's score cap (`plausible`) against the code. See "Score caps" in `docs/guides/00-leaderboards.md`.
- Every board bump updates the game's What's new note, or adds one: the latest change only, in a few short lines. See "What's new notes" in `docs/guides/00-leaderboards.md`.
- The scores API (`/v2/`) stays compatible within a version: never rename game IDs, remove boards or meta keys, narrow meta ranges, or change what a path means. A new version may retire the old one; old copies must lose only the board, never the game. See "API versions" in the leaderboard guide.
- `RUN_SECRET` lives only in Cloudflare (`wrangler secret put`). Never put it in the repo; local runs use `--var RUN_SECRET:local-dev-only`.
- Run `python3 tools/check_boards.py` after touching `BOARD` or `games.json`.
- Studio name is JonniePeed Games (capital P).
- Don't commit or push to `main` unless the user says to in the conversation. Deliverables go in the repo, not zip files.
- Backend services are named after their repo folder: folder `name/`, Worker and database `jonniepeed-games-name`, address `name.jonniepeed.games` (so `scores/` is `scores.jonniepeed.games`). Features can have friendlier names in docs and buttons ("leaderboards").
- New `*.jonniepeed.games` addresses do not automatically need their own CAA records: the apex uses A records to GitHub Pages, so CAA lookup inherits the apex policy without following GitHub's CNAME. Only `www` is a CNAME. Any applicable CAA policy must allow the service's certificate authorities (for Cloudflare, `pki.goog`, `letsencrypt.org`, `ssl.com`); check closer records and CNAME targets before adding an override. See the certificate section of `docs/guides/00-leaderboards.md`.
- Pages and the leaderboard Worker (`scores/`) deploy only by hand (workflow_dispatch). Never add automatic triggers. Only `scores/` changes need a Worker deploy.
- Build specs live in `specs/` as `SPEC-NNN-name.md`, numbered in order. Repo operations guides only live in `docs/guides/` as `NN-name.md`, numbered in order from `00`. Each file's title starts with its number (`# SPEC-001: Name`, `# 00: Name`), and a guide built from a spec links to it at the top.
- Living game docs live in `docs/games/<slug>.md`, with unnumbered titles and links to their historical specs. Player help belongs inside each game.
- Only shared resources belong at the top of `site/assets/`. Studio-only files go in `site/assets/studio/`; game-owned cards (`og.png`), thumbnails (`thumb.<ext>`) and other art go in the owning game folder. Keep formats and remove retired games from the shelf and preview generator; scores API records remain.
- Per-game browser harnesses live in `tests/<slug>/`; backend API tests remain in `scores/test/`.
- Balance bots: the shared runner lives in `tools/balance/`; each opted-in game keeps its adapter (`balance.js`), bot (`bot.js`) and config (`balance.json`) in `tests/<slug>/`. Output goes to `work/`, which is git-ignored and never committed. Run by hand, never in a workflow. See `docs/guides/01-balance-bots.md`.
- A tuning PR for a game with balance bots includes a before/after summary (`--ref`) for at least the decent profile. Bots measure difficulty, not fun; when they disagree with playtesting, playtesting wins.
- Keep sound in game-local `audio.js` with a small init/play/muted API. Best-score storage and run state stay in game.js. Split around 2,000 lines or a clear seam; use classic scripts and explicit globals, loading audio/data before game.js, with no ES modules. Keep tuning opt-in.
- Player-facing links use `<slug>/` from the studio and `../` from games back home. Keep assets relative and entry files named index.html. No slashless aliases or base bootstrap.
- Arweave publishing is paused until the uploader follow-up. A manual manifest must use root index.path `index.html` and include every game's `<slug>/` entry with the same transaction ID as `<slug>/index.html`, including unlisted games. Confirm uploader support and test an ar.io gateway before resuming publishing.
