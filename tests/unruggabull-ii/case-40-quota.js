// The 48th Floor's soul quota and the loom arrow (owner, Oct 16, in place of a time limit): souls from carpshits killed
// in the fight and limp rugs stop paying at F48.quota.souls, p(Loom) says so once, the cart comes at most twice, the fixed
// sources and the collapse still pay; the arrow points at the nearest running loom after a while with no loom hit.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const F = floors.floor48, F48 = F.F48, Z = F48.quota, td = F.td, Q = () => R.f48;
  const machine = (line, kind) => Q().machines.find(m => m.line === line && m.kind === kind);
  const events = [], oldHook = emitHook;
  emitHook = (type, data) => { events.push(type); if (oldHook) oldHook(type, data); };
  const fresh = () => { travelHook = null; RUN.force = 4040; newRun(null, 'floor48'); RUN.force = null; setState('play'); bull.inv = 1e9; };
  const killOne = () => { const e = td.spawn('flyer', { x: 400, y: 300, vx: 0, vy: 0, pace: 1, line: 0 }); td.kill(e, 'shot'); };
  try {
    // the quota
    fresh(); events.length = 0;
    const s0 = R.souls;
    for (let i = 0; i < Z.souls; i++) killOne();
    check(R.souls === s0 + Z.souls && Q().quota === Z.souls, 'kills pay until the quota fills');
    check(R.talk && R.talk.text === 'QUOTA MET. OVERTIME IS UNPAID.' && events.filter(e => e === 'f48_quota').length === 1, 'p(Loom) says the quota is met, once');
    for (let i = 0; i < 9; i++) killOne();
    check(R.souls === s0 + Z.souls && Q().unpaid === 9 && events.filter(e => e === 'f48_quota').length === 1, 'past it a kill pays nothing, and the line plays only once');
    const roll = td.spawn('roll', { x: 400, y: 300, vx: 0, vy: 0, pace: 1, line: 0 }); td.kill(roll, 'slash');
    F.limpRug(0);
    check(R.souls === s0 + Z.souls, 'a roll and a limp rug pay nothing past it either');
    const before = R.souls; F.breakMachine(machine(0, 'tank'), 'shot');
    check(R.souls >= before + F48.souls.tank, 'a machine still pays in full');
    // the cart: at most twice a visit
    Q().cart = null; Q().cartN = Z.carts; Q().cartNext = 0; F.stepCart(.1);
    check(!Q().cart && Q().cartN === Z.carts, 'a third cart never launches');
    fresh(); Q().cart = null; Q().cartN = 1; Q().cartNext = 0; F.stepCart(.1);
    check(Q().cart && Q().cartN === 2, 'the second does');
    // the collapse pays, and its freed carpshits aren't capped
    fresh(); for (let i = 0; i < Z.souls + 3; i++) killOne();
    for (let i = 0; i < 3; i++) td.spawn('flyer', { x: 400 + i * 20, y: 300, vx: 0, vy: 0, pace: 1, line: 0 });
    const c0 = R.souls; F.startCollapse();
    check(R.souls === c0 + 12 + 3, 'the collapse pays the soul main and every carpshit it frees');
    // a limp rug counts toward the quota on a fresh floor
    fresh(); const q0 = Q().quota; F.limpRug(1); check(Q().quota === q0 + F48.power.souls, 'a limp rug counts toward the quota');
    // the quota resets with the floor
    check(Q().quota === F48.power.souls && Q().unpaid === 0, 'a new visit starts the count at nothing');

    // the arrow: after F48.quota.idle seconds with no loom hit, at the nearest running loom off screen
    // far right, by the belts' ends, where the camera has the looms off screen
    fresh(); for (let i = 0; i < 90; i++) { bull.x = 720; bull.y = 440; update(1 / 60); } Q().t = 5; Q().loomHitAt = 0; draw();
    check(!Q().arrowOn, 'no arrow before the idle time');
    Q().t = Z.idle + 1; draw();
    check(Q().arrowOn, 'an arrow once no loom has been hurt for ' + Z.idle + ' s');
    F.hurtMachine(machine(0, 'loom'), 1, 'shot'); draw();
    check(!Q().arrowOn && Q().loomHitAt === Q().t, 'it goes as soon as a loom is hurt');
    Q().quotaAt = Q().t + .01; Q().t += .02; draw();
    check(Q().arrowOn, 'and comes back once the quota fills, until he hurts a loom again');
    const lm = machine(0, 'loom'); bull.x = (lm.x0 + lm.x1) / 2; bull.y = lm.y1 + 30; for (let i = 0; i < 90; i++) update(1 / 60); draw();
    check(!Q().arrowOn, 'never while the loom is on screen');
  } finally { emitHook = oldHook; }
})();
