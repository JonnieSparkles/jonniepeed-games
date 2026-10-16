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
  // The three lines' places on the floor. What each one makes (and so its hazard) is shuffled per run (`Q.kinds`).
  const LINES = [{ y: 124 }, { y: 228 }, { y: 332 }];
  const KINDS = { armored: 'HEAVY', flyer: 'STANDARD', roll: 'BULK' };
  const F48 = {
    world: { w: 800, h: 480 }, wallH: 58, bedH: 22, lineX0: 66, lineX1: 612, beltEnd: 606, door: { x: 400 },
    main: { x: 14, y1: 360 },
    // cover: pallets of finished rugs waiting for dispatch, and a parts crate (solid; rolls bounce off them)
    // Clutter, all of it breakable (and solid until it breaks): pallets of finished rugs (they scatter), RugCo crates
    // (each holds a power-up), soul canisters along the walkways (they explode and set each other off) and each line's
    // control console (smashing it hurts its loom). [kind, x, y, width, depth, height]; consoles name their line.
    props: [['pallet', 690, 150, 44, 26, 26], ['pallet', 716, 286, 40, 24, 30], ['pallet', 724, 384, 40, 24, 26],
      ['crate', 520, 396, 30, 22, 22], ['crate', 150, 392, 34, 22, 20], ['crate', 700, 216, 26, 20, 18], ['crate', 40, 296, 24, 18, 18],
      ['canister', 100, 78, 12, 10, 18], ['canister', 114, 84, 12, 10, 18], ['canister', 420, 76, 12, 10, 18], ['canister', 434, 80, 12, 10, 18],
      ['canister', 690, 70, 12, 10, 18], ['canister', 704, 76, 12, 10, 18], ['canister', 196, 158, 12, 10, 18], ['canister', 210, 162, 12, 10, 18],
      ['canister', 452, 184, 12, 10, 18], ['canister', 466, 180, 12, 10, 18], ['canister', 196, 262, 12, 10, 18], ['canister', 210, 266, 12, 10, 18],
      ['canister', 452, 290, 12, 10, 18], ['canister', 466, 286, 12, 10, 18], ['canister', 250, 400, 12, 10, 18], ['canister', 264, 404, 12, 10, 18],
      ['canister', 600, 360, 12, 10, 18], ['canister', 614, 364, 12, 10, 18],
      ['console', 560, 84, 22, 10, 16, 0], ['console', 560, 188, 22, 10, 16, 1], ['console', 560, 292, 22, 10, 16, 2]],
    propHp: { pallet: 10, crate: 6, canister: 3, console: 8 }, propSouls: { pallet: 3, crate: 1, canister: 2, console: 1 },
    canister: { r: 58, machine: 4 }, console: { loom: 15 },
    worklights: [[200, 90], [450, 90], [700, 90], [200, 280], [450, 280], [700, 280], [330, 410], [640, 410]],
    // each machine on a line: its kind, left edge, width, depth and height (picture pixels)
    parts: [['tank', 70, 28, 22, 44], ['spinner', 140, 40, 26, 30], ['loom', 238, 82, 34, 54], ['press', 382, 46, 30, 30], ['animator', 488, 40, 26, 34]],
    hp: { tank: 14, spinner: 20, loom: 210, press: 22, animator: 22 },
    souls: { tank: 5, spinner: 3, loom: 10, press: 3, animator: 3, line: 8 },
    toLoom: 10, coffee: .3,                       // a part breaking hurts its loom this much (the line's chain)
    // the last loom standing overloads (owner, Oct 13: the last one "takes forever"): it takes `mult` times the damage,
    // and at each of `stages` of its health a chunk blows off it (a blast that kills carpshits, `souls` freed, a freeze)
    overload: { mult: 2, stages: [.75, .5, .25], souls: 4, blast: 52, stop: .1, holes: [[.22, .3], [.72, .22], [.48, .62]] },
    blast: { tank: [86, 14], spinner: [72, 14], press: [72, 14], animator: [72, 14], loom: [128, 22] },   // radius, damage to machines
    chainDelay: .12, cascade: .16,
    // production: seconds between rugs off each line (by its index), the belt's speed, the press's beat, by panic level
    make: [5.4, 4.6, 6], rate: [1, 1.4, 1.9], pace: [1, 1.15, 1.3], belt: [58, 72, 90], press: [2.4, 1.9, 1.5],
    pressWarn: .55, pressSlam: .14, beltPush: .55, most: 12, firstAt: 4, prefill: [.55],
    // katana-only cables: each line's soul feed (the glass hose from the main to its tank) and the power cable from its
    // animator to a junction box on the walkway below. Cut a feed: its souls spill free and the line runs starved; cut
    // the power: rugs leave limp, and their souls go free instead of coming alive, until p(Loom) splices the cable back
    // with its thread (down seconds).
    feed: { x0: 28, x1: 68, dy: -24, souls: 6, starve: .6 }, power: { dx: 20, y0: 13, y1: 42, souls: 1, down: 9 }, cue: 96,
    // power-ups from broken machines: which part drops what, how likely, how long it waits on the floor
    // (the first of each kind of part always drops its power-up; crates always hold one, the ones not seen yet first)
    // chain reactions (owner, Oct 13: "chain callouts yes!"): breaks set off by a blast within `window` of the last one
    // are one chain; from `min` on it's called out (CHAIN x5), with a hit-stop at each of `beats`; when it ends, a soul
    // per break past the second
    combo: { window: .6, min: 3, beats: [3, 5, 8, 12, 16], stop: .07 },
    // p(Loom)'s QUALITY CONTROL (owner, Oct 13: "i like the mid floor ploom laser"): `delay` after the first and second line
    // goes down, a laser sweeps the room with one gap in it. It warns for `warn` seconds where it will start, then
    // sweeps: first a wall of light across (its gap on the walkway nearest him), then one down the room (its gap within
    // `reach` of him). A heart if it touches him; it
    // burns any carpshit it crosses and sets off the clutter.
    qc: { delay: 2.4, warn: 1.7, w: 4, gapsY: [176, 280, 390], reach: 150, sweeps: [{ dir: 'x', speed: 150, gap: 60 }, { dir: 'y', speed: 100, gap: 80 }] },
    // the last line's reactor (owner, Oct 14, option D on the design page): two reaction vessels stand in the dispatch
    // bay from the start, one high and one low, dormant under shields of their own. When the second line goes down and its
    // laser sweep has passed, they wake and beam their energy to a shield over the last loom. Burst both (`hp` bolts
    // each, `slash` a cut) and the shield drops into the overload. Each burst: a blast, souls, a freeze. Awake, they
    // fight back (owner, Oct 14, "standing there costs something"): when he's within `zap.near` a vessel marks the floor
    // under him for `zap.warn` seconds, then arcs a bolt to that spot (a heart if he's still within `zap.hit`), every
    // `zap.every` seconds; and every `spawn` seconds each sends out a carpshit. The last line makes `rush` times as
    // fast while it's shielded.
    reactor: { at: [[760, 124], [690, 410]], hp: 12, slash: 6, blast: 80, souls: 6, grace: .4, hitW: 15, rush: 1.3,
      zap: { near: 120, warn: .6, hit: 15, every: [1.6, 2.4], first: [.6, 1.2] }, spawn: [6, 8] },
    // the canister cart (optional, the bottom walkway): from `first`, every `every` seconds while the lines are up, a cart
    // of `load` soul canisters rolls along the rail; one hit sets the whole load off down the cart, a chain
    cart: { first: 25, every: 40, speed: 70, y: 436, load: 4, souls: 2, blast: 58, gap: .1 },
    drops: { spinner: 'spread', press: 'rapid', animator: 'pierce' }, dropChance: .45, dropLife: 12,
    // the shag: from the first line down, every this-many launches from a live line, at most this many out
    shagEvery: 5, shagMost: 2,
    // the lines' hazards: the Heavy line's crane hook sweeping the walkway below it, the Standard line's spinner flinging
    // thread at him, the Bulk line's belt running backwards in the panic
    crane: { every: [6, 8.5], warn: 1, speed: 420, dy: 52, hit: 11 },
    fling: { every: [4.2, 6], tell: .5, range: 280 },
    reverse: { every: 6.5, dur: 2.2, warn: .8 },
    // the end: the factory collapses; two souls join the gun (1.8 and 2.6 s); the back wall's reserve of soul tanks is
    // exposed and the streams whip through it (whip seconds, or until every tank is cracked); then p(Loom)'s beat (locked)
    collapse: { souls: 2, firstSoul: 1.6, soulEvery: .8, whip: 10, reserve: 16, reserveHp: 2, reserveSouls: 4, bendMax: .85 },
    ploom: { pan: .6, eye: .3, say: .8, threads: 1.3, snap: 1.75, yank: 2.6, free: 3.05, salute: 3.5, rise: 4.3, close: 4.1, white: 4.7, lobby: 5.3 },
    lobby: { walkIn: 1.1, dialFrom: 61, dingAt: 5.4, doorsT: 1.2, doorU: .6, doorway: .25, walkOut: 1, portraitU: -.12 },
    // the soul quota (soul audit, owner Oct 16): what the floor keeps making pays only so much a visit, so stalling can't
    // farm souls and a slow player is never punished. Souls from carpshits killed in the fight (any kind, the vessels'
    // flyers and the shag's halves too) and limp rugs count; past souls they pay nothing. The canister cart comes at most
    // carts times. Everything fixed (machines, feeds, clutter, chunks, vessels, chains, the collapse) pays as always.
    // idle: seconds without a loom taking damage before the arrow points at the nearest running one.
    quota: { souls: 100, carts: 2, unpaidEvery: 3, idle: 20 },   // souls: 60 → 100 (owner, Oct 16)
    deadWait: 2.8
  };
  const td = UnrugTopdown(core, { world: F48.world, bounds: { x0: 30, y0: F48.wallH + 4, x1: 786, y1: 440 } });
  const arena = UnrugArena(core, { limit: .92 });
  // the lobby (lobby.js, shared with the 13th Floor's): singed, he passes the Rugfather's portrait on the way to the car
  const lobby = UnrugLobby(core, arena, Object.assign({}, F48.lobby, { floor: 48, look: '48', smoke: true,
    events: { ding: 'f48_ding', board: 'f48_board' }, bark: { u: F48.lobby.portraitU, key: 'portrait' },
    white: dt => { Q.white = Math.max(0, Q.white - dt * 1.6); },
    wall: () => { const px = Math.round(2 * arena.X(F48.lobby.portraitU) - PW8 / 2); PORTRAIT.x = px;
      drawPortrait(px, PORTRAIT.y); drawPlaque(px + Math.round(PW8 / 2) - 62, PORTRAIT.y + PH8 + 4); },
    wallGlows: () => arena.glow(PORTRAIT.x + PW8 / 2, PORTRAIT.y + 40, 80, '#ff7a2a', .2 + .03 * Math.sin(R.t * 2.3)) }));
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
    // which line makes what: seeded, so a seed replays it; a continue keeps the run's
    const kinds = at && !at.transfer && at.kinds ? at.kinds.slice() : (() => { const k = ['armored', 'flyer', 'roll']; for (let i = 2; i > 0; i--) { const j = Math.floor(rr(0, i + 1)); [k[i], k[j]] = [k[j], k[i]]; } return k; })();
    Q = R.f48 = { st: 'fight', t: 0, down, kinds, feedCut: [false, false, false], powerCut: [0, 0, 0], patched: [0, 0, 0], launches: 0,
      crane: [0, 1, 2].map(() => ({ next: rr(...F48.crane.every), st: 'idle', t: 0, x: 0, dir: 1 })),
      fling: [0, 1, 2].map(() => ({ next: rr(...F48.fling.every), tell: 0 })),
      reverse: [0, 0, 0], reverseT: [F48.reverse.every, F48.reverse.every, F48.reverse.every], cues: {}, props: makeProps(), dropped: {}, panic: down.filter(Boolean).length, machines: buildMachines(), items: [[], [], []], next: [0, 0, 0], beltOff: [0, 0, 0],
      pressT: [0, 0, 0], chain: [], fx: [], smokeT: 0, shake: 0, flashT: 0, eye: 0, threads: 0, bend: 0, souls: [], collapse: null, lobby: null,
      started: false, events: {}, music: 'b', lineT: [0, 0, 0], hitSnd: 0, white: 0, debrisT: 0,
      combo: null, callout: null, bestChain: 0, qc: null, qcPending: null,
      reactor: newReactor(down.filter(Boolean).length === 2 ? 'wait' : 'dormant'), cart: null, cartNext: F48.cart.first, cartN: 0,
      quota: 0, quotaAt: null, unpaid: 0, loomHitAt: 0 };
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
    td.room({ solids, push, machineHit, slashMachines, targets, pays: quotaPays });
    R.td.locked = false;
    const lobbyStart = at && at.lobby || /(^|&)at=lobby(&|$)/.test(location.hash.replace(/^#/, '')) && !at;
    saveCheckpoint();
    if (lobbyStart) startLobby(true);
    emit('f48_state', { state: lobbyStart ? 'lobby' : 'fight', down: down.filter(Boolean).length });
  }
  function saveCheckpoint(extra) { core.setCheckpoint(Object.assign({ stage: 'floor48', souls: R.souls, continues: R.continues, down: Q.down.slice(), kinds: Q.kinds.slice(), seedState: core.seedState(), runSeed: core.runSeed() }, extra)); }
  const kindOf = i => Q.kinds[i];
  const loomOf = i => Q.machines.find(m => m.line === i && m.kind === 'loom');
  const partOf = (i, kind) => Q.machines.find(m => m.line === i && m.kind === kind);
  // the katana-only things: where each line's feed hose and power cable run, as segments on the floor
  const feedSeg = i => ({ x0: F48.feed.x0, y0: LINES[i].y + F48.feed.dy, x1: F48.feed.x1, y1: LINES[i].y + F48.feed.dy });
  const powerSeg = i => { const an = partOf(i, 'animator'), x = (an.x0 + an.x1) / 2 + F48.power.dx; return { x0: x, y0: LINES[i].y + F48.power.y0, x1: x, y1: LINES[i].y + F48.power.y1 }; };
  const segDist = (q, x, y) => { const vx = q.x1 - q.x0, vy = q.y1 - q.y0, L = vx * vx + vy * vy || 1, k = clamp(((x - q.x0) * vx + (y - q.y0) * vy) / L, 0, 1); return Math.hypot(x - q.x0 - vx * k, y - q.y0 - vy * k); };
  const powered = i => !(Q.powerCut[i] > 0);   // a wrecked animator doesn't stop the line: the loom's threads still bring its rugs alive
  // the cuttable things still standing, for the cues and the bot
  function cables() {
    const out = [];
    for (let i = 0; i < 3; i++) {
      if (!live(i)) continue;
      if (!Q.feedCut[i]) out.push(Object.assign({ line: i, kind: 'feed' }, feedSeg(i)));
      if (powered(i)) out.push(Object.assign({ line: i, kind: 'power' }, powerSeg(i)));
    }
    return out;
  }
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
  const makeProps = () => F48.props.map(([kind, x, y, w, d, h, line], i) => ({ kind, id: 90 + i, x0: x, x1: x + w, y0: y, y1: y + d, H: h, line, hp: F48.propHp[kind], max: F48.propHp[kind], dead: false, flash: 0 }));
  function solids() {
    const out = Q.props.filter(p => !p.dead);
    for (const m of Q.machines) for (const s of m.solid) out.push(s);
    for (const v of standing()) out.push({ x0: v.x - 12, x1: v.x + 12, y0: v.y - 8, y1: v.y + 4 });
    return out;
  }
  // a belt carries what stands on it, along the line, while the line runs
  function push(x, y) {
    for (let i = 0; i < 3; i++) {
      if (!live(i) || x < F48.lineX0 || x > F48.beltEnd) continue;
      if (Math.abs(y - LINES[i].y) < F48.bedH / 2 + 2) return { x: F48.belt[Q.panic] * F48.beltPush * (Q.reverse[i] > 0 ? -1.2 : 1), y: 0 };
    }
    return null;
  }
  // A bolt (or a returned bobbin) at (x, y) on the floor: does it hit a machine where it's drawn?
  function machineHit(x, y, dmg, by) {
    for (const v of standing()) if (Math.abs(x - v.x) < F48.reactor.hitW && y > v.y - 24 && y < v.y + 12) { hurtVessel(v, dmg, by); return true; }
    if (Q.st === 'fight' && cartHit(x, y)) { hitCart(by); return true; }
    for (const p of Q.props) {
      if (p.dead) continue;
      if (x >= p.x0 - 1 && x <= p.x1 + 1 && y >= p.y0 - 6 && y <= p.y1 + 10) { hurtProp(p, dmg, by); return true; }
    }
    for (const m of Q.machines) {
      if (m.dead) continue;
      if (x >= m.x0 - 1 && x <= m.x1 + 1 && y >= m.y0 - 8 && y <= m.y1 + 16) {
        // the shield takes the bolt: a ripple where it hit, a ping
        if (shielded(m)) { Q.reactor.hitT = .25; Q.reactor.hitX = x; td.sparks(x, y, 18, '#8fe3ff', 4); if (Q.hitSnd <= 0) { Snd.play('shieldHit'); Q.hitSnd = .08; } return true; }
        hurt(m, dmg, by); return true;
      }
    }
    return false;
  }
  function slashMachines(cx, cy, r, dmg, swing) {
    let n = 0;
    if (Q.st === 'fight') for (const c of cables()) if (segDist(c, cx, cy) < r + 4) { cutCable(c); n++; }
    for (const p of Q.props) {
      if (p.dead || p.swing === swing) continue;
      const nx = clamp(cx, p.x0, p.x1), ny = clamp(cy, p.y0 - 8, p.y1 + 4);
      if ((nx - cx) ** 2 + (ny - cy) ** 2 < r * r) { p.swing = swing; hurtProp(p, dmg, 'slash'); n++; td.sparks(nx, ny, 10, '#fff6e2', 6); }
    }
    for (const v of standing()) {
      if (v.swing === swing) continue;
      const ny = clamp(cy, v.y - 30, v.y + 6);
      if ((v.x - cx) ** 2 + (ny - cy) ** 2 < (r + 10) ** 2) { v.swing = swing; hurtVessel(v, F48.reactor.slash, 'slash'); n++; td.sparks(v.x, ny, 14, '#bfefff', 8); }
    }
    if (Q.cart && Q.cart.full && Math.abs(Q.cart.x - cx) < r + 18 && Math.abs(F48.cart.y - cy) < r + 10) { hitCart('slash'); n++; }
    for (const m of Q.machines) {
      if (m.dead || m.swing === swing) continue;
      const nx = clamp(cx, m.x0, m.x1), ny = clamp(cy, m.y0 - 10, m.y1 + 6);
      if ((nx - cx) ** 2 + (ny - cy) ** 2 < r * r) { m.swing = swing; hurt(m, dmg, 'slash'); n++; td.sparks(nx, ny, 14, '#fff6e2', 8); }
    }
    return n;
  }
  // what the blaster leans toward: looms and parts still standing
  function targets() { return Q.st === 'fight' ? Q.machines.filter(m => !m.dead && !shielded(m)).map(m => ({ x: (m.x0 + m.x1) / 2, y: m.y1 - 2 })).concat(vessels().map(v => ({ x: v.x, y: v.y - 4 }))) : []; }

  // ---------- the cables ----------
  function cutCable(c) {
    const i = c.line, mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2;
    if (c.kind === 'feed') {
      Q.feedCut[i] = true; soulsFrom(mx, my, F48.feed.souls, 'feed', 'slash'); Snd.play('tankBurst');
      for (let k = 0; k < 14; k++) R.td.fx.push({ k: 'spark', x: mx + fxr(-12, 12), y: my, h: 8, vx: fxr(-90, 90), vy: fxr(-40, 40), vh: fxr(40, 120), col: k % 2 ? '#bfefff' : '#ffd44a', t: 0, dur: .6 });
      core.popText('FEED CUT', td.screenOf(mx, my - 20).x / 2, td.screenOf(mx, my - 20).y / 2, '#bfefff');
      core.live('Soul feed cut: its souls spill free and the line runs slower.');
    } else {
      Q.powerCut[i] = F48.power.down; Snd.play('surge');
      for (let k = 0; k < 12; k++) R.td.fx.push({ k: 'spark', x: mx, y: my, h: 6, vx: fxr(-120, 120), vy: fxr(-60, 60), vh: fxr(30, 90), col: k % 2 ? '#bfefff' : '#ffffff', t: 0, dur: .4 });
      core.popText('POWER CUT', td.screenOf(mx, my - 20).x / 2, td.screenOf(mx, my - 20).y / 2, '#bfefff');
      core.live('Power cut: the line\'s rugs come out dead until it\'s spliced back.');
    }
    R.events.cuts = (R.events.cuts || 0) + 1; R.freeze = Math.max(R.freeze, .05); Q.shake = Math.max(Q.shake, .25);
    emit('f48_cut', { kind: c.kind, line: i });
  }
  // A cue for what only the katana handles: a red katana mark on the cable, and SLASH! when he's close enough to reach
  // it; the first time each comes up, a prompt.
  function prompt(key, text) {
    if (Q.cues[key] || R.banner || Q.st !== 'fight') return;
    Q.cues[key] = true; R.banner = { text, t: 0, dur: 2, pull: true, col: '#ff6a5a' }; core.live(text.charAt(0) + text.slice(1).toLowerCase() + '.');
  }
  function stepCues() {
    if (Q.t < 5) return;
    const near = c => segDist(c, bull.x, bull.y) < F48.cue;
    if (cables().some(near)) prompt('cable', 'SLASH THE CABLES');
    if (R.td.enemies.some(e => e.wind > 0)) prompt('bobbin', 'SLASH BOBBINS BACK');
    if (R.td.thrown.some(p => p.kind === 'thread')) prompt('thread', 'SLASH THE THREAD');
    if (R.td.enemies.some(e => e.kind === 'shag' && !(e.spawning > 0))) prompt('shag', 'BIG ONE: SLASH IT');
  }

  // ---------- the clutter ----------
  function hurtProp(p, dmg, by) {
    if (p.dead || Q.st !== 'fight') return;
    p.hp -= dmg; p.flash = .07;
    if (Q.hitSnd <= 0) { Snd.play(p.kind === 'canister' ? 'machineHit' : 'hit'); Q.hitSnd = .05; }
    if (p.hp <= 0) breakProp(p, by);
  }
  // the next power-up: one he hasn't been given yet, else in turn
  function nextPower() {
    const kinds = ['spread', 'rapid', 'pierce'], fresh = kinds.filter(k => !Q.dropped[k]);
    const k = fresh.length ? fresh[0] : kinds[(Q.crates = (Q.crates || 0) + 1) % 3];
    Q.dropped[k] = true; return k;
  }
  function dropPower(kind, x, y) {
    Q.dropped[kind] = true;
    td.addPickup(kind, clamp(x, 40, 780), clamp(y, 70, 432), F48.dropLife);
    const sc = td.screenOf(x, y - 26); core.popText({ spread: 'SPREAD SHOT', rapid: 'RAPID FIRE', pierce: 'PIERCE' }[kind], sc.x / 2, sc.y / 2, kind === 'pierce' ? '#c9a0ff' : kind === 'rapid' ? '#bfefff' : '#ffd44a');
  }
  function breakProp(p, by) {
    if (p.dead) return;
    p.dead = true; p.hp = 0; p.deadAt = R.t;
    const cx = (p.x0 + p.x1) / 2, cy = (p.y0 + p.y1) / 2;
    soulsFrom(cx, p.y0, F48.propSouls[p.kind], p.kind, by === 'chain' ? 'chain' : by);
    link(by, cx, cy);
    R.events.props = (R.events.props || 0) + 1;
    emit('f48_prop', { kind: p.kind, by });
    const bits = (n, cols, up) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, sp = 40 + Math.random() * 110; R.td.fx.push({ k: 'debris', x: cx, y: cy, h: 6 + Math.random() * p.H, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, vh: 50 + Math.random() * up, s: 2 + Math.round(Math.random() * 3), r: 0, vr: (Math.random() - .5) * 20, col: cols[i % cols.length], t: 0, dur: .9 + Math.random() * .6 }); } };
    if (p.kind === 'canister') {
      // a soul canister bursts: glass, a blast that kills carpshits, sets off canisters near it and hurts machines
      boom(cx, cy, .8); Snd.play('tankBurst'); Q.shake = Math.max(Q.shake, .3);
      bits(10, ['#4a8aa8', '#bfefff', '#c9962e'], 120);
      td.blast(cx, cy, F48.canister.r, 'blast');
      Q.chain.push({ t: F48.chainDelay, x: cx, y: cy, r: F48.canister.r, dmg: F48.canister.machine, from: p, props: true });
    } else if (p.kind === 'pallet') {
      // the rugs on it scatter
      Snd.play('machineBreak'); Q.shake = Math.max(Q.shake, .2);
      bits(16, ['#a8261e', '#d63428', '#6a5a3a', '#c9962e'], 90);
    } else if (p.kind === 'crate') {
      Snd.play('machineBreak'); bits(10, ['#5a4632', '#7a6244', '#2a2016'], 80);
      dropPower(nextPower(), cx, p.y1 + 10);
    } else if (p.kind === 'console') {
      // the line's controls: sparks, its screen out, and its loom takes the hit
      Snd.play('surge'); Q.shake = Math.max(Q.shake, .25); bits(8, ['#3a3640', '#3aa86a', '#bfefff'], 70);
      for (let k = 0; k < 10; k++) R.td.fx.push({ k: 'spark', x: cx, y: cy, h: 12, vx: fxr(-90, 90), vy: fxr(-40, 40), vh: fxr(30, 100), col: k % 2 ? '#bfefff' : '#ffffff', t: 0, dur: .45 });
      const lm = loomOf(p.line); if (lm && !lm.dead && live(p.line)) Q.chain.push({ t: F48.chainDelay, loom: lm, dmg: F48.console.loom });
    }
  }

  // ---------- machines: damage, breaking, chains ----------
  // the last loom standing, overloading
  const overloaded = m => m.kind === 'loom' && !m.dead && Q.panic === 2 && Q.st === 'fight' && Q.reactor && Q.reactor.st === 'down';
  // the last loom behind its shield while the vessels stand
  const shielded = m => m.kind === 'loom' && !m.dead && Q.panic === 2 && Q.st === 'fight' && Q.reactor && Q.reactor.st === 'on';
  // a chunk blowing off the overloading loom at each stage of its health
  function stages(m) {
    if (!overloaded(m)) return;
    const P = F48.overload;
    if (m.stage == null) m.stage = P.stages.filter(f => m.hp / m.max <= f).length;   // stages already passed don't all go at once
    while (m.stage < P.stages.length && m.hp / m.max <= P.stages[m.stage]) {
      const [hx, hy] = P.holes[m.stage], top = m.y0 - m.H, x = m.x0 + hx * (m.x1 - m.x0), y = top + hy * (m.y1 - top);
      m.stage++;
      boom(x, m.y1, 1.1); Snd.play('machineBreak'); Snd.play('tankBurst');
      R.freeze = Math.max(R.freeze, P.stop); Q.shake = Math.max(Q.shake, .7); R.white = Math.max(R.white || 0, .05);
      td.blast(x, m.y1, P.blast, 'blast');
      soulsFrom(x, m.y1, P.souls, 'loom', 'shot');
      for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, sp = 60 + Math.random() * 140; R.td.fx.push({ k: 'debris', x, y: m.y1, h: m.y1 - y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, vh: 60 + Math.random() * 120, s: 2 + Math.round(Math.random() * 3), r: 0, vr: (Math.random() - .5) * 20, col: ['#8a6420', '#ff7a2a', '#3a2a1e', '#ffd060'][i % 4], t: 0, dur: .9 + Math.random() * .6 }); }
      emit('f48_loom_stage', { stage: m.stage });
    }
  }
  function hurt(m, dmg, by) {
    if (m.dead || Q.st !== 'fight') return;
    if (shielded(m)) { Q.reactor.hitT = .25; return; }
    if (overloaded(m)) dmg *= F48.overload.mult;
    m.hp -= dmg; m.flash = .07; m.lastBy = by;
    if (m.kind === 'loom') Q.loomHitAt = Q.t;   // the loom arrow goes, and its idle count starts again
    if (m.hp > 0) stages(m);
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
    m.dead = true; m.hp = 0; m.deadAt = R.t;
    const cx = (m.x0 + m.x1) / 2, cy = (m.y0 + m.y1) / 2, [rad, dmg] = F48.blast[m.kind];
    link(by, cx, cy);
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
    else if (F48.drops[m.kind] && Q.st === 'fight' && (!Q.dropped[F48.drops[m.kind]] || rr(0, 1) < F48.dropChance)) dropPower(F48.drops[m.kind], cx, m.y1 + 16);
    if (m.kind === 'loom') lineDown(m.line);
    else { const lm = loomOf(m.line); if (lm && !lm.dead) Q.chain.push({ t: F48.chainDelay * 2, loom: lm, dmg: F48.toLoom }); }
  }
  function stepChain(dt) {
    for (const c of Q.chain) {
      c.t -= dt; if (c.t > 0 || c.done) continue;
      c.done = true;
      if (c.loom) { if (!c.loom.dead && Q.st === 'fight') { hurtChain(c.loom, c.dmg); td.sparks((c.loom.x0 + c.loom.x1) / 2, c.loom.y1, 20, '#ff7a2a', 8); } continue; }
      if (c.cascade) { if (!c.m.dead) breakMachine(c.m, 'chain'); continue; }
      if (c.cart) cartPop(c.x, c.y, 'chain');
      for (const m of Q.machines) {
        if (m.dead || m === c.from) continue;
        const nx = clamp(c.x, m.x0, m.x1), ny = clamp(c.y, m.y0, m.y1);
        if ((nx - c.x) ** 2 + (ny - c.y) ** 2 < c.r * c.r) hurtChain(m, c.dmg);
      }
      // every blast breaks the clutter in reach (canisters set each other off down a walkway)
      for (const p of Q.props) {
        if (p.dead || p === c.from || Q.st !== 'fight') continue;
        const nx = clamp(c.x, p.x0, p.x1), ny = clamp(c.y, p.y0, p.y1);
        if ((nx - c.x) ** 2 + (ny - c.y) ** 2 < c.r * c.r) { p.hp -= p.kind === 'canister' ? 99 : c.dmg; p.flash = .1; if (p.hp <= 0) breakProp(p, 'chain'); }
      }
    }
    Q.chain = Q.chain.filter(c => !c.done);
  }
  function hurtChain(m, dmg) { if (Q.st !== 'fight' || shielded(m)) return; if (overloaded(m)) dmg *= F48.overload.mult; m.hp -= dmg; m.flash = .1; R.events.chainDamage = (R.events.chainDamage || 0) + dmg; if (m.hp <= 0) breakMachine(m, 'chain'); else stages(m); }
  // ---------- chain reactions ----------
  // A break set off by a blast (by 'chain') within the window of the last link adds to the chain; anything else starts
  // a new one. Called out from the third link, with a hit-stop on the beats; the bonus is paid when it ends.
  function link(by, x, y) {
    if (Q.st !== 'fight') return;
    const C = Q.combo, P = F48.combo;
    if (by === 'chain' && C && R.t - C.last <= P.window) {
      C.n++; C.last = R.t; C.x = x; C.y = y;
      if (C.n >= P.min) {
        Q.callout = { n: C.n, at: R.t, beat: P.beats.includes(C.n) };
        if (Q.callout.beat) { R.freeze = Math.max(R.freeze, P.stop); Q.shake = Math.max(Q.shake, .4); Snd.play('chain', C.n); }
        emit('f48_chain', { n: C.n });
      }
      return;
    }
    endCombo();
    Q.combo = { n: 1, last: R.t, x, y };
  }
  function endCombo() {
    const C = Q.combo; Q.combo = null;
    if (!C || C.n < F48.combo.min) return;
    const bonus = C.n - 2;
    Q.bestChain = Math.max(Q.bestChain, C.n); R.events.bestChain = Q.bestChain;
    soulsFrom(C.x, C.y, bonus, 'chain', 'chain');
    // the bonus joins the callout (a popup of its own landed on top of it)
    Q.callout = { n: C.n, at: R.t, beat: false, bonus };
    emit('f48_chain_end', { n: C.n, bonus });
  }
  function stepCombo() { if (Q.combo && R.t - Q.combo.last > F48.combo.window) endCombo(); }

  // ---------- p(Loom)'s QUALITY CONTROL ----------
  function startQC(n) {
    const P = F48.qc, sw = P.sweeps[n] || P.sweeps[P.sweeps.length - 1], b = td.TD.bounds;
    const L = { n, t: 0, dir: sw.dir, speed: sw.speed, sgn: 1, pos: 0, hum: 0 };
    if (sw.dir === 'x') {
      // it starts at the wall further from him, so he sees it coming
      L.sgn = bull.x < (b.x0 + b.x1) / 2 ? -1 : 1; L.pos = L.sgn > 0 ? b.x0 - 6 : b.x1 + 6;
      // the gap is on the walkway nearest him, so there's always a way out (owner, Oct 13: "theres not always a way to escape it")
      const gy = P.gapsY.reduce((b2, y) => Math.abs(y - bull.y) < Math.abs(b2 - bull.y) ? y : b2); L.g0 = gy - sw.gap / 2; L.g1 = gy + sw.gap / 2;
    } else {
      L.pos = b.y0 - 6;
      // within reach along his walkway: up to `reach` either side of him
      const gx = clamp(bull.x + rr(-P.reach, P.reach), b.x0 + 50, b.x1 - 50); L.g0 = gx - sw.gap / 2; L.g1 = gx + sw.gap / 2;
    }
    Q.qc = L;
    say('QUALITY CONTROL.', 2.2); Snd.play('surge');
    R.banner = { text: 'QUALITY CONTROL', sub: 'FIND THE GAP', t: 0, dur: P.warn + .6, top: true, col: '#ff5a4a' };
    core.live('Quality control: a laser sweeps the floor. Find the gap in it.');
    emit('f48_qc', { n, dir: L.dir });
  }
  function stepQC(dt) {
    if (Q.qcPending) { Q.qcPending.t -= dt; if (Q.qcPending.t <= 0) { const n = Q.qcPending.n; Q.qcPending = null; startQC(n); } }
    const L = Q.qc; if (!L) return;
    const P = F48.qc, b = td.TD.bounds;
    L.t += dt;
    if (L.t < P.warn) return;
    if (!L.on) { L.on = true; Snd.play('surge'); }
    L.pos += L.speed * L.sgn * dt;
    if (L.dir === 'x' ? (L.sgn > 0 ? L.pos > b.x1 + 8 : L.pos < b.x0 - 8) : L.pos > b.y1 + 8) { Q.qc = null; emit('f48_qc_end', { n: L.n }); return; }
    L.hum -= dt; if (L.hum <= 0) { L.hum = .28; Snd.play('animate'); }
    const gap = v => v > L.g0 && v < L.g1;
    // him: along the beam where he stands, not in the gap
    const near = L.dir === 'x' ? Math.abs(bull.x - L.pos) < P.w + 5 : Math.abs(bull.y - 4 - L.pos) < P.w + 7;
    if (near && !gap(L.dir === 'x' ? bull.y : bull.x)) core.hurtBull(1, 'laser');
    // carpshits it crosses burn; the clutter it crosses goes up
    for (const e of R.td.enemies) {
      if (e.dead || e.spawning > 0) continue;
      const r = (td.TD[e.kind] || td.TD.flyer).r;
      if ((L.dir === 'x' ? Math.abs(e.x - L.pos) : Math.abs(e.y - L.pos)) < P.w + r * .5 && !gap(L.dir === 'x' ? e.y : e.x)) td.kill(e, 'laser');
    }
    for (const p of Q.props) {
      if (p.dead) continue;
      const hit = L.dir === 'x' ? L.pos > p.x0 && L.pos < p.x1 && !(gap(p.y0) && gap(p.y1)) : L.pos > p.y0 && L.pos < p.y1 && !(gap(p.x0) && gap(p.x1));
      if (hit) breakProp(p, 'laser');
    }
  }

  // ---------- the last line's reactor ----------
  function newReactor(st) {
    const P = F48.reactor;
    return { st, t: 0, hitT: 0, vessels: P.at.map(([x, y], i) => ({ i, x, y, hp: P.hp, max: P.hp, dead: false, flash: 0, ping: 0, zap: null, zapT: 0, spawnT: 0 })) };
  }
  // the vessels standing (dormant or awake: solid, drawn), and the ones that can be hurt (awake)
  const standing = () => Q.reactor ? Q.reactor.vessels.filter(v => !v.dead) : [];
  const vessels = () => Q.reactor && Q.reactor.st === 'on' ? Q.reactor.vessels.filter(v => !v.dead) : [];
  const lastLoom = () => Q.machines.find(m => m.kind === 'loom' && !m.dead && live(m.line));
  function stepReactor(dt) {
    const Rc = Q.reactor; if (!Rc) return;
    Rc.t += dt; Rc.hitT = Math.max(0, (Rc.hitT || 0) - dt);
    // it waits for the last line's laser sweep to pass (owner, Oct 14: "lets not have the shield active until that laser passes")
    for (const v of Rc.vessels) { v.flash = Math.max(0, v.flash - dt); v.ping = Math.max(0, v.ping - dt); }
    if (Rc.st === 'wait') { if (!Q.qc && !Q.qcPending && Rc.t > F48.reactor.grace && lastLoom()) startReactor(false); return; }
    if (Rc.st !== 'on') return;
    // holding fire while the last line's laser is on its way or sweeping; then they turn on him
    if (Rc.calm) {
      if (Q.qc || Q.qcPending) { Rc.calmT = 0; return; }
      Rc.calmT = (Rc.calmT || 0) + dt; if (Rc.calmT < F48.reactor.grace) return;
      Rc.calm = false; wake(); return;
    }
    // awake, they fight back: a marked spot under him, then an arc to it; and now and then a carpshit
    const P = F48.reactor, Z = P.zap;
    for (const v of Rc.vessels) {
      if (v.dead) continue;
      if (v.zap) {
        const z = v.zap; z.t += dt;
        if (!z.fired && z.t >= Z.warn) {
          z.fired = true; Snd.play('zap');
          td.sparks(z.x, z.y, 4, '#bfefff', 10); Q.shake = Math.max(Q.shake, .25);
          if (Math.hypot(bull.x - z.x, bull.y - z.y) < Z.hit) core.hurtBull(1, 'vessel');
          for (const e of R.td.enemies) if (!e.dead && Math.hypot(e.x - z.x, e.y - z.y) < Z.hit + 4) td.kill(e, 'blast');
          emit('f48_zap', { i: v.i });
        }
        if (z.t >= Z.warn + .22) { v.zap = null; v.zapT = rr(...Z.every); }
      } else {
        v.zapT -= dt;
        if (v.zapT <= 0 && Math.hypot(bull.x - v.x, bull.y - (v.y - 20)) < Z.near) { v.zap = { x: bull.x, y: bull.y, t: 0, fired: false }; Snd.play('zapWarn'); }
      }
      v.spawnT -= dt;
      if (v.spawnT <= 0) {
        v.spawnT = rr(...P.spawn);
        if (R.td.enemies.length < F48.most) {
          const e = td.spawn('flyer', { x: v.x - 18, y: v.y + 8, vx: -60, vy: rr(-30, 30), pace: F48.pace[Q.panic], line: -1 });
          Snd.play('animate'); td.sparks(v.x - 14, v.y, 12, '#8fe3ff', 8);
        }
      }
    }
  }
  // the shield goes up and the vessels wake; `calm`: they hold fire until the last line's laser has passed (the
  // second line going down), otherwise (a continue at the last line) they turn on him at once
  function startReactor(calm) {
    const Rc = Q.reactor;
    Rc.st = 'on'; Rc.t = 0; Rc.calm = !!calm; Rc.calmT = 0;
    for (const v of Rc.vessels) v.flash = .3;
    say('REDUNDANCY ENGAGED.', 2);
    Snd.play('surge'); Snd.play('shieldUp');
    core.live('The last loom is shielded. Two reaction vessels in the dispatch bay power it: burst them both.');
    emit('f48_reactor', { t: R.t });
    if (!calm) wake();
  }
  function wake() {
    const P = F48.reactor;
    for (const v of Q.reactor.vessels) { v.zapT = rr(...P.zap.first); v.spawnT = rr(...P.spawn) * .5; v.flash = .3; }
    R.banner = { text: 'BURST THE VESSELS', sub: 'THEY POWER THE SHIELD', t: 0, dur: 2.2, top: true, col: '#8fe3ff' };
    Snd.play('zapWarn');
    emit('f48_wake', { t: R.t });
  }
  function hurtVessel(v, dmg, by) {
    if (v.dead || Q.st !== 'fight') return;
    // dormant, its own shield takes it
    if (Q.reactor.st !== 'on') { v.ping = .25; td.sparks(v.x, v.y - 30, 18, '#8fe3ff', 4); if (Q.hitSnd <= 0) { Snd.play('shieldHit'); Q.hitSnd = .08; } return; }
    v.hp -= dmg; v.flash = .08;
    if (Q.hitSnd <= 0) { Snd.play('machineHit'); Q.hitSnd = .05; }
    if (v.hp <= 0) burstVessel(v, by);
  }
  function burstVessel(v, by) {
    const P = F48.reactor; v.dead = true; v.hp = 0;
    boom(v.x, v.y, 1.5); Snd.play('tankBurst'); Snd.play('machineBreak');
    R.freeze = Math.max(R.freeze, .1); Q.shake = Math.max(Q.shake, .8); R.white = Math.max(R.white || 0, .06);
    td.blast(v.x, v.y, P.blast, 'blast');
    Q.chain.push({ t: F48.chainDelay, x: v.x, y: v.y, r: P.blast, dmg: 6, from: null, props: true });
    soulsFrom(v.x, v.y - 30, P.souls, 'vessel', by === 'chain' ? 'chain' : by);
    link(by, v.x, v.y);
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, sp = 60 + Math.random() * 160; R.td.fx.push({ k: 'debris', x: v.x, y: v.y, h: 10 + Math.random() * 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, vh: 60 + Math.random() * 140, s: 2 + Math.round(Math.random() * 3), r: 0, vr: (Math.random() - .5) * 20, col: ['#8fe3ff', '#bfefff', '#c9962e', '#1a3a4a'][i % 4], t: 0, dur: .9 + Math.random() * .6 }); }
    emit('f48_vessel', { i: v.i, by });
    if (Q.reactor.vessels.every(x => x.dead)) shieldDown();
    else core.popText('ONE MORE', td.screenOf(v.x, v.y - 60).x / 2, td.screenOf(v.x, v.y - 60).y / 2, '#8fe3ff');
  }
  function shieldDown() {
    Q.reactor.st = 'down'; Q.reactor.t = 0;
    const lm = lastLoom();
    if (lm) { boom((lm.x0 + lm.x1) / 2, lm.y1, 1.2); for (let i = 0; i < 16; i++) R.td.fx.push({ k: 'spark', x: (lm.x0 + lm.x1) / 2 + fxr(-40, 40), y: lm.y1, h: 10 + Math.random() * 50, vx: fxr(-120, 120), vy: fxr(-40, 40), vh: fxr(20, 120), col: i % 2 ? '#8fe3ff' : '#ffffff', t: 0, dur: .5 }); }
    R.banner = { text: 'SHIELD DOWN', sub: 'THE LOOM IS OVERLOADING', t: 0, dur: 2, top: true, col: '#ff7a2a' };
    Snd.play('shieldDown'); Q.shake = Math.max(Q.shake, .6);
    core.live('Shield down. The last loom is overloading.');
    emit('f48_shield_down', { t: R.t });
  }

  // ---------- the canister cart ----------
  function stepCart(dt) {
    const P = F48.cart;
    if (!Q.cart) {
      Q.cartNext -= dt;
      if (Q.cartNext <= 0 && Q.cartN < F48.quota.carts) { Q.cartN++; const dir = Q.cartN % 2 ? 1 : -1; Q.cart = { x: dir > 0 ? -30 : F48.world.w + 30, dir, full: true, t: 0, rattle: 0 }; Q.cartNext = P.every; emit('f48_cart', { n: Q.cartN }); }
      return;
    }
    const c = Q.cart; c.t += dt; c.x += c.dir * P.speed * dt;
    c.rattle -= dt; if (c.rattle <= 0) { c.rattle = .32; if (Math.abs(c.x - bull.x) < 300 && Math.abs(P.y - bull.y) < 240) Snd.play('cart'); }
    if (c.x < -40 || c.x > F48.world.w + 40) Q.cart = null;
  }
  const cartHit = (x, y) => Q.cart && Q.cart.full && Math.abs(x - Q.cart.x) < 22 && y > F48.cart.y - 20 && y < F48.cart.y + 8;
  // a hit on the cart: the first canister goes, and the rest go one after another down the cart (a chain)
  function hitCart(by) {
    const c = Q.cart, P = F48.cart; if (!c || !c.full) return;
    c.full = false;
    for (let k = 0; k < P.load; k++) {
      const x = c.x + (k - (P.load - 1) / 2) * 9 * -c.dir;
      if (k === 0) cartPop(x, P.y, by); else Q.chain.push({ t: P.gap * k, cart: true, x, y: P.y, r: P.blast, dmg: 6, from: null, props: true });
    }
    dropPower(nextPower(), c.x, P.y - 24);
    emit('f48_cart_hit', { by });
  }
  function cartPop(x, y, by) {
    const P = F48.cart;
    boom(x, y, .8); Snd.play('tankBurst'); Q.shake = Math.max(Q.shake, .35);
    td.blast(x, y, P.blast, 'blast');
    soulsFrom(x, y - 10, P.souls, 'cart', by === 'chain' ? 'chain' : by);
    link(by, x, y);
    for (let i = 0; i < 8; i++) { const a = Math.random() * 6.28, sp = 40 + Math.random() * 110; R.td.fx.push({ k: 'debris', x, y, h: 8 + Math.random() * 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .6, vh: 50 + Math.random() * 100, s: 2 + Math.round(Math.random() * 2), r: 0, vr: (Math.random() - .5) * 20, col: ['#4a8aa8', '#bfefff', '#c9962e'][i % 3], t: 0, dur: .8 + Math.random() * .5 }); }
  }

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
      R.banner = { text: Q.panic === 1 ? 'PRODUCTION PANIC' : 'LAST LINE', sub: Q.panic === 1 ? 'THE OTHER LINES SPEED UP' : 'ITS LOOM IS SHIELDED', t: 0, dur: 2, top: true, col: Q.panic > 1 ? '#ff5a4a' : '#ffd44a' };
      core.bark(Q.panic === 1 ? 'f48line' : 'f48panic');
      if (!Q.qc) Q.qcPending = { t: F48.qc.delay, n: Q.panic - 1 };
      // the last line: its loom shielded at once (so it can't be finished off under the laser), the vessels awake but
      // holding fire until the laser has passed (owner, Oct 14: "split it")
      if (Q.panic === 2) startReactor(true);   // no checkpoint here: a continue restarts the whole floor (item 26)
    } else startCollapse();
  }

  // ---------- production ----------
  function stepLines(dt) {
    const p = Q.panic, speed = F48.belt[p];
    for (let i = 0; i < 3; i++) {
      if (!live(i)) continue;
      const rev = Q.reverse[i] > 0, bs = rev ? -speed * 1.2 : speed;
      Q.beltOff[i] += bs * dt;
      // a new spool of thread leaves the spinner
      if (Q.t >= F48.firstAt || Q.items[i].length < 2) {
        Q.next[i] -= dt * F48.rate[p] * (Q.feedCut[i] ? F48.feed.starve : 1) * (rev ? 0 : 1) * (Q.reactor && Q.reactor.st === 'on' ? F48.reactor.rush : 1);
        if (Q.next[i] <= 0) { Q.items[i].push({ x: F48.parts[1][1] + F48.parts[1][2], kind: 'thread' }); Q.next[i] = F48.make[i] * rr(.85, 1.15); }
      }
      const lm = loomOf(i), pr = Q.machines.find(m => m.line === i && m.kind === 'press'), an = Q.machines.find(m => m.line === i && m.kind === 'animator');
      const full = R.td.enemies.length >= F48.most;
      Q.items[i].sort((a, b) => b.x - a.x);
      let ahead = Infinity;
      for (const it of Q.items[i]) {
        // rugs queue at the end of the belt while the floor is full
        const stop = Math.min(F48.beltEnd, ahead - 20);
        it.x = rev ? Math.max(F48.parts[1][1] + F48.parts[1][2], it.x + bs * dt) : Math.min(stop, it.x + speed * dt);
        ahead = it.x;
        if (it.kind === 'thread' && it.x > (lm.x0 + lm.x1) / 2) it.kind = 'rug';
        if (it.kind === 'rug' && it.x > (pr.x0 + pr.x1) / 2) it.kind = 'rug2';
        if (!it.zapped && it.x > (an.x0 + an.x1) / 2) { it.zapped = true; it.limp = !powered(i); if (!it.limp) { an.zap = .25; Snd.play('animate'); } }
        if (it.x >= F48.beltEnd && (!full || it.limp) && Q.t >= F48.firstAt) { it.gone = true; if (it.limp) limpRug(i); else launch(i); }
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
  // a dead rug off an unpowered line: it slumps off the end, and the soul in it goes free
  function limpRug(i) {
    const x = F48.beltEnd + 10, y = LINES[i].y;
    R.td.fx.push({ k: 'debris', x, y, h: 8, vx: 50, vy: rr(-10, 10), vh: 30, s: 8, r: 0, vr: 2, col: '#7a1d1a', t: 0, dur: 1.4 });
    for (let k = 0; k < F48.power.souls; k++) { const s = td.screenOf(x, y); if (quotaPays('limp', 'power', s.x / 2, s.y / 2)) soulsFrom(x, y, 1, 'limp', 'power'); }
    emit('f48_limp', { line: i });
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
    Q.launches++;
    const shags = R.td.enemies.filter(e => e.kind === 'shag').length;
    let kind = kindOf(i) === 'armored' && (Q.made = (Q.made || 0) + 1) % 3 === 0 ? 'flyer' : kindOf(i);
    if (Q.panic >= 1 && Q.launches % F48.shagEvery === 0 && shags < F48.shagMost) kind = 'shag';
    const y = LINES[i].y, x = F48.beltEnd + 8;
    const e = td.spawn(kind, { x, y, vx: 70, vy: rr(-30, 30), pace: F48.pace[Q.panic], line: i });
    if (kind === 'roll') { e.vx = 30; e.spawning = .2; }
    if (kind === 'shag') { e.vx = 40; Snd.play('machineBreak'); emit('f48_shag'); }
    Snd.play('animate');
    R.events.made = (R.events.made || 0) + 1;
  }

  // ---------- the lines' hazards ----------
  // Each live line has its own, by what it makes: the Heavy line's crane hook sweeps the walkway below it (its lamp and a
  // dashed line warn first), the Standard line's spinner flings thread at him, and in the panic the Bulk line's belt runs
  // backwards for a while (its beacon and arrows warn first).
  function stepHazards(dt) {
    for (let i = 0; i < 3; i++) {
      // a cut power cable: p(Loom) splices it back with its thread after a while
      if (Q.powerCut[i] > 0) { Q.powerCut[i] -= dt; if (Q.powerCut[i] <= 0) { Q.powerCut[i] = 0; Q.patched[i]++; if (live(i)) { Snd.play('rideHook'); const pw = powerSeg(i); for (let k = 0; k < 8; k++) R.td.fx.push({ k: 'spark', x: pw.x0, y: (pw.y0 + pw.y1) / 2, h: 4, vx: fxr(-60, 60), vy: fxr(-30, 30), vh: fxr(20, 60), col: '#ff7a2a', t: 0, dur: .4 }); emit('f48_splice', { line: i }); } } }
      if (!live(i)) { Q.crane[i].st = 'idle'; Q.reverse[i] = 0; continue; }
      const k = kindOf(i);
      if (k === 'armored') {
        const c = Q.crane[i], C8 = F48.crane, hy = LINES[i].y + C8.dy;
        if (c.st === 'idle') { c.next -= dt; if (c.next <= 0) { c.st = 'warn'; c.t = 0; c.dir = bull.x < 400 ? -1 : 1; c.x = c.dir > 0 ? 40 : 760; Snd.play('warn'); emit('f48_crane'); } }
        else if (c.st === 'warn') { c.t += dt; if (c.t >= C8.warn) { c.st = 'sweep'; c.t = 0; Snd.play('roll'); } }
        else if (c.st === 'sweep') {
          c.x += c.dir * C8.speed * dt;
          if (Math.abs(bull.x - c.x) < C8.hit && Math.abs(bull.y - hy) < C8.hit + 2 && core.hurtBull(1, 'crane')) { bull.kx = c.dir * 160; bull.ky = (bull.y < hy ? -1 : 1) * 80; }
          for (const e of R.td.enemies) if (!e.dead && Math.abs(e.x - c.x) < 14 && Math.abs(e.y - hy) < 14) td.kill(e, 'crane');
          if (c.x < 20 || c.x > 780) { c.st = 'idle'; c.next = rr(...C8.every) / F48.rate[Q.panic]; }
        }
      } else if (k === 'flyer') {
        const f = Q.fling[i], sp = partOf(i, 'spinner');
        if (sp.dead) continue;
        const sx = (sp.x0 + sp.x1) / 2, sy = (sp.y0 + sp.y1) / 2, d = Math.hypot(bull.x - sx, bull.y - sy);
        if (f.tell > 0) {
          f.tell -= dt;
          if (f.tell <= 0) {
            const a = Math.atan2(bull.y - sy, bull.x - sx), n = Q.panic ? 2 : 1;
            for (let j = 0; j < n; j++) td.flingThread(sx, sy, 20, a + (n > 1 ? (j - .5) * .35 : 0));
            Snd.play('bobbin'); f.next = rr(...F48.fling.every) / F48.rate[Q.panic];
          }
        } else { f.next -= dt; if (f.next <= 0 && d < F48.fling.range) { f.tell = F48.fling.tell; Snd.play('rev'); } }
      } else if (k === 'roll' && Q.panic >= 1) {
        if (Q.reverse[i] > 0) { Q.reverse[i] -= dt; if (Q.reverse[i] <= 0) Q.reverseT[i] = F48.reverse.every; }
        else { Q.reverseT[i] -= dt; if (Q.reverseT[i] <= 0) { Q.reverse[i] = F48.reverse.dur; Snd.play('pull'); emit('f48_reverse'); } }
      }
    }
  }
  const reverseWarn = i => Q.reverse[i] <= 0 && kindOf(i) === 'roll' && Q.panic >= 1 && live(i) && Q.reverseT[i] < F48.reverse.warn;

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

  // ---------- the collapse, the whip and p(Loom) ----------
  // The factory comes apart: the soul main bursts, and two of its souls come to the blaster (a bell each, D5 then F5; the
  // roof completes the chord with A5). The back wall cracks open on the reserve, a row of glass tanks of captured souls,
  // and for a few seconds the two soul streams are a whip: everything a stream sweeps across in the reserve cracks open
  // and its souls go free, and the more he cracks, the further the streams bend in toward each other. Then p(Loom)'s beat,
  // with no control: the camera goes up to the wall, its eye opens there, it says its line, its threads come down to the
  // gun, the streams snap apart on a sour chord, it pulls the two souls up its threads, they tear free, come down to him,
  // salute and rise; the eye shuts, white, the lobby.
  function startCollapse() {
    Q.st = 'collapse'; R.phase = 'boss';
    Q.qc = null; Q.qcPending = null; endCombo();
    const F = F48.collapse;
    Q.collapse = { t: 0, n: 0, phase: 'quake', open: 0, whipT: 0, cracked: 0, pt: 0, fired: 0,
      reserve: Array.from({ length: F.reserve }, (_, i) => ({ i, x: 76 + i * (648 / (F.reserve - 1)), hp: F.reserveHp, broken: false, flash: 0, hitT: 0 })) };
    td.clearThreats('collapse');
    R.td.pickups = [];
    Q.chain = Q.chain.filter(c => c.cascade);
    Snd.play('lineDown'); Snd.play('rumble', 4);
    R.banner = { text: 'LINES DOWN', sub: 'RECLAMATION OFFLINE', t: 0, dur: 1.8, top: true, col: '#ff5a4a' };
    core.live('The factory is coming apart.');
    // the soul main bursts: the souls inside go up through the roof (counted once, here)
    soulsFrom(30, 220, 12, 'main', 'collapse');
    for (let i = 0; i < 40; i++) R.fx.push({ k: 'rise', x: fxr(8, 40), y: fxr(40, 130), vy: -fxr(30, 60), ph: Math.random() * 6, t: -i * .05, dur: 4 });
    emit('f48_collapse', { t: R.t });
  }
  // where the eye opens: on the wall straight above him
  // p(Loom)'s beat is framed on him: the camera goes up toward the back wall only as far as keeps him on screen (he
  // stands clear of the readout along the bottom), and the eye opens at the top of that frame: on the wall when he's
  // near it, in the smoke over him when he's further down the room (owner, Oct 14: he could end up off screen)
  const ploomCamY = () => clamp(bull.y - (H - 48), 0, F48.world.h - H);
  const eyeAt = () => ({ x: clamp(bull.x, 140, 660), y: ploomCamY() + 30 });
  // a stream (the ribbon from one of its shots to the next) sweeping through a reserve tank cracks it
  function whipSweep() {
    const C = Q.collapse, ribbons = [];
    for (const side of new Set(R.shots.filter(x => x.soul).map(x => x.side))) {
      const list = R.shots.filter(x => x.soul && x.side === side && !x.dead).sort((a, b2) => a.t - b2.t);
      for (let k = 1; k < list.length; k++) ribbons.push({ x0: list[k - 1].x, y0: list[k - 1].y - list[k - 1].h, x1: list[k].x, y1: list[k].y - list[k].h });
    }
    for (const tk of C.reserve) {
      if (tk.broken || tk.hitT > 0) continue;
      if (ribbons.some(r => segDist(r, tk.x, 44) < 12)) {
        tk.hp--; tk.flash = .1; tk.hitT = .12; Snd.play('machineHit');
        if (tk.hp <= 0) crackReserve(tk);
      }
    }
  }
  function crackReserve(tk) {
    const C = Q.collapse, F = F48.collapse;
    tk.broken = true; C.cracked++;
    Snd.play('tankBurst'); Q.shake = Math.max(Q.shake, .3);
    for (let k = 0; k < 10; k++) R.td.fx.push({ k: 'spark', x: tk.x + fxr(-8, 8), y: 58, h: 14 + fxr(0, 10), vx: fxr(-80, 80), vy: fxr(0, 60), vh: fxr(20, 90), col: k % 2 ? '#bfefff' : '#ffffff', t: 0, dur: .5 });
    soulsFrom(tk.x, 66, F.reserveSouls, 'reserve', 'stream');
    R.td.bend = F.bendMax * C.cracked / F.reserve;
    emit('f48_crack', { n: C.cracked });
  }
  function stepCollapse(dt) {
    const C = Q.collapse, F = F48.collapse, P = F48.ploom; C.t += dt;
    const t = C.t;
    if (C.phase !== 'ploom') Q.shake = Math.max(Q.shake, t < 1.6 ? .35 : .1);
    // debris falling from the ceiling (drawn only)
    Q.debrisT -= dt;
    if (Q.debrisT <= 0 && (C.phase !== 'ploom' || C.pt < P.white)) { Q.debrisT = C.phase === 'whip' ? .16 : .08; R.td.fx.push({ k: 'debris', x: R.td.cam.x + Math.random() * W, y: R.td.cam.y + 60 + Math.random() * (H - 70), h: 160 + Math.random() * 60, vx: 0, vy: 0, vh: -40, s: 3 + Math.round(Math.random() * 5), r: 0, vr: (Math.random() - .5) * 12, col: ['#7a7288', '#5a5266', '#8a6a3a', '#9a93a6'][Math.floor(Math.random() * 4)], t: 0, dur: 2.2 }); }
    // the back wall cracks open on the reserve
    if (t > .5) C.open = Math.min(1, C.open + dt * 2.5);
    for (const tk of C.reserve) { tk.flash = Math.max(0, tk.flash - dt); tk.hitT = Math.max(0, tk.hitT - dt); }
    // the two souls come to the gun, one at a time
    if (C.n < F.souls && t >= F.firstSoul + C.n * F.soulEvery) {
      const sc = td.screenOf(30, 200);
      Q.souls.push({ i: C.n, x0: sc.x, y0: sc.y, t: 0, dur: .6 });
      C.n++;
    }
    for (const sl of Q.souls) if (!sl.landed) { sl.t += dt; if (sl.t >= sl.dur) { sl.landed = true; R.td.streams = sl.i + 1; R.gold = true; Snd.play('bell', sl.i); Snd.duck(1); R.shake = Math.max(R.shake, .05); emit('f48_soul', { n: sl.i + 1 }); } }
    if (C.phase === 'quake' && Q.souls.length === F.souls && Q.souls.every(x => x.landed)) {
      C.phase = 'whip'; C.whipT = 0;
      R.banner = { text: 'CRACK THE RESERVE', t: 0, dur: 2.4, pull: true, col: '#ffd44a' };
      core.live('Sweep the soul streams across the reserve tanks on the back wall to crack them open.');
      Snd.factoryCue('fuse', { seconds: F.whip });
      emit('f48_whip');
    }
    if (C.phase === 'whip') {
      C.whipT += dt;
      whipSweep();
      if (C.cracked >= F.reserve || C.whipT >= F.whip) startPloom();
    }
    if (C.phase === 'ploom') stepPloom(dt);
  }
  function startPloom() {
    const C = Q.collapse;
    C.phase = 'ploom'; C.pt = 0; R.td.locked = true; R.banner = null;
    const E = eyeAt(); C.eye = E;
    R.td.camHold = { x: clamp(bull.x - W / 2, 0, F48.world.w - W), y: ploomCamY() };
    Snd.music(null, { hard: true }); Snd.play('dark');
    emit('f48_ploom', { t: R.t, cracked: C.cracked });
  }
  function stepPloom(dt) {
    const C = Q.collapse, P = F48.ploom, was = C.pt; C.pt += dt;
    const pt = C.pt, at = k => was < k && pt >= k, E = C.eye, mz = td.muzzle();
    // he keeps firing the streams up at the eye until they snap, bending in all the way
    if (pt < P.snap) {
      const dx = E.x - bull.x, dy = E.y - bull.y, d = Math.hypot(dx, dy) || 1; bull.ax = dx / d; bull.ay = dy / d; bull.dir = 'up';
      R.td.bend = Math.min(F48.collapse.bendMax, R.td.bend + dt * .3);
      C.fired -= dt; if (C.fired <= 0) { C.fired = .09; td.fire(); }
    } else if (pt < P.snap + .35) { C.fired -= dt; if (C.fired <= 0) { C.fired = .09; td.fire(); } }
    else if (R.td.streams) { R.td.streams = 0; R.td.scatter = 0; R.td.bend = 0; R.gold = false; }
    Q.eye = pt < P.eye ? 0 : pt < P.close ? Math.min(1, (pt - P.eye) / .45) : Math.max(0, 1 - (pt - P.close) / .3);
    if (at(P.say)) say('NOT ON MY FLOOR.', P.yank - P.say + .6);
    if (pt >= P.threads && pt < P.free) Q.threads = Math.min(1, (pt - P.threads) / (P.snap - P.threads));
    if (at(P.snap)) { Snd.factoryCue('spoil'); R.td.scatter = 1; R.td.bend = 0; Q.shake = Math.max(Q.shake, .6); R.white = .06; emit('f48_spoil', { t: R.t }); }
    // the souls: pulled out of the gun and up the threads, then tearing free
    if (at(P.snap + .3)) C.yank = [0, 1].map(i => ({ i, x: mz.x, y: mz.y - mz.h }));
    if (C.yank && pt < P.free) { const k = Math.min(1, (pt - P.snap - .3) / (P.yank - P.snap - .3)) * .55; for (const sl of C.yank) { sl.x = mz.x + (E.x + (sl.i - .5) * 30 - mz.x) * k; sl.y = mz.y - mz.h + (E.y + 30 - (mz.y - mz.h)) * k; } }
    if (at(P.free)) { Q.threads = 0; Snd.play('snap'); Snd.play('bell', 1); Q.shake = Math.max(Q.shake, .3);
      for (const sl of C.yank) for (let k = 0; k < 8; k++) R.td.fx.push({ k: 'spark', x: sl.x, y: sl.y + 20, h: 20, vx: fxr(-70, 70), vy: fxr(-30, 30), vh: fxr(10, 60), col: k % 2 ? '#ffd060' : '#ff7a2a', t: 0, dur: .4 }); }
    if (C.yank && pt >= P.free) for (const sl of C.yank) {
      const tx = bull.x + (sl.i - .5) * 26, ty = bull.y - 40;
      if (pt < P.rise) { sl.x += (tx - sl.x) * Math.min(1, dt * 7); sl.y += (ty - sl.y) * Math.min(1, dt * 7); sl.salute = pt >= P.salute; }
      else { sl.salute = false; sl.y -= (40 + (pt - P.rise) * 90) * dt; sl.x += (sl.i - .5) * 12 * dt; }
    }
    if (pt >= P.white && R.phase !== 'win') {
      // the floor's clear card, over the wreck with the souls going up; its button whites out into the lobby (afterClear)
      R.phase = 'win'; R.endT = R.t; emit('f48_clear', { amount: R.t }); endRun('clear');
    }
  }
  // the clear card (owner, Oct 13: "we need an end level card for sure before the lobby")
  function clearCard(extra, best, clock) {
    const ev = R.events, C = Q.collapse;
    const rows = [['Souls freed', String(R.souls)], ['Time', clock(R.endT)], ['Machines wrecked', String(ev.broken || 0)], ['Clutter smashed', String(ev.props || 0)],
      ['Cables cut', String(ev.cuts || 0)], ['Bobbins sent back', String(ev.deflects || 0)], ['Reserve cracked', (C ? C.cracked : 0) + ' / ' + F48.collapse.reserve], ['Biggest chain', Q.bestChain ? 'x' + Q.bestChain : '–']];
    if (R.continues) rows.push(['Continues', String(R.continues)]);
    rows.push(['Best', best.souls + ' souls']);
    return { title: 'The 48th Floor clear', text: (extra.newBest ? 'New best! ' : '') + 'The factory is down and its souls are free.', rows,
      note: 'RECLAMATION, 48TH FLOOR: OUT OF SERVICE.', go: 'Take the elevator', alt: 'Play again' };
  }
  // p(Loom)'s readout along the bottom, in its machine blips
  function say(text, dur) { core.talk(text, 'loom'); Object.assign(R.talk, { readout: true, speaker: 'ploom', total: dur }); }

  // ---------- the lobby ----------
  // Side on: the arena's bull in an immaculate elevator lobby, the Rugfather's portrait on the wall. He walks in singed,
  // passes the portrait, the car arrives (DING), the doors open on the operator, Please Hold, and he walks in.
  function startLobby(direct) {
    Q.st = 'lobby'; R.phase = 'lobby'; R.td.locked = true; R.td.camHold = null; Q.white = direct ? 0 : 1;
    Q.lobby = lobby.start(R, bull);
    R.gold = false; R.td.streams = 0;
    core.setCheckpoint({ stage: 'floor48', souls: R.souls, continues: R.continues, down: [true, true, true], lobby: true, seedState: core.seedState(), runSeed: core.runSeed() });
    emit('f48_lobby', { t: R.t });
  }
  function stepLobby(dt) {
    if (!lobby.step(dt)) return;
    R.phase = 'win';
    core.travel('elevator', { fight: true, from: 48, destination: { floor: 99, label: 'R', stage: 'roof' } });
  }

  // ---------- the soul quota ----------
  // Whether a soul from what the floor keeps making still pays: true while the quota has room (and counts it). A kill past
  // it pays nothing, and every few such kills pop a grey UNPAID where they died. The collapse's carpshits always pay.
  function quotaPays(source, by, x, y) {
    if (by === 'collapse' || Q.st !== 'fight' || !['carpshit', 'roll', 'limp'].includes(source)) return true;
    const Z = F48.quota;
    if (Q.quota < Z.souls) {
      if (++Q.quota === Z.souls) { Q.quotaAt = Q.t; say('QUOTA MET. OVERTIME IS UNPAID.', 3); emit('f48_quota'); }
      return true;
    }
    if (Q.unpaid++ % Z.unpaidEvery === 0 && x != null) core.popText('UNPAID', x, y - 6, '#8a8494');
    emit('f48_unpaid', { source });
    return false;
  }

  // ---------- the tick ----------
  function update(dt) {
    if (R.phase === 'win') return;
    if (R.phase === 'dead') { td.stepFx(dt); stepFx(dt); updateFx(dt); if (R.phaseT > F48.deadWait) endRun('rugged'); return; }
    if (Q.st === 'lobby') { stepLobby(dt); return; }
    Q.t += dt;
    if (!Q.started && Q.t >= F48.firstAt) { Q.started = true; Snd.factoryCue('fight', { candidate: Q.music }); if (Q.panic === 1) Snd.factoryCue('panic', { candidate: Q.music }); else if (Q.panic === 2) Snd.factoryCue('heavy', { candidate: Q.music }); emit('f48_fight'); }
    if (Q.t > 4.4 && !Q.events.said) { Q.events.said = true; core.bark('f48start'); }
    if (Q.t > 1 && !Q.events.pa && Q.panic === 0) { Q.events.pa = true; say('RECLAMATION IS AHEAD OF SCHEDULE.', 2.6); }
    if (Q.st === 'fight') {
      stepLines(dt); stepHazards(dt); stepChain(dt); stepCues(); stepQC(dt); stepCombo(); stepReactor(dt); stepCart(dt);
      // the overloading loom throws sparks (drawn only)
      const lm = Q.panic === 2 && Q.machines.find(overloaded);
      if (lm && Math.random() < dt * 14) { const x = lm.x0 + Math.random() * (lm.x1 - lm.x0); R.td.fx.push({ k: 'spark', x, y: lm.y1, h: 10 + Math.random() * lm.H, vx: fxr(-70, 70), vy: fxr(-20, 30), vh: fxr(20, 90), col: Math.random() < .5 ? '#ffd060' : '#ff7a2a', t: 0, dur: .4 }); }
    } else if (Q.st === 'collapse') { stepChain(dt); stepCollapse(dt); if (Q.st === 'lobby') return; }
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
    if (Q.collapse && Q.collapse.open > 0) drawReserve(t);
    for (let i = 0; i < 3; i++) {
      S.belt(g, F48.lineX0, F48.beltEnd + 6, LINES[i].y, F48.bedH, Q.beltOff[i], !live(i));
      for (const it of Q.items[i]) S.item(g, it, LINES[i].y, null);
      // the Bulk line running backwards (or about to): chevrons along the belt, pointing the way it's going
      if (Q.reverse[i] > 0 || reverseWarn(i)) {
        const on = Q.reverse[i] > 0 || Math.floor(t * 8) % 2, col = Q.reverse[i] > 0 ? '#ff5a4a' : '#ffd44a';
        if (on) for (let x = F48.lineX0 + 20; x < F48.beltEnd - 10; x += 44) for (let k = 0; k < 4; k++) { rect(g, x + k, LINES[i].y - 4 + k, 1, 1, col); rect(g, x + k, LINES[i].y + 4 - k, 1, 1, col); }
      }
      drawCables(i, t);
      const pr = Q.machines.find(m => m.line === i && m.kind === 'press'); S.pressShadow(g, pr, LINES[i].y, F48.bedH);
      // the dispatch chute at the end of each line
      rect(g, F48.beltEnd + 4, LINES[i].y - 13, 14, 26, '#0c0a10'); rect(g, F48.beltEnd + 5, LINES[i].y - 12, 12, 24, '#1a1820');
      for (let k = 0; k < 4; k++) rect(g, F48.beltEnd + 6, LINES[i].y - 10 + k * 6, 10, 2, '#2a2830');
    }
    drawRail();
    // the machines, him, the carpshits and the beacons, by where they touch the floor
    const list = [];
    for (const v of standing()) list.push({ y: v.y, draw: () => drawVessel(v, t) });
    if (Q.cart) list.push({ y: F48.cart.y, draw: () => drawCart(Q.cart) });
    for (const m of Q.machines) list.push({ y: m.y1, draw: () => drawMachine(m, t) });
    for (const pr of Q.props) list.push({ y: pr.y1, draw: () => drawProp(pr) });
    for (let i = 0; i < 3; i++) list.push({ y: LINES[i].y + 20, draw: () => S.beacon(g, F48.beltEnd + 26, LINES[i].y + 20, t, Q.panic, null) });
    for (const d of td.drawables()) list.push(d);
    for (let i = 0; i < 3; i++) if (Q.crane[i].st !== 'idle') list.push({ y: LINES[i].y + F48.crane.dy + 1, draw: () => drawCrane(i, t) });
    list.sort((a, b) => a.y - b.y);
    for (const d of list) { if (d.draw) d.draw(); else { const save = R.td.fx; R.td.fx = [d.fx]; td.drawFx('lit'); R.td.fx = save; } }
    // smoke and puffs over everything on the floor
    const save = R.td.fx; R.td.fx = save.filter(f => f.k === 'smoke' || f.k === 'puff'); td.drawFx('lit'); R.td.fx = save;
    g.restore();
    // the panic's light: amber, then red, pulsing
    if (Q.panic && Q.st === 'fight') { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = Q.panic > 1 ? .14 + (Math.floor(t * 3) % 2 ? .08 : 0) : .08; rect(g, 0, 0, W, H, Q.panic > 1 ? '#ff3a2a' : '#ffb040'); g.restore(); }
    if (Q.st === 'collapse') { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = .2 + (Math.floor(t * 4) % 2 ? .06 : 0); rect(g, 0, 0, W, H, '#ff3a2a'); g.restore(); }
  };
  // The cables: the soul feed (a glass hose with souls in it, from the main to the tank) and the power cable (a thick
  // black cable with a yellow stripe, from the animator down to its junction box); cut, their ends lie frayed and
  // sparking. Each live one wears the katana mark (drawn in the glow, cueMarks).
  function drawCables(i, t) {
    const f = feedSeg(i), pw = powerSeg(i);
    if (!Q.feedCut[i]) { rect(g, f.x0, f.y0 - 3, f.x1 - f.x0, 6, '#0c0a10'); rect(g, f.x0, f.y0 - 2, f.x1 - f.x0, 4, '#1d3a48'); rect(g, f.x0, f.y0 - 2, f.x1 - f.x0, 1, '#4a8aa8'); }
    else { rect(g, f.x0, f.y0 - 2, 10, 4, '#1d3a48'); rect(g, f.x1 - 10, f.y0 - 2, 10, 4, '#1d3a48'); }
    // the junction box on the walkway, and the cable
    rect(g, pw.x0 - 7, pw.y1 - 2, 14, 10, '#0c0a10'); rect(g, pw.x0 - 6, pw.y1 - 1, 12, 8, Q.powerCut[i] ? '#3a3640' : '#e8b030'); rect(g, pw.x0 - 4, pw.y1 + 1, 8, 1, '#1a1418');
    if (powered(i)) { rect(g, pw.x0 - 2, pw.y0, 4, pw.y1 - pw.y0, '#0c0a10'); rect(g, pw.x0 - 1, pw.y0, 2, pw.y1 - pw.y0, '#2a2630'); for (let y = pw.y0 + 2; y < pw.y1; y += 6) rect(g, pw.x0 - 1, y, 2, 2, '#e8b030');
      // p(Loom)'s splice: orange thread wound round the cut
      if (Q.patched[i]) { const my = Math.round((pw.y0 + pw.y1) / 2); for (let k = 0; k < 4; k++) rect(g, pw.x0 - 3, my - 3 + k * 2, 6, 1, k % 2 ? '#ffd060' : '#ff7a2a'); } }
    else if (Q.powerCut[i] > 0) { rect(g, pw.x0 - 2, pw.y0, 4, 8, '#0c0a10'); rect(g, pw.x0 - 2, pw.y1 - 10, 4, 8, '#0c0a10'); }
  }
  // the katana mark: a red diamond with a white blade across it over everything only the katana handles, pulsing; when
  // he's close enough to reach one, it says SLASH!
  function katanaMark(x, y, near, t) {
    const p = Math.floor(t * 4) % 2, r = near ? 6 : 5;
    g.fillStyle = '#1a0606'; g.beginPath(); g.moveTo(x, y - r - 1); g.lineTo(x + r + 1, y); g.lineTo(x, y + r + 1); g.lineTo(x - r - 1, y); g.closePath(); g.fill();
    g.fillStyle = near || p ? '#ff3a2a' : '#a8261e'; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r, y); g.lineTo(x, y + r); g.lineTo(x - r, y); g.closePath(); g.fill();
    core.line(g, x - 3, y + 3, x + 3, y - 3, '#ffffff'); rect(g, x - 4, y + 3, 2, 2, '#ffd44a');
    if (near) { const label = 'SLASH!'; rect(g, Math.round(x - 14), Math.round(y - r - 13), 28, 9, '#1a0606'); txt(g, label, Math.round(x - textWidth(label) / 2), Math.round(y - r - 11), p ? '#ffffff' : '#ff6a5a', 1); }
  }
  function cueMarks(t) {
    if (Q.st !== 'fight') return;
    const reach = (x, y) => Math.hypot(x - bull.x, y - bull.y) < F48.cue;
    for (const c of cables()) { const x = (c.x0 + c.x1) / 2, y = (c.y0 + c.y1) / 2 - 4; katanaMark(x, y, segDist(c, bull.x, bull.y) < F48.cue, t); }
    for (const p of R.td.thrown) if (!p.dead && !p.friendly) { const x = p.x, y = p.y - p.h; g.strokeStyle = Math.floor(t * 10) % 2 ? '#ff3a2a' : '#ffd0c0'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 9, 0, 6.29); g.stroke(); }
    for (const e of R.td.enemies) if (e.kind === 'shag' && !(e.spawning > 0)) katanaMark(e.x, e.y - e.h - 30, reach(e.x, e.y), t);
  }
  // the crane: its rail over the walkway and the trolley with its hook; warning, a lamp and a dashed line along its path
  function drawCrane(i, t) {
    const c = Q.crane[i], hy = LINES[i].y + F48.crane.dy;
    if (!live(i) || kindOf(i) !== 'armored') return;
    if (c.st === 'warn' && Math.floor(t * 10) % 2) for (let x = 40; x < 770; x += 12) rect(g, x, hy, 6, 1, '#ff5a4a');
    if (c.st !== 'sweep') return;
    const x = Math.round(c.x);
    g.save(); g.globalAlpha = .4; g.fillStyle = '#07050a'; g.beginPath(); g.ellipse(x, hy + 2, 10, 4, 0, 0, 6.29); g.fill(); g.restore();
    rect(g, x - 1, hy - 46, 2, 34, '#5a5866'); rect(g, x - 9, hy - 50, 18, 6, '#0c0a10'); rect(g, x - 8, hy - 49, 16, 4, '#e8b030');
    rect(g, x - 6, hy - 14, 12, 4, '#0c0a10'); rect(g, x - 5, hy - 13, 10, 2, '#8a8494');
    rect(g, x - 2, hy - 10, 4, 8, '#8a8494'); rect(g, x + 2, hy - 4, 4, 3, '#8a8494'); rect(g, x + 5, hy - 7, 2, 4, '#8a8494');
  }
  // The reserve: the back wall's panels fall away (open 0..1) on a row of glass tanks full of captured souls, each on a
  // brass base; cracked, a jagged stub with its glass on the floor. Its souls shine in the glow (reserveGlow).
  function drawReserve(t) {
    const C = Q.collapse, k = C.open, top = 26, bot = F48.wallH - 2;
    rect(g, 40, top - 4, 720, (bot - top + 6) * k, '#07060a');
    for (let x = 40; x < 760; x += 9) { const j = S.hash(x, 3) * 6; rect(g, x, top - 6 + j * (1 - k), 9, 3, '#2b2834'); }
    for (const tk of C.reserve) {
      const x = Math.round(tk.x), h = Math.round((bot - top) * k);
      if (h < 4) continue;
      rect(g, x - 11, bot - 6, 22, 7, '#0c0a10'); rect(g, x - 10, bot - 5, 20, 5, '#6a4a18'); rect(g, x - 10, bot - 5, 20, 1, '#c9962e');
      if (tk.broken) { rect(g, x - 9, bot - 12, 18, 6, '#1d3a48'); for (let j = 0; j < 5; j++) rect(g, x - 9 + j * 4, bot - 15 + (j % 2) * 3, 2, 4, '#4a8aa8'); continue; }
      rect(g, x - 10, bot - h, 20, h - 5, tk.flash > 0 ? '#bfefff' : '#1d3a48'); rect(g, x - 8, bot - h + 2, 2, h - 9, '#4a8aa8');
      rect(g, x - 11, bot - h - 3, 22, 4, '#0c0a10'); rect(g, x - 10, bot - h - 2, 20, 2, '#c9962e');
    }
  }
  function reserveGlow(t) {
    const C = Q.collapse; if (!C || C.open < .5) return;
    for (const tk of C.reserve) {
      if (tk.broken) continue;
      for (let j = 0; j < 3; j++) { const x = Math.round(tk.x - 5 + ((j * 7 + t * 9 + tk.i * 3) % 10)), y = Math.round(32 + ((j * 6 + t * 7 + tk.i) % 16)); g.fillStyle = j % 2 ? '#ffd44a' : '#bfefff'; g.fillRect(x, y, 2, 3); }
      if (C.phase === 'whip') td.glow(tk.x, 42, 14, '#bfefff', .25);
    }
  }
  // p(Loom)'s eye on the wall: a dark socket that splits open on a burning orange eye, looking at him; and its threads
  function drawEye(t) {
    const C = Q.collapse; if (!C || !C.eye || Q.eye <= 0) return;
    const E = C.eye, k = Q.eye, rx = 30, ry = 15 * k, p = .5 + .5 * Math.sin(t * 8);
    td.glow(E.x, E.y, 70, '#ff7a2a', .5 * k);
    g.fillStyle = '#140806'; g.beginPath(); g.ellipse(E.x, E.y, rx + 4, ry + 4, 0, 0, 6.29); g.fill();
    g.fillStyle = '#ff7a2a'; g.beginPath(); g.ellipse(E.x, E.y, rx, ry, 0, 0, 6.29); g.fill();
    const lx = clamp((bull.x - E.x) * .03, -8, 8), ly = clamp((bull.y - E.y) * .02, -3, 3) * k;
    g.fillStyle = '#ffd060'; g.beginPath(); g.ellipse(E.x + lx, E.y + ly, 11 * k + 1, 11 * k, 0, 0, 6.29); g.fill();
    g.fillStyle = '#140806'; g.beginPath(); g.ellipse(E.x + lx, E.y + ly, (3 + p * 2) * k, (5 + p) * k, 0, 0, 6.29); g.fill();
    if (Q.threads > 0) {
      const mz = td.muzzle(), tx = mz.x, ty = mz.y - mz.h;
      for (let i = 0; i < 4; i++) {
        const sx = E.x + (i - 1.5) * 10, sy = E.y + ry * .6;
        g.strokeStyle = i % 2 ? '#ff7a2a' : '#ffd060'; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy);
        for (let q = 1; q <= 14; q++) { const u = q / 14 * Q.threads; g.lineTo(sx + (tx + (i - 1.5) * 4 - sx) * u + Math.sin(u * 12 + t * 26 + i) * 7 * (1 - u) * (1 - Q.threads * .6), sy + (ty - sy) * u); }
        g.stroke();
      }
      td.glow(tx, ty, 26, '#ff7a2a', .6);
    }
  }
  // a pallet stacked with rolled rugs, or a parts crate
  function drawProp(p) {
    if (p.dead) {
      // what's left: a scorch, glass, planks or scattered rugs
      g.save(); g.globalAlpha = .55; g.fillStyle = '#0c0a10'; g.beginPath(); g.ellipse((p.x0 + p.x1) / 2, p.y1 - 3, (p.x1 - p.x0) / 2 + 3, 4, 0, 0, 6.29); g.fill(); g.restore();
      const col = p.kind === 'canister' ? '#4a8aa8' : p.kind === 'pallet' ? '#a8261e' : p.kind === 'console' ? '#3a3640' : '#5a4632';
      for (let i = 0; i < 5; i++) rect(g, p.x0 + S.hash(p.id, i) * (p.x1 - p.x0), p.y1 - 6 + S.hash(i, p.id) * 5, 3, 1, col);
      return;
    }
    g.save(); drawPropLive(p); if (p.flash > 0) { g.globalCompositeOperation = 'lighter'; drawPropLive(p); } g.restore();
  }
  function drawPropLive(p) {
    if (p.kind === 'canister') {
      // a soul canister: a glass cylinder in a brass collar, souls glowing inside (in the glow), a hazard band
      const x = p.x0, y = p.y1, w = p.x1 - p.x0, top = y - p.H;
      g.save(); g.globalAlpha = .45; g.fillStyle = '#07050a'; g.beginPath(); g.ellipse(x + w / 2, y - 1, w / 2 + 2, 3, 0, 0, 6.29); g.fill(); g.restore();
      rect(g, x - 1, top - 1, w + 2, p.H + 1, '#0c0a10'); rect(g, x, top + 3, w, p.H - 6, '#1d3a48'); rect(g, x + 2, top + 4, 2, p.H - 9, '#4a8aa8');
      rect(g, x, top, w, 4, '#6a4a18'); rect(g, x, top, w, 1, '#c9962e'); rect(g, x, y - 4, w, 4, '#6a4a18');
      for (let k = 0; k < w; k += 4) rect(g, x + k, y - 7, 2, 2, (k / 4) % 2 ? '#e8b030' : '#1a1418');
      return;
    }
    if (p.kind === 'console') {
      // a line's control desk: a slanted panel of lamps and a small screen showing its line
      S.box(g, p, '#34323f', '#22202a', '#4c4a5a', '#0c0a10');
      const top = p.y0 - p.H; rect(g, p.x0 + 3, top + 2, 8, 5, '#0a1612'); rect(g, p.x0 + 4, top + 3 + (Math.floor(R.t * 3 + p.line) % 3), 6, 1, '#3aa86a');
      for (let k = 0; k < 3; k++) rect(g, p.x0 + 13 + k * 3, top + 3, 2, 2, Math.floor(R.t * 4 + k + p.line) % 3 ? '#d63428' : '#e8b030');
      return;
    }
    if (p.kind === 'crate') { S.box(g, p, '#5a4632', '#463626', '#7a6244', '#2a2016'); rect(g, p.x0 + 2, p.y1 - p.H + 3, p.x1 - p.x0 - 4, 1, '#2a2016'); core.line(g, p.x0 + 2, p.y1 - p.H + 4, p.x1 - 3, p.y1 - 2, '#2a2016'); txt(g, 'RUGCO', p.x0 + 3, p.y0 - p.H + 4, '#2a2016', 1); return; }
    rect(g, p.x0 - 1, p.y1 - 6, p.x1 - p.x0 + 2, 7, '#0c0a10'); rect(g, p.x0, p.y1 - 5, p.x1 - p.x0, 5, '#6a5a3a'); for (let x = p.x0 + 2; x < p.x1; x += 8) rect(g, x, p.y1 - 4, 4, 3, '#2a2016');
    const rows = 3, rh = (p.H - 6) / rows;
    for (let r = 0; r < rows; r++) for (let k = 0; k < Math.floor((p.x1 - p.x0) / 10); k++) {
      const x = p.x0 + 1 + k * 10 + (r % 2) * 3, y = p.y1 - 6 - (r + 1) * rh;
      if (x + 9 > p.x1) continue;
      rect(g, x, y, 9, rh, '#1a0a0a'); rect(g, x + 1, y + 1, 7, rh - 2, '#a8261e'); rect(g, x + 1, y + 1, 7, 1, '#d63428'); rect(g, x + 3, y + 2, 3, 2, '#5e1614');
    }
  }
  // ---------- the reactor and the cart, drawn ----------
  // A reaction vessel: a tall glass column of churning soul-energy on a riveted brass plinth, two prongs on its cap
  // arcing to each other; cracks spread as it's hit. Its glow, the arcs and its beam to the shield are in the glow.
  // seen as the rest of the floor is, from above at a tilt (owner, Oct 14: it read as a side view): a round brass
  // plinth with its top showing, a glass cylinder (rounded at the bottom, its bands curving round it) and its open top an
  // oval of churning energy in a brass rim, the two prongs standing on the rim
  function drawVessel(v, t) {
    const x = Math.round(v.x), y = Math.round(v.y), dmg = 1 - v.hp / v.max, awake = Q.reactor.st === 'on';
    // dormant it idles dark and slow; waking it stirs
    const sp = awake ? 3 : Q.reactor.st === 'wait' ? 2 : .8, pal = awake ? ['#2a7a96', '#1f5a70', '#173f50', '#8fe3ff'] : ['#1c4a5c', '#163a4a', '#10283a', '#3a7890'];
    const ell = (cx, cy, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.29); g.fill(); };
    const arc = (cy, rx, ry, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.ellipse(x, cy, rx, ry, 0, 0, Math.PI); g.stroke(); };
    const gT = y - 54, gB = y - 10, R = 13, ry = 5;
    const one = () => {
      ell(x, y + 2, 21, 6, 'rgba(0,0,0,.5)');
      // the plinth: a squat drum, its front then its top
      ell(x, y - 1, 18, 6, '#141018'); rect(g, x - 18, y - 10, 36, 9, '#141018');
      ell(x, y - 2, 17, 5, '#2c2834'); rect(g, x - 17, y - 10, 34, 8, '#2c2834');
      for (const rx of [-12, -4, 4, 12]) rect(g, x + rx - 1, y - 6, 2, 2, '#8a6420');
      ell(x, gB, 17, 6, '#8a6420'); ell(x, gB - 1, 16, 5, '#c9962e'); ell(x, gB - 1, 14, 4, '#3a2a1e');
      // the glass: a cylinder, round at its foot, darker toward the edges
      ell(x, gB, R, ry, '#0a1418'); rect(g, x - R, gT, R * 2, gB - gT, '#0a1418');
      ell(x, gB - 1, R - 1, ry - 1, '#0c1e26'); rect(g, x - R + 1, gT, R * 2 - 2, gB - gT - 1, '#0c1e26');
      // the energy in slow bands that curve round it
      g.save(); g.beginPath(); g.rect(x - R + 2, gT, R * 2 - 4, gB - gT + ry - 2); g.clip();
      for (let k = 0; k < 11; k++) { const ph = Math.sin(t * sp + k * .9), cy = gT + 3 + k * 4; g.fillStyle = ph > .3 ? pal[0] : ph > -.3 ? pal[1] : pal[2]; g.beginPath(); g.ellipse(x, cy, R - 3, 2.5, 0, 0, Math.PI); g.lineTo(x - R + 3, cy - 2); g.ellipse(x, cy - 2, R - 3, 2.5, 0, Math.PI, 0, true); g.closePath(); g.fill(); }
      g.restore();
      rect(g, x - R + 2, gT + 2, 3, gB - gT - 2, 'rgba(10,20,24,.55)'); rect(g, x + R - 4, gT + 2, 2, gB - gT - 2, 'rgba(10,20,24,.65)');
      rect(g, x - 8, gT + 3, 2, gB - gT - 6, '#5aa8c4'); rect(g, x + 6, gT + 5, 1, gB - gT - 12, '#3a7890');
      // brass bands, curving round the front
      for (const by of [y - 40, y - 25]) { arc(by, R + .5, 3.5, '#8a6420', 3); arc(by - 1, R + .5, 3.5, '#c9962e', 1); }
      // the open top: a brass rim round an oval of churning energy, motes turning in it
      ell(x, gT, R + 2, ry + 1, '#3a2a1e'); ell(x, gT, R + 1, ry, '#c9962e'); ell(x, gT + .5, R - 1, ry - 1.5, '#ffd44a');
      ell(x, gT + 1, R - 2, ry - 2, pal[1]); ell(x + Math.sin(t * sp) * 2, gT + 1, R - 5, ry - 3, pal[0]);
      for (let k = 0; k < 3; k++) { const a = t * sp * 1.4 + k * 2.1; rect(g, Math.round(x + Math.cos(a) * (R - 5)), Math.round(gT + 1 + Math.sin(a) * (ry - 3)), 2, 1, pal[3]); }
      // the prongs, standing on the rim (the back one first, then the front)
      for (const [px, py] of [[-9, gT - 1], [7, gT + 2]]) { rect(g, x + px - 1, py - 1, 4, 3, '#2c2834'); rect(g, x + px, y - 74, 2, py - (y - 74), '#7c8494'); rect(g, x + px, y - 74, 1, py - (y - 74), '#bfc6d4'); rect(g, x + px - 1, y - 77, 4, 3, '#bfefff'); }
      // cracks, spreading as it's hit
      if (dmg > .2) { rect(g, x - 6, y - 46, 1, 6, '#dff6ff'); rect(g, x - 5, y - 41, 3, 1, '#dff6ff'); }
      if (dmg > .45) { rect(g, x + 3, y - 34, 1, 8, '#dff6ff'); rect(g, x + 1, y - 30, 4, 1, '#dff6ff'); rect(g, x - 8, y - 20, 5, 1, '#dff6ff'); }
      if (dmg > .7) { rect(g, x - 2, y - 50, 1, 12, '#ffffff'); rect(g, x + 5, y - 46, 1, 5, '#ffffff'); rect(g, x - 10, y - 30, 1, 7, '#ffffff'); }
    };
    g.save(); one(); if (v.flash > 0) { g.globalCompositeOperation = 'lighter'; one(); } g.restore();
  }
  // the cart's rail along the bottom walkway: steel on dark sleepers
  function drawRail() {
    const y = F48.cart.y + 3;
    for (let x = 24; x < F48.world.w - 20; x += 14) rect(g, x, y - 1, 6, 4, '#1f1a16');
    rect(g, 20, y, F48.world.w - 40, 2, '#4a4652'); rect(g, 20, y, F48.world.w - 40, 1, '#7c8494');
  }
  // the canister cart, from above at a tilt like the rest: a hazard-striped flatbed (its deck showing) on four wheels,
  // its load of soul canisters standing on it, their round tops showing
  function drawCart(c) {
    const x = Math.round(c.x), y = F48.cart.y;
    g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.ellipse(x, y + 3, 25, 5, 0, 0, 6.29); g.fill();
    // the far wheels peeking out behind, then the deck's top, its front, and the near wheels
    for (const wx of [-14, 14]) { g.fillStyle = '#0c0a10'; g.beginPath(); g.ellipse(x + wx, y - 6, 3, 2, 0, 0, 6.29); g.fill(); }
    rect(g, x - 22, y - 12, 44, 6, '#141018'); rect(g, x - 21, y - 11, 42, 5, '#4a4652'); rect(g, x - 21, y - 11, 42, 1, '#7c8494');
    for (let k = 0; k < 6; k++) rect(g, x - 19 + k * 7, y - 9, 4, 1, '#3a3640');
    rect(g, x - 22, y - 6, 44, 6, '#141018'); rect(g, x - 21, y - 6, 42, 5, '#3a3640');
    for (let k = 0; k < 7; k++) rect(g, x - 20 + k * 6, y - 5, 3, 3, k % 2 ? '#ffd44a' : '#141018');
    for (const wx of [-14, 14]) { g.fillStyle = '#141018'; g.beginPath(); g.ellipse(x + wx, y + 1, 4, 3.5, 0, 0, 6.29); g.fill(); rect(g, x + wx - 1, y, 2, 2, '#7c8494'); }
    if (c.full) for (let k = 0; k < F48.cart.load; k++) {
      const cx = x - 11 + k * 7.5 | 0, cy = y - 9, top = cy - 14;
      g.fillStyle = '#141018'; g.beginPath(); g.ellipse(cx, cy, 4.5, 2, 0, 0, 6.29); g.fill(); rect(g, cx - 4, top, 9, 14, '#141018');
      rect(g, cx - 3, top + 1, 7, 13, '#1a3a4a'); rect(g, cx - 2, top + 3, 5, 8, '#4a8aa8'); rect(g, cx - 2, top + 3, 1, 8, '#bfefff');
      rect(g, cx - 4, cy - 2, 9, 2, '#8a6420');
      g.fillStyle = '#8a6420'; g.beginPath(); g.ellipse(cx + .5, top, 4.5, 2, 0, 0, 6.29); g.fill();
      g.fillStyle = '#c9962e'; g.beginPath(); g.ellipse(cx + .5, top - .5, 3.5, 1.5, 0, 0, 6.29); g.fill();
      rect(g, cx, top - 1, 1, 1, '#ffd44a');
    }
    else for (let k = 0; k < 5; k++) rect(g, x - 18 + k * 8, y - 10, 4, 2, '#1f1a16');
  }
  // The reactor in the glow: each vessel's light and churning souls, the arc between its prongs, and its energy beam
  // to the shield over the last loom (pulses running along it); the shield a shimmering dome with a honeycomb, a band
  // sweeping up it, and a ripple where a bolt hits. The cart's canisters glow faintly.
  function glowReactor(t) {
    if (Q.cart && Q.cart.full) for (let k = 0; k < F48.cart.load; k++) td.glow(Q.cart.x - 11 + k * 7.5, F48.cart.y - 17, 9, '#8fe3ff', .35);
    const Rc = Q.reactor; if (!Rc || Q.st !== 'fight') return;
    // dormant (and waiting): each vessel under a faint shield of its own, a ripple where it's hit; waiting, it brightens
    if (Rc.st === 'dormant' || Rc.st === 'wait') {
      for (const v of Rc.vessels) {
        const w = Rc.st === 'wait' ? .5 + .3 * Math.sin(t * 10) : 0;
        td.glow(v.x, v.y - 32, 26, '#8fe3ff', .14 + w * .3);
        g.save(); g.beginPath(); g.ellipse(v.x, v.y - 34, 22, 46, 0, 0, 6.29);
        g.globalAlpha = .07 + .03 * Math.sin(t * 3 + v.i) + w * .06; g.fillStyle = '#8fe3ff'; g.fill(); g.clip();
        g.globalAlpha = .13 + w * .1; g.strokeStyle = '#8fe3ff'; g.lineWidth = 1;
        for (let hy = v.y - 80, row = 0; hy < v.y + 14; hy += 9, row++) for (let hx = v.x - 22 + (row % 2) * 7; hx < v.x + 30; hx += 14) { g.beginPath(); g.moveTo(hx - 7, hy); g.lineTo(hx - 3, hy - 4); g.lineTo(hx + 3, hy - 4); g.lineTo(hx + 7, hy); g.stroke(); }
        g.restore();
        g.save(); g.globalAlpha = .35 + w * .3 + v.ping * 2; g.strokeStyle = v.ping > 0 ? '#ffffff' : '#8fe3ff'; g.lineWidth = 1; g.beginPath(); g.ellipse(v.x, v.y - 34, 22, 46, 0, 0, 6.29); g.stroke(); g.restore();
      }
      return;
    }
    if (Rc.st !== 'on') return;
    // the vessels' zaps: the spot marked on the floor, a thread of current feeling for it, then the arc
    for (const v of Rc.vessels) {
      if (v.dead || !v.zap) continue;
      const z = v.zap, Z = F48.reactor.zap, k = Math.min(1, z.t / Z.warn), px = v.x + (z.x > v.x ? 8 : -8), py = v.y - 76;
      const jag = (n, amp) => { const pts = [[px, py]]; for (let i = 1; i < n; i++) { const u = i / n; pts.push([px + (z.x - px) * u + (Math.random() - .5) * amp, py + (z.y - 4 - py) * u + (Math.random() - .5) * amp - Math.sin(u * Math.PI) * 18]); } pts.push([z.x, z.y - 4]); return pts; };
      const stroke = (pts, lw, col, al) => { g.save(); g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(a, b) : g.moveTo(a, b)); g.stroke(); g.restore(); };
      if (!z.fired) {
        // the mark: a ring closing in on the spot, faster and redder as it comes
        const r = Z.hit + (1 - k) * 22;
        g.save(); g.globalAlpha = .55 + .35 * Math.sin(z.t * 40); g.strokeStyle = k > .7 ? '#ff5a4a' : '#8fe3ff'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(z.x, z.y, r, r * .55, 0, 0, 6.29); g.stroke();
        g.globalAlpha = .3; g.beginPath(); g.ellipse(z.x, z.y, Z.hit, Z.hit * .55, 0, 0, 6.29); g.fillStyle = k > .7 ? '#ff5a4a' : '#8fe3ff'; g.fill(); g.restore();
        if (Math.random() < .5 + k * .5) stroke(jag(8, 10), 1, '#bfefff', .25 + k * .4);
        td.glow(px, py, 10 + k * 14, '#bfefff', .5 + k * .5);
      } else {
        const a = 1 - (z.t - Z.warn) / .22;
        const pts = jag(10, 14);
        stroke(pts, 6, '#2a8ab0', .5 * a); stroke(pts, 3, '#8fe3ff', .9 * a); stroke(pts, 1.5, '#ffffff', a);
        td.glow(z.x, z.y, 34, '#bfefff', a); td.glow(px, py, 20, '#ffffff', a);
      }
    }
    const lm = lastLoom(); if (!lm) return;
    const top = lm.y0 - lm.H - 12, cx = (lm.x0 + lm.x1) / 2, cy = (top + lm.y1) / 2, rx = (lm.x1 - lm.x0) / 2 + 20, ry = (lm.y1 - top) / 2 + 18;
    // the beams
    for (const v of Rc.vessels) {
      if (v.dead) continue;
      const x0 = v.x, y0 = v.y - 70, a = Math.atan2(y0 - cy, x0 - cx), x1 = cx + Math.cos(a) * rx, y1 = cy + Math.sin(a) * ry;
      const n = 28, nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1, pts = [];
      for (let i = 0; i <= n; i++) { const k = i / n, sag = Math.sin(k * Math.PI) * 26, w = (i === 0 || i === n) ? 0 : Math.sin(t * 9 + i * .8 + v.i * 2) * 2.5 + (Math.random() - .5) * 1.5; pts.push([x0 + (x1 - x0) * k + nx / nl * w, y0 + (y1 - y0) * k + ny / nl * w - sag]); }
      for (const [lw, col, al] of [[9, '#2a8ab0', .28], [4, '#8fe3ff', .8], [1.5, '#ffffff', 1]]) {
        g.save(); g.globalAlpha = al * (.85 + .15 * Math.sin(t * 20 + v.i)); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round';
        g.beginPath(); pts.forEach(([px, py], i) => i ? g.lineTo(px, py) : g.moveTo(px, py)); g.stroke(); g.restore();
      }
      for (let k = 0; k < 3; k++) { const u = ((t * .9 + k / 3 + v.i * .17) % 1), p = pts[Math.round(u * n)]; td.glow(p[0], p[1], 9, '#ffffff', .7); }
      // the vessel's own light, its souls, and the arc between its prongs
      td.glow(v.x, v.y - 32, 40, '#8fe3ff', .45 + .12 * Math.sin(t * 5 + v.i));
      for (let k = 0; k < 6; k++) { const a2 = t * 2.2 + k * 1.05, sx = v.x + Math.sin(a2) * 7, sy = v.y - 12 - ((k * 7 + t * 16) % 40); g.fillStyle = '#fff6e2'; g.fillRect(Math.round(sx), Math.round(sy), 2, 2); }
      const ax0 = v.x - 8, ax1 = v.x + 8, ay = v.y - 76;
      g.save(); g.strokeStyle = '#dff6ff'; g.lineWidth = 1; g.beginPath(); g.moveTo(ax0, ay);
      for (let i = 1; i < 6; i++) g.lineTo(ax0 + (ax1 - ax0) * i / 6, ay - 2 - Math.random() * 5);
      g.lineTo(ax1, ay); g.stroke(); g.restore();
      td.glow(v.x, ay - 2, 12, '#bfefff', .6);
    }
    // the shield
    g.save();
    g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.29);
    g.globalAlpha = .1 + .04 * Math.sin(t * 4); g.fillStyle = '#8fe3ff'; g.fill();
    g.clip();
    g.globalAlpha = .22; g.strokeStyle = '#8fe3ff'; g.lineWidth = 1;
    for (let hy = cy - ry, row = 0; hy < cy + ry + 8; hy += 9, row++) for (let hx = cx - rx + (row % 2) * 7; hx < cx + rx + 8; hx += 14) { g.beginPath(); g.moveTo(hx - 7, hy); g.lineTo(hx - 3, hy - 4); g.lineTo(hx + 3, hy - 4); g.lineTo(hx + 7, hy); g.stroke(); }
    const band = cy + ry - ((t * 50) % (ry * 2 + 20));
    g.globalAlpha = .3; g.fillStyle = '#dff6ff'; g.fillRect(cx - rx, band, rx * 2, 3);
    if (Rc.hitT > 0) { const k = 1 - Rc.hitT / .25; g.globalAlpha = .7 * (1 - k); g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.ellipse(clamp(Rc.hitX || cx, cx - rx, cx + rx), lm.y1 - 6, 6 + k * 30, 4 + k * 16, 0, 0, 6.29); g.stroke(); }
    g.restore();
    g.save(); g.globalAlpha = .75 + .2 * Math.sin(t * 6); g.strokeStyle = '#8fe3ff'; g.lineWidth = 2; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.29); g.stroke();
    g.globalAlpha = .9; g.strokeStyle = '#ffffff'; g.lineWidth = 1; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, Math.PI * 1.1, Math.PI * 1.6); g.stroke(); g.restore();
  }
  // The arrow to what he has to do next, when it's off screen: the vessels while they stand (the nearer one), then the
  // overloading loom. Before the last line, the nearest running loom once no loom has taken damage for F48.quota.idle
  // seconds, or from the moment the quota fills until he next hurts a loom (owner, Oct 16). p(Loom)'s orange chevron on
  // the screen's edge, pulsing. The cart is optional, and carpshits never get one (#114).
  const loomArrow = () => Q.st === 'fight' && Q.panic < 2 && (Q.t - Q.loomHitAt >= F48.quota.idle || (Q.quotaAt != null && Q.loomHitAt < Q.quotaAt));
  function objectiveArrow() {
    Q.arrowOn = false;
    if (Q.st !== 'fight') return;
    let tx = null, ty = null;
    const vs = Q.reactor ? vessels() : [];
    if (loomArrow()) {
      const lm = Q.machines.filter(m => m.kind === 'loom' && !m.dead && live(m.line)).reduce((a, b) => !a || Math.hypot((b.x0 + b.x1) / 2 - bull.x, b.y1 - bull.y) < Math.hypot((a.x0 + a.x1) / 2 - bull.x, a.y1 - bull.y) ? b : a, null);
      if (lm) { tx = (lm.x0 + lm.x1) / 2; ty = lm.y1 - 20; }
    } else if (!Q.reactor) return;
    else if (vs.length) { const v = vs.reduce((a, b) => Math.hypot(a.x - bull.x, a.y - bull.y) < Math.hypot(b.x - bull.x, b.y - bull.y) ? a : b); tx = v.x; ty = v.y - 30; }
    else if (Q.reactor.st === 'down') { const lm = lastLoom(); if (lm) { tx = (lm.x0 + lm.x1) / 2; ty = lm.y1 - 20; } }
    if (tx == null) return;
    const sx = tx - CAM.x, sy = ty - CAM.y, m = 18;
    if (sx > 0 && sx < W && sy > 0 && sy < H) return;
    Q.arrowOn = true;   // for the tests (drawing only)
    const cx = W / 2, cy = H / 2, dx = sx - cx, dy = sy - cy, k = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m - 10) / Math.abs(dy || 1e-6));
    const ax = cx + dx * k, ay = cy + dy * k, a = Math.atan2(dy, dx), pulse = 1 + .18 * Math.sin(R.t * 9);
    g.save(); g.translate(Math.round(ax), Math.round(ay)); g.rotate(a); g.scale(pulse, pulse);
    g.fillStyle = '#1a0f08'; g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -10); g.lineTo(-1, 0); g.lineTo(-6, 10); g.closePath(); g.fill();
    g.fillStyle = vs.length ? '#8fe3ff' : '#ff7a2a'; g.beginPath(); g.moveTo(9, 0); g.lineTo(-4, -7); g.lineTo(0, 0); g.lineTo(-4, 7); g.closePath(); g.fill();
    g.restore();
  }
  function drawMachine(m, t) {
    const speed = live(m.line) ? F48.rate[Q.panic] : 0;
    const one = () => {
      if (m.kind === 'tank') S.tank(g, m, t, null);
      else if (m.kind === 'spinner') S.spinner(g, m, t, null, speed);
      else if (m.kind === 'loom') S.loom(g, m, t, null, speed);
      else if (m.kind === 'press') S.press(g, m, t, null, LINES[m.line].y, F48.bedH);
      else S.animator(g, m, t, null, 0);
    };
    // a hit flashes it bright: the same drawing again, added on top (a canvas filter here cost a sixth of the frame rate)
    g.save(); one(); if (m.flash > 0) { g.globalCompositeOperation = 'lighter'; one(); } g.restore();
    if (overloaded(m)) {
      // overloading: the frame glows red-hot in pulses, and the holes the chunks left
      const top = m.y0 - m.H, w = m.x1 - m.x0, h = m.y1 - top;
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .16 + .1 * Math.sin(t * 9); rect(g, m.x0, top, w, h, '#ff3a10'); g.restore();
      for (let i = 0; i < (m.stage || 0); i++) {
        const [hx, hy] = F48.overload.holes[i], x = Math.round(m.x0 + hx * w), y = Math.round(top + hy * h);
        rect(g, x - 7, y - 5, 14, 10, '#ff7a2a'); rect(g, x - 6, y - 4, 12, 8, '#140a08'); rect(g, x - 3, y - 6, 6, 2, '#140a08'); rect(g, x + 5, y - 1, 3, 4, '#140a08');
      }
    }
  }
  // p(Loom)'s laser: while it warns, a flickering line where it will start; then the beam, white in red, with a green
  // emitter either side of its gap
  function drawQC() {
    const L = Q.qc; if (!L || Q.st !== 'fight') return;
    const b = td.TD.bounds, P = F48.qc, warn = L.t < P.warn, pos = Math.round(L.pos);
    if (warn && Math.floor(L.t * 10) % 2) return;
    const seg = (a0, a1, w, col) => { if (a1 <= a0) return; if (L.dir === 'x') rect(g, pos - (w >> 1), Math.round(a0), w, Math.round(a1 - a0), col); else rect(g, Math.round(a0), pos - (w >> 1), Math.round(a1 - a0), w, col); };
    const lo = L.dir === 'x' ? b.y0 - 50 : b.x0 - 16, hi = L.dir === 'x' ? b.y1 + 10 : b.x1 + 16;
    for (const [a0, a1] of [[lo, L.g0], [L.g1, hi]]) {
      if (warn) { seg(a0, a1, 2, '#ff3a2a'); continue; }
      seg(a0, a1, 12, 'rgba(255,40,30,.25)'); seg(a0, a1, 6, '#ff3a2a'); seg(a0, a1, 2, '#fff2e8');
    }
    for (const e of [L.g0, L.g1]) { if (L.dir === 'x') rect(g, pos - 4, Math.round(e) - 2, 8, 4, '#3aff7a'); else rect(g, Math.round(e) - 2, pos - 4, 4, 8, '#3aff7a'); }
  }
  function glowFactory() {
    const t = R.t; g.save(); g.translate(-CAM.x, -CAM.y);
    drawQC();
    glowReactor(t);
    S.soulMain(g, LAYOUT, t, Q.panic, g, Q.st !== 'fight', Q.down);
    for (let i = 0; i < 3; i++) for (const it of Q.items[i]) if (it.kind === 'thread') S.item({ fillStyle: '', fillRect() {} , save() {}, restore() {}, beginPath() {}, ellipse() {}, fill() {} }, it, LINES[i].y, g);
    for (const m of Q.machines) {
      if (m.dead) continue;
      if (m.kind === 'tank') S.tank({ fillStyle: '', fillRect() {}, beginPath() {}, ellipse() {}, fill() {} }, m, t, g);
      else if (m.kind === 'loom') { const nul = nullCtx(); S.loom(nul, m, t, g, live(m.line) ? F48.rate[Q.panic] : 0); }
      else if (m.kind === 'spinner') { const nul = nullCtx(); S.spinner(nul, m, t, g, 1); }
      else if (m.kind === 'animator') S.animator(nullCtx(), m, t, g, m.zap);
    }
    for (let i = 0; i < 3; i++) S.beacon(nullCtx(), F48.beltEnd + 26, LINES[i].y + 20, (reverseWarn(i) || Q.reverse[i] > 0) ? t * 2 : t, Math.max(Q.panic, Q.reverse[i] > 0 ? 2 : 0), g);
    for (let i = 0; i < 3; i++) {
      const f = Q.fling[i], sp = partOf(i, 'spinner');
      if (f.tell > 0 && !sp.dead) td.glow((sp.x0 + sp.x1) / 2, (sp.y0 + sp.y1) / 2 - sp.H, 26, '#ff7a2a', .8);
      if (Q.crane[i].st === 'warn') td.glow(20, LINES[i].y + F48.crane.dy, 20, '#ff3a2a', Math.floor(t * 10) % 2 ? .8 : .2);
      if (!Q.feedCut[i] && live(i)) { const fs = feedSeg(i); for (let k = 0; k < 3; k++) { g.fillStyle = '#bfefff'; g.fillRect(Math.round(fs.x0 + ((k * 13 + t * 30) % (fs.x1 - fs.x0))), fs.y0 - 1, 2, 2); } }
      if (Q.powerCut[i] > 0 && Math.random() < .3) { const pw = powerSeg(i); g.fillStyle = '#ffffff'; g.fillRect(pw.x0 - 1 + Math.round(Math.random() * 3), pw.y0 + 7, 1, 1); }
    }
    cueMarks(t);
    // a hurt loom catches fire (owner, Oct 14: "seeing it crack as the line breaks would be great", then "lets have the loom
    // start looking on fire instead"): breaking the rest of its line, its console and the blasts around it chip it, so a
    // loom whose line has been taken apart shows it. A flame on its top rail from 10% damage and another every 18% (five
    // at most), growing as it goes; past 50% the odd spark and a wisp of smoke. Drawn flames, few particles.
    for (const m of Q.machines) {
      if (m.kind !== 'loom' || m.dead || Q.st !== 'fight') continue;
      const dmg = 1 - m.hp / m.max; if (dmg < .1) continue;
      const n = Math.min(5, 1 + Math.floor((dmg - .1) / .18)), w = m.x1 - m.x0, top = m.y0 - m.H;
      for (let i = 0; i < n; i++) {
        const fx = m.x0 + w * [.22, .68, .45, .88, .1][i], fl = Math.sin(t * 13 + i * 2.1 + m.id) * .5 + .5;
        const h = (6 + fl * 8) * (.8 + dmg * 1.6) * (i < n - 1 ? 1 : .7), base = top - 3 - (i % 2) * 6, fl2 = Math.sin(t * 17 + i * 3.3 + m.id) * .5 + .5;
        g.fillStyle = '#c8302a'; g.fillRect(Math.round(fx - 4), Math.round(base - h * .7), 8, Math.round(h * .7)); g.fillRect(Math.round(fx - 2), Math.round(base - h), 4, Math.round(h));
        g.fillRect(Math.round(fx + 3), Math.round(base - h * (.4 + fl2 * .4)), 2, Math.round(h * (.4 + fl2 * .4)));
        g.fillStyle = '#ff7a2a'; g.fillRect(Math.round(fx - 3), Math.round(base - h * .5), 6, Math.round(h * .5)); g.fillRect(Math.round(fx - 1), Math.round(base - h * .8), 3, Math.round(h * .8));
        g.fillStyle = '#ffd060'; g.fillRect(Math.round(fx - 2), Math.round(base - h * .3), 4, Math.round(h * .3));
        td.glow(fx, base - h * .4, 14 + dmg * 16, '#ff7a2a', .35 + dmg * .3);
        if (dmg > .5 && Math.random() < .015) R.td.fx.push({ k: 'spark', x: fx, y: m.y1, h: m.y1 - base + 6, vx: fxr(-30, 30), vy: fxr(-8, 8), vh: fxr(30, 80), col: '#ffd060', t: 0, dur: .4 });
        if (dmg > .5 && Math.random() < .006) R.td.fx.push({ k: 'smoke', x: fx, y: m.y1, h: m.y1 - base + 10, vx: fxr(-4, 4), vy: 0, s: 4, t: 0, dur: 1.2 });
      }
    }
    // wrecks burn: flames that die down over a few seconds (and flare up again as the floor comes apart)
    for (const m of Q.machines) {
      const k = burn(m); if (k <= 0) continue;
      const n = m.kind === 'loom' ? 5 : 3, w = m.x1 - m.x0;
      for (let i = 0; i < n; i++) {
        const fx = m.x0 + 4 + (i + .5) / n * (w - 8), fl = Math.sin(t * 13 + i * 2.1 + m.id) * .5 + .5, h = (6 + fl * 6) * k * (m.kind === 'loom' ? 1.4 : 1), base = m.y1 - 8;
        g.fillStyle = '#c8302a'; g.fillRect(Math.round(fx - 2), Math.round(base - h), 4, Math.round(h));
        g.fillStyle = '#ff7a2a'; g.fillRect(Math.round(fx - 1), Math.round(base - h * .75), 3, Math.round(h * .75));
        g.fillStyle = '#ffd060'; g.fillRect(Math.round(fx - 1), Math.round(base - h * .35), 2, Math.round(h * .35));
      }
      td.glow((m.x0 + m.x1) / 2, m.y1 - 12, 26 * k + 8, '#ff7a2a', .35 * k);
    }
    for (const f of Q.fx) {
      const k = f.t / f.dur;
      if (f.k === 'boom') {
        const r = (12 + k * 46) * f.s;
        g.save(); g.globalAlpha = 1 - k; g.strokeStyle = '#ffd060'; g.lineWidth = 3 * (1 - k) + 1; g.beginPath(); g.ellipse(f.x, f.y - 10, r, r * .6, 0, 0, 6.29); g.stroke(); g.restore();
        if (k < .35) { const fr = (10 + k * 40) * f.s; td.glow(f.x, f.y - 14, fr * 1.6, '#ffb040', .9 * (1 - k * 2)); g.fillStyle = k < .15 ? '#ffffff' : '#ffd060'; g.beginPath(); g.ellipse(f.x, f.y - 14, fr * .5, fr * .4, 0, 0, 6.29); g.fill(); }
      } else if (f.k === 'burn') { for (let n = 0; n < 3; n++) { const x = f.x + (n - 1) * 5, h = 4 + Math.random() * 6 * (1 - k); g.fillStyle = n === 1 ? '#ffd060' : '#ff7a2a'; g.fillRect(Math.round(x), Math.round(f.y - h), 2, Math.round(h)); } }
    }
    reserveGlow(t);
    drawEye(t);
    td.glows();
    // the souls on their way to the gun; then pulled up p(Loom)'s threads, tearing free, saluting and rising
    for (const sl of Q.souls) if (!sl.landed) {
      const k = sl.t / sl.dur, mz = td.muzzle(), x0 = sl.x0 + CAM.x, y0 = sl.y0 + CAM.y, x = x0 + (mz.x - x0) * k, y = y0 + (mz.y - mz.h - y0) * k - Math.sin(k * Math.PI) * 30;
      g.drawImage(A.GHOST, Math.round(x - 9), Math.round(y - 11), 18, 22); td.glow(x, y, 14, '#ffd44a', .5);
    }
    const C = Q.collapse;
    if (C && C.yank) for (const sl of C.yank) {
      if (C.pt > F48.ploom.lobby) break;
      const img = sl.salute ? A.SOUL_SALUTE || A.GHOST : A.GHOST, a = C.pt > F48.ploom.rise ? Math.max(0, 1 - (C.pt - F48.ploom.rise) / .6) : 1;
      g.save(); g.globalAlpha = a; g.translate(Math.round(sl.x), Math.round(sl.y));
      if (C.pt < F48.ploom.free) g.translate(Math.round((Math.random() - .5) * 2), 0);
      if (sl.i === 0 && sl.salute) g.scale(-1, 1);
      g.drawImage(img, -9, -11, 18, 22); g.restore(); td.glow(sl.x, sl.y, 14, '#ffd44a', .4 * a);
    }
    g.restore();
  }
  // how hard a wreck is burning: fierce when it breaks, dying down over six seconds; everything burns in the collapse
  function burn(m) { if (!m.dead || m.deadAt == null) return 0; const k = Math.max(0, 1 - (R.t - m.deadAt) / 6); return Q.st === 'collapse' ? Math.max(k, .6) : k > .05 ? .35 + .65 * k : 0; }
  function nullCtx() { return { fillStyle: '', strokeStyle: '', lineWidth: 1, fillRect() {}, beginPath() {}, ellipse() {}, fill() {}, moveTo() {}, lineTo() {}, stroke() {}, save() {}, restore() {} }; }
  // the screens on the wall (lit by themselves: the glow layer)
  function glowScreens() { g.save(); g.translate(-CAM.x, -CAM.y); S.monitors(g, LAYOUT, R.t, { panic: Q.panic, down: Q.down, eye: Q.eye }); g.restore(); }

  // ---------- the lobby, drawn (lobby.js draws the room; the portrait is the 48th's own) ----------
  // The Rugfather's portrait: the owner's sprite (portrait.js, frame 2 of his strip at half size, finer than the game's
  // own pixels) on a dark ground in a gilt frame. x, y is the picture's top left.
  const PW8 = UnrugPortrait.w, PH8 = UnrugPortrait.h;
  function drawPortrait(x, y) {
    const P = (a, b, w, h, col) => rect(g, a, b, w, h, col), gx = x - 4, gy = y - 3, gw = PW8 + 8, gh = PH8 + 5;
    P(gx - 7, gy - 7, gw + 14, gh + 14, '#5a3a12'); P(gx - 6, gy - 6, gw + 12, gh + 12, '#c9962e'); P(gx - 4, gy - 4, gw + 8, gh + 8, '#8a6420'); P(gx - 2, gy - 2, gw + 4, gh + 4, '#ffd44a');
    for (let i = 0; gx - 5 + i * 9 < gx + gw + 3; i++) { P(gx - 5 + i * 9, gy - 6, 3, 2, '#ffe68a'); P(gx - 5 + i * 9, gy + gh + 4, 3, 2, '#ffe68a'); }
    P(gx, gy, gw, gh, '#1e1418');
    for (let i = 0; i < gh; i += 4) P(gx, gy + i, gw, 2, i % 8 ? '#22161a' : '#1a1216');
    if (UnrugPortrait.img.complete && UnrugPortrait.img.naturalWidth) g.drawImage(UnrugPortrait.img, x, y, PW8, PH8);
  }
  function drawPlaque(x, y) {
    rect(g, x - 2, y - 2, 128, 22, '#5a3a12'); rect(g, x, y, 124, 18, '#c9962e'); rect(g, x, y, 124, 1, '#ffe68a');
    const mid = (t, yy) => txt(g, t, Math.round(x + 62 - textWidth(t) / 2), yy, '#2a1d14', 1);
    mid('FOUNDER & CEO', y + 3); mid('HIS VISION ENDURES', y + 10);
  }
  const PORTRAIT = { x: 0, y: 30 };   // the picture's top left, picture pixels
  // The portrait again over the finished picture, so the renderer's 64 colours and dither don't touch it: the owner's
  // sprite as he drew it. Not where he stands (a jump in front of it), where the lit copy underneath shows instead.
  function lobbyOverlay() {
    g.save(); g.scale(.5, .5);
    const img = UnrugPortrait.img;
    if (img.complete && img.naturalWidth) {
      const fx = Math.round(2 * arena.X(bull.u)), fy = Math.round(2 * arena.Y(bull.jh));
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(fx + 36, fy - 84, -72, 90); g.clip('evenodd');
      g.drawImage(img, PORTRAIT.x, PORTRAIT.y, PW8, PH8); g.restore();
    }
    if (Q.white > 0) { g.globalAlpha = Q.white; rect(g, 0, 0, W, H, '#ffffff'); }
    g.restore();
  }
  // ---------- the frame ----------
  const draw = half(() => {
    if (Q.st === 'lobby') { lobby.draw(); return; }
    drawFactory();
  });
  function glows() {
    g.save(); g.scale(.5, .5);
    if (Q.st === 'lobby') { g.restore(); lobby.glows(); return; }
    glowScreens(); glowFactory();
    g.restore();
    core.drawFx('glow');
  }
  function overlay() {
    if (Q.st === 'lobby') { lobbyOverlay(); return; }
    g.save(); g.scale(.5, .5);
    const C = Q.collapse;
    if (!C || C.phase !== 'ploom') { td.reticle(); objectiveArrow(); }
    // the laser off screen: a red edge where it is, its gap in green, so he can get to the gap before it arrives
    const L = Q.qc;
    if (L && Q.st === 'fight' && Math.floor(R.t * 8) % 2) {
      const sp = L.dir === 'x' ? L.pos - CAM.x : L.pos - CAM.y, lim = L.dir === 'x' ? W : H;
      if (sp < 0 || sp > lim) {
        const e = sp < 0 ? 0 : lim - 3, g0 = Math.round(L.g0 - (L.dir === 'x' ? CAM.y : CAM.x)), g1 = Math.round(L.g1 - (L.dir === 'x' ? CAM.y : CAM.x));
        if (L.dir === 'x') { rect(g, e, 0, 3, H, '#ff3a2a'); if (g1 > 0 && g0 < H) rect(g, e, Math.max(0, g0), 3, Math.min(H, g1) - Math.max(0, g0), '#3aff7a'); }
        else { rect(g, 0, e, W, 3, '#ff3a2a'); if (g1 > 0 && g0 < W) rect(g, Math.max(0, g0), e, Math.min(W, g1) - Math.max(0, g0), 3, '#3aff7a'); }
      }
    }
    if (C && C.phase === 'whip' && R.td.cam.y > 24 && Math.floor(R.t * 4) % 2) for (let i = 0; i < 3; i++) { const x = 240, y = 34 + i * 6; for (let r = 0; r < 6; r++) rect(g, x - r, y + r, r * 2 + 1, 1, '#ffd44a'); }
    if (Q.white > 0) { g.globalAlpha = Q.white; rect(g, 0, 0, W, H, '#ffffff'); }
    g.restore();
  }
  // the HUD: souls top right, the three lines' state top middle, p(Loom)'s readout along the bottom
  function hud() {
    drawSoulsCounter();
    if (Q.st === 'fight') {
      const x0 = 120 - 21;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * 15, y = 4, dn = Q.down[i], lm = loomOf(i);
        rect(g, x - 1, y - 1, 12, 9, '#0a0810'); rect(g, x, y, 10, 7, dn ? '#3a1a1a' : '#2c2a35');
        if (!dn) { rect(g, x + 1, y + 1, 1, 5, '#ff7a2a'); rect(g, x + 4, y + 1, 1, 5, '#ff7a2a'); rect(g, x + 7, y + 1, 1, 5, '#ff7a2a'); const k = lm.hp / lm.max; rect(g, x, y + 8, Math.round(10 * k), 1, k < .34 ? '#d63428' : '#3aa86a'); }
        else { core.line(g, x + 1, y + 1, x + 8, y + 6, '#d63428'); core.line(g, x + 8, y + 1, x + 1, y + 6, '#d63428'); }
      }
      if (Q.panic && Q.st === 'fight' && Math.floor(R.t * 3) % 2) otxt(g, Q.panic > 1 ? 'PANIC!!' : 'PANIC', 120, 15, Q.panic > 1 ? '#ff5a4a' : '#ffd44a', 1, 'center');
      // the chain callout: big on its beats, gold flickering to orange, gone a second after the last link
      const co = Q.callout;
      if (co && R.t - co.at < 1.1) {
        const k = R.t - co.at, big = co.beat && k < .18;
        otxt(g, 'CHAIN x' + co.n, 120, big ? 42 : 44, Math.floor(R.t * 12) % 2 ? '#ffd44a' : '#ff9a3c', big ? 3 : 2, 'center');
        if (co.bonus) otxt(g, '+' + co.bonus + ' SOUL' + (co.bonus > 1 ? 'S' : ''), 120, 56, '#fff6e2', 1, 'center');
      }
    }
    // the power-ups running, under the charge bar, each with its time left
    let py = R.spread > 0 ? 27 : 20;
    for (const [k, label, col] of [['rapid', 'RAPID', '#bfefff'], ['pierce', 'PIERCE', '#c9a0ff']]) {
      if (!(R[k] > 0)) continue;
      if (R[k] > 2 || Math.floor(R.t * 10) % 2) otxt(g, label, 4, py, col);
      rect(g, 4 + textWidth(label) + 3, py + 2, Math.round(20 * R[k] / td.TD.power.secs), 1, col); py += 7;
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
      const dx = 2 * arena.X(F48.lobby.doorU) + 48, w = textWidth(s) * 2 + 12, x = clamp(dx - w / 2, 4, W - w - 4), y = 120;
      rect(g, x - 2, y - 2, w + 4, 24, '#1a1418'); rect(g, x, y, w, 20, '#fff6e2'); txt(g, s, x + 6, y + 5, '#1a1418', 2);
    }
    g.restore();
  }
  // flat light: dim work lights and the machines' own light; darker and red in the panic and the collapse.
  // About 15% up on the first build (owner, Oct 13: "could be SLIGHTLY brighter")
  function view() {
    if (Q.st === 'lobby') return { ambient: 1 };
    return { ambient: Q.st === 'collapse' ? .46 : Q.panic > 1 ? .5 : Q.panic ? .55 : .6 };
  }
  // at most this many lights a frame: the flat renderer lights every pixel by each of them, and phones have to keep up
  const MOST_LIGHTS = 18;
  function lights(r0) {
    if (Q.st === 'lobby') { arena.lights(r0); return; }
    let left = MOST_LIGHTS; const r = { light: (...a) => { if (left-- > 0) r0.light(...a); } };
    for (const f of Q.fx) if (f.k === 'boom' && f.t < .3) r.light(f.x - CAM.x, f.y - 14 - CAM.y, 0, 1.4 * f.s, .9 * f.s, .3 * f.s);
    td.lights(r, CAM);
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
    if (Q.collapse && Q.collapse.eye && Q.eye > 0) r.light(Q.collapse.eye.x - c.x, Q.collapse.eye.y - c.y, 0, 1.2 * Q.eye, .45 * Q.eye, .1 * Q.eye);
    let fires = 0;
    for (const m of Q.machines) { const k = burn(m); if (k > 0 && fires < 4 && on((m.x0 + m.x1) / 2, m.y1)) { fires++; r.light((m.x0 + m.x1) / 2 - c.x, m.y1 - 14 - c.y, 0, .5 * k, .22 * k, .05 * k); } }
    if (Q.st === 'collapse') { const p = Math.floor(R.t * 2) % 2; r.light(W * .25, 30, 0, p ? .5 : .25, .04, .02); r.light(W * .75, 30, 0, p ? .25 : .5, .04, .02); }
    r.light(F48.main.x + 6 - c.x, 200 - c.y, 0, .08, .16, .22);
    // the work lights hanging over the floor: warm pools (out in the collapse, flickering in the panic)
    if (Q.st === 'fight') for (const [x, y] of F48.worklights) if (on(x, y)) { const f = Q.panic > 1 && Math.floor(R.t * 13 + x) % 7 === 0 ? .3 : 1; r.light(x - c.x, y - c.y, 0, .3 * f, .26 * f, .2 * f); }
  }
  function shakeOffset() {
    const s = Math.max(0, R.shake) * 20 + (Q.st === 'lobby' ? 0 : 0);
    return s ? [Math.round(Math.sin(R.t * 71) * s) / 2, Math.round(Math.cos(R.t * 53) * s) / 2] : [0, 0];
  }
  const noop = () => {};
  return {
    id: 'floor48', twin: () => Q && Q.st !== 'lobby' && R.phase !== 'dead' && R.phase !== 'win',
    tune: { scroll: 0, aisle: .92, move: .55, bossHP: 0, charges: 24, recharge: .18, overheat: .2, cool: 12, deflectCharge: 3, hurtInv: 1.5, spreadT: 10 },
    set: { flat: true },
    get label() { return Q && Q.st === 'lobby' ? 'Unruggabull, side on, in an immaculate elevator lobby, under a grand portrait of the flaming Rugfather.' : "Unruggabull, seen from above, inside p(Loom)'s soul-reclamation factory: three production lines of conveyor belts and machines weaving captured souls into carpshits."; },
    lines: { f48start: 'SO THIS IS WHERE THEY GO.', f48line: 'ONE DOWN.', f48panic: 'OVERTIME, HUH?', portrait: "HIS VISION ENDURES. HE DIDN'T.", start: false },
    newRun, update, opening, resume, crouchWalk: () => !!Q && Q.st === 'lobby', blasterOff: () => !!Q && Q.st === 'lobby', use(x) { g = x; td.use(x); arena.use(x); lobby.use(x); },
    view, lights, shakeOffset, draw, glows, overlay, hud,
    fire: () => true, slashHits: noop, muzzleXY: () => { const m = td.muzzle(), s = td.screenOf(m.x, m.y - m.h); return { x: s.x / 2, y: s.y / 2 }; },
    soulFreed(f) { f.to = { x: W / 2 - 10 - textWidth(String(R.souls)), y: 7 }; },
    aim: noop, shotHits: () => false, shotFar: () => false, posOf: o => o, slash: noop, hurt: noop, blasterBack: noop,
    bonusBy: () => null, endPull: noop, cutRug: noop, draggedIn: noop, blowUp: noop,
    // no checkpoint at a rugging: a continue restarts the whole floor from the one saved as he came in (newRun), with the
    // souls he came in with, every line running again and the same line kinds (item 26)
    stageNo: () => R.phase === 'win' ? 22 : Q.st === 'lobby' ? 21 : Q.st === 'collapse' ? 21 : 18 + Q.panic,
    stageNames: { 18: 'The 48th Floor', 19: 'The 48th Floor: one line down', 20: 'The 48th Floor: last line', 21: 'The 48th Floor: collapse and lobby', 22: 'The 48th Floor cleared' },
    pauseText: 'The factory waits.',
    continueText: () => 'Back to the start of the floor with full hearts?',
    clearCard, afterClear: () => startLobby(false),
    F48, LINES, KINDS, td, arena, lineDown, breakMachine, breakProp, hurtProp, hurtMachine: hurt, solids, startReactor, hitCart, vessels, shielded, startCollapse, startLobby, startPloom, cutCable, cables, kindOf, partOf, loomOf, limpRug, stepCart, get Q() { return Q; }
  };
};
