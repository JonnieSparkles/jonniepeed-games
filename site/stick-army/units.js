// Stick Army units beyond the basic trooper and plane: the zeppelin boss, side rushers, tanks and the air strike.
// Classic script; load before game.js. game.js calls StickArmyUnits(world) once. The world object carries its
// constants and helpers, and live values (state S, canvas G, line boil, the wave stream RW, sound) through getters,
// so this file never reaches into game.js's scope. Effect helpers are wrappers, so harness stubs still apply.
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
  var ZEP = { HW: 78, HH: 25, Y: 172, SINK: 44, LEFT: 72, RIGHT: 328, SPEED: 24, ANGRY_SPEED: 36, ENTER_SPEED: 48,
    DROP_EVERY: 3.4, ANGRY_DROP_EVERY: 2.4, BOMB_EVERY: 6.5, ANGRY_BOMB_EVERY: 4.5 };
  function zeppelinHP(n) { return Math.round(12 + BALANCE.BOSS_HP_PER_WAVE * n); }
  // The gondola is the weak spot: direct shots there do triple damage.
  function inGondola(p, x, y) { var dx = x - p.x, dy = y - p.y; return dy > p.hh - 3 && Math.abs(dx) < 24 * Math.abs(p.face) + 4; }
  function spawnZeppelin() {
    var S = w.S;
    var rnd = substream(w.RW), dir = rnd() < 0.5 ? 1 : -1, p = makePlane('zeppelin', dir, dir > 0 ? -ZEP.HW - 20 : W + ZEP.HW + 20, ZEP.Y);
    p.rng = rnd;
    p.hp = p.maxHp = zeppelinHP(S.wave); p.hw = ZEP.HW; p.hh = ZEP.HH; p.face = dir; p.speed = ZEP.ENTER_SPEED;
    p.baseY = ZEP.Y; p.bob = between(rnd, 0, 6.28); p.entered = false; p.dropT = 2; p.bombT = 4; p.holes = []; p.angry = false; p.boomT = 0;
    S.planes.push(p);
    emit('plane_spawn', { kind: 'zeppelin', dir: dir, y: p.y, hp: p.maxHp });
    w.sound.play('horn');
    return p;
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
    var x = hx == null ? p.x : hx, y = hy == null ? p.y : hy, weak = direct && inGondola(p, x, y);
    if (weak) { dmg *= 3; if (!p.weakShown) { p.weakShown = true; addText('weak spot!', x, y + 26, BLUE, 22); } }
    p.hp -= dmg; p.hitFlash = 0.1;
    burst(x, y, weak ? 7 : 3, weak ? RED : INK, weak ? 140 : 90);
    // Holes appear where hits land, more of them as it weakens. Stored unflipped so they turn with the hull.
    var lx = (x - p.x) * (p.face < 0 ? -1 : 1), ly = y - p.y, e = Math.hypot(lx / p.hw, ly / p.hh);
    if (e > 0.8) { lx *= 0.8 / e; ly *= 0.8 / e; }
    if (p.holes.length < 2 + Math.floor((1 - Math.max(0, p.hp) / p.maxHp) * 10)) p.holes.push({ x: lx, y: ly, id: w.id() });
    if (p.hp <= 0) { zeppelinDown(p, owner); return; }
    w.sound.play(weak ? 'clank' : 'thup');
    if (!p.angry && p.hp <= p.maxHp / 2) { p.angry = true; addText("it's angry!", p.x, p.y - p.hh - 16, RED, 24); w.sound.play('horn'); }
  }
  function zeppelinDown(p, owner) {
    var S = w.S;
    p.state = 'fall'; p.hp = 0; p.vy = 0; p.rot = 0; p.smoke = 0; p.boomT = 0.15;
    S.stats.planes++; S.stats.zeppelins++;
    emit('plane_down', { kind: 'zeppelin', by: owner === 'ally' ? 'crew' : 'player' });
    award(250 + 30 * S.wave, p.x, p.y + p.hh + 40, 'zeppelin down!', owner === 'ally' ? BLUE : INK, true);
    S.banner = { s: 'zeppelin down!', sub: 'catch the crew! +1 air strike', t: 0, dur: 2.4 };
    S.strikes++;
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
    var pl = w.boil % 2 ? 7 : 4;
    G.beginPath(); L(-27, hh + 10 - pl, -27, hh + 10 + pl, 0.3); ink(INK, 1.8); G.stroke();
    if (fly && Math.abs(f) > 0.8) { G.globalAlpha = 0.45; G.beginPath(); L(-hw * 1.18, -8, -hw * 1.18 - 16, -8); L(-hw * 1.2, 4, -hw * 1.2 - 10, 4); ink(INK2, 1.5); G.stroke(); G.globalAlpha = 1; }
    G.restore();
  }
  // Boss health rides just above the hull, below the escort lane; the tick marks half, where it turns angry.
  function drawBossBar() {
    var S = w.S, G = w.G; // w is the world; bw is the bar width
    var z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; });
    if (!z) return;
    var bw = 96, x = clamp(z.x, 12 + bw / 2, W - 12 - bw / 2) - bw / 2, y = z.y - z.hh - 12, f = clamp(z.hp / z.maxHp, 0, 1);
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
    w.sound.play('rush');
    emit('rush', { side: side < 0 ? 'left' : 'right', count: n });
  }

  // ---------- tanks ----------
  // From TANK.WAVE a cargo plane carries a tank on a pallet chute. Shoot the plane down first and the tank goes
  // with it. Landed, the tank rolls to TANK.STOP from the wall (just inside the barrel's dip) and lobs shells at the
  // bunker. Shells fly like bombs, so they can be shot down. Turret and rifle hits chip it (BULLET each); rockets,
  // mines, crashes and the air strike hit hard.
  var TANK = { WAVE: 9, HW: 27, HH: 13, SPEED: 13, STOP: 70, FALL: 70, SHELL_EVERY: 3.6, SHELL_DAMAGE: 8, BULLET: 0.1,
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
  function tankHit(tk, x, y, near) {
    return Math.abs(x - tk.x) < TANK.HW + near && y > tk.y - TANK.HH - 10 - near && y < tk.y + TANK.HH + near;
  }
  function damageTank(tk, dmg, owner) {
    var S = w.S;
    if (tk.dead) return;
    tk.hp -= dmg; tk.hitFlash = 0.12;
    burst(tk.x, tk.y - 4, 4, INK, 100);
    if (tk.hp > 0) { w.sound.play('clank'); return; }
    tk.dead = true; S.stats.tanks++;
    emit('tank_down', { by: owner === 'ally' ? 'crew' : 'player' });
    award(150, tk.x, tk.y - 34, 'tank down!', owner === 'ally' ? BLUE : INK, true);
    explode(tk.x, Math.min(GROUND - 6, tk.y), 40, 'wreck');
    addDecal({ kind: 'scorch', x: tk.x, y: GROUND - 3, r: 26, color: INK, a: 0.25, seed: tk.id });
  }
  function fireShell(tk) {
    var S = w.S, x = tk.x + tk.dir * 33, y = tk.y - 19, tx = BK.x + rr(-16, 16), ty = BK.top - 4, T = 0.9;
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
      if (!blocker) { tk.shellT -= dt; if (tk.shellT <= 0) { tk.shellT = TANK.SHELL_EVERY; fireShell(tk); } }
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

  // ---------- air strike ----------
  // The player's special: a friendly bomber crosses the page and lays a carpet of bombs on the field, sparing the
  // bunker and the crew. It kills troopers on and near the ground and hits tanks hard. Charges: one at the start of a
  // run, one per zeppelin downed, and more from the shop.
  var STRIKE = { SPEED: 230, Y: 92, BOMBS: 11, FALL: 520 };
  function callStrike() {
    var S = w.S;
    if (S.mode !== 'play' || S.strike || S.strikes <= 0) return false;
    S.strikes--;
    var targets = [];
    for (var i = 0; i < STRIKE.BOMBS; i++) { var x = 24 + i * (W - 48) / (STRIKE.BOMBS - 1); if (Math.abs(x - BK.x) > 46) targets.push(x); }
    S.strike = { x: -90, drops: targets, id: w.id() };
    addText('air strike!', 200, 260, BLUE, 30);
    w.sound.play('strike');
    emit('air_strike', { wave: S.wave, left: S.strikes });
    return true;
  }
  function updateStrike(dt) {
    var S = w.S, st = S.strike;
    if (st) {
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
  function drawStrike() {
    var S = w.S, G = w.G, st = S.strike;
    S.strikeBombs.forEach(function (m) {
      pen(m.id); G.save(); G.translate(m.x, m.y);
      G.beginPath(); G.ellipse(0, 0, 4, 7, 0, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
      G.beginPath(); L(-4, -6, -5, -11, 0.2); L(4, -6, 5, -11, 0.2); ink(INK, 1.6); G.stroke(); G.restore();
    });
    if (!st) return;
    pen(st.id); G.save(); G.translate(st.x, STRIKE.Y); G.scale(-0.86, 0.86);
    G.beginPath(); SP(w.BOMBER_PTS, true, 0.6); G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(47,111,220,0.12)'; G.fill(); ink(INK, 2.6); G.stroke();
    G.beginPath(); L(-16, 4, 22, 6); ink(INK, 3.4); G.stroke();
    G.beginPath(); G.arc(18, -3, 5, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
    G.beginPath(); G.arc(18, -3, 2, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
    var pl = w.boil % 2 ? 11 : 6; G.beginPath(); L(-50, -pl, -50, pl, 0.4); ink(INK, 2.3); G.stroke();
    G.restore();
  }

  return { ZEP: ZEP, zeppelinHP: zeppelinHP, spawnZeppelin: spawnZeppelin, zeppelinOnScreen: zeppelinOnScreen, planeHit: planeHit,
    updateZeppelin: updateZeppelin, hurtZeppelin: hurtZeppelin, inGondola: inGondola, zeppelinDown: zeppelinDown, drawZeppelin: drawZeppelin, drawBossBar: drawBossBar,
    RUSH: RUSH, spawnRush: spawnRush,
    TANK: TANK, tankHP: tankHP, spawnCargo: spawnCargo, updateCargo: updateCargo, tankHit: tankHit, damageTank: damageTank, updateTanks: updateTanks,
    blastTanks: blastTanks, drawTank: drawTank,
    STRIKE: STRIKE, callStrike: callStrike, updateStrike: updateStrike, drawStrike: drawStrike };
};
