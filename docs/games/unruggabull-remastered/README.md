# Unruggabull: RugCo Alley Remastered

The 2025 platformer on phones. A blaster-toting bull clears five waves of carpshits in RugCo Alley, then the garage opens and the Rugfather comes out for a three-phase fight. Plan and decisions: [spec.md](spec.md).

**Shelf:** Side A (listed, indexed) since Oct 16, 2026, at `unruggabull-remastered/`. Its card on the games page replaced the 2025 game's card, which linked out to unruggabull.ar.io; the title's "The 2025 original" still links there. Play stats are on (switched on with the listing; `stats/games.json`). The online board needs the leaderboard Worker deployed with this game's entry in `scores/games.json`; until then clears are kept on the device.

## How it plays

As in 2025:

- 20 health, 30 blaster shots, one shot back every 0.6 s. One shot per press.
- Carpshits fly in two lanes. Every 15 unrugged is a new wave ("Wave n/5"); from wave 2 they come from both sides, from wave 4 some swoop. At wave 6 the boss intro starts: the bull walks to the middle, the garage takes 13 seconds to open, the Rugfather spins out and grows. The fight starts about 32 seconds in ("Fight!").
- The Rugfather has 60 HP in three phases. Phase 2 brings carpshits back and speeds the music up; phase 3 opens with a spin-jump across the alley. His flaming carpets take two shots to put out. Every carpshit shot counts as unrugged, in the fight too.
- Clearing him plays his defeat, the bull walks into the garage and the door closes. Getting rugged is "Game over! You got rugged!".

The touches, all presentation (`look.js`): the HUD in Jersey 15 with health in 20 segments, the blaster's 30 shots in cells and the unrugged count with the wave under it, drawn on top and steady while the screen shakes; the Rugfather's health as a segmented bar under his name; fire-escape grates for the platforms; a glowing shot and sparks when a carpshit is unrugged; "Wave n/5", "Fight!" and "Game over!" in Bungee; a new controls screen; the alley's own edges, darkened, in the bars beside it. "Fight!" no longer freezes the screen for its second.

The polish, also presentation (`fx.js`; every frame drawn is still 2025 art, and pieces of things, such as dust, smoke, flames and torn carpshits, are pixel art on a 3 px grid with stepped colours and no rotation):

