// Round 11 (fourth playtest): send a hire back from the shop, the medic doesn't pop in after a hire, heavy bombers
// (13), two zeppelins at once (15), the night raid (16), and the Dreadnought's guns blow apart.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var seen = [];
  emitHook = function (type, data) { seen.push({ type: type, data: data }); };
  function heard(type, test) { return seen.some(function (e) { return e.type === type && (!test || test(e.data)); }); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  function quiet(n) {
    newGame(); startWave(n); S.mods.maxHP = S.wallHP = 1e6; S.banner = null;
    var sp = S.spawn; sp.timer = sp.rushT = sp.cargoT = sp.roadT = sp.bossT = 99;
    var k = sp.sky; k.medevacT = k.balloonT = k.crateT = k.diverT = k.heliT = k.heavyT = 99;
    S.recruits = []; S.mods.auto = false; S.texts = []; seen = [];
  }
  function roles() { return Array.from(document.querySelectorAll('#hireItems [data-item]')).map(function (b) { return b.dataset.item; }); }
  function closeShop() { shopScreen.hidden = true; S.shop = null; S.mode = 'play'; }

  // The shop: who you hired this visit shows under the roles, and a tap sends him back with the tags.
  RUN.force = 91; newGame(); S.wave = 6; S.coins = 500; S.mods.slots = 4; S.recruits = [makeRecruit(0, 'medic'), makeRecruit(4, 'rifle')];
  openShop();
  var chips = document.getElementById('hiredItems');
  function medicBtn() { return document.querySelector('#hireItems [data-item="hire-medic"]'); }
  check(chips.hidden && medicBtn().disabled && /Have one/.test(medicBtn().textContent) && roles().length === 5, 'nobody hired yet; one medic at a time, greyed "Have one"');
  takeItem('hire-rifle'); takeItem('hire-engineer'); var spent = S.coins;
  check(S.recruits.length === 4 && !chips.hidden && chips.children.length === 2, 'two hires, two chips');
  // Every role stays listed, so the list never changes shape.
  check(roles().length === 5 && /Have one/.test(medicBtn().textContent), 'a full squad lists every role');
  chips.querySelector('[data-hired="hire-rifle"]').click();
  var types = S.recruits.map(function (r) { return r.type; }).sort().join();
  check(types === 'engineer,medic,rifle' && S.mods.hired === 1 && S.coins > spent && chips.children.length === 1, 'sent back: ' + types);
  chips.querySelector('[data-hired="hire-engineer"]').click();
  check(S.recruits.length === 2 && S.coins === 500 && chips.hidden, 'all sent back, every tag returned');
  closeShop();
  // With no medic, a full squad shows him greyed with the rest.
  RUN.force = 92; newGame(); S.wave = 6; S.coins = 500; S.mods.slots = 3; S.recruits = unlockedSlots().map(function (sl) { return makeRecruit(sl, 'rifle'); });
  openShop();
  check(medicBtn().disabled && !/Have one/.test(medicBtn().textContent), 'no medic: he shows, greyed with a price, while the squad is full');
  closeShop();

  // The shop warns what's next.
  [[4, /a zeppelin is/], [14, /two zeppelins are/], [15, /night raid/], [19, /the Dreadnought is/]].forEach(function (c) {
    RUN.force = 93; newGame(); S.wave = c[0]; openShop();
    check(c[1].test(document.getElementById('shopHint').textContent), 'shop hint after wave ' + c[0] + ': ' + document.getElementById('shopHint').textContent);
    closeShop();
  });

  // Heavy bombers: slow, a long carpet across the field, the bomb nearest the bunker heavy.
  RUN.force = 94; quiet(13);
  var hv = SKY.spawnHeavy(RW);
  check(hv.kind === 'heavy' && hv.hp === SKY.heavyHP(13) && SKY.heavyHP(19) > hv.hp && hv.run.length === SKY.HEAVY.BOMBS &&
    hv.run.filter(function (d) { return d.heavy; }).length === 1 && heard('plane_spawn', function (d) { return d.kind === 'heavy'; }), 'a heavy bomber with a long carpet');
  for (var i = 0; i < 60 * 20 && hv.run.length; i++) update(1 / 60);
  check(!hv.run.length && seen.filter(function (e) { return e.type === 'bomb_dropped' && e.data.by === 'heavy'; }).length === SKY.HEAVY.BOMBS, 'it lays the whole carpet');
  render();
  run(3);
  check(heard('wall_damage', function (d) { return d.source === 'heavy'; }), 'the carpet hits the bunker');
  // It takes a beating; downed, the rest of its carpet never falls.
  quiet(13); hv = SKY.spawnHeavy(RW); run(0.5);
  damagePlane(hv, 1, 'player');
  check(hv.state === 'fly' && hv.hp === SKY.heavyHP(13) - 1, 'one hit clanks');
  damagePlane(hv, hv.hp, 'player');
  check(hv.state === 'fall' && !hv.run.length && heard('plane_down', function (d) { return d.kind === 'heavy'; }), 'shot down, its carpet stops');
  render(); run(8);
  check(!S.planes.length, 'and it crashes');

  // Two zeppelins at once: from both sides, at two heights, each lighter than one alone, each with its own bar.
  RUN.force = 95; newGame(); S.mods.maxHP = S.wallHP = 1e6; startWave(15);
  check(/two zeppelins/.test(S.banner.sub) && S.spawn.boss === 2 && waveCfg(15).twin && !waveCfg(10).twin && waveCfg(25).twin, 'wave 15: two zeppelins');
  S.spawn.timer = 99; S.spawn.bossT = 0; update(1 / 60);
  var zs = S.planes.filter(function (p) { return p.kind === 'zeppelin'; });
  check(zs.length === 2 && zs[0].dir === -zs[1].dir && zs[0].homeY !== zs[1].homeY && S.spawn.boss === 0, 'from both sides at two heights');
  check(zs.every(function (z) { return z.maxHp === Math.round(zeppelinHP(15) * ZEP.TWIN_HP) && z.armored; }), 'each lighter than one alone, both armored');
  run(6); render();
  zeppelinDown(zs[0], 'player');
  check(S.waveState === 'active' && zs[1].state === 'fly', 'one down, one to go');
  render();

  // The night raid: the page goes dark for the wave, and comes back after.
  RUN.force = 96; newGame(); S.mods.maxHP = S.wallHP = 1e6; startWave(16);
  check(waveCfg(16).night && !waveCfg(15).night && !waveCfg(17).night && waveCfg(26).night && /night raid/.test(S.banner.sub), 'wave 16 is a night raid');
  check(!S.night, 'it starts at dusk');
  run(1); var dusk = S.night; run(1.5);
  check(dusk > 0 && dusk < 1 && S.night === 1, 'and goes dark');
  render();
  S.spawn.cfg.night = false; run(SKY.NIGHT.FADE + 0.1);
  check(S.night === 0, 'then light again');

  // The Dreadnought: a gun knocked out blows apart and leaves a hole, not a gun.
  RUN.force = 97; newGame(); S.mods.maxHP = S.wallHP = 1e6; startWave(DREAD.WAVE); S.spawn.timer = 99; S.spawn.teaser = false;
  run(DREAD.ARRIVE + 0.05);
  var p = CAMPAIGN.dread();
  for (var f = 0; f < 60 * 30 && p.phase === 'arrive'; f++) update(1 / 60);
  p.x = 200; p.move = 0; p.turrets.forEach(function (t) { t.cd = 99; });
  var gun = p.turrets.find(function (t) { var x = p.x + p.dir * t.lx; return x > 24 && x < W - 24; });
  S.parts = [];
  damagePlane(p, 999, 'player', p.x + p.dir * gun.lx, p.y + DREAD.GUN_Y, true);
  check(gun.dead && S.parts.filter(function (q) { return q.k === 'scrap'; }).length >= 5 && heard('dread_gun'), 'it blows apart');
  check(!dreadTargets().some(function (q) { return q.part === 'gun' && q.x === p.x + p.dir * gun.lx; }), 'and is no longer a target');
  render(); run(0.5); render();

  emitHook = null; RUN.force = null; reset(); render();
})();
