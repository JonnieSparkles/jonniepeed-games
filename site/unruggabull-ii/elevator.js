// Long ride arena stage. Start, destination and combat are data; plain rides reuse its hooks.
var UnrugElevator = function (core) {
  'use strict';
  const { A, Snd, TUNE, rect, line, txt, clamp, emit, talk, updateFx, endRun, drawSoulsCounter } = core;
  const ELEVATOR = { time: { ask: 1.8, climb: 30, snap: .45, open: 1.2, exit: .8 }, from: 13, fight: true,
    destination: { floor: 99, label: 'R', stage: 'roof' }, snapAt: .6, lastWave: 29,
    warmup: { every: 2.5, sizes: [1, 2] }, heavy: { every: 2, sizes: [2, 2, 3] },
    firstWave: 1, crateSpeed: .32, crateStart: .46, deadWait: 2.8,
    arena: { floorY: 122, limit: .88, flyerH: .26, dropSpeed: .3, crawlerSpeed: .24, flyerSpeed: .27, flyerLife: 3.4, wadSpeed: .2, firstThrow: [.8, 1.2], throwEvery: [4, 5] } };
  const arena = UnrugArena(core, ELEVATOR.arena);
  let R, bull, Q, g = core.g;
  function enter(name) {
    if (Q.state && STATES[Q.state].exit) STATES[Q.state].exit();
    Q.state = name; Q.t = 0; emit('elevator_state', { state: name });
    if (STATES[name].entry) STATES[name].entry();
  }
  const STATES = {
    ask: { entry() { talk('Floor?', 'operator'); Snd.music(Q.fight ? 'hornsUp' : 'pleaseHold', { slam: true, pattern: Q.fight ? 'intro' : undefined }); }, tick() { if (Q.t >= ELEVATOR.time.ask) enter('climb'); } },
    climb: { tick(dt) {
      Q.climbed = Math.min(ELEVATOR.time.climb, Q.climbed + dt);
      Q.indicator = Math.min(Q.destination.floor, Q.from + Math.floor((Q.destination.floor - Q.from) * Q.climbed / ELEVATOR.time.climb));
      if (Q.fight && !Q.snapped && Q.climbed >= ELEVATOR.time.climb * ELEVATOR.snapAt) { enter('snap'); return; }
      if (Q.fight) {
        Q.nextWave -= dt;
        if (Q.nextWave <= 0 && Q.climbed <= ELEVATOR.lastWave) {
          const size = Q.snapped ? ELEVATOR.heavy.sizes[Math.min(Q.heavyWaves++, ELEVATOR.heavy.sizes.length - 1)] : ELEVATOR.warmup.sizes[Q.wave % ELEVATOR.warmup.sizes.length];
          for (let i = 0; i < size; i++) arena.spawn((Q.wave + i) % 2 ? 'flyer' : 'crawler', { armored: Q.snapped && Q.heavyWaves % 2 === 1 && i === Math.floor(Q.heavyWaves / 2) % size });
          Q.wave++; Q.nextWave = Q.snapped ? ELEVATOR.heavy.every : ELEVATOR.warmup.every;
          emit('elevator_wave', { kind: Q.snapped ? 'heavy' : 'warmup', amount: size });
        }
      }
      if (Q.climbed >= ELEVATOR.time.climb) enter('open');
    } },
    snap: { entry() {
      Q.snapped = true; R.shake = .7; R.white = .06;
      Snd.music(null, { hard: true }); Snd.play('cableSnap'); emit('elevator_snap');
    }, tick() {
      if (Q.t < ELEVATOR.time.snap) return;
      Snd.music('hornsUp', { slam: true, pattern: 'heavy' }); core.bark('here', true);
      Q.nextWave = 0; emit('elevator_heavy'); enter('climb');
    } },
    open: { entry() {
      // Arrival clears the last wave, including its souls, before the doors open.
      for (const e of R.arena.enemies) arena.kill(e, 'clear');
      R.arena.enemies = []; R.arena.thrown = []; R.shots = [];
      Q.indicator = Q.destination.floor; Snd.music(null, { hard: true }); Snd.play('ding'); emit('elevator_ding');
    }, tick() { if (Q.t >= ELEVATOR.time.open) enter('supply'); } },
    supply: { entry() {
      Q.crate = { u: ELEVATOR.crateStart, kind: core.drops.choose(), got: false }; Snd.play('appear'); grabCrate();
    }, tick(dt) {
      const p = Q.crate;
      p.u = Math.max(-.8, p.u - ELEVATOR.crateSpeed * dt);
      // Crate stops; it never disappears if the player misses it.
      grabCrate();
    } },
    exit: { tick() {
      if (Q.t < ELEVATOR.time.exit) return;
      R.phase = 'win'; R.endT = R.t;
      emit('elevator_clear', { amount: R.t });
      // Bots stop here; a human run immediately enters the destination's existing lead-in.
      core.travel(Q.destination.stage, { ride: Q.destination });
    } }
  };
  function grabCrate() {
    const p = Q.crate;
    if (p && !p.got && arena.touches(p.u, .04, .09)) { p.got = true; core.drops.give(p.kind); enter('exit'); }
  }
  function newRun(r, b, at) {
    R = r; bull = b; R.speed = 0; R.phase = 'boss';
    if (at) { R.souls = R.shown = at.souls || 0; R.continues = (at.continues || 0) + (at.transfer ? 0 : 1); }
    arena.newRun(R, bull);
    Q = R.elevator = { state: null, t: 0, climbed: 0, from: at && at.from != null ? at.from : ELEVATOR.from,
      fight: at && at.fight != null ? at.fight : ELEVATOR.fight, snapped: false, indicator: 0, nextWave: ELEVATOR.firstWave,
      wave: 0, heavyWaves: 0, destination: Object.assign({}, ELEVATOR.destination, at && at.destination), crate: null };
    Q.indicator = Q.from;
    // Continue starts this ride again, with its entry souls and the original seeded stream.
    core.setCheckpoint({ stage: 'elevator', souls: R.souls, continues: R.continues,
      heldDrop: at && at.heldDrop || null, dropNext: at && at.dropNext || 'spread', destination: Q.destination, from: Q.from, fight: Q.fight,
      seedState: core.seedState(), runSeed: core.runSeed() });
    enter('ask');
  }
  function update(dt) {
    if (R.phase === 'dead') { updateFx(dt); if (R.phaseT > ELEVATOR.deadWait) endRun('rugged'); return; }
    Q.t += dt; STATES[Q.state].tick(dt);
    // A handoff changes the core's active floor; don't tick the previous run again.
    if (R.phase === 'win') return;
    arena.update(dt, Q.fight && (Q.state === 'climb' || Q.state === 'snap'));
  }
  // ---------- small stand-in art seams ----------
  function drawCar() {
    rect(g, 0, 0, 240, 135, '#4b4a58'); rect(g, 4, 22, 232, 100, '#76788a');
    line(g, 4, 94, 236, 94, '#d8c8a8'); rect(g, 0, 122, 240, 13, '#3b3a48');
    drawDoors(); drawHatch(); drawOperator();
  }
  function doorOpening() { return Q.state === 'open' ? clamp(Q.t / ELEVATOR.time.open, 0, 1) : ['supply', 'exit'].includes(Q.state) ? 1 : 0; }
  function drawDoors() {
    rect(g, 84, 41, 72, 81, '#1a1824');
    const w = 36 * (1 - doorOpening());
    rect(g, 84, 41, w, 81, '#9496a8'); rect(g, 156 - w, 41, w, 81, '#9496a8');
  }
  function drawHatch() { rect(g, 102, 22, 36, 4, '#1a1824'); line(g, 102, 27, 138, 27, '#b0a088'); }
  function drawOperator() {
    // Existing ghost rug plus two cap rectangles; no collision or target in the arena.
    g.drawImage(A.GHOST, 164, 102, 14, 18); rect(g, 163, 100, 16, 3, '#c43428'); rect(g, 167, 97, 8, 3, '#c43428');
    rect(g, 187, 65, 8, 27, '#3b3a48');
    for (let i = 0; i < 4; i++) rect(g, 190, 69 + i * 5, 2, 2, '#ffd44a');
  }
  function drawIndicator() {
    rect(g, 106, 30, 28, 9, '#1a1824');
    txt(g, Q.indicator === Q.destination.floor ? Q.destination.label : Q.indicator, 120, 32, '#ffd44a', 1, 'center');
  }
  function drawCrate() {
    const p = Q.crate; if (!p || p.got) return;
    const x = arena.X(p.u); rect(g, x - 9, 107, 18, 15, '#8c7a68');
    core.drops.drawIcon(g, p.kind, x - 7, 108);
  }
  function hud() {
    drawSoulsCounter();
    if (R.talk && R.talk.who === 'operator') {
      const t = R.talk; let n = 0; while (n < t.text.length && t.times[n] <= t.t) n++;
      txt(g, t.text.slice(0, n), 171, 85, '#fff6e2', 1, 'center');
    }
  }
  const noop = () => {};
  return {
    id: 'elevator', tune: { scroll: 0, aisle: .88, move: 1.2, bossHP: 0 }, set: { flat: true },
    label: 'Unruggabull in side view inside the climbing elevator, with a ceiling hatch and its Unrugged operator.',
    lines: { low: false, rugged: false, spread: false, deflect: false, here: 'Here I come, p(Loom).' },
    newRun, update, opening: noop, resume: noop, use(x) { g = x; arena.use(x); },
    view: () => ({ ambient: Q.state === 'snap' ? (Math.floor(Q.t * 30) % 2 ? .08 : .75) : .55 }), lights: arena.lights,
    draw() { drawCar(); arena.draw(); drawCrate(); }, glows() { arena.glows(); drawIndicator(); }, overlay: noop, hud,
    fire: arena.fire, slashHits: arena.slashHits, muzzleXY: () => ({ x: arena.X(bull.u + (bull.facing || 1) * .12), y: arena.Y(bull.jh + .14) }),
    soulFreed(f) { f.to = { x: 220, y: 7 }; },
    aim: noop, shotHits: () => false, shotFar: () => false, posOf: o => o, slash: noop, hurt: noop, blasterBack: noop,
    bonusBy: () => null, endPull: noop, cutRug: noop, draggedIn: noop, blowUp: noop,
    stageNo: () => R.phase === 'win' ? 17 : 16, stageNames: { 16: 'Elevator ride', 17: 'Elevator cleared' },
    pauseText: 'The elevator waits.', continueText: () => 'Restart the ride with full hearts and its starting souls?',
    clearCard: (extra, best, clock) => ({ title: 'Elevator clear', text: '', rows: [['Souls', String(R.souls)], ['Time', clock(R.endT)]], note: '' }),
    ELEVATOR, STATES, arena, enter, doorOpening, drawCar, drawDoors, drawHatch, drawOperator, drawIndicator, drawCrate
  };
};
