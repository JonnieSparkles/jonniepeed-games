// Round 13 (sixth playtest, a full run to the Dreadnought): a low lane for planes and bombers from the early waves,
// low heavy bombers, low fast helicopter runs, tanks in pairs with heavier guns and a machine gun, tank raids with
// infantry, more Red Cross planes, a night raid dark across the whole page with the HUD in chalk, the squad on the
// game-over card, and the decoy's cardboard armor and announcement.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var seen = [];
  emitHook = function (type, data) { seen.push({ type: type, data: data }); };
  function heard(type, test) { return seen.some(function (e) { return e.type === type && (!test || test(e.data)); }); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  function quiet(n) {
    newGame(); startWave(n); S.mods.maxHP = S.wallHP = 1e6; S.banner = null;
    var sp = S.spawn; sp.timer = sp.rushT = sp.cargoT = sp.roadT = sp.bossT = 99;
    var k = sp.sky; if (k) k.medevacT = k.balloonT = k.crateT = k.diverT = k.heliT = k.heavyT = 99;
    S.recruits = []; S.mods.auto = false; S.texts = []; seen = [];
  }

  // The low lane: none on wave 1, a share from 2 (bombers from 3) growing to its cap; never on boss waves.
  check(!waveCfg(1).low && waveCfg(2).low === LOW.SHARE && waveCfg(9).low > waveCfg(4).low && waveCfg(19).low === LOW.MAX && !waveCfg(5).low && !waveCfg(10).low, 'the low lane schedule');
  RUN.force = 140; quiet(8);
  for (var i = 0; i < 40; i++) { spawnPlane(i % 2 ? 'bomber' : 'plane'); }
  var lowP = S.planes.filter(function (p) { return p.low && p.kind === 'plane'; }), lowB = S.planes.filter(function (p) { return p.low && p.kind === 'bomber'; });
  check(lowP.length > 0 && lowB.length > 0 && S.planes.some(function (p) { return !p.low; }), 'some planes and bombers fly low');
  check(lowP.every(function (p) { return p.y >= LOW.PLANE_Y[0] && p.y <= LOW.PLANE_Y[1]; }) && lowB.every(function (p) { return p.y >= LOW.BOMBER_Y[0] && p.y <= LOW.BOMBER_Y[1]; }), 'in the low lane');
  render();

  // Low heavy bombers: from wave 14 the second of a pair flies low.
  RUN.force = 141; quiet(17); S.spawn.sky.heavyT = 0; update(1 / 60);
  var pair = S.planes.filter(function (p) { return p.kind === 'heavy'; });
  check(pair.length === 2 && pair.some(function (p) { return p.y === SKY.HEAVY.LOW_Y; }), 'a heavy bomber flies low');

  // The low, fast helicopter run: across the page low, troopers hopping out on the move, out the other side.
  RUN.force = 142; quiet(12); var h = null;
  for (var s = 0; s < 40 && !h; s++) { var c = SKY.spawnHeli(RW); if (c.phase === 'sweep') h = c; else S.planes = []; }
  check(h && h.y >= SKY.HELI.SWEEP.Y[0] - 3 && heard('plane_spawn', function (d) { return d.sweep; }), 'a helicopter comes in low');
  var troops = S.troopers.length;
  for (var f = 0; f < 60 * 8 && !h.gone; f++) update(1 / 60);
  check(h.gone && heard('rope', function (d) { return d.hop; }) && S.troopers.length > troops, 'troopers hop out as it crosses, and it leaves');
  check(SKY.HELI.SWEEP.WAVE > SKY.HELI.WAVE, 'after the hovering ones have been met');

  // Tanks: pairs by road from TANK.PAIR, one behind the other; the second stops behind the first.
  RUN.force = 143; quiet(TANK.PAIR); var raided = false;
  for (s = 0; s < 30; s++) { S.tanks = []; S.troopers = []; spawnRoadTank(); if (S.troopers.length) { raided = true; break; } }
  check(S.tanks.length === 2 && S.tanks[0].dir === S.tanks[1].dir && Math.abs(S.tanks[0].x - S.tanks[1].x) === TANK.PAIR_GAP, 'tanks come in pairs');
  // A tank raid: infantry walking ahead of the tanks.
  check(raided && S.troopers.every(function (t) { return t.escort && t.state === 'ground' && t.speed === TANK.ESCORT_SPEED; }) && heard('tank_raid'), 'a tank raid brings infantry');
  S.troopers = []; S.tanks.forEach(function (tk) { tk.shellT = tk.mgT = 99; });
  run(40);
  var t0 = S.tanks[0], t1 = S.tanks[1], gap = Math.abs(t0.x - t1.x);
  check(gap >= 2 * TANK.HW && gap <= 2 * TANK.HW + 12, 'the second stops behind the first: ' + Math.round(gap));
  // Heavier guns, and a machine gun at the squad.
  check(TANK.SHELL_DAMAGE === 12 && TANK.SHELL_EVERY <= 3.2, 'heavier shells, more often');
  var front = t0.dir > 0 ? Math.max(t0.x, t1.x) : Math.min(t0.x, t1.x), r = makeRecruit(t0.dir > 0 ? 1 : 5, 'rifle');
  r.x = front + t0.dir * 120; S.recruits = [r]; var hp = r.hp; S.tanks.forEach(function (tk) { tk.mgT = 0.01; });
  run(1.5);
  check(r.hp < hp, 'the machine gun hits the squad');
  render();

  // More Red Cross planes: two from 9, three from 14.
  check(waveCfg(8).medevac === 1 && waveCfg(9).medevac === 2 && waveCfg(14).medevac === 3, 'more Red Cross planes');

  // The night raid darkens the whole page; the HUD is drawn in chalk.
  RUN.force = 144; newGame(); S.mods.maxHP = S.wallHP = 1e6; startWave(16); run(2.6);
  check(S.night === 1 && !S.smoke, 'night');
  render();
  var px = ctx.getImageData(10 * K, (H - 6) * K, 1, 1).data;
  check(px[0] + px[1] + px[2] < 3 * 150, 'the bottom of the page is dark too');

  // The game-over card shows the squad that was still standing.
  RUN.force = 145; newGame(); startWave(9);
  var vet = makeRecruit(0, 'engineer'); vet.rank = 3; vet.name = 'Doodle'; vet.waves = 10;
  S.recruits = [vet, makeRecruit(4, 'rifle')];
  hurtWall(S.wallHP + 1, 'tank'); update(1 / 60); run(3);
  var row = document.getElementById('overSquadRow'), line = document.getElementById('overSquad');
  check(S.mode === 'over' && !row.hidden && !line.hidden && /Sgt\. Doodle \(10 waves/.test(line.textContent) && /1 rookie/.test(line.textContent), 'the game-over card shows the squad: ' + line.textContent);
  overScreen.hidden = true;

  // The decoy: cardboard armor that comes off at the first hit, and the full announcement as it comes in.
  RUN.force = 52; newGame(); S.mods.maxHP = S.wallHP = 1e6; S.recruits = [makeRecruit(0, 'rifle')]; startWave(DREAD.WAVE); S.spawn.timer = 99;
  for (f = 0; f < 60 * 40 && !S.spawn.decoySeen; f++) update(1 / 60);
  check(S.banner && S.banner.s === 'dreadnought!' && S.banner.sub === 'the enemy flagship', 'the decoy gets the full announcement');
  var dz = S.spawn.decoy; render();
  damagePlane(dz, 1, 'player', dz.x, dz.y, true);
  check(dz.plateOff && S.parts.some(function (q) { return q.k === 'plate'; }), 'its cardboard armor comes off');
  render();
  // The real one makes sure.
  zeppelinDown(dz, 'player');
  for (f = 0; f < 60 * 40 && !(S.banner && S.banner.s === 'dreadnought!' && CAMPAIGN.dread()); f++) update(1 / 60);
  check(/REAL/.test(S.banner.sub), 'then the real one: ' + S.banner.sub);

  emitHook = null; RUN.force = null; reset(); titleScene(); render();
})();
