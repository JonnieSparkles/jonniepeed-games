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
  const HEAD_B = ['H.................H', 'HH...............HH', 'hH...............Hh', '.hH....DDDDD....Hh.', '..hHHKDDDDDDDKHHh..', '....KDDDDDDDDDK....', '...KFFFFFFFFFFFK...', '..KGGGGGGGGGGGGGK..', '.KfKFFFFFFFFFFFKfK.', '.KCKFFFFFFFFFFFKfK.', '...KfFFFFFFFFFfK...', '....KKKKKKKKKKK....'];
  const TORSO_B = ['...KKRRRRRRRRRKK...', '..KRRRRRRRRRRRRRK..', '.KTKLRRRRRRRRRRKTK.', '.KTKrrrrrrrrrrrKTK.', '.KTKRRRRRRRRRRRKTK.', '.KTKLRRRRRRRRRRKTK.', '.KTKrrrrrrrrrrrKTK.', '.KFKRRRRRRRRRRRKFK.', '..K.KZZZZZZZZZK.K..'];
  const LEGS_B = {
    stand: ['....KJJJJJJJJJK....', '....KJJJJKJJJJK....', '....KJJJjKjJJJK....', '....KJJJjKjJJJK....', '....KJJJK.KJJJK....', '....KBBBK.KBBBK....', '....KKKKK.KKKKK....'],
    runA: ['....KJJJJJJJJJK....', '....KJJJJKJJJJK....', '....KJJJjKjJJJK....', '....KBBBKKjJJJK....', '....KKKKK.KJJJK....', '..........KBBBK....', '..........KKKKK....'],
    runB: ['....KJJJJJJJJJK....', '....KJJJJKJJJJK....', '....KJJJjKjJJJK....', '....KJJJjKKBBBK....', '....KJJJK.KKKKK....', '....KBBBK..........', '....KKKKK..........'],
    jump: ['....KJJJJJJJJJK....', '...KJJJJJKJJJJJK...', '..KJJJjK...KjJJJK..', '..KBBBK.....KBBBK..', '..KKKKK.....KKKKK..'],
    // a squat from behind: knees out wide either side of the body (drawn 3 px further left)
    // scuffing a hoof while he waits: the right foot lifted
    scuff: ['....KJJJJJJJJJK....', '....KJJJJKJJJJK....', '....KJJJjKjJJJK....', '....KJJJjKjJJJK....', '....KJJJK.KBBBK....', '....KBBBK.KKKKK....', '....KKKKK..........'],
    crouch: ['', '', '..KJJJK...........KJJJK..', '.KJJJJK...........KJJJJK.', 'KJJjJK.............KJjJJK', 'KBBBK...............KBBBK', 'KKKKK...............KKKKK'],
  };
  // Poses share one 48x40 box: feet at y 38, centred on x 24, room above and around for the sword and blaster.
  // Arms are drawn separately so they can swing when he runs, go up when he jumps, raise the blaster and swing the katana.
  const POSE_W = 48, POSE_H = 40, BX = 14, BY = 10;
  const TORSO_BARE = TORSO_B.map((r, y) => y < 2 ? r : (y === 8 ? r.slice(0, 2) + '.' + r.slice(3, 16) + '.' + r.slice(17) : r.slice(0, 1) + '..' + r.slice(3, 16) + '..' + r.slice(18)));
  function rows(g, list, ox, oy) { list.forEach((r, y) => { for (let i = 0; i < r.length; i++) { const col = PAL[r[i]]; if (col) { g.fillStyle = col; g.fillRect(ox + i, oy + y, 1, 1); } } }); }
  // An arm: a dark sleeve with an outline, from the shoulder to a bare hand.
  function arm(g, sx, sy, hx, hy) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) line(g, sx + dx, sy + dy, hx + dx, hy + dy, '#1a1418');
    line(g, sx, sy, hx, hy, '#222226');
    rect(g, hx - 1, hy - 1, 3, 3, '#1a1418'); px(g, hx, hy, '#543424');
  }
  const SHOULDER = { L: [BX + 2, BY + 14], R: [BX + 16, BY + 14] };
  const HAND = {
    L: { down: [BX + 2, BY + 20], fwd: [BX + 3, BY + 18], back: [BX + 1, BY + 21], up: [BX - 2, BY + 9] },
    R: { down: [BX + 16, BY + 20], fwd: [BX + 15, BY + 18], back: [BX + 17, BY + 21], up: [BX + 20, BY + 9],
      aim: [BX + 20, BY + 8], kick: [BX + 19, BY + 10], wind: [BX + 6, BY + 5], cut: [BX + 25, BY + 13], hilt: [BX + 16, BY + 11], twirl: [BX + 19, BY + 17] }
  };
  // Where the blaster's muzzle is, relative to his feet, when aiming: the game fires bolts from here.
  const MUZZLE = { x: BX + 20 - 24, y: BY + 2 - 38 };
  // Horns up: index and little finger raised over a raised hand.
  function horns(g, hx, hy) {
    for (const x of [hx - 2, hx, hx + 2]) rect(g, x, hy - 4, 1, 3, '#1a1418');
    for (const x of [hx - 1, hx + 1]) { px(g, x, hy - 4, '#1a1418'); rect(g, x, hy - 3, 1, 2, '#543424'); }
  }
  // o (idle poses): head turns his head a pixel to look aside, lift raises the katana a little in its sheath, spin turns
  // the blaster in his hand (0 to 3).
  function pose(legs, l, r, sword, bob = 0, rock = false, o = {}) {
    const cv = canvas(POSE_W, POSE_H), g = cv.getContext('2d');
    rows(g, LEGS_B[legs], legs === 'crouch' ? BX - 3 : BX, BY + 21);
    rows(g, TORSO_BARE, BX, BY + 12 + bob);
    rows(g, HEAD_B, BX + (o.head || 0), BY + bob);
    if (sword === 'back') {
      const lb = bob - (o.lift || 0), dx = o.lift ? 1 : 0;
      line(g, BX + 4 + dx, BY + 25 + lb, BX + 15 + dx, BY + 14 + lb, '#8a93a6'); line(g, BX + 3 + dx, BY + 25 + lb, BX + 14 + dx, BY + 14 + lb, '#e8edf6');
      rect(g, BX + 13 + dx, BY + 13 + lb, 4, 1, '#1a1418'); line(g, BX + 15 + dx, BY + 12 + lb, BX + 17 + dx, BY + 10 + lb, '#e8b030');
    }
    const sh = (side) => [SHOULDER[side][0], SHOULDER[side][1] + bob];
    const lh = HAND.L[l], rh = HAND.R[r];
    arm(g, ...sh('L'), lh[0], lh[1] + (l === 'up' ? 0 : bob));
    if (sword === 'wind') {
      arcE(g, 24, 22, 21, 9, Math.PI + .2, Math.PI * 1.45);
      line(g, rh[0], rh[1], rh[0] - 10, rh[1] - 9, '#8a93a6'); line(g, rh[0] + 1, rh[1] - 1, rh[0] - 9, rh[1] - 10, '#e8edf6');
    } else if (sword === 'cut') {
      arcE(g, 24, 22, 21, 9, Math.PI + .2, Math.PI * 2 - .2);
      line(g, rh[0], rh[1] + 1, rh[0] + 9, rh[1] - 4, '#8a93a6'); line(g, rh[0], rh[1], rh[0] + 9, rh[1] - 5, '#e8edf6');
    }
    arm(g, ...sh('R'), rh[0], rh[1]);
    if (rock) { horns(g, lh[0], lh[1]); horns(g, rh[0], rh[1]); }
    if (sword === 'wind' || sword === 'cut') rect(g, rh[0] - 1, rh[1] - 1, 3, 2, '#e8b030');
    if (o.spin != null) {
      // the blaster spun round his finger at his side: four quarter turns
      const [hx, hy] = rh, k = o.spin % 4;
      if (k % 2 === 0) { rect(g, hx - 4, hy - 2, 9, 4, '#1a1418'); rect(g, hx - 3, hy - 1, 7, 2, '#e8b030'); px(g, k ? hx - 3 : hx + 3, hy - 1, '#fff0aa'); }
      else { rect(g, hx - 2, hy - 4, 4, 9, '#1a1418'); rect(g, hx - 1, hy - 3, 2, 7, '#e8b030'); px(g, hx - 1, k === 1 ? hy - 3 : hy + 3, '#fff0aa'); }
    }
    if (r === 'aim' || r === 'kick') {
      // the blaster from behind: a gold block pointing into the screen, with a bright muzzle
      rect(g, rh[0] - 3, rh[1] - 7, 7, 7, '#1a1418'); rect(g, rh[0] - 2, rh[1] - 6, 5, 5, '#e8b030'); rect(g, rh[0] - 1, rh[1] - 5, 3, 1, '#fff0aa'); rect(g, rh[0] - 2, rh[1] - 2, 5, 1, '#8c6010');
    }
    return cv;
  }
  const POSES = {
    stand: pose('stand', 'down', 'down', 'back'),
    runA: pose('runA', 'fwd', 'back', 'back'), runB: pose('runB', 'back', 'fwd', 'back', -1),
    jump: pose('jump', 'up', 'up', 'back'),
    aim: pose('stand', 'down', 'aim', 'back'), kick: pose('stand', 'down', 'kick', 'back', 1),
    runAimA: pose('runA', 'fwd', 'aim', 'back'), runAimB: pose('runB', 'back', 'aim', 'back', -1),
    jumpAim: pose('jump', 'up', 'aim', 'back'),
    wind: pose('stand', 'down', 'wind', 'wind'), cut: pose('stand', 'fwd', 'cut', 'cut'),
    jumpWind: pose('jump', 'up', 'wind', 'wind'), jumpCut: pose('jump', 'up', 'cut', 'cut'),
    hurt: pose('stand', 'up', 'up', 'back', 1),
    // crouched: half height, to duck high paper or grip a pulling rug; he can still slash from down there
    crouch: pose('crouch', 'down', 'down', 'back', 6), crouchWind: pose('crouch', 'down', 'wind', 'wind', 6), crouchCut: pose('crouch', 'fwd', 'cut', 'cut', 6),
    // standing about: breathing, glancing aside, and three things he does if you leave him long enough
    breathe: pose('stand', 'down', 'down', 'back', 1),
    lookL: pose('stand', 'down', 'down', 'back', 0, false, { head: -1 }), lookR: pose('stand', 'down', 'down', 'back', 0, false, { head: 1 }),
    twirl: [0, 1, 2, 3].map(k => pose('stand', 'down', 'twirl', 'back', 0, false, { spin: k })),
    grip: pose('stand', 'down', 'hilt', 'back'), gripUp: pose('stand', 'down', 'hilt', 'back', 0, false, { lift: 2 }),
    scuff: pose('scuff', 'down', 'down', 'back'),
    // the clear: horns up, bobbing
    win: pose('stand', 'up', 'up', 'back', 0, true), winB: pose('stand', 'up', 'up', 'back', -1, true)
  };

  // ---------- carpshits ----------
  const CARP = ['..KKKKKKKKKKKKKKKKKKKKKK..', 'O.KCCCCCCCCCCCCCCCCCCCCK.O', '.KCRRRRRRRRRRRRRRRRRRRRCK.', 'OKCRCRKKRRRRRRRRRRKKRCRCKO', '.KCRRRRKKRRRRRRRRKKRRRRCK.', 'OKCRRRMMMKRRRRRRKMMMRRRCKO', '.KCRCRMMKMRRRRRRMKMMRCRCK.', 'OKCRRRRRRRRKKKKRRRRRRRRCKO', '.KCRRRRRRRKrrrrKRRRRRRRCK.', 'O.KCCCCCCCCCCCCCCCCCCCCK.O', '..KKKKKKKKKKKKKKKKKKKKKK..'];
  const flipFringe = rows => rows.map((r, y) => (y === 0 || y === rows.length - 1) ? r : (ch => ch === 'O' ? '.' : ch === '.' ? 'O' : ch)(r[0]) + r.slice(1, -1) + (ch => ch === 'O' ? '.' : ch === '.' ? 'O' : ch)(r[r.length - 1]));
  const CARPF = [spr(CARP), spr(flipFringe(CARP))];
  // Temps: carpshits in a collar and tie.
  const TIE = ['..........PKRRKP..........', '...........KRRK...........', '...........KRRK...........', '............KK............'];
  const TEMP = spr(CARP.concat(TIE));
  // Two more temps, so the office isn't all the same guy: glasses and a blue tie, a comb-over and a teal tie.
  const tieIn = c => TIE.map(r => r.replace(/RR/g, c + c));
  const GLASSES = CARP.slice();
  GLASSES[4] = '.KCRRYYYYYYRRRRYYYYYYRRCK.'; GLASSES[5] = 'OKCRRYMMMKYYYYYYKMMMYRRCKO'; GLASSES[6] = '.KCRCYMMKMYRRRRYMKMMYRCRK.'; GLASSES[7] = 'OKCRRYYYYYYKKKKYYYYYYRRCKO';
  const TEMPS = [TEMP, spr(GLASSES.concat(tieIn('J'))), spr(['.......OOOOOOOOOOOO.......', '.....OOhOOOOOOOOOOhOO.....'].concat(CARP, tieIn('c')))];
  const GHOST = spr(['..CCCCC..', '.........', '.KKKKKKK.', 'KMMMMMMMK', 'KMKMMMKMK', 'KMMMMMMMK', 'KMMgggMMK', '.KMKMKMK.', '..g.g.g..']);
  const HEART = spr(['.KK...KK.', 'KRRK.KRRK', 'KRLRKRRRK', 'KRRRRRRRK', '.KRRRRRK.', '..KRRRK..', '...KRK...', '....K....']);
  const HEART_EMPTY = spr(['.KK...KK.', 'KEEK.KEEK', 'KEEEKEEEK', 'KEEEEEEEK', '.KEEEEEK.', '..KEEEK..', '...KEK...', '....K....']);
  const WAD = spr(['.PPP.', 'PPpPP', 'PpPPp', 'PPPpP', '.PPP.']);
  // What the Shredder spits: a wad of shredded paper, strips sticking out every way, a few with red ink.
  // The game spins it in quarter turns and gives it a jagged red edge, so it never reads as a pickup.
  const BUNDLE = spr([
    '.....P......',
    '..P..P...R..',
    '...P.P..P...',
    '....PPPPP...',
    'PP.PpPPpPP.P',
    '..PPPyPPpPPP',
    '.RPPpPPyPP..',
    'P..PPPpPPP..',
    '...PPPPPP.P.',
    '..P..R.P..P.',
    '.P...P..P...',
    '.....P......']);
  const STAPLE = spr(['YYYYYYYYY', 'Yy.....yY', 'Y.......Y']);
  // A paper airplane coming at you, seen nose-on: the Shredder throws them at head height. Duck.
  const PLANE = spr(['....P....', '...PpP...', '..PPpPP..', '.PPP.PPP.', 'PPp...pPP']);
  // Hall dressing: a water cooler and a stack of copy paper
  const COOLER = spr(['..KKKKK..', '.KcggggK.', 'KcgggggcK', 'KcgMggggK', 'KcgMggggK', 'KcgggggcK', '.KcccccK.', '..KKKKK..', '.KPPPPPK.', '.KPpRpPK.', '.KPPPPPK.', '.KPPPPPK.', '.KpPPPpK.', '.KPPPPPK.', '.KPPPPPK.', '.KKKKKKK.']);
  const STACK = spr(['KKKKKKKKKK', 'KPPPPPPPPK', 'KppppppppK', 'KPPPPPPPPK', 'KppppppppK', 'KPPPPPPPPK', 'KppppppppK', 'KKKKKKKKKK']);
  // Pickups: a RugCo coffee mug (a heart back) and the Spread Shot
  const COFFEE = spr(['..p..p...', '...p..p..', '.KKKKKK..', '.KFFFFKKK', '.KPPPPK.K', '.KPRRPK.K', '.KPPPPKKK', '.KPPPPK..', '..KKKK...']);
  const SPREAD = spr(['M....M....M', '.M...M...M.', '..M..M..M..', '...M.M.M...', '....MMM....', '...KWWWK...', '...KwWwK...', '....KKK....']);
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
  const BOX = spr(['KKKKKKKKKKKKKKKK', 'KSSSSSSSSSSSSSSK', 'KssssssssssssssK', 'KSSSSKKKKKKSSSSK', 'KSSSSKPPPPKSSSSK', 'KSSSSKKKKKKSSSSK', 'KSSSSSSSSSSSSSSK', 'KssssssssssssssK', 'KKKKKKKKKKKKKKKK']);

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
    type: { w: 44, h: 36, n: 1, draw: (put, box, g, f, alive, visor) => {
      if (alive[0]) put(face({ eyes: 'down', mouth: 'line', fringe: f % 2, visor }), 7, 4 + (f === 1 ? 1 : 0));
      desk(box, true, f + 1);
      if (alive[0]) { if (f % 2) { box(8, 21, 1, 1, 'M'); box(31, 20, 1, 1, 'M'); } else { box(9, 20, 1, 1, 'M'); box(30, 21, 1, 1, 'M'); } }
    } },
    // on a call: a headset, nodding, talking; behind it a chart of Q4 rug targets, going down
    call: { w: 44, h: 36, n: 1, draw: (put, box, g, f, alive, visor) => {
      box(28, 0, 16, 11, 'K'); box(29, 1, 14, 9, 'P'); box(30, 2, 12, 1, 'y');
      [6, 5, 3, 2, 1].forEach((v, i) => box(30 + Math.round(i * 2.4), 9 - v, 2, v, i > 2 ? 'i' : 'J'));
      const bob = f % 2;
      if (alive[0]) {
        put(face({ eyes: 'side', mouth: f < 2 ? 'open' : 'line', visor }), 3, 5 + bob);
        box(4, 4 + bob, 20, 1, 'K'); box(3, 5 + bob, 1, 5, 'K'); box(2, 8 + bob, 3, 4, 'K'); box(4, 12 + bob, 7, 1, 'K'); box(11, 11 + bob, 2, 2, 'K');
      }
      desk(box, false);
    } },
    // asleep at the desk: slumped across it, eyes shut, drooling, Zs; the monitor on its screensaver
    sleep: { w: 44, h: 36, n: 1, draw: (put, box, g, f, alive) => {
      box(0, 22, 44, 3, 'N'); box(0, 25, 44, 1, 'n'); box(2, 26, 2, 10, 'n'); box(40, 26, 2, 10, 'n');
      box(1, 8, 16, 13, 'K'); box(2, 9, 14, 10, 'q'); box(7, 19, 4, 3, 'K');
      const bx = [3, 8, 11, 6][f], by = [10, 13, 10, 15][f]; box(bx, by, 4, 3, 'R'); box(bx + 1, by + 1, 2, 1, 'C');
      if (alive[0]) {
        put(face({ eyes: 'shut', mouth: 'open' }).slice(2, 10), 17, 14);
        txt(g, 'Z', 31 + f, 8 - f * 2, '#fff6e2'); if (f > 1) txt(g, 'Z', 37, 1, '#a8a0c0');
        box(18, 21, 1, 1 + f % 2, 'g');
      }
    } },
    // the water cooler: two hovering close, one telling, the other can't believe it
    cooler: { w: 66, h: 44, n: 2, draw: (put, box, g, f, alive) => {
      g.drawImage(COOLER, 24, 44 - COOLER.height * 2, COOLER.width * 2, COOLER.height * 2);
      if (alive[0]) {
        put(face({ eyes: 'side', mouth: f % 2 ? 'open' : 'line', fringe: f % 2 }), 0, 10 + (f % 2));
        if (alive[1]) { box(8, 1, 13, 7, 'K'); box(9, 2, 11, 5, 'P'); box(12, 8, 2, 1, 'K'); if (f < 2) for (let i = 0; i <= f + 1; i++) box(11 + i * 3, 4, 1, 1, 'K'); else { box(14, 2, 1, 3, 'i'); box(14, 6, 1, 1, 'i'); } }
      }
      if (alive[1]) put(flip(face({ eyes: f > 1 && alive[0] ? 'wide' : 'side', mouth: f > 1 && alive[0] ? 'open' : 'line', fringe: (f + 1) % 2 })), 40, 12 - (f > 1 ? 1 : 0));
    } },
    // the copy room: one lies on the copier's glass, and copies of it slide out into a stack
    copier: { w: 60, h: 40, n: 1, draw: (put, box, g, f, alive) => {
      box(4, 18, 34, 22, 'K'); box(5, 19, 32, 20, 'b'); box(5, 30, 32, 1, 'd'); box(8, 22, 6, 2, 'P'); box(30, 22, 3, 2, f % 2 ? 'X' : 'x');
      box(4, 14, 34, 4, 'K'); box(5, 15, 32, 2, 'd');
      if (alive[0]) { box(6, 17, 30, 1, f % 2 ? 'X' : 'M'); put(face({ eyes: 'down', mouth: 'smile' }).slice(0, 9), 8, 6); }
      const n = alive[0] ? f + 1 : 4; for (let i = 0; i < n; i++) { box(38, 34 - i * 2, 18, 2, 'K'); box(39, 34 - i * 2, 16, 1, i % 2 ? 'r' : 'L'); }
      box(37, 36, 21, 2, 'd');
    } },
    // the manager, in a tie, on the phone (the floor puts it in its office, a room set into the wall)
    manager: { w: 26, h: 15, n: 1, draw: (put, box, g, f, alive) => {
      if (!alive[0]) return;
      put(face({ eyes: 'side', mouth: f % 2 ? 'open' : 'line', fringe: f % 2 }).concat(TIE), 0, 0);
      box(3, 3, 3, 6, 'K'); box(6, 7, 2, 1, 'K');
    } }
  };
  const WORK = {};
  function work(kind, alive, visor) {
    const key = kind + alive.map(a => a ? 1 : 0).join('') + (visor ? 'v' : '');
    if (!WORK[key]) { const K = WORK_KINDS[kind]; WORK[key] = [0, 1, 2, 3].map(f => sketch(K.w, K.h, (put, box, g) => K.draw(put, box, g, f, alive, visor))); }
    return WORK[key];
  }
  // the manager's office furniture: a desk with a nameplate, and a framed certificate on its back wall
  const OFFICE_DESK = sketch(40, 12, (put, box) => { box(0, 3, 40, 3, 'N'); box(0, 6, 40, 6, 'n'); box(12, 0, 12, 3, 'C'); box(14, 1, 8, 1, 'K'); });
  const CERT = sketch(10, 8, (put, box) => { box(0, 0, 10, 8, 'K'); box(1, 1, 8, 6, 'P'); box(2, 3, 6, 1, 'J'); box(2, 5, 4, 1, 'J'); });

  return {
    PAL, canvas, paint, spr, rect, px, line, disc, poly, arcE, txt, otxt, textWidth, bubble,
    POSES, POSE_W, POSE_H, MUZZLE, CARPF, TEMP, TEMPS, WORK_KINDS, work, OFFICE_DESK, CERT, GHOST, HEART, HEART_EMPTY, WAD, BUNDLE, STAPLE, BOX, COOLER, STACK, COFFEE, SPREAD, CHAIR, CHAIRS, FLASH, BLASTER, PLANE
  };
})();
