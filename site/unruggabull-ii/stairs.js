// The stairwell: the prologue, from the garage to the 13th Floor (docs/games/unruggabull-ii/stairwell-plan.md).
// Three one-screen sections of zigzag stairs joined by quick whips up, the floor numbers rolling: section 1 (G to 1) with
// the blaster; section 2 (6 to 7) with the Rugmergency halfway up (shoot the glass, the katana to a fanfare), then the
// first deflects and the caution tape to cut; section 3 (12 to 13) with carpshits tumbling down the stairs, then the
// door: a breath, "OK... HERE WE GO.", the kick, the band (the 13th Floor's floorHall) on the kick, the door at the
// camera, a white flash and the 13th Floor. Built on the arena (arena.js) with a ground line for the stairs.
// The design pages are tools/unruggabull-ii/stairwell/ (climb.js is the reference for the pacing and the look).
// Drawn at the picture's full size (480 x 270, twice the game's units), as the rides are.
var UnrugStairs = function (core) {
  'use strict';
  const { A, Snd, TUNE, clamp, rr, emit, updateFx, endRun, drawSoulsCounter, otxt, txt, rect, textWidth } = core;
  const W = 480, H = 270;
  const lerp = (a, b, k) => a + (b - a) * k, ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

  // ---------- the three sections (picture pixels) ----------
  // The ground is a line through these points (x ascending); the stairs are its slopes. dir is the way up. Each
  // section's script: wait (seconds), clear (until none are left), fly (side, hover in pixels, options), roll (a
  // tumbler down the stairs), prompt. Section 2 runs `pre` on the way up to the cabinet, then `script` with the katana.
  const SECTIONS = [
    { n: 1, dir: 1, low: 'G', high: '1', path: [[0, 246], [110, 246], [250, 176], [330, 176], [450, 106], [480, 106]], lamp: 300, big: '1', bigX: 40,
      script: [['wait', .9], ['fly', 1, 34], ['clear'], ['fly', 1, 34], ['fly', -1, 84, { prompt: 'JUMP' }], ['clear'], ['fly', 1, 36, { thrower: true }], ['wait', 1.2], ['fly', 1, 40], ['clear'], ['fly', -1, 36], ['clear'], ['fly', 1, 84], ['wait', 1.4], ['fly', 1, 36, { thrower: true }], ['clear']] },
    { n: 2, dir: -1, low: '6', high: '7', path: [[0, 126], [40, 126], [150, 186], [300, 186], [400, 246], [480, 246]], lamp: 400, big: '7', bigX: 330,
      cab: { x: 150, floor: 186 }, tape: { x: 38, floor: 126 },
      pre: [['wait', .8], ['fly', -1, 36], ['wait', 1.4], ['fly', -1, 84], ['wait', 1.2], ['fly', 1, 36, { thrower: true }], ['clear'], ['prompt', 'SHOOT THE GLASS']],
      script: [['wait', .7], ['fly', -1, 36, { swoopy: true }], ['prompt', 'SLASH'], ['clear'], ['fly', -1, 36, { thrower: true, throwFirst: .9 }], ['clear'], ['fly', -1, 34], ['fly', 1, 40], ['clear'],
        // up by the tape: two that hang back and keep throwing, so there's paper to knock back (or dodge)
        ['fly', -1, 38, { pitcher: true, throwFirst: .7 }], ['wait', .6], ['fly', -1, 70, { pitcher: true, throwFirst: 1.3 }], ['clear']] },
    { n: 3, dir: 1, low: '12', high: '13', path: [[0, 246], [90, 246], [210, 186], [480, 186]], lamp: 260, big: '13', bigX: 120, door: true,
      script: [['wait', .6], ['roll'], ['wait', .7], ['roll'], ['wait', 1.1], ['fly', 1, 36], ['roll'], ['clear'], ['roll'], ['wait', .5], ['roll'], ['wait', .5], ['roll'], ['fly', 1, 84], ['clear'],
        // the last push: throwers from both sides between the tumblers, then two pitchers guarding the top
        ['fly', 1, 36, { thrower: true }], ['wait', .8], ['roll'], ['fly', -1, 36, { swoopy: true }], ['wait', .9], ['roll'], ['fly', 1, 84], ['clear'],
        ['fly', 1, 38, { pitcher: true, throwFirst: .7 }], ['wait', .5], ['fly', 1, 70, { pitcher: true, throwFirst: 1.3 }], ['roll'], ['wait', 1], ['fly', -1, 40], ['clear']] }
  ];
  const STAIRS = {
    SECTIONS,
    // the music: Flight Risk (music-stairs.js), a layer up from the Rugmergency and again for the last flights
    stems: [['drums', 'bass', 'lead'], ['drums', 'bass', 'lead', 'harmony'], ['drums', 'bass', 'lead', 'harmony', 'power', 'build']],
    fly: { throwFirst: [1.4, 2.4], swoopy: 1.6 }, pitcher: { keep: [.68, .91], every: [1.5, 2.2] },
    tumbler: { speed: .68, h: .043, hop: .021, radius: .05, tall: .107, reach: .082 },
    whip: .85, deadWait: 2.8, prompt: 2.4,
    // the Rugmergency, from the glass breaking: he walks to the cabinet, grabs the katana, holds it up to the fanfare
    rug: { walk: .3, grab: .62, raise: .78 },
    // the door, from the top landing: the walk up, a breather bent over with his hands on his hips (until up), standing back up (rise),
    // the line, the brace, the kick, the door at the camera, the 13th Floor
    door: { at: 360, stand: 392, walk: .45, up: 1.8, rise: .2, line: 2.5, brace: 3.6, kick: 3.95, impact: 4.28, hall: 4.36 },
    ambient: .62, dim: .2,
    // the garage door at the foot of section 1: where it is (picture pixels), when it shuts (past walk, or after wait s), how fast
    garage: { x0: 6, x1: 60, top: 142, walk: 72, wait: 1.8, swing: .28 },
    arena: { limit: .98, entry: 1.15, lowest: -.2, keep: [.5, .86], drift: .36, enterSpeed: .68, wadSpeed: .68,
      swoopFirst: [3.4, 5], swoopEvery: [3.4, 5], throwFirst: [1.4, 2.4], ground: u => ground(u) }
  };
  const arena = UnrugArena(core, STAIRS.arena);
  const { PXu, PYh } = arena;
  const UX = x => (x / 2 - 120) / arena.ARENA.width, HY = y => (240 - y) / 280;
  let R, bull, Q, cur = SECTIONS[0], g = core.g;

  function groundAt(sec, x) {
    const p = sec.path; x = clamp(x, p[0][0], p[p.length - 1][0]);
    for (let i = 1; i < p.length; i++) if (x <= p[i][0]) { const [x0, y0] = p[i - 1], [x1, y1] = p[i]; return lerp(y0, y1, (x - x0) / (x1 - x0 || 1)); }
    return p[p.length - 1][1];
  }
  function ground(u) { return HY(groundAt(cur, PXu(u))); }
  const feetY = () => PYh(ground(bull.u) + bull.jh);
  const floorName = f => f === 'G' ? 'GROUND FLOOR' : f + ({ 1: 'ST', 2: 'ND', 3: 'RD' }[+f % 100 > 10 && +f % 100 < 14 ? 0 : +f % 10] || 'TH') + ' FLOOR';
  const topY = sec => Math.min(...sec.path.map(q => q[1]));
  const entryX = sec => sec.dir > 0 ? 24 : W - 24;
  const landing = sec => sec.path[sec.path.length - 1][1];

  // ---------- the bull's own poses here ----------
  const B = UnrugBull, paintAll = o => { const r = {}; for (const k in o) r[k] = B.paint(o[k]); return r; };
  const SIDE = paintAll(B.SIDES), BARE = paintAll(B.SIDES_BARE), MOVE = paintAll(B.MOVES), RAISED = B.paint(B.RAISED);
  const SF = B.SIDE_FEET, MF = B.MOVES_FEET, RF = B.RAISED_FEET;
  // the fanfare's length: every bar before its silent one
  const FAN = window.UnrugStairsMusic && window.UnrugStairsMusic.stairsFanfare;
  const FANL = FAN ? FAN.order.slice(0, -1).reduce((n, p) => n + FAN.patterns[p].bars * 16, 0) * 60 / FAN.bpm / 4 : 4.44;

  // ---------- the run ----------
  function newRun(r, b, at) {
    R = r; bull = b; R.speed = 0; R.phase = 'boss';   // 'boss': the core lets him fire, as on the rides
    if (at) { R.souls = R.shown = at.souls || 0; R.continues = (at.continues || 0) + (at.transfer ? 0 : 1); }
    arena.newRun(R, bull);
    Q = R.stairs = { t: 0, st: 'play', stT: 0, si: 0, secT: 0, katana: !!(at && at.katana), said: {}, says: [], glass: Infinity, taken: Infinity,
      script: 0, scriptT: 0, preDone: false, exitOpen: false, tapeCut: null, whip: null, from: 0, step: 0, done: {} };
    startSection(at && at.section || 0);
  }
  function startSection(i, keepHearts) {
    const sec = SECTIONS[i];
    cur = sec; Object.assign(Q, { si: i, secT: 0, script: 0, scriptT: 0, preDone: false, exitOpen: false, tapeCut: null, glass: Infinity, taken: Infinity });
    if (i === 1 && Q.katana) Q.glass = Q.taken = -99;   // back after the Rugmergency: the cabinet's empty
    Q.garageShut = i === 0 ? Infinity : -99;   // section 1 opens with the garage door open behind him (the story's last still)
    R.arena.enemies = []; R.arena.thrown = []; R.shots = []; R.arena.bare = !Q.katana; R.arena.pose = null;
    bull.u = UX(entryX(sec)); bull.facing = sec.dir; bull.jh = 0; bull.jv = 0; bull.kick = 0;
    if (!keepHearts) R.hearts = TUNE.hearts;   // full hearts on a start or a continue; the whips up carry them, the katana refills
    checkpoint();
    emit('stairs_section', { section: i + 1 });
  }
  // a continue starts the section over (after the Rugmergency, with the katana)
  function checkpoint() {
    // before the katana the checkpoint stays at the start (so a continue starts the stairwell over, with the souls and the
    // seeded stream he came in with); from the katana on, it's the landing he's on
    if (!Q.katana && Q.si > 0) return;
    core.setCheckpoint({ stage: 'stairs', section: Q.si, katana: Q.katana, souls: R.souls, continues: R.continues, seedState: core.seedState(), runSeed: core.runSeed() });
  }
  // the cue for where he is: slammed in from the top, or a layer more on the next bar
  function music(slam) {
    const n = Q.si === 2 ? 2 : Q.katana ? 1 : 0;
    if (slam) Snd.music('stairs', { slam: true, stems: STAIRS.stems[n] }); else Snd.stems(STAIRS.stems[n]);
  }
  function opening() { music(true); }
  // a prompt in play (the core's strip at the top), once a run, after a moment
  function say(text, delay = 0) { if (Q.said[text]) return; Q.said[text] = true; Q.says.push({ text, at: Q.t + delay }); }

  // ---------- carpshits ----------
  function fly(side, hover, o = {}) {
    const e = arena.spawn('flyer', { side });
    e.hover = hover / 280; e.h = e.hover + ground(e.u);
    if (o.thrower || o.pitcher) e.nextThrow = o.throwFirst || rr(...STAIRS.fly.throwFirst); else e.shy = true;   // the rest throw half as often
    if (o.pitcher) { e.swoopT = Infinity; e.keep = rr(...STAIRS.pitcher.keep); e.throwEvery = STAIRS.pitcher.every; }   // they hang back and keep throwing
    if (o.swoopy) e.swoopT = STAIRS.fly.swoopy;
    if (o.prompt) say(o.prompt, .8);
    return e;
  }
  // a tumbler: from the top of the flight, bouncing down the stairs at him (jump it, cut it or shoot it)
  function roll() {
    const T = STAIRS.tumbler, u = (cur.dir > 0 ? 1 : -1) * 1.12;
    const e = { kind: 'tumbler', u, pu: u, h: ground(u) + T.h, dir: -cur.dir, spin: 0, age: 0, hit: 0, dead: false, radius: T.radius, tall: T.tall, step: stepRoll, draw: drawRoll };
    R.arena.enemies.push(e); emit('arena_spawn', { kind: 'tumbler' }); return e;
  }
  function stepRoll(e, dt) {
    const T = STAIRS.tumbler;
    e.age += dt; e.u += e.dir * T.speed * dt; e.spin += e.dir * dt * 9;
    e.h = ground(clamp(e.u, -1, 1)) + T.h + Math.abs(Math.sin(e.age * 9)) * T.hop;
    if (arena.touches(e.u, e.h, T.reach) && core.hurtBull(1, 'tumbler')) bull.kick = (Math.sign(bull.u - e.u) || -e.dir) * 1.0;
    if (Math.abs(e.u) > 1.25) e.dead = true;   // gone off the bottom of the screen
  }
  function stepScript(dt) {
    const pre = cur.cab && !Q.katana, sc = pre ? cur.pre : cur.script, L = R.arena.enemies;
    if (pre && Q.preDone) return;
    Q.scriptT += dt;
    while (Q.script < sc.length) {
      const s = sc[Q.script];
      if (s[0] === 'wait') { if (Q.scriptT < s[1]) return; Q.scriptT = 0; Q.script++; continue; }
      if (s[0] === 'clear') { if (L.length) return; Q.scriptT = 0; Q.script++; continue; }
      if (s[0] === 'fly') fly(s[1], s[2], s[3] || {});
      if (s[0] === 'roll') roll();
      if (s[0] === 'prompt') say(s[1], .6);
      Q.script++;
    }
    if (pre) { if (!L.length) Q.preDone = true; return; }   // the cabinet wakes
    if (!Q.exitOpen && !L.length) {
      Q.exitOpen = true; emit('stairs_cleared', { section: Q.si + 1 });
      if (cur.tape && Q.tapeCut == null) say('SLASH THE TAPE', .2);   // the way on is the arrow's job, once there is one
    }
  }

  // ---------- the Rugmergency ----------
  // the hearts he's missing circle him in the gold light, then each flies to its place in the HUD: the first lands at
  // `land` s into the item get, one more every `gap`, each flight `fly` s long
  const GIFT = { land: 1.9, gap: .45, fly: .6, orbit: 3.4, radius: 17 };
  const cabReady = () => Q.preDone && Q.glass === Infinity && Q.st === 'play';
  const raising = () => Q.st === 'rug' && Q.stT >= STAIRS.rug.raise && Q.stT < STAIRS.rug.raise + FANL;
  // a bolt through the glass, once the cabinet's ready: it shatters, the music stops dead, the carpshits left go
  function hitGlass() {
    if (!cur.cab || !cabReady()) return;
    const c = cur.cab, x0 = c.x + 6, x1 = c.x + 54, y0 = c.floor - 62, y1 = c.floor - 10;
    for (const s of R.shots) {
      const x = PXu(s.u), y = PYh(s.h);
      if (x > x0 - 6 && x < x1 + 6 && y > y0 && y < y1) { R.shots = R.shots.filter(o => o !== s); breakGlass(); return; }
    }
  }
  function breakGlass() {
    Q.glass = Q.secT; Q.st = 'rug'; Q.stT = 0; Q.from = PXu(bull.u); Q.done = {};
    Snd.music(null, { hard: true }); Snd.play('stairGlass');
    arena.clearThreats('clear'); R.banner = null; R.arena.locked = true;
    emit('stairs_glass');
  }
  function stepRug(dt) {
    const T = STAIRS.rug, k = Q.stT, cx = cur.cab.x + 30, to = cx + 26;
    R.arena.locked = true;
    if (k < T.walk) R.arena.pose = { img: BARE.aim, feet: SF, face: Math.sign(cx - Q.from) || -1 };
    else if (k < T.grab) {
      bull.u = UX(lerp(Q.from, to, ease(span(k, T.walk, T.grab)))); Q.step += dt * 11;
      R.arena.pose = { img: BARE['run' + (Math.floor(Q.step) % 4)], feet: SF, face: Math.sign(cx - Q.from) || -1 };
    } else if (k < T.raise) { bull.u = UX(to); R.arena.pose = { img: BARE.wind, feet: SF, face: -1 }; }
    if (k >= T.grab && !Q.done.grab) { Q.done.grab = true; Q.taken = Q.secT; Snd.play('stairShing'); }
    if (k >= T.raise && !Q.done.raise) {
      Q.done.raise = true; Snd.music('stairsFanfare', { slam: true }); emit('stairs_katana');
      Q.gift = { n: Math.max(0, TUNE.hearts - R.hearts), landed: 0 };   // the hearts he's missing, given to him during the item get
      R.banner = { text: 'RUGMERGENCY KATANA', t: -.25, dur: FANL - .3, top: true };
    }
    if (raising()) {
      // the item get: he turns to us with the katana up (a little hop), at the cabinet
      const r = k - T.raise, hop = r < .12 ? Math.round(Math.sin(r / .12 * Math.PI) * 6) : 0;
      bull.u = UX(cx); R.arena.pose = { img: RAISED, feet: { x: RF.x, y: RF.y + hop }, face: 1 };
    }
    if (Q.gift) {
      // each heart lands (one more in the HUD, a ping) as its flight ends
      for (let i = Q.gift.landed; i < Q.gift.n; i++) {
        if (k - T.raise < GIFT.land + i * GIFT.gap) break;
        Q.gift.landed = i + 1; R.hearts = Math.min(TUNE.hearts, R.hearts + 1); Snd.play('coffee');
      }
    }
    if (k >= T.raise + FANL) {
      // the cue slams back in a layer up, and the first one with the katana comes
      Q.st = 'play'; Q.katana = true; R.arena.bare = false; R.arena.pose = null; R.arena.locked = false;
      bull.u = UX(to); bull.facing = -1; Q.script = 0; Q.scriptT = 0;
      R.hearts = TUNE.hearts;   // the Rugmergency refills him
      music(true); say('SLASH', .3); checkpoint();
    }
  }

  // ---------- the door ----------
  function startDoor() {
    Q.st = 'door'; Q.stT = 0; Q.from = PXu(bull.u); Q.done = {}; R.arena.locked = true; R.banner = null;
    Snd.music(null, { hard: true }); Snd.play('stairHum', STAIRS.door.kick - STAIRS.door.walk);
    emit('stairs_door');
  }
  function stepDoor(dt) {
    const D = STAIRS.door, k = Q.stT, walking = k < D.walk && Math.abs(Q.from - D.stand) > 4;
    if (k < D.walk) { bull.u = UX(lerp(Q.from, D.stand, ease(k / D.walk))); if (walking) Q.step += dt * 11; }
    // catching his breath: bent over, hands on his hips, heaving; then straight up and ready before the line
    const huff = !walking && k >= D.walk && k < D.up, rise = k >= D.up && k < D.up + D.rise;
    Q.breath = k >= D.brace ? null : huff ? 'huff' : rise ? 'rise' : walking ? 'walk' : 'ready';
    const img = k >= D.kick ? MOVE.kick : k >= D.brace ? MOVE.brace : walking ? SIDE['run' + (Math.floor(Q.step) % 4)]
      : huff ? MOVE['huff' + (Math.floor((k - D.walk) / .42) % 2)] : rise ? MOVE.rise : SIDE.aim;
    const feet = Object.values(MOVE).includes(img) ? MF : SF;
    R.arena.pose = { img, feet: { x: feet.x, y: feet.y }, face: 1 };
    if (k >= D.line && !Q.done.line) { Q.done.line = true; core.bark('door'); }
    if (k >= D.brace && !Q.done.brace) { Q.done.brace = true; Snd.play('stairCreak'); }
    if (k >= D.kick && !Q.done.kick) {
      // the band slams in on the kick: the 13th Floor's own opening, so it doesn't start over when the floor does
      Q.done.kick = true; Snd.play('stairKick'); core.floors.floor13.musicDrop(); emit('stairs_kick');
    }
    if (k >= D.impact && !Q.done.impact) { Q.done.impact = true; Snd.play('stairImpact'); }
    if (k >= D.hall) {
      R.phase = 'win'; R.endT = R.t;
      emit('stairs_clear', { amount: R.t });
      // the 13th Floor's meter starts at 0 (its 90 are its own): the stairwell's souls are banked, still in the run's
      // total, and go on with it when he leaves the floor
      core.travel('floor13', { fromStairs: true, souls: 0, banked: R.souls });
    }
  }
  const doorOpen = () => Q.st === 'door' ? ease(span(Q.stT, STAIRS.door.kick, STAIRS.door.kick + .14)) : 0;

  // ---------- the whip up between sections ----------
  function startWhip() {
    const from = Q.si, to = from + 1;
    Q.whip = { t: 0, from, a: +SECTIONS[from].high || 1, b: +SECTIONS[to].low, souls: R.souls };
    Snd.play('stairWhoosh');
    startSection(to, true);
    Q.st = 'whip'; R.arena.locked = true;
    if (to === 2) music(false);   // the last flights: power chords and the build, on the next bar
  }

  // ---------- one tick ----------
  function update(dt) {
    if (R.phase === 'win') return;
    if (R.phase === 'dead') { updateFx(dt); if (R.phaseT > STAIRS.deadWait) endRun('rugged'); return; }
    Q.t += dt; Q.stT += dt; Q.secT += dt;
    // the prompts, each when it's due
    for (const p of Q.says) if (Q.t >= p.at) { p.done = true; R.banner = { text: p.text, t: 0, dur: STAIRS.prompt, pull: true }; }
    Q.says = Q.says.filter(p => !p.done);
    if (Q.st === 'whip') {
      Q.whip.t += dt;
      if (Q.whip.t >= STAIRS.whip) { Q.whip = null; Q.st = 'play'; R.arena.locked = false; }
    } else if (Q.st === 'rug') stepRug(dt);
    else if (Q.st === 'door') { stepDoor(dt); if (R.phase === 'win') return; }
    else stepScript(dt);
    // the garage door swings shut behind him once he's on his way (or after a moment)
    if (Q.si === 0 && Q.garageShut === Infinity && (PXu(bull.u) > STAIRS.garage.walk || Q.secT > STAIRS.garage.wait)) { Q.garageShut = Q.secT; Snd.play('stairShut'); }
    arena.update(dt, Q.st === 'play');
    if (R.phase === 'dead') return;
    if (Q.st !== 'play') return;
    hitGlass();
    // with the katana, the first paper thrown in section 2: knock it back
    if (Q.si === 1 && Q.katana && R.arena.thrown.some(p => !p.friendly)) say('SLASH IT BACK');
    // the tape: cut by a slash in reach; until then he can't pass it
    const tp = cur.tape;
    if (tp && Q.tapeCut == null) {
      if (bull.slash >= 0 && bull.slash < TUNE.deflectWindow && arena.near(UX(tp.x), HY(tp.floor - 40), .05)) {
        Q.tapeCut = Q.secT; Snd.play('cut'); emit('stairs_tape');
        if (Q.exitOpen) R.banner = null;
      } else bull.u = Math.max(bull.u, UX(tp.x + 10));
    }
    if (Q.exitOpen && bull.jh <= 0) {
      if (cur.door && PXu(bull.u) > STAIRS.door.at) startDoor();
      else if (!cur.door && (!tp || Q.tapeCut != null) && bull.u * cur.dir >= arena.ARENA.limit - .005) startWhip();
    }
  }

  // ---------- drawing: the stairwell ----------
  const canvas = (w, h) => { const c = A.canvas(w, h), x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; };
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  const words = (c, fn) => { c.save(); c.scale(2, 2); fn(); c.restore(); };   // the game's letters, in its own units
  function glow(c, x, y, r, col, a) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a;
    const gr = c.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  function blocks(c, x0, y0, x1, y1, base, mortar, hi) {
    c.fillStyle = base; c.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let y = y0, row = 0; y < y1; y += 12, row++) {
      c.fillStyle = mortar; c.fillRect(x0, y, x1 - x0, 1); c.fillStyle = hi; c.fillRect(x0, y + 1, x1 - x0, 1);
      for (let x = x0 + (row % 2 ? 14 : 0); x < x1; x += 28) { c.fillStyle = mortar; c.fillRect(x, y, 1, Math.min(12, y1 - y)); }
    }
  }
  // the section's backdrop, drawn once: block walls and the red dado, the lamp's bracket, the floor's number stencilled
  // big, the stairs (a step every 16 px with a yellow nosing) and landings, rails up the flights, the floor plates
  const BGS = {};
  function backdrop(sec) {
    if (BGS[sec.n]) return BGS[sec.n];
    const cv = canvas(W, H), c = cv.getContext('2d');
    blocks(c, 0, 0, W, 150, '#3d3b47', '#2c2a34', '#46444f');
    blocks(c, 0, 150, W, H, '#5a2128', '#43171d', '#64262d');
    c.fillStyle = '#b88a2a'; c.fillRect(0, 147, W, 4); c.fillStyle = '#7a5a1c'; c.fillRect(0, 151, W, 1);
    c.save(); c.globalAlpha = .2; txt(c, sec.big, sec.bigX, 14, '#e8dcc0', 11); c.restore();
    const lx = sec.lamp;
    c.fillStyle = '#22202a'; c.fillRect(lx - 7, 10, 14, 4); c.fillStyle = '#4a4a5a'; for (const dx of [-5, -1, 3]) c.fillRect(lx + dx, 14, 1, 9);
    const p = sec.path;
    c.fillStyle = '#25232c'; c.beginPath(); c.moveTo(0, H); for (const [x, y] of p) c.lineTo(x, y + 4); c.lineTo(W, H); c.closePath(); c.fill();
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      if (y0 === y1) { c.fillStyle = '#5c5966'; c.fillRect(x0, y0, x1 - x0, 6); c.fillStyle = '#c9a227'; c.fillRect(x0, y0, x1 - x0, 2); continue; }
      for (let x = x0; x < x1; x += 16) {
        const y = Math.round(Math.min(groundAt(sec, x), groundAt(sec, Math.min(x1, x + 16))));
        c.fillStyle = '#5c5966'; c.fillRect(x, y, 16, 4); c.fillStyle = '#c9a227'; c.fillRect(x, y, 16, 1); c.fillStyle = '#25232c'; c.fillRect(x, y + 4, 16, H - y);
      }
      c.fillStyle = '#8a93a6'; for (let x = x0; x < x1; x += 2) c.fillRect(x, groundAt(sec, x) - 42, 2, 2);
      for (let x = x0 + 8; x < x1; x += 56) { c.fillStyle = '#5a6070'; c.fillRect(x, groundAt(sec, x) - 42, 2, 42); }
      const topX = y1 < y0 ? x1 : x0, topYg = Math.min(y0, y1), dirX = y1 < y0 ? 1 : -1;
      c.fillStyle = '#8a93a6'; c.fillRect(Math.min(topX, topX + dirX * 14), topYg - 42, 14, 2);
      c.fillStyle = '#6a7284'; c.fillRect(topX + dirX * 14 - (dirX < 0 ? 0 : 2), topYg - 42, 3, 42);
    }
    // the floor plates on the landings' walls: the low floor and the high one (the 13th's is the door's own sign)
    const plate = (t, x, y) => words(c, () => { const w = textWidth(t) + 6; rect(c, x / 2 - w / 2 - 1, y / 2, w + 2, 9, '#1a1418'); rect(c, x / 2 - w / 2, y / 2 + 1, w, 7, '#d8d0b8'); txt(c, t, x / 2, y / 2 + 2, '#1a1418', 1, 'center'); });
    const lowX = sec.n === 1 ? 122 : sec.dir > 0 ? 64 : W - 64,   // section 1's clear of the garage door
      highX = sec.dir > 0 ? W - 64 : 150;
    plate(floorName(sec.low), lowX, groundAt(sec, lowX) - 110);
    if (!sec.door) plate(floorName(sec.high), highX, sec.dir < 0 ? 30 : Math.max(36, groundAt(sec, highX) - 100));
    BGS[sec.n] = cv; return cv;
  }

  // ---------- the cabinet: BREAK GLASS IN CASE OF RUGMERGENCY ----------
  function cabinet(c, cab) {
    const x = cab.x, y = cab.floor - 68, w = 60, h = 62, t = Q.secT;
    c.fillStyle = '#1a1418'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
    c.fillStyle = '#b52a22'; c.fillRect(x, y, w, h); c.fillStyle = '#e04a3a'; c.fillRect(x, y, w, 2); c.fillRect(x, y, 2, h);
    c.fillStyle = '#26202a'; c.fillRect(x + 6, y + 6, w - 12, h - 12);
    if (t < Q.taken) {   // the katana on two pegs
      c.fillStyle = '#4a4a5a'; c.fillRect(x + 12, y + 30, 3, 6); c.fillRect(x + w - 15, y + 30, 3, 6);
      c.fillStyle = '#1c1c28'; c.fillRect(x + 9, y + 28, 14, 3); c.fillStyle = '#e3a733'; c.fillRect(x + 22, y + 26, 3, 7);
      c.fillStyle = '#c4ccda'; c.fillRect(x + 25, y + 28, 26, 3); c.fillStyle = '#eef2fa'; c.fillRect(x + 25, y + 28, 26, 1);
    }
    if (t < Q.glass) {   // the glass, with a sheen; dark until the cabinet's ready
      c.save(); c.globalAlpha = .28; c.fillStyle = '#9fd8ff'; c.fillRect(x + 6, y + 6, w - 12, h - 12); c.restore();
      c.save(); c.globalAlpha = .55; c.fillStyle = '#e8f6ff'; for (let i = 0; i < 10; i++) c.fillRect(x + 12 + i, y + 40 - i * 2, 2, 2); c.restore();
      if (!cabReady()) { c.save(); c.globalAlpha = .55; c.fillStyle = '#0b0910'; c.fillRect(x + 6, y + 6, 48, 50); c.restore(); }
    } else {
      c.fillStyle = '#bfe4ff'; const r = rng(3);   // a ragged edge left in the frame
      for (let i = 0; i < 14; i++) { const e = i % 4, k = r(); const px = e < 2 ? x + 6 + k * (w - 12) : e === 2 ? x + 6 : x + w - 9, py = e === 0 ? y + 6 : e === 1 ? y + h - 9 : y + 6 + k * (h - 12); c.fillRect(px, py, 3, 3); }
      const k = t - Q.glass;
      if (k < .12) { c.save(); c.globalAlpha = 1 - k / .12; c.fillStyle = '#ffffff'; c.fillRect(x, y, w, h); c.restore(); }
      // the shards, flying out and down to the landing
      const s = rng(7), fl = cab.floor;
      if (k >= 0 && k < 4) for (let i = 0; i < 22; i++) {
        const sx = x + 6 + s() * (w - 12), sy = y + 8 + s() * (h - 16), vx = (s() - .3) * 220, vy = -60 - s() * 140, sz = 2 + Math.floor(s() * 3), spin = s() * 6;
        let px = sx + vx * k, py = sy + vy * k + 420 * k * k;
        if (py > fl) { const tl = (-vy + Math.sqrt(vy * vy + 4 * 420 * (fl - sy))) / 840; px = sx + vx * tl; py = fl - 1; }
        c.fillStyle = (Math.floor(k * 20 + spin) % 3) && py < fl - 1 ? '#e8f6ff' : '#8fc4e8'; c.fillRect(Math.round(px), Math.round(py), sz, py < fl - 1 ? sz : 1);
      }
    }
  }
  // its sign: dark and dead until the cabinet's ready, then lit from inside like an exit sign (drawn with the glow)
  function cabSign(c, cab, on) {
    const x = cab.x - 70, y = cab.floor - 120;
    words(c, () => {
      const X = x / 2, Y = y / 2, cx = X + 50;
      rect(c, X, Y, 100, 22, on ? '#ffd9c0' : '#5a564e'); rect(c, X + 1, Y + 1, 98, 20, on ? '#e0281e' : '#3a1614');
      txt(c, 'BREAK GLASS IN CASE OF', cx, Y + 3, on ? '#fff6e2' : '#7a5a50', 1, 'center');
      txt(c, 'RUGMERGENCY', cx, Y + 10, on ? '#ffe066' : '#7a6a3a', 2, 'center');
    });
    if (on) glow(c, cab.x + 30, y + 22, 90, '#ff3020', .22);
  }
  // caution tape criss-crossed over the way up, from a post at the top of the flight to a bracket on the wall: whole,
  // then cut, each strip parting in the middle and dropping
  function drawTape(c, tp) {
    const x0 = 4, x1 = tp.x, yb = tp.floor - 6, yt = tp.floor - 58;
    c.fillStyle = '#5a6070'; c.fillRect(x1 - 1, yt - 2, 4, tp.floor - yt + 2); c.fillStyle = '#8a93a6'; c.fillRect(x1 - 2, yt - 4, 6, 3); c.fillRect(x1 - 3, tp.floor - 2, 8, 2);
    c.fillStyle = '#4a4a5a'; c.fillRect(x0 - 2, yt, 3, 6); c.fillRect(x0 - 2, yb - 6, 3, 6);
    const strip = (ax, ay, bx, by) => {
      const len = Math.hypot(bx - ax, by - ay), rot = Math.atan2(by - ay, bx - ax);
      c.save(); c.translate(ax, ay); c.rotate(rot);
      c.fillStyle = '#e8c020'; c.fillRect(0, -3, len, 6); c.fillStyle = '#1a1418'; for (let x = 3; x < len - 2; x += 8) c.fillRect(x, -3, 4, 6);
      c.restore();
    };
    if (Q.tapeCut == null) { strip(x0, yb, x1, yt); strip(x0, yt, x1, yb); return; }
    const k = Math.min(1, (Q.secT - Q.tapeCut) / .5), mx = (x0 + x1) / 2, my = (yb + yt) / 2, sag = ease(k);
    strip(x1, yt, lerp(mx, x1 - 4, sag), lerp(my, yt + 24, sag)); strip(x1, yb, lerp(mx, x1 - 8, sag), lerp(my, yb, sag));
    strip(x0, yb, lerp(mx, x0 + 6, sag), lerp(my, yb, sag)); strip(x0, yt, lerp(mx, x0 + 2, sag), lerp(my, yt + 26, sag));
  }

  // ---------- the top landing: the end wall turning toward us, the door in it, its sign and lamp ----------
  const DOORX = { x0: 438, x1: 466 };
  function doorEnd(c, floor, open) {
    const quad = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(...pts[0]); for (const q of pts.slice(1)) c.lineTo(...q); c.closePath(); c.fill(); };
    quad([[428, 0], [W, 0], [W, floor + 8], [428, floor]], '#34323d');
    for (let y = 6; y < floor; y += 12) quad([[428, y], [W, y - 4], [W, y - 3], [428, y + 1]], '#2a2832');
    quad([[428, 150], [W, 146], [W, floor + 8], [428, floor]], '#4e1c22');
    quad([[428, 147], [W, 143], [W, 147], [428, 151]], '#b88a2a');
    c.fillStyle = '#1c1a22'; c.fillRect(426, 0, 3, floor + 2);
    c.fillStyle = '#5c5966'; c.fillRect(380, floor, 50, 6); c.fillStyle = '#c9a227'; c.fillRect(380, floor, 50, 2);
    const d = { x0: DOORX.x0, x1: DOORX.x1, t0: floor - 100, t1: floor - 108, b0: floor, b1: floor + 6 };
    quad([[d.x0 - 4, d.t0 - 5], [d.x1 + 4, d.t1 - 6], [d.x1 + 4, d.b1], [d.x0 - 4, d.b0]], '#a8a296');
    quad([[d.x0 - 1, d.t0 - 2], [d.x1 + 1, d.t1 - 3], [d.x1 + 1, d.b1], [d.x0 - 1, d.b0]], '#14121a');
    const k = 1 - clamp(open, 0, 1), lx = lerp(d.x0 + 2, d.x1, k);
    if (k > .02) {
      // the leaf: steel blue, a lit wire-glass window, a push bar, the 13 plate
      const tTop = lerp(d.t0 - 6, d.t1, k), tBot = lerp(d.b0 + 2, d.b1, k), at = (u, v) => [lerp(d.x0, lx, u), lerp(lerp(d.t0, tTop, u), lerp(d.b0, tBot, u), v)];
      quad([at(0, 0), at(1, 0), at(1, 1), at(0, 1)], '#5f6c8e');
      quad([at(.15, .1), at(.85, .1), at(.85, .38), at(.15, .38)], '#9fd8ff');
      quad([at(.15, .24), at(.85, .24), at(.85, .26), at(.15, .26)], '#4a6a8a');
      quad([at(.2, .45), at(.8, .45), at(.8, .54), at(.2, .54)], '#d8d0b8');
      quad([at(.05, .6), at(.95, .6), at(.95, .63), at(.05, .63)], '#c4ccda');
      quad([at(0, 0), at(.08, 0), at(.08, 1), at(0, 1)], '#7f8aa8');
    }
    // the sign on the back wall beside it: 13 — ACCOUNTING
    words(c, () => {
      const x = 150, y = Math.round((floor - 132) / 2);
      rect(c, x - 1, y - 1, 46, 26, '#1a1418'); rect(c, x, y, 44, 24, '#d8d0b8');
      txt(c, '13', x + 22, y + 3, '#1a1418', 2, 'center'); rect(c, x + 14, y + 15, 16, 1, '#1a1418');
      txt(c, 'ACCOUNTING', x + 22, y + 18, '#1a1418', 1, 'center');
    });
    const lx2 = 410, ly = floor - 128;
    c.fillStyle = '#22202a'; c.fillRect(lx2 - 6, ly, 12, 3); c.fillStyle = '#4a4a5a'; c.fillRect(lx2 - 4, ly + 3, 1, 7); c.fillRect(lx2 + 3, ly + 3, 1, 7);
    // a mat on the landing (it can say WELCOME)
    c.fillStyle = '#3a2418'; c.fillRect(392, floor - 1, 34, 3); c.fillStyle = '#6e4a2c'; c.fillRect(394, floor - 1, 30, 1);
  }
  function doorGlow(c, floor, open) {
    if (open > 0) { c.fillStyle = '#fff1c0'; c.beginPath(); c.moveTo(DOORX.x0, floor - 100); c.lineTo(DOORX.x1, floor - 108); c.lineTo(DOORX.x1, floor + 6); c.lineTo(DOORX.x0, floor); c.closePath(); c.fill(); }
    const lx2 = 410, ly = floor - 128;
    c.fillStyle = '#fff0b8'; c.fillRect(lx2 - 3, ly + 3, 6, 6); glow(c, lx2, ly + 5, 16, '#fff4c8', .7);
  }
  // the kicked-in door, seen from the front, flying at the camera
  function doorFront(c, cx, cy, w, h, rot) {
    c.save(); c.translate(cx, cy); c.rotate(rot); c.scale(w / 60, h / 120);
    c.fillStyle = '#14121a'; c.fillRect(-31, -61, 62, 122); c.fillStyle = '#4a5470'; c.fillRect(-30, -60, 60, 120);
    c.fillStyle = '#5a6684'; c.fillRect(-30, -60, 60, 3); c.fillStyle = '#3a4258'; c.fillRect(-26, -50, 52, 2); c.fillRect(-26, 10, 52, 2);
    c.fillStyle = '#9fd8ff'; c.fillRect(-10, -44, 20, 26); c.fillStyle = '#1a1418'; c.fillRect(-10, -31, 20, 1);
    c.fillStyle = '#d8d0b8'; c.fillRect(-14, -12, 28, 14); txt(c, '13', -7, -10, '#1a1418', 2);
    c.fillStyle = '#c4ccda'; c.fillRect(-26, 2, 52, 4);
    c.fillStyle = '#5a3a20'; c.fillRect(18, 30, 10, 6); c.fillStyle = '#2a1a10'; c.fillRect(20, 31, 6, 4);   // a boot print
    c.restore();
  }
  // a tumbler: a carpshit balled up, bouncing and spinning down the stairs
  function drawRoll(e) {
    const x = PXu(e.u), y = PYh(e.h), flap = Math.sin(R.t * 18), img = A.CARPF[flap > 0 ? 0 : 1];
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(e.spin); g.scale(e.dir, 1); g.scale(1 + flap * .06, 1 - flap * .1);
    g.drawImage(img, -arena.CW / 2, -arena.CH / 2, arena.CW, arena.CH); g.restore();
  }

  // ---------- the frame ----------
  // the door he came through, from the garage (the intro's last still, from the other side): open on the cool, navy
  // garage with its hanging lamp and a shelf of rolled rugs, then swinging shut; then a plain wooden door, GARAGE
  const garageK = () => Q.garageShut === Infinity ? 0 : ease(span(Q.secT - Q.garageShut, 0, STAIRS.garage.swing));
  function garageDoor(c, k) {
    const G = STAIRS.garage, x0 = G.x0, x1 = G.x1, w = x1 - x0, top = G.top, fl = groundAt(SECTIONS[0], x0);
    c.fillStyle = '#a8a296'; c.fillRect(x0 - 4, top - 5, w + 8, fl - top + 5); c.fillStyle = '#14121a'; c.fillRect(x0 - 1, top - 2, w + 2, fl - top + 2);
    if (k < 1) {
      // the garage through the doorway
      c.fillStyle = '#121a30'; c.fillRect(x0, top, w, fl - top);
      c.fillStyle = '#1c2540'; c.fillRect(x0, fl - 18, w, 18); c.fillStyle = '#26304e'; c.fillRect(x0, fl - 18, w, 1);
      c.fillStyle = '#2a3452'; c.fillRect(x0 + 2, top + 44, w - 4, 3);   // a shelf of rolled rugs
      for (const [rx, col] of [[x0 + 6, '#6a2a2a'], [x0 + 15, '#2a4a6a'], [x0 + 24, '#6a5a2a'], [x0 + 33, '#4a2a5a'], [x0 + 42, '#2a5a4a']]) { c.fillStyle = col; c.fillRect(rx, top + 36, 7, 8); c.fillStyle = '#121a30'; c.fillRect(rx + 3, top + 39, 1, 2); }
      c.fillStyle = '#3a4a6a'; c.fillRect(x0 + 13, top, 1, 12); c.fillStyle = '#9fb8e0'; c.fillRect(x0 + 10, top + 12, 7, 4);   // the hanging lamp
    }
    // the leaf: swung back into the garage, a sliver at the hinge; shutting, it swings across the doorway
    const lw = Math.round(lerp(4, w, k));
    c.fillStyle = '#5a3a20'; c.fillRect(x0, top, lw, fl - top); c.fillStyle = '#7a5230'; c.fillRect(x0 + 1, top + 1, Math.max(1, lw - 2), fl - top - 1);
    if (k >= 1) {
      c.fillStyle = '#6a4628'; c.fillRect(x0 + 5, top + 8, w - 10, 34); c.fillRect(x0 + 5, top + 50, w - 10, 40);   // panels
      c.fillStyle = '#c4ccda'; c.fillRect(x1 - 8, top + 52, 3, 3);   // the knob
      words(c, () => { const X = (x0 + x1) / 4, Y = (top + 18) / 2, pw = textWidth('GARAGE') + 4; rect(c, X - pw / 2 - 1, Y, pw + 2, 9, '#1a1418'); rect(c, X - pw / 2, Y + 1, pw, 7, '#d8d0b8'); txt(c, 'GARAGE', X, Y + 2, '#1a1418', 1, 'center'); });
    }
  }
  function garageGlow(c, k) {
    if (k >= 1) return;
    const G = STAIRS.garage, cx = (G.x0 + G.x1) / 2;
    c.fillStyle = '#d8e8ff'; c.fillRect(G.x0 + 11, G.top + 13, 5, 2); glow(c, G.x0 + 13, G.top + 14, 18, '#9fc0ff', .5 * (1 - k));
    glow(c, cx, G.top + 60, 40, '#3a5a9a', .25 * (1 - k));
  }

  // one section's lit things (offset in y for the whip): the backdrop, the cabinet, the tape, the door
  function drawSection(sec, oy) {
    g.save(); g.translate(0, oy);
    g.drawImage(backdrop(sec), 0, 0);
    if (sec === cur) {
      if (sec.cab) { cabinet(g, sec.cab); if (!cabReady()) cabSign(g, sec.cab, false); }
      if (sec.tape) drawTape(g, sec.tape);
    }
    if (sec.door) doorEnd(g, landing(sec), sec === cur ? doorOpen() : 0);
    if (sec === SECTIONS[0]) garageDoor(g, sec === cur ? garageK() : 1);
    g.restore();
  }
  function lampGlow(sec, oy) { g.fillStyle = '#fff0b8'; g.fillRect(sec.lamp - 4, 14 + oy, 8, 8); glow(g, sec.lamp, 18 + oy, 22, '#fff4c8', .7); }
  const whipK = () => ease(Q.whip.t / STAIRS.whip), whipOff = () => [Math.round(whipK() * H * 1.1), Math.round((whipK() - 1) * H * 1.1)];
  const half = fn => () => { g.save(); g.scale(.5, .5); fn(); g.restore(); };
  const draw = half(() => {
    if (Q.st === 'whip') {
      // the camera whips up a few floors: the last section drops away, the next comes down from above
      const [o0, o1] = whipOff();
      rect(g, 0, 0, W, H, '#0b0910');
      drawSection(SECTIONS[Q.whip.from], o0); drawSection(cur, o1);
      return;
    }
    drawSection(cur, 0);
    g.restore(); arena.draw(); g.save(); g.scale(.5, .5); sweat();
  });
  // sweat while he heaves: drops from his brow and his snout, falling a few pixels and fading (picture pixels, from his feet)
  function sweat() {
    const D = STAIRS.door;
    if (Q.st !== 'door' || Q.stT < D.walk + .1 || Q.stT > D.up + D.rise) return;
    const bx = Math.round(PXu(bull.u)), by = Math.round(PYh(ground(bull.u) + bull.jh)), k = Q.stT - D.walk;
    const drops = [[14, -58, 0], [19, -56, .33], [27, -39, .17], [24, -42, .66], [10, -55, .5]];
    g.save();
    for (const [dx, dy, ph] of drops) {
      const t = (k / .66 + ph) % 1, a = Math.min(1, (1 - t) * 2);
      g.globalAlpha = a; g.fillStyle = '#bfe6ff'; const dyy = by + dy + Math.round(t * t * 16);
      g.fillRect(bx + dx, dyy, 2, 3);
      g.fillStyle = '#ffffff'; g.fillRect(bx + dx, dyy + 1, 1, 1);
    }
    g.restore();
  }
  function glows() {
    g.save(); g.scale(.5, .5);
    if (Q.st === 'whip') { const [o0, o1] = whipOff(); lampGlow(SECTIONS[Q.whip.from], o0); lampGlow(cur, o1); g.restore(); return; }
    lampGlow(cur, 0);
    if (cur === SECTIONS[0]) garageGlow(g, garageK());
    if (cur.door) doorGlow(g, landing(cur), doorOpen());
    if (cur.cab) {
      if (cabReady()) {
        // ready: the sign lit, the cabinet's frame pulsing red, so you know to shoot it
        cabSign(g, cur.cab, true);
        const pu = .5 + .5 * Math.sin(R.t * 6), x = cur.cab.x, y = cur.cab.floor - 70;
        g.save(); g.globalAlpha = .55 + .45 * pu; g.strokeStyle = '#ff3a2a'; g.lineWidth = 2; g.strokeRect(x - 3, y - 1, 66, 67);
        g.globalAlpha = .3 + .3 * pu; g.strokeStyle = '#ff9a80'; g.lineWidth = 1; g.strokeRect(x - 5, y - 3, 70, 71); g.restore();
        glow(g, x + 30, y + 34, 60, '#ff4030', .18 * pu);
      }
      if (raising()) {
        // the item get: gold rays turning behind him (the renderer dims the rest and lights him), a glint up the blade
        const k = Q.stT - STAIRS.rug.raise, cx = cur.cab.x + 30, cy = cur.cab.floor - 90;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .22 * Math.min(1, k / .2);
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + k * .6; g.fillStyle = i % 2 ? '#ffd44a' : '#ff9a3a'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - .1) * 400, cy + Math.sin(a - .1) * 400); g.lineTo(cx + Math.cos(a + .1) * 400, cy + Math.sin(a + .1) * 400); g.closePath(); g.fill(); }
        g.restore();
        const hop = k < .12 ? Math.round(Math.sin(k / .12 * Math.PI) * 6) : 0, tipX = cx - 21, tipY = cur.cab.floor - hop - RF.y + 2, tw = Math.sin(k * 14) * .5 + .5;
        glow(g, tipX, tipY + 28 * (1 - (k * 1.4) % 1), 10, '#ffffff', .8);
        g.fillStyle = '#ffffff'; g.fillRect(tipX - 1, tipY - 6 - tw * 3, 2, 12 + tw * 6); g.fillRect(tipX - 6 - tw * 3, tipY - 1, 12 + tw * 6, 2);
      }
    }
    g.restore();
    arena.glows();
  }
  // the light in the stairwell this frame: the lamps, the door's, the open door, the cabinet, bolts and paper, the muzzle
  function lights(r) {
    const L = (x, y, cr, cg, cb) => r.light(x, y, 0, cr, cg, cb);
    if (Q.st === 'whip') { const [o0, o1] = whipOff(); L(SECTIONS[Q.whip.from].lamp, 26 + o0, 2.6, 2.1, 1.4); L(cur.lamp, 26 + o1, 2.6, 2.1, 1.4); return; }
    L(cur.lamp, 26, 2.6, 2.1, 1.4);
    if (cur === SECTIONS[0] && garageK() < 1) { const o = 1 - garageK(); L(30, 200, .25 * o, .4 * o, .8 * o); }   // the garage's cool light through the door
    if (cur.door) { const fl = landing(cur); L(410, fl - 118, 1.6, 1.3, .9); const o = doorOpen(); if (o) L(452, fl - 40, 3.2 * o, 2.9 * o, 2.2 * o); }
    if (cur.cab) {
      const c = cur.cab;
      if (Q.glass !== Infinity && Q.secT - Q.glass >= 0 && Q.secT - Q.glass < .25) L(c.x + 30, c.floor - 36, 2.5, 2.8, 3.2);
      if (cabReady()) { const pu = .5 + .5 * Math.sin(R.t * 6); L(c.x + 30, c.floor - 36, .4 + 1.1 * pu, .08 + .1 * pu, .06); L(c.x + 30, c.floor - 100, 1.2, .25, .15); }
      if (raising()) L(c.x + 30, c.floor - 70, 2.4, 1.9, 1.0);
    }
    for (const s of R.shots.slice(0, 6)) L(PXu(s.u), PYh(s.h), .3, .55, .9);
    for (const p of R.arena.thrown) L(PXu(p.u), PYh(p.h), p.friendly ? .15 : .5, p.friendly ? .3 : .16, p.friendly ? .5 : .08);
    if ((bull.aimT || 0) > .1 && Q.st === 'play') L(PXu(bull.u + (bull.facing || 1) * B.SIDE_MUZZLE.x / 220), PYh(ground(bull.u) + bull.jh + arena.ARENA.muzzleH), .7, .55, .3);
  }
  function view() {
    return { ambient: raising() ? lerp(STAIRS.ambient, STAIRS.dim, Math.min(1, (Q.stT - STAIRS.rug.raise) / .15)) : STAIRS.ambient };
  }
  // over the finished picture: the whip's floors going by, the door coming at the camera and the white flash
  function overlay() {
    if (Q.st === 'whip') {
      const w = Q.whip, n = Math.round(lerp(w.a, w.b, Math.min(1, w.t / (STAIRS.whip * .8))));
      g.save(); g.globalAlpha = Math.min(1, Math.sin(Math.PI * w.t / STAIRS.whip) * 2);
      rect(g, 88, 46, 64, 40, '#0a0810'); otxt(g, 'FLOOR', 120, 50, '#fff6e2', 1, 'center'); otxt(g, String(n), 120, 60, '#ffd44a', 4, 'center');
      g.restore(); return;
    }
    if (Q.st === 'rug' && Q.stT < STAIRS.rug.raise) caption('!');
    if (Q.st === 'rug' && Q.gift && Q.gift.n) giftHearts();
    if (Q.st === 'door' && Q.stT >= STAIRS.door.kick + .02) {
      const D = STAIRS.door, f = span(Q.stT, D.kick + .02, D.impact), ff = f * f, fl = landing(cur);
      g.save(); g.scale(.5, .5);
      doorFront(g, lerp(452, 240, ff), lerp(fl - 48, 135, ff), lerp(28, 560, ff), lerp(100, 1100, ff), lerp(-.5, .08, f) + Math.sin(f * 9) * .05);
      g.restore();
      if (Q.stT >= D.impact) rect(g, 0, 0, W / 2, H / 2, '#ffffff');
    }
  }
  // the hearts being given to him: circling at his chest, then flying up into the HUD (game units, over the lit picture)
  function giftHearts() {
    const r = Q.stT - STAIRS.rug.raise, G = Q.gift, hw = A.uw(A.HEART), hh = A.uh(A.HEART);
    const cx = arena.X(bull.u), cy = PYh(ground(bull.u)) / 2 - 24;
    g.save();
    for (let i = G.landed; i < G.n; i++) {
      const born = .35 + i * .12, lands = GIFT.land + i * GIFT.gap, t0 = lands - GIFT.fly;
      if (r < born) continue;
      const a = r * GIFT.orbit + i * Math.PI * 2 / G.n, ox = cx + Math.cos(a) * GIFT.radius, oy = cy + Math.sin(a) * 5 - Math.sin(a * .5 + i) * 2;
      const f = r < t0 ? 0 : ease(span(r, t0, lands)), slot = R.hearts + (i - G.landed);
      const tx = 4 + slot * 10 + hw / 2, ty = 3.5 + hh / 2;
      const x = lerp(ox, tx, f), y = lerp(oy, ty, f), grow = f ? 1 : Math.min(1, (r - born) / .25), depth = f ? 1 : .8 + .2 * Math.sin(a);
      g.globalAlpha = .5 * grow; g.globalCompositeOperation = 'lighter'; g.fillStyle = '#ff4a3a';
      g.beginPath(); g.arc(x, y, 6 * grow, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = grow;
      g.drawImage(A.HEART, Math.round(x - hw * depth / 2), Math.round(y - hh * depth / 2), Math.round(hw * depth), Math.round(hh * depth));
    }
    g.restore();
  }
  // his "!" when the glass goes: the core's caption, top left
  function caption(text) {
    const y = 21, w = textWidth(text) + 8;
    g.save(); g.globalAlpha = .75; rect(g, 2, y, w, 9, '#0a0810'); g.restore(); rect(g, 2, y, 1, 9, '#ffd44a'); txt(g, text, 6, y + 2, '#fff6e2');
  }
  // the arrow: a chunky gold arrow with a dark outline and a lit top edge (12 x 11, pointing right; the others turn it)
  const ARROW = ['.....oo.....', '.....oYo....', '.....oYYo...', 'ooooooYYYo..', 'ohhhhhhYYYo.', 'oYYYYYYYYYYo', 'oYYYYYYYYYo.', 'ooooooYYYo..', '.....oYYo...', '.....oYo....', '.....oo.....'];
  function arrowIcon(x, y, dir) {
    const R_ = ARROW.length, C_ = ARROW[0].length, col = { o: '#1a1018', Y: '#ffd44a', h: '#fff0a0' };
    for (let j = 0; j < R_; j++) for (let i = 0; i < C_; i++) {
      const c = ARROW[j][i]; if (c === '.') continue;
      const px = dir === 'left' ? C_ - 1 - i : dir === 'down' ? j : i, py = dir === 'down' ? i : j;
      rect(g, Math.round(x) + px, Math.round(y) + py, 1, 1, col[c]);
    }
  }
  function hud() {
    drawSoulsCounter();
    // the way on: a bobbing arrow once it's open (at the top of the flight, or over the door), no words
    if (Q.exitOpen && Q.st === 'play' && !(cur.tape && Q.tapeCut == null)) {
      const bob = Math.round(Math.sin(R.t * 6) * 1.5);
      if (cur.door) arrowIcon(226 - 6, (landing(cur) - 98) / 2 - 15 + bob, 'down');
      else arrowIcon(cur.dir > 0 ? W / 2 - 17 + bob : 5 - bob, topY(cur) / 2 - 26, cur.dir > 0 ? 'right' : 'left');   // at the edge it points to, at chest height above the top landing
    }
  }
  function shakeOffset() {
    if (Q.st !== 'door') return null;
    const k = (Q.stT - STAIRS.door.kick) / .25; if (k < 0 || k > 1) return null;
    const a = 4 * (1 - k), t = Q.stT;
    return [Math.round(Math.sin(t * 91) * a) / 2, Math.round(Math.cos(t * 77) * a * .6) / 2];
  }
  function fire() {
    const n = R.shots.length; arena.fire();
    if (bull.crouch) for (const s of R.shots.slice(n)) s.h -= 7 / 280;   // crouched, he fires from lower down
    return true;
  }
  const noop = () => {};
  return {
    id: 'stairs', tune: { scroll: 0, aisle: arena.ARENA.limit, move: .9, bossHP: 0 }, set: { flat: true },
    label: 'Unruggabull, side on, climbing the stairwell of RugCo Tower toward the 13th Floor.',
    lines: { spread: false },
    newRun, update, opening, resume: opening, use(x) { g = x; arena.use(x); },
    view, lights, shakeOffset, draw, glows, overlay, hud,
    fire, slashHits: arena.slashHits, canSlash: () => Q.katana && Q.st === 'play',
    muzzleXY: () => ({ x: arena.X(bull.u + (bull.facing || 1) * .12), y: arena.Y(ground(bull.u) + bull.jh + .14) }),
    soulFreed(f) { f.to = { x: 220, y: 7 }; },
    aim: noop, shotHits: () => false, shotFar: () => false, posOf: o => o, slash: noop, hurt: noop, blasterBack: noop,
    bonusBy: () => null, endPull: noop, cutRug: noop, draggedIn: noop, blowUp: noop,
    stageNo: () => Q.st === 'door' ? 4 : Q.si + 1, stageNames: { 1: 'Stairs: G to 1', 2: 'Stairs: 6 to 7', 3: 'Stairs: 12 to 13', 4: 'Stairs: the door' },
    pauseText: 'The stairs wait.',
    continueText: () => Q.katana ? 'Back to the landing with full hearts?' : 'Back to the start with full hearts?',
    clearCard: () => ({ title: 'The stairwell', text: '', rows: [['Souls', String(R.souls)]], note: '' }),
    STAIRS, SECTIONS, arena, ground, groundAt, UX, HY, startSection, startWhip, startDoor, breakGlass, fly, roll, cabReady, raising,
    get Q() { return Q; }, get cur() { return cur; }
  };
};
