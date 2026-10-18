// Campaign part 2, the flow: no shop between a mission's waves; promotions a quarter stripe a mission won, for those
// who went out, on the mission's card; the operation's map (badges, done missions read only, the next one live);
// prep (the whole squad, its slots, a few supplies with "new" and how long they last, bought and put back; Change who
// goes after a lost mission); the shop and the Squad screen between operations; squad orders from the tree; and the
// save link on the pause card.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var camp = world.campaign, K = camp.keys;
  function clear() { [K.tour, K.wave, K.stars, K.seen, K.unlock].forEach(function (k) { localStorage.removeItem(k); }); }
  function tourAt(op, mission, squad) {
    var t = camp.freshTour('K7QMR2');
    t.op = op; t.missions = camp.missionsFor(t, op); if (mission) t.missions[0] = mission;
    t.squad = squad || [{ id: 3, type: 'rifle', stripes: 1, kills: 20, xp: 3 }, { id: 4, type: 'engineer', stripes: 0, kills: 5, xp: 1 }, { id: 5, type: 'rifle', stripes: 5, kills: 90 }, { id: 6, type: 'medic', stripes: 0, kills: 0, xp: 2 }];
    t.nextId = 40; camp.nameAll(t); camp.setTour(t);
    return t;
  }
  function orderAt(name) { var i = camp.ORDERS.indexOf(name); return { x: 360, y: 679 - (camp.ORDERS.length - i) * 28 - 6 + 10 }; }
  function win() { S.cm.count.caught = 99; S.cm.count.crates = 99; S.cm.count.radio = 999; S.cm.cleared = true; world.MODES.campaign.win(); }
  try {
    clear();
    // ---------- promotions ----------
    var t = tourAt(1, 'dummy-drop'); t.deploy = [3, 4, 5]; camp.write(); camp.startMission();
    check(S.recruits.map(function (r) { return r.id; }).sort().join() === '3,4,5' && S.cm.bench.join() === '6', 'three out, the medic in the barracks');
    win();
    var by = function (id) { return t.squad.find(function (s) { return s.id === id; }); };
    check(by(3).stripes === 2 && by(3).xp === 0, 'the fourth quarter: a stripe (' + by(3).stripes + ', ' + by(3).xp + ')');
    check(by(4).stripes === 0 && by(4).xp === 2, 'a quarter more toward the next');
    check(by(5).stripes === 5 && !by(5).xp, 'five stripes is the most');
    check(by(6).xp === 2, 'nothing for the one in the barracks');
    var rows = t.last.promo.map(function (p) { return p.id + ':' + p.from + '>' + p.to + (p.promoted ? '!' : ''); }).sort().join();
    check(rows === '3:3>4!,4:1>2,5:0>0', 'the card\'s rows: ' + rows);
    var card = document.getElementById('cCardBody');
    check(card.querySelectorAll('.c-promo li').length === 3 && card.querySelectorAll('.c-promo .c-rank').length === 3 && /promoted!/.test(card.textContent), 'the card shows them, with their chevrons and "promoted!"');
    check(!card.querySelector('.c-links') && card.querySelectorAll('button').length === 1, 'and one Go');
    var back = camp.readLink(camp.linkCode(t));
    check(back.squad.map(function (s) { return s.id + ':' + (s.xp || 0); }).join() === t.squad.map(function (s) { return s.id + ':' + (s.xp || 0); }).join(), 'the save link carries the quarters');
    // Lost: nothing.
    t = tourAt(1, 'dummy-drop'); camp.startMission(); var was = by(4).xp; hurtWall(999, 'bomb');
    for (var f = 0; f < 60 * 4 && S.mode !== 'between'; f++) update(1 / 60);
    check(t.at === 'lost' && t.squad.find(function (s) { return s.id === 4; }).xp === was, 'a lost mission fills nothing');

    // ---------- Change who goes, after a lost mission ----------
    document.querySelector('#cCardBody [data-act="reprep"]').click();
    check(!document.getElementById('cPrep').hidden, 'Change who goes: prep');
    var att = t.attempt; document.getElementById('cPrepGo').click();
    check(S.mode === 'play' && t.attempt === att + 1, 'Start is the retry');

    // ---------- the operation's map ----------
    t = tourAt(0); t.m = 2; t.at = 'op'; t.results = [{ mission: 'First contact', result: 'Survived all 2 waves.' }, { mission: 'Downed pilot', result: '3 of 3 pilots safe.' }]; camp.write(); camp.screens.opMap();
    var nodes = document.querySelectorAll('#cOpBody .c-mnode');
    check(nodes.length === 3 && nodes[0].classList.contains('done') && nodes[2].classList.contains('live') && document.querySelectorAll('#cOpBody .c-badge-svg').length === 3, 'three missions with badges, two done, the third live');
    check(/3 of 3 pilots safe/.test(nodes[1].textContent) && /Keep the radio mast standing/.test(nodes[2].textContent), 'done ones say how they went; the next its goal');
    nodes[1].querySelector('[data-done]').click();
    check(!document.getElementById('cCard').hidden && /Downed pilot/.test(document.getElementById('cCardBody').textContent) && !document.getElementById('cCardBody').querySelector('#cGo, #cRetry'), 'a done one opens its result, read only');
    document.getElementById('cDoneClose').click();
    check(document.getElementById('cCard').hidden && !document.getElementById('cOp').hidden, 'Close: back to the map');

    // ---------- prep: the whole squad and a few supplies ----------
    var squad = []; for (var i = 0; i < 12; i++) squad.push({ id: 100 + i, type: camp.ROLES[i % 7], stripes: i % 3, kills: i, xp: 0 });
    t = tourAt(1, 'dummy-drop', squad); t.bank = 100; t.tree = ['sandbags']; t.seen = ['mat']; camp.write();
    camp.screens.prep();
    check(document.querySelectorAll('#cPrepBunks .c-pick').length === 12 && document.querySelectorAll('#cPrepBunks canvas').length === 12, 'all twelve, drawn as in the game');
    check(document.querySelectorAll('#cPrepBunks .c-pick[aria-pressed="true"]').length === 3, 'three ticked');
    var slips = document.querySelectorAll('#cPrepGear .c-gear');
    check(slips.length === 3 && [].every.call(slips, function (b) { return Number(b.querySelector('.c-price').textContent) <= 100; }), 'three supplies the tags can buy');
    check(document.querySelectorAll('#cPrepGear .c-new').length >= 1 && !/Bigger bounce.*new/.test(document.getElementById('cPrepGear').textContent) && /operation|until used/.test(document.getElementById('cPrepGear').textContent), 'new ones tagged (not one already seen), each saying how long it lasts');
    var id = slips[0].dataset.gear, price = Number(slips[0].querySelector('.c-price').textContent);
    slips[0].click();
    var g = camp.gearList(t).find(function (x) { return x.id === id; });
    check(t.bank === 100 - price && g.have === 1 && document.querySelector('#cPrepGear [data-gear="' + id + '"]').getAttribute('aria-pressed') === 'true', 'bought: the tags go, the gear has it');
    document.querySelector('#cPrepGear [data-gear="' + id + '"]').click();
    check(t.bank === 100 && !camp.gearList(t).find(function (x) { return x.id === id; }).have, 'tap again: put back');
    document.querySelector('#cPrepGear [data-gear="' + id + '"]').click();
    document.getElementById('cPrepGo').click();
    check(S.mode === 'play' && (S.mods.stacks[id] || S.turrets[0].mods.stacks[id] || S.calls.bomber || S.calls.fighter), 'Start: out with it');
    check(t.seen.indexOf(id) >= 0, 'and what prep showed is no longer new');

    // ---------- the shop between operations ----------
    t = tourAt(2); t.bank = 120; t.tree = ['double', 'sandbags']; t.at = 'map'; camp.write(); camp.screens.map();
    document.getElementById('cShopLink').click();
    check(!document.getElementById('cShop').hidden && document.querySelector('#cShopBody [data-buy="double"]') && document.querySelector('#cShopBody [data-buy="flag"]'), 'the whole shelf: the tree\'s steps and the operation\'s basics');
    check(!document.querySelector('#cShopBody [data-buy="repair"]') && !document.querySelector('#cShopBody [data-buy="pizza"]') && !document.querySelector('#cShopBody [data-buy="spread"]'), 'no patches or pizza (the wall starts full), nothing off the shelf');
    document.querySelector('#cShopBody [data-buy="double"]').click();
    check(t.bank === 80 && t.gear.stacks.double === 1 && document.querySelector('#cShopBody [data-buy="double"]').disabled && document.querySelector('#cShopBody [data-back="double"]'), 'bought: full, and it can go back');
    document.querySelector('#cShopBody [data-back="double"]').click();
    check(t.bank === 120 && !t.gear.stacks.double, 'put back');
    document.querySelector('#cShopBody [data-buy="strike"]').click(); document.querySelector('#cShopBody [data-buy="fighter"]').click();
    check(t.gear.calls.bomber === 1 && t.gear.calls.fighter === 1 && document.querySelector('#cShopBody [data-buy="strike"]').disabled, 'radio calls, up to the radio\'s two');
    document.getElementById('cShopDone').click();
    check(!document.getElementById('cMap').hidden && camp.gearList(t).every(function (x) { return !x.fresh; }), 'Done: the map, and nothing on the shelf is new now');
    camp.startMission();
    check(S.calls.bomber === 1 && S.calls.fighter === 1, 'the operation\'s first mission has them');

    // ---------- squad orders ----------
    t = tourAt(1, 'dummy-drop'); camp.startMission();
    check(S.cm.order === null && world.MODES.campaign.order() === null, 'no orders without the tree\'s step');
    t = tourAt(1, 'dummy-drop'); t.tree = ['helmet', 'orders']; camp.write(); camp.startMission();
    check(S.cm.order === 'general', 'with it: general orders');
    var chip = { x: 360, y: 690 };
    check(world.MODES.campaign.tap(chip) && S.cm.ordersOpen, 'a tap on the chip opens the five');
    check(world.MODES.campaign.tap(orderAt('vehicles')) && S.cm.order === 'vehicles' && !S.cm.ordersOpen && t.order === 'vehicles', 'a tap on one gives it (vehicles)');
    S.troopers = []; S.planes = []; S.bombs = []; S.tanks = [];
    var r = S.recruits.find(function (q) { return q.type !== 'engineer' && q.type !== 'medic'; });
    var lander = spawnTrooper(r.x + 20, 300, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); lander.state = 'ground'; lander.y = GROUND - 34;
    var bomber = makePlane('bomber', 1, 200, 220); bomber.speed = 0; S.planes.push(bomber);
    check(pickTarget(r) === bomber, 'vehicles: the bomber before a lander');
    world.MODES.campaign.tap(chip); world.MODES.campaign.tap(orderAt('soldiers'));
    check(S.cm.order === 'soldiers', 'soldiers');
    var high = spawnTrooper(r.x - 30, 260, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); high.open = 1;
    lander.dead = true;
    check(pickTarget(r) === high, 'soldiers: a high chute before the bomber');
    var e = new KeyboardEvent('keydown', { key: 'o' }); document.dispatchEvent(e);
    check(S.cm.order === 'capture', 'O goes round them: capture');
    var mat = activeTramps()[0], over = spawnTrooper((mat.x1 + mat.x2) / 2, 420, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); over.open = 1;
    var away = spawnTrooper(mat.x1 < 200 ? 330 : 70, 500, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); away.open = 1;
    check(world.MODES.campaign.spare(away) && world.MODES.campaign.spare(over), 'capture: no chute shot');
    over.y = 500;
    check(!world.MODES.campaign.spare(over), 'but a low one over the mat, to pop');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o' }));
    check(S.cm.order === 'general', 'and round to general');
    world.MODES.campaign.tap(chip); world.MODES.campaign.tap(orderAt('repair'));
    check(S.cm.order === 'repair', 'repair');
    S.wallHP = S.mods.maxHP * 0.9; S.troopers = []; S.planes = []; update(1 / 60);
    check(S.recruits.filter(function (q) { return !q.dead && q.type !== 'medic'; }).every(function (q) { return q.role === 'repair'; }), 'repair: everyone at the wall');
    RUN.force = 5; newGame(); RUN.force = null;
    check(!world.rules().order && !world.rules().tap, 'Arcade has no orders');

    // ---------- the pause card's save link ----------
    t = tourAt(1, 'dummy-drop'); camp.startMission(); togglePause();
    check(!document.getElementById('pauseLink').hidden, 'Campaign\'s pause card offers Copy save link');
    togglePause(); RUN.force = 5; newGame(); RUN.force = null; togglePause();
    check(document.getElementById('pauseLink').hidden, 'Arcade\'s doesn\'t');
    togglePause();
  } finally {
    clear(); RUN.game = 'arcade'; titleScene();
  }
  return 'ok';
})();
