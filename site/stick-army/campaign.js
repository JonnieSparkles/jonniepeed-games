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
  // The enemy flagship: an armored airship wider than the page. It comes forward from behind the paper (EMERGE),
  // bursts through, then slides overhead stern first (DRIFT px/s) so its gun turrets come into range a section at a
  // time; at the bow end it backs up (BACK px/s) and comes again while any gun still fires. A gun over the page marks
  // a target with a red flare for MARK seconds, then fires a heavy shell that destroys the target for good. With the
  // guns gone the bridge car under the bow is exposed and the bomb bay opens. Downing the bridge downs the ship.
  // It lives in S.planes as kind 'dread', so bullets, rockets, flak, bazookas and the ambience all see it.
  var DREAD = {
    WAVE: 15, EVERY: 10, Y: 166, HW: 300, HH: 30, ARRIVE: 3, EMERGE: 4.5, TEAR: 1.1,
    X0: 330, X_END: 100, DRIFT: 7, BACK: 14, SWAY: 18,
    TURRETS: [-235, -120, 0, 115], BRIDGE: 200, BAY: -60, GUN_Y: 37, BRIDGE_Y: 40,
    MARK: 2, MARKS: 2, EXPOSED: 2.5, SPLASH: 46, RELOAD: [2.6, 4.2], SHELL: 0.45, WALL_HIT: 45, TROOPS_EVERY: 5.5, BOMBS_EVERY: 3, BAY_BOMBS: 4,
    SINK: 2.4, FALL: 2.6
  };
  function turretHP(n) { return Math.round(30 + 1.5 * n); }
  function bridgeHP(n) { return Math.round(90 + 6.5 * n); }
  // Wave 15, then every tenth wave in endless.
  function isDreadWave(n) { return n >= DREAD.WAVE && (n - DREAD.WAVE) % DREAD.EVERY === 0; }
  function dread() { return w.S.planes.find(function (p) { return p.kind === 'dread'; }) || null; }
  function fighting(p) { return p.phase === 'guns' || p.phase === 'bridge'; }

  function spawnDread() {
    var S = w.S, rnd = substream(w.RW), n = S.wave;
    var p = w.makePlane('dread', -1, DREAD.X0, DREAD.Y);
    p.rng = rnd; p.hw = DREAD.HW; p.hh = DREAD.HH; p.speed = 0; p.phase = 'emerge'; p.t = 0; p.move = -1; p.rot = 0;
    p.turrets = DREAD.TURRETS.map(function (lx) {
      return { lx: lx, hp: turretHP(n), max: turretHP(n), cd: between(rnd, 1, 2.4), aim: Math.PI / 2, flash: 0, dead: false, mark: null, id: w.id() };
    });
    p.bridge = { lx: DREAD.BRIDGE, hp: bridgeHP(n), max: bridgeHP(n), flash: 0, id: w.id() };
    p.hp = p.maxHp = p.turrets.length * turretHP(n) + bridgeHP(n);
    p.shells = []; p.troopT = 3; p.bombT = 2; p.boomT = 0; p.tear = 0; p.cracks = []; p.clankT = 0;
    S.planes.push(p);
    emit('plane_spawn', { kind: 'dread', hp: p.maxHp });
    w.sound.play('rumble');
    return p;
  }

  // Where its parts are on the page.
  function gunAt(p, t) { return { x: p.x + t.lx, y: p.y + DREAD.GUN_Y }; }
  function bridgeAt(p) { return { x: p.x + p.bridge.lx, y: p.y + DREAD.BRIDGE_Y }; }
  // The part whose box holds (x, y), padded by pad: a live gun, or the bridge.
  function partAt(p, x, y, pad) {
    for (var i = 0; i < p.turrets.length; i++) {
      var t = p.turrets[i], g = gunAt(p, t);
      if (!t.dead && Math.abs(x - g.x) < 14 + pad && Math.abs(y - g.y) < 10 + pad) return t;
    }
    var b = bridgeAt(p);
    if (Math.abs(x - b.x) < 28 + pad && Math.abs(y - b.y) < 12 + pad) return p.bridge;
    return null;
  }
  // The hull is a long armored cigar; its underside guns and bridge car hang below it.
  function dreadHit(p, x, y, near) {
    if (!fighting(p)) return false;
    var lx = x - p.x, half = DREAD.HH * clamp((DREAD.HW - Math.abs(lx)) / 45, 0, 1);
    return Math.abs(y - p.y) < half + near || !!partAt(p, x, y, near);
  }
  // direct: a bullet; otherwise a blast, which reaches a part within reach.
  function hurtDread(p, dmg, owner, hx, hy, direct) {
    if (!fighting(p)) return;
    var part = partAt(p, hx, hy, direct ? 0 : 24);
    if (part && part !== p.bridge) { hurtGun(p, part, dmg, owner, hx, hy); return; }
    if (part === p.bridge && p.phase === 'bridge') { hurtBridge(p, dmg, owner, hx, hy); return; }
    // Armor: hits elsewhere clang.
    p.clankT -= 1;
    if (p.clankT <= 0) { p.clankT = 6; w.sound.play('clank'); w.S.parts.push({ k: 'tink', x: hx, y: hy, life: 0.22, max: 0.22, c: INK2, id: w.id() }); }
  }
  // A gun that's aiming has its muzzle open: it takes DREAD.EXPOSED times the damage, so quick, focused fire saves the target.
  function hurtGun(p, t, dmg, owner, hx, hy) {
    var S = w.S, g = gunAt(p, t);
    t.hp -= dmg * (t.mark ? DREAD.EXPOSED : 1); t.flash = 0.1; w.burst(hx, hy, 3, INK, 90);
    if (t.hp > 0) { w.sound.play('thup'); return; }
    t.dead = true; t.hp = 0;
    w.pow(g.x, g.y, 30); w.burst(g.x, g.y, 10, RED, 160);
    w.award(200, g.x, g.y + 34, 'gun down!', owner === 'ally' ? BLUE : INK, true); w.credit();
    emit('dread_gun', { by: owner === 'ally' ? 'crew' : 'player', left: p.turrets.filter(function (q) { return !q.dead; }).length });
    w.sound.play('boom'); S.shake = Math.max(S.shake, 0.3);
    // Knocked out while aiming: the shot never comes.
    if (t.mark) { addText('saved!', t.mark.x, GROUND - 70, BLUE, 26); emit('dread_saved', { target: t.mark.kind }); t.mark = null; }
    if (p.turrets.every(function (q) { return q.dead; })) exposeBridge(p);
  }
  function exposeBridge(p) {
    var S = w.S;
    p.phase = 'bridge'; p.t = 0; clearMarks(p);
    addText('the bridge is exposed!', 200, 250, RED, 24, 'alert');
    emit('dread_bridge', { wave: S.wave });
    w.sound.play('klaxon'); S.shake = Math.max(S.shake, 0.4);
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
    w.award(800 + 40 * S.wave, b.x - 40, b.y + 46, 'Dreadnought down!', owner === 'ally' ? BLUE : INK, true); w.credit();
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
    S.planes.forEach(function (q) { if (q !== p && q.state === 'fly') { q.drops = []; q.kits = []; q.bombRun = []; q.tankX = null; q.speed = Math.max(q.speed, 1) * 1.8; } });
    addText('they surrender!', 200, 440, BLUE, 26);
    emit('surrender', { wave: S.wave });
  }
  function flag(x, y) { w.S.parts.push({ k: 'flag', x: x, y: y, life: 1.6, max: 1.6, id: w.id() }); }

  function updateDread(p, dt) {
    var S = w.S;
    p.t += dt; p.tear = Math.max(0, p.tear - dt);
    p.turrets.forEach(function (t) { t.flash = Math.max(0, t.flash - dt); }); p.bridge.flash = Math.max(0, p.bridge.flash - dt);
    if (p.phase === 'emerge') { if (p.t >= DREAD.EMERGE) burstThrough(p); return; }
    if (p.phase === 'sinking') {
      // Explosions run along the hull while it settles nose down, then it falls back through the page.
      p.y += 8 * dt; p.rot = Math.min(0.06, p.rot + 0.03 * dt); p.boomT -= dt;
      if (p.boomT <= 0) {
        p.boomT = rr(0.18, 0.32);
        var bx = clamp(p.x + rr(-0.9, 0.9) * DREAD.HW, 10, W - 10), by = p.y + rr(-0.6, 0.8) * DREAD.HH;
        w.pow(bx, by, rr(16, 26)); w.burst(bx, by, 6, RED, 140); w.puff(bx, by, 6, 0.9); w.sound.play('hit');
      }
      if (p.t >= DREAD.SINK) { p.phase = 'retreat'; p.t = 0; }
      return;
    }
    if (p.phase === 'retreat') { if (p.t >= DREAD.FALL) p.gone = true; return; }
    if (p.phase === 'guns') {
      p.x += p.move * (p.move < 0 ? DREAD.DRIFT : DREAD.BACK) * dt;
      if (p.x <= DREAD.X_END) { p.x = DREAD.X_END; p.move = 1; } else if (p.x >= DREAD.X0) { p.x = DREAD.X0; p.move = -1; }
      updateGuns(p, dt);
    } else {
      // The bridge comes over the page and sways there.
      var want = DREAD.X_END + 20 + Math.sin(p.t * 0.45) * DREAD.SWAY;
      p.x += clamp(want - p.x, -16 * dt, 16 * dt);
    }
    p.y = DREAD.Y + Math.sin(S.t * 0.7) * 2;
    updateShells(p, dt);
    // The belly: troops while the guns fire, bomb clusters at the bunker once the bridge is exposed.
    var bay = p.x + DREAD.BAY, by = p.y + DREAD.HH;
    if (bay > 30 && bay < W - 30) {
      if (p.phase === 'guns') {
        p.troopT -= dt;
        if (p.troopT <= 0) { p.troopT = DREAD.TROOPS_EVERY; [-10, 10].forEach(function (d) { spawnFrom(p, bay + d, by + 10); }); }
      } else {
        p.bombT -= dt;
        if (p.bombT <= 0) {
          p.bombT = DREAD.BOMBS_EVERY;
          for (var k = 0; k < DREAD.BAY_BOMBS; k++) { var o = k - (DREAD.BAY_BOMBS - 1) / 2; S.bombs.push({ id: w.id(), x: bay + o * 10, y: by, vx: (BK.x - bay) * 0.42 + o * 28, vy: 0, isBomb: true, dead: false }); emit('bomb_dropped', { by: 'dreadnought' }); }
          w.sound.play('whistle');
        }
      }
    }
    // The air strike's bombs hit the guns and the bridge as they fall past.
    S.strikeBombs.forEach(function (m) {
      var part = !m.dead && partAt(p, m.x, m.y, 4);
      if (!part || part.dead) return;
      m.dead = true; w.explode(m.x, m.y, 30, 'strike', 'ally');
      if (part === p.bridge) { if (p.phase === 'bridge') hurtBridge(p, 14, 'ally', m.x, m.y); } else hurtGun(p, part, 14, 'ally', m.x, m.y);
    });
  }
  function spawnFrom(p, x, y) { w.spawnTrooper(clamp(x, 16, W - 16), y, w.rollTrooper(p.rng)); }
  function burstThrough(p) {
    var S = w.S;
    p.phase = 'guns'; p.t = 0; p.tear = DREAD.TEAR;
    // Cracks in the paper around the hull, and scraps of it flying.
    p.cracks = [];
    for (var i = 0; i < 16; i++) {
      var lx = rr(-0.95, 0.95) * DREAD.HW, x = p.x + lx; if (x < 0 || x > W) continue;
      var up = i % 2 ? -1 : 1, y = p.y + up * DREAD.HH * 0.95, a = up * Math.PI / 2 + rr(-0.7, 0.7), pts = [x, y];
      for (var k = 0; k < 3; k++) { x += Math.cos(a) * rr(8, 16); y += Math.sin(a) * rr(8, 16); a += rr(-0.6, 0.6); pts.push(x, y); }
      p.cracks.push(pts);
    }
    for (var j = 0; j < 26; j++) {
      w.S.parts.push({ k: 'scrap', x: clamp(p.x + rr(-1, 1) * DREAD.HW, 0, W), y: p.y + rr(-1, 1) * DREAD.HH, vx: rr(-60, 60), vy: rr(-90, 10),
        rot: rr(0, 6), vr: rr(-6, 6), s: rr(4, 8), life: rr(1, 1.6), max: 1.6, id: w.id() });
    }
    S.shake = Math.max(S.shake, 0.7);
    w.sound.play('rip'); w.sound.play('boom');
    emit('dread_arrive', { wave: S.wave });
  }

  function clearMarks(p) { p.turrets.forEach(function (t) { t.mark = null; }); }
  function marks(p) { return p.turrets.filter(function (t) { return t.mark; }).length; }
  // Guns: up to DREAD.MARKS aim at once, at different targets. A gun over the page counts down its reload, then marks.
  function updateGuns(p, dt) {
    var S = w.S;
    p.turrets.forEach(function (t) {
      if (t.dead) return;
      var g = gunAt(p, t), m = t.mark;
      var want = m ? Math.atan2(GROUND - 14 - g.y, m.x - g.x) : Math.PI / 2 + Math.sin(S.t * 0.8 + t.lx) * 0.5;
      t.aim += clamp(want - t.aim, -2.4 * dt, 2.4 * dt);
      if (m) {
        m.t += dt;
        if (m.kind === 'recruit') {
          var r = S.recruits.find(function (q) { return q.id === m.id; });
          // A marked soldier who goes down first spares the gun the trouble; it picks again soon.
          if (!r || r.dead || r.down) { t.mark = null; t.cd = 1; return; }
          m.x = r.x;
        }
        if (m.t >= DREAD.MARK) fire(p, t);
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
    S.recruits.forEach(function (r) { if (!r.dead && !r.down) list.push({ kind: 'recruit', id: r.id, x: r.x, weight: 1.4 }); });
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
    emit('dread_mark', { target: pick.kind });
  }
  function fire(p, t) {
    var S = w.S, m = t.mark, g = gunAt(p, t);
    t.cd = between(p.rng, DREAD.RELOAD[0], DREAD.RELOAD[1]);
    t.mark = null;
    p.shells.push({ x0: g.x + Math.cos(t.aim) * 16, y0: g.y + Math.sin(t.aim) * 16, x1: m.x, y1: GROUND - 14, t: 0, m: m });
    t.flash = 0.12; S.shake = Math.max(S.shake, 0.2);
    w.sound.play('broadside');
  }
  function updateShells(p, dt) {
    p.shells.forEach(function (s) { s.t += dt; if (s.t >= DREAD.SHELL) { s.done = true; impact(p, s.m); } });
    p.shells = p.shells.filter(function (s) { return !s.done; });
  }
  // The shell lands: whatever it was aimed at is destroyed for good. The shop sells gear again.
  function impact(p, m) {
    var S = w.S, x = m.x, gone = null;
    w.explode(x, GROUND - 8, 30, 'broadside');
    // The blast wounds anyone standing close by, including whoever is repairing the wall.
    S.recruits.forEach(function (q) { var d = Math.abs(q.x - x); if (!q.dead && q.id !== m.id && d < DREAD.SPLASH) w.hurtRecruit(q, 3 * (1 - d / DREAD.SPLASH) + 0.4, 'dreadnought'); });
    if (m.kind === 'recruit') {
      var r = S.recruits.find(function (q) { return q.id === m.id; });
      if (r && !r.dead) w.recruitDie(r, 'dreadnought');
    } else if (m.kind === 'wall') { w.hurtWall(DREAD.WALL_HIT, 'dreadnought'); w.wallText(DREAD.WALL_HIT); }
    else if (m.kind === 'sentry' && S.mods.auto) { S.mods.auto = false; S.mods.stacks.auto = 0; gone = 'sentry tower lost!'; }
    else if (m.kind === 'wire' && S.mods.wire) { S.mods.wire = false; S.mods.stacks.wire = 0; gone = 'wire lost!'; }
    else if (m.kind === 'trench' && S.mods.trench > 0) { S.mods.trench--; S.mods.stacks.trench = Math.max(0, (S.mods.stacks.trench || 1) - 1); gone = 'trench hit!'; }
    else if (m.kind === 'mat' && S.mods.secondTramp) { S.mods.secondTramp = false; S.mods.stacks.tramp = 0; gone = 'mat lost!'; }
    else if (m.kind === 'tent' && S.mods.hospital && !S.bed) { S.mods.hospital = false; S.mods.stacks.hospital = 0; gone = 'tent lost!'; }
    if (gone) addText(gone, x, GROUND - 64, RED, 22, 'alert');
    emit('dread_hit', { target: m.kind });
  }

  // ---------- drawing ----------
  var GHOST = '#8f99a6';
  function drawDread(p) {
    var S = w.S, G = w.G;
    if (p.phase === 'emerge' || p.phase === 'retreat') { drawGhost(p); return; }
    G.save(); G.translate(p.x, p.y); if (p.rot) G.rotate(p.rot);
    drawBody(p, false);
    G.restore();
    p.turrets.forEach(function (t) { if (t.mark) drawMark(p, t, t.mark); });
    p.shells.forEach(function (s) {
      var u = s.t / DREAD.SHELL, x = s.x0 + (s.x1 - s.x0) * u, y = s.y0 + (s.y1 - s.y0) * u - Math.sin(u * Math.PI) * 18;
      G.beginPath(); G.ellipse(x, y, 5, 3, Math.atan2(s.y1 - s.y0, s.x1 - s.x0), 0, Math.PI * 2); G.fillStyle = INK; G.fill();
      G.beginPath(); L(x, y, x - (s.x1 - s.x0) * 0.08, y - (s.y1 - s.y0) * 0.08, 0.3); ink('rgba(200,67,58,0.6)', 2.4); G.stroke();
    });
    if (p.tear > 0) {
      G.save(); G.globalAlpha = Math.min(1, p.tear / 0.5);
      p.cracks.forEach(function (c) { G.beginPath(); SP(c, false, 0.3); ink(INK, 1.6); G.stroke(); });
      G.restore();
    }
  }
  // Seen through the paper from behind: mirrored, faint, smaller, growing and darkening as it comes forward.
  function drawGhost(p) {
    var G = w.G, u = p.phase === 'emerge' ? clamp(p.t / DREAD.EMERGE, 0, 1) : clamp(1 - p.t / DREAD.FALL, 0, 1);
    var sc = 0.55 + 0.45 * u * u;
    G.save(); G.globalAlpha = 0.08 + 0.55 * u * u; G.translate(p.x, p.y + (1 - u) * 20); G.scale(-sc, sc);
    drawBody(p, true);
    G.restore();
  }
  function drawBody(p, ghost) {
    var G = w.G, S = w.S, hw = DREAD.HW, hh = DREAD.HH, col = ghost ? GHOST : INK, i, angry = p.phase === 'bridge' || p.phase === 'sinking';
    pen(p.id);
    // Tail fins at the stern, with enemy stripes, and the propellers behind them.
    [-1, 1].forEach(function (sd) {
      G.beginPath(); SP([-hw + 34, sd * hh * 0.55, -hw - 16, sd * hh * 1.7, -hw - 30, sd * hh * 1.6, -hw - 8, sd * 4], true, 0.5);
      if (!ghost) { G.fillStyle = PAPER; G.fill(); } ink(col, 2.6); G.stroke();
      if (!ghost) { G.beginPath(); L(-hw - 22, sd * hh * 1.45, -hw - 6, sd * hh * 0.5, 0.3); ink(RED, 4); G.stroke(); }
      var pl = w.boil % 2 ? 12 : 6; G.beginPath(); L(-hw - 36, sd * hh * 0.4 - pl, -hw - 36, sd * hh * 0.4 + pl, 0.4); ink(col, 2.4); G.stroke();
    });
    // Smokestacks and a mast with a pennant on top.
    [-40, 30].forEach(function (sx) {
      G.beginPath(); SP([sx - 7, -hh + 4, sx - 6, -hh - 22, sx + 6, -hh - 22, sx + 7, -hh + 4], true, 0.3);
      if (!ghost) { G.fillStyle = PAPER; G.fill(); } ink(col, 2.2); G.stroke();
      if (!ghost) { G.beginPath(); L(sx - 6, -hh - 15, sx + 6, -hh - 15, 0.2); ink(RED, 3); G.stroke(); }
      if (!ghost) for (var k = 0; k < 3; k++) {
        var age = (S.t * 0.8 + k / 3 + sx * 0.01) % 1;
        G.globalAlpha = (1 - age) * 0.4; G.beginPath(); w.Ci(sx - age * 16, -hh - 26 - age * 30, 4 + age * 7, 0.6); ink(INK, 1.4); G.stroke(); G.globalAlpha = 1;
      }
    });
    G.beginPath(); L(170, -hh + 2, 170, -hh - 34, 0.3); ink(col, 2); G.stroke();
    var flap = Math.sin(S.t * 6) * 3;
    G.beginPath(); SP([170, -hh - 34, 194, -hh - 29 + flap, 170, -hh - 24], true, 0.3); if (!ghost) { G.fillStyle = RED; G.fill(); } ink(col, 1.4); G.stroke();
    // The hull: a long armored cigar, pointed at the bow.
    var pts = [];
    for (i = 0; i < 40; i++) {
      var a = i / 40 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pts.push(hw * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 0.42), hh * s * (c > 0 ? 1 - 0.25 * Math.pow(c, 6) : 1));
    }
    G.beginPath(); SP(pts, true, 0.7);
    if (!ghost) { G.fillStyle = PAPER; G.fill(); G.fillStyle = angry ? 'rgba(200,67,58,0.24)' : 'rgba(200,67,58,0.1)'; G.fill(); }
    ink(col, ghost ? 2.2 : 3.2); G.stroke();
    // Armor seams, a belt and rivets.
    G.beginPath();
    for (var sx2 = -hw + 50; sx2 <= hw - 50; sx2 += 50) L(sx2, -hh * 0.86, sx2 + 3, hh * 0.86, 0.4);
    L(-hw + 20, hh * 0.38, hw - 30, hh * 0.32, 0.6);
    ink(ghost ? GHOST : 'rgba(46,46,51,0.32)', 1.3); G.stroke();
    if (!ghost) {
      G.fillStyle = 'rgba(46,46,51,0.45)';
      for (var rx = -hw + 30; rx < hw - 30; rx += 14) G.fillRect(rx, -hh * 0.5, 1.8, 1.8);
      [-150, 90].forEach(function (ix) {
        G.beginPath(); G.arc(ix, -hh * 0.12, 9, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
        G.beginPath(); G.arc(ix, -hh * 0.12, 3.5, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
      });
    }
    // The bomb bay: doors that swing open once the bridge is exposed.
    var bx = DREAD.BAY, open = angry && !ghost;
    G.beginPath();
    if (open) { L(bx - 16, hh - 2, bx - 20, hh + 9, 0.2); L(bx + 16, hh - 2, bx + 20, hh + 9, 0.2); }
    else L(bx - 16, hh - 1, bx + 16, hh - 1, 0.3);
    ink(col, 2.4); G.stroke();
    // The bridge car under the bow: plated until the guns are gone, then its windows show its crew.
    var bc = p.bridge.lx, by = DREAD.BRIDGE_Y;
    G.beginPath(); L(bc - 22, hh - 4, bc - 16, by - 10, 0.3); L(bc + 22, hh - 4, bc + 16, by - 10, 0.3); ink(col, 1.8); G.stroke();
    G.beginPath(); SP([bc - 30, by - 10, bc + 26, by - 10, bc + 32, by - 2, bc + 24, by + 10, bc - 28, by + 10], true, 0.4);
    if (!ghost) { G.fillStyle = p.bridge.flash > 0 ? 'rgba(200,67,58,0.4)' : PAPER; G.fill(); } ink(col, 2.4); G.stroke();
    if (!ghost) {
      for (var wx = bc - 22; wx <= bc + 14; wx += 12) {
        if (p.phase === 'guns') { G.fillStyle = '#8a8f96'; G.fillRect(wx - 1, by - 6, 9, 9); G.beginPath(); SP([wx - 1, by - 6, wx + 8, by - 6, wx + 8, by + 3, wx - 1, by + 3], true, 0.2); ink(INK, 1.2); G.stroke(); }
        else { G.beginPath(); G.rect(wx, by - 5, 6, 6); ink(INK, 1.3); G.stroke(); G.beginPath(); G.arc(wx + 3, by - 2, 1.8, 0, Math.PI * 2); G.fillStyle = RED; G.fill(); }
      }
    }
    // The gun turrets: steel casemates under the hull, each barrel turning to its target.
    p.turrets.forEach(function (t) {
      var gx = t.lx, gy = DREAD.GUN_Y, marking = !!t.mark;
      G.beginPath(); SP([gx - 13, gy - 9, gx + 13, gy - 9, gx + 11, gy + 6, gx - 11, gy + 6], true, 0.3);
      if (!ghost) { G.fillStyle = t.dead ? 'rgba(46,46,51,0.55)' : t.flash > 0 ? PAPER : '#8a8f96'; G.fill(); }
      ink(marking && Math.floor(S.t * 8) % 2 ? RED : col, 2); G.stroke();
      var a = t.dead ? Math.PI / 2 + 0.9 : t.aim, len = t.dead ? 9 : 17;
      G.beginPath(); L(gx, gy, gx + Math.cos(a) * len, gy + Math.sin(a) * len, 0.2); ink(col, t.dead ? 3 : 5); G.stroke();
      if (!ghost && !t.dead) { G.beginPath(); L(gx, gy, gx + Math.cos(a) * len, gy + Math.sin(a) * len, 0.2); ink('#8a8f96', 2); G.stroke(); }
      if (!ghost && t.dead && w.boil === (t.id % 3)) { G.globalAlpha = 0.4; G.beginPath(); w.Ci(gx + 4, gy - 14, 5, 0.6); ink(INK, 1.4); G.stroke(); G.globalAlpha = 1; }
    });
  }
  // The mark: a red smoke flare on the target, a pulsing ring, and a dashed line from the gun turning to it.
  function drawMark(p, t, m) {
    var G = w.G, S = w.S, g = gunAt(p, t), x = m.x, u = m.t / DREAD.MARK;
    G.save();
    G.setLineDash([3, 6]); G.globalAlpha = 0.35 + 0.4 * u;
    G.beginPath(); L(g.x, g.y, x, GROUND - 14, 0); ink(RED, 1.6); G.stroke();
    G.setLineDash([4, 4]); G.globalAlpha = 1;
    G.beginPath(); G.ellipse(x, GROUND - 3, 16 + 4 * Math.sin(S.t * 10), 5, 0, 0, Math.PI * 2); ink(RED, 2); G.stroke();
    G.setLineDash([]);
    G.beginPath(); L(x + 6, GROUND - 1, x + 7, GROUND - 11, 0.2); ink(INK, 2); G.stroke();
    G.beginPath(); G.arc(x + 7, GROUND - 12, 2.4, 0, Math.PI * 2); G.fillStyle = Math.floor(S.t * 12) % 2 ? HAT : RED; G.fill();
    for (var k = 0; k < 5; k++) {
      var age = (S.t * 0.9 + k / 5) % 1;
      G.globalAlpha = (1 - age) * 0.55; G.beginPath(); G.arc(x + 7 + Math.sin(age * 5 + k) * 5, GROUND - 16 - age * 80, 3 + age * 9, 0, Math.PI * 2);
      G.fillStyle = 'rgba(200,67,58,0.35)'; G.fill(); ink(RED, 1.1); G.stroke();
    }
    G.restore();
  }
  // Its health at the top of the page, under its name: a pip per gun, then the bridge, locked while plated.
  function drawDreadBar() {
    var p = dread(), G = w.G;
    if (!p || p.phase === 'emerge' || p.phase === 'retreat') return;
    var a = p.phase === 'guns' ? Math.min(1, p.t / 0.6) : 1;
    G.save(); G.globalAlpha = a; pen(4545);
    G.textAlign = 'center'; G.fillStyle = RED; G.font = '700 15px ' + w.DISPLAY; G.fillText('DREADNOUGHT', 200, 100);
    p.turrets.forEach(function (t, i) {
      var x = 112 + i * 22, y = 106;
      G.fillStyle = PAPER; G.fillRect(x, y, 18, 8);
      if (!t.dead) { G.fillStyle = 'rgba(200,67,58,0.6)'; G.fillRect(x + 1, y + 1, 16 * t.hp / t.max, 6); }
      G.beginPath(); SP([x, y, x + 18, y, x + 18, y + 8, x, y + 8], true, 0.2); ink(INK, 1.4); G.stroke();
      if (t.dead) { G.beginPath(); L(x - 1, y + 9, x + 19, y - 1, 0.2); ink(INK, 1.6); G.stroke(); }
    });
    var b = p.bridge, bx = 204, bw = 86, by = 106;
    G.fillStyle = PAPER; G.fillRect(bx, by, bw, 8);
    if (p.phase === 'guns') { G.fillStyle = 'rgba(46,46,51,0.18)'; G.fillRect(bx + 1, by + 1, bw - 2, 6); }
    else { G.fillStyle = b.flash > 0 ? 'rgba(200,67,58,0.85)' : 'rgba(200,67,58,0.55)'; G.fillRect(bx + 1, by + 1, (bw - 2) * b.hp / b.max, 6); }
    G.beginPath(); SP([bx, by, bx + bw, by, bx + bw, by + 8, bx, by + 8], true, 0.2); ink(INK, 1.4); G.stroke();
    G.restore();
  }
  // For the crew and the fighter: the part worth shooting, nearest first. The marking gun comes first.
  function dreadTargets() {
    var p = dread(), out = [];
    if (!p || !fighting(p)) return out;
    p.turrets.forEach(function (t) {
      if (t.dead) return;
      var g = gunAt(p, t);
      if (g.x > 6 && g.x < W - 6) out.push({ kind: 'dreadpart', part: 'gun', x: g.x, y: g.y, vx: p.phase === 'guns' ? p.move * (p.move < 0 ? DREAD.DRIFT : DREAD.BACK) : 0, marking: !!t.mark, id: t.id });
    });
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

  return { DREAD: DREAD, turretHP: turretHP, bridgeHP: bridgeHP, isDreadWave: isDreadWave, dread: dread, spawnDread: spawnDread,
    dreadHit: dreadHit, hurtDread: hurtDread, updateDread: updateDread, drawDread: drawDread, drawDreadBar: drawDreadBar,
    dreadTargets: dreadTargets, dreadPhase: dreadPhase, victoryDue: victoryDue, rollCall: rollCall, showWin: showWin, keepGoing: keepGoing,
    recordLine: recordLine };
};
