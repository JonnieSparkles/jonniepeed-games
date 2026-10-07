# Stick Army

Built from [SPEC-002](../../specs/SPEC-002-stick-army.md), with layout from [SPEC-003](../../specs/SPEC-003-repo-layout.md) and the development shelf from [SPEC-004](../../specs/SPEC-004-side-b.md). The game is at `site/stick-army/index.html`. It appears only as the **demo** card on Side B; there is no public Side A card. No build step or network service is required. The page keeps `<meta name="robots" content="noindex">` until promotion.

## Finding and promoting the demo

On the studio page, hold the rainbow egg with a pointer, Space or Enter for about 1.4 seconds to full power, then three more seconds while its puddle grows. Alternatively open `#side-b` on the studio URL. Choose Stick Army's demo card (`stick-army/`). **Back to games** on the title, pause or game-over card uses `../`, preserving the current site mount; the selected shelf restores from `sessionStorage` during the same tab's visit. The shop and active play have no home-link overlay.

After Jonnie approves promotion, remove `data-side="b"`, `data-badge="demo"`, the `.badge` span and initial `hidden` from the card, remove the game's noindex meta tag, and update this doc and the README. Run the studio and Stick Army harnesses plus applicable preview checks, run stamp last, and publish manually. Promotion is explicit; visits and saved shelf state never promote a game. Local scores stay local. Physical iPhone Safari, difficulty and phone performance still need playtesting before featuring the game.

## Rules and input contract

Mouse, keyboard and touch all work. With a mouse, aim and hold the button to fire. On touch, touch and hold to fire, and drag to aim. Arrow keys (or A/D) aim, Space fires, P pauses, and F toggles full screen. The barrel sweeps continuously from slightly below horizontal on the left (`AIM_MIN`) to slightly below horizontal on the right (`AIM_MAX`, `AIM_DIP` = 0.3 rad). The dip is enough to shoot landers at the wall and in the near field, not the far field or snipers at the edges. When tipped down, the barrel draws in front of the bunker. The fullscreen button uses the native API where available and fills the window otherwise. The portrait notebook remains centred in landscape.

Start with one left trampoline and four squad slots. Shoot a body to kill, or pop a chute over the mat to recruit. A falling trooper arriving faster than `CAPTURE_SPEED` (680 logical pixels per second) rips through instead, which in practice only happens to chutes popped right under the planes. There are no guide lines. Larger mats widen the catch area without relaxing the speed limit.

A trooper falling without a chute squashes any enemy he lands on (`crush`), including snipers: 30 points each, with combo. This is the player's skill answer to landers, borrowed from the original Paratrooper.

The turret overheats. Each volley adds `HEAT_PER_SHOT` heat, scaled by the fire-rate upgrade so heat per second stays the same, and heat bleeds off at `COOL_RATE` per second. Reaching full heat locks the gun for `OVERHEAT_LOCK` seconds ("too hot!", steam, a hiss), during which it cools to 35%. A dashed gauge arcs over the dome while the gun is warm, and the barrel reddens as it heats. Each volley also costs `SHOT_COST` points (1, as in Paratrooper), never taking the score below zero. Cooling fins (free supply, three stacks) cut heat per shot by 20% each.

The baseline crew fires slowly and aims at bodies in the lower sky. Bazookas can target aircraft; engineers repair the wall. Wounded recruits have small health marks under their feet. Rifle recruits learn to pop low chutes only after buying Catcher training.

All crew damage goes through `hurtRecruit`. Bombs wound by distance (a direct hit still kills a bare recruit), landers punch, and snipers shoot. Two free supplies make the crew sturdier. **Dig in** (`S.mods.trench`, two stacks) cuts every kind of crew damage by 40%, then 60% (`TRENCH`), and draws sandbag rows in front of each crew group. **Helmets** (`S.mods.helmet`, three stacks) add 1 health to current and future recruits (`crewMax`), and are drawn on everyone but engineers and medics. Dug in with helmets, a recruit survives a direct bomb hit.

