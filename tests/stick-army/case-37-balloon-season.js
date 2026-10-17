// Campaign round 3, Balloon Season: the operation released and a round-2 tour carrying on into it, its waves (Arcade
// 5 to 7 without the zeppelin or the helicopters), barrage balloons (their places, a cable stopping a bullet, three hits
// to pop one, the cable falling, floating off when the wave clears), the new goals, the gold star (bomb balloons popped
// away from the bunker), the save link that carries it (version 3, version 2 still read) and the machine gunner
// (Campaign's hire only, bursts at low targets, runs hot and rests).
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var camp = world.campaign, K = camp.keys;
  function clear() { [K.tour, K.wave, K.stars, K.seen, K.unlock].forEach(function (k) { localStorage.removeItem(k); }); }
  function bs(mission, code) {
    var t = camp.freshTour(code || 'K7QMR2');
    t.op = 2; t.missions = camp.missionsFor(t, 2); if (mission) t.missions[0] = mission;
    t.squad = [{ id: 3, type: 'rifle', stripes: 1, kills: 20 }, { id: 4, type: 'engineer', stripes: 1, kills: 5 }, { id: 5, type: 'sniper', stripes: 0, kills: 2 }, { id: 6, type: 'mg', stripes: 0, kills: 0 }];
    t.nextId = 40; camp.nameAll(t); camp.setTour(t);
    return t;
  }
  // A code whose Balloon Season is Clear, so the wind doesn't turn the blimps and the sky is plain.
  function clearCode() { for (var v = 0; v < 200; v++) { var c = camp.codeText(v * 31337); if (camp.weatherFor(camp.freshTour(c), 2) === 'clear') return c; } }
  function frames(n, keep) { for (var f = 0; f < n; f++) { if (keep) S.wallHP = S.mods.maxHP; update(1 / 60); } }
  try {
    clear();
    // ---------- the release ----------
    var op = camp.OPS[2];
    check(op.released && op.slots === 4 && op.starKind === 'balloons' && camp.RELEASE >= 3, 'Balloon Season is out');
    var draws = {};
    for (var v = 0; v < 30; v++) { var m = camp.missionsFor(camp.freshTour(camp.codeText(v * 104729)), 2); check(m.length === 3 && m[0] === 'cable-cutters', 'Cable cutters first'); draws[m.join()] = 1; }
    check(Object.keys(draws).length >= 5, 'and two of its pool after it');
    var ended = camp.freshTour('K7QMR2'); ended.op = 1; ended.at = 'end'; ended.m = 3; ended.opDummies = 2;
    var on = camp.readTour(JSON.parse(JSON.stringify(ended)));
    check(on.op === 2 && on.at === 'map' && on.m === 0 && on.missions[0] === 'cable-cutters' && on.opDummies === 0, 'a tour waiting at "To be continued" carries on into it');
    localStorage.setItem(K.seen, '2'); localStorage.setItem(K.unlock, 'true');
    camp.setTour(on); titleScene();
    check(!document.getElementById('campaignNew').hidden, 'the "new" tag is back');
    document.getElementById('campaignBtn').click();
    check(/Operation [A-Za-z ]+ is live/.test(document.getElementById('cOps').textContent), 'and the map says what\'s new');

    // ---------- the waves ----------
    var code = clearCode(), t = bs('cable-cutters', code);
    camp.startMission();
    check(S.wave === 5 && !S.spawn.cfg.boss && S.spawn.cfg.barrage === 3, 'Cable cutters plays as wave 5, no zeppelin, three barrage balloons');
    t = bs('behind-the-wire', code); camp.startMission();
    check(S.wave === 6 && S.spawn.cfg.bombers === 5 && !S.spawn.cfg.helis, 'Behind the wire: bombers and no helicopters');
    var c7 = world.MODES.campaign.wave(7);
    check(!c7.helis && !c7.boss, 'and its wave 7 has no helicopters either');
    check(S.recruits.length === 4, 'four go out');

    // ---------- barrage balloons ----------
    t = bs('cable-cutters', code); camp.startMission();
    frames(2);
    check(S.barrage.length === 3 && S.barrage.every(function (q) { return Math.abs(q.x - BK.x) > 60 && q.hp === 3; }), 'three go up, away from the bunker (' + S.barrage.map(function (q) { return q.x; }) + ')');
    var again = S.barrage.map(function (q) { return q.x + ':' + q.y; }).join();
    camp.startMission(); frames(2);
    check(S.barrage.map(function (q) { return q.x + ':' + q.y; }).join() === again, 'in the same places on a retry');
    frames(60 * 3);
    var q = S.barrage[0], qy = q.cy;
    check(Math.abs(qy - q.y) < 1, 'risen to its place (' + qy + ')');
    S.planes = []; S.troopers = []; S.bombs = [];
    // A bullet crossing the cable, low down.
    var b = { x: q.x - 6, y: qy + 120, vx: 600, vy: 0, life: 2, owner: 'player', dead: false };
    S.bullets.push(b); frames(2);
    check(b.dead && q.hp === 3, 'a cable stops a bullet');
    var flak = { x: q.x - 6, y: qy + 120, vx: 600, vy: 0, life: 2, owner: 'player', flak: true, dead: false };
    S.bullets.push(flak); frames(1);
    check(flak.x > q.x, 'flak passes it');
    var tags = tagsOf(0);
    for (var h = 0; h < 3; h++) { var hit = { x: q.x, y: qy + 40, vx: 0, vy: -700, life: 2, owner: 'player', dead: false }; S.bullets.push(hit); frames(8); check(hit.dead, 'a shot at the balloon hits it'); }
    check(q.state === 'cut' && S.cm.count.barrage === 1 && tagsOf(0) > tags, 'three hits pop it');
    var through = { x: q.x - 6, y: qy + 120, vx: 600, vy: 0, life: 2, owner: 'player', dead: false };
    S.bullets.push(through); frames(1);
    check(!through.dead, 'and its cable falls, letting shots past');
    frames(90);
    check(S.barrage.indexOf(q) < 0 && S.barrage.length === 2, 'the cable is gone');
    check(/popped 1\/4/.test(world.MODES.campaign.hud().sub) && /Popped 1 of 4/.test(camp.pauseLine(S)), 'the goal counts it: ' + world.MODES.campaign.hud().sub);
    // The wave clears: the others float off.
    S.spawn.planes = S.spawn.bombers = S.spawn.rushes = S.spawn.cargo = S.spawn.road = S.spawn.balloons = 0; S.spawn.boss = 0;
    for (var f = 0; f < 60 * 30 && S.waveState === 'active'; f++) { S.planes = []; S.troopers = []; S.bombs = []; S.wallHP = S.mods.maxHP; update(1 / 60); }
    check(S.waveState !== 'active', 'the wave clears');
    frames(60 * 4);
    check(!S.barrage.length || S.barrage.every(function (r) { return r.state === 'away'; }), 'and the rest float off');
    // The other goals.
    t = bs('popcorn', code); camp.startMission();
    world.emit('plane_down', { kind: 'balloon', x: 60 }); S.cm.count.barrage = 2;
    check(/balloons 3\/12/.test(world.MODES.campaign.hud().sub), 'Popcorn counts both kinds: ' + world.MODES.campaign.hud().sub);
    t = bs('behind-the-wire', code); camp.startMission();
    world.emit('plane_down', { kind: 'bomber' }); world.emit('plane_down', { kind: 'plane' });
    check(/bombers 1\/3/.test(world.MODES.campaign.hud().sub), 'Behind the wire counts bombers only');

    // ---------- the gold star ----------
    t = bs('popcorn', code); camp.startMission();
    world.emit('plane_down', { kind: 'balloon', x: 330 }); world.emit('plane_down', { kind: 'balloon', x: 215 });
    check(S.cm.count.awayPops === 1, 'a bomb balloon popped over the bunker doesn\'t count for the star');
    t = bs('hold-fast', code); t.m = 2; t.missions[2] = 'hold-fast'; t.opBalloons = 9; camp.write();
    camp.startMission(); world.emit('plane_down', { kind: 'balloon', x: 40 }); S.cm.cleared = true; world.MODES.campaign.win();
    check(t.debrief && t.debrief.star === true && t.opBalloons === 10, 'ten away from the bunker: the gold star');
    t = bs('hold-fast', code); t.m = 2; t.missions[2] = 'hold-fast'; t.opBalloons = 8;
    camp.startMission(); world.emit('plane_down', { kind: 'balloon', x: 40 }); S.cm.cleared = true; world.MODES.campaign.win();
    check(t.debrief && t.debrief.star === false, 'nine: none');

    // ---------- the save link ----------
    t = bs('cable-cutters', code); t.opBalloons = 7; t.deploy = [6, 3, 4, 5];
    var back = camp.readLink(camp.linkCode(t));
    check(back && back.opBalloons === 7 && back.squad.some(function (s) { return s.type === 'mg'; }) && back.deploy.join() === '6,3,4,5', 'the save link carries the balloons and the machine gunner (version 3)');
    var old = camp.readLink(armyFixtures['campaign-2-recruitment-drive'].link);
    check(old && old.opDummies === 1 && !old.opBalloons, 'a version 2 link still reads');

    // ---------- the machine gunner ----------
    t = bs('cable-cutters', code); t.deploy = [6, 3, 4, 5]; camp.startMission();
    var mg = S.recruits.find(function (r) { return r.type === 'mg'; });
    check(mg, 'he deploys');
    S.planes = []; S.troopers = []; S.bombs = []; S.barrage = []; S.cm.barrageWave = S.cm.wi;
    S.recruits.forEach(function (r) { if (r !== mg) r.role = 'idle'; });
    var high = spawnTrooper(mg.x + 30, 200, { type: 'rifle', fall: 0, sway: 0, armor: 0 }); high.open = 1; high.state = 'chute';
    var shots0 = S.bullets.length; frames(30);
    check(S.bullets.filter(function (x) { return x.owner === 'ally'; }).length === 0 || S.bullets.length === shots0, 'he leaves high chutes alone');
    S.troopers = [];
    var low = spawnTrooper(mg.x + 80, GROUND - 33, { type: 'rifle', fall: 1, sway: 0, armor: 9 }); low.state = 'ground'; low.hp = 999;
    var fired = 0; for (f = 0; f < 60 * 8 && !(mg.rest > 0); f++) { var n0 = S.bullets.length; S.wallHP = S.mods.maxHP; low.hp = 999; low.dead = false; update(1 / 60); if (S.bullets.length > n0) fired++; }
    check(fired >= 8 && mg.rest > 0, 'he bursts at the ground and runs hot (' + fired + ' bursts)');
    var restN = 0; for (f = 0; f < 60; f++) { var n1 = S.bullets.filter(function (x) { return x.owner === 'ally' && !x.dead; }).length; update(1 / 60); low.hp = 999; low.dead = false; }
    check(mg.rest > 0 || mg.heat < 1, 'then rests');
    S.players[0].tags += 999; S.planes = []; S.troopers = []; openShop();
    check(S.shop.hire.some(function (x) { return x.id === 'hire-mg'; }), 'Campaign\'s shop hires him');
    RUN.force = 5; newGame(); RUN.force = null; S.planes = []; S.troopers = []; openShop();
    check(!S.shop.hire.some(function (x) { return x.id === 'hire-mg'; }), 'Arcade\'s doesn\'t');
    for (v = 0; v < 400; v++) check(rollTrooper(Math.random).type !== 'mg', 'nobody jumps as a machine gunner');
    // Earlier operations offer veterans as before (never a machine gunner).
    var t1 = camp.freshTour('K7QMR2'); t1.op = 1;
    for (v = 0; v < 40; v++) { t1.code = camp.codeText(v * 7919); camp.offersFor(t1).forEach(function (o) { check(o.type !== 'mg', 'Recruitment Drive never offers him'); }); }
  } finally {
    clear(); RUN.game = 'arcade'; titleScene();
  }
  return 'ok';
})();
