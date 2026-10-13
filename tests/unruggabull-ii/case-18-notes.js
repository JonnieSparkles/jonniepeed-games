// Moving day (a course of chairs and beams, the first jump and duck marked, souls trapped between, a clean-run bonus), the endless hall and the Shredder closing in,
// lights out's switches, the surge's tell and bolt, the burst on a deflect, and the souls going back after the hint.
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
  // the course: a couple of chairs and a couple of beams, the first jump and first duck marked
  check(MOVES.filter(m => m[0] === 'chairs').length === 2 && MOVES.filter(m => m[0] === 'beam').length === 2, 'a couple of jumps and a couple of ducks');
  R.boxes = []; R.rows = []; E.moves = MOVES; E.dur = 1e9; E.nextOb = 1e9; E.obN = 0; E.marked = {}; E.souls = [];
  spawnMove(E);
  const chairs = R.rows.find(rw => rw.kind === 'chairs');
  check(chairs && chairs.ob.mark && E.souls.length === 1, 'the first chairs are marked, with a trapped soul after them');
  // stand in the chairs' way without jumping: a heart, and the run's no longer clean
  bull.inv = 0; const h0 = R.hearts;
  for (let i = 0; i < 700 && chairs.w - R.dist > bull.bz - .03; i++) update(1 / 60);
  check(chairs.hit && !E.clean && R.hearts === h0 - 1, 'furniture costs a heart, and the run is no longer clean');
  // run through the trapped soul to free it
  const sl = E.souls[0], s0 = R.souls;
  for (let i = 0; i < 700 && !sl.got && sl.w - R.dist > bull.bz - .05; i++) { bull.u = sl.u; update(1 / 60); }
  check(sl.got && R.souls > s0, 'running through a trapped soul frees it');
  bull.u = 0; E.clean = true;
  draw();
  // a beam: duck under it
  bull.inv = 0; R.boxes = []; R.rows = []; E.obN = MOVES.findIndex(m => m[0] === 'beam'); spawnMove(E);
  const beam = R.rows.find(rw => rw.kind === 'beam'), h1 = R.hearts, souls = R.souls;
  keys.kbDown = true;
  for (let i = 0; i < 700 && beam.w - R.dist > bull.bz - .1; i++) update(1 / 60);
  keys.kbDown = false; update(1 / 60);
  check(R.hearts === h1, 'crouched, the beam goes over');
  check(R.souls > souls && R.fx.some(f => f.k === 'pop' && f.text === 'DUCKED!'), 'and clearing it frees a soul, with a DUCKED!');
  draw();
  // a clean run pays a bonus
  bull.inv = 1e9; E.clean = true; E.dur = E.t + 8; E.nextOb = 0; E.obN = Math.min(E.obN, E.moves.length - 1); const before = R.souls;
  for (let i = 0; i < 60 * TUNE.moveT && R.event && R.event.kind === 'move'; i++) update(1 / 60);
  check(!(R.event && R.event.kind === 'move') && R.souls >= before + E.bonus, 'not a scratch: a bonus');

  // lights out: shoot a switch and the lights flash on, freezing the carpshits
  R.flies = []; R.beatT = BEATS[1].time; update(1 / 60); if (R.event && R.event.kind === 'rush') { R.flies = []; R.event.t = R.event.dur; update(1 / 60); } 
  check(R.event && R.event.kind === 'dark', 'lights out');
  for (let i = 0; i < 60 * 4 && !R.switches.length; i++) update(1 / 60);
  check(R.switches.length, 'a light switch glows on the wall');
  const sw = R.switches[0];
  R.flies = [{ u: 0, z: .9, h: .36, hp: 1, ph: 0, hit: 0, dead: false }];   // one carpshit to freeze, out of the line of fire
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

  // a deflect bursts where the blade meets the paper, with no line from him to it
  R.fx = []; R.projs = []; b.atk = 1e9; b.jam = 0;
  const wad = launch('bundle', { u: bull.u, z: .5, h: .12 }, { u: bull.u, z: bull.bz, h: .12 }, .6, { w: .08, hh: .05 });
  for (let i = 0; i < 60 && wad.z > bull.bz + .12; i++) { b.atk = 1e9; update(1 / 60); }
  bull.cd = 0; press('slash'); update(1 / 60);
  check(wad.friendly && R.fx.some(f => f.k === 'spark' && f.col === '#bfefff') && !R.fx.some(f => f.k === 'cut'), 'a deflect bursts at the paper, with no line from him');
})();
