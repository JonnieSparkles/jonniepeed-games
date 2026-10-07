# Stick Army

Built from [SPEC-002](../../specs/SPEC-002-stick-army.md), with layout from [SPEC-003](../../specs/SPEC-003-repo-layout.md) and the development shelf from [SPEC-004](../../specs/SPEC-004-side-b.md). The game is at `site/stick-army/index.html`. It appears only as the **demo** card on Side B; there is no public Side A card. No build step or network service is required. The page keeps `<meta name="robots" content="noindex">` until promotion.

## Finding and promoting the demo

On the studio page, hold the rainbow egg with a pointer, Space or Enter for about 1.4 seconds to full power, then three more seconds while its puddle grows. Alternatively open `#side-b` on the studio URL. Choose Stick Army's demo card (`stick-army/`). **Back to games** on the title, pause or game-over card uses `../`, preserving the current site mount; the selected shelf restores from `sessionStorage` during the same tab's visit. The shop and active play have no home-link overlay.

After Jonnie approves promotion, remove `data-side="b"`, `data-badge="demo"`, the `.badge` span and initial `hidden` from the card, remove the game's noindex meta tag, and update this doc and the README. Run the studio and Stick Army harnesses plus applicable preview checks, run stamp last, and publish manually. Promotion is explicit; visits and saved shelf state never promote a game. Local scores stay local. Physical iPhone Safari, difficulty and phone performance still need playtesting before featuring the game.

## Rules and input contract

Mouse, keyboard and touch all work. With a mouse, aim and hold the button to fire. On touch, touch and hold to fire, and drag to aim. Arrow keys (or A/D) aim, Space fires, P pauses, and F toggles full screen. The fullscreen button uses the native API where available and fills the window otherwise. The portrait notebook remains centred in landscape.

Start with one left trampoline and four squad slots. Shoot a body to kill, or pop a chute in the band between the two dashed pencil lines above the mat to recruit. A falling trooper arriving faster than 380 logical pixels per second rips through instead. The band marks the **chute**, not the feet. Larger mats widen the catch area without relaxing the speed limit.

The baseline crew fires slowly and aims at bodies in the lower sky. Bazookas can target aircraft; engineers repair the wall. Wounded recruits have small health marks under their feet. Rifle recruits learn to pop low chutes only after buying Catcher training.

Carpet bombers begin in wave 2 and release 3–6 bombs across the trench, crew positions and bunker. The whistle warns of a drop; bombs can be shot down. Snipers begin in wave 3, descend toward an edge, and fire at recruits from below the player's firing arc. Protect the crew so they can return fire. A sniper without any living recruits to target waits six seconds, then retreats without awarding points; it cannot stall the wave permanently.

## Supplies and pizza

Kills, captures, planes, intercepted bombs, combos and wave completion earn coins separately from score. After all enemies, aircraft, bombs and hostile shots are gone, a short wave-clear banner leads to the shop. Combat is frozen there.

Take one of two random free items. A rotating premium equipment offer sits beside **Order a pizza**, which is always available for 25 coins. Each offer can be bought once per visit, and coins carry between waves. Capped upgrades leave the pool. Repeatable repairs and a 12-coin stash keep two free choices available in long runs.

Pizza is a nod to the owner's remembered delivery Easter egg: a stick courier cycles onto the page, hands over a box, and rides away. At the handoff, the wall gains 25 health and every surviving recruit gains 1 health, capped at their maxima. Combat stays frozen, and the same shop returns afterward. Pizza does not resurrect fallen crew.

All equipment, coins and recruits reset on a new run. Only mute preference and the local best score persist. The changed rules use a fresh local-best key, `stickarmy.best.2`. Online leaderboards remain deferred by SPEC-002; this game has no `BOARD` or Worker changes.

## Tuning and extending

`site/stick-army/game.js` contains the simulation and saved preferences. `site/stick-army/audio.js` owns procedural sound through `StickArmySound.init()`, `.play(name)` and `.muted`; it loads before `game.js`. `index.html` contains layout, the title/pause/end cards and the responsive HTML shop.

Open `stick-army/#tune` on the local server (or `site/stick-army/index.html#tune` for a file preview) to load the optional `tune.js` panel. Its eight sliders change capture speed, mat-drop chance, rifle cooldown/spread, wave growth and wall damage immediately. Collapse the panel to play; **Copy values** exports JSON, with selected text as a fallback when clipboard access fails. Values are session-only and reset on reload. The panel and its script are absent without the hash.

