// Rallies in every phase, quicker every return; once a phase a marathon rally, with a bigger smash;
// a rally builds (the counter, the music's tempo); quicker attacks; phase 1 attacks during pulls.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const near = (a, b, e) => Math.abs(a - b) < (e || 1e-6);
  RUN.force = 1414; startRun(); bull.inv = 1e9;
  R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  check(b.st === 'fight' && b.ph === 1, 'the fight is on, phase 1');
  const reset = () => { R.projs = []; R.rows = []; R.talk = null; R.banner = null; R.pull.next = 1e9; b.jam = 0; b.volley = null; b.rally = null; };
  const fire = n => { b.atkN = n; b.atk = 0; update(1 / 60); };
  bull.u = 0; bull.bz = 0;

  // play out a rally: knock it back every time until the Shredder misses; returns how long each bat-back took
  function playRally() {
    const ball = R.projs.find(p => p.rally), times = [];
    let t0 = R.t, tempoUp = false, counterBig = false;
    for (let guard = 0; guard < 60 * 40 && !ball.dead; guard++) {
      b.atk = 1e9;
      if (!ball.friendly && ball.z < bull.bz + .14 && bull.cd <= 0) { press('slash'); }
      const was = ball.friendly;
      update(1 / 60);
      if (was && !ball.friendly) { times.push(R.t - t0); }
      if (!was && ball.friendly) t0 = R.t;
      if (R.tempo > 1.1) tempoUp = true;
      if (b.rally && b.rally.count >= 4) counterBig = true;
      if (guard % 30 === 0) draw();
    }
    return { times, tempoUp, counterBig };
  }

  // phase 1 has rallies now, and the first is short
  reset(); fire(ATTACKS[0].indexOf('rally'));
  check(b.rally && !b.rally.marathon, 'phase 1 serves a rally');
  const [lo1, hi1] = TUNE.rally.count[0];
  check(b.rally.target >= lo1 && b.rally.target <= hi1, 'a short one: ' + lo1 + ' to ' + hi1 + ' returns');
  const hp0 = b.hp, short = b.rally.target;
  playRally();
  check(!b.rally && near(hp0 - b.hp, TUNE.rally.smash + TUNE.rally.smashPer * short, .5), 'and a smash');

  // once a phase, a marathon, quicker every return down to the fastest
  reset(); b.hp = 95; fire(ATTACKS[0].indexOf('marathon'));
  check(b.rally && b.rally.marathon && b.rally.target === TUNE.rally.marathon[0], 'a marathon of ' + TUNE.rally.marathon[0]);
  const hp1 = b.hp, run = playRally();
  check(R.events.bestRally === TUNE.rally.marathon[0], 'he keeps it going all the way (' + R.events.bestRally + ')');
  check(run.times.length === TUNE.rally.marathon[0], 'the Shredder bats back every one');
  for (let i = 1; i < run.times.length; i++) check(run.times[i] <= run.times[i - 1] + .02, 'each return comes back quicker (or as quick): ' + run.times.map(t => t.toFixed(2)).join(' '));
  check(run.times[run.times.length - 1] < .5, 'the last ones fly (' + run.times[run.times.length - 1].toFixed(2) + ' s)');
  check(run.tempoUp && run.counterBig, 'the music speeds up and the counter grows as it goes');
  check(near(hp1 - b.hp, TUNE.rally.smash + TUNE.rally.smashPer * TUNE.rally.marathon[0], .5), 'a marathon smash');
  check(R.fx.some(f => f.k === 'big' && f.text === 'MARATHON SMASH!'), 'with a big finish');
  for (let i = 0; i < 30; i++) update(1 / 60);
  check(R.tempo === 1, 'and the music settles back');
  reset(); b.hp = 90; fire(ATTACKS[0].indexOf('marathon'));
  check(b.rally && !b.rally.marathon, 'only once a phase: next time round it is a normal rally');

  // quicker attacks, and phase 1 keeps attacking while the rug pulls
  check(TUNE.attackEvery.every(t => t <= 1.5), 'an attack every 1.5 seconds or less');
  reset(); b.jam = 0; b.atkN = ATTACKS[0].indexOf('bundle'); b.atk = .1;
  R.pull.st = 'on'; R.pull.t = 0; R.pull.dur = 9; R.pull.spray = false;
  for (let i = 0; i < 20; i++) { bull.bz = 0; update(1 / 60); }
  check(R.projs.some(p => p.kind === 'bundle'), 'phase 1 attacks during a pull');
  endPull();
  // but a rally still waits for the pull
  reset(); b.atkN = ATTACKS[0].indexOf('rally'); b.atk = .1;
  R.pull.st = 'on'; R.pull.t = 0; R.pull.dur = 9;
  for (let i = 0; i < 20; i++) { bull.bz = 0; update(1 / 60); }
  check(!b.rally, 'a rally waits for the pull');
  endPull();
})();
