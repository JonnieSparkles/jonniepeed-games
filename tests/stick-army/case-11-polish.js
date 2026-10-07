// Polish: game-over cause and zeppelin count, kit on the pause card, sniper callout.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function over(cause, zeppelins) {
    newGame(); S.stats.zeppelins = zeppelins || 0;
    if (cause) hurtWall(S.wallHP + 1, cause); else S.wallHP = 0;
    update(1 / 60);
    for (var i = 0; i < 120 && S.mode !== 'over'; i++) update(1 / 60);
    check(S.mode === 'over', 'reaches game over');
  }
  var line = document.getElementById('overCause'), zeps = document.getElementById('stZeps');
  over('bomb');
  check(!line.hidden && /bomb/.test(line.textContent), 'names a bomb as the cause');
  check(zeps.hidden && document.getElementById('stZepsLabel').hidden, 'no zeppelin line before any are downed');
  over('lander', 2);
  check(/Troopers/.test(line.textContent) && !zeps.hidden && zeps.textContent === '2', 'names landers and counts zeppelins');
  over('sniper');
  check(/Sniper/.test(line.textContent), 'names snipers');
  over(null);
  check(line.hidden, 'no cause line when nothing is known');
  overScreen.hidden = true;

  // Zeppelins downed are counted.
  newGame(); S.wave = 5; var z = spawnZeppelin(); z.x = 200; z.hp = 1; damagePlane(z, 1, 'player', 200, z.y);
  check(S.stats.zeppelins === 1, 'zeppelin counted');

  // The pause card lists the kit, and hides the line for a fresh run.
  newGame(); togglePause();
  check(document.getElementById('pauseKit').hidden, 'no kit line on a fresh run');
  togglePause(); S.mods.stacks.double = 1; S.mods.stacks.cool = 2; S.mods.stacks.repair = 3; togglePause();
  var kit = document.getElementById('pauseKit').textContent;
  check(/Double barrel/.test(kit) && /Cooling fins ×2/.test(kit) && !/Patch/.test(kit), 'pause shows owned upgrades, not repeat buys');
  togglePause();

  // The shop warns before a boss wave.
  newGame(); S.wave = 4; openShop();
  check(/zeppelin/.test(document.getElementById('shopHint').textContent), 'shop warns before the zeppelin wave');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
  newGame(); S.wave = 5; openShop();
  check(!/zeppelin/.test(document.getElementById('shopHint').textContent), 'no warning before an ordinary wave');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;

  // Snipers are called out when they land.
  newGame(); spawnTrooper(18, GROUND - 40); var sn = S.troopers[0]; sn.type = 'sniper'; land(sn);
  check(S.texts.some(function (q) { return q.s === 'sniper!'; }), 'sniper callout');

  reset(); render();
})();
