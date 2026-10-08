# SPEC-007: Stick Army campaign

Twenty waves, a final boss, a victory screen, then optional endless play. Something new arrives every couple of waves on the way, and each boss wave is different.

Status: draft, not built. Answer the open questions at the end before building. Builds on [SPEC-002](SPEC-002-stick-army.md); current behavior is in [Stick Army](../docs/games/stick-army.md), and difficulty is measured with the [balance bots](SPEC-005-balance-bots.md).

## Why

Playtest on Oct 8: wave 14 at 8 minutes 30, still feeling strong and willing to keep going, but "the variety seemed to die out". Nothing new appears after wave 12 (armored troopers). Tanks never landed: waves 9–14 send one or two cargo planes each, and a good kit downs them before the drop. Zeppelins go down fast. Runs have no ending except losing, and decent bots last to about wave 28, roughly 24 minutes of fighting.

## Decisions

- **A run is 20 waves.** At the owner's pace that's about 15 minutes, shop included. Wave 20 is a final boss. Beating it wins the run.
- **Winning is a real moment:** a victory card with the score, the time, and a roll call of the squad (who made it, their ranks and kills, and the fallen).
- **Then endless, if you want it.** "Keep going" continues from wave 21 with the same squad and kit. Pressure keeps rising and bosses repeat. Score keeps counting.
- **Something new every couple of waves up to 20,** each introduced with its own banner line, like the waves today. After 20 they mix.
- **Each boss wave is different:** 5, 10 and 15 are zeppelin variants, and 20 is the final boss.
- **Wave 20 should be a fight.** Difficulty from about wave 12 is retuned so the run ends with tension, not a victory lap. Targets with the bots: decent wins about a third of runs, expert about two thirds, casual rarely. Playtesting has the final say.
- **Squads become more personal.** Each soldier keeps a kill count, shown on promotion, in the shop news, the pause card, the fallen list and the roll call.

## The waves

New things marked **new**. Waves not listed keep today's mix, growing as now.

| Wave | What arrives | Notes |
| --- | --- | --- |
| 1–4 | planes, bombers (2), snipers (3) | as now |
| 5 | **boss:** zeppelin | as now: arrives at 9 s after a horn |
| 6 | rushers | as now |
| 8 | **new:** HQ airdrops | a friendly blue crate on a chute now and then; pop it low over a mat to catch it for tags, a wall patch or a free call. Shoot it and it's lost. |
| 9 | tanks by cargo plane, HQ air strike | as now |
| 10 | **boss: armored zeppelin** | grey plates over the hull. Hits on a plate clang until the plate is shot off; the gondola is plated until half health. Two escort planes stay close. |
| 12 | armored troopers | as now |
| 13 | **new: tanks by road** | some tanks roll in from the page edge instead of dropping, so they can't all be stopped in the air |
| 14 | **new: dive bombers** | a siren, then a steep dive at the bunker with one heavy bomb at the bottom. Two hits down it mid-dive; or shoot the bomb. |
| 15 | **boss: twin zeppelins** | two smaller zeppelins at different heights, crossing paths |
| 16 | **new: helicopters** | hover near an edge and lower three or four troopers on ropes, no chutes (so no catches). A door gunner shoots at crew. Four hits. |
| 18 | **new: night raid** | the page goes dark; a lamp follows your barrel, planes show running lights, explosions light the page. One wave in the campaign; occasional in endless. |
| 19 | the big push | everything so far, at full strength |
| 20 | **final boss** | see below |

## The final boss

**The Eraser.** You've been drawing your army all game; the enemy brings an eraser. A huge hand-drawn eraser, red-pen enemy colors, crosses the page high up while troopers jump from it and crumbs fall like bombs.

- **It rubs things out.** Every few seconds it picks a target: a recruit, the sentry tower, the wire, a trench row, a mat or a chunk of wall. A dashed outline shows the target for about two seconds, then the Eraser dips down and rubs it out, leaving a grey smudge.
- **The dip is the weak spot.** Its worn rubbing edge only shows while it dips, and it's in range of the barrel. Enough damage during the dip knocks it back up before it erases anything.
- **At half health it gets angry:** faster dips, and two targets a pass.
- **Going down,** it crumbles into eraser shavings, and the victory card follows.
- Air strikes and fighter cover work on it; bazookas and rockets hit hard.
- Its health bar comes in with it and sits above it, like the zeppelin's.

## Victory and endless

- **Victory card:** "The page is yours!", the score, time played, waves, zeppelins and tanks downed, then the roll call. Buttons: **Keep going** and **Play again**, plus Back to games.
- **Keep going** opens the shop as after any wave and continues from wave 21. A small "endless" tag shows next to the wave number.
- Endless waves mix every threat. Every fifth wave is a boss, cycling the zeppelin variants, with the Eraser returning every tenth.
- **Saved locally:** best score (one, across both), runs won, and best wave. The title card shows "Won N times" once you've won.
- Online scores remain later work. If they come, wins and endless waves fit a separate board per [the leaderboard guide](../docs/guides/00-leaderboards.md).

## Difficulty to wave 20

- Retune `waveCfg` from about wave 12 so 15–20 press harder: denser bombers and planes, more cargo and road tanks, more rushers. The current wave-29 ceiling (0.3 s plane gap) arrives around wave 22 instead.
- Watch the economy. The owner felt strong at 14 because tags flow freely; if bots agree, late kills pay a little less, or late supplies cost a little more.
- Each stage below ends with a bot run (decent, `--ref main`) and a playtest. The bots learn each new threat as it's added.

## Squad attachment

- `r.kills` per recruit: kills he scores himself, plus a share of crushes and catches.
- Shown on promotion ("Cpl. Inky! 85 kills"), in the shop news, on the pause card ("Sgt. Doodle (12 waves, 140 kills)"), in the fallen list and on the roll call.
- The roll call names the top gun.

## Build stages

Do these in order and playtest after each.

1. **The ending:** the final boss, the victory card and roll call, kill counts, endless, saved wins, and the difficulty retune to 20. This alone gives runs a clear ending.
2. **Boss variety:** the armored zeppelin (10) and twin zeppelins (15).
3. **New threats:** tanks by road (13), dive bombers (14), helicopters (16), HQ airdrops (8).
4. **Night raid (18)**, the riskiest for readability, last.

Each stage updates `docs/games/stick-army.md`, the harness (`tests/stick-army/`), the bot and adapter, and the What's new note if a board exists by then.

## Open questions

1. **Final boss:** the Eraser, or a more classic flagship (a giant red airship with turrets)?
2. **What the Eraser rubs out:** gone for the rest of the run (it matters in endless), or redrawn after the fight?
3. **Night raid:** in, or leave it out?
4. **Endless scoring:** one best score, or a separate best for endless waves?
5. **How hard should winning be?** The targets above (decent bots a third, expert two thirds) are a starting point.
6. **Twenty waves:** right length, or try 15 first?
