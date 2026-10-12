# Unruggabull II: Salvation for the Unrugged

A sequel to [Unruggabull: RugCo Alley](https://unruggabull.ar.io), built here as a phone-first game drawn and synthesized in code. Unruggabull climbs RugCo Tower to stop p(Loom), an AI on the roof that catches the souls of everything he ever unrugged and weaves them back into carpshits.

Status: the 13th Floor, a 13→R elevator arena and the roof framework are built as a connected run at `site/unruggabull-ii/`, unlisted and noindexed. The plain ride, Floor 48 and ending follow later; the long ride is the current elevator framework. Once a stage ships, [README.md](README.md) and the code are the source of truth.

The original game stays in its own repo (painted art, ES modules, desktop). Its `level-2` branch is the start of a later helicopter release, not part of this game.

## Story and tone

Absurd lore told with a straight face. The opening crawl, narrated in blips:

1. When we last saw our hero, he had just unrugged the Rugfather behind a garage door that took thirteen seconds to open.
2. But the Rugfather was only middle management.
3. Every carpshit our hero unrugged left a soul behind: the Unrugged. Small, fringed and very polite, they drifted up toward the roof of RugCo Tower and did not come back down.
4. Something up there has been catching them and weaving them back into carpshits. RugCo calls it p(Loom). It puts your odds of stopping it at one percent.
5. Our hero would like to discuss those odds. First stop: the 13th Floor. He will need a sword.

No crypto jargon (no HODL, diamond hands, liquidity or airdrops). "Unrugged" and rug pulls stay as the brand.

## The climb

About eleven minutes for a full run. Two engines carry the whole game: the **corridor** (into the screen, seen from behind the bull) and the **arena** (one side-view screen).

| Floor | Name | Ends with | Engine |
| --- | --- | --- | --- |
| 13 | the 13th Floor: Accounting | Mid-boss: the Shredder | Corridor |
| ↑ | Plain ride (planned) | Operator, “Floor?”, Please Hold, supply crate, open doors; no fight | Arena set, no combat |
| 48 | Floor 48 (contents TBD) | TBD | TBD |
| ↑ | The long ride (framework built) | Cable snaps near the top; Horns Up turns heavy; supply crate | Arena |
| R | The roof | Final boss: p(Loom) | Corridor |

The decided climb is **13th Floor → plain ride → Floor 48 → long ride → roof**. Floor 48 and the plain ride are not stages yet, so the playable build temporarily takes the long ride straight from the 13th Floor and counts 13→R. Its start floor and destination are ride data; later the long ride starts at 48. Combat is switchable per ride (`ELEVATOR.fight` / per-run `fight`); the no-fight configuration is tested with the operator, muzak, crate and handoff but is not registered as another stage. [elevator-plan.md](elevator-plan.md) records current behavior and the art/music seams.

Two bosses only: the Shredder and p(Loom). The other floors end on a set piece.

**Score** is the Unrugged counter from the first game, now counting souls freed. Every carpshit destroyed releases a little ghost rug with a halo.

## Controls

Six inputs, the same on every floor, laid out like an old game pad:

- **Move** left and right, **jump** and **crouch** on a thumb stick that floats where the thumb lands: slide to move, flick up to jump, hold down to crouch. Keys: A/D or the arrows, W, Up or Space, S, C or Down.
- **Crouch** (on the ground): half height, so things at head height pass over, but no moving or shooting. On a pulling runner it grips the rug and slows the drag.
- **Shoot** (hold to keep firing). Keys: Shift or ', or J or Z. The blaster runs on charges like the first game's: 20, one back every half second.
- **Slash** (Enter, or K or X). Slash does whatever is in front of you: cuts a carpshit in two, knocks a projectile back where it came from (a **deflect**), or, standing on a moving runner, **cuts the rug** to break free. Paper can't be shot, only slashed back or dodged.

A carried supply uses E or a tap on its icon beside the hearts. The Spare Vest is automatic. M toggles sound, F full screen, P or Escape pause.

## the 13th Floor: Accounting (this stage)

A corridor floor of about two minutes, then the Shredder.

- **The story.** The first Start tells the opening crawl over the tower title screen, skippable.
- **The goal.** "Free 90 souls to wake the Shredder", with a meter at the top.
- **The office**, in three beats with events between them, each announced by a sign hanging from the ceiling:
  - **Accounts Payable**: cubicle walls with green monitors. Temps (carpshits in ties) pop up behind them and throw paper wads, which can be dodged or deflected. Flying carpshits come down the hall from the back. File boxes sit on the floor to jump or step around.
  - **Moving day**: a short course that introduces jumping and ducking: a couple of rows of chairs to jump and a couple of planks across stepladders to duck, down the middle of the hall, the first of each marked. Souls trapped in bubbles between the pieces, in different lanes, keep you moving side to side. (It replaced box walls to zig-zag round or blast through, which didn't read, and before that an audit deflect round.)
  - **All Staff**: carpshits come down the hall in formations (a V, a line with a gap at head height to duck, a snake).
  - **Lights out**: only monitors, eyes and paper show, and blaster bolts light up the hall as they fly. Formations and single carpshits keep coming out of the dark, and every soul freed in it counts double. Shoot a glowing light switch and the lights flash on, freezing them.
  - Wiping out a whole formation pays a bonus soul for each carpshit in it.
  - **Copy Room**: temps behind copiers, and the runner starts pulling. It ends at the goal.
  - Rows that span the aisle (office chairs from All Staff on, a paper jam's sheet) give jumping a job, after the first section.
  - Carpshits at work line the walls, the office's own: typing (some in an accountant's green visor), on calls, asleep at their desks, gossiping at the water cooler, copying themselves in the copy room, a manager pacing in an office set into the wall. They never fight back, and a shot frees the soul inside (p(Loom) wove them from souls), double in the dark.
  - Pickups float at jump height, lit by a beam from the ceiling: coffee (a heart back) and the Spread Shot. A streak of 10 kills drops a Spread Shot.
  - Each beat and event drops its own sign from the ceiling and has its own music, with stings for the events. No banners across the hall during play.
  - Paper blows down the corridor the whole time.
- **The runner.** A red runner rug runs down the middle of the hall. From the copy room on, it turns into a conveyor belt now and then, dragging you toward the end of the hall. Step off it, slash while standing on it to cut the rug and stop it, or crouch to grip it and slow the drag. The first pull shows a prompt.
- **The Shredder.** Once the goal is reached in the copy room, the far wall wakes up: a filing-cabinet shredder with red eyes and teeth, fed by the runner. An old-school card names it while its health bar fills.
  - In every phase the runner pulls on a steady beat, and cutting the rug jams it: blaster shots do triple damage while it's jammed. Ride the rug in close before cutting and the jam lasts longer, and paper knocked back from close hits harder.
  - From phase 2, some pulls spray staples down both sides of the hall, so you choose: ride the rug toward the mouth, or jump staples at the side.
  - Its mouth glows red just before every attack.
  - In every phase it throws a flight of paper airplanes across the hall at head height: duck, or slash them back.
  - Phase 1: it spits wads of shredded paper (deflect them into its mouth for heavy damage) and quick volleys of smaller scraps to knock back tap-tap-tap.
  - Phase 2: staple fans you have to dodge or deflect, paper jam sheets across the floor to jump, and longer pulls.
  - Phase 2 starts the rallies: it serves a white-hot bundle and bats your deflects back, quicker each time, until it misses for a smash.
  - Phase 3 (the volley match) opens with the lights out ("power saving mode") and a power surge you can't dodge, which knocks the blaster up the rug. Win a rally and the rug rolls back with it; a rolling rug pins you at the back of the hall. It also rewinds the rug while spitting at you, and sends staple carpets to jump and volleys.
  - **The souls' hint** (the first glimpse of the mega stream, below): the first time the blaster comes back in phase 3, a few souls leave the counter and fly into it, and for a few seconds it fires two, then three streams. Then it quietly goes back to normal. Nothing explains it.
  - Every deflect gives the blaster a few charges back, so deflecting keeps you shooting.
  - If the runner drags you all the way in, you lose two hearts and get spat back out.
- **Clear.** The final hit runs in slow motion before the Shredder blows. "THE 13TH FLOOR CLEAR", the souls float up, Unruggabull throws the horns up, and a card shows souls freed, time, deflects, best streak, smashes and best. “Take the elevator” continues this run through the ride to the roof; Play again stays. The long ride currently skips the planned plain ride and Floor 48.
- **Dying.** Five hearts. At zero in the hall: "RUGGED. CONTINUE?" restarts the floor. Beaten by the Shredder, Continue picks up at the fight with full hearts. (Lives across a full run are still open; see below.)

## Elevator and drops (built framework)

A side-view car interior, no scrolling: back-wall doors, counting floor indicator, central hatch and an unhittable operator by the button panel. He asks “Floor?” in blips. Existing carpshits drop in small warm-up groups: flyers swoop and throw paper during descent; crawlers land/scuttle. Shooting and slashing free their souls; slashing also returns paper. Same hearts, charges, crouch and jump controls.

**The long ride:** a 30-second climb, with the cable snap at 80% (currently floor 81 on the temporary 13→R route). The snap cuts the muzak, jolts the car and flickers its lights for a short beat, then jumps into the heavy part of **Horns Up**. It is one track: its intro is Please Hold's tune, looping until the game's snap cue selects the heavy section. The heavy section does not begin on a timer in the track. After the snap he says “Here I come, p(Loom).” in his caption, in blips until recorded. Waves then arrive faster and grow toward the top. At the destination the remaining wave releases its souls, a ding hard-cuts music, the doors open and a crate slides out, grabbable immediately. The roof's lead-in picks up with doors already open; direct roof testing retains its original door-opening sequence.

**The plain ride (configuration only):** no spawns, throws, snap or heavy music. Operator, “Floor?”, Please Hold, a supply crate, open doors and the handoff. It will be a stage before Floor 48 once that floor exists.

Carry one drop; activate by E or tapping the icon. Spread Shot is held until used, then three ways for ten seconds. Bull Run charges for five seconds, invulnerable and destroying contact threats: down the corridor lane, across the arena toward his facing (turning at walls), or under normal player movement on the roof, where it only clears carps, snares and orbs. It does nothing to p(Loom). Spare Vest automatically gets him back up at the fallen position with full hearts once. Used supplies stay consumed on continues. The operator chooses a Vest at two hearts or fewer; otherwise Spread Shot/Bull Run alternate, starting with Spread. A Vest leaves the alternation in place. A new crate replaces an existing held drop. Choice and input are provisional review items, not additional enemies or dialogue.

A continue in the ride restarts its clock/waves with full hearts and its entry souls/seed stream. `#stage=elevator` starts the 13→R ride with no held drop. Stand-in shapes and existing sprites use the shared renderer's lit/glow and palette/dither finish; no new pixel art or final composition is included.

## Look

Lit pixel art at 480 × 270, scaled up with hard pixel edges. The hall is worked out pixel by pixel in light: ceiling panels with light hanging under them, a polished floor that reflects them, dust in the air, the far hall fading into the dark, and a 64-colour palette with dithering over it all. Everything in the hall takes the light where it stands, things that glow (bolts, pickups, paper in flight, monitors, eyes) keep their own, and every blaster shot is a moving light down the hall. Lights out is real darkness, and a light switch turns the panels back on. Sprites are text grids in code, being redrawn at the new size by Claude: Unruggabull (done: drawn at the picture's full size, about 70 px tall with the horns), the carpshits and temps (done: bold, flat and bright, so they read against the hall), the carpshits at work, paper, pickups, souls and the HUD's hearts (all done, in the same style); the blaster on the floor (the bull's own, at full size); and the title (the same scene, redrawn at full size, with a proper logo); still to come: the muzzle flash. Until each is redrawn, today's sprite is drawn at twice its size and lit. Drawn at a steady 30 frames a second, so it holds on phones. The page follows the studio standards: full screen, portrait, landscape and desktop, no double-tap zoom.

Each section of the hall has its own set and colours: Accounts Payable's cubicles and screens, moving day's cartons and wrapped furniture, All Staff's chairs, banners and streamers, lights out's dark office with EXIT signs and emergency lamps, the copy room's machines. RugCo's rugs hang on the walls throughout (no lettering). The Shredder is a steel shredding machine built across the end of the copy room, drawn at full size and lit by its own eyes and mouth.

## Sound

`audio.js` with the usual small API (`init`, `play`, `muted`, plus `music(name)` and `say(text)` for blip talk).

- **Music:** a pattern sequencer on NES-style channels (two pulses, triangle, noise drums). The title theme adds VRC6-style extra channels (two more pulses and a saw), as the Japanese Castlevania III did. The 13th Floor changes tune by section: "RugCo Tower", "Alley Redux", a lights-out heartbeat, the Tower tune up a key for the copy room, and a heavier version for the Shredder.
- **Blip talk:** everyone except Unruggabull and p(Loom) talks in blips while their line types out.
- **Unruggabull's voice:** Jonnie's recordings, crushed to 8-bit, shipped as small data in the code rather than audio files. Until lines are recorded, he talks in blips too: about fifteen short lines in bubbles over his head (`LINES` in `game.js`), which double as the recording script.
- **p(Loom)'s voice** (roof stage): the only synth voice. SAM was used for the storyboard but has no license, so the options are a small formant synth of our own, pre-rendered SAM shipped as crushed audio, or sam-js as is. Decide in roof Part B; Part A uses existing blips.

## The mega stream

Inspired by Raiden, where stacked weapon power-ups fuse into one huge beam. Here it happens **once**, as the climax on the roof against p(Loom): the souls you freed all game come back to you, the blaster's streams build up one by one in silence, then fuse into one beam, and that beam is how you beat p(Loom). It's the shining star of the game. Before the roof the player gets close but it never fuses, so they feel something building without knowing what it is. There's no stream meter or level display before the roof, and it isn't how the blaster works the rest of the time.

| Where | What the player sees |
| --- | --- |
| the 13th Floor, the Shredder (built) | A hint: a few souls come back, two or three streams for a few seconds. No fusion, no explanation. |
| Floor 48 (contents TBD; near miss not decided) | Planned possible near miss: four or five streams, they start to bend in, then it falls apart. |
| The roof, p(Loom) | The reveal: the full sequence below, then the rest of the fight with the beam. |

Two playable mockups hold the sprites, beam drawing, pinch and sounds in plain code to port: the [Mega Stream Lab](https://claude.ai/artifact/AAjXJuSUmn1cJB4ttbPnDS) (the stream levels and the fusion, with three snap styles; the pick is **Pinch**) and the [Mega Stream Finale](https://claude.ai/artifact/MqfeHREtfJp24VcdGqACx4) (the roof against p(Loom); its **Behind** view is the approved one, and the side, top-down and director's cut views were dropped).

### The hint on the 13th Floor (built)

The first time the blaster comes back in the Shredder's phase 3, a handful of souls fly into it instead of into the counter, and for about four seconds it fires two or three streams. Then it quietly goes back to normal.

- Nothing announces it: no banner, no pickup text, and no live-region line beyond "Blaster back."
- It mustn't look like Spread Shot, which already fires three ways: the souls visibly fly into the gun, the streams are the souls' colours (pale white with the halo's gold), and each stream comes in with a single soft bell note.
- The streams stay parallel or fan slightly. They never bend together; bending in is saved for later.
- The gameplay effect is small: the extra streams do normal damage and cost no extra charges.
- Done when a first-time player notices something odd and good happened, and can't say what.

### The near miss on the middle floor (build with that floor)

If the near miss belongs on Floor 48 (contents still TBD): at its set piece the souls come back further than on the 13th Floor. Four or five streams, and they start to bend in toward each other, then it falls apart just short (the streams scatter, a sour note, back to normal). Same rules as the hint: no explanation.

### The roof finale (Part A and motion/light/sound built)

The whole roof framework is playable with stand-in shapes from elevator to dawn. [roof-plan.md](roof-plan.md) and its 23-frame storyboard define the beats; the implemented rules and entry points are in [README.md](README.md). Motion, light, synthesized sound and placeholder music are built. Part B still supplies loom/set art, beam styling, cut-in pictures and phone tuning. The inaccessible finale artifacts are not implementation dependencies: bending streams implement the Pinch in plain code.

The corridor view stays behind him. The open-air set shares the 13th Floor's lit renderer, without its ceiling or wall bands; a sky gradient, low parapets, rain streaks and reflected glows establish the wet roof.

1. **Getting there.** Elevator, an eight-second walk, a lightning frame and silhouette, the waking eye and card, then the three modeled-survival lines and odds filling to 99%. This plays once; continues skip it.
2. **Three rounds.** Health is three spools; normal hits never move the odds. Carpshits, labeled probability rings and orbs form round 1. Volleys arrive every six seconds; once a paced opening is due, a completed volley stalls the eye white-hot for 2.3 seconds, exposing the current spool to ten blaster hits. Earlier volleys keep it closed. Small groups of 2/3/4 carpshits keep their spacing, arriving more frequently each round. Rings and their labels sit at depth 0.28; he walks forward/back through a lower 0–0.36 band with up/down on the stick or W/S and arrow keys (Space remains jump). A spool's snap leaves missing warp and “NO CHANGE.” at 99%. Round 2 adds slashable snares and rain-telegraphed gusts; round 3 is faster. Freed souls count, then hang caught in the warp. “ALL SOULS ACCOUNTED FOR.” ends the rounds and cuts music on its last word.
3. **Quiet and return.** Two seconds with movement and no threats, then the first-soul cut. Three souls reach the blaster with bells D5, F5 and A5, about 1.5 seconds apart. The charge bar turns gold and cannot run dry from this return onward. “ERROR. ERR.” stutters in the readout.
4. **Flood and pinch.** Every remaining captive has an individual scheduled flight back to the gun; simultaneous sprites may be capped without changing the count. The music stays silent through the return and flood; five simple bending streams squeeze into one, then the heavier track slams in at fusion. The fusion flashes and freezes for 0.14 seconds before the beam cut (0.65 seconds). This view is a nonplayable hook, drawn as a black screen and its name until Part B.
5. **The lines.** p(Loom): “THAT OUTCOME WAS NOT IN THE MODEL.” His caption: “LET'S DISCUSS THOSE ODDS.”
6. **The beam.** A thick continuous polygon from the muzzle, steered left/right. On the eye it drains ten percentage points a second; off it the odds creep back at three points a second. It melts carpshits in its lane, and damage to him never interrupts it. The eye runs along its rail faster as odds fall: “PROBABILITY OF CAPTURE: ZERO.”, then “RECALCULATING.” when caught again.
7. **Dawn.** At 1%, “UNLIKELY.” and a beat, then the snap cut (1.5 seconds). Threads loosen, the eye goes dark, rain stops, sunrise opens and the chord hook rings. The souls drift up and the counter keeps rolling before clear. The core's escape into the Sky Wrecker needs its own ending storyboard.

All three cuts freeze fight timers and hold input. Five hearts; a continue preserves broken spools and caught souls and resumes the round lost, or the quiet for a crescendo death. Nominal 30/40/45-second round lengths space two openings per round; missed openings extend the fight without increasing health. The direct roof entry seeds 100 earlier-floor captives from one `ROOF.initialCaught` number, already in the score. Every captive is drawn across six rows of ten thread gaps, with slightly offset overlapping layers so roughly 60 silhouettes remain readable when the counter reaches the 200s. The flood and dawn use the full captured count, with no double scoring. Roof charges refill every 0.35 seconds to support the larger groups, while the 13th Floor remains at 0.5 seconds. Bot clear-time medians are now about 3¼ minutes rather than 2¼; the PR records timings per round and skill. The 13th Floor's clear now connects through the temporary 13→R long ride; the plain ride and Floor 48 remain later work.

Sound hooks now synthesize storm rain/wind, delayed thunder, snare whip/cut, gust, spool crack/twang, beam roar, final snap and a dawn major chord. The sequencer supplies three D-minor candidate directions with matching heavy versions (160/180, 126/142 and 140/158 BPM), plain pattern/order data and bar-queued layers. The final accounted word cuts music without a tail. Quiet/return have only storm ambience and the three D-minor bells; 1% drops to held D5, and a D-major chord crosses snap into dawn. A lower machine pulse voice preserves the previous 38 ms letter cadence. Its final voice is still open. Souls have cosmetic jitter, independent bob/sway, row depth and arrival/quiet pulses. They curve into reserved warp slots, shake loose for the three bells, and depart their actual slots over one second during the flood; arrivals retain their original three-second timing. At most 96 flying souls and three faint trail stamps each are drawn per frame, with eight distributed warm lights. Dawn uses the full count with staggered rises, side-to-side drift and fade; the displayed counter adds released captives to the pre-dawn total and preserves that total on the clear card; seeded run score stays unchanged. The eye supplies orange/red/white light, two distant flashes precede the reveal, the beam supplies six gold lights, and dawn warms in two seconds. Shake uses one decaying function, halved under reduced motion. Spool snaps hold the picture for three frames during their existing intermission, preserving outcomes and input.

Playable side/top-down views and drag-to-move with auto-fire stay dropped.

## Later stages

1. The plain ride as its own stage and Floor 48 (contents TBD).
2. The long ride's finished art, Horns Up composition and feel; its framework now runs from 13 until Floor 48 exists.
3. Roof Part B (art, final music/voice and feel) and the ending after dawn (the core escaping into the Sky Wrecker).
4. Floor G cold open/back alley using the arena; its place in the decided climb is not part of this change.
5. Title flow, crawl, run scoring and the leaderboard ([00: Leaderboards](../../guides/00-leaderboards.md)).

## Open questions

- Lives across a full run: restart at the floor you died on, and how many lives?
- The leaderboard metric: souls freed, floors, or time.
- The Unruggabull recording script (15 to 20 lines). A first draft is in the game as `LINES`; it needs Jonnie's approval before recording.
- p(Loom)'s voice (see Sound). Does it start breaking down as its odds fall?
- Floor 48 contents, including whether the mega stream near miss belongs there.

Roof fixes: the dawn display and clear card never reset the counter; the full lightning state draws the whole loom and captives as dark silhouettes with a thin rim. Dawn counting uses each soul's actual starting position. Snap/fusion shake decay pauses inside named cut-ins so the impulse is still visible when play returns.

The music system and unlinked phone music lab are ready for composition. Pattern/order, envelopes, vibrato, arpeggios, slides, echoes, stems, beat/bar switches, hard cuts, downbeat slams and stingers are implemented. The six original tracks for the 13th Floor render byte-identically. The three current directions are placeholders; final tracks, art and phone playtesting remain.
