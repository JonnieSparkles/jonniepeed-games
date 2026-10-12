(() => {
'use strict';
const A = UnrugArt;
const { txt, otxt, textWidth } = A;
const W = 240, H = 135, PIC = 2, PW = W * PIC, PH = H * PIC;

/* ---------- the projection, as in game.js; the roof has no ceiling, so heights are in the hall's units ---------- */
const VX = 120, HY = 52, FN = 131, CN = -12, HW = 112, ZN = -.07;
const sc = z => 1 / (1 + 2 * z);
const PX = (u, z) => VX + u * HW * sc(z);
const FY = z => HY + (FN - HY) * sc(z);
const CY = z => HY - (HY - CN) * sc(z);
const YH = (z, h) => FY(z) - h * (FY(z) - CY(z));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;

/* ---------- drawing on half units ---------- */
const hr = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * 2) / 2, Math.round(y * 2) / 2, Math.max(.5, Math.round(w * 2) / 2), Math.max(.5, Math.round(h * 2) / 2)); };
function poly(g, c, pts) { g.fillStyle = c; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); }
function ln(g, x0, y0, x1, y1, c, w = .5) {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
  g.fillStyle = c;
  for (let i = 0; i <= n; i++) { const k = i / n; g.fillRect(Math.round((x0 + (x1 - x0) * k) * 2) / 2 - (w > .5 ? w / 2 : 0), Math.round((y0 + (y1 - y0) * k) * 2) / 2 - (w > .5 ? w / 2 : 0), w, w); }
}
function disc(g, x, y, r, c) { g.fillStyle = c; for (let dy = -r; dy <= r; dy += .5) { const w = Math.sqrt(Math.max(0, r * r - dy * dy)); g.fillRect(Math.round((x - w) * 2) / 2, Math.round((y + dy) * 2) / 2, Math.round(w * 4) / 2 + .5, .5); } }
function oval(g, x, y, rx, ry, c) { g.fillStyle = c; for (let dy = -ry; dy <= ry; dy += .5) { const w = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)); g.fillRect(Math.round((x - w) * 2) / 2, Math.round((y + dy) * 2) / 2, Math.round(w * 4) / 2 + .5, .5); } }
const alpha = (g, a, f) => { g.save(); g.globalAlpha = a; f(); g.restore(); };
const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/* ---------- the finish: the renderer's 64 colours, light, bloom, the wet roof's reflection, dither ---------- */
const PAL = ['08070c', '110f18', '1a1824', '24222f', '2f2d3b', '3b3a48', '4b4a58', '5e5e6c', '76788a', '9496a8', 'b4b6c4', 'd2d4dc', 'ecedf0', 'ffffff', '1c1614', '2c2420', '3e332c', '54463c', '6e5e50', '8c7a68', 'b0a088', 'd8c8a8', 'f4e6c4', 'fff6e0', '3a2014', '5a3420', '7a4a2a', '9e6638', '1e080c', '340e12', '521418', '761c1e', '9c2622', 'c43428', 'e44a34', 'ff6e4a', '5c1430', '9a2050', 'e03a78', 'ff8ab4', '6a3410', '9a5214', 'c87818', 'e8a028', 'f8cc50', 'fff09a', '0a2418', '124a2c', '1f7a44', '3cba6a', '9cf0b4', '0a1a2c', '10304e', '1a5076', '2a7aa6', '46aad4', '86d6f0', 'c8f4ff', '1e1430', '2e2048', '44305e', '5e4478', '000000', '0c1020']
  .map(h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4), 16)]);
const LUT = new Uint8Array(32768);
for (let r = 0; r < 32; r++) for (let g = 0; g < 32; g++) for (let b = 0; b < 32; b++) {
  const R = r * 8.2, G = g * 8.2, B = b * 8.2; let best = 0, bd = 1e9;
  for (let i = 0; i < PAL.length; i++) { const p = PAL[i], dr = p[0] - R, dg = p[1] - G, db = p[2] - B, d = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (d < bd) { bd = d; best = i; } }
  LUT[(r << 10) | (g << 5) | b] = best;
}
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v / 16 - .47) * .032 * 31);
const TONE = v => Math.pow(1 - Math.exp(-v * 1.6), .8) * 31;
const LIN = new Float32Array(256); for (let i = 0; i < 256; i++) LIN[i] = Math.pow(i / 255, 1.6);
const mk = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.scale(PIC, PIC); return [c, g]; };
const hex = c => { const n = parseInt(c.slice(1), 16); return [LIN[n >> 16], LIN[(n >> 8) & 255], LIN[n & 255]]; };

let U = null, UG = null, MK = null;   // MK: where things stand on the roof, which hides its reflection   // the HUD and the talk: drawn flat over the lit picture, never lit or reflected
function finish(out, litC, glowC, o) {
  const L = litC.getContext('2d').getImageData(0, 0, PW, PH).data, G = glowC.getContext('2d').getImageData(0, 0, PW, PH).data;
  const MD = o.mask.getContext('2d').getImageData(0, 0, PW, PH).data;
  const UL = o.ui[0].getContext('2d').getImageData(0, 0, PW, PH).data, UGD = o.ui[1].getContext('2d').getImageData(0, 0, PW, PH).data;
  // bloom: the glow, small and soft
  const bc = document.createElement('canvas'); bc.width = PW / 4; bc.height = PH / 4;
  const bg = bc.getContext('2d'); bg.filter = 'blur(2.5px)'; bg.drawImage(glowC, 0, 0, bc.width, bc.height); bg.drawImage(o.ui[1], 0, 0, bc.width, bc.height);
  const BL = bg.getImageData(0, 0, bc.width, bc.height).data, bw = bc.width;
  const lights = (o.lights || []).map(l => ({ x: l.x * PIC, y: l.y * PIC, r: l.r * PIC, c: hex(l.c), k: l.k }));
  const amb = hex(o.amb || '#8a8aa8'), flash = o.flash || 0, refl = o.refl == null ? FY(1) * PIC : o.refl * PIC;
  const og = out.getContext('2d'), img = og.createImageData(PW, PH), D = img.data;
  const fy = (o.floorY == null ? HY : o.floorY) * PIC;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
    const i = (y * PW + x) * 4;
    let lr = amb[0] + flash, lg = amb[1] + flash, lb = amb[2] + flash * 1.1;
    for (const l of lights) { const dx = x - l.x, dy = (y - l.y) * 1.4, d = dx * dx + dy * dy; if (d < l.r * l.r) { const f = l.k * (1 - Math.sqrt(d) / l.r) ** 2; lr += l.c[0] * f; lg += l.c[1] * f; lb += l.c[2] * f; } }
    let r = LIN[L[i]] * lr, g = LIN[L[i + 1]] * lg, b = LIN[L[i + 2]] * lb;
    r += LIN[G[i]] * 1.3; g += LIN[G[i + 1]] * 1.3; b += LIN[G[i + 2]] * 1.3;
    const bi = ((y >> 2) * bw + (x >> 2)) * 4;
    r += LIN[BL[bi]] * .9; g += LIN[BL[bi + 1]] * .9; b += LIN[BL[bi + 2]] * .9;
    // the wet roof: the glow, mirrored about the far edge and broken up by the rain
    if (y > refl && y > fy && !MD[i + 3]) {
      const my = Math.round(2 * refl - y + Math.sin(x * .21 + y * .7) * 2);
      if (my > 0) { const j = (my * PW + x) * 4, k = .32 * Math.min(1, (y - refl) / 30); r += LIN[G[j]] * k; g += LIN[G[j + 1]] * k; b += LIN[G[j + 2]] * k; }
    }
    const ua = UL[i + 3] / 255;
    if (ua) { r = r * (1 - ua) + LIN[UL[i]] * ua * .95; g = g * (1 - ua) + LIN[UL[i + 1]] * ua * .95; b = b * (1 - ua) + LIN[UL[i + 2]] * ua * .95; }
    if (UGD[i + 3]) { r += LIN[UGD[i]]; g += LIN[UGD[i + 1]]; b += LIN[UGD[i + 2]]; }
    // vignette
    const vx = x / PW - .5, vy = y / PH - .5, v = 1 - (vx * vx + vy * vy) * .9;
    const d = BAY[(y & 3) * 4 + (x & 3)];
    const R5 = clamp(Math.round(TONE(r * v) + d), 0, 31), G5 = clamp(Math.round(TONE(g * v) + d), 0, 31), B5 = clamp(Math.round(TONE(b * v) + d), 0, 31);
    const p = PAL[LUT[(R5 << 10) | (G5 << 5) | B5]];
    D[i] = p[0]; D[i + 1] = p[1]; D[i + 2] = p[2]; D[i + 3] = 255;
  }
  og.putImageData(img, 0, 0);
}

