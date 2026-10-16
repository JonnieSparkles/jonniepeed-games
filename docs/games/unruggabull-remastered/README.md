# Unruggabull: RugCo Alley Remastered

The 2025 platformer on phones. A blaster-toting bull clears five waves of carpshits in RugCo Alley, then the garage opens and the Rugfather comes out for a three-phase fight. Plan and decisions: [spec.md](spec.md).

**Shelf:** unlisted (no card, noindexed), reached at `unruggabull-remastered/`. Play stats are wired and switched off (`stats/games.json`). The online board needs the leaderboard Worker deployed with this game's entry in `scores/games.json`; until then clears are kept on the device.

## How it plays

As in 2025:

- 20 health, 30 blaster shots, one shot back every 0.6 s. One shot per press.
- Carpshits fly in two lanes. Every 15 unrugged is a new wave ("Wave n/5"); from wave 2 they come from both sides, from wave 4 some swoop. At wave 6 the boss intro starts: the bull walks to the middle, the garage takes 13 seconds to open, the Rugfather spins out and grows. The fight starts about 32 seconds in ("Fight!").
- The Rugfather has 60 HP in three phases. Phase 2 brings carpshits back and speeds the music up; phase 3 opens with a spin-jump across the alley. His flaming carpets take two shots to put out. Every carpshit shot counts as unrugged, in the fight too.
- Clearing him plays his defeat, the bull walks into the garage and the door closes. Getting rugged is "Game over! You got rugged!".

The touches, all presentation (`look.js`): the HUD in Jersey 15 with health in 20 segments, the blaster's 30 shots in cells and the unrugged count with the wave under it, drawn on top and steady while the screen shakes; the Rugfather's health as a segmented bar under his name; fire-escape grates for the platforms; a glowing shot and sparks when a carpshit is unrugged; "Wave n/5", "Fight!" and "Game over!" in Bungee; a new controls screen; the alley's own edges, darkened, in the bars beside it. "Fight!" no longer freezes the screen for its second.

The polish, also presentation (`fx.js`; every frame drawn is still 2025 art, and pieces of things, such as dust, smoke, flames and torn carpshits, are pixel art on a 3 px grid with stepped colours and no rotation):

