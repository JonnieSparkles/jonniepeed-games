// Stick Army campaign (SPEC-007): the Dreadnought, the final boss at wave 15; the victory card with the squad's roll
// call; and endless play after it. Classic script; load after shop.js and before game.js. game.js calls
// StickArmyCampaign(world) once with the same world object it gives units.js, squad.js and shop.js.
var StickArmyCampaign = function (w) {
  'use strict';
  var W = w.W, GROUND = w.GROUND, BK = w.BK;
  var INK = w.INK, INK2 = w.INK2, RED = w.RED, BLUE = w.BLUE, PAPER = w.PAPER, HAT = w.HAT;
  var L = w.L, SP = w.SP, ink = w.ink, pen = w.pen, clamp = w.clamp, between = w.between, rr = w.rr, substream = w.substream;
  var emit = w.emit, addText = w.addText;

  // ---------- the Dreadnought ----------
  // The enemy flagship: an armored airship 600 px long, wider than the page. It sails in bow first from one side
  // (ENTER px/s, easing to a stop) with its horn, searchlights sweeping the ground, and fights in three stages:
  //   guns:   it patrols back and forth (DRIFT px/s between PATROL) so its four underside gun turrets take turns over
  //           the page. A loaded gun aims at a target for AIM seconds (a red crosshair on the ground, its barrel
  //           glowing), then fires a volley of three shells around it. What the middle shell hits is gone for good.
  //   hangar: with the guns gone, the hangar doors in its belly open. It launches dive bombers and drops troops until
  //           the hangar is shot to pieces.
  //   bridge: then the bridge car under the bow is exposed. The ship turns angry, brings the bridge over the page,
  //           its bomb bay drops clusters at the bunker and a gunner on the bridge fires at the crew.
  // Downing the bridge downs the ship: explosions run along it as it lists and sinks off the page. Its hull is
  // armored throughout; only the part for the stage can be hurt. It lives in S.planes as kind 'dread', so bullets,
  // rockets, flak, bazookas and the ambience all see it. Local x runs stern to bow; on the page, x = p.x + p.dir * lx.
  var DREAD = {
    WAVE: 15, EVERY: 10, Y: 196, HW: 300, HH: 38, ARRIVE: 2, ENTER: 90,
    PATROL: [70, 330], DRIFT: 24, SWAY: 18,
    TURRETS: [-210, -100, 20, 130], HANGAR: -40, BRIDGE: 222, GUN_Y: 47, HANGAR_Y: 40, BRIDGE_Y: 54, LIGHTS: [-150, 90],
    AIM: 0.9, MARKS: 2, EXPOSED: 2, RELOAD: [3, 4], VOLLEY: [-26, 0, 26], SHELL_GAP: 0.14, SHELL: 0.5, SHELL_WALL: 8, SPLASH: 26, DIRECT: 4,
    LAUNCH_EVERY: 4, TROOPS_EVERY: 5, BOMBS_EVERY: 3, BAY_BOMBS: 4, BRIDGE_GUN: 2, BURST: 3, SHOT_HURT: 0.5,
    SINK: 3.2
  };
  function turretHP(n) { return Math.round(30 + 1.5 * n); }
  function hangarHP(n) { return Math.round(70 + 3.5 * n); }
  function bridgeHP(n) { return Math.round(80 + 4.5 * n); }
  // Wave 15, then every tenth wave in endless.
  function isDreadWave(n) { return n >= DREAD.WAVE && (n - DREAD.WAVE) % DREAD.EVERY === 0; }
  function dread() { return w.S.planes.find(function (p) { return p.kind === 'dread'; }) || null; }
  function fighting(p) { return p.phase === 'guns' || p.phase === 'hangar' || p.phase === 'bridge'; }
  // Where it stops: its first station as it sails in (the bow-most guns over the page), then the hangar over the
  // middle, then the bridge well out ahead with the bomb bay still on the page behind it.
  function settleX(p) { return 200 - p.dir * 130; }
  function stageX(p) { return p.phase === 'hangar' ? 200 - p.dir * DREAD.HANGAR : 200 + p.dir * 120 - p.dir * DREAD.BRIDGE; }

  function spawnDread() {
    var S = w.S, rnd = substream(w.RW), n = S.wave, dir = rnd() < 0.5 ? -1 : 1;
    var p = w.makePlane('dread', dir, dir < 0 ? W + DREAD.HW + 40 : -DREAD.HW - 40, DREAD.Y);
    p.rng = rnd; p.hw = DREAD.HW; p.hh = DREAD.HH; p.speed = DREAD.ENTER; p.phase = 'arrive'; p.t = 0; p.move = dir; p.rot = 0;
    p.turrets = DREAD.TURRETS.map(function (lx) {
      return { lx: lx, hp: turretHP(n), max: turretHP(n), cd: between(rnd, 0.8, 2), aim: Math.PI / 2, flash: 0, recoil: 0, dead: false, mark: null, id: w.id() };
    });
    p.hangar = { lx: DREAD.HANGAR, hp: hangarHP(n), max: hangarHP(n), flash: 0, open: 0, id: w.id() };
    p.bridge = { lx: DREAD.BRIDGE, hp: bridgeHP(n), max: bridgeHP(n), flash: 0, id: w.id() };
    p.hp = p.maxHp = p.turrets.length * turretHP(n) + hangarHP(n) + bridgeHP(n);
    p.shells = []; p.launchT = 1.5; p.troopT = 2.5; p.bombT = 2; p.gunT = 1.5; p.burst = 0; p.burstT = 0; p.boomT = 0; p.clankT = 0;
    S.planes.push(p);
    emit('plane_spawn', { kind: 'dread', hp: p.maxHp, dir: dir });
    w.sound.play('horn'); w.sound.play('rumble');
    return p;
  }

  // Where its parts are on the page.
  function at(p, lx, ly) { return { x: p.x + p.dir * lx, y: p.y + ly }; }
  function gunAt(p, t) { return at(p, t.lx, DREAD.GUN_Y); }
  function hangarAt(p) { return at(p, DREAD.HANGAR, DREAD.HANGAR_Y); }
  function bridgeAt(p) { return at(p, DREAD.BRIDGE, DREAD.BRIDGE_Y); }
  // The part whose box holds (x, y), padded by pad: a live gun, the hangar or the bridge.
  function partAt(p, x, y, pad) {
    for (var i = 0; i < p.turrets.length; i++) {
      var t = p.turrets[i], g = gunAt(p, t);
      if (!t.dead && Math.abs(x - g.x) < 17 + pad && Math.abs(y - g.y) < 12 + pad) return t;
    }
    var h = hangarAt(p);
    if (p.hangar.hp > 0 && Math.abs(x - h.x) < 32 + pad && Math.abs(y - h.y) < 9 + pad) return p.hangar;
    var b = bridgeAt(p);
    if (Math.abs(x - b.x) < 34 + pad && Math.abs(y - b.y) < 14 + pad) return p.bridge;
    return null;
  }
  // The hull is a long armored cigar; its guns, hangar and bridge car hang below it.
  function dreadHit(p, x, y, near) {
    if (!fighting(p)) return false;
    var lx = (x - p.x) * p.dir, half = DREAD.HH * clamp((DREAD.HW - Math.abs(lx)) / 50, 0, 1);
    return Math.abs(y - p.y) < half + near || !!partAt(p, x, y, near);
  }
  // direct: a bullet; otherwise a blast, which reaches a part within reach. Only the stage's part can be hurt.
  function hurtDread(p, dmg, owner, hx, hy, direct) {
    if (!fighting(p)) return;
    var part = partAt(p, hx, hy, direct ? 0 : 24);
    if (part && p.turrets.indexOf(part) >= 0) { hurtGun(p, part, dmg, owner, hx, hy); return; }
    if (part === p.hangar && p.phase === 'hangar') { hurtHangar(p, dmg, owner, hx, hy); return; }
    if (part === p.bridge && p.phase === 'bridge') { hurtBridge(p, dmg, owner, hx, hy); return; }
    // Armor: hits elsewhere clang.
    p.clankT -= 1;
    if (p.clankT <= 0) { p.clankT = 6; w.sound.play('clank'); w.S.parts.push({ k: 'tink', x: hx, y: hy, life: 0.22, max: 0.22, c: INK2, id: w.id() }); }
  }
  // A gun that's aiming has its breech open: it takes DREAD.EXPOSED times the damage, so quick fire saves the target.
  function hurtGun(p, t, dmg, owner, hx, hy) {
    var S = w.S, g = gunAt(p, t);
    t.hp -= dmg * (t.mark ? DREAD.EXPOSED : 1); t.flash = 0.1; w.burst(hx, hy, 3, INK, 90);
    if (t.hp > 0) { w.sound.play('thup'); return; }
    t.dead = true; t.hp = 0;
    w.pow(g.x, g.y, 32); w.burst(g.x, g.y, 10, RED, 160);
    w.award(200, g.x, g.y + 34, 'gun down!', owner === 'ally' ? BLUE : INK, true); w.credit();
    emit('dread_gun', { by: owner === 'ally' ? 'crew' : 'player', left: p.turrets.filter(function (q) { return !q.dead; }).length });
    w.sound.play('boom'); S.shake = Math.max(S.shake, 0.3);
    // Knocked out while aiming: the volley never comes.
    if (t.mark) { addText('saved!', t.mark.x, GROUND - 70, BLUE, 26); emit('dread_saved', { target: t.mark.kind }); t.mark = null; }
    if (p.turrets.every(function (q) { return q.dead; })) openHangar(p);
  }
  function openHangar(p) {
    var S = w.S;
    p.phase = 'hangar'; p.t = 0; p.launchT = 1.2; p.troopT = 2;
    addText('the hangar opens!', 200, 260, RED, 24, 'alert');
    emit('dread_hangar', { wave: S.wave });
    w.sound.play('klaxon'); S.shake = Math.max(S.shake, 0.4);
  }
  function hurtHangar(p, dmg, owner, hx, hy) {
    var S = w.S, h = p.hangar, at0 = hangarAt(p);
    h.hp -= dmg; h.flash = 0.1; w.burst(hx, hy, 4, RED, 110);
    if (h.hp > 0) { w.sound.play('thup'); return; }
    h.hp = 0;
    w.pow(at0.x, at0.y, 50); w.burst(at0.x, at0.y, 14, RED, 180);
    w.award(400, at0.x, at0.y + 40, 'hangar down!', owner === 'ally' ? BLUE : INK, true); w.credit();
    S.shake = Math.max(S.shake, 0.5); w.sound.play('boom');
    p.phase = 'bridge'; p.t = 0; p.bombT = 1.5; p.gunT = 1.2;
    addText('the bridge is exposed!', 200, 250, RED, 24, 'alert');
    emit('dread_bridge', { wave: S.wave });
    w.sound.play('klaxon');
  }
  function hurtBridge(p, dmg, owner, hx, hy) {
    var b = p.bridge;
    b.hp -= dmg; b.flash = 0.1; w.burst(hx, hy, 4, RED, 110);
    if (b.hp <= 0) { b.hp = 0; dreadDown(p, owner); } else w.sound.play('thup');
  }
  function dreadDown(p, owner) {
    var S = w.S, b = bridgeAt(p), final = S.wave === DREAD.WAVE && !S.won;
    p.phase = 'sinking'; p.t = 0; clearMarks(p);
    S.stats.planes++; S.stats.dreads = (S.stats.dreads || 0) + 1;
    emit('plane_down', { kind: 'dread', by: owner === 'ally' ? 'crew' : 'player' });
    w.pow(b.x, b.y, 70);
    w.award(800 + 40 * S.wave, clamp(b.x, 90, W - 90), b.y + 46, 'Dreadnought down!', owner === 'ally' ? BLUE : INK, true); w.credit();
    S.banner = { s: 'dreadnought down!', sub: final ? 'the enemy surrenders!' : 'the flagship is going down', t: 0, dur: 2.6 };
    S.shake = Math.max(S.shake, 0.9);
    w.sound.play('zepdown');
    if (final) { S.finalWon = true; surrender(p); }
  }
  // With the flagship gone on the final wave, everyone left raises a white flag: troopers and tanks drop out with a
  // flag, bombs in the air fizzle, planes turn tail, and nothing more comes.
  function surrender(p) {
    var S = w.S, sp = S.spawn;
    if (sp) { sp.planes = sp.bombers = sp.rushes = sp.cargo = sp.boss = 0; }
    S.troopers.forEach(function (t) { if (!t.dead) { t.dead = true; flag(t.x, t.state === 'ground' ? t.y : t.y + 6); } });
    S.tanks.forEach(function (tk) { flag(tk.x, tk.y - 22); }); S.tanks = [];
    if (sp) sp.road = 0;
    S.bombs.forEach(function (m) { w.puff(m.x, m.y, 6, 0.5); }); S.bombs = []; S.enemyShots = [];
    S.planes.forEach(function (q) {
      if (q === p || q.state !== 'fly') return;
      if (w.SKY.KINDS[q.kind]) { w.SKY.flee(q); return; }
      q.drops = []; q.kits = []; q.bombRun = []; q.tankX = null; q.speed = Math.max(q.speed, 1) * 1.8;
    });
    if (sp) w.SKY.settle(sp, true);
    addText('they surrender!', 200, 440, BLUE, 26);
    emit('surrender', { wave: S.wave });
  }
  function flag(x, y) { w.S.parts.push({ k: 'flag', x: x, y: y, life: 1.6, max: 1.6, id: w.id() }); }

  function updateDread(p, dt) {
    var S = w.S;
    p.t += dt;
    p.turrets.forEach(function (t) { t.flash = Math.max(0, t.flash - dt); t.recoil = Math.max(0, t.recoil - dt * 4); });
    p.bridge.flash = Math.max(0, p.bridge.flash - dt); p.hangar.flash = Math.max(0, p.hangar.flash - dt);
    p.hangar.open = clamp(p.hangar.open + (p.phase === 'hangar' || p.phase === 'bridge' ? dt : -dt) * 1.5, 0, 1);
    updateShells(p, dt);
    if (p.phase === 'sinking') {
      // Explosions run along it as it lists, then it sinks off the bottom of the page.
      p.vy += 40 * dt; p.y += p.vy * dt; p.x += p.dir * 20 * dt; p.rot = Math.min(0.12, p.rot + 0.05 * dt); p.boomT -= dt;
      if (p.boomT <= 0) {
        p.boomT = rr(0.14, 0.26);
        var bx = clamp(p.x + rr(-0.9, 0.9) * DREAD.HW, 10, W - 10), by = p.y + rr(-0.6, 0.8) * DREAD.HH;
        w.pow(bx, by, rr(16, 28)); w.burst(bx, by, 6, RED, 140); w.puff(bx, by, 6, 0.9); w.sound.play('hit');
      }
      if (p.t >= DREAD.SINK || p.y > w.H + 80) p.gone = true;
      return;
    }
    p.y = DREAD.Y + Math.sin(S.t * 0.7) * 2;
    if (p.phase === 'arrive') {
      // Sailing in, slowing as it reaches its first station; then the fight starts.
      var to = settleX(p), d = to - p.x;
      p.x += Math.sign(d) * Math.min(Math.abs(d), Math.max(14, Math.min(DREAD.ENTER, Math.abs(d) * 0.7)) * dt);
      if (Math.abs(d) < 1) {
        p.phase = 'guns'; p.t = 0; p.move = -p.dir;
        S.shake = Math.max(S.shake, 0.4); w.sound.play('horn');
        emit('dread_arrive', { wave: S.wave });
      }
      return;
    }
    if (p.phase === 'guns') {
      // Patrolling, so every gun takes a turn over the page.
      p.x += p.move * DREAD.DRIFT * dt;
      if (p.x <= DREAD.PATROL[0]) { p.x = DREAD.PATROL[0]; p.move = 1; } else if (p.x >= DREAD.PATROL[1]) { p.x = DREAD.PATROL[1]; p.move = -1; }
      updateGuns(p, dt);
    } else {
      // The hangar, then the bridge, comes over the page and sways there.
      var want = stageX(p) + Math.sin(p.t * 0.5) * DREAD.SWAY;
      p.x += clamp(want - p.x, -30 * dt, 30 * dt);
    }
    var h = hangarAt(p), onPage = h.x > 30 && h.x < W - 30;
    if (p.phase === 'hangar' && onPage) {
      // The hangar launches dive bombers and drops troops.
      if ((p.launchT -= dt) <= 0) { p.launchT = DREAD.LAUNCH_EVERY; w.SKY.spawnDiver(p.rng, { x: h.x, y: h.y + 16 }); w.sound.play('fighter'); emit('dread_launch', {}); }
      if ((p.troopT -= dt) <= 0) { p.troopT = DREAD.TROOPS_EVERY; [-14, 0, 14].forEach(function (o) { w.spawnTrooper(clamp(h.x + o, 16, W - 16), h.y + 18, w.rollTrooper(p.rng)); }); }
    } else if (p.phase === 'bridge') {
      // The bomb bay (the gutted hangar) drops clusters at the bunker; the bridge gunner fires at the crew.
      if (onPage && (p.bombT -= dt) <= 0) {
        p.bombT = DREAD.BOMBS_EVERY;
        for (var k = 0; k < DREAD.BAY_BOMBS; k++) { var o = k - (DREAD.BAY_BOMBS - 1) / 2; S.bombs.push({ id: w.id(), x: h.x + o * 10, y: h.y + 8, vx: (BK.x - h.x) * 0.42 + o * 28, vy: 0, isBomb: true, dead: false }); emit('bomb_dropped', { by: 'dreadnought' }); }
        w.sound.play('whistle');
      }
      bridgeGun(p, dt);
    }
    // The air strike's bombs hit the parts they fall past.
    S.strikeBombs.forEach(function (m) {
      var part = !m.dead && partAt(p, m.x, m.y, 4);
      if (!part || part.dead) return;
      m.dead = true; w.explode(m.x, m.y, 30, 'strike', 'ally');
      if (p.turrets.indexOf(part) >= 0) hurtGun(p, part, 14, 'ally', m.x, m.y);
      else if (part === p.hangar && p.phase === 'hangar') hurtHangar(p, 14, 'ally', m.x, m.y);
      else if (part === p.bridge && p.phase === 'bridge') hurtBridge(p, 14, 'ally', m.x, m.y);
    });
  }
  // The bridge gunner: a burst of BURST shots every BRIDGE_GUN seconds at the nearest soldier standing.
  function bridgeGun(p, dt) {
    var S = w.S, b = bridgeAt(p);
    if (b.x < 10 || b.x > W - 10) return;
    var crew = S.recruits.filter(function (r) { return !r.dead && !r.down; }).sort(function (a, c) { return Math.abs(a.x - b.x) - Math.abs(c.x - b.x); });
    if (!crew.length) return;
    if (p.burst <= 0) { if ((p.gunT -= dt) <= 0) { p.gunT = DREAD.BRIDGE_GUN; p.burst = DREAD.BURST; p.burstT = 0; } return; }
    if ((p.burstT -= dt) > 0) return;
    p.burst--; p.burstT = 0.13; p.bridge.flash = 0.04;
    var a = Math.atan2(GROUND - 22 - (b.y + 10), crew[0].x - b.x) + (w.RC() * 2 - 1) * 0.04;
    S.enemyShots.push({ x: b.x, y: b.y + 10, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 2.5, dmg: DREAD.SHOT_HURT, cause: 'dreadnought' });
    w.sound.play('sniper');
  }

  function clearMarks(p) { p.turrets.forEach(function (t) { t.mark = null; }); }
  function marks(p) { return p.turrets.filter(function (t) { return t.mark; }).length; }
  // Guns: up to DREAD.MARKS aim at once, at different targets. A gun over the page counts down its reload, aims, then
  // fires a volley of three.
  function updateGuns(p, dt) {
    var S = w.S;
    p.turrets.forEach(function (t) {
      if (t.dead) return;
      var g = gunAt(p, t), m = t.mark;
      var want = m ? Math.atan2(GROUND - 14 - g.y, m.x - g.x) : Math.PI / 2 + Math.sin(S.t * 0.8 + t.lx) * 0.5;
      t.aim += clamp(want - t.aim, -3 * dt, 3 * dt);
      if (m) {
        m.t += dt;
        if (m.kind === 'recruit') {
          var r = S.recruits.find(function (q) { return q.id === m.id; });
          // A marked soldier who goes down first spares the gun the trouble; it picks again soon.
          if (!r || r.dead || r.down) { t.mark = null; t.cd = 1; return; }
          m.x = r.x;
        }
        if (m.t >= DREAD.AIM) fire(p, t);
        return;
      }
      if (g.x < 24 || g.x > W - 24 || marks(p) >= DREAD.MARKS) return;
      t.cd -= dt;
      if (t.cd <= 0) startMark(p, t);
    });
  }
  // What a gun can aim at: soldiers standing, the sentry tower, the wire, a trench row, the second mat, the tent (empty)
  // and the wall. Picked with the ship's own stream, so it's the same for a seed.
  function targets(p, gx) {
    var S = w.S, list = [], taken = p.turrets.filter(function (t) { return t.mark; }).map(function (t) { return t.mark.kind + (t.mark.id || ''); });
    S.recruits.forEach(function (r) { if (!r.dead && !r.down) list.push({ kind: 'recruit', id: r.id, x: r.x, weight: 0.7 }); });
    if (S.mods.auto) list.push({ kind: 'sentry', x: w.SENTRY.x, weight: 1 });
    if (S.mods.wire) list.push({ kind: 'wire', x: gx < 200 ? 104 : 296, weight: 1 });
    if (S.mods.trench > 0) list.push({ kind: 'trench', x: gx < 200 ? 130 : 270, weight: 1 });
    if (S.mods.secondTramp) list.push({ kind: 'mat', x: 343, weight: 0.8 });
    if (S.mods.hospital && !S.bed) list.push({ kind: 'tent', x: w.TENT.x, weight: 0.8 });
    list.push({ kind: 'wall', x: BK.x, weight: 5 });
    return list.filter(function (q) { return taken.indexOf(q.kind + (q.id || '')) < 0; });
  }
  function startMark(p, t) {
    var list = targets(p, gunAt(p, t).x), total = list.reduce(function (s, q) { return s + q.weight; }, 0), roll = p.rng() * total;
    if (!list.length) { t.cd = 1; return; }
    var pick = list.find(function (q) { roll -= q.weight; return roll <= 0; }) || list[list.length - 1];
    t.mark = { kind: pick.kind, id: pick.id, x: pick.x, t: 0 };
    w.sound.play('flare');
    if (pick.kind === 'recruit') w.say('incoming!', pick.id, false, 0.1);
    emit('dread_mark', { target: pick.kind });
  }
  // A volley: three shells around the target, one after another; the gun kicks back with each.
  function fire(p, t) {
    var S = w.S, m = t.mark;
    t.cd = between(p.rng, DREAD.RELOAD[0], DREAD.RELOAD[1]);
    t.mark = null;
    DREAD.VOLLEY.forEach(function (off, i) { p.shells.push({ gun: t, x1: m.x + off, t: -i * DREAD.SHELL_GAP, m: off === 0 ? m : null, launched: false }); });
    S.shake = Math.max(S.shake, 0.2);
    w.sound.play('broadside');
  }
  function updateShells(p, dt) {
    p.shells.forEach(function (s) {
      s.t += dt;
      if (s.t >= 0 && !s.launched) {
        // Leaving the barrel: fixed at launch, so the gun can move on.
        var g = gunAt(p, s.gun);
        s.launched = true; s.x0 = g.x + Math.cos(s.gun.aim) * 18; s.y0 = g.y + Math.sin(s.gun.aim) * 18; s.gun.recoil = 1; s.gun.flash = 0.08;
        w.puff(s.x0, s.y0, 5, 0.5);
      }
      if (s.t >= DREAD.SHELL) { s.done = true; impact(p, s); }
    });
    p.shells = p.shells.filter(function (s) { return !s.done; });
  }
  // A shell lands. Every one hurts the wall and anyone close by; the middle one destroys what the gun aimed at for good
  // (the shop sells gear again).
  function impact(p, s) {
    var S = w.S, x = clamp(s.x1, 6, W - 6), m = s.m, gone = null;
    w.explode(x, GROUND - 8, 26, 'broadside');
    if (Math.abs(x - BK.x) < 44) { w.hurtWall(DREAD.SHELL_WALL, 'dreadnought'); w.wallText(DREAD.SHELL_WALL); }
    S.recruits.forEach(function (q) { var d = Math.abs(q.x - x); if (!q.dead && (!m || q.id !== m.id) && d < DREAD.SPLASH) w.hurtRecruit(q, 1.6 * (1 - d / DREAD.SPLASH) + 0.2, 'dreadnought'); });
    if (!m) return;
    if (m.kind === 'recruit') {
      // A direct hit puts a soldier down, wounded: a medic, a pizza or the tent can still save him.
      var r = S.recruits.find(function (q) { return q.id === m.id; });
      if (r && !r.dead) w.hurtRecruit(r, DREAD.DIRECT, 'dreadnought');
    } else if (m.kind === 'sentry' && S.mods.auto) { S.mods.auto = false; S.mods.stacks.auto = 0; gone = 'sentry tower lost!'; }
    else if (m.kind === 'wire' && S.mods.wire) { S.mods.wire = false; S.mods.stacks.wire = 0; gone = 'wire lost!'; }
    else if (m.kind === 'trench' && S.mods.trench > 0) { S.mods.trench--; S.mods.stacks.trench = Math.max(0, (S.mods.stacks.trench || 1) - 1); gone = 'trench hit!'; }
    else if (m.kind === 'mat' && S.mods.secondTramp) { S.mods.secondTramp = false; S.mods.stacks.tramp = 0; gone = 'mat lost!'; }
    else if (m.kind === 'tent' && S.mods.hospital && !S.bed) { S.mods.hospital = false; S.mods.stacks.hospital = 0; gone = 'tent lost!'; }
    if (gone) addText(gone, x, GROUND - 64, RED, 22, 'alert');
    emit('dread_hit', { target: m.kind });
  }

  // ---------- drawing ----------
  function drawDread(p) {
    var S = w.S, G = w.G;
    // Its shadow on the ground, and the searchlights sweeping it.
    if (p.phase !== 'sinking') {
      G.beginPath(); G.ellipse(clamp(p.x, -100, W + 100), GROUND - 2, DREAD.HW * 0.8, 5, 0, 0, Math.PI * 2); G.fillStyle = 'rgba(46,46,51,0.07)'; G.fill();
      DREAD.LIGHTS.forEach(function (lx, i) {
        var l = at(p, lx, DREAD.HH * 0.8), sweep = Math.sin(S.t * (0.6 + i * 0.25) + i * 2) * 120, gx = l.x + sweep;
        G.beginPath(); G.moveTo(l.x - 4, l.y); G.lineTo(gx - 34, GROUND); G.lineTo(gx + 34, GROUND); G.lineTo(l.x + 4, l.y); G.closePath();
        G.fillStyle = 'rgba(255,224,110,0.13)'; G.fill();
        G.beginPath(); G.ellipse(gx, GROUND - 3, 34, 6, 0, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,0.16)'; G.fill();
      });
    }
    G.save(); G.translate(p.x, p.y); G.scale(p.dir, 1); if (p.rot) G.rotate(p.rot);
    drawBody(p);
    G.restore();
    p.turrets.forEach(function (t) { if (t.mark) drawMark(p, t, t.mark); });
    p.shells.forEach(function (s) {
      if (!s.launched) return;
      var u = clamp(s.t / DREAD.SHELL, 0, 1), x = s.x0 + (s.x1 - s.x0) * u, y = s.y0 + (GROUND - 12 - s.y0) * u - Math.sin(u * Math.PI) * 22;
      G.beginPath(); G.ellipse(x, y, 5, 3, Math.atan2(GROUND - 12 - s.y0, s.x1 - s.x0), 0, Math.PI * 2); G.fillStyle = INK; G.fill();
      G.beginPath(); L(x, y, x - (s.x1 - s.x0) * 0.08, y - (GROUND - s.y0) * 0.08, 0.3); ink('rgba(200,67,58,0.6)', 2.4); G.stroke();
    });
  }
  function drawBody(p) {
    var G = w.G, S = w.S, hw = DREAD.HW, hh = DREAD.HH, i, angry = p.phase === 'bridge' || p.phase === 'sinking';
    pen(p.id);
    // Three propellers at the stern, a blur of spinning blades.
    [-0.55, 0, 0.55].forEach(function (k, j) {
      var py = k * hh, px = -hw - 26, span = 13 + ((w.boil + j) % 2) * 5;
      G.beginPath(); L(-hw + 6, py * 0.7, px, py, 0.2); ink(INK, 2.2); G.stroke();
      G.beginPath(); G.ellipse(px - 2, py, 3, span, 0, 0, Math.PI * 2); G.fillStyle = 'rgba(46,46,51,0.12)'; G.fill(); ink('rgba(46,46,51,0.5)', 1.2); G.stroke();
      G.beginPath(); L(px - 2, py - span, px - 2, py + span, 0.3); ink(INK, 2.4); G.stroke();
    });
    // Tail fins with enemy stripes.
    [-1, 1].forEach(function (sd) {
      G.beginPath(); SP([-hw + 40, sd * hh * 0.55, -hw - 14, sd * hh * 1.75, -hw - 30, sd * hh * 1.65, -hw - 6, sd * 4], true, 0.5);
      G.fillStyle = PAPER; G.fill(); ink(INK, 2.6); G.stroke();
      G.beginPath(); L(-hw - 22, sd * hh * 1.5, -hw - 4, sd * hh * 0.5, 0.3); ink(RED, 4); G.stroke();
    });
    // Smokestacks pouring smoke, a mast with the enemy's flag, and an aerial wire to the stern.
    [-90, -20, 50].forEach(function (sx) {
      G.beginPath(); SP([sx - 8, -hh + 4, sx - 7, -hh - 26, sx + 7, -hh - 26, sx + 8, -hh + 4], true, 0.3);
      G.fillStyle = PAPER; G.fill(); ink(INK, 2.4); G.stroke();
      G.beginPath(); L(sx - 7, -hh - 18, sx + 7, -hh - 18, 0.2); ink(RED, 3.4); G.stroke();
      for (var k = 0; k < 4; k++) {
        var age = (S.t * 0.8 + k / 4 + sx * 0.013) % 1;
        G.globalAlpha = (1 - age) * 0.45; G.beginPath(); w.Ci(sx - age * 24, -hh - 30 - age * 34, 4 + age * 9, 0.6);
        G.fillStyle = 'rgba(46,46,51,0.12)'; G.fill(); ink(INK, 1.4); G.stroke(); G.globalAlpha = 1;
      }
    });
    G.beginPath(); L(150, -hh + 2, 150, -hh - 34, 0.3); L(150, -hh - 30, -hw + 30, -hh * 0.6, 0.6); ink(INK, 1.6); G.stroke();
    var flap = Math.sin(S.t * 6) * 3;
    G.beginPath(); SP([150, -hh - 34, 178, -hh - 29 + flap, 150, -hh - 23], true, 0.3); G.fillStyle = RED; G.fill(); ink(INK, 1.4); G.stroke();
    // The hull: a long armored cigar, pointed at the bow.
    var pts = [];
    for (i = 0; i < 44; i++) {
      var a = i / 44 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pts.push(hw * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 0.42), hh * s * (c > 0 ? 1 - 0.25 * Math.pow(c, 6) : 1));
    }
    G.beginPath(); SP(pts, true, 0.7);
    G.fillStyle = PAPER; G.fill(); G.fillStyle = angry ? 'rgba(200,67,58,0.26)' : 'rgba(46,46,51,0.1)'; G.fill();
    ink(INK, 3.4); G.stroke();
    // A darker belly, a red nose cap and the ship's number stencilled at the bow.
    G.save(); G.beginPath(); SP(pts, true, 0); G.clip();
    G.fillStyle = 'rgba(46,46,51,0.13)'; G.fillRect(-hw - 10, hh * 0.3, 2 * hw + 20, hh);
    G.fillStyle = angry ? 'rgba(200,67,58,0.75)' : 'rgba(200,67,58,0.55)'; G.fillRect(hw - 34, -hh, 40, 2 * hh);
    G.restore();
    G.save(); G.fillStyle = 'rgba(200,67,58,0.8)'; G.font = '700 17px ' + w.DISPLAY; G.textAlign = 'center'; G.fillText('DN-1', hw - 80, hh * 0.18); G.restore();
    // The conning tower amidships: stepped armor with slit windows and a rangefinder on top.
    G.beginPath(); SP([96, -hh + 2, 100, -hh - 16, 112, -hh - 16, 114, -hh - 26, 136, -hh - 26, 138, -hh - 16, 146, -hh - 16, 150, -hh + 2], true, 0.3);
    G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(46,46,51,0.16)'; G.fill(); ink(INK, 2.4); G.stroke();
    G.beginPath(); L(104, -hh - 9, 142, -hh - 9, 0.2); L(118, -hh - 21, 132, -hh - 21, 0.2); ink(INK, 2.4); G.stroke();
    G.beginPath(); L(112, -hh - 28, 138, -hh - 28, 0.2); ink(INK, 3); G.stroke();
    // A railing along the top, armor seams, a red band, rivets, and a row of lit portholes.
    G.beginPath();
    for (var tx = -hw + 60; tx < hw - 60; tx += 12) L(tx, -hh + 1, tx, -hh - 5, 0.1);
    L(-hw + 60, -hh - 5, hw - 60, -hh - 5, 0.3);
    ink('rgba(46,46,51,0.5)', 1.1); G.stroke();
    G.beginPath();
    for (var sx2 = -hw + 50; sx2 <= hw - 50; sx2 += 50) L(sx2, -hh * 0.86, sx2 + 3, hh * 0.86, 0.4);
    ink('rgba(46,46,51,0.3)', 1.3); G.stroke();
    G.beginPath(); L(-hw + 24, hh * 0.46, hw - 34, hh * 0.4, 0.5); ink('rgba(200,67,58,0.55)', 6); G.stroke();
    G.fillStyle = 'rgba(46,46,51,0.45)';
    for (var rx = -hw + 30; rx < hw - 30; rx += 14) { G.fillRect(rx, -hh * 0.62, 1.8, 1.8); G.fillRect(rx + 7, hh * 0.22, 1.8, 1.8); }
    for (var px2 = -hw + 70; px2 < hw - 60; px2 += 26) {
      G.beginPath(); G.arc(px2, -hh * 0.18, 3.6, 0, Math.PI * 2); G.fillStyle = angry && Math.floor(S.t * 6 + px2) % 2 ? RED : 'rgba(255,214,38,0.85)'; G.fill(); ink(INK, 1.2); G.stroke();
    }
    [-170, 110].forEach(function (ix) {
      G.beginPath(); G.arc(ix, -hh * 0.02, 11, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
      G.beginPath(); G.arc(ix, -hh * 0.02, 4.2, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
    });
    // The searchlight housings.
    DREAD.LIGHTS.forEach(function (lx) { G.beginPath(); G.ellipse(lx, hh * 0.82, 7, 4, 0, 0, Math.PI * 2); G.fillStyle = HAT; G.fill(); ink(INK, 1.6); G.stroke(); });
    // The hangar in the belly: closed, then its doors swing open on a dark bay; gutted once shot down.
    var hx = DREAD.HANGAR, hy = DREAD.HANGAR_Y, op = p.hangar.open, dead = p.hangar.hp <= 0;
    G.beginPath(); SP([hx - 34, hh - 6, hx + 34, hh - 6, hx + 30, hy + 6, hx - 30, hy + 6], true, 0.3);
    G.fillStyle = dead ? 'rgba(46,46,51,0.6)' : op > 0 ? 'rgba(46,46,51,' + (0.2 + 0.45 * op) + ')' : '#8a8f96';
    if (p.hangar.flash > 0) G.fillStyle = 'rgba(200,67,58,0.5)';
    G.fill(); ink(INK, 2.2); G.stroke();
    if (op > 0) { G.beginPath(); L(hx - 30, hy + 6, hx - 30 - 10 * op, hy + 6 + 12 * op, 0.2); L(hx + 30, hy + 6, hx + 30 + 10 * op, hy + 6 + 12 * op, 0.2); ink(INK, 2.6); G.stroke(); }
    else { G.beginPath(); L(hx, hh - 6, hx, hy + 6, 0.2); ink(INK, 1.4); G.stroke(); }
    if (dead && w.boil === 1) { G.globalAlpha = 0.5; G.beginPath(); w.Ci(hx + 6, hy + 14, 7, 0.6); ink(INK, 1.4); G.stroke(); G.globalAlpha = 1; }
    // The bridge car under the bow: plated until its stage, then its windows show the captain.
    var bc = p.bridge.lx, by = DREAD.BRIDGE_Y;
    G.beginPath(); L(bc - 26, hh - 6, bc - 18, by - 12, 0.3); L(bc + 24, hh - 6, bc + 16, by - 12, 0.3); ink(INK, 2); G.stroke();
    G.beginPath(); SP([bc - 36, by - 12, bc + 30, by - 12, bc + 38, by - 2, bc + 28, by + 12, bc - 34, by + 12], true, 0.4);
    G.fillStyle = p.bridge.flash > 0 ? 'rgba(200,67,58,0.4)' : PAPER; G.fill(); ink(INK, 2.6); G.stroke();
    for (var wx = bc - 28; wx <= bc + 18; wx += 12) {
      if (p.phase !== 'bridge' && p.phase !== 'sinking') { G.fillStyle = '#8a8f96'; G.fillRect(wx - 1, by - 7, 10, 10); G.beginPath(); SP([wx - 1, by - 7, wx + 9, by - 7, wx + 9, by + 3, wx - 1, by + 3], true, 0.2); ink(INK, 1.2); G.stroke(); }
      else { G.beginPath(); G.rect(wx, by - 6, 7, 7); ink(INK, 1.3); G.stroke(); G.beginPath(); G.arc(wx + 3.5, by - 2.5, 2, 0, Math.PI * 2); G.fillStyle = RED; G.fill(); }
    }
    // The gun turrets: steel casemates under the hull; each barrel turns, glows while aiming, and kicks back on firing.
    p.turrets.forEach(function (t) {
      var gx = t.lx, gy = DREAD.GUN_Y, marking = !!t.mark, a = t.dead ? Math.PI / 2 + 0.9 : t.aim, la = Math.atan2(Math.sin(a), Math.cos(a) * p.dir);
      G.beginPath(); SP([gx - 16, gy - 11, gx + 16, gy - 11, gx + 13, gy + 7, gx - 13, gy + 7], true, 0.3);
      G.fillStyle = t.dead ? 'rgba(46,46,51,0.55)' : t.flash > 0 ? PAPER : '#8a8f96'; G.fill();
      ink(marking && Math.floor(S.t * 10) % 2 ? RED : INK, 2.2); G.stroke();
      var len = t.dead ? 10 : 21 - t.recoil * 7, ex = gx + Math.cos(la) * len, ey = gy + Math.sin(la) * len;
      G.beginPath(); L(gx, gy, ex, ey, 0.2); ink(INK, t.dead ? 3.4 : 6); G.stroke();
      if (!t.dead) { G.beginPath(); L(gx, gy, ex, ey, 0.2); ink(marking ? 'rgba(220,60,40,0.9)' : '#8a8f96', 2.2); G.stroke(); }
      if (t.recoil > 0.6) { G.beginPath(); G.arc(ex + Math.cos(la) * 6, ey + Math.sin(la) * 6, 6 * t.recoil, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,0.9)'; G.fill(); }
      if (t.dead && w.boil === (t.id % 3)) { G.globalAlpha = 0.4; G.beginPath(); w.Ci(gx + 4, gy - 16, 6, 0.6); ink(INK, 1.4); G.stroke(); G.globalAlpha = 1; }
    });
  }
  // The aim: a red crosshair on the ground for each shell of the volley, the middle one marked with a smoke flare,
  // and a dashed line from the gun.
  function drawMark(p, t, m) {
    var G = w.G, S = w.S, g = gunAt(p, t), x = m.x, u = m.t / DREAD.AIM;
    G.save();
    G.setLineDash([3, 6]); G.globalAlpha = 0.4 + 0.4 * u;
    G.beginPath(); L(g.x, g.y, x, GROUND - 14, 0); ink(RED, 1.6); G.stroke();
    G.setLineDash([]); G.globalAlpha = 0.5 + 0.5 * u;
    DREAD.VOLLEY.forEach(function (off) {
      var cx = x + off, r = off ? 7 : 10 + 3 * Math.sin(S.t * 12);
      G.beginPath(); G.ellipse(cx, GROUND - 3, r * 1.4, r * 0.45, 0, 0, Math.PI * 2); ink(RED, off ? 1.6 : 2.4); G.stroke();
      G.beginPath(); L(cx - r * 1.8, GROUND - 3, cx - r * 0.6, GROUND - 3, 0.2); L(cx + r * 0.6, GROUND - 3, cx + r * 1.8, GROUND - 3, 0.2); ink(RED, 1.6); G.stroke();
    });
    G.globalAlpha = 1;
    G.beginPath(); L(x + 6, GROUND - 1, x + 7, GROUND - 11, 0.2); ink(INK, 2); G.stroke();
    G.beginPath(); G.arc(x + 7, GROUND - 12, 2.4, 0, Math.PI * 2); G.fillStyle = Math.floor(S.t * 12) % 2 ? HAT : RED; G.fill();
    for (var k = 0; k < 4; k++) {
      var age = (S.t * 1.2 + k / 4) % 1;
      G.globalAlpha = (1 - age) * 0.55; G.beginPath(); G.arc(x + 7 + Math.sin(age * 5 + k) * 5, GROUND - 16 - age * 60, 3 + age * 8, 0, Math.PI * 2);
      G.fillStyle = 'rgba(200,67,58,0.35)'; G.fill(); ink(RED, 1.1); G.stroke();
    }
    G.restore();
  }
  // Its health at the top of the page, under its name: a pip per gun, then the hangar and the bridge, greyed until
  // their stage.
  function drawDreadBar() {
    var p = dread(), G = w.G;
    if (!p || p.phase === 'sinking') return;
    var a = p.phase === 'arrive' ? clamp(p.t / 2, 0, 1) : 1;
    G.save(); G.globalAlpha = a; pen(4545);
    G.textAlign = 'center'; G.fillStyle = RED; G.font = '700 15px ' + w.DISPLAY; G.fillText('DREADNOUGHT', 200, 98);
    p.turrets.forEach(function (t, i) {
      var x = 92 + i * 20, y = 106;
      G.fillStyle = PAPER; G.fillRect(x, y, 16, 8);
      if (!t.dead) { G.fillStyle = 'rgba(200,67,58,0.6)'; G.fillRect(x + 1, y + 1, 14 * t.hp / t.max, 6); }
      G.beginPath(); SP([x, y, x + 16, y, x + 16, y + 8, x, y + 8], true, 0.2); ink(INK, 1.4); G.stroke();
      if (t.dead) { G.beginPath(); L(x - 1, y + 9, x + 17, y - 1, 0.2); ink(INK, 1.6); G.stroke(); }
    });
    function bar(part, x, wd, live) {
      G.fillStyle = PAPER; G.fillRect(x, 106, wd, 8);
      if (!live) { G.fillStyle = 'rgba(46,46,51,0.18)'; G.fillRect(x + 1, 107, wd - 2, 6); }
      else { G.fillStyle = part.flash > 0 ? 'rgba(200,67,58,0.85)' : 'rgba(200,67,58,0.55)'; G.fillRect(x + 1, 107, (wd - 2) * part.hp / part.max, 6); }
      G.beginPath(); SP([x, 106, x + wd, 106, x + wd, 114, x, 114], true, 0.2); ink(INK, 1.4); G.stroke();
    }
    bar(p.hangar, 176, 52, p.phase === 'hangar' || p.hangar.hp <= 0);
    bar(p.bridge, 234, 74, p.phase === 'bridge');
    G.restore();
  }
  // For the crew and the fighter: the part worth shooting. The gun that's aiming comes first.
  function dreadTargets() {
    var p = dread(), out = [];
    if (!p || !fighting(p)) return out;
    var vx = p.phase === 'guns' ? p.move * DREAD.DRIFT : 0;
    p.turrets.forEach(function (t) {
      if (t.dead) return;
      var g = gunAt(p, t);
      if (g.x > 6 && g.x < W - 6) out.push({ kind: 'dreadpart', part: 'gun', x: g.x, y: g.y, vx: vx, marking: !!t.mark, id: t.id });
    });
    if (p.phase === 'hangar') { var h = hangarAt(p); if (h.x > 6 && h.x < W - 6) out.push({ kind: 'dreadpart', part: 'hangar', x: h.x, y: h.y, vx: 0, marking: false, id: p.hangar.id }); }
    if (p.phase === 'bridge') { var b = bridgeAt(p); if (b.x > 6 && b.x < W - 6) out.push({ kind: 'dreadpart', part: 'bridge', x: b.x, y: b.y, vx: 0, marking: false, id: p.bridge.id }); }
    return out.sort(function (a, b) { return (b.marking ? 1 : 0) - (a.marking ? 1 : 0); });
  }
  // The engine voice and the march read these.
  function dreadPhase() { var p = dread(); return p ? p.phase : null; }

  // ---------- victory and endless ----------
  // Beating the Dreadnought on wave 15 wins the run. When the field is clear the victory card shows the score, the
  // time, the record and the roll call; Keep going opens the shop and plays on from wave 21 (S.endless).
  var winScreen = document.getElementById('winScreen');
  function victoryDue() { var S = w.S; return S.finalWon && !S.won; }
  function rollCall() {
    var S = w.S, crew = S.recruits.filter(function (r) { return !r.dead; });
    if (S.bed) crew.push(S.bed.r);
    crew.sort(function (a, b) { return (b.rank || 0) - (a.rank || 0) || (b.kills || 0) - (a.kills || 0); });
    var top = crew.reduce(function (m, r) { return (r.kills || 0) > (m ? m.kills || 0 : 0) ? r : m; }, null);
    return crew.map(function (r) {
      return { text: w.SQUAD.record({ name: r.rank ? w.SQUAD.rankName(r) : 'A rookie', waves: r.waves || 0, kills: r.kills }), top: r === top };
    });
  }
  function showWin() {
    var S = w.S;
    S.mode = 'won'; S.won = true; S.wonAt = S.wave;
    var wins = w.load('stickarmy.wins', 0) + 1; w.save('stickarmy.wins', wins);
    w.saveBestWave(S.wave);
    var isBest = w.saveBest();
    document.getElementById('winScore').textContent = S.score.toLocaleString('en-US');
    document.getElementById('winBest').hidden = !isBest;
    document.getElementById('winTime').textContent = w.clock(S.played);
    document.getElementById('winPlanes').textContent = String(S.stats.planes);
    document.getElementById('winZeps').textContent = String(S.stats.zeppelins);
    document.getElementById('winTanks').textContent = String(S.stats.tanks);
    document.getElementById('winCount').textContent = wins === 1 ? 'Your first win.' : 'Win number ' + wins + '.';
    var list = document.getElementById('winRoll'), roll = rollCall();
    list.replaceChildren.apply(list, roll.map(function (q) {
      var li = document.createElement('li'); li.textContent = q.text;
      if (q.top) { var star = document.createElement('b'); star.textContent = ' ★ top gun'; li.append(star); }
      return li;
    }));
    if (!roll.length) { var none = document.createElement('li'); none.textContent = 'Nobody made it but you.'; list.append(none); }
    var lost = document.getElementById('winFallen');
    lost.textContent = S.fallen.length ? 'Fallen: ' + S.fallen.map(w.SQUAD.record).join(', ') + '.' : '';
    lost.hidden = !S.fallen.length;
    winScreen.hidden = false; w.hidePause();
    w.sound.play('victory');
    emit('victory', { wave: S.wave, score: S.score });
    document.getElementById('keepBtn').focus({ preventScroll: true });
  }
  function keepGoing() {
    var S = w.S;
    if (S.mode !== 'won') return;
    S.endless = true; winScreen.hidden = true;
    w.openShop();
  }
  // The title card's record line.
  function recordLine() {
    var wins = w.load('stickarmy.wins', 0), bestWave = w.load('stickarmy.bestWave', 0);
    if (!wins) return '';
    return 'Won ' + (wins === 1 ? 'once' : wins + ' times') + (bestWave > DREAD.WAVE ? ' · best wave ' + bestWave : '') + '.';
  }
  document.getElementById('keepBtn').addEventListener('click', keepGoing);

  return { DREAD: DREAD, turretHP: turretHP, hangarHP: hangarHP, bridgeHP: bridgeHP, isDreadWave: isDreadWave, dread: dread, spawnDread: spawnDread,
    dreadHit: dreadHit, hurtDread: hurtDread, updateDread: updateDread, drawDread: drawDread, drawDreadBar: drawDreadBar,
    dreadTargets: dreadTargets, dreadPhase: dreadPhase, victoryDue: victoryDue, rollCall: rollCall, showWin: showWin, keepGoing: keepGoing,
    recordLine: recordLine };
};
