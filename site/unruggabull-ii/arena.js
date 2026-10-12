// Reusable single-screen side-view engine. Elevator owns the set, waves and progression.
// Coordinates: u is across (-1..1), h is height above the floor. No corridor depth.
var UnrugArena = function (core, tuning) {
  'use strict';
  const { A, Snd, TUNE, clamp, rr, emit, free, hurtBull, updateBull, updateFx, moveDir, rect, line, disc } = core;
  const ARENA = Object.assign({ floorY: 122, width: 110, height: 140, limit: .88,
    shotSpeed: 3.2, shotRadius: .07, enemyRadius: .075, slashReach: .29, slashHeight: .23,
    dropSpeed: .6, crawlerSpeed: .24, flyerSpeed: .32, flyerH: .18, crawlerH: .06,
    bodyH: .2, muzzleH: .14, escapeT: 5, chargeSpeed: 2.5 }, tuning);
  let R, bull, g = core.g;
  const X = u => 120 + u * ARENA.width, Y = h => ARENA.floorY - h * ARENA.height;
  const side = UnrugBull.paint(UnrugBull.VIEWS.side);
  function newRun(r, b) { R = r; bull = b; bull.u = -.55; bull.facing = 1; R.arena = { enemies: [], thrown: [], pickups: [] }; }
  const facing = () => bull.facing || 1;
  function move(dt) {
    if (moveDir() && !bull.crouch) bull.facing = moveDir();
    // Reuse the existing stick/pads/keys, jump, crouch, cooldowns and charge contract.
    updateBull(dt);
    if (R.bullRun > 0) {
      bull.u = clamp(bull.u + facing() * ARENA.chargeSpeed * dt, -ARENA.limit, ARENA.limit);
      if (Math.abs(bull.u) >= ARENA.limit) bull.facing *= -1;
    }
  }
  function fire() {
    for (const slope of R.spread > 0 ? [0, -.65, .65] : [0]) {
      R.shots.push({ u: bull.u + facing() * .12, h: bull.jh + ARENA.muzzleH,
        vu: facing() * ARENA.shotSpeed, vh: slope, side: true, dead: false });
    }
    return true;
  }
  function kill(e, by) {
    if (e.dead) return;
    e.dead = true; free(X(e.u), Y(e.h), e.kind, by); Snd.play('poof');
  }
  function near(u, h, radius = 0) {
    const ahead = (u - bull.u) * facing();
    return ahead > -.04 - radius && ahead < ARENA.slashReach + radius &&
      Math.abs(h - (bull.jh + .1)) < ARENA.slashHeight + radius;
  }
  function slashHits() {
    for (const e of R.arena.enemies) if (!e.dead && near(e.u, e.h, ARENA.enemyRadius)) kill(e, 'slash');
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
  function spawn(kind) {
    const e = { kind, u: rr(-.12, .12), h: .69, age: 0, dropping: true, dead: false,
      dir: rr(0, 1) < .5 ? -1 : 1, nextThrow: rr(3, 5) };
    R.arena.enemies.push(e); emit('arena_spawn', { kind }); return e;
  }
  // Existing paper, not a new enemy: flyers occasionally throw a wad. It can only be dodged or deflected.
  function throwWad(e) {
    const du = bull.u - e.u, dh = bull.jh + .12 - e.h, length = Math.max(.05, Math.hypot(du, dh));
    const p = { u: e.u, h: e.h, vu: du / length * .55, vh: dh / length * .55, src: e, friendly: false, dead: false };
    R.arena.thrown.push(p); emit('arena_throw'); return p;
  }
  const touches = (u, h, radius = ARENA.enemyRadius) => Math.abs(u - bull.u) < radius + .06 &&
    h + radius > bull.jh && h - radius < bull.jh + (bull.crouch ? TUNE.crouchH : ARENA.bodyH);
  function enemies(dt) {
    for (const e of R.arena.enemies) {
      if (e.dead) continue;
      e.age += dt;
      if (e.dropping) {
        e.h = Math.max(e.kind === 'crawler' ? ARENA.crawlerH : ARENA.flyerH, e.h - ARENA.dropSpeed * dt);
        if (e.h <= (e.kind === 'crawler' ? ARENA.crawlerH : ARENA.flyerH)) { e.dropping = false; e.age = 0; }
      } else {
        e.u += e.dir * (e.kind === 'crawler' ? ARENA.crawlerSpeed : ARENA.flyerSpeed) * dt;
        if (e.kind === 'flyer') {
          e.h = ARENA.flyerH + Math.sin(e.age * 3) * .09;
          e.nextThrow -= dt; if (e.nextThrow <= 0) { throwWad(e); e.nextThrow = rr(4, 6); }
        }
      }
      if (touches(e.u, e.h)) {
        if (R.bullRun > 0) kill(e, 'bullRun');
        else if (hurtBull(1, e.kind)) e.dead = true;
      }
      if (Math.abs(e.u) > 1.05 || (!e.dropping && e.age > ARENA.escapeT)) e.dead = true;
      if (R.phase === 'dead') break;
    }
    R.arena.enemies = R.arena.enemies.filter(e => !e.dead);
  }
  // Swept horizontal intersection keeps bolts reliable at 60 Hz and allows a future faster charge.
  function crossed(p, oldU, e, radius) {
    return e.u >= Math.min(oldU, p.u) - radius && e.u <= Math.max(oldU, p.u) + radius && Math.abs(p.h - e.h) < radius + .04;
  }
  function shots(dt) {
    for (const s of R.shots) {
      const oldU = s.u; s.u += s.vu * dt; s.h += s.vh * dt;
      for (const e of R.arena.enemies) if (!e.dead && crossed(s, oldU, e, ARENA.shotRadius)) { s.dead = true; kill(e, 'shot'); break; }
    }
    R.shots = R.shots.filter(s => !s.dead && Math.abs(s.u) < 1.15 && s.h > 0 && s.h < .85);
    for (const p of R.arena.thrown) {
      const oldU = p.u; p.u += p.vu * dt; p.h += p.vh * dt;
      if (p.friendly) {
        for (const e of R.arena.enemies) if (!e.dead && crossed(p, oldU, e, ARENA.shotRadius)) { p.dead = true; kill(e, 'deflect'); break; }
      } else if (touches(p.u, p.h, .035)) {
        if (R.bullRun > 0) p.dead = true;
        else if (hurtBull(1, 'arena_wad')) p.dead = true;
      }
      if (Math.abs(p.u) > 1.15 || p.h < 0 || p.h > .85) p.dead = true;
    }
    R.arena.thrown = R.arena.thrown.filter(p => !p.dead);
  }
  function addPickup(kind, u = 0) { const p = { kind, u, h: .08, got: false }; R.arena.pickups.push(p); return p; }
  function pickups() {
    for (const p of R.arena.pickups) if (!p.got && touches(p.u, p.h, .06)) {
      p.got = true; emit('pickup', { item: p.kind });
      if (p.kind === 'coffee') R.hearts = Math.min(TUNE.hearts, R.hearts + 1);
      else { R.spread = TUNE.spreadT; R.charge = TUNE.charges; }
      Snd.play(p.kind === 'coffee' ? 'coffee' : 'power');
    }
    R.arena.pickups = R.arena.pickups.filter(p => !p.got);
  }
  function update(dt, combat = true) {
    move(dt);
    if (combat && R.phase !== 'dead') enemies(dt);
    if (R.phase !== 'dead') { shots(dt); pickups(); }
    updateFx(dt);
  }
  // Each drawing seam can be replaced without touching physics.
  function drawBull() {
    const y = Y(bull.jh), bob = bull.jh ? 0 : Math.sin(bull.step) * .6;
    g.save(); g.translate(X(bull.u), y + bob); g.scale(facing(), bull.crouch ? .5 : 1);
    g.rotate(R.bullRun > 0 ? .24 : bull.jh > 0 ? -.08 : Math.sin(bull.step) * .025);
    if (bull.inv > 0 && Math.floor(R.t * 12) % 2) g.globalAlpha = .5;
    g.drawImage(side, -side.width * .25, -UnrugBull.VIEW_FEET.y * .5, side.width * .5, side.height * .5);
    if (bull.slash >= 0) { g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(10, -14, 20, -1.2, 1.2); g.stroke(); }
    g.restore();
  }
  function drawEnemy(e) { const img = A.CARPF[Math.floor(R.t * 8) % 2]; g.drawImage(img, X(e.u) - 10, Y(e.h) - 6, 20, 12); }
  function drawShot(s) { line(g, X(s.u) - Math.sign(s.vu) * 7, Y(s.h), X(s.u), Y(s.h), R.spread > 0 ? '#ffd44a' : '#7fd4ff'); }
  function drawThrown(p) { disc(g, X(p.u), Y(p.h), 2, p.friendly ? '#7fd4ff' : '#ff7050'); }
  function drawPickup(p) { const img = p.kind === 'coffee' ? A.COFFEE : A.SPREAD; g.drawImage(img, X(p.u) - 5, Y(p.h) - 5, 10, 10); }
  function draw() { for (const e of R.arena.enemies) drawEnemy(e); drawBull(); core.drawFx('lit'); }
  function glows() { for (const s of R.shots) drawShot(s); for (const p of R.arena.thrown) drawThrown(p); for (const p of R.arena.pickups) drawPickup(p); core.drawFx('glow'); }
  function lights(r) {
    for (const s of R.shots.slice(0, 10)) r.light(X(s.u) * 2, Y(s.h) * 2, 0, .12, .24, .4);
  }
  return { ARENA, X, Y, newRun, update, fire, slashHits, spawn, throwWad, kill, near, touches, addPickup,
    draw, glows, lights, drawBull, drawEnemy, drawShot, drawThrown, drawPickup, use: x => { g = x; } };
};
