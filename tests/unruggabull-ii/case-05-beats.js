// The hall's three beats, the events between them, signs, and the souls meter.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 505; startRun(); bull.inv = 1e9;
  check(R.beat === 0 && R.signs.length === 1 && beat().sign === 'ACCOUNTS PAYABLE', 'the floor opens in Accounts Payable with its sign');
  check(R.cubs.every(cb => cb.kind === 'cub'), 'cubicles line the hall');
  step(BEATS[0].time - .1);
  check(new Set(R.decor.map(d => d.kind)).size >= 3, 'posters, clocks, windows and the like dress the walls');
  step(.2);
  check(R.event && R.event.kind === 'move' && R.signs.some(sg => sg.text === 'MOVING DAY') && !(R.banner && !R.banner.pull), 'then moving day, announced by a sign, not a banner');
  step(4);
  check(!R.flies.length && !R.cubs.some(cb => cb.temp && cb.temp.st === 'up'), 'nobody to shoot: no carpshits, the temps stay down');
  R.fireT = 0; R.events.shots = 0; keys.kbShoot = true; step(.5); keys.kbShoot = false;
  check(!R.events.shots, 'and the blaster stays holstered');
  check(R.boxes.some(bx => bx.tall) || R.rows.some(rw => rw.kind === 'beam' || rw.kind === 'chairs'), 'furniture fills the hall');
  for (let i = 0; i < 60 * TUNE.moveT && R.event; i++) update(1 / 60);
  check(!R.event && R.beat === 1 && beat().sign === 'ALL STAFF' && R.signs.some(sg => sg.w > R.dist), 'All Staff comes next, with its sign');
  step(3);
  check(R.flies.filter(f => f.form).length >= 4, 'carpshits arrive in formations');
  step(BEATS[1].time - 3 - .5);
  R.flies = []; spawnFormation('line'); step(.6);
  check(!R.event && R.beatT > BEATS[1].time, 'the lights stay on while a formation is still coming');
  R.flies = []; update(1 / 60);
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
  step(BEATS[2].max);
  check(R.phase !== 'hall', 'the copy room ends at its time limit even short of the goal');
})();
