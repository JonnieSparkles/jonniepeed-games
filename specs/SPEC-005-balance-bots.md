# SPEC-005: Balance bots

Status: spec only. Implementation comes in a later PR, Stick Army first. Other games opt in later.

## Why

Long runs are slow to test by hand. By wave 8 a Stick Army run is about ten minutes old, and every tuning change means playing those minutes again. Bots fill that gap. A bot plays hundreds of runs headless at high speed, at several skill levels, and reports how far players get, what kills them, what they capture and what they buy. The same seeds can also be run before and after a change, so a tuning PR can show what it did.

Bots measure difficulty, not fun. Feel, readability, phone performance and whether a run is enjoyable still come from playtesting. The aim is to spend human time on those, not on grinding to wave 8.

## What exists today

Stick Army's tests already contain most of the pieces:

- `tests/stick-army/test.py` injects a test-only bridge into `game.js` through a response rewrite (`window.armyTest`). Nothing is shipped to players.
- The simulation runs without drawing: `update(dt)` advances the game, and `render()` is separate.
- Randomness flows through one variable, `R` (currently `Math.random`). `case-06-flow.js` swaps it for `mulberry(23)` to get repeatable runs.
- `case-06-flow.js` contains a small aiming bot that plays real combat to a wave clear and through the shop.
- `tests/stick-army/perf.py --source-ref <commit>` already compares the current code with an older commit without changing the checkout.

This spec turns those pieces into a shared tool with a stable contract.

## Layout

| Path | What lives there |
| --- | --- |
| `tools/balance/` | The shared runner, used for every game: command line, parallel runs, skill profiles, reports and comparisons. It is a repo tool like `tools/og/make.py`: run by hand, game-agnostic, not pass/fail. |
| `tests/<slug>/balance.js` | The game's adapter. It implements the hook contract below against the game's internals, and is injected the same way the existing tests inject their bridge. |
| `tests/<slug>/bot.js` | The game's bot brain: how to play this particular game. |
| `work/balance/` | Run output. Git-ignored and never committed; paste summaries into PRs instead. |

The runner is not under `tests/` because it isn't a pass/fail test and it serves every game. The adapter and bot sit with each game's other harnesses, following the existing per-game rule.

## The hook contract

Each opted-in game exposes one test-only object through its adapter, injected and never shipped:

```js
window.__balance = {
  game: 'stick-army',
  start(seed, options) {},   // begin a fresh run in a known state; options may set a start wave or loadout later
  step(dt) {},               // advance the simulation by dt seconds without drawing
  observe() {},              // plain JSON the bot can read: positions, velocities, wave, coins, wall, squad, shop offers
  act(actions) {},           // apply inputs: aim, fire, shop choices, continue
  status() {},               // { over, wave, score, t, mode }
  drain() {}                 // return and clear the event log since the last call
};
```

Rules:

- **Fixed timestep.** The runner always steps 1/60 s. `step` runs game logic only and never calls `render()`.
- **Player paths only.** `act` uses the same functions a player triggers (`aimAt`, the fire input, `takeItem`, `continueWave`, pizza). Bots never edit game state directly, so they can't do anything a player can't.
- **Plain data.** `observe` returns copies, not live game objects, so a bot can't change state by accident.
- **Whole runs in the page.** The runner hands the bot and the run settings to the page and lets it play many steps per call, in chunks, rather than calling back and forth every frame. That's what makes runs fast.

## Seeded randomness (game change)

Stick Army draws all randomness from `R`, including cosmetic effects, and `render()` uses it too (screen shake). So a seed alone doesn't reproduce a run: drawing or not drawing changes the sequence, and so does anything the player does. Split it into separate streams:

| Stream | Used for | Seeded from |
| --- | --- | --- |
| Waves | Plane timing and direction, drop positions, trooper types, bombers, bomb counts, snipers, shop offers | run seed + wave number, so wave *n* is identical for a given seed however the earlier waves went |
| Combat | Bullet spread, crew aim, anything else that changes outcomes during a wave | run seed |
| Effects | Particles, ink, screen shake, line boil | `Math.random`; never affects outcomes |

Normal play picks a random seed at the start of each run, so nothing changes for players. Opening the game with `#seed=42` uses that seed for every run in the session. Because frame timing varies, a human run won't replay exactly, but the same seed always brings the same waves and the same shop offers. That's enough to retry a nasty wave or compare tuning on identical content. Parse the hash as `&`-separated tokens so `#tune&seed=42` works alongside the tuning panel.

## Events

The game calls a small `emit(type, data)` at key moments. It does nothing in normal play; the adapter attaches a listener. This is the only other change to shipped code, and it also lays the groundwork for a future in-game run report that uses the same event names.

Stick Army events: `wave_start`, `wave_clear`, `kill` (by player, crew, explosion, crash), `chute_pop`, `capture`, `rip`, `splat`, `land`, `recruit_lost` (cause), `wall_damage` (source and amount), `wall_repair`, `bomb_dropped`, `bomb_intercepted`, `plane_down`, `coins` (amount and reason), `shop_offer`, `purchase` (item and cost), `pizza`, `game_over` (wave, score, cause).

## The Stick Army bot

Start from the aiming bot in `case-06-flow.js` and grow it:

