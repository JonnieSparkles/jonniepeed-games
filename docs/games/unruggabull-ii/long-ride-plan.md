# The long ride, redone

Status: designed and approved as a playable prototype, 12 October 2026; **not yet in the game**. The game still plays the long ride from [elevator-plan.md](elevator-plan.md). This plan replaces that ride's story, look, music and fight. Moving it into the game is the next job.

The prototype is `tools/unruggabull-ii/long-ride/`. Build it with `python3 tools/unruggabull-ii/long-ride/build.py work/long-ride.html` and open the file: it plays the whole ride, on a phone or with keys, and a beat list jumps to any moment. It uses the game's own `bull.js`, `sprites.js` and `art.js`, so new art drawn there shows up in it.

## Why

Jonnie played the long ride from #86 on his phone: "that elevator scene is rough". It wasn't Horns Up (Codex wrote its own placeholder), the art was stand-in shapes, and the cable snap didn't explain itself. The ride was redesigned with him on the playable page over a dozen rounds: "ok this is awesome now. still needs polish and some touches but its there."

## The ride, beat by beat

About 63 seconds. The times are the prototype's.

| Time | Beat | What happens |
| ---: | --- | --- |
| 0:00 | "Floor?" | Doors close; Please Hold, the muzak, starts. |
| 0:02 | The climb | No carpshits. The muzak, the shaft sliding past, and small talk (below). |
| 0:16 | p(Loom) takes the dial | The lights brown out and the muzak sags. The floor dial turns into p(Loom)'s eye: "Probability of arrival: zero percent." |
| 0:18 | Above the car | A cut-in up the shaft: the wheel, the cable, the counterweight, and p(Loom)'s eye at the top. Its threads wind down the cable until it glows orange ("P(LOOM) TAKES THE CABLE"). The wheel spins back and the car drops out of frame ("AND LETS GO"). |
| 0:20 | The drop | Lights out, red emergency light. The dial swings back; the shaft races upward past the door windows and the open sides. |
| 0:21 | The brakes catch | Sparks off both sides, a screech, a hard stop. |
| 0:22 | Silence | Dust from the hatch. The operator, still on his stool: "…Floor?" |
| 0:24 | The threads come in | The hatch bursts; its thread comes through and hooks the car: "Recalculating. Bring him up." |
| 0:24.9 | Reeled in | A second cut-in: the wheel spinning forward, the car rising into frame, the threads running taut up to the eye ("ON THE ROOF", "AND REELS YOU IN"). |
| 0:25.8 | Horns Up | The car rockets up; Horns Up turns heavy; "Here I come, p(Loom)." The 30-second fight (below). |
| 0:55.8 | The top | The threads let go, the car slams to a stop, the lights come back. Ding. |
| 0:57.2 | The roof | The doors open on the storm and p(Loom). The operator slides the crate over ("Floor?" / "Roof."). He grabs it, turns his back to us and walks out into the roof. |

**Why the cable is taken, not cut:** a cut cable made no sense when the car keeps going. p(Loom) takes it, lets the car drop, then reels it up, because it wants his soul.

## The fight

- **Only after the snap.** The climb is a breather.
- **30 seconds of Horns Up:** pairs sliding down the threads, armored ones from about 9 s in, three at a time with more armor for the last 9 s. At most seven on screen.
- **Every carpshit flies,** at his height (about 65%) or above it (needs a jump to shoot). None crawl on the floor.
- **They're alive:** they flap (squash and stretch), bank into their movement, wobble, tumble on the way down, trail fringe, and keep their distance from each other (no stacking). Every few seconds one rears back, eyes flashing, and dives through where he stands; jump or slash it. They throw glowing paper; slashing it sends it back, blue, at whoever threw it.
- **Armor:** a riveted steel helmet; the first hit knocks it off with a clank and a white flash.
- **His blaster** is the game's: 20 shots, one back every half second, three back for each deflect; the charge bar under the hearts.
- **Five hearts,** knockback and a short invulnerability when hit. Rugged: try the fight again from the threads, or the ride from the top.
- **The crate at the top:** full hearts, or 20 bonus souls if he's already full. (Replaces the drop choice for this ride; see Open.)

