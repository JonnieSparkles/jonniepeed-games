// Polish: his idle poses, the temps' three looks, the stagger, one EMPTY at a time, his caption wrapping to the left,
// the souls drifting up at the clear.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 1717; startRun(); bull.inv = 1e9;
  R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  const quiet = () => { b.atk = 1e9; R.projs = []; R.rows = []; b.rally = null; R.pull.st = 'idle'; R.pull.next = 1e9; };

  // standing about: breathing at first, glances after 2 s, then idle bits after 5 s; moving resets it
  quiet(); bull.u = 0; bull.aimT = 0; bull.slash = -1;
  const seen = new Set();
  for (let i = 0; i < 60 * 13; i++) { quiet(); update(1 / 60); seen.add(idlePose(bull.idle)); }
  const P = A.POSES;
  check(bull.idle > 12, 'the idle clock runs while he stands about');
  check(seen.has(P.breathe) && (seen.has(P.lookL) || seen.has(P.lookR)), 'he breathes and glances');
  check(P.twirl.some(t => seen.has(t)) && seen.has(P.gripUp) && seen.has(P.scuff), 'and spins the blaster, checks the katana, scuffs a hoof');
  keys.kbLeft = true; quiet(); update(1 / 60); keys.kbLeft = false;
  check(bull.idle === 0, 'moving resets it');
  draw();

  // three temps, picked from where the desk is (so the run's dice are untouched)
  check(A.TEMPS.length === 3, 'three temp looks');

  // a hit staggers him (drawn only)
  bull.inv = 0; hurtBull(1, 'bundle');
  check(bull.stag > 0, 'a hit staggers him');
  draw(); bull.inv = 1e9;

  // one EMPTY at a time, however long you hold Shoot dry
  R.fx = []; R.charge = 1; R.fireT = 0; keys.kbShoot = true; step(1.5); keys.kbShoot = false;
  check(R.fx.filter(f => f.k === 'pop' && f.text === 'EMPTY').length <= 1, 'one EMPTY at a time');

  // his caption wraps into short lines on the left
  R.events.said = {}; R.talk = null; bark('move', true); for (let i = 0; i < 120; i++) update(1 / 60);
  // the right of the screen at caption height looks the same with or without it
  const right = () => { R.shake = 0; draw(); return Array.from(g.getImageData(110, 20, 128, 22).data).join(); };
  const withIt = right(), K = R.bark; R.bark = null; const without = right(); R.bark = K;
  check(K && withIt === without, 'his caption stays on the left');

  // the clear: the souls drift up past him, and NO BLASTER doesn't linger
  quiet(); R.armed = false; R.souls = 120; b.hp = .1; bossDamage(1, 'blaster');
  step(4);
  check(R.fx.filter(f => f.k === 'rise').length === 40, 'forty souls drift up at the clear');
  draw();
})();
