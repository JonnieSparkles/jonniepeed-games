// Campaign fixes after the round-4 playtest: the squad and the sentry hold fire on chutes over a mat (Arcade's still
// don't), a catch counts with the barracks full, the HUD and pause card count the planes still to come, a survive
// mission names its goal, the map says "next" for an operation that's out, the barracks names the operation going
// out next, and a lost "planes across" mission names its own limit.
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
    t = tourAt(1, null, [{ id: 3, type: 'rifle', stripes: 1, kills: 20 }]); t.m = t.missions.length; t.at = 'barracks'; camp.write(); camp.screens.barracks();
    check(/4 at Balloon Season/.test(document.getElementById('cBunkNote').textContent), 'after an operation the barracks names the next: ' + document.getElementById('cBunkNote').textContent);
    t = tourAt(3, 'escort-screen'); camp.startMission(); S.cm.count.away = 12;
    for (f = 0; f < 60 * 4 && (S.mode === 'play' || S.mode === 'dying'); f++) update(1 / 60);
    check(t.at === 'lost' && t.last.cause === '12 planes got across.', 'a lost "across" mission names its own limit: ' + t.last.cause);
    // ---------- ending a tour ----------
    t = tourAt(1); t.at = 'map'; camp.write();
    localStorage.setItem(K.unlock, 'true'); titleScene();
    check(document.getElementById('campaignLabel').textContent === 'Continue', 'a saved tour: Continue');
    document.getElementById('campaignBtn').click();
    var end = document.querySelector('#cMap [data-act="new"]');
    check(end && end.textContent === 'End tour', 'the map offers End tour');
    end.click();
    check(/End this tour/.test(document.getElementById('cCard').textContent), 'which asks first');
    document.getElementById('cNewGo').click();
    check(localStorage.getItem(K.tour) === null && camp.tour() === null && S.mode === 'title' && document.getElementById('campaignLabel').textContent === 'Campaign', 'ended: back on the title, which offers a new Campaign');
    document.getElementById('campaignBtn').click();
    check(camp.tour() && camp.tour().op === 0 && camp.tour().squad.length === 0, 'and Campaign starts a new tour');
  } finally {
    clear(); RUN.game = 'arcade'; titleScene();
  }
  return 'ok';
})();
