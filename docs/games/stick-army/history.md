# Stick Army: history

Why things are the way they are, and what was tried and dropped, so a later change doesn't undo a fix or retry a dead end. Each line names the round it comes from; rounds are numbered as in the pull request titles, and each pull request tells its round's full story. The longer record, with every playtest note and bot table up to round 16, is [this file as it was on Oct 10](https://github.com/JonnieSparkles/jonniepeed-games/blob/0fe62eb679951f75b14c3d0750ac6c8b714a21f6/docs/games/stick-army/history.md).

## Tried and dropped

- **A gun that runs hotter late** (round 10, dropped in 11): it undid the cooling fins you'd bought ("id rather it not get worse while at the same time im buying cool downs"). Heat per shot is the same all run.
- **The browser's own speech** for the voices (round 10, dropped in 11): it sounded bad, and different on every phone. The words are in speech bubbles, over gibberish chatter.
- **Round 15's sound variety** (undone in 16): a sound for each voice mood, a march that thinned and filled with the action, and a whistle for each kind of bomb ("everything was kind of different but similar enough", "there's a lot going on").
- **A compressor on the mix** (round 15): it squashed short hits. The mix uses a soft clip.
- **Holding every plane off until its middle was over the page** (round 14): it gave each one a free half second and made the game much harder (decent bots alive at wave 20 fell from 34% to 17%). Instead, nothing can be hit off the page.
- **A Dreadnought ramming run** (rounds 12 and 14): it read as pouncing, and it could take a won run on a sliver of wall.
- **Darkness for the Dreadnought's hangar stage** (round 12): "a little random". Smoke bombs bursting in the air weren't deliberate enough either; smoke pots laid on the field are.
- **A thin main gun under the bow** (round 12): "hard to notice". The next one, hurt only while it glowed, with a progress ring and no health bar, was "not clear if u could damage it". It's now a turret with its own bar.
- **A red "the Dreadnought is coming!" callout** (round 12): it said the same thing as its name across the page.
- **War prices from wave 2** (round 12): they cost the bots their early hires. Prices rise after wave 6.
- **Faster repairs and a 12% quicker trigger per stripe** (round 6): long-lived squads became unbeatable. A stripe gives 0.5 health and 8%.
- **Two fighter-cover passes** (round 6): too strong. It makes one.
- **Sandbags against the bunker's sides** (round 14): the crew standing there hid them. They're stacked across the front.
- **Veteran's markup from wave 1** (round 17): a third on prices from the start hurt the opening, not the stacking (expert bots alive at wave 10 fell from 68% to 45%). It climbs from nothing to a third by wave 10.
- **Co-op half again harder on every wave** (round 18): two decent bots fell sooner than one in solo early on, and two experts were far stronger from wave 12, once each barrel had its own spread and double barrel (alive at wave 15: 70% against solo's 30%). The extra now grows with the waves.
- **A Veteran Dreadnought with a quarter more health, and spread shot doing nothing or half to it** (round 17): no expert bot that reached it won, where 4 of 8 did with spread shot at full damage; the health made no difference beside that. Its health is Soldier's, and side bullets do three quarters: the bots don't aim the middle bullet, and the Dreadnought is tuned by hand anyway (below).
- **A Veteran kit of 12 pieces, and two offers a visit** (round 19): no expert bot reached wave 15. Two offers alone cut them hard from the start (alive at wave 6 fell from 78% to 60%), whatever the kit size. A kit of 30, with three offers, leaves the run-up as it was and bites late, where stacking won the war; 36 barely bit.

## Why it's like this

### Co-op

- **The host runs the game** (round 18): every phone running the same game was ruled out because the logic's trigonometry can differ in the last digit between Safari and Chrome, and two copies would drift.
- **The field is sent generally, not from a list** (round 18, the owner): everything in `S` but particles, so a new enemy reaches the guest with nothing to remember, and co-op can be taken back out as one file and its hooks.
- **Turret upgrades are each player's own** (round 18, the owner): "each player should get own store options for turret choices". Common supplies stay common, shown to the other as chosen by the comrade; one wallet and one free pick for the team.
- **Green for the second player, not red** (round 18, Oct 11): "the friend being red defeats the theme". Red is the enemy's; blue, red and green are the notebook's three pens.
- **Each player's own dog tags and free pick** (round 18, Oct 11): one wallet and one free pick for the team was "odd and confusing", and only one player got the free pick. The shop splits into "Your gun" and "For the squad".
- **One gift each, as in solo** (round 18, Oct 11): co-op's free pick (any rotating supply free until you took one) showed two or three "Free!" rows that went back to their prices once one was taken, which read as a mistake. Each player now gets solo's gift, a different one from the friend's where there's another. One less rule that differs.
- **Copy link, not the share sheet** (round 18, Oct 11): the owner's call on the link card.
- **Solo is co-op with one player** (round 18, Oct 11, after co-op shipped): solo kept one wallet (`S.coins`) and its gun upgrades on `S.mods` while co-op kept them per player, so the shop branched in some twenty places, and a reward written for solo (`S.coins += n`) would have paid nobody in co-op. Now every player has a wallet and every barrel its upgrades; `case-31-tags.js` guards the tag writes. The shop's screen moved to `shop-screen.js` and the pizza courier to `units.js`. Seeded bot runs in solo, co-op and Veteran matched `main` run for run.
- **A three-word secret** (round 18, Oct 11): Meatball, Meatball, Sausage, checked by the page; the room still has its own one-word secret.
- **Co-op ramps from ×1.35 to ×2.6 by wave 15, with a Dreadnought of twice the health** (round 18): with a shared wallet ×1.2 to ×2 matched solo, but once each bot had its own tags (both spending, two free picks) two experts reached wave 20 in 56% of runs against solo's 23%. Now two bots fare about as one does in solo again. On round 19 (late tanks, HQ planes) the extra planes alone didn't hold two experts back (×3 by wave 15 left them as strong: more planes are also more tags), so squad things cost half again as much in co-op (two wallets, one squad), with planes ×1.35 to ×3.

### Pace and difficulty

- **20 waves, with the new things early** (round 11): 15 ended too soon, "we introduce too many new things too late", and "waves 1 to 4 were meh".
- **Late waves arrive together** (round 12): waves 13–19 never touched the wall, then the Dreadnought brought it down at once. The bots missed it: they react instantly and can't spend their tags.
- **Engineers repair 4 HP/s** (round 9): at 6 they out-repaired almost anything, so surviving wave 9 meant winning.
- **A bomb on the wall does 16, not 18** (round 14): since nothing is hit off the page, more planes live to drop.
- **Nothing of consequence above the page's top rule** (round 14): "nothing 'of consequence' flies above that line. ambient things are no problem".
- **Road tanks come early** (rounds 14 and 16): they used to straggle in after the planes and drag the wave out ("what are you doing here, man?").
- **Tanks hurry while off the page** (round 19): tanks queued behind parked ones still crawled in at the end of waves 17 to 19. Road tanks also take the emptier side, and cargo planes come on a schedule.
- **Seven bombs a bomber from wave 14, eight from 18** (round 11): seven spaces the carpet so one bomb falls on the bunker; eight puts two back.

### The Dreadnought

- **Tuned by hand on a practice page, not by the bots** (round 12): the bots react instantly. One gun aims at a time for 1.2 s, reloads in about 2 s and hits the wall for 14. 0.9 s with two guns aiming and 16 to the wall was impossible to react to; 1.5 s with slow reloads and 12 was "way too easy".
- **The build-up and the decoy** (round 12): the old entrance (2 s in, 90 px/s) had no build-up, and the fight was "thematically exciting but still a little bland".
- **Pauses between stages** (round 12): they followed each other too fast.
- **Armored sortie bombs** (round 12): the sentry and flak popped every one. Sorties let go later than dive bombers, so the plane has to go down first.
- **The decoy's armor takes four knocks, and only on the page** (round 14): the first hit used to knock it off before it was in sight.
- **The last hurrah** (round 14): with only the bridge left, "its pretty much over". The crew jump one at a time in two waves ("stagger person by person not all at once"); at first eight jumped together.

### The sky

- **Dive bombers let go at 320** (round 14): at 392 only a quarter got a bomb off, and you couldn't tell they did anything.
- **Helicopters and heavy bombers can take a beating** (rounds 9 and 11): at 4 health helicopters went down before dropping anyone, and at 14 heavy bombers went down before reaching the bunker.
- **The sky's enemies start at wave 4** (round 11): they came too late to matter.
- **Low lanes, tank pairs and tank raids** (round 13): the playtest asked for low drops early on and stronger tanks with troops.
- **The Red Cross plane is worth a wave bonus either way** (round 14, "more points/more penalty"), with a record and a bonus for all safe (round 16).
- **HQ planes can be hit by accident, and pay for getting through** (round 19): "a good bonus for letting that happen". The crew's and the sentry's rounds pass by, so only your own aim costs it.

### Shop and squad

- **War prices** (round 12): 6,500 tags went unspent by wave 19, with nothing left to buy. Pizza stays 25 ("sometimes u just want pizza").
- **Training** (round 12): by wave 20 every supply was maxed and two thirds of the squad were rookies. Training adds the same stripes as service, so the "og" soldiers always have the most.
- **Sending a soldier home costs half a rifleman, one a visit** (round 20): "be able to RELEASE a squad member from duty ... to free up a slot". It never pays tags back and never lowers the hire price, so it can't be farmed; the open slot is what you buy.
- **The mats on either side, from the seed** (round 16): "the starting trampoline always starts on the left".

### Levels

- **Two levels, Soldier and Veteran** (round 17): "it wasn't too hard bc u can stack upgrades. but i like that. maybe make 3 hardness levels". Two, not three, since every later balance change is checked on each. Soldier is the game as it was, and Veteran goes after stacking.
- **A board per level, not a score multiplier** (round 17): a multiplier is hard to make fair.
- **A "new" tag on Veteran, not a What's new note** (round 17): notes explain a board reset, and nothing reset.
- **The record stamp on the grass at the right** (round 17): the level took its place beside Start, and it sits clear of the demo's squad there.
- **Levels' boards reset together** (round 19): "we should cycle both boards together never separate". Board numbers then keep saying which level is which, and the play stats dashboard names them.

### Sound

- **The mix at 0.8** (round 15): phones played it quietly.
- **The noise source is 3 s** (round 15): at 0.6 s it cut the noise out of every longer sound.
- **A line waits rather than being dropped** (round 15): any line within 0.2 s of another used to be silenced, alarms included.
