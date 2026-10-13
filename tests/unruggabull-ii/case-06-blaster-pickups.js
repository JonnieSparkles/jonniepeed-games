// Blaster charges, Spread Shot, coffee, rows to jump, streaks, hit-stop and music per section.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  // what the floor asks of the music: tracks and stems, each landing on the next bar
  const calls = [], oldMusic = Snd.music, oldStems = Snd.stems;
  Snd.music = (id, o = {}) => { calls.push({ music: id, o }); return oldMusic(id, o); };
  Snd.stems = names => { calls.push({ stems: names.join() }); return oldStems(names); };
  const stems = () => { const c = calls.filter(c => c.stems || (c.music && c.o.stems)).pop(); return c ? c.stems || c.o.stems.join() : ''; };
  const lastMusic = () => calls.filter(c => 'music' in c).pop();
  try {
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const quiet = () => { R.cubs = []; R.flies = []; R.projs = []; R.boxes = []; R.rows = []; R.pickups = []; R.shots = []; R.nextFly = 1e9; R.nextBox = 1e9; R.nextRow = 1e9; R.nextCubW = R.dist + 1e9; if (R.event && R.event.souls) { R.event.souls = []; R.event.obs = []; } };
  RUN.force = 606; startRun(); quiet(); bull.inv = 1e9;
  check(Snd.track === 'floorOpen' && stems() === 'drums,bass,lead', 'Accounts Payable opens on the office muzak');
  // the band crashes in on the next beat when the first bad guy shows: here the first carpshit coming into range
  R.flies.push({ u: 0, z: TUNE.reach - .01, h: .42, hp: 2, ph: 0, hit: 0, dead: false }); update(1 / 60);
  const drop = lastMusic();
  check(Snd.track === 'floorHall' && drop.o.boundary === 'beat' && stems() === 'drums,bass,lead', 'the drop: the shuffle on the next beat, drums, bass and lead');
  R.flies = [];

  // charges: 20 shots; run it dry and it overheats: no recharge for TUNE.overheat, and no firing until it has cooled
  // back to TUNE.cool charges, sputtering meanwhile; then a short burst, and it overheats again
  check(R.charge === TUNE.charges, 'the blaster starts full');
  R.events.shots = 0; R.fx = []; keys.kbShoot = true;
  for (let i = 0; i < 60 * 7.5 && !(R.heat > 0); i++) update(1 / 60);
  check(R.charge < 1 && R.heat > 0 && R.hot && R.fx.some(f => f.k === 'pop' && f.text === 'OVERHEAT'), 'holding fire drains it and it overheats');
  let fired = R.events.shots; step(TUNE.overheat * .8);
  check(R.events.shots === fired && R.charge === 0 && R.fx.some(f => f.k === 'sputter') && R.empty > 0, 'overheated, the trigger only sputters, and nothing recharges');
  step(TUNE.overheat * .2 + TUNE.recharge * (TUNE.cool - .5));
  check(R.events.shots === fired && R.charge >= 1 && R.hot, 'it recharges, but won\'t fire until it has cooled');
  for (let i = 0; i < 60 * 3 && R.events.shots === fired; i++) update(1 / 60);
  check(R.events.shots === fired + 1 && !R.hot, 'cooled back to ' + TUNE.cool + ' charges, it fires');
  keys.kbShoot = false; step(TUNE.overheat + TUNE.recharge * TUNE.charges + .5);
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
  R.shots = []; R.flies = []; R.workers = []; press('shoot'); update(1 / 60);
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
  bull.inv = 1e9; R.event = null; R.beat = 0; R.beatT = BEATS[0].time; update(1 / 60);
  check(R.event && R.event.kind === 'move' && Snd.track === 'floorHall' && stems() === 'drums,bass,lead,harmony', 'moving day adds the harmony');
  step(TUNE.moveT + .2);
  const staff = lastMusic();
  check(R.beat === 1 && Snd.track === 'floorStaff' && staff.o.boundary === 'bar' && stems() === 'drums,bass,lead,harmony,power', 'All Staff steps up to its own section on the next bar, the full band');
  check(!calls.some(c => ['tower', 'staff', 'dark', 'copy', 'shred'].includes(c.music)), 'the old section tracks never play');
  check(R.pickups.some(pk => pk.kind === 'coffee') && R.pickups.some(pk => pk.kind === 'spread'), 'a coffee and a Spread Shot follow moving day');
  R.flies = []; R.beatT = BEATS[1].time; update(1 / 60); step(.2);
  check(R.event && R.event.kind === 'rush' && Snd.track === 'floorRush' && lastMusic().o.boundary === 'bar' && stems() === 'drums,bass,lead,harmony,power,heavy', 'rush hour goes heavy on the next bar');
  R.flies = []; R.event.t = R.event.dur; update(1 / 60); step(.2);
  check(!R.event && Snd.track === 'floorRush' && stems() === 'bass', 'the lull after drops to the bass and guitar');
  step(TUNE.lull);
  const dark = lastMusic();
  check(R.event && R.event.kind === 'dark' && Snd.track === 'floorHall' && dark.o.boundary === 'bar' && stems() === 'dark', 'lights out drops to the muzak over the PA');
  step(TUNE.darkT);
  const copy = lastMusic();
  check(R.beat === 2 && Snd.track === 'floorCopy' && copy.o.boundary === 'bar' && !copy.o.slam && stems() === 'drums,bass,lead,harmony,power', 'the copy room switches to its step up on the next bar, the full band back');
  } finally { Snd.music = oldMusic; Snd.stems = oldStems; }
})();
