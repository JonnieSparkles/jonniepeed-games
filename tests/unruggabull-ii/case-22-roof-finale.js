// All finale states, the playable reset, the bell sequence, free movement and the streams, beam odds, death/continue and dawn.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const tick = s => { for (let i = 0; i < Math.ceil(s * 60); i++) update(1 / 60); };
  const fresh = () => { RUN.force = 42; newRun(null, 'roof'); setState('play'); card.hidden = true; clearHeld(); input.jump = input.slash = input.shoot = 0; };
  fresh(); floor.enter('round3'); R.roof.broken = 3; floor.enter('reset');
  const bells = [], played = [], music = [], spoken = [], oldPlay = Snd.play, oldMusic = Snd.music, oldSay = Snd.say;
  Snd.say = text => spoken.push(text);
  Snd.play = (name, arg) => { played.push(name); if (name === 'bell') bells.push(arg); };
  Snd.music = name => music.push(name);
  for (let i = 0; i < 300 && !R.roof.silenced; i++) update(1 / 60);
  check(music.includes(null), 'the last word of ALL SOULS ACCOUNTED FOR. cuts the music');
  for (let i = 0; i < 120; i++) update(1 / 60);
  floor.placeBull(2, 0); press('slash'); update(1 / 60); update(1 / 60);
  check(!R.roof.tiles[2].carpet && !R.roof.tiles[1].carpet, 'in the reset a slash flips the carpet back');
  tick(floor.ROOF.reset.relay + .6); check(R.roof.tiles[2].carpet, 'and p(Loom) weaves it again a moment later');
  for (let i = 0; i < 1200 && R.roof.state === 'reset'; i++) update(1 / 60);
  check(R.roof.state === 'quiet' && R.roof.respool === 1 && spoken.includes('REPLACEMENT SPOOLS ORDERED.') && spoken.includes('PROBABILITY OF YOUR SURVIVAL: 1%.'), 'the reset re-spools from the souls and hands over to the quiet');
  check(R.roof.odds === 99 && R.roof.realOdds < 99, 'the bar is stitched back to 99 over damage it keeps');
  check(R.roof.state === 'quiet' && R.charge === 0, 'in the quiet the blaster is dead');
  const shots0 = R.events.shots || 0; press('shoot'); update(1 / 60); update(1 / 60);
  check((R.events.shots || 0) === shots0 && R.empty > 0, 'pulling the trigger only clicks');
  for (let i = 0; i < 300 && R.roof.state === 'quiet'; i++) update(1 / 60);
  check(R.roof.state === 'return' && !R.roof.cut, 'the quiet goes straight into the return: no cut-in cards');
  // from the first soul back he walks freely, and the blaster fires the streams on its own
  const u0 = bull.u, z0 = bull.bz; keys.kbRight = true; keys.kbUp = true; tick(.5); keys.kbRight = false; keys.kbUp = false;
  check(bull.bz > z0 + .15, 'and forward up the roof, not a row at a time');
  check(bull.u > u0 + .3 && R.roof.state === 'return' && R.roof.vol && R.roof.vol.shots.length > 0, 'he walks freely and the streams fire on their own');
  tick(3.4); check(R.roof.vol.shots.some(sh => sh.d !== 0 || sh.o !== 0), 'each soul back adds a stream');
  for (let i = 0; i < 600 && R.roof.state !== 'lines'; i++) update(1 / 60);
  const u1 = bull.u; keys.kbLeft = true; tick(.4); keys.kbLeft = false;
  check(R.roof.state === 'lines' && bull.u < u1 - .3, 'he can move while it talks, beam on');
  clearHeld(); for (let i = 0; i < 900 && !['beam', 'run'].includes(R.roof.state); i++) update(1 / 60);
  check(R.roof.state === 'beam' || R.roof.state === 'run', 'quiet, return, flood, pinch, fusion and lines lead to the beam');
  check(['reset', 'quiet', 'return', 'flood', 'pinch', 'fusion', 'lines', 'beam'].every(s => R.roof.history.includes(s)), 'all setup states are reachable');
  check(bells.join() === '0,1,2', 'returning souls land on D5, F5, A5 bells');
  check(R.gold && R.charge === TUNE.charges && R.roof.caught === 0 && R.beam, 'souls leave warp, unlimited gold charge, continuous beam');
  const q = R.roof, RF = floor.ROOF; floor.enter('beam'); q.eye.u = q.beamU = bull.u = 0;
  const odds = q.odds; tick(1);
  check(Math.abs(q.odds - (odds - 10)) < .01, 'beam on eye drains about 10% each second');
  floor.enter('beam'); q.nextFly = 99; q.eye.u = 0; bull.u = RF.beamBull; const off = q.odds; tick(1.5);
  check(q.odds > off && Math.abs(q.beamU - RF.beamBull) < .02, 'no aim assist: off to one side the beam misses the eye, and the odds creep back');
  floor.enter('beam'); q.nextFly = 99; q.eye.u = 0; bull.u = RF.beamHit * .8; tick(1.5); check(q.onEye, 'within its window the beam lands');
  q.eye.u = 0; keys.kbLeft = true; tick(.3); keys.kbLeft = false;
  check(bull.u < .3 - .3 && q.beamU > bull.u + .05 && floor.beamAt(q.eye.z || floor.ROOF.eyeZ) > floor.beamAt(bull.bz + .1), 'he walks with the stick, and the beam trails behind him in a curve');
  const drain = RF.drain; RF.drain = 0; floor.enter('beam'); bull.inv = 1e9; let made = 0;
  for (let i = 0; i < 120; i++) { const n = R.flies.length; tick(.25); made += Math.max(0, R.flies.length - n); }
  RF.drain = drain;
  check(q.beamLeft === 0 && made <= RF.beamFlies && made > RF.beamFlies / 2, 'the beam fight sends a fixed number of carpshits, however long it lasts');
  const phase = q.state; bull.inv = 0; hurtBull(1, 'carp');
  check(R.hearts === 4 && R.beam && q.state === phase, 'hit costs a heart without breaking beam');
  floor.enter('run'); q.odds = 90; const x = q.eye.u; let most = 0; for (let i = 0; i < 600; i++) { update(1 / 60); most = Math.max(most, Math.abs(q.eye.u)); }
  check(q.eye.u !== x && Math.abs(most - RF.eyeSwing) < .02, 'the eye glides along its rail in a smooth wave');
  // the fight lasts through the heavy track's solo: before it ends the odds hold, and the 1% lands on a bar line
  floor.enter('beam'); q.fusedAt = R.t; q.endAt = 0; q.odds = 5; q.eye.u = q.beamU = q.beamBase = bull.u = 0; tick(1);
  check(q.odds === RF.holdOdds && q.state === 'beam', 'the odds hold until the solo has played');
  q.fusedAt = R.t - RF.soloEnd - .1; tick(.5 + RF.bar);
  check(q.state === 'one' && Math.abs(((q.endAt - q.fusedAt) / RF.bar) - Math.round((q.endAt - q.fusedAt) / RF.bar)) < 1e-6, 'after it, 1% on the next bar line');
  bull.inv = 0; hurtBull(5, 'carp'); continueAtBoss();
  check(R.roof.state === 'quiet' && R.hearts === 5 && R.roof.broken === 3 && R.roof.caught === R.roof.capturedTotal && !R.beam && !R.gold, 'crescendo death resumes at quiet');
  const replies = spoken.filter(t => t === "LET'S DISCUSS THOSE ODDS.").length; tick(25);
  check(spoken.filter(t => t === "LET'S DISCUSS THOSE ODDS.").length === replies + 1, 'crescendo continue replays his caption as well as the return');
  // Finish through the actual odds threshold, then cut, dawn and clear card.
  fresh(); floor.enter('beam'); R.roof.nextFly = 99; R.roof.fusedAt = R.t - 30; R.roof.odds = 1.1; R.roof.eye.u = R.roof.beamU = R.roof.beamBase = bull.u = 0; tick(RF.bar + .05);
  check(R.roof.state === 'one' && R.roof.odds === 1 && R.talk.text === 'UNLIKELY.', '1% says UNLIKELY.');
  tick(12);
  check(R.roof.state === 'clear' && state === 'over' && R.phase === 'win' && Cards.kind === 'clear' && Cards.info.dept === 'ROOF', 'snap, dawn and roof clear');
  check(R.roof.history.includes('snap') && R.roof.history.includes('dawn') && played.includes('snap') && played.includes('chord'), 'snap and dawn beats call sound hooks');
  check(R.souls === floor.ROOF.initialCaught, 'earlier-floor souls are counted exactly once through dawn');
  check(floor.view().dawn === 1 && bull.aimT === 0, 'dawn stays bright at clear and he lowers the blaster');
  fresh(); floor.enter('fusion'); const frozen = { t: R.t, qt: R.roof.t }; tick(.1);
  check(R.t === frozen.t && R.roof.t === frozen.qt && R.freeze > 0, 'fusion freezes fight for 0.14 seconds');
  fresh(); floor.enter('odds'); bull.slash = .02; tick(TUNE.slashT + .1);
  check(R.roof.state === 'odds' && bull.slash === -1, 'a swing started before a cut finishes instead of freezing mid-cut');
  Snd.play = oldPlay; Snd.music = oldMusic; Snd.say = oldSay; RUN.force = null; checkpoint = null; newRun(); setState('title'); showCard('title');
})();
