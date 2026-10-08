// Unruggabull II art: one 8-bit palette, a 3x5 pixel font and sprites written as text grids.
// Classic script; load before game.js. Everything is drawn into small canvases once and scaled with
// nearest-neighbour, so nothing here touches the game state.
var UnrugArt = (function () {
  'use strict';
  const PAL = {
    K: '#1a1418', H: '#f2b632', h: '#b0701a', D: '#281a14', F: '#543424', f: '#3a241a', S: '#ce8e60', s: '#9c6440',
    G: '#101014', g: '#8cd2ff', c: '#3aa8e0', R: '#d63428', r: '#961e16', L: '#ff7050', T: '#222226', C: '#ffd44a',
    J: '#34549a', j: '#243a6c', B: '#603c24', W: '#e8b030', w: '#8c6010', Z: '#46281a', M: '#fff0aa', O: '#ff9628',
    P: '#f2eee2', p: '#b8b4a8', Y: '#c8d0dc', y: '#7c8494', E: '#3a3344', e: '#8a8094'
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
  };
  // Poses share one 48x40 box: feet at y 38, centred on x 24, room above and around for the sword.
  const POSE_W = 48, POSE_H = 40, BX = 14, BY = 10;
  function pose(legs, sword) {
    const cv = paint(POSE_W, POSE_H, [[LEGS_B[legs], BX, BY + 21], [TORSO_B, BX, BY + 12], [HEAD_B, BX, BY]]), g = cv.getContext('2d');
    if (sword === 'back') {
      line(g, BX + 4, BY + 25, BX + 15, BY + 14, '#8a93a6'); line(g, BX + 3, BY + 25, BX + 14, BY + 14, '#e8edf6');
      rect(g, BX + 13, BY + 13, 4, 1, '#1a1418'); line(g, BX + 15, BY + 12, BX + 17, BY + 10, '#e8b030');
    } else if (sword === 'wind') {
      line(g, BX + 17, BY + 14, BX + 6, BY + 3, '#8a93a6'); line(g, BX + 18, BY + 13, BX + 7, BY + 2, '#e8edf6');
      rect(g, BX + 16, BY + 13, 3, 2, '#e8b030');
      arcE(g, 24, 22, 21, 9, Math.PI + .2, Math.PI * 1.45);
    } else if (sword === 'cut') {
      line(g, BX + 17, BY + 15, BX + 30, BY + 9, '#8a93a6'); line(g, BX + 17, BY + 14, BX + 30, BY + 8, '#e8edf6');
      rect(g, BX + 16, BY + 14, 3, 2, '#e8b030');
      arcE(g, 24, 22, 21, 9, Math.PI + .2, Math.PI * 2 - .2);
    }
    return cv;
  }
  const POSES = {
    stand: pose('stand', 'back'), runA: pose('runA', 'back'), runB: pose('runB', 'back'), jump: pose('jump', 'back'),
    wind: pose('stand', 'wind'), cut: pose('stand', 'cut'), jumpWind: pose('jump', 'wind'), jumpCut: pose('jump', 'cut')
  };

  // ---------- carpshits ----------
  const CARP = ['..KKKKKKKKKKKKKKKKKKKKKK..', 'O.KCCCCCCCCCCCCCCCCCCCCK.O', '.KCRRRRRRRRRRRRRRRRRRRRCK.', 'OKCRCRKKRRRRRRRRRRKKRCRCKO', '.KCRRRRKKRRRRRRRRKKRRRRCK.', 'OKCRRRMMMKRRRRRRKMMMRRRCKO', '.KCRCRMMKMRRRRRRMKMMRCRCK.', 'OKCRRRRRRRRKKKKRRRRRRRRCKO', '.KCRRRRRRRKrrrrKRRRRRRRCK.', 'O.KCCCCCCCCCCCCCCCCCCCCK.O', '..KKKKKKKKKKKKKKKKKKKKKK..'];
  const flipFringe = rows => rows.map((r, y) => (y === 0 || y === rows.length - 1) ? r : (ch => ch === 'O' ? '.' : ch === '.' ? 'O' : ch)(r[0]) + r.slice(1, -1) + (ch => ch === 'O' ? '.' : ch === '.' ? 'O' : ch)(r[r.length - 1]));
  const CARPF = [spr(CARP), spr(flipFringe(CARP))];
  // Temps: carpshits in a collar and tie.
  const TIE = ['..........PKRRKP..........', '...........KRRK...........', '...........KRRK...........', '............KK............'];
  const TEMP = spr(CARP.concat(TIE));
  const GHOST = spr(['..CCCCC..', '.........', '.KKKKKKK.', 'KMMMMMMMK', 'KMKMMMKMK', 'KMMMMMMMK', 'KMMgggMMK', '.KMKMKMK.', '..g.g.g..']);
  const HEART = spr(['.KK...KK.', 'KRRK.KRRK', 'KRLRKRRRK', 'KRRRRRRRK', '.KRRRRRK.', '..KRRRK..', '...KRK...', '....K....']);
  const HEART_EMPTY = spr(['.KK...KK.', 'KEEK.KEEK', 'KEEEKEEEK', 'KEEEEEEEK', '.KEEEEEK.', '..KEEEK..', '...KEK...', '....K....']);
  const WAD = spr(['.PPP.', 'PPpPP', 'PpPPp', 'PPPpP', '.PPP.']);
  const BUNDLE = spr(['P.P.P.P.P.P.', 'PpPpPpPpPpPp', 'PPPPPPPPPPPP', 'RRRRRRRRRRRR', 'PpPpPpPpPpPp', 'PPPPPPPPPPPP', '.P.P.P.P.P.P']);
  const STAPLE = spr(['YYYYYYYYY', 'Yy.....yY', 'Y.......Y']);
  // A file box, about knee high
  const BOX = spr(['KKKKKKKKKKKKKKKK', 'KSSSSSSSSSSSSSSK', 'KssssssssssssssK', 'KSSSSKKKKKKSSSSK', 'KSSSSKPPPPKSSSSK', 'KSSSSKKKKKKSSSSK', 'KSSSSSSSSSSSSSSK', 'KssssssssssssssK', 'KKKKKKKKKKKKKKKK']);

  return {
    PAL, canvas, paint, spr, rect, px, line, disc, poly, arcE, txt, otxt, textWidth, bubble,
    POSES, POSE_W, POSE_H, CARPF, TEMP, GHOST, HEART, HEART_EMPTY, WAD, BUNDLE, STAPLE, BOX
  };
})();
