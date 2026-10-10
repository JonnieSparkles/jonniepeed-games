# Stick Army: history

What changed in each round and why, newest first: the playtest notes, what was tried and dropped, and what the balance bots found. The game as it is now is in [README.md](README.md); the plans these rounds built are [spec.md](spec.md) and [campaign.md](campaign.md). Rounds are numbered as in the pull request titles. (The bot results used to number rounds 10 to 13 one ahead; they're renumbered here to match.)

## Round 16 (#59, #60, #61; Oct 9–10)

Playtests after the polish pass.

- **The flagpole** ("a flag pole that goes up... it boosts morale"), a supply sold once a run, from wave 8 ("the flag should not be available until wave 8"). The salute is held 2 s, not 1.4 s, after the preview found it hard to see, and was redrawn: the old salute's hand hid in the head and it "isn't obvious". The pole moved from the bunker's right back corner, where the flag flew over the sentry gun, to the left.
- **Sound back to the original in-game sounds** (#60), undoing three of round 15's changes: every voice line sounds the same again ("everything was kind of different but similar enough"), the march no longer thins and fills with how busy the page is ("there's a lot going on"), and every falling bomb has the one whistle again.
- **The mats on either side:** the starting mat is on the left or the right, picked from the run seed ("the starting trampoline always starts on the left. That should probably swap sides randomly").
- **The Red Cross record** ("I'd rather it say Red Cross survived, so like 3 out of 8 ... if you got a perfect 8 out of 8 survived, you get ... a bonus"). One still crossing now holds the wave open: a wave could end with one in the air, and it vanished without its points.
- **The squad talks the Dreadnought in** the whole way ("spread the banter out ... the entire time the dreadnought's coming out ... goad it"). Before, "...oh." and two more came at the banner and the last 10 s of the sail-in were quiet.
- **The smoke screen lingers** ("the smoke could probably last like twice as long"). Before, it cleared as soon as the hangar went, so a strong build blew it away fast.
- **Road tanks with the rush** ("a couple tanks straggling that kind of roll in, and you're like, what are you doing here, man?"). From round 14 they came at 7 s and every 8–12 s, but a tank takes about 13 s to drive in, so on wave 17 the last pair still arrived at about 31 s, after the planes (about 26 s). Now the first comes at 4 s and the rest every 5–7 s, and the last pair arrives at about 22–25 s.

**Bots.** 60 seeds a skill against round 15: nothing changed beyond noise. Decent: median wave 13 both, 1 win in 60 both, alive at wave 18 20% (35%). Expert: median 13.5 (13), 8 wins in 60 both, alive at wave 20 33% (27%). `--verify` matched on 6 runs. The bots play either mat side as well as the other; the playtest said the late game is too easy once spread shot and cooldown are in, and the tougher Dreadnought idea (spread shot glancing off it) waits on playtesting these changes.

## Round 15: the polish pass (#58, Oct 9)

- **The title is the page itself** ("it needs to be more engaging, especially in comparison to Thimbleful and Crack"): the logo, a live demo, pencil notes, the record stamp and the chips, and on wide screens the open notebook with Orders from HQ on a post-it.
- **The online board** (board 1).
- **The cards:** buttons right under the score, and every card scrolls; with a full squad the game-over card used to push Play again off a phone's screen. The pause card's squad line was shortened from waves and kills for each, which ran long on phones, and shows the kit as icons.
- **Landscape:** the round buttons moved beside the page instead of taking a strip under it, so the page is as tall as the screen allows (on an 844×390 phone, 366 px tall instead of 314).
- **Sound**, after an outside audio audit, with the picks made on a sound-check page:
  - The mix level went up to 0.8, since phones played it quietly. A compressor node was tried and squashed short hits.
  - Muting stops a long sound already playing; it used to only stop new ones.
  - The noise source went from 0.6 s, which cut the noise out of every longer sound (the Dreadnought's rumble and entrance, the heavy bomber's drone, the air strike, the zeppelin going down, the overheat hiss), to 3 s.
  - A line that would overlap another waits for it. Before, any line within 0.2 s of another was silenced, alarms included.
  - Title music, and the Dreadnought's crash carries to the end of the wave (the wave's own march used to come back).
  - The paper tear (`rip`) was never used and went.
  - Three changes undone in round 16: each mood had its own sound (alarms said twice, radio calls through a walkie-talkie, softer small talk), the march thinned out when the page was quiet and filled in when it was busy, and each kind of bomb had its own whistle (a slide whistle for balloons, a deep scream for heavy bombs, three whistles for a cluster).

**Bots.** The game was unchanged and the bot fixed (40 seeds a skill against the old bot): the bots had a blind spot. They ranked a zeppelin below every chute, so on a zeppelin wave they often left it while troopers kept falling, and since a zeppelin's escort keeps coming while it flies, a quarter of expert runs died on wave 5 in waves that ran three minutes (one seed: 154 troopers and 45 planes). A zeppelin now comes before planes and high chutes, as a player would take it.

| Skill | Won | Alive at wave 6 / 10 / 20 |
| --- | --- | --- |
| decent | 0% → 2% | 62 / 52 / 15% → 80 / 62 / 22% |
| expert | 5% → 15% | 72 / 57 / 30% → 78 / 68 / 28% |

The bots still rarely win: the Dreadnought was tuned for a person (round 12), and landers and bombs end most runs between waves 9 and 17. Nothing was changed to move those numbers; playtesting decides.

## Round 14: after the first win (#53, Oct 9)

The first win: wave 20 in 15:52 for 446,661, "its perfect - some last tweaks before we go to polish". A second win the same day (wave 20 in 18:50 for 435,479, "wasnt tooooo hard i won") added a second pass, and the practice page a third.

- **The fighting stays on the page.** The sixth playtest saw "a decent amount of offstage combat", and a fifth of the planes the bots downed, a third of the balloons, still had their middle off the page, mostly to flak bursts and rockets reaching past the edge. Holding every plane off until its middle was over the page was tried first: it gave each one a free half second and made the game clearly harder for the bots (decent bots alive at wave 20 fell from 34% to 17%). Instead nothing is hit where you can't see it, and bombers hold their bombs until they're over the page (17% of their bombs used to come from off it). Planes and cargo planes no longer going down before they show still meant more bombs and tanks: over 200 seeds the bots' bomb damage to the wall rose about a sixth and fewer reached wave 10. So a bomb on the wall went from 18 to 16, which brings waves 6 to 16 back to about where the sixth playtest left them.
- **Nothing of consequence above the page's top rule** (the second win: "nothing 'of consequence' flies above that line. ambient things are no problem"). The high lanes moved down: planes from 98 to 120, bombers from 104 to 130, zeppelin escorts from 98–118 to 120–130, heavy bombers from 136–160 to 148–168, dive bombers from 112 to 124. The air strike flew at 92, over the score, and now flies at 130; fighter cover swoops in from 50 px above its lane, not 70; departing helicopters climb to 126, not 80; dive bombers level off at their lane as they climb away. The twin zeppelins' gap went from 48 to 34 px and the zeppelin's height from 172 to 180, so the high one's bar stays below the rule.
- **Dive bombers let go at 320, not 392:** the sixth playtest couldn't tell whether they did anything, and for the bots about half were shot down before letting go and half the bombs were popped, so only a quarter landed one. A dive bomb on the wall says "direct hit!".
- **Low helicopters** ("should release guys earlier quicker") let their troopers out in quick succession soon after they come in. They used to be spread across the whole page, the door gunner firing all the way, and out the other side.
- **Heavy bombers are about an eighth tougher:** `50 + 3.5 × (n − 13)`, from `45 + 3 × (n − 13)`.
- **The Red Cross plane** ("red cross = more points/more penalty") is worth a wave bonus in points across and costs as much hit, with half again the tags. It used to pay 200 points and half the tags, and a hit cost only the tags.
- **Sandbags are drawn** against the front of the bunker. Until then they drew nothing; piled against its sides, as first tried, the crew standing there hid them.
- **The shop shows the squad** ("show squad status on store").
- **A long score shrinks** to stop short of the wave label: six digits ran into "wave 10".
- **Rounds fired** on the end cards ("shots fired would be a fun stat").
- **Small talk**, the sixth playtest's easter eggs ("just more small talk"): the squad chats in quiet moments, about the night raid and an overheated gun, and on making Master Sergeant.
- **Road tanks from 7 s,** while the planes are still coming, and every 8–12 s. They used to come at 11 s and every 11–16 s: on wave 17 the last pair rolled in as the planes ran out, at about 27 s, and the wave dragged on to about 50 s against tanks alone ("they just need to be more impactful").
- **The Dreadnought** flies a little lower, at 210, not 196 ("a liiiitle lower"). Its sorties come back level from the side; until then they came back already diving from high above the page, through the score.
- **The decoy's cardboard armor** holds for four knocks before it falls, where you can see it. Until then the first hit knocked it off, and that could land before it was in sight. The armor moved out toward the nose, since the sign's last letters sat over ARMOR. From the practice page after that: the soldier's "Oh no, here it is!" as it came into view was lost under the banner, so "Oh no... here it comes!" comes just before it shows; and it goes down without "zeppelin down!", which stepped on the joke.
- **Sneak attacks under the smoke** ("during nought smoke screen bring in some ground sneak attacks").
- **The last hurrah** ("when the nought is down to the bridge only, its pretty much over... just thinking a last hurrah"): "abandon ship!" at a third of the bridge's health, then its captain last out under his own chute, to catch on the mat as a prisoner for a big bonus, shoot down for a small one, or let get away. The jumpers come one at a time in two waves ("at least 2 waves of people jumping... stagger person by person not all at once"); at first eight jumped at once. A ramming run was turned down: it could take a won run on a sliver of wall.

**Bots.** After the first win and the second pass after the second, 200 seeds a skill, against the sixth playtest's build (round 13):

| Skill | Won | Alive at wave 10 / 13 / 16 / 20 |
| --- | --- | --- |
| decent | 1% → 0% | 60 / 55 / 49 / 34% → 57 / 55 / 45 / 20% |
| expert | 18% → 12% | 64 / 61 / 56 / 46% → 64 / 58 / 52 / 39% |

- **Keeping the fighting on the page made the game harder.** Planes, balloons and cargo planes had been going down before they showed, so more bombs, troopers and tanks now arrive. Holding every plane off until its middle was over the page cost the decent bots half their wave-20 survival (34% to 17%); hitting them where they show cost less. Bombs on the wall doing 16 instead of 18 bring waves 6 to 16 back to about where they were.
- **Waves 16 to 19 are harder, as asked:** heavy bombers are about an eighth tougher and dive bombers get their bomb off more often. For decent bots in waves 12 to 19, heavy bombers do about 15 to the wall a wave (11 before) and dive bombers 18 (15).
- **Road tanks from 7 s land harder without making the run harder:** on wave 17 their wall damage rose from about 9 to 14 a wave for decent bots (5 to 10 for expert), and an expert's wave 17 ends at about 37 s rather than 50, the last pair arriving at about 18 s instead of 27. The lower lanes and the sneak attacks left survival where it was.
- **The last hurrah barely moves the bots:** 26 or 27 of 400 runs win either way (the ship's own dice fall differently, so a few different seeds win); abandon ship comes in 67 runs that reach the bridge's last third, and the captain adds about 1,500 to a winner's score on average (the bots mostly shoot him down).
- `--verify` matches on 15 runs.

## Round 13: the sixth playtest (#50, Oct 9)

A full run: wave 20 in 14:13, lost to the Dreadnought, "it didn't feel unfair"; "i had a stacked squad but not many engineers". More variety:

- **A low lane** of planes from wave 2 and bombers from 3: the playtest asked for low drops and bombers early on.
- **Low heavy bombers,** and **low, fast helicopter runs** from either side.
- **Tanks** in pairs from wave 13, with heavier shells (12 every 3.2 s; it was 8 every 3.6) and a machine gun, and from 12 half of them as tank raids with infantry: the playtest asked for tanks in pairs, stronger weapons and raids with troops.
- **More Red Cross planes:** two a wave from 9 and three from 14 (it was 12 and 17).
- **The night raid dark across the whole page,** the HUD bands too ("full notebook dark"), with the HUD in chalk.
- **The squad still standing on the game-over card:** the playtest lost at wave 20 with a stacked squad the card didn't show.
- **The decoy** gets cardboard armor and the full announcement ("its entrance needs a little more attention"; "it's hysterical"), and the real one is then "the REAL enemy flagship".
- **Enter fires** as well as Space.
- Small things: the Red Cross plane pays for safe passage; wall damage taken shows per wave and per run, with a bonus for an untouched wave; the calls held show in the HUD (no pulsing); "Patch the wall" isn't offered with the wall full; the medic shows greyed with "Have one".

No bot run of its own; round 14's compare against this build.

## Round 12: the fifth playtest and the practice page (#47, Oct 9)

"wave 13 - so far very fun", but nothing touched the wall from 13 to 19, 6,500 tags went unspent by 19 with nothing left to buy, then "dreadnought PWNED ME like no hope", "hard to react". A balance round, with no new enemies:

- **War prices:** prices rise as the war drags on (after wave 6), soldiers most, so the shop makes you choose late and catching recruits matters again. Pizza stays cheap: "sometimes u just want pizza".
- **Late waves arrive together** and build to a peak. Before, the planes were done in about 20 seconds on wave 19 and the rest trickled in one at a time for another 30. Planes carry more troopers, heavy bombers come in pairs from 16, and a zeppelin's escort keeps coming while it flies (the armored one had been lingering by itself).
- **The Dreadnought's guns aim one at a time** while most stand. It's tuned for a person on a wave-20 practice page, since the bots react instantly: 0.9 s with two guns aiming and 16 to the wall was impossible to react to, and 1.5 s aims with 3–3.5 s reloads and 12 to the wall were "way too easy", so each aim is 1.2 s, reloads about 2 s (one gun nearly always aiming) and shells hit the wall for 14.
- **The Dreadnought builds up:** it announces itself off the page (horn, rumbling, smoke, searchlights reaching in) before sailing in slowly. The old entrance (2 s in, 90 px/s) had no build-up.
- **The mute button's icon changes** with the sound; until then it never did, so the button looked broken.

From the practice page ("thematically exciting but still a little bland"): the final wave opens with a teaser, an ordinary zeppelin to thin music, then "that's it?", a hush, and the real one. It never idles in the guns stage (deck guns, guns brought to bear, faster reloads as they're lost); a chain of explosions marks the last gun; the lights go out while the hangar launches dive-bomber sorties that make real runs at the wall; crew bail out firing as it takes damage; and in the bridge stage it sinks and lists as the bridge is hurt (a ramming run that stepped down and slammed the bunker was tried and dropped: it read as pouncing).

- After the next practice run: the teaser builds tension before the decoy, the Dreadnought comes in slower with a clear cue when it can be hurt, sortie bombs are armored (the sentry and flak had popped every one), and the klaxon sounds like one.
- Then: the decoy has 75% of a zeppelin's health and creeps in ("oh no, here it is!"); the Dreadnought's arrival is the payoff (its name across the page, a brass sting, "...oh."); sorties come back screaming straight down (before, they dropped out of the hangar into a short, shallow dive and never threatened the wall); and the bridge stage gets a main gun that charges at the bunker (hit the muzzle to stop it) and boarders sliding down ropes, with the bomb bay slowed from every 3 s to every 4.5 s to make room.
- After that ("ok that was fun"): beaten, it no longer just disappears off the bottom of the page but crashes across the field, breaks its back and smolders behind the victory banner; the main gun, "hard to notice" as a thin barrel under the bow at the page's edge, is a big turret amidships that swings down into view and makes its charge unmistakable; the klaxon blares four times; and its name no longer crowds the radio's call chips.
- Then ("fun!"): the decoy wears a janky "DREDNOUGHT" sign, the enemy trying to pull a fast one, that flutters off when it goes down; a padlock after its name replaces the "armored: can't be hurt yet" line that ran into its mast and conning tower; and the main gun, "not clear if u could damage it" (out all stage but hurt only while it glowed, with a thin ring for progress and no health bar), is a part like the guns with its own health bar, double damage while it glows, and gone for good when destroyed.
- Then ("pretty much perfect"): the real one waits until the decoy's sign has landed, and the main gun is tougher. The dark during the hangar stage, "a little random", becomes a smoke screen: smoke bombs burst under the ship and the smoke rolls across the page, then blows away when the hangar goes down.
- After that ("very fun!"): the stages are separated by dramatic pauses (it reels, the music holds its breath, then a klaxon), since they followed each other too fast; the smoke screen is laid deliberately, by smoke pots fired onto the field that pour smoke and sputter out, since bombs bursting in the air weren't deliberate enough; the main gun is tougher again (about three guns' health: at two it still got off only one shot) and fires sooner and more often, and its hit is the biggest in the game; the ship passes in front of its gauges; and the air strike and fighter cover come in from either side.
- Last polish ("nice! i think we can keep it there"): "that was lame" as the decoy's sign comes down, and the real one's approach has no callout of its own: a red "the Dreadnought is coming!" and then its name across the page said the same thing twice, so its name is the one notice.

**Training** (Oct 9, from the practice page: "or we make it more possible to have a stacked squad by 20"; also "could have like a boot camp, special forces, training"). The bots reached wave 20 with every supply maxed, 4,000–5,000 tags unspent and two thirds of the squad rookie replacements. Stripes go to five (Staff Sergeant at 14 waves served, Master Sergeant at 18). Two levels of training, in the shop's rotation like any supply: **Boot Camp** (from wave 5) gives everyone in the squad a stripe and every new soldier, hired or caught, starts with one; **Elite Training** (from 10, after Boot Camp) gives everyone one more and new soldiers start with two. Same stripes as service, no new abilities. The soldiers who've been there longest ("og" squad members, "they've been through the shit") always have the most, since service and training add up. Special forces is held back as a name for something unique later.

**Bots.** Balance only (war prices, zeppelin escorts, late waves that arrive together, more troopers a plane, heavy bombers in pairs, a slower-aiming Dreadnought, the Red Cross plane's safe passage, wall damage taken, calls in the HUD), 40 seeds per skill, beside round 11:

| Skill | Won, round 11 → round 12 | Alive at wave 10 / 13 / 16 / 20, round 12 | How round 12 runs end |
| --- | --- | --- | --- |
| casual | 0% → 0% | 32 / 17 / 7 / 2% | bombs 20, landers 14, balloons 2, heavy bombers 2, a sniper 1, a helicopter 1 |
| decent | 35% → 45% | 67 / 57 / 57 / 45% | won 18, bombs 15, landers 6, a heavy bomber 1 |
| expert | 52% → 55% | 65 / 60 / 57 / 55% | won 22, landers 10, bombs 7, a balloon 1 |

What the playtest and the bots found:

- **The playtest's curve was a cliff:** waves 13–19 never touched the wall, then the Dreadnought brought it down at once. The bots had read the late waves as fine and the boss as soft because they react instantly and can't spend their tags.
- **Late waves press harder.** With the pace, more troopers a plane and heavy pairs, waves 16 and 17 do 55–70 wall damage a wave (about 40 before) and 18 and 19 about 115–120, against 55–90 repaired. Five of the 23 decent bots that reach 18 die there, about as many as in round 11; the damage now arrives together instead of trickling in.
- **The Dreadnought was tuned for a person, not the bots.** At 1.5 s aims, one gun at a time and 12 to the wall it beats none of the bots that reach it (about 110 wall damage a fight against 118 repaired), even with the bot now noticing each aim like a new target. The playtest decides.
- **War prices take the tags.** Decent bots spent 980 of 1,070 tags at wave 19, against about 150 before. Starting them at wave 2 cost bots their early hires (decent alive at wave 10 fell from 72% to 62%), so they start after wave 6.
- `--verify` matches on 15 runs.

## Round 11: the fourth playtest (#38, Oct 8)

Lost to the Dreadnought at wave 15; "we introduce too many new things too late", "waves 1 to 4 were meh".

- **20 waves,** with the new things sooner: balloons at 4, the Red Cross plane at 6, helicopters at 7 ("ineffective late"). They had come too late to matter; now one or two arrive a wave from wave 4. Waves 1–4 are busier.
- **Two new threats for the back half:** heavy bombers (13) and a night raid (16). Two zeppelins at once at 15.
- **The gun's heat per shot stays the same all run:** "id rather it not get worse while at the same time im buying cool downs". Round 10's hotter gun late undid the cooling fins.
- **The browser's speech is gone** ("the default one sounds terrible", and it sounded different on every phone); speech bubbles stay, with the gibberish chatter under them.
- The Dreadnought's guns blow apart and leave a hole when knocked out.
- Hires can be sent back from the shop, and the medic no longer pops into the list after a hire fills the squad.

**Bots.** 20 waves with the Dreadnought at 20, two zeppelins at 15, heavy bombers from 13, the night raid at 16, the new things sooner, busier early waves, the gun's heat fixed), 40 seeds per skill, beside round 10's results:

| Skill | Won, round 10 → round 11 | Alive at wave 10 / 13 / 16 / 20, round 11 | How round 11 runs end |
| --- | --- | --- | --- |
| casual | 0% → 0% | 27 / 12 / 5 / 2% | bombs 21, landers 11, balloons 5, a heavy bomber 1, a dive bomber 1, the Dreadnought 1 |
| decent | 40% → 35% | 72 / 70 / 67 / 57% | won 14, bombs 12, the Dreadnought 9, landers 2, balloons 2, a heavy bomber 1 |
| expert | 38% → 52% | 75 / 72 / 72 / 65% | won 21, bombs 6, the Dreadnought 5, landers 5, a helicopter 1, a sniper 1, a heavy bomber 1 |

What the bots found:

- **Stretched to 20 waves, the old final boss was easy.** With the curves stretched and the Dreadnought moved from 15 to 20 as it was, decent bots won 62%: none that reached wave 13 died before the end, and the Dreadnought beat none of them. Five more shop visits buy a squad that out-repairs it (174 wall damage a fight against 161 repaired). Shells now do 16 to the wall instead of 8, guns reload in 2.8–3.6 s, and its parts are sturdier (`30 + 2.5n`, `70 + 5n`, `80 + 6n`). It now beats about two in five decent bots that reach it and one in five experts, with 261 wall damage a fight against 177 repaired.
- **Heavy bombers went down before reaching the bunker** at 14 health. At 45 they still mostly do, but they hold the turret for a few seconds, and late waves take 4–17 wall damage from them.
- **A seventh bomb per bomber (wave 14) spaces the carpet** so one bomb falls on the bunker instead of two; the rest land on the crew, and crew lost to bombs roughly doubles at waves 14–17. Eight (wave 18) puts two back on the bunker.
- **The busier start cost one decent run at wave 1** (seven planes 1.42 s apart, six landers at the wall). The gap now opens at 1.52 s. Balloons at wave 4 end a few casual and decent runs at waves 4–7.
- **The night raid is drawing only,** so the bots don't feel it; playtesting decides how hard it is.
- `--verify` matches on 15 runs.

## Round 10: the third playtest (#38, Oct 8)

"overall fun, but I beat it pretty easily", "could just hold down fire". The third playtest also found the Dreadnought "rather boring" ("it could look a lot cooler"), so it sails in from the side, looks busier, and fights in three faster stages (see [campaign.md](campaign.md)).

- Waves 10–15 are harder, and spraying costs more: more Red Cross planes with a bigger penalty, and a gun that runs hotter late (dropped in round 11).
- The voices say real words, with speech bubbles; they were "just bloop bloop bloop". The browser's own speech was tried here and dropped in round 11; the words stayed in the bubbles.
- HQ crates arrive by a fly-by drop that always lands, since a stream of fire popped every chute.
- The Red Cross plane is easier to spot, and its penalty is easy to see.
- Dive bombers are easier to read, and helicopters are quicker.
- Tanks land: cargo planes are armored, and a tank on its chutes shrugs off bullets.
- The shop lets you put things back.
- A full audio pass was left for the end of the campaign work (it came in round 15).

**Bots.** The Dreadnought rebuilt in three stages, a harder run-up and a hotter gun late, HQ fly-by drops, quicker helicopters, armored cargo, more Red Cross planes) against main, each played by its own bot, 40 seeds per skill:

| Skill | Won, main → round 10 | Alive at wave 10 / 12 / 15, round 10 | How round 10 runs end |
| --- | --- | --- | --- |
| casual | 0% → 0% | 40 / 30 / 5% | bombs 25, landers 8, snipers 2, dive bombers 2, tanks 2, the Dreadnought 1 |
| decent | 58% → 40% | 82 / 72 / 48% | bombs 17, won 16, dive bombers 3, landers 3, the Dreadnought 1 |
| expert | 42% → 38% | 70 / 68 / 40% | bombs 18, won 15, landers 5, the Dreadnought 1, balloon 1 |

What the bots found:

- **The rebuilt Dreadnought was too much at first.** It beat 7 of the 16 decent bots that reached it, mostly with volleys on the wall (about 216 damage a fight). Volleys now do 8 per shell instead of 12, guns reload in 3–4 s, and a soldier the guns aim at goes down wounded instead of dying. Now it beats about one in six that reach it, and still costs four or five soldiers a fight.
- **The run-up bites.** The hotter gun, faster planes, more armor and tanks that land cut decent survival to wave 15 from 62% to 48%. Heat at 7% a wave put decent wins near 20%; at 5% they're 35–40%, around the third the spec aims for.
- **Helicopters drop their troops now:** about five rope troopers a wave at 14, against under one before. HQ's drops always arrive: nearly two crates a wave collected late, against one in ten caught before.
- `--verify` matches on 15 runs.

## Round 9: the campaign (#36, Oct 8)

The campaign's stages 1–3 ([campaign.md](campaign.md)), as 15 waves: the Dreadnought, a victory card with the roll call, endless, road tanks, armor from wave 10, the armored zeppelin and the new threats. With the second playtest's ideas (wave 16 at 11:02: "very fun", but "by 12 or so I was just destroying"): bomb balloons, a Red Cross plane that costs tags to hit, HQ crates, and little voices.

**Bots, stage 1.** The 15-wave campaign with the Dreadnought, road tanks, armor from 10, slower repairs, a harder run-up and the fighter flight, against main, each played by its own bot, 40 seeds per skill. Runs now end in a win or a loss by wave 15; main had no ending.

| Skill | Won | Alive at wave 10 / 12 / 15 | How runs end |
| --- | --- | --- | --- |
| casual | 0% | 40 / 25 / 2% | bombs 30, landers 6, snipers 3, the Dreadnought 1 |
| decent | 58% | 82 / 75 / 60% | won 23, bombs 15, the Dreadnought 1, landers 1 |
| expert | 65% | 82 / 80 / 75% | won 26, bombs 8, the Dreadnought 4, sniper 1, lander 1 |

A winning run takes about 9 simulated minutes, plus shopping. What the bots found:

- **Survive wave 9 and you won.** Before the retune, no decent or expert bot died between waves 10 and 19, and every one that reached the final boss beat it. Engineers out-repaired almost any damage (6 HP/s each), so only burst damage mattered. Slower repairs, the harder run-up and a tougher Dreadnought put losses back into waves 11–15.
- **The Dreadnought only threatened once it aimed at the wall.** With shells mostly aimed at soldiers it cost bots three or four crew but never the run. Weighting the wall, two guns aiming at once and splash on the repairers made it a fight; the open muzzle (2.5× damage while aiming) keeps it beatable by focused fire.
- **Decent still wins more than the third the spec aims for,** and the decent and expert profiles stay close. The early game (waves 6–9) is where most casual and decent runs end. Playtesting decides the next step.

**Bots, stages 2–3.** The Red Cross plane, bomb balloons, HQ crates, the armored zeppelin, dive bombers and helicopters, against stage 1, each played by its own bot, 40 seeds per skill:

| Skill | Won, stage 1 → stages 2–3 | Alive at wave 10 / 12 / 15, stages 2–3 | How runs end |
| --- | --- | --- | --- |
| casual | 0% → 0% | 38 / 28 / 5% | bombs 29, landers 5, dive bombers 3, the Dreadnought 2, sniper 1 |
| decent | 58% → 58% | 88 / 75 / 62% | won 23, bombs 11, landers 2, the Dreadnought 2, dive bombers 2 |
| expert | 65% → 42% | 72 / 68 / 48% | won 17, bombs 11, landers 6, the Dreadnought 2, dive bombers 2, sniper 1, tank 1 |

On 60 more seeds, expert won 50% against stage 1's 62%. What the bots found:

- **The new threats add damage late but end few runs.** At waves 12–14 dive bombs do 13–17 wall damage a wave and helicopters land a trooper or two, against 60–80 from carpet bombers, and crews repair about as fast. Most losses still come from bombs between waves 7 and 11. Experts feel waves 10–15 more than decent bots do.
- **Helicopters went down before dropping anyone** at four health. At ten, they lower a trooper or two first.
- Bots pop balloons out over the field and catch about one crate in ten: most pops come from spray, too high to catch. Casual bots hit the Red Cross plane about two times in three; decent and expert bots, which hold fire when it's in the line, about one in seven.
- **`--verify` caught the helicopter's hover bob using its id,** which cosmetic effects shift. It now uses a seeded phase, and 15 runs match.

## Rounds 1–8 (#3 to #34, Oct 7–8)

### Round 8 (#34)

Pizza first, no dead air, radio call-ins, a livelier fighter and the highlighter. After the first playtest (wave 14 at 8 minutes 30, still strong, but "the variety seemed to die out"), the campaign plan was written ([campaign.md](campaign.md)).

**Bots.** Against round 7, each played by its own bot, 40 seeds: decent median 26 (22–28.2) against 27.5 (21–29.5), with no difference beyond run-to-run noise; late waves are a touch harder. A median run is 18.8 simulated minutes against about 23, because waves no longer idle waiting for a rush. `--verify` matches.

### Round 7 (#30)

A calmer page: merged labels, a paced wave start, the blue pen, and the zeppelin's bar entering with the hull.

**Bots.** No rules changed; the pizza courier now arrives about two seconds later in the wave. The zeppelin also arrives later, at 9 s instead of 3.5 s. Decent bots on the same 40 seeds: median 28 (22.5–31) on main, 27.5 (21–29.5) on round 7, with no difference beyond run-to-run noise. `--verify` matches with effects on.

### Round 6 (#29)

Radio calls, earned ranks, the wounded and the field hospital, and purchases drawn in.

**Bots.** 40 seeds per skill, 40-minute cap, against main, which was played by its own bot (`--ref-bot own`, because the bot now reads the radio):

| Skill | Median wave (quartiles), main → round 6 | Alive at wave 10 / 20 / 30, main → round 6 |
| --- | --- | --- |
| casual | 13.5 (8–19) → 8 (8–16) | 65 / 22 / 2% → 42 / 8 / 0% |
| decent | 27 (24–29) → 28 (22.5–31) | 95 / 88 / 22% → 80 / 78 / 30% |
| expert | 34 (30.5–41) → 32 (12–37.2) | 90 / 88 / 75% → 75 / 70 / 58% |

What the bots found:

- **Full rank perks made long-lived squads unbeatable.** With faster repairs and a 12% quicker trigger per stripe, most expert runs that got past wave 10 reached the time cap. Without perks they ended between waves 26 and 38. Ranks now add 0.5 health and an 8% quicker trigger.
- **Two fighter passes were too strong.** One pass brought decent runs back to main's median.
- **Waves 6–9 are harder.** Runs no longer start with a free strike, and calls and the hospital now compete with upgrades for early tags. Casual runs feel it most. If playtesting agrees, HQ's first bomber could come earlier than wave 9.

### Round 5 (#28)

No double-tap zoom, sharper on phones, a bigger squad row, and pizza at the wave's start.

**Bots.** A tougher zeppelin and pizza at the next wave's start, same bot, 40 seeds per skill, against round 4: casual 12 → 13.5, decent 29 → 27, expert 33 → 34 median waves, with no difference beyond run-to-run noise. Two decent runs now end to tank shells.

### Round 4 (#26)

A one-list shop, tanks, air strikes, rising pressure and the drum march. Before it (#22): the game-over cause, the kit on the pause card, the sniper callout and a zeppelin heads-up.

**Bots.** 40 seeds per skill, 40-minute cap, compared with main on the same seeds. Main was played by its own bot (`--ref-bot own`) because the shop changed shape, so the differences include the bot's own changes:

| Skill | Median wave (quartiles), main → round 4 | Alive at wave 10 / 20 / 30, round 4 | How round 4 runs end |
| --- | --- | --- | --- |
| casual | 7 (6–8) → 12 (8–19) | 60% / 25% / 5% | bombs 34, landers 5, sniper 1 |
| decent | 9 (8–47) → 29 (26–32.2) | 95% / 95% / 40% | bombs 39, landers 1 |
| expert | 46 (8.8–47) → 33 (31–41) | 90% / 88% / 78% | bombs 30, time cap 9, landers 1 |

What the bots found:

- **The split is gone.** On main, runs that got past waves 7–9 lasted to the time cap. Escalation from wave 12 means decent runs now end between waves 26 and 33, and only 9 of 40 expert runs reach the cap.
- **Tanks barely fired at first.** A bullet stream melted them on the way down, and the bot shot every slow shell out of the air. With bullets doing a tenth of a point, faster and smaller shells and shelling on the move, tanks need rockets, bazookas or a strike. Bombs still end nearly every run, so threat variety is a playtest question.
- **Tank shells took their aim from cosmetic randomness.** `--verify` caught it once tanks lived long enough to fire; shells now aim with `RC`.
- **The bot starved its own squad.** It bought supplies before hiring and kept dying at wave 8 with no engineer. It now hires a rifleman when the squad is thin and hires before low-priority supplies, and it ranks bombers above troopers.

### Rounds 1–3 (#19)

The first playtests: falling troopers crushing the enemy they land on, the barrel dip, overheating and the cost of a shot (round 1); crew survival, snipers against the turret, flak, hiring and dog tags (round 2); and the zeppelin boss (round 3). The balance bots came with them ([SPEC-005](../../../specs/SPEC-005-balance-bots.md)).

**Bots: the first baseline.** 40 seeds per skill, 40-minute cap, after the flak fixes:

| Skill | Median wave (quartiles) | Alive at wave 8 / 10 / 15 | How runs end |
| --- | --- | --- | --- |
| casual | 7 (6–8) | 30% / 10% / 5% | bombs 22, landers 12, snipers 4, time cap 2 |
| decent | 9 (8–47) | 90% / 48% / 42% | bombs 22, time cap 16, landers 2 |
| expert | 46 (9–47) | 82% / 62% / 60% | time cap 24, bombs 9, landers 6, sniper 1 |

What the bots found:

- **Flak spoiled captures and then blocked trooper kills.** A flak round that hit a canopy burst harmlessly above the body, and bursts near planes killed troopers as they jumped. Both are fixed: bursts spare paratroopers, and direct hits act as bullets. With the old behaviour, decent and expert medians were 8 and 7.5 waves; they are now 9 and 46.
- **Runs split in two.** Most runs end between waves 7 and 9, mostly to bombs, but runs that survive that stretch tend to last until the time cap. Pressure stops rising around wave 13: the spawn interval bottoms out at wave 7 and fall speed at wave 13, and later waves only get longer. A build whose kill rate beats the spawn rate (flak, spread, double barrel, the sentry) survives indefinitely. Expert runs that bought flak reached a median of wave 47; those that didn't, about 6 (correlation, not cause).
- **A lander can stall a wave.** With only an engineer and a medic left, one lander at the wall matched the engineer's repairs (then 6 HP/s each way) and the wave never ends unless the player dips the barrel to shoot him.

### The first build (#3)

Built from [spec.md](spec.md), with the owner's pizza-delivery homage in the shop.
