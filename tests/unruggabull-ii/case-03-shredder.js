// The Shredder: wakes on souls, three phases, deflects, jams, and the clear card.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const near = (a, b) => Math.abs(a - b) < 1e-6;
  RUN.force = 303; startRun();
  R.souls = TUNE.goal; step(.5);
  check(R.phase === 'hall', 'the goal alone does not wake it before the copy room');
  R.beat = 2; R.beatT = 1; step(.5);
  check(R.phase === 'hall', 'nor in the first moments of the copy room');
  R.beatT = BEATS[2].minT; update(1 / 60);
  check(R.phase === 'wake' && R.noPops, 'enough souls in the copy room wake the far wall');
  step(1.6);
  check(R.boss.st === 'awake' && R.speed < .02, 'the hall stops and its eyes light up');
  R.hearts = TUNE.hearts - 1; R.pickups = [];
  step(6);
  check(R.phase === 'boss' && R.boss.st === 'fight', 'then it fights');
  check(R.pickups.some(p => p.kind === 'coffee'), 'with a coffee to start, a heart down');

  const b = R.boss;
  R.projs = []; R.flies = []; R.shots = []; bull.u = 0; bull.inv = 99; R.pull.next = 1e9; b.atk = 1e9;
  const hp0 = b.hp; keys.kbShoot = true; step(1); keys.kbShoot = false;
  check(b.hp < hp0 && b.hp > hp0 - 3, 'the blaster chips at it');

  step(.5); R.shots = [];
  const hp1 = b.hp, bundle = launch('bundle', { u: 0, z: .4, h: .1 }, { u: 0, z: bull.bz, h: .12 }, .8, { w: .08, hh: .05 });
  for (let i = 0; i < 60 && bundle.z > bull.bz + .15; i++) update(1 / 60);
  bull.cd = 0; press('slash'); step(1.2);
  check(near(b.hp, hp1 - TUNE.bundleDmg), 'a deflected bundle lands in its mouth for heavy damage');

  b.hp = 60; update(1 / 60);
  check(b.ph === 2, 'phase two below two thirds');
  R.projs = []; R.talk = null; b.atk = 0; b.atkN = 0; update(1 / 60);
  check(R.projs.filter(p => p.kind === 'staple').length === 4, 'phase two spits staple fans with one gap');
  R.projs = []; b.hp = 30; update(1 / 60);
  check(b.ph === 3, 'phase three below a third');

  R.projs = []; R.talk = null; R.pull.st = 'on'; R.pull.t = 0; R.pull.dur = 5;
  bull.u = 0; bull.bz = 0; bull.jh = 0; bull.cd = 0;
  press('slash'); update(1 / 60);
  check(b.jam > 0 && R.events.jams === 1 && R.pull.st === 'idle', 'cutting the rug in phase three jams it');
  b.atk = 0; update(1 / 60);
  check(!R.projs.length, 'a jammed shredder cannot spit');
  const hp2 = b.hp;
  R.shots.push({ u: 0, z: .95, h: .2, tgt: null, dead: false }); update(1 / 60);
  check(near(hp2 - b.hp, TUNE.shotDmg * TUNE.jamMult), 'jammed, the blaster does triple damage');

  b.jam = 0; b.hp = .1;
  R.shots.push({ u: 0, z: .95, h: .2, tgt: null, dead: false }); update(1 / 60);
  check(R.phase === 'win' && b.st === 'dead', 'out of health, the Shredder is beaten');
  const souls = R.souls; step(6.5);
  check(R.souls === souls + TUNE.bossSouls, 'its souls come out one at a time');
  check(state === 'over' && !card.hidden && cardTitle.textContent === 'Floor 13 clear' && goBtn.textContent === 'Play again', 'the clear card shows');
  check(JSON.parse(localStorage.getItem('unruggabull-ii-best')).souls === R.souls, 'the best is saved');
  check(cardStats.textContent.includes('Time'), 'the card shows the time');
})();
