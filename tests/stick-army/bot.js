// Stick Army balance bot (SPEC-005): how to play this game. Runs in the page with no access to game internals;
// it reads observe() copies and answers with act() inputs. tools/balance/driver.js handles reaction delay.
window.__balanceBot = function (profile, seed) {
  'use strict';
  var s = (seed * 2654435761 + 0x6d2b79f5) >>> 0;
  function rnd() { s = (s + 0x6d2b79f5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  var seen = {}, hot = false, shopped = -1, aimErr = profile.aim_error_deg * Math.PI / 180;

  // Where a bomb will land, so only bombs heading for the bunker or the crew get shot.
  function landingX(m, o) {
    var dy = o.ground - 6 - m.y, tt = (-m.vy + Math.sqrt(m.vy * m.vy + 2 * 260 * Math.max(0, dy))) / 260;
    return m.x + m.vx * tt;
  }
  function overMat(t, o) { return o.mats.some(function (m) { return t.x > m.x1 + 8 && t.x < m.x2 - 8; }); }
  // Lead a target moving at (vx, vy) for the bullet's travel time.
  function lead(o, x, y, vx, vy) {
    var tt = Math.hypot(x - o.turret.x, y - o.turret.y) / o.bulletSpeed;
    tt = Math.hypot(x + vx * tt - o.turret.x, y + vy * tt - o.turret.y) / o.bulletSpeed;
    return { x: x + vx * tt, y: y + vy * tt };
  }
  // Turret angles run continuously from aimMin (below left) to aimMax (below right), as the game's aimAt maps them.
  function angle(o, p) { var a = Math.atan2(p.y - o.turret.y, p.x - o.turret.x); return a > Math.PI / 2 ? a - Math.PI * 2 : a; }
  // Every target worth shooting, ranked: bombs bound for the bunker or crew, chutes over a mat to capture,
  // troopers about to land or at the wall, aircraft, then any other chute. New ones need noticing first.
  function candidates(o) {
    var list = [];
    function consider(rank, point, id) {
      if (!(id in seen)) seen[id] = o.t;
      if (o.t - seen[id] < profile.notice_s) return;
      var a = angle(o, point);
      if (a >= o.aimMin && a <= o.aimMax) list.push({ id: id, rank: rank, point: point, angle: a });
    }
    o.bombs.forEach(function (m) {
      var lx = landingX(m, o), threat = Math.abs(lx - 200) < 60 || o.recruits.some(function (r) { return Math.abs(r.x - lx) < 30; });
      if (threat && m.y > 200) consider(500 + m.y / 10, lead(o, m.x, m.y, m.vx, m.vy + 130 * 0.4), m.id);
    });
    o.troopers.forEach(function (t) {
      if (t.state === 'chute' && t.open > 0.6 && overMat(t, o) && t.y > 210 && t.y < 520) {
        // Hit the canopy on its outer edge, away from the body, so the shot pops the chute instead of killing.
        var side = t.x < 200 ? -1 : 1;
        consider(400 + t.y / 10, lead(o, t.x + side * 11, t.y - 25, 0, t.fall), t.id);
      } else if (t.state === 'chute' && t.y > 400) {
        consider(300 + t.y / 10, lead(o, t.x, t.y + 14, 0, t.fall), t.id);
      } else if (t.state === 'ground' && t.type !== 'sniper') {
        consider(320 - Math.abs(t.x - 200) / 10, { x: t.x, y: t.y + 16 }, t.id);
      } else if (t.state === 'chute' && t.open > 0.6) {
        consider(100 + t.y / 10, lead(o, t.x, t.y + 14, 0, t.fall), t.id);
      }
    });
    o.planes.forEach(function (p) {
      if (p.state === 'fly' && p.x > 20 && p.x < 380) consider(p.kind === 'zeppelin' ? 150 : 200 + p.y / 10, lead(o, p.x, p.y, p.vx, 0), p.id);
    });
    return list;
  }

  // Like a hand on a mouse or a thumb on glass: the aim sweeps at a limited speed, stays on its target until
  // something clearly more urgent appears, and carries a small per-target offset plus tremor.
  var aim = -Math.PI / 2, focus = null, offset = 0, lastT = 0;
  function decide(o) {
    var dt = Math.min(0.1, Math.max(0, o.t - lastT)); lastT = o.t;
    if (profile.heat_stop < 1) { if (o.heat > profile.heat_stop) hot = true; else if (o.heat < profile.heat_resume) hot = false; }
    var list = candidates(o), best = null, current = null;
    list.forEach(function (c) { if (!best || c.rank > best.rank) best = c; if (focus && c.id === focus) current = c; });
    var target = current && (!best || best.rank < current.rank + 100) ? current : best;
    if (!target) { focus = null; return { fire: false }; }
    if (target.id !== focus) { focus = target.id; offset = (rnd() * 2 - 1) * aimErr; }
    var want = target.angle + offset + (rnd() * 2 - 1) * aimErr * 0.25, step = profile.aim_speed * dt;
    aim += Math.max(-step, Math.min(step, want - aim));
    var onTarget = Math.abs(want - aim) < 0.05;
    return { aimAt: { x: o.turret.x + Math.cos(aim) * 200, y: o.turret.y + Math.sin(aim) * 200 },
      fire: o.overheat <= 0 && !hot && (profile.spray || onTarget) };
  }

  // Shop: one readable function. Free pick by situation, then premium spending by profile.
  var FREE_ORDER = ['fire', 'double', 'cool', 'trench', 'helmet', 'slot', 'mat', 'aim', 'sandbags', 'wire', 'repair', 'stash'];
  var GOOD = ['tramp', 'spread', 'rockets', 'auto', 'flak', 'pierce', 'mines', 'catcher', 'medic'];
  function shop(o) {
    var sh = o.shop, take = [];
    if (shopped === o.wave) return { continue: true };
    shopped = o.wave;
    var free = sh.free.filter(function (it) { return it.can; }), wallLow = o.wall < o.maxWall * 0.45;
    if (free.length) {
      var pick;
      if (profile.shop === 'random') pick = free[Math.floor(rnd() * free.length)];
      else {
        var order = wallLow ? ['repair', 'sandbags'].concat(FREE_ORDER) : FREE_ORDER;
        pick = free.slice().sort(function (x, y) { return order.indexOf(x.id) - order.indexOf(y.id); })[0];
      }
      take.push(pick.id);
    }
    var coins = o.coins, prem = sh.premium.filter(function (it) { return it.can; });
    function buy(it) { if (it && it.cost <= coins) { take.push(it.id); coins -= it.cost; return true; } return false; }
    var pizza = prem.find(function (it) { return it.id === 'pizza'; }), hire = prem.find(function (it) { return it.id === 'hire'; });
    var offer = prem.find(function (it) { return it.id !== 'pizza' && it.id !== 'hire'; });
    // Pizza goes last: the delivery leaves the shop, and the bot continues once it returns.
    var wantPizza = pizza && o.wall < o.maxWall * (profile.shop === 'random' ? 0.3 : 0.35);
    if (wantPizza) coins -= pizza.cost;
    if (profile.shop === 'random') {
      var others = prem.filter(function (it) { return it.id !== 'pizza'; });
      if (rnd() < 0.35 && others.length) buy(others[Math.floor(rnd() * others.length)]);
    } else {
      if (offer && GOOD.indexOf(offer.id) >= 0) buy(offer);
      // Experts keep a cushion for the next good premium; others hire whenever a slot is free.
      if (hire && (profile.shop !== 'save' || coins - hire.cost >= 60) && o.recruits.length < o.slots) buy(hire);
    }
    if (wantPizza && coins >= 0) take.push('pizza');
    return { take: take, continue: true };
  }
  return { decide: decide, shop: shop };
};