/* ---------- the roof ---------- */
function sky(L, G, o) {
  const f = o.flash || 0;
  const cols = f > .5 ? ['#3a3660', '#46406e', '#524a78', '#5e5482', '#6a5e8a', '#766892'] : ['#07060f', '#0b0916', '#100c1d', '#151024', '#1b132b', '#221732'];
  cols.forEach((c, i) => hr(L, 0, i * HY / 6, W, HY / 6 + .5, c));
  const R = rng(7);
  for (let k = 0; k < 9; k++) {
    const x = R() * 280 - 30, y = 2 + R() * 36, w = 40 + R() * 50;
    oval(L, x, y, w / 2, 4 + R() * 3, f > .5 ? '#2a2648' : '#0d0b16');
    hr(L, x - w / 3, y + 3, w * .66, 1, f > .5 ? '#8a80b0' : '#1e1830');
  }
  if (o.clear) {     // the storm breaks: a band of dawn under the clouds
    for (let i = 0; i < 6; i++) hr(L, 0, HY - 10 + i * 2, W, 2, ['#2a1c3a', '#4a2a44', '#7a3c40', '#b05a3c', '#e08a4a', '#f8cc70'][i]);
    hr(G, 0, HY - 3, W, 3, '#5a2a10');
  }
  if (o.bolt) {
    const R2 = rng(o.bolt); let x = 30 + R2() * 180, y = 0;
    while (y < 40) { const nx = x + (R2() - .5) * 14, ny = y + 3 + R2() * 4; ln(G, x, y, nx, ny, '#f4f0ff'); ln(L, x, y, nx, ny, '#ffffff'); if (R2() < .2) ln(G, nx, ny, nx + (R2() - .5) * 20, ny + 8, '#8a88d0'); x = nx; y = ny; }
  }
}
// the city far below, past the roof's far corners
function city(L, G, o) {
  const R = rng(3);
  for (let x = 0; x < W; x += 3 + R() * 6 | 0) {
    const h = 6 + R() * 22, w = 4 + R() * 9;
    hr(L, x, HY - h + 26, w, h, o.flash ? '#24203a' : '#0e0c16');
    for (let k = 0; k < h / 3; k++) if (R() < .35) hr(G, x + 1 + (R() * (w - 2) | 0), HY - h + 27 + k * 3, .5, .5, R() < .7 ? '#7a5a20' : '#3a5a7a');
  }
}
function floor(L, G, o) {
  const f = o.flash || 0;
  poly(L, f ? '#4a4658' : '#211e28', [[PX(-1, ZN), FY(ZN)], [PX(1, ZN), FY(ZN)], [PX(1, 1.2), FY(1.2)], [PX(-1, 1.2), FY(1.2)]]);
  for (let k = 0; k < 16; k++) { const z = k / 12, y = FY(z); hr(L, PX(-1, z), y, PX(1, z) - PX(-1, z), .5, '#18161e'); }
  for (const u of [-.66, -.33, 0, .33, .66]) ln(L, PX(u, ZN), FY(ZN), PX(u, 1.2), FY(1.2), '#1a1820');
  // puddles: darker, where the reflections show
  const R = rng(11);
  for (let i = 0; i < 9; i++) { const u = R() * 1.6 - .8, z = R() * 1.0; if (Math.abs(u) < .32 && o.runner) continue; oval(L, PX(u, z), FY(z), 16 * sc(z) * (1 + R()), 3 * sc(z), '#121420'); }
  if (o.runner) {   // the rug p(Loom) is weaving runs out of it, down the roof, to his feet
    const z1 = 1.0;
    poly(L, '#5a1614', [[PX(-.3, ZN), FY(ZN)], [PX(.3, ZN), FY(ZN)], [PX(.3, z1), FY(z1)], [PX(-.3, z1), FY(z1)]]);
    for (const s of [-1, 1]) poly(L, '#a8782a', [[PX(s * .27, ZN), FY(ZN)], [PX(s * .3, ZN), FY(ZN)], [PX(s * .3, z1), FY(z1)], [PX(s * .27, z1), FY(z1)]]);
    for (let k = 0; k < 12; k++) { const z = k / 12; hr(L, PX(-.3, z), FY(z), PX(.3, z) - PX(-.3, z), .5, '#4a1210'); }
  }
  for (const s of [-1, 1]) {   // the parapet
    const z0 = ZN, z1 = 1.2, h = .09;
    poly(L, '#34303e', [[PX(s, z0), YH(z0, h)], [PX(s, z1), YH(z1, h)], [PX(s, z1), FY(z1)], [PX(s, z0), FY(z0)]]);
    ln(L, PX(s, z0), YH(z0, h), PX(s, z1), YH(z1, h), f ? '#c8c4e0' : '#56506a', 1);
  }
}
// rooftop clutter for the walk: units, vents, a water tank, the back of the RUGCO sign
function box3(L, u, z, w, d, h, top, front, side) {
  const x0 = PX(u - w / 2, z), x1 = PX(u + w / 2, z), y0 = FY(z), yt = YH(z, h);
  const xb0 = PX(u - w / 2, z + d), xb1 = PX(u + w / 2, z + d), ytb = YH(z + d, h);
  const sx = u > 0 ? x0 : x1, sxb = u > 0 ? xb0 : xb1;
  poly(L, side, [[sx, yt], [sxb, ytb], [sxb, FY(z + d)], [sx, y0]]);
  poly(L, top, [[x0, yt], [x1, yt], [xb1, ytb], [xb0, ytb]]);
  hr(L, x0, yt, x1 - x0, y0 - yt, front);
  return { x0, x1, yt, y0 };
}
function clutter(L, G, o) {
  const f = o.flash ? 1 : 0;
  const tank = (u, z) => {
    const x = PX(u, z), s = sc(z), y0 = FY(z);
    for (const lx of [-9, 9]) hr(L, x + lx * s, y0 - 26 * s, 1.5 * s, 26 * s, '#16141c');
    ln(L, x - 9 * s, y0 - 4 * s, x + 9 * s, y0 - 20 * s, '#16141c', .5); ln(L, x + 9 * s, y0 - 4 * s, x - 9 * s, y0 - 20 * s, '#16141c', .5);
    hr(L, x - 13 * s, y0 - 56 * s, 26 * s, 30 * s, f ? '#4a4258' : '#1a1720');
    poly(L, f ? '#565068' : '#1e1a26', [[x - 14 * s, y0 - 56 * s], [x + 14 * s, y0 - 56 * s], [x, y0 - 68 * s]]);
    for (let k = 0; k < 4; k++) hr(L, x - 13 * s, y0 - 52 * s + k * 7 * s, 26 * s, .5, '#121016');
  };
  tank(-1.35, .55);
  const b = box3(L, -.72, .22, .34, .16, .16, '#3a3644', '#2a2632', '#201e28');   // an air-con unit
  disc(L, (b.x0 + b.x1) / 2, (b.yt + b.y0) / 2, (b.x1 - b.x0) * .28, '#16141c');
  for (let k = 0; k < 4; k++) ln(L, (b.x0 + b.x1) / 2 - (b.x1 - b.x0) * .26, (b.yt + b.y0) / 2 - 3 + k * 2, (b.x0 + b.x1) / 2 + (b.x1 - b.x0) * .26, (b.yt + b.y0) / 2 - 3 + k * 2, '#2e2a36');
  hr(G, b.x1 - 3, b.yt + 2, 1, 1, '#2a8a3a');
  box3(L, .74, .46, .26, .12, .12, '#363240', '#26232e', '#1e1c26');
  for (const [u, z] of [[.58, .12], [-.55, .62], [.62, .8]]) {   // vent pipes with hoods
    const x = PX(u, z), s = sc(z), y = FY(z);
    hr(L, x - 2.5 * s, y - 14 * s, 5 * s, 14 * s, '#2c2834'); hr(L, x - 4.5 * s, y - 17 * s, 9 * s, 3 * s, '#3a3644');
  }
  // the RUGCO sign, from behind: its frame, and its letters' glow spilling over the top
  if (o.sign) {
    const x0 = PX(.55, .36), x1 = PX(1.25, .36), y0 = FY(.36) - 2, yt = y0 - 30 * sc(.36);
    for (let x = x0 + 3; x < x1; x += 10) hr(L, x, yt, 1, y0 - yt, '#16141c');
    ln(L, x0, yt + 4, x1, yt + 4, '#16141c', 1); ln(L, x0, y0 - 6, x1, y0 - 6, '#16141c', 1);
    for (let x = x0; x < x1; x += 2) hr(G, x, yt - 1 - (x % 3 ? 0 : .5), 1, 1, '#7a1a3a');
    hr(G, x0, yt - .5, x1 - x0, .5, '#c42858');
  }
}
function rain(L, G, t, lean = .25, n = 70) {
  const R = rng(5 + (t * 10 | 0));
  for (let i = 0; i < n; i++) {
    const x = R() * (W + 40) - 20, y = R() * H, l = 3 + R() * 4;
    ln(L, x, y, x - lean * l, y + l, '#8a94b8'); if (R() < .3) ln(G, x, y, x - lean * l, y + l, '#1a1e2c');
  }
}

