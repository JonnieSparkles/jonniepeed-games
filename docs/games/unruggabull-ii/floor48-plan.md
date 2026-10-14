# The 48th Floor: Reclamation

Status: built (Oct 12, first build). [README.md](README.md) and the code are the source of truth; this is the plan as it was decided, with the bells changed to two the same day.

The owner's brief: Smash TV meets Factorio. A frantic top-down twin-stick level inside p(Loom)'s soul-reclamation factory, where captured souls are woven into carpshits. Unruggabull finds out how it's done and takes the whole operation apart. About two minutes, three working production lines, destruction that drives the escalation, and a blaster and katana that are equally good and work together.

## Where it sits

The climb becomes **13th Floor → quiet ride → 48th Floor → lobby → long ride → roof**.

- The 13th Floor's **Take the elevator** starts the quiet ride (no fight, Please Hold, the supply crate) from 13 to 48. Its doors open on the factory's glow, and he walks out onto the 48th Floor.
- The 48th Floor ends in the **lobby**, side on: he walks to the elevator, DING, Please Hold, and he steps into the long ride, which now starts at 48.
- `#stage=floor48` plays it directly (with `&seed=42` to replay); `#stage=floor48&at=lobby` starts in the lobby.

## The view and the engine

A third engine, `topdown.js`: seen from above at a slight tilt, like Smash TV. The factory is 800 × 450 picture pixels, about one and two-thirds screens each way, and the camera follows him with a lead toward where he aims, so the sprawl reads as a factory while threats are rarely more than a short step off screen. Anything off screen that's coming for him gets an arrow at the edge.

He's drawn from the existing poses at half size (about 35 px tall): from behind when aiming up, the side poses when aiming left or right, and the front view when aiming down, so he always faces his aim and his legs run underneath.

## Controls

- **Phone:** two floating sticks. The left one moves (analog). The right one aims and fires while it's held past a small dead zone. The katana is the round red Slash button beside the right stick, and a quick flick of the right stick (out and released) also slashes in that direction. The supply icon is tapped as before. If the twin stick doesn't play well on a real phone, the fallback agreed with the owner is the left stick to move with Shoot and Slash buttons, the blaster aiming itself.
- **Desktop:** WASD to move, the mouse to aim, hold the left button to fire, right button, Space or Shift to slash. Arrow keys also aim and fire, for keyboard-only play. E uses a supply; M, F and P as everywhere else.
- **Aim help:** the blaster leans a few degrees toward the nearest target in its line (more on a stick than on a mouse). The slash goes where he aims, or at the nearest threat in reach if he isn't aiming.

## The weapons

- **Blaster:** fast (eight shots a second), on charges like everywhere else but more of them (24, one back every 0.18 seconds), so it runs dry only under steady fire. One damage a bolt.
- **Katana:** a wide arc in front of him with a short lunge toward the aim, so it's how you get in, through and out. Four damage to machines, kills any carpshit outright (armor included), cuts rolling rugs, and knocks thrown bobbins back at whoever threw them. A kill with the blade gives the blaster 2 charges back, a deflect 3.
- They work together: the blaster for range and the big machines, the katana for crowds, armor, rolls and bobbins, and to refill the blaster.

## The factory

Three lines run left to right, fed by the **soul main**, a glass pipe down the left wall full of captured souls. Each line is a chain of machines on a conveyor belt:

1. **Soul tank:** glass, full of souls. Burst it and they're free; it explodes and hurts the machines around it.
2. **Spinner:** spins a soul into glowing thread.
3. **Loom:** the line's heart. Weaves the thread into rug. Its health is the line's.
4. **Press:** stamps the rug's shape. It slams on a beat, and its shadow grows on the belt first: under it costs a heart, and it flattens any carpshit there too.
5. **Animator:** zaps the rug alive. A carpshit leaves the end of the belt.

Belts carry whatever stands on them (him included), faster when the panic rises. There are gaps between machines to cross a line, and the belts can be walked over.

**Destruction.** Every machine can be shot and slashed. Tanks, spinners, presses and animators break (free souls, explode) and every break damages the loom on its line, so blowing up its parts is the fast way to a loom. Explosions chain: a blast breaks or damages anything near it, kills carpshits in it, and never hurts Unruggabull (Smash TV rules: the destruction is the reward). When a loom goes, the line goes down end to end in a cascade, its souls burst free, and it stops.

**What each line makes:**

