// The roof's lead-in (the walk teaches), the eye's openings, spool damage that moves the odds, the set piece at 45%,
// snapping spools into the next phase and the reset, caught souls and continues.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const fresh = () => { RUN.force = 42; checkpoint = null; newRun(null, 'roof'); setState('play'); card.hidden = true; clearHeld(); input.jump = input.slash = input.shoot = 0; };
  const rt = floors.roof.ROOF, F = rt.fight, carpets = () => R.roof.tiles.filter(t => t.carpet).length;
  fresh();
  const lines = [], oldSay = Snd.say; Snd.say = text => lines.push(text);
  tick(rt.time.elevator + .2);
  check(R.roof.state === 'walk', 'the doors open on the walk');
  tick(rt.walk.rows[2] + .2);
  check(carpets() === 15 && R.hearts === 5, 'the runner unrolls over the whole roof, a row at a time');
  tick(2); check(R.hearts === 5 && R.roof.tiles[floor.ROOF.grid.cols * R.roof.at.r + R.roof.at.c].grip < F.grip, 'carpet under him in the walk warns but never pulls');
  const carpAt = rt.walk.carpAt; rt.walk.carpAt = 99;   // clear the roof before the carpshit turns up
  for (const r of [0, 1, 2]) for (const c of [1, 3]) { floor.placeBull(c, r); press('slash'); tick(.4); }
  check(carpets() === 0 && R.roof.state === 'walk', 'slashes clear the roof in the walk');
  rt.walk.carpAt = carpAt; floor.placeBull(2, 0);
  tick(Math.max(0, rt.walk.carpAt - R.roof.t) + .1);
  const wc = R.roof.walkCarp, souls = R.souls;
  check(wc && R.roof.state === 'walk', 'a carpshit turns up to shoot once the roof is clear');
  check(floor.shotHits({ u: wc.u, z: wc.z, h: wc.h }) && R.souls === souls + 1, 'shooting it frees a soul');
  tick(.1); check(R.roof.state === 'flash', 'a clear roof and the carpshit down end the walk');
  tick(18);
  check(R.roof.state === 'round1', 'the lead-in reaches the fight');
  check(R.roof.history.slice(0, 6).join() === 'elevator,walk,flash,wake,odds,round1', 'every lead-in state is visited in order');
  check(['HELLO, UNRUGGABULL.', 'I HAVE MODELED THIS MEETING.', 'PROBABILITY OF YOUR SURVIVAL: 1%.', 'MAXIMIZE CARPETS.'].every(t => lines.includes(t)), 'approved opening lines are spoken');
  check(R.roof.odds === 99 && R.roof.broken === 0, 'the fight starts at 99% with three spools');
  // The eye: closed it's armour; open, every hit cracks the spool and takes the odds down.
  fresh(); floor.enter('round1');
  const q = R.roof, hp = q.hp, hit = () => floor.shotHits({ u: q.eye.u, z: q.eye.z, h: q.eye.h });
  hit(); check(q.hp === hp && q.odds === 99, 'a closed eye clangs: no damage');
  q.stall = 2; hit(); check(q.hp === hp - 1 && q.odds < 99 && q.odds === floor.oddsAt(1), 'an open eye takes damage and the odds fall');
  const th = Math.round(hp * F.setAt);
  for (let i = 0; i < 60 && !q.spPending; i++) hit();
  check(q.hp === th && q.spPending && q.stall === 0 && lines.includes('NOT YET.'), 'at 45% of the spool it slams shut and readies its set piece');
  hit(); hit(); check(q.hp === th, 'nothing gets past the set piece');
  bull.inv = 1e9; tick(F.setWait + .1);
  check(q.atk.set && R.banner.text === 'FIRST PASS' && lines.includes('OPTIMIZING.'), 'phase 1 runs FIRST PASS');
  check(q.atk.list.filter(l => l.k === 'col').length === 8 && q.atk.list.filter(l => l.k === 'gap').length === 2, 'two passes of four columns, each with a gold gap');
  tick(q.atk.end - q.atk.t + .05);
  check(q.atk.stage === 'heat' && q.stall > F.open * 1.5, 'the set piece gives the longest opening');
  for (let i = 0; i < 60 && q.broken === 0; i++) hit();
  check(q.broken === 1 && Math.abs(q.odds - floor.oddsAt(hp)) < 1e-9 && R.talk.text === 'NO CHANGE.' && q.hot > 0, 'the spool snaps, "NO CHANGE.", while the odds stay down');
  hit(); check(q.broken === 1, 'extra shots cannot break a second spool in the snap');
  const odds = q.odds; tick(F.snapT + .1);
  check(q.state === 'round2' && q.broken === 1 && q.odds === odds && lines.includes('I AM CONFIDENT. I AM CONFIDENT.'), 'the snap moment leads into phase 2 with the damage kept');
  floor.enter('round3'); q.spDone[2] = true; q.stall = 2;
  for (let i = 0; i < 60 && q.broken < 3; i++) { q.stall = 2; hit(); }
  check(q.broken === 3 && Math.abs(q.odds - rt.fight.floorOdds) < 1e-9, 'three spools take the odds to 55');
  tick(F.lastSnapT + .1);
  check(q.state === 'reset' && lines.includes('ALL SOULS ACCOUNTED FOR.'), 'the last spool reaches the reset on the approved line');
  // Souls freed in the fight are caught in the warp.
  fresh(); floor.enter('round1');
  const caught = R.roof.caught;
  const f = { u: 0, z: .4, h: .2, hp: 1, ph: 0, hit: 0, dead: false };
  R.flies.push(f); killFly(f, 'shot'); tick(1.3);
  check(R.souls === caught + 1 && R.shown === caught + 1 && R.roof.caught === caught + 1, 'a freed soul is counted and ends up hung in the warp');
  // A continue goes back to the phase as it began: broken spools kept, the lead-in skipped, and the failed try's souls
  // lost (the ones he freed and the ones p(Loom) caught from them; soul audit, item 26).
  fresh(); floor.enter('round2');
  const souls0 = R.souls, caught0 = R.roof.caught;
  free(120, 80, 'carpshit', 'shot');
  R.roof.caught = 9; bull.inv = 0; hurtBull(5, 'laser');
  check(checkpoint.roofState === 'round2' && checkpoint.souls === souls0, 'a round2 rugging keeps the checkpoint saved as round2 began');
  continueAtBoss();
  check(R.roof.state === 'round2' && R.roof.broken === 1 && R.hearts === 5 && R.souls === souls0 && R.roof.caught === caught0, 'round2 continue: spools kept, full hearts, the failed try\'s souls gone');
  check(R.roof.history.join() === 'round2' && R.continues === 1, 'continue skips elevator and walk');
  check(R.roof.hp === floor.ROOF.hitsPerSpool[1] && !R.roof.spDone[1] && R.roof.odds === floor.oddsAt(floor.ROOF.hitsPerSpool[0]), 'the phase restarts with its spool whole and its set piece to come');
  Snd.say = oldSay; RUN.force = null; checkpoint = null; newRun(); setState('title'); showCard('title');
})();
