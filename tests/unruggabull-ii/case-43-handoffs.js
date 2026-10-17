// The music between stages (the album page's handoffs and the owner's picks, Oct 17): the bridge from the title into
// Flight Risk; SHRED-O's last chord and the office PA under the card, carried into the lobby, where Please Hold takes over
// on its bar; Please Hold sagging as the quiet ride arrives and the 48th's machine taking its tune; Please Hold far off
// under the 48th's card, up on the lobby's DING and carried into the long ride; the D chord at the top; the roof's
// overture, its drums as p(Loom) rises, and the fight on the verse. None of it moves a run.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const tick = s => { for (let i = 0; i < Math.ceil(s * 60); i++) { bull.inv = 1e9; update(1 / 60); } };
  // record the music calls, still making them
  const calls = [], spy = name => { const f = Snd[name]; Snd[name] = function (...a) { calls.push([name].concat(a)); return f.apply(this, a); }; return f; };
  const orig = { music: spy('music'), level: spy('level'), brownout: spy('brownout'), roofCue: spy('roofCue'), factoryCue: spy('factoryCue') };
  const called = (name, test) => calls.some(c => c[0] === name && (!test || test(c)));
  try {
    // the title theme into the stairwell: the bridge; without it, Flight Risk from its top
    Snd.music('theme'); RUN.force = 4301; startRun('stairs');
    check(Snd.track === 'stairsIn', 'from the title, the bridge into Flight Risk');
    Snd.music(null); RUN.force = 4301; startRun('stairs');
    check(Snd.track === 'stairs', 'a stairwell started on its own: Flight Risk from its top');

    // SHRED-O goes down on a chord; the card brings the office PA on; Continue carries it into the lobby
    RUN.force = 4302; startRun('floor13'); setState('play');
    startBoss(); R.boss.final = { st: 'fire' }; bossDamage(R.boss.hp, 'blaster');   // the finish's window: the blaster ends it
    check(Snd.track === 'floorEnd' && R.phase === 'win', 'SHRED-O goes down on a last chord');
    for (let i = 0; i < 60 * 20 && state !== 'over'; i++) update(1 / 60);
    check(state === 'over' && Cards.kind === 'clear' && Snd.track === 'floorPA', 'the clear card: the office PA comes back on');
    const L13 = floors.elevator.ELEVATOR.lobby;
    calls.length = 0; Cards.press('Continue');
    check(R.stage === 'elevator' && R.elevator.lobby && Snd.track === 'floorPA', 'into the lobby with the PA still playing');
    tick(L13.dingAt - .05); check(Snd.track === 'floorPA', 'until the DING');
    tick(.1); check(Snd.track === 'pleaseHold' && called('music', c => c[1] === 'pleaseHold' && c[2] && c[2].boundary === 'bar'), "the DING: Please Hold takes over on the PA's next bar");
    // he boards; the quiet ride; the car stops and Please Hold sags; the 48th's machine takes its tune
    keys.kbRight = true; for (let i = 0; i < 600 && R.elevator.lobby; i++) { keys.kbRight = bull.u < L13.doorU; update(1 / 60); } keys.kbRight = false;
    check(!R.elevator.lobby && Snd.track === 'pleaseHold', 'aboard, Please Hold carries on');
    calls.length = 0;
    for (let i = 0; i < 60 * 50 && R.stage === 'elevator'; i++) { if (R.elevator.t >= 30.4) bull.u = 0; update(1 / 60); }   // in the doorway once it's there
    check(called('brownout') && !called('music', c => c[1] === null), 'the car stops: Please Hold sags instead of stopping dead');
    for (let i = 0; i < 120 && !called('factoryCue'); i++) update(1 / 60);   // its opening comes up a moment after the doors
    check(R.stage === 'floor48' && Snd.track === 'factoryBTune' && called('factoryCue', c => c[1] === 'intro' && c[2].tune), "the 48th: the machine plays Please Hold's tune (" + R.stage + ', ' + Snd.track + ', ' + JSON.stringify(calls.filter(c => c[0] === 'factoryCue')) + ')');
    RUN.force = 4302; startRun('floor48'); check(Snd.track === 'factoryBIntro', 'the 48th started on its own: its plain intro');

    // the 48th's card: Please Hold far off; the lobby keeps it and brings it up on the DING; the long ride carries it on
    const F = floors.floor48, machine = (i, kind) => R.f48.machines.find(m => m.line === i && m.kind === kind);
    RUN.force = 4303; checkpoint = null; travelHook = null; newRun(null, 'floor48'); setState('play'); clearHeld();
    for (const i of [0, 1, 2]) F.breakMachine(machine(i, 'loom'), 'shot');
    calls.length = 0; for (let i = 0; i < 60 * 90 && state !== 'over'; i++) { bull.inv = 1e9; update(1 / 60); }
    check(state === 'over' && Cards.kind === 'clear' && Snd.track === 'pleaseHold' && called('music', c => c[1] === 'pleaseHold' && c[2].level === .3), "the 48th's card: Please Hold far off");
    calls.length = 0; Cards.press('Continue'); for (let i = 0; i < 120 && R.f48.st !== 'lobby'; i++) update(1 / 60);
    check(R.f48.st === 'lobby' && Snd.track === 'pleaseHold' && !called('music'), 'into the lobby with it still playing');
    for (let i = 0; i < 60 * 8 && !called('level'); i++) update(1 / 60);
    check(called('level', c => c[1] === 1) && Snd.track === 'pleaseHold', 'the DING brings it up, no restart');
    calls.length = 0;
    for (let i = 0; i < 60 * 12 && R.stage !== 'elevator'; i++) { keys.kbRight = bull.u < F.F48.lobby.doorU; update(1 / 60); } keys.kbRight = false;
    check(R.stage === 'elevator' && R.elevator.fight && Snd.track === 'pleaseHold' && !called('music', c => c[1] === 'hornsUp'), 'the long ride: Please Hold just keeps going');
    const T = floors.elevator.T, at = t => { while (R.elevator.t < t && R.stage === 'elevator' && R.phase !== 'dead') { bull.inv = 1e9; update(1 / 60); } };
    at(T.eye + .1); check(called('brownout') && Snd.track === 'pleaseHold', "p(Loom)'s eye browns it out");
    at(T.reel + .05); check(Snd.track === 'hornsUp', 'the reel slams Horns Up in');
    calls.length = 0; at(T.arrive + .05);
    check(Snd.track === null && called('roofCue', c => c[1] === 'top'), "the top: the music stops on the roof's key");

    // the roof: the overture from its start, the drums as p(Loom) rises, the fight on the verse
    const roof = floors.roof; RUN.force = 4304; checkpoint = null; travelHook = null; newRun(null, 'roof'); setState('play'); clearHeld();
    check(Snd.track === 'roofOverture', "the roof's lead-in: Saga II's intro alone");
    calls.length = 0; roof.enter('flash');
    check(called('roofCue', c => c[1] === 'rise') && Snd.track === 'roofOverture', 'p(Loom) rises: the drums join');
    roof.enter('round1'); check(Snd.track === 'roofA', 'FIGHT: Saga II, on the verse');
  } finally {
    Object.assign(Snd, orig); keys.kbRight = false;
  }
})();
