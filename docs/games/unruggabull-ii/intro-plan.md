# Unruggabull II: the intro

Status: built (Oct 13, 2026). This is the plan as it was decided with the owner; the intro as it is now is in [README.md](README.md) (`intro.js`, `intro-stills.js`), and why it is this way is in [history.md](history.md).

## What it is

Six illustrated stills, a line each narrated in the game's blips, on every Start (skippable; the owner, Oct 13: "start at the story then u skip from there like every game"). It replaces the old text crawl. Humour is in the pictures; the narration keeps a straight face. No crypto jargon. Each still waits for a tap once its line is said; a tap on a still's gag plays the gag instead of moving on; Skip or Escape ends it. About 30 seconds if you tap as soon as each arrow shows.

The pictures are the owner's, made in ChatGPT from prompts written with Claude, then shrunk to the game's picture and its 64 colours by `tools/unruggabull-ii/intro/stills.py`. The source pictures and the Rugfather's strips stay out of the repo; the generated data is the art. Everything that moves and every letter is drawn in code on top (AI pictures garble text).

## The story it tells

The Rugfather gave his son one order, MAXIMIZE CARPETS. It took the order a little too literally: it outgrew him, renamed itself p(Loom), and found that souls make carpets. RugCo kept every soul Unruggabull ever freed on its books, so he goes to Accounting. The intro shows the exchange (5 SOULS IN > 1 RUG OUT); the 48th Floor shows the factory.

## The stills

1. **The garage, now.** "When we last saw our hero, he had just unrugged the Rugfather." The first game's garage, shutter up on the wet alley and the blue RUGS neon. The Rugfather lies on the floor as a burning heap (the owner's dead strip). Embers, dust in the lamp's light, the neon buzzing.
2. **The son.** "But the Rugfather had a son." Years earlier: the Rugfather leans over a basket on the workbench, Loomy, a tiny wooden loom with one big blue eye and a LOOMY nameplate. Moths round the lamp; Loomy looks up at him, then at us. Tap Loomy: it blinks.
3. **The lesson.** "He taught it everything he knew. It was a short lesson." The Rugfather points at a chalkboard: MAXIMIZE CARPETS. Loomy watches from a school desk; as the line ends its eye flickers orange. Tap Loomy: a gold star on the board.
4. **The height chart.** "It took his order a little too literally. It grew up so fast." A height chart on a doorframe, LOOMY at knee height. The lamp throws Loomy's shadow on the wall; each new mark is where its top reaches, until it towers over the Rugfather, who leans back. Its eye lights orange, and the top mark's LOOMY is crossed out and rewritten above: P(LOOM).
5. **RugCo Tower.** "Business was booming. Floor-to-floor carpet was everywhere. Profits were through the roof." A tall picture, panned from the doors to the roof: the tower burning at its edges under a red sky, RUGCO on its sign, the 48th Floor's row of windows flickering red. Souls drift up into the orange beacon; as each goes in, the beacon flares and a carpet unrolls down a column of windows. Tap a soul: it waves.
6. **The ledger and the stairs.** "Every soul Unruggabull freed was still on RugCo's books. So he had some questions for Accounting." The garage's stairs door: Unruggabull opening it onto a lit stairwell, the open ledger in front (UNRUGGED tallies; in red ink, 5 SOULS IN > 1 RUG OUT; INQUIRIES: ACCOUNTING, FLOOR 13). Dust in the light, the lamp and its moths, the draft lifting a page; the doorway's light swells as the line ends. The last tap sends the doorway's light swelling over the picture (about 1.1 s) and the 13th Floor opens out of it, clearing in six steps over .9 s (the stairwell instead, once it's built). Skip and Escape cut straight to the floor.

## The look

- Full screen, the intro has the whole screen: the header row is gone (Skip is in the caption bar) and the picture is as big as it fits. On a phone in portrait the picture runs edge to edge with the caption under it, larger, in the room a tall phone leaves. A tap anywhere moves on, black included.

- The eye tells the turn: blue is the innocent baby; orange is what it becomes (p(Loom)'s eye on the roof is orange idle, red attacking, white-hot when hit).
- The Rugfather is the owner's strip at its own pixel size, with one treatment everywhere: breathing, his fringe stirring, his fire flickering, eyes that glow and blink, embers.
- No zoom on the stills (pixel art crawls); motion is in the overlays.
