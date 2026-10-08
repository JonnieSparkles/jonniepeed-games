# Stick Army

Built from [SPEC-002](../../specs/SPEC-002-stick-army.md), with layout from [SPEC-003](../../specs/SPEC-003-repo-layout.md) and the development shelf from [SPEC-004](../../specs/SPEC-004-side-b.md). The game is at `site/stick-army/index.html`. [SPEC-007](../../specs/SPEC-007-stick-army-campaign.md) is the draft plan for a 20-wave campaign with a final boss, a victory screen and endless play. It appears only as the **demo** card on Side B; there is no public Side A card. No build step or network service is required. The page keeps `<meta name="robots" content="noindex">` until promotion.

## Finding and promoting the demo

On the studio page, hold the rainbow egg with a pointer, Space or Enter for about 1.4 seconds to full power, then three more seconds while its puddle grows. Alternatively open `#side-b` on the studio URL. Choose Stick Army's demo card (`stick-army/`). **Back to games** on the title, pause or game-over card uses `../`, preserving the current site mount; the selected shelf restores from `sessionStorage` during the same tab's visit. The shop and active play have no home-link overlay.

After Jonnie approves promotion, remove `data-side="b"`, `data-badge="demo"`, the `.badge` span and initial `hidden` from the card, remove the game's noindex meta tag, and update this doc and the README. Run the studio and Stick Army harnesses plus applicable preview checks, run stamp last, and publish manually. Promotion is explicit; visits and saved shelf state never promote a game. Local scores stay local. Physical iPhone Safari, difficulty and phone performance still need playtesting before featuring the game.

## Rules and input contract

Mouse, keyboard and touch all work. With a mouse, aim and hold the button to fire. On touch, touch and hold to fire, and drag to aim. Arrow keys (or A/D) aim, Space fires, B calls an air strike, C calls fighter cover, P pauses, and F toggles full screen. Each call also has a button beside pause, shown only while the radio holds that call. The barrel sweeps continuously from slightly below horizontal on the left (`AIM_MIN`) to slightly below horizontal on the right (`AIM_MAX`, `AIM_DIP` = 0.3 rad). The dip is enough to shoot landers at the wall and in the near field and to reach a parked tank. A fully dipped shot skimming the field can also catch a sniper at the edge. When tipped down, the barrel draws in front of the bunker. The page sets `touch-action: manipulation` on everything, so quick repeat taps never zoom on iPhones (pinch zoom still works), while the canvas keeps `none` and the shop keeps `pan-y`. `-webkit-touch-callout: none` on the body stops holding to fire from popping up the iOS callout. The fullscreen button uses the native API where available and fills the window otherwise; on phones under 400 px wide it shrinks to an icon (named for screen readers) to make room for the call buttons. The portrait notebook remains centred in landscape. The pause card ("Wave 12 · 14:05 played") and the game-over card show time played (`S.played`, `notePlayed`, `clock`). It counts waves and the shop, not pauses or the title, and never feeds the simulation.

Start with one left trampoline and four squad slots. Shoot a body to kill, or pop a chute over the mat to recruit. A falling trooper arriving faster than `CAPTURE_SPEED` (680 logical pixels per second) rips through instead, which in practice only happens to chutes popped right under the planes. There are no guide lines. Larger mats widen the catch area without relaxing the speed limit.

A trooper falling without a chute squashes any enemy he lands on (`crush`), including snipers: 30 points each, with combo. This is the player's skill answer to landers, borrowed from the original Paratrooper.

The turret overheats. Each volley adds `HEAT_PER_SHOT` heat, scaled by the fire-rate upgrade so heat per second stays the same, and heat bleeds off at `COOL_RATE` per second. Reaching full heat locks the gun for `OVERHEAT_LOCK` seconds ("too hot!", steam, a hiss), during which it cools to 35%. A dashed gauge arcs over the dome while the gun is warm, and the barrel reddens as it heats. Each volley also costs `SHOT_COST` points (1, as in Paratrooper), never taking the score below zero. Cooling fins (free supply, three stacks) cut heat per shot by 20% each.

The baseline crew fires slowly and aims at bodies in the lower sky. Bazookas go for tanks first and can target aircraft; engineers repair the wall. Wounded recruits have small health marks under their feet, and the squad row in the HUD shows health too (`miniFig`, drawn at `MINI` = 0.95 of field size): a bar under each figure, a slouch and bandage below 70%, and below 40% a further droop, a fade and a red cross. The row also shows each role's kit (rifle, hard hat, tube, scope, the medic's white helmet with a red cross). Rifle recruits learn to pop low chutes only after buying Catcher training.

All crew damage goes through `hurtRecruit`. Bombs wound by distance (a direct hit knocks a bare recruit down), landers punch, and snipers shoot. Two free supplies make the crew sturdier. **Dig in** (`S.mods.trench`, two stacks) cuts every kind of crew damage by 40%, then 60% (`TRENCH`), and draws sandbag rows in front of each crew group. **Helmets** (`S.mods.helmet`, three stacks) add 1 health to current and future recruits (`crewMax`), and are drawn on everyone but engineers and medics. Dug in with helmets, a recruit survives a direct bomb hit on his feet.

