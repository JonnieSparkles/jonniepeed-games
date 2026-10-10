# Unruggabull II: history

Why things are the way they are, and what was tried and dropped, so a later change doesn't undo a fix or retry a dead end. Each line names the round it comes from, by its commit title in [the first pull request](https://github.com/JonnieSparkles/jonniepeed-games/pull/35), which tells each round's full story with the bots' numbers. The game as it is now is in [README.md](README.md).

## Why it's this way

- **Fun over hard** (easier Shredder and rally): the owner's direction for this demo. No phone buzz, no rank, no hard mode (his lines).
- **Rallies are fast, in every phase, with a marathon once a phase** (fast rallies): "boss battle still feels boring … the volley sequences should be way more fast paced and a few longer", after the owner beat the last build easily. Decent bots went from 81% to 54% clears.
- **The slash knocks paper back for 0.16 seconds, not 0.12** (fast rallies): fast returns need a forgiving swing; it made the rallies fairer without slowing them.
- **Formation wipes must be done before halfway, and are a pop, not a big moment, outside lights out** (fast rallies): "formation wipes is a bit much". About 7 a run became about 2.
- **The souls goal is 90** (shredded-paper wads): it was 60 until lights out started paying double, which made 60 a given before the copy room.
- **The power surge can't be dodged** (volley match): "no, the volley should be forced". The blaster flies up the rug, and winning a rally rolls it back; a rolling rug pins you at the back (the owner's pick).
- **Incoming paper has a jagged red edge, no glow and no floor shadow** (lights out, shredded-paper wads): the shadow was confusing, and a glow looked like a power-up.
- **Captions are small, at the top left** (volley match): his lines across the scene got in the way.
- **A thumb stick, with crouch on down** (thumb stick): the owner's idea, as the arrows were tough on a phone. Crouch got jobs straight away: high lines, paper airplanes, gripping the rug.
- **No shooting while crouched** (Shredder's life): the owner leaned yes, but then ducking would be free: you'd duck the paper airplanes and keep shooting, and they'd stop costing anything. Shoot greys out instead, so it's clear.
- **The Shredder reacts instead of getting more attacks** (Shredder's life): "it's there, just needs more life", after the fight had gained plenty of mechanics. It lunges, recoils, laughs, watches you and talks back; its taunts are rationed so they don't nag.
- **The souls' hint is unannounced, white and gold, and never bends in** (mega stream hint): it's the first glimpse of the mega stream, which fuses only on the roof against p(Loom) (the owner's "shining star"). It has to feel like something odd and good happened, not a power-up: Spread Shot already fires three ways in gold, so the streams are the souls' own colours and the souls are seen flying into the gun. Bending in is saved for the middle floor's near miss.
- **No frame round the stick; round arcade buttons** (fast rallies): "the control pad shouldn't have the outer rectangle", and the buttons "can look cooler". Both orientations stay; landscape plays best.

## Tried and dropped

- **A rug burrito** when he's rugged (his lines, dropped in volley match): "looks terrible". The rug is yanked out and he flips off the screen.
- **A big AUDIT banner across the hall** (dropped in lights out): disorienting. Every beat and event gets a sign that drops from the ceiling.
- **A surge you could jump** (volley match, dropped the same round): see above; it had to be forced.
- **A D-pad** (game-pad controls, dropped in thumb stick).
- **A bot that decides once per rally whether to try** (fast rallies): it skipped about a third of rallies, which no player does, and its fixed depth error made fast returns either impossible or free. It now always tries, with a timing error in time.
