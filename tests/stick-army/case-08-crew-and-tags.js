// Playtest round 2: crew survival, snipers vs the turret, anti-air flak, hiring, dog tags.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }

  // Bombs wound by distance; a direct hit still kills a bare recruit.
  newGame();
  var near = makeRecruit(0, 'rifle'), far = makeRecruit(1, 'rifle'); S.recruits = [near, far];
  explode(near.x, GROUND - 4, 42, 'bomb');
  check(near.dead, 'direct bomb hit kills a bare recruit');
  newGame(); var wounded = makeRecruit(0, 'rifle'); S.recruits = [wounded];
  explode(wounded.x + 18, GROUND - 4, 42, 'bomb');
  check(!wounded.dead && wounded.hp < ENEMIES.rifle.hp, 'a near miss wounds instead of killing');

  // Trenches cut damage, helmets raise health for current and future crew.
  newGame(); var a = makeRecruit(0, 'rifle'); S.recruits = [a]; hurtRecruit(a, 1);
  var bare = ENEMIES.rifle.hp - a.hp;
  newGame(); S.mods.trench = 1; var b = makeRecruit(0, 'rifle'); S.recruits = [b]; hurtRecruit(b, 1);
  check(Math.abs((ENEMIES.rifle.hp - b.hp) - bare * 0.6) < 1e-9, 'one trench takes 40% off');
  S.mods.trench = 2; var c = makeRecruit(1, 'rifle'); S.recruits.push(c); hurtRecruit(c, 1);
  check(Math.abs((ENEMIES.rifle.hp - c.hp) - bare * 0.4) < 1e-9, 'two trenches take 60% off');
  newGame(); var old = makeRecruit(0, 'rifle'); S.recruits = [old];
  ITEMS.find(function (it) { return it.id === 'helmet'; }).apply(S);
  check(old.hp === ENEMIES.rifle.hp + 1 && crewMax(old) === ENEMIES.rifle.hp + 1, 'helmets raise current crew');
  check(makeRecruit(1, 'rifle').hp === ENEMIES.rifle.hp + 1, 'and future crew');
  newGame(); S.mods.trench = 2; S.mods.helmet = 3; var tough = makeRecruit(0, 'rifle'); S.recruits = [tough];
  explode(tough.x, GROUND - 4, 42, 'bomb');
  check(!tough.dead, 'dug in with helmets, a recruit survives a direct hit');

  // With no crew, a sniper's shot jolts the turret's heat and chips the wall.
  newGame(); S.recruits = []; S.heat = 0;
  spawnTrooper(18, GROUND - 33); var sn = S.troopers[0]; sn.type = 'sniper'; land(sn); sn.shotCD = 0;
  var wall = S.wallHP;
  for (var i = 0; i < 240; i++) { updateTroopers(1 / 120); updateEnemyShots(1 / 120); }
  check(S.wallHP < wall && S.heat > 0, 'sniper hits the turret');
  newGame(); S.heat = 0.9; sniperHitsTurret();
  check(S.overheat > 0, 'a sniper hit can tip a hot gun into overheating');

  // Flak bursts near planes and bombs, not paratroopers.
  newGame(); S.mods.flak = true;
  spawnTrooper(200, 300); var para = S.troopers[0]; para.open = 1;
  S.bullets = [{ x: para.x + 18, y: para.y + 10, vx: 0, vy: -700, owner: 'player', kind: 'bullet', flak: true, pierce: 1, hits: [], life: 1, dead: false }];
  hitTest(S.bullets[0]);
  check(!para.dead && !S.bullets[0].dead, 'flak ignores nearby paratroopers');

  // Hiring: offered while a slot is free, price rises with each hire.
  newGame(); S.coins = 500; openShop();
  var hire = ITEMS.find(function (it) { return it.id === 'hire'; });
  check(S.shop.premium.indexOf(hire) >= 0 && price(hire) === 35, 'hire offered at its base price');
  takeItem(S.shop.free[0].id);
  check(takeItem('hire') && S.recruits.length === 1 && S.recruits[0].type === 'rifle' && S.coins === 465, 'hiring adds a rifleman');
  check(price(hire) === 50, 'the next hire costs more');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
  S.mods.slots = 1; check(!eligible(hire), 'no hiring when the squad is full');

  // Dog tags fly from the kill to the counter.
  newGame(); var before = S.coins; award(10, 120, 400, 'test', INK, true);
  var tag = S.parts.find(function (q) { return q.k === 'tag'; });
  check(S.coins > before && tag && tag.n === S.coins - before, 'earned tags fly to the counter');
  for (var j = 0; j < 120; j++) updateParts(1 / 60);
  check(!S.parts.some(function (q) { return q.k === 'tag'; }) && S.tagPulse >= 0, 'tags arrive and disappear');

  // Shop copy speaks in dog tags and explains the locked button.
  newGame(); S.coins = 10; openShop();
  check(/dog tags/.test(document.getElementById('shopCoins').textContent), 'balance shown in dog tags');
  check(document.getElementById('continueBtn').textContent === 'Pick one first', 'locked button explains itself');
  check(/need \d+ more/.test(document.getElementById('premiumItems').textContent), 'unaffordable items say how many more tags');
  takeItem(S.shop.free[0].id);
  check(/^Wave 2/.test(document.getElementById('continueBtn').textContent), 'continue names the next wave once picked');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;

  // New supplies have icons too.
  ['trench', 'helmet', 'hire'].forEach(function (id) { check(ICONS[id], 'icon for ' + id); });

  reset(); render();
})();
