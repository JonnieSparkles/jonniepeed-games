# SPEC-007: Stick Army campaign

Fifteen waves, three bosses, a victory screen, then optional endless play. Something new arrives every couple of waves on the way, and each boss wave is different.

Status: stage 1 (the ending) is built; stages 2–4 are planned. Builds on [SPEC-002](SPEC-002-stick-army.md); current behavior is in [Stick Army](../docs/games/stick-army.md), and difficulty is measured with the [balance bots](SPEC-005-balance-bots.md).

## Why

Playtest on Oct 8: wave 14 at 8 minutes 30, still feeling strong and willing to keep going, but "the variety seemed to die out". Nothing new appeared after wave 12 (armored troopers). Tanks never landed: waves 9–14 sent one or two cargo planes each, and a good kit downs them before the drop. Zeppelins go down fast. Runs had no ending except losing, and decent bots lasted to about wave 28, roughly 24 minutes of fighting.

A second playtest the same day reached wave 16 at 11:02: "very fun", but "by 12 or so I was just destroying". Fifteen waves is the right length.

## Decisions

- **A run is 15 waves** (Oct 8): about 11–12 minutes at the owner's pace, shop included. Three bosses: a zeppelin at 5, a zeppelin at 10, and the Dreadnought at 15. Beating the Dreadnought wins the run.
- **Winning is a real moment:** a victory card with the score, the time, and a roll call of the squad (who made it, their ranks and kills, and the fallen).
- **Then endless, if you want it.** "Keep going" continues from wave 16 with the same squad and kit. Pressure keeps rising and bosses repeat; the Dreadnought returns every tenth wave (25, 35…). Score keeps counting.
- **Something new every couple of waves up to 15,** each introduced with its own banner line, like the waves today. After 15 they mix.
- **The run-up should be a fight.** Waves 10–14 bring more and stronger enemies, so the run ends with tension, not a rout. Targets with the bots: decent wins about a third of runs, expert about two thirds, casual rarely. Playtesting has the final say.
- **Squads become more personal.** Each soldier keeps a kill count, shown on promotion, in the shop news, the pause card, the fallen list and the roll call.
- **The final boss is the Dreadnought** (Oct 8), staying military. It comes forward from behind the page, and the fight has the feel of the airship stages in Super Mario Bros. 3: the ship is bigger than the page and slides past overhead while you fight it section by section, to its own ominous march. The music is original, in that spirit, not that theme.
- **What the Dreadnought destroys stays destroyed** for the rest of the run, which matters in endless; the shop sells it again.
- **One best score,** plus runs won and best wave. A separate endless board waits for online scores.

## The waves

**Built** marks what's in the game now; the rest is planned. Waves not listed keep the mix before them, growing.

| Wave | What arrives | Notes |
| --- | --- | --- |
| 1–4 | planes, bombers (2), snipers (3) | built |
| 5 | **boss:** zeppelin | built: arrives at 9 s after a horn |
| 6 | rushers | built |
| 8 | **new:** HQ airdrops | planned. A friendly blue crate on a chute now and then; pop it low over a mat to catch it for tags, a wall patch or a free call. Shoot it and it's lost. |
| 9 | tanks by cargo plane, HQ air strike | built |
| 10 | **boss: armored zeppelin**, armored troopers | Armored troopers built (heavy armor from 14). The armored zeppelin is planned: grey plates over the hull that clang until shot off, the gondola plated until half health, two escort planes close by. |
| 11 | **new: tanks by road** | built: some tanks roll in from the page edge, so they can't all be stopped in the air |
| 12 | **new: dive bombers** | planned. A siren, then a steep dive at the bunker with one heavy bomb at the bottom. Two hits down it mid-dive; or shoot the bomb. |
| 13 | **new: helicopters** | planned. Hover near an edge and lower three or four troopers on ropes, no chutes (so no catches). A door gunner shoots at crew. Four hits. |
| 14 | the big push | everything so far, at full strength |
| 15 | **final boss: the Dreadnought** | built; see below |
| 16+ | endless | everything mixed; twin zeppelins and a night raid are candidates here |

## The final boss

**The Dreadnought.** The enemy's flagship, a huge armored airship in red-pen colors, the big brother of the zeppelins.

