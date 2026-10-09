// Stick Army campaign (SPEC-008): the Dreadnought, the final boss at wave 20; the victory card with the squad's roll
// call; and endless play after it. Classic script; load after shop.js and before game.js. game.js calls
// StickArmyCampaign(world) once with the same world object it gives units.js, squad.js and shop.js.
var StickArmyCampaign = function (w) {
  'use strict';
  var W = w.W, GROUND = w.GROUND, BK = w.BK;
  var INK = w.INK, INK2 = w.INK2, RED = w.RED, BLUE = w.BLUE, PAPER = w.PAPER, HAT = w.HAT;
  var L = w.L, SP = w.SP, ink = w.ink, pen = w.pen, clamp = w.clamp, between = w.between, rr = w.rr, substream = w.substream;
  var emit = w.emit, addText = w.addText;

  // ---------- the Dreadnought ----------
  // The enemy flagship: an armored airship 600 px long, wider than the page. It announces itself first (APPROACH
  // seconds off the page: a horn, rumbling, smoke and its searchlights sweeping in from that edge), then sails in bow
  // first (ENTER px/s, easing to a stop) and fights in three stages. Night falls for the hangar and the bridge, and its
  // searchlights cut through it (sky.js drawNight, dreadBeams).
  //   guns:   it patrols back and forth (DRIFT px/s between PATROL) so its four underside gun turrets take turns over
  //           the page. A loaded gun aims at a target for AIM seconds (a red crosshair on the ground, its barrel
  //           glowing), then fires a volley of three shells around it. What the middle shell hits is gone for good.
  //   hangar: with the guns gone, the hangar doors in its belly open. It launches dive bombers and drops troops until
  //           the hangar is shot to pieces.
  //   bridge: then the bridge car under the bow is exposed. The ship turns angry, brings the bridge over the page,
  //           its bomb bay drops clusters at the bunker and a gunner on the bridge fires at the crew.
  // Downing the bridge downs the ship: it falls bow first, explosions running along it, crashes across the field,
  // breaks its back and burns there through the victory banner. Its hull is
  // armored throughout; only the part for the stage can be hurt. It lives in S.planes as kind 'dread', so bullets,
  // rockets, flak, bazookas and the ambience all see it. Local x runs stern to bow; on the page, x = p.x + p.dir * lx.
  var DREAD = {
    WAVE: 20, EVERY: 10, Y: 196, HW: 300, HH: 38, ARRIVE: 4, APPROACH: 6, ENTER: 32,
    PATROL: [70, 330], DRIFT: 24, SWAY: 18,
    TURRETS: [-210, -100, 20, 130], HANGAR: -40, BRIDGE: 222, GUN_Y: 47, HANGAR_Y: 40, BRIDGE_Y: 54, LIGHTS: [-150, 90],
    AIM: 1.2, MARKS: 2, EXPOSED: 2, RELOAD: [1.8, 2.4], VOLLEY: [-26, 0, 26], SHELL_GAP: 0.14, SHELL: 0.5, SHELL_WALL: 14, SPLASH: 26, DIRECT: 4,
    LAUNCH_EVERY: 6, TROOPS_EVERY: 5, BOMBS_EVERY: 4.5, BAY_BOMBS: 4, BRIDGE_GUN: 2, BURST: 3, SHOT_HURT: 0.5,
    // With no live gun over the page it moves at SEEK to bring one over; deck guns fire bursts every DECK_GUN seconds
    // in the guns stage; every BAIL of its health lost, crew bail out on chutes, shooting as they come down.
    SEEK: 60, DECK_GUN: 2.6, BAIL: 0.08, BAIL_EVERY: 1.6, BAIL_HURT: 0.35,
    // The final wave opens with a teaser: an ordinary zeppelin (DECOY_HP of a usual one, no armor) to thin music; once
    // it's down, TEASE_GAP seconds of quiet, then the real thing.
    DECOY_HP: 0.75, TEASE_GAP: 3, DECOY_BUILD: 4.5, DECOY_SPEED: 16,
    // When the last gun goes, explosions run along the hull for CHAIN seconds and it lurches.
    CHAIN: 1.4,
    // In the bridge stage it sinks lower and lists as the bridge takes damage, up to SAG px, easing there.
    SAG: 140, LIST: 0.06,
    // The bridge stage's main gun, a big turret in the belly amidships (at LX) with a BARREL-long gun: when the stage
    // opens it lowers out of the hull and swings its barrel down at the bunker over DEPLOY seconds. Then every EVERY
    // seconds it charges for CHARGE seconds (the muzzle glowing, rings gathering on it, a target on the bunker), and
    // fires one big shell at the bunker (WALL to the wall). BREAK damage to the glowing muzzle during the charge knocks
    // it off target.
    CANNON: { LX: 75, BARREL: 44, DEPLOY: 1.2, FIRST: 2.5, EVERY: 7, CHARGE: 3, WALL: 40, BREAK: 14, FLIGHT: 0.6 },
    // Boarding lines, in the bridge stage too: every BOARD_EVERY seconds BOARD_ROPES ropes drop from the hull and
    // BOARD_TROOPS troopers slide down each, BOARD_GAP apart, at BOARD_FALL px/s.
    BOARD_EVERY: 6, BOARD_ROPES: 2, BOARD_TROOPS: 3, BOARD_GAP: 0.45, BOARD_FALL: 130,
    // Downed, it falls (FALL px/s², nosing down toward DIVE) until its bow (NOSE px out) digs into the ground. The
    // hull slams down after it over SLAM seconds and breaks its back at TEAR, then burns where it lies. After SETTLE
    // seconds the wreck no longer holds up the wave (S.wreck): it smolders behind the victory banner until the next
    // wave, its fires dying down over BURN seconds.
    CRASH: { FALL: 95, MAX_VY: 260, DIVE: 0.2, NOSE: 276, SLAM: 0.5, REST: 0.02, TEAR: 60, SETTLE: 1.4, BURN: 4 }
  };
  function turretHP(n) { return Math.round(30 + 2.5 * n); }
  function hangarHP(n) { return Math.round(70 + 5 * n); }
  function bridgeHP(n) { return Math.round(80 + 6 * n); }
  // Wave 20, then every tenth wave in endless.
  function isDreadWave(n) { return n >= DREAD.WAVE && (n - DREAD.WAVE) % DREAD.EVERY === 0; }
  function dread() { return w.S.planes.find(function (p) { return p.kind === 'dread'; }) || null; }
  function fighting(p) { return p.phase === 'guns' || p.phase === 'hangar' || p.phase === 'bridge'; }
  // Shot down: falling, or a wreck on the ground.
  function down(p) { return p.phase === 'sinking' || p.phase === 'wreck'; }
  // Where it stops: its first station as it sails in (the bow-most guns over the page), then the hangar over the
  // middle, then the bridge well out ahead with the bomb bay still on the page behind it.
  function settleX(p) { return 200 - p.dir * 130; }
  function stageX(p) { return p.phase === 'hangar' ? 200 - p.dir * DREAD.HANGAR : 200 + p.dir * 120 - p.dir * DREAD.BRIDGE; }

  function spawnDread() {
    var S = w.S, rnd = substream(w.RW), n = S.wave, dir = rnd() < 0.5 ? -1 : 1;
    var p = w.makePlane('dread', dir, dir < 0 ? W + DREAD.HW + 40 : -DREAD.HW - 40, DREAD.Y);
    p.rng = rnd; p.hw = DREAD.HW; p.hh = DREAD.HH; p.speed = DREAD.ENTER; p.phase = 'arrive'; p.t = 0; p.move = dir; p.rot = 0;
    p.wait = DREAD.APPROACH; p.smokeT = 0; p.rumbleT = 1.3;
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
    addText('the Dreadnought is coming!', dir > 0 ? 130 : W - 130, 250, RED, 24, 'alert');
    return p;
  }

  // Where its parts are on the page, turned with the hull as it lists.
  function at(p, lx, ly) {
    var r = p.rot || 0, c = Math.cos(r), s = Math.sin(r);
    return { x: p.x + p.dir * (lx * c - ly * s), y: p.y + lx * s + ly * c };
  }
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
    if (p.phase === 'bridge' && p.cannon && p.cannon.charge > 0) { var m = muzzleAt(p); if (Math.abs(x - m.x) < 16 + pad && Math.abs(y - m.y) < 16 + pad) return p.cannon; }
    var b = bridgeAt(p);
    if (Math.abs(x - b.x) < 34 + pad && Math.abs(y - b.y) < 14 + pad) return p.bridge;
    return null;
  }
  // The main gun in the belly: its turret, lowered out of the hull as it deploys, and its muzzle, the barrel swinging
  // from along the hull (stowed, pointing at the bow) down to the bunker.
  function deployed(p) { var d = p.cannon ? p.cannon.deploy : 0; return d * d * (3 - 2 * d); }
  function cannonAt(p) { return at(p, DREAD.CANNON.LX, DREAD.HH - 18 + 20 * deployed(p)); }
  function muzzleAt(p) {
    var c = cannonAt(p), aim = Math.atan2(BK.top - c.y, BK.x - c.x), stow = p.dir > 0 ? 0 : Math.PI, a = stow + (aim - stow) * deployed(p);
    return { x: c.x + Math.cos(a) * DREAD.CANNON.BARREL, y: c.y + Math.sin(a) * DREAD.CANNON.BARREL, a: a };
  }
  // The hull is a long armored cigar; its guns, hangar and bridge car hang below it.
  // On the way in (once it's on the page) shots clang off it, so you can see it can't be hurt yet.
  function arriving(p) { return p.phase === 'arrive' && !(p.wait > 0); }
  function dreadHit(p, x, y, near) {
    if (!fighting(p) && !arriving(p)) return false;
    var lx = (x - p.x) * p.dir, half = DREAD.HH * clamp((DREAD.HW - Math.abs(lx)) / 50, 0, 1);
    return Math.abs(y - p.y) < half + near || !!partAt(p, x, y, near);
  }
  // direct: a bullet; otherwise a blast, which reaches a part within reach. Only the stage's part can be hurt.
  function hurtDread(p, dmg, owner, hx, hy, direct) {
    if (!fighting(p)) { clang(p, hx, hy); return; }
    var part = partAt(p, hx, hy, direct ? 0 : 24);
    if (part && p.turrets.indexOf(part) >= 0) { hurtGun(p, part, dmg, owner, hx, hy); return; }
    if (part === p.hangar && p.phase === 'hangar') { hurtHangar(p, dmg, owner, hx, hy); return; }
    if (part === p.bridge && p.phase === 'bridge') { hurtBridge(p, dmg, owner, hx, hy); return; }
    if (part === p.cannon) { hurtCannon(p, dmg, owner, hx, hy); return; }
    // Armor: hits elsewhere clang.
    clang(p, hx, hy);
  }
  function clang(p, hx, hy) {
    p.clankT -= 1;
    if (p.clankT <= 0) { p.clankT = 6; w.sound.play('clank'); w.S.parts.push({ k: 'tink', x: hx, y: hy, life: 0.22, max: 0.22, c: INK2, id: w.id() }); }
  }
  // A gun that's aiming has its breech open: it takes DREAD.EXPOSED times the damage, so quick fire saves the target.
  function hurtGun(p, t, dmg, owner, hx, hy) {
    var S = w.S, g = gunAt(p, t);
    t.hp -= dmg * (t.mark ? DREAD.EXPOSED : 1); t.flash = 0.1; w.burst(hx, hy, 3, INK, 90);
    bail(p);
    if (t.hp > 0) { w.sound.play('thup'); return; }
    t.dead = true; t.hp = 0;
    // It blows apart: a flash, flame, and the turret's pieces tumbling off. A scorched hole is left in the hull.
    w.pow(g.x, g.y, 40); w.burst(g.x, g.y, 14, RED, 190); w.burst(g.x, g.y, 8, INK, 150); w.puff(g.x, g.y, 9, 1);
    for (var k = 0; k < 5; k++) S.parts.push({ k: 'scrap', x: g.x + rr(-12, 12), y: g.y + rr(-6, 6), vx: rr(-90, 90), vy: rr(-120, -20), rot: rr(0, 6), vr: rr(-8, 8), s: rr(4, 8), c: '#8a8f96', life: 1.6, max: 1.6, id: w.id() });
    w.award(200, g.x, g.y + 34, 'gun down!', owner === 'ally' ? BLUE : INK, true); w.credit();
    emit('dread_gun', { by: owner === 'ally' ? 'crew' : 'player', left: p.turrets.filter(function (q) { return !q.dead; }).length });
    w.sound.play('boom'); S.shake = Math.max(S.shake, 0.3);
    // Knocked out while aiming: the volley never comes.
    if (t.mark) { addText('saved!', t.mark.x, GROUND - 70, BLUE, 26); emit('dread_saved', { target: t.mark.kind }); t.mark = null; }
    if (p.turrets.every(function (q) { return q.dead; })) openHangar(p);
  }
  // The last gun gone: explosions run along the hull and it lurches, then the hangar opens (and the lights go out).
  function chain(p, dt) {
    p.chainT -= dt; p.boomT -= dt;
    p.rot = Math.sin(p.chainT * 9) * 0.035 * Math.min(1, p.chainT);
    if (p.chainT <= 0) { p.rot = 0; return; }
    if (p.boomT <= 0) {
      p.boomT = rr(0.08, 0.16);
      var bx = clamp(p.x + rr(-0.9, 0.9) * DREAD.HW, 10, W - 10), by = p.y + rr(-0.5, 0.7) * DREAD.HH;
      w.pow(bx, by, rr(14, 24)); w.burst(bx, by, 5, RED, 130); w.puff(bx, by, 5, 0.9); w.sound.play('hit');
    }
  }
  function openHangar(p) {
    var S = w.S;
    p.chainT = DREAD.CHAIN; p.boomT = 0;
    p.phase = 'hangar'; p.t = 0; p.launchT = 1.2 + DREAD.CHAIN; p.troopT = 2 + DREAD.CHAIN;
    addText('the hangar opens!', 200, 260, RED, 24, 'alert');
    emit('dread_hangar', { wave: S.wave });
    w.sound.play('klaxon'); S.shake = Math.max(S.shake, 0.4);
  }
  function hurtHangar(p, dmg, owner, hx, hy) {
    var S = w.S, h = p.hangar, at0 = hangarAt(p);
    h.hp -= dmg; h.flash = 0.1; w.burst(hx, hy, 4, RED, 110);
    bail(p);
    if (h.hp > 0) { w.sound.play('thup'); return; }
    h.hp = 0;
    w.pow(at0.x, at0.y, 50); w.burst(at0.x, at0.y, 14, RED, 180);
    w.award(400, at0.x, at0.y + 40, 'hangar down!', owner === 'ally' ? BLUE : INK, true); w.credit();
    S.shake = Math.max(S.shake, 0.5); w.sound.play('boom');
    p.phase = 'bridge'; p.t = 0; p.bombT = 1.5; p.gunT = 1.2;
    p.cannon = { t: DREAD.CANNON.FIRST, charge: 0, hp: 0, shell: null, flash: 0, recoil: 0, deploy: 0, n: 0, id: w.id() }; p.boardT = 3; p.ropes = [];
    w.sound.play('clank');
    addText('the bridge is exposed!', 200, 250, RED, 24, 'alert');
    emit('dread_bridge', { wave: S.wave });
    w.sound.play('klaxon');
  }
  function hurtBridge(p, dmg, owner, hx, hy) {
    var b = p.bridge;
    b.hp -= dmg; b.flash = 0.1; w.burst(hx, hy, 4, RED, 110);
    if (b.hp <= 0) { b.hp = 0; dreadDown(p, owner); } else { w.sound.play('thup'); bail(p); }
  }
  function dreadDown(p, owner) {
    var S = w.S, b = bridgeAt(p), final = S.wave === DREAD.WAVE && !S.won;
    p.phase = 'sinking'; p.t = 0; p.vy = 0; p.boomT = 0; p.smokeT = 0; p.ropes = []; clearMarks(p);
    if (p.cannon) { p.cannon.charge = 0; p.cannon.shell = null; }
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

  // ---------- the crash ----------
  // Falling: nosing down, explosions running along it and smoke pouring off, until the bow digs in.
  function fall(p, dt) {
    var S = w.S, C = DREAD.CRASH;
    p.vy = Math.min(p.vy + C.FALL * dt, C.MAX_VY); p.y += p.vy * dt;
    p.rot += (C.DIVE - p.rot) * Math.min(1, dt * 1.2);
    if ((p.boomT -= dt) <= 0) {
      p.boomT = rr(0.12, 0.22);
      var b = at(p, rr(-0.9, 0.95) * DREAD.HW, rr(-0.6, 0.8) * DREAD.HH), bx = clamp(b.x, 10, W - 10);
      w.pow(bx, b.y, rr(16, 30)); w.burst(bx, b.y, 6, RED, 140); w.puff(bx, b.y, 7, 1.1); w.sound.play('hit');
    }
    if ((p.smokeT -= dt) <= 0) { p.smokeT = 0.07; var f = at(p, rr(-0.7, 0.9) * DREAD.HW, -DREAD.HH * 0.6); w.puff(clamp(f.x, 4, W - 4), f.y, rr(6, 11), rr(1.2, 1.8)); }
    var nose = at(p, C.NOSE, DREAD.HH * 0.3);
    if (nose.y < GROUND - 2 && p.t < 8) return;
    // The bow digs in: a blast and a spray of dirt where it hits, and the hull starts to come down after it.
    p.phase = 'wreck'; p.t = 0; p.pivot = { x: nose.x, y: nose.y, rot: p.rot }; p.broken = 0;
    var nx = clamp(nose.x, 16, W - 16);
    w.pow(nx, GROUND - 14, 54); w.burst(nx, GROUND - 8, 12, INK2, 220); w.burst(nx, GROUND - 12, 8, RED, 180);
    for (var k = 0; k < 4; k++) w.puff(nx + rr(-30, 30), GROUND - rr(4, 20), rr(10, 16), 1.6);
    S.shake = Math.max(S.shake, 0.8); w.sound.play('broadside'); w.sound.play('boom');
  }
  // On the ground: the hull slams down and breaks its back, then burns. Once it has settled it moves to S.wreck,
  // where game.js keeps it smoldering (and drawn) until the next wave starts.
  function wreck(p, dt) {
    var S = w.S, C = DREAD.CRASH;
    if (!p.slammed) {
      // Pivoting on the buried bow, faster and faster.
      var e = Math.min(1, p.t / C.SLAM), r = p.pivot.rot + (C.REST - p.pivot.rot) * e * e, lx = C.NOSE, ly = DREAD.HH * 0.3;
      p.rot = r;
      p.x = p.pivot.x - p.dir * (lx * Math.cos(r) - ly * Math.sin(r));
      p.y = p.pivot.y - (lx * Math.sin(r) + ly * Math.cos(r));
      if (e >= 1) slam(p);
      return;
    }
    p.broken = Math.min(1, p.broken + dt * 5);
    // Burning: smoke off the fires, and now and then something inside goes up.
    var burn = clamp(1 - (p.t - C.SLAM) / C.BURN, 0.3, 1);
    if ((p.smokeT -= dt) <= 0) {
      p.smokeT = rr(0.18, 0.3) / burn;
      var f = FIRES[Math.floor(rr(0, FIRES.length))], q = at(p, f[0], DREAD.HH * f[1]);
      if (q.x > -10 && q.x < W + 10) w.puff(q.x + rr(-8, 8), q.y - rr(6, 16), rr(7, 12), rr(1.4, 2.2));
    }
    if ((p.boomT -= dt) <= 0) {
      p.boomT = rr(0.5, 1.2) / burn;
      var x = rr(20, W - 20), y = GROUND - rr(10, 50);
      w.burst(x, y, 5, burn > 0.6 ? RED : '#ff8a2a', 110);
      if (burn > 0.6) { w.pow(x, y, rr(12, 20)); w.sound.play('thump'); }
    }
    if (!p.settled && p.t >= C.SLAM + C.SETTLE) { p.settled = true; S.wreck = p; p.gone = true; }
  }
  // The hull hits the ground: the page shakes, fire and dust run along it, and wreckage flies.
  function slam(p) {
    var S = w.S, tear = at(p, DREAD.CRASH.TEAR, 0), i;
    p.slammed = true; p.t = DREAD.CRASH.SLAM;
    for (i = 0; i < 7; i++) {
      var x = 22 + i * 59 + rr(-14, 14);
      w.pow(x, GROUND - rr(10, 34), rr(28, 46)); w.burst(x, GROUND - 10, 6, INK2, 210); w.puff(x, GROUND - 8, rr(12, 18), 1.8);
    }
    w.burst(tear.x, tear.y, 14, RED, 240);
    for (i = 0; i < 12; i++) {
      var sx = i < 5 ? tear.x : rr(10, W - 10);
      S.parts.push({ k: 'scrap', x: sx + rr(-10, 10), y: GROUND - rr(20, 50), vx: rr(-170, 170), vy: rr(-210, -80), rot: rr(0, 6), vr: rr(-9, 9), s: rr(5, 10), c: '#8a8f96', life: 2, max: 2, id: w.id() });
    }
    S.shake = Math.max(S.shake, 1); w.sound.play('crash');
    emit('dread_crash', { wave: S.wave });
  }
  // Where the wreck burns, stern to bow (local x, and y as a share of the hull's half height; the third is the size).
  var FIRES = [[-150, -0.45, 0.8], [-70, -0.55, 1], [10, -0.4, 0.9], [60, -0.25, 1.5], [140, -0.5, 1], [225, -0.35, 0.9]];

  function updateDread(p, dt) {
    var S = w.S;
    p.t += dt;
    p.turrets.forEach(function (t) { t.flash = Math.max(0, t.flash - dt); t.recoil = Math.max(0, t.recoil - dt * 4); });
    if (p.deckFlash) p.deckFlash.t -= dt;
    if (p.unlockT > 0) p.unlockT -= dt;
    p.bridge.flash = Math.max(0, p.bridge.flash - dt); p.hangar.flash = Math.max(0, p.hangar.flash - dt);
    p.hangar.open = clamp(p.hangar.open + (p.phase === 'hangar' || p.phase === 'bridge' ? dt : -dt) * 1.5, 0, 1);
    updateShells(p, dt);
    if (p.phase === 'sinking') { fall(p, dt); return; }
    if (p.phase === 'wreck') { wreck(p, dt); return; }
    // Going down by the bridge's health: it sinks and lists, bow first, gradually.
    if (p.phase === 'bridge') {
      var hurt = 1 - p.bridge.hp / p.bridge.max;
      p.sag = (p.sag || 0) + (hurt * DREAD.SAG - (p.sag || 0)) * Math.min(1, dt * 3);
      if (!(p.chainT > 0)) p.rot = DREAD.LIST * hurt;
    }
    p.y = DREAD.Y + Math.sin(S.t * 0.7) * 2 + (p.sag || 0);
    if (p.chainT > 0) chain(p, dt);
    if (p.phase === 'arrive' && p.wait > 0) {
      // Off the page, coming: rumbling, smoke from its stacks drifting in, searchlights sweeping in from that edge.
      p.wait -= dt; p.smokeT -= dt; p.rumbleT -= dt;
      var k = 1 - p.wait / DREAD.APPROACH, ex = p.dir > 0 ? 6 : W - 6;
      if (p.smokeT <= 0) { p.smokeT = 0.25; w.puff(ex + p.dir * rr(0, 30), DREAD.Y - 50 + rr(-12, 12), rr(5, 9), 1.4); }
      if (p.rumbleT <= 0) { p.rumbleT = 1.3; S.shake = Math.max(S.shake, 0.12 + 0.2 * k); w.sound.play('rumble'); }
      if (p.wait <= 0) {
        // The payoff: its name across the page, a brass sting, and the squad realizing what it is.
        w.sound.play('horn'); w.sound.play('sting'); S.shake = Math.max(S.shake, 0.45);
        S.banner = { s: 'dreadnought!', sub: 'the enemy flagship', t: 0, dur: 3.2 };
        // "...oh." first, then two more from the pool, picked cosmetically so it differs run to run.
        var crew = S.recruits.filter(w.standing), pool = ['oh sh*t', "dang, that's long", '\ud83c\udf46', 'oh no.', 'we need a bigger gun'];
        for (var q = pool.length - 1; q > 0; q--) { var j = Math.floor(Math.random() * (q + 1)), tmp = pool[q]; pool[q] = pool[j]; pool[j] = tmp; }
        ['...oh.'].concat(pool).slice(0, Math.min(3, crew.length)).forEach(function (line, i) { w.say(line, crew[i].id, false, 0.8 + i * 1.2); });
      }
      return;
    }
    if (p.phase === 'arrive') {
      // Sailing in, slowing as it reaches its first station; then the fight starts.
      var to = settleX(p), d = to - p.x;
      p.x += Math.sign(d) * Math.min(Math.abs(d), Math.max(14, Math.min(DREAD.ENTER, Math.abs(d) * 0.7)) * dt);
      if (Math.abs(d) < 1) {
        p.phase = 'guns'; p.t = 0; p.move = -p.dir;
        S.shake = Math.max(S.shake, 0.4); w.sound.play('horn'); w.sound.play('bugle');
        // The cue that it can be hurt now: the gauges light up, its guns flash, and the squad opens fire.
        p.unlockT = 1.6; p.turrets.forEach(function (t) { t.flash = 0.5; });
        addText('open fire!', 200, 300, BLUE, 32, 'story');
        var caller = S.recruits.filter(w.standing)[0]; if (caller) w.say('open fire!', caller.id, false, 0.3);
        emit('dread_arrive', { wave: S.wave });
      }
      return;
    }
    if (p.phase === 'guns') {
      // Patrolling, so every gun takes a turn over the page. With no live gun over the page it hurries to bring the
      // nearest one over, and carries on that way, so it never just drifts.
      var live = p.turrets.filter(function (t) { return !t.dead; }), over = live.some(function (t) { var x = gunAt(p, t).x; return x > 40 && x < W - 40; });
      if (!over && live.length) {
        var shift = live.map(function (t) { return 200 - gunAt(p, t).x; }).sort(function (a, b) { return Math.abs(a) - Math.abs(b); })[0];
        p.move = Math.sign(shift) || p.move; p.x += p.move * Math.min(Math.abs(shift), DREAD.SEEK * dt);
      } else {
        p.x += p.move * DREAD.DRIFT * dt;
        if (p.x <= DREAD.PATROL[0]) { p.x = DREAD.PATROL[0]; p.move = 1; } else if (p.x >= DREAD.PATROL[1]) { p.x = DREAD.PATROL[1]; p.move = -1; }
      }
      updateGuns(p, dt);
      deckGun(p, dt);
    } else {
      // The hangar, then the bridge, comes over the page and sways there.
      var want = stageX(p) + Math.sin(p.t * 0.5) * DREAD.SWAY;
      p.x += clamp(want - p.x, -30 * dt, 30 * dt);
    }
    var h = hangarAt(p), onPage = h.x > 30 && h.x < W - 30;
    if (p.phase === 'hangar' && onPage) {
      // The hangar launches dive bombers in pairs: they roll out to either side, climb off the page and come back in
      // on dive-bombing runs at the bunker. It drops troops too.
      if ((p.launchT -= dt) <= 0) {
        p.launchT = DREAD.LAUNCH_EVERY;
        [-1, 1].forEach(function (out) { w.SKY.launchDiver(p.rng, { x: h.x + out * 12, y: h.y + 12 }, out); });
        w.sound.play('fighter'); emit('dread_launch', {});
      }
      if ((p.troopT -= dt) <= 0) { p.troopT = DREAD.TROOPS_EVERY; [-14, 0, 14].forEach(function (o) { w.spawnTrooper(clamp(h.x + o, 16, W - 16), h.y + 18, w.rollTrooper(p.rng)); }); }
    } else if (p.phase === 'bridge') {
      // The bomb bay (the gutted hangar) drops clusters at the bunker; the bridge gunner fires at the crew.
      if (onPage && (p.bombT -= dt) <= 0) {
        p.bombT = DREAD.BOMBS_EVERY;
        for (var k = 0; k < DREAD.BAY_BOMBS; k++) { var o = k - (DREAD.BAY_BOMBS - 1) / 2; S.bombs.push({ id: w.id(), x: h.x + o * 10, y: h.y + 8, vx: (BK.x - h.x) * 0.42 + o * 28, vy: 0, isBomb: true, dead: false }); emit('bomb_dropped', { by: 'dreadnought' }); }
        w.sound.play('whistle');
      }
      bridgeGun(p, dt);
      mainGun(p, dt);
      boarding(p, dt);
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
  // The main gun: it lowers out of the belly and swings down at the bunker, then charges (the muzzle glowing hotter,
  // rings gathering on it, a whine and quickening beeps, a target on the bunker), then fires one big shell at the
  // bunker. Enough damage to the glowing muzzle during the charge knocks it off target.
  function mainGun(p, dt) {
    var S = w.S, c = p.cannon, C = DREAD.CANNON, m = muzzleAt(p);
    c.flash = Math.max(0, c.flash - dt); c.recoil = Math.max(0, c.recoil - dt * 2.5);
    if (c.deploy < 1) {
      c.deploy = Math.min(1, c.deploy + dt / C.DEPLOY);
      if (c.deploy >= 1) {
        // Locked on: a heavy clunk, and the squad told what it is.
        m = muzzleAt(p); c.recoil = 0.5;
        w.sound.play('cannon'); w.sound.play('clank'); S.shake = Math.max(S.shake, 0.35); w.puff(m.x, m.y, 8, 0.8);
        addText('the main gun!', clamp(m.x - p.dir * 80, 80, W - 80), m.y + 10, RED, 26, 'alert');
      }
      return;
    }
    if (c.shell && (c.shell.t += dt) >= C.FLIGHT) {
      c.shell = null;
      w.explode(BK.x, BK.top, 40, 'broadside'); w.pow(BK.x, BK.top, 52); w.burst(BK.x, BK.top, 14, RED, 210);
      w.hurtWall(C.WALL, 'dreadnought'); w.wallText(C.WALL);
      S.recruits.forEach(function (r) { if (!r.dead && Math.abs(r.x - BK.x) < 60) w.hurtRecruit(r, 1.5, 'dreadnought'); });
      S.shake = Math.max(S.shake, 0.8); w.sound.play('boom');
      emit('dread_cannon', { wall: C.WALL });
    }
    if (c.charge > 0) {
      c.charge += dt;
      if (c.charge >= C.CHARGE) {
        c.charge = 0; c.t = C.EVERY; c.recoil = 1; c.flash = 0.2;
        c.shell = { x0: m.x, y0: m.y, t: 0 };
        w.pow(m.x, m.y, 36); w.burst(m.x, m.y, 10, '#ffd226', 170); w.puff(m.x, m.y, 14, 1.2);
        S.shake = Math.max(S.shake, 0.6); w.sound.play('maingun');
      }
      return;
    }
    if ((c.t -= dt) > 0 || m.x < 16 || m.x > W - 16) return;
    c.charge = 1e-4; c.hp = C.BREAK; c.n++; w.sound.play('charge');
    emit('dread_charge', {});
  }
  function hurtCannon(p, dmg, owner, hx, hy) {
    var c = p.cannon;
    c.hp -= dmg; c.flash = 0.08; w.burst(hx, hy, 3, '#ffd226', 100);
    if (c.hp > 0) { w.sound.play('clank'); return; }
    var m = muzzleAt(p);
    c.charge = 0; c.t = DREAD.CANNON.EVERY; c.recoil = 1;
    w.pow(m.x, m.y, 30); w.burst(m.x, m.y, 10, RED, 160); w.puff(m.x, m.y, 8, 0.9);
    w.award(150, m.x, m.y + 30, 'knocked off target!', owner === 'ally' ? BLUE : INK, true);
    addText('saved!', BK.x, BK.top - 50, BLUE, 26);
    w.sound.play('boom'); emit('dread_cannon_saved', { by: owner === 'ally' ? 'crew' : 'player' });
  }
  // Boarding lines: ropes drop from the hull over the field and troopers slide down them, no chutes.
  function boarding(p, dt) {
    var S = w.S;
    p.ropes.forEach(function (r) {
      if (r.n <= 0 || (r.t -= dt) > 0) return;
      r.n--; r.t = DREAD.BOARD_GAP;
      var t = w.spawnTrooper(r.x, p.y + DREAD.HH + 6, w.rollTrooper(p.rng));
      t.state = 'rope'; t.open = 0; t.fall = DREAD.BOARD_FALL; t.board = p.id;
      emit('rope', { x: t.x });
    });
    p.ropes = p.ropes.filter(function (r) { return r.n > 0 || S.troopers.some(function (t) { return !t.dead && t.state === 'rope' && t.board === p.id && Math.abs(t.x - r.x) < 2; }); });
    if ((p.boardT -= dt) > 0) return;
    p.boardT = DREAD.BOARD_EVERY;
    for (var i = 0; i < DREAD.BOARD_ROPES; i++) {
      var lo = Math.max(30, p.x - DREAD.HW * 0.8), hi = Math.min(W - 30, p.x + DREAD.HW * 0.8), x = between(p.rng, lo, hi);
      if (Math.abs(x - BK.x) < 70) x = BK.x + (x < BK.x ? -70 : 70);
      p.ropes.push({ x: clamp(x, 24, W - 24), n: DREAD.BOARD_TROOPS, t: i * 0.3 });
    }
    if (!p.boardTold) { p.boardTold = true; addText('boarders!', 200, 330, RED, 24, 'alert'); }
    emit('dread_board', {});
  }
  // The bridge gunner: a burst of BURST shots every BRIDGE_GUN seconds at the nearest soldier standing.
  function bridgeGun(p, dt) {
    var b = bridgeAt(p);
    if (b.x < 10 || b.x > W - 10) return;
    gunner(p, dt, DREAD.BRIDGE_GUN, function () { return { x: b.x, y: b.y + 10 }; }, function () { p.bridge.flash = 0.04; });
  }
  // Deck guns in the guns stage: the same bursts, from the hull right over the soldier they're aimed at.
  function deckGun(p, dt) {
    gunner(p, dt, DREAD.DECK_GUN, function (r) {
      var x = clamp(r.x, Math.max(20, p.x - DREAD.HW * 0.85), Math.min(W - 20, p.x + DREAD.HW * 0.85));
      return { x: x, y: p.y + DREAD.HH * 0.9 };
    }, function (src) { p.deckFlash = { x: src.x, y: src.y, t: 0.06 }; });
  }
  function gunner(p, dt, every, from, flash) {
    var S = w.S, first = from({ x: 200 });
    var crew = S.recruits.filter(function (r) { return !r.dead && !r.down; }).sort(function (a, c) { return Math.abs(a.x - first.x) - Math.abs(c.x - first.x); });
    if (!crew.length) return;
    if (p.burst <= 0) { if ((p.gunT -= dt) <= 0) { p.gunT = every; p.burst = DREAD.BURST; p.burstT = 0; } return; }
    if ((p.burstT -= dt) > 0) return;
    p.burst--; p.burstT = 0.13;
    var src = from(crew[0]); flash(src);
    var a = Math.atan2(GROUND - 22 - src.y, crew[0].x - src.x) + (w.RC() * 2 - 1) * 0.04;
    S.enemyShots.push({ x: src.x, y: src.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: 2.5, dmg: DREAD.SHOT_HURT, cause: 'dreadnought' });
    w.sound.play('sniper');
  }
  // Crew bail out as it takes damage: one or two for every DREAD.BAIL of its health lost, from the hull over the
  // page, on chutes, firing at the squad on the way down (game.js updateTroopers). Ordinary troopers otherwise, so
  // they can be caught.
  function bail(p) {
    var S = w.S, left = p.turrets.reduce(function (s, t) { return s + Math.max(0, t.hp); }, 0) + Math.max(0, p.hangar.hp) + Math.max(0, p.bridge.hp);
    var due = Math.floor((1 - left / p.maxHp) / DREAD.BAIL);
    while ((p.bailed || 0) < due) {
      p.bailed = (p.bailed || 0) + 1;
      var n = p.rng() < 0.5 ? 1 : 2;
      for (var i = 0; i < n; i++) {
        var x = clamp(p.x + (p.rng() * 2 - 1) * DREAD.HW * 0.7, 30, W - 30), kit = w.rollTrooper(p.rng);
        kit.type = 'rifle'; kit.gunner = true;
        w.spawnTrooper(x, p.y + DREAD.HH + 4, kit);
      }
      emit('dread_bail', { n: n });
    }
  }

  function clearMarks(p) { p.turrets.forEach(function (t) { t.mark = null; }); }
  function marks(p) { return p.turrets.filter(function (t) { return t.mark; }).length; }
  // One gun aims at a time while more than half of them stand, so there's time to react; the last two can aim together.
  function markCap(p) { return p.turrets.filter(function (t) { return !t.dead; }).length > p.turrets.length / 2 ? 1 : DREAD.MARKS; }
  // Guns: a gun over the page counts down its reload, aims for AIM seconds, then fires a volley of three. Up to
  // markCap aim at once, at different targets.
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
      // Guns reload off the page too, so one swings in loaded.
      t.cd -= dt;
      if (g.x < 24 || g.x > W - 24 || marks(p) >= markCap(p)) return;
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
    // The fewer guns it has left, the faster they reload: the last ones are frantic.
    var live = p.turrets.filter(function (q) { return !q.dead; }).length;
    t.cd = between(p.rng, DREAD.RELOAD[0], DREAD.RELOAD[1]) * Math.max(0.4, live / p.turrets.length);
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
  // Its two searchlights: from the housings under the hull to a pool on the ground, sweeping. While it's still off the
  // page they reach in from that edge, brightening (k). Shared with the night (sky.js drawNight).
  function dreadBeams() {
    var p = dread(), S = w.S;
    if (!p || down(p)) return [];
    var coming = p.phase === 'arrive' && p.wait > 0, k = coming ? 1 - p.wait / DREAD.APPROACH : 1;
    return DREAD.LIGHTS.map(function (lx, i) {
      var sweep = Math.sin(S.t * (0.6 + i * 0.25) + i * 2), l;
      if (coming) { var ex = p.dir > 0 ? -10 : W + 10; l = { x: ex, y: DREAD.Y + 26 + i * 18 }; return { x: l.x, y: l.y, gx: ex + p.dir * (90 + 80 * i + sweep * 60), k: k }; }
      l = at(p, lx, DREAD.HH * 0.8);
      return { x: l.x, y: l.y, gx: l.x + sweep * 120, k: 1 };
    });
  }
  function drawDread(p) {
    var S = w.S, G = w.G, gone = down(p);
    // Its shadow on the ground, and the searchlights sweeping it.
    if (!gone) {
      G.beginPath(); G.ellipse(clamp(p.x, -100, W + 100), GROUND - 2, DREAD.HW * 0.8, 5, 0, 0, Math.PI * 2); G.fillStyle = 'rgba(46,46,51,0.07)'; G.fill();
      dreadBeams().forEach(function (b) {
        G.beginPath(); G.moveTo(b.x - 4, b.y); G.lineTo(b.gx - 34, GROUND); G.lineTo(b.gx + 34, GROUND); G.lineTo(b.x + 4, b.y); G.closePath();
        G.fillStyle = 'rgba(255,224,110,' + 0.13 * b.k + ')'; G.fill();
        G.beginPath(); G.ellipse(b.gx, GROUND - 3, 34, 6, 0, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,' + 0.16 * b.k + ')'; G.fill();
      });
    }
    // Going down, whatever hits the ground first is buried, and the wreck lies half buried: nothing shows below the
    // ground line.
    G.save();
    if (gone) { G.beginPath(); G.rect(-80, -80, W + 160, GROUND + 81); G.clip(); }
    // The main gun hangs from the belly, so it's drawn first and the hull covers its top.
    if (p.cannon) drawCannon(p);
    G.save(); G.translate(p.x, p.y); G.scale(p.dir, 1); if (p.rot) G.rotate(p.rot);
    if (p.broken) drawBroken(p); else drawBody(p);
    G.restore();
    G.restore();
    if (gone) drawFires(p);
    // Boarding ropes from the hull to the ground.
    (p.ropes || []).forEach(function (r) { G.beginPath(); SP([r.x, p.y + DREAD.HH, r.x + 2, (p.y + GROUND) / 2, r.x, GROUND - 26], false, 0.3); ink('#8b6b3e', 1.7); G.stroke(); });
    if (p.cannon && p.phase === 'bridge') drawCharge(p);
    if (p.deckFlash && p.deckFlash.t > 0) { G.beginPath(); G.arc(p.deckFlash.x, p.deckFlash.y + 3, 5, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,0.95)'; G.fill(); }
    p.turrets.forEach(function (t) { if (t.mark) drawMark(p, t, t.mark); });
    p.shells.forEach(function (s) {
      if (!s.launched) return;
      var u = clamp(s.t / DREAD.SHELL, 0, 1), x = s.x0 + (s.x1 - s.x0) * u, y = s.y0 + (GROUND - 12 - s.y0) * u - Math.sin(u * Math.PI) * 22;
      G.beginPath(); G.ellipse(x, y, 5, 3, Math.atan2(GROUND - 12 - s.y0, s.x1 - s.x0), 0, Math.PI * 2); G.fillStyle = INK; G.fill();
      G.beginPath(); L(x, y, x - (s.x1 - s.x0) * 0.08, y - (GROUND - s.y0) * 0.08, 0.3); ink('rgba(200,67,58,0.6)', 2.4); G.stroke();
    });
  }
  // The main gun: an armored turret in the belly and a heavy barrel with a muzzle brake, red-hot as it charges; it kicks
  // back when it fires.
  function drawCannon(p) {
    var G = w.G, c = p.cannon, cm = cannonAt(p), mz = muzzleAt(p), ck = c.charge > 0 ? c.charge / DREAD.CANNON.CHARGE : 0;
    var ca = Math.cos(mz.a), sa = Math.sin(mz.a), nx = -sa, ny = ca, rc = c.recoil * 12;
    var bx = mz.x - ca * rc, by = mz.y - sa * rc, b0x = cm.x - ca * rc * 0.4, b0y = cm.y - sa * rc * 0.4;
    pen(c.id);
    G.beginPath(); L(b0x, b0y, bx, by, 0.2); ink(INK, 15); G.stroke();
    G.beginPath(); L(b0x, b0y, bx, by, 0.2); ink(ck > 0 ? 'rgba(220,60,40,' + (0.4 + 0.6 * ck) + ')' : c.flash > 0 ? PAPER : '#8a8f96', 10); G.stroke();
    var mx = b0x + (bx - b0x) * 0.55, my = b0y + (by - b0y) * 0.55;
    G.beginPath(); L(mx + nx * 7, my + ny * 7, mx - nx * 7, my - ny * 7, 0.1); ink(RED, 3.4); G.stroke();
    G.beginPath(); SP([bx - ca * 9 + nx * 10, by - sa * 9 + ny * 10, bx + nx * 10, by + ny * 10, bx - nx * 10, by - ny * 10, bx - ca * 9 - nx * 10, by - sa * 9 - ny * 10], true, 0.2);
    G.fillStyle = '#6f747b'; G.fill(); ink(INK, 2.2); G.stroke();
    G.beginPath(); G.arc(cm.x, cm.y, 22, 0, Math.PI * 2); G.fillStyle = '#8a8f96'; G.fill(); ink(INK, 2.8); G.stroke();
    G.beginPath(); G.arc(cm.x, cm.y, 13, 0, Math.PI * 2); ink('rgba(46,46,51,0.45)', 1.4); G.stroke();
    G.fillStyle = 'rgba(46,46,51,0.55)';
    for (var k = 0; k < 8; k++) { var a = k * Math.PI / 4; G.fillRect(cm.x + Math.cos(a) * 17.5 - 1, cm.y + Math.sin(a) * 17.5 - 1, 2, 2); }
  }
  // Charging: a marching line and a target closing on the bunker, rings gathering on the muzzle, the glow growing
  // white-hot, and a blue ring that fills as you hit it. Then its shell in flight, trailing smoke.
  function drawCharge(p) {
    var G = w.G, S = w.S, c = p.cannon, CC = DREAD.CANNON, mz = muzzleAt(p), k;
    G.save();
    if (c.shell) {
      var sh = c.shell, su = sh.t / CC.FLIGHT;
      for (k = 4; k >= 0; k--) {
        var u = Math.max(0, su - k * 0.07), sx = sh.x0 + (BK.x - sh.x0) * u, sy = sh.y0 + (BK.top - sh.y0) * u;
        G.globalAlpha = k ? 0.45 - k * 0.08 : 1; G.beginPath(); G.arc(sx, sy, k ? 9 - k : 8, 0, Math.PI * 2); G.fillStyle = k ? 'rgba(46,46,51,0.4)' : INK; G.fill();
        if (!k) { ink(RED, 2); G.stroke(); }
      }
    }
    if (c.charge > 0) {
      var ck = c.charge / CC.CHARGE, tx = mz.x + Math.cos(mz.a) * 6, ty = mz.y + Math.sin(mz.a) * 6, ky = BK.top - 12;
      G.globalAlpha = 0.45 + 0.5 * ck; G.setLineDash([10, 8]); G.lineDashOffset = -S.t * 60;
      G.beginPath(); G.moveTo(tx, ty); G.lineTo(BK.x, ky); ink(RED, 2 + 2 * ck); G.stroke(); G.setLineDash([]);
      var tr = 42 - 20 * ck;
      G.globalAlpha = Math.floor(S.t * (4 + 10 * ck)) % 2 ? 1 : 0.5;
      G.beginPath(); G.arc(BK.x, ky, tr, 0, Math.PI * 2); ink(RED, 2.4); G.stroke();
      for (k = 0; k < 4; k++) {
        var ra = k * Math.PI / 2 + S.t * 1.5;
        G.beginPath(); G.moveTo(BK.x + Math.cos(ra) * (tr - 7), ky + Math.sin(ra) * (tr - 7)); G.lineTo(BK.x + Math.cos(ra) * (tr + 8), ky + Math.sin(ra) * (tr + 8)); ink(RED, 2.4); G.stroke();
      }
      for (k = 0; k < 3; k++) {
        var f = (S.t * 1.4 + k / 3) % 1;
        G.globalAlpha = f * (0.35 + 0.6 * ck); G.beginPath(); G.arc(tx, ty, 10 + 50 * (1 - f), 0, Math.PI * 2); ink('#ff9a2a', 2.6); G.stroke();
      }
      var r = (8 + 16 * ck) * (1 + 0.18 * Math.sin(S.t * 30 * (0.5 + ck))), gr = G.createRadialGradient(tx, ty, 0, tx, ty, r * 1.8);
      gr.addColorStop(0, 'rgba(255,244,190,0.98)'); gr.addColorStop(0.45, 'rgba(255,' + Math.round(200 - 110 * ck) + ',40,0.9)'); gr.addColorStop(1, 'rgba(255,120,40,0)');
      G.globalAlpha = 1; G.fillStyle = gr; G.beginPath(); G.arc(tx, ty, r * 1.8, 0, Math.PI * 2); G.fill();
      var hit = 1 - c.hp / CC.BREAK;
      if (hit > 0) { G.beginPath(); G.arc(tx, ty, r + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * hit); ink(BLUE, 3.6); G.stroke(); }
      // The first two charges point it out, beside the muzzle on the stern side.
      if (c.n <= 2) {
        var say = c.n === 1 ? 'hit its muzzle!' : 'hit it!', ax = tx - p.dir * (r + 24), ex = tx - p.dir * (r + 8);
        G.font = '22px ' + w.HAND; G.textAlign = 'center';
        var half = G.measureText(say).width / 2, lx = clamp(tx - p.dir * (r + 30 + half), half + 6, W - half - 6);
        G.lineWidth = 4; G.lineJoin = 'round'; G.strokeStyle = PAPER; G.strokeText(say, lx, ty + 7); G.fillStyle = RED; G.fillText(say, lx, ty + 7);
        G.beginPath(); L(ax, ty, ex, ty, 0.2); L(ex, ty, ex - p.dir * 7, ty - 6, 0.1); L(ex, ty, ex - p.dir * 7, ty + 6, 0.1); ink(RED, 2.4); G.stroke();
      }
    }
    G.restore();
  }
  // The hull's outline: a long cigar, pointed at the bow.
  var HULL = (function () {
    var pts = [];
    for (var i = 0; i < 44; i++) {
      var a = i / 44 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      pts.push(DREAD.HW * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 0.42), DREAD.HH * s * (c > 0 ? 1 - 0.25 * Math.pow(c, 6) : 1));
    }
    return pts;
  })();
  // Broken in two at TEAR: each half drawn on its own, clipped along a jagged tear, sagging away from the break, with
  // the charred inside showing through the gap.
  function drawBroken(p) {
    var G = w.G, k = p.broken, X = DREAD.CRASH.TEAR, hh = DREAD.HH, far = DREAD.HW + 120;
    var tear = [X + 5, -hh - 80, X - 4, -hh * 0.75, X + 6, -hh * 0.25, X - 5, hh * 0.3, X + 3, hh + 80];
    G.save(); G.beginPath(); SP(HULL, true, 0); G.clip();
    G.fillStyle = 'rgba(38,30,28,0.92)'; G.fillRect(X - 16, -hh - 8, 32, 2 * hh + 16);
    G.restore();
    [-1, 1].forEach(function (side) {
      G.save();
      G.translate(X + side * 4 * k, hh); G.rotate(side * 0.06 * k); G.translate(-X, -hh);
      G.beginPath(); G.moveTo(side * far, tear[1]);
      for (var i = 0; i < tear.length; i += 2) G.lineTo(tear[i], tear[i + 1]);
      G.lineTo(side * far, tear[tear.length - 1]); G.closePath(); G.clip();
      drawBody(p);
      G.restore();
    });
  }
  // A point on the wreck, on whichever half it's on once it has broken.
  function onWreck(p, lx, ly) {
    if (!p.broken) return at(p, lx, ly);
    var X = DREAD.CRASH.TEAR, hh = DREAD.HH, side = lx < X ? -1 : 1, a = side * 0.06 * p.broken, dx = lx - X, dy = ly - hh;
    return at(p, X + side * 4 * p.broken + dx * Math.cos(a) - dy * Math.sin(a), hh + dx * Math.sin(a) + dy * Math.cos(a));
  }
  // Going down and on the ground it burns: fires along the hull, and once it's down, columns of smoke from each.
  function drawFires(p) {
    var G = w.G, C = DREAD.CRASH, burn = p.slammed ? clamp(1 - (p.t - C.SLAM) / C.BURN, 0.3, 1) : 0.75;
    G.save();
    FIRES.forEach(function (f, i) {
      var q = onWreck(p, f[0], DREAD.HH * f[1]);
      if (q.x < -40 || q.x > W + 40 || q.y > GROUND - 2) return;
      if (p.slammed) smoke(q.x, q.y, f[2], i);
      flame(q.x, q.y, 22 * f[2] * (0.55 + 0.45 * burn), i * 1.7 + p.id);
    });
    G.restore();
  }
  function smoke(x, y, s, i) {
    var G = w.G, S = w.S;
    for (var k = 0; k < 6; k++) {
      var age = (S.t * 0.3 + k / 6 + i * 0.29) % 1;
      G.globalAlpha = (1 - age) * 0.6; G.beginPath(); w.Ci(x + Math.sin(age * 4 + i) * 6 - age * 28, y - 14 - age * 150 * Math.min(1.2, s), (6 + age * 20) * s, 0.6);
      G.fillStyle = 'rgba(46,46,51,0.22)'; G.fill(); ink(INK, 1.3); G.stroke();
    }
    G.globalAlpha = 1;
  }
  function flame(x, y, h, seed) {
    var G = w.G, t = w.S.t;
    [[-0.5, 0.65], [0.5, 0.7], [0, 1]].forEach(function (f, j) {
      var fx = x + f[0] * h * 0.55, fh = h * f[1] * (1 + 0.22 * Math.sin(t * 16 + seed + j * 2.1)), sway = Math.sin(t * 9 + seed + j) * h * 0.18;
      G.beginPath(); G.moveTo(fx - h * 0.32, y); G.quadraticCurveTo(fx - h * 0.3, y - fh * 0.55, fx + sway, y - fh); G.quadraticCurveTo(fx + h * 0.3, y - fh * 0.55, fx + h * 0.32, y); G.closePath();
      G.fillStyle = 'rgba(255,128,40,0.88)'; G.fill();
    });
    var ih = h * 0.55 * (1 + 0.2 * Math.sin(t * 21 + seed));
    G.beginPath(); G.moveTo(x - h * 0.2, y); G.quadraticCurveTo(x - h * 0.15, y - ih * 0.6, x, y - ih); G.quadraticCurveTo(x + h * 0.15, y - ih * 0.6, x + h * 0.2, y); G.closePath();
    G.fillStyle = 'rgba(255,224,90,0.95)'; G.fill();
  }
  function drawBody(p) {
    var G = w.G, S = w.S, hw = DREAD.HW, hh = DREAD.HH, i, wrecked = p.phase === 'wreck', angry = p.phase === 'bridge' || down(p);
    pen(p.id);
    // Three propellers at the stern, a blur of spinning blades.
    [-0.55, 0, 0.55].forEach(function (k, j) {
      var py = k * hh, px = -hw - 26, span = 13 + (wrecked ? 0 : ((w.boil + j) % 2) * 5);
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
    var pts = HULL;
    G.beginPath(); SP(pts, true, 0.7);
    G.fillStyle = PAPER; G.fill(); G.fillStyle = angry ? 'rgba(200,67,58,0.26)' : 'rgba(46,46,51,0.1)'; G.fill();
    // Scorched as it goes down, charred on the ground.
    if (down(p)) { G.fillStyle = wrecked ? 'rgba(40,34,30,0.36)' : 'rgba(40,34,30,0.16)'; G.fill(); }
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
      G.beginPath(); G.arc(px2, -hh * 0.18, 3.6, 0, Math.PI * 2); G.fillStyle = wrecked ? 'rgba(46,46,51,0.55)' : angry && Math.floor(S.t * 6 + px2) % 2 ? RED : 'rgba(255,214,38,0.85)'; G.fill(); ink(INK, 1.2); G.stroke();
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
      if (p.phase !== 'bridge' && !down(p)) { G.fillStyle = '#8a8f96'; G.fillRect(wx - 1, by - 7, 10, 10); G.beginPath(); SP([wx - 1, by - 7, wx + 9, by - 7, wx + 9, by + 3, wx - 1, by + 3], true, 0.2); ink(INK, 1.2); G.stroke(); }
      else { G.beginPath(); G.rect(wx, by - 6, 7, 7); ink(INK, 1.3); G.stroke(); G.beginPath(); G.arc(wx + 3.5, by - 2.5, 2, 0, Math.PI * 2); G.fillStyle = RED; G.fill(); }
    }
    // The gun turrets: steel casemates under the hull; each barrel turns, glows while aiming, and kicks back on firing.
    p.turrets.forEach(function (t) {
      var gx = t.lx, gy = DREAD.GUN_Y, marking = !!t.mark, a = t.aim, la = Math.atan2(Math.sin(a), Math.cos(a) * p.dir);
      if (t.dead) {
        // Gone: a scorched, torn hole where the turret hung, still smoking.
        G.beginPath(); SP([gx - 13, hh - 4, gx - 6, hh + 3, gx + 2, hh - 1, gx + 9, hh + 4, gx + 14, hh - 4], true, 0.5); G.fillStyle = 'rgba(46,46,51,0.75)'; G.fill(); ink(INK, 1.6); G.stroke();
        G.beginPath(); L(gx - 8, hh + 2, gx - 10, hh + 8, 0.3); L(gx + 6, hh + 3, gx + 9, hh + 9, 0.3); ink(INK, 1.3); G.stroke();
        // Still burning.
        var fl = Math.sin(S.t * 19 + t.id) * 2.5, fl2 = Math.cos(S.t * 23 + t.id) * 2;
        G.beginPath(); G.moveTo(gx - 7, hh - 2); G.quadraticCurveTo(gx - 5, hh - 14 - fl, gx - 1, hh - 5); G.quadraticCurveTo(gx + 3, hh - 17 + fl2, gx + 7, hh - 2); G.closePath(); G.fillStyle = 'rgba(255,130,40,0.85)'; G.fill();
        G.beginPath(); G.moveTo(gx - 3, hh - 2); G.quadraticCurveTo(gx, hh - 9 - fl2, gx + 3, hh - 2); G.closePath(); G.fillStyle = 'rgba(255,220,80,0.9)'; G.fill();
        for (var k = 0; k < 3; k++) {
          var age = (S.t * 0.9 + k / 3 + t.id * 0.17) % 1;
          G.globalAlpha = (1 - age) * 0.5; G.beginPath(); w.Ci(gx + 3 - age * 14, hh - 4 - age * 30, 3 + age * 7, 0.6); ink(INK, 1.3); G.stroke(); G.globalAlpha = 1;
        }
        return;
      }
      G.beginPath(); SP([gx - 16, gy - 11, gx + 16, gy - 11, gx + 13, gy + 7, gx - 13, gy + 7], true, 0.3);
      G.fillStyle = t.flash > 0 ? PAPER : '#8a8f96'; G.fill();
      ink(marking && Math.floor(S.t * 10) % 2 ? RED : INK, 2.2); G.stroke();
      var len = 21 - t.recoil * 7, ex = gx + Math.cos(la) * len, ey = gy + Math.sin(la) * len;
      G.beginPath(); L(gx, gy, ex, ey, 0.2); ink(INK, 6); G.stroke();
      G.beginPath(); L(gx, gy, ex, ey, 0.2); ink(marking ? 'rgba(220,60,40,0.9)' : '#8a8f96', 2.2); G.stroke();
      if (t.recoil > 0.6) { G.beginPath(); G.arc(ex + Math.cos(la) * 6, ey + Math.sin(la) * 6, 6 * t.recoil, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,0.9)'; G.fill(); }
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
  // Its name sits clear of the radio's call chips under the score (game.js CALL_CHIP ends at y 90), the gauges under it.
  var BAR = { NAME: 110, Y: 115 };
  function drawDreadBar() {
    var p = dread(), G = w.G, y = BAR.Y;
    if (!p || down(p)) return;
    var a = p.phase === 'arrive' ? clamp(p.t / 2, 0, 1) : 1;
    G.save(); G.globalAlpha = a; pen(4545);
    G.textAlign = 'center'; G.font = '700 15px ' + w.DISPLAY; G.lineJoin = 'round';
    G.lineWidth = 4; G.strokeStyle = PAPER; G.strokeText('DREADNOUGHT', 200, BAR.NAME); G.fillStyle = RED; G.fillText('DREADNOUGHT', 200, BAR.NAME);
    // Greyed and marked while it can't be hurt; when it can, the gauges light up with a highlighter flash.
    var locked = p.phase === 'arrive', lit = p.unlockT > 0 ? p.unlockT / 1.6 : 0;
    if (locked) { G.font = '13px ' + w.HAND; G.lineWidth = 3; G.strokeText("armored: can't be hurt yet", 200, y + 23); G.fillStyle = INK2; G.fillText("armored: can't be hurt yet", 200, y + 23); }
    if (lit) { G.save(); G.globalAlpha = a * lit; G.fillStyle = 'rgba(255,214,38,0.7)'; G.fillRect(86, y - 4, 228, 16); G.restore(); }
    p.turrets.forEach(function (t, i) {
      var x = 92 + i * 20;
      G.fillStyle = PAPER; G.fillRect(x, y, 16, 8);
      if (!t.dead) { G.fillStyle = locked ? 'rgba(46,46,51,0.18)' : 'rgba(200,67,58,0.6)'; G.fillRect(x + 1, y + 1, 14 * t.hp / t.max, 6); }
      G.beginPath(); SP([x, y, x + 16, y, x + 16, y + 8, x, y + 8], true, 0.2); ink(INK, 1.4); G.stroke();
      if (t.dead) { G.beginPath(); L(x - 1, y + 9, x + 17, y - 1, 0.2); ink(INK, 1.6); G.stroke(); }
    });
    function bar(part, x, wd, live) {
      G.fillStyle = PAPER; G.fillRect(x, y, wd, 8);
      if (!live) { G.fillStyle = 'rgba(46,46,51,0.18)'; G.fillRect(x + 1, y + 1, wd - 2, 6); }
      else { G.fillStyle = part.flash > 0 ? 'rgba(200,67,58,0.85)' : 'rgba(200,67,58,0.55)'; G.fillRect(x + 1, y + 1, (wd - 2) * part.hp / part.max, 6); }
      G.beginPath(); SP([x, y, x + wd, y, x + wd, y + 8, x, y + 8], true, 0.2); ink(INK, 1.4); G.stroke();
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
      if (g.x > 6 && g.x < W - 6) out.push({ kind: 'dreadpart', part: 'gun', x: g.x, y: g.y, vx: vx, marking: !!t.mark, markT: t.mark ? t.mark.t : 0, id: t.id });
    });
    if (p.phase === 'hangar') { var h = hangarAt(p); if (h.x > 6 && h.x < W - 6) out.push({ kind: 'dreadpart', part: 'hangar', x: h.x, y: h.y, vx: 0, marking: false, id: p.hangar.id }); }
    if (p.phase === 'bridge') { var b = bridgeAt(p); if (b.x > 6 && b.x < W - 6) out.push({ kind: 'dreadpart', part: 'bridge', x: b.x, y: b.y, vx: 0, marking: false, id: p.bridge.id }); }
    return out.sort(function (a, b) { return (b.marking ? 1 : 0) - (a.marking ? 1 : 0); });
  }
  // The engine voice and the march read these.
  function dreadPhase() { var p = dread(); return p ? p.phase : null; }

  // ---------- victory and endless ----------
  // Beating the Dreadnought on wave 20 wins the run. When the field is clear the victory card shows the score, the
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
    document.getElementById('winDmg').textContent = String(Math.round(S.stats.wallDamage));
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
    dreadTargets: dreadTargets, dreadPhase: dreadPhase, dreadBeams: dreadBeams, hangarAt: hangarAt, bridgeAt: bridgeAt, muzzleAt: muzzleAt, victoryDue: victoryDue, rollCall: rollCall, showWin: showWin, keepGoing: keepGoing,
    recordLine: recordLine };
};
