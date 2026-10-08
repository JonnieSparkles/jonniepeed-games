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
  // A trooper on the ground: aim at his middle, or as low as the barrel dips if that still crosses his body
  // (the game's hit box runs from 7 px above his head to his feet).
  function groundShot(o, t) {
    var mid = { x: t.x, y: t.y + 14 }, a = angle(o, mid);
    if (a >= o.aimMin && a <= o.aimMax) return mid;
    a = a < o.aimMin ? o.aimMin + 1e-4 : o.aimMax - 1e-4; // just inside, so rounding can't push it out of reach
    var reach = (t.x - o.turret.x) / Math.cos(a), y = o.turret.y + Math.sin(a) * reach;
    if (reach < 30 || y < t.y - 6 || y > t.y + 33) return null;
    return { x: o.turret.x + Math.cos(a) * reach, y: y };
  }
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
      } else if (t.state === 'rope') {
        // Sliding down a helicopter's rope: no chute, so shoot him off it.
        consider(310 + t.y / 10, lead(o, t.x, t.y + 14, 0, t.fall), t.id);
      } else if (t.state === 'ground' && t.type !== 'sniper') {
        var shot = groundShot(o, t);
        if (shot) consider(320 - Math.abs(t.x - 200) / 10, shot, t.id);
      } else if (t.state === 'chute' && t.open > 0.6) {
        consider(100 + t.y / 10, lead(o, t.x, t.y + 14, 0, t.fall), t.id);
      }
    });
    o.planes.forEach(function (p) {
      if (p.state !== 'fly' || p.x < 20 || p.x > 380) return;
      // Balloons only while they're out over the field: popped over the squad, the bomb would land on it.
      if (p.kind === 'balloon') { if (p.x < 100 || p.x > 300) consider(250, lead(o, p.x, p.y, p.vx, p.vy), p.id); return; }
      // Bombers get priority over troopers: downing one saves chasing its whole bomb run. A dive bomber in its dive
      // comes before nearly everything.
      var rank = p.kind === 'zeppelin' ? 150 : p.kind === 'bomber' ? 340 : p.kind === 'cargo' ? 260 : p.kind === 'heli' ? 330 :
        p.kind === 'diver' ? (p.phase === 'dive' ? 470 : 300) : 200 + p.y / 10;
      consider(rank, lead(o, p.x, p.y, p.vx, p.vy || 0), p.id);
    });

    // The Dreadnought: the gun that's aiming comes before anything, then the hangar or the bridge, then its other guns.
    (o.dread || []).forEach(function (q) {
      consider(q.marking ? 560 : q.part === 'gun' ? 360 : 380, lead(o, q.x, q.y, q.vx, 0), q.id);
    });
    // Tanks: on the way down, or parked within the barrel's dip.
    (o.tanks || []).forEach(function (tk) {
      // A tank on its chutes shrugs off bullets; wait for it to land.
      if (tk.state === 'chute') return;
      else { var shot = groundShot(o, { x: tk.x - tk.dir * 18, y: tk.y - 14 }); if (shot) consider(330, shot, tk.id); }
    });
    return list;
  }

  // Hold fire while the Red Cross plane is in the line of fire (wider with the spread gun). Casual players don't check.
  function clear(o, a) {
    if (profile.shop === 'random') return true;
    var cone = (o.spread ? 0.13 : 0) + 0.04;
    return !(o.medevac || []).some(function (m) {
      var p = lead(o, m.x, m.y, m.vx, 0), half = Math.atan2(m.hw, Math.hypot(p.x - o.turret.x, p.y - o.turret.y));
      return Math.abs(angle(o, p) - a) < cone + half;
    });
  }
  // Like a hand on a mouse or a thumb on glass: the aim sweeps at a limited speed, stays on its target until
  // something clearly more urgent appears, and carries a small per-target offset plus tremor.
  var aim = -Math.PI / 2, focus = null, offset = 0, lastT = 0, readyAt = 0;
  // Air strikes: when a tank is shelling the wall, the ground is crowded, or the wall is in trouble.
  // Casual players only reach for it when things are dire.
  function wantStrike(o) {
    if (!o.calls.bomber || o.strikeActive) return false;
    var ground = o.troopers.filter(function (t) { return t.state === 'ground'; }).length;
    var parked = (o.tanks || []).some(function (tk) { return tk.state !== 'chute'; });
    if (profile.shop === 'random') return o.wall < o.maxWall * 0.25;
    return parked || ground >= 5 || o.wall < o.maxWall * 0.3;
  }
  // Fighter cover: when the sky fills with bombers or bombs. Casual players wait until the wall is low.
  function wantFighter(o) {
    if (!o.calls.fighter || o.fighterActive) return false;
    var bombers = o.planes.filter(function (p) { return p.state === 'fly' && (p.kind === 'bomber' || p.kind === 'diver') && p.x > 0 && p.x < 400; }).length;
    var falling = o.bombs.filter(function (m) { return m.y < o.ground - 150; }).length;
    if (profile.shop === 'random') return o.wall < o.maxWall * 0.3 && (bombers || falling);
    return bombers >= 2 || falling >= 4;
  }
  function decide(o) {
    var dt = Math.min(0.1, Math.max(0, o.t - lastT)); lastT = o.t;
    var strike = wantStrike(o), fighter = wantFighter(o);
    if (profile.heat_stop < 1) { if (o.heat > profile.heat_stop) hot = true; else if (o.heat < profile.heat_resume) hot = false; }
    var list = candidates(o), best = null, current = null;
    list.forEach(function (c) { if (!best || c.rank > best.rank) best = c; if (focus && c.id === focus) current = c; });
    var target = current && (!best || best.rank < current.rank + 100) ? current : best;
    if (!target) { focus = null; return { fire: false, strike: strike, fighter: fighter }; }
    // A new target takes a moment to pick up (switch_s).
    if (target.id !== focus) { focus = target.id; offset = (rnd() * 2 - 1) * aimErr; readyAt = o.t + profile.switch_s; }
    // The hand starts moving once the new target is picked up, then sweeps at aim_speed. Like most players,
    // the bot keeps the trigger down while it has a target, and only heat discipline lets go.
    var want = target.angle + offset + (rnd() * 2 - 1) * aimErr * 0.25, step = o.t >= readyAt ? profile.aim_speed * dt : 0;
    aim += Math.max(-step, Math.min(step, want - aim));
    return { aimAt: { x: o.turret.x + Math.cos(aim) * 200, y: o.turret.y + Math.sin(aim) * 200 }, fire: o.overheat <= 0 && !hot && clear(o, aim), strike: strike, fighter: fighter };
  }

  // Shop: one readable function. The gift first, a rifleman if the squad is down to one or none, the top of the
  // supply list, then hiring, then the rest of the supplies within the budget, and pizza last when the wall is low.
  var PRIORITY = ['strike', 'spread', 'double', 'fighter', 'tramp', 'fire', 'rockets', 'auto', 'hospital', 'cool', 'trench', 'helmet', 'flak', 'pierce', 'slot',
    'mines', 'catcher', 'mat', 'aim', 'sandbags', 'wire', 'repair'];
  function shop(o) {
    var sh = o.shop, take = [];
    if (shopped === o.wave) return { continue: true };
    shopped = o.wave;
    var coins = o.coins, wallLow = o.wall < o.maxWall * 0.45, cushion = profile.shop === 'save' ? 40 : 0;
    // Calls compete with upgrades: early on keep one in hand, and fill the radio once tanks are near. A field hospital
    // waits until there's a squad worth saving.
    var held = o.calls.bomber + o.calls.fighter, callCap = o.wave >= 8 ? 2 : 1;
    function isCall(it) { return it.id === 'strike' || it.id === 'fighter'; }
    function wanted(it) { return isCall(it) ? held < callCap : it.id === 'hospital' ? o.recruits.length >= 4 : true; }
    function buy(it) {
      if (!it || !it.can || it.cost > coins || !wanted(it)) return false;
      take.push(it.id); coins -= it.cost; if (isCall(it)) held++; return true;
    }
    var items = sh.items.filter(function (it) { return it.can || it.cost > coins; });
    var gift = items.find(function (it) { return it.gift; });
    buy(gift);
    // An empty trench loses to the first landers, so a thin squad gets the cheapest hire before any supplies.
    var have = {}, crew = o.recruits.length, extra = 0;
    o.recruits.forEach(function (r) { have[r.type] = (have[r.type] || 0) + 1; });
    var first = (sh.hire || []).find(function (it) { return it.id === 'hire-rifle'; });
    if (profile.shop !== 'random' && crew < 2 && crew < o.slots && first && first.cost <= coins) {
      take.push(first.id); coins -= first.cost; extra += 15; crew++; have.rifle = (have.rifle || 0) + 1;
    }
    var pizza = items.find(function (it) { return it.id === 'pizza'; });
    var wantPizza = pizza && pizza.can && o.wall < o.maxWall * (profile.shop === 'random' ? 0.3 : 0.35);
    if (wantPizza) coins -= pizza.cost;
    var rest = items.filter(function (it) { return it !== gift && it.id !== 'pizza'; }), later = [];
    if (profile.shop === 'random') {
      if (rest.length && rnd() < 0.5) buy(rest[Math.floor(rnd() * rest.length)]);
    } else {
      var order = wallLow ? ['repair', 'sandbags'].concat(PRIORITY) : PRIORITY;
      rest.sort(function (x, y) { return order.indexOf(x.id) - order.indexOf(y.id); });
      rest.forEach(function (it) { if (order.indexOf(it.id) < 4) buy(it); else later.push(it); });
    }
    // Hiring: the role the squad lacks most, up to two a visit. Every hire raises the next price by 15.
    for (var n = 0; n < 2 && crew < o.slots; n++) {
      var role = !have.bazooka ? 'bazooka' : !have.engineer ? 'engineer' : !have.medic && crew >= 3 ? 'medic' : 'rifle';
      if (profile.shop === 'random') { if (rnd() > 0.35) break; role = ['rifle', 'engineer', 'bazooka', 'sniper'][Math.floor(rnd() * 4)]; }
      var job = (sh.hire || []).find(function (it) { return it.id === 'hire-' + role; });
      if (!job || job.cost + extra > coins - cushion) break;
      take.push(job.id); coins -= job.cost + extra; extra += 15; crew++; have[role] = (have[role] || 0) + 1;
    }
    // Experts keep a cushion for the rest of the list.
    later.forEach(function (it) { if (coins - it.cost >= cushion) buy(it); });
    if (wantPizza && coins >= 0) take.push('pizza');
    return { take: take, continue: true };
  }
  return { decide: decide, shop: shop };
};
