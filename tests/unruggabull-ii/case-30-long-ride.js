(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const T = floors.elevator.T;
  const music = Snd.music, say = Snd.say, play = Snd.play, cues = [], voices = [], sounds = [], events = [];
  Snd.music = (id, options) => { cues.push({ id, options: options || {}, t: R.elevator && R.elevator.t }); music(id, options); };
  Snd.say = (text, who) => { voices.push({ text, who }); say(text, who); };
  Snd.play = (id, arg) => { sounds.push(id); play(id, arg); };
  const fresh = options => {
    travelHook = null; checkpoint = null; RUN.force = 42; cues.length = voices.length = sounds.length = events.length = 0;
    newRun(Object.assign({ stage: 'elevator', transfer: true, souls: 7, from: 13 }, options));
    RUN.force = null; setState('play'); clearHeld(); input.jump = input.slash = input.shoot = 0;
    bull.inv = 1e9; emitHook = (type, data) => events.push({ type, data, t: R.elevator ? R.elevator.t : -1 });
  };
  const at = t => { while (R.elevator.t < t && R.phase !== 'dead' && R.phase !== 'win') { update(1 / 60); bull.inv = 1e9; } };
  try {
    fresh();
    check(cues[0].id === 'hornsUp' && cues[0].options.pattern === 'muzak' && cues[0].options.loopPattern, 'the long ride starts Horns Up on its muzak, held');
    check(R.elevator.from === 13 && R.elevator.fight, 'the long ride is the default, from 13');
    // the small talk, then p(Loom)
    const lines = [];
    let last = null;
    while (R.elevator.t < T.reel + 3) { update(1 / 60); bull.inv = 1e9; if (R.talk && R.talk !== last) { last = R.talk; lines.push(R.talk.speaker + ': ' + R.talk.text); } }
    check(JSON.stringify(lines) === JSON.stringify(['operator: FLOOR?', 'bull: YOU EVER GET OFF?', 'operator: FLOOR?', 'bull: ...THE ROOF.', 'operator: VERY GOOD, SIR.',
      'ploom: PROBABILITY OF ARRIVAL: ZERO PERCENT.', 'operator: ...FLOOR?', 'ploom: RECALCULATING. BRING HIM UP.', 'bull: HERE I COME, P(LOOM).']), 'the lines, in order: ' + lines.join(' / '));
    check(voices.filter(v => /PROBABILITY|RECALCULATING/.test(v.text)).every(v => v.who === 'loom'), 'p(Loom) talks in its machine blips');
    check(!document.querySelector('script[src*="sam"]') && !window.SamJs, 'no SAM in the game');
    const stop = cues.find(c => c.id === null), heavy = cues.find(c => c.options.pattern === 'reel');
    check(stop && Math.abs(stop.t - T.cut) < .02 && heavy && heavy.id === 'hornsUp' && Math.abs(heavy.t - T.reel) < .02, 'the muzak stops as p(Loom) takes the cable; Horns Up turns heavy on the reel');
    check(['rideCreak', 'rideWind', 'rideSlack', 'rideFall', 'rideBrake', 'rideBurst', 'rideHook', 'rideReel'].every(s => sounds.includes(s)), 'the cable, the drop, the brakes and the threads sound');
    check(['elevator_eye', 'elevator_cut', 'elevator_snap', 'elevator_fall', 'elevator_threads', 'elevator_heavy'].every(k => events.filter(e => e.type === k).length === 1), 'each beat once');
    // he can't act while the camera's above the car; he can after
    fresh(); at(T.cut + .5);
    const u0 = bull.u, shots0 = R.shots.length; keys.kbRight = true; press('shoot'); tick(.2); keys.kbRight = false;
    check(bull.u === u0 && R.shots.length === shots0 && R.arena.locked, 'locked during the cut-ins');
    at(T.hook + .1); keys.kbRight = true; tick(.2); keys.kbRight = false; check(bull.u > u0 && !R.arena.locked, 'his again once the threads hook the car');
    // the fight: waves from the reel, pairs, then three at a time; armor; never more than seven
    fresh(); bull.u = 0; let most = 0;
    while (R.elevator.t < T.arrive) { update(1 / 60); bull.inv = 1e9; most = Math.max(most, R.arena.enemies.length); }
    check(most === 7, 'never more than seven on screen');
    fresh(); bull.u = 0;   // this time they're shot as they arrive
    while (R.elevator.t < T.arrive) { update(1 / 60); bull.inv = 1e9; for (const x of R.arena.enemies) if (!x.dropping && !x.entering) x.dead = true; }
    const waves = events.filter(e => e.type === 'elevator_wave'), spawns = events.filter(e => e.type === 'arena_spawn');
    check(waves.length && Math.abs(waves[0].t - (T.reel + .6 + floors.elevator.ELEVATOR.waves.first)) < .05, 'the first wave comes after the reel');
    check(waves.every(e => e.t < T.arrive - .5) && waves.filter(e => e.t < T.last).every(e => e.data.amount === 2) && waves.filter(e => e.t > T.last).every(e => e.data.amount === 3), 'pairs, then three for the last floors');
    // both sides of him: threads either side in the middle; in through the open shaft when he's against a wall
    fresh(); at(T.reel); R.arena.enemies = []; bull.u = 0; floor.spawnWave(T.reel + 2);
    check(R.arena.enemies.some(e => e.u < 0) && R.arena.enemies.some(e => e.u > 0) && R.arena.enemies.every(e => e.dropping), 'a wave comes down the threads either side of him');
    R.arena.enemies = []; bull.u = -.85; floor.spawnWave(T.reel + 2);
    check(R.arena.enemies.some(e => e.entering === -1 && e.u < -.9) && R.arena.enemies.some(e => e.dropping && e.u > bull.u), 'backed against the left wall: one flies in from the shaft behind him');
    // pinned at a wall, a carpshit climbs out of reach and crosses over him
    R.arena.enemies = []; bull.u = -.8; const e = floor.arena.spawn('flyer'); Object.assign(e, { u: -.83, h: .13, hover: .13, dropping: false, nextThrow: 99, swoopT: 99 });
    tick(.2); check(e.cross === 1 && e.h > .2, 'pinned behind him, it climbs');
    tick(2); check(e.u > bull.u + .2 && !e.cross, 'and crosses to the other side');
    // outcomes: the same seed and inputs play the same; drawing changes nothing
    const play2 = drawn => {
      fresh(); bull.inv = 0; const trace = [];
      for (let i = 0; R.elevator.t < T.arrive && R.phase !== 'dead'; i++) {
        keys.kbShoot = i % 90 < 50; keys.kbRight = i % 240 < 30; keys.kbLeft = i % 240 > 120 && i % 240 < 150;
        if (i % 75 === 0) press('jump'); if (i % 110 === 0) press('slash');
        update(1 / 60); if (drawn && i % 3 === 0) draw();
        if (i % 30 === 0) trace.push([R.hearts, R.souls, bull.u.toFixed(5), R.arena.enemies.map(x => x.u.toFixed(5) + ',' + x.h.toFixed(5)).join(';')].join('|'));
      }
      keys.kbShoot = keys.kbRight = keys.kbLeft = false;
      return trace.join('\n');
    };
    const a = play2(false), b = play2(true);
    check(a === b && a.length > 1000, 'the same seed and inputs play the same; drawing changes nothing');
    // the quiet ride: configuration, not another stage. No fight, the muzak, and nothing handed out at the top.
    fresh({ fight: false, from: 48 });
    check(R.elevator.indicator === 48 && !R.elevator.fight && Snd.track === 'pleaseHold', 'the quiet ride starts at 48 on Please Hold');
    at(floor.top().doors + 2);
    check(floor.doorOpening() === 1 && R.elevator.indicator === 99 && !R.elevator.crate, 'the quiet ride opens at R, with no crate');
    check(!events.some(e => ['arena_spawn', 'arena_throw', 'elevator_snap', 'elevator_heavy', 'elevator_eye', 'elevator_crate'].includes(e.type)), 'the quiet ride never fights or hands out a crate');
    check(R.arena.enemies.length === 0 && R.hearts === 5 && R.souls === 7, 'the quiet ride keeps souls and hearts');
    bull.u = 0; at(R.elevator.exitAt + .05); tick(1.3); check(R.stage === 'roof' && R.roof.state === 'elevator' && R.souls === 7, 'the quiet ride hands off');
    fresh({ from: 48, fight: false }); R.souls += 4; bull.inv = 0; hurtBull(5, 'test'); tick(3); Cards.press('Retry'); if (Cards.confirming) Cards.press('Retry');
    check(R.elevator.from === 48 && !R.elevator.fight && R.elevator.indicator === 48 && R.elevator.t === 0 && R.souls === 7, 'a quiet-ride continue starts it over with its entry souls');
    // A clear has one button: Continue (the owner, Oct 15: no Replay).
    newRun(); setState('play'); R.phase = 'win'; R.endT = 1; endRun('clear');
    check(Cards.labels().join() === 'Continue', 'a clear has one button: Continue (no Replay)');
  } finally {
    Snd.music = music; Snd.say = say; Snd.play = play; emitHook = null; RUN.force = null; checkpoint = null; travelHook = null;
    keys.kbShoot = keys.kbRight = keys.kbLeft = keys.kbDown = false;
    newRun(); setState('title'); showCard('title');
  }
})();
