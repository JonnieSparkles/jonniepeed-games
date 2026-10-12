// Unruggabull II's lit renderer: the hall worked out pixel by pixel (what each pixel sees and how it's lit), the game's
// own drawing laid over it and lit where it stands, then a 64-colour palette with dithering. Classic script
// (UnrugRender); load before game.js, which makes one renderer and draws every frame of play through it.
//
// The camera never moves, so what each pixel's ray hits, and what the polished floor reflects there, are worked out
// once, when the renderer is made. A frame (frame()) then scrolls the textures, moves the lights, lights each surface
// (on a grid, blended within a surface), adds the reflections, the light hanging under the ceiling panels and the
// dust, and fades the far hall into the dark. layer() lays the game's drawing over that: one picture lit by the light
// where each of its pixels stands, and one of things that glow, as they are. present() finishes it: bloom, tone,
// vignette, dither and the palette.
//
// World units are about Unruggabull's height. The camera sits at (0, E, 0) looking down +z; x is across the hall, y up.
// The hall runs on forever: a point at camera depth z is at z + scroll down the hall. Its shape comes from the game
// (the set), worked out from the game's own projection so the game's drawing sits on the rendered floor and walls.
var UnrugRender = (function () {
  'use strict';
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
  const nIdx = v => Math.floor(v * 16) & 255;
  const fr = v => v - Math.floor(v);
  const mod = (v, m) => v - m * Math.floor(v / m);
  // a drawn colour (0..255) as light
  const LIN = new Float32Array(256);
  for (let i = 0; i < 256; i++) LIN[i] = Math.pow(i / 255, 1.6);
  // a '#rrggbb' colour as light
  function lin(hex, out) { const n = parseInt(hex.slice(1), 16); out = out || [0, 0, 0]; out[0] = LIN[n >> 16]; out[1] = LIN[(n >> 8) & 255]; out[2] = LIN[n & 255]; return out; }

  // ---------- one renderer, at one size, for one hall ----------
  // set: the hall's shape in world units: E (eye height), C (ceiling), HW (half width); f, the focal length as a share
  // of the width; cy, the horizon as a share of the height; rug and rugEdge, the runner's half width and its edge;
  // skirt, rail ([bottom, top]) for the wall's bands; post, how far apart the wall posts are; panel, the ceiling
  // panels; fog ([from, to]), where the far hall fades out.
  function create(W, H, set) {
    const OPEN = !!set.openAir, PARAPET = set.parapet || 0;
    const E = set.E, C = set.C, HW = set.HW, F = W * set.f, CX = W / 2, CY = H * set.cy, N = W * H;
    const RUG = set.rug, RUGI = set.rug - set.rugEdge, POST = set.post, PANELW = set.post / 2, PANEL = set.panel;
    const SK = set.skirt, DADO = set.rail[0], RAIL = set.rail[1], FOG0 = set.fog[0], FOG1 = set.fog[1];
    const fogOf = z => z <= FOG0 ? 1 : z >= FOG1 ? 0 : Math.pow((FOG1 - z) / (FOG1 - FOG0), 1.5);
    const img = new ImageData(W, H), out32 = new Uint32Array(img.data.buffer);

    // ---------- tracing: what a ray from (ox,oy,oz) along (dx,dy,dz) hits ----------
    // Surfaces: 1 floor, 2 ceiling, 3 left wall, 4 right wall; 0 nothing (straight down the hall, forever).
    const HIT = { s: 0, t: 0, x: 0, y: 0, z: 0 };
    function trace(ox, oy, oz, dx, dy, dz) {
      let t = 1e9, s = 0;
      if (dy < 0) { const tt = -oy / dy; if (tt > 1e-4 && tt < t && (!OPEN || Math.abs(ox + dx * tt) <= HW)) { t = tt; s = 1; } }
      if (!OPEN && dy > 0) { const tt = (C - oy) / dy; if (tt > 1e-4 && tt < t) { t = tt; s = 2; } }
      if (dx < 0) { const tt = (-HW - ox) / dx; if (tt > 1e-4 && tt < t && (!OPEN || (oy + dy * tt >= 0 && oy + dy * tt <= PARAPET))) { t = tt; s = 3; } }
      if (dx > 0) { const tt = (HW - ox) / dx; if (tt > 1e-4 && tt < t && (!OPEN || (oy + dy * tt >= 0 && oy + dy * tt <= PARAPET))) { t = tt; s = 4; } }
      HIT.s = s; HIT.t = t; HIT.x = ox + dx * t; HIT.y = oy + dy * t; HIT.z = oz + dz * t;
      return HIT;
    }

    // what each pixel sees, worked out once
    const S = new Uint8Array(N), HX = new Float32Array(N), HY = new Float32Array(N), HZ = new Float32Array(N), HT = new Float32Array(N), FOGQ = new Float32Array(N);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const q = py * W + px, h = trace(0, E, 0, (px + .5 - CX) / F, (CY - py - .5) / F, 1);
      S[q] = h.s; HX[q] = h.x; HY[q] = h.y; HZ[q] = h.s ? h.z : 1e9; HT[q] = h.t; FOGQ[q] = h.s ? fogOf(h.z) : 0;
    }
    // 2x2 blocks: one light (and one reflection) per block when all four pixels are the same surface
    const BW = W >> 1, BH = H >> 1, NB = BW * BH;
    const BU = new Uint8Array(NB), BX = new Float32Array(NB), BY = new Float32Array(NB), BZ = new Float32Array(NB);
    for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
      const b = by * BW + bx, q = by * 2 * W + bx * 2, q4 = q + W + 1;
      if (S[q] && S[q] === S[q + 1] && S[q] === S[q + W] && S[q] === S[q4]) { BU[b] = 1; BX[b] = (HX[q] + HX[q4]) / 2; BY[b] = (HY[q] + HY[q4]) / 2; BZ[b] = (HZ[q] + HZ[q4]) / 2; }
    }
    // what the polished floor reflects: per uniform block (from its middle), or per pixel on edges; faded with distance
    const RS = new Uint8Array(N), RX = new Float32Array(N), RY = new Float32Array(N), RZ_ = new Float32Array(N), RFD = new Float32Array(N);
    const reflectFrom = (q, x, z, s, dx, dy, j) => {
      if (s !== 1) return;
      const h = trace(x, 0, z, dx + j, -dy, 1);
      if (OPEN) RFD[q] = .6;
      if (h.s) { RS[q] = h.s; RX[q] = h.x; RY[q] = h.y; RZ_[q] = h.z; RFD[q] = (.45 + .55 * Math.min(1, HT[q] / 14)) * fogOf(h.z); }
    };
    for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
      const b = by * BW + bx, px = bx * 2, py = by * 2, q = py * W + px;
      if (BU[b]) reflectFrom(q, BX[b], BZ[b], S[q], (px + 1 - CX) / F, (CY - py - 1) / F, (hash(px, py) - .5) * .03);
      else for (let k = 0; k < 4; k++) {
        const xx = px + (k & 1), yy = py + (k >> 1), qq = yy * W + xx;
        reflectFrom(qq, HX[qq], HZ[qq], S[qq], (xx + .5 - CX) / F, (CY - yy - .5) / F, (hash(xx, yy) - .5) * .03);
      }
    }

    // light is worked out on a grid every G pixels and blended between grid points on the same surface; a pixel with
    // no grid point of its own surface around it is lit on its own
    const G = W >= 400 ? 4 : 2, GWn = Math.ceil((W - 1) / G) + 1, GHn = Math.ceil((H - 1) / G) + 1, GN = GWn * GHn;
    const gPix = (g) => { const gy = (g / GWn) | 0, gx = g - gy * GWn; return Math.min(gy * G, H - 1) * W + Math.min(gx * G, W - 1); };
    const GQ = new Int32Array(GN), GSf = new Uint8Array(GN);
    for (let g = 0; g < GN; g++) { GQ[g] = gPix(g); GSf[g] = S[GQ[g]]; }
    const LGr = new Float32Array(GN), LGg = new Float32Array(GN), LGb = new Float32Array(GN);
    // PK: 0 no surface, 1 all four grid points its own surface (weights from the table WT by where it sits in its cell),
    // 2 some of them (its own weights in PW), 3 none (lit on its own)
    const PC = new Int32Array(N), PW = new Float32Array(N * 4), PK = new Uint8Array(N), WT = new Float32Array(G * G * 4);
    for (let yy = 0; yy < G; yy++) for (let xx = 0; xx < G; xx++) { const fx = xx / G, fy = yy / G, k = (yy * G + xx) * 4; WT[k] = (1 - fx) * (1 - fy); WT[k + 1] = fx * (1 - fy); WT[k + 2] = (1 - fx) * fy; WT[k + 3] = fx * fy; }
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
      const q = py * W + px, s = S[q]; if (!s) continue;
      const gx = Math.min(GWn - 2, (px / G) | 0), gy = Math.min(GHn - 2, (py / G) | 0);
      const x0 = gx * G, x1 = Math.min((gx + 1) * G, W - 1), y0 = gy * G, y1 = Math.min((gy + 1) * G, H - 1);
      const fx = x1 > x0 ? (px - x0) / (x1 - x0) : 0, fy = y1 > y0 ? (py - y0) / (y1 - y0) : 0, c = gy * GWn + gx;
      const w = [(1 - fx) * (1 - fy), fx * (1 - fy), (1 - fx) * fy, fx * fy], cs = [c, c + 1, c + GWn, c + GWn + 1];
      let sum = 0, all = true; for (let k = 0; k < 4; k++) { if (GSf[cs[k]] !== s) { w[k] = 0; all = false; } sum += w[k]; }
      PC[q] = c;
      if (sum < 1e-4) { PK[q] = 3; continue; }
      if (all && x1 - x0 === G && y1 - y0 === G) { PK[q] = 1; continue; }
      PK[q] = 2; for (let k = 0; k < 4; k++) PW[q * 4 + k] = w[k] / sum;
    }
    // the vignette, once
    const VIG = new Float32Array(N);
    for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) { const vx = (px - CX) / W, vy = (py - H * .5) / H; VIG[py * W + px] = 1 - .55 * (vx * vx + vy * vy); }

    // the picture in light; each surface's albedo and shine for this frame
    const buf = new Float32Array(N * 3), alb = new Float32Array(N * 3), shine = new Float32Array(N);
    const QW = W >> 2, QH = H >> 2, bloomA = new Float32Array(QW * QH * 3), bloomB = new Float32Array(QW * QH * 3), BNZ = new Uint8Array(QW * QH);
    const BX0 = new Int32Array(W), BAX = new Float32Array(W);
    for (let px = 0; px < W; px++) { const fx = Math.min(QW - 1.001, Math.max(0, px / 4 - .5)); BX0[px] = fx | 0; BAX[px] = fx - (fx | 0); }
    const BAYI = new Int32Array(16); for (let d = 0; d < 16; d++) BAYI[d] = d * 1025;

    // ---------- this frame's view of the hall ----------
    let T = 0, scroll = 0, rugScroll = 0, power = 1, dark = false, edgeGlow = 0, fill = 0;
    let dawn = 0;
    const sunrise = () => OPEN ? [.3 * dawn, .12 * dawn, -.025 * dawn] : [0, 0, 0];
    const RAILC = [.36, .2, .11], EDGEC = [.78, .52, .1];
    // SETS: the section's look (view.look): the wall's lower panels (lo), its plaster above (hi), the skirting (sk), the
    // cornice (co), the ceiling tiles (ce), the floor tiles (ti) and how polished they are (sh), and the ceiling panels'
    // light (lamp). Left out, each is today's. The panels' own glow and the light hanging under them follow lamp.
    const LK0 = { lo: [.11, .095, .135], hi: [.19, .18, .23], sk: [.07, .065, .085], co: [.17, .16, .2], ce: [.24, .24, .27], ti: [.13, .14, .19], sh: .5, lamp: [1.75, 1.55, 1.2] };
    const LK = JSON.parse(JSON.stringify(LK0)), TUBE = [1.5, 1.38, 1.12], CONEC = [1, .88, .66];
    function setLook(lk) {
      lk = lk || LK0;
      for (const key in LK0) { const d = LK0[key], v = lk[key] == null ? d : lk[key]; if (typeof d === 'number') LK[key] = v; else { LK[key][0] = v[0]; LK[key][1] = v[1]; LK[key][2] = v[2]; } }
      const l = LK.lamp; TUBE[0] = 1.5 * l[0] / 1.75; TUBE[1] = 1.38 * l[1] / 1.55; TUBE[2] = 1.12 * l[2] / 1.2;
      CONEC[0] = l[0] / 1.75; CONEC[1] = .88 * l[1] / 1.55; CONEC[2] = .66 * l[2] / 1.2;
    }

    // ---------- lights ----------
    // The ceiling panels (pointing down, in a tight cone) and whatever the game adds for the frame: shots, muzzle
    // flashes, glowing things. Panels light only so far; the dark beyond is the fog's.
    const MAXL = 64, LZMAX = 30;
    let LN = 0; const LP = new Float32Array(MAXL), LX = new Float32Array(MAXL), LY = new Float32Array(MAXL), LZ = new Float32Array(MAXL), LR = new Float32Array(MAXL), LG = new Float32Array(MAXL), LB = new Float32Array(MAXL), LD = new Uint8Array(MAXL);
    const addLight = (x, y, z, r, g, b, down) => { if (LN >= MAXL) return; LX[LN] = x; LY[LN] = y; LZ[LN] = z; LR[LN] = r; LG[LN] = g; LB[LN] = b; LD[LN] = down ? 1 : 0; LN++; };
    const MAXX = 32; let XN = 0; const XL = new Float32Array(MAXX * 6);   // lights added for this frame only
    const light = (x, y, z, r, g, b) => { if (XN >= MAXX) return; const i = XN * 6; XL[i] = x; XL[i + 1] = y; XL[i + 2] = z; XL[i + 3] = r; XL[i + 4] = g; XL[i + 5] = b; XN++; };
    // one panel in eleven is dead and one in seven flickers
    const panel = (k, t) => { if (mod(k, 11) === 5) return 0; if (mod(k, 7) === 3) { const f = Math.sin(t * 31) * Math.sin(t * 7.7 + k); return f > .55 || (t % 3.1 < .12) ? .1 : 1; } return 1; };
    function buildLights(t) {
      LN = 0;
      if (power > 0) for (let k = Math.floor((scroll - 4) / PANEL); k <= Math.floor((scroll + LZMAX) / PANEL); k++) {
        const z = (k + .35) * PANEL - scroll; if (z < -4 || z > LZMAX) continue;
        const p = panel(k, t) * power; if (p > 0) { LP[LN] = p; addLight(0, C - .08, z, LK.lamp[0] * p, LK.lamp[1] * p, LK.lamp[2] * p, true); }
      }
      for (let i = 0; i < XN; i++) { const j = i * 6; addLight(XL[j], XL[j + 1], XL[j + 2], XL[j + 3], XL[j + 4], XL[j + 5], false); }
    }
    function lightAt(x, y, z, nx, ny, nz, out) {
      let r = .03 + fill, g = .03 + fill, b = .06 + fill;
      if (OPEN) { const c = sunrise(); r += c[0]; g += c[1]; b += c[2]; }
      if (dark) { r = .012; g = .012; b = .03; }
      for (let i = 0; i < LN; i++) {
        const vx = LX[i] - x, vy = LY[i] - y, vz = LZ[i] - z, d2 = vx * vx + vy * vy + vz * vz;
        if (d2 > 90) continue;
        const dot = nx * vx + ny * vy + nz * vz;
        if (dot <= 0) continue;
        const d = Math.sqrt(d2);
        let em = 1;
        if (LD[i]) { const cd = -vy / d; if (cd > 0) { const c2 = cd * cd, c4 = c2 * c2; em = c4 * c4 * 3.2 + .16; } else em = .16; }
        const a = (dot / d) * em / (1 + .1 * d2);
        r += LR[i] * a; g += LG[i] * a; b += LB[i] * a;
      }
      out[0] = r; out[1] = g; out[2] = b;
    }

    // ---------- materials ----------
    // Writes albedo into aR/aG/aB, glow into eR/eG/eB and how shiny it is into rf, for surface s at camera depth z.
    let aR = 0, aG = 0, aB = 0, eR = 0, eG = 0, eB = 0, rf = 0;
    // the walls: skirting, panelled below the rail, the rail in the section's colour, plaster above, a cornice; dark
    // posts every POST
    function wall(y, zw) {
      eR = eG = eB = 0; rf = 0;
      if (OPEN) { aR = .16; aG = .15; aB = .2; return; }
      if (fr(zw / POST) < .03) { aR = .06; aG = .055; aB = .075; return; }
      const n = noise(zw * 3, y * 3) * .04 - .02;
      const lo = LK.lo, hi = LK.hi;
      if (y < SK) { aR = LK.sk[0]; aG = LK.sk[1]; aB = LK.sk[2]; }
      else if (y < DADO) { const m = fr(zw / PANELW), v = m < .04 || m > .96 || y < SK + .05 || y > DADO - .05 ? 0 : .05; aR = lo[0] + n + v; aG = lo[1] + n + v; aB = lo[2] + n + v * 1.2; }
      else if (y < RAIL) { aR = RAILC[0]; aG = RAILC[1]; aB = RAILC[2]; }
      else if (y > C - .16) { aR = LK.co[0]; aG = LK.co[1]; aB = LK.co[2]; }
      else { const st = fr(zw * 2.2) < .5 ? .012 : 0, g = y < RAIL + .5 ? (RAIL + .5 - y) * .05 : 0; aR = hi[0] + n + st - g; aG = hi[1] + n + st - g; aB = hi[2] + n + st - g; }
    }
    // the floor: the runner rug down the middle (its own scroll, so it can pull), polished tiles either side
    function floorMat(x, z) {
      eR = eG = eB = 0;
      const ax = Math.abs(x);
      if (ax < RUG) {
        const zr = z + rugScroll;
        if (ax > RUGI) {
          const e = (ax - RUGI) / (RUG - RUGI), k = e < .17 || e > .61 ? .64 : 1;
          aR = EDGEC[0] * k; aG = EDGEC[1] * k; aB = EDGEC[2] * k;
          if (edgeGlow) { eR = EDGEC[0] * edgeGlow; eG = EDGEC[1] * edgeGlow; eB = EDGEC[2] * edgeGlow; }
        } else {
          const n = noise(x * 18, zr * 18) * .05, u = ax / RUGI, v = fr(zr * .9), dm = Math.abs(u - Math.abs(v - .5) * 2), ln = dm < .07, dot = Math.abs(u - .5) < .08 && Math.abs(v - .5) < .05;
          aR = dot ? .7 : ln ? .26 : .44 + n; aG = dot ? .5 : ln ? .04 : .07 + n * .5; aB = dot ? .15 : ln ? .05 : .07;
        }
        rf = .04;
      } else {
        const zw = z + scroll, tx = x / .8, tz = zw / .8, gx = fr(tx), gz = fr(tz);
        if (gx < .04 || gz < .04) { aR = .05; aG = .05; aB = .07; rf = .1; }
        else { const ck = ((Math.floor(tx) + Math.floor(tz)) & 1) * .03, v = hash(Math.floor(tx), Math.floor(tz)) * .03 + noise(x * 4, zw * 4) * .03; aR = LK.ti[0] + ck + v; aG = LK.ti[1] + ck + v; aB = LK.ti[2] + ck + v; rf = LK.sh; }
        const gm = 1 - Math.max(0, 1 - (HW - ax) * 1.6) * .5; aR *= gm; aG *= gm; aB *= gm;
      }
    }
    // the ceiling: a grid of tiles, now and then a vent, and a light panel every PANEL
    function ceilMat(x, z, t) {
      eR = eG = eB = 0; rf = 0;
      const zw = z + scroll, m = mod(zw, PANEL), ax = Math.abs(x);
      if (m > PANEL * .2 && m < PANEL * .5 && ax < .45) {
        const p = power * panel(Math.floor(zw / PANEL), t), rim = m < PANEL * .2 + .05 || m > PANEL * .5 - .05 || ax > .41;
        if (rim) { aR = .4; aG = .4; aB = .44; } else { aR = aG = aB = .3; const tube = .7 + .3 * Math.cos((x / .45) * Math.PI * 3); eR = TUBE[0] * p * tube; eG = TUBE[1] * p * tube; eB = TUBE[2] * p * tube; }
      } else {
        const gx = fr(x / .8 + .5), gz = fr(zw / .8);
        if (gx < .05 || gz < .05) { aR = .14; aG = .14; aB = .16; }
        else { const vent = hash(Math.floor(x / .8 + .5), Math.floor(zw / .8)) < .06 && fr(zw / .8 * 6) < .5, n = noise(x * 6, zw * 6) * .03; if (vent) { aR = aG = .1; aB = .12; } else { aR = LK.ce[0] + n; aG = LK.ce[1] + n; aB = LK.ce[2] + n; } }
      }
    }
    function material(s, x, y, z, t) {
      if (s === 1) floorMat(x, z);
      else if (s === 2) ceilMat(x, z, t);
      else if (s === 3 || s === 4) wall(y, z + scroll);
      else { aR = aG = aB = eR = eG = eB = rf = 0; }
    }

    // ---------- fast textures ----------
    // A floor or ceiling row is all at one depth, and so is a wall column, so whatever depends on how far down the hall a
    // point is gets worked out once per row or column. Per pixel only what depends on across (or up) is left, and that
    // was worked out when the renderer was made. They give exactly what material() gives (check() compares them).
    const FK = new Uint8Array(N), FU = new Float32Array(N), FG = new Float32Array(N), FT = new Int32Array(N), FGX = new Uint8Array(N), FE = new Float32Array(N), FN18 = new Uint8Array(N), FN4 = new Uint8Array(N);
    const KI = new Uint8Array(N), KR = new Uint8Array(N), KT = new Float32Array(N), KG = new Uint8Array(N), KC = new Int32Array(N), KN = new Uint8Array(N);
    const WB = new Uint8Array(N), WN = new Int32Array(N), WE = new Uint8Array(N), WG = new Float32Array(N);
    const RZF = new Float32Array(H), RZC = new Float32Array(H), CZ = new Float32Array(W), CS = new Uint8Array(W);
    for (let q = 0; q < N; q++) {
      const s = S[q], x = HX[q], y = HY[q], ax = Math.abs(x), py = (q / W) | 0, px = q - py * W;
      if (s === 1) {
        RZF[py] = HZ[q];
        FK[q] = ax < RUG ? (ax > RUGI ? 2 : 1) : 0; FU[q] = ax / RUGI; FG[q] = 1 - Math.max(0, 1 - (HW - ax) * 1.6) * .5;
        const e = (ax - RUGI) / (RUG - RUGI); FE[q] = e < .17 || e > .61 ? .64 : 1;
        FT[q] = Math.floor(x / .8); FGX[q] = fr(x / .8) < .04 ? 1 : 0;
        FN18[q] = nIdx(x * 18); FN4[q] = nIdx(x * 4);
      } else if (s === 2) {
        RZC[py] = HZ[q];
        KI[q] = ax < .45 ? 1 : 0; KR[q] = ax > .41 ? 1 : 0; KT[q] = .7 + .3 * Math.cos((x / .45) * Math.PI * 3);
        KG[q] = fr(x / .8 + .5) < .05 ? 1 : 0; KC[q] = Math.floor(x / .8 + .5); KN[q] = nIdx(x * 6);
      } else if (s === 3 || s === 4) {
        CZ[px] = HZ[q]; CS[px] = s; WN[q] = nIdx(y * 3) << 8;
        WB[q] = y < SK ? 0 : y < DADO ? 1 : y < RAIL ? 2 : y > C - .16 ? 3 : 4;
        WE[q] = y < SK + .05 || y > DADO - .05 ? 1 : 0; WG[q] = y < RAIL + .5 ? (RAIL + .5 - y) * .05 : 0;
      }
    }
    // per frame, per wall column
    const cN3 = new Int32Array(W), cEdge = new Uint8Array(W), cSt = new Float32Array(W), cPost = new Uint8Array(W);
    function columns() {
      for (let px = 0; px < W; px++) {
        if (!CS[px]) continue;
        const zw = CZ[px] + scroll, m = fr(zw / PANELW);
        cN3[px] = nIdx(zw * 3); cEdge[px] = m < .04 || m > .96 ? 1 : 0; cSt[px] = fr(zw * 2.2) < .5 ? .012 : 0; cPost[px] = fr(zw / POST) < .03 ? 1 : 0;
      }
    }
    // per row: the floor tiles' and the ceiling vents' hashes, by tile across (offset by TX0)
    const TX0 = 8, TH = new Float32Array(2 * TX0 + 1), VH = new Uint8Array(2 * TX0 + 1);
    // 1. what's on every surface this frame: albedo into alb, glow into buf, how much it reflects into shine. All in one
    // pass, row by row: the floor's rug scrolls with the rug and its tiles with the hall.
    // The open set shares tracing, materials, light, layering and finishing with the hall.
    // A simple texture pass suffices for its flat parapets and sky; the hall keeps its original fast pass.
    function sky(k) { return [.012 + .05 * k + dawn * .28 * k, .009 + .025 * k + dawn * .1 * k, .025 + .04 * k]; }
    function surfaces(t) {
      if (OPEN) {
        for (let q = 0; q < N; q++) {
          const i = q * 3, s = S[q];
          material(s, HX[q], HY[q], HZ[q], t);
          alb[i] = aR; alb[i + 1] = aG; alb[i + 2] = aB;
          const c = s ? [eR, eG, eB] : sky(Math.min(1, ((q / W) | 0) / CY));
          buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2];
          shine[q] = s === 1 ? rf * RFD[q] : 0;
        }
        return;
      }
      columns();
      const e0 = EDGEC[0], e1 = EDGEC[1], e2 = EDGEC[2], eg = edgeGlow, r0 = RAILC[0], r1 = RAILC[1], r2 = RAILC[2];
      const lo0 = LK.lo[0], lo1 = LK.lo[1], lo2 = LK.lo[2], hi0 = LK.hi[0], hi1 = LK.hi[1], hi2 = LK.hi[2], sk0 = LK.sk[0], sk1 = LK.sk[1], sk2 = LK.sk[2], co0 = LK.co[0], co1 = LK.co[1], co2 = LK.co[2];
      const ce0 = LK.ce[0], ce1 = LK.ce[1], ce2 = LK.ce[2], ti0 = LK.ti[0], ti1 = LK.ti[1], ti2 = LK.ti[2], tsh = LK.sh, tu0 = TUBE[0], tu1 = TUBE[1], tu2 = TUBE[2];
      for (let py = 0, q = 0; py < H; py++) {
        let fV = 0, fN18 = 0, fTz = 0, fGz = 0, fN4 = 0, kIn = 0, kRim = 0, kP = 0, kGz = 0, kVent = 0, kN6 = 0;
        const zf = RZF[py], zc = RZC[py];
        if (zf) {
          const zr = zf + rugScroll, zw = zf + scroll, tz = zw / .8;
          fV = fr(zr * .9); fN18 = nIdx(zr * 18) << 8; fTz = Math.floor(tz); fGz = fr(tz) < .04 ? 1 : 0; fN4 = nIdx(zw * 4) << 8;
          for (let k = -TX0; k <= TX0; k++) TH[k + TX0] = hash(k, fTz) * .03;
        }
        if (zc) {
          const zw = zc + scroll, m = mod(zw, PANEL), kZc = Math.floor(zw / .8);
          kIn = m > PANEL * .2 && m < PANEL * .5 ? 1 : 0; kRim = m < PANEL * .2 + .05 || m > PANEL * .5 - .05 ? 1 : 0; kP = kIn ? power * panel(Math.floor(zw / PANEL), t) : 0;
          kGz = fr(zw / .8) < .05 ? 1 : 0; kVent = fr(zw / .8 * 6) < .5 ? 1 : 0; kN6 = nIdx(zw * 6) << 8;
          if (kVent) for (let k = -TX0; k <= TX0; k++) VH[k + TX0] = hash(k, kZc) < .06 ? 1 : 0;
        }
        for (let px = 0; px < W; px++, q++) {
          const s = S[q], i = q * 3;
          let aR = 0, aG = 0, aB = 0, eR = 0, eG = 0, eB = 0, rf = 0;
          if (s === 1) {
            const k = FK[q];
            if (k === 2) {
              const e = FE[q]; aR = e0 * e; aG = e1 * e; aB = e2 * e; rf = .04;
              if (eg) { eR = e0 * eg; eG = e1 * eg; eB = e2 * eg; }
            } else if (k === 1) {
              const n = NT[fN18 | FN18[q]] * .05, u = FU[q], dm = Math.abs(u - Math.abs(fV - .5) * 2), ln = dm < .07, dot = Math.abs(u - .5) < .08 && Math.abs(fV - .5) < .05;
              aR = dot ? .7 : ln ? .26 : .44 + n; aG = dot ? .5 : ln ? .04 : .07 + n * .5; aB = dot ? .15 : ln ? .05 : .07; rf = .04;
            } else {
              if (FGX[q] || fGz) { aR = .05; aG = .05; aB = .07; rf = .1; }
              else { const ft = FT[q], ck = ((ft + fTz) & 1) * .03, v = TH[ft + TX0] + NT[fN4 | FN4[q]] * .03; aR = ti0 + ck + v; aG = ti1 + ck + v; aB = ti2 + ck + v; rf = tsh; }
              const gm = FG[q]; aR *= gm; aG *= gm; aB *= gm;
            }
            shine[q] = rf * RFD[q];
          } else {
            if (s === 2) {
              if (kIn && KI[q]) {
                if (kRim || KR[q]) { aR = .4; aG = .4; aB = .44; }
                else { aR = aG = aB = .3; const p = kP * KT[q]; eR = tu0 * p; eG = tu1 * p; eB = tu2 * p; }
              } else if (KG[q] || kGz) { aR = .14; aG = .14; aB = .16; }
              else if (kVent && VH[KC[q] + TX0]) { aR = aG = .1; aB = .12; }
              else { const n = NT[kN6 | KN[q]] * .03; aR = ce0 + n; aG = ce1 + n; aB = ce2 + n; }
            } else if (s) {
              if (cPost[px]) { aR = .06; aG = .055; aB = .075; }
              else {
                const band = WB[q], n = NT[WN[q] | cN3[px]] * .04 - .02;
                if (band === 0) { aR = sk0; aG = sk1; aB = sk2; }
                else if (band === 1) { const v = cEdge[px] || WE[q] ? 0 : .05; aR = lo0 + n + v; aG = lo1 + n + v; aB = lo2 + n + v * 1.2; }
                else if (band === 2) { aR = r0; aG = r1; aB = r2; }
                else if (band === 3) { aR = co0; aG = co1; aB = co2; }
                else { const st = cSt[px], g = WG[q]; aR = hi0 + n + st - g; aG = hi1 + n + st - g; aB = hi2 + n + st - g; }
              }
            }
            shine[q] = 0;
          }
          alb[i] = aR; alb[i + 1] = aG; alb[i + 2] = aB;
          buf[i] = eR; buf[i + 1] = eG; buf[i + 2] = eB;
        }
      }
    }

    // ---------- a frame ----------
    const L = [0, 0, 0];
    const NXof = [0, 0, 0, 1, -1], NYof = [0, 1, -1, 0, 0];
    const timings = { n: 0, mat: 0, refl: 0, lit: 0, cones: 0, dust: 0, layer: 0, post: 0 };
    // what a shiny pixel reflects, into L; false if nothing
    function reflect(q) { const s = RS[q]; if (!s) { if (OPEN && S[q] === 1) { const c = sky(.8); L[0] = c[0]; L[1] = c[1]; L[2] = c[2]; return true; } return false; } material(s, RX[q], RY[q], RZ_[q], T); L[0] = aR * .18 + eR; L[1] = aG * .16 + eG; L[2] = aB * .2 + eB; return true; }
    function addShine(q) { const f = shine[q]; if (!f) return; const i = q * 3; buf[i] += f * L[0]; buf[i + 1] += f * L[1]; buf[i + 2] += f * L[2]; }
    // the view: scroll (the hall's) and rug (the runner's own); power, how bright the ceiling panels are (0 off); house,
    // how far the office's lights are up (0 to 1); dark,
    // the lights are out; rail, the section's colour for the wall rail (light, or null for none); edge, the runner's
    // edge colour (light), glowing if edgeGlow
    function setView(v) {
      // house: the office's own lights up (0 to 1): the panels brighter, and an even fill of light everywhere
      const house = v.house || 0;
      scroll = v.scroll; rugScroll = v.rug; power = v.power * (1 + .6 * house); fill = house * .09; dark = !!v.dark; edgeGlow = v.edgeGlow || 0;
      const rc = v.rail || [.36, .2, .11]; RAILC[0] = rc[0]; RAILC[1] = rc[1]; RAILC[2] = rc[2];
      const ec = v.edge || [.78, .52, .1]; EDGEC[0] = ec[0]; EDGEC[1] = ec[1]; EDGEC[2] = ec[2];
      if (OPEN) { fill += v.ambient || 0; dawn = v.dawn || 0; }
      setLook(v.look);
    }
    function frame(t, v) {
      const t0 = performance.now();
      T = t; setView(v);
      buildLights(t); XN = 0;
      surfaces(t);
      const tm = performance.now(); timings.mat += tm - t0;
      // 2. reflections in the polished floor: what's there, faintly lit, and anything glowing
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
      const t1 = performance.now(); timings.refl += t1 - tm;
      // 3. light: on the grid, then blended into every pixel; the far hall fades into the dark
      gridLights();
      const bf = buf, al = alb, fog = FOGQ, pk = PK, pc = PC, pw = PW, wt = WT, Rr = LGr, Gg = LGg, Bb = LGb, gw = GWn;
      for (let py = 0, q = 0, i = 0; py < H; py++) {
        const wrow = (py % G) * G * 4;
        for (let px = 0; px < W; px++, q++, i += 3) {
          const kind = pk[q]; if (!kind) continue;
          let r, g, b;
          if (kind === 3) { const s = S[q]; lightAt(HX[q], HY[q], HZ[q], NXof[s], NYof[s], 0, L); r = L[0]; g = L[1]; b = L[2]; }
          else {
            const c = pc[q], c2 = c + gw, k = kind === 1 ? wrow + (px % G) * 4 : q * 4, ww = kind === 1 ? wt : pw;
            const w0 = ww[k], w1 = ww[k + 1], w2 = ww[k + 2], w3 = ww[k + 3];
            r = Rr[c] * w0 + Rr[c + 1] * w1 + Rr[c2] * w2 + Rr[c2 + 1] * w3;
            g = Gg[c] * w0 + Gg[c + 1] * w1 + Gg[c2] * w2 + Gg[c2 + 1] * w3;
            b = Bb[c] * w0 + Bb[c + 1] * w1 + Bb[c2] * w2 + Bb[c2 + 1] * w3;
          }
          const f = fog[q];
          bf[i] = (bf[i] + al[i] * r) * f; bf[i + 1] = (bf[i + 1] + al[i + 1] * g) * f; bf[i + 2] = (bf[i + 2] + al[i + 2] * b) * f;
        }
      }
      const tl = performance.now(); timings.lit += tl - t1;
      cones();
      const tc = performance.now(); timings.cones += tc - tl;
      if (!OPEN) dust(t);
      timings.dust += performance.now() - tc; timings.n++;
    }
    // the light at every grid point (lightAt, worked through for the hall's own surfaces)
    function gridLights() {
      const lx = LX, ly = LY, lz = LZ, lr = LR, lg = LG, lb = LB, ld = LD, n = LN, gs = GSf, gq = GQ, hx = HX, hy = HY, hz = HZ, Rr = LGr, Gg = LGg, Bb = LGb;
      const ar = dark ? .012 : .03 + fill, ab = dark ? .03 : .06 + fill;
      for (let g = 0; g < GN; g++) {
        const s = gs[g]; if (!s) continue;
        const q = gq[g], x = hx[q], y = hy[q], z = hz[q], nx = s === 3 ? 1 : s === 4 ? -1 : 0, ny = s === 1 ? 1 : s === 2 ? -1 : 0;
        let r = ar, gg = ar, b = ab;
        if (OPEN) { const c = sunrise(); r += c[0]; gg += c[1]; b += c[2]; }
        for (let i = 0; i < n; i++) {
          const vz = lz[i] - z; if (vz > 9.5 || vz < -9.5) continue;
          const vx = lx[i] - x, vy = ly[i] - y, d2 = vx * vx + vy * vy + vz * vz; if (d2 > 90) continue;
          const dot = nx * vx + ny * vy; if (dot <= 0) continue;
          const d = Math.sqrt(d2);
          let em = 1;
          if (ld[i]) { const cd = -vy / d; if (cd > 0) { const c2 = cd * cd, c4 = c2 * c2; em = c4 * c4 * 3.2 + .16; } else em = .16; }
          const a = (dot / d) * em / (1 + .1 * d2);
          r += lr[i] * a; gg += lg[i] * a; b += lb[i] * a;
        }
        Rr[g] = r; Gg[g] = gg; Bb[g] = b;
      }
    }
    // light hanging in the air under each ceiling panel, in front of whatever's behind it
    function cones() {
      for (let i = 0; i < LN; i++) {
        if (!LD[i] || LZ[i] < 1.6) continue;
        const z = LZ[i], k = LP[i] * fogOf(z), top = CY - (C - .1 - E) / z * F, bot = CY + E / z * F;
        for (let py = Math.max(0, Math.ceil(top)); py < Math.min(H, bot); py++) {
          const f = (py - top) / (bot - top), hw = (.42 + .9 * f) / z * F, a = .06 * k * Math.pow(1 - f, 1.3);
          const x0 = Math.max(0, Math.floor(CX - hw)), x1 = Math.min(W, CX + hw);
          for (let px = x0; px < x1; px++) {
            const q = py * W + px; if (HZ[q] < z - .2) continue;
            const e = 1 - Math.abs(px - CX) / hw, w = a * (e < .25 ? e * 4 : 1);
            buf[q * 3] += w * CONEC[0]; buf[q * 3 + 1] += w * CONEC[1]; buf[q * 3 + 2] += w * CONEC[2];
          }
        }
      }
    }
    const DUST = Array.from({ length: 90 }, (_, i) => ({ x: (hash(i, 1) - .5) * 2 * (HW - .3), y: .6 + hash(i, 2) * (C - .7), z: 2.5 + hash(i, 3) * 9.3, p: hash(i, 4) * 6 }));
    function dust(t) {
      for (const d of DUST) {
        const z = mod(d.z - scroll - 2.5, 9.3) + 2.5, x = d.x + Math.sin(t * .3 + d.p) * .15, y = d.y + Math.sin(t * .23 + d.p * 2) * .12;
        lightAt(x, y, z, 0, -1, 0, L); const k = (L[0] + L[1]) * .5; if (k < .08) continue;
        const a = Math.min(1, k) * .45 * (.6 + .4 * Math.sin(t * 2 + d.p));
        addPx(CX + x / z * F, CY - (y - E) / z * F, a, a * .92, a * .8);
      }
    }
    function addPx(x, y, r, g, b) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; buf[i] += r; buf[i + 1] += g; buf[i + 2] += b; }
    const project = (x, y, z) => [CX + x / z * F, CY - (y - E) / z * F];

    // ---------- the game's drawing, laid over the hall ----------
    // lit: everything the game draws in the hall (RGBA, this size), lit by the light where each pixel stands. How far
    // away a pixel is comes from what it's part of: a run of drawn pixels standing on the floor is as far as the floor
    // under its foot, one hanging from the ceiling as far as the ceiling over its top, anything else (a poster) as far
    // as the wall behind it; the nearest of the three. It takes the light there on its back (toward the camera), a rim
    // of the light ahead on its edges, and the fog. glow: things that give off their own light, laid on as they are.
    const NXV = 7, NYV = 5, NZV = 16, ZV0 = 2.5, ZV1 = 20, NV = NXV * NYV * NZV;
    const VB = new Float32Array(NV * 3), VR = new Float32Array(NV * 3);
    const ZFL = new Float32Array(H), ZCE = new Float32Array(H), DZ = new Float32Array(N), runZ = new Float32Array(W), inRun = new Uint8Array(W);
    for (let py = 0; py < H; py++) { const d = py + .5 - CY; ZFL[py] = d > .5 ? E * F / d : 1e9; ZCE[py] = !OPEN && d < -.5 ? (C - E) * F / -d : 1e9; }
    const XC = new Float32Array(W); for (let px = 0; px < W; px++) XC[px] = (px + .5 - CX) / F;
    const cacheB = new Int32Array(W), cacheZ = new Float32Array(W), cacheL = new Float32Array(W * 3);
    function volume() {
      for (let iz = 0, v = 0; iz < NZV; iz++) {
        const z = ZV0 + (ZV1 - ZV0) * iz / (NZV - 1);
        for (let iy = 0; iy < NYV; iy++) {
          const y = C * iy / (NYV - 1);
          for (let ix = 0; ix < NXV; ix++, v += 3) {
            const x = -HW + 2 * HW * ix / (NXV - 1);
            lightAt(x, y, z, 0, .25, -1, L); VB[v] = L[0]; VB[v + 1] = L[1]; VB[v + 2] = L[2];
            lightAt(x, y, z, 0, .3, 1, L); VR[v] = L[0]; VR[v + 1] = L[1]; VR[v + 2] = L[2];
          }
        }
      }
    }
    // the light at (x, y, z) from the volume, into L (back) and LRIM (ahead)
    const LRIM = [0, 0, 0];
    function sample(x, y, z, rim) {
      let fx = (x + HW) / (2 * HW) * (NXV - 1), fy = y / C * (NYV - 1), fz = (z - ZV0) / (ZV1 - ZV0) * (NZV - 1);
      fx = fx < 0 ? 0 : fx > NXV - 1.001 ? NXV - 1.001 : fx; fy = fy < 0 ? 0 : fy > NYV - 1.001 ? NYV - 1.001 : fy; fz = fz < 0 ? 0 : fz > NZV - 1.001 ? NZV - 1.001 : fz;
      const ix = fx | 0, iy = fy | 0, iz = fz | 0, ax = fx - ix, ay = fy - iy, az = fz - iz;
      const v000 = ((iz * NYV + iy) * NXV + ix) * 3, dx = 3, dy = NXV * 3, dz = NXV * NYV * 3;
      const w000 = (1 - ax) * (1 - ay) * (1 - az), w100 = ax * (1 - ay) * (1 - az), w010 = (1 - ax) * ay * (1 - az), w110 = ax * ay * (1 - az);
      const w001 = (1 - ax) * (1 - ay) * az, w101 = ax * (1 - ay) * az, w011 = (1 - ax) * ay * az, w111 = ax * ay * az;
      for (let c = 0; c < 3; c++) {
        const v = v000 + c;
        L[c] = VB[v] * w000 + VB[v + dx] * w100 + VB[v + dy] * w010 + VB[v + dx + dy] * w110 + VB[v + dz] * w001 + VB[v + dx + dz] * w101 + VB[v + dy + dz] * w011 + VB[v + dx + dy + dz] * w111;
        if (rim) LRIM[c] = VR[v] * w000 + VR[v + dx] * w100 + VR[v + dy] * w010 + VR[v + dx + dy] * w110 + VR[v + dz] * w001 + VR[v + dx + dz] * w101 + VR[v + dy + dz] * w011 + VR[v + dx + dy + dz] * w111;
      }
    }
    function layer(lit, glow) {
      const t0 = performance.now();
      volume();
      // 1. from the bottom up: the floor under each run of drawn pixels
      inRun.fill(0);
      for (let py = H - 1; py >= 0; py--) {
        const zf = ZFL[py];
        for (let px = 0, q = py * W; px < W; px++, q++) {
          if (lit[q * 4 + 3] > 8) { if (!inRun[px]) { inRun[px] = 1; runZ[px] = zf; } DZ[q] = runZ[px]; }
          else inRun[px] = 0;
        }
      }
      // 2. from the top down: the ceiling over each run; then light each pixel where it stands. The light changes
      // slowly, so a column keeps what it found for the next few rows at the same depth.
      inRun.fill(0); cacheB.fill(-1);
      const amb = dark ? .07 : .13 + fill * 1.2, buf_ = buf, lin_ = LIN, dz = DZ, hz = HZ, xc = XC;
      for (let py = 0; py < H; py++) {
        const zc = ZCE[py], yr = (py + .5 - CY) / F, blk = py >> 2;
        for (let px = 0, q = py * W; px < W; px++, q++) {
          const k = q * 4, a = lit[k + 3];
          if (a <= 8) { inRun[px] = 0; continue; }
          if (!inRun[px]) { inRun[px] = 1; runZ[px] = zc; }
          let z = dz[q]; if (runZ[px] < z) z = runZ[px]; if (hz[q] < z) z = hz[q];
          if (z > 1e8) z = ZV1;
          const x = xc[px] * z, y = E - yr * z, c3 = px * 3;
          const edge = py === 0 || lit[k - W * 4 + 3] <= 8 || px === 0 || lit[k - 1] <= 8 || px === W - 1 || lit[k + 7] <= 8;
          if (edge) { sample(x, y, z, true); cacheB[px] = -1; }
          else if (cacheB[px] !== blk || cacheZ[px] !== z) { sample(x, y, z, false); cacheB[px] = blk; cacheZ[px] = z; cacheL[c3] = L[0]; cacheL[c3 + 1] = L[1]; cacheL[c3 + 2] = L[2]; }
          else { L[0] = cacheL[c3]; L[1] = cacheL[c3 + 1]; L[2] = cacheL[c3 + 2]; }
          const f = z <= FOG0 ? 1 : fogOf(z), al = a / 255, i = q * 3;
          let r = lin_[lit[k]] * (L[0] * 2.2 + amb), g = lin_[lit[k + 1]] * (L[1] * 2.2 + amb), b = lin_[lit[k + 2]] * (L[2] * 2.2 + amb * 1.15);
          if (edge) { r += Math.min(.6, LRIM[0] * 1.5) * .5; g += Math.min(.6, LRIM[1] * 1.5) * .5; b += Math.min(.6, LRIM[2] * 1.5) * .5; }
          buf_[i] = buf_[i] * (1 - al) + r * f * al; buf_[i + 1] = buf_[i + 1] * (1 - al) + g * f * al; buf_[i + 2] = buf_[i + 2] * (1 - al) + b * f * al;
        }
      }
      // 3. the glow, as it is, a little over full so the brightest of it blooms
      if (glow) for (let q = 0, k = 3; q < N; q++, k += 4) {
        const a = glow[k]; if (!a) continue;
        const al = a / 255, i = q * 3;
        buf[i] = buf[i] * (1 - al) + LIN[glow[k - 3]] * 1.25 * al; buf[i + 1] = buf[i + 1] * (1 - al) + LIN[glow[k - 2]] * 1.25 * al; buf[i + 2] = buf[i + 2] * (1 - al) + LIN[glow[k - 1]] * 1.25 * al;
      }
      if (OPEN && glow) {
        const waterline = CY + E * F / (set.reflectZ || 12);
        for (let py = Math.ceil(waterline); py < H; py++) for (let px = 0; px < W; px++) {
          const q = py * W + px;
          if (S[q] !== 1 || FK[q] || lit[q * 4 + 3] > 8) continue;
          const yy = Math.round(2 * waterline - py + Math.sin(px * .2 + py * .7) * 2);
          if (yy < 0 || yy >= H) continue;
          const k = (yy * W + px) * 4, a = glow[k + 3] / 255 * .25, i = q * 3;
          buf[i] += LIN[glow[k]] * a; buf[i + 1] += LIN[glow[k + 1]] * a; buf[i + 2] += LIN[glow[k + 2]] * a;
        }
      }
      timings.layer += performance.now() - t0;
    }

    // ---------- finishing: bloom, tone, vignette, dither, palette; onto ctx at (dx, dy) ----------
    function present(ctx, dx, dy) {
      const t0 = performance.now();
      const bf = buf, bA = bloomA, bB = bloomB, nz = BNZ, vig = VIG, td = TD, lut = LUT, pal = PAL32, o32 = out32, bx0 = BX0, bax = BAX, bayi = BAYI;
      // bloom: what's over full brightness, gathered at a quarter size, blurred twice each way (running sums)
      bA.fill(0);
      for (let py = 0; py < QH * 4; py++) {
        const row = (py >> 2) * QW;
        for (let px = 0, i = py * W * 3; px < QW * 4; px++, i += 3) {
          const r = bf[i], g = bf[i + 1], b = bf[i + 2];
          if (r <= 1 && g <= 1 && b <= 1) continue;
          const j = (row + (px >> 2)) * 3;
          if (r > 1) bA[j] += (r - 1) * .0625; if (g > 1) bA[j + 1] += (g - 1) * .0625; if (b > 1) bA[j + 2] += (b - 1) * .0625;
        }
      }
      for (let pass = 0; pass < 2; pass++) {
        blur(bA, bB, QW, QH, 3, QW * 3);   // across
        blur(bB, bA, QH, QW, QW * 3, 3);   // down
      }
      // which quarter cells have bloom in any of the four around them
      for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) { const k = (y * QW + x) * 3; nz[y * QW + x] = bA[k] + bA[k + 1] + bA[k + 2] > .002 ? 1 : 0; }
      for (let y = 0; y < QH; y++) for (let x = 0; x < QW; x++) { const c = y * QW + x; if (!nz[c]) { const r = x + 1 < QW, d = y + 1 < QH; if ((r && nz[c + 1] & 1) || (d && nz[c + QW] & 1) || (r && d && nz[c + QW + 1] & 1)) nz[c] = 2; } }
      // tone, vignette, dither, palette
      for (let py = 0; py < H; py++) {
        const fy = Math.min(QH - 1.001, Math.max(0, py / 4 - .5)), y0 = fy | 0, ay = fy - y0, drow = (py & 3) * 4, crow = y0 * QW;
        for (let px = 0, q = py * W, i = q * 3; px < W; px++, q++, i += 3) {
          const v = vig[q], dOff = bayi[drow + (px & 3)];
          let r = bf[i], g = bf[i + 1], b = bf[i + 2];
          const c00 = crow + bx0[px];
          if (nz[c00]) {
            const ax = bax[px], j00 = c00 * 3, j01 = j00 + 3, j10 = j00 + QW * 3, j11 = j10 + 3;
            const w00 = (1 - ax) * (1 - ay) * .7, w01 = ax * (1 - ay) * .7, w10 = (1 - ax) * ay * .7, w11 = ax * ay * .7;
            r += bA[j00] * w00 + bA[j01] * w01 + bA[j10] * w10 + bA[j11] * w11;
            g += bA[j00 + 1] * w00 + bA[j01 + 1] * w01 + bA[j10 + 1] * w10 + bA[j11 + 1] * w11;
            b += bA[j00 + 2] * w00 + bA[j01 + 2] * w01 + bA[j10 + 2] * w10 + bA[j11 + 2] * w11;
          }
          r *= v; g *= v; b *= v;
          const ri = td[dOff + (r <= 0 ? 0 : r >= 4 ? 1024 : (r * 256) | 0)], gi = td[dOff + (g <= 0 ? 0 : g >= 4 ? 1024 : (g * 256) | 0)], bi = td[dOff + (b <= 0 ? 0 : b >= 4 ? 1024 : (b * 256) | 0)];
          o32[q] = pal[lut[(ri << 10) | (gi << 5) | bi]];
        }
      }
      ctx.putImageData(img, dx || 0, dy || 0);
      timings.post += performance.now() - t0;
    }
    // a 5-wide box blur of a three-channel grid, from a into b: n lines of len cells, cells step apart along a line and
    // lines lineStep apart; the ends repeat the edge cell
    function blur(a, b, n, len, step, lineStep) {
      for (let l = 0; l < n; l++) {
        const base = l * lineStep;
        for (let c = 0; c < 3; c++) {
          const o = base + c, last = o + (len - 1) * step;
          let sum = a[o] * 3 + a[o + step] + a[o + 2 * step];
          for (let k = 0; k < len; k++) {
            b[o + k * step] = sum * .2;
            const add = k + 3 < len ? a[o + (k + 3) * step] : a[last], sub = k - 2 >= 0 ? a[o + (k - 2) * step] : a[o];
            sum += add - sub;
          }
        }
      }
    }
    // the fast textures (surfaces()) against material(), for a view at time t: the biggest difference found, and where
    function check(t, v) {
      T = t; setView(v); surfaces(t);
      let worst = 0, at = -1;
      for (let q = 0; q < N; q++) {
        const s = S[q]; if (!s) continue;
        material(s, HX[q], HY[q], HZ[q], t);
        const m = [aR, aG, aB, eR, eG, eB, s === 1 ? rf * RFD[q] : 0], f = [alb[q * 3], alb[q * 3 + 1], alb[q * 3 + 2], buf[q * 3], buf[q * 3 + 1], buf[q * 3 + 2], shine[q]];
        for (let k = 0; k < 7; k++) { const d = Math.abs(f[k] - m[k]); if (d > worst) { worst = d; at = q; } }
      }
      return { worst, at, s: at >= 0 ? S[at] : 0 };
    }
    return { W, H, F, CX, CY, E, C, HW, frame, light, layer, present, project, lightAt, check, timings };
  }

  return { create, lin };
})();
