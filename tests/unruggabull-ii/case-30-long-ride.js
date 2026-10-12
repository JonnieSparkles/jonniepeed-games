(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const music = Snd.music, cues = [], events = [];
  Snd.music = (id, options) => { cues.push({ id, options }); music(id, options); };
  const fresh = options => {
    travelHook = null; checkpoint = null; RUN.force = 42;
    newRun(Object.assign({ stage: 'elevator', transfer: true, souls: 7, from: 13 }, options));
    RUN.force = null; setState('play'); clearHeld(); input.jump = input.slash = input.shoot = 0;
    bull.inv = 1e9; emitHook = (type, data) => events.push({ type, data, t: R.t });
  };
  try {
    fresh();
    check(cues[0].id === 'hornsUp' && cues[0].options.pattern === 'intro', 'long ride starts Horns Up on muzak intro');
    check(R.elevator.from === 13 && R.elevator.fight, 'long ride is the default from 13');
    tick(19.7);
    check(!R.elevator.snapped && !events.some(e => e.type === 'elevator_heavy'), 'game holds intro before 60 percent');
    tick(.14);
    check(R.elevator.state === 'snap' && R.elevator.snapped && Snd.track === null && R.shake > 0, 'snap cuts muzak with jolt');
    const at = R.elevator.climbed;
    const first = floor.view().ambient; R.elevator.t += 1 / 30;
    check(floor.view().ambient !== first, 'snap flickers lights without outcome randomness'); R.elevator.t -= 1 / 30;
    tick(.6);
    check(R.elevator.state === 'climb' && Snd.track === 'hornsUp' && cues.at(-1).options.pattern === 'heavy', 'game jumps same track into heavy pattern');
    check(R.bark && R.bark.text === 'Here I come, p(Loom).', 'bull says the approved post-snap line');
    check(R.elevator.climbed >= at && events.filter(e => e.type === 'elevator_snap').length === 1, 'one snap per ride');
    tick(4);
    const warm = events.filter(e => e.type === 'elevator_wave' && e.data.kind === 'warmup');
    const heavy = events.filter(e => e.type === 'elevator_wave' && e.data.kind === 'heavy');
    check(warm.length > 1 && warm.every(e => e.data.amount >= 1 && e.data.amount <= 2), 'warmup stays light');
    check(warm[0].t <= 3 && warm.every((e, i) => !i || e.t - warm[i - 1].t <= 3), 'warmup never waits more than three seconds');
    check(heavy.length >= 3 && heavy[0].data.amount < heavy.at(-1).data.amount, 'post-snap waves accelerate and grow');
    check(events.some(e => e.type === 'arena_throw'), 'flyers throw during an untouched actual wave');
    // No-fight uses the same ride hooks; it is configuration, not another registered stage.
    cues.length = events.length = 0;
    fresh({ fight: false, from: 48 });
    check(R.elevator.indicator === 48 && !R.elevator.fight && Snd.track === 'pleaseHold', 'plain configuration starts at 48 on Please Hold');
    tick(33.2);
    check(R.elevator.state === 'supply' && floor.doorOpening() === 1 && R.elevator.indicator === 99, 'plain ride opens at R with a crate');
    check(!events.some(e => ['arena_spawn', 'arena_throw', 'elevator_snap', 'elevator_heavy'].includes(e.type)), 'plain ride never fights or snaps');
    check(R.arena.enemies.length === 0 && R.hearts === 5 && R.souls === 7, 'plain ride preserves souls and hearts');
    const p = R.elevator.crate; bull.u = p.u;
    tick(1 / 60); check(p.got && R.elevator.state === 'exit' && R.heldDrop === 'spread', 'crate is grabbable without waiting');
    tick(.9); check(R.stage === 'roof' && R.roof.state === 'elevator' && R.souls === 7 && R.heldDrop === 'spread', 'plain configuration hands off');
    // The exact reported problem: already standing on the right when the crate is CREATED.
    fresh({ fight: false }); floor.enter('open'); bull.u = floor.ELEVATOR.crateStart;
    tick(1.21);
    check(R.elevator.state === 'exit' && R.elevator.crate.got && R.elevator.crate.u === floor.ELEVATOR.crateStart, 'crate collected at creation before sliding away');
    fresh({ from: 48, fight: false }); R.souls += 4; bull.inv = 0; hurtBull(5, 'test'); tick(3); goBtn.click();
    check(R.elevator.from === 48 && !R.elevator.fight && R.elevator.indicator === 48 && R.souls === 7, 'continue retains ride configuration and entry souls');
    // Replay is still the secondary clear-card button and restarts the original floor.
    newRun(); setState('play'); R.phase = 'win'; R.endT = 1; endRun('clear');
    check(goBtn.textContent === 'Take the elevator' && altBtn.textContent === 'Play again', 'primary/secondary clear buttons');
    altBtn.click(); check(R.stage === 'floor13' && R.phase === 'hall' && state === 'play', 'secondary replay restarts Floor 13');
  } finally {
    Snd.music = music; emitHook = null; RUN.force = null; checkpoint = null; travelHook = null;
    newRun(); setState('title'); showCard('title');
  }
})();
