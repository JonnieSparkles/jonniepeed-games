(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const fresh = () => { travelHook = null; RUN.force = 42; newRun(null, 'elevator'); RUN.force = null; setState('play'); bull.u = 0; clearHeld(); input.jump = input.slash = input.shoot = 0; };
  const enemy = (kind, u, h) => { const e = floor.arena.spawn(kind); Object.assign(e, { u, h, dropping: false, age: 0 }); return e; };
  try {
    fresh();
    check(R.stage === 'elevator' && R.heldDrop === null && R.elevator.indicator === 13, 'direct ride starts at 13 with no held supply');
    check(R.talk.text === 'Floor?' && Snd.track === 'pleaseHold', 'operator asks Floor? over muzak');
    tick(3); check(R.elevator.state === 'climb' && R.elevator.indicator > 13, 'car climbs');
    tick(1); check(R.arena.enemies.length === 1 && R.arena.enemies.every(e => e.h > .4 && e.dropping && Math.abs(e.u) <= .12), 'wave drops through hatch');
    const prev = R.elevator.indicator; tick(1); check(R.elevator.indicator > prev, 'indicator counts upward');
    fresh(); floor.enter('climb');
    const right = enemy('crawler', .35, .14); fire(); tick(.15);
    check(right.dead && R.souls === 1, 'horizontal bolt frees a soul');
    R.arena.enemies = []; R.shots = []; keys.kbLeft = true; tick(.03); keys.kbLeft = false;
    check(bull.facing === -1, 'movement faces left');
    const left = enemy('crawler', bull.u - .36, .14); fire(); const bolt = R.shots[0]; check(bolt.vu < 0, 'left-facing bolt flies left'); tick(.15); check(left.dead, 'left bolt hits target');
    const behind = enemy('crawler', bull.u + .2, .08), ahead = enemy('crawler', bull.u - .2, .08); slash();
    check(ahead.dead && !behind.dead, 'slash arc only cuts in front');
    R.arena.enemies = []; const thrower = enemy('flyer', -.6, .18); const wad = floor.arena.throwWad(thrower);
    Object.assign(wad, { u: bull.u - .2, h: .12 }); R.charge = 1; bull.cd = 0; slash();
    check(wad.friendly && wad.vu < 0 && R.charge === 4, 'side deflect returns paper and three charges');
    tick(.2); check(thrower.dead && R.souls === 4, 'returned wad frees source soul');
    fresh(); keys.kbDown = true; update(1 / 60); const old = bull.u; keys.kbRight = true; tick(.1);
    check(bull.crouch && bull.u === old && !fireCrouched(), 'crouch stops movement and shooting');
    function fireCrouched() { const n = R.shots.length; press('shoot'); tick(.05); return R.shots.length !== n; }
    press('jump'); tick(.05); check(bull.jh > 0 && !bull.crouch, 'jump out of crouch');
    fresh(); R.hearts = 2; check(drops.choose() === 'vest', 'two hearts gives Spare Vest');
    R.hearts = 3; check(drops.choose() === 'spread', 'first healthy drop is Spread Shot'); drops.give();
    check(drops.choose() === 'bullRun', 'healthy drops alternate'); drops.give(); check(drops.choose() === 'spread', 'alternation cycles');
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
      if (stage === 'elevator') { enemy('crawler', bull.u, .08); floor.arena.update(.01); check(R.souls > 0 && !R.arena.enemies.length, 'charge contact destroys arena carp'); }
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
    // Real clear button, carry the seeded stream and souls. No phantom direct-roof captives.
    newRun(); setState('play'); R.souls = R.shown = 123; R.hearts = 1; R.phase = 'win'; R.endT = 130;
    const oldSeed = seed; endRun('clear'); check(altBtn.textContent === 'Take the elevator' && !altBtn.hidden, 'clear offers elevator'); altBtn.click();
    check(R.stage === 'elevator' && R.souls === 123 && R.hearts === 5 && seed === oldSeed, 'same run enters ride, full hearts');
    floor.enter('climb'); bull.inv = 1e9; tick(3); R.souls += 2; R.hearts = 1; bull.inv = 0; hurtBull(1, 'crawler'); tick(2);
    check(state === 'over' && checkpoint.souls === 123, 'ride continue card saves entry souls'); goBtn.click();
    check(R.stage === 'elevator' && R.souls === 123 && R.hearts === 5 && R.elevator.state === 'ask' && R.continues === 1, 'continue restarts entire ride');
    floor.enter('climb'); R.elevator.climbed = 29.99; enemy('crawler', .5, .1); tick(.02);
    check(R.elevator.indicator === 99 && R.elevator.state === 'open' && Snd.track === null && !R.arena.enemies.length && R.souls === 124, 'arrival clears last wave and stops muzak');
    tick(1.3); check(R.elevator.state === 'supply' && floor.doorOpening() === 1 && R.elevator.crate.kind === 'spread', 'doors open then supply slides out');
    bull.u = R.elevator.crate.u - .33; tick(1.01); const count = R.souls;
    check(R.elevator.state === 'exit' && R.heldDrop === 'spread', 'grab crate');
    tick(.9); check(R.stage === 'roof' && R.roof.state === 'elevator' && R.roof.fromRide && R.souls === count && R.roof.caught === count && R.roof.capturedTotal === count && R.hearts === 5 && R.heldDrop === 'spread', 'roof starts doors lead-in with carried souls and drop');
    // Numeric destinations are parameters; floor label R is only the default.
    newRun({ stage: 'elevator', transfer: true, souls: 0, destination: { floor: 42, label: '42', stage: 'floor13' } });
    floor.enter('climb'); R.elevator.climbed = 29.99; tick(.02); check(R.elevator.indicator === 42, 'destination parameter');
    fresh(); floor.enter('open'); R.hearts = 1; tick(1.3); check(R.elevator.crate.kind === 'vest', 'actual operator hands out vest when hurt');
    // Exactly 5 seconds of charge, then normal damage again.
    fresh(); drops.give('vest'); R.hearts = 1; hurtBull(1, 'test'); bull.inv = 0; hurtBull(5, 'test');
    check(checkpoint.heldDrop === null, 'used spare life stays used on a continue');
    fresh(); drops.give('bullRun'); drops.use(); tick(5.02); bull.inv = 0; check(!R.bullRun && hurtBull(1, 'test'), 'charge expires');
  } finally { travelHook = null; checkpoint = null; RUN.force = null; emitHook = null; newRun(); setState('title'); showCard('title'); }
})();
