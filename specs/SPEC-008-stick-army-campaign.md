# SPEC-008: Stick Army campaign

Twenty waves, four bosses, a victory screen, then optional endless play. Something new arrives on most waves on the way, and each boss wave is different.

Status: stages 1–4 are built (the ending, the armored zeppelin, the new threats, twin zeppelins and the night raid), with the second to fifth playtests' changes; an outside playtest is next, and a full audio pass is planned. Builds on [SPEC-002](SPEC-002-stick-army.md); current behavior is in [Stick Army](../docs/games/stick-army.md), and difficulty is measured with the [balance bots](SPEC-005-balance-bots.md).

## Why

Playtest on Oct 8: wave 14 at 8 minutes 30, still feeling strong and willing to keep going, but "the variety seemed to die out". Nothing new appeared after wave 12 (armored troopers). Tanks never landed: waves 9–14 sent one or two cargo planes each, and a good kit downs them before the drop. Zeppelins go down fast. Runs had no ending except losing, and decent bots lasted to about wave 28, roughly 24 minutes of fighting.

A second playtest the same day reached wave 16 at 11:02: "very fun", but "by 12 or so I was just destroying". Fifteen waves seemed the right length. The fourth playtest lost to the Dreadnought at wave 15 at 11:10 and asked for 20 waves, with the new things brought in sooner.

## Decisions

- **A run is 20 waves** (Oct 8, fourth playtest; it was 15): about 15 minutes at the owner's pace, shop included. Four bosses: a zeppelin at 5, the armored zeppelin at 10, two zeppelins at once at 15, and the Dreadnought at 20. Beating the Dreadnought wins the run.
- **Winning is a real moment:** a victory card with the score, the time, and a roll call of the squad (who made it, their ranks and kills, and the fallen).
- **Then endless, if you want it.** "Keep going" continues from wave 21 with the same squad and kit. Pressure keeps rising and bosses repeat: two zeppelins on the fives (25, 35…) and the Dreadnought on the tens (30, 40…). Score keeps counting.
- **Something new on most waves up to 17,** each introduced with its own banner line. Then the big push (19) and the Dreadnought. After 20 they mix.
- **The run-up should be a fight.** Waves 10–19 bring more and stronger enemies, so the run ends with tension, not a rout. Targets with the bots: decent wins about a third of runs, expert about two thirds, casual rarely. Playtesting has the final say.
- **Squads become more personal.** Each soldier keeps a kill count, shown on promotion, in the shop news, the pause card, the fallen list and the roll call.
- **The final boss is the Dreadnought** (Oct 8), staying military. The fight has the feel of the airship stages in Super Mario Bros. 3: the ship is bigger than the page and you fight it section by section, to its own ominous march. The music is original, in that spirit, not that theme. After the third playtest ("rather boring", "it could look a lot cooler") it sails in from the side instead of through the page, looks busier, and fights in three faster stages.
- **What the Dreadnought destroys stays destroyed** for the rest of the run, which matters in endless; the shop sells it again.
- **One best score,** plus runs won and best wave. A separate endless board waits for online scores.
- **If Stick Army gets a leaderboard** (Oct 8), its score is the score when the Dreadnought goes down on the final wave (20), or at game over for a run that lost before that. Endless points don't count toward it. Endless keeps ramping regardless.
- **From the second playtest** (Oct 8, all built): bomb balloons, a Red Cross plane that costs tags to hit, HQ crates, and little voices.
- **From the third playtest** (Oct 8: "overall fun, but I beat it pretty easily", "could just hold down fire"; all built):
  - Waves 10–15 are harder, and spraying costs more: more Red Cross planes with a bigger penalty, and a gun that runs hotter late (dropped after the fourth playtest).
  - The voices say real words, with speech bubbles; they were "just bloop bloop bloop". (The words stayed in the bubbles; the speech went after the fourth playtest.)
  - HQ crates arrive by a fly-by drop that always lands, since a stream of fire popped every chute.
  - The Red Cross plane is easier to spot, and its penalty is easy to see.
  - Dive bombers are easier to read, and helicopters are quicker.
  - Tanks land: cargo planes are armored, and a tank on its chutes shrugs off bullets.
  - The shop lets you put things back.
  - A full audio pass is left for the end of the campaign work.