/* ---------- p(Loom) ---------- */
const LM = { x0: 52, x1: 188, top: 4, beam: 12, rail: 47, cloth: 60, base: FY(1) };
const SPOOLS = [80, 120, 160];
function loom(L, G, o) {
  const st = o.state || 'awake', sil = st === 'sil', dark = st === 'dark';
  const iron = sil ? '#08070c' : dark ? '#0b0a10' : '#2a2632', ironHi = sil ? '#08070c' : dark ? '#16141c' : '#46404e', ironLo = sil ? '#08070c' : '#18161e';
  const shake = o.shake || 0, sx = shake ? Math.sin(shake * 13) * 1.5 : 0;
  const X = x => x + sx;
  // threads up into the storm: it's tied into the sky
  for (let k = 0; k < 9; k++) { const x = X(LM.x0 + 10 + k * 15); ln(L, x, LM.top, x + (k - 4) * 6, -2, sil ? '#08070c' : '#2a2436'); }
  // posts and the top beam
  for (const x of [LM.x0, LM.x1 - 12]) {
    hr(L, X(x), LM.top, 12, LM.base - LM.top + 2, iron); hr(L, X(x) + 1, LM.top, 2, LM.base - LM.top, ironHi); hr(L, X(x) + 10, LM.top, 2, LM.base - LM.top, ironLo);
    if (!sil && !dark) for (let y = LM.top + 6; y < LM.base; y += 8) { hr(L, X(x) + 5, y, 1, 1, '#6a6274'); hr(L, X(x) + 7, y + 4, 1, 1, '#6a6274'); }
    hr(L, X(x) - 3, LM.base - 4, 18, 6, ironLo);
  }
  hr(L, X(LM.x0), LM.top, LM.x1 - LM.x0, LM.beam - LM.top, iron); hr(L, X(LM.x0), LM.top, LM.x1 - LM.x0, 1, ironHi);
  if (sil && o.rim) { hr(L, X(LM.x0), LM.top - .5, LM.x1 - LM.x0, .5, '#c8c4f0'); for (const x of [LM.x0, LM.x1]) hr(L, X(x) - .5, LM.top, .5, LM.base - LM.top, '#9a96c8'); }
  // the spools: its three reels of thread, the boss's health
  const broke = o.broke || 0;
  SPOOLS.forEach((cx, i) => {
    const x = X(cx), y = LM.beam - 1, gone = i < broke;
    hr(L, x - 13, y - 9, 2, 12, sil ? '#08070c' : '#55505e'); hr(L, x + 11, y - 9, 2, 12, sil ? '#08070c' : '#55505e');
    if (gone) { hr(L, x - 11, y - 5, 22, 3, sil ? '#08070c' : '#1a1820'); for (let k = 0; k < 5; k++) ln(L, x - 8 + k * 4, y - 2, x - 10 + k * 4 + (k % 2) * 4, y + 6 + k % 3 * 3, '#8a8070'); return; }
    hr(L, x - 11, y - 8, 22, 9, sil ? '#08070c' : dark ? '#1a1816' : '#b8ac90');
    if (!sil) for (let k = 0; k < 9; k += 2) hr(L, x - 11, y - 8 + k, 22, .5, dark ? '#2a2622' : '#e2d6b8');
    if (!sil && !dark) { hr(L, x - 11, y - 8, 22, 1, '#f4ead0'); hr(L, x - 11, y, 22, 1, '#7a705c'); }
    if (o.hitSpool === i) { hr(G, x - 12, y - 9, 24, 11, '#ffffff'); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; ln(G, x + Math.cos(a) * 8, y - 4 + Math.sin(a) * 4, x + Math.cos(a) * 16, y - 4 + Math.sin(a) * 9, '#ffd44a'); } }
    if (o.snap === i) { for (let k = 0; k < 7; k++) { const a = -.4 - k * .35; ln(L, x, y - 4, x + Math.cos(a) * (20 + k * 3), y - 4 + Math.sin(a) * (14 + k * 2), '#e2d6b8'); } hr(G, x - 3, y - 6, 6, 4, '#fff0aa'); }
  });
  // the warp: thread from the spools down to the cloth
  if (!sil) {
    for (let x = LM.x0 + 14; x < LM.x1 - 13; x += 2.5) {
      const spool = SPOOLS.findIndex(c => Math.abs(c - x) < 24), cut = o.snapAll || (spool >= 0 && spool < broke && !o.keepWarp);
      const c = dark ? '#2a2630' : '#8a8070';
      if (cut) { hr(L, X(x), LM.beam, .5, 3 + (x * 7) % 5, c); hr(L, X(x), LM.cloth - 6 + (x * 3) % 4, .5, 6, c); }
      else hr(L, X(x), LM.beam, .5, LM.cloth - LM.beam, c);
    }
  }
  // trapped souls hang in the warp, lit faintly
  const n = o.souls || 0, R = rng(21);
  for (let i = 0; i < n; i++) {
    const x = X(LM.x0 + 18 + R() * (LM.x1 - LM.x0 - 36)), y = LM.beam + 4 + R() * (LM.rail - LM.beam - 10), img = A.GHOST, w = A.uw(img) * .6, h = A.uh(img) * .6;
    if (sil) { alpha(L, .9, () => hr(L, x - w / 3, y - h / 3, w * .66, h * .66, '#08070c')); continue; }
    alpha(L, dark ? .16 : .8, () => L.drawImage(img, x - w / 2, y - h / 2, w, h));
    alpha(G, o.soulGlow || (dark ? .12 : .3), () => L === G ? 0 : G.drawImage(img, x - w / 2, y - h / 2, w, h));
  }
  // the shuttle rail
  hr(L, X(LM.x0 + 12), LM.rail - 2, LM.x1 - LM.x0 - 24, 4, sil ? '#08070c' : '#141218'); if (!sil) hr(L, X(LM.x0 + 12), LM.rail - 2, LM.x1 - LM.x0 - 24, .5, '#5a4a40');
  // the cloth: the rug it's weaving, which runs out onto the roof
  if (!sil) {
    hr(L, X(LM.x0 + 12), LM.cloth, LM.x1 - LM.x0 - 24, LM.base - LM.cloth, dark ? '#2a0c0c' : '#6a1a18');
    for (let y = LM.cloth + 3; y < LM.base - 1; y += 4) hr(L, X(LM.x0 + 12), y, LM.x1 - LM.x0 - 24, .5, dark ? '#4a3418' : '#a8782a');
    hr(L, X(LM.x0 + 12), LM.cloth, LM.x1 - LM.x0 - 24, 1, '#1a0a0a');
  }
  // the eye
  const ex = X(o.eyeX == null ? 120 : o.eyeX), ey = LM.rail;
  hr(L, ex - 14, ey - 4, 28, 8, sil ? '#08070c' : '#1e1c24');           // the shuttle it rides in
  hr(L, ex - 14, ey - 4, 28, .5, sil || dark ? '#08070c' : '#5a5462');
  disc(L, ex, ey, 9, sil ? '#08070c' : '#141218'); disc(L, ex, ey, 8, sil ? '#08070c' : dark ? '#16141c' : '#3a3644');
  const eye = o.eye || 'open';
  if (eye === 'shut') { if (!sil) { ln(L, ex - 6, ey, ex + 6, ey, '#5a2a10', 1); ln(G, ex - 5, ey, ex + 5, ey, '#3a1404'); } return; }
  if (eye === 'dead') { disc(L, ex, ey, 6, '#2a2026'); for (const [a, b] of [[-5, -4], [3, 5], [-2, 6]]) ln(L, ex, ey, ex + a, ey + b, '#0a0808'); return; }
  const iris = eye === 'hot' ? '#ffffff' : eye === 'red' ? '#ff4030' : '#ff9628';
  disc(L, ex, ey, 6.5, '#7a2a10'); disc(L, ex, ey, 5.5, iris); disc(G, ex, ey, 5.5, eye === 'hot' ? '#fff0d0' : eye === 'red' ? '#c42010' : '#d86010');
  if (eye !== 'hot') { const lx = clamp(((o.lookX == null ? 120 : o.lookX) - ex) / 20, -2.5, 2.5); disc(L, ex + lx, ey + 1, 2.5, '#140c08'); disc(G, ex + lx, ey + 1, 2.5, '#000000'); hr(L, ex + lx - 2, ey - 2, 1, 1, '#fff6e0'); }
  if (o.cracks) for (let k = 0; k < o.cracks; k++) { const a = k * 2.1; ln(L, ex, ey, ex + Math.cos(a) * 9, ey + Math.sin(a) * 9, '#fff6e0'); ln(G, ex, ey, ex + Math.cos(a) * 9, ey + Math.sin(a) * 9, '#ffd44a'); }
  if (eye === 'hot') { disc(G, ex, ey, 10, '#ff7a3a'); disc(G, ex, ey, 6, '#ffffff'); }
}
const eyeLight = (o, k = 1) => ({ x: o.eyeX == null ? 120 : o.eyeX, y: LM.rail, r: 230, c: o.eye === 'red' ? '#ff3020' : '#ff8a28', k: 1.1 * k });

