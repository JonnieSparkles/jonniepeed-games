# Unruggabull II: level-end cards, pause card and touch controls

The plan for item 5 (and the touch controls' look), agreed with the owner on Oct 15, 2026, on a playable design page he reviewed on his Galaxy S25: https://claude.ai/artifact/JesNdoLNtw89rsgdApB2Cd. Status: built (`cards.js`, the pull request after #126); what it does now is in [README.md](README.md) under Cards. Layout is #125's ([screen-space.md](screen-space.md)); this plan only changes what the cards, the pause card and the pads look like and say.

## Why

Today's cards are an HTML panel with up to ten stat rows and a flavour sentence each. The owner: childish, too much text, inconsistent with each other, off theme. The touch buttons are the one smooth, glossy thing in a pixel-art game.

## The cards come from p(Loom)

Clear and rugged cards are p(Loom)'s messages, in the **Caption** style: the bar it already speaks through on the 48th Floor (`drawTalk` in `floor48.js`): a dark red-black panel (`#140806`), a 2 px orange rule on top (`#ff7a2a`), its eye (the 48th's three discs) and the P(LOOM) tag top left, its odds top right in dim orange (`#9a5a2a`). Titles and lines in `#ffd060` (outlined), labels in `#ff7a2a`, numbers in cream (`#fff6e2`), the game's 3×5 font (`txt`/`otxt` in `art.js`).

**Placement: the Strip.**
- **Sideways and desktop:** a band over the bottom third of the picture (the top 102 of 270 picture pixels' worth, from y 168), sliding up in 0.3 s; the scene keeps playing above it (souls rising after a clear, the bull's soul after rugged). Buttons sit in the band's bottom row.
- **Upright:** the panel fills the controls' space under the picture (the pads hide while a card is up), from the picture's bottom edge to the screen's. The picture and the tower dial don't move. Buttons are stacked, full width, at least 44 px tall, at the bottom of the panel.
- Drawn on its own canvas at the picture's pixel scale (480-wide grid sideways; a 320 × 346 grid upright on the S25), placed by `layoutPlay()`, with HTML buttons over it. The game's picture canvas is never drawn on, so bots and parity are untouched.

## Clear card

