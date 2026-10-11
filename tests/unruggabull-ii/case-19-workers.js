// Carpshits at work: they line the hall from far down it, each section with its own (the copier only in the copy room),
// the stations leave them room, the blaster leans to them, a shot frees the soul inside (double in the dark), and they
// never fight back.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  RUN.force = 1919; startRun(); bull.inv = 1e9;
  check(R.workers.length > 0 && R.workers.some(wk => wk.w - R.dist > 2.5), 'carpshits at work line the hall from far down it');
  check(R.workers.every(wk => BEATS[0].work.includes(wk.kind)), "Accounts Payable's own: typing, on calls, asleep, at the cooler, an office");
  for (const wk of R.workers) check(!R.cubs.some(cb => cb.s === wk.s && Math.abs(cb.w - wk.w) < .2), 'no station where one sits');
  draw();
  // the blaster leans to one in reach, and a shot frees its soul
  R.cubs = []; R.flies = []; R.nextFly = 1e9; R.nextCubW = R.dist + 1e9; R.workers = []; R.nextWorkW = R.dist + 1e9;
  addWorker(R.dist + .6);
  const wk = R.workers[0], c = wk.carps[0], souls = R.souls, hearts = R.hearts;
  bull.u = wk.s * .5; keys.kbShoot = true;
  for (let i = 0; i < 180 && !c.dead; i++) update(1 / 60);
  keys.kbShoot = false;
  check(c.dead && R.souls === souls + 1, 'a shot frees its soul (' + (R.souls - souls) + ')');
  check(R.hearts === hearts, 'and it never fought back');
  draw();
  // in the dark, double
  R.beat = 1; startEvent('dark'); R.flies = []; R.event.nextFly = 1e9; R.event.nextForm = 1e9; R.event.nextSwitch = 1e9;
  R.workers = []; addWorker(R.dist + .6);
  const d = R.workers[0].carps[0], before = R.souls;
  bull.u = R.workers[0].s * .5; keys.kbShoot = true;
  for (let i = 0; i < 180 && !d.dead; i++) update(1 / 60);
  keys.kbShoot = false;
  check(d.dead && R.souls === before + 2, 'in the dark, one frees two (' + (R.souls - before) + ')');
  draw();
  // the copy room's own
  R.event = null; R.beat = 2; R.workers = [];
  for (let i = 0; i < 20; i++) addWorker(R.dist + 1 + i);
  check(R.workers.some(wk => wk.kind === 'copier') && R.workers.every(wk => BEATS[2].work.includes(wk.kind)), 'the copy room has them copying themselves');
  draw();
})();
