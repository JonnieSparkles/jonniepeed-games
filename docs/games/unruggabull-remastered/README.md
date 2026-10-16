# Unruggabull: RugCo Alley Remastered

The 2025 platformer on phones. A blaster-toting bull clears five waves of carpshits in RugCo Alley, then the garage opens and the Rugfather comes out for a three-phase fight. Plan and decisions: [spec.md](spec.md).

**Shelf:** unlisted (no card, noindexed), reached at `unruggabull-remastered/`. Play stats are not wired yet.

## How it plays

As in 2025:

- 20 health, 30 blaster shots, one shot back every 0.6 s. One shot per press.
- Carpshits fly in two lanes. Every 15 unrugged is a new wave (banner "Wave n/5"); from wave 2 they come from both sides, from wave 4 some swoop. At wave 6 the boss intro starts: the bull walks to the middle, the garage takes 13 seconds to open, the Rugfather spins out and grows. The fight starts about 32 seconds in.
- The Rugfather has 60 HP in three phases. Phase 2 brings carpshits back and speeds the music up; phase 3 opens with a spin-jump across the alley. His flaming carpets take two shots to put out. Every carpshit shot counts as unrugged, in the fight too.
- Clearing him plays his defeat, the bull walks into the garage, the door closes, and the congratulations art shows health and time with Restart. Getting rugged shows "Game over! You got rugged!" with Restart.

## Controls

- **Keyboard:** A/D or the arrows walk, Space or Up jumps (held, it keeps jumping, as in 2025), C, S or Down crouches, F, J or Enter fires. Escape or P pauses.
- **Touch:** a d-pad on the left (left/right walk, up and the up-diagonals jump once per press, down crouches; a press up just before landing still jumps), and the whole right half of the screen fires, one shot per tap. The Fire button marks where the thumb goes. The pause button is top right.
- The touch controls show on touch screens, and from the first touch on any other screen.

## Screen

Landscape only. The alley is 960 × 540 at the window's full height, centred; on a phone the extra width is black bars, where the pad and Fire sit. A window narrower than 16:9 gets bars above and below. On a touch screen held upright, a "turn your phone sideways" screen covers everything and the game pauses. Start goes full screen on phones (where the browser allows it) and asks for landscape; the title and the pause card have a Full screen button.

## Code

Classic scripts, loaded in this order by `site/unruggabull-remastered/index.html`:

- `audio.js`: `UnrugSound` (`clip`, `play`, `preload`, `init`, `muted`, `setPaused`). Every mp3 is decoded once into Web Audio; a `Clip` has the `<audio>` element's play, pause, currentTime, volume, loop, src and playbackRate, so the 2025 code calls it as it did. Below it, the 2025 game's sounds under their old names (`bgMusic`, `fireSound`, ...). Pausing suspends the whole context.
- `core.js`: the game clock (`gameNow`, `gameTimeout`, `STEP_MS`), input (`keys`, `touchKeys`, `inputLeft()` and the rest), the player, game state, the alley background and embers, bullets and flaming carpets.
- `rugfather.js`: the Rugfather's sprites, constants, AI, boss object, intro and defeat timelines and the orchestrator that plays them.
- `game.js`: platforms, the level config, carpshits, collisions, `updateGame`, the HUD and banners, `renderGame`, `resetGame`, the loop (`gameLoop`, `beginGame`) and the Restart button.
- `phone.js`: layout, the touch controls and their drawing on `#hud`, pause, full screen, the portrait screen and the title's start flow.

Most of `core.js`, `rugfather.js` and `game.js` is the 2025 source, bundled out of its ES modules (comments name the original file). The changes from 2025: `performance.now()` is `gameNow()` and `setTimeout` is `gameTimeout` everywhere in the game, so time only moves when the game steps; the loop steps at a fixed 60 a second; input reads `inputLeft()` and the others instead of fixed keys; the Restart button maps clicks back to the 960 × 540 canvas; the dev tools are left out; sounds go through `audio.js`.

Art is in `art/` (webp, converted from the 2025 PNGs), sound in `sound/` (re-encoded: music 128 kbit stereo, effects and voices 80 kbit mono).

## Validation

`tests/unruggabull-remastered/test.py` (serve `site/` first, see the README's Browser checks): on a phone-sized touch screen it checks the layout, the clock rate, walking, an up-diagonal jump that happens once, crouching, one shot per tap and per hold, pause, the portrait screen and Restart; on a desktop, the keyboard; and on a fake clock, the whole boss intro, fight and congratulations. Screenshots go to `SCREENSHOTS` (default `/tmp/unruggabull-remastered`).

## History

- **Oct 16, 2026:** step 1. The 2025 game moved here and plays on phones.
