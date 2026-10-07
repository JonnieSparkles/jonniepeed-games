# 01: Balance bots

Built from [SPEC-005](../../specs/SPEC-005-balance-bots.md). Stick Army is the only game opted in so far.

Balance bots play many seeded runs headless, at several skill levels, and report how far they get, what ends them, and what they capture and buy. Use them to check a tuning change against the same seeds before and after. They measure difficulty, not fun: feel, readability and phone performance still come from playtesting, and when the bots and a playtest disagree, the playtest wins.

## Running

Install Python Playwright and Chromium as for the browser checks in the README. The runner serves `site/` itself, so no local server is needed.

```sh
python3 tools/balance/run.py stick-army --runs 200
python3 tools/balance/run.py stick-army --runs 200 --skills decent --ref main
python3 tools/balance/run.py stick-army --runs 10 --verify
```

| Flag | Default | What it does |
| --- | --- | --- |
| `--runs N` | 50 | Plays seeds 1..N for each skill. |
| `--seeds 1-20,42` | | Explicit seeds instead of `--runs`. |
| `--skills` | `casual,decent,expert` | Profiles from `tools/balance/profiles.json`. A game can override them in `tests/<slug>/profiles.json`. |
| `--jobs N` | 4 | Parallel browsers, one page each. |
| `--cap-minutes M` | 40 | Simulated time cap per run. A run that hits it is reported as a timeout, which also catches stuck states. |
| `--ref <commit>` | | Also plays the same seeds against another commit (its site and adapter, checked out to a temporary worktree, with the current bot and profiles) and reports both side by side. The commit must already contain the game's adapter. |
| `--verify` | | Replays every run twice more, in reverse order and once with cosmetic effects on, and fails if any record differs. |
| `--out DIR` | `work/balance/<timestamp>/` | Where `results.json` and `summary.md` go. `work/` is git-ignored; paste summaries into PRs instead of committing them. |

`CHROMIUM` selects a system browser, as in the other harnesses. A page simulates roughly 400× real time, so a 20-minute run takes about three seconds; 40 seeds × 3 skills take two to three minutes with four jobs. Regenerate a summary from saved results with `python3 tools/balance/report.py work/balance/<timestamp>/results.json`.

## Reading the report

`summary.md` has a section per skill:

- **Wave reached:** median, quartiles and range, mean score and median simulated length.
- **Survival:** the share of runs alive at the start of each wave.
- **How runs end:** the game-over cause (the last thing to hurt the wall), timeouts, and runs stuck in the shop, each with its median wave.
- **Per wave:** the mean per run that reached the wave for each column the game lists in its `balance.json`.
- **Shop:** how often each item was offered and taken, and the median wave of runs that took it. That is correlation, not cause: good runs buy more.
- **Odd:** timeouts, stuck runs, or no captures at all.

With `--ref`, the old numbers sit beside the new ones. "changed" marks only differences clearly beyond run-to-run noise: a median wave that moves by a full wave or more and also differs on a rank test (Mann-Whitney), or survival at a wave that differs (two-proportion test), each at about 99% confidence (z of 2.58). Outcomes are often bimodal, so a median alone can jump on noise.

## Rules

- Run by hand. Nothing runs in a workflow.
- A tuning PR for an opted-in game includes a before/after summary (`--ref`) for at least the decent profile.
- Recalibrate the profiles when they drift from the owner's own runs. The current calibration puts decent near the owner's wave-12 run.

## Profiles

| Profile | Reaction | Aim error | Notices new targets | Picks up a target | Aim speed | Heat discipline | Shop |
| --- | --- | --- | --- | --- | --- | --- | --- |
| casual | 350 ms | ±4° | after 0.6 s | 0.45 s | 2.5 rad/s | none, fires into overheat | mostly random |
| decent | 220 ms | ±2° | after 0.3 s | 0.62 s | 4 rad/s | stops at 90% heat, resumes at 55% | heuristic |
| expert | 120 ms | ±0.8° | immediately | 0.5 s | 6 rad/s | stops at 80%, resumes at 45% | heuristic, keeps a cushion before hiring |

The bot acts on observations `reaction_ms` old. Its aim sweeps at `aim_speed` once a new target is picked up (`switch_s`), and it holds the trigger while it has a target. Results are very sensitive to `switch_s`: in Stick Army, a few hundredths of a second decide whether a strong build outpaces the spawn rate for good.

## How it fits together

| Path | Role |
| --- | --- |
| `tools/balance/run.py` | Command line, static server, parallel workers, `--ref` worktree, `--verify`. Game-agnostic. |
| `tools/balance/driver.js` | Runs in the page. Plays one run at a time in chunks of fixed 1/60 s steps, applies the reaction delay, and folds the event log into one record per run: per-wave event counts, amount sums, and breakdowns by `by`, `cause`, `source`, `reason`, `kind`, `type` and `item`. |
| `tools/balance/report.py` | Writes `summary.md`. |
| `tools/balance/profiles.json` | Shared skill profiles. |
| `tests/<slug>/balance.json` | The page, the script that receives the test bridge (`script`, inserted before `inject_before`), and the report's per-wave columns. |
| `tests/<slug>/balance.js` | The adapter: the hook contract below, evaluated inside the game's scope through the bridge. Never shipped. |
| `tests/<slug>/bot.js` | The bot: `window.__balanceBot(profile, seed)` returns `{ decide(observation), shop(observation) }`, each answering with actions for `act`. It sees only `observe()` copies. |

The runner installs Playwright's clock before loading the page, injects the bridge into the response, evaluates the adapter, waits two animation frames so the game's own scheduled frame has fired, then loads the bot and driver.

## Opting in a game

The adapter implements this on `window.__balance`:

```js
start(seed, options)  // fresh run in a known state; options.fast (default true) may skip cosmetic work
step(dt)              // game logic only, never render()
observe()             // plain JSON copies the bot can read
act(actions)          // player input paths only: aim, fire, shop buttons, continue
status()              // { over, wave, score, t, mode }
drain()               // events since the last call, each { ev, wave, t, ...data }
```

The game needs:

1. **Seeded randomness split from cosmetics.** Content and outcomes come from seeded streams; particles, shake and line boil use `Math.random`. Drawing or not drawing must not change a run. Prove it with a test that compares outcomes with different cosmetic randomness and with rendering on (Stick Army's `case-10-seeds.js`), and with `--verify`.
2. **A seed in the hash** for humans: `#seed=42`, parsed as `&`-separated tokens so it combines with other hash options.
3. **A no-op `emit(type, data)`** at key moments. Use `amount` for quantities and the detail keys above for breakdowns; `game_over` (with `cause`), `shop_offer` (`free`, `premium`) and `purchase` (`item`, `cost`) feed the report's dedicated sections.
4. **A frame loop the harness can stop.** The adapter replaces the game's loop with a no-op; nothing else may advance the game between driver calls.

Then add `balance.json`, `balance.js` and `bot.js` in `tests/<slug>/`, and check `--verify` reports no mismatches.
