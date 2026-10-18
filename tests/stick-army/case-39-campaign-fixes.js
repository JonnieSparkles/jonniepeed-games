// Campaign fixes after the round-4 playtest: the squad and the sentry hold fire on chutes over a mat (Arcade's still
// don't), a catch counts with the barracks full, the HUD and pause card count the planes still to come, a survive
// mission names its goal, the map says "next" for an operation that's out, Squad and Shop between operations, and
// ending a tour.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var camp = world.campaign, K = camp.keys;
  function clear() { [K.tour, K.wave, K.stars, K.seen, K.unlock].forEach(function (k) { localStorage.removeItem(k); }); }
  function tourAt(op, mission, squad) {
    var t = camp.freshTour('K7QMR2');
    t.op = op; t.missions = camp.missionsFor(t, op); if (mission) t.missions[0] = mission;
    t.squad = squad || [{ id: 3, type: 'rifle', stripes: 1, kills: 20 }, { id: 4, type: 'engineer', stripes: 1, kills: 5 }, { id: 5, type: 'rifle', stripes: 0, kills: 2 }];
    t.nextId = 40; camp.nameAll(t); camp.setTour(t);
    return t;
  }
  function overMat() { var m = activeTramps()[0]; return (m.x1 + m.x2) / 2; }
  function offMat() { var m = activeTramps()[0]; return m.x1 < 200 ? 300 : 100; }
  try {
    clear();
    // ---------- the squad and the sentry spare chutes over a mat ----------
    var t = tourAt(1, 'dummy-drop'); camp.startMission();
    S.troopers = []; S.planes = []; S.bombs = [];
    var r = S.recruits[0], on = spawnTrooper(overMat(), 420, { type: 'rifle', fall: 1, sway: 0, armor: 0 }), off;
    on.open = 1;
    check(pickTarget(r) !== on, 'the squad leaves a chute over the mat');
    off = spawnTrooper(offMat(), 430, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); off.open = 1;
    check(pickTarget(r) === off, 'and shoots one away from it');
    S.mods.auto = true; off.dead = true;
    check(sentryTarget() !== on, 'so does the sentry tower');
    S.mods.catcher = true; on.y = 500;
    check(pickTarget(r) === on, 'with Catcher training, they pop a low one onto the mat');
    S.mods.catcher = false;
    RUN.force = 5; newGame(); RUN.force = null;
    S.troopers = []; S.planes = []; S.bombs = [];
    r = S.recruits[0] || makeRecruit(SLOT_ORDER[0], 'rifle'); if (!S.recruits.length) S.recruits.push(r);
    var arc = spawnTrooper(overMat(), 420, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); arc.open = 1;
    check(pickTarget(r) === arc, 'Arcade\'s squad shoots it as before');

    // ---------- a catch counts with the barracks full ----------
    var full = []; for (var i = 0; i < 12; i++) full.push({ id: 100 + i, type: 'rifle', stripes: 0, kills: 0 });
    t = tourAt(1, 'dummy-drop', full); camp.startMission();
    check(S.recruits.length === 3 && S.cm.bench.length === 9, 'twelve in the barracks: three out, nine in bunks');
    S.troopers = []; S.planes = []; S.bombs = [];
    var c = spawnTrooper(overMat(), activeTramps()[0].y - 40, { type: 'rifle', fall: 1, sway: 0, armor: 0 });
    bounce(c, activeTramps()[0]); for (var f = 0; f < 120 && !c.dead; f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    check(c.dead && S.cm.count.caught === 1 && S.cm.bench.length === 9, 'the catch counts, though he can\'t stay (' + S.cm.count.caught + ')');

    // ---------- planes still to come ----------
    t = tourAt(1, 'dummy-drop'); camp.startMission();
    var total = S.cm.planesBy.reduce(function (a, b) { return a + b; }, 0), sub = world.MODES.campaign.hud().sub;
    check(S.cm.planesBy.length === 2 && new RegExp('caught 0/5 · ' + total + ' planes left').test(sub), 'the HUD counts the planes to come: ' + sub);
    for (f = 0; f < 60 * 20; f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    var later = +/(\d+) planes left/.exec(world.MODES.campaign.hud().sub)[1];
    check(later < total && later > S.cm.planesBy[1], 'and counts down (' + later + ')');
    check(/planes still to come/.test(camp.pauseLine(S)), 'the pause card too: ' + camp.pauseLine(S));
    S.cm.count.caught = 5;
    check(!/planes left/.test(world.MODES.campaign.hud().sub), 'not once the goal is met');
    t = tourAt(0, 'first-contact'); camp.startMission();
    check(world.MODES.campaign.hud().sub === 'survive all 2 waves', 'a survive mission names its goal: ' + world.MODES.campaign.hud().sub);
    t = tourAt(3, 'the-zeppelin'); camp.startMission();
    check(!/planes left/.test(world.MODES.campaign.hud().sub), 'a boss mission has no plane count');

    // ---------- the map, the barracks and the lost card ----------
    t = tourAt(0); t.at = 'map'; camp.write(); camp.screens.map();
    var ops = document.getElementById('cOps').textContent;
    check(/Recruitment Drive.?next/.test(ops) && !/Recruitment Drive.{0,4}coming soon/.test(ops), 'the map says "next" for an operation that\'s out: ' + ops.slice(0, 120));
    t = tourAt(3); t.at = 'map'; camp.write(); camp.screens.map();
    check(/coming soon/.test(document.getElementById('cOps').textContent), 'and "coming soon" for one that isn\'t');
    t = tourAt(2, null, [{ id: 3, type: 'rifle', stripes: 1, kills: 20 }]); t.at = 'map'; camp.write(); camp.screens.map();
    check(!document.getElementById('cSquadLink').hidden && !document.getElementById('cShopLink').hidden, 'between operations the map offers Squad and Shop');
    document.getElementById('cSquadLink').click();
    check(!document.getElementById('cBarracks').hidden && /4 go out on each mission at Balloon Season/.test(document.getElementById('cBunkNote').textContent), 'the Squad screen names the operation ahead: ' + document.getElementById('cBunkNote').textContent);
    document.getElementById('cBarracksDone').click();
    t.at = 'op'; t.m = 1; camp.write(); camp.screens.map();
    check(document.getElementById('cSquadLink').hidden && document.getElementById('cShopLink').hidden, 'not mid-operation');
    // ---------- ending a tour ----------
    t = tourAt(1); t.at = 'map'; camp.write();
    localStorage.setItem(K.unlock, 'true'); titleScene();
    check(document.getElementById('campaignLabel').textContent === 'Campaign', 'the title always says Campaign');
    document.getElementById('campaignBtn').click(); if (!document.getElementById('cCard').hidden && document.getElementById('cContinue')) document.getElementById('cContinue').click();
    var end = document.querySelector('#cMap [data-act="new"]');
    check(end && end.textContent === 'End tour', 'the map offers End tour');
    end.click();
    check(/End this tour/.test(document.getElementById('cCard').textContent), 'which asks first');
    document.getElementById('cNewGo').click();
    check(localStorage.getItem(K.tour) === null && camp.tour() === null && S.mode === 'title' && document.getElementById('campaignLabel').textContent === 'Campaign', 'ended: back on the title, which offers a new Campaign');
    document.getElementById('campaignBtn').click(); if (!document.getElementById('cCard').hidden && document.getElementById('cContinue')) document.getElementById('cContinue').click();
    check(camp.tour() && camp.tour().op === 0 && camp.tour().squad.length === 0, 'and Campaign starts a new tour');
    // ---------- the title's Campaign button with a tour saved: Continue or New tour ----------
    t = tourAt(2); t.at = 'map'; t.m = 1; camp.write(); titleScene();
    document.getElementById('campaignBtn').click();
    check(/Balloon Season, mission 2 of 3/.test(document.getElementById('cCard').textContent), 'it says where the tour stands');
    document.getElementById('cFresh').click();
    check(/New tour\?/.test(document.getElementById('cCard').textContent), 'New tour asks first');
    document.getElementById('cFreshNo').click();
    check(document.getElementById('cContinue'), 'Back: the choice again');
    document.getElementById('cFresh').click(); document.getElementById('cFreshGo').click();
    check(camp.tour() && camp.tour().op === 0 && camp.tour().squad.length === 0 && camp.tour().code !== 'K7QMR2' && !document.getElementById('cMap').hidden, 'Start a new tour: a fresh one, on the map');
    // Save and quit: the pause card and the cards say so in Campaign, Arcade's pause card says Quit.
    t = tourAt(1, 'dummy-drop'); camp.startMission(); togglePause();
    check(document.getElementById('pauseQuitBtn').textContent === 'Save and quit', 'Campaign\'s pause card: Save and quit');
    togglePause(); RUN.force = 5; newGame(); RUN.force = null; togglePause();
    check(document.getElementById('pauseQuitBtn').textContent === 'Quit', 'Arcade\'s: Quit');
    togglePause();
  } finally {
    clear(); RUN.game = 'arcade'; titleScene();
  }
  return 'ok';
})();
