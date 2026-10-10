// Round 14 (after the first win): the fighting stays on the page, the decoy's armor takes a few knocks, dive bombs
// let go sooner and say when they land, low helicopters drop their troopers sooner and faster, tougher heavy
// bombers, a Red Cross plane worth more either way, sandbags you can see, the squad in the shop, a score that fits
// beside the wave label, and more small talk.
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
    S.recruits = []; S.mods.auto = false; S.texts = []; S.bubbles = []; seen = [];
  }
  function playerShot(x, y) { return { x: x, y: y, vx: 0, vy: -1, owner: 'player', kind: 'bullet', life: 1, dead: false }; }
  function stub(values, fn) { var real = Math.random, i = 0; Math.random = function () { return values[Math.min(i++, values.length - 1)]; }; try { fn(); } finally { Math.random = real; } }

  // ---- The fighting stays on the page: nothing is hit where you can't see it.
  RUN.force = 150; quiet(8);
  spawnPlane('plane'); var pl = S.planes[0]; pl.dir = 1; pl.x = -pl.hw - 2; var hp0 = pl.hp;
  var off = playerShot(-5, pl.y); hitTest(off);
  check(!off.dead && pl.hp === hp0, 'shots off the page hit nothing');
  explode(6, pl.y, 34, 'rocket', 'player');
  check(pl.state === 'fly' && pl.hp === hp0, "a blast at the edge passes by a plane that doesn't show yet");
  pl.x = -10;
  check(!UNITS.fighterTarget(-40, pl.y, 1), "fighter cover doesn't pick a plane with its middle off the page");
  hitTest(playerShot(4, pl.y));
  check(pl.state !== 'fly' || pl.hp < hp0, 'a shot that hits it where it shows counts');
  // The Red Cross plane too.
  S.planes = []; S.troopers = []; S.coins = 100; var med = SKY.spawnMedevac(RW); med.x = -10;
  hitTest(playerShot(10, med.y));
  check(!med.hit && S.coins === 100, 'nor the Red Cross plane');
  S.medevac = [];
  // The crew don't aim at a tank still rolling in off the page.
  S.tanks = []; spawnRoadTank(); var tk = S.tanks[0]; S.tanks = [tk]; S.troopers = []; tk.x = -20;
  var baz = makeRecruit(0, 'bazooka'); S.recruits = [baz];
  check(pickTarget(baz) !== tk, "the crew don't aim at a tank off the page");
  tk.x = 30; check(pickTarget(baz) === tk, 'but do once it shows');
  S.tanks = []; S.troopers = []; S.recruits = [];
  // Bombers hold their bombs until they're over the page.
  for (var i = 0; i < 40; i++) spawnPlane('bomber');
  check(S.planes.every(function (p) { return p.bombRun.every(function (d) { return d.x >= BOMB_EDGE && d.x <= W - BOMB_EDGE; }); }), 'bombers drop over the page');
  S.planes = [];

  // ---- The decoy's cardboard armor takes PLATE.KNOCKS knocks, at most one every PLATE.GAP seconds, then comes off.
  RUN.force = 52; newGame(); S.mods.maxHP = S.wallHP = 1e6; S.recruits = [makeRecruit(0, 'rifle')]; startWave(DREAD.WAVE); S.spawn.timer = 99;
  var chirp = false;
  for (var f = 0; f < 60 * 40 && !S.spawn.decoySeen; f++) { update(1 / 60); chirp = chirp || S.bubbles.some(function (b) { return b.s === 'Oh no... here it comes!' && b.rid != null; }); }
  check(chirp, 'a squad chirp as the decoy comes: "Oh no... here it comes!"');
  var dz = S.spawn.decoy, P = UNITS.PLATE; S.texts = []; S.bubbles = [];
  var dx0 = dz.x; dz.x = dz.face > 0 ? -P.X : W + P.X;
  damagePlane(dz, 1, 'player', dz.x, dz.y, true);
  check(!dz.knocks, "no knock while the plate itself isn't on the page");
  dz.x = dx0; S.t += P.GAP + 0.01;
  damagePlane(dz, 1, 'player', dz.x, dz.y, true);
  check(!dz.plateOff && dz.knocks === 1 && S.texts.some(function (q) { return q.s === 'tonk!'; }) && S.bubbles.some(function (b) { return /^Solid steel/.test(b.s) && b.enemy; }), 'the first knock rattles it: "solid steel!"');
  damagePlane(dz, 1, 'player', dz.x, dz.y, true);
  check(dz.knocks === 1, 'hits closer together count as one knock');
  for (var kn = 2; kn <= P.KNOCKS; kn++) { S.t += P.GAP + 0.01; damagePlane(dz, 1, 'player', dz.x, dz.y, true); }
  check(!dz.plateOff && dz.knocks === P.KNOCKS, 'it holds for ' + P.KNOCKS + ' knocks');
  render();
  S.t += P.GAP + 0.01; damagePlane(dz, 1, 'player', dz.x, dz.y, true);
  check(dz.plateOff && S.parts.some(function (q) { return q.k === 'plate' && q.dents === P.KNOCKS; }), 'the next knocks it off, dents and all');
  render();
  // It goes down without "zeppelin down!", label or banner, though it still pays.
  S.texts = []; S.banner = null; var dsc = S.score; UNITS.zeppelinDown(dz, 'player');
  check(!S.texts.some(function (q) { return /zeppelin down/.test(q.s); }) && !(S.banner && S.banner.s === 'zeppelin down!') && S.score > dsc, 'the decoy goes down quietly');

  // ---- Dive bombers let go sooner, and a bomb on the wall says so.
  RUN.force = 151; quiet(12);
  check(SKY.DIVE.RELEASE_Y === 320, 'they let go at 320');
  var dv = SKY.spawnDiver(RW), bomb = null, said = false, wall0 = S.wallHP;
  for (f = 0; f < 60 * 12 && !(bomb && bomb.dead); f++) {
    update(1 / 60);
    if (!bomb) { bomb = S.bombs.find(function (m) { return m.src === 'dive'; }); if (bomb) check(bomb.y >= 320 && bomb.y < 345, 'released at the new height: ' + Math.round(bomb.y)); }
    said = said || S.texts.some(function (q) { return q.s === 'direct hit!'; });
  }
  check(bomb && bomb.dead && wall0 - S.wallHP === SKY.DIVE.WALL && said && heard('wall_damage', function (d) { return d.source === 'dive'; }), 'it still lands on its mark: "direct hit!"');

  // ---- Low helicopters drop their troopers sooner and faster, over the near half, never on the bunker.
  RUN.force = 152; quiet(12); var h = null;
  for (var s = 0; s < 40 && !h; s++) { var c = SKY.spawnHeli(RW); if (c.phase === 'sweep') h = c; else S.planes = []; }
  var SW = SKY.HELI.SWEEP, edge = h.dir > 0 ? 0 : W, d = h.hops.map(function (x) { return Math.abs(x - edge); });
  check(d[0] >= SW.FIRST[0] - 0.01 && d[0] <= SW.FIRST[1] + 0.01, 'the first hops out soon after it comes in: ' + Math.round(d[0]));
  check(d.every(function (v) { return v <= BK.x; }) && h.hops.every(function (x) { return Math.abs(x - BK.x) >= 43.99; }), 'over the near half, never on the bunker');
  var t0 = S.t;
  for (f = 0; f < 60 * 6 && h.kits.length; f++) update(1 / 60);
  check(!h.kits.length && S.t - t0 < 2.4, 'all out quickly: ' + (S.t - t0).toFixed(2) + ' s');

  // ---- Heavy bombers are about an eighth tougher.
  check(SKY.heavyHP(13) === 50 && SKY.heavyHP(16) === 61 && SKY.heavyHP(19) === 71, 'tougher heavy bombers');

  // ---- The Red Cross plane: a wave bonus in points and its tags across; hit, the same points and 1.5x the tags.
  RUN.force = 153; quiet(14); S.coins = 0; S.score = 5000;
  med = SKY.spawnMedevac(RW); med.x = W + 60; med.dir = 1; run(0.5);
  check(S.score === 5000 + 1400 && S.coins === SKY.medevacTags(14) && heard('redcross_safe', function (e) { return e.pts === 1400; }), 'safe passage pays: ' + S.score + ', ' + S.coins);
  S.coins = 200; S.score = 5000; med = SKY.spawnMedevac(RW); med.x = 200;
  hitTest(playerShot(med.x, med.y));
  check(S.score === 5000 - 1400 && S.coins === 200 - 75 && heard('redcross_hit', function (e) { return e.pts === 1400 && e.lost === 75; }), 'a hit costs points and tags: ' + S.score + ', ' + S.coins);
  S.score = 300; med = SKY.spawnMedevac(RW); med.x = 200; hitTest(playerShot(med.x, med.y));
  check(S.score === 0, 'never below zero');
  S.medevac = [];

  // ---- Sandbags are drawn: stacked against the front of the bunker, a layer a stack.
  RUN.force = 154; newGame(); S.banner = null; S.sketches = []; S.planes = [];
  function bag(px) { return Math.abs(px[0] - 221) < 12 && Math.abs(px[2] - 168) < 14; }
  function at(x, y) { return ctx.getImageData(x * K, y * K, 1, 1).data; }
  // Inside the bags, clear of their tie marks: the top layer's left bag, and the outer bags of the bottom layer.
  S.mods.stacks.sandbags = 3; render();
  var top3 = at(BAGS[3][0] - 4, GROUND - 21);
  S.mods.stacks.sandbags = 4; render();
  var top4 = at(BAGS[3][0] - 4, GROUND - 21), left = at(BAGS[0][0] + 3, GROUND - 3), right = at(BAGS[0][4] + 3, GROUND - 3);
  check(!bag(top3) && bag(top4), 'the fourth layer tops the pile: ' + Array.from(top3) + ' then ' + Array.from(top4));
  check(bag(left) && bag(right) && BAGS[0][0] > BK.x1 && BAGS[0][4] < BK.x2, 'across the front of the bunker: ' + Array.from(left) + ' / ' + Array.from(right));
  check(SKETCH.DRAWN.indexOf('sandbags') >= 0, 'sketched in when bought');

  // ---- The squad in the shop: every slot, and names, waves and kills; it follows what you hire.
  RUN.force = 155; newGame(); S.coins = 500;
  var vet = makeRecruit(0, 'rifle'); vet.rank = 2; vet.name = 'Doodle'; vet.waves = 7; vet.kills = 12;
  S.recruits = [vet, makeRecruit(1, 'engineer')];
  openShop();
  var row = document.getElementById('shopSquadRow'), line = document.getElementById('shopSquad');
  check(row.width === (24 * S.mods.slots + 12) * 2 && /^Cpl\. Doodle \(7 waves, 12 kills\), 1 rookie\.$/.test(line.textContent), 'the shop shows the squad: ' + line.textContent);
  takeItem('hire-rifle');
  check(/2 rookies/.test(line.textContent), 'and follows a hire: ' + line.textContent);
  SHOP.undo();
  check(/1 rookie\./.test(line.textContent), 'and a put-back');
  S.recruits = []; SHOP.renderShop();
  check(/^Nobody yet/.test(line.textContent), 'or says nobody yet');
  shopScreen.hidden = true; S.shop = null; S.mode = 'play';

  // ---- The score shrinks to fit beside the wave label.
  [[446661, 20], [1234567, 31]].forEach(function (c) {
    RUN.force = 156; newGame(); S.banner = null; S.planes = []; S.wave = c[1]; S.score = c[0]; render();
    ctx.save(); ctx.font = '26px ' + HAND; var left = 200 - ctx.measureText('wave ' + c[1]).width / 2; ctx.restore();
    var ink = 0;
    for (var x = Math.ceil(left - HUD_GAP + 2); x < left - 1; x++) for (var y = 32; y < 60; y++) {
      var px = ctx.getImageData(x * K, y * K, 1, 1).data; if (px[0] + px[1] + px[2] < 360) ink++;
    }
    check(!ink, c[0].toLocaleString('en-US') + ' stops short of "wave ' + c[1] + '": ' + ink);
  });

  // ---- Small talk: in a quiet moment, now and then; a reply; the night raid; an overheated gun; Master Sergeant.
  RUN.force = 157; quiet(8); S.recruits = [makeRecruit(0, 'rifle'), makeRecruit(5, 'rifle')]; S.talk = null;
  stub([0], function () {
    SQUAD.smallTalk(0); S.talk.next = 0;
    for (f = 0; f < 60 * 3 && !S.bubbles.length; f++) SQUAD.smallTalk(1 / 60);
  });
  check(S.bubbles.length === 1 && S.bubbles[0].s === 'Who keeps erasing my legs?' && f >= 60 * SQUAD.TALK.QUIET - 1, 'someone says something once it has been quiet a while');
  check(S.talk.next >= SQUAD.TALK.GAP[0], 'then not again for a while');
  S.bubbles = []; S.talk.next = 0; S.talk.quiet = SQUAD.TALK.QUIET;
  S.talk.used = SQUAD.TALK.LINES.map(function (l, i) { return l.length === 1 ? i : -1; });
  stub([0], function () { SQUAD.smallTalk(1 / 60); });
  check(S.bubbles.length === 2 && S.bubbles[0].rid !== S.bubbles[1].rid && S.bubbles[1].t < 0, 'sometimes another answers: ' + S.bubbles.map(function (b) { return b.s; }).join(' / '));
  S.bubbles = []; S.planes = [{ x: 100, y: 100 }]; S.talk.next = 0; S.talk.quiet = 0;
  SQUAD.smallTalk(1 / 60);
  check(!S.bubbles.length, 'not while anything is on the page');
  S.planes = [];
  // An overheated gun, now and then.
  S.overheat = 0; S.talk.heatT = -1e9; stub([0], function () { triggerOverheat(); });
  check(S.bubbles.some(function (b) { return b.s === 'Easy on the trigger!'; }), 'an overheated gun gets a word');
  S.bubbles = []; S.overheat = 0; stub([0], function () { triggerOverheat(); });
  check(!S.bubbles.length, 'but not every time');
  // Making Master Sergeant.
  var sarge = S.recruits[0]; sarge.name = 'Doodle'; sarge.rank = 4; sarge.waves = 17; S.bubbles = [];
  serveWave([]);
  check(sarge.rank === 5 && S.bubbles.some(function (b) { return b.s === 'Master Sergeant of the page!'; }), 'Master Sergeant of the page!');
  // Speech never shifts the ids of things in the fight.
  var id0 = nextId; speak('hello', sarge.id);
  check(nextId === id0, 'speech has its own ids');
  // The night raid, as it gets dark.
  RUN.force = 158; quiet(16); S.recruits = [makeRecruit(0, 'rifle')]; S.night = 1;
  SQUAD.smallTalk(1 / 60);
  check(S.bubbles.some(function (b) { return b.s === 'Who turned off the lamp?'; }), 'the night raid: who turned off the lamp?');
  S.bubbles = []; SQUAD.smallTalk(1 / 60);
  check(!S.bubbles.length, 'once a night');

  // ======== The second pass (after the second win) ========

  // ---- Rounds fired: every bullet and rocket from your turret, on both end cards and in play stats.
  RUN.force = 160; newGame(); S.mods.double = true; S.mods.spread = true; S.mods.rockets = true; S.volleys = 3;
  shoot();
  check(S.stats.shots === 7, 'one pull with the double barrel, spread shot and a rocket fires seven: ' + S.stats.shots);
  check(runReport().stats.shots === 7, 'play stats get it');
  hurtWall(S.wallHP + 1, 'bomb'); update(1 / 60); run(3);
  check(S.mode === 'over' && document.getElementById('stShots').textContent === '7', 'the game-over card shows it');
  overScreen.hidden = true;
  RUN.force = 161; newGame(); S.stats.shots = 12480; S.wave = DREAD.WAVE; CAMPAIGN.showWin();
  check(document.getElementById('winShots').textContent === '12,480', 'and the victory card');
  winScreen.hidden = true;

  // ---- Nothing of consequence flies above the page's top rule: every high lane keeps its art below it.
  check(SKY_LANES.PLANE[0] - 21 * 0.78 >= SKY_TOP && SKY_LANES.ESCORT[0] - 21 * 0.78 >= SKY_TOP && SKY_LANES.BOMBER[0] - 30 * 0.86 >= SKY_TOP &&
    UNITS.STRIKE.Y - 30 * 0.86 >= SKY_TOP && SKY.HEAVY.Y[0] - 34 * SKY.HEAVY.SC >= SKY_TOP && SKY.HEAVY.PAIR_Y[0] - 34 * SKY.HEAVY.SC >= SKY_TOP, 'the high lanes keep below the top rule');
  check(UNITS.ZEP.Y - UNITS.ZEP.TWIN_DY - UNITS.ZEP.HH - 16 >= SKY_TOP, "the high twin zeppelin's health bar too");
  check(UNITS.FIGHTER.PASSES[0] - UNITS.FIGHTER.DIVE - UNITS.FIGHTER.WING_Y - 16 >= SKY_TOP && SKY.HELI.OUT_Y - SKY.HELI.HH - 6 >= SKY_TOP, 'fighter cover swoops in, and helicopters leave, below it');
  RUN.force = 162; quiet(8);
  for (i = 0; i < 60; i++) { spawnPlane(i % 2 ? 'bomber' : 'plane'); UNITS.spawnCargo(); }
  check(S.planes.every(function (p) { return p.y >= (p.kind === 'bomber' ? SKY_LANES.BOMBER[0] : p.kind === 'cargo' ? 132 : SKY_LANES.PLANE[0]); }), 'planes, bombers and cargo planes spawn in them');
  S.planes = [];
  // A dive bomber climbing away levels off at its lane and leaves by the side.
  RUN.force = 165; quiet(12); var dv2 = SKY.spawnDiver(RW), topY = 1e9, climbed = false;
  for (f = 0; f < 60 * 10 && S.planes.indexOf(dv2) >= 0; f++) { update(1 / 60); topY = Math.min(topY, dv2.y); climbed = climbed || dv2.phase === 'climb'; }
  check(climbed && topY >= SKY.DIVE.Y - 0.01 && S.planes.indexOf(dv2) < 0, 'a dive bomber levels off below the rule and leaves by the side: ' + Math.round(topY));
  // A Dreadnought sortie comes back in from the side it left, level at the dive bombers' lane.
  S.planes = []; var so = SKY.launchDiver(RW, { x: 200, y: 260 }, 1), lowest = 1e9, back = false;
  for (f = 0; f < 60 * 12 && S.planes.indexOf(so) >= 0; f++) {
    update(1 / 60); lowest = Math.min(lowest, so.y);
    if (!back && so.phase === 'level') { back = true; check(so.dir === -1 && so.x > W && so.y === SKY.DIVE.Y, 'a sortie comes back from its side, level: ' + Math.round(so.x) + ', ' + so.y); }
  }
  check(back && lowest >= SKY.DIVE.Y - 0.01, 'and never above the lane: ' + Math.round(lowest));

  // ---- Road tanks come while the planes are still coming: the first at ROAD.FIRST.
  RUN.force = 163; newGame(); startWave(17); S.mods.maxHP = S.wallHP = 1e6;
  check(S.spawn.roadT === ROAD.FIRST && ROAD.FIRST < 11 && ROAD.GAP[1] < 16, 'sooner, and closer together');
  var t0 = S.t; seen = [];
  for (f = 0; f < 60 * 12 && !heard('tank_drop', function (d) { return d.road; }); f++) update(1 / 60);
  check(heard('tank_drop', function (d) { return d.road; }) && Math.abs(S.t - t0 - ROAD.FIRST) < 0.1, 'the first pair rolls in on time: ' + (S.t - t0).toFixed(2));

  // ---- The Dreadnought sits 14 px lower; the decoy's armor sits forward of its sign.
  check(DREAD.Y === 210 && SKY_LANES.DREAD[0] === 290, 'the Dreadnought and its escorts sit lower');
  check(UNITS.STICKER.X + UNITS.STICKER.HW < UNITS.PLATE.X - UNITS.PLATE.HW, "the sign and the armor don't overlap");

  // ---- Sneak attacks under the smoke screen: crouched infantry from one side, then the other, GROUPS times.
  RUN.force = 164; newGame(); S.mods.maxHP = S.wallHP = 1e6; S.recruits = [makeRecruit(0, 'rifle'), makeRecruit(4, 'rifle')]; startWave(DREAD.WAVE);
  S.spawn.teaser = false; S.spawn.timer = 99; S.spawn.planes = 0; S.spawn.bossT = 0;
  for (f = 0; f < 60 * 40 && !(CAMPAIGN.dread() && CAMPAIGN.dread().phase === 'guns'); f++) update(1 / 60);
  var dn = CAMPAIGN.dread(); check(dn && dn.phase === 'guns', 'the Dreadnought is here');
  dn.turrets.forEach(function (q) { if (!q.dead) damagePlane(dn, 999, 'player', dn.x + dn.dir * q.lx, dn.y + DREAD.GUN_Y, true); });
  check(dn.phase === 'hangar', 'the hangar stage');
  seen = []; S.bubbles = []; var spotted = false, crouched = false;
  for (f = 0; f < 60 * 40 && seen.filter(function (e) { return e.type === 'sneak'; }).length < DREAD.SNEAK.GROUPS; f++) {
    update(1 / 60); dn.hangar.hp = dn.hangar.max; S.recruits.forEach(function (r) { r.hp = crewMax(r); });
    spotted = spotted || S.bubbles.some(function (b) { return b.s === "They're sneaking in!"; });
    crouched = crouched || S.troopers.some(function (t) { return t.sneak && t.state === 'ground' && t.speed === DREAD.SNEAK.SPEED; });
  }
  var sneaks = seen.filter(function (e) { return e.type === 'sneak'; });
  check(sneaks.length === DREAD.SNEAK.GROUPS && sneaks[0].data.side !== sneaks[1].data.side && sneaks.every(function (e) { return e.data.count >= DREAD.SNEAK.SIZE[0] && e.data.count <= DREAD.SNEAK.SIZE[1]; }),
    'three groups, from one side then the other: ' + JSON.stringify(sneaks.map(function (e) { return e.data; })));
  check(crouched && spotted, 'crouched along the ground, and a soldier spots them');
  render();
  run(DREAD.SNEAK.EVERY * 2);
  check(seen.filter(function (e) { return e.type === 'sneak'; }).length === DREAD.SNEAK.GROUPS, 'and no more');

  // ---- The last hurrah: abandon ship at a third of the bridge; then its captain, the last one out.
  function alive(t) { return !t.dead; }
  RUN.force = 170; newGame(); S.mods.maxHP = S.wallHP = 1e6; S.recruits = [makeRecruit(0, 'rifle'), makeRecruit(4, 'rifle')]; startWave(DREAD.WAVE);
  S.spawn.teaser = false; S.spawn.timer = 99; S.spawn.planes = 0; S.spawn.bossT = 0;
  for (f = 0; f < 60 * 40 && !(CAMPAIGN.dread() && CAMPAIGN.dread().phase === 'guns'); f++) update(1 / 60);
  var dz2 = CAMPAIGN.dread();
  dz2.turrets.forEach(function (g) { if (!g.dead) damagePlane(dz2, 999, 'player', dz2.x + dz2.dir * g.lx, dz2.y + DREAD.GUN_Y, true); });
  run(DREAD.PAUSE.HANGAR + 0.2);
  damagePlane(dz2, 9999, 'player', dz2.x + dz2.dir * DREAD.HANGAR, dz2.y + DREAD.HANGAR_Y, true);
  run(DREAD.PAUSE.BRIDGE + 0.1);
  check(dz2.phase === 'bridge' && !(dz2.hold > 0), 'the bridge stage');
  S.planes = S.planes.filter(function (z) { return z.kind === 'dread'; }); S.troopers = []; S.bombs = []; S.enemyShots = [];
  dz2.bombT = dz2.gunT = dz2.boardT = 1e9; dz2.ropes = []; if (dz2.cannon) dz2.cannon.dead = true;
  dz2.x = 200 + dz2.dir * 120 - dz2.dir * DREAD.BRIDGE;
  function hitBridge(dmg) { damagePlane(dz2, dmg, 'player', dz2.x + dz2.dir * dz2.bridge.lx, dz2.y + DREAD.BRIDGE_Y, true); }
  seen = []; hitBridge(dz2.bridge.max * 0.5);
  check(!dz2.abandoned && !heard('dread_abandon'), 'not at half');
  var A = DREAD.ABANDON, recruits = S.recruits; S.recruits = []; S.texts = [];
  hitBridge(dz2.bridge.max * 0.2);
  function jumped() { return seen.filter(function (e) { return e.type === 'trooper_spawn'; }).length; }
  check(dz2.abandoned && heard('dread_abandon', function (d) { return d.round === 1 && d.n === A.N; }) && S.texts.some(function (q) { return q.s === 'abandon ship!'; }), 'at a third: abandon ship!');
  seen = []; update(1 / 60);
  check(jumped() === 1, 'they jump one at a time');
  run(A.EVERY * (A.N - 1) + 0.05);
  check(jumped() === A.N, 'a wave of ' + A.N + ': ' + jumped());
  run(A.GAP - 0.2);
  check(jumped() === A.N, 'a pause');
  run(0.3 + A.EVERY * A.N);
  check(heard('dread_abandon', function (d) { return d.round === 2; }) && jumped() === A.N * A.WAVES, 'then a second wave: ' + jumped());
  run(A.GAP + 1);
  check(jumped() === A.N * A.WAVES && dz2.abandon.wave === A.WAVES, 'and no more');
  S.recruits = recruits;
  render();
  // Downed: they surrender, and the captain is the last one out, under his own slow chute.
  hitBridge(9999);
  check(dz2.phase === 'sinking' && !S.troopers.some(alive), 'down it goes, and they surrender');
  run(DREAD.CAPTAIN.DELAY + 0.05);
  var cap = S.troopers.find(function (t) { return t.captain && !t.dead; });
  check(cap && S.captain === 'out' && cap.fall === DREAD.CAPTAIN.FALL && heard('captain', function (d) { return d.fate === 'out'; }), 'the captain is the last one out');
  render();
  var d0 = Math.abs(cap.x - cap.matX); run(0.5);
  check(cap.overMat || Math.abs(cap.x - cap.matX) < d0, 'he makes for the nearest open mat');
  // The crew and the sentry leave him to you.
  var cy0 = cap.y; cap.y = 450; cap.open = 1; S.mods.auto = true;
  check(pickTarget(S.recruits[0]) !== cap && sentryTarget() !== cap, 'the crew and the sentry leave him to you');
  cap.y = cy0; S.mods.auto = false;
  // Pop his chute over the mat: he bounces onto the bunker, your prisoner.
  var mat = activeTramps()[0], crew0 = S.recruits.filter(alive).length, sc0 = S.score;
  cap.x = (mat.x1 + mat.x2) / 2; cap.y = mat.y - 33 - 16; popChute(cap);
  for (f = 0; f < 60 * 3 && !cap.dead; f++) update(1 / 60);
  check(S.captain === 'captured' && S.score >= sc0 + DREAD.CAPTAIN.PTS && S.recruits.filter(alive).length === crew0 && heard('captain', function (d) { return d.fate === 'captured'; }),
    'caught on the mat: a prisoner, not a recruit, +' + DREAD.CAPTAIN.PTS);
  for (f = 0; f < 60 * 20 && S.mode !== 'won'; f++) update(1 / 60);
  var capLine = document.getElementById('winCaptain');
  check(S.mode === 'won' && !capLine.hidden && /^Prisoner: their captain/.test(capLine.textContent) && runReport().stats.captain === 'captured', 'on the victory card: ' + capLine.textContent);
  winScreen.hidden = true;
  // Shot down, or let him land and he runs off the page.
  RUN.force = 171; quiet(20); S.recruits = [];
  var c2 = spawnTrooper(120, 300); c2.captain = true; c2.matX = 57; c2.edge = -1; c2.drift = 40; S.captain = 'out'; sc0 = S.score;
  killTrooper(c2, 'player');
  check(S.captain === 'down' && S.score >= sc0 + DREAD.CAPTAIN.DOWN, 'shot down');
  var c3 = spawnTrooper(80, GROUND - 40); c3.captain = true; c3.matX = 57; c3.edge = -1; c3.drift = 40; S.captain = 'out';
  for (f = 0; f < 60 * 6 && !c3.dead; f++) update(1 / 60);
  check(c3.dead && S.captain === 'escaped' && S.wallHP === S.mods.maxHP, 'or he lands and runs off the page, touching nothing');
  S.captain = 'escaped'; S.wave = DREAD.WAVE; CAMPAIGN.showWin();
  check(capLine.textContent === 'Their captain got away.', 'and the card says so');
  winScreen.hidden = true;

  emitHook = null; RUN.force = null; reset(); titleScene(); render();
})();