- **Targeting** in priority order: bombs heading for the bunker or trench, chutes over the trampoline in the capture window (aim for the canopy edge to capture), troopers about to land, then planes. Lead targets using bullet speed.
- **Shop:** a simple, readable heuristic. Take squad slots and repairs when the wall or crew is weak, otherwise firepower, and save for a premium item when it's affordable within a wave. Keep it in one function so it's easy to change, and record every choice.
- **Pizza** when the wall is low and coins allow.

### Skill profiles

Shared defaults live in `tools/balance/profiles.json`; a game can override them.

| Profile | Reaction delay | Aim error | Notices a new target | Shop |
| --- | --- | --- | --- | --- |
| casual | 350 ms | ±4° | after ~0.6 s | mostly random |
| decent | 220 ms | ±2° | after ~0.3 s | heuristic |
| expert | 120 ms | ±0.8° | immediately | heuristic, saves for premium |

Reaction delay means the bot acts on observations that are that many milliseconds old. Bot randomness (aim error, shop picks) uses its own seeded stream, so results stay repeatable.

These numbers are starting guesses. Calibrate them once against the owner's own runs: if the owner usually reaches wave 6, "decent" should land near there.

## The runner

```sh
python3 tools/balance/run.py stick-army --runs 200 --skills casual,decent,expert
python3 tools/balance/run.py stick-army --runs 200 --skills decent --ref main
```

- Serves `site/` itself (or uses `SITE_URL`) and launches Chromium the same way the existing harnesses do (`CHROMIUM` selects a system browser).
- Runs in parallel pages (`--jobs`, default 4). Seeds are 1..N unless `--seeds` is given, so the same command always plays the same runs.
- Caps simulated time per run (default 40 minutes). A run that hits the cap is reported as a timeout, which also catches stuck states like the sniper stall fixed in SPEC-002.
- `--ref <commit>` runs the same seeds, skills and bot against another commit (site and adapter checked out to a temporary worktree, as `perf.py --source-ref` does) and reports both side by side.
- Writes `results.json` (one record per run) and `summary.md` to `work/balance/<timestamp>/`.
- Speed target: a 20-minute run simulates in 5 seconds or less, and 200 runs × 3 skills finish in about 15 minutes on a laptop.

## The report

`summary.md`, per skill:

- How far runs get: median and quartiles of the wave reached, plus a survival curve (share of runs alive at the start of each wave).
- How runs end: causes of game over, and the wave they happen in. This should catch things like early deaths with no recruits.
- Per wave: chutes popped, captures, rips, splats, wall damage by source, repairs, recruits lost by cause, coins earned and spent.
- Shop: how often each item is offered and taken, and the median wave reached by runs that owned it. That is correlation, not cause; say so in the report.
- Timeouts and anything odd, such as zero captures across a whole skill level.

With `--ref`, every number appears next to the old one. A change is flagged only when it is clearly larger than run-to-run noise: for example, the median wave moves by a full wave or more, or survival at a wave differs beyond a simple confidence interval. Small wobbles are not called out.

## Rules for using it

- Run by hand, like everything else here. Nothing runs automatically or in a workflow.
- A tuning PR for an opted-in game includes a before/after summary for at least the "decent" profile.
- Numbers don't override playtesting. When the bots and the owner disagree, the owner wins, and the profiles get recalibrated.

## Other games

A game opts in by adding `tests/<slug>/balance.js` and `tests/<slug>/bot.js`. Older games may first need their logic separated from drawing and their randomness split into streams. Adapters for Thimbleful and Don't Step on a Crack are follow-up work, not part of this spec.

## Implementation for the later PR

1. **Stick Army game changes:** seeded wave, combat and effects streams; `#seed=` with `&`-separated hash tokens (keep `#tune` working); a no-op `emit` with the events above. No change to how the game plays or feels with a random seed.
2. **Tests:** update cases that swap `R` to use the new streams. Add a check that the same seed produces identical wave content and shop offers.
3. `tests/stick-army/balance.js` and `tests/stick-army/bot.js`.
4. `tools/balance/run.py`, `tools/balance/profiles.json`, and the report and comparison code (standard library plus Playwright, like the other tools).
5. Add `work/` to `.gitignore`.
6. Docs: README (layout and how to run it), AGENTS.md (where runners, adapters and bots live, and the rule for tuning PRs), and `docs/games/stick-army.md` (how to run it, plus a first baseline summary).
7. Run `python3 tools/stamp.py` after the site changes.

## Acceptance checks for the later implementation

- Running the same seeds, code, bot and skill twice produces identical per-run results.
- Without `#seed`, runs still vary. With `#seed=42`, two sessions get identical plane, drop and trooper sequences and shop offers for at least waves 1–3, checked through the event log.
- Bots act only through `act`, and `act` only uses player input paths.
- Skill ordering holds: expert reaches clearly further than decent, and decent further than casual.
- 200 runs × 3 skills finish within the time target. Timeouts are reported, not hidden.
- `--ref` on a known change (for example raising wall damage from 6 to 9) shows the expected drop and flags it.
- Nothing from `tests/` or `tools/` ships in `site/`. The only shipped additions are the seeded streams, `#seed`, and the no-op `emit`.
- The existing Stick Army test, UI and performance harnesses and the studio tests still pass. Stamp is clean on a second run.
