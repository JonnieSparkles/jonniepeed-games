# Stick Army: Campaign

A second way to play beside Arcade: a tour of ten operations with one squad you keep, and can lose. Each operation is a few short missions, each with its own goal, on its own paper. Operations ship one at a time as release packs.

Status: planned (Oct 15–16). Round 1, the frame and Boot Camp, built Oct 16; round 2, Recruitment Drive, built Oct 16; round 3, Balloon Season, built Oct 16; round 4, First Zeppelin, built Oct 17; then, after a playtest, Boot Camp and Recruitment Drive reworked with set-piece missions and the shop made to build up with a requisition tree (Oct 17); Balloon Season and First Zeppelin reworked the same way (Oct 17); after the next playtest, Boot Camp's first two missions reworked (First contact with no trampoline, Downed pilot a dogfight whose pilots join the squad) and the shop's gating fixed for older tours (Oct 17); the flow between waves, missions and operations is to be redesigned next (see below) (the game as it is now is in [README.md](README.md#campaign)). Playtests are next. It's built in rounds, one operation a round, and each operation ships when it has been playtested. Only the next round is planned in detail; later operations are sketches, decided in their own round. Builds on [Arcade](arcade.md) and on the "make room for Campaign" pull request (#135: `game.js` split into `draw.js` and `flow.js`, `save.js`, the paper table `PAPERS`, the run hooks `MODES`). The game as it is now is in [README.md](README.md).

## Why

Arcade is a 20-wave run of about 15 minutes, chasing a score on the board. Campaign is the longer way to play, with higher stakes: soldiers you name, promote and lose for good. It should be:

- **Fun first,** like Arcade: the same shooting, catching and shop.
- **Something you want to play again,** with **no two tours the same.**
- **Not a strategy game.** One currency (dog tags). Gold stars unlock things and are never spent. Between missions, one quick screen. Every choice is two or three options, never a long list. No base building, tech tree, upkeep or morale.

## Words

- **Campaign** is the mode. A **tour** is one playthrough.
- An **operation** is one of the named chapters (Boot Camp, Recruitment Drive…). It has its paper, briefing and gold star; it's what you choose at a fork, and one operation is one release pack.
- A **mission** is one play with one goal: catch 6, keep the wall above half, get the Red Cross planes across, down the zeppelin. An operation has 2–4 missions, drawn from its pool.
- A **wave** is as in Arcade, only in missions that use waves. A mission can also be a timed hold, a convoy run or a boss fight.
- **Arcade** is the base mode (renamed from "campaign" on Oct 16), and it doesn't change.

## Decisions

### The mode

- **Beside Arcade, in the base game,** in its own files, with no shelf card of its own. Arcade stays exactly as it is: its boards, records, play stats, bots and checks.
- **On the title,** Start becomes two buttons, **Arcade** and **Campaign**. Campaign says "Continue" when a tour is saved, and wears a "new" tag until a newly released operation has been opened, as Veteran's tag works. The Soldier / Veteran form is Arcade's only; co-op stays Arcade's.
- **No board.** Campaign has its own progress on the device and never takes a board token.
- **The enemy has no face:** orders come from **Enemy HQ**, heard in intercepted orders, on the radio and as its flag on the map. Villains stay military, nothing about pens or paper.

### A tour

Ten operations, with two forks:

Boot Camp → Recruitment Drive → Balloon Season → First Zeppelin → **Mercy Flight** or **Chopper Country** → Supply Line → The Long Hold → **Tank Road** or **Dive Bombers** → Night Raid → the finale (**the Landship** after Tank Road, **the Air Armada** after Dive Bombers).

What lives where:

| Level | What lives there |
| --- | --- |
| Tour | the squad (roles, names, stripes, kills, traits), the fallen, rewards, the armory, gold stars, the route, dog tags |
| Operation | the paper, its music, the weather, the intel, the gold star, deploy slots, gear (what the shop sells lasts the operation, then resets) |
| Mission | the goal, its waves if any, retry on a loss, a save at its start |
| Wave | the shop between waves, as in Arcade |

- **Missions come from a pool.** Each operation has 4–5 possible missions and a tour draws 2–4 of them; an operation can fix its first or last one (a teaching mission, a boss). A tour is roughly 30 missions of 2–4 minutes.
- **Losing a mission:** retry it from its start, with the squad and gear it started with, except that anyone who died stays dead. The lost-mission card says what went wrong and who fell, with Retry.
- **The squad wiped out** ends the tour. A new tour keeps the gold stars and what they unlocked; the squad, route and rewards start over with rookies.
- **One tour per device.**

### Every tour different

- **Who's left.** Deaths are for good, so the squad at The Long Hold is different every tour.
- **Two forks,** four routes through the ten operations.
- **Mission pools** (above).
- **Weather,** rolled for each operation and shown on its briefing: Clear, Wind (chutes drift), Rain (the gun cools faster, chutes fall faster), Fog (the high sky is hidden), Dusk (half dark). Boot Camp is always Clear; Night Raid never rolls Dusk.
- **Intel,** from the second operation: one intercepted surprise per operation, named on the briefing so it's fair ("intercepted: tanks by road in the last mission"), drawn only from threats already met on this route.
- **Rewards:** after each operation, pick 1 of 3 from a pool: a role, a lasting supply for the tour, a veteran recruit, a gun for the armory, a medal (+1 stripe for one soldier). This is the main reason two tours end with different armies.
- **Gold stars:** one per operation, for its bonus goal; 13 in all, but a tour passes 10, so the rest are on the forks not taken. Never spent; they unlock things for later tours: at 3, every tour starts with a medic; at 6, the wire launcher is in the armory from the start; at 9, harder tours (intel every mission, Veteran's prices); at 12, a gold star on the logo.
- **The tour code.** Every tour has a short code (like `K7Q-MR2`) that sets its rolls: the missions drawn, weather, intel, reward offers and soldiers' names. It shows on the map; entering a friend's code plays the same tour, though how it goes is down to you.

### Between missions and operations

- **Between missions: one screen, one tap.** Who fell and who was promoted, the next mission's goal, and Go. The shop, the barracks and "Copy save link" are there but optional.
- **Between operations:**
  1. **Debrief:** the gold star (or not), promotions, and the reward pick.
  2. **Barracks:** recruit with tags; the back page lists the fallen (name, role, kills, where).
  3. **The map:** the notebook page, where you choose at a fork.
  4. **Briefing:** a post-it with the operation's paper, weather, intel and bonus goal.
  5. **Deploy:** who goes (and which gun, once there's more than one).
- **Redesign (Oct 17 playtest, to build):** the map is the hub and the results card loses its links (Shop, Swap, Barracks, Copy save link, Map).
  - Between waves: no shop, a quick pick from 3–4 offers suited to the last wave and the squad.
  - Between missions: the results card with one Go, then the map zoomed into the operation (done missions read-only, only the next one live), then a prep screen (the squad and a few affordable items), then Start. Forward only, no replays.
  - Between operations: the map zoomed out, with the full shop, the tree and **Squad** (Swap and Barracks merged).
  - Copy save link moves to the pause card. New shop items get a "new" tag. Only soldiers who deployed are promoted, shown on the results card.
- **The map** is the tour on one notebook page: released operations inked, the rest pencilled with "coming soon", Enemy HQ's flag moving ahead of you.

### The squad

- **A barracks of 12.** Each operation has deploy slots: 3 at Boot Camp, rising to 8 by the finale (3, 3, 4, 5, 5, 6, 7, 7, 8, 8). You pick who deploys at the start of an operation and can swap between missions. Soldiers caught on the mat still join during a mission.
- **Roles:** Arcade's five (rifleman, engineer, bazooka, sniper, medic) and four new ones, hired the same way or joining as rewards:
  - **Mortar:** lobs shells over the wall at things on the ground: tanks, rushes, mortar teams.
  - **Machine gunner:** sprays the low sky (chutes, landers, low planes); runs hot like your gun and rests between bursts.
  - **Radio operator:** one extra radio call a mission, and calls come in faster while he's standing.
  - **Scout:** sees through fog, dusk and jungle leaves; hidden snipers on his side of the page show up.
- **Traits:** each soldier rolls one when he earns his name: Lucky (shrugs off one hit a mission), Quick (faster trigger), Steady (tighter aim), Tough (+1 health) or Brave (keeps working while wounded). Shown on his bunk.
- **Promotion is one stripe per operation survived,** not per wave served (a tour has many short missions, and waves would promote everyone to the top by mid-tour). Medals add stripes. The shop doesn't sell Boot Camp or Elite Training in Campaign: stripes come from the tour, and the operation is already called Boot Camp.
- **Special Forces:** the first soldier to survive five operations. One at a time; he wears a beret, keeps his role, and once a mission goes over the wall to take out a tank or a mortar team by hand. If he falls, the title passes to the next who qualifies.

### Gear, the shop and the gun

- **The shop works as in Arcade,** between waves and between missions. Gear lasts the operation, then resets. Dog tags carry across the tour.
- **The armory.** The standard gun is always there; you pick one gun for an operation at deploy, and the shop's upgrades stack on it. Earned as rewards: the **heavy gun** (slow, big rounds that punch through armor and down a plane in one hit; heats fast) and the **wire launcher** (shells that land leave barbed wire that slows walkers). The **flare** is alternate fire in Night Raid only, from a button beside pause like the radio calls.
- **Turret twists,** one operation each:
  - **Convoy** (Supply Line): the gun rides a truck in a supply convoy. The truck stays in the middle of the page while the ground scrolls underneath, so the bunker's position never moves; the mats ride on the truck beds, and losing the trucks loses the mission.
  - **Gun down** (The Long Hold): a mission opens with the gun wrecked; the squad holds alone while the engineers fix it, then it comes back online.
  - **Anti-tank mount** (Tank Road): the gun is dug in low, aiming further down at tanks and the field, and can't reach the high sky.

### The page

Each chapter is on its own paper, with a fresh look and one changed rule:

| Paper | Operations | Its rule |
| --- | --- | --- |
| Ruled notebook | Boot Camp to First Zeppelin, and the finale | home: nothing changes |
| Construction paper | Mercy Flight, Chopper Country | jungle: cut-out leaves at the edges, where snipers hide until they step out to shoot |
| Cardboard | Supply Line | a supply depot: HQ crates land on the truck beds |
| Graph paper | The Long Hold, Tank Road, Dive Bombers | engineers build sandbag blocks on the grid between waves |
| Chalkboard | Night Raid | night: the searchlight, planes show their lights, flares |

- **Page features** (a crease, hole punches, the spiral binding) are drawn on the page, with no rules.
- **Music:** one short motif per paper, on the map and the briefing; waves keep Arcade's march. Each finale gets its own version of the Dreadnought's march.
- **Papers change between operations,** so the page's colors have to be read live (today every file reads them once, at load; see #135). That comes with the first new paper.

### Enemies

Arcade's enemies arrive in the operations' order, and ten new ones debut one operation each, then can turn up as intel later in the tour:

| Operation | New enemies |
| --- | --- |
| Recruitment Drive | **dummy paratroopers:** straw dummies on chutes among real troopers; catch one and the mat bounce is wasted |
| Balloon Season | **barrage balloons:** tethered balloons whose cables stop your bullets, guarding the bombers behind them; pop the balloon and the cable falls |
| Mercy Flight | **fighter squadrons:** tight groups of small, fast planes that strafe the crew, and here hunt the Red Cross planes |
| Supply Line | **sappers:** crawl to the trucks or the wall with a charge on a burning fuse; shoot him before it burns down |
| The Long Hold | **mortar teams:** dig in at the page edge and lob shells at the crew; **flamethrowers:** short range, burn sandbags and anyone close to the wall, armored |
| Tank Road | **half-tracks:** fast armored trucks that drop a squad at the wall and drive off; **spotter plane** (below) |
| Dive Bombers | **smoke planes:** lay a smoke trail across the sky, hiding what's behind it until it drifts off; **spotter plane:** circles over one soldier, and a barrage lands on him unless it's downed |
| Night Raid | **glider assault:** silent, no chutes to pop, they land troops right at the wall |

### The finales

The last fork decides the finale; each is an operation of its own, run-up missions then the boss.

- **The Landship** (after Tank Road): a super-heavy tank bigger than the page grinds in from the side toward the bunker. Stage 1: the riders and track guards. Stage 2: three turrets. Stage 3: the command tower, before the ram reaches the wall; a mark on the ground shows how close it is. The barrel only dips a little below level, so its targets sit high on the hull; the crew, mines and air strikes cover the low parts. Gold star: catch its captain.
- **The Air Armada** (after Dive Bombers): Enemy HQ's flagship leads a V of bombers and fighters in tight formation. Knock out the escorts to open it up, then the wings, then the flagship as it makes its run at the bunker. It has to feel like a crowd, not one big ship like the Dreadnought. Gold star: catch the flagship's pilot.

### Difficulty

- **Each mission says which Arcade wave its waves play as** (Boot Camp's as waves 1–3, The Long Hold's around 10–14). That one number sets the wave's recipe, prices, rewards and boss health, which all read `S.wave` today.
- **Seeds come from the tour code, the operation, the mission and the wave,** so two missions that play as the same Arcade wave still play differently.
- Tuned each round with the balance bots and a playtest; the playtest has the final say.

### Release packs

- **Each operation ships as a release** once it's been playtested: "a new operation is live". Campaign shows on the title from the first release, Boot Camp.
- **The end of what's released:** the map shows the next operations pencilled with "coming soon", and finishing the last released one shows a "To be continued" card; the squad waits in the barracks.
- **A new release** puts the "new" tag on the Campaign button until it's opened, and a line on the map ("Operation Balloon Season is live"). A fork's second branch can ship later as its own pack ("new route open").
- **Saves survive releases** (below). A released mission keeps its id for good, so saves always find it.

### Saving

- **The tour save** (`stickarmy.campaign.tour`, versioned): what a tour carries, written at the start of every mission, and again whenever a soldier dies, so closing the page can't undo a death. It's small and outlives releases.
- **The wave save** (`stickarmy.campaign.wave`): a `save.js` snapshot at each shop inside a mission, so closing the page mid-mission comes back at the last wave. It's dropped if the game has been updated since; the tour then resumes at that mission's start.
- **The save link.** Between missions and on the map, "Copy save link" copies a link that continues the tour from that mission's start on any device; the Campaign screen also takes a pasted code. It holds the tour code, route, place, squad, fallen, rewards, armory, stars, tags and the operation's gear (names come from the tour code), roughly 100 characters, and it's versioned so a link from an older release still works. It's also the backup against iPhone Safari clearing a site's data after a week away. With no board, cheating doesn't matter.
- **Restores never touch Arcade:** a restored tour has no board token, and nothing in Campaign can finish one.

### Play stats

Each mission reports as a run tagged `campaign`, with the operation, the mission and how it ended (won, lost, retried), through `site/assets/stats.js` like every game. Nothing from the device goes into it (no tour code). The dashboard's mode pills get Campaign.

## The operations

Sketches. Each operation is designed for real in its round; the gold stars and pools may change.

| # | Operation | Paper | Slots | New here | Gold star |
| --- | --- | --- | --- | --- | --- |
| 1 | Boot Camp | ruled | 3 | the frame (round 1) | lose no one |
| 2 | Recruitment Drive | ruled | 3 | deploy, weather, intel, dummy paratroopers | catch no dummies |
| 3 | Balloon Season | ruled | 4 | barrage balloons | pop 10 balloons away from the bunker |
| 4 | First Zeppelin | ruled | 5 | boss missions | catch the zeppelin's crew |
| 5a | Mercy Flight | construction paper | 5 | fighter squadrons, escort missions | every Red Cross plane across untouched |
| 5b | Chopper Country | construction paper | 5 | jungle snipers | catch 4 off a downed rope |
| 6 | Supply Line | cardboard | 6 | the convoy, sappers | every HQ plane gets through |
| 7 | The Long Hold | graph | 7 | gun down, mortar teams, flamethrowers | the wall never drops below half |
| 8a | Tank Road | graph | 7 | anti-tank mount, half-tracks, spotter plane | no tank reaches the wall |
| 8b | Dive Bombers | graph | 7 | smoke planes, spotter plane | down every dive bomber before it lets go |
| 9 | Night Raid | chalkboard | 8 | gliders, the flare | no glider lands |
| 10a | The Landship | ruled | 8 | the finale | catch its captain |
| 10b | The Air Armada | ruled | 8 | the finale | catch the flagship's pilot |

## Rounds

Each round builds one operation and whatever it's the first to need, then a playtest on a phone, adjustments, and the release. Arcade is checked unchanged every round.

### Round 1: the frame and Boot Camp

- **The title:** the Arcade and Campaign buttons; Campaign starts a tour or continues one.
- **A tour:** its code rolled, no squad yet, Boot Camp open. You start with nobody and catch your first soldiers.
- **The map** with Boot Camp inked and the rest pencilled "coming soon"; **the briefing** post-it (goal, bonus goal, Clear).
- **Boot Camp's missions:** three, playing as Arcade waves 1–3 on the ruled page. The first is fixed (First contact: survive two waves of planes); two more are drawn from a pool of four:
  - **Fill the ranks:** catch 4 before the planes stop coming.
  - **Hold the line:** bombers only; keep the wall above half.
  - **Target practice:** down 12 planes before 5 get across.
  - **Bomb alley:** shoot 8 bombs out of the air before they land.
- **Goals in the code:** survive N waves, catch N, keep the wall above a mark, down N of something, shoot N bombs; and the hook #135 left out, a goal met ending the mission (a `cleared()` beside `won()`), through `MODES`.
- **The between-missions screen,** the **lost-mission card** with Retry, the **debrief** (gold star, promotions, the reward pick from an early pool), the **barracks** (12 bunks, recruiting, the fallen), traits and names.
- **Saving:** the tour save, the wave save, the save link and pasted codes, the tour code.
- **The end:** "To be continued" after Boot Camp.
- **Play stats** for Campaign missions.
- **Files:** Campaign's own (the mode and its missions in one, its screens in another); Arcade's files only get hooks.

### Later rounds (sketches)

| Round | Operation | Brings first |
| --- | --- | --- |
| 2 | Recruitment Drive | the deploy screen, weather, intel, dummy paratroopers, the radio operator |
| 3 | Balloon Season | barrage balloons, the machine gunner |
| 4 | First Zeppelin | boss missions, the heavy gun |
| 5 | the first branch of fork 1 | construction paper (and live colors), the paper motifs, the scout, Special Forces |
| 6 | Supply Line | cardboard, the convoy, sappers |
| 7 | The Long Hold | graph paper, gun down, mortar teams, flamethrowers, the mortar, the wire launcher |
| 8 | the first branch of fork 2 | Tank Road or Dive Bombers, with its twist and enemies |
| 9 | Night Raid | the chalkboard, gliders, the flare |
| 10 | that branch's finale | the Landship or the Air Armada |
| 11+ | the other branches and finale | released as "new route open"; harder tours at 9 stars |

Which branch comes first at each fork is decided in its round.

## Checks, every round

- **Arcade unchanged:** the Stick Army harness passes; seeded bot runs in solo, co-op and Veteran match `main` run for run; screenshots of Arcade's play, shop, night raid and victory card match `main` (the title is compared apart, since it gains the Campaign button in round 1). The screenshot script from #135 goes into `tests/stick-army/` in round 1.
- **Campaign's own cases:** a tour from start through a won and a lost mission (deaths standing after a retry), the tour save and wave save restored, the save link round trip, and a saved tour from every earlier release still loading.
- **The balance bots** can play a Campaign mission (`--option game=campaign`), to check each new mission is winnable and not trivial.
- **The new screens** at phone portrait, short landscape and notebook sizes, with full screen, as the Standards ask; then a playtest on a phone.
- `python3 tools/stamp.py` last; README updated in the same change; a line in history.md when there's a reason worth keeping.

## Considered and left out

- **Meta villains** (Oct 15): the Red Pen and an Eraser finale. The owner wanted to stay on a military theme instead; the enemy is Enemy HQ, with no face.
- **The napkin and sticky-note papers:** the napkin is the least military; a tiny page with three soldiers is too small on a phone.
- **A battleship or carrier finale:** they'd fight from off the page, where nothing can be hit. **The armored train** and **the Ace** weren't picked; the Ace might make a mid-tour boss later.
- **Moving the bunker** (picking left, middle or right, or two bunkers): the bunker's position is read in over a hundred places, with about 40 more numbers that assume it, and the convoy gives a moving gun without it. A bunker that moves during a wave, or a turret on rails, would be a sequel.
- **Landscape and land missions, and a two-page finale:** the sky's height is tuned everywhere; maybe later.
- **Not picked from the lists:** dispatch riders, infiltrators and camouflage chutes; the cook and the rigger; the pen gun and the charged shot (hold to fire on touch); door gunner; two turrets you switch between, and gun parts.

## Open questions

- **The name and logo** on the Campaign side (the map page's logo).
- **A full barracks:** where does a soldier caught with no bunk free go?
- **"60 new waves"** in the pitch is tabled until the operations are built.
- **Skipping teaching missions** (Oct 16, after round 1): a way to skip First contact and any later tutorial missions, for players who've done them before. Later; how (a button on the briefing, or only on a second tour) is open.
