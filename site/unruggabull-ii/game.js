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
  const c = $('c'), g = c.getContext('2d');
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
    jumpH: .12, jumpT: .55, // jump height (of the hall) and airtime
    fireEvery: .2, shotSpeed: 2.2, aimCone: .38,
    charges: 20, recharge: .5, // the blaster holds 20 shots and gets one back every half second, like the first game's
    spreadT: 10, coffeeDrop: .2, rowH: .055,
    slashT: .2, slashCd: .32, slashReach: .24, slashWide: .34, deflectWindow: .12,
    hurtInv: 1.7,
    scroll: .2,             // walking speed down the hall, depth a second
    pullSpeed: .3, recover: .5, mouth: .85,
    goal: 60,               // souls that wake the Shredder
    wadTime: 1.1, wadLead: .2, throwChance: .6, eventT: 6, auditT: 8,
    bossHP: 100, shotDmg: .3, jamMult: 3, bundleDmg: 6, stapleDmg: 2, jamT: 2.6, bossSouls: 13,
    deflectCharge: 3,       // each deflect gives the blaster this many charges back
    // the phase 3 rally: each return is quicker (dur × speedUp, down to fastest); the miss hits for smash + smashPer × returns
    rally: { serve: 1.7, speedUp: .8, fastest: .6, back: .45, smash: 10, smashPer: 4, stun: 1.6 }
  };
  // The hall comes in three beats, each with its own sign, props and trouble. The first two last `time` seconds
  // and end with an event; the last wakes the Shredder once you reach the goal (after `minT`, or at `max` regardless).
  const BEATS = [
    { sign: 'ACCOUNTS PAYABLE', time: 26, station: 'cub', temps: .6, fly: 3.8, boxes: true, decor: 'poster', music: 'tower', after: 'audit' },
    { sign: 'ALL STAFF', time: 20, station: 'cub', temps: .35, formations: true, boxes: false, rows: 'chairs', decor: 'streamer', music: 'staff', after: 'dark' },
    { sign: 'COPY ROOM', minT: 18, max: 60, station: 'copier', temps: .65, fly: 3, boxes: true, rows: 'sheet', pulls: true, decor: 'stack', music: 'copy' }
  ];
  const JUMP_V = 4 * TUNE.jumpH / TUNE.jumpT, GRAV = 8 * TUNE.jumpH / (TUNE.jumpT * TUNE.jumpT);

  // ---------- random ----------
  let seed = (Date.now() ^ 0x9e3779b9) >>> 0;
  function rnd() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  const rr = (a, b) => a + (b - a) * rnd();

  // ---------- run state ----------
  // state: title, intro, play, pause or over. R.phase inside a run: hall, wake, boss, win or dead.
  let state = 'title', R = null, bull = null;
  function newRun() {
    R = {
      t: 0, dist: 0, speed: TUNE.scroll, phase: 'hall', phaseT: 0, souls: 0, hearts: TUNE.hearts,
      beat: 0, beatT: 0, event: null,
      cubs: [], decor: [], signs: [], flies: [], boxes: [], rows: [], pickups: [], shots: [], projs: [], fx: [],
      nextCubW: 1.1, nextDecorW: .6, nextFly: 5, nextForm: 2, formN: 0, nextBox: 16, nextRow: 5, fireT: 0, noPops: false,
      charge: TUNE.charges, rechargeT: 0, empty: 0, spread: 0, streak: 0, streakT: 0, freeze: 0,
      pull: { st: 'idle', t: 0, dur: 0, next: 0, count: 0, snd: 0 }, roff: 0, cut: null,
      boss: { hp: TUNE.bossHP, st: 'sleep', ph: 1, atk: 0, atkN: 0, jam: 0, flash: 0, tick: 0, chomp: 0, spit: 0, hitSnd: 0, freed: 0 },
      banner: null, talk: null, shake: 0, red: 0, endT: 0, events: {}
    };
    bull = { u: 0, bz: 0, jh: 0, jv: 0, slash: -1, cd: 0, inv: 0, mouth: 0, spat: 0, step: 0 };
    for (let w = .2; w < 1.05; w += .36) addCubs(w, false);
    addSign(.95, BEATS[0].sign);
  }
  const beat = () => BEATS[R.beat];

  // ---------- the hall: stations (cubicles or copiers) with temps, signs, decor ----------
  const cubZ = cb => cb.w - R.dist;
  const STATION_TOP = { cub: .38, copier: .32 };
  function addCubs(w, temps, both, chance) {
    const kind = R.event && R.event.kind === 'audit' ? 'cub' : beat().station;
    const sides = both || rnd() < .35 ? [-1, 1] : [rnd() < .5 ? -1 : 1];
    for (const s of sides) {
      const cb = { w, s, kind, top: STATION_TOP[kind], temp: null };
      if (temps && rnd() < (chance == null ? beat().temps : chance)) cb.temp = { cub: cb, st: 'hidden', t: 0, pop: 0, trig: rr(.45, .8), pops: 0, threw: false, dead: false };
      R.cubs.push(cb);
    }
  }
  // Where a target is, for aiming and hits. Temps live behind their station.
  function posOf(o) {
    if (o.cub) return { u: o.cub.s * .8, z: cubZ(o.cub) + .06, h: o.cub.top - .07 + o.pop * .17 };
    return o;
  }
  // A sign hangs from the ceiling at the start of each beat, so you can read where you are.
  function addSign(w, text) {
    const img = A.canvas(A.textWidth(text) + 8, 11), b = img.getContext('2d');
    rect(b, 0, 0, img.width, 11, '#1a1418'); rect(b, 1, 1, img.width - 2, 9, '#2a3c6a'); txt(b, text, 4, 3, '#fff6e2');
    R.signs.push({ w: R.dist + w, img });
  }
  function spawnHall(dt) {
    const B = beat(), ev = R.event && R.event.kind;
    while (R.dist + 1.05 >= R.nextCubW) {
      if (ev === 'audit') { addCubs(R.nextCubW, true, true, 1); R.nextCubW += rr(.2, .26); }
      else { addCubs(R.nextCubW, R.t > 2.5); R.nextCubW += rr(.28, .38); }
    }
    while (R.dist + 1.05 >= R.nextDecorW) {
      R.decor.push({ w: R.nextDecorW, s: rnd() < .5 ? -1 : 1, kind: rnd() < .25 && B.decor === 'poster' ? 'cooler' : B.decor, col: rnd() });
      R.nextDecorW += rr(.35, .6);
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
    const add = (u, dz, extra) => R.flies.push(Object.assign({ u, z: 1 + dz, h: .36, hp: 1, ph: rnd() * 6, hit: 0, dead: false, form: kind }, extra));
    if (kind === 'v') { const c0 = rr(-.3, .3); [[0, 0], [-.18, .07], [.18, .07], [-.36, .14], [.36, .14]].forEach(([o, dz]) => add(clamp(c0 + o, -.75, .75), dz)); }
    else if (kind === 'line') { const gap = Math.floor(rnd() * 5); [-.6, -.3, 0, .3, .6].forEach((u, i) => { if (i !== gap) add(u, 0); }); }
    else { const ph = rnd() * 6; for (let i = 0; i < 6; i++) add(0, i * .08, { snake: ph - i * .7 }); }
  }
  // Between beats: an AUDIT (every temp stands up at once) or the lights go out.
  function startEvent(kind) {
    R.event = { kind, t: 0, dur: TUNE.eventT };
    if (kind === 'audit') {
      // a deflect round: the temps all stand and lob paperwork, and every one you knock back counts double
      R.event.dur = TUNE.auditT; R.event.nextThrow = 1.2;
      for (const cb of R.cubs) { const z = cubZ(cb); if (z > .3 && (!cb.temp || cb.temp.dead)) cb.temp = { cub: cb, st: 'hidden', t: 0, pop: 0, trig: 0, pops: 0, threw: true, dead: false }; }
      R.banner = { text: 'AUDIT!', sub: 'KNOCK THE PAPERWORK BACK: x2 SOULS', t: 0, dur: 2.6, col: '#ff5040' };
      Snd.play('audit'); live('Audit! The temps lob paperwork. Slash it back for double souls.');
    } else {
      R.banner = { text: 'LIGHTS OUT', t: 0, dur: 1.6, col: '#7fd4ff' };
      Snd.play('dark'); Snd.music('dark'); live('Lights out.');
      spawnFormation('snake');
    }
  }
  function updateHall(dt) {
    R.beatT += dt;
    const B = beat();
    if (R.event) {
      R.event.t += dt;
      if (R.event.t >= R.event.dur) {
        if (R.event.kind === 'dark') Snd.play('lights');
        R.event = null; R.beat++; R.beatT = 0;
        addSign(1, beat().sign);
        Snd.music(beat().music);
        if (beat().pulls) R.pull.next = R.t + 3;
        // a coffee after each event, then a Spread Shot to try out
        addPickup('coffee', .9, rr(-.4, .4)); addPickup('spread', 1.3, rr(-.4, .4));
      }
    } else if (B.after && R.beatT >= B.time && !(B.formations && R.flies.some(f => f.form) && R.beatT < B.time + 8)) startEvent(B.after);
    else if (!B.after && ((R.souls >= TUNE.goal && R.beatT >= B.minT) || R.beatT >= B.max)) { startWake(); return; }
    spawnHall(dt);
  }
  // Pickups float at jump height: a coffee gives a heart back, a Spread Shot fires three ways for a while.
  // They drift toward you a little on their own, so they still arrive when the hall has stopped.
  function addPickup(kind, dz, u) { const pk = { kind, w: R.dist + dz, u: clamp(u, -TUNE.aisle + .05, TUNE.aisle - .05), h: .3, t: 0 }; R.pickups.push(pk); return pk; }
  function updatePickups(dt) {
    for (const pk of R.pickups) {
      pk.t += dt; pk.w -= .06 * dt;
      const z = pk.w - R.dist;
      if (!pk.got && Math.abs(z - bull.bz) < .05 && Math.abs(pk.u - bull.u) < .15 && overlaps(pk.h, .04) && !bull.mouth) {
        pk.got = true;
        const x = PX(pk.u, z), y = YH(z, pk.h);
        if (pk.kind === 'coffee') {
          const full = R.hearts >= TUNE.hearts;
          R.hearts = Math.min(TUNE.hearts, R.hearts + 1);
          popText(full ? 'FULL' : '+1 HEART', x, y - 8, '#ff7050'); Snd.play('coffee'); live(full ? 'Coffee. Hearts already full.' : 'Coffee: one heart back.');
        } else {
          R.spread = TUNE.spreadT; R.charge = TUNE.charges;
          popText('SPREAD SHOT', x, y - 8, '#ffd44a'); Snd.play('power'); live('Spread Shot: the blaster fires three ways for ten seconds.');
        }
      }
      if (!pk.got && !R.events.grabHint && z < .5 && z > .2 && R.phase === 'hall' && !R.banner) {
        R.events.grabHint = true; R.banner = { text: 'JUMP TO GRAB IT', t: 0, dur: 2, pull: true };
      }
    }
    R.pickups = R.pickups.filter(pk => !pk.got && pk.w - R.dist > Math.max(ZN, bull.bz - .1));
  }
  function updateRows(dt) {
    for (const row of R.rows) {
      row.w -= (row.kind === 'chairs' ? .12 : .22) * dt;   // chairs roll toward you; paper skids faster
      const z = row.w - R.dist;
      if (row.hit) { row.hit += dt; continue; }
      if (!R.events.jumpHint && z < .6 && R.phase === 'hall') {
        R.events.jumpHint = true; R.banner = { text: 'JUMP!', sub: 'UP ARROW, W OR SPACE', t: 0, dur: 2.2, pull: true };
      }
      if (Math.abs(z - bull.bz) < .02 && bull.jh < TUNE.rowH && hurtBull(1)) { row.hit = .001; R.events.rowHits = (R.events.rowHits || 0) + 1; }
    }
    R.rows = R.rows.filter(row => row.w - R.dist > ZN && row.hit < .6);
  }
  const BOX_H = .06;
  function updateBoxes(dt) {
    for (const bx of R.boxes) {
      const z = bx.w - R.dist;
      if (bx.hit) { bx.hit += dt; continue; }
      if (Math.abs(z - bull.bz) < .02 && Math.abs(bx.u - bull.u) < .14 && bull.jh < BOX_H && hurtBull(1)) bx.hit = .001;
    }
    R.boxes = R.boxes.filter(bx => bx.w - R.dist > ZN && bx.hit < .5);
  }
  function updateTemps(dt) {
    const audit = R.event && R.event.kind === 'audit';
    if (audit) {
      // the audit throws on a steady beat, one temp at a time, slow enough to read
      R.event.nextThrow -= dt;
      if (R.event.nextThrow <= 0 && R.event.t < R.event.dur - 1.2) {
        const up = R.cubs.filter(cb => { const z = cubZ(cb); return cb.temp && !cb.temp.dead && cb.temp.pop > .6 && z > .35 && z < .9; });
        if (up.length) { throwWad(up[Math.floor(rnd() * up.length)].temp, 1.35); R.event.nextThrow = .55; }
      }
    }
    for (const cb of R.cubs) {
      const tp = cb.temp, z = cubZ(cb);
      if (!tp || tp.dead) continue;
      tp.t += dt;
      if (tp.st === 'hidden') {
        if (!R.noPops && ((z < tp.trig && z > .3) || (audit && z > .25 && z < .95))) { tp.st = 'up'; tp.t = audit ? rr(0, .3) : 0; tp.threw = false; }
      } else if (tp.st === 'up') {
        tp.pop = Math.min(1, tp.pop + dt * 7);
        if (!tp.threw && tp.t > .55 && z > .22 && !R.noPops && !audit) { tp.threw = true; if (rnd() < TUNE.throwChance) throwWad(tp); }
        if (tp.t > (audit ? 1.8 : 1.25)) { tp.st = 'down'; tp.t = 0; tp.threw = true; }
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
    for (const f of R.flies) {
      if (f.form) {
        // formations keep their shape instead of chasing you
        f.z -= (.3 + R.speed * .4) * dt;
        if (f.snake != null) f.u = .55 * Math.sin(f.snake + R.t * 2.2);
      } else {
        f.z -= (.34 + R.speed * .4) * dt;
        f.u = clamp(f.u + clamp(bull.u - f.u, -.3, .3) * dt * .9 + Math.sin(R.t * 3 + f.ph) * .12 * dt, -.75, .75);
      }
      if (f.z < .45) f.h += (.12 - f.h) * Math.min(1, dt * 2.5);
      f.hit = Math.max(0, f.hit - dt);
      if (!f.dead && Math.abs(f.z - bull.bz) < .045 && Math.abs(f.u - bull.u) < .12 && overlaps(f.h, .05)) {
        if (hurtBull(1)) { f.dead = true; poof(f.u, f.z, f.h); }
      }
      if (f.z < bull.bz - .12 || f.z < ZN) f.dead = true;
    }
    R.flies = R.flies.filter(f => !f.dead);
  }
  // Does something at height h (give or take half) touch Unruggabull, who stands about .2 of the hall tall?
  const overlaps = (h, half) => h + half > bull.jh && h - half < bull.jh + .2;

  // ---------- projectiles: paper wads, shredded-paper bundles, staples ----------
  function launch(kind, from, to, dur, extra) {
    const gv = kind === 'wad' ? .6 : 0;
    const p = Object.assign({ kind, u: from.u, z: from.z, h: from.h, vu: (to.u - from.u) / dur, vz: (to.z - from.z) / dur,
      vh: (to.h - from.h + .5 * gv * dur * dur) / dur, gv, w: .05, hh: .04, friendly: false, src: null, dead: false, spin: rnd() * 4 }, extra || {});
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
    let to = { u: 0, z: .98, h: .12 };
    if (p.kind === 'wad') to = p.src && !p.src.dead ? posOf(p.src) : { u: p.u, z: 1.1, h: p.h };
    const rl = R.boss.rally, dur = p.rally && rl ? Math.max(.28, TUNE.rally.back * Math.pow(TUNE.rally.speedUp, rl.count)) : .45;
    p.vu = (to.u - p.u) / dur; p.vz = (to.z - p.z) / dur; p.vh = (to.h - p.h) / dur; p.gv = 0;
    R.events.deflects = (R.events.deflects || 0) + 1;
    const before = R.charge;
    R.charge = Math.min(TUNE.charges, R.charge + TUNE.deflectCharge); R.chargeFlash = .3; R.freeze = Math.max(R.freeze, .04);
    Snd.play('deflect', p.rally && rl ? rl.count : 0);
    popText(R.charge > before ? 'DEFLECT! +' + (R.charge - before) : 'DEFLECT!', PX(p.u, p.z), YH(p.z, p.h) - 6, '#7fd4ff');
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
            rl.count++; b.spit = .2;
            const dur = Math.max(TUNE.rally.fastest, TUNE.rally.serve * Math.pow(TUNE.rally.speedUp, rl.count));
            p.friendly = false; p.vu = (bull.u - p.u) / dur; p.vz = (bull.bz - p.z) / dur; p.vh = (.12 - p.h) / dur;
            Snd.play('volley', rl.count); popText('RALLY x' + rl.count, 120, BACK.y0 - 2, '#ffd44a');
            continue;
          }
          p.dead = true;
          if (p.rally && rl && b.st === 'fight') {
            // it misses: a smash, and the Shredder reels
            const dmg = TUNE.rally.smash + TUNE.rally.smashPer * rl.count;
            b.rally = null; b.jam = Math.max(b.jam, TUNE.rally.stun); R.shake = .5; R.events.smashes = (R.events.smashes || 0) + 1;
            bossDamage(dmg); Snd.play('smash');
            popText('SMASH! -' + dmg, 120, BACK.y0 - 2, '#ffd44a'); live('Smash! The Shredder misses the return.');
            for (let i = 0; i < 12; i++) R.fx.push({ k: 'bit', x: rr(BACK.x0 + 12, BACK.x1 - 12), y: BACK.y1 - 10, vx: rr(-40, 40), vy: rr(-70, -20), t: 0, dur: rr(.6, 1.1) });
          } else if (b.st === 'fight') { const dmg = p.kind === 'bundle' ? TUNE.bundleDmg : TUNE.stapleDmg; bossDamage(dmg); popText('-' + dmg, PX(p.u, .95), YH(.95, .3), '#ffd44a'); }
          poof(p.u, .97, p.h);
        }
        continue;
      }
      if (Math.abs(p.z - bull.bz) < .045 && Math.abs(p.u - bull.u) < .1 + p.w && overlaps(p.h, p.hh)) {
        if (hurtBull(1)) { p.dead = true; poof(p.u, p.z, p.h); if (p.rally) R.boss.rally = null; continue; }
      }
      if (p.z < bull.bz - .1 || p.z < ZN || p.h < -.05) { p.dead = true; if (p.rally) R.boss.rally = null; }
    }
    R.projs = R.projs.filter(p => !p.dead);
  }

  // ---------- Unruggabull ----------
  const keys = { kbLeft: false, kbRight: false, padLeft: false, padRight: false, kbShoot: false, padShoot: false };
  const input = { jump: 0, slash: 0, shoot: 0 };   // buffered presses, in seconds left
  const moveDir = () => ((keys.kbRight || keys.padRight) ? 1 : 0) - ((keys.kbLeft || keys.padLeft) ? 1 : 0);
  const shooting = () => keys.kbShoot || keys.padShoot;
  function press(k) { if (state !== 'play') return; if (k === 'jump' || k === 'slash' || k === 'shoot') input[k] = .12; }
  const onRunner = () => Math.abs(bull.u) < TUNE.runner && bull.jh < .03 && !bull.mouth && !bull.spat;
  function updateBull(dt) {
    const b = bull;
    input.jump = Math.max(0, input.jump - dt); input.slash = Math.max(0, input.slash - dt); input.shoot = Math.max(0, input.shoot - dt);
    b.inv = Math.max(0, b.inv - dt); b.cd = Math.max(0, b.cd - dt); b.aimT = Math.max(0, (b.aimT || 0) - dt);
    if (b.slash >= 0) { b.slash += dt; if (b.slash >= TUNE.slashT) b.slash = -1; }
    if (R.phase === 'dead') return;
    if (b.mouth > 0) { b.mouth -= dt; if (b.mouth <= 0) { b.mouth = 0; b.spat = .45; b.inv = Math.max(b.inv, 1.6); } return; }
    if (b.spat > 0) { b.spat = Math.max(0, b.spat - dt); b.bz = Math.max(0, b.bz - dt * 2); b.jh = Math.sin(b.spat / .45 * Math.PI) * .1; return; }
    const dir = R.phase === 'win' ? 0 : moveDir();
    b.u = clamp(b.u + dir * TUNE.move * dt, -TUNE.aisle, TUNE.aisle);
    if (input.jump > 0 && b.jh <= 0) { input.jump = 0; b.jv = JUMP_V; b.jh = .0001; Snd.play('jump'); }
    if (b.jh > 0) {
      b.jv -= GRAV * dt; b.jh += b.jv * dt;
      if (b.jh <= 0) { b.jh = 0; b.jv = 0; R.fx.push({ k: 'dust', x: PX(b.u, b.bz), y: FY(b.bz), s: sc(b.bz), t: 0, dur: .3 }); }
    }
    if (input.slash > 0 && b.cd <= 0) { input.slash = 0; slash(); }
    if (b.slash >= 0 && b.slash < TUNE.deflectWindow) slashHits();
    if (R.pull.st === 'on' && onRunner()) { b.bz += TUNE.pullSpeed * dt; if (b.bz >= TUNE.mouth) draggedIn(); }
    else b.bz = Math.max(0, b.bz - TUNE.recover * dt);
    if (R.speed > .02 || dir || (R.pull.st === 'on' && onRunner())) b.step += dt * 8;
    // the blaster: hold Shoot to keep firing, or tap for one shot
    R.fireT -= dt;
    if ((shooting() || input.shoot > 0) && R.fireT <= 0 && (R.phase === 'hall' || R.phase === 'boss' || R.phase === 'wake')) { input.shoot = 0; R.fireT = fire() ? TUNE.fireEvery : .25; }
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
    R.events.cuts = (R.events.cuts || 0) + 1;
    Snd.play('cut');
    popText('CUT!', PX(bull.u, bull.bz), YH(bull.bz, .3), '#ffd44a');
    if (R.boss.st === 'fight' && R.boss.ph === 3) jam();
  }
  // One shot (three with Spread Shot) for one charge. Out of charges: a click, a red flash, and a wait.
  function fire() {
    if (R.charge < 1) { R.empty = .2; Snd.play('empty'); return false; }
    R.charge--;
    if (R.charge < 1) { R.dry = true; Snd.play('drained'); popText('EMPTY', PX(bull.u, bull.bz), YH(bull.bz, bull.jh + .3), '#ff7050'); }
    bull.aimT = .22;
    let best = null, bz = Infinity;
    const consider = (o, at, cone) => { if (at.z > bull.bz + .05 && at.z < .97 && Math.abs(at.u - bull.u) < cone && at.z < bz) { best = o; bz = at.z; } };
    for (const cb of R.cubs) if (cb.temp && !cb.temp.dead && cb.temp.pop > .3) consider(cb.temp, posOf(cb.temp), TUNE.aimCone);
    for (const f of R.flies) consider(f, f, .3);
    // bolts leave the muzzle of the blaster he holds up beside his head
    const mu = bull.u + A.MUZZLE.x / HW, mh = bull.jh - A.MUZZLE.y / (FN - CN);
    const shot = du => R.shots.push({ u: mu, z: bull.bz + .03, h: mh, du, tgt: du ? null : best, dead: false, spread: !!du });
    shot(0);
    if (R.spread > 0) { shot(-.6); shot(.6); }
    R.events.shots = (R.events.shots || 0) + 1;
    const k = sc(bull.bz);
    R.fx.push({ k: 'muzzle', x: PX(bull.u, bull.bz) + A.MUZZLE.x * k, y: YH(bull.bz, bull.jh) + A.MUZZLE.y * k, t: 0, dur: .08 });
    Snd.play('shot', R.spread > 0);
    return true;
  }
  function sparks(u, z, h, col) { R.fx.push({ k: 'spark', x: PX(u, z), y: YH(z, h), s: Math.max(.5, sc(z)), col: col || '#ffd44a', t: 0, dur: .22, a: rnd() * 6 }); }
  function updateShots(dt) {
    for (const s of R.shots) {
      s.z += TUNE.shotSpeed * dt; s.u += (s.du || 0) * dt;
      if (s.tgt && !s.tgt.dead) {
        const at = posOf(s.tgt), k = Math.min(1, TUNE.shotSpeed * dt / Math.max(.04, at.z - s.z));
        s.u += (at.u - s.u) * k; s.h += (at.h - s.h) * k;
      }
      for (const cb of R.cubs) {
        const tp = cb.temp; if (!tp || tp.dead || tp.pop < .4) continue;
        const at = posOf(tp);
        if (Math.abs(s.u - at.u) < .09 && Math.abs(s.z - at.z) < .06) { s.dead = true; sparks(at.u, at.z, at.h); killTemp(tp, 'shot'); break; }
      }
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
        if (R.boss.st === 'fight' && Math.abs(s.u) < .8) { bossDamage(TUNE.shotDmg * (R.boss.jam > 0 ? TUNE.jamMult : R.boss.ph === 3 ? .5 : 1)); sparks(s.u, .96, s.h, R.boss.jam > 0 ? '#ffd44a' : '#fff6e2'); }
        else poof(s.u, .97, s.h, 3);
      }
    }
    R.shots = R.shots.filter(s => !s.dead && Math.abs(s.u) < 1.1);
  }
  function hurtBull(n) {
    if (bull.inv > 0 || bull.mouth > 0 || bull.spat > 0 || R.phase === 'dead' || R.phase === 'win') return false;
    R.hearts = Math.max(0, R.hearts - n); bull.inv = TUNE.hurtInv; R.shake = .2; R.red = .15;
    Snd.play('hurt');
    if (R.hearts <= 0) die();
    return true;
  }
  function draggedIn() {
    const b = bull;
    b.bz = TUNE.mouth; b.mouth = .8; b.slash = -1;
    R.hearts = Math.max(0, R.hearts - 2); R.shake = .35; R.boss.chomp = .8;
    R.events.dragged = (R.events.dragged || 0) + 1;
    endPull();
    Snd.play('chomp');
    for (let i = 0; i < 14; i++) R.fx.push({ k: 'bit', x: rr(BACK.x0 + 14, BACK.x1 - 14), y: BACK.y1 - 9, vx: rr(-30, 30), vy: rr(-60, -20), t: 0, dur: rr(.7, 1.2) });
    popText('PROCESSED!', 120, BACK.y0 - 2, '#ff7050');
    if (R.hearts <= 0) die();
  }

  // ---------- the runner rug ----------
  const pullDur = () => R.phase === 'hall' ? 2.2 : [0, 2.4, 3.2, 3.8][R.boss.ph];
  const pullGap = () => R.phase === 'hall' ? rr(9, 12) : [0, 8, 6.5, 5][R.boss.ph];
  function endPull() { const P = R.pull; if (P.st === 'idle') return; P.st = 'idle'; P.t = 0; P.next = R.t + pullGap(); if (R.banner && R.banner.pull) R.banner = null; }
  function updatePull(dt) {
    const P = R.pull;
    P.t += dt;
    const can = (R.phase === 'hall' && beat().pulls && !R.event) ||
      (R.phase === 'boss' && R.boss.st === 'fight' && R.boss.jam <= 0 && !R.boss.rally);
    if (P.st === 'idle') {
      if (can && R.t >= P.next) { P.st = 'warn'; P.t = 0; Snd.play('warn'); }
    } else if (!can && P.st !== 'cut') {
      endPull();
    } else if (P.st === 'warn') {
      if (P.t >= .9) {
        P.st = 'on'; P.t = 0; P.dur = pullDur(); P.count++; P.snd = 0;
        if (P.count === 1) { R.banner = { text: 'STEP OFF THE RUG', sub: 'OR SLASH TO CUT IT', t: 0, dur: 99, pull: true }; live('The runner rug is pulling you toward the shredder. Step off it, or slash to cut the rug.'); }
        else if (R.phase === 'boss' && R.boss.ph === 3 && !R.events.jamHint && !R.talk) { R.events.jamHint = true; R.banner = { text: 'CUT THE RUG', sub: 'TO JAM THE SHREDDER', t: 0, dur: 99, pull: true }; live('Cut the rug to jam the shredder.'); }
      }
    } else if (P.st === 'on') {
      P.snd -= dt;
      if (P.snd <= 0) { Snd.play('pull'); P.snd = .45; }
      if (P.t >= P.dur) endPull();
    } else if (P.st === 'cut') {
      if (P.t >= .7) endPull();
    }
    R.roff -= R.speed * dt;
    if (P.st === 'on') R.roff += TUNE.pullSpeed * dt * 1.4;
    if (R.cut) { R.cut.t += dt; R.cut.z -= R.speed * dt; if (R.cut.t > 1.2) R.cut = null; }
  }

  // ---------- the Shredder ----------
  function startWake() {
    R.phase = 'wake'; R.phaseT = 0; R.noPops = true;
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
    Snd.music('shred');
  }
  function spitBundle() {
    const b = R.boss, dur = b.ph === 1 ? 1.9 : 1.6;
    launch('bundle', { u: rr(-.1, .1), z: .95, h: .1 }, { u: bull.u, z: bull.bz, h: .12 }, dur, { w: .08, hh: .05 });
    b.spit = .25; Snd.play('spit');
  }
  // Phase 3's rally: a gold bundle the Shredder keeps batting back, quicker each time, until it misses.
  function serveRally() {
    const b = R.boss;
    b.rally = { count: 0, target: 3 + Math.floor(rnd() * 3) };
    launch('bundle', { u: rr(-.1, .1), z: .95, h: .1 }, { u: bull.u, z: bull.bz, h: .12 }, TUNE.rally.serve, { w: .09, hh: .06, rally: true });
    b.spit = .25; Snd.play('spit');
    if (!R.events.rallyHint) { R.events.rallyHint = true; talk('RETURN TO SENDER.', 'shredder'); R.banner = { text: 'RALLY!', sub: 'KEEP KNOCKING IT BACK', t: 0, dur: 2.4, pull: true }; live('Rally! Keep knocking the gold bundle back until the Shredder misses.'); }
  }
  function spitFan() {
    const gap = Math.floor(rnd() * 5);
    [-.5, -.25, 0, .25, .5].forEach((o, i) => {
      if (i === gap) return;
      launch('staple', { u: rr(-.08, .08), z: .95, h: .03 }, { u: clamp(bull.u + o, -.8, .8), z: bull.bz, h: .03 }, 1.6, { w: .06, hh: .03 });
    });
    R.boss.spit = .25; Snd.play('spit');
  }
  function jam() {
    const b = R.boss;
    b.jam = TUNE.jamT; endPull();
    R.events.jams = (R.events.jams || 0) + 1;
    Snd.play('jam');
    popText('JAMMED! x3', 120, BACK.y0 - 2, '#ffd44a');
  }
  function bossDamage(n) {
    const b = R.boss;
    if (b.st !== 'fight') return;
    b.hp = Math.max(0, b.hp - n);
    if (n >= 2) b.flash = .07; else b.tick = .05;   // blaster hits only flicker the trim, so steady fire doesn't strobe
    if (b.hitSnd <= 0) { Snd.play('bosshit'); b.hitSnd = .09; }
    if (b.hp <= 0) defeat();
  }
  function updateBoss(dt) {
    const b = R.boss;
    b.flash = Math.max(0, b.flash - dt); b.tick = Math.max(0, (b.tick || 0) - dt); b.spit = Math.max(0, b.spit - dt); b.chomp = Math.max(0, b.chomp - dt); b.hitSnd -= dt;
    if (b.st !== 'fight') return;
    const ph = b.hp > 66 ? 1 : b.hp > 33 ? 2 : 3;
    if (ph !== b.ph) {
      b.ph = ph; b.atk = 1.6;
      if (R.hearts < TUNE.hearts) addPickup('coffee', .45, rr(-.4, .4));
      talk(ph === 2 ? 'STAPLES. FOR YOUR RECORDS.' : 'WARNING: PAPER JAM IN TRAY 2.', 'shredder');
    }
    if (b.jam > 0) {
      b.jam -= dt;
      if (rnd() < dt * 8) R.fx.push({ k: 'smoke', x: rr(BACK.x0 + 10, BACK.x1 - 10), y: BACK.y0 + 4, t: 0, dur: 1 });
      return;
    }
    if (R.pull.st === 'warn' || (ph === 1 && R.pull.st === 'on') || b.rally) return;
    b.atk -= dt;
    if (b.atk <= 0) {
      if (ph === 1) { spitBundle(); b.atk = 2.3; }
      else if (ph === 2) { if (b.atkN++ % 2) spitBundle(); else spitFan(); b.atk = 2.1; }
      else { if (b.atkN++ % 2) spitFan(); else serveRally(); b.atk = 1.8; }
    }
  }
  function defeat() {
    const b = R.boss;
    b.st = 'dead'; R.phase = 'win'; R.phaseT = 0; R.endT = R.t;
    endPull();
    for (const p of R.projs) { p.dead = true; poof(p.u, p.z, p.h); }
    for (const f of R.flies) { f.dead = true; poof(f.u, f.z, f.h); }
    R.banner = null; R.shake = .6;
    Snd.music(null); Snd.play('explode');
    talk('RUG NOT FOUND.', 'shredder');
  }

  // ---------- souls, effects and words ----------
  // Each soul in a quick streak rings a step higher.
  function free(x, y) {
    R.souls++;
    R.streak = R.streakT > 0 ? R.streak + 1 : 0; R.streakT = 1.6;
    R.fx.push({ k: 'wisp', x, y, t: 0, dur: 1.6, dx: rr(-8, 8) });
    Snd.play('soul', R.streak);
  }
  function killTemp(tp, how) {
    if (tp.dead) return;
    tp.dead = true; R.freeze = .045;
    if (R.hearts < TUNE.hearts && rnd() < TUNE.coffeeDrop) addPickup('coffee', tp.cub.w - R.dist + .06, tp.cub.s * .5);
    const at = posOf(tp), x = PX(at.u, at.z), y = YH(at.z, at.h), s = sc(at.z) * .85;
    if (how === 'slash') R.fx.push({ k: 'half', x, y, s, t: 0, dur: .5, img: A.TEMP }); else poof(at.u, at.z, at.h);
    free(x, y - 4);
    if (how === 'deflect' && R.event && R.event.kind === 'audit') { free(x + 4, y - 2); popText('x2', x, y - 12, '#ffd44a'); }
  }
  function killFly(f, how) {
    if (f.dead) return;
    f.dead = true; R.freeze = how === 'slash' ? .07 : .035;
    const x = PX(f.u, f.z), y = YH(f.z, f.h), s = sc(f.z);
    if (how === 'slash') R.fx.push({ k: 'half', x, y, s, t: 0, dur: .5, img: A.CARPF[0] }); else poof(f.u, f.z, f.h);
    free(x, y - 4);
  }
  function poof(u, z, h, n = 6) { R.fx.push({ k: 'poof', x: PX(u, z), y: YH(z, h), s: Math.max(.4, sc(z)), n, t: 0, dur: .35 }); }
  function popText(text, x, y, col) { R.fx.push({ k: 'pop', text, x, y, col, t: 0, dur: .8 }); }
  function updateFx(dt) {
    for (const f of R.fx) {
      f.t += dt;
      if (f.k === 'wisp') { f.y -= 24 * dt; f.x += Math.sin(f.t * 5) * 6 * dt + f.dx * dt; }
      else if (f.k === 'pop') f.y -= 12 * dt;
      else if (f.k === 'bit') { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 90 * dt; }
      else if (f.k === 'smoke') { f.y -= 14 * dt; f.x += Math.sin(f.t * 4) * 4 * dt; }
    }
    R.fx = R.fx.filter(f => f.t < f.dur);
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
      return;
    }
    if (state !== 'play') return;
    // hit-stop: a few frames' pause when something dies, so kills land
    if (R.freeze > 0) { R.freeze -= dt; return; }
    R.t += dt; R.phaseT += dt;
    R.streakT -= dt; R.empty = Math.max(0, R.empty - dt); R.chargeFlash = Math.max(0, (R.chargeFlash || 0) - dt); R.spread = Math.max(0, R.spread - dt);
    if (R.charge < TUNE.charges) { R.rechargeT += dt; while (R.rechargeT >= TUNE.recharge && R.charge < TUNE.charges) { R.rechargeT -= TUNE.recharge; R.charge++; } }
    else { R.rechargeT = 0; if (R.dry) { R.dry = false; Snd.play('ready'); } }
    R.shake = Math.max(0, R.shake - dt); R.red = Math.max(0, R.red - dt);
    if (R.banner) { R.banner.t += dt; if (R.banner.t > R.banner.dur) R.banner = R.banner.then || null; }
    if (R.talk) { R.talk.t += dt; if (R.talk.t > R.talk.total) R.talk = null; }
    R.dist += R.speed * dt;
    if (R.phase === 'hall') updateHall(dt);
    updateBull(dt);
    updatePull(dt);
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
      if (R.phaseT > 1.4 && b.st === 'sleep') { b.st = 'awake'; R.shake = .3; Snd.play('wake'); }
      if (R.phaseT > 2 && !R.events.bossAt) R.events.bossAt = R.phaseT + talk('YOUR RUG HAS BEEN PROCESSED.', 'shredder') + .3;
      if (R.events.bossAt && R.phaseT > R.events.bossAt) startBoss();
    } else if (R.phase === 'win') {
      // the souls inside come out one at a time, then the card
      if (R.phaseT < 1.5 && rnd() < dt * 14) R.fx.push({ k: 'bit', x: rr(BACK.x0 + 6, BACK.x1 - 6), y: rr(BACK.y0 + 6, BACK.y1 - 6), vx: rr(-50, 50), vy: rr(-70, -10), t: 0, dur: rr(.8, 1.4) });
      const due = Math.min(TUNE.bossSouls, Math.floor(Math.max(0, R.phaseT - .8) / .1));
      while (b.freed < due) { b.freed++; free(rr(BACK.x0 + 10, BACK.x1 - 10), BACK.y1 - 8); }
      if (R.phaseT > 2.1 && !R.events.clearBanner) {
        R.events.clearBanner = true;
        R.banner = { text: 'FLOOR 13 CLEAR', sub: 'SOULS FREED: ' + R.souls, t: 0, dur: 99 };
        Snd.play('clear'); live('Floor 13 clear.');
      }
      if (R.banner && R.events.clearBanner) R.banner.sub = 'SOULS FREED: ' + R.souls;
      if (R.phaseT > 4.4) endRun('clear');
    } else if (R.phase === 'dead') {
      if (R.phaseT > 1.9) endRun('rugged');
    }
  }
  function die() {
    R.phase = 'dead'; R.phaseT = 0; R.hearts = 0;
    endPull();
    R.banner = { text: 'RUGGED.', t: 0, dur: 99, col: '#ff7050' };
    Snd.music(null); Snd.play('over');
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
    const P = R.pull, edge = P.st === 'warn' ? (Math.floor(P.t * 10) % 2 ? '#fff6e2' : '#ffd44a') : P.st === 'on' ? '#ff9628' : '#c9962e';
    quadF(g, '#7a1d1a', -TUNE.runner, TUNE.runner, ZN, 1);
    for (let k = 0; k < 10; k++) { const z = mod1(k / 10 + R.roff); rect(g, PX(-.26, z), FY(z) - 1, PX(.26, z) - PX(-.26, z), Math.max(1, Math.round(2 * sc(z))), '#5a1412'); }
    quadF(g, edge, -TUNE.runner, -TUNE.runner + .04, ZN, 1); quadF(g, edge, TUNE.runner - .04, TUNE.runner, ZN, 1);
    if (R.cut && R.cut.z > 0) {
      const z = R.cut.z, y = FY(z), x0 = PX(-TUNE.runner, z), x1 = PX(TUNE.runner, z);
      for (let x = Math.round(x0); x < x1; x++) rect(g, x, y - 1 + ((x * 7) % 3), 1, 2, '#28304a');
    }
  }
  function drawShredder() {
    const b = R.boss, x0 = BACK.x0, x1 = BACK.x1, y0 = BACK.y0, y1 = BACK.y1, w = x1 - x0, t = R.t;
    const awake = b.st === 'awake' || b.st === 'fight', dead = b.st === 'dead';
    const body = b.flash > 0 ? '#d8dce8' : dead ? '#3a3a44' : '#4a4e5a';
    rect(g, x0 + 4, y0 + 3, w - 8, y1 - y0 - 3, body);
    rect(g, x0 + 4, y0 + 3, w - 8, 2, b.flash > 0 || b.tick > 0 ? '#ffffff' : '#6a6e7c');
    if (b.tick > 0) { rect(g, x0 + 4, y0 + 3, 1, y1 - y0 - 3, '#ffffff'); rect(g, x1 - 5, y0 + 3, 1, y1 - y0 - 3, '#ffffff'); }
    rect(g, x0 + 7, y0 + 25, w - 14, 1, '#3a3e48');
    rect(g, x0 + 9, y0 + 21, 6, 2, '#8a8e9c'); rect(g, x1 - 15, y0 + 21, 6, 2, '#8a8e9c');
    rect(g, 104, y0 + 6, 32, 9, '#1a1418'); txt(g, 'SHRED-O', 120, y0 + 8, '#ffd44a', 1, 'center');
    // eyes
    const ey = y0 + 17;
    if (b.jam > 0 || dead) {
      for (const ex of [106, 127]) { line(g, ex, ey - 1, ex + 5, ey + 3, '#ffd44a'); line(g, ex, ey + 3, ex + 5, ey - 1, '#ffd44a'); }
    } else if (awake || b.chomp > 0) {
      const lit = b.chomp > 0 || Math.floor(t * 3) % 2 ? '#ff5040' : '#a02018';
      rect(g, 106, ey, 7, 3, lit); rect(g, 127, ey, 7, 3, lit);
      rect(g, 105, ey - 2, 8, 1, '#1a1418'); rect(g, 127, ey - 2, 8, 1, '#1a1418');
    } else {
      rect(g, 106, ey + 1, 7, 1, '#22222a'); rect(g, 127, ey + 1, 7, 1, '#22222a');
    }
    if (b.ph >= 2 && b.st === 'fight') { line(g, x0 + 8, y0 + 6, x0 + 13, y0 + 12, '#2a2a32'); line(g, x0 + 13, y0 + 12, x0 + 11, y0 + 17, '#2a2a32'); }
    if (b.ph >= 3 && b.st === 'fight' && Math.floor(t * 9) % 4 === 0) { rect(g, x1 - 12, y0 + 9, 1, 1, '#ffd44a'); rect(g, x1 - 10, y0 + 7, 1, 1, '#fff6e2'); }
    // the mouth, fed by the runner
    const my = y1 - 13, open = b.spit > 0 ? 2 : 0;
    rect(g, x0 + 10, my - open, w - 20, 9 + open, '#09070b');
    if (b.spit > 0) rect(g, x0 + 12, my + 2, w - 24, 4, '#3a1010');
    const fast = b.chomp > 0 || R.pull.st === 'on', moving = (awake && b.jam <= 0) || b.chomp > 0;
    const ch = moving ? Math.floor(t * (fast ? 24 : 10)) % 2 : 0;
    for (let x = x0 + 11; x < x1 - 12; x += 4) { rect(g, x, my - open, 2, 3 + ch, '#d8dde8'); rect(g, x + 2, my + 6 - ch, 2, 3 + ch, '#d8dde8'); }
    rect(g, PX(-TUNE.runner, 1), my + 9, PX(TUNE.runner, 1) - PX(-TUNE.runner, 1), 4, '#5a1412');
    if (b.st === 'sleep') for (let i = 0; i < 3; i++) { const k = mod1(t * .4 + i / 3); txt(g, 'Z', x1 - 8 + Math.round(Math.sin(k * 6) * 2), Math.round(y0 + 2 - k * 16), k > .8 ? '#5a5670' : '#a8a0c0'); }
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
      rect(g, mx - mw / 2, my - mh, mw, mh, '#1a1418'); rect(g, mx - mw / 2 + 1, my - mh + 1, Math.max(1, mw - 2), Math.max(1, mh - 2), '#5ac08a');
    }
  }
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
    // drawn at 1x so the 3x5 lettering stays crisp, hung high so it passes over the action
    const w = sg.img.width, h = sg.img.height, y = YH(z, .93);
    line(g, 120 - w * .35, CY(z), 120 - w * .35, y, '#4c4856'); line(g, 120 + w * .35, CY(z), 120 + w * .35, y, '#4c4856');
    g.drawImage(sg.img, Math.round(120 - w / 2), Math.round(y), w, h);
  }
  function drawTemp(tp, zt) {
    const s = sc(zt) * .85, w = Math.max(2, Math.round(26 * s)), h = Math.max(2, Math.round(15 * s));
    const x = Math.round(PX(tp.cub.s * .8, zt) - w / 2), yb = YH(zt, tp.cub.top - .12 + tp.pop * .17);
    g.drawImage(A.TEMP, x, Math.round(yb - h), w, h);
    if (tp.st === 'up' && tp.t > .25 && !tp.threw) g.drawImage(A.WAD, Math.round(x + w * .75), Math.round(yb - h - 4 * s), Math.max(2, Math.round(5 * s)), Math.max(2, Math.round(5 * s)));
  }
  function drawBox(bx, z) {
    const s = sc(z), w = Math.max(3, Math.round(A.BOX.width * s)), h = Math.max(2, Math.round(A.BOX.height * s));
    const x = PX(bx.u, z), y = FY(z) - (bx.hit ? Math.sin(bx.hit * 9) * 6 * s : 0);
    if (bx.hit) { g.save(); g.globalAlpha = 1 - bx.hit * 2; }
    g.drawImage(A.BOX, Math.round(x - w / 2), Math.round(y - h), w, h);
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
  // Incoming paper glows red and throws a red shadow on the floor, so you can see where it will land.
  function drawProj(p) {
    const s = sc(p.z), img = p.kind === 'wad' ? A.WAD : p.kind === 'bundle' ? A.BUNDLE : A.STAPLE, big = p.friendly ? 1 : 1.35;
    const w = Math.max(2, Math.round(img.width * s * big)), h = Math.max(1, Math.round(img.height * s * big)), x = PX(p.u, p.z), y = YH(p.z, p.h);
    if (!p.friendly) {
      const ks = Math.max(1, sc(p.z));
      rect(g, PX(p.u, p.z) - 5 * ks, FY(p.z) - 1, 10 * ks, Math.max(1, Math.round(2 * ks)), Math.floor(R.t * 8) % 2 ? '#d63428' : '#961e16');
      disc(g, x, y, Math.max(2, Math.round(Math.max(w, h) * .75)), Math.floor(R.t * 10 + p.spin) % 2 ? 'rgba(255,80,64,.55)' : 'rgba(255,150,40,.4)');
    } else shadow(p.u, p.z, img.width * .8);
    if (p.rally) disc(g, x, y, Math.max(3, Math.round(Math.max(w, h) * .8)), Math.floor(R.t * 12) % 2 ? 'rgba(255,212,74,.7)' : 'rgba(255,240,170,.5)');
    g.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    if (p.friendly) { const k = Math.floor(p.spin) % 2; rect(g, x - w / 2 - 1 - k, y - 1, 1, 1, '#bfefff'); rect(g, x + w / 2 + k, y, 1, 1, '#bfefff'); }
  }
  // A blaster bolt: a long two-tone tail, a flickering glow ring and a white-hot core. Spread bolts are gold.
  function drawShot(s) {
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
      const w = Math.max(3, Math.round(A.CHAIR.width * k)), h = Math.max(3, Math.round(A.CHAIR.height * k));
      for (const u of [-.52, -.26, 0, .26, .52]) {
        const x = PX(u, z) + (row.hit ? Math.sin(u * 9 + row.hit * 8) * 6 : 0);
        shadow(u, z, 12);
        g.drawImage(A.CHAIR, Math.round(x - w / 2), Math.round(FY(z) - h - drop * .2), w, h);
      }
    } else {
      // a sheet of paper skidding along the floor, wall to wall, with a fold that flaps
      const flap = Math.floor(R.t * 10) % 2 ? .05 : .035;
      quadF(g, '#b8b4a8', -.66, .66, z, z + .03, 0);
      quadF(g, '#f2eee2', -.66, .66, z, z + .025, flap);
      for (const u of [-.4, 0, .4]) rect(g, PX(u, z) - 3 * k, YH(z, flap) - 1, 6 * k, 1, '#7c8494');
    }
    if (row.hit) g.restore();
  }
  function drawPickup(pk, z) {
    const k = sc(z), img = pk.kind === 'coffee' ? A.COFFEE : A.SPREAD, bob = Math.sin(pk.t * 4) * .015;
    const w = Math.max(3, Math.round(img.width * k * 1.2)), h = Math.max(3, Math.round(img.height * k * 1.2)), x = PX(pk.u, z), y = YH(z, pk.h + bob);
    shadow(pk.u, z, 10);
    disc(g, x, y, Math.round(7 * k), pk.kind === 'coffee' ? 'rgba(255,112,80,.25)' : 'rgba(255,212,74,.25)');
    g.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    if (Math.floor(pk.t * 6) % 3 === 0) rect(g, x + w / 2, y - h / 2, 1, 1, '#ffffff');
  }
  function drawBull() {
    const b = bull;
    if (b.mouth > 0) return;
    const s = sc(b.bz), x = PX(b.u, b.bz), feet = YH(b.bz, b.jh);
    shadow(b.u, b.bz, 14);
    if (b.inv > 0 && R.phase !== 'win' && Math.floor(b.inv * 12) % 2) return;
    // He swings his arms as he runs, throws them up to jump, raises the blaster to shoot (with a kick) and swings the katana.
    const P = A.POSES, air = b.jh > 0 || b.spat > 0, aim = b.aimT > 0, kick = b.aimT > .16;
    const running = R.phase !== 'dead' && (R.speed > .02 || moveDir() || (R.pull.st === 'on' && onRunner())), stride = Math.floor(b.step) % 2;
    let p = P.stand;
    if (b.slash >= 0) p = b.slash < .07 ? (air ? P.jumpWind : P.wind) : (air ? P.jumpCut : P.cut);
    else if (b.inv > TUNE.hurtInv - .3 && R.phase !== 'win') p = P.hurt;
    else if (air) p = aim ? P.jumpAim : P.jump;
    else if (aim) p = kick ? P.kick : running ? (stride ? P.runAimA : P.runAimB) : P.aim;
    else if (running) p = stride ? P.runA : P.runB;
    if (R.phase === 'dead') { g.save(); g.globalAlpha = Math.max(0, 1 - R.phaseT / 1.6); }
    const sink = R.phase === 'dead' ? Math.min(10, R.phaseT * 8) : 0;
    g.drawImage(p, Math.round(x - A.POSE_W / 2 * s), Math.round(feet - 38 * s + sink), Math.round(A.POSE_W * s), Math.round(A.POSE_H * s));
    if (R.phase === 'dead') g.restore();
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
      if (f.k === 'wisp') { g.save(); g.globalAlpha = k > .7 ? (1 - k) / .3 * .85 : .85; g.drawImage(A.GHOST, Math.round(f.x - 4), Math.round(f.y - 4)); g.restore(); }
      else if (f.k === 'poof') { for (let i = 0; i < f.n; i++) { const a = i / f.n * 6.28 + f.x, r = 2 + k * 9 * f.s; rect(g, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r * .7, Math.max(1, Math.round(2 * f.s)), Math.max(1, Math.round(2 * f.s)), k < .5 ? '#fff6e2' : '#b8b4a8'); } }
      else if (f.k === 'half') {
        const img = f.img, w = img.width * f.s, h = img.height * f.s, d = 4 + k * 14 * f.s, drop = k * k * 26;
        g.save(); g.globalAlpha = 1 - k * .6;
        g.drawImage(img, 0, 0, img.width / 2, img.height, Math.round(f.x - w / 2 - d), Math.round(f.y - h / 2 + drop), Math.round(w / 2), Math.round(h));
        g.drawImage(img, img.width / 2, 0, img.width / 2, img.height, Math.round(f.x + d), Math.round(f.y - h / 2 + drop * .8), Math.round(w / 2), Math.round(h));
        g.restore();
      } else if (f.k === 'pop') otxt(g, f.text, f.x, Math.round(f.y), f.col, 1, 'center');
      else if (f.k === 'bit') rect(g, f.x, f.y, 2, 1, (Math.floor(f.t * 10) + f.vx) % 2 > 0 ? '#fff6e2' : '#b8b4a8');
      else if (f.k === 'smoke') disc(g, f.x, f.y, 1 + Math.round(k * 4), k < .5 ? '#6a6878' : '#4a4858');
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
    if (R.phase === 'hall') {
      // the goal: free enough souls and the Shredder wakes
      const k = Math.min(1, R.souls / TUNE.goal), full = k >= 1 && Math.floor(R.t * 6) % 2;
      g.drawImage(A.GHOST, 74, 3);
      rect(g, 86, 4, 64, 7, '#1a1418'); rect(g, 87, 5, 62, 5, '#3a2f5e'); rect(g, 87, 5, Math.round(62 * k), 5, full ? '#ffd44a' : '#7fd4ff');
      otxt(g, R.souls + '/' + TUNE.goal, 154, 5, '#fff6e2');
    } else {
      const n = String(R.souls), tw = textWidth(n);
      g.drawImage(A.GHOST, W - 4 - tw - 12, 3);
      otxt(g, n, W - 4, 5, '#fff6e2', 1, 'right');
    }
    const b = R.boss;
    if (b.st === 'fight' || (b.st === 'dead' && R.phaseT < 1.2)) {
      otxt(g, 'SHRED-O', 86, 5, '#ffd44a', 1, 'right');
      rect(g, 89, 4, 74, 7, '#1a1418'); rect(g, 90, 5, 72, 5, '#3a2f5e');
      rect(g, 90, 5, Math.round(72 * b.hp / TUNE.bossHP), 5, b.jam > 0 ? '#ffd44a' : b.flash > 0 ? '#ffffff' : '#e2483a');
      rect(g, 90 + Math.round(72 * .66), 5, 1, 5, '#1a1418'); rect(g, 90 + Math.round(72 * .33), 5, 1, 5, '#1a1418');
    }
  }
  function drawWords() {
    // Big moments sit across the Shredder's mouth; prompts during play sit up top, clear of the action.
    const B = R.banner;
    if (B) {
      const y = B.pull ? 15 : 58;
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
  // How dark the hall is during the lights-out event: it flickers off, stays dark, then flickers back.
  function darkness() {
    const E = R.event;
    if (!E || E.kind !== 'dark') return 0;
    if (E.t < .5) return Math.floor(E.t * 14) % 2 ? .82 : .25;
    if (E.t > E.dur - .6) return Math.floor(E.t * 14) % 2 ? .82 : .3;
    return .82;
  }
  // In the dark only glowing things show: monitors, carpshit eyes, blaster bolts, and you, faintly.
  function drawGlows() {
    for (const cb of R.cubs) {
      const z = cubZ(cb); if (z > 1.02 || cb.kind !== 'cub') continue;
      const k = sc(z), mx = PX(cb.s * .93, z), my = YH(z, cb.top), mw = Math.max(2, Math.round(10 * k)), mh = Math.max(2, Math.round(7 * k));
      rect(g, mx - mw / 2 + 1, my - mh + 1, Math.max(1, mw - 2), Math.max(1, mh - 2), '#5ac08a');
    }
    for (const f of R.flies) {
      const k = sc(f.z), w = 26 * k, x = PX(f.u, f.z), y = YH(f.z, f.h), e = Math.max(1, Math.round(2 * k));
      rect(g, x - w * .23, y - 1, e, e, '#fff0aa'); rect(g, x + w * .19, y - 1, e, e, '#fff0aa');
    }
    for (const sh of R.shots) drawShot(sh);
    g.save(); g.globalAlpha = .45; drawBull(); for (const p of R.projs) drawProj(p); g.restore();
  }
  function draw() {
    if (state === 'title' || state === 'intro') { g.setTransform(1, 0, 0, 1, 0, 0); drawTitle(); return; }
    const sh = R.shake > 0 ? Math.round((rnd() - .5) * 6 * Math.min(1, R.shake * 4)) : 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    rect(g, 0, 0, W, H, '#09070b');
    g.setTransform(1, 0, 0, 1, sh, sh ? Math.round((rnd() - .5) * 4) : 0);
    drawHall();
    drawShredder();
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
    if (dk) { g.save(); g.globalAlpha = dk; rect(g, -4, -4, W + 8, H + 8, '#05040a'); g.restore(); if (dk > .5) drawGlows(); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (R.red > 0) { g.save(); g.globalAlpha = R.red * 1.6; rect(g, 0, 0, W, H, '#d63428'); g.restore(); }
    drawHUD(); drawWords();
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
    } else if (kind === 'pause') {
      cardTitle.textContent = 'Paused';
      cardText.textContent = 'The Shredder will wait. It has nowhere else to be.';
      goBtn.textContent = 'Resume'; altBtn.textContent = 'Restart floor'; altBtn.hidden = false;
    } else if (kind === 'clear') {
      cardTitle.textContent = 'Floor 13 clear';
      cardText.textContent = extra.newBest ? 'New best! The Unrugged drift up toward the roof.' : 'The Unrugged drift up toward the roof.';
      rows.push(['Souls freed', String(R.souls)], ['Time', clock(R.endT)], ['Best', best.souls + ' souls']);
      goBtn.textContent = 'Play again';
      cardNote.textContent = 'The elevator to floor 42 comes in a later build.'; cardNote.hidden = false;
    } else if (kind === 'rugged') {
      cardTitle.textContent = 'Rugged.';
      cardText.textContent = 'Continue? The floor starts over.';
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
    newRun();
    setState('play');
    card.hidden = true;
    R.banner = { text: 'FLOOR 13', sub: 'ACCOUNTING', t: 0, dur: 2.2, then: { text: 'FREE ' + TUNE.goal + ' SOULS', sub: 'TO WAKE THE SHREDDER', t: 0, dur: 2.6 } };
    live('Floor 13, Accounting. Free ' + TUNE.goal + ' souls to wake the Shredder.');
    Snd.play('start'); Snd.music('tower');
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
    setState('over');
    const newBest = R.souls > best.souls;
    best.souls = Math.max(best.souls, R.souls);
    if (kind === 'clear') best.time = best.time ? Math.min(best.time, R.endT) : R.endT;
    try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (e) {}
    showCard(kind, { newBest });
    goBtn.focus({ preventScroll: true });
  }
  goBtn.addEventListener('click', () => {
    if (cardKind === 'pause') { resumeGame(); return; }
    goFull();
    if (cardKind === 'title' && !storySeen()) startIntro(); else startRun();
  });
  altBtn.addEventListener('click', () => {
    if (cardKind === 'pause') { Snd.resume(); startRun(); }
    else if (cardKind === 'title') { goFull(); startIntro(); }
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
    ShiftLeft: 'shoot', ShiftRight: 'shoot', Quote: 'shoot', KeyJ: 'shoot', KeyZ: 'shoot',
    Enter: 'slash', NumpadEnter: 'slash', KeyK: 'slash', KeyX: 'slash'
  };
  const NAMES = {
    ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right',
    ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
    Shift: 'shoot', "'": 'shoot', '"': 'shoot', j: 'shoot', J: 'shoot', z: 'shoot', Z: 'shoot',
    k: 'slash', K: 'slash', x: 'slash', X: 'slash', Enter: 'slash'
  };
  const KEYS = { get: e => CODES[e.code] || NAMES[e.key] };
  function clearHeld() { keys.kbLeft = keys.kbRight = keys.kbShoot = keys.padLeft = keys.padRight = keys.padShoot = false; padPointers.clear(); padSync(); }
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = KEYS.get(e);
    if (state === 'play' && k) {
      e.preventDefault();
      if (k === 'left') keys.kbLeft = true; else if (k === 'right') keys.kbRight = true;
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
  addEventListener('keyup', e => { const k = KEYS.get(e); if (k === 'left') keys.kbLeft = false; else if (k === 'right') keys.kbRight = false; else if (k === 'shoot') keys.kbShoot = false; });
  addEventListener('blur', () => { keys.kbLeft = keys.kbRight = keys.kbShoot = false; });

  // Touch pads: a D-pad on the left (jump is the up arrow) and Shoot and Slash on the right. Each finger is tracked,
  // so a thumb can slide between pads; jump, slash and shoot act as a finger lands on them, and Shoot keeps firing while held.
  const pads = $('pads'), padPointers = new Map();
  function padAt(x, y) { const el = document.elementFromPoint(x, y), p = el && el.closest && el.closest('.pad'); return p && pads.contains(p) ? p.dataset.k : null; }
  function padSync() {
    const held = new Set(padPointers.values());
    keys.padLeft = held.has('left'); keys.padRight = held.has('right'); keys.padShoot = held.has('shoot');
    for (const p of pads.querySelectorAll('.pad')) p.classList.toggle('on', held.has(p.dataset.k));
  }
  pads.addEventListener('pointerdown', e => {
    const k = padAt(e.clientX, e.clientY);
    if (!k) return;
    e.preventDefault();
    try { pads.setPointerCapture(e.pointerId); } catch (_) {}
    padPointers.set(e.pointerId, k);
    if (k === 'jump' || k === 'slash' || k === 'shoot') press(k);
    padSync();
  });
  pads.addEventListener('pointermove', e => {
    if (!padPointers.has(e.pointerId)) return;
    const k = padAt(e.clientX, e.clientY);
    if (k === padPointers.get(e.pointerId)) return;
    padPointers.set(e.pointerId, k);
    if (k === 'jump' || k === 'slash' || k === 'shoot') press(k);
    padSync();
  });
  const lift = e => { if (padPointers.delete(e.pointerId)) padSync(); };
  pads.addEventListener('pointerup', lift); pads.addEventListener('pointercancel', lift);
  pads.addEventListener('contextmenu', e => e.preventDefault());
  const markTouch = () => document.body.classList.add('touch');
  if (window.matchMedia && matchMedia('(pointer: coarse)').matches) markTouch();
  addEventListener('pointerdown', e => { if (e.pointerType === 'touch') markTouch(); }, { capture: true, passive: true });

  // ---------- loop ----------
  let last = 0;
  function frame(now) {
    const dt = last ? Math.min(.05, Math.max(0, (now - last) / 1000)) : 0;
    last = now;
    update(dt); draw();
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
