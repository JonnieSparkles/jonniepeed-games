# 01: Stick Army

Built from [SPEC-002](../../specs/SPEC-002-stick-army.md). The game is at `site/stick-army/index.html`; it stays off the studio shelf until Jonnie approves the listing. No build step or network service is required.

## Playing

Aim with the mouse or drag on the page; hold to fire. Arrow keys (or A/D) aim, Space fires, P pauses, and F toggles full screen. The fullscreen button uses the native API where available and fills the window otherwise. The portrait notebook remains centred in landscape.

Start with one left trampoline and four squad slots. Shoot a body to kill, or pop a chute in the faint blue band above the mat to recruit. A falling trooper arriving faster than 380 logical pixels per second rips through instead. The band marks the **chute**, not the feet. Larger mats widen the catch area without relaxing the speed limit.

The baseline crew fires slowly and aims at bodies in the lower sky. Bazookas can target aircraft; engineers repair the wall. Wounded recruits have small health marks under their feet. Rifle recruits learn to pop low chutes only after buying Catcher training.

Carpet bombers begin in wave 2 and release 3–6 bombs across the trench, crew positions and bunker. The whistle warns of a drop; bombs can be shot down. Snipers begin in wave 3, descend toward an edge, and fire at recruits from below the player's firing arc. Protect the crew so they can return fire. A sniper without any living recruits to target waits six seconds, then retreats without awarding points; it cannot stall the wave permanently.

## Supplies and pizza

Kills, captures, planes, intercepted bombs, combos and wave completion earn coins separately from score. After all enemies, aircraft, bombs and hostile shots are gone, a short wave-clear banner leads to the shop. Combat is frozen there.

Take one of two random free items. A rotating premium equipment offer sits beside **Order a pizza**, which is always available for 25 coins. Each offer can be bought once per visit, and coins carry between waves. Capped upgrades leave the pool. Repeatable repairs and a 12-coin stash keep two free choices available in long runs.

Pizza is a nod to the owner's remembered delivery Easter egg: a stick courier cycles onto the page, hands over a box, and rides away. At the handoff, the wall gains 25 health and every surviving recruit gains 1 health, capped at their maxima. Combat stays frozen, and the same shop returns afterward. Pizza does not resurrect fallen crew.

All equipment, coins and recruits reset on a new run. Only mute preference and the local best score persist. The changed rules use a fresh local-best key, `stickarmy.best.2`. Online leaderboards remain deferred by SPEC-002; this game has no `BOARD` or Worker changes.

## Tuning and extending

`site/stick-army/game.js` contains the simulation and procedural audio. `index.html` contains layout, the title/pause/end cards and the responsive HTML shop.

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

Corpses use six red-ink line/circle pieces with gravity, bounce and a resting period. Persistent marks are capped at 500 and redrawn once per frame when the cap rolls over, and on resize. Reduced-motion preference disables screen shake and line boil.

## Validation and generated assets

Serve `site/` locally:

```sh
python3 -m http.server 8000 --bind 127.0.0.1 --directory site
```

With Python Playwright installed, run:

```sh
CHROMIUM=/usr/bin/chromium python3 tools/stick-army/test.py
CHROMIUM=/usr/bin/chromium python3 tools/stick-army/ui.py
node --check site/stick-army/game.js
CHROMIUM=/usr/bin/chromium SITE_URL=http://127.0.0.1:8000 python3 tools/og/make.py
python3 tools/stamp.py
```

Omit `CHROMIUM` to use Playwright's bundled browser. `SITE_URL` is optional for the preview generator; it defaults to file URLs. The regression runners default to the local server above. `SCREENSHOTS` selects the UI runner's output directory (default `/tmp/stick-army-screenshots`). Test access to simulation internals is injected into the browser response and is never shipped with the game.

The checks cover capture success/rips, slots, crew targeting, ink lifecycle, bomb payloads and damage, sniper pressure and retreat, shop transactions, pizza delivery, equipment combinations, death/restart and a real simulated wave clear. UI checks exercise fullscreen, touch/keyboard, pause and shop/delivery at desktop, portrait, short landscape and small-phone sizes. Physical iPhone Safari and subjective difficulty still merit owner playtesting before featuring the game.

Pages publishing remains a manual workflow. No Worker deploy is needed for this change.
