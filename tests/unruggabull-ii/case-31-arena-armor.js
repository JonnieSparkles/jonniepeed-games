(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const sounds = [], saved = Snd.play;
  Snd.play = id => { sounds.push(id); };
  function fresh(kind) {
    RUN.force = 42; newRun(null, 'elevator'); RUN.force = null; setState('play');
    clearHeld(); input.jump = input.slash = input.shoot = 0; bull.u = -.5; bull.inv = 1e9;
    const e = floor.arena.spawn(kind, { armored: true });
    Object.assign(e, { u: -.2, h: .14, dropping: false });
    return e;
  }
  try {
    for (const kind of ['crawler', 'flyer']) {
      let e = fresh(kind);
      fire(); tick(.06);
      check(!e.dead && !e.armored && R.souls === 0, kind + ' bolt strips armor without a soul');
      check(sounds.includes('armorClank') && R.fx.some(f => f.k === 'spark'), 'armor clanks and sparks');
      fire(); tick(.06); check(e.dead && R.souls === 1, 'second bolt frees exactly one soul');
      e = fresh(kind); e.u = bull.u + .2;
      slash(); check(!e.dead && !e.armored, 'slash strips armor');
      tick(.1); check(!e.dead && R.souls === 0, 'same slash cannot hit twice');
      slash(); check(e.dead && R.souls === 1, 'second slash frees soul');
      e = fresh(kind); e.u = bull.u + .6;
      for (let i = 0; i < 2; i++) {
        const p = floor.arena.throwWad(e); Object.assign(p, { u: bull.u + .15, h: .14 });
        slash(); tick(.17);
        check(i ? e.dead && R.souls === 1 : !e.dead && !e.armored && R.souls === 0, 'returned paper honors two hits');
      }
      e = fresh(kind); e.armored = false; fire(); tick(.06);
      check(e.dead && R.souls === 1, 'plain ' + kind + ' takes one hit');
    }
    fresh('crawler'); R.arena.enemies = []; floor.enter('climb');
    R.elevator.snapped = true; R.elevator.nextWave = 0; update(1 / 60);
    check(R.arena.enemies.some(e => e.armored) && R.arena.enemies.some(e => !e.armored), 'heavy waves mix armor and plain');
  } finally { Snd.play = saved; checkpoint = null; RUN.force = null; newRun(); setState('title'); showCard('title'); }
})();
