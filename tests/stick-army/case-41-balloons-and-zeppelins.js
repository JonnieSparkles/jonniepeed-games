// Campaign round 6: Balloon Season's and First Zeppelin's set pieces. Spotter balloon (its guards, its marks and
// shells, popping it, three soldiers hit losing it), The big one (drifting in, popped, or reaching the bunker), Bomb
// bay (the bay open before a run, a hit in it counting and stopping the run), Recon run (passes, friendly fire, shot
// down), Last stand (the wall at 40% and no repairs, the clock).
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var camp = world.campaign, K = camp.keys;
  function clear() { [K.tour, K.wave, K.stars, K.seen, K.unlock].forEach(function (k) { localStorage.removeItem(k); }); }
  function tourAt(op, mission) {
    var t = camp.freshTour('K7QMR2');
    t.op = op; t.missions = camp.missionsFor(t, op); t.missions[0] = mission;
    t.squad = [{ id: 3, type: 'rifle', stripes: 1, kills: 20 }, { id: 4, type: 'engineer', stripes: 1, kills: 5 }, { id: 5, type: 'rifle', stripes: 0, kills: 2 }, { id: 6, type: 'rifle', stripes: 0, kills: 0 }];
    t.nextId = 40; t.tree = []; camp.nameAll(t); camp.setTour(t);
    return t;
  }
  function frames(n, keep) { for (var f = 0; f < n && (S.mode === 'play' || S.mode === 'dying'); f++) { if (keep) S.wallHP = S.mods.maxHP; update(1 / 60); } }
  function bullet(x, y, heavy) { var b = { x: x, y: y, vx: 0, vy: -700, owner: 'player', kind: 'bullet', heavy: heavy, pierce: 1, hits: [], life: 1, dead: false }; hitTest(b); return b; }
  function lose() { for (var f = 0; f < 60 * 4 && S.mode !== 'between'; f++) update(1 / 60); }
  try {
    clear();
    // ---------- Spotter balloon ----------
    var t = tourAt(2, 'spotter-balloon'); camp.startMission(); frames(10, true);
    var sp = S.cm.spot;
    check(sp && sp.hp === 14 && Math.abs(sp.x - BK.x) === 100, 'a spotter balloon away from the bunker (' + (sp && sp.x) + ')');
    check(S.barrage.length === 2 && S.barrage.every(function (q) { return Math.abs(q.x - sp.x) <= 60; }), 'with a barrage balloon either side (' + S.barrage.map(function (q) { return q.x; }) + ')');
    frames(60 * 3.2, true);
    check(sp.marks.length === 1, 'he marks a spot');
    var mark = sp.marks[0].x, r = S.recruits.find(function (q) { return Math.abs(q.x - mark) < 20; });
    var hp = r ? r.hp : 0;
    frames(60 * 4.2, true);
    check(!sp.marks.some(function (q) { return q.x === mark && !q.done; }) && (!r || r.hp < hp || r.down || r.dead), 'and a shell lands on it');
    for (var i = 0; i < 14 && sp.hp > 0; i++) bullet(sp.x, 118);
    check(sp.hp <= 0 && S.cm.count.spotter === 1 && /spotter down!/.test(world.MODES.campaign.hud().sub), 'popped: the goal is met');
    t = tourAt(2, 'spotter-balloon'); camp.startMission(); frames(10, true); S.cm.spot.hits.n = 3; frames(2, true); lose();
    check(t.at === 'lost' && /shells hit the squad three times/.test(t.last.cause), 'three soldiers hit loses it: ' + t.last.cause);

    // ---------- The big one ----------
    t = tourAt(2, 'the-big-one'); camp.startMission(); frames(60 * 4, true);
    var big = S.cm.big;
    check(big && big.hp === 70 && Math.abs(big.x - BK.x) > 140, 'the big one comes in at an edge (' + Math.round(big.x) + ')');
    frames(60 * 10, true);
    check(Math.abs(big.x - BK.x) < Math.abs(big.from - BK.x), 'drifting toward the bunker (' + Math.round(big.x) + ')');
    big.x = 200 + (big.from < 200 ? -60 : 60);
    for (i = 0; i < 70 && !big.gone; i++) bullet(big.x, 150);
    check(big.gone && S.cm.count.big === 1, 'popped');
    t = tourAt(2, 'the-big-one'); camp.startMission(); frames(60 * 4, true);
    S.cm.big.x = BK.x + (S.cm.big.from < BK.x ? -1 : 1); var wall = S.wallHP; frames(30);
    check(S.cm.count.bigLanded && S.wallHP <= wall - S.mods.maxHP * 0.5 + 1, 'reaching the bunker, it takes half the wall (' + JSON.stringify({ l: S.cm.count.bigLanded, w: S.wallHP, was: wall, x: S.cm.big.x, from: S.cm.big.from, gone: S.cm.big.gone }) + ')');
    lose();
    check(t.at === 'lost' && /reached the bunker/.test(t.last.cause), 'and the mission');

    // ---------- Bomb bay ----------
    t = tourAt(3, 'bay-doors'); camp.startMission();
    var z; for (var f = 0; f < 60 * 30 && !(z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.entered; })); f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    z.bombT = 5; frames(2, true);
    check(!S.cm.bayOpen, 'the bay is shut between runs');
    z.bombT = 2.5; frames(1, true);
    check(S.cm.bayOpen, 'and opens before one');
    var bx = z.x + z.face * 34, by = z.y + z.hh - 2, hits = S.cm.count.bay;
    bullet(bx, by + 4);
    check(S.cm.count.bay === hits + 1 && !S.cm.bayOpen && z.bombT >= 6, 'a hit in the open bay counts and stops the run');
    check(/bay hits 1\/5/.test(world.MODES.campaign.hud().sub), 'the HUD counts it');

    // ---------- Recon run ----------
    t = tourAt(3, 'recon-run'); camp.startMission(); frames(60 * 3.5, true);
    var rc = S.cm.recon;
    check(rc && rc.flying && rc.hp === 30, 'the recon plane comes through');
    S.planes = S.planes.filter(function (p) { return p.kind === 'zeppelin'; });
    for (f = 0; f < 60 * 10 && (rc.x < 80 || rc.x > W - 80); f++) { S.wallHP = S.mods.maxHP; S.planes = S.planes.filter(function (p) { return p.kind === 'zeppelin'; }); update(1 / 60); }
    var before = rc.hp;
    hitTest({ x: rc.x, y: 128, vx: 0, vy: -700, owner: 'player', kind: 'bullet', pierce: 1, hits: [], life: 1, dead: false });
    check(rc.hp === before - 3, 'shooting it hurts it');
    rc.hp = 30;
    for (f = 0; f < 60 * 20 && rc.flying; f++) { S.wallHP = S.mods.maxHP; S.planes = S.planes.filter(function (p) { return p.kind === 'zeppelin'; }); update(1 / 60); }
    check(S.cm.count.recon === 1 && /photos 1\/3/.test(world.MODES.campaign.hud().sub), 'a pass made');
    frames(60 * 5, true);
    rc.hp = 0.01; S.planes.push((function () { var p = makePlane('plane', 1, rc.x, 128); p.speed = 0; return p; })()); frames(10, true); lose();
    check(t.at === 'lost' && /recon plane went down/.test(t.last.cause), 'shot down, the mission is lost');

    // ---------- Last stand ----------
    t = tourAt(3, 'last-stand'); camp.startMission(); frames(2);
    check(S.wallHP === Math.round(S.mods.maxHP * 0.4), 'the wall starts at 40% (' + S.wallHP + ')');
    var cap = S.wallHP; world.repairWall(30, 'crew'); frames(1);
    check(S.wallHP <= cap, 'and can\'t be repaired');
    check(/hold \d+s/.test(world.MODES.campaign.hud().sub), 'the HUD counts down: ' + world.MODES.campaign.hud().sub);
    S.cm.count.stand = 44.99; frames(5);
    check(S.cm.cleared, 'the clock runs out: they surrender');
  } finally {
    clear(); RUN.game = 'arcade'; titleScene();
  }
  return 'ok';
})();
