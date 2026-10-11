// Unruggabull II's lit renderer: the corridor drawn by working out what each pixel sees and how it's lit, then a 64-colour
// palette with dithering. Classic script (UnrugRender); not loaded by the game yet.
//
// The camera never moves, so what each pixel's ray hits, and what the polished floor and glass reflect there, are worked
// out once, when a renderer is made at a given size. A frame then only scrolls the textures, moves the lights, lights
// each surface (once per 2x2 block of the same surface), adds the reflections, the light hanging under the ceiling
// panels and the dust, draws lit sprites, and finishes with bloom, tone, vignette, dither and the palette.
//
// World units are bull heights: he is 1 tall. The camera sits at (0, E, 0) looking down +z; x is across the hall,
// y up. Hall surfaces scroll: a point at camera depth z is at z + scroll down the hall.
var UnrugRender = (function () {
  'use strict';
  // the hall, the doorway at its far end, the copy room behind it and the Shredder in there
  const E = 2.4, C = 3.6, HW = 2.6, Z1 = 12, DW = 1.1, DH = 2.0;
  const RW = 3, RC = 2.9, RZ = 17;
  const SB = [-1.45, 0, 14, 1.45, 2.45, 15.8];

  // ---------- palette: 64 colours through a 32-level cube; a 4x4 Bayer dither ----------
  const PAL = ['08070c', '110f18', '1a1824', '24222f', '2f2d3b', '3b3a48', '4b4a58', '5e5e6c', '76788a', '9496a8', 'b4b6c4', 'd2d4dc', 'ecedf0', 'ffffff', '1c1614', '2c2420', '3e332c', '54463c', '6e5e50', '8c7a68', 'b0a088', 'd8c8a8', 'f4e6c4', 'fff6e0', '3a2014', '5a3420', '7a4a2a', '9e6638', '1e080c', '340e12', '521418', '761c1e', '9c2622', 'c43428', 'e44a34', 'ff6e4a', '5c1430', '9a2050', 'e03a78', 'ff8ab4', '6a3410', '9a5214', 'c87818', 'e8a028', 'f8cc50', 'fff09a', '0a2418', '124a2c', '1f7a44', '3cba6a', '9cf0b4', '0a1a2c', '10304e', '1a5076', '2a7aa6', '46aad4', '86d6f0', 'c8f4ff', '1e1430', '2e2048', '44305e', '5e4478', '000000', '0c1020']
    .map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4), 16)]);
  const PAL32 = new Uint32Array(PAL.length);
  PAL.forEach((p, i) => { PAL32[i] = (255 << 24) | (p[2] << 16) | (p[1] << 8) | p[0]; });   // little-endian RGBA
  const LUT = new Uint8Array(32768);
  for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
    const R = r * 8.2, G = g * 8.2, B = b * 8.2; let best = 0, bd = 1e9;
    for (let i = 0; i < PAL.length; i++) { const p = PAL[i], dr = p[0] - R, dg = p[1] - G, db = p[2] - B, d = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (d < bd) { bd = d; best = i; } }
    LUT[(r << 10) | (g << 5) | b] = best;
  }
  const BAY = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - .47) * .032));
  // tone: light in, 0..31 out, through a table
  const TONE = new Float32Array(1025);
  for (let i = 0; i <= 1024; i++) TONE[i] = Math.pow(1 - Math.exp(-i / 256 * 1.6), .8) * 31;
  // with the dither folded in: TD[d * 1025 + i] is the 0..31 level for light i / 256 at Bayer cell d
  const TD = new Uint8Array(16 * 1025);
  for (let d = 0; d < 16; d++) for (let i = 0; i <= 1024; i++) { const v = TONE[i] + BAY[d] * 31; TD[d * 1025 + i] = v < 0 ? 0 : v > 31 ? 31 : (v + .5) | 0; }

  // ---------- small helpers ----------
  const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  // value noise, baked into a 256x256 tile once
  const NT = new Float32Array(65536);
  {
    const sm = v => v * v * (3 - 2 * v);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const fx = sm((x % 16) / 16), fy = sm((y % 16) / 16), xi = x >> 4, yi = y >> 4;
      const a = hash(xi, yi), b = hash((xi + 1) & 15, yi), c = hash(xi, (yi + 1) & 15), d = hash((xi + 1) & 15, (yi + 1) & 15);
      NT[(y << 8) | x] = a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
  }
  const noise = (x, y) => NT[((Math.floor(y * 16) & 255) << 8) | (Math.floor(x * 16) & 255)];
  const fr = v => v - Math.floor(v);
  const mod = (v, m) => v - m * Math.floor(v / m);

  // a 5x7 font for the signs
  const GLYPH = {
    R: '11110100011000111110101001001010001', U: '10001100011000110001100011000101110', G: '01110100011000010111100011000101111',
    C: '01110100011000010000100001000101110', O: '01110100011000110001100011000101110', E: '11111100001000011110100001000011111',
    X: '10001100010101000100010101000110001', I: '01110001000010000100001000010001110', T: '11111001000010000100001000010000100',
    S: '01111100001000001110000010000111110', H: '10001100011000111111100011000110001', D: '11110100011000110001100011000111110',
    '-': '00000000000000011111000000000000000', P: '11110100011000111110100001000010000', Y: '10001100010101000100001000010000100',
    M: '10001110111010110101100011000110001', A: '01110100011000111111100011000110001', N: '10001110011010110011100011000110001',
    L: '10000100001000010000100001000011111', K: '10001100101010011000101001001010001', W: '10001100011000110101101011010101010', Q: '01110100011000110001101011001001101',
    ' ': '00000000000000000000000000000000000'
  };
  function textTex(s) {
    const w = s.length * 6 + 1, h = 9, d = new Uint8Array(w * h);
    [...s].forEach((ch, i) => { const g = GLYPH[ch] || GLYPH[' ']; for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y * 5 + x] === '1') d[(y + 1) * w + 1 + i * 6 + x] = 1; });
    return { at(u, v) { const x = Math.floor(u * w), y = Math.floor(v * h); return x >= 0 && y >= 0 && x < w && y < h ? d[y * w + x] : 0; } };
  }
  const NEON = textTex('RUGCO'), EXIT = textTex('EXIT'), SHRED = textTex('SHRED-O'), COPY = textTex('COPY ROOM');
  // posters, painted into tiny canvases once
  function canvasTex(w, h, paint) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); paint(g, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    return { at(u, v, out) { const x = Math.min(w - 1, Math.max(0, Math.floor(u * w))), y = Math.min(h - 1, Math.max(0, Math.floor(v * h))), i = (y * w + x) * 4; out[0] = d[i] / 255; out[1] = d[i + 1] / 255; out[2] = d[i + 2] / 255; } };
  }
  const POSTERS = [
    canvasTex(30, 24, (g, w) => {   // SYNERGY: a sunset over mountains
      const gr = g.createLinearGradient(0, 0, 0, 17); gr.addColorStop(0, '#2a1850'); gr.addColorStop(.6, '#c4352e'); gr.addColorStop(1, '#f2c858');
      g.fillStyle = gr; g.fillRect(0, 0, w, 17); g.fillStyle = '#fff0a8'; g.beginPath(); g.arc(15, 13, 5, 0, 7); g.fill();
      g.fillStyle = '#1f1d33'; g.beginPath(); g.moveTo(0, 17); g.lineTo(7, 9); g.lineTo(12, 14); g.lineTo(19, 7); g.lineTo(30, 17); g.fill();
      g.fillStyle = '#07060b'; g.fillRect(0, 17, w, 7); g.fillStyle = '#e4e8f0'; g.fillRect(6, 19, 18, 1); g.fillRect(9, 21, 12, 1);
    }),
    canvasTex(24, 30, (g, w, h) => {   // a RugCo quota chart
      g.fillStyle = '#962424'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff0a8'; g.fillRect(3, 3, 18, 2);
      g.fillStyle = '#2a0c10'; g.fillRect(3, 8, 18, 16); g.fillStyle = '#f2c858';
      [4, 7, 6, 10, 13].forEach((v, i) => g.fillRect(5 + i * 3, 22 - v, 2, v));
      g.fillStyle = '#e8553a'; g.fillRect(3, 26, 18, 1);
    })
  ];

  // ---------- tracing: what a ray from (ox,oy,oz) along (dx,dy,dz) hits ----------
  // Surfaces: 1 floor, 2 ceiling, 3 left wall, 4 right wall, 5 far wall; 6-9 the copy room's floor, ceiling, walls and
  // back; 10-12 the Shredder's side, top and front. 0 is nothing.
  const HIT = { s: 0, t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0 };
  function trace(ox, oy, oz, dx, dy, dz) {
    let t = 1e9, s = 0;
    if (oz < Z1) {
      if (dy < 0) { const tt = -oy / dy; if (tt > 1e-4 && tt < t) { t = tt; s = 1; } }
      if (dy > 0) { const tt = (C - oy) / dy; if (tt > 1e-4 && tt < t) { t = tt; s = 2; } }
      if (dx < 0) { const tt = (-HW - ox) / dx; if (tt > 1e-4 && tt < t) { t = tt; s = 3; } }
      if (dx > 0) { const tt = (HW - ox) / dx; if (tt > 1e-4 && tt < t) { t = tt; s = 4; } }
      const tz = (Z1 - oz) / dz;
      if (tz >= t) return set(s, t, ox, oy, oz, dx, dy, dz);
      const x = ox + dx * tz, y = oy + dy * tz;
      if (!(Math.abs(x) < DW && y < DH)) return set(5, tz, ox, oy, oz, dx, dy, dz);
    }
    t = 1e9; s = 0;
    if (dy < 0) { const tt = -oy / dy; if (tt < t) { t = tt; s = 6; } }
    if (dy > 0) { const tt = (RC - oy) / dy; if (tt < t) { t = tt; s = 7; } }
    if (dx < 0) { const tt = (-RW - ox) / dx; if (tt < t) { t = tt; s = 8; } }
    if (dx > 0) { const tt = (RW - ox) / dx; if (tt < t) { t = tt; s = 8; } }
    { const tt = (RZ - oz) / dz; if (tt < t) { t = tt; s = 9; } }
    let t0 = -1e9, t1 = 1e9, ax = 0;
    for (let a = 0; a < 3; a++) {
      const o = a === 0 ? ox : a === 1 ? oy : oz, d = a === 0 ? dx : a === 1 ? dy : dz;
      if (Math.abs(d) < 1e-9) { if (o < SB[a] || o > SB[a + 3]) { t0 = 1e9; break; } continue; }
      let ta = (SB[a] - o) / d, tb = (SB[a + 3] - o) / d; if (ta > tb) { const q = ta; ta = tb; tb = q; }
      if (ta > t0) { t0 = ta; ax = a; } if (tb < t1) t1 = tb;
    }
    if (t0 < t1 && t0 > 0 && t0 < t) { t = t0; s = 10 + ax; }
    return set(s, t, ox, oy, oz, dx, dy, dz);
  }
  function set(s, t, ox, oy, oz, dx, dy, dz) {
    const h = HIT;
    h.s = s; h.t = t; h.x = ox + dx * t; h.y = oy + dy * t; h.z = oz + dz * t; h.nx = 0; h.ny = 0; h.nz = 0;
    if (s === 1 || s === 6) h.ny = 1; else if (s === 2 || s === 7) h.ny = -1; else if (s === 3) h.nx = 1; else if (s === 4) h.nx = -1;
    else if (s === 5 || s === 9 || s === 12) h.nz = -1; else if (s === 8 || s === 10) h.nx = h.x > 0 ? (s === 8 ? -1 : 1) : (s === 8 ? 1 : -1); else if (s === 11) h.ny = 1;
    return h;
  }

  // ---------- one renderer at one size ----------
  // opt.sceneScale: work the scene out at this fraction of the size (sprites and the finish stay at full size)
  function create(canvas, OW, OH, opt) {
    opt = opt || {};
    const sc = opt.sceneScale || 1;
    // the scene's size, and the picture's (O for output)
    const W = Math.round(OW * sc), H = Math.round(OH * sc), N = W * H, F = W * .6, CX = W / 2, CY = H * .38;
    const ON = OW * OH, OF = OW * .6, OCX = OW / 2, OCY = OH * .38;
    canvas.width = OW; canvas.height = OH;
    const ctx = canvas.getContext('2d'), img = ctx.createImageData(OW, OH), out32 = new Uint32Array(img.data.buffer);

    // what each pixel sees, worked out once
    const S = new Uint8Array(N), HX = new Float32Array(N), HY = new Float32Array(N), HZ = new Float32Array(N), HT = new Float32Array(N);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const q = py * W + px, h = trace(0, E, 0, (px + .5 - CX) / F, (CY - py - .5) / F, 1);
      S[q] = h.s; HX[q] = h.x; HY[q] = h.y; HZ[q] = h.z; HT[q] = h.t;
    }
    const NXa = s => s === 3 ? 1 : s === 4 ? -1 : 0;
    // 2x2 blocks: one light (and one reflection) per block when all four pixels are the same surface
    const BW = W >> 1, BH = H >> 1, NB = BW * BH;
    const BU = new Uint8Array(NB), BX = new Float32Array(NB), BY = new Float32Array(NB), BZ = new Float32Array(NB);
    for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
      const b = by * BW + bx, q = by * 2 * W + bx * 2, q4 = q + W + 1;
      if (S[q] && S[q] === S[q + 1] && S[q] === S[q + W] && S[q] === S[q4]) { BU[b] = 1; BX[b] = (HX[q] + HX[q4]) / 2; BY[b] = (HY[q] + HY[q4]) / 2; BZ[b] = (HZ[q] + HZ[q4]) / 2; }
    }
    // what shiny surfaces reflect: per uniform block (from its middle), or per pixel on edges
    const RS = new Uint8Array(N), RX = new Float32Array(N), RY = new Float32Array(N), RZ_ = new Float32Array(N), RFD = new Float32Array(N);
    const reflectFrom = (q, x, y, z, s, dx, dy, j) => {
      let h = null;
      if (s === 1 || s === 6 || s === 11) h = trace(x, 0, z, dx + j, -dy, 1);
      else if (s === 3 || s === 4 || s === 10) h = trace(x, y, z, -dx, dy + j, 1);
      if (h && h.s) { RS[q] = h.s; RX[q] = h.x; RY[q] = h.y; RZ_[q] = h.z; }
    };
    for (let q = 0; q < N; q++) RFD[q] = .45 + .55 * Math.min(1, HT[q] / 14);
    for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
      const b = by * BW + bx, px = bx * 2, py = by * 2, q = py * W + px;
      if (BU[b]) reflectFrom(q, BX[b], BY[b], BZ[b], S[q], (px + 1 - CX) / F, (CY - py - 1) / F, (hash(px, py) - .5) * .03);
      else for (let k = 0; k < 4; k++) {
        const xx = px + (k & 1), yy = py + (k >> 1), qq = yy * W + xx;
        reflectFrom(qq, HX[qq], HY[qq], HZ[qq], S[qq], (xx + .5 - CX) / F, (CY - yy - .5) / F, (hash(xx, yy) - .5) * .03);
      }
    }

    // light is worked out on a grid every G pixels and blended between grid points on the same surface; a pixel with
    // no grid point of its own surface around it is lit on its own
    const G = W >= 400 ? 4 : 2, GWn = Math.ceil((W - 1) / G) + 1, GHn = Math.ceil((H - 1) / G) + 1, GN = GWn * GHn;
    const gPix = (g) => { const gy = (g / GWn) | 0, gx = g - gy * GWn; return Math.min(gy * G, H - 1) * W + Math.min(gx * G, W - 1); };
    const GQ = new Int32Array(GN), GSf = new Uint8Array(GN);
    for (let g = 0; g < GN; g++) { GQ[g] = gPix(g); GSf[g] = S[GQ[g]]; }
    const LGr = new Float32Array(GN), LGg = new Float32Array(GN), LGb = new Float32Array(GN);
    const PC = new Int32Array(N), PW = new Float32Array(N * 4), PSELF = new Uint8Array(N);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const q = py * W + px, s = S[q]; if (!s) continue;
      const gx = Math.min(GWn - 2, (px / G) | 0), gy = Math.min(GHn - 2, (py / G) | 0);
      const x0 = gx * G, x1 = Math.min((gx + 1) * G, W - 1), y0 = gy * G, y1 = Math.min((gy + 1) * G, H - 1);
      const fx = x1 > x0 ? (px - x0) / (x1 - x0) : 0, fy = y1 > y0 ? (py - y0) / (y1 - y0) : 0, c = gy * GWn + gx;
      const w = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy], cs = [c, c + 1, c + GWn, c + GWn + 1];
      let sum = 0; for (let k = 0; k < 4; k++) { if (GSf[cs[k]] !== s) w[k] = 0; sum += w[k]; }
      PC[q] = c;
      if (sum < 1e-4) { PSELF[q] = 1; continue; }
      for (let k = 0; k < 4; k++) PW[q * 4 + k] = w[k] / sum;
    }
    // the vignette, once
    const VIG = new Float32Array(ON);
    for (let py = 0; py < OH; py++) for (let px = 0; px < OW; px++) { const vx = (px - OCX) / OW, vy = (py - OH * .5) / OH; VIG[py * OW + px] = 1 - .55 * (vx * vx + vy * vy); }

    // the picture in light (full size); the scene's own buffer when it's worked out smaller
    const buf = new Float32Array(ON * 3), sbuf = sc === 1 ? buf : new Float32Array(N * 3), alb = new Float32Array(N * 3), shine = new Float32Array(N);
    const QW = OW >> 2, QH = OH >> 2, bloomA = new Float32Array(QW * QH * 3), bloomB = new Float32Array(QW * QH * 3), BNZ = new Uint8Array(QW * QH);
    const BX0 = new Int32Array(OW), BAX = new Float32Array(OW);
    for (let px = 0; px < OW; px++) { const fx = Math.min(QW - 1.001, Math.max(0, px / 4 - .5)); BX0[px] = fx | 0; BAX[px] = fx - (fx | 0); }
    const BAYI = new Int32Array(16); for (let d = 0; d < 16; d++) BAYI[d] = d * 1025;

    // ---------- lights ----------
    const MAXL = 48;
    let LN = 0; const LX = new Float32Array(MAXL), LY = new Float32Array(MAXL), LZ = new Float32Array(MAXL), LR = new Float32Array(MAXL), LG = new Float32Array(MAXL), LB = new Float32Array(MAXL), LD = new Uint8Array(MAXL);
    const addLight = (x, y, z, r, g, b, down) => { if (LN >= MAXL) return; LX[LN] = x; LY[LN] = y; LZ[LN] = z; LR[LN] = r; LG[LN] = g; LB[LN] = b; LD[LN] = down ? 1 : 0; LN++; };
    let extra = [];   // lights added for this frame only: shots, muzzle flashes, glowing things
    let lightsOut = false, scroll = 0, T = 0;
    const panel = (k, t) => { if (mod(k, 11) === 5) return 0; if (mod(k, 7) === 3) { const f = Math.sin(t * 31) * Math.sin(t * 7.7 + k); return f > .55 || (t % 3.1 < .12) ? .1 : 1; } return 1; };
    const eyesOpen = t => (t % 5.3) < 5.12;
    const neonFlick = t => (t % 4.7 > 4.25 && Math.sin(t * 60) > 0) ? .15 : 1;
    function buildLights(t) {
      LN = 0;
      if (!lightsOut) for (let k = Math.floor((-5 + scroll) / 3); k <= Math.floor((Z1 + scroll) / 3); k++) {
        const z = k * 3 + 1.05 - scroll; if (z < -5 || z > Z1 - .2) continue;
        const p = panel(k, t); if (p > 0) addLight(0, C - .08, z, 1.75 * p, 1.55 * p, 1.2 * p, true);
      }
      const n = neonFlick(t) * .7; addLight(0, 2.5, Z1 - .9, 1.0 * n, .14 * n, .3 * n, false);
      if (eyesOpen(t)) addLight(0, 1.3, SB[2] - .5, 2.4, .26, .14, false);
      addLight(0, .5, SB[2] - .3, .55, .1, .04, false);
      addLight(0, RC - .1, SB[2] - .6, .22, .26, .45, true);
      for (const sx of [-1.95, 1.95]) addLight(sx, 1.95, Z1 - .7, .26, .16, .07, false);
      for (let k = Math.floor(scroll / 8) - 1; k <= Math.floor((Z1 + scroll) / 8) + 1; k++) {
        const zd = k * 8 + 2.1 - scroll; if (zd > 2 && zd < Z1) addLight(HW - .1, 1.78, zd, .015, .1, .04, false);
      }
      for (const l of extra) addLight(l[0], l[1], l[2], l[3], l[4], l[5], false);
    }
    function lightAt(x, y, z, nx, ny, nz, out) {
      let r = .03, g = .03, b = .06;
      if (lightsOut) { r = .012; g = .012; b = .03; }
      const hall = z < Z1 + .001;
      for (let i = 0; i < LN; i++) {
        const vx = LX[i] - x, vy = LY[i] - y, vz = LZ[i] - z, d2 = vx * vx + vy * vy + vz * vz;
        if (d2 > 90) continue;
        const dot = nx * vx + ny * vy + nz * vz;
        if (dot <= 0) continue;
        if (hall !== (LZ[i] < Z1)) { const k = (Z1 - z) / vz, cx = x + vx * k, cy = y + vy * k; if (!(Math.abs(cx) < DW && cy < DH && cy > 0)) continue; }
        const d = Math.sqrt(d2);
        let em = 1;
        if (LD[i]) { const cd = -vy / d; if (cd > 0) { const c2 = cd * cd, c4 = c2 * c2; em = c4 * c4 * 3.2 + .16; } else em = .16; }
        const a = (dot / d) * em / (1 + .1 * d2);
        r += LR[i] * a; g += LG[i] * a; b += LB[i] * a;
      }
      out[0] = r; out[1] = g; out[2] = b;
    }

    // ---------- materials ----------
    // Writes albedo into aR/aG/aB, glow into eR/eG/eB and how shiny it is into rf, for surface s at (x, y, z).
    let aR = 0, aG = 0, aB = 0, eR = 0, eG = 0, eB = 0, rf = 0;
    const tmp = [0, 0, 0];
    function wallBase(y, zw) {
      const n = noise(zw * 3, y * 3) * .04 - .02;
      if (y < .12) { aR = .07; aG = .065; aB = .085; }
      else if (y < .72) { const m = fr(zw / 1.2), edge = m < .04 || m > .96 || y < .17 || y > .67, v = edge ? 0 : .05; aR = .14 + n + v; aG = .12 + n + v; aB = .17 + n + v * 1.2; }
      else if (y < .8) { aR = .36; aG = .2; aB = .11; }
      else if (y > C - .16) { aR = .24; aG = .23; aB = .28; }
      else { const st = fr(zw * 2.2) < .5 ? .012 : 0, g = y < 1.2 ? (1.2 - y) * .05 : 0; aR = .26 + n + st - g; aG = .25 + n + st - g; aB = .31 + n + st - g; }
    }
    function material(s, x, y, z, t) {
      eR = eG = eB = 0; rf = 0;
      const zw = z + scroll;
      if (s === 1 || s === 6) {
        const ax = Math.abs(x);
        if (ax < .62 && z < SB[2]) {
          const n = noise(x * 18, zw * 18) * .05;
          if (ax > .53) { const o = ax > .585 || ax < .545; aR = o ? .5 : .78; aG = o ? .3 : .52; aB = .1; }
          else {
            const u = ax / .53, v = fr(zw * .9), dm = Math.abs(u - Math.abs(v - .5) * 2), ln = dm < .07, dot = Math.abs(u - .5) < .08 && Math.abs(v - .5) < .05;
            aR = dot ? .7 : ln ? .26 : .44 + n; aG = dot ? .5 : ln ? .04 : .07 + n * .5; aB = dot ? .15 : ln ? .05 : .07;
          }
          rf = .04;
        } else {
          const tx = x / .8, tz = zw / .8, gx = fr(tx), gz = fr(tz);
          if (gx < .04 || gz < .04) { aR = .05; aG = .05; aB = .07; rf = .1; }
          else { const ck = ((Math.floor(tx) + Math.floor(tz)) & 1) * .03, v = hash(Math.floor(tx), Math.floor(tz)) * .03 + noise(x * 4, zw * 4) * .03; aR = .13 + ck + v; aG = .14 + ck + v; aB = .19 + ck + v; rf = s === 6 ? .25 : .5; }
          const gm = 1 - Math.max(0, 1 - (HW - ax) * 1.6) * .5; aR *= gm; aG *= gm; aB *= gm;
        }
      } else if (s === 2) {
        const m = mod(zw, 3), ax = Math.abs(x);
        if (m > .6 && m < 1.5 && ax < .45) {
          const p = lightsOut ? 0 : panel(Math.floor(zw / 3), t), rim = m < .65 || m > 1.45 || ax > .41;
          if (rim) { aR = .4; aG = .4; aB = .44; } else { aR = aG = aB = .3; const tube = .7 + .3 * Math.cos((x / .45) * Math.PI * 3); eR = 1.5 * p * tube; eG = 1.38 * p * tube; eB = 1.12 * p * tube; }
        } else {
          const gx = fr(x / .8 + .5), gz = fr(zw / .8);
          if (gx < .05 || gz < .05) { aR = .14; aG = .14; aB = .16; }
          else { const vent = hash(Math.floor(x / .8 + .5), Math.floor(zw / .8)) < .06 && fr(zw / .8 * 6) < .5, n = noise(x * 6, zw * 6) * .03; if (vent) { aR = aG = .12; aB = .14; } else { aR = .3 + n; aG = .3 + n; aB = .33 + n; } }
        }
      } else if (s === 4) {   // right wall: doors, EXIT, posters, an extinguisher, columns
        const m = mod(zw, 8); wallBase(y, zw);
        if (m > 1.5 && m < 2.7 && y < 1.58) {
          if (m < 1.56 || m > 2.64 || y > 1.52) { aR = .1; aG = .09; aB = .1; }
          else {
            const pm = fr((m - 1.56) / 1.08 * 2), pv = y / 1.52, ln = pm < .06 || pm > .94 || (pv > .45 && pv < .48);
            aR = ln ? .22 : .32; aG = ln ? .12 : .18; aB = ln ? .07 : .1;
            if (pv > .62 && pv < .86 && m > 1.8 && m < 2.4) { aR = .04; aG = .05; aB = .08; eR = .02; eG = .05; eB = .08; }
            if (Math.abs(m - 2.54) < .04 && Math.abs(y - .74) < .04) { aR = .9; aG = .7; aB = .25; }
          }
        } else if (m > 1.82 && m < 2.38 && y > 1.66 && y < 1.9) {
          aR = .06; aG = .08; aB = .07;
          if (EXIT.at((2.38 - m) / .56, (1.9 - y) / .24)) { eR = .3; eG = 2.2; eB = .7; } else { eR = .01; eG = .07; eB = .03; }
        } else if (m > 4.3 && m < 5.7 && y > 1.0 && y < 2.15) {
          if (m < 4.36 || m > 5.64 || y < 1.06 || y > 2.09) { aR = .05; aG = .05; aB = .06; }
          else { POSTERS[mod(Math.floor(zw / 8), 2)].at((5.64 - m) / 1.28, (2.09 - y) / 1.03, tmp); aR = tmp[0] * .9; aG = tmp[1] * .9; aB = tmp[2] * .9; rf = .08; }
        } else if (m > 6.5 && m < 6.98 && y > .55 && y < 1.28) {
          const inner = m > 6.55 && m < 6.93 && y > .6 && y < 1.23; aR = inner ? .55 : .5; aG = inner ? .08 : .06; aB = inner ? .06 : .05;
          if (inner && Math.abs(m - 6.74) < .09 && y < 1.15) { aR = .75; aG = .1; aB = .08; }
        } else if (m > 7.55) { const e = m < 7.6 || m > 7.95; aR = e ? .14 : .3; aG = e ? .13 : .29; aB = e ? .17 : .35; }
      } else if (s === 3) {   // left wall: glass offices
        const m = mod(zw + 3, 8); wallBase(y, zw + 3);
        if (y > .85 && y < 2.5 && m > .2 && m < 7.6) {
          const pf = (m - .2) / 1.85, pi = Math.floor(pf) + Math.floor((zw + 3) / 8) * 4, pu = fr(pf);
          if (pu < .035 || pu > .965 || y < .9 || y > 2.45) { aR = .12; aG = .12; aB = .15; }
          else {
            aR = .02; aG = .025; aB = .04; rf = .3;
            const desk = y < 1.05 && y > .98; if (desk) { aR = .06; aG = .05; aB = .06; }
            if (!desk && hash(pi, 3) < .6 && pu > .28 && pu < .62 && y > 1.07 && y < 1.4) {
              const sc = fr(y * 40) < .5 ? .8 : 1, fl = .85 + .15 * Math.sin(t * 9 + pi), blue = hash(pi, 9) < .5;
              eR = (blue ? .3 : .6) * sc * fl; eG = (blue ? 1.3 : .9) * sc * fl; eB = 1.9 * sc * fl;
            }
            const yb = 2.45 - hash(pi, 7) * 1.25;
            if (y > yb && fr(y / .07) < .62) { aR = .3; aG = .31; aB = .36; eR *= .2; eG *= .2; eB *= .2; rf = 0; }
            if (fr((m + y * .7) * .45) < .08) { aR += .05; aG += .05; aB += .07; }
          }
        }
      } else if (s === 5) {   // the far wall: neon over the copy room's door
        const ax = Math.abs(x); wallBase(y, x + 40);
        if (ax < DW + .15 && y < DH + .15) { aR = .13; aG = .13; aB = .16; }
        if (ax < 1.4 && y > 2.32 && y < 3.0) {
          const u = (x + 1.3) / 2.6;
          if (u > 0 && u < 1 && NEON.at(u, (2.95 - y) / .58)) { const f = Math.floor(u * 5) === 3 ? neonFlick(t) : 1; eR = 1.7 * f; eG = .2 * f; eB = .55 * f; }
        }
        if (Math.abs(Math.abs(x) - 1.95) < .13 && y > 1.62 && y < 1.9) { const top = y > 1.84; aR = .5; aG = .38; aB = .2; eR = top ? .4 : 2.2; eG = top ? .25 : 1.5; eB = top ? .1 : .7; }
        if (x > -2.05 && x < -1.4 && y > 1.2 && y < 1.42) { aR = .55; aG = .5; aB = .36; if (COPY.at((x + 2.05) / .65, (1.42 - y) / .22)) { aR = .08; aG = .06; aB = .05; } }
      } else if (s === 7) { aR = .08; aG = .08; aB = .1; }
      else if (s === 8 || s === 9) {
        const sh = fr(y / .45) < .08; aR = sh ? .05 : .1; aG = sh ? .05 : .09; aB = sh ? .06 : .12;
        if (!sh && fr(x * 3 + z * 3) < .55 && y < 2.2) { const h = hash(Math.floor(x * 3 + z * 3), Math.floor(y / .45)); aR = .2 + h * .2; aG = .17 + h * .15; aB = .12 + h * .08; }
      } else if (s >= 10) {   // the Shredder
        const seam = s === 12 && (fr((x + 1.45) / .58) < .025 || Math.abs(y - .95) < .015 || Math.abs(y - 1.95) < .015);
        aR = seam ? .1 : .23; aG = seam ? .1 : .24; aB = seam ? .12 : .28; rf = .12;
        if (s === 11) { aR = .3; aG = .3; aB = .34; }
        if (s === 12) {
          if (Math.abs(x) < 1.05 && y > .2 && y < .76) {
            const tooth = (y > .66 && Math.abs(fr(x * 6) - .5) < (.78 - y) / .12 * .5) || (y < .34 && Math.abs(fr(x * 6 + .5) - .5) < (y - .22) / .12 * .5);
            if (tooth) { aR = .78; aG = .78; aB = .8; } else { aR = .02; aG = .01; aB = .01; const k = 1 - Math.abs(y - .5) / .28, k2 = k * k; eR = .9 * k2; eG = .1 * k2; eB = .03 * k2; }
          }
          const eo = eyesOpen(t);
          for (let i = 0; i < 2; i++) {
            const ex = i ? .52 : -.52;
            if (Math.abs(x - ex) < .24 && Math.abs(y - 1.3) < (eo ? .1 : .02)) { aR = .3; aG = .02; aB = .02; eR = 3.2; eG = .4; eB = .2; }
            if (Math.abs(x - ex) < .3 && Math.abs(y - (1.47 + (x - ex) * (ex < 0 ? -.35 : .35))) < .045) { aR = .04; aG = .04; aB = .05; eR = eG = eB = 0; }
          }
          if (Math.abs(x) < .62 && y > 1.6 && y < 1.86) { aR = .05; aG = .04; aB = .03; if (SHRED.at((x + .62) / 1.24, (1.86 - y) / .26)) { eR = 2.0; eG = 1.2; eB = .25; } }
        }
      } else { aR = aG = aB = 0; }
    }


    // ---------- fast textures ----------
    // A floor or ceiling row is all at one depth, and so is a wall column, so whatever depends on how far down the hall a
    // point is gets worked out once per row or column. Per pixel only what depends on across (or up) is left, and that
    // was worked out when the renderer was made. They give exactly what material() gives (check() compares them).
    const nIdx = v => Math.floor(v * 16) & 255;
    const FK = new Uint8Array(N), FU = new Float32Array(N), FG = new Float32Array(N), FT = new Int32Array(N), FGX = new Uint8Array(N), FE = new Uint8Array(N), FN18 = new Uint8Array(N), FN4 = new Uint8Array(N);
    const KI = new Uint8Array(N), KR = new Uint8Array(N), KT = new Float32Array(N), KG = new Uint8Array(N), KC = new Int32Array(N), KN = new Uint8Array(N);
    const WB = new Uint8Array(N), WN = new Int32Array(N), WY = new Float32Array(N);
    const RZF = new Float32Array(H), RZC = new Float32Array(H), CZ = new Float32Array(W), CS = new Uint8Array(W);
    for (let q = 0; q < N; q++) {
      const s = S[q], x = HX[q], y = HY[q], ax = Math.abs(x), py = (q / W) | 0, px = q - py * W;
      if (s === 1) {
        RZF[py] = HZ[q];
        FK[q] = ax < .62 ? (ax > .53 ? 2 : 1) : 0; FU[q] = ax / .53; FG[q] = 1 - Math.max(0, 1 - (HW - ax) * 1.6) * .5;
        FT[q] = Math.floor(x / .8); FGX[q] = fr(x / .8) < .04 ? 1 : 0; FE[q] = ax > .585 || ax < .545 ? 1 : 0;
        FN18[q] = nIdx(x * 18); FN4[q] = nIdx(x * 4);
      } else if (s === 2) {
        RZC[py] = HZ[q];
        KI[q] = ax < .45 ? 1 : 0; KR[q] = ax > .41 ? 1 : 0; KT[q] = .7 + .3 * Math.cos((x / .45) * Math.PI * 3);
        KG[q] = fr(x / .8 + .5) < .05 ? 1 : 0; KC[q] = Math.floor(x / .8 + .5); KN[q] = nIdx(x * 6);
      } else if (s === 3 || s === 4) {
        CZ[px] = HZ[q]; CS[px] = s; WY[q] = y; WN[q] = nIdx(y * 3) << 8;
        WB[q] = y < .12 ? 0 : y < .72 ? 1 : y < .8 ? 2 : y > C - .16 ? 3 : 4;
      }
    }
    // per frame, per wall column
    const cN3 = new Int32Array(W), cEdge = new Uint8Array(W), cSt = new Float32Array(W), cM = new Float32Array(W), cZW = new Float32Array(W);
    const cPf = new Float32Array(W), cPu = new Float32Array(W), cPi = new Int32Array(W), cMon = new Uint8Array(W), cBlue = new Uint8Array(W), cFl = new Float32Array(W), cYb = new Float32Array(W), cPost = new Uint8Array(W);
    function columns(t) {
      for (let px = 0; px < W; px++) {
        const s = CS[px]; if (!s) continue;
        const zw = CZ[px] + scroll + (s === 3 ? 3 : 0);
        cZW[px] = zw; cN3[px] = nIdx(zw * 3); const m12 = fr(zw / 1.2); cEdge[px] = m12 < .04 || m12 > .96 ? 1 : 0; cSt[px] = fr(zw * 2.2) < .5 ? .012 : 0;
        const m = mod(zw, 8); cM[px] = m;
        if (s === 4) cPost[px] = mod(Math.floor(zw / 8), 2);
        else {
          const pf = (m - .2) / 1.85, pi = Math.floor(pf) + Math.floor(zw / 8) * 4;
          cPf[px] = pf; cPu[px] = fr(pf); cPi[px] = pi; cMon[px] = hash(pi, 3) < .6 ? 1 : 0; cBlue[px] = hash(pi, 9) < .5 ? 1 : 0;
          cFl[px] = .85 + .15 * Math.sin(t * 9 + pi); cYb[px] = 2.45 - hash(pi, 7) * 1.25;
        }
      }
    }
    function wallFast(q, px) {
      const y = WY[q], band = WB[q], n = NT[WN[q] | cN3[px]] * .04 - .02;
      if (band === 0) { aR = .07; aG = .065; aB = .085; }
      else if (band === 1) { const v = cEdge[px] || y < .17 || y > .67 ? 0 : .05; aR = .14 + n + v; aG = .12 + n + v; aB = .17 + n + v * 1.2; }
      else if (band === 2) { aR = .36; aG = .2; aB = .11; }
      else if (band === 3) { aR = .24; aG = .23; aB = .28; }
      else { const st = cSt[px], g = y < 1.2 ? (1.2 - y) * .05 : 0; aR = .26 + n + st - g; aG = .25 + n + st - g; aB = .31 + n + st - g; }
    }
    function rightWall(q, px) {
      eR = eG = eB = 0; rf = 0;
      wallFast(q, px);
      const m = cM[px], y = WY[q];
      if (m > 1.5 && m < 2.7 && y < 1.58) {
        if (m < 1.56 || m > 2.64 || y > 1.52) { aR = .1; aG = .09; aB = .1; }
        else {
          const pm = fr((m - 1.56) / 1.08 * 2), pv = y / 1.52, ln = pm < .06 || pm > .94 || (pv > .45 && pv < .48);
          aR = ln ? .22 : .32; aG = ln ? .12 : .18; aB = ln ? .07 : .1;
          if (pv > .62 && pv < .86 && m > 1.8 && m < 2.4) { aR = .04; aG = .05; aB = .08; eR = .02; eG = .05; eB = .08; }
          if (Math.abs(m - 2.54) < .04 && Math.abs(y - .74) < .04) { aR = .9; aG = .7; aB = .25; }
        }
      } else if (m > 1.82 && m < 2.38 && y > 1.66 && y < 1.9) {
        aR = .06; aG = .08; aB = .07;
        if (EXIT.at((2.38 - m) / .56, (1.9 - y) / .24)) { eR = .3; eG = 2.2; eB = .7; } else { eR = .01; eG = .07; eB = .03; }
      } else if (m > 4.3 && m < 5.7 && y > 1.0 && y < 2.15) {
        if (m < 4.36 || m > 5.64 || y < 1.06 || y > 2.09) { aR = .05; aG = .05; aB = .06; }
        else { POSTERS[cPost[px]].at((5.64 - m) / 1.28, (2.09 - y) / 1.03, tmp); aR = tmp[0] * .9; aG = tmp[1] * .9; aB = tmp[2] * .9; rf = .08; }
      } else if (m > 6.5 && m < 6.98 && y > .55 && y < 1.28) {
        const inner = m > 6.55 && m < 6.93 && y > .6 && y < 1.23; aR = inner ? .55 : .5; aG = inner ? .08 : .06; aB = inner ? .06 : .05;
        if (inner && Math.abs(m - 6.74) < .09 && y < 1.15) { aR = .75; aG = .1; aB = .08; }
      } else if (m > 7.55) { const e = m < 7.6 || m > 7.95; aR = e ? .14 : .3; aG = e ? .13 : .29; aB = e ? .17 : .35; }
    }
    function leftWall(q, px) {
      eR = eG = eB = 0; rf = 0;
      wallFast(q, px);
      const m = cM[px], y = WY[q];
      if (y > .85 && y < 2.5 && m > .2 && m < 7.6) {
        const pu = cPu[px];
        if (pu < .035 || pu > .965 || y < .9 || y > 2.45) { aR = .12; aG = .12; aB = .15; }
        else {
          aR = .02; aG = .025; aB = .04; rf = .3;
          const desk = y < 1.05 && y > .98; if (desk) { aR = .06; aG = .05; aB = .06; }
          if (!desk && cMon[px] && pu > .28 && pu < .62 && y > 1.07 && y < 1.4) {
            const sc = fr(y * 40) < .5 ? .8 : 1, fl = cFl[px], blue = cBlue[px];
            eR = (blue ? .3 : .6) * sc * fl; eG = (blue ? 1.3 : .9) * sc * fl; eB = 1.9 * sc * fl;
          }
          if (y > cYb[px] && fr(y / .07) < .62) { aR = .3; aG = .31; aB = .36; eR *= .2; eG *= .2; eB *= .2; rf = 0; }
          if (fr((m + y * .7) * .45) < .08) { aR += .05; aG += .05; aB += .07; }
        }
      }
    }
    // per frame, per floor row
    let fV = 0, fN18 = 0, fTz = 0, fGz = 0, fN4 = 0;
    function floorRow(z) { const zw = z + scroll; fV = fr(zw * .9); fN18 = nIdx(zw * 18) << 8; const tz = zw / .8; fTz = Math.floor(tz); fGz = fr(tz) < .04 ? 1 : 0; fN4 = nIdx(zw * 4) << 8; }
    function floorFast(q) {
      eR = eG = eB = 0;
      const k = FK[q];
      if (k === 2) { const o = FE[q]; aR = o ? .5 : .78; aG = o ? .3 : .52; aB = .1; rf = .04; }
      else if (k === 1) {
        const n = NT[fN18 | FN18[q]] * .05, u = FU[q], v = fV, dm = Math.abs(u - Math.abs(v - .5) * 2), ln = dm < .07, dot = Math.abs(u - .5) < .08 && Math.abs(v - .5) < .05;
        aR = dot ? .7 : ln ? .26 : .44 + n; aG = dot ? .5 : ln ? .04 : .07 + n * .5; aB = dot ? .15 : ln ? .05 : .07; rf = .04;
      } else {
        if (FGX[q] || fGz) { aR = .05; aG = .05; aB = .07; rf = .1; }
        else { const ft = FT[q], ck = ((ft + fTz) & 1) * .03, v = hash(ft, fTz) * .03 + NT[fN4 | FN4[q]] * .03; aR = .13 + ck + v; aG = .14 + ck + v; aB = .19 + ck + v; rf = .5; }
        const gm = FG[q]; aR *= gm; aG *= gm; aB *= gm;
      }
    }
    // per frame, per ceiling row
    let kIn = 0, kRim = 0, kP = 0, kGz = 0, kZc = 0, kVent = 0, kN6 = 0;
    function ceilRow(z, t) {
      const zw = z + scroll, m = mod(zw, 3);
      kIn = m > .6 && m < 1.5 ? 1 : 0; kRim = m < .65 || m > 1.45 ? 1 : 0; kP = kIn ? (lightsOut ? 0 : panel(Math.floor(zw / 3), t)) : 0;
      kGz = fr(zw / .8) < .05 ? 1 : 0; kZc = Math.floor(zw / .8); kVent = fr(zw / .8 * 6) < .5 ? 1 : 0; kN6 = nIdx(zw * 6) << 8;
    }
    function ceilFast(q) {
      eR = eG = eB = 0; rf = 0;
      if (kIn && KI[q]) {
        if (kRim || KR[q]) { aR = .4; aG = .4; aB = .44; }
        else { aR = aG = aB = .3; const p = kP * KT[q]; eR = 1.5 * p; eG = 1.38 * p; eB = 1.12 * p; }
      } else if (KG[q] || kGz) { aR = .14; aG = .14; aB = .16; }
      else if (kVent && hash(KC[q], kZc) < .06) { aR = aG = .12; aB = .14; }
      else { const n = NT[kN6 | KN[q]] * .03; aR = .3 + n; aG = .3 + n; aB = .33 + n; }
    }
    // what's on pixel q now, the fast way where there is one
    function surfaceAt(q, s, py, px, t) {
      if (s === 1) floorFast(q);
      else if (s === 2) ceilFast(q);
      else if (s === 4) rightWall(q, px);
      else if (s === 3) leftWall(q, px);
      else material(s, HX[q], HY[q], HZ[q], t);
    }

    // ---------- a frame ----------
    const L = [0, 0, 0];
    const NXof = new Float32Array(13), NYof = new Float32Array(13), NZof = new Float32Array(13);
    // normals by surface; the copy room's side walls and the Shredder's sides depend on which side
    [[1, 0, 1, 0], [2, 0, -1, 0], [3, 1, 0, 0], [4, -1, 0, 0], [5, 0, 0, -1], [6, 0, 1, 0], [7, 0, -1, 0], [9, 0, 0, -1], [11, 0, 1, 0], [12, 0, 0, -1]].forEach(([s, x, y, z]) => { NXof[s] = x; NYof[s] = y; NZof[s] = z; });
    const nxOf = (s, x) => s === 8 ? (x > 0 ? -1 : 1) : s === 10 ? (x > 0 ? 1 : -1) : NXof[s];
    const timings = { scene: 0, light: 0, post: 0, n: 0, mat: 0, refl: 0, lit: 0, cones: 0, dust: 0 };
    // what a shiny pixel reflects, into L; false if nothing
    function reflect(q) { const s = RS[q]; if (!s) return false; material(s, RX[q], RY[q], RZ_[q], T); L[0] = aR * .18 + eR; L[1] = aG * .16 + eG; L[2] = aB * .2 + eB; return true; }
    function addShine(q) { const f = shine[q]; if (!f) return; const i = q * 3; sbuf[i] += f * L[0]; sbuf[i + 1] += f * L[1]; sbuf[i + 2] += f * L[2]; }
    function addLit(q) { const i = q * 3; sbuf[i] += alb[i] * L[0]; sbuf[i + 1] += alb[i + 1] * L[1]; sbuf[i + 2] += alb[i + 2] * L[2]; }
    function frame(t, scrollNow, out) {
      const t0 = performance.now();
      T = t; scroll = scrollNow; lightsOut = !!out;
      buildLights(t);
      // 1. what's on every surface: albedo, glow, shine
      columns(t);
      for (let py = 0, q = 0; py < H; py++) {
        if (RZF[py]) floorRow(RZF[py]);
        if (RZC[py]) ceilRow(RZC[py], t);
        for (let px = 0; px < W; px++, q++) {
        const s = S[q], i = q * 3;
        if (!s) { alb[i] = alb[i + 1] = alb[i + 2] = 0; sbuf[i] = sbuf[i + 1] = sbuf[i + 2] = 0; shine[q] = 0; continue; }
        surfaceAt(q, s, py, px, t);
        alb[i] = aR; alb[i + 1] = aG; alb[i + 2] = aB;
        sbuf[i] = eR; sbuf[i + 1] = eG; sbuf[i + 2] = eB;
        shine[q] = rf > 0 && (s === 1 || s === 6 || s === 11 || s === 3 || s === 4 || s === 10) ? rf * RFD[q] : 0;
        }
      }
      const tm = performance.now(); timings.mat += tm - t0;
      // 2. reflections in the floor, the glass and the posters: what's there, faintly lit, and anything glowing
      for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
        const b = by * BW + bx, q = by * 2 * W + bx * 2;
        if (BU[b]) {
          if (!(shine[q] || shine[q + 1] || shine[q + W] || shine[q + W + 1]) || !reflect(q)) continue;
          addShine(q); addShine(q + 1); addShine(q + W); addShine(q + W + 1);
        } else for (let k = 0; k < 4; k++) {
          const qq = q + (k & 1) + (k >> 1) * W;
          if (shine[qq] && reflect(qq)) addShine(qq);
        }
      }
      const t1 = performance.now();
      timings.refl += t1 - tm;
      // 3. light: on the grid, then blended into every pixel
      for (let g = 0; g < GN; g++) {
        const s = GSf[g]; if (!s) continue;
        const q = GQ[g]; lightAt(HX[q], HY[q], HZ[q], nxOf(s, HX[q]), NYof[s], NZof[s], L);
        LGr[g] = L[0]; LGg[g] = L[1]; LGb[g] = L[2];
      }
      for (let q = 0; q < N; q++) {
        const s = S[q]; if (!s) continue;
        const i = q * 3;
        let r, g, b;
        if (PSELF[q]) { lightAt(HX[q], HY[q], HZ[q], nxOf(s, HX[q]), NYof[s], NZof[s], L); r = L[0]; g = L[1]; b = L[2]; }
        else {
          const c = PC[q], k = q * 4, w0 = PW[k], w1 = PW[k + 1], w2 = PW[k + 2], w3 = PW[k + 3], c2 = c + GWn;
          r = LGr[c] * w0 + LGr[c + 1] * w1 + LGr[c2] * w2 + LGr[c2 + 1] * w3;
          g = LGg[c] * w0 + LGg[c + 1] * w1 + LGg[c2] * w2 + LGg[c2 + 1] * w3;
          b = LGb[c] * w0 + LGb[c + 1] * w1 + LGb[c2] * w2 + LGb[c2 + 1] * w3;
        }
        sbuf[i] += alb[i] * r; sbuf[i + 1] += alb[i + 1] * g; sbuf[i + 2] += alb[i + 2] * b;
      }
      const tl = performance.now(); timings.lit += tl - t1;
      cones();
      if (sc !== 1) expand();
      const tc = performance.now(); timings.cones += tc - tl;
      dust(t);
      timings.dust += performance.now() - tc;
      timings.scene += t1 - t0; timings.light += performance.now() - t1; timings.n++;
      extra = [];
    }
    // light hanging in the air under each ceiling panel, in front of whatever's behind it
    function cones() {
      for (let i = 0; i < LN; i++) {
        if (!LD[i] || LZ[i] < 1.6 || LZ[i] > Z1) continue;
        const z = LZ[i], k = LR[i] / 1.75, top = CY - (C - .1 - E) / z * F, bot = CY + E / z * F;
        for (let py = Math.max(0, Math.ceil(top)); py < Math.min(H, bot); py++) {
          const f = (py - top) / (bot - top), hw = (.42 + .9 * f) / z * F, a = .06 * k * Math.pow(1 - f, 1.3);
          const x0 = Math.max(0, Math.floor(CX - hw)), x1 = Math.min(W, CX + hw);
          for (let px = x0; px < x1; px++) {
            const q = py * W + px; if (HZ[q] < z - .2) continue;
            const e = 1 - Math.abs(px - CX) / hw, w = a * (e < .25 ? e * 4 : 1);
            sbuf[q * 3] += w; sbuf[q * 3 + 1] += w * .88; sbuf[q * 3 + 2] += w * .66;
          }
        }
      }
    }
    // the scene, worked out smaller, scaled up to the picture with hard pixels
    function expand() {
      const k = 1 / sc;
      for (let py = 0; py < OH; py++) {
        const sy = Math.min(H - 1, (py / k) | 0), srow = sy * W;
        for (let px = 0; px < OW; px++) { const j = (srow + Math.min(W - 1, (px / k) | 0)) * 3, i = (py * OW + px) * 3; buf[i] = sbuf[j]; buf[i + 1] = sbuf[j + 1]; buf[i + 2] = sbuf[j + 2]; }
      }
    }
    const DUST = Array.from({ length: 90 }, (_, i) => ({ x: (hash(i, 1) - .5) * 4.6, y: .6 + hash(i, 2) * 2.9, z: 2.5 + hash(i, 3) * 9.3, p: hash(i, 4) * 6 }));
    function dust(t) {
      for (const d of DUST) {
        const z = mod(d.z - scroll - 2.5, 9.3) + 2.5, x = d.x + Math.sin(t * .3 + d.p) * .15, y = d.y + Math.sin(t * .23 + d.p * 2) * .12;
        lightAt(x, y, z, 0, -1, 0, L); const k = (L[0] + L[1]) * .5; if (k < .08) continue;
        const a = Math.min(1, k) * .45 * (.6 + .4 * Math.sin(t * 2 + d.p));
        addPx(OCX + x / z * OF, OCY - (y - E) / z * OF, a, a * .92, a * .8);
      }
    }
    function addPx(x, y, r, g, b) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= OW || y >= OH) return; const i = (y * OW + x) * 3; buf[i] += r; buf[i + 1] += g; buf[i + 2] += b; }
    const project = (x, y, z) => [OCX + x / z * OF, OCY - (y - E) / z * OF];
    // a sprite ({ w, h, d: RGBA bytes }) with its top-left at screen (x0, y0), lit by the light at world (wx, wy, wz):
    // the light on its back, a rim from the light ahead on its top edges, and (opt.glow) anything it gives off itself
    const LT = [0, 0, 0], LU = [0, 0, 0];
    const lin = new Float32Array(256); for (let i = 0; i < 256; i++) lin[i] = Math.pow(i / 255, 1.6);
    function sprite(s, x0, y0, wx, wy, wz, opt) {
      opt = opt || {};
      lightAt(wx, wy, wz, 0, .25, -1, LT);
      const amb = lightsOut ? .03 : .06;
      const back0 = LT[0] * 2.2 + .22 * (opt.ambient == null ? 1 : opt.ambient), back1 = LT[1] * 2.2 + .2 * (opt.ambient == null ? 1 : opt.ambient), back2 = LT[2] * 2.2 + .24 * (opt.ambient == null ? 1 : opt.ambient);
      lightAt(wx, wy + .2, wz, 0, .3, 1, LU);
      const rim0 = Math.min(.6, LU[0] * 1.5) * .5, rim1 = Math.min(.6, LU[1] * 1.5) * .5, rim2 = Math.min(.6, LU[2] * 1.5) * .5;
      const edgeTo = s.h * (opt.rimTo || .75), d = s.d, w = s.w, sc = opt.scale || 1, sw = Math.round(w * sc), sh = Math.round(s.h * sc);
      for (let y = 0; y < sh; y++) {
        const py = y0 + y; if (py < 0 || py >= OH) continue;
        const sy = Math.floor(y / sc);
        for (let x = 0; x < sw; x++) {
          const px = x0 + x; if (px < 0 || px >= OW) continue;
          const sx = Math.floor(x / sc), k = (sy * w + sx) * 4; if (d[k + 3] < 110) continue;
          const edge = sy < edgeTo && (sx === 0 || d[k - 1] < 110 || sx === w - 1 || d[k + 7] < 110 || sy === 0 || d[k - w * 4 + 3] < 110);
          const i = (py * OW + px) * 3;
          buf[i] = lin[d[k]] * back0 + (edge ? rim0 : 0); buf[i + 1] = lin[d[k + 1]] * back1 + (edge ? rim1 : 0); buf[i + 2] = lin[d[k + 2]] * back2 + (edge ? rim2 : 0);
          if (opt.glow) { buf[i] += lin[d[k]] * opt.glow; buf[i + 1] += lin[d[k + 1]] * opt.glow; buf[i + 2] += lin[d[k + 2]] * opt.glow; }
        }
      }
    }
    function shadow(fx, fy, rx, ry, k0) {
      for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
        const q = (x * x) / (rx * rx) + (y * y) / (ry * ry); if (q > 1) continue;
        const px = Math.round(fx + x), py = Math.round(fy + y); if (px < 0 || py < 0 || px >= OW || py >= OH) continue;
        const i = (py * OW + px) * 3, k = 1 - k0 * (1 - q); buf[i] *= k; buf[i + 1] *= k; buf[i + 2] *= k;
      }
    }
    // ---------- finishing: bloom, tone, vignette, dither, palette ----------
    function present(target) {
      const t0 = performance.now();
      bloomA.fill(0);
      for (let py = 0; py < QH * 4; py++) {
        const row = (py >> 2) * QW;
        for (let px = 0; px < QW * 4; px++) {
          const i = (py * OW + px) * 3, j = (row + (px >> 2)) * 3;
          const r = buf[i] - 1, g = buf[i + 1] - 1, b = buf[i + 2] - 1;
          if (r > 0) bloomA[j] += r * .0625; if (g > 0) bloomA[j + 1] += g * .0625; if (b > 0) bloomA[j + 2] += b * .0625;
        }
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) for (let c = 0; c < 3; c++) {
          let s = 0; for (let k = -2; k <= 2; k++) { const xx = x + k < 0 ? 0 : x + k >= QW ? QW - 1 : x + k; s += bloomA[(y * QW + xx) * 3 + c]; } bloomB[(y * QW + x) * 3 + c] = s * .2;
        }
        for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) for (let c = 0; c < 3; c++) {
          let s = 0; for (let k = -2; k <= 2; k++) { const yy = y + k < 0 ? 0 : y + k >= QH ? QH - 1 : y + k; s += bloomB[(yy * QW + x) * 3 + c]; } bloomA[(y * QW + x) * 3 + c] = s * .2;
        }
      }
      for (let j = 0, k = 0; j < QW * QH; j++, k += 3) BNZ[j] = bloomA[k] + bloomA[k + 1] + bloomA[k + 2] > .002 ? 1 : 0;
      for (let py = 0; py < OH; py++) {
        const fy = Math.min(QH - 1.001, Math.max(0, py / 4 - .5)), y0 = fy | 0, ay = fy - y0, drow = (py & 3) * 4;
        for (let px = 0; px < OW; px++) {
          const q = py * OW + px, i = q * 3, v = VIG[q], dOff = BAYI[drow + (px & 3)];
          let r = buf[i], g = buf[i + 1], b = buf[i + 2];
          const x0 = BX0[px], c00 = y0 * QW + x0;
          if (BNZ[c00] || BNZ[c00 + 1] || BNZ[c00 + QW] || BNZ[c00 + QW + 1]) {
            const ax = BAX[px], j00 = c00 * 3, j01 = j00 + 3, j10 = j00 + QW * 3, j11 = j10 + 3;
            const w00 = (1 - ax) * (1 - ay) * .7, w01 = ax * (1 - ay) * .7, w10 = (1 - ax) * ay * .7, w11 = ax * ay * .7;
            r += bloomA[j00] * w00 + bloomA[j01] * w01 + bloomA[j10] * w10 + bloomA[j11] * w11;
            g += bloomA[j00 + 1] * w00 + bloomA[j01 + 1] * w01 + bloomA[j10 + 1] * w10 + bloomA[j11 + 1] * w11;
            b += bloomA[j00 + 2] * w00 + bloomA[j01 + 2] * w01 + bloomA[j10 + 2] * w10 + bloomA[j11 + 2] * w11;
          }
          r *= v; g *= v; b *= v;
          const ri = TD[dOff + (r <= 0 ? 0 : r >= 4 ? 1024 : (r * 256) | 0)], gi = TD[dOff + (g <= 0 ? 0 : g >= 4 ? 1024 : (g * 256) | 0)], bi = TD[dOff + (b <= 0 ? 0 : b >= 4 ? 1024 : (b * 256) | 0)];
          out32[q] = PAL32[LUT[(ri << 10) | (gi << 5) | bi]];
        }
      }
      (target || ctx).putImageData(img, 0, 0);
      timings.post += performance.now() - t0;
    }
    const BAY_ROW = [0, 4, 8, 12];
    // light another light for this frame only (x, y, z in world units; colour as light)
    const light = (x, y, z, r, g, b) => { extra.push([x, y, z, r, g, b]); };
    // the fast textures against material(), at time t and scroll sc: the biggest difference found, and where
    function check(t, scr) {
      T = t; scroll = scr; columns(t);
      let worst = 0, at = -1;
      for (let py = 0, q = 0; py < H; py++) {
        if (RZF[py]) floorRow(RZF[py]);
        if (RZC[py]) ceilRow(RZC[py], t);
        for (let px = 0; px < W; px++, q++) {
          const s = S[q]; if (s < 1 || s > 4) continue;
          surfaceAt(q, s, py, px, t); const f = [aR, aG, aB, eR, eG, eB, rf];
          material(s, HX[q], HY[q], HZ[q], t); const m = [aR, aG, aB, eR, eG, eB, rf];
          for (let k = 0; k < 7; k++) { const d = Math.abs(f[k] - m[k]); if (d > worst) { worst = d; at = q; } }
        }
      }
      return { worst, at, s: at >= 0 ? S[at] : 0 };
    }
    return { check, W: OW, H: OH, F: OF, CX: OCX, CY: OCY, E, ZB: 4.6, frame, light, sprite, shadow, addPx, present, project, lightAt, buf, timings, img };
  }

  return { create, E, C, HW, Z1 };
})();
