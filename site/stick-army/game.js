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
  // Soldier is Arcade as it is. Veteran (docs/games/stick-army/veteran.md) goes after stacking upgrades: a
  // markup on everything in the shop climbing to PRICE by wave FROM (shop.js markup), PLANES and ARMOR from FROM (waveCfg), a Dreadnought with DREAD times
  // the health (dreadnought.js) and SMOKE times the smoke screen's linger (sky.js), and spread shot's side bullets only
  // grazing it, for GRAZE of the damage (hitTest), so it pays to aim the middle one. Round 19 ("I didn't really even
  // notice any difference ... it is that stuff stacks"): a kit that holds KIT pieces (shop.js), so late in
  // the war buying is choosing what to build, not taking everything. Scoring is the same on both; each has its own board and records
  // (KEYS). A run's level is S.level, from the title's pick (level), which the device remembers.
  var LEVELS = {
    soldier: { NAME: 'Soldier', BOARD: BOARD, PRICE: 1, FROM: Infinity, PLANES: 1, ARMOR: 0, DREAD: 1, SMOKE: 1, GRAZE: 1, KIT: Infinity,
      KEYS: { best: 'stickarmy.best.3', wins: 'stickarmy.wins', wave: 'stickarmy.bestWave' } },
    veteran: { NAME: 'Veteran', BOARD: VETERAN_BOARD, PRICE: 1.33, FROM: 10, PLANES: 1.2, ARMOR: 0.15, DREAD: 1, SMOKE: 1.5, GRAZE: 0.75, KIT: 30,
      KEYS: { best: 'stickarmy.veteran.best', wins: 'stickarmy.veteran.wins', wave: 'stickarmy.veteran.bestWave' } }
  };
  var level = 'soldier';
  // Co-op (coop.md) is harder: two gunners are a lot more firepower, more so once each barrel has its own upgrades.
  // COOP_HARD scales the planes and bombers from MORE[0] on wave 1 to MORE[1] by wave FULL, and the Dreadnought's
  // health by DREAD. Two wallets fund one squad, so things for the squad cost SQUAD_PRICE times as much (shop.js);
  // each player's own gun upgrades keep their price. Tuned with the balance bots playing two barrels (run.py --option coop=1).
  var COOP_HARD = { MORE: [1.35, 3], FULL: 15, DREAD: 2, SQUAD_PRICE: 1.5 }, coopLevels = {};
  function coopMore(n) { var k = Math.min(1, Math.max(0, (n - 1) / (COOP_HARD.FULL - 1))); return COOP_HARD.MORE[0] + (COOP_HARD.MORE[1] - COOP_HARD.MORE[0]) * k; }
  function lv() {
    var L = LEVELS[S && S.level] || LEVELS.soldier;
    if (!(S && S.coop)) return L;
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
  // Cargo planes likewise: the first FIRST seconds in, then every GAP (times the pace). Round 19: at 6 s and every
  // 10-15 s the last one dropped its tank about 30 s into wave 18 or 19, after the planes were done, and it trickled
  // in at the end.
  var CARGO = { FIRST: 5, GAP: [6, 9] };
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

  // ---------- the paper ----------
  // The page the game is drawn on, as a theme: its colors and pens, how it's ruled (draw.js drawPaper), and how the
  // HUD reads on it (draw.js pensAt): in its pens on the paper, and in CHALK where the page goes dark (the night raid,
  // the Dreadnought's smoke), turning over between PEN_TURN of full dark. The ruled notebook is the only paper so far;
  // Campaign's missions may add others. The colors are read from index.html's CSS (the cards use the same), and every
  // file takes them once, when it's made, so a paper is picked before the page loads, not mid-run.
  var css = getComputedStyle(document.documentElement);
  function tok(n, f) { var v = css.getPropertyValue(n).trim(); return v || f; }
  var PAPERS = {
    ruled: {
      PAPER: tok('--paper', '#fbf8ef'), RULE: tok('--rule', '#cfdcec'), MARGIN: tok('--margin', '#e6a2a0'),
      INK: tok('--ink', '#2e2e33'), INK2: tok('--ink-soft', '#5d5a55'),
      // Co-op's second player writes in green: blue, red and green are the notebook's three pens, and red is the enemy's.
      RED: tok('--enemy', '#c8433a'), BLUE: tok('--ally', '#2f6fdc'), HAT: tok('--hat', '#f2c230'), GREEN: tok('--friend', '#2e8b4a'),
      RED_FILL: 'rgba(200,67,58,0.14)', INK_FILL: 'rgba(46,46,51,0.07)', EMPTY: '#aaa395',
      // The page: flecks of grain, blue rules from TOP every GAP, the red margin, two punched holes, the ground's tint.
      GRAIN: { N: 260, SEED: 7, COLOR: 'rgba(80,70,50,0.05)' }, LINES: { TOP: 100, GAP: 28, WIDTH: 1 }, MARGIN_LINE: { X: 46.5, WIDTH: 1.4 },
      HOLES: { X: 20, Y: [150, 360], R: 7, FILL: '#e7e1d3', RIM: 'rgba(60,50,30,0.25)' }, GROUND_TINT: 'rgba(120,96,50,0.07)',
      // The HUD: the dog tags' grey, chalk for the dark, and the wall bar's fill (low, on paper, in the dark past DARK).
      TAGS: '#56606b', CHALK: { INK: '#f1ebdd', INK2: '#c8cede', TAGS: '#c8cede', BLUE: '#93b8ff', RED: '#ff9484', GREEN: '#8fd6a5' },
      PEN_TURN: [0.55, 0.85], WALL_BAR: { LOW: 'rgba(200,67,58,0.45)', INK: 'rgba(47,111,220,0.4)', CHALK: 'rgba(147,184,255,0.55)', DARK: 0.6 }
    }
  };
  var THEME = PAPERS.ruled;
  var PAPER = THEME.PAPER, INK = THEME.INK, INK2 = THEME.INK2;
  var RED = THEME.RED, BLUE = THEME.BLUE, HAT = THEME.HAT, GREEN = THEME.GREEN;
  var RED_FILL = THEME.RED_FILL, INK_FILL = THEME.INK_FILL, EMPTY = THEME.EMPTY;
  var HAND = '"Schoolbell", "Comic Sans MS", "Chalkboard SE", cursive';
  var DISPLAY = '"Cabin Sketch", "Schoolbell", "Comic Sans MS", cursive';

  // Randomness comes in streams so a seed reproduces content (SPEC-005). R and rr are for cosmetic effects only.
  // RW (wave content: spawn timing, aircraft, drops, trooper types) and RS (shop offers) are reseeded every wave from
  // the run seed, so wave n is the same for a seed however earlier waves went. Each aircraft takes one draw from RW
  // to seed its own sub-stream, so shooting it early doesn't shift what follows. RC is combat (crew aim and timing).
  var R = Math.random;
  function rr(a, b) { return a + R() * (b - a); }
  // RUN.players: 2 for a co-op run (two barrels, coop.md), set by coop.js before newGame. RUN.game: the kind of run
  // the next newGame starts (MODES; Arcade, the only one so far).
  var RUN = { seed: 0, force: null, players: 1, game: 'arcade' }, RW = Math.random, RS = Math.random, RC = Math.random;
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
  function emit(type, data) { if (S && S.coop) playerEvent(type, data || {}); if (emitHook) emitHook(type, data || {}); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
  function mulberry(a) {
    var next = function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // The stream's state, so a saved run picks up exactly where it left off (save.js): state() reads it, state(v) sets it.
    next.state = function (v) { if (v !== undefined) a = v | 0; return a; };
    return next;
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
  // a barrel, so each barrel has its own `mods` (with their own `stacks`); in co-op each player buys their own. The
  // rest of the kit is the squad's, on S.mods.
  var me = 0, TWIN_MOUNT = 7, TURRET_MODS = ['fire', 'cool', 'double', 'spread', 'flak', 'rockets', 'pierce'];
  function makeTurret(gun, x) {
    return { gun: gun, x: x, aim: -Math.PI / 2, heat: 0, overheat: 0, recoil: 0, firing: false, fireCD: 0, volleys: 0,
      mods: { fire: 0, cool: 0, double: false, spread: false, flak: false, rockets: false, pierce: false, stacks: {} } };
  }
  function setTurrets(n) {
    S.turrets = n > 1 ? [makeTurret(0, TUR.x - TWIN_MOUNT), makeTurret(1, TUR.x + TWIN_MOUNT)] : [makeTurret(0, TUR.x)];
  }
  // ---------- players ----------
  // Solo is co-op with one player: S.players has one entry per player (one in solo, two in co-op) and S.coop says
  // which. A player's tally: their dog tags, and in co-op the points their barrel earned (its rounds, the chutes it
  // popped that were caught, its own combo), its planes, catches and Red Cross hits for the end card. Points nobody
  // fired for (the squad, air strikes, wave bonuses) go to the team score only. `gunner` is the barrel whose round is
  // being resolved; per-player points and combos are co-op's only, so solo's scoring is the team's, as it always was.
  function makePlayer() { return { score: 0, tags: 0, combo: 0, comboT: 0, planes: 0, captured: 0, redCross: 0, hq: 0, kills: 0 }; }
  // Dog tags: each player's own (p.tags). Tags from what a barrel shoots are its player's (co-op), and tags nobody
  // fired for (the squad, wave bonuses, crates, safe passage) are split evenly, an odd one going to each player in
  // turn (S.tagOdd). Every gain, loss and purchase goes through these four (case-31 checks nothing else writes tags).
  function tagsOf(by) { return S.players[by].tags; }
  // split: tags nobody fired for, even while a round is being resolved (a full radio after a zeppelin goes down).
  function gainTags(n, split) {
    var p = split ? null : scorer();
    if (p) { p.tags += n; return; }
    if (S.players.length === 1) { S.players[0].tags += n; return; }
    var half = Math.floor(n / 2), first = S.tagOdd || 0;
    S.players[0].tags += half; S.players[1].tags += half;
    if (n - 2 * half) { S.players[first].tags += 1; S.tagOdd = 1 - first; }
  }
  // Up to n tags, from the shooter's wallet (co-op) or from both, half each; returns how many went.
  function takeTags(n) {
    var t, p = scorer() || (S.players.length === 1 ? S.players[0] : null);
    if (p) { t = Math.min(p.tags, n); p.tags -= t; return t; }
    var a = Math.min(S.players[0].tags, Math.ceil(n / 2)), b = Math.min(S.players[1].tags, n - a);
    S.players[0].tags -= a; S.players[1].tags -= b;
    return a + b;
  }
  // A purchase in the shop, from the buyer's wallet (shop.js).
  function spendTags(n, by) { S.players[by].tags -= n; }
  var gunner = null;
  function scorer() { return S.coop && gunner != null ? S.players[gunner] || null : null; }
  function playerEvent(type, data) {
    var p = scorer();
    if (!p) return;
    if (type === 'plane_down' && data.by === 'player') p.planes++;
    else if (type === 'kill' && data.by === 'player') p.kills++;
    else if (type === 'capture') p.captured++;
    else if (type === 'redcross_hit') { p.redCross++; p.combo = 0; p.comboT = 0; p.score = Math.max(0, p.score - (data.pts || 0)); }
    else if (type === 'hq_hit') { p.hq++; p.combo = 0; p.comboT = 0; }
  }
  function gun() { return S.turrets[me] || S.turrets[0]; }

  function reset() {
    S = {
      input: 'keys',
      mode: 'title', t: 0, score: 0, wave: 0, wallHP: 100,
      mods: { slots: 4, secondTramp: false, catcher: false, aim: 0, mat: 0, trench: 0, helmet: 0, hired: 0, maxHP: 100, wire: false, mines: false, medic: false, auto: false, hospital: false, flag: false, stacks: {} },
      autoCD: 0, autoAim: -Math.PI / 2, mines: [], shop: null, delivery: null, pizzaOrder: false, waveStart: { kills: 0, captured: 0, wall: 0 },
      turrets: null, flagUp: 0, saluteT: 0, leavers: [],
      planes: [], troopers: [], recruits: [], bullets: [], bombs: [], enemyShots: [], parts: [], texts: [],
      tanks: [], wreck: null, calls: { bomber: 0, fighter: 0 }, strike: null, strikeBombs: [], fighter: null, radio: null, crates: [], medevac: [], skyFx: [], hq: [], tagLoss: 0, tagLost: 0, bubbles: [], night: 0,
      bed: null, fallen: [], sentHome: [], usedNames: {}, news: [], sketches: [], played: 0, nextWave: null,
      spawn: null, waveState: 'idle', waveTimer: 0, banner: null,
      combo: 0, comboT: 0, shake: 0, repairLevel: 0, dieT: 0, smokeT: 0,
      stats: { captured: 0, popped: 0, kills: 0, planes: 0, zeppelins: 0, tanks: 0, dreads: 0, wallDamage: 0, shots: 0, redCross: 0, redCrossHit: 0, hqSafe: 0, hqHit: 0 },
      hint: false, slotRes: {}, finalWon: false, won: false, wonAt: 0, wonScore: 0, endless: false, redCrossPaid: false,
      matRight: (mix(RUN.seed, 0x3a7) & 1) === 1, level: level, game: RUN.game,
      // One player in solo, two in co-op (coop.md).
      coop: RUN.players > 1, players: RUN.players > 1 ? [makePlayer(), makePlayer()] : [makePlayer()]
    };
    setTurrets(RUN.players); resizeMats(); clearInput();
    TRAMPS.forEach(function (tr) { tr.dip = 0; tr.v = 0; });
    clearInk();
  }
  function clearInk() { decals.length = 0; inkT = 0; redrawDecals(); if (COOP) COOP.fx('x'); }

  // ---------- what decides a run ----------
  // A run's kind (S.game, from RUN.game) decides its waves (the recipe for wave n), when it's won (asked as a wave
  // clears) and what winning does, and when it's lost (asked every frame of play). Arcade, the 20 waves that end with
  // the Dreadnought, is the only kind so far, and the default; Campaign will add its own.
  var MODES = {
    arcade: {
      wave: function (n) { return waveCfg(n); },
      won: function () { return victoryDue(); },
      win: function () { showWin(); reportWin(); },
      lost: function () { return S.wallHP <= 0; }
    }
  };
  function rules() { return MODES[S && S.game] || MODES.arcade; }
  function waveFor(n) { return rules().wave(n); }
  function runWon() { return rules().won(); }

  // Arcade's waves. A run is 20 waves. Bosses every fifth: a zeppelin (5), the armored zeppelin (10), two zeppelins
  // at once (15) and the Dreadnought (20); in endless the twins return on the fives and the Dreadnought on the tens.
  // Something new arrives on most waves (startWave says what), and the curves below keep climbing through 19 and on
  // into endless.
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
    if (S && S.coop) { var more = coopMore(n); c.planes = Math.round(c.planes * more); c.bombers = Math.round(c.bombers * more); }
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
    gainTags(tags); flyTags(x, y, tags);
    emit('coins', { amount: tags, reason: OUCH.indexOf(label) >= 0 ? 'kill' : label.replace(/!+$/, '') });
    if (quiet) return;
    // Every kind of trooper cry merges with the others, under the first one's word.
    if (base >= 100) addText(label + ' +' + pts, x, y, color === BLUE ? BLUE : INK, null, 'big');
    else addText(label + ' +' + pts, x, y, color === BLUE ? BLUE : INK2, null, 'score',
      { key: OUCH.indexOf(label) >= 0 ? 'ouch' : label, pts: pts, fmt: function (n, p) { return label + ' ×' + n + ' +' + p; } });
  }
  // Earned dog tags fly from the kill to the counter so their source is obvious.
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
  // Losing tags (the Red Cross plane): they fly out of the counter toward what cost them, and the counter flashes red
  // with the amount under it (drawHUD).
  // Co-op: the counter that flashes is the charged player's (S.tagLossBy; null when both paid).
  function loseTags(n, x, y) {
    S.tagLoss = 1.2; S.tagLost = n; S.tagLossBy = S.coop && gunner != null ? gunner : null;
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
    var c = S.spawn ? S.spawn.cfg : waveFor(1), type = 'rifle';
    if (rnd() < c.sniperChance) type = 'sniper';
    else if (rnd() < c.special) type = S.wave < ENEMIES.bazooka.minWave ? 'engineer' : (rnd() < 0.5 ? 'bazooka' : 'engineer');
    var kit = { type: type, fall: between(rnd, 0.9, 1.15), sway: rnd() * 6.28, armor: 0 };
    if (c.armorChance && type !== 'sniper' && rnd() < c.armorChance) kit.armor = c.armorHits || 1;
    return kit;
  }
  function spawnTrooper(x, y, kit) {
    var c = S.spawn ? S.spawn.cfg : waveFor(1);
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
    var c = waveFor(n);
    // pace: the gaps between rushes, cargo planes, road tanks and the sky's arrivals shrink with the plane interval,
    // so late waves arrive together and build to a peak instead of trickling in after the planes are done.
    S.spawn = { cfg: c, planes: c.planes, bombers: c.bombers, boss: c.boss, bossT: ZEP.ARRIVE, timer: 1.8, rushes: c.rushes, rushT: 8, cargo: c.cargo, cargoT: CARGO.FIRST, road: c.road, roadT: ROAD.FIRST,
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
      if (sp.cargo > 0) { sp.cargoT -= dt; if (sp.cargoT <= 0) { sp.cargo--; spawnCargo(); sp.cargoT = between(RW, CARGO.GAP[0], CARGO.GAP[1]) * sp.pace; } }
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
        S.score += bonus + extra; gainTags(waveTags); flyTags(200, 330, waveTags);
        emit('wave_clear', { wave: S.wave, untouched: untouched }); emit('coins', { amount: waveTags, reason: 'wave' });
        S.news = []; serveWave(S.news); careAtWaveEnd(S.news);
        S.banner = runWon() ? { s: 'victory!', sub: 'the page is yours!', t: 0, dur: 2.8 } : { s: 'wave cleared!', sub: '+' + bonus + ' bonus' + (untouched ? ' · untouched! +' + extra : ''), t: 0, dur: 1.9 };
        if (runWon()) S.waveTimer = 3.2;
        S.hint = false;
        // The final wave's own fanfare plays with the victory card, so its banner gets only the cheer.
        if (!runWon()) sound.play('wave');
        SQUAD.cheer(runWon() ? 'hooray!' : 'yeah!');
      }
    } else if (S.waveState === 'clear') {
      S.waveTimer -= dt;
      if (S.waveTimer <= 0) { if (runWon()) rules().win(); else openShop(); }
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
  // Units beyond troopers and planes live in units.js; this is everything they may use.
  var world = { W: W, H: H, GROUND: GROUND, BK: BK, TUR: TUR, BALANCE: BALANCE,
    INK: INK, INK2: INK2, RED: RED, BLUE: BLUE, HAT: HAT, PAPER: PAPER, RED_FILL: RED_FILL, INK_FILL: INK_FILL,
    L: L, SP: SP, Ci: Ci, ink: ink, pen: pen, jt: jt, clamp: clamp, between: between, rr: rr, substream: substream,
    makePlane: makePlane, spawnTrooper: spawnTrooper, rollTrooper: rollTrooper, award: award, explode: explode, emit: emit, hurtRecruit: hurtRecruit, inView: inView,
    puff: function (x, y, r, life) { puff(x, y, r, life); }, burst: function (x, y, n, c, sp) { burst(x, y, n, c, sp); }, pow: function (x, y, r) { pow(x, y, r); },
    killFx: function (t, f, sq, c) { killFx(t, f, sq, c); }, addText: function (t, x, y, c, sz, kind, merge) { addText(t, x, y, c, sz, kind, merge); },
    addDecal: function (d) { addDecal(d); }, flyTags: function (x, y, n) { flyTags(x, y, n); }, id: function () { return nextId++; },
    crewMax: function (r) { return crewMax(r); }, credit: function () { credit(); }, sketchReveal: function (p, box, dir, fn) { sketchReveal(p, box, dir, fn); },
    // Little voices: a speech bubble over the speaker (a recruit by id, or at x, y) and the line in his voice.
    say: function (text, id, enemy, delay, x, y, mood) { speak(text, id, enemy, delay, x, y, mood); } };
  // G has a setter: drawing onto a card's or an icon's canvas swaps it for a moment (draw.js).
  Object.defineProperties(world, { S: { get: function () { return S; } }, G: { get: function () { return G; }, set: function (v) { G = v; } },
    boil: { get: function () { return boil; } }, RW: { get: function () { return RW; } }, RC: { get: function () { return RC; } }, sound: { get: function () { return sound; } },
    BOMBER_PTS: { get: function () { return BOMBER_PTS; } }, seed: { get: function () { return RUN.seed; } } });
  // The drawing lives in draw.js. It's made before the other files, which draw with its stick figures; the harness
  // and the bots reach its functions here by name, as before. medicHelmet and drawFlagpole go through world, since
  // the harness swaps them in this scope.
  world.H = H; world.GREEN = GREEN; world.EMPTY = EMPTY; world.HAND = HAND; world.DISPLAY = DISPLAY;
  world.REDUCED = REDUCED; world.THEME = THEME; world.PAPERS = PAPERS; world.HL = HL; world.TEXT = TEXT; world.TAG_HUD = TAG_HUD; world.mulberry = mulberry; world.bgx = bgx;
  world.standing = standing; world.tagsOf = function (by) { return tagsOf(by); }; world.gun = gun; world.sketchProgress = sketchProgress;
  world.medicHelmet = function (x, y) { medicHelmet(x, y); }; world.drawFlagpole = function () { drawFlagpole(); };
  var DRAW = StickArmyDraw(world),
    drawPaper = DRAW.drawPaper, sketched = DRAW.sketched, sketchReveal = DRAW.sketchReveal, drawPen = DRAW.drawPen,
    drawBodyPart = DRAW.drawBodyPart, stick = DRAW.stick, tube = DRAW.tube, hat = DRAW.hat, dogTag = DRAW.dogTag,
    drawTagShape = DRAW.drawTagShape, helmet = DRAW.helmet, medicHelmet = DRAW.medicHelmet, vest = DRAW.vest,
    captainCap = DRAW.captainCap, steelPot = DRAW.steelPot, hammer = DRAW.hammer, chute = DRAW.chute,
    drawTrooper = DRAW.drawTrooper, drawDowned = DRAW.drawDowned, drawRecruit = DRAW.drawRecruit,
    drawScope = DRAW.drawScope, PLANE_PTS = DRAW.PLANE_PTS, BOMBER_PTS = DRAW.BOMBER_PTS, drawPlane = DRAW.drawPlane,
    drawBomb = DRAW.drawBomb, drawGround = DRAW.drawGround, drawDefenses = DRAW.drawDefenses, BAGS = DRAW.BAGS,
    drawSandbags = DRAW.drawSandbags, drawTramp = DRAW.drawTramp, GUN_COLORS = DRAW.GUN_COLORS,
    drawBarrel = DRAW.drawBarrel, drawHeatRing = DRAW.drawHeatRing, drawSentry = DRAW.drawSentry,
    drawBunker = DRAW.drawBunker, drawFlagpole = DRAW.drawFlagpole, drawFlagCloth = DRAW.drawFlagCloth,
    drawFallenFlag = DRAW.drawFallenFlag, drawRubble = DRAW.drawRubble, drawBullets = DRAW.drawBullets,
    drawParts = DRAW.drawParts, highlight = DRAW.highlight, drawTexts = DRAW.drawTexts,
    drawBubbles = DRAW.drawBubbles, drawAimGuide = DRAW.drawAimGuide, drawHint = DRAW.drawHint, MINI = DRAW.MINI,
    miniFig = DRAW.miniFig, CALL_CHIP = DRAW.CALL_CHIP, KEYS_SHOWN = DRAW.KEYS_SHOWN, callChips = DRAW.callChips,
    callChipAt = DRAW.callChipAt, drawCallChips = DRAW.drawCallChips, CHALK = DRAW.CHALK, PENS = DRAW.PENS,
    HUD_GAP = DRAW.HUD_GAP, rgbOf = DRAW.rgbOf, PEN_TURN = DRAW.PEN_TURN, pensAt = DRAW.pensAt,
    drawHUD = DRAW.drawHUD, drawBanner = DRAW.drawBanner, squadSlots = DRAW.squadSlots,
    drawSquadRow = DRAW.drawSquadRow, drawSquadFig = DRAW.drawSquadFig;
  world.stick = stick; world.tube = tube;
  // Pencil icons for supplies live in icons.js; they draw with this file's pen.
  var ICONS = StickArmyIcons({ L: L, SP: SP, Ci: Ci, ink: ink, stick: stick, dogTag: dogTag, hat: hat, medicHelmet: medicHelmet, tube: tube,
    INK: INK, INK2: INK2, RED: RED, BLUE: BLUE, HAT: HAT, PAPER: PAPER });
  var UNITS = StickArmyUnits(world), ZEP = UNITS.ZEP, zeppelinHP = UNITS.zeppelinHP, spawnZeppelin = UNITS.spawnZeppelin,
    zeppelinOnScreen = UNITS.zeppelinOnScreen, planeHit = UNITS.planeHit, updateZeppelin = UNITS.updateZeppelin,
    hurtZeppelin = UNITS.hurtZeppelin, inGondola = UNITS.inGondola, zeppelinDown = UNITS.zeppelinDown, drawZeppelin = UNITS.drawZeppelin, drawBossBar = UNITS.drawBossBar, drawSticker = UNITS.drawSticker, drawPlate = UNITS.drawPlate,
    RUSH = UNITS.RUSH, spawnRush = UNITS.spawnRush, TANK = UNITS.TANK, tankHP = UNITS.tankHP, spawnCargo = UNITS.spawnCargo, updateCargo = UNITS.updateCargo, spawnRoadTank = UNITS.spawnRoadTank,
    tankHit = UNITS.tankHit, damageTank = UNITS.damageTank, updateTanks = UNITS.updateTanks, blastTanks = UNITS.blastTanks, drawTank = UNITS.drawTank,
    RADIO = UNITS.RADIO, callsHeld = UNITS.callsHeld, grantCall = UNITS.grantCall,
    // A co-op guest's calls go to the host, which makes them (coop.js).
    STRIKE = UNITS.STRIKE, callStrike = function () { return COOP && COOP.guest ? COOP.ask('call', 'bomber') : UNITS.callStrike(); }, updateStrike = UNITS.updateStrike, drawStrike = UNITS.drawStrike,
    FIGHTER = UNITS.FIGHTER, callFighter = function () { return COOP && COOP.guest ? COOP.ask('call', 'fighter') : UNITS.callFighter(); }, updateFighter = UNITS.updateFighter, drawFighter = UNITS.drawFighter,
    updateRadio = UNITS.updateRadio, drawRadio = UNITS.drawRadio, updateDelivery = UNITS.updateDelivery, drawCourier = UNITS.drawCourier;
  // Balloons, the Red Cross plane, HQ crates, dive bombers and helicopters live in sky.js.
  world.gainTags = function (n, split) { gainTags(n, split); }; world.takeTags = function (n) { return takeTags(n); };
  world.spendTags = function (n, by) { spendTags(n, by); };
  world.grantCall = grantCall; world.activeTramps = activeTramps; world.loseTags = function (n, x, y) { loseTags(n, x, y); }; world.repairWall = repairWall;
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
  world.clearInput = function () { clearInput(); }; world.washDecals = washDecals; world.startWave = startWave; world.openWave = openWave; world.queueSketches = queueSketches; world.sendOff = sendOff;
  world.drawItemIcon = drawItemIcon; world.waveCfg = waveFor; world.standUp = standUp; world.drawSquadRow = drawSquadRow; world.squadSlots = squadSlots; world.drawSquadFig = drawSquadFig;
  world.squadLine = function (bare, short) { return squadLine(bare, short); };
  world.callsHeld = callsHeld; world.RADIO = RADIO; world.TANK = TANK; world.FIGHTER = FIGHTER;
  // Co-op's shop (shop.js): turret upgrades are each barrel's own; a guest's taps go to the host (coop.js).
  world.TURRET_MODS = TURRET_MODS; world.COOP_HARD = COOP_HARD;
  world.coopRemote = function (action, id) { if (!(COOP && COOP.guest)) return false; COOP.ask('shop', { a: action, id: id }); return true; };
  var SHOP = StickArmyShop(world), ITEMS = SHOP.ITEMS, price = SHOP.price, eligible = SHOP.eligible, OFFERS = SHOP.OFFERS, offer = SHOP.offer,
    onHouse = SHOP.onHouse, costNow = SHOP.costNow, openShop = SHOP.openShop, takeItem = SHOP.takeItem,
    continueWave = SHOP.continueWave, kitItems = SHOP.kitItems;
  // The shop screen (shop-screen.js) draws what shop.js decides.
  var SHOP_SCREEN = world.shopScreen = StickArmyShopScreen(world, SHOP), renderShop = SHOP_SCREEN.render, renderKit = SHOP_SCREEN.renderKit;
  // The Dreadnought, the victory card and endless live in dreadnought.js.
  world.TENT = SQUAD.TENT; world.SQUAD = SQUAD; world.load = load; world.save = save; world.clock = clock;
  world.recruitDie = function (r, cause) { recruitDie(r, cause); }; world.hurtWall = hurtWall; world.wallText = function (n) { wallText(n); };
  world.openShop = function () { openShop(); }; world.hidePause = function () { pauseBtn.hidden = true; };
  // Records are solo's: a co-op run (S.coop) never writes them.
  world.saveBest = function () { if (S.coop || S.score <= best) return false; best = S.score; save(lv().KEYS.best, best); return true; };
  world.saveBestWave = function (n) { if (!S.coop && n > load(lv().KEYS.wave, 0)) save(lv().KEYS.wave, n); };
  world.lv = lv; world.LEVELS = LEVELS; world.MODES = MODES; world.rules = rules;
  Object.defineProperty(world, 'SENTRY', { get: function () { return SENTRY; } });
  var DN = StickArmyDreadnought(world), DREAD = DN.DREAD, isDreadWave = DN.isDreadWave, spawnDread = DN.spawnDread,
    dreadHit = DN.dreadHit, hurtDread = DN.hurtDread, updateDread = DN.updateDread, drawDread = DN.drawDread,
    drawDreadBar = DN.drawDreadBar, dreadTargets = DN.dreadTargets, victoryDue = DN.victoryDue, showWin = DN.showWin,
    keepGoing = DN.keepGoing, rollCall = DN.rollCall, recordLine = DN.recordLine;
  world.BOARD = BOARD;
  var LBOARD = world.board = StickArmyBoard(world);
  world.dreadTargets = dreadTargets; world.DREAD_DECOY_HP = DREAD.DECOY_HP; world.dreadBeams = DN.dreadBeams; world.dreadPhase = DN.dreadPhase;
  // Co-op (coop.js, an add-on: without it, COOP is null and every hook below does nothing).
  world.TRAMPS = TRAMPS; world.keys = keys; world.AIM_MIN = AIM_MIN; world.AIM_MAX = AIM_MAX; world.RUN = RUN;
  world.setState = function (o) { S = o; }; world.resizeMats = function () { resizeMats(); }; world.clearInk = function () { clearInk(); };
  world.updateParts = function (dt) { updateParts(dt); }; world.fadeInk = function (dt) { fadeInk(dt); }; world.decals = function () { return decals; };
  Object.defineProperty(world, 'me', { get: function () { return me; }, set: function (v) { me = v; } });
  world.fit = function () { fit(); }; world.fillPause = function () { fillPause(); }; world.togglePause = function () { togglePause(); };
  world.newGame = function () { newGame(); }; world.ITEMS = ITEMS; world.renderShop = function () { SHOP_SCREEN.render(); }; world.continueWave = function () { continueWave(); };
  world.takeItem = function (id, by) { return SHOP.takeItem(id, by); }; world.putBack = function (id, by) { return SHOP.putBack(id, by); }; world.undo = function (by) { return SHOP.undo(by); }; world.callStrike = function () { return UNITS.callStrike(); }; world.callFighter = function () { return UNITS.callFighter(); };
  world.screens = function () { return { title: titleScreen, pause: pauseScreen, over: overScreen, win: winScreen, shop: shopScreen, pauseBtn: pauseBtn }; };
  var COOP = window.StickArmyCoop ? StickArmyCoop(world) : null;
  world.dreadLit = function () { var p = DN.dread(); return !p ? [] : p.phase === 'hangar' ? [DN.hangarAt(p)] : p.phase === 'bridge' ? [DN.bridgeAt(p), DN.hangarAt(p)] : []; };
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
  // ---------- combat ----------
  function shoot(t) {
    t = t || S.turrets[0];
    var c = Math.cos(t.aim), s = Math.sin(t.aim), x0 = t.x, m = t.mods;
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
    var m = t.mods, rate = Math.pow(0.82, m.fire);
    t.fireCD = BALANCE.FIRE_COOLDOWN * rate;
    t.heat += BALANCE.HEAT_PER_SHOT * rate * Math.pow(0.8, m.cool);
    S.score = Math.max(0, S.score - BALANCE.SHOT_COST);
    if (S.coop) S.players[t.gun].score = Math.max(0, S.players[t.gun].score - BALANCE.SHOT_COST);
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
    if (t.captain) DN.captainDown(t);
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
    if (S.coop && gunner != null) t.poppedBy = gunner;
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
    if (t.captain) DN.captainDown(t);
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
    // The Dreadnought's captain is a prisoner, not a recruit: he bounces onto the bunker (dreadnought.js captainCaught).
    var slot = t.captain ? -1 : freeSlot(tr.x1 < 200 ? 0 : 1);
    t.state = 'bounce'; t.bt = 0; t.bdur = 0.85; t.x0 = t.x; t.y0 = tr.y - 33; t.slot = slot;
    if (slot >= 0) { S.slotRes[slot] = true; t.x1 = SLOTS[slot]; t.y1 = GROUND - 33; t.bh = 120; }
    else { t.x1 = BK.x; t.y1 = BK.top - 30; t.bh = 140; }
    t.spinDir = t.x1 > t.x0 ? 1 : -1;
  }
  function becomeRecruit(t) {
    var was = gunner;
    if (S.coop) gunner = t.poppedBy != null ? t.poppedBy : null;
    try { joinSquad(t); } finally { gunner = was; }
  }
  function joinSquad(t) {
    t.dead = true;
    if (t.captain) { DN.captainCaught(t); return; }
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
        if (p.kind === 'dread' && b.side && lv().GRAZE < 1) { DN.graze(p, b.x, b.y); grazing = lv().GRAZE; }
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
    // A downed Dreadnought's wreck smolders on until the next wave (dreadnought.js).
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
    if (t.captain) { DN.captainRun(t, dt); return; }
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
        if (t.captain) DN.captainDrift(t, dt);
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
    updateLeavers(dt);
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
    if (S.coop) S.players.forEach(function (p) { if (p.comboT > 0) { p.comboT -= dt; if (p.comboT <= 0) p.combo = 0; } });
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
    if (S.mode === 'play' && rules().lost()) die();
    if (S.mode === 'dying') { S.dieT -= dt; if (S.dieT <= 0) showOver(); }
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
  // Sent home (shop.js sendHome): as the next wave opens, the soldier stands at their old place, salutes, says
  // goodbye and walks off the nearer edge of the page (S.leavers, drawn like the squad). Cosmetic: the line is
  // Math.random and nothing in the fight reads a leaver.
  var LEAVE = { SALUTE: 1.8, SPEED: 46 };
  var GOODBYES = ['see ya, Sarge!', "it's been an honor.", 'write me!', 'keep your head down.', 'save me a slice.',
    "I'll miss the trampoline.", "don't forget me!", 'back to the farm.', 'so long, page!', 'tell my mom I said hi.',
    'godspeed, all.', 'off to college!'];
  function sendOff(r) {
    var x = r.bed ? SQUAD.TENT.x : SLOTS[r.slot] != null ? SLOTS[r.slot] : r.homeX;
    S.leavers.push(Object.assign({}, r, { x: x, tx: x, homeX: x, leaving: 0, down: false, hurt: 0, role: 'leave', walk: 0 }));
    speak(GOODBYES[Math.floor(Math.random() * GOODBYES.length)], null, false, 0.4, x, GROUND - 62);
  }
  function updateLeavers(dt) {
    S.leavers.forEach(function (l) {
      l.leaving += dt;
      if (l.leaving < LEAVE.SALUTE) return;
      l.tx = l.homeX < 200 ? -30 : W + 30;
      var step = Math.min(LEAVE.SPEED * dt, Math.abs(l.tx - l.x));
      l.x += Math.sign(l.tx - l.x) * step; l.walk += dt * 9;
    });
    S.leavers = S.leavers.filter(function (l) { return l.x > -24 && l.x < W + 24; });
  }

  // ---------- a frame ----------
  // The order the page is drawn in, back to front. The pieces are in draw.js and the other files.
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
    // The mats in front of the Dreadnought's wreck, so its captain can still be caught on one (dreadnought.js).
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
      // Bought but not yet raised, it isn't there at all until its scene sketches it in (round 19: it showed finished
      // under the wave banner, vanished, then was drawn).
      if (S.mods.flag && (S.waveState === 'flag' || S.flagUp >= 1)) sketchReveal(S.waveState === 'flag' ? clamp(S.flagT / FLAG.SKETCH, 0, 1) : 1, [FLAG.X - FLAG.W - 6, GROUND - FLAG.TALL - 8, FLAG.X + 6, GROUND], 'up', drawFlagpole);
      sketched('auto', [SENTRY.x - 12, SENTRY.y - 16, SENTRY.x + 14, GROUND], 'up', drawSentry);
      drawBunker(); drawDefenses();
      sketched('hospital', [SQUAD.TENT.x - SQUAD.TENT.hw, GROUND - SQUAD.TENT.h - 10, SQUAD.TENT.x + SQUAD.TENT.hw, GROUND], 'up', drawTent);
    }
    S.recruits.forEach(function (r) { if (!r.dead) sketched('r' + r.id, [r.x - 12, GROUND - 46, r.x + 12, GROUND + 6], 'up', function () { drawRecruit(r); }); });
    S.leavers.forEach(drawRecruit);
    SKY.drawMarks();
    drawBullets();
    drawCourier();
    drawBossBar();
    drawParts();
    SKY.drawNight();
    // The Dreadnought's name and gauges sit behind the ship, so under its smoke they're written again over it.
    if (S.smoke) drawDreadBar(SKY.smokeAt(200, 116));
    if (S.mode === 'play') drawAimGuide();
    if (S.hint && S.mode === 'play') drawHint();
    drawTexts();
    drawBubbles();
    ctx.restore();
    drawHUD();
    if (S.banner) drawBanner();
  }

  // ---------- saving a run ----------
  // save.js snapshots a run at the shop and restores it, for Campaign to save after every wave. Arcade never calls it.
  function stream(state) { if (state == null) return Math.random; var r = mulberry(0); r.state(state); return r; }
  function streamState(r) { return r.state ? r.state() : null; }
  var SAVE = StickArmySave(world, { ITEMS: ITEMS,
    streams: function () { return { seed: RUN.seed, RC: streamState(RC), RW: streamState(RW), RS: streamState(RS) }; },
    setStreams: function (o) { RUN.seed = o.seed >>> 0; RC = stream(o.RC); RW = stream(o.RW); RS = stream(o.RS); },
    ids: function () { return { next: nextId, bubble: bubbleId }; },
    setIds: function (o) { nextId = o.next; bubbleId = o.bubble; },
    ink: function () { return { decals: JSON.parse(JSON.stringify(decals)), t: inkT }; },
    setInk: function (o) { decals.length = 0; (o && o.decals || []).forEach(function (d) { decals.push(d); }); inkT = o ? o.t : 0; redrawDecals(); } });
  var snapshotRun = SAVE.snapshotRun, restoreRun = SAVE.restoreRun;
  world.snapshotRun = snapshotRun; world.restoreRun = restoreRun;

  // ---------- flow ----------
  // The title, a new run, pause, game over, play stats, full screen and input live in flow.js, made here so its
  // listeners come in the same order as ever. The harness and the bots reassign best and level in this scope.
  world.ICONS = ICONS; world.DREAD = DREAD; world.LEAVE = LEAVE; world.drawSticker = drawSticker; world.drawPlate = drawPlate;
  DRAW.link();
  var game = { COOP: COOP, SHOP: SHOP, DREAD: DREAD, keys: keys, cv: cv, wrap: wrap, clamp: clamp, emit: emit, explode: explode, gun: gun,
    hashSeed: hashSeed, hashTokens: hashTokens, makePlane: makePlane, makeRecruit: makeRecruit, reset: reset, resizeMats: resizeMats,
    seedRun: seedRun, shoot: shoot, speak: speak, startWave: startWave, fit: fit, ambienceState: ambienceState, callStrike: callStrike,
    callFighter: callFighter, continueWave: continueWave, rankName: rankName, renderKit: renderKit, callChipAt: callChipAt, drawSquadRow: drawSquadRow };
  Object.defineProperties(game, { best: { get: function () { return best; }, set: function (v) { best = v; } },
    level: { get: function () { return level; }, set: function (v) { level = v; } },
    facingLoaded: { get: function () { return facingLoaded; }, set: function (v) { facingLoaded = v; } } });
  var FLOW = StickArmyFlow(world, game),
    titleScreen = FLOW.titleScreen, pauseScreen = FLOW.pauseScreen, overScreen = FLOW.overScreen,
    shopScreen = FLOW.shopScreen, winScreen = FLOW.winScreen, pauseBtn = FLOW.pauseBtn, muteBtn = FLOW.muteBtn,
    strikeBtn = FLOW.strikeBtn, fighterBtn = FLOW.fighterBtn, titleScene = FLOW.titleScene,
    levelBtns = FLOW.levelBtns, showLevel = FLOW.showLevel, pickLevel = FLOW.pickLevel, DEMO = FLOW.DEMO,
    demoScene = FLOW.demoScene, updateDemo = FLOW.updateDemo, newGame = FLOW.newGame, squadLine = FLOW.squadLine,
    togglePause = FLOW.togglePause, fillPause = FLOW.fillPause, die = FLOW.die, OVER_CAUSE = FLOW.OVER_CAUSE,
    showRedCross = FLOW.showRedCross, showOver = FLOW.showOver, runReport = FLOW.runReport,
    reportWin = FLOW.reportWin, updateMuteBtn = FLOW.updateMuteBtn, fullBtn = FLOW.fullBtn, setFull = FLOW.setFull,
    toggleFull = FLOW.toggleFull, nativeFullChanged = FLOW.nativeFullChanged, clearInput = FLOW.clearInput,
    toLogical = FLOW.toLogical, aimAt = FLOW.aimAt, stopFire = FLOW.stopFire, syncCallBtns = FLOW.syncCallBtns,
    wakeSound = FLOW.wakeSound, titleSoundBtn = FLOW.titleSoundBtn, titleScoresBtn = FLOW.titleScoresBtn;

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
      dread: DN.dreadMusic() || teaserMusic()
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
          var after = waveFor(Math.max(1, S.wave));
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
