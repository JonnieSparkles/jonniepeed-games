// Campaign round 2, Recruitment Drive: the operation released and a round-1 tour carrying on into it, weather and
// intel from the tour code, straw dummies (caught, shot, landing, the gold star), the pick at prep and the save link
// that carries it, the radio operator (Campaign's hire only, a free call, calls sooner), and the pause card's
// objective.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var camp = world.campaign, K = camp.keys;
  function clear() { [K.tour, K.wave, K.stars, K.seen, K.unlock].forEach(function (k) { localStorage.removeItem(k); }); }
  function rd(code, mission) {
    var t = camp.freshTour(code || 'K7QMR2');
    t.op = 1; t.missions = camp.missionsFor(t, 1); if (mission) t.missions[0] = mission;
    t.squad = [{ id: 3, type: 'rifle', stripes: 1, kills: 20 }, { id: 4, type: 'engineer', stripes: 1, kills: 5 }, { id: 5, type: 'sniper', stripes: 0, kills: 2 }, { id: 6, type: 'radio', stripes: 0, kills: 0 }];
    t.nextId = 40; camp.nameAll(t); camp.setTour(t);
    return t;
  }
  try {
    clear();
    // ---------- the release ----------
    var op = camp.OPS[1];
    check(op.released && op.slots === 3 && op.starKind === 'dummies' && camp.RELEASE >= 2, 'Recruitment Drive is out');
    // Fixed since round 5: Dummy drop, Supply drop, The officer.
    var v, m = camp.missionsFor(camp.freshTour(camp.codeText(104729)), 1);
    check(m.join() === 'dummy-drop,supply-drop,the-officer', 'Dummy drop first, then Supply drop and The officer (' + m + ')');
    var ended = camp.freshTour('K7QMR2'); ended.at = 'end'; ended.m = 3;
    var on = camp.readTour(JSON.parse(JSON.stringify(ended)));
    check(on.op === 1 && on.at === 'map' && on.m === 0 && on.missions[0] === 'dummy-drop', 'a tour waiting at "To be continued" carries on into it');
    localStorage.setItem(K.seen, '1');
    camp.setTour(on); titleScene();
    localStorage.setItem(K.unlock, 'true'); titleScene();
    check(!document.getElementById('campaignNew').hidden, 'the "new" tag is back');
    document.getElementById('campaignBtn').click(); if (!document.getElementById('cCard').hidden && document.getElementById('cContinue')) document.getElementById('cContinue').click();
    check(/Operation [A-Za-z ]+ is live/.test(document.getElementById('cOps').textContent), 'and the map says what\'s new');

    // ---------- weather and intel ----------
    var t0 = camp.freshTour('K7QMR2'), seen = {};
    check(camp.weatherFor(t0, 0) === 'clear', 'Boot Camp is always Clear');
    for (v = 0; v < 60; v++) seen[camp.weatherFor(camp.freshTour(camp.codeText(v * 7919)), 1)] = 1;
    check(Object.keys(seen).length === 5, 'Recruitment Drive rolls every weather (' + Object.keys(seen) + ')');
    check(camp.weatherFor(t0, 1) === camp.weatherFor(camp.freshTour('K7QMR2'), 1), 'the same for the same code');
    var it = camp.intelFor(t0, 1), met = [];
    camp.missionsFor(t0, 0).forEach(function (id) { met = met.concat(camp.MISSIONS[id].threats || []); });
    check(camp.intelFor(t0, 0) === null && it && met.indexOf(it.threat) >= 0 && it.m >= 0 && it.m < 3, 'intel comes from a threat already met (' + (it && it.threat) + ')');
    // A mission under each weather.
    var kinds = {};
    for (v = 0; v < 200 && Object.keys(kinds).length < 5; v++) { var c = camp.codeText(v * 31337); var w = camp.weatherFor(camp.freshTour(c), 1); if (!kinds[w]) kinds[w] = c; }
    var t = rd(kinds.wind, 'dummy-drop'); camp.startMission();
    check(S.cm.weather === 'wind' && Math.abs(S.wind) === 16, 'wind blows the chutes');
    var tr = spawnTrooper(200, 200, { type: 'rifle', fall: 1, sway: 0, armor: 0 }), x0 = tr.x;
    for (var f = 0; f < 60; f++) update(1 / 60);
    check(Math.sign(tr.x - x0) === Math.sign(S.wind) || tr.dead, 'a chute drifts with it');
    rd(kinds.rain, 'dummy-drop'); camp.startMission();
    var g = gun(); g.heat = 0.8; updateHeat(0.1, g); var rainHeat = g.heat;
    rd(kinds.clear, 'dummy-drop'); camp.startMission();
    g = gun(); g.heat = 0.8; updateHeat(0.1, g);
    check(S.coolMore == null && rainHeat < g.heat, 'rain cools the gun faster');
    rd(kinds.dusk, 'dummy-drop'); camp.startMission();
    for (f = 0; f < 60 * 5; f++) update(1 / 60);
    check(S.dusk === 0.5 && Math.abs(S.night - 0.5) < 0.01, 'dusk is half dark (' + S.night + ')');
    rd(kinds.fog, 'dummy-drop'); camp.startMission();
    check(S.cm.weather === 'fog', 'and fog');

    // ---------- dummies ----------
    t = rd(kinds.clear, 'dummy-drop'); camp.startMission();
    var dummies = 0, all = 0;
    for (f = 0; f < 60 * 40; f++) { S.troopers.forEach(function (q) { if (!q.counted) { q.counted = 1; all++; if (q.dummy) dummies++; } }); S.wallHP = S.mods.maxHP; update(1 / 60); if (S.mode === 'shop') continueWave(); }
    check(dummies > 0 && dummies < all && dummies / all > 0.15 && dummies / all < 0.6, 'dummies come down among them (' + dummies + ' of ' + all + ')');
    camp.startMission();
    var d = spawnTrooper(80, 300, { type: 'rifle', fall: 1, sway: 0, armor: 0, dummy: true });
    var caught = S.cm.count.caught, before = S.recruits.length;
    bounce(d, TRAMPS[0]); for (f = 0; f < 60 && !d.dead; f++) update(1 / 60);
    check(d.dead && S.cm.count.caught === caught && S.cm.count.dummies === 1 && S.recruits.length === before, 'catching a dummy wastes the bounce');
    check(!Object.keys(S.slotRes).length, 'and frees the slot it was going to');
    var kills = S.stats.kills, d2 = spawnTrooper(300, 300, { type: 'rifle', fall: 1, sway: 0, armor: 0, dummy: true });
    killTrooper(d2, 'player');
    check(d2.dead && S.stats.kills === kills, 'shooting one counts for nothing');
    var d3 = spawnTrooper(300, GROUND - 40, { type: 'rifle', fall: 1, sway: 0, armor: 0, dummy: true });
    for (f = 0; f < 60 && !d3.dead; f++) update(1 / 60);
    check(d3.dead && !S.troopers.some(function (q) { return q === d3; }), 'one that lands just flops');
    var rush = spawnTrooper(0, GROUND - 33, { type: 'rifle', fall: 1, sway: 0, armor: 0, dummy: true });
    check(!rush.dummy, 'a rusher on foot is never a dummy');
    check(/Dummy drop: catch 5 real soldiers/.test(camp.pauseLine(S)) && /1 dummy/.test(camp.pauseLine(S)), 'the pause line: ' + camp.pauseLine(S));
    togglePause();
    check(!document.getElementById('pauseGoal').hidden && /Caught 0 of 5/.test(document.getElementById('pauseGoal').textContent), 'the pause card shows the objective');
    togglePause();
    // The gold star: no dummies caught through the operation.
    t = rd(kinds.clear); t.m = 2; t.opDummies = 0; t.missions[2] = 'dummy-drop'; camp.write();
    camp.startMission(); S.cm.count.caught = 5; S.cm.cleared = true; world.MODES.campaign.win();
    check(t.debrief && t.debrief.star === true, 'no dummies caught: the gold star ' + JSON.stringify([t.at, t.m, t.missions, t.debrief, t.opDummies, t.opLosses]));
    t = rd(kinds.clear); t.m = 2; t.opDummies = 1; t.missions[2] = 'dummy-drop';
    camp.startMission(); S.cm.count.caught = 5; S.cm.cleared = true; world.MODES.campaign.win();
    check(t.debrief && t.debrief.star === false, 'one caught: none');

    // ---------- deploy ----------
    t = rd(kinds.clear, 'dummy-drop'); t.deploy = [6, 5, 4]; camp.write();
    camp.startMission();
    check(S.recruits.map(function (r) { return r.id; }).sort().join() === '4,5,6' && S.cm.bench.join() === '3', 'the deploy pick goes out (' + S.recruits.map(function (r) { return r.id; }) + ')');
    var link = camp.linkCode(t), back = camp.readLink(link);
    check(back && back.deploy && back.deploy.join() === '6,5,4', 'the save link carries it');
    // Prep: the whole squad, the slots ticked.
    t.at = 'briefing'; camp.write(); camp.screens.briefing();
    document.getElementById('cBriefGo').click(); document.getElementById('cOpGo').click();
    check(!document.getElementById('cPrep').hidden && document.querySelectorAll('#cPrepBunks .c-pick').length === 4 && document.querySelectorAll('#cPrepBunks .c-pick[aria-pressed="true"]').length === 3, 'prep: the whole squad, three ticked');
    check(/select 3 to deploy/i.test(document.getElementById('cPrepBody').textContent), 'it says how many go out');
    var first = document.querySelector('#cPrepBunks .c-pick[aria-pressed="true"]'); first.click();
    check(document.querySelectorAll('#cPrepBunks .c-pick[aria-pressed="true"]').length === 2, 'untick one');
    var other = document.querySelector('#cPrepBunks .c-pick[aria-pressed="false"]'); other.click(); other = document.querySelector('#cPrepBunks .c-pick[aria-pressed="false"]'); other.click();
    check(document.querySelectorAll('#cPrepBunks .c-pick[aria-pressed="true"]').length === 3, 'no more than three');
    document.getElementById('cPrepGo').click();
    check(S.mode === 'play' && S.game === 'campaign' && S.recruits.length === 3 && t.deploy.length === 3, 'Start starts the mission');

    // ---------- the radio operator ----------
    t = rd(kinds.clear, 'dummy-drop'); t.deploy = [6, 3, 4]; camp.startMission();
    check(S.cm.freeCall && S.calls.bomber + S.calls.fighter === 1, 'a radio operator brings a free call');
    check(world.MODES.campaign.callFast(), 'and calls come in sooner');
    S.calls.bomber = 1; callStrike(); var fastHold = S.strike.hold;
    t.deploy = [3, 4, 5]; camp.startMission(); S.calls.bomber = 1; callStrike();
    check(S.cm.freeCall == null && fastHold < S.strike.hold, 'than without him (' + fastHold + ' / ' + S.strike.hold + ')');
    S.players[0].tags += 999; S.planes = []; S.troopers = []; openShop();
    check(S.shop.hire.some(function (q) { return q.id === 'hire-radio'; }), 'Campaign\'s shop hires him');
    RUN.force = 5; newGame(); RUN.force = null; S.planes = []; S.troopers = []; openShop();
    check(!S.shop.hire.some(function (q) { return q.id === 'hire-radio'; }), 'Arcade\'s doesn\'t');
    togglePause(); togglePause();
    continueWave(); togglePause();
    check(document.getElementById('pauseGoal').hidden, 'nor does Arcade\'s pause card have an objective');
    togglePause();

  } finally {
    clear(); RUN.game = 'arcade'; titleScene();
  }
  return 'ok';
})();
