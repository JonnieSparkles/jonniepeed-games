// Campaign stages 2-3 (campaign.md), on the 20-wave schedule: bomb balloons (4), the Red Cross plane (6), helicopters (7), HQ
// drops (8), the armored zeppelin (10), dive bombers (12), and the little voices. Heavy bombers (13): case-21.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var seen = [];
  emitHook = function (type, data) { seen.push({ type: type, data: data }); };
  function heard(type, test) { return seen.some(function (e) { return e.type === type && (!test || test(e.data)); }); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  // A quiet wave: nothing spawns unless the test spawns it, and the wall can't fall.
  function quiet(n) {
    newGame(); startWave(n); S.mods.maxHP = S.wallHP = 1e6; S.banner = null;
    var sp = S.spawn; sp.timer = sp.rushT = sp.cargoT = sp.roadT = sp.bossT = 99;
    var k = sp.sky; k.medevacT = k.balloonT = k.crateT = k.diverT = k.heliT = k.heavyT = 99;
    S.recruits = []; S.mods.auto = false; S.texts = []; seen = [];
  }
  function playerShot(x, y) { return { x: x, y: y, vx: 0, vy: -1, owner: 'player', kind: 'bullet', life: 1, dead: false }; }
  function allyShot(x, y) { return { x: x, y: y, vx: 0, vy: -1, owner: 'ally', kind: 'bullet', life: 1, dead: false }; }

  // The schedule: something new every couple of waves, more of each later, none of the enemies with the Dreadnought.
  check(!waveCfg(3).balloons && waveCfg(4).balloons >= 2 && waveCfg(13).balloons > waveCfg(4).balloons, 'bomb balloons from wave 4');
  check(!waveCfg(5).medevac && waveCfg(6).medevac === 1 && waveCfg(12).medevac === 2 && waveCfg(17).medevac === 3, 'the Red Cross plane from wave 6');
  check(!waveCfg(7).crates && waveCfg(8).crates === 1 && waveCfg(DREAD.WAVE).crates >= 1, 'HQ crates from wave 8, even on the final wave');
  check(!waveCfg(11).divers && waveCfg(12).divers >= 2 && waveCfg(19).divers > waveCfg(14).divers, 'dive bombers from wave 12');
  check(!waveCfg(6).helis && waveCfg(7).helis === 1 && waveCfg(15).helis > waveCfg(7).helis, 'helicopters from wave 7');
  check(!waveCfg(12).heavies && waveCfg(13).heavies === 1 && waveCfg(21).heavies > waveCfg(13).heavies, 'heavy bombers from wave 13');
  check(['medevac', 'balloons', 'divers', 'helis', 'heavies'].every(function (k) { return !waveCfg(DREAD.WAVE)[k] && !waveCfg(DREAD.WAVE + DREAD.EVERY)[k]; }), 'none of them with the Dreadnought');
  check(waveCfg(29).divers + waveCfg(29).helis + waveCfg(29).bombers > waveCfg(19).divers + waveCfg(19).helis + waveCfg(19).bombers, 'endless keeps ramping');

  // The Red Cross plane: the crew's fire passes it by; your turret's first hit costs tags and the combo, once.
  RUN.force = 61; quiet(6); S.coins = 100; S.combo = 3; S.comboT = 1;
  var med = SKY.spawnMedevac(RW); med.x = 200;
  check(S.texts.some(function (q) { return /Red Cross/.test(q.s); }), 'the first one says so');
  var b = allyShot(med.x, med.y); S.bullets = [b]; hitTest(b);
  check(!b.dead && S.coins === 100 && !med.hit, "the crew's fire passes it by");
  b = playerShot(med.x, med.y); hitTest(b);
  check(b.dead && med.hit && S.coins === 100 - Math.round(SKY.MEDEVAC.TAGS * SKY.MEDEVAC.HIT) && S.combo === 0 && heard('redcross_hit'), 'your hit costs tags and the combo');
  b = playerShot(med.x, med.y); hitTest(b);
  check(!b.dead && S.coins === 100 - Math.round(SKY.MEDEVAC.TAGS * SKY.MEDEVAC.HIT), 'only once');
  var x0 = med.x; run(0.5);
  check(Math.abs(med.x - x0) > SKY.MEDEVAC.SPEED * 0.5 * 2, 'then it flees');
  render();
  check(!S.planes.length, 'it is not an enemy plane');

  // Bomb balloons drift to the bunker and let go over it.
  RUN.force = 62; quiet(4);
  var bal = SKY.spawnBalloon(RW); bal.x = bal.targetX - bal.dir * 30; bal.baseY = bal.y = 400;
  run(30 / SKY.BALLOON.SPEED + 0.2);
  check(!S.planes.length && S.bombs.some(function (m) { return m.balloon; }) && S.skyFx.length === 1, 'it lets go over the bunker and floats off');
  render();
  run(1.6);
  check(heard('wall_damage', function (d) { return d.source === 'balloon'; }), 'its bomb hits the wall');
  // Popped over the enemy, its bomb lands on them.
  RUN.force = 63; quiet(4);
  bal = SKY.spawnBalloon(RW); bal.x = 330; bal.baseY = bal.y = 470;
  var foe = spawnTrooper(330, GROUND - 33); land(foe);
  damagePlane(bal, 1, 'player', bal.x, bal.y, true);
  check(heard('plane_down', function (d) { return d.kind === 'balloon'; }) && S.bombs.length === 1, 'popped, it drops its bomb');
  run(1.2);
  check(foe.dead && S.wallHP === 1e6, 'on whoever is under it');
  // The crew and the sentry leave balloons alone.
  RUN.force = 64; quiet(4); S.mods.auto = true;
  bal = SKY.spawnBalloon(RW); bal.x = 160; bal.baseY = bal.y = 400; var rifle = makeRecruit(1, 'bazooka'); S.recruits = [rifle];
  check(pickTarget(rifle) !== bal && sentryTarget() !== bal, 'nobody pops a balloon over the squad');

  // HQ supply drops: a blue plane flies low and drops a crate beside the bunker; nothing can shoot either; the nearest
  // free soldier runs out and fetches it.
  RUN.force = 65; quiet(8);
  var hq = SKY.spawnCrate(RW); hq.kind = 'tags';
  check(S.hq.length === 1 && !S.crates.length, "HQ's plane comes in");
  for (var f = 0; f < 600 && !S.crates.length; f++) update(1 / 60);
  var c = S.crates[0];
  check(c && c.state === 'chute' && Math.abs(c.x - BK.x) > 40 && c.kind === 'tags', 'it drops a crate beside the bunker');
  b = playerShot(c.x, c.y - 18); hitTest(b); var b2 = playerShot(hq.x, hq.y); hitTest(b2);
  check(!b.dead && !b2.dead && c.state === 'chute', 'shots pass them by');
  render();
  var fetcher = makeRecruit(c.x < BK.x ? 0 : 4, 'rifle'), tags = S.coins; S.recruits = [fetcher];
  for (f = 0; f < 900 && S.crates.length; f++) { update(1 / 60); if (fetcher.role === 'fetch') var ran = true; }
  check(ran && heard('crate_caught', function (d) { return d.by === 'crew'; }) && S.coins >= tags + SKY.CRATE.TAGS, 'a soldier runs out and fetches it');
  run(4); check(Math.abs(fetcher.x - fetcher.homeX) < 1, 'and goes back to his post');
  // With no squad, it's collected where it lands: here a wall patch.
  quiet(8); hq = SKY.spawnCrate(RW); hq.kind = 'wall'; S.wallHP = S.mods.maxHP - 100;
  run(10);
  check(S.wallHP === S.mods.maxHP - 100 + SKY.CRATE.WALL && heard('crate_caught', function (d) { return d.by === 'none'; }), 'with no squad it is collected where it lands');
  // A radio call.
  quiet(8); hq = SKY.spawnCrate(RW); hq.kind = 'call'; hq.call = 'fighter'; S.calls = { bomber: 0, fighter: 0 }; run(10);
  check(S.calls.fighter === 1, 'a radio call');
  // The wave waits for a drop in the air.
  quiet(8); hq = SKY.spawnCrate(RW); S.spawn.planes = S.spawn.bombers = S.spawn.rushes = S.spawn.sky.balloons = S.spawn.sky.helis = 0; S.planes = []; S.troopers = []; update(1 / 60);
  check(S.waveState === 'active' && S.spawn.sky.crates === 0, 'a drop on its way holds the wave open');
  render();

  // The armored zeppelin: plates clang until shot off, and the gondola is plated until half health.
  RUN.force = 66; newGame(); startWave(10); check(/armored zeppelin/.test(S.banner.sub), 'the banner says armored'); quiet(10);
  var z = spawnZeppelin(); z.x = 200; z.face = z.dir = 1; z.entered = true;
  check(z.armored && z.shield && z.plates.length === ZEP.PLATES.length, 'it comes armored');
  var mid = z.plates[2], hp0 = z.hp;
  damagePlane(z, 1, 'player', z.x, z.y - 4, true);
  check(z.hp === hp0 && mid.hp === ZEP.PLATE_HP - 1, 'the plate takes the hit');
  for (var i = 0; i < ZEP.PLATE_HP; i++) damagePlane(z, 1, 'player', z.x, z.y - 4, true);
  check(mid.hp === 0 && heard('zeppelin_plate') && z.hp < hp0, 'shot off, the hull behind it is open');
  hp0 = z.hp; damagePlane(z, 1, 'player', z.x, z.y + z.hh + 8, true);
  check(z.hp === hp0, 'the gondola is plated');
  render();
  damagePlane(z, z.hp - z.maxHp / 2 + 0.5, 'player', z.x, z.y - 4, true);
  check(z.angry && !z.shield && heard('zeppelin_open'), 'at half health the gondola opens');
  hp0 = z.hp; damagePlane(z, 1, 'player', z.x, z.y + z.hh + 8, true);
  check(hp0 - z.hp === ZEP.WEAK, 'and the weak spot works');
  render();
  // Before wave 10 they come unarmored.
  quiet(5); z = spawnZeppelin(); check(!z.armored && !z.plates, 'plain before wave 10');

  // Dive bombers: in level with the siren, a steep dive, a heavy bomb on the target.
  RUN.force = 67; quiet(12);
  var d = SKY.spawnDiver(RW);
  check(d.phase === 'level' && Math.abs(d.target - BK.x) < 10, 'with no squad it goes for the bunker');
  for (i = 0; i < 600 && !S.bombs.length; i++) update(1 / 60);
  check(S.bombs.length === 1 && S.bombs[0].heavy && d.phase === 'pull', 'it lets its bomb go and pulls out');
  render();
  run(1);
  check(heard('wall_damage', function (e) { return e.source === 'dive' && e.amount === SKY.DIVE.WALL; }), 'the heavy bomb lands on the bunker');
  // Two hits down it.
  quiet(12); d = SKY.spawnDiver(RW); run(0.5);
  damagePlane(d, 2, 'player'); check(d.state === 'fly', 'two hits');
  damagePlane(d, 1, 'player'); check(d.state === 'fall' && heard('plane_down', function (e) { return e.kind === 'diver'; }), 'three hits down it');
  render();
  run(4); check(!S.planes.length, 'and it crashes');

  // Helicopters: hover near an edge, lower troopers on ropes, and the door gunner fires at the crew.
  RUN.force = 68; quiet(7);
  var medic = makeRecruit(4, 'medic'); S.recruits = [medic];
  var h = SKY.spawnHeli(RW), kits = h.kits.length;
  check(kits >= 4 && kits <= 5 && h.hp === SKY.heliHP(7) && SKY.heliHP(15) > SKY.heliHP(7) && (h.hoverX < 100 || h.hoverX > 300), 'it heads for a hover near an edge');
  for (var hf = 0; hf < 600 && h.phase === 'in'; hf++) update(1 / 60);
  check(hf < 180, 'it comes in quickly: ' + hf);
  run(0.6);
  check(h.phase === 'drop' && S.troopers.some(function (t) { return t.state === 'rope'; }), 'it lowers troopers on a rope');
  render();
  run(0.5);
  check(medic.hp < crewMax(medic) || medic.down || S.enemyShots.length > 0, 'the door gunner fires at the crew');
  run(3.5);
  check(heard('land') && !S.troopers.some(function (t) { return t.state === 'rope'; }) && (h.phase === 'wait' || h.phase === 'out' || h.gone), 'they reach the ground, and it leaves');
  // Shoot it down and anyone on the rope falls; over a mat, that's a catch.
  RUN.force = 69; quiet(13); S.mods.slots = 4;
  h = SKY.spawnHeli(RW); h.side = -1; h.dir = 1; h.hoverX = h.x = (TRAMPS[0].x1 + TRAMPS[0].x2) / 2; h.hoverY = 330; h.y = 330;
  run(0.9);
  check(S.troopers.some(function (t) { return t.state === 'rope'; }), 'one on the rope');
  damagePlane(h, h.hp, 'player');
  check(h.state === 'fall' && S.troopers.every(function (t) { return t.state !== 'rope'; }), 'down it comes, and he drops');
  var caught = S.stats.captured; run(2.5);
  check(S.stats.captured > caught, 'onto the mat: a catch');
  // Rope troopers are fair game for the crew.
  quiet(13); var t2 = spawnTrooper(120, 420); t2.state = 'rope'; t2.fall = SKY.HELI.ROPE; var rf = makeRecruit(0, 'rifle'); S.recruits = [rf];
  check(pickTarget(rf) === t2, 'the crew shoot troopers off the rope');

  // Little voices: the radio caller, a soldier who goes down, and the enemy charging.
  var said = [], realSay = sound.say;
  sound.say = function (text, id, enemy) { said.push({ text: text, id: id, enemy: !!enemy }); };
  try {
    RUN.force = 70; quiet(6); var cpl = makeRecruit(0, 'rifle'); cpl.rank = 2; cpl.name = 'Inky'; S.recruits = [cpl];
    S.calls.bomber = 1; callStrike();
    check(said.some(function (s) { return s.text === 'air strike!' && s.id === cpl.id && !s.enemy; }), 'the caller says it');
    hurtRecruit(cpl, 99, 'bomb');
    check(said.some(function (s) { return s.text === 'medic!' && s.id === cpl.id; }), 'a soldier going down calls for a medic');
    spawnRush();
    check(said.some(function (s) { return s.text === 'charge!' && s.enemy; }), 'the enemy charges');
  } finally { sound.say = realSay; }

  emitHook = null; RUN.force = null; reset(); render();
})();
