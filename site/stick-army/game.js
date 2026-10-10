(function () {
  'use strict';

  // ---------- constants ----------
  // The online boards (board.js, scores/games.json): Soldier's and Veteran's. A change to how fast points come starts
  // a new board for that level.
  const BOARD = 1;
  const VETERAN_BOARD = 2;
  var W = 400, H = 720, GROUND = 612;
  var BK = { x: 200, x1: 168, x2: 232, top: 576 };
  var TUR = { x: 200, y: 570 };
  var SLOTS = [154, 139, 124, 109, 246, 261, 276, 291];
  var TRAMPS = [{ x1: 22, x2: 92, y: 596, dip: 0, v: 0 }, { x1: 308, x2: 378, y: 596, dip: 0, v: 0 }];
  var SLOT_ORDER = [0, 4, 1, 5, 2, 6, 3, 7];
  // A popped trooper arriving faster than this rips through the mat. 680 only rips pops right under the planes.
  var CAPTURE_SPEED = 680;
  // Turret heat: each volley adds heat (scaled so fire-rate upgrades keep the same heat per second),
  // heat bleeds off continuously, and reaching 1 locks the gun. Each volley also costs SHOT_COST points.
  var BALANCE = { DROP_CHANCE: 0.15, PLANES_PER_WAVE: 2, FALL_PER_WAVE: 4, DROPS_PER_WAVE: 0.5, WALL_DAMAGE: 6,
    FIRE_COOLDOWN: 0.2, HEAT_PER_SHOT: 0.11, COOL_RATE: 0.22, OVERHEAT_LOCK: 1.5, SHOT_COST: 1, BOSS_HP_PER_WAVE: 8 };
  // Every BOSS_EVERY waves a zeppelin moves in (see the zeppelin section).
  var BOSS_EVERY = 5;
  // ---------- levels ----------
  // Soldier is the campaign as it is. Veteran (docs/games/stick-army/veteran.md) goes after stacking upgrades: a
  // markup on everything in the shop climbing to PRICE by wave FROM (shop.js markup), PLANES and ARMOR from FROM (waveCfg), a Dreadnought with DREAD times
  // the health (campaign.js) and SMOKE times the smoke screen's linger (sky.js), and spread shot's side bullets only
  // grazing it, for GRAZE of the damage (hitTest), so it pays to aim the middle one. Scoring is the same on both; each has its own board and records (KEYS). A run's level is
  // S.level, from the title's pick (level), which the device remembers.
  var LEVELS = {
    soldier: { NAME: 'Soldier', BOARD: BOARD, PRICE: 1, FROM: Infinity, PLANES: 1, ARMOR: 0, DREAD: 1, SMOKE: 1, GRAZE: 1,
      KEYS: { best: 'stickarmy.best.3', wins: 'stickarmy.wins', wave: 'stickarmy.bestWave' } },
    veteran: { NAME: 'Veteran', BOARD: VETERAN_BOARD, PRICE: 1.33, FROM: 10, PLANES: 1.2, ARMOR: 0.15, DREAD: 1, SMOKE: 1.5, GRAZE: 0.75,
      KEYS: { best: 'stickarmy.veteran.best', wins: 'stickarmy.veteran.wins', wave: 'stickarmy.veteran.bestWave' } }
  };
  var level = 'soldier';
  // Co-op (coop.md) is harder: two gunners are a lot more firepower, more so once each barrel has its own upgrades.
  // COOP_HARD scales the planes and bombers from MORE[0] on wave 1 to MORE[1] by wave FULL, and the Dreadnought's
  // health by DREAD. Tuned with the balance bots playing two barrels (run.py --option coop=1).
  var COOP_HARD = { MORE: [1.2, 2], FULL: 15, DREAD: 2 }, coopLevels = {};
  function coopMore(n) { var k = Math.min(1, Math.max(0, (n - 1) / (COOP_HARD.FULL - 1))); return COOP_HARD.MORE[0] + (COOP_HARD.MORE[1] - COOP_HARD.MORE[0]) * k; }
  function lv() {
    var L = LEVELS[S && S.level] || LEVELS.soldier;
    if (!(S && S.players)) return L;
    var key = S.level || 'soldier';
    return coopLevels[key] || (coopLevels[key] = Object.assign({}, L, { DREAD: L.DREAD * COOP_HARD.DREAD }));
  }
  // The low lane (round 13): from wave LOW.WAVE a share of the planes (bombers from LOW.BOMBERS) fly low across the
  // middle of the page, a little faster. Their troopers have less sky to fall through and their bombs land sooner. The
  // share grows by STEP a wave to MAX. Not on boss waves, whose escorts keep their own lanes.
  var LOW = { WAVE: 2, BOMBERS: 3, SHARE: 0.15, STEP: 0.03, MAX: 0.4, PLANE_Y: [246, 296], BOMBER_Y: [188, 220], SPEED: 1.1 };
  // Road tanks: the first FIRST seconds into the wave, then every GAP seconds (times the wave's pace). Round 14 ("lots
  // of late arriving tanks... they just need to be more impactful"): on wave 17 the last pair rolled in as the planes
  // ran out, at about 27 s, and the wave dragged on to about 50 s against tanks alone. They were 11 s, then 11-16 s;
  // now they come while the planes and bombers are still overhead. Round 16 ("a couple tanks straggling that kind of
  // roll in, and you're like, what are you doing here, man?"): they rolled out in time, at about 7, 13 and 18 s on
  // wave 17, but a tank takes about 13 s to drive in, so the last pair still arrived after the planes, at about 31 s.
  // They were 7 s, then 8-12 s; now they all roll out in the first half of the wave and arrive with the rush.
  var ROAD = { FIRST: 4, GAP: [5, 7] };
  // Nothing of consequence flies above the page's top rule (SKY_TOP, y 100), where the score and tags are written
  // (round 14: "nothing 'of consequence' flies above that line. ambient things are no problem"). The high lanes keep a
  // plane's fin and a bomber's tail below it (they started at 98 and 104; cargo planes, heavy bombers, the zeppelins,
  // the air strike and fighter cover moved down too); dive bombers level off below it as they climb away, and the
  // Dreadnought's sorties come back in from the side (sky.js). Smoke and the like drift where they will.
  // DREAD: the escorts' low lane under the Dreadnought, which sits 14 px lower since round 14 (it was 276-330).
  var SKY_TOP = 100, SKY_LANES = { PLANE: [120, 206], BOMBER: [130, 148], ESCORT: [120, 130], DREAD: [290, 344] };
  // A bomber lets its bombs go no nearer the edge than this (round 14: the fighting stays on the page; inView).
  var BOMB_EDGE = 12;
  // What a bomb does to the wall. Round 14: 16 (it was 18), giving back what keeping the fighting on the page took
  // (planes and cargo planes no longer go down before they show, so more bombs and tanks arrive). For the bots it
  // brings waves 6 to 16 back to about where the sixth playtest left them.
  var BOMB_WALL = 16;
  var ENEMIES = {
    medic: { minWave: Infinity, cooldown: 2, spread: 0.14, hp: 3.2 },
    rifle: { minWave: 1, cooldown: 2, spread: 0.14, hp: 2.6 },
    engineer: { minWave: 1, cooldown: 2, spread: 0.14, hp: 2.6 },
    bazooka: { minWave: 2, cooldown: 4, spread: 0.03, hp: 2.6 },
    // With no crew to hit, a sniper plinks at the turret for abandonAfter seconds, then slips away unrewarded.
    sniper: { minWave: 3, cooldown: 3.2, spread: 0.025, hp: 2.6, damage: 0.9, abandonAfter: 14 }
  };
  // From ARMOR.WAVE some troopers wear a flak vest that stops one body hit (two from ARMOR.HEAVY, with a helmet).
  // Popping the chute, rockets and other blasts work as usual, so the turret copes better than the crew.
  var ARMOR = { WAVE: 10, HEAVY: 17 };
  // The barrel can tip slightly below horizontal on either side: enough to hit landers near the wall,
  // not enough to reach the far field. Angles run continuously from AIM_MIN (below left) to AIM_MAX (below right).
  var AIM_DIP = 0.3;
  var AIM_MIN = -Math.PI - AIM_DIP, AIM_MAX = AIM_DIP;
  var REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  var css = getComputedStyle(document.documentElement);
  function tok(n, f) { var v = css.getPropertyValue(n).trim(); return v || f; }
  var PAPER = tok('--paper', '#fbf8ef'), RULE = tok('--rule', '#cfdcec'), MARGIN = tok('--margin', '#e6a2a0');
  var INK = tok('--ink', '#2e2e33'), INK2 = tok('--ink-soft', '#5d5a55');
  var RED = tok('--enemy', '#c8433a'), BLUE = tok('--ally', '#2f6fdc'), HAT = tok('--hat', '#f2c230');
  var RED_FILL = 'rgba(200,67,58,0.14)', INK_FILL = 'rgba(46,46,51,0.07)', EMPTY = '#aaa395';
  var HAND = '"Schoolbell", "Comic Sans MS", "Chalkboard SE", cursive';
  var DISPLAY = '"Cabin Sketch", "Schoolbell", "Comic Sans MS", cursive';

  // Randomness comes in streams so a seed reproduces content (SPEC-005). R and rr are for cosmetic effects only.
  // RW (wave content: spawn timing, aircraft, drops, trooper types) and RS (shop offers) are reseeded every wave from
  // the run seed, so wave n is the same for a seed however earlier waves went. Each aircraft takes one draw from RW
  // to seed its own sub-stream, so shooting it early doesn't shift what follows. RC is combat (crew aim and timing).
  var R = Math.random;
  function rr(a, b) { return a + R() * (b - a); }
  // RUN.players: 2 for a co-op run (two barrels, coop.md), set by coop.js before newGame.
  var RUN = { seed: 0, force: null, players: 1 }, RW = Math.random, RS = Math.random, RC = Math.random;
  function between(rnd, a, b) { return a + rnd() * (b - a); }
  function mix(a, b) {
    var h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab | 0, 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d); h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
    return (h ^ (h >>> 15)) >>> 0;
  }
  function substream(rnd) { return mulberry(Math.floor(rnd() * 4294967296)); }
  function seedRun(seed) { RUN.seed = seed >>> 0; RC = mulberry(mix(RUN.seed, 0x5eed)); }
  function seedWave(n) { RW = mulberry(mix(RUN.seed, n * 2 + 1)); RS = mulberry(mix(RUN.seed, n * 2 + 2)); }
  // The hash is &-separated tokens, e.g. #tune&seed=42. A seed there fixes every run in the session.
  function hashTokens() { return location.hash.replace(/^#/, '').split('&'); }
  function hashSeed() {
    var token = hashTokens().find(function (t) { return /^seed=\d+$/.test(t); });
    return token ? Number(token.slice(5)) : null;
  }
  // Key moments call emit. It does nothing in normal play; test harnesses attach a listener (SPEC-005).
  var emitHook = null;
  function emit(type, data) { if (S && S.players) playerEvent(type, data || {}); if (emitHook) emitHook(type, data || {}); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- canvas setup ----------
  var wrap = document.getElementById('wrap'), frameEl = document.getElementById('frame'), stage = document.getElementById('stage');
  var cv = document.getElementById('game'), ctx = cv.getContext('2d');
  var bg = document.createElement('canvas'), bgx = bg.getContext('2d');
  var dc = document.createElement('canvas'), dcx = dc.getContext('2d');
  var G = ctx, K = 1;
  // Canvas resolution follows the screen's pixel ratio, up to 2 on touch screens and 2.5 elsewhere. If frames run
  // slow during play, it steps down half a ratio at a time (never below 1, never back up), so weak phones stay smooth
  // and capable ones stay sharp.
  var renderCap = matchMedia('(pointer: coarse)').matches ? 2 : 2.5, frameWatch = { sum: 0, n: 0 };
  function noteFrame(ms) {
    if (S.mode !== 'play' || document.hidden || ms > 100 || Math.min(window.devicePixelRatio || 1, renderCap) <= 1) return;
    frameWatch.sum += ms; frameWatch.n++;
    if (frameWatch.sum < 2000) return;
    var mean = frameWatch.sum / frameWatch.n;
    frameWatch.sum = frameWatch.n = 0;
    if (mean > 24) { renderCap = Math.max(1, Math.min(renderCap, window.devicePixelRatio || 1) - 0.5); fit(); }
  }

  // The title opens the notebook on a wide screen: the facing page (#facing) sits to the right of the game page.
  var facing = document.getElementById('facing'), SPREAD_ASPECT = 1.05, facingLoaded = false;
  function fit() {
    var padding = getComputedStyle(wrap);
    var aw = Math.max(1, wrap.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight));
    var ah = Math.max(1, wrap.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom));
    var spread = S.mode === 'title' && aw / ah >= SPREAD_ASPECT, pages = spread ? 2 : 1;
    var s = Math.min(aw / (W * pages), ah / H);
    var dpr = Math.min(window.devicePixelRatio || 1, renderCap);
    frameEl.style.width = (W * s * pages) + 'px';
    frameEl.style.height = (H * s) + 'px';
    stage.style.transform = 'scale(' + s + ')';
    wrap.classList.toggle('spread', spread);
    facing.hidden = !spread;
    // The facing page's top five load only when it shows (once per visit to the title), so phones ask for nothing.
    if (spread && !facingLoaded) { facingLoaded = true; LBOARD.titleRows(); }
    facing.style.transform = 'translateX(' + (W * s) + 'px) scale(' + s + ')';
    K = s * dpr;
    [cv, bg, dc].forEach(function (c) { c.width = Math.max(1, Math.round(W * K)); c.height = Math.max(1, Math.round(H * K)); });
    bgx.setTransform(K, 0, 0, K, 0, 0);
    dcx.setTransform(K, 0, 0, K, 0, 0);
    drawPaper();
    redrawDecals();
  }

  function drawPaper() {
    var g = bgx, rnd = mulberry(7), i, y;
    g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(80,70,50,0.05)';
    for (i = 0; i < 260; i++) g.fillRect(rnd() * W, rnd() * H, 0.6 + rnd(), 0.6);
    g.strokeStyle = RULE; g.lineWidth = 1; g.beginPath();
    for (y = 100; y < H; y += 28) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
    g.stroke();
    g.strokeStyle = MARGIN; g.lineWidth = 1.4; g.beginPath(); g.moveTo(46.5, 0); g.lineTo(46.5, H); g.stroke();
    [150, 360].forEach(function (hy) {
      g.beginPath(); g.arc(20, hy, 7, 0, Math.PI * 2); g.fillStyle = '#e7e1d3'; g.fill();
      g.beginPath(); g.arc(20, hy, 7, Math.PI * 0.9, Math.PI * 1.9); g.strokeStyle = 'rgba(60,50,30,0.25)'; g.lineWidth = 1.5; g.stroke();
    });
    g.fillStyle = 'rgba(120,96,50,0.07)'; g.fillRect(0, GROUND, W, H - GROUND);
  }

  // persistent ink on the page
  var decals = [];
  // Stamp each new mark once. The bounded history is only replayed after a resize or the wipe between waves.
  // Older marks stay in the current raster until then, or a new run.
  // Co-op: the host's new marks go to the guest, except those particles leave as they land (partsBusy), which the
  // guest's own particles leave there too.
  var partsBusy = false;
  function addDecal(d) { drawDecal(d); decals.push(d); if (decals.length > 500) decals.shift(); if (COOP && !partsBusy) COOP.fx('d', d); }
  function redrawDecals() { dcx.clearRect(0, 0, W, H); decals.forEach(drawDecal); }
  // Between waves the page gets a wipe: old ink fades, and the faintest marks go. During a wave the ink fades a
  // little every DECAL.EVERY seconds, so the ground never builds into a solid band.
  var DECAL = { EVERY: 4, FADE: 0.7, WASH: 0.45, GONE: 0.06 }, inkT = 0;
  function washDecals(k) {
    k = k || DECAL.WASH;
    if (COOP) COOP.fx('w', k);
    for (var i = decals.length - 1; i >= 0; i--) { decals[i].a *= k; if (decals[i].a < DECAL.GONE) decals.splice(i, 1); }
    redrawDecals();
  }
  // The in-wave fade thins the whole ink layer in one pass instead of redrawing every mark, so it costs no frame time.
  function fadeInk(dt) {
    inkT += dt;
    if (inkT < DECAL.EVERY || !decals.length) return;
    inkT = 0;
    dcx.save(); dcx.setTransform(1, 0, 0, 1, 0, 0); dcx.globalCompositeOperation = 'destination-out';
    dcx.fillStyle = 'rgba(0,0,0,' + (1 - DECAL.FADE) + ')'; dcx.fillRect(0, 0, dc.width, dc.height); dcx.restore();
    for (var i = decals.length - 1; i >= 0; i--) { decals[i].a *= DECAL.FADE; if (decals[i].a < DECAL.GONE) decals.splice(i, 1); }
  }
  function drawDecal(d) {
    var g = dcx, rnd = mulberry(d.seed), i, t, r, x, y;
    g.save(); g.globalAlpha = d.a;
    if (d.kind === 'body') {
      var previous = G; G = g; drawBodyPart(d); G = previous;
    } else if (d.kind === 'splat') {
      g.fillStyle = d.color; g.beginPath();
      for (i = 0; i <= 11; i++) {
        t = i / 11 * Math.PI * 2; r = d.r * (0.6 + rnd() * 0.6);
        x = d.x + Math.cos(t) * r * 1.5; y = d.y + Math.sin(t) * r * 0.5;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.fill();
      for (i = 0; i < 6; i++) { g.beginPath(); g.arc(d.x + (rnd() - 0.5) * d.r * 4.5, d.y + (rnd() - 0.8) * d.r * 1.2, 0.8 + rnd() * 1.8, 0, Math.PI * 2); g.fill(); }
    } else {
      g.strokeStyle = d.color; g.lineWidth = 1.2; g.beginPath();
      for (i = 0; i < 40; i++) {
        t = rnd() * Math.PI * 2; r = rnd() * d.r;
        x = d.x + Math.cos(t) * r * 1.4; y = d.y + Math.sin(t) * r * 0.45;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.stroke();
    }
    g.restore();
  }

  // ---------- hand-drawn pen with line boil ----------
  var boil = 0, PS = 0, PN = 0;
  function hash(a, b) {
    var h = Math.imul(a ^ 0x5bd1e995, 0x27d4eb2d) ^ Math.imul((b + 0x165667b1) | 0, 0x9e3779b1 | 0);
    h ^= h >>> 15; h = Math.imul(h, 0x85ebca77 | 0); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae3d | 0); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function pen(id) { PS = (Math.imul(id | 0, 2654435761 | 0) + boil * 977) | 0; PN = 0; }
  function jt(a) { PN++; return (hash(PS, PN) - 0.5) * 2 * a; }
  function L(x1, y1, x2, y2, a) {
    if (a == null) a = 0.8;
    var ax = x1 + jt(a), ay = y1 + jt(a), bx = x2 + jt(a), by = y2 + jt(a);
    G.moveTo(ax, ay);
    G.quadraticCurveTo((ax + bx) / 2 + jt(a * 1.2), (ay + by) / 2 + jt(a * 1.2), bx, by);
  }
  function Ci(cx, cy, r, a) {
    if (a == null) a = 0.45;
    var n = Math.max(9, Math.round(r * 1.3)), s = hash(PS, ++PN) * Math.PI * 2, i, t, q, x, y;
    for (i = 0; i <= n; i++) {
      t = s + (i / n) * Math.PI * 2 * 1.07; q = r + jt(a);
      x = cx + Math.cos(t) * q; y = cy + Math.sin(t) * q;
      if (i) G.lineTo(x, y); else G.moveTo(x, y);
    }
  }
  function SP(pts, closed, a) {
    if (a == null) a = 0.7;
    var n = pts.length / 2, P = [], i, p, q;
    for (i = 0; i < n; i++) P.push([pts[i * 2] + jt(a), pts[i * 2 + 1] + jt(a)]);
    if (closed) {
      G.moveTo((P[n - 1][0] + P[0][0]) / 2, (P[n - 1][1] + P[0][1]) / 2);
      for (i = 0; i < n; i++) { p = P[i]; q = P[(i + 1) % n]; G.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
    } else {
      G.moveTo(P[0][0], P[0][1]);
      for (i = 1; i < n - 1; i++) { p = P[i]; q = P[i + 1]; G.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2); }
      G.lineTo(P[n - 1][0], P[n - 1][1]);
    }
  }
  function ink(c, w) { G.strokeStyle = c; G.lineWidth = w; G.lineCap = 'round'; G.lineJoin = 'round'; }

  // ---------- sound and saved preferences ----------
  var sound = window.StickArmySound, best = 0;

  function load(key, def) { try { var v = localStorage.getItem(key); return v == null ? def : JSON.parse(v); } catch (e) { return def; } }
  function save(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }

  // ---------- state ----------
  var S = {}, nextId = 1;
  // keys: this device's keyboard. It drives the local barrel (gun()); the pointer sets that barrel's firing.
  var keys = { left: false, right: false, fire: false };
  // ---------- the turret's barrels ----------
  // S.turrets: one barrel in solo; two in co-op (coop.md), side by side on the one turret, each with its own aim, heat
  // and lock, and its own volleys (rockets come every fourth of a barrel's own). `gun` is the barrel's player (0 the
  // host, 1 the guest) and goes on every round it fires, so scores can be split by player; x is where it's mounted.
  // (A round's `by` is something else: the soldier who fired it, for kill counts.)
  // `me` is which barrel this device's input drives. A barrel no one here drives is moved from outside (coop.js sets
  // its aim and firing).
  // Turret upgrades (TURRET_MODS: quick trigger, cooling fins, double barrel, spread, flak, rockets, piercing) belong to
  // a barrel: in co-op each player buys their own, so each barrel has its own `mods`. Solo's one barrel has none and
  // reads S.mods, as it always has (gm).
  var me = 0, TWIN_MOUNT = 7, TURRET_MODS = ['fire', 'cool', 'double', 'spread', 'flak', 'rockets', 'pierce'];
  function makeTurret(gun, x, own) {
    var t = { gun: gun, x: x, aim: -Math.PI / 2, heat: 0, overheat: 0, recoil: 0, firing: false, fireCD: 0, volleys: 0 };
    if (own) t.mods = { fire: 0, cool: 0, double: false, spread: false, flak: false, rockets: false, pierce: false, stacks: {} };
    return t;
  }
  function setTurrets(n) {
    S.turrets = n > 1 ? [makeTurret(0, TUR.x - TWIN_MOUNT, true), makeTurret(1, TUR.x + TWIN_MOUNT, true)] : [makeTurret(0, TUR.x)];
  }
  function gm(t) { return t.mods || S.mods; }
  // A co-op player's own tally: the points their barrel earned (its rounds, the chutes it popped that were caught,
  // its own combo), and its planes, catches and Red Cross hits for the end card. Points nobody fired for (the squad,
  // air strikes, wave bonuses) go to the team score only. `gunner` is the barrel whose round is being resolved.
  function makePlayer() { return { score: 0, combo: 0, comboT: 0, planes: 0, captured: 0, redCross: 0, kills: 0 }; }
  var gunner = null;
  function scorer() { return S.players && gunner != null ? S.players[gunner] || null : null; }
  function playerEvent(type, data) {
    var p = scorer();
    if (!p) return;
    if (type === 'plane_down' && data.by === 'player') p.planes++;
    else if (type === 'kill' && data.by === 'player') p.kills++;
    else if (type === 'capture') p.captured++;
    else if (type === 'redcross_hit') { p.redCross++; p.combo = 0; p.comboT = 0; p.score = Math.max(0, p.score - (data.pts || 0)); }
  }
  function gun() { return S.turrets[me] || S.turrets[0]; }

  function reset() {
    S = {
      input: 'keys',
      mode: 'title', t: 0, score: 0, wave: 0, wallHP: 100,
      mods: { slots: 4, secondTramp: false, catcher: false, aim: 0, fire: 0, cool: 0, mat: 0, trench: 0, helmet: 0, hired: 0, maxHP: 100, wire: false, double: false, spread: false, flak: false, rockets: false, pierce: false, mines: false, medic: false, auto: false, hospital: false, flag: false, stacks: {} },
      coins: 0, autoCD: 0, autoAim: -Math.PI / 2, mines: [], shop: null, delivery: null, pizzaOrder: false, waveStart: { kills: 0, captured: 0, wall: 0 },
      turrets: null, flagUp: 0, saluteT: 0,
      planes: [], troopers: [], recruits: [], bullets: [], bombs: [], enemyShots: [], parts: [], texts: [],
      tanks: [], wreck: null, calls: { bomber: 0, fighter: 0 }, strike: null, strikeBombs: [], fighter: null, radio: null, crates: [], medevac: [], skyFx: [], hq: [], tagLoss: 0, tagLost: 0, bubbles: [], night: 0,
      bed: null, fallen: [], usedNames: {}, news: [], sketches: [], played: 0, nextWave: null,
      spawn: null, waveState: 'idle', waveTimer: 0, banner: null,
      combo: 0, comboT: 0, shake: 0, repairLevel: 0, dieT: 0, smokeT: 0,
      stats: { captured: 0, popped: 0, kills: 0, planes: 0, zeppelins: 0, tanks: 0, dreads: 0, wallDamage: 0, shots: 0, redCross: 0, redCrossHit: 0 },
      hint: false, slotRes: {}, finalWon: false, won: false, wonAt: 0, endless: false, redCrossPaid: false,
      matRight: (mix(RUN.seed, 0x3a7) & 1) === 1, level: level,
      // Co-op: each player's own points, combo and counts (coop.md); null in solo.
      players: RUN.players > 1 ? [makePlayer(), makePlayer()] : null
    };
    setTurrets(RUN.players); resizeMats(); clearInput();
    TRAMPS.forEach(function (tr) { tr.dip = 0; tr.v = 0; });
    clearInk();
  }
  function clearInk() { decals.length = 0; inkT = 0; redrawDecals(); if (COOP) COOP.fx('x'); }

  // A run is 20 waves. Bosses every fifth: a zeppelin (5), the armored zeppelin (10), two zeppelins at once (15) and
  // the Dreadnought (20); in endless the twins return on the fives and the Dreadnought on the tens. Something new
  // arrives on most waves (startWave says what), and the curves below keep climbing through 19 and on into endless.
  function waveCfg(n) {
    var boss = n % BOSS_EVERY === 0, dreadWave = boss && isDreadWave(n), twin = boss && !dreadWave && n >= ZEP.TWIN_WAVE && n % 10 === 5;
    var c = {
      // Boss waves trade the bombers and half the planes for the boss. The Dreadnought brings a light escort and nothing
      // on the ground, so the fight is with the ship.
      planes: Math.round((5 + BALANCE.PLANES_PER_WAVE * n) * (dreadWave ? 0.4 : boss ? 0.5 : 1)),
      bombers: !boss && n >= 2 ? (n <= 9 ? Math.min(5, n - 1) : 6 + Math.floor((n - 10) * 0.7)) : 0,
      boss: boss ? (twin ? 2 : 1) : 0, bossKind: dreadWave ? 'dread' : boss ? 'zeppelin' : null, twin: twin,
      rushes: n >= RUSH.WAVE && !dreadWave ? Math.min(6, 1 + Math.floor((n - RUSH.WAVE) / 3)) : 0,
      rushSize: Math.min(6, 2 + Math.floor((n - RUSH.WAVE) / 4)),
      cargo: n >= TANK.WAVE && !dreadWave ? Math.min(4, 1 + Math.floor((n - TANK.WAVE) / 3)) : 0,
      // From TANK.ROAD_WAVE some tanks roll in from the page edge instead, so they can't all be stopped in the air.
      road: n >= TANK.ROAD_WAVE && !dreadWave ? Math.min(4, 1 + Math.floor((n - TANK.ROAD_WAVE) / 3)) : 0,
      // Each bomber carries up to six bombs, then one more from 14 and another from 18.
      bombCount: Math.min(6 + Math.floor(Math.max(0, n - 10) / 4), 3 + Math.floor((n - 2) / 2)),
      sniperChance: n >= ENEMIES.sniper.minWave ? Math.min(0.3, 0.10 + n * 0.015) : 0,
      armorChance: n >= ARMOR.WAVE ? Math.min(0.6, 0.1 + 0.04 * (n - ARMOR.WAVE)) : 0,
      armorHits: n >= ARMOR.HEAVY ? 2 : 1,
      // Planes come quickly from the start, hold a 0.85 s gap from wave 5 to 9, then keep tightening to 0.3 s.
      interval: n <= 4 ? 1.7 - 0.18 * n : n <= 9 ? 0.85 : Math.max(0.3, 0.85 - 0.045 * (n - 9)),
      speed: n <= 10 ? 65 + 8 * n : 145 + 5 * (n - 10),
      // Up to six troopers a plane by wave 8, seven from 10 and eight from 12.
      maxDrops: Math.min(n >= 12 ? 8 : n >= 10 ? 7 : 6, 2 + Math.ceil(BALANCE.DROPS_PER_WAVE * n)),
      fall: Math.min(130, 47 + BALANCE.FALL_PER_WAVE * n),
      special: n === 1 ? 0.15 : Math.min(0.45, 0.16 + 0.06 * n),
      low: !boss && n >= LOW.WAVE ? Math.min(LOW.MAX, LOW.SHARE + LOW.STEP * (n - LOW.WAVE)) : 0,
      // The night raid: the page goes dark (sky.js drawNight).
      night: n >= SKY.NIGHT.WAVE && (n - SKY.NIGHT.WAVE) % 10 === 0 && !boss
    };
    // Balloons (4), the Red Cross plane (6), helicopters (7), HQ drops (8), dive bombers (12), heavy bombers (13): sky.js.
    var extra = SKY.counts(n, dreadWave, boss);
    for (var k in extra) c[k] = extra[k];
    // Veteran: from wave FROM, more planes and more armor; boss waves keep their own shape.
    var L = lv();
    if (n >= L.FROM && !boss) { c.planes = Math.round(c.planes * L.PLANES); c.armorChance = Math.min(0.75, c.armorChance + L.ARMOR); }
    if (S && S.players) { var more = coopMore(n); c.planes = Math.round(c.planes * more); c.bombers = Math.round(c.bombers * more); }
    return c;
  }

  // The final wave's decoy builds up like the real thing: a horn, rumbling and a great shadow creeping in from one
  // side, a soldier on that side chirping "Oh no... here it comes!" TEASE_CHIRP seconds before it shows, then a lone
  // zeppelin sails in, slowly.
  var TEASE_CHIRP = 1.4;
  function teaseIn(sp, dt) {
    if (sp.teaseT == null) {
      sp.teaseT = DREAD.DECOY_BUILD; sp.teaseDir = RW() < 0.5 ? 1 : -1; sp.rumbleT = 0.6; sound.play('horn');
      addText('something big is coming...', sp.teaseDir > 0 ? 150 : W - 150, 260, RED, 24, 'alert');
    }
    sp.teaseT -= dt; sp.rumbleT -= dt;
    if (sp.rumbleT <= 0) { sp.rumbleT = 1.1; S.shake = Math.max(S.shake, 0.15 + 0.15 * (1 - sp.teaseT / DREAD.DECOY_BUILD)); sound.play('rumble'); }
    // A squad chirp as it's about to show (round 14, the second win: "oh no here it comes"). It replaces "oh no, here it
    // is!" as it came into view, which was lost under the banner.
    if (sp.teaseT <= TEASE_CHIRP && !sp.chirped) {
      sp.chirped = true;
      var crew = S.recruits.filter(standing).sort(function (a, b) { return sp.teaseDir * (a.x - b.x); });
      if (crew.length) speak('oh no... here it comes!', crew[0].id, false, 0); else addText('oh no... here it comes!', 200, 420, BLUE, 24, 'story');
    }
    if (sp.teaseT > 0) return;
    sp.decoy = spawnZeppelin({ decoy: true, dir: sp.teaseDir }); sp.decoy.speed = sp.decoy.enterSpeed = DREAD.DECOY_SPEED;
    sp.bossT = 1e9; sound.play('horn');
  }
  function drawTease() {
    var sp = S.spawn;
    if (!sp || !(sp.teaseT > 0) || sp.decoy) return;
    var k = 1 - sp.teaseT / DREAD.DECOY_BUILD, x = sp.teaseDir > 0 ? -120 + k * 150 : W + 120 - k * 150;
    G.save(); G.globalAlpha = 0.1 + 0.12 * k; G.fillStyle = INK;
    G.beginPath(); G.ellipse(x, GROUND - 2, 150, 8, 0, 0, Math.PI * 2); G.fill(); G.restore();
  }

  // 1 up to wave 9, then the gaps shrink with the plane interval, to half by wave 21.
  function wavePace(c) { return Math.max(0.5, Math.min(1, c.interval / 0.85)); }

  // Floating text comes in kinds, so the busy moments stay readable:
  //   alert: threats in red ("sniper!", "rush!", "wall -18"), bigger, longer, always shown, drawn on top;
  //   story: the squad and the radio in blue ("Pfc. Inky!", "man down!", "+1 air strike"), always shown;
  //   big:   large awards (tank down, zeppelin down), always shown;
  //   score: routine kill labels, small, soft and short; kills close together merge ("bonk! ×5 +250");
  //   minor: little reactions ("clank!", "pop!", "+").
  // Score and minor labels share a budget (TEXT.BUDGET on screen); over it, new ones are skipped. The combo
  // counter and the dog tags still show the reward. Labels stay below the HUD band.
  var TEXT = { BUDGET: 5, MERGE_S: 0.35, MERGE_PX: 44, TOP: 112,
    KIND: { alert: { size: 23, life: 1.3 }, story: { size: 20, life: 1.2 }, big: { size: 22, life: 1.1 }, score: { size: 17, life: 0.6 }, minor: { size: 16, life: 0.55 } },
    ORDER: { score: 0, minor: 1, big: 2, story: 3, alert: 4 } };
  // merge (optional): { key, pts, fmt(n, pts), window } folds repeats near the same spot into the label already there.
  function addText(s, x, y, color, size, kind, merge) {
    kind = kind || (color === RED ? 'alert' : 'story');
    var spec = TEXT.KIND[kind], routine = kind === 'score' || kind === 'minor';
    // Long labels stay on the page: x is clamped by the label's rough width.
    function onPage(xx, str, size) { var half = str.length * size * 0.25 + 4; return clamp(xx, Math.min(W / 2, half), Math.max(W / 2, W - half)); }
    x = onPage(x, s, size || spec.size); y = clamp(y, TEXT.TOP + 18, GROUND - 6);
    if (merge) {
      var near = S.texts.find(function (q) { return q.key === merge.key && S.t - q.lastT < (merge.window || TEXT.MERGE_S) && Math.abs(q.x - x) < TEXT.MERGE_PX && Math.abs(q.y - y) < TEXT.MERGE_PX; });
      if (near) {
        near.n++; near.pts += merge.pts; near.s = near.fmt(near.n, near.pts); near.lastT = S.t; near.life = near.max;
        near.size = near.size0 + Math.min(HL.GROW_MAX, (near.n - 1) * HL.GROW); near.x = onPage(near.x, near.s, near.size);
        if (!near.hl && near.pts >= HL.PTS) { near.hl = true; near.hlT = S.t; near.color = near.color === INK2 ? INK : near.color; }
        return;
      }
    }
    if (routine && S.texts.filter(function (q) { return q.kind === 'score' || q.kind === 'minor'; }).length >= TEXT.BUDGET) return;
    // Step out of the way of labels already there: try a line above, below, then two lines.
    var sz = size || spec.size, wide = s.length * sz * 0.5;
    var clear = function (yy) { return !S.texts.some(function (q) { return Math.abs(q.x - x) < (wide + q.s.length * q.size * 0.5) / 2 && Math.abs(q.y - yy) < (sz + q.size) * 0.45; }); };
    var tries = [0, -1, 1, -2, 2], slot = tries.find(function (k) { var yy = y + k * sz * 1.1; return yy >= TEXT.TOP + 10 && yy <= GROUND - 6 && clear(yy); });
    if (slot !== undefined) y += slot * sz * 1.1;
    var hl = kind === 'big' || (merge && merge.pts >= HL.PTS);
    S.texts.push({ s: s, key: merge && merge.key, fmt: merge && merge.fmt, n: 1, pts: merge ? merge.pts : 0, lastT: S.t, kind: kind, x: x, y: y,
      color: hl && color === INK2 ? INK : color, size: sz, size0: sz, hl: hl, hlT: S.t, life: spec.life, max: spec.life, rot: rr(-0.14, 0.1), vy: routine ? -30 : -38 });
  }
  // Wall damage from one burst reads as one running total.
  function wallText(amount) {
    addText('wall -' + amount, BK.x, BK.top - 36, RED, 20, 'alert', { key: 'wall', pts: amount, window: 0.8, fmt: function (n, p) { return 'wall -' + Math.round(p); } });
  }
  // quiet: the points and tags without the label (the final wave's decoy going down, round 14).
  function award(base, x, y, label, color, useCombo, quiet) {
    var mult = 1, p = scorer();
    if (useCombo && p) { p.combo++; p.comboT = 1.4; mult = Math.min(p.combo, 5); }
    else if (useCombo) { S.combo++; S.comboT = 1.4; mult = Math.min(S.combo, 5); }
    var pts = base * mult;
    S.score += pts;
    if (p) p.score += pts;
    var tags = Math.max(1, Math.round(base / 15)) + Math.floor(mult / 3);
    S.coins += tags; flyTags(x, y, tags);
    emit('coins', { amount: tags, reason: OUCH.indexOf(label) >= 0 ? 'kill' : label.replace(/!+$/, '') });
    if (quiet) return;
    // Every kind of trooper cry merges with the others, under the first one's word.
    if (base >= 100) addText(label + ' +' + pts, x, y, color === BLUE ? BLUE : INK, null, 'big');
    else addText(label + ' +' + pts, x, y, color === BLUE ? BLUE : INK2, null, 'score',
      { key: OUCH.indexOf(label) >= 0 ? 'ouch' : label, pts: pts, fmt: function (n, p) { return label + ' ×' + n + ' +' + p; } });
  }
  // S.coins is the dog-tag balance. Earned tags fly from the kill to the counter so their source is obvious.
  var TAG_HUD = { x: 290, y: 47 };
  function flyTags(x, y, n) {
    // Tags from one burst of kills fly as one; in a big pile-up, new tags fold into one already in flight.
    var flying = S.parts.filter(function (q) { return q.k === 'tag'; });
    var near = flying.find(function (q) { return q.t < 0.2 && Math.abs(q.x0 - x) < 50 && Math.abs(q.y0 - y) < 50; });
    if (near) { near.n += n; return; }
    if (flying.length >= 6) { flying[flying.length - 1].n += n; return; }
    S.parts.push({ k: 'tag', x0: x, y0: y, x: x, y: y, n: n, t: 0, dur: rr(0.55, 0.75), life: 1, max: 1, rot: rr(-0.6, 0.6), id: nextId++ });
  }
  // ---------- little voices ----------
  // Who's talking: a small speech bubble with the line, over a recruit (followed as he moves) or at a given spot, for
  // BUBBLE.LIFE seconds after any delay. The line itself is spoken in audio.js (say). At most BUBBLE.MAX at once.
  var BUBBLE = { LIFE: 1.3, MAX: 3 };
  // Bubbles count their own ids, apart from nextId: some speech is cosmetic small talk on Math.random (SQUAD.smallTalk),
  // so it must never shift the ids of things in the fight.
  var bubbleId = 1;
  function speak(text, id, enemy, delay, x, y, mood) {
    var r = id != null && S.recruits.find(function (q) { return q.id === id && !q.dead; });
    if (r || x != null) {
      if (S.bubbles.length >= BUBBLE.MAX) S.bubbles.shift();
      S.bubbles.push({ s: text.charAt(0).toUpperCase() + text.slice(1), rid: r ? r.id : null, x: r ? r.x : x, y: r ? GROUND - (r.down ? 40 : 62) : y,
        t: -(delay || 0), life: BUBBLE.LIFE, enemy: !!enemy, id: bubbleId++ });
    }
    if (sound.say) sound.say(text, id, enemy, delay, mood);
  }
  function updateBubbles(dt) {
    S.bubbles.forEach(function (b) {
      b.t += dt; if (b.t >= 0) b.life -= dt;
      var r = b.rid != null && S.recruits.find(function (q) { return q.id === b.rid; });
      if (r) b.x = r.x;
    });
    S.bubbles = S.bubbles.filter(function (b) { return b.life > 0; });
  }
  function drawBubbles() {
    S.bubbles.forEach(function (b) {
      if (b.t < 0) return;
      var a = Math.min(1, b.life / 0.3, b.t / 0.08 + 0.2), col = b.enemy ? RED : BLUE;
      G.save(); G.globalAlpha = a; G.font = '16px ' + HAND;
      var tw = G.measureText(b.s).width, bw = tw + 14, bh = 22, cx = clamp(b.x, bw / 2 + 4, W - bw / 2 - 4), top = Math.max(TEXT.TOP, b.y - bh - 10);
      pen(b.id);
      G.beginPath(); SP([cx - bw / 2, top, cx + bw / 2, top, cx + bw / 2, top + bh, b.x + 6, top + bh, b.x, top + bh + 8, b.x - 3, top + bh, cx - bw / 2, top + bh], true, 0.4);
      G.fillStyle = PAPER; G.fill(); ink(col, 1.8); G.stroke();
      G.fillStyle = col; G.textAlign = 'center'; G.fillText(b.s, cx, top + 16);
      G.restore();
    });
  }
  // Losing tags (the Red Cross plane): they fly out of the counter toward what cost them, and the counter flashes red
  // with the amount under it (drawHUD).
  function loseTags(n, x, y) {
    S.tagLoss = 1.2; S.tagLost = n;
    for (var i = 0; i < Math.min(6, Math.ceil(n / 8)); i++) S.parts.push({ k: 'tagout', x0: TAG_HUD.x, y0: TAG_HUD.y, x1: x + rr(-20, 20), y1: y + rr(-10, 20), x: TAG_HUD.x, y: TAG_HUD.y, t: -i * 0.06, dur: rr(0.5, 0.7), life: 1, max: 1, rot: rr(-0.6, 0.6), id: nextId++ });
  }
  // Effects thin out when the page is busy: past FX.BUSY particles, bursts throw a third of the flecks, every other
  // puff is skipped, kills break into fewer pieces and smoke trails thin. All cosmetic, so no game stream is touched.
  var FX = { BUSY: 200 }, puffN = 0;
  function busy() { return S.parts.length > FX.BUSY; }
  function burst(x, y, n, color, speed) {
    if (busy()) n = Math.ceil(n / 3);
    for (var i = 0; i < n; i++) {
      var a = rr(0, Math.PI * 2), v = rr(0.4, 1) * speed;
      S.parts.push({ k: 'fleck', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, life: rr(0.3, 0.6), max: 0.6, c: color, id: nextId++ });
    }
  }
  function puff(x, y, r, life) {
    if (busy() && (puffN++ & 1)) return;
    S.parts.push({ k: 'puff', x: x, y: y, r: r, vr: rr(14, 30), life: life, max: life, id: nextId++ });
  }
  // ---------- the highlighter ----------
  // The page's third pen, after your blue and their red: a yellow highlighter, kept for your big moments so routine
  // kills stay quiet. Downing a plane, tank or zeppelin, a mine and your air strike's bombs flash a comic starburst
  // (pow). Labels worth HL.PTS or more, and big awards, get a highlighter swipe behind them, and merged labels grow
  // as their count climbs. Purely cosmetic.
  var HL = { COLOR: 'rgba(255, 221, 51, 0.7)', POW: 'rgba(255, 214, 38, 0.95)', PTS: 300, SWIPE: 0.14, POW_LIFE: 0.32, GROW: 1.5, GROW_MAX: 9,
    POW_KINDS: { wreck: 1, mine: 0.9, strike: 0.6 } };
  function pow(x, y, r) {
    if (busy()) r *= 0.75;
    S.parts.push({ k: 'pow', x: x, y: y, r: r, life: HL.POW_LIFE, max: HL.POW_LIFE, rot: rr(0, 1.2), id: nextId++ });
  }

  // ---------- spawning ----------
  function makePlane(kind, dir, x, y) {
    var b = kind === 'bomber';
    return { id: nextId++, kind: kind, dir: dir, x: x, y: y, speed: 0, hp: b ? 3 : 1, drops: [], bombRun: [],
      state: 'fly', rot: 0, vy: 0, smoke: 0, hitFlash: 0, sc: b ? 0.86 : 0.78, hw: b ? 44 : 30, hh: b ? 15 : 11 };
  }
  function pickDropX(rnd) {
    // A little more drops over the mats each wave, so catches don't dry up as the sky gets busier.
    var tr = activeTramps(), chance = Math.min(0.3, BALANCE.DROP_CHANCE + 0.012 * Math.max(0, (S.wave || 1) - 1));
    if (rnd() < chance) { var mat = tr[Math.floor(rnd() * tr.length)]; return between(rnd, mat.x1 + 12, mat.x2 - 12); }
    // The remaining drops avoid mats, preserving the configured opportunity rate (mirrored when the first mat is on the right).
    var x = rnd() < 0.5 ? between(rnd, 106, 146) : (S.mods.secondTramp ? between(rnd, 254, 294) : between(rnd, 254, 382));
    return S.matRight ? W - x : x;
  }
  function activeTramps() { return S.mods.secondTramp ? TRAMPS : [TRAMPS[0]]; }
  function unlockedSlots() { return SLOT_ORDER.slice(0, S.mods.slots); }

  function spawnPlane(kind, src) {
    var c = S.spawn.cfg, rnd = substream(src || RW), dir = rnd() < 0.5 ? 1 : -1;
    var low = c.low > 0 && (kind === 'plane' || S.wave >= LOW.BOMBERS) && rnd() < c.low, lane = kind === 'bomber' ? LOW.BOMBER_Y : LOW.PLANE_Y;
    // On boss waves the escort keeps to a high lane above the zeppelin, and to a low one under the Dreadnought.
    var p = makePlane(kind, dir, dir > 0 ? -60 : W + 60, low ? between(rnd, lane[0], lane[1]) : kind === 'bomber' ? between(rnd, SKY_LANES.BOMBER[0], SKY_LANES.BOMBER[1]) : c.bossKind === 'dread' ? between(rnd, SKY_LANES.DREAD[0], SKY_LANES.DREAD[1]) : c.boss ? between(rnd, SKY_LANES.ESCORT[0], SKY_LANES.ESCORT[1]) : between(rnd, SKY_LANES.PLANE[0], SKY_LANES.PLANE[1]));
    p.rng = rnd; p.low = low;
    p.speed = (kind === 'bomber' ? c.speed * 0.62 : c.speed * between(rnd, 0.85, 1.25)) * (low ? LOW.SPEED : 1);
    if (kind === 'plane') {
      // Each drop carries its trooper, rolled now, so shooting the plane early doesn't change who jumps.
      var n = 1 + Math.floor(rnd() * c.maxDrops);
      for (var i = 0; i < n; i++) p.drops.push(pickDropX(rnd));
      p.drops.sort(function (a, b) { return dir * (a - b); });
      p.kits = p.drops.map(function () { return rollTrooper(rnd); });
    } else {
      // A spaced string covering both trenches, one crew position and the wall.
      var targets = [];
      for (var j = 0; j < c.bombCount; j++) targets.push(38 + j * 324 / (c.bombCount - 1));
      targets[Math.floor(targets.length / 2)] = BK.x;
      var crew = S.recruits.filter(standing);
      if (crew.length && targets.length > 3) targets[1] = crew[Math.floor(rnd() * crew.length)].x;
      p.bombRun = targets.map(function (target) {
        var floor = target > BK.x1 && target < BK.x2 ? BK.top - 8 : GROUND - 6;
        var tf = Math.sqrt(2 * (floor - (p.y + 14)) / 260);
        var vx = dir * p.speed * 0.35;
        // Bombers hold their bombs until they're over the page (round 14), so a mark near the edge is overshot a little.
        return { x: clamp(target - vx * tf, BOMB_EDGE, W - BOMB_EDGE), vx: vx };
      }).sort(function (a, b) { return dir * (a.x - b.x); });
    }
    S.planes.push(p);
    if (low && !S.lowTold) { S.lowTold = true; addText('flying low!', dir > 0 ? 90 : W - 90, p.y + 34, RED, 22); }
    emit('plane_spawn', { kind: kind, dir: dir, y: p.y, speed: p.speed, low: low, drops: p.drops.slice(), troopers: (p.kits || []).map(function (k) { return k.type; }), bombs: p.bombRun.length });
  }
  // Who jumps: type, fall-speed factor and sway phase, drawn from a content stream.
  function rollTrooper(rnd) {
    var c = S.spawn ? S.spawn.cfg : waveCfg(1), type = 'rifle';
    if (rnd() < c.sniperChance) type = 'sniper';
    else if (rnd() < c.special) type = S.wave < ENEMIES.bazooka.minWave ? 'engineer' : (rnd() < 0.5 ? 'bazooka' : 'engineer');
    var kit = { type: type, fall: between(rnd, 0.9, 1.15), sway: rnd() * 6.28, armor: 0 };
    if (c.armorChance && type !== 'sniper' && rnd() < c.armorChance) kit.armor = c.armorHits || 1;
    return kit;
  }
  function spawnTrooper(x, y, kit) {
    var c = S.spawn ? S.spawn.cfg : waveCfg(1);
    kit = kit || rollTrooper(RW);
    var t = { id: nextId++, x: clamp(x, 14, W - 14), y: y, type: kit.type, state: 'chute', open: 0,
      fall: c.fall * kit.fall, sway: kit.sway, vy: 0, rot: 0, spin: 0, dir: 1, walk: 0, thump: 0,
      attacking: null, atWall: false, shotCD: 2.2, alone: 0, aim: 0, armor: kit.armor || 0, pingT: -1, dead: false };
    // The Dreadnought's crew bailing out shoot at the squad on the way down.
    if (kit.gunner) { t.gunner = true; t.gunT = 0.8; t.flash = 0; }
    S.troopers.push(t);
    emit('trooper_spawn', { x: t.x, type: t.type });
    return t;
  }
  function makeRecruit(slot, type, id) {
    var hx = SLOTS[slot];
    var r = { id: id || nextId++, type: type, slot: slot, x: hx, homeX: hx, tx: hx, hp: ENEMIES[type].hp + (S.mods ? S.mods.helmet : 0), role: 'shoot',
      cd: between(RC, 0.4, 1), aim: -Math.PI / 2 + (hx < 200 ? -0.35 : 0.35), walk: 0, hurt: 0, sparkT: 0, dead: false };
    // After Boot Camp (and Elite Training), new soldiers, hired or caught, arrive with their stripes (shop.js).
    if (S.mods && S.mods.training) SQUAD.train(r, S.mods.training);
    return r;
  }

  // Crew health: helmets raise the maximum, trenches cut every kind of damage.
  var TRENCH = [1, 0.6, 0.4];
  function crewMax(r) { return ENEMIES[r.type].hp + S.mods.helmet + (r.rank || 0) * RANK.HP; }
  function standing(r) { return !r.dead && !r.down; }
  // At zero health a recruit falls wounded (squad.js); any damage while down finishes him.
  function hurtRecruit(r, amount, cause) {
    if (r.dead) return;
    if (r.down) { recruitDie(r, cause); return; }
    r.hp -= amount * TRENCH[Math.min(S.mods.trench, TRENCH.length - 1)];
    r.hurt = Math.max(r.hurt, 0.2);
    if (r.hp <= 0) knockDown(r, cause);
  }
  // Wall bookkeeping for the event log; the last source to hurt the wall is the game-over cause.
  function hurtWall(amount, source) { S.wallHP -= amount; S.stats.wallDamage += amount; S.lastHit = source; emit('wall_damage', { source: source, amount: amount }); }
  function repairWall(amount, source) {
    var before = S.wallHP; S.wallHP = Math.min(S.mods.maxHP, S.wallHP + amount);
    if (S.wallHP > before) emit('wall_repair', { source: source, amount: S.wallHP - before });
  }

  // ---------- waves ----------
  // A wave opens one thing at a time: a pizza ordered in the shop is delivered first (S.waveState 'pizza'), then a new
  // flagpole goes up (S.waveState 'flag', openWave), then the banner, then the sketches of what you bought (SKETCH.DELAY in), then the enemies. Once the planes are done and the
  // field is clear, anything still due (a rush, a cargo plane, the zeppelin) comes in after WAVE_HURRY seconds.
  var WAVE_BANNER = 2.2, WAVE_HURRY = 1.5;
  function startWave(n) {
    S.wave = n; seedWave(n);
    // With the flag flying, the squad salutes it as the wave's bugle plays.
    if (S.mods.flag && S.flagUp >= 1) S.saluteT = FLAG.SALUTE;
    S.medevac = []; S.skyFx = []; S.wreck = null;
    S.waveStart = { kills: S.stats.kills, captured: S.stats.captured, wall: S.stats.wallDamage };
    S.mines = S.mods.mines ? [100, 133, 267, 300].map(function (x) { return { x: x, armed: true }; }) : [];
    var c = waveCfg(n);
    // pace: the gaps between rushes, cargo planes, road tanks and the sky's arrivals shrink with the plane interval,
    // so late waves arrive together and build to a peak instead of trickling in after the planes are done.
    S.spawn = { cfg: c, planes: c.planes, bombers: c.bombers, boss: c.boss, bossT: ZEP.ARRIVE, timer: 1.8, rushes: c.rushes, rushT: 8, cargo: c.cargo, cargoT: 6, road: c.road, roadT: ROAD.FIRST,
      pace: wavePace(c), escort: substream(RW), escortT: ZEP.ESCORT_EVERY };
    SKY.start(S.spawn, c);
    S.waveState = 'active';
    var teaser = c.bossKind === 'dread' && n === DREAD.WAVE && !S.won;
    var sub = teaser ? 'their flagship is coming...' : c.bossKind === 'dread' ? 'the Dreadnought! knock out its guns' : c.twin ? 'two zeppelins at once!' : c.boss && n >= ZEP.ARMOR_WAVE ? 'armored zeppelin! strip its plates' :
      c.boss ? 'zeppelin! aim for the gondola' : c.night ? 'night raid! follow your searchlight' :
      n === 1 ? 'here they come' : n === 2 ? 'carpet bombers incoming' : n === 3 ? 'snipers! protect your crew' : n === SKY.BALLOON.WAVE ? 'bomb balloons! pop them early' :
      n === SKY.MEDEVAC.WAVE ? "don't shoot the Red Cross plane!" : n === SKY.HELI.WAVE ? 'choppers! shoot them off the ropes' : n === SKY.CRATE.WAVE ? 'supplies from HQ!' :
      n === TANK.ROAD_WAVE ? 'tanks rolling in by road!' : n === SKY.DIVE.WAVE ? 'dive bombers! watch the crosshair' : n === SKY.HEAVY.WAVE ? 'heavy bombers! they take a beating' :
      n === ARMOR.HEAVY ? 'heavy armor! two hits' : n === DREAD.WAVE - 1 && !S.won ? 'the big push!' : '';
    // With the first tanks, HQ puts a bomber on the radio, so everyone learns the button when it matters. The banner
    // says so, rather than a label of its own.
    if (n === TANK.WAVE) sub = grantCall('bomber', 200, 340, true) ? 'tanks! +1 air strike from HQ' : 'tanks! radio full: +' + RADIO.FULL_TAGS + ' tags';
    // The Dreadnought needs no horn: it shows through the page first.
    if (c.bossKind === 'dread') { S.spawn.bossT = DREAD.ARRIVE; S.spawn.bossWarned = true; S.spawn.teaser = teaser; }
    S.banner = { s: n === DREAD.WAVE && !S.won ? 'final wave' : 'wave ' + n, sub: sub, t: 0, dur: WAVE_BANNER };
    sound.play('bugle');
    emit('wave_start', { wave: n, boss: !!c.boss });
  }
  function updateWave(dt) {
    if (S.waveState === 'pizza') {
      // The wave starts as the courier rides off.
      if (!S.delivery || S.delivery.phase === 'leave') { var next = S.nextWave; S.nextWave = null; openWave(next); }
      return;
    }
    if (S.waveState === 'flag') { raiseFlag(dt); return; }
    var sp = S.spawn;
    if (!sp) return;
    if (S.waveState === 'active') {
      // No dead air: with the planes done and nothing left on the field, what's still due comes in soon.
      if (sp.planes + sp.bombers === 0 && !S.planes.length && !S.bombs.length && !S.enemyShots.length && !S.tanks.length && !S.troopers.some(function (t) { return !t.dead; })) {
        sp.rushT = Math.min(sp.rushT, WAVE_HURRY); sp.cargoT = Math.min(sp.cargoT, WAVE_HURRY); sp.roadT = Math.min(sp.roadT, WAVE_HURRY); sp.bossT = Math.min(sp.bossT, ZEP.WARN + WAVE_HURRY);
        SKY.hurry(sp, WAVE_HURRY);
      }
      sp.timer -= dt;
      if (sp.timer <= 0 && sp.planes + sp.bombers > 0) {
        var kind = 'plane';
        if (sp.bombers > 0 && (sp.planes === 0 || (sp.cfg.planes - sp.planes >= 2 && RW() < 0.35))) kind = 'bomber';
        if (kind === 'bomber') sp.bombers--; else sp.planes--;
        spawnPlane(kind);
        sp.timer = sp.cfg.interval * between(RW, 0.7, 1.3);
      }
      // The decoy in sight: the squad thinks this is it.
      if (sp.decoy && !sp.decoySeen && sp.decoy.state === 'fly' && sp.decoy.x > 30 && sp.decoy.x < W - 30) {
        // It gets the full announcement, just like the real thing.
        sp.decoySeen = true;
        S.banner = { s: 'dreadnought!', sub: 'the enemy flagship', t: 0, dur: 3 };
        sound.play('horn'); sound.play('sting'); S.shake = Math.max(S.shake, 0.3);
      }
      // The decoy down: a soldier wonders "that's it?", a few seconds of quiet, then the Dreadnought, once its sign has
      // fluttered all the way down (and lain there SIGN_BEAT seconds). As the sign nears the ground, another soldier
      // calls it: "that was lame".
      if (sp.decoy && !sp.decoyDone && sp.decoy.state !== 'fly') {
        sp.decoyDone = true; sp.bossT = DREAD.TEASE_GAP;
        var asker = S.recruits.filter(standing)[0];
        if (asker) world.say("that's it?", asker.id, false, 1.2); else addText("that's it?", 200, 420, BLUE, 26, 'story');
        emit('dread_tease', {});
      }
      if (sp.decoyDone && !sp.lameSaid && S.parts.some(function (q) { return q.k === 'sticker' && q.y > GROUND - 110; })) {
        sp.lameSaid = true; var crew = S.recruits.filter(standing), critic = crew[1] || crew[0];
        if (critic) world.say('that was lame', critic.id); else addText('that was lame', 200, 420, BLUE, 24, 'story');
      }
      if (sp.boss > 0) {
        sp.bossT -= dt;
        // The horn and a red callout warn that the zeppelin is coming.
        if (!sp.bossWarned && sp.bossT <= ZEP.WARN) { sp.bossWarned = true; sound.play('horn'); addText(sp.cfg.twin ? 'two zeppelins incoming!' : 'zeppelin incoming!', 200, ZEP.Y, RED); emit('zeppelin_warning', { wave: S.wave }); }
        if (sp.bossT <= 0) {
          // The final wave's teaser: an ordinary zeppelin first, to thin music; the real thing waits until it's down.
          if (sp.cfg.bossKind === 'dread' && sp.teaser && !sp.decoy) teaseIn(sp, dt);
          else if (sp.cfg.bossKind === 'dread') { if (!S.parts.some(function (q) { return q.k === 'sticker' && !(q.landedT >= DREAD.SIGN_BEAT); })) { sp.boss--; spawnDread(); } }
          // The twins come in together, one from each side, one above the other.
          else if (sp.cfg.twin) { sp.boss = 0; spawnZeppelin({ dir: 1, twin: 0 }); spawnZeppelin({ dir: -1, twin: 1 }); }
          else { sp.boss--; spawnZeppelin(); }
        }
      }
      // While a zeppelin is up, its escort keeps coming (from its own stream), so it's never alone on the page.
      if (sp.planes + sp.bombers === 0 && S.planes.some(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; })) {
        sp.escortT -= dt;
        if (sp.escortT <= 0) { spawnPlane('plane', sp.escort); sp.escortT = ZEP.ESCORT_EVERY * between(sp.escort, 0.8, 1.2); }
      }
      if (sp.rushes > 0) { sp.rushT -= dt; if (sp.rushT <= 0) { sp.rushes--; spawnRush(); sp.rushT = between(RW, 9, 14) * sp.pace; } }
      if (sp.cargo > 0) { sp.cargoT -= dt; if (sp.cargoT <= 0) { sp.cargo--; spawnCargo(); sp.cargoT = between(RW, 10, 15) * sp.pace; } }
      if (sp.road > 0) { sp.roadT -= dt; if (sp.roadT <= 0) { sp.road--; spawnRoadTank(); sp.roadT = between(RW, ROAD.GAP[0], ROAD.GAP[1]) * sp.pace; } }
      SKY.tick(sp, dt);
      var enemies = S.troopers.some(function (t) { return !t.dead; }) || S.tanks.length > 0;
      if (sp.planes + sp.bombers + (sp.boss || 0) + sp.rushes + sp.cargo + (sp.road || 0) + SKY.pending(sp) === 0 && !S.planes.length && !S.bombs.length && !S.enemyShots.length && !enemies) SKY.settle(sp);
      if (sp.planes + sp.bombers + (sp.boss || 0) + sp.rushes + sp.cargo + (sp.road || 0) + SKY.pending(sp) === 0 && !S.planes.length && !S.bombs.length && !S.enemyShots.length && !enemies && !SKY.waiting()) {
        S.waveState = 'clear'; S.waveTimer = 2.0;
        var bonus = 100 * S.wave, waveTags = 8 + S.wave * 2;
        // A wave that never touched the wall pays extra: half the wave bonus again, and a tag a wave.
        var untouched = S.stats.wallDamage - S.waveStart.wall < 0.5, extra = untouched ? 50 * S.wave : 0;
        if (untouched) waveTags += S.wave;
        S.score += bonus + extra; S.coins += waveTags; flyTags(200, 330, waveTags);
        emit('wave_clear', { wave: S.wave, untouched: untouched }); emit('coins', { amount: waveTags, reason: 'wave' });
        S.news = []; serveWave(S.news); careAtWaveEnd(S.news);
        S.banner = victoryDue() ? { s: 'victory!', sub: 'the page is yours!', t: 0, dur: 2.8 } : { s: 'wave cleared!', sub: '+' + bonus + ' bonus' + (untouched ? ' · untouched! +' + extra : ''), t: 0, dur: 1.9 };
        if (victoryDue()) S.waveTimer = 3.2;
        S.hint = false;
        // The final wave's own fanfare plays with the victory card, so its banner gets only the cheer.
        if (!victoryDue()) sound.play('wave');
        SQUAD.cheer(victoryDue() ? 'hooray!' : 'yeah!');
      }
    } else if (S.waveState === 'clear') {
      S.waveTimer -= dt;
      if (S.waveTimer <= 0) { if (victoryDue()) { showWin(); reportWin(); } else openShop(); }
    }
  }

  // The mats: the first on its side for the run (S.matRight, from the run seed), the second across from it, and the
  // hospital tent on the second mat's side, as before; widened by Bigger bounce.
  function resizeMats() {
    var near = [22 - S.mods.mat * 6, 92 + S.mods.mat * 6], far = [308 - S.mods.mat * 6, 378 + S.mods.mat * 6];
    if (S.matRight) { var swap = near; near = far; far = swap; }
    TRAMPS[0].x1 = near[0]; TRAMPS[0].x2 = near[1]; TRAMPS[1].x1 = far[0]; TRAMPS[1].x2 = far[1];
    SQUAD.TENT.x = S.matRight ? W - 318 : 318;
  }
  // Pencil icons for supplies live in icons.js; they draw with this file's pen.
  var ICONS = StickArmyIcons({ L: L, SP: SP, Ci: Ci, ink: ink, stick: stick, dogTag: dogTag, hat: hat, medicHelmet: medicHelmet, tube: tube,
    INK: INK, INK2: INK2, RED: RED, BLUE: BLUE, HAT: HAT, PAPER: PAPER });
  // Units beyond troopers and planes live in units.js; this is everything they may use.
  var world = { W: W, H: H, GROUND: GROUND, BK: BK, TUR: TUR, BALANCE: BALANCE,
    INK: INK, INK2: INK2, RED: RED, BLUE: BLUE, HAT: HAT, PAPER: PAPER, RED_FILL: RED_FILL, INK_FILL: INK_FILL,
    L: L, SP: SP, Ci: Ci, ink: ink, pen: pen, jt: jt, stick: stick, tube: tube, clamp: clamp, between: between, rr: rr, substream: substream,
    makePlane: makePlane, spawnTrooper: spawnTrooper, rollTrooper: rollTrooper, award: award, explode: explode, emit: emit, hurtRecruit: hurtRecruit, inView: inView,
    puff: function (x, y, r, life) { puff(x, y, r, life); }, burst: function (x, y, n, c, sp) { burst(x, y, n, c, sp); }, pow: function (x, y, r) { pow(x, y, r); },
    killFx: function (t, f, sq, c) { killFx(t, f, sq, c); }, addText: function (t, x, y, c, sz, kind, merge) { addText(t, x, y, c, sz, kind, merge); },
    addDecal: function (d) { addDecal(d); }, flyTags: function (x, y, n) { flyTags(x, y, n); }, id: function () { return nextId++; },
    crewMax: function (r) { return crewMax(r); }, credit: function () { credit(); }, sketchReveal: function (p, box, dir, fn) { sketchReveal(p, box, dir, fn); },
    // Little voices: a speech bubble over the speaker (a recruit by id, or at x, y) and the line in his voice.
    say: function (text, id, enemy, delay, x, y, mood) { speak(text, id, enemy, delay, x, y, mood); } };
  Object.defineProperties(world, { S: { get: function () { return S; } }, G: { get: function () { return G; } },
    boil: { get: function () { return boil; } }, RW: { get: function () { return RW; } }, RC: { get: function () { return RC; } }, sound: { get: function () { return sound; } },
    BOMBER_PTS: { get: function () { return BOMBER_PTS; } }, seed: { get: function () { return RUN.seed; } } });
  var UNITS = StickArmyUnits(world), ZEP = UNITS.ZEP, zeppelinHP = UNITS.zeppelinHP, spawnZeppelin = UNITS.spawnZeppelin,
    zeppelinOnScreen = UNITS.zeppelinOnScreen, planeHit = UNITS.planeHit, updateZeppelin = UNITS.updateZeppelin,
    hurtZeppelin = UNITS.hurtZeppelin, inGondola = UNITS.inGondola, zeppelinDown = UNITS.zeppelinDown, drawZeppelin = UNITS.drawZeppelin, drawBossBar = UNITS.drawBossBar, drawSticker = UNITS.drawSticker, drawPlate = UNITS.drawPlate,
    RUSH = UNITS.RUSH, spawnRush = UNITS.spawnRush, TANK = UNITS.TANK, tankHP = UNITS.tankHP, spawnCargo = UNITS.spawnCargo, updateCargo = UNITS.updateCargo, spawnRoadTank = UNITS.spawnRoadTank,
    tankHit = UNITS.tankHit, damageTank = UNITS.damageTank, updateTanks = UNITS.updateTanks, blastTanks = UNITS.blastTanks, drawTank = UNITS.drawTank,
    RADIO = UNITS.RADIO, callsHeld = UNITS.callsHeld, grantCall = UNITS.grantCall,
    // A co-op guest's calls go to the host, which makes them (coop.js).
    STRIKE = UNITS.STRIKE, callStrike = function () { return COOP && COOP.guest ? COOP.ask('call', 'bomber') : UNITS.callStrike(); }, updateStrike = UNITS.updateStrike, drawStrike = UNITS.drawStrike,
    FIGHTER = UNITS.FIGHTER, callFighter = function () { return COOP && COOP.guest ? COOP.ask('call', 'fighter') : UNITS.callFighter(); }, updateFighter = UNITS.updateFighter, drawFighter = UNITS.drawFighter,
    updateRadio = UNITS.updateRadio, drawRadio = UNITS.drawRadio;
  // Balloons, the Red Cross plane, HQ crates, dive bombers and helicopters live in sky.js.
  world.grantCall = grantCall; world.activeTramps = activeTramps; world.loseTags = function (n, x, y) { loseTags(n, x, y); }; world.standing = standing; world.repairWall = repairWall;
  world.dogTag = function (x, y, rot, sc) { dogTag(x, y, rot, sc); };
  Object.defineProperties(world, { CAPTURE_SPEED: { get: function () { return CAPTURE_SPEED; } }, PLANE_PTS: { get: function () { return PLANE_PTS; } } });
  var SKY = StickArmySky(world);
  world.SKY = SKY;
  // Names, ranks, the wounded and the field hospital live in squad.js.
  var SQUAD = StickArmySquad(world), RANK = SQUAD.RANK, RANKS = SQUAD.RANKS, rankName = SQUAD.rankName, serveWave = SQUAD.serveWave,
    knockDown = SQUAD.knockDown, standUp = SQUAD.standUp, fallen = SQUAD.fallen, careAtWaveEnd = SQUAD.careAtWaveEnd, bedSlot = SQUAD.bedSlot,
    chevrons = SQUAD.chevrons, drawTent = SQUAD.drawTent;
  // The item list, the shop, the kit display and the pizza courier live in shop.js.
  Object.defineProperty(world, 'RS', { get: function () { return RS; } });
  world.resizeMats = resizeMats; world.freeSlot = freeSlot; world.makeRecruit = makeRecruit;
  world.clearInput = function () { clearInput(); }; world.washDecals = washDecals; world.startWave = startWave; world.openWave = openWave; world.queueSketches = queueSketches;
  world.drawItemIcon = drawItemIcon; world.waveCfg = waveCfg; world.standUp = standUp; world.drawSquadRow = drawSquadRow; world.squadLine = squadLine;
  world.callsHeld = callsHeld; world.RADIO = RADIO; world.TANK = TANK; world.FIGHTER = FIGHTER;
  // Co-op's shop (shop.js): turret upgrades are each barrel's own; a guest's taps go to the host (coop.js).
  world.TURRET_MODS = TURRET_MODS;
  world.coopRemote = function (action, id) { if (!(COOP && COOP.guest)) return false; COOP.ask('shop', { a: action, id: id }); return true; };
  var SHOP = StickArmyShop(world), ITEMS = SHOP.ITEMS, price = SHOP.price, eligible = SHOP.eligible, OFFERS = SHOP.OFFERS, offer = SHOP.offer,
    onHouse = SHOP.onHouse, costNow = SHOP.costNow, openShop = SHOP.openShop, takeItem = SHOP.takeItem, renderShop = SHOP.renderShop,
    continueWave = SHOP.continueWave, kitItems = SHOP.kitItems, renderKit = SHOP.renderKit, updateDelivery = SHOP.updateDelivery, drawCourier = SHOP.drawCourier;
  // The Dreadnought, the victory card and endless live in campaign.js.
  world.HAND = HAND; world.DISPLAY = DISPLAY; world.TENT = SQUAD.TENT; world.SQUAD = SQUAD; world.load = load; world.save = save; world.clock = clock;
  world.recruitDie = function (r, cause) { recruitDie(r, cause); }; world.hurtWall = hurtWall; world.wallText = function (n) { wallText(n); };
  world.openShop = function () { openShop(); }; world.hidePause = function () { pauseBtn.hidden = true; };
  // Records are solo's: a co-op run (S.players) never writes them.
  world.saveBest = function () { if (S.players || S.score <= best) return false; best = S.score; save(lv().KEYS.best, best); return true; };
  world.saveBestWave = function (n) { if (!S.players && n > load(lv().KEYS.wave, 0)) save(lv().KEYS.wave, n); };
  world.lv = lv; world.LEVELS = LEVELS;
  Object.defineProperty(world, 'SENTRY', { get: function () { return SENTRY; } });
  var CAMPAIGN = StickArmyCampaign(world), DREAD = CAMPAIGN.DREAD, isDreadWave = CAMPAIGN.isDreadWave, spawnDread = CAMPAIGN.spawnDread,
    dreadHit = CAMPAIGN.dreadHit, hurtDread = CAMPAIGN.hurtDread, updateDread = CAMPAIGN.updateDread, drawDread = CAMPAIGN.drawDread,
    drawDreadBar = CAMPAIGN.drawDreadBar, dreadTargets = CAMPAIGN.dreadTargets, victoryDue = CAMPAIGN.victoryDue, showWin = CAMPAIGN.showWin,
    keepGoing = CAMPAIGN.keepGoing, rollCall = CAMPAIGN.rollCall, recordLine = CAMPAIGN.recordLine;
  world.BOARD = BOARD;
  var LBOARD = world.board = StickArmyBoard(world);
  world.dreadTargets = dreadTargets; world.DREAD_DECOY_HP = DREAD.DECOY_HP; world.dreadBeams = CAMPAIGN.dreadBeams; world.dreadPhase = CAMPAIGN.dreadPhase;
  // Co-op (coop.js, an add-on: without it, COOP is null and every hook below does nothing).
  world.TRAMPS = TRAMPS; world.keys = keys; world.AIM_MIN = AIM_MIN; world.AIM_MAX = AIM_MAX; world.RUN = RUN;
  world.setState = function (o) { S = o; }; world.resizeMats = function () { resizeMats(); }; world.clearInk = function () { clearInk(); };
  world.updateParts = function (dt) { updateParts(dt); }; world.fadeInk = function (dt) { fadeInk(dt); }; world.decals = function () { return decals; };
  Object.defineProperty(world, 'me', { get: function () { return me; }, set: function (v) { me = v; } });
  world.fit = function () { fit(); }; world.fillPause = function () { fillPause(); }; world.togglePause = function () { togglePause(); };
  world.newGame = function () { newGame(); }; world.ITEMS = ITEMS; world.renderShop = function () { SHOP.renderShop(); }; world.continueWave = function () { continueWave(); };
  world.takeItem = function (id, by) { return SHOP.takeItem(id, by); }; world.putBack = function (id, by) { return SHOP.putBack(id, by); }; world.undo = function (by) { return SHOP.undo(by); }; world.callStrike = function () { return UNITS.callStrike(); }; world.callFighter = function () { return UNITS.callFighter(); };
  world.screens = function () { return { title: titleScreen, pause: pauseScreen, over: overScreen, win: winScreen, shop: shopScreen, pauseBtn: pauseBtn }; };
  var COOP = window.StickArmyCoop ? StickArmyCoop(world) : null;
  world.dreadLit = function () { var p = CAMPAIGN.dread(); return !p ? [] : p.phase === 'hangar' ? [CAMPAIGN.hangarAt(p)] : p.phase === 'bridge' ? [CAMPAIGN.bridgeAt(p), CAMPAIGN.hangarAt(p)] : []; };
  function drawItemIcon(canvas, id) {
    var g = canvas.getContext('2d'), previous = G, keepBoil = boil, k = canvas.width / 44;
    G = g; boil = 0;
    g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 44, 44);
    pen(id.length * 131 + id.charCodeAt(0));
    try { (ICONS[id] || ICONS.fallback)(g); } finally { G = previous; boil = keepBoil; }
  }
  // ---------- drawn in ----------
  // You're the commander drawing your army: once the wave banner has been read, whatever you just bought is sketched
  // onto the page in blue ballpoint, one at a time. Purely a reveal: everything works from the first frame.
  var SKETCH = { DELAY: 0.9, DUR: 0.45, GAP: 0.45, DRAWN: ['auto', 'hospital', 'trench', 'sandbags', 'wire', 'tramp'] };
  function queueSketches(bought) {
    var keys = SKETCH.DRAWN.filter(function (id) { return bought[id]; });
    S.recruits.forEach(function (r) { if (r.fresh) { r.fresh = false; keys.push('r' + r.id); } });
    S.sketches = keys.map(function (key, i) { return { key: key, t: -SKETCH.DELAY - i * SKETCH.GAP }; });
  }
  function updateSketches(dt) {
    if (!S.sketches.length || S.waveState === 'pizza' || S.waveState === 'flag') return;
    S.sketches.forEach(function (k) { var was = k.t; k.t += dt; if (was < 0 && k.t >= 0) sound.play('scribble'); });
    S.sketches = S.sketches.filter(function (k) { return k.t < SKETCH.DUR; });
  }
  function sketchProgress(key) {
    var k = S.sketches.find(function (q) { return q.key === key; });
    return k ? clamp(k.t / SKETCH.DUR, 0, 1) : 1;
  }
  // Draws fn inside box [x0, y0, x1, y1], revealed bottom-up ('up') or left to right ('right'), with the pen at the
  // edge of what's drawn so far.
  function sketched(key, box, dir, fn) { sketchReveal(sketchProgress(key), box, dir, fn); }
  function sketchReveal(p, box, dir, fn) {
    if (p >= 1) { fn(); return; }
    if (p <= 0) return;
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3], px, py, wob = Math.sin(S.t * 38) * 0.5 + 0.5;
    G.save(); G.beginPath();
    if (dir === 'up') { var top = y1 - (y1 - y0) * p; G.rect(x0 - 6, top, x1 - x0 + 12, y1 - top + 6); px = x0 + (x1 - x0) * wob; py = top; }
    else { var edge = x0 + (x1 - x0) * p; G.rect(x0 - 6, y0 - 6, edge - x0 + 6, y1 - y0 + 12); px = edge; py = y0 + (y1 - y0) * wob; }
    G.clip(); fn(); G.restore();
    drawPen(px, py);
  }
  // A blue ballpoint, the same ink as your army: steel tip, blue grip, clear barrel showing the ink tube, cap and clip.
  function drawPen(x, y) {
    G.save(); G.translate(x, y); G.rotate(-0.7);
    G.beginPath(); G.moveTo(0, 0); G.lineTo(4, -1.4); G.lineTo(4, 1.4); G.closePath(); G.fillStyle = '#b9bcc4'; G.fill();
    G.beginPath(); G.moveTo(4, -1.4); G.lineTo(9, -2.6); G.lineTo(9, 2.6); G.lineTo(4, 1.4); G.closePath(); G.fillStyle = BLUE; G.fill();
    G.fillStyle = PAPER; G.fillRect(9, -2.6, 16, 5.2);
    G.beginPath(); G.moveTo(9, 0); G.lineTo(25, 0); ink(BLUE, 1.3); G.stroke();
    G.fillStyle = BLUE; G.fillRect(25, -2.6, 4, 5.2);
    G.beginPath(); G.moveTo(0, 0); G.lineTo(4, -1.4); G.lineTo(9, -2.6); G.lineTo(29, -2.6); G.lineTo(29, 2.6); G.lineTo(9, 2.6); G.lineTo(4, 1.4); G.closePath(); ink(INK, 1.1); G.stroke();
    G.beginPath(); G.moveTo(27, -2.6); G.lineTo(27, -4); G.lineTo(17, -4); ink(BLUE, 1.4); G.stroke();
    G.beginPath(); G.arc(0.6, 0, 0.9, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
    G.restore();
  }
  // ---------- combat ----------
  function shoot(t) {
    t = t || S.turrets[0];
    var c = Math.cos(t.aim), s = Math.sin(t.aim), x0 = t.x, m = gm(t);
    t.volleys++;
    var angles = m.spread ? [-0.13, 0, 0.13] : [0];
    angles.forEach(function (offset) {
      var a = t.aim + offset, ca = Math.cos(a), sa = Math.sin(a);
      (m.double ? [-4, 4] : [0]).forEach(function (side) {
        S.bullets.push({ x: x0 + ca * 30 - sa * side, y: TUR.y + sa * 30 + ca * side, vx: ca * 700, vy: sa * 700,
          owner: 'player', gun: t.gun, kind: 'bullet', flak: m.flak, pierce: m.pierce ? 3 : 1, hits: [], life: 1.3, dead: false, side: offset !== 0 });
      });
    });
    if (m.rockets && t.volleys % 4 === 0) {
      S.bullets.push({ x: x0 + c * 32, y: TUR.y + s * 32, vx: c * 360, vy: s * 360, owner: 'player', gun: t.gun, kind: 'rocket', life: 2, dead: false }); sound.play('rocket');
      S.stats.shots++;
    }
    // Rounds fired (round 14, "shots fired would be a fun stat"): every bullet and rocket from your turret, so the
    // double barrel and spread shot make it climb.
    S.stats.shots += angles.length * (m.double ? 2 : 1);
    S.parts.push({ k: 'star', x: x0 + c * 34, y: TUR.y + s * 34, a: t.aim, life: 0.07, max: 0.07, id: nextId++ });
    t.recoil = 1;
    sound.play('shoot');
  }
  // One trigger pull: costs points, adds heat, and locks the gun when it boils over. Heat per shot never changes with
  // the wave, so cooling fins always pay off.
  function fireVolley(t) {
    t = t || S.turrets[0];
    shoot(t);
    var m = gm(t), rate = Math.pow(0.82, m.fire);
    t.fireCD = BALANCE.FIRE_COOLDOWN * rate;
    t.heat += BALANCE.HEAT_PER_SHOT * rate * Math.pow(0.8, m.cool);
    S.score = Math.max(0, S.score - BALANCE.SHOT_COST);
    if (S.players) S.players[t.gun].score = Math.max(0, S.players[t.gun].score - BALANCE.SHOT_COST);
    if (t.heat >= 1) triggerOverheat(t);
  }
  function triggerOverheat(t) {
    t = t || S.turrets[0];
    if (t.overheat > 0) return;
    t.heat = 1; t.overheat = BALANCE.OVERHEAT_LOCK;
    addText('too hot!', t.x, TUR.y - 52, RED, 23);
    sound.play('overheat'); SQUAD.heat();
  }
  function updateHeat(dt, t) {
    t = t || S.turrets[0];
    if (t.overheat > 0) {
      // While locked, the barrel cools to a usable level by the time it unlocks.
      t.overheat -= dt;
      t.heat = Math.max(0.35, t.heat - 0.65 / Math.max(0.1, BALANCE.OVERHEAT_LOCK) * dt);
      if (R() < dt * 9) { var c = Math.cos(t.aim), s = Math.sin(t.aim); puff(t.x + c * 30, TUR.y + s * 30, 2, 0.6); }
      if (t.overheat <= 0) { t.overheat = 0; sound.play('ready'); }
    } else {
      t.heat = Math.max(0, t.heat - BALANCE.COOL_RATE * dt);
    }
  }
  function killFx(t, force, squash, color) {
    var power = force || 170, y = squash ? GROUND - 5 : t.y + 12, c = color || RED, i, crowded = busy();
    burst(t.x, y, 10, c, power);
    // Permanent ink only near the ground. Midair hits leave a spatter that fades in about a second.
    if (y > GROUND - 40) addDecal({ kind: 'splat', x: t.x, y: y, r: squash ? 9 : 4, color: c, a: 0.36, seed: nextId++ });
    else for (i = 0; i < (crowded ? 3 : 6); i++) S.parts.push({ k: 'spatter', x: t.x + rr(-6, 6), y: y + rr(-6, 6), vx: rr(-30, 30), vy: rr(-20, 30), r: rr(1.2, 3), life: rr(0.6, 1.1), max: 1.1, c: c, id: nextId++ });
    // Separate pen strokes: head, torso, two arms, two legs. On a busy page, one arm and one leg.
    (crowded ? [0, 1, 2, 4] : [0, 1, 2, 3, 4, 5]).forEach(function (part) {
      S.parts.push({ k: 'body', head: part === 0, len: part === 1 ? 16 : 12,
        x: t.x + rr(-4, 4), y: squash ? GROUND - 6 : t.y + (part === 0 ? 0 : part < 4 ? 12 : 26),
        vx: rr(-power, power), vy: -rr(50, power * 1.5), rot: rr(-3, 3), vr: rr(-10, 10),
        life: 8, max: 8, rest: 0, c: c, id: nextId++ });
    });
  }
  function drawBodyPart(q) {
    pen(q.id || q.seed); G.save(); G.translate(q.x, q.y); G.rotate(q.rot);
    G.beginPath(); if (q.head) Ci(0, 0, 4.5); else L(-q.len / 2, 0, q.len / 2, 0, 0.35);
    ink(q.c || RED, 2.3); G.stroke(); G.restore();
  }
  // Paratrooper rule: a trooper falling without a chute squashes any enemy he lands on.
  function crush(t) {
    var squashed = 0;
    S.troopers.forEach(function (g) {
      if (g === t || g.dead || g.state !== 'ground' || Math.abs(g.x - t.x) > 13) return;
      g.dead = true; squashed++; S.stats.kills++;
      emit('kill', { by: 'squash', type: g.type });
      killFx(g, 230, true);
      award(30, g.x, GROUND - 74, 'squashed!', INK, true);
    });
    if (squashed) { sound.play('squash'); S.shake = Math.max(S.shake, 0.2); }
    return squashed;
  }
  var OUCH = ['ow!', 'oof!', 'argh!', 'yikes!', 'eep!'];
  function killTrooper(t, owner) {
    t.dead = true; killFx(t); S.stats.kills++; credit();
    emit('kill', { by: owner === 'ally' ? 'crew' : 'player', type: t.type, state: t.state });
    if (t.state === 'ground') addDecal({ kind: 'splat', x: t.x, y: GROUND - 1, r: 8, color: RED, a: 0.34, seed: t.id });
    award(10, t.x, t.y - 6, OUCH[t.id % OUCH.length], owner === 'ally' ? BLUE : INK, true);
    sound.play('hit');
    if (t.captain) CAMPAIGN.captainDown(t);
  }
  function armorHit(t, owner) {
    t.armor--; t.pingT = S.t;
    burst(t.x, t.y + 12, 4, '#8a8f96', 120);
    addText(t.armor ? 'clang!' : 'vest off!', t.x + 14, t.y - 4, INK2, 16, 'minor');
    emit('armor_hit', { by: owner === 'ally' ? 'crew' : 'player', left: t.armor });
    sound.play('clank');
  }
  function popChute(t) {
    t.state = 'free'; t.vy = Math.max(30, t.fall * 0.5); t.spin = rr(-2.5, 2.5);
    for (var i = 0; i < 4; i++) S.parts.push({ k: 'shred', x: t.x + rr(-16, 16), y: t.y - 30 + rr(-6, 6), vx: rr(-50, 50), vy: rr(-40, 10), rot: rr(0, 6), vr: rr(-6, 6), life: rr(0.7, 1.1), max: 1.1, id: nextId++ });
    addText('pop!', t.x + 16, t.y - 34, RED, 18, 'minor');
    S.stats.popped++;
    // Co-op: a catch is the popper's.
    if (S.players && gunner != null) t.poppedBy = gunner;
    emit('chute_pop', { x: t.x, y: t.y, overMat: activeTramps().some(function (m) { return t.x >= m.x1 + 4 && t.x <= m.x2 - 4; }) });
    sound.play('pop');
  }
  function splat(t, ripped) {
    t.dead = true; S.stats.kills++;
    emit(ripped ? 'rip' : 'splat', { x: t.x, type: t.type });
    addDecal({ kind: 'splat', x: t.x, y: GROUND - 1, r: 12, color: RED, a: 0.4, seed: t.id });
    killFx(t, 210, true);
    award(15, t.x, GROUND - 44, 'splat!', RED, true);
    sound.play('splat');
    if (t.captain) CAMPAIGN.captainDown(t);
  }
  function freeSlot(side) {
    var order = side === 0 ? [0, 1, 2, 3, 4, 5, 6, 7] : [4, 5, 6, 7, 0, 1, 2, 3];
    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      if (unlockedSlots().indexOf(s) < 0 || S.slotRes[s]) continue;
      if (S.recruits.some(function (r) { return !r.dead && r.slot === s; }) || bedSlot() === s) continue;
      return s;
    }
    return -1;
  }
  function slotsAvailable() { return freeSlot(0) >= 0; }
  function bounce(t, tr) {
    tr.v += 180;
    addText('boing!', t.x, tr.y - 20, INK, 21);
    sound.play('boing');
    // The Dreadnought's captain is a prisoner, not a recruit: he bounces onto the bunker (campaign.js captainCaught).
    var slot = t.captain ? -1 : freeSlot(tr.x1 < 200 ? 0 : 1);
    t.state = 'bounce'; t.bt = 0; t.bdur = 0.85; t.x0 = t.x; t.y0 = tr.y - 33; t.slot = slot;
    if (slot >= 0) { S.slotRes[slot] = true; t.x1 = SLOTS[slot]; t.y1 = GROUND - 33; t.bh = 120; }
    else { t.x1 = BK.x; t.y1 = BK.top - 30; t.bh = 140; }
    t.spinDir = t.x1 > t.x0 ? 1 : -1;
  }
  function becomeRecruit(t) {
    var was = gunner;
    if (S.players) gunner = t.poppedBy != null ? t.poppedBy : null;
    try { joinSquad(t); } finally { gunner = was; }
  }
  function joinSquad(t) {
    t.dead = true;
    if (t.captain) { CAMPAIGN.captainCaught(t); return; }
    if (t.slot >= 0) {
      delete S.slotRes[t.slot];
      var r = makeRecruit(t.slot, t.type, t.id);
      S.recruits.push(r);
      S.parts.push({ k: 'ring', x: r.x, y: GROUND - 18, life: 0.5, max: 0.5, id: nextId++ });
      burst(r.x, GROUND - 20, 8, BLUE, 140);
      S.stats.captured++;
      emit('capture', { type: t.type, slot: t.slot });
      var label = t.type === 'engineer' ? 'engineer joined!' : t.type === 'bazooka' ? 'bazooka joined!' : 'recruit!';
      award(25, r.x, GROUND - 64, label, BLUE, true);
      sound.play('recruit'); world.say('ready!', r.id, false, 0.15);
      if (S.recruits.filter(function (q) { return !q.dead; }).length === S.mods.slots) addText('squad full!', 200, 520, BLUE, 24);
      S.hint = false;
    } else {
      emit('capture', { type: t.type, full: true });
      award(60, BK.x, BK.top - 44, 'squad full!', BLUE, true);
      sound.play('recruit');
    }
  }
  function land(t) {
    t.state = 'ground'; t.y = GROUND - 33; t.dir = t.x < 200 ? 1 : -1; t.walk = 0;
    emit('land', { x: t.x, type: t.type });
    // Snipers sit below the firing arc and are easy to miss, so call them out as they land.
    if (t.type === 'sniper') addText('sniper!', t.x, t.y - 14, RED, 22);
    if (t.open) S.parts.push({ k: 'deflate', x: t.x - t.dir * 14, y: GROUND - 2, life: 1.6, max: 1.6, dir: t.dir, id: nextId++ });
    sound.play('thud');
  }
  function recruitDie(r, cause) {
    if (r.dead) return;
    r.dead = true; fallen(r);
    emit('recruit_lost', { type: r.type, cause: cause || 'unknown', rank: r.rank || 0 });
    addText('noo!', r.x, GROUND - 52, BLUE, 20);
    killFx({ x: r.x, y: GROUND - 33 }, 190, false, BLUE);
    addDecal({ kind: 'splat', x: r.x, y: GROUND - 1, r: 4, color: BLUE, a: 0.22, seed: r.id + 99 });
    sound.play('noo');
  }
  // direct: a bullet hit, not a blast (only direct hits find the zeppelin's weak spot).
  var grazing = 1;  // a grazing shot's share of the damage to the Dreadnought (hitTest)
  function damagePlane(p, dmg, owner, hx, hy, direct) {
    if (p.state !== 'fly') return;
    if (p.kind === 'zeppelin') { hurtZeppelin(p, dmg, owner, hx, hy, direct); return; }
    if (p.kind === 'dread') { hurtDread(p, dmg * grazing, owner, hx == null ? p.x : hx, hy == null ? p.y : hy, direct); return; }
    if (SKY.KINDS[p.kind]) { SKY.hurt(p, dmg, owner); return; }
    p.hp -= dmg; p.hitFlash = 0.15;
    burst(p.x, p.y, 4, INK, 120);
    if (p.hp <= 0) {
      p.state = 'fall'; p.vy = -20; p.rot = 0; p.smoke = 0;
      pow(p.x, p.y, p.kind === 'plane' ? 22 : 30);
      S.stats.planes++; credit();
      emit('plane_down', { kind: p.kind, by: owner === 'ally' ? 'crew' : 'player' });
      // A cargo plane downed before its drop takes its tank with it.
      award(p.kind === 'cargo' ? 150 : p.kind === 'bomber' ? 120 : 50, p.x, p.y + 26, p.kind === 'cargo' ? (p.tankX != null ? 'tank and all!' : 'cargo down!') : p.kind === 'bomber' ? 'bomber down!' : 'kaboom!', owner === 'ally' ? BLUE : INK, true);
      p.tankX = null;
      S.shake = Math.max(S.shake, 0.25);
      sound.play('boom');
      p.drops.forEach(function (x, i) { spawnTrooper(p.x + between(p.rng, -16, 16), p.y + 10, p.kits[i]); });
      p.drops = []; p.kits = [];
    } else {
      addText('clank!', p.x, p.y - 18, INK2, 16, 'minor');
      sound.play('clank');
    }
  }
  // The fighting stays on the page (round 14: the sixth playtest saw "a decent amount of offstage combat"; a fifth of
  // the planes the bots downed still had their middle off the page, mostly to flak bursts and rockets reaching past
  // the edge). Nothing is hit where you can't see it: shots off the page hit nothing (inView), a blast passes by a
  // plane that doesn't show yet (shows), and the crew, the sentry and fighter cover only pick targets with their
  // middle over the page. Holding every plane off until its middle was over the page was tried first and made the
  // game clearly harder for the bots (wave-20 survival 34% to 17% for decent), as each plane got a free half second.
  function inView(o) { return o.x >= 0 && o.x <= W; }
  function shows(p) { return p.x + p.hw > 0 && p.x - p.hw < W; }
  function canHit(p) { return p.state === 'fly' && (p.kind === 'dread' || shows(p)); }
  // source: who to blame for wall damage, when it isn't the kind (a balloon's bomb).
  function explode(x, y, r, kind, owner, source) {
    if (HL.POW_KINDS[kind]) pow(x, y, r * 0.8 * HL.POW_KINDS[kind]);
    for (var i = 0; i < 7; i++) puff(x + rr(-r, r) * 0.4, y + rr(-r, r) * 0.3, rr(3, 7), rr(0.4, 0.7));
    burst(x, y, 10, INK, 220);
    S.shake = Math.max(S.shake, kind === 'bomb' || kind === 'dive' || kind === 'final' || kind === 'broadside' ? 0.55 : kind === 'crash' || kind === 'wreck' ? 0.35 : kind === 'strike' || kind === 'shell' ? 0.25 : 0.15);
    if (y > GROUND - 30) addDecal({ kind: 'scorch', x: x, y: GROUND - 3, r: r * 0.55, color: INK, a: 0.2, seed: nextId++ });
    var col = kind === 'rocket' || kind === 'strike' ? BLUE : INK;
    // Flak is anti-air only: its bursts spare paratroopers, including ones just jumping from the plane it hit.
    S.troopers.forEach(function (t) {
      if (kind !== 'flak' && !t.dead && t.state !== 'bounce' && !(t.captain && owner !== 'player') && Math.hypot(t.x - x, t.y + 14 - y) < r) {
        t.dead = true; killFx(t, kind === 'bomb' || kind === 'crash' ? 320 : 240); S.stats.kills++; if (kind === 'rocket') credit();
        emit('kill', { by: kind === 'crash' ? 'crash' : kind === 'strike' ? 'strike' : 'explosion', source: kind, type: t.type });
        award(10, t.x, t.y - 4, 'boom!', col, true);
      }
    });
    if (kind === 'bomb') {
      if (Math.abs(x - BK.x) < 48) { hurtWall(BOMB_WALL, source || 'bomb'); wallText(BOMB_WALL); }
      // A direct hit still kills a bare recruit; near misses wound. Helmets and trenches help.
      S.recruits.forEach(function (q) { var d = Math.abs(q.x - x); if (!q.dead && d < 34) hurtRecruit(q, 3.2 * (1 - d / 34) + 0.4, 'bomb'); });
    } else if (kind === 'dive') {
      // A heavy bomb: a dive bomber's, or the one a heavy bomber saves for the bunker. A dive bomber's landing on the
      // wall says so, with a bigger blast (round 14).
      var onWall = Math.abs(x - BK.x) < 50;
      if (onWall) { hurtWall(SKY.DIVE.WALL, source || 'dive'); wallText(SKY.DIVE.WALL); }
      if (source === 'dive') { pow(x, y - 6, 48); if (onWall) addText('direct hit!', BK.x, BK.top - 66, RED, 26, 'alert'); }
      S.recruits.forEach(function (q) { var d = Math.abs(q.x - x); if (!q.dead && d < 40) hurtRecruit(q, 4 * (1 - d / 40) + 0.5, 'bomb'); });
    } else if (kind === 'shell') {
      // Tank shells: lighter than bombs, aimed at the bunker.
      if (Math.abs(x - BK.x) < 44) { hurtWall(TANK.SHELL_DAMAGE, 'tank'); wallText(TANK.SHELL_DAMAGE); }
      S.recruits.forEach(function (q) { var d = Math.abs(q.x - x); if (!q.dead && d < 26) hurtRecruit(q, 1.6 * (1 - d / 26) + 0.2, 'tank'); });
    }
    blastTanks(x, y, r, kind, owner);
    if (kind === 'rocket' || kind === 'flak') {
      S.planes.forEach(function (p) { if (canHit(p) && Math.abs(p.x - x) < r + p.hw && Math.abs(p.y - y) < r + p.hh) damagePlane(p, kind === 'rocket' ? 3 : 1, owner || 'ally', x, y); });
      S.bombs.forEach(function (m) { if (!m.dead && !m.armored && inView(m) && Math.hypot(m.x-x,m.y-y) < r + 8) { m.dead=true; emit('bomb_intercepted', { by: owner === 'player' ? 'player' : 'crew' }); award(20,m.x,m.y-12,'bomb popped!',BLUE,true); puff(m.x,m.y,8,0.4); } });
    }
    sound.play(kind === 'rocket' || kind === 'air' ? 'hit' : 'boom');
  }

  function consumeBullet(b, target) {
    b.hits = b.hits || []; b.hits.push(target.id);
    b.pierce = (b.pierce || 1) - 1; b.dead = b.pierce <= 0;
  }
  function projectileBurst(b) {
    if (b.kind !== 'rocket' && !b.flak) return false;
    b.dead = true; explode(b.x, b.y, b.kind === 'rocket' ? 34 : 24, b.kind === 'rocket' ? 'rocket' : 'flak', b.owner); return true;
  }
  function hitTest(b) {
    var i, p, m, t, seen = b.hits || [], near = b.flak ? 14 : 0;
    if (!inView(b) || SKY.shot(b)) return;
    for (i = 0; i < S.planes.length; i++) {
      p = S.planes[i];
      if (seen.indexOf(p.id) >= 0) continue;
      if (canHit(p) && (p.kind === 'dread' ? dreadHit(p, b.x, b.y, near) : SKY.KINDS[p.kind] ? SKY.hit(p, b.x, b.y, near) : planeHit(p, b.x, b.y, near))) {
        // Veteran: spread shot's side bullets only graze the Dreadnought, for GRAZE of the damage (their flak bursts
        // too), so it pays to aim the middle one.
        if (p.kind === 'dread' && b.side && lv().GRAZE < 1) { CAMPAIGN.graze(p, b.x, b.y); grazing = lv().GRAZE; }
        if (!projectileBurst(b)) { damagePlane(p, 1, b.owner, b.x, b.y, true); consumeBullet(b, p); }
        grazing = 1;
        return;
      }
    }
    for (i = 0; i < S.bombs.length; i++) {
      m = S.bombs[i];
      if (seen.indexOf(m.id) >= 0) continue;
      // Tank shells are smaller than bombs and harder to hit. A sortie's armored bomb can't be shot down.
      if (!m.dead && !m.armored && Math.hypot(b.x - m.x, b.y - m.y) < (m.shell ? 6 : m.heavy ? 11 : 9) + near) {
        m.dead = true; emit('bomb_intercepted', { by: b.owner === 'ally' ? 'crew' : 'player' });
        award(20, m.x, m.y - 12, 'bomb popped!', b.owner === 'ally' ? BLUE : INK, true);
        if (!projectileBurst(b)) { consumeBullet(b, m); explode(m.x, m.y, 26, 'air', b.owner); }
        return;
      }
    }
    for (i = 0; i < S.tanks.length; i++) {
      var tk = S.tanks[i];
      if (tk.dead || seen.indexOf(tk.id) >= 0 || !tankHit(tk, b.x, b.y, 0)) continue;
      if (b.kind === 'rocket' && projectileBurst(b)) return;
      // Coming down on its chutes, the tank is crated on its pallet: bullets only ping off.
      if (tk.state === 'chute') { if (R() < 0.3) S.parts.push({ k: 'tink', x: b.x, y: b.y, life: 0.2, max: 0.2, c: INK2, id: nextId++ }); }
      else damageTank(tk, TANK.BULLET, b.owner);
      consumeBullet(b, tk);
      return;
    }
    for (i = 0; i < S.troopers.length; i++) {
      t = S.troopers[i];
      if (t.dead || t.state === 'bounce' || seen.indexOf(t.id) >= 0) continue;
      // Snipers sit at the edges, mostly beyond the barrel's dip; a shot that does reach one counts.
      // Rockets explode on contact; flak only bursts near aircraft and bombs, so a direct hit is a plain bullet.
      if (Math.abs(b.x - t.x) < 7 && b.y > t.y - 7 && b.y < t.y + 34) {
        if (b.kind === 'rocket' && projectileBurst(b)) return;
        if (t.armor > 0) armorHit(t, b.owner); else killTrooper(t, b.owner);
        consumeBullet(b, t);
        return;
      }
      if (t.state === 'chute' && t.open > 0.6) {
        var dx = (b.x - t.x) / 23, dy = (b.y - (t.y - 22)) / 21;
        if (dy < 0.15 && dy > -1 && dx * dx + dy * dy < 1) {
          if (b.kind !== 'rocket' || !projectileBurst(b)) { popChute(t); consumeBullet(b, t); }
          return;
        }
      }
    }
  }

  // ---------- recruit brains ----------
  function pickTarget(r) {
    var ox = r.x, oy = GROUND - 23, best = null, bd = 1e9, tank = null, td = 300;
    S.tanks.forEach(function (tk) { var d = Math.abs(tk.x - ox); if (!tk.dead && tk.state !== 'chute' && inView(tk) && d < td) { td = d; tank = tk; } });
    if (tank && r.type === 'bazooka') return tank;
    S.troopers.forEach(function (t) {
      if (t.dead || t.captain || t.state !== 'ground') return;
      var d = Math.abs(t.x - ox);
      if (d < 240 && d < bd) { bd = d; best = t; }
    });
    if (best) return best;
    if (tank) return tank;
    S.bombs.forEach(function (m) {
      if (m.dead || m.armored || m.y < 250 || !inView(m)) return;
      var d = Math.hypot(m.x - ox, m.y - oy);
      if (d < 320 && d < bd) { bd = d; best = m; }
    });
    if (best) return best;
    var parts = dreadTargets();
    if (r.type === 'bazooka') {
      // Bazookas go for the Dreadnought's guns (the one aiming first), then other aircraft.
      if (parts.length) return parts[0];
      S.planes.forEach(function (p) {
        if (p.state !== 'fly' || p.kind === 'dread' || p.kind === 'balloon' || p.x < 10 || p.x > W - 10) return;
        var d = Math.hypot(p.x - ox, p.y - oy);
        if (d < bd) { bd = d; best = p; }
      });
      if (best) return best;
    }
    S.troopers.forEach(function (t) {
      if (t.dead || t.captain || !((t.state === 'chute' && t.open >= 1) || t.state === 'rope') || t.y < 380) return;
      var d = Math.hypot(t.x - ox, t.y - oy);
      if (d < 340 && d < bd) { bd = d; best = t; }
    });
    if (best) return best;
    // A helicopter hovering low, or sweeping across low, is everyone's business. (Never balloons: their bombs would
    // fall on the crew.)
    var heli = S.planes.find(function (p) { return p.kind === 'heli' && p.state === 'fly' && (p.phase === 'drop' || p.phase === 'wait' || (p.phase === 'sweep' && p.x > 10 && p.x < W - 10)); });
    if (heli) return heli;
    // Nothing closer to deal with: everyone plinks at the Dreadnought's guns or the zeppelin.
    if (parts.length) return parts[0];
    return S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly' && zeppelinOnScreen(p); }) || null;
  }
  function aimPoint(r, tg) {
    var x, y, vx = 0, vy = 0, sp = r.type === 'bazooka' ? 300 : 520;
    if (tg.kind === 'plane' || tg.kind === 'bomber') { x = tg.x; y = tg.y; vx = tg.dir * tg.speed; }
    else if (tg.kind === 'zeppelin') { x = tg.x; y = tg.y; vx = tg.face * tg.speed; }
    else if (tg.kind === 'dreadpart') { x = tg.x; y = tg.y; vx = tg.vx; }
    else if (SKY.KINDS[tg.kind]) { x = tg.x; y = tg.y; vx = tg.vx || 0; vy = tg.vy || 0; }
    else if (tg.tread !== undefined) { x = tg.x; y = tg.y - 2; vx = 0; }
    else if (tg.isBomb) { x = tg.x; y = tg.y; vx = tg.vx; vy = tg.vy; }
    else if (tg.state === 'ground') { x = tg.x; y = tg.y + 14; vx = (tg.type === 'sniper' || tg.atWall || tg.attacking) ? 0 : tg.dir * 22 * (S.mods.wire ? 0.5 : 1); }
    else {
      x = tg.x; y = tg.y + 12; vy = tg.fall;
      if (S.mods.catcher && r.type !== 'bazooka' && tg.state === 'chute' && slotsAvailable() && tg.y > 475) {
        var over = activeTramps().some(function (q) { return tg.x > q.x1 + 8 && tg.x < q.x2 - 8; });
        if (over) { y = tg.y - 28; x = tg.x + (r.x > tg.x ? 15 : -15); }
      }
    }
    var tt = Math.hypot(x - r.x, y - (r.y != null ? r.y : GROUND - 23)) / sp;
    return { x: x + vx * tt, y: y + vy * tt };
  }
  function fireRecruit(r, ang) {
    var baz = r.type === 'bazooka', a = ang + (RC() * 2 - 1) * ENEMIES[r.type].spread * Math.pow(0.72, S.mods.aim), sp = baz ? 300 : 520;
    S.bullets.push({ x: r.x + Math.cos(a) * 16, y: GROUND - 23 + Math.sin(a) * 16, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      owner: 'ally', by: r.id, kind: baz ? 'rocket' : 'bullet', life: 1.6, dead: false });
    sound.play(baz ? 'rocket' : 'ally');
  }
  // Wall health a second for a soldier repairing: engineers are the specialists.
  var REPAIR = { ENGINEER: 4, OTHER: 2 };
  function updateRecruits(dt) {
    var hp = S.wallHP / S.mods.maxHP * 100;
    var lvl = hp < 15 ? 3 : hp < 40 ? 2 : hp < 70 ? 1 : 0, exitAt = [0, 85, 55, 30];
    if (lvl > S.repairLevel) S.repairLevel = lvl;
    else if (lvl < S.repairLevel && hp >= exitAt[S.repairLevel]) S.repairLevel = lvl;
    var live = S.recruits.filter(standing), wounded = S.recruits.filter(function (r) { return !r.dead && r.down; });
    var byNear = function (a, b) { return Math.abs(a.homeX - 200) - Math.abs(b.homeX - 200); };
    var eng = live.filter(function (r) { return r.type === 'engineer'; });
    var oth = live.filter(function (r) { return r.type !== 'engineer' && r.type !== 'medic'; }).sort(byNear);
    var need = S.repairLevel === 3 ? oth.length : Math.max(0, S.repairLevel - eng.length);
    oth.forEach(function (r, i) { r.role = i < need ? 'repair' : 'shoot'; });
    eng.forEach(function (r) { r.role = hp < 99.5 ? 'repair' : 'idle'; });
    live.filter(function (r) { return r.type === 'medic'; }).forEach(function (r) { r.role = 'heal'; });
    var stack = [0, 0];
    live.slice().sort(byNear).forEach(function (r) {
      var side = r.homeX < 200 ? 0 : 1;
      if (r.role === 'repair') { r.tx = side === 0 ? BK.x1 - 7 - stack[0] * 10 : BK.x2 + 7 + stack[1] * 10; stack[side]++; }
      else r.tx = r.homeX;
    });
    // An HQ crate on the ground: the nearest free soldier runs out to fetch it (sky.js).
    var job = S.mode === 'play' ? SKY.errand(live) : null;
    if (job) { job.r.role = 'fetch'; job.r.tx = job.x; }
    wounded.forEach(function (r) { r.hurt = Math.max(0, r.hurt - dt); });
    live.forEach(function (r) {
      r.hurt = Math.max(0, r.hurt - dt);
      var d = r.tx - r.x;
      if (Math.abs(d) > 0.8) { r.x += Math.sign(d) * Math.min(Math.abs(d), (r.role === 'fetch' ? 70 : 48) * dt); r.walk += dt * 12; return; }
      r.x = r.tx;
      if (r.role === 'fetch') { SKY.collect(job.crate, r); return; }
      if (r.role === 'repair') {
        if (S.wallHP < S.mods.maxHP && S.mode === 'play') {
          repairWall((r.type === 'engineer' ? REPAIR.ENGINEER : REPAIR.OTHER) * dt, 'crew');
          r.sparkT -= dt;
          if (r.sparkT <= 0) {
            r.sparkT = 0.42;
            var sd = r.homeX < 200 ? 1 : -1;
            S.parts.push({ k: 'tink', x: r.x + sd * 11, y: GROUND - 25 + rr(-4, 4), life: 0.22, max: 0.22, c: HAT, id: nextId++ });
            sound.play('tink');
          }
        }
      } else if (r.role === 'heal') {
        r.cd -= dt;
        // The wounded come first, then whoever is lowest.
        var near = function (q) { return q !== r && Math.abs(q.x - r.x) < 160; };
        var patient = wounded.filter(near).sort(function (a, b) { return a.downAt - b.downAt; })[0] ||
          live.filter(function (q) { return near(q) && q.hp < crewMax(q); }).sort(function (a, b) { return a.hp - b.hp; })[0];
        if (patient && r.cd <= 0) {
          patient.hp = Math.min(crewMax(patient), patient.hp + 0.45); r.cd = 2; addText('+', patient.x, GROUND - 44, BLUE, 20, 'minor');
          if (patient.down && patient.hp >= 1) standUp(patient, 'medic');
        }
      } else if (r.role === 'shoot') {
        var tg = pickTarget(r);
        r.cd -= dt;
        if (tg) {
          var ap = aimPoint(r, tg), want = Math.atan2(ap.y - (GROUND - 23), ap.x - r.x);
          r.aim += angDiff(want, r.aim) * Math.min(1, dt * 10);
          if (r.cd <= 0) { fireRecruit(r, want); r.cd = ENEMIES[r.type].cooldown * Math.pow(RANK.FIRE, r.rank || 0) * (S.mods.flag ? FLAG.FIRE : 1) + between(RC, 0, 0.3); }
        } else r.cd = Math.max(r.cd, 0.2);
      }
    });
  }

  // ---------- update ----------
  function updatePlanes(dt) {
    // A downed Dreadnought's wreck smolders on until the next wave (campaign.js).
    if (S.wreck) updateDread(S.wreck, dt);
    for (var i = S.planes.length - 1; i >= 0; i--) {
      var p = S.planes[i];
      if (p.kind === 'zeppelin') { updateZeppelin(p, dt); if (p.gone) S.planes.splice(i, 1); continue; }
      if (p.kind === 'dread') { updateDread(p, dt); if (p.gone) S.planes.splice(i, 1); continue; }
      if (SKY.KINDS[p.kind]) { SKY.updatePlane(p, dt); if (p.gone) S.planes.splice(i, 1); continue; }
      p.hitFlash = Math.max(0, p.hitFlash - dt);
      if (p.state === 'fly') {
        p.x += p.dir * p.speed * dt;
        if (p.kind === 'cargo') updateCargo(p);
        while (p.drops.length && (p.dir > 0 ? p.x >= p.drops[0] : p.x <= p.drops[0])) spawnTrooper(p.drops.shift(), p.y + 8, p.kits.shift());
        while (p.bombRun.length && (p.dir > 0 ? p.x >= p.bombRun[0].x : p.x <= p.bombRun[0].x)) {
          var drop = p.bombRun.shift();
          S.bombs.push({ id: nextId++, x: drop.x, y: p.y + 14, vx: drop.vx, vy: 0, isBomb: true, dead: false });
          emit('bomb_dropped', { by: 'bomber' });
          sound.play('whistle');
        }
        if (p.x < -90 || p.x > W + 90) S.planes.splice(i, 1);
      } else {
        p.vy += 320 * dt; p.x += p.dir * p.speed * 0.6 * dt; p.y += p.vy * dt; p.rot = Math.min(1.25, p.rot + 1.7 * dt);
        p.smoke -= dt;
        if (p.smoke <= 0) { p.smoke = busy() ? 0.14 : 0.07; puff(p.x - p.dir * 18, p.y - 4, 4, 0.7); }
        S.troopers.forEach(function (t) {
          if (!t.dead && (t.state === 'chute' || t.state === 'free') && Math.hypot(t.x - p.x, t.y + 10 - p.y) < 26) {
            t.dead = true; killFx(t); S.stats.kills++;
            emit('kill', { by: 'crash', type: t.type });
            award(10, t.x, t.y, 'bonk!', INK, true);
          }
        });
        if (p.y >= GROUND - 8) { explode(p.x, GROUND - 4, 40, 'crash'); S.planes.splice(i, 1); }
      }
    }
  }
  function updateBombs(dt) {
    S.bombs.forEach(function (m) {
      if (m.dead) return;
      m.vy += 260 * dt; m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.y >= GROUND - 6 || (m.x > BK.x1 - 4 && m.x < BK.x2 + 4 && m.y >= BK.top - 8)) {
        m.dead = true;
        explode(m.x, Math.min(m.y, GROUND - 4), m.shell ? 28 : m.heavy ? 50 : 42, m.shell ? 'shell' : m.heavy ? 'dive' : 'bomb', null, m.balloon ? 'balloon' : m.src || null);
      }
    });
  }
  function updateSniper(t, dt) {
    var live = S.recruits.filter(standing), aimX, aimY;
    if (live.length) {
      t.alone = 0;
      var target = live.sort(function (a, b) { return Math.abs(a.x - t.x) - Math.abs(b.x - t.x); })[0];
      aimX = target.x; aimY = GROUND - 22;
    } else {
      // No crew: plink at the turret (heat jolt, wall chip) for a while, then slip away unrewarded so a wave can't stall.
      t.alone += dt;
      if (t.alone > ENEMIES.sniper.abandonAfter) {
        t.x += (t.x < BK.x ? -1 : 1) * 32 * dt; t.walk += dt * 9;
        if (t.x < -12 || t.x > W + 12) t.dead = true;
        return;
      }
      aimX = TUR.x; aimY = TUR.y + 3;
    }
    t.dir = aimX > t.x ? 1 : -1;
    t.aim = Math.atan2(aimY - (t.y + 11), aimX - t.x);
    t.shotCD -= dt;
    if (t.shotCD <= 0) {
      t.shotCD = ENEMIES.sniper.cooldown;
      S.enemyShots.push({ x: t.x + t.dir * 16, y: t.y + 11, vx: Math.cos(t.aim) * 260, vy: Math.sin(t.aim) * 260, life: 2, turret: !live.length });
      sound.play('sniper');
    }
  }
  function sniperHitsTurret(cause) {
    // Every barrel takes the knock.
    S.turrets.forEach(function (t) { t.heat = Math.min(1, t.heat + 0.25); if (t.heat >= 1) triggerOverheat(t); });
    hurtWall(3, cause || 'sniper');
    addText('ping!', TUR.x + rr(-14, 14), TUR.y - 38, RED, 20, 'minor');
    S.parts.push({ k: 'tink', x: TUR.x, y: TUR.y - 6, life: 0.25, max: 0.25, c: RED, id: nextId++ });
    sound.play('clank');
  }
  function updateEnemyShots(dt) {
    S.enemyShots.forEach(function (b) {
      b.life -= dt; var x0 = b.x; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.turret) {
        if (b.life > 0 && Math.hypot(b.x - TUR.x, b.y - (TUR.y + 3)) < 18) { b.life = 0; sniperHitsTurret(b.cause); }
        return;
      }
      S.recruits.forEach(function (r) {
        if (b.life <= 0 || !standing(r) || r.x < Math.min(x0, b.x) - 6 || r.x > Math.max(x0, b.x) + 6 || Math.abs(b.y - (GROUND - 22)) > 18) return;
        b.life = 0; hurtRecruit(r, b.dmg || ENEMIES.sniper.damage, b.cause || 'sniper'); r.hurt = 0.3;
      });
    });
    S.enemyShots = S.enemyShots.filter(function (b) { return b.life > 0 && b.x > -20 && b.x < W + 20 && b.y < GROUND + 4; });
  }
  function updateLander(t, dt) {
    if (t.captain) { CAMPAIGN.captainRun(t, dt); return; }
    if (t.type === 'sniper') { updateSniper(t, dt); return; }
    var mine = S.mines.find(function (m) { return m.armed && Math.abs(t.x - m.x) < 12; });
    if (mine) { mine.armed = false; explode(mine.x, GROUND - 15, 38, 'mine', 'ally'); return; }
    var wallX = t.dir > 0 ? BK.x1 - 7 : BK.x2 + 7, blk = null, bd = 1e9;
    S.recruits.forEach(function (r) {
      if (r.dead) return;
      var d = (r.x - t.x) * t.dir;
      if (d > -2 && d < bd) { bd = d; blk = r; }
    });
    t.attacking = null; t.atWall = false;
    if (blk && bd < 11) {
      t.attacking = blk; hurtRecruit(blk, dt, 'lander');
    } else if ((wallX - t.x) * t.dir <= 0) {
      t.atWall = true; t.x = wallX;
      hurtWall(BALANCE.WALL_DAMAGE * dt, 'lander');
      t.thump -= dt;
      if (t.thump <= 0) { t.thump = 0.6; S.parts.push({ k: 'tink', x: wallX + t.dir * 8, y: GROUND - 18, life: 0.25, max: 0.25, c: RED, id: nextId++ }); sound.play('thump'); }
    } else {
      var pace = (t.speed || 22) * (S.mods.wire ? 0.5 : 1);
      t.x += t.dir * pace * dt; t.walk += dt * 9 * pace / 22;
    }
  }
  // A bailing Dreadnought crewman fires at the nearest soldier standing every DREAD.BAIL_EVERY seconds on his way down.
  function gunnerFire(t, dt) {
    t.flash = Math.max(0, t.flash - dt);
    if (t.open < 1 || (t.gunT -= dt) > 0) return;
    t.gunT = DREAD.BAIL_EVERY;
    var crew = S.recruits.filter(standing).sort(function (a, b) { return Math.abs(a.x - t.x) - Math.abs(b.x - t.x); })[0];
    if (!crew) return;
    var a = Math.atan2(GROUND - 22 - (t.y + 10), crew.x - t.x) + (RC() * 2 - 1) * 0.06;
    S.enemyShots.push({ x: t.x + 6, y: t.y + 10, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, life: 2.5, dmg: DREAD.BAIL_HURT, cause: 'dreadnought' });
    t.flash = 0.07; sound.play('sniper');
  }
  function updateTroopers(dt) {
    S.troopers.forEach(function (t) {
      if (t.dead) return;
      if (t.state === 'chute') {
        if (t.gunner) gunnerFire(t, dt);
        t.open = Math.min(1, t.open + dt * 2.6);
        t.y += (t.open < 1 ? 95 - 55 * t.open : t.fall) * dt;
        if (t.captain) CAMPAIGN.captainDrift(t, dt);
        else if (t.type === 'sniper') { var edge = t.x < BK.x ? 18 : W - 18; t.x += Math.sign(edge - t.x) * Math.min(Math.abs(edge - t.x), 28 * dt); }
        else t.x += Math.sin(S.t * 1.3 + t.sway) * 7 * dt;
        if (t.x > 150 && t.x < 250) t.x += (t.x < 200 ? -1 : 1) * 10 * dt;
        t.x = clamp(t.x, 12, W - 12);
        if (t.y + 33 >= GROUND) land(t);
      } else if (t.state === 'free') {
        var previousFeet = t.y + 33;
        t.vy += 650 * dt; t.y += t.vy * dt; t.rot += t.spin * dt;
        var bounced = false, mats = activeTramps();
        if (t.vy > 0) {
          for (var i = 0; i < mats.length; i++) {
            var tr = mats[i];
            if (t.x >= tr.x1 + 4 && t.x <= tr.x2 - 4 && previousFeet <= tr.y + 2 && t.y + 33 >= tr.y + 2) { if (t.vy <= CAPTURE_SPEED) { bounce(t, tr); bounced = true; } else { addText('rip!', t.x, tr.y - 28, RED, 25); splat(t, true); bounced = true; tr.v += 90; } break; }
          }
        }
        if (!bounced && t.y + 33 >= GROUND) { crush(t); splat(t); }
      } else if (t.state === 'bounce') {
        t.bt += dt / t.bdur;
        var u = Math.min(1, t.bt);
        t.x = t.x0 + (t.x1 - t.x0) * u;
        t.y = t.y0 + (t.y1 - t.y0) * u - 4 * t.bh * u * (1 - u);
        t.rot = u * Math.PI * 2 * t.spinDir;
        if (u >= 1) becomeRecruit(t);
      } else if (t.state === 'ground') {
        updateLander(t, dt);
      } else if (t.state === 'rope') {
        // Sliding down a helicopter's rope (sky.js): no chute to pop, so no catching.
        t.y += t.fall * dt;
        if (t.y + 33 >= GROUND) land(t);
      }
    });
  }
  function updateBullets(dt) {
    S.bullets.forEach(function (b) {
      if (b.dead) return;
      shooter = b.by != null ? b.by : null;
      gunner = b.owner === 'player' && b.gun != null ? b.gun : null;
      b.life -= dt;
      for (var s = 0; s < 3 && !b.dead; s++) { b.x += b.vx * dt / 3; b.y += b.vy * dt / 3; hitTest(b); }
      if (!b.dead) {
        if (b.kind === 'rocket' && R() < 0.6) puff(b.x - b.vx * 0.03, b.y - b.vy * 0.03, 2, 0.35);
        if (b.life <= 0 || b.x < -20 || b.x > W + 20 || b.y < -20 || b.y > GROUND) {
          b.dead = true;
          if (b.kind === 'rocket' && b.y > GROUND - 2) explode(b.x, GROUND - 4, 24, 'rocket', b.owner);
        }
      }
      shooter = null; gunner = null;
    });
  }
  // Kill counts: while a recruit's own bullet or rocket is being resolved, its kills are his (credit).
  var shooter = null;
  function credit() {
    if (shooter == null) return;
    var r = S.recruits.find(function (q) { return q.id === shooter; });
    if (r && !r.dead) r.kills = (r.kills || 0) + 1;
  }
  function updateParts(dt) {
    partsBusy = true;
    try { moveParts(dt); } finally { partsBusy = false; }
  }
  function moveParts(dt) {
    S.parts.forEach(function (q) {
      q.life -= dt;
      if (q.k === 'body') {
        if (q.rest) { q.rest += dt; if (q.rest > 2) q.life = 0; }
        else {
          q.vy += 650 * dt; q.x = clamp(q.x + q.vx * dt, 3, W - 3); q.y += q.vy * dt; q.rot += q.vr * dt;
          if (q.y >= GROUND - 4) {
            q.y = GROUND - 4; q.vy *= -0.28; q.vx *= 0.55; q.vr *= 0.45;
            if (Math.abs(q.vy) < 28) { q.rest = dt; q.vx = q.vy = q.vr = 0; }
          }
        }
        if (q.life <= 0) addDecal({ kind: 'body', x: q.x, y: q.y, rot: q.rot, head: q.head, len: q.len, c: q.c, seed: q.id, a: 0.38 });
      } else if (q.k === 'tag') {
        q.t += dt; var u = Math.min(1, q.t / q.dur), e = u * u;
        q.x = q.x0 + (TAG_HUD.x - q.x0) * e; q.y = q.y0 + (TAG_HUD.y - q.y0) * e - Math.sin(u * Math.PI) * 40;
        q.life = u < 1 ? 1 : 0;
        if (u >= 1) S.tagPulse = 0.25;
      } else if (q.k === 'tagout') {
        q.t += dt; var v = clamp(q.t / q.dur, 0, 1);
        q.x = q.x0 + (q.x1 - q.x0) * v; q.y = q.y0 + (q.y1 - q.y0) * v - Math.sin(v * Math.PI) * 30; q.rot += dt * 6;
        q.life = v < 1 ? 1 : 0;
      } else if (q.k === 'spatter') {
        q.vy += 120 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
      } else if (q.k === 'fleck') {
        q.vy += 420 * dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.y >= GROUND) { q.y = GROUND; q.vx *= 0.5; q.vy = 0; q.landed = true; }
        if (q.c === RED && q.landed && q.life <= 0 && q.id % 3 === 0) addDecal({ kind: 'splat', x: q.x, y: q.y, r: 1.8, color: RED, a: 0.32, seed: q.id });
      } else if (q.k === 'shred') {
        q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= (1 - dt); q.vy = Math.min(60, q.vy + 80 * dt); q.rot += q.vr * dt;
      } else if (q.k === 'puff') {
        q.r += q.vr * dt; q.y -= 10 * dt;
      } else if (q.k === 'scrap') {
        q.vy += 140 * dt; q.vx *= (1 - dt); q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
      } else if (q.k === 'sticker' || q.k === 'plate') {
        // The decoy's disguise (its sign, its cardboard armor), torn off: it flutters down, swaying, and lies on the
        // ground.
        if (q.y < GROUND - 8) {
          q.vy = Math.min(90, q.vy + 110 * dt); q.y += q.vy * dt; q.vx *= (1 - dt * 0.8);
          q.x = clamp(q.x + (q.vx + Math.sin(q.life * 3.2) * 38) * dt, 40, W - 40); q.rot = Math.sin(q.life * 3.2) * 0.45;
        } else { q.y = GROUND - 8; q.rot *= 1 - Math.min(1, dt * 4); q.flat = Math.min(1, q.flat + dt * 3); q.landedT = (q.landedT || 0) + dt; }
      }
    });
    S.parts = S.parts.filter(function (q) { return q.life > 0; });
    S.texts.forEach(function (q) { q.life -= dt; q.y = Math.max(TEXT.TOP, q.y + q.vy * dt); q.vy *= 0.97; });
    S.texts = S.texts.filter(function (q) { return q.life > 0; });
  }

  // The sentry tower stands just right of the bunker, clear of the main gun's swing.
  // It covers the bunker: bombs and shells first, then low chutes, troopers on the ground, tanks, then low planes.
  var SENTRY = { x: 242, y: 526, every: 0.7, range: 330, low: 380 };
  function sentryTarget() {
    var best = null, bd = 1e9, ox = SENTRY.x, oy = SENTRY.y;
    function nearest(list, ok) {
      list.forEach(function (o) { if (!ok(o)) return; var d = Math.hypot(o.x - ox, o.y - oy); if (d < SENTRY.range && d < bd) { bd = d; best = o; } });
      return best;
    }
    return nearest(S.bombs, function (m) { return !m.dead && !m.armored && m.y > 200 && inView(m); }) ||
      nearest(S.troopers, function (t) { return !t.dead && !t.captain && ((t.state === 'chute' && t.open >= 1) || t.state === 'rope') && t.y > SENTRY.low; }) ||
      nearest(S.troopers, function (t) { return !t.dead && !t.captain && t.state === 'ground'; }) ||
      nearest(S.tanks, function (tk) { return !tk.dead && tk.state !== 'chute' && inView(tk); }) ||
      nearest(S.planes, function (p) { return p.state === 'fly' && p.kind !== 'zeppelin' && p.kind !== 'dread' && p.kind !== 'balloon' && p.x > 10 && p.x < W - 10; });
  }
  function updateAutoTurret(dt) {
    if (!S.mods.auto || S.mode !== 'play') return;
    S.autoCD -= dt;
    var target = sentryTarget();
    if (!target) return;
    var gun = { x: SENTRY.x, y: SENTRY.y, type: 'rifle' }, ap = aimPoint(gun, target), ang = Math.atan2(ap.y - SENTRY.y, ap.x - SENTRY.x);
    S.autoAim = ang;
    if (S.autoCD > 0) return;
    var a = ang + (RC() * 2 - 1) * 0.04;
    S.bullets.push({ x: SENTRY.x + Math.cos(a) * 14, y: SENTRY.y + Math.sin(a) * 14, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520,
      owner: 'ally', kind: 'bullet', life: 1.6, dead: false });
    sound.play('ally'); S.autoCD = SENTRY.every;
  }
  function update(dt) {
    S.t += dt;
    if (S.mode === 'play') {
      S.turrets.forEach(function (t, i) {
        var mine = i === me;
        if (mine && keys.left) t.aim = Math.max(AIM_MIN, t.aim - 2.3 * dt);
        if (mine && keys.right) t.aim = Math.min(AIM_MAX, t.aim + 2.3 * dt);
        t.fireCD -= dt;
        updateHeat(dt, t);
        if ((t.firing || (mine && keys.fire)) && t.fireCD <= 0 && t.overheat <= 0) fireVolley(t);
      });
      updateWave(dt);
      if (S.mode === 'shop') return;
      updateDelivery(dt);
      fadeInk(dt);
    }
    S.turrets.forEach(function (t) { t.recoil = Math.max(0, t.recoil - dt * 8); });
    updatePlanes(dt);
    updateBombs(dt);
    SKY.update(dt);
    updateTroopers(dt);
    updateTanks(dt);
    updateStrike(dt);
    updateFighter(dt);
    updateRadio(dt);
    updateRecruits(dt);
    updateAutoTurret(dt);
    updateBullets(dt);
    updateEnemyShots(dt);
    updateParts(dt);
    updateBubbles(dt);
    if (S.mode === 'play') SQUAD.smallTalk(dt);
    updateSketches(dt);
    updateFlag(dt);
    TRAMPS.forEach(function (tr) { tr.v += (-240 * tr.dip - 9 * tr.v) * dt; tr.dip += tr.v * dt; });
    if (S.comboT > 0) { S.comboT -= dt; if (S.comboT <= 0) S.combo = 0; }
    if (S.players) S.players.forEach(function (p) { if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; } });
    S.shake = Math.max(0, S.shake - dt * 1.8);
    if (S.tagPulse > 0) S.tagPulse = Math.max(0, S.tagPulse - dt);
    if (S.tagLoss > 0) S.tagLoss = Math.max(0, S.tagLoss - dt);
    if (S.banner) { S.banner.t += dt; if (S.banner.t >= S.banner.dur) S.banner = null; }
    if (S.wallHP < 30 && S.mode === 'play') {
      S.smokeT -= dt;
      if (S.smokeT <= 0) { S.smokeT = 0.35; puff(rr(205, 228), 578, 3, 0.9); }
    }
    S.troopers = S.troopers.filter(function (t) { return !t.dead; });
    S.recruits = S.recruits.filter(function (r) { return !r.dead; });
    S.bullets = S.bullets.filter(function (b) { return !b.dead; });
    S.bombs = S.bombs.filter(function (m) { return !m.dead; });
    if (S.mode === 'play' && S.wallHP <= 0) die();
    if (S.mode === 'dying') { S.dieT -= dt; if (S.dieT <= 0) showOver(); }
  }

  // ---------- drawing ----------
  function stick(x, y, p, col, w) {
    G.beginPath(); G.arc(x, y, 5, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
    ink(col, w || 2.4);
    G.beginPath();
    Ci(x, y, 5.2);
    L(x, y + 5.2, x, y + 21);
    L(x, y + 9.5, x + p[0], y + p[1]);
    L(x, y + 9.5, x + p[2], y + p[3]);
    L(x, y + 21, x + p[4], y + p[5]);
    L(x, y + 21, x + p[6], y + p[7]);
    G.stroke();
  }
  function tube(x1, y1, x2, y2) {
    var a = x1 + jt(0.5), b = y1 + jt(0.5), c = x2 + jt(0.5), d = y2 + jt(0.5);
    G.beginPath(); G.moveTo(a, b); G.lineTo(c, d);
    ink(INK, 6.5); G.stroke(); ink(PAPER, 3); G.stroke();
  }
  function hat(x, y) {
    G.beginPath(); G.moveTo(x - 7, y - 1); G.quadraticCurveTo(x - 7, y - 10, x, y - 10); G.quadraticCurveTo(x + 7, y - 10, x + 7, y - 1); G.closePath();
    G.fillStyle = HAT; G.fill(); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(x - 9.5, y - 1, x + 9.5, y - 1, 0.4); ink(INK, 2); G.stroke();
  }
  // A small stamped-metal dog tag with its chain hole, drawn once into a cached sprite.
  var tagSprite = null;
  function dogTag(x, y, rot, sc) {
    if (!tagSprite) {
      tagSprite = document.createElement('canvas'); tagSprite.width = tagSprite.height = 64;
      var previous = G; G = tagSprite.getContext('2d'); G.setTransform(4, 0, 0, 4, 0, 0); G.translate(8, 8);
      try { drawTagShape(); } finally { G = previous; }
    }
    G.save(); G.translate(x, y); G.rotate(rot || 0); G.scale(sc || 1, sc || 1);
    G.drawImage(tagSprite, -8, -8, 16, 16);
    G.restore();
  }
  function drawTagShape() {
    G.beginPath(); G.moveTo(-4, -6); G.lineTo(4, -6); G.quadraticCurveTo(6, -6, 6, -3); G.lineTo(6, 4); G.quadraticCurveTo(6, 7, 3, 7); G.lineTo(-3, 7); G.quadraticCurveTo(-6, 7, -6, 4); G.lineTo(-6, -3); G.quadraticCurveTo(-6, -6, -4, -6); G.closePath();
    G.fillStyle = '#cfd5dc'; G.fill(); G.lineWidth = 1.4; G.strokeStyle = '#56606b'; G.stroke();
    G.beginPath(); G.arc(0, -3, 1.3, 0, Math.PI * 2); G.stroke();
    G.beginPath(); G.moveTo(-3, 1); G.lineTo(3, 1); G.moveTo(-3, 4); G.lineTo(2, 4); G.lineWidth = 1; G.stroke();
  }
  function helmet(x, y) {
    G.beginPath(); G.moveTo(x - 7.5, y - 1); G.quadraticCurveTo(x - 7, y - 10, x, y - 10); G.quadraticCurveTo(x + 7, y - 10, x + 7.5, y - 1); G.closePath();
    G.fillStyle = '#7d8a64'; G.fill(); ink(INK, 1.5); G.stroke();
    G.beginPath(); L(x - 10, y - 0.5, x + 10, y - 0.5, 0.4); ink(INK, 2); G.stroke();
  }
  // Medics wear a white helmet with a red cross on the front.
  function medicHelmet(x, y) {
    G.beginPath(); G.moveTo(x - 7.5, y - 1); G.quadraticCurveTo(x - 7, y - 10.5, x, y - 10.5); G.quadraticCurveTo(x + 7, y - 10.5, x + 7.5, y - 1); G.closePath();
    G.fillStyle = PAPER; G.fill(); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(x - 10, y - 0.5, x + 10, y - 0.5, 0.4); ink(INK, 2); G.stroke();
    G.beginPath(); L(x - 2.8, y - 5.5, x + 2.8, y - 5.5); L(x, y - 8.3, x, y - 2.7); ink(RED, 2); G.stroke();
  }
  // Enemy armor: a grey flak vest over the chest, and a steel helmet on heavies. Both flash pale when hit.
  function vest(x, y, flash) {
    G.beginPath(); SP([x - 4.5, y + 7, x + 4.5, y + 7, x + 4, y + 19, x - 4, y + 19], true, 0.3);
    G.fillStyle = flash ? PAPER : '#8a8f96'; G.fill(); ink(INK, 1.5); G.stroke();
  }
  // The Dreadnought's captain (campaign.js): a peaked officer's cap, dark with a red band, a gold badge and a visor.
  function captainCap(x, y, d) {
    G.beginPath(); G.moveTo(x - 5.5, y - 3); G.lineTo(x - 8.5, y - 9); G.quadraticCurveTo(x, y - 12.5, x + 8.5, y - 9); G.lineTo(x + 5.5, y - 3); G.closePath();
    G.fillStyle = '#3b3f4a'; G.fill(); ink(INK, 1.4); G.stroke();
    G.beginPath(); L(x - 5.8, y - 4.6, x + 5.8, y - 4.6, 0.2); ink(RED, 2); G.stroke();
    G.beginPath(); L(x + d * 1, y - 3, x + d * 9.5, y - 1.2, 0.2); ink(INK, 2.4); G.stroke();
    G.beginPath(); G.arc(x, y - 8, 1.5, 0, Math.PI * 2); G.fillStyle = HAT; G.fill();
  }
  function steelPot(x, y) {
    G.beginPath(); G.moveTo(x - 7.5, y - 1); G.quadraticCurveTo(x - 7, y - 10, x, y - 10); G.quadraticCurveTo(x + 7, y - 10, x + 7.5, y - 1); G.closePath();
    G.fillStyle = '#6b6f75'; G.fill(); ink(INK, 1.5); G.stroke();
  }
  function hammer(hx, hy, d, idle) {
    var ex = hx + d * (idle ? 1 : 4), ey = hy - 9;
    G.beginPath(); L(hx, hy, ex, ey, 0.3); ink(INK, 2.2); G.stroke();
    G.beginPath(); L(ex - 4, ey - 1, ex + 4, ey + 1, 0.3); ink(INK, 4.5); G.stroke();
  }
  function chute(t) {
    var x = t.x, y = t.y, s = 0.35 + 0.65 * t.open, w = 21 * s, base = y - 22, top = base - 22 * s;
    G.beginPath();
    G.moveTo(x - w + jt(0.6), base + jt(0.6));
    G.bezierCurveTo(x - w + jt(1), top + jt(1), x + w + jt(1), top + jt(1), x + w + jt(0.6), base + jt(0.6));
    G.quadraticCurveTo(x + w * 0.66, base - 5 * s, x + w / 3, base);
    G.quadraticCurveTo(x, base - 5 * s, x - w / 3, base);
    G.quadraticCurveTo(x - w * 0.66, base - 5 * s, x - w, base);
    G.closePath();
    G.fillStyle = RED_FILL; G.fill(); ink(RED, 2.2); G.stroke();
    G.beginPath(); L(x - w / 3, base, x, top + 4 * s, 0.5); L(x + w / 3, base, x, top + 4 * s, 0.5); ink(RED, 1.3); G.stroke();
    G.beginPath(); L(x - w, base, x - 5, y + 2, 0.5); L(x + w, base, x + 5, y + 2, 0.5); ink(RED, 1.4); G.stroke();
  }
  function drawTrooper(t) {
    pen(t.id);
    var x = t.x, y = t.y, pose, s;
    G.save();
    if (t.rot) { G.translate(x, y + 14); G.rotate(t.rot); G.translate(-x, -(y + 14)); }
    // Sneaking in under the Dreadnought's smoke (campaign.js sneak): crouched, leaning into it.
    if (t.sneak && t.state === 'ground' && !t.attacking && !t.atWall) { G.translate(x, y + 33); G.rotate(t.dir * 0.5); G.translate(-x, -(y + 33)); }
    if (t.state === 'chute') { chute(t); pose = [-5, 1, 5, 1, -4, 33, 4, 33]; }
    else if (t.state === 'rope') pose = [-1, -6, 1, -9, -3, 33, 3, 32];
    else if (t.state === 'free' || t.state === 'bounce') { s = Math.sin(S.t * 22 + t.id); pose = [-11, 1 + s * 4, 11, 1 - s * 4, -7 + s * 3, 32, 7 + s * 3, 31]; }
    else if (t.attacking || t.atWall) { s = Math.max(0, Math.sin(S.t * 13 + t.id)); pose = [t.dir * (6 + 7 * s), 8, t.dir * 5, 17, -5, 33, 6, 33]; }
    else { s = Math.sin(t.walk); pose = [-s * 5, 19, s * 5, 19, s * 6, 33, -s * 6, 33]; }
    if (t.type === 'bazooka') tube(x - 10, y + 20, x + 9, y + 4);
    stick(x, y, pose, RED);
    if (t.type === 'rifle') { G.beginPath(); L(x - 7, y + 17, x + 7, y + 8, 0.4); ink(INK, 2); G.stroke(); }
    if (t.gunner && t.flash > 0) { G.beginPath(); G.arc(x + 8, y + 8, 4, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,0.95)'; G.fill(); }
    if (t.armor > 0) vest(x, y, S.t - t.pingT < 0.12);
    if (t.captain) captainCap(x, y, t.state === 'ground' ? t.dir : 1);
    else if (t.type === 'engineer') hat(x, y);
    else if (t.armor > 1) steelPot(x, y);
    if (t.type === 'sniper') { drawScope(x, y, t.state === 'ground' ? t.dir : 1);
      if (t.state === 'ground' && t.shotCD < 0.8 && S.recruits.some(standing)) { G.save(); G.globalAlpha = 0.28; G.setLineDash([3, 5]); G.beginPath(); L(x + t.dir * 16, y + 11, x + t.dir * 160, y + 11); ink(RED, 1); G.stroke(); G.restore(); }
    }
    G.restore();
  }
  // A wounded recruit lies on the ground, away from the bunker, under a pulsing red cross.
  function drawDowned(r) {
    pen(r.id + 5000);
    var side = r.homeX < 200 ? -1 : 1;
    G.save(); G.globalAlpha = 0.8; G.translate(r.x, GROUND - 3); G.rotate(side * Math.PI / 2);
    stick(0, -30, [-4, 21, 4, 21, -5, 30, 5, 30], r.hurt > 0 && Math.floor(S.t * 18) % 2 ? RED : BLUE, 2.4);
    G.restore();
    G.save(); G.globalAlpha = 0.55 + 0.35 * Math.sin(S.t * 5);
    G.beginPath(); L(r.x - 4, GROUND - 22, r.x + 4, GROUND - 22); L(r.x, GROUND - 26, r.x, GROUND - 18); ink(RED, 2.6); G.stroke();
    G.restore();
  }
  function drawRecruit(r) {
    if (r.down) { drawDowned(r); return; }
    pen(r.id + 5000);
    var x = r.x, y = GROUND - 33, moving = Math.abs(r.x - r.tx) > 0.8, side = r.homeX < 200 ? 1 : -1;
    var col = r.hurt > 0 && Math.floor(S.t * 18) % 2 ? RED : BLUE;
    var ca = Math.cos(r.aim), sa = Math.sin(r.aim), pose, tool = null, s;
    // Everyone not busy salutes the flag (repairing, healing and fetching carry on).
    var saluting = !moving && S.saluteT > 0 && r.role !== 'repair' && r.role !== 'heal' && r.role !== 'fetch';
    if (moving) { s = Math.sin(r.walk); pose = [-s * 5, 19, s * 5, 19, s * 6, 33, -s * 6, 33]; }
    else if (r.role === 'repair') {
      s = Math.sin(S.t * 12 + r.id);
      var hx = side * (8 + s * 2), hy = 7 + s * 5;
      pose = [hx, hy, side * 3, 18, -5, 33, 5, 33]; tool = { hx: x + hx, hy: y + hy, idle: false };
    } else if (saluting) { pose = [side * 10, 6, -side * 4, 20, -2, 33, 2, 33]; }
    else if (r.type === 'engineer') { pose = [7, 17, -6, 19, -5, 33, 5, 33]; tool = { hx: x + 7, hy: y + 17, idle: true }; }
    else pose = [ca * 9, 9.5 + sa * 9, ca * 15, 9.5 + sa * 15, -5, 33, 5, 33];
    // Saluting the flag (FLAG), at attention: heels together, the elbow out and the hand at the brow (the forearm drawn
    // below), the weapon upright at the other side.
    var aiming = !moving && r.role === 'shoot' && !saluting;
    if (r.type === 'bazooka') { if (aiming) tube(x - ca * 9, y + 8 - sa * 9, x + ca * 16, y + 8 + sa * 16); else tube(x - 9, y + 19, x + 8, y + 5); }
    stick(x, y, pose, col);
    if (saluting) { G.beginPath(); L(x + side * 10, y + 6, x + side * 6, y - 4, 0.2); L(x + side * 6, y - 4, x + side * 1, y - 5, 0.2); ink(col, 2.4); G.stroke(); }
    if (r.type === 'rifle') {
      G.beginPath();
      if (aiming) L(x + ca * 4, y + 9.5 + sa * 4, x + ca * 20, y + 9.5 + sa * 20, 0.3);
      else if (saluting) L(x - side * 6, y + 4, x - side * 6, y + 28, 0.2);
      else L(x - 7, y + 17, x + 7, y + 8, 0.4);
      ink(INK, aiming ? 2.6 : 2); G.stroke();
    }
    if (tool) hammer(tool.hx, tool.hy, side, tool.idle);
    if (r.type === 'engineer') hat(x, y);
    else if (r.type === 'medic') medicHelmet(x, y);
    else if (S.mods.helmet > 0) helmet(x, y);
    if (r.type === 'sniper') drawScope(x, y, Math.cos(r.aim) < 0 ? -1 : 1);
    chevrons(x - 7, y + 9, r.rank || 0);
    // Crew health makes the cost of leaving a sniper alive visible.
    G.fillStyle = 'rgba(46,46,51,0.15)'; G.fillRect(x-6, GROUND+4, 12, 2);
    G.fillStyle = r.hp < 1 ? RED : BLUE; G.fillRect(x-6, GROUND+4, 12 * Math.max(0,r.hp) / crewMax(r), 2);
  }
  function drawScope(x, y, dir) {
    G.beginPath(); SP([x - 7, y - 4, x - 3, y - 10, x + 7, y - 7, x + 6, y - 3], true, 0.3); G.fillStyle = INK; G.fill();
    G.beginPath(); L(x, y + 11, x + dir * 22, y + 11); L(x + dir * 8, y + 7, x + dir * 16, y + 7); ink(INK, 2.4); G.stroke();
  }
  var PLANE_PTS = [-38, 2, -36, -7, -24, -10, 26, -8, 36, -10, 42, -21, 50, -21, 48, 1, 20, 7, -28, 8];
  var BOMBER_PTS = [-46, 4, -44, -11, -30, -15, 30, -13, 42, -15, 50, -30, 60, -30, 58, 2, 24, 13, -34, 14];
  function drawPlane(p) {
    pen(p.id);
    var sc = p.sc, bomber = p.kind === 'bomber' || p.kind === 'cargo';
    G.save();
    G.translate(p.x, p.y); G.scale(-p.dir * sc, sc); if (p.rot) G.rotate(-p.rot);
    G.beginPath(); SP(bomber ? BOMBER_PTS : PLANE_PTS, true, 0.6);
    G.fillStyle = PAPER; G.fill();
    G.fillStyle = p.hitFlash > 0 ? 'rgba(200,67,58,0.3)' : INK_FILL; G.fill();
    ink(INK, 2.4 / sc); G.stroke();
    G.beginPath();
    if (bomber) { L(-16, 4, 22, 6); } else { L(-12, 2, 14, 4); }
    ink(INK, 3 / sc); G.stroke();
    G.beginPath(); SP(bomber ? [-32, -12, -26, -20, -16, -20, -12, -13] : [-26, -9, -20, -16, -12, -16, -8, -9], false, 0.4); ink(INK, 2 / sc); G.stroke();
    G.beginPath(); G.arc(bomber ? 18 : 14, bomber ? -3 : -2, bomber ? 4.5 : 3.6, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
    var pl = boil % 2 ? 10 : 6, nx = bomber ? -50 : -42;
    G.beginPath(); L(nx, -pl, nx, pl, 0.4); ink(INK, 2 / sc); G.stroke();
    if (bomber) {
      G.beginPath(); Ci(2, 8, 5); ink(INK, 2 / sc); G.stroke();
      G.beginPath(); L(-6, 13, 10, 13, 0.4); ink(INK, 1.6 / sc); G.stroke();
      if (p.hp < 3) { G.beginPath(); SP([30, -12, 26, -6, 31, -1], false, 0.3); if (p.hp < 2) SP([-20, -14, -16, -7, -21, -2], false, 0.3); ink(INK, 1.6 / sc); G.stroke(); }
      // Cargo planes carry a crated tank under the belly until the drop.
      if (p.kind === 'cargo' && p.tankX != null) {
        G.beginPath(); L(-8, 13, -6, 20, 0.2); L(8, 13, 6, 20, 0.2); ink(INK, 1.4 / sc); G.stroke();
        G.beginPath(); G.rect(-14, 20, 28, 13); G.fillStyle = '#e7dcc0'; G.fill(); ink(INK, 2 / sc); G.stroke();
        G.beginPath(); L(-14, 20, 14, 33, 0.2); L(14, 20, -14, 33, 0.2); ink(INK2, 1.2 / sc); G.stroke();
      }
    }
    if (p.state === 'fly') {
      G.globalAlpha = 0.5; G.beginPath();
      var tx = bomber ? 66 : 56;
      if (p.kind === 'cargo' && p.maxHp && p.hp < p.maxHp) {
        // An armored cargo plane shows its health once hit, like a tank.
        G.globalAlpha = 1; var f = Math.max(0, p.hp / p.maxHp);
        G.fillStyle = PAPER; G.fillRect(-18, -38, 36, 5); G.fillStyle = 'rgba(200,67,58,0.55)'; G.fillRect(-17, -37, 34 * f, 3);
        G.beginPath(); L(-18, -38, 18, -38, 0.2); L(-18, -33, 18, -33, 0.2); ink(INK, 1 / sc); G.stroke(); G.globalAlpha = 0.5; G.beginPath();
      }
      L(tx, -10, tx + 14, -10); L(tx + 2, -2, tx + 20, -2); L(tx, 6, tx + 10, 6);
      ink(INK2, 1.5 / sc); G.stroke(); G.globalAlpha = 1;
    }
    G.restore();
  }
  function drawBomb(m) {
    pen(m.id);
    var a = Math.atan2(m.vy, m.vx) - Math.PI / 2;
    G.save(); G.translate(m.x, m.y); G.rotate(a); if (m.heavy) G.scale(1.45, 1.45);
    if (m.shell) { G.beginPath(); G.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2); G.fillStyle = INK; G.fill(); G.restore(); return; }
    G.beginPath(); G.ellipse(0, 0, 4.5, 7.5, 0, 0, Math.PI * 2); G.fillStyle = INK; G.fill();
    // An armored bomb (from a Dreadnought sortie): steel bands, and bullets pass it by.
    if (m.armored) { G.beginPath(); L(-4.5, -1, 4.5, -1, 0.1); L(-4, 3, 4, 3, 0.1); ink('#9aa0a8', 1.8); G.stroke(); }
    G.beginPath(); L(-4, -6, -6, -12, 0.3); L(4, -6, 6, -12, 0.3); L(-6, -12, 6, -12, 0.3); ink(INK, 1.8); G.stroke();
    G.restore();
  }
  function drawGround() {
    pen(777);
    G.beginPath(); SP([0, 612, 70, 611, 140, 613, 210, 611.5, 280, 612.5, 350, 611, 400, 612], false, 0.4); ink(INK, 2.4); G.stroke();
    G.beginPath();
    L(14, 612, 12, 605, 0.4); L(18, 612, 21, 605, 0.4); L(102, 612, 99, 606, 0.4); L(105, 612, 107, 605, 0.4);
    L(300, 612, 298, 606, 0.4); L(303, 612, 305, 605, 0.4); L(384, 612, 381, 605, 0.4); L(388, 612, 390, 606, 0.4);
    ink(INK, 1.6); G.stroke();
  }
  function drawDefenses() {
    pen(880);
    if (S.mods.wire) [104, 296].forEach(function (x) {
      sketched('wire', [x - 14, GROUND - 11, x + 14, GROUND + 1], 'right', function () {
        G.beginPath(); L(x-12,GROUND-5,x+12,GROUND-5); for(var j=-8;j<=8;j+=8) { L(x+j-3,GROUND-9,x+j+3,GROUND-1); L(x+j-3,GROUND-1,x+j+3,GROUND-9); } ink(INK2,1.3); G.stroke();
      });
    });
    S.mines.forEach(function (m) { if (!m.armed) return; G.beginPath(); Ci(m.x,GROUND-2,4); ink(INK,1.6); G.stroke(); G.beginPath(); L(m.x-2,GROUND-7,m.x+2,GROUND-7); ink(RED,2); G.stroke(); });
    for (var row = 0; row < S.mods.trench; row++) {
      [[98, 162], [238, 302]].forEach(function (span) {
        // Only the newest row is drawn in; older rows are already on the page.
        var draw = function () {
          for (var bx = span[0] + row * 5; bx <= span[1]; bx += 11) {
            var by = GROUND - 3 - row * 6;
            G.beginPath(); SP([bx - 6, by, bx - 4, by - 4, bx + 4, by - 4, bx + 6, by, bx + 4, by + 3, bx - 4, by + 3], true, 0.3);
            G.fillStyle = '#e7dcc0'; G.fill(); ink(INK2, 1.3); G.stroke();
          }
        };
        if (row === S.mods.trench - 1) sketched('trench', [span[0] - 7, GROUND - 10 - row * 6, span[1] + 7, GROUND + 3], 'right', draw); else draw();
      });
    }
    drawSandbags();
  }
  // Sandbags (round 14: they raised the wall's health but drew nothing): stacked against the front of the bunker, a
  // layer per stack (BAGS: each layer's bags, five, then four, three and two on top), the newest layer sketched in.
  // First tried piled against its sides, where the crew standing beside the bunker hid them.
  var BAGS = [[176, 188, 200, 212, 224], [182, 194, 206, 218], [188, 200, 212], [194, 206]];
  function drawSandbags() {
    var n = Math.min(S.mods.stacks.sandbags || 0, BAGS.length);
    pen(886);
    for (var row = 0; row < n; row++) {
      var draw = (function (row) {
        return function () {
          var by = GROUND - 3 - row * 6;
          BAGS[row].forEach(function (bx) {
            G.beginPath(); SP([bx - 6, by, bx - 4, by - 4, bx + 4, by - 4, bx + 6, by, bx + 4, by + 3, bx - 4, by + 3], true, 0.3);
            G.fillStyle = '#ddcfa8'; G.fill(); ink(INK, 1.4); G.stroke();
            G.beginPath(); L(bx - 2, by - 2, bx + 1, by + 1, 0.15); ink(INK2, 1); G.stroke();
          });
        };
      })(row);
      if (row === n - 1) sketched('sandbags', [BK.x1 - 2, GROUND - 10 - row * 6, BK.x2 + 2, GROUND + 3], 'up', draw); else draw();
    }
  }
  function drawTramp(tr, i) {
    pen(500 + i);
    var a = tr.x1, b = tr.x2, y = tr.y, mid = (a + b) / 2, sag = 3 + tr.dip;
    G.beginPath(); L(a + 6, y, a + 1, GROUND, 0.5); L(b - 6, y, b - 1, GROUND, 0.5); L(a + 16, y + 2, a + 12, GROUND, 0.5); L(b - 16, y + 2, b - 12, GROUND, 0.5);
    ink(INK, 2.2); G.stroke();
    G.beginPath(); G.moveTo(a + jt(0.5), y + jt(0.5)); G.quadraticCurveTo(mid + jt(1), y + sag * 2, b + jt(0.5), y + jt(0.5)); ink(INK, 3.4); G.stroke();
    G.beginPath(); G.rect(a - 5, y - 4, 9, 7); G.rect(b - 4, y - 4, 9, 7); G.fillStyle = BLUE; G.fill(); ink(INK, 1.6); G.stroke();
  }
  // Two barrels (co-op) each wear their player's color as a band behind the muzzle: the host blue, the guest red.
  var GUN_COLORS = [BLUE, RED];
  function drawBarrel(t) {
    var len = 31 - t.recoil * 6, hot = clamp((t.heat - 0.35) / 0.65, 0, 1);
    if (t.overheat > 0) hot = Math.floor(S.t * 8) % 2 ? 1 : 0.6;
    G.save(); G.translate(t.x, TUR.y); G.rotate(t.aim);
    G.fillStyle = PAPER; G.fillRect(2, -4, len - 2, 8);
    if (hot > 0) { G.globalAlpha = 0.45 * hot; G.fillStyle = RED; G.fillRect(2, -4, len - 2, 8); G.globalAlpha = 1; }
    if (S.turrets.length > 1) { G.fillStyle = GUN_COLORS[t.gun] || INK; G.fillRect(len - 11, -4, 5, 8); }
    G.beginPath(); L(2, -4, len, -4, 0.4); L(2, 4, len, 4, 0.4); L(len, -4.5, len, 4.5, 0.3); ink(hot > 0.7 ? RED : INK, 2.4); G.stroke();
    G.restore();
  }
  // A thin gauge arcing over the dome: fills left to right as the gun heats, blinks red when locked. With two barrels,
  // the guest's gauge sits outside the host's.
  function drawHeatRing(t, i) {
    if (S.mode !== 'play' || (t.heat < 0.03 && t.overheat <= 0)) return;
    var r = 25 + i * 5, start = Math.PI * 1.08, span = Math.PI * 0.84, end = start + span * t.heat;
    G.save();
    G.setLineDash([2, 4]); G.beginPath(); G.arc(BK.x, BK.top, r, start, start + span); ink('rgba(46,46,51,0.25)', 1.5); G.stroke(); G.setLineDash([]);
    var col = t.overheat > 0 ? (Math.floor(S.t * 8) % 2 ? RED : INK) : t.heat > 0.7 ? RED : INK;
    G.beginPath(); G.arc(BK.x, BK.top, r, start, end); ink(col, 3); G.stroke();
    G.restore();
  }
  function drawSentry() {
    if (!S.mods.auto) return;
    pen(9050);
    var x = SENTRY.x, y = SENTRY.y, top = y + 6;
    // Splayed lattice legs on the ground beside the bunker, out of reach of the main barrel.
    G.beginPath(); L(x - 8, GROUND, x - 4, top, 0.4); L(x + 8, GROUND, x + 4, top, 0.4);
    for (var k = 0; k < 3; k++) { var y1 = GROUND - 4 - k * 26, y2 = y1 - 24, w1 = 7.5 - k * 1.3, w2 = 6.2 - k * 1.3; L(x - w1, y1, x + w2, y2, 0.3); L(x + w1, y1, x - w2, y2, 0.3); }
    ink(INK, 1.8); G.stroke();
    G.beginPath(); L(x - 10, top, x + 10, top, 0.3); ink(INK, 2.8); G.stroke();
    G.save(); G.translate(x, y); G.rotate(S.autoAim);
    G.fillStyle = PAPER; G.fillRect(0, -2.5, 14, 5);
    G.beginPath(); L(0, -2.5, 14, -2.5, 0.2); L(0, 2.5, 14, 2.5, 0.2); L(14, -3, 14, 3, 0.2); ink(INK, 2); G.stroke();
    G.restore();
    G.beginPath(); G.moveTo(x - 7, y + 5); G.arc(x, y + 5, 7, Math.PI, 0); G.closePath(); G.fillStyle = BLUE; G.fill(); ink(INK, 2); G.stroke();
  }
  function drawBunker() {
    pen(9001);
    var i, dipping = function (t) { return t.aim > -0.05 || t.aim < -Math.PI + 0.05; };
    // Tipped down, a barrel leans out over the wall, so it draws in front of the bunker.
    S.turrets.forEach(function (t) { if (!dipping(t)) drawBarrel(t); });
    var dome = [];
    for (i = 0; i <= 10; i++) { var an = Math.PI + (i / 10) * Math.PI; dome.push(BK.x + Math.cos(an) * 19, BK.top + Math.sin(an) * 19); }
    G.beginPath(); G.moveTo(BK.x - 19, BK.top); G.arc(BK.x, BK.top, 19, Math.PI, 0); G.closePath(); G.fillStyle = PAPER; G.fill();
    G.beginPath(); SP(dome, false, 0.5); ink(INK, 2.6); G.stroke();
    G.beginPath(); L(BK.x - 8, BK.top - 6, BK.x + 8, BK.top - 6, 0.4); ink(INK, 1.4); G.stroke();
    var body = [168, 612, 168, 583, 175, 576, 225, 576, 232, 583, 232, 612];
    G.beginPath(); G.moveTo(body[0], body[1]);
    for (i = 2; i < body.length; i += 2) G.lineTo(body[i], body[i + 1]);
    G.closePath(); G.fillStyle = PAPER; G.fill(); G.fillStyle = INK_FILL; G.fill();
    G.beginPath(); for (i = 0; i < body.length - 2; i += 2) L(body[i], body[i + 1], body[i + 2], body[i + 3], 0.6); ink(INK, 2.6); G.stroke();
    G.beginPath();
    L(169, 590, 231, 590, 0.4); L(169, 601, 231, 601, 0.4); L(186, 577, 186, 590, 0.4); L(212, 577, 212, 590, 0.4);
    L(176, 590, 176, 601, 0.4); L(198, 590, 198, 601, 0.4); L(220, 590, 220, 601, 0.4); L(187, 601, 187, 611, 0.4); L(209, 601, 209, 611, 0.4);
    ink('rgba(46,46,51,0.32)', 1.5); G.stroke();
    var hp = S.wallHP / S.mods.maxHP * 100;
    G.beginPath();
    if (hp < 80) SP([173, 584, 179, 591, 175, 597, 181, 605], false, 0.3);
    if (hp < 55) SP([227, 580, 221, 588, 227, 596, 222, 604], false, 0.3);
    if (hp < 15) SP([193, 578, 197, 586, 192, 593, 199, 600, 195, 610], false, 0.3);
    ink(INK, 1.8); G.stroke();
    if (hp < 30) {
      var ch = [210, 575, 226, 575, 233, 583, 233, 595, 226, 590, 219, 586, 214, 581];
      G.beginPath(); G.moveTo(ch[0], ch[1]); for (i = 2; i < ch.length; i += 2) G.lineTo(ch[i], ch[i + 1]); G.closePath(); G.fillStyle = PAPER; G.fill();
      G.beginPath(); SP([232, 595, 226, 590, 219, 586, 214, 581, 210, 576], false, 0.3); ink(INK, 2.2); G.stroke();
    }
    S.turrets.forEach(function (t) { if (dipping(t)) drawBarrel(t); });
    S.turrets.forEach(drawHeatRing);
  }
  // ---------- the flagpole ----------
  // A supply with one job: "It boosts morale." (shop.js). The squad fires FIRE faster while it flies. The first time,
  // it goes up in its own little ceremony before the next wave (after a pizza, if one's coming; openWave, raiseFlag):
  // the pole is sketched in with the flag at the bottom (SKETCH), a beat (PAUSE), the flag is hoisted to the top
  // (HOIST, S.flagUp 0 to 1), and the squad salutes it (SALUTE) while a soldier admires it; then the wave starts. From
  // then on the squad salutes it at every wave start (S.saluteT). It stands at the bunker's left back corner and flies
  // left (DIR) over the squad, clear of the turret and the sentry gun on the right, and nothing targets it. Sold from
  // wave FROM (shop.js).
  var FLAG = { FIRE: 0.96, FROM: 8, X: 170, DIR: -1, TALL: 118, W: 44, H: 28, SKETCH: 0.6, PAUSE: 0.35, HOIST: 1.6, SALUTE: 2 };
  world.FLAG = FLAG;
  function openWave(n) {
    if (S.mods.flag && S.flagUp < 1) { S.waveState = 'flag'; S.nextWave = n; S.flagT = 0; S.flagUp = 0; sound.play('scribble'); }
    else startWave(n);
  }
  function raiseFlag(dt) {
    var was = S.flagT, hoist = FLAG.SKETCH + FLAG.PAUSE, top = hoist + FLAG.HOIST;
    S.flagT += dt;
    S.flagUp = clamp((S.flagT - hoist) / FLAG.HOIST, 0, 1);
    if (was < top && S.flagT >= top) {
      S.saluteT = FLAG.SALUTE;
      var fan = S.recruits.filter(standing)[0];
      if (fan) world.say('look at her fly!', fan.id, false, 0.2);
    }
    if (S.flagT >= top + FLAG.SALUTE) { var next = S.nextWave; S.nextWave = null; startWave(next); }
  }
  function updateFlag(dt) { if (S.saluteT > 0) S.saluteT = Math.max(0, S.saluteT - dt); }
  function drawFlagpole() {
    pen(7070);
    var px = FLAG.X, top = GROUND - FLAG.TALL, low = GROUND - 40 - FLAG.H, up = S.flagUp == null ? 1 : S.flagUp;
    G.beginPath(); L(px, GROUND, px, top, 0.4); ink(INK, 2.6); G.stroke();
    G.beginPath(); G.arc(px, top - 3, 3, 0, Math.PI * 2); G.fillStyle = HAT; G.fill(); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(px + 2 * FLAG.DIR, top + 2, px + 2 * FLAG.DIR, GROUND - 40, 0.2); ink('rgba(46,46,51,0.35)', 1); G.stroke();
    drawFlagCloth(px, low + (top + 2 - low) * up, S.t);
  }
  // The flag itself, rippling in the wind (flying FLAG.DIR of the pole): blue pen with a white star.
  function drawFlagCloth(px, y0, t) {
    var w = FLAG.W * FLAG.DIR, h = FLAG.H, n = 8, pts = [], i, k;
    for (i = 0; i <= n; i++) { k = i / n; pts.push(px + k * w, y0 + Math.sin(t * 6 - k * 5) * 3.2 * k); }
    for (i = n; i >= 0; i--) { k = i / n; pts.push(px + k * w, y0 + h + Math.sin(t * 6 - k * 5 + 0.6) * 3.2 * k - k * 2); }
    G.beginPath(); G.moveTo(pts[0], pts[1]); for (i = 2; i < pts.length; i += 2) G.lineTo(pts[i], pts[i + 1]); G.closePath();
    G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(47,111,220,0.28)'; G.fill(); ink(BLUE, 2.4); G.stroke();
    var cx = px + w * 0.42, cy = y0 + h / 2 + Math.sin(t * 6 - 2.1) * 1.4, st = [];
    for (i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.6 : 8.4; st.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    G.beginPath(); G.moveTo(st[0], st[1]); for (i = 2; i < st.length; i += 2) G.lineTo(st[i], st[i + 1]); G.closePath();
    G.fillStyle = PAPER; G.fill(); ink(BLUE, 1.6); G.stroke();
  }
  // Brought down with the wall: the pole lies across the rubble, the flag crumpled at its end.
  function drawFallenFlag() {
    pen(7071);
    G.beginPath(); L(150, GROUND - 4, 252, GROUND - 14, 0.4); ink(INK, 2.6); G.stroke();
    G.beginPath(); SP([252, GROUND - 14, 268, GROUND - 22, 282, GROUND - 12, 272, GROUND - 4, 258, GROUND - 6], true, 0.6);
    G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(47,111,220,0.28)'; G.fill(); ink(BLUE, 2); G.stroke();
  }
  function drawRubble() {
    pen(9002);
    var pts = [164, 612, 170, 601, 179, 604, 188, 592, 198, 598, 207, 589, 216, 600, 226, 595, 236, 612];
    G.beginPath(); G.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) G.lineTo(pts[i], pts[i + 1]); G.closePath();
    G.fillStyle = PAPER; G.fill(); G.fillStyle = INK_FILL; G.fill();
    G.beginPath(); SP(pts, false, 0.6); ink(INK, 2.6); G.stroke();
    G.beginPath(); L(178, 606, 190, 606, 0.5); L(196, 603, 210, 604, 0.5); L(214, 607, 224, 606, 0.5); ink('rgba(46,46,51,0.4)', 1.6); G.stroke();
    G.save(); G.translate(222, 596); G.rotate(-0.4);
    G.fillStyle = PAPER; G.fillRect(0, -4, 28, 8);
    G.beginPath(); L(0, -4, 28, -4, 0.4); L(0, 4, 28, 4, 0.4); L(28, -4.5, 28, 4.5, 0.3); ink(INK, 2.4); G.stroke();
    G.restore();
  }
  function drawBullets() {
    S.enemyShots.forEach(function (b) { var sp = Math.hypot(b.vx, b.vy) || 1; G.beginPath(); L(b.x, b.y, b.x - b.vx / sp * 12, b.y - b.vy / sp * 12, 0.3); ink(RED, 2); G.stroke(); });
    S.bullets.forEach(function (b) {
      var sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
      G.beginPath();
      if (b.kind === 'rocket') { G.moveTo(b.x - ux * 9, b.y - uy * 9); G.lineTo(b.x, b.y); ink(INK, 6); G.stroke(); ink(BLUE, 3); G.stroke(); }
      else if (b.tracer) { G.moveTo(b.x - ux * 20, b.y - uy * 20); G.lineTo(b.x, b.y); ink('#d99a00', 3); G.stroke(); ink(HAT, 1.4); G.stroke(); }
      else { G.moveTo(b.x - ux * 7, b.y - uy * 7); G.lineTo(b.x, b.y); ink(b.owner === 'ally' ? BLUE : INK, 2.6); G.stroke(); }
    });
  }
  function drawParts() {
    S.parts.forEach(function (q) {
      var a = Math.max(0, q.life / q.max);
      pen(q.id);
      G.save(); G.globalAlpha = a;
      if (q.k === 'body') { G.globalAlpha = 0.85; drawBodyPart(q); }
      else if (q.k === 'tag') { G.globalAlpha = 1; dogTag(q.x, q.y, q.rot, 1); }
      else if (q.k === 'tagout') { if (q.t >= 0) { G.globalAlpha = 1 - 0.6 * clamp(q.t / q.dur, 0, 1); dogTag(q.x, q.y, q.rot, 1.1); } }
      else if (q.k === 'spatter') { G.globalAlpha = a * 0.6; G.beginPath(); G.arc(q.x, q.y, q.r, 0, Math.PI * 2); G.fillStyle = q.c; G.fill(); }
      else if (q.k === 'fleck') { G.beginPath(); G.moveTo(q.x, q.y); G.lineTo(q.x - q.vx * 0.02, q.y - q.vy * 0.02); ink(q.c, 2); G.stroke(); }
      else if (q.k === 'shred') { G.translate(q.x, q.y); G.rotate(q.rot); G.beginPath(); G.arc(0, 0, 6, Math.PI, Math.PI * 1.8); ink(RED, 1.8); G.stroke(); }
      else if (q.k === 'puff') { G.globalAlpha = a * 0.55; G.beginPath(); Ci(q.x, q.y, q.r, 0.6); ink(INK, 1.6); G.stroke(); }
      else if (q.k === 'star') {
        G.globalAlpha = 1; G.beginPath();
        for (var i = 0; i < 6; i++) { var an = (q.a != null ? q.a : S.turrets[0].aim) + i * Math.PI / 3; L(q.x + Math.cos(an) * 2, q.y + Math.sin(an) * 2, q.x + Math.cos(an) * 7, q.y + Math.sin(an) * 7, 0.5); }
        ink(INK, 2); G.stroke();
      } else if (q.k === 'deflate') { G.beginPath(); SP([q.x - 14, q.y, q.x - 8, q.y - 6, q.x - 2, q.y - 2, q.x + 4, q.y - 7, q.x + 10, q.y - 2, q.x + 15, q.y], false, 0.5); G.fillStyle = RED_FILL; G.fill(); ink(RED, 1.8); G.stroke(); }
      else if (q.k === 'tink') { G.beginPath(); L(q.x, q.y, q.x + 6, q.y - 5, 0.4); L(q.x, q.y, q.x + 7, q.y + 2, 0.4); L(q.x, q.y, q.x - 6, q.y - 6, 0.4); L(q.x, q.y, q.x - 5, q.y + 3, 0.4); ink(q.c === HAT ? '#d29a00' : q.c, 2); G.stroke(); }
      else if (q.k === 'ring') { G.beginPath(); Ci(q.x, q.y, 8 + (1 - a) * 24, 0.6); ink(BLUE, 2.4); G.stroke(); }
      else if (q.k === 'scrap') {
        // A scrap of torn paper.
        G.translate(q.x, q.y); G.rotate(q.rot); G.beginPath(); G.moveTo(-q.s, -q.s * 0.6); G.lineTo(q.s, -q.s * 0.3); G.lineTo(q.s * 0.2, q.s * 0.7); G.closePath();
        G.fillStyle = q.c || PAPER; G.fill(); ink(INK2, 1.1); G.stroke();
      } else if (q.k === 'sticker') { G.globalAlpha = Math.min(1, q.life); drawSticker(q.x, q.y, 1, q.rot, q.flat); }
      else if (q.k === 'plate') { G.globalAlpha = Math.min(1, q.life); drawPlate(q.x, q.y, 1, q.rot, q.flat, q.dents); }
      else if (q.k === 'flash') { if (!REDUCED) { G.globalAlpha = a * a * 0.6; G.fillStyle = '#fffdf2'; G.fillRect(-20, -20, W + 40, H + 40); } }
      else if (q.k === 'flag') {
        // A white flag: surrender.
        var up = (1 - a) * 14; G.globalAlpha = Math.min(1, a * 2);
        G.beginPath(); L(q.x, q.y - up, q.x, q.y - up - 18, 0.2); ink(INK, 1.6); G.stroke();
        G.beginPath(); G.moveTo(q.x, q.y - up - 18); G.lineTo(q.x + 11, q.y - up - 15 + Math.sin(S.t * 9) * 1.5); G.lineTo(q.x, q.y - up - 11); G.closePath();
        G.fillStyle = PAPER; G.fill(); ink(INK, 1.2); G.stroke();
      } else if (q.k === 'pow') {
        // A comic starburst that pops out fast, then fades.
        var out = q.r * (0.55 + 0.45 * Math.min(1, (1 - a) * 5)), spikes = 9;
        G.globalAlpha = Math.min(1, a * 2); G.translate(q.x, q.y); G.rotate(q.rot); G.beginPath();
        for (var j = 0; j < spikes * 2; j++) {
          var an = j / (spikes * 2) * Math.PI * 2, rad = j % 2 ? out * 0.48 : out * (0.82 + 0.18 * ((q.id + j) % 3) / 2);
          if (j) G.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); else G.moveTo(rad, 0);
        }
        G.closePath(); G.globalCompositeOperation = 'multiply'; G.fillStyle = HL.POW; G.fill();
        G.globalCompositeOperation = 'source-over'; ink(INK, 1.4); G.stroke();
      }
      G.restore();
    });
  }
  // A highlighter swipe behind a label, drawn left to right as u goes from 0 to 1, with a slightly uneven edge.
  function highlight(w, size, u, seed) {
    var x0 = -w / 2 - 6, x1 = x0 + (w + 12) * u, top = -size * 0.72, bot = size * 0.12, j = (seed % 5) * 0.4;
    G.save(); G.globalCompositeOperation = 'multiply'; G.fillStyle = HL.COLOR;
    G.beginPath(); G.moveTo(x0, top + 2); G.lineTo(x1, top - 1 + j); G.lineTo(x1 - 2, bot + 1); G.lineTo(x0 + 1, bot - j); G.closePath(); G.fill();
    G.restore();
  }
  function drawTexts() {
    S.texts.slice().sort(function (a, b) { return TEXT.ORDER[a.kind] - TEXT.ORDER[b.kind]; }).forEach(function (q) {
      var age = q.max - q.life, a = Math.min(1, q.life / 0.3), sc = age < 0.1 ? 1 + (0.1 - age) * 5 : 1;
      G.save(); G.globalAlpha = a; G.translate(q.x, q.y); G.rotate(q.rot); G.scale(sc, sc);
      G.font = q.size + 'px ' + HAND; G.textAlign = 'center';
      if (q.hl) highlight(G.measureText(q.s).width, q.size, Math.min(1, (S.t - q.hlT) / HL.SWIPE), q.id || q.size0);
      G.lineWidth = 4; G.lineJoin = 'round'; G.strokeStyle = PAPER; G.strokeText(q.s, 0, 0);
      G.fillStyle = q.color; G.fillText(q.s, 0, 0);
      G.restore();
    });
  }
  // Only this device's barrel gets the guide.
  function drawAimGuide() {
    var t = gun(), c = Math.cos(t.aim), s = Math.sin(t.aim);
    G.save(); G.setLineDash([2, 8]);
    G.beginPath(); G.moveTo(t.x + c * 40, TUR.y + s * 40); G.lineTo(t.x + c * 125, TUR.y + s * 125);
    ink('rgba(46,46,51,0.28)', 2); G.stroke();
    G.restore();
  }
  function drawHint() {
    G.save(); G.globalAlpha = 0.6 + 0.3 * Math.sin(S.t * 4);
    G.fillStyle = INK; G.textAlign = 'center'; G.font = '19px ' + HAND;
    // Over the first mat, whichever side it's on.
    var m = function (x) { return S.matRight ? W - x : x; };
    G.fillText('pop his chute', m(80), 468); G.fillText('over the mat!', m(80), 490);
    G.setLineDash([2, 6]); G.beginPath(); G.moveTo(m(64), 538); G.lineTo(m(58), 580); ink(INK, 2); G.stroke(); G.setLineDash([]);
    G.beginPath(); G.moveTo(m(52), 573); G.lineTo(m(58), 582); G.lineTo(m(64), 573); G.stroke();
    G.restore();
  }
  // The squad row doubles as a health readout: a bar under each figure, wounded crew slouch with a bandage, and
  // badly hurt crew droop further, fade and get a red cross. Figures are drawn near field size so roles read.
  var MINI = 0.95;
  function miniFig(x, y, r, i, inBed) {
    pen(7000 + i);
    G.save(); G.translate(x, y); G.scale(MINI, MINI);
    if (r && (r.down || inBed)) {
      // Wounded: flat on the ground with a red cross. In the tent: resting on a cot, bandaged.
      G.save(); G.globalAlpha = 0.6; G.translate(0, 33); G.rotate(-Math.PI / 2 + 0.12); G.translate(0, -33);
      stick(0, 12, [-3, 21, 3, 21, -5, 33, 5, 33], BLUE, 2.4); G.restore();
      if (inBed) { G.beginPath(); L(-14, 38, 14, 38, 0.2); L(-13, 38, -13, 42, 0.1); L(13, 38, 13, 42, 0.1); ink(INK, 2); G.stroke(); }
      G.beginPath(); L(-3, 20, 3, 20); L(0, 17, 0, 23); ink(RED, 2.4); G.stroke();
    } else if (r) {
      var h = clamp(r.hp / crewMax(r), 0, 1), state = h < 0.4 ? 2 : h < 0.7 ? 1 : 0;
      var col = r.hurt > 0 && Math.floor(S.t * 18) % 2 ? RED : hud.BLUE;
      G.fillStyle = 'rgba(46,46,51,0.15)'; G.fillRect(-8, 37, 16, 3);
      G.fillStyle = h < 0.4 ? RED : BLUE; G.fillRect(-8, 37, 16 * h, 3);
      G.save();
      if (state) { G.translate(0, 33); G.rotate(state === 2 ? 0.4 : 0.2); G.translate(0, -33); }
      if (state === 2) G.globalAlpha = 0.5;
      var pose = state ? [-3, 21, 3, 21, -5, 33, 5, 33] : [-6, 19, 6, 19, -5, 33, 5, 33];
      if (r.type === 'bazooka') tube(-8, 18, 7, 5);
      stick(0, 0, pose, col, 2.6);
      if (r.type === 'rifle' || r.type === 'sniper') { G.beginPath(); L(-7, 17, 8, 7, 0.3); ink(hud.INK, 2.2); G.stroke(); }
      if (r.type === 'sniper') { G.beginPath(); SP([-7, -4, -3, -10, 7, -7, 6, -3], true, 0.3); G.fillStyle = hud.INK; G.fill(); }
      if (r.type === 'engineer') hat(0, 0);
      if (r.type === 'medic') medicHelmet(0, 0);
      if (state) { G.beginPath(); L(-5.5, -2, 5.5, 1, 0.2); ink(INK, 4.4); G.stroke(); ink(PAPER, 2.4); G.stroke(); }
      chevrons(-8, 9, r.rank || 0);
      G.restore();
      if (state === 2) { G.beginPath(); L(9, 2, 15, 2); L(12, -1, 12, 5); ink(RED, 2.6); G.stroke(); }
    } else {
      G.setLineDash([2, 4]); stick(0, 0, [-6, 19, 6, 19, -5, 33, 5, 33], EMPTY, 2.2); G.setLineDash([]);
    }
    G.restore();
  }
  // Calls held on the radio, drawn under the score so they're in sight on any screen (the buttons beside pause are
  // easy to miss on a desktop). Click or tap one to make the call; B and C still work, and the key shows where there's
  // a keyboard. A call already flying is greyed.
  var CALL_CHIP = { X: 58, Y: 66, W: 44, H: 24, GAP: 3 }; // clear of the combo counter in the middle
  var KEYS_SHOWN = !(window.matchMedia && window.matchMedia('(hover: none)').matches);
  function callChips() {
    var out = [], x = CALL_CHIP.X;
    [['bomber', 'strike', 'B', S.calls.bomber, !!S.strike], ['fighter', 'fighter', 'C', S.calls.fighter, !!S.fighter]].forEach(function (c) {
      if (c[3] <= 0) return;
      out.push({ kind: c[0], icon: c[1], key: c[2], n: c[3], busy: c[4], x: x, y: CALL_CHIP.Y });
      x += CALL_CHIP.W + CALL_CHIP.GAP;
    });
    return out;
  }
  function callChipAt(p) {
    return callChips().find(function (c) { return p.x >= c.x - 4 && p.x <= c.x + CALL_CHIP.W + 4 && p.y >= c.y - 4 && p.y <= c.y + CALL_CHIP.H + 4; }) || null;
  }
  function drawCallChips() {
    if (S.mode !== 'play' && S.mode !== 'paused') return;
    callChips().forEach(function (c) {
      var x = c.x, y = c.y, cw = CALL_CHIP.W, ch = CALL_CHIP.H;
      G.save(); G.globalAlpha = c.busy ? 0.4 : 1; pen(c.icon.length * 77);
      G.fillStyle = PAPER; G.fillRect(x, y, cw, ch); G.fillStyle = 'rgba(47,111,220,0.1)'; G.fillRect(x, y, cw, ch);
      G.beginPath(); L(x, y, x + cw, y, 0.3); L(x + cw, y, x + cw, y + ch, 0.3); L(x + cw, y + ch, x, y + ch, 0.3); L(x, y + ch, x, y, 0.3); ink(BLUE, 1.6); G.stroke();
      G.save(); G.translate(x + 1, y + 1); G.scale(22 / 44, 22 / 44); ICONS[c.icon](G); G.restore();
      G.fillStyle = BLUE; G.font = '14px ' + HAND; G.textAlign = 'left'; G.fillText((KEYS_SHOWN ? c.key : '') + '×' + c.n, x + 23, y + 17);
      G.restore();
    });
  }
  // On the night raid the whole page goes dark, so the HUD is written in chalk (sky.js drawNight).
  var CHALK = { INK: '#f1ebdd', INK2: '#c8cede', TAGS: '#c8cede', BLUE: '#93b8ff', RED: '#ff9484' };
  var hud = { INK: INK, INK2: INK2, TAGS: '#56606b', BLUE: BLUE, RED: RED };
  var HUD_GAP = 8;
  function drawHUD() {
    pen(4242);
    var chalk = S.night > 0.5 && !S.smoke, c = chalk ? CHALK : { INK: INK, INK2: INK2, TAGS: '#56606b', BLUE: BLUE, RED: RED };
    hud = c;
    G.save();
    G.textAlign = 'left';
    if (S.mode !== 'title') {
      G.fillStyle = c.INK2; G.font = '16px ' + HAND; G.fillText('score', 58, 28);
      // Co-op: each player's own points beside the label, in their barrel's color.
      if (S.players) {
        var px = 100, ps = S.players.map(function (p) { return p.score.toLocaleString('en-US'); });
        G.font = '15px ' + HAND;
        var pw = G.measureText(ps.join(' · ')).width;
        if (pw > 84) G.font = Math.max(10, Math.floor(15 * 84 / pw)) + 'px ' + HAND;
        G.fillStyle = c.BLUE; G.fillText(ps[0], px, 28); px += G.measureText(ps[0]).width;
        G.fillStyle = c.INK2; G.fillText(' · ', px, 28); px += G.measureText(' · ').width;
        G.fillStyle = c.RED; G.fillText(ps[1], px, 28);
      }
      // A long score shrinks to stop short of the wave label (round 14: six digits ran into "wave 10").
      var sc = S.score.toLocaleString('en-US');
      G.font = '26px ' + HAND; var room = 200 - G.measureText('wave ' + Math.max(1, S.wave)).width / 2 - HUD_GAP - 58;
      G.font = '34px ' + HAND; var sw = G.measureText(sc).width;
      if (sw > room) G.font = Math.max(16, Math.floor(34 * room / sw)) + 'px ' + HAND;
      G.fillStyle = c.INK; G.fillText(sc, 58, 58);
      drawCallChips(); pen(4242);
      G.fillStyle = c.TAGS; G.font = '16px ' + HAND; G.fillText('dog tags', 280, 28);
      dogTag(TAG_HUD.x, TAG_HUD.y, -0.25, 1.3);
      var lose = S.tagLoss > 0, jig = lose ? Math.sin(S.t * 60) * 2.5 * Math.min(1, S.tagLoss) : 0;
      G.save(); G.translate(302 + jig, 58); var pulse = 1 + (S.tagPulse || 0) * 0.9; G.scale(pulse, pulse);
      G.fillStyle = lose ? c.RED : c.TAGS; G.font = '34px ' + HAND; G.textAlign = 'left'; G.fillText(String(S.coins), 0, 0); G.restore();
      if (lose && S.tagLost) { G.save(); G.globalAlpha = Math.min(1, S.tagLoss); G.fillStyle = c.RED; G.font = '22px ' + HAND; G.textAlign = 'left'; G.fillText('-' + S.tagLost, 304, 84); G.restore(); }
      G.fillStyle = c.INK;
      G.textAlign = 'center'; G.font = '26px ' + HAND; G.fillText('wave ' + Math.max(1, S.wave), 200, 50);
      // Veteran wears its three stripes over the wave.
      if (S.level === 'veteran') { G.beginPath(); for (var vs = 0; vs < 3; vs++) { L(191, 20 + vs * 5, 200, 15 + vs * 5, 0.2); L(200, 15 + vs * 5, 209, 20 + vs * 5, 0.2); } ink(c.BLUE, 2.2); G.stroke(); }
      // In co-op the combo shown is this player's own.
      var cb = S.players ? S.players[me] || S : S;
      if (cb.combo >= 2 && cb.comboT > 0) {
        G.fillStyle = c.BLUE; G.font = '22px ' + HAND; G.fillText('combo x' + Math.min(5, cb.combo), 200, 76);
        var cw = 70 * (cb.comboT / 1.4);
        G.beginPath(); L(200 - cw / 2, 82, 200 + cw / 2, 82, 0.4); ink(c.BLUE, 2.4); G.stroke();
      } else if (S.endless) { G.fillStyle = c.BLUE; G.font = '17px ' + HAND; G.fillText('endless', 200, 73); }
      else if (S.wave === DREAD.WAVE) { G.fillStyle = c.RED; G.font = '17px ' + HAND; G.fillText('final wave', 200, 73); }
    }
    // The title uses the bottom of the page for Start and the chips.
    if (S.mode === 'title') { G.restore(); hud = { INK: INK, INK2: INK2, TAGS: '#56606b', BLUE: BLUE, RED: RED }; return; }
    var y1 = 648, bx = 112, bw = 186, hp = Math.max(0, S.wallHP);
    G.textAlign = 'left'; G.fillStyle = c.INK; G.font = '21px ' + HAND; G.fillText('wall', 58, y1 + 7);
    G.fillStyle = hp < 30 ? 'rgba(200,67,58,0.45)' : chalk ? 'rgba(147,184,255,0.55)' : 'rgba(47,111,220,0.4)';
    G.fillRect(bx + 2, y1 - 8, (bw - 4) * hp / S.mods.maxHP, 16);
    G.beginPath(); L(bx, y1 - 10, bx + bw, y1 - 10, 0.5); L(bx + bw, y1 - 10, bx + bw, y1 + 10, 0.5); L(bx + bw, y1 + 10, bx, y1 + 10, 0.5); L(bx, y1 + 10, bx, y1 - 10, 0.5);
    ink(c.INK, 2.4); G.stroke();
    G.fillStyle = c.INK2; G.font = '17px ' + HAND; G.fillText(Math.ceil(hp) + '/' + S.mods.maxHP, bx + bw + 10, y1 + 6);
    var y2 = 690;
    G.fillStyle = c.INK; G.font = '21px ' + HAND; G.fillText('squad', 58, y2 + 6);
    var live = S.recruits.filter(function (r) { return !r.dead; }).sort(function (a, b) { return a.slot - b.slot; });
    if (S.bed) live.push(S.bed.r);
    for (var i = 0; i < S.mods.slots; i++) miniFig(124 + i * 24, y2 - 20, live[i], i, !!(S.bed && live[i] === S.bed.r));
    G.fillStyle = c.INK2; G.font = '17px ' + HAND; G.textAlign = 'left'; G.fillText(live.length + "/" + S.mods.slots, bx + bw + 10, y2 + 6);
    G.restore();
    hud = { INK: INK, INK2: INK2, TAGS: '#56606b', BLUE: BLUE, RED: RED };
  }
  function drawBanner() {
    var b = S.banner, a = Math.min(1, b.t / 0.25, (b.dur - b.t) / 0.4);
    if (a <= 0) return;
    G.save(); G.globalAlpha = a; G.textAlign = 'center';
    G.font = '700 ' + (b.s.length > 8 ? 46 : 56) + 'px ' + DISPLAY;
    G.lineWidth = 6; G.lineJoin = 'round'; G.strokeStyle = PAPER; G.strokeText(b.s, 200, 300);
    G.fillStyle = INK; G.fillText(b.s, 200, 300);
    pen(31337); G.beginPath(); SP([120, 316, 160, 320, 200, 314, 240, 320, 280, 315], false, 0.8); ink(BLUE, 3); G.stroke();
    if (b.sub) { G.font = '24px ' + HAND; G.strokeStyle = PAPER; G.lineWidth = 4; G.strokeText(b.sub, 200, 348); G.fillStyle = BLUE; G.fillText(b.sub, 200, 348); }
    G.restore();
  }

  function render() {
    G = ctx;
    ctx.setTransform(K, 0, 0, K, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var sx = 0, sy = 0;
    if (S.shake > 0 && !REDUCED) { sx = rr(-1, 1) * S.shake * 8; sy = rr(-1, 1) * S.shake * 8; }
    ctx.save(); ctx.translate(sx, sy);
    ctx.drawImage(bg, 0, 0, W, H);
    ctx.drawImage(dc, 0, 0, W, H);
    drawGround();
    SKY.drawBehind();
    drawTease();
    // The Dreadnought's name and gauges sit behind it, so the ship passes in front of them.
    drawDreadBar();
    if (S.wreck) drawDread(S.wreck);
    S.planes.forEach(function (p) { if (p.kind === 'dread') drawDread(p); });
    // The mats in front of the Dreadnought's wreck, so its captain can still be caught on one (campaign.js).
    activeTramps().forEach(function (tr, i) { if (i) sketched('tramp', [tr.x1 - 6, tr.y - 6, tr.x2 + 6, GROUND], 'right', function () { drawTramp(tr, i); }); else drawTramp(tr, i); });
    S.planes.forEach(function (p) { if (p.kind === 'zeppelin') drawZeppelin(p); });
    S.planes.forEach(function (p) { if (SKY.KINDS[p.kind]) SKY.drawPlane(p); else if (p.kind !== 'zeppelin' && p.kind !== 'dread') drawPlane(p); });
    SKY.draw();
    S.bombs.forEach(drawBomb);
    S.troopers.forEach(function (t) { if (!t.dead) drawTrooper(t); });
    S.tanks.forEach(drawTank);
    drawStrike();
    drawFighter();
    drawRadio();
    if (S.mode === 'dying' || S.mode === 'over') { drawRubble(); if (S.mods.flag) drawFallenFlag(); }
    else {
      if (S.mods.flag) sketchReveal(S.waveState === 'flag' ? clamp(S.flagT / FLAG.SKETCH, 0, 1) : 1, [FLAG.X - FLAG.W - 6, GROUND - FLAG.TALL - 8, FLAG.X + 6, GROUND], 'up', drawFlagpole);
      sketched('auto', [SENTRY.x - 12, SENTRY.y - 16, SENTRY.x + 14, GROUND], 'up', drawSentry);
      drawBunker(); drawDefenses();
      sketched('hospital', [SQUAD.TENT.x - SQUAD.TENT.hw, GROUND - SQUAD.TENT.h - 10, SQUAD.TENT.x + SQUAD.TENT.hw, GROUND], 'up', drawTent);
    }
    S.recruits.forEach(function (r) { if (!r.dead) sketched('r' + r.id, [r.x - 12, GROUND - 46, r.x + 12, GROUND + 6], 'up', function () { drawRecruit(r); }); });
    SKY.drawMarks();
    drawBullets();
    drawCourier();
    drawBossBar();
    drawParts();
    SKY.drawNight();
    if (S.mode === 'play') drawAimGuide();
    if (S.hint && S.mode === 'play') drawHint();
    drawTexts();
    drawBubbles();
    ctx.restore();
    drawHUD();
    if (S.banner) drawBanner();
  }

  // ---------- flow ----------
  var titleScreen = document.getElementById('titleScreen'), pauseScreen = document.getElementById('pauseScreen'), overScreen = document.getElementById('overScreen');
  var shopScreen = document.getElementById('shopScreen'), winScreen = document.getElementById('winScreen');
  var pauseBtn = document.getElementById('pauseBtn'), muteBtn = document.getElementById('muteBtn'), strikeBtn = document.getElementById('strikeBtn'), fighterBtn = document.getElementById('fighterBtn');

  function titleScene() {
    demoScene(0);
    showLevel();
    titleScreen.hidden = false; pauseScreen.hidden = true; overScreen.hidden = true; winScreen.hidden = true; pauseBtn.hidden = true;
    facingLoaded = false;
    fit();
  }
  // The level picked on the title (LEVELS): ticked on the form, its record on the rubber stamp ("Best 446,661 / Won
  // 2×", with the best wave once endless has gone past 20), and its board on the notebook's facing page. Veteran wears
  // a "new" tag until it's been picked once on this device.
  var levelBtns = Array.prototype.slice.call(document.querySelectorAll('.t-rank'));
  function showLevel() {
    var L = LEVELS[level], wins = load(L.KEYS.wins, 0), bestWave = load(L.KEYS.wave, 0);
    best = load(L.KEYS.best, 0);
    levelBtns.forEach(function (b) { b.setAttribute('aria-checked', b.dataset.level === level ? 'true' : 'false'); b.tabIndex = b.dataset.level === level ? 0 : -1; });
    document.getElementById('vetNew').hidden = level === 'veteran' || !!load('stickarmy.veteran.seen', false);
    var bl = document.getElementById('bestLine'), wl = document.getElementById('winLine');
    bl.hidden = !(best > 0);
    bl.textContent = 'Best ' + Number(best).toLocaleString('en-US');
    wl.textContent = wins ? 'Won ' + wins + '×' + (bestWave > DREAD.WAVE ? ' · wave ' + bestWave : '') : ''; wl.hidden = !wins;
    document.getElementById('recordLine').hidden = bl.hidden && wl.hidden;
  }
  function pickLevel(name) {
    if (!LEVELS[name] || S.mode !== 'title') return;
    var changed = name !== level;
    level = name; S.level = name; save('stickarmy.level', name);
    if (name === 'veteran') save('stickarmy.veteran.seen', true);
    showLevel();
    // The facing page's board follows the pick.
    if (changed) { facingLoaded = false; fit(); }
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
  world.levelBoard = function (name) { return LEVELS[name || (S.mode === 'title' ? level : S.level)].BOARD; };
  world.levelName = function () { return S.mode === 'title' ? level : S.level; };
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
  function updateDemo(dt) {
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
    sound.init();
    // A run seed: forced by a harness, fixed by #seed=, or random.
    var fixed = RUN.force != null ? RUN.force : hashSeed();
    // The online board: practice runs (a fixed seed, the tuning panel) never get a token, so they can't be saved.
    // Co-op runs aren't on the boards (coop.md).
    var token = LBOARD.begin(fixed != null || hashTokens().indexOf('tune') >= 0 || RUN.players > 1);
    // Play stats: a run still open (a restart from pause) reports as quit before reset() clears it.
    if (window.PlayStats) statsRun = PlayStats.start('stick-army', { board: world.levelBoard(), token: token || undefined, progress: runReport });
    seedRun(fixed != null ? fixed : Math.floor(Math.random() * 4294967296));
    reset();
    S.mode = 'play'; S.hint = true;
    sound.ambience(ambienceState());
    startWave(1);
    titleScreen.hidden = true; pauseScreen.hidden = true; overScreen.hidden = true; winScreen.hidden = true; shopScreen.hidden = true; pauseBtn.hidden = false;
    fit();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // The named squad for the pause card: veterans by rank with their waves, a rookie count, and who's in the tent.
  // bare: without the "Squad: " lead (the shop's Squad section has its own heading).
  // short: names and ranks only (the pause card), without waves and kills.
  function squadLine(bare, short) {
    var vets = S.recruits.filter(function (r) { return !r.dead && r.name; }).sort(function (a, b) { return b.rank - a.rank || b.waves - a.waves; });
    var rookies = S.recruits.filter(function (r) { return !r.dead && !r.name; }).length, parts = vets.map(function (r) { return short ? rankName(r) : SQUAD.record({ name: rankName(r), waves: r.waves, kills: r.kills }); });
    if (rookies) parts.push(rookies + (rookies > 1 ? ' rookies' : ' rookie'));
    var line = parts.length ? (bare ? '' : 'Squad: ') + parts.join(', ') + '.' : '';
    if (S.bed) line += (line ? ' ' : '') + 'In the tent: ' + (S.bed.r.name ? rankName(S.bed.r) : 'a rookie') + '.';
    return line;
  }
  // The squad as it stood, drawn like the HUD's squad row onto a card's canvas (the game-over card, the shop).
  // slots: every squad slot, the empty ones dotted, as in the HUD (the shop).
  function drawSquadRow(canvas, slots) {
    var live = S.recruits.filter(function (r) { return !r.dead; }).sort(function (a, b) { return a.slot - b.slot; });
    if (S.bed) live.push(S.bed.r);
    var n = slots ? Math.max(S.mods.slots, live.length) : live.length;
    if (!n) return false;
    var k = 2, cw = 24 * n + 12, g = canvas.getContext('2d'), previous = G;
    canvas.width = cw * k; canvas.height = 52 * k; canvas.style.width = cw + 'px';
    G = g; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, cw, 52);
    // Low enough that hard hats and helmets clear the top edge.
    try { for (var i = 0; i < n; i++) miniFig(12 + i * 24, 11, live[i], i, !!(S.bed && live[i] === S.bed.r)); } finally { G = previous; }
    return true;
  }
  function togglePause() {
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
  function fillPause() {
    document.getElementById('pauseTime').textContent = 'Wave ' + S.wave + ' · ' + clock(S.played) + ' played';
    // The kit as icons (as in the shop) and the squad as the HUD draws it, with a short line of names.
    var kit = document.getElementById('pauseKit');
    kit.hidden = !renderKit(kit, false);
    var row = document.getElementById('pauseSquadRow'), squad = document.getElementById('pauseSquad'), line = squadLine(false, true);
    row.hidden = !drawSquadRow(row);
    squad.textContent = line; squad.hidden = !line;
  }
  function die() {
    emit('game_over', { wave: S.wave, score: S.score, cause: S.lastHit || 'unknown' });
    S.mode = 'dying'; S.wallHP = 0; S.dieT = 1.6; S.turrets.forEach(function (t) { t.firing = false; });
    explode(BK.x, BK.top + 10, 46, 'final');
    S.shake = 0.8;
    pauseBtn.hidden = true;
    sound.play('over');
  }
  // What brought the wall down: the last source to hurt it (hurtWall).
  var OVER_CAUSE = { bomb: 'A bomb brought the wall down.', lander: 'Troopers at the wall broke through.', sniper: 'Sniper fire chipped the wall away.', tank: 'Tank shells knocked the wall down.', dreadnought: "The Dreadnought's guns brought the wall down.",
    dive: "A dive bomber's bomb brought the wall down.", balloon: "A balloon's bomb brought the wall down.", heli: 'Helicopter fire chipped the wall away.',
    heavy: "A heavy bomber's carpet brought the wall down." };
  // The Red Cross line on an end card: "3 of 8 got through", and the bonus when every one did.
  function showRedCross(prefix) {
    var rc = SKY.redCrossRecord(), dd = document.getElementById(prefix + 'Red'), bonus = document.getElementById(prefix + 'Perfect');
    dd.textContent = rc.safe + ' of ' + rc.flew;
    dd.hidden = document.getElementById(prefix + 'RedLabel').hidden = !rc.flew;
    bonus.textContent = 'Red Cross: all safe! +' + SKY.MEDEVAC.PERFECT.toLocaleString('en-US');
    bonus.hidden = !rc.perfect;
  }
  world.showRedCross = showRedCross;
  function showOver() {
    S.mode = 'over';
    showRedCross('st');
    if (statsRun) { PlayStats.end(statsRun, runReport()); statsRun = null; }
    // Co-op runs leave this device's records alone: different difficulty, two guns (coop.md).
    var isBest = !S.players && S.score > best;
    if (isBest) { best = S.score; save(lv().KEYS.best, best); }
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
    lost.textContent = S.fallen.length ? 'Fallen: ' + S.fallen.map(SQUAD.record).join(', ') + '.' : '';
    lost.hidden = !S.fallen.length;
    document.getElementById('overCause').textContent = cause || '';
    document.getElementById('overCause').hidden = !cause;
    document.getElementById('stBest').textContent = Number(best).toLocaleString('en-US');
    overScreen.hidden = false;
    document.getElementById('againBtn').focus({ preventScroll: true });
    LBOARD.finish(overScreen.querySelector('.card'), false);
  }
  // What a run reports to play stats (site/assets/stats.js), at game over or when the page is left mid-run.
  // The crew count includes a recruit in the field hospital (S.bed), as the roll call does.
  // A run counts as won once S.won is set (the campaign's victory); a winner who keeps going reports again at the end.
  var statsRun = null;
  function runReport() {
    var st = {
      wave: S.wave, kills: S.stats.kills, captured: S.stats.captured, popped: S.stats.popped, planes: S.stats.planes,
      zeppelins: S.stats.zeppelins, tanks: S.stats.tanks, wall_damage: Math.round(S.stats.wallDamage), shots: S.stats.shots,
      crew: S.recruits.filter(function (r) { return !r.dead; }).length + (S.bed ? 1 : 0), fallen: S.fallen.length, tags: S.coins
    };
    if ((S.mode === 'over' || S.mode === 'dying') && S.lastHit) st.cause = S.lastHit;
    if (S.won) st.won_at = S.wonAt;
    if (S.captain) st.captain = S.captain;
    if (S.endless) st.endless = true;
    if (S.level !== 'soldier') st.level = S.level;
    // Co-op: reported once, by the host, with each player's points and planes.
    if (S.players) { st.coop = true; st.host_score = S.players[0].score; st.guest_score = S.players[1].score; st.host_planes = S.players[0].planes; st.guest_planes = S.players[1].planes; }
    return { score: S.score, time_ms: Math.round(S.played * 1000), won: !!S.won, input: S.input, stats: st };
  }
  // A win is reported as soon as the victory card shows. The handle stays, so a winner who keeps going is reported
  // again if the page is hidden mid-run, and once more at the final game over.
  function reportWin() { if (statsRun) PlayStats.end(statsRun, runReport()); }
  document.getElementById('keepBtn').addEventListener('click', function () { if (statsRun && S.endless) PlayStats.resume(statsRun); });
  function updateMuteBtn() {
    muteBtn.setAttribute('aria-pressed', sound.muted ? 'true' : 'false');
    muteBtn.setAttribute('aria-label', sound.muted ? 'Unmute sound' : 'Mute sound');
    // The icons are SVG elements, which have no hidden property, so the attribute is set directly.
    document.getElementById('icoSound').toggleAttribute('hidden', sound.muted);
    document.getElementById('icoMuted').toggleAttribute('hidden', !sound.muted);
    titleSoundBtn.textContent = sound.muted ? 'Sound off' : 'Sound on';
    titleSoundBtn.setAttribute('aria-pressed', sound.muted ? 'false' : 'true');
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

  function clearInput() { keys.left = keys.right = keys.fire = false; if (S.turrets) S.turrets.forEach(function (t) { t.firing = false; }); }

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
  cv.addEventListener('pointerdown', function (e) {
    if (S.mode !== 'play') return;
    sound.init();
    // A call in the HUD makes the call instead of firing.
    var chip = callChipAt(toLogical(e));
    if (chip) { if (chip.kind === 'bomber') callStrike(); else callFighter(); e.preventDefault(); return; }
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    aimAt(toLogical(e)); gun().firing = true;
    // Touch (or a pen) on the page marks the run as touch on the board and in play stats; menus don't count.
    if (e.pointerType === 'touch' || e.pointerType === 'pen') { S.input = 'touch'; LBOARD.touched(); }
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    if (S.mode !== 'play') return;
    if (e.pointerType === 'mouse' || gun().firing) aimAt(toLogical(e));
  });
  function stopFire() { gun().firing = false; }
  cv.addEventListener('pointerup', stopFire);
  cv.addEventListener('pointercancel', stopFire);
  cv.addEventListener('lostpointercapture', stopFire);
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  window.addEventListener('keydown', function (e) {
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
    else if (k === ' ' || k === 'Enter' || k === 'ArrowUp' || k === 'w' || k === 'W') { if (S.mode === 'play') { keys.fire = true; sound.init(); e.preventDefault(); } }
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
  window.addEventListener('blur', function () { keys.left = keys.right = keys.fire = false; if (S.turrets) gun().firing = false; });
  // A co-op guest leaving the page doesn't pause the host's game; its barrel just goes quiet (coop.js).
  document.addEventListener('visibilitychange', function () { if (document.hidden && S.mode === 'play' && !(COOP && COOP.guest)) togglePause(); });
  window.addEventListener('resize', fit);

  // In co-op the next wave waits for both players' Ready (coop.js).
  document.getElementById('continueBtn').addEventListener('click', function () { if (COOP && COOP.ready()) return; continueWave(); });
  document.getElementById('undoBtn').addEventListener('click', function () { SHOP.undo(); });
  document.getElementById('startBtn').addEventListener('click', newGame);
  document.getElementById('againBtn').addEventListener('click', newGame);
  document.getElementById('winAgainBtn').addEventListener('click', newGame);
  document.getElementById('restartBtn').addEventListener('click', newGame);
  document.getElementById('resumeBtn').addEventListener('click', togglePause);
  pauseBtn.addEventListener('click', togglePause);
  strikeBtn.addEventListener('click', function () { callStrike(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  fighterBtn.addEventListener('click', function () { callFighter(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
  // A call button shows during play while the radio holds that call, with the count; it waits while one is flying.
  // Only touches the DOM when something changed.
  var callsShown = '';
  function syncCallBtns() {
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
  function wakeSound() { if (S.mode === 'title' && !sound.muted) sound.init(); }
  document.addEventListener('pointerdown', wakeSound, true);
  document.addEventListener('keydown', wakeSound, true);
  // The menus' buttons make a sound (audio.js click and press, heard on the title too); the shop's have their own.
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (!b || b.disabled || b.closest('#shopScreen .shop-stock, .hud-btns') || b.id === 'titleSoundBtn') return;
    sound.play(b.classList.contains('btn') ? 'press' : 'click');
  }, true);
  // The title's chips do what the buttons around the page do.
  var titleSoundBtn = document.getElementById('titleSoundBtn');
  titleSoundBtn.addEventListener('click', function () { muteBtn.click(); if (!sound.muted) sound.play('click'); titleSoundBtn.focus({ preventScroll: true }); });
  document.getElementById('titleFullBtn').addEventListener('click', function () { fullBtn.click(); });
  var titleScoresBtn = document.getElementById('titleScoresBtn');
  titleScoresBtn.hidden = !LBOARD.available;
  titleScoresBtn.addEventListener('click', LBOARD.openScores);
  muteBtn.addEventListener('click', function () {
    sound.muted = !sound.muted; save('stickarmy.muted', sound.muted); updateMuteBtn();
    if (!sound.muted) sound.init();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  });

  // ---------- loop ----------
  var last = performance.now(), lastAmbience = 0;
  // What the ambience layer needs: whether a wave is live, where the planes are, and whether the wall is in trouble.
  function ambienceState() {
    return {
      active: S.mode === 'play' && !document.hidden,
      title: S.mode === 'title' && !document.hidden,
      planes: S.planes.filter(function (p) { return p.state === 'fly' && p.kind !== 'balloon' && p.x > -40 && p.x < W + 40; }).map(function (p) { return { x: p.x, dir: p.dir, kind: p.kind }; }),
      wave: S.waveState === 'active',
      number: S.wave,
      wallLow: S.wallHP < S.mods.maxHP * 0.3,
      dread: CAMPAIGN.dreadMusic() || teaserMusic()
    };
  }
  // The final wave's teaser: the Dreadnought's march, thin, until the decoy is down; then a hush until the real one.
  function teaserMusic() {
    var sp = S.spawn;
    if (!sp || !sp.teaser) return null;
    return sp.decoyDone ? 'hush' : 'teaser';
  }
  // Time played counts waves and the shop, not pauses or the title. It's shown on the pause and game-over cards
  // and never feeds the simulation.
  function notePlayed(dt) { if (S.mode === 'play' || S.mode === 'shop' || S.mode === 'dying') S.played += dt; }
  function clock(sec) {
    var t = Math.floor(sec), h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s2 = t % 60;
    return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (s2 < 10 ? '0' : '') + s2;
  }
  function loop(now) {
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    noteFrame(now - last);
    last = now;
    boil = REDUCED ? 0 : Math.floor(now / 130) % 3;
    notePlayed(dt);
    // A co-op guest draws the host's field instead of running the game (coop.js).
    if (COOP && COOP.guest && COOP.guestFrame(dt, now)) { /* drawn from the host's field */ }
    else if (S.mode === 'play' || S.mode === 'dying') update(dt);
    else if (S.mode === 'title' && !document.hidden) { update(dt); updateDemo(dt); }
    if (COOP) { if (COOP.host) COOP.hostTick(now); COOP.tick(now); }
    render();
    syncCallBtns();
    if (now - lastAmbience > 80) { lastAmbience = now; sound.ambience(ambienceState()); }
    requestAnimationFrame(loop);
  }

  function start(data) {
    data = data || {};
    level = LEVELS[load('stickarmy.level', 'soldier')] ? load('stickarmy.level', 'soldier') : 'soldier';
    sound.muted = typeof data.muted === 'boolean' ? data.muted : load('stickarmy.muted', false);
    fit();
    titleScene();
    updateMuteBtn();
    requestAnimationFrame(loop);
  }

  start();
  if (COOP) COOP.init();
  // The tuning UI and its bridge exist only in opt-in development mode.
  if (hashTokens().indexOf('tune') >= 0) {
    window.StickArmyTune = {
      getValues: function () {
        return Object.assign({ CAPTURE_SPEED: CAPTURE_SPEED, RIFLE_COOLDOWN: ENEMIES.rifle.cooldown, RIFLE_SPREAD: ENEMIES.rifle.spread }, BALANCE);
      },
      setValue: function (key, value) {
        if (!Number.isFinite(value)) return;
        var before = S.spawn && S.spawn.cfg;
        if (key === 'CAPTURE_SPEED') CAPTURE_SPEED = value;
        else if (key === 'RIFLE_COOLDOWN') { ENEMIES.rifle.cooldown = value; S.recruits.forEach(function (r) { if (r.type === 'rifle') r.cd = Math.min(r.cd, value); }); }
        else if (key === 'RIFLE_SPREAD') ENEMIES.rifle.spread = value;
        else if (Object.prototype.hasOwnProperty.call(BALANCE, key)) BALANCE[key] = value;
        else return;
        if (key === 'BOSS_HP_PER_WAVE') S.planes.forEach(function (p) {
          if (p.kind !== 'zeppelin' || p.state !== 'fly') return;
          var left = p.hp / p.maxHp; p.maxHp = Math.round(zeppelinHP(S.wave) * (p.twin ? ZEP.TWIN_HP : 1)); p.hp = Math.max(1, left * p.maxHp);
        });
        if (before) {
          var after = waveCfg(Math.max(1, S.wave));
          if (S.waveState === 'active') S.spawn.planes = Math.max(0, S.spawn.planes + after.planes - before.planes);
          S.spawn.cfg = after;
          S.troopers.forEach(function (t) { if (t.state === 'chute') t.fall *= after.fall / before.fall; });
          if (key === 'DROP_CHANCE' || key === 'DROPS_PER_WAVE') {
            S.planes.forEach(function (p) {
              if (p.kind !== 'plane' || p.state !== 'fly' || !p.drops.length) return;
              var count = Math.max(1, Math.min(8, p.drops.length + after.maxDrops - before.maxDrops));
              p.drops = [];
              for (var tries = 0; tries < count * 30 && p.drops.length < count; tries++) {
                var x = pickDropX(p.rng); if ((x - p.x) * p.dir > 0) p.drops.push(x);
              }
              p.drops.sort(function (a, b) { return p.dir * (a - b); });
              p.kits = p.drops.map(function () { return rollTrooper(p.rng); });
            });
          }
        }
      },
      releaseInput: clearInput
    };
    var tuneScript = document.createElement('script');
    tuneScript.src = document.currentScript.getAttribute('data-tune-src') || 'tune.js';
    document.head.appendChild(tuneScript);
  }

})();