## The look

- **The car in the shaft:** walnut panels and brass, a coffered ceiling, RugCo carpet, art-deco doors with windows onto the shaft, a needle floor dial over them. The side walls are cut away to show the shaft outside: brick, guide rails and each landing (sill, lamp, floor number) sliding past at the car's speed.
- **The operator:** an Unrugged soul at twice size on a brass stool by his button panel, in a red bellhop cap and jacket with gold buttons and a bow tie; he bobs when he talks.
- **Lighting:** warm sconces; brownout flicker; on the drop and the fight, a red emergency light with a pulsing beacon, kept bright enough to play in; orange threadlight; sparks on the threads while they reel.
- **The bull from the side:** new poses in `bull.js` (`SIDES`), drawn by `tools/unruggabull-ii/bull.py` from the same puppet as everything else: `aim`, `idle`, `run0`–`3`, `jump`, `crouch`, `wind`, `cut`, `hurt`, `twirl0`–`3`. Idle, he breathes (the blaster dips), twirls the blaster every few seconds, and after a while glances at us (the front view). Walking out at the top he turns his back to us (the from-behind run frames), as the roof shows him.

## Sound

- **Horns Up is the original storyboard's track** (in `synth.js`, with the storyboard's synth): muzak until the brownout, heavy from the reel, looping its riff, breakdown and solo sections for the fight. It replaces the placeholder in `site/unruggabull-ii/music-elevator.js`.
- **p(Loom) speaks with SAM** (sam-js from a CDN in the prototype; the game's own voice is still to be decided); everyone else in blips.
- Effects: the wind and slack of the cable, the fall, the brakes, the hook and reel, the slam, the ding, the doors and thunder, the swoop, the clank, empty/drained/ready for the blaster.

## Lines

Approved: "Floor?", "Here I come, p(Loom).", the operator's "Floor?" at the roof. Drafts waiting on Jonnie:

| Who | Line |
| --- | --- |
| Unruggabull | You ever get off? |
| Operator | Floor? |
| Unruggabull | …The roof. |
| Operator | Very good, sir. |
| p(Loom) | Probability of arrival: zero percent. |
| Operator | …Floor? |
| p(Loom) | Recalculating. Bring him up. |
| Unruggabull | Roof. |

Cut: "Long way up." / "Since 1987, sir." (the 1987 joke needs lore the player doesn't have).

## Moving it into the game

One pull request, by the Claude chat that built the prototype:

1. Replace the long ride's drawing seams in `elevator.js`/`arena.js` with the prototype's car, shaft, dial, doors, operator, cut-ins, threads, lighting and carpshit/bull drawing; use `UnrugBull.SIDES` for the bull.
2. Replace its state path with the beats above (no warm-up fight; banter; eye; cut-ins; drop; brakes; threads; reel; 30-second fight; top; doors; crate; walk out).
3. Move the arena's fight to the prototype's rules (flyers only, swoops, spacing, paper, armor) on the seeded stream, keeping the game's charge and hearts.
4. Horns Up from `synth.js` into `music-elevator.js` in the sequencer's format.
5. Keep the 13th Floor and the roof identical to main (bots run for run, screenshots, `--verify`), all tests passing; retune the ride's bots; update the README, spec, history and this plan's status.

## Open

- The draft lines above.
- The supply drops: the long ride now gives full hearts or bonus souls. Whether the plain ride keeps the Spread Shot / Bull Run / Spare Vest drops is open.
- Crouch has little use now that nothing crawls; keep it for ducking dives, or drop it in the arena.
- Phone playtesting of the fight's difficulty (a scripted bot cleared it losing 0–2 hearts).
