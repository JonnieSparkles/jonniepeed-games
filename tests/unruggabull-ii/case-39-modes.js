// The difficulty modes (item 29): what a hit costs in each, Raging Bull's carried hearts, Impossibull's no healing and its
// lock, the 48th Floor's shift clock, each mode's own board and bests, the mode on the cards and in #stage links.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  const step = s => { for (let i = 0; i < Math.round(s * 60); i++) update(1 / 60); };
  const rugged = () => { for (let i = 0; i < 20 && R.phase !== 'dead'; i++) { bull.inv = 0; hurtBull(1, 'test'); } step(4.5); };
  const keys0 = ['baby', 'regular', 'raging', 'impossibull'].map(m => 'unruggabull-ii-board-' + m).concat(['unruggabull-ii-impossibull']);
  const saved = keys0.map(k => localStorage.getItem(k));
  keys0.forEach(k => localStorage.removeItem(k));
  try {
    // ---- what a hit costs ----
    const hit = (stage, n, cause) => { RUN.force = 3939; startRun(stage); bull.inv = 0; hurtBull(n, cause); return R.hearts; };
    setMode('regular');
    check(hit('floor13', 1, 'wad') === 4 && hit('floor48', 1, 'laser') === 4 && hit('roof', floors.roof.ROOF.hitCost, 'laser') === 4, 'Regular: a hit costs a heart everywhere');
    setMode('baby');
    check(hit('floor13', 1, 'wad') === 4.5 && hit('stairs', 1, 'tumbler') === 4.5 && hit('elevator', 1, 'flyer') === 4.5, 'Baby Bull: half a heart a hit on the 13th, the stairs and the ride');
    check(hit('floor48', 1, 'laser') === 4.5 && hit('roof', floors.roof.ROOF.hitCost, 'laser') === 4.5, 'Baby Bull: half a heart on the 48th and the roof (ROOF.hitCost)');
    RUN.force = 3939; startRun('floor13'); bull.inv = 1;   // SHRED-O's chomp lands whatever his safety after a hit, now through hurtBull
    floor.draggedIn();
    check(R.hearts === 4 && R.lastCause === 'rug', "Baby Bull: SHRED-O's two-heart chomp costs one");
    RUN.force = 3939; startRun('floor13');
    for (let i = 0; i < 9; i++) { bull.inv = 0; hurtBull(1, 'test'); }
    check(R.hearts === .5 && R.phase !== 'dead' && lowHealth(), 'Baby Bull: nine hits leave half a heart, and the heartbeat');
    draw();   // the half heart draws
    bull.inv = 0; hurtBull(1, 'test');
    check(R.phase === 'dead', 'ten hits rug him');

    // ---- Raging Bull: hearts carry between stages ----
    setMode('raging');
    check(!RUN.refillBetweenStages, 'Raging Bull: no refill between stages');
    RUN.force = 3940; startRun('floor13'); bull.inv = 0; hurtBull(1, 'test'); bull.inv = 0; hurtBull(1, 'test');
    travel('elevator', RIDE_TO_48);
    check(R.stage === 'elevator' && R.hearts === 3, 'Raging Bull: the hearts he leaves a floor with ride up with him');
    travel('floor48');
    check(R.hearts === 3, 'Raging Bull: and on into the 48th');
    setMode('regular'); RUN.force = 3940; startRun('floor13'); bull.inv = 0; hurtBull(1, 'test'); travel('elevator', RIDE_TO_48);
    check(R.hearts === 5, 'Regular: the hearts refill between stages, as before');

    // ---- Impossibull: five hearts, nothing heals ----
    setMode('impossibull');
    RUN.force = 3941; startRun('floor13');
    check(R.hearts === 5 && TUNE.hearts === 5 && !healing(), 'Impossibull: five hearts from the start, and no healing');
    bull.inv = 0; hurtBull(1, 'test');
    const pk0 = R.pickups.length; addPickup('coffee', .4, 0);
    check(R.pickups.length === pk0 && R.hearts === 4, 'Impossibull: no coffee turns up on the 13th');
    travel('elevator', RIDE_TO_48);
    check(R.hearts === 4, 'Impossibull: no refill between stages');
    travel('floor48');
    floors.floor48.td.addPickup('coffee', 300, 300, 12);
    check(!R.td.pickups.some(p => p.kind === 'coffee'), 'Impossibull: no coffee on the 48th');
    travel('elevator', { fight: true, from: 48 });
    check(R.hearts === 4, 'Impossibull: still four on the long ride');
    floors.elevator.arena.addPickup('coffee', 0);
    check(!R.arena.pickups.some(p => p.kind === 'coffee'), 'Impossibull: no coffee side on either');
    bull.inv = 0; hurtBull(3, 'test'); bull.inv = 0; hurtBull(1, 'test');
    check(R.phase === 'dead', 'Impossibull: the fifth heart lost rugs him');

    // ---- the lock: a full run cleared on Raging Bull opens Impossibull ----
    check(Title.labels().length >= 0 && !impossibullOpen(), 'locked to begin with');
    setMode('raging'); RUN.force = 3942; startRun('roof'); RUN.full = false; R.endT = R.t; endRun('clear');
    check(!impossibullOpen(), 'a practice roof clear on Raging Bull does not open it');
    setMode('regular'); RUN.force = 3942; startRun('roof'); RUN.full = true; R.endT = R.t; endRun('clear');
    check(!impossibullOpen(), 'a Regular clear does not open it');
    setMode('raging'); RUN.force = 3942; startRun('roof'); RUN.full = true; R.continues = 2; R.endT = R.t; endRun('clear');
    check(impossibullOpen(), 'a full run cleared on Raging Bull opens it (retries or not), kept on the device');
    localStorage.removeItem('unruggabull-ii-impossibull');

    // ---- the 48th Floor's shift clock: stalling ends in a rugging ----
    setMode('regular'); RUN.force = 3943; startRun('floor48'); bull.inv = 1e9;
    const F48 = floors.floor48.F48, Q = () => R.f48;
    Q().t = F48.shift.secs - 31; step(1.2);
    check(R.talk && R.talk.text === 'SHIFT ENDS IN 30.', 'p(Loom) warns at 30 seconds left');
    Q().t = F48.shift.secs - 11; step(1.2);
    check(R.talk && R.talk.text === '10.', 'and at 10');
    draw();   // the shift clock draws
    Q().t = F48.shift.secs - .05; step(.2);
    check(R.phase === 'dead' && R.lastCause === 'shift', 'at zero he is reclaimed: an ordinary rugging');
    step(4);
    check(Cards.kind === 'rugged' && Cards.info.back === 'THE START', 'the rugged card, back to the start of the floor');

    // ---- each mode's board: full runs that never retried, posted when rugged ----
    keys0.forEach(k => localStorage.removeItem(k));   // the lock's clears above went on the boards
    setMode('baby'); RUN.force = 3944; startRun('floor13', true); R.souls = 37;
    rugged();
    check(JSON.stringify(boardOf('baby')) === '[["13TH",37]]' && boardOf('regular').length === 0, "a rugged full run goes on its own mode's board only");
    check(Cards.info.mode === 'baby' && Cards.info.ranked, 'the card knows the mode');
    Cards.press('Retry'); if (Cards.confirming) Cards.press('Retry');
    check(R.continues === 1 && RUN.full && RUN.mode === 'baby', 'a retry carries the run and its mode');
    R.souls = 80; rugged();
    check(boardOf('baby').length === 1, 'a retried run is off the board');
    setMode('raging'); RUN.force = 3945; startRun('floor13'); R.souls = 50; rugged();
    check(boardOf('raging').length === 0, 'a Restart floor or #stage run is off the board');
    setMode('raging'); RUN.force = 3946; startRun('floor13', true); R.souls = 50; rugged();
    setMode('raging'); RUN.force = 3947; startRun('floor13', true); R.souls = 90; rugged();
    check(JSON.stringify(boardOf('raging')) === '[["13TH",90],["13TH",50]]', 'the board keeps the best first');
    setMode('raging'); RUN.force = 3948; startRun('roof', true); R.endT = R.t; endRun('clear');
    check(boardOf('raging').some(e => e[0] === 'CLEAR'), 'a cleared run goes on as CLEAR');
    check(JSON.stringify(Title.MODES.map(m => (boardOf(m.id) || []).length)) === '[1,0,3,0]', 'four boards, one a mode');
    // bests per mode: Regular keeps its old keys
    setMode('regular'); check(bestKey('floor13') === 'unruggabull-ii-best' && bestKey('roof') === 'unruggabull-ii-best-roof', 'Regular keeps its best keys');
    setMode('baby'); check(bestKey('floor13') === 'unruggabull-ii-best-baby' && bestKey('floor48') === 'unruggabull-ii-best-floor48-baby', 'other modes keep their own bests');

    // ---- #stage takes the mode ----
    const h0 = location.hash;
    location.hash = '#stage=roof&mode=impossibull'; check(hashMode() === 'impossibull', '#stage=roof&mode=impossibull');
    location.hash = '#stage=roof&mode=nope'; check(hashMode() === null, 'an unknown mode is ignored (Regular)');
    location.hash = h0;
  } finally {
    keys0.forEach((k, i) => { if (saved[i] == null) localStorage.removeItem(k); else localStorage.setItem(k, saved[i]); });
    setMode('regular'); RUN.full = false;
  }
})();
