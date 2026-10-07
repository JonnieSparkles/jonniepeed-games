# AGENTS.md

Follow the **Standards** section in README.md on every change. In short:

- Games and scenes: full screen mode, work in portrait, landscape and desktop.
- After any change in `site/`: run `python3 tools/stamp.py`.
- New or changed game art: run `python3 tools/og/make.py`.
- No backward compatibility: delete old paths, no redirects.
- Before adding scores to a game, or changing scoring, `BOARD` or `scores/games.json`, read `docs/guides/00-leaderboards.md`.
- Scoring or ranking changes bump the board; deploy the Worker first.
- The scores API stays backward compatible: never rename game IDs, remove boards or meta keys, narrow meta ranges, or change `/v1/`.
- Run `python3 tools/check_boards.py` after touching `BOARD` or `games.json`.
- Studio name is JonniePeed Games (capital P).
- Don't commit or push to `main` unless the user says to in the conversation. Deliverables go in the repo, not zip files.
- Backend services are named after their repo folder: folder `name/`, Worker and database `jonniepeed-games-name`, address `name.games.sparklelabs.org` (so `scores/` is `scores.games.sparklelabs.org`). Features can have friendlier names in docs and buttons ("leaderboards").
- Every new `*.games.sparklelabs.org` address needs its own CAA records (`issue` for `pki.goog`, `letsencrypt.org`, `ssl.com`), because `games.` points to GitHub. See the certificate section of `docs/guides/00-leaderboards.md`.
- Pages and the leaderboard Worker (`scores/`) deploy only by hand (workflow_dispatch). Never add automatic triggers. Only `scores/` changes need a Worker deploy.
- Build specs live in `specs/` as `SPEC-NNN-name.md`, numbered in order. Repo operations guides only live in `docs/guides/` as `NN-name.md`, numbered in order from `00`. Each file's title starts with its number (`# SPEC-001: Name`, `# 00: Name`), and a guide built from a spec links to it at the top.
- Living game docs live in `docs/games/<slug>.md`, with unnumbered titles and links to their historical specs. Player help belongs inside each game.
- Only shared resources belong at the top of `site/assets/`. Studio-only files go in `site/assets/studio/`; game-owned cards (`og.png`), thumbnails (`thumb.<ext>`) and other art go in the owning game folder. Keep formats and remove retired games from the shelf and preview generator; scores API records remain.
- Per-game browser harnesses live in `tests/<slug>/`; backend API tests remain in `scores/test/`.
- Keep sound in game-local `audio.js` with a small init/play/muted API. Best-score storage and run state stay in game.js. Split around 2,000 lines or a clear seam; use classic scripts and explicit globals, loading audio/data before game.js, with no ES modules. Keep tuning opt-in.
- Player-facing links use `<slug>/` from the studio and `../` from games back home. Keep assets relative and entry files named index.html. No slashless aliases or base bootstrap.
- Arweave publishing is paused until the uploader follow-up. A manual manifest must use root index.path `index.html` and include every game's `<slug>/` entry with the same transaction ID as `<slug>/index.html`, including unlisted games. Confirm uploader support and test an ar.io gateway before resuming publishing.
