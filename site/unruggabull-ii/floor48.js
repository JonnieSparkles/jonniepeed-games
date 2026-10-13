// The 48th Floor: Reclamation (docs/games/unruggabull-ii/floor48-plan.md). p(Loom)'s soul-reclamation factory, top
// down (topdown.js), then the lobby, side on (arena.js), and the long ride.
// Three lines run left to right, each a soul tank, a spinner, a loom (the line's heart), a press and an animator on a
// belt; what comes off the end is a carpshit. Break a line's parts and its loom takes damage; break its loom and the
// line goes down end to end. Production Panic: the lines still running speed up. When the last loom goes, the factory
// comes apart, two souls come to the blaster and their streams start to bend in, and p(Loom) spoils it. Then the lobby.
// Outcomes (production, the carpshits, damage) use the seeded stream; debris, smoke, fire and shake are drawn only.
var UnrugFloor48 = function (core) {
  'use strict';
  const { A, Snd, TUNE, rect, txt, otxt, textWidth, clamp, rr, fxr, emit, free, updateFx, endRun, drawSoulsCounter } = core;
  const S = UnrugSets48, W = 480, H = 270;
  const LINES = [
    { y: 124, kind: 'armored', name: 'HEAVY' },
    { y: 228, kind: 'flyer', name: 'STANDARD' },
    { y: 332, kind: 'roll', name: 'BULK' }
  ];
  const F48 = {
    world: { w: 800, h: 480 }, wallH: 58, bedH: 22, lineX0: 66, lineX1: 612, beltEnd: 606, door: { x: 400 },
    main: { x: 14, y1: 360 },
    // cover: pallets of finished rugs waiting for dispatch, and a parts crate (solid; rolls bounce off them)
    props: [['pallet', 690, 150, 44, 26, 26], ['pallet', 716, 286, 40, 24, 30], ['crate', 520, 396, 30, 22, 22], ['crate', 150, 392, 34, 22, 20]],
    worklights: [[200, 90], [450, 90], [700, 90], [200, 280], [450, 280], [700, 280], [330, 410], [640, 410]],
    // each machine on a line: its kind, left edge, width, depth and height (picture pixels)
    parts: [['tank', 70, 28, 22, 44], ['spinner', 140, 40, 26, 30], ['loom', 238, 82, 34, 54], ['press', 382, 46, 30, 30], ['animator', 488, 40, 26, 34]],
    hp: { tank: 14, spinner: 20, loom: 140, press: 22, animator: 22 },
    souls: { tank: 5, spinner: 3, loom: 10, press: 3, animator: 3, line: 8 },
    toLoom: 10, coffee: .3,                       // a part breaking hurts its loom this much (the line's chain)
    blast: { tank: [86, 14], spinner: [72, 14], press: [72, 14], animator: [72, 14], loom: [128, 22] },   // radius, damage to machines
    chainDelay: .12, cascade: .16,
    // production: seconds between rugs off each line (by its index), the belt's speed, the press's beat, by panic level
    make: [5.4, 4.6, 6], rate: [1, 1.4, 1.9], pace: [1, 1.15, 1.3], belt: [58, 72, 90], press: [2.4, 1.9, 1.5],
    pressWarn: .55, pressSlam: .14, beltPush: .55, most: 12, firstAt: 4, prefill: [.55],
    collapse: { souls: 2, firstSoul: 1.8, soulEvery: 1.1, bendAt: 4.3, bendT: 2, spoilAt: 6.3, freeAt: 7.6, whiteAt: 10.6, lobbyAt: 11.2 },
    lobby: { walkIn: 1.1, dialFrom: 61, dingAt: 5.4, doorsT: 1.2, doorU: .6, doorway: .1, walkOut: 1, portraitU: -.12 },
    deadWait: 2.8
  };
  const td = UnrugTopdown(core, { world: F48.world, bounds: { x0: 30, y0: F48.wallH + 4, x1: 786, y1: 440 } });
  const arena = UnrugArena(core, { limit: .92 });
  let R, bull, Q, g = core.g, ROOM = null;
  const LAYOUT = { wallH: F48.wallH, bedH: F48.bedH, lineX0: F48.lineX0, lineX1: F48.lineX1, door: F48.door, main: F48.main,
    lines: LINES.map(l => ({ y: l.y, tankX0: F48.parts[0][1] })),
    monitors: [130, 300, 470, 640].map(x => ({ x, y: 12, w: 34, h: 24 })) };

  // ---------- the run ----------
  function buildMachines() {
    const list = []; let id = 1;
    LINES.forEach((ln, li) => {
      for (const [kind, x, w, d, h] of F48.parts) {
        const m = { id: id++, line: li, kind, x0: x, x1: x + w, y0: ln.y - d / 2, y1: ln.y + d / 2, H: h, hp: F48.hp[kind], max: F48.hp[kind], flash: 0, dead: false, slam: 0, warn: 0, zap: 0 };
        if (kind === 'press' || kind === 'animator') { const pw = kind === 'press' ? 8 : 10; m.solid = [{ x0: m.x0, x1: m.x0 + pw, y0: m.y0, y1: m.y1 }, { x0: m.x1 - pw, x1: m.x1, y0: m.y0, y1: m.y1 }]; }
        else m.solid = [{ x0: m.x0, x1: m.x1, y0: m.y0, y1: m.y1 }];
        list.push(m);
      }
    });
    return list;
  }
  function newRun(r, b, at) {
    R = r; bull = b; R.phase = 'boss'; R.speed = 0;
    if (at) { R.souls = R.shown = at.souls || 0; R.continues = (at.continues || 0) + (at.transfer ? 0 : 1); }
    td.newRun(R, bull, { x: F48.door.x, y: 432 });
    const down = at && !at.transfer && at.down ? at.down.slice() : [false, false, false];
    Q = R.f48 = { st: 'fight', t: 0, down, panic: down.filter(Boolean).length, machines: buildMachines(), items: [[], [], []], next: [0, 0, 0], beltOff: [0, 0, 0],
      pressT: [0, 0, 0], chain: [], fx: [], smokeT: 0, shake: 0, flashT: 0, eye: 0, threads: 0, bend: 0, souls: [], collapse: null, lobby: null,
      started: false, events: {}, music: 'b', lineT: [0, 0, 0], hitSnd: 0, white: 0, debrisT: 0 };
    const m48 = /(^|&)music48=([abc])/.exec(location.hash.replace(/^#/, '')); if (m48) Q.music = m48[2];
    // lines already down (a continue) stay wrecked
    Q.machines.forEach(m => { if (down[m.line]) { m.dead = true; m.hp = 0; } });
    // the factory is already running: rugs on every live belt
    LINES.forEach((ln, i) => {
      if (down[i]) return;
      Q.next[i] = F48.firstAt + rr(0, 1.2) + i * .4;
      // staggered, so the first carpshits leave the lines one at a time
      for (const f of F48.prefill) Q.items[i].push({ x: F48.lineX0 + 80 + (f - i * .22) * (F48.beltEnd - F48.lineX0 - 100) + rr(-12, 12), kind: 'thread' });
      for (const it of Q.items[i]) it.kind = it.x > loomOf(i).x1 ? 'rug' : 'thread';
    });
    td.room({ solids, push, machineHit, slashMachines, targets });
    R.td.locked = false;
    const lobbyStart = at && at.lobby || /(^|&)at=lobby(&|$)/.test(location.hash.replace(/^#/, '')) && !at;
    core.setCheckpoint({ stage: 'floor48', souls: R.souls, continues: R.continues, down: down.slice(), seedState: core.seedState(), runSeed: core.runSeed() });
    if (lobbyStart) startLobby(true);
    emit('f48_state', { state: lobbyStart ? 'lobby' : 'fight', down: down.filter(Boolean).length });
  }
  const loomOf = i => Q.machines.find(m => m.line === i && m.kind === 'loom');
  const live = i => !Q.down[i];
  // the floor's opening: its name, the goal, and p(Loom) on the PA; the factory's intro music until production starts
  function opening() {
    if (Q.st === 'lobby') return;
    R.banner = { text: 'THE 48TH FLOOR', sub: 'RECLAMATION', t: 0, dur: 1.7, top: true, then: { text: 'SHUT DOWN', sub: (3 - Q.panic) + (3 - Q.panic === 1 ? ' LINE' : ' LINES'), t: 0, dur: 1.5, top: true } };
    Snd.factoryCue('intro', { candidate: Q.music });
    core.live('The 48th Floor. Shut down the three production lines.');
  }
  function resume() {
    opening();
    if (Q.panic) Q.events.panicSign = true;
  }

  // ---------- the room's hooks for the engine ----------
  const PROPS = F48.props.map(([kind, x, y, w, d, h], i) => ({ kind, id: 90 + i, x0: x, x1: x + w, y0: y, y1: y + d, H: h }));
  function solids() {
    const out = PROPS.slice();
    for (const m of Q.machines) for (const s of m.solid) out.push(s);
    return out;
  }
  // a belt carries what stands on it, along the line, while the line runs
  function push(x, y) {
    for (let i = 0; i < 3; i++) {
      if (!live(i) || x < F48.lineX0 || x > F48.beltEnd) continue;
      if (Math.abs(y - LINES[i].y) < F48.bedH / 2 + 2) return { x: F48.belt[Q.panic] * F48.beltPush, y: 0 };
    }
    return null;
  }
  // A bolt (or a returned bobbin) at (x, y) on the floor: does it hit a machine where it's drawn?
  function machineHit(x, y, dmg, by) {
    for (const m of Q.machines) {
      if (m.dead) continue;
      if (x >= m.x0 - 1 && x <= m.x1 + 1 && y >= m.y0 - 8 && y <= m.y1 + 16) { hurt(m, dmg, by); return true; }
    }
    return false;
  }
  function slashMachines(cx, cy, r, dmg, swing) {
    let n = 0;
    for (const m of Q.machines) {
      if (m.dead || m.swing === swing) continue;
      const nx = clamp(cx, m.x0, m.x1), ny = clamp(cy, m.y0 - 10, m.y1 + 6);
      if ((nx - cx) ** 2 + (ny - cy) ** 2 < r * r) { m.swing = swing; hurt(m, dmg, 'slash'); n++; td.sparks(nx, ny, 14, '#fff6e2', 8); }
    }
    return n;
  }
  // what the blaster leans toward: looms and parts still standing
  function targets() { return Q.st === 'fight' ? Q.machines.filter(m => !m.dead).map(m => ({ x: (m.x0 + m.x1) / 2, y: m.y1 - 2 })) : []; }

  // ---------- machines: damage, breaking, chains ----------
  function hurt(m, dmg, by) {
    if (m.dead || Q.st !== 'fight') return;
    m.hp -= dmg; m.flash = .07; m.lastBy = by;
    if (Q.hitSnd <= 0) { Snd.play('machineHit'); Q.hitSnd = .05; }
    R.events.machineDamage = (R.events.machineDamage || 0) + Math.min(dmg, m.hp + dmg);
    emit('f48_hit', { kind: m.kind, by, amount: dmg });
    if (m.hp <= 0) breakMachine(m, by);
  }
  function soulsFrom(x, y, n, source, by) {
    for (let i = 0; i < n; i++) { const s = td.screenOf(x + fxr(-10, 10), y + fxr(-14, 4)); free(s.x / 2, s.y / 2, source, by); }
  }
  function breakMachine(m, by) {
    if (m.dead) return;
    m.dead = true; m.hp = 0;
    const cx = (m.x0 + m.x1) / 2, cy = (m.y0 + m.y1) / 2, [rad, dmg] = F48.blast[m.kind];
    boom(cx, cy, m.kind === 'loom' ? 1.6 : m.kind === 'tank' ? 1.2 : 1);
    Snd.play(m.kind === 'tank' ? 'tankBurst' : 'machineBreak');
    if (Q.st === 'fight') R.freeze = Math.max(R.freeze, m.kind === 'loom' ? .12 : .05);
    Q.shake = Math.max(Q.shake, m.kind === 'loom' ? 1 : .5);
    soulsFrom(cx, m.y0, F48.souls[m.kind], m.kind, by === 'chain' ? 'chain' : by);
    R.events.broken = (R.events.broken || 0) + 1;
    emit('f48_break', { kind: m.kind, line: m.line, by });
    td.blast(cx, cy, rad, 'blast');
    // the blast reaches the machines around it, a moment later
    Q.chain.push({ t: F48.chainDelay, x: cx, y: cy, r: rad, dmg, from: m });
    // hurt, a broken machine sometimes leaves a coffee in the wreckage (a loom always does)
    if (R.hearts < TUNE.hearts && Q.st === 'fight' && (m.kind === 'loom' || rr(0, 1) < F48.coffee)) td.addPickup('coffee', clamp(cx, 40, 780), clamp(m.y1 + 16, 70, 432));
    if (m.kind === 'loom') lineDown(m.line);
    else { const lm = loomOf(m.line); if (lm && !lm.dead) Q.chain.push({ t: F48.chainDelay * 2, loom: lm, dmg: F48.toLoom }); }
  }
  function stepChain(dt) {
    for (const c of Q.chain) {
      c.t -= dt; if (c.t > 0 || c.done) continue;
      c.done = true;
      if (c.loom) { if (!c.loom.dead && Q.st === 'fight') { hurtChain(c.loom, c.dmg); td.sparks((c.loom.x0 + c.loom.x1) / 2, c.loom.y1, 20, '#ff7a2a', 8); } continue; }
      if (c.cascade) { if (!c.m.dead) breakMachine(c.m, 'chain'); continue; }
      for (const m of Q.machines) {
        if (m.dead || m === c.from) continue;
        const nx = clamp(c.x, m.x0, m.x1), ny = clamp(c.y, m.y0, m.y1);
        if ((nx - c.x) ** 2 + (ny - c.y) ** 2 < c.r * c.r) hurtChain(m, c.dmg);
      }
    }
    Q.chain = Q.chain.filter(c => !c.done);
  }
  function hurtChain(m, dmg) { if (Q.st !== 'fight') return; m.hp -= dmg; m.flash = .1; R.events.chainDamage = (R.events.chainDamage || 0) + dmg; if (m.hp <= 0) breakMachine(m, 'chain'); }
  // A line goes down: what's left of it blows end to end from the loom outward, its belt stops, its rugs burn, its souls
  // burst free, and the lines still running take its souls and speed up.
  function lineDown(i) {
    if (Q.down[i]) return;
    Q.down[i] = true; Q.panic = Q.down.filter(Boolean).length;
    R.events.linesDown = Q.panic;
    const parts = Q.machines.filter(m => m.line === i && !m.dead).sort((a, b) => Math.abs(a.x0 - 280) - Math.abs(b.x0 - 280));
    parts.forEach((m, k) => Q.chain.push({ t: F48.cascade * (k + 1), cascade: true, m }));
    for (const it of Q.items[i]) { Q.fx.push({ k: 'burn', x: it.x, y: LINES[i].y, t: 0, dur: 1.2 }); }
    Q.items[i] = [];
    soulsFrom(330, LINES[i].y, F48.souls.line, 'line', 'line');
    R.white = Math.max(R.white || 0, .08);
    emit('f48_line', { line: i, down: Q.panic, t: R.t });
    core.live((3 - Q.panic) ? 'A line is down. ' + (3 - Q.panic) + ' to go. The others speed up.' : 'The last line is down.');
    if (Q.panic < 3) {
      Snd.factoryCue(Q.panic === 1 ? 'panic' : 'heavy', { candidate: Q.music });
      Snd.play('lineDown'); Snd.play('klaxon', Q.panic);
      R.banner = { text: Q.panic === 1 ? 'PRODUCTION PANIC' : 'LAST LINE', sub: Q.panic === 1 ? 'THE OTHER LINES SPEED UP' : 'FLAT OUT', t: 0, dur: 2, top: true, col: Q.panic > 1 ? '#ff5a4a' : '#ffd44a' };
      core.bark(Q.panic === 1 ? 'f48line' : 'f48panic');
      core.setCheckpoint({ stage: 'floor48', souls: R.souls, continues: R.continues, down: Q.down.slice(), seedState: core.seedState(), runSeed: core.runSeed() });
    } else startCollapse();
  }

  // ---------- production ----------
  function stepLines(dt) {
    const p = Q.panic, speed = F48.belt[p];
    for (let i = 0; i < 3; i++) {
      if (!live(i)) continue;
      Q.beltOff[i] += speed * dt;
      // a new spool of thread leaves the spinner
      if (Q.t >= F48.firstAt || Q.items[i].length < 2) {
        Q.next[i] -= dt * F48.rate[p];
        if (Q.next[i] <= 0) { Q.items[i].push({ x: F48.parts[1][1] + F48.parts[1][2], kind: 'thread' }); Q.next[i] = F48.make[i] * rr(.85, 1.15); }
      }
      const lm = loomOf(i), pr = Q.machines.find(m => m.line === i && m.kind === 'press'), an = Q.machines.find(m => m.line === i && m.kind === 'animator');
      const full = R.td.enemies.length >= F48.most;
      Q.items[i].sort((a, b) => b.x - a.x);
      let ahead = Infinity;
      for (const it of Q.items[i]) {
        // rugs queue at the end of the belt while the floor is full
        const stop = Math.min(F48.beltEnd, ahead - 20);
        it.x = Math.min(stop, it.x + speed * dt);
        ahead = it.x;
        if (it.kind === 'thread' && it.x > (lm.x0 + lm.x1) / 2) it.kind = 'rug';
        if (it.kind === 'rug' && it.x > (pr.x0 + pr.x1) / 2) it.kind = 'rug2';
        if (!it.zapped && it.x > (an.x0 + an.x1) / 2) { it.zapped = true; an.zap = .25; if (!an.dead) Snd.play('animate'); }
        if (it.x >= F48.beltEnd && !full && Q.t >= F48.firstAt) { it.gone = true; launch(i); }
      }
      Q.items[i] = Q.items[i].filter(it => !it.gone);
      // the press: its shadow grows, it slams, it rises
      if (!pr.dead) {
        Q.pressT[i] += dt;
        const beat = F48.press[p], ph = Q.pressT[i] % beat, warnFrom = beat - F48.pressWarn - F48.pressSlam;
        pr.warn = ph >= warnFrom && ph < beat - F48.pressSlam ? (ph - warnFrom) / F48.pressWarn : 0;
        const wasDown = pr.slam > .9;
        pr.slam = ph >= beat - F48.pressSlam ? (ph - (beat - F48.pressSlam)) / F48.pressSlam : Math.max(0, 1 - ph / .4);
        if (pr.slam > .9 && !wasDown && ph >= beat - F48.pressSlam) pressHit(pr, i);
      } else { pr.warn = 0; pr.slam = 0; }
    }
    for (const m of Q.machines) { m.flash = Math.max(0, m.flash - dt); m.zap = Math.max(0, m.zap - dt); }
  }
  // the press comes down: anything under it on the belt is flattened, him included
  function pressHit(pr, i) {
    Snd.play('press'); Q.shake = Math.max(Q.shake, .15);
    const x0 = pr.x0 + 7, x1 = pr.x1 - 7, y0 = LINES[i].y - F48.bedH / 2 - 3, y1 = LINES[i].y + F48.bedH / 2 + 3;
    if (bull.x > x0 && bull.x < x1 && bull.y > y0 && bull.y < y1 + 4 && core.hurtBull(1, 'press')) { bull.ky = (bull.y < LINES[i].y ? -1 : 1) * 160; }
    for (const e of R.td.enemies) if (!e.dead && e.x > x0 && e.x < x1 && e.y > y0 - 6 && e.y < y1 + 6) td.kill(e, 'press');
    for (let k = 0; k < 6; k++) td.sparks(fxr(x0, x1), y1, 2, '#ffd060', 1);
    emit('f48_press', { line: i });
  }
  // a carpshit leaves the end of the line: flyers and armored up and out into the room, rolls pointed at him
  function launch(i) {
    // the heavy line's output is two parts armored to one plain
    const kind = LINES[i].kind === 'armored' && (Q.made = (Q.made || 0) + 1) % 3 === 0 ? 'flyer' : LINES[i].kind, y = LINES[i].y, x = F48.beltEnd + 8;
    const e = td.spawn(kind, { x, y, vx: 70, vy: rr(-30, 30), pace: F48.pace[Q.panic], line: i });
    if (kind === 'roll') { e.vx = 30; e.spawning = .2; }
    Snd.play('animate');
    R.events.made = (R.events.made || 0) + 1;
  }

  // ---------- effects (cosmetic) ----------
  function boom(x, y, k) {
    Q.fx.push({ k: 'boom', x, y, s: k, t: 0, dur: .55 });
    for (let i = 0; i < 14 * k; i++) {
      const a = Math.random() * 6.28, s = 40 + Math.random() * 130 * k;
      R.td.fx.push({ k: 'debris', x, y, h: 10 + Math.random() * 20, vx: Math.cos(a) * s, vy: Math.sin(a) * s * .6, vh: 60 + Math.random() * 160, s: 2 + Math.round(Math.random() * 3), r: 0, vr: (Math.random() - .5) * 20, col: ['#4a4656', '#a8261e', '#c9962e', '#2a2630'][i % 4], t: 0, dur: 1 + Math.random() * .6 });
      R.td.fx.push({ k: 'fire', x: x + (Math.random() - .5) * 20 * k, y, h: 6 + Math.random() * 24, vx: Math.cos(a) * s * .3, vy: Math.sin(a) * s * .2, vh: 30 + Math.random() * 40, s: 3 + Math.random() * 5 * k, t: 0, dur: .4 + Math.random() * .4 });
    }
  }
  function stepFx(dt) {
    for (const f of Q.fx) f.t += dt;
    Q.fx = Q.fx.filter(f => f.t < f.dur);
    // smoke rises from every wreck; embers from the hurt
    Q.smokeT -= dt;
    if (Q.smokeT <= 0) {
      Q.smokeT = .12;
      for (const m of Q.machines) if ((m.dead || m.hp / m.max < .34) && Math.random() < (m.dead ? .5 : .25)) R.td.fx.push({ k: 'smoke', x: fxr(m.x0 + 4, m.x1 - 4), y: m.y1 - 2, h: m.dead ? 12 : m.H, vx: fxr(-4, 4), vy: 0, s: 8 + Math.random() * 6, t: 0, dur: 1.4 + Math.random() });
    }
    Q.shake = Math.max(0, Q.shake - dt * 2.5); Q.hitSnd -= dt;
  }

  // ---------- the collapse and the near miss ----------
  // The factory comes apart; two of the freed souls come to the blaster (a bell each: D5, F5, the roof completes the chord
  // with A5); their two streams start to bend in toward the bolt;
  // p(Loom) comes up on every monitor, its threads whip down and snag them, the streams scatter, the music cuts on a
  // sour chord; the souls tear free, salute and go up with the rest. White, and the lobby.
  function startCollapse() {
    Q.st = 'collapse'; Q.collapse = { t: 0, n: 0, said: false };
    R.phase = 'boss';
    td.clearThreats('collapse');
    Q.chain = Q.chain.filter(c => c.cascade);
    Snd.play('lineDown'); Snd.play('rumble', 5);
    R.banner = { text: 'LINES DOWN', sub: 'RECLAMATION OFFLINE', t: 0, dur: 2.2, top: true, col: '#ff5a4a' };
    core.live('The factory is coming apart.');
    // the soul main bursts: the souls inside go up through the roof (counted once, here)
    soulsFrom(30, 220, 12, 'main', 'collapse');
    for (let i = 0; i < 40; i++) R.fx.push({ k: 'rise', x: fxr(8, 40), y: fxr(40, 130), vy: -fxr(30, 60), ph: Math.random() * 6, t: -i * .05, dur: 4 });
    emit('f48_collapse', { t: R.t });
  }
  function stepCollapse(dt) {
    const C = Q.collapse, F = F48.collapse; C.t += dt;
    const t = C.t;
    Q.shake = Math.max(Q.shake, t < 3 ? .35 : t < F.spoilAt ? .15 : .1);
    // debris falling from the ceiling (drawn only)
    Q.debrisT -= dt;
    if (Q.debrisT <= 0 && t < F.whiteAt) { Q.debrisT = .08; R.td.fx.push({ k: 'debris', x: R.td.cam.x + Math.random() * W, y: R.td.cam.y + 60 + Math.random() * (H - 70), h: 160 + Math.random() * 60, vx: 0, vy: 0, vh: -40, s: 2 + Math.round(Math.random() * 4), r: 0, vr: (Math.random() - .5) * 12, col: Math.random() < .5 ? '#3a3640' : '#5a5266', t: 0, dur: 2.2 }); }
    // the two souls come to the gun, one at a time
    if (C.n < F.souls && t >= F.firstSoul + C.n * F.soulEvery) {
      const s = td.screenOf(30, 200);
      Q.souls.push({ i: C.n, x0: s.x, y0: s.y, t: 0, dur: .6 });
      C.n++;
    }
    for (const s of Q.souls) if (!s.landed) { s.t += dt; if (s.t >= s.dur) { s.landed = true; R.td.streams = s.i + 1; R.gold = true; Snd.play('bell', s.i); Snd.duck(1.2); R.shake = Math.max(R.shake, .05); emit('f48_soul', { n: s.i + 1 }); } }
    // the streams bend in toward each other
    if (t >= F.bendAt && t < F.spoilAt) { R.td.bend = Math.min(.85, (t - F.bendAt) / F.bendT * .85); if (!C.fuse) { C.fuse = true; Snd.factoryCue('fuse', { seconds: F.spoilAt - F.bendAt }); emit('f48_bend'); } }
    // p(Loom)
    if (t >= F.spoilAt - .6) Q.eye = Math.min(1, Q.eye + dt * 3);
    if (t >= F.spoilAt && !C.spoiled) {
      C.spoiled = true; Snd.factoryCue('spoil'); R.td.scatter = 1; R.td.bend = 0; Q.threads = .01; Q.shake = Math.max(Q.shake, .6); R.white = .06;
      say('NOT ON MY FLOOR.', 2.4);
      emit('f48_spoil', { t: R.t });
    }
    if (Q.threads > 0) Q.threads = Math.min(1, Q.threads + dt * 4);
    if (t >= F.spoilAt + .5 && R.td.streams) { R.td.streams = 0; R.td.scatter = 0; R.gold = false; }
    // the souls tear free, salute, and go
    if (t >= F.freeAt && !C.freed) {
      C.freed = true; Q.threads = 0;
      const mz = td.muzzle(); C.salute = [0, 1].map(i => ({ x: mz.x + (i - .5) * 22, y: mz.y - 30, flip: i % 2 }));
      Snd.play('bell', 0);
    }
    if (C.freed) for (const s of C.salute) s.y -= (t > F.freeAt + 1.6 ? 40 : 4) * dt;
    if (t >= F.whiteAt) Q.white = Math.min(1, (t - F.whiteAt) / (F.lobbyAt - F.whiteAt));
    if (t >= F.lobbyAt) startLobby(false);
  }
  // p(Loom)'s readout along the bottom, in its machine blips
  function say(text, dur) { core.talk(text, 'loom'); Object.assign(R.talk, { readout: true, speaker: 'ploom', total: dur }); }

  // ---------- the lobby ----------
  // Side on: the arena's bull in an immaculate elevator lobby, the Rugfather's portrait on the wall. He walks in singed,
  // passes the portrait, the car arrives (DING), the doors open on the operator, Please Hold, and he walks in.
  function startLobby(direct) {
    Q.st = 'lobby'; R.phase = 'lobby'; R.td.locked = true; Q.white = direct ? 0 : 1;
    arena.newRun(R, bull); bull.u = -1.05; bull.facing = 1; bull.jh = 0; bull.slash = -1; R.shots = [];
    Q.lobby = { t: 0, said: false, ding: false, out: 0, smoke: 0 };
    R.banner = null; R.talk = null; R.gold = false; R.td.streams = 0;
    Snd.music(null, { hard: true });
    core.setCheckpoint({ stage: 'floor48', souls: R.souls, continues: R.continues, down: [true, true, true], lobby: true, seedState: core.seedState(), runSeed: core.runSeed() });
    emit('f48_lobby', { t: R.t });
  }
  const dialAt = t => Math.round(F48.lobby.dialFrom - (F48.lobby.dialFrom - 48) * clamp(t / F48.lobby.dingAt, 0, 1));
  function stepLobby(dt) {
    const L = Q.lobby, F = F48.lobby; L.t += dt;
    Q.white = Math.max(0, Q.white - dt * 1.6);
    if (L.t < F.walkIn) { R.arena.locked = true; bull.u = -1.05 + (L.t / F.walkIn) * .35; bull.step += dt * 8; bull.facing = 1; }
    else R.arena.locked = L.out > 0;
    if (!L.said && bull.u > F.portraitU - .05) { L.said = true; core.bark('portrait'); }
    if (!L.ding && L.t >= F.dingAt) { L.ding = true; Snd.play('rideDing'); emit('f48_ding'); }
    if (L.ding && !L.doorSnd && L.t >= F.dingAt + .4) { L.doorSnd = true; Snd.play('rideDoors'); }
    if (L.ding && !L.muzak && L.t >= F.dingAt + .9) { L.muzak = true; Snd.music('pleaseHold', { slam: true }); }
    if (L.ding && !L.going && L.t >= F.dingAt + 1.6) { L.going = true; say0('operator', 'GOING UP?', 1.8); }
    // a little smoke still coming off him
    L.smoke -= dt; if (L.smoke <= 0) { L.smoke = .35; R.fx.push({ k: 'smoke', x: arena.X(bull.u) + fxr(-3, 3), y: arena.Y(bull.jh + .2), t: 0, dur: 1.2 }); }
    const open = doorsOpen();
    if (open >= 1 && L.out <= 0 && Math.abs(bull.u - F.doorU) < F.doorway && bull.jh <= 0) { L.out = .0001; emit('f48_board'); }
    if (L.out > 0) {
      L.out = Math.min(1, L.out + dt / F.walkOut); R.arena.out = L.out; bull.u += (F.doorU - bull.u) * (1 - Math.pow(.002, dt)); bull.step += dt * 8;
      if (L.out >= 1) {
        R.phase = 'win'; R.endT = R.t; emit('f48_clear', { amount: R.t });
        core.travel('elevator', { fight: true, from: 48, destination: { floor: 99, label: 'R', stage: 'roof' } });
        return;
      }
    }
    arena.update(dt, false);
    updateFx(dt);
  }
  function say0(who, text, dur) { core.talk(text, who); Object.assign(R.talk, { readout: true, speaker: who, total: dur }); }
  const doorsOpen = () => Q.lobby && Q.lobby.ding ? clamp((Q.lobby.t - F48.lobby.dingAt - .4) / F48.lobby.doorsT, 0, 1) : 0;

  // ---------- the tick ----------
  function update(dt) {
    if (R.phase === 'win') return;
    if (R.phase === 'dead') { td.stepFx(dt); stepFx(dt); updateFx(dt); if (R.phaseT > F48.deadWait) endRun('rugged'); return; }
    if (Q.st === 'lobby') { stepLobby(dt); return; }
    Q.t += dt;
    if (!Q.started && Q.t >= F48.firstAt) { Q.started = true; Snd.factoryCue('fight', { candidate: Q.music }); if (Q.panic === 1) Snd.factoryCue('panic', { candidate: Q.music }); else if (Q.panic === 2) Snd.factoryCue('heavy', { candidate: Q.music }); emit('f48_fight'); }
    if (Q.t > 4.4 && !Q.events.said) { Q.events.said = true; core.bark('f48start'); }
    if (Q.t > 1 && !Q.events.pa && Q.panic === 0) { Q.events.pa = true; say('RECLAMATION IS AHEAD OF SCHEDULE.', 2.6); }
    if (Q.st === 'fight') { stepLines(dt); stepChain(dt); }
    else if (Q.st === 'collapse') { stepChain(dt); stepCollapse(dt); if (Q.st === 'lobby') return; }
    td.update(dt);
    stepFx(dt);
    updateFx(dt);
  }

  // ---------- drawing ----------
  const half = fn => () => { g.save(); g.scale(.5, .5); fn(); g.restore(); };
  function cam() { const c = R.td.cam, s = Q.shake * 4; return { x: Math.round(c.x + (s ? (Math.random() - .5) * s : 0)), y: Math.round(c.y + (s ? (Math.random() - .5) * s : 0)) }; }
  let CAM = { x: 0, y: 0 };
  const drawFactory = () => {
    if (!ROOM) ROOM = S.paintRoom(F48.world.w, F48.world.h, LAYOUT);
    CAM = cam();
    g.drawImage(ROOM, CAM.x, CAM.y, W, H, 0, 0, W, H);
    g.save(); g.translate(-CAM.x, -CAM.y);
    const t = R.t;
    S.soulMain(g, LAYOUT, t, Q.panic, null, Q.st !== 'fight', Q.down);
    for (let i = 0; i < 3; i++) {
      S.belt(g, F48.lineX0, F48.beltEnd + 6, LINES[i].y, F48.bedH, Q.beltOff[i], !live(i));
      for (const it of Q.items[i]) S.item(g, it, LINES[i].y, null);
      const pr = Q.machines.find(m => m.line === i && m.kind === 'press'); S.pressShadow(g, pr, LINES[i].y, F48.bedH);
      // the dispatch chute at the end of each line
      rect(g, F48.beltEnd + 4, LINES[i].y - 13, 14, 26, '#0c0a10'); rect(g, F48.beltEnd + 5, LINES[i].y - 12, 12, 24, '#1a1820');
      for (let k = 0; k < 4; k++) rect(g, F48.beltEnd + 6, LINES[i].y - 10 + k * 6, 10, 2, '#2a2830');
    }
    // the machines, him, the carpshits and the beacons, by where they touch the floor
    const list = [];
    for (const m of Q.machines) list.push({ y: m.y1, draw: () => drawMachine(m, t) });
    for (const pr of PROPS) list.push({ y: pr.y1, draw: () => drawProp(pr) });
    for (let i = 0; i < 3; i++) list.push({ y: LINES[i].y + 20, draw: () => S.beacon(g, F48.beltEnd + 26, LINES[i].y + 20, t, Q.panic, null) });
    for (const d of td.drawables()) list.push(d);
    list.sort((a, b) => a.y - b.y);
    for (const d of list) { if (d.draw) d.draw(); else { const save = R.td.fx; R.td.fx = [d.fx]; td.drawFx('lit'); R.td.fx = save; } }
    // smoke and puffs over everything on the floor
    const save = R.td.fx; R.td.fx = save.filter(f => f.k === 'smoke' || f.k === 'puff'); td.drawFx('lit'); R.td.fx = save;
    g.restore();
    // the panic's light: amber, then red, pulsing
    if (Q.panic && Q.st === 'fight') { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = Q.panic > 1 ? .14 + (Math.floor(t * 3) % 2 ? .08 : 0) : .08; rect(g, 0, 0, W, H, Q.panic > 1 ? '#ff3a2a' : '#ffb040'); g.restore(); }
    if (Q.st === 'collapse') { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .2 + (Math.floor(t * 4) % 2 ? .06 : 0); rect(g, 0, 0, W, H, '#ff3a2a'); g.restore(); }
  };
  // a pallet stacked with rolled rugs, or a parts crate
  function drawProp(p) {
    if (p.kind === 'crate') { S.box(g, p, '#5a4632', '#463626', '#7a6244', '#2a2016'); rect(g, p.x0 + 2, p.y1 - p.H + 3, p.x1 - p.x0 - 4, 1, '#2a2016'); core.line(g, p.x0 + 2, p.y1 - p.H + 4, p.x1 - 3, p.y1 - 2, '#2a2016'); txt(g, 'RUGCO', p.x0 + 3, p.y0 - p.H + 4, '#2a2016', 1); return; }
    rect(g, p.x0 - 1, p.y1 - 6, p.x1 - p.x0 + 2, 7, '#0c0a10'); rect(g, p.x0, p.y1 - 5, p.x1 - p.x0, 5, '#6a5a3a'); for (let x = p.x0 + 2; x < p.x1; x += 8) rect(g, x, p.y1 - 4, 4, 3, '#2a2016');
    const rows = 3, rh = (p.H - 6) / rows;
    for (let r = 0; r < rows; r++) for (let k = 0; k < Math.floor((p.x1 - p.x0) / 10); k++) {
      const x = p.x0 + 1 + k * 10 + (r % 2) * 3, y = p.y1 - 6 - (r + 1) * rh;
      if (x + 9 > p.x1) continue;
      rect(g, x, y, 9, rh, '#1a0a0a'); rect(g, x + 1, y + 1, 7, rh - 2, '#a8261e'); rect(g, x + 1, y + 1, 7, 1, '#d63428'); rect(g, x + 3, y + 2, 3, 2, '#5e1614');
    }
  }
  function drawMachine(m, t) {
    const speed = live(m.line) ? F48.rate[Q.panic] : 0;
    g.save();
    if (m.flash > 0) g.filter = 'brightness(2.2)';
    if (m.kind === 'tank') S.tank(g, m, t, null);
    else if (m.kind === 'spinner') S.spinner(g, m, t, null, speed);
    else if (m.kind === 'loom') S.loom(g, m, t, null, speed);
    else if (m.kind === 'press') S.press(g, m, t, null, LINES[m.line].y, F48.bedH);
    else S.animator(g, m, t, null, 0);
    g.restore();
  }
  function glowFactory() {
    const t = R.t; g.save(); g.translate(-CAM.x, -CAM.y);
    S.soulMain(g, LAYOUT, t, Q.panic, g, Q.st !== 'fight', Q.down);
    for (let i = 0; i < 3; i++) for (const it of Q.items[i]) if (it.kind === 'thread') S.item({ fillStyle: '', fillRect() {} , save() {}, restore() {}, beginPath() {}, ellipse() {}, fill() {} }, it, LINES[i].y, g);
    for (const m of Q.machines) {
      if (m.dead) continue;
      if (m.kind === 'tank') S.tank({ fillStyle: '', fillRect() {}, beginPath() {}, ellipse() {}, fill() {} }, m, t, g);
      else if (m.kind === 'loom') { const nul = nullCtx(); S.loom(nul, m, t, g, live(m.line) ? F48.rate[Q.panic] : 0); }
      else if (m.kind === 'spinner') { const nul = nullCtx(); S.spinner(nul, m, t, g, 1); }
      else if (m.kind === 'animator') S.animator(nullCtx(), m, t, g, m.zap);
    }
    for (let i = 0; i < 3; i++) S.beacon(nullCtx(), F48.beltEnd + 26, LINES[i].y + 20, t, Q.panic, g);
    for (const f of Q.fx) {
      const k = f.t / f.dur;
      if (f.k === 'boom') {
        const r = (12 + k * 46) * f.s;
        g.save(); g.globalAlpha = 1 - k; g.strokeStyle = '#ffd060'; g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.ellipse(f.x, f.y - 10, r, r * .6, 0, 0, 6.29); g.stroke(); g.restore();
        if (k < .35) { const fr = (10 + k * 40) * f.s; td.glow(f.x, f.y - 14, fr * 1.6, '#ffb040', .9 * (1 - k * 2)); g.fillStyle = k < .15 ? '#ffffff' : '#ffd060'; g.beginPath(); g.ellipse(f.x, f.y - 14, fr * .5, fr * .4, 0, 0, 6.29); g.fill(); }
      } else if (f.k === 'burn') { for (let n = 0; n < 3; n++) { const x = f.x + (n - 1) * 5, h = 4 + Math.random() * 6 * (1 - k); g.fillStyle = n === 1 ? '#ffd060' : '#ff7a2a'; g.fillRect(Math.round(x), Math.round(f.y - h), 2, Math.round(h)); } }
    }
    // p(Loom)'s threads, whipping down through the broken roof to the gun
    if (Q.threads > 0 && Q.st === 'collapse') {
      const mz = td.muzzle(), tx = mz.x, ty = mz.y - mz.h;
      for (let i = 0; i < 4; i++) {
        const sx = tx + (i - 1.5) * 70, sy = CAM.y - 10, k = Q.threads;
        g.strokeStyle = i % 2 ? '#ff7a2a' : '#ffd060'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy);
        for (let s = 1; s <= 12; s++) { const u = s / 12 * k; g.lineTo(sx + (tx + (i - 1.5) * 6 - sx) * u + Math.sin(u * 14 + t * 30 + i) * 6 * (1 - u), sy + (ty - sy) * u); }
        g.stroke();
      }
      td.glow(tx, ty, 30, '#ff7a2a', .5);
    }
    td.glows();
    // the souls on their way to the gun, and saluting at the end
    for (const s of Q.souls) if (!s.landed) {
      const k = s.t / s.dur, mz = td.muzzle(), x0 = s.x0 + CAM.x, y0 = s.y0 + CAM.y, x = x0 + (mz.x - x0) * k, y = y0 + (mz.y - mz.h - y0) * k - Math.sin(k * Math.PI) * 30;
      g.drawImage(A.GHOST, Math.round(x - 9), Math.round(y - 11), 18, 22); td.glow(x, y, 14, '#ffd44a', .5);
    }
    if (Q.collapse && Q.collapse.freed) for (const s of Q.collapse.salute) {
      const img = A.SOUL_SALUTE || A.GHOST; g.save(); g.translate(Math.round(s.x), Math.round(s.y)); if (s.flip) g.scale(-1, 1); g.drawImage(img, -9, -11, 18, 22); g.restore(); td.glow(s.x, s.y, 14, '#ffd44a', .4);
    }
    g.restore();
  }
  function nullCtx() { return { fillStyle: '', strokeStyle: '', lineWidth: 1, fillRect() {}, beginPath() {}, ellipse() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {}, save() {}, restore() {} }; }
  // the screens on the wall (lit by themselves: the glow layer)
  function glowScreens() { g.save(); g.translate(-CAM.x, -CAM.y); S.monitors(g, LAYOUT, R.t, { panic: Q.panic, down: Q.down, eye: Q.eye }); g.restore(); }

  // ---------- the lobby, drawn ----------
  let LOBBY = null;
  function paintLobby() {
    const cv = A.canvas(W, H), c = cv.getContext('2d'), P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    // cream panelled walls with a gold rail, dark wainscot
    P(0, 0, W, 240, '#e8dcc0');
    for (let x = 0; x < W; x += 4) if ((x * 7) % 13 < 2) P(x, 0, 1, 180, '#e2d4b4');
    P(0, 0, W, 18, '#3a2a1e'); P(0, 18, W, 3, '#c9962e'); P(0, 18, W, 1, '#ffd44a'); P(0, 21, W, 2, '#8a6420');
    for (const x of [14, 120, 320, 426]) { P(x, 40, 40, 110, '#ddd0b0'); P(x + 2, 42, 36, 106, '#e8dcc0'); P(x + 2, 42, 36, 1, '#f6eedc'); }
    P(0, 176, W, 64, '#3a2118'); P(0, 176, W, 3, '#c9962e'); P(0, 176, W, 1, '#ffd44a');
    for (let x = 8; x < W; x += 24) { P(x, 184, 18, 48, '#2e1912'); P(x + 1, 185, 16, 1, '#4a2a1c'); }
    // the marble floor: white and black squares with grey veins, polished
    for (let y = 240; y < H; y += 10) for (let x = 0; x < W; x += 10) P(x, y, 10, 10, ((x + y) / 10) % 2 ? '#f2eee6' : '#24202a');
    for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = 242 + (i * 13) % 26; P(x, y, 6, 1, i % 2 ? '#c8c2ba' : '#3a3440'); }
    P(0, 240, W, 2, '#c9962e');
    // the runner rug to the doors
    P(60, 246, 360, 14, '#7a1d1a'); P(60, 246, 360, 2, '#c9962e'); P(60, 258, 360, 2, '#c9962e');
    for (let x = 70; x < 412; x += 14) P(x, 251, 4, 4, '#c9962e');
    // potted ferns
    for (const x of [44, 280]) { P(x - 9, 214, 18, 26, '#3a2a1e'); P(x - 8, 215, 16, 24, '#8a6420'); P(x - 8, 215, 16, 2, '#c9962e');
      for (let i = 0; i < 9; i++) { const a = -2.6 + i * .3; for (let r = 0; r < 22; r += 2) P(Math.round(x + Math.cos(a) * r), Math.round(214 + Math.sin(a) * r * .9), 2, 2, r > 14 ? '#3aa86a' : '#1f6a40'); } }
    // sconces
    for (const x of [100, 300]) { P(x - 3, 70, 6, 14, '#8a6420'); P(x - 2, 70, 4, 1, '#ffd44a'); }
    // the elevator: a brass frame, the dial over it
    const dx = 2 * arena.X(F48.lobby.doorU);
    P(dx - 48, 64, 96, 176, '#2a170f'); P(dx - 46, 66, 92, 174, '#c9962e'); P(dx - 44, 68, 88, 172, '#8a6420');
    c.fillStyle = '#8a6420'; c.beginPath(); c.arc(dx, 62, 26, Math.PI, 0); c.fill();
    c.fillStyle = '#c9962e'; c.beginPath(); c.arc(dx, 62, 24, Math.PI, 0); c.fill();
    P(dx + 52, 140, 10, 22, '#2a170f'); P(dx + 53, 141, 8, 20, '#c9962e');
    for (const yy of [145, 154]) { P(dx + 55, yy, 4, 4, '#3a2a1a'); P(dx + 56, yy + 1, 2, 2, '#f2e6c8'); }
    return cv;
  }
  // The Rugfather's portrait: a placeholder until the painted one arrives (an image 96 x 120 drawn at x, y). A gilt
  // frame, a dark ground, the founder as a rug in a suit, ablaze, and the plaque.
  function drawPortrait(x, y, t) {
    const P = (a, b, w, h, col) => rect(g, a, b, w, h, col);
    P(x - 8, y - 8, 112, 136, '#5a3a12'); P(x - 6, y - 6, 108, 132, '#c9962e'); P(x - 4, y - 4, 104, 128, '#8a6420'); P(x - 2, y - 2, 100, 124, '#ffd44a');
    for (let i = 0; i < 12; i++) { P(x - 6 + i * 9, y - 6, 3, 2, '#ffe68a'); P(x - 6 + i * 9, y + 124, 3, 2, '#ffe68a'); }
    P(x, y, 96, 120, '#1e1418');
    for (let i = 0; i < 120; i += 4) P(x, y + i, 96, 2, i % 8 ? '#22161a' : '#1a1216');
    // the founder: a carpshit's shape in a black suit with a red tie, his rug body in RugCo red with a gold border
    const cx = x + 48;
    P(cx - 22, y + 70, 44, 50, '#141018'); P(cx - 4, y + 72, 8, 4, '#f2e6c8'); P(cx - 2, y + 76, 4, 22, '#c8302a');
    P(cx - 20, y + 30, 40, 42, '#a8261e'); P(cx - 20, y + 30, 40, 2, '#ffd44a'); P(cx - 20, y + 70, 40, 2, '#ffd44a'); P(cx - 20, y + 30, 2, 42, '#ffd44a'); P(cx + 18, y + 30, 2, 42, '#ffd44a');
    for (let i = 0; i < 6; i++) { P(cx - 23, y + 33 + i * 6, 3, 3, '#f2e6c8'); P(cx + 20, y + 33 + i * 6, 3, 3, '#f2e6c8'); }
    P(cx - 12, y + 44, 7, 6, '#fff6e2'); P(cx + 5, y + 44, 7, 6, '#fff6e2'); P(cx - 9, y + 46, 3, 3, '#141018'); P(cx + 8, y + 46, 3, 3, '#141018');
    P(cx - 14, y + 41, 9, 2, '#141018'); P(cx + 5, y + 41, 9, 2, '#141018');
    P(cx - 8, y + 58, 16, 3, '#141018'); P(cx - 6, y + 61, 12, 2, '#7a1a14');
    P(x + 4, y + 104, 30, 12, '#2a1d14');
    P(x + 82, y + 4, 10, 10, '#3a2a1e');
    txt(g, 'PORTRAIT', Math.round(cx - textWidth('PORTRAIT') / 2), y + 111, '#4a3a2e', 1);
  }
  // the flames round him: painted, so they flicker only a little (drawn with the glow)
  function portraitFlames(x, y, t) {
    const cx = x + 48;
    for (let i = 0; i < 14; i++) {
      const a = i / 13, fx = cx - 30 + a * 60, h = 14 + Math.sin(i * 1.7) * 8 + Math.sin(t * 3 + i) * 2, fy = y + 34 - Math.abs(a - .5) * 20;
      rect(g, Math.round(fx), Math.round(fy - h), 4, Math.round(h), '#c8302a'); rect(g, Math.round(fx + 1), Math.round(fy - h * .7), 2, Math.round(h * .7), '#ff7a2a'); rect(g, Math.round(fx + 1), Math.round(fy - h * .35), 2, Math.round(h * .35), '#ffd060');
    }
    for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { const fy = y + 40 + i * 10, h = 8 + Math.sin(i * 2.1 + t * 2.5) * 3; rect(g, Math.round(cx + sx * 26 + (sx < 0 ? -4 : 0)), Math.round(fy - h), 4, Math.round(h), i % 2 ? '#ff7a2a' : '#c8302a'); }
  }
  function drawPlaque(x, y) {
    rect(g, x - 2, y - 2, 128, 22, '#5a3a12'); rect(g, x, y, 124, 18, '#c9962e'); rect(g, x, y, 124, 1, '#ffe68a');
    const mid = (t, yy) => txt(g, t, Math.round(x + 62 - textWidth(t) / 2), yy, '#2a1d14', 1);
    mid('FOUNDER & CEO', y + 3); mid('HIS VISION ENDURES', y + 10);
  }
  const PORTRAIT = { x: 0, y: 30 };
  function drawLobby() {
    if (!LOBBY) LOBBY = paintLobby();
    g.drawImage(LOBBY, 0, 0);
    const L = Q.lobby, px = Math.round(2 * arena.X(F48.lobby.portraitU)) - 48;
    PORTRAIT.x = px;
    drawPortrait(px, PORTRAIT.y, R.t);
    drawPlaque(px - 14, PORTRAIT.y + 132);
    // the dial over the doors: the car counting down to 48
    const dx = 2 * arena.X(F48.lobby.doorU), floorNo = dialAt(L.t);
    g.fillStyle = '#f2e6c8'; g.beginPath(); g.arc(dx, 62, 20, Math.PI, 0); g.fill();
    const a = Math.PI + clamp((floorNo - 13) / 86, 0, 1) * Math.PI;
    for (let i = 0; i <= 8; i++) { const b = Math.PI + i / 8 * Math.PI; core.line(g, dx + Math.cos(b) * 16, 62 + Math.sin(b) * 16, dx + Math.cos(b) * 19, 62 + Math.sin(b) * 19, '#3a2a1a'); }
    core.line(g, dx, 61, dx + Math.cos(a) * 15, 61 + Math.sin(a) * 15, '#c8302a');
    txt(g, String(floorNo), Math.round(dx - textWidth(String(floorNo)) / 2), 50, '#3a2a1a', 1);
    // the doors, opening on the car and its operator
    const open = doorsOpen(), lw = Math.round(42 * (1 - open));
    rect(g, dx - 42, 70, 84, 170, '#3a2118');
    if (open > 0) {
      rect(g, dx - 42, 70, 84, 170, '#3a2118'); rect(g, dx - 40, 72, 80, 100, '#4a2a1c'); rect(g, dx - 42, 200, 84, 40, '#5e1614');
      const S2 = A.GHOST, ox = dx + 10, oy = 150; g.drawImage(S2, ox, oy, S2.width * 2, S2.height * 2);
      rect(g, ox + 7, oy - 2, 22, 10, '#1a1418'); rect(g, ox + 8, oy - 1, 20, 8, '#c8302a'); rect(g, ox + 8, oy + 5, 20, 2, '#ffd44a');
      rect(g, ox + 4, oy + 30, 28, 12, '#1a1418'); rect(g, ox + 5, oy + 30, 26, 11, '#a8261e');
    }
    for (const [x, right] of [[dx - 42, 0], [dx + 42 - lw, 1]]) {
      if (lw <= 0) break;
      rect(g, x, 70, lw, 170, '#2a170f'); rect(g, x + 1, 71, lw - 2, 168, '#b8862e');
      for (let i = 0; i < 6; i++) { const cx = right ? x : x + lw, s = right ? -1 : 1; core.line(g, cx, 236, cx + s * Math.sin(.25 + i * .2) * 40, 236 - Math.cos(.25 + i * .2) * 150, '#9a6a24'); }
    }
    rect(g, dx - 1, 70, 2, 170, '#2a170f');
    if (L.t > F48.lobby.dingAt + .4 + F48.lobby.doorsT && L.out <= 0) {
      const bob = Math.round(Math.sin(R.t * 5) * 2);
      otxt(g, 'GOING UP', dx, 34 + bob, '#ffd44a', 1, 'center');
    }
    g.restore(); arena.draw(); g.save(); g.scale(.5, .5);
    if (Q.white > 0) { g.save(); g.globalAlpha = Q.white; rect(g, 0, 0, W, H, '#ffffff'); g.restore(); }
  }
  function lobbyGlows() {
    g.save(); g.scale(.5, .5);
    portraitFlames(PORTRAIT.x, PORTRAIT.y, R.t);
    for (const x of [100, 300]) { arena.glow(x, 76, 40, '#ffcf7a', .35); core.disc(g, x, 76, 3, '#fff0c0'); }
    arena.glow(PORTRAIT.x + 48, PORTRAIT.y + 30, 70, '#ff7a2a', .25);
    g.restore();
    arena.glows();
  }

  // ---------- the frame ----------
  const draw = half(() => {
    if (Q.st === 'lobby') { drawLobby(); return; }
    drawFactory();
  });
  function glows() {
    g.save(); g.scale(.5, .5);
    if (Q.st === 'lobby') { g.restore(); lobbyGlows(); return; }
    glowScreens(); glowFactory();
    g.restore();
    core.drawFx('glow');
  }
  function overlay() {
    if (Q.st === 'lobby') return;
    g.save(); g.scale(.5, .5); td.arrows(); td.reticle();
    if (Q.white > 0) { g.globalAlpha = Q.white; rect(g, 0, 0, W, H, '#ffffff'); }
    g.restore();
  }
  // the HUD: souls top right, the three lines' state top middle, p(Loom)'s readout along the bottom
  function hud() {
    drawSoulsCounter();
    if (Q.st !== 'lobby') {
      const x0 = 120 - 21;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * 15, y = 4, dn = Q.down[i], lm = loomOf(i);
        rect(g, x - 1, y - 1, 12, 9, '#0a0810'); rect(g, x, y, 10, 7, dn ? '#3a1a1a' : '#2c2a35');
        if (!dn) { rect(g, x + 1, y + 1, 1, 5, '#ff7a2a'); rect(g, x + 4, y + 1, 1, 5, '#ff7a2a'); rect(g, x + 7, y + 1, 1, 5, '#ff7a2a'); const k = lm.hp / lm.max; rect(g, x, y + 8, Math.round(10 * k), 1, k < .34 ? '#d63428' : '#3aa86a'); }
        else { core.line(g, x + 1, y + 1, x + 8, y + 6, '#d63428'); core.line(g, x + 8, y + 1, x + 1, y + 6, '#d63428'); }
      }
      if (Q.panic && Q.st === 'fight' && Math.floor(R.t * 3) % 2) otxt(g, Q.panic > 1 ? 'PANIC!!' : 'PANIC', 120, 15, Q.panic > 1 ? '#ff5a4a' : '#ffd44a', 1, 'center');
    }
    drawTalk();
  }
  function drawTalk() {
    const T2 = R.talk; if (!T2 || !T2.speaker) return;
    let n = 0; while (n < T2.text.length && T2.times[n] <= T2.t) n++;
    const s = T2.text.slice(0, Math.max(1, n));
    g.save(); g.scale(.5, .5);
    if (T2.speaker === 'ploom') {
      rect(g, 0, H - 30, W, 30, '#140806'); rect(g, 0, H - 30, W, 2, '#ff7a2a');
      core.disc(g, 18, H - 15, 7, '#ff7a2a'); core.disc(g, 18, H - 15, 4, '#ffd060'); core.disc(g, 18, H - 15, 2, '#140806');
      otxt(g, 'P(LOOM)', 34, H - 22, '#ff7a2a', 1); otxt(g, s, 34, H - 14, '#ffd060', 2);
    } else if (T2.speaker === 'operator') {
      const dx = 2 * arena.X(F48.lobby.doorU) + 28, w = textWidth(s) * 2 + 12, x = clamp(dx - w / 2, 4, W - w - 4), y = 120;
      rect(g, x - 2, y - 2, w + 4, 24, '#1a1418'); rect(g, x, y, w, 20, '#fff6e2'); txt(g, s, x + 6, y + 5, '#1a1418', 2);
    }
    g.restore();
  }
  // flat light: dim work lights and the machines' own light; darker and red in the panic and the collapse
  function view() {
    if (Q.st === 'lobby') return { ambient: 1 };
    return { ambient: Q.st === 'collapse' ? .4 : Q.panic > 1 ? .44 : Q.panic ? .48 : .52 };
  }
  function lights(r) {
    if (Q.st === 'lobby') { arena.lights(r); return; }
    const c = CAM, on = (x, y) => x - c.x > -60 && x - c.x < W + 60 && y - c.y > -60 && y - c.y < H + 60;
    let n = 0;
    for (const m of Q.machines) {
      if (m.dead || n > 8) continue;
      const x = (m.x0 + m.x1) / 2, y = m.y0 - m.H / 2; if (!on(x, y)) continue;
      if (m.kind === 'tank') { r.light(x - c.x, y - c.y, 0, .1, .22, .3); n++; }
      else if (m.kind === 'loom') { r.light(x - c.x, y - c.y, 0, .34, .14, .04); n++; }
      else if (m.kind === 'animator' && m.zap > 0) { r.light(x - c.x, y - c.y, 0, .3, .4, .5); n++; }
    }
    if (Q.panic && Q.st === 'fight') for (let i = 0; i < 3; i++) { const x = F48.beltEnd + 26, y = LINES[i].y - 15; if (on(x, y)) r.light(x - c.x, y - c.y, 0, .5, Q.panic > 1 ? .08 : .3, .02); }
    for (const f of Q.fx) if (f.k === 'boom' && f.t < .3) r.light(f.x - c.x, f.y - 14 - c.y, 0, 1.4 * f.s, .9 * f.s, .3 * f.s);
    r.light(F48.main.x + 6 - c.x, 200 - c.y, 0, .08, .16, .22);
    // the work lights hanging over the floor: warm pools (out in the collapse, flickering in the panic)
    if (Q.st === 'fight') for (const [x, y] of F48.worklights) if (on(x, y)) { const f = Q.panic > 1 && Math.floor(R.t * 13 + x) % 7 === 0 ? .3 : 1; r.light(x - c.x, y - c.y, 0, .3 * f, .26 * f, .2 * f); }
    td.lights(r, c);
  }
  function shakeOffset() {
    const s = Math.max(0, R.shake) * 20 + (Q.st === 'lobby' ? 0 : 0);
    return s ? [Math.round(Math.sin(R.t * 71) * s) / 2, Math.round(Math.cos(R.t * 53) * s) / 2] : [0, 0];
  }
  const noop = () => {};
  return {
    id: 'floor48', twin: () => Q && Q.st !== 'lobby' && R.phase !== 'dead' && R.phase !== 'win',
    tune: { scroll: 0, aisle: .92, move: .55, bossHP: 0, charges: 24, recharge: .18, deflectCharge: 3, hurtInv: 1.5, spreadT: 10 },
    set: { flat: true },
    get label() { return Q && Q.st === 'lobby' ? 'Unruggabull, side on, in an immaculate elevator lobby, under a grand portrait of the flaming Rugfather.' : "Unruggabull, seen from above, inside p(Loom)'s soul-reclamation factory: three production lines of conveyor belts and machines weaving captured souls into carpshits."; },
    lines: { f48start: 'SO THIS IS WHERE THEY GO.', f48line: 'ONE DOWN.', f48panic: 'OVERTIME, HUH?', portrait: "HIS VISION ENDURES. HE DIDN'T.", start: false },
    newRun, update, opening, resume, use(x) { g = x; td.use(x); arena.use(x); },
    view, lights, shakeOffset, draw, glows, overlay, hud,
    fire: () => true, slashHits: noop, muzzleXY: () => { const m = td.muzzle(), s = td.screenOf(m.x, m.y - m.h); return { x: s.x / 2, y: s.y / 2 }; },
    soulFreed(f) { f.to = { x: W / 2 - 10 - textWidth(String(R.souls)), y: 7 }; },
    aim: noop, shotHits: () => false, shotFar: () => false, posOf: o => o, slash: noop, hurt: noop, blasterBack: noop,
    bonusBy: () => null, endPull: noop, cutRug: noop, draggedIn: noop, blowUp: noop,
    checkpoint() { if (Q && Q.st !== 'lobby') core.setCheckpoint({ stage: 'floor48', souls: R.checkpointSouls != null ? R.checkpointSouls : R.souls, continues: R.continues, down: Q.down.slice(), seedState: core.seedState(), runSeed: core.runSeed() }); },
    stageNo: () => R.phase === 'win' ? 22 : Q.st === 'lobby' ? 21 : Q.st === 'collapse' ? 21 : 18 + Q.panic,
    stageNames: { 18: 'The 48th Floor', 19: 'The 48th Floor: one line down', 20: 'The 48th Floor: last line', 21: 'The 48th Floor: collapse and lobby', 22: 'The 48th Floor cleared' },
    pauseText: 'The factory waits.',
    continueText: () => Q && Q.panic ? 'Back in the factory with full hearts? Lines you shut down stay down.' : 'Back in the factory with full hearts?',
    clearCard: (extra, best, clock) => ({ title: 'The 48th Floor clear', text: '', rows: [['Souls', String(R.souls)], ['Time', clock(R.endT)]], note: '' }),
    F48, LINES, td, arena, lineDown, breakMachine, startCollapse, startLobby, loomOf, get Q() { return Q; }
  };
};