Carpet bombers begin in wave 2 and release 3–6 bombs across the trench, crew positions and bunker. The whistle warns of a drop; bombs can be shot down. Snipers begin in wave 3, descend toward an edge, and fire at recruits from mostly beyond the barrel's reach. With no crew left, they shoot the turret instead (`sniperHitsTurret`): each hit adds 0.25 heat (which can tip a hot gun into overheating) and chips 3 wall. A red "sniper!" callout marks each one as he lands. Counters are the crew, mines, the sentry, a fully dipped shot, or squashing him with a popped trooper. A sniper with no crew to target leaves after `abandonAfter` (14 s) without awarding points, so he can't stall a wave.

## Squad: names, ranks, the wounded and the field hospital

These rules live in `site/stick-army/squad.js` (`StickArmySquad`). Rookies are nameless. Standing at the end of a wave counts as a wave served (`serveWave`). Three waves earn a name and a stripe (Pfc.), six make Corporal and ten Sergeant (`RANKS`). Each stripe adds 0.5 health and an 8% quicker trigger (`RANK`); the bots showed that faster repairs on top made long-lived squads unbeatable. Names come from the run seed and the recruit's id, never from a game stream, so they can't change outcomes; they don't repeat within a run. Stripes show as yellow chevrons on the shoulder, in the field and in the squad row. Names appear only where there's room: a pop-up when a name or stripe is earned, the shop's squad news, the pause card ("Squad: Sgt. Doodle (12), Pfc. Inky (4), 2 rookies") and the game-over card's "Fallen" list (`S.fallen`).

At zero health a recruit falls wounded instead of dying (`knockDown`). He lies on the ground under a pulsing red cross and stops working. Any more damage finishes him: a bomb, a lander walking into him, a tank. Snipers aim past him at the next man standing, and their shots fly over him. A medic heals the wounded first and gets him back up at 1 health (`standUp`); a pizza does too.

The **field hospital** (60 tags, one stack) pitches a tent with one bed beside the right-hand crew (`TENT`, `drawTent`). When a wave clears, the bed goes to the most decorated wounded soldier, first down on a tie (`careAtWaveEnd`). He leaves the field, keeps his slot (`bedSlot`), shows in the squad row on a cot, sits out the next wave and rejoins at full health when it clears. Everyone else still down when a wave clears is lost, with or without the tent. The shop's squad news tells the story ("Cpl. Squiggle made it to the tent. A rookie didn't make it.").

## Drawn in

You're the commander drawing your army. Once the wave banner has been read (`SKETCH.DELAY`, 0.9 s), whatever you just bought is sketched onto the page in blue ballpoint, one piece at a time (`queueSketches`, `sketched`, `SKETCH`, 0.45 s each): the sentry tower and the tent from the ground up, the newest trench row, the wire and the second mat left to right, and new hires from their feet up. The pen (`drawPen`) has a steel tip, a blue grip, a clear barrel showing the ink tube, and a blue cap and clip, the same ink as your army. Called planes are sketched in at the left edge of the page before they fly (`STRIKE.HOLD`, `FIGHTER.HOLD`). It's purely a reveal: everything works from the first frame, and the sketch state never feeds the simulation. A pen-scratch sound marks each one.

## A readable page

Busy waves stack a lot on one page, so text and effects follow a few rules.

Floating text comes in kinds (`TEXT`, `addText`):
- **Alerts:** red threats ("sniper!", "rush!", "wall -18"). Bigger, held longer (1.3 s), always shown and drawn on top.
- **Story:** blue squad and radio news ("Pfc. Inky!", "man down!", "air strike!"). Always shown.
- **Big:** awards of 100 points or more ("tank down! +150"). Always shown.
- **Score:** routine kill labels. Small, soft grey and short (0.6 s). Kills of the same kind within 0.35 s and 44 px merge into one running label ("bonk! ×5 +250"); every trooper cry merges under the first one's word (`award`).
- **Minor:** little reactions ("clank!", "pop!", "+").

Score and minor labels share a budget of five on screen (`TEXT.BUDGET`); over it, new ones are skipped, and the combo counter and dog tags still show the reward. Wall damage from one burst is one running total (`wallText`). A new label steps a line up or down to clear one already there, and labels stay below the HUD band (`TEXT.TOP`). Dog tags from one burst fly to the counter as one bundle, and at most six bundles fly at once (`flyTags`).

A wave opens one thing at a time: a pizza ordered in the shop is delivered first (see Supplies and pizza), then the banner (`WAVE_BANNER`, 2.2 s), the sketches and the enemies. Once a wave's planes are done and the field is clear, a rush, cargo plane or zeppelin still due comes in after `WAVE_HURRY` (1.5 s; the zeppelin after its 2.5 s horn) instead of waiting out its timer, so there's no dead air. HQ's bomber at wave 9 and the zeppelin's reward are in their banners ("tanks! +1 air strike from HQ", "catch the crew! +1 air strike") instead of separate labels; `grantCall` takes a `quiet` flag for that.

