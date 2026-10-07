# SPEC-002: Stick Army

A Paratrooper-style turret game drawn on lined notebook paper. Planes drop stick-figure troopers. Shoot the trooper and he dies; pop his chute over a trampoline and he bounces into your squad, where he fights for you.

Status: stages 0–4 implemented on `stick-army`, with the owner's added pizza-delivery shop homage. The static game now uses `site/stick-army/index.html` and `game.js`. See [Stick Army](../docs/games/stick-army.md) for current behavior, tuning and validation commands. The studio shelf listing remains pending owner approval; online scores and the longer-form ideas below remain later work.

Implementation notes:

- The shop waits for ground enemies and hostile shots as well as airborne threats. Combat freezes during shopping and pizza delivery.
- A sniper with no surviving crew to target eventually retreats without a reward, avoiding an unwinnable wave.
- Pizza costs 25 coins, restores 25 wall health and 1 health per surviving recruit at the courier's handoff, and is offered alongside rotating premium equipment.
- Repeatable repairs and a coin-stash freebie keep two free choices available after other upgrades hit their stack caps.
- Browser checks cover each stage, plus full run flow and the shop on desktop, portrait, short landscape and a small phone. Owner playtesting is still the final call on feel and featuring.

## Prototype before this spec

- Turret in a bunker at bottom centre. Aim with mouse, touch or arrow keys; hold or press space to fire.
- Planes fly across and drop troopers (rifle, bazooka, or engineer with a yellow hard hat).
- Body hit kills him. Chute hit makes him free-fall: he splats on the ground, or if he lands on a trampoline he bounces into a free squad slot and turns from red to blue.
- Recruits (8 slots) fire on their own. Riflemen shoot landers and chutes, bazookas go after planes, engineers repair. When the wall drops below 70/40/15%, the recruits nearest the bunker switch to repairing it. The switch has hysteresis so they don't flicker back and forth.
- Troopers who land with their chute still on walk toward the bunker. They attack the first recruit in their way, then the wall.
- Bombers from wave 3 drop one aimed bomb. Bombs can be shot out of the air.
- Waves ramp up through `waveCfg(n)`. Game over comes when the wall reaches 0. The best score is saved in localStorage.
- Feedback: score popups, combos up to x5, wave clear bonus, screen shake, ink splats and scorch marks that stay on the page, WebAudio sound effects with a mute button.

## Owner playtest feedback

- A little too easy.
- Captures are too easy.
- Needs more blood.
- Bombers should actually bomb.
- Wants progression and unlocks: weapons and add-ons.
- Added during implementation: a pizza delivery shop item as a homage to the original inspiration, with health or morale benefits.
- The captured crew was great, but too strong: "I almost maxed out and didn't need to do anything."

## Decisions

- **Blood:** red-ink cartoon gore with limbs and heads flying. "Don't overdo it but don't hold back."
- **Crew:** do both. Weaken them, and make them targets.
- **Progression is per run, between waves.** Everything resets on death. Nothing carries between runs for now.
- **Quick-hit shop between waves:** pick 1 of 2 free items, plus 1–2 premium items that cost coins you have to save up for.
- The owner sees this growing into a longer-form game. Keep items, enemies and waves data-driven so they're easy to add.

## Stage 0: Repo standards

- Full screen mode, working in portrait, landscape and desktop (see the "full screen" section of `thimbleful/game.js`). The game currently scales a 400×720 page to fit the window. In landscape, keep that and centre it, or widen the play field.
- Open Graph and Twitter tags, plus a card: add the game to `GAMES` in `tools/og/make.py` and run it.
- Add a shelf card in `site/index.html` once the owner says it's ready.
- Run `python3 tools/stamp.py` after every change in `site/`.
- Fonts are already self-hosted: Schoolbell for the hand lettering, Cabin Sketch for titles.
- Optional: split the file into `index.html`, `game.js` and `audio.js` like the other games.

## Stage 1: Balance and crew

