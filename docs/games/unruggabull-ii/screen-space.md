# Unruggabull II: screen space

Plan for the in-play layout on phones and desktop, agreed with the owner on Oct 15, 2026, from the controls audit (item 27b) and a mockup page he reviewed on his Galaxy S25. Measurements are the S25's in full screen: 360 × 780 upright, 780 × 360 sideways. Status: built in the screen-space pull request (Oct 15); the controls fixes follow in another. What it does now is in [README.md](README.md) under Screen.

## Why

In full screen the header (title, Pause, Sound, Exit full screen) took 48 of 360 px in landscape and two rows in portrait, where another 235 px sat empty above a framed 336 × 189 picture. Out of full screen a phone switched to the page layout, which in landscape left the controls below the bottom of the screen. Sound and Exit full screen are touched once but held space for the whole game.

## The rule

During play (from the end of the intro: playing, paused, and the rugged and clear cards) the game always uses the in-play layout below, on every device, whether or not the browser is in full screen. Full screen only decides whether the browser's own bars show. The title screen fills the window too, with its own layout ([title-plan.md](title-plan.md), Oct 15), so the page layout (the JonniePeed Games link, the header, the help line) no longer shows; Exit on the title goes back to JonniePeed Games. Start still goes full screen on a phone; on a computer it doesn't (the usual practice for browser games), and the Full screen button (on the title and the pause card) and F stay.

## Landscape (and desktop)

- **The picture** is the biggest 16:9 picture that leaves room for Pause: a side band of at least 56 px, or a 48 px band on top, whichever gives more picture. On the S25 that's 640 × 360, full height, 42% more than today's 537 × 302; on a 16:10 monitor 1280 × 720 with Pause above it. No frame or rounded corners.
- **Pause** is one icon at the top right: in the right band on a phone, in the band above the picture on a monitor. The HUD fills the picture's top corners, so it never floats over the picture.
- **The stick, Shoot and Slash** stay where they are today, overlapping the picture's corners a little (owner: don't push the stick to the far left).
- **The 48th's twin sticks** get areas of the same size, so their resting rings mirror each other: the same height, the same distance in from each edge.
- **No header** during play.

## Portrait

- **The picture** runs edge to edge (360 × 203, 13% more), with its bottom edge on the screen's halfway line.
- **The controls** start just below it and have the same height on every stage, so the picture never moves between stages (the 48th's had dropped 86 px). The 48th's sticks sit at the same height, each 88 px in from its edge.
- **Pause** is one icon at the top right, above the picture.
- **The tower dial** sits in the space above the picture: a notch for every floor from the ground to the roof (longer every tenth), only the floor you're on marked with its number, and the department's name. It follows the elevator dial's one scale for the whole tower. On the stairs and in the rides the marker moves with you. Drawn outside the game's picture. It goes away in cutscenes (the ending, the cut cards and the long ride's views above the car: the `cutscene` class).
- **No title** above the picture: the title screen has done that job, and landscape has none.

## The pause card

- Paused over the dimmed game, with the stage's own line as today. Buttons are 44 px tall: **Resume**, **Controls**, **Sound**, **Full screen** (Exit full screen while in it; not shown where the browser has no full screen), **Restart floor**, **Quit to JonniePeed Games**. One column in portrait; three short rows in landscape and on a computer, so it fits 360 px.
- **Controls** lists what the current stage uses on the current device (the stick and buttons on a phone, keys and mouse on a computer; the 48th and the roof their own), then Back. It replaces the help line under the game during play. (The title card had a Controls link too; the title screen that replaced it leaves Controls to the pause card.)
- Its look is provisional: the card's design may change with the title screen and clear card redesigns (items 4 and 5).

## Out of scope

The controls audit's other fixes (key maps, the blaster only where there's a fight, Slash hidden until the katana, the help text), the title screen and clear cards' redesign, and the button art. The roof's own controls wait for #111.

## Checks

Drawing and layout only: `python3 tools/balance/run.py unruggabull-ii --verify` with 0 mismatches, `tests/unruggabull-ii/parity.py` identical (the picture itself doesn't change), and `tests/unruggabull-ii/test.py` updated for the new layout at 780 × 360, 360 × 780, 915 × 412, a 4:3 tablet and a desktop window, in and out of full screen.
