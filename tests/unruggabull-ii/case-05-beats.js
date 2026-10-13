// The hall's three beats, the events between them, signs, and the souls meter.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 505; startRun(); bull.inv = 1e9;
  check(R.beat === 0 && R.signs.length === 1 && beat().sign === 'ACCOUNTS PAYABLE', 'the floor opens in Accounts Payable with its sign');
  check(R.cubs.every(cb => cb.kind === 'cub'), 'cubicles line the hall');
  step(BEATS[0].time - .1);
  check(new Set(setItems().filter(it => it.layer === 'wall').map(it => it.kind)).size >= 3, 'rugs, posters, clocks and the like dress the walls');
  step(.2);
  check(R.event && R.event.kind === 'move' && R.signs.some(sg => sg.text === 'MOVING DAY') && !(R.banner && !R.banner.pull), 'then moving day, announced by a sign, not a banner');
  step(4);
  check(!R.flies.length && !R.cubs.some(cb => cb.temp && cb.temp.st === 'up'), 'nobody to shoot: no carpshits, the temps stay down');
  R.fireT = 0; R.events.shots = 0; keys.kbShoot = true; step(.5); keys.kbShoot = false;
  check(R.events.shots > 0, 'the blaster still fires');
  check(R.rows.some(rw => rw.kind === 'beam' || rw.kind === 'chairs'), 'furniture fills the hall');
  for (let i = 0; i < 60 * TUNE.moveT && R.event; i++) update(1 / 60);
  check(!R.event && R.beat === 1 && beat().sign === 'ALL STAFF' && R.signs.some(sg => sg.w > R.dist), 'All Staff comes next, with its sign');
  step(2);
  check(!R.flies.some(f => f.form), 'a breather while the section\'s sign drops');
  step(2);
  check(R.flies.filter(f => f.form).length >= 4, 'then carpshits arrive in formations');
  step(BEATS[1].time - 4 - .5);
  R.flies = []; spawnFormation('line'); step(.6);
  check(!R.event && R.beatT > BEATS[1].time, 'the lights stay on while a formation is still coming');
  R.flies = []; update(1 / 60);
  check(R.event && R.event.kind === 'rush' && R.event.dur === TUNE.rushT && R.signs.some(sg => sg.text === 'RUSH HOUR'), 'then rush hour, with its sign');
  check(R.pickups.some(pk => pk.kind === 'spread'), 'and a Spread Shot to meet it with');
  const fl0 = R.flies.length; step(TUNE.rush.first + .1);
  check(R.flies.length > fl0 && R.flies.some(f => f.cause === 'rush' && f.hp === 1), 'carpshits pour down the hall, one hit each');
  const cubsUp = () => R.cubs.some(cb => cb.temp && cb.temp.st !== 'hidden');
  let waves = 0, seen = new Set(); for (let i = 0; i < 60 * 6; i++) { update(1 / 60); for (const f of R.flies) if (f.cause === 'rush' && !seen.has(f)) { seen.add(f); waves++; } }
  check(waves >= 10 && !cubsUp(), 'wave after wave (' + waves + ' in 6 s), and the temps stay down');
  R.flies = []; R.event.t = R.event.dur - .01; const s0 = R.souls; update(1 / 60);
  check(R.event && R.event.kind === 'dark', 'then the lights go out');
  step(1.5);
  check(darkness() > .5, 'and the hall is dark');
  step(TUNE.darkT);
  check(!R.event && darkness() === 0 && beat().sign === 'COPY ROOM', 'the lights come back in the copy room');
  step(3);
  check(R.cubs.some(cb => cb.kind === 'copier'), 'copiers replace the cubicles');
  check(R.pull.st !== 'idle' || R.pull.count > 0 || R.pull.next <= R.t + 1, 'the runner starts pulling');
  R.souls = 30; draw();
  check(R.phase === 'hall', 'the meter fills toward the Shredder');
  // no desk is left standing in front of the Shredder: none spawn once it could wake before one passes
  const sv = R.souls, bt = R.beatT; R.souls = TUNE.goal - 5; R.beatT = BEATS[2].minT - 2; R.boxes = []; R.nextBox = 0;
  for (let i = 0; i < 30; i++) update(1 / 60);
  check(!R.boxes.length, 'no new desks with the Shredder about to wake');
  R.souls = sv; R.beatT = bt;
  step(BEATS[2].max);
  check(R.phase !== 'hall', 'the copy room ends at its time limit even short of the goal');
})();