- **The alley:** firelight that rises and falls with the flames, on the walls and in a pool on the floor; the two RUGS signs rippling in the puddles; red light and embers out of the opening garage (the embers stop once the Rugfather is out), and sparks thrown off his spin as he comes out; a soft vignette and faint grain under the HUD.
- **The bull:** a stretch on take-off and a squash with a puff of dust on landing; a star-shaped muzzle flash and a 3 px kick when he fires; on a hit, a white frame, a short knockback away from what hit him and a quicker blink than 2025's half-fade; an orange rim on the side that faces the burning sign.
- **Carpshits:** a shadow that shrinks with height; swoopers tilt with their swoop and all of them flutter a little; wind streaks and a glint as a swooper rises to the top of each dive (2025's swoopers weave up and down without stopping, so the warning marks the top of the weave and changes no timing); when one is unrugged, a white frame, then its own frame tears into three ragged bands that fly apart, land with a puff of dust and blink out. One that falls without being shot (the defeat scene) falls whole, as in 2025.
- **The Rugfather:** his standing frame breathes (the chest and head rise 3 px, stepped), the bright parts of his fire flicker and pixel flames lick off it, and he lights the floor under him; each hit washes him half white for 45 ms (then 2025's brighter frame) and stops the game for 70 ms; a red pulse and a burst of steam at each phase change; smoke and sparks below 30%; a dust ring and a heavier shake when the spin-jump lands; a flare in his hand and on the floor in the beat before he throws (the throw's timing is 2025's); on the last hit, a 0.3 s freeze with him half white, a light white-out and a second of slow motion before his 2025 defeat.
- **His flaming carpets:** a pixel flame trail instead of 2025's soft glows; light on the walls and floor as one passes; the first shot gives a white frame and knocks it back about 13 px; the second still shows 2025's burst, now with pixel smoke and embers, and it blinks out.

The hit-stops and the slow motion hold the game clock, so they don't count in a clear's time.

## Controls

- **Keyboard:** A/D or the arrows walk, W, Space or Up jumps (held, it keeps jumping, as in 2025), S, C or Down crouches, F, J or Enter fires. Escape or P pauses. On the title, W/S or Up/Down move the blaster and Enter picks; in the gallery, A/D or Left/Right turn the pictures.
- **Touch:** a d-pad on the left (left/right walk, up and the up-diagonals jump, and held keep jumping like a held jump key, down crouches; a press up just before landing still jumps when he lands), and the whole right half of the screen fires, one shot per tap. The Fire button marks where the thumb goes. The pause button is top right; Pause has Resume, Quit, Sound and Full screen.
- The touch controls show on touch screens, and from the first touch on any other screen.

## Screen

Landscape only. The alley is 960 × 540 at the window's full height, centred; on a phone the extra width is bars, where the pad and Fire sit. A window narrower than 16:9 gets bars above and below instead. On a touch screen held upright, a "turn your phone sideways" screen covers everything and the game pauses. Play goes full screen on phones (where the browser allows it) and asks for landscape; the title and the pause card have a Full screen button.

## Title

The RugCo Empire painting from the 2025 gallery, with a slow push-in, firelight and rising embers; the 2025 tagline ("One bull was not like the rest, he was..."), the wordmark and "RugCo Alley · Remastered" (`title.js`, drawn on `#title-art`). The menu is buttons: Play ("Let's go!", then the controls screen, as in 2025), Leaderboard, Gallery (the four 2025 gallery paintings and the 2025 title), Credits, and The 2025 original (unruggabull.ar.io, in a new tab). The title music starts on the first tap or key. Bottom right: this device's fastest clear.

## End of a run and the board

A clear (`end.js`): the 2025 congratulations art fades in over the alley as it did, then moves aside for the run's numbers (time, health, unrugged), then the board. Rugged: the 2025 line on the canvas, with how far he got (wave or the Rugfather, unrugged, time), Retry and Quit (Title after a clear). Retry starts a fresh run on the controls screen; Quit and Title reload to the title.

**The timer and splits.** Under the health and shots, the run's time (the board's clock: from the controls screen to the Rugfather's defeat, pauses and hit-stops not counted). When the waves end and when the Rugfather goes down, that split shows beside it for 3 s: green and minus when it's ahead of this device's fastest clear, red and plus when behind, the plain time when there's no clear yet. A new fastest clear on the device keeps its splits for the next run to race.

**Medals**, on the end card (lit one by one) and beside each name on the board: **Flawless** (the heart, a clear at full health), **Under 2:00** (a stopwatch), **Never ran dry** (the blaster: the blaster never ran out of shots in the run). Rows saved before Never ran dry existed don't show it.

The board (`BOARD = 1` in `game.js`, `scores/games.json`): **fastest clear**, health breaking ties, unrugged shown beside them, and medals beside each name. Only clears go on it. Every row's score is 1 (a clear); the order comes from `time_ms`, which the Worker checks against the run's token like any game's time (no faster than 75 s, below the fastest possible clear of about 98 s: 75 unrugged at the fastest spawns, the 32-second intro, and 60 shots at the Rugfather). `health` is 0–100 (%), `unrugged` 75 and up, `ran_dry` 0 or 1 (1: the blaster ran out at least once). The standing check before initials leaves `ran_dry` out; a Worker deployed before it existed answers `bad_meta` to a submit with it, and the game resubmits without it, so the clear still saves. The run's token is asked for when the controls screen is dismissed; time is the game clock from then to the Rugfather's defeat, so pauses don't count. The initials picker and transport are the site's (`site/assets/leaderboard.js`); every clear is also kept on the device (top 10), which the title and the board show when the Worker can't be reached.

## Sound

The 2025 game's files, all of them, plus a sound pass (`audio.js`; heard first on https://claude.ai/artifact/GSh1hZRjESrGx2R6ze8iaT). The new sounds are made in code; there are no new files.

- **The mix:** music runs through its own filter and level, game sounds through a muffle, menu sounds straight out. Every voice line is levelled to one loudness (the files were recorded about 23 dB apart, from "do do do" to his "ow"), and the music ducks under every line, the bull's and the Rugfather's.
- **Menus** (silent in 2025): a small zap moving through the title menu, the blaster's own shot (pitched up) for a pick, a falling zap for closing a card, a short swoosh for a gallery picture, ticks on the initials as they change, a chime when your row lands on the board, ticks for the end card's numbers, and a pick for Retry, Title and Quit. Pausing muffles everything for a moment before it stops, with a pick going in and a back coming out. The title music fades in, and fades out under "Let's go!" instead of stopping dead.
- **The waves:** each blaster shot, jump grunt and carpshit death a few percent higher or lower; carpshit deaths heard from where they were on screen; a quiet crackle and roar from the burning sign under the whole run; a rising whoosh with a swooper's warning; a short sting with each wave; a thud and a muffled dip in the music when the bull is hit; a soft tap when he lands; a slow heartbeat at 4 hearts or fewer. Out of shots: the 2025 buzz, behind a trigger click, quieter and sagging in pitch as it fades, each press cutting the last.
- **The Rugfather:** a rumble under the garage door and the crackle swelling as it opens; a thud on each hit, and his "ouch" and "ow" (in the 2025 files, never played there) on every fifth; at a phase change the music sinks into the pause with a hiss and rises out of it (still 1.5× and 2× after, as in 2025); a heavy thump when the spin-jump lands; a tick when a carpet takes its first shot and a sizzle when it goes out; on the last hit a boom, his "ow" pitched down, and the music slowing and muffling through the slow motion.
- **The end of a run:** rugged, the music winds down and muffles to a stop under "game over"; a clear gets a short fanfare.

## Play stats

Reported through `site/assets/stats.js` (on since Oct 16, 2026): a run starts when the controls screen is dismissed and ends rugged (`over`), cleared (`won`) or quit from the pause card. Score: unrugged. Stats: `wave` (1–5, 6 once the Rugfather is triggered), `health` (hits left, 0–20), `boss_fight`, `boss_hp` (0–60, once the fight has started).

## Code

Classic scripts, loaded in this order by `site/unruggabull-remastered/index.html` (after the site's `leaderboard.js` and `stats.js`):

- `audio.js`: `UnrugSound` (`clip`, `play`, `preload`, `init`, `muted`, `setPaused`, `fx`). Every mp3 is decoded once into Web Audio; a `Clip` has the `<audio>` element's play, pause, currentTime, volume, loop, src and playbackRate, so the 2025 code calls it as it did, plus `pan`, `fadeTo`, `ease` (a speed change without a restart), a bus (`music`, `sfx`, `ui`), `voice` (ducks the music) and `vary` (random pitch). `UnrugSfx` (`UnrugSound.fx`) is the sound pass: menu sounds, the crackle bed, heartbeat, thuds, the music moves. Below it, the 2025 game's sounds under their old names (`bgMusic`, `fireSound`, ...), voice lines levelled from each file's measured loudness. Pausing muffles, then suspends the whole context.
- `core.js`: the game clock (`gameNow`, `gameTimeout`, `STEP_MS`), input (`keys`, `touchKeys`, `inputLeft()` and the rest), the player, game state (`setGameState` calls `window.onGameState`), the alley background and embers, shots and flaming carpets.
- `look.js`: the touched look's drawing (`lookHud`, `lookBanner`, `lookPlatforms`, `lookShot`, sparks, `lookBossBar`, `lookControlsScreen`, `lookGameOver`, `lookLogo`).
- `fx.js`: the polish (`fxStep` once per game step for particles and timers; `fxTime` holds the loop for hit-stops and slow motion; drawing helpers called from `game.js`, `rugfather.js` and the carpets in `core.js`).
- `rugfather.js`: the Rugfather's sprites, constants, AI, boss object, intro and defeat timelines and the orchestrator that plays them.
- `game.js`: `BOARD`, platforms, the level config, carpshits, collisions, `updateGame`, `renderGame` (the scene, then the HUD and banners) and `renderScene`, `resetGame`, the loop (`gameLoop`) and `beginGame`.
- `end.js`: `UnrugRun`: the run's token and play stats, the end card, the board table, this device's clears.
- `title.js`: `UnrugTitle`: the title's drawing, its menu and the Leaderboard, Gallery and Credits cards.
- `phone.js`: layout, the touch controls and the bars on `#hud`, pause, full screen and the portrait screen.

Most of `core.js`, `rugfather.js` and `game.js` is the 2025 source, bundled out of its ES modules (comments name the original file). The changes from 2025: `performance.now()` is `gameNow()` and `setTimeout` is `gameTimeout` everywhere in the game, so time only moves when the game steps; the loop steps at a fixed 60 a second (a 120 Hz phone ran the 2025 game twice as fast); input reads `inputLeft()` and the others instead of fixed keys; drawing goes through `look.js`; the end screens are the end card; a retry resets what the 2025 restart left behind (the open garage, fast music, the last fight's timers and shots); the dev tools are left out; sounds go through `audio.js`.

Art is in `art/` (webp, converted from the 2025 PNGs), sound in `sound/` (re-encoded: music 128 kbit stereo, effects and voices 80 kbit mono). Type: Bungee and Jersey 15 from `site/assets/fonts/`. The share card (1200 × 630) and the games-page thumbnail (768 × 576) are the poster design Jonnie picked, drawn by `tools/og/cards/unruggabull-remastered.html` from the title's painting and built by `tools/og/make.py --game unruggabull-remastered`: the tagline, the wordmark and "NOW ON MOBILE".

## Validation

`tests/unruggabull-remastered/test.py` (serve `site/` first, see the README's Browser checks): on a phone-sized touch screen it checks the layout, the clock rate, walking, an up-diagonal jump that happens once, crouching, one shot per tap and per hold, pause, the portrait screen, getting rugged and Retry; on a desktop, the title menu by keyboard and the game's keys; the title's board (this device's clears), gallery, credits and the link to the original; and on a fake clock, the whole boss intro, fight, congratulations and the end card through initials to the board. Screenshots go to `SCREENSHOTS` (default `/tmp/unruggabull-remastered`). `stats/test/games.py` covers its play stats; `tools/check_boards.py` its board.

## History

- **Oct 16, 2026:** listed on Side A, play stats switched on, in place of the 2025 game's card (which linked out to unruggabull.ar.io), and no longer noindexed.
- **Oct 16, 2026:** the run timer with splits against the device's fastest clear, and medals on the end card and the board (`ran_dry` added to the board). From the first plays: holding up on the pad keeps jumping (it was once per press); the garage's embers stop once the Rugfather is out, sparks instead of smoke round his spin, a lighter white on hits and the defeat, and Quit on the game-over card.
- **Oct 16, 2026:** its own share card and thumbnail: the poster mockup, with "Now on mobile".
- **Oct 16, 2026:** the sound pass (`audio.js`), from https://claude.ai/artifact/GSh1hZRjESrGx2R6ze8iaT: menu set A ("Blaster"), and the "Dying" take on the out-of-shots buzz.
- **Oct 16, 2026:** the polish (`fx.js`), from two mockups: https://claude.ai/artifact/JF7kkcjtNWmEW9KmGp4ghb (the alley) and https://claude.ai/artifact/QJ7zGoDidQJ97NEBQGLA2w (the sprites). Left out at Jonnie's call: the Rugfather turning to look at the camera.
- **Oct 16, 2026:** built in one pull request: the 2025 game moved here and plays on phones (step 1), the touched look and title B (step 2), the end card and board (step 3), the share card and thumbnail (step 4).
