# Unruggabull II: title screen

The plan for item 4, agreed with the owner on Oct 15, 2026, on a playable design page he reviewed on his Galaxy S25 and checked at other sizes: https://claude.ai/artifact/Fx6RHPmDCBzsLgsbMNQjeE (**Alley, panned** and **Today, sharpened**; the other backdrops and logos on the page are the options he turned down). Status: built (`title.js`, `title-art.js`, the title PR); what it does now is in [README.md](README.md) under Title and story.

## Why

The old title was a page: the studio header, Sound and Full screen buttons, a framed picture with the logo painted on it, then an HTML card ("The 13th Floor: Accounting", a demo note, "best played in landscape") with Start below the fold on a phone held sideways. The owner: "needs a whole refresh". The game is now the whole climb, the cards and pause card are p(Loom)'s strips (#127), and the game fills the window everywhere (#125).

## What it says

A sequel to Unruggabull: RugCo Alley. The first game looked down RugCo Alley at the RugCo Empire garage with fire on its roof. The title is that view a night later: the fire is out, smoke drifts off the roof, and RugCo Tower stands behind the garage with p(Loom)'s eye in the pavilion on its roof. He stands at the shutter. Dry: nothing explains anything.

**Two sides of the tower** (owner, Oct 15): the title sees RugCo Tower from the back, over the garage in the alley, which is his side. The intro's stills see it from the front, the face RugCo shows the world. Later art keeps them apart: the front's look doesn't show up from the alley, and the alley's garage and shutter don't show up out front.

## The picture

