// The stairwell's two moments as small moving mockups: the Rugmergency (shoot the glass, the music stops, he raises
// the katana to a fanfare, the music comes back) and the door (he braces, kicks it in, the view swings from his side
// to behind his shoulders, the 13th Floor). Uses the game's own bull.js, sprites.js, art.js, render.js, sets13.js and
// audio.js, so the bull, the carpshits, the hall and the music are the game's.
//
// Every frame is drawn from the clock alone (scene.draw(t)), so the scrubber and slow motion show exactly what plays;
// sounds and music are cues fired as the clock passes them, and only when playing at full speed.
(function () {
  'use strict';
  const A = UnrugArt, B = UnrugBull, Snd = UnrugSound, M = UnrugStairsMusic;
  const W = 480, H = 270;
  const cv = document.getElementById('c'), out = cv.getContext('2d');
  out.imageSmoothingEnabled = false;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k);
  const easeIn = k => clamp(k, 0, 1) ** 2;
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  // a seeded stream for the debris, so a frame is the same every time it's drawn
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let x = s; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  const shakeAt = (t, t0, dur, amp) => { const k = (t - t0) / dur; if (k < 0 || k > 1) return [0, 0]; const a = amp * (1 - k); return [Math.round(Math.sin(t * 91) * a), Math.round(Math.cos(t * 77) * a * .6)]; };

  // ---------- the bull ----------
  const paintAll = o => { const r = {}; for (const k in o) r[k] = B.paint(o[k]); return r; };
  const SIDE = paintAll(B.SIDES), BARE = paintAll(B.SIDES_BARE), MOVE = paintAll(B.MOVES), RAISED = B.paint(B.RAISED), FRONT = B.paint(B.VIEWS.front);
  const SF = B.SIDE_FEET, MF = B.MOVES_FEET, RF = B.RAISED_FEET, VF = B.VIEW_FEET, SM = B.SIDE_MUZZLE;
  const BACK = paintAll(B.POSES), BF = B.FEET;
  function drawSide(g, img, x, y, feet = SF, face = 1, alpha = 1) {
    g.save(); g.globalAlpha = alpha; g.translate(Math.round(x), Math.round(y)); g.scale(face, 1); g.drawImage(img, -feet.x, -feet.y); g.restore();
  }
  const runFrame = (set, t) => set['run' + (Math.floor(Math.max(0, t) * 11) % 4)];

  // ---------- small things: carpshits, bolts, souls, words ----------
  const CW = Math.round(A.CARPF[0].width * .72), CH = Math.round(A.CARPF[0].height * .72);
  function carp(g, x, y, t, face = -1, rot = 0) {
    const flap = Math.sin(t * 18), img = A.CARPF[flap > 0 ? 0 : 1];
    g.save(); g.translate(Math.round(x), Math.round(y)); g.rotate(rot + Math.sin(t * 5) * .07); g.scale(face, 1); g.scale(1 + flap * .06, 1 - flap * .1);
    g.drawImage(img, -CW / 2, -CH / 2, CW, CH); g.restore();
  }
  function carpHalves(g, x, y, k) {
    for (const s of [-1, 1]) {
      g.save(); g.globalAlpha = 1 - k * k; g.translate(x + s * 30 * k, y + s * 20 * k + 160 * k * k); g.rotate(s * 4 * k);
      g.beginPath(); g.rect(-CW / 2, s < 0 ? -CH / 2 : 0, CW, CH / 2); g.clip(); g.drawImage(A.CARPF[0], -CW / 2, -CH / 2, CW, CH); g.restore();
    }
  }
  function bolt(g, x, y, d = 1) {
    const x0 = Math.min(x, x - d * 22), r = (a, b, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
    r(x0, y - 3, 22, 6, '#1f6fa8'); r(x0, y - 2, 22, 4, '#3aa8e0'); r(Math.min(x, x - d * 18), y - 1, 18, 2, '#bfefff'); r(x - (d > 0 ? 4 : 0), y - 2, 4, 4, '#ffffff');
  }
  function glow(g, x, y, r, col, a) {
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  function soul(g, x, y, k) {   // a freed soul floating up
    if (k <= 0 || k >= 1) return;
    g.save(); g.globalAlpha = Math.min(1, (1 - k) * 2.5);
    const img = A.GHOST; g.drawImage(img, Math.round(x - img.width / 2), Math.round(y - 50 * k - img.height / 2));
    g.restore(); glow(g, x, y - 50 * k, 18, '#bfe8ff', .5 * (1 - k));
  }
  function muzzle(g, x, y) { A.disc(g, x + 2, y, 4, '#fff6e2'); A.disc(g, x + 2, y, 2, '#7fd4ff'); }
  // words, drawn the game's way in its own units (half the picture)
  function words(g, fn) { g.save(); g.scale(2, 2); fn(); g.restore(); }   // on top of any translation (the climb moves the cabinet)
  function topBanner(g, text, k, sub) {   // the floor's opening words over the ceiling (game.js drawWords, B.top)
    words(g, () => { g.globalAlpha = clamp(Math.min(k / .1, (1 - k) / .22), 0, 1); A.otxt(g, text, 120, 16, '#ffd44a', 2, 'center'); if (sub) A.otxt(g, sub, 120, 30, '#fff6e2', 1, 'center'); });
  }
  function prompt(g, text) {   // a prompt in play: one short line in a small strip at the top
    words(g, () => { const big = text.length <= 6, tw = A.textWidth(text) * (big ? 2 : 1), y = 17;
      g.save(); g.globalAlpha = .8; A.rect(g, 120 - tw / 2 - 5, y - 3, tw + 10, big ? 16 : 11, '#0a0810'); g.restore();
      A.otxt(g, text, 120, y, '#ffd44a', big ? 2 : 1, 'center'); });
  }
  function bark(g, text, k) {   // his own line, typed out in the small caption top left
    words(g, () => { const n = Math.floor(text.length * clamp(k, 0, 1) * 1.8), y = 21, w = A.textWidth(text) + 8;
      g.save(); g.globalAlpha = .75; A.rect(g, 2, y, w, 9, '#0a0810'); g.restore(); A.rect(g, 2, y, 1, 9, '#ffd44a');
      A.txt(g, text.slice(0, n), 6, y + 2, '#fff6e2'); });
  }

  // ---------- the stairwell, side on ----------
  // Painted block walls, a red dado with a gold stripe, a concrete landing with a yellow nosing, the flight above
  // overhead, a caged lamp, and the floor's number stencilled big on the wall.
  const FLOOR = 240;
  function blocks(g, x0, y0, x1, y1, base, mortar, hi) {
    g.fillStyle = base; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let y = y0, row = 0; y < y1; y += 12, row++) {
      g.fillStyle = mortar; g.fillRect(x0, y, x1 - x0, 1);
      g.fillStyle = hi; g.fillRect(x0, y + 1, x1 - x0, 1);
      for (let x = x0 + (row % 2 ? 14 : 0); x < x1; x += 28) { g.fillStyle = mortar; g.fillRect(x, y, 1, Math.min(12, y1 - y)); }
    }
  }
  function stencil(g, s, x, y, sc, col, a) { g.save(); g.globalAlpha = a; A.txt(g, s, x, y, col, sc); g.restore(); }
  // the stairwell's ground: a flight up from the lower left (`stairs` is where it reaches the landing), then flat
  const groundAt = (x, stairs) => stairs && x < stairs ? FLOOR + (stairs - x) * .7 : FLOOR;
  function well(g, o) {
    blocks(g, 0, 0, W, 150, '#3d3b47', '#2c2a34', '#46444f');
    blocks(g, 0, 150, W, FLOOR, '#5a2128', '#43171d', '#64262d');
    g.fillStyle = '#b88a2a'; g.fillRect(0, 147, W, 4); g.fillStyle = '#7a5a1c'; g.fillRect(0, 151, W, 1);
    stencil(g, o.num, o.numX, 22, 13, '#e8dcc0', .22);
    // the flight overhead: its underside slants down from the upper right, with a steel rail on top
    g.fillStyle = '#1c1a22'; g.beginPath(); g.moveTo(o.overFrom, 0); g.lineTo(W, 0); g.lineTo(W, 18); g.lineTo(o.overFrom + 150, 18 + 150 * .2); g.closePath(); g.fill();
    // the lamp: a caged bulb in a pool of warm light
    const lx = o.lamp;
    g.fillStyle = '#22202a'; g.fillRect(lx - 7, 30, 14, 4); g.fillStyle = '#fff0b8'; g.fillRect(lx - 4, 34, 8, 8); g.fillStyle = '#4a4a5a'; for (const dx of [-5, -1, 3]) g.fillRect(lx + dx, 34, 1, 9); g.fillRect(lx - 5, 42, 11, 1);
    glow(g, lx, 40, 190, '#ffd890', .22); glow(g, lx, 38, 30, '#fff4c8', .6);
    // the landing: its top in light, a yellow nosing, its edge in shadow
    const st = o.stairs || 0;
    g.fillStyle = '#5c5966'; g.fillRect(st, FLOOR, W - st, 6); g.fillStyle = '#c9a227'; g.fillRect(st, FLOOR, W - st, 2);
    g.fillStyle = '#25232c'; g.fillRect(st, FLOOR + 6, W - st, H - FLOOR - 6);
    if (st) {   // the flight up to it, step by step, with its own nosings and a rail
      for (let x = 0; x < st; x += 16) {
        const y = groundAt(x + 16, st);
        g.fillStyle = '#5c5966'; g.fillRect(x, y, 16, 4); g.fillStyle = '#c9a227'; g.fillRect(x, y, 16, 1);
        g.fillStyle = '#25232c'; g.fillRect(x, y + 4, 16, H);
      }
      g.fillStyle = '#8a93a6'; for (let x = 0; x < st + 30; x += 2) g.fillRect(x, groundAt(x, st) - 40, 2, 2);
      for (const x of [12, 76, 140]) { g.fillStyle = '#5a6070'; g.fillRect(x, groundAt(x, st) - 40, 2, 40); }
    }
  }
  // the edge of the picture: a soft vignette
  function vignette(g, a = .55) {
    const gr = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 300); gr.addColorStop(0, 'rgba(8,6,12,0)'); gr.addColorStop(1, `rgba(8,6,12,${a})`);
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }

  // ---------- the cabinet: BREAK GLASS IN CASE OF RUGMERGENCY ----------
  const CAB = { x: 300, y: 172, w: 60, h: 62 };
  const SHARDS = (() => { const r = rng(7), list = []; for (let i = 0; i < 22; i++) list.push({ x: CAB.x + 6 + r() * (CAB.w - 12), y: CAB.y + 8 + r() * (CAB.h - 16), vx: (r() - .3) * 220, vy: -60 - r() * 140, s: 2 + Math.floor(r() * 3), spin: r() * 6 }); return list; })();
  function cabinet(g, t, glassAt, takenAt) {
    const { x, y, w, h } = CAB;
    // the plate over it, in the game's letters
    words(g, () => {
      const cx = x / 2 + w / 4;
      A.rect(g, cx - 50, y / 2 - 26, 100, 22, '#c8c0a8'); A.rect(g, cx - 49, y / 2 - 25, 98, 20, '#a61f1a');
      A.txt(g, 'BREAK GLASS IN CASE OF', x / 2 + w / 4, y / 2 - 23, '#fff6e2', 1, 'center');
      A.txt(g, 'RUGMERGENCY', x / 2 + w / 4, y / 2 - 16, '#ffd44a', 2, 'center');
    });
    // the box: red steel, a dark back, the katana on two pegs
    g.fillStyle = '#1a1418'; g.fillRect(x - 2, y - 2, w + 4, h + 4);
    g.fillStyle = '#b52a22'; g.fillRect(x, y, w, h); g.fillStyle = '#e04a3a'; g.fillRect(x, y, w, 2); g.fillRect(x, y, 2, h);
    g.fillStyle = '#26202a'; g.fillRect(x + 6, y + 6, w - 12, h - 12);
    if (t < takenAt) {
      g.fillStyle = '#4a4a5a'; g.fillRect(x + 12, y + 30, 3, 6); g.fillRect(x + w - 15, y + 30, 3, 6);
      g.fillStyle = '#1c1c28'; g.fillRect(x + 9, y + 28, 14, 3); g.fillStyle = '#e3a733'; g.fillRect(x + 22, y + 26, 3, 7);
      g.fillStyle = '#c4ccda'; g.fillRect(x + 25, y + 28, 26, 3); g.fillStyle = '#eef2fa'; g.fillRect(x + 25, y + 28, 26, 1);
    }
    // the glass: whole, with a sheen; then broken, a ragged edge left in the frame
    if (t < glassAt) {
      g.save(); g.globalAlpha = .28; g.fillStyle = '#9fd8ff'; g.fillRect(x + 6, y + 6, w - 12, h - 12); g.restore();
      g.save(); g.globalAlpha = .55; g.fillStyle = '#e8f6ff'; for (let i = 0; i < 10; i++) g.fillRect(x + 12 + i, y + 40 - i * 2, 2, 2); g.restore();
    } else {
      g.fillStyle = '#bfe4ff'; const r = rng(3);
      for (let i = 0; i < 14; i++) { const e = i % 4, k = r(); const px = e < 2 ? x + 6 + k * (w - 12) : e === 2 ? x + 6 : x + w - 9, py = e === 0 ? y + 6 : e === 1 ? y + h - 9 : y + 6 + k * (h - 12); g.fillRect(px, py, 3, 3); }
      const k = t - glassAt;
      if (k < .12) { g.save(); g.globalAlpha = 1 - k / .12; g.fillStyle = '#ffffff'; g.fillRect(x, y, w, h); g.restore(); }
    }
  }
  function shards(g, t, glassAt) {
    const k = t - glassAt; if (k < 0) return;
    for (const s of SHARDS) {
      let px = s.x + s.vx * k, py = s.y + s.vy * k + 420 * k * k;
      if (py > FLOOR) { const tl = (-s.vy + Math.sqrt(s.vy * s.vy + 4 * 420 * (FLOOR - s.y))) / 840; px = s.x + s.vx * tl; py = FLOOR - 1; }
      g.fillStyle = (Math.floor(k * 20 + s.spin) % 3) && py < FLOOR - 1 ? '#e8f6ff' : '#8fc4e8'; g.fillRect(Math.round(px), Math.round(py), s.s, py < FLOOR - 1 ? s.s : 1);
    }
  }

  // ---------- the Rugmergency ----------
  function rugScene(opt) {
    const fan = M.FANFARES[opt.fanfare](M.KEYSHIFT[opt.cue]), L = M.seconds(fan);
    const T = { shot1: .9, shot2: 1.08, die1: 1.24, walk: 1.35, walkEnd: 1.85, shoot: 1.95, glass: 2.03, step: 2.4, stepEnd: 2.62, grab: 2.62, raise: 2.78 };
    T.back = T.raise + L; T.e2 = T.back + .15; T.slash = T.back + .78; T.cut = T.slash + .08; T.end = T.back + 2.1;
    const bx = t => t < .8 ? lerp(40, 150, t / .8) : t < T.walk ? 150 : t < T.walkEnd ? lerp(150, 215, span(t, T.walk, T.walkEnd)) : t < T.step ? 215 : lerp(215, 262, span(t, T.step, T.stepEnd));
    const shotX = (t, t0) => 150 + SM.x + (t - t0) * 572;
    const e1 = t => [lerp(520, 330, ease(span(t, .15, .9))), 200 + Math.sin(t * 4) * 5];
    const e2 = t => { const k = span(t, T.e2, T.slash + .02); return [lerp(520, 300, k), lerp(150, 196, ease(k))]; };
    const cues = [
      [0, () => playCue(opt.cue, 1, true)],
      [T.shot1, () => Snd.play('shot')], [T.shot2, () => Snd.play('shot')], [T.die1, () => Snd.play('poof')],
      [T.shoot, () => Snd.play('shot')],
      [T.glass, () => { Snd.music(null, { hard: true }); FX.glass(); }],
      [T.grab, () => FX.shing()],
      [T.raise, () => { Snd.registerTrack('stairFanfare', fan); Snd.music('stairFanfare', { slam: true }); }],
      [T.back, () => playCue(opt.cue, 2, true)],
      [T.slash, () => Snd.play('slash')], [T.cut, () => Snd.play('poof')]
    ];
    function draw(g, t) {
      well(g, { num: '7', numX: 30, lamp: 240, overFrom: 220 });
      cabinet(g, t, T.glass, T.grab);
      shards(g, t, T.glass);
      // the first carpshit, shot twice
      if (t < T.die1) carp(g, ...e1(t), t, -1);
      soul(g, 330, 196, span(t, T.die1, T.die1 + 1));
      for (const [t0, hitAt] of [[T.shot1, T.die1], [T.shot2, T.die1]]) if (t >= t0 && t < hitAt && shotX(t, t0) < e1(t)[0]) bolt(g, shotX(t, t0), FLOOR + SM.y);
      if (t >= T.shoot && t < T.glass) bolt(g, 215 + SM.x + (t - T.shoot) * 572, FLOOR + SM.y);
      // him
      const x = bx(t);
      if (t >= T.raise && t < T.back) {
        // the item get: the stairwell dims, gold rays turn behind him, the blade glints
        const k = t - T.raise;
        g.save(); g.globalAlpha = .62 * Math.min(1, k / .15); g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H); g.restore();
        const cx = 300, cy = 150;
        g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .2 * Math.min(1, k / .2);
        for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + k * .6; g.fillStyle = i % 2 ? '#ffd44a' : '#ff9a3a'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a - .1) * 400, cy + Math.sin(a - .1) * 400); g.lineTo(cx + Math.cos(a + .1) * 400, cy + Math.sin(a + .1) * 400); g.closePath(); g.fill(); }
        g.restore();
        glow(g, cx, cy, 110, '#ffd890', .35);
        const hop = k < .12 ? Math.round(Math.sin(k / .12 * Math.PI) * 6) : 0;
        drawSide(g, RAISED, cx, FLOOR - hop, RF);
        // a twinkle running up the blade and a star at its tip
        const tipX = cx - 21, tipY = FLOOR - hop - RF.y + 2, run = (k * 1.4) % 1;
        glow(g, tipX, tipY + 28 * (1 - run), 10, '#ffffff', .8);
        const tw = Math.sin(k * 14) * .5 + .5; g.fillStyle = '#ffffff'; g.fillRect(tipX - 1, tipY - 6 - tw * 3, 2, 12 + tw * 6); g.fillRect(tipX - 6 - tw * 3, tipY - 1, 12 + tw * 6, 2);
        topBanner(g, 'RUGMERGENCY KATANA', span(t, T.raise + .25, T.back - .05));
      } else if (t >= T.back) {
        const k = t - T.back;
        const pose = t >= T.slash ? (t < T.slash + .07 ? SIDE.wind : t < T.slash + .3 ? SIDE.cut : SIDE.aim) : SIDE.aim;
        drawSide(g, pose, 300, FLOOR);
        if (t < T.cut) carp(g, ...e2(t), t, -1, .3);
        else { carpHalves(g, 352, 196, span(t, T.cut, T.cut + .6)); soul(g, 352, 196, span(t, T.cut + .1, T.cut + 1.1)); }
        if (t >= T.slash && t < T.slash + .25) {   // the swoosh
          const s = (t - T.slash) / .25; g.save(); g.translate(306, FLOOR - 30); g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 36, -1.4 + s * .5, .9 + s * .5); g.stroke(); g.strokeStyle = '#7fd4ff'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 31, -1.2 + s * .5, .7 + s * .5); g.stroke(); g.restore();
        }
        if (k < 1.6 && t < T.slash) prompt(g, 'SLASH');
      } else {
        let pose, firing = false;
        if (t < .8 || (t >= T.walk && t < T.walkEnd) || (t >= T.step && t < T.stepEnd)) pose = runFrame(BARE, t);
        else if (t >= T.grab) pose = BARE.wind;
        else { pose = BARE.aim; firing = [T.shot1, T.shot2, T.shoot].some(s => t >= s && t < s + .06); }
        drawSide(g, pose, x, FLOOR);
        if (firing) muzzle(g, x + SM.x, FLOOR + SM.y);
        if (t >= T.glass && t < T.raise) bark(g, '!', 1);
      }
      vignette(g);
    }
    return { name: 'rug', T, end: T.end, cues, draw, label: t => t < T.glass ? 'the climb, no katana yet' : t < T.raise ? 'glass: the music stops dead' : t < T.back ? fan.name : 'the music slams back in, a step up; slash at once' };
  }

  // ---------- the hall, from behind: the game's renderer and Accounts Payable's set ----------
  const VX = 120, HY = 52, FN = 131, CN = -12, HW = 112, ZN = -.07;
  const sc = z => 1 / (1 + 2 * z), PX = (u, z) => VX + u * HW * sc(z), FY = z => HY + (FN - HY) * sc(z), CY = z => HY - (HY - CN) * sc(z), YH = (z, h) => FY(z) - h * (FY(z) - CY(z));
  const PIC = 2, PW = 480, PH = 270, UNIT = 76, WK = PIC / UNIT, WC = (FN - CN) * WK, WHW = HW * WK, WZ0 = .6 * PW / UNIT, WZ = 2 * WZ0;
  const world = (u, z, h) => [u * WHW, h * WC, WZ0 * (1 + 2 * z)];
  const SET = { E: (FN - HY) * WK, C: WC, HW: WHW, f: .6, cy: HY * PIC / PH, rug: .3 * WHW, rugEdge: .04 * WHW, skirt: .03 * WC, rail: [.3 * WC, .33 * WC], post: WZ / 6, panel: WZ * .4, fog: [WZ0 * 3.4, WZ0 * 12] };
  const LOOK0 = { lo: [.11, .095, .135], hi: [.19, .18, .23], sk: [.07, .065, .085], co: [.17, .16, .2], ce: [.24, .24, .27], ti: [.13, .14, .19], sh: .5, lamp: [1.75, 1.55, 1.2] };
  let R3 = null, SETS = null;
  const LIT = canvas(PW, PH).getContext('2d', { willReadFrequently: true }), GLO = canvas(PW, PH).getContext('2d', { willReadFrequently: true });
  // The hall doesn't move (a still camera, steady lights), so each picture of it is rendered once, with him in each
  // pose from behind (or not there), and kept: phones get a cheap frame, and the renderer is made at load, not mid-scene.
  const HALLS = new Map();
  function hall(t, pose) {
    let img = HALLS.get(pose || 'none');
    if (!img) { img = renderHall(0, pose); HALLS.set(pose || 'none', img); }
    return img;
  }
  function renderHall(t, pose, dist = .3) {
    const HALL = canvas(W, H), HG = HALL.getContext('2d');
    if (!R3) { R3 = UnrugRender.create(PW, PH, SET); SETS = UnrugSets({ VX, HY, sc, PX, FY, CY, YH }); }
    SETS.time(t);
    const items = SETS.items(dist + ZN - .35, dist + 3.5, () => 'ap', () => false);
    const want = [];
    for (const it of items) { const z = it.w - dist; if (z < 1.3 && z > -.1) SETS.lights(it, z, (u, zz, h, r, g, b) => want.push([zz, u, h, r, g, b])); }
    want.sort((a, b) => a[0] - b[0]);
    for (const [z, u, h, r, g, b] of want.slice(0, 8)) { const [x, y, wz] = world(u, z, h); R3.light(x, y, wz, r, g, b); }
    R3.frame(t, { scroll: dist * WZ, rug: 0, power: 1, dark: false, house: 1, steady: true, rail: UnrugRender.lin('#3a5a8a'), look: Object.assign({}, LOOK0, SETS.view('ap').look || {}), edge: null, edgeGlow: 0 });
    for (const x of [LIT, GLO]) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, PW, PH); x.setTransform(PIC, 0, 0, PIC, 0, 0); }
    const back = items.map(it => [it.w - dist, it]).filter(([z]) => z < 3.5).sort((a, b) => b[0] - a[0]);
    for (const [z, it] of back) SETS.draw(it, z, LIT, GLO);
    if (pose) { LIT.setTransform(1, 0, 0, 1, 0, 0); LIT.drawImage(pose, 240 - BF.x, FY(0) * PIC - BF.y); }
    R3.layer(LIT.getImageData(0, 0, PW, PH).data, GLO.getImageData(0, 0, PW, PH).data);
    HG.setTransform(1, 0, 0, 1, 0, 0); R3.present(HG, 0, 0);
    return HALL;
  }

  // ---------- the door: 13 — ACCOUNTING ----------
  // The stairwell's end wall turns toward us at the right; the door is in it, seen at an angle. Kicked, it swings in
  // and the office's light spills out across the landing.
  const DOOR = { x0: 436, x1: 468, top0: 140, top1: 128, bot0: 240, bot1: 246 };
  function endWall(g, open, plain) {
    g.fillStyle = '#2e2c36'; g.beginPath(); g.moveTo(430, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(430, 246); g.closePath(); g.fill();
    g.fillStyle = '#25232c'; for (let y = 8; y < 240; y += 12) g.fillRect(430, y + (y - 8) * .02, 50, 1);
    if (plain) return;
    const d = DOOR;
    const quad = (pts, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.closePath(); g.fill(); };
    quad([[d.x0 - 3, d.top0 - 4], [d.x1 + 3, d.top1 - 5], [d.x1 + 3, d.bot1], [d.x0 - 3, d.bot0]], '#8a8478');
    quad([[d.x0 - 1, d.top0 - 2], [d.x1 + 1, d.top1 - 3], [d.x1 + 1, d.bot1], [d.x0 - 1, d.bot0]], '#14121a');   // the frame
    if (open > 0) {
      quad([[d.x0, d.top0], [d.x1, d.top1], [d.x1, d.bot1], [d.x0, d.bot0]], '#fff1c0');   // the office's light
      glow(g, 452, 190, 120, '#ffe8a8', .55 * open);
      g.save(); g.globalAlpha = .4 * open; g.fillStyle = '#ffe8a8'; g.beginPath(); g.moveTo(d.x0, d.bot0); g.lineTo(d.x1, d.bot1); g.lineTo(330, 246); g.lineTo(380, 240); g.closePath(); g.fill(); g.restore();
    }
    // the door leaf: closed it fills the frame; open it swings in, narrowing to its edge against the far side
    const k = 1 - clamp(open, 0, 1), lx = lerp(d.x0 + 2, d.x1, k);   // closed it reaches the far jamb; kicked in, a sliver at the near one
    if (k > .02) {
      quad([[d.x0, d.top0], [lx, lerp(d.top0 - 6, d.top1, k)], [lx, lerp(d.bot0 + 2, d.bot1, k)], [d.x0, d.bot0]], '#64719a');
      quad([[d.x0 + 2, d.top0 + 6], [lerp(d.x0 + 2, lx - 2, 1), lerp(d.top1, d.top0, k) + 4], [lx - 2, lerp(d.top1, d.top0, k) + 22], [d.x0 + 2, d.top0 + 24]], '#a8c8e8');
      g.fillStyle = '#c4ccda'; g.fillRect(Math.round(lerp(d.x0 + 4, lx - 6, .7)), 190, 3, 4);   // the handle
    }
  }
  function doorSign(g, x = 160, y = 50) {
    words(g, () => {
      A.rect(g, x - 1, y - 1, 46, 26, '#1a1418'); A.rect(g, x, y, 44, 24, '#d8d0b8');
      A.txt(g, '13', x + 22, y + 3, '#1a1418', 2, 'center');
      A.rect(g, x + 14, y + 15, 16, 1, '#1a1418');   // the dash
      A.txt(g, 'ACCOUNTING', x + 22, y + 18, '#1a1418', 1, 'center');
    });
  }
  // the kicked-in door, seen from the front, flying at the camera (the fallback)
  function doorFront(g, cx, cy, w, h, rot) {
    g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(w / 60, h / 120);
    g.fillStyle = '#14121a'; g.fillRect(-31, -61, 62, 122); g.fillStyle = '#4a5470'; g.fillRect(-30, -60, 60, 120);
    g.fillStyle = '#5a6684'; g.fillRect(-30, -60, 60, 3); g.fillStyle = '#3a4258'; g.fillRect(-26, -50, 52, 2); g.fillRect(-26, 10, 52, 2);
    g.fillStyle = '#9fd8ff'; g.fillRect(-10, -44, 20, 26); g.fillStyle = '#1a1418'; g.fillRect(-10, -31, 20, 1);
    g.fillStyle = '#d8d0b8'; g.fillRect(-14, -12, 28, 14); A.txt(g, '13', -7, -10, '#1a1418', 2);
    g.fillStyle = '#c4ccda'; g.fillRect(-26, 2, 52, 4);   // the push bar
    g.fillStyle = '#5a3a20'; g.fillRect(18, 30, 10, 6); g.fillStyle = '#2a1a10'; g.fillRect(20, 31, 6, 4);   // a boot print
    g.restore();
  }

  // the far face during the swing: the end wall square on, the doorway open onto the hall
  const BUF = canvas(W, H), FACE = canvas(W, H), FG = FACE.getContext('2d'), SIDEV = canvas(W, H), SG = SIDEV.getContext('2d');
  const DW = { x: 165, y: 48, w: 150, h: 214 }, HS0 = .8;
  function face(g, hallImg, push) {
    // push 0..1: the camera goes through the doorway; the wall grows past the screen and the hall comes up to full size
    const S = lerp(1, 3.6, push), ax = 240, ay = 155;
    const tx = x => ax + (x - ax) * S, ty = y => ay + (y - ay) * S;
    const hs = lerp(HS0, 1, push), hw = W * hs, hh = H * hs, hb = lerp(DW.y + DW.h, H, push);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#2e2c36'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(ax, ay); g.scale(S, S); g.translate(-ax, -ay);
    blocks(g, -200, -100, 700, 270, '#34323d', '#25232c', '#3c3a46');
    g.fillStyle = '#5c5966'; g.fillRect(-200, 262, 900, 20); g.fillStyle = '#c9a227'; g.fillRect(-200, 262, 900, 2);
    g.restore();
    const dx0 = tx(DW.x), dy0 = ty(DW.y), dx1 = tx(DW.x + DW.w), dy1 = ty(DW.y + DW.h);
    g.fillStyle = '#14121a'; g.fillRect(dx0 - 6 * S, dy0 - 6 * S, dx1 - dx0 + 12 * S, dy1 - dy0 + 6 * S);
    g.save(); g.beginPath(); g.rect(dx0, dy0, dx1 - dx0, dy1 - dy0); g.clip();
    g.imageSmoothingEnabled = false; g.drawImage(hallImg, 240 - hw / 2, hb - hh, hw, hh);
    g.restore();
    glow(g, 240, dy1 - 20, 220 * S, '#ffe8a8', .18 * (1 - push));
    g.restore();
  }
  // a cube turn: the side view swings away to the left as the far face comes round from the right, column by column
  function swingDraw(g, from, to, p) {
    const e = ease(p), seam = W * (1 - e), near = 1 + .12 * Math.sin(Math.PI * e);
    g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x++) {
      let src, sx, s;
      if (x < seam) { const u = x / Math.max(1, seam); src = from; sx = Math.min(W - 1, Math.floor(e * W * .35 + u * W * (1 - e * .35))); s = lerp(1 - .3 * e, near, u); }
      else { const u = (x - seam) / Math.max(1, W - seam); src = to; sx = Math.floor(u * W * (1 - (1 - e) * .35)); s = lerp(near, 1 - .3 * (1 - e), u); }
      const h = H * s; g.drawImage(src, sx, 0, 1, H, x, (H - h) / 2, 1, h);
    }
    g.save(); g.globalAlpha = .35 * Math.sin(Math.PI * e); g.fillStyle = '#000'; g.fillRect(0, 0, seam, H); g.restore();
  }
  // ---------- the door in the long wall: he turns his back to us and walks up into it ----------
  const LW = { cx: 364, x: 336, y: 136, w: 56, h: 104 };
  const LWH = .42;   // the hall's size seen through the doorway, before the camera goes through
  // the hall in the doorway: drawn at scale hs with its middle at (hx, hb - height/2), clipped to the doorway (dx, dy, dw, dh)
  function hallIn(g, img, hs, hx, hb, clip) {
    g.save(); g.beginPath(); g.rect(...clip); g.clip(); g.fillStyle = '#07050a'; g.fillRect(...clip);
    g.imageSmoothingEnabled = false; g.drawImage(img, hx - W * hs / 2, hb - H * hs, W * hs, H * hs); g.restore();
  }
  function wallDoor(g, t, T, hallImg) {
    const { cx, x, y, w, h } = LW;
    g.fillStyle = '#8a8478'; g.fillRect(x - 5, y - 5, w + 10, h + 5); g.fillStyle = '#14121a'; g.fillRect(x - 3, y - 3, w + 6, h + 3);
    if (t < T.kick) { doorFront(g, cx, y + h / 2, w, h, 0); return; }
    hallIn(g, hallImg, LWH, cx, y + h, [x, y, w, h]);
    glow(g, cx, y + h - 20, 90, '#ffe8a8', .35);
    // the leaf flies in, away from us, down the hall, tumbling
    const k = span(t, T.kick, T.flyEnd);
    if (k < 1) { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); const s = lerp(1, .18, ease(k)); doorFront(g, cx + k * 4, lerp(y + h / 2, y + h * .62, k), w * s, h * s, k * 2.2); g.restore(); }
  }
  function doorScene(opt) {
    const T = { stop: 1.45, brace: 1.98, kick: 2.28, swing: 2.32, turn: .42, push: .3 };
    const beat = opt.entry === 'beat';
    const combo = opt.door === 'combo', wall = opt.door === 'wall' || combo;
    if (combo) Object.assign(T, { face: 1.62, stepEnd: 1.95, brace: 2.05, kick: 2.32, flyEnd: 2.62, fly: 2.34, impact: 2.84, hall: 2.92 });
    else if (wall) Object.assign(T, { face: 1.62, stepEnd: 1.95, brace: 2.05, kick: 2.32, flyEnd: 2.62, push0: 2.52, hall: 3.15 });
    else if (opt.door === 'swing') T.hall = T.swing + T.turn + T.push; else { T.fly = T.kick + .05; T.impact = T.kick + .33; T.hall = T.impact + .08; }
    T.oh = T.hall + .3; T.hush = T.hall + 1.5; T.lift = beat ? T.hush + .1 : T.hall + .15; T.raise = beat ? T.hush + .4 : T.lift; T.banner = T.raise + .05; T.end = T.banner + 3.6;
    const st = 170;
    const stopX = wall ? LW.cx : 392;
    const bx = t => t < T.stop ? lerp(80, stopX, ease(span(t, 0, T.stop)) * .2 + span(t, 0, T.stop) * .8) : stopX;
    const e = t => { const k = span(t, .1, .78); return [lerp(300, bx(.78) + 46, k), lerp(150, groundAt(bx(.78), st) - 44, ease(k))]; };
    const cues = [
      [0, () => playCue(opt.cue, 3, true)],
      [.74, () => Snd.play('slash')], [.8, () => Snd.play('poof')],
      [T.stop, () => { Snd.music(null, { hard: true }); FX.hum(T.kick - T.stop); }],
      [T.brace, () => FX.creak()],
      [T.kick, () => { FX.kick(); if (beat) Snd.music('floorOpen', { slam: true, stems: ['drums', 'bass', 'lead'] }); else Snd.music('floorHall', { slam: true, stems: ['drums', 'bass', 'lead'] }); }],
      ...(combo ? [[T.impact, () => FX.impact()]] : wall ? [[T.push0, () => FX.whoosh()]] : opt.door === 'swing' ? [[T.swing, () => FX.whoosh()]] : [[T.impact, () => FX.impact()]]),
      ...(beat ? [[T.hush, () => Snd.music(null, { hard: true })], [T.raise, () => { Snd.music('floorHall', { slam: true, stems: ['drums', 'bass', 'lead'] }); Snd.play('start'); }]] : [[T.raise, () => Snd.play('start')]])
    ];
    // the side view at time t (him included unless noBull), into g
    function sideView(g, t, noBull) {
      well(g, { num: '13', numX: wall ? 196 : 210, lamp: 300, overFrom: 260, stairs: st });
      const open = t < T.kick ? 0 : ease(span(t, T.kick, T.kick + .14));
      if (wall) { doorSign(g, LW.cx / 2 - 22, 40); wallDoor(g, t, T, hall(0, null)); endWall(g, 0, true); }
      else { doorSign(g); endWall(g, opt.door === 'fly' && t >= T.kick ? 1 : open); }
      if (opt.door === 'fly' && t >= T.kick) { /* the leaf's gone: it's flying at us */ }
      // the carpshit coming down the stairs, cut on his way up
      if (t < .78) carp(g, ...e(t), t, -1, .4);
      else { carpHalves(g, bx(.78) + 46, groundAt(bx(.78), st) - 44, span(t, .8, 1.4)); soul(g, bx(.78) + 46, groundAt(bx(.78), st) - 44, span(t, .85, 1.8)); }
      if (!noBull) {
        const x = bx(t), y = groundAt(x, st);
        let img = SIDE.aim, feet = SF;
        if (t < T.stop) img = t >= .7 && t < .77 ? SIDE.wind : t >= .77 && t < .95 ? SIDE.cut : runFrame(SIDE, t);
        else if (wall && t >= T.face) {
          // his back to us now, a step up to the door, a crouch, and the kick (a lunge on one leg)
          const up = Math.round(4 * ease(span(t, T.face, T.stepEnd)));
          const pose = t >= T.kick ? (t < T.kick + .28 ? BACK.runA : BACK.stand) : t >= T.brace ? BACK.crouch : (t < T.stepEnd ? BACK[Math.floor(t * 9) % 2 ? 'runA' : 'runB'] : BACK.stand);
          const lunge = t >= T.kick && t < T.kick + .28 ? -3 : 0;
          drawSide(g, pose, x, y - up + lunge, BF); img = null;
        }
        else if (t >= T.kick) { img = MOVE.kick; feet = MF; }
        else if (t >= T.brace) { img = MOVE.brace; feet = MF; }
        else img = Math.floor(t * 1.3) % 2 ? SIDE.idle : SIDE.aim;
        if (img) drawSide(g, img, x, y, feet);
      }
      if (!wall && t >= T.kick && t < T.kick + .5) {   // dust off the door frame
        const k = (t - T.kick) / .5, r = rng(11);
        for (let i = 0; i < 14; i++) { const a = r() * Math.PI - Math.PI / 2, v = 30 + r() * 70; g.save(); g.globalAlpha = (1 - k) * .7; g.fillStyle = '#b8b0a0'; g.fillRect(Math.round(440 - Math.cos(a) * v * k), Math.round(200 + Math.sin(a) * v * k), 3, 3); g.restore(); }
      }
      vignette(g);
    }
    function draw(g, t) {
      const pose = t >= T.lift ? BACK.aim : t >= T.hall ? BACK.stand : null;
      if (t < (combo ? T.kick + .02 : wall ? T.push0 : opt.door === 'swing' ? T.swing : T.kick)) {
        sideView(g, t);
      } else if (combo && t < T.hall) {
        // the reverse shot: from inside the hall, looking back at the doorway, him in it, the door flying at us;
        // held a little longer than the side-on version so the two cuts don't feel choppy
        g.fillStyle = '#0b0910'; g.fillRect(0, 0, W, H);
        const d = { x: 180, y: 46, w: 120, h: 204 };
        g.fillStyle = '#3d3b47'; g.fillRect(d.x, d.y, d.w, d.h); g.fillStyle = '#5a2128'; g.fillRect(d.x, d.y + 120, d.w, d.h - 120);
        g.fillStyle = '#b88a2a'; g.fillRect(d.x, d.y + 118, d.w, 3); glow(g, 240, d.y + 20, 120, '#ffd890', .35);
        g.fillStyle = '#5c5966'; g.fillRect(d.x, d.y + d.h - 6, d.w, 6);
        drawSide(g, FRONT, 240, d.y + d.h - 4, VF);
        g.fillStyle = '#14121a'; g.fillRect(d.x - 10, d.y - 10, d.w + 20, 10); g.fillRect(d.x - 10, d.y, 10, d.h); g.fillRect(d.x + d.w, d.y, 10, d.h);
        const k = span(t, T.fly, T.impact), kk = easeIn(k);
        doorFront(g, 240, lerp(d.y + d.h / 2, 135, kk), lerp(d.w - 6, 640, kk), lerp(d.h - 4, 1100, kk), Math.sin(k * 7) * .12 * (1 - k) + k * .06);
        if (t >= T.impact) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); }
      } else if (wall && t < T.hall) {
        // the camera follows him up through the doorway: the stairwell grows past the screen faster than the hall does
        const k = ease(span(t, T.push0, T.hall)), S = Math.exp(Math.log(9) * k), hs = Math.exp(Math.log(LWH) * (1 - k));
        const cx = lerp(LW.cx, 240, k), cy = lerp(LW.y + LW.h / 2, 135, k);
        if (SIDEV.made !== scene) { SG.setTransform(1, 0, 0, 1, 0, 0); SG.clearRect(0, 0, W, H); sideView(SG, T.push0, true); SIDEV.made = scene; }
        g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H);
        g.save(); g.imageSmoothingEnabled = false; g.translate(cx, cy); g.scale(S, S); g.translate(-LW.cx, -(LW.y + LW.h / 2)); g.drawImage(SIDEV, 0, 0); g.restore();
        const dx = cx + (LW.x - LW.cx) * S, dy = cy + (LW.y - LW.y - LW.h / 2) * S;
        hallIn(g, hall(t, null), hs, cx, lerp(LW.y + LW.h, H, k), [dx, dy, LW.w * S, LW.h * S]);
        const bxp = lerp(LW.cx, 240, k), byp = lerp(FLOOR - 4, FY(0) * PIC, k);
        drawSide(g, BACK[Math.floor(t * 9) % 2 ? 'runA' : 'runB'], bxp, byp, BF);
      } else if (opt.door === 'swing' && t < T.hall) {
        const turnK = span(t, T.swing, T.swing + T.turn), pushK = span(t, T.swing + T.turn, T.hall);
        const hallImg = hall(t, null);
        if (turnK < 1) {
          if (SIDEV.made !== scene) { SG.setTransform(1, 0, 0, 1, 0, 0); SG.clearRect(0, 0, W, H); sideView(SG, T.swing, true); face(FG, hallImg, 0); SIDEV.made = scene; }
          swingDraw(g, SIDEV, FACE, turnK);
        } else face(g, hallImg, ease(pushK));
        // him, carried round: from where he stood to the middle, side on turning to his back halfway
        const k = ease(turnK), x = lerp(392 - 392 * .35 * k, 240, k), y = lerp(FLOOR, FY(0) * PIC, k);
        for (let i = 2; i >= 0; i--) {
          const kk = ease(clamp(turnK - i * .06, 0, 1)), gx = lerp(392 - 392 * .35 * kk, 240, kk);
          const img = kk < .5 ? MOVE.kick : turnK < 1 ? BACK.stand : BACK[Math.floor(t * 9) % 2 ? 'runA' : 'runB'];
          if (kk < .5) drawSide(g, img, gx, lerp(FLOOR, FY(0) * PIC, kk), MF, 1, i ? .25 : 1);
          else drawSide(g, img, gx, lerp(FLOOR, FY(0) * PIC, kk), BF, 1, i ? .25 : 1);
        }
        void x; void y;
      } else if (opt.door === 'fly' && t < T.hall) {
        sideView(g, t);
        const k = span(t, T.fly, T.impact), kk = easeIn(k);
        doorFront(g, lerp(452, 240, kk), lerp(192, 135, kk), lerp(28, 560, kk), lerp(100, 1100, kk), lerp(-.5, .08, k) + Math.sin(k * 9) * .05);
        if (t >= T.impact) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); }
      } else {
        const img = hall(t, pose);
        const [sx, sy] = opt.door === 'fly' || combo ? shakeAt(t, T.hall, .3, 6) : [0, 0];
        g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H); g.drawImage(img, sx, sy);
        if (beat && t >= T.oh && t < T.hush) bark(g, '...OH.', span(t, T.oh, T.oh + .6));
        if (t >= T.banner && t < T.banner + 1.6) topBanner(g, 'THE 13TH FLOOR', span(t, T.banner, T.banner + 1.6));
        else if (t >= T.banner + 1.6 && t < T.banner + 3.2) topBanner(g, 'FREE 90 SOULS', span(t, T.banner + 1.6, T.banner + 3.2));
        if (t >= T.raise && t < T.raise + .08) words(g, () => { g.save(); g.globalAlpha = .5; A.rect(g, 0, 0, 240, 135, '#ffffff'); g.restore(); });
      }
      const [sx, sy] = shakeAt(t, T.kick, .25, 4);
      if (sx || sy) { BUF.getContext('2d').drawImage(g.canvas, 0, 0); g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H); g.drawImage(BUF, sx, sy); }
    }
    return { name: 'door', T, end: T.end, cues, draw, label: t => t < T.stop ? 'the last flight, the cue at full tilt' : t < T.kick ? (wall ? 'the music stops; he turns to the door and braces' : 'half a second: the music stops') : t < T.hall ? (combo ? 'the reverse shot: the door flies at us; cut on the impact' : wall ? 'he walks up into it; the camera follows him through' : opt.door === 'swing' ? 'the swing, then through the door' : 'the door at the camera, cut on the impact') : t < T.hush ? (beat ? 'the muzak: "...oh."' : 'the band from the kick') : t < T.raise ? 'a beat of silence: blaster up' : 'blaster up: the band, THE 13TH FLOOR' };
  }

  // ---------- new sounds, synthesized here (the game's own play through Snd) ----------
  const FX = (() => {
    let ctx = null, bus = null;
    function init() { if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; } const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ctx = new AC(); bus = ctx.createGain(); bus.gain.value = .55; bus.connect(ctx.destination); }
    const ok = () => ctx && ctx.state === 'running' && !muted();
    function noise(t, dur, vol, type, f, q = 1, to) {
      const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(); s.buffer = b; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur); fl.Q.value = q;
      const gn = ctx.createGain(); gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(fl); fl.connect(gn); gn.connect(bus); s.start(t); s.stop(t + dur);
    }
    function tone(t, type, f, dur, vol, to) {
      const o = ctx.createOscillator(), gn = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
      gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(gn); gn.connect(bus); o.start(t); o.stop(t + dur + .02);
    }
    return {
      init,
      glass() { if (!ok()) return; const t = ctx.currentTime; noise(t, .5, .6, 'highpass', 3500); noise(t, .12, .5, 'bandpass', 1800, 2); for (let i = 0; i < 9; i++) tone(t + .02 + Math.random() * .45, 'sine', 2600 + Math.random() * 3200, .12, .12); },
      shing() { if (!ok()) return; const t = ctx.currentTime; tone(t, 'triangle', 1900, .5, .14, 2600); tone(t, 'sine', 3800, .4, .06, 5200); },
      hum(dur) { if (!ok()) return; const t = ctx.currentTime, o = ctx.createOscillator(), gn = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 120; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400; gn.gain.setValueAtTime(.0001, t); gn.gain.linearRampToValueAtTime(.05, t + .2); gn.gain.setValueAtTime(.05, t + dur - .05); gn.gain.linearRampToValueAtTime(.0001, t + dur); o.connect(lp); lp.connect(gn); gn.connect(bus); o.start(t); o.stop(t + dur + .05); },
      creak() { if (!ok()) return; const t = ctx.currentTime; tone(t, 'sawtooth', 90, .18, .08, 60); },
      kick() { if (!ok()) return; const t = ctx.currentTime; tone(t, 'sine', 140, .35, .9, 38); noise(t, .45, .8, 'lowpass', 2400, 1, 200); noise(t + .02, .25, .5, 'bandpass', 900, 3); noise(t + .18, .35, .35, 'highpass', 2500); },
      whoosh() { if (!ok()) return; const t = ctx.currentTime; noise(t, .7, .4, 'bandpass', 300, 1.5, 3200); },
      impact() { if (!ok()) return; const t = ctx.currentTime; tone(t, 'sine', 110, .5, .9, 30); noise(t, .6, .9, 'lowpass', 3000, 1, 120); noise(t, .2, .6, 'highpass', 4000); }
    };
  })();

  // ---------- playing, scrubbing and the controls ----------
  const $ = id => document.getElementById(id);
  const muted = () => $('mute').getAttribute('aria-pressed') === 'true';
  for (const k in M.CUES) for (const id in M.CUES[k].tracks) Snd.registerTrack(id, M.CUES[k].tracks[id]);
  // a cue's section: slammed in from the top (slam), or moved to on the next bar (more stems on the same track, or the
  // next track, as Neon's heavy version is)
  function playCue(key, n, slam) {
    const [id, stems] = M.CUES[key].sections[n];
    if (slam || Snd.musicState.playing !== id && !Snd.musicState.pending) Snd.music(id, slam ? { slam: true, stems } : { boundary: 'bar', stems });
    else if (Snd.musicState.playing === id) Snd.stems(stems);
    else Snd.music(id, { boundary: 'bar', stems });
  }  // The playable climb (climb.js) loads this file for its art, sounds and music, and has no scrubber: hand it the pieces.
  window.StairArt = { W, H, clamp, lerp, ease, easeIn, span, rng, shakeAt, SIDE, BARE, MOVE, RAISED, FRONT, SF, MF, RF, VF, SM, BACK, BF,
    drawSide, runFrame, CW, CH, carp, carpHalves, bolt, glow, soul, muzzle, words, topBanner, prompt, bark, blocks, stencil, vignette,
    CAB, cabinet, shards, hall, FY, PIC, endWall, doorSign, doorFront, FX, playCue };
  if (!$('scrub')) return;

  const opt = { scene: 'rug', cue: 'flight', fanfare: 3, door: 'combo', entry: 'beat', slow: false };
  let scene = null, t = 0, playing = false, last = 0, nextCue = 0, drawn = 0;
  function build() { scene = (opt.scene === 'rug' ? rugScene : doorScene)(Object.assign({}, opt)); $('scrub').max = scene.end.toFixed(2); }
  function frame() {
    out.setTransform(1, 0, 0, 1, 0, 0); out.clearRect(0, 0, W, H);
    scene.draw(out, Math.min(t, scene.end));
    $('scrub').value = t.toFixed(2); $('time').textContent = t.toFixed(2) + ' s'; $('beat').textContent = scene.label(t);
  }
  function loop(now) {
    if (!playing) return;
    // the first animation frame can be stamped a touch before Play was pressed: never run the clock backwards
    const dt = clamp((now - last) / 1000, 0, .05) * (opt.slow ? .25 : 1); last = Math.max(last, now); t += dt;
    if (!opt.slow) while (nextCue < scene.cues.length && scene.cues[nextCue][0] <= t) { try { scene.cues[nextCue][1](); } catch (e) { console.error(e); } nextCue++; }
    if (t >= scene.end) { t = scene.end; stop(false); }
    if (playing) requestAnimationFrame(loop);
    if (!playing || now - drawn >= 30) { drawn = now; try { frame(); } catch (e) { console.error(e); } }
  }
  function unlock() { Snd.init(); FX.init(); }
  function play() {
    unlock(); build(); t = 0; nextCue = 0; playing = true; last = performance.now(); $('play').textContent = 'Stop';
    if (opt.slow) Snd.music(null, { hard: true });
    requestAnimationFrame(loop);
  }
  function stop(cut = true) { playing = false; $('play').textContent = 'Play'; if (cut) Snd.music(null, { hard: true }); }
  $('play').onclick = () => playing ? stop() : play();
  $('scrub').oninput = () => { if (playing) stop(); t = +$('scrub').value; frame(); };
  const showMute = () => { $('mute').textContent = muted() ? 'Sound off' : 'Sound on'; };
  $('mute').onclick = () => { const on = $('mute').getAttribute('aria-pressed') !== 'true'; $('mute').setAttribute('aria-pressed', on); if (Snd.muted !== on) Snd.toggle(); showMute(); };
  if (Snd.muted) $('mute').setAttribute('aria-pressed', 'true');
  showMute();
  // segmented option rows: data-opt names the option, each button's data-v its value
  for (const row of document.querySelectorAll('[data-opt]')) {
    const key = row.dataset.opt;
    for (const b of row.querySelectorAll('button')) b.onclick = () => {
      const v = b.dataset.v; opt[key] = key === 'fanfare' ? +v : key === 'slow' ? v === '1' : v;
      for (const o of row.querySelectorAll('button')) o.setAttribute('aria-pressed', o === b);
      if (key === 'scene') $('app').dataset.scene = v;
      stop(); build(); t = key === 'slow' ? t : 0; frame();
    };
  }
  // the music page: each cue on its own, a section at a time, with the Rugmergency and the door pause in place
  let musicPlaying = null;
  $('cues').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return; unlock(); stop();
    const a = b.dataset.a, cue = b.dataset.cue;
    if (a === 'section') { const fresh = musicPlaying !== cue; musicPlaying = cue; playCue(cue, b.dataset.s, fresh); }
    else if (a === 'stop') { musicPlaying = null; Snd.music(null, { hard: true }); }
    $('nowPlaying').textContent = musicPlaying ? 'Playing ' + M.CUES[musicPlaying].name + (b.dataset.s ? ', section ' + b.dataset.s : '') : 'Stopped';
  };
  let fanTimer = 0;
  $('fans').onclick = ev => {
    const b = ev.target.closest('button'); if (!b) return; unlock(); stop(); clearTimeout(fanTimer);
    const cue = $('fanCue').value, f = M.FANFARES[+b.dataset.f](M.KEYSHIFT[cue]);
    // in place: the cue a moment, a hard stop, a breath, the fanfare, then the cue slams back in a step up
    playCue(cue, 1, true); $('nowPlaying').textContent = 'The cue, then ' + f.name;
    fanTimer = setTimeout(() => {
      Snd.music(null, { hard: true }); FX.glass();
      fanTimer = setTimeout(() => {
        Snd.registerTrack('stairFanfare', f); Snd.music('stairFanfare', { slam: true });
        fanTimer = setTimeout(() => { playCue(cue, 2, true); $('nowPlaying').textContent = 'The cue, back in at section 2'; fanTimer = setTimeout(() => { Snd.music(null, { hard: true }); $('nowPlaying').textContent = 'Stopped'; }, 4000); }, M.seconds(f) * 1000);
      }, 750);
    }, 3000);
  };
  build(); t = 0; frame();
  setTimeout(() => { for (const p of [null, BACK.stand, BACK.aim, BACK.runA, BACK.runB]) hall(0, p); }, 300);
  window.STAIRS = { opt, seek: s => { t = s; frame(); }, get scene() { return scene; }, build };
})();