- **Line 1 (Standard):** flying carpshits that chase him.
- **Line 2 (Heavy):** armored carpshits that keep their distance and throw bobbins; the helmet takes one hit.
- **Line 3 (Bulk):** rug rolls. A roll shudders and points at him, then barrels across the floor, bounces once and unrolls into a flyer. The blaster takes three hits to stop one; the katana cuts it in one.

## Production Panic

When a line goes down, the soul main sends its souls to the lines still running, and they speed up. The player's destruction drives the escalation.

| Lines down | The survivors | The room | The music |
| --- | --- | --- | --- |
| 0 | Normal pace | Work lights, steady | FIGHT: drums, bass, lead and the machine |
| 1 | Make 1.4× as fast, carpshits 1.15× faster, belts and presses faster | Amber rotating beacons, the klaxon | Harmony and synth join, 5% faster |
| 2 | Make 1.9× as fast, carpshits 1.3× faster | Red strobes, sparks, steam | The heavy version slams in |

At most 14 carpshits at once. "PRODUCTION PANIC" drops in as a sign the first time.

## The near miss and the collapse

When the last loom goes, the factory comes apart: the soul main bursts, red light, rumble, falling debris (drawn only), every carpshit left is freed, and the freed souls pour up through the roof.

Two of them come to the blaster instead, one at a time with a bell each (D5, then F5), and it fires its streams: the bolt and two ribbons of light. He keeps control and can fire. Then the streams start to bend in toward the bolt, which they never do on the 13th Floor. The bells count up across the climb (owner, Oct 12): one on the 13th Floor (D), two here (D, F), three on the roof (D, F, A), so the chord is only complete when the stream finally fuses. The 13th Floor's drop to one soul is the 13th Floor's own PR's job; until it lands the 13th Floor still has two.

p(Loom) interferes before they fuse. Its eye comes up on every monitor in the factory, threads whip down through the broken roof and snag the two souls, the streams scatter, and the music cuts on a sour chord. Its readout says "NOT ON MY FLOOR." The souls tear free, salute him (as on the 13th Floor, reluctantly this time) and go up with the rest. Nothing explains what nearly happened.

The screen goes white, and we're in the lobby.

## The lobby

Side view, the arena's bull. An immaculate elevator lobby: marble floor, brass, a runner rug, potted plants, and on the wall a grand portrait of the flaming Rugfather with a plaque: FOUNDER & CEO — HIS VISION ENDURES. He walks in from the left, singed and smoking. Passing the portrait he says "HIS VISION ENDURES. HE DIDN'T." The dial over the doors counts down to 48, DING, the doors open on the operator, Please Hold starts, and he walks in. The long ride starts.

The portrait is a placeholder drawn in code (`drawPortrait` in `floor48.js`); the real one will be an image, 96 × 120 pixels, dropped in at that size.

## Sound and music

Three candidates on an audition page, each an intro (the factory alone while he walks in), a fight, and a heavy version, all in D minor so the bells sit in them: **A Neon Works** (Neon reworked), **B Assembly Line** (new, industrial) and **C Gallop Line** (Gallop reworked). The owner picked **Assembly Line** (Oct 12), so it is the default; `#music48=a|b|c` still selects any of the three for comparison. Sounds: the klaxon, presses, machine hits and breaks, tanks bursting, a line going down, the animator's zap, bobbins, rolls, the collapse's rumble and p(Loom)'s sour chord.

## Rules kept from the rest of the game

- Five hearts, the core's rugged and continue. A continue keeps lines already down and restarts with full hearts and no carpshits.
- Score is souls freed. Outcomes come from the seeded stream; drawing never changes a run (`--verify`).
- Supplies work here: Spread Shot fires three ways, Bull Run charges where he faces and smashes carpshits and rolls, and the Spare Vest saves a rugging.
- Balance bots play it like a person, through the same inputs, seeing late.

## Open after the first build

- The owner's phone test of the twin stick (or the fallback).
- The music pick.
- The Rugfather portrait.
- Whether the floor should end on a clear card, or flow straight into the lobby as now.

## Round 2 (Oct 13, from the owner's first phone play)

"thats sick"; it needed more variety, weapon upgrades, a reason to use the stream at the end, and a reason to use the katana; and "the ploom sequence isnt clean". Decided with him and built:

