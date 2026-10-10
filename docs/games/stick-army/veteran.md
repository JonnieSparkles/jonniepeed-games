# Stick Army: Veteran

A second level for players who find the campaign easy once their upgrades stack. Soldier is the game as it is; Veteran makes what you buy a real choice and the Dreadnought a real test.

Status: built in round 17 (Oct 10). Builds on [the campaign](campaign.md). Current behavior, with the numbers it settled on, is in [README.md](README.md); how it was tuned is in [history.md](history.md).

## Why

Early outside feedback (Oct 10): "it wasn't too hard bc u can stack upgrades. but i like that. maybe make 3 hardness levels". The owner found the same the night before: "once you get that spread shot and like a good cooldown, you're like, fucking, you got this. Which, you know, it's good in its own way", and "you could basically just buy like whatever you want every round". Two ideas were held back then because they'd change the game for everyone: tighter money, and a Dreadnought that spread shot can't just hose down. A harder level is where they belong.

## Decisions

- **Two levels, Soldier and Veteran** (Oct 10), not three. Soldier is today's game, unchanged, and the default. Every later balance change is checked on both, so two levels keep that cost down; an easier level can come later if players ask.
- **Veteran goes after stacking:**
  - **Prices up a third,** everything in the shop, so you can't buy everything and a pick is a choice.
  - **From wave 10, more planes and more armor,** so the run-up is a fight.
  - **A tougher Dreadnought:** more health, a smoke screen that lingers longer, and **spread shot's side bullets glance off it** (only the middle bullet hurts it), so it has to be aimed at.
  - **Same scoring.** Points mean the same on both levels.
- **Tuned with the bots, then playtested.** Target: the expert bots win about half as often on Veteran as on Soldier. Playtesting has the final say.
- **Picking it:** a Soldier / Veteran choice on the title, by Start, on phones and the open notebook alike. It remembers the last pick. Veteran wears a "new" tag until it's been picked once on that device.
- **Records per level:** best score, best wave and wins are kept separately. The end card says when a run was Veteran.
- **High scores per level:** Veteran has its own online board, so a Veteran run never sits beside a Soldier one; no score multiplier. Soldier keeps the current board. The title's High scores card has Soldier / Veteran tabs and opens on your pick; the notebook's facing page and the end card show the board for your pick.
- **Play stats** report the level.
- **No change to how fast points come on Soldier,** so its board stays.

## Checks

- Soldier is unchanged: the existing checks pass, and the bots on Soldier match `main`.
- Each level gets its numbers; the Veteran board is used for Veteran runs, saves and the tabs; bests are kept apart.
- Spread shot's side bullets don't hurt the Dreadnought on Veteran and do on Soldier.
- The title, the High scores card and the end card at phone, short landscape and notebook sizes.
