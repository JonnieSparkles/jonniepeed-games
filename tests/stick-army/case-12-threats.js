// Round 4 threats: side rushers, tanks from cargo planes, rising pressure, and the air strike special.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var i;
  function play(seconds) { for (var k = 0; k < seconds * 60; k++) update(1 / 60); }
  function quiet() { S.mode = 'play'; S.shop = null; shopScreen.hidden = true; S.waveState = 'active'; S.mods.maxHP = S.wallHP = 1e6; S.spawn.planes = S.spawn.bombers = S.spawn.rushes = S.spawn.cargo = S.spawn.road = S.spawn.boss = 0; var k = S.spawn.sky; if (k) k.balloons = k.divers = k.helis = k.heavies = k.medevac = k.crates = 0; S.planes = []; S.troopers = []; S.bombs = []; S.medevac = []; S.hq = []; }

  // New threats arrive on schedule, and pressure keeps rising after wave 7.
  check(!waveCfg(5).rushes && waveCfg(6).rushes >= 1 && waveCfg(12).rushes > waveCfg(6).rushes, 'rushers from wave 6, more later');
  check(!waveCfg(8).cargo && waveCfg(9).cargo >= 1 && waveCfg(14).cargo > waveCfg(9).cargo, 'tanks from wave 9, more later');
  check(!waveCfg(10).road && waveCfg(11).road >= 1 && waveCfg(14).road > waveCfg(11).road && !waveCfg(20).road, 'tanks by road from wave 11, more later, none with the Dreadnought');
  check(waveCfg(9).interval === waveCfg(7).interval && waveCfg(11).interval < waveCfg(9).interval && waveCfg(19).interval < waveCfg(11).interval, 'planes hold their pace to wave 9, then keep coming faster');
  check(waveCfg(1).interval < 1.6 && waveCfg(4).interval < waveCfg(1).interval && waveCfg(4).interval >= waveCfg(5).interval && waveCfg(1).planes >= 7, 'the first waves are busy too');
  check(waveCfg(9).bombers === waveCfg(6).bombers && waveCfg(21).bombers > waveCfg(12).bombers && waveCfg(41).bombers > waveCfg(31).bombers && waveCfg(20).fall > waveCfg(13).fall, 'from wave 10 bombers keep growing without a cap, and troopers fall faster');

  // A rush charges in from one edge along the ground, faster than a walker.
  RUN.force = 4; newGame(); startWave(6); quiet();
  var seen = [];
  emitHook = function (type) { seen.push(type); };
  S.spawn.cfg.rushSize = 3; spawnRush();
  var rushers = S.troopers.filter(function (t) { return t.rusher; });
  check(rushers.length === 3 && rushers.every(function (t) { return t.state === 'ground' && (t.x < 0 || t.x > W); }), 'a rush starts off the page, on the ground');
  var x0 = rushers[0].x; update(1);
  check(Math.abs(rushers[0].x - x0) > 40 && seen.indexOf('rush') >= 0, 'rushers run in fast');

  // A cargo plane drops a tank, which rolls into range and shells the bunker. Shells can be shot down.
  RUN.force = 9; newGame(); startWave(9); quiet(); S.recruits = [];
  spawnCargo(); var cargo = S.planes[0], tankX = cargo.tankX;
  check(cargo.kind === 'cargo' && tankX != null, 'a cargo plane carries a tank');
  for (i = 0; i < 1200 && !S.tanks.length; i++) update(1 / 60);
  var tk = S.tanks[0];
  check(tk && tk.state === 'chute' && Math.abs(tk.x - tankX) < 1 && cargo.tankX == null && seen.indexOf('tank_drop') >= 0, 'the tank drops where planned');
  for (i = 0; i < 1200 && tk.state === 'chute'; i++) update(1 / 60);
  check(tk.state === 'roll', 'the tank lands');
  var stopX = tk.dir > 0 ? BK.x1 - TANK.STOP : BK.x2 + TANK.STOP, wall = S.wallHP, shells = 0;
  for (i = 0; i < 1800; i++) { update(1 / 60); shells += S.bombs.filter(function (m) { return m.shell && m.fresh !== false; }).length; S.bombs.forEach(function (m) { m.fresh = false; }); }
  check(Math.abs(tk.x - stopX) < 1 && shells > 3 && S.wallHP < wall, 'it parks in range and shells the wall');
  var shell = { id: 1, x: 200, y: 400, vx: 0, vy: 0, isBomb: true, shell: true, dead: false }; S.bombs = [shell];
  hitTest({ x: 200, y: 400, vx: 0, vy: -700, owner: 'player', kind: 'bullet', pierce: 1, hits: [], life: 1, dead: false });
  check(shell.dead, 'shells can be shot down');
  var near = { id: 2, x: 200, y: 400, vx: 0, vy: 0, isBomb: true, shell: true, dead: false }; S.bombs = [near];
  hitTest({ x: 208, y: 400, vx: 0, vy: -700, owner: 'player', kind: 'bullet', pierce: 1, hits: [], life: 1, dead: false });
  check(!near.dead, 'but they are smaller than bombs');

  // The dipped barrel reaches a parked tank; bullets chip it, rockets hit hard, and it pays out when destroyed.
  var hp = tk.hp; S.bullets = []; S.fireCD = 0; S.heat = 0;
  aimAt({ x: tk.x + tk.dir * -20, y: tk.y }); shoot();
  for (i = 0; i < 120 && S.bullets.length; i++) updateBullets(1 / 60);
  check(tk.hp < hp && Math.abs(hp - tk.hp - TANK.BULLET) < 1e-9 && TANK.BULLET < 0.5, 'a fully dipped shot reaches the parked tank, and only chips it');
  hp = tk.hp; explode(tk.x, tk.y, 30, 'rocket', 'player');
  check(tk.hp === hp - TANK.BLAST.rocket, 'rockets hit hard');
  var score = S.score; tk.hp = 1; damageTank(tk, 1, 'player'); update(1 / 60);
  check(S.tanks.length === 0 && S.score > score + 100 && S.stats.tanks === 1 && seen.indexOf('tank_down') >= 0, 'a destroyed tank pays out');

  // Downing the cargo plane before its drop takes the tank with it.
  quiet(); spawnCargo(); cargo = S.planes[0]; cargo.x = cargo.dir > 0 ? 0 : W;
  cargo.hp = 1; damagePlane(cargo, 1, 'player', cargo.x, cargo.y); play(6);
  check(!S.tanks.length && cargo.tankX == null, 'tank and all');

  // Bazookas go for tanks first; other crew deal with troopers before tanks.
  quiet(); S.tanks = [{ id: 99, x: 120, y: GROUND - 1 - TANK.HH, state: 'roll', dir: 1, hp: 10, maxHp: 10, shellT: 9, hitFlash: 0, tread: 0, dead: false }];
  spawnTrooper(130, GROUND - 33); land(S.troopers[0]);
  check(pickTarget(makeRecruit(0, 'bazooka')) === S.tanks[0] && pickTarget(makeRecruit(0, 'rifle')) === S.troopers[0], 'crew pick the right target');

  // Air strike: a charge calls a bomber that clears the ground and hurts tanks, sparing crew and wall.
  quiet(); S.tanks = [{ id: 98, x: 110, y: GROUND - 1 - TANK.HH, state: 'roll', dir: 1, hp: 30, maxHp: 30, shellT: 9, mgT: 99, hitFlash: 0, tread: 0, dead: false }];
  var crew = makeRecruit(4, 'rifle'), crewHp = crew.hp; S.recruits = [crew]; wall = S.wallHP;
  [30, 60, 90].forEach(function (x) { spawnTrooper(x, GROUND - 33, { type: 'rifle', fall: 1, sway: 0, armor: 0 }); land(S.troopers[S.troopers.length - 1]); });
  var tankHp = S.tanks[0].hp; S.calls.bomber = 1;
  check(callStrike() && S.calls.bomber === 0 && !callStrike(), 'a strike uses a charge, and only one flies at a time');
  play(4);
  check(!S.strike && S.troopers.every(function (t) { return t.dead || t.state !== 'ground'; }), 'the strike clears the ground');
  check(!crew.dead && crew.hp === crewHp && S.wallHP === wall && (S.tanks.length === 0 || S.tanks[0].hp <= tankHp - TANK.BLAST.strike), 'it spares crew and wall and hits the tank');
  check(!callStrike(), 'no charges, no strike');
  check(seen.indexOf('air_strike') >= 0, 'strikes are logged');

  // B calls a strike; the button shows during play with the charges left.
  S.calls.bomber = 2; S.mode = 'play'; syncCallBtns();
  check(!strikeBtn.hidden && !strikeBtn.disabled && document.getElementById('strikeCount').textContent === '2', 'button shows charges');
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
  check(S.calls.bomber === 1 && S.strike, 'B calls a strike');
  syncCallBtns(); check(strikeBtn.disabled, 'button waits while a strike flies');
  emitHook = null;

  // Shell aim comes from the combat stream, never from cosmetic randomness.
  function shellVx(rand) {
    var real = Math.random; Math.random = rand;
    try {
      RUN.force = 9; newGame(); startWave(9); quiet(); S.recruits = [];
      S.tanks = [{ id: 97, x: BK.x1 - TANK.STOP, y: GROUND - 1 - TANK.HH, state: 'roll', dir: 1, hp: 30, maxHp: 30, shellT: 0.001, hitFlash: 0, tread: 0, dead: false }];
      updateTanks(0.01); return S.bombs[0].vx;
    } finally { Math.random = real; }
  }
  check(shellVx(function () { return 0; }) === shellVx(function () { return 0.99; }), 'shell aim ignores cosmetic randomness');
  // Armor from wave 12: a vest stops one body hit (two for heavies). Chutes still pop, and blasts still kill.
  check(!waveCfg(9).armorChance && waveCfg(10).armorChance > 0 && waveCfg(14).armorChance > waveCfg(11).armorChance && waveCfg(16).armorHits === 1 && waveCfg(17).armorHits === 2, 'armor arrives at wave 10 and gets heavier from 17');
  seen = []; emitHook = function (type) { seen.push(type); };
  quiet(); spawnTrooper(200, 300, { type: 'rifle', fall: 1, sway: 0, armor: 1 }); var vt = S.troopers[0];
  function body() { return { x: vt.x, y: vt.y + 12, vx: 0, vy: -700, owner: 'player', kind: 'bullet', pierce: 1, hits: [], life: 1, dead: false }; }
  hitTest(body()); check(!vt.dead && vt.armor === 0 && seen.indexOf('armor_hit') >= 0, 'the vest stops the first hit');
  hitTest(body()); check(vt.dead, 'the next hit kills');
  quiet(); spawnTrooper(120, 300, { type: 'rifle', fall: 1, sway: 0, armor: 2 }); vt = S.troopers[0]; vt.open = 1;
  hitTest({ x: vt.x, y: vt.y - 30, vx: 0, vy: -700, owner: 'player', kind: 'bullet', pierce: 1, hits: [], life: 1, dead: false });
  check(vt.state === 'free' && vt.armor === 2, 'a canopy hit pops an armored chute');
  explode(vt.x, vt.y + 14, 30, 'rocket', 'player'); check(vt.dead, 'rockets ignore armor');
  emitHook = null; render();

  // Downing a zeppelin earns a charge; the shop sells strikes once tanks are near.
  newGame(); S.wave = 5; var z = spawnZeppelin(); z.x = 200; var before = S.calls.bomber; z.hp = 1; damagePlane(z, 1, 'player', 200, z.y);
  check(S.calls.bomber === before + 1, 'a zeppelin earns an air strike');
  newGame(); S.wave = 2; openShop();
  check(!S.shop.items.some(function (it) { return it.id === 'strike'; }), 'no strikes for sale at first');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
  newGame(); S.wave = 8; openShop(); var strike = S.shop.items.find(function (it) { return it.id === 'strike'; });
  S.coins = 100; var had = S.calls.bomber;
  check(strike && takeItem('strike') && S.calls.bomber === had + 1, 'strikes for sale later on');
  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;

  RUN.force = null; reset(); syncCallBtns(); render();
})();
