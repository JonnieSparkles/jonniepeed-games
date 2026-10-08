// The hall's three beats, the events between them, signs, and the souls meter.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  seed = 505; startRun(); bull.inv = 1e9;
  check(R.beat === 0 && R.signs.length === 1 && beat().sign === 'ACCOUNTS PAYABLE', 'the floor opens in Accounts Payable with its sign');
  check(R.cubs.every(cb => cb.kind === 'cub'), 'cubicles line the hall');
  step(BEATS[0].time - .1);
  check(R.decor.some(d => d.kind === 'poster' || d.kind === 'cooler'), 'posters and water coolers dress the walls');
  step(.2);
  check(R.event && R.event.kind === 'audit' && R.banner.text === 'AUDIT!', 'then an audit');
  step(1.5);
  const up = R.cubs.filter(cb => { const z = cubZ(cb); return cb.temp && !cb.temp.dead && z > .3 && z < .9 && cb.temp.st !== 'hidden'; }).length;
  check(up >= 3, 'every temp in view stands up (' + up + ')');
  step(TUNE.eventT);
  check(!R.event && R.beat === 1 && beat().sign === 'ALL STAFF' && R.signs.some(sg => sg.w > R.dist), 'All Staff comes next, with its sign');
  step(6);
  check(R.flies.filter(f => f.form).length >= 4, 'carpshits arrive in formations');
  step(BEATS[1].time - 6 + .1);
  check(R.event && R.event.kind === 'dark', 'then the lights go out');
  step(1.5);
  check(darkness() > .5, 'and the hall is dark');
  step(TUNE.eventT);
  check(!R.event && darkness() === 0 && beat().sign === 'COPY ROOM', 'the lights come back in the copy room');
  step(3);
  check(R.cubs.some(cb => cb.kind === 'copier'), 'copiers replace the cubicles');
  check(R.pull.st !== 'idle' || R.pull.count > 0 || R.pull.next <= R.t + 1, 'the runner starts pulling');
  R.souls = 30; draw();
  check(R.phase === 'hall', 'the meter fills toward the Shredder');
  step(BEATS[2].max);
  check(R.phase !== 'hall', 'the copy room ends at its time limit even short of the goal');
})();
