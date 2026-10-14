// Unruggabull II balance bot. It sees only window.__balance.observe() copies, reaction_ms old (the driver delays
// them), and answers with player inputs. Like a person, it notices new things late, misjudges depth a little,
// and doesn't always try the hard move: each threat gets one plan, rolled once from the profile. It also learns
// the rhythm: `anticipate` is how much of its own reaction delay it leads its timing by (0 none, 1 all of it).
// It sees itself late too, but like a person it knows what it has pressed since, and counts that in.
// Head-height things (paper airplanes, a high line of carpshits) it ducks: crouch until they're past.
window.__balanceBot = function (profile, seed) {
  'use strict';
  var P = Object.assign({ notice_s: .3, depth_err: .04, deflect_try: .7, fly_slash: .7, dodge: .6, jump_try: .75, jump_err: .035, pickup: .7, charge_floor: 0, anticipate: .75, cut_try: .5, ride: .3 }, profile);
  var lead = P.reaction_ms / 1000 * P.anticipate;   // seconds it looks ahead
  var s = (seed * 2654435761 + 12345) >>> 0;
  function r() { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  function clamp(u) { return Math.max(-.58, Math.min(.58, u)); }
  function err(n) { return (r() * 2 - 1) * n; }
  var seen = {}, plans = {}, sent = [], lastT = null, dt = 1 / 30, lastPull = 'idle', pullPlan = null;
  function noticed(o, x) { if (!(x.id in seen)) seen[x.id] = o.t; return o.t - seen[x.id] >= P.notice_s; }
  function plan(x, make) { return plans[x.id] || (plans[x.id] = make()); }
  // Roof decisions have their own bookkeeping so Floor 13's decisions and dice stay byte-for-byte equivalent.
  var roofSent = [], roofT = null, roofAimError = 0, roofAimT = 0;
  function roofDecide(o) {
    var q = o.roof, b = o.bull, a = { left: false, right: false, jump: false, shoot: false, slash: false, crouch: false, forward: false, back: false };
    var delta = roofT === null ? 1 / 30 : Math.max(0, o.t - roofT); roofT = o.t;
    var lag = P.reaction_ms / 1000, me = b.u, depth = b.bz, aim = q.beamU;
    roofSent = roofSent.filter(function (x) { return x.t >= o.t - lag - 1e-6; });
    roofSent.forEach(function (x) { me += x.dir * o.move * x.dt; aim += x.dir * q.beamSteer * x.dt; depth += (x.depth || 0) * q.depthSpeed * x.dt; });
    me = Math.max(-o.aisle, Math.min(o.aisle, me));
    var goal = null, aimGoal = null;
    if (q.cut) { roofSent.push({ t: o.t, dir: 0, dt: 0 }); return a; }
    if (q.beam && (q.state === 'beam' || q.state === 'run')) {
      if (o.t >= roofAimT) { roofAimError = err(P.depth_err * 2); roofAimT = o.t + .5; }
      aimGoal = q.eye.u + (q.state === 'run' ? q.eye.dir * q.eye.speed * lead : 0) + roofAimError;
    } else if (/^round/.test(q.state)) {
      if (!q.snare || !q.snare.hooked) { a.forward = depth < q.ringZ - .02; a.back = depth > q.ringZ + .02; }
      if (q.snare) {
        var sp = plan(q.snare, function () { return { cut: r() < P.fly_slash }; });
        if (sp.cut && (q.snare.hooked || q.snare.t > .9)) a.slash = true;
      }
      if (q.stall > 0) { goal = q.eye.u; a.shoot = o.charge > 0; }
      else {
        if (q.rings.length) {
          var rp = plan({ id: 'ring:' + q.volley }, function () { return { dodge: r() < (P.roof_dodge == null ? P.dodge : P.roof_dodge) }; });
          if (rp.dodge) goal = q.rings.reduce(function (best, ring) { return ring.odds < best.odds ? ring : best; }).u;
        }
        var tgt = null;
        o.flies.forEach(function (f) {
          if (!noticed(o, f)) return;
          if (f.z > b.bz + .06 && (!tgt || f.z < tgt.z)) tgt = f;
          if (f.z - b.bz < .16 && Math.abs(f.u - me) < .28) {
            var cp = plan(f, function () { return { cut: r() < P.fly_slash }; });
            if (cp.cut) a.slash = true;
          }
        });
        if (tgt) { if (goal === null) goal = tgt.u; a.shoot = Math.abs(tgt.u - me) < .3 && o.charge > P.charge_floor; }
      }
    }
    var d = aimGoal !== null ? aimGoal - aim : goal !== null ? goal - me : 0;
    a.left = d < -.04; a.right = d > .04;
    roofSent.push({ t: o.t, dir: (a.right ? 1 : 0) - (a.left ? 1 : 0), depth: (a.forward ? 1 : 0) - (a.back ? 1 : 0), dt: delta });
    return a;
  }
  // The long ride's fight, side on (arena decisions keep their own bookkeeping and dice, used only on this stage).
  // It faces and shoots the nearest carpshit, jumping to shoot the high ones; ducks a dive coming through where it
  // stands (or cuts it); knocks paper back or jumps it; keeps a little room; then takes the crate and walks out.
  // A crouch-walker (P.crouch_walk, the *_crouch profiles) plays low: while there's anything to fight it stays crouched,
  // moving and shooting from there at the crouched cost, standing only to jump or for a tap to turn.
  var arenaSent = [], arenaT = null;
  function arenaDecide(o) {
    var q = o.arena, b = o.bull, a = { left: false, right: false, jump: false, shoot: false, slash: false, crouch: false };
    var delta = arenaT === null ? 1 / 30 : Math.max(0, o.t - arenaT); arenaT = o.t;
    var lagS = P.reaction_ms / 1000, me = b.u;
    arenaSent = arenaSent.filter(x => x.t >= o.t - lagS - 1e-6);
    arenaSent.forEach(x => { me += x.dir * o.move * (x.low ? o.crouchWalk || 0 : 1) * x.dt; });
    me = Math.max(-o.aisle, Math.min(o.aisle, me));
    // which way it faces now: the last way it pressed, if that hasn't shown up yet
    var facing = q.facing; arenaSent.forEach(x => { if (x.dir) facing = x.dir; });
    q = Object.assign({}, q, { facing: facing });
    if (q.locked) { arenaSent.push({ t: o.t, dir: 0, dt: delta }); return a; }
    var goal = null, target = null, duck = false, turn = 0;
    q.enemies.forEach(function (e) {
      if (!noticed(o, e) || e.dropping || e.entering) return;
      var du = e.u - me;
      // a dive: it rears, then curves down through where he stood
      if (e.rearing || e.swoop) {
        var dp = plan({ id: e.id + ':dive' + (e.dives + (e.swoop ? 0 : 1)) }, () => ({ duck: r() < P.dodge, cut: r() < P.fly_slash }));
        var coming = e.swoop ? e.swoop.k < .62 && Math.abs(du) < .4 : Math.abs(du) < .5;
        if (coming && dp.duck && (e.swoop || Math.abs(du) < .3)) duck = true;
        else if (e.swoop && dp.cut && Math.abs(du) < .28 && du * q.facing > -.02 && Math.abs(e.h - b.jh - .1) < .2) a.slash = true;
      }
      if (!target || Math.abs(du) < Math.abs(target.u - me)) target = e;
      if (Math.abs(du) < .26 && du * q.facing > 0 && Math.abs(e.h - b.jh - .1) < .2 && plan(e, () => ({ cut: r() < P.fly_slash, jump: r() < P.jump_try })).cut) a.slash = true;
    });
    if (target) {
      var side = target.u >= me ? 1 : -1, tp = plan(target, () => ({ cut: r() < P.fly_slash, jump: r() < P.jump_try }));
      if (q.facing !== side) turn = side;
      else if (Math.abs(target.u - me) > .7) goal = target.u - side * .5;
      else if (Math.abs(target.u - me) < .2) goal = target.u - side * .4;   // too close: back off
      var muzzle = b.jh + .129, high = target.h > .2;
      if (high && tp.jump && !b.jh && q.facing === side && !duck) a.jump = true;
      a.shoot = q.facing === side && Math.abs(target.h - muzzle) < .07 && o.charge > P.charge_floor;
    }
    q.thrown.forEach(function (p) {
      if (p.friendly || !noticed(o, p)) return;
      var du = p.u + p.vu * lead - me, toward = p.vu * (me - p.u) > 0;
      if (!toward || Math.abs(du) > .35) return;
      var pl = plan(p, () => ({ deflect: r() < P.deflect_try, hop: r() < P.dodge }));
      if (pl.deflect && (p.u - me) * q.facing > 0 && Math.abs(du) < .26) a.slash = true;
      else if (pl.deflect && (p.u - me) * q.facing < 0) turn = Math.sign(p.u - me);
      else if (pl.hop && Math.abs(du) < .16 && !b.jh) a.jump = true;
    });
    if (goal !== null) goal = Math.max(-.6, Math.min(.6, goal));
    // the top: the crate, then the doorway
    if (q.crate) goal = q.crate.u - .05;
    else if (q.exit) goal = 0;
    if (q.lobby) goal = q.lobby.doorU;   // the 13th Floor's lobby: straight to the doors, and in once they open
    if (P.crouch_walk && o.crouchWalk) {
      // low all the time there's a fight on, still moving and shooting; up only to jump, or to tap round to face
      if (!b.jh && !a.jump && !turn && (duck || q.enemies.length || q.thrown.length)) a.crouch = true;
    } else if (duck && !b.jh) { a.crouch = true; a.jump = false; a.shoot = false; goal = null; }
    var d = goal === null ? 0 : goal - me;
    a.left = d < -.025; a.right = d > .025;
    if (turn && goal === null && !a.crouch) { a.left = turn < 0; a.right = turn > 0; }   // a tap to face the other way
    var walks = !a.crouch || (P.crouch_walk && o.crouchWalk);
    arenaSent.push({ t: o.t, dir: walks ? (a.right ? 1 : 0) - (a.left ? 1 : 0) : 0, low: a.crouch, dt: delta });
    return a;
  }
  // The 48th Floor, top down (its own bookkeeping and dice). Like a person on two sticks: it keeps moving, backs away
  // from carpshits that get close and sidesteps rolls and bobbins (dodge), cuts what's in reach (fly_slash) and knocks
  // bobbins back (deflect_try), shoots the nearest carpshit in range, and otherwise picks a machine and works on it from
  // the walkway in front of it, keeping off a press that's about to come down. Its aim is off by a little (depth_err).
  // In the lobby it walks to the doors once they're open.
  var f48Sent = [], f48T = null, f48Goal = null, f48GoalT = -1, f48AimErr = 0, f48AimT = 0;
  function f48Decide(o) {
    var q = o.f48, a = { mx: 0, my: 0, aim: false, ax: 0, ay: 0, slash: false, left: false, right: false };
    var delta = f48T === null ? 1 / 30 : Math.max(0, o.t - f48T); f48T = o.t;
    var lagS = P.reaction_ms / 1000;
    if (q.st === 'lobby') {
      var L = q.lobby; if (L && L.open) { a.right = L.u < L.doorU - .03; a.left = L.u > L.doorU + .03; }
      else if (L && L.u < -.4) a.right = true;
      return a;
    }
    // where it is now: where it was seen, plus what it has pushed the stick since
    var me = { x: q.me.x, y: q.me.y };
    f48Sent = f48Sent.filter(function (x) { return x.t >= o.t - lagS - 1e-6; });
    f48Sent.forEach(function (x) { me.x += x.mx * q.speed * x.dt; me.y += x.my * q.speed * x.dt; });
    // a wall stops what it pushed since: if that puts it inside something solid, it's where it was seen
    if ((q.walls || []).some(function (w) { return me.x > w.x0 && me.x < w.x1 && me.y > w.y0 && me.y < w.y1; })) { me.x = q.me.x; me.y = q.me.y; }
    if (q.locked) return a;
    var mx = 0, my = 0, shoot = null, sd = Infinity, slashAt = null;
    // carpshits: shoot the nearest; back away from the close ones; cut what's in reach
    q.enemies.forEach(function (e) {
      if (!noticed(o, e) || e.spawning) return;
      var ex = e.x + e.vx * lead, ey = e.y + e.vy * lead, dx = ex - me.x, dy = ey - me.y, d = Math.hypot(dx, dy) || 1;
      var pl = plan(e, function () { return { cut: r() < P.fly_slash, dodge: r() < P.dodge }; });
      if (e.kind === 'shag') {
        // the big one: out of its line when it plants to charge, and cut it when it's close (it shrugs bolts off)
        if ((e.st === 'aim' || e.st === 'dash') && pl.dodge) { var tx0 = e.st === 'aim' ? e.tx : e.vx, ty0 = e.st === 'aim' ? e.ty : e.vy, tl = Math.hypot(tx0, ty0) || 1, off0 = (me.x - e.x) * -ty0 / tl + (me.y - e.y) * tx0 / tl, sg0 = off0 >= 0 ? 1 : -1; mx += -ty0 / tl * sg0 * 2.4; my += tx0 / tl * sg0 * 2.4; }
        else if (d < 58 && pl.cut) slashAt = { x: dx / d, y: dy / d };
        else if (d < 50) { mx -= dx / d; my -= dy / d; }
      } else if (e.kind === 'roll') {
        // a roll pointed at it: step out of its line
        var vx = e.st === 'aim' ? e.tx : e.vx, vy = e.st === 'aim' ? e.ty : e.vy, vl = Math.hypot(vx, vy) || 1, ux = vx / vl, uy = vy / vl;
        var along = (me.x - e.x) * ux + (me.y - e.y) * uy, off = (me.x - e.x) * -uy + (me.y - e.y) * ux;
        if (along > 0 && Math.abs(off) < 26 && along < 220 && pl.dodge) { var sgn = off >= 0 ? 1 : -1; mx += -uy * sgn * 2.2; my += ux * sgn * 2.2; }
        if (d < 40 && pl.cut) slashAt = { x: dx / d, y: dy / d };
      } else {
        if (d < 70) { mx -= dx / d * (70 - d) / 30; my -= dy / d * (70 - d) / 30; }
        if (d < 46 && pl.cut) slashAt = { x: dx / d, y: dy / d };
      }
      // rolls on their way are for dodging (or cutting), not shooting, unless they're close
      var w = e.kind === 'roll' ? (d < 70 ? d : d * 3) : d;
      if (d < 230 && w < sd) { sd = w; shoot = { x: dx / d, y: dy / d }; }
    });
    // bobbins and threads coming at it: knock back or cut, or step aside (bolts pass through them)
    q.thrown.forEach(function (p) {
      if (p.friendly || !noticed(o, p)) return;
      var px = p.x + p.vx * lead, py = p.y + p.vy * lead, dx = px - me.x, dy = py - me.y, d = Math.hypot(dx, dy) || 1, toward = (p.vx * -dx + p.vy * -dy) > 0;
      if (!toward || d > 170) return;
      var pl = plan(p, function () { return { deflect: r() < P.deflect_try, dodge: r() < P.dodge }; });
      if (pl.deflect && d < 34) slashAt = { x: dx / d, y: dy / d };
      else if (pl.dodge) { var vl = Math.hypot(p.vx, p.vy) || 1, side = (dx * p.vy - dy * p.vx) > 0 ? 1 : -1; mx += -p.vy / vl * side * 1.6; my += p.vx / vl * side * 1.6; }
    });
    // a vessel's marked spot under it: out of it before the arc (the same dodge roll)
    (q.zaps || []).forEach(function (z) {
      var dx = me.x - z.x, dy = me.y - z.y, d = Math.hypot(dx, dy);
      if (d > 30 || !plan(z, function () { return { dodge: r() < P.dodge }; }).dodge) return;
      if (d < .5) { dx = 1; dy = 0; d = 1; }
      mx += dx / d * 3; my += dy / d * 3;
    });
    // a crane hook coming along its walkway: off it
    q.cranes.forEach(function (c, i) {
      if (c.st === 'idle' || Math.abs(me.y - c.y) > 22) return;
      if (plan({ id: 'crane' + i + ':' + Math.floor(o.t / 3) }, function () { return { dodge: r() < P.dodge }; }).dodge) my += me.y < c.y ? -2.5 : 2.5;
    });
    // p(Loom)'s laser: into its gap (a person mostly makes it; the dodge roll decides), and hold there till it's past
    var qcHold = false;
    if (q.qc && plan({ id: 'qc' + q.qc.n }, function () { return { go: r() < Math.min(1, P.dodge + .3) }; }).go) {
      var mid = (q.qc.g0 + q.qc.g1) / 2, past = q.qc.dir === 'x' ? (q.qc.sgn > 0 ? q.qc.pos > me.x + 12 : q.qc.pos < me.x - 12) : q.qc.pos > me.y + 12;
      if (!past) { qcHold = true; var off = (q.qc.dir === 'x' ? me.y : me.x) - mid; if (Math.abs(off) > 6) { if (q.qc.dir === 'x') my += off > 0 ? -3 : 3; else mx += off > 0 ? -3 : 3; } }
    }
    var job = null;
    // the reserve at the end: under the nearest tank, sweeping the streams across them
    if (q.whip && q.whip.length) {
      var tk = q.whip.reduce(function (b2, k) { return Math.abs(k.x - me.x) < Math.abs(b2.x - me.x) ? k : b2; });
      job = { x: tk.x, y: 140 }; var wdx = tk.x - me.x, wdy = 44 - me.y, wd = Math.hypot(wdx, wdy) || 1; shoot = { x: wdx / wd, y: wdy / wd }; sd = 0;
    }
    // a power-up on the floor: go and get it
    if (!job) q.pickups.forEach(function (pk) {
      var d = Math.hypot(pk.x - me.x, pk.y - me.y);
      if (d < 220 && plan(pk, function () { return { take: r() < P.pickup }; }).take && (!job || d < job.d)) job = { x: pk.x, y: pk.y, d: d };
    });
    // a cable to cut: stand where the katana reaches it, then slash it
    if (!job) q.cables.forEach(function (cb) {
      var spot = cb.kind === 'feed' ? { x: cb.x, y: cb.y - 26 } : { x: cb.x, y: cb.y + 30 }, d = Math.hypot(spot.x - me.x, spot.y - me.y);
      // on its way: a cable close by, once in a while (it doesn't camp a cable waiting for the splice)
      if (d < 110 && plan({ id: cb.id + ':' + Math.floor(o.t / 15) }, function () { return { cut: r() < P.cut_try }; }).cut && (!job || d < job.d)) job = { x: spot.x, y: spot.y, d: d, cable: cb };
    });
    if (job && job.cable && Math.hypot(job.cable.x - me.x, job.cable.y - me.y) < 40 && !slashAt) { var cdx = job.cable.x - me.x, cdy = job.cable.y - me.y, cd = Math.hypot(cdx, cdy) || 1; slashAt = { x: cdx / cd, y: cdy / cd }; }
    // the work: a machine, chosen every few seconds, worked on from the walkway in front of it
    if (!f48Goal || o.t > f48GoalT || !q.machines.some(function (m) { return m.id === f48Goal.id; })) {
      var best = null, bs = Infinity;
      q.machines.forEach(function (m) {
        var cx = (m.x0 + m.x1) / 2, cy = m.y1, d = Math.hypot(cx - me.x, cy - me.y), score = d * (m.kind === 'loom' ? .8 : 1) + m.hp * 2;
        if (score < bs) { bs = score; best = m; }
      });
      f48Goal = best; f48GoalT = o.t + 4 + r() * 3;
    }
    var goal = null;
    if (f48Goal) {
      var m = q.machines.filter(function (x) { return x.id === f48Goal.id; })[0] || f48Goal, cx = (m.x0 + m.x1) / 2;
      var below = m.y1 + 58, above = m.y0 - 58;
      var gy = Math.abs(me.y - below) < Math.abs(me.y - above) || above < q.bounds.y0 + 20 ? below : above;
      // a vessel: stand where there's room, below the high one and above the low one
      if (m.kind === 'vessel') gy = below > q.bounds.y1 - 12 ? above : below;
      goal = { x: cx, y: Math.min(q.bounds.y1 - 12, gy) };
      if (!shoot || sd > 200) { var dx = cx - me.x, dy = (m.y1 - 4) - me.y, d = Math.hypot(dx, dy) || 1; if (d < 260) { shoot = { x: dx / d, y: dy / d }; sd = d; } }
    }
    // the canister cart rolling past close by: a few shots at it, sometimes (it's optional)
    if (q.cart && (!shoot || sd > 120)) {
      var kx = q.cart.x - me.x, ky = (q.cart.y - 6) - me.y, kd = Math.hypot(kx, ky) || 1;
      if (kd < 190 && plan({ id: 'cart:' + Math.floor(o.t / 40) }, function () { return { take: r() < P.pickup }; }).take) { shoot = { x: kx / kd, y: ky / kd }; sd = kd; }
    }
    if (job) goal = job;
    // something solid in the way (a machine, a wreck, a pallet, a vessel): round it by the corner that makes the shorter way
    // (it's 7 pixels round, and 4 deep against a box's top or bottom)
    var crosses = function (ax, ay, bx, by, w, px, py) {
      var x0 = w.x0 - px, x1 = w.x1 + px, y0 = w.y0 - py, y1 = w.y1 + py, dx = bx - ax, dy = by - ay, t0 = 0, t1 = 1, ok = true;
      [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]].forEach(function (c) {
        if (c[0] === 0) { if (c[1] < 0) ok = false; } else { var t = c[1] / c[0]; if (c[0] < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); }
      });
      return ok && t0 <= t1 ? t0 : -1;
    };
    var near = 10;
    if (goal && q.walls) {
      var hit = null, ht = 2;
      q.walls.forEach(function (w) {
        if (me.x > w.x0 && me.x < w.x1 && me.y > w.y0 && me.y < w.y1) return;
        var t = crosses(me.x, me.y, goal.x, goal.y, w, 9, 6); if (t >= 0 && t < ht) { ht = t; hit = w; }
      });
      if (hit) {
        var bestC = null, bl = Infinity;
        [[hit.x0 - 14, hit.y0 - 11], [hit.x1 + 14, hit.y0 - 11], [hit.x0 - 14, hit.y1 + 11], [hit.x1 + 14, hit.y1 + 11]].forEach(function (c) {
          var cx = Math.max(q.bounds.x0 + 4, Math.min(q.bounds.x1 - 4, c[0])), cy = Math.max(q.bounds.y0 + 4, Math.min(q.bounds.y1 - 4, c[1]));
          if (crosses(me.x, me.y, cx, cy, hit, 0, 0) >= 0 || Math.hypot(cx - me.x, cy - me.y) < 3) return;
          // a corner the goal can't be seen from is the long way round
          var l = Math.hypot(cx - me.x, cy - me.y) + Math.hypot(goal.x - cx, goal.y - cy) + (crosses(cx, cy, goal.x, goal.y, hit, 0, 0) >= 0 ? 400 : 0);
          if (l < bl) { bl = l; bestC = { x: cx, y: cy }; }
        });
        if (bestC) { goal = bestC; near = 2; }
      }
    }
    if (goal) { var gx = goal.x - me.x, gy2 = goal.y - me.y, gd = Math.hypot(gx, gy2); if (gd > near) { var sp = near < 10 ? 1 : Math.min(1, gd / 40); mx += gx / gd * sp; my += gy2 / gd * sp; } }
    // a press about to come down: get off the belt under it
    q.machines.forEach(function (m) {
      if (m.kind !== 'press' || m.warn <= 0) return;
      if (me.x > m.x0 - 4 && me.x < m.x1 + 4 && me.y > m.y0 - 10 && me.y < m.y1 + 10 && plan({ id: m.id + ':p' + Math.floor(o.t / 1.4) }, function () { return { dodge: r() < P.dodge }; }).dodge) my += me.y < (m.y0 + m.y1) / 2 ? -2 : 2;
    });
    var ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    a.mx = mx; a.my = my;
    if (o.t >= f48AimT) { f48AimErr = err(P.depth_err * 3); f48AimT = o.t + .4; }
    if (slashAt && q.me.cd <= 0) { a.slash = true; a.aim = true; a.ax = slashAt.x; a.ay = slashAt.y; }
    else if (shoot && (o.charge > P.charge_floor || q.st === 'collapse')) {
      var c = Math.cos(f48AimErr), s2 = Math.sin(f48AimErr);
      a.aim = true; a.ax = shoot.x * c - shoot.y * s2; a.ay = shoot.x * s2 + shoot.y * c;
    }
    if (q.st === 'collapse' && !a.aim) { a.aim = true; a.ax = 0; a.ay = -1; }
    f48Sent.push({ t: o.t, mx: a.mx, my: a.my, dt: delta });
    return a;
  }
  return {
    decide: function (o) {
      if (o.f48) return f48Decide(o);
      if (o.arena) return arenaDecide(o);
      if (o.roof) return roofDecide(o);
      var b = o.bull, a = { left: false, right: false, jump: false, shoot: false, slash: false, crouch: false }, goal = null, urgent = false;
      if (lastT !== null && o.t > lastT) dt = o.t - lastT;
      lastT = o.t;
      sent = sent.filter(function (x) { return x.t >= o.t - P.reaction_ms / 1000 - 1e-6; });
      var me = b.u, move = o.move || 1.5, aisle = o.aisle || .6;   // older adapters don't report move and aisle
      sent.forEach(function (x) { me += x.dir * move * x.dt; });
      me = Math.max(-aisle, Math.min(aisle, me));
      if (b.busy) { sent.push({ t: o.t, dir: 0, dt: dt }); return a; }
      // Paper on its way to me: knock it back, jump a staple, or sidestep.
      o.projs.forEach(function (p) {
        if (p.friendly || p.vz >= 0 || !noticed(o, p)) return;
        var dz = p.z - b.bz + p.vz * lead, landU = p.u + p.vu * ((p.z - b.bz) / -p.vz);
        if (dz > .7 || Math.abs(landU - me) > .2) return;
        // a rally can't be stepped round for long, so like a person it always tries the return, with fresh timing each time
        // its timing is off by a little each return, in time (about depth_err × 1.5 seconds), so faster balls are harder
        var pl = p.rally ? plan({ id: p.id + ':' + o.boss.rally }, function () { return { deflect: true, err: 0, errT: (r() + r() + r() - 1.5) * 2 * P.depth_err * 1.5 }; })
          : plan(p, function () { return { deflect: r() < P.deflect_try, dodge: r() < P.dodge, err: err(P.depth_err) }; });
        // a rally ball: swing for the middle of the window (the swing stays live a moment), as a person learns its rhythm
        if (pl.deflect) { if (dz < .14 + (p.rally ? -p.vz * (.08 + pl.errT) : 0) + pl.err && dz > -.03) a.slash = true; }
        else if (p.h > .17) { if (pl.dodge && dz < .16 + pl.err && dz > -.06) a.crouch = true; }
        else if (p.kind === 'staple') { if (pl.dodge && dz < .08 + pl.err) a.jump = true; }
        else if (pl.dodge) { goal = clamp(me + (landU >= me ? -.3 : .3)); urgent = true; }
      });
      // A carpshit about to reach me: cut it, or get out of its way.
      o.flies.forEach(function (f) {
        var dz = f.z - b.bz - (f.form ? .3 : .34) * lead;
        if (!noticed(o, f) || dz > .16 || dz < -.02 || Math.abs(f.u - me) > .3) return;
        var pl = plan(f, function () { return { cut: r() < P.fly_slash, err: err(P.depth_err) }; });
        if (pl.cut) { if (dz < .12 + pl.err) a.slash = true; }
        else if (f.high) { if (dz < .12 + pl.err) a.crouch = true; }
        else if (!urgent) { goal = clamp(me + (f.u >= me ? -.35 : .35)); urgent = true; }
      });
      // Rows span the aisle: jump about a quarter second before they arrive. Boxes: step aside or jump.
      o.rows.forEach(function (rw) {
        var pl = plan(rw, function () { return { jump: r() < P.jump_try, err: err(P.jump_err) }; });
        var dz = rw.z - b.bz - rw.speed * lead;
        // a beam hangs at head height: duck under it (same odds and timing error as a jump)
        if (rw.kind === 'beam') { if (pl.jump && dz < rw.speed * .3 + pl.err + .04 && dz > -.06) a.crouch = true; return; }
        if (pl.jump && dz > 0 && dz < rw.speed * .25 + pl.err + .02) a.jump = true;
      });
      o.boxes.forEach(function (bx) {
        var dz = bx.z - b.bz - o.speed * lead;
        // a desk sticking out from one side: in the way anywhere from its end to the wall
        var inWay = bx.s ? bx.s * (me - bx.inner) > -.08 : Math.abs(bx.u - me) <= .16;
        if (dz <= 0 || dz > .25 || !inWay) return;
        var pl = plan(bx, function () { return { side: r() < P.dodge, err: err(P.jump_err) }; });
        if (pl.side && !urgent) { goal = clamp(bx.s ? bx.inner - bx.s * .22 : me + (bx.u >= me ? -.3 : .3)); urgent = true; }
        else if (dz < o.speed * .25 + pl.err + .02) a.jump = true;
      });
      // The runner warns, then pulls: step off it, or stay on and slash to cut it (which jams the Shredder), riding it
      // `ride` of the way toward the mouth first for a longer jam. A live floor makes the rug the safe place: get on it.
      if (o.pull === 'warn' && lastPull !== 'warn') pullPlan = { cut: r() < P.cut_try };
      lastPull = o.pull;
      var pulling = o.pull === 'warn' || o.pull === 'on', onRug = Math.abs(me) < o.runner + .05, cutAt = P.ride * (o.mouth || .85);
      if (pulling && o.spray && !urgent) {
        if (Math.abs(me) > o.runner - .08) { goal = 0; urgent = true; }
        if (o.pull === 'on' && onRug && b.bz >= cutAt) a.slash = true;
      } else if (pulling && onRug && !urgent) {
        if (pullPlan && pullPlan.cut) { if (o.pull === 'on' && b.bz >= cutAt) a.slash = true; }
        else { goal = me >= 0 ? .45 : -.45; urgent = true; }
      }
      // Coffee when hurt, Spread Shot always: walk under it and jump.
      // moving day's trapped souls: run through them (with its pickup odds), and it can't jump while ducking anyway
      if (!urgent) (o.bubbles || []).forEach(function (sl) {
        var dz = sl.z - b.bz - o.speed * lead, pl = plan(sl, function () { return { go: r() < P.pickup }; });
        if (pl.go && dz > 0 && dz < .4) goal = sl.u;
      });
      if (!urgent) o.pickups.forEach(function (pk) {
        // its blaster, knocked up the rug: always worth getting once the rug has brought it close; it's on the floor
        if (pk.kind === 'blaster') { if (pk.z < .35) goal = clamp(pk.u); return; }
        var dz = pk.z - b.bz - (o.speed + .06) * lead, pl = plan(pk, function () { return { go: r() < P.pickup }; });
        if (!pl.go || dz <= 0 || dz > .5 || (pk.kind === 'coffee' && o.hearts >= o.maxHearts)) return;
        goal = pk.u;
        if (dz < .09 && Math.abs(pk.u - me) < .12) a.jump = true;
      });
      // Otherwise line up the nearest target and shoot, keeping a few charges back if the profile says so.
      var tgt = null;
      o.temps.forEach(function (tp) { if (tp.up && tp.z > b.bz + .05 && noticed(o, tp) && (!tgt || tp.z < tgt.z)) tgt = tp; });
      o.flies.forEach(function (f) { if (f.z > b.bz + .1 && noticed(o, f) && (!tgt || f.z < tgt.z)) tgt = f; });
      if (goal === null) goal = tgt ? clamp(tgt.u) : o.phase === 'boss' ? 0 : null;
      var aligned = tgt ? Math.abs(tgt.u - me) < (tgt.form === undefined ? o.aimCone : .3) : false;
      if (o.phase === 'boss' && o.boss.st === 'fight') aligned = Math.abs(me) < .7;
      a.shoot = aligned && o.charge > P.charge_floor;
      if (a.crouch && b.jh <= 0) { a.shoot = false; goal = null; }   // crouched: no moving, no shooting
      if (goal !== null) { var d = goal - me; a.left = d < -.04; a.right = d > .04; }
      sent.push({ t: o.t, dir: (a.right ? 1 : 0) - (a.left ? 1 : 0), dt: dt });
      return a;
    },
    shop: function () { return {}; }
  };
};