Carpet bombers begin in wave 2 and release 3–6 bombs across the trench, crew positions and bunker. The whistle warns of a drop; bombs can be shot down. Snipers begin in wave 3, descend toward an edge, and fire at recruits from below the player's firing arc. With no crew left, they shoot the turret instead (`sniperHitsTurret`): each hit adds 0.25 heat (which can tip a hot gun into overheating) and chips 3 wall. A red "sniper!" callout marks each one as he lands. Counters are the crew, mines, the sentry, or squashing him with a popped trooper. A sniper with no crew to target leaves after `abandonAfter` (14 s) without awarding points, so he can't stall a wave.

## Zeppelin boss

Every fifth wave (`BOSS_EVERY`) is a boss wave, announced as "zeppelin incoming!". `waveCfg` drops the bombers and halves the planes, and those escort planes keep to a high lane (y 98–118) above the zeppelin. About 3.5 seconds in, the zeppelin enters from a random side with a low horn. It patrols between `ZEP.LEFT` and `ZEP.RIGHT` until it is shot down, so the wave can't clear while it flies. Turning is a cartoon flip: `p.face` eases through zero, so the hull squashes, stops and heads back. Its health is `30 + BOSS_HP_PER_WAVE × wave` (70 at wave 5), shown in a small red bar riding just above the hull, with a tick at half.

While on screen it drops a paratrooper from the gondola every 3.4 s and a three-bomb cluster from its belly every 6.5 s. Gondola drops are ordinary troopers, so they can be caught. Hits leave holes where they land (more as it weakens) that leak gas wisps, and it sinks toward the page as it loses health. At half health it turns angry: red-tinted, faster, dropping every 2.4 s and bombing every 4.5 s, with the horn again. The hull hit test is an ellipse narrowed while turning, plus the gondola (`planeHit`). It lives in `S.planes` as `kind: 'zeppelin'`, so flak, rockets, bazookas and the ambience treat it as an aircraft. Idle rifles and the sentry also shoot at it when nothing closer needs them (`pickTarget`).

Shooting it down awards `250 + 30 × wave` points (with combo), a "zeppelin down!" banner and its share of dog tags. Three crew bail out on chutes for last-chance catches. It then falls nose-first in flames, with small blasts along the hull, flattening other airborne troopers but not its own bailing crew, and crashes in three ground explosions.

## Supplies and pizza

The shop currency is **dog tags** (the balance is still `S.coins` in code). Kills, captures, planes, intercepted bombs, combos and wave completion earn tags separately from score. Every award spawns a tag that flies from where it was earned into the counter (`flyTags`, `TAG_HUD`); in a pile-up, new tags fold into one already in flight. The tag is drawn once into a cached sprite (`dogTag`). After all enemies, aircraft, bombs and hostile shots are gone, a short wave-clear banner leads to the shop. Combat is frozen there.

Take one of two random free items ("Free pick"). The locked continue button reads "Pick one first" until you do. "Spend your dog tags" offers one rotating premium item, **Hire a rifleman** whenever a squad slot is free (35 tags, plus 15 for each earlier hire this run; `price(item)` handles items with computed costs), and **Order a pizza** (always available, 25 tags). Unaffordable items say how many more tags they need. Each offer can be bought once per visit, and tags carry between waves. Flak rounds burst only near planes and bombs, and the bursts spare paratroopers, even ones jumping from the plane that was hit. A direct hit on a trooper's body or canopy acts as a plain bullet, so catches still work with flak. Every supply has a pencil icon drawn with the battlefield pen in `icons.js` (`StickArmyIcons`, used through `ICONS` and `drawItemIcon`); add one when adding an item. Capped upgrades leave the pool. Repeatable repairs and a 12-tag stash keep two free choices available in long runs.

Pizza is a nod to the owner's remembered delivery Easter egg: a stick courier cycles onto the page, hands over a box, and rides away. At the handoff, the wall gains 25 health and every surviving recruit gains 1 health, capped at their maxima. Combat stays frozen, and the same shop returns afterward. Pizza does not resurrect fallen crew.

