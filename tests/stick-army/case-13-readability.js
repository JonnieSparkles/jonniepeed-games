// Round 4 readability: squad health in the HUD row, the sentry tower, and the page wiped between waves.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }

  // The squad row shows health: a healthy figure stands straight, wounded ones lean, badly hurt ones lean further and fade.
  function figure(hp) {
    newGame(); var r = makeRecruit(0, 'rifle'); r.hp = hp * crewMax(r); S.recruits = [r];
    var turns = [], realRotate = ctx.rotate;
    ctx.rotate = function (a) { turns.push(a); return realRotate.call(ctx, a); };
    G = ctx; ctx.save();
    try { miniFig(122, 677, r, 0); }
    finally { ctx.restore(); ctx.rotate = realRotate; }
    return { lean: turns.reduce(function (m, a) { return Math.max(m, a); }, 0) };
  }
  var well = figure(1), hurt = figure(0.5), bad = figure(0.2);
  check(well.lean === 0, 'a healthy figure stands straight');
  check(hurt.lean > 0 && bad.lean > hurt.lean, 'wounded figures slouch, badly hurt ones more');

  // The sentry stands on a tower beside the bunker and covers the bunker: bombs before troopers.
  newGame(); ITEMS.find(function (it) { return it.id === 'auto'; }).apply(S);
  check(SENTRY.x - 8 > BK.x2 && Math.hypot(SENTRY.x - 8 - TUR.x, 0) > 32, 'the tower stands clear of the main barrel');
  spawnTrooper(120, GROUND - 33); land(S.troopers[0]);
  var bomb = { id: 777, x: 260, y: 420, vx: 0, vy: 120, isBomb: true, dead: false }; S.bombs = [bomb];
  check(sentryTarget() === bomb, 'bombs come first');
  S.bombs = []; check(sentryTarget() === S.troopers[0], 'then troopers on the ground');
  S.autoCD = 0; updateAutoTurret(1 / 60);
  var shot = S.bullets[0];
  check(shot && shot.owner === 'ally' && Math.hypot(shot.x - SENTRY.x, shot.y - SENTRY.y) < 16, 'it fires from the tower top');
  var fired = 0; S.bullets = [];
  for (var i = 0; i < 300; i++) { var n = S.bullets.length; updateAutoTurret(1 / 60); fired += S.bullets.length - n; }
  check(fired >= 6, 'it fires several times every five seconds');
  render();

  // Opening the shop fades old ink and drops the faintest marks.
  newGame(); startWave(1);
  addDecal({ kind: 'splat', x: 100, y: GROUND, r: 3, color: RED, a: 0.45, seed: 1 });
  addDecal({ kind: 'splat', x: 140, y: GROUND, r: 3, color: RED, a: 0.1, seed: 2 });
  openShop();
  check(decals.length === 1 && Math.abs(decals[0].a - 0.45 * 0.45) < 1e-9, 'the shop wipes the page between waves');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;

  // Canvas resolution follows the screen's pixel ratio and steps down only when frames run slow during play.
  var realRatio = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
  Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
  try {
    renderCap = 2; fit(); var sharp = cv.width;
    newGame(); S.mode = 'play';
    for (var f = 0; f < 120; f++) noteFrame(16);
    check(renderCap === 2 && cv.width === sharp, 'smooth frames keep the sharp canvas');
    for (f = 0; f < 60; f++) noteFrame(40);
    check(renderCap === 1.5 && cv.width < sharp, 'slow frames step the resolution down');
    for (f = 0; f < 120; f++) noteFrame(16);
    check(renderCap === 1.5, 'and it never steps back up');
    S.mode = 'shop'; for (f = 0; f < 120; f++) noteFrame(40);
    check(renderCap === 1.5, 'only play counts');
  } finally {
    if (realRatio) Object.defineProperty(window, 'devicePixelRatio', realRatio); else delete window.devicePixelRatio;
    renderCap = 2.5; fit();
  }
  S.mode = 'play';

  // The march plays through the ambience bus at every tier without errors, and stops between waves.
  sound.init();
  [1, 5, 12].forEach(function (n) { sound.ambience({ active: true, planes: [{ x: 200, dir: 1, kind: 'zeppelin' }], wave: true, number: n, wallLow: n === 12 }); });
  sound.ambience({ active: false, planes: [], wave: false, number: 12, wallLow: true });

  reset(); render();
})();
