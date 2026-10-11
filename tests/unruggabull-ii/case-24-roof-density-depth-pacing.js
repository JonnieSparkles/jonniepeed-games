// More captives, exact return/dawn counts, reachable predictions and openings paced independently of HP.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const tick = s => { for (let i = 0; i < Math.ceil(s * 60); i++) update(1 / 60); };
  const fresh = state => { RUN.force = 42; checkpoint = null; newRun(null, 'roof'); setState('play'); clearHeld(); input.jump = input.slash = input.shoot = 0; floor.enter(state); bull.inv = 1000; };
  fresh('walk');
  const rt = floor.ROOF;
  check(R.roof.caught === rt.initialCaught && R.souls === rt.initialCaught, 'earlier-floor captives hang from the walk and are already counted');
  R.roof.caught = 240; floor.effects.reset(240); floor.enter('wake');
  const image = g.drawImage; let ghosts = 0;
  g.drawImage = function (img, ...args) { if (img === A.GHOST) ghosts++; return image.call(this, img, ...args); };
  floor.drawWarp(); g.drawImage = image;
  check(ghosts === 240, 'warp draws every captive, with no sample or sprite cap');
  const slots = rt.art.warpColumns * rt.art.warpRows;
  check(slots >= 50 && slots <= 70, 'rows have 50–70 distinct thread gaps before shallow overlapping layers');
  for (let i = 0; i < 240; i++) {
    const p = floor.soulSpot(i);
    check(p.x > rt.art.left && p.x + A.uw(A.GHOST) * rt.art.soulScale < rt.art.right && p.y > rt.art.beam && p.y + A.uh(A.GHOST) * rt.art.soulScale < rt.art.cloth, 'each hanging sprite fits within the warp');
  }
  for (let n = 1; n <= 3; n++) {
    fresh('round' + n); tick(rt.firstFly + .05);
    check(R.flies.length === rt.flyGroup[n - 1], 'round ' + n + ' launches its small group');
    check(rt.flyEvery[n - 1] < [3.2, 2.8, 2.2][n - 1], 'carps arrive more frequently');
  }
  fresh('round1');
  keys.kbUp = true; tick(1); keys.kbUp = false;
  check(bull.bz === rt.depthMax && !bull.crouch && bull.jh === 0, 'held up walks forward within the roof band');
  tick(.2); check(bull.bz === rt.depthMax, 'letting go holds his depth');
  keys.kbDown = true; tick(1); keys.kbDown = false;
  check(bull.bz === 0 && !bull.crouch, 'held down walks back to the near edge');
  R.flies = []; R.roof.nextFly = 100;
  floor.volley();
  check(R.roof.rings.every(r => r.z === rt.ringZ && FY(r.z) + 4 < H && FY(r.z) - 14 > 0), 'ring dots and labels are raised and wholly on canvas');
  const ring = R.roof.rings[0], hearts = R.hearts;
  bull.inv = 0; bull.u = ring.u; tick(3.1);
  check(R.hearts === hearts, 'an orb landing up the roof does not hit him at its near edge');
  check(R.roof.stall === 0, 'early volleys do not prematurely open the eye');
  floor.volley(); bull.bz = rt.ringZ; bull.u = R.roof.rings[0].u; bull.inv = 0; tick(3.1);
  check(R.hearts < hearts && R.lastCause === 'orb', 'moving up into a ring makes its orb collision real');
  fresh('round1'); R.roof.nextFly = 100; R.roof.nextVolley = 100;
  tick(rt.roundLengths[0] / rt.openings[0]);
  check(R.roof.stall === 0, 'a clock alone cannot create a damage window');
  floor.volley(); tick(3.1);
  check(R.roof.stall > 0, 'a completed volley opens the eye after the paced interval');
  // Exact flight schedules: all three bells and every remaining soul arrive once, never added to score twice.
  fresh('return');
  const oldEmit = emitHook; let returned = 0;
  emitHook = (type, data) => { if (type === 'roof_return') returned += data.amount; };
  const count = 240; R.roof.caught = R.roof.capturedTotal = count; R.souls = R.shown = count; floor.effects.reset(count);
  floor.enter('return'); tick(rt.time.return + .02);
  check(R.roof.state === 'flood' && R.roof.flights.length === count - rt.spools, 'every soul after the three bells gets its own flood flight');
  tick(1.5);
  ghosts = 0; g.drawImage = function (img, ...args) { if (img === A.GHOST) ghosts++; return image.call(this, img, ...args); };
  floor.glows(); g.drawImage = image;
  check(ghosts > 0 && ghosts <= rt.art.flightCap * 4, 'flood draws at most 96 souls with three faint trail stamps each, while every flight remains scheduled');
  ghosts = 0; g.drawImage = function (img, ...args) { if (img === A.GHOST) ghosts++; return image.call(this, img, ...args); };
  floor.drawWarp('souls'); g.drawImage = image;
  check(ghosts === 0, 'by one second every soul has left its actual warp slot, even before all arrivals');
  const before = JSON.stringify(R.roof), seeded = seed; draw(); draw();
  check(JSON.stringify(R.roof) === before && seed === seeded, 'drawing individual flights changes no outcomes');
  tick(rt.time.flood - 1.5 + .02);
  check(R.roof.caught === 0 && R.souls === count && returned === count, 'all caught souls reach the gun exactly once without changing the counter');
  floor.enter('dawn');
  check(R.roof.dawnCount === count && R.fx.filter(f => f.k === 'rise').length === count, 'dawn raises the same full captured population');
  tick(rt.time.dawn + .1); check(R.souls === count, 'dawn never counts earlier-floor souls twice');
  emitHook = oldEmit;
  RUN.force = null; checkpoint = null; newRun(); setState('title'); showCard('title');
})();
