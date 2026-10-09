// The Shredder's attack patterns: volleys, paper jam sheets and staple carpets; riding the rug in for a longer jam
// and harder deflects; side sprays during pulls.
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

  // phase 1: a bundle, then a volley of three scraps, one after another
  reset(); bull.u = 0; bull.bz = 0;
  check(near(TUNE.attackEvery[0], 1.8), 'phase 1 attacks every 1.8 seconds');
  fire(0);
  check(R.projs.length === 1 && R.projs[0].kind === 'bundle', 'phase 1 opens with a bundle');
  reset(); fire(1);
  check(b.volley, 'then a volley');
  step(TUNE.volley.gap * 2 + .1);
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
  R.pull.st = 'on'; R.pull.t = 0; R.pull.dur = 5; bull.cd = 0; press('slash'); update(1 / 60);
  check(near(b.jam, TUNE.jamT, .05), 'cut at the start and the jam lasts ' + TUNE.jamT + ' seconds');
  reset(); bull.u = 0; bull.bz = TUNE.mouth * .9; bull.jh = 0;
  R.pull.st = 'on'; R.pull.t = 0; R.pull.dur = 5; bull.cd = 0; press('slash'); update(1 / 60);
  check(b.jam > TUNE.jamT * 1.8, 'ride it in close and the jam lasts nearly twice as long (' + b.jam.toFixed(2) + ')');
  b.jam = 0; bull.bz = 0;

  // phase 2: staple fans, bundles, a paper jam sheet to jump, volleys
  reset(); b.hp = 60; update(1 / 60);
  check(b.ph === 2, 'phase two');
  reset(); fire(2);
  const sheet = R.rows.find(rw => rw.kind === 'sheet');
  check(sheet && sheet.v === TUNE.bossRows.sheet, 'phase 2 slides a paper jam sheet out of its mouth');
  b.atk = 1e9; bull.inv = 0;
  for (let i = 0; i < 300 && sheet.w - R.dist - bull.bz > .12; i++) update(1 / 60);
  const hearts = R.hearts; press('jump'); step(1);
  check(R.hearts === hearts && !sheet.hit, 'jumping clears the sheet');
  bull.inv = 1e9;

  // side spray: some pulls send staples down both sides, but not down the rug
  reset(); b.atk = 1e9; bull.u = 0; bull.bz = 0; bull.inv = 0; b.atkN = 0;
  R.pull.count = 1; R.pull.st = 'idle'; R.pull.next = R.t; update(1 / 60);
  check(R.pull.st === 'warn' && R.pull.spray, 'every other pull in phase 2 sprays, and you know while it warns');
  check(R.banner && R.banner.text === 'SIDE SPRAY!', 'with a prompt the first time');
  draw(); step(.9);
  check(R.pull.st === 'on' && R.pull.spray, 'then it pulls and sprays');
  b.atk = 0; step(.6);
  const spray = R.projs.filter(p => p.kind === 'staple');
  check(spray.length >= 2 && spray.every(p => Math.abs(p.vu * 1.2 + p.u) > .4 || Math.abs(p.u) > .3), 'staples go down the sides');
  check(!R.projs.some(p => p.kind !== 'staple'), 'and nothing else is thrown during a spray');
  bull.u = 0; const onRug = R.hearts; R.pull.dur = 99;
  for (let i = 0; i < 60 * 1.5; i++) { bull.u = 0; if (bull.bz > .6) bull.bz = .3; update(1 / 60); }
  check(R.hearts === onRug, 'riding the rug keeps you clear of the spray');
  endPull(); bull.inv = 1e9; bull.bz = 0;

  // phase 3: the rally, fans, a staple carpet to jump, volleys
  reset(); b.hp = 30; update(1 / 60); b.dark = null;
  check(b.ph === 3, 'phase three');
  reset(); fire(2);
  check(R.rows.some(rw => rw.kind === 'carpet' && rw.v === TUNE.bossRows.carpet), 'phase 3 sends a staple carpet across the floor');
  reset(); fire(0);
  check(b.rally, 'and opens its pattern with the rally');
  draw();
})();
