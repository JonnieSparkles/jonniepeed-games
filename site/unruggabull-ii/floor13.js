// Unruggabull II: The 13th Floor, Accounting, and its boss, the Shredder. Classic script; load after art.js and audio.js
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
    glowLayer, setCheckpoint
  } = core;
  let R = null, bull = null;
  let g = core.g;   // where drawing goes: set by the core (use), and swapped for an offscreen canvas while the Shredder draws
  const lin = UnrugRender.lin;

  // The hall comes in three beats, each with its own sign, props and trouble. The first two last `time` seconds
  // and end with an event; the last wakes the Shredder once you reach the goal (after `minT`, or at `max` regardless).
  const BEATS = [
    { sign: 'ACCOUNTS PAYABLE', time: 26, station: 'cub', temps: .6, fly: 3.8, boxes: true, work: ['type', 'type', 'call', 'sleep', 'cooler', 'office'], rail: '#3a5a8a', music: 'tower', after: 'move' },
    { sign: 'ALL STAFF', time: 20, station: 'cub', temps: .35, formations: true, boxes: false, rows: 'chairs', work: ['type', 'call', 'sleep', 'cooler', 'office'], rail: '#961e16', music: 'staff', after: 'dark' },
    { sign: 'COPY ROOM', minT: 18, max: 60, station: 'copier', temps: .65, fly: 3, boxes: true, pulls: true, work: ['copier', 'copier', 'type', 'sleep'], rail: '#b8a878', music: 'copy' }
  ];
  const beat = () => BEATS[R.beat];
  // ---------- the sets: each section's look and dressing (sets13.js) ----------
  const SETS = UnrugSets({ VX, HY, sc, PX, FY, CY, YH });
  const SET_ORDER = ['ap', 'move', 'staff', 'dark', 'copy'];
  // the section now: a beat, or the event in it; the copy room's set carries on to the Shredder
  function secNow() {
    if (R.phase !== 'hall') return 'copy';
    if (R.event) return R.event.kind === 'move' ? 'move' : 'dark';
    return ['ap', 'staff', 'copy'][R.beat];
  }
  // Each slot gets its section the first time it comes into view, from where the sections should begin (what's left
  // of this one at walking pace, then each one's length), and keeps it, so nothing in view ever changes.
  let setMemo = new Map(), setCache = null;
  function secAt(layer, n, w) {
    const key = layer + n;
    let sec = setMemo.get(key);
    if (sec) return sec;
    let i = SET_ORDER.indexOf(secNow()), end = R.dist;
    const E = R.event, B = beat();
    end += R.phase !== 'hall' ? Infinity : E ? Math.max(0, E.dur - E.t) * TUNE.scroll : B.after ? Math.max(0, B.time - R.beatT) * TUNE.scroll : Infinity;
    const LEN = { ap: BEATS[0].time, move: TUNE.moveT, staff: BEATS[1].time, dark: TUNE.darkT, copy: Infinity };
    while (w >= end && i < SET_ORDER.length - 1) { i++; end += LEN[SET_ORDER[i]] * TUNE.scroll; }
    sec = SET_ORDER[i]; setMemo.set(key, sec);
    return sec;
  }
  // a station, a worker or an office already stands there
  const setTaken = (layer, s, w) => layer === 'piece'
    ? R.cubs.some(cb => cb.s === s && Math.abs(cb.w - w) < .2) || R.workers.some(wk => wk.s === s && Math.abs(wk.w - w) < (wk.kind === 'office' ? .42 : .26))
    : R.workers.some(wk => wk.s === s && wk.kind === 'office' && Math.abs(wk.w - w) < .36);
  // what's in view this frame (worked out once a frame)
  function setItems() {
    if (setCache && setCache.t === R.t && setCache.d === R.dist) return setCache.list;
    SETS.time(R.t);
    const list = SETS.items(R.dist + ZN - .35, R.dist + AHEAD, secAt, setTaken);
    setCache = { t: R.t, d: R.dist, list };
    return list;
  }
  // the hall's colours and light for the section, eased over a couple of seconds when it changes
  const LOOK0 = { lo: [.11, .095, .135], hi: [.19, .18, .23], sk: [.07, .065, .085], co: [.17, .16, .2], ce: [.24, .24, .27], ti: [.13, .14, .19], sh: .5, lamp: [1.75, 1.55, 1.2] };
  let look = null, lookT = 0;
  function lookNow() {
    const want = Object.assign({}, LOOK0, SETS.view(secNow()).look || {}), dt = clamp(R.t - lookT, 0, .1); lookT = R.t;
    if (!look) look = JSON.parse(JSON.stringify(want));
    const k = Math.min(1, dt / 1.5);
    for (const key in LOOK0) {
      if (typeof LOOK0[key] === 'number') look[key] += (want[key] - look[key]) * k;
      else for (let c = 0; c < 3; c++) look[key][c] += (want[key][c] - look[key][c]) * k;
    }
    return look;
  }
  // ---------- the hall: stations (cubicles or copiers) with temps, signs ----------
  const cubZ = cb => cb.w - R.dist;
  const STATION_TOP = { cub: .38, copier: .32 };
  function addCubs(w, temps, both, chance) {
    const kind = beat().station;
    const sides = both || rnd() < .35 ? [-1, 1] : [rnd() < .5 ? -1 : 1];
    for (const s of sides) {
      if (R.workers.some(wk => wk.s === s && Math.abs(wk.w - w) < (wk.kind === 'office' ? .3 : .2))) continue;   // a worker's spot
      const cb = { w, s, kind, top: STATION_TOP[kind], temp: null };
      if (temps && rnd() < (chance == null ? beat().temps : chance)) cb.temp = { cub: cb, st: 'hidden', t: 0, pop: 0, trig: rr(.45, .8), pops: 0, threw: false, dead: false };
      R.cubs.push(cb);
    }
  }
  // Scenery comes into view this far down the hall (the sets and the carpshits at work), out of the fog, and is drawn
  // from there; what you fight still arrives at the old far end (z 1) and fades in out of the dark.
  const AHEAD = 3.5;
  // Carpshits at work: typing (some in an accountant's green visor), on calls, asleep at their desks, gossiping at
  // the water cooler, copying themselves in the copy room, and a manager in an office set into the wall. They never
  // fight back; a shot frees the soul inside (p(Loom) wove them from souls). Each has one or two carpshits (carps),
  // each a target: du across from its spot, h how high it is.
  const WORK_SPOTS = { type: [[0, .15]], call: [[-.03, .16]], sleep: [[.01, .1]], cooler: [[-.14, .16], [.14, .15]], copier: [[-.06, .17]], office: [[0, .45]] };
  function addWorker(w) {
    const list = beat().work, kind = list[Math.floor(rnd() * list.length)];
    const wk = { w, s: rnd() < .5 ? -1 : 1, kind, visor: kind === 'type' && Math.random() < .5, carps: [] };
    WORK_SPOTS[kind].forEach(([du, h], i) => wk.carps.push({ wk, i, du, h, dead: false }));
    R.workers.push(wk);
  }
  const workerAt = c => ({ u: c.wk.s * (c.wk.kind === 'office' ? .97 : .8) + c.du, z: c.wk.w - R.dist + (c.wk.kind === 'office' ? .08 : 0), h: c.h });
  // in reach of the blaster: not too far down the hall, and still ahead of him
  const workerLive = c => { if (c.dead) return false; const z = c.wk.w - R.dist; return z < TUNE.reach && z > bull.bz; };
  // a light switch on the wall in lights out, about chest height
  const switchAt = sw => ({ u: sw.s * .9, z: sw.w - R.dist, h: .32 });
  // Where a target is, for aiming and hits. Temps live behind their station.
  function posOf(o) {
    if (o.sw) return switchAt(o);
    if (o.wk) return workerAt(o);
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
  // Each section starts like a new scene: a breather while its sign drops before anything comes at you.
  const BREATHER = 2.5;
  function spawnHall(dt) {
    const B = beat(), ev = R.event && R.event.kind;
    while (R.dist + 1.05 >= R.nextCubW) {
      addCubs(R.nextCubW, R.t > 2.5); R.nextCubW += rr(.28, .38);
    }
    // carpshits at work along the walls, coming into view far down the hall
    while (R.dist + AHEAD >= R.nextWorkW) { addWorker(R.nextWorkW); R.nextWorkW += rr(1.1, 1.7); }
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
    // Rows of rolling office chairs span the whole aisle: the only way past is over.
    if (B.rows && !ev) {
      R.nextRow -= dt;
      if (R.nextRow <= 0) { R.rows.push({ w: R.dist + 1.05, kind: B.rows, hit: 0 }); R.nextRow = rr(7, 10); }
    }
    // File boxes sit on the floor: jump them or step around.
    if (B.boxes && !ev) {
      R.nextBox -= dt;
      if (R.nextBox <= 0) {
        // a low cubicle desk sticking out from one side into the aisle: one lane deep, or two, right up to the runner
        const i = Math.floor(rnd() * 4), sd = i < 2 ? -1 : 1, inner = [-.3, -.02, .02, .3][i];
        R.boxes.push({ w: R.dist + 1.05, s: sd, inner, u: (inner + sd * DESK_OUT) / 2, hit: 0 });
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
    const C = COURSES[kind];
    R.event = { kind: C ? 'move' : kind, t: 0, dur: C ? C.dur : TUNE.darkT };
    if (C) {
      // moving day: no one to shoot, and a course of furniture to jump and duck, one move at a time
      Object.assign(R.event, { course: kind, moves: C.moves, bonus: C.clean, nextOb: 1.8, obN: 0, obs: [], clean: true, marked: {}, souls: [], lane: 1 });   // a beat to read the sign before the first piece
      for (const f of R.flies) { f.dead = true; poof(f.u, f.z, f.h); }
      addSign(.75, C.sign, 'move');
      Snd.play('start'); live(C.say);
      if (kind === 'move') bark('move');
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
  // Moving day: a short course to introduce jumping and ducking, in order, each with the gap before the next.
  const MOVES = [['chairs', 2.6], ['beam', 2.6], ['chairs', 2.6], ['beam', 2.6]];   // seconds after each piece before the next: room to land, read the next one and grab a soul
  const COURSES = { move: { sign: 'MOVING DAY', moves: MOVES, dur: TUNE.moveT, clean: TUNE.moveClean, say: 'Moving day: jump the chairs, duck the beams.' } };
  const DUCKS = { beam: true };   // beams hang at head height: duck; the rest, jump
  function spawnMove(E) {
    const [kind, gap] = E.moves[E.obN++], ob = { kind, w: R.dist + 1.05, hit: false, done: false };
    // the first jump and the first duck are marked, so they say what they want (drawn only)
    const want = DUCKS[kind] ? 'duck' : 'jump';
    if (!E.marked[want] && E.course === 'move') { E.marked[want] = true; ob.mark = true; }
    R.rows.push({ w: ob.w, kind, hit: 0, ob, v: 1e-6 });   // left in the hall: they don't roll, so pieces keep their spacing
    E.obs.push(ob);
    // a soul trapped in a bubble between this piece and the next, in another lane, so you move side to side too
    if (gap) { E.lane = (E.lane + 1 + Math.floor(rnd() * 2)) % 3; E.souls.push({ w: ob.w + gap * R.speed / 2, u: [-.42, 0, .42][E.lane], got: false }); }
    return gap;
  }
  function updateMove(E, dt) {
    E.nextOb -= dt;
    if (E.nextOb <= 0 && E.obN < E.moves.length) E.nextOb = spawnMove(E);
    // run through a trapped soul to free it
    for (const sl of E.souls) {
      const z = sl.w - R.dist;
      if (!sl.got && Math.abs(z - bull.bz) < .03 && Math.abs(sl.u - bull.u) < .16 && bull.jh < .12) { sl.got = true; free(PX(sl.u, z), YH(z, .1), 'move', 'bubble'); }
    }
    E.souls = E.souls.filter(sl => !sl.got && sl.w - R.dist > ZN);
    // each piece you get past cleanly frees a soul; a duck says so, since it's hard to see from behind
    for (const ob of E.obs) if (!ob.done && ob.w - R.dist < bull.bz - .04) {
      ob.done = true;
      if (!ob.hit) { free(PX(bull.u, bull.bz), YH(bull.bz, .3), 'move', 'move'); if (DUCKS[ob.kind]) popText('DUCKED!', PX(bull.u, bull.bz), YH(bull.bz, .34), '#ffd44a'); }
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
          for (let i = 0; i < E.bonus; i++) free(PX(bull.u, bull.bz) + fxr(-12, 12), YH(bull.bz, .3) + fxr(-6, 6), 'move', 'clean');
          R.fx.push({ k: 'big', text: 'NOT A SCRATCH +' + E.bonus, x: 120, y: 44, t: 0, dur: 1.3 }); Snd.play('wipe');
        }
        // another event straight after this one, if the section lists more than one: a coffee between, same section
        if (R.evQ && R.evQ.length) { R.event = null; addPickup('coffee', .9, rr(-.4, .4)); startEvent(R.evQ.shift()); spawnHall(dt); return; }
        R.event = null; R.beat++; R.beatT = 0; R.switches = [];
        R.nextFly = Math.max(R.nextFly, BREATHER); R.nextForm = Math.max(R.nextForm, BREATHER + .8); R.nextRow = Math.max(R.nextRow, BREATHER + 1.5); R.nextBox = Math.max(R.nextBox, BREATHER);
        addSign(1, beat().sign);
        if (beat().pulls) { bark('copy'); R.copyAt = R.souls; }
        Snd.music(beat().music);
        if (beat().pulls) R.pull.next = R.t + 3;
        // a coffee after each event, and a Spread Shot to try out after moving day
        addPickup('coffee', .9, rr(-.4, .4));
        if (E.course === 'move') addPickup('spread', 1.3, rr(-.4, .4));   // lights out nearly always pays a streak drop instead
      }
    } else if (B.after && R.beatT >= B.time && !(B.formations && R.flies.some(f => f.form) && R.beatT < B.time + 8)) { R.evQ = [].concat(B.after); startEvent(R.evQ.shift()); }
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
      if (!R.events.jumpHint && z < .6 && R.phase === 'hall' && !DUCKS[row.kind]) {
        R.events.jumpHint = true; R.banner = { text: 'JUMP', t: 0, dur: 1.6, pull: true };
      }
      // a beam hangs from the ceiling: duck under it; everything else, jump
      if (DUCKS[row.kind] && z < .6) duckHint();
      const hits = DUCKS[row.kind] ? !bull.crouch : bull.jh < TUNE.rowH;
      if (Math.abs(z - bull.bz) < .02 && hits && knock(row.ob, row.kind)) { row.hit = .001; R.events.rowHits = (R.events.rowHits || 0) + 1; obHit(row.ob); }
    }
    R.rows = R.rows.filter(row => row.w - R.dist > (DUCKS[row.kind] && !row.hit ? -.3 : ZN) && row.hit < .6);   // what you duck under carries on over you
  }
  const BOX_H = .045;
  const DESK_OUT = .7;   // where a desk meets the cubicle wall   // a little cushion: the tail of a jump still clears it
  // a moving-day obstacle that hits you: no soul for it, and the run isn't clean
  function obHit(ob) { if (!ob) return; ob.hit = true; if (R.event && R.event.kind === 'move') R.event.clean = false; }
  const knock = (ob, cause) => hurtBull(1, cause);
  function updateBoxes(dt) {
    for (const bx of R.boxes) {
      const z = bx.w - R.dist;
      if (bx.hit) { bx.hit += dt; continue; }
      const inPath = bx.s ? bx.s * (bull.u - bx.inner) > -.06 : Math.abs(bx.u - bull.u) < .14;   // a desk: anywhere from its end to the wall
      if (Math.abs(z - bull.bz) < .02 && inPath && bull.jh < BOX_H && knock(bx.ob, 'box')) { bx.hit = .001; obHit(bx.ob); }
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
    R.workers = R.workers.filter(wk => wk.w - R.dist > ZN - .3);
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
    // a burst where the blade meets the paper (no line from him to it: that read as a laser); the swoosh is on him
    R.fx.push({ k: 'spark', x: PX(p.u, p.z), y: YH(p.z, p.h), s: Math.max(.6, sc(p.z)), col: '#bfefff', t: 0, dur: .2, a: (p.u * 7 + p.z * 13) % 6 });
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
            b.rally = null; b.jam = Math.max(b.jam, TUNE.rally.stun); b.jamMax = b.jam; b.jamTag = 'STUNNED x3'; R.shake = .5; R.events.smashes = (R.events.smashes || 0) + 1;
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
        if (hurtBull(1, p.rally ? 'rally' : p.kind)) { p.dead = true; poof(p.u, p.z, p.h); if (p.rally) { R.boss.rally = null; emit('rally_lost'); laugh(); if (R.hearts > 0) taunt('miss'); } continue; }
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
    // dragged along the rug: dust kicks up at his heels (cosmetic)
    if (P.st === 'on' && onRunner() && !bull.crouch && bull.jh <= 0 && Math.random() < dt * 14) {
      const x = PX(bull.u, bull.bz) + fxr(-9, 9), y = FY(bull.bz) - fxr(0, 3);
      R.fx.push({ k: 'smoke', x, y, t: 0, dur: fxr(.3, .5) });
    }
    const can = (R.phase === 'hall' && beat().pulls && !R.event) ||
      (R.phase === 'boss' && R.boss.st === 'fight' && R.boss.jam <= 0 && !R.boss.rally && !R.roll);
    if (P.st === 'idle') {
      if (can && R.t >= P.next) {
        P.st = 'warn'; P.t = 0; Snd.play('warn');
        // from phase 2 every other pull also makes the floor beside the rug live (still called a spray in the code): it
        // shimmers blue while it warns, then shocks anyone standing off the rug. Ride the rug toward the mouth, or jump.
        P.spray = R.phase === 'boss' && R.boss.ph >= 2 && (P.count + 1) % 2 === 0; P.sprayT = 0;
        if (P.spray) Snd.play('rev');
        if (P.spray && !R.events.sprayHint && !R.talk) { R.events.sprayHint = true; R.banner = { text: 'RIDE THE RUG', t: 0, dur: 99, pull: true }; live('The floor beside the rug is going live. Ride the rug.'); }
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
          P.sprayT = .45; Snd.play('surge');
        }
        // off the rug with your feet on the floor, you get a shock
        if (bull.jh < .03 && Math.abs(bull.u) > TUNE.runner + TUNE.liveEdge && !bull.mouth && !bull.spat && hurtBull(1, 'live')) {
          const k = sc(bull.bz), x = PX(bull.u, bull.bz), y = YH(bull.bz, 0);
          for (let i = 0; i < 10; i++) R.fx.push({ k: 'spark', x: x + fxr(-10, 10) * k, y: y - fxr(0, 40) * k, s: .8, col: Math.random() < .5 ? '#7fd4ff' : '#ffffff', t: 0, dur: fxr(.15, .3), a: Math.random() * 6 });
          Snd.play('surge');
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
    // at its last stand it's a proper rally, at the short end of the phase's range: win it and that's the finish
    const last = b.hp <= TUNE.lastStand;
    b.rally = { count: 0, target: last ? lo : marathon ? TUNE.rally.marathon[b.ph - 1] : lo + Math.floor(rnd() * (hi - lo + 1)), marathon: marathon && !last };
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
  // Once the two souls are in the gun, they hold it: the surge still comes, but it breaks on them in a shower of gold.
  const soulsHold = () => R.hint && R.hint.landed >= TUNE.soulHint.souls;
  function fizzle() {
    shove(6);
    const m = muzzleXY(); R.fx.push({ k: 'bolt', x0: 120, y0: BACK.y0 + 19, x1: m.x, y1: m.y, t: 0, dur: .3 });
    for (let j = 0; j < 12; j++) R.fx.push({ k: 'spark', x: m.x + fxr(-5, 5), y: m.y + fxr(-5, 5), s: .8, col: j % 2 ? '#ffd44a' : '#ffffff', t: 0, dur: .4, a: Math.random() * 6 });
    R.shake = Math.max(R.shake, .15); Snd.play('surge');
  }
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
  // A row from its mouth that covers the whole floor: a carpet of staples. Jump it.
  function spitRow(kind) {
    R.rows.push({ w: R.dist + .93, kind, hit: 0, v: TUNE.bossRows[kind] });
    R.boss.spit = .35; Snd.play('spit');
  }
  // Each phase cycles through its own attacks; 'marathon' is a long rally, once a phase (a normal one after that).
  const ATTACKS = [['rally', 'bundle', 'volley', 'marathon', 'planes'], ['fan', 'marathon', 'bundle', 'planes', 'rally', 'carpet', 'volley'], ['rally', 'surge', 'marathon', 'rewind', 'planes', 'rally', 'fan', 'volley', 'carpet']];
  function attack(kind) {
    shove(7);   // it lunges as it spits
    if (kind === 'bundle') spitBundle();
    else if (kind === 'volley') R.boss.volley = { left: TUNE.volley.n[R.boss.ph - 1], t: 0 };
    else if (kind === 'planes') throwPlanes();
    else if (kind === 'fan') spitFan();
    else if (kind === 'carpet') spitRow(kind);
    else if (kind === 'surge') { if (R.armed === false) serveRally(); else if (soulsHold()) fizzle(); else surge(); }
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
    b.jam = TUNE.jamT * (1 + TUNE.rideJam * close); b.jamMax = b.jam; b.jamTag = 'JAMMED x3'; b.volley = null; endPull();
    R.events.jams = (R.events.jams || 0) + 1; emit('jam', { amount: Math.round(b.jam * 10) / 10 }); bark('jam');
    Snd.play('jam');
  }
  function bossDamage(n, by) {
    const b = R.boss;
    if (b.st !== 'fight') return;
    // its last stand: the blaster can wear it down only so far; the finish has to be its own paper sent back at it
    if ((by || 'blaster') === 'blaster') n = Math.max(0, Math.min(n, b.hp - TUNE.lastStand));
    if (n <= 0) { b.tick = .05; return; }
    emit('boss_damage', { amount: n, by: by || 'blaster' });
    b.hp = Math.max(0, b.hp - n);
    // reaching its last stand is an event: it staggers, smoke pours out of it, the music drops, then it serves the final rally
    if (!b.lastStand && b.hp > 0 && b.hp <= TUNE.lastStand) {
      b.lastStand = true; b.atk = Math.max(b.atk, 2); b.shudder = 1.6; R.freeze = Math.max(R.freeze, .12); R.shake = Math.max(R.shake, .4);
      for (let i = 0; i < 14; i++) R.fx.push({ k: 'smoke', x: fxr(BACK.x0 + 8, BACK.x1 - 8), y: fxr(BACK.y0 + 10, BACK.y1 - 8), t: -i * .06, dur: fxr(.8, 1.3) });
      Snd.duck && Snd.duck(1.8);
    }
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
    const list = b.hp <= TUNE.lastStand ? ['rally'] : ATTACKS[b.ph - 1];
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
    // jammed: smoke curls out of its mouth and sparks spit at the corners
    if (b.jam > 0 && b.st === 'fight' && Math.random() < dt * 9) R.fx.push({ k: 'smoke', x: fxr(BACK.x0 + 16, BACK.x1 - 16), y: BACK.y1 - 12, t: 0, dur: fxr(.6, 1) });
    if (b.jam > 0 && b.st === 'fight' && Math.random() < dt * 6) R.fx.push({ k: 'spark', x: Math.random() < .5 ? BACK.x0 + 12 : BACK.x1 - 12, y: BACK.y1 - 9, s: .6, col: '#ffd44a', t: 0, dur: .2, a: Math.random() * 6 });
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
      if (b.jam <= 0 && b.jamTag !== 'STUNNED x3') {   // it spits the rug back out
        popText('PTOO!', 120, BACK.y1 - 6, '#ff9628'); Snd.play('spit'); R.shake = Math.max(R.shake, .15);
        for (let i = 0; i < 10; i++) R.fx.push({ k: 'spark', x: 120 + fxr(-8, 8), y: BACK.y1 - 4, s: .9, col: i % 2 ? '#9a2a1e' : '#e0a030', t: 0, dur: .4, a: Math.random() * 6 });
      }
      if (Math.random() < dt * 8) R.fx.push({ k: 'smoke', x: fxr(BACK.x0 + 10, BACK.x1 - 10), y: BACK.y0 + 4, t: 0, dur: 1 });
      return;
    }
    // a volley fires its scraps one after another
    if (b.volley) {
      b.volley.t -= dt;
      if (b.volley.t <= 0) { spitScrap(); b.volley.t = TUNE.volley.gap; if (--b.volley.left <= 0) b.volley = null; }
      return;
    }
    // no attacks while the runner warns or the floor is live, and a rally waits for a pull to end
    // at its last stand it only serves: win a rally to finish it
    const list = b.hp <= TUNE.lastStand ? ['rally'] : ATTACKS[ph - 1], next = list[b.atkN % list.length];
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
    if (!soulsInGun()) riseAll();   // with the two souls in the gun, the rest rise with them after their goodbye
    for (let i = 0; i < 24; i++) R.fx.push({ k: 'bit', x: fxr(BACK.x0 + 6, BACK.x1 - 6), y: fxr(BACK.y0 + 6, BACK.y1 - 6), vx: fxr(-70, 70), vy: fxr(-90, -10), t: 0, dur: fxr(.8, 1.4) });
    Snd.play('explode');
    talk('RUG NOT FOUND.', 'shredder');
  }
  // every soul freed on the floor drifts up past him and away (up to 40 of them, cosmetic)
  function riseAll() {
    for (let i = 0; i < Math.min(40, R.souls); i++) R.fx.push({ k: 'rise', x: fxr(10, W - 10), y: H + 6 + fxr(0, 60), vy: -fxr(18, 34), ph: fxr(0, 6), t: -i * .05, dur: 6 });
  }
  // ---------- the souls' hint ----------
  // A glimpse of the mega stream, saved for the roof. Nothing announces it: the first time he wins the blaster back,
  // two souls leave the counter and fly into the gun, each landing with one soft bell and adding a stream, and the
  // streams stay with him for the rest of the fight (they pause while the blaster's knocked away and come back with it).
  // The counter keeps its souls; the streams do normal damage and cost nothing extra.
  // It takes its time, so it registers: a beat before the first soul lifts off the counter, the souls slow and far
  // apart, the music ducked under the bells, the Shredder and the runner holding off until the last one lands, and a
  // tiny hitch in time as each one hits the gun.
  function startHint() {
    const T = TUNE.soulHint;
    R.events.soulHint = true;
    R.hint = { t: -T.wait, landed: 0, streams: 1 };
    const arrive = T.wait + (T.souls - 1) * T.gap + T.fly;
    R.boss.atk = Math.max(R.boss.atk, arrive + .6);
    if (R.pull.st === 'idle') R.pull.next = Math.max(R.pull.next, R.t + arrive + 1);
    Snd.duck && Snd.duck(arrive + .5);
  }
  const soulsInGun = () => !!(R.hint && R.hint.streams > 1);
  // Goodbye (the owner's idea, Oct 12): when the Shredder's beaten, after its last line, the two souls leave the gun,
  // come round in front of him at head height, salute, and one says "GOOD LUCK." with a bell; then they float up and
  // away, and every soul freed on the floor rises with them. Then the clear (TUNE.soulBye.later seconds later than
  // without them). Cosmetic and on the clock: it draws in drawBye.
  function updateBye(dt) {
    const T = TUNE.soulBye, H = R.hint;
    if (!soulsInGun() && !(H && H.bye)) return;
    if (!H.bye) { if (R.phaseT < T.at || R.talk) return; H.bye = { t: 0, from: muzzleXY() }; H.streams = 1; Snd.play('bell', 0); return; }
    const B = H.bye; B.t += dt;
    if (B.t > T.say && !B.said) { B.said = true; Snd.play('bell', 1); live('The two souls salute: good luck.'); }
    if (B.t > T.leave && !B.rose) { B.rose = true; riseAll(); }
  }
  function updateHint(dt) {
    const H = R.hint, T = TUNE.soulHint;
    if (!H) return;
    if (R.phase === 'win') return;   // the souls stay in the gun for their goodbye (updatePhase)
    if (R.phase !== 'boss') { R.hint = null; return; }
    if (R.armed === false) return;   // knocked out of his hands: the streams wait for him
    H.t += dt;
    while (H.landed < T.souls && H.t >= H.landed * T.gap + T.fly) {
      const i = H.landed++;
      const m = muzzleXY();
      for (let j = 0; j < 6; j++) R.fx.push({ k: 'spark', x: m.x + fxr(-3, 3), y: m.y + fxr(-3, 3), s: .7, col: j % 2 ? '#ffd44a' : '#f4f0ff', t: 0, dur: .3, a: Math.random() * 6 });
      H.streams = i + 2; Snd.play('bell', i);
      R.freeze = Math.max(R.freeze, .1); R.shake = Math.max(R.shake, .08);
    }
  }
  // the goodbye: out of the gun to either side of the hall at head height, the salute (one flipped), the words in a
  // small bubble between them, then up and away
  function drawBye(B) {
    const T = TUNE.soulBye, t = B.t;
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1, tx = VX + sd * 20, ty = 70;
      let x, y, a = 1;
      if (t < T.come) { const e = t / T.come, ee = e * e * (3 - 2 * e); x = B.from.x + (tx - B.from.x) * ee + Math.sin(Math.PI * e) * sd * 18; y = B.from.y + (ty - B.from.y) * ee - Math.sin(Math.PI * e) * 16; }
      else if (t < T.leave) { x = tx; y = ty + Math.sin(t * 3 + i) * 1.5; }
      else { const u = t - T.leave; x = tx + sd * u * 10 + Math.sin(u * 3 + i) * 3; y = ty - u * u * 12 - u * 18; a = Math.max(0, 1 - u / 1.2); }
      if (a <= 0) continue;
      const sal = t > T.salute && t < T.leave, img = sal ? A.SOUL_SALUTE : A.GHOST, w = A.uw(img) * 2, h = A.uh(img) * 2;
      g.save(); g.globalAlpha = a; disc(g, Math.round(x), Math.round(y), 10, 'rgba(255,212,74,.2)');
      if (sal && sd < 0) { g.translate(Math.round(x), 0); g.scale(-1, 1); g.drawImage(img, -9, Math.round(y - 11), w, h); }
      else g.drawImage(img, Math.round(x - 9), Math.round(y - 11), w, h);
      g.restore();
    }
    if (t > T.say && t < T.leave - .1) {
      const text = 'GOOD LUCK.', tw = textWidth(text), bx = Math.round(VX - tw / 2 - 4), by = 44;
      rect(g, bx - 1, by - 1, tw + 10, 11, '#1a1418'); rect(g, bx, by, tw + 8, 9, '#fff6e2');
      rect(g, VX - 1, by + 9, 3, 2, '#fff6e2'); rect(g, VX - 1, by + 11, 3, 1, '#1a1418');
      txt(g, text, bx + 4, by + 2, '#1a1418');
    }
  }
  // the souls on their way from the counter to the gun, drawn over the scene
  function drawHintSouls() {
    const H = R.hint, T = TUNE.soulHint;
    if (!H) return;
    if (H.bye) { drawBye(H.bye); return; }
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
      g.drawImage(A.GHOST, Math.round(x - 9), Math.round(y - 11), 18, 22);
    }
  }
  function killTemp(tp, how) {
    if (tp.dead) return;
    tp.dead = true; R.freeze = .045;
    if (R.hearts < TUNE.hearts && rnd() < TUNE.coffeeDrop) addPickup('coffee', tp.cub.w - R.dist + .06, tp.cub.s * .5);
    const at = posOf(tp), x = PX(at.u, at.z), y = YH(at.z, at.h), s = sc(at.z) * .85;
    if (how === 'slash') R.fx.push({ k: 'half', x, y, s, t: 0, dur: .5, img: tempLook(tp).hit[0] }); else poof(at.u, at.z, at.h);
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
      updateBye(dt);
      const bye = R.hint && R.hint.bye ? TUNE.soulBye.later : soulsInGun() ? 99 : 0;   // the clear waits for the goodbye
      if (R.phaseT > 1.6 + bye && !R.talk) bark('clear');
      if (R.phaseT > 2.1 + bye && !R.events.clearBanner) {
        R.events.clearBanner = true;
        R.banner = { text: 'THE 13TH FLOOR CLEAR', sub: 'SOULS FREED: ' + R.souls, t: 0, dur: 99 };
        Snd.play('clear'); live('The 13th Floor clear.');
      }
      if (R.banner && R.events.clearBanner) R.banner.sub = 'SOULS FREED: ' + R.souls;
      if (R.phaseT > 4.4 + bye) endRun('clear');
    } else if (R.phase === 'dead') {
      if (R.phaseT > .12 && !(R.events.said && R.events.said.rugged)) { if (R.talk) { R.talk = null; Snd.hush(); } bark('rugged', true); }   // his WHOA! cuts off a taunt
      if (R.phaseT > TUNE.deadWait) endRun('rugged');
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
      scroll: R.dist * WZ, rug: -R.roff * WZ, power: dk >= .5 ? 0 : 1 - dk * .75, dark: dk >= .5, house, steady: true,
      rail: R.phase === 'hall' || R.phase === 'wake' ? (R.event ? (R.event.kind === 'move' ? lin('#e8b030') : null) : lin(BEATS[R.beat].rail)) : null,
      look: lookNow(),
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
    // what the set gives off (screens, signs, lamps, a vending machine), the nearest few
    const want = [];
    for (const it of setItems()) { const z = it.w - R.dist; if (z < 1.3 && z > -.1) SETS.lights(it, z, (u, zz, h, cr, cg, cb) => want.push([zz, u, h, cr, cg, cb])); }
    want.sort((a, b) => a[0] - b[0]);
    for (const [z, u, h, cr, cg, cb] of want.slice(0, 8)) at(u, z, h, cr, cg, cb);
    const b = R.boss, zS = shredderZ();
    // once it's woken, the end of the hall is lit, so you can see what you're fighting
    if (zS < 1.6 && R.phase !== 'hall') at(0, zS - .25, .85, .9, .78, .62);
    if (zS < 1.6 && (b.st === 'awake' || b.st === 'fight') && b.jam <= 0) at(0, zS - .03, .64, 1.6, .2, .1);
    if (zS < 1.6 && b.rev > 0 && b.st === 'fight') at(0, zS - .03, .2, 1.2, .15, .08);
  }
  // Where the katana cut the rug: torn across with a ragged edge and loose threads, and the far piece whips away
  // toward the Shredder, opening a gap of bare floor.
  function drawCut() {
    if (!R.cut || R.cut.z <= 0) return;
    const z = R.cut.z, gap = Math.min(.14, R.cut.t * .55), zf = z + gap, rw = TUNE.runner;
    const fade = R.cut.t > .9 ? 1 - (R.cut.t - .9) / .3 : 1;
    g.save(); g.globalAlpha = Math.max(0, fade);
    poly(g, '#1e1c26', [[PX(-rw, z), FY(z)], [PX(rw, z), FY(z)], [PX(rw, zf), FY(zf)], [PX(-rw, zf), FY(zf)]]);
    for (const [zz, dir] of [[z, -1], [zf, 1]]) {
      const y = FY(zz), x0 = PX(-rw, zz), x1 = PX(rw, zz), k = sc(zz);
      for (let x = Math.round(x0), i = 0; x < x1; x += Math.max(1, Math.round(2 * k)), i++) {
        const jag = (i * 7) % 3, len = Math.max(1, Math.round((1 + (i * 5) % 3) * k * 1.5));
        rect(g, x, y + dir * jag * k * .5 - (dir < 0 ? len : 0), 1, len, i % 3 ? '#8a1c18' : '#f0e0b0');   // ragged weave, loose threads
      }
    }
    g.restore();
  }
  const mh = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
  // A live floor: the floor beside the rug goes live. While it warns, a blue shimmer creeps down from the Shredder; then
  // arcs crawl the tiles on both sides and stop at the rug's edge with a spit of sparks (the rug insulates). Cosmetic: it
  // hashes the clock, no randomness.
  function sprayLanes() {
    const P = R.pull;
    if (!P.spray || (P.st !== 'warn' && P.st !== 'on')) return;
    const rn = TUNE.runner + .04, warn = P.st === 'warn', t = R.t, fr = Math.floor(t * 20);
    const reach = warn ? Math.min(1, P.t / .9) : 1, zFar = 1, zNear = zFar - (zFar - ZN) * reach;
    g.save();
    g.globalAlpha = warn ? .10 + .08 * Math.sin(t * 30) : .22;
    for (const sd of [-1, 1]) quadF(g, '#3aa8e0', sd > 0 ? rn : -.66, sd > 0 ? .66 : -rn, zNear, zFar);
    g.globalAlpha = 1;
    // the tile seams light up
    for (const sd of [-1, 1]) for (let zz = .02; zz < zFar; zz += .08) {
      if (zz < zNear) continue;
      const a = warn ? .25 : .5 + .4 * mh(zz * 50, fr);
      g.globalAlpha = a; quadF(g, '#7fd4ff', sd > 0 ? rn : -.66, sd > 0 ? .66 : -rn, zz, zz + .004);
    }
    g.globalAlpha = 1;
    // arcs
    const n = warn ? 2 : 6;
    for (const sd of [-1, 1]) for (let i = 0; i < n; i++) {
      const z = zNear + (zFar - zNear) * ((i / n + mh(i, sd) * .1 + t * .25) % 1), k = sc(z);
      if (z < ZN + .01) continue;
      const pts = []; const segs = 7;
      for (let j = 0; j <= segs; j++) {
        const u = sd * (rn + (.66 - rn) * j / segs), dz = (mh(i * 13 + j, fr + sd) - .5) * .06;
        pts.push([PX(u, z + dz), FY(z + dz) - (j && j < segs ? mh(j, fr * 3 + i) * 3 * k : 0)]);
      }
      for (const [col, w] of [['#3aa8e0', Math.max(1, 3 * k)], ['#e8f8ff', Math.max(.5, 1 * k)]]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
      }
      // it stops at the rug's edge with a spit of sparks
      const [ex, ey] = pts[0];
      for (let q = 0; q < 3; q++) rect(g, ex + (mh(q, fr + i) - .5) * 6 * k, ey - mh(q + 9, fr + i) * 5 * k, Math.max(1, k), Math.max(1, k), q ? '#ffffff' : '#7fd4ff');
    }
    g.restore();
  }
  // Cracks on its panels, clear of the sign, the eyes and the mouth, in the order they appear.
  const CRACKS = [[[8, 6], [13, 12], [11, 17]], [[66, 5], [62, 10], [64, 15], [60, 19]], [[6, 22], [11, 26], [9, 31]], [[68, 24], [63, 27], [66, 31]],
    [[16, 4], [19, 9], [17, 12]], [[58, 8], [55, 13]], [[12, 14], [18, 17]], [[62, 16], [57, 22]]];
  // The Shredder: a steel shredding machine built across the end of the hall, drawn at the picture's full size. A riveted
  // steel body in panels, an amber SHRED-O display, its two eyes in dark sockets, side vents with paper caught in them,
  // a hazard-striped feed under the eyes and the mouth with its blades, fed by the runner rug. It wears down: cracks
  // and loose panels the more damage it has taken.
  const hr = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, Math.max(.5, Math.round(w * 2) / 2), Math.max(.5, Math.round(h * 2) / 2)); };
  function drawShredder() {
    const b = R.boss, x0 = BACK.x0, x1 = BACK.x1, y0 = BACK.y0, y1 = BACK.y1, w = x1 - x0, t = R.t;
    const dead = b.st === 'dead', hit = b.flash > 0;
    const steel = hit ? '#8a90a2' : dead ? '#34343e' : '#4c5262', dark = dead ? '#24242c' : '#32363f', lite = hit ? '#ffffff' : b.tick > 0 ? '#c8ccd8' : '#7a8092';
    // the body: a darker frame, then three panels, a lit top edge, seams and rivets
    hr(x0 + 3, y0 + 2, w - 6, y1 - y0 - 2, '#1a1418');
    hr(x0 + 4, y0 + 3, w - 8, y1 - y0 - 3, dark);
    for (const [a, c] of [[x0 + 5, x0 + 24], [x0 + 25.5, x1 - 25.5], [x1 - 24, x1 - 5]]) hr(a, y0 + 4, c - a, y1 - y0 - 17, steel);
    hr(x0 + 4, y0 + 3, w - 8, 1, lite);
    hr(x0 + 4, y0 + 3.5, w - 8, .5, hit ? '#ffffff' : '#9aa0b2');
    for (const x of [x0 + 6, x0 + 22.5, x1 - 23.5, x1 - 7]) for (const y of [y0 + 5.5, y0 + 30]) { hr(x, y, 1, 1, '#1a1418'); hr(x, y, .5, .5, '#a8aec0'); }
    // side vents, with shredded paper caught in the slats
    for (const vx of [x0 + 8, x1 - 20]) {
      hr(vx, y0 + 23, 12, 7, '#1a1418');
      for (let i = 0; i < 4; i++) hr(vx + .5, y0 + 24 + i * 1.5, 11, .5, '#5a6070');
      for (let i = 0; i < 3; i++) { const px = vx + 2 + i * 4 + (Math.floor(t * 3 + i) % 2) * .5; hr(px, y0 + 26 + (i % 2), .5, 3 + (i % 2), '#ecedf6'); }
    }
    // the display
    hr(102.5, y0 + 5.5, 35, 10, '#1a1418'); hr(103.5, y0 + 6.5, 33, 8, '#2a0e0a');
    txt(g, 'SHRED-O', 120, y0 + 8, '#ffd44a', 1, 'center');
    // eye sockets
    for (const ex of [104.5, 125.5]) { hr(ex, y0 + 15, 11, 7, '#1a1418'); hr(ex + .5, y0 + 15.5, 10, 6, '#0e0c12'); }
    shredderEyes();
    // it wears down: cracks, and a panel hanging loose at the end
    const wear = b.st === 'fight' || dead ? 1 - b.hp / TUNE.bossHP : 0, n = Math.floor(wear * CRACKS.length * 1.15);
    for (let i = 0; i < Math.min(n, CRACKS.length); i++) { const c = CRACKS[i]; for (let j = 1; j < c.length; j++) line(g, x0 + c[j - 1][0], y0 + c[j - 1][1], x0 + c[j][0], y0 + c[j][1], '#14141a'); }
    if (wear > .7) { hr(x1 - 24, y0 + 4, 19, 1, '#1a1418'); hr(x1 - 23, y0 + 5, 1, 6, '#1a1418'); }
    if (b.ph >= 3 && b.st === 'fight' && Math.floor(t * 9) % 4 === 0) { hr(x1 - 12, y0 + 9, 1, 1, '#ffd44a'); hr(x1 - 10, y0 + 7, 1, 1, '#fff6e2'); }
    // the feed: a hazard-striped lip over the mouth
    const my = y1 - 13, open = b.spit > 0 ? 2 : 0;
    hr(x0 + 8, my - 4 - open, w - 16, 3, '#1a1418');
    for (let x = x0 + 8.5, i = 0; x < x1 - 8.5; x += 3, i++) hr(x, my - 3.5 - open, Math.min(3, x1 - 8.5 - x), 2, i % 2 ? '#1a1418' : '#ffd21e');
    // the mouth, fed by the runner
    hr(x0 + 10, my - open, w - 20, 9 + open, '#09070b');
    if (b.spit > 0) hr(x0 + 12, my + 2, w - 24, 4, '#3a1010');
    shredderTeeth();
    // jammed: the torn end of the rug stuffed in its mouth, a flap hanging out
    if (b.jam > 0 && !dead) {
      hr(x0 + 13, my + 1, w - 26, 6, '#1a1418'); hr(x0 + 14, my + 1.5, w - 28, 5, '#9a2a1e');
      for (const yy of [my + 2.5, my + 5]) hr(x0 + 14, yy, w - 28, .5, '#e0a030');
      hr(115, my + 6, 10, 4, '#9a2a1e'); hr(115, my + 8, 10, .5, '#e0a030');
      for (let i = 0; i < 6; i++) hr(115.5 + i * 1.6, my + 10, .5, 1 + (i % 2), '#f0e0b0');
    }
    hr(PX(-TUNE.runner, 1), my + 9, PX(TUNE.runner, 1) - PX(-TUNE.runner, 1), 4, '#5a1412');
    // feet, either side of the rug
    for (const fx of [x0 + 5, x1 - 13]) { hr(fx, y1 - 2.5, 8, 2.5, '#1a1418'); hr(fx + .5, y1 - 2, 7, 1.5, '#5a6070'); }
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
  const SHC = A.canvas(W * 2, H * 2), shg = SHC.getContext('2d');
  shg.imageSmoothingEnabled = false;
  function withShredder(fn) {
    const b = R.boss, main = g;
    shg.setTransform(1, 0, 0, 1, 0, 0); shg.clearRect(0, 0, W * 2, H * 2); shg.setTransform(2, 0, 0, 2, 0, 0);
    g = shg; try { fn(); } finally { g = main; }
    const live = b.st === 'fight' || b.st === 'awake', fast = b.ph === 3 || b.hp < 15;
    const breathe = live ? Math.sin(R.t * (fast ? 4.2 : 2.4)) * .012 : 0;
    const k = clamp(1 + (b.push || 0) * .07 + breathe, .88, 1.14);
    const jx = (b.shudder > 0 || (b.jam > 0 && live) || (live && b.hp < 15 && Math.random() < .3)) ? Math.round(fxr(-1.4, 1.4)) : 0;
    const sx = BACK.x0 - 8, sy = BACK.y0 - 22, sw = BACK.x1 - BACK.x0 + 16, sh = BACK.y1 - sy + 4, fy = BACK.y1;
    // further down the hall it shrinks toward the vanishing point
    const zS = shredderZ(), kv = sc(zS) / sc(1);
    const dx = 120 - (120 - sx) * k + jx, dy = fy - (fy - sy) * k + Math.max(0, b.push || 0) * 1.5;
    g.drawImage(SHC, sx * 2, sy * 2, sw * 2, sh * 2, Math.round((VX + (dx - VX) * kv) * 2) / 2, Math.round((HY + (dy - HY) * kv) * 2) / 2, Math.round(sw * k * kv * 2) / 2, Math.round(sh * k * kv * 2) / 2);
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
  function drawSign(sg, z) {
    // drawn at 1x so the 3x5 lettering stays crisp, hung high so it passes over the action; it drops in with a bounce
    const w = sg.img.width, h = sg.img.height, rest = YH(z, .93), k = clamp((R.t - (sg.born || 0)) / .5, 0, 1);
    const ease = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2), y = CY(z) - h + (rest - CY(z) + h) * ease;
    line(g, 120 - w * .35, CY(z), 120 - w * .35, y, '#4c4856'); line(g, 120 + w * .35, CY(z), 120 + w * .35, y, '#4c4856');
    g.drawImage(sg.img, Math.round(120 - w / 2), Math.round(y), w, h);
  }
  // which of the three temps sits at this desk: from where the desk is, so it never touches the run's dice
  const tempLook = tp => A.TEMPS[Math.floor(Math.abs(tp.cub.w * 7.3 + tp.cub.s)) % A.TEMPS.length];
  // the frame for what it's doing: peeking up (and ducking back), up and glaring, the wad held up to throw, the throw
  function tempFrame(tp) {
    const L = tempLook(tp), t = tp.t, two = fr => fr[Math.floor(R.t * 4 + tp.cub.w * 5) % fr.length];
    if (tp.st === 'down' || tp.pop < .8) return two(L.peek);
    if (!tp.threw && t > .25) return L.wind[0];
    if (tp.threw && tp.will && t < .85) return L.throw[0];
    return two(L.up);
  }
  // where a temp's head is drawn: left, width, foot, height
  function tempBox(tp, zt) {
    const s = sc(zt) * .85, w = Math.max(2, Math.round(26 * s)), h = Math.max(2, Math.round(15 * s));
    return { s, w, h, x: Math.round(PX(tp.cub.s * .8, zt) - w / 2), yb: YH(zt, tp.cub.top - .12 + tp.pop * .17) };
  }
  function drawTemp(tp, zt) {
    // the frame is scaled so its rug fills the box; its collar and tie hang below, behind the desk's front
    const { w, h, x, yb } = tempBox(tp, zt), img = tempFrame(tp), R0 = A.TEMP_RUG, k = w / R0.w, top = yb - h;
    g.drawImage(img, Math.round((x - R0.x * k) * 2) / 2, Math.round((top - R0.y * k) * 2) / 2, img.width * k, img.height * k);
  }
  // the tell: a temp about to throw flashes a ! first (it glows, so it reads in the dark too)
  function tempTell(tp, zt) {
    if (!(tp.will && tp.st === 'up' && !tp.threw && tp.t > .12 && Math.floor(tp.t * 12) % 3)) return;
    const { w, h, x, yb } = tempBox(tp, zt), tx = Math.round(x + w / 2), ty = Math.round(yb - h - 10);
    rect(g, tx - 3, ty - 1, 7, 9, '#1a1418'); rect(g, tx - 2, ty, 5, 7, '#fff6e2'); txt(g, '!', tx - 1, ty + 1, '#d63428');
  }
  // The jump cue: while something on the floor is at the distance to jump it, the floor under it glows yellow and
  // pulses, so the moment to jump reads on a phone, where depth is hard to judge.
  const JUMP_CUE = [.06, .45];   // seconds before it reaches him
  function jumpCue(z, u0, u1) {
    if (!(R.speed > 0)) return;
    const ta = (z - bull.bz) / R.speed; if (ta < JUMP_CUE[0] || ta > JUMP_CUE[1]) return;
    const z0 = z - .02, z1 = z + .035;
    g.save(); g.globalAlpha = Math.floor(R.t * 12) % 2 ? .7 : .45;
    poly(g, '#ffd44a', [[PX(u0, z0), FY(z0)], [PX(u1, z0), FY(z0)], [PX(u1, z1), FY(z1)], [PX(u0, z1), FY(z1)]]);
    g.restore();
  }
  // A low cubicle desk sticking out of the cubicles into the aisle: a laminate top on a modesty panel, its end
  // trimmed in hazard tape, a keyboard and a mug on it. Hit it and it judders and fades.
  function drawDesk(bx, z) {
    const s = bx.s, u0 = bx.inner, u1 = s * DESK_OUT, z1 = z + .06, top = .1, k = sc(z);
    const jud = bx.hit ? Math.sin(bx.hit * 40) * 2 * k : 0;
    if (!bx.hit) jumpCue(z, Math.min(u0, u1), Math.max(u0, u1));
    if (bx.hit) { g.save(); g.globalAlpha = Math.max(0, 1 - bx.hit * 2); }
    const P = (u, zz, h) => [PX(u, zz) + jud, YH(zz, h)];
    poly(g, '#1a1418', [P(u0, z, top + .012), P(u1, z, top + .012), P(u1, z, 0), P(u0, z, 0)]);
    poly(g, '#4a4e5c', [P(u0, z, top - .008), P(u1, z, top - .008), P(u1, z, 0), P(u0, z, 0)]);           // the modesty panel
    poly(g, '#d8d0bc', [P(u0, z, top), P(u1, z, top), P(u1, z1, top), P(u0, z1, top)]);                // the laminate top
    poly(g, '#a8a090', [P(u0, z, top), P(u1, z, top), P(u1, z, top - .012), P(u0, z, top - .012)]);    // its front edge
    // the end that sticks into the aisle: hazard tape down it, so it reads as in your way
    const ex0 = PX(u0, z) + jud, ey0 = YH(z, top), ey1 = FY(z), ew = Math.max(1.5, 3 * k);
    for (let y = ey0, i = 0; y < ey1; y += Math.max(1, 2 * k), i++) rect(g, ex0 - (s > 0 ? 0 : ew), y, ew, Math.max(1, 2 * k), i % 2 ? '#1a1418' : '#ffd21e');
    // a keyboard and a mug on it
    const kx = PX(u0 + s * .12, z + .02) + jud, ky = YH(z + .02, top), kw = Math.max(2, 10 * k);
    rect(g, kx - kw / 2, ky - Math.max(1, 1.5 * k), kw, Math.max(1, 1.5 * k), '#2a2c34');
    const mx = PX(u0 + s * .26, z + .03) + jud, my = YH(z + .03, top);
    rect(g, mx - 1.5 * k, my - 4 * k, Math.max(1, 3 * k), Math.max(1, 4 * k), '#e2483a');
    // a touch of life: a little green-shaded banker's lamp on the far end, lit, and a leaning stack of folders
    const lx = PX(u1 - s * .1, z + .04) + jud, ly = YH(z + .04, top);
    rect(g, lx - .5 * k, ly - 7 * k, Math.max(.5, 1 * k), 7 * k, '#c8a040');
    rect(g, lx - 4 * k, ly - 9 * k, 8 * k, Math.max(1, 3 * k), '#1f7a44'); rect(g, lx - 4 * k, ly - 9 * k, 8 * k, Math.max(.5, .8 * k), '#3cba6a');
    const fx = PX(u0 + s * .4, z + .02) + jud, fy = YH(z + .02, top);
    for (let i = 0; i < 3; i++) rect(g, fx - 4 * k + i * .6 * k, fy - (i + 1) * 1.6 * k, 8 * k, Math.max(.5, 1.4 * k), ['#e8c070', '#f2eee2', '#d8a850'][i]);
    if (bx.hit) g.restore();
  }
  function drawBox(bx, z) {
    if (bx.s) { drawDesk(bx, z); return; }
    if (!bx.hit) jumpCue(z, bx.u - .13, bx.u + .13);
    const s = sc(z), w = Math.max(3, A.BOX.width / 2 * s), h = Math.max(2, A.BOX.height / 2 * s);   // the carton is drawn at full size: half a unit a pixel
    const x = PX(bx.u, z);
    const y = FY(z) - (bx.hit ? Math.sin(bx.hit * 9) * 6 * s : 0);
    if (bx.hit) { g.save(); g.globalAlpha = 1 - bx.hit * 2; }
    g.drawImage(A.BOX, Math.round((x - w / 2) * 2) / 2, Math.round((y - h) * 2) / 2, w, h);
    if (bx.hit) g.restore();
  }
  function drawProj(p) {
    const s = sc(p.z), bundle = p.kind === 'bundle' || p.kind === 'scrap', img = p.kind === 'wad' ? A.WAD : bundle ? A.BUNDLE : p.kind === 'plane' ? A.PLANE : A.STAPLE;
    const big = (p.kind === 'scrap' ? .6 : 1) * (p.friendly ? 1 : bundle ? (p.rally ? 1.4 : 1.2) : 1.35), blink = Math.floor(R.t * 10 + p.spin) % 2;
    const w = Math.max(2, Math.round(A.uw(img) * s * big)), h = Math.max(1, Math.round(A.uh(img) * s * big)), x = PX(p.u, p.z), y = YH(p.z, p.h);
    if (p.friendly) shadow(p.u, p.z, A.uw(img) * .8);
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
    const star = img === A.STAPLE, rot = bundle ? Math.floor(p.spin * .8) % 4 : 0, ix = -Math.round(w / 2), iy = -Math.round(h / 2);
    g.save(); g.translate(Math.round(x), Math.round(y)); if (star) g.rotate(R.t * 12 + p.spin); else if (rot) g.rotate(rot * Math.PI / 2);   // the staple stars spin as they fly
    const ring = (col, d) => { const sil = tinted(img, col); for (const [dx, dy] of [[-d, 0], [d, 0], [0, -d], [0, d]]) g.drawImage(sil, ix + dx, iy + dy, w, h); };
    if (p.rally && !p.friendly) { ring('#d63428', 2); ring(blink ? '#ffffff' : '#ffb080', 1); }
    else if (!p.friendly) ring(blink ? '#ff3020' : '#ff9628', 1);
    g.drawImage(img, ix, iy, w, h);
    g.restore();
    if (p.friendly) { const k = Math.floor(p.spin) % 2; rect(g, x - w / 2 - 1 - k, y - 1, 1, 1, '#bfefff'); rect(g, x + w / 2 + k, y, 1, 1, '#bfefff'); }
  }
  const CHAIR_US = [-.5, -.3, -.1, .1, .3, .5];
  const BEAM_H = [.2, .235];   // moving day's plank: its underside and top, as a share of the hall's height

  function drawRow(row, z) {
    if (!row.hit && !DUCKS[row.kind]) jumpCue(z, -.66, .66);
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
      // moving day: a plank across two stepladders, at head height: duck under it. The ladders stand on the floor, so
      // you can see where it is (a bar hung from the ceiling read as clipping you either way); its underside is well
      // above his head crouched and level with his face standing. It carries on over him as he passes.
      const x0 = PX(-.62, z), x1 = PX(.62, z), pt = YH(z, BEAM_H[1]), pb = YH(z, BEAM_H[0]), lw = Math.max(1, Math.round(1.5 * k));
      for (const u of [-.58, .58]) {
        const xc = PX(u, z), half = 9 * k, fy = FY(z);
        for (const dx of [-half, half]) for (const [c, w] of [['#1a1418', lw + 2], ['#b8b0a0', lw]]) { g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(xc + dx, fy); g.lineTo(xc + dx * .25, pb); g.stroke(); }
        for (let i = 1; i < 4; i++) { const hw = half * (1 - .75 * i / 4); rect(g, xc - hw, fy + (pb - fy) * i / 4, hw * 2, Math.max(1, k), '#8a8478'); }
      }
      rect(g, x0 - 1, pt - 1, x1 - x0 + 2, pb - pt + 2, '#1a1418'); rect(g, x0, pt, x1 - x0, pb - pt, '#9a6a3a'); rect(g, x0, pt, x1 - x0, Math.max(1, (pb - pt) * .3), '#b88850');
    } else if (row.kind === 'carpet') {
      // a carpet of staples skittering across the whole floor, edges blinking red like all the Shredder's paper
      const w = Math.max(3, Math.round(A.uw(A.STAPLE) * k * 1.3)), h = Math.max(1, Math.round(A.uh(A.STAPLE) * k * 1.3));
      const sil = tinted(A.STAPLE, Math.floor(R.t * 10) % 2 ? '#ff3020' : '#ff9628');
      for (let u = -.6; u <= .61; u += .15) {
        const x = Math.round(PX(u, z) - w / 2 + (row.hit ? Math.sin(u * 9 + row.hit * 8) * 6 : 0)), y = Math.round(FY(z) - h - 1 - (Math.floor(R.t * 12 + u * 7) % 2));
        g.save(); g.translate(x + w / 2, y + h / 2); g.rotate(R.t * 10 + u * 5); g.translate(-w / 2, -h / 2);   // a carpet of them, spinning
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(sil, dx, dy, w, h);
        g.drawImage(A.STAPLE, 0, 0, w, h); g.restore();
      }
    }
    if (row.hit) g.restore();
  }
  // When you can cut the rug (the owner: "not clear when u can do it or what happened"): while it pulls him and he's
  // on it, a dashed "cut here" line flashes across the rug just ahead of his feet, with tiny scissors snipping at each
  // end (the owner's touch). In the fight it turns gold close to the mouth, where a cut jams it longer. Cosmetic.
  const SCISS = [['b.....b', '.b...b.', '..b.b..', '...p...', '.hh.hh.', '.hh.hh.'], ['...b...', '...b...', '...b...', '...p...', '.hh.hh.', '.hh.hh.']];
  function scissors(x, y, dir, open, col) {
    const pat = SCISS[open ? 0 : 1];
    for (let r = 0; r < pat.length; r++) for (let c = 0; c < pat[r].length; c++) {
      const ch = pat[r][c]; if (ch === '.') continue;
      const px = x + dir * (5 - r), py = y + (c - 3);   // turned on its side, blades pointing along the line
      rect(g, px - .5, py - .5, 2, 2, '#1a1418');
    }
    for (let r = 0; r < pat.length; r++) for (let c = 0; c < pat[r].length; c++) {
      const ch = pat[r][c]; if (ch === '.') continue;
      rect(g, x + dir * (5 - r), y + (c - 3), 1, 1, ch === 'h' ? '#ff9628' : ch === 'p' ? '#1a1418' : col);
    }
  }
  function cutCue() {
    const P = R.pull;
    if (P.st !== 'on' || !onRunner() || bull.crouch) return;
    const z = bull.bz + .07, close = clamp(bull.bz / TUNE.mouth, 0, 1), gold = R.phase === 'boss' && close > .5, on = Math.floor(R.t * 6) % 2;
    const rw = TUNE.runner - .02, x0 = PX(-rw, z), x1 = PX(rw, z), y = FY(z), col = gold ? '#ffd44a' : '#ffffff';
    for (let x = x0, i = 0; x < x1; x += 3, i++) rect(g, x, y - .5, Math.min(2, x1 - x), 1, on ? col : gold ? '#ff9628' : '#c8c0b0');
    const open = Math.floor(R.t * 8) % 2;
    scissors(x0 - 8, y, 1, open, col); scissors(x1 + 8, y, -1, open, col);
  }
  // What happened: while it's jammed, a JAMMED x3 tag over it with a gold bar draining for as long as your shots do
  // triple damage; when it runs out it spits the rug back out (PTOO!, in updateBoss).
  function jamBar() {
    const b = R.boss;
    if (!(b.jam > 0) || b.st !== 'fight' || !b.jamMax) return;
    const text = b.jamTag || 'JAMMED x3', tw = textWidth(text), x = 120 - Math.round(tw / 2), y = BACK.y0 - 13;
    rect(g, x - 3, y - 2, tw + 6, 13, '#1a1418'); otxt(g, text, x, y, '#ffd44a');
    rect(g, x - 2, y + 7, tw + 4, 3, '#3a2a10'); rect(g, x - 2, y + 7, Math.round((tw + 4) * b.jam / b.jamMax), 3, '#ffd44a');
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
  // and a hazard-yellow DUCK or JUMP rides the plank or the chairs.
  const LABELS = {};
  function label(text) {
    if (!LABELS[text]) {
      const img = A.canvas(A.textWidth(text) + 8, 11), b = img.getContext('2d');
      rect(b, 0, 0, img.width, 11, '#1a1418'); rect(b, 1, 1, img.width - 2, 9, '#e8b030'); txt(b, text, 4, 3, '#1a1418');
      LABELS[text] = img;
    }
    return LABELS[text];
  }
  // moving day's trapped souls: a soul in a soap-bubble shine, bobbing a little above the floor
  // A soul trapped in a bubble on moving day, drawn in depth order with the furniture, so what's in front hides it,
  // with a shadow under it.
  function drawTrapped(sl, z) {
    const k = sc(z), x = PX(sl.u, z), y = YH(z, .1) + Math.sin(R.t * 4 + sl.u * 5) * 2 * k, w = Math.round(A.uw(A.GHOST) * 2 * k), h = Math.round(A.uh(A.GHOST) * 2 * k);
    shadow(sl.u, z, A.uw(A.GHOST) * 1.6);   // its shadow on the floor says where it is
    g.drawImage(A.GHOST, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    g.save(); g.globalAlpha = .7; g.strokeStyle = '#bfefff'; g.lineWidth = Math.max(.5, k); g.beginPath(); g.arc(x, y, Math.max(w, h) * .75, 0, 6.29); g.stroke();
    g.globalAlpha = .9; rect(g, x - w * .4, y - h * .55, Math.max(1, k * 1.5), Math.max(1, k * 1.5), '#ffffff'); g.restore();
  }
  function moveMarks() {
    if (!R.event || R.event.kind !== 'move') return;
    for (const row of R.rows) {
      const ob = row.ob, z = row.w - R.dist;
      if (!ob || !ob.mark || row.hit || z < bull.bz || z > 1.02) continue;
      const img = label(DUCKS[row.kind] ? 'DUCK' : 'JUMP'), k = sc(z);
      const y = DUCKS[row.kind] ? YH(z, BEAM_H[1]) - img.height - 2 : FY(z) - Math.round(A.CHAIRS[0].height * k) - img.height - 3;
      g.drawImage(img, Math.round(VX - img.width / 2), Math.round(y));
    }
  }
  function glows() {
    const dk = darkness() >= .5;
    for (const sw of R.switches || []) drawSwitch(sw);
    for (const cb of R.cubs) {
      const z = cubZ(cb); if (z > 1.02) continue;
      if (cb.kind === 'cub') faded(fadeIn(z), () => {
        const k = sc(z), mx = PX(cb.s * .93, z), my = YH(z, cb.top), mw = Math.max(2, Math.round(10 * k)), mh = Math.max(2, Math.round(7 * k));
        rect(g, mx - mw / 2 + 1, my - mh + 1, Math.max(1, mw - 2), Math.max(1, mh - 2), monitor(cb));
      });
      const tp = cb.temp;
      if (!tp || tp.dead || tp.pop <= 0) continue;
      tempTell(tp, z + .06);
      if (dk && tp.pop > .3) {
        // its eyes, where they are on the rug (the same face as a flying carpshit's)
        const zt = z + .06, s2 = sc(zt) * .85, w = 26 * s2, h = 15 * s2, x = PX(cb.s * .8, zt), yt = YH(zt, cb.top - .12 + tp.pop * .17) - h, e = Math.max(1, Math.round(2 * s2)), q = w / A.TEMP_RUG.w / A.CARP_EYES.k;
        for (const ey of A.CARP_EYES) rect(g, x + ey.x * q - e / 2, yt + A.TEMP_RUG.h * w / A.TEMP_RUG.w / 2 + ey.y * q - e / 2, e, e, '#fff0aa');
      }
    }
    if (dk) for (const wk of R.workers) {
      const z = wk.w - R.dist; if (z > Math.min(1.5, shredderZ() - .01) || z < ZN || wk.kind === 'office') continue;
      for (const c of wk.carps) if (!c.dead) { const at = workerAt(c), x = PX(at.u, at.z), y = YH(at.z, at.h), e = Math.max(1, Math.round(2 * sc(at.z))), w = 26 * sc(at.z) * .8; rect(g, x - w * .25, y - 1, e, e, '#fff0aa'); rect(g, x + w * .17, y - 1, e, e, '#fff0aa'); }
    }
    if (dk) for (const f of R.flies) {
      const k = sc(f.z), x = PX(f.u, f.z), y = YH(f.z, f.h), e = Math.max(1, Math.round(2 * k));
      for (const ey of A.CARP_EYES) rect(g, x + ey.x * k - e / 2, y + ey.y * k - e / 2, e, e, '#fff0aa');
    }
    if (Math.floor(R.t * 13) % 11) for (const sg of R.signs) { const z = sg.w - R.dist; if (sg.neon && z < 1.02 && z > .05) drawSign(sg, z); }
    sprayLanes();
    cutCue(); jamBar();
    moveMarks();
    if (R.phase !== 'hall') withShredder(() => { shredderEyes(); shredderTeeth(); });
    else if (R.event && R.event.kind === 'dark') darkEyes();
    const list = [];
    for (const pk of R.pickups) { const z = pk.w - R.dist; if (z < 1.02) list.push([z, () => faded(fadeIn(z), () => drawPickup(pk, z))]); }
    for (const p of R.projs) list.push([p.z, () => drawProj(p)]);
    for (const s of R.shots) list.push([s.z, () => drawShot(s)]);
    list.sort((a, b) => b[0] - a[0]);
    for (const e of list) e[1]();
    drawFx('glow');
  }

  // ---------- what the core asks of the floor ----------
  // A fresh run (or a continue, from a checkpoint): the stations and sign it starts with.
  function newRun(r, b, at) {
    setMemo = new Map(); setCache = null; look = null;
    R = r; bull = b;
    if (at) {
      Object.assign(R, { beat: BEATS.length - 1, t: at.t, souls: at.souls, shown: at.souls, continues: at.continues + 1, bestStreak: at.bestStreak, speed: 0 });
      Object.assign(R.events, at.events, { bossAt: 0 });
      R.pull.count = 1;   // the runner has been explained already
    }
    R.workers = []; R.nextWorkW = R.dist + .5;
    if (!at) while (R.dist + AHEAD >= R.nextWorkW) { addWorker(R.nextWorkW); R.nextWorkW += rr(1.1, 1.7); }
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
  // How much of something far down the hall shows: scenery fades in from AHEAD, what you fight from the old far end.
  const fadeFar = z => clamp((AHEAD - z) / 1, 0, 1), fadeIn = z => clamp((1.04 - z) / (1.04 - TUNE.reach), 0, 1);
  const faded = (a, fn) => { if (a <= 0) return; if (a >= 1) { fn(); return; } g.save(); g.globalAlpha *= a; fn(); g.restore(); };
  // A carpshit at work at its desk (or cooler, or copier) against the wall, or the manager in its office.
  function drawWorker(wk, z) {
    if (wk.kind === 'office') { drawOffice(wk, z); return; }
    const K = A.WORK_KINDS[wk.kind], frames = A.work(wk.kind, wk.carps.map(c => !c.dead), wk.visor), f = Math.floor(R.t * 4 + wk.w * 7) % 4;
    const k = sc(z) * .8, w = Math.max(2, Math.round(K.w * k)), h = Math.max(2, Math.round(K.h * k));
    g.drawImage(frames[f], Math.round(PX(wk.s * .8, z) - w / 2), Math.round(FY(z) - h), w, h);
  }
  // The manager's office: a window in the wall, and through it a room behind the wall. You look into it at an angle,
  // so the room runs on down the hall behind the window, and as you pass you see further into it: its back wall with a
  // certificate and a lamp's glow, its floor and ceiling, its far end, a desk, and the manager pacing on the phone.
  // A shot through the glass cracks it.
  function drawOffice(wk, z) {
    const s = wk.s, z0 = z, z1 = z + .16, h0 = .26, h1 = .66, U = 2.4, e1 = z0 + 1.1;
    const quad = (pts, col) => poly(g, col, pts);
    const P = (u, zz, h) => [PX(s * u, zz), YH(zz, h)];
    const win = [P(1, z0, h1), P(1, z1, h1), P(1, z1, h0), P(1, z0, h0)];
    quad([P(1, z0 - .012, h1 + .03), P(1, z1 + .012, h1 + .03), P(1, z1 + .012, h0 - .03), P(1, z0 - .012, h0 - .03)], '#1a1418');
    g.save(); g.beginPath(); win.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.clip();
    quad([P(1, z0, 0), P(U, z0, 0), P(U, e1, 0), P(1, e1, 0)], '#7a5434');   // its floor
    quad([P(1, z0, .85), P(U, z0, .85), P(U, e1, .85), P(1, e1, .85)], '#3a3048');   // its ceiling
    quad([P(U, z0, .85), P(U, e1, .85), P(U, e1, 0), P(U, z0, 0)], '#5e4e74');   // the back wall
    quad([P(1, e1, .85), P(U, e1, .85), P(U, e1, 0), P(1, e1, 0)], '#4a3c5c');   // the far end
    // a lamp's warm glow on the back wall, and the certificate
    quad([P(U, z0 + .55, .75), P(U, z0 + .8, .75), P(U, z0 + .8, .3), P(U, z0 + .55, .3)], '#8a6e66');
    quad([P(U, z0 + .62, .62), P(U, z0 + .72, .62), P(U, z0 + .72, .5), P(U, z0 + .62, .5)], '#f2eee2');
    quad([P(1.6, z0 + .45, .85), P(2.1, z0 + .45, .85), P(2.1, z0 + .62, .85), P(1.6, z0 + .62, .85)], '#e8e4c8');   // its ceiling light
    // the manager, pacing behind the desk, then the desk
    const mz = z0 + .5 + .14 * Math.sin(R.t * 1.1 + wk.w * 5);
    if (!wk.carps[0].dead) {
      const m = A.work('manager', [true])[Math.floor(R.t * 4) % 4], mk = sc(mz) * .8 * (m.k || 1), mw = Math.round(m.width * mk), mh = Math.round(m.height * mk);
      g.drawImage(m, Math.round(PX(s * 1.9, mz) - mw / 2), Math.round(YH(mz, .42) - mh), mw, mh);
    }
    const dz = z0 + .42, dk = sc(dz) * .8, dw = Math.round(A.OFFICE_DESK.width * dk), dh = Math.round(A.OFFICE_DESK.height * dk);
    g.drawImage(A.OFFICE_DESK, Math.round(PX(s * 1.5, dz) - dw / 2), Math.round(FY(dz) - dh), dw, dh);
    // the wall's thickness, where you see it: the window's far side and its sill
    quad([P(1, z1, h1), P(1.07, z1, h1), P(1.07, z1, h0), P(1, z1, h0)], '#4c4856');
    quad([P(1, z0, h0), P(1, z1, h0), P(1.07, z1, h0), P(1.07, z0, h0)], '#6a6676');
    g.restore();
    // the glass: a glint, and cracks once it's been shot through
    g.save(); g.globalAlpha = .35;
    line(g, ...P(1, z0 + .02, h1 - .04), ...P(1, z0 + .06, h1 - .16), '#c8d0dc');
    line(g, ...P(1, z0 + .05, h1 - .04), ...P(1, z0 + .08, h1 - .1), '#c8d0dc');
    g.restore();
    if (wk.cracked) { const [cx, cy] = P(1, z0 + .08, .45), r = 10 * sc(z0 + .08); for (let i = 0; i < 6; i++) { const a = i * 1.05 + .3; line(g, cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.4, '#e8e4d8'); } }
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
    const zS = shredderZ(), far = Math.min(AHEAD, zS - .01);   // nothing behind the Shredder shows
    const gl = glowLayer();
    for (const it of setItems()) { const z = it.w - R.dist; if (z < far) back.push([z, () => faded(fadeFar(z), () => { if (fadeFar(z) < 1) { gl.save(); gl.globalAlpha = fadeFar(z); } SETS.draw(it, z, g, gl); if (fadeFar(z) < 1) gl.restore(); })]); }
    for (const wk of R.workers) { const z = wk.w - R.dist; if (z < far && z > ZN - .2) back.push([z, () => faded(fadeFar(z), () => drawWorker(wk, z))]); }
    for (const cb of R.cubs) { const z = cubZ(cb); if (z < Math.min(1.02, far)) back.push([z, () => faded(fadeIn(z), () => drawCub(cb, z))]); }
    for (const sg of R.signs) { const z = sg.w - R.dist; if (z < Math.min(1.02, far) && z > .05) back.push([z, () => drawSign(sg, z)]); }
    back.sort((a, b) => b[0] - a[0]);
    for (const e of back) e[1]();
    const list = [];
    for (const bx of R.boxes) { const z = bx.w - R.dist; if (z < 1.02) list.push([z, () => faded(fadeIn(z), () => drawBox(bx, z))]); }
    for (const row of R.rows) { const z = row.w - R.dist; if (z < 1.02) list.push([z, () => faded(fadeIn(z), () => drawRow(row, z))]); }
    for (const f of R.flies) list.push([f.z, () => faded(fadeIn(f.z), () => drawFly(f))]);
    if (R.event && R.event.kind === 'move') for (const sl of R.event.souls) { const z = sl.w - R.dist; if (z <= 1.02 && z >= bull.bz - .02) list.push([z, () => faded(fadeIn(z), () => drawTrapped(sl, z))]); }
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
      g.drawImage(A.GHOST, 74, pulse ? 1 : 2, A.uw(A.GHOST), A.uh(A.GHOST));
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
      const last = b.st === 'fight' && b.hp <= TUNE.lastStand && Math.floor(R.t * 6) % 2;   // its last sliver blinks: finish it with a rally
      rect(g, 90, 5, Math.round(72 * fill), 5, b.jam > 0 ? '#ffd44a' : b.flash > 0 || last ? '#ffffff' : '#e2483a');
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
  // With nothing coming at him, the blaster leans further out, to the carpshits at work along the walls.
  function aimIdle(consider) {
    if (R.phase !== 'hall') return;   // in the fight, every bolt goes at the Shredder
    for (const wk of R.workers) for (const c of wk.carps) if (workerLive(c)) consider(c, workerAt(c), TUNE.aimWork);
  }
  // A shot hitting one of the floor's own targets (checked before carpshits). True if it stopped the shot.
  function shotHits(s) {
    for (const cb of R.cubs) {
      const tp = cb.temp; if (!tp || tp.dead || tp.pop < .4) continue;
      const at = posOf(tp); if (at.z > TUNE.reach) continue;
      if (Math.abs(s.u - at.u) < .09 && Math.abs(s.z - at.z) < .06) { s.dead = true; sparks(at.u, at.z, at.h); killTemp(tp, 'shot'); break; }
    }
    if (s.dead) return true;
    for (const sw of R.switches || []) { const at = switchAt(sw); if (!sw.hit && Math.abs(s.z - at.z) < .07 && Math.abs(s.u - at.u) < .2) { s.dead = true; hitSwitch(sw); break; } }
    if (s.dead) return true;
    // a carpshit at work: one shot frees its soul
    for (const wk of R.workers) for (const c of wk.carps) {
      if (!workerLive(c)) continue;
      const at = workerAt(c);
      if (Math.abs(s.u - at.u) < .1 && Math.abs(s.z - at.z) < .06) {
        s.dead = true; c.dead = true; Snd.play('hit'); sparks(at.u, at.z, at.h); poof(at.u, at.z, at.h, 8);
        const x = PX(at.u, at.z), y = YH(at.z, at.h);
        free(x, y - 4, 'worker', 'shot'); bonusSoul('shot', x, y, 'worker');
        // its paperwork goes everywhere (cosmetic)
        for (let i = 0; i < 7; i++) R.fx.push({ k: 'bit', x: x + fxr(-4, 4), y: y - 2, vx: fxr(-45, 45), vy: fxr(-80, -35), t: 0, dur: fxr(.5, .9) });
        if (wk.kind === 'office') wk.cracked = true;
        return true;
      }
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

  function opening() {
    R.banner = { text: 'THE 13TH FLOOR', t: 0, dur: 1.6, top: true, then: { text: 'FREE ' + TUNE.goal + ' SOULS', t: 0, dur: 1.6, top: true } };
    live('The 13th Floor, Accounting. Free ' + TUNE.goal + ' souls to wake the Shredder.');
    Snd.play('start'); Snd.music('tower');
  }
  function clearCard(extra, best, clock) {
    const rows = [['Souls freed', String(R.souls)], ['Time', clock(R.endT)], ['Deflects', String(R.events.deflects || 0)],
      ['Best streak', String(R.bestStreak)], ['Formation wipes', String(R.events.wipes || 0)], ['Smashes', String(R.events.smashes || 0)], ['Longest rally', String(R.events.bestRally || 0)]];
    if (R.continues) rows.push(['Continues', String(R.continues)]);
    rows.push(['Best', best.souls + ' souls']);
    return { title: 'The 13th Floor clear', text: extra.newBest ? 'New best! The Unrugged drift up toward the roof.' : 'The Unrugged drift up toward the roof.',
      rows, note: 'The elevator to floor 42 comes in a later build.' };
  }
  return {
    id: 'floor13', tune: UnrugFloor13.TUNE, opening, clearCard, pauseText: 'The Shredder will wait. It has nowhere else to be.',
    // hooks
    use: x => { g = x; }, view, lights, newRun, update, draw, glows, overlay: drawHintSouls, hud, aim, aimIdle, shotHits, shotFar, slash, hurt, blasterBack, posOf,
    bonusBy, cutRug, draggedIn, endPull, startWake, blowUp,
    // the rest of the floor by name, for the test harness and the balance bots
    BEATS, beat, spawnFormation, startEvent, MOVES, setItems, spawnMove, addWorker, workerAt, knock, launch, deflect, surge, ATTACKS, attack, jam, bossDamage,
    TAUNTS, taunt, laugh, surgeSoon, shredderZ, darkness, startBoss, serveRally, throwPlanes, spitRow, spitFan, rollBack, killTemp
  };
};

// Floor 13 numbers; copied without retuning when the roof became a second floor.
UnrugFloor13.TUNE = {
    coffeeDrop: .2, rowH: .04,
    scroll: .2,             // walking speed down the hall, depth a second
    pullSpeed: .3, mouth: .85,
    goal: 90,               // souls that wake the Shredder
    wadTime: 1.25, wadLead: .2, throwChance: .6,
    moveT: 16, moveClean: 10,   // moving day: how long (its course is MOVES in floor13.js, the last piece reaching you just before the end), and the bonus for a clean run
    darkT: 10,              // lights out in the hall: kills in the dark free double souls
    powerSaveT: 7,          // the Shredder's blackout between phases 2 and 3
    streakDrop: 10,         // a streak this long drops a Spread Shot
    bossHP: 100, shotDmg: .3, jamMult: 3, bundleDmg: 6, stapleDmg: 2, jamT: 2.6, bossSouls: 13,
    bundleT: [2.2, 1.6],    // how long a bundle takes to reach you: phase 1, then later phases
    tell: .45,              // the Shredder's mouth glows this long before each attack
    finish: { slow: 1.3, rate: .3 },   // the final hit: this many real seconds of slow motion, at this speed
    attackEvery: [1.4, 1.5, 1.4],   // seconds between the Shredder's attacks in each phase
    volley: { n: [3, 4, 5], gap: .24, dur: 1.4 }, scrapDmg: 3,   // quick scraps of paper (how many by phase), each worth 3 knocked back
    bossRows: { carpet: .5 },   // how fast a staple carpet crosses the floor
    liveEdge: .04,   // a live floor: how far past the rug's edge your feet can be before it shocks you
    rideJam: 1,             // cut the rug at the mouth and the jam lasts this much longer (in jamT), less further out
    // the runner in the boss fight pulls on a steady beat: how long each pull lasts and the gap after it, by phase
    bossPull: { dur: [2.4, 3.2, 3.8], gap: [6, 5.5, 5] },
    // rallies, in every phase: the Shredder bats back a few of your returns (count, by phase), each quicker (serve ×
    // speedUp per return, down to fastest; your returns fly back in back × speedUp per return, down to backMin), then
    // misses, for smash + smashPer × its bat-backs. Once a phase, a marathon rally of this many.
    rally: { serve: 1, speedUp: .85, fastest: .45, count: [[1, 2], [2, 4], [3, 5]], marathon: [6, 7, 8], back: .3, backMin: .2, smash: 6, smashPer: 2, stun: 1.6 },
    // phase 3's power surge knocks the blaster up the rug (it flies this long); a smash rolls the rug back toward you at this
    // speed for this long, shoving anyone on it to the back of the hall and pinning them; the rewind attack rolls it back too
    surgeFly: .6, roll: { dur: 1.6, speed: .5, pin: .3 }, rewindT: 1.4,
    darkFormEvery: 2.2,     // lights out sends a formation this often
    switchEvery: 3, switchFlash: 1.4,   // lights out: a light switch glows on a wall this often; shoot it and the lights flash on this long, freezing every carpshit
    grip: .25, // crouched he's half height; gripping a pulling rug, it drags him at a quarter of the speed
    planeT: 1.6, planeDmg: 2,  // the Shredder's paper airplanes at head height: duck them, or slash them back
    wipeBy: .5,              // a formation wiped out before any of it gets this far down the hall pays a bonus
    // the souls' hint (the mega stream's first glimpse, saved for the roof): the first time the blaster comes back in the
    // Shredder's fight, this many souls leave the counter one after another (gap apart, each flying for fly seconds) and
    // go into the gun; the first two each add a stream. The streams hold for this many seconds of firing (so they can't
    // run out unseen), then drop off one by one, fade apart.
    soulBye: { at: .9, come: 1.2, salute: 1.5, say: 1.7, leave: 3.6, later: 4.6 },   // the goodbye's beats, in seconds
    lastStand: 6,           // the blaster can't take it below this: a rally or a deflected bundle finishes it
    soulHint: { souls: 2, wait: .7, gap: 1.1, fly: 2 }
  };
