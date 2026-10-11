// Floor 13's sets: each section's own look and dressing down the hall, drawn the game's way (game units, into the lit
// and glow layers). Classic script, loaded before floor13.js, which makes it once with the projection and calls it.
// Pieces sit in fixed slots down the hall (one piece per slot and side, picked from the slot's number, so the same
// slot always shows the same thing); floor13.js says which section each slot is in and skips the ones where a station
// or a worker stands. Cosmetic only: nothing here touches the run or its random numbers.
var UnrugSets = function (o) {
  'use strict';
  const A = UnrugArt, { VX, HY, sc, PX, FY, CY, YH } = o;
  const EYE = (FY(0) - HY) / (FY(0) - CY(0));   // the eye's height, as a share of the hall
  let T = 0;                           // the run's clock, for things that blink or sway
  // ---------- helpers, in game units ----------
  const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hp = v => Math.round(v * 2) / 2;   // to the picture's pixel (half a game unit)
  const P = (u, z, h) => [hp(PX(u, z)), hp(YH(z, h))];
  function rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(hp(x), hp(y), Math.max(.5, hp(w)), Math.max(.5, hp(h))); }
  function quad(g, c, pts) { g.fillStyle = c; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); }
  // a flat rectangle on a side wall (or any plane of constant u), from z to z + dz, heights h0 to h1
  const wallQ = (g, c, u, z, dz, h0, h1) => quad(g, c, [P(u, z, h1), P(u, z + dz, h1), P(u, z + dz, h0), P(u, z, h0)]);
  // a flat rectangle facing you (constant z), across u0..u1
  const faceQ = (g, c, u0, u1, z, h0, h1) => { const x0 = PX(u0, z), x1 = PX(u1, z), y0 = YH(z, h1), y1 = YH(z, h0); rect(g, Math.min(x0, x1), y0, Math.abs(x1 - x0), y1 - y0, c); };
  // flat on the floor
  const floorQ = (g, c, u0, u1, z0, z1) => quad(g, c, [P(u0, z0, 0), P(u1, z0, 0), P(u1, z1, 0), P(u0, z1, 0)]);
  // a box standing beside the aisle on side s: from u0 (its aisle side) to u1 (toward the wall), z0 (its front) to z1,
  // heights h0 to h1. The faces you can see: its aisle side, its top (if below the eye) and its front.
  function cub(g, s, u0, u1, z0, z1, h0, h1, top, front, side) {
    quad(g, side, [P(s * u0, z0, h0), P(s * u0, z1, h0), P(s * u0, z1, h1), P(s * u0, z0, h1)]);
    if (h1 < EYE) quad(g, top, [P(s * u0, z0, h1), P(s * u1, z0, h1), P(s * u1, z1, h1), P(s * u0, z1, h1)]);
    else quad(g, top, [P(s * u0, z0, h0), P(s * u1, z0, h0), P(s * u1, z1, h0), P(s * u0, z1, h0)]);
    faceQ(g, front, s * u0, s * u1, z0, h0, h1);
  }
  // an image laid on a wall (a plane of constant u), column by column so it keeps its perspective
  // (no more columns than it has pixels across on screen; on the right wall it reads from the far end, as you'd read
  // it facing that wall)
  function wallImg(g, img, u, z, dz, h0, h1) {
    const n = img.width, ih = img.height, cols = clamp(Math.ceil(Math.abs(PX(u, z) - PX(u, z + dz)) * 2), 1, n);
    for (let j = 0; j < cols; j++) {
      const s0 = Math.floor(j * n / cols), s1 = Math.max(s0 + 1, Math.floor((j + 1) * n / cols));
      const a = u > 0 ? n - s1 : s0, b = u > 0 ? n - s0 : s1;
      const za = z + dz * a / n, zb = z + dz * b / n, xa = PX(u, za), xb = PX(u, zb), ya = YH(za, h1), yb = YH(za, h0);
      const x0 = hp(Math.min(xa, xb)), x1 = hp(Math.max(xa, xb));
      g.drawImage(img, s0, 0, s1 - s0, ih, x0, hp(ya), Math.max(.5, x1 - x0), Math.max(.5, hp(yb - ya)));
    }
  }
  // an image facing you, its foot at (u, z, h), w game units wide at the front of the hall
  function faceImg(g, img, u, z, h, w) {
    const k = sc(z), ww = Math.max(.5, hp(w * k)), hh = Math.max(.5, hp(w * k * img.height / img.width));
    g.drawImage(img, hp(PX(u, z) - ww / 2), hp(YH(z, h) - hh), ww, hh);
  }
  const C = (w, h, fn) => { const c = A.canvas(w, h), x = c.getContext('2d'); x.imageSmoothingEnabled = false; fn(x); return c; };
  // a sign: text on a plate, one image pixel to a game unit
  function plate(text, fg, bg, edge) { const w = A.textWidth(text) + 6; return C(w, 9, x => { x.fillStyle = edge || '#1a1418'; x.fillRect(0, 0, w, 9); x.fillStyle = bg; x.fillRect(1, 1, w - 2, 7); A.txt(x, text, 3, 2, fg); }); }
  function strings(g, pts, c, wd) { g.strokeStyle = c; g.lineWidth = wd || .5; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }

  // ---------- art made once ----------
  const POSTER = [
    ['#ffd44a', 'TEAMWORK'], ['#7fd4ff', 'FOCUS'], ['#ff7050', 'GOALS'], ['#5ac08a', 'GROWTH']
  ].map(([col, word], i) => C(20, 26, x => {
    x.fillStyle = '#1a1418'; x.fillRect(0, 0, 20, 26); x.fillStyle = '#e8e4d8'; x.fillRect(1, 1, 18, 24); x.fillStyle = col; x.fillRect(2, 2, 16, 15);
    x.fillStyle = '#1a1418';
    if (i === 0) { for (let k = 0; k < 6; k++) { x.fillRect(4 + k, 13 - k, 1, k + 1); x.fillRect(15 - k, 13 - k, 1, k + 1); } x.fillStyle = '#fff'; x.fillRect(9, 7, 2, 1); }
    else if (i === 1) { x.fillRect(6, 9, 8, 6); x.fillRect(6, 7, 2, 2); x.fillRect(12, 7, 2, 2); x.fillStyle = col; x.fillRect(8, 11, 1, 1); x.fillRect(11, 11, 1, 1); }
    else if (i === 2) { [[3, 14], [6, 11], [9, 12], [12, 8], [15, 5]].forEach(([a, b], j, l) => { if (j) A.line(x, l[j - 1][0], l[j - 1][1], a, b, '#1a1418'); }); }
    else { x.fillStyle = '#d63428'; x.fillRect(4, 8, 12, 5); x.fillStyle = '#ffd44a'; x.fillRect(4, 8, 12, 1); x.fillRect(4, 12, 12, 1); }
    A.txt(x, word.slice(0, 4), 2, 19, '#1a1418');
  }));
  const WHITEBOARD = C(40, 20, x => {
    x.fillStyle = '#8a8e9c'; x.fillRect(0, 0, 40, 20); x.fillStyle = '#eef2fa'; x.fillRect(1, 1, 38, 17); x.fillStyle = '#8a8e9c'; x.fillRect(4, 18, 32, 2);
    A.txt(x, 'Q4', 3, 3, '#2a5aa0'); [[14, 5, 18, 9], [18, 9, 23, 6], [23, 6, 30, 13], [30, 13, 36, 15]].forEach(([a, b, c, d]) => A.line(x, a, b, c, d, '#d63428'));
    x.fillStyle = '#2a5aa0'; x.fillRect(3, 11, 9, 1); x.fillRect(3, 13, 7, 1); x.fillRect(3, 15, 10, 1);
  });
  const CAL = C(12, 14, x => { x.fillStyle = '#1a1418'; x.fillRect(0, 0, 12, 14); x.fillStyle = '#fff6e2'; x.fillRect(1, 1, 10, 12); x.fillStyle = '#d63428'; x.fillRect(1, 1, 10, 3); x.fillStyle = '#9a917c'; for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) x.fillRect(2 + j * 2, 6 + i * 2, 1, 1); x.fillStyle = '#d63428'; x.fillRect(6, 8, 1, 1); });
  const MOVE_SIGN = C(37, 18, x => { x.fillStyle = '#1a1418'; x.fillRect(0, 1, 37, 17); x.fillStyle = '#f2eee2'; x.fillRect(1, 2, 35, 15); A.txt(x, 'MOVING', 7, 4, '#1a1418'); A.txt(x, 'DAY', 13, 10, '#d63428'); x.fillStyle = '#c8a868'; x.fillRect(0, 0, 5, 3); x.fillRect(32, 0, 5, 3); });
  const ARROW_SIGN = C(38, 11, x => { x.fillStyle = '#1a1418'; x.fillRect(0, 0, 38, 11); x.fillStyle = '#f2eee2'; x.fillRect(1, 1, 36, 9); A.txt(x, 'FACILITIES', 2, 3, '#1a1418'); });
  const GHOST_PAPER = C(10, 12, x => { x.fillStyle = '#f2eee2'; x.fillRect(0, 0, 10, 12); x.fillStyle = '#8a8094'; x.fillRect(2, 2, 6, 1); x.fillRect(2, 4, 5, 1); x.fillRect(2, 6, 6, 1); x.fillStyle = '#c8a868'; x.fillRect(0, 0, 3, 2); x.fillRect(7, 0, 3, 2); });
  const SLIDE = C(40, 24, x => {
    x.fillStyle = '#e8f4ff'; x.fillRect(0, 0, 40, 24); x.fillStyle = '#2a5aa0'; x.fillRect(0, 0, 40, 6); A.txt(x, 'Q4 RUGS', 2, 1, '#ffffff');
    [9, 7, 8, 5, 3].forEach((v, i) => { x.fillStyle = i > 2 ? '#d63428' : '#2a5aa0'; x.fillRect(5 + i * 7, 22 - v * 1.6, 5, v * 1.6); });
    x.fillStyle = '#7c8494'; x.fillRect(3, 22, 34, 1);
  });
  const BANNERS = ['ALL STAFF', 'WELCOME TEAM', 'THANK YOU'].map(t => C(A.textWidth(t) + 10, 11, x => {
    x.fillStyle = '#1a1418'; x.fillRect(0, 0, A.textWidth(t) + 10, 11); x.fillStyle = '#961e16'; x.fillRect(1, 1, A.textWidth(t) + 8, 9); x.fillStyle = '#b8302a'; x.fillRect(1, 1, A.textWidth(t) + 8, 1); A.txt(x, t, 5, 3, '#ffd44a');
  }));
  const EXIT = C(17, 9, x => { x.fillStyle = '#0a2418'; x.fillRect(0, 0, 17, 9); x.fillStyle = '#124a2c'; x.fillRect(0, 0, 17, 1); A.txt(x, 'EXIT', 2, 2, '#9cf0b4'); });
  const COPY_SIGN = plate('COPY ROOM', '#1a1418', '#c8bfa8');
  const NO_SIT = C(30, 16, x => { x.fillStyle = '#1a1418'; x.fillRect(0, 0, 30, 16); x.fillStyle = '#fff6e2'; x.fillRect(1, 1, 28, 14); A.txt(x, 'DO NOT', 3, 2, '#d63428'); A.txt(x, 'SIT ON', 3, 9, '#1a1418'); });
  const OUT_ORDER = C(22, 12, x => { x.fillStyle = '#ffd44a'; x.fillRect(0, 0, 22, 12); A.txt(x, 'OUT', 5, 1, '#1a1418'); A.txt(x, 'ORDER', 1, 6, '#1a1418'); });
  const AP_SIGN = plate('AP', '#fff6e2', '#2a3c6a');

  // ---------- RugCo's rugs, hung on the walls ----------
  // Bold and flat: a field, a border, one motif, fringe at the ends. No faces (those are carpshits) and nothing that
  // could pass for a pickup. One image pixel to a game unit.
  function rugArt(w, h, o) {
    return C(w, h, x => {
      const f = o.fringe === 'sides' ? 2 : 0, fb = o.fringe === 'sides' ? 0 : 2, iw = w - f * 2, ih = h - fb;
      const R = (a, b, c, d, col) => { x.fillStyle = col; x.fillRect(a, b, c, d); };
      // fringe
      R(0, 0, w, h, 'rgba(0,0,0,0)');
      if (f) for (let y = 1; y < h - 1; y += 2) { R(0, y, f, 1, o.fr || '#f2eee2'); R(w - f, y, f, 1, o.fr || '#f2eee2'); }
      else for (let i = 1; i < w - 1; i += 2) R(i, h - fb, 1, fb, o.fr || '#f2eee2');
      R(f, 0, iw, ih, '#1a1418');
      R(f + 1, 1, iw - 2, ih - 2, o.border);
      const b = o.bw || 3;
      R(f + 1 + b, 1 + b, iw - 2 - b * 2, ih - 2 - b * 2, o.inner || o.field);
      R(f + 2 + b, 2 + b, iw - 4 - b * 2, ih - 4 - b * 2, o.field);
      const cx = f + iw / 2, cy = ih / 2;
      if (o.motif === 'diamond' || o.motif === 'medallion') {
        const rr = Math.floor(Math.min(iw, ih) / 2 - b - 3);
        for (let dy = -rr; dy <= rr; dy++) { const ww = rr - Math.abs(dy); R(Math.round(cx - ww - .5), Math.round(cy + dy - .5), ww * 2 + 1, 1, o.mc); }
        const r2 = Math.floor(rr / 2);
        for (let dy = -r2; dy <= r2; dy++) { const ww = r2 - Math.abs(dy); R(Math.round(cx - ww - .5), Math.round(cy + dy - .5), ww * 2 + 1, 1, o.mc2 || o.border); }
        if (o.motif === 'medallion') for (const [ax, ay] of [[f + b + 4, b + 4], [w - f - b - 6, b + 4], [f + b + 4, ih - b - 6], [w - f - b - 6, ih - b - 6]]) R(ax, ay, 2, 2, o.mc);
      } else if (o.motif === 'bands') {
        for (let i = 0; i < 3; i++) R(f + b + 3 + Math.round(i * (iw - 2 * b - 8) / 2), 2 + b, 2, ih - 4 - b * 2, o.mc);
      } else if (o.motif === 'text') {
        A.txt(x, o.text, Math.round(cx - A.textWidth(o.text) / 2), Math.round(cy - 2.5), o.mc);
        R(f + b + 4, Math.round(cy - 6), iw - 2 * b - 8, 1, o.mc2); R(f + b + 4, Math.round(cy + 4), iw - 2 * b - 8, 1, o.mc2);
      }
    });
  }
  const RUGS = {
    // Accounts Payable: the rug of the month, framed; corporate runners on rods
    month: [rugArt(22, 28, { field: '#d63428', border: '#ffd44a', inner: '#961e16', motif: 'medallion', mc: '#ffd44a', mc2: '#2a5aa0' }),
      rugArt(22, 28, { field: '#2a5aa0', border: '#d63428', inner: '#1e3a6c', motif: 'diamond', mc: '#ffd44a', mc2: '#d63428' }),
      rugArt(22, 28, { field: '#3a9a5a', border: '#ffd44a', inner: '#1f6a40', motif: 'diamond', mc: '#f2eee2', mc2: '#d63428' })],
    runner: [rugArt(46, 16, { fringe: 'sides', field: '#2a5aa0', border: '#ffd44a', bw: 2, motif: 'bands', mc: '#d63428' }),
      rugArt(46, 16, { fringe: 'sides', field: '#d63428', border: '#2a5aa0', bw: 2, motif: 'bands', mc: '#ffd44a' })],
    // All Staff: the company rug, big, red and gold, a medallion in the middle
    rugco: rugArt(44, 30, { field: '#b8302a', border: '#ffd44a', inner: '#961e16', bw: 3, motif: 'medallion', mc: '#ffd44a', mc2: '#2a5aa0' }),
    // Moving day: half taken down
    half: [rugArt(24, 30, { field: '#2a5aa0', border: '#ffd44a', motif: 'diamond', mc: '#d63428', mc2: '#ffd44a' }),
      rugArt(24, 30, { field: '#d63428', border: '#3aa8e0', motif: 'diamond', mc: '#ffd44a', mc2: '#2a5aa0' })],
    // Copy room: an old one, faded by the copier light, its corner curling
    old: rugArt(30, 24, { field: '#b0604a', border: '#d8c088', inner: '#94503e', motif: 'medallion', mc: '#e8d8a8', mc2: '#7a8aa0', fr: '#d8d0b8' })
  };
  const RUG_PLATE = C(37, 7, x => { x.fillStyle = '#1a1418'; x.fillRect(0, 0, 37, 7); x.fillStyle = '#ffd44a'; x.fillRect(1, 1, 35, 5); A.txt(x, 'RUG', 2, 1, '#1a1418'); A.txt(x, 'OF', 15, 1, '#1a1418'); A.txt(x, 'MONTH', 23, 1, '#1a1418'); });
  // a rug hung on a wall: a rod above it (and its back showing where a corner has come loose)
  function rugWall(g, gl, it, z) {
    const s = it.s;
    if (it.kind === 'rugframe') {
      // framed in gold, with its plate under it
      wallQ(g, '#1a1418', s, z - .006, .102, .4, .71);
      wallQ(g, '#c87818', s, z - .003, .096, .405, .705);
      wallImg(g, RUGS.month[it.n % 3], s * .998, z + .006, .078, .42, .69);
      wallImg(g, RUG_PLATE, s * .998, z + .02, .05, .36, .385);
    } else if (it.kind === 'runner') {
      wallQ(g, '#3a3a46', s, z - .01, .24, .73, .745);
      wallImg(g, RUGS.runner[it.n % 2], s * .998, z, .22, .56, .73);
    } else if (it.kind === 'rugco') {
      wallQ(g, '#6a3410', s, z - .012, .264, .79, .805);
      wallImg(g, RUGS.rugco, s * .998, z, .24, .4, .79);
    } else if (it.kind === 'halfrug') {
      // the near end's hooks are off: that end hangs down, its back showing
      const zz = z, dz = .1;
      wallQ(g, '#3a3a46', s, zz - .005, dz + .01, .74, .75);
      wallImg(g, RUGS.half[it.n % 2], s * .998, zz, dz, .38, .74);
      quad(g, '#c8b89a', [P(s * .996, zz, .74), P(s * .996, zz + dz * .45, .74), P(s * .996, zz, .52)]);
      quad(g, '#5a4a3a', [P(s * .997, zz, .74), P(s * .997, zz + dz * .45, .74), P(s * .997, zz + dz * .4, .73)]);
    } else if (it.kind === 'oldrug') {
      wallQ(g, '#3a3a46', s, z - .006, .172, .76, .772);
      wallImg(g, RUGS.old, s * .998, z, .16, .44, .76);
      // the bottom near corner curling up
      quad(g, '#d8c8a8', [P(s * .99, z, .44), P(s * .99, z + .045, .44), P(s * .99, z, .52)]);
    }
  }
  // Moving day: rugs rolled up and stood against the wall
  function mvRolls(g, gl, it, z) {
    const s = it.s, cols = [['#d63428', '#ffd44a'], ['#2a5aa0', '#f2eee2'], ['#3a9a5a', '#ffd44a']];
    for (let i = 0; i < 3; i++) {
      const zz = z + i * .035, lean = .03 + i * .01, hh = .42 - i * .05, [c, b] = cols[(it.n + i) % 3], k = sc(zz), rw = Math.max(1, 3.5 * k);
      const [x0, y0] = P(s * (.95 - lean), zz, 0), [x1, y1] = P(s * .99, zz, hh);
      g.lineCap = 'butt'; g.strokeStyle = '#1a1418'; g.lineWidth = rw * 2 + 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      g.strokeStyle = c; g.lineWidth = rw * 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      for (const t of [.12, .88]) { g.strokeStyle = b; g.lineWidth = rw * 2; g.beginPath(); g.moveTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t); g.lineTo(x0 + (x1 - x0) * (t + .04), y0 + (y1 - y0) * (t + .04)); g.stroke(); }
      A.disc(g, x1, y1, Math.max(1, Math.round(rw)), b); A.disc(g, x1, y1, Math.max(.5, Math.round(rw * .45)), c);
    }
  }
  const label = {};
  const lab = (t, fg, bg) => label[t] || (label[t] = plate(t, fg || '#1a1418', bg || '#f2eee2'));

  // ---------- the sets ----------
  // Each section is a strip of slots down the hall. Each slot on each side gets one piece of dressing (from its
  // index, so it's the same every time you pass), drawn far to near; the wall gets its own row. look and the view
  // settings go to the renderer; lights() adds the lights the dressing gives off.
  const SECTIONS = {};

  // -- Accounts Payable: rows of cubicles along both walls, a screen on every desk, carpshits at work, posters above --
  function apBay(g, gl, it, z, dark) {
    const s = it.s, top = .3, z1 = z + .27;
    // the monitor on the desk against the wall, its screen toward the aisle; the carpshit at it peeking over
    const zm = z + .1 + it.r * .05, on = !dark || it.r > .5, near = z < 1.6;
    wallQ(g, '#2a2c34', s * .96, zm + .02, .012, .26, .29);
    wallQ(g, '#1a1418', s * .96, zm, .052, .285, .37);
    if (on) wallQ(gl, dark ? '#1f7a44' : it.r > .7 ? '#46aad4' : '#3cba6a', s * .955, zm + .006, .04, .295, .362);
    else wallQ(g, '#24222f', s * .955, zm + .006, .04, .295, .362);
    if (on && near) for (let i = 0; i < 3; i++) wallQ(gl, '#c8f4ff', s * .95, zm + .01, .012 + ((i * 7 + it.n) % 3) * .006, .345 - i * .016, .349 - i * .016);
    if (dark && it.r < .55 && near) {
      // in the dark only its eyes show
      const k = sc(z + .15), x = PX(s * .79, z + .15), y = YH(z + .15, top + .045), e = Math.max(.5, hp(1.5 * k));
      if ((T + it.n * .7) % 4 > .3) { rect(gl, x - 5 * k, y, e, e, '#fff0aa'); rect(gl, x + 4 * k, y, e, e, '#fff0aa'); }
    } else if (it.r < .55 && near) {
      // whoever works here, eyes on the screen, fringe tapping (the work sprite's face)
      const f = A.work('type', [true], it.r < .2)[Math.floor(T * 4 + it.n) % 4], k = sc(z + .15) * .8, w = 26 * k;
      g.drawImage(f, 7, 4, 26, 10, hp(PX(s * .79, z + .15) - w / 2), hp(YH(z + .15, top + .07) - 4 * k), hp(w), hp(10 * k));
    }
    // the partition along the aisle, then the end panel facing you, with a name card
    cub(g, s, .62, .65, z, z1, 0, top, '#7a7e8c', '#3e475e', '#46506a');
    for (let i = 1; i < 3; i++) wallQ(g, '#363e52', s * .62, z + i * .09, .004, 0, top);
    cub(g, s, .62, 1, z, z + .012, 0, top, '#7a7e8c', '#46506a', '#3e475e');
    const nx = PX(s * .7, z), k = sc(z);
    if (z > 1.6) return;
    if (it.r > .3) { rect(g, nx - 3 * k, YH(z, .22), 6 * k, 3 * k, '#f2eee2'); rect(g, nx - 2 * k, YH(z, .22) + k, 4 * k, .5, '#3a5a8a'); }
    if (it.r * 7 % 1 > .5) rect(g, PX(s * .86, z) - 3 * k, YH(z, .2), 6 * k, 8 * k, '#ffd44a');   // a sticky note
  }
  function apCabinet(g, gl, it, z) {
    const s = it.s;
    cub(g, s, .8, 1, z, z + .07, 0, .2, '#8a8e9c', '#6a6e7a', '#5a5e6a');
    for (let i = 1; i < 3; i++) faceQ(g, '#4a4e5a', s * .8, s * 1, z, i * .066, i * .066 + .006);
    for (let i = 0; i < 3; i++) faceQ(g, '#c8d0dc', s * .88, s * .92, z, i * .066 + .04, i * .066 + .048);
    if (it.r > .5) faceImg(g, A.COOLER, s * .7, z + .04, 0, 14);
    else { // a plant
      const x = PX(s * .7, z + .03), y = FY(z + .03), u = sc(z + .03);
      rect(g, x - 3 * u, y - 5 * u, 6 * u, 5 * u, '#8c4a2a');
      for (let i = 0; i < 6; i++) A.disc(g, x + Math.sin(i * 2.1) * 4 * u, y - 9 * u - i * 2 * u, Math.max(1, Math.round(3 * u)), i % 2 ? '#2a7a4a' : '#3a9a5a');
    }
  }
  function apDesk(g, gl, it, z) {
    const kinds = ['type', 'call', 'sleep', 'type'], kind = kinds[it.n % 4], K = A.WORK_KINDS[kind];
    const fr = A.work(kind, [true], it.r > .5)[Math.floor(T * 4 + it.n) % 4], k = sc(z + .08) * .8;
    g.drawImage(fr, hp(PX(it.s * .8, z + .08) - K.w * k / 2), hp(FY(z + .08) - K.h * k), hp(K.w * k), hp(K.h * k));
    apCabinet(g, gl, { s: it.s, r: .6, n: it.n }, z + .18);
  }
  function apWall(g, gl, it, z) {
    const s = it.s;
    if (it.kind === 'poster') wallImg(g, POSTER[it.n % 4], s, z, .07, .44, .66);
    else if (it.kind === 'board') wallImg(g, WHITEBOARD, s, z, .2, .42, .62);
    else if (it.kind === 'clock') { const x = PX(s, z), y = YH(z, .64), rr = Math.max(1, Math.round(5 * sc(z))); A.disc(g, x, y, rr + 1, '#1a1418'); A.disc(g, x, y, rr, '#fff6e2'); A.line(g, x, y, x, y - rr * .7, '#1a1418'); A.line(g, x, y, x + rr * .6 * Math.sin(T), y - rr * .6 * Math.cos(T), '#d63428'); }
    else if (it.kind === 'cal') wallImg(g, CAL, s, z, .04, .44, .56);
    else if (it.kind === 'sign') wallImg(g, AP_SIGN, s, z, .05, .66, .72);
  }
  SECTIONS.ap = {
    name: 'Accounts Payable', slot: .3, wslot: .42,
    blurb: 'Cubicle rows down both walls, end panels toward you with name cards. A screen glows on every desk (glow layer), carpshits peek over the partitions; posters, whiteboards and calendars on the walls above. Cool office light, blue-grey walls, the blue rail.',
    view: { power: 1, house: 1, rail: '#3a5a8a', look: { lo: [.09, .1, .15], hi: [.18, .19, .24], ti: [.12, .13, .18], lamp: [1.6, 1.62, 1.5] } },
    piece: (n, s, r) => (n % 6 === 3 + (s > 0 ? 1 : 0)) ? 'cabinet' : (n % 9 === (s > 0 ? 7 : 1)) ? 'desk' : 'bay',
    wall: (n, s, r) => ['rugframe', 'runner', 'board', 'rugframe', 'clock', 'runner', 'cal', 'rugframe', 'poster', 'sign'][(n * 3 + (s > 0 ? 5 : 0)) % 10],
    draw: { bay: apBay, cabinet: apCabinet, desk: apDesk, poster: apWall, board: apWall, clock: apWall, cal: apWall, sign: apWall, rugframe: rugWall, runner: rugWall },
    lights: () => {}
  };

  // -- Moving day / heavy lifting: Facilities is moving out. Boxes, dollies, wrapped furniture, bare walls --
  const BOXC = [['#9a6a3a', '#76492a', '#5a361c'], ['#8e6034', '#6c4226', '#52321a'], ['#a07040', '#7c4e2c', '#5e3a1e']];   // dull carton browns, like the cartons in the hall
  function mvBox(g, s, u0, z, w, d, h0, h, c, it, tag) {
    const [t, f, sd] = BOXC[c % 3];
    cub(g, s, u0, u0 + w, z, z + d, h0, h0 + h, t, f, sd);
    // tape down the middle of the top and the front
    if (h0 + h < EYE) quad(g, '#8a6038', [P(s * (u0 + w * .45), z, h0 + h), P(s * (u0 + w * .55), z, h0 + h), P(s * (u0 + w * .55), z + d, h0 + h), P(s * (u0 + w * .45), z + d, h0 + h)]);
    faceQ(g, '#8a6038', s * (u0 + w * .45), s * (u0 + w * .55), z, h0 + h * .6, h0 + h);
    if (tag) { const k = sc(z); rect(g, PX(s * (u0 + w * .2), z) - (s > 0 ? 0 : 4 * k), YH(z, h0 + h * .45), 4 * k, 2 * k, '#1a1418'); }
  }
  function mvStack(g, gl, it, z) {
    const s = it.s, n = 2 + (it.n % 3);
    // a stack against the wall and a smaller one in front of it
    let h = 0;
    for (let i = 0; i < n; i++) { const hh = .07 + ((it.n + i) % 2) * .015; mvBox(g, s, .74 + (i % 2) * .02, z + .06, .2, .07, h, hh, it.n + i, it, i === 0); h += hh; }
    mvBox(g, s, .66, z, .14, .05, 0, .06, it.n + 1, it, true);
    if (it.r > .6) { const k = sc(z); rect(g, PX(s * .7, z) - 3 * k, YH(z, .085), 6 * k, 1.5 * k, '#ffd44a'); }
  }
  function mvDolly(g, gl, it, z) {
    const s = it.s, u = .72;
    mvBox(g, s, u, z + .01, .14, .05, .01, .07, it.n, it, true);
    mvBox(g, s, u + .01, z + .01, .12, .05, .08, .06, it.n + 1, it, false);
    // the hand truck: two rails up the back, a nose plate, wheels
    const k = sc(z + .06);
    for (const du of [0, .14]) { const [x0, y0] = P(s * (u + du), z + .06, 0), [x1, y1] = P(s * (u + du), z + .06, .2); strings(g, [[x0, y0], [x1, y1]], '#3a3a46', Math.max(.5, k)); }
    faceQ(g, '#5a5a66', s * u, s * (u + .14), z + .005, 0, .012);
    for (const du of [-.005, .145]) A.disc(g, PX(s * (u + du), z + .06), FY(z + .06) - 2 * k, Math.max(1, Math.round(2.5 * k)), '#1a1418');
    const [hx, hy] = P(s * (u + .07), z + .06, .21); rect(g, hx - 6 * k, hy, 12 * k, 1.5 * k, '#3a3a46');
  }
  function mvWrapped(g, gl, it, z) {
    // a desk in a quilted blue moving blanket, a chair shrink-wrapped on top
    const s = it.s, z1 = z + .14;
    cub(g, s, .7, .98, z, z1, 0, .14, '#4a6aa8', '#3a5a9a', '#2e4a80');
    for (let i = 1; i < 4; i++) wallQ(g, '#2a4070', s * .7, z + i * .035, .003, .01, .13);
    for (let i = 1; i < 4; i++) faceQ(g, '#2a4070', s * (.7 + i * .07), s * (.7 + i * .07 + .006), z, .01, .13);
    const k = sc(z + .05);
    g.drawImage(A.CHAIR, hp(PX(s * .82, z + .05) - 6 * k * 1.4), hp(YH(z + .05, .14) - 13 * k * 1.4), hp(12 * k * 1.4), hp(13 * k * 1.4));
    // the wrap: a pale sheen over the chair
    g.save(); g.globalAlpha = .45; rect(g, PX(s * .82, z + .05) - 7 * k * 1.4, YH(z + .05, .14) - 13 * k * 1.4, 14 * k * 1.4, 13 * k * 1.4, '#c8f4ff'); g.restore();
    A.line(g, PX(s * .82, z + .05) - 5 * k, YH(z + .05, .14) - 15 * k, PX(s * .82, z + .05) + 4 * k, YH(z + .05, .14) - 3 * k, '#ffffff');
  }
  function mvPanels(g, gl, it, z) {
    // cubicle panels taken down, leaning on the wall, and a roll of tape on the floor by them
    const s = it.s;
    for (let i = 0; i < 3; i++) {
      const zz = z + i * .025, lean = .05;
      quad(g, i % 2 ? '#5a6478' : '#4c5468', [P(s * (.97 - lean), zz, 0), P(s * (.97 - lean), zz + .09, 0), P(s * .99, zz + .09, .3), P(s * .99, zz, .3)]);
      quad(g, '#8a8e9c', [P(s * .99, zz, .3), P(s * .99, zz + .09, .3), P(s * .985, zz + .09, .29), P(s * .985, zz, .29)]);
    }
    const k = sc(z - .02), x = PX(s * .8, z - .02), y = FY(z - .02);
    A.disc(g, x, y - 2 * k, Math.max(1, Math.round(2.5 * k)), '#a8885a'); A.disc(g, x, y - 2 * k, Math.max(.5, Math.round(1.2 * k)), '#3a2a1a');
  }
  function mvCart(g, gl, it, z) {
    // a cage trolley full of boxes and a lamp
    const s = it.s, u0 = .68, u1 = .96, z1 = z + .12, h = .2;
    mvBox(g, s, u0 + .02, z + .03, .12, .06, .02, .07, it.n, it, false);
    mvBox(g, s, u0 + .14, z + .03, .1, .06, .02, .09, it.n + 2, it, true);
    const k = sc(z);
    for (const uu of [u0, u1]) for (const zz of [z, z1]) { const [x0, y0] = P(s * uu, zz, .01), [x1, y1] = P(s * uu, zz, h); strings(g, [[x0, y0], [x1, y1]], '#6a6e7a', Math.max(.5, k * .8)); }
    strings(g, [P(s * u0, z, h), P(s * u1, z, h), P(s * u1, z1, h), P(s * u0, z1, h), P(s * u0, z, h)], '#6a6e7a', Math.max(.5, k * .8));
    strings(g, [P(s * u0, z, .1), P(s * u1, z, .1)], '#6a6e7a', .5); strings(g, [P(s * u0, z, .1), P(s * u0, z1, .1)], '#6a6e7a', .5);
    faceQ(g, '#3a3a46', s * u0, s * u1, z, 0, .012);
  }
  function mvWall(g, gl, it, z) {
    const s = it.s;
    if (it.kind === 'ghost') { wallQ(g, '#7a7680', s, z, .07, .45, .66); wallQ(g, '#1a1418', s, z + .033, .003, .655, .66); }   // where a poster was
    else if (it.kind === 'msign') wallImg(g, MOVE_SIGN, s, z, .13, .42, .6);
    else if (it.kind === 'arrow') { wallImg(g, ARROW_SIGN, s, z, .1, .5, .56); }
    else if (it.kind === 'paper') wallImg(g, GHOST_PAPER, s, z, .03, .4, .48);
    else if (it.kind === 'cable') { const pts = []; for (let i = 0; i <= 6; i++) { const zz = z + i * .04; pts.push(P(s * .99, zz, .94 - Math.sin(i / 6 * Math.PI) * .12)); } strings(g, pts, '#1a1418', .5); }
  }
  SECTIONS.move = {
    name: 'Moving day', slot: .32, wslot: .38,
    blurb: 'Facilities is moving out. Box stacks with tape and marker tags, a hand truck, a desk in a quilted blue blanket with a shrink-wrapped chair on top, cubicle panels leaning on the wall, a cage trolley. Bare walls: pale squares where posters were, MOVING DAY and FACILITIES paper signs, a cable hanging from the ceiling. The hazard-yellow rail and a warmer, dustier light. Everything stays outside |u| .62, so the course has the middle.',
    view: { power: 1, house: 1, rail: '#e8b030', look: { lo: [.12, .11, .12], hi: [.21, .2, .21], ti: [.14, .13, .14], sh: .35, lamp: [1.8, 1.55, 1.15] } },
    piece: (n, s, r) => ['stack', 'dolly', 'rolls', 'wrapped', 'panels', 'cart', 'stack', 'rolls'][(n * 3 + (s > 0 ? 3 : 0)) % 8],
    wall: (n, s, r) => ['ghost', 'msign', 'halfrug', 'paper', 'arrow', 'halfrug', 'cable'][(n + (s > 0 ? 3 : 0)) % 7],
    draw: { stack: mvStack, dolly: mvDolly, wrapped: mvWrapped, panels: mvPanels, cart: mvCart, rolls: mvRolls, ghost: mvWall, msign: mvWall, arrow: mvWall, paper: mvWall, cable: mvWall, halfrug: rugWall },
    lights: () => {}
  };

  // -- All Staff: a company meeting. Rows of chairs, balloons, a slide on a screen, a snack table, banners overhead --
  function asChairs(g, gl, it, z) {
    // two rows of stacking chairs facing down the hall (their backs to you), three across
    const s = it.s;
    if (z > 1.4) { for (let row = 1; row >= 0; row--) { const zz = z + row * .1; cub(g, s, .68, .97, zz, zz + .035, .07, .085, '#b8302a', '#7a1c18', '#961e16'); faceQ(g, '#961e16', s * .68, s * .97, zz, .085, .16); faceQ(g, '#3a3a46', s * .68, s * .97, zz, 0, .07); } return; }
    for (let row = 1; row >= 0; row--) for (let i = 2; i >= 0; i--) {
      const zz = z + row * .1, u = .68 + i * .1, k = sc(zz);
      cub(g, s, u, u + .07, zz, zz + .035, .07, .085, '#b8302a', '#7a1c18', '#961e16');
      cub(g, s, u, u + .07, zz, zz + .006, .085, .16, '#5a5a66', '#961e16', '#7a1c18');
      faceQ(g, '#b8302a', s * (u + .005), s * (u + .065), zz, .15, .158);
      for (const du of [.005, .06]) faceQ(g, '#3a3a46', s * (u + du), s * (u + du + .006), zz, 0, .07);
    }
    if (it.r > .4) { // balloons tied to the end chair
      const zb = z + .02, x0 = PX(s * .71, zb), y0 = YH(zb, .16), k = sc(zb);
      for (let i = 0; i < 3; i++) {
        const bx = x0 + (i - 1) * 4 * k + Math.sin(T * 1.3 + i + it.n) * k, by = YH(zb, .34 + (i % 2) * .04) + Math.sin(T * 2 + i * 2) * k;
        strings(g, [[x0, y0], [bx, by]], '#e8e4c8', .5); A.disc(g, bx, by, Math.max(1, Math.round(3 * k)), ['#d63428', '#ffd44a', '#3aa8e0'][(i + it.n) % 3]);
        rect(g, bx - k, by - 2 * k, Math.max(.5, k), Math.max(.5, k), '#ffffff');
      }
    }
  }
  function asTable(g, gl, it, z) {
    // a snack table: a white cloth to the floor, a punch bowl, a sheet cake, cups
    const s = it.s, z1 = z + .16;
    cub(g, s, .7, .92, z, z1, 0, .11, '#f2eee2', '#d8d4cc', '#c8c4bc');
    faceQ(g, '#b8b4a8', s * .7, s * .92, z, 0, .012);
    const k = sc(z + .05);
    cub(g, s, .74, .84, z + .03, z + .08, .11, .125, '#fff6e2', '#e8b0c8', '#d898b0');
    faceQ(g, '#d63428', s * .78, s * .8, z + .03, .125, .135);
    const bx = PX(s * .82, z + .11), by = YH(z + .11, .11);
    rect(g, bx - 4 * k, by - 4 * k, 8 * k, 4 * k, '#c8f4ff'); rect(g, bx - 3 * k, by - 3 * k, 6 * k, 2 * k, '#d63428');
    for (let i = 0; i < 4; i++) rect(g, PX(s * (.74 + i * .03), z + .02) - k, YH(z + .02, .11) - 3 * k, 2 * k, 3 * k, '#fff6e2');
  }
  function asLectern(g, gl, it, z) {
    const s = it.s;
    cub(g, s, .74, .86, z, z + .05, 0, .17, '#7a5434', '#6a4a30', '#4a3020');
    faceQ(g, '#d63428', s * .77, s * .83, z, .1, .13); faceQ(g, '#ffd44a', s * .77, s * .83, z, .125, .13);
    const [mx, my] = P(s * .8, z + .02, .17), [tx, ty] = P(s * .78, z + .02, .23); strings(g, [[mx, my], [tx, ty]], '#1a1418', .5); A.disc(g, tx, ty, 1, '#3a3a46');
    asChairs(g, gl, { s, r: 0, n: it.n }, z + .14);
  }
  function asWall(g, gl, it, z) {
    const s = it.s;
    if (it.kind === 'screen') {
      // a pull-down screen on the wall with the slide on it, and the light it throws
      wallQ(g, '#3a3a46', s, z - .005, .21, .76, .78);
      wallQ(g, '#1a1418', s, z, .2, .4, .76);
      wallImg(gl, SLIDE, s * .995, z + .006, .188, .41, .75);
    } else if (it.kind === 'bunting') {
      // a string of flags along the wall
      const n = 8; for (let i = 0; i < n; i++) { const za = z + i * .04, zb = za + .03, sag = Math.sin((i + .5) / n * Math.PI) * .03; quad(g, ['#d63428', '#ffd44a', '#3aa8e0', '#5ac08a'][(i + it.n) % 4], [P(s, za, .8 - sag), P(s, zb, .8 - sag), P(s, (za + zb) / 2, .75 - sag)]); }
      const pts = []; for (let i = 0; i <= 8; i++) pts.push(P(s, z + i * .04, .8 - Math.sin(i / 8 * Math.PI) * .03)); strings(g, pts, '#e8e4c8', .5);
    } else if (it.kind === 'poster') wallImg(g, POSTER[(it.n + 2) % 4], s, z, .07, .44, .66);
  }
  // across the hall, near the ceiling: a banner facing you, and streamers wall to wall
  function asOver(g, gl, it, z) {
    if (it.kind === 'banner') {
      const img = BANNERS[it.n % 3], k = sc(z), w = img.width * 1.6 * k, h = img.height * 1.6 * k, y = YH(z, .9);
      for (const du of [-.25, .25]) { const x = PX(du, z); strings(g, [[x, YH(z, 1)], [x, y]], '#4c4856', .5); }
      g.drawImage(img, hp(VX - w / 2), hp(y), hp(w), hp(h));
    } else {
      for (const [c, off] of [['#d63428', 0], ['#ffd44a', .03]]) {
        const pts = []; for (let i = 0; i <= 12; i++) { const u = -1 + i / 6, sag = (1 - u * u) * .09; pts.push(P(u, z + off, .97 - sag)); }
        strings(g, pts, c, Math.max(.5, sc(z) * 1.5));
      }
    }
  }
  SECTIONS.staff = {
    name: 'All Staff', slot: .34, wslot: .5, oslot: .9,
    blurb: 'A company meeting in the hall. Rows of red stacking chairs at the sides, their backs to you, balloons tied on; a lectern; a snack table with cake and punch. On the walls a pull-down screen with the Q4 slide (glow layer, and it lights the wall), bunting, posters. Overhead, a banner facing you now and then (ALL STAFF, WELCOME TEAM, THANK YOU) and red and gold streamers wall to wall, all above the action. Warm light, cream walls, wood panels, the red rail.',
    view: { power: 1, house: 1, rail: '#961e16', look: { lo: [.16, .1, .07], hi: [.24, .21, .18], co: [.2, .17, .14], ti: [.15, .13, .13], lamp: [1.85, 1.55, 1.05] } },
    piece: (n, s, r) => ['chairs', 'chairs', 'table', 'chairs', 'lectern'][(n + (s > 0 ? 2 : 0)) % 5],
    wall: (n, s, r) => ['screen', 'rugco', 'bunting', 'poster', 'rugco', 'bunting'][(n + (s > 0 ? 3 : 0)) % 6],
    over: n => n % 2 ? 'streamer' : 'banner',
    draw: { chairs: asChairs, table: asTable, lectern: asLectern, screen: asWall, bunting: asWall, poster: asWall, rugco: rugWall, banner: asOver, streamer: asOver },
    lights: (it, z, at) => { if (it.kind === 'screen' && z < 1.3) at(it.s * .9, z + .1, .58, .25, .3, .4); }
  };

  // -- Lights out: the same office in the dark. Screens left on, EXIT signs, emergency lamps, eyes --
  function loBay(g, gl, it, z) { apBay(g, gl, it, z, true); if (it.n % 3 === 0) { const x = PX(it.s * .64, z), y = YH(z, .05); rect(gl, x, y, .5, .5, '#e44a34'); } }
  function loWall(g, gl, it, z) {
    const s = it.s;
    if (it.kind === 'exit') {
      wallQ(g, '#1a1418', s, z - .004, .068, .79, .87);
      wallImg(gl, EXIT, s * .995, z, .06, .8, .86);
    } else if (it.kind === 'lamp') {
      // an emergency light: a box on the wall with two lamp heads, lit
      wallQ(g, '#c8c4bc', s, z, .05, .7, .75);
      const k = sc(z + .025);
      for (const dz of [.008, .034]) { const [x, y] = P(s * .985, z + dz, .755); rect(g, x - 2 * k, y - 2.5 * k, 4 * k, 3 * k, '#3a3a46'); rect(gl, x - 1.5 * k, y - 2 * k, 3 * k, 2 * k, '#fff09a'); }
      const [x, y] = P(s, z + .025, .715); rect(gl, x - .5, y, 1, 1, Math.floor(T * 2) % 2 ? '#3cba6a' : '#124a2c');
    } else if (it.kind === 'poster') wallImg(g, POSTER[it.n % 4], s, z, .07, .44, .66);
  }
  SECTIONS.dark = {
    name: 'Lights out', slot: .3, wslot: .55,
    blurb: 'The panels off and the dark real (the renderer\'s dark). What gives light: screens left on in the cubicles (each lights its corner, green), EXIT signs high on the walls (green), emergency lamps in pairs (a warm pool under each), a red standby light here and there, and eyes far down the hall. Only the nearest few emitters add a light, so it stays cheap.',
    view: { power: 0, house: 0, dark: true, rail: null },
    piece: (n, s, r) => (n % 6 === 3 + (s > 0 ? 1 : 0)) ? 'cabinet' : 'bay',
    wall: (n, s, r) => ['exit', 'rugframe', 'lamp', 'runner', 'poster', 'lamp'][(n + (s > 0 ? 3 : 0)) % 6],
    draw: { bay: loBay, cabinet: apCabinet, exit: loWall, lamp: loWall, poster: loWall, rugframe: rugWall, runner: rugWall },
    lights: (it, z, at) => {
      if (z > 1.25 || z < -.1) return;
      if (it.kind === 'bay' && it.r > .5) at(it.s * .9, z + .12, .36, .03, .2, .09);
      else if (it.kind === 'exit') at(it.s * .93, z + .03, .83, .05, .35, .12);
      else if (it.kind === 'lamp') at(it.s * .88, z + .025, .68, .9, .7, .35);
    }
  };

  // -- Copy room: machines, paper, shelves, a vending machine; dimmer, greener light; the Shredder at the end --
  function cpCopier(g, gl, it, z) {
    // a big office copier, its front to the aisle: paper drawers below, the body, a dark lid with the glass under it,
    // a control panel on top at the front, the sorter tray sticking out toward you with copies on it
    const s = it.s, z1 = z + .15, flash = (T * .7 + it.n * .37) % 1 < .12, near = z < 1.6;
    cub(g, s, .7, .97, z, z1, 0, .15, '#c8bfa8', '#aaa290', '#9a917c');                    // the drawer cabinet
    if (near) for (let i = 1; i < 3; i++) { wallQ(g, '#6a6252', s * .7, z + .008, z1 - z - .016, i * .05 - .004, i * .05); wallQ(g, '#3a3a46', s * .7, z + .06, .03, i * .05 + .025, i * .05 + .032); }
    cub(g, s, .72, .97, z + .005, z1 - .005, .15, .27, '#d8d0b8', '#c8bfa8', '#b8b09a');   // the body
    cub(g, s, .73, .96, z + .01, z1 - .01, .27, .285, '#4a4a58', '#3a3a46', '#5a5a66');   // the lid
    if (flash) { wallQ(gl, '#c8f4ff', s * .725, z + .015, z1 - z - .03, .262, .27); faceQ(gl, '#9cf0b4', s * .74, s * .95, z + .005, .262, .27); }
    // the control panel at the front, a little green screen and a light
    cub(g, s, .7, .76, z + .02, z + .11, .26, .275, '#3a3a46', '#2a2a34', '#4a4a58');
    wallQ(gl, '#3cba6a', s * .697, z + .03, .035, .262, .272);
    wallQ(gl, Math.floor(T * 2 + it.n) % 2 ? '#ffd44a' : '#6a3410', s * .697, z + .08, .01, .264, .27);
    // the sorter tray, out the near end, with copies on it
    cub(g, s, .78, .92, z - .04, z, .17, .18, '#fff6e2', '#e8e4d8', '#d8d4cc');
    if (near) for (let i = 0; i < 3; i++) faceQ(g, i % 2 ? '#e8e4d8' : '#fff6e2', s * .79, s * .91, z - .04 + i * .008, .18 + i * .006, .186 + i * .006);
    if (it.r > .7 && near) wallImg(g, OUT_ORDER, s * .695, z + .04, .06, .17, .24);
    else if (it.r < .25 && near) wallImg(g, NO_SIT, s * .695, z + .04, .07, .17, .245);
    // a sheet or two on the floor by it
    floorQ(g, '#f2eee2', s * .62, s * .67, z - .07, z - .045);
  }
  function cpReams(g, gl, it, z) {
    const s = it.s;
    cub(g, s, .7, .95, z, z + .14, 0, .02, '#a87a40', '#8a6030', '#7a5228');   // a pallet
    let h = .02;
    for (let i = 0; i < 4; i++) { const hh = .035; cub(g, s, .72, .93, z + .01, z + .13, h, h + hh, '#f2eee2', i % 2 ? '#c8d0dc' : '#e8e4d8', i % 2 ? '#b8c0cc' : '#d8d4cc'); faceQ(g, '#2a5aa0', s * .8, s * .84, z + .01, h + .01, h + .025); h += hh; }
    if (it.r > .5) { cub(g, s, .64, .7, z + .02, z + .06, 0, .05, '#2a5aa0', '#2a4a88', '#1e3a6c'); faceQ(g, '#fff6e2', s * .655, s * .685, z + .02, .02, .035); }
  }
  function cpShelf(g, gl, it, z) {
    // tall metal shelving on the wall: binders and reams; you see its aisle side
    const s = it.s, z1 = z + .22, u0 = .88;
    cub(g, s, u0, 1, z, z + .01, 0, .55, '#6a6e7a', '#5a5e6a', '#4a4e5a');
    for (let i = 0; i < 4; i++) {
      const h = .04 + i * .13;
      wallQ(g, '#6a6e7a', s * u0, z, .22, h, h + .01);
      if (z > 1.6) { wallQ(g, '#5a4a5a', s * (u0 - .005), z + .01, .2, h + .01, h + .1); continue; }
      for (let j = 0; j < 9; j++) {
        const zz = z + .012 + j * .023, tall = .08 + ((j * 3 + i + it.n) % 3) * .015, c = (j + i * 2 + it.n) % 5;
        if ((j + i) % 4 === 3) continue;
        wallQ(g, ['#2a5aa0', '#d63428', '#3a9a5a', '#e8e4d8', '#ffd44a'][c], s * (u0 - .005), zz, .018, h + .01, h + .01 + tall);
      }
    }
    cub(g, s, u0, 1, z1, z1 + .01, 0, .55, '#6a6e7a', '#5a5e6a', '#4a4e5a');
  }
  function cpVend(g, gl, it, z) {
    // a vending machine side-on to the hall, its lit front toward the aisle
    const s = it.s, z1 = z + .1;
    cub(g, s, .74, .98, z, z1, 0, .4, '#7a1c18', '#961e16', '#b8302a');
    wallQ(g, '#1a1418', s * .74, z + .01, .055, .14, .36);
    wallQ(gl, '#86d6f0', s * .735, z + .015, .045, .15, .35);
    for (let i = 0; i < 5; i++) wallQ(gl, ['#ffd44a', '#d63428', '#5ac08a'][(i + it.n) % 3], s * .73, z + .02, .035, .17 + i * .036, .18 + i * .036);
    wallQ(g, '#3a3a46', s * .74, z + .072, .015, .2, .3);
    wallQ(g, '#1a1418', s * .74, z + .015, .05, .03, .08);
    cpBins(g, gl, it, z + .13);
  }
  function cpBins(g, gl, it, z) {
    const s = it.s;
    for (let i = 0; i < 2; i++) { const zz = z + i * .05; cub(g, s, .78, .9, zz, zz + .04, 0, .1, '#1a2a50', i ? '#3a9a5a' : '#2a5aa0', i ? '#2a7a4a' : '#1e4a88'); faceQ(g, '#fff6e2', s * .81, s * .87, zz, .05, .07); }
  }
  function cpWall(g, gl, it, z) {
    const s = it.s;
    if (it.kind === 'notice') {
      wallQ(g, '#1a1418', s, z, .12, .4, .62); wallQ(g, '#a0703a', s, z + .006, .108, .41, .61);
      for (let i = 0; i < 4; i++) wallQ(g, i % 3 ? '#fff6e2' : '#ffd44a', s, z + .015 + i * .025, .018, .45 + (i % 2) * .06, .52 + (i % 2) * .06);
    } else if (it.kind === 'csign') wallImg(g, COPY_SIGN, s, z, .1, .62, .68);
    else if (it.kind === 'clock') { const x = PX(s, z), y = YH(z, .66), rr = Math.max(1, Math.round(5 * sc(z))); A.disc(g, x, y, rr + 1, '#1a1418'); A.disc(g, x, y, rr, '#fff6e2'); A.line(g, x, y, x, y - rr * .7, '#1a1418'); }
  }
  SECTIONS.copy = {
    name: 'Copy room', slot: .34, wslot: .6,
    blurb: 'Copiers along the walls (beige, lid up, green panel screens and a scan light that sweeps now and then, glow plus a moving light), paper reams on pallets, recycling bins, tall shelving with binders, a vending machine side-on with its front glowing and lighting the floor. Notice boards and COPY ROOM signs; paper on the floor. Dimmer, greener light and beige walls, the house lights down as in the game. The Shredder waits at the end (the game draws it; not mocked here).',
    view: { power: .7, house: 0, rail: '#b8a878', look: { lo: [.13, .12, .09], hi: [.2, .19, .15], co: [.16, .15, .12], ce: [.22, .22, .2], ti: [.13, .14, .12], sh: .3, lamp: [1.5, 1.6, 1.3] } },
    piece: (n, s, r) => ['copier', 'reams', 'shelf', 'copier', 'vend', 'shelf', 'bins'][(n * 2 + (s > 0 ? 3 : 0)) % 7],
    wall: (n, s, r) => ['notice', 'oldrug', 'csign', 'clock', 'oldrug', 'notice'][(n + (s > 0 ? 3 : 0)) % 6],
    draw: { copier: cpCopier, reams: cpReams, shelf: cpShelf, vend: cpVend, bins: cpBins, notice: cpWall, csign: cpWall, clock: cpWall, oldrug: rugWall },
    lights: (it, z, at) => {
      if (z > 1.2 || z < -.1) return;
      if (it.kind === 'vend') at(it.s * .6, z + .05, .25, .25, .4, .5);
      else if (it.kind === 'copier' && (T * .7 + it.n * .37) % 1 < .12) at(it.s * .75, z + .08, .3, .3, .5, .4);
    }
  };
  // ---------- what's in the hall ----------
  // Slot sizes are shared by every section, so a slot's section can be decided once (by floor13.js) and kept.
  const SLOT = { piece: .32, wall: .45, over: .9 };
  const SALT = { piece: 11, wall: 23, over: 37 };
  // The pieces from depth d0 to d1: [{ layer, n, s, w, kind, r }], given each slot's section (secAt(layer, n, w)) and
  // whether a spot is taken (taken(layer, s, w)).
  function items(d0, d1, secAt, taken) {
    const out = [];
    for (const layer of ['piece', 'wall', 'over']) {
      const slot = SLOT[layer];
      for (let n = Math.floor(d0 / slot); n * slot < d1; n++) {
        if (n < 0) continue;
        for (const s of layer === 'over' ? [0] : [-1, 1]) {
          const w = n * slot + (layer === 'piece' ? 0 : s > 0 ? slot * .5 : 0);
          if (w < d0 || w > d1) continue;
          const S = SECTIONS[secAt(layer, n, w)], fn = S && S[layer];
          if (!fn) continue;
          const id = n + 1000, r = hash(id * 2 + (s > 0 ? 1 : 0), SALT[layer]), kind = fn(id, s, r);
          if (!kind || !S.draw[kind] || (layer !== 'over' && taken(layer, s, w))) continue;
          out.push({ layer, n: id, s, w, r, kind, sec: S });
        }
      }
    }
    return out;
  }
  // One piece at depth z, into the lit layer g and the glow layer gl.
  function draw(it, z, g, gl) { it.sec.draw[it.kind](g, gl, it, z); }
  // The light a piece gives off: at(u, z, h, r, g, b).
  function lights(it, z, at) { if (it.sec.lights) it.sec.lights(it, z, at); }
  // The section's view settings for the renderer (look, and the rail colour).
  const view = key => (SECTIONS[key] || SECTIONS.ap).view;
  return { items, draw, lights, view, time: t => { T = t; }, SECTIONS };
};
