# Elevator ride

Status: framework built, 2026-10-12. The playable run is the 13th Floor → elevator → roof. Final art, final composition and feel remain a separate pass. [README.md](README.md) describes current rules; [spec.md](spec.md) keeps the rest of the climb and its open questions.

## Built

- `arena.js`: one side-view screen, the shared jump/crouch/charge/input contract, mirrored `UnrugBull.VIEWS.side`, horizontal bolts and Spread Shot, directional slash/deflect, flyers and crawlers, paper returns, souls and pickups. Arena dimensions, speeds and hit boxes live in `ARENA`. Each sprite/effect drawing has its own small replacement function.
- `elevator.js`: `ELEVATOR` tuning, `STATES` entry/tick/exit, `ask` → `climb` → `open` → `supply` → `exit`. Destination `{floor,label,stage}` is data; default 13→99 (`R`, roof). Five alternating single-carpshit waves at 2/6.8/11.6/16.4/21.2 seconds. The indicator climbs for 30 seconds. Last threats clear for souls, the ding hard-cuts muzak, doors open, the crate slides and stops until collected. The operator is outside every collision/target collection and asks only “Floor?”.
- `drops.js`: one held supply, shared HUD icon, E or a pointer tap to activate. Spread Shot lasts ten seconds; Bull Run lasts five and destroys contact threats, with no damage to p(Loom); Spare Vest automatically restores full hearts in place once, including on direct rug deaths. Consumed drops stay consumed on continues. Two hearts or fewer gets the Vest; otherwise Spread and Bull Run alternate per run, starting with Spread.
- Core transfers carry souls, the seeded stream, continues and the held drop. `RUN.refillBetweenStages` is the single heart-refill setting. Elevator continues restore the entry souls/stream and restart the ride. The roof receives actual carried captives and its original lead-in; doors already opened on the ride stay open on that handoff. Direct roof testing still animates its doors as before.
- The shared renderer accepts `set.flat`, lights the arena's lit layer in screen coordinates, composites glow and uses the existing bloom/palette/dither finish. Corridor rendering has no changed path.
- `music-elevator.js`: “Please Hold” as one plain pattern track. Operator blips and a short synth ding use existing audio routing. No final music or new pixel art.
- Bridge mechanics/run/drop tests, direct hash and real controls at three layouts, OfflineAudioContext audio checks, arena bots and actual-frame replay verification. Standalone bots stop after the crate/exit; human play goes straight to the roof.

## Choices to review

- E and tapping the held icon; the Spare Vest needs no activation.
- Healthy drops alternate beginning with Spread; a Vest does not advance that alternation. The crate replaces a previous held supply.
- Full hearts at each stage boundary, controlled by one setting; lives remain open in the spec.
- The bull starts left of the hatch so a falling enemy can be lined up horizontally before contact. Five single-enemy waves make this a breather. Bots clear 100/100 at each skill, median 34.8 seconds including supply pickup. Real-phone playtesting can retune it.
- Bull Run keeps the corridor lane and charges into depth; in the arena it charges toward the current facing and turns at the walls. On the roof movement remains under player control; it clears snares/orbs/carps without touching loom health or odds.
- Arrival frees remaining enemies' souls. Enemies that escape the car's edges time out without a soul. Supply waits indefinitely for pickup; there is no forced pickup or new button.
- The transferred roof keeps the existing four-second lead-in timer but shows already-open doors so they do not close again after the crate. Direct roof behavior is unchanged.

## Art, music and feel pass still left

- **Car:** replace `drawCar`, `drawDoors`, `drawHatch`, `drawIndicator`; wall/door/panel rectangles remain stand-ins.
- **Operator:** replace `drawOperator` with the old Unrugged bellhop, on duty since 1987. Current ghost rug plus cap rectangles is a stand-in; no added dialogue.
- **Side-view poses:** replace arena `drawBull` and its simple bob/tilt with run, jump, crouch, shooting, slash and horns-down poses. Existing side sprite remains the source now.
- **Crates and drop icons:** replace `drawCrate` and `drops.drawIcon` independently. Current rectangles/existing Spread/Heart sprites are placeholders.
- **Please Hold for real:** replace the track object in `music-elevator.js`, preserving its ID and the start/ding cues.
- Enemy flight/scuttle poses, combat feedback, transitions, crate readability and real-phone feel/timing can be tuned afterward. No additional enemies or mechanic changes are required for this pass.

The later 13→42, 42→77 and 78→98 rides, cable snap, alley set and ending are not built here. They reuse the arena/destination seams; their stages need their own plans.
