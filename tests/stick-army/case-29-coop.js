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
    check(S.bullets.length === 3 && S.bullets.every(function (b) { return b.by === 0; }), 'solo spread comes from S.mods, rounds marked as player 0');

    RUN.players = 2; RUN.force = 29; newGame();
    var a = S.turrets[0], b = S.turrets[1];
    check(S.turrets.length === 2 && a.x < TUR.x && b.x > TUR.x && a.by === 0 && b.by === 1, 'co-op: two barrels side by side');
    check(a.mods && b.mods && a.mods !== b.mods, 'each barrel has its own upgrades');
    // Each player's own upgrades.
    a.mods.spread = true; S.mods.spread = false; S.bullets = [];
    fireVolley(a); fireVolley(b);
    check(S.bullets.filter(function (q) { return q.by === 0; }).length === 3 && S.bullets.filter(function (q) { return q.by === 1; }).length === 1, 'spread on the host barrel only');
    var ha = a.heat, hb = b.heat;
    check(ha > 0 && Math.abs(ha - hb) < 1e-9, 'each volley heats its own barrel');
    b.mods.cool = 3; b.heat = 0; fireVolley(b);
    check(b.heat < ha, 'cooling fins on the guest barrel only');
    // One player's spraying doesn't lock the other out.
    a.heat = 0.99; a.fireCD = 0; fireVolley(a);
    check(a.overheat > 0 && b.overheat === 0, 'one barrel overheats alone');
    b.heat = 0; b.fireCD = 0; b.firing = true; S.bullets = [];
    run(0.1);
    check(S.bullets.some(function (q) { return q.by === 1; }) && !S.bullets.some(function (q) { return q.by === 0; }), 'the other barrel keeps firing');
    b.firing = false;
    // The local keys drive only this device's barrel.
    a.aim = b.aim = -Math.PI / 2; keys.left = true; run(0.2); keys.left = false;
    check(a.aim < -Math.PI / 2 && b.aim === -Math.PI / 2, 'keys turn only the local barrel');
    aimAt({ x: 380, y: 400 });
    check(a.aim > -Math.PI / 2 && b.aim === -Math.PI / 2, 'the pointer aims only the local barrel');
    // Rockets count each barrel's own volleys.
    a.mods.rockets = true; a.volleys = 3; b.volleys = 0; S.bullets = []; a.overheat = 0; a.heat = 0;
    fireVolley(a);
    check(S.bullets.some(function (q) { return q.kind === 'rocket' && q.by === 0; }), 'a rocket on the host barrel\'s fourth volley');
    // A sniper's hit heats both.
    a.heat = b.heat = 0; a.overheat = b.overheat = 0; sniperHitsTurret();
    check(a.heat > 0 && b.heat > 0, 'a sniper hit knocks both barrels');
    // Drawing both barrels, rings and the night's searchlights doesn't throw.
    S.night = 1; render(); S.night = 0;
    // Dying lets go of both triggers.
    a.firing = b.firing = true; S.wallHP = 0; run(0.05);
    check(!a.firing && !b.firing, 'both triggers let go at the end');
  } finally { RUN.players = players; RUN.force = null; newGame(); }
  return 'ok';
})();
