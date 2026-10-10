# Unruggabull II: Salvation for the Unrugged

An 8-bit sequel to [Unruggabull: RugCo Alley](https://unruggabull.ar.io), built here as a phone-first game drawn and synthesized in code. Unruggabull climbs RugCo Tower to stop p(Loom), an AI on the roof that catches the souls of everything he ever unrugged and weaves them back into carpshits.

Status: Floor 13 is built as the first playable slice, at `site/unruggabull-ii/`, on Side B as a noindexed demo. The rest of the climb follows in later stages. Once a stage ships, [README.md](README.md) and the code are the source of truth.

The original game stays in its own repo (painted art, ES modules, desktop). Its `level-2` branch is the start of a later helicopter release, not part of this game.

## Story and tone

Absurd lore told with a straight face. The opening crawl, narrated in blips:

1. When we last saw our hero, he had just unrugged the Rugfather behind a garage door that took thirteen seconds to open.
2. But the Rugfather was only middle management.
3. Every carpshit our hero unrugged left a soul behind: the Unrugged. Small, fringed and very polite, they drifted up toward the roof of RugCo Tower and did not come back down.
4. Something up there has been catching them and weaving them back into carpshits. RugCo calls it p(Loom). It puts your odds of stopping it at one percent.
5. Our hero would like to discuss those odds. He will need a sword.

No crypto jargon (no HODL, diamond hands, liquidity or airdrops). "Unrugged" and rug pulls stay as the brand.

## The climb

About eleven minutes for a full run. Two engines carry the whole game: the **corridor** (into the screen, seen from behind the bull) and the **arena** (one side-view screen).

| Floor | Name | Ends with | Engine |
| --- | --- | --- | --- |
| R | The roof | Final boss: p(Loom) | Corridor |
| ↑ | The long ride, floors 78 to 98 | Cable snaps, the metal kicks in | Arena |
| 77 | The Boardroom | Set piece: the endless table | Corridor |
| ↑ | Elevator | Supply drop from the operator | Arena |
| 42 | Human Rugsources | Set piece: the projector, lights out | Corridor |
| ↑ | Elevator | Supply drop from the operator | Arena |
| 13 | Accounting | Mid-boss: the Shredder | Corridor |
| G | Back Alley | Cold open: the katana arrives, the Welcome Mat | Arena |

Two bosses only: the Shredder and p(Loom). The other floors end on a set piece.

**Score** is the Unrugged counter from the first game, now counting souls freed. Every carpshit destroyed releases a little ghost rug with a halo.

## Controls

Six inputs, the same on every floor, laid out like an old game pad:

- **Move** left and right, **jump** and **crouch** on a thumb stick that floats where the thumb lands: slide to move, flick up to jump, hold down to crouch. Keys: A/D or the arrows, W, Up or Space, S or Down.
- **Crouch** (on the ground): half height, so things at head height pass over, but no moving or shooting. On a pulling runner it grips the rug and slows the drag.
- **Shoot** (hold to keep firing). Keys: Shift or ', or J or Z. The blaster runs on charges like the first game's: 20, one back every half second.
- **Slash** (Enter, or K or X). Slash does whatever is in front of you: cuts a carpshit in two, knocks a projectile back where it came from (a **deflect**), or, standing on a moving runner, **cuts the rug** to break free. Paper can't be shot, only slashed back or dodged.

M toggles sound, F full screen, P or Escape pause.

## Floor 13: Accounting (this stage)

A corridor floor of about two minutes, then the Shredder.

- **The story.** The first Start tells the opening crawl over the tower title screen, skippable.
- **The goal.** "Free 90 souls to wake the Shredder", with a meter at the top.
- **The office**, in three beats with events between them, each announced by a sign hanging from the ceiling:
  - **Accounts Payable**: cubicle walls with green monitors. Temps (carpshits in ties) pop up behind them and throw paper wads, which can be dodged or deflected. Flying carpshits come down the hall from the back. File boxes sit on the floor to jump or step around.
  - **AUDIT!**: a deflect round. The temps all stand and lob paperwork; each one knocked back counts double.
  - **All Staff**: carpshits come down the hall in formations (a V, a line with a gap at head height to duck, a snake).
  - **Lights out**: only monitors, eyes and paper show, and blaster bolts light up the hall as they fly. Formations and single carpshits keep coming out of the dark, and every soul freed in it counts double.
  - Wiping out a whole formation pays a bonus soul for each carpshit in it.
  - **Copy Room**: temps behind copiers, and the runner starts pulling. It ends at the goal.
  - Rows that span the aisle (office chairs from All Staff on, a paper jam's sheet) give jumping a job, after the first section.
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
- **Clear.** The final hit runs in slow motion before the Shredder blows. "FLOOR 13 CLEAR", the souls float up, Unruggabull throws the horns up, and a card shows souls freed, time, deflects, best streak, smashes and best. The elevator to floor 42 is the next stage.
- **Dying.** Five hearts. At zero in the hall: "RUGGED. CONTINUE?" restarts the floor. Beaten by the Shredder, Continue picks up at the fight with full hearts. (Lives across a full run are still open; see below.)

## Look

8-bit on purpose: a 240 × 135 canvas scaled up with hard pixel edges, one shared 16-colour palette, sprites as text grids in code. The one cheat is the corridor zoom, smoother than an NES could manage. The page follows the studio standards: full screen, portrait, landscape and desktop, no double-tap zoom.

## Sound

`audio.js` with the usual small API (`init`, `play`, `muted`, plus `music(name)` and `say(text)` for blip talk).

- **Music:** a pattern sequencer on NES-style channels (two pulses, triangle, noise drums). The title theme adds VRC6-style extra channels (two more pulses and a saw), as the Japanese Castlevania III did. Floor 13 changes tune by section: "RugCo Tower", "Alley Redux", a lights-out heartbeat, the Tower tune up a key for the copy room, and a heavier version for the Shredder.
- **Blip talk:** everyone except Unruggabull and p(Loom) talks in blips while their line types out.
- **Unruggabull's voice:** Jonnie's recordings, crushed to 8-bit, shipped as small data in the code rather than audio files. Until lines are recorded, he talks in blips too: about fifteen short lines in bubbles over his head (`LINES` in `game.js`), which double as the recording script.
- **p(Loom)'s voice** (roof stage): the only synth voice. SAM was used for the storyboard but has no license, so the options are a small formant synth of our own, pre-rendered SAM shipped as crushed audio, or sam-js as is. Decide when the roof is built.

## The mega stream

Inspired by Raiden, where stacked weapon power-ups fuse into one huge beam. Here it happens **once**, as the climax on the roof against p(Loom): the souls you freed all game come back to you, the blaster's streams build up one by one in silence, then fuse into one beam, and that beam is how you beat p(Loom). It's the shining star of the game. Before the roof the player gets close but it never fuses, so they feel something building without knowing what it is. There's no stream meter or level display before the roof, and it isn't how the blaster works the rest of the time.

| Where | What the player sees |
| --- | --- |
| Floor 13, the Shredder (built) | A hint: a few souls come back, two or three streams for a few seconds. No fusion, no explanation. |
| The middle floor (42 or 77, not chosen yet) | A near miss: four or five streams, they start to bend in, then it falls apart. |
| The roof, p(Loom) | The reveal: the full sequence below, then the rest of the fight with the beam. |

Two playable mockups hold the sprites, beam drawing, pinch and sounds in plain code to port: the [Mega Stream Lab](https://claude.ai/artifact/AAjXJuSUmn1cJB4ttbPnDS) (the stream levels and the fusion, with three snap styles; the pick is **Pinch**) and the [Mega Stream Finale](https://claude.ai/artifact/MqfeHREtfJp24VcdGqACx4) (the roof against p(Loom); its **Behind** view is the approved one, and the side, top-down and director's cut views were dropped).

### The hint on Floor 13 (built)

The first time the blaster comes back in the Shredder's phase 3, a handful of souls fly into it instead of into the counter, and for about four seconds it fires two or three streams. Then it quietly goes back to normal.

- Nothing announces it: no banner, no pickup text, and no live-region line beyond "Blaster back."
- It mustn't look like Spread Shot, which already fires three ways: the souls visibly fly into the gun, the streams are the souls' colours (pale white with the halo's gold), and each stream comes in with a single soft bell note.
- The streams stay parallel or fan slightly. They never bend together; bending in is saved for later.
- The gameplay effect is small: the extra streams do normal damage and cost no extra charges.
- Done when a first-time player notices something odd and good happened, and can't say what.

### The near miss on the middle floor (build with that floor)

Once the middle floor is chosen: at its set piece the souls come back further than on Floor 13. Four or five streams, and they start to bend in toward each other, then it falls apart just short (the streams scatter, a sour note, back to normal). Same rules as the hint: no explanation.

### The roof finale (build with the roof)

The corridor, from behind him, as on Floor 13. Timings are from the finale mockup and are starting points.

1. **The fight.** p(Loom)'s health bar is its odds, at 99%. The normal blaster barely moves the number (each hit on its eye takes off a fraction of a percent, and it drifts back up). Souls freed here get caught and woven into the loom, where you can see them trapped. Lines: "Probability of your survival: 1%", "Recalculating", "All souls accounted for."
2. **The quiet.** The music cuts out completely. Carpshits on screen dissolve back into the loom. Just the rain, the storm and his blaster.
3. **The souls come back.** One soul breaks out of the loom and floats to his gun, and it fires a second stream with a single bell note (D5). A "!" pops over his head. Then a third (F5), then a fourth (A5), about 1.5 seconds apart (mockup: 1.8, 3.3 and 4.5 seconds in).
4. **The flood.** About a second later every trapped soul pours out at once into the gun, with a rising run of notes. Five streams.
5. **The pinch.** The streams bend in and merge over about half a second, firing faster as they squeeze.
6. **The fusion.** A white flash, a short freeze (about 0.14 seconds), screen shake, and one beam down the corridor into the loom. The beam roars (a low saw and squares through a wobbling filter, plus hiss), and a heavier, faster version of the p(Loom) music slams in. p(Loom): "That outcome was not in the model."
7. **The fight with the beam.** The beam melts carpshits in its lane, bends behind him as he moves, and drains the odds while it's on the eye (mockup: 10% a second, so about 10 seconds of good aim). The eye moves side to side, so the player has to track it. Lines as the odds fall: "Probability of capture: zero", then "Recalculating. Recalculating."
8. **The end.** At 1%: "Unlikely." The threads snap, every trapped soul drifts up into the night, and a major chord rings out. Then the story continues as planned: the core escapes into the Sky Wrecker.

No charges while the beam is on. Done when the quiet is really quiet, each returning stream lands on its own note, and the fusion is the loudest, brightest moment in the game.

Not part of the mega stream: the real p(Loom) music and its heavy version (the mockup's tracks are placeholders, and the music has to rival the first game's), and drag-to-move with auto-fire, which the finale mockup uses and is a separate controls decision.

## Later stages

1. Floor G cold open and the elevator arena (operator, supply drops: Spread Shot, Bull Run, Spare Vest).
2. Floor 42, Human Rugsources: lights out, the projector, policy walls, trust falls. Teaches deflect properly.
3. Floor 77, the Boardroom: the endless table run, the vote, "Motion to adjourn".
4. The long ride and the roof: Horns Up, p(Loom)'s odds bar, predicted hits, thread cutting, the mega stream finale (above), the escape at 1%. The middle floor (42 or 77) brings the mega stream's near miss.
5. Title flow, crawl, run scoring and the leaderboard ([00: Leaderboards](../../guides/00-leaderboards.md)).

## Open questions

- Lives across a full run: restart at the floor you died on, and how many lives?
- The leaderboard metric: souls freed, floors, or time.
- The Unruggabull recording script (15 to 20 lines). A first draft is in the game as `LINES`; it needs Jonnie's approval before recording.
- p(Loom)'s voice (see Sound). Does it start breaking down as its odds fall?
- The mega stream on the roof: can a hit break the beam back into streams, or is it pure payoff? (In the mockup a hit doesn't break it.)
- What Unruggabull says as the streams fuse (a line for the recording script).
- Which floor is in the middle, 42 or 77, and so where the near miss happens.
