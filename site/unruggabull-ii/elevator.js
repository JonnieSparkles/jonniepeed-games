// The elevator: the long ride from the 48th Floor to the roof (docs/games/unruggabull-ii/long-ride-plan.md), and the
// quiet ride (no fight: the muzak, the doors, a supply crate). Both are one timeline of beats in seconds (Q.t).
// The long ride: "Floor?", the climb and small talk; p(Loom) takes the dial, then the cable (a cut-in above the car);
// the drop; the brakes; its threads come through the hatch and reel the car up (a second cut-in); 30 seconds of Horns Up
// and carpshits down the threads (arena.js); the top; the doors open on the roof; the operator's crate; he walks out.
// Outcomes (waves, the carpshits) use the seeded stream through arena.js; dust, sparks and shake are drawn only.
// Everything here is drawn at the picture's full size (480 x 270, twice the game's units), as the prototype was.
var UnrugElevator = function (core) {
  'use strict';
  const { A, Snd, TUNE, rect, line, disc, txt, otxt, textWidth, clamp, rr, emit, free, updateFx, endRun, drawSoulsCounter } = core;
  // the long ride's beats (seconds)
  const T = { eye: 16, cut: 18.2, snap: 19.45, fall: 20.3, brake: 21.8, hush: 22.6, thread: 24, hook: 24.9, reel: 25.8,
    armor: 34.8, last: 46.8, arrive: 55.8, doors: 57.2, crate: 58 };
  const ELEVATOR = { from: 13, fight: true, destination: { floor: 99, label: 'R', stage: 'roof' }, T,
    // the quiet ride: doors close, banter on the climb, then the doors and a supply crate
    quiet: { climb: 27, board: { walk: 1.4, turn: .5, close: .7 } },
    // the fight: waves down the threads (u of each thread's end), both sides of him; in through the open shaft when he's
    // backed against a wall with no thread that side
    waves: { first: 2.6, every: 1.8, everyLast: 1.5, size: 2, sizeLast: 3, most: 7, lanes: [-.682, -.391, .136, .273, .545], clear: .12 },
    crateSouls: 20, crateFrom: .473, crateSpeed: .68, deadWait: 2.8, walkOut: 1.1, doorway: .12, exitAfter: 1.4,
    // the long ride's arrival: the operator asks as the doors finish opening, he answers, and only then can he walk out
    ask: { floor: .9, roof: 2.2, out: 2.6 },
    arena: {} };
  const arena = UnrugArena(core, ELEVATOR.arena);
  const TOWER = 99;   // the dial's top: the roof
  const W = 480, H = 270, FLOOR = 240, HX = 150, CAR_L = 40, CAR_R = 440;
  const PX = u => arena.PXu(u), UX = x => (x / 2 - 120) / arena.ARENA.width;
  let R, bull, Q, g = core.g;

  // ---------- the timeline ----------
  const lerp = (a, b, k) => a + (b - a) * k, ease = k => k * k * (3 - 2 * k);
  // when the quiet ride and the long ride reach the top
  const top = () => Q.fight ? { arrive: T.arrive, doors: T.doors, crate: T.crate } : { arrive: 2 + ELEVATOR.quiet.climb, doors: 3.4 + ELEVATOR.quiet.climb, crate: 5.4 + ELEVATOR.quiet.climb };
  const fightOn = t => Q.fight && t >= T.reel + .6 && t < T.arrive - .5;
  const lightsOut = t => Q.fight && t >= T.fall && t < T.arrive;
  const locked = t => (Q.fight && t >= T.cut && t < T.hook) || Q.out > 0;
  // the dial, in the long ride's own floors (13 to 99), then scaled to this ride's
  function floorAt(t) {
    const span = f => Q.from + (f - 13) / 86 * (Q.destination.floor - Q.from);
    if (!Q.fight) return t < 2 ? Q.from : lerp(Q.from, Q.destination.floor, clamp((t - 2) / ELEVATOR.quiet.climb, 0, 1));
    if (t < 2) return span(13);
    if (t < T.eye) return span(lerp(13, 52, (t - 2) / (T.eye - 2)));
    if (t < T.fall) return span(52 + (t > T.eye + .8 ? Math.sin(t * 37) * .4 : 0));
    if (t < T.brake) { const k = (t - T.fall) / (T.brake - T.fall); return span(52 - 13 * k * k); }
    if (t < T.reel) return span(39);
    if (t < T.arrive) return span(lerp(39, 99, ease((t - T.reel) / (T.arrive - T.reel))));
    return span(99);
  }
  // the shaft past the windows, in landings a second (negative: falling)
  function speedAt(t) {
    if (!Q.fight) return t >= 2 && t < top().arrive ? 1.4 : 0;
    if (t < 2) return 0;
    if (t < T.eye) return 1.4;
    if (t < T.eye + 2) return lerp(1.4, .3, (t - T.eye) / 2);
    if (t < T.fall) return t < T.snap + .1 ? .3 : 0;
    if (t < T.brake) return -lerp(2, 16, (t - T.fall) / (T.brake - T.fall));
    if (t < T.reel) return 0;
    if (t < T.arrive) return lerp(5, 11, clamp((t - T.reel) / 3, 0, 1));
    return 0;
  }
  function shakeAt(t) {
    const pulse = (t0, dur, amp) => t >= t0 && t < t0 + dur ? amp * (1 - (t - t0) / dur) : 0, a = top().arrive;
    let s = pulse(a, .6, Q.fight ? 8 : 2);
    if (!Q.fight) return s;
    if (t > T.eye + .6 && t < T.cut) s += .6;
    if (t >= T.fall && t < T.brake) s += 2.4;
    s += pulse(T.fall, .4, 6) + pulse(T.brake, .7, 9) + pulse(T.hook, .4, 4) + pulse(T.reel, .6, 7);
    if (t >= T.reel && t < T.arrive) s += 1.1;
    return s;
  }

  // ---------- lines and cues ----------
  // p(Loom) talks in its machine blips (the lower pulse voice, as on the roof), with a caption bar along the bottom;
  // the operator and Unruggabull in speech bubbles. Each caption stays up as long as it did in the prototype.
  function say(who, text, dur) {
    core.talk(text, who === 'ploom' ? 'loom' : who);
    Object.assign(R.talk, { readout: true, speaker: who, total: dur });
  }
  const LONG = [
    [.35, () => say('operator', 'FLOOR?', 1.8)],
    [4, () => say('bull', 'YOU EVER GET OFF?', 2)],
    [6.4, () => say('operator', 'FLOOR?', 1.8)],
    [9.6, () => say('bull', '...THE ROOF.', 1.8)],
    [11.8, () => say('operator', 'VERY GOOD, SIR.', 1.8)],
    [T.eye, () => { Snd.brownout(2.3); emit('elevator_eye'); }],
    [T.eye + .4, () => say('ploom', 'PROBABILITY OF ARRIVAL: ZERO PERCENT.', 2.6)],
    [T.cut, () => { Snd.music(null, { hard: true }); emit('elevator_cut'); }],
    [T.cut + .3, () => Snd.play('rideCreak')],
    [T.cut + .6, () => Snd.play('rideWind')],
    [T.snap, () => { Snd.play('rideSlack'); emit('elevator_snap'); }],
    [T.fall, () => { Snd.play('rideFall'); emit('elevator_fall'); }],
    [T.brake, () => Snd.play('rideBrake')],
    [T.hush + .5, () => say('operator', '...FLOOR?', 1.3)],
    [T.thread, () => { Snd.play('rideBurst'); emit('elevator_threads'); }],
    [T.thread + .35, () => say('ploom', 'RECALCULATING. BRING HIM UP.', 1.8)],
    [T.hook, () => { Snd.play('rideHook'); Snd.play('rideReel'); }],
    [T.reel, () => { Snd.music('hornsUp', { slam: true, pattern: 'reel' }); emit('elevator_heavy'); }],
    [T.reel + .6, () => say('bull', 'HERE I COME, P(LOOM).', 2.2)],
    [T.arrive, () => { arrive(); Snd.play('rideSlam'); }],
    [T.arrive + .5, () => Snd.play('rideDing')],
    [T.doors, () => { Snd.play('rideDoors'); emit('elevator_doors'); }],
    [T.doors + ELEVATOR.ask.floor, () => say('operator', 'FLOOR?', 1.6)],
    [T.doors + 1.6, () => Snd.play('thunder')],
    [T.doors + ELEVATOR.ask.roof, () => { if (!Q.out) say('bull', 'ROOF.', 1.4); }]
  ];
  // The quiet ride's entire script: anchor, seconds from it, speaker, bubble, duration.
  // Arrival offsets use the same ask timing as the long ride; editing a line/duration also moves the exit gate.
  const QUIET = [
    ['start', .35, 'operator', 'FLOOR?', 1.8],
    ['start', 2.6, 'bull', 'FORTY-EIGHT.', 1.8],
    ['start', 5, 'operator', 'GOT A SLIP?', 1.8],
    ['start', 7.4, 'bull', 'ACCOUNTING.', 1.8],
    ['start', 10, 'operator', 'THEY STILL THERE?', 1.8],
    ['start', 12.4, 'bull', 'LESS OF THEM.', 1.8],
    ['doors', ELEVATOR.ask.floor, 'operator', 'RECLAMATION, SIR.', 1.8],
    ['doors', ELEVATOR.ask.floor + 2, 'bull', 'KEEP THE SLIP.', 1.8]
  ];
  // The middle exchange is one of these, picked from the run's seed (never drawn from the seeded stream, so no run changes
  // and a replay hears the same one). Owner, Oct 14: keep all three.
  const QUIET_MIDDLE = ELEVATOR.quiet.middle = [
    [['start', 17, 'bull', 'THIS SONG...', 2], ['start', 19.4, 'operator', 'IT GETS BETTER.', 1.8], ['start', 24, 'bull', 'DOES IT?', 1.8]],
    [['start', 17, 'operator', 'RECLAMATION. YOU SURE?', 2], ['start', 19.4, 'bull', "IT'S ON THE SLIP.", 1.8], ['start', 24, 'operator', "...I'LL WAIT HERE.", 1.8]],
    [['start', 17, 'bull', 'THIS THING GO FASTER?', 2], ['start', 19.4, 'operator', 'NO.', 1.8], ['start', 24, 'bull', 'GREAT.', 1.8]]
  ];
  function quietCues() {
    Q.middle = (core.runSeed() >>> 0) % QUIET_MIDDLE.length;
    const p = top(), lines = QUIET.concat(QUIET_MIDDLE[Q.middle]).map(([anchor, offset, who, text, dur]) => {
      const t = (anchor === 'doors' ? p.doors : 0) + offset;
      Q.exitAt = Math.max(Q.exitAt, t + dur);
      return [t, () => say(who, text, dur)];
    });
    return lines.concat([[p.arrive, () => { arrive(); Snd.play('rideDing'); }],
      [p.doors, () => { Snd.play('rideDoors'); emit('elevator_doors'); }]]);
  }
  // the top: the threads let go, the last carpshits go with them (their souls are his), the music stops
  function arrive() {
    arena.clearThreats('clear');
    Snd.music(null, { hard: true }); emit('elevator_ding');
  }

  // ---------- the run ----------
  function newRun(r, b, at) {
    R = r; bull = b; R.speed = 0; R.phase = 'boss';
    if (at) { R.souls = R.shown = at.souls || 0; R.continues = (at.continues || 0) + (at.transfer ? 0 : 1); }
    arena.newRun(R, bull);
    const fight = at && at.fight != null ? at.fight : ELEVATOR.fight;
    Q = R.elevator = { t: 0, from: at && at.from != null ? at.from : ELEVATOR.from, fight, destination: Object.assign({}, ELEVATOR.destination, at && at.destination),
      cues: null, cue: 0, shaft: 0, indicator: 0, nextSpawn: ELEVATOR.waves.first, wave: 0, crate: null, crateSouls: 0, out: 0,
      dust: [], sparks: [], lift: 0, cap: 0, board: !fight && at && at.transfer && at.walkIn && at.from === 13 ? { t: 0 } : null };
    Q.exitAt = fight ? T.doors + ELEVATOR.ask.out : top().doors + ELEVATOR.exitAfter;
    Q.cues = (fight ? LONG : quietCues()).slice().sort((a, b2) => a[0] - b2[0]);
    // a continue from the long ride's fight starts again at the threads, with the souls it came in with
    const startAt = at && !at.transfer && at.startAt ? at.startAt : 0;
    core.setCheckpoint({ stage: 'elevator', souls: R.souls, continues: R.continues,
      heldDrop: at && at.heldDrop || null, dropNext: at && at.dropNext || 'spread', destination: Q.destination, from: Q.from, fight,
      startAt: fight ? T.thread : 0, seedState: core.seedState(), runSeed: core.runSeed() });
    if (startAt) {
      for (let t = 0; t < startAt; t += 1 / 60) Q.shaft += speedAt(t) / 60;
      Q.t = startAt; while (Q.cue < Q.cues.length && Q.cues[Q.cue][0] < startAt) Q.cue++;
    }
    Q.indicator = Math.round(floorAt(Q.t));
    if (Q.board) {
      bull.u = -1.05; bull.facing = 1; R.arena.locked = true; R.arena.outShrink = false; R.white = .35;
      Snd.music(null, { hard: true });
    } else if (!startAt) Snd.music(fight ? 'hornsUp' : 'pleaseHold', fight ? { slam: true, pattern: 'muzak', loopPattern: true } : { slam: true });
    else Snd.music(null, { hard: true });
    emit('elevator_state', { state: Q.board ? 'board' : startAt ? 'threads' : 'ask' });
  }
  // The lobby's boarding pattern: side-on from the left, stop in the doorway, turn his back, close the doors.
  // Q.t is the ride clock; it starts after the 2.6 s entrance, so every cue (including FLOOR?) waits for closed doors.
  function stepBoard(dt) {
    const b = Q.board, B0 = ELEVATOR.quiet.board, end = B0.walk + B0.turn + B0.close;
    b.t = Math.min(end, b.t + dt); R.arena.locked = true;
    if (b.t < B0.walk) { bull.u = lerp(-1.05, 0, b.t / B0.walk); bull.step += dt * 8; }
    else {
      bull.u = 0; R.arena.out = clamp((b.t - B0.walk) / B0.turn, .0001, 1);
      if (b.t < B0.walk + B0.turn) bull.step += dt * 8;
      if (!b.closing && b.t >= B0.walk + B0.turn) { b.closing = true; Snd.play('rideDoors'); Snd.music('pleaseHold', { slam: true }); }
    }
    updateFx(dt);
    if (b.t < end) return;
    Q.board = null; R.arena.out = 0; R.arena.outShrink = true; R.arena.locked = false;
    // The existing phone pads stay connected; discard transient attack taps made while the doors were closing.
    core.input.jump = core.input.slash = core.input.shoot = 0;
    emit('elevator_state', { state: 'ask' });
  }
  function spawnWave(t) {
    const W8 = ELEVATOR.waves, last = t > T.last, n = Math.min(last ? W8.sizeLast : W8.size, W8.most - R.arena.enemies.length);
    for (let i = 0; i < n; i++) {
      const armored = (t > T.armor && i === 0 && Q.wave % 2 === 1) || (last && i === 1);
      const side = (Q.wave + i) % 2 ? 1 : -1;   // either side of him, in turn
      const lanes = W8.lanes.filter(u => (u - bull.u) * side > W8.clear && !R.arena.enemies.some(e => e.dropping && Math.abs(e.u - u) < .1));
      if (lanes.length) arena.spawn('flyer', { u: lanes[Math.min(lanes.length - 1, Math.floor(rr(0, lanes.length)))], armored });
      else arena.spawn('flyer', { side, armored });
    }
    Q.wave++; emit('elevator_wave', { kind: last ? 'last' : 'heavy', amount: n });
  }
  function update(dt) {
    if (R.phase === 'win') return;   // a bot's run stops at the doors
    if (R.phase === 'dead') { updateFx(dt); stepCosmetic(dt); if (R.phaseT > ELEVATOR.deadWait) endRun('rugged'); return; }
    if (Q.board) { stepBoard(dt); return; }
    const t = Q.t;
    while (Q.cue < Q.cues.length && Q.cues[Q.cue][0] <= t) Q.cues[Q.cue++][1]();
    Q.shaft += speedAt(t) * dt; Q.indicator = Math.round(floorAt(t));
    // the waves: only in the fight, at most seven on screen
    if (fightOn(t) && R.arena.enemies.length < ELEVATOR.waves.most) {
      Q.nextSpawn -= dt;
      if (Q.nextSpawn <= 0) { spawnWave(t); Q.nextSpawn = t > T.last ? ELEVATOR.waves.everyLast : ELEVATOR.waves.every; }
    }
    R.arena.locked = locked(t);
    R.arena.glance = !Q.fight || t > T.eye;
    stepCrate(dt);
    stepWalkOut(dt);
    if (R.phase === 'win') return;   // handed off to the next stage
    arena.update(dt, true);
    stepCosmetic(dt);
    Q.t += dt;
  }
  // The crate: the operator slides it over and it waits. The long ride's gives full hearts, or bonus souls if he's
  // already full; the quiet ride's is the next supply drop (drops.js).
  function stepCrate(dt) {
    const p = top();
    if (Q.t >= p.crate && !Q.crate && !Q.out) { Q.crate = { u: ELEVATOR.crateFrom, got: false, kind: Q.fight ? 'hearts' : core.drops.choose() }; Snd.play('rideCrate'); emit('elevator_crate'); }
    const c = Q.crate;
    if (c && !c.got) {
      c.u = Math.max(Math.max(UX(200), bull.u + .109), c.u - ELEVATOR.crateSpeed * dt);
      if (Math.abs(c.u - bull.u) < .118 && bull.jh < .07) {
        c.got = true; Snd.play('power');
        if (!Q.fight) core.drops.give(c.kind);
        else if (R.hearts < TUNE.hearts) { c.gave = 'hearts'; R.hearts = TUNE.hearts; core.popText('FULL HEARTS', 120, 78, '#ffd44a'); }
        else { c.gave = 'souls'; Q.crateSouls = ELEVATOR.crateSouls; core.popText('+' + ELEVATOR.crateSouls + ' SOULS', 120, 78, '#ffd44a'); }
        emit('elevator_supply', { item: c.gave || c.kind });
      }
    }
    // the bonus souls come out one a frame
    if (Q.crateSouls > 0) { Q.crateSouls--; free(arena.X(c.u) + core.fxr(-7, 7), arena.Y(.05), 'crate', 'crate'); }
  }
  // In the doorway once the doors are open and the operator has asked: he answers, turns his back to us and walks out.
  function stepWalkOut(dt) {
    // on the long ride he can't leave before the exchange at the doors has played (owner, Oct 13: standing in the doorway
    // he walked out before "FLOOR?" and "ROOF."). The quiet ride waits through its last bubble too.
    const gate = Q.exitAt;
    if (!Q.fight && Q.out === 0 && R.talk) return; // wait through the actual bubble, including frame rounding
    if (Q.out <= 0 && !(Q.t > gate && Math.abs(bull.u) < ELEVATOR.doorway && bull.jh <= 0)) return;
    if (Q.out === 0) { emit('elevator_exit'); if (Q.fight && Q.t < T.doors + ELEVATOR.ask.roof) say('bull', 'ROOF.', 1.4); }   // he answers on his way out
    Q.out = Math.min(1, Q.out + dt / ELEVATOR.walkOut); R.arena.out = Q.out;
    bull.u += (0 - bull.u) * (1 - Math.pow(.0016, dt)); bull.step += dt * 8;
    if (Q.out < 1) return;
    R.phase = 'win'; R.endT = R.t;
    emit('elevator_clear', { amount: R.t });
    core.travel(Q.destination.stage, { ride: Q.destination });
  }
  // drawn-only things that move: dust from the hatch, sparks off the brakes and the threads, the operator floating
  function stepCosmetic(dt) {
    const t = Q.t, fall = Q.fight && t >= T.fall && t < T.brake;
    Q.lift = fall ? Math.min(8, Q.lift + 30 * dt) : Math.max(0, Q.lift - 60 * dt);
    Q.cap = fall ? Math.min(16, Q.cap + 50 * dt) : Math.max(0, Q.cap - 40 * dt);
    R.arena.lift = fall ? Math.min(14, (R.arena.lift || 0) + 40 * dt) : Math.max(0, (R.arena.lift || 0) - 80 * dt);
    const r = (a, b) => a + (b - a) * Math.random();
    if (Q.fight && t >= T.brake && t < T.brake + .7) for (let i = 0; i < 3; i++) {
      const side = Math.random() < .5 ? 0 : 1;
      Q.sparks.push({ x: side ? r(462, 476) : r(4, 18), y: r(150, 240), vx: (side ? -1 : 1) * r(20, 140), vy: r(-200, -40), t: 0, dur: r(.3, .6) });
    }
    if (Q.fight && t >= T.reel && t < T.arrive && Math.floor(t * 30) % 3 === 0) {
      const k = Math.floor(t * 7) % 3, ex = [HX - 70, HX + 4, HX + 150][k], ey = k === 1 ? 64 : 40;
      for (let i = 0; i < 2; i++) Q.sparks.push({ x: ex, y: ey, vx: (Math.random() - .5) * 120, vy: Math.random() * -60, t: 0, dur: .3 });
    }
    if (Q.fight && t >= T.hush && t < T.hush + .8 && Math.random() < .5) Q.dust.push({ x: HX + r(-24, 24), y: 38, vy: r(30, 70), t: 0, dur: 1.6 });
    if (Q.fight && t >= T.thread && t < T.thread + .3) for (let i = 0; i < 3; i++) Q.dust.push({ x: HX + r(-28, 28), y: 40, vy: r(60, 140), t: 0, dur: 1 });
    for (const s of Q.sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; }
    for (const d of Q.dust) { d.t += dt; d.y += d.vy * dt; }
    Q.sparks = Q.sparks.filter(s => s.t < s.dur); Q.dust = Q.dust.filter(d => d.t < d.dur);
  }

  // ---------- drawing: the car ----------
  let BG = null;
  function paintCar() {
    const cv = A.canvas(W, H), c = cv.getContext('2d');
    const P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    // walnut wall
    P(0, 38, W, 202, '#3a2118');
    for (let x = 0; x < W; x += 3) if ((x * 7) % 11 < 2) P(x, 38, 1, 202, '#341d15');
    const panel = (x, y, w, h) => { P(x, y, w, h, '#2a170f'); P(x + 2, y + 2, w - 4, h - 4, '#4a2a1c'); P(x + 2, y + 2, w - 4, 2, '#5e3a26'); P(x + 2, y + 2, 2, h - 4, '#5a3624');
      for (let i = 0; i < 6; i++) P(x + 8 + i * Math.floor((w - 16) / 6), y + 8, 1, h - 16, '#43251a'); };
    for (const x of [8, 84, 322, 398]) panel(x, 50, 74, 116);
    // wainscot under the rail, and the brass rail
    P(0, 182, W, 58, '#2e1912'); for (let x = 6; x < W; x += 14) P(x, 186, 2, 50, '#24130d'); P(0, 182, W, 2, '#4a2a1c');
    for (const [x0, x1] of [[6, 160], [320, 474]]) { P(x0, 172, x1 - x0, 5, '#8a6420'); P(x0, 172, x1 - x0, 1, '#ffd44a'); P(x0, 173, x1 - x0, 1, '#e0a93a');
      for (const x of [x0 + 6, x1 - 10]) P(x, 177, 4, 8, '#6a4a18'); }
    // the coffered ceiling with a brass cornice
    P(0, 0, W, 36, '#171012');
    for (let x = 6; x < W; x += 52) { P(x, 6, 44, 22, '#1f1517'); P(x + 3, 9, 38, 16, '#241a1c'); }
    P(0, 32, W, 2, '#6a4a18'); P(0, 34, W, 3, '#c9962e'); P(0, 34, W, 1, '#ffd44a'); P(0, 37, W, 2, '#5a3a12');
    // the carpet: RugCo red with gold diamonds
    P(0, FLOOR, W, 30, '#5e1614'); P(0, FLOOR, W, 2, '#c9962e'); P(0, FLOOR + 2, W, 2, '#3a0c0a');
    for (let x = -12; x < W + 24; x += 24) for (let k = 0; k < 6; k++) { P(x + 12 - k, FLOOR + 9 + k, k * 2 + 1, 1, '#7a1d1a'); P(x + 12 - k, FLOOR + 21 - k, k * 2 + 1, 1, '#7a1d1a'); }
    for (let x = 0; x < W; x += 24) P(x + 11, FLOOR + 14, 3, 3, '#c9962e');
    // the bronze door frame and the dial's plate
    P(160, 70, 160, 170, '#2a170f'); P(162, 72, 156, 168, '#6a4a18'); P(164, 74, 152, 166, '#c9962e'); P(166, 76, 148, 164, '#8a6420');
    c.fillStyle = '#8a6420'; c.beginPath(); c.arc(240, 70, 30, Math.PI, 0); c.fill();
    c.fillStyle = '#c9962e'; c.beginPath(); c.arc(240, 70, 28, Math.PI, 0); c.fill();
    // the operator's button panel and his stool
    P(400, 108, 22, 66, '#5a3a12'); P(402, 110, 18, 62, '#c9962e'); P(402, 110, 18, 1, '#ffd44a');
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { P(405 + j * 8, 116 + i * 10, 5, 5, '#3a2a1a'); P(406 + j * 8, 117 + i * 10, 3, 3, '#f2e6c8'); }
    P(336, 204, 40, 5, '#c9962e'); P(336, 204, 40, 1, '#ffd44a'); P(338, 209, 36, 2, '#6a4a18');
    P(353, 211, 6, 26, '#8a6420'); P(342, 236, 28, 4, '#6a4a18');
    for (const x of [118, 362]) { P(x - 3, 92, 6, 12, '#8a6420'); P(x - 2, 92, 4, 1, '#ffd44a'); }   // sconces
    // the car cut out of the shaft: open sides and its steel frame
    c.clearRect(0, 0, CAR_L, H); c.clearRect(CAR_R, 0, W - CAR_R, H);
    for (const x of [CAR_L - 6, CAR_R]) { P(x, 0, 6, H, '#1c181e'); P(x + 1, 0, 1, H, '#4a4250'); P(x + 4, 0, 1, H, '#0c0a0e'); for (let y = 8; y < H; y += 24) P(x + 2, y, 2, 2, '#6a6270'); }
    P(CAR_L - 6, H - 6, CAR_R - CAR_L + 12, 6, '#1c181e'); P(CAR_L - 6, H - 6, CAR_R - CAR_L + 12, 1, '#4a4250');
    return cv;
  }
  const glow = (x, y, r, col, a) => arena.glow(x, y, r, col, a);
  // the shaft either side of the car: brick, guide rails and each floor's landing sliding past
  function drawShaftSides(t) {
    const PXL = 96, pos = Q.shaft * PXL, dark = lightsOut(t);
    for (const [x0, w] of [[0, CAR_L - 6], [CAR_R + 6, W - CAR_R - 6]]) {
      rect(g, x0, 0, w, H, '#0d0a0f');
      const off = ((pos % 16) + 16) % 16;
      for (let y = -16 + off; y < H; y += 8) { rect(g, x0, Math.round(y), w, 1, '#19141b'); for (let x = x0 + (Math.round((y - off) / 8) % 2 ? 6 : 0); x < x0 + w; x += 12) rect(g, x, Math.round(y), 1, 8, '#19141b'); }
      const rx = x0 < 100 ? x0 + w - 8 : x0 + 4; rect(g, rx, 0, 4, H, '#2a2430'); rect(g, rx, 0, 1, H, '#4a4250');
      const k0 = Math.floor(Q.shaft) - 2;
      for (let k = k0; k < k0 + 5; k++) {
        const y = Math.round(H * .55 + (Q.shaft - k) * PXL);
        if (y < -40 || y > H + 20) continue;
        rect(g, x0, y, w, 5, '#3a3440'); rect(g, x0, y, w, 1, '#6a6270'); rect(g, x0, y - 70, w, 2, '#2a2430');
        const lx = x0 + (x0 < 100 ? 8 : w - 14);
        rect(g, lx, y - 62, 6, 3, dark ? '#5a2a20' : '#ffcf7a');
        if (x0 < 100) txt(g, String(Q.from + ((k % 86) + 86) % 86), x0 + 4, y - 50, '#6a6270', 1);
      }
      if (Math.abs(speedAt(t)) > 3) for (let i = 0; i < 5; i++) { const yy = ((i * 61 + Math.round(pos * 1.7)) % H + H) % H; rect(g, x0 + 3 + i * 6 % Math.max(1, w - 4), yy, 1, 22, '#2e2834'); }
    }
  }
  function shaftLamps(t) {
    if (lightsOut(t)) return;
    for (const [x0, w] of [[0, CAR_L - 6], [CAR_R + 6, W - CAR_R - 6]]) {
      const k0 = Math.floor(Q.shaft) - 2;
      for (let k = k0; k < k0 + 5; k++) { const y = Math.round(H * .55 + (Q.shaft - k) * PXL0); if (y < -40 || y > H + 20) continue; glow(x0 + (x0 < 100 ? 8 : w - 14) + 3, y - 60, 16, '#ffcf7a', .35); }
    }
  }
  const PXL0 = 96;
  const eyeOn = t => Q.fight && t >= T.eye + .5 && t < T.arrive;
  function drawDial(t) {
    // one dial for the whole tower, the same in every ride: G at the left, R (floor 99) at the right
    const f = floorAt(t);
    g.fillStyle = eyeOn(t) ? '#140806' : '#f2e6c8'; g.beginPath(); g.arc(240, 70, 24, Math.PI, 0); g.fill();
    if (!eyeOn(t)) {
      for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; line(g, 240 + Math.cos(a) * 20, 70 + Math.sin(a) * 20, 240 + Math.cos(a) * 23, 70 + Math.sin(a) * 23, '#3a2a1a'); }
      txt(g, 'G', 222, 62, '#3a2a1a', 1); txt(g, 'R', 255, 62, '#c8302a', 1);
      const a = Math.PI + clamp(f / TOWER, 0, 1) * Math.PI;
      line(g, 240, 69, 240 + Math.cos(a) * 19, 69 + Math.sin(a) * 19, '#c8302a');
      line(g, 241, 69, 241 + Math.cos(a) * 18, 69 + Math.sin(a) * 18, '#c8302a');
      disc(g, 240, 69, 2, '#3a2a1a');
    }
    rect(g, 216, 70, 48, 3, '#6a4a18');
  }
  // p(Loom)'s eye fills the dial (drawn with the glow)
  function drawEye(t) {
    if (!eyeOn(t)) return;
    const k = clamp((t - T.eye - .5) / .5, 0, 1), pulse = .5 + .5 * Math.sin(t * 6);
    glow(240, 66, 16, '#ff7a2a', .35 * k);
    disc(g, 240, 62, Math.round(14 * k), '#ff7a2a'); disc(g, 240, 62, Math.round(10 * k), '#ffd060');
    disc(g, 240, 62, Math.round(4 + pulse * 2) * (k > .5 ? 1 : 0), '#140806');
  }
  // the view through the open doors: the storm on the roof and p(Loom) far off (or, on the quiet ride, a quiet hall)
  function drawRoof(t) {
    if (Q.board) {
      rect(g, 168, 76, 144, 164, '#4a2a1c'); rect(g, 168, 172, 144, 3, '#c9962e');
      rect(g, 168, 176, 144, 64, '#2e1912'); return;
    }
    rect(g, 168, 76, 144, 164, '#0c0a18');
    if (Q.destination.stage === 'floor48') {
      // the 48th Floor through the doors: the factory's glow, a belt running past, machinery and a loom's threads
      rect(g, 168, 76, 144, 164, '#16131b');
      for (let i = 0; i < 5; i++) rect(g, 168, 76 + i * 20, 144, 20, ['#1a1620', '#1e1924', '#241c26', '#2e2026', '#3a2424'][i]);
      for (const [x, w, h] of [[172, 26, 70], [204, 34, 92], [246, 20, 60], [272, 36, 84]]) { rect(g, x, 176 - h, w, h, '#0e0c12'); rect(g, x + 2, 178 - h, w - 4, 2, '#2a2430'); }
      for (let i = 0; i < 6; i++) rect(g, 210 + i * 4, 98, 1, 50, i % 2 ? '#ff7a2a' : '#ffd060');
      rect(g, 168, 176, 144, 64, '#211f28'); rect(g, 168, 186, 144, 14, '#2c2a35');
      for (let x = 168 + ((Math.floor(t * 40) % 8) + 8) % 8; x < 312; x += 8) rect(g, x, 187, 2, 12, '#3a3844');
      rect(g, 168, 185, 144, 1, '#5a5868'); rect(g, 168, 200, 144, 1, '#5a5868');
      if (Math.floor(t * 2) % 2) rect(g, 300, 120, 4, 4, '#ffb040');
      return;
    }
    if (Q.destination.stage !== 'roof') {
      rect(g, 168, 76, 144, 164, '#2a2630'); rect(g, 168, 176, 144, 64, '#3a2e2a');
      for (let x = 172; x < 312; x += 24) rect(g, x, 96, 16, 50, '#3e3a46');
      rect(g, 168, 176, 144, 2, '#5a5060'); return;
    }
    for (let i = 0; i < 6; i++) rect(g, 168, 76 + i * 14, 144, 14, ['#0b0916', '#100c20', '#151028', '#1c1230', '#241436', '#2b1638'][i]);
    if (t > T.doors + 1.6 && t < T.doors + 1.9) rect(g, 168, 76, 144, 90, '#6a5a9a');
    g.fillStyle = '#07060c'; g.beginPath(); g.moveTo(206, 172); g.lineTo(222, 128); g.lineTo(258, 128); g.lineTo(274, 172); g.closePath(); g.fill();
    for (const [x0, x1] of [[222, 196], [228, 206], [252, 274], [258, 284]]) line(g, x0, 140, x1, 176, '#07060c');
    disc(g, 240, 140, 4, '#ff7a2a'); disc(g, 240, 140, 2, '#ffd060');
    rect(g, 168, 176, 144, 64, '#1a1820'); for (let y = 180; y < 240; y += 8) rect(g, 168, y, 144, 1, '#24222c');
    rect(g, 168, 176, 144, 2, '#3a3444');
    for (let i = 0; i < 40; i++) { const x = 168 + ((i * 37 + Math.floor(t * 300) * 3) % 144), y = 76 + ((i * 53 + Math.floor(t * 600)) % 164); line(g, x, y, x - 2, y + 6, '#5a6a9a'); }
  }
  const doorOpening = () => Q.board ? 1 - clamp((Q.board.t - ELEVATOR.quiet.board.walk - ELEVATOR.quiet.board.turn) / ELEVATOR.quiet.board.close, 0, 1) : clamp((Q.t - top().doors) / 1.2, 0, 1);
  function drawDoors(t, foreground = false) {
    const open = doorOpening();
    if (open > 0 && !foreground) drawRoof(t);
    const lw = Math.round(72 * (1 - open));
    if (lw <= 0) return;
    for (const [x, right] of [[168, 0], [312 - lw, 1]]) {
      rect(g, x, 76, lw, 164, '#2a170f'); rect(g, x + 1, 77, lw - 2, 162, '#7a5a2e');
      // an art-deco sunburst: half on each leaf, fanning out from the seam, kept inside its own leaf as it slides away
      const cx = right ? x : x + lw, sx = right ? 1 : -1;
      g.save(); g.beginPath(); g.rect(x + 1, 77, lw - 2, 162); g.clip();
      for (let i = 0; i < 7; i++) { const a = .25 + i * .2; line(g, cx, 236, cx + sx * Math.sin(a) * 60, 236 - Math.cos(a) * 140, '#8a6634'); }
      g.restore();
      rect(g, x + 1, 77, lw - 2, 2, '#a07a3e');
      const wx = x + Math.round(lw / 2) - 5;
      if (lw > 16) {
        // a window onto the shaft rushing past
        rect(g, wx - 1, 99, 12, 84, '#2a170f'); rect(g, wx, 100, 10, 82, '#0e0a0c');
        for (let k = 0; k < 4; k++) {
          const y = 100 + ((((Q.shaft * 40 + k * 26) % 104) + 104) % 104) - 10;
          if (y > 100 && y < 180) { rect(g, wx, y, 10, 2, lightsOut(t) && t < T.reel ? '#5a2a20' : '#ffcf7a'); rect(g, wx, y + 2, 10, 1, '#3a2a1a'); }
        }
        if (Math.abs(speedAt(t)) > 4) for (let k = 0; k < 6; k++) { const y = 100 + ((k * 13 + Math.floor(t * 90)) % 82); rect(g, wx + 2 + (k % 3) * 3, y, 1, 8, '#4a3a3a'); }
      }
    }
    if (lw >= 72) rect(g, 239, 76, 2, 164, '#2a170f');   // the seam, only while they're shut
  }
  function drawHatch(t) {
    const x0 = HX - 28, open = Q.fight && t >= T.thread ? clamp((t - T.thread) / .25, 0, 1) : 0;
    rect(g, x0 - 2, 20, 60, 18, '#5a3a12'); rect(g, x0, 22, 56, 14, '#0c0808');
    if (open <= 0) { for (let x = x0 + 2; x < x0 + 56; x += 6) rect(g, x, 22, 2, 14, '#4a3e3a'); return; }
    // burst open: the grate hangs from one hinge
    const fl = Math.round(22 * open);
    g.fillStyle = '#4a3e3a'; g.beginPath(); g.moveTo(x0, 36); g.lineTo(x0 + 6, 36 + fl); g.lineTo(x0 + 20, 36 + fl + 4); g.lineTo(x0 + 14, 36); g.fill();
  }
  // p(Loom)'s threads through the hatch, hooked into the car's ceiling; taut while they reel it up
  function drawThreads(t) {
    if (!Q.fight || t < T.thread || t >= T.arrive + .4) return;
    const k = clamp((t - T.thread) / (T.hook - T.thread), 0, 1), taut = t >= T.hook, gone = t >= T.arrive ? (t - T.arrive) / .4 : 0;
    glow(HX, 30, 110, '#ff7a2a', (.28 + .08 * Math.sin(t * 9)) * (1 - gone));
    [[HX - 70, 40], [HX + 4, 64], [HX + 150, 40]].forEach(([ex, ey], i) => {
      const wob = taut ? Math.sin(t * 40 + i) * 1.5 : 12 * (1 - k), pts = [];
      for (let s = 0; s <= 16; s++) {
        const u = s / 16, reach = Math.min(u, k);
        pts.push([lerp(HX - 8 + i * 8, ex, reach) + Math.sin(u * 9 + t * 7 + i) * wob * (1 - u * .4), lerp(-4, ey, reach) - gone * 80 * u]);
      }
      glow(pts[16][0], pts[16][1], 10, '#ff7a2a', .5);
      for (let j = 1; j < pts.length; j++) { const a = pts[j - 1], b2 = pts[j]; line(g, a[0] - 1, a[1], b2[0] - 1, b2[1], '#a8401a'); line(g, a[0], a[1], b2[0], b2[1], '#ff7a2a'); line(g, a[0] + 1, a[1], b2[0] + 1, b2[1], '#ffd060'); }
      if (k >= 1 && !gone) { disc(g, ex, ey, 3, '#ff7a2a'); disc(g, ex, ey, 1, '#fff0c0'); }
    });
  }
  // the operator: one of the Unrugged, a soul at twice the size on his stool, in a bellhop's cap and jacket
  function drawOperator(t) {
    const talking = R.talk && R.talk.speaker === 'operator';
    const x = 338, y = 160 - Math.round(Q.lift) - (talking && Math.floor(t * 8) % 2 ? 1 : 0), S = A.GHOST;
    g.drawImage(S, x, y, S.width * 2, S.height * 2);
    const cy = y + 4 - Math.round(Q.cap);   // the cap floats on the drop
    rect(g, x + 7, cy - 6, 22, 10, '#1a1418'); rect(g, x + 8, cy - 5, 20, 8, '#c8302a'); rect(g, x + 8, cy - 5, 20, 2, '#e8483a'); rect(g, x + 8, cy + 1, 20, 2, '#ffd44a');
    rect(g, x + 26, cy + 3, 6, 2, '#1a1418');
    rect(g, x + 4, y + 30, 28, 12, '#1a1418'); rect(g, x + 5, y + 30, 26, 11, '#a8261e'); rect(g, x + 5, y + 30, 26, 1, '#d63428');
    for (const bx of [x + 12, x + 23]) for (const by of [y + 33, y + 37]) rect(g, bx, by, 2, 2, '#ffd44a');
    rect(g, x + 17, y + 30, 2, 11, '#7a1a14');
    rect(g, x + 14, y + 30, 3, 4, '#c8302a'); rect(g, x + 19, y + 30, 3, 4, '#c8302a'); rect(g, x + 17, y + 31, 2, 2, '#961e16');
  }
  function drawCrate() {
    const c = Q.crate; if (!c || c.got) return;
    const x = Math.round(PX(c.u));
    rect(g, x - 14, FLOOR - 22, 28, 22, '#1a1418'); rect(g, x - 13, FLOOR - 21, 26, 20, '#8c6a44'); rect(g, x - 13, FLOOR - 12, 26, 2, '#6a4a2a');
    rect(g, x - 1, FLOOR - 21, 2, 20, '#6a4a2a');
    if (c.kind === 'hearts') g.drawImage(A.HEART, x - Math.round(A.HEART.width / 2), FLOOR - 12 - Math.round(A.HEART.height / 2));
    else { g.save(); g.scale(2, 2); core.drops.drawIcon(g, c.kind, x / 2 - 7, (FLOOR - 19) / 2); g.restore(); }
  }
  // warm sconces; the brownout; dark and red on the drop and the fight
  function shade(t) {
    let dark = 0, red = 0;
    if (Q.fight && t >= T.eye && t < T.fall) dark = .12 + (Math.floor(t * 14) % 5 === 0 ? .22 : 0) + clamp((t - T.eye) / 3, 0, 1) * .1;
    if (lightsOut(t)) { const fight = t >= T.reel; dark = fight ? .08 : .3; red = (fight ? .16 : .3) + (Math.floor(t * 2) % 2 ? .06 : 0); }
    const a = top().arrive; if (t >= a && t < a + .3) dark = .2;
    if (dark) { g.save(); g.globalAlpha = dark; rect(g, 0, 0, W, H, '#05030a'); g.restore(); }
    if (red) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = red; rect(g, 0, 0, W, H, '#ff3a2a'); g.restore(); }
  }
  function lightGlows(t) {
    const flick = Q.fight && t >= T.eye && t < T.fall && Math.floor(t * 14) % 5 === 0;
    if (!lightsOut(t) && !flick) for (const x of [118, 362]) { glow(x, 86, 46, '#ffcf7a', .35); disc(g, x, 88, 4, '#fff0c0'); }
    if (lightsOut(t)) { glow(240, 8, 220, '#ff3a2a', (t >= T.reel ? .22 : .16) + (Math.floor(t * 2) % 2 ? .08 : 0)); disc(g, 240, 8, 4, Math.floor(t * 2) % 2 ? '#ff3a2a' : '#7a1a14'); }
    if (eyeOn(t)) glow(240, 64, 44, '#ff7a2a', .45);
    if (Q.fight && t >= T.brake && t < T.brake + .7) { glow(10, 200, 70, '#ffb040', .5); glow(470, 200, 70, '#ffb040', .5); }
    for (const s of R.shots) glow(PX(s.u), arena.PYh(s.h), 12, '#7fd4ff', .5);
  }
  function drawBits() {
    for (const d of Q.dust) { g.save(); g.globalAlpha = 1 - d.t / d.dur; rect(g, d.x, d.y, 1, 1, '#8a8094'); g.restore(); }
  }
  function drawSparks() {
    for (const s of Q.sparks) { const k = s.t / s.dur; rect(g, s.x, s.y, 1, 1, k < .5 ? '#ffd060' : '#ff7a2a'); rect(g, s.x + 1, s.y, 1, 1, '#ffd060'); }
  }
  function drawExit(t) {
    if (Q.board || Q.t < Q.exitAt || (!Q.fight && R.talk) || Q.out > 0 || R.phase === 'dead') return;
    const bob = Math.round(Math.sin(t * 5) * 2), label = Q.destination.label === 'R' ? 'ROOF' : 'FLOOR ' + Q.destination.label;
    otxt(g, label, 240, 92 + bob, '#ffd44a', 2, 'center');
    rect(g, 236, 106 + bob, 9, 3, '#ffd44a'); rect(g, 238, 109 + bob, 5, 2, '#ffd44a'); rect(g, 240, 111 + bob, 1, 1, '#ffd44a');
  }

  // ---------- the cut-ins: above the car ----------
  const CUT = { x0: 70, y0: 18, w: 340, h: 160 };
  function drawShaft(o) {
    const { x0, y0, w, h } = CUT, wx = 240, wy = y0 + 28, RW = 18;
    g.save(); g.globalAlpha = .6; rect(g, 0, 0, W, H, '#05030a'); g.restore();
    rect(g, x0 - 4, y0 - 4, w + 8, h + 8, '#1a1418'); rect(g, x0 - 2, y0 - 2, w + 4, h + 4, '#c9962e');
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    rect(g, x0, y0, w, h, '#120e14');
    const off = ((Math.round(o.scroll) % 16) + 16) % 16;
    for (let y = y0 - 16 + off; y < y0 + h; y += 8) { rect(g, x0, y, w, 1, '#1e1820'); for (let x = x0 + (Math.floor((y - off) / 8) % 2 ? 12 : 0); x < x0 + w; x += 24) rect(g, x, y, 1, 8, '#1e1820'); }
    if (Math.abs(o.speed) > .5) for (let i = 0; i < 10; i++) { const y = y0 + ((i * 37 + Math.round(o.scroll * 3)) % h + h) % h; rect(g, x0 + 10 + i * 31, y, 1, 14, '#3a3040'); }
    for (const rx of [126, 318]) { rect(g, rx, y0, 6, h, '#2e2830'); rect(g, rx, y0, 1, h, '#4a4250'); }
    // the machine beam and the sheave, with the cable over it
    rect(g, x0, y0, w, 8, '#2e2830'); rect(g, x0, y0 + 8, w, 1, '#4a4250'); rect(g, wx - 3, y0 + 8, 6, wy - y0 - 8, '#2e2830');
    g.strokeStyle = o.taken > .25 ? '#ff7a2a' : '#9a9aa4'; g.lineWidth = 3; g.beginPath(); g.arc(wx, wy, RW, Math.PI, 0); g.stroke();
    disc(g, wx, wy, RW - 2, '#3a3438'); disc(g, wx, wy, RW - 5, '#26222a');
    for (let i = 0; i < 4; i++) { const a = o.angle + i * Math.PI / 2; line(g, wx, wy, wx + Math.cos(a) * (RW - 3), wy + Math.sin(a) * (RW - 3), '#8a8494'); }
    disc(g, wx, wy, 3, '#c9962e');
    // the car's side of the cable (left), the counterweight's (right)
    const lx = wx - RW, rx2 = wx + RW, carTop = o.roofY - 8, takenTo = lerp(wy, carTop, clamp(o.taken, 0, 1));
    for (let y = wy; y < Math.min(carTop, y0 + h); y += 2) {
      const mine = y <= takenTo && o.taken > 0, wob = o.slack ? Math.sin(y * .08 + o.t * 18) * o.slack : 0;
      rect(g, lx - 1 + wob, y, 3, 2, mine ? '#ff7a2a' : '#9a9aa4'); rect(g, lx - 1 + wob, y, 1, 2, mine ? '#ffd060' : '#d8d8e0');
    }
    for (let y = wy; y < Math.min(o.cwY, y0 + h); y += 2) rect(g, rx2 - 1, y, 3, 2, o.taken > .25 ? '#ff7a2a' : '#9a9aa4');
    // p(Loom)'s thread wound down the cable
    if (o.taken > 0 && o.taken < 1.5) for (let y = wy + 4; y < takenTo; y += 6) { const ph = Math.floor((y + o.t * 80) / 6) % 2; line(g, lx - 5, y, lx + 5, y + 3, ph ? '#ffd060' : '#ff7a2a'); }
    rect(g, rx2 - 11, o.cwY, 22, 34, '#1a1418'); rect(g, rx2 - 10, o.cwY + 1, 20, 32, '#4a4250'); for (let i = 0; i < 4; i++) rect(g, rx2 - 10, o.cwY + 4 + i * 8, 20, 1, '#2e2830');
    // the car's roof: crosshead and hatch
    rect(g, lx - 82, o.roofY, 164, 60, '#2a1d18'); rect(g, lx - 82, o.roofY, 164, 3, '#c9962e'); rect(g, lx - 82, o.roofY + 3, 164, 1, '#6a4a18');
    rect(g, lx - 16, carTop, 32, 8, '#3a3030'); rect(g, lx - 4, carTop - 4, 8, 4, '#4a4250');
    rect(g, lx - 66, o.roofY + 8, 40, 10, '#0c0808'); for (let x = lx - 64; x < lx - 26; x += 6) rect(g, x, o.roofY + 8, 2, 10, '#3a3030');
    // p(Loom) up on the roof: its eye at the top of the shaft, its threads running down from it
    const EX = x0 + w - 44, EY = y0 + 22, pulse = .5 + .5 * Math.sin(o.t * (o.taut ? 14 : 6));
    rect(g, EX - 26, y0, 52, 8, '#0c0a10');
    glow(EX, EY, 34, '#ff7a2a', .35 + .3 * pulse);
    disc(g, EX, EY, 9, '#3a1408'); disc(g, EX, EY, 7, '#ff7a2a'); disc(g, EX, EY, 5, '#ffd060'); disc(g, EX, EY, Math.round(2 + pulse), '#140806');
    otxt(g, 'P(LOOM)', EX, EY + 13, '#ff9a3c', 1, 'center');
    if (o.taut) otxt(g, 'ON THE ROOF', EX, y0 + 2, '#ff9a3c', 1, 'center');
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) {
      const sx = EX - 4 + i * 4, sy = EY + 4;
      const ex = o.taut ? wx + Math.cos(-.6 - i * .5) * RW : lx + 2, ey = o.taut ? wy + Math.sin(-.6 - i * .5) * RW : wy + 18 + i * 10;
      let px0 = sx, py0 = sy;
      for (let s = 1; s <= 22; s++) {
        const u = s / 22; if (u > o.threads) break;
        const wv = o.taut ? Math.sin(u * 30 + o.t * 60) * .8 : Math.sin(u * 10 + o.t * 7 + i) * 6 * (1 - u);
        const x = lerp(sx, ex, u), y = lerp(sy, ey, u) + wv;
        line(g, px0, py0, x, y, '#ff7a2a'); line(g, px0, py0 + 1, x, y + 1, '#a8401a'); px0 = x; py0 = y;
      }
    }
    if (o.flare) glow(lx, wy + 40, 50, '#ff7a2a', o.flare);
    g.restore();
    g.restore();
    otxt(g, 'ABOVE THE CAR', x0 + 10, y0 + 14, '#c9962e', 2);
    if (o.caption) otxt(g, o.caption, x0 + w / 2, y0 + h - 18, o.capCol || '#ffd060', 2, 'center');
    if (o.arrow) { const ax = wx - RW - 34, ay = y0 + 72 + Math.round(Math.sin(o.t * 14) * 4);
      for (let i = 0; i < 3; i++) { const yy = ay + i * 10; for (let r = 0; r < 6; r++) rect(g, ax - (o.arrow > 0 ? 6 - r : r), yy + r, (o.arrow > 0 ? 6 - r : r) * 2 + 1, 1, i === Math.floor(o.t * 10) % 3 ? '#ffd060' : '#a8401a'); } }
  }
  const cutActive = t => Q.fight && ((t >= T.cut && t < T.fall) || (t >= T.hook && t < T.reel + .15));
  function drawCut(t) {
    const base = CUT.y0 + 118, cwBase = CUT.y0 + 62;
    if (t >= T.cut && t < T.fall) {
      const k = t - T.cut, letGo = k >= T.snap - T.cut, d = letGo ? k - (T.snap - T.cut) : 0;
      drawShaft({ t, roofY: base + d * d * 520, cwY: cwBase - d * d * 520, angle: letGo ? 1.4 - d * d * 26 : k * 1.2,
        taken: clamp((k - .55) / .55, 0, 1), threads: clamp((k - .15) / .45, 0, 1), slack: letGo ? 2 : 0, taut: false,
        scroll: letGo ? -d * d * 520 : k * 12, speed: letGo ? 9 : 0, flare: letGo && d < .25 ? .7 * (1 - d / .25) : 0,
        caption: k < .15 ? '' : !letGo ? 'P(LOOM) TAKES THE CABLE' : 'AND LETS GO', capCol: !letGo ? '#ff9a3c' : '#ffd060', arrow: letGo ? 1 : 0 });
    } else {
      const k = clamp((t - T.hook) / (T.reel - T.hook), 0, 1), e = ease(k);
      drawShaft({ t, roofY: lerp(CUT.y0 + CUT.h + 40, base, e), cwY: lerp(CUT.y0 - 40, cwBase, e), angle: k * k * 30,
        taken: 1, threads: 1, slack: 0, taut: true, scroll: e * 160, speed: 9, flare: .3, caption: 'AND REELS YOU IN', capCol: '#ffd060', arrow: -1 });
    }
  }

  // ---------- the words ----------
  function bubble(text, x, y, tailX, keepTail = false) {
    const w = textWidth(text) * 2 + 12, h = 20; x = clamp(Math.round(x - w / 2), 4, W - w - 4);
    if (keepTail) tailX = clamp(tailX, x + 6, x + w - 6);
    rect(g, x - 2, y - 2, w + 4, h + 4, '#1a1418'); rect(g, x, y, w, h, '#fff6e2'); txt(g, text, x + 6, y + 5, '#1a1418', 2);
    rect(g, tailX - 3, y + h, 8, 2, '#1a1418'); rect(g, tailX - 1, y + h, 4, 2, '#fff6e2'); rect(g, tailX - 1, y + h + 2, 4, 2, '#1a1418');
  }
  function drawTalk() {
    const T2 = R.talk; if (!T2 || !T2.speaker) return;
    let n = 0; while (n < T2.text.length && T2.times[n] <= T2.t) n++;
    const s = T2.text.slice(0, Math.max(1, n));
    if (T2.speaker === 'ploom') {
      rect(g, 0, H - 30, W, 30, '#140806'); rect(g, 0, H - 30, W, 2, '#ff7a2a');
      disc(g, 18, H - 15, 7, '#ff7a2a'); disc(g, 18, H - 15, 4, '#ffd060'); disc(g, 18, H - 15, 2, '#140806');
      otxt(g, 'P(LOOM)', 34, H - 22, '#ff7a2a', 1); otxt(g, s, 34, H - 14, '#ffd060', 2);
    } else if (T2.speaker === 'operator') bubble(s, 356, 128 - Math.round(Q.lift) - Math.round(Q.cap), 356);
    // Quiet-ride movement stays live: keep his bubble between the phone pads even at either wall.
    else { const bx = Math.round(PX(bull.u)), lift = Math.round(arena.PYh(0) - arena.PYh(bull.jh)) + Math.round(R.arena.lift || 0); bubble(s, Q.fight ? bx : W / 2, 132 - lift, bx, !Q.fight); }
  }

  // ---------- the frame ----------
  const half = fn => () => { g.save(); g.scale(.5, .5); fn(); g.restore(); };
  const draw = half(() => {
    const t = Q.t;
    if (!BG) BG = paintCar();
    drawShaftSides(t); g.drawImage(BG, 0, 0);
    drawDial(t); drawDoors(t); drawHatch(t); drawOperator(t); drawCrate();
    g.restore(); arena.draw(); g.save(); g.scale(.5, .5);
    if (Q.board) drawDoors(t, true); // closing leaves cover him; boarding itself never fades or shrinks
    drawBits(); shade(t);
  });
  function glows() {
    const t = Q.t;
    g.save(); g.scale(.5, .5);
    shaftLamps(t); lightGlows(t); drawEye(t); drawThreads(t); drawSparks(); drawExit(t);
    g.restore();
    arena.glows();
  }
  const overlay = half(() => { if (cutActive(Q.t)) drawCut(Q.t); });
  function hud() {
    drawSoulsCounter();
    g.save(); g.scale(.5, .5); drawTalk(); g.restore();
  }
  function shakeOffset() {
    const sh = shakeAt(Q.t) + Math.max(0, R.shake) * 20;
    if (!sh) return [0, 0];
    return [Math.round(Math.sin(R.t * 71) * sh) / 2, Math.round(Math.cos(R.t * 53) * sh) / 2];
  }
  const noop = () => {};
  return {
    id: 'elevator', tune: { scroll: 0, aisle: arena.ARENA.limit, move: .55, bossHP: 0 }, set: { flat: true },
    label: 'Unruggabull, side on, in the walnut-and-brass elevator climbing RugCo Tower, with its Unrugged operator on his stool.',
    lines: { low: false, rugged: false, spread: false, deflect: false },
    newRun, update, opening: noop, resume: noop, use(x) { g = x; arena.use(x); },
    view: () => ({ ambient: 1 }), lights: arena.lights, shakeOffset,
    draw, glows, overlay, hud,
    fire: arena.fire, slashHits: arena.slashHits, muzzleXY: () => ({ x: arena.X(bull.u + (bull.facing || 1) * .12), y: arena.Y(bull.jh + .14) }),
    soulFreed(f) { f.to = { x: 220, y: 7 }; },
    aim: noop, shotHits: () => false, shotFar: () => false, posOf: o => o, slash: noop, hurt: noop, blasterBack: noop,
    bonusBy: () => null, endPull: noop, cutRug: noop, draggedIn: noop, blowUp: noop,
    stageNo: () => R.phase === 'win' ? 17 : 16, stageNames: { 16: 'Elevator ride', 17: 'Elevator cleared' },
    pauseText: 'The elevator waits.',
    continueText: () => Q.fight ? 'Back to the threads with full hearts?' : 'Ride again with full hearts?',
    clearCard: (extra, best, clock) => ({ title: 'Elevator clear', text: '', rows: [['Souls', String(R.souls)], ['Time', clock(R.endT)]], note: '' }),
    ELEVATOR, T, arena, top, floorAt, speedAt, shakeAt, doorOpening, fightOn, locked, cutActive, spawnWave
  };
};
