// Unruggabull II's intro: six illustrated stills with a narrated line each (the shot list is the project's
// unruggabull-ii-intro.md). The pictures are intro-stills.js; everything moving or lettered is drawn here on top:
// the Rugfather (portrait.js and two frames of his strip), the chalkboard, the height chart, the souls, the ledger.
// Classic script (UnrugIntro); load after art.js and portrait.js. intro-stills.js can come before or after.
//
// The game owns the pacing: it types each line with Snd.talkTimes, then waits for a tap (owner, 13 Oct: let people
// look and read as long as they like), showing a blinking arrow once the line is said. Everything keeps moving while it
// waits. It asks this for the picture (draw) and offers it each tap first (tap): a tap on a still's gag object plays
// the gag and doesn't advance; anywhere else advances. Everything is in picture pixels, 480 x 270.
var UnrugIntro = (function () {
  'use strict';
  const W = 480, H = 270;
  const LINES = [
    'When we last saw our hero, he had just unrugged the Rugfather.',
    'But the Rugfather had a son.',
    'He taught it everything he knew. It was a short lesson.',
    'It took his order a little too literally. It grew up so fast.',
    'Business was booming. Floor-to-floor carpet was everywhere. Profits were through the roof.',
    "Every soul Unruggabull freed was still on RugCo's books. So Unruggabull had some questions for Accounting. Sharp ones."
  ];
  // what a screen reader hears for each still, with its line
  const LABELS = [
    'A garage at dusk, its shutter open on a wet alley. The Rugfather lies on the floor in a burning heap.',
    'The same garage, years earlier, at night. The Rugfather leans over a basket on the workbench: a tiny wooden loom with one big blue eye. Its nameplate says LOOMY.',
    'The Rugfather points at a chalkboard: MAXIMIZE CARPETS. The little loom watches from a school desk. Its eye flickers orange.',
    'A height chart on a doorframe, marked LOOMY at knee height. The loom\'s shadow climbs the wall with each new mark until it towers over the Rugfather. At the ceiling its eye lights orange, and the top mark\'s name, LOOMY, is crossed out and rewritten: p(Loom).',
    'RugCo Tower at night under a blood-red sky, every window lit, fire licking at its edges. Souls drift up past its windows into the orange beacon on its roof, and carpets unroll down its face.',
    'An open ledger in the garage. In red ink: 5 SOULS IN, 1 RUG OUT. Beyond it, Unruggabull opens the door marked STAIRS onto a lit stairwell.'
  ];
  // The pictures (intro-stills.js) may load after this script: the game fetches them only for a device that hasn't
  // seen the story. Until they're in, a still draws dark with its overlays.
  const A = UnrugArt, NONE = { img: null, w: 0, h: 0 };
  let S = [], SP = {};
  const ready = () => !!window.UnrugIntroStills && UnrugIntroStills.stills.every(s => ok(s.img));
  const ok = img => img && img.complete && img.naturalWidth > 0;

  // ---------- drawing helpers ----------
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
  const ease = q => q * q * (3 - 2 * q);
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  // a lamp's flicker, 0..1: mostly steady, with the odd dip
  const flicker = (t, seed = 0) => .75 + .15 * Math.sin(t * 7.3 + seed) + .1 * Math.sin(t * 17.9 + seed * 2) - (hash(Math.floor(t * 9) + seed) < .06 ? .4 : 0);
  function glow(g, x, y, r, col, a) {
    if (a <= 0) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(1, col.replace('A', 0));
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
  }
  // A sprite standing at feet (fx, fy), leaned by k: each row shifts sideways by its height times k, whole pixels, so a
  // lean stays crisp pixel art (a rotation would chew it up).
  function lean(g, img, w, h, fx, fy, k) {
    if (!ok(img)) return;
    const x0 = Math.round(fx - w / 2), y0 = Math.round(fy - h);
    for (let r = 0; r < h; r++) g.drawImage(img, 0, r, w, 1, x0 + Math.round((h - r) * k), y0 + r, w, 1);
  }
  // the game's 3x5 font, outlined so it reads over anything
  const small = (g, s, x, y, col, edge) => edge ? A.otxt(g, s, x, y, col, 1, 'left', edge) : A.txt(g, s, x, y, col);
  // a 5x7 font for the lettering that has to be read at a glance: the chalkboard, the plaque, the ledger
  const BIG = {
    A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.', C: '.###.#...##....#....#....#...#.###.',
    D: '####.#...##...##...##...##...#####.', E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....',
    G: '.###.#...##....#.####...##...#.####', H: '#...##...##...#######...##...##...#', I: '.###...#....#....#....#....#...###.',
    K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####', M: '#...###.###.#.##.#.##...##...##...#',
    N: '#...##...###..##.#.##..###...##...#', O: '.###.#...##...##...##...##...#.###.', P: '####.#...##...#####.#....#....#....',
    Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#', S: '.#####....#.....###.....#....#####.',
    T: '#####..#....#....#....#....#....#..', U: '#...##...##...##...##...##...#.###.', W: '#...##...##...##.#.##.#.##.#.#.#.#.',
    X: '#...##...#.#.#...#...#.#.#...##...#', Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
    1: '..#...##....#....#....#....#...###.', 3: '####.....#....#.###.....#....#####.', 5: '######....####.....#....##...#.###.',
    '>': '.......#.....#.#####...#...#.......', ' ': ''
  };
  const bigWidth = s => [...s].reduce((w, ch) => w + (ch === ' ' ? 4 : 6), 0) - 1;
  // draw the first n letters of s (spaces don't count) at x, y; put(x, y) can place each pixel instead (the chalkboard)
  function big(g, s, x, y, col, n = Infinity, put) {
    g.fillStyle = col;
    put = put || ((px, py) => g.fillRect(px, py, 1, 1));
    let shown = 0;
    for (const ch of s) {
      if (ch === ' ') { x += 4; continue; }
      if (shown++ >= n) return;
      const f = BIG[ch] || '';
      for (let i = 0; i < f.length; i++) if (f[i] === '#') put(x + i % 5, y + (i / 5 | 0));
      x += 6;
    }
  }
  const letters = s => s.replace(/ /g, '').length;
  // when the narration reaches a phrase of the line
  const at = (plan, line, phrase) => { const i = line.indexOf(phrase); return i < 0 ? 0 : plan.times[i]; };

  // ---------- per-run state: the gags ----------
  let gag = {};
  function reset() { gag = {}; }

  // ---------- the Rugfather: one look everywhere ----------
  // His frames are the owner's strip at its own pixel size, and he gets the same touches in every still: he breathes
  // (his top half rises a pixel), his fringe stirs, his fire flickers, his eyes glow and now and then blink, and embers
  // drift off his shoulders. k leans him (the top shifts sideways by k a row).
  const RF = {
    front: () => ({ img: UnrugPortrait.img, w: UnrugPortrait.w, h: UnrugPortrait.h, waist: 82, eyes: [[55, 33], [64, 33]], fire: [[22, 34], [97, 34], [59, 6], [36, 14], [84, 14]] }),
    reach: () => ({ img: (SP.reach || NONE).img, w: (SP.reach || NONE).w, h: (SP.reach || NONE).h, waist: 70, eyes: [[37, 28]], fire: [[40, 4], [62, 20], [80, 46], [76, 80]] })
  };
  function rugfather(g, which, fx, fy, t, k = 0, seed = 0) {
    const f = RF[which](); if (!ok(f.img)) return;
    const { img, w, h, waist } = f, x0 = Math.round(fx - w / 2), y0 = Math.round(fy - h);
    const up = Math.sin(t * 2.4 + seed) > .2 ? 1 : 0;                 // breathing
    const swish = Math.sin(t * 3.1 + seed * 2) > .55 ? 1 : 0;         // the fringe stirs
    const row = (r, dy) => g.drawImage(img, 0, r, w, 1, x0 + Math.round((h - r) * k) + (r > h - 9 ? swish : 0), y0 + r + dy, w, 1);
    for (let r = 0; r < h; r++) row(r, r < waist ? -up : 0);
    if (up) row(waist, -1);
    // his fire flickers: the figure again, added faintly
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .05 + .12 * (1 - flicker(t * 1.6, seed + 2));
    for (let r = 0; r < h; r++) row(r, r < waist ? -up : 0);
    g.restore();
    // eyes: a glow, and a blink every few seconds
    const blinking = (t + seed * 1.7) % 3.4 < .13;
    for (const [ex, ey] of f.eyes) {
      const x = x0 + ex + Math.round((h - ey) * k), y = y0 + ey - up;
      if (blinking) rect(g, x - 1, y - 1, 4, 3, '#2c2420');
      else glow(g, x + 1, y, 7, 'rgba(255,150,40,A)', .25 + .15 * flicker(t * 2, seed));
    }
    // embers off his fire
    for (let i = 0; i < 10; i++) {
      const p = (t * .45 + hash(i + seed * 13)) % 1, [px, py] = f.fire[i % f.fire.length];
      const x = x0 + px + Math.round((h - py) * k) + Math.sin(t * 3 + i) * 2 + (hash(i + 7) - .5) * 10, y = y0 + py - p * 34;
      rect(g, x, y, 1, 1, p < .4 ? '#fff09a' : p < .75 ? '#f8a030' : '#c43428');
    }
  }

  // ---------- Loomy's eye, drawn so it can look around ----------
  // gx, gy: where it looks, -1..1; col: the iris (blue as a baby; orange is what it becomes)
  function eye(g, x, y, r, gx, gy, col = ['#1a5076', '#2a7aa6', '#46aad4', '#86d6f0']) {
    const disc = (cx, cy, rr, c) => { for (let dy = -rr; dy <= rr; dy++) { const w = Math.floor(Math.sqrt(rr * rr - dy * dy + rr * .6)); rect(g, cx - w, cy + dy, w * 2 + 1, 1, c); } };
    disc(x, y, r, col[0]); disc(x, y, r - 1, col[1]);
    const px = x + Math.round(gx * (r - 3)), py = y + Math.round(gy * (r - 3));
    disc(px, py, r - 2, col[2]);
    disc(px, py, Math.max(1, r - 4), '#08070c');
    rect(g, px - 1, py - 2, 1, 1, col[3]); rect(g, px + Math.max(1, r - 4), py - Math.max(1, r - 4), 1, 1, '#ffffff');
  }
  const ORANGE = ['#521418', '#c43428', '#ff6e4a', '#f8cc50'];

  // ---------- 1: the first game's garage; the Rugfather, unrugged, a heap still burning ----------
  function still1(g, t) {
    const f = flicker(t);
    glow(g, 196, 150, 130, 'rgba(255,140,50,A)', .05 + .05 * f);     // the lamp's pool breathes
    const heap = SP.heap || NONE, hx = 240, hy = 216, sc = 1;
    if (ok(heap.img)) g.drawImage(heap.img, hx - (heap.w >> 1), hy - heap.h);
    glow(g, hx - 4, hy - 40, 70, 'rgba(255,110,30,A)', .1 + .12 * flicker(t * 1.7, 3));  // his own fire
    // embers and smoke off the heap
    for (let i = 0; i < 14; i++) {
      const p = (t * .32 + i / 14) % 1, x = hx + (hash(i) - .5) * 70 * sc + Math.sin(t * 2 + i) * 5 * p * sc, y = hy - 30 * sc - p * 110 * sc;
      rect(g, x, y, 1, 1, p < .5 ? '#f8cc50' : p < .8 ? '#e44a34' : '#761c1e');
    }
    // dust in the lamp's light
    for (let i = 0; i < 10; i++) {
      const p = (t * .05 + hash(i + 40)) % 1, x = 160 + hash(i + 20) * 80 + Math.sin(t * .7 + i) * 6, y = 60 + p * 120;
      if (hash(i + 60) > .3) rect(g, x, y, 1, 1, '#d8c8a8');
    }
    // the blue neon in the alley says RUGS (the first game's sign), sheared to the wall, buzzing
    const off = hash(Math.floor(t * 14)) < .05;
    g.save(); g.setTransform(1, .6, 0, 1, 186, 77);
    if (!off) { g.globalAlpha = .45; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) A.txt(g, 'RUGS', dx, dy, '#46aad4'); g.globalAlpha = 1; }
    A.txt(g, 'RUGS', 0, 0, off ? '#1a5076' : '#c8f4ff');
    g.restore();
    if (!off) glow(g, 194, 84, 18, 'rgba(70,170,212,A)', .18);
  }

  // ---------- 2: years earlier, the son ----------
  const LOOM2 = { x: 424, y: 117 };
  function eyelid(g, x, y, r, close, wood) {
    if (close <= 0) return;
    const h = Math.round((r * 2 + 2) * close);
    for (let dy = -r - 1; dy < -r - 1 + h; dy++) { const w = Math.floor(Math.sqrt(Math.max(0, (r + 1.5) ** 2 - dy * dy))); rect(g, x - w, y + dy, w * 2 + 1, 1, wood); }
    rect(g, x - r, y - r - 1 + h, r * 2 + 1, 1, '#1c1614');
  }
  const blink = t0 => t0 == null ? 0 : (q => q < .07 ? q / .07 : q < .2 ? 1 : q < .3 ? 1 - (q - .2) / .1 : 0)(t0);
  // two moths round a lamp at (x, y)
  function moths(g, x, y, t) {
    for (let i = 0; i < 2; i++) {
      const a = t * (2.6 + i) + i * 3, mx = x + Math.cos(a) * (9 + 4 * Math.sin(t * 1.3 + i)), my = y + Math.sin(a * 1.4) * 5;
      rect(g, mx, my, 1, 1, '#f4e6c4'); if (Math.floor(t * 18 + i) % 2) rect(g, mx - 1, my, 3, 1, '#b0a088');
    }
  }
  function still2(g, t, plan) {
    glow(g, 425, 60, 70, 'rgba(255,150,60,A)', .05 + .05 * flicker(t, 5));
    moths(g, 425, 56, t);
    rugfather(g, 'front', 312, 238, t, .09, 0);              // he leans toward the basket
    // Loomy looks up at him, and as the line ends, at us
    const look = clamp((t - plan.total + .4) / .5);
    glow(g, LOOM2.x, LOOM2.y, 14, 'rgba(120,200,255,A)', .14 + .04 * Math.sin(t * 2));
    eye(g, LOOM2.x, LOOM2.y, 6, -1 + look, -.6 + .6 * look);
    eyelid(g, LOOM2.x, LOOM2.y, 6, blink(gag.blink != null ? t - gag.blink : null), '#7a4a2a');
    // a warp thread catches the light now and then
    if (hash(Math.floor(t * 6)) < .3) rect(g, 401 + Math.floor(hash(Math.floor(t * 6) + 1) * 14) * 1, 108 + Math.floor(hash(Math.floor(t * 6) + 2) * 18), 1, 2, '#fff6e0');
    // the nameplate, bigger than the one in the picture so it can be read
    rect(g, 390, 138, 37, 13, '#3a2014'); rect(g, 391, 139, 35, 11, '#c87818'); rect(g, 391, 139, 35, 1, '#f8cc50');
    big(g, 'LOOMY', 394, 141, '#3a2014');
  }

  // ---------- 3: the lesson ----------
  // the board's inner corners are (67, 77), (132, 87) and (77, 157): a point (u, v) on a 64 x 78 board lands here
  // (a pure shear, one pixel to one pixel, so letters keep their shapes; the board is within a pixel or two of that)
  const onBoard = (g, u, v) => g.fillRect(67 + u + Math.round(v * 10 / 78), 77 + v + Math.round(u * 10 / 64), 1, 1);
  // big letters, 7 x 11 with strokes two pixels thick: the chalkboard's two words, and RUGCO on the tower
  const CHALK = {
    U: '##...####...####...####...####...####...####...####...####...#########.#####.',
    G: '.###############.....##.....##.....##.######.######...####...#########.#####.',
    O: '.#####.#########...####...####...####...####...####...####...#########.#####.',
    M: '##...#####.############.#.####...####...####...####...####...####...####...##',
    A: '..###...##.##.##...####...####...##################...####...####...####...##',
    X: '##...####...##.##.##..##.##...###....###....###...##.##..##.##.##...####...##',
    I: '.#####...###....###....###....###....###....###....###....###....###...#####.',
    Z: '##############....##....##.....##....##.....##....##.....##....##############',
    E: '################.....##.....##.....######.######.##.....##.....##############',
    C: '.###############.....##.....##.....##.....##.....##.....##.....#######.######',
    R: '######.#########...####...###############.##.##..##..##.##..##.##...####...##',
    P: '######.#########...####...###############.##.....##.....##.....##.....##.....',
    T: '##############..###....###....###....###....###....###....###....###....###..',
    S: '.###############.....##.....######..######.....##.....##.....###############.'
  };
  const LOOM3 = { x: 194, y: 148 };
  const STAR = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
  function still3(g, t, plan) {
    glow(g, 88, 70, 80, 'rgba(255,150,60,A)', .05 + .05 * flicker(t, 9));
    rugfather(g, 'reach', 330, 252, t, 0, 1);
    // the chalk: MAXIMIZE / CARPETS, written as the line starts, placed through the board's slant, a few pixels skipped
    let n = Math.floor(clamp((t - .15) / 1.6) * 15);
    g.fillStyle = '#ecedf0';
    for (const [word, v] of [['MAXIMIZE', 15], ['CARPETS', 32]]) {
      const u0 = Math.round(32 - (word.length * 8 - 1) / 2);
      for (let c = 0; c < word.length && c < n; c++) {
        const glyph = CHALK[word[c]];
        for (let i = 0; i < 77; i++) if (glyph[i] === '#' && hash(c * 97 + i + v) > .05) onBoard(g, u0 + c * 8 + i % 7, v + (i / 7 | 0));
      }
      n -= word.length;
    }
    if (t > 1.9) { g.fillStyle = '#d2d4dc'; const w = Math.round(54 * clamp((t - 1.9) / .3)); for (let u = 5; u < 5 + w; u++) { onBoard(g, u, 46); if (u % 3) onBoard(g, u, 47); } }
    if (gag.star != null) {
      g.fillStyle = '#f8cc50';
      STAR.forEach((row, y) => { for (let x = 0; x < 7; x++) if (row[x] === '#') onBoard(g, 54 + x, 2 + y); });
    }
    // Loomy watches the board; as the lesson ends its eye flickers orange for a beat, the first sign of what it becomes
    const q = t - plan.total + .1, hot = q > 0 && q < .8 && '1101101'[Math.floor(q * 9)] === '1';
    glow(g, LOOM3.x, LOOM3.y, hot ? 14 : 11, hot ? 'rgba(255,110,40,A)' : 'rgba(120,200,255,A)', hot ? .4 : .12);
    eye(g, LOOM3.x, LOOM3.y, 5, -1, -.7, hot ? ORANGE : undefined);
  }

  // ---------- 4: the height chart, and its shadow ----------
  // The lamp throws Loomy's shadow on the wall beside the chart. Each new mark is where the shadow's top reaches, until
  // it stands over the Rugfather and taller than the door. Then the eye in the shadow lights orange, and the top mark's
  // label, LOOMY, is crossed out and renamed in its own hand: p(Loom).
  const TICKS = [196, 170, 142, 112, 82, 52, 16], FLOOR4 = 213;
  function loomShadow(g, hgt, lit, t) {
    const w = Math.round(hgt * .5), x0 = 188 - w, top = FLOOR4 - hgt;
    const pw = Math.max(2, Math.round(w * .08)), bw = Math.max(2, Math.round(hgt * .05));
    g.save(); g.globalAlpha = .62; g.fillStyle = '#120a0c';
    g.fillRect(x0, top, pw, hgt); g.fillRect(x0 + w - pw, top, pw, hgt);
    g.fillRect(x0 - 1, top, w + 2, bw); g.fillRect(x0, FLOOR4 - bw * 2, w, bw); g.fillRect(x0, Math.round(top + hgt * .62), w, Math.max(1, bw >> 1));
    g.globalAlpha = .45;
    const step = Math.max(3, Math.round(w / 9));
    for (let x = x0 + pw + 1; x < x0 + w - pw - 1; x += step) g.fillRect(x, top + bw, 1, hgt - bw * 3);
    g.restore();
    // its one eye: a dark disc in the shadow, until it lights
    const ex = Math.round(x0 + w * .62), ey = Math.round(top + hgt * .3), r = Math.max(2, Math.round(w * .09));
    if (lit > 0) {
      glow(g, ex, ey, r * 5, 'rgba(255,110,40,A)', .5 * lit * flicker(t * 2, 4));
      eye(g, ex, ey, Math.max(3, r), -.7, .6, ORANGE);
    } else {
      g.save(); g.globalAlpha = .62; g.fillStyle = '#120a0c';
      for (let dy = -r; dy <= r; dy++) { const ww = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(ex - ww, ey + dy, ww * 2 + 1, 1); }
      g.restore();
    }
  }
  function still4(g, t, plan, line) {
    const t0 = at(plan, line, 'It grew'), t1 = plan.total + .1;
    const when = i => i === 0 ? .2 : t0 + (t1 - t0) * (i - 1) / (TICKS.length - 2);
    // the shadow's height: up to each mark as it's made
    let hgt = 0;
    TICKS.forEach((y, i) => { const q = ease(clamp((t - when(i) + .3) / .3)); if (q > 0) { const from = i ? FLOOR4 - TICKS[i - 1] : 0; hgt = from + (FLOOR4 - y - from) * q; } });
    const lit = clamp((t - plan.total - .3) / .4);
    if (hgt > 2) loomShadow(g, Math.round(hgt), lit, t);
    rugfather(g, 'front', 70, 264, t, -.07 - .04 * clamp(hgt / 197), 2);   // he leans back further as it grows
    TICKS.forEach((y, i) => {
      const q = clamp((t - when(i)) / .14);
      if (q <= 0) return;
      const last = i === TICKS.length - 1;
      rect(g, 194, y, Math.max(1, Math.round(13 * q)), 1, '#f4e6c4');
      rect(g, 194, y + 1, Math.max(1, Math.round(13 * q)), 1, '#1c1614');
      if (q < 1) return;
      if (i === 0) small(g, 'LOOMY', 171, y - 2, '#c8f4ff', '#1c1614');
      if (last) {
        small(g, 'LOOMY', 171, y - 2, '#c8f4ff', '#1c1614');
        const x = clamp((t - plan.total - .2) / .3);                 // crossed out...
        if (x > 0) rect(g, 170, y, Math.round(21 * x), 1, '#ff6e4a');
        const n = Math.floor(clamp((t - plan.total - .6) / .5) * 7);   // ...and renamed, in orange, above it
        if (n > 0) small(g, 'P(LOOM)'.slice(0, n), 163, y - 10 < 2 ? y + 5 : y - 10, '#ff6e4a', '#1c1614');
      }
    });
  }

  // ---------- 5: RugCo Tower, panned from the doors to the roof ----------
  // Souls drift up past the windows into the beacon on the roof, and as each one goes in, a carpet unrolls down the
  // tower's face from under its sign: souls in, carpets out, floor to floor.
  // The picture's four window columns, and its 14 rows; the 48th Floor is the 7th from the bottom, y 273 to 283.
  // The tower burns at its edges: FLAMES are where the picture has fire, flickered on top.
  const ROW48 = [[201, 212], [223, 234], [245, 256], [267, 278]], Y48 = 273, BEACON = { x: 240, y: 42 };
  const FLAMES = [[219, 30], [264, 30], [183, 82], [298, 82], [171, 176], [311, 176]];
  const SOULS = Array.from({ length: 13 }, (_, i) => ({ s: i * .36 - 1.4, x: 130 + hash(i + 5) * 220, v: 100 + hash(i + 9) * 30 }));
  // a soul: a little pale rug, fringed, with two dark eyes
  const SOUL = ['..#####..', '.#######.', '##.###.##', '##.###.##', '#########', '#########', '#########', '#.#.#.#.#'];
  const SOUL_LAP = 13 * .36 + .1;   // seconds before a soul sets off again
  const arrive = i => SOULS[i].s + (515 - BEACON.y) / SOULS[i].v;     // when soul i first reaches the beacon
  const CARPETS = [[0, 1], [2, 3], [4, 0], [6, 2]];             // [soul, window column]
  function soulAt(i, t) {
    // a steady stream: each soul goes round again, so a still that's left waiting keeps moving
    const o = SOULS[i], q = t - o.s;
    if (q < 0) return null;
    const p = (q % SOUL_LAP) * o.v, y = 515 - p;
    if (y < BEACON.y) return null;
    const k = clamp((515 - y) / (515 - BEACON.y)), near48 = clamp(1 - Math.abs(y - Y48 - 7) / 16);
    // they drift together toward the beacon; passing the 48th Floor, they shiver
    return { x: Math.round(o.x + (BEACON.x - o.x) * k * k + Math.sin(t * 2.2 + i) * 4 * (1 - k) + Math.sin(t * 40 + i) * 2 * near48), y: Math.round(y), fade: clamp((y - BEACON.y) / 40) };
  }
  // from the doors (the plaza's last 20 pixels stay under the caption bar) to the roof
  const pan = (t, plan) => Math.round(250 * (1 - ease(clamp(t / (plan.total + .6)))));
  const CARPET_TOP = 100, CARPET_MAX = 330;   // from under the sign to the lowest row of windows
  function carpet(g, x0, x1, len, t, i) {
    const top = CARPET_TOP, w = x1 - x0 + 3, x = x0 - 1;
    rect(g, x, top, w, len, '#9c2622');
    rect(g, x, top, 1, len, '#e8a028'); rect(g, x + w - 1, top, 1, len, '#e8a028');
    for (let y = top + 3; y < top + len - 2; y += 6) rect(g, x + 3, y, w - 6, 2, y % 12 < 6 ? '#c43428' : '#e8a028');
    // the roll, still unrolling, or the fringe once it's down
    if (len < CARPET_MAX - 2) { rect(g, x - 1, top + len - 2, w + 2, 6, '#761c1e'); rect(g, x - 1, top + len - 2, w + 2, 2, '#c43428'); rect(g, x + (w >> 1), top + len, 1, 1, '#e8a028'); }
    else for (let k = 0; k < w; k += 2) rect(g, x + k, top + len, 1, 2 + (Math.floor(t * 4 + k + i) % 2), '#f4e6c4');
  }
  function still5(g, t, plan) {
    const oy = pan(t, plan);
    g.save(); g.translate(0, -oy);
    if (S[4] && ok(S[4].img)) g.drawImage(S[4].img, 0, 0);
    // RUGCO on the lit sign under the roof
    g.fillStyle = '#521418';
    [...'RUGCO'].forEach((ch, c) => { const glyph = CHALK[ch]; for (let i = 0; i < 77; i++) if (glyph[i] === '#') g.fillRect(221 + c * 8 + i % 7, 77 + (i / 7 | 0), 1, 1); });
    // the 48th Floor's windows flicker red
    const f = flicker(t * 1.3, 7);
    g.globalAlpha = .25 + .3 * (1 - f);
    for (const [x0, x1] of ROW48) rect(g, x0, Y48, x1 - x0 + 1, 11, '#340e12');
    g.globalAlpha = 1;
    glow(g, 240, Y48 + 7, 70, 'rgba(228,74,52,A)', .07 + .05 * f);
    // carpets out
    for (const [si, col] of CARPETS) {
      const q = t - arrive(si);
      if (q <= 0) continue;
      const [x0, x1] = ROW48[col];
      carpet(g, x0, x1, Math.round(Math.min(CARPET_MAX, q * 170)), t, col);
      if (q < .35) glow(g, BEACON.x, BEACON.y, 50, 'rgba(255,200,90,A)', .5 * (1 - q / .35));   // a soul goes in: the beacon flares
    }
    glow(g, BEACON.x, BEACON.y, 70, 'rgba(255,120,30,A)', .2 + .08 * Math.sin(t * 3));
    // the fire on its edges licks and throws sparks
    FLAMES.forEach(([fx, fy], k) => {
      glow(g, fx, fy, 16, 'rgba(255,90,30,A)', .15 + .2 * (1 - flicker(t * 1.8, k * 3)));
      for (let j = 0; j < 3; j++) { const fh = 2 + Math.floor(hash(Math.floor(t * 12) * 5 + k * 7 + j) * 5); rect(g, fx - 1 + j, fy - fh, 1, fh, j === 1 ? '#f8cc50' : '#e44a34'); }
      for (let j = 0; j < 3; j++) { const p = (t * .7 + hash(k * 9 + j)) % 1; rect(g, fx + Math.sin(t * 3 + j + k) * 3, fy - 4 - p * 22, 1, 1, p < .5 ? '#f8cc50' : '#c43428'); }
    });
    for (let i = 0; i < SOULS.length; i++) {
      const s = soulAt(i, t); if (!s) continue;
      g.globalAlpha = .85 * s.fade;
      const wave = gag.wave && gag.wave.i === i ? t - gag.wave.t : -1;
      SOUL.forEach((row, y) => { for (let x = 0; x < 9; x++) { const c = row[x] === '#' ? (y < 2 ? '#ffffff' : y > 5 ? '#86d6f0' : '#c8f4ff') : (y === 2 || y === 3) && (x === 2 || x === 6) ? '#10304e' : null; if (c) rect(g, s.x - 4 + x, s.y - 4 + y, 1, 1, c); } });
      if (wave >= 0 && wave < 1.2) { const up = Math.floor(wave * 8) % 2; rect(g, s.x + 5, s.y - 1 - up, 1, 3, '#ffffff'); rect(g, s.x + 6, s.y - 2 - up * 2, 1, 2, '#ffffff'); }
      g.globalAlpha = 1;
      glow(g, s.x, s.y, 14, 'rgba(160,220,255,A)', .16 * s.fade);
    }
    g.restore();
  }

  // ---------- 6: the ledger and the stairs ----------
  function still6(g, t, plan, line) {
    A.txt(g, 'STAIRS', 250, 31, '#d2d4dc');
    rect(g, 243, 30, 1, 5, '#76788a'); rect(g, 280, 30, 1, 5, '#76788a');
    for (const y of [170, 148, 124, 100, 76, 56]) { g.globalAlpha = .45; rect(g, 213, y, 8, 1, '#9496a8'); g.globalAlpha = 1; }
    // Unruggabull is in the picture, opening the door onto the lit stairwell. The light through the doorway breathes,
    // and when the line ends it swells: he's on his way up.
    const go = ease(clamp((t - plan.total) / 1)), bulb = flicker(t * 1.2, 11);
    glow(g, 258, 120, 50 + 30 * go, 'rgba(255,190,90,A)', .08 + .06 * bulb + .22 * go);
    glow(g, 262, 192, 40 + 40 * go, 'rgba(255,170,70,A)', .06 + .05 * bulb + .2 * go);
    // dust turning in the doorway's light: in the gap above his head, and over the light on the floor
    for (let i = 0; i < 14; i++) {
      const p = (t * .08 + hash(i + 70)) % 1, top = i < 6;
      const x = top ? 268 + hash(i + 80) * 20 : 236 + hash(i + 80) * 64, y = top ? 58 + p * 22 : 200 - p * 22;
      if (hash(i + 90) > .2) rect(g, x + Math.sin(t * .9 + i) * 2, y, 1, 1, '#fff09a');
    }
    // the room's lamp flickers, with its moths
    glow(g, 86, 60, 70, 'rgba(255,150,60,A)', .05 + .05 * flicker(t, 13));
    moths(g, 86, 58, t);
    // the ledger, held open: the tallies of the unrugged on the left, the production figures on the right
    const L = 26, T = 118;   // the equation kept above the caption bar, which covers up to a third with a long line
    rect(g, L - 4, T - 4, 186, 156, '#2c2420'); rect(g, L - 3, T - 3, 184, 154, '#5a3420');
    rect(g, L, T, 88, 152, '#f4e6c4'); rect(g, L + 90, T, 88, 152, '#f4e6c4');
    rect(g, L + 86, T, 2, 152, '#d8c8a8'); rect(g, L + 90, T, 2, 152, '#d8c8a8'); rect(g, L + 88, T - 3, 2, 155, '#3e332c');
    for (let y = T + 16; y < T + 152; y += 9) { rect(g, L + 3, y, 82, 1, '#d8c8a8'); rect(g, L + 93, y, 82, 1, '#d8c8a8'); }
    small(g, 'UNRUGGED', L + 4, T + 4, '#3a2014');
    for (let r = 0; r < 6; r++) for (let k = 0; k < 4 + (r * 3) % 4; k++) {
      const x = L + 6 + k * 10, y = T + 18 + r * 9;
      for (let j = 0; j < 4; j++) rect(g, x + j * 2, y, 1, 6, '#54463c');
      rect(g, x - 1, y + 4, 9, 1, '#54463c'); rect(g, x + 2, y + 2, 3, 1, '#54463c');
    }
    small(g, 'PRODUCTION', L + 94, T + 4, '#3a2014');
    // the equation, in red ink, as he reads it: drawn in during the second sentence and held
    const E1 = '5 SOULS IN', E2 = '> 1 RUG OUT', all = letters(E1) + letters(E2);
    const t0 = at(plan, line, 'So Unruggabull'), n = Math.floor(clamp((t - t0) / Math.max(.8, plan.total - t0 - .3)) * all);
    const mid = L + 90 + 44;
    big(g, E1, Math.round(mid - bigWidth(E1) / 2), T + 24, '#c43428', n);
    big(g, E2, Math.round(mid - bigWidth(E2) / 2), T + 40, '#c43428', n - letters(E1));
    if (n >= all) rect(g, Math.round(mid - bigWidth(E2) / 2), T + 50, bigWidth(E2), 1, '#c43428');
    // the draft from the open door lifts the right page's top corner now and then
    const lift = Math.max(0, Math.sin(t * 1.7) - .4) / .6;
    if (lift > 0) { const n = Math.round(9 * lift); for (let k = 0; k < n; k++) { rect(g, L + 178 - n + k, T, n - k, 1, '#08070c'); rect(g, L + 178 - n + k, T + k, 1, 1, '#d8c8a8'); } rect(g, L + 178 - n, T, n, 1, '#b0a088'); }
    small(g, 'INQUIRIES: ACCOUNTING', L + 94, T + 58, '#54463c');
    small(g, 'FLOOR 13', L + 94, T + 66, '#54463c');
  }

  const DRAW = [still1, still2, still3, still4, still5, still6];
  // Draw still i, t seconds in; plan is Snd.talkTimes for its line ({ times, total }).
  function draw(g, i, t, plan) {
    g.save(); g.imageSmoothingEnabled = false;
    rect(g, 0, 0, W, H, '#08070c');
    if (window.UnrugIntroStills) { S = UnrugIntroStills.stills; SP = UnrugIntroStills.sprites; }
    if (i !== 4 && S[i] && ok(S[i].img)) g.drawImage(S[i].img, 0, 0);
    DRAW[i](g, t, plan, LINES[i]);
    g.restore();
  }
  // A tap at picture pixel (x, y): plays still i's gag if it's on the gag object and returns the sound to play
  // ('' for a silent gag), or returns null to say the tap should advance.
  function tap(i, x, y, t, plan) {
    const near = (cx, cy, rx, ry) => Math.abs(x - cx) <= rx && Math.abs(y - cy) <= ry;
    if (i === 1 && near(410, 128, 44, 34)) { gag.blink = t; return 'armorClank'; }
    if (i === 2 && near(201, 152, 30, 28)) { if (gag.star != null) return null; gag.star = t; return 'ding'; }
    if (i === 4) {
      const oy = pan(t, plan);
      for (let k = 0; k < SOULS.length; k++) { const s = soulAt(k, t); if (s && Math.abs(s.x - x) <= 14 && Math.abs(s.y - oy - y) <= 14) { gag.wave = { i: k, t }; return 'soul'; } }
    }
    return null;
  }
  // ---------- who tells it ----------
  // The narrator tells the first three lines. On line 4 "It grew up so fast." scrambles into p(Loom)'s machine voice,
  // on the beat its shadow outgrows the Rugfather; p(Loom) tells line 5 (good news for RugCo) and the books on line 6;
  // at "So Unruggabull" the scramble runs back and the narrator takes the hero's move. voice(i) is for Snd.talkTimes
  // and Snd.say: a voice's name, or a function giving each character its voice, plus machine (orange in the caption)
  // and glitch (it flickers through junk as it's typed).
  const N = { who: 'narrator' }, M = { who: 'machine', machine: true };
  const GREW = LINES[3].indexOf('It grew'), BACK = LINES[5].indexOf('So Unruggabull');
  function grew(k) {
    if (k < GREW) return N;
    const q = (k - GREW) / (LINES[3].length - 2 - GREW);   // 0 to 1 over the sentence: ever more likely the machine
    if (hash(k) < q * 1.2) return { who: 'machine', machine: true, glitch: true, stutter: hash(k + 5) < .3 * (1 - q) ? (hash(k + 11) < .5 ? 2 : .5) : 0 };
    // the narrator sagging, slipping octaves and stuttering on the way down
    const slip = hash(k + 3) < .25 ? (hash(k + 4) < .5 ? 2 : .5) : 1;
    return { who: 'narrator', pitch: (1 - .35 * q) * slip, glitch: true, stutter: hash(k + 9) < .4 ? (hash(k + 11) < .5 ? 2 : .5) : 0 };
  }
  function back(k) {
    if (k < BACK) return M;
    const q = Math.min(1, (k - BACK) / 24);   // back to the narrator within the first few words
    if (hash(k + 21) < (1 - q) * 1.2 - .2) return { who: 'machine', machine: true, glitch: true, stutter: hash(k + 25) < .3 ? (hash(k + 11) < .5 ? 2 : .5) : 0 };
    return { who: 'narrator', pitch: (.65 + .35 * q) * (hash(k + 23) < .2 * (1 - q) ? 2 : 1), glitch: q < .7, stutter: hash(k + 29) < .3 * (1 - q) ? (hash(k + 11) < .5 ? 2 : .5) : 0 };
  }
  const voice = i => i === 3 ? grew : i === 4 ? 'machine' : i === 5 ? back : 'narrator';
  // character k of line i as the caption shows it
  function look(i, k) { const v = voice(i); return typeof v === 'function' ? v(k) : v === 'machine' ? M : N; }

  // The way out of the last still, q 0..1: the doorway's light swells over the picture until it is all warm white.
  function exit(g, q) {
    const e = ease(clamp(q));
    glow(g, 262, 150, 60 + 330 * e, 'rgba(255,214,140,A)', Math.min(1, .3 + e));
    g.save(); g.globalAlpha = ease(clamp((q - .45) / .55)); rect(g, 0, 0, W, H, '#fff1cf'); g.restore();
  }
  return { LINES, LABELS, draw, exit, tap, reset, ready, voice, look, W, H };
})();
