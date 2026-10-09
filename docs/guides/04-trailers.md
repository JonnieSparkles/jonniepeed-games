# 04: Trailers

A trailer is built from the game itself: a scripted player plays seeded takes in a headless browser, every frame is captured under a fake clock, and the game's own sound is re-rendered from what it played. Text layers, music and the cut are added on top. Don't Step on a Crack (15 s, 1920×1080, new music), Thimbleful (16.1 s, the game's own music) and Unruggabull (33 s, the game's own theme, from its own repo) have one.

## Running

Install Python Playwright and Chromium as for the browser checks in the README, plus `numpy`, `scipy`, `pillow` and `ffmpeg`. The tool serves `site/` itself, so no local server is needed. A game kept in its own repo is served from a checkout of that repo, named by `site` in its `trailer.json`: Unruggabull's is `../unruggabull-the-game`, so clone [unruggabull-the-game](https://github.com/JonnieSparkles/unruggabull-the-game) next to this repo first. Its art, sound and music are read from there; nothing is copied here.

```sh
python3 tools/trailer/make.py dont-step-on-a-crack --dry        # play every take without filming; check the cut
python3 tools/trailer/make.py dont-step-on-a-crack              # the whole trailer
python3 tools/trailer/make.py dont-step-on-a-crack --takes C    # re-shoot one take, keep the others
python3 tools/trailer/make.py dont-step-on-a-crack --cut-only   # re-cut from the takes you have
```

| Flag | What it does |
| --- | --- |
| `--dry` | Plays the takes without screenshots or sound, at 1x pixel density, then checks that every marker the cut needs exists and that every shot's footage falls inside a filmed window. Output goes to `dry/` inside the output folder. |
| `--takes A,C` | Shoots only these takes and reuses the others from the output folder. |
| `--cut-only` | Doesn't shoot; renders the music, layers and cut from the takes already there. |
| `--jobs N` | Takes shot at once (default 3). |
| `--out DIR` | Output folder, default `work/trailer/<slug>/` (git-ignored). |

The output folder gets `trailer.mp4`, `sheet.jpg` (three frames from every shot and the end card), `music.wav`, `mix.wav`, `layers/` and one folder per take with its frames, markers and `game.wav`. `CHROMIUM` selects a system browser, as in the other harnesses.

On a 2-CPU machine, Crack's three takes take about 6 minutes dry and 15 to 20 minutes filmed, three at a time; the cut itself takes about a minute.

## How it works

- **Fake clock.** Playwright's clock is installed and paused before the page loads, and the game only moves when the clock is run, 1/30 s per frame, so screenshot speed doesn't matter. (A clock that's only installed runs in real time.) The page still boots a little earlier or later depending on CPU load, so the harness re-bases the page's clock on its first frame: every run sees the same times. Without that, floating-point ties, such as a timer set exactly 6 s ahead, break differently and runs drift apart. CSS animations don't follow Playwright's clock, so the harness steps them by hand each frame.
- **Seeded takes.** `Math.random` is seeded per take, and seeded again by the plan's `start` item; the director's `D.start` resets title-screen state that would otherwise carry into the run (Crack resets when the next bird sings and which frames redraw the Mom Cam). The same seed and plan then play the same way every time, filmed or dry, at any pixel density and under any CPU load, so a dry run tells you what the filmed run will do. Dry runs draw at 1x, which only changes drawing. To check a new game repeats, dry-run a take twice and compare the take files: each sound records how many random numbers had been drawn (`r`), and `rng` has the count for every frame.
- **Markers, not frame numbers.** The director leaves markers when things happen (a crack hit, Dad arriving, the street changing). `shots.py` places each shot by a marker plus an offset, so a re-shot take re-cuts itself.
- **The game's own sound.** Every top-level call into the game's sound object is logged with its time and state flags. Afterwards the game's `audio.js` is loaded into a blank page whose `AudioContext` is one `OfflineAudioContext`, and each call is replayed at its time. The result is the real game sound, in exact sync, without recording anything.
- **Capture at 4/3 scale.** Frames are captured at 2560×1440 for a 1920×1080 trailer, so the cut can push in up to a third and stay sharp.
- **Or the canvas's own pixels.** A pixel-art game can save its canvas instead of screenshots (`canvas` in `trailer.json`). Thimbleful's 96×72 frames are scaled up 40× whole before the cut crops them, so any push-in stays crisp, and filming costs almost nothing: its 130-second storm take films in under a minute.
- **The game's own music, in one pass.** A game that plays its own music from timers (Thimbleful's loop is scheduled from `setInterval`) can't be cut from separate takes without the music jumping at every cut. With `audio.score`, shots.py steers the game's music itself (Thimbleful: `start()`, then `intensity()` at the cozy and storm tempos) and `cut.score_calls` moves every shot's sound effects to the trailer's time. Both are replayed into one sound object, so the music runs straight through and the catch notes still follow its chords. In the replay, the page's timers run on the audio clock (`audio.timers`).
- **`<audio>` elements.** Games that play files (`new Audio('ow.mp3').play()`, Unruggabull) get `audio.media`: the harness logs every element's plays, pauses, seeks and rate and volume changes, and `media.py` mixes the same files back in at those times. `audio.exclude` leaves the music out, so `music.py` can cut it to the trailer instead (Unruggabull: the theme's intro, its drop, silence for the boss's entrance like the game, then 1.5x for the fight, like the game).
- **ES modules.** The bridge (`script`, `inject_before`) also works on a module: injected into Unruggabull's `src/controller.js`, its eval sees that module's imports (`state`, `player`, the enemies), and the director reaches other modules with `import()`. A game whose loop only runs during play uses `"hook": "@frame"`: the harness runs the plan from an animation frame of its own, title screen included.

