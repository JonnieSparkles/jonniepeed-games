// Stick Army's Challenges: short fixed scenarios, three stars each. A challenge sets the wave, the kit, the squad and
// the seed, so it plays the same every time and a better go is down to you. Stars are kept on this device
// (stickarmy.challenges) and unlock the harder ones. Star one is the challenge itself (do it), the other two ask for it
// clean or quick; they only count when the first is earned.
// Classic script; load before game.js, which calls StickArmyChallenges(world, game) once, after the flow. It adds
// MODES.challenge (game.js documents the hooks), the title's Challenges button, the list page and the end card.
var StickArmyChallenges = function (world, game) {
  'use strict';
  var RUN = world.RUN, SQUAD = world.SQUAD, load = world.load, save = world.save, clock = world.clock;
  var W = world.W, BLUE = world.BLUE, RED = world.RED, INK = world.INK;
  var KEY = 'stickarmy.challenges', SPARE = 40;

  // ---------- the challenges ----------
  // wave: the Arcade wave it plays (its recipe, then `recipe` changes it). kit: shop items and how many of each.
  // squad: [role, stripes] in the field from the start. slots: room in the squad. need: stars to unlock it.
  // piece: a set piece on top (below). stars: three lines and three tests, asked at the end with the counts (k), the
  // seconds it took (t) and the wall's share left (wall, 0 to 1). fail(k): why it's lost early, if it is.
  var LIST = [
    { id: 'pilots', name: 'Pilot rescue', line: 'Six of ours go down near the mat. Shoot the fighters, catch the pilots.', badge: 'pilot',
      wave: 3, slots: 8, squad: [['rifle', 0], ['rifle', 0]], kit: {}, piece: 'pilot', need: 0,
      recipe: function (c) { c.noDrops = true; c.planes = 0; c.bombers = 3; c.rushes = 0; },
      goal: 'catch the pilots, shoot the fighters',
      sub: function (k) { return 'pilots ' + k.pilots + '/4 · lost ' + k.pilotsLost + '/3'; },
      stars: [['Save 4 pilots', function (k) { return k.pilots >= 4; }],
        ['Lose none', function (k) { return k.pilotsLost === 0; }],
        ['All six under 1:30', function (k, t) { return k.pilots >= 6 && t <= 90; }]],
      fail: function (k) { return k.pilotsLost >= 3 ? 'Three pilots were lost.' : null; } },
    { id: 'field', name: 'Fill the field', line: 'One wave of drops and nobody on the field. Catch a squad.', badge: 'net',
      wave: 4, slots: 8, squad: [], kit: { wire: 1, sandbags: 2, tramp: 1, mat: 2 }, need: 0,
      recipe: function (c) { c.planes = 16; c.maxDrops = 3; c.fall *= 0.75; c.bombers = 0; c.balloons = 0; },
      goal: 'catch them on the mat',
      sub: function (k) { return 'caught ' + k.caught + '/3'; },
      done: function (k) { return k.caught >= 8; },
      stars: [['Catch 3', function (k) { return k.caught >= 3; }],
        ['Catch 5', function (k) { return k.caught >= 5; }],
        ['Catch 8', function (k) { return k.caught >= 8; }]] },
    { id: 'bombs', name: 'Bomb alley', line: 'Ten bombers, thirty bombs. Shoot them before they land.', badge: 'bomb',
      wave: 6, slots: 4, squad: [['rifle', 0], ['engineer', 0], ['rifle', 0]], kit: { fire: 1, cool: 1, sandbags: 2 }, need: 0,
      recipe: function (c) { c.bombers = 10; c.bombCount = 3; c.planes = 8; },
      goal: 'shoot the bombs as they fall',
      sub: function (k) { return 'bombs shot ' + k.bombs + '/6'; },
      stars: [['Shoot 6 bombs', function (k) { return k.bombs >= 6; }],
        ['Shoot 9', function (k) { return k.bombs >= 9; }],
        ['Shoot 12', function (k) { return k.bombs >= 12; }]] },
    { id: 'big', name: 'The big one', line: 'A giant bomb balloon drifts at the bunker. Pop it.', badge: 'big',
      wave: 7, slots: 6, squad: [['rifle', 1], ['rifle', 0], ['bazooka', 0], ['engineer', 0]], kit: { fire: 2, cool: 1, sandbags: 1 }, piece: 'bigone', need: 0,
      recipe: function (c) { c.planes = 10; c.bombers = 0; c.balloons = 0; },
      goal: 'pop it before it reaches the bunker',
      sub: function (k) { return k.big ? 'popped!' : 'pop the big one'; },
      done: function (k) { return k.big; },
      stars: [['Pop it', function (k) { return k.big; }],
        ['Within 25 seconds', function (k) { return k.big && k.bigT <= 25; }],
        ['Wall above 75%', function (k, t, wall) { return wall > 0.75; }]],
      fail: function (k) { return k.bigLanded ? 'The big one reached the bunker.' : null; } },
    { id: 'night', name: 'Night shift', line: 'The night raid. Follow your searchlight.', badge: 'moon',
      wave: 16, slots: 8, squad: [['rifle', 2], ['rifle', 1], ['bazooka', 1], ['bazooka', 0], ['engineer', 1], ['rifle', 0]],
      kit: { fire: 3, cool: 2, sandbags: 2, helmet: 2, aim: 2, trench: 1, mat: 1, auto: 1, wire: 1, mines: 1, strike: 1, fighter: 1 }, need: 4,
      recipe: function (c) { c.heavies = 0; c.divers = 2; c.bombers = 3; c.balloons = 2; c.cargo = 1; c.road = 0; c.sniperChance *= 0.5; c.planes = Math.round(c.planes * 0.6); },
      goal: 'follow your searchlight',
      sub: function (k) { return 'lost ' + k.lost; },
      stars: [['Survive the night', function () { return true; }],
        ['Nobody lost', function (k) { return k.lost === 0; }],
        ['Wall above 50%', function (k, t, wall) { return wall > 0.5; }]] },
    { id: 'tanks', name: 'Tank road', line: 'Tanks by air and by road, and no engineers.', badge: 'tank',
      wave: 11, slots: 6, squad: [['rifle', 1], ['rifle', 1], ['bazooka', 1], ['bazooka', 0], ['rifle', 0]],
      kit: { fire: 2, cool: 2, sandbags: 2, helmet: 1, aim: 1, wire: 1, trench: 1, mines: 1, strike: 2 }, need: 6,
      recipe: function (c) { c.bombers = 2; c.balloons = 0; c.planes = Math.round(c.planes * 0.75); },
      goal: 'stop the tanks, no repairs',
      sub: function (k) { return 'lost ' + k.lost; },
      stars: [['Survive', function () { return true; }],
        ['Nobody lost', function (k) { return k.lost === 0; }],
        ['Wall above 50%', function (k, t, wall) { return wall > 0.5; }]] },
    { id: 'stand', name: 'Last stand', line: 'The wall nearly down, no repairs. Hold one minute.', badge: 'clock',
      wave: 8, slots: 6, squad: [['rifle', 1], ['rifle', 1], ['bazooka', 0], ['rifle', 0]], kit: { fire: 2, cool: 1, trench: 1, auto: 1 }, piece: 'stand', need: 8,
      recipe: function (c) { c.bombers = 1; c.balloons = 0; },
      goal: 'hold for one minute',
      sub: function (k) { return 'hold ' + clock(Math.max(0, STAND.TIME - k.stand)); },
      done: function (k) { return k.stand >= STAND.TIME; },
      stars: [['Hold', function (k) { return k.stand >= STAND.TIME; }],
        ['Nobody lost', function (k) { return k.lost === 0; }],
        ['Wall above 10%', function (k, t, wall) { return wall > 0.1; }]] },
    { id: 'flagship', name: 'Flagship', line: 'The Dreadnought, with a kit and a squad picked for you.', badge: 'ship',
      wave: 20, slots: 8, squad: [['rifle', 2], ['rifle', 2], ['bazooka', 1], ['bazooka', 1], ['engineer', 1], ['medic', 1], ['rifle', 1], ['rifle', 0]],
      kit: { fire: 3, cool: 3, double: 1, spread: 1, sandbags: 3, helmet: 2, aim: 2, trench: 2, auto: 1, strike: 3, fighter: 2 }, need: 12,
      goal: 'knock out its guns',
      sub: function (k) { return k.dread ? 'it\'s down!' : 'bring it down'; },
      stars: [['Beat it', function (k) { return k.dread; }],
        ['Under 2:00', function (k, t) { return k.dread && t <= 120; }],
        ['Under 1:30', function (k, t) { return k.dread && t <= 90; }]] }
  ];
  function byId(id) { return LIST.find(function (x) { return x.id === id; }); }

  // ---------- this device's stars ----------
  function records() { var r = load(KEY, {}); return r && typeof r === 'object' ? r : {}; }
  function record(id) { var r = records()[id]; return r && typeof r === 'object' ? r : { stars: 0, best: null }; }
  function totalStars() { var r = records(); return LIST.reduce(function (n, x) { return n + Math.min(3, (r[x.id] && r[x.id].stars) || 0); }, 0); }
  function open(ch) { return totalStars() >= ch.need; }
  function keep(id, stars, time) {
    var all = records(), was = record(id), best = was.best;
    if (stars > 0 && (best == null || time < best)) best = time;
    all[id] = { stars: Math.max(was.stars || 0, stars), best: best };
    save(KEY, all);
    return { newBest: stars > 0 && best === time && was.best !== time, was: was };
  }

  // ---------- a go ----------
  var cur = null;
  function C() { var S = world.S; return S && S.game === 'challenge' ? S.ch : null; }
  function start(id) {
    var ch = byId(id);
    world.sound.init();
    RUN.game = 'challenge'; RUN.players = 1;
    game.seedRun(game.mix(0xc4a11, LIST.indexOf(ch) + 1));
    game.reset();
    RUN.game = 'arcade';
    var S = world.S;
    cur = ch;
    S.level = 'soldier';
    S.ch = { id: id, t: 0, k: { pilots: 0, pilotsLost: 0, caught: 0, bombs: 0, big: false, bigT: 0, bigLanded: false, stand: 0, lost: 0, dread: false }, ended: false, cause: null };
    applyKit(S, ch.kit);
    S.mods.slots = ch.slots; S.wallHP = S.mods.maxHP; S.flagUp = S.mods.flag ? 1 : 0;
    game.resizeMats();
    ch.squad.forEach(function (q, i) {
      var r = world.makeRecruit(game.SLOT_ORDER[i], q[0]);
      if (q[1]) SQUAD.train(r, q[1]);
      S.recruits.push(r);
    });
    S.mode = 'play'; S.hint = ch.id === 'pilots' || ch.id === 'field';
    var sc = world.screens();
    sc.title.hidden = sc.pause.hidden = sc.over.hidden = sc.win.hidden = sc.shop.hidden = true;
    hidePage(); hideCard();
    sc.pauseBtn.hidden = false;
    world.fit();
    world.sound.ambience(game.ambienceState());
    game.startWave(ch.wave);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // The kit, as the shop would have it: turret upgrades on the barrel, the rest on S.mods, calls on the radio.
  function applyKit(S, kit) {
    var turret = {}; world.TURRET_MODS.forEach(function (id) { turret[id] = true; });
    Object.keys(kit).forEach(function (id) {
      var n = kit[id];
      if (id === 'strike') { S.calls.bomber += n; return; }
      if (id === 'fighter') { S.calls.fighter += n; return; }
      var it = world.ITEMS.find(function (x) { return x.id === id; });
      for (var i = 0; i < n; i++) it.apply(turret[id] ? { mods: S.turrets[0].mods } : S);
      (turret[id] ? S.turrets[0].mods.stacks : S.mods.stacks)[id] = n;
    });
  }
  function wallShare(S) { return Math.max(0, S.wallHP) / S.mods.maxHP; }
  function starsFor(S) {
    var ch = cur, c = S.ch, wall = wallShare(S), won = !c.cause && S.wallHP > 0 && ch.stars[0][1](c.k, c.t, wall);
    return ch.stars.map(function (s) { return won && s[1](c.k, c.t, wall); });
  }

  // ---------- Challenges' entry in MODES ----------
  world.MODES.challenge = {
    wave: function (n) {
      var c = game.waveCfg(n);
      if (cur && cur.recipe) cur.recipe(c, n);
      return c;
    },
    // One wave: whatever happens as it clears ends the go.
    won: function () { return true; },
    win: function () { var S = world.S; if (!starsFor(S)[0] && !S.ch.cause) S.ch.cause = 'goal'; finish(); },
    lost: function () { var S = world.S; return S.wallHP <= 0 || !!failNow(S); },
    lose: function () {
      var S = world.S, why = failNow(S);
      if (!why) { game.die(); return; }
      S.ch.cause = why; S.ch.ended = true;
      S.mode = 'dying'; S.dieT = 1.4; world.hidePause();
      S.turrets.forEach(function (t) { t.firing = false; });
      S.banner = { s: 'challenge failed', sub: why.replace(/\.$/, '').toLowerCase(), t: 0, dur: 1.6 };
      world.sound.play('over');
    },
    over: function () { finish(); },
    cleared: function () { var S = world.S; return !!(cur.done && cur.done(S.ch.k)); },
    held: function () { var pc = PIECES[cur.piece]; return !!(pc && pc.held && pc.held(world.S)); },
    tick: function (dt) {
      var S = world.S, c = S.ch;
      if (S.mode === 'play' && S.waveState === 'active') c.t += dt;
      var pc = PIECES[cur.piece]; if (pc) pc.tick(S, dt);
    },
    draw: function (G) { var pc = PIECES[cur.piece]; if (pc && pc.draw) pc.draw(world.S, G); },
    shot: function (b) { var pc = PIECES[cur.piece]; return !!(pc && pc.shot && pc.shot(world.S, b)); },
    // The squad and the sentry leave our pilots alone, and a chute over a mat until it's nearly down (SPARE px
    // above it), so the catch is yours to make.
    spare: function (t) {
      if (t.pilot) return true;
      if (t.state !== 'chute') return false;
      return world.activeTramps().some(function (q) { return t.x > q.x1 + 4 && t.x < q.x2 - 4 && t.y < q.y - SPARE; });
    },
    caught: function (t) { var pc = PIECES[cur.piece]; if (pc && pc.caught) pc.caught(world.S, t); },
    on: function (type, data) {
      var S = world.S, k = S && S.ch && S.ch.k;
      if (!k || S.mode === 'title') return;
      if (type === 'capture') k.caught++;
      else if (type === 'bomb_intercepted') k.bombs++;
      else if (type === 'recruit_lost') k.lost++;
      else if (type === 'plane_down' && data.kind === 'dread') k.dread = true;
    },
    banner: function () { return { s: cur.name.toLowerCase(), sub: cur.goal, t: 0, dur: 3 }; },
    endBanner: function () {
      var S = world.S;
      return starsFor(S)[0] ? { s: 'challenge done!', sub: cur.name.toLowerCase(), t: 0, dur: 2.8 } : { s: 'too late!', sub: 'the goal was missed', t: 0, dur: 2.8 };
    },
    hud: function () { var S = world.S; return { wave: cur.name.toLowerCase(), sub: cur.sub(S.ch.k), done: !!starsFor(S)[0] && !S.ch.cause }; },
    pauseLine: function () { return 'Challenge: ' + cur.name + '. ' + cur.stars.map(function (s) { return s[0]; }).join(' · '); },
    restart: function () { start(cur.id); },
    quit: function () { game.titleScene(); showPage(); }
  };
  function failNow(S) { return S.ch && !S.ch.ended && cur.fail ? cur.fail(S.ch.k) : null; }

  // ---------- set pieces ----------
  // Each runs from MODES tick (and draw); its state is in S.ch. Places come from the mats, not a random stream.
  function matMid() { var m = world.activeTramps()[0]; return (m.x1 + m.x2) / 2; }
  function ring(G, x, y, r, color) { G.save(); G.setLineDash([6, 5]); G.lineWidth = 2; G.strokeStyle = color; G.beginPath(); G.arc(x, y, r, 0, Math.PI * 2); G.stroke(); G.restore(); }
  function ellipseHit(b, x, y, rx, ry) { var dx = (b.x - x) / rx, dy = (b.y - y) / ry; return dx * dx + dy * dy < 1; }
  function bulletDmg(b) { return b.kind === 'rocket' ? 3 : 1; }
  function bar(G, x, y, w, frac, color) {
    G.fillStyle = world.PAPER; G.fillRect(x, y, w, 8); G.fillStyle = color; G.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, frac)), 6);
    G.strokeStyle = INK; G.lineWidth = 1.6; G.strokeRect(x, y, w, 8);
  }
  // Downed pilot: PILOT.BAILS blue planes of ours cross, one every PILOT.EVERY seconds from the mat's far side,
  // already hit and smoking, each with an enemy fighter sitting PILOT.GAP behind it. Ours goes down PILOT.BAIL px
  // short of the mat (at least PILOT.EDGE in from the page's edge) whatever you do, and its pilot bails out, falling
  // clear for PILOT.FREE seconds before his blue chute opens, then drifting to be over the mat about PILOT.LOW px down,
  // where he stays. The fighter goes for him: within PILOT.NEAR it pulls up PILOT.SIDE px beside him on the turret's
  // side (so a shot at it misses him) and fires, and PILOT.STRAFE seconds of that hit him. Shoot the fighter, then
  // catch him: he joins the squad. Hit, splatted or landed, he's lost. No round, blast or falling plane hurts a pilot
  // (the turret can only pop his chute), and the squad and the sentry don't aim at one (spare).
  var PILOT = { FIRST: 3, EVERY: 8, Y: [200, 160, 230, 180], SPEED: 55, CHASE: 1.25, GAP: 72, BAIL: 60, EDGE: 40, NEAR: 90, SIDE: 64, STRAFE: 2.2, FREE: 0.7, LOW: 480, BAILS: 6 };
  // The big one: a bomb balloon BIG.R across, BIG.HP hits, drifting from the page's edge to the bunker over BIG.TIME
  // seconds, BIG.AT seconds in.
  var BIG = { HP: 90, R: 46, Y: 150, TIME: 50, AT: 3 };
  // Last stand: the wall starts at STAND.WALL of full and can't be repaired; hold STAND.TIME seconds.
  var STAND = { WALL: 0.2, TIME: 60 };
  function bail(S, b, why) {
    var c = S.ch, mid = matMid();
    b.state = 'fall'; b.vy = 0; c.bailed++;
    world.addText(why, b.x, b.y - 24, why === 'friendly fire!' ? RED : INK, 20, 'minor'); world.sound.play('boom');
    world.burst(b.x, b.y, 8, INK, 140);
    var p = world.spawnTrooper(b.x, b.y + 22, { type: 'rifle', fall: 0.95, sway: 0, armor: 0 });
    p.pilot = true; p.ff = PILOT.FREE;
    p.drift = Math.max(-40, Math.min(40, (mid - p.x) / Math.max(1, (PILOT.LOW - p.y - PILOT.FREE * 180) / p.fall)));
    c.pilotIds.push(p.id);
    b.pilot = p.id;
    world.addText('pilot bailing out!', p.x, p.y - 40, BLUE, 20, 'story');
  }
  function chaserOf(S, b) { return S.planes.find(function (p) { return p.id === b.chaser && p.state === 'fly'; }); }
  var PIECES = {
    pilot: {
      tick: function (S, dt) {
        var c = S.ch, k = c.k, t = c.t;
        c.blues = c.blues || []; c.bailed = c.bailed || 0; c.settled = c.settled || {}; c.pilotIds = c.pilotIds || [];
        // Our planes: one every PILOT.EVERY seconds, PILOT.BAILS in all.
        if (S.waveState === 'active' && (c.bluesOut || 0) < PILOT.BAILS && t >= (c.nextBlue == null ? PILOT.FIRST : c.nextBlue)) {
          // From the far side of the mat, so its fighter stays between the pilot and the turret, never past him.
          var n = c.bluesOut = (c.bluesOut || 0) + 1, dir = matMid() < W / 2 ? -1 : 1, y = PILOT.Y[n % PILOT.Y.length], x0 = dir > 0 ? -40 : W + 40;
          var bailX = Math.max(PILOT.EDGE, Math.min(W - PILOT.EDGE, matMid() - dir * PILOT.BAIL));
          c.blues.push({ id: world.id(), x: x0, x0: x0, bailX: bailX, y: y, dir: dir, state: 'fly', vy: 0, chaser: null, pilot: null });
          c.nextBlue = t + PILOT.EVERY;
        }
        function fighterHunts(b) {
          // The fighter goes for the pilot: near him, it pulls up beside him and fires.
          var f = chaserOf(S, b), q = b.pilot != null && !c.settled[b.pilot] && S.troopers.find(function (x) { return x.id === b.pilot && !x.dead && x.state === 'chute'; });
          if (!f) return;
          if (q && Math.abs(q.x - f.x) < PILOT.NEAR) {
            var at = q.x + (q.x < W / 2 ? 1 : -1) * PILOT.SIDE;
            f.speed = 0; f.x += Math.max(-70 * dt, Math.min(70 * dt, at - f.x));
            b.strafing = Math.abs(at - f.x) < 12 && !(q.ff > 0); if (b.strafing) f.strafe = (f.strafe || 0) + dt;
            if (f.strafe >= PILOT.STRAFE) {
              q.dead = true; world.burst(q.x, q.y + 14, 8, BLUE, 120); world.sound.play('hit');
              world.addText('pilot hit!', q.x, q.y - 20, RED, 22, 'alert'); world.emit('pilot_lost', { how: 'hit' });
            }
          } else if (b.state !== 'fly') f.speed = PILOT.SPEED * PILOT.CHASE;
        }
        c.blues.forEach(function (b) {
          b.firing = false; b.strafing = false;
          if (b.gone) return fighterHunts(b);
          if ((b.smoke = (b.smoke || 0) - dt) <= 0) { b.smoke = b.state === 'fall' ? 0.07 : 0.16; world.puff(b.x - b.dir * 18, b.y, 4, 0.7); }
          var f = chaserOf(S, b);
          // Its fighter comes in at the edge just behind it, drops back to PILOT.GAP and sits on its tail.
          if (b.chaser == null) {
            f = world.makePlane('plane', b.dir, b.x0 - b.dir * 45, b.y);
            f.speed = PILOT.SPEED * PILOT.CHASE; f.chases = b.id; b.chaser = f.id;
            S.planes.push(f);
          }
          if (f && b.state === 'fly') { var gap = (b.x - f.x) * b.dir; f.speed = PILOT.SPEED * (gap > PILOT.GAP + 8 ? PILOT.CHASE : gap < PILOT.GAP - 8 ? 0.8 : 1); }
          if (b.state === 'fall') {
            b.vy += 220 * dt; b.y += b.vy * dt; b.x += b.dir * PILOT.SPEED * 0.5 * dt;
            if (b.y >= world.GROUND - 10) { b.gone = true; world.pow(b.x, world.GROUND - 10, 30); world.sound.play('boom'); }
          } else {
            b.x += b.dir * PILOT.SPEED * dt;
            b.firing = !!f && (b.x - f.x) * b.dir > 0;
            if ((b.x - b.bailX) * b.dir >= 0) bail(S, b, 'shot down!');
          }
          fighterHunts(b);
        });
        // A blue plane's record stays while its pilot is out, so its fighter keeps after him.
        c.blues = c.blues.filter(function (b) { return !b.gone || (b.pilot != null && !c.settled[b.pilot]); });
        // Each pilot out until he's settled: caught (he joins the squad), or lost: landed off the mat, or gone.
        c.pilotIds.forEach(function (id) {
          if (c.settled[id]) return;
          var q = S.troopers.find(function (x) { return x.id === id; });
          if (q && !q.dead && q.state === 'chute' && q.ff > 0) { q.ff -= dt; q.open = 0; q.y += 85 * dt; }
          else if (q && !q.dead && q.state === 'chute') { var mid = matMid(); q.x += q.drift * dt; if ((q.x - mid) * q.drift >= 0) { q.x = q.drift ? mid : q.x; q.drift = 0; } }
          if (q && !q.dead && q.state === 'ground') { q.dead = true; world.addText('pilot captured!', q.x, world.GROUND - 60, RED, 24, 'alert'); world.emit('pilot_lost', { how: 'landed' }); }
          if (!q || (q.dead && !c.settled[id])) { if (!q || q.state !== 'bounce') { c.settled[id] = 'lost'; k.pilotsLost++; } }
        });
      },
      // A round from your turret into one of ours brings it down too: its pilot still bails out.
      shot: function (S, bl) {
        if (bl.owner !== 'player') return false;
        var b = (S.ch.blues || []).find(function (q) { return q.state === 'fly' && Math.abs(bl.x - q.x) < 30 && Math.abs(bl.y - q.y) < 11; });
        if (!b) return false;
        bl.dead = true; bail(S, b, 'friendly fire!');
        return true;
      },
      caught: function (S, q) {
        if (!q.pilot) return;
        S.ch.settled[q.id] = 'saved'; S.ch.k.pilots++; S.ch.k.caught--;
        world.addText('pilot safe! he joins up', q.x, world.GROUND - 80, BLUE, 22, 'story');
      },
      held: function (S) { var c = S.ch; return (c.bailed || 0) < PILOT.BAILS || S.troopers.some(function (q) { return q.pilot && !q.dead; }); },
      draw: function (S, G) {
        (S.ch.blues || []).forEach(function (b) {
          if (!b.gone) world.drawAllyPlane(b.id, b.x, b.y, b.dir, b.state === 'fall' ? 0.5 : 0);
          var f = chaserOf(S, b), q = b.strafing && S.troopers.find(function (x) { return x.id === b.pilot; });
          if (f && (b.firing || q) && Math.floor(S.t * 12) % 2) {
            G.save(); G.setLineDash([4, 5]); G.strokeStyle = RED; G.lineWidth = 1.6; G.beginPath(); G.moveTo(f.x + f.dir * 20, f.y + 4);
            if (q) G.lineTo(q.x, q.y - 4); else G.lineTo(b.x - b.dir * 22, b.y); G.stroke(); G.restore();
          }
        });
        S.troopers.forEach(function (q) { if (q.pilot && !q.dead && q.state === 'chute') ring(G, q.x, q.y - 10, 34, BLUE); });
      }
    },
    bigone: {
      tick: function (S, dt) {
        var c = S.ch, k = c.k;
        if (!c.big && c.t >= BIG.AT && S.waveState === 'active') {
          // In over the far side from the mat, already most of the way onto the page.
          var m = world.activeTramps()[0], from = m.x1 < 200 ? W - BIG.R + 16 : BIG.R - 16;
          c.big = { x: from, from: from, hp: BIG.HP, flash: 0, gone: false, t: 0 };
          world.addText('the big one!', 200, 120, RED, 30, 'alert'); world.sound.play('horn');
        }
        var b = c.big; if (!b || b.gone) return;
        b.flash = Math.max(0, b.flash - dt);
        if (S.mode === 'play') b.t += dt;
        if (b.hp > 0) {
          var dir = b.from < world.BK.x ? 1 : -1;
          b.x += dir * Math.abs(world.BK.x - b.from) / BIG.TIME * dt;
          if ((world.BK.x - b.x) * dir <= 0) {
            b.gone = true; k.bigLanded = true;
            world.pow(world.BK.x, world.BK.top, 70); world.sound.play('boom'); S.shake = Math.max(S.shake || 0, 0.8);
            world.hurtWall(S.mods.maxHP * 0.5, 'balloon');
            world.addText('it dropped its bomb!', 200, 400, RED, 26, 'alert');
          }
        }
      },
      shot: function (S, bl) {
        var b = S.ch.big;
        if (!b || b.gone || b.hp <= 0 || !ellipseHit(bl, b.x, BIG.Y, BIG.R, BIG.R * 1.12)) return false;
        b.hp -= bulletDmg(bl); b.flash = 0.12; bl.dead = true;
        world.burst(bl.x, bl.y, 3, RED, 90);
        if (b.hp <= 0) {
          b.gone = true; S.ch.k.big = true; S.ch.k.bigT = b.t;
          world.pow(b.x, BIG.Y, 80); world.sound.play('pop'); S.shake = Math.max(S.shake || 0, 0.5);
          world.award(300, b.x, BIG.Y + 40, 'the big one is down!', bl.owner === 'ally' ? BLUE : INK, true);
        }
        return true;
      },
      held: function (S) { return !S.ch.big || !S.ch.big.gone; },
      draw: function (S, G) {
        var b = S.ch.big; if (!b || b.gone) return;
        var x = b.x, y = BIG.Y + Math.sin(S.t * 0.9) * 3, r = BIG.R;
        G.save();
        G.beginPath(); G.moveTo(x - 8, y + r); G.lineTo(x - 14, y + r + 26); G.moveTo(x + 8, y + r); G.lineTo(x + 14, y + r + 26); G.strokeStyle = INK; G.lineWidth = 1.6; G.stroke();
        G.beginPath(); G.ellipse(x, y + r + 40, 13, 18, 0, 0, Math.PI * 2); G.fillStyle = INK; G.fill();
        G.beginPath(); G.ellipse(x, y, r, r * 1.12, 0, 0, Math.PI * 2); G.fillStyle = world.PAPER; G.fill(); G.fillStyle = b.flash > 0 ? 'rgba(200,67,58,0.15)' : 'rgba(200,67,58,0.35)'; G.fill();
        G.strokeStyle = RED; G.lineWidth = 3; G.stroke();
        G.beginPath(); G.arc(x - r * 0.35, y - r * 0.45, r * 0.25, Math.PI * 1.1, Math.PI * 1.6); G.strokeStyle = world.PAPER; G.lineWidth = 3; G.stroke();
        G.restore();
        bar(G, 120, 92, 160, b.hp / BIG.HP, RED);
      }
    },
    stand: {
      tick: function (S, dt) {
        var c = S.ch, k = c.k;
        if (c.standCap == null) c.standCap = S.wallHP = Math.round(S.mods.maxHP * STAND.WALL);
        // No repairs: the wall never goes back up.
        if (S.wallHP > c.standCap) S.wallHP = c.standCap; else c.standCap = S.wallHP;
        if (S.mode === 'play' && S.waveState === 'active') k.stand = Math.min(STAND.TIME, k.stand + dt);
      },
      held: function (S) { return S.ch.k.stand < STAND.TIME; },
      draw: function (S, G) {
        var left = Math.max(0, Math.ceil(STAND.TIME - S.ch.k.stand));
        if (S.ch.k.stand >= STAND.TIME) return;
        G.save(); G.globalAlpha = 0.55; G.fillStyle = RED; G.font = '700 54px "Cabin Sketch", cursive'; G.textAlign = 'center';
        G.fillText(clock(left), 200, 210); G.restore();
      }
    }
  };
  // Tank road has no engineers, so nothing repairs; Last stand caps the wall in its piece.

  // ---------- the page and the card ----------
  var STAR_PATH = 'M35 4 L44 26 L67 27 L49 42 L56 65 L35 52 L14 65 L21 42 L3 27 L26 26 Z';
  function star(on) {
    return '<svg viewBox="0 0 70 70" aria-hidden="true"><path d="' + STAR_PATH + '" fill="' + (on ? '#f2c230' : 'none') + '" stroke="' + (on ? '#2e2e33' : '#9a968e') +
      '" stroke-width="5" stroke-linejoin="round"' + (on ? '' : ' stroke-dasharray="8 6"') + '/></svg>';
  }
  function stars(n) { var s = ''; for (var i = 0; i < 3; i++) s += star(i < n); return '<span class="ch-stars" aria-label="' + n + ' of 3 stars">' + s + '</span>'; }
  var I = '#2e2e33', B = '#2f6fdc', R = '#c8433a';
  function svg(body) { return '<svg viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="' + I + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>'; }
  var BADGE = {
    pilot: svg('<path d="M8 17a12 10 0 0 1 24 0z" stroke="' + B + '"/><path d="M8 17l12 9M32 17l-12 9M20 17v9" stroke="' + B + '" stroke-width="1.4"/><circle cx="20" cy="27" r="2.4"/><path d="M20 29v5M17 31h6M20 34l-3 4M20 34l3 4"/>'),
    net: svg('<path d="M6 30h28" stroke-width="3" stroke="' + B + '"/><path d="M8 30l-2 6M32 30l2 6"/><circle cx="20" cy="12" r="3"/><path d="M20 15v7M15 18h10M20 22l-4 6M20 22l4 6"/>'),
    bomb: svg('<ellipse cx="20" cy="22" rx="7" ry="10" fill="' + I + '"/><path d="M15 12l-4-6h18l-4 6"/><path d="M8 32l24-24" stroke="' + R + '" stroke-width="2.4"/>'),
    big: svg('<ellipse cx="20" cy="15" rx="12" ry="12" stroke="' + R + '" fill="#f0d9d6"/><path d="M17 27l-2 5M23 27l2 5"/><ellipse cx="20" cy="35" rx="3" ry="3.6" fill="' + I + '"/>'),
    moon: svg('<path d="M26 6a14 14 0 1 0 8 22 11 11 0 0 1-8-22z" fill="#2e3550"/><circle cx="12" cy="10" r="1" fill="' + I + '"/><circle cx="8" cy="20" r="1" fill="' + I + '"/>'),
    tank: svg('<rect x="6" y="20" width="28" height="10" rx="4"/><rect x="12" y="13" width="14" height="8" rx="2"/><path d="M26 16h10" stroke-width="3"/><circle cx="12" cy="30" r="2"/><circle cx="20" cy="30" r="2"/><circle cx="28" cy="30" r="2"/>'),
    clock: svg('<circle cx="20" cy="21" r="13"/><path d="M20 13v8l6 4"/><path d="M16 4h8" stroke-width="3"/>'),
    ship: svg('<path d="M3 18h34l-4 8H7z" fill="#cfcbc2"/><path d="M12 18v-6h8v6M22 18v-4h5v4"/><path d="M10 26v5M18 26v5M26 26v5" stroke="' + R + '"/>')
  };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }

  var stage = document.getElementById('stage');
  var page = document.createElement('div');
  page.className = 'ch-page'; page.id = 'chPage'; page.hidden = true;
  page.setAttribute('role', 'dialog'); page.setAttribute('aria-modal', 'true'); page.setAttribute('aria-labelledby', 'chTitle');
  stage.appendChild(page);
  var card = document.createElement('div');
  card.className = 'overlay'; card.id = 'chCard'; card.hidden = true;
  stage.appendChild(card);

  function showPage() {
    var total = totalStars(), recs = records();
    page.innerHTML = '<span class="ch-hole" style="top:142px"></span><span class="ch-hole" style="top:352px"></span><span class="ch-hole" style="top:562px"></span>' +
      '<button class="ch-back" id="chBack" type="button">‹ Title</button>' +
      '<div class="ch-body"><div class="ch-head"><h2 class="ch-title" id="chTitle">Challenges</h2><span class="ch-total">' + total + ' of ' + LIST.length * 3 + ' stars</span></div>' +
      '<ul class="ch-list">' + LIST.map(function (ch) {
        var r = recs[ch.id] || {}, ok = total >= ch.need;
        var side = ok ? stars(r.stars || 0) + (r.best != null ? '<span>best ' + clock(r.best) + '</span>' : '') : '<span>' + (ch.need - total) + ' more ★</span>';
        return '<li><button class="ch-item" type="button" data-id="' + ch.id + '"' + (ok ? '' : ' disabled') + '><span class="ch-badge">' + BADGE[ch.badge] + '</span>' +
          '<span class="ch-name">' + esc(ch.name) + '<small>' + esc(ch.line) + '</small></span><span class="ch-side">' + side + '</span></button></li>';
      }).join('') + '</ul><p class="ch-note">Each one plays the same every time. Stars unlock the harder ones.</p></div>';
    page.hidden = false;
    var first = page.querySelector('.ch-item:not([disabled])');
    if (first) first.focus({ preventScroll: true });
  }
  function hidePage() { page.hidden = true; }
  page.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'chBack') { hidePage(); document.getElementById('challengesBtn').focus({ preventScroll: true }); return; }
    if (b.dataset.id && !b.disabled) start(b.dataset.id);
  });
  document.getElementById('challengesBtn').addEventListener('click', function () { world.sound.init(); showPage(); });
  // The list is over the title, so the title's keys (Enter starts Arcade) stay off while it's open; Escape closes it.
  window.addEventListener('keydown', function (e) {
    if (!page.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); hidePage(); document.getElementById('challengesBtn').focus({ preventScroll: true }); }
      else if (!(document.activeElement && page.contains(document.activeElement))) e.stopImmediatePropagation();
    } else if (!card.hidden && e.key !== 'Tab' && !(document.activeElement && card.contains(document.activeElement))) e.stopImmediatePropagation();
  }, true);
  world.onTitle = function () { hideCard(); };

  function hideCard() { card.hidden = true; }
  var CAUSE = { goal: 'The wave ended before the goal was met.', wall: 'The wall came down.' };
  function finish() {
    var S = world.S, c = S.ch, ch = cur;
    if (c.done) return;
    c.done = true;
    S.mode = 'over'; world.hidePause();
    var got = starsFor(S), n = got.filter(Boolean).length, before = totalStars();
    var time = Math.round(c.t), kept = keep(ch.id, n, time);
    var after = totalStars(), unlocked = LIST.filter(function (x) { return x.need > before && x.need <= after; });
    var idx = LIST.indexOf(ch), next = LIST.slice(idx + 1).find(open) || null;
    var why = n ? '' : (c.cause && c.cause !== 'goal' && c.cause !== 'wall' ? c.cause : S.wallHP <= 0 ? CAUSE.wall : CAUSE.goal);
    var title = n === 3 ? 'All three!' : n ? 'Done!' : 'Not this time';
    card.innerHTML = '<div class="card ch-card"><p class="tag">Challenge · ' + esc(ch.name) + '</p><h2>' + title + '</h2>' +
      stars(n) +
      (why ? '<p class="tag">' + esc(why) + '</p>' : '') +
      '<ul class="ch-goals">' + ch.stars.map(function (s, i) { return '<li' + (got[i] ? '' : ' class="miss"') + '>' + star(got[i]) + esc(s[0]) + '</li>'; }).join('') + '</ul>' +
      '<p class="tag">Time ' + clock(time) + (record(ch.id).best != null ? ' · best ' + clock(record(ch.id).best) : '') + (kept.newBest && kept.was.best != null ? ' · new best!' : '') + '</p>' +
      (unlocked.length ? '<p class="flag">Unlocked: ' + unlocked.map(function (x) { return esc(x.name); }).join(', ') + '</p>' : '') +
      '<div class="row"><button class="btn" id="chRetry" type="button">Retry</button>' +
      (next && n ? '<button class="btn ghost" id="chNext" type="button">Next</button>' : '') +
      '<button class="btn ghost" id="chList" type="button">List</button></div></div>';
    card.hidden = false;
    // amount: the stars again, for the balance tools' per-wave sums.
    world.emit('challenge_end', { id: ch.id, stars: n, amount: n, time: Math.round(c.t), cause: n ? 'done' : (c.cause && c.cause.length < 12 ? c.cause : S.wallHP <= 0 ? 'wall' : 'fail') });
    document.getElementById('chRetry').focus({ preventScroll: true });
    card.querySelector('#chRetry').addEventListener('click', function () { start(ch.id); });
    if (next && n) card.querySelector('#chNext').addEventListener('click', function () { start(next.id); });
    card.querySelector('#chList').addEventListener('click', function () { hideCard(); game.titleScene(); showPage(); });
  }

  return { LIST: LIST, start: start, stars: totalStars, records: records, show: showPage, PILOT: PILOT, BIG: BIG, STAND: STAND, cur: function () { return cur; }, state: C };
};
