// More captives, exact return/dawn counts, openings that come from attacks and moving on the grid.
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
  // Openings come from attacks, never from a clock.
  fresh('round1'); R.roof.atk.wait = 1e9; R.roof.hatchLeft = 0;
  tick(30); check(R.roof.stall === 0, 'a clock alone cannot open the eye');
  R.roof.atk.wait = 0; for (let i = 0; i < 600 && R.roof.atk.stage !== 'heat'; i++) update(1 / 60);
  check(R.roof.stall > 0, 'a real attack completed opens the eye');
  // Moving: one tile a step, repeating while held, never off the grid.
  fresh('round1'); R.roof.atk.wait = 1e9; floor.placeBull(2, 0);
  keys.kbLeft = true; tick(1); keys.kbLeft = false;
  check(R.roof.at.c === 0 && bull.jh === 0, 'held left steps to the edge and stops there');
  keys.kbUp = true; tick(1); keys.kbUp = false; tick(.5);
  check(R.roof.at.r === 2 && Math.abs(bull.bz - floor.tileZ(2)) < 1e-9 && Math.abs(bull.u - floor.tileU(0)) < 1e-9, 'up steps up the rows and he slides to the tile middle');
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
