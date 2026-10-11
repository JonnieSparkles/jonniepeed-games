// Round 19: tanks that drive in fast off the page and take the emptier side, cargo planes early in the wave, HQ's
// supply plane your turret can hit (and its safe-delivery bonus and card line), and Veteran's kit and two offers.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  function quiet(n) {
    newGame(); startWave(n); S.mods.maxHP = S.wallHP = 1e6; S.banner = null;
    var sp = S.spawn; sp.timer = sp.rushT = sp.cargoT = sp.roadT = sp.bossT = 99;
    var k = sp.sky; k.medevacT = k.balloonT = k.crateT = k.diverT = k.heliT = k.heavyT = 99;
    S.recruits = []; S.mods.auto = false; S.texts = [];
  }
  function playerShot(x, y) { return { x: x, y: y, vx: 0, vy: -1, owner: 'player', kind: 'bullet', life: 1, dead: false, hits: [] }; }

  // Tanks: off the page they drive in ROLL_IN times as fast, then at their own pace.
  RUN.force = 7; quiet(17); RUN.force = null;
  spawnRoadTank();
  var tk = S.tanks[0], x0 = tk.x; run(1);
  var offPace = Math.abs(tk.x - x0);
  check(Math.abs(offPace - TANK.SPEED * TANK.ROLL_IN) < 2, 'off the page a tank drives in fast');
  for (var i = 0; i < 600 && (tk.x < TANK.HW || tk.x > W - TANK.HW); i++) update(1 / 60);
  x0 = tk.x; run(1);
  check(Math.abs(Math.abs(tk.x - x0) - TANK.SPEED) < 2, 'on the page, its own pace');
  // Road tanks take the side with fewer coming.
  var fromLeft = function () { return S.tanks.filter(function (t) { return t.dir > 0; }).length; };
  var before = fromLeft(), fromRight = S.tanks.length - before;
  spawnRoadTank();
  check(before < fromRight ? fromLeft() > before : before > fromRight ? fromLeft() === before : true, 'the next pair comes from the emptier side');
  // Cargo planes: the first early, the rest close behind.
  check(CARGO.FIRST <= 5 && CARGO.GAP[1] <= 9 && S.spawn && S.spawn.cfg, 'cargo planes come early in the wave');

  // HQ's supply plane: across untouched pays SAFE points a wave; your turret's round brings it down, crate and all.
  RUN.force = 65; quiet(10); RUN.force = null;
  var score = S.score, hq = SKY.spawnCrate(RW);
  for (i = 0; i < 1200 && S.hq.length; i++) update(1 / 60);
  check(!S.hq.length && S.stats.hqSafe === 1 && S.score - score >= SKY.CRATE.SAFE * 10, 'safe delivery: the bonus');
  var crates = S.crates.length + S.stats.hqSafe;
  hq = SKY.spawnCrate(RW); hq.x = 120; S.combo = 3; S.comboT = 1;
  var b = playerShot(hq.x, hq.y); hitTest(b);
  check(b.dead && hq.hit && S.stats.hqHit === 1 && S.combo === 0, 'hit: down it goes, with your combo');
  for (i = 0; i < 600 && S.hq.length; i++) update(1 / 60);
  check(!S.hq.length && S.stats.hqSafe === 1 && !S.crates.some(function (c) { return c.state === 'chute'; }), 'no bonus and no crate');
  showOver();
  check(document.getElementById('stHq').textContent === '1 of 2' && !document.getElementById('stHq').hidden, 'the card: HQ planes 1 of 2');
  overScreen.hidden = true; LBOARD.clear();
  newGame(); showOver();
  check(document.getElementById('stHq').hidden, 'no HQ planes, no line');
  overScreen.hidden = true; LBOARD.clear();

  // Veteran's kit: KIT pieces, each stack one; then what's on offer is greyed "Kit full".
  check(LEVELS.soldier.KIT === Infinity && LEVELS.veteran.KIT > 0, 'the levels');
  level = 'veteran'; RUN.force = 3; newGame(); RUN.force = null; S.coins = 1e6; S.wave = 6;
  openShop();
  var kit = ITEMS.filter(function (it) { return it.tier === 'supply' && it.maxStacks !== Infinity && !it.available; });
  var n = 0;
  kit.forEach(function (it) { for (var k = 0; k < it.maxStacks && n < LEVELS.veteran.KIT; k++) { S.mods.stacks[it.id] = (S.mods.stacks[it.id] || 0) + 1; n++; } });
  check(SHOP.kitCount() === LEVELS.veteran.KIT, 'the kit counts every stack');
  var more = kit.find(function (it) { return (S.mods.stacks[it.id] || 0) < it.maxStacks; });
  check(more && !eligible(more) && SHOP.kitFull(more), 'a full kit takes no more');
  check(eligible(ITEMS.find(function (it) { return it.id === 'pizza'; })), 'the pizza is never kit');
  S.shop.items = [more].concat(S.shop.items.filter(function (it) { return it.id === 'pizza'; })); renderShop();
  check(/Kit full/.test(document.querySelector('[data-item="' + more.id + '"]').textContent) && document.querySelector('[data-item="' + more.id + '"]').disabled, 'greyed "Kit full"');
  check(/Your kit holds/.test(document.getElementById('supplyNote').textContent), 'the shop says how much it holds');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
  // Soldier: no cap.
  level = 'soldier'; newGame();
  kit.forEach(function (it) { S.mods.stacks[it.id] = it.maxStacks; });
  check(!SHOP.kitFull(kit[0]), 'Soldier has no kit cap');

  RUN.force = null; level = 'soldier'; reset(); S.mode = 'title';
})();