- **The katana's jobs:** bobbins are katana only (bolts pass through; the thrower winds up first); each line's soul feed and power cable can only be cut with it; the spinner's threads are cut with it; the shag is staggered by it. Everything only the katana answers wears a red katana mark that says SLASH! in reach, and the first time each shows up there's a prompt. The slash's lunge is a quarter of what it was, and the Slash button is off the twin sticks for a test.
- **Power-ups** from broken machines: Spread Shot (spinner), Rapid (press) and Pierce (animator), ten seconds each.
- **Bigger guys:** the shag, from the panic on. No Foreman.
- **A hazard per line** (crane, flung thread, reversing belt), and **line shuffle** from the seed.
- **The stream as a whip,** not an intake: the reserve of soul tanks behind the back wall, cracked by sweeping the two streams across it, the streams bending in the more he cracks.
- **p(Loom)'s beat, staged:** it was off screen (its eye only on the small monitors, the camera down by him) with three seconds of nothing after. Now the camera goes up to the wall where its eye opens over him, its threads visibly come from the eye to the gun, the streams snap, the souls tear free and salute, and the lobby follows at once. The HUD's line boxes, which looked like the monitors, are hidden from the collapse on.

## Round 3 (Oct 13): more to destroy

From the owner's second phone play: "stream felt good. controls r fine i think?" He saw only Rapid ("didnt see any others") and wanted more things to destroy. Built:

- **Power-ups you see:** the first spinner, press and animator broken always drop theirs; crates hold power-ups too, ones not seen yet first; each one stands in a column of light in its colour, its name popping up when it drops.
- **Clutter:** soul canisters in pairs along the walkways that burst and set each other off, the crates and pallets breakable, and a console by each line that hurts its loom when smashed.
- **Length kept:** looms 150 → 210 health, since the extra power-ups made the floor a minute shorter.

## Round 4 (Oct 13): the card and the portrait

His third play: "pretty fun!"
- **A clear card before the lobby** ("we need an end level card for sure"): it comes up over the wreck as the souls rise, with the floor's numbers and the slip RECLAMATION, 48TH FLOOR: OUT OF SERVICE; Take the elevator whites out into the lobby.
- **The Rugfather's portrait** is his sprite (the second frame of his strip), at half size and drawn over the finished picture so the palette and dither don't touch it ("it should look almost pixel perfect - i like that it wont match the base game resolution").

## Round 5 (Oct 13, after #93 merged): pizzazz

He picked chain callouts and p(Loom)'s laser, and wanted deflects to actually happen on his phone; no cargo belts, and the different last line wasn't clear, so not for now.
- **Deflects:** the flick's direction bug fixed (it took the release point, not the furthest), a tap slashes at the nearest threat, and a slash catches a bobbin near him from any side.
- **Chains:** CHAIN x5 called out under the banners, with a hit-stop on its beats and a soul per break past the second; the biggest on the clear card.
- **QUALITY CONTROL:** after the first and second line go down, a laser sweeps the room with one gap (across, then down). It burns carpshits and sets off clutter on its way.

### Round 5, second pass (his desktop play)

"SLOW AF" (canvas filters; fixed, a frame is about 25 ms again), the laser not always escapable (the gap is now near him), a small sound for the souls' streams, mouse buttons on every floor, the elevator doors' sunburst, and the roof's "Floor?" / "Roof." before he can leave.

### Round 5, third pass

"ok this is sick!" A touch brighter (about 15%); the chain bonus under its callout; and the last loom, which "takes forever", now overloads: double damage, red-hot, three chunks blowing off at 75/50/25%.

## Round 6 (Oct 14): an objective in the empty corners

From his playthrough: p(Loom)'s beat framed on him (he could end up off screen), the streams' own sound, and an objective with an arrow, designed first on [a page](https://claude.ai/artifact/FLDevJUJFTWbKDZNQmaA2z) with a heatmap of where the bots stand. He picked D: two reaction vessels at the far right (one high, one low) shield the last loom once its laser has passed, with an arrow to them when off screen; burst both and it overloads. And an optional canister cart along the bottom every 40 seconds, no arrow.

Then, from his play ("waaaaaay better!!! very fun"), a little harder and more moving about: the vessels there from the start, dormant under their own shields; awake, they mark the floor under him and arc to it, and send out flyers; 12 bolts or two slashes each; the last line faster while shielded.

Then: a hurt loom burns on its top rail (it had cracks for an hour), and the order split: the shield up as the second line goes down, the vessels holding fire until its laser has passed.
