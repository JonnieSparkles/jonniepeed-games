// Formation wipes, lights out's formations, the forced power surge (the blaster into its mouth, kept there through a
// won rally), the rewind attack (it pins you), and the rug-pull death.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 1212; startRun(); bull.inv = 1e9;
  const quiet = () => { R.cubs = []; R.flies = []; R.projs = []; R.boxes = []; R.rows = []; R.pickups = []; R.nextFly = 1e9; R.nextBox = 1e9; R.nextRow = 1e9; R.nextCubW = R.dist + 1e9; R.freeze = 0; };

  // wipe out a whole formation: a bonus soul for each carpshit in it
  quiet(); spawnFormation('line');
  const line = R.flies.slice(), n = line.length, souls = R.souls;
  for (const f of line) killFly(f, 'shot');
  check(R.events.wipes === 1 && R.souls === souls + n * 2, 'wiping out a line of ' + n + ' pays ' + n + ' bonus souls');
  check(R.fx.some(f => f.k === 'pop' && f.text.includes('WIPED OUT')) && !R.fx.some(f => f.k === 'big'), 'with a pop, not a big moment, in the hall');
  draw();
  // one that gets halfway down the hall spoils it
  quiet(); spawnFormation('v');
  const v = R.flies.slice(); v[0].z = TUNE.wipeBy - .02; R.freeze = 0; update(1 / 60);
  for (const f of R.flies) killFly(f, 'shot');
  check(R.events.wipes === 1, 'a formation with one past halfway is not a wipe');

  // lights out sends formations every couple of seconds
  quiet(); R.beat = 1; R.beatT = BEATS[1].time; update(1 / 60); if (R.event && R.event.kind === 'rush') { R.flies = []; R.event.t = R.event.dur; update(1 / 60); R.lull = 1e-9; update(1 / 60); } 
  check(R.event && R.event.kind === 'dark', 'lights out');
  const forms = new Set(); for (let i = 0; i < 60 * 6; i++) { update(1 / 60); for (const f of R.flies) if (f.fid) forms.add(f.fid); }
  check(forms.size >= 3, 'formations keep coming in the dark (' + forms.size + ' in 6 seconds)');
  // a wipe in the dark is a big moment
  R.fx = []; spawnFormation('line'); for (const f of R.flies.filter(f => f.z > .9)) killFly(f, 'shot');
  check(R.fx.some(f => f.k === 'big' && f.text.includes('WIPED OUT')), 'a wipe in the dark gets the big moment');

  // to the Shredder, phase 3: a surge it can't miss pulls the blaster into its mouth
  RUN.force = 1213; startRun(); bull.inv = 1e9; R.beat = 2; R.beatT = BEATS[2].minT; R.souls = TUNE.goal;
  for (let i = 0; i < 60 * 14 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  R.pull.next = 1e9; b.hp = 30; update(1 / 60);
  check(b.ph === 3 && b.surgeAt > 0, 'phase 3 lines up a surge');
  bull.u = .45; bull.jh = 0; b.atk = 1e9;
  for (let i = 0; i < 90 && R.armed !== false; i++) { b.atk = 1e9; update(1 / 60); }
  check(R.armed === false && b.gun && !R.pickups.some(pk => pk.kind === 'blaster') && R.fx.some(f => f.k === 'toss' && f.tx), 'the surge pulls the blaster out of his hands and into its mouth');
  check(R.talk && R.talk.text === 'CONFISCATED.' && R.banner && R.banner.text === 'KNOCK ITS PAPER BACK', 'it says so, with a prompt, the first time');
  step(TUNE.surgeFly + .1); draw();
  R.events.shots = 0; R.fireT = 0; keys.kbShoot = true; step(.5); keys.kbShoot = false;
  check(!R.events.shots && !R.shots.length, 'no blaster, no shots');
  // win a rally: a smash, but the blaster stays in its teeth
  bull.u = 0; bull.bz = 0; R.projs = []; b.rally = null; b.jam = 0; b.dark = null; R.talk = null; R.banner = null;
  b.atkN = 0; b.atk = 0; update(1 / 60);
  check(b.rally, 'a rally');
  b.rally.target = 0;
  const ball = R.projs.find(p => p.rally), hp = b.hp;
  for (let i = 0; i < 300 && ball.z > bull.bz + .15; i++) update(1 / 60);
  bull.cd = 0; press('slash'); update(1 / 60);
  for (let i = 0; i < 120 && !R.events.smashes; i++) update(1 / 60);
  check(R.events.smashes >= 1 && b.hp < hp, 'the smash hurts it');
  check(R.armed === false && b.gun && !R.hint, 'and the blaster stays in its teeth until the finish');

  // the rewind attack rolls the rug back and spits a bundle at you; you're pinned at the back while it rolls
  b.surgeAt = 0; R.projs = []; R.roll = null; b.jam = 0; b.rally = null; R.pull.st = 'idle'; R.pull.next = 1e9;
  bull.u = 0; b.atkN = ATTACKS[2].indexOf('rewind'); b.atk = 0; update(1 / 60);
  check(R.roll && R.projs.some(p => p.kind === 'bundle'), 'rewind: the rug rolls back and a bundle comes');
  update(1 / 60);
  check(bull.pin > 0, 'pinned at the back while it rolls');
  const u0 = bull.u; keys.kbLeft = true; step(.2); keys.kbLeft = false;
  check(bull.u === u0, 'no sidestepping while pinned');
  draw();

  // rugged: the rug is yanked out, he kneels and flickers out, and his bull's soul rises
  R.roll = null; bull.inv = 0;
  for (let i = 0; i < TUNE.hearts; i++) { bull.inv = 0; hurtBull(1, 'bundle'); }
  check(R.phase === 'dead', 'rugged');
  const roff = R.roff; step(.2);
  check(R.roff > roff + .3, 'the rug is yanked out from under him');
  for (const t of [.3, .6, 1]) { while (R.phaseT < t) update(1 / 60); draw(); }
  check(R.events.said.rugged && LINES.rugged === 'WHOA!', 'WHOA!');
  step(1.2); draw();
  check(R.phase === 'dead' && state !== 'over' && R.soulAt && R.soulAt[1] > R.soulAt[3], 'his soul rises, and the card waits for it (' + [state, R.phase, R.phaseT.toFixed(2)] + ')');
  step(TUNE.deadWait);
  check(state === 'over', 'then the card');
})();
