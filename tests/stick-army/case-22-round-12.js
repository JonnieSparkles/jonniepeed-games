// Round 12 (fifth playtest, balance): war prices, useful offers, zeppelin escorts, late waves that arrive together,
// heavy bombers in pairs, a Dreadnought you can react to, the Red Cross plane's safe passage, wall damage taken, and
// the radio's calls in the HUD.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var seen = [];
  emitHook = function (type, data) { seen.push({ type: type, data: data }); };
  function heard(type, test) { return seen.some(function (e) { return e.type === type && (!test || test(e.data)); }); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  function item(id) { return ITEMS.find(function (it) { return it.id === id; }); }
  function quiet(n) {
    newGame(); startWave(n); S.mods.maxHP = S.wallHP = 1e6; S.banner = null;
    var sp = S.spawn; sp.timer = sp.rushT = sp.cargoT = sp.roadT = sp.bossT = 99;
    var k = sp.sky; k.medevacT = k.balloonT = k.crateT = k.diverT = k.heliT = k.heavyT = 99;
    S.recruits = []; S.mods.auto = false; S.texts = []; seen = [];
  }
  function closeShop() { shopScreen.hidden = true; S.shop = null; S.mode = 'play'; }

  // War prices: the early waves keep their prices; then supplies climb to about three times by wave 19 and soldiers
  // to about four. Pizza stays 25, and the gift is still free.
  RUN.force = 101; newGame(); S.wave = 5;
  check(price(item('double')) === 40 && price(item('hire-rifle')) === 35 && SHOP.war(SHOP.WAR.SUPPLY) === 1, 'early prices as before');
  S.wave = 19;
  var dbl = price(item('double')), rifle = price(item('hire-rifle'));
  check(dbl >= 110 && dbl <= 130 && dbl % 5 === 0, 'supplies about three times by wave 19: ' + dbl);
  check(rifle >= 125 && rifle <= 145, 'soldiers about four times: ' + rifle);
  check(price(item('pizza')) === 25, 'pizza is always 25');
  S.coins = 0; openShop();
  check(costNow(item(S.shop.gift)) === 0 && /prices are up/.test(document.getElementById('supplyNote').textContent), 'the gift is free, and the shop says why prices are up');
  closeShop();

  // Patch the wall: not offered with the wall full, and greyed "Wall is full" if it fills during the visit.
  RUN.force = 102; newGame(); S.wave = 8; S.coins = 999; S.wallHP = S.mods.maxHP;
  for (var v = 0; v < 6; v++) { openShop(); check(!S.shop.items.some(function (it) { return it.id === 'repair'; }), 'no patch offered with the wall full'); closeShop(); S.wave++; }
  S.wallHP = S.mods.maxHP - 10; openShop();
  if (!S.shop.items.some(function (it) { return it.id === 'repair'; })) S.shop.items.unshift(item('repair'));
  S.wallHP = S.mods.maxHP; renderShop();
  var patch = document.querySelector('#supplyItems [data-item="repair"]');
  check(patch.disabled && /Wall is full/.test(patch.textContent), 'greyed: Wall is full');
  check(document.querySelector('#supplyItems [data-item="pizza"]') && !document.querySelector('#supplyItems [data-item="pizza"]').disabled, 'pizza is always on the menu');
  closeShop();

  // A zeppelin is never alone: once the wave's planes are done, escort planes keep coming while it flies.
  RUN.force = 103; quiet(10); S.spawn.planes = S.spawn.bombers = 0;
  var z = spawnZeppelin(); z.entered = true; z.x = 200;
  var before = S.planes.filter(function (p) { return p.kind === 'plane'; }).length;
  run(ZEP.ESCORT_EVERY * 2.6);
  var escorts = S.planes.filter(function (p) { return p.kind === 'plane'; }).length - before;
  check(escorts >= 2, 'escort planes keep coming: ' + escorts);
  zeppelinDown(z, 'player'); S.planes = S.planes.filter(function (p) { return p.kind !== 'plane'; });
  run(ZEP.ESCORT_EVERY * 2);
  check(!S.planes.some(function (p) { return p.kind === 'plane'; }), 'and stop when it goes down');

  // Late waves arrive together: the gaps between rushes, tanks and the sky's arrivals shrink with the plane interval.
  check(wavePace(waveCfg(9)) === 1 && wavePace(waveCfg(4)) === 1 && wavePace(waveCfg(15)) < 0.8 && wavePace(waveCfg(21)) === 0.5, 'the pace quickens late');
  check(waveCfg(9).maxDrops === 6 && waveCfg(10).maxDrops === 7 && waveCfg(12).maxDrops === 8, 'more troopers a plane late');

  // Heavy bombers: one a wave, a pair from 16 (from both sides, at two heights), two pairs from 19; none on boss waves.
  check(waveCfg(13).heavies === 1 && waveCfg(16).heavies === 2 && waveCfg(19).heavies === 4 && !waveCfg(15).heavies && !waveCfg(20).heavies, 'the heavy bomber schedule');
  RUN.force = 104; quiet(16); S.spawn.sky.heavyT = 0; update(1 / 60);
  var pair = S.planes.filter(function (p) { return p.kind === 'heavy'; });
  check(pair.length === 2 && pair[0].dir === -pair[1].dir && Math.abs(pair[0].y - pair[1].y) >= 50 && S.spawn.sky.heavies === 0, 'a pair from both sides at two heights');
  check(pair.every(function (p) { return p.y - 44 > 90; }), 'below the HUD');
  render();

  // The Dreadnought gives time to react: each gun aims for 1.5 s, one at a time while most stand (case-18).
  check(DREAD.AIM >= 1.2 && DREAD.SHELL_WALL <= 14 && DREAD.APPROACH >= 3, 'a fight you can react to, after a build-up');

  // The Red Cross plane: across untouched, it pays points and tags; hit, it pays nothing.
  RUN.force = 105; quiet(12); S.coins = 0;
  var med = SKY.spawnMedevac(RW), score0 = S.score; med.x = W + 60; med.dir = 1;
  run(0.5);
  check(!S.medevac.length && S.score === score0 + SKY.medevacPts(12) && S.coins === SKY.medevacTags(12) && heard('redcross_safe'), 'safe passage pays');
  med = SKY.spawnMedevac(RW); med.x = 200;
  hitTest({ x: med.x, y: med.y, vx: 0, vy: -1, owner: 'player', kind: 'bullet', life: 1, dead: false });
  var paid = seen.filter(function (e) { return e.type === 'redcross_safe'; }).length; med.x = W + 60; med.dir = 1; run(0.5);
  check(seen.filter(function (e) { return e.type === 'redcross_safe'; }).length === paid, 'a hit one pays nothing');

  // Wall damage taken: per wave in the shop, a bonus for a wave that never touched the wall, the run total on the end
  // cards and in play stats.
  RUN.force = 106; newGame(); startWave(3); S.spawn.planes = S.spawn.bombers = 0; S.planes = []; S.troopers = [];
  var k3 = S.spawn.sky; if (k3) k3.balloons = k3.divers = k3.helis = k3.heavies = 0; S.spawn.rushes = S.spawn.cargo = S.spawn.road = 0;
  var sc = S.score; run(0.2);
  check(S.waveState === 'clear' && S.score === sc + 100 * 3 + 50 * 3 && /untouched!/.test(S.banner.sub) && heard('wave_clear', function (d) { return d.untouched; }), 'an untouched wave pays extra: ' + (S.score - sc));
  openShop(); check(/wall untouched/.test(document.getElementById('shopReport').textContent), 'the shop says untouched'); closeShop();
  startWave(4); hurtWall(18, 'bomb'); hurtWall(3, 'sniper');
  check(Math.round(S.stats.wallDamage) === 21, 'the run total counts every hit');
  openShop(); check(/wall -21/.test(document.getElementById('shopReport').textContent), 'the shop shows the wave\'s damage'); closeShop();
  check(runReport().stats.wall_damage === 21, 'play stats get the total');
  S.mode = 'over'; showOver(); check(document.getElementById('stDmg').textContent === '21', 'the game-over card shows it');
  overScreen.hidden = true;

  // The radio's calls sit in the HUD under the score; a click or tap makes the call instead of firing.
  RUN.force = 107; quiet(9); S.calls = { bomber: 1, fighter: 2 };
  var chips = callChips();
  check(chips.length === 2 && chips[0].kind === 'bomber' && chips[1].n === 2, 'held calls show in the HUD');
  render();
  var box = cv.getBoundingClientRect(), c0 = chips[0], kx = box.width / W, ky = box.height / H;
  cv.dispatchEvent(new PointerEvent('pointerdown', { clientX: box.left + (c0.x + 10) * kx, clientY: box.top + (c0.y + 10) * ky, pointerId: 7, bubbles: true }));
  check(S.calls.bomber === 0 && S.strike && !S.turrets[0].firing, 'clicking the chip calls the strike, not the trigger');
  check(callChips().length === 1 && callChips()[0].kind === 'fighter', 'the spent call leaves the HUD');
  S.calls = { bomber: 0, fighter: 0 }; check(!callChips().length, 'an empty radio shows nothing');
  render();
  // The two chips leave room for the combo counter in the middle.
  check(CALL_CHIP.X + 2 * CALL_CHIP.W + CALL_CHIP.GAP <= 152, 'the chips clear the combo counter');

  // The air strike and fighter cover come in from the left or the right, and fly across and off the other side.
  var sides = {}, fromRight = null;
  for (var sd = 0; sd < 12; sd++) {
    RUN.force = 120 + sd; quiet(9); S.calls = { bomber: 1, fighter: 1 }; callStrike(); callFighter();
    sides['s' + S.strike.dir] = sides['f' + S.fighter.dir] = true;
    check(S.strike.x === (S.strike.dir > 0 ? STRIKE.START : W - STRIKE.START) && S.fighter.x === (S.fighter.dir > 0 ? FIGHTER.START : W - FIGHTER.START), 'each starts on its own side');
    if (S.strike.dir < 0 && S.fighter.dir < 0 && fromRight == null) fromRight = 120 + sd;
  }
  check(sides.s1 && sides['s-1'] && sides.f1 && sides['f-1'] && fromRight != null, 'from either side');
  {
    RUN.force = fromRight; quiet(9); S.calls = { bomber: 1, fighter: 1 }; callStrike(); callFighter(); render();
    var drops = 0; for (var sf = 0; sf < 60 * 5 && (S.strike || S.fighter); sf++) { update(1 / 60); drops = Math.max(drops, S.strikeBombs.length); }
    check(!S.strike && !S.fighter && drops > 0, 'from the right, they cross and leave by the left');
  }

  // The mute button swaps its icon: a crossed-out speaker while muted.
  var wasMuted = sound.muted;
  function shown(id) { return getComputedStyle(document.getElementById(id)).display !== 'none'; }
  if (wasMuted) muteBtn.click();
  check(shown('icoSound') && !shown('icoMuted'), 'sound on: the speaker');
  muteBtn.click();
  check(sound.muted && !shown('icoSound') && shown('icoMuted') && muteBtn.getAttribute('aria-pressed') === 'true', 'muted: the crossed-out speaker');
  muteBtn.click();
  check(!sound.muted && shown('icoSound') && !shown('icoMuted'), 'and back');
  if (wasMuted) muteBtn.click();

  emitHook = null; RUN.force = null; reset(); titleScene(); render();
})();
