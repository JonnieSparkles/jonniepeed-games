// Round 9 (SPEC-008 stage 1): kill counts, the Dreadnought on the final wave (DREAD.WAVE), victory with the roll call, then endless.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var seen = [];
  emitHook = function (type) { seen.push(type); };
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  try { localStorage.removeItem('stickarmy.wins'); localStorage.removeItem('stickarmy.bestWave'); } catch (e) { /* ignore */ }

  // Boss rotation: the Dreadnought on the final wave and every tenth wave after; zeppelins on the other fifths.
  var FINAL = DREAD.WAVE;
  check(FINAL === 15 && waveCfg(5).bossKind === 'zeppelin' && waveCfg(10).bossKind === 'zeppelin' && waveCfg(FINAL).bossKind === 'dread' &&
    waveCfg(FINAL + 5).bossKind === 'zeppelin' && waveCfg(FINAL + 10).bossKind === 'dread' && !waveCfg(FINAL - 1).bossKind, 'the Dreadnought on wave 15, then every tenth');
  check(waveCfg(FINAL).rushes === 0 && waveCfg(FINAL).cargo === 0 && !waveCfg(FINAL).road && waveCfg(FINAL).planes < waveCfg(FINAL - 1).planes / 2, 'a light escort and nothing on the ground');

  // Kill counts: a soldier's own bullet kills are his; the turret's and the sentry's are nobody's.
  RUN.force = 51; newGame(); startWave(4); S.spawn.timer = S.spawn.rushT = S.spawn.cargoT = 99;
  var gunner = makeRecruit(0, 'rifle'); S.recruits = [gunner];
  function shoot(by) {
    var t = spawnTrooper(120, 380); t.state = 'free';
    S.bullets = [{ x: t.x, y: t.y + 10, vx: 0, vy: -1, owner: by == null ? 'player' : 'ally', by: by, kind: 'bullet', life: 1, dead: false }];
    updateBullets(0.001);
    return t.dead;
  }
  check(shoot(gunner.id) && gunner.kills === 1, 'his own kill counts');
  check(shoot(null) && gunner.kills === 1, 'yours does not');

  // The final wave. The Dreadnought shows through the page, can't be hurt there, then bursts through.
  RUN.force = 52; newGame(); S.mods.maxHP = S.wallHP = 1e6; startWave(FINAL); S.spawn.timer = 99;
  check(S.banner.s === 'final wave' && /Dreadnought/.test(S.banner.sub), 'the final wave is announced');
  run(DREAD.ARRIVE + 0.05);
  var p = CAMPAIGN.dread();
  check(p && p.phase === 'emerge' && seen.indexOf('plane_spawn') >= 0, 'it starts behind the page');
  var g0 = p.turrets[0];
  damagePlane(p, 50, 'player', p.x + g0.lx, p.y + DREAD.GUN_Y, true);
  check(g0.hp === g0.max && !dreadHit(p, p.x, p.y, 0), "it can't be hurt behind the page");
  render();
  run(DREAD.EMERGE);
  check(p.phase === 'guns' && seen.indexOf('dread_arrive') >= 0, 'then it bursts through');
  render();

  // The hull and the plated bridge only clang while its guns fire.
  var b0 = p.bridge.hp;
  damagePlane(p, 50, 'player', p.x + p.bridge.lx, p.y + DREAD.BRIDGE_Y, true); damagePlane(p, 50, 'player', p.x - 60, p.y - 10, true);
  check(p.bridge.hp === b0 && p.turrets.every(function (t) { return t.hp === t.max; }), 'armor clangs');

  // A gun over the page marks a target with a flare, then fires; what it hits is gone for good.
  p.turrets.forEach(function (t) { t.cd = 99; });
  p.x = DREAD.X0; p.move = -1; S.mods.auto = true; S.mods.stacks.auto = 1; S.recruits = [];
  g0.mark = { kind: 'sentry', x: SENTRY.x, t: 0 };
  run(DREAD.MARK + DREAD.SHELL + 0.1);
  check(!S.mods.auto && !S.mods.stacks.auto && seen.indexOf('dread_hit') >= 0, 'the sentry tower is destroyed, and the shop sells it again');
  render();
  // Natural marks come from a loaded gun over the page.
  g0.cd = 0; run(0.05);
  check(g0.mark && seen.indexOf('dread_mark') >= 0, 'a loaded gun marks a target');
  // Two guns can aim at once, never at the same thing.
  var gB = p.turrets[1]; S.mods.wire = true; S.recruits = [makeRecruit(0, 'rifle')]; gB.cd = 0; run(0.05);
  check(gB.mark && (gB.mark.kind + (gB.mark.id || '')) !== (g0.mark.kind + (g0.mark.id || '')), 'a second gun takes a different target');
  gB.mark = null; gB.cd = 99; S.recruits = [];
  render();
  // Knock the gun out while it aims, and the shot never comes.
  var wall = S.wallHP; g0.mark.kind = 'wall'; g0.mark.x = BK.x;
  damagePlane(p, 999, 'player', p.x + g0.lx, p.y + DREAD.GUN_Y, true);
  check(g0.dead && !g0.mark && seen.indexOf('dread_saved') >= 0 && S.texts.some(function (q) { return q.s === 'saved!'; }), 'saved!');
  run(DREAD.MARK + DREAD.SHELL);
  check(S.wallHP === wall, 'and the wall is spared');
  // A marked soldier who goes down first spares the gun the trouble.
  var g1 = p.turrets[1], vet = makeRecruit(0, 'rifle'); S.recruits = [vet];
  g1.mark = { kind: 'recruit', id: vet.id, x: vet.x, t: 0 }; hurtRecruit(vet, 99, 'bomb'); run(0.05);
  check(!g1.mark && !vet.dead, 'no shot at the wounded');
  S.recruits = [];
  // The crew go for its guns: bazookas first.
  var baz = makeRecruit(4, 'bazooka'); S.recruits = [baz];
  p.x = 200; var tg = pickTarget(baz);
  check(tg && tg.kind === 'dreadpart' && tg.part === 'gun', 'bazookas shoot at its guns');
  S.recruits = [];
  // The air strike's bombs hit a gun they fall past.
  var g2 = p.turrets[2], hp2 = g2.hp;
  S.strikeBombs = [{ id: 9001, x: p.x + g2.lx, y: p.y + DREAD.GUN_Y - 2, vy: 10, dead: false }]; update(1 / 60);
  check(g2.hp === hp2 - 14, 'the air strike hits its guns: ' + g2.hp);

  // With every gun down the bridge is exposed and the bay drops bombs at the bunker.
  p.turrets.forEach(function (t) { if (!t.dead) damagePlane(p, 999, 'player', p.x + t.lx, p.y + DREAD.GUN_Y, true); });
  check(p.phase === 'bridge' && seen.indexOf('dread_bridge') >= 0, 'the bridge is exposed');
  p.x = DREAD.X_END + 20; S.bombs = []; p.bombT = 0; run(0.05);
  check(S.bombs.length === DREAD.BAY_BOMBS, 'the bomb bay opens');
  render();
  S.bombs = [];
  // Downing the bridge downs the ship; on the final wave everyone left surrenders and nothing more comes.
  spawnTrooper(300, 300); spawnTrooper(80, 450);
  damagePlane(p, 9999, 'player', p.x + p.bridge.lx, p.y + DREAD.BRIDGE_Y, true);
  check(p.phase === 'sinking' && S.finalWon && seen.indexOf('surrender') >= 0, 'down it goes, and they surrender');
  check(S.troopers.every(function (t) { return t.dead; }) && S.spawn.planes === 0 && S.spawn.boss === 0, 'nothing left, nothing more coming');
  render();
  run(DREAD.SINK + 0.1); check(p.phase === 'retreat', 'it falls back through the page'); render();
  run(DREAD.FALL + 0.2);
  check(!CAMPAIGN.dread() && S.waveState === 'clear' && S.banner.s === 'victory!', 'victory');
  run(3.4);

  // The victory card: the score, the record and the roll call; wins are saved.
  check(S.mode === 'won' && !winScreen.hidden && seen.indexOf('victory') >= 0 && S.won && S.wonAt === FINAL, 'the victory card');
  check(load('stickarmy.wins', 0) === 1 && /Won once/.test(recordLine()), 'the win is saved');

  // The roll call: survivors with ranks, waves and kills, the top gun starred; the fallen listed.
  var sgt = makeRecruit(0, 'rifle'); sgt.rank = 3; sgt.name = 'Doodle'; sgt.waves = 14; sgt.kills = 40;
  var rook = makeRecruit(1, 'rifle'); rook.waves = 2; rook.kills = 55; S.recruits = [sgt, rook];
  var roll = rollCall();
  check(roll.length === 2 && roll[0].text === 'Sgt. Doodle (14 waves, 40 kills)' && roll[1].top && !roll[0].top, 'the roll call');

  // Keep going: the shop, then the next wave in endless.
  keepGoing();
  check(S.mode === 'shop' && S.endless && winScreen.hidden, 'keep going opens the shop');
  continueWave(); S.spawn.timer = 99;
  check(S.wave === FINAL + 1 && S.mode === 'play' && S.banner.s === 'wave ' + (FINAL + 1), 'endless after the final wave');
  render();
  // A loss after winning says so, and the best wave is kept.
  hurtWall(S.wallHP + 1, 'bomb'); update(1 / 60); run(2);
  check(S.mode === 'over' && !document.getElementById('overWon').hidden && document.getElementById('overWon').textContent.indexOf('won at wave ' + FINAL) >= 0, 'the game-over card remembers the win');
  check(load('stickarmy.bestWave', 0) === FINAL + 1, 'best wave saved');
  overScreen.hidden = true;
  titleScene();
  check(!document.getElementById('winLine').hidden && document.getElementById('winLine').textContent.indexOf('Won once · best wave ' + (FINAL + 1)) >= 0, 'the title card shows the record');

  try { localStorage.removeItem('stickarmy.wins'); localStorage.removeItem('stickarmy.bestWave'); } catch (e) { /* ignore */ }
  emitHook = null; RUN.force = null; reset(); render();
})();
