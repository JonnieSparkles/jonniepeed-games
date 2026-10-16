# Unruggabull II: Salvation for the Unrugged

A sequel to [Unruggabull: RugCo Alley](https://unruggabull.ar.io), built here as a phone-first game drawn and synthesized in code. Unruggabull climbs RugCo Tower to stop p(Loom), an AI on the roof that catches the souls of everything he ever unrugged and weaves them back into carpshits.

Status: the whole climb is built as a connected run at `site/unruggabull-ii/`, unlisted and noindexed: the 13th Floor, the quiet ride, the 48th Floor and its lobby ([floor48-plan.md](floor48-plan.md)), the long ride from 48, the roof framework and a first pass of the ending after dawn ([ending-plan.md](ending-plan.md)). Once a stage ships, [README.md](README.md) and the code are the source of truth.

The original game stays in its own repo (painted art, ES modules, desktop). Its `level-2` branch is the start of a later helicopter release, not part of this game.

## Story and tone

Absurd lore told with a straight face. The Rugfather founded RugCo and built p(Loom) to maximize carpets, raising it like a son; it took the order a little too literally, outgrew him and named itself. It draws in the souls of everything Unruggabull ever freed and weaves them back into carpets, and RugCo still lists every one as company property, so he starts with Accounting.

The opening is six illustrated stills ([intro-plan.md](intro-plan.md)), a line each narrated in blips:

1. When we last saw our hero, he had just unrugged the Rugfather.
2. But the Rugfather had a son.
3. He taught it everything he knew. It was a short lesson.
4. It took his order a little too literally. It grew up so fast.
5. Business was booming. Floor-to-floor carpet was everywhere. Profits were through the roof.
6. Every soul Unruggabull freed was still on RugCo's books. So Unruggabull had some questions for Accounting. Sharp ones.

No crypto jargon (no HODL, diamond hands, liquidity or airdrops). "Unrugged" and rug pulls stay as the brand.

## The climb

About thirteen minutes for a full run. Three engines carry the game: the **corridor** (into the screen, seen from behind the bull), the **arena** (one side-view screen) and the **top-down** twin-stick room (the 48th Floor's factory, added at the owner's brief: Smash TV meets Factorio).

| Floor | Name | Ends with | Engine |
| --- | --- | --- | --- |
| 13 | the 13th Floor: Accounting | Mid-boss: SHRED-O | Corridor |
| ↑ | Quiet ride (built) | From the 13th Floor's elevator lobby (DING, the doors, he boards), 13→48: “Floor?” answered, quiet banter, 100 BPM Please Hold (two phrases); factory doors, arrival exchange before exit; no fight | Arena set, no combat |
| 48 | the 48th Floor: Reclamation (built) | Set piece: Production Panic, the factory's collapse and the near miss; then the lobby, side on | Top-down, then arena |
| ↑ | The long ride (built) | p(Loom) takes the cable, drops the car and reels it up; 30 seconds of Horns Up; the operator's crate per difficulty, and a hat for a clean climb | Arena |
| R | The roof | Final boss: p(Loom) | Corridor |

The climb is **13th Floor → quiet ride → 48th Floor → lobby → long ride → roof**, all built. Each ride's start floor, destination and whether it fights are ride data (`ELEVATOR.fight` / per-run `fight`, `from`, `destination`): the quiet ride runs 13→48 without a fight, the long ride 48→R with one. [long-ride-plan.md](long-ride-plan.md) is the long ride's design; [elevator-plan.md](elevator-plan.md) records the supply drops and the quiet ride's built status; [floor48-plan.md](floor48-plan.md) is the 48th Floor's.

Two bosses only: SHRED-O and p(Loom). The other floors end on a set piece.

**Score** is the Unrugged counter from the first game, now counting souls freed. Every carpshit destroyed releases a little ghost rug with a halo.

## Controls

Six inputs, the same on every floor, laid out like an old game pad:

- **Move** left and right, **jump** and **crouch** on a thumb stick that floats where the thumb lands: slide to move, flick up to jump, hold down to crouch. Keys: A/D or the arrows, W, Up or Space, S, C or Down.
- **Crouch** (on the ground): half height, so things at head height pass over, but no moving. He can shoot from it, for two charges a shot, so ducking is never a dead stop. On a pulling runner it grips the rug and slows the drag.
- **Shoot** (hold to keep firing). Keys: Shift or ', or J or Z. The blaster runs on charges like the first game's: 20, one back every half second.
- **Slash** (Enter, or K or X). Slash does whatever is in front of you: cuts a carpshit in two, knocks a projectile back where it came from (a **deflect**), or, standing on a moving runner, **cuts the rug** to break free. Paper can't be shot, only slashed back or dodged.

M toggles sound, F full screen, P or Escape pause.

## the 13th Floor: Accounting (this stage)

A corridor floor of about two minutes, then SHRED-O.

- **The story.** Every Start plays the intro, six illustrated stills ([intro-plan.md](intro-plan.md)), skippable.
- **The goal.** "Free 90 souls to wake SHRED-O", with a meter at the top.
- **The office**, in three beats with events between them, each announced by a sign hanging from the ceiling:
  - **Accounts Payable**: cubicle walls with green monitors. Temps (carpshits in ties) pop up behind them and throw paper wads, which can be dodged or deflected. Flying carpshits come down the hall from the back. File boxes sit on the floor to jump or step around.
  - **Moving day**: a short course that introduces jumping and ducking: a couple of rows of chairs to jump and a couple of planks across stepladders to duck, down the middle of the hall, the first of each marked. Souls trapped in bubbles between the pieces, in different lanes, keep you moving side to side. (It replaced box walls to zig-zag round or blast through, which didn't read, and before that an audit deflect round.)
  - **All Staff**: carpshits come down the hall in formations (a V, a line with a gap at head height to duck, a snake).
  - **Rush hour** (Oct 13): a short swarm after All Staff, before the lights go out. No temps or furniture, just carpshits pouring down the hall in waves and formations, one hit each, with a Spread Shot, faster recharge and red alarm lights; untouched pays a bonus. The floor's peak before the dark.
  - **Lights out**: only monitors, eyes and paper show, and blaster bolts light up the hall as they fly. Formations and single carpshits keep coming out of the dark, and every soul freed in it counts double. Shoot a glowing light switch and the lights flash on, freezing them.
  - Wiping out a whole formation pays a bonus soul for each carpshit in it.
  - **Copy Room**: temps behind copiers, and the runner starts pulling. It ends at the goal.
  - Rows that span the aisle (office chairs in All Staff) give jumping a job, after the first section.
  - Carpshits at work line the walls, the office's own: typing (some in an accountant's green visor), on calls, asleep at their desks, gossiping at the water cooler, copying themselves in the copy room, a manager pacing in an office set into the wall. They never fight back, and a shot frees the soul inside (p(Loom) wove them from souls), double in the dark.
  - Pickups float at jump height, lit by a beam from the ceiling: coffee (a heart back) and the Spread Shot. A streak of 10 kills drops a Spread Shot.
  - Each beat and event drops its own sign from the ceiling and grows the music, with stings for the events. No banners across the hall during play.
  - Paper blows down the corridor the whole time.
- **The runner.** A red runner rug runs down the middle of the hall. From the copy room on, it turns into a conveyor belt now and then, dragging you toward the end of the hall. Step off it, slash while standing on it to cut the rug and stop it, or crouch to grip it and slow the drag. The first pull shows a prompt.
- **SHRED-O.** Once the goal is reached in the copy room, the far wall wakes up: a filing-cabinet shredder with red eyes and teeth, fed by the runner. An old-school card names it while its health bar fills.
  - In every phase the runner pulls on a steady beat, and cutting the rug jams it: blaster shots do triple damage while it's jammed. Ride the rug in close before cutting and the jam lasts longer, and paper knocked back from close hits harder.
  - From phase 2, some pulls make the floor beside the rug live, so you choose: ride the rug toward the mouth, or jump at the side.
  - Its mouth glows red just before every attack.
  - In every phase it throws a flight of paper airplanes across the hall at head height: duck, or slash them back.
  - Phase 1: it spits wads of shredded paper (deflect them into its mouth for heavy damage) and quick volleys of smaller scraps to knock back tap-tap-tap.
  - Phase 2: staple fans you have to dodge or deflect, staple carpets across the floor to jump, and longer pulls.
  - Phase 2 starts the rallies: it serves a white-hot bundle and bats your deflects back, quicker each time, until it misses for a smash.
  - Phase 3 (the volley match) opens with the lights out ("power saving mode") and a power surge you can't dodge, which knocks the blaster up the rug. Win a rally and the blaster flies back into his hands as the rug rolls back (Oct 13; before, he had to walk onto it, and finishing the fight first skipped the souls' hint); a rolling rug pins you at the back of the hall. It also rewinds the rug while spitting at you, and sends staple carpets to jump and volleys.
  - **The souls' hint** (the first glimpse of the mega stream, below): the first time the blaster comes back in phase 3, a few souls leave the counter and fly into it, and for a few seconds it fires two, then three streams. Then it quietly goes back to normal. Nothing explains it.
  - Every deflect gives the blaster a few charges back, so deflecting keeps you shooting.
  - If the runner drags you all the way in, you lose two hearts and get spat back out.
