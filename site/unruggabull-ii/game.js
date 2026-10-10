// Unruggabull II: Salvation for the Unrugged. This build is Floor 13, Accounting, and its boss, the Shredder.
// Classic script: art.js (UnrugArt) and audio.js (UnrugSound) load first.
//
// The corridor is fake 3D on a 240x135 canvas, seen from behind Unruggabull. Every thing has a lane u
// (-1 left wall, 1 right wall), a depth z (0 at the camera, 1 at the far wall) and a height h (0 floor,
// 1 ceiling); PX, FY and YH project them. The far wall is the Shredder, asleep until enough souls are freed.
(function () {
  'use strict';
  const A = UnrugArt, Snd = UnrugSound;
  const rect = A.rect, line = A.line, disc = A.disc, poly = A.poly, txt = A.txt, otxt = A.otxt, textWidth = A.textWidth;
  const $ = id => document.getElementById(id);
  const c = $('c');
  let g = c.getContext('2d');   // swapped for an offscreen canvas while the Shredder draws (see withShredder)
  const W = 240, H = 135;
  g.imageSmoothingEnabled = false;

  // ---------- projection ----------
  const VX = 120, HY = 52, FN = 131, CN = -12, HW = 112, ZN = -.07;
  const sc = z => 1 / (1 + 2 * z);
  const PX = (u, z) => VX + u * HW * sc(z);
  const FY = z => HY + (FN - HY) * sc(z);
  const CY = z => HY - (HY - CN) * sc(z);
  const YH = (z, h) => FY(z) - h * (FY(z) - CY(z));
  const BACK = { x0: Math.round(PX(-1, 1)), x1: Math.round(PX(1, 1)), y0: Math.round(CY(1)), y1: Math.round(FY(1)) };
  const mod1 = v => ((v % 1) + 1) % 1;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const quadF = (gg, col, u0, u1, z0, z1, h = 0) => poly(gg, col, [[PX(u0, z0), YH(z0, h)], [PX(u1, z0), YH(z0, h)], [PX(u1, z1), YH(z1, h)], [PX(u0, z1), YH(z1, h)]]);

  // ---------- tuning ----------
  const TUNE = {
    hearts: 5,
    move: 1.5,              // lanes a second
    aisle: .6,              // how far from the middle he can go
    runner: .3,             // half-width of the runner rug
    jumpH: .2, jumpT: .65,  // jump height (of the hall) and airtime
    fireEvery: .2, shotSpeed: 2.2, aimCone: .38,
    charges: 20, recharge: .5, // the blaster holds 20 shots and gets one back every half second, like the first game's
    spreadT: 10, coffeeDrop: .2, rowH: .055,
    slashT: .2, slashCd: .32, slashReach: .19, slashWide: .34, deflectWindow: .2,
    hurtInv: 1.7,
    scroll: .2,             // walking speed down the hall, depth a second
    pullSpeed: .3, recover: .5, mouth: .85,
    goal: 90,               // souls that wake the Shredder
    wadTime: 1.25, wadLead: .2, throwChance: .6,
    moveT: 13, moveEvery: 1.15, moveClean: 10,   // moving day: how long, an obstacle this often, and the bonus for a clean run
    darkT: 10,              // lights out in the hall: kills in the dark free double souls
    powerSaveT: 7,          // the Shredder's blackout between phases 2 and 3
    streakDrop: 10,         // a streak this long drops a Spread Shot
    bossHP: 100, shotDmg: .3, jamMult: 3, bundleDmg: 6, stapleDmg: 2, jamT: 2.6, bossSouls: 13,
    bundleT: [2.2, 1.6],    // how long a bundle takes to reach you: phase 1, then later phases
    tell: .45,              // the Shredder's mouth glows this long before each attack
    finish: { slow: 1.3, rate: .3 },   // the final hit: this many real seconds of slow motion, at this speed
    attackEvery: [1.4, 1.5, 1.4],   // seconds between the Shredder's attacks in each phase
    volley: { n: [3, 4, 5], gap: .24, dur: 1.4 }, scrapDmg: 3,   // quick scraps of paper (how many by phase), each worth 3 knocked back
    bossRows: { sheet: .45, carpet: .5 },   // how fast a paper jam sheet and a staple carpet cross the floor
    sprayEvery: .3, sprayT: 1.5,   // a side spray sends staples down both sides of the hall this often while the rug pulls, this slow
    rideJam: 1,             // cut the rug at the mouth and the jam lasts this much longer (in jamT), less further out
    // the runner in the boss fight pulls on a steady beat: how long each pull lasts and the gap after it, by phase
    bossPull: { dur: [2.4, 3.2, 3.8], gap: [6, 5.5, 5] },
    deflectCharge: 3,       // each deflect gives the blaster this many charges back
    // rallies, in every phase: the Shredder bats back a few of your returns (count, by phase), each quicker (serve ×
    // speedUp per return, down to fastest; your returns fly back in back × speedUp per return, down to backMin), then
    // misses, for smash + smashPer × its bat-backs. Once a phase, a marathon rally of this many.
    rally: { serve: 1, speedUp: .85, fastest: .45, count: [[1, 2], [2, 4], [3, 5]], marathon: [6, 7, 8], back: .3, backMin: .2, smash: 6, smashPer: 2, stun: 1.6 },
    // phase 3's power surge knocks the blaster up the rug (it flies this long); a smash rolls the rug back toward you at this
    // speed for this long, shoving anyone on it to the back of the hall and pinning them; the rewind attack rolls it back too
    surgeFly: .6, roll: { dur: 1.6, speed: .5, pin: .3 }, rewindT: 1.4,
    darkFormEvery: 2.2,     // lights out sends a formation this often
    switchEvery: 3, switchFlash: 1.4,   // lights out: a light switch glows on a wall this often; shoot it and the lights flash on this long, freezing every carpshit
    crouchH: .1, grip: .25, // crouched he's half height; gripping a pulling rug, it drags him at a quarter of the speed
    planeT: 1.6, planeDmg: 2,  // the Shredder's paper airplanes at head height: duck them, or slash them back
    wipeBy: .5,              // a formation wiped out before any of it gets this far down the hall pays a bonus
    // the souls' hint (the mega stream's first glimpse, saved for the roof): the first time the blaster comes back in the
    // Shredder's fight, this many souls leave the counter one after another (gap apart, each flying for fly seconds) and
    // go into the gun; the first two each add a stream. The streams hold for this many seconds of firing (so they can't
    // run out unseen), then drop off one by one, fade apart.
    soulHint: { souls: 3, gap: .6, fly: 1.4, hold: 4, fade: .6 }
  };
  // The hall comes in three beats, each with its own sign, props and trouble. The first two last `time` seconds
  // and end with an event; the last wakes the Shredder once you reach the goal (after `minT`, or at `max` regardless).
  const BEATS = [
    { sign: 'ACCOUNTS PAYABLE', time: 26, station: 'cub', temps: .6, fly: 3.8, boxes: true, decor: 'poster', music: 'tower', after: 'move' },
    { sign: 'ALL STAFF', time: 20, station: 'cub', temps: .35, formations: true, boxes: false, rows: 'chairs', decor: 'streamer', music: 'staff', after: 'dark' },
    { sign: 'COPY ROOM', minT: 18, max: 60, station: 'copier', temps: .65, fly: 3, boxes: true, rows: 'sheet', pulls: true, decor: 'stack', music: 'copy' }
  ];
  const JUMP_V = 4 * TUNE.jumpH / TUNE.jumpT, GRAV = 8 * TUNE.jumpH / (TUNE.jumpT * TUNE.jumpT);

  // ---------- random ----------
  // Everything that decides a run comes from one seeded stream, so a seed replays it exactly: #seed=42 in the
  // address, or the balance bots (tests/unruggabull-ii/). Cosmetic jitter (debris, sparks, decor, screen shake)
  // uses Math.random through fxr, so drawing or not drawing never changes a run.
  let seed = 0;
  function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const rr = (a, b) => a + (b - a) * rnd();
  const fxr = (a, b) => a + (b - a) * Math.random();
  const RUN = { force: null, seed: 0 };   // force: the seed for the next run (tests and bots)
  const hashTokens = () => location.hash.replace(/^#/, '').split('&').filter(Boolean);
  function hashSeed() { for (const tk of hashTokens()) { const m = /^seed=(\d+)$/.exec(tk); if (m) return +m[1]; } return null; }
  function pickSeed() { const h = hashSeed(); return (RUN.force != null ? RUN.force : h != null ? h : (Date.now() ^ Math.floor(Math.random() * 4294967296))) >>> 0; }
  // Balance bots listen here; in play it does nothing.
  let emitHook = null;
  const emit = (type, data) => { if (emitHook) emitHook(type, data || {}); };

  // ---------- run state ----------
  // state: title, intro, play, pause or over. R.phase inside a run: hall, wake, boss, win or dead.
  let state = 'title', R = null, bull = null;
  // Where a continue picks up: saved when the Shredder wakes, cleared when a floor starts over.
  let checkpoint = null;
  // A fresh floor, or (with a checkpoint) the copy room's end with the Shredder about to wake.
  function newRun(at) {
    RUN.seed = seed = pickSeed();
    R = {
      t: 0, dist: 0, speed: TUNE.scroll, phase: 'hall', phaseT: 0, souls: 0, hearts: TUNE.hearts,
      beat: 0, beatT: 0, event: null,
      cubs: [], decor: [], signs: [], flies: [], boxes: [], rows: [], pickups: [], shots: [], projs: [], fx: [],
      nextCubW: 1.1, nextDecorW: .6, nextFly: 5, nextForm: 2, formN: 0, nextBox: 16, nextRow: 5, fireT: 0, noPops: false,
      charge: TUNE.charges, rechargeT: 0, empty: 0, spread: 0, streak: 0, streakT: 0, bestStreak: 0, freeze: 0,
      pull: { st: 'idle', t: 0, dur: 0, next: 0, count: 0, snd: 0 }, roff: 0, cut: null,
      boss: { hp: TUNE.bossHP, st: 'sleep', ph: 1, atk: 0, atkN: 0, jam: 0, flash: 0, tick: 0, chomp: 0, spit: 0, hitSnd: 0, freed: 0, bar: 0, dark: null },
      banner: null, talk: null, bark: null, shake: 0, red: 0, endT: 0, continues: 0, events: {},
      shown: 0, meterPulse: 0, pulse: 0, pulseT: 0, ambT: 8,   // cosmetic: souls shown as their wisps land, the low-health pulse, office sounds
      armed: true, roll: null, zap: 0, forms: []   // the blaster in hand; the rug rolling back; the surge's flash; formations for wipes
    };
    bull = { u: 0, bz: 0, jh: 0, jv: 0, slash: -1, cd: 0, inv: 0, mouth: 0, spat: 0, step: 0, pin: 0 };
    if (at) {
      Object.assign(R, { beat: BEATS.length - 1, t: at.t, souls: at.souls, shown: at.souls, continues: at.continues + 1, bestStreak: at.bestStreak, speed: 0 });
      Object.assign(R.events, at.events, { bossAt: 0 });
      R.pull.count = 1;   // the runner has been explained already
      for (let w = .15; w < 1.05; w += .45) R.decor.push({ w, s: w < .5 ? -1 : 1, kind: 'stack', col: 0 });
    }
    for (let w = .2; w < 1.05; w += .36) addCubs(w, false);
    if (!at) addSign(.95, BEATS[0].sign);
  }
  const beat = () => BEATS[R.beat];

  // ---------- the hall: stations (cubicles or copiers) with temps, signs, decor ----------
  const cubZ = cb => cb.w - R.dist;
  const STATION_TOP = { cub: .38, copier: .32 };
  function addCubs(w, temps, both, chance) {
    const kind = beat().station;
    const sides = both || rnd() < .35 ? [-1, 1] : [rnd() < .5 ? -1 : 1];
    for (const s of sides) {
      const cb = { w, s, kind, top: STATION_TOP[kind], temp: null };
      if (temps && rnd() < (chance == null ? beat().temps : chance)) cb.temp = { cub: cb, st: 'hidden', t: 0, pop: 0, trig: rr(.45, .8), pops: 0, threw: false, dead: false };
      R.cubs.push(cb);
    }
  }
  // a light switch on the wall in lights out, about chest height
  const switchAt = sw => ({ u: sw.s * .9, z: sw.w - R.dist, h: .32 });
  // Where a target is, for aiming and hits. Temps live behind their station.
  function posOf(o) {
    if (o.sw) return switchAt(o);
    if (o.cub) return { u: o.cub.s * .8, z: cubZ(o.cub) + .06, h: o.cub.top - .07 + o.pop * .17 };
    return o;
  }
  // A sign drops from the ceiling at the start of each beat and event, so you can read where you are.
  // Styles: the beats' blue, moving day's hazard yellow, and lights out's neon, which glows in the dark.
  const SIGN_STYLE = { beat: ['#2a3c6a', '#fff6e2'], move: ['#e8b030', '#1a1418'], neon: ['#140f24', '#7fd4ff'] };
  function addSign(w, text, style) {
    const [bg, fg] = SIGN_STYLE[style || 'beat'];
    const img = A.canvas(A.textWidth(text) + 8, 11), b = img.getContext('2d');
    rect(b, 0, 0, img.width, 11, style === 'neon' ? fg : '#1a1418'); rect(b, 1, 1, img.width - 2, 9, bg); txt(b, text, 4, 3, fg);
    R.signs.push({ w: R.dist + w, img, text, born: R.t, neon: style === 'neon' });
  }
  function spawnHall(dt) {
    const B = beat(), ev = R.event && R.event.kind;
    while (R.dist + 1.05 >= R.nextCubW) {
      addCubs(R.nextCubW, R.t > 2.5); R.nextCubW += rr(.28, .38);
    }
    while (R.dist + 1.05 >= R.nextDecorW) {
      R.decor.push({ w: R.nextDecorW, s: Math.random() < .5 ? -1 : 1, kind: Math.random() < .25 && B.decor === 'poster' ? 'cooler' : B.decor, col: Math.random() });
      R.nextDecorW += fxr(.35, .6);
    }
    if (B.fly && !ev) {
      R.nextFly -= dt;
      if (R.nextFly <= 0) {
        R.flies.push({ u: rr(-.5, .5), z: 1, h: .42, hp: 2, ph: rnd() * 6, hit: 0, dead: false });
        R.nextFly = Math.max(1.4, B.fly - R.beatT * .03) * rr(.8, 1.2);
      }
    }
    if (B.formations && !ev) {
      R.nextForm -= dt;
      if (R.nextForm <= 0 && R.beatT < B.time - 5) { spawnFormation(['v', 'line', 'snake'][R.formN++ % 3]); R.nextForm = rr(3.8, 4.8); }
    }
    // Rows of rolling office chairs (or a paper jam's sheet) span the whole aisle: the only way past is over.
    if (B.rows && !ev) {
      R.nextRow -= dt;
      if (R.nextRow <= 0) { R.rows.push({ w: R.dist + 1.05, kind: B.rows, hit: 0 }); R.nextRow = rr(7, 10); }
    }
    // File boxes sit on the floor: jump them or step around.
    if (B.boxes && !ev) {
      R.nextBox -= dt;
      if (R.nextBox <= 0) {
        R.boxes.push({ w: R.dist + 1.05, u: [-.45, -.15, .15, .45][Math.floor(rnd() * 4)], hit: 0 });
        R.nextBox = rr(3.5, 5.5);
      }
    }
  }
  // Carpshits from the all-staff list arrive in formations: a V, a line with one gap, or a snake.
  function spawnFormation(kind) {
    const F = { n: 0, killed: 0, lost: false }, fid = (R.forms || (R.forms = [])).push(F);
    const add = (u, dz, extra) => { F.n++; R.flies.push(Object.assign({ u, z: 1 + dz, h: .36, hp: 1, ph: rnd() * 6, hit: 0, dead: false, form: kind, fid }, extra)); };
    if (kind === 'v') { const c0 = rr(-.3, .3); [[0, 0], [-.18, .07], [.18, .07], [-.36, .14], [.36, .14]].forEach(([o, dz]) => add(clamp(c0 + o, -.75, .75), dz)); }
    else if (kind === 'line') { const gap = Math.floor(rnd() * 5); [-.6, -.3, 0, .3, .6].forEach((u, i) => { if (i !== gap) add(u, 0, { high: true }); }); }   // a line comes in at head height: duck
    else { const ph = rnd() * 6; for (let i = 0; i < 6; i++) add(0, i * .08, { snake: ph - i * .7 }); }
  }
  // Between beats: moving day (furniture to get past, nothing to shoot) or the lights go out. Each drops its own
  // sign instead of a banner, so nothing big covers the hall.
  function startEvent(kind) {
    R.event = { kind, t: 0, dur: kind === 'move' ? TUNE.moveT : TUNE.darkT };
    if (kind === 'move') {
      // moving day: no one to shoot, the blaster's holstered, and Facilities has left everything in the hall
      Object.assign(R.event, { nextOb: 1.4, obN: 0, obs: [], clean: true, gap: 0 });
      for (const f of R.flies) { f.dead = true; poof(f.u, f.z, f.h); }
      addSign(.75, 'MOVING DAY', 'move');
      Snd.play('start'); live('Moving day: get past the furniture. Nothing to shoot.');
      bark('move');
    } else {
      // carpshits come out of the dark, only their eyes showing; everything freed in the dark counts double
      R.event.nextFly = 1.2; R.event.nextForm = TUNE.darkFormEvery; R.event.formN = 0; R.event.nextSwitch = 1.6; R.event.flash = 0; R.switches = [];
      addSign(.75, 'LIGHTS OUT ×2', 'neon');
      Snd.play('dark'); Snd.music('dark'); live('Lights out. Souls freed in the dark count double.');
      bark('dark');
      spawnFormation('snake');
    }
  }
  // The dark: lights out in the hall, or the Shredder's power saving mode. Either has t and dur.
  const blackout = () => (R.event && R.event.kind === 'dark') ? R.event : R.boss.dark;
  // A kill in the dark frees a second soul.
  function bonusBy() { return R.event && R.event.kind === 'dark' ? 'dark' : null; }
  const holstered = () => R.phase === 'hall' && R.event && R.event.kind === 'move';
  // Moving day's furniture, in order: walls of stacked boxes with one gap (zig-zag), chairs to jump, beams to duck.
  const MOVES = ['wall', 'wall', 'chairs', 'beam', 'wall', 'chairs', 'beam', 'wall', 'wall', 'beam', 'chairs'];
  const LANES = [-.45, -.15, .15, .45];
  function spawnMove(E) {
    const kind = MOVES[E.obN++ % MOVES.length], ob = { kind, w: R.dist + 1.05, hit: false, done: false };
    if (kind === 'wall') {
      // the gap swaps sides each time, so you zig-zag
      E.gap = E.gap < 2 ? 2 + Math.floor(rnd() * 2) : Math.floor(rnd() * 2);
      LANES.forEach((u, i) => { if (i !== E.gap) R.boxes.push({ w: ob.w, u, hit: 0, tall: true, ob }); });
    } else R.rows.push({ w: ob.w, kind, hit: 0, ob, v: kind === 'beam' ? 1e-6 : 0 });
    E.obs.push(ob);
  }
  function updateMove(E, dt) {
    E.nextOb -= dt;
    if (E.nextOb <= 0 && E.t < E.dur - 2.5) { spawnMove(E); E.nextOb = TUNE.moveEvery; }
    // each piece you get past cleanly frees a soul
    for (const ob of E.obs) if (!ob.done && ob.w - R.dist < bull.bz - .04) {
      ob.done = true;
      if (!ob.hit) free(PX(bull.u, bull.bz), YH(bull.bz, .3), 'move', 'move');
    }
  }
  function updateHall(dt) {
    R.beatT += dt;
    const B = beat();
    if (R.event) {
      const E = R.event;
      E.t += dt;
      if (E.kind === 'dark') {
        // eyes keep coming out of the dark, one hit each, and a V halfway through
        E.nextFly -= dt;
        if (E.nextFly <= 0 && E.t < E.dur - 2) { R.flies.push({ u: rr(-.5, .5), z: 1, h: .42, hp: 1, ph: rnd() * 6, hit: 0, dead: false }); E.nextFly = rr(.9, 1.3); }
        // a formation every couple of seconds: wipe them out in the dark for a big bonus
        E.nextForm -= dt;
        if (E.nextForm <= 0 && E.t < E.dur - 2.5) { spawnFormation(['v', 'line', 'snake'][E.formN++ % 3]); E.nextForm = TUNE.darkFormEvery; }
      }
      if (E.kind === 'dark') {
        // light switches glow on the walls; shoot one and the lights flash on, freezing every carpshit in the hall
        E.nextSwitch -= dt; E.flash = Math.max(0, E.flash - dt);
        if (E.nextSwitch <= 0 && E.t < E.dur - 2) { R.switches.push({ w: R.dist + 1.02, s: rnd() < .5 ? -1 : 1, hit: false, sw: true }); E.nextSwitch = TUNE.switchEvery; }
        R.switches = R.switches.filter(sw => sw.w - R.dist > .05 && !sw.hit);
      }
      if (E.kind === 'move') updateMove(E, dt);
      if (E.t >= E.dur) {
        if (E.kind === 'dark') Snd.play('lights');
        if (E.kind === 'move' && E.clean) {
          // not a scratch: a bonus
          for (let i = 0; i < TUNE.moveClean; i++) free(PX(bull.u, bull.bz) + fxr(-12, 12), YH(bull.bz, .3) + fxr(-6, 6), 'move', 'clean');
          R.fx.push({ k: 'big', text: 'NOT A SCRATCH +' + TUNE.moveClean, x: 120, y: 44, t: 0, dur: 1.3 }); Snd.play('wipe');
        }
        R.event = null; R.beat++; R.beatT = 0; R.switches = [];
        addSign(1, beat().sign);
        if (beat().pulls) { bark('copy'); R.copyAt = R.souls; }
        Snd.music(beat().music);
        if (beat().pulls) R.pull.next = R.t + 3;
        // a coffee after each event, and a Spread Shot to try out after moving day
        addPickup('coffee', .9, rr(-.4, .4));
        if (E.kind === 'move') addPickup('spread', 1.3, rr(-.4, .4));   // lights out nearly always pays a streak drop instead
      }
    } else if (B.after && R.beatT >= B.time && !(B.formations && R.flies.some(f => f.form) && R.beatT < B.time + 8)) startEvent(B.after);
    else if (!B.after && ((R.souls >= TUNE.goal && R.beatT >= B.minT) || R.beatT >= B.max)) { startWake(); return; }
    spawnHall(dt);
    // office life now and then: a phone down the hall, a copier in the copy room (sound only, so not from the run's seed)
    R.ambT -= dt;
    if (R.ambT <= 0 && !R.event) { Snd.play(beat().station === 'copier' ? 'printer' : 'phone'); R.ambT = fxr(10, 18); }
  }
  // Pickups float at jump height: a coffee gives a heart back, a Spread Shot fires three ways for a while.
  // They drift toward you a little on their own, so they still arrive when the hall has stopped.
  function addPickup(kind, dz, u) {
    const pk = { kind, w: R.dist + dz, u: clamp(u, -TUNE.aisle + .05, TUNE.aisle - .05), h: .3, t: 0 };
    R.pickups.push(pk);
    if (!R.pickups.some(o => o !== pk && o.t < .05)) Snd.play('appear');   // one chime when a pickup (or a pair) turns up
    return pk;
  }
  function updatePickups(dt) {
    for (const pk of R.pickups) {
      pk.t += dt; if (!pk.still) pk.w -= .06 * dt;
      if (pk.rug) {
        // the blaster lies on the rug: a pull carries it toward the mouth, a roll back carries it to you
        if (R.pull.st === 'on') pk.w = Math.min(R.dist + .82, pk.w + TUNE.pullSpeed * dt);
        if (R.roll) pk.w = Math.max(R.dist + .02, pk.w - TUNE.roll.speed * dt);
      }
      const z = pk.w - R.dist;
      const reach = pk.kind === 'blaster'
        ? pk.t > TUNE.surgeFly && z < .3 && Math.abs(z - bull.bz) < .07 && Math.abs(pk.u - bull.u) < TUNE.runner && bull.jh < .04
        : Math.abs(z - bull.bz) < .05 && Math.abs(pk.u - bull.u) < .15 && overlaps(pk.h, .04);
      if (!pk.got && reach && !bull.mouth) {
        pk.got = true;
        const x = PX(pk.u, z), y = YH(z, pk.h);
        emit('pickup', { item: pk.kind });
        if (pk.kind === 'blaster') {
          R.armed = true; R.charge = TUNE.charges; Snd.play('ready'); popText('GOT IT!', x, y - 10, '#ffd44a'); live('Blaster back.');
          if (R.phase === 'boss' && !R.events.soulHint) startHint();
          if (R.banner && R.banner.text === 'BLASTER DOWN!') R.banner = null;
        } else if (pk.kind === 'coffee') {
          const full = R.hearts >= TUNE.hearts;
          R.hearts = Math.min(TUNE.hearts, R.hearts + 1);
          popText(full ? 'FULL' : '+1 HEART', x, y - 8, '#ff7050'); Snd.play('coffee'); live(full ? 'Coffee. Hearts already full.' : 'Coffee: one heart back.');
          if (!full) bark('coffee');
        } else {
          R.spread = TUNE.spreadT; R.charge = TUNE.charges;
          popText('SPREAD SHOT', x, y - 8, '#ffd44a'); Snd.play('power'); live('Spread Shot: the blaster fires three ways for ten seconds.');
          bark('spread');
        }
      }
      if (!pk.got && !R.events.grabHint && z < .5 && z > .2 && R.phase === 'hall' && !R.banner) {
        R.events.grabHint = true; R.banner = { text: 'JUMP TO GRAB', t: 0, dur: 1.6, pull: true };
      }
    }
    R.pickups = R.pickups.filter(pk => !pk.got && (pk.kind === 'blaster' || pk.w - R.dist > Math.max(ZN, bull.bz - .1)));
  }
  function updateRows(dt) {
    for (const row of R.rows) {
      row.w -= (row.v || (row.kind === 'chairs' ? .12 : .22)) * dt;   // chairs roll toward you; paper skids faster; the Shredder's rows set their own speed
      const z = row.w - R.dist;
      if (row.hit) { row.hit += dt; continue; }
      if (!R.events.jumpHint && z < .6 && R.phase === 'hall') {
        R.events.jumpHint = true; R.banner = { text: 'JUMP', t: 0, dur: 1.6, pull: true };
      }
      // a beam hangs from the ceiling: duck under it; everything else rolls along the floor: jump it
      if (row.kind === 'beam' && z < .6) duckHint();
      const hits = row.kind === 'beam' ? !bull.crouch : bull.jh < TUNE.rowH;
      if (Math.abs(z - bull.bz) < .02 && hits && knock(row.ob, row.kind)) { row.hit = .001; R.events.rowHits = (R.events.rowHits || 0) + 1; obHit(row.ob); }
    }
    R.rows = R.rows.filter(row => row.w - R.dist > ZN && row.hit < .6);
  }
  const BOX_H = .06;
  // a moving-day obstacle that hits you: no soul for it, and the run isn't clean
  function obHit(ob) { if (!ob) return; ob.hit = true; if (R.event && R.event.kind === 'move') R.event.clean = false; }
  const knock = (ob, cause) => hurtBull(1, cause);
  function updateBoxes(dt) {
    for (const bx of R.boxes) {
      const z = bx.w - R.dist;
      if (bx.hit) { bx.hit += dt; continue; }
      if (Math.abs(z - bull.bz) < .02 && Math.abs(bx.u - bull.u) < .14 && (bx.tall || bull.jh < BOX_H) && knock(bx.ob, 'box')) { bx.hit = .001; obHit(bx.ob); }
    }
    R.boxes = R.boxes.filter(bx => bx.w - R.dist > ZN && bx.hit < .5);
  }
  function updateTemps(dt) {
    for (const cb of R.cubs) {
      const tp = cb.temp, z = cubZ(cb);
      if (!tp || tp.dead) continue;
      tp.t += dt;
      if (tp.st === 'hidden') {
        // the temps stay down in the dark (lights out belongs to the carpshits) and on moving day (they're carrying boxes)
        if (!R.noPops && !R.event && z < tp.trig && z > .3) { tp.st = 'up'; tp.t = 0; tp.threw = false; tp.will = rnd() < TUNE.throwChance; }
      } else if (tp.st === 'up') {
        tp.pop = Math.min(1, tp.pop + dt * 7);
        if (!tp.threw && tp.t > .55 && z > .22 && !R.noPops) { tp.threw = true; if (tp.will) throwWad(tp); }
        if (tp.t > 1.25) { tp.st = 'down'; tp.t = 0; tp.threw = true; }
      } else if (tp.st === 'down') {
        tp.pop = Math.max(0, tp.pop - dt * 7);
        if (tp.pop <= 0) { tp.st = 'hidden'; tp.pops++; tp.trig = tp.pops < 2 ? z - .2 : -1; }
      }
    }
    R.cubs = R.cubs.filter(cb => cubZ(cb) > ZN - .16);
    R.decor = R.decor.filter(d => d.w - R.dist > ZN - .3);
    R.signs = R.signs.filter(sg => sg.w - R.dist > ZN);
  }
  function updateFlies(dt) {
    const frozen = R.event && R.event.kind === 'dark' && R.event.flash > 0;
    for (const f of R.flies) {
      if (frozen && !f.dead) { f.hit = Math.max(0, f.hit - dt); continue; }   // caught in the light: frozen
      if (f.form) {
        // formations keep their shape instead of chasing you
        f.z -= (.3 + R.speed * .4) * dt;
        if (f.snake != null) f.u = .55 * Math.sin(f.snake + R.t * 2.2);
      } else {
        f.z -= (.34 + R.speed * .4) * dt;
        f.u = clamp(f.u + clamp(bull.u - f.u, -.3, .3) * dt * .9 + Math.sin(R.t * 3 + f.ph) * .12 * dt, -.75, .75);
      }
      if (f.z < .45) f.h += ((f.high ? .22 : .12) - f.h) * Math.min(1, dt * 2.5);
      if (f.high && f.z < .6) duckHint();
      if (f.fid && f.z < TUNE.wipeBy) formLost(f);   // a wipe has to be done before the formation is halfway down the hall
      f.hit = Math.max(0, f.hit - dt);
      if (!f.dead && Math.abs(f.z - bull.bz) < .045 && Math.abs(f.u - bull.u) < .12 && overlaps(f.h, .05)) {
        if (hurtBull(1, f.form ? 'formation' : 'carpshit')) { f.dead = true; poof(f.u, f.z, f.h); formLost(f); }
      }
      if (f.z < bull.bz - .12 || f.z < ZN) { f.dead = true; formLost(f); }
    }
    R.flies = R.flies.filter(f => !f.dead);
  }
  // Does something at height h (give or take half) touch Unruggabull, who stands about .2 of the hall tall?
  const overlaps = (h, half) => h + half > bull.jh && h - half < bull.jh + (bull.crouch ? TUNE.crouchH : .2);

  // ---------- projectiles: paper wads, shredded-paper bundles, staples ----------
  function launch(kind, from, to, dur, extra) {
    const gv = kind === 'wad' ? .6 : 0;
    const p = Object.assign({ kind, u: from.u, z: from.z, h: from.h, vu: (to.u - from.u) / dur, vz: (to.z - from.z) / dur,
      vh: (to.h - from.h + .5 * gv * dur * dur) / dur, gv, w: .05, hh: .04, friendly: false, src: null, dead: false, spin: Math.random() * 4 }, extra || {});
    R.projs.push(p);
    return p;
  }
  // Temps lead their throws a little: they aim where you're heading.
  function throwWad(tp, dur) {
    const t = dur || TUNE.wadTime, at = posOf(tp), aim = clamp(bull.u + moveDir() * TUNE.move * t * (dur ? 0 : TUNE.wadLead), -TUNE.aisle, TUNE.aisle);
    launch('wad', { u: at.u, z: at.z, h: at.h + .04 }, { u: aim, z: bull.bz, h: .13 }, t, { src: tp });
  }
  // A deflect sends the paper back where it came from and gives the blaster charges back.
  function deflect(p) {
    p.friendly = true;
    // a bright cut from his blade to the paper, so a deflect at arm's length reads as reached
    const m = muzzleXY(); R.fx.push({ k: 'cut', x0: m.x - 4, y0: m.y + 6, x1: PX(p.u, p.z), y1: YH(p.z, p.h), t: 0, dur: .12 });
    // in the fight, paper knocked back from close to the mouth hits harder, up to double
    p.power = R.phase === 'boss' ? 1 + clamp(bull.bz / TUNE.mouth, 0, 1) : 1;
    let to = { u: 0, z: .98, h: .12 };
    if (p.kind === 'wad') to = p.src && !p.src.dead ? posOf(p.src) : { u: p.u, z: 1.1, h: p.h };
    const rl = R.boss.rally, dur = p.rally && rl ? Math.max(TUNE.rally.backMin, TUNE.rally.back * Math.pow(TUNE.rally.speedUp, rl.count)) : .45;
    p.vu = (to.u - p.u) / dur; p.vz = (to.z - p.z) / dur; p.vh = (to.h - p.h) / dur; p.gv = 0;
    R.events.deflects = (R.events.deflects || 0) + 1;
    if (!p.rally) bark('deflect');
    emit('deflect', { kind: p.rally ? 'rally' : p.kind });
    const before = R.charge;
    R.charge = Math.min(TUNE.charges, R.charge + TUNE.deflectCharge); R.chargeFlash = .3; R.freeze = Math.max(R.freeze, .04);
    Snd.play('deflect', p.rally && rl ? rl.count : 0);
    if (R.charge > before) popText('+' + (R.charge - before), PX(p.u, p.z), YH(p.z, p.h) - 6, '#7fd4ff');
  }
  function updateProjs(dt) {
    for (const p of R.projs) {
      if (p.dead) continue;
      p.u += p.vu * dt; p.z += p.vz * dt; p.h += p.vh * dt; p.vh -= p.gv * dt; p.spin += dt * 10;
      if (p.friendly) {
        if (p.kind === 'wad') {
          const s = p.src;
          if (s && !s.dead) { const at = posOf(s); if (Math.abs(p.z - at.z) < .07) { p.dead = true; killTemp(s, 'deflect'); continue; } }
          for (const f of R.flies) if (!f.dead && Math.abs(f.u - p.u) < .1 && Math.abs(f.z - p.z) < .05) { p.dead = true; killFly(f, 'shot'); break; }
          if (p.z > 1.05) p.dead = true;
        } else if (p.z >= .955) {
          const b = R.boss, rl = b.rally;
          if (p.rally && rl && b.st === 'fight' && b.jam <= 0 && rl.count < rl.target) {
            // the Shredder bats it back at you, quicker every time
            rl.count++; b.spit = .2; emit('rally_return', { amount: 1 }); R.rallyPop = .35;
            R.events.bestRally = Math.max(R.events.bestRally || 0, rl.count);
            R.shake = Math.max(R.shake, .05 + .02 * Math.min(rl.count, 10));   // it builds: harder shakes, faster music
            if (!R.events.rallyLine) { R.events.rallyLine = true; if (R.banner && R.banner.text === 'RALLY!') R.banner = null; talk('RETURN TO SENDER.', 'shredder'); }
            const dur = Math.max(TUNE.rally.fastest, TUNE.rally.serve * Math.pow(TUNE.rally.speedUp, rl.count));
            p.friendly = false; p.vu = (bull.u - p.u) / dur; p.vz = (bull.bz - p.z) / dur; p.vh = (.12 - p.h) / dur;
            Snd.play('volley', rl.count);
            continue;
          }
          p.dead = true;
          if (p.rally && rl && b.st === 'fight') {
            // it misses: a smash, and the Shredder reels
            const dmg = TUNE.rally.smash + TUNE.rally.smashPer * rl.count;
            b.rally = null; b.jam = Math.max(b.jam, TUNE.rally.stun); R.shake = .5; R.events.smashes = (R.events.smashes || 0) + 1;
            shove(-14); b.shudder = .8; taunt('smash');
            if (rl.marathon) {
              // the long one: a bigger finish
              R.white = .12; R.freeze = Math.max(R.freeze, .18); R.shake = .9; Snd.play('explode');
              R.fx.push({ k: 'big', text: 'MARATHON SMASH!', x: 120, y: 44, t: 0, dur: 1.4 });
              for (let i = 0; i < 16; i++) R.fx.push({ k: 'bit', x: fxr(BACK.x0 + 6, BACK.x1 - 6), y: fxr(BACK.y0 + 6, BACK.y1 - 6), vx: fxr(-70, 70), vy: fxr(-90, -10), t: 0, dur: fxr(.8, 1.3) });
            }
            emit('smash', { amount: rl.count }); bossDamage(dmg, 'smash'); Snd.play('smash'); bark('smash');
            if (R.armed === false && b.st === 'fight') rollBack(TUNE.roll.dur);   // win the volley: the rug rolls back with your blaster
            popText('SMASH! -' + dmg, 120, BACK.y0 - 2, '#ffd44a'); live('Smash! The Shredder misses the return.');
            for (let i = 0; i < 12; i++) R.fx.push({ k: 'bit', x: fxr(BACK.x0 + 12, BACK.x1 - 12), y: BACK.y1 - 10, vx: fxr(-40, 40), vy: fxr(-70, -20), t: 0, dur: fxr(.6, 1.1) });
          } else if (b.st === 'fight') {
            const base = p.kind === 'bundle' ? TUNE.bundleDmg : p.kind === 'scrap' ? TUNE.scrapDmg : p.kind === 'plane' ? TUNE.planeDmg : TUNE.stapleDmg, dmg = Math.round(base * (p.power || 1) * 10) / 10;
            bossDamage(dmg, 'deflect'); popText('-' + dmg, PX(p.u, .95), YH(.95, .3), p.power > 1.4 ? '#ff9628' : '#ffd44a');
          }
          poof(p.u, .97, p.h);
        }
        continue;
      }
      if (Math.abs(p.z - bull.bz) < .045 && Math.abs(p.u - bull.u) < .1 + p.w && overlaps(p.h, p.hh)) {
        if (hurtBull(1, p.rally ? 'rally' : p.spray ? 'spray' : p.kind)) { p.dead = true; poof(p.u, p.z, p.h); if (p.rally) { R.boss.rally = null; emit('rally_lost'); laugh(); if (R.hearts > 0) taunt('miss'); } continue; }
      }
      if (p.z < bull.bz - .1 || p.z < ZN || p.h < -.05) { p.dead = true; if (p.rally) { R.boss.rally = null; emit('rally_lost'); laugh(); } }
    }
    R.projs = R.projs.filter(p => !p.dead);
  }

  // ---------- Unruggabull ----------
  const keys = { kbLeft: false, kbRight: false, padLeft: false, padRight: false, kbShoot: false, padShoot: false, kbDown: false, padDown: false };
  const input = { jump: 0, slash: 0, shoot: 0 };   // buffered presses, in seconds left
  const moveDir = () => ((keys.kbRight || keys.padRight) ? 1 : 0) - ((keys.kbLeft || keys.padLeft) ? 1 : 0);
  const shooting = () => keys.kbShoot || keys.padShoot;
  const crouchHeld = () => keys.kbDown || keys.padDown;
  function press(k) { if (state !== 'play') return; if (k === 'jump' || k === 'slash' || k === 'shoot') input[k] = .12; }
  const onRunner = () => Math.abs(bull.u) < TUNE.runner && bull.jh < .03 && !bull.mouth && !bull.spat;
  function updateBull(dt) {
    const b = bull;
    input.jump = Math.max(0, input.jump - dt); input.slash = Math.max(0, input.slash - dt); input.shoot = Math.max(0, input.shoot - dt);
    b.inv = Math.max(0, b.inv - dt); b.cd = Math.max(0, b.cd - dt); b.stag = Math.max(0, (b.stag || 0) - dt); b.aimT = Math.max(0, (b.aimT || 0) - dt);
    if (b.slash >= 0) { b.slash += dt; if (b.slash >= TUNE.slashT) b.slash = -1; }
    if (R.phase === 'dead') return;
    if (b.mouth > 0) { b.mouth -= dt; if (b.mouth <= 0) { b.mouth = 0; b.spat = .45; b.inv = Math.max(b.inv, 1.6); } return; }
    if (b.spat > 0) { b.spat = Math.max(0, b.spat - dt); b.bz = Math.max(0, b.bz - dt * 2); b.jh = Math.sin(b.spat / .45 * Math.PI) * .1; return; }
    b.pin = Math.max(0, (b.pin || 0) - dt);
    // crouched (on the ground only): half height, no moving or shooting; on a pulling rug he grips it
    b.crouch = crouchHeld() && b.jh <= 0 && R.phase !== 'win';
    // how long he's been standing about (cosmetic: his idle poses)
    b.idle = moveDir() || shooting() || b.jh > 0 || b.slash >= 0 || b.crouch || b.aimT > 0 || R.speed > .02 || (R.pull.st === 'on' && onRunner()) ? 0 : (b.idle || 0) + dt;
    const dir = R.phase === 'win' || b.pin > 0 || b.crouch ? 0 : moveDir();   // pinned at the back by the rolling rug: no sidestepping
    b.u = clamp(b.u + dir * TUNE.move * dt, -TUNE.aisle, TUNE.aisle);
    if (input.jump > 0 && b.jh <= 0) { input.jump = 0; b.jv = JUMP_V; b.jh = .0001; b.sq = -.12; b.crouch = false; Snd.play('jump'); }
    b.sq = (b.sq || 0) > 0 ? Math.max(0, b.sq - dt) : Math.min(0, (b.sq || 0) + dt);   // squash on landing, stretch on takeoff
    if (b.jh > 0) {
      b.jv -= GRAV * dt; b.jh += b.jv * dt;
      if (b.jh <= 0) { b.jh = 0; b.jv = 0; b.sq = .12; R.fx.push({ k: 'dust', x: PX(b.u, b.bz), y: FY(b.bz), s: sc(b.bz), t: 0, dur: .3 }); }
    }
    if (input.slash > 0 && b.cd <= 0) { input.slash = 0; slash(); }
    if (b.slash >= 0 && b.slash < TUNE.deflectWindow) slashHits();
    if (R.pull.st === 'on' && onRunner()) {
      b.bz += TUNE.pullSpeed * (b.crouch ? TUNE.grip : 1) * dt;
      if (b.crouch) { if (!R.events.gripped) { R.events.gripped = true; popText('GRIP!', PX(b.u, b.bz), YH(b.bz, .2), '#ffd44a'); } if (Math.random() < dt * 10) R.fx.push({ k: 'dust', x: PX(b.u, b.bz) + fxr(-5, 5), y: FY(b.bz), s: sc(b.bz), t: 0, dur: .25 }); }
      if (b.bz >= TUNE.mouth) draggedIn();
    }
    else b.bz = Math.max(0, b.bz - TUNE.recover * dt);
    if (R.speed > .02 || dir || (R.pull.st === 'on' && onRunner())) b.step += dt * 8;
    // the blaster: hold Shoot to keep firing, or tap for one shot
    R.fireT -= dt;
    if ((shooting() || input.shoot > 0) && R.fireT <= 0 && !b.crouch && (R.phase === 'hall' || R.phase === 'boss' || R.phase === 'wake')) { input.shoot = 0; R.fireT = fire() ? TUNE.fireEvery : .25; }
  }
  function slash() {
    bull.slash = 0; bull.cd = TUNE.slashCd;
    Snd.play('slash');
    slashHits();
    if (R.pull.st === 'on' && onRunner()) cutRug();
  }
  // While the blade is out: knock projectiles back and cut carpshits in two. Temps stay safe behind their partitions:
  // the blaster or their own paper knocked back gets them.
  function slashHits() {
    const near = (u, z) => z > bull.bz - .04 && z < bull.bz + TUNE.slashReach && Math.abs(u - bull.u) < TUNE.slashWide;
    for (const p of R.projs) if (!p.dead && !p.friendly && near(p.u, p.z)) deflect(p);
    for (const f of R.flies) if (!f.dead && near(f.u, f.z)) killFly(f, 'slash');
  }
  function cutRug() {
    const P = R.pull;
    P.st = 'cut'; P.t = 0;
    R.cut = { z: bull.bz + .04, t: 0 };
    R.events.cuts = (R.events.cuts || 0) + 1; emit('cut');
    Snd.play('cut');
    popText('CUT!', PX(bull.u, bull.bz), YH(bull.bz, .3), '#ffd44a');
    if (R.boss.st === 'fight') jam(bull.bz);
  }
  // One shot (three with Spread Shot) for one charge. Out of charges: a click, a red flash, and a wait.
  function fire() {
    if (holstered()) return false;   // moving day: nothing to shoot
    if (R.armed === false) { R.empty = .2; Snd.play('empty'); return false; }   // knocked out of his hands: go and get it
    if (R.charge < 1) { R.empty = .2; Snd.play('empty'); return false; }
    R.charge--;
    if (R.charge < 1) { R.dry = true; emit('empty'); Snd.play('drained'); if (!R.fx.some(f => f.k === 'pop' && f.text === 'EMPTY')) popText('EMPTY', PX(bull.u, bull.bz), YH(bull.bz, bull.jh + .3), '#ff7050'); }
    bull.aimT = .22;
    let best = null, bz = Infinity;
    const consider = (o, at, cone) => { if (at.z > bull.bz + .05 && at.z < .97 && Math.abs(at.u - bull.u) < cone && at.z < bz) { best = o; bz = at.z; } };
    for (const cb of R.cubs) if (cb.temp && !cb.temp.dead && cb.temp.pop > .3) consider(cb.temp, posOf(cb.temp), TUNE.aimCone);
    for (const f of R.flies) consider(f, f, .3);
    for (const sw of R.switches || []) consider(sw, switchAt(sw), .5);
    // bolts leave the muzzle of the blaster he holds up beside his head
    const mu = bull.u + A.MUZZLE.x / HW, mh = bull.jh - A.MUZZLE.y / (FN - CN);
    const shot = du => R.shots.push({ u: mu, z: bull.bz + .03, h: mh, du, tgt: du ? null : best, dead: false, spread: !!du });
    shot(0);
    if (R.spread > 0) { shot(-.6); shot(.6); }
    // the souls' streams: thin, white and gold, side by side with the bolt (a slight fan, never bending in), no extra charge
    const hs = R.hint ? R.hint.streams : 1;
    if (hs > 1) for (const o of hs === 2 ? [1] : [-1, 1]) R.shots.push({ u: mu + o * .08, z: bull.bz + .03, h: mh, du: o * .06, tgt: null, dead: false, soul: true });
    R.events.shots = (R.events.shots || 0) + 1;
    const k = sc(bull.bz);
    R.fx.push({ k: 'muzzle', x: PX(bull.u, bull.bz) + A.MUZZLE.x * k, y: YH(bull.bz, bull.jh) + A.MUZZLE.y * k, t: 0, dur: .08 });
    Snd.play('shot', R.spread > 0);
    return true;
  }
  function sparks(u, z, h, col) { R.fx.push({ k: 'spark', x: PX(u, z), y: YH(z, h), s: Math.max(.5, sc(z)), col: col || '#ffd44a', t: 0, dur: .22, a: Math.random() * 6 }); }
  // a light switch on the wall, about chest height
  function hitSwitch(sw) {
    sw.hit = true; R.event.flash = TUNE.switchFlash;
    Snd.play('lights'); Snd.play('wipe'); R.white = Math.max(R.white || 0, .06); emit('switch');
    R.events.switches = (R.events.switches || 0) + 1;
  }
  function updateShots(dt) {
    for (const s of R.shots) {
      s.z += TUNE.shotSpeed * dt; s.u += (s.du || 0) * dt;
      if (s.tgt && !s.tgt.dead && !(s.tgt.sw && s.tgt.hit)) {
        const at = posOf(s.tgt), k = Math.min(1, TUNE.shotSpeed * dt / Math.max(.04, at.z - s.z));
        s.u += (at.u - s.u) * k; s.h += (at.h - s.h) * k;
      }
      for (const cb of R.cubs) {
        const tp = cb.temp; if (!tp || tp.dead || tp.pop < .4) continue;
        const at = posOf(tp);
        if (Math.abs(s.u - at.u) < .09 && Math.abs(s.z - at.z) < .06) { s.dead = true; sparks(at.u, at.z, at.h); killTemp(tp, 'shot'); break; }
      }
      if (s.dead) continue;
      for (const sw of R.switches || []) { const at = switchAt(sw); if (!sw.hit && Math.abs(s.z - at.z) < .07 && Math.abs(s.u - at.u) < .2) { s.dead = true; hitSwitch(sw); break; } }
      if (s.dead) continue;
      for (const f of R.flies) {
        if (f.dead || Math.abs(s.u - f.u) > .11 || Math.abs(s.z - f.z) > .06) continue;
        s.dead = true; f.hp--; f.hit = .1; Snd.play('hit'); sparks(f.u, f.z, f.h);
        if (f.hp <= 0) killFly(f, 'shot');
        break;
      }
      if (s.dead) continue;
      if (s.z >= .965) {
        s.dead = true;
        // in phase 3 it braces: half damage from the blaster unless it's jammed or reeling from a smash
        if (R.boss.st === 'fight' && Math.abs(s.u) < .8) { bossDamage(TUNE.shotDmg * (R.boss.jam > 0 ? TUNE.jamMult : R.boss.ph === 3 ? .5 : 1), 'blaster'); sparks(s.u, .96, s.h, R.boss.jam > 0 ? '#ffd44a' : '#fff6e2'); }
        else poof(s.u, .97, s.h, 3);
      }
    }
    R.shots = R.shots.filter(s => !s.dead && Math.abs(s.u) < 1.1);
  }
  function hurtBull(n, cause) {
    if (bull.inv > 0 || bull.mouth > 0 || bull.spat > 0 || R.phase === 'dead' || R.phase === 'win') return false;
    R.hearts = Math.max(0, R.hearts - n); bull.inv = TUNE.hurtInv; R.shake = .2; R.red = .15; bull.stag = .3;   // he staggers (drawn only)
    if (R.hearts === 1) bark('low');
    R.lastCause = cause || 'unknown'; emit('hit', { amount: n, cause: R.lastCause });
    if (R.hearts > 0 && R.phase === 'boss' && R.boss.st === 'fight' && cause !== 'rally') { laugh(); taunt('hit'); }   // not on the last heart: that's his WHOA!
    Snd.play('hurt');
    if (R.hearts <= 0) die();
    return true;
  }
  function draggedIn() {
    const b = bull;
    b.bz = TUNE.mouth; b.mouth = .8; b.slash = -1;
    R.hearts = Math.max(0, R.hearts - 2); R.shake = .35; R.boss.chomp = .8;
    R.lastCause = 'rug'; emit('hit', { amount: 2, cause: 'rug' });
    R.events.dragged = (R.events.dragged || 0) + 1;
    endPull();
    Snd.play('chomp');
    for (let i = 0; i < 14; i++) R.fx.push({ k: 'bit', x: fxr(BACK.x0 + 14, BACK.x1 - 14), y: BACK.y1 - 9, vx: fxr(-30, 30), vy: fxr(-60, -20), t: 0, dur: fxr(.7, 1.2) });
    popText('PROCESSED!', 120, BACK.y0 - 2, '#ff7050');
    if (R.hearts <= 0) die();
  }

  // ---------- the runner rug ----------
  const pullDur = () => R.phase === 'hall' ? 2.2 : TUNE.bossPull.dur[R.boss.ph - 1];
  const pullGap = () => R.phase === 'hall' ? rr(9, 12) : TUNE.bossPull.gap[R.boss.ph - 1];
  function endPull() { const P = R.pull; if (P.st === 'idle') return; P.st = 'idle'; P.t = 0; P.spray = false; P.next = R.t + pullGap(); if (R.banner && R.banner.pull) R.banner = null; }
  function updatePull(dt) {
    const P = R.pull;
    P.t += dt;
    const can = (R.phase === 'hall' && beat().pulls && !R.event) ||
      (R.phase === 'boss' && R.boss.st === 'fight' && R.boss.jam <= 0 && !R.boss.rally && !R.roll);
    if (P.st === 'idle') {
      if (can && R.t >= P.next) {
        P.st = 'warn'; P.t = 0; Snd.play('warn');
        // from phase 2 every other pull sprays staples down both sides, and the sides flash red while it warns:
        // ride the rug toward the mouth, or dodge at the sides
        P.spray = R.phase === 'boss' && R.boss.ph >= 2 && (P.count + 1) % 2 === 0; P.sprayT = .2;
        if (P.spray && !R.events.sprayHint && !R.talk) { R.events.sprayHint = true; R.banner = { text: 'RIDE THE RUG', t: 0, dur: 99, pull: true }; live('Side spray coming: staples down both sides. Ride the rug, or jump them.'); }
      }
    } else if (!can && P.st !== 'cut') {
      endPull();
    } else if (P.st === 'warn') {
      if (P.t >= .9) {
        P.st = 'on'; P.t = 0; P.dur = pullDur(); P.count++; P.snd = 0;
        if (P.count === 1) { R.banner = { text: 'STEP OFF OR SLASH', t: 0, dur: 99, pull: true }; live('The runner rug is pulling you toward the shredder. Step off it, slash to cut the rug, or crouch to grip it.'); }
        else if (R.phase === 'boss' && !P.spray && !R.events.jamHint && !R.talk) { R.events.jamHint = true; R.banner = { text: 'SLASH THE RUG', t: 0, dur: 99, pull: true }; live('Cut the rug to jam the shredder.'); }
      }
    } else if (P.st === 'on') {
      P.snd -= dt;
      if (P.snd <= 0) { Snd.play('pull'); P.snd = .45; }
      if (P.spray) {
        P.sprayT -= dt;
        if (P.sprayT <= 0) {
          P.sprayT = TUNE.sprayEvery;
          for (const sd of [-1, 1]) { const u = sd * rr(.48, .62); launch('staple', { u: sd * rr(.34, .42), z: .95, h: .03 }, { u, z: bull.bz - .02, h: .03 }, TUNE.sprayT, { w: .06, hh: .03, spray: true }); }
          R.boss.spit = .15;
        }
      }
      if (P.t >= P.dur) endPull();
    } else if (P.st === 'cut') {
      if (P.t >= .7) endPull();
    }
    R.roff -= R.speed * dt;
    if (R.roll) R.roff -= TUNE.roll.speed * 1.6 * dt;
    if (R.phase === 'dead' && R.phaseT < .45) R.roff += 3.5 * dt;   // rugged: yanked out from under him
    if (P.st === 'on') R.roff += TUNE.pullSpeed * dt * 1.4;
    if (R.cut) { R.cut.t += dt; R.cut.z -= R.speed * dt; if (R.cut.t > 1.2) R.cut = null; }
  }

  // ---------- the Shredder ----------
  function startWake() {
    R.shzWake = shredderZ();
    R.phase = 'wake'; R.phaseT = 0; R.noPops = true;
    checkpoint = { souls: R.souls, t: R.t, continues: R.continues, bestStreak: R.bestStreak, events: Object.assign({}, R.events) };
    for (const bx of R.boxes) bx.hit = bx.hit || .001;
    for (const row of R.rows) row.hit = row.hit || .001;
    endPull();
    Snd.music(null);
    live('The far wall wakes up. It is the Shredder.');
  }
  function startBoss() {
    R.phase = 'boss'; R.phaseT = 0;
    const b = R.boss;
    b.st = 'fight'; b.atk = 1.5; R.pull.next = R.t + 4;
    if (R.hearts < TUNE.hearts) addPickup('coffee', .45, rr(-.4, .4));
    Snd.music('shred');
  }
  function spitBundle() {
    const b = R.boss, dur = TUNE.bundleT[b.ph === 1 ? 0 : 1];
    launch('bundle', { u: rr(-.1, .1), z: .95, h: .1 }, { u: bull.u, z: bull.bz, h: .12 }, dur, { w: .08, hh: .05 });
    b.spit = .25; Snd.play('spit');
  }
  // Phase 3's rally: a white-hot bundle the Shredder keeps batting back, quicker each time, until it misses.
  function serveRally(long) {
    const b = R.boss;
    const [lo, hi] = TUNE.rally.count[b.ph - 1];
    const marathon = !!long && !b.marathonDone;   // once a phase, a rally goes the distance
    if (marathon) b.marathonDone = true;
    b.rally = { count: 0, target: marathon ? TUNE.rally.marathon[b.ph - 1] : lo + Math.floor(rnd() * (hi - lo + 1)), marathon };
    launch('bundle', { u: rr(-.1, .1), z: .95, h: .1 }, { u: bull.u, z: bull.bz, h: .12 }, TUNE.rally.serve, { w: .09, hh: .06, rally: true });
    b.spit = .25; Snd.play('spit');
    if (marathon) {
      popText('MARATHON!', 120, BACK.y0 - 2, '#ff9628');
      if (!R.events.marathonLine) { R.events.marathonLine = true; talk("LET'S GO THE DISTANCE.", 'shredder'); }
      live('A marathon rally: keep knocking it back.');
    }
    if (!R.events.rallyHint) { R.events.rallyHint = true; R.banner = { text: 'SLASH IT BACK', t: 0, dur: 1.6, pull: true }; live('Rally! Keep knocking the glowing bundle back until the Shredder misses.'); }
  }
  // Phase 3's power surge: a flash of static that knocks the blaster out of his hands and up the rug. No dodging it:
  // now it's a volley match until a smash rolls the rug back with the blaster on it.
  function surge() {
    shove(10);
    // the cause, plainly: a bolt of blue lightning from its eyes to the blaster in his hand
    const m = muzzleXY(); R.fx.push({ k: 'bolt', x0: 120, y0: BACK.y0 + 19, x1: m.x, y1: m.y, t: 0, dur: .4 });
    const pk = { kind: 'blaster', w: R.dist + rr(.55, .7), u: rr(-.12, .12), h: 0, t: 0, still: true, rug: true };
    R.armed = false; R.shake = .3; R.zap = .3; R.boss.spit = .3;
    R.pickups.push(pk);
    const k = sc(bull.bz);
    R.fx.push({ k: 'toss', x: PX(bull.u, bull.bz) + A.MUZZLE.x * k, y: YH(bull.bz, bull.jh) + A.MUZZLE.y * k, t: 0, dur: TUNE.surgeFly, pk });
    R.events.disarms = (R.events.disarms || 0) + 1; emit('disarm');
    Snd.play('surge'); Snd.play('disarm'); bark('disarm');
    if (!R.events.surgeHint) { R.events.surgeHint = true; R.banner = { text: 'WIN A RALLY FOR IT', t: 0, dur: 2.6, pull: true }; }
    live('Power surge! The blaster flies up the rug. Win a rally to get it back.');
  }
  // The rug rolls back toward you: after a smash (bringing the blaster), or as its rewind attack.
  function rollBack(dur) {
    endPull(); R.roll = { t: 0, dur };
    Snd.play('rewind'); popText('REWIND!', 120, BACK.y0 - 2, '#7fd4ff'); emit('roll');
  }
  function updateRoll(dt) {
    const L = R.roll;
    if (!L) return;
    L.t += dt;
    // anyone standing on the rug is shoved to the back of the hall and pinned there: no sidestepping, so knock it back
    if (onRunner()) {
      bull.bz = Math.max(0, bull.bz - 2 * dt); bull.pin = TUNE.roll.pin;
      if (Math.random() < dt * 12) R.fx.push({ k: 'dust', x: PX(bull.u, bull.bz) + fxr(-6, 6), y: FY(bull.bz), s: sc(bull.bz), t: 0, dur: .3 });
    }
    if (L.t >= L.dur) R.roll = null;
  }
  // A volley: two or three scraps of shredded paper, one after another, each aimed where you are. Knock them back tap-tap-tap.
  function spitScrap() {
    launch('scrap', { u: rr(-.1, .1), z: .95, h: .1 }, { u: bull.u, z: bull.bz, h: .12 }, TUNE.volley.dur, { w: .06, hh: .04 });
    R.boss.spit = .2; Snd.play('spit');
  }
  // A flight of paper airplanes at head height, spread right across the hall: no stepping round it. Duck, or slash
  // the ones in front of you back into its mouth.
  function throwPlanes() {
    for (let i = -2; i <= 2; i++) launch('plane', { u: i * .1, z: .95, h: .2 }, { u: clamp(bull.u + i * .3, -.7, .7), z: bull.bz, h: .21 }, TUNE.planeT, { w: .06, hh: .03 });
    R.boss.spit = .3; Snd.play('spit'); duckHint();
  }
  function duckHint() {
    if (R.events.duckHint || R.talk || (R.banner && R.banner.pull)) return;
    R.events.duckHint = true; R.banner = { text: 'DUCK', t: 0, dur: 1.6, pull: true };
    live('Duck: hold down to crouch under things at head height.');
  }
  // Rows from its mouth that cover the whole floor: a paper jam sheet, or a carpet of staples. Jump them.
  function spitRow(kind) {
    R.rows.push({ w: R.dist + .93, kind, hit: 0, v: TUNE.bossRows[kind] });
    R.boss.spit = .35; Snd.play('spit');
  }
  // Each phase cycles through its own attacks; 'marathon' is a long rally, once a phase (a normal one after that).
  const ATTACKS = [['rally', 'bundle', 'volley', 'marathon', 'planes'], ['fan', 'marathon', 'bundle', 'planes', 'rally', 'sheet', 'volley'], ['rally', 'surge', 'marathon', 'rewind', 'planes', 'rally', 'fan', 'volley', 'carpet']];
  function attack(kind) {
    shove(7);   // it lunges as it spits
    if (kind === 'bundle') spitBundle();
    else if (kind === 'volley') R.boss.volley = { left: TUNE.volley.n[R.boss.ph - 1], t: 0 };
    else if (kind === 'planes') throwPlanes();
    else if (kind === 'fan') spitFan();
    else if (kind === 'sheet' || kind === 'carpet') spitRow(kind);
    else if (kind === 'surge') { if (R.armed === false) serveRally(); else surge(); }
    else if (kind === 'rewind') { rollBack(TUNE.rewindT); launch('bundle', { u: rr(-.1, .1), z: .95, h: .1 }, { u: bull.u, z: 0, h: .12 }, TUNE.bundleT[1], { w: .08, hh: .05 }); R.boss.spit = .25; Snd.play('spit'); }
    else serveRally(kind === 'marathon');
  }
  function spitFan() {
    const gap = Math.floor(rnd() * 5);
    [-.5, -.25, 0, .25, .5].forEach((o, i) => {
      if (i === gap) return;
      launch('staple', { u: rr(-.08, .08), z: .95, h: .03 }, { u: clamp(bull.u + o, -.8, .8), z: bull.bz, h: .03 }, 1.6, { w: .06, hh: .03 });
    });
    R.boss.spit = .25; Snd.play('spit');
  }
  // Cutting the rug jams it; ride the rug in close before you cut and the jam lasts longer, up to double at the mouth.
  function jam(bz) {
    const b = R.boss, close = clamp((bz || 0) / TUNE.mouth, 0, 1);
    b.jam = TUNE.jamT * (1 + TUNE.rideJam * close); b.volley = null; endPull();
    R.events.jams = (R.events.jams || 0) + 1; emit('jam', { amount: Math.round(b.jam * 10) / 10 }); bark('jam');
    Snd.play('jam');
    popText(close > .5 ? 'BIG JAM! x3' : 'JAMMED! x3', 120, BACK.y0 - 2, close > .5 ? '#ff9628' : '#ffd44a');
  }
  function bossDamage(n, by) {
    const b = R.boss;
    if (b.st !== 'fight') return;
    emit('boss_damage', { amount: n, by: by || 'blaster' });
    b.hp = Math.max(0, b.hp - n);
    if (n >= 2) { b.flash = .07; shove(-Math.min(12, 2 + n * .6)); } else b.tick = .05;   // blaster hits only flicker the trim, so steady fire doesn't strobe
    if (b.hitSnd <= 0) { Snd.play('bosshit'); b.hitSnd = .09; }
    if (b.hp <= 0) defeat();
  }
  // The Shredder's lines in the fight, beyond its set lines: one at a time, never more often than every 7 seconds,
  // and never over another line or a banner. Each list goes round in order.
  const TAUNTS = {
    miss: ['SHREDDED.', 'DENIED.', 'FILED UNDER NOPE.'],
    hit: ['PAPER CUT.', 'SIGN HERE. AND HERE.', 'THAT GOES ON YOUR RECORD.'],
    smash: ['MY ROLLERS!', 'PC LOAD LETTER?!', 'THAT VOIDS MY WARRANTY.'],
    low: ['I AM NOT... OUT OF ORDER.']
  };
  function taunt(kind) {
    const b = R.boss;
    if (b.st !== 'fight' || R.talk || R.banner || (b.tauntT || 0) > 0) return;
    const list = TAUNTS[kind], n = (b.taunts = b.taunts || {})[kind] || 0;
    if (kind === 'low' && n) return;
    b.taunts[kind] = n + 1; b.tauntT = 12;
    talk(list[n % list.length], 'shredder');
  }
  // Its body is a spring: it lunges at you when it spits or laughs, leans back before an attack, and recoils when hit.
  function shove(v) { R.boss.pushV = (R.boss.pushV || 0) + v; }
  function laugh() { const b = R.boss; if (b.st !== 'fight') return; b.laugh = 1.1; shove(8); }
  // a power surge is coming: its eyes charge blue and crackle first, so losing the blaster has a visible cause
  function surgeSoon() {
    const b = R.boss;
    if (b.st !== 'fight' || R.armed === false) return false;
    if (b.surgeAt > 0 && b.surgeAt < .9) return true;
    const list = ATTACKS[b.ph - 1];
    return b.rev > 0 && list[b.atkN % list.length] === 'surge';
  }
  function updateBody(dt) {
    if (surgeSoon() && Math.random() < dt * 30) R.fx.push({ k: 'spark', x: (Math.random() < .5 ? 109 : 130) + fxr(-4, 4), y: BACK.y0 + 18 + fxr(-3, 3), s: .7, col: Math.random() < .5 ? '#7fd4ff' : '#ffffff', t: 0, dur: .18, a: Math.random() * 6 });
    const b = R.boss;
    b.push = b.push || 0; b.pushV = b.pushV || 0;
    b.pushV += (-70 * b.push - 9 * b.pushV) * dt; b.push += b.pushV * dt;
    b.push = clamp(b.push, -1.6, 1.6);
    b.laugh = Math.max(0, (b.laugh || 0) - dt); b.shudder = Math.max(0, (b.shudder || 0) - dt); b.tauntT = Math.max(0, (b.tauntT || 0) - dt);
    // it blinks now and then (cosmetic)
    b.blink = (b.blink || 0) - dt;
    if (b.blink < -fxr(2.5, 5)) b.blink = .12;
    // it chews: shredded strips drop out of its mouth onto the rug
    if ((b.st === 'fight' || b.st === 'awake') && b.jam <= 0 && Math.random() < dt * (R.pull.st === 'on' ? 14 : 5))
      R.fx.push({ k: 'strip', x: fxr(BACK.x0 + 14, BACK.x1 - 14), y: BACK.y1 - 5, vx: fxr(-8, 8), vy: fxr(8, 18), t: 0, dur: fxr(.4, .7) });
    if (b.st === 'fight' && b.hp < 15) { if (Math.random() < dt * 3) shove(fxr(-2, 2)); taunt('low'); }
  }
  function updateBoss(dt) {
    const b = R.boss;
    updateBody(dt);
    b.flash = Math.max(0, b.flash - dt); b.tick = Math.max(0, (b.tick || 0) - dt); b.spit = Math.max(0, b.spit - dt); b.chomp = Math.max(0, b.chomp - dt); b.hitSnd -= dt; b.rev = Math.max(0, (b.rev || 0) - dt);
    if (b.dark) {
      b.dark.t += dt;
      if (b.dark.t >= b.dark.dur) { b.dark = null; Snd.play('lights'); if (b.st === 'fight') Snd.music('shred'); }
    }
    if (b.st !== 'fight') return;
    if (b.surgeAt > 0 && b.jam <= 0) { const was = b.surgeAt; b.surgeAt -= dt; if (was >= .9 && b.surgeAt < .9 && R.armed !== false) Snd.play('rev'); if (b.surgeAt <= 0 && R.armed !== false) surge(); }
    const ph = b.hp > 66 ? 1 : b.hp > 33 ? 2 : 3;
    if (ph !== b.ph) {
      b.ph = ph; b.atk = 1.6; b.atkN = 0; b.volley = null; b.marathonDone = false;
      shove(12); b.chomp = .6; R.shake = Math.max(R.shake, .35);   // it roars into the new phase
      if (R.hearts < TUNE.hearts) addPickup('coffee', .45, rr(-.4, .4));
      if (ph === 2) talk('STAPLES. FOR YOUR RECORDS.', 'shredder');
      else {
        // phase 3 starts in the dark: only its eyes, its teeth and the paper show
        b.dark = { t: 0, dur: TUNE.powerSaveT }; b.surgeAt = 1; b.atk = 2.4;   // then a surge it can't miss
        talk('ENTERING POWER SAVING MODE.', 'shredder');
        Snd.play('dark'); Snd.music('dark'); live('Power saving mode: the lights go out.');
      }
    }
    // smoke, then sparks, as it wears down (cosmetic)
    const wear = 1 - b.hp / TUNE.bossHP;
    if (wear > .3 && Math.random() < dt * wear * 4) R.fx.push({ k: 'smoke', x: fxr(BACK.x0 + 8, BACK.x1 - 8), y: BACK.y0 + 4, t: 0, dur: 1 });
    if (wear > .6 && Math.random() < dt * (wear - .5) * 5) { const c = CRACKS[Math.floor(Math.random() * CRACKS.length)][0]; R.fx.push({ k: 'spark', x: BACK.x0 + c[0], y: BACK.y0 + c[1], s: .6, col: '#ffd44a', t: 0, dur: .22, a: Math.random() * 6 }); }
    if (b.jam > 0) {
      b.jam -= dt;
      if (Math.random() < dt * 8) R.fx.push({ k: 'smoke', x: fxr(BACK.x0 + 10, BACK.x1 - 10), y: BACK.y0 + 4, t: 0, dur: 1 });
      return;
    }
    // a volley fires its scraps one after another
    if (b.volley) {
      b.volley.t -= dt;
      if (b.volley.t <= 0) { spitScrap(); b.volley.t = TUNE.volley.gap; if (--b.volley.left <= 0) b.volley = null; }
      return;
    }
    // no attacks while the runner warns or sprays, and a rally waits for a pull to end
    const list = ATTACKS[ph - 1], next = list[b.atkN % list.length];
    if (R.pull.st === 'warn' || (R.pull.st !== 'idle' && (R.pull.spray || next === 'rally' || next === 'marathon' || next === 'rewind')) || b.rally || R.roll) return;
    const was = b.atk;
    b.atk -= dt;
    if (was > TUNE.tell && b.atk <= TUNE.tell) { b.rev = TUNE.tell; Snd.play('rev'); shove(-3); }   // its mouth glows and it rears back: something's coming
    if (b.atk <= 0) { attack(next); b.atkN++; b.atk = TUNE.attackEvery[ph - 1]; }
  }
  // The final hit: a white flash and a beat of stillness, slow motion while it shudders, then it blows.
  function defeat() {
    const b = R.boss;
    b.st = 'dead'; R.phase = 'win'; R.phaseT = 0; R.endT = R.t; b.dark = null; b.rev = 0; R.roll = null;
    endPull();
    for (const p of R.projs) { p.dead = true; poof(p.u, p.z, p.h); }
    for (const f of R.flies) { f.dead = true; poof(f.u, f.z, f.h); }
    R.banner = null; R.talk = null; R.shake = .3; R.white = .25; R.freeze = .2; R.slow = TUNE.finish.slow;
    Snd.music(null); Snd.hush(); Snd.play('smash');
  }
  function blowUp() {
    R.shake = .6; R.white = .15;
    // every soul freed on the floor drifts up past him and away (up to 40 of them, cosmetic)
    for (let i = 0; i < Math.min(40, R.souls); i++) R.fx.push({ k: 'rise', x: fxr(10, W - 10), y: H + 6 + fxr(0, 60), vy: -fxr(18, 34), ph: fxr(0, 6), t: -i * .05, dur: 6 });
    for (let i = 0; i < 24; i++) R.fx.push({ k: 'bit', x: fxr(BACK.x0 + 6, BACK.x1 - 6), y: fxr(BACK.y0 + 6, BACK.y1 - 6), vx: fxr(-70, 70), vy: fxr(-90, -10), t: 0, dur: fxr(.8, 1.4) });
    Snd.play('explode');
    talk('RUG NOT FOUND.', 'shredder');
  }

  // ---------- the souls' hint ----------
  // A glimpse of the mega stream, saved for the roof. Nothing announces it: a few souls leave the counter and fly into
  // the gun, each of the first two lands with one soft bell and adds a stream, and a few seconds later the streams quietly
  // drop off. The counter keeps its souls; the streams do normal damage and cost nothing extra.
  function startHint() {
    R.events.soulHint = true;
    R.hint = { t: 0, landed: 0, streams: 1, endT: 0 };
  }
  function updateHint(dt) {
    const H = R.hint, T = TUNE.soulHint;
    if (!H) return;
    if (R.armed === false || R.phase !== 'boss') { R.hint = null; return; }
    H.t += dt;
    if (H.endT && !shooting()) H.endT += dt;   // the hold only runs while he's firing
    while (H.landed < T.souls && H.t >= H.landed * T.gap + T.fly) {
      const i = H.landed++;
      const m = muzzleXY();
      for (let j = 0; j < 6; j++) R.fx.push({ k: 'spark', x: m.x + fxr(-3, 3), y: m.y + fxr(-3, 3), s: .7, col: j % 2 ? '#ffd44a' : '#f4f0ff', t: 0, dur: .3, a: Math.random() * 6 });
      if (i < 2) { H.streams = i + 2; Snd.play('bell', i); }
      if (H.landed === T.souls) H.endT = H.t + T.hold;
    }
    if (H.endT && H.t >= H.endT) {
      // back to normal, one stream at a time, without a sound
      H.streams--; H.endT = H.t + T.fade;
      // the soul that made that stream leaves the gun and goes back to the counter
      const m = muzzleXY(); R.fx.push({ k: 'wisp', x: m.x, y: m.y, sx: m.x, sy: m.y, t: 0, dur: 1.2, dx: fxr(-14, 14) });
      if (H.streams <= 1) R.hint = null;
    }
  }
  function muzzleXY() { const k = sc(bull.bz); return { x: PX(bull.u, bull.bz) + A.MUZZLE.x * k, y: YH(bull.bz, bull.jh) + A.MUZZLE.y * k }; }
  // the souls on their way from the counter to the gun, drawn over the scene
  function drawHintSouls() {
    const H = R.hint, T = TUNE.soulHint;
    if (!H) return;
    const from = { x: W - 10 - textWidth(String(R.souls)), y: 7 }, to = muzzleXY();
    for (let i = H.landed; i < T.souls; i++) {
      const p = (H.t - i * T.gap) / T.fly;
      if (p <= 0) continue;
      const e = p * p * (3 - 2 * p), bend = Math.sin(Math.PI * p) * (i - 1 || -1.4) * 46;
      const at = q => ({ x: from.x + (to.x - from.x) * q + Math.sin(Math.PI * q) * (i - 1 || -1.4) * 46, y: from.y + (to.y - from.y) * q - Math.sin(Math.PI * q) * 14 });
      const x = from.x + (to.x - from.x) * e + bend, y = from.y + (to.y - from.y) * e - Math.sin(Math.PI * p) * 14;
      // a trail of gold sparkles behind it, then the soul itself, drawn double size with a glow
      for (let j = 1; j <= 5; j++) { const q = Math.max(0, e - j * .045), t = at(q); if (Math.floor(R.t * 20 + j) % 2) rect(g, Math.round(t.x), Math.round(t.y), 1, 1, j < 3 ? '#fff0aa' : '#ffd44a'); }
      disc(g, Math.round(x), Math.round(y), 9, 'rgba(255,212,74,.22)');
      g.drawImage(A.GHOST, Math.round(x - 9), Math.round(y - 9), 18, 18);
    }
  }
  function drawSoulShot(s) {
    const k = sc(s.z), z0 = Math.max(ZN, s.z - .14), z1 = Math.max(ZN, s.z - .06), x = PX(s.u, s.z), y = YH(s.z, s.h), r = Math.max(1, Math.round(2.2 * k));
    line(g, PX(s.u - s.du * .14, z0), YH(z0, s.h), PX(s.u - s.du * .06, z1), YH(z1, s.h), '#b0701a');
    line(g, PX(s.u - s.du * .06, z1), YH(z1, s.h), x, y, '#ffd44a');
    disc(g, x, y, r + 1, Math.floor(R.t * 30 + s.z * 10) % 2 ? 'rgba(255,212,74,.6)' : 'rgba(255,212,74,.35)');
    disc(g, x, y, r, '#f4f0ff'); rect(g, x, y, 1, 1, '#ffffff');
  }

  // ---------- souls, effects and words ----------
  // Each soul in a quick streak rings a step higher, and a long enough streak in the hall drops a Spread Shot.
  function free(x, y, source, by) {
    R.souls++;
    emit('soul', { amount: 1, source: source || 'temp', by: by || 'shot' });
    R.streak = R.streakT > 0 ? R.streak + 1 : 0; R.streakT = 1.6;
    if (by !== 'clear') R.bestStreak = Math.max(R.bestStreak, R.streak + 1);   // the Shredder's own souls don't count
    R.fx.push({ k: 'wisp', x, y, sx: x, sy: y, t: 0, dur: 1.05, dx: fxr(-10, 10) });   // it floats up, then flies into the souls counter
    Snd.play('soul', R.streak);
    const section = R.beat + (R.event ? R.event.kind : '');
    if (R.streak + 1 === TUNE.streakDrop && R.phase === 'hall' && R.dropAt !== section) {
      R.dropAt = section;   // one per section
      addPickup('spread', bull.bz + .4, bull.u);
      emit('streak_drop'); popText(TUNE.streakDrop + ' STREAK!', PX(bull.u, bull.bz), YH(bull.bz, .42), '#ffd44a'); bark('streak');
      live(TUNE.streakDrop + ' in a row: a Spread Shot drops.');
    }
  }
  // A formation is wiped out only if every carpshit in it is killed before any of it is halfway down the hall.
  function formLost(f) { if (f.fid) R.forms[f.fid - 1].lost = true; }
  // A whole formation wiped out: a bonus soul for each carpshit in it. A pop and a chime; in lights out, a big moment.
  function wipe(F, x, y) {
    R.events.wipes = (R.events.wipes || 0) + 1; emit('wipe', { amount: F.n });
    for (let i = 0; i < F.n; i++) free(x + fxr(-10, 10), y + fxr(-6, 6), 'formation', 'wipe');
    const sparks = R.event && R.event.kind === 'dark' ? 14 : 6;
    for (let i = 0; i < sparks; i++) R.fx.push({ k: 'spark', x: x + fxr(-8, 8), y: y + fxr(-6, 6), s: 1, col: i % 2 ? '#ffd44a' : '#fff6e2', t: 0, dur: .4, a: Math.random() * 6 });
    if (sparks > 6) {
      R.fx.push({ k: 'big', text: 'WIPED OUT! +' + F.n, x: 120, y: 44, t: 0, dur: 1.3 });
      R.freeze = Math.max(R.freeze, .12); R.shake = Math.max(R.shake, .2); R.white = Math.max(R.white || 0, .05);
      Snd.play('wipe');
    } else { popText('WIPED OUT +' + F.n, x, y - 10, '#ffd44a'); Snd.play('volley', 5); }
    bark('wipe');
    live('Wiped out the whole formation: ' + F.n + ' bonus souls.');
  }
  // A kill in the dark frees a second soul.
  function bonusSoul(how, x, y, source) {
    const by = bonusBy(how);
    if (!by) return;
    free(x + 4, y - 2, source, by);
  }
  function killTemp(tp, how) {
    if (tp.dead) return;
    tp.dead = true; R.freeze = .045;
    if (R.hearts < TUNE.hearts && rnd() < TUNE.coffeeDrop) addPickup('coffee', tp.cub.w - R.dist + .06, tp.cub.s * .5);
    const at = posOf(tp), x = PX(at.u, at.z), y = YH(at.z, at.h), s = sc(at.z) * .85;
    if (how === 'slash') R.fx.push({ k: 'half', x, y, s, t: 0, dur: .5, img: tempLook(tp) }); else poof(at.u, at.z, at.h);
    free(x, y - 4, 'temp', how);
    bonusSoul(how, x, y, 'temp');
  }
  function killFly(f, how) {
    if (f.dead) return;
    f.dead = true; R.freeze = how === 'slash' ? .07 : .035;
    const x = PX(f.u, f.z), y = YH(f.z, f.h), s = sc(f.z);
    if (how === 'slash') R.fx.push({ k: 'half', x, y, s, t: 0, dur: .5, img: A.CARPF[0] }); else poof(f.u, f.z, f.h);
    free(x, y - 4, f.form ? 'formation' : 'carpshit', how);
    bonusSoul(how, x, y, f.form ? 'formation' : 'carpshit');
    if (f.fid) { const F = R.forms[f.fid - 1]; F.killed++; if (!F.lost && F.killed === F.n) wipe(F, x, y); }
  }
  function poof(u, z, h, n = 6) { R.fx.push({ k: 'poof', x: PX(u, z), y: YH(z, h), s: Math.max(.4, sc(z)), n, t: 0, dur: .35 }); }
  // a pop with the same words close by and just as fresh is already saying it
  function popText(text, x, y, col) { if (R.fx.some(f => f.k === 'pop' && f.text === text && f.t < .25 && Math.abs(f.x - x) < 24 && Math.abs(f.y - y) < 16)) return; R.fx.push({ k: 'pop', text, x, y, col, t: 0, dur: .8 }); }
  function updateFx(dt) {
    for (const f of R.fx) {
      f.t += dt;
      if (f.k === 'wisp') {
        const up = Math.min(1, f.t / .3), k = Math.max(0, (f.t - .3) / (f.dur - .3)), e = k * k, to = meterSpot();
        const hx = f.sx + f.dx * up, hy = f.sy - 14 * up;
        f.x = hx + (to.x - hx) * e; f.y = hy + (to.y - hy) * e;
        if (f.t >= f.dur) { R.shown = Math.min(R.souls, R.shown + 1); R.meterPulse = .16; }
      }
      else if (f.k === 'pop') f.y -= 12 * dt;
      else if (f.k === 'bit') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 90 * dt; }
      else if (f.k === 'strip') { f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= .96; }
      else if (f.k === 'rise' && f.t > 0) { f.y += f.vy * dt; f.x += Math.sin(f.t * 3 + f.ph) * 10 * dt; }
      else if (f.k === 'smoke') { f.y -= 14 * dt; f.x += Math.sin(f.t * 4) * 4 * dt; }
    }
    R.fx = R.fx.filter(f => f.t < f.dur);
    if (!R.fx.some(f => f.k === 'wisp')) R.shown = R.souls;
    R.meterPulse = Math.max(0, R.meterPulse - dt);
  }
  // Unruggabull's lines: each once per run, over his head, in his own blips until Jonnie's recordings exist.
  const LINES = {
    start: 'FLOOR THIRTEEN. UNLUCKY FOR SOME.', deflect: 'NO THANK YOU.', move: 'LIFT WITH YOUR LEGS.',
    dark: 'WHO TURNED OUT THE LIGHTS?', spread: "NOW WE'RE TALKING.", coffee: 'DECAF. FINE.', streak: 'ON A ROLL.',
    copy: 'COPY THAT.', wake: 'PROCESS THIS.', again: 'ROUND TWO.', jam: 'PAPER JAM. CLASSIC.', smash: 'OUT OF OFFICE.',
    low: 'BEEN WORSE. NOT MUCH.', clear: 'FLOOR THIRTEEN: UNRUGGED.', rugged: 'WHOA!', disarm: 'HEY! THAT WAS MINE.', wipe: 'CLEAN SWEEP.'
  };
  // Says a line unless it's been said this run or the Shredder is talking (unless `over` it). Returns how long it takes.
  function bark(key, over) {
    const said = R.events.said || (R.events.said = {});
    if (said[key] || (R.talk && !over)) return 0;
    said[key] = true;
    const text = LINES[key], plan = Snd.talkTimes(text, 'bull');
    R.bark = { key, text, t: 0, times: plan.times, total: plan.total + 1.1 };
    Snd.say(text, 'bull'); live('Unruggabull: ' + text);
    return plan.total;
  }
  const lowHealth = () => R.hearts === 1 && (R.phase === 'hall' || R.phase === 'wake' || R.phase === 'boss');
  // Where freed souls fly to: the end of the meter's fill in the hall, the souls counter after.
  function meterSpot() {
    if (R.phase === 'hall') return { x: 87 + Math.round(62 * Math.min(1, R.shown / TUNE.goal)), y: 7 };
    return { x: W - 10 - textWidth(String(R.souls)), y: 7 };
  }
  function drawBig(f) {
    const k = f.t / f.dur;
    if (k < .8 || Math.floor(f.t * 20) % 2) otxt(g, f.text, f.x, Math.round(f.y - k * 10), Math.floor(f.t * 10) % 2 ? '#ffd44a' : '#fff6e2', 2, 'center');
  }
  function drawWisp(f) {
    const k = f.t / f.dur;
    g.save(); g.globalAlpha = k > .85 ? .5 : .9; g.drawImage(A.GHOST, Math.round(f.x - 4), Math.round(f.y - 4)); g.restore();
  }
  function talk(text, who) {
    const plan = Snd.talkTimes(text, who);
    R.talk = { text, who, t: 0, times: plan.times, total: plan.total + 1.3 };
    Snd.say(text, who);
    live(text);
    return plan.total;
  }
  const liveEl = $('live');
  function live(text) { liveEl.textContent = ''; liveEl.textContent = text; }

  // ---------- one tick ----------
  function update(dt) {
    if (state === 'intro') { R.t += dt; updateIntro(dt); return; }
    if (state === 'title' || state === 'over') {
      R.t += dt;
      updateFx(dt);
      if (R.talk) { R.talk.t += dt; if (R.talk.t > R.talk.total) R.talk = null; }
      if (R.bark) { R.bark.t += dt; if (R.bark.t > R.bark.total) R.bark = null; }
      return;
    }
    if (state !== 'play') return;
    R.white = Math.max(0, (R.white || 0) - dt); R.zap = Math.max(0, (R.zap || 0) - dt);
    // hit-stop: a few frames' pause when something dies, so kills land
    if (R.freeze > 0) { R.freeze -= dt; return; }
    // slow motion after the final hit: real time counts down, the game runs slow, then the Shredder blows
    if (R.slow > 0) {
      R.slow -= dt; dt *= TUNE.finish.rate;
      R.boss.flash = Math.floor(R.slow * 14) % 2 ? .05 : 0;
      if (R.slow <= 0) { R.slow = 0; R.boss.flash = 0; blowUp(); }
    }
    R.t += dt; R.phaseT += dt;
    R.streakT -= dt; R.empty = Math.max(0, R.empty - dt); R.chargeFlash = Math.max(0, (R.chargeFlash || 0) - dt); R.spread = Math.max(0, R.spread - dt);
    if (R.charge < TUNE.charges) { R.rechargeT += dt; while (R.rechargeT >= TUNE.recharge && R.charge < TUNE.charges) { R.rechargeT -= TUNE.recharge; R.charge++; } }
    else { R.rechargeT = 0; if (R.dry) { R.dry = false; Snd.play('ready'); } }
    R.shake = Math.max(0, R.shake - dt); R.red = Math.max(0, R.red - dt); R.rallyPop = Math.max(0, (R.rallyPop || 0) - dt);
    // a rally speeds the music up as it goes
    const tempo = R.phase === 'boss' && R.boss.rally ? 1 + Math.min(.4, .05 * R.boss.rally.count) : 1;
    if (tempo !== R.tempo) { R.tempo = tempo; Snd.tempo(tempo); }
    if (R.banner) { R.banner.t += dt; if (R.banner.t > R.banner.dur) R.banner = R.banner.then || null; }
    if (R.talk) { R.talk.t += dt; if (R.talk.t > R.talk.total) R.talk = null; }
    if (R.bark) { R.bark.t += dt; if (R.bark.t > R.bark.total) R.bark = null; }
    if (R.phase === 'hall' && R.t > 5.2) bark('start');
    // one heart left: a heartbeat
    R.pulse = Math.max(0, R.pulse - dt);
    if (lowHealth()) { R.pulseT -= dt; if (R.pulseT <= 0) { R.pulseT = .9; R.pulse = .35; Snd.play('thump'); } } else R.pulseT = 0;
    R.dist += R.speed * dt;
    if (R.phase === 'hall') updateHall(dt);
    updateBull(dt);
    updatePull(dt);
    updateRoll(dt);
    updateHint(dt);
    updateTemps(dt);
    updateBoxes(dt);
    updateRows(dt);
    updatePickups(dt);
    updateFlies(dt);
    updateProjs(dt);
    updateShots(dt);
    updateBoss(dt);
    updateFx(dt);
    updatePhase(dt);
  }
  function updatePhase(dt) {
    const b = R.boss;
    if (R.phase === 'wake') {
      R.speed = Math.max(0, R.speed - dt * .15);
      if (R.phaseT > 1.4 && b.st === 'sleep') {
        b.st = 'awake'; R.shake = .3; Snd.play('wake');
        // an old-school boss card, and its health bar ticks up to full
        R.banner = { text: 'THE SHREDDER', sub: 'HEAD OF DOCUMENT DESTRUCTION', t: 0, dur: 2.8, y: 96 };
      }
      if (b.st === 'awake' && b.bar < 1 && R.phaseT > 1.7) {
        const was = b.bar; b.bar = Math.min(1, (R.phaseT - 1.7) / 1.2);
        if (Math.floor(b.bar * 20) > Math.floor(was * 20)) Snd.play('tick');
      }
      if (R.phaseT > 2 && !R.events.bossAt) R.events.bossAt = R.phaseT + talk(R.continues ? 'BACK FOR SECONDS?' : 'YOUR RUG HAS BEEN PROCESSED.', 'shredder') + .3;
      // Unruggabull answers it, then the fight starts
      if (R.events.bossAt && R.phaseT > R.events.bossAt && !R.events.replied) { R.events.replied = true; R.events.bossAt = R.phaseT + bark(R.continues ? 'again' : 'wake', true) + .2; }
      else if (R.events.bossAt && R.phaseT > R.events.bossAt) startBoss();
    } else if (R.phase === 'win') {
      // the souls inside come out one at a time, then the card
      if (R.phaseT < 1.5 && Math.random() < dt * 14) R.fx.push({ k: 'bit', x: fxr(BACK.x0 + 6, BACK.x1 - 6), y: fxr(BACK.y0 + 6, BACK.y1 - 6), vx: fxr(-50, 50), vy: fxr(-70, -10), t: 0, dur: fxr(.8, 1.4) });
      const due = Math.min(TUNE.bossSouls, Math.floor(Math.max(0, R.phaseT - .8) / .1));
      while (b.freed < due) { b.freed++; free(fxr(BACK.x0 + 10, BACK.x1 - 10), BACK.y1 - 8, 'shredder', 'clear'); }
      if (R.phaseT > 1.6 && !R.talk) bark('clear');
      if (R.phaseT > 2.1 && !R.events.clearBanner) {
        R.events.clearBanner = true;
        R.banner = { text: 'FLOOR 13 CLEAR', sub: 'SOULS FREED: ' + R.souls, t: 0, dur: 99 };
        Snd.play('clear'); live('Floor 13 clear.');
      }
      if (R.banner && R.events.clearBanner) R.banner.sub = 'SOULS FREED: ' + R.souls;
      if (R.phaseT > 4.4) endRun('clear');
    } else if (R.phase === 'dead') {
      if (R.phaseT > .12 && !(R.events.said && R.events.said.rugged)) { if (R.talk) { R.talk = null; Snd.hush(); } bark('rugged', true); }   // his WHOA! cuts off a taunt
      if (R.phaseT > 1.9) endRun('rugged');
    }
  }
  function die() {
    R.phase = 'dead'; R.phaseT = 0; R.hearts = 0; R.bark = null;
    emit('game_over', { cause: R.lastCause || 'unknown', score: R.souls });
    endPull();
    R.banner = { text: 'RUGGED.', t: 0, dur: 99, col: '#ff7050' };
    Snd.music(null); Snd.play('over'); Snd.play('yank');
    live('Rugged.');
  }

  // ---------- drawing ----------
  let BG = null;
  function buildBG() {
    BG = A.canvas(W, H);
    const b = BG.getContext('2d');
    rect(b, 0, 0, W, H, '#3b3742');
    for (const s of [-1, 1]) {
      poly(b, '#2d2934', [[PX(s, ZN), YH(ZN, .32)], [PX(s, 1), YH(1, .32)], [PX(s, 1), FY(1)], [PX(s, ZN), FY(ZN)]]);
      line(b, PX(s, ZN), YH(ZN, .32), PX(s, 1), YH(1, .32), '#4c4856');
    }
    poly(b, '#1d1a22', [[PX(-1, ZN), CY(ZN)], [PX(1, ZN), CY(ZN)], [PX(1, 1), CY(1)], [PX(-1, 1), CY(1)]]);
    poly(b, '#28304a', [[PX(-1, ZN), FY(ZN)], [PX(1, ZN), FY(ZN)], [PX(1, 1), FY(1)], [PX(-1, 1), FY(1)]]);
    for (const u of [-.6, .6]) line(b, PX(u, ZN), FY(ZN), PX(u, 1), FY(1), '#222a40');
    quadF(b, '#7a1d1a', -TUNE.runner, TUNE.runner, ZN, 1);
    rect(b, BACK.x0, BACK.y0, BACK.x1 - BACK.x0, BACK.y1 - BACK.y0, '#34303c');
  }
  function drawHall() {
    g.drawImage(BG, 0, 0);
    for (let k = 0; k < 6; k++) { const z = mod1(k / 6 - R.dist); for (const s of [-1, 1]) rect(g, PX(s, z), CY(z), 1, FY(z) - CY(z), '#26222c'); }
    for (let k = 0; k < 5; k++) { const z = mod1(k / 5 - R.dist); rect(g, PX(-.25, z), CY(z) + 2, PX(.25, z) - PX(-.25, z), Math.max(1, Math.round(3 * sc(z))), '#e8e4c8'); }
    for (let k = 0; k < 8; k++) { const z = mod1(k / 8 - R.dist); rect(g, PX(-1, z), FY(z), PX(1, z) - PX(-1, z), 1, '#222a40'); }
    // the runner: stripes move with the floor, or away from you when it pulls
    const P = R.pull, edge = R.roll ? (Math.floor(R.t * 12) % 2 ? '#7fd4ff' : '#bfefff') : P.st === 'warn' ? (Math.floor(P.t * 10) % 2 ? '#fff6e2' : '#ffd44a') : P.st === 'on' ? '#ff9628' : '#c9962e';
    quadF(g, '#7a1d1a', -TUNE.runner, TUNE.runner, ZN, 1);
    for (let k = 0; k < 10; k++) { const z = mod1(k / 10 + R.roff); rect(g, PX(-.26, z), FY(z) - 1, PX(.26, z) - PX(-.26, z), Math.max(1, Math.round(2 * sc(z))), '#5a1412'); }
    quadF(g, edge, -TUNE.runner, -TUNE.runner + .04, ZN, 1); quadF(g, edge, TUNE.runner - .04, TUNE.runner, ZN, 1);
    sprayLanes();
    if (R.cut && R.cut.z > 0) {
      const z = R.cut.z, y = FY(z), x0 = PX(-TUNE.runner, z), x1 = PX(TUNE.runner, z);
      for (let x = Math.round(x0); x < x1; x++) rect(g, x, y - 1 + ((x * 7) % 3), 1, 2, '#28304a');
    }
  }
  // A side spray coming: the floor beside the rug flashes red while it warns, and stays tinted while it sprays.
  function sprayLanes() {
    const P = R.pull;
    if (!P.spray || (P.st !== 'warn' && P.st !== 'on')) return;
    g.save(); g.globalAlpha = P.st === 'warn' ? (Math.floor(P.t * 8) % 2 ? .35 : .12) : .14;
    for (const sd of [-1, 1]) quadF(g, '#d63428', sd > 0 ? TUNE.runner + .04 : -.66, sd > 0 ? .66 : -TUNE.runner - .04, ZN, 1);
    g.restore();
  }
  // Cracks on its panels, clear of the sign, the eyes and the mouth, in the order they appear.
  const CRACKS = [[[8, 6], [13, 12], [11, 17]], [[66, 5], [62, 10], [64, 15], [60, 19]], [[6, 22], [11, 26], [9, 31]], [[68, 24], [63, 27], [66, 31]],
    [[16, 4], [19, 9], [17, 12]], [[58, 8], [55, 13]], [[12, 14], [18, 17]], [[62, 16], [57, 22]]];
  function drawShredder() {
    const b = R.boss, x0 = BACK.x0, x1 = BACK.x1, y0 = BACK.y0, y1 = BACK.y1, w = x1 - x0, t = R.t;
    const dead = b.st === 'dead';
    const body = b.flash > 0 ? '#d8dce8' : dead ? '#3a3a44' : '#4a4e5a';
    rect(g, x0 + 4, y0 + 3, w - 8, y1 - y0 - 3, body);
    rect(g, x0 + 4, y0 + 3, w - 8, 2, b.flash > 0 ? '#ffffff' : b.tick > 0 ? '#b8bcc8' : '#6a6e7c');   // blaster hits only glint the top edge
    rect(g, x0 + 7, y0 + 25, w - 14, 1, '#3a3e48');
    rect(g, x0 + 9, y0 + 21, 6, 2, '#8a8e9c'); rect(g, x1 - 15, y0 + 21, 6, 2, '#8a8e9c');
    rect(g, 104, y0 + 6, 32, 9, '#1a1418'); txt(g, 'SHRED-O', 120, y0 + 8, '#ffd44a', 1, 'center');
    shredderEyes();
    // it wears down: more cracks the more damage it has taken
    const wear = b.st === 'fight' || dead ? 1 - b.hp / TUNE.bossHP : 0, n = Math.floor(wear * CRACKS.length * 1.15);
    for (let i = 0; i < Math.min(n, CRACKS.length); i++) { const c = CRACKS[i]; for (let j = 1; j < c.length; j++) line(g, x0 + c[j - 1][0], y0 + c[j - 1][1], x0 + c[j][0], y0 + c[j][1], '#24242c'); }
    if (b.ph >= 3 && b.st === 'fight' && Math.floor(t * 9) % 4 === 0) { rect(g, x1 - 12, y0 + 9, 1, 1, '#ffd44a'); rect(g, x1 - 10, y0 + 7, 1, 1, '#fff6e2'); }
    // the mouth, fed by the runner
    const my = y1 - 13, open = b.spit > 0 ? 2 : 0;
    rect(g, x0 + 10, my - open, w - 20, 9 + open, '#09070b');
    if (b.spit > 0) rect(g, x0 + 12, my + 2, w - 24, 4, '#3a1010');
    shredderTeeth();
    rect(g, PX(-TUNE.runner, 1), my + 9, PX(TUNE.runner, 1) - PX(-TUNE.runner, 1), 4, '#5a1412');
    if (b.st === 'sleep') for (let i = 0; i < 3; i++) { const k = mod1(t * .4 + i / 3); txt(g, 'Z', x1 - 8 + Math.round(Math.sin(k * 6) * 2), Math.round(y0 + 2 - k * 16), k > .8 ? '#5a5670' : '#a8a0c0'); }
  }
  // The hall is endless at first: it runs on into the fog. In the copy room the Shredder appears far down it and
  // closes in as you near the goal (souls and time both count), reaching the end of the hall as it wakes. (Cosmetic.)
  function shredderZ() {
    if (R.phase === 'hall') {
      if (R.beat < 2) return Infinity;
      const B = BEATS[2], from = R.copyAt || 0;
      const sp = clamp((R.souls - from) / Math.max(1, TUNE.goal - from), 0, 1), tp = clamp(R.beatT / B.minT, 0, 1);
      const p = Math.max(Math.min(sp, tp), clamp(R.beatT / B.max, 0, 1));
      return 1 + 4.5 * Math.pow(1 - p, 1.4);
    }
    if (R.phase === 'wake') { const k = clamp(R.phaseT / 1.2, 0, 1), z0 = R.shzWake === Infinity || R.shzWake == null ? 1.6 : R.shzWake; return z0 + (1 - z0) * k * k * (3 - 2 * k); }
    return 1;
  }
  // the hall beyond the far wall, fading to black: floor, runner, walls, ceiling and its lights, moving with you
  function drawFarHall() {
    const fog = (hex, f) => { const n = parseInt(hex.slice(1), 16), k = 1 - f; return 'rgb(' + Math.round((n >> 16) * k) + ',' + Math.round((n >> 8 & 255) * k) + ',' + Math.round((n & 255) * k) + ')'; };
    rect(g, BACK.x0, BACK.y0, BACK.x1 - BACK.x0, BACK.y1 - BACK.y0, '#060508');
    for (let i = 0; i < 12; i++) {
      const z0 = 1 + i * .45, z1 = z0 + .45, f = Math.min(1, i / 11);
      for (const sd of [-1, 1]) poly(g, fog('#2d2934', f), [[PX(sd, z0), CY(z0)], [PX(sd, z1), CY(z1)], [PX(sd, z1), FY(z1)], [PX(sd, z0), FY(z0)]]);
      quadF(g, fog('#1d1a22', f), -1, 1, z0, z1, 1);
      quadF(g, fog('#28304a', f), -1, 1, z0, z1, 0);
      quadF(g, fog('#7a1d1a', f), -TUNE.runner, TUNE.runner, z0, z1, 0);
    }
    for (let k = 0; k < 10; k++) {
      const z = 1 + mod1(k / 10 - R.dist / 4.5) * 4.5, f = Math.min(1, (z - 1) / 5);
      rect(g, PX(-.25, z), CY(z) + 1, PX(.25, z) - PX(-.25, z), 1, fog('#e8e4c8', f));
      rect(g, PX(-1, z), FY(z), PX(1, z) - PX(-1, z), 1, fog('#222a40', f));
    }
  }
  // The Shredder is drawn on its own canvas, then onto the scene scaled about the foot of its mouth with hard pixels: it
  // swells as it lunges at you and shrinks as it recoils, breathes, and shudders when jammed or hit hard.
  const SHC = A.canvas(W, H), shg = SHC.getContext('2d');
  function withShredder(fn) {
    const b = R.boss, main = g;
    shg.clearRect(0, 0, W, H);
    g = shg; try { fn(); } finally { g = main; }
    const live = b.st === 'fight' || b.st === 'awake', fast = b.ph === 3 || b.hp < 15;
    const breathe = live ? Math.sin(R.t * (fast ? 4.2 : 2.4)) * .012 : 0;
    const k = clamp(1 + (b.push || 0) * .07 + breathe, .88, 1.14);
    const jx = (b.shudder > 0 || (b.jam > 0 && live) || (live && b.hp < 15 && Math.random() < .3)) ? Math.round(fxr(-1.4, 1.4)) : 0;
    const sx = BACK.x0 - 8, sy = BACK.y0 - 22, sw = BACK.x1 - BACK.x0 + 16, sh = BACK.y1 - sy + 4, fy = BACK.y1;
    // further down the hall it shrinks toward the vanishing point
    const zS = shredderZ(), kv = sc(zS) / sc(1);
    const dx = 120 - (120 - sx) * k + jx, dy = fy - (fy - sy) * k + Math.max(0, b.push || 0) * 1.5;
    g.drawImage(SHC, sx, sy, sw, sh, Math.round(VX + (dx - VX) * kv), Math.round(HY + (dy - HY) * kv), Math.round(sw * k * kv), Math.round(sh * k * kv));
  }
  // Lights out: far down the endless hall, two red eyes open now and then, watching. Something is down there.
  function darkEyes() {
    const k = Math.floor(R.t / 2.6) % 3, open = (R.t % 2.6) > .5 && (R.t % 2.6) < 1.9 && k !== 1;
    if (!open) return;
    const z = 4.2, x = PX(0, z), y = YH(z, .22), lit = Math.floor(R.t * 3) % 2 ? '#ff5040' : '#a02018';
    rect(g, Math.round(x - 4), Math.round(y), 2, 1, lit); rect(g, Math.round(x + 2), Math.round(y), 2, 1, lit);
  }
  // Its eyes and teeth, drawn again over the dark in power saving mode.
  function shredderEyes() {
    const b = R.boss, ey = BACK.y0 + 17, awake = b.st === 'awake' || b.st === 'fight';
    if (b.jam > 0 || b.st === 'dead') {
      for (const ex of [106, 127]) { line(g, ex, ey - 1, ex + 5, ey + 3, '#ffd44a'); line(g, ex, ey + 3, ex + 5, ey - 1, '#ffd44a'); }
    } else if (b.laugh > 0 && b.st === 'fight') {
      // laughing at you: squeezed shut in two hard arcs, brows up
      for (const ex of [106, 127]) { line(g, ex, ey + 2, ex + 3, ey, '#ff5040'); line(g, ex + 3, ey, ex + 6, ey + 2, '#ff5040'); }
      rect(g, 105, ey - 3, 8, 1, '#1a1418'); rect(g, 127, ey - 3, 8, 1, '#1a1418');
    } else if (awake || b.chomp > 0) {
      const low = b.st === 'fight' && b.hp < 15 && Math.floor(R.t * 14) % 3 === 0;
      const charge = surgeSoon(), lit = charge ? (Math.floor(R.t * 16) % 2 ? '#ffffff' : '#3aa8e0') : low ? '#5a1010' : b.chomp > 0 || b.rev > 0 || Math.floor(R.t * 3) % 2 ? '#ff5040' : '#a02018';
      if (b.blink > 0) { rect(g, 106, ey + 1, 7, 1, lit); rect(g, 127, ey + 1, 7, 1, lit); }
      else {
        rect(g, 106, ey, 7, 3, lit); rect(g, 127, ey, 7, 3, lit);
        // pupils follow you down the hall
        const px = clamp(Math.round((bull.u + .6) / 1.2 * 4), 0, 4) + 1;
        rect(g, 106 + px, ey, 1, 3, '#1a1418'); rect(g, 127 + px, ey, 1, 3, '#1a1418');
      }
      // brows: level when it's calm, down at the middle once it's cross (phase 2 on, or winding up an attack)
      if (b.ph >= 2 || b.rev > 0 || b.chomp > 0) { line(g, 105, ey - 3, 112, ey - 1, '#1a1418'); line(g, 127, ey - 1, 134, ey - 3, '#1a1418'); }
      else { rect(g, 105, ey - 2, 8, 1, '#1a1418'); rect(g, 127, ey - 2, 8, 1, '#1a1418'); }
    } else {
      rect(g, 106, ey + 1, 7, 1, '#22222a'); rect(g, 127, ey + 1, 7, 1, '#22222a');
    }
  }
  function shredderTeeth() {
    const b = R.boss, x0 = BACK.x0, x1 = BACK.x1, my = BACK.y1 - 13, open = b.spit > 0 ? 2 : 0, awake = b.st === 'awake' || b.st === 'fight';
    // the tell: its mouth glows red just before it spits
    if (b.rev > 0 && b.st === 'fight') rect(g, x0 + 10, my - open, x1 - x0 - 20, 9 + open, Math.floor(R.t * 16) % 2 ? '#d63428' : '#7a1010');
    const fast = b.chomp > 0 || b.laugh > 0 || R.pull.st === 'on' || b.rev > 0, moving = (awake && b.jam <= 0) || b.chomp > 0;
    const ch = moving ? Math.floor(R.t * (fast ? 24 : 10)) % 2 : 0;
    for (let x = x0 + 11; x < x1 - 12; x += 4) { rect(g, x, my - open, 2, 3 + ch, '#d8dde8'); rect(g, x + 2, my + 6 - ch, 2, 3 + ch, '#d8dde8'); }
  }
  // A station is a cubicle (grey partition and a green monitor) or, in the copy room, a beige copier.
  // The temp hides behind it and pops up over the top.
  function drawCub(cb, z) {
    const s = cb.s, zb = z + .12, top = cb.top, copier = cb.kind === 'copier';
    const side = copier ? '#9a917c' : '#4a4e5a', face = copier ? '#c8bfa8' : '#5e6270', lip = copier ? '#2a2a32' : '#8a8e9c', u0 = copier ? .66 : .64;
    poly(g, side, [[PX(s * u0, z), FY(z)], [PX(s * u0, zb), FY(zb)], [PX(s * u0, zb), YH(zb, top)], [PX(s * u0, z), YH(z, top)]]);
    if (cb.temp && !cb.temp.dead && cb.temp.pop > 0) drawTemp(cb.temp, z + .06);
    poly(g, face, [[PX(s, z), FY(z)], [PX(s * u0, z), FY(z)], [PX(s * u0, z), YH(z, top)], [PX(s, z), YH(z, top)]]);
    const x0 = Math.min(PX(s, z), PX(s * u0, z)), wd = Math.abs(PX(s, z) - PX(s * u0, z)), k = sc(z);
    rect(g, x0, YH(z, top), wd, Math.max(1, Math.round(2 * k)), lip);
    if (copier) {
      // paper tray, a status light and a seam
      rect(g, x0 + wd * .2, YH(z, top * .55), wd * .6, Math.max(1, Math.round(2 * k)), '#fff6e2');
      rect(g, x0 + wd * .15, YH(z, top * .85), Math.max(1, Math.round(2 * k)), Math.max(1, Math.round(2 * k)), Math.floor(R.t * 2 + cb.w * 9) % 2 ? '#5ac08a' : '#2a6a4a');
      rect(g, x0, YH(z, top * .35), wd, 1, '#9a917c');
    } else {
      const mx = PX(s * .93, z), my = YH(z, top), mw = Math.max(2, Math.round(10 * k)), mh = Math.max(2, Math.round(7 * k));
      rect(g, mx - mw / 2, my - mh, mw, mh, '#1a1418'); rect(g, mx - mw / 2 + 1, my - mh + 1, Math.max(1, mw - 2), Math.max(1, mh - 2), monitor(cb));
    }
  }
  // Monitors are green.
  const monitor = () => '#5ac08a';
  // Wall and floor dressing for each beat: posters and water coolers, all-staff streamers, paper stacks.
  const POSTERS = ['#ffd44a', '#7fd4ff', '#ff7050', '#5ac08a'];
  function drawDecor(d, z) {
    const s = d.s, k = sc(z);
    if (d.kind === 'poster') {
      const z1 = z + .07, col = POSTERS[Math.floor(d.col * 4)];
      poly(g, '#e8e4d8', [[PX(s, z), YH(z, .66)], [PX(s, z1), YH(z1, .66)], [PX(s, z1), YH(z1, .46)], [PX(s, z), YH(z, .46)]]);
      poly(g, col, [[PX(s, z + .008), YH(z + .008, .63)], [PX(s, z1 - .008), YH(z1 - .008, .63)], [PX(s, z1 - .008), YH(z1 - .008, .52)], [PX(s, z + .008), YH(z + .008, .52)]]);
    } else if (d.kind === 'streamer') {
      const z1 = z + .3;
      poly(g, '#961e16', [[PX(s, z), YH(z, .74)], [PX(s, z1), YH(z1, .74)], [PX(s, z1), YH(z1, .68)], [PX(s, z), YH(z, .68)]]);
      for (let i = 0; i < 4; i++) { const zz = z + i * .08; rect(g, PX(s, zz) - (s > 0 ? 1 : 0), YH(zz, .68), 1, Math.max(1, Math.round(6 * sc(zz))), '#ffd44a'); }
    } else if (d.kind === 'cooler') {
      const w = Math.max(2, Math.round(A.COOLER.width * k)), h = Math.max(3, Math.round(A.COOLER.height * k));
      g.drawImage(A.COOLER, Math.round(PX(s * .93, z) - w / 2), Math.round(FY(z) - h), w, h);
    } else if (d.kind === 'stack') {
      const w = Math.max(2, Math.round(A.STACK.width * k)), h = Math.max(2, Math.round(A.STACK.height * k));
      g.drawImage(A.STACK, Math.round(PX(s * .93, z) - w / 2), Math.round(FY(z) - h), w, h);
    }
  }
  function drawSign(sg, z) {
    // drawn at 1x so the 3x5 lettering stays crisp, hung high so it passes over the action; it drops in with a bounce
    const w = sg.img.width, h = sg.img.height, rest = YH(z, .93), k = clamp((R.t - (sg.born || 0)) / .5, 0, 1);
    const ease = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), y = CY(z) - h + (rest - CY(z) + h) * ease;
    line(g, 120 - w * .35, CY(z), 120 - w * .35, y, '#4c4856'); line(g, 120 + w * .35, CY(z), 120 + w * .35, y, '#4c4856');
    g.drawImage(sg.img, Math.round(120 - w / 2), Math.round(y), w, h);
  }
  // which of the three temps sits at this desk: from where the desk is, so it never touches the run's dice
  const tempLook = tp => A.TEMPS[Math.floor(Math.abs(tp.cub.w * 7.3 + tp.cub.s)) % A.TEMPS.length];
  function drawTemp(tp, zt) {
    const s = sc(zt) * .85, w = Math.max(2, Math.round(26 * s)), h = Math.max(2, Math.round(15 * s));
    const x = Math.round(PX(tp.cub.s * .8, zt) - w / 2), yb = YH(zt, tp.cub.top - .12 + tp.pop * .17), img = tempLook(tp), hh = Math.round(h * img.height / 15);
    g.drawImage(img, x, Math.round(yb - hh), w, hh);
    // the tell: a temp about to throw flashes a ! first
    if (tp.will && tp.st === 'up' && !tp.threw && tp.t > .12 && Math.floor(tp.t * 12) % 3) {
      const tx = Math.round(x + w / 2), ty = Math.round(yb - h - 10);
      rect(g, tx - 3, ty - 1, 7, 9, '#1a1418'); rect(g, tx - 2, ty, 5, 7, '#fff6e2'); txt(g, '!', tx - 1, ty + 1, '#d63428');
    }
    if (tp.st === 'up' && tp.t > .25 && !tp.threw) g.drawImage(A.WAD, Math.round(x + w * .75), Math.round(yb - h - 4 * s), Math.max(2, Math.round(5 * s)), Math.max(2, Math.round(5 * s)));
  }
  function drawBox(bx, z) {
    const s = sc(z), w = Math.max(3, Math.round(A.BOX.width * s)), h = Math.max(2, Math.round(A.BOX.height * s));
    const x = PX(bx.u, z), y = FY(z) - (bx.hit ? Math.sin(bx.hit * 9) * 6 * s : 0);
    if (bx.hit) { g.save(); g.globalAlpha = 1 - bx.hit * 2; }
    g.drawImage(A.BOX, Math.round(x - w / 2), Math.round(y - h), w, h);
    if (bx.tall) for (let i = 1; i < 3; i++) g.drawImage(A.BOX, Math.round(x - w / 2 + (i % 2 ? 1 : -1) * s), Math.round(y - h * (i + 1) + i * s), w, h);   // a stack too tall to jump
    if (bx.hit) g.restore();
  }
  function shadow(u, z, wpx) { const s = sc(z); rect(g, PX(u, z) - wpx * s / 2, FY(z) - 1, Math.max(1, wpx * s), Math.max(1, Math.round(2 * s)), 'rgba(8,6,12,.45)'); }
  function drawFly(f) {
    const s = sc(f.z), w = Math.max(3, Math.round(26 * s)), h = Math.max(2, Math.round(11 * s)), x = PX(f.u, f.z), y = YH(f.z, f.h);
    shadow(f.u, f.z, 18);
    wavy(A.CARPF[Math.floor(R.t * 8 + f.ph) % 2], x - w / 2, y - h / 2, w, h, R.t * 14 + f.ph, Math.max(1, 1.6 * s));
    if (f.hit > 0) { g.save(); g.globalAlpha = .6; rect(g, x - w / 2, y - h / 2, w, h, '#ffffff'); g.restore(); }
  }
  // A rug in flight ripples: the sprite is drawn in thin vertical strips, each bobbing on a wave.
  function wavy(img, x, y, w, h, ph, amp) {
    const n = 13, sw = img.width / n, dw = w / n;
    for (let i = 0; i < n; i++) g.drawImage(img, i * sw, 0, sw, img.height, Math.round(x + i * dw), Math.round(y + Math.sin(ph + i * .75) * amp), Math.ceil(dw), Math.round(h));
  }
  // Incoming paper has a jagged edge that blinks red and orange, never a round glow, so it can't pass for a pickup.
  // The Shredder's wads of shredded paper spin in quarter turns and shed strips behind them; the rally's wad has a
  // white-hot edge inside the red. Paper you knocked back loses the edge, throws a shadow and sparkles blue.
  function drawProj(p) {
    const s = sc(p.z), bundle = p.kind === 'bundle' || p.kind === 'scrap', img = p.kind === 'wad' ? A.WAD : bundle ? A.BUNDLE : p.kind === 'plane' ? A.PLANE : A.STAPLE;
    const big = (p.kind === 'scrap' ? .6 : 1) * (p.friendly ? 1 : bundle ? (p.rally ? 1.4 : 1.2) : 1.35), blink = Math.floor(R.t * 10 + p.spin) % 2;
    const w = Math.max(2, Math.round(img.width * s * big)), h = Math.max(1, Math.round(img.height * s * big)), x = PX(p.u, p.z), y = YH(p.z, p.h);
    if (p.friendly) shadow(p.u, p.z, img.width * .8);
    else if (bundle) for (let k = 1; k <= 3; k++) {
      const tz = p.z - p.vz * k * .05, tu = p.u - p.vu * k * .05, j = (k * 7 + Math.floor(p.spin)) % 5 - 2;
      rect(g, PX(tu, tz) + j, YH(tz, p.h) + ((k * 3) % 4) - 2, Math.max(1, Math.round(3 * sc(tz))), 1, k === 1 ? '#f2eee2' : '#b8b4a8');
    }
    // speed streaks round a rally bundle: more and longer the longer the rally goes
    const rl = p.rally && R.boss.rally;
    if (rl && rl.count > 0) {
      const n = Math.min(10, 3 + rl.count), r0 = w * .6 + 2, len = 2 + Math.min(6, rl.count), cx = Math.round(x), cy = Math.round(y);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.floor(R.t * 12) * .3, l = len * (k % 2 ? .6 : 1);
        line(g, Math.round(cx + Math.cos(a) * r0), Math.round(cy + Math.sin(a) * r0 * .8), Math.round(cx + Math.cos(a) * (r0 + l)), Math.round(cy + Math.sin(a) * (r0 + l) * .8), k % 3 ? (p.friendly ? '#7fd4ff' : '#ffb080') : '#ffffff');
      }
    }
    const rot = bundle ? Math.floor(p.spin * .8) % 4 : 0, ix = -Math.round(w / 2), iy = -Math.round(h / 2);
    g.save(); g.translate(Math.round(x), Math.round(y)); if (rot) g.rotate(rot * Math.PI / 2);
    const ring = (col, d) => { const sil = tinted(img, col); for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d]]) g.drawImage(sil, ix + dx, iy + dy, w, h); };
    if (p.rally && !p.friendly) { ring('#d63428', 2); ring(blink ? '#ffffff' : '#ffb080', 1); }
    else if (!p.friendly) ring(blink ? '#ff3020' : '#ff9628', 1);
    g.drawImage(img, ix, iy, w, h);
    g.restore();
    if (p.friendly) { const k = Math.floor(p.spin) % 2; rect(g, x - w / 2 - 1 - k, y - 1, 1, 1, '#bfefff'); rect(g, x + w / 2 + k, y, 1, 1, '#bfefff'); }
  }
  // A blaster bolt: a long two-tone tail, a flickering glow ring and a white-hot core. Spread bolts are gold.
  function drawShot(s) {
    if (s.soul) { drawSoulShot(s); return; }
    const k = sc(s.z), z0 = Math.max(ZN, s.z - .1), z1 = Math.max(ZN, s.z - .045), x = PX(s.u, s.z), y = YH(s.z, s.h);
    const u0 = s.u - (s.du || 0) * .045, r = Math.max(1, Math.round(2.5 * k)), gold = s.spread;
    line(g, PX(u0 - (s.du || 0) * .05, z0), YH(z0, s.h), PX(u0, z1), YH(z1, s.h), gold ? '#b0701a' : '#243a6c');
    line(g, PX(u0, z1), YH(z1, s.h), x, y, gold ? '#ff9628' : '#3aa8e0');
    if (Math.floor(R.t * 30 + s.z * 10) % 2) disc(g, x, y, r + 1, gold ? 'rgba(255,212,74,.35)' : 'rgba(127,212,255,.35)');
    disc(g, x, y, r, gold ? '#ffd44a' : '#7fd4ff'); rect(g, x, y, 1, 1, '#ffffff');
  }
  function drawRow(row, z) {
    const k = sc(z), drop = row.hit ? row.hit * 30 * k : 0;
    if (row.hit) { g.save(); g.globalAlpha = Math.max(0, 1 - row.hit * 1.7); }
    if (row.kind === 'chairs') {
      // three office chairs side by side, rolling at you: casters spinning, a little swivel wobble; hit one and they tip
      const img = A.CHAIRS[Math.floor(R.t * 14) % 2], w = Math.max(3, Math.round(img.width * k)), h = Math.max(3, Math.round(img.height * k));
      [-.46, 0, .46].forEach((u, i) => {
        const wob = Math.round(Math.sin(R.t * 9 + i * 2.1) * k * 1.5), x = PX(u, z) + wob + (row.hit ? Math.sin(u * 9 + row.hit * 8) * 6 : 0);
        shadow(u, z, 18);
        if (row.hit) { g.save(); g.translate(Math.round(x), Math.round(FY(z))); g.rotate((i - 1 || 1) * Math.min(1.4, row.hit * 4)); g.drawImage(img, -Math.round(w / 2), -h, w, h); g.restore(); }
        else g.drawImage(img, Math.round(x - w / 2), Math.round(FY(z) - h), w, h);
      });
    } else if (row.kind === 'beam') {
      // moving day: a beam hung across the hall at head height on two ropes, striped like a hazard: duck under it
      const x0 = PX(-.62, z), x1 = PX(.62, z), yt = YH(z, .21), yb = YH(z, .13), th = Math.max(2, yb - yt);
      for (const u of [-.5, .5]) rect(g, PX(u, z), CY(z), 1, yt - CY(z), '#8a8094');
      rect(g, x0 - 1, yt - 1, x1 - x0 + 2, th + 2, '#1a1418');
      for (let x = Math.round(x0), i = 0; x < x1; x += Math.max(2, Math.round(6 * k)), i++) rect(g, x, yt, Math.min(Math.max(2, Math.round(6 * k)), x1 - x), th, i % 2 ? '#1a1418' : '#e8b030');
    } else if (row.kind === 'carpet') {
      // a carpet of staples skittering across the whole floor, edges blinking red like all the Shredder's paper
      const w = Math.max(3, Math.round(A.STAPLE.width * k * 1.3)), h = Math.max(1, Math.round(A.STAPLE.height * k * 1.3));
      const sil = tinted(A.STAPLE, Math.floor(R.t * 10) % 2 ? '#ff3020' : '#ff9628');
      for (let u = -.6; u <= .61; u += .15) {
        const x = Math.round(PX(u, z) - w / 2 + (row.hit ? Math.sin(u * 9 + row.hit * 8) * 6 : 0)), y = Math.round(FY(z) - h - 1 - (Math.floor(R.t * 12 + u * 7) % 2));
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(sil, x + dx, y + dy, w, h);
        g.drawImage(A.STAPLE, x, y, w, h);
      }
    } else {
      // a sheet of paper skidding along the floor, wall to wall, with a fold that flaps
      // a jammed sheet as wide as the hall, curling up at you: outlined, printed, its top edge flapping
      const flap = Math.floor(R.t * 10) % 2 ? .075 : .055, x0 = PX(-.66, z), x1 = PX(.66, z), yb = FY(z), yt = YH(z, flap), hgt = Math.max(2, yb - yt);
      rect(g, x0 - 1, yt - 1, x1 - x0 + 2, hgt + 2, '#1a1418');
      rect(g, x0, yt, x1 - x0, hgt, '#f2eee2');
      rect(g, x0, yb - Math.max(1, Math.round(2 * k)), x1 - x0, Math.max(1, Math.round(2 * k)), '#b8b4a8');
      for (let i = 1; i <= 3; i++) { const ly = Math.round(yt + hgt * i / 4); for (let u = -.58; u < .58; u += .16) rect(g, PX(u, z), ly, Math.max(2, Math.round(9 * k)), 1, i === 1 ? '#d63428' : '#7c8494'); }
      // the corner folds back on alternate frames
      if (Math.floor(R.t * 10) % 2) { rect(g, x1 - Math.round(8 * k), yt, Math.round(8 * k), Math.max(1, Math.round(3 * k)), '#b8b4a8'); }
    }
    if (row.hit) g.restore();
  }
  // A sprite's silhouette in one colour, for outlines; made once per sprite and colour.
  const TINTS = new Map();
  function tinted(img, col) {
    if (!TINTS.has(img)) TINTS.set(img, new Map());
    const byCol = TINTS.get(img);
    if (!byCol.has(col)) {
      const cv = A.canvas(img.width, img.height), b = cv.getContext('2d');
      b.drawImage(img, 0, 0); b.globalCompositeOperation = 'source-in'; b.fillStyle = col; b.fillRect(0, 0, img.width, img.height);
      byCol.set(col, cv);
    }
    return byCol.get(col);
  }
  // The blaster lying on the rug: crackling blue static while it's out of reach, a flashing gold outline once the rug has
  // brought it back to you.
  function drawDropped(pk, z) {
    if (pk.t < TUNE.surgeFly) return;
    const k = Math.max(.5, sc(z) * 1.3), w = Math.round(A.BLASTER.width * k), h = Math.round(A.BLASTER.height * k), x = Math.round(PX(pk.u, z) - w / 2), y = Math.round(FY(z) - h - 1);
    const near = z < .3, flash = Math.floor(pk.t * 8) % 2, sil = tinted(A.BLASTER, near ? (flash ? '#ffffff' : '#ffd44a') : (flash ? '#bfefff' : '#3aa8e0'));
    shadow(pk.u, z, 10);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(sil, x + dx, y + dy, w, h);
    g.drawImage(A.BLASTER, x, y, w, h);
    if (!near && Math.random() < .6) line(g, x + fxr(0, w), y - 1, x + fxr(0, w), y - fxr(2, 5), '#bfefff');
    if (near && flash) otxt(g, 'GRAB IT', x + w / 2, y - 9, '#ffd44a', 1, 'center');
  }
  // Pickups are made to be seen: a beam of light from the ceiling, a glow on the floor, a halo, an outline that
  // flashes white and back, and sparkles going round.
  function drawPickup(pk, z) {
    if (pk.kind === 'blaster') { drawDropped(pk, z); return; }
    const coffee = pk.kind === 'coffee', img = coffee ? A.COFFEE : A.SPREAD, k = sc(z), bob = Math.sin(pk.t * 4) * .015;
    const w = Math.max(4, Math.round(img.width * k * 1.8)), h = Math.max(4, Math.round(img.height * k * 1.8)), x = PX(pk.u, z), y = YH(z, pk.h + bob);
    const col = coffee ? '#ff7050' : '#ffd44a', flash = Math.floor(pk.t * 8) % 2, bw = Math.max(2, Math.round(w * .9));
    g.save();
    g.globalAlpha = .14 + .06 * flash; rect(g, x - bw / 2, CY(z), bw, y - CY(z), col);
    g.globalAlpha = .3; rect(g, x - bw, FY(z) - 1, bw * 2, Math.max(1, Math.round(3 * k)), col);
    g.restore();
    disc(g, x, y, Math.round(Math.max(w, h) * .7), coffee ? 'rgba(255,112,80,.3)' : 'rgba(255,212,74,.3)');
    const sil = tinted(img, flash ? '#ffffff' : col), ix = Math.round(x - w / 2), iy = Math.round(y - h / 2);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(sil, ix + dx, iy + dy, w, h);
    g.drawImage(img, ix, iy, w, h);
    for (let i = 0; i < 3; i++) {
      const a = pk.t * 3 + i * 2.09, r = Math.max(w, h) * .8;
      rect(g, x + Math.cos(a) * r, y + Math.sin(a) * r * .6, 1, 1, i === Math.floor(pk.t * 6) % 3 ? '#ffffff' : col);
    }
  }
  // Standing about: he breathes; after 2 seconds he glances aside now and then; after 5 he does something, in turn:
  // spins the blaster, checks the katana, scuffs a hoof. Any move, shot or slash resets it.
  function idlePose(t) {
    const P = A.POSES, breathe = Math.floor(t / .7) % 2 ? P.breathe : P.stand;
    if (t < 2) return breathe;
    if (t < 5) { const k = Math.floor((t - 2) / .8) % 4; return k === 1 ? P.lookL : k === 3 ? P.lookR : breathe; }
    const n = Math.floor((t - 5) / 2.6), u = (t - 5) % 2.6;
    if (u > 1.7) return breathe;
    const bit = n % 3;
    if (bit === 0) return P.twirl[Math.floor(u * 10) % 4];
    if (bit === 1) return Math.floor(u / .4) % 2 ? P.gripUp : P.grip;
    return Math.floor(u / .25) % 2 ? P.scuff : P.stand;
  }
  function drawBull() {
    const b = bull;
    if (b.mouth > 0) return;
    const s = sc(b.bz), x = PX(b.u, b.bz), feet = YH(b.bz, b.jh);
    if (R.phase !== 'dead' || R.phaseT < .3) shadow(b.u, b.bz, 14 * (1 - .5 * Math.min(1, b.jh / TUNE.jumpH)));   // the shadow shrinks as he rises
    if (R.phase === 'dead') { drawRugPulled(s, x, YH(b.bz, 0)); return; }
    if (b.inv > 0 && R.phase !== 'win' && Math.floor(b.inv * 12) % 2) return;
    // He swings his arms as he runs, throws them up to jump, raises the blaster to shoot (with a kick) and swings the katana.
    const P = A.POSES, air = b.jh > 0 || b.spat > 0, aim = b.aimT > 0, kick = b.aimT > .16;
    const running = R.phase !== 'dead' && (R.speed > .02 || moveDir() || (R.pull.st === 'on' && onRunner())), stride = Math.floor(b.step) % 2;
    let p = P.stand;
    const cheer = R.phase === 'win' && !(R.slow > 0) && R.phaseT > .5 && !air;
    if (b.crouch && R.phase !== 'dead') p = b.slash >= 0 ? (b.slash < .07 ? P.crouchWind : P.crouchCut) : P.crouch;
    else if (b.slash >= 0) p = b.slash < .07 ? (air ? P.jumpWind : P.wind) : (air ? P.jumpCut : P.cut);
    else if (b.inv > TUNE.hurtInv - .3 && R.phase !== 'win') p = P.hurt;
    else if (air) p = aim ? P.jumpAim : P.jump;
    else if (aim) p = kick ? P.kick : running ? (stride ? P.runAimA : P.runAimB) : P.aim;
    else if (running) p = stride ? P.runA : P.runB;
    if (cheer) p = Math.floor(R.t * 4) % 2 ? P.win : P.winB;   // horns up at the clear
    else if (p === P.stand && !b.crouch) p = idlePose(b.idle || 0);
    const sx = 1 + (b.sq || 0), sy = 1 - (b.sq || 0);
    // hit: knocked back a step toward you, rocking side to side, then he catches himself
    const st = b.stag > 0 && R.phase !== 'win' ? b.stag / .3 : 0, kx = Math.round(Math.sin(st * 14) * 3 * st * s), ky = Math.round(st * 4 * s);
    g.drawImage(p, Math.round(x - A.POSE_W / 2 * s * sx) + kx, Math.round(feet - 38 * s * sy) + ky, Math.round(A.POSE_W * s * sx), Math.round(A.POSE_H * s * sy));
  }
  // Rugged: the rug is yanked out from under him. He flips up, spins in quarter turns and falls off the screen.
  function drawRugPulled(s, x, feet) {
    const t = Math.max(0, R.phaseT - .08), dy = -(190 * t - 260 * t * t) * s, rot = Math.floor(t / .09) % 4;
    g.save(); g.translate(Math.round(x + t * 14 * s), Math.round(feet - 19 * s + dy));
    if (rot) g.rotate(rot * Math.PI / 2);
    g.drawImage(A.POSES.hurt, Math.round(-A.POSE_W / 2 * s), Math.round(-19 * s), Math.round(A.POSE_W * s), Math.round(A.POSE_H * s));
    g.restore();
  }
  function drawPaper() {
    for (let i = 0; i < 8; i++) {
      const k = mod1(R.t * .3 + i / 8), z = 1 - k, u = Math.sin(i * 2.3 + R.t * .7) * .7, s2 = Math.max(1, Math.round(3 * sc(z)));
      rect(g, PX(u, z), YH(z, .25 + .35 * Math.abs(Math.sin(i + R.t * 1.5))), s2, Math.max(1, s2 - (Math.floor(R.t * 6 + i) % 2)), '#e8e4d8');
    }
  }
  function drawFx() {
    for (const f of R.fx) {
      const k = f.t / f.dur;
      if (f.k === 'wisp') drawWisp(f);
      else if (f.k === 'poof') { for (let i = 0; i < f.n; i++) { const a = i / f.n * 6.28 + f.x, r = 2 + k * 9 * f.s; rect(g, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * .7, Math.max(1, Math.round(2 * f.s)), Math.max(1, Math.round(2 * f.s)), k < .5 ? '#fff6e2' : '#b8b4a8'); } }
      else if (f.k === 'half') {
        const img = f.img, w = img.width * f.s, h = img.height * f.s, d = 4 + k * 14 * f.s, drop = k * k * 26;
        g.save(); g.globalAlpha = 1 - k * .6;
        g.drawImage(img, 0, 0, img.width / 2, img.height, Math.round(f.x - w / 2 - d), Math.round(f.y - h / 2 + drop), Math.round(w / 2), Math.round(h));
        g.drawImage(img, img.width / 2, 0, img.width / 2, img.height, Math.round(f.x + d), Math.round(f.y - h / 2 + drop * .8), Math.round(w / 2), Math.round(h));
        g.restore();
      } else if (f.k === 'pop') otxt(g, f.text, f.x, Math.round(f.y), f.col, 1, 'center');
      else if (f.k === 'bit') rect(g, f.x, f.y, 2, 1, (Math.floor(f.t * 10) + f.vx) % 2 > 0 ? '#fff6e2' : '#b8b4a8');
      else if (f.k === 'cut') { const a = 1 - f.t / f.dur; g.save(); g.globalAlpha = a; line(g, Math.round(f.x0), Math.round(f.y0), Math.round(f.x1), Math.round(f.y1), '#ffffff'); line(g, Math.round(f.x0) + 1, Math.round(f.y0), Math.round(f.x1) + 1, Math.round(f.y1), '#7fd4ff'); g.restore(); }
      else if (f.k === 'bolt') {
        // jagged, redrawn every frame, white core in blue
        let px = f.x0, py = f.y0; const n = 7;
        for (let i = 1; i <= n; i++) {
          const q = i / n, x = f.x0 + (f.x1 - f.x0) * q + (i < n ? fxr(-6, 6) : 0), y = f.y0 + (f.y1 - f.y0) * q + (i < n ? fxr(-3, 3) : 0);
          for (const d of [-1, 1]) line(g, Math.round(px + d), Math.round(py), Math.round(x + d), Math.round(y), '#3aa8e0');
          line(g, Math.round(px), Math.round(py), Math.round(x), Math.round(y), '#ffffff'); px = x; py = y;
        }
      }
      else if (f.k === 'strip') rect(g, Math.round(f.x), Math.round(f.y), 1, 2, Math.floor(f.t * 12 + f.vx) % 2 ? '#f2eee2' : '#b8b4a8');
      else if (f.k === 'rise' && f.t > 0 && f.y > -12) { g.save(); g.globalAlpha = Math.min(1, (f.dur - f.t) / 1.5); g.drawImage(A.GHOST, Math.round(f.x - 4), Math.round(f.y - 4)); g.restore(); }
      else if (f.k === 'smoke') disc(g, f.x, f.y, 1 + Math.round(k * 4), k < .5 ? '#6a6878' : '#4a4858');
      else if (f.k === 'big') drawBig(f);
      else if (f.k === 'toss') {
        // the blaster spinning up the rug after the surge
        const pk = f.pk, z = pk.w - R.dist, tx = PX(pk.u, z), ty = FY(z) - 4, q = k, s2 = Math.max(.5, sc(z) * 1.3);
        const bx = f.x + (tx - f.x) * q, by = f.y + (ty - f.y) * q - Math.sin(q * Math.PI) * 30, w = Math.round(A.BLASTER.width * s2), h = Math.round(A.BLASTER.height * s2);
        g.save(); g.translate(Math.round(bx), Math.round(by)); g.rotate(Math.floor(f.t * 16) % 4 * Math.PI / 2); g.drawImage(A.BLASTER, -Math.round(w / 2), -Math.round(h / 2), w, h); g.restore();
      }
      else if (f.k === 'muzzle') { const m = k < .5 ? 9 : 7; g.drawImage(A.FLASH, Math.round(f.x - m / 2), Math.round(f.y - m / 2), m, m); }
      else if (f.k === 'dust') for (const d of [-1, 1]) rect(g, f.x + d * (4 + k * 8) * f.s, f.y - 1 - k * 2, 2, 1, '#8a8094');
      else if (f.k === 'spark') for (let i = 0; i < 5; i++) { const a = f.a + i * 1.26, r = (2 + k * 10) * f.s; rect(g, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * .8, 1, 1, k < .6 ? f.col : '#ff9628'); }
    }
  }
  function drawHUD() {
    for (let i = 0; i < TUNE.hearts; i++) g.drawImage(i < R.hearts ? A.HEART : A.HEART_EMPTY, 4 + i * 10, 4);
    // blaster charge under the hearts: blue when ready, red and blinking when empty, gold with Spread Shot
    const ch = R.charge / TUNE.charges, dry = R.charge < 1, blink = Math.floor(R.t * 10) % 2;
    rect(g, 3, 13, 51, 5, '#1a1418'); rect(g, 4, 14, 49, 3, '#243a6c');
    rect(g, 4, 14, Math.round(49 * ch), 3, R.chargeFlash > 0 ? '#ffffff' : R.spread > 0 ? '#ffd44a' : ch < .25 ? '#ff7050' : '#7fd4ff');
    if (dry && (R.empty > 0 || blink)) rect(g, 4, 14, 49, 3, '#d63428');
    if (R.spread > 0 && (R.spread > 2 || blink)) otxt(g, 'SPREAD', 4, 20, '#ffd44a');
    if (R.armed === false && R.phase !== 'win') { rect(g, 3, 13, 51, 5, '#1a1418'); if (blink || R.empty > 0) txt(g, 'NO BLASTER', 5, 13, '#ff5040'); }
    if (R.phase === 'hall') {
      // the goal: free enough souls and the Shredder wakes
      const shown = Math.min(R.souls, R.shown), k = Math.min(1, shown / TUNE.goal), full = k >= 1 && Math.floor(R.t * 6) % 2, pulse = R.meterPulse > 0;
      g.drawImage(A.GHOST, 74, pulse ? 2 : 3);
      rect(g, 86, 4, 64, 7, pulse ? '#fff6e2' : '#1a1418'); rect(g, 87, 5, 62, 5, '#3a2f5e'); rect(g, 87, 5, Math.round(62 * k), 5, full || pulse ? '#ffd44a' : '#7fd4ff');
      otxt(g, shown + '/' + TUNE.goal, 154, 5, pulse ? '#ffd44a' : '#fff6e2');
      // while lights out doubles souls
      if (R.event && R.event.kind === 'dark' && Math.floor(R.t * 4) % 4) otxt(g, '×2', 178, 5, '#ffd44a');
    } else {
      const n = String(Math.min(R.souls, R.shown)), tw = textWidth(n), pulse = R.meterPulse > 0;
      g.drawImage(A.GHOST, W - 4 - tw - 12, pulse ? 2 : 3);
      otxt(g, n, W - 4, 5, pulse ? '#ffd44a' : '#fff6e2', 1, 'right');
    }
    const b = R.boss;
    if (b.st === 'fight' || b.st === 'awake' || (b.st === 'dead' && R.phaseT < 1.2)) {
      const fill = b.st === 'awake' ? b.bar : b.hp / TUNE.bossHP;   // it ticks up to full while the Shredder wakes
      otxt(g, 'SHRED-O', 86, 5, '#ffd44a', 1, 'right');
      rect(g, 89, 4, 74, 7, '#1a1418'); rect(g, 90, 5, 72, 5, '#3a2f5e');
      rect(g, 90, 5, Math.round(72 * fill), 5, b.jam > 0 ? '#ffd44a' : b.flash > 0 ? '#ffffff' : '#e2483a');
      rect(g, 90 + Math.round(72 * .66), 5, 1, 5, '#1a1418'); rect(g, 90 + Math.round(72 * .33), 5, 1, 5, '#1a1418');
    }
    // the rally counter: it grows as the rally goes on, and flashes with each return
    const rl = R.phase === 'boss' && R.boss.rally;
    if (rl && rl.count > 0) {
      const big = rl.count >= 4 ? 2 : 1, pop = R.rallyPop > 0;
      otxt(g, (rl.marathon ? 'MARATHON x' : 'RALLY x') + rl.count, 120, big === 2 ? 15 : 17, pop ? (Math.floor(R.t * 20) % 2 ? '#ffffff' : '#ffd44a') : rl.count >= 7 ? '#ff9628' : '#ffd44a', big, 'center');
    }
  }
  function drawWords() {
    // Big moments sit across the Shredder's mouth; prompts during play sit up top, clear of the action.
    const B = R.banner;
    if (B && B.pull) {
      // a prompt during play: one short line in a small strip at the top, never across the hall
      const big = B.text.length <= 6, tw = textWidth(B.text) * (big ? 2 : 1), y = 17;
      g.save(); g.globalAlpha = .8; rect(g, 120 - tw / 2 - 5, y - 3, tw + 10, big ? 16 : 11, '#0a0810'); g.restore();
      otxt(g, B.text, 120, y, B.col || '#ffd44a', big ? 2 : 1, 'center');
    } else if (B) {
      const y = B.y || 58;
      g.save(); g.globalAlpha = .8; rect(g, 0, y - 4, W, B.sub ? 26 : 18, '#0a0810'); g.restore();
      otxt(g, B.text, 120, y, B.col || '#ffd44a', 2, 'center');
      if (B.sub) otxt(g, B.sub, 120, y + 14, '#fff6e2', 1, 'center');
    }
    const T = R.talk;
    if (T) {
      let n = 0; while (n < T.text.length && T.times[n] <= T.t) n++;
      const w = textWidth(T.text) + 6, x = Math.round(120 - w / 2), y = BACK.y0 - 18;
      A.bubble(g, x, y, T.text, 118);
      rect(g, x, y, w, 11, '#fff6e2');
      txt(g, T.text.slice(0, n), x + 3, y + 3, '#1a1418');
    }
    // Unruggabull's own lines: a small caption top left, under the hearts, clear of the action
    const K = R.bark;
    if (K) {
      let n = 0; while (n < K.text.length && K.times[n] <= K.t) n++;
      // wrapped at about 15 letters so it stays at the left, clear of the signs hanging over the middle of the hall
      const lines = [], words = K.text.split(' ');
      for (const wd of words) { const l = lines.length - 1; if (l >= 0 && (lines[l] + ' ' + wd).length <= 15) lines[l] += ' ' + wd; else lines.push(wd); }
      const w = Math.max(...lines.map(l => textWidth(l))) + 8, y = R.spread > 0 ? 27 : 21, h = lines.length * 7 + 2;
      g.save(); g.globalAlpha = .75; rect(g, 2, y, w, h, '#0a0810'); g.restore();
      rect(g, 2, y, 1, h, '#ffd44a');
      let left = n;
      lines.forEach((l, i) => { txt(g, l.slice(0, Math.max(0, left)), 6, y + 2 + i * 7, '#fff6e2'); left -= l.length + 1; });
    }
  }
  // ---------- title: RugCo Tower at sunset ----------
  // Souls drift up the threads to p(Loom)'s beacon on the roof while carpshits circle. Static layers are cached once.
  const GROUND = 122, BEACON = { x: 120, y: 40 };
  let TOWER = null;
  function skyline(b, list, col, win, k) {
    for (const [x, y, w] of list) {
      rect(b, x, y, w, GROUND - y, col);
      for (let wy = y + 4; wy < GROUND - 3; wy += 5) for (let wx = x + 3; wx < x + w - 2; wx += 4) if (((wx * k + wy * 7) % 17) < 2) rect(b, wx, wy, 1, 2, win);
    }
  }
  function buildTower() {
    const sky = A.canvas(W, H), front = A.canvas(W, H), s = sky.getContext('2d'), f = front.getContext('2d');
    ['#0b0920', '#100c28', '#171033', '#21123d', '#2f1545', '#41184a', '#561a4a', '#6c1d47', '#6c1d47'].forEach((col, i) => rect(s, 0, i * 15, W, 16, col));
    for (let i = 0; i < 60; i++) A.px(s, (i * 97 + 13) % W, 30 + (i * 53) % 50, i % 7 ? '#6f6596' : '#ffffff');
    // the threads run from the beacon down into the city, behind the buildings
    for (const [x, y] of [[18, 87], [52, 78], [81, 90], [160, 89], [189, 76], [225, 86]]) line(f, BEACON.x, BEACON.y, x, y, '#6a4f86');
    skyline(f, [[0, 87, 20], [18, 93, 17], [33, 80, 20], [52, 90, 15], [69, 96, 22], [150, 94, 20], [168, 83, 18], [186, 91, 15], [201, 78, 21], [220, 88, 20]], '#1a1230', '#ffbf5a', 13);
    rect(f, 105, 50, 30, GROUND - 50, '#120d22'); rect(f, 105, 50, 1, GROUND - 50, '#2c2246'); rect(f, 134, 50, 1, GROUND - 50, '#2c2246');
    rect(f, 109, 44, 22, 6, '#120d22'); rect(f, 116, 35, 8, 9, '#120d22'); rect(f, 119, 28, 2, 7, '#2c2246');
    for (let wy = 66; wy < GROUND - 3; wy += 5) for (let wx = 108; wx < 133; wx += 5) rect(f, wx, wy, 2, 2, ((wx * 7 + wy * 3) % 13) === 0 ? '#ff9a3c' : '#221a38');
    rect(f, 107, 54, 26, 9, '#1a1418'); txt(f, 'RUGCO', 120, 56, '#ff9a3c', 1, 'center');
    skyline(f, [[0, 100, 26], [22, 106, 18], [40, 97, 23], [64, 108, 20], [147, 104, 21], [166, 97, 23], [189, 106, 18], [207, 100, 33]], '#0d0a1a', '#ffd060', 11);
    rect(f, 0, GROUND, W, H - GROUND, '#0a0816');
    for (let i = 0; i < 9; i++) rect(f, 88 + ((i * 23) % 64), GROUND + 3 + (i % 4) * 3, 5 + (i % 3) * 3, 1, i % 2 ? '#ff9a3c' : '#e8483a');
    rect(f, 112, GROUND, 17, 1, '#000');
    f.drawImage(A.POSES.stand, 120 - A.POSE_W / 2, GROUND - 38);
    TOWER = { sky, front };
  }
  function drawTower(t) {
    if (!TOWER) buildTower();
    g.drawImage(TOWER.sky, 0, 0);
    // the sun sinks behind the tower in scrolling stripes
    const sx = 120, sy = 96, Rs = 38;
    for (let dy = -Rs; dy <= Rs; dy++) {
      const y = sy + dy; if (y >= GROUND) break;
      const w = Math.floor(Math.sqrt(Rs * Rs - dy * dy)), k = (dy + Rs) / (2 * Rs);
      if (dy > 2) { const gap = 1 + Math.floor(dy / 10), ph = (((dy + Math.floor(t * 5)) % 8) + 8) % 8; if (ph < gap) continue; }
      rect(g, sx - w, y, 2 * w + 1, 1, k < .28 ? '#ffd44a' : k < .5 ? '#ffad3c' : k < .72 ? '#ff7a3a' : '#e8483a');
    }
    g.drawImage(TOWER.front, 0, 0);
    disc(g, BEACON.x, BEACON.y, 3, Math.sin(t * 3) > .4 ? '#ffd060' : '#ff9628'); A.px(g, BEACON.x, BEACON.y, '#140c08');
    g.save(); g.globalAlpha = .75;
    [[30, 92], [69, 98], [172, 95], [212, 88], [96, 104]].forEach(([x, y], i) => {
      const k = mod1(t * .12 + i / 5);
      g.drawImage(A.GHOST, Math.round(x + (BEACON.x - 4 - x) * k + Math.sin(t * 2 + i) * 3), Math.round(y + (BEACON.y - 6 - y) * k));
    });
    g.restore();
    [[66, 60], [160, 50], [84, 46], [150, 74], [40, 72]].forEach(([x, y], i) => wavy(A.CARPF[(Math.floor(t * 8) + i) % 2], x, Math.round(y + Math.sin(t * 2.5 + i) * 2), 13, 6, t * 12 + i, 1));
  }
  function drawTitle() {
    drawTower(R.t);
    if (state === 'intro') return;
    // the logo: orange with a gold II, a red lip under each stroke and a dark outline
    const s = 'UNRUGGABULL II', x = Math.round(120 - textWidth(s, 3) / 2), y = 4;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [-1, 1], [1, 1], [0, 2], [1, 2], [-1, 2]]) txt(g, s, x + dx, y + dy, '#1a1418', 3);
    txt(g, s, x, y + 1, '#961e16', 3);
    txt(g, 'UNRUGGABULL', x, y, '#ff9a3c', 3); txt(g, 'II', x + 12 * 12, y, '#ffd44a', 3);
    otxt(g, 'SALVATION FOR THE UNRUGGED', 120, 23, '#fff6e2', 1, 'center');
  }
  // How dark it is during lights out or power saving mode: it flickers off, stays dark, then flickers back.
  function darkness() {
    const E = blackout();
    if (!E) return 0;
    if (E.flash > 0) return E.flash < .25 ? .4 : 0;   // a light switch: the lights are on for a moment
    if (E.t < .5) return Math.floor(E.t * 14) % 2 ? .82 : .25;
    if (E.t > E.dur - .6) return Math.floor(E.t * 14) % 2 ? .82 : .3;
    return .82;
  }
  // The dark is a layer with light let through it: blaster bolts light up the hall around them as they fly,
  // the muzzle flashes, and knocked-back or rally paper glows. Each light is three soft rings, 8-bit style.
  let DARK = null;
  function darkLayer(dk) {
    if (!DARK) DARK = A.canvas(W + 8, H + 8);
    const d = DARK.getContext('2d');
    d.globalCompositeOperation = 'source-over'; d.globalAlpha = 1;
    d.clearRect(0, 0, DARK.width, DARK.height);
    d.globalAlpha = dk; d.fillStyle = '#05040a'; d.fillRect(0, 0, DARK.width, DARK.height);
    d.globalCompositeOperation = 'destination-out';
    const light = (x, y, r) => { for (const [f, a] of [[1, .35], [.68, .55], [.4, .9]]) { d.globalAlpha = a; disc(d, x + 4, y + 4, Math.max(1, Math.round(r * f)), '#000'); } };
    for (const s of R.shots) light(PX(s.u, s.z), YH(s.z, s.h), 22 * sc(s.z) + 6);
    for (const f of R.fx) if (f.k === 'muzzle') light(f.x, f.y, 22);
    for (const p of R.projs) if (p.friendly || p.rally) light(PX(p.u, p.z), YH(p.z, p.h), 10 * sc(p.z) + 3);
    d.globalCompositeOperation = 'source-over'; d.globalAlpha = 1;
    return DARK;
  }
  // In the dark only glowing things show: monitors, eyes, the neon sign, pickups, paper, bolts, the runner's
  // edges when it warns or pulls, the Shredder's eyes and teeth, and you, rows and boxes faintly.
  function drawSwitch(sw) {
    const at = switchAt(sw); if (at.z > 1.02 || at.z < .05) return;
    const k = sc(at.z), x = PX(sw.s * .99, at.z), y = YH(at.z, at.h), w = Math.max(3, Math.round(9 * k)), h = Math.max(4, Math.round(13 * k)), blink = Math.floor(R.t * 6) % 2;
    rect(g, x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, blink ? '#fff0aa' : '#ffd44a');
    rect(g, x - w / 2, y - h / 2, w, h, '#1a1418'); rect(g, x - Math.max(1, w / 4), y - h / 4, Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 3)), '#ffd44a');
  }
  function drawGlows() {
    for (const sw of R.switches || []) drawSwitch(sw);
    for (const cb of R.cubs) {
      const z = cubZ(cb); if (z > 1.02 || cb.kind !== 'cub') continue;
      const k = sc(z), mx = PX(cb.s * .93, z), my = YH(z, cb.top), mw = Math.max(2, Math.round(10 * k)), mh = Math.max(2, Math.round(7 * k));
      rect(g, mx - mw / 2 + 1, my - mh + 1, Math.max(1, mw - 2), Math.max(1, mh - 2), monitor(cb));
      const tp = cb.temp;
      if (tp && !tp.dead && tp.pop > .3) {
        const zt = z + .06, s2 = sc(zt) * .85, w = 26 * s2, h = 15 * s2, x = PX(cb.s * .8, zt), yt = YH(zt, cb.top - .12 + tp.pop * .17) - h, e = Math.max(1, Math.round(2 * s2));
        rect(g, x - w * .23, yt + h * .37, e, e, '#fff0aa'); rect(g, x + w * .19, yt + h * .37, e, e, '#fff0aa');
      }
    }
    for (const f of R.flies) {
      const k = sc(f.z), w = 26 * k, x = PX(f.u, f.z), y = YH(f.z, f.h), e = Math.max(1, Math.round(2 * k));
      rect(g, x - w * .23, y - 1, e, e, '#fff0aa'); rect(g, x + w * .19, y - 1, e, e, '#fff0aa');
    }
    if (Math.floor(R.t * 13) % 11) for (const sg of R.signs) { const z = sg.w - R.dist; if (sg.neon && z < 1.02 && z > .05) drawSign(sg, z); }
    if (R.pull.st === 'warn' || R.pull.st === 'on') {
      const edge = R.pull.st === 'warn' ? (Math.floor(R.pull.t * 10) % 2 ? '#fff6e2' : '#ffd44a') : '#ff9628';
      quadF(g, edge, -TUNE.runner, -TUNE.runner + .04, ZN, 1); quadF(g, edge, TUNE.runner - .04, TUNE.runner, ZN, 1);
    }
    sprayLanes();
    if (R.phase !== 'hall') withShredder(() => { shredderEyes(); shredderTeeth(); });
    else if (R.event && R.event.kind === 'dark') darkEyes();
    g.save(); g.globalAlpha = .45; drawBull();
    for (const row of R.rows) { const z = row.w - R.dist; if (z < 1.02) drawRow(row, z); }
    for (const bx of R.boxes) { const z = bx.w - R.dist; if (z < 1.02) drawBox(bx, z); }
    g.restore();
    for (const pk of R.pickups) { const z = pk.w - R.dist; if (z < 1.02) drawPickup(pk, z); }
    for (const p of R.projs) drawProj(p);
    for (const sh of R.shots) drawShot(sh);
    for (const f of R.fx) if (f.k === 'wisp') drawWisp(f); else if (f.k === 'big') drawBig(f);
  }
  function draw() {
    if (state === 'title' || state === 'intro') { g.setTransform(1, 0, 0, 1, 0, 0); drawTitle(); return; }
    const sh = R.shake > 0 ? Math.round((Math.random() - .5) * 6 * Math.min(1, R.shake * 4)) : 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    rect(g, 0, 0, W, H, '#09070b');
    g.setTransform(1, 0, 0, 1, sh, sh ? Math.round((Math.random() - .5) * 4) : 0);
    drawHall();
    if (shredderZ() > 1.001) drawFarHall();
    if (shredderZ() < Infinity) withShredder(drawShredder);
    drawPaper();
    // Fixed things beside and above the aisle go down first, far to near, so nothing moving is ever cut by them.
    const back = [];
    for (const d of R.decor) { const z = d.w - R.dist; if (z < 1.02) back.push([z, () => drawDecor(d, z)]); }
    for (const cb of R.cubs) { const z = cubZ(cb); if (z < 1.02) back.push([z, () => drawCub(cb, z)]); }
    for (const sg of R.signs) { const z = sg.w - R.dist; if (z < 1.02 && z > .05) back.push([z, () => drawSign(sg, z)]); }
    back.sort((a, b) => b[0] - a[0]);
    for (const e of back) e[1]();
    const list = [];
    for (const bx of R.boxes) { const z = bx.w - R.dist; if (z < 1.02) list.push([z, () => drawBox(bx, z)]); }
    for (const row of R.rows) { const z = row.w - R.dist; if (z < 1.02) list.push([z, () => drawRow(row, z)]); }
    for (const pk of R.pickups) { const z = pk.w - R.dist; if (z < 1.02) list.push([z, () => drawPickup(pk, z)]); }
    for (const f of R.flies) list.push([f.z, () => drawFly(f)]);
    for (const p of R.projs) list.push([p.z, () => drawProj(p)]);
    for (const s of R.shots) list.push([s.z, () => drawShot(s)]);
    list.push([bull.bz - .001, drawBull]);
    list.sort((a, b) => b[0] - a[0]);
    for (const e of list) e[1]();
    drawFx();
    const dk = darkness();
    if (dk) { g.drawImage(darkLayer(dk), -4, -4); if (dk > .5) drawGlows(); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (R.red > 0) { g.save(); g.globalAlpha = R.red * 1.6; rect(g, 0, 0, W, H, '#d63428'); g.restore(); }
    // one heart left: the edges of the screen pulse red with the heartbeat
    if (lowHealth()) {
      const a = .16 + .5 * R.pulse / .35;
      g.save(); for (let i = 0; i < 4; i++) { g.globalAlpha = a * (1 - i / 4); const d = i * 3; rect(g, d, d, W - 2 * d, 3, '#d63428'); rect(g, d, H - d - 3, W - 2 * d, 3, '#d63428'); rect(g, d, d + 3, 3, H - 2 * d - 6, '#d63428'); rect(g, W - d - 3, d + 3, 3, H - 2 * d - 6, '#d63428'); } g.restore();
    }
    if (R.white > 0) { g.save(); g.globalAlpha = Math.min(1, R.white * 4); rect(g, 0, 0, W, H, '#ffffff'); g.restore(); }
    if (R.zap > 0) { g.save(); g.globalAlpha = Math.min(.6, R.zap * 2); rect(g, 0, 0, W, H, '#3aa8e0'); g.restore(); }
    drawHintSouls(); drawHUD(); drawWords();
  }

  // ---------- page: card, sound, full screen ----------
  const gameEl = $('game'), card = $('card'), cardTitle = $('cardTitle'), cardText = $('cardText'), cardStats = $('cardStats'), cardNote = $('cardNote');
  const goBtn = $('go'), altBtn = $('alt'), pauseBtn = $('pause'), snd = $('snd'), fsBtn = $('fs');
  const BEST_KEY = 'unruggabull-ii-best';
  let best = { souls: 0, time: 0 }, cardKind = 'title';
  try { const v = JSON.parse(localStorage.getItem(BEST_KEY) || 'null'); if (v && typeof v.souls === 'number') best = { souls: v.souls, time: +v.time || 0 }; } catch (e) {}
  const clock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  function stats(rows) {
    cardStats.textContent = '';
    for (const [k, v] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = k; dd.textContent = v; cardStats.append(dt, dd); }
    cardStats.hidden = !rows.length;
  }
  function showCard(kind, extra) {
    cardKind = kind;
    const rows = [];
    altBtn.hidden = true; cardNote.hidden = true;
    if (kind === 'title') {
      cardTitle.textContent = 'Floor 13: Accounting';
      cardText.textContent = 'Something on the roof of RugCo Tower is catching the souls of every carpshit you ever unrugged. Free ' + TUNE.goal + ' of them on floor 13 to wake the Shredder, then beat it.';
      if (best.souls) rows.push(['Best', best.souls + ' souls']);
      if (best.time) rows.push(['Fastest clear', clock(best.time)]);
      goBtn.textContent = 'Start';
      if (storySeen()) { altBtn.textContent = 'Watch the story'; altBtn.hidden = false; }
      cardNote.textContent = 'Demo: the first floor of the climb.'; cardNote.hidden = false;
      const land = document.createElement('span'); land.className = 'land-note'; land.textContent = ' Best played in landscape.'; cardNote.append(land);
    } else if (kind === 'pause') {
      cardTitle.textContent = 'Paused';
      cardText.textContent = 'The Shredder will wait. It has nowhere else to be.';
      goBtn.textContent = 'Resume'; altBtn.textContent = 'Restart floor'; altBtn.hidden = false;
    } else if (kind === 'clear') {
      cardTitle.textContent = 'Floor 13 clear';
      cardText.textContent = extra.newBest ? 'New best! The Unrugged drift up toward the roof.' : 'The Unrugged drift up toward the roof.';
      rows.push(['Souls freed', String(R.souls)], ['Time', clock(R.endT)], ['Deflects', String(R.events.deflects || 0)],
        ['Best streak', String(R.bestStreak)], ['Formation wipes', String(R.events.wipes || 0)], ['Smashes', String(R.events.smashes || 0)], ['Longest rally', String(R.events.bestRally || 0)]);
      if (R.continues) rows.push(['Continues', String(R.continues)]);
      rows.push(['Best', best.souls + ' souls']);
      goBtn.textContent = 'Play again';
      cardNote.textContent = 'The elevator to floor 42 comes in a later build.'; cardNote.hidden = false;
    } else if (kind === 'rugged') {
      cardTitle.textContent = 'Rugged.';
      if (checkpoint) {
        // beaten by the Shredder: pick up at the fight with full hearts, or start the floor over
        cardText.textContent = 'Continue from the Shredder with full hearts?';
        altBtn.textContent = 'Restart floor'; altBtn.hidden = false;
      } else cardText.textContent = 'Continue? The floor starts over.';
      rows.push(['Souls freed', String(R.souls)], ['Best', best.souls + ' souls']);
      goBtn.textContent = 'Continue';
    }
    stats(rows);
    card.hidden = false;
  }
  const LABELS = {
    title: 'Title screen: Unruggabull, katana on his back, faces RugCo Tower at sunset while souls drift up to a beacon on its roof.',
    play: 'Unruggabull, seen from behind, in an office hallway on floor 13 of RugCo Tower. Cubicles line the hall, a red runner rug leads to a shredder at the far end.'
  };
  function setState(s) {
    state = s;
    c.setAttribute('aria-label', s === 'title' || s === 'intro' ? LABELS.title : LABELS.play);
    gameEl.classList.toggle('playing', s === 'play');
    pauseBtn.hidden = !(s === 'play' || s === 'pause');
    pauseBtn.textContent = s === 'pause' ? 'Resume' : 'Pause';
  }
  function startRun() {
    checkpoint = null;
    newRun();
    setState('play');
    card.hidden = true;
    R.banner = { text: 'FLOOR 13', sub: 'ACCOUNTING', t: 0, dur: 2.2, then: { text: 'FREE ' + TUNE.goal + ' SOULS', t: 0, dur: 2.2 } };
    live('Floor 13, Accounting. Free ' + TUNE.goal + ' souls to wake the Shredder.');
    Snd.play('start'); Snd.music('tower');
    try { c.focus({ preventScroll: true }); } catch (e) {}
  }
  // Back at the Shredder: the hall's end, full hearts, the souls you had when it woke, and it wakes again.
  function continueAtBoss() {
    newRun(checkpoint);
    setState('play'); card.hidden = true;
    startWake();
    live('Back at the Shredder with full hearts.');
    try { c.focus({ preventScroll: true }); } catch (e) {}
  }
  // Phones go full screen when you start; it has to happen inside the tap.
  function goFull() { if (document.body.classList.contains('touch') && !isFull()) toggleFull(); }

  // ---------- the story so far ----------
  // Told in blips over the tower on the first Start; a tap shows the whole line, another moves on, Skip ends it.
  const STORY = [
    'When we last saw our hero, he had just unrugged the Rugfather behind a garage door that took thirteen seconds to open.',
    'But the Rugfather was only middle management.',
    'Every carpshit our hero unrugged left a soul behind: the Unrugged. Small, fringed and very polite, they drifted up to the roof of RugCo Tower and did not come back down.',
    'Something up there has been catching them and weaving them back into carpshits. RugCo calls it p(Loom). It puts your odds of stopping it at one percent.',
    'Our hero would like to discuss those odds. He will need a sword.'
  ];
  const STORY_KEY = 'unruggabull-ii-story';
  const crawl = $('crawl'), crawlText = $('crawlText'), skipBtn = $('skip');
  let intro = null;
  function storySeen() { try { return localStorage.getItem(STORY_KEY) === '1'; } catch (e) { return false; } }
  function startIntro() {
    setState('intro'); card.hidden = true; crawl.hidden = false;
    introLine(0);
    try { skipBtn.focus({ preventScroll: true }); } catch (e) {}
  }
  function introLine(i) {
    const text = STORY[i], plan = Snd.talkTimes(text, 'narrator');
    Snd.hush(); Snd.say(text, 'narrator');
    intro = { i, t: 0, text, times: plan.times, total: plan.total };
    crawlText.textContent = ''; live(text);
  }
  function updateIntro(dt) {
    if (!intro) return;
    intro.t += dt;
    let n = 0; while (n < intro.text.length && intro.times[n] <= intro.t) n++;
    if (crawlText.textContent.length !== n) crawlText.textContent = intro.text.slice(0, n);
    if (intro.t > intro.total + 1.8) nextLine();
  }
  function nextLine() { if (intro.i + 1 < STORY.length) introLine(intro.i + 1); else endIntro(); }
  function advanceIntro() {
    if (!intro) return;
    if (intro.t < intro.total) { intro.t = intro.total; Snd.hush(); } else nextLine();
  }
  function endIntro() {
    Snd.hush(); intro = null; crawl.hidden = true;
    try { localStorage.setItem(STORY_KEY, '1'); } catch (e) {}
    startRun();
  }
  skipBtn.addEventListener('click', e => { e.stopPropagation(); if (state === 'intro') endIntro(); });
  $('stage').addEventListener('click', e => { if (state === 'intro' && !skipBtn.contains(e.target)) advanceIntro(); });
  function pauseGame() {
    if (state !== 'play') return;
    setState('pause'); clearHeld();
    showCard('pause');
    Snd.pause();
    goBtn.focus({ preventScroll: true });
  }
  function resumeGame() {
    if (state !== 'pause') return;
    setState('play'); card.hidden = true;
    Snd.resume();
    try { c.focus({ preventScroll: true }); } catch (e) {}
  }
  function endRun(kind) {
    if (kind === 'clear') emit('game_over', { cause: 'cleared', score: R.souls });
    setState('over');
    const newBest = R.souls > best.souls;
    best.souls = Math.max(best.souls, R.souls);
    if (kind === 'clear' && !R.continues) best.time = best.time ? Math.min(best.time, R.endT) : R.endT;   // fastest clear counts only without continues
    try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (e) {}
    showCard(kind, { newBest });
    goBtn.focus({ preventScroll: true });
  }
  goBtn.addEventListener('click', () => {
    if (cardKind === 'pause') { resumeGame(); return; }
    goFull();
    if (cardKind === 'rugged' && checkpoint) { continueAtBoss(); return; }
    if (cardKind === 'title' && !storySeen()) startIntro(); else startRun();
  });
  altBtn.addEventListener('click', () => {
    if (cardKind === 'pause') { Snd.resume(); startRun(); }
    else if (cardKind === 'title') { goFull(); startIntro(); }
    else if (cardKind === 'rugged') { goFull(); startRun(); }
  });
  pauseBtn.addEventListener('click', () => { if (state === 'play') pauseGame(); else if (state === 'pause') resumeGame(); });

  // Sound: on unless muted, but browsers only let it start after a tap or key press.
  const soundOn = () => Snd.ready && !Snd.muted;
  function sndLabel() { snd.setAttribute('aria-pressed', String(soundOn())); snd.lastElementChild.textContent = soundOn() ? 'Sound on' : 'Sound off'; }
  Snd.onready = sndLabel;
  function flipSound() {
    if (soundOn()) { Snd.toggle(); sndLabel(); return; }
    if (Snd.muted) Snd.toggle();
    Snd.init(); sndLabel();
  }
  snd.addEventListener('click', flipSound);
  function unlockSound(e) {
    if ((e.target instanceof Node && snd.contains(e.target)) || (e.type === 'pointerdown' && e.pointerType !== 'mouse')) return;
    if (e.type === 'keydown' && (e.key === 'm' || e.key === 'M')) return;
    if (Snd.muted || state === 'pause') return;
    Snd.init(); sndLabel();
  }
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(type, unlockSound, { capture: true, passive: true });

  // Full screen: the Fullscreen API where it exists; on phones without it (iPhone) the game just fills the window.
  let wakeLock = null;
  function setFull(on) {
    gameEl.classList.toggle('full', on); document.body.classList.toggle('locked', on);
    fsBtn.lastElementChild.textContent = on ? 'Exit full screen' : 'Full screen';
    fsBtn.setAttribute('aria-pressed', String(on));
    if (on && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
    if (!on && wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  const isFull = () => gameEl.classList.contains('full');
  const nativeFull = () => document.fullscreenElement || document.webkitFullscreenElement;
  function toggleFull() {
    if (isFull()) {
      if (nativeFull()) { try { const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
      setFull(false);
    } else {
      setFull(true);
      const req = gameEl.requestFullscreen || gameEl.webkitRequestFullscreen;
      if (req) { try { const r = req.call(gameEl); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
    }
  }
  function onNativeChange() { if (!nativeFull() && isFull()) setFull(false); }
  document.addEventListener('fullscreenchange', onNativeChange);
  document.addEventListener('webkitfullscreenchange', onNativeChange);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (state === 'play') pauseGame(); Snd.pause(); }
    else { if (state !== 'pause') Snd.resume(); if (isFull() && navigator.wakeLock && !wakeLock) setFull(true); }
  });
  fsBtn.addEventListener('click', toggleFull);

  // ---------- input ----------
  // Physical keys first (so Shift doesn't change what a key does), then the key's name as a fallback.
  // Right hand: Shift or ' shoots, Enter slashes, with J/K and Z/X as alternatives.
  const CODES = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'jump', KeyW: 'jump', Space: 'jump',
    ArrowDown: 'down', KeyS: 'down',
    ShiftLeft: 'shoot', ShiftRight: 'shoot', Quote: 'shoot', KeyJ: 'shoot', KeyZ: 'shoot',
    Enter: 'slash', NumpadEnter: 'slash', KeyK: 'slash', KeyX: 'slash'
  };
  const NAMES = {
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump', ArrowDown: 'down', s: 'down', S: 'down',
    Shift: 'shoot', "'": 'shoot', '"': 'shoot', j: 'shoot', J: 'shoot', z: 'shoot', Z: 'shoot',
    k: 'slash', K: 'slash', x: 'slash', X: 'slash', Enter: 'slash'
  };
  const KEYS = { get: e => CODES[e.code] || NAMES[e.key] };
  function clearHeld() { keys.kbLeft = keys.kbRight = keys.kbShoot = keys.kbDown = keys.padShoot = false; padPointers.clear(); padSync(); stickOff(null); }
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = KEYS.get(e);
    if (state === 'play' && k) {
      e.preventDefault();
      if (k === 'left') keys.kbLeft = true; else if (k === 'right') keys.kbRight = true; else if (k === 'down') keys.kbDown = true;
      else { if (k === 'shoot') keys.kbShoot = true; if (!e.repeat) press(k); }
      return;
    }
    if (state === 'intro' && (k === 'jump' || k === 'slash' || k === 'shoot' || e.key === 'Escape')) {
      e.preventDefault();
      if (!e.repeat) { if (e.key === 'Escape') endIntro(); else advanceIntro(); }
      return;
    }
    if (e.repeat) return;
    if (e.key === 'm' || e.key === 'M') flipSound();
    else if (e.key === 'f' || e.key === 'F') toggleFull();
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (state === 'play') { e.preventDefault(); pauseGame(); }
      else if (state === 'pause') { e.preventDefault(); resumeGame(); }
      else if (e.key === 'Escape' && isFull() && !nativeFull()) setFull(false);
    }
  });
  addEventListener('keyup', e => { const k = KEYS.get(e); if (k === 'left') keys.kbLeft = false; else if (k === 'right') keys.kbRight = false; else if (k === 'shoot') keys.kbShoot = false; else if (k === 'down') keys.kbDown = false; });
  addEventListener('blur', () => { keys.kbLeft = keys.kbRight = keys.kbShoot = keys.kbDown = false; });

  // Touch: a thumb stick on the left, Shoot and Slash on the right. Each finger is tracked, so a thumb can slide between
  // Shoot and Slash; they act as a finger lands on them, and Shoot keeps firing while held.
  const pads = $('pads'), padPointers = new Map();
  // A thumb a little off a pad, in the gap between two, still counts: the nearest pad within reach.
  const PAD_REACH = 18;
  function padAt(x, y) {
    const el = document.elementFromPoint(x, y), p = el && el.closest && el.closest('.pad');
    if (p && pads.contains(p)) return p.dataset.k;
    let best = null, bd = PAD_REACH;
    for (const q of pads.querySelectorAll('.pad')) {
      const r = q.getBoundingClientRect(), d = Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom));
      if (d < bd) { bd = d; best = q; }
    }
    return best ? best.dataset.k : null;
  }
  // The rings round the buttons: Shoot's is the blaster's charge, Slash's sweeps back as it's ready again.
  const shootPad = pads.querySelector('.pad.shoot'), slashPad = pads.querySelector('.pad.slash'), ringWas = {};
  function ring(el, key, fill, cls) {
    const f = Math.round(fill * 40) / 40, c = cls || '';
    if (ringWas[key] === f + c) return;
    ringWas[key] = f + c;
    el.style.setProperty('--fill', f);
    el.classList.toggle('low', c === 'low'); el.classList.toggle('off', c === 'off');
  }
  function padRings() {
    if (!document.body.classList.contains('touch')) return;
    ring(shootPad, 'shoot', R.armed === false ? 0 : R.charge / TUNE.charges, R.armed === false || bull.crouch ? 'off' : R.charge < 4 ? 'low' : '');
    ring(slashPad, 'slash', 1 - bull.cd / TUNE.slashCd);
  }
  function padSync() {
    const held = new Set(padPointers.values());
    keys.padShoot = held.has('shoot');
    for (const p of pads.querySelectorAll('.pad')) p.classList.toggle('on', held.has(p.dataset.k));
  }
  pads.addEventListener('pointerdown', e => {
    const k = padAt(e.clientX, e.clientY);
    if (!k) return;
    e.preventDefault();
    try { pads.setPointerCapture(e.pointerId); } catch (_) {}
    padPointers.set(e.pointerId, k);
    if (k === 'slash' || k === 'shoot') press(k);
    padSync();
  });
  pads.addEventListener('pointermove', e => {
    if (!padPointers.has(e.pointerId)) return;
    const k = padAt(e.clientX, e.clientY);
    if (k === padPointers.get(e.pointerId)) return;
    padPointers.set(e.pointerId, k);
    if (k === 'slash' || k === 'shoot') press(k);
    padSync();
  });
  const lift = e => { if (padPointers.delete(e.pointerId)) padSync(); };
  pads.addEventListener('pointerup', lift); pads.addEventListener('pointercancel', lift);
  pads.addEventListener('contextmenu', e => e.preventDefault());
  // The thumb stick: wherever a thumb lands in its zone becomes the centre. Slide left or right to move, flick up to jump
  // (once per flick: let it come back toward the middle to flick again), hold down to crouch. The knob follows the thumb,
  // and if the thumb wanders well past the ring the centre follows it, so the stick never runs away from you.
  const zone = $('stickzone'), stickEl = $('stick'), knob = $('knob');
  const STICK = { r: 44, side: 12, up: 20, down: 18 };
  let stickId = null, centre = null, upArmed = true;
  function stickAt(x, y) {
    let dx = x - centre.x, dy = y - centre.y;
    const far = Math.hypot(dx, dy), max = STICK.r * 1.4;
    if (far > max) { const k = (far - max) / far; centre.x += dx * k; centre.y += dy * k; dx = x - centre.x; dy = y - centre.y; }
    const zr = zone.getBoundingClientRect(), kr = Math.min(1, STICK.r / Math.max(1, Math.hypot(dx, dy)));
    stickEl.style.left = (centre.x - zr.left) + 'px'; stickEl.style.top = (centre.y - zr.top) + 'px';
    knob.style.transform = 'translate(' + Math.round(dx * kr) + 'px,' + Math.round(dy * kr) + 'px)';
    const down = dy > STICK.down && dy > Math.abs(dx) * .8, up = dy < -STICK.up && -dy > Math.abs(dx) * .6;
    keys.padDown = down;
    keys.padLeft = !down && dx < -STICK.side; keys.padRight = !down && dx > STICK.side;
    if (up && upArmed) { upArmed = false; press('jump'); }
    if (dy > -STICK.up * .5) upArmed = true;
  }
  function stickOff(e) {
    if (e && e.pointerId !== stickId) return;
    stickId = null; keys.padLeft = keys.padRight = keys.padDown = false;
    stickEl.classList.remove('on'); stickEl.style.left = stickEl.style.top = ''; knob.style.transform = '';
  }
  zone.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (stickId !== null) return;
    e.preventDefault();
    stickId = e.pointerId; centre = { x: e.clientX, y: e.clientY }; upArmed = true; zone.classList.add('used');
    try { zone.setPointerCapture(e.pointerId); } catch (_) {}
    stickEl.classList.add('on');
    stickAt(e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', e => { if (e.pointerId !== stickId) return; e.preventDefault(); stickAt(e.clientX, e.clientY); });
  zone.addEventListener('pointerup', stickOff); zone.addEventListener('pointercancel', stickOff);
  const markTouch = () => document.body.classList.add('touch');
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) markTouch();
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') markTouch(); }, { capture: true, passive: true });

  // ---------- loop ----------
  // The balance harness sets looping to false and drives update() itself.
  let last = 0, looping = true;
  function frame(now) {
    if (!looping) return;
    const dt = last ? Math.min(.05, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    update(dt); draw(); padRings();
    requestAnimationFrame(frame);
  }
  function start() {
    buildBG();
    newRun();
    setState('title');
    showCard('title');
    sndLabel();
    Snd.music('theme');
    draw();
    requestAnimationFrame(frame);
  }
  start();
})();
