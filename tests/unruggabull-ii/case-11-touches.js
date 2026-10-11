// Little touches: Unruggabull's lines, souls flying into the meter, the low-health heartbeat, the temps' tell,
// the Shredder wearing down, office sounds, and the rug burrito.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 1111; startRun(); bull.inv = 1e9;

  // he says his opening line once the floor's banners are done, and each line only once
  step(5.5);
  check(R.events.said && R.events.said.start && R.bark && R.bark.text === LINES.start, 'the opening line');
  draw();
  R.bark = null; check(bark('start') === 0 && !R.bark, 'each line once per run');
  R.talk = { text: 'X', who: 'shredder', t: 0, times: [0], total: 9 };
  check(bark('copy') === 0 && !R.bark && !R.events.said.copy, 'never over the Shredder');
  R.talk = null;

  // freed souls fly into the meter: the count shown catches up as they land, and the meter pulses
  R.cubs = []; R.flies = []; R.projs = []; R.nextFly = 1e9; R.nextCubW = R.dist + 1e9;
  step(2); const before = R.souls;
  R.flies.push({ u: bull.u, z: bull.bz + .1, h: .14, hp: 1, ph: 0, hit: 0, dead: false });
  bull.cd = 0; press('slash'); update(1 / 60);
  check(R.souls === before + 1 && R.shown === before, 'a soul is freed but still on its way to the meter');
  let pulsed = false;
  for (let i = 0; i < 90; i++) { update(1 / 60); if (R.meterPulse > 0) pulsed = true; }
  check(R.shown === R.souls && pulsed, 'it lands, the count catches up and the meter pulses');

  // one heart left: a heartbeat and red edges
  R.hearts = 1; step(1);
  check(lowHealth() && R.pulse >= 0 && R.pulseT > 0, 'one heart left starts the heartbeat');
  draw();
  R.hearts = TUNE.hearts; step(.1);
  check(!lowHealth() && R.pulseT === 0, 'and it stops when you heal');

  // the temps decide to throw as they pop up, and the ones that will show a ! first
  RUN.force = 1112; startRun(); bull.inv = 1e9;
  let seen = 0, threw = 0, quiet = 0;
  for (let i = 0; i < 60 * 20; i++) {
    update(1 / 60);
    for (const cb of R.cubs) { const tp = cb.temp; if (tp && tp.st === 'up' && tp.t < 1 / 60 + 1e-9 && typeof tp.will === 'boolean') seen++; }
  }
  check(seen > 3, 'temps decide whether to throw as they pop up (' + seen + ')');
  for (const p of R.projs) if (p.kind === 'wad' && p.src && !p.src.will) quiet++;
  check(!quiet, 'only the ones that flashed the tell throw');
  draw();

  // office sounds come every now and then in the hall
  check(R.ambT > 0 && R.ambT <= 18, 'office sounds are on a timer');

  // the Shredder wears down: smoke once it has taken a beating
  RUN.force = 1113; startRun(); bull.inv = 1e9; R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss; check(b.st === 'fight', 'the fight is on');
  check(R.events.said.wake, 'Unruggabull answers its opening line');
  b.hp = 20; R.pull.next = 1e9; b.atk = 1e9; b.dark = null; update(1 / 60); b.dark = null; R.fx = [];
  let smoked = false;
  for (let i = 0; i < 120; i++) { b.atk = 1e9; update(1 / 60); smoked = smoked || R.fx.some(f => f.k === 'smoke'); }
  check(smoked, 'it smokes when it has taken a beating');
  draw();

  // rugged: rolled up in a rug, and a muffled line from inside
  for (let i = 0; i < TUNE.hearts; i++) { bull.inv = 0; hurtBull(1, 'bundle'); }
  check(R.phase === 'dead', 'rugged');
  for (const t of [.15, .45, .8]) { while (R.phaseT < t) update(1 / 60); draw(); }
  R.talk = null; step(.3);
  check(R.events.said.rugged && R.bark && R.bark.text === LINES.rugged, 'MMPH!');
})();
