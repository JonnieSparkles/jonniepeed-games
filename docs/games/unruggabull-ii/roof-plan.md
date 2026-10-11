# Unruggabull II: the roof plan

The plan for the roof, the last stage: p(Loom)'s fight and the mega stream finale. It's written to hand off in two parts:

- **Part A, the framework:** for Codex or any agent. It needs no new art or sound decisions. Everything gets built and wired up with stand-in drawing, and it should be fully playable, tested and run by the bots.
- **Part B, the polish:** done afterward in Claude, where the art tools and the mockups live.

The game's rules are in [README.md](README.md) and its design in [spec.md](spec.md); this plan adds to them. When a part lands, move what it built into README.md (rules) and spec.md (design), and add the why to [history.md](history.md).

The approved storyboard is [roof-storyboard.png](roof-storyboard.png): 23 frames, read left to right, top to bottom. The page that draws them, with a note on each, is built from `tools/unruggabull-ii/roof-storyboard/` (`python3 tools/unruggabull-ii/roof-storyboard/build.py out.html`); its `board.js` has the stand-in drawing for the loom, HUD, rings, beam and cut-ins in plain code. Each frame's caption and note are the `said` and `note` fields in `board.js`. The owner's copy is a Claude artifact (https://claude.ai/artifact/GeDrfRGvsh3rXLALE8NHZZ) that other agents can't open; everything on it is in the repo.

## The shape of it

About 3½ minutes in all, in three acts. All times are starting points.

| Part | Length | What happens |
| --- | --- | --- |
| Getting there | about 25 s | Elevator, walk, lightning, the card, the odds. Plays once; continues skip it. |
| Round 1 | about 30 s | Carpshits, freed souls caught by the loom, prediction rings. Break spool 1. |
| Round 2 | about 40 s | Adds snares and gusts. Break spool 2. |
| Round 3 | about 45 s | Everything, faster. Break spool 3. "ALL SOULS ACCOUNTED FOR." Music cuts. |
| The crescendo | about 30 s | The quiet, souls come back, flood, pinch, fusion, the beam, 1%, the threads snap. Three side-view cut-ins. |

The view is the corridor, from behind him, like Floor 13, except during the three short cut-ins.

## The rules

### Getting there (frames 1 to 5)

1. **The elevator.** The doors open on the roof in a storm. Unruggabull arrives from the floor before the roof; which floor that is hasn't been decided (the spec's long ride, or a new floor after the Shredder's). No music, just rain and wind. You have control as soon as the doors are open.
2. **The walk.** The roof runs on like a hall, slower, with no enemies. Units, vents and a water tank sit beside the aisle. The red runner starts at his feet and runs into the dark ahead. At the far end, something huge is only threads going up into the clouds, with a few trapped souls glowing faintly in them. About 8 seconds of walking.
3. **Lightning.** One white frame. Then the silhouette holds for half a second: a loom the size of a building, tied into the sky, with souls hanging in its threads. Walking stops here.
4. **It wakes.** The eye opens and rides to the middle of its rail; orange light falls down the roof. A card names it like the Shredder's: "P(LOOM)" / "RUGCO'S AI. IT HAS RUN THE NUMBERS." From here on, the eye follows him.
5. **The odds.** p(Loom) speaks in its orange readout: "HELLO, UNRUGGABULL." / "I HAVE MODELED THIS MEETING." / "PROBABILITY OF YOUR SURVIVAL: 1%." Its odds bar fills up to 99%. He has no line; he raises the blaster. Then the FIGHT pop, the music starts, and control returns.

### The fight (frames 6 to 11)

- **Health is three spools, not the odds.** Three spools of thread sit on the loom's top beam. They are its health, shown as three spool pips under its odds bar. Each round breaks one.
- **The odds never move during the rounds.** The bar sits at 99%. When a spool breaks, the bar flashes and p(Loom) says "NO CHANGE." That's the joke, and the tell; the beam is the only thing that moves the odds.
- **The opening.** After a volley, the eye stalls on its rail, white-hot, for about 2 seconds. Blaster hits on the eye then damage the current round's spool. Enough hits snap it, threads whip loose and that spool's warp hangs slack. That ends the round. Elsewhere, hits on the eye do nothing ("RECALCULATING." now and then).
- **Freed souls go to the loom.** Shooting carpshits frees souls as usual, and the counter still counts them. But each soul then floats up the roof into the loom ("CAUGHT"), where it hangs in the warp. The warp fills up and glows brighter over the rounds. Those are the souls that come back in the crescendo.
- **Round 1, the weave.** Carpshits come off the cloth and fly down the runner. There are prediction rings: the eye puts three dotted rings on the roof, each labelled with a percentage (like 71/21/8, adding to 100). Orbs land on the likely ring first. Standing in the unlikely ring is usually safe. Sometimes it isn't, and then "VARIANCE."
- **Round 2: snares and gusts.**
  - Snares: the eye fires a thread down the roof. If it hooks him, it reels him toward the loom. A slash cuts it ("CUT"), and the eye flinches for a second ("RECALCULATING."). Reeled all the way in, he loses a heart and is thrown back.
  - Gusts: the rain leans a beat before each gust, then wind pushes him across the roof. The parapet stops him, so nothing falls off, but it pins him there for the next volley.
- **Round 3, everything.** Carpshits, rings and snares together, faster. When the last spool snaps, the loom sags, the eye drifts back to the middle, and it says "ALL SOULS ACCOUNTED FOR." The music cuts out on the last word.
- **Hearts and continues.** Five hearts as on Floor 13. A continue skips the lead-in and starts the round he died in, with full hearts. Broken spools stay broken, and the souls caught so far stay caught.

### The crescendo (frames 12 to 23)

This is the spec's mega stream finale (spec.md, "The roof finale"), with these changes:

1. **The quiet.** No music; rain only. He can still move. Nothing attacks. The souls in the warp pulse. About 2 seconds.
2. **Cut-in: the first soul** (side view, about 1 second). One soul works loose and arcs across to his gun.
3. **They come back.** Behind him again. Souls fly from the warp into the blaster one at a time, with bells D5, F5, A5. Every shot from here on is soul-powered: the charge bar turns gold and never runs dry. The readout stutters ("ERROR. ERR.").
4. **The flood**, then **the pinch**, as in the spec. The music comes back in, building.
5. **Cut-in: the beam** (side view, close on him). The white flash and the 0.14 s freeze land on this shot. The beam erupts from the gun and crosses the whole roof into the eye, and the loom rocks. About half a second more, then back behind him.
6. **The lines.** p(Loom): "THAT OUTCOME WAS NOT IN THE MODEL." Unruggabull, in his caption: "LET'S DISCUSS THOSE ODDS."
7. **The beam.**
   - It's as wide as he is at the gun and still thick at the eye. It lights the roof gold and bursts where it lands. It's much bigger and hits much harder than in the finale mockup.
   - While it's on the eye, the odds drain about 10% a second and the loom shakes, shedding thread.
   - He steers it with left and right.
   - A hit on him costs a heart but never breaks the beam.
8. **It runs.** The eye tears loose and races along its rail, faster as the odds fall. Off the eye, the odds creep back up. Lines: "PROBABILITY OF CAPTURE: ZERO." then, when he catches it again, "RECALCULATING."
9. **1%.** The eye is cracked all over. "UNLIKELY." A beat.
10. **Cut-in: the threads snap** (wide side view, about 1.5 seconds). Every thread whips loose, the eye goes dark, and the storm starts to break.
11. **Dawn.** Behind him. The rain stops, the clouds open on a sunrise, a major chord plays, and the souls drift up out of the wreck. He lowers the blaster; the counter keeps rolling up. Then the ending (its own storyboard, not in this plan).

**Cut-in rules.**
- They come only on beats with nothing to dodge.
- Each lasts a second or so.
- They always cut back to behind him before anything can hit him.
- Input is held during a cut-in, not dropped.
- They aren't playable views. (The earlier finale mockup's playable side, top-down and director's cut views were dropped, and that stands.)

**Losing in the crescendo** puts him back at the quiet with full hearts.

## Part A: the framework (Codex or any agent)

Goal: the whole roof playable from start to clear, using stand-in drawing built from what the game already has. Everything is tested and bot-run, so Part B is only art, sound and feel.

Read the repo's README standards and this game's README first. Code is in `site/unruggabull-ii/`. Rules that apply here:
- classic scripts, no modules
- split files near 2,000 lines
- run `python3 tools/stamp.py` after any change in `site/`
- Floor 13 must play exactly as before

1. **Floors in the core.**
   - `game.js` builds Floor 13 directly (`UnrugFloor13(core)`, line ~1280). Generalise this to a floor chosen per run, sharing the same core pieces.
   - Floor-13-only numbers in `TUNE`, the opening banner and the clear card move to the floor or become per floor.
   - Add a way to start on the roof directly, for testing and for review: a `#stage=roof` hash, next to the existing `#seed=`.
   - The title's Start still goes to Floor 13. What happens after Floor 13's clear doesn't change yet (the floors in between don't exist).
