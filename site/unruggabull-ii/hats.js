// The hats from the top of the long ride (item 30, docs/games/unruggabull-ii/README.md "The long ride's top"): the
// bellhop's cap (Regular Bull), the crown that was under the operator's cap (Raging Bull) and the operator's halo
// (Impossibull). Worn for the rest of the run (RUN.hat in game.js) and drawn on his head in every view: side on in the
// ride (arena.js), from behind on the roof (the core's drawBull) and in the ending (ending.js), seated on the top of his
// head so they ride the bob, with his horns in front. Small, over a board row's initials, for the boards (title.js now,
// the online boards later: one 0/1 field per run, the mode saying which hat). The grids, seats and palette are the
// owner's mockup's. Loaded after art.js.
var UnrugHats = (function () {
  'use strict';
  const B = UnrugBull, S = UnrugSprites;
  // in the bull's palette (bull.js): K outline, p/o/n red, l/k/j gold
  const GRID = {
    cap: {
      back: ['..KKKKKKKK..', '.KpppppppoK.', '.KooooooonK.', '.KooooooonK.', '.KkllkkllkK.', '..KKKKKKKK..'],
      side: ['..KKKKKKK...', '.KpppppppK..', '.KoooooonK..', '.KoooooonK..', '.KkllkkljK..', '.KKKKKKKKKKK'] },
    crown: {
      back: ['l.....l.....l', 'Kl...KlK...lK', 'KkK.KkkkK.KkK', 'KkkKkkkkkKkkK', 'KkkkkkokkkkkK', 'KjkkkkkkkkkjK', 'KjjjjjjjjjjjK', 'KKKKKKKKKKKKK'],
      side: ['l....l....l', 'Kl..KlK..lK', 'KkK.KkK.KkK', 'KkkKkkkKkkK', 'KkkkkokkkkK', 'KjkkkkkkkjK', 'KjjjjjjjjjK', 'KKKKKKKKKKK'] },
    // a ring floating over the horns; side on it's seen nearly edge on
    halo: {
      back: ['...KKKKKKKKKK...', '.KKllllllllllKK.', 'Kll..........llK', 'Kkj..........jkK', '.KKjjjjjjjjjjKK.', '...KKKKKKKKKK...'],
      side: ['.KKKKKKKK.', 'Kll....llK', '.KjjjjjjK.'] }
  };
  // Where each sits (its top-left, in the sprite's pixels) on each view's reference pose: from behind `stand` (the
  // roof's poses, 68 x 80), side on `idle` (the ride's, 45 x 73), and the front turnaround (36 x 72, the ending). Any
  // other pose moves it by however far its head has moved from the reference's (found once, by matching the head).
  const SEAT = {
    cap: { back: { x: 22, y: 10 }, side: { x: 4, y: 3 }, front: { x: 12, y: 2 } },
    crown: { back: { x: 21, y: 8 }, side: { x: 4, y: 1 }, front: { x: 11, y: 0 } },
    halo: { back: { x: 20, y: 2 }, side: { x: 7, y: -4 }, front: { x: 10, y: -6 } }
  };
  // the head (and horns) of each reference pose, for the matching: rows, columns, and how far to look
  const REF = {
    back: { rows: B.POSES.stand, y0: 9, y1: 26, x0: 12, x1: 44, dx: [-14, 8], dy: [-12, 12] },
    side: { rows: B.SIDES.idle, y0: 0, y1: 18, x0: 5, x1: 22, dx: [-6, 6], dy: [-8, 8] }
  };
  const HORN = 'UWXV';
  // which hat a mode's top gives, and so which one its board shows (Baby Bull's gives none)
  const OF = { regular: 'cap', raging: 'crown', impossibull: 'halo' };
  // over a board row's initials, at the letters' pixel size (the owner's board mockup)
  const BOARD = {
    cap: ['.ppppp.', 'ooooooo', 'kklkkll'],
    crown: ['l..l..l', 'kk.k.kk', 'kkkwkkk', 'jjjjjjj'],
    halo: ['.lllll.', 'k.....k', '.jjjjj.', '.......']   // a floating ring: its blank last row lifts it off the letters
  };
  const BOARD_PAL = { p: '#f7704b', o: '#cf362b', k: '#e3a733', l: '#fff07e', j: '#ad6a1c', w: '#fff8e4' };

  const paint = rows => B.paint(rows);
  const IMG = {};
  for (const k in GRID) IMG[k] = { back: paint(GRID[k].back), side: paint(GRID[k].side) };
  // the operator (the soul sprite at twice its size) in two parts, so his halo, its top five rows, can lift off
  const SOUL = S.CAST.SOUL;
  const OP_BODY = S.paint(SOUL.map((r, i) => i < 5 ? '.'.repeat(r.length) : r)), OP_HALO = S.paint(SOUL.slice(0, 5));

  // how far a pose's head sits from its view's reference pose: the offset where the reference's head matches best
  const OFFSETS = new Map();
  function offset(view, rows) {
    if (view === 'front' || !rows) return { dx: 0, dy: 0 };
    let o = OFFSETS.get(rows); if (o) return o;
    const R = REF[view];
    if (rows === R.rows) o = { dx: 0, dy: 0 };
    else {
      let best = -1;
      for (let dy = R.dy[0]; dy <= R.dy[1]; dy++) for (let dx = R.dx[0]; dx <= R.dx[1]; dx++) {
        let n = 0;
        for (let y = R.y0; y < R.y1; y++) {
          const a = R.rows[y], b = rows[y + dy]; if (!b) continue;
          for (let x = R.x0; x < R.x1; x++) { const c = a[x]; if (c !== '.' && b[x + dx] === c) n++; }
        }
        const near = Math.abs(dx) + Math.abs(dy);
        if (n > best || (n === best && near < Math.abs(o.dx) + Math.abs(o.dy))) { best = n; o = { dx, dy }; }
      }
    }
    OFFSETS.set(rows, o); return o;
  }
  // his horns alone, to go back over the hat
  const HORNS = new Map();
  function horns(rows) {
    let c = HORNS.get(rows);
    if (!c) { c = paint(rows.map(r => r.replace(/./g, ch => HORN.includes(ch) ? ch : '.'))); HORNS.set(rows, c); }
    return c;
  }
  const gridOf = (kind, view) => GRID[kind][view === 'side' ? 'side' : 'back'];
  // where the hat sits on this pose (top-left, size), in the sprite's pixels
  function seat(kind, view, rows) {
    const s = SEAT[kind][view], o = offset(view, rows), gr = gridOf(kind, view);
    return { x: s.x + o.dx, y: s.y + o.dy, w: gr[0].length, h: gr.length };
  }
  function glowAt(g, cx, cy, r, a) {
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(cx, cy, 1, cx, cy, r);
    gr.addColorStop(0, 'rgba(255,244,176,' + a + ')'); gr.addColorStop(1, 'rgba(255,244,176,0)');
    g.fillStyle = gr; g.fillRect(cx - r, cy - r, r * 2, r * 2); g.restore();
  }
  function sparkle(g, x, y, k, col) {
    const a = Math.round(k * 3); if (a <= 0) return;
    g.fillStyle = col || '#fff8e4'; g.fillRect(x, y - a, 1, a * 2 + 1); g.fillRect(x - a, y, a * 2 + 1, 1);
  }
  // The crown catches the light: a glint runs across it every couple of seconds and a point twinkles now and then.
  function glint(g, hx, hy, w, t) {
    const k = (t % 2.2) / .5;
    if (k < 1) { const gx = Math.round(hx + k * (w + 4) - 2); g.fillStyle = 'rgba(255,248,228,.9)'; g.fillRect(gx, hy + 2, 1, 5); g.fillRect(gx + 1, hy + 3, 1, 3); }
    const p = Math.floor(t * 3) % 3, tip = [0, Math.floor(w / 2), w - 1][p];
    if ((t * 3) % 1 < .5) sparkle(g, hx + tip, hy - 1, .4);
  }
  // A hat on him, drawn in the sprite's own pixels: the caller has put (0, 0) at the sprite's top-left at the sprite's
  // scale (and mirrored it when he faces left). view: 'back', 'side' or 'front'; rows: the pose's grid; t: seconds.
  function drawOn(g, kind, view, rows, t) {
    if (!kind || !GRID[kind]) return;
    const s = seat(kind, view, rows), img = IMG[kind][view === 'side' ? 'side' : 'back'];
    const hy = s.y + (kind === 'halo' ? Math.round(Math.sin((t || 0) * 3)) : 0);   // the halo floats with a slow bob
    if (kind === 'halo') glowAt(g, s.x + s.w / 2, hy + 2, 11 + Math.sin((t || 0) * 2.4) * 1.5, .45);
    g.drawImage(img, s.x, hy);
    if (kind === 'crown') glint(g, s.x, hy, s.w, t || 0);
    // his horns stay in front of it
    const H = horns(rows), x0 = Math.max(0, s.x), y0 = Math.max(0, hy), x1 = Math.min(H.width, s.x + s.w), y1 = Math.min(H.height, hy + s.h);
    if (x1 > x0 && y1 > y0) g.drawImage(H, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  }
  // The small hat over a board row's initials: centred on cx, its bottom row one letter pixel above the letters' top
  // (y), at the letters' pixel size s.
  function board(g, kind, cx, y, s = 1) {
    const rows = BOARD[kind]; if (!rows) return;
    const w = rows[0].length, x0 = Math.round(cx - w * s / 2), y0 = y - s - rows.length * s;
    rows.forEach((r, j) => { for (let i = 0; i < w; i++) if (r[i] !== '.') { g.fillStyle = BOARD_PAL[r[i]]; g.fillRect(x0 + i * s, y0 + j * s, s, s); } });
  }
  return { GRID, SEAT, OF, BOARD, BOARD_PAL, IMG, OP_BODY, OP_HALO, offset, seat, drawOn, board, glint, glowAt, sparkle, of: mode => OF[mode] || null };
})();
