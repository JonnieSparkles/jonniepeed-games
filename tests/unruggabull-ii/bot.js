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
  return {
    decide: function (o) {
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
      // moving day's walls of stacked boxes can't be jumped: head for the gap
      var walls = o.boxes.filter(function (bx) { var dz = bx.z - b.bz - o.speed * lead; return bx.tall && dz > -.02 && dz < .45; });
      if (walls.length && !urgent) {
        var zNear = Math.min.apply(null, walls.map(function (bx) { return bx.z; }));
        var row = walls.filter(function (bx) { return bx.z < zNear + .05; }).map(function (bx) { return bx.u; });
        var free = [-.45, -.15, .15, .45].filter(function (u) { return !row.some(function (w) { return Math.abs(w - u) < .05; }); });
        if (free.length) { free.sort(function (x, y) { return Math.abs(x - me) - Math.abs(y - me); }); goal = free[0]; urgent = true; }
      }
      o.boxes.forEach(function (bx) {
        if (bx.tall) return;
        var dz = bx.z - b.bz - o.speed * lead;
        if (dz <= 0 || dz > .25 || Math.abs(bx.u - me) > .16) return;
        var pl = plan(bx, function () { return { side: r() < P.dodge, err: err(P.jump_err) }; });
        if (pl.side && !urgent) { goal = clamp(me + (bx.u >= me ? -.3 : .3)); urgent = true; }
        else if (dz < o.speed * .25 + pl.err + .02) a.jump = true;
      });
      // The runner warns, then pulls: step off it, or stay on and slash to cut it (which jams the Shredder), riding it
      // `ride` of the way toward the mouth first for a longer jam. A side spray makes the rug the safe place: get on it.
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
