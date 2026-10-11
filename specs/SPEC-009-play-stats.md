# SPEC-009: Play stats

Every game reports each run to a small Worker: when it started, how it ended, how long it lasted, and whatever that game cares about (a wave, feet walked, drops caught). Two private dashboards read it back: one for all games, one per game. The point is to have numbers in place before announcing anything, so a launch can be judged against ordinary days.

Status: built. Once merged, the operating guide ([03: Play stats](../docs/guides/03-play-stats.md)) and the code are the source of truth, as with [SPEC-001](SPEC-001-leaderboards.md).

## Why

The leaderboards only see runs good enough to save, and only for games that have a board. They can't say how many people played, how many runs they played in a sitting, how far most people get, or where they came from. The Worker logs show that `/v2/start` was called, but not for which game.

## Decisions (Oct 8)

- **A separate Worker,** following the naming rule in AGENTS.md: folder `stats/`, Worker and database `jonniepeed-games-stats`, address `stats.jonniepeed.games`.
  - The scores API is a permanent contract once copies reach Arweave. Stats will keep changing.
  - The traffic is different: two or three reports per run, not a few saves.
  - A bug or a deploy here can't take the boards down.
- **No device ID, and nothing stored on the device.** The client keeps a visit ID in memory for one page load, so runs can be grouped into sittings, and forgets it when the page closes. It never writes to or reads from local storage. That keeps the games free of notices, toggles and banners.
- **Initials come from the boards.** A run that gets a leaderboard token carries the run ID from that token. The score row for a saved run has the same `run_id`, so the dashboards can show initials on every saved run. Returning players are judged by initials seen on more than one day. Runs that aren't saved, and games without a board (Stick Army for now), have no names.
- **Each game chooses its own numbers.** The client fills in the common fields. A game adds a small `stats` object of numbers, booleans and short strings. Adding a stat means changing the game, not redeploying the Worker. The dashboards chart whatever arrives.
- **Private dashboards** at `stats.jonniepeed.games/dash/`, served by the Worker, behind Cloudflare Access (free for up to 50 users). The Worker also checks the token Access signs, so the data can't be reached around it. Nothing about the dashboards is on the public site.
- **Days are counted in Eastern time.**
- **Nothing about stats may change or slow a game.** Reports are sent with `sendBeacon` and never awaited. If the Worker is down, the game doesn't notice.
- **Automated browsers send nothing** (`navigator.webdriver`), so the harnesses and balance bots don't fill the numbers with test runs.

## What a run reports

The client sends a start and an end. If the page is hidden mid-run (the tab closed, the phone locked, another app opened), it sends a provisional end with outcome `quit` and the progress so far. A later real end replaces it, so a player who comes back and finishes counts as finished.

| Field | Where it comes from |
| --- | --- |
| `run` | a random UUID for this run, made by the client |
| `visit` | a random UUID for this page load, held in memory only |
| `game`, `board` | the game; `board` is its `BOARD`, or missing |
| `device` | `phone`, `tablet` or `desktop`, from pointer type and screen size |
| `orientation` | `portrait` or `landscape` when the run started |
| `host` | the page's hostname, so Arweave copies and stray local runs can be told apart |
| `from` | the hostname of the page that linked here, if any (the referrer, hostname only) |
| `outcome` | `over` (game over), `won`, or `quit` |
| `time_ms` | play time, as the game counts it |
| `score` | the run's score, if the game has one |
| `input` | `touch` or `keys`, as for the leaderboards |
| `score_run` | the run ID from the leaderboard token, when there is one |
| `stats` | the game's own numbers |

No IP address, user agent, cookie or device ID is stored. The rate limiter keys on the connection's IP in memory only, as the scores Worker does.

## Per game

| Game | `score` | `stats` |
| --- | --- | --- |
| Thimbleful | drops caught | `golds`, `spills`, `earned` (spills won back), `storm` (0–100, how far the storm got) |
| Don't Step on a Crack | feet walked | `steps`, `streak`, `street` (1–6), `giants` (giant steps used) |
| Stick Army | score | `wave`, `kills`, `captured`, `popped`, `planes`, `zeppelins`, `tanks`, `crew`, `fallen`, `tags`, `cause`; after a campaign win, also `won_at`, and `endless` once it kept going |
| Unruggabull II (switched off) | souls freed | `stage` (1–9) and `stage_name` (accounts, moving, all_staff, lights_out, copy_room, phase_1 to phase_3, cleared), `cause`, `continues`, `boss_hp`, `smashes`, `best_rally`, `wipes`, `deflects` |

Stick Army reports a win as soon as the victory card shows. A winner who keeps going reports again (if the page is hidden mid-run, and at the final game over), and the last report wins.

## Dashboards

**Overall** (`/dash/`): runs, sittings (visits), runs per sitting, finish rate, median run length and total time played; runs per day stacked by game; a table per game; phone, tablet and desktop; portrait and landscape; where players came from; names seen and names seen on more than one day.

**Per game** (`/dash/<game>/`): the same figures for one game; runs per day split by outcome; spread of run length and score; for each of the game's own stats, the median, the middle half and a histogram (or the most common values for text); devices, input and sources; names from its boards with runs saved, days seen and best score; the 50 most recent runs with their stats and, when saved, initials.

Windows of 7, 30 or 90 days. The dashboards read the scores database too, read-only, through a second D1 binding.

## Not doing now

- Unique or returning players beyond initials. A random ID kept on the device would count them, but it needs a notice and an opt-out to be clean, and the games shouldn't carry either. Revisit if the numbers turn out to need it.
- A public read API.
- Events inside a run (each shop pick, each wave). Per-run totals answer the launch question; finer events can come later as more `stats` keys or a second table.