- **Clear.** The final hit runs in slow motion before SHRED-O blows. "THE 13TH FLOOR CLEAR", the souls float up, Unruggabull throws the horns up, and a card shows souls freed, time, deflects, best streak, smashes and best. “Take the elevator” continues this run through the ride to the roof; Play again stays. The quiet ride goes 13→48; the lobby then takes the long ride to the roof.
- **Dying.** Five hearts. At zero in the hall: "RUGGED. CONTINUE?" restarts the floor, carrying the run. Beaten by SHRED-O, Continue picks up at the fight with full hearts. (Lives and continues across a run: see Difficulty and continues.)

## Elevator and drops (built)

A side-view car in its shaft, no scrolling: walnut and brass, art-deco doors with windows onto the shaft, a needle dial over them, a hatch in the ceiling, the sides open to the shaft sliding past, and the operator (one of the Unrugged, in a bellhop's cap and jacket) on his stool by the buttons. Unruggabull is drawn side on (`UnrugBull.SIDES`). Same hearts, charges, crouch and jump controls as every stage; crouch ducks the dives.

**The long ride** ([long-ride-plan.md](long-ride-plan.md)), about a minute: “Floor?”, Please Hold and a climb with small talk and no carpshits; p(Loom) takes the dial (the lights brown out, the muzak sags, its eye fills the dial: “Probability of arrival: zero percent.”); a cut-in above the car as its threads take the cable and let go; the drop in red emergency light; the brakes; the threads burst through the hatch (“Recalculating. Bring him up.”) and a second cut-in as they reel the car up; Horns Up turns heavy (“Here I come, p(Loom).”) for 30 seconds of fight; the top, a ding, the doors open on the roof, the operator's crate and “Floor?” / “Roof.”, and he walks out with his back to us. He can't act during the cut-ins.

**The fight:** every carpshit flies, sliding down the threads either side of him, in pairs and three at a time for the last floors, at most seven on screen, armored ones from about nine seconds in. They flap, bank, keep their distance from him and from each other, throw glowing paper (slash it back at them) and every few seconds rear and dive through where he's standing (duck, slash or move). Backed against a wall, he gets no shelter: the next one flies in from the open shaft behind him, and one with no room to keep its distance climbs over him to the other side. Armor: the first hit knocks a steel helmet off with a clank, the second frees the soul. At the top the threads let go and the last carpshits' souls are his.

**The crates** (item 30, decided with the owner Oct 15 and 16): hearts carry across every stage on every mode, and on Baby and Regular three heals come right before a fight: a first-aid box on the stairwell's top landing, the quiet ride's crate when he arrives hurt ("YOU'RE GOING TO NEED THIS."; arriving full, and on Raging and Impossibull, no crate and "YOU GOT THIS.") and the long ride's crate. At the top of the long ride: Baby's crate fills his hearts, or gives 20 souls when he's full; Regular's fills them, and full hearts with no continues earns the operator's bellhop cap; Raging's heart floats up and poofs into smoke, and full hearts with no continues earns the crown that was under the operator's cap; Impossibull has no crate, and a flawless climb earns the operator's halo. The hat is worn for the rest of the run and shown over the run's initials on the board. **The quiet ride** (built, 13→48, `fight: false`): short operator/Unruggabull banter over a 27-second climb and two four-bar phrases of classic 100 BPM Please Hold, then the ding, doors and the operator's last word (above). Movement stays live; the final arrival bubble must finish before he walks onto the 48th Floor (about 39 s including the clear-button entrance and exit). The clear button opens on the 13th Floor's elevator lobby first, a short playable beat like the 48th's without the portrait (about 5.5 s walking straight in); direct entry and continues start the ride closed-door. On the side-view stages that allow it (the lobbies and both rides) he can walk crouched at half speed.

No supplies are carried (owner, Oct 15): the quiet ride's Spread Shot, Bull Run and Spare Vest were dropped. The crates and the hats (above) are built.

Rugged in the long ride, Continue starts the whole ride again with full hearts and the souls he came in with; Restart floor starts the ride over. `#stage=elevator` starts the 13→R ride.

## Look

Lit pixel art at 480 × 270, scaled up with hard pixel edges. The hall is worked out pixel by pixel in light: ceiling panels with light hanging under them, a polished floor that reflects them, dust in the air, the far hall fading into the dark, and a 64-colour palette with dithering over it all. Everything in the hall takes the light where it stands, things that glow (bolts, pickups, paper in flight, monitors, eyes) keep their own, and every blaster shot is a moving light down the hall. Lights out is real darkness, and a light switch turns the panels back on. Sprites are text grids in code, being redrawn at the new size by Claude: Unruggabull (done: drawn at the picture's full size, about 70 px tall with the horns), the carpshits and temps (done: bold, flat and bright, so they read against the hall), the carpshits at work, paper, pickups, souls and the HUD's hearts (all done, in the same style); the blaster on the floor (the bull's own, at full size); and the title (the same scene, redrawn at full size, with a proper logo); still to come: the muzzle flash. Until each is redrawn, today's sprite is drawn at twice its size and lit. Drawn at a steady 30 frames a second, so it holds on phones. The page follows the studio standards: full screen, portrait, landscape and desktop, no double-tap zoom.

Each section of the hall has its own set and colours: Accounts Payable's cubicles and screens, moving day's cartons and wrapped furniture, All Staff's chairs, banners and streamers, lights out's dark office with EXIT signs and emergency lamps, the copy room's machines. RugCo's rugs hang on the walls throughout (no lettering). SHRED-O is a steel shredding machine built across the end of the copy room, drawn at full size and lit by its own eyes and mouth.

## Sound

`audio.js` with the usual small API (`init`, `play`, `muted`, plus `music(name)` and `say(text)` for blip talk).

- **Music:** a pattern sequencer on NES-style channels (two pulses, triangle, noise drums). The title theme adds VRC6-style extra channels (two more pulses and a saw), as the Japanese Castlevania III did. The 13th Floor is one track that grows rather than cutting between tunes (Oct 13): "Shuffle, cold open", the office muzak's tune as a swung boogie-rock shuffle. The floor starts hot (Oct 13): the band hits as it opens and the first carpshit arrives on that hit, however you get there (an earlier version looped the muzak until the first carpshit came into range). Moving day adds a twin lead; All Staff steps up to its own straight-rock section with a twin-guitar break on the muzak's tune; rush hour goes heavy with a siren; lights out drops to the muzak thin and slow over the PA; the copy room steps up a key on the next bar, with the same break; SHRED-O slams in a step higher and heavy, and power saving mode drops to the muzak for its 7 seconds. (It replaced five section tracks, "RugCo Tower", "Alley Redux", a lights-out heartbeat, the Tower tune up a key for the copy room and a heavier one for SHRED-O.)
- **Blip talk:** everyone talks in blips while their line types out (Unruggabull and p(Loom) until their own voices exist).
- **Unruggabull's voice:** Jonnie's recordings, crushed to 8-bit, shipped as small data in the code rather than audio files. Until lines are recorded, he talks in blips too: about fifteen short lines in bubbles over his head (`LINES` in `game.js`), which double as the recording script. The first, "LET'S GO!" (the first game's recording), is in: Chip voice, 8 kHz and 6-bit, picked on an audition page against lighter and heavier crushes and effects (Oct 14).
- **p(Loom)'s voice:** the only synth voice. SAM was used for the storyboard and the long-ride prototype but its license isn't clear, so the game doesn't ship it or load it. Until our own voice is built, p(Loom) talks in its lower machine-pulse blips on the long ride and the roof, with its captions timed as before.

## The mega stream

Inspired by Raiden, where stacked weapon power-ups fuse into one huge beam. Here it happens **once**, as the climax on the roof against p(Loom): the souls you freed all game come back to you, the blaster's streams build up one by one in silence, then fuse into one beam, and that beam is how you beat p(Loom). It's the shining star of the game. Before the roof the player gets close but it never fuses, so they feel something building without knowing what it is. There's no stream meter or level display before the roof, and it isn't how the blaster works the rest of the time.

| Where | What the player sees |
| --- | --- |
| the 13th Floor, SHRED-O (built) | A hint: a few souls come back, two or three streams for a few seconds. No fusion, no explanation. |
| Floor 48 (contents TBD; near miss not decided) | Planned possible near miss: four or five streams, they start to bend in, then it falls apart. |
| The roof, p(Loom) | The reveal: the full sequence below, then the rest of the fight with the beam. |

Two playable mockups hold the sprites, beam drawing, pinch and sounds in plain code to port: the [Mega Stream Lab](https://claude.ai/artifact/AAjXJuSUmn1cJB4ttbPnDS) (the stream levels and the fusion, with three snap styles; the pick is **Pinch**) and the [Mega Stream Finale](https://claude.ai/artifact/MqfeHREtfJp24VcdGqACx4) (the roof against p(Loom); its **Behind** view is the approved one, and the side, top-down and director's cut views were dropped).

### The hint on the 13th Floor (built)

In SHRED-O's phase 3 its surge takes the blaster up into the air above its head, and its own paper knocked back wears it down. The paper that takes it to its last stand stuns it: one soul leaves the counter, takes the blaster and brings it back to him charged, then stays in the gun, firing a stream beside the bolt: a ribbon of light from the blaster's muzzle, straight down the hall. He finishes it with the blaster while it's stunned (the owner, Oct 13: the volley stuns it, the souls bring the blaster back, the blaster finishes it). One soul here, two on the 48th Floor, three on the roof: the bells count up the climb (D; D, F; D, F, A), and the roof's three "hit" (the owner, Oct 12; more than three would be odd). With the soul in the gun, SHRED-O's surges break on them instead of knocking the blaster away.

- Nothing announces it: no banner, no pickup text, and no live-region line beyond "Blaster back."
- It mustn't look like Spread Shot, which already fires three ways: the souls visibly fly into the gun, the streams are the souls' colours (pale white with the halo's gold), and the stream comes in with a single soft bell note.
- The streams stay parallel or fan slightly. They never bend together; bending in is saved for later.
- The extra streams do normal damage and cost no extra charges. On the 13th Floor the blaster is the finisher, but only once the souls bring it back.
- Done when a first-time player notices something odd and good happened, and can't say what.
- **Goodbye** (Oct 12): when SHRED-O's beaten, the soul leaves the gun, salutes and says "GOOD LUCK.", then rises with every soul freed on the floor, before the clear. Their only line before the roof. On Floor 48 the souls could come back and leave the same way, reluctantly.

### The near miss on the middle floor (build with that floor)

If the near miss belongs on Floor 48 (contents still TBD): at its set piece the souls come back further than on the 13th Floor. Four or five streams, and they start to bend in toward each other, then it falls apart just short (the streams scatter, a sour note, back to normal). Same rules as the hint: no explanation.

### The roof finale (Part A, motion/light/sound and the fight's rework built)

The whole roof is playable with stand-in shapes from elevator to dawn. [roof-plan.md](roof-plan.md) and its 23-frame storyboard define the lead-in and crescendo; [roof-rework-plan.md](roof-rework-plan.md) (Oct 14) replaced the three rounds with MAXIMIZE CARPETS; the implemented rules and entry points are in [README.md](README.md). Motion, light, synthesized sound and placeholder music are built. Part B still supplies loom/set art, beam styling, cut-in pictures and phone tuning. The inaccessible finale artifacts are not implementation dependencies: bending streams implement the Pinch in plain code.

The corridor view stays behind him. The open-air set shares the 13th Floor's lit renderer, without its ceiling or wall bands; a sky gradient, low parapets, rain streaks and reflected glows establish the wet roof.

1. **Getting there.** Elevator, a walk that teaches (the runner unrolls toward him over a 5×3 grid of roof tiles; he slashes it back and shoots one carpshit; nothing hurts), a lightning frame and silhouette, the waking eye and card, then the three modeled-survival lines and odds filling to 99%. This plays once; continues skip it.
2. **MAXIMIZE CARPETS.** Three phases, one spool each: the eye fires warp (columns) and weft (rows) that stitch carpet, warned on the beat and dodged by stepping (the roof has no crouch or jump); after each real attack it overheats (yellow, a white core) and every hit cracks the spool and takes the odds down (99 to 55, the damage kept on the bar). Carpet under him pulls the rug after a second; a slash reclaims his row's tiles. At 45% of a spool it runs a set piece (FIRST PASS, TWILL, FULL WEAVE); from phase 2 it hallucinates (dotted, shaking fakes). A snapping spool whips the roof clean. Carpshits come in a fixed number a phase; freed souls hang caught in the warp.
2b. **The reset.** “ALL SOULS ACCOUNTED FOR.”, wall-to-wall carpet, the music cut on its last word, the bar stitched over back to 99, and three new spools wound from the caught souls (“REPLACEMENT SPOOLS ORDERED.”), then “PROBABILITY OF YOUR SURVIVAL: 1%.” Playable: a slash flips the carpet back while p(Loom) re-weaves it; shots get "NO CHANGE.", then the blaster dies (a click and smoke) until the souls come back as its ammo.
3. **Quiet and return.** Two seconds with movement and no threats while a soul on the middle spool strains, then straight on (no cut-in cards). From the first soul back he walks freely to the end, across and up the roof, and the blaster fires on its own, a stream more per soul. Three souls tear loose from the spools to the blaster with bells D5, F5 and A5, about 1.5 seconds apart. The charge bar turns gold and cannot run dry from this return onward. “ERROR. ERR.” stutters in the readout.
4. **Flood and pinch.** Every remaining captive has an individual scheduled flight back to the gun; simultaneous sprites may be capped without changing the count. The music stays silent through the return and flood: the souls' bells, then each landing soul's note climbing the scale and the pinch sweep, as the five streams of bolts squeeze into one. At fusion a boom and the souls' choir hit together, the beam roars (thunder, a wobbling hum and the choir singing inside it) and the heavier track slams in. The fusion flashes and freezes for 0.14 seconds. This view is a nonplayable hook, drawn as a black screen and its name until Part B.
5. **The lines.** p(Loom): “THAT OUTCOME WAS NOT IN THE MODEL.” His caption: “LET'S DISCUSS THOSE ODDS.”
6. **The beam.** A thick ribbon from the muzzle, firing on its own; he walks with it (left/right or dragging on the picture), its far end trailing him in a curve and leaning toward the eye. On the eye it drains ten percentage points a second; off it the odds creep back at three points a second. It melts carpshits in its lane, and damage to him never interrupts it. The eye runs along its rail faster as odds fall: “PROBABILITY OF CAPTURE: ZERO.”, then “RECALCULATING.” when caught again.
7. **Dawn.** At 1%, “UNLIKELY.” and a beat, then the threads snap. Threads loosen, the eye goes dark, rain stops, sunrise opens and the chord hook rings. The souls drift up and the counter keeps rolling before clear. The core's escape into the Sky Wrecker needs its own ending storyboard.

All three cuts freeze fight timers and hold input. Five hearts; a continue preserves broken spools (not the failed try's souls) and resumes the phase lost, or the quiet for a crescendo death. The direct roof entry seeds 100 earlier-floor captives from one `ROOF.initialCaught` number, already in the score. Every captive is drawn across six rows of ten thread gaps, with slightly offset overlapping layers so roughly 60 silhouettes remain readable when the counter reaches the 200s. The flood and dawn use the full captured count, with no double scoring. Roof charges refill every 0.35 seconds, while the 13th Floor remains at 0.5 seconds. Bot clears take about 2:40 to 2:55. The 13th Floor's clear now connects through the 13→48 quiet ride, factory and lobby, then the 48→R long ride.

Sound hooks now synthesize storm rain/wind, delayed thunder, the fight's warnings, lasers, needles, eye, carpet and katana sounds, spool crack/twang, beam roar, final snap and a dawn major chord. The fight track is Saga II (152, heavy 170 BPM, D minor): Coheed-style metal with distorted power chords, a clean echoing intro, a choppy verse and an eight-bar chorus reaching for D, F and A, with a twin guitar from round 2 and the souls' choir from round 3; its heavy version opens on the chorus and adds a tapping solo. Two earlier candidates stay for comparison (`#music=b`, `#music=c`). Spool snaps are one crashing power chord. The final accounted word cuts music without a tail. Quiet/return have only storm ambience and the three D-minor bells; 1% drops to held D5, and a D-major chord crosses snap into dawn. A lower machine pulse voice preserves the previous 38 ms letter cadence. Its final voice is still open. Souls have cosmetic jitter, independent bob/sway, row depth and arrival/quiet pulses. They curve into reserved warp slots, shake loose for the three bells, and depart their actual slots over one second during the flood; arrivals retain their original three-second timing. At most 96 flying souls and three faint trail stamps each are drawn per frame, with eight distributed warm lights. Dawn uses the full count with staggered rises, side-to-side drift and fade; the displayed counter adds released captives to the pre-dawn total and preserves that total on the clear card; seeded run score stays unchanged. The eye supplies orange/red/white light, two distant flashes precede the reveal, the beam supplies six gold lights, and dawn warms in two seconds. Shake uses one decaying function, halved under reduced motion. Spool snaps hold the picture for three frames during their existing intermission, preserving outcomes and input.

Roof fixes: the dawn display and clear card never reset the counter; the full lightning state draws the whole loom and captives as dark silhouettes with a thin rim. Dawn counting uses each soul's actual starting position. Snap/fusion shake decay pauses inside named cut-ins so the impulse is still visible when play returns.

The music system and unlinked phone music lab are ready for composition. Pattern/order, envelopes, vibrato, arpeggios, slides, echoes, stems, beat/bar switches, hard cuts, downbeat slams and stingers are implemented. The six original tracks for the 13th Floor render byte-identically. The fight track is chosen (Saga II); art and phone playtesting remain.

On the roof, playable side/top-down views stay dropped. Moving is the thumb stick on the grid; the beam fires on its own and a finger drags it (the owner, Oct 14). The 48th Floor is top down by design, with two sticks rather than drag-to-move.

## Difficulty and continues (settled Oct 14–16, built)

Four modes, picked on the title and kept for the run, each with its own board: **Baby Bull** (every hit costs half a heart), **Regular Bull** (the game as tuned), **Raging Bull** (nothing heals between stages; more to design once he's played the finished game), **Impossibull** (five hearts from the start and nothing gives one back, not even a continue, which starts the stage with the hearts he came in with; unlocked by a Raging Bull clear without a retry). Hearts carry between stages on every mode; Baby and Regular get the three heals above. Continues are unlimited; a continue loses the failed try's souls; a run that continues is off the board on every mode. Where a continue restarts: the stairwell at the garage or the katana; the 13th Floor at its door, or at SHRED-O once it's woken; the rides over; the 48th Floor whole; the roof at the phase or the quiet (his call, open). The 48th caps what it keeps making (a 60-soul quota on kills and limp rugs, two carts a visit) so stalling can't farm souls, and an arrow points at the nearest loom when he's idle. Built as the README describes, with the crates and hats (above).

## Later stages

1. The 48th Floor's phone playtest: the twin sticks (the agreed fallback is the left stick to move with Shoot and Slash buttons), its difficulty, and the Rugfather's painted portrait.
2. The long ride's phone playtest and polish (more side poses, the fight's difficulty).
3. Roof Part B (art, final music/voice and feel), and the ending's polish ([ending-plan.md](ending-plan.md): his timing, music, credits, results, skip and the art for its drawn stills).
4. Floor G cold open/back alley using the arena; its place in the decided climb is not part of this change.
5. Title flow, crawl, run scoring and the leaderboard ([00: Leaderboards](../../guides/00-leaderboards.md)).

## Open questions

- The roof's continue point (the phase or the quiet today), after his play of the finished roof.
- The leaderboard metric: souls freed, floors, or time.
- The Unruggabull recording script (15 to 20 lines). A first draft is in the game as `LINES`; it needs Jonnie's approval before recording.
- p(Loom)'s voice (see Sound). Does it start breaking down as its odds fall?
- The 48th Floor: whether it should end on a clear card or flow straight into the lobby, as now.