The pause card lists the upgrades you own (`kitText`, shared with the shop's kit line; repeatable buys are left out). The game-over card names what brought the wall down, from the last source to hurt it (`OVER_CAUSE`: bombs, landers or snipers), and adds a zeppelins-downed line once one has fallen (`S.stats.zeppelins`). All equipment, tags and recruits reset on a new run. Only mute preference and the local best score persist. The changed rules use a fresh local-best key, `stickarmy.best.2`. Online leaderboards remain deferred by SPEC-002; this game has no `BOARD` or Worker changes.

## Tuning and extending

`site/stick-army/game.js` contains the simulation and saved preferences. `site/stick-army/icons.js` holds the shop's supply icons: a classic script that loads before `game.js` and defines `StickArmyIcons(kit)`, which `game.js` calls once with its pen helpers and colors. Each icon is then drawn with the icon canvas context as `G`. `site/stick-army/audio.js` owns procedural sound through `StickArmySound.init()`, `.play(name)`, `.ambience(state)` and `.muted`; it loads before `game.js`. The game calls `ambience` about every 80 ms with whether a wave is live, the flying planes and whether the wall is below 30%. Ambience is a wind bed, up to three propeller drones that follow and pan with the nearest planes, distant artillery thumps during waves, and a heartbeat while the wall is low, all on one bus that fades out outside active play and when muted. The zeppelin gets a deeper, louder drone. Cues: a bugle at wave start, the arpeggio at wave clear, a shop jingle, an overheat hiss, a ready ping when the gun unlocks, a squash, and for the zeppelin a horn, a soft canvas thup per hit and a groan going down. `index.html` contains layout, the title/pause/end cards and the responsive HTML shop.

Open `stick-army/#tune` (or `#tune&seed=42`, see below) on the local server (or `site/stick-army/index.html#tune` for a file preview) to load the optional `tune.js` panel. Its fourteen sliders change turret fire cooldown, heat per shot, cooling, overheat lockout, points per shot, capture speed, mat-drop chance, rifle cooldown/spread, wave growth, wall damage and zeppelin health per wave immediately (a live zeppelin keeps its health fraction). Collapse the panel to play; **Copy values** exports JSON, with selected text as a fallback when clipboard access fails. Values are session-only and reset on reload. The panel and its script are absent without the hash.

| Area | Entry points |
| --- | --- |
| Enemy definitions and crew stats | `ENEMIES` |
| Wave size, speed, drops, bomb count, sniper chance | `waveCfg(n)` |
| Capture speed, slots and mats | `CAPTURE_SPEED`, `SLOT_ORDER`, `activeTramps`, `resizeMats` |
| Turret heat, shot cost and aim range | `BALANCE.FIRE_COOLDOWN`, `HEAT_PER_SHOT`, `COOL_RATE`, `OVERHEAT_LOCK`, `SHOT_COST`, `fireVolley`, `updateHeat`, `AIM_DIP` |
| Landing on enemies | `crush` |
| Zeppelin boss | `BOSS_EVERY`, `ZEP`, `BALANCE.BOSS_HP_PER_WAVE`, `spawnZeppelin`, `updateZeppelin`, `hurtZeppelin`, `zeppelinDown`, `planeHit`, `drawZeppelin`, `drawBossBar` |
| Item pool, costs and stack limits | `ITEMS`: `{ id, name, desc, tier, cost, maxStacks, apply(S) }`, optional `available()` |
| Run upgrades and ownership counts | `S.mods`, `S.mods.stacks` |
| Shop transitions and transaction guards | `openShop`, `takeItem`, `continueWave` |
| Delivery intermission | `orderPizza`, `updateDelivery`, `drawCourier` |
| Projectile combinations | `shoot`, `consumeBullet`, `projectileBurst`, `hitTest`, `explode` |
| Corpses and persistent ink | `killFx`, `updateParts`, `addDecal`, `drawBodyPart` |

Double barrel and spread combine into six bullets per volley. Rockets add a separate projectile every fourth volley. Piercing normal bullets can hit three distinct targets; flak detonates once near an aircraft or bomb, consuming the round even when piercing is equipped, and against troopers it is a plain bullet. Mines rearm at the start of each wave and spare allies. Medics occupy a normal squad slot, heal other nearby recruits, and can be replaced in the shop after death. The sentry fires ordinary ally bullets and does not inherit the player's weapon upgrades.

Corpses use six ink line/circle pieces with gravity, bounce and a resting period: red for enemies, blue for fallen recruits. Kills near the ground leave a permanent splat; midair kills leave a spatter that fades in about a second, so the sky stays clean. New marks stamp directly onto the ink canvas once. Only the latest 500 are retained for replay on resize; older marks stay in the current raster until resizing or starting a new run. Red flecks leave permanent ink only after landing on the ground. Reduced-motion preference disables screen shake and line boil.

## Seeds, events and balance bots

Randomness comes in streams ([SPEC-005](../../specs/SPEC-005-balance-bots.md)). `RW` (wave content: spawn timing, aircraft, drops, trooper types, the zeppelin) and `RS` (shop offers) are reseeded at every `startWave` from the run seed, so wave *n* is the same for a seed however earlier waves went. Each aircraft takes one draw from `RW` to seed its own sub-stream (`p.rng`) and pre-rolls its troopers (`p.kits`, from `rollTrooper`), so shooting it early doesn't change who jumps or what follows. `RC` covers combat outcomes (crew aim and timing). `R` and `rr` are cosmetic only and use `Math.random`. Shop offers walk a seeded shuffle of each tier and take the first eligible items (`offer`), so they change only when eligibility does. `newGame` picks a random seed unless `RUN.force` (harnesses) or `#seed=N` sets one; the hash is `&`-separated tokens (`hashTokens`), so `#tune&seed=42` works.

`emit(type, data)` does nothing in normal play; harnesses set `emitHook`. Events: `wave_start`, `wave_clear`, `plane_spawn` (with drops and trooper types), `trooper_spawn`, `kill` (`by` player, crew, explosion, crash, squash; explosions add `source`), `chute_pop` (`overMat`), `capture`, `rip`, `splat`, `land`, `recruit_lost` (`cause` bomb, lander, sniper), `wall_damage` and `wall_repair` (`source`, `amount`; wall changes go through `hurtWall` and `repairWall`), `bomb_dropped`, `bomb_intercepted`, `plane_down`, `coins` (`amount`, `reason`), `shop_offer`, `purchase` (`item`, `tier`, `cost`), `pizza` and `game_over` (`cause` is the last source to hurt the wall).

The balance adapter (`tests/stick-army/balance.js`) stops the page's frame loop and sound. In fast mode (the default) it also skips cosmetic effects (`addDecal`, `puff`, `burst`, `killFx`, `addText`, `flyTags`); runs with effects on restore them. The bot (`tests/stick-army/bot.js`) ranks bombs bound for the bunker or crew, then chutes over a mat (it aims at the canopy's outer edge to capture), troopers about to land or at the wall (as low as the barrel dips), aircraft, then other chutes. Its shop is one function: free pick by situation, then the rotating premium if it's on a good list, hiring, and pizza last when the wall is low. Run it with `python3 tools/balance/run.py stick-army`; the [balance bots guide](../guides/01-balance-bots.md) covers flags, profiles and the report.

