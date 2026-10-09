// Unruggabull II balance adapter (SPEC-005, docs/guides/01-balance-bots.md). tools/balance/run.py evaluates this
// inside game.js's scope through a test-only bridge injected into the response; nothing here ships.
// Progress is reported as stages, in the report's "wave" column:
//   1 Accounts Payable, 2 Audit, 3 All Staff, 4 Lights out, 5 Copy Room, 6-8 Shredder phases 1-3, 9 cleared.
(function () {
  var log = [], lastStage = 1, ids = new WeakMap(), nextId = 1;
  function idOf(o) { if (!ids.has(o)) ids.set(o, nextId++); return ids.get(o); }
  function stage() {
    if (R.phase === 'dead') return lastStage;
    if (R.phase === 'win' || state === 'over') return 9;
    if (R.phase === 'hall') return R.event ? (R.event.kind === 'audit' ? 2 : 4) : [1, 3, 5][R.beat];
    if (R.phase === 'wake') return 6;
    return 5 + R.boss.ph;
  }
  function record(type, data) {
    var e = { ev: type, wave: stage(), t: Math.round(R.t * 100) / 100 };
    for (var k in data) e[k] = data[k];
    log.push(e);
  }
  // The harness drives the game: the page's frame loop stops, and sound never starts without a tap anyway.
  looping = false;
  window.__balance = {
    game: 'unruggabull-ii',
    // A fresh run on this seed, straight into the hall (no story, no card). Cosmetics already use their own
    // randomness, so options.fast changes nothing.
    start: function (seedv) {
      log = []; emitHook = record; lastStage = 1;
      RUN.force = seedv; newRun(); RUN.force = null;
      setState('play'); card.hidden = true; crawl.hidden = true; intro = null;
      input.jump = input.slash = input.shoot = 0;
      keys.kbLeft = keys.kbRight = keys.kbShoot = keys.padLeft = keys.padRight = keys.padShoot = false;
    },
    // Game logic only; never draws.
    step: function (dt) {
      if (state !== 'play') return;
      update(dt);
      if (R.phase !== 'dead') lastStage = stage();
    },
    observe: function () {
      var b = bull, o = {
        t: R.t, phase: R.phase, stage: stage(), event: R.event ? R.event.kind : null, speed: R.speed,
        souls: R.souls, goal: TUNE.goal, hearts: R.hearts, maxHearts: TUNE.hearts, charge: R.charge, spread: R.spread,
        runner: TUNE.runner, aimCone: TUNE.aimCone, move: TUNE.move, aisle: TUNE.aisle, pull: R.pull.st,
        bull: { u: b.u, bz: b.bz, jh: b.jh, cd: b.cd, inv: b.inv, busy: !!(b.mouth || b.spat) },
        boss: { st: R.boss.st, ph: R.boss.ph, hp: R.boss.hp, jam: R.boss.jam, rally: R.boss.rally ? R.boss.rally.count : -1 },
        temps: [], flies: [], projs: [], boxes: [], rows: [], pickups: []
      };
      R.cubs.forEach(function (cb) { var tp = cb.temp; if (tp && !tp.dead) { var at = posOf(tp); o.temps.push({ id: idOf(tp), u: at.u, z: at.z, h: at.h, up: tp.pop > .4 }); } });
      R.flies.forEach(function (f) { if (!f.dead) o.flies.push({ id: idOf(f), u: f.u, z: f.z, h: f.h, hp: f.hp, form: !!f.form }); });
      R.projs.forEach(function (p) { if (!p.dead) o.projs.push({ id: idOf(p), kind: p.kind, u: p.u, z: p.z, h: p.h, vu: p.vu, vz: p.vz, friendly: p.friendly, rally: !!p.rally }); });
      R.boxes.forEach(function (bx) { if (!bx.hit) o.boxes.push({ id: idOf(bx), u: bx.u, z: bx.w - R.dist }); });
      R.rows.forEach(function (rw) { if (!rw.hit) o.rows.push({ id: idOf(rw), kind: rw.kind, z: rw.w - R.dist, speed: R.speed + (rw.kind === 'chairs' ? .12 : .22) }); });
      R.pickups.forEach(function (pk) { if (!pk.got) o.pickups.push({ id: idOf(pk), kind: pk.kind, u: pk.u, z: pk.w - R.dist }); });
      return o;
    },
    // Player input paths only: the keyboard's held keys and the same presses the pads and keys make.
    act: function (a) {
      if (!a || state !== 'play') return;
      keys.kbLeft = !!a.left; keys.kbRight = !!a.right; keys.kbShoot = !!a.shoot;
      if (a.jump) press('jump');
      if (a.slash) press('slash');
    },
    status: function () { return { over: state === 'over' || R.phase === 'dead', wave: stage(), score: R.souls, t: R.t, mode: state === 'play' ? 'play' : state }; },
    drain: function () { var out = log; log = []; return out; }
  };
})();