- **It comes forward from behind the page.** First its outline shows faintly through the paper, mirrored, like ink bleeding through from the back of the sheet. It grows and darkens as it comes closer, then the paper buckles and it bursts through in full ink, with a tearing sound, scraps of paper and a shake. It can't be hurt until it's through.
- **It's bigger than the page.** The hull slides slowly overhead, stern first, so its guns come into range a section at a time, ending at the bridge near the bow. If guns are still firing when it reaches the end, it backs up and comes again.
- **Its guns mark a target, then fire.** Each gun turret hangs under the hull. When one is over the page and loaded, it picks a target: a soldier, the sentry tower, the wire, a trench row, the second mat or a chunk of wall. A red smoke flare marks the target for about two seconds while the gun turns to it, then it fires a heavy shell. Knock the turret out in time and the shot never comes; miss it and that target is destroyed for good.
- **Its belly drops troops** through the fight, so catches still matter.
- **With the guns gone, the bridge is exposed.** A klaxon sounds, the ship turns angry, the bomb bay opens and drops clusters at the bunker, and the ship moves to bring its bridge over the page. Its armored bridge car can now be hurt.
- **Going down,** explosions run along the hull and it falls back through the page in flames. Every enemy left on the page surrenders, and the victory card follows.
- Air strikes and fighter cover work on it; bazookas, rockets and flak hit hard. Its hull is armored: hits elsewhere clang. A gun that's aiming has its muzzle open and takes extra damage, so quick, focused fire saves its target.
- **Its health shows at the top of the page:** a pip for each gun and a bar for the bridge, under its name.
- **Its own music:** an original ominous march, low brass over pounding timpani, that replaces the drums for the fight and builds when the bridge is exposed.

## Victory and endless

- **Victory card:** "The page is yours!", the score, time played, waves, zeppelins and tanks downed, then the roll call. Buttons: **Keep going** and **Play again**, plus Back to games.
- **Keep going** opens the shop as after any wave and continues from wave 16. A small "endless" tag shows under the wave number.
- Endless waves mix every threat. Every fifth wave is a boss, cycling the zeppelin variants, with the Dreadnought returning every tenth.
- **Saved locally:** best score (one, across both), runs won, and best wave. The title card shows "Won N times" once you've won.
- Online scores remain later work. If they come, wins and endless waves fit a separate board per [the leaderboard guide](../docs/guides/00-leaderboards.md).

## Difficulty to wave 15

- Retune `waveCfg` so 10–14 press harder: planes tighten from wave 9, bombers grow from 10, armored troopers from 10 (heavy from 14), tanks by road from 11, two cargo planes a wave from 11. Crew repairs are slower (engineers 4 HP/s, others 2), so damage sticks.
- Watch the economy. Bots earn 400–700 tags a wave by wave 12 and buy everything on offer, so tags stop mattering late; if playtesting agrees, late kills pay a little less, or late supplies cost a little more.
- Each stage below ends with a bot run (decent, `--ref main`) and a playtest. The bots learn each new threat as it's added.

## Squad attachment

- `r.kills` per recruit: kills from his own bullets and rockets.
- Shown on promotion ("Cpl. Inky! 85 kills"), in the shop news, on the pause card ("Sgt. Doodle (12 waves, 140 kills)"), in the fallen list and on the roll call.
- The roll call names the top gun.

## Build stages

Do these in order and playtest after each.

1. **The ending** (built): the Dreadnought, the victory card and roll call, kill counts, endless, saved wins, tanks by road and the difficulty retune to 15.
2. **Boss variety:** the armored zeppelin (10).
3. **New threats:** dive bombers (12), helicopters (13), HQ airdrops (8).
4. **Endless extras:** twin zeppelins and a night raid, the riskiest for readability, last.

Each stage updates `docs/games/stick-army.md`, the harness (`tests/stick-army/`), the bot and adapter, and the What's new note if a board exists by then.

## Open questions

The first six were answered on Oct 8; see Decisions. Playtesting may reopen the win targets and the night raid. New from the second playtest, not decided yet:

1. **Balloons:** barrage balloons or bomb balloons as another enemy type.
2. **Things you shouldn't shoot:** a target with a penalty for hitting it, such as a Red Cross plane or HQ's supply crates.
3. **Little voices:** the soldiers barking short lines (calling in the radio, "medic!", cheering a promotion).
