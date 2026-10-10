// Playtest round 3: a zeppelin boss every fifth wave.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  RUN.force = 5;
  var i;

  // Boss waves come every fifth wave and trade the bombers and half the planes for one zeppelin.
  check(!waveCfg(4).boss && waveCfg(5).boss === 1 && !waveCfg(6).boss && waveCfg(10).boss === 1, 'a zeppelin every fifth wave');
  check(waveCfg(5).bombers === 0 && waveCfg(5).planes === Math.round((5 + BALANCE.PLANES_PER_WAVE * 5) / 2), 'a lighter escort on boss waves');

  newGame(); S.mods.maxHP = S.wallHP = 1e6; startWave(5);
  check(/zeppelin/.test(S.banner.sub) && /gondola/.test(S.banner.sub), 'the boss wave is announced, with a hint');
  // A few escort planes come first; the horn and a red callout warn before it arrives.
  function zep() { return S.planes.find(function (p) { return p.kind === 'zeppelin'; }); }
  var heard = [], hook = emitHook; emitHook = function (type) { heard.push(type); };
  for (i = 0; i < Math.round((ZEP.ARRIVE - ZEP.WARN) * 60) - 6; i++) update(1 / 60);
  check(!zep() && heard.indexOf('zeppelin_warning') < 0 && waveCfg(5).planes - S.spawn.planes >= 3, 'escort planes come first');
  for (i = 0; i < 12; i++) update(1 / 60);
  check(!zep() && heard.indexOf('zeppelin_warning') >= 0 && S.texts.some(function (q) { return q.s === 'zeppelin incoming!' && q.kind === 'alert'; }), 'a horn and a callout warn of it');
  for (i = 0; i < Math.round((ZEP.WARN + 1.5) * 60); i++) update(1 / 60);
  emitHook = hook;
  var z = zep();
  check(z && z.maxHp === zeppelinHP(5) && z.hp === z.maxHp && z.maxHp === 60, 'it arrives with wave-scaled health');
  render();

  // Left alone, it patrols, drops troopers and bomb clusters, and holds the wave open.
  var troopers = {}, bombs = {}, lo = z.x, hi = z.x;
  for (i = 0; i < 3600; i++) {
    update(1 / 60);
    S.troopers.forEach(function (t) { if (t.zep === z.id) troopers[t.id] = 1; });
    S.bombs.forEach(function (m) { bombs[m.id] = 1; });
    lo = Math.min(lo, z.x); hi = Math.max(hi, z.x);
  }
  check(S.planes.indexOf(z) >= 0 && z.state === 'fly' && S.waveState === 'active', 'it stays until shot down');
  check(Object.keys(troopers).length >= 10 && Object.keys(bombs).length >= 15, 'it drops troopers and bomb clusters');
  check(lo < 110 && hi > 290 && hi < W + 100, 'it patrols back and forth across the page');
  check(ambienceState().planes.some(function (p) { return p.kind === 'zeppelin'; }), 'the ambience hears it');

  // Turning is a flip through zero width.
  S.planes = [z]; S.troopers = []; S.bombs = [];
  z.x = ZEP.RIGHT + 1; z.dir = 1; z.face = 1;
  update(1 / 60); check(z.dir === -1, 'it turns at the edge of its patrol');
  for (i = 0; i < 60; i++) update(1 / 60);
  check(z.face < 0, 'and comes back the other way');

  // The hull is an ellipse with a gondola, not a box.
  z.x = 200; z.y = 160; z.face = 1;
  check(planeHit(z, 200 + z.hw - 6, 160, 0), 'the nose is solid');
  check(!planeHit(z, 200 + z.hw - 4, 160 - z.hh + 3, 0), 'the empty corner of its box is not');
  check(planeHit(z, 200, 160 + z.hh + 10, 0), 'the gondola is solid');

  // Hits leave holes; flak and rockets count too.
  var hp = z.hp, bullet = { x: 230, y: 165, vx: 0, vy: -700, owner: 'player', kind: 'bullet', pierce: 1, hits: [], life: 1, dead: false };
  hitTest(bullet);
  check(z.hp === hp - 1 && bullet.dead && z.holes.length >= 1, 'a bullet hits and leaves a hole');
  explode(z.x, z.y + z.hh + 4, 24, 'flak', 'player');
  check(z.hp === hp - 2, 'flak bursts hurt it (blasts never count as weak-spot hits)');
  hp = z.hp; hitTest({ x: z.x, y: z.y + z.hh + 8, vx: 0, vy: -700, owner: 'player', kind: 'bullet', pierce: 1, hits: [], life: 1, dead: false });
  check(z.hp === hp - ZEP.WEAK && ZEP.WEAK === 2 && inGondola(z, z.x, z.y + z.hh + 8), 'a direct shot on the gondola does double damage');

  // Half health makes it angry: faster, and it sinks toward the page.
  z.hp = z.maxHp / 2 + 0.5; hurtZeppelin(z, 1, 'player', 200, 160);
  check(z.angry, 'half health makes it angry');
  for (i = 0; i < 300; i++) update(1 / 60);
  check(z.speed > ZEP.SPEED + 6 && z.baseY > ZEP.Y + 15, 'angry and sinking');
  render();

  // Idle rifles plink at it.
  z.x = 200; S.troopers = []; S.bombs = []; S.recruits = [makeRecruit(0, 'rifle')];
  check(pickTarget(S.recruits[0]) === z, 'idle rifles shoot at the zeppelin');
  S.recruits = [];

  // Shooting it down pays out, its crew bail out, and it crashes.
  var score = S.score, tags = S.coins, downed = S.stats.planes, before = S.troopers.length;
  z.hp = 1; damagePlane(z, 1, 'player', 200, 160);
  check(z.state === 'fall' && S.score >= score + 250 + 30 * 5 && S.coins > tags && S.stats.planes === downed + 1, 'shooting it down pays out');
  check(S.troopers.length - before === 3 && S.banner.s === 'zeppelin down!', 'its crew bail out');
  render();
  for (i = 0; i < 600 && S.planes.indexOf(z) >= 0; i++) update(1 / 60);
  check(S.planes.indexOf(z) < 0, 'it crashes and is cleared');
  check(S.troopers.filter(function (t) { return t.zep === z.id && !t.dead; }).length === 3, 'it does not flatten its own bailing crew');

  // With the zeppelin gone, the wave can clear.
  S.troopers.forEach(function (t) { t.dead = true; }); S.planes = []; S.bombs = []; S.enemyShots = []; S.spawn.planes = 0;
  for (i = 0; i < 300 && S.mode === 'play'; i++) update(1 / 60);
  check(S.mode === 'shop' && S.wave === 5, 'the boss wave clears once it is down');

  S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
  RUN.force = null; reset(); render();
})();