/* ---------- Unruggabull, carpshits, souls, shots ---------- */
function bull(L, G, pose, u, z, o = {}) {
  const s = sc(z) * (o.big || 1), k = s * A.BULL_K, x = PX(u, z) + (o.dx || 0), feet = YH(z, o.h || 0);
  const img = A.POSES[pose] || A.POSES.stand;
  alpha(L, .5, () => oval(L, x, FY(z), 9 * s, 1.5 * s, '#06050a'));
  if (o.tilt) { L.save(); L.translate(x, feet); L.rotate(o.tilt); L.drawImage(img, -A.POSE_FEET.x * k, -A.POSE_FEET.y * k, A.POSE_W * k, A.POSE_H * k); L.restore(); }
  else L.drawImage(img, x - A.POSE_FEET.x * k, feet - A.POSE_FEET.y * k, A.POSE_W * k, A.POSE_H * k);
  MK.drawImage(img, x - A.POSE_FEET.x * k - 2, feet - A.POSE_FEET.y * k, A.POSE_W * k + 4, A.POSE_H * k + 1);
  const rim = o.rim === undefined ? '#ff9a50' : o.rim;
  if (rim) {   // a thin rim where the light behind him catches him: his own shape, tinted, peeking out
    const t = tint(img, rim);
    alpha(G, o.rim === undefined ? .45 : .7, () => { G.drawImage(t, x - A.POSE_FEET.x * k, feet - A.POSE_FEET.y * k - .5, A.POSE_W * k, A.POSE_H * k); });
    G.globalCompositeOperation = 'destination-out'; G.drawImage(img, x - A.POSE_FEET.x * k, feet - A.POSE_FEET.y * k + .5, A.POSE_W * k, A.POSE_H * k); G.globalCompositeOperation = 'source-over';
  }
  return { x, feet, s, mx: x + A.MUZZLE.x * s, my: feet + A.MUZZLE.y * s };
}
const TINTS = new Map();
function tint(img, col) {
  const key = img; if (!TINTS.has(key)) TINTS.set(key, {});
  const m = TINTS.get(key); if (m[col]) return m[col];
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d');
  g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return (m[col] = c);
}
function carp(L, G, u, z, h, o = {}) {
  const img = o.hit ? A.CARP_HIT : A.CARPF[o.f || 0], s = sc(z) * (o.big || 1), w = A.uw(img) * s, hh = A.uh(img) * s, x = PX(u, z), y = YH(z, h);
  alpha(L, .4, () => oval(L, x, FY(z), w * .35, 1.2 * s, '#06050a'));
  const n = 10, sw = img.width / n, dw = w / n, ph = (u * 9 + z * 5);
  for (let i = 0; i < n; i++) L.drawImage(img, i * sw, 0, sw, img.height, x - w / 2 + i * dw, y - hh / 2 + Math.sin(ph + i * .75) * Math.max(.5, s), dw + .3, hh);
  MK.drawImage(img, x - w / 2, y - hh / 2 - 1, w, hh + 2);
  if (o.hit) alpha(L, .4, () => hr(L, x - w / 2, y - hh / 2, w, hh, '#ffffff'));
  return { x, y };
}
function soul(L, G, x, y, o = {}) {
  const img = A.GHOST, k = o.big || 1, w = A.uw(img) * k, h = A.uh(img) * k;
  alpha(G, o.glow == null ? .8 : o.glow, () => disc(G, x, y, w * .7, o.gold ? '#a07010' : '#5a5030'));
  alpha(L, o.a == null ? 1 : o.a, () => L.drawImage(img, x - w / 2, y - h / 2, w, h));
  alpha(G, .5, () => G.drawImage(img, x - w / 2, y - h / 2, w, h));
}
function bolt(L, G, x0, y0, x1, y1) {   // two short dashes on the way, never a solid line
  for (const [a, b] of [[.12, .22], [.7, .78]]) { const ax = lerp(x0, x1, a), ay = lerp(y0, y1, a), bx = lerp(x0, x1, b), by = lerp(y0, y1, b), w = a < .5 ? 1.5 : 1; ln(G, ax, ay, bx, by, '#ffb040', w + 1); ln(G, ax, ay, bx, by, '#fff0aa', w); ln(L, ax, ay, bx, by, '#fff0aa', .5); }
}
function orbShot(L, G, x, y, r = 3) { disc(G, x, y, r + 2, '#a02008'); disc(G, x, y, r, '#ff6a20'); disc(G, x, y, r * .45, '#fff0aa'); disc(L, x, y, r, '#ff8a3a'); }
function dotRing(L, G, u, z, r, col, label) {
  const n = 36;
  for (let i = 0; i < n; i += 2) { const a = i / n * 6.283, uu = u + Math.cos(a) * r, zz = z + Math.sin(a) * r * .45; hr(G, PX(uu, zz), FY(zz), 1, .5, col); }
  if (label) otxt(L, label, PX(u, z), FY(z) - 3, col, 1, 'center');
}

/* ---------- HUD and talk ---------- */
function hud(L, G, o) { L = U; G = UG;
  const hw = A.uw(A.HEART), hh = A.uh(A.HEART);
  for (let i = 0; i < 5; i++) L.drawImage(i < (o.hearts == null ? 5 : o.hearts) ? A.HEART : A.HEART_EMPTY, 4 + i * (hw + 1), 4, hw, hh);
  hr(L, 3, 5 + hh, 51, 5, '#1a1418'); hr(L, 4, 6 + hh, 49, 3, '#243a6c');
  const ch = o.charge == null ? 1 : o.charge; hr(L, 4, 6 + hh, 49 * ch, 3, o.gold ? '#ffd44a' : '#7fd4ff'); hr(G, 4, 6 + hh, 49 * ch, 3, o.gold ? '#8a6010' : '#103050');
  if (o.odds != null) {
    const k = clamp(o.odds / 100, 0, 1), hot = o.oddsHot;
    otxt(L, 'P(LOOM)', 86, 5, '#ff9a3c', 1, 'right');
    hr(L, 89, 4, 74, 7, '#1a1418'); hr(L, 90, 5, 72, 5, '#3a2f5e');
    hr(L, 90, 5, 72 * k, 5, hot ? '#ffffff' : '#e2483a'); hr(G, 90, 5, 72 * k, 5, hot ? '#ffffff' : '#5a1008');
    otxt(L, Math.max(1, Math.ceil(o.odds)) + '%', 167, 5, hot ? '#ffffff' : '#fff6e2');
    if (o.spools != null) for (let i = 0; i < 3; i++) {   // three spools left to break
      const x = 104 + i * 16, on = i >= 3 - o.spools;
      hr(L, x - 1, 13, 12, 5, '#1a1418'); hr(L, x, 14, 10, 3, on ? '#d8ccb0' : '#3a2f5e'); if (on) hr(L, x, 15, 10, .5, '#9a8e74');
      hr(L, x - 1, 13, 1, 5, '#55505e'); hr(L, x + 10, 13, 1, 5, '#55505e');
    }
  }
  const n = String(o.souls == null ? 140 : o.souls), tw = textWidth(n), gw = A.uw(A.GHOST), gh = A.uh(A.GHOST);
  L.drawImage(A.GHOST, W - 6 - tw - gw, 3, gw, gh);
  otxt(L, n, W - 4, 5, o.gold ? '#ffd44a' : '#fff6e2', 1, 'right');
}
function readout(L, G, text, y = 24) { L = U; G = UG;
  const w = textWidth(text) + 8, x = Math.round(120 - w / 2);
  hr(L, x - 1, y - 1, w + 2, 13, '#ff9628'); hr(G, x - 1, y - 1, w + 2, 13, '#5a2a08'); hr(L, x, y, w, 11, '#140c08'); hr(G, x, y, w, 11, '#000000');
  txt(L, text, x + 4, y + 3, '#ff9a3c'); txt(G, text, x + 4, y + 3, '#a04010');
}
function caption(L, G, text, y = 30) { L = U; G = UG;
  const lines = [];
  for (const wd of text.split(' ')) { const l = lines.length - 1; if (l >= 0 && (lines[l] + ' ' + wd).length <= 15) lines[l] += ' ' + wd; else lines.push(wd); }
  const w = Math.max(...lines.map(l => textWidth(l))) + 8, h = lines.length * 7 + 2;
  alpha(L, .8, () => hr(L, 2, y, w, h, '#0a0810')); hr(L, 2, y, 1, h, '#ffd44a'); hr(G, 2, y, 1, h, '#8a6010');
  lines.forEach((l, i) => txt(L, l, 6, y + 2 + i * 7, '#fff6e2'));
}
function card(L, G, title, sub, y = 92) { L = U; G = UG;
  alpha(L, .8, () => hr(L, 0, y, W, 26, '#0a0810'));
  otxt(L, title, 120, y + 4, '#ffd44a', 2, 'center'); txt(G, title, 120 - textWidth(title, 2) / 2, y + 4, '#6a4a08', 2);
  otxt(L, sub, 120, y + 18, '#fff6e2', 1, 'center');
}
function pop(L, G, text, x, y, col = '#ffd44a') { L = U; G = UG; otxt(L, text, x, y, col, 1, 'center'); txt(G, text, x - textWidth(text) / 2, y, '#6a4a08'); }


