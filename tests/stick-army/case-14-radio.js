// Round 6 radio: no free call at the start, HQ's bomber with the first tanks, fighter cover, and a two-call radio.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function play(seconds) { for (var k = 0; k < seconds * 60; k++) update(1 / 60); }
  function quiet() { S.mode = 'play'; S.shop = null; shopScreen.hidden = true; S.waveState = 'active'; S.mods.maxHP = S.wallHP = 1e6; S.spawn.planes = S.spawn.bombers = S.spawn.rushes = S.spawn.cargo = S.spawn.boss = 0; S.planes = []; S.troopers = []; S.bombs = []; }
  var seen = [];
  emitHook = function (type) { seen.push(type); };

  // A run starts with an empty radio; the first tank wave brings a bomber from HQ.
  RUN.force = 3; newGame();
  check(S.calls.bomber === 0 && S.calls.fighter === 0 && strikeBtn.hidden && fighterBtn.hidden, 'a run starts with no calls and no call buttons');
  startWave(TANK.WAVE - 1); check(S.calls.bomber === 0, 'nothing before the tanks');
  startWave(TANK.WAVE); check(S.calls.bomber === 1 && /HQ/.test(S.banner.sub), 'HQ sends a bomber with the first tanks');

  // The radio holds two calls of either kind. A free call with the radio full pays out in tags instead.
  S.calls.fighter = 1; check(callsHeld() === RADIO.SLOTS, 'two calls fill the radio');
  var coins = S.coins; grantCall('bomber', 200, 300);
  check(S.calls.bomber === 1 && S.coins === coins + RADIO.FULL_TAGS, 'a full radio turns a free call into tags');

  // Fighter cover: one fast pass across the sky that guns down planes and bombs, ignoring the ground.
  quiet(); S.calls = { bomber: 0, fighter: 1 };
  var planes = [makePlane('plane', 1, 140, 150), makePlane('bomber', -1, 260, 230), makePlane('plane', -1, 330, 160)];
  planes.forEach(function (p) { p.speed = 0; p.drops = []; p.kits = []; p.bombRun = []; S.planes.push(p); });
  var bomb = { id: 4242, x: 200, y: 200, vx: 0, vy: 0, isBomb: true, dead: false }; S.bombs = [bomb];
  spawnTrooper(20, GROUND - 33); land(S.troopers[0]); var walker = S.troopers[0]; walker.speed = 0; // clear of the crashes
  check(callFighter() && S.calls.fighter === 0 && S.fighter && !callFighter(), 'a fighter uses a call, and one flies at a time');
  var passes = {};
  for (var i = 0; i < 60 * 8 && S.fighter; i++) { passes[S.fighter.y] = true; update(1 / 60); S.bombs.forEach(function (m) { if (m === bomb) { m.vy = 0; } }); }
  check(!S.fighter && Object.keys(passes).length === FIGHTER.PASSES.length, 'it makes its pass and leaves');
  check(planes.every(function (p) { return p.state !== 'fly'; }), 'it shoots down the planes in its path');
  check(bomb.dead, 'and the bombs');
  check(!walker.dead, 'it leaves the ground to the crew and the bomber');
  check(seen.indexOf('fighter_cover') >= 0, 'fighter cover is logged');

  // Buttons and keys: each call has its own button, shown only while the radio holds that call. C calls the fighter.
  S.mode = 'play'; S.calls = { bomber: 1, fighter: 0 }; syncCallBtns();
  check(!strikeBtn.hidden && fighterBtn.hidden, 'only held calls show a button');
  S.calls.fighter = 1; syncCallBtns();
  check(!fighterBtn.hidden && document.getElementById('fighterCount').textContent === '1', 'the fighter button shows its count');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' }));
  check(S.fighter && S.calls.fighter === 0, 'C calls fighter cover');
  syncCallBtns(); check(fighterBtn.hidden, 'the button goes once the call is used');
  S.fighter = null;

  // The shop sells both calls from wave 3, while the radio has room.
  newGame(); S.wave = 2; openShop();
  check(!S.shop.items.some(function (it) { return it.id === 'fighter'; }), 'no fighters for sale at first');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
  newGame(); S.wave = 3; S.coins = 500; openShop();
  check(S.shop.items.some(function (it) { return it.id === 'fighter'; }) && S.shop.items.some(function (it) { return it.id === 'strike'; }), 'both calls for sale from wave 3');
  check(takeItem('fighter') && S.calls.fighter === 1, 'buying fighter cover puts it on the radio');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
  newGame(); S.wave = 9; S.coins = 500; S.calls = { bomber: 1, fighter: 1 }; openShop();
  check(!takeItem('fighter') && !takeItem('strike') && /Radio full/.test(document.querySelector('[data-item="fighter"]').textContent), 'a full radio sells no more calls, and says so');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;

  // Icons for the new call.
  check(ICONS.fighter, 'icon for fighter cover');

  emitHook = null; RUN.force = null; reset(); syncCallBtns(); render();
})();
