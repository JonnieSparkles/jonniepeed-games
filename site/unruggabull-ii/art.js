// Unruggabull II art: one 8-bit palette, a 3x5 pixel font and sprites written as text grids.
// Classic script; load before game.js. Everything is drawn into small canvases once and scaled with
// nearest-neighbour, so nothing here touches the game state.
var UnrugArt = (function () {
  'use strict';
  const PAL = {
    K: '#1a1418', H: '#f2b632', h: '#b0701a', D: '#281a14', F: '#543424', f: '#3a241a', S: '#ce8e60', s: '#9c6440',
    G: '#101014', g: '#8cd2ff', c: '#3aa8e0', R: '#d63428', r: '#961e16', L: '#ff7050', T: '#222226', C: '#ffd44a',
    J: '#34549a', j: '#243a6c', B: '#603c24', W: '#e8b030', w: '#8c6010', Z: '#46281a', M: '#fff0aa', O: '#ff9628',
    P: '#f2eee2', p: '#b8b4a8', Y: '#c8d0dc', y: '#7c8494', E: '#3a3344', e: '#8a8094',
    // the office: desk wood, a monitor's back and its screen, a mug and its steam, copier beige, an accountant's visor
    n: '#4a3020', N: '#7a5434', m: '#5e6270', q: '#2a2c34', x: '#2f7a4c', X: '#9cf0b4', u: '#e8e4d8', v: '#c8d0dc',
    b: '#c8bfa8', d: '#9a917c', i: '#e2483a', V: '#3aa86a', k: '#1f6a40'
  };

  function canvas(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
  function paint(w, h, layers) {
    const cv = canvas(w, h), g = cv.getContext('2d');
    for (const [rows, ox, oy] of layers) rows.forEach((r, y) => {
      for (let i = 0; i < r.length; i++) { const col = PAL[r[i]]; if (col) { g.fillStyle = col; g.fillRect(ox + i, oy + y, 1, 1); } }
    });
    return cv;
  }
  const spr = rows => paint(Math.max(...rows.map(r => r.length)), rows.length, [[rows, 0, 0]]);
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1); };
  function line(g, x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); g.fillStyle = c;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function disc(g, x, y, r, c) { g.fillStyle = c; x = Math.round(x); y = Math.round(y); for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy)); g.fillRect(x - w, y + dy, w * 2 + 1, 1); } }
  function poly(g, c, pts) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
  // A sword swoosh: white outer edge fading to blue inside.
  function arcE(g, cx, cy, rx, ry, a0, a1) {
    const n = Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry) * 1.6);
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n, k = i / n;
      px(g, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, '#ffffff');
      if (k > .2 && k < .96) px(g, cx + Math.cos(a) * (rx - 1), cy + Math.sin(a) * (ry - 1), '#bfefff');
      if (k > .4 && k < .86) px(g, cx + Math.cos(a) * (rx - 2), cy + Math.sin(a) * (ry - 2), '#7fd4ff');
    }
  }

  // 3x5 capitals, digits and a little punctuation. Lower case is drawn as capitals.
  const FONT = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
    G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
    S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
    '!': '010010010000010', '.': '000000000000010', "'": '010010000000000', ':': '000010000010000', '?': '110001010000010',
    '-': '000000111000000', '(': '010100100100010', ')': '010001001001010', '%': '101001010100101', ',': '000000000010100',
    '/': '001001010100100', '+': '000010111010000', 'x': '000101010101000'
  };
  const textWidth = (s, sc = 1) => String(s).length * 4 * sc - sc;
  function txt(g, s, x, y, col, sc = 1, align = 'left') {
    s = String(s).toUpperCase().replace(/×/g, 'x');
    const w = textWidth(s, sc);
    if (align === 'center') x = Math.round(x - w / 2); else if (align === 'right') x -= w;
    g.fillStyle = col;
    for (const ch of s) { const f = FONT[ch]; if (f) for (let i = 0; i < 15; i++) if (f[i] === '1') g.fillRect(x + (i % 3) * sc, y + ((i / 3) | 0) * sc, sc, sc); x += 4 * sc; }
  }
  // Outlined text, readable over any part of the scene.
  function otxt(g, s, x, y, col, sc = 1, align = 'left', edge = '#1a1418') {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) txt(g, s, x + dx, y + dy, edge, sc, align);
    txt(g, s, x, y, col, sc, align);
  }
  function bubble(g, x, y, s, tailX) {
    const w = textWidth(s) + 6, h = 11;
    rect(g, x - 1, y - 1, w + 2, h + 2, '#1a1418'); rect(g, x, y, w, h, '#fff6e2'); txt(g, s, x + 3, y + 3, '#1a1418');
    if (tailX != null) { rect(g, tailX - 1, y + h, 5, 1, '#1a1418'); rect(g, tailX, y + h, 3, 1, '#fff6e2'); rect(g, tailX, y + h + 1, 3, 1, '#1a1418'); rect(g, tailX + 1, y + h + 1, 1, 1, '#fff6e2'); px(g, tailX + 1, y + h + 2, '#1a1418'); }
  }

  // ---------- Unruggabull from behind ----------
  // Drawn by tools/unruggabull-ii/bull.py into bull.js (UnrugBull), at one pixel per pixel of the 480x270 picture, so
  // the game draws him at half a game unit per pixel (BULL_K). Every pose shares one box with his feet at POSE_FEET.
  const B = UnrugBull, BULL_K = .5;
  const POSES = {};
  for (const k in B.POSES) POSES[k] = B.paint(B.POSES[k]);
  POSES.cut = POSES.slash;
  POSES.twirl = [0, 1, 2, 3].map(k => POSES['twirl' + k]);
  const POSE_W = POSES.stand.width, POSE_H = POSES.stand.height, POSE_FEET = { x: B.FEET.x, y: B.FEET.y };
  // Where bolts leave the blaster, from his feet, in game units. Kept at the first bull's spot (the new one's is within
  // half a unit of it) so his shots fly exactly as before.
  const MUZZLE = { x: 10, y: -26 };

  // ---------- carpshits ----------
  const CARP = ['..KKKKKKKKKKKKKKKKKKKKKK..', 'O.KCCCCCCCCCCCCCCCCCCCCK.O', '.KCRRRRRRRRRRRRRRRRRRRRCK.', 'OKCRCRKKRRRRRRRRRRKKRCRCKO', '.KCRRRRKKRRRRRRRRKKRRRRCK.', 'OKCRRRMMMKRRRRRRKMMMRRRCKO', '.KCRCRMMKMRRRRRRMKMMRCRCK.', 'OKCRRRRRRRRKKKKRRRRRRRRCKO', '.KCRRRRRRRKrrrrKRRRRRRRCK.', 'O.KCCCCCCCCCCCCCCCCCCCCK.O', '..KKKKKKKKKKKKKKKKKKKKKK..'];
  const flipFringe = rows => rows.map((r, y) => (y === 0 || y === rows.length - 1) ? r : (ch => ch === 'O' ? '.' : ch === '.' ? 'O' : ch)(r[0]) + r.slice(1, -1) + (ch => ch === 'O' ? '.' : ch === '.' ? 'O' : ch)(r[r.length - 1]));
  // Temps: carpshits in a collar and tie.
  const TIE = ['..........PKRRKP..........', '...........KRRK...........', '...........KRRK...........', '............KK............'];
  const TEMP = spr(CARP.concat(TIE));
  // Two more temps, so the office isn't all the same guy: glasses and a blue tie, a comb-over and a teal tie.
  const tieIn = c => TIE.map(r => r.replace(/RR/g, c + c));
  const GLASSES = CARP.slice();
  GLASSES[4] = '.KCRRYYYYYYRRRRYYYYYYRRCK.'; GLASSES[5] = 'OKCRRYMMMKYYYYYYKMMMYRRCKO'; GLASSES[6] = '.KCRCYMMKMYRRRRYMKMMYRCRK.'; GLASSES[7] = 'OKCRRYYYYYYKKKKYYYYYYRRCKO';
  // The carpshits and the temps themselves come from sprites.js (UnrugSprites), drawn at the picture's full size: k is
  // game units a pixel. (The old grids above still give the carpshits at work their faces.)
  const NS = UnrugSprites, CARP_K = .5;
  const ns = rows => { const c = NS.paint(rows); c.k = CARP_K; return c; };
  const CARPF = [ns(NS.FLY[0]), ns(NS.FLY[1])], CARP_HIT = ns(NS.FLY_HIT), CARP_CUT = ns(NS.CUT);
  // where a carpshit's eyes are, from the middle of its sprite, in game units (in the dark only its eyes show)
  const CARP_EYES = (() => {
    const rows = NS.FLY[0], w = rows[0].length, h = rows.length, sides = [[0, 0, 0], [0, 0, 0]];
    rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if ('nop'.includes(r[x])) { const sd = sides[x < w / 2 ? 0 : 1]; sd[0] += x; sd[1] += y; sd[2]++; } });
    const eyes = sides.map(([sx, sy, n]) => ({ x: (sx / n - w / 2) * CARP_K, y: (sy / n - h / 2) * CARP_K }));
    eyes.k = CARP_K;
    return eyes;
  })();
  // three temps (A, B, C), each with frames for each state: peek, up, wind (the wad held up), throw, hit
  const TEMPS = ['A', 'B', 'C'].map(key => { const o = {}; for (const st in NS.TEMPS[key]) o[st] = NS.TEMPS[key][st].map(ns); return o; });
  const TEMP_RUG = NS.TEMP_RUG;
  // a sprite's size in game units (the new ones are drawn at half a unit a pixel)
  const uw = img => img.width * (img.k || 1), uh = img => img.height * (img.k || 1);   // where the rug sits in a temp's frame, in pixels
  const GHOST = ns(NS.CAST.SOUL);
  const HEART = ns(NS.CAST.HEART);
  const HEART_EMPTY = ns(NS.CAST.HEART_EMPTY);
  const WAD = ns(NS.CAST.WAD);
  // What the Shredder spits: a wad of shredded paper, strips sticking out every way, a few with red ink.
  // The game spins it in quarter turns and gives it a jagged red edge, so it never reads as a pickup.
  const BUNDLE = ns(NS.CAST.BUNDLE);
  const STAPLE = ns(NS.CAST.STAPLE);
  // A paper airplane coming at you, seen nose-on: the Shredder throws them at head height. Duck.
  const PLANE = ns(NS.CAST.PLANE);
  // Hall dressing: a water cooler and a stack of copy paper
  const COOLER = spr(['..KKKKK..', '.KcggggK.', 'KcgggggcK', 'KcgMggggK', 'KcgMggggK', 'KcgggggcK', '.KcccccK.', '..KKKKK..', '.KPPPPPK.', '.KPpRpPK.', '.KPPPPPK.', '.KPPPPPK.', '.KpPPPpK.', '.KPPPPPK.', '.KPPPPPK.', '.KKKKKKK.']);
  const STACK = spr(['KKKKKKKKKK', 'KPPPPPPPPK', 'KppppppppK', 'KPPPPPPPPK', 'KppppppppK', 'KPPPPPPPPK', 'KppppppppK', 'KKKKKKKKKK']);
  // Pickups: a RugCo coffee mug (a heart back) and the Spread Shot
  const COFFEE = ns(NS.CAST.COFFEE);
  const SPREAD = ns(NS.CAST.SPREAD);
  // A rolling office chair, from behind
  // A rolling office chair, rolling at you: high back, arms, seat, gas lift, a five-star base, casters in two frames.
  const CHAIR_TOP = ['.....KKKKKKKKKKKK.....', '....KjjjjjjjjjjjjK....', '...KjJJJJJJJJJJJJjK...', '...KjJJjJJJJJJjJJjK...', '...KjJJJJJJJJJJJJjK...', '...KjJJJJJJJJJJJJjK...', '...KjJJjJJJJJJjJJjK...', '...KjJJJJJJJJJJJJjK...',
    '....KjjjjjjjjjjjjK....', '.....KKKKKyyKKKKK.....', '.KKK......yy......KKK.', '.KyKKKKKKKyyKKKKKKKyK.', '.KyKjJJJJJJJJJJJJjKyK.', '.KyKjJJJJJJJJJJJJjKyK.', '..KKKjjjjjjjjjjjjKKK..', '....KKKKKKKKKKKKKK....',
    '.........KYyK.........', '.........KYyK.........', '.........KYyK.........', '...KKKKKKKYyKKKKKKK...', '.KKyyyyyyyYyyyyyyyyKK.', 'KyyKK....KyyK....KKyyK'];
  const CHAIRS = [spr(CHAIR_TOP.concat(['KKK......KKKK......KKK', '.K.......K..K.......K.'])), spr(CHAIR_TOP.concat(['.K........KK........K.', 'KKK......K..K......KKK']))];
  const CHAIR = spr(['...KKKKKK...', '...KJJJJK...', '...KJjjJK...', '...KJJJJK...', '...KKKKKK...', '.....KK.....', '.KKKKKKKKKK.', '.KJJJJJJJJK.', '.KKKKKKKKKK.', '.....KK.....', '..KKKKKKKK..', '.K.K....K.K.', '.KK......KK.']);
  const FLASH = spr(['...M...', '..MOM..', '.MOMOM.', 'MOMMMOM', '.MOMOM.', '..MOM..', '...M...']);
  // His blaster from the side, for when the Shredder's surge knocks it out of his hands and it lies on the floor.
  const BLASTER = spr(['.KKKKKKKK...', 'KWWWWWWWWKKK', 'KWMMWWWWWWCK', 'KWWWWWWWWKKK', '.KwwKKKKKK..', '.KwwK.......', '..KK........']);
  // A file box, about knee high
  // A cardboard carton left on the floor (an obstacle: step round it or jump it), drawn at the picture's full size
  // (32x18, so half a game unit per pixel). Dull brown with brown tape and a printed arrow, nothing bright, so it
  // can't be taken for a pickup.
  const BOX = (() => {
    const cv = canvas(32, 18), g = cv.getContext('2d'), r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    r(0, 0, 32, 18, '#1a1418');
    r(1, 1, 30, 4, '#9a6a3a'); r(1, 1, 30, 1, '#ab7a46');           // the top, with a crease where the flaps meet
    r(1, 3, 30, 1, '#7e5430');
    r(1, 5, 30, 12, '#76492a'); r(1, 14, 30, 3, '#5e3a20');         // the front, darker toward the floor
    r(26, 5, 5, 12, '#5a361c');                                      // the shaded right edge
    r(14, 1, 4, 16, '#8a6038'); r(14, 1, 4, 1, '#9a7044');           // packing tape over the top and down the front
    r(4, 8, 1, 4, '#3e2614'); r(3, 9, 3, 1, '#3e2614'); r(7, 8, 1, 4, '#3e2614'); r(6, 9, 3, 1, '#3e2614');   // printed this-way-up arrows
    r(20, 10, 4, 1, '#4e3018'); r(20, 12, 3, 1, '#4e3018');          // a scrawled label
    return cv;
  })();

  // ---------- carpshits at work: Floor 13's office life ----------
  // A carpshit's face with a calmer look than the angry one: eyes on the screen ('down'), 'shut', 'wide' or to the
  // 'side'; a mouth in a 'line', 'open' (talking) or a 'smile'; an accountant's green visor; its fringe flicked.
  const setAt = (row, i, t) => row.slice(0, i) + t + row.slice(i + t.length);
  function face(o) {
    let r = o.fringe ? flipFringe(CARP) : CARP.slice();
    r[3] = setAt(setAt(r[3], 6, 'RR'), 18, 'RR'); r[4] = setAt(setAt(r[4], 6, 'KKK'), 17, 'KKK');   // brows level
    if (o.eyes === 'down') { r[5] = setAt(setAt(r[5], 6, 'MMMM'), 16, 'MMMM'); r[6] = setAt(setAt(r[6], 6, 'MKKM'), 16, 'MKKM'); }
    if (o.eyes === 'shut') { r[4] = setAt(setAt(r[4], 6, 'RRR'), 17, 'RRR'); r[5] = setAt(setAt(r[5], 6, 'RRRR'), 16, 'RRRR'); r[6] = setAt(setAt(r[6], 6, 'KKKK'), 16, 'KKKK'); }
    if (o.eyes === 'wide') { r[4] = setAt(setAt(r[4], 6, 'RRR'), 17, 'RRR'); r[3] = setAt(setAt(r[3], 6, 'KKK'), 17, 'KKK'); r[5] = setAt(setAt(r[5], 6, 'MMMM'), 16, 'MMMM'); r[6] = setAt(setAt(r[6], 6, 'MKKM'), 16, 'MKKM'); }
    if (o.eyes === 'side') { r[5] = setAt(setAt(r[5], 6, 'MMMK'), 16, 'MMMK'); r[6] = setAt(setAt(r[6], 6, 'MMMK'), 16, 'MMMK'); }
    if (o.mouth === 'line') { r[7] = setAt(r[7], 11, 'RRRR'); r[8] = setAt(r[8], 10, 'RKKKKR'); }
    if (o.mouth === 'open') { r[7] = setAt(r[7], 11, 'KKKK'); r[8] = setAt(r[8], 10, 'KrrrrK'); }
    if (o.mouth === 'smile') { r[7] = setAt(r[7], 10, 'KRRRRK'); r[8] = setAt(r[8], 10, 'RKKKKR'); }
    if (o.visor) { r[1] = setAt(r[1], 2, 'K' + 'k'.repeat(20) + 'K'); r[2] = setAt(r[2], 1, 'K' + 'V'.repeat(22) + 'K'); r[3] = setAt(r[3], 2, 'k'.repeat(22)); }
    return r;
  }
  // a sprite drawn with put (text rows), box (a rectangle of one colour) and the canvas itself
  function sketch(w, h, draw) {
    const cv = canvas(w, h), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    const put = (rows, ox, oy) => rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const c = PAL[r[i]]; if (c) { g.fillStyle = c; g.fillRect(ox + i, oy + y, 1, 1); } } });
    const box = (x, y, bw, bh, ch) => { g.fillStyle = PAL[ch]; g.fillRect(Math.round(x), Math.round(y), Math.round(bw), Math.round(bh)); };
    draw(put, box, g);
    return cv;
  }
  // A scene at the picture's full size (k: half a game unit a pixel), drawn in game units: box() and g as in sketch(),
  // and carp(name, f, x, y) puts a carpshit from sprites.js (FACES[name]) where an old 26x10 face would have its top
  // left, optionally clipped to rows from y0 to y1 (one half-hidden behind a desk) and flipped (facing the other way).
  const FACE_IMG = {};
  const faceImg = (name, f) => { const key = name + f; return FACE_IMG[key] || (FACE_IMG[key] = NS.paint(NS.FACES[name][f % 2])); };
  function scene(w, h, draw) {
    const cv = canvas(w * 2, h * 2), g = cv.getContext('2d');
    g.imageSmoothingEnabled = false; g.setTransform(2, 0, 0, 2, 0, 0);
    const box = (x, y, bw, bh, ch) => { g.fillStyle = PAL[ch]; g.fillRect(Math.round(x), Math.round(y), Math.round(bw), Math.round(bh)); };
    const carp = (name, f, x, y, o = {}) => {
      const img = faceImg(name, f);
      g.save();
      if (o.y0 != null || o.y1 != null) { g.beginPath(); g.rect(-99, o.y0 == null ? -99 : o.y0, 999, (o.y1 == null ? 999 : o.y1) - (o.y0 == null ? -99 : o.y0)); g.clip(); }
      if (o.flip) { g.translate(x - 1 + 14, 0); g.scale(-1, 1); g.drawImage(img, -14, y - 1, 28, 12); }
      else g.drawImage(img, x - 1, y - 1, 28, 12);
      g.restore();
    };
    draw(carp, box, g);
    cv.k = .5;
    return cv;
  }
  // a desk with a monitor, its back to you, and whoever works there peeking over it
  function desk(box, mug, steam) {
    box(0, 22, 44, 3, 'N'); box(0, 25, 44, 1, 'n'); box(2, 26, 2, 10, 'n'); box(40, 26, 2, 10, 'n');
    box(10, 12, 20, 11, 'K'); box(11, 13, 18, 9, 'm'); box(12, 14, 16, 1, 'q'); box(18, 21, 4, 1, 'q');
    if (mug) { box(34, 17, 5, 5, 'K'); box(35, 18, 3, 4, 'u'); box(36, 19, 1, 1, 'R'); box(38, 19, 2, 2, 'K'); if (steam) { box(36 + (steam % 2), 14, 1, 2, 'v'); box(35 + (steam % 2), 12, 1, 1, 'v'); } }
  }
  const flip = rows => rows.map(r => r.split('').reverse().join(''));
  // What each one looks like, in four frames, with alive[i] saying whether its i-th carpshit is still there (shot, it's
  // gone and its place is empty). Sizes are in the game's pixels at the front of the hall; the floor draws them smaller.
  const WORK_KINDS = {
    // typing away: eyes down, fringe tapping the keys, keys clattering, a mug steaming
    type: { w: 44, h: 36, n: 1, draw: (carp, box, g, f, alive, visor) => {
      if (alive[0]) carp(visor ? 'downV' : 'down', f, 7, 4 + (f === 1 ? 1 : 0));
      desk(box, true, f + 1);
      if (alive[0]) { if (f % 2) { box(8, 21, 1, 1, 'M'); box(31, 20, 1, 1, 'M'); } else { box(9, 20, 1, 1, 'M'); box(30, 21, 1, 1, 'M'); } }
    } },
    // on a call: a headset, nodding, talking; behind it a chart of Q4 rug targets, going down
    call: { w: 44, h: 36, n: 1, draw: (carp, box, g, f, alive) => {
      box(28, 0, 16, 11, 'K'); box(29, 1, 14, 9, 'P'); box(30, 2, 12, 1, 'y');
      [6, 5, 3, 2, 1].forEach((v, i) => box(30 + Math.round(i * 2.4), 9 - v, 2, v, i > 2 ? 'i' : 'J'));
      const bob = f % 2;
      if (alive[0]) {
        carp('talk', f < 2 ? 0 : 1, 3, 5 + bob);
        box(4, 3 + bob, 20, 1, 'K'); box(2, 5 + bob, 1, 5, 'K'); box(1, 8 + bob, 3, 4, 'K'); box(3, 12 + bob, 7, 1, 'K'); box(10, 11 + bob, 2, 2, 'K');
      }
      desk(box, false);
    } },
    // asleep at the desk: slumped across it, eyes shut, drooling, Zs; the monitor on its screensaver
    sleep: { w: 44, h: 36, n: 1, draw: (carp, box, g, f, alive) => {
      box(0, 22, 44, 3, 'N'); box(0, 25, 44, 1, 'n'); box(2, 26, 2, 10, 'n'); box(40, 26, 2, 10, 'n');
      box(1, 8, 16, 13, 'K'); box(2, 9, 14, 10, 'q'); box(7, 19, 4, 3, 'K');
      const bx = [3, 8, 11, 6][f], by = [10, 13, 10, 15][f]; box(bx, by, 4, 3, 'R'); box(bx + 1, by + 1, 2, 1, 'C');
      if (alive[0]) {
        carp('shut', f, 17, 12, { y0: 13 });
        txt(g, 'Z', 31 + f, 8 - f * 2, '#fff6e2'); if (f > 1) txt(g, 'Z', 37, 1, '#a8a0c0');
        box(30, 21, 1, 1 + f % 2, 'g');
      }
    } },
    // the water cooler: two hovering close, one telling, the other can't believe it
    cooler: { w: 66, h: 44, n: 2, draw: (carp, box, g, f, alive) => {
      g.drawImage(COOLER, 24, 44 - COOLER.height * 2, COOLER.width * 2, COOLER.height * 2);
      if (alive[0]) {
        carp('talk', f % 2 ? 0 : 1, 0, 10 + (f % 2));
        if (alive[1]) { box(8, 0, 13, 7, 'K'); box(9, 1, 11, 5, 'P'); box(12, 7, 2, 1, 'K'); if (f < 2) for (let i = 0; i <= f + 1; i++) box(11 + i * 3, 3, 1, 1, 'K'); else { box(14, 1, 1, 3, 'i'); box(14, 5, 1, 1, 'i'); } }
      }
      if (alive[1]) carp(f > 1 && alive[0] ? 'wide' : 'side', f + 1, 40, 12 - (f > 1 ? 1 : 0), { flip: true });
    } },
    // the copy room: one lies on the copier's glass, and copies of it slide out into a stack
    copier: { w: 60, h: 40, n: 1, draw: (carp, box, g, f, alive) => {
      if (alive[0]) carp('smile', f, 8, 6, { y1: 16 });
      box(4, 18, 34, 22, 'K'); box(5, 19, 32, 20, 'b'); box(5, 30, 32, 1, 'd'); box(8, 22, 6, 2, 'P'); box(30, 22, 3, 2, f % 2 ? 'X' : 'x');
      box(4, 14, 34, 4, 'K'); box(5, 15, 32, 2, 'd');
      if (alive[0]) box(6, 17, 30, 1, f % 2 ? 'X' : 'M');
      const n = alive[0] ? f + 1 : 4; for (let i = 0; i < n; i++) { box(38, 34 - i * 2, 18, 2, 'K'); box(39, 34 - i * 2, 16, 1, i % 2 ? 'r' : 'L'); }
      box(37, 36, 21, 2, 'd');
    } },
    // the manager, in a tie, on the phone (the floor puts it in its office, a room set into the wall): temp A's look
    manager: { w: 26, h: 15, n: 1, draw: (carp, box, g, f, alive) => {
      if (!alive[0]) return;
      const img = TEMPS[0].up[f % 2], R0 = TEMP_RUG, k = 26 / R0.w;
      g.drawImage(img, -R0.x * k, -R0.y * k + 2, img.width * k, img.height * k);
      box(2, 5, 3, 6, 'K'); box(5, 9, 2, 1, 'K');
    } }
  };
  const WORK = {};
  function work(kind, alive, visor) {
    const key = kind + alive.map(a => a ? 1 : 0).join('') + (visor ? 'v' : '');
    if (!WORK[key]) { const K = WORK_KINDS[kind]; WORK[key] = [0, 1, 2, 3].map(f => scene(K.w, K.h, (carp, box, g) => K.draw(carp, box, g, f, alive, visor))); }
    return WORK[key];
  }
  // the manager's office furniture: a desk with a nameplate, and a framed certificate on its back wall
  const OFFICE_DESK = sketch(40, 12, (put, box) => { box(0, 3, 40, 3, 'N'); box(0, 6, 40, 6, 'n'); box(12, 0, 12, 3, 'C'); box(14, 1, 8, 1, 'K'); });
  const CERT = sketch(10, 8, (put, box) => { box(0, 0, 10, 8, 'K'); box(1, 1, 8, 6, 'P'); box(2, 3, 6, 1, 'J'); box(2, 5, 4, 1, 'J'); });

  return {
    PAL, canvas, paint, spr, rect, px, line, disc, poly, arcE, txt, otxt, textWidth, bubble,
    POSES, POSE_W, POSE_H, POSE_FEET, BULL_K, MUZZLE, CARPF, CARP_HIT, CARP_CUT, CARP_EYES, TEMPS, TEMP_RUG, uw, uh, WORK_KINDS, work, OFFICE_DESK, CERT, GHOST, HEART, HEART_EMPTY, WAD, BUNDLE, STAPLE, BOX, COOLER, STACK, COFFEE, SPREAD, CHAIR, CHAIRS, FLASH, BLASTER, PLANE
  };
})();