/* ---------- the side cut-ins: the roof in profile ---------- */
const SIDE = UnrugBull.paint(UnrugBull.VIEWS.side), VF = UnrugBull.VIEW_FEET, GUN = UnrugBull.paint(UnrugBull.BLASTER);
const GROUND = 112;
function sideSet(L, G, o) {
  const f = o.flash || 0;
  const cols = o.clear ? ['#1a1430', '#2a1c3a', '#4a2a44', '#7a3c40', '#b05a3c', '#e08a4a'] : f ? ['#3a3660', '#46406e', '#524a78', '#5e5482', '#6a5e8a', '#766892'] : ['#07060f', '#0b0916', '#100c1d', '#151024', '#1b132b', '#221732'];
  cols.forEach((c, i) => hr(L, 0, i * 15, W, 15.5, c));
  if (o.clear) hr(G, 0, 84, W, 4, '#6a3010');
  const R = rng(17);
  for (let k = 0; k < 8; k++) { const x = R() * 280 - 30, y = 4 + R() * 40, w = 50 + R() * 60; oval(L, x, y, w / 2, 5 + R() * 3, o.clear ? '#2a1c34' : f ? '#2a2648' : '#0d0b16'); }
  // the city far below, out to the horizon
  for (let x = 0; x < W; x += 3 + R() * 5 | 0) {
    const h = 4 + R() * 18, w = 3 + R() * 7;
    hr(L, x, 90 - h, w, h + 22, o.clear ? '#1a1420' : '#0c0a12');
    for (let k = 0; k < h / 3; k++) if (R() < .4) hr(G, x + 1 + (R() * (w - 2) | 0), 91 - h + k * 3, .5, .5, R() < .7 ? '#7a5a20' : '#3a5a7a');
  }
  // the roof, edge on, and the parapet in front of it
  hr(L, 0, GROUND, W, 3, f ? '#4a4658' : '#2a2632'); hr(L, 0, GROUND, W, .5, f ? '#c8c4e0' : '#4a4658');
  hr(L, 0, GROUND + 3, W, H - GROUND - 3, '#16141c'); hr(L, 0, GROUND + 3, W, 1, '#34303e');
  for (let x = 6; x < W; x += 22) hr(L, x, GROUND + 4, .5, H, '#100e14');
}
// p(Loom) from the side: its near post, the spools end on, the warp as a slanted band, the eye out on its rail
function sideLoom(L, G, o) {
  const sx = o.shake ? Math.sin(o.shake * 7) * 1.5 : 0, X = x => x + sx;
  for (let k = 0; k < 5; k++) ln(L, X(176 + k * 12), 0, X(176 + k * 12 + (k - 2) * 4), -6, '#2a2436');
  hr(L, X(196), -2, 16, GROUND + 2, '#2a2632'); hr(L, X(197), -2, 2, GROUND, '#46404e'); hr(L, X(210), -2, 2, GROUND, '#18161e');
  hr(L, X(150), 4, 90, 10, '#2a2632'); hr(L, X(150), 4, 90, 1, '#46404e');
  // the warp band from the spool down to the cloth roll, edge on: a sheet of threads, souls caught in it
  if (!o.snapped) for (let k = 0; k < 9; k++) ln(L, X(160 + k), 18, X(168 + k), 96, '#8a8070');
  else for (let k = 0; k < 9; k++) { const a = -1.9 + k * .32; ln(L, X(164), 18, X(164) + Math.cos(a) * (30 + k * 4), 18 + Math.sin(a) * (20 + k * 3) + 40, '#e2d6b8'); }
  const R = rng(5);
  for (let i = 0; i < (o.souls || 0); i++) { const k = R(); soul(L, G, X(161 + k * 9 + R() * 4), 20 + k * 74, { big: .5, glow: o.soulGlow || .4, gold: !!o.soulGlow }); }
  // the spool, end on
  disc(L, X(164), 12, 8, o.broke ? '#1a1820' : '#b8ac90'); disc(L, X(164), 12, 6, o.broke ? '#100e14' : '#e2d6b8'); disc(L, X(164), 12, 2.5, '#55505e');
  // the cloth roll, and the runner coming off it toward him
  disc(L, X(178), 100, 11, '#6a1a18'); for (let k = -8; k < 10; k += 4) hr(L, X(167), 100 + k, 22, .5, '#a8782a');
  hr(L, 0, GROUND - .5, X(178), 1, '#6a1a18');
  // the rail and the eye, facing him
  hr(L, X(146), 66, 54, 6, '#141218'); hr(L, X(146), 66, 54, .5, '#5a4a40');
  const eye = o.eye || 'red';
  oval(L, X(146), 69, 5, 10, '#3a3644'); oval(L, X(144), 69, 3.5, 8, eye === 'dead' ? '#2a2026' : '#7a2a10');
  if (eye !== 'dead') { const c = eye === 'hot' ? '#ffffff' : '#ff4030'; oval(L, X(143), 69, 2.5, 6.5, c); oval(G, X(143), 69, 2.5, 6.5, eye === 'hot' ? '#ffffff' : '#c42010'); hr(L, X(141), 67, 1.5, 4, '#140c08'); }
}
function sideBull(L, G, x, feet, k, o = {}) {
  L.drawImage(SIDE, x - VF.x * k, feet - VF.y * k, SIDE.width * k, SIDE.height * k);
  MK.drawImage(SIDE, x - VF.x * k, feet - VF.y * k, SIDE.width * k, SIDE.height * k);
  const gx = x + 2 * k, gy = feet - 44 * k;
  L.drawImage(GUN, gx, gy, GUN.width * k, GUN.height * k);
  if (o.rim) { alpha(G, .6, () => G.drawImage(tint(SIDE, o.rim), x - VF.x * k + .5, feet - VF.y * k, SIDE.width * k, SIDE.height * k)); G.globalCompositeOperation = 'destination-out'; G.drawImage(SIDE, x - VF.x * k - .5, feet - VF.y * k, SIDE.width * k, SIDE.height * k); G.globalCompositeOperation = 'source-over'; }
  return { mx: gx + 24 * k, my: gy + 3 * k };
}

