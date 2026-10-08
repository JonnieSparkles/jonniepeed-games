# Unruggabull II

Built from [SPEC-008](../../specs/SPEC-008-unruggabull-ii.md). The game is at `site/unruggabull-ii/index.html`. This build is Floor 13 only, the first slice of the climb. It appears as a **demo** card on Side B, keeps `<meta name="robots" content="noindex">` and has local best scores only. The original game, Unruggabull: RugCo Alley, stays in its own repo.

## Finding and promoting the demo

Open Side B on the studio page (hold the rainbow egg, or `#side-b`) and choose the Unruggabull II card. To promote it after approval, remove `data-side="b"`, `data-badge="demo"`, the `.badge` span and initial `hidden` from the card, remove the noindex tag, update this doc and the README, run the checks below, stamp last and publish by hand.

## Floor 13 rules

- **Controls.** Move left and right, jump, slash; the blaster fires on its own and leans toward the nearest temp or carpshit in a cone ahead. Keys: A/D or arrows, Space/W/Up, J/K/Enter. M sound, F full screen, P or Escape pause. On touch screens, Start goes full screen and four pads appear under the scene (in landscape, in the bottom corners). A finger can slide between the arrow pads.
- **Slash** cuts carpshits in two, catches temps as you pass their cubicle, knocks paper wads, bundles and staples back where they came from (a deflect), and on a pulling runner cuts the rug.
- **The hall.** Cubicles scroll past. Temps pop up and throw paper wads, leading you a little if you're moving. Flying carpshits come down the hall and bite. From 20 seconds, file boxes sit on the floor: jump them or step around. Every kill frees one soul; the score is souls freed.
- **The runner.** From 35 seconds or 20 souls, the red runner warns (its edges flash) and then pulls toward the Shredder for 2.2 seconds. Standing on it drags you deeper; step off, jump, or slash to cut it. The first pull shows a prompt. Riding it all the way into the mouth costs two hearts and spits you back out.
- **The Shredder** wakes at 60 souls (or 150 seconds): the hall stops, it says its line, the fight starts. Health 100. Blaster hits 0.3; a deflected bundle 6; a deflected staple 2.
  - Phase 1 (above 66): bundles every 2 seconds, pulls of 2.4 seconds every 8.
  - Phase 2 (above 33): staple fans of four with one gap, alternating with bundles; pulls of 3.2 seconds every 6.5.
  - Phase 3: faster, pulls of 3.8 seconds every 5. Cutting the rug jams it for 2.6 seconds: no attacks or pulls, and blaster hits do triple damage. The first phase 3 pull shows a prompt.
- **Clear.** Thirteen souls come out of the Shredder, "FLOOR 13 CLEAR", then a card with souls freed, time and best.
- **Rugged.** Five hearts, a short flash after each hit. At zero, "Rugged. Continue?" starts the floor over.

Best souls and fastest clear are kept in `localStorage` (`unruggabull-ii-best`); sound mute in `unruggabull-ii-muted`.

## Code entry points

- `art.js` (`UnrugArt`): palette, 3x5 font, sprites as text grids, and the bull's poses from behind, cached once.
- `audio.js` (`UnrugSound`): `init`, `play(name)`, `muted`, `toggle`, `music('theme' | 'tower' | 'shred' | null)`, `say(text, who)` for blip talk and `talkTimes` so captions type out in step with it. The chip sequencer and the three tracks live here.
- `game.js`: `TUNE` holds every number above. `newRun`, `update(dt)` and `draw()` are the core; `updatePull`, `updateBoss` and `updatePhase` run the runner, the Shredder and the floor's flow. The corridor projection (`PX`, `FY`, `YH`) and the far-wall box `BACK` are at the top.

## Validation

Serve `site/` on port 8000 and run `python3 tests/unruggabull-ii/test.py`. The cases step the game tick by tick through a test-only bridge (injected into the response, never shipped): the hall, the runner, the Shredder's phases and jams, the clear and rugged cards, pause and the keyboard. Then it checks layout at desktop, phone portrait and phone landscape, including full screen on Start and real touch on the pads. The studio harness covers the Side B card.

Difficulty was checked with a scripted player, not people: it clears the floor in about two minutes, waking the Shredder after about 65 seconds. It still needs playtesting on real phones, and playtesting wins.

`python3 tools/og/make.py --game unruggabull-ii` rebuilds the share card and shelf thumbnail from the title screen.
