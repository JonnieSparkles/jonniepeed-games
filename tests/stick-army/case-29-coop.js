// Co-op, stage 1 (docs/games/stick-army/coop.md): solo keeps one barrel reading S.mods; a co-op run has two barrels on
// the one turret, each with its own aim, heat, lock, volleys and upgrades, and every round says whose barrel fired it.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  var players = RUN.players;
  try {
    RUN.force = 29; newGame();
    check(S.turrets.length === 1 && S.turrets[0].x === TUR.x && !S.turrets[0].mods, 'solo: one barrel at the middle, on S.mods');
    S.mods.spread = true; S.bullets = []; fireVolley();
    check(S.bullets.length === 3 && S.bullets.every(function (b) { return b.gun === 0; }), 'solo spread comes from S.mods, rounds marked as player 0');

    RUN.players = 2; RUN.force = 29; newGame();
    var a = S.turrets[0], b = S.turrets[1];
    check(S.turrets.length === 2 && a.x < TUR.x && b.x > TUR.x && a.gun === 0 && b.gun === 1, 'co-op: two barrels side by side');
    check(a.mods && b.mods && a.mods !== b.mods, 'each barrel has its own upgrades');
    // Each player's own upgrades.
    a.mods.spread = true; S.mods.spread = false; S.bullets = [];
    fireVolley(a); fireVolley(b);
    check(S.bullets.filter(function (q) { return q.gun === 0; }).length === 3 && S.bullets.filter(function (q) { return q.gun === 1; }).length === 1, 'spread on the host barrel only');
    var ha = a.heat, hb = b.heat;
    check(ha > 0 && Math.abs(ha - hb) < 1e-9, 'each volley heats its own barrel');
    b.mods.cool = 3; b.heat = 0; fireVolley(b);
    check(b.heat < ha, 'cooling fins on the guest barrel only');
    // One player's spraying doesn't lock the other out.
    a.heat = 0.99; a.fireCD = 0; fireVolley(a);
    check(a.overheat > 0 && b.overheat === 0, 'one barrel overheats alone');
    b.heat = 0; b.fireCD = 0; b.firing = true; S.bullets = [];
    run(0.1);
    check(S.bullets.some(function (q) { return q.gun === 1; }) && !S.bullets.some(function (q) { return q.gun === 0; }), 'the other barrel keeps firing');
    b.firing = false;
    // The local keys drive only this device's barrel.
    a.aim = b.aim = -Math.PI / 2; keys.left = true; run(0.2); keys.left = false;
    check(a.aim < -Math.PI / 2 && b.aim === -Math.PI / 2, 'keys turn only the local barrel');
    aimAt({ x: 380, y: 400 });
    check(a.aim > -Math.PI / 2 && b.aim === -Math.PI / 2, 'the pointer aims only the local barrel');
    // Rockets count each barrel's own volleys.
    a.mods.rockets = true; a.volleys = 3; b.volleys = 0; S.bullets = []; a.overheat = 0; a.heat = 0;
    fireVolley(a);
    check(S.bullets.some(function (q) { return q.kind === 'rocket' && q.gun === 0; }), 'a rocket on the host barrel\'s fourth volley');
    // A sniper's hit heats both.
    a.heat = b.heat = 0; a.overheat = b.overheat = 0; sniperHitsTurret();
    check(a.heat > 0 && b.heat > 0, 'a sniper hit knocks both barrels');
    // Drawing both barrels, rings and the night's searchlights doesn't throw.
    S.night = 1; render(); S.night = 0;
    // Dying lets go of both triggers.
    a.firing = b.firing = true; S.wallHP = 0; run(0.05);
    check(!a.firing && !b.firing, 'both triggers let go at the end');

    // Scores: each barrel's own points and combo; the team score has everything.
    RUN.players = 2; RUN.force = 31; newGame();
    check(S.players && S.players.length === 2 && S.players[0].score === 0, 'a co-op run keeps each player\'s tally');
    var p0 = S.players[0], p1 = S.players[1], team = S.score;
    gunner = 1; award(10, 200, 300, 'ouch!', INK, true); award(10, 200, 300, 'ouch!', INK, true); gunner = null;
    check(p1.score === 10 + 20 && p1.combo === 2 && p0.score === 0 && S.combo === 0 && S.score === team + 30, 'the guest\'s hits build the guest\'s own combo and score');
    award(50, 200, 300, 'wave!', BLUE, false);
    check(p0.score === 0 && p1.score === 30 && S.score === team + 80, 'points nobody fired for go to the team only');
    gunner = 0; emit('plane_down', { kind: 'plane', by: 'player' }); emit('redcross_hit', { lost: 5, pts: 0 }); gunner = null;
    check(p0.planes === 1 && p0.redCross === 1 && p1.planes === 0, 'planes and Red Cross hits are counted for the shooter');
    // A catch belongs to whoever popped the chute.
    var tr = { id: 9999, x: SLOTS[0], y: 400, type: 'rifle', state: 'chute', fall: 60, open: 1 };
    gunner = 1; popChute(tr); gunner = null;
    tr.slot = freeSlot(0); S.slotRes[tr.slot] = true; becomeRecruit(tr);
    check(p1.captured === 1 && p0.captured === 0, 'a catch is the popper\'s');
    // Shots cost the shooter's points too.
    p1.score = 5; S.turrets[1].heat = 0; S.turrets[1].fireCD = 0; fireVolley(S.turrets[1]);
    check(p1.score === 5 - BALANCE.SHOT_COST, 'a volley costs its barrel\'s player a point');
    var report = runReport().stats;
    check(report.coop === true && report.guest_score === p1.score && report.host_planes === 1 && Object.keys(report).length <= 24, 'play stats mark the run co-op with both players');
    // Harder: more planes and bombers, a tougher Dreadnought.
    var co = waveCfg(12), dreadCo = lv().DREAD;
    RUN.players = 1; RUN.force = 31; newGame();
    var so = waveCfg(12);
    check(co.planes === Math.round(so.planes * coopMore(12)) && co.bombers === Math.round(so.bombers * coopMore(12)) && coopMore(1) < coopMore(12) && dreadCo === lv().DREAD * COOP_HARD.DREAD, 'co-op waves are harder, more so later');

    // Co-op runs leave this device's records alone (best score, best wave, wins).
    var K = LEVELS.soldier.KEYS, rec = function () { return [load(K.best, 0), load(K.wave, 0), load(K.wins, 0)].join(); }, before = rec(), bestWas = best;
    level = 'soldier'; RUN.players = 2; RUN.force = 35; newGame();
    S.score = 9e8; S.wave = 99; showOver();
    check(rec() === before && best === bestWas && document.getElementById('newBest').hidden, 'a co-op game over writes no record');
    newGame(); S.score = 9e8; S.wave = 20; showWin();
    check(rec() === before && /together/.test(document.getElementById('winCount').textContent), 'a co-op win isn\'t counted, and says so');
    winScreen.hidden = true; overScreen.hidden = true;

    // Dog tags: each player's own. A barrel's kill pays its player; tags nobody fired for are split, odd ones in turn.
    RUN.players = 2; RUN.force = 32; newGame();
    var P = S.players;
    check(S.coins === 0 && P[0].tags === 0 && P[1].tags === 0, 'a co-op run starts both wallets empty');
    gunner = 1; award(30, 200, 300, 'ouch!', INK, false); gunner = null;
    check(P[1].tags === 2 && P[0].tags === 0, 'the guest\'s kill pays the guest');
    award(30, 200, 300, 'wave!', BLUE, false); award(15, 200, 300, 'wave!', BLUE, false);
    // 2 tags split 1 and 1; then 1 tag, the odd one, to the host first.
    check(P[0].tags === 2 && P[1].tags === 3, 'tags nobody fired for are split, odd ones in turn: ' + P[0].tags + ' / ' + P[1].tags);
    P[0].tags = 10; P[1].tags = 40;
    gunner = 1; check(takeTags(25) === 25 && P[1].tags === 15 && P[0].tags === 10, 'a Red Cross hit costs the shooter\'s tags'); gunner = null;
    me = 1; render(); me = 0;   // the HUD shows this device's own tags (drawn without error)
    check(runReport().stats.tags === 25, 'play stats count both wallets');

    // The shop: each player's own tags and free pick; "Your gun" per barrel, squad things bought once by either.
    RUN.players = 2; RUN.force = 33; newGame(); S.players[0].tags = 200; S.players[1].tags = 200;
    var spread = ITEMS.find(function (it) { return it.id === 'spread'; }), sand = ITEMS.find(function (it) { return it.id === 'sandbags'; }), fire = ITEMS.find(function (it) { return it.id === 'fire'; });
    openShop(); S.shop.items = [spread, sand, fire]; S.shop.offered = ['spread', 'sandbags', 'fire'];
    check(SHOP.takeItem('spread', 0) && S.turrets[0].mods.spread && !S.turrets[1].mods.spread && !S.mods.spread && S.players[0].tags === 200, 'the host\'s first supply is free, spread for the host barrel');
    check(SHOP.takeItem('spread', 1) && S.turrets[1].mods.spread && S.players[1].tags === 200, 'and the guest gets a free pick of their own');
    check(!SHOP.takeItem('spread', 1), 'once per barrel a visit');
    var before0 = S.players[0].tags;
    check(SHOP.price(sand) === Math.max(5, Math.round(Math.max(5, Math.round(sand.cost * SHOP.war(SHOP.WAR.SUPPLY) / 5) * 5) * COOP_HARD.SQUAD_PRICE / 5) * 5) && SHOP.price(fire) === Math.max(5, Math.round(fire.cost * SHOP.war(SHOP.WAR.SUPPLY) / 5) * 5) && SHOP.price(ITEMS.find(function (it) { return it.id === 'pizza'; })) === 25,
      'squad things cost more in co-op; your gun and the pizza don\'t');
    check(SHOP.takeItem('sandbags', 1) && S.players[1].tags === 200 - SHOP.price(sand) && S.players[0].tags === before0 && !SHOP.takeItem('sandbags', 0), 'a squad supply is paid by its buyer and bought once');
    me = 0; renderShop();
    var sandBtn = document.querySelector('[data-item="sandbags"]');
    check(/Bought by your friend/.test(sandBtn.textContent) && sandBtn.disabled, 'the other player sees it bought by the friend: ' + sandBtn.querySelector('em').textContent);
    check(!document.getElementById('gunSection').hidden && document.querySelector('#gunSection [data-item="spread"]') && document.querySelector('#gunSection [data-item="fire"]') && !document.querySelector('#gunSection [data-item="sandbags"]'), '"Your gun" lists the turret upgrades');
    check(/your own/.test(document.getElementById('shopHint').textContent) && /\(yours\)/.test(document.getElementById('shopCoins').textContent), 'the shop says the tags are yours');
    check(!SHOP.putBack('sandbags', 0) && S.mods.maxHP > 100, 'only the buyer puts a thing back');
    check(SHOP.putBack('sandbags', 1) && S.mods.maxHP === 100 && S.players[1].tags === 200, 'and gets the tags back');
    check(SHOP.putBack('spread', 1) && !S.turrets[1].mods.spread && S.turrets[0].mods.spread && S.players[1].tags === 200, 'putting back the guest spread leaves the host one');
    check(SHOP.takeItem('fire', 1) && S.players[1].tags === 200 && S.turrets[1].mods.fire === 1, 'the guest\'s free pick is back after the put-back');
    check(SHOP.undo(0) && !S.turrets[0].mods.spread, 'undo takes back this player\'s last pick');
    check(!!document.getElementById('coopReady') && /Pick one free/.test(getComputedStyle(document.querySelector('.deal.gift.pick'), '::before').content), 'co-op: the friend\'s Ready line, and "Pick one free"');
    // Solo's shop is as it was: one free pick, one wallet, no "Your gun".
    RUN.players = 1; RUN.force = 33; newGame(); S.coins = 200; openShop(); renderShop();
    check(document.getElementById('gunSection').hidden && document.getElementById('supplyTitle').textContent === 'Supplies' && !/yours/.test(document.getElementById('shopCoins').textContent) && !document.getElementById('coopReady') && !/Pick one|Ready for/.test(document.getElementById('shopScreen').textContent), 'solo\'s shop looks as before');
    RUN.players = 2; RUN.force = 33; newGame(); openShop();
    // Ready with no friend connected: the host goes on alone (waiting for both is in coop_room.py).
    COOP.startHost(null);
    check(COOP.ready() && S.mode === 'play', 'a host whose friend is away doesn\'t wait at the supply table');
  } finally { if (COOP.host) COOP.stopHost(); RUN.players = players; RUN.force = null; me = 0; newGame(); }
  return 'ok';
})();
