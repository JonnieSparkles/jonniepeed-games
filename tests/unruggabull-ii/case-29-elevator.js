(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const T = floors.elevator.T;
  const fresh = () => { travelHook = null; RUN.force = 42; newRun(null, 'elevator'); RUN.force = null; setState('play'); bull.u = 0; clearHeld(); input.jump = input.slash = input.shoot = 0; };
  // a carpshit already hovering where we want it
  const enemy = (u, h) => { const e = floor.arena.spawn('flyer'); Object.assign(e, { u, h, hover: h, dropping: false, age: 0, nextThrow: 99, swoopT: 99 }); return e; };
  const at = t => { while (R.elevator.t < t && R.phase !== 'dead' && R.phase !== 'win') update(1 / 60); };
  try {
    fresh();
    check(R.stage === 'elevator' && R.heldDrop === null && R.elevator.indicator === 13 && R.elevator.fight, 'the long ride starts at 13 with no held supply');
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
    check(bull.crouch && bull.u === old, 'crouch stops movement');
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
    // Holding is distinct from using. All engines share the carried effect contract.
    for (const stage of ['floor13', 'roof', 'elevator']) {
      newRun(null, stage); setState('play'); clearHeld();
      if (stage === 'roof') floor.enter('round1');
      drops.give('spread'); check(R.spread === 0, 'spread held until use in ' + stage);
      press('drop'); const charge = R.charge; fire();
      if (stage === 'elevator') check(R.shots.every(s => s.vu > 0) && R.shots.some(s => s.vh < 0) && R.shots.some(s => s.vh > 0), 'side spread fans above and below facing');
      check(R.shots.length === 3 && R.charge === charge - 1 && R.spread === 10 && !R.heldDrop, 'three ways for one charge in ' + stage);
      R.shots = []; drops.give('bullRun'); press('drop');
      const h = R.hearts; check(!hurtBull(99, 'test') && R.hearts === h && R.bullRun === 5, 'Bull Run cannot be hurt in ' + stage);
      if (stage === 'elevator') { enemy(bull.u, .12); floor.arena.update(.01); check(R.souls > 0 && !R.arena.enemies.length, 'charge contact destroys arena carp'); }
      else {
        R.flies = [{ u: bull.u, z: bull.bz + .01, h: .12, hp: 1, ph: 0 }];
        if (stage === 'roof') { floor.launchSnare(); floor.volley(); const hp = R.roof.hp; const odds = R.roof.odds; R.roof.volley.t = 2; bull.u = R.roof.rings[0].u; bull.bz = floor.ROOF.ringZ;
          R.flies[0].u = bull.u; R.flies[0].z = bull.bz; drops.tick(.01, floor);
          check(R.roof.volley.orbs[0].landed && R.roof.odds === odds, 'charge destroys touched orb without moving odds'); check(R.roof.snare === null && R.roof.hp === hp, 'Bull Run cuts snare without hurting loom'); }
        else drops.tick(.01, floor);
        check(R.flies[0].dead && bull.bz >= 0, 'charge contact destroys corridor carp in ' + stage);
      }
      R.bullRun = 0; drops.give('vest'); R.hearts = 1; bull.inv = 0; const spot = { u: bull.u, bz: bull.bz };
      hurtBull(1, 'test'); check(R.hearts === 5 && R.phase !== 'dead' && R.heldDrop === null && bull.u === spot.u && bull.bz === spot.bz, 'Spare Vest revives at same spot in ' + stage);
      bull.inv = 0; hurtBull(5, 'test'); check(R.phase === 'dead', 'vest only saves once in ' + stage);
    }
    // The real clear button carries the seeded stream and souls; rugged in the fight, continue from the threads.
    newRun(); setState('play'); R.souls = R.shown = 123; R.hearts = 1; R.phase = 'win'; R.endT = 130;
    const oldSeed = seed; endRun('clear'); check(goBtn.textContent === 'Take the elevator' && altBtn.textContent === 'Play again' && !altBtn.hidden, 'elevator is primary, replay secondary'); goBtn.click();
    check(R.stage === 'elevator' && R.souls === 123 && R.hearts === 5 && seed === oldSeed, 'same run enters the ride, full hearts');
    check(!R.elevator.fight && R.elevator.from === 13 && R.elevator.destination.stage === 'floor48', 'the 13th Floor takes the plain ride to the 48th Floor');
    travel('elevator', { fight: true, from: 48 });   // the 48th Floor's lobby takes the long ride
    check(R.stage === 'elevator' && R.elevator.fight && R.elevator.from === 48 && R.souls === 123 && seed === oldSeed, 'the long ride from 48 carries the run');
    bull.inv = 1e9; at(T.reel + 6); R.souls += 2; R.hearts = 1; bull.inv = 0; hurtBull(1, 'flyer'); tick(3);
    check(state === 'over' && checkpoint.souls === 123 && checkpoint.startAt === T.thread, 'the continue card keeps the entry souls and the threads');
    goBtn.click();
    check(R.stage === 'elevator' && R.souls === 123 && R.hearts === 5 && R.elevator.t === T.thread && R.continues === 1 && !R.arena.enemies.length, 'continue starts at the threads');
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
    bull.u = 0; tick(.1); check(R.arena.out > 0 && R.arena.locked, 'in the doorway he walks out');
    full = R.souls; tick(1.2);
    check(R.stage === 'roof' && R.roof.state === 'elevator' && R.roof.fromRide && R.souls === full && R.roof.caught === full && R.hearts === 5, 'the roof starts its lead-in with the carried souls');
    // Destinations are parameters; floor label R is only the default.
    newRun({ stage: 'elevator', transfer: true, souls: 0, destination: { floor: 42, label: '42', stage: 'floor13' } }); setState('play'); bull.inv = 1e9;
    at(T.arrive + .1); check(R.elevator.indicator === 42, 'destination parameter');
    // Exactly 5 seconds of charge, then normal damage again.
    fresh(); drops.give('vest'); R.hearts = 1; hurtBull(1, 'test'); bull.inv = 0; hurtBull(5, 'test');
    check(checkpoint.heldDrop === null, 'used spare life stays used on a continue');
    fresh(); drops.give('bullRun'); drops.use(); tick(5.02); bull.inv = 0; check(!R.bullRun && hurtBull(1, 'test'), 'charge expires');
  } finally { keys.kbDown = keys.kbLeft = keys.kbRight = false; travelHook = null; checkpoint = null; RUN.force = null; emitHook = null; newRun(); setState('title'); showCard('title'); }
})();
