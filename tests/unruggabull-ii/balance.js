// Unruggabull II balance adapter (SPEC-005, docs/guides/01-balance-bots.md). tools/balance/run.py evaluates this
// inside game.js's scope through a test-only bridge injected into the response; nothing here ships.
// Progress is reported as stages, in the report's "wave" column:
//   Roof: 10 lead-in, 11-13 rounds, 14 crescendo, 15 cleared. Elevator: 16 ride, 17 cleared.
//   The 48th Floor: 18 no lines down, 19 one down, 20 the last line, 21 collapse and lobby, 22 cleared.
//   1 Accounts Payable, 2 Moving day, 3 All Staff, 4 Lights out, 5 Copy Room, 6-8 Shredder phases 1-3, 9 cleared.
(function () {
  var renderEffects = false, renderSteps = 0, renderedState = null;
  var log = [], lastStage = 1, ids = new WeakMap(), nextId = 1;
  function idOf(o) { if (!ids.has(o)) ids.set(o, nextId++); return ids.get(o); }
  function stage() {
    if (R.stage === 'roof' || R.stage === 'elevator' || R.stage === 'floor48') return floor.stageNo();
    if (R.phase === 'dead') return lastStage;
    if (R.phase === 'win' || state === 'over') return 9;
    if (R.phase === 'hall') return R.event ? ({ move: 2, rush: 3 }[R.event.kind] || 4) : [1, 3, 5][R.beat];   // rush hour counts as All Staff (its hits have cause rush)
    if (R.phase === 'wake') return 6;
    return 5 + R.boss.ph;
  }
  // where in the long ride a heart goes: the first stretch of the fight, the armored stretch, the last floors
  function ridePart() {
    var T = floors.elevator.T, t = R.elevator.t;
    return !R.elevator.fight ? 'quiet' : t < T.reel ? 'before' : t < T.armor ? 'reel' : t < T.last ? 'armor' : t < T.arrive ? 'last' : 'top';
  }
  function record(type, data) {
    var e = { ev: type, wave: stage(), t: Math.round(R.t * 100) / 100 };
    for (var k in data) e[k] = data[k];
    if (R.stage === 'elevator' && ['hit', 'game_over'].includes(type)) e.kind = ridePart();
    log.push(e);
  }
  // The harness drives the game: the page's frame loop stops, and sound never starts without a tap anyway.
  looping = false;
  window.__balance = {
    game: 'unruggabull-ii',
    // A fresh run on this seed, straight into the hall (no story, no card). Cosmetics already use their own
    // randomness, so options.fast changes nothing.
    start: function (seedv, options) {
      log = []; emitHook = record; lastStage = 1;
      renderEffects = options && options.fast === false && ['roof', 'elevator', 'floor48'].includes(options.stage); renderSteps = 0; renderedState = null;
      travelHook = options && ['elevator', 'floor48'].includes(options.stage) ? function () { endRun('clear'); return true; } : null;
      RUN.force = seedv;
      if (options && options.stage === 'elevator' && (options.from != null || options.fight != null || options.destination != null)) {
        const ride = floors.elevator.ELEVATOR;
        newRun({ stage: 'elevator', transfer: true, souls: 0,
          from: options.from == null ? ride.from : Number(options.from),
          fight: options.fight == null ? ride.fight : options.fight !== false && options.fight !== 'false',
          lobby: options.lobby === true || options.lobby === 'true',
          destination: options.destination == null ? ride.destination : { floor: Number(options.destination), label: String(options.destination),
            stage: Number(options.destination) === 48 ? 'floor48' : 'roof' } });
      } else newRun(null, options && options.stage);
      RUN.force = null;
      setState('play'); card.hidden = true; crawl.hidden = true; intro = null;
      input.jump = input.slash = input.shoot = 0;
      keys.kbLeft = keys.kbRight = keys.kbShoot = keys.padLeft = keys.padRight = keys.padShoot = keys.kbDown = keys.padDown = false;
      keys.kbUp = keys.padUp = false;
    },
    // Game logic only; never draws.
    step: function (dt) {
      if (state !== 'play') return;
      update(dt);
      // Verify samples real renderer frames at every beat and five seconds of fight time.
      var q = R.roof || R.elevator || R.f48, currentState = q && (q.cut ? q.cut.name : q.state || q.st);
      if (renderEffects && (++renderSteps % 300 === 0 || currentState !== renderedState)) {
        draw(); renderedState = currentState;
      }
      if (R.phase !== 'dead') lastStage = stage();
    },
    observe: function () {
      var b = bull, o = {
        t: R.t, phase: R.phase, stage: stage(), event: R.event ? R.event.kind : null, speed: R.speed,
        souls: R.souls, goal: TUNE.goal, hearts: R.hearts, maxHearts: TUNE.hearts, charge: R.charge, spread: R.spread,
        runner: TUNE.runner, aimCone: TUNE.aimCone, move: TUNE.move, crouchWalk: TUNE.crouchWalk || 0, aisle: TUNE.aisle, pull: R.pull.st, spray: !!R.pull.spray, mouth: TUNE.mouth,
        bull: { u: b.u, bz: b.bz, jh: b.jh, cd: b.cd, inv: b.inv, busy: !!(b.mouth || b.spat), crouch: !!b.crouch },
        boss: { st: R.boss.st, ph: R.boss.ph, hp: R.boss.hp, jam: R.boss.jam, rally: R.boss.rally ? R.boss.rally.count : -1 },
        temps: [], flies: [], projs: [], boxes: [], rows: [], pickups: [], bubbles: []
      };
      R.cubs.forEach(function (cb) { var tp = cb.temp; if (tp && !tp.dead) { var at = posOf(tp); o.temps.push({ id: idOf(tp), u: at.u, z: at.z, h: at.h, up: tp.pop > .4 }); } });
      // carpshits at work look like temps to the bot: up (worth a shot) once they're in reach
      (R.workers || []).forEach(function (wk) { wk.carps.forEach(function (c) { if (!c.dead) { var at = posOf(c); o.temps.push({ id: idOf(c), u: at.u, z: at.z, h: at.h, up: at.z < TUNE.reach }); } }); });
      R.flies.forEach(function (f) { if (!f.dead) o.flies.push({ id: idOf(f), u: f.u, z: f.z, h: f.h, hp: f.hp, form: !!f.form, high: !!f.high }); });
      R.projs.forEach(function (p) { if (!p.dead) o.projs.push({ id: idOf(p), kind: p.kind, u: p.u, z: p.z, h: p.h, vu: p.vu, vz: p.vz, friendly: p.friendly, rally: !!p.rally }); });
      R.boxes.forEach(function (bx) { if (!bx.hit) o.boxes.push({ id: idOf(bx), u: bx.u, z: bx.w - R.dist, s: bx.s || 0, inner: bx.inner }); });
      R.rows.forEach(function (rw) { if (!rw.hit) o.rows.push({ id: idOf(rw), kind: rw.kind, z: rw.w - R.dist, speed: R.speed + (rw.v || (rw.kind === 'chairs' ? .12 : .22)) }); });
      if (R.event && R.event.souls) R.event.souls.forEach(function (sl) { if (!sl.got) o.bubbles.push({ id: idOf(sl), u: sl.u, z: sl.w - R.dist }); });
      R.pickups.forEach(function (pk) { if (!pk.got) o.pickups.push({ id: idOf(pk), kind: pk.kind, u: pk.u, z: pk.w - R.dist }); });
      if (R.stage === 'roof') {
        var q = R.roof, rt = floor.ROOF;
        o.roof = { state: q.state, round: q.round, broken: q.broken, hp: q.hp, odds: q.odds,
          stall: q.stall, beam: !!R.beam, beamU: q.beamU || 0, beamSteer: rt.beamSteer,
          beamHit: rt.beamHit, cut: !!q.cut, ringZ: rt.ringZ, depthSpeed: rt.depthSpeed, depthMax: rt.depthMax,
          eye: { u: q.eye.u, dir: q.eye.dir || 0, speed: rt.eyeRun + rt.eyeAccel * (1 - q.odds / rt.odds) },
          volley: q.volley ? idOf(q.volley) : null,
          rings: q.rings.map(function (r) { return { u: r.u, z: r.z, odds: r.odds }; }),
          snare: q.snare ? { id: idOf(q.snare), u: q.snare.u, t: q.snare.t, hooked: q.snare.hooked } : null,
          gust: q.gust ? { dir: q.gust.dir, t: q.gust.t } : null };
      }
      if (R.stage === 'elevator') {
        var Q = R.elevator, AR = floor.arena.ARENA;
        o.arena = { t: Q.t, locked: !!R.arena.locked, facing: b.facing || 1, jumpH: TUNE.jumpH, limit: AR.limit,
          enemies: R.arena.enemies.map(e => ({ id: idOf(e), u: e.u, h: e.h, armored: e.armored, dropping: e.dropping, entering: !!e.entering,
            swoop: e.swoop ? { k: e.swoop.t / AR.swoopT, tu: e.swoop.tu, su: e.swoop.su } : null, rearing: !e.swoop && !e.dropping && e.swoopT < AR.rear,
            dives: e.dives || 0, cross: e.cross || 0 })),
          thrown: R.arena.thrown.map(p => ({ id: idOf(p), u: p.u, h: p.h, vu: p.vu, vh: p.vh, friendly: p.friendly })),
          crate: Q.crate && !Q.crate.got ? { u: Q.crate.u } : null, exit: Q.t > floor.top().doors + floor.ELEVATOR.exitAfter,
          lobby: Q.lobby ? { doorU: floor.ELEVATOR.lobby.doorU } : null };
      }
      if (R.stage === 'floor48') {
        var F = R.f48, td = R.td, T8 = floor.td.TD;
        o.f48 = { st: F.st, panic: F.panic, down: F.down.slice(), locked: !!td.locked,
          me: { x: b.x, y: b.y, vx: b.vx, vy: b.vy, ax: b.ax, ay: b.ay, cd: b.cd, inv: b.inv, slash: b.slash },
          speed: T8.speed, bounds: T8.bounds, bed: floor.F48.bedH / 2, beltEnd: floor.F48.beltEnd, lineX0: floor.F48.lineX0,
          lines: floor.LINES.map(function (l) { return l.y; }),
          enemies: td.enemies.filter(function (e) { return !e.dead; }).map(function (e) { return { id: idOf(e), kind: e.kind, x: e.x, y: e.y, vx: e.vx, vy: e.vy, st: e.st || null, tx: e.tx || 0, ty: e.ty || 0, spawning: e.spawning > 0, armored: !!e.armored, stag: e.stag || 0 }; }),
          thrown: td.thrown.filter(function (p) { return !p.dead; }).map(function (p) { return { id: idOf(p), kind: p.kind || 'bobbin', x: p.x, y: p.y, vx: p.vx, vy: p.vy, friendly: p.friendly }; }),
          machines: F.machines.filter(function (m) { return !m.dead; }).map(function (m) { return { id: idOf(m), line: m.line, kind: m.kind, x0: m.x0, x1: m.x1, y0: m.y0, y1: m.y1, hp: m.hp, warn: m.warn || 0 }; }),
          solids: floor.F48.props.map(function (p) { return { x0: p[1], x1: p[1] + p[3], y0: p[2], y1: p[2] + p[4] }; }),
          cables: F.st === 'fight' ? floor.cables().map(function (c) { return { id: idOf(F.machines[c.line * 5]) + ':' + c.kind, line: c.line, kind: c.kind, x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2 }; }) : [],
          pickups: td.pickups.map(function (p) { return { id: idOf(p), kind: p.kind, x: p.x, y: p.y }; }),
          cranes: F.crane.map(function (c, i) { return { st: c.st, x: c.x, dir: c.dir, y: floor.LINES[i].y + floor.F48.crane.dy }; }),
          qc: F.qc ? { n: F.qc.n, dir: F.qc.dir, pos: F.qc.pos, sgn: F.qc.sgn, g0: F.qc.g0, g1: F.qc.g1 } : null,
          tangle: b.tangle || 0,
          whip: F.collapse && F.collapse.phase === 'whip' ? F.collapse.reserve.filter(function (k) { return !k.broken; }).map(function (k) { return { x: k.x }; }) : null,
          lobby: F.lobby ? { t: F.lobby.t, open: F.lobby.ding && F.lobby.t > floor.F48.lobby.dingAt + .4 + floor.F48.lobby.doorsT, doorU: floor.F48.lobby.doorU, u: b.u } : null };
      }
      return o;
    },
    // Player input paths only: the keyboard's held keys and the same presses the pads and keys make.
    act: function (a) {
      if (!a || state !== 'play') return;
      keys.kbLeft = !!a.left; keys.kbRight = !!a.right; keys.kbShoot = !!a.shoot; keys.kbDown = !!a.crouch;
      if (R.stage === 'roof') { keys.kbUp = !!a.forward; keys.kbDown = !!a.back; }
      if (R.stage === 'floor48' && floor.twin()) {
        // the twin sticks: the move stick, the aim stick held (aiming and firing), and Slash
        twin.padX = a.mx || 0; twin.padY = a.my || 0;
        twin.aiming = !!a.aim; if (a.aim) { twin.aimX = a.ax; twin.aimY = a.ay; }
        keys.kbLeft = keys.kbRight = keys.kbShoot = false;
        if (a.slash) press('slash');
        return;
      }
      if (R.stage === 'floor48') { twin.padX = twin.padY = 0; twin.aiming = false; }
      if (a.jump) press('jump');
      if (a.slash) press('slash');
    },
    status: function () { return { over: state === 'over' || R.phase === 'dead', wave: stage(), score: R.souls, t: R.t, mode: state === 'play' ? 'play' : state }; },
    drain: function () { var out = log; log = []; return out; }
  };
})();