- **The alley:** firelight that rises and falls with the flames, on the walls and in a pool on the floor; the two RUGS signs rippling in the puddles; red light, embers and smoke out of the opening garage; a soft vignette and faint grain under the HUD.
- **The bull:** a stretch on take-off and a squash with a puff of dust on landing; a star-shaped muzzle flash and a 3 px kick when he fires; on a hit, a white frame, a short knockback away from what hit him and a quicker blink than 2025's half-fade; an orange rim on the side that faces the burning sign.
- **Carpshits:** a shadow that shrinks with height; swoopers tilt with their swoop and all of them flutter a little; wind streaks and a glint as a swooper rises to the top of each dive (2025's swoopers weave up and down without stopping, so the warning marks the top of the weave and changes no timing); when one is unrugged, a white frame, then its own frame tears into three ragged bands that fly apart, land with a puff of dust and blink out. One that falls without being shot (the defeat scene) falls whole, as in 2025.
- **The Rugfather:** his standing frame breathes (the chest and head rise 3 px, stepped), the bright parts of his fire flicker and pixel flames lick off it, and he lights the floor under him; each hit is a white frame for 80 ms (then 2025's brighter frame) and stops the game for 70 ms; a red pulse and a burst of steam at each phase change; smoke and sparks below 30%; a dust ring and a heavier shake when the spin-jump lands; a flare in his hand and on the floor in the beat before he throws (the throw's timing is 2025's); on the last hit, a 0.3 s freeze, a white-out and a second of slow motion before his 2025 defeat.
- **His flaming carpets:** a pixel flame trail instead of 2025's soft glows; light on the walls and floor as one passes; the first shot gives a white frame and knocks it back about 13 px; the second still shows 2025's burst, now with pixel smoke and embers, and it blinks out.

The hit-stops and the slow motion hold the game clock, so they don't count in a clear's time.

## Controls

- **Keyboard:** A/D or the arrows walk, W, Space or Up jumps (held, it keeps jumping, as in 2025), S, C or Down crouches, F, J or Enter fires. Escape or P pauses. On the title, W/S or Up/Down move the blaster and Enter picks; in the gallery, A/D or Left/Right turn the pictures.
- **Touch:** a d-pad on the left (left/right walk, up and the up-diagonals jump once per press, down crouches; a press up just before landing still jumps when he lands), and the whole right half of the screen fires, one shot per tap. The Fire button marks where the thumb goes. The pause button is top right; Pause has Resume, Quit, Sound and Full screen.
- The touch controls show on touch screens, and from the first touch on any other screen.

## Screen

Landscape only. The alley is 960 × 540 at the window's full height, centred; on a phone the extra width is bars, where the pad and Fire sit. A window narrower than 16:9 gets bars above and below instead. On a touch screen held upright, a "turn your phone sideways" screen covers everything and the game pauses. Play goes full screen on phones (where the browser allows it) and asks for landscape; the title and the pause card have a Full screen button.

## Title

The RugCo Empire painting from the 2025 gallery, with a slow push-in, firelight and rising embers; the 2025 tagline ("One bull was not like the rest, he was..."), the wordmark and "RugCo Alley · Remastered" (`title.js`, drawn on `#title-art`). The menu is buttons: Play ("Let's go!", then the controls screen, as in 2025), Leaderboard, Gallery (the four 2025 gallery paintings and the 2025 title), Credits, and The 2025 original (unruggabull.ar.io, in a new tab). The title music starts on the first tap or key. Bottom right: this device's fastest clear.

## End of a run and the board

A clear (`end.js`): the 2025 congratulations art fades in over the alley as it did, then moves aside for the run's numbers (time, health, unrugged), then the board. Rugged: the 2025 line on the canvas, with how far he got (wave or the Rugfather, unrugged, time), Retry and Title. Retry starts a fresh run on the controls screen; Title reloads.

The board (`BOARD = 1` in `game.js`, `scores/games.json`): **fastest clear**, health breaking ties, unrugged shown beside them, and a heart for a clear at full health. Only clears go on it. Every row's score is 1 (a clear); the order comes from `time_ms`, which the Worker checks against the run's token like any game's time (no faster than 75 s, below the fastest possible clear of about 98 s: 75 unrugged at the fastest spawns, the 32-second intro, and 60 shots at the Rugfather). `health` is 0–100 (%), `unrugged` 75 and up. The run's token is asked for when the controls screen is dismissed; time is the game clock from then to the Rugfather's defeat, so pauses don't count. The initials picker and transport are the site's (`site/assets/leaderboard.js`); every clear is also kept on the device (top 10), which the title and the board show when the Worker can't be reached.

## Play stats

Reported through `site/assets/stats.js` (switched off): a run starts when the controls screen is dismissed and ends rugged (`over`), cleared (`won`) or quit from the pause card. Score: unrugged. Stats: `wave` (1–5, 6 once the Rugfather is triggered), `health` (hits left, 0–20), `boss_fight`, `boss_hp` (0–60, once the fight has started).

## Code

Classic scripts, loaded in this order by `site/unruggabull-remastered/index.html` (after the site's `leaderboard.js` and `stats.js`):

- `audio.js`: `UnrugSound` (`clip`, `play`, `preload`, `init`, `muted`, `setPaused`). Every mp3 is decoded once into Web Audio; a `Clip` has the `<audio>` element's play, pause, currentTime, volume, loop, src and playbackRate, so the 2025 code calls it as it did. Below it, the 2025 game's sounds under their old names (`bgMusic`, `fireSound`, ...). Pausing suspends the whole context.
- `core.js`: the game clock (`gameNow`, `gameTimeout`, `STEP_MS`), input (`keys`, `touchKeys`, `inputLeft()` and the rest), the player, game state (`setGameState` calls `window.onGameState`), the alley background and embers, shots and flaming carpets.
- `look.js`: the touched look's drawing (`lookHud`, `lookBanner`, `lookPlatforms`, `lookShot`, sparks, `lookBossBar`, `lookControlsScreen`, `lookGameOver`, `lookLogo`).
- `fx.js`: the polish (`fxStep` once per game step for particles and timers; `fxTime` holds the loop for hit-stops and slow motion; drawing helpers called from `game.js`, `rugfather.js` and the carpets in `core.js`).
- `rugfather.js`: the Rugfather's sprites, constants, AI, boss object, intro and defeat timelines and the orchestrator that plays them.
- `game.js`: `BOARD`, platforms, the level config, carpshits, collisions, `updateGame`, `renderGame` (the scene, then the HUD and banners) and `renderScene`, `resetGame`, the loop (`gameLoop`) and `beginGame`.
- `end.js`: `UnrugRun`: the run's token and play stats, the end card, the board table, this device's clears.
- `title.js`: `UnrugTitle`: the title's drawing, its menu and the Leaderboard, Gallery and Credits cards.
- `phone.js`: layout, the touch controls and the bars on `#hud`, pause, full screen and the portrait screen.

Most of `core.js`, `rugfather.js` and `game.js` is the 2025 source, bundled out of its ES modules (comments name the original file). The changes from 2025: `performance.now()` is `gameNow()` and `setTimeout` is `gameTimeout` everywhere in the game, so time only moves when the game steps; the loop steps at a fixed 60 a second (a 120 Hz phone ran the 2025 game twice as fast); input reads `inputLeft()` and the others instead of fixed keys; drawing goes through `look.js`; the end screens are the end card; a retry resets what the 2025 restart left behind (the open garage, fast music, the last fight's timers and shots); the dev tools are left out; sounds go through `audio.js`.

Art is in `art/` (webp, converted from the 2025 PNGs), sound in `sound/` (re-encoded: music 128 kbit stereo, effects and voices 80 kbit mono). Type: Bungee and Jersey 15 from `site/assets/fonts/`. The share card and thumbnail come from `tools/og/make.py` (a capture of the title in a 4:3 window).

## Validation

`tests/unruggabull-remastered/test.py` (serve `site/` first, see the README's Browser checks): on a phone-sized touch screen it checks the layout, the clock rate, walking, an up-diagonal jump that happens once, crouching, one shot per tap and per hold, pause, the portrait screen, getting rugged and Retry; on a desktop, the title menu by keyboard and the game's keys; the title's board (this device's clears), gallery, credits and the link to the original; and on a fake clock, the whole boss intro, fight, congratulations and the end card through initials to the board. Screenshots go to `SCREENSHOTS` (default `/tmp/unruggabull-remastered`). `stats/test/games.py` covers its play stats; `tools/check_boards.py` its board.

## History

- **Oct 16, 2026:** the polish (`fx.js`), from two mockups: https://claude.ai/artifact/JF7kkcjtNWmEW9KmGp4ghb (the alley) and https://claude.ai/artifact/QJ7zGoDidQJ97NEBQGLA2w (the sprites). Left out at Jonnie's call: the Rugfather turning to look at the camera.
- **Oct 16, 2026:** built in one pull request: the 2025 game moved here and plays on phones (step 1), the touched look and title B (step 2), the end card and board (step 3), the share card and thumbnail (step 4).
