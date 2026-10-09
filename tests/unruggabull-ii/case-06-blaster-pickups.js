// Blaster charges, Spread Shot, coffee, rows to jump, streaks, hit-stop and music per section.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const quiet = () => { R.cubs = []; R.flies = []; R.projs = []; R.boxes = []; R.rows = []; R.pickups = []; R.shots = []; R.nextFly = 1e9; R.nextBox = 1e9; R.nextRow = 1e9; R.nextCubW = R.dist + 1e9; };
  RUN.force = 606; startRun(); quiet(); bull.inv = 1e9;
  check(Snd.track === 'tower', 'Accounts Payable plays RugCo Tower');

  // charges: 20 shots, then a click and a wait; one back every half second
  check(R.charge === TUNE.charges, 'the blaster starts full');
  R.events.shots = 0; keys.kbShoot = true; step(7.5);
  const fired = R.events.shots;
  check(R.charge < 1 && R.empty > 0, 'holding fire drains it and it clicks empty');
  step(2);
  check(R.events.shots - fired >= 3 && R.events.shots - fired <= 5, 'empty, it only fires as charges come back (' + (R.events.shots - fired) + ')');
  keys.kbShoot = false; step(TUNE.recharge * TUNE.charges + .5);
  check(R.charge === TUNE.charges, 'it refills when you let go');

  // Spread Shot: three bolts a shot for a while, from a pickup at jump height
  quiet(); bull.u = 0;
  const missed = addPickup('spread', .12, 0);
  step(1);
  check(!missed.got && R.spread === 0, 'standing under a pickup does not grab it');
  quiet(); addPickup('spread', .1, 0);
  for (let i = 0; i < 60 && R.pickups[0].w - R.dist - bull.bz > .06; i++) update(1 / 60);
  press('jump'); step(.6);
  check(R.spread > 0 && !R.pickups.length, 'jumping grabs it');
  R.shots = []; press('shoot'); update(1 / 60);
  check(R.shots.length === 3 && R.shots.some(s => s.du < 0) && R.shots.some(s => s.du > 0), 'Spread Shot fires three ways');
  step(TUNE.spreadT + .5);
  check(R.spread === 0, 'and wears off');

  // coffee gives a heart back, never more than five
  quiet(); R.hearts = 3; bull.u = .3;
  addPickup('coffee', .1, .3);
  for (let i = 0; i < 60 && R.pickups[0].w - R.dist - bull.bz > .06; i++) update(1 / 60);
  press('jump'); step(.6);
  check(R.hearts === 4, 'coffee gives a heart back');
  R.hearts = TUNE.hearts; quiet(); addPickup('coffee', .1, .3);
  for (let i = 0; i < 60 && R.pickups[0].w - R.dist - bull.bz > .06; i++) update(1 / 60);
  press('jump'); step(.6);
  check(R.hearts === TUNE.hearts, 'but never past five');

  // a row of chairs spans the aisle: step aside and it still hits; jump it and it doesn't
  quiet(); bull.inv = 0; bull.u = .55; let h = R.hearts;
  R.rows.push({ w: R.dist + .12, kind: 'chairs', hit: 0 });
  step(1);
  check(R.hearts === h - 1, 'there is no way around a row of chairs');
  step(1.5); quiet(); bull.inv = 0; h = R.hearts;
  const row = { w: R.dist + .15, kind: 'chairs', hit: 0 };
  R.rows.push(row);
  for (let i = 0; i < 90 && row.w - R.dist - bull.bz > .1; i++) update(1 / 60);
  press('jump'); step(1);
  check(R.hearts === h && !row.hit, 'but you can jump it');

  // streaks ring higher; kills pause the action for a moment
  quiet(); R.streakT = 0;
  for (let i = 0; i < 3; i++) { R.flies.push({ u: bull.u, z: bull.bz + .1, h: .14, hp: 2, ph: 0, hit: 0, dead: false }); bull.cd = 0; press('slash'); update(1 / 60); check(R.freeze > 0, 'a kill freezes a moment'); step(.3); }
  check(R.streak === 2, 'three quick kills make a streak');

  // each section has its own music
  R.event = null; R.beat = 0; R.beatT = BEATS[0].time; update(1 / 60);
  step(TUNE.auditT + .2);
  check(R.beat === 1 && Snd.track === 'staff', 'All Staff plays Alley Redux');
  check(R.pickups.some(pk => pk.kind === 'coffee') && R.pickups.some(pk => pk.kind === 'spread'), 'a coffee and a Spread Shot follow the audit');
  R.flies = []; R.beatT = BEATS[1].time; update(1 / 60); step(.2);
  check(R.event && R.event.kind === 'dark' && Snd.track === 'dark', 'lights out drops to a heartbeat');
  step(TUNE.darkT);
  check(R.beat === 2 && Snd.track === 'copy', 'the copy room has its own tune');
})();