/* ---------- the frames ---------- */
const BZ = .07;   // where he stands, in the fight
const AWAKE = { state: 'awake', souls: 0 };
const fight = (L, G, o) => {
  sky(L, G, o); city(L, G, o); floor(L, G, { runner: true, flash: o.flash }); loom(L, G, o);
};
const FRAMES = [
  { act: 1, title: 'The elevator opens on the roof', time: '0:00', said: 'The elevator up from the floor before the roof (which floor that is isn\'t settled yet). The doors part on the roof in a storm. No music, only rain and wind.',
    note: 'Inside the car, the light is the car\'s own: a warm panel light and the R on the floor display. Outside, dark. You have control the moment the doors are open.',
    draw(L, G) {
      sky(L, G, {}); city(L, G, {}); floor(L, G, {}); clutter(L, G, {}); loom(L, G, { state: 'dark', souls: 10, eye: 'shut' }); rain(L, G, 0, .25, 40);
      // the car: steel walls, doors two-thirds open
      const gap = 46;
      hr(L, 0, 0, 120 - gap, H, '#585c6a'); hr(L, 120 + gap, 0, W - 120 - gap, H, '#585c6a');
      for (let x = 0; x < 120 - gap; x += 12) { hr(L, x, 0, .5, H, '#30323c'); hr(L, x + .5, 0, .5, H, '#7a7e8c'); }
      for (let x = 120 + gap + 6; x < W; x += 12) { hr(L, x, 0, .5, H, '#30323c'); hr(L, x + .5, 0, .5, H, '#7a7e8c'); }
      hr(L, 120 - gap - 10, 6, 10, H, '#5a5e6c'); hr(L, 120 + gap, 6, 10, H, '#5a5e6c');   // the doors' edges
      hr(L, 120 - gap - .5, 6, .5, H, '#9a9eb0'); hr(L, 120 + gap, 6, .5, H, '#9a9eb0');
      hr(L, 0, 0, W, 8, '#1c1d24'); hr(L, 108, 1, 24, 6, '#0a0a0e'); txt(L, 'R', 117, 2, '#ff9a3c'); txt(G, 'R', 117, 2, '#c05010');
      hr(L, 0, 118, W, 17, '#2a2830'); for (let x = 0; x < W; x += 6) hr(L, x, 118, .5, 17, '#34323c');   // the car's floor
      hr(L, 120 - gap, 117, gap * 2, 1.5, '#7a7e8c');
      bull(L, G, 'stand', 0, -.04, { rim: '#ffe0b0' });
    },
    lights: () => [{ x: 120, y: 2, r: 190, c: '#ffd8a0', k: 1.3 }], amb: '#4a4a6a', refl: 78 },
  { act: 1, title: 'The walk out', time: '0:04', said: 'He walks the roof toward the far end. No enemies. Units, vents, a water tank, the back of the RUGCO sign. The red runner starts at his feet and runs off into the dark ahead.',
    note: 'The roof scrolls like the halls, slower. Something huge stands at the far end, but you can only see threads going up into the clouds. A few trapped souls glow faintly in it. About 8 seconds.',
    draw(L, G) {
      sky(L, G, {}); city(L, G, {}); floor(L, G, { runner: true }); clutter(L, G, {}); loom(L, G, { state: 'dark', souls: 14, eye: 'shut' });
      bull(L, G, 'runA', 0, BZ + .05); rain(L, G, 1, .25);
    }, lights: () => [{ x: 200, y: 40, r: 90, c: '#c42858', k: .4 }], amb: '#565878' },
  { act: 1, title: 'Lightning', time: '0:12', said: 'A flash. For a beat the whole thing is lit: a loom the size of a building, tied into the sky, souls hanging in its threads. He stops.',
    note: 'One frame of white, then the silhouette holds for half a second while the thunder rolls. Walking stops here; control comes back at the FIGHT pop.',
    draw(L, G) {
      sky(L, G, { flash: 1, bolt: 4 }); city(L, G, { flash: 1 }); floor(L, G, { runner: true, flash: 1 }); clutter(L, G, { flash: 1 }); loom(L, G, { state: 'sil', rim: true, souls: 18 });
      bull(L, G, 'stand', 0, BZ + .05, { rim: '#e8e4ff' }); rain(L, G, 2, .25);
    }, lights: () => [], amb: '#a8a8d8', flash: .25 },
  { act: 1, title: 'It wakes', time: '0:15', said: 'The eye opens and rides to the middle of its rail. Orange light falls down the roof. The card names it.',
    note: 'Like the Shredder\'s card on the 13th Floor. The eye looks at him and follows him from here on.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 18, eyeX: 120, lookX: 120 }); clutter(L, G, {});
      bull(L, G, 'stand', 0, BZ + .02); rain(L, G, 3, .25);
      card(L, G, 'P(LOOM)', "RUGCO'S AI. IT HAS RUN THE NUMBERS.");
    }, lights: () => [eyeLight({})], amb: '#4a4a68' },
  { act: 1, title: 'The odds', time: '0:19', said: 'It speaks in an orange readout. The odds bar fills up to 99%. Then the FIGHT pop and the music starts.',
    note: 'p(Loom)\'s readout, line by line: "HELLO, UNRUGGABULL." / "I HAVE MODELED THIS MEETING." / "PROBABILITY OF YOUR SURVIVAL: 1%." He has no line here; he raises the blaster. About 6 seconds, the whole lead-in about 25.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 18, eyeX: 120 }); bull(L, G, 'aim', 0, BZ); rain(L, G, 4, .25);
      hud(L, G, { odds: 99, oddsHot: true, souls: 140 });
      readout(L, G, 'PROBABILITY OF YOUR SURVIVAL: 1%');
    }, lights: () => [eyeLight({})], amb: '#4a4a68' },

  { act: 2, title: 'Round 1: the weave', time: '0:25', said: 'Carpshits come off the cloth and fly down the runner at him. He shoots them as in the halls.',
    note: 'The twist: each soul he frees floats back up the roof and the loom catches it. The souls counter still climbs, but they end up in its threads. That\'s the setup for the quiet.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 22, eyeX: 100, lookX: 130 });
      carp(L, G, -.32, .55, .25, { f: 0 }); carp(L, G, .35, .4, .2, { f: 1 }); const c = carp(L, G, .1, .22, .22, { hit: true });
      const b = bull(L, G, 'aim', .08, BZ); bolt(L, G, b.mx, b.my, c.x - 4, c.y + 2);
      soul(L, G, 128, 62, { glow: .6 }); ln(G, 130, 60, 140, 50, '#4a4020'); soul(L, G, 146, 40, { a: .7, glow: .4 });
      pop(L, G, 'CAUGHT', 152, 32, '#ff9a3c');
      rain(L, G, 5, .25); hud(L, G, { odds: 99, spools: 3, souls: 152 });
    }, lights: o => [eyeLight({ eyeX: 100 })], amb: '#4a4a68' },
  { act: 2, title: 'Round 1: predictions', time: '0:35', said: 'The eye puts three dotted rings on the roof: where it thinks you\'ll be. Orbs land on the likely ring first.',
    note: 'Most of the time, standing in the unlikely ring is safe. Sometimes it isn\'t: "VARIANCE." That\'s the whole lesson for the round: its odds are about you, and they can be beaten.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 24, eyeX: 140, eye: 'red', lookX: 90 });
      dotRing(L, G, .02, .1, .16, '#ff7050', '71%'); dotRing(L, G, -.5, .2, .13, '#ff9a3c', '21%'); dotRing(L, G, .5, .16, .12, '#ffd44a', '8%');
      orbShot(L, G, PX(.02, .14), YH(.14, .3), 3.5); orbShot(L, G, PX(.02, .4), YH(.4, .45), 2.2); ln(G, PX(.02, .4), YH(.4, .45), 138, 50, '#5a1a08');
      bull(L, G, 'runAimA', .5, .16); rain(L, G, 6, .25); hud(L, G, { odds: 99, spools: 3, souls: 160 });
      readout(L, G, 'VARIANCE.');
    }, lights: () => [eyeLight({ eyeX: 140, eye: 'red' }), { x: PX(.02, .14), y: YH(.14, .3), r: 50, c: '#ff6a20', k: .8 }], amb: '#4a4a68' },
  { act: 2, title: 'Round 1: the opening', time: '0:50', said: 'After a volley the eye stalls on its rail, white-hot, open. Shoot it and the spool above it takes the damage. Enough hits and the spool snaps.',
    note: 'The spools are its health: three, one a round, shown under its odds bar. The joke and the tell: a spool breaks, and the odds don\'t move. "NO CHANGE." Every round ends the same way.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 26, eyeX: 120, eye: 'hot', broke: 0, snap: 0 });
      const b = bull(L, G, 'aim', 0, BZ); bolt(L, G, b.mx, b.my, 120, LM.rail + 3); bolt(L, G, b.mx - 1, b.my - 2, 121, LM.rail + 1);
      pop(L, G, 'SNAP!', 80, 22, '#ffd44a');
      rain(L, G, 7, .25); hud(L, G, { odds: 99, spools: 2, souls: 168 });
      readout(L, G, 'NO CHANGE.', 34);
    }, lights: () => [{ x: 120, y: LM.rail, r: 160, c: '#fff0d0', k: 1.2 }, { x: 80, y: 8, r: 60, c: '#ffd44a', k: .8 }], amb: '#4a4a68' },
  { act: 2, title: 'Round 2: snares', time: '1:00', said: 'New this round: the eye shoots a thread down the roof. It hooks him and starts reeling him in. A katana slash cuts it.',
    note: 'If it reels him all the way to the loom, a heart and he\'s thrown back. Cutting it makes the eye flinch for a second: "RECALCULATING." The first spool is gone; its warp hangs loose.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 30, eyeX: 108, broke: 1 });
      const b = bull(L, G, 'slash', -.05, BZ + .03, { dx: 0 });
      ln(L, 108, LM.rail + 4, b.x + 4, b.feet - 22, '#e2d6b8', 1); ln(G, 108, LM.rail + 4, b.x + 4, b.feet - 22, '#3a3020');
      for (let k = 0; k < 6; k++) { const a = -2.6 + k * .4; ln(G, b.x + 8 + Math.cos(a) * 18, b.feet - 22 + Math.sin(a) * 10, b.x + 8 + Math.cos(a + .3) * 18, b.feet - 22 + Math.sin(a + .3) * 10, k > 1 && k < 5 ? '#bfefff' : '#7fd4ff', 1); }
      pop(L, G, 'CUT', b.x + 18, b.feet - 46, '#bfefff');
      rain(L, G, 8, .25); hud(L, G, { odds: 99, spools: 2, souls: 176, hearts: 4 });
      readout(L, G, 'RECALCULATING.');
    }, lights: () => [eyeLight({ eyeX: 108 })], amb: '#4a4a68' },
  { act: 2, title: 'Round 2: gusts', time: '1:15', said: 'The wind comes across the roof in gusts. The rain leans, and he\'s pushed toward the parapet while the rings and threads keep coming.',
    note: 'Gusts are telegraphed: the rain leans a beat before the push. Nothing falls off the roof; the parapet stops him, but it pins him for the next volley. The second spool snaps at the end of the round.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 34, eyeX: 150, broke: 1, lookX: 200, eye: 'red' });
      dotRing(L, G, .7, .12, .13, '#ff7050', '64%');
      bull(L, G, 'runB', .72, .1, { tilt: .12 });
      for (let k = 0; k < 12; k++) { const y = 70 + k * 5, x = 20 + (k * 47) % 160; ln(L, x, y, x + 30, y + 1, '#b0b8d8'); ln(G, x, y, x + 30, y + 1, '#2a3048'); }
      rain(L, G, 9, 1.2, 90); hud(L, G, { odds: 99, spools: 2, souls: 188, hearts: 4 });
    }, lights: () => [eyeLight({ eyeX: 150, eye: 'red' })], amb: '#4a4a68' },
  { act: 2, title: 'Round 3: everything', time: '1:30', said: 'Faster: carpshits, rings and snares together. The warp is full of the souls it has caught, glowing brighter.',
    note: 'The last spool goes. The loom sags, the eye drifts back to the middle, and the readout says "ALL SOULS ACCOUNTED FOR." The music cuts out on the last word. The rounds take about 2 minutes together.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 48, soulGlow: .5, eyeX: 120, broke: 2, snap: 2, keepWarp: true });
      carp(L, G, -.45, .35, .2, { f: 1 }); carp(L, G, .4, .6, .3, { f: 0 });
      dotRing(L, G, -.15, .1, .14, '#ff7050', '88%');
      const b = bull(L, G, 'aim', .2, BZ); bolt(L, G, b.mx, b.my, 160, 10);
      pop(L, G, 'SNAP!', 168, 22);
      rain(L, G, 10, .3); hud(L, G, { odds: 99, spools: 0, souls: 212, hearts: 3 });
      readout(L, G, 'ALL SOULS ACCOUNTED FOR.', 34);
    }, lights: () => [eyeLight({}), { x: 160, y: 8, r: 60, c: '#ffd44a', k: .8 }, { x: 120, y: 30, r: 120, c: '#ffe0a0', k: .25 }], amb: '#4a4a68' },

  { act: 3, title: 'The quiet', time: '1:55', said: 'No music. Rain. The loom hangs over him with every soul he freed caught in its threads. He has nothing left to break. It hasn\'t moved off 99%.',
    note: 'Two seconds of nothing, long enough to wonder. He can still move. The souls in the warp start to pulse, in time with nothing.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 48, soulGlow: .7, eyeX: 120, broke: 3, keepWarp: true });
      bull(L, G, 'stand', 0, BZ); rain(L, G, 11, .2, 50); hud(L, G, { odds: 99, spools: 0, souls: 212, hearts: 3 });
    }, lights: () => [eyeLight({}, .6), { x: 120, y: 30, r: 130, c: '#ffe0a0', k: .4 }], amb: '#3e3e5a' },
  { act: 3, title: 'Cut: the first soul', time: '1:57', cut: true, said: 'A side shot, about a second long. Him small on the left, the loom towering on the right. One soul works loose from the threads and arcs across the gap to his gun.',
    note: 'Cut-ins only come on beats with nothing to dodge, are held to a second or so, and the camera always cuts back to behind him before anything can hit him. No input is lost: carpshits are gone after the quiet.',
    draw(L, G) {
      sideSet(L, G, {}); sideLoom(L, G, { souls: 18, soulGlow: .7 });
      const b = sideBull(L, G, 46, GROUND, .5, { rim: '#ffd890' });
      const R = rng(3); let px = 160, py = 46;
      for (let i = 1; i <= 14; i++) { const k = i / 14, x = lerp(160, b.mx + 4, k), y = lerp(46, b.my, k) - Math.sin(k * 3.14) * 26; ln(G, px, py, x, y, '#6a5010', 1); px = x; py = y; }
      soul(L, G, 110, 32, { gold: true, glow: 1 });
      rain(L, G, 21, .25, 50);
    }, lights: () => [{ x: 144, y: 69, r: 160, c: '#ff3020', k: .7 }, { x: 110, y: 32, r: 60, c: '#ffd44a', k: .9 }, { x: 60, y: 80, r: 70, c: '#ffd890', k: .8 }], amb: '#56567a', floorY: 999 },
  { act: 3, title: 'They come back', time: '1:57', said: 'One soul breaks out of the warp and flies down the roof into his blaster. A bell: D. Then another: F. Then A.',
    note: 'From here every shot is soul-powered (your pick for when souls fire: from the quiet on). The charge bar turns gold. The readout stutters.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 45, soulGlow: .7, eyeX: 120, broke: 3, keepWarp: true, eye: 'red' });
      const b = bull(L, G, 'aim', 0, BZ);
      const pts = [[150, 30], [140, 52], [128, 74], [b.mx + 2, b.my - 2]];
      for (let i = 0; i < 3; i++) ln(G, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], '#6a5010', 1);
      soul(L, G, 128, 74, { gold: true, glow: 1 }); soul(L, G, 92, 40, { gold: true, glow: .9, a: .9 });
      pop(L, G, 'D', 140, 70, '#fff0aa'); pop(L, G, 'F', 100, 50, '#fff0aa');
      disc(G, b.mx, b.my, 4, '#c08010');
      rain(L, G, 12, .2, 50); hud(L, G, { odds: 99, spools: 0, souls: 212, hearts: 3, gold: true });
      readout(L, G, 'ERROR. ERR.');
    }, lights: () => [eyeLight({}, .6), { x: 128, y: 74, r: 60, c: '#ffd44a', k: .8 }], amb: '#3e3e5a' },
  { act: 3, title: 'The flood', time: '2:00', said: 'Then all of them. The warp empties in a rush and every soul pours down the roof into the gun. The music comes back in, building.',
    note: 'The loom\'s threads go slack as the souls leave. The souls counter rolls up fast.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 8, soulGlow: .9, eyeX: 120, broke: 3, keepWarp: true, eye: 'red' });
      const b = bull(L, G, 'aim', 0, BZ), R = rng(31);
      for (let i = 0; i < 40; i++) { const k = R(), sx = 70 + R() * 100, sy = 14 + R() * 30, x = lerp(sx, b.mx, k * k), y = lerp(sy, b.my, k); soul(L, G, x, y, { gold: true, glow: .7, big: .6 + k * .6 }); }
      disc(G, b.mx, b.my, 7, '#c08010'); disc(G, b.mx, b.my, 4, '#fff0aa');
      rain(L, G, 13, .2, 40); hud(L, G, { odds: 99, spools: 0, souls: 260, hearts: 3, gold: true });
    }, lights: () => [eyeLight({}, .5), { x: 120, y: 60, r: 170, c: '#ffd44a', k: 1 }], amb: '#3e3e5a' },
  { act: 3, title: 'The pinch', time: '2:04', said: 'The streams of souls pinch together at the muzzle. The screen shakes harder and harder. He braces.',
    note: 'Shake builds over about a second. Any shot now comes out gold and thick.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 0, eyeX: 120, broke: 3, keepWarp: true, eye: 'red', shake: 2 });
      const b = bull(L, G, 'crouch', 0, BZ);
      const mx = b.x + 10 * b.s, my = b.feet - 20 * b.s;
      for (let k = 0; k < 6; k++) { const a = -2.2 + k * .55; ln(G, mx + Math.cos(a) * 40, my + Math.sin(a) * 30, mx, my, '#c08010', 1.5); ln(L, mx + Math.cos(a) * 40, my + Math.sin(a) * 30, mx, my, '#fff0aa'); }
      disc(G, mx, my, 9, '#c08010'); disc(G, mx, my, 5, '#ffffff');
      rain(L, G, 14, .2, 40); hud(L, G, { odds: 99, spools: 0, souls: 280, hearts: 3, gold: true });
    }, lights: () => [eyeLight({}, .5), { x: 128, y: 100, r: 120, c: '#ffd44a', k: 1.2 }], amb: '#3e3e5a' },
  { act: 3, title: 'Cut: the beam', time: '2:05', cut: true, said: 'Out of the white flash, a side shot close on him: the beam erupts from the gun and crosses the whole roof into the eye. The loom rocks back.',
    note: 'The freeze (about 0.14 s) lands on this shot, then the shake, then about half a second more before it cuts back behind him for the two lines and the fight with the beam.',
    draw(L, G) {
      sideSet(L, G, { flash: 1 }); sideLoom(L, G, { souls: 0, eye: 'hot', shake: 2 });
      const b = sideBull(L, G, 40, 134, 1, { rim: '#ffffff' });
      const y = b.my, x0 = b.mx;
      for (const [w, c] of [[26, '#7a3c08'], [18, '#ff8a1c'], [11, '#ffd44a'], [5, '#ffffff']]) { G.fillStyle = c; G.beginPath(); G.moveTo(x0, y - w * .3); G.lineTo(146, 69 - w * .5); G.lineTo(146, 69 + w * .5); G.lineTo(x0, y + w * .3); G.closePath(); G.fill(); }
      L.fillStyle = '#fff6e0'; L.beginPath(); L.moveTo(x0, y - 3); L.lineTo(146, 66); L.lineTo(146, 72); L.lineTo(x0, y + 3); L.closePath(); L.fill();
      disc(G, 146, 69, 16, '#ffb040'); disc(G, 146, 69, 9, '#ffffff'); disc(G, x0, y, 9, '#ffd44a'); disc(G, x0, y, 5, '#ffffff');
      const R = rng(8); for (let k = 0; k < 16; k++) { const yy = 20 + R() * 100, xx = R() * 200; hr(G, xx, yy, 14 + R() * 20, .5, '#5a4a30'); }
    }, lights: () => [{ x: 100, y: 90, r: 300, c: '#ffd890', k: 1.6 }], amb: '#6a6a90', flash: .1, floorY: 999 },
  { act: 3, title: 'The lines', time: '2:06', said: 'Back behind him, still white-hot. The two lines, over the beam\'s roar.',
    note: 'p(Loom): "THAT OUTCOME WAS NOT IN THE MODEL." Then him, in his caption: "LET\'S DISCUSS THOSE ODDS." (your pick for his line).',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 0, eyeX: 120, broke: 3, keepWarp: true, eye: 'red', flash: 1 });
      const b = bull(L, G, 'aim', 0, BZ, { rim: '#ffffff' });
      disc(G, b.mx + 3, b.my - 2, 10, '#ffd44a'); disc(G, b.mx + 3, b.my - 2, 6, '#ffffff');
      readout(L, G, 'THAT OUTCOME WAS NOT IN THE MODEL.');
      caption(L, G, "LET'S DISCUSS THOSE ODDS.", 70);
      hud(L, G, { odds: 99, spools: 0, souls: 280, hearts: 3, gold: true });
    }, lights: () => [{ x: 128, y: 100, r: 260, c: '#ffffff', k: 1.6 }], amb: '#9a9ac0', flash: .15 },
  { act: 3, title: 'The beam', time: '2:07', said: 'One beam, as wide as he is at the gun, straight up the runner into the eye. The loom shakes, threads tear off it, and the odds drain about 10% a second while the beam is on the eye.',
    note: 'Much bigger than the old mock: it lights the whole roof gold, and the hit at the eye is a burst, not a dot. A hit on him doesn\'t break the beam (your pick). He steers it with left and right.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 0, eyeX: 120, broke: 3, keepWarp: true, eye: 'hot', shake: 1, cracks: 2 });
      beamShot(L, G, 'aim', 0, BZ, 120, LM.rail, 0);
      rain(L, G, 15, .2, 30); hud(L, G, { odds: 62, oddsHot: true, spools: 0, souls: 280, hearts: 3, gold: true });
    }, lights: () => [{ x: 120, y: 70, r: 260, c: '#ffc860', k: 1.5 }, { x: 120, y: LM.rail, r: 90, c: '#ffffff', k: 1.2 }], amb: '#3e3e5a' },
  { act: 3, title: 'It runs', time: '2:10', said: 'The eye tears loose and races along its rail. He drags the beam after it. Off the eye, the odds creep back up.',
    note: 'Readout: "PROBABILITY OF CAPTURE: ZERO." Then, when he catches it again: "RECALCULATING." The eye gets faster as the odds fall. This part lasts as long as the player needs, about 10 to 15 seconds.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 0, eyeX: 166, broke: 3, keepWarp: true, eye: 'red', lookX: 240, cracks: 2 });
      beamShot(L, G, 'runAimA', .22, BZ, 150, LM.rail + 2, .6);
      for (let k = 0; k < 4; k++) hr(G, 180 - k * 6, LM.rail - 1 + (k % 2), 4, .5, '#ff7a3a');
      rain(L, G, 16, .2, 30); hud(L, G, { odds: 41, spools: 0, souls: 280, hearts: 2, gold: true });
      readout(L, G, 'PROBABILITY OF CAPTURE: ZERO.');
    }, lights: () => [{ x: 140, y: 70, r: 240, c: '#ffc860', k: 1.3 }, eyeLight({ eyeX: 166, eye: 'red' })], amb: '#3e3e5a' },
  { act: 3, title: '1%', time: '2:20', said: 'The odds hit 1%. The eye is cracked all over. The readout says one word.',
    note: 'The beam holds. The cracks in the eye glow white. "UNLIKELY." Then a beat of quiet before it goes.',
    draw(L, G) {
      fight(L, G, { state: 'awake', souls: 0, eyeX: 120, broke: 3, keepWarp: true, eye: 'hot', cracks: 6, shake: 3 });
      beamShot(L, G, 'aim', 0, BZ, 120, LM.rail, 0);
      rain(L, G, 17, .2, 20); hud(L, G, { odds: 1, oddsHot: true, spools: 0, souls: 280, hearts: 2, gold: true });
      readout(L, G, 'UNLIKELY.');
    }, lights: () => [{ x: 120, y: 70, r: 260, c: '#ffc860', k: 1.5 }, { x: 120, y: LM.rail, r: 90, c: '#ffffff', k: 1.4 }], amb: '#3e3e5a' },
  { act: 3, title: 'Cut: the threads snap', time: '2:23', cut: true, said: 'A wide side shot: every thread lets go at once and whips loose, the eye goes dark, and the storm starts to break behind it.',
    note: 'About a second and a half, with the snap and the start of the major chord. Then back behind him for the souls going up.',
    draw(L, G) {
      sideSet(L, G, { clear: true }); sideLoom(L, G, { souls: 0, eye: 'dead', snapped: true, broke: true, shake: 1 });
      sideBull(L, G, 46, GROUND, .5, { rim: '#ffc890' });
      const R = rng(12); for (let i = 0; i < 14; i++) soul(L, G, 140 + R() * 50, 10 + R() * 80, { glow: .5, a: .9, big: .6 });
    }, lights: () => [{ x: 200, y: 86, r: 260, c: '#ffb070', k: .9 }], amb: '#5a5478', floorY: 999 },
  { act: 3, title: 'Dawn', time: '2:25', said: 'Behind him again. The rain stops, the clouds open on a sunrise, and the chord rings out as the souls drift up out of the wreck.',
    note: 'He lowers the blaster and stands there. The souls counter keeps rolling up. Then the ending, which is its own storyboard.',
    draw(L, G) {
      sky(L, G, { clear: true }); city(L, G, {}); floor(L, G, { runner: true }); loom(L, G, { state: 'awake', souls: 0, eye: 'dead', broke: 3, snapAll: true });
      const R = rng(41);
      for (let i = 0; i < 26; i++) soul(L, G, 60 + R() * 120, 6 + R() * 60, { glow: .5, a: .8, big: .7 + R() * .4 });
      bull(L, G, 'win', 0, BZ, { rim: '#ffc890' });
      hud(L, G, { odds: 1, spools: 0, souls: 412, hearts: 2 });
    }, lights: () => [{ x: 120, y: 48, r: 260, c: '#ffb070', k: .9 }], amb: '#6a6080' },
];
// the beam: wide at the gun, still thick at the eye, a burst where it lands
function beam(L, G, x0, y0, x1, y1, bend) {
  const N = 28, pts = [];
  for (let i = 0; i <= N; i++) { const k = i / N, kk = Math.pow(k, 1.4); pts.push({ x: lerp(x0, x1, kk) + Math.sin(k * 3.14) * bend * 14, y: lerp(y0, y1, k), hw: k < .14 ? lerp(1.2, 6.5, k / .14) : lerp(6.5, 3.5, (k - .14) / .86) }); }
  pts.forEach((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1; p.nx = -ty / l; p.ny = tx / l; });
  for (const [m, col, layer] of [[2.0, '#7a3c08', G], [1.4, '#ff8a1c', G], [1.0, '#ffd44a', G], [.45, '#ffffff', G], [1.0, '#ffd44a', L], [.45, '#fff6e0', L]]) {
    layer.fillStyle = col; layer.beginPath();
    pts.forEach((p, k) => { const w = p.hw * m * (1 + .12 * Math.sin(k * 1.7)); k ? layer.lineTo(p.x + p.nx * w, p.y + p.ny * w) : layer.moveTo(p.x + p.nx * w, p.y + p.ny * w); });
    for (let k = N; k >= 0; k--) { const p = pts[k], w = p.hw * m * (1 + .12 * Math.sin(k * 2.3)); layer.lineTo(p.x - p.nx * w, p.y - p.ny * w); }
    layer.closePath(); layer.fill();
  }
  const R = rng(9);
  for (let k = 0; k < 18; k++) { const a = R() * 6.28, r = 10 + R() * 22; ln(G, x1, y1, x1 + Math.cos(a) * r, y1 + Math.sin(a) * r * .7, R() < .5 ? '#ffd44a' : '#ffffff'); }
  disc(G, x1, y1, 13, '#ffb040'); disc(G, x1, y1, 8, '#ffffff');
  for (let k = 0; k < 10; k++) { const x = x1 + (R() - .5) * 90, y = y1 + (R() - .3) * 30; ln(L, x, y, x + (R() - .5) * 6, y + 3 + R() * 6, '#e2d6b8'); }   // thread torn off the loom
}

