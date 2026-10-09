// Lights out x2, streak drops, the Shredder's intro, steady pulls and jams in any phase, the rally waiting for a
// pull, power saving mode, continuing at the Shredder, and the clear card's stats.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const quiet = () => { R.cubs = []; R.flies = []; R.projs = []; R.boxes = []; R.rows = []; R.pickups = []; R.nextFly = 1e9; R.nextBox = 1e9; R.nextRow = 1e9; R.nextCubW = R.dist + 1e9; };

  // lights out: ten seconds, eyes keep coming, and every kill in the dark frees two souls
  RUN.force = 909; startRun(); bull.inv = 1e9;
  R.beat = 1; R.beatT = BEATS[1].time; R.flies = []; update(1 / 60);
  check(R.event && R.event.kind === 'dark' && R.event.dur === TUNE.darkT, 'lights out lasts ' + TUNE.darkT + ' seconds');
  check(R.signs.some(sg => sg.neon && sg.text.startsWith('LIGHTS OUT')), 'with a neon sign');
  R.flies = []; step(3);
  check(R.flies.some(f => !f.form), 'carpshits keep coming out of the dark');
  R.flies = []; R.projs = [];
  const f = { u: bull.u, z: bull.bz + .1, h: .14, hp: 1, ph: 0, hit: 0, dead: false };
  R.flies.push(f); const souls = R.souls;
  bull.cd = 0; press('slash'); update(1 / 60);
  check(f.dead && R.souls === souls + 2, 'a kill in the dark frees two souls');
  step(TUNE.darkT);
  check(!R.event && R.beat === 2, 'then the copy room');

  // a streak of ten in the hall drops a Spread Shot
  quiet(); R.streakT = 0; R.event = null;
  for (let i = 0; i < TUNE.streakDrop; i++) { R.flies.push({ u: bull.u, z: bull.bz + .1, h: .14, hp: 1, ph: 0, hit: 0, dead: false }); bull.cd = 0; press('slash'); update(1 / 60); step(.35); }
  check(R.bestStreak >= TUNE.streakDrop && R.pickups.some(pk => pk.kind === 'spread'), 'a streak of ' + TUNE.streakDrop + ' drops a Spread Shot');

  // the Shredder's intro: a name card, and its bar ticks up to full
  quiet(); R.souls = TUNE.goal; R.beatT = BEATS[2].minT; update(1 / 60);
  check(R.phase === 'wake' && checkpoint && checkpoint.souls === R.souls, 'waking it saves a checkpoint');
  step(1.6);
  check(R.banner && R.banner.text === 'THE SHREDDER', 'it gets a name card');
  step(1.5);
  check(R.boss.bar === 1, 'and its health bar fills');
  for (let i = 0; i < 60 * 10 && R.phase !== 'boss'; i++) update(1 / 60);
  const b = R.boss;
  check(b.st === 'fight', 'then it fights');

  // steady pulls from phase 1, and cutting the rug jams it in any phase
  R.projs = []; bull.u = 0; bull.inv = 1e9; R.talk = null;
  for (let i = 0; i < 60 * 8 && R.pull.st !== 'on'; i++) update(1 / 60);
  check(b.ph === 1 && R.pull.st === 'on', 'the runner pulls in phase 1');
  bull.u = 0; bull.cd = 0; press('slash'); update(1 / 60);
  check(b.jam > 0, 'and cutting it jams the Shredder in phase 1 too');
  b.jam = 0; step(.8);
  check(R.pull.st === 'idle' && R.pull.next - R.t <= TUNE.bossPull.gap[0] + .01, 'the next pull is on the beat');

  // phase 3: the lights go out, and a rally waits for a pull to end
  R.projs = []; b.hp = 30; update(1 / 60);
  check(b.ph === 3 && b.dark && Snd.track === 'dark', 'phase 3 starts in power saving mode');
  step(.8);
  check(darkness() > .5, 'and it is dark');
  R.projs = []; b.atk = 0; b.atkN = 0; R.pull.st = 'on'; R.pull.t = 0; R.pull.dur = 2; bull.u = .5; update(1 / 60);
  check(!b.rally, 'the rally waits while the runner pulls');
  step(2.2);
  check(b.rally || R.projs.some(p => p.rally), 'and comes once the pull ends');
  b.rally = null; R.projs = [];
  step(TUNE.powerSaveT);
  check(!b.dark && darkness() === 0 && Snd.track === 'shred', 'then the lights come back');

  // beaten at the Shredder: continue from the fight with full hearts, or start the floor over
  const atSouls = checkpoint.souls;
  bull.inv = 0; for (let i = 0; i < TUNE.hearts; i++) { bull.inv = 0; hurtBull(1, 'bundle'); }
  step(2.2);
  check(state === 'over' && cardTitle.textContent === 'Rugged.' && goBtn.textContent === 'Continue' && !altBtn.hidden && altBtn.textContent === 'Restart floor', 'beaten by the Shredder, you can continue there or restart');
  goBtn.click();
  check(state === 'play' && R.phase === 'wake' && R.hearts === TUNE.hearts && R.souls === atSouls && R.continues === 1, 'continue picks up at the Shredder with full hearts');
  for (let i = 0; i < 60 * 10 && R.phase !== 'boss'; i++) update(1 / 60);
  check(R.boss.st === 'fight' && R.boss.hp === TUNE.bossHP, 'and the fight starts over');

  // the clear card shows the run's stats; a clear with continues doesn't set the fastest time
  const bestTime = (JSON.parse(localStorage.getItem('unruggabull-ii-best') || '{}').time) || 0;
  R.events.deflects = 7; R.events.smashes = 2; R.bestStreak = 9;
  R.boss.hp = .1; R.shots.push({ u: 0, z: .95, h: .2, tgt: null, dead: false }); update(1 / 60);
  step(5);
  const text = cardStats.textContent;
  check(state === 'over' && cardTitle.textContent === 'Floor 13 clear', 'cleared');
  check(text.includes('Deflects7') && text.includes('Best streak9') && text.includes('Smashes2') && text.includes('Continues1'), 'the clear card shows deflects, best streak, smashes and continues: ' + text);
  check(((JSON.parse(localStorage.getItem('unruggabull-ii-best')).time) || 0) === bestTime, 'a clear with continues does not set the fastest time');

  // dying in the hall still starts the floor over
  RUN.force = 910; startRun();
  check(!checkpoint, 'a new floor clears the checkpoint');
  for (let i = 0; i < TUNE.hearts; i++) { bull.inv = 0; hurtBull(1); }
  step(2.2);
  check(altBtn.hidden && goBtn.textContent === 'Continue', 'rugged in the hall: continue starts over');
  goBtn.click();
  check(R.phase === 'hall' && R.souls === 0 && R.continues === 0, 'from the top');
})();