2. **`roof.js` (`UnrugRoof`).**
   - A new floor script, loaded after `floor13.js`, shaped like it: the core calls it once and gets back its hooks.
   - It owns a state machine for the parts above:
     - lead-in: `elevator`, `walk`, `flash`, `wake`, `odds`
     - `round1`, `round2`, `round3`
     - crescendo: `quiet`, `return`, `flood`, `pinch`, `fusion`, `lines`, `beam`, `run`, `one`, `snap`, `dawn`
     - `clear`
   - Each state has its own timer, entry and exit, so Part B can retime them.
   - Put all the roof's numbers in one `ROOF` table at the top: round lengths, eye stall time, hits per spool, ring odds, snare speed, gust force, drain rate, and creep-back rate.
3. **The roof as a set.**
   - The lit renderer (`render.js`) draws a hall with walls and a ceiling. Give it an open-air set: no ceiling and no wall bands, with a sky above the horizon, low parapets for walls, and a wet floor that still reflects.
   - Keep it a `set` option or a sibling of `create`, not a fork.
   - The sky can be a flat dark gradient for now. Lightning is a full-screen flash plus a raised ambient light for a few frames. Rain can be simple streaks.
   - Floor 13's look must not change: check it with the screenshot cases.
4. **p(Loom) as stand-in drawing.**
   - A big frame of rectangles at the far end: two posts, a top beam, three spools, vertical warp lines, a rail, the eye (discs; `loom()` in the storyboard's `board.js` is a starting point), and the red cloth feeding into the existing runner.
   - Trapped souls are the existing `GHOST` sprite hung in the warp.
   - Spool damage shows as cracks, and a snap as missing warp. The eye's stall state is white.
   - Keep the drawing in its own functions (`drawLoom`, `drawEye`, `drawSpool`, `drawWarp`) so Part B can replace them one by one.
5. **The HUD.**
   - The odds bar: label `P(LOOM)`, a red fill, the percentage, and a flash when it's hot.
   - Three spool pips under it.
   - The souls counter as on Floor 13.
   - The charge bar's gold state in the crescendo.
   - p(Loom)'s orange readout, top centre, typing out with `Snd.say` like other talkers (its voice is undecided; use blips for now). His caption as on Floor 13.
6. **The mechanics, all of them, as written above:**
   - souls caught by the loom
   - prediction rings with percentages and orbs
   - the eye's stall and spool damage
   - snares (hook, reel, cut with the katana, the heart cost)
   - gusts with the rain's lean as the tell
   - the quiet; souls returning to the gun with the existing `play('bell', n)`
   - the flood and pinch: port the logic from the Mega Stream Lab/Finale mockups' Pinch if you can read them; otherwise, simple bending streams
   - the beam: a thick polygon from the muzzle to wherever he aims; damage while it overlaps the eye
   - the eye running along its rail
   - odds drain and creep-back
   - the snap and dawn
   - continues (the round he died in; the quiet in the crescendo)
7. **Cut-ins as a hook only.**
   - A `cutIn(name, seconds)` that freezes the fight's timers, holds input, and calls a `drawCut(name)` for the stand-in: a black screen with the cut's name in the font.
   - Wire up the three: `soul`, `beam`, `snap`.
   - Part B draws them.
8. **Sound hooks.**
   - Call `Snd.music(...)` and `Snd.play(...)` at every beat, with names that don't exist yet where needed (`roof`, `roofHeavy`, `storm`, `thunder`, `snare`, `gust`, `beam`, `snap`, `chord`). `audio.js` should ignore unknown names quietly.
   - Part B makes the sounds.
9. **Tests.**
   - Add cases to `tests/unruggabull-ii/` through the existing bridge:
     - the lead-in reaches the fight, and a continue skips it
     - a spool breaks only during the stall; the odds stay at 99 through the rounds
     - freed souls in the rounds end up caught
     - a snare is cut by a slash; a gust stops at the parapet
     - the quiet leads to the beam
     - a hit doesn't break the beam
     - the odds drain on the eye and creep back off it
     - the clear
     - a continue in round 2 starts round 2
   - Floor 13's existing 22 cases must still pass.
10. **Bots.**
    - Teach the bot the roof: hit the stalled eye, stand in low-odds rings, slash snares, keep the beam on the eye.
    - Add roof stages to the report (the lead-in, rounds 1 to 3, the crescendo, cleared) and roof causes (`orb`, `snare`, `carp`).
    - A `--stage roof` (or the hash) so the bots can run the roof on its own.
    - Report casual, decent and expert clear rates over 100 seeds.
    - `--verify` must show drawing never changes a run.
11. **Docs.**
    - README.md: the roof's rules and its code entry points.
    - spec.md: the roof finale updated to this plan, and the open questions it answers removed.
    - history.md: a line on why.
    - One pull request.

**Part A is done when:**
- `#stage=roof` plays from the elevator to dawn, with stand-in art.
- Every state above is reachable.
- The tests pass, Floor 13's included.
- The bots clear it at sensible rates.
- Floor 13 looks and plays the same: run its bots before and after, and compare run for run, ignoring `elapsed`.

## Part B: the polish (in Claude)

Done afterward, from the storyboard and the art tools (`tools/unruggabull-ii/bull.py`, `sprites.py`):

- **p(Loom)'s art.** The loom at full size in the lit look: iron posts with rivets, spools with wound thread, the warp, the cloth with gold stripes, the eye in its shuttle, cracks and the white-hot stall. Also its dark and silhouette states for the lead-in.
- **The roof set.** The storm sky and clouds, the city far below, the units, vents and water tank, puddles on the wet roof, rain, the lightning, and dawn.
- **The side cut-ins.** Him in profile (`VIEWS.side` and the blaster), the loom in profile, and the beam erupting.
- **The beam's look.** Its glow and impact, the gold light on the roof, and torn thread.
- **Sound.** Rain and wind, thunder, the p(Loom) music and its heavy version, the beam's roar, the snap, the major chord, p(Loom)'s voice.
- **Feel and timing.** Shake, freezes and pacing, tuned on a phone. Bot tuning for difficulty.

## Still open

- Which floor comes right before the roof, and so where the elevator comes from.
- p(Loom)'s voice (see spec.md, Sound).
- The ending after dawn (the core escaping into the Sky Wrecker): its own storyboard.