- **Title:** the department from the tower dial + `: OFFLINE.` — `ACCOUNTING: OFFLINE.`, `RECLAMATION: OFFLINE.` (not "LOST": that read as the player losing).
- **p(Loom)'s line** (table below), typed in.
- **Three numbers:** souls freed on the floor, time on the floor, and the run's total souls. Counted up over 0.6 s.
- **Flags**, only when they apply: NEW BEST (the floor's best souls, runs without a retry only), and RETRIED (red) on a run that has retried.
- **One button: Continue.** It does what the clear's main button does today (the elevator after the 13th, the lobby after the 48th). No Replay, no Play again.
- Cut from today: deflects, best streak, formation wipes, smashes, longest rally, machines wrecked, clutter smashed, cables cut, bobbins sent back, reserve cracked, biggest chain, the Best row, every flavour sentence and the routing slips.

## Rugged card

- **Title:** `UNIT RUGGED.`, then p(Loom)'s line.
- **Two numbers:** souls lost (the souls earned in the failed try, as `-41`) and where you'll restart (`BACK TO THE DOOR`).
- **Buttons: Retry** (main) and **Quit** (back to the title screen; the run ends).
- **The leaderboard warning is asked, not written.** The card itself says nothing about the leaderboard. The first Retry of a run that is still ranked swaps the card's body for `RETRY?` and `YOUR RETRY WILL NOT COUNT ON THE LEADERBOARD.`, with **Retry** and **Back**. Back returns to the card. Once a run has retried, Retry goes straight through.
- **The run's flag:** after a retry, a crossed-out trophy (a gold trophy with a red slash, 11 × 10 picture pixels, dark outline) is drawn **just left of the soul icon** in the HUD for the rest of the run, so the soul counter stays readable.
- The in-picture `RUGGED.` banner goes; the card says it.

## Where Retry restarts (item 26)

The card shows the floor's own restart point; the rules are item 26's (built with the difficulty modes: the 48th and the long ride restart whole, the 13th's hall carries the run).

| Stage | BACK TO |
| --- | --- |
| Stairwell | THE GARAGE before the katana, THE KATANA after |
| 13th Floor | THE DOOR (the top of the floor) |
| 13th, beaten by SHRED-O | SHRED-O ("BACK FOR SECONDS?" stays its line in the game) |
| 48th Floor | THE START (it restarts whole) |
| Long ride | FLOOR 48 (it restarts whole) |
| Roof | ROUND n or THE QUIET (today's checkpoint; the rule is open) |

## Which stages show a card

| Stage | Clear | Rugged |
| --- | --- | --- |
| Stairwell | None: the door kick hands on | Card |
| 13th Floor | Card | Card |
| Quiet ride, lobbies | None | Can't be rugged |
| 48th Floor | Card (before the lobby) | Card |
| Long ride | None: the doors open on the roof | Card |
| Roof | A stub, `ROOF: OFFLINE.` with Continue (to the title screen for now), until the ending replaces it | Card |

A `#stage=` practice run of the stairwell or long ride ends where it does today.

## p(Loom)'s lines and odds

Its odds are a small number by its eye, falling as you climb, fixed per stage. A gag, nothing more. Its eye steadies, twitches or goes red with them.

| Stage | Clear | Rugged | Eye, odds |
| --- | --- | --- | --- |
| Stairwell | — | AS PROJECTED. | steady, 99% |
| 13th Floor | ANOMALY LOGGED. | CORRECTED. | steady, 91% |
| 13th, at SHRED-O | — | SHRED-O IS WAITING. | steady, 91% |
| 48th Floor | RECALCULATING. (flickers to RECALC4LATING.) | FINALLY. | twitching, 38% |
| Long ride | — | STAY. DOWN. | twitching, 22% |
| Roof | UNLIKELY. (the stub) | PLEASE STAY DOWN. | red, 4% |

## Pause card

The same strip frame in the game's own colours, not p(Loom)'s: panel `#16112a`, a gold rule (`#ffd44a`), a gold pause icon and PAUSED top left, the department top right, the stage's existing pause line (`pauseText`) in cream. #125's buttons: **Resume** (gold), **Restart floor**, **Controls**, **Sound on/off**, **Full screen** (hidden where the browser has none), **Quit**. **Quit goes to the title screen** (a change from #125, whose Quit leaves for JonniePeed Games). Upright: one column under the picture. Sideways and desktop: two rows of three over the bottom of the dimmed picture. Controls opens #125's list on the page's card, and Back returns to the pause card.

## Touch controls: Ghost

The look only; #125's sizes and places, the 18 px touch margin and `padAt()` stay.

- **Shoot and Slash:** a dark glass disc (`rgba(9,7,11,.5)`), a thin cream ring (`inset 0 0 0 2px rgba(255,246,226,.35)`), the existing pixel icon in cream. **No labels.** No gradients, gloss or drop shadows.
- **Pressed (`.on`):** the glass fills `rgba(255,246,226,.32)`, the icon goes white, the disc scales to 0.94.
- **Charge ring (`::before`, `--fill`):** a 3 px conic ring: Shoot's sky blue (`#7fd4ff`), red when low (`.low`, `#ff5a4a`); Slash's gold sweep as today.
- **Blaster down, put away or a katana-only stage (`.off`):** no ring, the icon at 45%, and a thin cream slash across the disc (a `linear-gradient` background, because `::after` is the touch margin).
- **Before the katana (`.sheathed`)** and **its pop-in (`.reveal`):** #126's, unchanged.
- **Sticks:** a faint 1 px cream ring and a soft cream knob; held: a gold ring and knob (the 48th's aim stick: blue).
- **Pause icon:** the same dark glass disc with cream bars.

## Checks

Drawing and layout only. `python3 tools/balance/run.py unruggabull-ii --verify --ref origin/main` identical on all six stages; `tests/unruggabull-ii/test.py` passing (updated where it reads the old card's rows or buttons); `tests/unruggabull-ii/parity.py` identical (the cards draw on their own canvas). Phone captures of every card and the pause card, upright and sideways, and the pads in every state, against the design page. `python3 tools/stamp.py` last.

## Captures

From the pull request, on a 360 × 780 and a 780 × 360 phone and a desktop window: [upright](cards/upright.png), [sideways](cards/sideways.png) (the last frame shows the crossed-out trophy after a retry), [desktop](cards/desktop.png).

## Left for later

- ~~The 13th Floor's hall restart is a fresh run.~~ Done with the difficulty modes: Retry before SHRED-O carries the run (its retries and the stairwell's souls), so the question is asked once and the trophy shows. The cards also show the run's mode, small and dim, ahead of NEW BEST and RETRIED, and on a Raging Bull run that could still open Impossibull the question adds OR UNLOCK IMPOSSIBULL. (owner, Oct 16).
- **The roof's own line and restart label** go in after #111 merges (today's checkpoint names are read, `roofState`).
