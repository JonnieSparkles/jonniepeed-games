// Moving day (walls you can't jump, beams to duck, a clean-run bonus), the endless hall and the Shredder closing in,
// lights out's switches, the surge's tell and bolt, the cut line on a deflect, and the souls going back after the hint.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 1818; startRun(); bull.inv = 1e9;
  check(shredderZ() === Infinity, 'the hall is endless at first: no Shredder');
  draw();

  // moving day
  R.beatT = BEATS[0].time; update(1 / 60);
  check(R.event && R.event.kind === 'move', 'moving day');
  const E = R.event;
  // a wall: three tall stacks, one gap; jumping doesn't clear it
  R.boxes = []; R.rows = []; E.nextOb = 1e9; E.gap = 0; E.obN = 0; spawnMove(E);
  const wall = R.boxes.filter(bx => bx.tall);
  check(wall.length === 3, 'a wall of three stacks with one gap');
  const blocked = wall[0].u; bull.u = blocked; bull.inv = 0; const h0 = R.hearts;
  for (let i = 0; i < 700 && wall[0].w - R.dist > bull.bz - .03; i++) { if (wall[0].w - R.dist - bull.bz < .1) press('jump'); bull.u = blocked; update(1 / 60); }
  check(wall[0].hit && !E.clean, "a jump doesn't clear a stack; the run's no longer clean");
  check(R.hearts === h0 - 1, 'and furniture costs a heart');
  // a beam: duck under it
  bull.inv = 0; R.boxes = []; E.obN = MOVES.indexOf('beam'); spawnMove(E);
  const beam = R.rows.find(rw => rw.kind === 'beam'), h1 = R.hearts, souls = R.souls;
  keys.kbDown = true;
  for (let i = 0; i < 700 && beam.w - R.dist > bull.bz - .1; i++) update(1 / 60);
  keys.kbDown = false; update(1 / 60);
  check(R.hearts === h1, 'crouched, the beam goes over');
  check(R.souls > souls, 'and clearing it frees a soul');
  draw();
  // a clean run pays a bonus
  bull.inv = 1e9; E.clean = true; E.nextOb = 0; const before = R.souls;
  for (let i = 0; i < 60 * TUNE.moveT && R.event; i++) update(1 / 60);
  check(!R.event && R.souls >= before + TUNE.moveClean, 'not a scratch: a bonus');

  // lights out: shoot a switch and the lights flash on, freezing the carpshits
  R.flies = []; R.beatT = BEATS[1].time; update(1 / 60);
  check(R.event && R.event.kind === 'dark', 'lights out');
  for (let i = 0; i < 60 * 4 && !R.switches.length; i++) update(1 / 60);
  check(R.switches.length, 'a light switch glows on the wall');
  const sw = R.switches[0];
  R.flies.push({ u: 0, z: .9, h: .36, hp: 1, ph: 0, hit: 0, dead: false });
  bull.u = sw.s * .5;
  for (let i = 0; i < 120 && !sw.hit; i++) { keys.kbShoot = true; update(1 / 60); }
  keys.kbShoot = false;
  check(sw.hit && R.event.flash > 0 && darkness() < .5, 'shoot it and the lights flash on');
  const fly = R.flies.find(f => !f.dead), z = fly && fly.z; update(1 / 60);
  check(!fly || fly.z === z, 'every carpshit freezes in the light');
  draw();
  for (let i = 0; i < 60 * TUNE.darkT && R.event; i++) update(1 / 60);

  // the copy room: the Shredder appears far off and closes in
  check(R.beat === 2, 'the copy room');
  step(1); const far = shredderZ();
  check(far > 3 && far < Infinity, 'the Shredder appears far down the hall (' + far.toFixed(2) + ')');
  R.souls = TUNE.goal - 1; step(BEATS[2].minT * .8);
  check(shredderZ() < far, 'and closes in');
  draw();
  R.souls = TUNE.goal; for (let i = 0; i < 60 * 30 && R.phase === 'hall'; i++) update(1 / 60);
  for (let i = 0; i < 60 * 2; i++) update(1 / 60);
  check(shredderZ() === 1, 'it reaches the end of the hall as it wakes');
  for (let i = 0; i < 60 * 12 && R.phase !== 'boss'; i++) update(1 / 60);

  // the surge: its eyes charge blue first, then a bolt hits the gun
  const b = R.boss; R.pull.next = 1e9; b.hp = 30; update(1 / 60); b.dark = null;
  check(b.ph === 3 && b.surgeAt > 0, 'phase 3 lines up a surge');
  let told = false;
  for (let i = 0; i < 120 && R.armed !== false; i++) { b.atk = 1e9; R.projs = []; told = told || surgeSoon(); update(1 / 60); }
  check(told && R.armed === false && R.fx.some(f => f.k === 'bolt'), 'a blue tell, then a bolt to the gun');
  draw();

  // a deflect leaves a cut line from the blade to the paper
  R.fx = []; R.projs = []; b.atk = 1e9; b.jam = 0;
  const wad = launch('bundle', { u: bull.u, z: .5, h: .12 }, { u: bull.u, z: bull.bz, h: .12 }, .6, { w: .08, hh: .05 });
  for (let i = 0; i < 60 && wad.z > bull.bz + .12; i++) { b.atk = 1e9; update(1 / 60); }
  bull.cd = 0; press('slash'); update(1 / 60);
  check(wad.friendly && R.fx.some(f => f.k === 'cut'), 'a deflect draws a cut line to the paper');
})();