- **One painting** for every screen: the owner's ChatGPT picture (Oct 15, the third try, outpainted upward to 3:4, 1086 × 1448), shrunk to **480 × 640** and the game's 64 colours exactly as the intro's stills are (`quantize` in `tools/unruggabull-ii/intro/stills.py`: BOX shrink, render.js's palette and lookup, the 4× Bayer dither), saved as a lossless WebP inside `title-art.js` (`UnrugTitleArt`, about 85 KB) by `tools/unruggabull-ii/title/art.py SRC`. The source picture stays out of the repo, as with the intro; the owner has it.
- What is painted, in picture pixels (480 × 640): the pavilion with the eye at (240, 187); the zig-zag carpet band at (202–281, 213–231); the RUGCO EMPIRE board's face at (177–303, 441–457); the blue sign panel on the right wall, a slanted frame from (377, 381–409) to (416, 351–383); the shutter 188–292 × 468–548; the alley floor below 548; plain sky above the antennas (152).
- **Drawn in code on top** (`title.js`):
  - **RUGCO EMPIRE** on the board, the game's 3×5 font at 2×, as orange neon tubes (each tube pixel with a bright core) with a soft glow, its light washing the board and running down the shutter; the P won't stay lit, and now and then the whole sign drops out for a frame.
  - **RUGS** on the blue panel in light blue neon, the first game's sign (and intro still 1's), each column dropped by the frame's slope so the letters sit in it; it flickers off now and then.
  - **The carpet** at the top of the tower, redrawn as a woven rug lit from inside: two zig-zags in gold and orange creeping along as if it's still being woven, cream points, and a fringe at each end.
  - **Smoke** off the garage roof (y 433), soft grey puffs rising and fading.
  - **Souls** rising out of the alley into the eye.
  - **Him**, from behind, the game's standing pose at three quarters, with a warm rim: feet at (240, 586) upright, (240, 552) at the shutter for the sideways pan.
  - **p(Loom)'s eye** in the pavilion, radius 7: one big eye, orange idle, red when it means it (the intro's colour rule). **Baby:** half-lidded, drifting, bored. **Regular:** watches him. **Raging:** red, locked on him, trembling. **Impossibull:** red and wide open, still, no blink. It blinks now and then. When the mode changes (owner, Oct 16: "more exciting when clicked") the tower lights up for it (owner: all three of a mockup's options): the windows black out and light back up floor by floor, bottom to top, in the mode's fire colour (about 0.6 s, a mask of the painting's bright pixels, drawn on the painting under the souls, smoke and signs); as the light reaches the top the pavilion blazes and throws rays; and the eye swells for a moment. It glances down at the panel and its glow flares, then reacts: Baby, it rolls its eye; Regular, it narrows on him; Raging, it flashes red, its pupil widens and it shakes; Impossibull, it goes wide, its pupil shrinks to a dot and it trembles.

## The logo: Today, sharpened

- Today's logo, at the same size (`A.logo()` in `art.js`): UNRUGGABULL II in the block face (`LOGO_F`), 4 × 6 picture pixels a cell, leaning 1.8, the old gradient (cream to gold to orange to red, the II in gold) and speed streaks, plus a thicker dark outline, a short burnt edge under the letters (2 pixels, `#6a1408`), a fine highlight along the top of each cell, and a glint on the II that catches every 3 seconds (drawn by `title.js` at `logo().glint`). It takes the least height of the options, which is why it won.
- **SALVATION FOR THE UNRUGGED** right under the letters (`logo().base`), the 3×5 font at 2×, cream, outlined, on a dark band (60%) so it reads over anything.

## The panel: the elevator

A RugCo elevator panel, in the family of the cards' strip (#127) but steel: a brushed dark steel face (`#1b1d24`), a brass rule on top.

- **Readout:** a dark red LED box with the mode's name and its line (typed in when the mode changes).
- **Four call buttons**, one per mode, each a round button with the mode's **bull face** in it, Doom-style. The picked one is lit gold with a warm halo and **its ring is on fire** (owner, Oct 16), hotter up the modes: Baby a candle's flicker, Regular orange, Raging tall red-orange, Impossibull crimson with a white-hot core; it flares on a pick, with embers off the top. The others are dark and dimmed. A pick makes the button jump (and shake on Raging and Impossibull). Faces look around and blink on their own; the one you pick reacts for a second (Baby's eyes squeeze shut and two hearts float up, Regular grins, Raging roars, Impossibull's eyes flare and it breathes a blast of fire); Raging snorts steam, Impossibull fire. Under reduced motion there's no fire or shaking. The labels drop "BULL": BABY, REGULAR, RAGING, IMPOSSI (the readout says the whole name). Impossibull is charcoal with cracked horns, glowing eyes, a scar and a gold nose ring.
- **Lines:** BABY BULL: `EXTRA HEALTH.` · REGULAR BULL: `REGULAR HEALTH.` · RAGING BULL: `NO HEALTH RESETS.` · IMPOSSIBULL: `NO HEALING.` (owner). **Regular is the default.**
- **Impossibull is locked** (owner, Oct 16) until Raging Bull is cleared: a dark button with a padlock and its name dimmed. A tap (or the arrow onto it) shakes it, gives the blaster's dry click, and the readout shows IMPOSSIBULL, `NO HEALING.`, then `BEAT RAGING BULL.`; the mode doesn't change. Its rule: five hearts for the whole climb and nothing gives one back (no coffee, no katana refill, no crate's hearts, no refill between stages). Unlocked by `unruggabull-ii-impossibull` = `1` on the device, set when a full run (from Start) is cleared on Raging Bull without a retry (item 29, built; `actions.locked(mode)`); a kept Impossibull pick falls back to Regular while it's locked.
- **The board line:** a gold trophy, TOP, #1's hat left of its initials, its souls and a drawn `>`, tappable; it opens the picked mode's online board in the panel (upright) or the band (sideways): TOP 10 with **Top 50** / **Top 10** and **Back**, rank, hat, initials, souls, time and the input icon, your best always at its real rank (under a `...` gap when it isn't among the rows), scrolling by drag or wheel with a thin bar, two columns sideways; offline, BOARD OFFLINE with the device's board from item 29 under it. The panel or band grows up to just under the logo while the board is open (owner, Oct 16). Built with the online leaderboard (Oct 16; the README's Leaderboard). Its tap zone is 40 grid rows upright and 34 in the band, so it's a 44 px target on a phone.
- **Start**, gold, the panel's main button.
- **Sound, Full screen and Exit:** upright, three steel keys on the panel beside the readout; sideways and on a desktop, two Ghost discs and a Ghost EXIT pill where Pause sits in play (outside the picture). Full screen (added after #130, owner) shows four corners pointing out, or in while full screen, and hides where the browser has none, like the pause card's; Start still goes full screen on a touch screen (the controls doc's rule), and F works too. Exit goes back to JonniePeed Games (owner, Oct 15: the page's header and studio link are gone from the title). No **Controls** on the title: it lives on the pause card.
- **No stage select** (owner, Oct 16: "we're not going to have stage select"); the title kept no room for it.

## Layout

The title doesn't follow play's halfway line; it follows its own rules on every screen. Checked at 360 × 640, 360 × 780, 390 × 844, 412 × 915 and 768 × 1024 upright; 640 × 360, 780 × 360, 844 × 390 and 1024 × 768 sideways; 1280 × 800, 1366 × 768 and 1920 × 1080 on a desktop.

- **Upright** (taller than wide): the panel takes the height it needs (a 320-wide grid at most 1.5 screen pixels a grid pixel, centred on a tablet with steel to the sides; only as tall as what it shows (owner, Oct 16): 246 rows for the readout, the buttons and Start with 26 rows under Start to keep it clear of a phone's rounded corners in full screen, 290 once the board line shows) and the painting gets the rest. The painting is as wide as the screen and anchored to the panel's top, so the sky crops first on short phones and more sky shows on tall ones (on a very tall one, the sky's top row carries on up). If the safe zone (rows 30 to 596: logo, eye, tower, garage, him) won't fit at full width, the painting shrinks until it does and the sides fade to dark (a short 16:9 phone, a tablet). **The logo sits in the middle of the sky that shows**, between the top of the screen (plus a small margin) and the pavilion (row 176); where the sky is cropped away it sits just below the top.
- **Sideways and desktop:** the picture is play's 16:9 rectangle (#125's rules, from `layoutPlay()`). It's a 480 × 270 window into the painting, with the panel as a band over its bottom 82 rows (from row 188), like the cards. The window **pans up**: it opens at row 370 (him at the shutter under RUGCO EMPIRE, the blue RUGS beside him), waits 0.8 s, then eases up to row 94 over 4.2 s, where the eye, the carpet and the top of the tower show with clear sky above. The logo fades in from 3.2 s at row 104. The panel works during the pan. The pan plays each time the title comes up, and again after a rotate or resize; with reduced motion it starts at the end.
- **No page around it:** no studio header, no HTML title card, no help line ([screen-space.md](screen-space.md) changes with it).

## Input

- Touch and mouse: tap a face to pick; tap Start; tap the board line; tap sound or Exit. Each is a real button over what's drawn, so Tab and a screen reader reach them.
- Keys: ← → or A D (↑ ↓, W S too) change the mode; Enter or Space starts; B opens the board, Escape or B closes it; M sound; F full screen.
- The pick goes on the run as its mode (`RUN.mode`: `baby`, `regular`, `raging`, `impossibull`) and is kept on the device (`unruggabull-ii-mode`; owner, Oct 15); a first visit is Regular. What the modes do is item 29's, built: see the README's Difficulty modes.

## Sound

The title theme as before (`Snd.music('theme')`), on the first tap or key as the browser allows. Button sounds (owner, Oct 15), from the game's own set through `actions.play(name)`: a `tick` on every press, `ready` (the two-note chirp) when the mode changes, `start` on Start.

## Out of scope

The intro, the level-end cards and pause card, the end-of-game screen, what the modes do (item 29), the online leaderboard (mocked Oct 16, built since: the README's Leaderboard).

## Code

- **`title.js`** (`UnrugTitle`), like `cards.js`: `make({ A, arena, stage, actions })` gives `show()`, `hide()`, `frame()`, `key(e)`, `mode`, and for the tests `labels()`, `press(label)` and `layout` (the safe zone, the logo and each button, in CSS px). It draws on one canvas over the arena, so the game's picture canvas and the renderer are untouched. `actions`: `start(mode)`, `picked(mode)`, `exit()`, `sound()`, `soundOn()`, `board(mode)`.
- **`art.js`:** `logo()` is Today, sharpened.
- **`game.js`:** the title state hands drawing and input to `Title` (the old `drawTower`, `buildTower`, `skyline`, `drawTitle`, `TITLE_BULL` and the title card are gone); Start plays the intro as before (full screen on touch). The title uses the in-play layout (`ingame`, plus `titling`, which hides the picture, Pause and the dial).
- **`index.html`:** the title card and its notes are gone; the title's styles (`.ttl`, `.tb`).
- **`tools/og/make.py`:** the share card is the top of the title as an upright phone shows it.

## Checks

- Bots: `python3 tools/balance/run.py unruggabull-ii --verify --ref origin/main` identical on every stage (the title isn't play).
- `tests/unruggabull-ii/parity.py` identical (it doesn't capture the title).
- `tests/unruggabull-ii/test.py`: the title at eight sizes (safe zone and logo on screen, every button on screen and at least 44 px, no header, no card, no board line yet), a pick kept across a reload, the arrows, sound, Exit; `case-04-flow.js`, `case-28-branding.js` and `case-37-cards.js` start from or return to the title screen.

## Captures

From the pull request: [upright](title/upright.png) (360 × 780, a pick of Raging, 412 × 915 and a 768 × 1024 tablet), [sideways](title/sideways.png) (780 × 360, the start and end of the pan; the P in EMPIRE caught out), [desktop](title/desktop.png) (1280 × 800).