## Making one

1. **Write the cut on a beat grid first.** Pick a tempo and length (Crack: 128 BPM, 8 bars, 15 s) and decide what lands on which beat in `shots.py` before shooting anything. Write `music.py` to the same grid. Put the game's name on the very first frame: share previews and feeds show it before anything plays. End on the game's cover with the studio mark and jonniepeed.games, big (84 px, outlined, on a dark shade) so it reads on a phone.
2. **Write the takes.** Each take in `takes.json` is a seed and a plan. Film only the windows the cut needs (`capture` on and off) and walk between them unfilmed.
3. **Dry-run until it's clean.** Most of the time on Crack's trailer went into re-shoots: the scripted player stepped on cracks, ran out of giant steps or let Mom die before the shot. A dry run shows that from the printed markers, in about a third of the time a filmed run takes.
4. **Shoot, then look at `sheet.jpg`.** Adjust offsets in `shots.py` and re-cut with `--cut-only`, which takes about a minute. Re-shoot a single take with `--takes` when a plan has to change.
5. **Listen before you post.** The music is synthesized (`tools/trailer/synth.py`), and its timing and levels can be checked by script, but not how it sounds. Crack's first cue, in D minor with a diminished stab, came out sounding like Halloween; D major fixed it.
6. **Post it from `work/`.** Upload `work/trailer/<slug>/trailer.mp4` to YouTube and social platforms. The video stays out of the repo ([Trailers](../../README.md#trailers) in the README), and the same command rebuilds the exact cut.

Stage what the camera doesn't see. Crack's takes turn off random skateboards and squirrels, and the long walk to Quarry Ln keeps Mom's back from breaking below three vertebrae (`D.floorHp`) so she reaches the finale alive. Nothing staged is on screen; the filmed part plays normally from there.

## Opting in a game

Add `tests/<slug>/trailer/`:

| File | Role |
| --- | --- |
| `trailer.json` | The page, viewport and capture `scale`, the per-frame function to hook (`hook`), the framing CSS and director files, and the sound object: `{object, script, init, state}`, where `state` lists flags to restore with each call (Crack: `quiet`). `canvas` (`{selector, upscale}`) films a canvas's own pixels; `audio.timers` and `audio.score` are for games that play their own music (see above); `quiet_marks` lists marker prefixes too frequent to print. Games that keep their code in a closure add `script` and `inject_before`, like `balance.json`, and get the same eval bridge (not tried yet; Stick Army would be the first). |
| `takes.json` | Takes by name: `seed`, `max_s` and the `plan`. |
| `director.js` | The scripted player, evaluated in the game's scope after the shared harness. |
| `trailer.css` | Framing for the trailer: Crack makes the Mom Cam 446 px and hides buttons and stats. |
| `layers.html` | Text layers. Each `<template id>` becomes a transparent PNG; `{{SITE}}` is the local site's address, for the game's fonts. |
| `music.py` | Optional: `render(path)` for new music, written with `tools/trailer/synth.py`, or `render(path, site)` to cut the game's own music from its folder. Without it, the game's own sound is the whole soundtrack. |
| `shots.py` | `build(takes, layer, repo)` returns the cut: `dur`, `shots`, `overlay`, `end` and `mix`, made with `tools/trailer/cut.py`, and optionally `open`, a card before the first shot (Unruggabull's title screen). `build(takes, layer, repo, site)` also gets the game's folder, for art kept there. |

A plan is a list of items, played one at a time, once per game frame. The shared harness provides `start`, `capture` (`on`), `wait` (`dur` or `until`, a JavaScript condition in the game's scope), `js` (`code`, run once with `now` and `D`), `mark` and `end`. Any item can have a `name`, which leaves a marker when it starts. The director adds the game's own items; Crack's are `walk`, `crack`, `shoes`, `roll` and `jump` (see the top of its `director.js`).

The director sets these on `window.__D`:

```js
D.start = () => startGame();                  // what the `start` item does
D.nowFrom = args => args[1];                  // the time, from the hooked function's arguments
D.state = () => ({ hp, phase });              // fields stored with every marker
D.onItem = it => { it.hp0 = hp; };            // when an item starts
D.items.walk = (it, now) => { ... it.fin = true; };
D.watch.push(now => ...);                     // every frame: markers for things that just happen
D.stage.push(now => ...);                     // every frame while the plan runs: staging
D.markCalls(['breakVertebra', 'gameOver']);   // a marker each time the game calls these
```

The game needs:

1. **A frame loop on `requestAnimationFrame`, and a per-frame function the harness can wrap**, reachable by name (a global, or through the bridge).
2. **A sound object called through its methods**, like `CrackSound`, that creates its `AudioContext` with `new AudioContext()`; or `<audio>` elements (`audio.media`).
3. **A director that plays through the player's input path.** Crack's presses and holds sides, steers with the arrow-key flags and jumps with `keyJump()`, the same paths as touch and keys, so the footage shows real play.

Nothing here ships. The harness and director are injected at capture time only.
