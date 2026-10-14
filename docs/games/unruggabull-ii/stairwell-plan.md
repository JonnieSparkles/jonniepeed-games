# The stairwell, the prologue

Status: designed with Jonnie on two playable design pages, 13 October 2026, and **in the game** (`stairs.js`; the rules are in [README.md](README.md#the-stairwell-rules)). The pages are in `tools/unruggabull-ii/stairwell/`:

- `python3 tools/unruggabull-ii/stairwell/build.py --page climb climb.html` builds **the playable climb**: the whole prologue, played on a phone (stick and buttons) or with keys, with "Start from" buttons for each section. This is the reference for the port.
- `python3 tools/unruggabull-ii/stairwell/build.py stairwell.html` builds **the moments page**: the Rugmergency and the door as moving mockups with a scrubber, the music takes and the fanfares, and the door options that were tried.

Both use the game's own `bull.js`, `sprites.js`, `art.js`, `render.js`, `sets13.js`, `audio.js` and `music-floor.js`, so the bull, the carpshits, the 13th Floor and the sound are the game's. `mock.js` holds the shared art and sounds (`window.StairArt`), `climb.js` the climb, `music-stairs.js` the music, `neon.js` Neon from the soundtrack page's shelf.

## Why

The climb starts with a playable side-view prologue from the garage to the 13th Floor, "a little love letter to the original": about a minute, three short sections rather than thirteen flights, with the effort spent on the katana moment and the door. The intro's last still hands off to it, and the intro's "He will need a sword." goes.

## The run, beat by beat

Every section is one screen (480×270, the rides' picture) of zigzag flights: the ground is a line of landings and slopes, and the sections alternate direction, so the climb zigzags. Floors are named on plates on the landings' walls (GROUND FLOOR, 1ST FLOOR, 6TH FLOOR, 7TH FLOOR, 12TH FLOOR); the floors between are implied by the whip.

| Section | Floors | Way | What happens |
| --- | --- | --- | --- |
| 1 | Ground to 1st | left to right | Blaster only. Eight carpshits in five waves up two flights: singles, a high one (JUMP), paper throwers, one from behind. Clear them and the 48th Floor's orange chevron (pulsing) shows at the edge he's heading for, at chest height above the landing (no words). |
| Whip | 1 to 6 | | The camera whips up: the section drops away, the next comes down from above, FLOOR and a big number rolling 1 to 6 in the middle. About 0.85 s. Hearts carry over; the katana refills them. |
| 2 | 6th to 7th | right to left | Still blaster only: three carpshits on the way up to the cabinet. Then the cabinet wakes (below) and SHOOT THE GLASS; shooting it plays **the Rugmergency**. With the katana: a diver (SLASH), a paper thrower (SLASH IT BACK), a pair, then two that hang back by the tape throwing paper every 1.5 to 2.2 s (deflect or dodge; nothing forces it). Then **caution tape** criss-crossed over the top of the stairs: he can't pass until he slashes it (SLASH THE TAPE); it parts and hangs. |
| Whip | 7 to 12 | | As above. |
| 3 | 12th to 13th | left to right | Carpshits tumble down the stairs at him (jump them, cut them, or shoot them, crouched or standing) with flyers mixed in. Then **the door** (below), with the same chevron, pointing down, over it. |

A person takes about 70 to 75 seconds. The scripted bot on the page is a rough check that it plays through, not a tuning signal.

### The Rugmergency

- **The cabinet** is dark until it's ready: its glass dim and its sign, BREAK GLASS IN CASE OF RUGMERGENCY, unpowered. Once the carpshits on the way up are dealt with, the sign lights from inside like an exit sign and the frame pulses red, lighting the wall. The section's lamp hangs over the lower stairs, so the cabinet sits in shadow until then. The glass can't break before it's ready.
- **The glass:** a bolt through it shatters it (white flash, shards to the floor, a tinkle and pings) and the music stops dead. He steps up, grabs the katana (a shing), turns to face us and holds it up (the new `RAISED` pose; a little hop), the stairwell darkens around him and a gold light picks him out, gold rays turn behind him, a glint runs up the blade, and RUGMERGENCY KATANA. If he's missing hearts they circle him in the gold light, then each flies up into the HUD and fills one (a ping each; none if he's full). The fanfare plays; on its last beat the cue slams back in a layer up, SLASH, and the first carpshit comes.
- **Before the katana** he carries none: the side poses without it on his back (`SIDES_BARE`).

### The door

- At the top landing: the end wall turns toward us, a steel door in it (a lit wire-glass window, a 13 plate, a push bar) in a pale frame, the 13 / ACCOUNTING sign on the back wall beside it, a caged lamp over it, a mat in front of it. The rails end in posts at the top of each flight.
- He walks up, the music stops dead (a low fluorescent hum), and **he catches his breath**: facing the camera, bent over with his hands on his hips, heaving, with sweat flying (`FRONTS.huff0`/`huff1`, about 1.35 s). He stands back up (`FRONTS.rise`, then the front view standing) and only then, turning to the door, "OK... HERE WE GO." in his caption. Then he braces (`MOVES.brace`, a creak) and kicks (`MOVES.kick`): the door bursts, **the band (`floorHall`) slams in on the kick**, the door flies at the camera, and it cuts on the impact (a white flash) to the 13th Floor from behind, with a shake. He raises the blaster; THE 13TH FLOOR, then FREE 90 SOULS; play.
- Timings from the walk up: kick at 2.5 s, impact 2.83 s, the hall 2.91 s, the banner 3.07 s.

## Music

- **The climb: Flight Risk** (new; `stairFlight` in `music-stairs.js`). Chip rock at 162 in E minor, the 13th Floor's key: a pedal-note riff that runs up and down off E, a bass walking up a step a bar (E, F#, G, A, C, D, B), a big tune on top. It grows by stems: section 1 plays drums, bass and lead; section 2 adds the twin lead and an arpeggio (from the Rugmergency on); section 3 adds driven power chords, double kicks and a `build` stem (sixteenth hats, a busier kick and a low saw doubling the bass) for the last flights.
- **Not faster to the door.** The 13th Floor's band runs at 150; a climb that sped up past it would make the kick land on something slower. The kick into the band is the peak.
- **The fanfare: "Over the Top, up the stairs"** (`FANFARES[3]`): power-chord hits climbing Flight Risk's own steps (G, A, C, D) to a big E major chord, at 162 so the cue comes back on the beat, with a snare roll into the cue's downbeat. About 4.4 s.
- **The kick:** `floorHall` with the hall's stems, slammed on the kick. Since #95 the 13th Floor itself opens on the band (no muzak cold open), so coming through the door the floor's own `musicDrop` must not restart it.
- **New sounds** (synthesized, `FX` in `mock.js`): the glass, the katana's shing, the hum, the brace's creak, the kick, the whoosh and the door's impact.

## The look

- The rides' picture and scale: 480×270, the sprites one pixel to a pixel.
- **Through the renderer in its flat mode, as the rides are:** the stairwell, him and the carpshits in the lit layer; bulbs, bolts, paper, souls, the slash, the open door, the lit sign and the rays in the glow layer. Lights: each section's lamp (a warm pool), the door's lamp, the open door's spill, bolts, paper, the muzzle, freed souls, the cabinet's red pulse when ready, the glass's flash as it breaks, and the gold light on him for the item get, while the ambient fill drops from 0.62 to 0.2. Then bloom, tone, vignette, dither and the palette. Words and the HUD crisp on top.
- **The stairwell:** painted block walls, a red dado with a gold stripe, the floor's number stencilled big, caged lamps, concrete landings with yellow nosings, steps every 16 px with nosings, steel rails up the flights.

## Controls

The game's, side on: move, jump, crouch, shoot (charges, five a second), slash (from the Rugmergency on, with deflects). **Crouched he shoots too**, from lower down, as on the rides since #97. On the phone the floating stick crouches only on a deliberate push straight down (a thumb drifting down while sliding was crouching him, which looked like the controls freezing), and lost touches let go of everything.

## New poses (in `bull.js`, made by `bull.py`)

- `SIDES_BARE`: every side pose with no katana on his back, in the `SIDES` box.
- `FRONTS`: `huff0`/`huff1` (from the front, hands on his hips, knees out, bent over toward us: the upright front pose with the upper body squashed and the head dropped on the finished grid by `fbend()`) and `rise` (the half-risen frame), in their own box with his feet at `FRONT_FEET`.
- `MOVES`: `brace` (weight back, the near knee chambered) and `kick` (the boot sole-first), in their own box with his feet at `MOVES_FEET`.
- `RAISED`: from the front, the katana held straight up in his right hand, his left fist pumped, the blaster in his belt, feet at `RAISED_FEET`. One hand, because his arms don't reach over his head with both.

The existing grids are unchanged (`bull.py --check` passes).

## Tried and dropped

- **Music, round 1:** Alley Climb (the first game's alley tune), Stair Runner and Thirteen Flights; none landed. Neon from the shelf stays on the moments page; Flight Risk was picked.
- **Fanfares:** Ta-ta-ta-TAAA, Cascade and the original Over the Top (its climb started in C, away from Flight Risk's key, and didn't flow). The original Over the Top was liked; its Flight Risk version was picked.
- **A frantic climb** (speeding up through the sections): it would out-run the 13th Floor's band.
- **The door:** a cube swing from side-on to behind his shoulders (worked, but the door at the camera was preferred); the door in the long wall with a camera push through it (he looked like he shrank); that door with a reverse shot of the door flying at the camera. The muzak-and-"...oh." entry with a beat of silence before the band was liked, then dropped for the slam on the kick (and #95 removed the muzak cold open anyway). All are still on the moments page.

## Moving it into the game

- A stage of its own before the 13th Floor (`#stage=stairs`), on the arena's side-view engine: the arena's floor needs to become a ground line (landings and slopes) rather than a flat floor, and the screens alternate direction. The carpshits are the arena's, with the tumblers new; the page's are simpler and are the reference for pacing, not code.
- The whip, the Rugmergency (cabinet, sign, glass, item get) and the door as the floor's own cut-ins, the way the long ride holds the camera.
- The hand-off: start `floorHall` on the kick, then start the 13th Floor without restarting the band; its banner is the floor's own.
- Start plays the stairs; the 13th Floor on its own (`#stage=floor13`, replay) starts with the katana.
- Hearts carry across the whips up and refill only when he grabs the katana; a death before the katana starts the whole stairwell over (full hearts, the souls he came in with); after the katana a continue puts him back just after the fanfare (at the cabinet, katana in hand, full hearts), whether he died on the 2nd landing or the 3rd.
- Bots for the stairs, and the usual checks: the finished stages identical, tests pass.

## In the game

- Built on the arena with a ground line (`ARENA.ground`); the carpshits are the arena's, the tumblers the stairwell's own (`e.step`, `e.draw`).
- The hand-off: the kick calls the 13th Floor's `musicDrop`, and its opening skips it when `R.fromStairs`; the door's white flash and shake carry over. The 13th Floor's meter starts at 0; the stairwell's souls are banked and added back to the run's total when he leaves it (the owner: they count toward the game, not the 13th's 90).
- "OK... HERE WE GO." is in `LINES` (`door`).

- Start always plays the intro (skippable), and the intro ends at the foot of the stairs (the owner, Oct 13).

- Section 1 opens on the garage door he came through in the intro's last still, open on the cool garage, then swinging shut (the owner: "yes to that door idea").

## Open

- Tuning on the phone.