- **One trampoline to start** (the left one). The second becomes a shop item.
- **Fewer drops over trampolines:** `pickDropX` uses 0.33 now; try about 0.15.
- **Capture timing window:** if the chute is popped too high, he's falling too fast when he hits the mat (vy above about 380 px/s). He rips through and splats ("rip!"). Pop it low to capture him. Consider a faint sweet-spot band above the trampoline so players learn the window.
- **Recruits stop catching for you:** remove the chute-aim branch in `aimPoint`. It comes back as a shop upgrade ("catcher training").
- **Squad starts at 4 slots,** expandable to 8 through the shop.
- **Weaker baseline crew:**
  - Rifle cooldown goes from 1.25s to about 2.0s, and spread from 0.07 to about 0.14.
  - Rifles only target troopers in the lower sky (y above about 380).
  - Bazooka cooldown goes from 2.6s to about 4s.
- **Harder ramp in `waveCfg`:** more planes and more drops per plane, faster chute fall. Lander wall damage goes from 4.5/s to about 6/s, and landers walk a little faster.

## Stage 2: Blood

- When a trooper is killed, break the stick figure into its parts: head, torso and four limbs. Each part is a line or circle that spins, falls, bounces on the ground, rests for a few seconds, then becomes a decal.
- A red ink spurt at the hit point, and bigger ground splats.
- Spatter stays on the page. Raise the decal cap (140 now); decals are redrawn on resize.
- Fall deaths squash and scatter limbs. Bombs throw parts further.
- Keep it cartoon red ink, with nothing realistic.

## Stage 3: Enemies that bite

- **Carpet bombers from wave 2:** a string of 3–6 bombs across their flight path, aimed at the trench, the recruits and the bunker. Add a whistle sound effect. Shooting bombs down becomes a real job.
- **Sniper trooper (wave 3+):** lands near an edge, stays put, and shoots a recruit every few seconds. Give him a distinct look (a scope, a beret). Only the recruits can reach him, which makes protecting the crew matter.
- Later ideas: armoured plane (2 hits), a helicopter that hovers and drops a squad.

## Stage 4: Shop between waves

- **Coins** come from kills, captures, planes and combos. Show the count in the HUD, separate from score.
- After "wave cleared!", show a shop card as an HTML overlay in the same style as the pause card:
  - 2 random free items, of which the player takes 1.
  - 1–2 premium items with prices, which the player can buy if they have the coins.
  - A Continue button.
- Make the item pool a data array, `{ id, name, desc, tier: 'free' | 'premium', cost, maxStacks, apply(S) }`. Keep item effects in `S.mods` so they stack.
- Starting pool:
  - Free: faster fire, +1 squad slot, repair wall +30, bigger trampoline, sharper recruit aim, sandbags (more wall HP), barbed wire (landers walk 50% slower), double barrel.
  - Premium: second trampoline, spread shot, flak rounds (explode near targets), rockets, piercing rounds, minefield, medic recruit (heals the crew), auto-turret, catcher training.

## Later: longer-form ideas

- Unlock new shop items across runs.
- A boss every 5 waves (zeppelin).
- Notebook "pages" as levels: lined, graph paper, a margin full of old doodles.
- Online scores through the leaderboard guide (`docs/guides/00-leaderboards.md`).

## Code map (`site/stick-army/game.js`; menu markup in `index.html`)

| Area | Where |
| --- | --- |
| Layout constants | top of script: `W`, `H`, `GROUND`, `BK` (bunker), `TUR`, `SLOTS`, `TRAMPS` |
| Difficulty per wave | `waveCfg(n)` |
| Spawning | `pickDropX`, `spawnPlane`, `spawnTrooper`, `makeRecruit` |
| Wave flow (shop hook goes here) | `startWave`, `updateWave` (`waveState` `'active'` / `'clear'`) |
| Hits and outcomes | `hitTest`, `killTrooper`, `popChute`, `splat`, `bounce`, `becomeRecruit`, `explode`, `damagePlane` |
| Crew brain | `updateRecruits` (repair levels), `pickTarget`, `aimPoint`, `fireRecruit` |
| Landers | `updateLander` |
| Hand-drawn pen | `pen(id)`, `L`, `Ci`, `SP`, `ink`; `boil` changes every 130 ms for the line wobble. Use these for all new art. |
| Persistent marks | `addDecal`, `drawDecal` (offscreen canvas) |
| Sound | `SFX` table and `sfx(name)` |
| Menus | `#titleScreen`, `#pauseScreen`, `#overScreen` HTML cards |

Palette: paper `#fbf8ef`, graphite `#2e2e33`, enemy red `#c8433a`, ally blue `#2f6fdc`, hard-hat yellow `#f2c230`, blue rules `#cfdcec`, red margin `#e6a2a0`.