- **From the fourth playtest** (Oct 8: lost to the Dreadnought at wave 15; "we introduce too many new things too late", "waves 1 to 4 were meh"; all built):
  - 20 waves, with the new things sooner: balloons at 4, the Red Cross plane at 6, helicopters at 7 ("ineffective late"). Waves 1–4 are busier.
  - Two new threats for the back half: heavy bombers (13) and a night raid (16). Two zeppelins at once at 15.
  - The gun's heat per shot stays the same all run: "id rather it not get worse while at the same time im buying cool downs".
  - The browser's speech is gone ("the default one sounds terrible"); speech bubbles stay, with the gibberish chatter under them.
  - The Dreadnought's guns blow apart and leave a hole when knocked out.
  - Hires can be sent back from the shop, and the medic no longer pops into the list after a hire fills the squad.
- **From the fifth playtest** (Oct 8: "wave 13 - so far very fun", but nothing touched the wall from 13 to 19, 6,500 tags unspent by 19, then "dreadnought PWNED ME like no hope", "hard to react"). A balance round, with no new enemies:
  - Prices rise as the war drags on (after wave 6), soldiers most, so the shop makes you choose late and catching recruits matters again. Pizza stays cheap: "sometimes u just want pizza".
  - Late waves arrive together and build to a peak instead of trickling in; planes carry more troopers; heavy bombers come in pairs from 16; a zeppelin's escort keeps coming while it flies.
  - The Dreadnought's guns aim one at a time while most stand. Tuned for a person on a wave-20 practice page, since the bots react instantly: 1.5 s aims with slow reloads were "way too easy", so each aim is 1.2 s, reloads about 2 s (one gun nearly always aiming) and shells hit the wall for 14.
  - The Dreadnought builds up: it announces itself off the page (horn, rumbling, smoke, searchlights reaching in) before sailing in slowly.
  - From the practice page ("thematically exciting but still a little bland"): the final wave opens with a teaser, an ordinary zeppelin to thin music, then "that's it?", a hush, and the real one. It never idles in the guns stage (deck guns, guns brought to bear, faster reloads as they're lost); a chain of explosions marks the last gun; the lights go out while the hangar launches dive-bomber sorties that make real runs at the wall; crew bail out firing as it takes damage; and in the bridge stage it sinks and lists as the bridge is hurt (a ramming run was tried and dropped: it pounced). After the next practice run: the teaser builds tension before the decoy, the Dreadnought comes in slower with a clear cue when it can be hurt, sortie bombs are armored, and the klaxon sounds like one. Then: the decoy has 75% of a zeppelin's health and creeps in ("oh no, here it is!"); the Dreadnought's arrival is the payoff (its name across the page, a brass sting, "...oh."); sorties come back screaming straight down; and the bridge stage gets a main gun that charges at the bunker (hit the muzzle to stop it) and boarders sliding down ropes. After that ("ok that was fun"): beaten, it no longer just disappears off the bottom of the page but crashes across the field, breaks its back and smolders behind the victory banner; the main gun, "hard to notice" under the bow, is a big turret amidships that swings down into view and makes its charge unmistakable; the klaxon blares four times; and its name no longer crowds the radio's call chips.
  - Small things: the Red Cross plane pays for safe passage; wall damage taken shows per wave and per run, with a bonus for an untouched wave; the calls held show in the HUD (no pulsing); "Patch the wall" isn't offered with the wall full; the medic shows greyed with "Have one".
  - Left for after an outside playtest: a "bring it on" difficulty you can buy, new late-game supplies, a campaign pick at the start, and the audio pass.

## The waves

**Built** marks what's in the game now; the rest is planned. Waves not listed keep the mix before them, growing.

| Wave | What arrives | Notes |
| --- | --- | --- |
| 1–3 | planes, bombers (2), snipers (3) | built; busier since the fourth playtest |
| 4 | **new: bomb balloons** | built. They drift to the bunker and drop a bomb on it. Popped anywhere else, the bomb falls there: on the enemy, or on your crew. |
| 5 | **boss:** zeppelin | built: arrives at 9 s after a horn |
| 6 | rushers, **new: the Red Cross plane** | built. A white plane with a blinking light and a Red Cross pennant crosses slowly; your turret's first hit costs 30 tags (50 from wave 12) and your combo, and you see the tags fly out of the counter. The crew never shoot it. Two a wave from 12, three from 17. |
| 7 | **new: helicopters** | built. Fly in fast, hover near an edge and quickly lower four or five troopers on a rope, no chutes. A door gunner shoots at crew. Armored, with a bar; down it and anyone on the rope falls, onto a mat for a catch. |
| 8 | **new:** HQ airdrops | built. A blue HQ plane flies low and drops a crate beside the bunker: tags, a wall patch or a free call. Nothing can shoot it, and a soldier runs out to fetch it. |
| 9 | tanks by cargo plane, HQ air strike | built. Cargo planes are armored, and tanks on their chutes shrug off bullets, so some land. |
| 10 | **boss: armored zeppelin**, armored troopers | built. Steel plates cover the hull and clang until shot off; the gondola is plated until half health. |
| 11 | **new: tanks by road** | built: some tanks roll in from the page edge, so they can't all be stopped in the air |
| 12 | **new: dive bombers** | built. A red crosshair marks where it's aiming, then a howl and a steep dive at the bunker with one heavy bomb at the bottom. Three hits down it; or shoot the bomb. |
| 13 | **new: heavy bombers** | built. Big, slow and armored, with a health bar; each lays a long carpet across the field with a heavy bomb on the bunker. Downed, the rest of the carpet never falls. |
| 15 | **boss: two zeppelins at once** | built. From both sides at two heights, each lighter than one alone, both armored. |
| 16 | **new: the night raid**, heavy bombers in pairs | built. The page goes dark; your searchlight follows the barrel, explosions and burning planes light the page, planes show their lights. Drawing only. |
| 17 | heavy armor | built: armored troopers' vests stop two hits |
| 19 | the big push | everything so far, at full strength, arriving together; two pairs of heavy bombers |
| 20 | **final boss: the Dreadnought** | built; see below |
| 21+ | endless | built: everything mixed, counts climbing to their caps; two zeppelins on the fives, the Dreadnought on the tens, a night raid on 26, 36… |

## The final boss

**The Dreadnought.** The enemy's flagship, a huge armored airship in red-pen colors, the big brother of the zeppelins: three spinning propellers, smokestacks pouring smoke, a conning tower, the enemy flag, lit portholes, "DN-1" on its red nose, and two searchlights sweeping the ground.

- **It sails in from the side,** bow first, with its horn, and can't be hurt until it takes station. It's bigger than the page, so only part of it is ever over you.
- **Stage 1, the guns.** It patrols back and forth so its four underside gun turrets take turns over the page. A loaded gun aims for under a second (its barrel glows, crosshairs mark the ground), then fires a volley of three shells, kicking back with each. They hurt the wall and anyone close; the middle one puts a targeted soldier down, wounded, or destroys targeted gear for good: the sentry tower, the wire, a trench row, the second mat or the tent. Knock the gun out while it aims and the volley never comes ("saved!").
- **Stage 2, the hangar.** With the guns gone, a klaxon sounds and the hangar in its belly opens. It launches dive bombers and drops troops until the hangar is shot to pieces.
- **Stage 3, the bridge.** The bridge car under the bow is exposed and the ship turns angry. The gutted hangar drops bomb clusters at the bunker, a gunner on the bridge fires at the crew, and boarders slide down ropes. A main gun lowers out of its belly over the bunker and charges at it, glowing hotter with a target closing on the bunker; hit the glowing muzzle to knock it off target. As the bridge is hurt the ship sinks and lists, bow down.
- **Going down,** it falls bow first, burning, digs its bow into the ground, and the hull slams down across the field and breaks its back. Every enemy left surrenders. The wreck burns and smolders behind the victory banner, and the victory card follows.
- Air strikes and fighter cover work on it; bazookas, rockets and flak hit hard. Its hull is armored: only the stage's part can be hurt. A gun that's aiming takes double damage, so quick, focused fire saves its target.
- **Its health shows at the top of the page:** a pip for each gun, then bars for the hangar and the bridge, under its name.
- **Its own music:** an original ominous march, low brass over pounding timpani, from the moment it sails in, building from the hangar stage.

## Victory and endless

- **Victory card:** "The page is yours!", the score, time played, waves, zeppelins and tanks downed, then the roll call. Buttons: **Keep going** and **Play again**, plus Back to games.
- **Keep going** opens the shop as after any wave and continues from wave 21. A small "endless" tag shows under the wave number.
- Endless waves mix every threat. Every fifth wave is a boss: two zeppelins on the fives, the Dreadnought on the tens.
- **Saved locally:** best score (one, across both), runs won, and best wave. The title card shows "Won N times" once you've won.
- Online scores remain later work. If they come, wins and endless waves fit a separate board per [the leaderboard guide](../docs/guides/00-leaderboards.md).

## Difficulty to wave 20

- `waveCfg` presses harder from 10 to 19: planes tighten from wave 9 to a 0.3 s gap by 21, bombers grow from 10, armored troopers from 10 (heavy from 17), tanks by road from 11, more cargo planes every three waves. Crew repairs are slower (engineers 4 HP/s, others 2), so damage sticks. The gun's heat per shot never changes.
- Watch the economy. Bots earn 400–700 tags a wave by wave 12 and buy everything on offer, so tags stop mattering late; if playtesting agrees, late kills pay a little less, or late supplies cost a little more.
- Each stage below ends with a bot run (decent, `--ref main`) and a playtest. The bots learn each new threat as it's added.

## Squad attachment

- `r.kills` per recruit: kills from his own bullets and rockets.
- Shown on promotion ("Cpl. Inky! 85 kills"), in the shop news, on the pause card ("Sgt. Doodle (12 waves, 140 kills)"), in the fallen list and on the roll call.
- The roll call names the top gun.

## Build stages

Do these in order and playtest after each.

1. **The ending** (built): the Dreadnought, the victory card and roll call, kill counts, endless, saved wins, tanks by road and the difficulty retune (to 15, then 20).
2. **Boss variety** (built): the armored zeppelin (10). The two close escort planes were left out: the plates alone make it a longer fight.
3. **New threats** (built): dive bombers (12), helicopters (7), HQ airdrops (8), with bomb balloons (4), the Red Cross plane (6) and little voices from the second playtest.
4. **More for the back half** (built after the fourth playtest): heavy bombers (13), two zeppelins at once (15) and the night raid (16), moved into the run from endless.

Each stage updates `docs/games/stick-army.md`, the harness (`tests/stick-army/`), the bot and adapter, and the What's new note if a board exists by then.

## Open questions

All answered on Oct 8; see Decisions. Playtesting may reopen the win targets and the night raid's readability.

The second playtest's three ideas are built: bomb balloons (wave 4); things you shouldn't shoot (the Red Cross plane from wave 6, and HQ's crates); and little voices, gibberish chatter in each soldier's own pitch under speech bubbles for radio calls, "medic!", promotions, cheers and the enemy charging.
