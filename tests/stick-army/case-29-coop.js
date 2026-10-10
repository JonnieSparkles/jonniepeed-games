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

    // The shop: turret upgrades per barrel, common items once, Ready from both.
    RUN.players = 2; RUN.force = 33; newGame(); S.coins = 999;
    var spread = ITEMS.find(function (it) { return it.id === 'spread'; }), sand = ITEMS.find(function (it) { return it.id === 'sandbags'; });
    openShop(); S.shop.items = [spread, sand]; S.shop.gift = null;
    check(SHOP.takeItem('spread', 0) && S.turrets[0].mods.spread && !S.turrets[1].mods.spread && !S.mods.spread, 'the host buys spread for the host barrel');
    check(SHOP.takeItem('spread', 1) && S.turrets[1].mods.spread, 'and the guest can buy it too, for the guest barrel');
    check(!SHOP.takeItem('spread', 1), 'once per barrel a visit');
    check(SHOP.takeItem('sandbags', 1) && !SHOP.takeItem('sandbags', 0), 'a common supply is bought once, for the team');
    me = 0; renderShop();
    var sandBtn = document.querySelector('[data-item="sandbags"] em').textContent;
    check(/comrade/.test(sandBtn), 'the other player sees it chosen by the comrade: ' + sandBtn);
    var coins = S.coins;
    check(SHOP.putBack('spread', 1) && !S.turrets[1].mods.spread && S.turrets[0].mods.spread && S.coins > coins, 'putting back the guest spread leaves the host one');
    check(SHOP.putBack('sandbags', 0) && S.mods.maxHP === 100, 'either player can put a common thing back');
    check(SHOP.undo(0) && !S.turrets[0].mods.spread, 'undo takes back this player\'s last pick');
    // Ready with no friend connected: the host goes on alone (waiting for both is in coop_room.py).
    COOP.startHost(null);
    check(COOP.ready() && S.mode === 'play', 'a host whose friend is away doesn\'t wait at the supply table');
  } finally { if (COOP.host) COOP.stopHost(); RUN.players = players; RUN.force = null; me = 0; newGame(); }
  return 'ok';
})();
