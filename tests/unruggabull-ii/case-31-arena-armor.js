(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const T = floors.elevator.T;
  const sounds = [], saved = Snd.play;
  Snd.play = id => { sounds.push(id); };
  function fresh() {
    RUN.force = 42; newRun(null, 'elevator'); RUN.force = null; setState('play');
    clearHeld(); input.jump = input.slash = input.shoot = 0; bull.u = -.5; bull.inv = 1e9;
    const e = floor.arena.spawn('flyer', { armored: true });
    Object.assign(e, { u: -.2, h: .129, hover: .129, dropping: false, nextThrow: 99, swoopT: 99 });
    return e;
  }
  try {
    let e = fresh();
    fire(); tick(.15);
    check(!e.dead && !e.armored && R.souls === 0, 'a bolt knocks the helmet off without a soul');
    check(sounds.includes('armorClank') && R.arena.fx.some(f => f.k === 'helmet'), 'the helmet clanks off');
    bull.cd = 0; R.fireT = 0; fire(); tick(.15); check(e.dead && R.souls === 1, 'a second bolt frees exactly one soul');
    e = fresh(); e.u = bull.u + .2;
    slash(); check(!e.dead && !e.armored, 'a slash knocks the helmet off');
    tick(.1); check(!e.dead && R.souls === 0, 'the same slash cannot hit twice');
    bull.cd = 0; slash(); check(e.dead && R.souls === 1, 'a second slash frees the soul');
    e = fresh(); e.u = bull.u + .6;
    for (let i = 0; i < 2; i++) {
      const p = floor.arena.throwWad(e); Object.assign(p, { u: bull.u + .15, h: .129 });
      bull.cd = 0; slash(); tick(.5);
      check(i ? e.dead && R.souls === 1 : !e.dead && !e.armored && R.souls === 0, 'returned paper takes two hits too');
    }
    e = fresh(); e.armored = false; fire(); tick(.15);
    check(e.dead && R.souls === 1, 'a plain carpshit takes one hit');
    // armored ones join the waves from the armor beat; more of them for the last floors
    fresh(); R.arena.enemies = []; const armored = [];
    const hook = emitHook; emitHook = (type) => { if (type === 'arena_spawn') armored.push([R.elevator.t, R.arena.enemies[R.arena.enemies.length - 1].armored]); };
    while (R.elevator.t < T.arrive - .5) { update(1 / 60); bull.inv = 1e9; for (const x of R.arena.enemies) if (!x.dropping) x.dead = true; }
    emitHook = hook;
    check(!armored.some(([t, a]) => a && t < T.armor), 'no armor before the armor beat');
    check(armored.some(([t, a]) => a && t < T.last) && armored.some(([t, a]) => !a && t > T.armor), 'after it, armored and plain mixed');
    check(armored.filter(([t, a]) => a && t > T.last).length > armored.filter(([t, a]) => a && t > T.armor && t < T.last).length / 2, 'more armor for the last floors');
  } finally { Snd.play = saved; checkpoint = null; RUN.force = null; newRun(); setState('title'); showCard('title'); }
})();
