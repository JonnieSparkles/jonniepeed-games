# Thimbleful

A tiny explorer on a windowsill catches drips from a leaky watering can in her thimble, and every drop grows her sunflower. The game is at `site/thimbleful/index.html`. It has no build spec: it predates `specs/`, so its history is in git and in this doc. The folder layout follows [SPEC-003](../../specs/SPEC-003-repo-layout.md).

## How it started

Jonnie saw a post saying Claude could make animated pixel-art scenes, so he asked for one. He was looking at a houseplant at the time and suggested a scene inspired by *George Shrinks*, William Joyce's picture book about a boy who wakes up tiny. Claude offered a windowsill, and that became the first scene: a sunset over the city, potted plants, and a tiny person living among them.

Jonnie's next question was whether it could be a game. A thimble became the bucket, a leaky watering can became the hazard, and catching its drips grew a sunflower. The original windowsill scene lives on as the first-play intro and the "Just watch" mode, and the golden drop is a nod to the studio's name.

## Rules

- Move with the arrow keys or A/D, or drag anywhere in the arena (in portrait full screen the empty space under the scene is a thumb zone). M mutes and F toggles full screen.
- Each blue drop caught is 1 point. A drop that hits the sill is a spill, and 5 spills end the game.
- Gold drops are worth 3. They fall 25% faster, and missing one costs nothing. They can appear once the score reaches 8, with an 11% chance per drop, one at a time, and the spout glints gold just before.
- **Earn-back:** 15 catches in a row without a spill wins back one spill, at most once every 60 seconds. The streak count and a bar showing progress to the next spill back sit under the explorer.
- The sunflower is the score:
  - it blooms at 14 and the head grows at 20 and 26 (each a milestone sound);
  - side blooms branch off at 35 and 65;
  - a butterfly lands at 45;
  - bees turn up at 90.
- **#watch** (`thimbleful/#watch`) opens "Just watch" directly.

## Difficulty and mood (board 3)

Everything hangs off one value, `edge`. It is 0 for the first `COZY` (60) seconds, then rises to 1 over `EDGE_RAMP` (180) seconds, so a run reaches full storm at 4 minutes.

| | First minute | Then, with `edge` |
| --- | --- | --- |
| Time between drops | 1.45 s down to 0.48 s | another −0.1 s |
| Fall speed (px/s) | 20 up to 56 | another +14 |
| Drop speed spread | none | up to ±25% per drop |
| Can feints | none | 45% × `edge` of drops: the can shudders and darts back the other way just before it drips |
| Can speed | `16 + 0.45 × seconds`, capped at 100 | same |

On the same ramp:

- **Sky:** dusk turns the sky to night over 150 seconds. From the first minute on, a storm also greys it over, with low clouds, rain, and lightning with thunder from about a third of the way in. There is no lightning with reduced motion.
- **The can:** plain at first, smug past 8%, manic past 55%, when its pupils follow the explorer.
- **Music:** turns minor (Cm, Ab, Fm, G) past 25% and adds a gritty bass and drums past 60%, both changing at the top of the four-bar loop. The tempo also climbs.
- **Catch sounds:** climb the notes of the chord that's playing, so they follow the music and turn minor with it. Longer streaks add a harmony (6 catches), an echo (12) and a sparkle (20).

Earn-back was tried at 20 for board 3 and set back to 15. Late in the storm even a perfect tracking bot misses about one drop in seven, so a 20-catch streak almost never happened, just when a spill back matters most.

Measured with a bot that always chases the right drop (20-second samples):

| Stage | Bot misses |
| --- | --- |
| First minute | 0% |
| About 3 minutes (`edge` 0.6) | ~7% |
| Full storm | ~14% |

Still unverified: how the music, thunder and catch sounds actually sound (only checked as code that runs), and whether the feints feel fair to a person. Both need a human playtest.

## Leaderboard

Game ID `thimbleful`, rules in `scores/games.json`, following [the leaderboard guide](../guides/00-leaderboards.md). The score is drops caught (higher is better, up to 10,000), with optional meta `time_ms`. The local best is stored per board as `thimbleful-best-<BOARD>`.

| Board | Change |
| --- | --- |
| 1 | Original game |
| 2 | Bigger drops and a wider catch (`CATCH` 4.5) |
| 3 | Keeps getting harder after the first minute (the table above) |

The game over card runs in steps so nothing changes under a finger about to tap: checking, then (if placed) Enter initials or Skip, then the board below the buttons. The title card has a **High scores** link that opens the current board below the buttons without starting a run.

## Code entry points

`site/thimbleful/game.js` holds the simulation, drawing and leaderboard flow. `site/thimbleful/audio.js` is `ThimbleSound`, everything synthesized with Web Audio, and loads before `game.js`.

| Area | Entry points |
| --- | --- |
| Board, constants and tuning | `BOARD`, `CATCH`, `GOLD_*`, `EARN_*`, `DUSK_SECONDS`, `COZY`, `EDGE_RAMP` at the top of `game.js` |
| Run flow | `start`, `finishIntro`, `end`, `watch`, `leaveWatch`, `showCard` |
| Difficulty, drops, feints, lightning | `update`, `moveCan` |
| Scene and storm | `scene` (sky, dusk, storm, rain), `plants`, `flower`, `visitors` |
| Characters | `wateringCan` (including its face), `explorer`, `drawExplorer` |
| HUD on the wall | `streakMeter`, `digits`, `plusThree`, `heartPop` |
| Leaderboard | `loadLeaderboard`, `showLeaderboard`, `openPicker`, `drawLeaderboard`, `openScores` (title card) |
| Full screen | the "full screen" section: `setFull`, `toggleFull`, wake lock |
| Sound | `ThimbleSound.start`, `.intensity(seconds, edge)`, `.catch`, `.gold`, `.earn`, `.milestone`, `.spill`, `.over`, `.thunder`, `.toggle`, `.muted` |

## Validation

```sh
node --check site/thimbleful/game.js
node --check site/thimbleful/audio.js
python3 tools/check_boards.py
```

The browser runner `scores/test/games.py` covers both scored games, including Thimbleful's end screen, its title-card High scores and full screen, in portrait, landscape and desktop. It needs the local Worker and site servers from [Local development](../guides/00-leaderboards.md#local-development).

The preview card and index thumbnail (`site/thimbleful/og.png`, `thumb.png`) are captured from the live canvas a few seconds into a run by `python3 tools/og/make.py`. Run `python3 tools/stamp.py` last after any change in `site/`.
