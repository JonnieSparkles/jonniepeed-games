// The top-down engine (the 48th Floor's factory): seen from above at a slight tilt, like Smash TV. Unruggabull moves
// and aims on two sticks; the blaster fires where he aims and the katana sweeps an arc in front of him with a short
// lunge. Carpshits fly at him (flyers), keep away and throw bobbins (armored), or roll at him as rugs and unroll (rolls).
// The floor (floor48.js) owns the room: its solids, belts, machines and story. This file owns him, his weapons, the
// carpshits and their bobbins, the camera, and the drawing of all of it.
// Coordinates: a world in picture pixels (x across, y down the floor); things that fly have a height h above the floor.
// Drawing is in picture pixels (callers scale the game's context by half), shifted by the camera.
// Outcomes use the seeded stream (core.rr); flapping, sparks, smoke and shake use Math.random.
var UnrugTopdown = function (core, tuning) {
  'use strict';
  const { A, Snd, TUNE, clamp, rr, emit, free, hurtBull, rect, line, disc, otxt, twin, input, keys } = core;
  const TD = Object.assign({
    world: { w: 800, h: 450 }, bounds: { x0: 14, y0: 58, x1: 786, y1: 440 }, view: { w: 480, h: 270 },
    speed: 108, radius: 7, accel: 14,
    fireEvery: .12, shotSpeed: 360, shotLife: .85, shotRadius: 3, spreadAngle: .2,
    assist: { stick: .2, keys: .16, mouse: .07 },   // how far (radians) the blaster leans to a target in its line
    slashT: .17, slashCd: .32, slashReach: 46, slashArc: 1.35, parry: 60, lunge: 7.5, lungeT: .09,   // the lunge: a quarter of the first build's 30 (owner, Oct 13)
    slashDamage: 4,
    knock: 150, contactKick: 60,
    flyer: { r: 11, h: 15, speed: 60, turn: 2.6, spread: 26, hp: 1 },
    armored: { r: 12, h: 17, speed: 46, keep: [115, 160], throwFirst: [2.4, 3.4], throwEvery: [4.6, 6.6], bobbin: 104, inFlight: 2, hp: 2 },
    roll: { r: 10, h: 5, aimT: .75, speed: 160, life: 1.9, bounces: 1, hp: 2 },
    bobbin: { r: 5, life: 3, deflectSpeed: 260, damage: 3, wind: .45 },   // wind: the thrower glows this long before it lets go
    // the big one: a shag rug twice the size; slow, tough, charges; the katana staggers it; it splits into two flyers
    shag: { r: 18, h: 16, speed: 30, hp: 14, slash: 5, stagger: .7, aimT: .6, dash: 210, dashT: .45, every: [2.6, 3.8], split: 2 },
    // a spinner's thread: it tangles him (half speed) rather than hurting; the katana cuts it, bolts pass through
    thread: { r: 6, speed: 120, life: 2.6, tangle: 1.6, slow: .5 },
    // power-ups from broken machines: seconds each, Rapid's fire interval, Pierce's damage to a machine
    power: { secs: 10, rapidEvery: .085, pierceMachine: 1 },
    most: 14, lead: 34
  }, tuning);
  let R, bull, g = core.g, swing = 0;
  const B = UnrugBull;

  // ---------- Unruggabull, drawn at half size from his existing poses ----------
  // Each 2 x 2 block of the full-size pose becomes one pixel: kept if at least two are solid, the outline's dark where
  // the block is on an edge, otherwise the colours averaged. The 64-colour palette tidies the result.
  function half(src) {
    const w = Math.ceil(src.width / 2), h = Math.ceil(src.height / 2), c = A.canvas(w, h), x = c.getContext('2d');
    const sd = src.getContext('2d').getImageData(0, 0, src.width, src.height).data, out = x.createImageData(w, h), od = out.data;
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
      let n = 0, r = 0, gg = 0, b = 0, dark = -1, dl = 999;
      for (let k = 0; k < 4; k++) {
        const sx = X * 2 + (k & 1), sy = y * 2 + (k >> 1);
        if (sx >= src.width || sy >= src.height) continue;
        const i = (sy * src.width + sx) * 4; if (sd[i + 3] < 128) continue;
        n++; r += sd[i]; gg += sd[i + 1]; b += sd[i + 2];
        const l = sd[i] + sd[i + 1] + sd[i + 2]; if (l < dl) { dl = l; dark = i; }
      }
      if (n < 2) continue;
      const o = (y * w + X) * 4;
      if (n < 4 && dl < 90) { od[o] = sd[dark]; od[o + 1] = sd[dark + 1]; od[o + 2] = sd[dark + 2]; }
      else { od[o] = r / n; od[o + 1] = gg / n; od[o + 2] = b / n; }
      od[o + 3] = 255;
    }
    x.putImageData(out, 0, 0); return c;
  }
  const SPR = (() => {
    const p = rows => half(B.paint(rows));
    const side = {}, back = {};
    for (const k of ['aim', 'idle', 'run0', 'run1', 'run2', 'run3', 'wind', 'cut', 'hurt']) side[k] = p(B.SIDES[k]);
    for (const k of ['stand', 'aim', 'runA', 'runB', 'runAimA', 'runAimB', 'wind', 'slash', 'hurt']) back[k] = p(B.POSES[k]);
    const front = p(B.VIEWS.front);
    return { side, back, front, sideFeet: { x: B.SIDE_FEET.x / 2, y: B.SIDE_FEET.y / 2 }, backFeet: { x: B.FEET.x / 2, y: B.FEET.y / 2 },
      frontFeet: { x: B.VIEW_FEET.x / 2, y: B.VIEW_FEET.y / 2 } };
  })();
  const CARP = A.CARPF.map(c => c), CARP_W = Math.round(A.CARPF[0].width * .5), CARP_H = Math.round(A.CARPF[0].height * .5);

  // ---------- the run ----------
  function newRun(r, b, opts = {}) {
    R = r; bull = b; swing = 0;
    bull.x = opts.x == null ? TD.world.w / 2 : opts.x; bull.y = opts.y == null ? TD.bounds.y1 - 12 : opts.y;
    bull.vx = bull.vy = 0; bull.ax = 0; bull.ay = -1; bull.slash = -1; bull.cd = 0; bull.inv = 0; bull.step = 0; bull.kx = bull.ky = 0;
    bull.lunge = 0; bull.dir = 'up'; bull.face = 1; bull.idle = 0;
    R.td = { enemies: [], thrown: [], fx: [], cam: { x: 0, y: 0 }, solids: () => [], push: () => null, machineHit: () => false,
      slashMachines: () => 0, targets: () => [], locked: false, pickups: [], streams: 0, bend: 0, scatter: 0, shake: 0, aimSource: 'move', fireHeld: false, rugged: null };
    camTo(true);
  }
  // the room's hooks: solids (rects he can't walk through), belts (a push where he stands), machines (shots and blades)
  function room(h) { Object.assign(R.td, h); }

  // ---------- input ----------
  function moveVec() {
    const k = twin.kb;
    let x = (k.right ? 1 : 0) - (k.left ? 1 : 0) + twin.padX, y = (k.down ? 1 : 0) - (k.up ? 1 : 0) + twin.padY;
    const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; }
    return { x, y };
  }
  // Where he aims and whether he's firing: the aim stick, the arrow keys, the mouse (if it moved lately or is held),
  // else where he's moving or last aimed.
  function aimVec() {
    const k = twin.kb, kx = (k.aimRight ? 1 : 0) - (k.aimLeft ? 1 : 0), ky = (k.aimDown ? 1 : 0) - (k.aimUp ? 1 : 0);
    if (twin.aiming) return { x: twin.aimX, y: twin.aimY, fire: true, src: 'stick' };
    if (kx || ky) { const d = Math.hypot(kx, ky); return { x: kx / d, y: ky / d, fire: true, src: 'keys' }; }
    if (twin.mouse.on && (twin.mouse.down || R.t - twin.mouse.t < 3)) {
      const s = screenOf(bull.x, bull.y - 18), dx = twin.mouse.x - s.x, dy = twin.mouse.y - s.y, d = Math.hypot(dx, dy);
      if (d > 4) return { x: dx / d, y: dy / d, fire: twin.mouse.down, src: 'mouse' };
      return { x: bull.ax, y: bull.ay, fire: twin.mouse.down, src: 'mouse' };
    }
    const m = moveVec(), md = Math.hypot(m.x, m.y), held = keys.kbShoot || input.shoot > 0;
    if (md > .2) return { x: m.x / md, y: m.y / md, fire: held, src: 'move' };
    return { x: bull.ax, y: bull.ay, fire: held, src: 'move' };
  }

  // ---------- him ----------
  const solidAt = (x, y, r) => R.td.solids().some(s => x + r > s.x0 && x - r < s.x1 && y + r * .6 > s.y0 && y - r * .6 < s.y1);
  function tryMove(dx, dy) {
    const b = TD.bounds, r = TD.radius;
    let nx = clamp(bull.x + dx, b.x0 + r, b.x1 - r);
    if (!solidAt(nx, bull.y, r)) bull.x = nx;
    let ny = clamp(bull.y + dy, b.y0 + r, b.y1 - r);
    if (!solidAt(bull.x, ny, r)) bull.y = ny;
  }
  function moveBull(dt) {
    const b = bull;
    input.slash = Math.max(0, input.slash - dt); input.shoot = Math.max(0, input.shoot - dt); input.jump = 0;
    b.inv = Math.max(0, b.inv - dt); b.cd = Math.max(0, b.cd - dt); b.stag = Math.max(0, (b.stag || 0) - dt); b.aimT = Math.max(0, (b.aimT || 0) - dt);
    if (b.slash >= 0) { b.slash += dt; if (b.slash >= TD.slashT) b.slash = -1; }
    if (R.phase === 'dead' || R.td.locked) { b.vx = b.vy = 0; return; }
    b.tangle = Math.max(0, (b.tangle || 0) - dt);
    const m = moveVec(), spd = TD.speed * (R.bullRun > 0 ? 1.7 : 1) * (b.tangle > 0 ? TD.thread.slow : 1);
    const k = 1 - Math.exp(-TD.accel * dt);
    b.vx += (m.x * spd - b.vx) * k; b.vy += (m.y * spd - b.vy) * k;
    const belt = R.td.push(b.x, b.y);
    let dx = b.vx * dt + b.kx * dt, dy = b.vy * dt + b.ky * dt;
    if (belt) { dx += belt.x * dt; dy += belt.y * dt; }
    if (b.lunge > 0) { const l = Math.min(b.lunge, dt); dx += b.lax * TD.lunge / TD.lungeT * l; dy += b.lay * TD.lunge / TD.lungeT * l; b.lunge -= l; }
    tryMove(dx, dy);
    b.kx *= Math.pow(.002, dt); b.ky *= Math.pow(.002, dt);
    const moving = Math.hypot(m.x, m.y) > .2;
    if (moving) b.step += dt * 9;
    const a = aimVec(); R.td.aimSource = a.src; R.td.fireHeld = a.fire;
    b.ax = a.x; b.ay = a.y;
    b.dir = b.ay < -.62 ? 'up' : b.ay > .62 ? 'down' : 'side';
    if (Math.abs(b.ax) > .1) b.face = b.ax > 0 ? 1 : -1;
    b.idle = moving || a.fire || b.slash >= 0 ? 0 : (b.idle || 0) + dt;
    if (input.slash > 0 && b.cd <= 0) { input.slash = 0; slash(); }
    if (b.slash >= 0 && b.slash < TD.slashT) slashHits();
    R.fireT -= dt;
    if ((a.fire || input.shoot > 0) && R.fireT <= 0 && (R.phase === 'boss')) { input.shoot = 0; R.fireT = fire() ? (R.rapid > 0 ? TD.power.rapidEvery : TD.fireEvery) : .25; }
  }

  // ---------- the blaster ----------
  // where the bolt leaves the gun: out in front of him at chest height, along the aim
  const muzzle = () => ({ x: bull.x + bull.ax * 13, y: bull.y + bull.ay * 6, h: 18 - Math.max(0, bull.ay) * 3 });
  function assist(ax, ay) {
    const lean = TD.assist[R.td.aimSource] || TD.assist.keys, mz = muzzle();
    let best = null, bd = Infinity;
    const consider = (x, y) => {
      const dx = x - mz.x, dy = y - mz.y, d = Math.hypot(dx, dy); if (d < 8 || d > 300) return;
      const off = Math.acos(clamp((dx * ax + dy * ay) / d, -1, 1)); if (off > lean) return;
      const score = d * (1 + off * 3); if (score < bd) { bd = score; best = { x: dx / d, y: dy / d }; }
    };
    // carpshits first; a machine only when no carpshit is in the line
    for (const e of R.td.enemies) if (!e.dead && !e.spawning) consider(e.x, e.y);
    if (!best) for (const t of R.td.targets()) consider(t.x, t.y);
    return best || { x: ax, y: ay };
  }
  function fire() {
    // run dry, it overheats and sputters, as on every floor (core.overheat, core.sputter); the sputter's sparks and smoke
    // are drawn here, at the muzzle
    if (!R.gold && (R.charge < 1 || core.hot())) {
      if (R.hot) { const m = muzzle(); for (let i = 0; i < 3; i++) R.td.fx.push({ k: 'spark', x: m.x + core.fxr(-3, 3), y: m.y + core.fxr(-2, 2), h: m.h, vx: 0, vy: 0, vh: 0, col: '#ff9628', t: 0, dur: .12 }); R.td.fx.push({ k: 'smoke', x: m.x, y: m.y, h: m.h + 2, vx: core.fxr(-4, 4), vy: 0, s: 4, t: 0, dur: .6 }); }
      return core.sputter();
    }
    R.hot = false;
    if (!R.gold) R.charge--;
    if (!R.gold && R.charge < 1) { const s = screenOf(bull.x, bull.y - 30); core.overheat(s.x / 2, s.y / 2); }
    bull.aimT = .14;
    const d = assist(bull.ax, bull.ay), mz = muzzle(), base = Math.atan2(d.y, d.x);
    const bolt = (a, extra) => R.shots.push(Object.assign({ x: mz.x, y: mz.y, h: mz.h, vx: Math.cos(a) * TD.shotSpeed, vy: Math.sin(a) * TD.shotSpeed, t: 0, a, dead: false }, extra));
    bolt(base, R.pierce > 0 ? { pierce: true, hits: [] } : null);
    if (R.spread > 0) for (const o of [-1, 1]) bolt(base + o * TD.spreadAngle, Object.assign({ spread: true }, R.pierce > 0 ? { pierce: true, hits: [] } : {}));
    // the souls' streams: shots either side of the bolt, from the muzzle; while they bend in (td.bend 0..1) they lean
    // toward the bolt's line further out (the near miss), and when p(Loom) scatters them they fly wide
    const n = R.td.streams;
    if (n > 0) {
      const offs = n === 1 ? [1] : n === 2 ? [-1, 1] : n === 3 ? [-1, 1, 2] : [-2, -1, 1, 2];
      for (const o of offs) bolt(base + o * (.07 + R.td.bend * .05) + (R.td.scatter ? o * .35 * R.td.scatter : 0), { soul: true, side: o, bend: R.td.bend, ba: base, ox: mz.x, oy: mz.y, pierce: true, hits: [] });
    }
    R.events.shots = (R.events.shots || 0) + 1;
    R.td.fx.push({ k: 'muzzle', x: mz.x, y: mz.y, h: mz.h, t: 0, dur: .07 });
    Snd.play('shot', n > 0 ? 'soft' : R.spread > 0);
    if (n > 0) Snd.play('stream', R.td.bend);
    return true;
  }
  function stepShots(dt) {
    for (const s of R.shots) {
      s.t += dt;
      // bending streams curve toward the bolt's line as they fly (drawn as ribbons), never quite meeting
      if (s.soul && s.bend > 0) {
        // pulled toward the bolt's line (through the muzzle along the aim), harder the further it's got
        const c = Math.cos(s.ba), sn = Math.sin(s.ba), lat = (s.x - s.ox) * -sn + (s.y - s.oy) * c, pull = -lat * s.bend * 34 * dt;
        s.vx += -sn * pull; s.vy += c * pull;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.t > TD.shotLife) { s.dead = true; continue; }
      const b = TD.bounds;
      if (s.x < b.x0 - 6 || s.x > b.x1 + 6 || s.y < b.y0 - 30 || s.y > b.y1 + 10) { s.dead = true; puff(s.x, s.y, s.h, 3); continue; }
      let hit = false;
      for (const e of R.td.enemies) {
        if (e.dead || e.spawning || (s.pierce && s.hits.includes(e))) continue;
        const r = (TD[e.kind] || TD.flyer).r + TD.shotRadius;
        if ((s.x - e.x) ** 2 + (s.y - e.y) ** 2 < r * r) {
          damage(e, 1, 'shot');
          if (s.pierce) s.hits.push(e); else { s.dead = hit = true; break; }
        }
      }
      if (hit) continue;
      // bobbins and threads: bolts pass through; only the katana answers them
      if (s.soul) continue;   // the souls' streams pass through; on the 48th Floor's reserve the floor sweeps their ribbons
      if (R.td.machineHit(s.x, s.y, s.pierce ? TD.power.pierceMachine : 1, 'shot')) { s.dead = true; sparks(s.x, s.y, s.h, s.pierce ? '#c9a0ff' : '#ffd44a', 4); }
    }
    R.shots = R.shots.filter(s => !s.dead);
  }

  // ---------- the katana ----------
  // A wide arc where he aims (or at the nearest threat in reach if he isn't aiming), with a short lunge that way.
  // the nearest threat in reach: a bobbin or thread on its way first, then a carpshit
  function nearestThreat() {
    let best = null, bd = TD.parry + 30;
    for (const p of R.td.thrown) if (!p.dead && !p.friendly) { const d = Math.hypot(p.x - bull.x, p.y - bull.y); if (d < bd) { bd = d; best = p; } }
    if (best) return best;
    bd = TD.slashReach + 30;
    for (const e of R.td.enemies) if (!e.dead) { const d = Math.hypot(e.x - bull.x, e.y - bull.y); if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function slash() {
    let ax = bull.ax, ay = bull.ay, auto = false;
    if (twin.flick && !twin.flick.auto) { ax = twin.flick.x; ay = twin.flick.y; }
    else auto = !!twin.flick || (R.td.aimSource === 'move' && !R.td.fireHeld);
    twin.flick = null;
    if (auto) { const best = nearestThreat(); if (best) { const d = Math.hypot(best.x - bull.x, best.y - bull.y) || 1; ax = (best.x - bull.x) / d; ay = (best.y - bull.y) / d; } }
    bull.ax = ax; bull.ay = ay; bull.dir = ay < -.62 ? 'up' : ay > .62 ? 'down' : 'side'; if (Math.abs(ax) > .1) bull.face = ax > 0 ? 1 : -1;
    bull.sx = ax; bull.sy = ay;
    bull.slash = 0; bull.cd = TD.slashCd; swing++;
    bull.lunge = TD.lungeT; bull.lax = ax; bull.lay = ay;
    Snd.play('slash'); emit('slash');
    slashHits();
  }
  const inArc = (x, y, extra = 0) => {
    const cx = bull.x, cy = bull.y - 4, dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
    if (d > TD.slashReach + extra) return false;
    if (d < 10) return true;
    return (dx * bull.sx + dy * bull.sy) / d > Math.cos(TD.slashArc / 2 + (extra ? .25 : 0));
  };
  function slashHits() {
    for (const e of R.td.enemies) if (!e.dead && !e.spawning && e.swing !== swing && inArc(e.x, e.y, (TD[e.kind] || TD.flyer).r)) {
      e.swing = swing;
      if (e.kind === 'shag') { staggerShag(e); damage(e, TD.shag.slash, 'slash'); }
      else damage(e, 99, 'slash');
    }
    // a bobbin or a thread close to him is caught from any side, not only in the arc (owner, Oct 13: deflects should be easier)
    for (const p of R.td.thrown) if (!p.dead && !p.friendly && (inArc(p.x, p.y, 6) || Math.hypot(p.x - bull.x, p.y - bull.y + 4) < TD.parry)) { if (p.kind === 'thread') cutThread(p); else deflect(p); }
    if (bull.slashMach !== swing) {
      const n = R.td.slashMachines(bull.x + bull.sx * TD.slashReach * .6, bull.y - 4 + bull.sy * TD.slashReach * .6, TD.slashReach * .6, TD.slashDamage, swing);
      if (n) { bull.slashMach = swing; R.freeze = Math.max(R.freeze, .04); }
    }
  }
  // a thread cut in the air: it falls apart in sparks
  function cutThread(p) {
    p.dead = true; Snd.play('snareCut'); emit('td_thread_cut');
    for (let i = 0; i < 6; i++) R.td.fx.push({ k: 'spark', x: p.x, y: p.y, h: p.h, vx: (Math.random() - .5) * 120, vy: (Math.random() - .5) * 60, vh: 40, col: i % 2 ? '#ffd060' : '#ff7a2a', t: 0, dur: .35 });
  }
  // the shag reels from a cut: its charge is stopped and it's knocked back
  function staggerShag(e) {
    e.stag = TD.shag.stagger; e.st = 'walk'; e.t = 0; e.next = Math.max(e.next || 0, 1.4);
    const dx = e.x - bull.x, dy = e.y - bull.y, d = Math.hypot(dx, dy) || 1; e.vx = dx / d * 140; e.vy = dy / d * 140;
    emit('td_shag_stagger');
  }
  // a bobbin knocked back: at whoever threw it, else where he aims; it hits hard
  function deflect(p) {
    p.friendly = true;
    const tgt = p.src && !p.src.dead ? p.src : null, dx = tgt ? tgt.x - p.x : bull.sx, dy = tgt ? tgt.y - p.y : bull.sy, d = Math.hypot(dx, dy) || 1;
    p.vx = dx / d * TD.bobbin.deflectSpeed; p.vy = dy / d * TD.bobbin.deflectSpeed; p.t = 0;
    R.charge = Math.min(TUNE.charges, R.charge + TUNE.deflectCharge); R.chargeFlash = .3;
    R.events.deflects = (R.events.deflects || 0) + 1; emit('deflect', { kind: 'bobbin' }); Snd.play('deflect');
    sparks(p.x, p.y, 10, '#7fd4ff', 6);
  }

  // ---------- the carpshits ----------
  // kind 'flyer' chases, 'armored' keeps its distance and throws bobbins, 'roll' rolls at him and unrolls into a flyer.
  // opts: x, y (where it leaves the line), vx, vy (its launch), pace (Production Panic's speed-up)
  function spawn(kind, opts = {}) {
    const T8 = TD[kind];
    const e = { kind, x: opts.x, y: opts.y, h: kind === 'roll' ? T8.h : 6, vx: opts.vx || 0, vy: opts.vy || 0, hp: T8.hp, dead: false, age: 0,
      ph: rr(0, 6), hit: 0, pace: opts.pace || 1, line: opts.line, spawning: .35, armored: kind === 'armored' };
    if (kind === 'armored') { e.keep = rr(...T8.keep); e.nextThrow = rr(...T8.throwFirst); e.orbit = rr(0, 1) < .5 ? 1 : -1; }
    if (kind === 'roll') { e.st = 'aim'; e.t = 0; e.bounces = 0; }
    if (kind === 'shag') { e.st = 'walk'; e.t = 0; e.next = rr(...T8.every); e.spawning = .5; }
    R.td.enemies.push(e); emit('td_spawn', { kind, line: opts.line }); return e;
  }
  function damage(e, n, by) {
    if (e.dead) return;
    if (by === 'shot' && e.kind === 'armored' && e.armored) { e.armored = false; e.hit = .15; Snd.play('armorClank'); emit('arena_armor', { kind: e.kind, by });
      R.td.fx.push({ k: 'helmet', x: e.x, y: e.y, h: e.h + 10, vx: bull.ax * 60, vy: bull.ay * 30, vh: 90, r: 0, t: 0, dur: 1.6 }); return; }
    e.hp -= n; e.hit = .1;
    if (e.hp > 0) { Snd.play('hit'); sparks(e.x, e.y, e.h, '#ffd44a', 4); return; }
    kill(e, by);
  }
  function kill(e, by) {
    if (e.dead) return;
    e.dead = true; R.freeze = Math.max(R.freeze, by === 'slash' ? .06 : .03);
    const s = screenOf(e.x, e.y - e.h);
    free(s.x / 2, s.y / 2 - 3, e.kind === 'roll' ? 'roll' : 'carpshit', by);
    Snd.play('poof');
    if (by === 'slash') {
      for (const sd of [-1, 1]) R.td.fx.push({ k: 'half', x: e.x, y: e.y, h: e.h, vx: -bull.sy * sd * 70 + bull.sx * 30, vy: bull.sx * sd * 50 + bull.sy * 30, vh: 60, r: 0, vr: sd * 7, top: sd < 0, roll: e.kind === 'roll', t: 0, dur: .55 });
      R.charge = Math.min(TUNE.charges, R.charge + (TD.slashRefill || 2)); R.chargeFlash = .2;
    } else puff(e.x, e.y, e.h, 7);
    if (e.kind === 'shag') {
      // it comes apart into two flyers, flung either side
      for (const sd of [-1, 1]) { const f = spawn('flyer', { x: e.x + sd * 10, y: e.y, vx: sd * 90, vy: rr(-30, 30), pace: e.pace, line: e.line }); f.spawning = .3; }
      R.shake = Math.max(R.shake, .12); Snd.play('machineBreak');
    }
    emit('td_kill', { kind: e.kind, by, line: e.line });
  }
  // everything in a blast dies (the machines' explosions; they never hurt him)
  function blast(x, y, r, by) {
    let n = 0;
    for (const e of R.td.enemies) if (!e.dead && (e.x - x) ** 2 + (e.y - y) ** 2 < r * r) { kill(e, by || 'blast'); n++; }
    for (const p of R.td.thrown) if (!p.dead && (p.x - x) ** 2 + (p.y - y) ** 2 < r * r) p.dead = true;
    return n;
  }
  function contact(e, cause) {
    if (R.bullRun > 0) { kill(e, 'bullRun'); return; }
    const dx = bull.x - e.x, dy = bull.y - e.y, d = Math.hypot(dx, dy) || 1;
    if (hurtBull(1, cause)) {
      bull.kx = dx / d * TD.knock; bull.ky = dy / d * TD.knock;
      e.vx = -dx / d * TD.contactKick; e.vy = -dy / d * TD.contactKick; e.stun = .5;
    }
  }
  function stepEnemies(dt) {
    const L = R.td.enemies, T8 = TD;
    for (const e of L) {
      if (e.dead) continue;
      e.age += dt; e.hit = Math.max(0, e.hit - dt); e.stun = Math.max(0, (e.stun || 0) - dt);
      if (e.spawning > 0) { e.spawning = Math.max(0, e.spawning - dt); e.x += e.vx * dt; e.y += e.vy * dt; e.h += (T8[e.kind].h - e.h) * Math.min(1, dt * 6); continue; }
      const dx = bull.x - e.x, dy = bull.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (e.kind === 'roll') { stepRoll(e, dt, dx, dy, d); continue; }
      if (e.kind === 'shag') { stepShag(e, dt, dx, dy, d); if (R.phase === 'dead') break; continue; }
      const P = T8[e.kind], sp = P.speed * e.pace;
      let wx, wy;
      if (e.kind === 'flyer') { wx = dx / d * sp; wy = dy / d * sp; }
      else {
        // armored: hold a ring around him, circling, and throw
        const want = d > e.keep + 14 ? 1 : d < e.keep - 14 ? -1 : 0;
        wx = (dx / d * want + -dy / d * e.orbit * .6) * sp; wy = (dy / d * want + dx / d * e.orbit * .6) * sp;
        e.nextThrow -= dt;
        // it only throws from where he can see it (on screen), and not too close
        const c = R.td.cam, seen = e.x > c.x + 8 && e.x < c.x + TD.view.w - 8 && e.y - e.h > c.y + 24 && e.y < c.y + TD.view.h - 4;
        if (e.wind > 0) { e.wind -= dt; if (e.wind <= 0) { e.wind = 0; throwBobbin(e); e.nextThrow = rr(...P.throwEvery); } }
        else if (e.nextThrow <= 0 && seen && d > 50 && R.td.thrown.filter(p => !p.friendly && p.kind !== 'thread').length < P.inFlight) { e.wind = TD.bobbin.wind; emit('td_wind'); }
      }
      // keep apart
      for (const o of L) {
        if (o === e || o.dead || o.kind === 'roll') continue;
        const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy);
        if (od < T8.flyer.spread && od > .01) { const push = (T8.flyer.spread - od) / T8.flyer.spread * 90; wx += ox / od * push; wy += oy / od * push; }
      }
      const turn = 1 - Math.exp(-(e.stun > 0 ? .5 : P.turn || 3) * dt);
      e.vx += (wx - e.vx) * turn; e.vy += (wy - e.vy) * turn;
      e.x = clamp(e.x + e.vx * dt, TD.bounds.x0 + 6, TD.bounds.x1 - 6); e.y = clamp(e.y + e.vy * dt, TD.bounds.y0, TD.bounds.y1 - 4);
      e.h = P.h + Math.sin(e.age * 4 + e.ph) * 2;
      if (d < P.r + TD.radius + 2 && !e.stun) contact(e, e.kind === 'armored' ? 'armored' : 'chaser');
      if (R.phase === 'dead') break;
    }
    R.td.enemies = L.filter(e => !e.dead);
  }
  // The shag lumbers after him; every few seconds it plants, shudders (aimT) and charges in a straight line. A cut
  // staggers it and knocks it back.
  function stepShag(e, dt, dx, dy, d) {
    const P = TD.shag;
    e.stag = Math.max(0, (e.stag || 0) - dt); e.t += dt;
    if (e.stag > 0) { e.vx *= Math.pow(.02, dt); e.vy *= Math.pow(.02, dt); }
    else if (e.st === 'walk') {
      const sp = P.speed * e.pace, k = 1 - Math.exp(-2 * dt);
      e.vx += (dx / d * sp - e.vx) * k; e.vy += (dy / d * sp - e.vy) * k;
      e.next -= dt;
      if (e.next <= 0 && d < 240) { e.st = 'aim'; e.t = 0; e.tx = dx / d; e.ty = dy / d; e.vx = e.vy = 0; Snd.play('rev'); emit('td_shag_aim'); }
    } else if (e.st === 'aim') {
      e.tx = dx / d; e.ty = dy / d;
      if (e.t >= P.aimT) { e.st = 'dash'; e.t = 0; e.vx = e.tx * P.dash * Math.min(1.25, e.pace); e.vy = e.ty * P.dash * Math.min(1.25, e.pace); Snd.play('roll'); }
    } else if (e.st === 'dash' && e.t >= P.dashT) { e.st = 'walk'; e.t = 0; e.next = rr(...P.every); }
    const b = TD.bounds, nx = clamp(e.x + e.vx * dt, b.x0 + P.r, b.x1 - P.r), ny = clamp(e.y + e.vy * dt, b.y0 + 4, b.y1 - P.r * .5);
    if (!R.td.solids().some(s => nx + P.r * .7 > s.x0 && nx - P.r * .7 < s.x1 && ny + 6 > s.y0 && ny - 6 < s.y1)) { e.x = nx; e.y = ny; }
    else if (e.st === 'dash') { e.st = 'walk'; e.t = 0; e.next = rr(...P.every); e.vx = -e.vx * .3; e.vy = -e.vy * .3; Q8shake(); }
    e.h = P.h + (e.st === 'aim' ? Math.sin(e.t * 50) : Math.sin(e.age * 3 + e.ph)) * 1.5;
    if (d < P.r + TD.radius && !(e.stun > 0)) { contact(e, 'shag'); e.stun = .6; if (e.st === 'dash') { e.st = 'walk'; e.next = rr(...P.every); } }
  }
  const Q8shake = () => { R.shake = Math.max(R.shake, .08); Snd.play('press'); };
  // A roll shudders and points at him, then barrels straight, bounces off a wall or machine once, and unrolls.
  function stepRoll(e, dt, dx, dy, d) {
    const P = TD.roll;
    e.t += dt;
    if (e.st === 'aim') {
      e.tx = dx / d; e.ty = dy / d;
      if (e.t >= P.aimT) { e.st = 'go'; e.t = 0; e.vx = e.tx * P.speed * Math.min(1.35, e.pace); e.vy = e.ty * P.speed * Math.min(1.35, e.pace); Snd.play('roll'); emit('td_roll'); }
      return;
    }
    const b = TD.bounds; let nx = e.x + e.vx * dt, ny = e.y + e.vy * dt, bounced = false;
    if (nx < b.x0 + P.r || nx > b.x1 - P.r) { e.vx = -e.vx; bounced = true; nx = clamp(nx, b.x0 + P.r, b.x1 - P.r); }
    if (ny < b.y0 + P.r || ny > b.y1 - P.r) { e.vy = -e.vy; bounced = true; ny = clamp(ny, b.y0 + P.r, b.y1 - P.r); }
    if (!bounced && R.td.solids().some(s => nx + P.r > s.x0 && nx - P.r < s.x1 && ny + P.r * .6 > s.y0 && ny - P.r * .6 < s.y1)) {
      const hitX = R.td.solids().some(s => nx + P.r > s.x0 && nx - P.r < s.x1 && e.y + P.r * .6 > s.y0 && e.y - P.r * .6 < s.y1);
      if (hitX) e.vx = -e.vx; else e.vy = -e.vy; bounced = true; nx = e.x; ny = e.y;
    }
    e.x = nx; e.y = ny; e.spin = (e.spin || 0) + Math.hypot(e.vx, e.vy) * dt * .15;
    if (bounced) { e.bounces++; Snd.play('press'); }
    if (Math.hypot(bull.x - e.x, bull.y - e.y) < P.r + TD.radius + 2 && !e.hitHim) { e.hitHim = true; contact(e, 'roll'); e.vx *= -.4; e.vy *= -.4; }
    if (e.t > P.life || e.bounces > P.bounces) unroll(e);
  }
  function unroll(e) {
    e.dead = true;
    const f = spawn('flyer', { x: e.x, y: e.y, pace: e.pace, line: e.line }); f.spawning = .3; f.h = 4; f.unrolled = true;
    puff(e.x, e.y, 4, 6); emit('td_unroll');
  }
  function throwBobbin(e) {
    const P = TD.armored, lead = .15, tx = bull.x + bull.vx * lead, ty = bull.y + bull.vy * lead, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    R.td.thrown.push({ x: e.x, y: e.y, h: e.h, vx: dx / d * P.bobbin * e.pace, vy: dy / d * P.bobbin * e.pace, src: e, friendly: false, dead: false, r: 0, t: 0 });
    Snd.play('bobbin'); emit('td_throw');
  }
  // a spinner flings a thread at him (the Standard line's hazard)
  function flingThread(x, y, h, ang) {
    const P = TD.thread;
    R.td.thrown.push({ kind: 'thread', x, y, h, vx: Math.cos(ang) * P.speed, vy: Math.sin(ang) * P.speed, friendly: false, dead: false, r: 0, t: 0, ph: Math.random() * 6 });
    emit('td_thread');
  }
  function stepThrown(dt) {
    for (const p of R.td.thrown) {
      p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 14;
      const b = TD.bounds;
      if (p.t > (p.kind === 'thread' ? TD.thread.life : TD.bobbin.life) || p.x < b.x0 || p.x > b.x1 || p.y < b.y0 - 10 || p.y > b.y1) { p.dead = true; continue; }
      if (p.friendly) {
        for (const e of R.td.enemies) if (!e.dead && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (TD[e.kind].r + 5) ** 2) { p.dead = true; damage(e, e.kind === 'shag' ? 6 : 99, 'deflect'); break; }
        if (!p.dead && R.td.machineHit(p.x, p.y, TD.bobbin.damage, 'deflect')) { p.dead = true; sparks(p.x, p.y, 10, '#7fd4ff', 6); }
      } else if (p.kind === 'thread') {
        if (Math.hypot(bull.x - p.x, bull.y - p.y) < TD.thread.r + TD.radius) {
          p.dead = true;
          if (!(R.bullRun > 0) && !(bull.inv > 0)) { bull.tangle = TD.thread.tangle; emit('td_tangle'); Snd.play('snare'); const s = screenOf(bull.x, bull.y - 34); core.popText('TANGLED', s.x / 2, s.y / 2, '#ff9a3c'); }
        }
      } else if (Math.hypot(bull.x - p.x, bull.y - p.y) < TD.bobbin.r + TD.radius) {
        if (R.bullRun > 0) p.dead = true;
        else if (hurtBull(1, 'bobbin')) { p.dead = true; const d = Math.hypot(p.vx, p.vy) || 1; bull.kx = p.vx / d * TD.knock * .6; bull.ky = p.vy / d * TD.knock * .6; }
      }
    }
    R.td.thrown = R.td.thrown.filter(p => !p.dead);
  }
  // pickups on the floor: a RugCo coffee (a heart back) or a Spread Shot; walk over one to take it
  function addPickup(kind, x, y, life) { const p = { kind, x, y, t: 0, life }; R.td.pickups.push(p); Snd.play('appear'); emit('td_pickup_drop', { item: kind }); return p; }
  function stepPickups(dt) {
    for (const p of R.td.pickups) {
      p.t += dt;
      if (p.got || Math.hypot(p.x - bull.x, p.y - bull.y) > 16) continue;
      p.got = true; emit('pickup', { item: p.kind });
      const s = screenOf(p.x, p.y - 20);
      if (p.kind === 'coffee') { const full = R.hearts >= TUNE.hearts; R.hearts = Math.min(TUNE.hearts, R.hearts + 1); core.popText(full ? 'FULL' : '+1 HEART', s.x / 2, s.y / 2, '#ff7050'); Snd.play('coffee'); core.live(full ? 'Coffee. Hearts already full.' : 'Coffee: one heart back.'); if (!full) core.bark('coffee'); }
      else {
        R.charge = TUNE.charges; Snd.play('power');
        if (p.kind === 'rapid') { R.rapid = TD.power.secs; core.popText('RAPID FIRE', s.x / 2, s.y / 2, '#bfefff'); core.live('Rapid fire for ten seconds.'); }
        else if (p.kind === 'pierce') { R.pierce = TD.power.secs; core.popText('PIERCE', s.x / 2, s.y / 2, '#c9a0ff'); core.live('Piercing bolts for ten seconds.'); }
        else { R.spread = TUNE.spreadT; core.popText('SPREAD SHOT', s.x / 2, s.y / 2, '#ffd44a'); core.bark('spread'); core.live('Spread Shot for ten seconds.'); }
      }
    }
    R.td.pickups = R.td.pickups.filter(p => !p.got && !(p.life != null && p.t > p.life));
  }
  // the power-ups' badges, drawn in code: Rapid three white-blue chevrons, Pierce a violet bolt through a ring
  const BADGE = {};
  function badge(kind) {
    if (BADGE[kind]) return BADGE[kind];
    const c = A.canvas(18, 18), x = c.getContext('2d'), P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const ring = kind === 'rapid' ? ['#0c2a40', '#3aa8e0', '#bfefff'] : ['#22103a', '#8a5ad8', '#e6d4ff'];
    x.fillStyle = '#09070b'; x.beginPath(); x.arc(9, 9, 9, 0, 6.29); x.fill();
    x.fillStyle = ring[0]; x.beginPath(); x.arc(9, 9, 8, 0, 6.29); x.fill();
    x.strokeStyle = ring[1]; x.lineWidth = 2; x.beginPath(); x.arc(9, 9, 7, 0, 6.29); x.stroke();
    if (kind === 'rapid') for (let i = 0; i < 3; i++) for (let k = 0; k < 3; k++) { P(4 + i * 4 + k, 6 + k, 1, 1, ring[2]); P(4 + i * 4 + k, 12 - k, 1, 1, ring[2]); }
    else { P(3, 8, 12, 2, ring[2]); P(13, 6, 1, 6, ring[2]); P(14, 7, 1, 4, ring[2]); P(15, 8, 1, 2, ring[2]); P(5, 5, 2, 8, ring[1]); }
    return (BADGE[kind] = c);
  }
  function drawPickup(p) {
    const img = p.kind === 'coffee' ? A.COFFEE : p.kind === 'spread' ? A.SPREAD : badge(p.kind), bob = Math.round(Math.sin(R.t * 4 + p.x) * 2), x = Math.round(p.x), y = Math.round(p.y - 12 + bob);
    shadow(p.x, p.y, 7, .35);
    g.drawImage(img, x - 9, y - 9, 18, 18);
    if (Math.floor(R.t * 6) % 2) { g.save(); g.globalAlpha = .35; g.globalCompositeOperation = 'lighter'; g.drawImage(img, x - 9, y - 9, 18, 18); g.restore(); }
    // it doesn't wait forever: it blinks for its last three seconds
    if (p.life != null && p.life - p.t < 3 && Math.floor(p.t * 8) % 2) { g.save(); g.globalAlpha = .5; rect(g, x - 9, y - 9, 18, 18, '#09070b'); g.restore(); }
  }
  function bullRun() {
    if (!(R.bullRun > 0)) return;
    for (const e of R.td.enemies) if (!e.dead && Math.hypot(e.x - bull.x, e.y - bull.y) < TD[e.kind].r + 12) kill(e, 'bullRun');
    for (const p of R.td.thrown) if (!p.dead && Math.hypot(p.x - bull.x, p.y - bull.y) < 12) p.dead = true;
  }
  function clearThreats(by) {
    for (const e of R.td.enemies) kill(e, by);
    R.td.enemies = []; R.td.thrown = []; R.shots = [];
  }

  // ---------- the camera ----------
  // It follows him with a lead toward where he aims, clamped to the room; shake is added when drawn.
  function camTo(snap) {
    const v = TD.view, w = TD.world, c = R.td.cam, hold = R.td.camHold;
    const tx = hold ? hold.x : clamp(bull.x + bull.ax * TD.lead - v.w / 2, 0, w.w - v.w), ty = hold ? hold.y : clamp(bull.y - 20 + bull.ay * TD.lead * .8 - v.h / 2, 0, w.h - v.h);
    if (snap) { c.x = tx; c.y = ty; return; }
    c.x += (tx - c.x) * .12; c.y += (ty - c.y) * .12;
  }
  const screenOf = (x, y) => ({ x: x - R.td.cam.x, y: y - R.td.cam.y });

  // ---------- effects ----------
  function sparks(x, y, h, col, n = 5) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 40 + Math.random() * 90; R.td.fx.push({ k: 'spark', x, y, h, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .6, vh: 40 + Math.random() * 60, col, t: 0, dur: .3 + Math.random() * .25 }); } }
  function puff(x, y, h, n = 6) { R.td.fx.push({ k: 'puff', x, y, h, n, t: 0, dur: .35 }); }
  function stepFx(dt) {
    for (const f of R.td.fx) {
      f.t += dt;
      if (f.vx != null) { f.x += f.vx * dt; f.y += f.vy * dt; }
      if (f.vh != null) { f.h += f.vh * dt; f.vh -= 260 * dt; if (f.h < 0) { f.h = 0; f.vh *= -.3; if (f.vx != null) { f.vx *= .6; f.vy *= .6; } } }
      if (f.vr) f.r += f.vr * dt;
      if (f.k === 'helmet') f.r += dt * 9;
    }
    R.td.fx = R.td.fx.filter(f => f.t < f.dur);
  }

  function update(dt) {
    moveBull(dt);
    R.rapid = Math.max(0, (R.rapid || 0) - dt); R.pierce = Math.max(0, (R.pierce || 0) - dt);
    if (R.phase !== 'dead') { stepEnemies(dt); stepThrown(dt); bullRun(); stepPickups(dt); }
    stepShots(dt);
    stepFx(dt);
    camTo(false);
  }

  // ---------- drawing (picture pixels; callers scale by half and set the camera) ----------
  function shadow(x, y, w, a = .45) { g.save(); g.globalAlpha = a; g.fillStyle = '#07050a'; g.beginPath(); g.ellipse(Math.round(x), Math.round(y), w, Math.max(2, w * .4), 0, 0, 6.29); g.fill(); g.restore(); }
  function bullPose() {
    const b = bull, d = b.dir, moving = Math.hypot(b.vx, b.vy) > 20, hurt = b.inv > TUNE.hurtInv - .4 && b.stag > 0;
    if (d === 'side') {
      const S = SPR.side, k = hurt ? 'hurt' : b.slash >= 0 ? (b.slash < .05 ? 'wind' : 'cut') : moving ? 'run' + (Math.floor(b.step / 1.3) % 4) : (b.idle > 1.2 && Math.floor(b.idle * 1.3) % 2 ? 'idle' : 'aim');
      return { img: S[k], feet: SPR.sideFeet, flip: b.face < 0 };
    }
    if (d === 'up') {
      const S = SPR.back, k = hurt ? 'hurt' : b.slash >= 0 ? (b.slash < .05 ? 'wind' : 'slash') : moving ? (b.aimT > 0 || R.td.fireHeld ? 'runAim' : 'run') + (Math.floor(b.step / 1.6) % 2 ? 'A' : 'B') : b.aimT > 0 || R.td.fireHeld ? 'aim' : 'stand';
      return { img: S[k], feet: SPR.backFeet, flip: false };
    }
    // facing us: the front view, stepping side to side as he runs
    return { img: SPR.front, feet: SPR.frontFeet, flip: moving && Math.floor(b.step / 1.6) % 2 === 1, bob: moving ? Math.abs(Math.sin(b.step * 1.2)) * 1.5 : 0 };
  }
  function drawBull() {
    const b = bull;
    if (R.phase === 'dead') { drawDeath(); return; }
    shadow(b.x, b.y, 9);
    if (R.bullRun > 0) { g.save(); g.globalAlpha = .4; for (let i = 1; i <= 3; i++) { const p = bullPose(); g.save(); g.translate(Math.round(b.x - b.vx * .02 * i), Math.round(b.y - b.vy * .02 * i)); if (p.flip) g.scale(-1, 1); g.drawImage(p.img, -p.feet.x, -p.feet.y); g.restore(); } g.restore(); }
    if (b.inv > 0 && Math.floor(R.t * 18) % 2 && !(R.bullRun > 0)) return;
    const p = bullPose(), recoil = b.aimT > .08 ? 1.5 : 0;
    g.save(); g.translate(Math.round(b.x - b.ax * recoil), Math.round(b.y - (p.bob || 0) - b.ay * recoil * .5)); if (p.flip) g.scale(-1, 1);
    g.drawImage(p.img, -p.feet.x, -p.feet.y);
    g.restore();
    if (b.tangle > 0) for (let i = 0; i < 3; i++) { const yy = Math.round(b.y - 4 - i * 4), w = 8 + Math.sin(R.t * 9 + i) * 2; core.line(g, Math.round(b.x - w), yy, Math.round(b.x + w), yy + 2, i % 2 ? '#ffd060' : '#ff7a2a'); }
    // facing us there's no gun in hand in the pose: a small blaster held out front
    if (b.dir === 'down') { const mz = muzzle(); rect(g, Math.round(mz.x - 2), Math.round(mz.y - mz.h - 2), 5, 5, '#1a1418'); rect(g, Math.round(mz.x - 1), Math.round(mz.y - mz.h - 1), 3, 3, '#3a6ab0'); }
  }
  // rugged, from above: he sinks and flickers out in blue sparkles; his soul rises (the core draws it in the glow)
  function drawDeath() {
    const t = R.phaseT, s = screenOf(bull.x, bull.y), p = SPR.front;
    if (t < 1.1 && !(t > .8 && Math.floor(t * 30) % 2)) {
      g.save(); g.translate(Math.round(bull.x), Math.round(bull.y)); g.scale(1, t < .35 ? 1 : .55); g.globalAlpha = t > .8 ? .5 : 1;
      g.drawImage(p, -SPR.frontFeet.x, -SPR.frontFeet.y); g.restore();
    }
    if (t > .8 && t < 1.3) for (let i = 0; i < 8; i++) { const a = i * 2.4 + t * 6, r = (t - .8) * 60; rect(g, bull.x + Math.cos(a) * r, bull.y - 18 - Math.sin(a) * r * .6 - (t - .8) * 50, 2, 2, i % 2 ? '#bfe8ff' : '#ffffff'); }
    R.soulAt = [s.x / 2, s.y / 2 - 10, s.x / 2, s.y / 2 - 30];
  }
  function drawCarp(e) {
    const t = R.t, flap = Math.sin(t * 16 + e.ph), img = e.hit > 0 ? A.CARP_HIT : CARP[flap > 0 ? 0 : 1];
    const sp = e.spawning > 0 ? 1 - e.spawning / .35 : 1, w = CARP_W * (.6 + .4 * sp), h = CARP_H * (.6 + .4 * sp);
    shadow(e.x, e.y, 8 * sp, .35);
    g.save(); g.translate(Math.round(e.x), Math.round(e.y - e.h));
    g.rotate(clamp(e.vx * .004, -.35, .35) + Math.sin(t * 5 + e.ph) * .06);
    g.scale(e.vx < -4 ? -1 : 1, 1); g.scale(1 + flap * .05, 1 - flap * .09);
    g.drawImage(A.tinted(img, e.hit > 0 ? 'brightness(2.2)' : e.wind > 0 ? 'brightness(1.5) saturate(1.6)' : null), -w / 2, -h / 2, w, h); g.restore();
    if (e.kind === 'armored' && e.armored) helmet(e.x, e.y - e.h - h / 2 + 6);
    // winding up a throw: the bobbin held up over its head, rising
    if (e.wind > 0) { const k = 1 - e.wind / TD.bobbin.wind, bx = Math.round(e.x), by = Math.round(e.y - e.h - h / 2 - 6 - k * 6);
      rect(g, bx - 4, by - 3, 8, 6, '#1a1418'); rect(g, bx - 3, by - 2, 6, 4, '#ff9a3c'); rect(g, bx - 4, by - 3, 2, 6, '#8a6a4a'); rect(g, bx + 2, by - 3, 2, 6, '#8a6a4a'); }
  }
  function helmet(x, y) {
    x = Math.round(x); y = Math.round(y);
    rect(g, x - 9, y - 1, 18, 2, '#1a1418'); rect(g, x - 8, y - 1, 16, 1, '#7c8494');
    rect(g, x - 7, y - 7, 14, 6, '#1a1418'); rect(g, x - 6, y - 6, 12, 5, '#8a93a6'); rect(g, x - 5, y - 5, 6, 1, '#e8edf6');
    rect(g, x - 4, y - 3, 1, 1, '#1a1418'); rect(g, x + 3, y - 3, 1, 1, '#1a1418');
  }
  // a rug rolled up: a red cylinder seen from above, gold-edged, its stripes turning as it rolls; shuddering while it aims
  function drawRoll(e) {
    const x = Math.round(e.x + (e.st === 'aim' ? (Math.random() - .5) * 2 : 0)), y = Math.round(e.y), ang = e.st === 'aim' ? Math.atan2(e.ty, e.tx) : Math.atan2(e.vy, e.vx);
    shadow(x, y + 2, 13, .4);
    g.save(); g.translate(x, y - 6); g.rotate(ang + Math.PI / 2);
    rect(g, -12, -6, 24, 12, '#1a0a0a'); rect(g, -11, -5, 22, 10, e.hit > 0 ? '#ff9a86' : '#c8302a'); rect(g, -11, -5, 22, 2, '#e8483a');
    const sp = ((e.spin || 0) % 1 + 1) % 1;
    for (let i = 0; i < 3; i++) { const yy = -5 + ((i / 3 + sp) % 1) * 10; rect(g, -11, Math.round(yy), 22, 1, '#7a1a14'); }
    rect(g, -12, -6, 2, 12, '#ffd44a'); rect(g, 10, -6, 2, 12, '#ffd44a');
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) rect(g, s * 13 - (s < 0 ? 1 : 0), -5 + i * 3, 1, 2, '#fff6e2');
    g.restore();
  }
  // the shag: a carpshit twice the size, browner and shaggier, a long fringe all round; it plants and shudders before a
  // charge, and reels when cut
  function drawShag(e) {
    const t = R.t, sp = e.spawning > 0 ? 1 - e.spawning / .5 : 1, w = CARP_W * 1.9 * (.6 + .4 * sp), h = CARP_H * 1.9 * (.6 + .4 * sp);
    shadow(e.x, e.y, 15 * sp, .45);
    const shake = e.st === 'aim' ? Math.sin(t * 60) * 2 : 0, x = Math.round(e.x + shake), y = Math.round(e.y - e.h);
    // fringe: strands all round, swaying
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * 6.28, r = w * .52, sx = x + Math.cos(a) * r, sy = y + Math.sin(a) * r * .62, sw = Math.sin(t * 7 + i) * 2;
      core.line(g, sx, sy, sx + Math.cos(a) * 5 + sw, sy + Math.sin(a) * 4 + 2, i % 2 ? '#d8c08a' : '#a8885a');
    }
    g.save(); g.translate(x, y); g.scale(e.vx < -4 ? -1 : 1, 1);
    if (e.st === 'dash') g.rotate(Math.atan2(e.vy, Math.abs(e.vx)) * .3);
    g.drawImage(A.tinted(CARP[Math.floor(t * 4) % 2], e.hit > 0 ? 'brightness(2.2)' : e.st === 'aim' ? 'sepia(.5) saturate(1.8) hue-rotate(-20deg) brightness(1.3)' : 'sepia(.55) saturate(1.3) hue-rotate(-20deg) brightness(.85)'), -w / 2, -h / 2, w, h); g.restore();
    if (e.stag > 0) for (let i = 0; i < 3; i++) { const a = t * 8 + i * 2.1; rect(g, Math.round(x + Math.cos(a) * 12), Math.round(y - h / 2 - 6 + Math.sin(a) * 3), 2, 2, '#ffd44a'); }
  }
  function drawEnemy(e) { if (e.kind === 'roll') drawRoll(e); else if (e.kind === 'shag') drawShag(e); else drawCarp(e); }
  function drawShot(s) {
    const x = s.x, y = s.y - s.h, d = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / d, uy = s.vy / d;
    const col = s.soul ? ['#b0701a', '#ffd44a', '#fff6dc'] : s.pierce ? ['#4a2a8a', '#9a6ae8', '#ecdcff'] : s.spread || R.spread > 0 ? ['#8c6010', '#e8b030', '#fff0aa'] : R.rapid > 0 ? ['#3a8ab0', '#bfefff', '#ffffff'] : ['#1f6fa8', '#3aa8e0', '#bfefff'];
    if (s.soul) return;   // the souls' shots are drawn as ribbons (drawStreams)
    for (let i = 0; i < 3; i++) { g.strokeStyle = col[i]; g.lineWidth = [5, 3, 1.5][i]; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - ux * (14 - i * 3), y - uy * (14 - i * 3)); g.lineTo(x, y); g.stroke(); }
    disc(g, Math.round(x), Math.round(y), 2, '#ffffff');
  }
  // The souls' streams: one ribbon per side, from the muzzle through that side's shots, white in gold, rippling.
  function drawStreams() {
    const mz = muzzle(), sides = [...new Set(R.shots.filter(s => s.soul).map(s => s.side))];
    for (const side of sides) {
      const list = R.shots.filter(s => s.soul && s.side === side).sort((a, b2) => a.t - b2.t);
      const pts = [];
      if (list.length && list[0].t < .3) pts.push([mz.x, mz.y - mz.h]);
      for (const s of list) pts.push([s.x + Math.sin(s.t * 30 + side) * 1.5, s.y - s.h]);
      if (pts.length < 2) continue;
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (const [col, w] of [['rgba(255,212,74,.3)', 7], ['rgba(255,236,160,.85)', 3.4], ['#ffffff', 1.4]]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.stroke();
      }
    }
    if (R.shots.some(s => s.soul && s.t < .3)) { disc(g, mz.x, mz.y - mz.h, 5, 'rgba(255,212,74,.35)'); disc(g, mz.x, mz.y - mz.h, 2, '#fff6dc'); }
  }
  function drawThrown(p) {
    if (p.kind === 'thread') {
      // a loose loop of glowing thread, writhing as it flies
      const x = p.x, y = p.y - p.h, d = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / d, uy = p.vy / d;
      g.strokeStyle = '#ff7a2a'; g.lineWidth = 2; g.beginPath();
      for (let i = 0; i <= 10; i++) { const k = i / 10 - .5, w = Math.sin(k * 9 + p.t * 20 + p.ph) * 4; const px = x + ux * k * 16 - uy * w, py = y + uy * k * 16 + ux * w; if (i) g.lineTo(px, py); else g.moveTo(px, py); }
      g.stroke(); g.strokeStyle = '#ffd060'; g.lineWidth = 1; g.stroke();
      glow(x, y, 12, '#ff7a2a', .5); return;
    }
    const x = Math.round(p.x), y = Math.round(p.y - p.h), col = p.friendly ? '#7fd4ff' : '#ff7050';
    glow(x, y, 14, col, .6);
    g.save(); g.translate(x, y); g.rotate(p.r);
    // a bobbin: two flanges and the thread wound between them
    rect(g, -5, -4, 10, 8, '#1a1418'); rect(g, -4, -3, 8, 6, p.friendly ? '#bfefff' : '#ff9a3c'); rect(g, -4, -1, 8, 2, p.friendly ? '#ffffff' : '#ffd060');
    rect(g, -5, -4, 2, 8, '#8a6a4a'); rect(g, 3, -4, 2, 8, '#8a6a4a');
    g.restore();
  }
  function drawSlash() {
    if (bull.slash < 0) return;
    const k = bull.slash / TD.slashT, a0 = Math.atan2(bull.sy, bull.sx), cx = bull.x, cy = bull.y - 14, r = TD.slashReach * .85;
    const from = a0 - TD.slashArc / 2, to = from + TD.slashArc * Math.min(1, k * 1.6 + .2);
    g.save(); g.lineCap = 'round';
    for (const [col, w, rr2, al] of [['#7fd4ff', 7, r - 2, .45], ['#ffffff', 3, r, .95], ['#bfefff', 1.5, r - 7, .8]]) {
      g.globalAlpha = al * (1 - k * .6); g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.ellipse(cx, cy, rr2, rr2 * .78, 0, from, to); g.stroke();
    }
    g.restore();
  }
  function drawFx(pass) {
    for (const f of R.td.fx) {
      const k = f.t / f.dur;
      if (pass === 'glow') {
        if (f.k === 'spark') { rect(g, Math.round(f.x), Math.round(f.y - f.h), 2, 2, k < .5 ? f.col : '#ff7a2a'); }
        else if (f.k === 'muzzle') { disc(g, Math.round(f.x), Math.round(f.y - f.h), 6 - k * 3, '#ffffff'); glow(f.x, f.y - f.h, 16, '#7fd4ff', .6); }
        else if (f.k === 'fire') { disc(g, Math.round(f.x), Math.round(f.y - f.h), Math.max(1, Math.round(f.s * (1 - k))), k < .3 ? '#fff0aa' : k < .6 ? '#ffb040' : '#c8302a'); }
        continue;
      }
      if (f.k === 'puff') for (let i = 0; i < f.n; i++) { const a = i / f.n * 6.28 + f.x, r = 3 + k * 14; rect(g, Math.round(f.x + Math.cos(a) * r), Math.round(f.y - f.h + Math.sin(a) * r * .7), 3, 3, k < .5 ? '#fff6e2' : '#b8b4a8'); }
      else if (f.k === 'helmet') { g.save(); g.globalAlpha = Math.min(1, (f.dur - f.t) * 2); g.translate(Math.round(f.x), Math.round(f.y - f.h)); g.rotate(f.r); helmet(0, 4); g.restore(); }
      else if (f.k === 'half') {
        g.save(); g.globalAlpha = 1 - k * k; g.translate(Math.round(f.x), Math.round(f.y - f.h)); g.rotate(f.r);
        if (f.roll) { rect(g, -8, f.top ? -5 : 0, 16, 5, '#c8302a'); rect(g, -8, f.top ? -5 : 0, 2, 5, '#ffd44a'); }
        else { g.beginPath(); g.rect(-CARP_W / 2, f.top ? -CARP_H / 2 : 0, CARP_W, CARP_H / 2); g.clip(); g.drawImage(CARP[0], -CARP_W / 2, -CARP_H / 2, CARP_W, CARP_H); }
        g.restore();
      }
      else if (f.k === 'smoke') { g.save(); g.globalAlpha = .55 * (1 - k); disc(g, Math.round(f.x), Math.round(f.y - f.h), Math.round(3 + k * f.s), k < .4 ? '#5a5866' : '#3a3846'); g.restore(); }
      else if (f.k === 'debris') { g.save(); g.translate(Math.round(f.x), Math.round(f.y - f.h)); g.rotate(f.r || 0); rect(g, -f.s / 2, -f.s / 2, f.s, f.s, f.col || '#4a4656'); g.restore(); }
    }
  }
  function glow(x, y, r, col, a) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  // the things that stand on the floor, for the room to sort with its machines by where they touch the floor
  function drawables() {
    const list = [];
    for (const e of R.td.enemies) list.push({ y: e.y, draw: () => drawEnemy(e) });
    for (const p of R.td.pickups) list.push({ y: p.y, draw: () => drawPickup(p) });
    for (const f of R.td.fx) if (f.k === 'helmet' || f.k === 'half' || f.k === 'debris') list.push({ y: f.y, draw: null, fx: f });
    list.push({ y: bull.y, draw: drawBull });
    return list;
  }
  // in the glow: bolts, bobbins, streams, the slash, sparks, the muzzle; and arrows at the edge for what's coming off screen
  // a power-up shows itself: a column of light over it, in its colour, so it reads across the room
  const BEAM = { rapid: '#7fd4ff', pierce: '#b48aff', spread: '#ffd44a', coffee: '#ffb070' };
  function drawBeam(p) {
    const col = BEAM[p.kind] || '#fff6e2', x = Math.round(p.x), top = p.y - 70, a = (p.life != null && p.life - p.t < 3 ? .5 : 1) * (.32 + .1 * Math.sin(R.t * 5 + p.x));
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createLinearGradient(0, top, 0, p.y);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, col);
    g.fillStyle = gr;
    g.globalAlpha = a * .55; g.fillRect(x - 7, top, 14, p.y - top);
    g.globalAlpha = a; g.fillRect(x - 2, top, 4, p.y - top);
    g.restore();
    glow(x, p.y, 14, col, a * .7);
  }
  function glows() {
    for (const p of R.td.pickups) if (p.kind !== 'coffee') drawBeam(p);
    for (const s of R.shots) drawShot(s);
    drawStreams();
    for (const p of R.td.thrown) drawThrown(p);
    drawSlash(); drawFx('glow');
  }
  function arrows() {
    const c = R.td.cam, v = TD.view;
    for (const e of R.td.enemies) {
      const sx = e.x - c.x, sy = e.y - e.h - c.y;
      if (sx > -4 && sx < v.w + 4 && sy > 20 && sy < v.h + 4) continue;
      const cx = v.w / 2, cy = v.h / 2 + 10, dx = sx - cx, dy = sy - cy, k = Math.min((v.w / 2 - 10) / Math.abs(dx || 1e-6), (v.h / 2 - 22) / Math.abs(dy || 1e-6)), ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx);
      g.save(); g.translate(Math.round(ax), Math.round(ay)); g.rotate(a); g.fillStyle = e.kind === 'roll' ? '#ff7050' : '#ffd44a';
      g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -5); g.lineTo(-2, 0); g.lineTo(-4, 5); g.closePath(); g.fill(); g.restore();
    }
  }
  // where the mouse aims: a small reticle (screen pixels)
  function reticle() {
    if (R.td.aimSource !== 'mouse' || R.phase !== 'boss') return;
    const x = Math.round(twin.mouse.x), y = Math.round(twin.mouse.y), col = R.td.fireHeld ? '#7fd4ff' : '#fff6e2';
    for (const [dx, dy, w, h] of [[-7, 0, 4, 1], [4, 0, 4, 1], [0, -7, 1, 4], [0, 4, 1, 4]]) rect(g, x + dx, y + dy, w, h, col);
  }
  function lights(r, cam) {
    let n = 0;
    for (const s of R.shots) { if (n++ > 6) break; r.light(s.x - cam.x, s.y - s.h - cam.y, 0, s.soul ? .32 : .14, s.soul ? .26 : .26, s.soul ? .1 : .42); }
    for (const p of R.td.thrown.slice(0, 4)) r.light(p.x - cam.x, p.y - p.h - cam.y, 0, p.friendly ? .1 : .32, p.friendly ? .24 : .14, p.friendly ? .36 : .05);
    for (const f of R.td.fx) if (f.k === 'muzzle') { r.light(f.x - cam.x, f.y - f.h - cam.y, 0, .5, .45, .3); break; }
    for (const p of R.td.pickups.slice(0, 3)) r.light(p.x - cam.x, p.y - 12 - cam.y, 0, .45, .25, .12);
  }
  return { TD, SPR, half, newRun, room, update, addPickup, flingThread, badge, fire, moveBull, stepShots, stepEnemies, stepThrown, stepFx, spawn, kill, damage, blast, clearThreats,
    muzzle, screenOf, camTo, sparks, puff, glow, shadow, drawables, drawBull, drawEnemy, glows, arrows, reticle, lights, drawFx, moveVec, aimVec,
    use: x => { g = x; }, get g() { return g; } };
};
