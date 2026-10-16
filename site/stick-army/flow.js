// Stick Army's flow: the title page (its level form and demo), a new run, the pause card, game over and its card,
// what a run reports to play stats, full screen, the mute button, and the input that drives this device's barrel.
// Classic script; load before game.js, which calls StickArmyFlow(world, game) once, where this code always was in
// its order (so its listeners are added in the same order). game carries game.js's own pieces this needs, with
// getters and setters for the live ones (best, level, facingLoaded), which the harness and the bots reassign in
// game.js's scope.
var StickArmyFlow = function (world, game) {
  'use strict';
  var W = world.W, H = world.H, BK = world.BK, TUR = world.TUR, AIM_MIN = world.AIM_MIN, AIM_MAX = world.AIM_MAX, RUN = world.RUN, LEVELS = world.LEVELS;
  var SKY = world.SKY, SQUAD = world.SQUAD, LBOARD = world.board, lv = world.lv, load = world.load, save = world.save, clock = world.clock;
  var COOP = game.COOP, SHOP = game.SHOP, DREAD = game.DREAD, keys = game.keys, cv = game.cv, wrap = game.wrap;
  var clamp = game.clamp, emit = game.emit, explode = game.explode, gun = game.gun, hashSeed = game.hashSeed, hashTokens = game.hashTokens;
  var makePlane = game.makePlane, makeRecruit = game.makeRecruit, reset = game.reset, resizeMats = game.resizeMats, seedRun = game.seedRun;
  var shoot = game.shoot, speak = game.speak, startWave = game.startWave, fit = game.fit, ambienceState = game.ambienceState;
  var callStrike = game.callStrike, callFighter = game.callFighter, continueWave = game.continueWave, rankName = game.rankName, renderKit = game.renderKit;
  var callChipAt = game.callChipAt, drawSquadRow = game.drawSquadRow;

  // ---------- flow ----------
  var titleScreen = document.getElementById('titleScreen'), pauseScreen = document.getElementById('pauseScreen'), overScreen = document.getElementById('overScreen');
  var shopScreen = document.getElementById('shopScreen'), winScreen = document.getElementById('winScreen');
  var pauseBtn = document.getElementById('pauseBtn'), muteBtn = document.getElementById('muteBtn'), strikeBtn = document.getElementById('strikeBtn'), fighterBtn = document.getElementById('fighterBtn');

  function titleScene() {
    demoScene(0);
    showLevel();
    titleScreen.hidden = false; pauseScreen.hidden = true; overScreen.hidden = true; winScreen.hidden = true; pauseBtn.hidden = true;
    game.facingLoaded = false;
    fit();
    // Campaign's button says New or Continue (campaign-screens.js).
    if (world.onTitle) world.onTitle();
  }
  // The level picked on the title (LEVELS): ticked on the form, its record on the rubber stamp ("Best 446,661 / Won
  // 2×", with the best wave once endless has gone past 20), and its board on the notebook's facing page. Veteran wears
  // a "new" tag until it's been picked once on this device.
  var levelBtns = Array.prototype.slice.call(document.querySelectorAll('.t-rank'));
  function showLevel() {
    var L = LEVELS[game.level], wins = load(L.KEYS.wins, 0), bestWave = load(L.KEYS.wave, 0);
    game.best = load(L.KEYS.best, 0);
    levelBtns.forEach(function (b) { b.setAttribute('aria-checked', b.dataset.level === game.level ? 'true' : 'false'); b.tabIndex = b.dataset.level === game.level ? 0 : -1; });
    document.getElementById('vetNew').hidden = game.level === 'veteran' || !!load('stickarmy.veteran.seen', false);
    var bl = document.getElementById('bestLine'), wl = document.getElementById('winLine');
    bl.hidden = !(game.best > 0);
    bl.textContent = 'Best ' + Number(game.best).toLocaleString('en-US');
    wl.textContent = wins ? 'Won ' + wins + '×' + (bestWave > DREAD.WAVE ? ' · wave ' + bestWave : '') : ''; wl.hidden = !wins;
    document.getElementById('recordLine').hidden = bl.hidden && wl.hidden;
  }
  function pickLevel(name) { var S = world.S;
    if (!LEVELS[name] || S.mode !== 'title') return;
    var changed = name !== game.level;
    game.level = name; S.level = name; save('stickarmy.level', name);
    if (name === 'veteran') save('stickarmy.veteran.seen', true);
    showLevel();
    // The facing page's board follows the pick.
    if (changed) { game.facingLoaded = false; fit(); }
  }
  levelBtns.forEach(function (b, i) {
    b.addEventListener('click', function () { pickLevel(b.dataset.level); });
    // A radio group: the arrows move the tick.
    b.addEventListener('keydown', function (e) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
      e.preventDefault(); e.stopPropagation();
      var next = levelBtns[(i + 1) % levelBtns.length];
      pickLevel(next.dataset.level); next.focus({ preventScroll: true });
    });
  });
  world.levelBoard = function (name) { var S = world.S; return LEVELS[name || (S.mode === 'title' ? game.level : S.level)].BOARD; };
  world.levelName = function () { var S = world.S; return S.mode === 'title' ? game.level : S.level; };
  // ---------- the title's demo ----------
  // The title page plays the game in miniature, over and over: a plane crosses and drops two troopers. The turret
  // pops the first one's chute low over the mat and he bounces into the squad; it shoots the second. It runs the real
  // simulation (update) with a scripted gunner (updateDemo), mirrored each time round. Nothing here touches a run:
  // newGame resets everything, and the title has no score.
  var DEMO = { Y: 150, SPEED: 95, CATCH_X: 57, SHOOT_X: 296, CATCH_AT: 400, SHOOT_AT: 330, TURN: 2.3, REST: 3, RETRY: 0.6,
    LINES: ['here they come!', 'incoming!', 'planes!', 'heads up!'] };
  var demo = null;
  function demoScene(n) {
    reset();
    var S = world.S;
    S.matRight = false; resizeMats(); // the scripted catch is over the left mat
    S.mode = 'title';
    [[0, 'rifle'], [4, 'engineer']].forEach(function (d) { S.recruits.push(makeRecruit(d[0], d[1])); });
    var dir = n % 2 ? -1 : 1, p = makePlane('plane', dir, dir > 0 ? -50 : W + 50, DEMO.Y);
    p.speed = DEMO.SPEED;
    p.drops = [DEMO.CATCH_X, DEMO.SHOOT_X].sort(function (a, b) { return dir * (a - b); });
    p.kits = p.drops.map(function () { return { type: 'rifle', fall: 1, sway: 0, armor: 0 }; });
    S.planes.push(p);
    S.turrets[0].aim = -Math.PI / 2;
    demo = { n: n, rest: -1, shotAt: {} };
    speak(DEMO.LINES[n % DEMO.LINES.length], S.recruits[n % 2].id, false, 0.8);
  }
  function updateDemo(dt) { var S = world.S;
    var live = S.troopers.filter(function (t) { return !t.dead && t.state === 'chute' && t.open > 0.6; });
    // The one to deal with next: whoever is lowest.
    var t = live.sort(function (a, b) { return b.y - a.y; })[0];
    if (t) {
      var catching = t.x < 120, off = catching ? -32 : 14, tx = t.x, ty = t.y + off;
      for (var k = 0; k < 2; k++) { var flight = Math.hypot(tx - TUR.x, ty - TUR.y) / 700; ty = t.y + off + t.fall * flight; }
      var want = clamp(Math.atan2(ty - TUR.y, tx - TUR.x), AIM_MIN, AIM_MAX);
      var gun0 = S.turrets[0];
      gun0.aim += clamp(want - gun0.aim, -DEMO.TURN * dt, DEMO.TURN * dt);
      var last = demo.shotAt[t.id];
      if (t.y >= (catching ? DEMO.CATCH_AT : DEMO.SHOOT_AT) && Math.abs(want - gun0.aim) < 0.03 && (last == null || S.t - last > DEMO.RETRY)) {
        demo.shotAt[t.id] = S.t; shoot();
      }
      return;
    }
    if (S.planes.length || S.troopers.some(function (q) { return !q.dead; })) return;
    if (demo.rest < 0) demo.rest = DEMO.REST;
    if ((demo.rest -= dt) <= 0) demoScene(demo.n + 1);
  }
  function newGame() {
    world.sound.init();
    // A run seed: forced by a harness, fixed by #seed=, or random.
    var fixed = RUN.force != null ? RUN.force : hashSeed();
    // The online board: practice runs (a fixed seed, the tuning panel) never get a token, so they can't be saved.
    // Co-op runs aren't on the boards (coop.md).
    var token = LBOARD.begin(fixed != null || hashTokens().indexOf('tune') >= 0 || RUN.players > 1);
    // Play stats: a run still open (a restart from pause) reports as quit before reset() clears it.
    if (window.PlayStats) statsRun = PlayStats.start('stick-army', { board: world.levelBoard(), token: token || undefined, progress: runReport });
    seedRun(fixed != null ? fixed : Math.floor(Math.random() * 4294967296));
    reset();
    var S = world.S;
    S.mode = 'play'; S.hint = true;
    world.sound.ambience(ambienceState());
    startWave(1);
    titleScreen.hidden = true; pauseScreen.hidden = true; overScreen.hidden = true; winScreen.hidden = true; shopScreen.hidden = true; pauseBtn.hidden = false;
    fit();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // The named squad for the pause card: veterans by rank with their waves, a rookie count, and who's in the tent.
  // bare: without the "Squad: " lead (the shop's Squad section has its own heading).
  // short: names and ranks only (the pause card), without waves and kills.
  function squadLine(bare, short) { var S = world.S;
    var vets = S.recruits.filter(function (r) { return !r.dead && r.name; }).sort(function (a, b) { return b.rank - a.rank || b.waves - a.waves; });
    var rookies = S.recruits.filter(function (r) { return !r.dead && !r.name; }).length, parts = vets.map(function (r) { return short ? rankName(r) : SQUAD.record({ name: rankName(r), waves: r.waves, kills: r.kills }); });
    if (rookies) parts.push(rookies + (rookies > 1 ? ' rookies' : ' rookie'));
    var line = parts.length ? (bare ? '' : 'Squad: ') + parts.join(', ') + '.' : '';
    if (S.bed) line += (line ? ' ' : '') + 'In the tent: ' + (S.bed.r.name ? rankName(S.bed.r) : 'a rookie') + '.';
    return line;
  }
  function togglePause() { var S = world.S;
    // Either co-op player pauses for both: a guest asks the host (coop.js), whose pause comes back in the field.
    if (COOP && COOP.guest) { COOP.ask('pause'); return; }
    if (S.mode === 'play') {
      S.mode = 'paused'; clearInput();
      fillPause();
      pauseScreen.hidden = false;
      document.getElementById('resumeBtn').focus({ preventScroll: true });
    } else if (S.mode === 'paused') {
      S.mode = 'play'; pauseScreen.hidden = true;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    }
  }
  // The pause card's lines: the wave and time, the kit and the squad.
  function fillPause() { var S = world.S;
    document.getElementById('pauseTime').textContent = world.waveName(S.wave) + ' · ' + clock(S.played) + ' played';
    // A kind of run's objective (Campaign's mission goal and how it's going).
    var goal = document.getElementById('pauseGoal'), goalLine = world.rules().pauseLine ? world.rules().pauseLine() : '';
    goal.textContent = goalLine; goal.hidden = !goalLine;
    // The kit as icons (as in the shop) and the squad as the HUD draws it, with a short line of names.
    var kit = document.getElementById('pauseKit');
    kit.hidden = !renderKit(kit, false);
    var row = document.getElementById('pauseSquadRow'), squad = document.getElementById('pauseSquad'), line = squadLine(false, true);
    row.hidden = !drawSquadRow(row);
    squad.textContent = line; squad.hidden = !line;
  }
  function die() { var S = world.S;
    emit('game_over', { wave: S.wave, score: S.score, cause: S.lastHit || 'unknown' });
    S.mode = 'dying'; S.wallHP = 0; S.dieT = 1.6; S.turrets.forEach(function (t) { t.firing = false; });
    explode(BK.x, BK.top + 10, 46, 'final');
    S.shake = 0.8;
    pauseBtn.hidden = true;
    world.sound.play('over');
  }
  // What brought the wall down: the last source to hurt it (hurtWall).
  var OVER_CAUSE = { bomb: 'A bomb brought the wall down.', lander: 'Troopers at the wall broke through.', sniper: 'Sniper fire chipped the wall away.', tank: 'Tank shells knocked the wall down.', dreadnought: "The Dreadnought's guns brought the wall down.",
    dive: "A dive bomber's bomb brought the wall down.", balloon: "A balloon's bomb brought the wall down.", heli: 'Helicopter fire chipped the wall away.',
    heavy: "A heavy bomber's carpet brought the wall down." };
  // The Red Cross line on an end card: "3 of 8 got through", and the bonus when every one did.
  function showRedCross(prefix) { var S = world.S;
    var rc = SKY.redCrossRecord(), dd = document.getElementById(prefix + 'Red'), bonus = document.getElementById(prefix + 'Perfect');
    dd.textContent = rc.safe + ' of ' + rc.flew;
    dd.hidden = document.getElementById(prefix + 'RedLabel').hidden = !rc.flew;
    bonus.textContent = 'Red Cross: all safe! +' + SKY.MEDEVAC.PERFECT.toLocaleString('en-US');
    bonus.hidden = !rc.perfect;
    // HQ's supply planes the same way: "4 of 5" got across.
    var hq = document.getElementById(prefix + 'Hq'), flew = S.stats.hqSafe + S.stats.hqHit;
    hq.textContent = S.stats.hqSafe + ' of ' + flew;
    hq.hidden = document.getElementById(prefix + 'HqLabel').hidden = !flew;
  }
  world.showRedCross = showRedCross;
  function showOver() { var S = world.S;
    S.mode = 'over';
    showRedCross('st');
    if (statsRun) { PlayStats.end(statsRun, runReport()); statsRun = null; }
    // Co-op runs leave this device's records alone: different difficulty, two guns (coop.md).
    var isBest = !S.coop && S.score > game.best;
    if (isBest) { game.best = S.score; save(lv().KEYS.best, game.best); }
    document.getElementById('overScore').textContent = S.score.toLocaleString('en-US');
    document.getElementById('newBest').hidden = !isBest || S.score === 0;
    document.getElementById('overLevel').hidden = S.level !== 'veteran';
    document.getElementById('stWave').textContent = String(S.wave);
    document.getElementById('stTime').textContent = clock(S.played);
    var wonLine = document.getElementById('overWon');
    wonLine.textContent = S.won ? 'You won at wave ' + S.wonAt + ', then held to wave ' + S.wave + '.' : '';
    wonLine.hidden = !S.won;
    world.saveBestWave(S.wave);
    document.getElementById('stCap').textContent = String(S.stats.captured);
    document.getElementById('stPop').textContent = String(S.stats.popped);
    document.getElementById('stPlanes').textContent = String(S.stats.planes);
    document.getElementById('stZeps').textContent = String(S.stats.zeppelins);
    document.getElementById('stZeps').hidden = document.getElementById('stZepsLabel').hidden = !S.stats.zeppelins;
    document.getElementById('stDmg').textContent = String(Math.round(S.stats.wallDamage));
    document.getElementById('stShots').textContent = S.stats.shots.toLocaleString('en-US');
    document.getElementById('stTanks').textContent = String(S.stats.tanks);
    document.getElementById('stTanks').hidden = document.getElementById('stTanksLabel').hidden = !S.stats.tanks;
    var cause = OVER_CAUSE[S.lastHit];
    // Who was still standing: the squad row as it was in the HUD (roles, stripes), and their names.
    var row = document.getElementById('overSquadRow'), line = squadLine(), squad = document.getElementById('overSquad');
    row.hidden = !drawSquadRow(row); squad.textContent = line; squad.hidden = !line;
    var lost = document.getElementById('overFallen');
    lost.textContent = SQUAD.goneLine();
    lost.hidden = !lost.textContent;
    document.getElementById('overCause').textContent = cause || '';
    document.getElementById('overCause').hidden = !cause;
    document.getElementById('stBest').textContent = Number(game.best).toLocaleString('en-US');
    overScreen.hidden = false;
    document.getElementById('againBtn').focus({ preventScroll: true });
    LBOARD.finish(overScreen.querySelector('.card'), false);
  }
  // What a run reports to play stats (site/assets/stats.js), at game over or when the page is left mid-run.
  // The crew count includes a recruit in the field hospital (S.bed), as the roll call does.
  // A run counts as won once S.won is set (Arcade's victory); a winner who keeps going reports again at the end.
  var statsRun = null;
  function runReport() { var S = world.S;
    var st = {
      wave: S.wave, kills: S.stats.kills, captured: S.stats.captured, popped: S.stats.popped, planes: S.stats.planes,
      zeppelins: S.stats.zeppelins, tanks: S.stats.tanks, wall_damage: Math.round(S.stats.wallDamage), shots: S.stats.shots,
      crew: S.recruits.filter(function (r) { return !r.dead; }).length + (S.bed ? 1 : 0), fallen: S.fallen.length, tags: S.players.reduce(function (n, p) { return n + p.tags; }, 0)
    };
    if ((S.mode === 'over' || S.mode === 'dying') && S.lastHit) st.cause = S.lastHit;
    // won_score: the score at the victory card, so an endless run still shows what it won with.
    if (S.won) { st.won_at = S.wonAt; st.won_score = S.wonScore; }
    if (S.captain) st.captain = S.captain;
    if (S.endless) st.endless = true;
    if (S.level !== 'soldier') st.level = S.level;
    // Co-op: reported once, by the host, with each player's points and planes.
    if (S.coop) { st.coop = true; st.host_score = S.players[0].score; st.guest_score = S.players[1].score; st.host_planes = S.players[0].planes; st.guest_planes = S.players[1].planes; }
    return { score: S.score, time_ms: Math.round(S.played * 1000), won: !!S.won, input: S.input, stats: st };
  }
  // A win is reported as soon as the victory card shows. The handle stays, so a winner who keeps going is reported
  // again if the page is hidden mid-run, and once more at the final game over.
  function reportWin() { if (statsRun) PlayStats.end(statsRun, runReport()); }
  document.getElementById('keepBtn').addEventListener('click', function () { var S = world.S; if (statsRun && S.endless) PlayStats.resume(statsRun); });
  function updateMuteBtn() {
    muteBtn.setAttribute('aria-pressed', world.sound.muted ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', world.sound.muted ? 'Unmute sound' : 'Mute sound');
    // The icons are SVG elements, which have no hidden property, so the attribute is set directly.
    document.getElementById('icoSound').toggleAttribute('hidden', world.sound.muted);
    document.getElementById('icoMuted').toggleAttribute('hidden', !world.sound.muted);
    titleSoundBtn.textContent = world.sound.muted ? 'Sound off' : 'Sound on';
    titleSoundBtn.setAttribute('aria-pressed', world.sound.muted ? 'false' : 'true');
  }

  // Fullscreen API with a fill-window fallback (including iPhone).
  var fullBtn = document.getElementById('fullBtn'), wakeLock = null;
  function setFull(on) {
    wrap.classList.toggle('full', on);
    fullBtn.querySelector('.full-label').textContent = on ? 'Exit full screen' : 'Full screen';
    fullBtn.setAttribute('aria-pressed', String(on));
    if (on && navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (lock) {
      if (!wrap.classList.contains('full')) { lock.release().catch(function () {}); return; }
      wakeLock = lock; lock.addEventListener('release', function () { if (wakeLock === lock) wakeLock = null; });
    }).catch(function () {});
    if (!on && wakeLock) { wakeLock.release().catch(function () {}); wakeLock = null; }
    fit();
  }
  function toggleFull() {
    var native = document.fullscreenElement || document.webkitFullscreenElement;
    if (wrap.classList.contains('full')) {
      if (native) { try { var out = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (out && out.catch) out.catch(function () {}); } catch (e) {} }
      setFull(false);
    } else {
      setFull(true);
      var req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
      if (req) { try { var result = req.call(wrap); if (result && result.catch) result.catch(function () {}); } catch (e) {} }
    }
  }
  function nativeFullChanged() { if (!(document.fullscreenElement || document.webkitFullscreenElement)) setFull(false); else fit(); }
  document.addEventListener('fullscreenchange', nativeFullChanged);
  document.addEventListener('webkitfullscreenchange', nativeFullChanged);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && wrap.classList.contains('full')) setFull(true); });
  fullBtn.addEventListener('click', toggleFull);

  function clearInput() { var S = world.S; keys.left = keys.right = keys.fire = false; if (S.turrets) S.turrets.forEach(function (t) { t.firing = false; }); }

  // ---------- input ----------
  function toLogical(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height };
  }
  // Aims this device's barrel at a point on the page (from its own mount).
  function aimAt(p) {
    var t = gun(), a = Math.atan2(p.y - TUR.y, p.x - t.x);
    // Below-left angles continue past -PI so the range stays one continuous sweep.
    if (a > Math.PI / 2) a -= Math.PI * 2;
    t.aim = clamp(a, AIM_MIN, AIM_MAX);
  }
  cv.addEventListener('pointerdown', function (e) { var S = world.S;
    if (S.mode !== 'play') return;
    world.sound.init();
    // A call in the HUD makes the call instead of firing.
    var chip = callChipAt(toLogical(e));
    if (chip) { if (chip.kind === 'bomber') callStrike(); else callFighter(); e.preventDefault(); return; }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    aimAt(toLogical(e)); gun().firing = true;
    // Touch (or a pen) on the page marks the run as touch on the board and in play stats; menus don't count.
    if (e.pointerType === 'touch' || e.pointerType === 'pen') { S.input = 'touch'; LBOARD.touched(); }
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) { var S = world.S;
    if (S.mode !== 'play') return;
    if (e.pointerType === 'mouse' || gun().firing) aimAt(toLogical(e));
  });
  function stopFire() { gun().firing = false; }
  cv.addEventListener('pointerup', stopFire);
  cv.addEventListener('pointercancel', stopFire);
  cv.addEventListener('lostpointercapture', stopFire);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('keydown', function (e) { var S = world.S;
    if (e.target.closest && e.target.closest('#tunePanel')) return;
    var k = e.key;
    if ((k === 'f' || k === 'F') && !e.repeat && !e.ctrlKey && !e.metaKey) { toggleFull(); return; }
    if (k === 'Escape' && wrap.classList.contains('full') && !(document.fullscreenElement || document.webkitFullscreenElement)) { setFull(false); return; }
    if (S.mode === 'shop') {
      if (k === 'Tab') {
        var buttons = Array.from(shopScreen.querySelectorAll('button:not(:disabled)'));
        var at = buttons.indexOf(document.activeElement), next = (at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        e.preventDefault(); buttons[next].focus();
      }
      return;
    }
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') { keys.left = true; if (S.mode === 'play') e.preventDefault(); }
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') { keys.right = true; if (S.mode === 'play') e.preventDefault(); }
    else if (k === 'Escape' && LBOARD.closeScores()) { /* closed the title's high scores */ }
    // On the title, Space or Enter starts a run unless a button has focus (which gets the key itself).
    else if ((k === ' ' || k === 'Enter') && S.mode === 'title' && document.getElementById('scoresScreen').hidden &&
      !(document.activeElement && document.activeElement.closest && document.activeElement.closest('button, a'))) { e.preventDefault(); document.getElementById('startBtn').click(); }
    else if (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'w' || k === 'W') { if (S.mode === 'play') { keys.fire = true; world.sound.init(); e.preventDefault(); } }
    else if (k === 'p' || k === 'P' || k === 'Escape') { togglePause(); }
    else if ((k === 'b' || k === 'B') && !e.repeat && S.mode === 'play') { callStrike(); }
    else if ((k === 'c' || k === 'C') && !e.repeat && S.mode === 'play') { callFighter(); }
  });
  window.addEventListener('keyup', function (e) {
    var k = e.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false;
    else if (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'w' || k === 'W') keys.fire = false;
  });
  // Leaving the window lets go of this device's controls only.
  window.addEventListener('blur', function () { var S = world.S; keys.left = keys.right = keys.fire = false; if (S.turrets) gun().firing = false; });
  // A co-op guest leaving the page doesn't pause the host's game; its barrel just goes quiet (coop.js).
  document.addEventListener('visibilitychange', function () { var S = world.S; if (document.hidden && S.mode === 'play' && !(COOP && COOP.guest)) togglePause(); });
  window.addEventListener('resize', fit);

  // In co-op the next wave waits for both players' Ready (coop.js).
  document.getElementById('continueBtn').addEventListener('click', function () { if (COOP && COOP.ready()) return; continueWave(); });
  document.getElementById('undoBtn').addEventListener('click', function () { SHOP.undo(); });
  document.getElementById('startBtn').addEventListener('click', newGame);
  document.getElementById('againBtn').addEventListener('click', newGame);
  document.getElementById('winAgainBtn').addEventListener('click', newGame);
  document.getElementById('restartBtn').addEventListener('click', newGame);
  // Quit, on the pause, game-over and victory cards: back to the title. A run quit from pause reports as quit to play
  // stats. In co-op it leaves the room, as the room's own Leave does.
  function quitToTitle() {
    if (COOP && COOP.role) { COOP.leave(); return; }
    if (statsRun && world.S.mode === 'paused') PlayStats.quit(statsRun);
    statsRun = null;
    titleScene();
    document.getElementById('startBtn').focus({ preventScroll: true });
  }
  document.getElementById('overQuitBtn').addEventListener('click', quitToTitle);
  document.getElementById('winQuitBtn').addEventListener('click', quitToTitle);
  document.getElementById('pauseQuitBtn').addEventListener('click', quitToTitle);
  document.getElementById('resumeBtn').addEventListener('click', togglePause);
  // A click on the page around the pause card resumes, as Resume does (one that starts and ends off the card).
  var pauseDownOutside = false;
  pauseScreen.addEventListener('pointerdown', function (e) { pauseDownOutside = e.target === pauseScreen; });
  pauseScreen.addEventListener('click', function (e) { var S = world.S; if (pauseDownOutside && e.target === pauseScreen && S.mode === 'paused') togglePause(); pauseDownOutside = false; });
  pauseBtn.addEventListener('click', togglePause);
  strikeBtn.addEventListener('click', function () { callStrike(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  fighterBtn.addEventListener('click', function () { callFighter(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  // A call button shows during play while the radio holds that call, with the count; it waits while one is flying.
  // Only touches the DOM when something changed.
  var callsShown = '';
  function syncCallBtns() { var S = world.S;
    var c = S.calls, key = S.mode === 'play' ? [c.bomber, c.fighter, !!S.strike, !!S.fighter].join() : '';
    if (key === callsShown) return;
    callsShown = key;
    strikeBtn.hidden = S.mode !== 'play' || c.bomber <= 0;
    strikeBtn.disabled = !!S.strike;
    document.getElementById('strikeCount').textContent = String(c.bomber);
    fighterBtn.hidden = S.mode !== 'play' || c.fighter <= 0;
    fighterBtn.disabled = !!S.fighter;
    document.getElementById('fighterCount').textContent = String(c.fighter);
  }
  // The browser plays nothing until the page is touched, so the title's music starts with the first touch or key.
  function wakeSound() { var S = world.S; if (S.mode === 'title' && !world.sound.muted) world.sound.init(); }
  document.addEventListener('pointerdown', wakeSound, true);
  document.addEventListener('keydown', wakeSound, true);
  // The menus' buttons make a sound (audio.js click and press, heard on the title too); the shop's have their own.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (!b || b.disabled || b.closest('#shopScreen .shop-stock, .hud-btns') || b.id === 'titleSoundBtn') return;
    world.sound.play(b.classList.contains('btn') ? 'press' : 'click');
  }, true);
  // The title's chips do what the buttons around the page do.
  var titleSoundBtn = document.getElementById('titleSoundBtn');
  titleSoundBtn.addEventListener('click', function () { muteBtn.click(); if (!world.sound.muted) world.sound.play('click'); titleSoundBtn.focus({ preventScroll: true }); });
  document.getElementById('titleFullBtn').addEventListener('click', function () { fullBtn.click(); });
  var titleScoresBtn = document.getElementById('titleScoresBtn');
  titleScoresBtn.hidden = !LBOARD.available;
  titleScoresBtn.addEventListener('click', LBOARD.openScores);
  muteBtn.addEventListener('click', function () {
    world.sound.muted = !world.sound.muted; save('stickarmy.muted', world.sound.muted); updateMuteBtn();
    if (!world.sound.muted) world.sound.init();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });


  return { titleScreen: titleScreen, pauseScreen: pauseScreen, overScreen: overScreen, shopScreen: shopScreen,
    winScreen: winScreen, pauseBtn: pauseBtn, muteBtn: muteBtn, strikeBtn: strikeBtn, fighterBtn: fighterBtn,
    titleScene: titleScene, levelBtns: levelBtns, showLevel: showLevel, pickLevel: pickLevel, DEMO: DEMO,
    demoScene: demoScene, updateDemo: updateDemo, newGame: newGame, squadLine: squadLine, togglePause: togglePause,
    fillPause: fillPause, die: die, OVER_CAUSE: OVER_CAUSE, showRedCross: showRedCross, showOver: showOver,
    runReport: runReport, reportWin: reportWin, updateMuteBtn: updateMuteBtn, fullBtn: fullBtn, setFull: setFull,
    toggleFull: toggleFull, nativeFullChanged: nativeFullChanged, clearInput: clearInput, toLogical: toLogical,
    aimAt: aimAt, stopFire: stopFire, syncCallBtns: syncCallBtns, wakeSound: wakeSound, titleSoundBtn: titleSoundBtn,
    titleScoresBtn: titleScoresBtn };
};
