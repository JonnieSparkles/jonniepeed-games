// Stick Army units beyond the basic trooper and plane: the zeppelin boss, side rushers, tanks and the air strike.
// Classic script; load before game.js. game.js calls StickArmyUnits(world) once. The world object carries its
// constants and helpers, and live values (state S, canvas G, line boil, the wave and combat streams RW and RC,
// sound) through getters, so this file never reaches into game.js's scope. Effect helpers are wrappers, so harness
// stubs still apply.
var StickArmyUnits = function (w) {
  'use strict';
  var W = w.W, GROUND = w.GROUND, BK = w.BK, TUR = w.TUR, BALANCE = w.BALANCE;
  var INK = w.INK, INK2 = w.INK2, RED = w.RED, BLUE = w.BLUE, HAT = w.HAT, PAPER = w.PAPER, RED_FILL = w.RED_FILL, INK_FILL = w.INK_FILL;
  var L = w.L, SP = w.SP, Ci = w.Ci, ink = w.ink, pen = w.pen, jt = w.jt, stick = w.stick, tube = w.tube;
  var clamp = w.clamp, between = w.between, rr = w.rr, R = Math.random, substream = w.substream;
  var makePlane = w.makePlane, spawnTrooper = w.spawnTrooper, rollTrooper = w.rollTrooper, award = w.award, explode = w.explode, emit = w.emit;
  var puff = w.puff, burst = w.burst, killFx = w.killFx, addText = w.addText, addDecal = w.addDecal, hurtRecruit = w.hurtRecruit;

  // ---------- zeppelin boss ----------
  // Every BOSS_EVERY waves a zeppelin patrols the sky until it is shot down. It drops paratroopers from its gondola
  // and bomb clusters from its belly, sinks as it loses gas, and turns angry (faster, busier) at half health.
  // It lives in S.planes so flak, rockets, bazookas and the ambience treat it as an aircraft.
  // It arrives ARRIVE seconds into the wave, after a few escort planes; its horn sounds WARN seconds before.
  // From ARMOR_WAVE it comes armored: steel plates (PLATES, centred at those fractions of its half-length, each
  // PLATE_W wide either side) cover the hull and clang until shot off, and the gondola is plated until half health.
  var ZEP = { HW: 78, HH: 25, Y: 172, SINK: 44, LEFT: 72, RIGHT: 328, SPEED: 24, ANGRY_SPEED: 36, ENTER_SPEED: 48,
    DROP_EVERY: 3.4, ANGRY_DROP_EVERY: 2.4, BOMB_EVERY: 6.5, ANGRY_BOMB_EVERY: 4.5, WEAK: 2, ARRIVE: 9, WARN: 2.5,
    ARMOR_WAVE: 10, PLATES: [-0.72, -0.36, 0, 0.36, 0.72], PLATE_W: 0.18, PLATE_HP: 6 };
  var STEEL = 'rgba(112,120,130,0.5)';
  function zeppelinHP(n) { return Math.round(20 + BALANCE.BOSS_HP_PER_WAVE * n); }
  // The gondola is the weak spot: direct shots there do ZEP.WEAK times the damage.
  function inGondola(p, x, y) { var dx = x - p.x, dy = y - p.y; return dy > p.hh - 3 && Math.abs(dx) < 24 * Math.abs(p.face) + 4; }
  function spawnZeppelin() {
    var S = w.S;
    var rnd = substream(w.RW), dir = rnd() < 0.5 ? 1 : -1, p = makePlane('zeppelin', dir, dir > 0 ? -ZEP.HW - 20 : W + ZEP.HW + 20, ZEP.Y);
    p.rng = rnd;
    p.hp = p.maxHp = zeppelinHP(S.wave); p.hw = ZEP.HW; p.hh = ZEP.HH; p.face = dir; p.speed = ZEP.ENTER_SPEED;
    p.baseY = ZEP.Y; p.bob = between(rnd, 0, 6.28); p.entered = false; p.dropT = 2; p.bombT = 4; p.holes = []; p.angry = false; p.boomT = 0;
    if (S.wave >= ZEP.ARMOR_WAVE) {
      p.armored = true; p.shield = true;
      p.plates = ZEP.PLATES.map(function (k) { return { k: k, hp: ZEP.PLATE_HP, flash: 0, id: w.id() }; });
    }
    S.planes.push(p);
    emit('plane_spawn', { kind: 'zeppelin', dir: dir, y: p.y, hp: p.maxHp, armored: !!p.armored });
    return p;
  }
  // The plate over a point on the hull, if one is still on. Turning edge-on, every hit lands on the middle plate.
  function plateAt(p, x) {
    var f = p.face, k = Math.abs(f) < 0.15 ? 0 : clamp((x - p.x) / (p.hw * f), -1, 1);
    return p.plates.find(function (q) { return q.hp > 0 && Math.abs(k - q.k) <= ZEP.PLATE_W; }) || null;
  }
  function clang(x, y) { burst(x, y, 3, '#8a8f96', 110); w.sound.play('clank'); }
  // Armor takes the hit instead of the hull. Returns true when it did.
  function armorTakes(p, dmg, x, y, gondola) {
    if (!p.armored) return false;
    if (gondola) {
      if (!p.shield) return false;
      clang(x, y);
      if (!p.shieldShown) { p.shieldShown = true; addText('plated!', x, y + 26, INK2, 18, 'minor'); }
      return true;
    }
    var q = plateAt(p, x);
    if (!q) return false;
    q.hp -= dmg; q.flash = 0.1;
    clang(x, y);
    if (q.hp <= 0) {
      q.hp = 0;
      w.S.parts.push({ k: 'scrap', x: x, y: y, vx: rr(-40, 40), vy: rr(-30, 10), rot: rr(0, 6), vr: rr(-5, 5), s: 9, c: '#9aa0a8', life: 1.6, max: 1.6, id: w.id() });
      addText('plate off!', x, y - 20, INK2, 18, 'minor');
      emit('zeppelin_plate', { left: p.plates.filter(function (o) { return o.hp > 0; }).length });
      w.sound.play('thud');
    }
    return true;
  }
  function zeppelinOnScreen(p) { return p.x > 40 && p.x < W - 40; }
  // The hull is an ellipse (narrowed while it turns), plus the gondola underneath.
  function planeHit(p, x, y, near) {
    var dx = x - p.x, dy = y - p.y;
    if (p.kind !== 'zeppelin') return Math.abs(dx) < p.hw + near && Math.abs(dy) < p.hh + near;
    var f = Math.abs(p.face), hw = Math.max(16, p.hw * f) + near, hh = p.hh + near;
    if (dx * dx / (hw * hw) + dy * dy / (hh * hh) < 1) return true;
    return Math.abs(dx) < 24 * f + 4 + near && dy > p.hh - 3 && dy < p.hh + 17 + near;
  }
  function updateZeppelin(p, dt) {
    var S = w.S;
    p.hitFlash = Math.max(0, p.hitFlash - dt);
    if (p.plates) p.plates.forEach(function (q) { q.flash = Math.max(0, q.flash - dt); });
    // Turning is a cartoon flip: the hull squashes through zero width, so it slows, stops and heads back.
    p.face += clamp(p.dir - p.face, -dt * 2.6, dt * 2.6);
    if (p.state === 'fly') {
      if (!p.entered && p.x > ZEP.LEFT && p.x < ZEP.RIGHT) p.entered = true;
      var want = !p.entered ? ZEP.ENTER_SPEED : p.angry ? ZEP.ANGRY_SPEED : ZEP.SPEED;
      p.speed += (want - p.speed) * Math.min(1, dt * 1.5);
      if (p.entered && (p.dir > 0 ? p.x > ZEP.RIGHT : p.x < ZEP.LEFT)) p.dir = -p.dir;
      p.x += p.face * p.speed * dt;
      p.baseY += (ZEP.Y + ZEP.SINK * (1 - p.hp / p.maxHp) - p.baseY) * Math.min(1, dt * 0.8);
      p.y = p.baseY + Math.sin(S.t * 1.1 + p.bob) * 2.5;
      if (zeppelinOnScreen(p)) {
        p.dropT -= dt;
        if (p.dropT <= 0) { p.dropT = p.angry ? ZEP.ANGRY_DROP_EVERY : ZEP.DROP_EVERY; spawnTrooper(p.x + between(p.rng, -8, 8), p.y + p.hh + 12, rollTrooper(p.rng)).zep = p.id; }
        p.bombT -= dt;
        if (p.bombT <= 0) {
          p.bombT = p.angry ? ZEP.ANGRY_BOMB_EVERY : ZEP.BOMB_EVERY;
          [-1, 0, 1].forEach(function (k) { S.bombs.push({ id: w.id(), x: p.x + k * 10, y: p.y + p.hh - 2, vx: p.face * p.speed * 0.5 + k * 40, vy: 0, isBomb: true, dead: false }); emit('bomb_dropped', { by: 'zeppelin' }); });
          w.sound.play('whistle');
        }
      }
      p.holes.forEach(function (h) { if (R() < dt * 0.8) puff(p.x + h.x * p.face, p.y + h.y, 2, 0.5); });
      return;
    }
    // Going down: nose-first, small blasts along the hull, then a big crash. Its own bailed crew are spared.
    p.vy += 70 * dt; p.y += p.vy * dt; p.x += p.face * 16 * dt; p.rot = Math.min(0.42, p.rot + 0.22 * dt);
    p.boomT -= dt;
    if (p.boomT <= 0) {
      p.boomT = rr(0.22, 0.4);
      var ox = rr(-0.75, 0.75) * p.hw * p.face, oy = rr(-0.5, 0.5) * p.hh;
      burst(p.x + ox, p.y + oy, 6, RED, 150); puff(p.x + ox, p.y + oy, 5, 0.8);
      w.sound.play('hit');
    }
    p.smoke -= dt;
    if (p.smoke <= 0) { p.smoke = 0.07; puff(p.x + rr(-0.6, 0.6) * p.hw, p.y - p.hh * 0.6, rr(3, 6), 0.9); }
    S.troopers.forEach(function (t) {
      if (t.dead || t.zep === p.id || (t.state !== 'chute' && t.state !== 'free')) return;
      if (Math.abs(t.x - p.x) < p.hw && Math.abs(t.y + 10 - p.y) < p.hh + 8) { t.dead = true; killFx(t); S.stats.kills++; emit('kill', { by: 'crash', type: t.type }); award(10, t.x, t.y, 'bonk!', INK, true); }
    });
    if (p.y + p.hh * 0.5 >= GROUND - 8) {
      [-0.6, 0, 0.6].forEach(function (k) { explode(clamp(p.x + k * p.hw * p.face, 10, W - 10), GROUND - 4, 46, 'crash'); });
      S.shake = Math.max(S.shake, 0.8);
      p.gone = true;
    }
  }
  function hurtZeppelin(p, dmg, owner, hx, hy, direct) {
    var x = hx == null ? p.x : hx, y = hy == null ? p.y : hy, gondola = inGondola(p, x, y), weak = direct && gondola;
    if (armorTakes(p, dmg, x, y, gondola)) return;
    if (weak) { dmg *= ZEP.WEAK; if (!p.weakShown) { p.weakShown = true; addText('weak spot!', x, y + 26, BLUE, 22); } }
    p.hp -= dmg; p.hitFlash = 0.1;
    burst(x, y, weak ? 7 : 3, weak ? RED : INK, weak ? 140 : 90);
    // Holes appear where hits land, more of them as it weakens. Stored unflipped so they turn with the hull.
    var lx = (x - p.x) * (p.face < 0 ? -1 : 1), ly = y - p.y, e = Math.hypot(lx / p.hw, ly / p.hh);
    if (e > 0.8) { lx *= 0.8 / e; ly *= 0.8 / e; }
    if (p.holes.length < 2 + Math.floor((1 - Math.max(0, p.hp) / p.maxHp) * 10)) p.holes.push({ x: lx, y: ly, id: w.id() });
    if (p.hp <= 0) { zeppelinDown(p, owner); return; }
    w.sound.play(weak ? 'clank' : 'thup');
    if (!p.angry && p.hp <= p.maxHp / 2) {
      p.angry = true; addText("it's angry!", p.x, p.y - p.hh - 16, RED, 24); w.sound.play('horn');
      // The armored one sheds its gondola plate as it turns angry: the weak spot is open.
      if (p.shield) {
        p.shield = false; addText('gondola open!', p.x, p.y + p.hh + 34, BLUE, 22);
        w.S.parts.push({ k: 'scrap', x: p.x, y: p.y + p.hh + 10, vx: rr(-30, 30), vy: 0, rot: 0, vr: rr(-4, 4), s: 12, c: '#9aa0a8', life: 1.8, max: 1.8, id: w.id() });
        emit('zeppelin_open', {});
      }
    }
  }
  function zeppelinDown(p, owner) {
    var S = w.S;
    p.state = 'fall'; p.hp = 0; p.vy = 0; p.rot = 0; p.smoke = 0; p.boomT = 0.15;
    S.stats.planes++; S.stats.zeppelins++; w.credit();
    emit('plane_down', { kind: 'zeppelin', by: owner === 'ally' ? 'crew' : 'player' });
    w.pow(p.x, p.y, 60);
    award(250 + 30 * S.wave, p.x, p.y + p.hh + 40, 'zeppelin down!', owner === 'ally' ? BLUE : INK, true);
    var got = grantCall('bomber', p.x, p.y - p.hh - 20, true);
    S.banner = { s: 'zeppelin down!', sub: 'catch the crew! ' + (got ? '+1 air strike' : '+' + RADIO.FULL_TAGS + ' tags'), t: 0, dur: 2.4 };
    S.shake = Math.max(S.shake, 0.5);
    w.sound.play('zepdown');
    for (var i = 0; i < 3; i++) spawnTrooper(p.x + (i - 1) * p.hw * 0.6, p.y + p.hh + 10, rollTrooper(p.rng)).zep = p.id;
  }

  function drawZeppelin(p) {
    var G = w.G;
    pen(p.id);
    var hw = p.hw, hh = p.hh, f = p.face, i, fly = p.state === 'fly';
    if (fly) { G.beginPath(); G.ellipse(p.x, GROUND - 2, hw * Math.max(0.2, Math.abs(f)) * 0.7, 3, 0, 0, Math.PI * 2); G.fillStyle = 'rgba(46,46,51,0.07)'; G.fill(); }
    G.save(); G.translate(p.x, p.y); G.scale(f, 1); if (p.rot) G.rotate(p.rot);
    // Tail fins with enemy stripes. Local +x is the nose.
    [-1, 1].forEach(function (sd) {
      G.beginPath(); SP([-hw * 0.6, sd * hh * 0.55, -hw * 1.02, sd * hh * 1.3, -hw * 1.1, sd * hh * 1.25, -hw * 0.98, sd * 3], true, 0.5);
      G.fillStyle = PAPER; G.fill(); ink(INK, 2.2); G.stroke();
      G.beginPath(); L(-hw * 0.94, sd * hh * 1.08, -hw * 0.97, sd * hh * 0.3, 0.3); ink(RED, 3); G.stroke();
    });
    var pts = [];
    for (i = 0; i < 20; i++) { var a = i / 20 * Math.PI * 2, c = Math.cos(a); pts.push(c * hw, Math.sin(a) * hh * (c < 0 ? 1 - 0.3 * c * c : 1)); }
    G.beginPath(); SP(pts, true, 0.6);
    G.fillStyle = PAPER; G.fill();
    G.fillStyle = p.hitFlash > 0 ? 'rgba(200,67,58,0.28)' : p.angry ? RED_FILL : INK_FILL; G.fill();
    ink(INK, 2.6); G.stroke();
    // Gores and a seam give it some roundness.
    G.beginPath();
    [-0.62, -0.3, 0.02, 0.34, 0.64].forEach(function (k) {
      var x = k * hw, h = hh * Math.sqrt(1 - k * k) * (k < 0 ? 1 - 0.3 * k * k : 1) - 1;
      G.moveTo(x + jt(0.4), -h); G.quadraticCurveTo(x + 7 + jt(0.8), 0, x + jt(0.4), h);
    });
    ink('rgba(46,46,51,0.35)', 1.3); G.stroke();
    G.beginPath(); L(-hw * 0.88, hh * 0.32, hw * 0.9, hh * 0.25, 0.6); ink('rgba(46,46,51,0.25)', 1.2); G.stroke();
    // Steel plates, riveted, cracking as they take hits.
    if (p.plates) {
      var hullH = function (k) { return hh * Math.sqrt(Math.max(0, 1 - k * k)) * (k < 0 ? 1 - 0.3 * k * k : 1); };
      p.plates.forEach(function (q) {
        if (q.hp <= 0) return;
        pen(q.id);
        var xs = [q.k - ZEP.PLATE_W + 0.025, q.k, q.k + ZEP.PLATE_W - 0.025].map(function (k) { return clamp(k, -0.96, 0.96); }), pts = [];
        xs.forEach(function (k) { pts.push(k * hw, -hullH(k) * 0.9); });
        xs.slice().reverse().forEach(function (k) { pts.push(k * hw, hullH(k) * 0.9); });
        G.beginPath(); SP(pts, true, 0.4); G.fillStyle = q.flash > 0 ? 'rgba(230,234,238,0.95)' : STEEL; G.fill(); ink(INK, 1.8); G.stroke();
        G.fillStyle = INK;
        [xs[0] + 0.05, xs[2] - 0.05].forEach(function (k) { [-1, 1].forEach(function (sy) { G.beginPath(); G.arc(k * hw, sy * hullH(k) * 0.66, 1.3, 0, Math.PI * 2); G.fill(); }); });
        if (q.hp <= ZEP.PLATE_HP / 2) { G.beginPath(); SP([(q.k - 0.09) * hw, -7, (q.k - 0.02) * hw, 1, (q.k + 0.04) * hw, -3, (q.k + 0.1) * hw, 6], false, 0.3); ink(INK, 1.3); G.stroke(); }
      });
      pen(p.id);
    }
    G.beginPath(); G.arc(hw * 0.5, -hh * 0.18, 7, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
    G.beginPath(); G.arc(hw * 0.5, -hh * 0.18, 2.6, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
    p.holes.forEach(function (h) { pen(h.id); G.beginPath(); SP([h.x - 3, h.y, h.x - 1, h.y - 3, h.x + 3, h.y - 2, h.x + 2, h.y + 2, h.x - 2, h.y + 3], true, 0.6); G.fillStyle = INK; G.fill(); });
    pen(p.id);
    if (!fly) {
      [-0.4, 0.1, 0.5].forEach(function (k, j) {
        var fx = k * hw, fy = -hh * Math.sqrt(1 - k * k) + 2, fh = 10 + ((w.boil + j) % 3) * 4;
        G.beginPath(); SP([fx - 7, fy, fx - 4, fy - fh * 0.6, fx - 1, fy - fh * 0.3, fx + 1, fy - fh, fx + 4, fy - fh * 0.4, fx + 7, fy], false, 0.8);
        G.fillStyle = 'rgba(200,67,58,0.25)'; G.fill(); ink(RED, 2); G.stroke();
      });
    }
    // Gondola, with a stick crew at the windows while it flies.
    G.beginPath(); L(-16, hh - 3, -12, hh + 5, 0.3); L(16, hh - 3, 12, hh + 5, 0.3); ink(INK, 1.8); G.stroke();
    G.beginPath(); SP([-24, hh + 4, 22, hh + 4, 26, hh + 9, 20, hh + 16, -22, hh + 16], true, 0.4); G.fillStyle = PAPER; G.fill(); ink(INK, 2.2); G.stroke();
    [-14, -3, 8].forEach(function (wx) {
      G.beginPath(); G.rect(wx, hh + 6.5, 6, 6); ink(INK, 1.3); G.stroke();
      if (fly) { G.beginPath(); G.arc(wx + 3, hh + 9.5, 1.8, 0, Math.PI * 2); G.fillStyle = RED; G.fill(); }
    });
    // The plated gondola: a steel shutter over the windows until it turns angry.
    if (p.shield) {
      G.beginPath(); SP([-25, hh + 4.5, 23, hh + 4.5, 25, hh + 15, -23, hh + 15], true, 0.3); G.fillStyle = 'rgba(112,120,130,0.8)'; G.fill(); ink(INK, 1.8); G.stroke();
      G.fillStyle = INK; [-20, -6, 8, 19].forEach(function (rx) { G.beginPath(); G.arc(rx, hh + 9.8, 1.2, 0, Math.PI * 2); G.fill(); });
    }
    var pl = w.boil % 2 ? 7 : 4;
    G.beginPath(); L(-27, hh + 10 - pl, -27, hh + 10 + pl, 0.3); ink(INK, 1.8); G.stroke();
    if (fly && Math.abs(f) > 0.8) { G.globalAlpha = 0.45; G.beginPath(); L(-hw * 1.18, -8, -hw * 1.18 - 16, -8); L(-hw * 1.2, 4, -hw * 1.2 - 10, 4); ink(INK2, 1.5); G.stroke(); G.globalAlpha = 1; }
    G.restore();
  }
  // Boss health rides just above the hull, below the escort lane; the tick marks half, where it turns angry. It comes
  // in with the hull, and is only held on the page once the zeppelin has fully arrived.
  function drawBossBar() {
    var S = w.S, G = w.G; // w is the world; bw is the bar width
    var z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; });
    if (!z) return;
    var bw = 96, cx = z.entered ? clamp(z.x, 12 + bw / 2, W - 12 - bw / 2) : z.x;
    var x = cx - bw / 2, y = z.y - z.hh - 12, f = clamp(z.hp / z.maxHp, 0, 1);
    pen(4343);
    G.fillStyle = PAPER; G.fillRect(x, y - 4, bw, 8);
    G.fillStyle = z.hitFlash > 0 ? 'rgba(200,67,58,0.75)' : 'rgba(200,67,58,0.45)'; G.fillRect(x + 1.5, y - 2.5, (bw - 3) * f, 5);
    G.beginPath(); L(x, y - 4, x + bw, y - 4, 0.4); L(x + bw, y - 4, x + bw, y + 4, 0.3); L(x + bw, y + 4, x, y + 4, 0.4); L(x, y + 4, x, y - 4, 0.3); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(x + bw / 2, y - 6, x + bw / 2, y + 6, 0.2); ink(INK2, 1.2); G.stroke();
  }

  // ---------- side rushers ----------
  // From RUSH.WAVE, small groups charge in along the ground from one edge. They are ordinary troopers on the ground
  // (lander logic), just faster, so the crew, mines, wire and a dipped barrel all deal with them.
  var RUSH = { WAVE: 6, SPEED: 48 };
  function spawnRush() {
    var S = w.S, rnd = substream(w.RW), side = rnd() < 0.5 ? -1 : 1, n = S.spawn.cfg.rushSize;
    for (var i = 0; i < n; i++) {
      var kit = rollTrooper(rnd);
      if (kit.type === 'sniper') kit.type = 'rifle';
      var t = spawnTrooper(0, GROUND - 33, kit);
      t.x = side < 0 ? -14 - i * 24 : W + 14 + i * 24; t.state = 'ground'; t.open = 1; t.dir = -side; t.speed = RUSH.SPEED; t.rusher = true;
    }
    addText('rush!', side < 0 ? 60 : W - 60, GROUND - 74, RED, 24);
    w.sound.play('rush'); w.say('charge!', 900 + n, true);
    emit('rush', { side: side < 0 ? 'left' : 'right', count: n });
  }

  // ---------- tanks ----------
  // From TANK.WAVE a cargo plane carries a tank on a pallet chute. Shoot the plane down first and the tank goes
  // with it. Landed, the tank rolls to TANK.STOP from the wall (just inside the barrel's dip) and lobs shells at the
  // bunker. Shells fly like bombs, so they can be shot down. Turret and rifle hits chip it (BULLET each); rockets,
  // mines, crashes and the air strike hit hard.
  var TANK = { WAVE: 9, ROAD_WAVE: 11, HW: 27, HH: 13, SPEED: 13, STOP: 70, FALL: 70, SHELL_EVERY: 3.6, SHELL_DAMAGE: 8, BULLET: 0.1,
    BLAST: { rocket: 4, mine: 6, crash: 6, strike: 14 } };
  function tankHP(n) { return Math.round(10 + 0.8 * n); }
  function spawnCargo() {
    var S = w.S, rnd = substream(w.RW), dir = rnd() < 0.5 ? 1 : -1;
    var p = makePlane('cargo', dir, dir > 0 ? -80 : W + 80, between(rnd, 104, 124));
    p.rng = rnd; p.speed = S.spawn.cfg.speed * 0.5; p.hp = 4; p.sc = 0.95; p.hw = 50; p.hh = 16; p.kits = [];
    p.tankX = rnd() < 0.5 ? between(rnd, 34, 80) : between(rnd, 320, 366);
    S.planes.push(p);
    emit('plane_spawn', { kind: 'cargo', dir: dir, y: p.y, speed: p.speed, tankX: p.tankX });
  }
  function updateCargo(p) {
    if (p.tankX == null || (p.dir > 0 ? p.x < p.tankX : p.x > p.tankX)) return;
    var S = w.S, hp = tankHP(S.wave);
    S.tanks.push({ id: w.id(), x: p.tankX, y: p.y + 24, state: 'chute', dir: p.tankX < BK.x ? 1 : -1, hp: hp, maxHp: hp,
      shellT: 1, hitFlash: 0, tread: 0, dead: false });
    p.tankX = null;
    emit('tank_drop', { hp: hp });
  }
  // A tank by road rolls in from one edge of the page and stops, like a dropped one, within the barrel's dip.
  function spawnRoadTank() {
    var S = w.S, rnd = substream(w.RW), side = rnd() < 0.5 ? -1 : 1, hp = tankHP(S.wave);
    S.tanks.push({ id: w.id(), x: side < 0 ? -TANK.HW - 10 : W + TANK.HW + 10, y: GROUND - 1 - TANK.HH, state: 'roll', road: true, dir: -side, hp: hp, maxHp: hp,
      shellT: 2.5, hitFlash: 0, tread: 0, dead: false });
    addText('tank!', side < 0 ? 48 : W - 48, GROUND - 70, RED, 22);
    emit('tank_drop', { hp: hp, road: true });
    w.sound.play('cannon');
  }
  function tankHit(tk, x, y, near) {
    return Math.abs(x - tk.x) < TANK.HW + near && y > tk.y - TANK.HH - 10 - near && y < tk.y + TANK.HH + near;
  }
  function damageTank(tk, dmg, owner) {
    var S = w.S;
    if (tk.dead) return;
    tk.hp -= dmg; tk.hitFlash = 0.12;
    burst(tk.x, tk.y - 4, 4, INK, 100);
    if (tk.hp > 0) { w.sound.play('clank'); return; }
    tk.dead = true; S.stats.tanks++; w.credit();
    emit('tank_down', { by: owner === 'ally' ? 'crew' : 'player' });
    award(150, tk.x, tk.y - 34, 'tank down!', owner === 'ally' ? BLUE : INK, true);
    explode(tk.x, Math.min(GROUND - 6, tk.y), 40, 'wreck');
    addDecal({ kind: 'scorch', x: tk.x, y: GROUND - 3, r: 26, color: INK, a: 0.25, seed: tk.id });
  }
  function fireShell(tk) {
    var S = w.S, x = tk.x + tk.dir * 33, y = tk.y - 19, tx = BK.x + between(w.RC, -16, 16), ty = BK.top - 4, T = 0.9;
    S.bombs.push({ id: w.id(), x: x, y: y, vx: (tx - x) / T, vy: (ty - y - 0.5 * 260 * T * T) / T, isBomb: true, shell: true, dead: false });
    puff(x + tk.dir * 4, y, 4, 0.6);
    w.sound.play('cannon');
    emit('bomb_dropped', { by: 'tank' });
  }
  function updateTanks(dt) {
    var S = w.S;
    S.tanks.forEach(function (tk) {
      if (tk.dead) return;
      tk.hitFlash = Math.max(0, tk.hitFlash - dt);
      if (tk.state === 'chute') {
        tk.y += TANK.FALL * dt;
        if (tk.y + TANK.HH >= GROUND - 1) {
          tk.y = GROUND - 1 - TANK.HH; tk.state = 'roll';
          burst(tk.x, GROUND - 2, 10, INK, 120); S.shake = Math.max(S.shake, 0.3); w.sound.play('thud');
          // Landing on troopers flattens them, just like a popped trooper would.
          S.troopers.forEach(function (t) { if (!t.dead && t.state === 'ground' && Math.abs(t.x - tk.x) < TANK.HW) { t.dead = true; S.stats.kills++; killFx(t, 230, true); award(30, t.x, GROUND - 60, 'squashed!', INK, true); } });
        }
        return;
      }
      var mine = S.mines.find(function (m) { return m.armed && Math.abs(m.x - tk.x) < TANK.HW; });
      if (mine) { mine.armed = false; explode(mine.x, GROUND - 12, 38, 'mine', 'ally'); if (tk.dead) return; }
      var stopX = tk.dir > 0 ? BK.x1 - TANK.STOP : BK.x2 + TANK.STOP;
      var front = tk.x + tk.dir * TANK.HW, blocker = S.recruits.find(function (r) { return !r.dead && (r.x - front) * tk.dir > -4 && (r.x - front) * tk.dir < 6; });
      if (blocker) hurtRecruit(blocker, 2.5 * dt, 'tank');
      else if ((stopX - tk.x) * tk.dir > 0) { tk.x += tk.dir * Math.min(TANK.SPEED * (S.mods.wire ? 0.5 : 1) * dt, Math.abs(stopX - tk.x)); tk.tread += dt * 8; }
      // Tanks shell on the move as well as parked; a crew member in the way keeps the crew busy instead.
      if (!blocker && tk.x > 0 && tk.x < W) { tk.shellT -= dt; if (tk.shellT <= 0) { tk.shellT = TANK.SHELL_EVERY; fireShell(tk); } }
    });
    S.tanks = S.tanks.filter(function (tk) { return !tk.dead; });
  }
  // Explosions near a tank (not its own wreck, flak or a bomb popped in the air).
  function blastTanks(x, y, r, kind, owner) {
    var dmg = TANK.BLAST[kind];
    if (!dmg) return;
    w.S.tanks.forEach(function (tk) { if (!tk.dead && Math.abs(tk.x - x) < r + TANK.HW && Math.abs(tk.y - y) < r + TANK.HH + 10) damageTank(tk, dmg, owner || 'ally'); });
  }
  function drawTank(tk) {
    var G = w.G, d = tk.dir, k = TANK.HW / 21;
    pen(tk.id);
    // Drawn at 21 px half-width and scaled up to TANK.HW, so the art and the hit box agree.
    G.save(); G.translate(tk.x, tk.y); G.scale(k, k);
    if (tk.state === 'chute') {
      // A pallet under two big canopies.
      [-14, 14].forEach(function (ox) {
        G.beginPath(); G.moveTo(ox - 20, -46); G.quadraticCurveTo(ox, -74, ox + 20, -46); G.closePath(); G.fillStyle = RED_FILL; G.fill();
        G.beginPath(); G.moveTo(ox - 20, -46); G.quadraticCurveTo(ox, -74, ox + 20, -46); L(ox - 20, -46, ox - 8, -14, 0.3); L(ox + 20, -46, ox + 8, -14, 0.3); ink(RED, 1.8 / k); G.stroke();
      });
      G.beginPath(); L(-24, 12, 24, 12, 0.3); ink(INK, 3 / k); G.stroke();
    }
    G.beginPath(); SP([-21, 2, -17, -7, 17, -7, 21, 2, 17, 10, -17, 10], true, 0.5);
    G.fillStyle = PAPER; G.fill(); G.fillStyle = tk.hitFlash > 0 ? 'rgba(200,67,58,0.3)' : INK_FILL; G.fill(); ink(INK, 2.4 / k); G.stroke();
    // Treads: wheels that turn as it rolls.
    for (var i = -2; i <= 2; i++) {
      var wx = i * 8;
      G.beginPath(); Ci(wx, 6, 3.2, 0.2); ink(INK, 1.6 / k); G.stroke();
      G.beginPath(); L(wx, 6, wx + Math.cos(tk.tread + i) * 3, 6 + Math.sin(tk.tread + i) * 3, 0.1); ink(INK, 1.2 / k); G.stroke();
    }
    G.beginPath(); G.arc(-d * 2, -7, 9, Math.PI, 0); G.closePath(); G.fillStyle = PAPER; G.fill(); ink(INK, 2.2 / k); G.stroke();
    G.beginPath(); L(d * 5, -12, d * 26, -15, 0.3); ink(INK, 3.4 / k); G.stroke();
    G.beginPath(); G.arc(-d * 10, -1, 3, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
    if (tk.state !== 'chute' && tk.hp < tk.maxHp) {
      var f = Math.max(0, tk.hp / tk.maxHp);
      G.fillStyle = PAPER; G.fillRect(-16, -27, 32, 5);
      G.fillStyle = 'rgba(200,67,58,0.55)'; G.fillRect(-15, -26, 30 * f, 3);
      G.beginPath(); L(-16, -27, 16, -27, 0.2); L(-16, -22, 16, -22, 0.2); ink(INK, 1 / k); G.stroke();
    }
    G.restore();
  }

  // ---------- radio calls ----------
  // The player's specials. A bomber run lays a carpet of bombs on the field, sparing the bunker and the crew: it kills
  // troopers on and near the ground and hits tanks hard. Fighter cover makes one fast pass through the sky, gunning
  // down planes and bombs. The radio holds RADIO.SLOTS calls of either kind. A run starts with none; HQ sends a
  // bomber with the first tanks, each zeppelin downed earns one, and the shop sells both.
  // A call starts on the radio: someone in the squad (or the bunker, with no squad) raises a buzzing walkie-talkie
  // for TALK seconds, then the plane is sketched in at the left edge of the page (HOLD seconds), then it flies.
  var RADIO = { SLOTS: 2, FULL_TAGS: 40, TALK: 0.6 };
  var STRIKE = { SPEED: 230, Y: 92, BOMBS: 11, FALL: 520, START: 56, HOLD: 0.45 };
  // Fighter cover swoops in from DIVE px above its lane over DIVE_T seconds, trailing contrails, strafing with tracers.
  // Fighter cover is a flight of two, the wingman WING_X behind and WING_Y above the lead.
  var FIGHTER = { SPEED: 250, PASSES: [190], EVERY: 0.08, RANGE: 320, BULLET: 760, SHOP_WAVE: 3, START: 34, HOLD: 0.35, DIVE: 70, DIVE_T: 0.5, WING_X: 46, WING_Y: 24 };
  var FIGHTER_PTS = [-34, 1, -32, -5, -18, -7, 22, -5, 28, -6, 34, -16, 40, -16, 38, 1, 16, 5, -24, 6];
  function callsHeld() { var c = w.S.calls; return c.bomber + c.fighter; }
  // A free call from HQ or a zeppelin. With the radio full it pays out in tags instead. Quiet when a banner says it.
  function grantCall(kind, x, y, quiet) {
    var S = w.S;
    if (callsHeld() < RADIO.SLOTS) {
      S.calls[kind]++;
      if (!quiet) addText(kind === 'bomber' ? '+1 air strike' : '+1 fighter cover', x, y, BLUE, 22);
      return true;
    }
    S.coins += RADIO.FULL_TAGS; w.flyTags(x, y, RADIO.FULL_TAGS);
    emit('coins', { amount: RADIO.FULL_TAGS, reason: 'radio full' });
    if (!quiet) addText('radio full +' + RADIO.FULL_TAGS + ' tags', x, y, BLUE, 20);
    return false;
  }
  // The caller: the most decorated soldier standing, nearest the bunker on a tie; with no squad, the bunker itself.
  function radioCall(label) {
    var S = w.S, crew = S.recruits.filter(function (r) { return !r.dead && !r.down; })
      .sort(function (a, b) { return (b.rank || 0) - (a.rank || 0) || Math.abs(a.x - BK.x) - Math.abs(b.x - BK.x); });
    var r = crew[0];
    S.radio = { rid: r ? r.id : null, x: r ? r.x : BK.x, t: 0, dur: RADIO.TALK + 0.6 };
    addText(label, r ? r.x : BK.x, GROUND - (r ? 74 : 104), BLUE, 24);
    w.sound.play('radio'); w.say(label, r ? r.id : 77, false, 0.25);
  }
  function updateRadio(dt) {
    var S = w.S, rc = S.radio;
    if (!rc) return;
    var r = rc.rid != null && S.recruits.find(function (q) { return q.id === rc.rid; });
    if (r) rc.x = r.x;
    if ((rc.t += dt) > rc.dur || (rc.rid != null && (!r || r.dead || r.down))) S.radio = null;
  }
  // A walkie-talkie by the caller's head, antenna up, buzzing.
  function drawRadio() {
    var S = w.S, G = w.G, rc = S.radio;
    if (!rc) return;
    var cx = rc.x + 10, cy = rc.rid != null ? GROUND - 38 : BK.top - 24, a = Math.min(1, (rc.dur - rc.t) / 0.25), x = 0, y = 0;
    pen(rc.rid || 77); G.save(); G.globalAlpha = a; G.translate(cx, cy); G.scale(1.5, 1.5);
    G.beginPath(); SP([x - 3, y - 5, x + 3, y - 5, x + 3, y + 6, x - 3, y + 6], true, 0.2); G.fillStyle = INK; G.fill();
    G.beginPath(); L(x + 1.8, y - 5, x + 2.4, y - 12, 0.2); ink(INK, 1.6); G.stroke();
    G.fillStyle = PAPER; G.fillRect(x - 1.8, y - 3, 3.6, 2.6);
    if (rc.t < RADIO.TALK + 0.3 && w.boil % 2) {
      G.beginPath(); SP([x + 6, y - 8, x + 9, y - 5, x + 7, y - 2, x + 10, y + 1], false, 0.3); SP([x - 6, y - 8, x - 9, y - 5, x - 7, y - 2, x - 10, y + 1], false, 0.3);
      ink(BLUE, 1.6); G.stroke();
    }
    G.restore();
  }
  function callStrike() {
    var S = w.S;
    if (S.mode !== 'play' || S.strike || S.calls.bomber <= 0) return false;
    S.calls.bomber--;
    var targets = [];
    for (var i = 0; i < STRIKE.BOMBS; i++) { var x = 24 + i * (W - 48) / (STRIKE.BOMBS - 1); if (Math.abs(x - BK.x) > 46) targets.push(x); }
    S.strike = { x: STRIKE.START, hold: STRIKE.HOLD + RADIO.TALK, drops: targets, id: w.id() };
    radioCall('air strike!');
    emit('air_strike', { wave: S.wave, left: S.calls.bomber });
    return true;
  }
  function updateStrike(dt) {
    var S = w.S, st = S.strike;
    if (st && st.hold > 0) { var was = st.hold; st.hold -= dt; if (was > STRIKE.HOLD && st.hold <= STRIKE.HOLD) w.sound.play('strike'); }
    else if (st) {
      st.x += STRIKE.SPEED * dt;
      while (st.drops.length && st.x >= st.drops[0]) S.strikeBombs.push({ id: w.id(), x: st.drops.shift(), y: STRIKE.Y + 12, vy: 80, dead: false });
      if (st.x > W + 100) S.strike = null;
    }
    S.strikeBombs.forEach(function (m) {
      m.vy += STRIKE.FALL * dt; m.y += m.vy * dt;
      if (m.y >= GROUND - 6) { m.dead = true; explode(m.x, GROUND - 4, 36, 'strike', 'ally'); }
    });
    S.strikeBombs = S.strikeBombs.filter(function (m) { return !m.dead; });
  }
  function callFighter() {
    var S = w.S;
    if (S.mode !== 'play' || S.fighter || S.calls.fighter <= 0) return false;
    S.calls.fighter--;
    // A lead and a wingman, flying in echelon. Each has its own guns, contrail and muzzle flash.
    S.fighter = { pass: 0, dir: 1, x: FIGHTER.START, y: FIGHTER.PASSES[0], hold: FIGHTER.HOLD + RADIO.TALK, fly: 0, dive: FIGHTER.DIVE, id: w.id(),
      wing: [{ dx: 0, dy: 0, cd: 0.1, flash: 0, trail: [] }, { dx: -FIGHTER.WING_X, dy: -FIGHTER.WING_Y, cd: 0.16, flash: 0, trail: [] }] };
    radioCall('fighter cover!');
    emit('fighter_cover', { wave: S.wave, left: S.calls.fighter });
    return true;
  }
  // Where a plane of the flight is now.
  function wingAt(f, q) { return { x: f.x + f.dir * q.dx, y: f.y - f.dive + q.dy }; }
  // Ahead of a plane and in range: bombs first (they threaten the bunker), then planes, the Dreadnought's guns, the
  // zeppelin last.
  function fighterTarget(x, y, dir) {
    var S = w.S, best = null, bd = 1e9;
    function consider(list, ok, bias) {
      list.forEach(function (o) {
        if (!ok(o)) return;
        var dx = (o.x - x) * dir, d = Math.hypot(o.x - x, o.y - y) + bias;
        if (dx > 10 && d < FIGHTER.RANGE + bias && d < bd) { bd = d; best = o; }
      });
    }
    consider(S.bombs, function (m) { return !m.dead && m.y < GROUND - 70; }, 0);
    // Not balloons: popped from up here, a balloon's bomb could fall anywhere, the crew included.
    consider(S.planes, function (p) { return p.state === 'fly' && p.kind !== 'zeppelin' && p.kind !== 'dread' && p.kind !== 'balloon'; }, 40);
    consider(S.planes, function (p) { return p.state === 'fly' && p.kind === 'zeppelin'; }, 200);
    consider(w.dreadTargets ? w.dreadTargets() : [], function () { return true; }, 100);
    return best;
  }
  // The flight strafes the sky: each plane fires a steady stream of tracers, aimed at what's ahead, or raking
  // forward and a little down when nothing is.
  function updateFighter(dt) {
    var S = w.S, f = S.fighter;
    if (!f) return;
    if (f.hold > 0) { var was = f.hold; f.hold -= dt; if (was > FIGHTER.HOLD && f.hold <= FIGHTER.HOLD) w.sound.play('fighter'); return; }
    // It swoops down into its lane: the dive is a height above the lane that eases to zero.
    f.fly += dt; var u = Math.min(1, f.fly / FIGHTER.DIVE_T); f.dive = FIGHTER.DIVE * (1 - u) * (1 - u);
    f.x += f.dir * FIGHTER.SPEED * dt;
    f.wing.forEach(function (q, i) {
      var at = wingAt(f, q);
      q.cd -= dt; q.flash = Math.max(0, q.flash - dt);
      q.trail.push({ x: at.x - f.dir * 26, y: at.y + 1 }); if (q.trail.length > 14) q.trail.shift();
      if (q.cd > 0 || at.x < -20 || at.x > W + 20) return;
      var nx = at.x + f.dir * 30, a, tg = fighterTarget(at.x, at.y, f.dir);
      if (tg) {
        var vx = tg.isBomb ? tg.vx : tg.kind === 'zeppelin' ? tg.face * tg.speed : tg.kind === 'dreadpart' ? tg.vx : tg.dir * tg.speed, vy = tg.isBomb ? tg.vy : 0;
        var tt = Math.hypot(tg.x - nx, tg.y - at.y) / FIGHTER.BULLET;
        a = Math.atan2(tg.y + vy * tt - at.y, tg.x + vx * tt - nx) + (w.RC() * 2 - 1) * 0.02;
      } else a = (f.dir > 0 ? 0 : Math.PI) + f.dir * (0.1 + 0.08 * Math.sin(f.fly * 9 + i * 2));
      S.bullets.push({ x: nx, y: at.y, vx: Math.cos(a) * FIGHTER.BULLET, vy: Math.sin(a) * FIGHTER.BULLET, owner: 'ally', kind: 'bullet', tracer: true, pierce: 1, hits: [], life: 0.7, dead: false });
      q.cd = FIGHTER.EVERY; q.flash = 0.05;
      // Spent casings fall from the guns.
      w.burst(at.x - f.dir * 4, at.y + 4, 1, HAT, 50);
      w.sound.play('ally');
    });
    if (f.dir > 0 ? f.x > W + 70 + FIGHTER.WING_X : f.x < -70 - FIGHTER.WING_X) {
      if (++f.pass >= FIGHTER.PASSES.length) { S.fighter = null; return; }
      f.dir = -f.dir; f.x = f.dir > 0 ? -60 : W + 60; f.y = FIGHTER.PASSES[f.pass]; f.wing.forEach(function (q) { q.trail = []; });
    }
  }
  function drawStrike() {
    var S = w.S, G = w.G, st = S.strike;
    S.strikeBombs.forEach(function (m) {
      pen(m.id); G.save(); G.translate(m.x, m.y);
      G.beginPath(); G.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
      G.beginPath(); L(-4, -6, -5, -11, 0.2); L(4, -6, 5, -11, 0.2); ink(INK, 1.6); G.stroke(); G.restore();
    });
    if (!st) return;
    var body = function () {
      pen(st.id); G.save(); G.translate(st.x, STRIKE.Y); G.scale(-0.86, 0.86);
      G.beginPath(); SP(w.BOMBER_PTS, true, 0.6); G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(47,111,220,0.12)'; G.fill(); ink(INK, 2.6); G.stroke();
      G.beginPath(); L(-16, 4, 22, 6); ink(INK, 3.4); G.stroke();
      G.beginPath(); G.arc(18, -3, 5, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
      G.beginPath(); G.arc(18, -3, 2, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
      var pl = w.boil % 2 ? 11 : 6; G.beginPath(); L(-50, -pl, -50, pl, 0.4); ink(INK, 2.3); G.stroke();
      G.restore();
    };
    if (st.hold > 0) w.sketchReveal(1 - st.hold / STRIKE.HOLD, [st.x - 54, STRIKE.Y - 28, st.x + 46, STRIKE.Y + 16], 'right', body); else body();
  }
  function drawFighter() {
    var f = w.S.fighter, G = w.G;
    if (!f) return;
    if (f.hold > 0) {
      var lead = wingAt(f, f.wing[0]);
      w.sketchReveal(1 - f.hold / FIGHTER.HOLD, [lead.x - 32 - FIGHTER.WING_X, lead.y - 16 - FIGHTER.WING_Y, lead.x + 32, lead.y + 8], 'right', function () { f.wing.forEach(function (q) { fighterBody(f, q, G); }); });
      return;
    }
    f.wing.forEach(function (q) {
      // The contrail: a pencil line that fades behind it.
      for (var i = 1; i < q.trail.length; i++) {
        var p0 = q.trail[i - 1], p1 = q.trail[i];
        G.globalAlpha = i / q.trail.length * 0.45; G.beginPath(); L(p0.x, p0.y, p1.x, p1.y, 0.2); ink(INK2, 1.6); G.stroke();
      }
      G.globalAlpha = 1;
      fighterBody(f, q, G);
    });
  }
  function fighterBody(f, q, G) {
    var tilt = f.dive > 0 ? f.dive / FIGHTER.DIVE * 0.5 : 0, at = wingAt(f, q);
    pen(f.id + q.dx); G.save(); G.translate(at.x, at.y); G.rotate(f.dir * tilt); G.scale(-f.dir * 0.72, 0.72);
    G.beginPath(); SP(FIGHTER_PTS, true, 0.5); G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(47,111,220,0.16)'; G.fill(); ink(INK, 3); G.stroke();
    G.beginPath(); L(-10, 2, 12, 3); ink(INK, 3.6); G.stroke();
    G.beginPath(); G.arc(12, -2, 4, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
    G.beginPath(); G.arc(12, -2, 1.6, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
    var pl = w.boil % 2 ? 10 : 5; G.beginPath(); L(-38, -pl, -38, pl, 0.4); ink(INK, 2.6); G.stroke();
    if (q.flash > 0) {
      // A big muzzle flash at both wing guns.
      G.beginPath(); L(-42, -1, -62, -1, 0.3); L(-42, 2, -58, 8, 0.3); L(-42, -3, -58, -9, 0.3); L(-24, 6, -40, 7, 0.3);
      ink('#d99a00', 4); G.stroke(); ink(HAT, 2); G.stroke();
      G.beginPath(); G.arc(-46, -1, 5, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,0.9)'; G.fill();
    }
    G.restore();
  }

  return { ZEP: ZEP, zeppelinHP: zeppelinHP, spawnZeppelin: spawnZeppelin, zeppelinOnScreen: zeppelinOnScreen, planeHit: planeHit,
    updateZeppelin: updateZeppelin, hurtZeppelin: hurtZeppelin, inGondola: inGondola, zeppelinDown: zeppelinDown, drawZeppelin: drawZeppelin, drawBossBar: drawBossBar,
    RUSH: RUSH, spawnRush: spawnRush,
    TANK: TANK, tankHP: tankHP, spawnCargo: spawnCargo, updateCargo: updateCargo, spawnRoadTank: spawnRoadTank, tankHit: tankHit, damageTank: damageTank, updateTanks: updateTanks,
    blastTanks: blastTanks, drawTank: drawTank,
    RADIO: RADIO, callsHeld: callsHeld, grantCall: grantCall, STRIKE: STRIKE, callStrike: callStrike, updateStrike: updateStrike, drawStrike: drawStrike,
    FIGHTER: FIGHTER, callFighter: callFighter, updateFighter: updateFighter, drawFighter: drawFighter, updateRadio: updateRadio, drawRadio: drawRadio };
};
