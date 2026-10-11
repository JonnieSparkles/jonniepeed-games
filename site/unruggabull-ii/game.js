// Unruggabull II: Salvation for the Unrugged. The core: the corridor, the run, Unruggabull, his blaster and katana,
// carpshits, souls, effects, words, the HUD, the title, the cards, input and the frame loop. What happens on a floor
// (its hall, its enemies and props, its boss) lives in that floor's script: this build has one, floor13.js.
// Classic script: art.js (UnrugArt), audio.js (UnrugSound), render.js (UnrugRender) and floor13.js (UnrugFloor13)
// load first.
//
// The corridor is seen from behind Unruggabull. Every thing has a lane u (-1 left wall, 1 right wall), a depth z
// (0 at the camera, 1 at the far end of the hall as it was: the Shredder's spot) and a height h (0 floor, 1 ceiling);
// PX, FY and YH project them onto the game's 240x135 coordinates. The picture is 480x270, twice that: the renderer
// works out the hall in light, the game draws its things over it (lit where they stand, or glowing), and the HUD
// and words go on top (see "the lit picture" and draw()).
(function () {
  'use strict';
  const A = UnrugArt, Snd = UnrugSound;
  const rect = A.rect, line = A.line, disc = A.disc, poly = A.poly, txt = A.txt, otxt = A.otxt, textWidth = A.textWidth;
  const $ = id => document.getElementById(id);
  const c = $('c');
  const view = c.getContext('2d');   // the canvas on the page: the finished picture, then the HUD and words
  let g = view;                      // where drawing goes now: the page, or one of the two layers (use())
  const W = 240, H = 135;
  view.imageSmoothingEnabled = false;

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
    stackHits: 3,           // moving day: blaster hits that blast a stack of boxes apart
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
  const JUMP_V = 4 * TUNE.jumpH / TUNE.jumpT, GRAV = 8 * TUNE.jumpH / (TUNE.jumpT * TUNE.jumpT);

  // ---------- the lit picture ----------
  // 480x270, twice the game's coordinates. The renderer's hall is worked out from the projection above, so a thing
  // at (u, z, h) is at world (u * WHW, h * WC, WZ0 * (1 + 2z)), in units of about Unruggabull's height (he's 38 px tall
  // at z = 0 in the game's coordinates, so 76 in the picture). One renderer for the page, made when first needed.
  const PIC = 2, PW = W * PIC, PH = H * PIC, UNIT = 76;
  const WK = PIC / UNIT, WC = (FN - CN) * WK, WHW = HW * WK, WZ0 = .6 * PW / UNIT, WZ = 2 * WZ0;
  const world = (u, z, h) => [u * WHW, h * WC, WZ0 * (1 + 2 * z)];
  const SET = {
    E: (FN - HY) * WK, C: WC, HW: WHW, f: .6, cy: HY * PIC / PH,
    rug: TUNE.runner * WHW, rugEdge: .04 * WHW, skirt: .03 * WC, rail: [.3 * WC, .33 * WC],
    post: WZ / 6, panel: WZ * .4, fog: [WZ0 * 3.4, WZ0 * 12]
  };
  let RENDER = null;
  const renderer = () => RENDER || (RENDER = UnrugRender.create(PW, PH, SET));
  // The two layers the scene is drawn into: things lit by the hall's light where they stand, and things that glow.
  function layerCtx() {
    const x = A.canvas(PW, PH).getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = false;
    return x;
  }
  const LIT = layerCtx(), GLOW = layerCtx();
  // Draw on x from now on (the floor too).
  function use(x) { g = x; floor.use(x); }

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
    floor.newRun(R, bull, at);
  }
  // Where a target is, for aiming and hits: the floor knows where its own things are.
  const posOf = o => floor.posOf(o);

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
          floor.blasterBack();
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
      if (b.bz >= TUNE.mouth) floor.draggedIn();
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
    if (R.pull.st === 'on' && onRunner()) floor.cutRug();
  }
  // While the blade is out: knock projectiles back and cut carpshits in two. Temps stay safe behind their partitions:
  // the blaster or their own paper knocked back gets them.
  function slashHits() {
    const near = (u, z) => z > bull.bz - .04 && z < bull.bz + TUNE.slashReach && Math.abs(u - bull.u) < TUNE.slashWide;
    floor.slash(near);
    for (const f of R.flies) if (!f.dead && near(f.u, f.z)) killFly(f, 'slash');
  }
  // One shot (three with Spread Shot) for one charge. Out of charges: a click, a red flash, and a wait.
  function fire() {
    if (R.armed === false) { R.empty = .2; Snd.play('empty'); return false; }   // knocked out of his hands: go and get it
    if (R.charge < 1) { R.empty = .2; Snd.play('empty'); return false; }
    R.charge--;
    if (R.charge < 1) { R.dry = true; emit('empty'); Snd.play('drained'); if (!R.fx.some(f => f.k === 'pop' && f.text === 'EMPTY')) popText('EMPTY', PX(bull.u, bull.bz), YH(bull.bz, bull.jh + .3), '#ff7050'); }
    bull.aimT = .22;
    let best = null, bz = Infinity;
    const consider = (o, at, cone) => { if (at.z > bull.bz + .05 && at.z < .97 && Math.abs(at.u - bull.u) < cone && at.z < bz) { best = o; bz = at.z; } };
    floor.aim(consider);
    for (const f of R.flies) consider(f, f, .3);
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
  function updateShots(dt) {
    for (const s of R.shots) {
      s.z += TUNE.shotSpeed * dt; s.u += (s.du || 0) * dt;
      if (s.tgt && !s.tgt.dead && !(s.tgt.sw && s.tgt.hit)) {
        const at = posOf(s.tgt), k = Math.min(1, TUNE.shotSpeed * dt / Math.max(.04, at.z - s.z));
        s.u += (at.u - s.u) * k; s.h += (at.h - s.h) * k;
      }
      if (floor.shotHits(s)) continue;
      for (const f of R.flies) {
        if (f.dead || Math.abs(s.u - f.u) > .11 || Math.abs(s.z - f.z) > .06) continue;
        s.dead = true; f.hp--; f.hit = .1; Snd.play('hit'); sparks(f.u, f.z, f.h);
        if (f.hp <= 0) killFly(f, 'shot');
        break;
      }
      if (s.dead) continue;
      if (s.z >= .965) {
        s.dead = true;
        if (!floor.shotFar(s)) poof(s.u, .97, s.h, 3);
      }
    }
    R.shots = R.shots.filter(s => !s.dead && Math.abs(s.u) < 1.1);
  }
  function hurtBull(n, cause) {
    if (bull.inv > 0 || bull.mouth > 0 || bull.spat > 0 || R.phase === 'dead' || R.phase === 'win') return false;
    R.hearts = Math.max(0, R.hearts - n); bull.inv = TUNE.hurtInv; R.shake = .2; R.red = .15; bull.stag = .3;   // he staggers (drawn only)
    if (R.hearts === 1) bark('low');
    R.lastCause = cause || 'unknown'; emit('hit', { amount: n, cause: R.lastCause });
    floor.hurt(cause);
    Snd.play('hurt');
    if (R.hearts <= 0) die();
    return true;
  }



  function muzzleXY() { const k = sc(bull.bz); return { x: PX(bull.u, bull.bz) + A.MUZZLE.x * k, y: YH(bull.bz, bull.jh) + A.MUZZLE.y * k }; }
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
    const by = floor.bonusBy(how);
    if (!by) return;
    free(x + 4, y - 2, source, by);
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
  function duckHint() {
    if (R.events.duckHint || R.talk || (R.banner && R.banner.pull)) return;
    R.events.duckHint = true; R.banner = { text: 'DUCK', t: 0, dur: 1.6, pull: true };
    live('Duck: hold down to crouch under things at head height.');
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
      if (R.slow <= 0) { R.slow = 0; R.boss.flash = 0; floor.blowUp(); }
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
    floor.update(dt);
  }
  function die() {
    R.statsStage = stageNo();
    R.phase = 'dead'; R.phaseT = 0; R.hearts = 0; R.bark = null;
    emit('game_over', { cause: R.lastCause || 'unknown', score: R.souls });
    floor.endPull();
    R.banner = { text: 'RUGGED.', t: 0, dur: 99, col: '#ff7050' };
    Snd.music(null); Snd.play('over'); Snd.play('yank');
    live('Rugged.');
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
  // Effects come in three passes: things in the hall that take its light, things that glow, and words (over it all).
  const FX_PASS = { wisp: 'glow', cut: 'glow', bolt: 'glow', rise: 'glow', muzzle: 'glow', spark: 'glow', pop: 'words', big: 'words' };
  function drawFx(pass) {
    for (const f of R.fx) {
      if ((FX_PASS[f.k] || 'lit') !== pass) continue;
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
    floor.hud();
  }
  // The souls freed so far, top right, with a ghost that bobs as each one lands.
  function drawSoulsCounter() {
    const n = String(Math.min(R.souls, R.shown)), tw = textWidth(n), pulse = R.meterPulse > 0;
    g.drawImage(A.GHOST, W - 4 - tw - 12, pulse ? 2 : 3);
    otxt(g, n, W - 4, 5, pulse ? '#ffd44a' : '#fff6e2', 1, 'right');
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
  // The light things give off this frame, for the renderer: blaster bolts as they fly, the muzzle flash, pickups.
  // Bolts and the flash are kept soft, so steady fire lights the hall without strobing it.
  // (The floor adds its own.)
  function sceneLights(r) {
    let n = 0;
    for (const s of R.shots) {
      if (n++ >= 10) break;
      const [x, y, z] = world(s.u, s.z, s.h);
      if (s.soul) r.light(x, y, z, .3, .25, .12); else if (s.spread) r.light(x, y, z, .32, .24, .08); else r.light(x, y, z, .16, .3, .5);
    }
    if (R.fx.some(f => f.k === 'muzzle')) { const [x, y, z] = world(bull.u + A.MUZZLE.x / HW, bull.bz, bull.jh - A.MUZZLE.y / (FN - CN)); r.light(x, y, z - .15, .4, .3, .14); }
    for (const pk of R.pickups) {
      const z = pk.w - R.dist; if (z > 1.02 || z < ZN) continue;
      const [x, y, wz] = world(pk.u, z, pk.h);
      if (pk.kind === 'coffee') r.light(x, y, wz, .5, .2, .12); else r.light(x, y, wz, .5, .42, .12);
    }
  }
  // A frame of play: the lights, the hall, the floor's things drawn into the two layers and laid over it, the finish
  // (shaken as a whole when something hits hard), then the flashes, the HUD and the words on top, crisp.
  function draw() {
    if (state === 'title' || state === 'intro') { use(view); view.setTransform(PIC, 0, 0, PIC, 0, 0); drawTitle(); return; }
    const r = renderer();
    sceneLights(r); floor.lights(r);
    r.frame(R.t, floor.view());
    for (const x of [LIT, GLOW]) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, PW, PH); x.setTransform(PIC, 0, 0, PIC, 0, 0); }
    use(LIT); floor.draw();
    use(GLOW); floor.glows();
    r.layer(LIT.getImageData(0, 0, PW, PH).data, GLOW.getImageData(0, 0, PW, PH).data);
    const sx = R.shake > 0 ? Math.round((Math.random() - .5) * 6 * Math.min(1, R.shake * 4)) : 0, sy = sx ? Math.round((Math.random() - .5) * 4) : 0;
    use(view);
    view.setTransform(1, 0, 0, 1, 0, 0);
    if (sx || sy) { view.fillStyle = '#09070b'; view.fillRect(0, 0, PW, PH); }
    r.present(view, sx * PIC, sy * PIC);
    view.setTransform(PIC, 0, 0, PIC, 0, 0);
    if (R.red > 0) { g.save(); g.globalAlpha = R.red * 1.6; rect(g, 0, 0, W, H, '#d63428'); g.restore(); }
    // one heart left: the edges of the screen pulse red with the heartbeat
    if (lowHealth()) {
      const a = .16 + .5 * R.pulse / .35;
      g.save(); for (let i = 0; i < 4; i++) { g.globalAlpha = a * (1 - i / 4); const d = i * 3; rect(g, d, d, W - 2 * d, 3, '#d63428'); rect(g, d, H - d - 3, W - 2 * d, 3, '#d63428'); rect(g, d, d + 3, 3, H - 2 * d - 6, '#d63428'); rect(g, W - d - 3, d + 3, 3, H - 2 * d - 6, '#d63428'); } g.restore();
    }
    if (R.white > 0) { g.save(); g.globalAlpha = Math.min(1, R.white * 4); rect(g, 0, 0, W, H, '#ffffff'); g.restore(); }
    if (R.zap > 0) { g.save(); g.globalAlpha = Math.min(.6, R.zap * 2); rect(g, 0, 0, W, H, '#3aa8e0'); g.restore(); }
    floor.overlay(); drawFx('words'); drawHUD(); drawWords();
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
  // ---------- play stats (site/assets/stats.js; switched off in stats/games.json until Jonnie turns it on) ----------
  let statsRun = null;
  const STAGES = ['accounts', 'moving', 'all_staff', 'lights_out', 'copy_room', 'phase_1', 'phase_2', 'phase_3', 'cleared'];
  function stageNo() {
    if (R.phase === 'win') return 9;
    if (R.phase === 'hall') return R.event ? (R.event.kind === 'move' ? 2 : 4) : [1, 3, 5][R.beat];
    if (R.phase === 'wake') return 6;
    if (R.phase === 'boss') return 5 + R.boss.ph;
    return R.statsStage || 1;
  }
  // what a run reports, at its end or when the page is left mid-run
  function runReport() {
    const st = stageNo();
    return { score: R.souls, time_ms: Math.round((R.endT || R.t) * 1000), won: R.phase === 'win',
      stats: { stage: st, stage_name: STAGES[st - 1], cause: R.phase === 'win' ? 'cleared' : (R.lastCause || 'none'), continues: R.continues || 0,
        boss_hp: Math.round(R.boss.hp), smashes: R.events.smashes || 0, best_rally: R.events.bestRally || 0, wipes: R.events.wipes || 0, deflects: R.events.deflects || 0 } };
  }
  function statsStart() { statsRun = window.PlayStats ? PlayStats.start('unruggabull-ii', { progress: runReport }) : null; }
  function startRun() {
    if (statsRun && window.PlayStats) { PlayStats.quit(statsRun); statsRun = null; }   // restarted from pause: the open run is a quit
    checkpoint = null;
    newRun();
    statsStart();
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
    statsStart();   // a continue is a run of its own, from the Shredder
    setState('play'); card.hidden = true;
    floor.startWake();
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
    if (statsRun && window.PlayStats) { PlayStats.end(statsRun, runReport()); statsRun = null; }
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
  // Drawn at a steady 30 frames a second, whatever the screen's rate: the lit picture takes more than a 60th of a second
  // on a phone. The game itself still steps in 60ths, two to a frame, so it plays the same.
  // The balance harness sets looping to false and drives update() itself.
  const STEP = 1 / 60, EVERY = 1000 / 30;
  let last = 0, looping = true;
  function frame(now) {
    if (!looping) return;
    requestAnimationFrame(frame);
    if (last && now - last < EVERY - 4) return;
    let dt = last ? Math.min(.1, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    while (dt > 1e-6) { const s = Math.min(STEP, dt); update(s); dt -= s; }
    draw(); padRings();
  }
  function start() {
    setTimeout(renderer, 60);   // the renderer works out the hall once (a moment's work), while the title's up
    newRun();
    setState('title');
    showCard('title');
    sndLabel();
    Snd.music('theme');
    draw();
    requestAnimationFrame(frame);
  }
  // ---------- the floor ----------
  // Made once, with the core's shared pieces. It gets the run's R and bull from newRun.
  const floor = UnrugFloor13({
    A, Snd, rect, line, disc, poly, txt, otxt, textWidth, W, H, VX,
    HY, ZN, sc, PX, FY, CY, YH, BACK, mod1, clamp, quadF, TUNE,
    rnd, rr, fxr, emit, addPickup, overlaps, moveDir, shooting, onRunner, updateBull, updatePickups, updateFlies,
    updateShots, updateFx, muzzleXY, sparks, hurtBull, die, endRun, free, bonusSoul, killFly, poof, popText,
    bark, talk, live, duckHint, shadow, tinted, drawBull, drawFly, drawPickup, drawShot, drawFx, drawWisp,
    drawBig, drawSoulsCounter, world, WZ,
    g, setCheckpoint: v => { checkpoint = v; }
  });

  start();
})();
