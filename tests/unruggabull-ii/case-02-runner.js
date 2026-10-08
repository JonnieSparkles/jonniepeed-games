// The runner rug: pulls start in the second half, drag you while you stand on it, and stop when you cut it.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  seed = 202; startRun();
  R.cubs = []; R.nextCubW = 1e9; R.nextFly = 1e9; R.nextBox = 1e9; R.fireT = 1e9;
  step(2);
  check(R.pull.st === 'idle', 'no pulls early in the hall');
  R.t = TUNE.pullsFrom; update(1 / 60);
  check(R.pull.st === 'warn', 'the runner warns before it pulls');
  step(1);
  check(R.pull.st === 'on' && R.banner && R.banner.pull && R.banner.text === 'STEP OFF THE RUG', 'the first pull shows a prompt');
  bull.u = 0; step(.5);
  check(bull.bz > .1, 'standing on the runner drags you toward the shredder');
  bull.u = .5; step(.5);
  check(bull.bz < .01, 'stepping off lets you walk back');
  bull.u = 0; step(.3);
  const z = bull.bz; bull.cd = 0; press('slash'); update(1 / 60);
  check(z > .05 && R.pull.st === 'cut' && R.cut && R.events.cuts === 1, 'slashing on the runner cuts the rug');
  step(1);
  check(R.pull.st === 'idle' && bull.bz < .05 && !R.banner, 'a cut rug stops pulling and the prompt goes');

  R.pull.next = 0; step(1);
  check(R.pull.st === 'on', 'the next pull');
  R.pull.dur = 9; bull.u = 0; bull.inv = 0;
  const hearts = R.hearts;
  step(3.2);
  check(R.hearts === hearts - 2 && R.events.dragged === 1, 'riding it all the way in costs two hearts');
  step(1.6);
  check(bull.bz === 0 && !bull.mouth && !bull.spat && R.pull.st === 'idle', 'then the shredder spits you back out');
})();
