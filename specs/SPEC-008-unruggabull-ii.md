# SPEC-008: Unruggabull II: Salvation for the Unrugged

An 8-bit sequel to [Unruggabull: RugCo Alley](https://unruggabull.ar.io), built here as a phone-first game drawn and synthesized in code. Unruggabull climbs RugCo Tower to stop p(Loom), an AI on the roof that catches the souls of everything he ever unrugged and weaves them back into carpshits.

Status: Floor 13 is built as the first playable slice, at `site/unruggabull-ii/`, on Side B as a noindexed demo. The rest of the climb follows in later stages. Once a stage ships, `docs/games/unruggabull-ii.md` and the code are the source of truth.

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

Five inputs, the same on every floor, laid out like an old game pad:

- **Move** left and right and **jump** on a D-pad (the up arrow jumps). Keys: A/D or the arrows, W, Up or Space.
- **Shoot** (hold to keep firing). Keys: J or Z. The blaster runs on charges like the first game's: 20, one back every half second.
- **Slash** (K, X or Enter). Slash does whatever is in front of you: cuts a carpshit in two, knocks a projectile back where it came from (a **deflect**), or, standing on a moving runner, **cuts the rug** to break free. Paper can't be shot, only slashed back or dodged.

M toggles sound, F full screen, P or Escape pause.

## Floor 13: Accounting (this stage)

A corridor floor of about two minutes, then the Shredder.

- **The story.** The first Start tells the opening crawl over the tower title screen, skippable.
- **The goal.** "Free 60 souls to wake the Shredder", with a meter at the top.
- **The office**, in three beats with events between them, each announced by a sign hanging from the ceiling:
  - **Accounts Payable**: cubicle walls with green monitors. Temps (carpshits in ties) pop up behind them and throw paper wads, which can be dodged or deflected. Flying carpshits come down the hall from the back. File boxes sit on the floor to jump or step around.
  - **AUDIT!**: every temp in view stands up at once.
  - **All Staff**: carpshits come down the hall in formations (a V, a line with a gap, a snake).
  - **Lights out**: only monitors, eyes and blaster bolts show.
  - **Copy Room**: temps behind copiers, and the runner starts pulling. It ends at the goal.
  - Rows that span the aisle (office chairs, a paper jam's sheet) give jumping a job.
  - Pickups float at jump height: coffee (a heart back) and the Spread Shot.
  - Each beat has its own music, with stings for the events.
  - Paper blows down the corridor the whole time.
- **The runner.** A red runner rug runs down the middle of the hall. From the copy room on, it turns into a conveyor belt now and then, dragging you toward the end of the hall. Step off it, or slash while standing on it to cut the rug and stop it. The first pull shows a prompt.
- **The Shredder.** Once the goal is reached in the copy room, the far wall wakes up: a filing-cabinet shredder with red eyes and teeth, fed by the runner.
  - Phase 1: it spits bundles of shredded paper (deflect them into its mouth for heavy damage) and pulls the runner.
  - Phase 2: staple fans you have to dodge or deflect, and longer pulls.
  - Phase 3 (jammed): every cut of the rug jams it for a moment, and blaster shots do triple damage while it's jammed.
  - If the runner drags you all the way in, you lose two hearts and get spat back out.
- **Clear.** "FLOOR 13 CLEAR", the souls float up, and a card shows souls freed, time and best. The elevator to floor 42 is the next stage.
- **Dying.** Five hearts. At zero: "RUGGED. CONTINUE?" restarts the floor. (Lives across a full run are still open; see below.)

## Look

8-bit on purpose: a 240 × 135 canvas scaled up with hard pixel edges, one shared 16-colour palette, sprites as text grids in code. The one cheat is the corridor zoom, smoother than an NES could manage. The page follows the studio standards: full screen, portrait, landscape and desktop, no double-tap zoom.

## Sound

`audio.js` with the usual small API (`init`, `play`, `muted`, plus `music(name)` and `say(text)` for blip talk).

- **Music:** a pattern sequencer on NES-style channels (two pulses, triangle, noise drums). The title theme adds VRC6-style extra channels (two more pulses and a saw), as the Japanese Castlevania III did. Floor 13 changes tune by section: "RugCo Tower", "Alley Redux", a lights-out heartbeat, the Tower tune up a key for the copy room, and a heavier version for the Shredder.
- **Blip talk:** everyone except Unruggabull and p(Loom) talks in blips while their line types out.
- **Unruggabull's voice:** Jonnie's recordings, crushed to 8-bit, shipped as small data in the code rather than audio files. Until lines are recorded, he talks in blips too.
- **p(Loom)'s voice** (roof stage): the only synth voice. SAM was used for the storyboard but has no license, so the options are a small formant synth of our own, pre-rendered SAM shipped as crushed audio, or sam-js as is. Decide when the roof is built.

## Later stages

1. Floor G cold open and the elevator arena (operator, supply drops: Spread Shot, Bull Run, Spare Vest).
2. Floor 42, Human Rugsources: lights out, the projector, policy walls, trust falls. Teaches deflect properly.
3. Floor 77, the Boardroom: the endless table run, the vote, "Motion to adjourn".
4. The long ride and the roof: Horns Up, p(Loom)'s odds bar, predicted hits, thread cutting, the escape at 1%.
5. Title flow, crawl, run scoring and the leaderboard ([00: Leaderboards](../docs/guides/00-leaderboards.md)).

## Open questions

- Lives across a full run: restart at the floor you died on, and how many lives?
- The leaderboard metric: souls freed, floors, or time.
- The Unruggabull recording script (15 to 20 lines).
- p(Loom)'s voice (see Sound).
