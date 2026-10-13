// The 48th Floor: the twin-stick factory, Production Panic, the near miss, the lobby and the long ride from 48.
(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const F = floors.floor48, F48 = F.F48, td = F.td;
  const fresh = () => { travelHook = null; RUN.force = 42; newRun(null, 'floor48'); RUN.force = null; setState('play'); clearHeld(); input.jump = input.slash = input.shoot = 0; twin.aiming = false; twin.padX = twin.padY = 0; };
  const Q = () => R.f48;
  const machine = (line, kind) => Q().machines.find(m => m.line === line && m.kind === kind);
  const enemy = (kind, dx, dy) => { const e = td.spawn(kind, { x: bull.x + dx, y: bull.y + dy }); e.spawning = 0; if (kind === 'armored') e.nextThrow = 99; if (kind === 'roll') e.st = 'aim', e.t = -99; return e; };
  try {
    fresh();
    check(R.stage === 'floor48' && floor.twin() && Q().machines.length === 15 && Q().down.every(d => !d), 'three lines of five machines, all running');
    check(R.td.enemies.length === 0 && Q().items.every(list => list.length === 1), 'one rug on each belt to start, no carpshits yet');
    tick(.1); twinClass(); check(document.body.classList.contains('twin'), 'the page shows the twin sticks');
    // moving and aiming on two sticks
    const x0 = bull.x; twin.padX = 1; tick(.5); twin.padX = 0;
    check(bull.x > x0 + 30, 'the move stick moves him');
    twin.kb.aimUp = 1; tick(.05); check(bull.ay < -.9 && R.shots.length > 0 && R.shots[0].vy < 0, 'the arrow keys aim and fire'); twin.kb.aimUp = 0; tick(1); R.shots = [];
    // a belt carries him along the line
    bull.x = 205; bull.y = F.LINES[2].y; bull.vx = bull.vy = 0; const bx = bull.x; bull.inv = 1e9; tick(.5);
    check(bull.x > bx + 8, 'the belt carries him');
    bull.inv = 0;
    // the blaster on a carpshit, the katana on armor, a bobbin knocked back
    fresh(); bull.x = 650; bull.y = 420; bull.inv = 1e9;
    const f1 = enemy('flyer', 0, -90); twin.aiming = true; twin.aimX = 0; twin.aimY = -1; tick(.4); twin.aiming = false;
    check(f1.dead && R.souls >= 1, 'a bolt frees a carpshit\'s soul');
    const a1 = enemy('armored', 30, 0); input.slash = 0; twin.flick = { x: 1, y: 0 }; press('slash'); tick(.05);
    check(a1.dead, 'one slash cuts an armored carpshit, helmet and all');
    const a2 = enemy('armored', 160, 0); const charge = R.charge = 5;
    R.td.thrown.push({ x: bull.x + 30, y: bull.y, h: 18, vx: -100, vy: 0, src: a2, friendly: false, dead: false, r: 0, t: 0 });
    bull.cd = 0; twin.flick = { x: 1, y: 0 }; press('slash'); tick(.05);
    check(R.td.thrown[0] && R.td.thrown[0].friendly && R.charge === charge + TUNE.deflectCharge, 'the katana knocks a bobbin back for charges');
    tick(1.2); check(a2.dead, 'the bobbin goes back to whoever threw it');
    const r1 = enemy('roll', 0, -80), xl = bull.x; tick(.02); bull.cd = 0; twin.flick = { x: 0, y: -1 }; press('slash'); tick(.12);
    check(bull.y < 420 - 3 && bull.y > 420 - 12, 'the slash lunges a little');
    // machines: damage, the chain to the loom, a loom down
    fresh(); bull.inv = 1e9;
    const tank = machine(1, 'tank'), loom = machine(1, 'loom'), hp0 = loom.hp;
    F.breakMachine(tank, 'shot'); tick(.5);
    check(tank.dead && loom.hp <= hp0 - F48.toLoom && R.souls >= F48.souls.tank, 'a part breaking frees its souls and hurts its loom');
    const spinner = machine(1, 'spinner'); check(spinner.hp < spinner.max, 'the tank\'s blast reaches the spinner next to it');
    const made0 = R.td.enemies.length;
    F.breakMachine(loom, 'shot'); tick(.1);
    check(Q().down[1] && Q().panic === 1 && R.banner && R.banner.text === 'PRODUCTION PANIC', 'the loom takes its line down: Production Panic');
    tick(1.5); check(Q().machines.filter(m => m.line === 1).every(m => m.dead), 'the rest of the line goes down end to end');
    check(checkpoint && checkpoint.stage === 'floor48' && checkpoint.down[1], 'a continue keeps the line down');
    // the presses: the shadow, then the slam
    fresh(); const pr = machine(0, 'press'); bull.x = (pr.x0 + pr.x1) / 2; bull.y = F.LINES[0].y; bull.inv = 0; R.hearts = 5;
    let warned = false; for (let i = 0; i < 60 * 3 && R.hearts === 5; i++) { update(1 / 60); bull.x = (pr.x0 + pr.x1) / 2; bull.y = F.LINES[0].y; if (pr.warn > 0) warned = true; }
    check(warned && R.hearts === 4 && R.lastCause === 'press', 'a press warns with its shadow, then flattens him');
    // production: carpshits leave the end of each line, faster in the panic
    fresh(); bull.inv = 1e9; tick(12);
    check(R.events.made > 2 && R.td.enemies.some(e => e.line === 2 && (e.kind === 'roll' || e.kind === 'flyer')), 'the lines make carpshits, the bulk line rolls');
    // rugged and continue: the lines stay down
    fresh(); F.breakMachine(machine(0, 'loom'), 'shot'); tick(.1); bull.inv = 0; hurtBull(5, 'test'); tick(3);
    check(state === 'over' && checkpoint.down[0], 'rugged in the factory: the continue card');
    goBtn.click(); check(R.stage === 'floor48' && Q().down[0] && !Q().down[1] && R.hearts === 5 && R.continues === 1, 'continue: full hearts, the line still down');
    // the end: the collapse, two souls and two bells, the streams bend in, p(Loom) breaks them, the lobby
    fresh(); bull.inv = 1e9;
    for (const i of [0, 1, 2]) F.breakMachine(machine(i, 'loom'), 'shot');
    check(Q().st === 'collapse' && R.td.enemies.length === 0, 'the last loom brings the factory down');
    const C = F48.collapse;
    tick(C.firstSoul + C.soulEvery + .9); check(R.td.streams === 2 && R.gold, 'two souls come to the blaster: two streams');
    tick(C.bendAt - (C.firstSoul + C.soulEvery + .9) + .8); check(R.td.bend > 0, 'the streams bend in');
    twin.aiming = true; twin.aimX = 0; twin.aimY = -1; tick(.3);
    check(R.shots.some(s => s.soul && s.bend > 0), 'he fires the bending streams'); twin.aiming = false;
    tick(C.spoilAt - C.bendAt - .9); check(R.talk && R.talk.text === 'NOT ON MY FLOOR.' && R.td.scatter && Snd.track === null, 'p(Loom) spoils it: its line, the music cut');
    tick(.6); check(R.td.streams === 0 && !R.gold, 'back to normal');
    tick(C.lobbyAt - C.spoilAt); check(Q().st === 'lobby' && !floor.twin(), 'the lobby, side on');
    // the lobby: the portrait, the ding, the doors, and in
    tick(F48.lobby.walkIn + .1);
    keys.kbRight = true; tick(1.6); keys.kbRight = false;
    check(R.events.said && R.events.said.portrait, 'passing the portrait he has a word for it');
    tick(F48.lobby.dingAt + F48.lobby.doorsT + .5 - Q().lobby.t);
    check(Q().lobby.ding && Snd.track === 'pleaseHold', 'DING, the doors and Please Hold');
    const souls = R.souls;
    for (let i = 0; i < 600 && R.stage === 'floor48'; i++) { keys.kbRight = bull.u < F48.lobby.doorU - .03; keys.kbLeft = bull.u > F48.lobby.doorU + .03; update(1 / 60); }
    keys.kbRight = keys.kbLeft = false;
    check(R.stage === 'elevator' && R.elevator.fight && R.elevator.from === 48 && R.souls === souls, 'into the long ride from 48 with the run');
    // direct entry to the lobby
    location.hash = '#stage=floor48&at=lobby'; fresh(); check(Q().st === 'lobby', '#at=lobby starts in the lobby'); location.hash = '';
  } finally { twin.aiming = false; twin.padX = twin.padY = 0; for (const k in twin.kb) twin.kb[k] = 0; keys.kbRight = keys.kbLeft = false; travelHook = null; checkpoint = null; RUN.force = null; emitHook = null; newRun(); setState('title'); showCard('title'); }
})();
// A complete run through player inputs is identical with and without drawing.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const random = Math.random;
  const run = draws => {
    window.__balanceDriver.begin({ seed: 3, skill: 'expert', profile: window.roofProfiles.expert, options: { stage: 'floor48', fast: !draws }, cap: 300 });
    let done = false;
    for (let i = 0; i < 30 && !done; i++) { done = window.__balanceDriver.run(300).done; if (draws && state === 'play') draw(); }
    return JSON.stringify({ record: window.__balanceDriver.result(), seed });
  };
  try {
    const plain = run(false);
    let k = 17; Math.random = () => (k = (k * 16807) % 2147483647) / 2147483647;
    const drawn = run(true);
    check(plain === drawn, 'drawing never changes a run');
    check(JSON.parse(plain).record.end.cause === 'cleared', 'an expert clears the 48th Floor through its inputs');
  } finally { Math.random = random; travelHook = null; checkpoint = null; emitHook = null; newRun(); setState('title'); showCard('title'); }
})();
