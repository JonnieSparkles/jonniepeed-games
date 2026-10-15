# Unruggabull II: the roof fight, reworked

Status: agreed with the owner on his phone, Oct 14 2026, on the design page (https://claude.ai/artifact/Q94NdrRqkYi1fEBVXFd7Ve, version 7). This plan replaces the three rounds in [roof-plan.md](roof-plan.md); the lead-in's elevator, lightning, card and odds, and the whole crescendo from the quiet to dawn, stay as built. The rules as built go in [README.md](README.md); why, in [history.md](history.md).

The owner, Oct 13: "roof battle sucks aside from the payoff, so that needs a strong loving touch." What sucked: waiting for openings, the probability rings not reading, the 99% that never moved, and hitting the eye feeling flat. He asked for something "epic and thematic", combining an AI trope with carpets, with lasers from the eye.

## The idea: MAXIMIZE CARPETS

p(Loom) is a paperclip maximizer for carpet. The roof in front of Unruggabull is a grid of tiles, **5 across and 3 deep**, so it reads on a phone. The eye's lasers weave like a loom: **warp** (columns) and **weft** (rows). Real lasers stitch carpet where they pass; carpet is its ground. One battle that deteriorates: p(Loom) starts precise, hallucinates as it takes damage, and ends frantic.

## The loop: dodge, punish, reclaim

- **Dodge.** Every attack is telegraphed on the tiles it will hit, then fires. Real targets darken the tile and scroll hazard stripes, with an edge that flashes on the beat; they read on bare roof and on carpet alike. (The high weft, a bar at chest height to duck, was cut after his second play: see below.)
- **Punish.** After every attack with a real laser, the eye overheats white-hot with a countdown ring ("OPEN") for 2.2 seconds. Shots home in on it; each hit sparks, kicks the eye, cracks the spool and takes the odds down. Shots at the closed eye just clang off its armour (no bounce back: the owner found it annoying).
- **Reclaim.** Carpet under him flickers white and its tassels stand up for a second, then the rug is pulled (a heart). A slash reclaims his tile and the tiles either side, with a chime that climbs per tile and a hit-stop. A slash on bare roof with nothing to cut whiffs and roots him for half a second, so spamming Slash doesn't pay.
- Carpshits hatch out of carpet tiles (the tile heaves, then the carpshit peels up and takes the carpet) in a fixed number per phase; souls from them are caught in the warp as before. Stalling earns nothing.

## The phases

Each spool is a phase. At 45% of a spool left, p(Loom) panics: the eye slams shut ("NOT YET.") and it runs that phase's **set piece**, then gives the longest opening of the phase ("OVERHEATED!").

| Phase | Its line | Attacks | Set piece |
| --- | --- | --- | --- |
| 1, WARP | "MAXIMIZE CARPETS." | A column through him; from the third attack, warp and weft crossing on his tile (step diagonally). | **FIRST PASS**: every column fires left to right except a gold SAFE gap, then back right to left with another gap. |
| 2, HALLUCINATING | "I AM CONFIDENT. I AM CONFIDENT." | Rows and high wefts; crosses with one fake arm; fakes where he'd dodge to. | **TWILL**: needles stitch two of every three diagonals; the safe diagonal steps over each wave, six waves, fakes from the third. |
| 3, MAXIMUM | "MAXIMUM. MAXIMUM. MAXIMUM." | A twin shuttle fires the weft while the eye fires the warp; sometimes two warps; fakes. | **FULL WEAVE**: every tile but a gold gap that moves a tile per wave, eight waves; the last lays carpet everywhere else. |

**Hallucinations** are always dotted, hollow and shaking, with no light on the floor; their carpshits have six legs and scanlines. The challenge is reading them, never guessing.

**Spool snaps are moments.** Hit-stop, the loom lurches, lightning, then the loose thread whips across the roof and cuts away every carpet tile and carpshit ("CUT LOOSE"): a free reclaim. Then the next phase's name and line.

## The odds and the reset

Every hit takes the odds down, and the damage stays on the bar as a torn stretch: 99 to 55 over the three spools. "NO CHANGE." at every snap while the bar visibly sinks.

After the last spool: "ALL SOULS ACCOUNTED FOR." The roof goes wall to wall carpet, the music cuts on the last word as before, and the bar is **stitched over** back to 99 in red thread: not healed, the tear still shows. "REPLACEMENT SPOOLS ORDERED.": the caught souls stream out of the warp and wind three new, pale spools. Its health is literally them. "PROBABILITY OF YOUR SURVIVAL: 1%." Then the quiet as built, while one soul on the middle spool strains; it tears loose for the first-soul beat, and the return, flood, pinch, fusion and beam follow as built, with the souls flying from the spools instead of the warp. The beam then takes 99 to 1 in about ten seconds: the contrast with the slog is the point.

## The walk teaches

The lead-in's walk becomes the tutorial: the loom is dark, and the runner unrolls toward him a row at a time; prompts teach moving, slashing the carpet and shooting one carpshit. Nothing can hurt him. When the roof is clear (or after 24 seconds), the lightning, the card and the odds play as built.

## Controls

- **Thumb stick** for the walk and the phases: one tile per step, repeating while held (up and down move between rows). Keys: arrows or WASD.
- ~~**Duck**: a Duck pad on the roof only, or C.~~ Cut after his second play: the roof uses the same pads as everywhere.
- **The beam**: it fires on its own; drag on the picture to steer it (the stick and keys still work).
- First-time prompts, once a run: STEP OFF THE RED, IT'S WHITE: SHOOT IT!, CARPET UNDER YOU: SLASH IT OR STEP OFF, and so on.

## Rules kept from the rest of the game

- Every hit goes through `hurtBull(ROOF.hitCost, cause)`; causes are `laser`, `stitch`, `pull` and `carp`.
- Continues keep broken spools and caught souls; a phase restarts with its spool whole and its set piece to come.
- Bull Run: no damage for five seconds, kills carpshits it touches, does nothing to p(Loom) or its odds.
- Outcomes come from the seeded stream; drawing never changes a run. Attacks land on Saga II's beat from the fight's own clock (152 BPM), so a seed still replays exactly.

## Numbers to start from

Opening 2.2 s (set pieces 1.8x, the last 2x); warning 1.2 s (phase 3 0.92x); laser 0.55 s; stitch 0.28 s; 40 hits a spool, set piece at 45%; carpet pulls after 1 s; spread every 5.2/4.0/3.0 s up to 6/8/10 tiles; 4/6/8 carpshits a phase. Bots and his phone decide the rest.

## After his first play of the port (Oct 14, PR #111)

- The roof: no runner down the middle, a lit roof, solid tiles (pale slabs or carpet), nothing see-through on the floor.
- Carpshits come out of the red tiles, with a visible hatch; none without carpet.
- The beam fight follows the [finale mockup](https://claude.ai/artifact/MqfeHREtfJp24VcdGqACx4)'s behind view: he walks, the beam trails him in a curve and leans to the eye (veers off if he's too far), and 40 carpshits, a quarter of them heavy, pour in for it to melt.

## After his second play (Oct 14, PR #111)

- No Duck on the roof: the same pads as everywhere, every attack dodged by stepping. The high weft is gone. (A shuttle and a gapped beater took its place for one play and went again on Oct 15: "they look weird and you can't really do anything with them.")
- The reset is playable (slash the carpet back while it's re-woven); no cut-in cards; real streams from the first returned soul; he walks freely from then to the end.
- The loom no wider than the roof, its spools below the HUD; dim trapped souls; the open eye yellow with a white core; shapes drawn at half a pixel.

## After his third play (Oct 15)

- No shuttle or beater: lasers, needles and carpshits.
- Carpshits hatch only from carpet further up the roof than him.
- The moment before the crescendo sells "I can't do anything here": shots clang "NO CHANGE.", then the blaster is dead (a click and smoke) until the first soul is back.
- With the stream he walks up and down the roof too.

## After his fourth play (Oct 15)

- An arrival: he steps out onto a dark roof as the floodlights clunk on row by row; no loom until the walk ends, when p(Loom) rises from behind the far edge and its eye flickers open.
- The carpet grabs him before it pulls; tile edges under him.
- The beam fight runs through the heavy track's solo (1% on a bar line, about 24 s), with no aim assist and a gliding eye, as on the mockup.

## Left for later

- Roof art Part B (p(Loom), the set, the beam, the cut-ins), now drawn for this fight.
- p(Loom)'s voice; the line "YOU UNRUGGED MY FATHER. THANK YOU." waits for the ending (does p(Loom) escape, or a sequel hook).
