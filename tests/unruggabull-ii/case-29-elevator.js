(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const T = floors.elevator.T;
  // Observe the draw transform without shipping hooks or changing simulation state.
  const drawnBull = () => {
    const scales = [], draws = [], probe = { globalAlpha: 1, save() {}, restore() {}, translate() {},
      scale(x, y) { scales.push([x, y]); }, drawImage() { draws.push(this.globalAlpha); } };
    floor.arena.use(probe);
    try { floor.arena.drawBull(); } finally { floor.arena.use(g); }
    return { scales, draws };
  };
  const fresh = () => { travelHook = null; RUN.force = 42; newRun(null, 'elevator'); RUN.force = null; setState('play'); bull.u = 0; clearHeld(); input.jump = input.slash = input.shoot = 0; };
  // a carpshit already hovering where we want it
  const enemy = (u, h) => { const e = floor.arena.spawn('flyer'); Object.assign(e, { u, h, hover: h, dropping: false, age: 0, nextThrow: 99, swoopT: 99 }); return e; };
  const at = t => { while (R.elevator.t < t && R.phase !== 'dead' && R.phase !== 'win') update(1 / 60); };
  try {
    const entranceRun = render => {
      newRun({stage:'elevator',transfer:true,fight:false,from:13,lobby:true,souls:31,continues:2,
        seedState:12345,runSeed:77,destination:{floor:48,label:'48',stage:'floor48'}});
      setState('play'); clearHeld(); keys.kbRight = true;
      for(let i=0;i<480;i++){ keys.kbRight = bull.u < floor.ELEVATOR.lobby.doorU; update(1/60); if(render && i%12===0) draw(); }
      keys.kbRight = false;
      return JSON.stringify({t:R.elevator.t,u:bull.u,lobby:R.elevator.lobby,cue:R.elevator.cue,seed,
        souls:R.souls,hearts:R.hearts,continues:R.continues,locked:R.arena.locked,track:Snd.track});
    };
    check(entranceRun(false) === entranceRun(true), 'drawing the lobby never changes the carried run or cue timing');
    fresh();
    check(!R.elevator.lobby && floor.doorOpening() === 0, 'direct elevator entry skips the lobby and starts with closed doors');
    check(R.stage === 'elevator' && R.elevator.indicator === 13 && R.elevator.fight, 'the long ride starts at 13');
    tick(.5); check(R.talk && R.talk.text === 'FLOOR?' && R.talk.speaker === 'operator' && Snd.track === 'hornsUp', 'operator asks Floor? over the muzak');
    bull.inv = 1e9; at(T.reel); check(!R.arena.enemies.length && R.elevator.indicator > 13, 'the climb is a breather: no carpshits before the reel');
    // the blaster, the katana and paper, side on
    fresh(); bull.inv = 1e9;
    const right = enemy(.35, .129); fire(); tick(.2);
    check(right.dead && R.souls === 1, 'a bolt frees a soul');
    R.arena.enemies = []; R.shots = []; keys.kbLeft = true; tick(.03); keys.kbLeft = false;
    check(bull.facing === -1, 'movement faces left');
    const left = enemy(bull.u - .36, .129); fire(); const bolt = R.shots[0]; check(bolt.vu < 0, 'a left-facing bolt flies left'); tick(.2); check(left.dead, 'the left bolt hits');
    const behind = enemy(bull.u + .2, .12), ahead = enemy(bull.u - .2, .12); bull.cd = 0; slash();
    check(ahead.dead && !behind.dead, 'the slash cuts only in front');
    R.arena.enemies = []; const thrower = enemy(-.7, .14); const wad = floor.arena.throwWad(thrower);
    Object.assign(wad, { u: bull.u - .2, h: .12 }); R.charge = 1; bull.cd = 0; slash();
    check(wad.friendly && wad.vu < 0 && R.charge === 4, 'a slash knocks paper back for three charges');
    tick(.4); check(thrower.dead && R.souls === 4, 'returned paper frees its thrower');
    // crouch, jump; what touches him
    fresh(); keys.kbDown = true; update(1 / 60); const old = bull.u; keys.kbRight = true; tick(.1);
    check(bull.crouch && bull.crouchWalking && Math.abs(bull.u - old - TUNE.move * TUNE.crouchWalk * .1) < .005, 'crouched in the ride, he walks at the crouch-walk speed');
    keys.kbRight = false;
    R.charge = TUNE.charges; R.fireT = 0; R.hot = false; const c0 = R.charge;
    check(fireCrouched() && R.charge === c0 - TUNE.crouchCost, 'but he can shoot crouched, for double the charge');
    function fireCrouched() { const n = R.shots.length; press('shoot'); tick(.05); return R.shots.length !== n; }
    press('jump'); tick(.05); check(bull.jh > 0 && !bull.crouch, 'jump out of crouch');
    keys.kbDown = keys.kbRight = false;
    fresh(); const high = enemy(0, .27); tick(.1); check(R.hearts === 5 && !high.dead, 'a high carpshit flies over his head');
    fresh(); bull.inv = 0; const dive = enemy(-.5, .14); dive.swoopT = 0; tick(.6);
    check(R.hearts === 4 && R.lastCause === 'dive', 'a dive through where he stands hits him');
    fresh(); keys.kbDown = true; const duck = enemy(-.5, .14); duck.swoopT = 0; tick(1.2); keys.kbDown = false;
    check(R.hearts === 5 && !duck.swoop, 'crouching ducks the dive');
    // No supplies (owner, Oct 15): E does nothing, and a Spread Shot pickup still fans three ways side on.
    check(!('KeyE' in CODES) && !('e' in NAMES) && !('KeyE' in TWIN_CODES), 'E is not a key: no supplies to use');
    fresh(); R.spread = TUNE.spreadT; fire();
    check(R.shots.length === 3 && R.shots.every(s => s.vu > 0) && R.shots.some(s => s.vh < 0) && R.shots.some(s => s.vh > 0), 'side spread fans above and below facing');
    // The real clear button carries the seeded stream and souls; rugged in the fight, continue from the threads.
    newRun(); setState('play'); R.souls = R.shown = 123; R.hearts = 1; R.phase = 'win'; R.endT = 130;
    const oldSeed = seed; endRun('clear'); check(Cards.labels().join() === 'Continue', 'one button: Continue'); Cards.press('Continue');
    check(R.stage === 'elevator' && R.souls === 123 && R.hearts === 5 && seed === oldSeed, 'same run enters the ride, full hearts');
    check(!R.elevator.fight && R.elevator.from === 13 && R.elevator.destination.stage === 'floor48', 'the 13th Floor takes the quiet ride to the 48th Floor');
    check(R.elevator.lobby && R.phase === 'lobby' && floor.doorOpening() === 0 && bull.u === -1.05 && R.arena.outShrink === false && R.elevator.t === 0,
      "the clear button starts the 13th Floor's lobby: doors shut, him walking in from the left");
    check(R.continues === 0 && checkpoint.seedState === oldSeed && !checkpoint.lobby,
      'the lobby carries continues and seed; the checkpoint stays the closed-door ride');
    // he walks straight to the doors: the dial counts up to 13, DING, the doors, Please Hold, GOING UP?, and he boards
    const lobbyEvents = []; emitHook = type => lobbyEvents.push(type);
    let boardedAt = null, sawDial = new Set(), sawGoing = false, boardingDrawn = null, lt = 0;
    for (let i = 0; i < 12 * 60 && R.elevator.lobby; i++) {
      keys.kbRight = bull.u < floor.ELEVATOR.lobby.doorU;
      update(1 / 60); lt += 1 / 60;
      if (R.elevator.lobby) {
        sawDial.add(floor.lobby.dialAt(floor.lobby.L.t));
        if (R.talk && R.talk.text === 'GOING UP?') sawGoing = true;
        if (floor.lobby.L.out > .3 && !boardingDrawn) boardingDrawn = drawnBull();
        check(R.elevator.t === 0 && !floor.locked(0), 'the ride clock waits in the lobby');
      } else boardedAt = lt;
    }
    keys.kbRight = false; emitHook = null;
    check(boardedAt !== null && boardedAt < 8, 'walking straight in, the lobby takes under 8 seconds: ' + boardedAt);
    check(sawDial.has(0) && sawDial.has(13) && [...sawDial].every(n => n >= 0 && n <= 13), 'the dial counts up from G to 13');
    check(lobbyEvents.includes('elevator_lobby_ding') && lobbyEvents.includes('elevator_board') && sawGoing, 'DING, the doors, GOING UP? and boarding');
    check(boardingDrawn && boardingDrawn.scales.length === 1 && boardingDrawn.scales[0][0] === 1 && boardingDrawn.scales[0][1] === 1 && boardingDrawn.draws[0] === 1,
      'boarding from the lobby draws him full size and fully visible');
    check(!R.elevator.lobby && R.phase === 'boss' && floor.doorOpening() === 0 && R.elevator.t < .05 && !R.talk && !R.arena.out && R.arena.outShrink && Snd.track === 'pleaseHold',
      'boarded: the ride starts with the doors shut, Please Hold carrying on from the lobby');
    check(seed === oldSeed && R.souls === 123 && R.continues === 0 && R.hearts === 5, 'the lobby preserves the carried run');
    tick(.4); check(R.talk && R.talk.text === 'FLOOR?' && R.elevator.t >= .35, 'the ride cues count from the doors closing');
    // A quiet-ride continue skips the lobby and preserves entry souls and seed.
    R.hearts = 1; bull.inv = 0; hurtBull(1, 'test'); tick(3); Cards.press('Retry'); if (Cards.confirming) Cards.press('Retry');
    check(!R.elevator.lobby && floor.doorOpening() === 0 && R.elevator.t === 0 && R.continues === 1 && R.souls === 123 &&
      R.hearts === 5 && seed === oldSeed, 'quiet-ride continue skips the lobby and keeps carried state: ' + JSON.stringify({lobby:R.elevator.lobby,doors:floor.doorOpening(),t:R.elevator.t,continues:R.continues,souls:R.souls,hearts:R.hearts,seed,oldSeed}));
    check(Snd.track === 'pleaseHold', 'the real 13 to 48 quiet ride plays Please Hold');
    const quietLines = [], expectedQuiet = [
      [.35, 'operator', 'FLOOR?'], [2.6, 'bull', 'FORTY-EIGHT.'],
      [5, 'operator', 'GOT A SLIP?'], [7.4, 'bull', 'ACCOUNTING.'],
      [10, 'operator', 'THEY STILL THERE?'], [12.4, 'bull', 'LESS OF THEM.'],
      ...floor.ELEVATOR.quiet.middle[R.elevator.middle].map(([, at, who, text]) => [at, who, text]),
      [31.3, 'operator', 'RECLAMATION, SIR.'], [33.3, 'bull', 'KEEP THE SLIP.']
    ];
    check(R.elevator.middle === (RUN.seed >>> 0) % 3 && floor.ELEVATOR.quiet.middle.length === 3, 'the middle exchange is picked from the run seed');
    const quietEvents = []; emitHook = (type) => quietEvents.push(type);
    let quietTalk = null;
    bull.u = -.4; keys.kbRight = true;
    while (R.elevator.t < 35.1) {
      const t = R.elevator.t, before = bull.u;
      if (t >= .2) keys.kbRight = false;
      if (t >= 30.4) bull.u = 0; // already in the doorway: no early exit can swallow the arrival exchange
      update(1 / 60);
      if (t < .2) check(bull.u > before && !R.arena.locked, 'quiet-ride banter never locks movement');
      check(!R.arena.out && R.stage === 'elevator', 'no walking out before the last arrival bubble finishes');
      check(!floor.locked(t) && !floor.cutActive(t) && !R.arena.enemies.length, 'the quiet ride has no fight or cut-ins');
      if (R.talk && R.talk !== quietTalk) {
        quietTalk = R.talk; quietLines.push([t, R.talk.speaker, R.talk.text]);
      }
      if (t < 29) check(Snd.track === 'pleaseHold', 'Please Hold lasts through the climb');
      else check(Snd.track === null, 'the ding hard-cuts Please Hold');
    }
    check(quietLines.length === expectedQuiet.length && quietLines.every((line, i) =>
      Math.abs(line[0] - expectedQuiet[i][0]) < .02 && line[1] === expectedQuiet[i][1] && line[2] === expectedQuiet[i][2]),
      'all quiet-ride lines play once, in order, at their times: ' + JSON.stringify(quietLines));
    check(!quietEvents.some(type => ['arena_spawn', 'arena_throw', 'elevator_eye', 'elevator_cut', 'elevator_snap', 'elevator_heavy'].includes(type)), 'quiet ride stays quiet');
    check(R.elevator.indicator === 48 && !R.elevator.crate && floor.doorOpening() === 1, 'arrival at 48 opens the doors, with no crate');
    check(seed === oldSeed, 'quiet-ride dialogue and drawing consume no outcome randomness');
    tick(.05); check(R.arena.out > 0 && !R.talk, 'walking out starts only once the last arrival bubble is gone');
    tick(1.2); check(R.stage === 'floor48' && R.souls === 123, 'the quiet ride carries the run onto the 48th Floor');
    emitHook = null;
    floor.startLobby(true); R.arena.out = .65;
    const lobbyBoarding = drawnBull();
    check(R.arena.outShrink === false && lobbyBoarding.scales[0][0] === 1 && lobbyBoarding.draws[0] === 1,
      'the 48th Floor lobby also boards at full size without fading');
    R.arena.out = 0;
    // crouch-walking in the 48th Floor's lobby too (half speed, facing kept)
    const crouchWalk = () => {
      bull.facing = 1; keys.kbDown = true; keys.kbRight = true; update(1 / 60); const u0 = bull.u; tick(.5); const moved = bull.u - u0;
      keys.kbRight = false; keys.kbLeft = true; tick(.2); const back = bull.u - u0 - moved, facing = bull.facing;
      keys.kbDown = keys.kbLeft = false; update(1 / 60);
      return { moved, back, facing };
    };
    floor.Q.lobby.t = floor.F48.lobby.walkIn + .1; bull.u = -.3;
    let cw = crouchWalk();
    check(bull.crouch === false && Math.abs(cw.moved - TUNE.move * TUNE.crouchWalk * .5) < .02 && cw.back < 0 && cw.facing === 1,
      "crouch-walking in the 48th Floor's lobby: half speed, and backing up keeps his facing: " + JSON.stringify(cw));
    const longSeed = seed;
    travel('elevator', { fight: true, from: 48 });   // the 48th Floor's lobby takes the long ride
    check(R.stage === 'elevator' && R.elevator.fight && R.elevator.from === 48 && R.souls === 123 && seed === longSeed, 'the long ride from 48 carries the run');
    bull.inv = 1e9; at(T.reel + 6); R.souls += 2; R.hearts = 1; bull.inv = 0; hurtBull(1, 'flyer'); tick(3);
    check(state === 'over' && checkpoint.souls === 123 && checkpoint.startAt === T.thread && Cards.info.back === 'THE THREADS' && Cards.info.lost === 2, 'the rugged card: back to the threads, the two souls of this try lost');
    Cards.press('Retry'); if (Cards.confirming) Cards.press('Retry');
    check(R.stage === 'elevator' && R.souls === 123 && R.hearts === 5 && R.elevator.t === T.thread && R.continues === 2 && !R.arena.enemies.length, 'continue starts at the threads');
    tick(.5); check(R.talk && R.talk.speaker === 'ploom', 'the threads come in again');
    // the top: the threads let go and take the last carpshits with them, the music stops
    bull.inv = 1e9; at(T.arrive - .05); const souls = R.souls, left2 = R.arena.enemies.length;
    check(left2 > 0, 'carpshits up to the top'); tick(.1);
    check(!R.arena.enemies.length && R.souls === souls + left2 && Snd.track === null, 'arrival frees the last of them and stops the music');
    at(T.doors + .6); check(floor.doorOpening() > 0 && floor.doorOpening() < 1, 'the doors open');
    // the crate: full hearts, or bonus souls when he's already full
    at(T.crate + .02); check(R.elevator.crate && !R.elevator.crate.got && R.elevator.crate.kind === 'hearts', 'the operator slides the crate over');
    R.hearts = 2; bull.u = R.elevator.crate.u; tick(1 / 60);
    check(R.elevator.crate.got && R.elevator.crate.gave === 'hearts' && R.hearts === 5, 'the crate fills his hearts');
    let full = R.souls; R.elevator.crate = null; R.elevator.t = T.crate; tick(1 / 60); bull.u = R.elevator.crate.u; tick(1 / 60);
    check(R.elevator.crate.gave === 'souls', 'full hearts: bonus souls'); tick(.5); check(R.souls === full + 20, 'twenty bonus souls');
    // walk out the doors: his back to us, onto the roof with what he has
    // in the doorway early, he waits for the exchange: FLOOR? then ROOF., then out (owner, Oct 13)
    bull.u = 0; at(T.doors + floor.ELEVATOR.exitAfter + .1); check(!R.arena.out, 'on the long ride he waits in the doorway for the exchange');
    at(T.doors + floor.ELEVATOR.ask.roof + .05); check(R.talk && R.talk.text === 'ROOF.' && !R.arena.out, 'FLOOR? and ROOF. play before he leaves');
    bull.u = .5; at(T.doors + floor.ELEVATOR.ask.out + .1); check(!R.arena.out, 'he walks out only from the doorway');
    bull.u = 0; tick(.1); check(R.arena.out > 0 && R.arena.locked && R.arena.outShrink, 'in the doorway he walks out, with exit shrinking unchanged');
    const exiting = drawnBull();
    check(Math.abs(exiting.scales[0][0] - (1 - R.arena.out * .35)) < 1e-12, 'the roof walk-out still draws him shrinking');
    full = R.souls; tick(1.2);
    check(R.stage === 'roof' && R.roof.state === 'elevator' && R.roof.fromRide && R.souls === full && R.roof.caught === full && R.hearts === 5, 'the roof starts its lead-in with the carried souls');
    // every middle exchange comes up: the pick follows the run seed alone
    const middles = new Set();
    for (const k of [0, 1, 2]) { RUN.force = k; newRun({ stage: 'elevator', transfer: true, fight: false, from: 13, souls: 0, destination: { floor: 48, label: '48', stage: 'floor48' } }); RUN.force = null; middles.add(R.elevator.middle); }
    check(middles.size === 3, 'all three middle exchanges are reachable');
    // the tower dial: G to R in every ride, so 48 sits just under halfway
    check(floor.floorAt(0) === 13 && Math.abs(floor.floorAt(2 + floor.ELEVATOR.quiet.climb) - 48) < 1e-9, 'the quiet ride reads 13 to 48 on the tower dial');
    // Crouch-walking, side on: the 13th Floor's lobby, both rides (and the 48th's lobby, above; the stairs, case 34).
    newRun({ stage: 'elevator', transfer: true, fight: false, from: 13, lobby: true, souls: 0, destination: { floor: 48, label: '48', stage: 'floor48' } });
    setState('play'); tick(floor.ELEVATOR.lobby.walkIn + .1); bull.u = -.4;
    cw = crouchWalk();
    check(Math.abs(cw.moved - TUNE.move * TUNE.crouchWalk * .5) < .02 && cw.back < 0 && cw.facing === 1 && TUNE.crouchWalk === .5,
      "crouch-walking in the 13th Floor's lobby: half speed, facing kept: " + JSON.stringify(cw));
    keys.kbDown = true; keys.kbRight = true; update(1 / 60);
    check(bull.crouch && bull.crouchWalking, 'down plus right is crouch-walking');
    const steps = new Set(); for (let i = 0; i < 40; i++) { update(1 / 60); steps.add(floor.arena.pose()); }
    check(steps.has('crouchWalk0') && steps.has('crouchWalk1') && steps.size === 2, 'crouch-walking steps through its two side poses: ' + [...steps]);
    keys.kbRight = false; update(1 / 60); check(floor.arena.pose() === 'crouch', 'and crouched still is the crouch');
    keys.kbDown = keys.kbRight = false;
    fresh(); bull.inv = 1e9; bull.u = -.4; cw = crouchWalk();
    check(Math.abs(cw.moved - TUNE.move * TUNE.crouchWalk * .5) < .02 && cw.back < 0 && cw.facing === 1, 'crouch-walking in the long ride: ' + JSON.stringify(cw));
    newRun({ stage: 'elevator', transfer: true, fight: false, from: 13, souls: 0, destination: { floor: 48, label: '48', stage: 'floor48' } });
    setState('play'); bull.u = -.4; cw = crouchWalk();
    check(Math.abs(cw.moved - TUNE.move * TUNE.crouchWalk * .5) < .02 && cw.back < 0 && cw.facing === 1, 'crouch-walking in the quiet ride: ' + JSON.stringify(cw));
    // ...and nowhere else: the 13th Floor, the 48th Floor's fight and the roof keep crouched = still (case 13 moves it)
    newRun(null, 'floor13'); check(!floor.crouchWalk, 'no crouch-walking on the 13th Floor');
    newRun(null, 'floor48'); check(floor.crouchWalk && !floor.crouchWalk() && floor.Q.st !== 'lobby', "no crouch-walking in the 48th Floor's fight");
    newRun(null, 'roof'); check(!floor.crouchWalk, 'no crouch-walking on the roof');
    // #stage=elevator&at=lobby starts in the 13th Floor's lobby
    const hash = location.hash; history.replaceState(null, '', '#stage=elevator&at=lobby');
    try { newRun(null, 'elevator'); check(R.elevator.lobby && !R.elevator.fight && R.elevator.from === 13 && R.elevator.destination.floor === 48, 'at=lobby starts in the lobby'); }
    finally { history.replaceState(null, '', hash || location.pathname); }
    // Destinations are parameters; floor label R is only the default.
    newRun({ stage: 'elevator', transfer: true, souls: 0, destination: { floor: 42, label: '42', stage: 'floor13' } }); setState('play'); bull.inv = 1e9;
    at(T.arrive + .1); check(R.elevator.indicator === 42, 'destination parameter');
  } finally { keys.kbDown = keys.kbLeft = keys.kbRight = false; travelHook = null; checkpoint = null; RUN.force = null; emitHook = null; newRun(); setState('title'); showCard('title'); }
})();