// the beam leaves the gun ahead of him, so he's drawn over its start, then the flare at the muzzle over him
function beamShot(L, G, pose, u, z, x1, y1, bend) {
  const s = sc(z), x = PX(u, z), feet = YH(z, 0), mx = x + A.MUZZLE.x * s, my = feet + A.MUZZLE.y * s;
  beam(L, G, mx, my, x1, y1, bend);
  G.globalCompositeOperation = 'destination-out'; G.drawImage(A.POSES[pose], x - A.POSE_FEET.x * s * A.BULL_K, feet - A.POSE_FEET.y * s * A.BULL_K, A.POSE_W * s * A.BULL_K, A.POSE_H * s * A.BULL_K); G.globalCompositeOperation = 'source-over';
  bull(L, G, pose, u, z, { rim: '#ffd890' });
  disc(G, mx, my, 5, '#ffd44a'); disc(G, mx, my, 2.5, '#ffffff');
}

/* ---------- the page ---------- */
const ACTS = { 1: 'Getting there', 2: 'The fight', 3: 'The crescendo' };
const view = document.getElementById('view'), meta = document.getElementById('meta');
const cache = [];
function render(i) {
  if (cache[i]) return cache[i];
  const f = FRAMES[i], [lc, lg] = mk(), [gc, gg] = mk();
  lg.fillStyle = '#000'; lg.fillRect(0, 0, W, H); gg.fillStyle = '#000'; gg.fillRect(0, 0, W, H);
  const [uc, ug] = mk(), [ugc, ugg] = mk(), [mc, mg] = mk(); U = ug; UG = ugg; MK = mg;
  f.draw(lg, gg);
  const out = document.createElement('canvas'); out.width = PW; out.height = PH;
  finish(out, lc, gc, { lights: f.lights ? f.lights() : [], amb: f.amb, flash: f.flash, refl: f.refl, floorY: f.floorY, ui: [uc, ugc], mask: mc });
  return (cache[i] = out);
}
let cur = 0;
function show(i) {
  cur = (i + FRAMES.length) % FRAMES.length;
  const f = FRAMES[cur], g = view.getContext('2d');
  g.drawImage(render(cur), 0, 0);
  document.getElementById('act').textContent = 'Act ' + f.act + ' · ' + ACTS[f.act];
  document.getElementById('num').textContent = (cur + 1) + ' / ' + FRAMES.length;
  document.getElementById('time').textContent = f.time;
  document.getElementById('ftitle').textContent = f.title;
  document.getElementById('said').textContent = f.said;
  document.getElementById('note').textContent = f.note;
  document.querySelectorAll('#strip button').forEach((b, k) => b.setAttribute('aria-current', k === cur ? 'true' : 'false'));
  try { localStorage.setItem('roofboard', cur); } catch (e) {}
}
const strip = document.getElementById('strip');
let lastAct = 0;
FRAMES.forEach((f, i) => {
  if (f.act !== lastAct) { const s = document.createElement('span'); s.textContent = 'Act ' + f.act; strip.append(s); lastAct = f.act; }
  const b = document.createElement('button'); b.textContent = i + 1; b.title = f.title; if (f.cut) b.className = 'cut'; b.onclick = () => show(i); strip.append(b);
});
document.getElementById('prev').onclick = () => show(cur - 1);
document.getElementById('next').onclick = () => show(cur + 1);
addEventListener('keydown', e => { if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
let sx0 = null;
view.addEventListener('touchstart', e => { sx0 = e.touches[0].clientX; }, { passive: true });
view.addEventListener('touchend', e => { if (sx0 == null) return; const d = e.changedTouches[0].clientX - sx0; if (Math.abs(d) > 40) show(cur + (d < 0 ? 1 : -1)); sx0 = null; });
let start = 0; try { start = +localStorage.getItem('roofboard') || 0; } catch (e) {}
show(clamp(start, 0, FRAMES.length - 1));
window.ROOF_RENDER_ALL = () => FRAMES.map((f, i) => render(i).toDataURL());
})();
