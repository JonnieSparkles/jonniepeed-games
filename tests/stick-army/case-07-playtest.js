// Playtest round 1: crush, barrel dip, overheat and shot cost, midair ink, crew colour, shop icons.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function settle(t, steps) { for (var i = 0; i < (steps || 400) && !t.dead && t.state !== 'bounce'; i++) updateTroopers(1 / 120); }

  // A popped trooper squashes an enemy standing where he lands.
  newGame();
  // Landers at the wall stand still, so the fall lines up with them.
  spawnTrooper(150, 300); var lander = S.troopers[0]; land(lander); lander.x = BK.x1 - 7;
  spawnTrooper(BK.x1 - 5, 380); var faller = S.troopers[1]; faller.x = BK.x1 - 5; faller.open = 1; popChute(faller);
  var kills = S.stats.kills; settle(faller);
  check(faller.dead && lander.dead, 'falling trooper squashes the lander below');
  check(S.stats.kills === kills + 2, 'both count as kills');
  spawnTrooper(150, 300); var safe = S.troopers[S.troopers.length - 1]; land(safe); safe.x = BK.x1 - 7;
  spawnTrooper(BK.x1 - 40, 380); var miss = S.troopers[S.troopers.length - 1]; miss.x = BK.x1 - 40; miss.open = 1; popChute(miss); settle(miss);
  check(!safe.dead, 'a fall well to the side squashes nobody');

  // The barrel tips just below horizontal, enough to clear the wall.
  aimAt({ x: 300, y: 640 }); check(Math.abs(S.aim - AIM_MAX) < 1e-9 && S.aim > 0, 'below right clamps to the dip limit');
  aimAt({ x: 100, y: 640 }); check(Math.abs(S.aim - AIM_MIN) < 1e-9 && S.aim < -Math.PI, 'below left clamps to the dip limit');
  aimAt({ x: 100, y: 400 }); check(S.aim > -Math.PI && S.aim < -Math.PI / 2, 'upper left unchanged');

  // A lander at the wall can be shot when the crew is empty.
  newGame(); S.recruits = [];
  spawnTrooper(250, 300); var atWall = S.troopers[0]; land(atWall); atWall.x = BK.x2 + 7; atWall.atWall = true;
  S.aim = AIM_MAX; fireVolley();
  for (var i = 0; i < 60 && !atWall.dead; i++) updateBullets(1 / 60);
  check(atWall.dead, 'a dipped shot kills a lander at the wall');

  // Each volley costs a point, heats the gun, and enough of them lock it.
  newGame(); S.score = 100; fireVolley();
  check(S.score === 100 - BALANCE.SHOT_COST && S.heat > 0, 'a volley costs a point and adds heat');
  S.score = 0; fireVolley(); check(S.score === 0, 'score never goes negative');
  newGame(); keys.fire = true; var locked = false, shotsWhileLocked = 0;
  for (var j = 0; j < 60 * 6; j++) {
    var before = S.volleys, wasLocked = S.overheat > 0; update(1 / 60);
    if (S.overheat > 0) locked = true;
    // The trigger frame and the unlock frame may fire; nothing in between.
    if (wasLocked && S.overheat > 0 && S.volleys > before) shotsWhileLocked++;
  }
  keys.fire = false;
  check(locked, 'holding fire overheats the gun');
  check(shotsWhileLocked === 0, 'no shots while locked');
  for (var k = 0; k < 60 * 3; k++) update(1 / 60);
  check(S.overheat === 0 && S.heat < 0.35, 'the gun cools and unlocks');
  newGame(); fireVolley(); var plain = S.heat;
  newGame(); S.mods.cool = 2; fireVolley();
  check(Math.abs(S.heat - plain * 0.64) < 1e-9, 'cooling fins cut heat per shot');
  newGame(); S.mods.fire = 4; fireVolley();
  check(Math.abs(S.heat / BALANCE.HEAT_PER_SHOT - Math.pow(0.82, 4)) < 1e-9, 'fire-rate upgrades keep heat per second the same');

  // Midair kills leave no permanent ink; ground kills still do. Crew pieces are blue.
  newGame(); spawnTrooper(80, 280); killTrooper(S.troopers[0], 'player');
  check(!decals.some(function (d) { return d.kind === 'splat' && d.y < GROUND - 40; }), 'no sky decal from a midair kill');
  check(S.parts.some(function (q) { return q.k === 'spatter'; }), 'midair kill spatters');
  for (var m = 0; m < 300; m++) updateParts(1 / 120);
  check(!S.parts.some(function (q) { return q.k === 'spatter'; }), 'spatter fades within a few seconds');
  newGame(); spawnTrooper(100, 300); var g = S.troopers[0]; land(g); killTrooper(g, 'player');
  check(decals.some(function (d) { return d.kind === 'splat' && d.y > GROUND - 40; }), 'ground kill keeps its ink');
  var crew = makeRecruit(0, 'rifle'); S.recruits.push(crew); recruitDie(crew);
  check(S.parts.filter(function (q) { return q.k === 'body' && q.c === BLUE; }).length === 6, 'fallen recruits break apart in blue');

  // Every supply has an icon that draws something.
  ITEMS.forEach(function (it) {
    var c = document.createElement('canvas'); c.width = c.height = 44; drawItemIcon(c, it.id);
    var px = c.getContext('2d').getImageData(0, 0, 44, 44).data, ink = 0;
    for (var n = 3; n < px.length; n += 4) if (px[n] > 0) ink++;
    check(ICONS[it.id] && ink > 30, 'icon for ' + it.id);
  });
  check(G === ctx, 'icon drawing restores the battlefield pen');

  reset(); render();
})();
