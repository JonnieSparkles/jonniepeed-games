// Stick Army sky (SPEC-008 stages 2-3): what else crosses the page on the way to wave 15. The Red Cross plane you
// mustn't shoot (from wave 4), bomb balloons (7), HQ supply crates (8), dive bombers (12) and helicopters (13).
// Classic script; load before game.js. game.js calls StickArmySky(world) once with the same world object it gives
// units.js, after units.js. Balloons, dive bombers and helicopters are enemies and live in S.planes, so the turret,
// rockets, flak, the sentry and fighter cover all treat them as aircraft. The Red Cross plane (S.medevac) and the
// crates (S.crates) are on your side: only your own turret's shots touch them.
var StickArmySky = function (w) {
  'use strict';
  var W = w.W, GROUND = w.GROUND, BK = w.BK, TUR = w.TUR;
  var INK = w.INK, INK2 = w.INK2, RED = w.RED, BLUE = w.BLUE, PAPER = w.PAPER, RED_FILL = w.RED_FILL, INK_FILL = w.INK_FILL;
  var L = w.L, SP = w.SP, Ci = w.Ci, ink = w.ink, pen = w.pen, jt = w.jt;
  var clamp = w.clamp, between = w.between, rr = w.rr, R = Math.random, substream = w.substream, emit = w.emit;
  function addText(s, x, y, c, sz, kind) { w.addText(s, x, y, c, sz, kind); }

  // The Red Cross plane crosses slowly; a hit from your turret costs TAGS dog tags and your combo, then it flees.
  var MEDEVAC = { WAVE: 4, SPEED: 58, Y: [128, 196], TAGS: 30, HW: 30, HH: 12, FLEE: 2.4 };
  // A bomb balloon drifts in from an edge toward the bunker and lets its bomb go over it at DROP_Y. Popped anywhere
  // else, its bomb falls where it is: on the enemy, or on your crew.
  var BALLOON = { WAVE: 7, SPEED: 17, Y: [150, 230], DROP_Y: 410, HW: 13, HH: 24 };
  // HQ drops a blue crate over a mat. Pop its chute low and catch it on the mat; shoot the crate and it's lost; leave
  // it and it lands in no-man's land, where the enemy takes it. Inside: dog tags, a wall patch or a radio call.
  var CRATE = { WAVE: 8, Y: 98, FALL: 50, TAGS: 35, WALL: 25 };
  // A dive bomber comes in level with its siren wailing, tips over at ANGLE below level, lets its heavy bomb go at
  // RELEASE_Y so it carries on to the target, then pulls out and climbs away. Three hits down it.
  var DIVE = { WAVE: 12, Y: 112, CRUISE: 190, SPEED: 250, ANGLE: 1.25, RELEASE_Y: 392, PULL: 2.2, CLIMB: -0.55, HP: 3, HW: 26, HH: 11, WALL: 30 };
  // A helicopter flies to a hover near its edge, lowers troopers on a rope one at a time (no chutes), waits, then
  // leaves. Its door gunner fires bursts at the crew (at the turret with no crew). It's armored (heliHP), and when
  // it goes down anyone still on the rope falls.
  var HELI = { WAVE: 13, SPEED: 72, Y: 118, HOVER: [300, 340], TROOPS: [4, 5], ROPE_EVERY: 0.8, ROPE: 85, GUN_EVERY: 1.7, BURST: 3, GAP: 0.13,
    SHOT: 260, HURT: 0.6, WAIT: 1.4, HW: 36, HH: 17 };
  function heliHP(n) { return Math.round(10 + 0.5 * (n - HELI.WAVE)); }
  var KINDS = { balloon: true, diver: true, heli: true };

  // ---------- the wave's schedule ----------
  // Pure in n, folded into waveCfg. None of the enemies come with the Dreadnought; HQ's crates still do.
  function counts(n, dread) {
    return {
      medevac: n >= MEDEVAC.WAVE && !dread ? (n < 12 ? 1 : 2) : 0,
      balloons: n >= BALLOON.WAVE && !dread ? Math.min(6, 2 + Math.floor((n - BALLOON.WAVE) / 2)) : 0,
      crates: n >= CRATE.WAVE ? (n < 12 ? 1 : 2) : 0,
      divers: n >= DIVE.WAVE && !dread ? Math.min(8, 3 + Math.floor((n - DIVE.WAVE) / 2)) : 0,
      helis: n >= HELI.WAVE && !dread ? Math.min(5, 1 + Math.floor((n - HELI.WAVE + 1) / 2)) : 0
    };
  }
  // Timers come from one draw of the wave stream, so what happens in the fight never shifts them.
  function start(sp, c) {
    var rnd = substream(w.RW);
    sp.sky = { rnd: rnd, medevac: c.medevac, medevacT: c.medevac ? between(rnd, 6, 14) : 99, balloons: c.balloons, balloonT: between(rnd, 4, 7),
      crates: c.crates, crateT: between(rnd, 7, 13), divers: c.divers, diverT: between(rnd, 6, 9), helis: c.helis, heliT: between(rnd, 8, 11) };
  }
  function tick(sp, dt) {
    var k = sp.sky;
    if (!k) return;
    if (k.medevac > 0 && (k.medevacT -= dt) <= 0) { k.medevac--; spawnMedevac(k.rnd); k.medevacT = between(k.rnd, 14, 22); }
    if (k.balloons > 0 && (k.balloonT -= dt) <= 0) { k.balloons--; spawnBalloon(k.rnd); k.balloonT = between(k.rnd, 5, 9); }
    if (k.crates > 0 && (k.crateT -= dt) <= 0) { k.crates--; spawnCrate(k.rnd); k.crateT = between(k.rnd, 12, 18); }
    if (k.divers > 0 && (k.diverT -= dt) <= 0) { k.divers--; spawnDiver(k.rnd); k.diverT = between(k.rnd, 6, 10); }
    if (k.helis > 0 && (k.heliT -= dt) <= 0) { k.helis--; spawnHeli(k.rnd); k.heliT = between(k.rnd, 13, 18); }
  }
  // Enemies still due: the wave isn't over until they've come.
  function pending(sp) { var k = sp && sp.sky; return k ? k.balloons + k.divers + k.helis : 0; }
  // No dead air: with the field clear, the next one comes soon.
  function hurry(sp, t) { var k = sp && sp.sky; if (k) { k.balloonT = Math.min(k.balloonT, t); k.diverT = Math.min(k.diverT, t); k.heliT = Math.min(k.heliT, t); } }
  // When the fighting's done, the friendly extras still due are called off; a crate already falling is waited for.
  // all: everything still due is called off (the enemy has surrendered).
  function settle(sp, all) { var k = sp && sp.sky; if (k) { k.medevac = 0; k.crates = 0; if (all) k.balloons = k.divers = k.helis = 0; } }
  // On surrender: balloons are let go unarmed, dive bombers climb away, helicopters leave.
  function flee(p) {
    if (p.kind === 'balloon') { p.armed = false; p.gone = true; w.S.skyFx.push({ k: 'loose', x: p.x, y: p.y, vx: p.dir * 12, vy: -70, life: 4, id: p.id }); }
    else if (p.kind === 'diver') { p.phase = 'climb'; p.ang = DIVE.CLIMB; p.speed = DIVE.SPEED; }
    else { p.phase = 'out'; p.kits = []; p.burst = 0; }
  }
  function waiting() { return w.S.crates.length > 0; }

  // ---------- the Red Cross plane ----------
  function spawnMedevac(rnd) {
    var S = w.S, r = substream(rnd), dir = r() < 0.5 ? 1 : -1;
    var m = { id: w.id(), x: dir > 0 ? -50 : W + 50, y: between(r, MEDEVAC.Y[0], MEDEVAC.Y[1]), dir: dir, speed: MEDEVAC.SPEED, hit: false, smoke: 0, bob: r() * 6.28 };
    m.y0 = m.y;
    S.medevac.push(m);
    emit('medevac', { dir: dir, y: m.y });
    // The first two of a run say so.
    if ((S.medevacTold = (S.medevacTold || 0) + 1) <= 2) addText("Red Cross: don't shoot!", dir > 0 ? 110 : W - 110, m.y + 34, BLUE, 20);
    return m;
  }
  function updateMedevac(dt) {
    var S = w.S;
    S.medevac.forEach(function (m) {
      m.x += m.dir * m.speed * dt; m.y = m.y0 + Math.sin(S.t * 1.3 + m.bob) * 3;
      if (m.hit) { m.smoke -= dt; if (m.smoke <= 0) { m.smoke = 0.1; w.puff(m.x - m.dir * 22, m.y - 2, 3, 0.7); } }
      if (m.x < -70 || m.x > W + 70) m.gone = true;
    });
    S.medevac = S.medevac.filter(function (m) { return !m.gone; });
  }
  function hurtMedevac(m) {
    var S = w.S, lost = Math.min(S.coins, MEDEVAC.TAGS);
    m.hit = true; m.speed *= MEDEVAC.FLEE;
    S.coins -= lost; S.combo = 0; S.comboT = 0;
    addText('Red Cross hit!' + (lost ? ' -' + lost + ' tags' : ''), m.x, m.y + 32, RED, 22);
    w.burst(m.x, m.y, 5, INK, 100);
    emit('redcross_hit', { lost: lost });
    w.sound.play('wrong');
  }

  // ---------- bomb balloons ----------
  function spawnBalloon(rnd) {
    var S = w.S, r = substream(rnd), side = r() < 0.5 ? -1 : 1;
    var p = w.makePlane('balloon', -side, side < 0 ? -20 : W + 20, between(r, BALLOON.Y[0], BALLOON.Y[1]));
    p.rng = r; p.hp = 1; p.hw = BALLOON.HW; p.hh = BALLOON.HH; p.sc = 1; p.bob = r() * 6.28; p.armed = true;
    p.targetX = BK.x + between(r, -6, 6); p.speed = BALLOON.SPEED;
    p.vx = p.dir * BALLOON.SPEED; p.vy = (BALLOON.DROP_Y - p.y) / (Math.abs(p.targetX - p.x) / BALLOON.SPEED); p.baseY = p.y;
    S.planes.push(p);
    emit('plane_spawn', { kind: 'balloon', dir: p.dir, y: p.y });
    if (!S.balloonTold) { S.balloonTold = true; addText('bomb balloon!', side < 0 ? 70 : W - 70, p.y + 40, RED, 22); }
    return p;
  }
  function release(p) {
    p.armed = false;
    w.S.bombs.push({ id: w.id(), x: p.x, y: p.y + 20, vx: p.vx * 0.5, vy: 0, isBomb: true, balloon: true, dead: false });
    emit('bomb_dropped', { by: 'balloon' });
    w.sound.play('whistle');
  }
  function updateBalloon(p, dt) {
    var S = w.S;
    p.x += p.vx * dt; p.baseY += p.vy * dt; p.y = p.baseY + Math.sin(S.t * 1.6 + p.bob) * 3;
    // Over the bunker it lets go, and the empty balloon floats off the page (a cosmetic, not an enemy).
    if ((p.x - p.targetX) * p.dir >= 0) {
      release(p); p.gone = true;
      S.skyFx.push({ k: 'loose', x: p.x, y: p.y, vx: p.dir * 12, vy: -70, life: 4, id: p.id });
    }
  }
  function popBalloon(p, owner) {
    var S = w.S;
    p.state = 'pop'; p.gone = true;
    release(p);
    for (var i = 0; i < 4; i++) S.parts.push({ k: 'shred', x: p.x + rr(-12, 12), y: p.y - 12 + rr(-6, 6), vx: rr(-60, 60), vy: rr(-50, 10), rot: rr(0, 6), vr: rr(-6, 6), life: rr(0.6, 1), max: 1, id: w.id() });
    w.award(15, p.x, p.y - 16, 'pop!', owner === 'ally' ? BLUE : INK, true);
    emit('plane_down', { kind: 'balloon', by: owner === 'ally' ? 'crew' : 'player' });
    w.sound.play('pop');
  }

  // ---------- HQ supply crates ----------
  function spawnCrate(rnd) {
    var S = w.S, r = substream(rnd), mats = w.activeTramps(), mat = mats[Math.floor(r() * mats.length)], roll = r();
    var c = { id: w.id(), x: between(r, mat.x1 + 10, mat.x2 - 10), y: CRATE.Y, state: 'chute', kind: roll < 0.4 ? 'tags' : roll < 0.7 ? 'wall' : 'call',
      call: r() < 0.6 ? 'bomber' : 'fighter', vy: 0, sway: r() * 6.28, rot: 0, spin: 0, told: !!S.crateTold, dead: false };
    S.crateTold = true;
    S.crates.push(c);
    emit('crate_drop', { kind: c.kind, x: c.x });
    w.sound.play('ready');
    return c;
  }
  function crateLost(c, why) {
    c.dead = true;
    w.burst(c.x, c.y, 8, '#a8844f', 120);
    addText(why === 'landed' ? 'they took it!' : 'crate lost!', c.x, c.y - 24, why === 'landed' ? RED : INK2, 18, 'minor');
    emit('crate_lost', { why: why });
    w.sound.play(why === 'landed' ? 'thud' : 'hit');
  }
  function catchCrate(c, tr) {
    var S = w.S, x = c.x, y = tr.y - 30;
    c.dead = true; tr.v += 180;
    w.award(40, x, y - 26, 'supplies!', BLUE, true);
    if (c.kind === 'wall' && S.wallHP < S.mods.maxHP) { w.repairWall(CRATE.WALL, 'crate'); addText('+' + CRATE.WALL + ' wall', x, y, BLUE, 22); }
    else if (c.kind === 'call') w.grantCall(c.call, x, y);
    else { S.coins += CRATE.TAGS; w.flyTags(x, y, CRATE.TAGS); emit('coins', { amount: CRATE.TAGS, reason: 'crate' }); addText('+' + CRATE.TAGS + ' tags', x, y, BLUE, 22); }
    emit('crate_caught', { kind: c.kind });
    w.sound.play('boing'); w.sound.play('recruit');
  }
  function updateCrates(dt) {
    var S = w.S, mats = w.activeTramps();
    S.crates.forEach(function (c) {
      if (c.state === 'chute') {
        c.y += CRATE.FALL * dt; c.x = clamp(c.x + Math.sin(S.t * 1.2 + c.sway) * 6 * dt, 14, W - 14);
        if (!c.told && c.y > 300) { c.told = true; addText('pop it over the mat!', c.x, c.y - 50, BLUE, 19); }
        if (c.y + 9 >= GROUND) crateLost(c, 'landed');
        return;
      }
      var feet = c.y + 9;
      c.vy += 650 * dt; c.y += c.vy * dt; c.rot += c.spin * dt;
      for (var i = 0; i < mats.length && !c.dead; i++) {
        var tr = mats[i];
        if (c.x >= tr.x1 + 2 && c.x <= tr.x2 - 2 && feet <= tr.y + 2 && c.y + 9 >= tr.y + 2) {
          if (c.vy <= w.CAPTURE_SPEED) catchCrate(c, tr); else { tr.v += 90; crateLost(c, 'smashed'); }
        }
      }
      if (!c.dead && c.y + 9 >= GROUND) crateLost(c, 'smashed');
    });
    S.crates = S.crates.filter(function (c) { return !c.dead; });
  }

  // ---------- dive bombers ----------
  function spawnDiver(rnd) {
    var S = w.S, r = substream(rnd), dir = r() < 0.5 ? 1 : -1, target = BK.x + between(r, -8, 8);
    var crew = S.recruits.filter(w.standing);
    if (crew.length && r() < 0.35) target = crew[Math.floor(r() * crew.length)].x;
    // Where to tip over so the bomb, let go at RELEASE_Y with the plane's speed, lands on the target.
    var vx = DIVE.SPEED * Math.cos(DIVE.ANGLE), vy = DIVE.SPEED * Math.sin(DIVE.ANGLE);
    var floor = Math.abs(target - BK.x) < 36 ? BK.top - 8 : GROUND - 6, fall = floor - (DIVE.RELEASE_Y + 8);
    var tf = (-vy + Math.sqrt(vy * vy + 2 * 260 * fall)) / 260, lead = (DIVE.RELEASE_Y - DIVE.Y) / Math.tan(DIVE.ANGLE) + vx * tf;
    // Come in from whichever side leaves room for some level flight first.
    if ((target - dir * lead - (dir > 0 ? 0 : W)) * dir < 50) dir = -dir;
    var p = w.makePlane('diver', dir, dir > 0 ? -50 : W + 50, DIVE.Y);
    p.rng = r; p.hp = DIVE.HP; p.hw = DIVE.HW; p.hh = DIVE.HH; p.sc = 0.8; p.speed = DIVE.CRUISE; p.ang = 0; p.drawAng = 0;
    p.diveX = target - dir * lead; p.phase = 'level'; p.vx = dir * DIVE.CRUISE; p.vy = 0; p.target = target; p.spin = 0;
    S.planes.push(p);
    emit('plane_spawn', { kind: 'diver', dir: dir, target: target });
    w.sound.play('siren');
    if (!S.diverTold) { S.diverTold = true; addText('dive bomber!', dir > 0 ? 80 : W - 80, DIVE.Y + 36, RED, 22); }
    return p;
  }
  function updateDiver(p, dt) {
    var S = w.S;
    if (p.state !== 'fly') { fallDown(p, dt); return; }
    if (p.phase === 'level' && (p.x - p.diveX) * p.dir >= 0) { p.phase = 'dive'; p.ang = DIVE.ANGLE; p.speed = DIVE.SPEED; emit('dive', { x: p.x }); }
    if (p.phase === 'dive' && p.y >= DIVE.RELEASE_Y) {
      p.phase = 'pull';
      S.bombs.push({ id: w.id(), x: p.x, y: p.y + 8, vx: p.dir * p.speed * Math.cos(p.ang), vy: p.speed * Math.sin(p.ang), isBomb: true, heavy: true, dead: false });
      emit('bomb_dropped', { by: 'diver' });
      w.sound.play('whistle');
    }
    if (p.phase === 'pull') { p.ang = Math.max(DIVE.CLIMB, p.ang - DIVE.PULL * dt); if (p.ang <= DIVE.CLIMB) p.phase = 'climb'; }
    p.vx = p.dir * p.speed * Math.cos(p.ang); p.vy = p.speed * Math.sin(p.ang);
    p.x += p.vx * dt; p.y += p.vy * dt;
    // The drawing tips over quickly rather than snapping.
    p.drawAng += clamp(p.ang - p.drawAng, -dt * 7, dt * 7);
    if (p.x < -90 || p.x > W + 90 || p.y < -60) p.gone = true;
  }

  // ---------- helicopters ----------
  function spawnHeli(rnd) {
    var S = w.S, r = substream(rnd), side = r() < 0.5 ? -1 : 1, n = r() < 0.5 ? HELI.TROOPS[0] : HELI.TROOPS[1];
    var p = w.makePlane('heli', -side, side < 0 ? -50 : W + 50, HELI.Y);
    p.rng = r; p.hp = p.maxHp = heliHP(S.wave); p.hw = HELI.HW; p.hh = HELI.HH; p.sc = 1; p.speed = HELI.SPEED; p.side = side;
    p.hoverX = side < 0 ? between(r, 52, 96) : between(r, 304, 348); p.hoverY = between(r, HELI.HOVER[0], HELI.HOVER[1]);
    p.phase = 'in'; p.kits = []; for (var i = 0; i < n; i++) p.kits.push(w.rollTrooper(r));
    p.ropeT = 0.7; p.gunT = 1.1; p.burst = 0; p.burstT = 0; p.wait = HELI.WAIT; p.vx = 0; p.vy = 0; p.aim = Math.PI / 2; p.flash = 0; p.tilt = 0; p.bob = r() * 6.28;
    S.planes.push(p);
    emit('plane_spawn', { kind: 'heli', dir: p.dir, troopers: n });
    w.sound.play('chopper');
    if (!S.heliTold) { S.heliTold = true; addText('chopper!', side < 0 ? 70 : W - 70, HELI.Y + 40, RED, 22); }
    return p;
  }
  function door(p) { return { x: p.x + p.dir * 7, y: p.y + 7 }; }
  function onRope(p) { return w.S.troopers.filter(function (t) { return !t.dead && t.state === 'rope' && t.heli === p.id; }); }
  function moveTo(p, x, y, dt) {
    var dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy), v = Math.min(HELI.SPEED, d * 1.6);
    p.vx = d > 0.1 ? dx / d * v : 0; p.vy = d > 0.1 ? dy / d * v : 0;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.tilt += (clamp(p.vx / HELI.SPEED, -1, 1) * 0.18 - p.tilt) * Math.min(1, dt * 4);
    return d < 2;
  }
  function updateHeli(p, dt) {
    var S = w.S;
    p.flash = Math.max(0, p.flash - dt); p.hitFlash = Math.max(0, p.hitFlash - dt);
    if (p.state !== 'fly') { fallDown(p, dt); return; }
    if (p.phase === 'in') { if (moveTo(p, p.hoverX, p.hoverY, dt)) { p.phase = 'drop'; w.say('go go go!', p.id, true); } return; }
    if (p.phase === 'out') { moveTo(p, p.side < 0 ? -90 : W + 90, 80, dt); if (p.x < -70 || p.x > W + 70) p.gone = true; return; }
    moveTo(p, p.hoverX, p.hoverY + Math.sin(S.t * 2 + p.bob) * 2, dt);
    if (p.phase === 'drop') {
      p.ropeT -= dt;
      if (p.ropeT <= 0 && p.kits.length) {
        p.ropeT = HELI.ROPE_EVERY;
        var d = door(p), t = w.spawnTrooper(d.x, d.y + 6, p.kits.shift());
        t.state = 'rope'; t.open = 0; t.fall = HELI.ROPE; t.heli = p.id;
        emit('rope', { x: t.x });
      }
      if (!p.kits.length && !onRope(p).length) p.phase = 'wait';
    } else if (p.phase === 'wait' && (p.wait -= dt) <= 0) { p.phase = 'out'; return; }
    gunner(p, dt);
  }
  // The door gunner: a burst of BURST shots every GUN_EVERY seconds at the nearest soldier standing.
  function gunner(p, dt) {
    var S = w.S, d = door(p), crew = S.recruits.filter(w.standing).sort(function (a, b) { return Math.abs(a.x - d.x) - Math.abs(b.x - d.x); });
    var tx = crew.length ? crew[0].x : TUR.x, ty = crew.length ? GROUND - 22 : TUR.y + 3;
    p.aim = Math.atan2(ty - d.y, tx - d.x);
    if (p.burst <= 0) { p.gunT -= dt; if (p.gunT <= 0) { p.gunT = HELI.GUN_EVERY; p.burst = HELI.BURST; p.burstT = 0; } return; }
    p.burstT -= dt;
    if (p.burstT > 0) return;
    p.burst--; p.burstT = HELI.GAP; p.flash = 0.06;
    var a = p.aim + (w.RC() * 2 - 1) * 0.04;
    S.enemyShots.push({ x: d.x + Math.cos(a) * 8, y: d.y + Math.sin(a) * 8, vx: Math.cos(a) * HELI.SHOT, vy: Math.sin(a) * HELI.SHOT, life: 2.5,
      dmg: HELI.HURT, cause: 'heli', turret: !crew.length });
    w.sound.play('sniper');
  }

  // ---------- hits ----------
  // Hit boxes: a dive bomber's box turns with it; the others are upright boxes.
  function hit(p, x, y, near) {
    var dx = x - p.x, dy = y - p.y;
    if (p.kind === 'diver') {
      var c = Math.cos(p.drawAng * p.dir), s = Math.sin(p.drawAng * p.dir), u = dx * c + dy * s, v = -dx * s + dy * c;
      return Math.abs(u) < p.hw + near && Math.abs(v) < p.hh + near;
    }
    return Math.abs(dx) < p.hw + near && Math.abs(dy) < p.hh + near;
  }
  function hurt(p, dmg, owner) {
    var S = w.S;
    if (p.state !== 'fly') return;
    if (p.kind === 'balloon') { popBalloon(p, owner); return; }
    p.hp -= dmg; p.hitFlash = 0.15;
    w.burst(p.x, p.y, 4, INK, 120);
    if (p.hp > 0) { addText('clank!', p.x, p.y - 18, INK2, 16, 'minor'); w.sound.play('clank'); return; }
    p.state = 'fall'; p.smoke = 0; p.rot = 0;
    p.vx = p.vx || 0; p.vy = Math.min(p.vy || 0, 60);
    S.stats.planes++; w.credit();
    emit('plane_down', { kind: p.kind, by: owner === 'ally' ? 'crew' : 'player' });
    w.pow(p.x, p.y, 30);
    w.award(p.kind === 'heli' ? 150 : 120, p.x, p.y + 28, p.kind === 'heli' ? 'chopper down!' : 'dive bomber down!', owner === 'ally' ? BLUE : INK, true);
    S.shake = Math.max(S.shake, 0.3);
    w.sound.play('boom');
    // Anyone on its rope drops: over a mat, that's a catch.
    if (p.kind === 'heli') onRope(p).forEach(function (t) { t.state = 'free'; t.vy = 0; t.spin = rr(-2.5, 2.5); t.heli = null; });
  }
  // Going down: the dive bomber keeps its momentum, the helicopter spins, and both crash on the ground.
  function fallDown(p, dt) {
    var S = w.S;
    p.vy += 320 * dt; p.vx *= 1 - dt * 0.4; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.kind === 'diver') p.drawAng = Math.atan2(p.vy, Math.abs(p.vx) + 1); else p.rot += dt * 5;
    p.smoke -= dt;
    if (p.smoke <= 0) { p.smoke = 0.08; w.puff(p.x, p.y - 4, 4, 0.7); }
    S.troopers.forEach(function (t) {
      if (!t.dead && (t.state === 'chute' || t.state === 'free') && Math.hypot(t.x - p.x, t.y + 10 - p.y) < 28) {
        t.dead = true; w.killFx(t); S.stats.kills++; emit('kill', { by: 'crash', type: t.type }); w.award(10, t.x, t.y, 'bonk!', INK, true);
      }
    });
    if (p.y >= GROUND - 10) { w.explode(clamp(p.x, 10, W - 10), GROUND - 4, 42, 'crash'); p.gone = true; }
  }
  function updatePlane(p, dt) {
    if (p.kind === 'balloon') updateBalloon(p, dt);
    else if (p.kind === 'diver') updateDiver(p, dt);
    else updateHeli(p, dt);
  }
  // Your turret's shots (bullets, flak and rockets alike) against the Red Cross plane and the crates. Returns true
  // when the shot was used up. The crew's and the sentry's fire passes them by.
  function shot(b) {
    var S = w.S, i;
    if (b.owner !== 'player') return false;
    for (i = 0; i < S.medevac.length; i++) {
      var m = S.medevac[i];
      if (!m.hit && Math.abs(b.x - m.x) < MEDEVAC.HW && Math.abs(b.y - m.y) < MEDEVAC.HH) { hurtMedevac(m); b.dead = true; return true; }
    }
    for (i = 0; i < S.crates.length; i++) {
      var c = S.crates[i];
      if (c.dead) continue;
      if (Math.abs(b.x - c.x) < 10 && Math.abs(b.y - c.y) < 9) { crateLost(c, 'shot'); b.dead = true; return true; }
      if (c.state !== 'chute') continue;
      var dx = (b.x - c.x) / 22, dy = (b.y - (c.y - 17)) / 20;
      if (dy < 0.15 && dy > -1 && dx * dx + dy * dy < 1) {
        c.state = 'free'; c.vy = 30; c.spin = rr(-1.5, 1.5); b.dead = true;
        for (var k = 0; k < 4; k++) S.parts.push({ k: 'shred', x: c.x + rr(-16, 16), y: c.y - 26 + rr(-6, 6), vx: rr(-50, 50), vy: rr(-40, 10), rot: rr(0, 6), vr: rr(-6, 6), life: rr(0.7, 1.1), max: 1.1, id: w.id() });
        addText('pop!', c.x + 16, c.y - 30, BLUE, 18, 'minor');
        emit('crate_pop', { x: c.x, y: c.y });
        w.sound.play('pop');
        return true;
      }
    }
    return false;
  }
  function update(dt) {
    var S = w.S;
    updateMedevac(dt); updateCrates(dt);
    S.skyFx.forEach(function (q) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; });
    S.skyFx = S.skyFx.filter(function (q) { return q.life > 0 && q.y > -60; });
  }

  // ---------- drawing ----------
  function balloonBody(x, y, armed, id) {
    var G = w.G;
    pen(id);
    // The envelope, a little highlight, the knot, the cradle lines and the bomb.
    G.beginPath(); G.ellipse(x, y - 10, 12, 14, 0, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(200,67,58,0.35)'; G.fill(); ink(RED, 2.2); G.stroke();
    G.beginPath(); L(x - 6, y - 17, x - 3, y - 20, 0.2); ink(PAPER, 2); G.stroke();
    G.beginPath(); L(x - 2, y + 4, x + 2, y + 4, 0.2); L(x, y + 4, x, y + (armed ? 11 : 16), 0.4); ink(INK, 1.4); G.stroke();
    if (!armed) return;
    G.save(); G.translate(x, y + 18);
    G.beginPath(); G.ellipse(0, 0, 4, 6.5, 0, 0, Math.PI * 2); G.fillStyle = INK; G.fill();
    G.beginPath(); L(-3.5, -5, -5, -10, 0.2); L(3.5, -5, 5, -10, 0.2); ink(INK, 1.5); G.stroke();
    G.restore();
  }
  // A Stuka-style gull-winged dive bomber with a siren on its leg, drawn nose to +x and turned along its path.
  var DIVER_PTS = [-40, 0, -38, -8, -26, -10, 22, -8, 34, -6, 44, -2, 44, 3, 30, 7, -30, 7];
  function drawDiver(p) {
    var G = w.G, sc = p.sc;
    pen(p.id);
    G.save(); G.translate(p.x, p.y); G.scale(p.dir, 1); G.rotate(p.drawAng); G.scale(sc, sc);
    G.beginPath(); SP(DIVER_PTS, true, 0.5); G.fillStyle = PAPER; G.fill(); G.fillStyle = p.hitFlash > 0 ? 'rgba(200,67,58,0.3)' : 'rgba(46,46,51,0.14)'; G.fill(); ink(INK, 2.4 / sc); G.stroke();
    // Inverted gull wing, canopy, tail fin with a red stripe, and fixed legs in spats.
    G.beginPath(); SP([-8, 2, 2, 9, 10, 6, 20, 4], false, 0.3); ink(INK, 3.2 / sc); G.stroke();
    G.beginPath(); SP([4, -8, 8, -14, 22, -13, 26, -7], false, 0.3); ink(INK, 1.8 / sc); G.stroke();
    G.beginPath(); SP([-34, -8, -40, -20, -32, -20, -26, -10], false, 0.3); ink(INK, 2 / sc); G.stroke();
    G.beginPath(); L(-36, -16, -33, -11, 0.2); ink(RED, 3 / sc); G.stroke();
    G.beginPath(); L(14, 6, 12, 16, 0.2); ink(INK, 2 / sc); G.stroke();
    G.beginPath(); G.ellipse(12, 17, 4, 2.6, 0, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill(); ink(INK, 1.6 / sc); G.stroke();
    // The siren: a little propeller on the leg, spinning faster in the dive.
    var sp = p.phase === 'dive' || p.phase === 'pull' ? 4 : 2.5;
    G.beginPath(); L(15, 10 - sp, 15, 10 + sp, 0.1); ink(RED, 1.6 / sc); G.stroke();
    var pl = w.boil % 2 ? 10 : 6; G.beginPath(); L(46, -pl, 46, pl, 0.4); ink(INK, 2.2 / sc); G.stroke();
    if (p.phase === 'level' || p.phase === 'dive') {
      // The heavy bomb under the belly until it lets go.
      G.beginPath(); G.ellipse(2, 11, 9, 4, 0, 0, Math.PI * 2); G.fillStyle = INK; G.fill();
    }
    if (p.state === 'fly' && p.phase === 'dive') { G.globalAlpha = 0.5; G.beginPath(); L(-48, -6, -64, -6); L(-48, 2, -70, 2); L(-48, 8, -60, 8); ink(INK2, 1.5 / sc); G.stroke(); G.globalAlpha = 1; }
    G.restore();
  }
  function drawHeli(p) {
    var G = w.G, f = -p.side, fly = p.state === 'fly';
    pen(p.id);
    G.save(); G.translate(p.x, p.y); G.rotate(p.rot + p.tilt); G.scale(f * 1.15, 1.15);
    // Tail boom and rotor, the bubble cabin, skids, and the big rotor on top.
    G.beginPath(); SP([-14, -5, -50, -7, -50, -2, -14, 3], true, 0.3); G.fillStyle = PAPER; G.fill(); ink(INK, 2.2); G.stroke();
    G.beginPath(); L(-50, -14, -46, -11, 0.2); L(-49, -8, -41, -10, 0.2); ink(RED, 2.6); G.stroke();
    var tr = w.boil % 2 ? 7 : 4; G.beginPath(); L(-52, -5 - tr, -52, -5 + tr, 0.2); ink(INK, 1.8); G.stroke();
    G.beginPath(); SP([-18, 0, -14, -10, 0, -13, 14, -10, 22, 0, 18, 9, -12, 10], true, 0.5); G.fillStyle = PAPER; G.fill();
    G.fillStyle = p.hitFlash > 0 ? 'rgba(200,67,58,0.3)' : INK_FILL; G.fill(); ink(INK, 2.4); G.stroke();
    G.beginPath(); SP([8, -9, 15, -8, 20, -1, 10, -1], true, 0.3); G.fillStyle = 'rgba(47,111,220,0.12)'; G.fill(); ink(INK, 1.4); G.stroke();
    G.beginPath(); L(-12, 10, -10, 15, 0.2); L(10, 9, 8, 15, 0.2); L(-18, 15, 18, 15, 0.3); L(18, 15, 22, 12, 0.2); ink(INK, 2); G.stroke();
    G.beginPath(); L(0, -13, 0, -18, 0.2); ink(INK, 2); G.stroke();
    var span = fly ? (w.boil % 2 ? 46 : 38) : 30;
    G.beginPath(); L(-span, -18 + jt(1), span, -18 + jt(1), 0.4); ink(INK, 2.2); G.stroke();
    if (fly) { G.globalAlpha = 0.35; G.beginPath(); L(-span * 0.8, -20, span * 0.8, -16, 0.3); ink(INK2, 1.4); G.stroke(); G.globalAlpha = 1; }
    // The open door and its gunner.
    G.beginPath(); G.rect(-4, -6, 12, 13); G.fillStyle = 'rgba(46,46,51,0.35)'; G.fill(); ink(INK, 1.4); G.stroke();
    if (fly) {
      G.beginPath(); G.arc(2, -1, 3, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill(); ink(RED, 1.6); G.stroke();
      var a = Math.atan2(Math.sin(p.aim), Math.cos(p.aim) * f);
      G.beginPath(); L(4, 3, 4 + Math.cos(a) * 12, 3 + Math.sin(a) * 12, 0.2); ink(INK, 2.4); G.stroke();
      if (p.flash > 0) { G.beginPath(); G.arc(4 + Math.cos(a) * 15, 3 + Math.sin(a) * 15, 3.5, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,0.9)'; G.fill(); }
    }
    G.restore();
    // A health bar once it's been hit, like a tank's.
    if (fly && p.hp < p.maxHp) {
      var f = Math.max(0, p.hp / p.maxHp);
      G.fillStyle = PAPER; G.fillRect(p.x - 17, p.y - 34, 34, 5);
      G.fillStyle = 'rgba(200,67,58,0.55)'; G.fillRect(p.x - 16, p.y - 33, 32 * f, 3);
      G.beginPath(); L(p.x - 17, p.y - 34, p.x + 17, p.y - 34, 0.2); L(p.x - 17, p.y - 29, p.x + 17, p.y - 29, 0.2); ink(INK, 1); G.stroke();
    }
    // The rope, from the door to below the lowest man on it.
    if (fly && (p.phase === 'drop' || p.phase === 'wait')) {
      var d = door(p), low = d.y + 40;
      onRope(p).forEach(function (t) { low = Math.max(low, t.y + 36); });
      G.beginPath(); L(d.x, d.y + 4, d.x + jt(1.5), Math.min(GROUND - 30, low), 0.6); ink(INK2, 1.6); G.stroke();
    }
  }
  function drawPlane(p) {
    if (p.kind === 'balloon') balloonBody(p.x, p.y, p.armed, p.id);
    else if (p.kind === 'diver') drawDiver(p);
    else drawHeli(p);
  }
  function drawMedevac(m) {
    var G = w.G, sc = 0.8;
    pen(m.id);
    G.save(); G.translate(m.x, m.y); G.scale(-m.dir * sc, sc);
    G.beginPath(); SP(w.PLANE_PTS, true, 0.5); G.fillStyle = PAPER; G.fill(); ink(INK2, 2.2 / sc); G.stroke();
    G.beginPath(); L(-12, 2, 14, 4); ink(INK2, 2.6 / sc); G.stroke();
    G.beginPath(); G.arc(4, -1, 7.5, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill(); ink(INK2, 1.4 / sc); G.stroke();
    G.beginPath(); L(0, -1, 8, -1, 0.1); L(4, -5, 4, 3, 0.1); ink(RED, 3 / sc); G.stroke();
    G.beginPath(); L(41, -17, 47, -17, 0.1); L(44, -20, 44, -14, 0.1); ink(RED, 2.2 / sc); G.stroke();
    var pl = w.boil % 2 ? 10 : 6; G.beginPath(); L(-42, -pl, -42, pl, 0.4); ink(INK2, 2 / sc); G.stroke();
    G.restore();
  }
  function drawCrate(c) {
    var G = w.G;
    pen(c.id);
    if (c.state === 'chute') {
      var x = c.x, base = c.y - 17, top = base - 20;
      G.beginPath(); G.moveTo(x - 20 + jt(0.6), base); G.bezierCurveTo(x - 20, top, x + 20, top, x + 20 + jt(0.6), base);
      G.quadraticCurveTo(x + 10, base - 5, x, base); G.quadraticCurveTo(x - 10, base - 5, x - 20, base); G.closePath();
      G.fillStyle = 'rgba(47,111,220,0.16)'; G.fill(); ink(BLUE, 2.2); G.stroke();
      G.beginPath(); L(x - 20, base, x - 8, c.y - 7, 0.4); L(x + 20, base, x + 8, c.y - 7, 0.4); ink(BLUE, 1.3); G.stroke();
    }
    G.save(); G.translate(c.x, c.y); G.rotate(c.rot);
    G.beginPath(); G.rect(-9, -7, 18, 15); G.fillStyle = '#e7dcc0'; G.fill(); ink(INK, 1.8); G.stroke();
    G.beginPath(); L(-9, -2, 9, -2, 0.2); ink(INK2, 1); G.stroke();
    // What's inside, stencilled on the side: a dog tag, a wall cross or a radio.
    if (c.kind === 'tags') w.dogTag(0, 2, -0.2, 0.7);
    else if (c.kind === 'wall') { G.beginPath(); L(-4, 3, 4, 3, 0.1); L(0, -1, 0, 7, 0.1); ink(BLUE, 2.4); G.stroke(); }
    else { G.beginPath(); G.rect(-2.5, -0.5, 5, 7); G.fillStyle = BLUE; G.fill(); G.beginPath(); L(1.5, -0.5, 2.2, -4.5, 0.1); ink(BLUE, 1.4); G.stroke(); }
    G.restore();
  }
  // Below the planes: the empty balloons drifting off; above them, the Red Cross plane and the crates.
  function drawBehind() {
    var G = w.G;
    w.S.skyFx.forEach(function (q) { G.save(); G.globalAlpha = Math.min(1, q.life / 1.5) * 0.8; balloonBody(q.x, q.y, false, q.id); G.restore(); });
  }
  function draw() { w.S.medevac.forEach(drawMedevac); w.S.crates.forEach(drawCrate); }

  return { heliHP: heliHP, MEDEVAC: MEDEVAC, BALLOON: BALLOON, CRATE: CRATE, DIVE: DIVE, HELI: HELI, KINDS: KINDS, counts: counts, start: start, tick: tick, pending: pending,
    hurry: hurry, settle: settle, flee: flee, waiting: waiting, spawnMedevac: spawnMedevac, spawnBalloon: spawnBalloon, spawnCrate: spawnCrate, spawnDiver: spawnDiver,
    spawnHeli: spawnHeli, hit: hit, hurt: hurt, updatePlane: updatePlane, shot: shot, update: update, drawPlane: drawPlane, drawBehind: drawBehind, draw: draw,
    onRope: onRope };
};