**The highlighter** (`HL`) is the page's third pen, after your blue and their red, kept for your big moments so routine kills stay quiet. Downing a plane, tank or zeppelin, a mine and your air strike's bombs flash a comic yellow starburst (`pow`); a bomb hitting your ground does not. Labels worth `HL.PTS` (300) or more, and big awards, get a highlighter swipe behind them (`highlight`, drawn left to right in 0.14 s with `multiply`, so what's underneath shows through), and their soft grey turns to ink. Merged labels grow 1.5 px per kill, up to 9. Long labels are kept on the page by their width.

Past `FX.BUSY` (200) particles, effects thin out (`busy`): bursts throw a third of their flecks, every other puff is skipped, kills break into four pieces instead of six, midair spatter halves, and smoke trails behind falling planes thin from one puff every 0.07 s to every 0.14 s. All of it is cosmetic randomness, so it never changes outcomes. Ground ink also fades during a wave (see below).

## Rushers, tanks, armor and radio calls

These live in `site/stick-army/units.js` with the zeppelin. From wave 6 (`RUSH.WAVE`), rushes of two to six troopers charge in along the ground from one edge at `RUSH.SPEED` (48 px/s, about twice a walker's pace), with a whistle and a "rush!" callout (`spawnRush`). They're ordinary ground troopers once they arrive.

From wave 9 (`TANK.WAVE`), cargo planes carry a tank (`spawnCargo`, `updateCargo`). Down the cargo plane before its drop (4 hits) and the tank goes with it ("tank and all!"). Otherwise the tank comes down under two pallet chutes at `TANK.FALL`, flattens troopers it lands on, and rolls toward `TANK.STOP` (70 px from the wall, inside the barrel's dip), crushing a recruit in its way. It lobs a shell at the bunker every `TANK.SHELL_EVERY` (3.6 s), on the move as well as parked. Each shell does `TANK.SHELL_DAMAGE` (8) to the wall and wounds nearby crew. Shells fly like bombs and can be shot down, but they're faster and smaller (hit radius 6 instead of 9). Tanks shrug off bullets: each turret, rifle or sentry hit does `TANK.BULLET` (0.1). Rockets (4), mines and crashes (6) and air strike bombs (14) are the answer (`TANK.BLAST`, `blastTanks`). Health is `10 + 0.8 × wave` (`tankHP`), shown in a bar over the tank; a destroyed tank pays 150 points. Mines and barbed wire work on tanks too. Other crew deal with ground troopers before tanks (`pickTarget`).

From wave 12 (`ARMOR.WAVE`), some troopers wear a grey flak vest that stops one body hit ("clang!", then "vest off!"). From wave 22 (`ARMOR.HEAVY`) the vest stops two and comes with a steel helmet. The chance is `armorChance` in `waveCfg`: 8% at wave 12, rising 3 points a wave to 50%. Snipers never wear one. A canopy hit still pops an armored trooper's chute and blasts kill outright, so the turret copes with armor better than the crew does (`armorHit`, `vest`, `steelPot`).

Radio calls are the player's specials. The radio holds `RADIO.SLOTS` (two) calls of either kind (`S.calls`, `callsHeld`):
- **Air strike** (`callStrike`, `updateStrike`, `STRIKE`): a friendly blue bomber crosses at `STRIKE.Y` and drops 11 bombs over the field, skipping the 46 px around the bunker. The blasts kill troopers and hit tanks hard but spare crew and the wall. 45 tags, sold from wave 3.
- **Fighter cover** (`callFighter`, `updateFighter`, `FIGHTER`): a small blue fighter swoops down into its lane at y 190 (`FIGHTER.DIVE`, 70 px over `DIVE_T`, 0.5 s) and makes one fast pass across the sky (`FIGHTER.PASSES`), trailing a pencil contrail and gunning down the nearest bomb, plane or (last) zeppelin ahead of it with yellow tracers every 0.07 s. It leaves the ground alone. 50 tags, sold from wave 3.

Every call goes out on the radio first (`radioCall`, `updateRadio`, `drawRadio`, `RADIO.TALK` = 0.6 s): the most decorated soldier standing, nearest the bunker on a tie, raises a buzzing walkie-talkie with the call's name over him and a burst of static. With no squad, the walkie-talkie appears over the bunker. Then the plane is sketched in and flies, with its engine sound.

A run starts with an empty radio. With the first tanks (wave 9), HQ puts a bomber on it (the banner says "tanks! +1 air strike from HQ"), and each zeppelin downed earns one (`grantCall`). A free call with the radio full pays 40 tags instead. The shop marks both calls "Radio full" when there's no room. One of each kind can fly at a time. Each button shows only while the radio holds its call, shows the count, and waits while that call is flying (`syncCallBtns`).

Rushers and tanks add variety mid-run. From wave 12, pressure keeps rising instead of flattening out (`waveCfg`):
- The gap between planes holds at 0.85 s from wave 7 to 11, then shrinks by 0.03 s a wave to 0.3 s by wave 29.
- Bombers number `n − 1` up to five, hold at five to wave 11, then number `n − 6` with no cap.
- Fall speed rises to 130 by wave 21.
- Rushes grow to six a wave of six troopers, and cargo planes to four a wave.
- The chance that a drop lands over a mat rises from 15% by 1.2 points a wave to 30% (`pickDropX`), so captures stay possible late.

## Zeppelin boss

Every fifth wave (`BOSS_EVERY`) is a boss wave, announced as "zeppelin incoming!". `waveCfg` drops the bombers and halves the planes, and those escort planes keep to a high lane (y 98–118) above the zeppelin. A few escort planes come first. About 6.5 seconds in, a low horn and a red "zeppelin incoming!" give warning (`ZEP.WARN`), and the zeppelin enters from a random side at 9 seconds (`ZEP.ARRIVE`). It patrols between `ZEP.LEFT` and `ZEP.RIGHT` until it is shot down, so the wave can't clear while it flies. Turning is a cartoon flip: `p.face` eases through zero, so the hull squashes, stops and heads back. Its health is `20 + BOSS_HP_PER_WAVE × wave` (8 per wave, so 60 at wave 5), shown in a small red bar riding just above the hull, with a tick at half. The bar comes in with the hull as it enters, and is only held on the page once the zeppelin has arrived (`drawBossBar`). The gondola is the weak spot: direct shots there do `ZEP.WEAK` (double) damage (`inGondola`), with a "weak spot!" callout the first time and a banner hint ("zeppelin! aim for the gondola").

While on screen it drops a paratrooper from the gondola every 3.4 s and a three-bomb cluster from its belly every 6.5 s. Gondola drops are ordinary troopers, so they can be caught. Hits leave holes where they land (more as it weakens) that leak gas wisps, and it sinks toward the page as it loses health. At half health it turns angry: red-tinted, faster, dropping every 2.4 s and bombing every 4.5 s, with the horn again. The hull hit test is an ellipse narrowed while turning, plus the gondola (`planeHit`). It lives in `S.planes` as `kind: 'zeppelin'`, so flak, rockets, bazookas and the ambience treat it as an aircraft. Idle rifles also shoot at it when nothing closer needs them (`pickTarget`).

Shooting it down awards `250 + 30 × wave` points (with combo), a "zeppelin down!" banner ("catch the crew! +1 air strike", or "+40 tags" with the radio full), an air strike charge and its share of dog tags. Three crew bail out on chutes for last-chance catches. It then falls nose-first in flames, with small blasts along the hull, flattening other airborne troopers but not its own bailing crew, and crashes in three ground explosions.

## Supplies and pizza

The shop currency is **dog tags** (the balance is still `S.coins` in code). Kills, captures, planes, intercepted bombs, combos and wave completion earn tags separately from score. Every award spawns a tag that flies from where it was earned into the counter (`flyTags`, `TAG_HUD`); in a pile-up, new tags fold into one already in flight. The tag is drawn once into a cached sprite (`dogTag`). After all enemies, aircraft, bombs and hostile shots are gone, a short wave-clear banner leads to the shop. Combat is frozen there.

The shop is one priced list. **Supplies** shows three rotating supplies from one pool (`offer`, `OFFERS`), both radio calls from wave 3, and **Order a pizza** (25 tags). The field hospital is in the rotating pool. One of the three rotating supplies is on the house each visit: a random gift with an "On the house" badge, a struck-through price and "Free!" (`onHouse`, `costNow`). The gift row is otherwise drawn like the others, so it never looks already chosen. A bought supply keeps its ink and says "Packed ✓" in blue (`.bought`); only rows you can't afford or use go grey. **Hire** lists every role while a squad slot is free: rifleman 35, engineer 40, sniper 50, bazooka 55 and medic 55 (one medic at a time). Every hire, of any role, raises the next price by 15 (`price(item)` handles computed costs). Supplies sell once per visit; hiring repeats while slots and tags last. Unaffordable items say how many more tags they need on a line under the price, so rows keep their width as the balance changes; the continue button ("Wave N →") is always open, and tags carry between waves. Your kit shows under the list as pencil icons with counts (`kitItems`, `renderKit`). Flak rounds burst only near planes and bombs, and the bursts spare paratroopers, even ones jumping from the plane that was hit. A direct hit on a trooper's body or canopy acts as a plain bullet, so catches still work with flak. Every supply and role has a pencil icon drawn with the battlefield pen in `icons.js` (`StickArmyIcons`, used through `ICONS` and `drawItemIcon`); add one when adding an item. Capped upgrades leave the pool, and repeatable repairs keep the rotation full in long runs.

Pizza is a nod to the owner's remembered delivery Easter egg. Ordering it marks the shop row "On its way" without leaving the shop (`S.pizzaOrder`). Before the next wave, a stick courier cycles onto the page, hands over a box and rides away (`updateDelivery`, `drawCourier`). It's its own scene (`S.waveState` `'pizza'`, `S.nextWave`): no enemies come until everyone is fed, and the wave starts as he rides off. At the handoff, the wall gains 25 health and every surviving recruit gains 1 health, capped at their maxima. Pizza does not resurrect fallen crew.

The shop hint warns when the next wave brings a zeppelin. The pause card shows your kit as icons with names (`renderKit`; repeatable buys are left out). The game-over card names what brought the wall down, from the last source to hurt it (`OVER_CAUSE`: bombs, landers, snipers or tanks), and adds zeppelin and tank lines once one has been destroyed (`S.stats.zeppelins`, `S.stats.tanks`). All equipment, tags and recruits reset on a new run. Only mute preference and the local best score persist. The changed rules use a fresh local-best key, `stickarmy.best.3`. Online leaderboards remain deferred by SPEC-002; this game has no `BOARD` or Worker changes.

## Tuning and extending

`site/stick-army/game.js` contains the simulation and saved preferences. `site/stick-army/icons.js` holds the shop's supply icons: a classic script that loads before `game.js` and defines `StickArmyIcons(kit)`, which `game.js` calls once with its pen helpers and colors. Each icon is then drawn with the icon canvas context as `G`. `site/stick-army/units.js` holds the zeppelin, rushers, tanks and the radio calls; `squad.js` holds names, ranks, the wounded and the field hospital; `shop.js` holds the item list, the shop, the kit display and the pizza courier. They are classic scripts that load after `icons.js` and before `game.js`, and define `StickArmyUnits(world)`, `StickArmySquad(world)` and `StickArmyShop(world)`. `game.js` passes one `world` object of constants and helpers, with getters for live values (`S`, `G`, `boil`, `RW`, `RC`, `RS`, `sound`, `seed`), and keeps aliases (`spawnZeppelin`, `callStrike`, `openShop`, `ITEMS` and so on) so harnesses and `tune.js` reach them as before. `site/stick-army/audio.js` owns procedural sound through `StickArmySound.init()`, `.play(name)`, `.ambience(state)` and `.muted`; it loads before `game.js`. The game calls `ambience` about every 80 ms with whether a wave is live, the wave number, the flying planes and whether the wall is below 30%. Ambience is a snare-and-bass-drum march while a wave runs. It's scheduled slightly ahead of the audio clock (`marchStep`), gets busier from waves 4 and 9, and speeds up a little as waves climb. A zeppelin adds a low timpani on each downbeat, and a low wall swaps the bass drum for a heartbeat in time with the march. Up to three propeller drones follow and pan with the nearest planes. Everything is on one bus that fades out outside active play and when muted. The mix runs at `LEVEL` (0.8, about 11 dB louder than before, since phones played it quietly) into a gentle tanh soft clip that rounds off the rare stacked peak; a compressor node was tried and squashed short hits. The zeppelin gets a deeper, louder drone. Cues: a bugle at wave start, the arpeggio at wave clear, a shop jingle, an overheat hiss, a ready ping when the gun unlocks, a squash, a whistle for a rush, a cannon thump for tank shells, an engine roar and horn for the friendly bomber, a climbing whine for fighter cover, a burst of static and two beeps for a radio call, a pen scratch for each sketch, and for the zeppelin a horn, a soft canvas thup per hit and a groan going down. `index.html` contains layout, the title/pause/end cards and the responsive HTML shop.

Open `stick-army/#tune` (or `#tune&seed=42`, see below) on the local server (or `site/stick-army/index.html#tune` for a file preview) to load the optional `tune.js` panel. Its fourteen sliders change turret fire cooldown, heat per shot, cooling, overheat lockout, points per shot, capture speed, mat-drop chance, rifle cooldown/spread, wave growth, wall damage and zeppelin health per wave immediately (a live zeppelin keeps its health fraction). Collapse the panel to play; **Copy values** exports JSON, with selected text as a fallback when clipboard access fails. Values are session-only and reset on reload. The panel and its script are absent without the hash.

| Area | Entry points |
| --- | --- |
| Enemy definitions and crew stats | `ENEMIES` |
| Wave size, speed, drops, bomb count, sniper chance, rushes, cargo planes, armor | `waveCfg(n)` |
| Capture speed, slots and mats | `CAPTURE_SPEED`, `SLOT_ORDER`, `activeTramps`, `resizeMats` |
| Turret heat, shot cost and aim range | `BALANCE.FIRE_COOLDOWN`, `HEAT_PER_SHOT`, `COOL_RATE`, `OVERHEAT_LOCK`, `SHOT_COST`, `fireVolley`, `updateHeat`, `AIM_DIP` |
| Landing on enemies | `crush` |
| Zeppelin boss (`units.js`) | `BOSS_EVERY`, `ZEP`, `BALANCE.BOSS_HP_PER_WAVE`, `spawnZeppelin`, `updateZeppelin`, `hurtZeppelin`, `inGondola`, `zeppelinDown`, `planeHit`, `drawZeppelin`, `drawBossBar` |
| Rushers, tanks and radio calls (`units.js`) | `RUSH`, `spawnRush`, `TANK`, `tankHP`, `spawnCargo`, `updateTanks`, `fireShell`, `damageTank`, `blastTanks`, `RADIO`, `callsHeld`, `grantCall`, `STRIKE`, `callStrike`, `updateStrike`, `FIGHTER`, `callFighter`, `updateFighter`, `fighterTarget` |
| Names, ranks, the wounded and the field hospital (`squad.js`) | `RANKS`, `RANK`, `NAMES`, `serveWave`, `knockDown`, `standUp`, `careAtWaveEnd`, `bedSlot`, `TENT`, `drawTent`, `chevrons` |
| Drawn in | `SKETCH`, `queueSketches`, `sketched`, `sketchReveal`, `drawPen` |
| Floating text and the wave start | `TEXT`, `addText`, `wallText`, `award`, `flyTags`, `drawTexts`, `WAVE_BANNER`, `startWave` |
| Effects on a busy page | `FX`, `busy`, `burst`, `puff`, `killFx` |
| The highlighter | `HL`, `pow`, `highlight`, `drawTexts` |
| Radio calls going out | `RADIO.TALK`, `radioCall`, `updateRadio`, `drawRadio` |
| Armored troopers | `ARMOR`, `rollTrooper`, `armorHit` |
| Sentry tower | `SENTRY`, `sentryTarget`, `updateAutoTurret`, `drawSentry` |
| Squad health in the HUD | `miniFig` |
| Item pool, costs and stack limits (`shop.js`) | `ITEMS`: `{ id, name, desc, tier, cost, maxStacks, apply(S) }`, optional `available()` |
| Run upgrades and ownership counts | `S.mods`, `S.mods.stacks` |
| Shop transitions and transaction guards | `openShop`, `takeItem`, `continueWave` |
| Pizza courier | `S.pizzaOrder`, `continueWave`, `updateDelivery`, `drawCourier` |
| Projectile combinations | `shoot`, `consumeBullet`, `projectileBurst`, `hitTest`, `explode` |
| Corpses and persistent ink | `killFx`, `updateParts`, `addDecal`, `DECAL`, `fadeInk`, `washDecals`, `drawBodyPart` |

Double barrel and spread combine into six bullets per volley. Rockets add a separate projectile every fourth volley. Piercing normal bullets can hit three distinct targets; flak detonates once near an aircraft or bomb, consuming the round even when piercing is equipped, and against troopers it is a plain bullet. Mines rearm at the start of each wave and spare allies. Medics occupy a normal squad slot, heal other nearby recruits, and can be replaced in the shop after death. The sentry stands on a lattice tower just right of the bunker, clear of the main barrel. Every 0.7 s it fires an ordinary ally bullet at the nearest bomb or shell, then the nearest low chute, trooper on the ground, tank or low plane (`sentryTarget`, `SENTRY`). It does not inherit the player's weapon upgrades.

Corpses use six ink line/circle pieces (four on a busy page) with gravity, bounce and a two-second rest: red for enemies, blue for fallen recruits. Kills near the ground leave a faint splat; midair kills leave a spatter that fades in about a second, so the sky stays clean. Only one landed red fleck in three leaves a mark. During a wave the whole ink layer fades to 70% every four seconds (`DECAL`, `fadeInk`) in one compositing pass, without redrawing the marks, so the ground never builds into a solid band. Opening the shop washes the page (`washDecals`): every mark fades to 45% and the faintest go. New marks stamp directly onto the ink canvas once. Only the latest 500 are retained for replay on resize or the shop wash; older marks stay in the current raster until then or a new run. Reduced-motion preference disables screen shake and line boil.

## Seeds, events and balance bots

Randomness comes in streams ([SPEC-005](../../specs/SPEC-005-balance-bots.md)). `RW` (wave content: spawn timing, aircraft, drops, trooper types, the zeppelin) and `RS` (shop offers) are reseeded at every `startWave` from the run seed, so wave *n* is the same for a seed however earlier waves went. Each aircraft takes one draw from `RW` to seed its own sub-stream (`p.rng`) and pre-rolls its troopers (`p.kits`, from `rollTrooper`), so shooting it early doesn't change who jumps or what follows. `RC` covers combat outcomes (crew aim and timing). `R` and `rr` are cosmetic only and use `Math.random`. Shop offers walk a seeded shuffle of each tier and take the first eligible items (`offer`), so they change only when eligibility does. `newGame` picks a random seed unless `RUN.force` (harnesses) or `#seed=N` sets one; the hash is `&`-separated tokens (`hashTokens`), so `#tune&seed=42` works.

`emit(type, data)` does nothing in normal play; harnesses set `emitHook`. Events: `wave_start`, `wave_clear`, `plane_spawn` (with drops and trooper types), `trooper_spawn`, `kill` (`by` player, crew, explosion, crash, squash, strike; explosions add `source`), `chute_pop` (`overMat`), `capture`, `rip`, `splat`, `land`, `recruit_down` (`cause`, `rank`), `recruit_revived` (`by` medic or pizza), `recruit_saved` and `recruit_back` (the tent), `recruit_lost` (`cause` bomb, lander, sniper, tank; `wounds` when lost at the end of a wave), `rank_up` (`rank`), `wall_damage` and `wall_repair` (`source`, `amount`; wall changes go through `hurtWall` and `repairWall`), `bomb_dropped` (`by` bomber or tank), `bomb_intercepted`, `plane_down`, `coins` (`amount`, `reason`), `shop_offer` (`items`, `gift`), `purchase` (`item`, `tier`, `cost`, `gift`), `pizza`, `rush` (`side`, `count`), `tank_drop` (`hp`), `tank_down` (`by`), `air_strike` and `fighter_cover` (`left`), `armor_hit` (`by`, `left`), `zeppelin_warning` and `game_over` (`cause` is the last source to hurt the wall).

The balance adapter (`tests/stick-army/balance.js`) stops the page's frame loop and sound. In fast mode (the default) it also skips cosmetic effects (`addDecal`, `puff`, `burst`, `pow`, `killFx`, `addText`, `flyTags`); runs with effects on restore them. The bot (`tests/stick-army/bot.js`) ranks bombs bound for the bunker or crew, then chutes over a mat (it aims at the canopy's outer edge to capture), troopers about to land or at the wall (as low as the barrel dips), aircraft, then other chutes. It ranks bombers above troopers, shoots tanks on the way down or parked (as low as the barrel dips) and cargo planes, calls an air strike when a tank is parked, five or more troopers are on the ground, or the wall is below 30% (casual players only below 25%), and calls fighter cover when two bombers or four bombs fill the sky. Its shop is one function: take the gift, hire a rifleman if the squad is down to one or none, buy the top four of its priority list (air strike, spread, double barrel, fighter cover), holding one call before wave 8 and two after, and the field hospital once it has four crew, hire up to two by the role the squad lacks most (bazooka, engineer, medic, then rifle), buy the rest of the list with what's left (experts keep a 40-tag cushion), and order pizza when the wall is low. Run it with `python3 tools/balance/run.py stick-army`; the [balance bots guide](../guides/01-balance-bots.md) covers flags, profiles and the report.

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

Round 4 (40 seeds per skill, 40-minute cap), compared with main on the same seeds. Main was played by its own bot (`--ref-bot own`) because the shop changed shape, so the differences include the bot's own changes:

| Skill | Median wave (quartiles), main → round 4 | Alive at wave 10 / 20 / 30, round 4 | How round 4 runs end |
| --- | --- | --- | --- |
| casual | 7 (6–8) → 12 (8–19) | 60% / 25% / 5% | bombs 34, landers 5, sniper 1 |
| decent | 9 (8–47) → 29 (26–32.2) | 95% / 95% / 40% | bombs 39, landers 1 |
| expert | 46 (8.8–47) → 33 (31–41) | 90% / 88% / 78% | bombs 30, time cap 9, landers 1 |

What the bots found:

- **The split is gone.** On main, runs that got past waves 7–9 lasted to the time cap. Escalation from wave 12 means decent runs now end between waves 26 and 33, and only 9 of 40 expert runs reach the cap.
- **Tanks barely fired at first.** A bullet stream melted them on the way down, and the bot shot every slow shell out of the air. With bullets doing a tenth of a point, faster and smaller shells and shelling on the move, tanks need rockets, bazookas or a strike. Bombs still end nearly every run, so threat variety is a playtest question.
- **Tank shells took their aim from cosmetic randomness.** `--verify` caught it once tanks lived long enough to fire; shells now aim with `RC`.
- **The bot starved its own squad.** It bought supplies before hiring and kept dying at wave 8 with no engineer. It now hires a rifleman when the squad is thin and hires before low-priority supplies, and it ranks bombers above troopers.

Round 5 (tougher zeppelin, pizza at the next wave's start, same bot, 40 seeds per skill) against round 4: casual 12 → 13.5, decent 29 → 27, expert 33 → 34 median waves, with no difference beyond run-to-run noise. Two decent runs now end to tank shells.

Round 6 (radio calls, ranks, the wounded and the field hospital; 40 seeds per skill, 40-minute cap) against main, which was played by its own bot (`--ref-bot own`, because the bot now reads the radio):

| Skill | Median wave (quartiles), main → round 6 | Alive at wave 10 / 20 / 30, main → round 6 |
| --- | --- | --- |
| casual | 13.5 (8–19) → 8 (8–16) | 65 / 22 / 2% → 42 / 8 / 0% |
| decent | 27 (24–29) → 28 (22.5–31) | 95 / 88 / 22% → 80 / 78 / 30% |
| expert | 34 (30.5–41) → 32 (12–37.2) | 90 / 88 / 75% → 75 / 70 / 58% |

What the bots found:

- **Full rank perks made long-lived squads unbeatable.** With faster repairs and a 12% quicker trigger per stripe, most expert runs that got past wave 10 reached the time cap. Without perks they ended between waves 26 and 38. Ranks now add 0.5 health and an 8% quicker trigger.
- **Two fighter passes were too strong.** One pass brought decent runs back to main's median.
- **Waves 6–9 are harder.** Runs no longer start with a free strike, and calls and the hospital now compete with upgrades for early tags. Casual runs feel it most. If playtesting agrees, HQ's first bomber could come earlier than wave 9.

Round 7 (a calmer page: labels, wave-start pacing, effects and ink) changes no rules; the pizza courier now arrives about two seconds later in the wave. The zeppelin also arrives later, at 9 s instead of 3.5 s. Decent bots on the same 40 seeds: median 28 (22.5–31) on main, 27.5 (21–29.5) on round 7, with no difference beyond run-to-run noise. `--verify` matches with effects on.

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
node --check site/stick-army/units.js
node --check site/stick-army/squad.js
node --check site/stick-army/shop.js
node --check site/stick-army/tune.js
CHROMIUM=/usr/bin/chromium SITE_URL=http://127.0.0.1:8000 python3 tools/og/make.py
python3 tools/stamp.py
```

Omit `CHROMIUM` to use Playwright's bundled browser. `SITE_URL` is optional for the preview generator; it defaults to file URLs. The regression runners default to the local server above. `SCREENSHOTS` selects the UI runner's output directory (default `/tmp/stick-army-screenshots`). Test access to simulation internals is injected into the browser response and is never shipped with the game.

The checks cover seeds and events (the same seed gives the same wave content and shop offers after different play, runs vary without a seed, `#seed` parsing, cosmetic randomness and drawing never changing outcomes, the event hook), the zeppelin (boss cadence, patrol and turning, drops, hull hit test, holes, flak, anger and sinking, idle rifles, payout, bail-outs, crash and wave clear), rushers, tanks (cargo drops, landing, parking, shelling, shells shot down, bullets only chipping, rockets, payout, downed cargo planes), armored troopers, the air strike (charges, B key and button, sparing crew and wall, zeppelin reward, shop sales), rising pressure, the sentry tower's targeting and cadence, squad health in the HUD, the page wash between waves, the drum march at every tier, the radio (no call at the start, HQ's bomber at wave 9, fighter cover's two passes, the two-call limit and its tag payout, buttons and keys, shop sales), names and ranks (earning, uniqueness, determinism, perks), the wounded (down not dead, snipers and their shots passing over, being finished, medic and pizza revivals), the field hospital (the bed going by rank then order, losses, the kept slot, the return), the squad news, pause and fallen lines, the sketch-in queue and its delay behind the banner, the readable page (kill labels merging, the label budget, alerts, squad news and big awards always shown, the wall total, labels stepping clear and staying below the HUD band, alerts drawn on top, tag bundles, HQ and zeppelin rewards in their banners, banner subtitles fitting the page, the courier waiting for the banner and sketches, the blue pen, the zeppelin's bar entering with the hull, thinner effects on a busy page and ink fading during a wave in one pass), time played on the pause and game-over cards, the pizza scene before the wave, no dead air before a rush or zeppelin, the medic's helmet, the highlighter (starbursts for your wins only, chains growing and highlighted, big awards, long labels on the page), radio call-ins (the caller, the bunker with no squad), fighter cover's swoop, contrail and tracers, capture success/rips, crush, crew damage reduction, snipers vs the turret, anti-air flak, hiring by role, the gift, dog tags, the barrel dip, overheat and shot cost, midair ink, shop icons, slots, crew targeting, ink lifecycle, bomb payloads and damage, sniper pressure and retreat, shop transactions, pizza ordered in the shop and delivered at the next wave's start, the shop opening at the top, the squad row's health states, adaptive canvas resolution, equipment combinations, death/restart and a real simulated wave clear. UI checks exercise fullscreen, touch/keyboard, pause and shop/delivery at desktop, portrait, short landscape and small-phone sizes. UI checks also verify live tuning and both clipboard paths. `perf.py` measures actual RAF intervals and update/render CPU time on wave 6 in a 390×844 touch viewport at DPR 2 with CDP CPU throttling at 4×. It warms up for five seconds and samples for fifteen; `--stress` adds 20 airborne enemies and 12 fresh corpses, with 500 retained ink marks. `--source-ref <commit>` compares old game code without changing the checkout (the current audio script remains loaded), and `--output <path>` saves JSON. Canvas resolution adapts to the device (see below).

Measured in headless Chromium on this workspace (15-second stress sample, 4× CPU throttle):

| Version | Mean RAF / FPS | RAF p95 / p99 | Mean loop CPU / p95 |
| --- | --- | --- | --- |
| Before fixes (`1e42859`) | 92.02 ms / 10.9 | 166.6 / 216.7 ms | 43.28 / 82.1 ms |
| Direct stamping + phone resolution cap | 32.71 ms / 30.6 | 66.7 / 100 ms | 6.54 / 11.8 ms |

Canvas resolution now follows the screen's pixel ratio, up to 2 on touch screens and 2.5 elsewhere (`renderCap`). If play averages slower than 24 ms a frame over two seconds, it steps down half a ratio at a time to a floor of 1 and never steps back up (`noteFrame`), so capable phones get sharp art and weak ones keep the old frame rate. Headless Chromium rasterizes in software, so under the 4× throttle it steps down to 1 during warm-up and then matches the numbers above; `perf.py` reports the scale it ended on (`canvas_px_per_logical_px`). The ink regression is fixed, but this throttled stress workload still misses 60 FPS. These are measured RAF intervals, not an FPS estimate from JavaScript execution time. Treat phone performance as an open playtest issue before featuring the game; the harness makes further renderer work reproducible.

Physical iPhone Safari and subjective difficulty still merit owner playtesting before featuring the game.

Game-owned previews are `site/stick-army/og.png` and `thumb.webp`. Both come from the cover art in `brand/covers/stick-army.png`: `tools/og/make.py` crops it to 4:3, centred, and puts the crop beside the tagline on the card, leaving out the title the art already has. Shared fonts, favicons, apple-touch icon and home-link mark remain in `site/assets/`. Clean player navigation uses `stick-army/` and `../` wherever a home link is offered.

Pages publishing remains a manual workflow. Arweave publishing is paused pending the uploader/manifest follow-up in README. No Worker deploy is needed for this change.
