// Campaign round 5: the shop that builds up (the shelf by operation, the requisition tree on the debrief with the
// gold star's bonus, a tour from before the tree keeping the whole shop, the link carrying the tree), and the
// reworked Boot Camp and Recruitment Drive (Downed pilot, Hold the radio, Supply drop, The officer).
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var camp = world.campaign, K = camp.keys;
  function clear() { [K.tour, K.wave, K.stars, K.seen, K.unlock].forEach(function (k) { localStorage.removeItem(k); }); }
  function tourAt(op, mission, tree) {
    var t = camp.freshTour('K7QMR2');
    t.op = op; t.missions = camp.missionsFor(t, op); if (mission) t.missions[0] = mission;
    t.squad = [{ id: 3, type: 'rifle', stripes: 1, kills: 20 }, { id: 4, type: 'engineer', stripes: 1, kills: 5 }, { id: 5, type: 'rifle', stripes: 0, kills: 2 }];
    t.nextId = 40; if (tree !== undefined) t.tree = tree; camp.nameAll(t); camp.setTour(t);
    return t;
  }
  function item(id) { return ITEMS.find(function (x) { return x.id === id; }); }
  function frames(n) { for (var f = 0; f < n && S.mode === 'play'; f++) { S.wallHP = S.mods.maxHP; update(1 / 60); } }
  try {
    clear();
    // ---------- the shelf ----------
    var t = tourAt(0, 'first-contact');
    check(camp.onShelf(t, item('repair')) && camp.onShelf(t, item('mat')) && !camp.onShelf(t, item('double')) && !camp.onShelf(t, item('auto')) && !camp.onShelf(t, item('tramp')), 'Boot Camp\'s shelf: the basics only');
    check(camp.onShelf(t, item('hire-rifle')) && !camp.onShelf(t, item('hire-medic')) && !camp.onShelf(t, item('hire-radio')), 'and riflemen and engineers to hire');
    camp.startMission(); S.players[0].tags += 999; S.planes = []; S.troopers = []; S.wave = 3; openShop();
    check(S.shop.items.every(function (it) { return camp.onShelf(t, it); }) && !S.shop.items.some(function (it) { return it.id === 'strike'; }), 'the shop sells only what\'s on it (' + S.shop.items.map(function (it) { return it.id; }) + ')');
    check(S.shop.hire.map(function (it) { return it.id; }).sort().join() === 'hire-engineer,hire-rifle', 'hires too (' + S.shop.hire.map(function (it) { return it.id; }) + ')');
    t = tourAt(1, 'dummy-drop', ['sandbags']);
    check(camp.onShelf(t, item('tramp')) && camp.onShelf(t, item('strike')) && camp.onShelf(t, item('sandbags')) && !camp.onShelf(t, item('wire')) && camp.onShelf(t, item('hire-medic')), 'Recruitment Drive adds its basics and hires; the tree adds Sandbags');
    t = tourAt(1, 'dummy-drop', null);
    check(camp.onShelf(t, item('rockets')) && camp.onShelf(t, item('hire-bazooka')), 'a tour from before the tree keeps the whole shop');

    // ---------- the requisition tree ----------
    t = tourAt(0, 'hold-the-radio', []); t.m = 2; t.missions[2] = 'hold-the-radio'; t.opLosses = 0; camp.write();
    camp.startMission(); S.cm.count.radio = 99; S.cm.cleared = true; world.MODES.campaign.win();
    check(t.at === 'debrief' && t.debrief.picks === 1 && t.debrief.star && t.debrief.bonus.length >= 2, 'the debrief: one pick, and the gold star\'s bonus');
    camp.screens.debrief();
    var next = document.querySelectorAll('#cDebriefBody .c-node.next');
    check(next.length === 3 && [].map.call(next, function (b) { return b.dataset.step; }).join() === 'double,sandbags,helmet', 'three rows, each one\'s first step pickable');
    check(document.getElementById('cTake').disabled, 'Take it waits for a pick');
    next[1].click();
    check(/Sandbags/.test(document.getElementById('cStepLine').textContent) && !document.getElementById('cTake').disabled, 'a tap shows what it does');
    document.getElementById('cTake').click();
    check(t.tree.join() === 'sandbags' && document.querySelectorAll('#cSlips .c-slip').length >= 2 && /GOLD STAR/.test(document.getElementById('cDebriefBody').textContent), 'taken; then the gold star\'s slips');
    document.querySelector('#cSlips .c-slip').click(); document.getElementById('cTake').click();
    next = document.querySelectorAll('#cDebriefBody .c-node.next');
    check(next.length === 3 && [].map.call(next, function (b) { return b.dataset.step; }).join() === 'double,wire,helmet', '"Another requisition": the tree again, Barbed wire next on its row');
    next[0].click(); document.getElementById('cTake').click();
    check(t.tree.join() === 'sandbags,double' && t.at === 'barracks' && !document.getElementById('cBarracks').hidden, 'two steps taken, on to the barracks');
    var back = camp.readLink(camp.linkCode(t));
    check(back && back.tree.slice().sort().join() === 'double,sandbags', 'the save link carries the tree (version 5)');
    var old = camp.readLink(armyFixtures['campaign-4-first-zeppelin'].link);
    check(old && old.tree === null, 'a link from before it reads as a tour with the whole shop');
    // No star: one pick, no bonus.
    t = tourAt(0, 'hold-the-radio', []); t.m = 2; t.missions[2] = 'hold-the-radio'; t.opLosses = 1; camp.write();
    camp.startMission(); S.cm.count.radio = 99; S.cm.cleared = true; world.MODES.campaign.win();
    check(t.debrief.picks === 1 && !t.debrief.bonus, 'no gold star, no bonus');
    check(camp.takeStep('wire') === null && camp.takeStep('helmet') === 'done' && t.tree.join() === 'helmet', 'only a row\'s next step can be taken');

    // ---------- Downed pilot ----------
    t = tourAt(0, 'downed-pilot', []); camp.startMission();
    frames(60 * 4.2);
    var p = S.troopers.find(function (q) { return q.pilot; }), mat = activeTramps()[0];
    check(p && p.prize && p.drift && /pilots safe 0\/3/.test(world.MODES.campaign.hud().sub), 'a pilot bails out, drifting (' + world.MODES.campaign.hud().sub + ')');
    check(world.MODES.campaign.spare(p) && pickTarget(S.recruits[0]) !== p, 'the squad holds fire on him');
    for (var f = 0; f < 60 * 20 && !(p.x > mat.x1 + 10 && p.x < mat.x2 - 10 && p.y > 440); f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    check(p.x > mat.x1 + 10 && p.x < mat.x2 - 10 && p.y > 440, 'he comes over the mat low (' + Math.round(p.x) + ',' + Math.round(p.y) + ')');
    popChute(p); frames(90);
    check(S.cm.count.pilots === 1 && !S.recruits.some(function (r) { return r.id === p.id; }), 'popped over it, he bounces to safety (not into the squad)');
    for (f = 0; f < 60 * 30 && S.cm.count.pilotsLost < 2 && S.mode === 'play'; f++) { S.wallHP = S.mods.maxHP; S.troopers.forEach(function (q) { if (!q.pilot) q.dead = true; }); update(1 / 60); }
    check(S.cm.count.pilotsLost === 2, 'two left alone land and are lost');
    for (f = 0; f < 60 * 4 && S.mode !== 'between'; f++) update(1 / 60);
    check(t.at === 'lost' && /Two pilots were lost/.test(t.last.cause), 'and the mission with them: ' + t.last.cause);
    // The wave waits for its pilots.
    t = tourAt(0, 'downed-pilot', []); camp.startMission();
    S.spawn.planes = S.spawn.bombers = 0;
    for (f = 0; f < 60 * 8; f++) { S.wallHP = S.mods.maxHP; S.troopers.forEach(function (q) { if (!q.pilot) q.dead = true; }); S.planes = []; update(1 / 60); }
    check(S.waveState === 'active' && world.MODES.campaign.held(), 'with its planes gone, the wave holds for the pilots still to come');

    // ---------- Hold the radio ----------
    t = tourAt(0, 'hold-the-radio', []); camp.startMission(); frames(2);
    var mast = S.cm.mast;
    check(mast && mast.hp === 100 && Math.abs(mast.x - BK.x) > 40, 'a mast between the mat and the bunker (' + (mast && mast.x) + ')');
    S.troopers = []; S.recruits = [];
    var l = spawnTrooper(mast.x < BK.x ? 14 : W - 14, GROUND - 33, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); land(l);
    for (f = 0; f < 60 * 6 && mast.hp === 100; f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    frames(60);
    check(mast.hp < 100 && Math.abs(l.x - mast.x) < 12 && l.atWall, 'a lander stops at the mast and wrecks it (' + Math.round(mast.hp) + ' ' + JSON.stringify({ x: l.x, st: l.state, dead: l.dead, dir: l.dir, m: mast.x, at: l.atWall, role: S.recruits.map(function (r) { return r.role + r.x; }) }) + ')');
    l.dead = true;
    S.cm.count.radio = 44.9; var bombers = S.calls.bomber;
    frames(20);
    check(S.cm.called && S.strike && S.cm.cleared, 'the call goes through: an air strike, and the enemy surrenders');
    t = tourAt(0, 'hold-the-radio', []); camp.startMission(); frames(2); S.cm.mast.hp = 0;
    for (f = 0; f < 60 * 4 && S.mode !== 'between'; f++) update(1 / 60);
    check(t.at === 'lost' && /mast came down/.test(t.last.cause), 'the mast down loses it');

    // ---------- Supply drop ----------
    t = tourAt(1, 'supply-drop', []); camp.startMission();
    check(S.spawn.cfg.crates === 2 && /crates in 0\/3/.test(world.MODES.campaign.hud().sub), 'two supply planes a wave');
    world.emit('crate_caught', { kind: 'tags', by: 'crew' }); world.emit('hq_hit', { lost: true });
    check(S.cm.count.crates === 1 && S.cm.count.hqHit === 1 && S.mode === 'play', 'a crate in counts; one plane hit is a warning');
    world.emit('hq_hit', { lost: true }); frames(5);
    for (f = 0; f < 60 * 4 && S.mode !== 'between'; f++) update(1 / 60);
    check(t.at === 'lost' && /Two supply planes/.test(t.last.cause), 'two hit loses it');

    // ---------- The officer ----------
    t = tourAt(1, 'the-officer', []); camp.startMission();
    frames(60 * 6.2);
    var o = S.troopers.find(function (q) { return q.officer; });
    check(o && o.prize && o.armor === 1 && /officers 0\/3/.test(world.MODES.campaign.hud().sub), 'an officer jumps, in a vest');
    var tags = tagsOf(0);
    o.x = (mat.x1 + mat.x2) / 2; o.y = mat.y - 60; o.state = 'free'; o.vy = 0;
    frames(90);
    check(S.cm.count.officers === 1 && S.cm.count.intel === 1 && tagsOf(0) > tags, 'caught on the mat: intel, and tags');
    for (f = 0; f < 60 * 20 && !S.troopers.some(function (q) { return q.officer && !q.dead; }); f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    o = S.troopers.find(function (q) { return q.officer && !q.dead; });
    killTrooper(o, 'player'); frames(2);
    check(S.cm.count.officers === 2 && S.cm.count.intel === 1, 'shot: dealt with, no intel');
    for (f = 0; f < 60 * 20 && !S.troopers.some(function (q) { return q.officer && !q.dead; }); f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    o = S.troopers.find(function (q) { return q.officer && !q.dead; });
    var wall = S.wallHP = S.mods.maxHP; o.y = GROUND - 34; update(1 / 60); update(1 / 60);
    check(S.cm.count.officerLanded === 1 && S.wallHP < wall, 'one that lands calls in his guns');
    for (f = 0; f < 60 * 4 && S.mode !== 'between'; f++) update(1 / 60);
    check(t.at === 'lost' && /officer landed/.test(t.last.cause), 'and the mission is lost: ' + t.last.cause);
  } finally {
    clear(); RUN.game = 'arcade'; titleScene();
  }
  return 'ok';
})();
