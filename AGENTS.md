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
- Pages deploys only by hand (workflow_dispatch). Never add automatic triggers.
- Build specs live in `specs/` as `SPEC-NNN-name.md`, numbered in order. Operating guides live in `docs/guides/` as `NN-name.md`, numbered in order from `00`. Each file's title starts with its number (`# SPEC-001: Name`, `# 00: Name`), and a guide built from a spec links to it at the top.