| Area | Entry points |
| --- | --- |
| Enemy definitions and crew stats | `ENEMIES` |
| Wave size, speed, drops, bomb count, sniper chance | `waveCfg(n)` |
| Capture speed, slots and mats | `CAPTURE_SPEED`, `SLOT_ORDER`, `activeTramps`, `resizeMats` |
| Item pool, costs and stack limits | `ITEMS`: `{ id, name, desc, tier, cost, maxStacks, apply(S) }`, optional `available()` |
| Run upgrades and ownership counts | `S.mods`, `S.mods.stacks` |
| Shop transitions and transaction guards | `openShop`, `takeItem`, `continueWave` |
| Delivery intermission | `orderPizza`, `updateDelivery`, `drawCourier` |
| Projectile combinations | `shoot`, `consumeBullet`, `projectileBurst`, `hitTest`, `explode` |
| Corpses and persistent ink | `killFx`, `updateParts`, `addDecal`, `drawBodyPart` |

Double barrel and spread combine into six bullets per volley. Rockets add a separate projectile every fourth volley. Piercing normal bullets can hit three distinct targets; flak detonates once on proximity, consuming the round even when piercing is equipped. Mines rearm at the start of each wave and spare allies. Medics occupy a normal squad slot, heal other nearby recruits, and can be replaced in the shop after death. The sentry fires ordinary ally bullets and does not inherit the player's weapon upgrades.

Corpses use six red-ink line/circle pieces with gravity, bounce and a resting period. New marks stamp directly onto the ink canvas once. Only the latest 500 are retained for replay on resize; older marks stay in the current raster until resizing or starting a new run. Red flecks leave permanent ink only after landing on the ground. Reduced-motion preference disables screen shake and line boil.

## Validation and generated assets

Serve `site/` locally:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

With Python Playwright installed, run:

```sh
CHROMIUM=/usr/bin/chromium python3 tests/studio/test.py
CHROMIUM=/usr/bin/chromium python3 tests/stick-army/test.py
CHROMIUM=/usr/bin/chromium python3 tests/stick-army/ui.py
CHROMIUM=/usr/bin/chromium python3 tests/stick-army/perf.py --stress
node --check site/stick-army/audio.js
node --check site/stick-army/game.js
node --check site/stick-army/tune.js
CHROMIUM=/usr/bin/chromium SITE_URL=http://127.0.0.1:8000 python3 tools/og/make.py
python3 tools/stamp.py
```

Omit `CHROMIUM` to use Playwright's bundled browser. `SITE_URL` is optional for the preview generator; it defaults to file URLs. The regression runners default to the local server above. `SCREENSHOTS` selects the UI runner's output directory (default `/tmp/stick-army-screenshots`). Test access to simulation internals is injected into the browser response and is never shipped with the game.

The checks cover capture success/rips, slots, crew targeting, ink lifecycle, bomb payloads and damage, sniper pressure and retreat, shop transactions, pizza delivery, equipment combinations, death/restart and a real simulated wave clear. UI checks exercise fullscreen, touch/keyboard, pause and shop/delivery at desktop, portrait, short landscape and small-phone sizes. UI checks also verify live tuning and both clipboard paths. `perf.py` measures actual RAF intervals and update/render CPU time on wave 6 in a 390×844 touch viewport at DPR 2 with CDP CPU throttling at 4×. It warms up for five seconds and samples for fifteen; `--stress` adds 20 airborne enemies and 12 fresh corpses, with 500 retained ink marks. `--source-ref <commit>` compares old game code without changing the checkout (the current audio script remains loaded), and `--output <path>` saves JSON. Phone canvases use CSS-pixel resolution to reduce raster work; desktop artwork retains its high-DPI resolution.

Measured in headless Chromium on this workspace (15-second stress sample, 4× CPU throttle):

| Version | Mean RAF / FPS | RAF p95 / p99 | Mean loop CPU / p95 |
| --- | --- | --- | --- |
| Before fixes (`1e42859`) | 92.02 ms / 10.9 | 166.6 / 216.7 ms | 43.28 / 82.1 ms |
| Direct stamping + phone resolution cap | 32.71 ms / 30.6 | 66.7 / 100 ms | 6.54 / 11.8 ms |

The ink regression is fixed, but this throttled stress workload still misses 60 FPS. These are measured RAF intervals, not an FPS estimate from JavaScript execution time. Treat phone performance as an open playtest issue before featuring the game; the harness makes further renderer work reproducible.

Physical iPhone Safari and subjective difficulty still merit owner playtesting before featuring the game.

Game-owned previews are `site/stick-army/og.png` and `thumb.webp`. Shared fonts, favicons, apple-touch icon and home-link mark remain in `site/assets/`. Clean player navigation uses `stick-army/` and `../` wherever a home link is offered.

Pages publishing remains a manual workflow. Arweave publishing is paused pending the uploader/manifest follow-up in README. No Worker deploy is needed for this change.
