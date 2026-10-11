// Unruggabull II: Floor 13, Accounting, and its boss, the Shredder. Classic script; load after art.js and audio.js
// and before game.js, which calls UnrugFloor13(core) once with the pieces the floors share and gets back the floor's
// hooks (listed at the bottom). The core hands over R and bull at each fresh run (newRun).
//
// The floor: a hall in three beats (Accounts Payable, All Staff, the Copy Room) with moving day and lights out between
// them; temps behind their stations throwing paper; rows and boxes to jump; the runner rug that pulls you toward the
// far end; the far wall that wakes up as the Shredder; its fight; and the souls' hint.
var UnrugFloor13 = function (core) {
  'use strict';
  const {
    A, Snd, rect, line, disc, poly, txt, otxt, textWidth, W, H, VX,
    HY, ZN, sc, PX, FY, CY, YH, BACK, mod1, clamp, quadF, TUNE,
    rnd, rr, fxr, emit, addPickup, overlaps, moveDir, shooting, onRunner, updateBull, updatePickups, updateFlies,
    updateShots, updateFx, muzzleXY, sparks, hurtBull, die, endRun, free, bonusSoul, killFly, poof, popText,
    bark, talk, live, duckHint, shadow, tinted, drawBull, drawFly, drawPickup, drawShot, drawFx, drawWisp,
    drawBig, drawSoulsCounter, world, WZ,
    setCheckpoint
  } = core;
  let R = null, bull = null;
  let g = core.g;   // where drawing goes: set by the core (use), and swapped for an offscreen canvas while the Shredder draws
  const lin = UnrugRender.lin;

  // The hall comes in three beats, each with its own sign, props and trouble. The first two last `time` seconds
  // and end with an event; the last wakes the Shredder once you reach the goal (after `minT`, or at `max` regardless).
  const BEATS = [
    { sign: 'ACCOUNTS PAYABLE', time: 26, station: 'cub', temps: .6, fly: 3.8, boxes: true, decor: ['poster', 'poster', 'clock', 'window', 'plant', 'door', 'cooler'], rail: '#3a5a8a', music: 'tower', after: 'move' },
    { sign: 'ALL STAFF', time: 20, station: 'cub', temps: .35, formations: true, boxes: false, rows: 'chairs', decor: ['streamer', 'streamer', 'balloons', 'banner', 'window', 'plant'], rail: '#961e16', music: 'staff', after: 'dark' },
    { sign: 'COPY ROOM', minT: 18, max: 60, station: 'copier', temps: .65, fly: 3, boxes: true, rows: 'sheet', pulls: true, decor: ['stack', 'shelf', 'recycle', 'vending', 'notice', 'clock'], rail: '#b8a878', music: 'copy' }
  ];
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
      // each section has its own mix of things on the walls and floor (cosmetic, so not from the run's seed)
      R.decor.push({ w: R.nextDecorW, s: Math.random() < .5 ? -1 : 1, kind: B.decor[Math.floor(Math.random() * B.decor.length)], col: Math.random() });
      R.nextDecorW += fxr(.16, .3);
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
  // Between beats: moving day (furniture to get past) or the lights go out. Each drops its own
  // sign instead of a banner, so nothing big covers the hall.
  function startEvent(kind) {
    R.event = { kind, t: 0, dur: kind === 'move' ? TUNE.moveT : TUNE.darkT };
    if (kind === 'move') {
      // moving day: no one to shoot, and Facilities has left everything in the hall (the blaster can blast the stacks)
      Object.assign(R.event, { nextOb: 2.4, obN: 0, obs: [], clean: true, gap: 0, marked: {} });   // a beat to read the sign before the first piece
      for (const f of R.flies) { f.dead = true; poof(f.u, f.z, f.h); }
      addSign(.75, 'MOVING DAY', 'move');
      Snd.play('start'); live('Moving day: jump the chairs, duck the beams, and find the gap in the boxes or blast a way through.');
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
  // Moving day's furniture, in order: walls of stacked boxes with one gap (zig-zag), chairs to jump, beams to duck.
  const MOVES = ['wall', 'wall', 'chairs', 'beam', 'wall', 'chairs', 'beam', 'wall', 'wall', 'beam', 'chairs'];
  const LANES = [-.45, -.15, .15, .45];
  function spawnMove(E) {
    const kind = MOVES[E.obN++ % MOVES.length], ob = { kind, w: R.dist + 1.05, hit: false, done: false };
    // the first of each kind is marked, so it says what it wants: arrows to the gap, DUCK, JUMP (drawn only)
    if (!E.marked[kind]) { E.marked[kind] = true; ob.mark = true; }
    if (kind === 'wall') {
      // the gap swaps sides each time, so you zig-zag
      E.gap = E.gap < 2 ? 2 + Math.floor(rnd() * 2) : Math.floor(rnd() * 2);
      ob.gap = LANES[E.gap];
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
      bx.jolt = Math.max(0, (bx.jolt || 0) - dt);
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
            popText('SMASH! -' + dmg, 120, BACK.y0 + 30, '#ffd44a'); live('Smash! The Shredder misses the return.');
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
  function cutRug() {
    const P = R.pull;
    P.st = 'cut'; P.t = 0;
    R.cut = { z: bull.bz + .04, t: 0 };
    R.events.cuts = (R.events.cuts || 0) + 1; emit('cut');
    Snd.play('cut');
    popText('CUT!', PX(bull.u, bull.bz), YH(bull.bz, .3), '#ffd44a');
    if (R.boss.st === 'fight') jam(bull.bz);
  }
  // a light switch on the wall, about chest height
  function hitSwitch(sw) {
    sw.hit = true; R.event.flash = TUNE.switchFlash;
    Snd.play('lights'); Snd.play('wipe'); R.white = Math.max(R.white || 0, .06); emit('switch');
    R.events.switches = (R.events.switches || 0) + 1;
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
    setCheckpoint({ souls: R.souls, t: R.t, continues: R.continues, bestStreak: R.bestStreak, events: Object.assign({}, R.events) });
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
  function killTemp(tp, how) {
    if (tp.dead) return;
    tp.dead = true; R.freeze = .045;
    if (R.hearts < TUNE.hearts && rnd() < TUNE.coffeeDrop) addPickup('coffee', tp.cub.w - R.dist + .06, tp.cub.s * .5);
    const at = posOf(tp), x = PX(at.u, at.z), y = YH(at.z, at.h), s = sc(at.z) * .85;
    if (how === 'slash') R.fx.push({ k: 'half', x, y, s, t: 0, dur: .5, img: tempLook(tp) }); else poof(at.u, at.z, at.h);
    free(x, y - 4, 'temp', how);
    bonusSoul(how, x, y, 'temp');
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
  // ---------- drawing ----------
  // The renderer draws the hall itself, in light (see the core's draw()); this tells it what the hall looks like
  // now: how far it's scrolled and the rug with it, whether the lights are out, the section's colour on the rail, and
  // the rug's edges, which light up while it warns or pulls and flash blue as it rolls back.
  // The house lights: up in the first sections, an ordinary office, so the action reads; they ease down into the copy
  // room, and stay down for the dark and the fight. (Cosmetic: kept here, not in the run.)
  let house = 1, houseT = 0;
  function view() {
    const P = R.pull, dk = darkness();
    const want = R.phase === 'hall' && R.beat < 2 ? 1 : 0, dt = clamp(R.t - houseT, 0, .1); houseT = R.t;
    house += clamp(want - house, -dt / 2.5, dt / 2.5);
    const edge = R.roll ? (Math.floor(R.t * 12) % 2 ? '#7fd4ff' : '#bfefff') : P.st === 'warn' ? (Math.floor(P.t * 10) % 2 ? '#fff6e2' : '#ffd44a') : P.st === 'on' ? '#ff9628' : null;
    return {
      scroll: R.dist * WZ, rug: -R.roff * WZ, power: dk >= .5 ? 0 : 1 - dk * .75, dark: dk >= .5, house,
      rail: R.phase === 'hall' || R.phase === 'wake' ? lin(BEATS[R.beat].rail) : null,
      edge: edge ? lin(edge) : null, edgeGlow: edge ? 1.3 : 0
    };
  }
  // The light the floor's things give off this frame: paper knocked back or in a rally, light switches, the monitors
  // when the lights are out, the Shredder's eyes and its mouth as it winds up.
  function lights(r) {
    const at = (u, z, h, cr, cg, cb) => { const [x, y, wz] = world(u, z, h); r.light(x, y, wz, cr, cg, cb); };
    for (const p of R.projs) if (p.friendly || p.rally) at(p.u, p.z, p.h, .25, .4, .6);
    for (const sw of R.switches || []) { const s = switchAt(sw); if (s.z < 1.02 && s.z > .05) at(s.u, s.z, s.h, .5, .42, .15); }
    if (darkness() >= .5) for (const cb of R.cubs) { const z = cubZ(cb); if (z < 1.02 && z > ZN && cb.kind === 'cub') at(cb.s * .93, z, cb.top + .05, .04, .22, .1); }
    const b = R.boss, zS = shredderZ();
    // once it's woken, the end of the hall is lit, so you can see what you're fighting
    if (zS < 1.6 && R.phase !== 'hall') at(0, zS - .25, .85, .9, .78, .62);
    if (zS < 1.6 && (b.st === 'awake' || b.st === 'fight') && b.jam <= 0) at(0, zS - .03, .64, 1.6, .2, .1);
    if (zS < 1.6 && b.rev > 0 && b.st === 'fight') at(0, zS - .03, .2, 1.2, .15, .08);
  }
  // the gap where the katana cut the rug
  function drawCut() {
    if (!R.cut || R.cut.z <= 0) return;
    const z = R.cut.z, y = FY(z), x0 = PX(-TUNE.runner, z), x1 = PX(TUNE.runner, z);
    for (let x = Math.round(x0); x < x1; x++) rect(g, x, y - 1 + ((x * 7) % 3), 1, 2, '#28304a');
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
    const body = b.flash > 0 ? '#7a7e8c' : dead ? '#3a3a44' : '#4a4e5a';   // a hard hit lightens it, not a white box
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
  // a flat rectangle on a side wall, from depth z to z + dz, between heights h0 and h1 (as a share of the hall)
  function wallQuad(s, z, dz, h0, h1, col, u) {
    const uu = u == null ? s : u, z1 = z + dz;
    poly(g, col, [[PX(uu, z), YH(z, h1)], [PX(uu, z1), YH(z1, h1)], [PX(uu, z1), YH(z1, h0)], [PX(uu, z), YH(z, h0)]]);
  }
  // a little picture on a motivational poster: a mountain, a cat, a graph going up, a rug
  function posterPic(s, z, z1, kind) {
    const zc = (z + z1) / 2, x = PX(s, zc), y = YH(zc, .575), k = sc(zc), d = Math.max(1, Math.round(2 * k));
    if (kind === 0) { line(g, x - 3 * d, y + 2 * d, x, y - 2 * d, '#1a1418'); line(g, x, y - 2 * d, x + 3 * d, y + 2 * d, '#1a1418'); rect(g, x - d / 2, y - 2 * d, d, d, '#ffffff'); }
    else if (kind === 1) { rect(g, x - 2 * d, y - d, 4 * d, 3 * d, '#1a1418'); rect(g, x - 2 * d, y - 2 * d, d, d, '#1a1418'); rect(g, x + d, y - 2 * d, d, d, '#1a1418'); }
    else if (kind === 2) { line(g, x - 3 * d, y + 2 * d, x - d, y, '#1a1418'); line(g, x - d, y, x, y + d, '#1a1418'); line(g, x, y + d, x + 3 * d, y - 2 * d, '#1a1418'); }
    else { rect(g, x - 3 * d, y - d, 6 * d, 2 * d, '#d63428'); rect(g, x - 3 * d, y - d, 6 * d, Math.max(1, d / 2), '#ffd44a'); }
  }
  function drawDecor(d, z) {
    const s = d.s, k = sc(z);
    if (d.kind === 'poster') {
      // a framed motivational poster with a picture and a caption line
      const z1 = z + .07, col = POSTERS[Math.floor(d.col * 4)];
      wallQuad(s, z, .07, .44, .67, '#1a1418');
      poly(g, '#e8e4d8', [[PX(s, z), YH(z, .66)], [PX(s, z1), YH(z1, .66)], [PX(s, z1), YH(z1, .46)], [PX(s, z), YH(z, .46)]]);
      poly(g, col, [[PX(s, z + .008), YH(z + .008, .63)], [PX(s, z1 - .008), YH(z1 - .008, .63)], [PX(s, z1 - .008), YH(z1 - .008, .52)], [PX(s, z + .008), YH(z + .008, .52)]]);
      posterPic(s, z, z1, Math.floor(d.col * 16) % 4);
      wallQuad(s, z + .015, .04, .48, .495, '#7c8494');
    } else if (d.kind === 'clock') {
      // a round wall clock, its second hand ticking
      const zc = z + .02, x = PX(s, zc), y = YH(zc, .62), r = Math.max(2, Math.round(5 * k));
      disc(g, x, y, r + 1, '#1a1418'); disc(g, x, y, r, '#fff6e2');
      const a = Math.floor(R.t) * Math.PI / 30;
      line(g, x, y, Math.round(x + Math.sin(a) * r * .8), Math.round(y - Math.cos(a) * r * .8), '#d63428');
      line(g, x, y, x, Math.round(y - r * .6), '#1a1418');
    } else if (d.kind === 'window') {
      // a tall window onto the city at night, lit windows in the towers outside
      wallQuad(s, z, .16, .3, .74, '#1a1418');
      wallQuad(s, z + .008, .144, .32, .72, '#16203a');
      for (let i = 0; i < 6; i++) { const zz = z + .02 + i * .022, hh = .32 + ((i * 37 + Math.floor(d.col * 9)) % 5) * .05; wallQuad(s, zz, .016, .32, hh, '#0c1020'); if (i % 2) wallQuad(s, zz + .005, .005, hh - .06, hh - .04, '#ffd44a'); }
      wallQuad(s, z + .078, .006, .32, .72, '#1a1418');
    } else if (d.kind === 'door') {
      // an office door with a nameplate
      wallQuad(s, z, .1, 0, .58, '#1a1418');
      wallQuad(s, z + .008, .084, 0, .56, '#6a4a30');
      wallQuad(s, z + .02, .05, .44, .5, '#e8b030');
      wallQuad(s, z + .07, .01, .26, .3, '#e8e4c8');
    } else if (d.kind === 'banner') {
      // ALL STAFF, on a strip of red across the wall
      wallQuad(s, z, .28, .7, .8, '#961e16');
      for (let i = 0; i < 7; i++) wallQuad(s, z + .02 + i * .036, .02, .73, .77, '#ffd44a');
    } else if (d.kind === 'notice') {
      // a cork notice board with pinned notes
      wallQuad(s, z, .12, .38, .62, '#1a1418');
      wallQuad(s, z + .006, .108, .4, .6, '#a0703a');
      for (let i = 0; i < 4; i++) wallQuad(s, z + .015 + i * .025, .018, .44 + (i % 2) * .06, .52 + (i % 2) * .06, i % 3 ? '#fff6e2' : '#ffd44a');
    } else if (d.kind === 'shelf') {
      // a shelf of paper reams
      for (const h of [.3, .5]) { wallQuad(s, z, .14, h - .02, h, '#4a4e5a'); for (let i = 0; i < 5; i++) wallQuad(s, z + .01 + i * .026, .02, h, h + .07, i % 2 ? '#f2eee2' : '#c8d0dc'); }
    } else if (d.kind === 'plant' || d.kind === 'balloons' || d.kind === 'recycle' || d.kind === 'vending') {
      const x = PX(s * .93, z), y = FY(z), u = Math.max(1, k);
      if (d.kind === 'plant') {
        rect(g, x - 3 * u, y - 5 * u, 6 * u, 5 * u, '#8c4a2a');
        for (let i = 0; i < 6; i++) disc(g, Math.round(x + Math.sin(i * 2.1) * 4 * u), Math.round(y - 9 * u - i * 2 * u), Math.max(1, Math.round(3 * u)), i % 2 ? '#2a7a4a' : '#3a9a5a');
      } else if (d.kind === 'balloons') {
        for (let i = 0; i < 3; i++) { const bx = x + (i - 1) * 5 * u, by = y - (26 + (i % 2) * 5) * u + Math.sin(R.t * 2 + i + d.col * 6) * u; line(g, Math.round(bx), Math.round(by), Math.round(x), Math.round(y), '#e8e4c8'); disc(g, Math.round(bx), Math.round(by), Math.max(1, Math.round(3 * u)), ['#d63428', '#ffd44a', '#3aa8e0'][i]); }
      } else if (d.kind === 'recycle') {
        rect(g, x - 4 * u, y - 9 * u, 8 * u, 9 * u, '#2a5aa0'); rect(g, x - 4 * u, y - 10 * u, 8 * u, u, '#1a1418'); rect(g, x - 2 * u, y - 7 * u, 4 * u, 3 * u, '#fff6e2');
      } else {
        // a vending machine, its window glowing
        rect(g, x - 7 * u, y - 30 * u, 14 * u, 30 * u, '#1a1418'); rect(g, x - 6 * u, y - 29 * u, 12 * u, 28 * u, '#d63428');
        rect(g, x - 4 * u, y - 26 * u, 6 * u, 16 * u, '#7fd4ff'); for (let i = 0; i < 4; i++) rect(g, x - 4 * u, y - 24 * u + i * 4 * u, 6 * u, Math.max(1, u), '#fff6e2');
        rect(g, x + 3 * u, y - 24 * u, 2 * u, 6 * u, '#ffd44a');
      }
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
  // where a temp's head is drawn: left, width, foot, height
  function tempBox(tp, zt) {
    const s = sc(zt) * .85, w = Math.max(2, Math.round(26 * s)), h = Math.max(2, Math.round(15 * s));
    return { s, w, h, x: Math.round(PX(tp.cub.s * .8, zt) - w / 2), yb: YH(zt, tp.cub.top - .12 + tp.pop * .17) };
  }
  function drawTemp(tp, zt) {
    const { s, w, h, x, yb } = tempBox(tp, zt), img = tempLook(tp), hh = Math.round(h * img.height / 15);
    g.drawImage(img, x, Math.round(yb - hh), w, hh);
    if (tp.st === 'up' && tp.t > .25 && !tp.threw) g.drawImage(A.WAD, Math.round(x + w * .75), Math.round(yb - h - 4 * s), Math.max(2, Math.round(5 * s)), Math.max(2, Math.round(5 * s)));
  }
  // the tell: a temp about to throw flashes a ! first (it glows, so it reads in the dark too)
  function tempTell(tp, zt) {
    if (!(tp.will && tp.st === 'up' && !tp.threw && tp.t > .12 && Math.floor(tp.t * 12) % 3)) return;
    const { w, h, x, yb } = tempBox(tp, zt), tx = Math.round(x + w / 2), ty = Math.round(yb - h - 10);
    rect(g, tx - 3, ty - 1, 7, 9, '#1a1418'); rect(g, tx - 2, ty, 5, 7, '#fff6e2'); txt(g, '!', tx - 1, ty + 1, '#d63428');
  }
  function drawBox(bx, z) {
    const s = sc(z), w = Math.max(3, Math.round(A.BOX.width * s)), h = Math.max(2, Math.round(A.BOX.height * s));
    const x = PX(bx.u, z) + (bx.jolt > 0 ? (Math.floor(bx.jolt * 60) % 2 ? 1 : -1) : 0);   // a shot jolts a stack
    if (bx.blown) {
      // blasted apart: the three boxes fly up and out, tumbling, and fade
      const k = bx.hit;
      g.save(); g.globalAlpha = Math.max(0, 1 - k * 2);
      for (let i = 0; i < 3; i++) {
        const bxx = x + (i - 1) * k * 70 * s, by = FY(z) - h * (i + 1) - (60 * k - 90 * k * k) * s * (1 + i * .4);
        g.save(); g.translate(Math.round(bxx), Math.round(by)); g.rotate(Math.floor(k * 14 + i) % 4 * Math.PI / 2); g.drawImage(A.BOX, -Math.round(w / 2), -Math.round(h / 2), w, h); g.restore();
      }
      g.restore();
      return;
    }
    const y = FY(z) - (bx.hit ? Math.sin(bx.hit * 9) * 6 * s : 0);
    if (bx.hit) { g.save(); g.globalAlpha = 1 - bx.hit * 2; }
    g.drawImage(A.BOX, Math.round(x - w / 2), Math.round(y - h), w, h);
    if (bx.tall) for (let i = 1; i < 3; i++) g.drawImage(A.BOX, Math.round(x - w / 2 + (i % 2 ? 1 : -1) * s), Math.round(y - h * (i + 1) + i * s), w, h);   // a stack too tall to jump
    // shot at: it splits, a crack for each hit
    if (bx.tall && bx.dmg) for (let i = 0; i < bx.dmg; i++) line(g, x - w * .3 + i * w * .25, y - h * (1.2 + i * .6), x - w * .1 + i * w * .25, y - h * (1.7 + i * .6), '#3a2a1a');
    if (bx.hit) g.restore();
  }
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
  const CHAIR_US = [-.5, -.3, -.1, .1, .3, .5];
  function drawRow(row, z) {
    const k = sc(z), drop = row.hit ? row.hit * 30 * k : 0;
    if (row.hit) { g.save(); g.globalAlpha = Math.max(0, 1 - row.hit * 1.7); }
    if (row.kind === 'chairs') {
      // office chairs packed side by side across the aisle with caution tape strung along their backs, rolling at you:
      // no way through, so jump; casters spinning, a little swivel wobble; hit one and they tip
      const img = A.CHAIRS[Math.floor(R.t * 14) % 2], w = Math.max(3, Math.round(img.width * k)), h = Math.max(3, Math.round(img.height * k));
      shadow(0, z, 140);
      CHAIR_US.forEach((u, i) => {
        const wob = Math.round(Math.sin(R.t * 9 + i * 2.1) * k * 1.5), x = PX(u, z) + wob + (row.hit ? Math.sin(u * 9 + row.hit * 8) * 6 : 0);
        if (row.hit) { g.save(); g.translate(Math.round(x), Math.round(FY(z))); g.rotate((u < 0 ? -1 : 1) * Math.min(1.4, row.hit * 4)); g.drawImage(img, -Math.round(w / 2), -h, w, h); g.restore(); }
        else g.drawImage(img, Math.round(x - w / 2), Math.round(FY(z) - h), w, h);
      });
      if (!row.hit) {
        const x0 = PX(CHAIR_US[0], z), x1 = PX(CHAIR_US[CHAIR_US.length - 1], z), y = Math.round(FY(z) - h * .62), th = Math.max(1, Math.round(2 * k)), seg = Math.max(2, Math.round(5 * k));
        for (let x = Math.round(x0), i = 0; x < x1; x += seg, i++) rect(g, x, y, Math.min(seg, x1 - x), th, i % 2 ? '#1a1418' : '#ffd44a');
      }
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
  function drawPaper() {
    for (let i = 0; i < 8; i++) {
      const k = mod1(R.t * .3 + i / 8), z = 1 - k, u = Math.sin(i * 2.3 + R.t * .7) * .7, s2 = Math.max(1, Math.round(3 * sc(z)));
      rect(g, PX(u, z), YH(z, .25 + .35 * Math.abs(Math.sin(i + R.t * 1.5))), s2, Math.max(1, s2 - (Math.floor(R.t * 6 + i) % 2)), '#e8e4d8');
    }
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
  // What glows, laid over the lit hall as it is (the core's draw()): light switches, monitors, the neon sign, the
  // warning beside the rug, a temp's tell, the Shredder's eyes and teeth once it's up, pickups, paper in flight, bolts,
  // souls and sparks. With the lights out, eyes too: the temps', the carpshits', and something's far down the hall.
  function drawSwitch(sw) {
    const at = switchAt(sw); if (at.z > 1.02 || at.z < .05) return;
    const k = sc(at.z), x = PX(sw.s * .99, at.z), y = YH(at.z, at.h), w = Math.max(3, Math.round(9 * k)), h = Math.max(4, Math.round(13 * k)), blink = Math.floor(R.t * 6) % 2;
    rect(g, x - w / 2 - 1, y - h / 2 - 1, w + 2, h + 2, blink ? '#fff0aa' : '#ffd44a');
    rect(g, x - w / 2, y - h / 2, w, h, '#1a1418'); rect(g, x - Math.max(1, w / 4), y - h / 4, Math.max(1, Math.round(w / 2)), Math.max(1, Math.round(h / 3)), '#ffd44a');
  }
  // Moving day's first wall, beam and row of chairs say what they want: arrows on the floor run into the wall's gap,
  // and a hazard-yellow DUCK or JUMP hangs on the beam or rides the chairs.
  const LABELS = {};
  function label(text) {
    if (!LABELS[text]) {
      const img = A.canvas(A.textWidth(text) + 8, 11), b = img.getContext('2d');
      rect(b, 0, 0, img.width, 11, '#1a1418'); rect(b, 1, 1, img.width - 2, 9, '#e8b030'); txt(b, text, 4, 3, '#1a1418');
      LABELS[text] = img;
    }
    return LABELS[text];
  }
  function moveMarks() {
    if (!R.event || R.event.kind !== 'move') return;
    const done = new Set();
    for (const bx of R.boxes) {
      const ob = bx.ob, z = bx.w - R.dist;
      if (!ob || !ob.mark || ob.gap == null || done.has(ob) || z < bull.bz || z > 1.02) continue;
      done.add(ob);
      for (let j = 0; j < 3; j++) {
        const za = Math.max(bull.bz + .02, z - .06 - j * .07), zb = za + .035, lit = Math.floor(R.t * 6) % 3 === 2 - j;
        poly(g, lit ? '#fff6e2' : '#ffd44a', [[PX(ob.gap - .07, za), FY(za)], [PX(ob.gap + .07, za), FY(za)], [PX(ob.gap, zb), FY(zb)]]);
      }
    }
    for (const row of R.rows) {
      const ob = row.ob, z = row.w - R.dist;
      if (!ob || !ob.mark || row.hit || z < bull.bz || z > 1.02) continue;
      const img = label(row.kind === 'beam' ? 'DUCK' : 'JUMP'), k = sc(z);
      const y = row.kind === 'beam' ? YH(z, .21) - img.height - 2 : FY(z) - Math.round(A.CHAIRS[0].height * k) - img.height - 3;
      g.drawImage(img, Math.round(VX - img.width / 2), Math.round(y));
    }
  }
  function glows() {
    const dk = darkness() >= .5;
    for (const sw of R.switches || []) drawSwitch(sw);
    for (const cb of R.cubs) {
      const z = cubZ(cb); if (z > 1.02) continue;
      if (cb.kind === 'cub') {
        const k = sc(z), mx = PX(cb.s * .93, z), my = YH(z, cb.top), mw = Math.max(2, Math.round(10 * k)), mh = Math.max(2, Math.round(7 * k));
        rect(g, mx - mw / 2 + 1, my - mh + 1, Math.max(1, mw - 2), Math.max(1, mh - 2), monitor(cb));
      }
      const tp = cb.temp;
      if (!tp || tp.dead || tp.pop <= 0) continue;
      tempTell(tp, z + .06);
      if (dk && tp.pop > .3) {
        const zt = z + .06, s2 = sc(zt) * .85, w = 26 * s2, h = 15 * s2, x = PX(cb.s * .8, zt), yt = YH(zt, cb.top - .12 + tp.pop * .17) - h, e = Math.max(1, Math.round(2 * s2));
        rect(g, x - w * .23, yt + h * .37, e, e, '#fff0aa'); rect(g, x + w * .19, yt + h * .37, e, e, '#fff0aa');
      }
    }
    if (dk) for (const f of R.flies) {
      const k = sc(f.z), w = 26 * k, x = PX(f.u, f.z), y = YH(f.z, f.h), e = Math.max(1, Math.round(2 * k));
      rect(g, x - w * .23, y - 1, e, e, '#fff0aa'); rect(g, x + w * .19, y - 1, e, e, '#fff0aa');
    }
    if (Math.floor(R.t * 13) % 11) for (const sg of R.signs) { const z = sg.w - R.dist; if (sg.neon && z < 1.02 && z > .05) drawSign(sg, z); }
    sprayLanes();
    moveMarks();
    if (R.phase !== 'hall') withShredder(() => { shredderEyes(); shredderTeeth(); });
    else if (R.event && R.event.kind === 'dark') darkEyes();
    const list = [];
    for (const pk of R.pickups) { const z = pk.w - R.dist; if (z < 1.02) list.push([z, () => drawPickup(pk, z)]); }
    for (const p of R.projs) list.push([p.z, () => drawProj(p)]);
    for (const s of R.shots) list.push([s.z, () => drawShot(s)]);
    list.sort((a, b) => b[0] - a[0]);
    for (const e of list) e[1]();
    drawFx('glow');
  }

  // ---------- what the core asks of the floor ----------
  // A fresh run (or a continue, from a checkpoint): the stations and sign it starts with.
  function newRun(r, b, at) {
    R = r; bull = b;
    if (at) {
      Object.assign(R, { beat: BEATS.length - 1, t: at.t, souls: at.souls, shown: at.souls, continues: at.continues + 1, bestStreak: at.bestStreak, speed: 0 });
      Object.assign(R.events, at.events, { bossAt: 0 });
      R.pull.count = 1;   // the runner has been explained already
      for (let w = .15; w < 1.05; w += .45) R.decor.push({ w, s: w < .5 ? -1 : 1, kind: 'stack', col: 0 });
    }
    for (let w = .2; w < 1.05; w += .36) addCubs(w, false);
    if (!at) addSign(.95, BEATS[0].sign);
  }
  // One tick of play, in this order: the hall, Unruggabull, the rug, the hint, temps, obstacles, pickups, carpshits,
  // paper, shots, the Shredder, effects and the floor's flow. The order is part of the seeded run, so keep it.
  function update(dt) {
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
  // The things in the hall, lit where they stand (the core lays them over the rendered hall): the cut in the rug, the
  // Shredder, paper in the air, what's on the walls and at the sides, then what's on the floor and Unruggabull, far to
  // near. Pickups, paper in flight and bolts glow, so they go with the glow (glows()).
  function draw() {
    drawCut();
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
    for (const f of R.flies) list.push([f.z, () => drawFly(f)]);
    list.push([bull.bz - .001, drawBull]);
    list.sort((a, b) => b[0] - a[0]);
    for (const e of list) e[1]();
    drawFx('lit');
  }
  // The floor's part of the HUD: the goal meter in the hall (or the souls counter), the Shredder's bar, the rally count.
  function hud() {
    if (R.phase === 'hall') {
      // the goal: free enough souls and the Shredder wakes
      const shown = Math.min(R.souls, R.shown), k = Math.min(1, shown / TUNE.goal), full = k >= 1 && Math.floor(R.t * 6) % 2, pulse = R.meterPulse > 0;
      g.drawImage(A.GHOST, 74, pulse ? 2 : 3);
      rect(g, 86, 4, 64, 7, pulse ? '#fff6e2' : '#1a1418'); rect(g, 87, 5, 62, 5, '#3a2f5e'); rect(g, 87, 5, Math.round(62 * k), 5, full || pulse ? '#ffd44a' : '#7fd4ff');
      otxt(g, shown + '/' + TUNE.goal, 154, 5, pulse ? '#ffd44a' : '#fff6e2');
      // while lights out doubles souls
      if (R.event && R.event.kind === 'dark' && Math.floor(R.t * 4) % 4) otxt(g, '×2', 178, 5, '#ffd44a');
    } else drawSoulsCounter();
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
  // What the blaster can lean toward here, besides carpshits: temps up from their stations, and light switches.
  function aim(consider) {
    for (const cb of R.cubs) if (cb.temp && !cb.temp.dead && cb.temp.pop > .3) consider(cb.temp, posOf(cb.temp), TUNE.aimCone);
    for (const sw of R.switches || []) consider(sw, switchAt(sw), .5);
  }
  // A shot hitting one of the floor's own targets (checked before carpshits). True if it stopped the shot.
  function shotHits(s) {
    for (const cb of R.cubs) {
      const tp = cb.temp; if (!tp || tp.dead || tp.pop < .4) continue;
      const at = posOf(tp);
      if (Math.abs(s.u - at.u) < .09 && Math.abs(s.z - at.z) < .06) { s.dead = true; sparks(at.u, at.z, at.h); killTemp(tp, 'shot'); break; }
    }
    if (s.dead) return true;
    for (const sw of R.switches || []) { const at = switchAt(sw); if (!sw.hit && Math.abs(s.z - at.z) < .07 && Math.abs(s.u - at.u) < .2) { s.dead = true; hitSwitch(sw); break; } }
    if (s.dead) return true;
    // moving day's stacks of boxes: a few hits blast one apart, a way through without the gap (and not a bump)
    for (const bx of R.boxes) {
      const z = bx.w - R.dist;
      if (!bx.tall || bx.hit || z < bull.bz + .02 || Math.abs(s.z - z) > .06 || Math.abs(s.u - bx.u) > .1) continue;
      s.dead = true; bx.dmg = (bx.dmg || 0) + 1; bx.jolt = .12; sparks(s.u, z, s.h); Snd.play('hit');
      if (bx.dmg >= TUNE.stackHits) { bx.hit = .001; bx.blown = true; poof(bx.u, z, .2, 10); Snd.play('poof'); emit('stack'); }
      break;
    }
    return s.dead;
  }
  // A shot reaching the far end. True if the floor took it (the Shredder, in a fight); otherwise it just puffs out.
  function shotFar(s) {
    // in phase 3 it braces: half damage from the blaster unless it's jammed or reeling from a smash
    if (R.boss.st === 'fight' && Math.abs(s.u) < .8) { bossDamage(TUNE.shotDmg * (R.boss.jam > 0 ? TUNE.jamMult : R.boss.ph === 3 ? .5 : 1), 'blaster'); sparks(s.u, .96, s.h, R.boss.jam > 0 ? '#ffd44a' : '#fff6e2'); return true; }
    return false;
  }
  // The katana's swing: paper in reach gets knocked back.
  function slash(near) {
    for (const p of R.projs) if (!p.dead && !p.friendly && near(p.u, p.z)) deflect(p);
  }
  // He's been hit: the Shredder laughs (not on his last heart: that's his WHOA!).
  function hurt(cause) {
    if (R.hearts > 0 && R.phase === 'boss' && R.boss.st === 'fight' && cause !== 'rally') { laugh(); taunt('hit'); }
  }
  // The blaster's back in his hands: the first time in the fight, the souls' hint.
  function blasterBack() {
    if (R.phase === 'boss' && !R.events.soulHint) startHint();
  }

  return {
    // hooks
    use: x => { g = x; }, view, lights, newRun, update, draw, glows, overlay: drawHintSouls, hud, aim, shotHits, shotFar, slash, hurt, blasterBack, posOf,
    bonusBy, cutRug, draggedIn, endPull, startWake, blowUp,
    // the rest of the floor by name, for the test harness and the balance bots
    BEATS, beat, spawnFormation, startEvent, MOVES, spawnMove, knock, launch, deflect, surge, ATTACKS, attack, jam, bossDamage,
    TAUNTS, taunt, laugh, surgeSoon, shredderZ, darkness, startBoss, serveRally, throwPlanes, spitRow, spitFan, rollBack, killTemp
  };
};
