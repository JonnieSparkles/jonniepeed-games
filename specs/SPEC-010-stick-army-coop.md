# SPEC-010: Stick Army co-op

Two players defend one bunker over the internet, from a link: two barrels on the turret, one wall, one squad, one wallet.

Status: planned, not started (Oct 10). Written down while work turns back to single player. Builds on [SPEC-008](SPEC-008-stick-army-campaign.md) and uses rooms ([guide 05](../docs/guides/05-rooms.md)); current behavior is in [Stick Army](../docs/games/stick-army.md).

## Why

Rooms work (#62, #63): friends can play together from a link, on phones and computers. Stick Army is the studio's deepest game, and a second gunner is the most natural way to share it.

## Decisions

- **One game, not two.** Co-op is a mode of the same code. Solo is the one-turret case and plays exactly as it does today; every fix and feature lands in both.
- **The host runs the game** (the rooms guide's "host runs the game" pattern). The guest sends its aim and fire; the host sends the field. "Same game on every phone" was ruled out: Stick Army's logic uses `Math.sin`, `cos`, `atan2` and `hypot` throughout (aim, bullet paths, bounces, the Dreadnought), and those can differ between Safari's engine and Chrome's, so two copies would drift.
- **Two barrels on one turret,** one each, in two colors (the host blue, the guest red). There's no room on the page for a second bunker. Each barrel has its own aim and its own heat, so one player's spraying doesn't lock out the other.
- **Shared:** the wall, the squad, the tags and the team score. You win or lose together. Upgrades (fire rate, cooldown, spread shot and the rest) apply to both barrels. Air strike and fighter calls are shared; either player can call them.
- **Individual scores, for bragging only.** Each shot remembers whose barrel fired it. Your score is the points your barrel earned: planes, chutes popped over the mat, troopers shot and your own combo (each player has one). Points nobody fired for (squad kills, air strikes, the wave bonus, the Red Cross bonus) go to the team only. The HUD shows the team score with both players' scores small under it. The end card puts the two side by side: points, planes, captured, and Red Cross planes hit, by name. Individual scores decide nothing.
- **The shop:** one wallet, and both players can buy. Each sees the other's picks as they're made; either can put a thing back, as now. The wave starts when both have tapped Ready, with a check by each name.
- **Co-op is harder.** Two gunners is a lot more firepower, so co-op waves bring more enemies (about half again as many to start) and a tougher Dreadnought. Tuned with the balance bots playing two barrels, then by playtest.
- **Dropping out.** If the guest drops, their barrel goes quiet and the game goes on; they get it back when they reconnect. If the host drops, the game pauses ("waiting for …") and goes on when they're back; after a minute the match ends and shows the score. Handing the game to the guest is left for later. Either player can pause, for both.
- **Starting a match:** "Play with a friend" on the title, behind the rooms secret, makes a link to send. The friend opens it to a waiting screen; the host taps Start.
- **No co-op high scores at first.** Co-op runs don't go on the solo board. If co-op sticks, it gets its own board.
- **Sound:** each phone plays its own, from the events it sees. Nothing new.

## How it fits the code

- **Turrets become a list.** Aim, heat, cooldown, recoil and firing move from `S` onto turret entries (`S.turrets`). Solo has one. Shooting, the HUD, the balance adapter and the tests follow.
- **Save and load the whole field.** A snapshot of everything on the page, small enough to send about 15 times a second, with short keys and only what changed when it's big (messages can be 16 KB; the guest's mobile data is the real limit). The guest loads the latest two snapshots and draws between them with the same `render`.
- **Effects travel as events.** Explosions, puffs, speech bubbles, floating text and sounds happen inside `update`, which the guest doesn't run, so the host sends them as small events ("boom at x, y") and the guest plays them.
- **The guest's own barrel turns at once** on its screen; the host's snapshots correct it.
- **The shop** sends the guest's taps to the host, which applies them and sends the shop back.

## Stages

Each stage works on its own before the next starts.

1. **Two barrels on one phone.** No network: the second barrel is driven by a bot or a second input. Solo unchanged (all existing tests and the bots pass as they do on `main`).
2. **Save and load.** Snapshots and effect events, checked on one phone: a page drawing from another page's snapshots looks the same.
3. **Over a room.** `rooms.js`, the link, the waiting screen, joining, dropping and coming back.
4. **The rest.** The shared shop, individual scores and the end card, co-op difficulty with the bots, and polish.

## Checks

- Solo is unchanged: the existing Stick Army checks and the balance bots match `main`.
- Two-browser tests with `tests/rooms/harness.py`, at least one a computer: a match from start to the shop and into the next wave, a guest dropping and coming back, the host dropping.
- Played on two real devices on different networks, a phone and a computer, before it's called done.

## Open questions

- Two barrels, or another shape for the second player (a commander running the squad, calls and shop)? Rooms take up to eight players, so a third or fourth could come later.
- How much harder co-op should be.
- Whether the host's lead (the guest's shots land a round trip late) needs any help beyond turning the guest's barrel at once.
