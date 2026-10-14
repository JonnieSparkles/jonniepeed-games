// Reusable single-screen side-view engine: the bull from the side, the carpshits that fly at him, his bolts and
// katana, their paper, and the drawing for all of it. The ride (elevator.js) owns the set, the waves and the story.
// Coordinates: u is across the screen (-1..1), h is height above the floor. Drawing is done at the picture's full
// size (twice the game's units, like the sprites), so `PXu`/`PYh` give picture pixels.
// Outcomes use the seeded stream (core.rr); everything drawn only (flapping, fringe, sparks) uses Math.random.
// The floor can be a ground line (tuning.ground(u): its height, landings and the stairs' slopes; the stairwell): his
// jump, his bolts, his reach and what touches him, and how high the carpshits hover, all stand on it. Flat by default.
// A floor can add its own kinds of enemy: one with e.step(e, dt) moves itself, e.draw(e) draws it, and e.radius and
// e.tall size it for the slash and the bolts.
var UnrugArena = function (core, tuning) {
  'use strict';
  const { A, Snd, TUNE, clamp, rr, emit, free, hurtBull, updateBull, updateFx, moveDir, rect, line, disc } = core;
  const ARENA = Object.assign({
    floorY: 120, width: 110, height: 140, limit: .85,
    shotSpeed: 2.6, shotRadius: .07, shotTall: .06, enemyRadius: .075, slashReach: .29, slashHeight: .23,
    bodyH: .23, muzzleH: .129, lowest: 0, contactKick: .155, touchU: .082, wadU: .055,
    // the carpshits: all fly. hover bands (h), drop speed down the threads, how far each likes to keep from him
    low: [.107, .157], high: [.229, .3], highShare: .35, dropSpeed: .5, keep: [.27, .86], drift: .18, bob: .018,
    swoopFirst: [2.2, 4], swoopEvery: [3.2, 5], swoopT: 1.05, rear: .4, diveH: .17, diveOver: .32,
    throwFirst: [1.6, 2.6], throwEvery: [2.6, 4], wadSpeed: .55, spread: .23,
    entry: .97, enterSpeed: .5, crossRoom: .25, crossSpeed: .55, crossH: .36
  }, tuning);
  const ground = ARENA.ground || (() => 0), gh = () => ground(bull.u) + bull.jh;   // where his feet are, in h
  let R, bull, swing = 0, g = core.g;
  const X = u => 120 + u * ARENA.width, Y = h => ARENA.floorY - h * ARENA.height;
  const PXu = u => 2 * X(u), PYh = h => 2 * Y(h);
  const B = UnrugBull, SIDE = B.paint(B.VIEWS.side);
  const POSE = {}; for (const k in B.SIDES) POSE[k] = B.paint(B.SIDES[k]);
  const BARE = {}; for (const k in B.SIDES_BARE) BARE[k] = B.paint(B.SIDES_BARE[k]);   // no katana on his back (R.arena.bare)
  const BACKS = [B.paint(B.POSES.runA), B.paint(B.POSES.runB)], FRONT = B.paint(B.VIEWS.front);
  const SF = B.SIDE_FEET, SM = B.SIDE_MUZZLE;
  const CW = Math.round(A.CARPF[0].width * .72), CH = Math.round(A.CARPF[0].height * .72);   // a carpshit, in picture pixels
  function newRun(r, b) {
    R = r; bull = b; bull.u = -.5; bull.facing = 1; swing = 0;
    R.arena = { enemies: [], thrown: [], pickups: [], fx: [], locked: false, out: 0, outShrink: true };
  }
  const facing = () => bull.facing || 1;
  // While the ride holds the camera (the cut-ins, the drop) he can't act: his timers still run.
  function move(dt) {
    if (R.arena.locked) {
      bull.inv = Math.max(0, bull.inv - dt); bull.cd = Math.max(0, bull.cd - dt);
      if (bull.slash >= 0) { bull.slash += dt; if (bull.slash >= TUNE.slashT) bull.slash = -1; }
      return;
    }
    if (moveDir() && !bull.crouch) bull.facing = moveDir();
    updateBull(dt);
    if (bull.kick) { bull.u = clamp(bull.u + bull.kick * dt, -ARENA.limit, ARENA.limit); bull.kick *= Math.pow(.0003, dt); if (Math.abs(bull.kick) < .01) bull.kick = 0; }
    if (R.bullRun > 0) {
      bull.u = clamp(bull.u + facing() * 2.5 * dt, -ARENA.limit, ARENA.limit);
      if (Math.abs(bull.u) >= ARENA.limit) bull.facing *= -1;
    }
    bull.u = clamp(bull.u, -ARENA.limit, ARENA.limit);
  }
  function fire() {
    for (const slope of R.spread > 0 ? [0, -.65, .65] : [0]) {
      R.shots.push({ u: bull.u + facing() * SM.x / 220, h: gh() + ARENA.muzzleH,
        vu: facing() * ARENA.shotSpeed, vh: slope, side: true, dead: false });
    }
    return true;
  }
  function kill(e, by) {
    if (e.dead) return;
    e.dead = true; free(X(e.u), Y(e.h), e.kind, by); Snd.play('poof');
    if (by === 'slash') for (const s of [-1, 1]) R.arena.fx.push({ k: 'half', x: PXu(e.u), y: PYh(e.h) + s * 4, vx: (Math.random() - .5) * 80, vy: s * 60 - 40, r: 0, vr: s * 6, top: s < 0, t: 0, dur: .6 });
  }
  // All three attacks share armor; arrival and Bull Run still destroy outright.
  function hit(e, by) {
    if (e.dead) return;
    if (!e.armored) { kill(e, by); return; }
    e.armored = false; e.hit = .15; Snd.play('armorClank'); emit('arena_armor', { kind: e.kind, by });
    R.arena.fx.push({ k: 'helmet', x: PXu(e.u), y: PYh(e.h) - 8, vx: facing() * 70, vy: -140, r: 0, t: 0, dur: 2.2 });
    R.fx.push({ k: 'spark', x: X(e.u), y: Y(e.h) - 5, s: .6, col: '#fff6e2', t: 0, dur: .22, a: Math.random() * 6 });
  }
  function near(u, h, radius = 0) {
    const ahead = (u - bull.u) * facing();
    return ahead > -.04 - radius && ahead < ARENA.slashReach + radius &&
      Math.abs(h - (gh() + .1)) < ARENA.slashHeight + radius;
  }
  function slashHits() {
    if (bull.slash === 0) swing++;
    for (const e of R.arena.enemies) if (!e.dead && !e.dropping && e.slashSwing !== swing && near(e.u, e.h, e.radius || ARENA.enemyRadius)) {
      e.slashSwing = swing; hit(e, 'slash');
    }
    for (const p of R.arena.thrown) if (!p.dead && !p.friendly && near(p.u, p.h)) {
      p.friendly = true;
      const target = p.src && !p.src.dead ? p.src : null;
      const du = target ? target.u - p.u : facing(), dh = target ? target.h - p.h : 0;
      const distance = Math.max(.05, Math.hypot(du, dh));
      p.vu = du / distance * ARENA.shotSpeed; p.vh = dh / distance * ARENA.shotSpeed;
      R.charge = Math.min(TUNE.charges, R.charge + TUNE.deflectCharge); R.chargeFlash = .3;
      R.events.deflects = (R.events.deflects || 0) + 1; emit('deflect', { kind: 'arena_wad' }); Snd.play('deflect');
    }
  }
  // A carpshit slides down one of the ride's threads (lanes, in u) into the car and picks a height and a distance.
  // Or (options.side, -1 or 1) it flies in from the open shaft on that side, at its height.
  function spawn(kind, options = {}) {
    const side = options.side || 0, lane = side ? side * ARENA.entry : options.u != null ? options.u : rr(-.12, .12);
    const high = rr(0, 1) < ARENA.highShare, hover = high ? rr(...ARENA.high) : rr(...ARENA.low);
    const e = { kind: 'flyer', u: lane, h: side ? hover + ground(lane) : options.h != null ? options.h : .69, age: 0, dropping: !side, entering: side, dead: false,
      hover, keep: rr(...ARENA.keep), ph: rr(0, 6),
      armored: !!options.armored, nextThrow: rr(...ARENA.throwFirst), swoopT: rr(...ARENA.swoopFirst), swoop: null, hit: 0, pu: lane };
    R.arena.enemies.push(e); emit('arena_spawn', { kind: 'flyer', side }); return e;
  }
  function throwWad(e) {
    // aimed at his chest, in picture pixels so the paper flies straight on screen
    const dx = PXu(bull.u) - PXu(e.u), dy = PYh(gh() + (bull.crouch ? .08 : .12)) - PYh(e.h), len = Math.max(1, Math.hypot(dx, dy));
    const speed = ARENA.wadSpeed * 220;
    const p = { u: e.u, h: e.h, vu: dx / len * speed / 220, vh: -dy / len * speed / 280, src: e, friendly: false, dead: false, r: 0 };
    R.arena.thrown.push(p); emit('arena_throw'); Snd.play('wadThrow'); return p;
  }
  // Something touches him when its middle is within reach across and inside his height (crouched, he's shorter).
  const touches = (u, h, reach = ARENA.touchU) => Math.abs(u - bull.u) < reach &&
    h > gh() - .015 && h < gh() + (bull.crouch ? TUNE.crouchH : ARENA.bodyH);
  // A dive is a curve from where it hovers, through where he was standing when it started, and up past him.
  function startSwoop(e) {
    const side = Math.sign(bull.u - e.u) || 1, bu = bull.u, bh = ARENA.diveH + ground(bu);
    const tu = clamp(bu + side * ARENA.diveOver, -ARENA.limit + .05, ARENA.limit - .05), th = (rr(0, 1) < ARENA.highShare ? rr(...ARENA.high) : rr(...ARENA.low)) + ground(tu);
    e.swoop = { t: 0, su: e.u, sh: e.h, tu, th, cu: 2 * bu - .5 * (e.u + tu), ch: 2 * bh - .5 * (e.h + th) }; e.dives = (e.dives || 0) + 1;
    emit('arena_swoop'); Snd.play('swoop');
  }
  function enemies(dt) {
    const L = R.arena.enemies;
    for (const e of L) {
      if (e.dead) continue;
      if (e.step) { e.step(e, dt); continue; }   // a floor's own kind (the stairwell's tumblers)
      e.age += dt; e.hit = Math.max(0, e.hit - dt); e.pu = e.u;
      if (e.dropping) {
        e.h = Math.max(e.hover, e.h - ARENA.dropSpeed * dt);
        if (e.h <= e.hover) { e.dropping = false; e.age = 0; }
        continue;
      }
      if (e.entering) {
        e.u -= e.entering * ARENA.enterSpeed * dt;
        if (Math.abs(e.u) <= ARENA.limit - .05) { e.entering = 0; e.age = 0; }
        continue;
      }
      if (e.swoop) {
        const w = e.swoop; w.t += dt; const k = Math.min(1, w.t / ARENA.swoopT), a = (1 - k) * (1 - k), b2 = 2 * k * (1 - k), c = k * k;
        e.u = a * w.su + b2 * w.cu + c * w.tu; e.h = a * w.sh + b2 * w.ch + c * w.th;
        if (touches(e.u, e.h)) contact(e, 'dive');
        if (k >= 1) { e.swoop = null; e.swoopT = rr(...ARENA.swoopEvery); e.hover = w.th - ground(e.u); }
        continue;
      }
      // keep apart: no two stacked on each other
      for (const o of L) {
        if (o === e || o.dead || o.dropping || o.swoop) continue;
        const du = e.u - o.u, dh = e.h - o.h, w = CW * 1.05 / 220;
        if (Math.abs(du) < w && Math.abs(dh) < CH * 1.4 / 280) {
          const push = 1 - Math.abs(du) / w, dir = Math.sign(du) || (e.ph > o.ph ? 1 : -1), hdir = Math.sign(dh) || (e.ph > o.ph ? 1 : -1);
          e.u += dir * (60 + 220 * push) / 220 * dt;
          e.hover += hdir * 60 * push / 280 * dt;
          if (Math.abs(e.u) > ARENA.limit - .1) e.hover += hdir * 120 / 280 * dt;   // pinned at a wall: spread up and down
        }
      }
      e.hover = clamp(e.hover, .1, .33);
      const du = bull.u - e.u, side = Math.sign(du) || 1;
      // Backed against a wall, he leaves no room on that side to keep its distance: it goes over him to the other side.
      // It climbs out of reach first, then crosses.
      const room = side > 0 ? bull.u + ARENA.limit : ARENA.limit - bull.u;
      if (!e.cross && room < ARENA.crossRoom) e.cross = side;
      if (e.cross) {
        const ch = ARENA.crossH + ground(e.u);
        e.h = Math.min(ch, e.h + ARENA.dropSpeed * dt);
        if (e.h >= ch - .005) e.u += e.cross * ARENA.crossSpeed * dt;
        const past = (e.u - bull.u) * e.cross;
        if (past > Math.min(e.keep, .3) || e.u * e.cross >= ARENA.limit - .03) e.cross = 0;
        e.u = clamp(e.u, -ARENA.limit + .02, ARENA.limit - .02);
        if (touches(e.u, e.h)) contact(e, 'flyer');
        if (R.phase === 'dead') break;
        continue;
      }
      const want = Math.abs(du) > e.keep + .11 ? 1 : Math.abs(du) < e.keep - .11 ? -1 : 0;
      e.u += side * want * ARENA.drift * dt;
      e.swoopT -= dt;
      e.h = e.hover + ground(e.u) + Math.sin(e.age * 3.4 + e.ph) * ARENA.bob + (e.swoopT < ARENA.rear ? (ARENA.rear - Math.max(0, e.swoopT)) * .07 : 0);
      if (e.swoopT <= 0) startSwoop(e);
      else {
        e.nextThrow -= dt;
        // a floor can make one throw half as often (e.shy) or at its own pace (e.throwEvery)
        if (e.nextThrow <= 0) { if (!e.shy || rr(0, 1) < .5) throwWad(e); e.nextThrow = rr(...(e.throwEvery || ARENA.throwEvery)); }
      }
      e.u = clamp(e.u, -ARENA.limit + .02, ARENA.limit - .02);
      if (touches(e.u, e.h)) contact(e, 'flyer');
      if (R.phase === 'dead') break;
    }
    R.arena.enemies = L.filter(e => !e.dead);
  }
  function contact(e, cause) {
    if (R.bullRun > 0) { kill(e, 'bullRun'); return; }
    const away = Math.sign(bull.u - e.u) || facing();
    if (hurtBull(1, cause)) { bull.kick = away * 1.0; e.u -= away * ARENA.contactKick; if (e.swoop) { e.swoop = null; e.swoopT = rr(...ARENA.swoopEvery); } }
  }
  // Swept horizontal intersection keeps bolts reliable at 60 Hz.
  function crossed(p, oldU, e, radius, tall) {
    return e.u >= Math.min(oldU, p.u) - radius && e.u <= Math.max(oldU, p.u) + radius && Math.abs(p.h - e.h) < tall;
  }
  function shots(dt) {
    for (const s of R.shots) {
      const oldU = s.u; s.u += s.vu * dt; s.h += s.vh * dt;
      for (const e of R.arena.enemies) if (!e.dead && !e.dropping && !e.entering && crossed(s, oldU, e, ARENA.shotRadius, e.tall || ARENA.shotTall)) { s.dead = true; hit(e, 'shot'); break; }
    }
    R.shots = R.shots.filter(s => !s.dead && Math.abs(s.u) < 1.15 && s.h > ARENA.lowest && s.h < .85);
    for (const p of R.arena.thrown) {
      const oldU = p.u; p.u += p.vu * dt; p.h += p.vh * dt; p.r += dt * 12;
      if (p.friendly) {
        for (const e of R.arena.enemies) if (!e.dead && crossed(p, oldU, e, ARENA.shotRadius, e.tall || ARENA.shotTall)) { p.dead = true; hit(e, 'deflect'); break; }
      } else if (touches(p.u, p.h, ARENA.wadU)) {
        if (R.bullRun > 0) p.dead = true;
        else if (hurtBull(1, 'arena_wad')) p.dead = true;
      }
      if (Math.abs(p.u) > 1.15 || p.h < ARENA.lowest || p.h > .85) p.dead = true;
    }
    R.arena.thrown = R.arena.thrown.filter(p => !p.dead);
  }
  function clearThreats(by) {
    for (const e of R.arena.enemies) kill(e, by);
    R.arena.enemies = []; R.arena.thrown = []; R.shots = [];
  }
  function addPickup(kind, u = 0) { const p = { kind, u, h: .08 + ground(u), got: false }; R.arena.pickups.push(p); return p; }
  function pickups() {
    for (const p of R.arena.pickups) if (!p.got && touches(p.u, p.h, .1)) {
      p.got = true; emit('pickup', { item: p.kind });
      if (p.kind === 'coffee') R.hearts = Math.min(TUNE.hearts, R.hearts + 1);
      else { R.spread = TUNE.spreadT; R.charge = TUNE.charges; }
      Snd.play(p.kind === 'coffee' ? 'coffee' : 'power');
    }
    R.arena.pickups = R.arena.pickups.filter(p => !p.got);
  }
  function stepFx(dt) {
    for (const f of R.arena.fx) {
      f.t += dt; f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt;
      if (f.k === 'half' || f.k === 'spark') f.vy += 300 * dt;
      if (f.k === 'half') f.r += f.vr * dt;
      if (f.k === 'helmet') { f.vy += 500 * dt; f.r += dt * 9; const fy = 2 * ARENA.floorY - 4; if (f.y > fy) { f.y = fy; f.vy *= -.3; f.vx *= .6; } }
    }
    R.arena.fx = R.arena.fx.filter(f => f.t < f.dur);
  }
  function update(dt, combat = true) {
    move(dt);
    if (combat && R.phase !== 'dead') enemies(dt);
    if (R.phase !== 'dead') { shots(dt); pickups(); }
    updateFx(dt); stepFx(dt);
  }

  // ---------- drawing (picture pixels: callers scale the game's context by half) ----------
  function pose() {
    const b = bull;
    if (b.inv > TUNE.hurtInv - .55 && b.stag > 0) return 'hurt';
    if (b.slash >= 0) return b.slash < .07 ? 'wind' : 'cut';
    if (b.jh > 0 || (R.arena.lift || 0) > 1) return 'jump';
    if (b.crouch) return 'crouch';
    if (moveDir() && !R.arena.locked) return 'run' + (Math.floor(b.step / 1.3) % 4);
    const idle = b.idle || 0;
    if (idle > 6 && (idle % 8) < 1.4 && R.arena.glance) return 'front';
    if (idle > 2.5 && ((idle - 2.5) % 5) < 1.35) return 'twirl' + (Math.floor(idle * 12) % 4);
    if (idle > .7) return Math.floor(idle * 1.3) % 2 ? 'idle' : 'aim';
    return 'aim';
  }
  function drawBull() {
    if (R.phase === 'dead') { drawDeath(); return; }
    const out = R.arena.out, x = PXu(bull.u), y = PYh(gh()) - Math.round(R.arena.lift || 0);   // lift: floating on the drop (drawn only)
    if (out > 0) {
      // Turn his back for either direction. Boarding keeps full size/visibility; exits recede as before.
      const img = BACKS[Math.floor(bull.step / 1.6) % 2], shrink = R.arena.outShrink !== false, k = shrink ? 1 - out * .35 : 1;
      g.save(); g.globalAlpha = shrink ? Math.max(0, Math.min(1, 1.6 - out * 1.6)) : 1; g.translate(Math.round(x), Math.round(y - out * 10)); g.scale(k, k);
      g.drawImage(img, -B.FEET.x, -B.FEET.y); g.restore(); return;
    }
    if (R.arena.pose) { const o = R.arena.pose; g.save(); g.translate(Math.round(x), Math.round(y)); g.scale(o.face || 1, 1); g.drawImage(o.img, -o.feet.x, -o.feet.y); g.restore(); return; }
    const p = pose(), set = R.arena.bare ? BARE : POSE;
    g.save();
    if (bull.inv > 0 && Math.floor(R.t * 18) % 2) g.globalAlpha = .4;
    if (p === 'front') { g.translate(Math.round(x), Math.round(y)); g.drawImage(FRONT, -B.VIEW_FEET.x, -B.VIEW_FEET.y); g.restore(); return; }
    const recoil = (bull.aimT || 0) > .15 ? 3 : 0, land = (bull.sq || 0) > 0;
    g.translate(Math.round(x - recoil * facing()), Math.round(y)); g.scale(facing(), 1);
    if (land && p !== 'jump') g.scale(1.04, .94);
    g.drawImage(set[p], -SF.x, -SF.y);
    if ((bull.aimT || 0) > .17) { disc(g, SM.x + 2, SM.y, 4, '#fff6e2'); disc(g, SM.x + 2, SM.y, 2, '#7fd4ff'); }
    g.restore();
    if (bull.slash >= 0) {
      const k = bull.slash / TUNE.slashT, cx = x + facing() * 6, cy = y - (bull.crouch ? 16 : 30);
      g.save(); g.translate(cx, cy); g.scale(facing(), 1);
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 36, -1.4 + k * .5, .9 + k * .5); g.stroke();
      g.strokeStyle = '#7fd4ff'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 31, -1.2 + k * .5, .7 + k * .5); g.stroke();
      g.restore();
    }
  }
  // rugged, side on: he sinks, flickers out in blue sparkles, and his bull's soul rises (as in the hall). Game units.
  function drawDeath() {
    g.save(); g.scale(2, 2);
    const t = R.phaseT, x = X(bull.u), y = Y(ground(bull.u));
    if (t < 1.1 && !(t > .8 && Math.floor(t * 30) % 2)) {
      g.save(); g.translate(x, y); g.scale(facing(), t < .35 ? 1 : .55); g.globalAlpha = t > .8 ? .5 : 1;
      g.drawImage(SIDE, -SIDE.width * .25, -B.VIEW_FEET.y * .5, SIDE.width * .5, SIDE.height * .5); g.restore();
    }
    if (t > .8 && t < 1.3) for (let i = 0; i < 8; i++) { const a = i * 2.4 + t * 6, r = (t - .8) * 40; rect(g, x + Math.cos(a) * r * .8, y - 14 - Math.sin(a) * r * .6 - (t - .8) * 30, 1.5, 1.5, i % 2 ? '#bfe8ff' : '#ffffff'); }
    g.restore();
    R.soulAt = [x, y - 16, x, y - 34];   // his soul, drawn with the glow by the core
  }
  function drawHelmet(x, y) {
    // a riveted steel pot: dark rim, bright crown, two rivets
    rect(g, x - 15, y - 10, 30, 3, '#1a1418'); rect(g, x - 14, y - 9, 28, 1, '#7c8494');
    rect(g, x - 11, y - 18, 22, 9, '#1a1418'); rect(g, x - 10, y - 17, 20, 8, '#8a93a6'); rect(g, x - 8, y - 16, 10, 2, '#e8edf6');
    rect(g, x - 6, y - 12, 1, 1, '#1a1418'); rect(g, x + 5, y - 12, 1, 1, '#1a1418');
  }
  function drawEnemy(e) {
    // flapping squashes it, it banks into its movement and wobbles, tumbles down the threads, and rears before a dive
    const t = R.t, flap = Math.sin(t * 18 + e.ph), img = A.CARPF[flap > 0 ? 0 : 1];
    const vu = e.u - (e.pu == null ? e.u : e.pu), rearing = !e.swoop && !e.dropping && e.swoopT < ARENA.rear;
    const x = PXu(e.u), y = PYh(e.h);
    g.save(); g.translate(Math.round(x), Math.round(y + (rearing ? Math.sin(t * 60) * 1.5 : 0)));
    const face = e.swoop ? Math.sign(e.swoop.tu - e.swoop.su) || 1 : bull.u < e.u ? -1 : 1;
    let rot = clamp(vu * 60 * 220 * .0025, -.5, .5) + Math.sin(t * 5 + e.ph) * .07;
    if (e.dropping) rot = Math.sin(e.age * 9 + e.ph) * .35;
    if (e.swoop) rot = Math.atan2(Math.cos(Math.min(1, e.swoop.t / ARENA.swoopT) * Math.PI), 1.6) * face * .9;
    g.rotate(rot); g.scale(face, 1); g.scale(1 + flap * .06, 1 - flap * .1 + (e.dropping ? .12 : 0));
    g.drawImage(A.tinted(img, rearing ? 'brightness(1.5) saturate(1.6)' : e.hit > 0 ? 'brightness(2.4)' : null), -CW / 2, -CH / 2, CW, CH);
    g.restore();
    if (e.armored) drawHelmet(Math.round(x), Math.round(y - CH / 2 + 12));
    if (Math.abs(vu) * 60 * 220 > 80 && Math.random() < .25) R.arena.fx.push({ k: 'fringe', x: x - Math.sign(vu) * CW / 2, y: y + (Math.random() - .5) * 8, vx: -vu * 60 * 22, vy: 10, t: 0, dur: .4 });
  }
  function drawShot(s) {
    const d = Math.sign(s.vu) || 1, x = PXu(s.u), y = PYh(s.h), x0 = Math.min(x, x - d * 22), gold = R.spread > 0;
    rect(g, x0, y - 3, 22, 6, gold ? '#8c6010' : '#1f6fa8'); rect(g, x0, y - 2, 22, 4, gold ? '#e8b030' : '#3aa8e0');
    rect(g, Math.min(x, x - d * 18), y - 1, 18, 2, gold ? '#fff0aa' : '#bfefff'); rect(g, x - (d > 0 ? 4 : 0), y - 2, 4, 4, '#ffffff');
  }
  function drawThrown(p) {
    const col = p.friendly ? '#7fd4ff' : '#ff7050', x = PXu(p.u), y = PYh(p.h), vx = p.vu * 220, vy = -p.vh * 280, sp = Math.hypot(vx, vy) || 1;
    for (let i = 1; i <= 3; i++) { g.save(); g.globalAlpha = .45 / i; rect(g, x - vx / sp * i * 5 - 2, y - vy / sp * i * 5 - 2, 4, 4, col); g.restore(); }
    glow(x, y, 16, col, .7); glow(x, y, 7, '#fff0c0', .5);
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(p.r);
    rect(g, -4, -4, 8, 8, '#1a1418'); rect(g, -3, -3, 6, 6, p.friendly ? '#bfefff' : '#ffe0c8');
    g.restore();
  }
  function drawPickup(p) { const img = p.kind === 'coffee' ? A.COFFEE : A.SPREAD; g.drawImage(img, PXu(p.u) - 10, PYh(p.h) - 10, 20, 20); }
  function drawFx() {
    for (const f of R.arena.fx) {
      const k = f.t / f.dur;
      if (f.k === 'fringe') { g.save(); g.globalAlpha = 1 - k; rect(g, f.x, f.y, 3, 1, '#ff9628'); g.restore(); }
      else if (f.k === 'spark') { rect(g, f.x, f.y, 1, 1, k < .5 ? '#ffd060' : '#ff7a2a'); rect(g, f.x + 1, f.y, 1, 1, '#ffd060'); }
      else if (f.k === 'helmet') { g.save(); g.globalAlpha = Math.min(1, (f.dur - f.t) * 2); g.translate(f.x, f.y); g.rotate(f.r); drawHelmet(0, 8); g.restore(); }
      else if (f.k === 'half') { g.save(); g.globalAlpha = 1 - k * k; g.translate(f.x, f.y); g.rotate(f.r); g.beginPath(); g.rect(-CW / 2, f.top ? -CH / 2 : 0, CW, CH / 2); g.clip(); g.drawImage(A.CARPF[0], -CW / 2, -CH / 2, CW, CH); g.restore(); }
    }
  }
  function glow(x, y, r, col, a) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  const half = fn => () => { g.save(); g.scale(.5, .5); fn(); g.restore(); };
  const draw = half(() => { for (const e of R.arena.enemies) (e.draw || drawEnemy)(e); drawBull(); drawFx(); });
  const glows = () => {
    g.save(); g.scale(.5, .5);
    for (const s of R.shots) drawShot(s); for (const p of R.arena.thrown) drawThrown(p); for (const p of R.arena.pickups) drawPickup(p);
    g.restore(); core.drawFx('glow');
  };
  function lights(r) {
    for (const s of R.shots.slice(0, 6)) r.light(PXu(s.u), PYh(s.h), 0, .12, .24, .4);
  }
  return { ARENA, X, Y, PXu, PYh, CW, CH, ground, newRun, update, fire, slashHits, spawn, throwWad, startSwoop, kill, hit, near, touches, addPickup, clearThreats,
    pose, draw, glows, lights, glow, drawBull, drawEnemy, drawHelmet, drawShot, drawThrown, drawPickup, use: x => { g = x; } };
};
