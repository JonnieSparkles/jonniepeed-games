// Campaign round 4, First Zeppelin: the operation released (four missions, the boss mission last) and a round-3 tour
// carrying on into it, the armory (the heavy gun handed over on the briefing, the gun row on the deploy screen before
// every mission), the heavy gun itself (slower, hotter, rounds that down a bomber and go through a helmet; Arcade never
// has it), Campaign's zeppelins (lighter, leaving when the enemy surrenders), the boss mission (waits for the crew,
// counts the ones caught), the gold star, and the save link.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var camp = world.campaign, K = camp.keys;
  function clear() { [K.tour, K.wave, K.stars, K.seen, K.unlock].forEach(function (k) { localStorage.removeItem(k); }); }
  function clearCode() { for (var v = 0; v < 200; v++) { var c = camp.codeText(v * 31337); if (camp.weatherFor(camp.freshTour(c), 3) === 'clear' && !camp.intelFor(camp.freshTour(c), 3)) return c; } return camp.codeText(31337); }
  function fz(mission, code) {
    var t = camp.freshTour(code || 'K7QMR2');
    t.op = 3; t.missions = camp.missionsFor(t, 3); if (mission) t.missions[0] = mission;
    t.squad = [{ id: 3, type: 'rifle', stripes: 1, kills: 20 }, { id: 4, type: 'engineer', stripes: 1, kills: 5 }, { id: 5, type: 'sniper', stripes: 0, kills: 2 },
      { id: 6, type: 'mg', stripes: 0, kills: 0 }, { id: 7, type: 'rifle', stripes: 0, kills: 1 }];
    t.nextId = 40; camp.nameAll(t); camp.setTour(t);
    return t;
  }
  function frames(n, keep) { for (var f = 0; f < n; f++) { if (keep) S.wallHP = S.mods.maxHP; update(1 / 60); } }
  function zep() { return S.planes.find(function (p) { return p.kind === 'zeppelin'; }); }
  function waitZep() { for (var f = 0; f < 60 * 30 && !(zep() && zep().entered); f++) { S.wallHP = S.mods.maxHP; update(1 / 60); } return zep(); }
  try {
    clear();
    // ---------- the release ----------
    var op = camp.OPS[3];
    check(op.released && op.slots === 5 && op.starKind === 'crew' && op.gun === 'heavy' && camp.RELEASE === 4, 'First Zeppelin is out');
    // Its missions in a fixed order since round 6, the boss mission last.
    var v, m = camp.missionsFor(camp.freshTour(camp.codeText(104729)), 3);
    check(m.join() === 'bay-doors,recon-run,last-stand,the-zeppelin', 'Bomb bay, Recon run, Last stand, then the boss (' + m + ')');
    check(camp.missionsFor(camp.freshTour('K7QMR2'), 2).length === 3, 'earlier operations draw as before');
    var ended = camp.freshTour('K7QMR2'); ended.op = 2; ended.at = 'end'; ended.m = 3; ended.opBalloons = 6;
    var on = camp.readTour(JSON.parse(JSON.stringify(ended)));
    check(on.op === 3 && on.at === 'map' && on.missions[0] === 'bay-doors' && on.opBalloons === 0 && on.opCrew === 0, 'a tour waiting at "To be continued" carries on into it');
    localStorage.setItem(K.seen, '3'); localStorage.setItem(K.unlock, 'true');
    camp.setTour(on); titleScene();
    check(!document.getElementById('campaignNew').hidden, 'the "new" tag is back');
    document.getElementById('campaignBtn').click(); if (!document.getElementById('cCard').hidden && document.getElementById('cContinue')) document.getElementById('cContinue').click();
    check(/First Zeppelin is live/.test(document.getElementById('cOps').textContent), 'and the map says what\'s new');

    // ---------- the armory ----------
    var code = clearCode(), t = fz('bay-doors', code);
    check(camp.armory(t).join() === 'standard,heavy' && camp.armory(Object.assign({}, t, { op: 2 })).join() === 'standard', 'the heavy gun comes with First Zeppelin');
    check(camp.needsDeploy(t) && t.squad.length === op.slots, 'so the deploy screen comes first, even with the whole squad fitting');
    t.at = 'briefing'; camp.write(); camp.screens.briefing();
    check(/HQ sends the heavy gun/.test(document.getElementById('cBriefBody').textContent), 'the briefing says so');
    document.getElementById('cBriefGo').click();
    var guns = document.querySelectorAll('#cGuns .c-gun');
    check(!document.getElementById('cDeploy').hidden && guns.length === 2 && guns[0].getAttribute('aria-pressed') === 'true', 'Go opens deploy with the gun row, Standard ticked');
    guns[1].click();
    check(document.querySelectorAll('#cGuns .c-gun')[1].getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#cGuns .c-gun')[0].getAttribute('aria-pressed') === 'false', 'tap Heavy');
    document.getElementById('cDeployGo').click();
    check(S.mode === 'play' && t.gun === 'heavy' && S.turrets[0].heavy && S.cm.gun === 'heavy' && S.recruits.length === 5, 'Deploy goes out with the heavy gun');
    // Between missions, Go comes by the deploy screen too.
    t.at = 'between'; t.m = 1; t.last = { won: true, mission: 'Bomb bay', caught: 4, planes: 3, fell: [] }; camp.write(); S.mode = 'between'; camp.screens.between();
    document.getElementById('cGo').click();
    check(!document.getElementById('cDeploy').hidden && document.querySelectorAll('#cGuns .c-gun')[1].getAttribute('aria-pressed') === 'true', 'the next Go opens deploy, the pick kept');
    check(!document.querySelector('#cCard [data-act="swap"]'), 'so the card needs no Swap link');

    // ---------- the heavy gun ----------
    t = fz('bay-doors', code); t.gun = 'standard'; camp.startMission();
    var tu = S.turrets[0]; tu.heat = 0; tu.fireCD = 0; fireVolley(tu);
    var cd = tu.fireCD, heat = tu.heat;
    check(!tu.heavy && !S.bullets[S.bullets.length - 1].heavy, 'the standard gun');
    t.gun = 'heavy'; camp.startMission(); tu = S.turrets[0]; tu.heat = 0; tu.fireCD = 0; fireVolley(tu);
    check(tu.fireCD > cd * 2 && tu.heat > heat * 1.8 && S.bullets[S.bullets.length - 1].heavy, 'the heavy one fires slower and heats faster (' + tu.fireCD.toFixed(2) + ', ' + tu.heat.toFixed(2) + ')');
    S.planes = []; S.troopers = []; S.bombs = []; S.bullets = [];
    var b1 = makePlane('bomber', 1, 200, 200); b1.hp = 3; b1.speed = 0; S.planes.push(b1);
    hitTest({ x: 200, y: 200, vx: 0, vy: -700, owner: 'player', kind: 'bullet', heavy: true, pierce: 1, hits: [], life: 1, dead: false });
    check(b1.state === 'fall', 'one heavy round downs a bomber');
    var helm = spawnTrooper(250, 400, { type: 'rifle', fall: 1, sway: 0, armor: 1 });
    hitTest({ x: helm.x, y: helm.y + 10, vx: 0, vy: -700, owner: 'player', kind: 'bullet', pierce: 1, hits: [], life: 1, dead: false });
    check(!helm.dead && helm.armor === 0, 'a standard round knocks a helmet off');
    var helm2 = spawnTrooper(300, 400, { type: 'rifle', fall: 1, sway: 0, armor: 1 });
    hitTest({ x: helm2.x, y: helm2.y + 10, vx: 0, vy: -700, owner: 'player', kind: 'bullet', heavy: true, pierce: 1, hits: [], life: 1, dead: false });
    check(helm2.dead, 'a heavy one goes through it');
    RUN.force = 5; newGame(); RUN.force = null;
    check(!S.turrets[0].heavy, 'Arcade never has it');

    // ---------- Campaign's zeppelins ----------
    t = fz('bay-doors', code); camp.startMission();
    var z = waitZep();
    check(z && z.maxHp === Math.round(zeppelinHP(7) * 0.6), 'a lighter zeppelin (' + (z && z.maxHp) + ' of ' + zeppelinHP(7) + ')');
    frames(60 * 10, true);
    check(!z.leaving && S.planes.indexOf(z) >= 0, 'it stays over the page');
    S.cm.count.bay = 5; frames(2, true);
    check(S.cm.cleared && z.leaving, 'met goal: the enemy surrenders and the zeppelin leaves');

    // ---------- the boss mission ----------
    t = fz('the-zeppelin', code); t.m = 3; t.missions[3] = 'the-zeppelin'; camp.write();
    camp.startMission(); z = waitZep();
    check(S.wave === 10 && z && z.maxHp === Math.round(zeppelinHP(10) * 0.6) && z.plates && z.plates.length, 'the armored zeppelin, lighter (' + (z && z.maxHp) + ')');
    check(/down the zeppelin/.test(world.MODES.campaign.hud().sub), 'the HUD names the goal');
    S.planes.filter(function (p) { return p !== z; }).forEach(function (p) { p.gone = true; });
    zeppelinDown(z, 'player');
    frames(2, true);
    var crew = S.troopers.filter(function (q) { return q.crew && !q.dead; });
    check(crew.length === 3 && S.cm.count.zeps === 1 && !S.cm.cleared, 'it goes down, its crew bail out, and the mission waits for them');
    check(/Catch its crew/.test(camp.pauseLine(S)), 'the pause line says so');
    var c0 = crew[0]; c0.x = (TRAMPS[0].x1 + TRAMPS[0].x2) / 2; c0.y = TRAMPS[0].y - 40; c0.state = 'chute'; c0.open = 1;
    bounce(c0, TRAMPS[0]); for (var f = 0; f < 120 && !c0.dead; f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    check(S.cm.count.crew === 1, 'one caught counts (' + S.cm.count.crew + ')');
    crew.slice(1).forEach(function (q) { killTrooper(q, 'player'); });
    for (f = 0; f < 60 * 20 && S.mode === 'play'; f++) { S.wallHP = S.mods.maxHP; update(1 / 60); }
    check(t.opCrew === 1 && t.debrief && t.debrief.star === false, 'the mission is won; one of three is no gold star');
    t = fz('the-zeppelin', code); t.m = 3; t.missions[3] = 'the-zeppelin'; camp.write();
    camp.startMission(); S.cm.count.crew = 3; S.cm.count.zeps = 1; S.cm.cleared = true; world.MODES.campaign.win();
    check(t.opCrew === 3 && t.debrief && t.debrief.star === true, 'all three: the gold star');

    // ---------- the save link ----------
    t = fz('bay-doors', code); t.gun = 'heavy'; t.opCrew = 2;
    var back = camp.readLink(camp.linkCode(t));
    check(back && back.gun === 'heavy' && back.opCrew === 2 && back.squad.length === 5, 'the save link carries the gun and the crew');
    // ---------- "To be continued" ----------
    t = fz(null, code); t.m = 4; t.at = 'end'; t.stars['first-zeppelin'] = true; camp.write(); camp.screens.end();
    var endText = document.getElementById('cCard').textContent;
    check(/A fork, Mercy Flight or Chopper Country, comes in the next release/.test(endText) && /Gold star: catch all 3 of the big zeppelin's crew/.test(endText), 'the end card names the fork and this star: ' + endText);
  } finally {
    clear(); RUN.game = 'arcade'; titleScene();
  }
  return 'ok';
})();
