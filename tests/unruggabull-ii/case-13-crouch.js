// Crouch: Down or S (or down on the thumb stick); ducking a high line of carpshits and the Shredder's paper airplanes;
// gripping a pulling rug.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const key = (type, k, c) => dispatchEvent(new KeyboardEvent(type, { key: k, code: c, bubbles: true }));
  RUN.force = 1313; startRun(); bull.inv = 1e9;
  const quiet = () => { R.cubs = []; R.flies = []; R.projs = []; R.boxes = []; R.rows = []; R.pickups = []; R.nextFly = 1e9; R.nextBox = 1e9; R.nextRow = 1e9; R.nextCubW = R.dist + 1e9; R.freeze = 0; };
  quiet();

  // S crouches while held: half height, no moving, no shooting; let go and he stands
  key('keydown', 's', 'KeyS'); update(1 / 60);
  check(bull.crouch, 'S crouches');
  const u = bull.u; key('keydown', 'ArrowLeft', 'ArrowLeft'); step(.3); key('keyup', 'ArrowLeft', 'ArrowLeft');
  check(bull.u === u, 'no moving while crouched');
  R.events.shots = 0; R.fireT = 0; keys.kbShoot = true; step(.4); keys.kbShoot = false;
  check(!R.events.shots, 'no shooting while crouched');
  draw();
  key('keyup', 's', 'KeyS'); update(1 / 60);
  check(!bull.crouch, 'and he stands when you let go');
  key('keydown', 'ArrowDown', 'ArrowDown'); update(1 / 60);
  check(bull.crouch, 'Down crouches too');
  press('jump'); update(1 / 60);
  check(bull.jh > 0 && !bull.crouch, 'jumping from a crouch works');
  key('keyup', 'ArrowDown', 'ArrowDown'); step(1);

  // a line of carpshits comes in at head height: duck it
  quiet(); bull.u = 0; bull.inv = 0; spawnFormation('line');
  check(R.flies.every(f => f.high), 'the line formation flies high');
  let hearts = R.hearts; keys.kbDown = true;
  for (let i = 0; i < 60 * 5 && R.flies.length; i++) update(1 / 60);
  keys.kbDown = false; update(1 / 60);
  check(R.hearts === hearts, 'crouched, a high line passes over');
  check(R.events.duckHint, 'with a DUCK! prompt the first time');
  quiet(); bull.inv = 0; spawnFormation('line'); hearts = R.hearts;
  const gapless = R.flies.find(f => Math.abs(f.u - bull.u) < .12);
  if (gapless) { for (let i = 0; i < 60 * 5 && R.flies.length; i++) update(1 / 60); check(R.hearts < hearts, 'standing, it hits'); }

  // the Shredder's paper airplanes: a flight right across the hall at head height
  RUN.force = 1314; startRun(); bull.inv = 1e9; R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss; R.pull.next = 1e9; b.atk = 1e9; R.projs = []; bull.u = 0;
  b.atkN = ATTACKS[0].indexOf('planes'); b.atk = 0; update(1 / 60);
  const planes = R.projs.filter(p => p.kind === 'plane');
  check(planes.length === 5 && planes.every(p => p.h > .18), 'a flight of five paper airplanes at head height');
  b.atk = 1e9; bull.inv = 0; hearts = R.hearts; keys.kbDown = true;
  for (let i = 0; i < 60 * 2.5 && R.projs.some(p => p.kind === 'plane'); i++) { b.atk = 1e9; update(1 / 60); }
  keys.kbDown = false; update(1 / 60);
  check(R.hearts === hearts, 'duck and they fly over');
  // or slash them back into its mouth
  R.projs = []; b.atkN = ATTACKS[0].indexOf('planes'); b.atk = 0; update(1 / 60); b.atk = 1e9;
  const mid = R.projs.find(p => p.kind === 'plane' && Math.abs(p.u - bull.u) < .2 + .3);
  for (let i = 0; i < 120 && mid.z > bull.bz + .15; i++) { b.atk = 1e9; update(1 / 60); }
  const hp = b.hp; bull.cd = 0; press('slash'); update(1 / 60);
  for (let i = 0; i < 60; i++) { b.atk = 1e9; update(1 / 60); }
  check(b.hp < hp, 'slash them back for damage');

  // grip a pulling rug: crouched on it, it drags you much slower
  R.projs = []; bull.u = 0; bull.bz = 0; bull.jh = 0; bull.inv = 1e9;
  R.pull.st = 'on'; R.pull.t = 0; R.pull.dur = 9; b.atk = 1e9;
  step(1); const free = bull.bz;
  bull.bz = 0; keys.kbDown = true; step(1); keys.kbDown = false;
  check(bull.bz > 0 && bull.bz < free * .5, 'gripping, the rug drags you much slower (' + bull.bz.toFixed(2) + ' vs ' + free.toFixed(2) + ')');
  check(R.events.gripped, 'GRIP!');
  endPull();
})();
