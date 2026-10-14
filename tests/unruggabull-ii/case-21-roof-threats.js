// The fight's threats on the grid: warp and weft, the high weft ducked, hallucinations, the opening, carpet's grip,
// the slash that reclaims (and whiffs), fixed carpshits, the snap's thread whip, and drawing that changes nothing.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const tick = s => { for (let i = 0; i < Math.ceil(s * 60); i++) update(1 / 60); };
  const rt = floors.roof.ROOF, F = rt.fight, G = rt.grid;
  function fresh(n = 1) { RUN.force = 42; checkpoint = null; newRun(null, 'roof'); RUN.force = null; setState('play'); clearHeld(); input.jump = input.slash = input.shoot = 0; floor.enter('round' + n); R.roof.hatchLeft = 0; R.roof.spreadT = 1e9; floor.placeBull(2, 0); }
  const tile = (c, r) => R.roof.tiles[r * G.cols + c];
  // one attack of our own: lasers [{k, i, real, c, r}] warned now, firing in half a second
  function attack(list) {
    const q = R.roof, made = list.map(l => Object.assign({ t0: 0, t1: .5, dir: 1, done: -1, fired: false, told: false, lay: true }, l));
    q.atk = { stage: 'run', t: 0, list: made, end: Math.max(...made.map(l => l.t1 + floor.lenOf(l))), set: false, real: made.some(l => l.real), open: F.open };
  }
  fresh(); attack([{ k: 'col', i: 2, real: true }]);
  tick(.45); check(R.hearts === 5, 'a warning does no damage');
  tick(.6);
  check(R.hearts === 4 && R.lastCause === 'laser', 'a warp through his tile costs a heart');
  check([0, 1, 2].every(r => tile(2, r).carpet) && !tile(1, 0).carpet, 'a real warp stitches carpet down its column');
  tick(.1); check(R.roof.stall > 0 && R.roof.atk.stage === 'heat', 'after a real attack the eye overheats');
  fresh(); attack([{ k: 'col', i: 2, real: true }, { k: 'row', i: 0, real: true }]);
  keys.kbRight = true; tick(1 / 60); keys.kbRight = false; tick(.15); keys.kbUp = true; tick(1 / 60); keys.kbUp = false; tick(1);
  check(R.roof.at.c === 3 && R.roof.at.r === 1 && R.hearts === 5, 'warp and weft crossing on him: a diagonal step clears it');
  fresh(); attack([{ k: 'high', i: 0, real: true }]);
  keys.kbDuck = true; tick(1.1); keys.kbDuck = false;
  check(R.hearts === 5 && !tile(2, 0).carpet, 'ducking passes under a high weft, which lays no carpet');
  fresh(); attack([{ k: 'high', i: 0, real: true }]); tick(1.1);
  check(R.hearts === 4, 'standing, the high weft hits');
  fresh(); attack([{ k: 'col', i: 2, real: false }, { k: 'tile', c: 2, r: 0, real: false }]); tick(1.1);
  check(R.hearts === 5 && !tile(2, 0).carpet && R.roof.stall === 0 && R.roof.atk.stage === 'idle', 'hallucinations do nothing, and open nothing');
  fresh(); attack([{ k: 'tile', c: 2, r: 0, real: true, lay: false }]); tick(.8);
  check(R.hearts === 4 && R.lastCause === 'stitch', 'a needle on his tile hurts');
  // Carpet under him warns, then pulls the rug; the slash reclaims his tile and the tiles either side.
  fresh(); R.roof.atk.wait = 1e9; tile(2, 0).carpet = true;
  tick(F.grip - .15); check(R.hearts === 5 && tile(2, 0).grip > 0, 'carpet under him grips first, a visible warning');
  tick(.3); check(R.hearts === 4 && R.lastCause === 'pull' && !tile(2, 0).carpet, 'after a second it pulls the rug: a heart');
  fresh(); R.roof.atk.wait = 1e9; for (const c of [0, 1, 2, 3, 4]) tile(c, 0).carpet = true; tile(2, 1).carpet = true;
  press('slash'); tick(.1);
  check(!tile(1, 0).carpet && !tile(2, 0).carpet && !tile(3, 0).carpet && tile(0, 0).carpet && tile(4, 0).carpet && tile(2, 1).carpet, 'a slash reclaims his tile and its neighbours on his row');
  check(!(bull.pin > 0), 'a slash that reclaims never roots him');
  fresh(); R.roof.atk.wait = 1e9; tick(.4); press('slash'); tick(.05);
  check(bull.pin > 0, 'a slash on bare roof with nothing to cut whiffs');
  keys.kbRight = true; tick(.2); check(R.roof.at.c === 2, 'a whiff roots him for half a second'); tick(.5); keys.kbRight = false;
  check(R.roof.at.c > 2, 'then he moves again');
  // Hallucinated carpshits pop harmlessly; real ones come in a fixed number a phase.
  fresh(); R.roof.atk.wait = 1e9; R.roof.fakes.push({ u: bull.u, z: bull.bz + .2, h: .12, ph: 0, t: 0 });
  tick(1); check(R.hearts === 5 && !R.roof.fakes.length, 'a fake carpshit pops on contact, harmless');
  const hatched = []; const oldEmit = emitHook; emitHook = type => { if (type === 'roof_hatch') hatched.push(type); };
  fresh(2); R.roof.hatchLeft = F.hatch[1]; R.roof.atk.wait = 1e9; bull.inv = 1e9; tick(90);
  emitHook = oldEmit;
  check(hatched.length === F.hatch[1], 'a phase hatches its fixed number of carpshits, however long it lasts');
  // A spool snapping: the thread whips the roof clean, carpshits included.
  fresh(); for (const t of R.roof.tiles) t.carpet = true; R.roof.atk.wait = 1e9;
  R.flies.push({ u: .3, z: .3, h: .12, hp: 1, ph: 0, hit: 0, dead: false, cause: 'carp' });
  R.roof.hp = 1; R.roof.spDone[0] = true; R.roof.stall = 1; floor.shotHits({ u: R.roof.eye.u, z: R.roof.eye.z, h: R.roof.eye.h });
  check(R.roof.broken === 1 && R.roof.intermission > 0, 'the last hit snaps the spool');
  tick(F.whipAt + F.whipT + .2);
  check(!R.roof.tiles.some(t => t.carpet) && R.flies.every(f => f.dead), 'the thread whip cuts away every carpet tile and carpshit');
  // Bull Run: no damage, nothing to p(Loom).
  fresh(); R.bullRun = 5; attack([{ k: 'col', i: 2, real: true }]); const before = R.roof.odds; tick(1.1);
  check(R.hearts === 5 && R.roof.odds === before && R.roof.hp === floor.ROOF.hitsPerSpool[0], 'Bull Run takes no damage and leaves p(Loom) alone');
  // Draw only: neither the rain nor the renderer consumes the game's outcomes stream.
  fresh(); attack([{ k: 'col', i: 2, real: true }, { k: 'row', i: 1, real: false }]); tick(.3);
  const seeded = seed, q = JSON.stringify(R.roof); draw(); draw();
  check(seed === seeded && JSON.stringify(R.roof) === q, 'roof drawing never changes fight state or seeded stream');
  checkpoint = null; newRun(); setState('title'); showCard('title');
})();
