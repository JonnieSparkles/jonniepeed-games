(function () {
  'use strict';

  // ---------- constants ----------
  var W = 400, H = 720, GROUND = 612;
  var BK = { x: 200, x1: 168, x2: 232, top: 576 };
  var TUR = { x: 200, y: 570 };
  var SLOTS = [154, 139, 124, 109, 246, 261, 276, 291];
  var TRAMPS = [{ x1: 22, x2: 92, y: 596, dip: 0, v: 0 }, { x1: 308, x2: 378, y: 596, dip: 0, v: 0 }];
  var SLOT_ORDER = [0, 4, 1, 5, 2, 6, 3, 7];
  // A popped trooper arriving faster than this rips through the mat. 680 only rips pops right under the planes.
  var CAPTURE_SPEED = 680;
  // Turret heat: each volley adds heat (scaled so fire-rate upgrades keep the same heat per second),
  // heat bleeds off continuously, and reaching 1 locks the gun. Each volley also costs SHOT_COST points.
  var BALANCE = { DROP_CHANCE: 0.15, PLANES_PER_WAVE: 2, FALL_PER_WAVE: 4, DROPS_PER_WAVE: 0.5, WALL_DAMAGE: 6,
    FIRE_COOLDOWN: 0.2, HEAT_PER_SHOT: 0.11, COOL_RATE: 0.22, OVERHEAT_LOCK: 1.5, SHOT_COST: 1, BOSS_HP_PER_WAVE: 8 };
  // Every BOSS_EVERY waves a zeppelin moves in (see the zeppelin section).
  var BOSS_EVERY = 5;
  var ENEMIES = {
    medic: { minWave: Infinity, cooldown: 2, spread: 0.14, hp: 3.2 },
    rifle: { minWave: 1, cooldown: 2, spread: 0.14, hp: 2.6 },
    engineer: { minWave: 1, cooldown: 2, spread: 0.14, hp: 2.6 },
    bazooka: { minWave: 2, cooldown: 4, spread: 0.03, hp: 2.6 },
    // With no crew to hit, a sniper plinks at the turret for abandonAfter seconds, then slips away unrewarded.
    sniper: { minWave: 3, cooldown: 3.2, spread: 0.025, hp: 2.6, damage: 0.9, abandonAfter: 14 }
  };
  // The barrel can tip slightly below horizontal on either side: enough to hit landers near the wall,
  // not enough to reach the far field. Angles run continuously from AIM_MIN (below left) to AIM_MAX (below right).
  var AIM_DIP = 0.3;
  var AIM_MIN = -Math.PI - AIM_DIP, AIM_MAX = AIM_DIP;
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var css = getComputedStyle(document.documentElement);
  function tok(n, f) { var v = css.getPropertyValue(n).trim(); return v || f; }
  var PAPER = tok('--paper', '#fbf8ef'), RULE = tok('--rule', '#cfdcec'), MARGIN = tok('--margin', '#e6a2a0');
  var INK = tok('--ink', '#2e2e33'), INK2 = tok('--ink-soft', '#5d5a55');
  var RED = tok('--enemy', '#c8433a'), BLUE = tok('--ally', '#2f6fdc'), HAT = tok('--hat', '#f2c230');
  var RED_FILL = 'rgba(200,67,58,0.14)', INK_FILL = 'rgba(46,46,51,0.07)', EMPTY = '#aaa395';
  var HAND = '"Schoolbell", "Comic Sans MS", "Chalkboard SE", cursive';
  var DISPLAY = '"Cabin Sketch", "Schoolbell", "Comic Sans MS", cursive';

  // Randomness comes in streams so a seed reproduces content (SPEC-005). R and rr are for cosmetic effects only.
  // RW (wave content: spawn timing, aircraft, drops, trooper types) and RS (shop offers) are reseeded every wave from
  // the run seed, so wave n is the same for a seed however earlier waves went. Each aircraft takes one draw from RW
  // to seed its own sub-stream, so shooting it early doesn't shift what follows. RC is combat (crew aim and timing).
  var R = Math.random;
  function rr(a, b) { return a + R() * (b - a); }
  var RUN = { seed: 0, force: null }, RW = Math.random, RS = Math.random, RC = Math.random;
  function between(rnd, a, b) { return a + rnd() * (b - a); }
  function mix(a, b) {
    var h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab | 0, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return (h ^ (h >>> 15)) >>> 0;
  }
  function substream(rnd) { return mulberry(Math.floor(rnd() * 4294967296)); }
  function seedRun(seed) { RUN.seed = seed >>> 0; RC = mulberry(mix(RUN.seed, 0x5eed)); }
  function seedWave(n) { RW = mulberry(mix(RUN.seed, n * 2 + 1)); RS = mulberry(mix(RUN.seed, n * 2 + 2)); }
  // The hash is &-separated tokens, e.g. #tune&seed=42. A seed there fixes every run in the session.
  function hashTokens() { return location.hash.replace(/^#/, '').split('&'); }
  function hashSeed() {
    var token = hashTokens().find(function (t) { return /^seed=\d+$/.test(t); });
    return token ? Number(token.slice(5)) : null;
  }
  // Key moments call emit. It does nothing in normal play; test harnesses attach a listener (SPEC-005).
  var emitHook = null;
  function emit(type, data) { if (emitHook) emitHook(type, data || {}); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- canvas setup ----------
  var wrap = document.getElementById('wrap'), frameEl = document.getElementById('frame'), stage = document.getElementById('stage');
  var cv = document.getElementById('game'), ctx = cv.getContext('2d');
  var bg = document.createElement('canvas'), bgx = bg.getContext('2d');
  var dc = document.createElement('canvas'), dcx = dc.getContext('2d');
  var G = ctx, K = 1;

  function fit() {
    var padding = getComputedStyle(wrap);
    var aw = Math.max(1, wrap.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight));
    var ah = Math.max(1, wrap.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom));
    var s = Math.min(aw / W, ah / H);
    // Phone canvases use CSS-pixel resolution: high DPR quadruples raster work.
    // Desktop previews retain the sharper notebook artwork.
    var dpr = matchMedia('(pointer: coarse)').matches ? 1 : Math.min(window.devicePixelRatio || 1, 2.5);
    frameEl.style.width = (W * s) + 'px';
    frameEl.style.height = (H * s) + 'px';
    stage.style.transform = 'scale(' + s + ')';
    K = s * dpr;
    [cv, bg, dc].forEach(function (c) { c.width = Math.max(1, Math.round(W * K)); c.height = Math.max(1, Math.round(H * K)); });
    bgx.setTransform(K, 0, 0, K, 0, 0);
    dcx.setTransform(K, 0, 0, K, 0, 0);
    drawPaper();
    redrawDecals();
  }

  function drawPaper() {
    var g = bgx, rnd = mulberry(7), i, y;
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(80,70,50,0.05)';
    for (i = 0; i < 260; i++) g.fillRect(rnd() * W, rnd() * H, 0.6 + rnd(), 0.6);
    g.strokeStyle = RULE; g.lineWidth = 1; g.beginPath();
    for (y = 100; y < H; y += 28) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
    g.stroke();
    g.strokeStyle = MARGIN; g.lineWidth = 1.4; g.beginPath(); g.moveTo(46.5, 0); g.lineTo(46.5, H); g.stroke();
    [150, 360].forEach(function (hy) {
      g.beginPath(); g.arc(20, hy, 7, 0, Math.PI * 2); g.fillStyle = '#e7e1d3'; g.fill();
      g.beginPath(); g.arc(20, hy, 7, Math.PI * 0.9, Math.PI * 1.9); g.strokeStyle = 'rgba(60,50,30,0.25)'; g.lineWidth = 1.5; g.stroke();
    });
    g.fillStyle = 'rgba(120,96,50,0.07)'; g.fillRect(0, GROUND, W, H - GROUND);
  }

  // persistent ink on the page
  var decals = [];
  // Stamp each new mark once. The bounded history is only replayed after resize.
  // Older marks stay in the current raster until the next resize or new run.
  function addDecal(d) { drawDecal(d); decals.push(d); if (decals.length > 500) decals.shift(); }
  function redrawDecals() { dcx.clearRect(0, 0, W, H); decals.forEach(drawDecal); }
  function drawDecal(d) {
    var g = dcx, rnd = mulberry(d.seed), i, t, r, x, y;
    g.save(); g.globalAlpha = d.a;
    if (d.kind === 'body') {
      var previous = G; G = g; drawBodyPart(d); G = previous;
    } else if (d.kind === 'splat') {
      g.fillStyle = d.color; g.beginPath();
      for (i = 0; i <= 11; i++) {
        t = i / 11 * Math.PI * 2; r = d.r * (0.6 + rnd() * 0.6);
        x = d.x + Math.cos(t) * r * 1.5; y = d.y + Math.sin(t) * r * 0.5;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.fill();
      for (i = 0; i < 6; i++) { g.beginPath(); g.arc(d.x + (rnd() - 0.5) * d.r * 4.5, d.y + (rnd() - 0.8) * d.r * 1.2, 0.8 + rnd() * 1.8, 0, Math.PI * 2); g.fill(); }
    } else {
      g.strokeStyle = d.color; g.lineWidth = 1.2; g.beginPath();
      for (i = 0; i < 40; i++) {
        t = rnd() * Math.PI * 2; r = rnd() * d.r;
        x = d.x + Math.cos(t) * r * 1.4; y = d.y + Math.sin(t) * r * 0.45;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }

  // ---------- hand-drawn pen with line boil ----------
  var boil = 0, PS = 0, PN = 0;
  function hash(a, b) {
    var h = Math.imul(a ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul((b + 0x165667b1) | 0, 0x9e3779b1 | 0);
    h ^= h >>> 15; h = Math.imul(h, 0x85ebca77 | 0); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae3d | 0); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function pen(id) { PS = (Math.imul(id | 0, 2654435761 | 0) + boil * 977) | 0; PN = 0; }
  function jt(a) { PN++; return (hash(PS, PN) - 0.5) * 2 * a; }
  function L(x1, y1, x2, y2, a) {
    if (a == null) a = 0.8;
    var ax = x1 + jt(a), ay = y1 + jt(a), bx = x2 + jt(a), by = y2 + jt(a);
    G.moveTo(ax, ay);
    G.quadraticCurveTo((ax + bx) / 2 + jt(a * 1.2), (ay + by) / 2 + jt(a * 1.2), bx, by);
  }
  function Ci(cx, cy, r, a) {
    if (a == null) a = 0.45;
    var n = Math.max(9, Math.round(r * 1.3)), s = hash(PS, ++PN) * Math.PI * 2, i, t, q, x, y;
    for (i = 0; i <= n; i++) {
      t = s + (i / n) * Math.PI * 2 * 1.07; q = r + jt(a);
      x = cx + Math.cos(t) * q; y = cy + Math.sin(t) * q;
      if (i) G.lineTo(x, y); else G.moveTo(x, y);
    }
  }
  function SP(pts, closed, a) {
    if (a == null) a = 0.7;
    var n = pts.length / 2, P = [], i, p, q;
    for (i = 0; i < n; i++) P.push([pts[i * 2] + jt(a), pts[i * 2 + 1] + jt(a)]);
    if (closed) {
      G.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
      for (i = 0; i < n; i++) { p = P[i]; q = P[(i + 1) % n]; G.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    } else {
      G.moveTo(P[0][0], P[0][1]);
      for (i = 1; i < n - 1; i++) { p = P[i]; q = P[i + 1]; G.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
      G.lineTo(P[n - 1][0], P[n - 1][1]);
    }
  }
  function ink(c, w) { G.strokeStyle = c; G.lineWidth = w; G.lineCap = 'round'; G.lineJoin = 'round'; }

  // ---------- sound and saved preferences ----------
  var sound = window.StickArmySound, best = 0;

  function load(key, def) { try { var v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  // ---------- state ----------
  var S = {}, nextId = 1;
  var keys = { left: false, right: false, fire: false };

  function reset() {
    S = {
      mode: 'title', t: 0, score: 0, wave: 0, wallHP: 100,
      heat: 0, overheat: 0,
      mods: { slots: 4, secondTramp: false, catcher: false, aim: 0, fire: 0, cool: 0, mat: 0, trench: 0, helmet: 0, hired: 0, maxHP: 100, wire: false, double: false, spread: false, flak: false, rockets: false, pierce: false, mines: false, medic: false, auto: false, stacks: {} },
      coins: 0, volleys: 0, autoCD: 0, mines: [], shop: null, delivery: null, waveStart: { kills: 0, captured: 0 },
      aim: -Math.PI / 2, recoil: 0, firing: false, fireCD: 0,
      planes: [], troopers: [], recruits: [], bullets: [], bombs: [], enemyShots: [], parts: [], texts: [],
      spawn: null, waveState: 'idle', waveTimer: 0, banner: null,
      combo: 0, comboT: 0, shake: 0, repairLevel: 0, dieT: 0, smokeT: 0,
      stats: { captured: 0, popped: 0, kills: 0, planes: 0 },
      hint: false, slotRes: {}
    };
    resizeMats(); clearInput();
    TRAMPS.forEach(function (tr) { tr.dip = 0; tr.v = 0; });
    decals.length = 0;
    redrawDecals();
  }

  function waveCfg(n) {
    var boss = n % BOSS_EVERY === 0;
    return {
      // Boss waves trade the bombers and half the planes for a zeppelin.
      planes: Math.round((4 + BALANCE.PLANES_PER_WAVE * n) * (boss ? 0.5 : 1)),
      bombers: !boss && n >= 2 ? Math.min(5, n - 1) : 0,
      boss: boss ? 1 : 0,
      bombCount: Math.min(6, 3 + Math.floor((n - 2) / 2)),
      sniperChance: n >= ENEMIES.sniper.minWave ? Math.min(0.22, 0.10 + n * 0.015) : 0,
      interval: Math.max(0.85, 2.5 - 0.24 * n),
      speed: 65 + 8 * n,
      maxDrops: Math.min(6, 2 + Math.ceil(BALANCE.DROPS_PER_WAVE * n)),
      fall: Math.min(100, 47 + BALANCE.FALL_PER_WAVE * n),
      special: n === 1 ? 0.15 : Math.min(0.45, 0.16 + 0.06 * n)
    };
  }

  function addText(s, x, y, color, size) {
    S.texts.push({ s: s, x: clamp(x, 44, W - 44), y: clamp(y, 96, GROUND - 6), color: color, size: size || 19, life: 0.95, max: 0.95, rot: rr(-0.14, 0.1), vy: -38 });
  }
  function award(base, x, y, label, color, useCombo) {
    var mult = 1;
    if (useCombo) { S.combo++; S.comboT = 1.4; mult = Math.min(S.combo, 5); }
    var pts = base * mult;
    S.score += pts;
    var tags = Math.max(1, Math.round(base / 15)) + Math.floor(mult / 3);
    S.coins += tags; flyTags(x, y, tags);
    emit('coins', { amount: tags, reason: OUCH.indexOf(label) >= 0 ? 'kill' : label.replace(/!+$/, '') });
    addText(label + ' +' + pts, x, y, mult > 1 ? BLUE : (color || INK), mult > 1 ? 22 : 19);
  }
  // S.coins is the dog-tag balance. Earned tags fly from the kill to the counter so their source is obvious.
  var TAG_HUD = { x: 290, y: 47 };
  function flyTags(x, y, n) {
    // In a big pile-up, fold new tags into one already in flight rather than drawing dozens.
    var flying = S.parts.filter(function (q) { return q.k === 'tag'; });
    if (flying.length >= 10) { flying[flying.length - 1].n += n; return; }
    S.parts.push({ k: 'tag', x0: x, y0: y, x: x, y: y, n: n, t: 0, dur: rr(0.55, 0.75), life: 1, max: 1, rot: rr(-0.6, 0.6), id: nextId++ });
  }
  function burst(x, y, n, color, speed) {
    for (var i = 0; i < n; i++) {
      var a = rr(0, Math.PI * 2), v = rr(0.4, 1) * speed;
      S.parts.push({ k: 'fleck', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, life: rr(0.3, 0.6), max: 0.6, c: color, id: nextId++ });
    }
  }
  function puff(x, y, r, life) { S.parts.push({ k: 'puff', x: x, y: y, r: r, vr: rr(14, 30), life: life, max: life, id: nextId++ }); }

  // ---------- spawning ----------
  function makePlane(kind, dir, x, y) {
    var b = kind === 'bomber';
    return { id: nextId++, kind: kind, dir: dir, x: x, y: y, speed: 0, hp: b ? 3 : 1, drops: [], bombRun: [],
      state: 'fly', rot: 0, vy: 0, smoke: 0, hitFlash: 0, sc: b ? 0.86 : 0.78, hw: b ? 44 : 30, hh: b ? 15 : 11 };
  }
  function pickDropX(rnd) {
    var tr = activeTramps();
    if (rnd() < BALANCE.DROP_CHANCE) { var mat = tr[Math.floor(rnd() * tr.length)]; return between(rnd, mat.x1 + 12, mat.x2 - 12); }
    // The remaining drops avoid mats, preserving the configured opportunity rate.
    return rnd() < 0.5 ? between(rnd, 106, 146) : (S.mods.secondTramp ? between(rnd, 254, 294) : between(rnd, 254, 382));
  }
  function activeTramps() { return S.mods.secondTramp ? TRAMPS : [TRAMPS[0]]; }
  function unlockedSlots() { return SLOT_ORDER.slice(0, S.mods.slots); }

  function spawnPlane(kind) {
    var c = S.spawn.cfg, rnd = substream(RW), dir = rnd() < 0.5 ? 1 : -1;
    // On boss waves the escort keeps to a high lane above the zeppelin.
    var p = makePlane(kind, dir, dir > 0 ? -60 : W + 60, kind === 'bomber' ? between(rnd, 104, 128) : c.boss ? between(rnd, 98, 118) : between(rnd, 98, 206));
    p.rng = rnd;
    p.speed = kind === 'bomber' ? c.speed * 0.62 : c.speed * between(rnd, 0.85, 1.25);
    if (kind === 'plane') {
      // Each drop carries its trooper, rolled now, so shooting the plane early doesn't change who jumps.
      var n = 1 + Math.floor(rnd() * c.maxDrops);
      for (var i = 0; i < n; i++) p.drops.push(pickDropX(rnd));
      p.drops.sort(function (a, b) { return dir * (a - b); });
      p.kits = p.drops.map(function () { return rollTrooper(rnd); });
    } else {
      // A spaced string covering both trenches, one crew position and the wall.
      var targets = [];
      for (var j = 0; j < c.bombCount; j++) targets.push(38 + j * 324 / (c.bombCount - 1));
      targets[Math.floor(targets.length / 2)] = BK.x;
      var crew = S.recruits.filter(function (r) { return !r.dead; });
      if (crew.length && targets.length > 3) targets[1] = crew[Math.floor(rnd() * crew.length)].x;
      p.bombRun = targets.map(function (target) {
        var floor = target > BK.x1 && target < BK.x2 ? BK.top - 8 : GROUND - 6;
        var tf = Math.sqrt(2 * (floor - (p.y + 14)) / 260);
        var vx = dir * p.speed * 0.35;
        return { x: target - vx * tf, vx: vx };
      }).sort(function (a, b) { return dir * (a.x - b.x); });
    }
    S.planes.push(p);
    emit('plane_spawn', { kind: kind, dir: dir, y: p.y, speed: p.speed, drops: p.drops.slice(), troopers: (p.kits || []).map(function (k) { return k.type; }), bombs: p.bombRun.length });
  }
  // Who jumps: type, fall-speed factor and sway phase, drawn from a content stream.
  function rollTrooper(rnd) {
    var c = S.spawn ? S.spawn.cfg : waveCfg(1), type = 'rifle';
    if (rnd() < c.sniperChance) type = 'sniper';
    else if (rnd() < c.special) type = S.wave < ENEMIES.bazooka.minWave ? 'engineer' : (rnd() < 0.5 ? 'bazooka' : 'engineer');
    return { type: type, fall: between(rnd, 0.9, 1.15), sway: rnd() * 6.28 };
  }
  function spawnTrooper(x, y, kit) {
    var c = S.spawn ? S.spawn.cfg : waveCfg(1);
    kit = kit || rollTrooper(RW);
    var t = { id: nextId++, x: clamp(x, 14, W - 14), y: y, type: kit.type, state: 'chute', open: 0,
      fall: c.fall * kit.fall, sway: kit.sway, vy: 0, rot: 0, spin: 0, dir: 1, walk: 0, thump: 0,
      attacking: null, atWall: false, shotCD: 2.2, alone: 0, aim: 0, dead: false };
    S.troopers.push(t);
    emit('trooper_spawn', { x: t.x, type: t.type });
    return t;
  }
  function makeRecruit(slot, type, id) {
    var hx = SLOTS[slot];
    return { id: id || nextId++, type: type, slot: slot, x: hx, homeX: hx, tx: hx, hp: ENEMIES[type].hp + (S.mods ? S.mods.helmet : 0), role: 'shoot',
      cd: between(RC, 0.4, 1), aim: -Math.PI / 2 + (hx < 200 ? -0.35 : 0.35), walk: 0, hurt: 0, sparkT: 0, dead: false };
  }

  // Crew health: helmets raise the maximum, trenches cut every kind of damage.
  var TRENCH = [1, 0.6, 0.4];
  function crewMax(r) { return ENEMIES[r.type].hp + S.mods.helmet; }
  function hurtRecruit(r, amount, cause) {
    if (r.dead) return;
    r.hp -= amount * TRENCH[Math.min(S.mods.trench, TRENCH.length - 1)];
    r.hurt = Math.max(r.hurt, 0.2);
    if (r.hp <= 0) recruitDie(r, cause);
  }
  // Wall bookkeeping for the event log; the last source to hurt the wall is the game-over cause.
  function hurtWall(amount, source) { S.wallHP -= amount; S.lastHit = source; emit('wall_damage', { source: source, amount: amount }); }
  function repairWall(amount, source) {
    var before = S.wallHP; S.wallHP = Math.min(S.mods.maxHP, S.wallHP + amount);
    if (S.wallHP > before) emit('wall_repair', { source: source, amount: S.wallHP - before });
  }

  // ---------- waves ----------
  function startWave(n) {
    S.wave = n; seedWave(n);
    S.waveStart = { kills: S.stats.kills, captured: S.stats.captured };
    S.mines = S.mods.mines ? [100, 133, 267, 300].map(function (x) { return { x: x, armed: true }; }) : [];
    var c = waveCfg(n);
    S.spawn = { cfg: c, planes: c.planes, bombers: c.bombers, boss: c.boss, bossT: 3.5, timer: 2.4 };
    S.waveState = 'active';
    var sub = c.boss ? 'zeppelin incoming!' : n === 1 ? 'here they come' : (n === 2 ? 'carpet bombers incoming' : n === 3 ? 'snipers! protect your crew' : '');
    S.banner = { s: 'wave ' + n, sub: sub, t: 0, dur: 2.2 };
    sound.play('bugle');
    emit('wave_start', { wave: n, boss: !!c.boss });
  }
  function updateWave(dt) {
    var sp = S.spawn;
    if (!sp) return;
    if (S.waveState === 'active') {
      sp.timer -= dt;
      if (sp.timer <= 0 && sp.planes + sp.bombers > 0) {
        var kind = 'plane';
        if (sp.bombers > 0 && (sp.planes === 0 || (sp.cfg.planes - sp.planes >= 2 && RW() < 0.35))) kind = 'bomber';
        if (kind === 'bomber') sp.bombers--; else sp.planes--;
        spawnPlane(kind);
        sp.timer = sp.cfg.interval * between(RW, 0.7, 1.3);
      }
      if (sp.boss > 0) { sp.bossT -= dt; if (sp.bossT <= 0) { sp.boss--; spawnZeppelin(); } }
      var enemies = S.troopers.some(function (t) { return !t.dead; });
      if (sp.planes + sp.bombers + (sp.boss || 0) === 0 && !S.planes.length && !S.bombs.length && !S.enemyShots.length && !enemies) {
        S.waveState = 'clear'; S.waveTimer = 2.0;
        var bonus = 100 * S.wave, waveTags = 8 + S.wave * 2; S.score += bonus; S.coins += waveTags; flyTags(200, 330, waveTags);
        emit('wave_clear', { wave: S.wave }); emit('coins', { amount: waveTags, reason: 'wave' });
        S.banner = { s: 'wave cleared!', sub: '+' + bonus + ' bonus', t: 0, dur: 1.9 };
        S.hint = false;
        sound.play('wave');
      }
    } else if (S.waveState === 'clear') {
      S.waveTimer -= dt;
      if (S.waveTimer <= 0) openShop();
    }
  }

  // ---------- field supplies: all upgrades are run-local ----------
  var ITEMS = [
    { id: 'fire', name: 'Quick trigger', desc: 'Fire 18% faster. Stacks four times.', tier: 'free', cost: 0, maxStacks: 4, apply: function (s) { s.mods.fire++; } },
    { id: 'cool', name: 'Cooling fins', desc: 'Each shot heats the gun 20% less. Stacks three times.', tier: 'free', cost: 0, maxStacks: 3, apply: function (s) { s.mods.cool++; } },
    { id: 'slot', name: 'Room for one more', desc: '+1 squad slot, up to eight.', tier: 'free', cost: 0, maxStacks: 4, apply: function (s) { s.mods.slots++; } },
    { id: 'repair', name: 'Patch the wall', desc: 'Restore 30 wall health.', tier: 'free', cost: 0, maxStacks: Infinity, apply: function () { repairWall(30, 'supply'); } },
    { id: 'mat', name: 'Bigger bounce', desc: 'Widen both trampoline frames by 12. Timing still matters!', tier: 'free', cost: 0, maxStacks: 2, apply: function (s) { s.mods.mat++; resizeMats(); } },
    { id: 'aim', name: 'Steady hands', desc: 'Recruit spread is 28% tighter.', tier: 'free', cost: 0, maxStacks: 3, apply: function (s) { s.mods.aim++; } },
    { id: 'sandbags', name: 'Sandbags', desc: '+25 maximum wall health, filled immediately.', tier: 'free', cost: 0, maxStacks: 4, apply: function (s) { s.mods.maxHP += 25; repairWall(25, 'supply'); } },
    { id: 'wire', name: 'Barbed wire', desc: 'Marching enemies walk half as fast.', tier: 'free', cost: 0, maxStacks: 1, apply: function (s) { s.mods.wire = true; } },
    { id: 'double', name: 'Double barrel', desc: 'Two parallel shots with each trigger pull.', tier: 'free', cost: 0, maxStacks: 1, apply: function (s) { s.mods.double = true; } },
    { id: 'trench', name: 'Dig in', desc: 'Your crew take 40% less damage. A second trench makes it 60%.', tier: 'free', cost: 0, maxStacks: 2, apply: function (s) { s.mods.trench++; } },
    { id: 'helmet', name: 'Helmets', desc: '+1 health for every recruit, now and later. Stacks three times.', tier: 'free', cost: 0, maxStacks: 3, apply: function (s) { s.mods.helmet++; s.recruits.forEach(function (r) { if (!r.dead) r.hp += 1; }); } },
    { id: 'stash', name: 'Rainy-day fund', desc: 'Pocket 12 dog tags toward a big purchase.', tier: 'free', cost: 0, maxStacks: Infinity, apply: function (s) { s.coins += 12; emit('coins', { amount: 12, reason: 'stash' }); } },
    { id: 'tramp', name: 'Second trampoline', desc: 'Open the right-hand mat. Twice the places to catch.', tier: 'premium', cost: 45, maxStacks: 1, apply: function (s) { s.mods.secondTramp = true; } },
    { id: 'spread', name: 'Spread shot', desc: 'Add two angled shots to every volley.', tier: 'premium', cost: 65, maxStacks: 1, apply: function (s) { s.mods.spread = true; } },
    { id: 'flak', name: 'Flak rounds', desc: 'Rounds burst near planes and bombs. Paratroopers are left to you.', tier: 'premium', cost: 80, maxStacks: 1, apply: function (s) { s.mods.flak = true; } },
    { id: 'rockets', name: 'Rocket rack', desc: 'Launch a bonus explosive rocket every fourth volley.', tier: 'premium', cost: 95, maxStacks: 1, apply: function (s) { s.mods.rockets = true; } },
    { id: 'pierce', name: 'Piercing rounds', desc: 'Each bullet passes through up to three targets.', tier: 'premium', cost: 70, maxStacks: 1, apply: function (s) { s.mods.pierce = true; } },
    { id: 'mines', name: 'Minefield', desc: 'Plant four mines every wave. Blasts spare your crew.', tier: 'premium', cost: 45, maxStacks: 1, apply: function (s) { s.mods.mines = true; } },
    { id: 'medic', name: 'Medic recruit', desc: 'Fill a free squad slot with a medic who heals nearby crew.', tier: 'premium', cost: 55, maxStacks: Infinity,
      available: function () { return freeSlot(0) >= 0 && !S.recruits.some(function (r) { return !r.dead && r.type === 'medic'; }); },
      apply: function (s) { s.mods.medic = true; s.recruits.push(makeRecruit(freeSlot(0), 'medic')); } },
    { id: 'auto', name: 'Sentry doodle', desc: 'A small auto-turret shoots bombs and low-flying enemies.', tier: 'premium', cost: 100, maxStacks: 1, apply: function (s) { s.mods.auto = true; } },
    { id: 'catcher', name: 'Catcher training', desc: 'Rifle recruits aim for low chutes over an open mat.', tier: 'premium', cost: 60, maxStacks: 1, apply: function (s) { s.mods.catcher = true; } },
    { id: 'hire', name: 'Hire a rifleman', desc: 'A rifleman joins a free squad slot. Each hire costs more.', tier: 'premium', maxStacks: Infinity,
      cost: function () { return 35 + 15 * S.mods.hired; },
      available: function () { return freeSlot(0) >= 0; },
      apply: function (s) { s.mods.hired++; s.recruits.push(makeRecruit(freeSlot(0), 'rifle')); } },
    { id: 'pizza', name: 'Order a pizza', desc: 'A courier brings +25 wall health and +1 health per recruit.', tier: 'premium', cost: 25, maxStacks: Infinity, apply: function () { orderPizza(); } }
  ];
  function resizeMats() {
    TRAMPS[0].x1 = 22 - S.mods.mat * 6; TRAMPS[0].x2 = 92 + S.mods.mat * 6;
    TRAMPS[1].x1 = 308 - S.mods.mat * 6; TRAMPS[1].x2 = 378 + S.mods.mat * 6;
  }
  function price(item) { return typeof item.cost === 'function' ? item.cost() : item.cost; }
  function eligible(item) { return (S.mods.stacks[item.id] || 0) < item.maxStacks && (!item.available || item.available()); }
  // Offers walk a seeded shuffle of the whole tier and take the first eligible items, so for a given seed
  // the offers change only when eligibility does.
  function offer(tier, n, skip) {
    var order = ITEMS.filter(function (it) { return it.tier === tier && skip.indexOf(it.id) < 0; }), i, j, tmp;
    for (i = order.length - 1; i > 0; i--) { j = Math.floor(RS() * (i + 1)); tmp = order[i]; order[i] = order[j]; order[j] = tmp; }
    return order.filter(eligible).slice(0, n);
  }
  function openShop() {
    S.mode = 'shop'; S.waveState = 'shop'; clearInput(); S.bullets = []; S.banner = null;
    var premiums = offer('premium', 1, ['pizza', 'hire']);
    // Pizza is always orderable, and hiring whenever a slot is free; the third offer rotates so saving has a purpose.
    var hire = ITEMS.find(function (it) { return it.id === 'hire'; });
    if (eligible(hire)) premiums.push(hire);
    premiums.push(ITEMS.find(function (it) { return it.id === 'pizza'; }));
    S.shop = { free: offer('free', 2, []), premium: premiums, freeTaken: false, bought: {} };
    emit('shop_offer', { wave: S.wave, free: S.shop.free.map(function (it) { return it.id; }), premium: premiums.map(function (it) { return it.id; }) });
    shopScreen.hidden = false; pauseBtn.hidden = true; renderShop();
    sound.play('shop');
    shopScreen.querySelector('button:not(:disabled)').focus({ preventScroll: true });
  }
  function takeItem(id) {
    if (S.mode !== 'shop' || !S.shop) return false;
    var item = S.shop.free.concat(S.shop.premium).find(function (it) { return it.id === id; });
    if (!item || S.shop.bought[id] || !eligible(item)) return false;
    if (item.tier === 'free' ? S.shop.freeTaken : S.coins < price(item)) return false;
    if (item.tier === 'free') S.shop.freeTaken = true; else S.coins -= price(item);
    emit('purchase', { item: id, tier: item.tier, cost: item.tier === 'free' ? 0 : price(item) });
    S.shop.bought[id] = true; S.mods.stacks[id] = (S.mods.stacks[id] || 0) + 1; item.apply(S);
    sound.play('recruit'); renderShop();
    if (S.mode === 'shop') { var next = S.shop.freeTaken ? document.getElementById('continueBtn') : shopScreen.querySelector('button:not(:disabled)'); next.focus({ preventScroll: true }); }
    return true;
  }
  // Pencil icons for supplies live in icons.js; they draw with this file's pen.
  var ICONS = StickArmyIcons({ L: L, SP: SP, Ci: Ci, ink: ink, stick: stick, dogTag: dogTag,
    INK: INK, INK2: INK2, RED: RED, BLUE: BLUE, HAT: HAT, PAPER: PAPER });
  function drawItemIcon(canvas, id) {
    var g = canvas.getContext('2d'), previous = G, keepBoil = boil, k = canvas.width / 44;
    G = g; boil = 0;
    g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 44, 44);
    pen(id.length * 131 + id.charCodeAt(0));
    try { (ICONS[id] || ICONS.fallback)(g); } finally { G = previous; boil = keepBoil; }
  }
  function renderShop() {
    document.getElementById('shopWave').textContent = 'Wave ' + S.wave + ' survived';
    document.getElementById('shopCoins').textContent = S.coins + ' dog tags';
    document.getElementById('shopReport').textContent = (S.stats.kills - S.waveStart.kills) + ' down · ' + (S.stats.captured - S.waveStart.captured) + ' recruited · wall ' + Math.ceil(S.wallHP) + '/' + S.mods.maxHP;
    document.getElementById('shopHint').textContent = S.shop.freeTaken ? 'Packed! Spend dog tags on something extra, or save them.' : 'Take one free supply, then spend dog tags if you like.';
    ['free', 'premium'].forEach(function (tier) {
      var holder = document.getElementById(tier + 'Items'); holder.replaceChildren();
      S.shop[tier].forEach(function (it) {
        var button = document.createElement('button'); button.type = 'button'; button.className = 'supply'; button.dataset.item = it.id;
        var bought = !!S.shop.bought[it.id];
        var cost = price(it);
        button.disabled = bought || !eligible(it) || (tier === 'free' ? S.shop.freeTaken : S.coins < cost);
        var name = document.createElement('strong'); name.textContent = it.name;
        var desc = document.createElement('span'); desc.textContent = it.desc;
        var label = document.createElement('em'); label.textContent = bought ? 'Packed ✓' : tier === 'free' ? 'Take it free' : cost + ' tags' + (S.coins < cost ? ' · need ' + (cost - S.coins) + ' more' : '');
        var head = document.createElement('span'); head.className = 'supply-head';
        var icon = document.createElement('canvas'); icon.className = 'supply-icon'; icon.width = icon.height = 132; icon.setAttribute('aria-hidden', 'true');
        drawItemIcon(icon, it.id); head.append(icon, name);
        button.append(head, desc, label); button.addEventListener('click', function () { takeItem(it.id); }); holder.append(button);
      });
    });
    var equipped = ITEMS.filter(function (it) { return S.mods.stacks[it.id] && it.maxStacks !== Infinity; });
    document.getElementById('loadout').textContent = equipped.length ? 'In your kit: ' + equipped.map(function (it) { return it.name + (S.mods.stacks[it.id] > 1 ? ' ×' + S.mods.stacks[it.id] : ''); }).join(' · ') : 'A fresh page. Make it yours.';
    if (S.shop.freeTaken) {
      var stock = shopScreen.querySelector('.shop-stock'), extras = document.getElementById('premiumItems').parentElement;
      stock.scrollTop += extras.getBoundingClientRect().top - stock.getBoundingClientRect().top;
    }
    document.getElementById('continueBtn').disabled = !S.shop.freeTaken;
    document.getElementById('continueBtn').textContent = S.shop.freeTaken ? 'Wave ' + (S.wave + 1) + ' →' : 'Pick one first';
  }
  function continueWave() {
    if (S.mode !== 'shop' || !S.shop.freeTaken) return;
    shopScreen.hidden = true; S.shop = null; clearInput(); S.mode = 'play'; pauseBtn.hidden = false; startWave(S.wave + 1);
    document.activeElement.blur();
  }
  function orderPizza() {
    S.mode = 'delivery'; shopScreen.hidden = true; clearInput();
    S.delivery = { x: -30, phase: 'arrive', wait: 0 };
    S.banner = { s: 'special delivery!', sub: 'one large morale boost', t: 0, dur: 4.8 };
  }
  function updateDelivery(dt) {
    var d = S.delivery;
    S.t += dt;
    if (S.banner) { S.banner.t += dt; if (S.banner.t >= S.banner.dur) S.banner = null; }
    if (d.phase === 'arrive') {
      d.x = Math.min(200, d.x + dt * 145);
      if (d.x === 200) {
        d.phase = 'serve'; d.wait = 1.2; repairWall(25, 'pizza'); emit('pizza', { wave: S.wave });
        S.recruits.forEach(function (r) { if (!r.dead) r.hp = Math.min(crewMax(r), r.hp + 1); });
        sound.play('pizza'); addText('pizza time!', 200, GROUND - 65, BLUE, 26);
      }
    } else if (d.phase === 'serve') { d.wait -= dt; if (d.wait <= 0) d.phase = 'leave'; }
    else {
      d.x += dt * 145;
      if (d.x > W + 35) {
        S.delivery = null; S.banner = null; S.mode = 'shop'; shopScreen.hidden = false; renderShop();
        shopScreen.querySelector('button:not(:disabled)').focus({ preventScroll: true });
      }
    }
    updateParts(dt);
  }
  function drawCourier() {
    var d = S.delivery; if (!d) return;
    var x = d.x, y = GROUND - 17; pen(8080);
    G.beginPath(); Ci(x - 13, y + 12, 8); Ci(x + 16, y + 12, 8); ink(INK, 2.3); G.stroke();
    G.beginPath(); SP([x - 13,y + 12,x - 5,y - 4,x + 9,y + 12,x - 13,y + 12],false); L(x - 5,y - 4,x + 11,y - 4); L(x + 11,y - 8,x + 16,y + 12); ink(BLUE,2.4); G.stroke();
    stick(x - 5, y - 30, [7,17,18,17,3,33,-5,29], INK, 2.3);
    G.beginPath(); L(x - 12,y - 34,x + 2,y - 34); ink(RED,4); G.stroke();
    var bx = d.phase === 'serve' ? x + 26 : x - 27, by = d.phase === 'serve' ? y - 28 : y - 9;
    if (d.phase !== 'leave') {
      G.fillStyle=PAPER; G.fillRect(bx-10,by-5,22,9); G.beginPath(); L(bx-10,by-5,bx+12,by-5,0.3); L(bx+12,by-5,bx+12,by+4,0.3); L(bx+12,by+4,bx-10,by+4,0.3); L(bx-10,by+4,bx-10,by-5,0.3); ink(RED,1.7); G.stroke();
      G.beginPath(); Ci(bx,by,2); ink(RED,1.2); G.stroke();
    }
  }

  // ---------- combat ----------
  function shoot() {
    var c = Math.cos(S.aim), s = Math.sin(S.aim);
    S.volleys++;
    var angles = S.mods.spread ? [-0.13, 0, 0.13] : [0];
    angles.forEach(function (offset) {
      var a = S.aim + offset, ca = Math.cos(a), sa = Math.sin(a);
      (S.mods.double ? [-4, 4] : [0]).forEach(function (side) {
        S.bullets.push({ x: TUR.x + ca * 30 - sa * side, y: TUR.y + sa * 30 + ca * side, vx: ca * 700, vy: sa * 700,
          owner: 'player', kind: 'bullet', flak: S.mods.flak, pierce: S.mods.pierce ? 3 : 1, hits: [], life: 1.3, dead: false });
      });
    });
    if (S.mods.rockets && S.volleys % 4 === 0) {
      S.bullets.push({ x: TUR.x + c * 32, y: TUR.y + s * 32, vx: c * 360, vy: s * 360, owner: 'player', kind: 'rocket', life: 2, dead: false }); sound.play('rocket');
    }
    S.parts.push({ k: 'star', x: TUR.x + c * 34, y: TUR.y + s * 34, life: 0.07, max: 0.07, id: nextId++ });
    S.recoil = 1;
    sound.play('shoot');
  }
  // One trigger pull: costs points, adds heat, and locks the gun when it boils over.
  function fireVolley() {
    shoot();
    var rate = Math.pow(0.82, S.mods.fire);
    S.fireCD = BALANCE.FIRE_COOLDOWN * rate;
    S.heat += BALANCE.HEAT_PER_SHOT * rate * Math.pow(0.8, S.mods.cool);
    S.score = Math.max(0, S.score - BALANCE.SHOT_COST);
    if (S.heat >= 1) triggerOverheat();
  }
  function triggerOverheat() {
    if (S.overheat > 0) return;
    S.heat = 1; S.overheat = BALANCE.OVERHEAT_LOCK;
    addText('too hot!', TUR.x, TUR.y - 52, RED, 23);
    sound.play('overheat');
  }
  function updateHeat(dt) {
    if (S.overheat > 0) {
      // While locked, the barrel cools to a usable level by the time it unlocks.
      S.overheat -= dt;
      S.heat = Math.max(0.35, S.heat - 0.65 / Math.max(0.1, BALANCE.OVERHEAT_LOCK) * dt);
      if (R() < dt * 9) { var c = Math.cos(S.aim), s = Math.sin(S.aim); puff(TUR.x + c * 30, TUR.y + s * 30, 2, 0.6); }
      if (S.overheat <= 0) { S.overheat = 0; sound.play('ready'); }
    } else {
      S.heat = Math.max(0, S.heat - BALANCE.COOL_RATE * dt);
    }
  }
  function killFx(t, force, squash, color) {
    var power = force || 170, y = squash ? GROUND - 5 : t.y + 12, c = color || RED, i;
    burst(t.x, y, 14, c, power);
    // Permanent ink only near the ground. Midair hits leave a spatter that fades in about a second.
    if (y > GROUND - 40) addDecal({ kind: 'splat', x: t.x, y: y, r: squash ? 11 : 4, color: c, a: 0.48, seed: nextId++ });
    else for (i = 0; i < 6; i++) S.parts.push({ k: 'spatter', x: t.x + rr(-6, 6), y: y + rr(-6, 6), vx: rr(-30, 30), vy: rr(-20, 30), r: rr(1.2, 3), life: rr(0.6, 1.1), max: 1.1, c: c, id: nextId++ });
    // Six separate pen strokes: head, torso, two arms, two legs.
    [0, 1, 2, 3, 4, 5].forEach(function (part) {
      S.parts.push({ k: 'body', head: part === 0, len: part === 1 ? 16 : 12,
        x: t.x + rr(-4, 4), y: squash ? GROUND - 6 : t.y + (part === 0 ? 0 : part < 4 ? 12 : 26),
        vx: rr(-power, power), vy: -rr(50, power * 1.5), rot: rr(-3, 3), vr: rr(-10, 10),
        life: 8, max: 8, rest: 0, c: c, id: nextId++ });
    });
  }
  function drawBodyPart(q) {
    pen(q.id || q.seed); G.save(); G.translate(q.x, q.y); G.rotate(q.rot);
    G.beginPath(); if (q.head) Ci(0, 0, 4.5); else L(-q.len / 2, 0, q.len / 2, 0, 0.35);
    ink(q.c || RED, 2.3); G.stroke(); G.restore();
  }
  // Paratrooper rule: a trooper falling without a chute squashes any enemy he lands on.
  function crush(t) {
    var squashed = 0;
    S.troopers.forEach(function (g) {
      if (g === t || g.dead || g.state !== 'ground' || Math.abs(g.x - t.x) > 13) return;
      g.dead = true; squashed++; S.stats.kills++;
      emit('kill', { by: 'squash', type: g.type });
      killFx(g, 230, true);
      award(30, g.x, GROUND - 74, 'squashed!', INK, true);
    });
    if (squashed) { sound.play('squash'); S.shake = Math.max(S.shake, 0.2); }
    return squashed;
  }
  var OUCH = ['ow!', 'oof!', 'argh!', 'yikes!', 'eep!'];
  function killTrooper(t, owner) {
    t.dead = true; killFx(t); S.stats.kills++;
    emit('kill', { by: owner === 'ally' ? 'crew' : 'player', type: t.type, state: t.state });
    if (t.state === 'ground') addDecal({ kind: 'splat', x: t.x, y: GROUND - 1, r: 9, color: RED, a: 0.45, seed: t.id });
    award(10, t.x, t.y - 6, OUCH[t.id % OUCH.length], owner === 'ally' ? BLUE : INK, true);
    sound.play('hit');
  }
  function popChute(t) {
    t.state = 'free'; t.vy = Math.max(30, t.fall * 0.5); t.spin = rr(-2.5, 2.5);
    for (var i = 0; i < 4; i++) S.parts.push({ k: 'shred', x: t.x + rr(-16, 16), y: t.y - 30 + rr(-6, 6), vx: rr(-50, 50), vy: rr(-40, 10), rot: rr(0, 6), vr: rr(-6, 6), life: rr(0.7, 1.1), max: 1.1, id: nextId++ });
    addText('pop!', t.x + 16, t.y - 34, RED, 18);
    S.stats.popped++;
    emit('chute_pop', { x: t.x, y: t.y, overMat: activeTramps().some(function (m) { return t.x >= m.x1 + 4 && t.x <= m.x2 - 4; }) });
    sound.play('pop');
  }
  function splat(t, ripped) {
    t.dead = true; S.stats.kills++;
    emit(ripped ? 'rip' : 'splat', { x: t.x, type: t.type });
    addDecal({ kind: 'splat', x: t.x, y: GROUND - 1, r: 13, color: RED, a: 0.5, seed: t.id });
    killFx(t, 210, true);
    award(15, t.x, GROUND - 44, 'splat!', RED, true);
    sound.play('splat');
  }
  function freeSlot(side) {
    var order = side === 0 ? [0, 1, 2, 3, 4, 5, 6, 7] : [4, 5, 6, 7, 0, 1, 2, 3];
    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      if (unlockedSlots().indexOf(s) < 0 || S.slotRes[s]) continue;
      if (S.recruits.some(function (r) { return !r.dead && r.slot === s; })) continue;
      return s;
    }
    return -1;
  }
  function slotsAvailable() { return freeSlot(0) >= 0; }
  function bounce(t, tr) {
    tr.v += 180;
    addText('boing!', t.x, tr.y - 20, INK, 21);
    sound.play('boing');
    var slot = freeSlot(tr.x1 < 200 ? 0 : 1);
    t.state = 'bounce'; t.bt = 0; t.bdur = 0.85; t.x0 = t.x; t.y0 = tr.y - 33; t.slot = slot;
    if (slot >= 0) { S.slotRes[slot] = true; t.x1 = SLOTS[slot]; t.y1 = GROUND - 33; t.bh = 120; }
    else { t.x1 = BK.x; t.y1 = BK.top - 30; t.bh = 140; }
    t.spinDir = t.x1 > t.x0 ? 1 : -1;
  }
  function becomeRecruit(t) {
    t.dead = true;
    if (t.slot >= 0) {
      delete S.slotRes[t.slot];
      var r = makeRecruit(t.slot, t.type, t.id);
      S.recruits.push(r);
      S.parts.push({ k: 'ring', x: r.x, y: GROUND - 18, life: 0.5, max: 0.5, id: nextId++ });
      burst(r.x, GROUND - 20, 8, BLUE, 140);
      S.stats.captured++;
      emit('capture', { type: t.type, slot: t.slot });
      var label = t.type === 'engineer' ? 'engineer joined!' : t.type === 'bazooka' ? 'bazooka joined!' : 'recruit!';
      award(25, r.x, GROUND - 64, label, BLUE, true);
      sound.play('recruit');
      if (S.recruits.filter(function (q) { return !q.dead; }).length === S.mods.slots) addText('squad full!', 200, 520, BLUE, 24);
      S.hint = false;
    } else {
      emit('capture', { type: t.type, full: true });
      award(60, BK.x, BK.top - 44, 'squad full!', BLUE, true);
      sound.play('recruit');
    }
  }
  function land(t) {
    t.state = 'ground'; t.y = GROUND - 33; t.dir = t.x < 200 ? 1 : -1; t.walk = 0;
    emit('land', { x: t.x, type: t.type });
    S.parts.push({ k: 'deflate', x: t.x - t.dir * 14, y: GROUND - 2, life: 1.6, max: 1.6, dir: t.dir, id: nextId++ });
    sound.play('thud');
  }
  function recruitDie(r, cause) {
    if (r.dead) return;
    r.dead = true;
    emit('recruit_lost', { type: r.type, cause: cause || 'unknown' });
    addText('noo!', r.x, GROUND - 52, BLUE, 20);
    killFx({ x: r.x, y: GROUND - 33 }, 190, false, BLUE);
    addDecal({ kind: 'splat', x: r.x, y: GROUND - 1, r: 4, color: BLUE, a: 0.22, seed: r.id + 99 });
    sound.play('noo');
  }
  function damagePlane(p, dmg, owner, hx, hy) {
    if (p.state !== 'fly') return;
    if (p.kind === 'zeppelin') { hurtZeppelin(p, dmg, owner, hx, hy); return; }
    p.hp -= dmg; p.hitFlash = 0.15;
    burst(p.x, p.y, 4, INK, 120);
    if (p.hp <= 0) {
      p.state = 'fall'; p.vy = -20; p.rot = 0; p.smoke = 0;
      S.stats.planes++;
      emit('plane_down', { kind: p.kind, by: owner === 'ally' ? 'crew' : 'player' });
      award(p.kind === 'bomber' ? 120 : 50, p.x, p.y + 26, p.kind === 'bomber' ? 'bomber down!' : 'kaboom!', owner === 'ally' ? BLUE : INK, true);
      S.shake = Math.max(S.shake, 0.25);
      sound.play('boom');
      p.drops.forEach(function (x, i) { spawnTrooper(p.x + between(p.rng, -16, 16), p.y + 10, p.kits[i]); });
      p.drops = []; p.kits = [];
    } else {
      addText('clank!', p.x, p.y - 18, INK2, 16);
      sound.play('clank');
    }
  }
  function explode(x, y, r, kind, owner) {
    for (var i = 0; i < 7; i++) puff(x + rr(-r, r) * 0.4, y + rr(-r, r) * 0.3, rr(3, 7), rr(0.4, 0.7));
    burst(x, y, 10, INK, 220);
    S.shake = Math.max(S.shake, kind === 'bomb' || kind === 'final' ? 0.55 : kind === 'crash' ? 0.35 : 0.15);
    if (y > GROUND - 30) addDecal({ kind: 'scorch', x: x, y: GROUND - 3, r: r * 0.55, color: INK, a: 0.2, seed: nextId++ });
    var col = kind === 'rocket' ? BLUE : INK;
    S.troopers.forEach(function (t) {
      if (!t.dead && t.state !== 'bounce' && !(owner === 'player' && t.type === 'sniper' && t.state === 'ground') && Math.hypot(t.x - x, t.y + 14 - y) < r) {
        t.dead = true; killFx(t, kind === 'bomb' || kind === 'crash' ? 320 : 240); S.stats.kills++;
        emit('kill', { by: kind === 'crash' ? 'crash' : 'explosion', source: kind, type: t.type });
        award(10, t.x, t.y - 4, 'boom!', col, true);
      }
    });
    if (kind === 'bomb') {
      if (Math.abs(x - BK.x) < 48) { hurtWall(18, 'bomb'); addText('wall -18', BK.x, BK.top - 36, RED, 20); }
      // A direct hit still kills a bare recruit; near misses wound. Helmets and trenches help.
      S.recruits.forEach(function (q) { var d = Math.abs(q.x - x); if (!q.dead && d < 34) hurtRecruit(q, 3.2 * (1 - d / 34) + 0.4, 'bomb'); });
    }
    if (kind === 'rocket' || kind === 'flak') {
      S.planes.forEach(function (p) { if (p.state === 'fly' && Math.abs(p.x - x) < r + p.hw && Math.abs(p.y - y) < r + p.hh) damagePlane(p, kind === 'rocket' ? 3 : 1, owner || 'ally', x, y); });
      S.bombs.forEach(function (m) { if (!m.dead && Math.hypot(m.x-x,m.y-y) < r + 8) { m.dead=true; emit('bomb_intercepted', { by: owner === 'player' ? 'player' : 'crew' }); award(20,m.x,m.y-12,'bomb popped!',BLUE,true); puff(m.x,m.y,8,0.4); } });
    }
    sound.play(kind === 'rocket' || kind === 'air' ? 'hit' : 'boom');
  }

  function consumeBullet(b, target) {
    b.hits = b.hits || []; b.hits.push(target.id);
    b.pierce = (b.pierce || 1) - 1; b.dead = b.pierce <= 0;
  }
  function projectileBurst(b) {
    if (b.kind !== 'rocket' && !b.flak) return false;
    b.dead = true; explode(b.x, b.y, b.kind === 'rocket' ? 34 : 24, b.kind === 'rocket' ? 'rocket' : 'flak', b.owner); return true;
  }
  function hitTest(b) {
    var i, p, m, t, seen = b.hits || [], near = b.flak ? 14 : 0;
    for (i = 0; i < S.planes.length; i++) {
      p = S.planes[i];
      if (seen.indexOf(p.id) >= 0) continue;
      if (p.state === 'fly' && planeHit(p, b.x, b.y, near)) {
        if (!projectileBurst(b)) { damagePlane(p, 1, b.owner, b.x, b.y); consumeBullet(b, p); }
        return;
      }
    }
    for (i = 0; i < S.bombs.length; i++) {
      m = S.bombs[i];
      if (seen.indexOf(m.id) >= 0) continue;
      if (!m.dead && Math.hypot(b.x - m.x, b.y - m.y) < 9 + near) {
        m.dead = true; emit('bomb_intercepted', { by: b.owner === 'ally' ? 'crew' : 'player' });
        award(20, m.x, m.y - 12, 'bomb popped!', b.owner === 'ally' ? BLUE : INK, true);
        if (!projectileBurst(b)) { consumeBullet(b, m); explode(m.x, m.y, 26, 'air', b.owner); }
        return;
      }
    }
    for (i = 0; i < S.troopers.length; i++) {
      t = S.troopers[i];
      if (t.dead || t.state === 'bounce' || seen.indexOf(t.id) >= 0) continue;
      // The trench edge is below the player's firing arc. Crew must handle snipers.
      if (b.owner === 'player' && t.type === 'sniper' && t.state === 'ground') continue;
      if (Math.abs(b.x - t.x) < 7 && b.y > t.y - 7 && b.y < t.y + 34) {
        if (!projectileBurst(b)) { killTrooper(t, b.owner); consumeBullet(b, t); }
        return;
      }
      if (t.state === 'chute' && t.open > 0.6) {
        var dx = (b.x - t.x) / 23, dy = (b.y - (t.y - 22)) / 21;
        if (dy < 0.15 && dy > -1 && dx * dx + dy * dy < 1) {
          if (!projectileBurst(b)) { popChute(t); consumeBullet(b, t); }
          return;
        }
      }
    }
  }

  // ---------- recruit brains ----------
  function pickTarget(r) {
    var ox = r.x, oy = GROUND - 23, best = null, bd = 1e9;
    S.troopers.forEach(function (t) {
      if (t.dead || t.state !== 'ground') return;
      var d = Math.abs(t.x - ox);
      if (d < 240 && d < bd) { bd = d; best = t; }
    });
    if (best) return best;
    S.bombs.forEach(function (m) {
      if (m.dead || m.y < 250) return;
      var d = Math.hypot(m.x - ox, m.y - oy);
      if (d < 320 && d < bd) { bd = d; best = m; }
    });
    if (best) return best;
    if (r.type === 'bazooka') {
      S.planes.forEach(function (p) {
        if (p.state !== 'fly' || p.x < 10 || p.x > W - 10) return;
        var d = Math.hypot(p.x - ox, p.y - oy);
        if (d < bd) { bd = d; best = p; }
      });
      if (best) return best;
    }
    S.troopers.forEach(function (t) {
      if (t.dead || t.state !== 'chute' || t.open < 1 || t.y < 380) return;
      var d = Math.hypot(t.x - ox, t.y - oy);
      if (d < 340 && d < bd) { bd = d; best = t; }
    });
    if (best) return best;
    // Nothing closer to deal with: everyone plinks at the zeppelin.
    return S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly' && zeppelinOnScreen(p); }) || null;
  }
  function aimPoint(r, tg) {
    var x, y, vx = 0, vy = 0, sp = r.type === 'bazooka' ? 300 : 520;
    if (tg.kind === 'plane' || tg.kind === 'bomber') { x = tg.x; y = tg.y; vx = tg.dir * tg.speed; }
    else if (tg.kind === 'zeppelin') { x = tg.x; y = tg.y; vx = tg.face * tg.speed; }
    else if (tg.isBomb) { x = tg.x; y = tg.y; vx = tg.vx; vy = tg.vy; }
    else if (tg.state === 'ground') { x = tg.x; y = tg.y + 14; vx = (tg.type === 'sniper' || tg.atWall || tg.attacking) ? 0 : tg.dir * 22 * (S.mods.wire ? 0.5 : 1); }
    else {
      x = tg.x; y = tg.y + 12; vy = tg.fall;
      if (S.mods.catcher && r.type !== 'bazooka' && slotsAvailable() && tg.y > 475) {
        var over = activeTramps().some(function (q) { return tg.x > q.x1 + 8 && tg.x < q.x2 - 8; });
        if (over) { y = tg.y - 28; x = tg.x + (r.x > tg.x ? 15 : -15); }
      }
    }
    var tt = Math.hypot(x - r.x, y - (GROUND - 23)) / sp;
    return { x: x + vx * tt, y: y + vy * tt };
  }
  function fireRecruit(r, ang) {
    var baz = r.type === 'bazooka', a = ang + (RC() * 2 - 1) * ENEMIES[r.type].spread * Math.pow(0.72, S.mods.aim), sp = baz ? 300 : 520;
    S.bullets.push({ x: r.x + Math.cos(a) * 16, y: GROUND - 23 + Math.sin(a) * 16, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      owner: 'ally', kind: baz ? 'rocket' : 'bullet', life: 1.6, dead: false });
    sound.play(baz ? 'rocket' : 'ally');
  }
  function updateRecruits(dt) {
    var hp = S.wallHP / S.mods.maxHP * 100;
    var lvl = hp < 15 ? 3 : hp < 40 ? 2 : hp < 70 ? 1 : 0, exitAt = [0, 85, 55, 30];
    if (lvl > S.repairLevel) S.repairLevel = lvl;
    else if (lvl < S.repairLevel && hp >= exitAt[S.repairLevel]) S.repairLevel = lvl;
    var live = S.recruits.filter(function (r) { return !r.dead; });
    var byNear = function (a, b) { return Math.abs(a.homeX - 200) - Math.abs(b.homeX - 200); };
    var eng = live.filter(function (r) { return r.type === 'engineer'; });
    var oth = live.filter(function (r) { return r.type !== 'engineer' && r.type !== 'medic'; }).sort(byNear);
    var need = S.repairLevel === 3 ? oth.length : Math.max(0, S.repairLevel - eng.length);
    oth.forEach(function (r, i) { r.role = i < need ? 'repair' : 'shoot'; });
    eng.forEach(function (r) { r.role = hp < 99.5 ? 'repair' : 'idle'; });
    live.filter(function (r) { return r.type === 'medic'; }).forEach(function (r) { r.role = 'heal'; });
    var stack = [0, 0];
    live.slice().sort(byNear).forEach(function (r) {
      var side = r.homeX < 200 ? 0 : 1;
      if (r.role === 'repair') { r.tx = side === 0 ? BK.x1 - 7 - stack[0] * 10 : BK.x2 + 7 + stack[1] * 10; stack[side]++; }
      else r.tx = r.homeX;
    });
    live.forEach(function (r) {
      r.hurt = Math.max(0, r.hurt - dt);
      var d = r.tx - r.x;
      if (Math.abs(d) > 0.8) { r.x += Math.sign(d) * Math.min(Math.abs(d), 48 * dt); r.walk += dt * 12; return; }
      r.x = r.tx;
      if (r.role === 'repair') {
        if (S.wallHP < S.mods.maxHP && S.mode === 'play') {
          repairWall((r.type === 'engineer' ? 6 : 3) * dt, 'crew');
          r.sparkT -= dt;
          if (r.sparkT <= 0) {
            r.sparkT = 0.42;
            var sd = r.homeX < 200 ? 1 : -1;
            S.parts.push({ k: 'tink', x: r.x + sd * 11, y: GROUND - 25 + rr(-4, 4), life: 0.22, max: 0.22, c: HAT, id: nextId++ });
            sound.play('tink');
          }
        }
      } else if (r.role === 'heal') {
        r.cd -= dt;
        var patient = live.filter(function (q) { return q !== r && q.hp < crewMax(q) && Math.abs(q.x - r.x) < 160; }).sort(function (a, b) { return a.hp - b.hp; })[0];
        if (patient && r.cd <= 0) { patient.hp = Math.min(crewMax(patient), patient.hp + 0.45); r.cd = 2; addText('+', patient.x, GROUND - 44, BLUE, 20); }
      } else if (r.role === 'shoot') {
        var tg = pickTarget(r);
        r.cd -= dt;
        if (tg) {
          var ap = aimPoint(r, tg), want = Math.atan2(ap.y - (GROUND - 23), ap.x - r.x);
          r.aim += angDiff(want, r.aim) * Math.min(1, dt * 10);
          if (r.cd <= 0) { fireRecruit(r, want); r.cd = ENEMIES[r.type].cooldown + between(RC, 0, 0.3); }
        } else r.cd = Math.max(r.cd, 0.2);
      }
    });
  }

  // ---------- update ----------
  function updatePlanes(dt) {
    for (var i = S.planes.length - 1; i >= 0; i--) {
      var p = S.planes[i];
      if (p.kind === 'zeppelin') { updateZeppelin(p, dt); if (p.gone) S.planes.splice(i, 1); continue; }
      p.hitFlash = Math.max(0, p.hitFlash - dt);
      if (p.state === 'fly') {
        p.x += p.dir * p.speed * dt;
        while (p.drops.length && (p.dir > 0 ? p.x >= p.drops[0] : p.x <= p.drops[0])) spawnTrooper(p.drops.shift(), p.y + 8, p.kits.shift());
        while (p.bombRun.length && (p.dir > 0 ? p.x >= p.bombRun[0].x : p.x <= p.bombRun[0].x)) {
          var drop = p.bombRun.shift();
          S.bombs.push({ id: nextId++, x: drop.x, y: p.y + 14, vx: drop.vx, vy: 0, isBomb: true, dead: false });
          emit('bomb_dropped', { by: 'bomber' });
          sound.play('whistle');
        }
        if (p.x < -90 || p.x > W + 90) S.planes.splice(i, 1);
      } else {
        p.vy += 320 * dt; p.x += p.dir * p.speed * 0.6 * dt; p.y += p.vy * dt; p.rot = Math.min(1.25, p.rot + 1.7 * dt);
        p.smoke -= dt;
        if (p.smoke <= 0) { p.smoke = 0.05; puff(p.x - p.dir * 18, p.y - 4, 4, 0.7); }
        S.troopers.forEach(function (t) {
          if (!t.dead && (t.state === 'chute' || t.state === 'free') && Math.hypot(t.x - p.x, t.y + 10 - p.y) < 26) {
            t.dead = true; killFx(t); S.stats.kills++;
            emit('kill', { by: 'crash', type: t.type });
            award(10, t.x, t.y, 'bonk!', INK, true);
          }
        });
        if (p.y >= GROUND - 8) { explode(p.x, GROUND - 4, 40, 'crash'); S.planes.splice(i, 1); }
      }
    }
  }
  function updateBombs(dt) {
    S.bombs.forEach(function (m) {
      if (m.dead) return;
      m.vy += 260 * dt; m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.y >= GROUND - 6 || (m.x > BK.x1 - 4 && m.x < BK.x2 + 4 && m.y >= BK.top - 8)) {
        m.dead = true;
        explode(m.x, Math.min(m.y, GROUND - 4), 42, 'bomb');
      }
    });
  }
  // ---------- zeppelin boss ----------
  // Every BOSS_EVERY waves a zeppelin patrols the sky until it is shot down. It drops paratroopers from its gondola
  // and bomb clusters from its belly, sinks as it loses gas, and turns angry (faster, busier) at half health.
  // It lives in S.planes so flak, rockets, bazookas and the ambience treat it as an aircraft.
  var ZEP = { HW: 78, HH: 25, Y: 172, SINK: 44, LEFT: 72, RIGHT: 328, SPEED: 24, ANGRY_SPEED: 36, ENTER_SPEED: 48,
    DROP_EVERY: 3.4, ANGRY_DROP_EVERY: 2.4, BOMB_EVERY: 6.5, ANGRY_BOMB_EVERY: 4.5 };
  function zeppelinHP(n) { return Math.round(30 + BALANCE.BOSS_HP_PER_WAVE * n); }
  function spawnZeppelin() {
    var rnd = substream(RW), dir = rnd() < 0.5 ? 1 : -1, p = makePlane('zeppelin', dir, dir > 0 ? -ZEP.HW - 20 : W + ZEP.HW + 20, ZEP.Y);
    p.rng = rnd;
    p.hp = p.maxHp = zeppelinHP(S.wave); p.hw = ZEP.HW; p.hh = ZEP.HH; p.face = dir; p.speed = ZEP.ENTER_SPEED;
    p.baseY = ZEP.Y; p.bob = between(rnd, 0, 6.28); p.entered = false; p.dropT = 2; p.bombT = 4; p.holes = []; p.angry = false; p.boomT = 0;
    S.planes.push(p);
    emit('plane_spawn', { kind: 'zeppelin', dir: dir, y: p.y, hp: p.maxHp });
    sound.play('horn');
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
          [-1, 0, 1].forEach(function (k) { S.bombs.push({ id: nextId++, x: p.x + k * 10, y: p.y + p.hh - 2, vx: p.face * p.speed * 0.5 + k * 40, vy: 0, isBomb: true, dead: false }); emit('bomb_dropped', { by: 'zeppelin' }); });
          sound.play('whistle');
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
      sound.play('hit');
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
  function hurtZeppelin(p, dmg, owner, hx, hy) {
    p.hp -= dmg; p.hitFlash = 0.1;
    var x = hx == null ? p.x : hx, y = hy == null ? p.y : hy;
    burst(x, y, 3, INK, 90);
    // Holes appear where hits land, more of them as it weakens. Stored unflipped so they turn with the hull.
    var lx = (x - p.x) * (p.face < 0 ? -1 : 1), ly = y - p.y, e = Math.hypot(lx / p.hw, ly / p.hh);
    if (e > 0.8) { lx *= 0.8 / e; ly *= 0.8 / e; }
    if (p.holes.length < 2 + Math.floor((1 - Math.max(0, p.hp) / p.maxHp) * 10)) p.holes.push({ x: lx, y: ly, id: nextId++ });
    if (p.hp <= 0) { zeppelinDown(p, owner); return; }
    sound.play('thup');
    if (!p.angry && p.hp <= p.maxHp / 2) { p.angry = true; addText("it's angry!", p.x, p.y - p.hh - 16, RED, 24); sound.play('horn'); }
  }
  function zeppelinDown(p, owner) {
    p.state = 'fall'; p.hp = 0; p.vy = 0; p.rot = 0; p.smoke = 0; p.boomT = 0.15;
    S.stats.planes++;
    emit('plane_down', { kind: 'zeppelin', by: owner === 'ally' ? 'crew' : 'player' });
    award(250 + 30 * S.wave, p.x, p.y + p.hh + 40, 'zeppelin down!', owner === 'ally' ? BLUE : INK, true);
    S.banner = { s: 'zeppelin down!', sub: 'catch the crew!', t: 0, dur: 2.2 };
    S.shake = Math.max(S.shake, 0.5);
    sound.play('zepdown');
    for (var i = 0; i < 3; i++) spawnTrooper(p.x + (i - 1) * p.hw * 0.6, p.y + p.hh + 10, rollTrooper(p.rng)).zep = p.id;
  }

  function updateSniper(t, dt) {
    var live = S.recruits.filter(function (r) { return !r.dead; }), aimX, aimY;
    if (live.length) {
      t.alone = 0;
      var target = live.sort(function (a, b) { return Math.abs(a.x - t.x) - Math.abs(b.x - t.x); })[0];
      aimX = target.x; aimY = GROUND - 22;
    } else {
      // No crew: plink at the turret (heat jolt, wall chip) for a while, then slip away unrewarded so a wave can't stall.
      t.alone += dt;
      if (t.alone > ENEMIES.sniper.abandonAfter) {
        t.x += (t.x < BK.x ? -1 : 1) * 32 * dt; t.walk += dt * 9;
        if (t.x < -12 || t.x > W + 12) t.dead = true;
        return;
      }
      aimX = TUR.x; aimY = TUR.y + 3;
    }
    t.dir = aimX > t.x ? 1 : -1;
    t.aim = Math.atan2(aimY - (t.y + 11), aimX - t.x);
    t.shotCD -= dt;
    if (t.shotCD <= 0) {
      t.shotCD = ENEMIES.sniper.cooldown;
      S.enemyShots.push({ x: t.x + t.dir * 16, y: t.y + 11, vx: Math.cos(t.aim) * 260, vy: Math.sin(t.aim) * 260, life: 2, turret: !live.length });
      sound.play('sniper');
    }
  }
  function sniperHitsTurret() {
    S.heat = Math.min(1, S.heat + 0.25);
    if (S.heat >= 1) triggerOverheat();
    hurtWall(3, 'sniper');
    addText('ping!', TUR.x + rr(-14, 14), TUR.y - 38, RED, 20);
    S.parts.push({ k: 'tink', x: TUR.x, y: TUR.y - 6, life: 0.25, max: 0.25, c: RED, id: nextId++ });
    sound.play('clank');
  }
  function updateEnemyShots(dt) {
    S.enemyShots.forEach(function (b) {
      b.life -= dt; var x0 = b.x; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.turret) {
        if (b.life > 0 && Math.hypot(b.x - TUR.x, b.y - (TUR.y + 3)) < 18) { b.life = 0; sniperHitsTurret(); }
        return;
      }
      S.recruits.forEach(function (r) {
        if (b.life <= 0 || r.dead || r.x < Math.min(x0, b.x) - 6 || r.x > Math.max(x0, b.x) + 6 || Math.abs(b.y - (GROUND - 22)) > 18) return;
        b.life = 0; hurtRecruit(r, ENEMIES.sniper.damage, 'sniper'); r.hurt = 0.3;
      });
    });
    S.enemyShots = S.enemyShots.filter(function (b) { return b.life > 0 && b.x > -20 && b.x < W + 20; });
  }
  function updateLander(t, dt) {
    if (t.type === 'sniper') { updateSniper(t, dt); return; }
    var mine = S.mines.find(function (m) { return m.armed && Math.abs(t.x - m.x) < 12; });
    if (mine) { mine.armed = false; explode(mine.x, GROUND - 15, 38, 'mine', 'ally'); return; }
    var wallX = t.dir > 0 ? BK.x1 - 7 : BK.x2 + 7, blk = null, bd = 1e9;
    S.recruits.forEach(function (r) {
      if (r.dead) return;
      var d = (r.x - t.x) * t.dir;
      if (d > -2 && d < bd) { bd = d; blk = r; }
    });
    t.attacking = null; t.atWall = false;
    if (blk && bd < 11) {
      t.attacking = blk; hurtRecruit(blk, dt, 'lander');
    } else if ((wallX - t.x) * t.dir <= 0) {
      t.atWall = true; t.x = wallX;
      hurtWall(BALANCE.WALL_DAMAGE * dt, 'lander');
      t.thump -= dt;
      if (t.thump <= 0) { t.thump = 0.6; S.parts.push({ k: 'tink', x: wallX + t.dir * 8, y: GROUND - 18, life: 0.25, max: 0.25, c: RED, id: nextId++ }); sound.play('thump'); }
    } else {
      t.x += t.dir * 22 * (S.mods.wire ? 0.5 : 1) * dt; t.walk += dt * 9;
    }
  }
  function updateTroopers(dt) {
    S.troopers.forEach(function (t) {
      if (t.dead) return;
      if (t.state === 'chute') {
        t.open = Math.min(1, t.open + dt * 2.6);
        t.y += (t.open < 1 ? 95 - 55 * t.open : t.fall) * dt;
        if (t.type === 'sniper') { var edge = t.x < BK.x ? 18 : W - 18; t.x += Math.sign(edge - t.x) * Math.min(Math.abs(edge - t.x), 28 * dt); }
        else t.x += Math.sin(S.t * 1.3 + t.sway) * 7 * dt;
        if (t.x > 150 && t.x < 250) t.x += (t.x < 200 ? -1 : 1) * 10 * dt;
        t.x = clamp(t.x, 12, W - 12);
        if (t.y + 33 >= GROUND) land(t);
      } else if (t.state === 'free') {
        var previousFeet = t.y + 33;
        t.vy += 650 * dt; t.y += t.vy * dt; t.rot += t.spin * dt;
        var bounced = false, mats = activeTramps();
        if (t.vy > 0) {
          for (var i = 0; i < mats.length; i++) {
            var tr = mats[i];
            if (t.x >= tr.x1 + 4 && t.x <= tr.x2 - 4 && previousFeet <= tr.y + 2 && t.y + 33 >= tr.y + 2) { if (t.vy <= CAPTURE_SPEED) { bounce(t, tr); bounced = true; } else { addText('rip!', t.x, tr.y - 28, RED, 25); splat(t, true); bounced = true; tr.v += 90; } break; }
          }
        }
        if (!bounced && t.y + 33 >= GROUND) { crush(t); splat(t); }
      } else if (t.state === 'bounce') {
        t.bt += dt / t.bdur;
        var u = Math.min(1, t.bt);
        t.x = t.x0 + (t.x1 - t.x0) * u;
        t.y = t.y0 + (t.y1 - t.y0) * u - 4 * t.bh * u * (1 - u);
        t.rot = u * Math.PI * 2 * t.spinDir;
        if (u >= 1) becomeRecruit(t);
      } else if (t.state === 'ground') {
        updateLander(t, dt);
      }
    });
  }
  function updateBullets(dt) {
    S.bullets.forEach(function (b) {
      if (b.dead) return;
      b.life -= dt;
      for (var s = 0; s < 3 && !b.dead; s++) { b.x += b.vx * dt / 3; b.y += b.vy * dt / 3; hitTest(b); }
      if (b.dead) return;
      if (b.kind === 'rocket' && R() < 0.6) puff(b.x - b.vx * 0.03, b.y - b.vy * 0.03, 2, 0.35);
      if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > GROUND) {
        b.dead = true;
        if (b.kind === 'rocket' && b.y > GROUND - 2) explode(b.x, GROUND - 4, 24, 'rocket', b.owner);
      }
    });
  }
  function updateParts(dt) {
    S.parts.forEach(function (q) {
      q.life -= dt;
      if (q.k === 'body') {
        if (q.rest) { q.rest += dt; if (q.rest > 3) q.life = 0; }
        else {
          q.vy += 650 * dt; q.x = clamp(q.x + q.vx * dt, 3, W - 3); q.y += q.vy * dt; q.rot += q.vr * dt;
          if (q.y >= GROUND - 4) {
            q.y = GROUND - 4; q.vy *= -0.28; q.vx *= 0.55; q.vr *= 0.45;
            if (Math.abs(q.vy) < 28) { q.rest = dt; q.vx = q.vy = q.vr = 0; }
          }
        }
        if (q.life <= 0) addDecal({ kind: 'body', x: q.x, y: q.y, rot: q.rot, head: q.head, len: q.len, c: q.c, seed: q.id, a: 0.6 });
      } else if (q.k === 'tag') {
        q.t += dt; var u = Math.min(1, q.t / q.dur), e = u * u;
        q.x = q.x0 + (TAG_HUD.x - q.x0) * e; q.y = q.y0 + (TAG_HUD.y - q.y0) * e - Math.sin(u * Math.PI) * 40;
        q.life = u < 1 ? 1 : 0;
        if (u >= 1) S.tagPulse = 0.25;
      } else if (q.k === 'spatter') {
        q.vy += 120 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      } else if (q.k === 'fleck') {
        q.vy += 420 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.y >= GROUND) { q.y = GROUND; q.vx *= 0.5; q.vy = 0; q.landed = true; }
        if (q.c === RED && q.landed && q.life <= 0) addDecal({ kind: 'splat', x: q.x, y: q.y, r: 1.8, color: RED, a: 0.45, seed: q.id });
      } else if (q.k === 'shred') {
        q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= (1 - dt); q.vy = Math.min(60, q.vy + 80 * dt); q.rot += q.vr * dt;
      } else if (q.k === 'puff') {
        q.r += q.vr * dt; q.y -= 10 * dt;
      }
    });
    S.parts = S.parts.filter(function (q) { return q.life > 0; });
    S.texts.forEach(function (q) { q.life -= dt; q.y += q.vy * dt; q.vy *= 0.97; });
    S.texts = S.texts.filter(function (q) { return q.life > 0; });
  }

  function updateAutoTurret(dt) {
    if (!S.mods.auto || S.mode !== 'play') return;
    S.autoCD -= dt;
    var gun = { x: BK.x, type: 'rifle' }, target = pickTarget(gun);
    if (target && S.autoCD <= 0) {
      var ap = aimPoint(gun, target), angle = Math.atan2(ap.y - (GROUND - 23), ap.x - gun.x);
      fireRecruit(gun, angle); S.autoCD = 1.6;
    }
  }
  function update(dt) {
    S.t += dt;
    if (S.mode === 'play') {
      if (keys.left) S.aim = Math.max(AIM_MIN, S.aim - 2.3 * dt);
      if (keys.right) S.aim = Math.min(AIM_MAX, S.aim + 2.3 * dt);
      S.fireCD -= dt;
      updateHeat(dt);
      if ((S.firing || keys.fire) && S.fireCD <= 0 && S.overheat <= 0) fireVolley();
      updateWave(dt);
      if (S.mode === 'shop') return;
    }
    S.recoil = Math.max(0, S.recoil - dt * 8);
    updatePlanes(dt);
    updateBombs(dt);
    updateTroopers(dt);
    updateRecruits(dt);
    updateAutoTurret(dt);
    updateBullets(dt);
    updateEnemyShots(dt);
    updateParts(dt);
    TRAMPS.forEach(function (tr) { tr.v += (-240 * tr.dip - 9 * tr.v) * dt; tr.dip += tr.v * dt; });
    if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
    S.shake = Math.max(0, S.shake - dt * 1.8);
    if (S.tagPulse > 0) S.tagPulse = Math.max(0, S.tagPulse - dt);
    if (S.banner) { S.banner.t += dt; if (S.banner.t >= S.banner.dur) S.banner = null; }
    if (S.wallHP < 30 && S.mode === 'play') {
      S.smokeT -= dt;
      if (S.smokeT <= 0) { S.smokeT = 0.35; puff(rr(205, 228), 578, 3, 0.9); }
    }
    S.troopers = S.troopers.filter(function (t) { return !t.dead; });
    S.recruits = S.recruits.filter(function (r) { return !r.dead; });
    S.bullets = S.bullets.filter(function (b) { return !b.dead; });
    S.bombs = S.bombs.filter(function (m) { return !m.dead; });
    if (S.mode === 'play' && S.wallHP <= 0) die();
    if (S.mode === 'dying') { S.dieT -= dt; if (S.dieT <= 0) showOver(); }
  }

  // ---------- drawing ----------
  function stick(x, y, p, col, w) {
    G.beginPath(); G.arc(x, y, 5, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
    ink(col, w || 2.4);
    G.beginPath();
    Ci(x, y, 5.2);
    L(x, y + 5.2, x, y + 21);
    L(x, y + 9.5, x + p[0], y + p[1]);
    L(x, y + 9.5, x + p[2], y + p[3]);
    L(x, y + 21, x + p[4], y + p[5]);
    L(x, y + 21, x + p[6], y + p[7]);
    G.stroke();
  }
  function tube(x1, y1, x2, y2) {
    var a = x1 + jt(0.5), b = y1 + jt(0.5), c = x2 + jt(0.5), d = y2 + jt(0.5);
    G.beginPath(); G.moveTo(a, b); G.lineTo(c, d);
    ink(INK, 6.5); G.stroke(); ink(PAPER, 3); G.stroke();
  }
  function hat(x, y) {
    G.beginPath(); G.moveTo(x - 7, y - 1); G.quadraticCurveTo(x - 7, y - 10, x, y - 10); G.quadraticCurveTo(x + 7, y - 10, x + 7, y - 1); G.closePath();
    G.fillStyle = HAT; G.fill(); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(x - 9.5, y - 1, x + 9.5, y - 1, 0.4); ink(INK, 2); G.stroke();
  }
  // A small stamped-metal dog tag with its chain hole, drawn once into a cached sprite.
  var tagSprite = null;
  function dogTag(x, y, rot, sc) {
    if (!tagSprite) {
      tagSprite = document.createElement('canvas'); tagSprite.width = tagSprite.height = 64;
      var previous = G; G = tagSprite.getContext('2d'); G.setTransform(4, 0, 0, 4, 0, 0); G.translate(8, 8);
      try { drawTagShape(); } finally { G = previous; }
    }
    G.save(); G.translate(x, y); G.rotate(rot || 0); G.scale(sc || 1, sc || 1);
    G.drawImage(tagSprite, -8, -8, 16, 16);
    G.restore();
  }
  function drawTagShape() {
    G.beginPath(); G.moveTo(-4, -6); G.lineTo(4, -6); G.quadraticCurveTo(6, -6, 6, -3); G.lineTo(6, 4); G.quadraticCurveTo(6, 7, 3, 7); G.lineTo(-3, 7); G.quadraticCurveTo(-6, 7, -6, 4); G.lineTo(-6, -3); G.quadraticCurveTo(-6, -6, -4, -6); G.closePath();
    G.fillStyle = '#cfd5dc'; G.fill(); G.lineWidth = 1.4; G.strokeStyle = '#56606b'; G.stroke();
    G.beginPath(); G.arc(0, -3, 1.3, 0, Math.PI * 2); G.stroke();
    G.beginPath(); G.moveTo(-3, 1); G.lineTo(3, 1); G.moveTo(-3, 4); G.lineTo(2, 4); G.lineWidth = 1; G.stroke();
  }
  function helmet(x, y) {
    G.beginPath(); G.moveTo(x - 7.5, y - 1); G.quadraticCurveTo(x - 7, y - 10, x, y - 10); G.quadraticCurveTo(x + 7, y - 10, x + 7.5, y - 1); G.closePath();
    G.fillStyle = '#7d8a64'; G.fill(); ink(INK, 1.5); G.stroke();
    G.beginPath(); L(x - 10, y - 0.5, x + 10, y - 0.5, 0.4); ink(INK, 2); G.stroke();
  }
  function hammer(hx, hy, d, idle) {
    var ex = hx + d * (idle ? 1 : 4), ey = hy - 9;
    G.beginPath(); L(hx, hy, ex, ey, 0.3); ink(INK, 2.2); G.stroke();
    G.beginPath(); L(ex - 4, ey - 1, ex + 4, ey + 1, 0.3); ink(INK, 4.5); G.stroke();
  }
  function chute(t) {
    var x = t.x, y = t.y, s = 0.35 + 0.65 * t.open, w = 21 * s, base = y - 22, top = base - 22 * s;
    G.beginPath();
    G.moveTo(x - w + jt(0.6), base + jt(0.6));
    G.bezierCurveTo(x - w + jt(1), top + jt(1), x + w + jt(1), top + jt(1), x + w + jt(0.6), base + jt(0.6));
    G.quadraticCurveTo(x + w * 0.66, base - 5 * s, x + w / 3, base);
    G.quadraticCurveTo(x, base - 5 * s, x - w / 3, base);
    G.quadraticCurveTo(x - w * 0.66, base - 5 * s, x - w, base);
    G.closePath();
    G.fillStyle = RED_FILL; G.fill(); ink(RED, 2.2); G.stroke();
    G.beginPath(); L(x - w / 3, base, x, top + 4 * s, 0.5); L(x + w / 3, base, x, top + 4 * s, 0.5); ink(RED, 1.3); G.stroke();
    G.beginPath(); L(x - w, base, x - 5, y + 2, 0.5); L(x + w, base, x + 5, y + 2, 0.5); ink(RED, 1.4); G.stroke();
  }
  function drawTrooper(t) {
    pen(t.id);
    var x = t.x, y = t.y, pose, s;
    G.save();
    if (t.rot) { G.translate(x, y + 14); G.rotate(t.rot); G.translate(-x, -(y + 14)); }
    if (t.state === 'chute') { chute(t); pose = [-5, 1, 5, 1, -4, 33, 4, 33]; }
    else if (t.state === 'free' || t.state === 'bounce') { s = Math.sin(S.t * 22 + t.id); pose = [-11, 1 + s * 4, 11, 1 - s * 4, -7 + s * 3, 32, 7 + s * 3, 31]; }
    else if (t.attacking || t.atWall) { s = Math.max(0, Math.sin(S.t * 13 + t.id)); pose = [t.dir * (6 + 7 * s), 8, t.dir * 5, 17, -5, 33, 6, 33]; }
    else { s = Math.sin(t.walk); pose = [-s * 5, 19, s * 5, 19, s * 6, 33, -s * 6, 33]; }
    if (t.type === 'bazooka') tube(x - 10, y + 20, x + 9, y + 4);
    stick(x, y, pose, RED);
    if (t.type === 'rifle') { G.beginPath(); L(x - 7, y + 17, x + 7, y + 8, 0.4); ink(INK, 2); G.stroke(); }
    if (t.type === 'engineer') hat(x, y);
    if (t.type === 'sniper') { drawScope(x, y, t.state === 'ground' ? t.dir : 1);
      if (t.state === 'ground' && t.shotCD < 0.8 && S.recruits.some(function (r) { return !r.dead; })) { G.save(); G.globalAlpha = 0.28; G.setLineDash([3, 5]); G.beginPath(); L(x + t.dir * 16, y + 11, x + t.dir * 160, y + 11); ink(RED, 1); G.stroke(); G.restore(); }
    }
    G.restore();
  }
  function drawRecruit(r) {
    pen(r.id + 5000);
    var x = r.x, y = GROUND - 33, moving = Math.abs(r.x - r.tx) > 0.8, side = r.homeX < 200 ? 1 : -1;
    var col = r.hurt > 0 && Math.floor(S.t * 18) % 2 ? RED : BLUE;
    var ca = Math.cos(r.aim), sa = Math.sin(r.aim), pose, tool = null, s;
    if (moving) { s = Math.sin(r.walk); pose = [-s * 5, 19, s * 5, 19, s * 6, 33, -s * 6, 33]; }
    else if (r.role === 'repair') {
      s = Math.sin(S.t * 12 + r.id);
      var hx = side * (8 + s * 2), hy = 7 + s * 5;
      pose = [hx, hy, side * 3, 18, -5, 33, 5, 33]; tool = { hx: x + hx, hy: y + hy, idle: false };
    } else if (r.type === 'engineer') { pose = [7, 17, -6, 19, -5, 33, 5, 33]; tool = { hx: x + 7, hy: y + 17, idle: true }; }
    else pose = [ca * 9, 9.5 + sa * 9, ca * 15, 9.5 + sa * 15, -5, 33, 5, 33];
    var aiming = !moving && r.role === 'shoot';
    if (r.type === 'bazooka') { if (aiming) tube(x - ca * 9, y + 8 - sa * 9, x + ca * 16, y + 8 + sa * 16); else tube(x - 9, y + 19, x + 8, y + 5); }
    stick(x, y, pose, col);
    if (r.type === 'rifle') {
      G.beginPath();
      if (aiming) L(x + ca * 4, y + 9.5 + sa * 4, x + ca * 20, y + 9.5 + sa * 20, 0.3); else L(x - 7, y + 17, x + 7, y + 8, 0.4);
      ink(INK, aiming ? 2.6 : 2); G.stroke();
    }
    if (tool) hammer(tool.hx, tool.hy, side, tool.idle);
    if (r.type === 'engineer') hat(x, y);
    else if (S.mods.helmet > 0 && r.type !== 'medic') helmet(x, y);
    if (r.type === 'sniper') drawScope(x, y, Math.cos(r.aim) < 0 ? -1 : 1);
    if (r.type === 'medic') { G.beginPath(); L(x-5,y-7,x+5,y-7); L(x,y-12,x,y-2); ink(BLUE,3); G.stroke(); }
    // Crew health makes the cost of leaving a sniper alive visible.
    G.fillStyle = 'rgba(46,46,51,0.15)'; G.fillRect(x-6, GROUND+4, 12, 2);
    G.fillStyle = r.hp < 1 ? RED : BLUE; G.fillRect(x-6, GROUND+4, 12 * Math.max(0,r.hp) / crewMax(r), 2);
  }
  function drawScope(x, y, dir) {
    G.beginPath(); SP([x - 7, y - 4, x - 3, y - 10, x + 7, y - 7, x + 6, y - 3], true, 0.3); G.fillStyle = INK; G.fill();
    G.beginPath(); L(x, y + 11, x + dir * 22, y + 11); L(x + dir * 8, y + 7, x + dir * 16, y + 7); ink(INK, 2.4); G.stroke();
  }
  var PLANE_PTS = [-38, 2, -36, -7, -24, -10, 26, -8, 36, -10, 42, -21, 50, -21, 48, 1, 20, 7, -28, 8];
  var BOMBER_PTS = [-46, 4, -44, -11, -30, -15, 30, -13, 42, -15, 50, -30, 60, -30, 58, 2, 24, 13, -34, 14];
  function drawPlane(p) {
    pen(p.id);
    var sc = p.sc, bomber = p.kind === 'bomber';
    G.save();
    G.translate(p.x, p.y); G.scale(-p.dir * sc, sc); if (p.rot) G.rotate(-p.rot);
    G.beginPath(); SP(bomber ? BOMBER_PTS : PLANE_PTS, true, 0.6);
    G.fillStyle = PAPER; G.fill();
    G.fillStyle = p.hitFlash > 0 ? 'rgba(200,67,58,0.3)' : INK_FILL; G.fill();
    ink(INK, 2.4 / sc); G.stroke();
    G.beginPath();
    if (bomber) { L(-16, 4, 22, 6); } else { L(-12, 2, 14, 4); }
    ink(INK, 3 / sc); G.stroke();
    G.beginPath(); SP(bomber ? [-32, -12, -26, -20, -16, -20, -12, -13] : [-26, -9, -20, -16, -12, -16, -8, -9], false, 0.4); ink(INK, 2 / sc); G.stroke();
    G.beginPath(); G.arc(bomber ? 18 : 14, bomber ? -3 : -2, bomber ? 4.5 : 3.6, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
    var pl = boil % 2 ? 10 : 6, nx = bomber ? -50 : -42;
    G.beginPath(); L(nx, -pl, nx, pl, 0.4); ink(INK, 2 / sc); G.stroke();
    if (bomber) {
      G.beginPath(); Ci(2, 8, 5); ink(INK, 2 / sc); G.stroke();
      G.beginPath(); L(-6, 13, 10, 13, 0.4); ink(INK, 1.6 / sc); G.stroke();
      if (p.hp < 3) { G.beginPath(); SP([30, -12, 26, -6, 31, -1], false, 0.3); if (p.hp < 2) SP([-20, -14, -16, -7, -21, -2], false, 0.3); ink(INK, 1.6 / sc); G.stroke(); }
    }
    if (p.state === 'fly') {
      G.globalAlpha = 0.5; G.beginPath();
      var tx = bomber ? 66 : 56;
      L(tx, -10, tx + 14, -10); L(tx + 2, -2, tx + 20, -2); L(tx, 6, tx + 10, 6);
      ink(INK2, 1.5 / sc); G.stroke(); G.globalAlpha = 1;
    }
    G.restore();
  }
  function drawBomb(m) {
    pen(m.id);
    var a = Math.atan2(m.vy, m.vx) - Math.PI / 2;
    G.save(); G.translate(m.x, m.y); G.rotate(a);
    G.beginPath(); G.ellipse(0, 0, 4.5, 7.5, 0, 0, Math.PI * 2); G.fillStyle = INK; G.fill();
    G.beginPath(); L(-4, -6, -6, -12, 0.3); L(4, -6, 6, -12, 0.3); L(-6, -12, 6, -12, 0.3); ink(INK, 1.8); G.stroke();
    G.restore();
  }
  function drawZeppelin(p) {
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
        var fx = k * hw, fy = -hh * Math.sqrt(1 - k * k) + 2, fh = 10 + ((boil + j) % 3) * 4;
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
    var pl = boil % 2 ? 7 : 4;
    G.beginPath(); L(-27, hh + 10 - pl, -27, hh + 10 + pl, 0.3); ink(INK, 1.8); G.stroke();
    if (fly && Math.abs(f) > 0.8) { G.globalAlpha = 0.45; G.beginPath(); L(-hw * 1.18, -8, -hw * 1.18 - 16, -8); L(-hw * 1.2, 4, -hw * 1.2 - 10, 4); ink(INK2, 1.5); G.stroke(); G.globalAlpha = 1; }
    G.restore();
  }
  // Boss health rides just above the hull, below the escort lane; the tick marks half, where it turns angry.
  function drawBossBar() {
    var z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; });
    if (!z) return;
    var w = 96, x = clamp(z.x, 12 + w / 2, W - 12 - w / 2) - w / 2, y = z.y - z.hh - 12, f = clamp(z.hp / z.maxHp, 0, 1);
    pen(4343);
    G.fillStyle = PAPER; G.fillRect(x, y - 4, w, 8);
    G.fillStyle = z.hitFlash > 0 ? 'rgba(200,67,58,0.75)' : 'rgba(200,67,58,0.45)'; G.fillRect(x + 1.5, y - 2.5, (w - 3) * f, 5);
    G.beginPath(); L(x, y - 4, x + w, y - 4, 0.4); L(x + w, y - 4, x + w, y + 4, 0.3); L(x + w, y + 4, x, y + 4, 0.4); L(x, y + 4, x, y - 4, 0.3); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(x + w / 2, y - 6, x + w / 2, y + 6, 0.2); ink(INK2, 1.2); G.stroke();
  }
  function drawGround() {
    pen(777);
    G.beginPath(); SP([0, 612, 70, 611, 140, 613, 210, 611.5, 280, 612.5, 350, 611, 400, 612], false, 0.4); ink(INK, 2.4); G.stroke();
    G.beginPath();
    L(14, 612, 12, 605, 0.4); L(18, 612, 21, 605, 0.4); L(102, 612, 99, 606, 0.4); L(105, 612, 107, 605, 0.4);
    L(300, 612, 298, 606, 0.4); L(303, 612, 305, 605, 0.4); L(384, 612, 381, 605, 0.4); L(388, 612, 390, 606, 0.4);
    ink(INK, 1.6); G.stroke();
  }
  function drawDefenses() {
    pen(880);
    if (S.mods.wire) {
      G.beginPath(); [104, 296].forEach(function (x) { L(x-12,GROUND-5,x+12,GROUND-5); for(var j=-8;j<=8;j+=8) { L(x+j-3,GROUND-9,x+j+3,GROUND-1); L(x+j-3,GROUND-1,x+j+3,GROUND-9); } }); ink(INK2,1.3); G.stroke();
    }
    S.mines.forEach(function (m) { if (!m.armed) return; G.beginPath(); Ci(m.x,GROUND-2,4); ink(INK,1.6); G.stroke(); G.beginPath(); L(m.x-2,GROUND-7,m.x+2,GROUND-7); ink(RED,2); G.stroke(); });
    if (S.mods.auto) { G.beginPath(); SP([190,608,194,597,206,597,210,608],false); L(200,599,200,585); ink(BLUE,2.4); G.stroke(); }
    for (var row = 0; row < S.mods.trench; row++) {
      [[98, 162], [238, 302]].forEach(function (span) {
        for (var bx = span[0] + row * 5; bx <= span[1]; bx += 11) {
          var by = GROUND - 3 - row * 6;
          G.beginPath(); SP([bx - 6, by, bx - 4, by - 4, bx + 4, by - 4, bx + 6, by, bx + 4, by + 3, bx - 4, by + 3], true, 0.3);
          G.fillStyle = '#e7dcc0'; G.fill(); ink(INK2, 1.3); G.stroke();
        }
      });
    }
  }
  function drawTramp(tr, i) {
    pen(500 + i);
    var a = tr.x1, b = tr.x2, y = tr.y, mid = (a + b) / 2, sag = 3 + tr.dip;
    G.beginPath(); L(a + 6, y, a + 1, GROUND, 0.5); L(b - 6, y, b - 1, GROUND, 0.5); L(a + 16, y + 2, a + 12, GROUND, 0.5); L(b - 16, y + 2, b - 12, GROUND, 0.5);
    ink(INK, 2.2); G.stroke();
    G.beginPath(); G.moveTo(a + jt(0.5), y + jt(0.5)); G.quadraticCurveTo(mid + jt(1), y + sag * 2, b + jt(0.5), y + jt(0.5)); ink(INK, 3.4); G.stroke();
    G.beginPath(); G.rect(a - 5, y - 4, 9, 7); G.rect(b - 4, y - 4, 9, 7); G.fillStyle = BLUE; G.fill(); ink(INK, 1.6); G.stroke();
  }
  function drawBarrel() {
    var len = 31 - S.recoil * 6, hot = clamp((S.heat - 0.35) / 0.65, 0, 1);
    if (S.overheat > 0) hot = Math.floor(S.t * 8) % 2 ? 1 : 0.6;
    G.save(); G.translate(TUR.x, TUR.y); G.rotate(S.aim);
    G.fillStyle = PAPER; G.fillRect(2, -4, len - 2, 8);
    if (hot > 0) { G.globalAlpha = 0.45 * hot; G.fillStyle = RED; G.fillRect(2, -4, len - 2, 8); G.globalAlpha = 1; }
    G.beginPath(); L(2, -4, len, -4, 0.4); L(2, 4, len, 4, 0.4); L(len, -4.5, len, 4.5, 0.3); ink(hot > 0.7 ? RED : INK, 2.4); G.stroke();
    G.restore();
  }
  // A thin gauge arcing over the dome: fills left to right as the gun heats, blinks red when locked.
  function drawHeatRing() {
    if (S.mode !== 'play' || (S.heat < 0.03 && S.overheat <= 0)) return;
    var r = 25, start = Math.PI * 1.08, span = Math.PI * 0.84, end = start + span * S.heat;
    G.save();
    G.setLineDash([2, 4]); G.beginPath(); G.arc(BK.x, BK.top, r, start, start + span); ink('rgba(46,46,51,0.25)', 1.5); G.stroke(); G.setLineDash([]);
    var col = S.overheat > 0 ? (Math.floor(S.t * 8) % 2 ? RED : INK) : S.heat > 0.7 ? RED : INK;
    G.beginPath(); G.arc(BK.x, BK.top, r, start, end); ink(col, 3); G.stroke();
    G.restore();
  }
  function drawBunker() {
    pen(9001);
    var i, dipping = S.aim > -0.05 || S.aim < -Math.PI + 0.05;
    // Tipped down, the barrel leans out over the wall, so it draws in front of the bunker.
    if (!dipping) drawBarrel();
    var dome = [];
    for (i = 0; i <= 10; i++) { var an = Math.PI + (i / 10) * Math.PI; dome.push(BK.x + Math.cos(an) * 19, BK.top + Math.sin(an) * 19); }
    G.beginPath(); G.moveTo(BK.x - 19, BK.top); G.arc(BK.x, BK.top, 19, Math.PI, 0); G.closePath(); G.fillStyle = PAPER; G.fill();
    G.beginPath(); SP(dome, false, 0.5); ink(INK, 2.6); G.stroke();
    G.beginPath(); L(BK.x - 8, BK.top - 6, BK.x + 8, BK.top - 6, 0.4); ink(INK, 1.4); G.stroke();
    var body = [168, 612, 168, 583, 175, 576, 225, 576, 232, 583, 232, 612];
    G.beginPath(); G.moveTo(body[0], body[1]);
    for (i = 2; i < body.length; i += 2) G.lineTo(body[i], body[i + 1]);
    G.closePath(); G.fillStyle = PAPER; G.fill(); G.fillStyle = INK_FILL; G.fill();
    G.beginPath(); for (i = 0; i < body.length - 2; i += 2) L(body[i], body[i + 1], body[i + 2], body[i + 3], 0.6); ink(INK, 2.6); G.stroke();
    G.beginPath();
    L(169, 590, 231, 590, 0.4); L(169, 601, 231, 601, 0.4); L(186, 577, 186, 590, 0.4); L(212, 577, 212, 590, 0.4);
    L(176, 590, 176, 601, 0.4); L(198, 590, 198, 601, 0.4); L(220, 590, 220, 601, 0.4); L(187, 601, 187, 611, 0.4); L(209, 601, 209, 611, 0.4);
    ink('rgba(46,46,51,0.32)', 1.5); G.stroke();
    var hp = S.wallHP / S.mods.maxHP * 100;
    G.beginPath();
    if (hp < 80) SP([173, 584, 179, 591, 175, 597, 181, 605], false, 0.3);
    if (hp < 55) SP([227, 580, 221, 588, 227, 596, 222, 604], false, 0.3);
    if (hp < 15) SP([193, 578, 197, 586, 192, 593, 199, 600, 195, 610], false, 0.3);
    ink(INK, 1.8); G.stroke();
    if (hp < 30) {
      var ch = [210, 575, 226, 575, 233, 583, 233, 595, 226, 590, 219, 586, 214, 581];
      G.beginPath(); G.moveTo(ch[0], ch[1]); for (i = 2; i < ch.length; i += 2) G.lineTo(ch[i], ch[i + 1]); G.closePath(); G.fillStyle = PAPER; G.fill();
      G.beginPath(); SP([232, 595, 226, 590, 219, 586, 214, 581, 210, 576], false, 0.3); ink(INK, 2.2); G.stroke();
    }
    if (dipping) drawBarrel();
    drawHeatRing();
  }
  function drawRubble() {
    pen(9002);
    var pts = [164, 612, 170, 601, 179, 604, 188, 592, 198, 598, 207, 589, 216, 600, 226, 595, 236, 612];
    G.beginPath(); G.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) G.lineTo(pts[i], pts[i + 1]); G.closePath();
    G.fillStyle = PAPER; G.fill(); G.fillStyle = INK_FILL; G.fill();
    G.beginPath(); SP(pts, false, 0.6); ink(INK, 2.6); G.stroke();
    G.beginPath(); L(178, 606, 190, 606, 0.5); L(196, 603, 210, 604, 0.5); L(214, 607, 224, 606, 0.5); ink('rgba(46,46,51,0.4)', 1.6); G.stroke();
    G.save(); G.translate(222, 596); G.rotate(-0.4);
    G.fillStyle = PAPER; G.fillRect(0, -4, 28, 8);
    G.beginPath(); L(0, -4, 28, -4, 0.4); L(0, 4, 28, 4, 0.4); L(28, -4.5, 28, 4.5, 0.3); ink(INK, 2.4); G.stroke();
    G.restore();
  }
  function drawBullets() {
    S.enemyShots.forEach(function (b) { G.beginPath(); L(b.x, b.y, b.x - Math.sign(b.vx) * 12, b.y, 0.3); ink(RED, 2); G.stroke(); });
    S.bullets.forEach(function (b) {
      var sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
      G.beginPath();
      if (b.kind === 'rocket') { G.moveTo(b.x - ux * 9, b.y - uy * 9); G.lineTo(b.x, b.y); ink(INK, 6); G.stroke(); ink(BLUE, 3); G.stroke(); }
      else { G.moveTo(b.x - ux * 7, b.y - uy * 7); G.lineTo(b.x, b.y); ink(b.owner === 'ally' ? BLUE : INK, 2.6); G.stroke(); }
    });
  }
  function drawParts() {
    S.parts.forEach(function (q) {
      var a = Math.max(0, q.life / q.max);
      pen(q.id);
      G.save(); G.globalAlpha = a;
      if (q.k === 'body') { G.globalAlpha = 0.85; drawBodyPart(q); }
      else if (q.k === 'tag') { G.globalAlpha = 1; dogTag(q.x, q.y, q.rot, 1); if (q.n > 1) { G.font = '15px ' + HAND; G.fillStyle = '#56606b'; G.fillText('+' + q.n, q.x + 8, q.y - 6); } }
      else if (q.k === 'spatter') { G.globalAlpha = a * 0.6; G.beginPath(); G.arc(q.x, q.y, q.r, 0, Math.PI * 2); G.fillStyle = q.c; G.fill(); }
      else if (q.k === 'fleck') { G.beginPath(); G.moveTo(q.x, q.y); G.lineTo(q.x - q.vx * 0.02, q.y - q.vy * 0.02); ink(q.c, 2); G.stroke(); }
      else if (q.k === 'shred') { G.translate(q.x, q.y); G.rotate(q.rot); G.beginPath(); G.arc(0, 0, 6, Math.PI, Math.PI * 1.8); ink(RED, 1.8); G.stroke(); }
      else if (q.k === 'puff') { G.globalAlpha = a * 0.55; G.beginPath(); Ci(q.x, q.y, q.r, 0.6); ink(INK, 1.6); G.stroke(); }
      else if (q.k === 'star') {
        G.globalAlpha = 1; G.beginPath();
        for (var i = 0; i < 6; i++) { var an = S.aim + i * Math.PI / 3; L(q.x + Math.cos(an) * 2, q.y + Math.sin(an) * 2, q.x + Math.cos(an) * 7, q.y + Math.sin(an) * 7, 0.5); }
        ink(INK, 2); G.stroke();
      } else if (q.k === 'deflate') { G.beginPath(); SP([q.x - 14, q.y, q.x - 8, q.y - 6, q.x - 2, q.y - 2, q.x + 4, q.y - 7, q.x + 10, q.y - 2, q.x + 15, q.y], false, 0.5); G.fillStyle = RED_FILL; G.fill(); ink(RED, 1.8); G.stroke(); }
      else if (q.k === 'tink') { G.beginPath(); L(q.x, q.y, q.x + 6, q.y - 5, 0.4); L(q.x, q.y, q.x + 7, q.y + 2, 0.4); L(q.x, q.y, q.x - 6, q.y - 6, 0.4); L(q.x, q.y, q.x - 5, q.y + 3, 0.4); ink(q.c === HAT ? '#d29a00' : q.c, 2); G.stroke(); }
      else if (q.k === 'ring') { G.beginPath(); Ci(q.x, q.y, 8 + (1 - a) * 24, 0.6); ink(BLUE, 2.4); G.stroke(); }
      G.restore();
    });
  }
  function drawTexts() {
    S.texts.forEach(function (q) {
      var age = q.max - q.life, a = Math.min(1, q.life / 0.3), sc = age < 0.1 ? 1 + (0.1 - age) * 5 : 1;
      G.save(); G.globalAlpha = a; G.translate(q.x, q.y); G.rotate(q.rot); G.scale(sc, sc);
      G.font = q.size + 'px ' + HAND; G.textAlign = 'center';
      G.lineWidth = 4; G.lineJoin = 'round'; G.strokeStyle = PAPER; G.strokeText(q.s, 0, 0);
      G.fillStyle = q.color; G.fillText(q.s, 0, 0);
      G.restore();
    });
  }
  function drawAimGuide() {
    var c = Math.cos(S.aim), s = Math.sin(S.aim);
    G.save(); G.setLineDash([2, 8]);
    G.beginPath(); G.moveTo(TUR.x + c * 40, TUR.y + s * 40); G.lineTo(TUR.x + c * 125, TUR.y + s * 125);
    ink('rgba(46,46,51,0.28)', 2); G.stroke();
    G.restore();
  }
  function drawHint() {
    G.save(); G.globalAlpha = 0.6 + 0.3 * Math.sin(S.t * 4);
    G.fillStyle = INK; G.textAlign = 'center'; G.font = '19px ' + HAND;
    G.fillText('pop his chute', 80, 468); G.fillText('over the mat!', 80, 490);
    G.setLineDash([2, 6]); G.beginPath(); G.moveTo(64, 538); G.lineTo(58, 580); ink(INK, 2); G.stroke(); G.setLineDash([]);
    G.beginPath(); G.moveTo(52, 573); G.lineTo(58, 582); G.lineTo(64, 573); G.stroke();
    G.restore();
  }
  function miniFig(x, y, r, i) {
    pen(7000 + i);
    G.save(); G.translate(x, y); G.scale(0.6, 0.6);
    if (r) {
      if (r.type === 'bazooka') tube(-8, 18, 7, 5);
      stick(0, 0, [-6, 19, 6, 19, -5, 33, 5, 33], BLUE, 3);
      if (r.type === 'engineer') hat(0, 0);
    } else {
      G.setLineDash([2, 4]); stick(0, 0, [-6, 19, 6, 19, -5, 33, 5, 33], EMPTY, 2.4); G.setLineDash([]);
    }
    G.restore();
  }
  function drawHUD() {
    pen(4242);
    G.save();
    G.textAlign = 'left';
    if (S.mode !== 'title') {
      G.fillStyle = INK2; G.font = '16px ' + HAND; G.fillText('score', 58, 28);
      G.fillStyle = INK; G.font = '34px ' + HAND; G.fillText(S.score.toLocaleString('en-US'), 58, 58);
      G.fillStyle = '#56606b'; G.font = '16px ' + HAND; G.fillText('dog tags', 280, 28);
      dogTag(TAG_HUD.x, TAG_HUD.y, -0.25, 1.3);
      G.save(); G.translate(302, 58); var pulse = 1 + (S.tagPulse || 0) * 0.9; G.scale(pulse, pulse);
      G.fillStyle = '#56606b'; G.font = '34px ' + HAND; G.textAlign = 'left'; G.fillText(String(S.coins), 0, 0); G.restore();
      G.fillStyle = INK;
      G.textAlign = 'center'; G.font = '26px ' + HAND; G.fillText('wave ' + Math.max(1, S.wave), 200, 50);
      if (S.combo >= 2 && S.comboT > 0) {
        G.fillStyle = BLUE; G.font = '22px ' + HAND; G.fillText('combo x' + Math.min(5, S.combo), 200, 76);
        var cw = 70 * (S.comboT / 1.4);
        G.beginPath(); L(200 - cw / 2, 82, 200 + cw / 2, 82, 0.4); ink(BLUE, 2.4); G.stroke();
      }
    }
    var y1 = 648, bx = 112, bw = 186, hp = Math.max(0, S.wallHP);
    G.textAlign = 'left'; G.fillStyle = INK; G.font = '21px ' + HAND; G.fillText('wall', 58, y1 + 7);
    G.fillStyle = hp < 30 ? 'rgba(200,67,58,0.45)' : 'rgba(47,111,220,0.4)';
    G.fillRect(bx + 2, y1 - 8, (bw - 4) * hp / S.mods.maxHP, 16);
    G.beginPath(); L(bx, y1 - 10, bx + bw, y1 - 10, 0.5); L(bx + bw, y1 - 10, bx + bw, y1 + 10, 0.5); L(bx + bw, y1 + 10, bx, y1 + 10, 0.5); L(bx, y1 + 10, bx, y1 - 10, 0.5);
    ink(INK, 2.4); G.stroke();
    G.fillStyle = INK2; G.font = '17px ' + HAND; G.fillText(Math.ceil(hp) + '/' + S.mods.maxHP, bx + bw + 10, y1 + 6);
    var y2 = 690;
    G.fillStyle = INK; G.font = '21px ' + HAND; G.fillText('squad', 58, y2 + 6);
    var live = S.recruits.filter(function (r) { return !r.dead; }).sort(function (a, b) { return a.slot - b.slot; });
    for (var i = 0; i < S.mods.slots; i++) miniFig(122 + i * 21, y2 - 13, live[i], i);
    G.fillStyle = INK2; G.font = '17px ' + HAND; G.textAlign = 'left'; G.fillText(live.length + "/" + S.mods.slots, 300, y2 + 6);
    G.restore();
  }
  function drawBanner() {
    var b = S.banner, a = Math.min(1, b.t / 0.25, (b.dur - b.t) / 0.4);
    if (a <= 0) return;
    G.save(); G.globalAlpha = a; G.textAlign = 'center';
    G.font = '700 ' + (b.s.length > 8 ? 46 : 56) + 'px ' + DISPLAY;
    G.lineWidth = 6; G.lineJoin = 'round'; G.strokeStyle = PAPER; G.strokeText(b.s, 200, 300);
    G.fillStyle = INK; G.fillText(b.s, 200, 300);
    pen(31337); G.beginPath(); SP([120, 316, 160, 320, 200, 314, 240, 320, 280, 315], false, 0.8); ink(BLUE, 3); G.stroke();
    if (b.sub) { G.font = '24px ' + HAND; G.strokeStyle = PAPER; G.lineWidth = 4; G.strokeText(b.sub, 200, 348); G.fillStyle = BLUE; G.fillText(b.sub, 200, 348); }
    G.restore();
  }

  function render() {
    G = ctx;
    ctx.setTransform(K, 0, 0, K, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var sx = 0, sy = 0;
    if (S.shake > 0 && !REDUCED) { sx = rr(-1, 1) * S.shake * 8; sy = rr(-1, 1) * S.shake * 8; }
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.drawImage(dc, 0, 0, W, H);
    drawGround();
    activeTramps().forEach(drawTramp);
    S.planes.forEach(function (p) { if (p.kind === 'zeppelin') drawZeppelin(p); });
    S.planes.forEach(function (p) { if (p.kind !== 'zeppelin') drawPlane(p); });
    S.bombs.forEach(drawBomb);
    S.troopers.forEach(function (t) { if (!t.dead) drawTrooper(t); });
    if (S.mode === 'dying' || S.mode === 'over') drawRubble(); else { drawBunker(); drawDefenses(); }
    S.recruits.forEach(function (r) { if (!r.dead) drawRecruit(r); });
    drawBullets();
    drawCourier();
    drawBossBar();
    drawParts();
    if (S.mode === 'play') drawAimGuide();
    if (S.hint && S.mode === 'play') drawHint();
    drawTexts();
    ctx.restore();
    drawHUD();
    if (S.banner) drawBanner();
  }

  // ---------- flow ----------
  var titleScreen = document.getElementById('titleScreen'), pauseScreen = document.getElementById('pauseScreen'), overScreen = document.getElementById('overScreen');
  var shopScreen = document.getElementById('shopScreen');
  var pauseBtn = document.getElementById('pauseBtn'), muteBtn = document.getElementById('muteBtn');

  function titleScene() {
    reset();
    S.mode = 'title';
    S.planes.push(makePlane('plane', -1, 300, 44));
    [[0, 'rifle'], [1, 'bazooka'], [4, 'engineer'], [5, 'rifle']].forEach(function (d) { S.recruits.push(makeRecruit(d[0], d[1])); });
    var bl = document.getElementById('bestLine');
    bl.hidden = !(best > 0);
    bl.textContent = 'Best so far: ' + Number(best).toLocaleString('en-US');
    titleScreen.hidden = false; pauseScreen.hidden = true; overScreen.hidden = true; pauseBtn.hidden = true;
  }
  function newGame() {
    sound.init();
    // A run seed: forced by a harness, fixed by #seed=, or random.
    var fixed = RUN.force != null ? RUN.force : hashSeed();
    seedRun(fixed != null ? fixed : Math.floor(Math.random() * 4294967296));
    reset();
    S.mode = 'play'; S.hint = true;
    startWave(1);
    titleScreen.hidden = true; pauseScreen.hidden = true; overScreen.hidden = true; shopScreen.hidden = true; pauseBtn.hidden = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function togglePause() {
    if (S.mode === 'play') {
      S.mode = 'paused'; clearInput();
      pauseScreen.hidden = false;
      document.getElementById('resumeBtn').focus({ preventScroll: true });
    } else if (S.mode === 'paused') {
      S.mode = 'play'; pauseScreen.hidden = true;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }
  }
  function die() {
    emit('game_over', { wave: S.wave, score: S.score, cause: S.lastHit || 'unknown' });
    S.mode = 'dying'; S.wallHP = 0; S.dieT = 1.6; S.firing = false;
    explode(BK.x, BK.top + 10, 46, 'final');
    S.shake = 0.8;
    pauseBtn.hidden = true;
    sound.play('over');
  }
  function showOver() {
    S.mode = 'over';
    var isBest = S.score > best;
    if (isBest) { best = S.score; save('stickarmy.best.2', best); }
    document.getElementById('overScore').textContent = S.score.toLocaleString('en-US');
    document.getElementById('newBest').hidden = !isBest || S.score === 0;
    document.getElementById('stWave').textContent = String(S.wave);
    document.getElementById('stCap').textContent = String(S.stats.captured);
    document.getElementById('stPop').textContent = String(S.stats.popped);
    document.getElementById('stPlanes').textContent = String(S.stats.planes);
    document.getElementById('stBest').textContent = Number(best).toLocaleString('en-US');
    overScreen.hidden = false;
    document.getElementById('againBtn').focus({ preventScroll: true });
  }
  function updateMuteBtn() {
    muteBtn.setAttribute('aria-pressed', sound.muted ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', sound.muted ? 'Unmute sound' : 'Mute sound');
    document.getElementById('icoSound').hidden = sound.muted;
    document.getElementById('icoMuted').hidden = !sound.muted;
  }

  // Fullscreen API with a fill-window fallback (including iPhone).
  var fullBtn = document.getElementById('fullBtn'), wakeLock = null;
  function setFull(on) {
    wrap.classList.toggle('full', on);
    fullBtn.textContent = on ? 'Exit full screen' : 'Full screen';
    fullBtn.setAttribute('aria-pressed', String(on));
    if (on && navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (lock) {
      if (!wrap.classList.contains('full')) { lock.release().catch(function () {}); return; }
      wakeLock = lock; lock.addEventListener('release', function () { if (wakeLock === lock) wakeLock = null; });
    }).catch(function () {});
    if (!on && wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
    fit();
  }
  function toggleFull() {
    var native = document.fullscreenElement || document.webkitFullscreenElement;
    if (wrap.classList.contains('full')) {
      if (native) { try { var out = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (out && out.catch) out.catch(function () {}); } catch (e) {} }
      setFull(false);
    } else {
      setFull(true);
      var req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
      if (req) { try { var result = req.call(wrap); if (result && result.catch) result.catch(function () {}); } catch (e) {} }
    }
  }
  function nativeFullChanged() { if (!(document.fullscreenElement || document.webkitFullscreenElement)) setFull(false); else fit(); }
  document.addEventListener('fullscreenchange', nativeFullChanged);
  document.addEventListener('webkitfullscreenchange', nativeFullChanged);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && wrap.classList.contains('full')) setFull(true); });
  fullBtn.addEventListener('click', toggleFull);

  function clearInput() { keys.left = keys.right = keys.fire = false; S.firing = false; }

  // ---------- input ----------
  function toLogical(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  function aimAt(p) {
    var a = Math.atan2(p.y - TUR.y, p.x - TUR.x);
    // Below-left angles continue past -PI so the range stays one continuous sweep.
    if (a > Math.PI / 2) a -= Math.PI * 2;
    S.aim = clamp(a, AIM_MIN, AIM_MAX);
  }
  cv.addEventListener('pointerdown', function (e) {
    if (S.mode !== 'play') return;
    sound.init();
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    aimAt(toLogical(e)); S.firing = true;
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    if (S.mode !== 'play') return;
    if (e.pointerType === 'mouse' || S.firing) aimAt(toLogical(e));
  });
  function stopFire() { S.firing = false; }
  cv.addEventListener('pointerup', stopFire);
  cv.addEventListener('pointercancel', stopFire);
  cv.addEventListener('lostpointercapture', stopFire);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('#tunePanel')) return;
    var k = e.key;
    if ((k === 'f' || k === 'F') && !e.repeat && !e.ctrlKey && !e.metaKey) { toggleFull(); return; }
    if (k === 'Escape' && wrap.classList.contains('full') && !(document.fullscreenElement || document.webkitFullscreenElement)) { setFull(false); return; }
    if (S.mode === 'shop') {
      if (k === 'Tab') {
        var buttons = Array.from(shopScreen.querySelectorAll('button:not(:disabled)'));
        var at = buttons.indexOf(document.activeElement), next = (at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        e.preventDefault(); buttons[next].focus();
      }
      return;
    }
    if (S.mode === 'delivery') return;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; if (S.mode === 'play') e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; if (S.mode === 'play') e.preventDefault(); }
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { if (S.mode === 'play') { keys.fire = true; sound.init(); e.preventDefault(); } }
    else if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); }
  });
  window.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') keys.fire = false;
  });
  window.addEventListener('blur', function () { keys.left = keys.right = keys.fire = false; S.firing = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && S.mode === 'play') togglePause(); });
  window.addEventListener('resize', fit);

  document.getElementById('continueBtn').addEventListener('click', continueWave);
  document.getElementById('startBtn').addEventListener('click', newGame);
  document.getElementById('againBtn').addEventListener('click', newGame);
  document.getElementById('restartBtn').addEventListener('click', newGame);
  document.getElementById('resumeBtn').addEventListener('click', togglePause);
  pauseBtn.addEventListener('click', togglePause);
  muteBtn.addEventListener('click', function () {
    sound.muted = !sound.muted; save('stickarmy.muted', sound.muted); updateMuteBtn();
    if (!sound.muted) sound.init();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });

  // ---------- loop ----------
  var last = performance.now(), lastAmbience = 0;
  // What the ambience layer needs: whether a wave is live, where the planes are, and whether the wall is in trouble.
  function ambienceState() {
    return {
      active: S.mode === 'play' && !document.hidden,
      planes: S.planes.filter(function (p) { return p.state === 'fly' && p.x > -40 && p.x < W + 40; }).map(function (p) { return { x: p.x, dir: p.dir, kind: p.kind }; }),
      wave: S.waveState === 'active',
      wallLow: S.wallHP < S.mods.maxHP * 0.3
    };
  }
  function loop(now) {
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    boil = REDUCED ? 0 : Math.floor(now / 130) % 3;
    if (S.mode === 'play' || S.mode === 'dying') update(dt);
    else if (S.mode === 'delivery' && !document.hidden) updateDelivery(dt);
    render();
    if (now - lastAmbience > 80) { lastAmbience = now; sound.ambience(ambienceState()); }
    requestAnimationFrame(loop);
  }

  function start(data) {
    data = data || {};
    best = typeof data.best === 'number' ? data.best : load('stickarmy.best.2', 0);
    sound.muted = typeof data.muted === 'boolean' ? data.muted : load('stickarmy.muted', false);
    fit();
    titleScene();
    updateMuteBtn();
    requestAnimationFrame(loop);
  }

  start();
  // The tuning UI and its bridge exist only in opt-in development mode.
  if (hashTokens().indexOf('tune') >= 0) {
    window.StickArmyTune = {
      getValues: function () {
        return Object.assign({ CAPTURE_SPEED: CAPTURE_SPEED, RIFLE_COOLDOWN: ENEMIES.rifle.cooldown, RIFLE_SPREAD: ENEMIES.rifle.spread }, BALANCE);
      },
      setValue: function (key, value) {
        if (!Number.isFinite(value)) return;
        var before = S.spawn && S.spawn.cfg;
        if (key === 'CAPTURE_SPEED') CAPTURE_SPEED = value;
        else if (key === 'RIFLE_COOLDOWN') { ENEMIES.rifle.cooldown = value; S.recruits.forEach(function (r) { if (r.type === 'rifle') r.cd = Math.min(r.cd, value); }); }
        else if (key === 'RIFLE_SPREAD') ENEMIES.rifle.spread = value;
        else if (Object.prototype.hasOwnProperty.call(BALANCE, key)) BALANCE[key] = value;
        else return;
        if (key === 'BOSS_HP_PER_WAVE') S.planes.forEach(function (p) {
          if (p.kind !== 'zeppelin' || p.state !== 'fly') return;
          var left = p.hp / p.maxHp; p.maxHp = zeppelinHP(S.wave); p.hp = Math.max(1, left * p.maxHp);
        });
        if (before) {
          var after = waveCfg(Math.max(1, S.wave));
          if (S.waveState === 'active') S.spawn.planes = Math.max(0, S.spawn.planes + after.planes - before.planes);
          S.spawn.cfg = after;
          S.troopers.forEach(function (t) { if (t.state === 'chute') t.fall *= after.fall / before.fall; });
          if (key === 'DROP_CHANCE' || key === 'DROPS_PER_WAVE') {
            S.planes.forEach(function (p) {
              if (p.kind !== 'plane' || p.state !== 'fly' || !p.drops.length) return;
              var count = Math.max(1, Math.min(6, p.drops.length + after.maxDrops - before.maxDrops));
              p.drops = [];
              for (var tries = 0; tries < count * 30 && p.drops.length < count; tries++) {
                var x = pickDropX(p.rng); if ((x - p.x) * p.dir > 0) p.drops.push(x);
              }
              p.drops.sort(function (a, b) { return p.dir * (a - b); });
              p.kits = p.drops.map(function () { return rollTrooper(p.rng); });
            });
          }
        }
      },
      releaseInput: clearInput
    };
    var tuneScript = document.createElement('script');
    tuneScript.src = document.currentScript.getAttribute('data-tune-src') || 'tune.js';
    document.head.appendChild(tuneScript);
  }

})();
