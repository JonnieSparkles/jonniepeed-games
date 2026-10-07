// SPEC-005: seeded content streams, #seed, effects isolation and the event hook.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var i, savedR = R;
  // The case-06 aiming bot: plays real combat through player inputs only.
  function aimBot() {
    var target = S.troopers.filter(function (t) { return !t.dead && (t.state === 'chute' || t.state === 'free'); }).sort(function (a, b) { return b.y - a.y; })[0];
    var plane = S.planes.find(function (p) { return p.state === 'fly' && p.x > 20 && p.x < 380; });
    if (target) aimAt({ x: target.x, y: target.y + 12 + (target.state === 'chute' ? target.fall : target.vy) * Math.hypot(target.x - TUR.x, target.y - TUR.y) / 700 });
    else if (plane) aimAt({ x: plane.x + (plane.face || plane.dir) * plane.speed * Math.hypot(plane.x - TUR.x, plane.y - TUR.y) / 700, y: plane.y });
    keys.fire = !!(target || plane);
  }
  function listen(types) {
    var log = [];
    emitHook = function (type, data) { if (types.indexOf(type) >= 0) log.push(type + ' ' + JSON.stringify(data)); };
    return log;
  }
  // Wave content for wave n: every aircraft that spawns, with its drops and troopers.
  function waveContent(n) {
    var log = listen(['plane_spawn']);
    S.mode = 'play'; S.shop = null; shopScreen.hidden = true; S.mods.maxHP = S.wallHP = 1e6;
    startWave(n);
    for (var k = 0; k < 7200 && S.spawn.planes + S.spawn.bombers + S.spawn.boss > 0; k++) update(1 / 60);
    emitHook = null; clearInput();
    return log;
  }

  // Wave 3 is the same for a seed however the earlier waves went.
  RUN.force = 42; newGame();
  var fresh = waveContent(3);
  RUN.force = 42; newGame(); S.mods.maxHP = S.wallHP = 1e6;
  for (i = 0; i < 2400; i++) { aimBot(); update(1 / 60); }
  S.recruits = [makeRecruit(0, 'rifle'), makeRecruit(4, 'bazooka')]; S.mods.fire = 2; S.mods.helmet = 1;
  var played = waveContent(3);
  check(fresh.length > 5 && JSON.stringify(fresh) === JSON.stringify(played), 'wave 3 content matches after different play');
  RUN.force = 43; newGame();
  check(JSON.stringify(waveContent(3)) !== JSON.stringify(fresh), 'another seed brings other content');

  // Shop offers come from their own stream: combat during the wave doesn't move them.
  function offers(fight) {
    RUN.force = 9; newGame(); startWave(2); S.mods.maxHP = S.wallHP = 1e6;
    var log = listen(['shop_offer']);
    for (var k = 0; k < (fight ? 1800 : 0); k++) { aimBot(); update(1 / 60); }
    clearInput(); if (S.mode === 'play') openShop(); emitHook = null; // a won fight opens the shop itself
    var out = log[0]; S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
    return out;
  }
  check(offers(false) === offers(true), 'same seed, same shop offers');

  // Without a forced seed, runs vary. #seed= works, alone or with other tokens.
  RUN.force = null; newGame(); var a = RUN.seed; newGame();
  check(RUN.seed !== a, 'runs vary without a seed');
  location.hash = 'seed=42'; newGame();
  check(RUN.seed === 42, '#seed=42 fixes the run seed');
  location.hash = 'tune&seed=7';
  check(hashSeed() === 7 && hashTokens().indexOf('tune') >= 0, 'tokens combine with #tune');
  history.replaceState(null, '', location.pathname); newGame();

  // Cosmetic randomness and drawing never change outcomes.
  function outcome(effectsSeed, draw) {
    RUN.force = 77; newGame(); R = mulberry(effectsSeed);
    for (var k = 0; k < 3600 && S.mode === 'play'; k++) { aimBot(); update(1 / 60); if (draw) render(); }
    clearInput(); R = savedR;
    return JSON.stringify([S.score, S.coins, S.wallHP, S.stats, S.troopers.map(function (t) { return [t.type, Math.round(t.x * 100), Math.round(t.y * 100)]; }), S.wave, S.mode]);
  }
  var base = outcome(1, false);
  check(base === outcome(2, false), 'effects randomness does not change outcomes');
  check(base === outcome(3, true), 'drawing does not change outcomes');
  check(base === outcome(1, false), 'a seeded run repeats exactly');

  // The event hook sees the key moments.
  var seen = {};
  emitHook = function (type) { seen[type] = (seen[type] || 0) + 1; };
  RUN.force = 23; newGame();
  for (i = 0; i < 18000 && S.mode === 'play'; i++) { aimBot(); update(1 / 60); }
  emitHook = null; clearInput();
  ['wave_start', 'plane_spawn', 'trooper_spawn', 'kill', 'coins', 'wave_clear', 'shop_offer'].forEach(function (type) { check(seen[type] > 0, 'event ' + type); });
  var popped = listen(['chute_pop']); spawnTrooper(57, 400); popChute(S.troopers[S.troopers.length - 1]); emitHook = null;
  check(popped.length === 1 && JSON.parse(popped[0].slice(10)).overMat, 'chute_pop knows when it was over a mat');

  RUN.force = null; S.mode = 'play'; S.shop = null; shopScreen.hidden = true; reset(); render();
})();
