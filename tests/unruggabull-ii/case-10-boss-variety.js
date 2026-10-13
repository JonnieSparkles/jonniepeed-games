// The Shredder's attack patterns: volleys and staple carpets; riding the rug in for a longer jam
// and harder deflects; the live floor during pulls.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const near = (a, b, e) => Math.abs(a - b) < (e || 1e-6);
  RUN.force = 1010; startRun(); bull.inv = 1e9;
  R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  check(b.st === 'fight', 'the fight is on');
  const reset = () => { R.projs = []; R.rows = []; R.talk = null; R.banner = null; R.pull.next = 1e9; b.jam = 0; b.volley = null; b.rally = null; };
  const fire = n => { b.atkN = n; b.atk = 0; update(1 / 60); };

  // phase 1: a rally, a bundle, then a volley of scraps one after another
  reset(); bull.u = 0; bull.bz = 0;
  check(near(TUNE.attackEvery[0], 1.4), 'phase 1 attacks every 1.4 seconds');
  fire(0);
  check(b.rally, 'phase 1 opens with a rally');
  reset(); fire(ATTACKS[0].indexOf('bundle'));
  check(R.projs.length === 1 && R.projs[0].kind === 'bundle', 'then a bundle');
  reset(); fire(ATTACKS[0].indexOf('volley'));
  check(b.volley, 'then a volley');
  step(TUNE.volley.gap * (TUNE.volley.n[0] - 1) + .1);
  check(R.projs.filter(p => p.kind === 'scrap').length === TUNE.volley.n[0] && !b.volley, TUNE.volley.n[0] + ' scraps, one after another');
  // knocking a scrap back does its damage
  reset(); const hp = b.hp;
  const scrap = launch('scrap', { u: 0, z: .4, h: .1 }, { u: 0, z: bull.bz, h: .12 }, .8, { w: .06, hh: .04 });
  for (let i = 0; i < 60 && scrap.z > bull.bz + .15; i++) update(1 / 60);
  b.atk = 1e9; bull.cd = 0; press('slash'); step(1);
  check(near(hp - b.hp, TUNE.scrapDmg, .05), 'a scrap knocked back does ' + TUNE.scrapDmg);

  // ride it in: deflects from close to the mouth hit harder
  reset(); b.atk = 1e9; bull.bz = .6; const hp2 = b.hp;
  const close = launch('bundle', { u: 0, z: .95, h: .1 }, { u: 0, z: bull.bz, h: .12 }, .8, { w: .08, hh: .05 });
  for (let i = 0; i < 60 && close.z > bull.bz + .15; i++) { bull.bz = .6; update(1 / 60); }   // as if riding the rug
  bull.bz = .6; bull.cd = 0; press('slash'); update(1 / 60); step(.6);
  check(hp2 - b.hp > TUNE.bundleDmg * 1.5, 'a bundle knocked back from close to the mouth hits harder (' + (hp2 - b.hp).toFixed(1) + ')');
  // and cutting the rug close to the mouth jams it for longer
  reset(); bull.u = 0; bull.bz = 0; bull.jh = 0;
  R.pull.st = 'on'; R.pull.t = TUNE.cutAfter; R.pull.dur = 5; bull.cd = 0; press('slash'); update(1 / 60);
  check(near(b.jam, TUNE.jamT, .05), 'cut at the start and the jam lasts ' + TUNE.jamT + ' seconds');
  reset(); bull.u = 0; bull.bz = TUNE.mouth * .9; bull.jh = 0;
  R.pull.st = 'on'; R.pull.t = TUNE.cutAfter; R.pull.dur = 5; bull.cd = 0; press('slash'); update(1 / 60);
  check(b.jam > TUNE.jamT * 1.8, 'ride it in close and the jam lasts nearly twice as long (' + b.jam.toFixed(2) + ')');
  b.jam = 0; bull.bz = 0;

  // phase 2: staple fans, bundles, a staple carpet to jump, volleys (no paper sheets any more)
  reset(); b.hp = 60; update(1 / 60);
  check(b.ph === 2, 'phase two');
  check(!ATTACKS.some(l => l.includes('sheet')) && !BEATS.some(B => B.rows === 'sheet'), 'no paper sheets anywhere');
  reset(); fire(ATTACKS[1].indexOf('carpet'));
  const sheet = R.rows.find(rw => rw.kind === 'carpet');
  check(sheet && sheet.v === TUNE.bossRows.carpet, 'phase 2 sends a staple carpet out of its mouth');
  b.atk = 1e9; bull.inv = 0;
  for (let i = 0; i < 300 && sheet.w - R.dist - bull.bz > .12; i++) update(1 / 60);
  const hearts = R.hearts; press('jump'); step(1);
  check(R.hearts === hearts && !sheet.hit, 'jumping clears the carpet');
  bull.inv = 1e9;

  // a live floor: some pulls make the floor beside the rug live, but not the rug
  reset(); b.atk = 1e9; bull.u = 0; bull.bz = 0; bull.inv = 0; b.atkN = 0;
  R.pull.count = 1; R.pull.st = 'idle'; R.pull.next = R.t; update(1 / 60);
  check(R.pull.st === 'warn' && R.pull.spray, 'every other pull in phase 2 makes the floor live, and you know while it warns');
  check(R.banner && R.banner.text === 'RIDE THE RUG', 'with a prompt the first time');
  draw(); step(.9);
  check(R.pull.st === 'on' && R.pull.spray, 'then it pulls and the floor goes live');
  b.atk = 0; step(.6); draw();
  check(R.projs.length === 0, 'and nothing is thrown while it is live');
  bull.u = 0; const onRug = R.hearts; R.pull.dur = 99;
  for (let i = 0; i < 60 * 1.5; i++) { bull.u = 0; if (bull.bz > .6) bull.bz = .3; update(1 / 60); }
  check(R.hearts === onRug, 'riding the rug keeps you clear of the live floor');
  bull.u = .5; bull.inv = 0; update(1 / 60);
  check(R.hearts === onRug - 1 && R.lastCause === 'live', 'standing beside the rug gets you a shock');
  bull.inv = 0; bull.jh = .2; const air = R.hearts; update(1 / 60);
  check(R.hearts === air, 'but not in the air');
  endPull(); bull.inv = 1e9; bull.bz = 0; bull.u = 0;

  // phase 3: the rally, fans, a staple carpet to jump, volleys
  reset(); b.hp = 30; update(1 / 60); b.dark = null;
  check(b.ph === 3, 'phase three');
  reset(); fire(ATTACKS[2].indexOf('carpet'));
  check(R.rows.some(rw => rw.kind === 'carpet' && rw.v === TUNE.bossRows.carpet), 'phase 3 sends a staple carpet across the floor');
  reset(); fire(0);
  check(b.rally, 'and opens its pattern with the rally');
  draw();
})();