First baseline (40 seeds per skill, 40-minute cap, after the flak fixes):

| Skill | Median wave (quartiles) | Alive at wave 8 / 10 / 15 | How runs end |
| --- | --- | --- | --- |
| casual | 7 (6–8) | 30% / 10% / 5% | bombs 22, landers 12, snipers 4, time cap 2 |
| decent | 9 (8–47) | 90% / 48% / 42% | bombs 22, time cap 16, landers 2 |
| expert | 46 (9–47) | 82% / 62% / 60% | time cap 24, bombs 9, landers 6, sniper 1 |

What the bots found:

- **Flak spoiled captures and then blocked trooper kills.** A flak round that hit a canopy burst harmlessly above the body, and bursts near planes killed troopers as they jumped. Both are fixed: bursts spare paratroopers, and direct hits act as bullets. With the old behaviour, decent and expert medians were 8 and 7.5 waves; they are now 9 and 46.
- **Runs split in two.** Most runs end between waves 7 and 9, mostly to bombs, but runs that survive that stretch tend to last until the time cap. Pressure stops rising around wave 13: the spawn interval bottoms out at wave 7 and fall speed at wave 13, and later waves only get longer. A build whose kill rate beats the spawn rate (flak, spread, double barrel, the sentry) survives indefinitely. Expert runs that bought flak reached a median of wave 47; those that didn't, about 6 (correlation, not cause).
- **A lander can stall a wave.** With only an engineer and a medic left, one lander at the wall matches the engineer's repairs (6 HP/s each way) and the wave never ends unless the player dips the barrel to shoot him.

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
CHROMIUM=/usr/bin/chromium python3 tools/balance/run.py stick-army --runs 10 --verify
node --check site/stick-army/audio.js
node --check site/stick-army/game.js
node --check site/stick-army/icons.js
node --check site/stick-army/tune.js
CHROMIUM=/usr/bin/chromium SITE_URL=http://127.0.0.1:8000 python3 tools/og/make.py
python3 tools/stamp.py
```

Omit `CHROMIUM` to use Playwright's bundled browser. `SITE_URL` is optional for the preview generator; it defaults to file URLs. The regression runners default to the local server above. `SCREENSHOTS` selects the UI runner's output directory (default `/tmp/stick-army-screenshots`). Test access to simulation internals is injected into the browser response and is never shipped with the game.

The checks cover seeds and events (the same seed gives the same wave content and shop offers after different play, runs vary without a seed, `#seed` parsing, cosmetic randomness and drawing never changing outcomes, the event hook), the zeppelin (boss cadence, patrol and turning, drops, hull hit test, holes, flak, anger and sinking, idle rifles, payout, bail-outs, crash and wave clear), capture success/rips, crush, crew damage reduction, snipers vs the turret, anti-air flak, hiring, dog tags, the barrel dip, overheat and shot cost, midair ink, shop icons, slots, crew targeting, ink lifecycle, bomb payloads and damage, sniper pressure and retreat, shop transactions, pizza delivery, equipment combinations, death/restart and a real simulated wave clear. UI checks exercise fullscreen, touch/keyboard, pause and shop/delivery at desktop, portrait, short landscape and small-phone sizes. UI checks also verify live tuning and both clipboard paths. `perf.py` measures actual RAF intervals and update/render CPU time on wave 6 in a 390×844 touch viewport at DPR 2 with CDP CPU throttling at 4×. It warms up for five seconds and samples for fifteen; `--stress` adds 20 airborne enemies and 12 fresh corpses, with 500 retained ink marks. `--source-ref <commit>` compares old game code without changing the checkout (the current audio script remains loaded), and `--output <path>` saves JSON. Phone canvases use CSS-pixel resolution to reduce raster work; desktop artwork retains its high-DPI resolution.

Measured in headless Chromium on this workspace (15-second stress sample, 4× CPU throttle):

| Version | Mean RAF / FPS | RAF p95 / p99 | Mean loop CPU / p95 |
| --- | --- | --- | --- |
| Before fixes (`1e42859`) | 92.02 ms / 10.9 | 166.6 / 216.7 ms | 43.28 / 82.1 ms |
| Direct stamping + phone resolution cap | 32.71 ms / 30.6 | 66.7 / 100 ms | 6.54 / 11.8 ms |

The ink regression is fixed, but this throttled stress workload still misses 60 FPS. These are measured RAF intervals, not an FPS estimate from JavaScript execution time. Treat phone performance as an open playtest issue before featuring the game; the harness makes further renderer work reproducible.

Physical iPhone Safari and subjective difficulty still merit owner playtesting before featuring the game.

Game-owned previews are `site/stick-army/og.png` and `thumb.webp`. Shared fonts, favicons, apple-touch icon and home-link mark remain in `site/assets/`. Clean player navigation uses `stick-army/` and `../` wherever a home link is offered.

Pages publishing remains a manual workflow. Arweave publishing is paused pending the uploader/manifest follow-up in README. No Worker deploy is needed for this change.
