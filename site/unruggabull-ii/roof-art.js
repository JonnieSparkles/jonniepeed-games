// Unruggabull II: the roof's art (Part B). Classic script, after roof-effects.js and before roof.js.
// Drawing only: nothing here touches the run, its clock or the seeded stream (cosmetic jitter is Math.random or
// worked out from the time). roof.js calls these from its draw seams; see docs/games/unruggabull-ii/roof-plan.md.
//
// Shapes are drawn at the picture's full size (480 x 270, half a game pixel), in the game's 240 x 135 coordinates.
// What's beyond the roof (the storm sky, the city far below, the dawn) is the renderer's backdrop: backdrop() gives
// its light for the whole picture, worked out again only when something in it changes.
var UnrugRoofArt = function (core, ROOF, roof) {
  'use strict';
  const { A, PX, FY, YH, sc, clamp, poly, tinted, W, H, VX } = core;
  const LM = ROOF.art, GR = ROOF.grid;
  const h2 = v => Math.round(v * 2) / 2;
  let g = null;
  const use = x => { g = x; };
  // ---------- half-pixel drawing ----------
  function rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(h2(x), h2(y), h2(w), h2(h)); }
  function dot(x, y, c) { g.fillStyle = c; g.fillRect(h2(x), h2(y), .5, .5); }
  function line(x0, y0, x1, y1, c) {
    g.fillStyle = c; x0 = Math.round(x0 * 2); y0 = Math.round(y0 * 2); x1 = Math.round(x1 * 2); y1 = Math.round(y1 * 2);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let err = dx + dy, n = 0;
    for (;;) { g.fillRect(x0 / 2, y0 / 2, .5, .5); if ((x0 === x1 && y0 === y1) || ++n > 2000) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function disc(x, y, r, c) {
    g.fillStyle = c; x = h2(x); y = h2(y); const r2 = Math.round(r * 2);
    for (let dy = -r2; dy <= r2; dy++) { const w = Math.floor(Math.sqrt(r2 * r2 - dy * dy + r2 * .4)); g.fillRect(x - w / 2, y + dy / 2, w + .5, .5); }
  }
  // a ring: the pixels between radius r0 and r1
  function ring(x, y, r0, r1, c) {
    g.fillStyle = c; x = h2(x); y = h2(y); const a = Math.round(r0 * 2), b = Math.round(r1 * 2);
    for (let dy = -b; dy <= b; dy++) {
      const wo = Math.floor(Math.sqrt(Math.max(0, b * b - dy * dy + b * .4))), wi = Math.abs(dy) <= a ? Math.floor(Math.sqrt(Math.max(0, a * a - dy * dy + a * .4))) : -1;
      if (wi < 0) g.fillRect(x - wo / 2, y + dy / 2, wo + .5, .5);
      else { g.fillRect(x - wo / 2, y + dy / 2, (wo - wi) / 2, .5); g.fillRect(x + wi / 2 + .5, y + dy / 2, (wo - wi) / 2, .5); }
    }
  }
  const alpha = (a, fn) => { g.save(); g.globalAlpha *= a; fn(); g.restore(); };
  const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul((b | 0) + 7, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------- the backdrop: storm sky, the city far below, the dawn ----------
  // Picture pixels. The horizon is the renderer's (the projection's HY, doubled); looking down from the tower the city
  // spreads below it, its streets running to the same vanishing point.
  const BW = W * 2, BH = H * 2, CX = BW / 2, CYP = core.HY * 2, FOC = BW * .6, N = BW * BH;
  // a colour as the renderer's light: the inverse of its tone curve, so it shows about as the colour
  const toL = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255].map(v => { const c = Math.min(.985, v / 255); return -Math.log(1 - Math.pow(c, 1.25)) / 1.6; }); };
  const mixL = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  const fbm = (x, y, o = 5) => { let v = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { v += vnoise(x * f, y * f) * a; f *= 2.03; a *= .5; } return v; };
  const CW = BW * 2;   // the clouds wrap round twice the picture's width as they drift
  let BKD = null;
  function bakeBackdrop() {
    // the night as the tower pictures have it: navy into purple, clouds lit red and orange from below, stars between
    const sky = Array.from({ length: CYP }, (_, y) => {
      const k = y / CYP;
      return k < .45 ? mixL(toL('#0c1020'), toL('#1e1430'), k / .45) : k < .85 ? mixL(toL('#1e1430'), toL('#2e2048'), (k - .45) / .4) : mixL(toL('#2e2048'), toL('#5c1430'), (k - .85) / .15);
    });
    const body = Array.from({ length: CYP }, (_, y) => mixL(toL('#1e1430'), toL('#2e2048'), y / CYP));
    const under = Array.from({ length: CYP }, (_, y) => { const k = y / CYP; return (k < .5 ? mixL(toL('#5c1430'), toL('#9c2622'), k * 2) : mixL(toL('#9c2622'), toL('#e44a34'), (k - .5) * 2)).map(v => v * .9); });
    const stars = new Float32Array(BW * CYP);
    for (let i = 0; i < 260; i++) { const x = Math.floor(hash(i, 11) * BW), y = Math.floor(Math.pow(hash(i, 12), 1.6) * CYP * .8); stars[y * BW + x] = .15 + hash(i, 13) * .45; }
    for (let i = 0; i < 9; i++) { const x = Math.floor(hash(i, 21) * BW), y = Math.floor(hash(i, 22) * CYP * .5) + 2; stars[y * BW + x] = 1.4; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) stars[(y + dy) * BW + x + dx] = .45; }
    // the dawn: the ending's bands (slate, plum, mauve, rose, burnt orange, amber, pale gold), the sun low on the right
    const bands = ['#25224a', '#3b2d56', '#613c5a', '#965050', '#c87146', '#ea9c52', '#fce289'].map(toL);
    const dsky = Array.from({ length: CYP }, (_, y) => { const f = Math.pow(y / CYP, 1.3) * (bands.length - 1), i = Math.min(bands.length - 2, Math.floor(f)); return mixL(bands[i], bands[i + 1], f - i); });
    const dbody = Array.from({ length: CYP }, (_, y) => mixL(toL('#2e2048'), toL('#5e4478'), y / CYP));
    const dunder = Array.from({ length: CYP }, (_, y) => mixL(toL('#9c2622'), toL('#e8a028'), y / CYP));
    // cloud density and how much of each cloud's underside is lit (by the city, or the dawn), on a strip CW wide
    const cl = new Float32Array(CW * CYP), rim = new Float32Array(CW * CYP);
    for (let y = 0; y < CYP; y++) for (let x = 0; x < CW; x++) {
      const k = y / CYP, ang = x / CW * Math.PI * 2;   // wrapped round a cylinder so the strip joins up
      const nx = Math.cos(ang) * 3.2, ny = Math.sin(ang) * 3.2;
      const n = fbm(nx + y * .045, ny + y * .02 + 9, 5);
      const bandT = Math.exp(-Math.pow((k - .32) / .2, 2)), bandB = Math.exp(-Math.pow((k - .78) / .1, 2));
      cl[y * CW + x] = clamp((n - .44 + bandT * .14 + bandB * .1) * 3.2, 0, 1);
    }
    for (let y = 0; y < CYP; y++) for (let x = 0; x < CW; x++) { const a = cl[y * CW + x], b = y + 3 < CYP ? cl[(y + 3) * CW + x] : 0; rim[y * CW + x] = clamp((a - b) * 2, 0, 1) * a; }
    // the city, far below: a street grid in perspective, a lamp a pixel up close and a haze of them far off, the avenues
    // brighter, a few windows lit between; under rain, dim
    const city = new Float32Array(N * 3), cityD = new Float32Array(N * 3);
    const lamp = toL('#c87818'), white = toL('#f8cc50'), win = toL('#6a3410'), ground = toL('#08070c'), haze = toL('#2e2048'), hazeD = toL('#965050'), groundD = toL('#24222f');
    const HG = 58, SP = 9, LS = 3;
    for (let py = CYP; py < BH; py++) {
      const z = HG * FOC / (py + .5 - CYP), fx = z / FOC, fz = z * z / (HG * FOC), dist = clamp((py - CYP) / (BH - CYP), 0, 1);
      const cover = clamp(.5 * .5 / (fx * fz), 0, 1), dense = clamp(fz / SP, 0, 1);
      for (let px = 0; px < BW; px++) {
        const x = (px + .5 - CX) * fx;
        let r = 0, gg = 0, b = 0;
        const zs = Math.round(z / SP) * SP, xs = Math.round(x / SP) * SP, ave = Math.round(z / SP) % 4 === 0 || Math.round(x / SP) % 4 === 0;
        const onRow = Math.abs(z - zs) < fz / 2, onCol = Math.abs(x - xs) < fx / 2;
        const lampRow = onRow && Math.abs(x - Math.round(x / LS) * LS) < Math.max(fx / 2, .01), lampCol = onCol && Math.abs(z - Math.round(z / LS) * LS) < Math.max(fz / 2, .01);
        if (fz < SP * .45 && (lampRow || lampCol)) { const c = ave ? white : lamp, k = ave ? .7 : .35; r += c[0] * k; gg += c[1] * k; b += c[2] * k; }
        else if (fz >= SP * .45 && hash(px, py * 7) < .045 * (ave ? 2 : 1)) { const k = .25 + hash(py, px) * .3; r += lamp[0] * k; gg += lamp[1] * k; b += lamp[2] * k; }   // far off: a lamp here and there
        else if (fz < SP * .45 && hash(Math.floor(x / 1.6), Math.floor(z / 1.6)) < .02) { r += win[0] * .4; gg += win[1] * .4; b += win[2] * .4; }
        // and a glow over the far city, under the clouds
        const hzl = Math.pow(1 - dist, 7) * .55 + dense * .06;
        const i = (py * BW + px) * 3;
        city[i] = ground[0] + r + (haze[0] + lamp[0] * .06) * hzl; city[i + 1] = ground[1] + gg + (haze[1] + lamp[1] * .06) * hzl; city[i + 2] = ground[2] + b + haze[2] * hzl;
        const hd = Math.pow(1 - dist, 5);
        cityD[i] = groundD[0] * (.8 + .4 * hd) + hazeD[0] * hd * .6; cityD[i + 1] = groundD[1] * (.8 + .4 * hd) + hazeD[1] * hd * .6; cityD[i + 2] = groundD[2] * (.8 + .4 * hd) + hazeD[2] * hd * .6;
      }
    }
    // towers lower than this one, rising out of the city to just under the horizon: stepped tops, rows of warm
    // windows, a red light on each that blinks (as the tower pictures have them)
    const towers = [[16, 330, 14, 52], [52, 520, 12, 55], [86, 380, 10, 50], [124, 640, 13, 56], [356, 600, 12, 56], [392, 340, 13, 51], [430, 470, 15, 54.5], [466, 300, 11, 50]];
    const beacons = [], face = toL('#110f18'), faceD = toL('#1e1430'), lit = toL('#e8a028'), rimL = toL('#5c1430');
    for (const [tx, Z, w, h] of towers) {
      const top = Math.round(CYP + (HG - h) * FOC / Z), bot = Math.min(BH, Math.round(CYP + HG * FOC / Z)), hw = Math.max(3, Math.round(w * FOC / Z / 2));
      for (let py = top; py < bot; py++) {
        const step = py - top < 3 ? 2 : py - top < 7 ? 1 : 0;   // setbacks at the top
        for (let px = tx - hw + step; px <= tx + hw - step; px++) {
          if (px < 0 || px >= BW) continue;
          const i = (py * BW + px) * 3, inX = px - (tx - hw + 1), inY = py - top - 8;
          const win = inY >= 0 && inX >= 0 && px < tx + hw - 1 && inX % 2 === 0 && inY % 3 === 0, on = win && hash(px * 3 + tx, py) < .55;
          const k = on ? .45 + hash(py, px) * .4 : 0, edge = px === tx - hw + step ? 1 : 0;
          for (let c = 0; c < 3; c++) { city[i + c] = face[c] + lit[c] * k + rimL[c] * edge * .6; cityD[i + c] = faceD[c] + (edge ? .04 : 0); }
        }
      }
      beacons.push([tx, top - 2, hash(tx, Z) * 6]);
    }
    const dsun = [404, CYP - 10];
    BKD = { sky, body, under, stars, dsky, dbody, dunder, cl, rim, city, cityD, beacons, dsun, out: new Float32Array(N * 3), key: '', bolt: null, flashWas: 0, boltN: 0 };
  }
  // a forked bolt from the cloud base down to the horizon, well clear of the loom (left or right of it)
  function newBolt(n) {
    const left = hash(n, 1) < .5, x0 = left ? 30 + hash(n, 2) * 120 : 330 + hash(n, 2) * 120, pts = [[x0, 18 + hash(n, 3) * 30]];
    let x = x0;
    for (let y = pts[0][1]; y < CYP + 6; y += 4 + hash(n, y) * 5) { x += (hash(n, y * 7) - .5) * 14; pts.push([x, Math.min(CYP + 6, y)]); }
    const forks = [];
    for (let f = 0; f < 3; f++) {
      const from = pts[2 + Math.floor(hash(n, f + 30) * (pts.length - 4))], fp = [from.slice()]; let fx = from[0], fy = from[1];
      const dir = hash(n, f + 40) < .5 ? -1 : 1;
      for (let s = 0; s < 4; s++) { fx += dir * (3 + hash(n, f * 9 + s) * 6); fy += 3 + hash(n, f * 13 + s) * 4; fp.push([fx, fy]); }
      forks.push(fp);
    }
    return [pts].concat(forks);
  }
  function plot(out, x, y, l, c) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= BW || y >= BH) return; const i = (y * BW + x) * 3; out[i] += c[0] * l; out[i + 1] += c[1] * l; out[i + 2] += c[2] * l; }
  const BOLT = toL('#ecedf0'), BOLTH = toL('#86d6f0'), BEACON = toL('#ff6e4a');
  // view: dawn (0..1) and flash (the lightning, 0..1); t: the run's clock
  function backdrop(t, v) {
    if (!BKD) bakeBackdrop();
    const K = BKD, dawn = clamp(v.dawn || 0, 0, 1), flash = clamp(v.flash || 0, 0, 1.2), off = Math.floor(t * 2.2) % CW;
    // sheet lightning far off in the clouds now and then, nothing more than a glow (worked out from the clock)
    const cyc = Math.floor(t / 7), ct = t - cyc * 7, far = dawn > 0 ? 0 : hash(cyc, 5) < .55 && ct > 3 && ct < 3.35 ? Math.sin((ct - 3) / .35 * Math.PI) * (hash(Math.floor(t * 20), cyc) < .7 ? 1 : .3) : 0;
    const farX = 60 + hash(cyc, 6) * 360;
    if (flash > .3 && K.flashWas <= .3) K.bolt = newBolt(++K.boltN);
    K.flashWas = flash;
    const blink = Math.floor(t * 1.6);
    const key = off + ',' + Math.round(dawn * 24) + ',' + Math.round(flash * 40) + ',' + Math.round(far * 20) + ',' + blink;
    if (key === K.key) return K.out;
    K.key = key;
    const out = K.out, cl = K.cl, rim = K.rim;
    for (let py = 0; py < CYP; py++) {
      const s = K.sky[py], bo = K.body[py], un = K.under[py], ds = K.dsky[py], db = K.dbody[py], du = K.dunder[py];
      for (let px = 0, i = py * BW * 3; px < BW; px++, i += 3) {
        const j = py * CW + (px + off) % CW, d = cl[j], rr = rim[j];
        const st = K.stars[py * BW + px] * Math.max(0, 1 - d * 3) * (1 - dawn);
        let r = s[0] + (bo[0] - s[0]) * d + un[0] * rr + st * .8, gg = s[1] + (bo[1] - s[1]) * d + un[1] * rr + st * .8, b = s[2] + (bo[2] - s[2]) * d + un[2] * rr + st;
        if (dawn > 0) {
          const sx = px - K.dsun[0], sy = py - K.dsun[1], sun = Math.exp(-(sx * sx + sy * sy * 3) / 9000) * .6 * (1 - d * .7);
          const dr = ds[0] + (db[0] - ds[0]) * d + du[0] * rr * 1.4 + sun, dg = ds[1] + (db[1] - ds[1]) * d + du[1] * rr * 1.4 + sun * .8, dbb = ds[2] + (db[2] - ds[2]) * d + du[2] * rr * 1.4 + sun * .4;
          r += (dr - r) * dawn; gg += (dg - gg) * dawn; b += (dbb - b) * dawn;
        }
        if (flash > 0) { const k = flash * (.15 + d * .9 + rr * .6); r += BOLTH[0] * k * .8 + .1 * k; gg += BOLTH[1] * k * .8 + .1 * k; b += BOLTH[2] * k + .12 * k; }
        if (far > 0) { const dx = (px - farX) / 90, k = far * Math.exp(-dx * dx) * d * .35; r += k * .7; gg += k * .6; b += k; }
        out[i] = r; out[i + 1] = gg; out[i + 2] = b;
      }
    }
    for (let i = CYP * BW * 3; i < N * 3; i++) out[i] = K.city[i] + (K.cityD[i] - K.city[i]) * dawn + (flash > 0 ? flash * .04 : 0);
    if (dawn < 1) for (const [x, y, ph] of K.beacons) if ((blink + Math.round(ph)) % 2 === 0) { plot(out, x, y, 1.4 * (1 - dawn), BEACON); plot(out, x - 1, y, .3 * (1 - dawn), BEACON); plot(out, x + 1, y, .3 * (1 - dawn), BEACON); }
    if (flash > .3 && K.bolt) for (const path of K.bolt) {
      const main = path === K.bolt[0], l = (flash - .3) * (main ? 3 : 1.6);
      for (let p = 1; p < path.length; p++) {
        const [x0, y0] = path[p - 1], [x1, y1] = path[p], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        for (let k = 0; k <= n; k++) { const x = x0 + (x1 - x0) * k / n, y = y0 + (y1 - y0) * k / n; plot(out, x, y, l, BOLT); if (main) { plot(out, x - 1, y, l * .25, BOLTH); plot(out, x + 1, y, l * .25, BOLTH); } }
      }
    }
    return out;
  }

  // ---------- the far edge and the things on the roof ----------
  // The roof ends at a low parapet (ROOF.art.edgeZ); p(Loom) stands beyond it, its foot hidden, as it rose.
  const EZ = LM.edgeZ, PH_ = ROOF.parapetH;
  const edgeTop = () => YH(EZ, PH_);
  function quad(c, pts) { poly(g, c, pts); }
  function drawEdge() {
    const z0 = EZ, z1 = EZ + .025, l = PX(-1, z0), r = PX(1, z0);
    quad('#3b3a48', [[PX(-1, z1), YH(z1, PH_)], [PX(1, z1), YH(z1, PH_)], [r, YH(z0, PH_)], [l, YH(z0, PH_)]]);
    quad('#2a2836', [[l, YH(z0, PH_)], [r, YH(z0, PH_)], [r, FY(z0)], [l, FY(z0)]]);
    // the coping's lip, its joints, stains
    rect(l, YH(z0, PH_), r - l, .5, '#5e5e6c');
    for (let u = -1; u < 1; u += .25) { const x = PX(u, z0); rect(x, YH(z0, PH_) + .5, .5, FY(z0) - YH(z0, PH_) - .5, '#1e1c28'); }
    for (let i = 0; i < 14; i++) { const x = l + 3 + hash(i, 4) * (r - l - 6), y = YH(z0, PH_) + 1; rect(x, y, .5, 1 + hash(i, 5) * 2, '#24222f'); }
  }
  // the props, outside the tiles: an air handler, a vent stack, the water tank on its legs, an antenna mast
  const PROPS = [
    { k: 'unit', u: -.86, z: .5 }, { k: 'vent', u: .9, z: .52 }, { k: 'tank', u: -.9, z: .64 }, { k: 'mast', u: .94, z: .7 }, { k: 'duct', u: .78, z: .66 }, { k: 'vent', u: -.66, z: .74 }
  ];
  const box = (u0, u1, z0, z1, h, top, front, side) => {
    quad(front, [[PX(u0, z0), FY(z0)], [PX(u1, z0), FY(z0)], [PX(u1, z0), YH(z0, h)], [PX(u0, z0), YH(z0, h)]]);
    quad(top, [[PX(u0, z0), YH(z0, h)], [PX(u1, z0), YH(z0, h)], [PX(u1, z1), YH(z1, h)], [PX(u0, z1), YH(z1, h)]]);
    const su = u0 > 0 ? u0 : u1;
    if (side) quad(side, [[PX(su, z0), FY(z0)], [PX(su, z1), FY(z1)], [PX(su, z1), YH(z1, h)], [PX(su, z0), YH(z0, h)]]);
  };
  function drawProp(p, t) {
    const s = sc(p.z), x = PX(p.u, p.z), y = FY(p.z), hh = FY(p.z) - YH(p.z, 1);
    if (p.k === 'unit') {
      box(p.u - .08, p.u + .12, p.z, p.z + .05, .13, '#4b4a58', '#3b3a48', '#2f2d3b');
      const fx = PX(p.u + .02, p.z), fy = YH(p.z, .075), r = .05 * hh;
      disc(fx, fy, r, '#1a1824'); ring(fx, fy, r - .5, r, '#5e5e6c');
      const a = t * 9; for (let k = 0; k < 4; k++) line(fx, fy, fx + Math.cos(a + k * 1.57) * (r - .7), fy + Math.sin(a + k * 1.57) * (r - .7), '#4b4a58');
      for (let k = 0; k < 4; k++) rect(PX(p.u - .07, p.z), YH(p.z, .02 + k * .025), PX(p.u - .02, p.z) - PX(p.u - .07, p.z), .5, '#24222f');
    } else if (p.k === 'vent') {
      const w = .025 * 112 * s;
      rect(x - w, YH(p.z, .14), w * 2, y - YH(p.z, .14), '#3b3a48'); rect(x - w, YH(p.z, .14), .5, y - YH(p.z, .14), '#5e5e6c');
      quad('#4b4a58', [[x - w * 2.2, YH(p.z, .15)], [x + w * 2.2, YH(p.z, .15)], [x + w * 1.2, YH(p.z, .19)], [x - w * 1.2, YH(p.z, .19)]]);
      rect(x - w * 2.2, YH(p.z, .15), w * 4.4, .5, '#2a2836');
    } else if (p.k === 'duct') {
      box(p.u - .05, p.u + .1, p.z, p.z + .06, .05, '#4b4a58', '#3b3a48', null);
      for (let u = p.u - .04; u < p.u + .1; u += .03) rect(PX(u, p.z), YH(p.z, .05), .5, FY(p.z) - YH(p.z, .05), '#2f2d3b');
    } else if (p.k === 'tank') {
      const w = .07 * 112 * s, legTop = YH(p.z, .22), top = YH(p.z, .5);
      for (const d of [-.8, -.25, .25, .8]) rect(x + d * w, legTop, .5, y - legTop, '#2a2836');
      line(x - .8 * w, legTop + 2, x + .8 * w, y - 1, '#24222f'); line(x + .8 * w, legTop + 2, x - .8 * w, y - 1, '#24222f');
      rect(x - w, top, w * 2, legTop - top, '#3b3a48');
      for (let k = 0; k < 5; k++) rect(x - w, top + (legTop - top) * (k + .5) / 5, w * 2, .5, '#2f2d3b');
      rect(x - w, top, .5, legTop - top, '#5e5e6c'); rect(x + w - .5, top, .5, legTop - top, '#24222f');
      quad('#4b4a58', [[x - w - .5, top], [x + w + .5, top], [x, top - w * .7]]);
      for (let yy = top + 1; yy < y; yy += 1.5) rect(x + w + .5, yy, 1.5, .5, '#2a2836');   // the ladder
      rect(x + w + .5, top, .5, y - top, '#2a2836'); rect(x + w + 2, top, .5, y - top, '#2a2836');
    } else if (p.k === 'mast') {
      const top = YH(p.z, .95);
      rect(x - .5, top, 1, y - top, '#2f2d3b'); rect(x - .5, top, .5, y - top, '#4b4a58');
      for (let k = 1; k < 5; k++) { const yy = top + (y - top) * k / 5; line(x - 2 + k * .2, yy, x + 2 - k * .2, yy, '#2a2836'); }
      line(x, top + 3, x - 5, y, '#1e1c28'); line(x, top + 3, x + 4, y, '#1e1c28');   // guy wires
      rect(x - 2.5, top + 5, 2, 1.5, '#3b3a48');
    }
  }
  function drawPropGlow(t, dawn) {
    if (dawn >= 1) return;
    const p = PROPS[3], top = YH(p.z, .95), on = Math.floor(t * 1.3) % 2 === 0;
    if (on) alpha(1 - dawn, () => { disc(PX(p.u, p.z), top - .5, 1.5, 'rgba(255,60,40,.35)'); disc(PX(p.u, p.z), top - .5, .5, '#ff6e4a'); });
  }
  function drawSet(t) { drawEdge(); for (const p of PROPS) drawProp(p, t); }

  // ---------- rain ----------
  // two depths of streaks that fall the same way every frame (not scattered afresh), leaning with the wind, and
  // splashes on the roof
  const DROPS = Array.from({ length: 120 }, (_, i) => ({ x: hash(i, 1) * (W + 40) - 20, p: hash(i, 2), v: .8 + hash(i, 3) * .5, near: i % 3 === 0 }));
  // ---------- the weather: the wind and the lightning, worked out from the clock (drawn only) ----------
  // The wind blows from the right: gusts every few seconds over a level the roof sets for the moment (0 calm to 1 the
  // beam). gust(t) is 0..1; wind(t, level) what the rain and the bits on the wind go by.
  const WIND_EVERY = 6.5;
  function gust(t) {
    const c = Math.floor(t / WIND_EVERY), ct = t - c * WIND_EVERY, at = 1 + hash(c, 31) * 3, d = 1.2 + hash(c, 32) * 1.4;
    return ct < at || ct > at + d ? 0 : Math.sin((ct - at) / d * Math.PI) * (.6 + .4 * hash(c, 33));
  }
  const wind = (t, level) => Math.max(0, Math.min(1.3, level * (.45 + gust(t))));
  // A strike now and then, near (a bolt in the clouds and the roof lit white for a frame or two) or far (a glow): its
  // light 0..1 now, which one it is, and a number for the strike (for its thunder).
  const STRIKE_EVERY = 7.5;
  function strike(t) {
    const c = Math.floor(t / STRIKE_EVERY), d = t - c * STRIKE_EVERY - (1.5 + hash(c, 51) * 4.5);
    if (hash(c, 52) < .2 || d < 0 || d > .5) return { k: 0, near: false, n: c };
    const near = hash(c, 53) < .55, k = d < .06 ? 1 : d < .11 ? .15 : d < .19 ? .75 : Math.max(0, .75 - (d - .19) * 2.4);
    return { k: k * (near ? 1 : .27), near, n: c };
  }
  // the bits the wind carries: spray and carpet fluff skidding over the roof, scraps of paper and thread in the air
  const BITS = Array.from({ length: 46 }, (_, i) => ({ air: i % 3 === 0, paper: i % 6 === 0, z: hash(i, 41) * (EZ - .06) - .04, p: hash(i, 42), v: .7 + hash(i, 43) * .6,
    y: 18 + hash(i, 44) * 70, ph: hash(i, 45) * 6.3, col: i % 5 === 1 ? '#c43428' : i % 5 === 3 ? '#e8a028' : '#b4b6c4' }));
  function drawWind(t, level) {
    const w = wind(t, level); if (w < .2) return;
    const n = Math.round(BITS.length * Math.min(1, level));
    for (let i = 0; i < n; i++) {
      const b = BITS[i], k = (b.p + t * b.v * (.18 + .5 * w)) % 1, a = Math.min(1, (w - .2) * 2) * Math.sin(k * Math.PI);
      if (a < .05) continue;
      g.globalAlpha = a * (b.air ? .8 : .6);
      if (b.air) {
        const x = W + 20 - k * (W + 40), y = b.y + Math.sin(t * 3 + b.ph) * 6 + k * 14;
        if (b.paper) { const f = Math.abs(Math.sin(t * 7 + b.ph)); rect(x, y, .5 + f * 1.5, 1.5 - f, '#d2d4dc'); }
        else line(x, y, x + 2.5, y + Math.sin(t * 9 + b.ph) * 1.2, i % 2 ? '#efe3c4' : '#c43428');
      } else {
        const u = 1.15 - k * 2.3, x = PX(u, b.z), s = sc(b.z), y = FY(b.z) - Math.abs(Math.sin(t * 5 + b.ph)) * 1.5 * s;
        line(x, y, x + (1 + w * 3) * s, y, b.col);
      }
    }
    g.globalAlpha = 1;
  }
  function drawRain(t, k = 1, w = 0) {
    if (k <= 0) return;
    const lean = .22 + w * .9, span = W + 40;
    alpha(k, () => {
      for (const d of DROPS) {
        const fall = d.near ? 210 : 140, y = ((d.p + t * d.v * fall / (H + 20)) % 1) * (H + 20) - 10, x = ((d.x - y * lean + 20) % span + span) % span - 20;
        const len = (d.near ? 5 : 2.5) * (1 + w * .4);
        g.globalAlpha = k * (d.near ? .55 : .35) * (1 + w * .3);
        line(x, y, x - len * lean, y + len, d.near ? '#9496a8' : '#5e5e6c');
      }
      // in a strong gust the rain comes in sheets: paler bands of it sweeping across
      if (w > .6) for (let i = 0; i < 3; i++) {
        const x0 = W + 30 - ((t * 140 * (.8 + i * .2) + i * 97) % (W + 80));
        g.globalAlpha = k * (w - .6) * .35;
        for (let j = 0; j < 14; j++) { const y = j * 10 + ((t * 200) % 10); line(x0 - y * lean + j % 3, y, x0 - (y + 8) * lean + j % 3, y + 8, '#b4b6c4'); }
      }
      g.globalAlpha = k * .7;
      for (let i = 0; i < 16; i++) {
        const c = Math.floor(t * 9 + i * .37), u = (hash(c, i) * 2 - 1) * .98, z = hash(i, c) * (EZ - .02) - .04, x = PX(u, z), y = FY(z), s = sc(z);
        if ((t * 9 + i * .37) % 1 > .5) continue;
        dot(x - s, y - s * .5, '#b4b6c4'); dot(x + s, y - s * .5, '#b4b6c4'); dot(x, y - s, '#d2d4dc');
      }
    });
  }

  // ---------- p(Loom): Loomy, grown into a building ----------
  // Loomy's frame (the round-knobbed posts, the warp, the shuttle with its eye, the rolled cloth on its cushion in a
  // basket), its wood now dark and banded with riveted iron, tied into the sky by its threads.
  const POSTW = LM.frame, L0 = LM.left, R0 = LM.right, IN0 = L0 + POSTW, IN1 = R0 - POSTW;
  const WOOD = ['#2c2420', '#3a2014', '#5a3420', '#7a4a2a'], IRON = ['#1a1824', '#24222f', '#3b3a48', '#5e5e6c', '#76788a'];
  function post(x0, top, bot, flip) {
    rect(x0, top, POSTW, bot - top, WOOD[1]);
    rect(flip ? x0 + POSTW - 1 : x0, top, 1, bot - top, WOOD[0]);
    rect(flip ? x0 + .5 : x0 + POSTW - 1.5, top, .5, bot - top, WOOD[2]);
    for (let y = top + 2; y < bot; y += 3.5) rect(x0 + 1 + hash(x0, y) * 2.5, y, .5, 1.5 + hash(y, x0) * 2, WOOD[0]);   // grain
    for (let y = top + 6; y < bot - 2; y += 11) {
      rect(x0 - .5, y, POSTW + 1, 2, IRON[2]); rect(x0 - .5, y, POSTW + 1, .5, IRON[3]);
      dot(x0 + .5, y + 1, IRON[4]); dot(x0 + POSTW - 1, y + 1, IRON[4]);
    }
    // Loomy's round knob, as big now as a water tank
    const kx = x0 + POSTW / 2; disc(kx, top - 2.5, 3.2, WOOD[1]); disc(kx - .8, top - 3.3, 1.6, WOOD[2]); dot(kx - 1.2, top - 4.1, WOOD[3]);
    rect(kx - 2, top - .5, 4, 1, IRON[2]);
  }
  function spool(i, x, y, Q, R, HPS) {
    const w = LM.spoolW, broken = i < Q.broken, hw = w / 2;
    const fresh = broken && Q.respool > 0 && !['pinch', 'fusion', 'lines', 'beam', 'run', 'one', 'snap', 'dawn', 'ending', 'clear'].includes(Q.state);
    // the flanges and the core
    rect(x - hw - .5, y - 1, 1.5, 9, IRON[1]); rect(x + hw - 1, y - 1, 1.5, 9, IRON[1]);
    rect(x - hw - .5, y - 1, .5, 9, IRON[3]); rect(x + hw - 1, y - 1, .5, 9, IRON[3]);
    if (fresh) {
      const left = ['return', 'flood'].includes(Q.state) ? Q.caught / Math.max(1, Q.capturedTotal) : 1, ww = Math.max(1, (w - 3) * Q.respool * left);
      rect(x - ww / 2, y + 3.5 - ww * .12, ww, 1 + ww * .24, '#b4b6c4');
      // in the quiet, a soul on the middle spool strains to get loose (the tell for what comes next)
      if (i === 1 && Q.state === 'quiet') { const sh = Math.sin(R.t * 40) * Math.min(2, Q.quietT), lift = Math.min(4, Q.quietT * 2); rect(x - 2 + sh, y - 2 - lift, 4, 5, '#ffffff'); dot(x - 1 + sh, y - .5 - lift, '#1a1824'); dot(x + .5 + sh, y - .5 - lift, '#1a1824'); }
      return;
    }
    if (broken) {
      rect(x - hw + 1, y + 3, w - 2, 1.5, IRON[2]);
      // the snapped end hangs and swings
      const sw = Math.sin(R.t * 1.7 + i) * 2.5;
      line(x - 2, y + 4.5, x - 2 + sw, y + 13, '#b0a088'); line(x + 1, y + 4.5, x + 1 + sw * .7, y + 9, '#8c7a68');
      return;
    }
    // wound thread: gold, wrap lines, a highlight
    rect(x - hw + 1, y, w - 2, 7, '#c87818');
    for (let k = 0; k < 7; k += 1) rect(x - hw + 1, y + k + .5, w - 2, .5, k % 2 ? '#9a5214' : '#e8a028');
    rect(x - hw + 1, y + 1, w - 2, .5, '#f8cc50');
    if (i === Q.round - 1 && /^round/.test(Q.state)) {
      // damage: the thread frays and the flanges split, more with every hit
      const dmg = 1 - Q.hp / HPS, j = Q.kick > 0 ? (Math.random() - .5) : 0;
      for (let k = 0; k < Math.floor(dmg * 7); k++) {
        const fx = x - hw + 2 + hash(i, k) * (w - 4) + j;
        line(fx, y + 1, fx + (hash(k, i) - .5) * 2, y + 6, '#3a2014');
        line(fx, y + 7, fx + (hash(k, 9) - .5) * 4, y + 9 + hash(k, 3) * 3, '#e8a028');
      }
      if (dmg > .5) { line(x - hw - .5, y + 1, x - hw + .5, y + 5, IRON[0]); line(x + hw - .5, y + 7, x + hw - 1, y + 3, IRON[0]); }
    }
  }
  // the warp: fine threads from the beam to the cloth; a broken spool's third hangs slack
  function warp(Q, R, dead) {
    const n = 44, top = LM.beam + 1, bot = LM.fell;
    for (let i = 0; i < n; i++) {
      const x = IN0 + 1 + i * (IN1 - IN0 - 2) / (n - 1), third = Math.min(2, Math.floor(i / n * 3)), slack = third < Q.broken;
      const c = i % 2 ? '#8c7a68' : '#b0a088';
      if (dead) { line(x, top, x + Math.sin(i * 7) * 1.5, top + 3 + hash(i, 2) * 4, c); line(x, bot, x + Math.sin(i * 3) * 1.5, bot - 2 - hash(i, 3) * 3, c); continue; }
      if (slack) { const sw = Math.sin(R.t * 1.3 + i * .6) * 1.5; line(x, top, x + sw, top + 6 + hash(i, 1) * 4, c); line(x, bot, x - sw * .6, bot - 4 - hash(i, 4) * 3, c); continue; }
      g.globalAlpha = .9; line(x, top, x, bot, c); g.globalAlpha = 1;
    }
    // the heddles: a frame across the warp with its little eyes
    rect(IN0, LM.heddle, IN1 - IN0, 2, IRON[1]); rect(IN0, LM.heddle, IN1 - IN0, .5, IRON[3]);
    for (let x = IN0 + 1; x < IN1; x += 1.5) dot(x, LM.heddle + 1, '#76788a');
  }
  function shuttleX(Q) { return PX(Q.eye.u, ROOF.eyeZ); }
  function eyeY() { return YH(ROOF.eyeZ, ROOF.eyeH); }
  // the shuttle Loomy's eye rides in: a long boat of dark wood, iron-tipped, on the race; the socket in its middle
  function shuttle(x, y, s, Q, R, part = 'all') {
    const L = 19 * s, hh = 3.6 * s;
    if (part !== 'socket') {
    quad(WOOD[1], [[x - L, y + .5], [x - L * .6, y - hh], [x + L * .6, y - hh], [x + L, y + .5], [x + L * .6, y + hh], [x - L * .6, y + hh]]);
    quad(WOOD[2], [[x - L * .6, y - hh], [x + L * .6, y - hh], [x + L * .55, y - hh + 1], [x - L * .55, y - hh + 1]]);
    quad(IRON[3], [[x - L, y + .5], [x - L * .78, y - hh * .6], [x - L * .78, y + hh * .6]]);
    quad(IRON[3], [[x + L, y + .5], [x + L * .78, y - hh * .6], [x + L * .78, y + hh * .6]]);
    }
    if (part === 'body') return;
    // the socket: an iron ring with rivets
    const r = 9 * s;
    ring(x, y, r, r + 2 * s, IRON[2]); ring(x, y, r + 1.5 * s, r + 2 * s, IRON[1]);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 + .3; dot(x + Math.cos(a) * (r + 1) - .25, y + Math.sin(a) * (r + 1) - .25, IRON[4]); }
    // its armour cracks under the streams before the beam (the look only)
    if (['return', 'flood', 'pinch'].includes(Q.state)) {
      const k = Math.min(1, (Q.armour || 0) / ROOF.armourCracks), n = Math.floor(k * 9);
      for (let i = 0; i < n; i++) { const a = i * 2.4 + 1.1, r0 = r + 2 * s, r1 = r - 1 - k * 2 - (i % 3) * .5; line(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a + .2) * r1, y + Math.sin(a + .2) * r1, '#c8ccd8'); }
    }
  }
  // the socket once the eye has torn out of it: a black hole, the stubs of its wiring, a torn thread swinging
  function emptySocket(x, y, t) {
    disc(x, y, 9, '#08070c');
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + .2, l = 2 + hash(k, 5) * 2.5; line(x + Math.cos(a) * 9, y + Math.sin(a) * 9, x + Math.cos(a) * (9 - l), y + Math.sin(a) * (9 - l), k % 3 ? '#4b4a58' : '#9c2622'); }
  }
  // what the eye looks like now: the iris colours, where it looks, how open, cracks
  const IRIS = {
    watch: ['#521418', '#c43428', '#ff6e4a', '#f8cc50'], fire: ['#340e12', '#9c2622', '#e44a34', '#ff8ab4'],
    hot: ['#9a5214', '#e8a028', '#fff09a', '#ffffff'], dead: ['#110f18', '#24222f', '#2f2d3b', '#3b3a48'], blue: ['#1a5076', '#2a7aa6', '#46aad4', '#86d6f0']
  };
  // An eye drawn like Loomy's (dark rings, an iris that shifts to look, a big pupil, the catchlights), at any size:
  // r is its radius in this context's units, p the size of one pixel there (.5 in the game, 1 for a close-up).
  // o: { iris, gx, gy, cracks (0..1), crackGlow, lid (0..1), pupil (scale), t }
  function bigEye(gx2, x, y, r, p, o) {
    const prev = g; g = gx2;
    const snap = v => Math.round(v / p) * p, cols = IRIS[o.iris] || IRIS.watch;
    const D = (cx, cy, rr, c) => { g.fillStyle = c; cx = snap(cx); cy = snap(cy); const n = Math.round(rr / p); for (let dy = -n; dy <= n; dy++) { const w = Math.floor(Math.sqrt(n * n - dy * dy + n * .5)); g.fillRect(cx - w * p, cy + dy * p, (2 * w + 1) * p, p); } };
    D(x, y, r, '#08070c'); D(x, y, r - p, '#110f18');
    const ir = r * .74, ix = x + (o.gx || 0) * r * .22, iy = y + (o.gy || 0) * r * .22;
    D(ix, iy, ir, cols[0]); D(ix, iy, ir - Math.max(p, r * .08), cols[1]); D(ix, iy, ir * .78, cols[2]);
    // fibres: short spokes from the pupil out, in the iris's darker colour (only where there's room for them)
    if (r / p > 14) for (let k = 0; k < 28; k++) {
      const a = k / 28 * Math.PI * 2 + (o.t || 0) * .05, r0 = ir * .4, r1 = ir * (.62 + hash(k, 4) * .14);
      for (let q = r0; q < r1; q += p) { g.fillStyle = k % 2 ? cols[1] : cols[3]; g.globalAlpha = k % 2 ? .5 : .25; g.fillRect(snap(ix + Math.cos(a) * q), snap(iy + Math.sin(a) * q), p, p); }
      g.globalAlpha = 1;
    }
    D(ix, iy, ir * .5, cols[2]);
    const pr = ir * .42 * (o.pupil == null ? 1 : o.pupil);
    D(ix, iy, pr, o.iris === 'hot' ? '#ffffff' : '#08070c');
    if (o.iris !== 'dead') {
      // Loomy's catchlights: one small up-left of the pupil in the light colour, one white up-right
      g.fillStyle = cols[3]; g.fillRect(snap(ix - pr - p), snap(iy - pr), Math.max(p, r * .07), Math.max(p, r * .07));
      g.fillStyle = '#ffffff'; g.fillRect(snap(ix + pr * .6), snap(iy - pr * 1.1), Math.max(p, r * .12), Math.max(p, r * .12));
    }
    // a gloss along the lens's upper left, as on Loomy's (where there's room for one)
    if (r / p > 10 && o.iris !== 'dead') {
      for (let a = 3.5; a < 4.6; a += p / r) { g.fillStyle = '#ffffff'; g.globalAlpha = .35 * Math.sin((a - 3.5) / 1.1 * Math.PI); g.fillRect(snap(x + Math.cos(a) * r * .82), snap(y + Math.sin(a) * r * .82), Math.max(p, r * .04), Math.max(p, r * .04)); }
      g.globalAlpha = 1;
    }
    // cracks across the lens
    const nc = Math.floor((o.cracks || 0) * 7);
    for (let k = 0; k < nc; k++) {
      let a = hash(k, 77) * Math.PI * 2, cx = x + Math.cos(a) * r * .95, cy = y + Math.sin(a) * r * .95;
      const steps = 3 + Math.floor(hash(k, 3) * 3);
      for (let s = 0; s < steps; s++) {
        const na = a + Math.PI + (hash(k, s + 9) - .5) * 1.4, len = r * (.18 + hash(s, k) * .2), nx = cx + Math.cos(na) * len, ny = cy + Math.sin(na) * len;
        const n = Math.max(1, Math.round(len / p));
        const heat = o.crackGlow ? o.heat || 0 : 0, col = !o.crackGlow ? '#08070c' : heat > .66 ? '#fff09a' : heat > .33 ? '#f8cc50' : '#ff6e4a';
        for (let i = 0; i <= n; i++) {
          const px2 = snap(cx + (nx - cx) * i / n), py2 = snap(cy + (ny - cy) * i / n);
          if (heat > .2) { g.globalAlpha = .25 + heat * .35; g.fillStyle = '#ff9628'; g.fillRect(px2 - p, py2, 3 * p, p); g.fillRect(px2, py2 - p, p, 3 * p); g.globalAlpha = 1; }
          g.fillStyle = col; g.fillRect(px2, py2, p, p);
        }
        cx = nx; cy = ny; a = na + Math.PI;
      }
    }
    // the lids: iron shutters from above and below, as Loomy's wooden lid (shut, they meet in the middle)
    if (o.lid > 0) {
      const hgt = r * o.lid;
      g.save(); g.beginPath(); g.arc(x, y, r + p, 0, Math.PI * 2); g.clip();
      g.fillStyle = '#3b3a48'; g.fillRect(x - r - p, y - r - p, 2 * r + 2 * p, hgt + p); g.fillRect(x - r - p, y + r - hgt, 2 * r + 2 * p, hgt + p);
      g.fillStyle = '#5e5e6c'; g.fillRect(x - r - p, y - r - p + hgt, 2 * r + 2 * p, p);
      g.fillStyle = '#1a1824'; g.fillRect(x - r - p, y + r - hgt, 2 * r + 2 * p, p); g.restore();
    }
    g = prev;
  }
  function eyeState(Q, R) {
    const dead = ['snap', 'dawn', 'ending', 'clear'].includes(Q.state), open = Q.stall > 0 || Q.onEye;
    return { dead, open, iris: dead ? 'dead' : open ? 'hot' : Q.atk && Q.atk.stage === 'run' ? 'fire' : 'watch' };
  }
  // esc: the ending's escape, when it's on (jitter: the shuttle thrashing; gone: the eye has torn out of it)
  function drawLoom(Q, R, HPS, sil, esc) {
    const dead = ['snap', 'dawn', 'ending', 'clear'].includes(Q.state);
    // the threads that tie it into the sky, fanning up into the clouds from its crown; hawsers from the knobs
    for (let i = 0; i < 11; i++) {
      const x0 = IN0 + 2 + i * (IN1 - IN0 - 4) / 10, x1 = x0 + (x0 - VX) * 2.2;
      if (dead && i % 3) continue;
      alpha(.6, () => line(x0, LM.crown, x1, -2, '#8c7a68'));
    }
    for (const x of [L0 + POSTW / 2, R0 - POSTW / 2]) { const x1 = x + (x - VX) * 1.6; line(x, LM.crown - 6, x1, -2, '#54463c'); line(x + .5, LM.crown - 6, x1 + .5, -2, '#3e332c'); }
    post(L0, LM.crown, LM.base, false); post(R0 - POSTW, LM.crown, LM.base, true);
    // the crown: a crossbar between the knobs, iron-banded
    rect(IN0 - .5, LM.crown + .5, IN1 - IN0 + 1, 3, WOOD[1]); rect(IN0 - .5, LM.crown + .5, IN1 - IN0 + 1, .5, WOOD[2]); rect(IN0 - .5, LM.crown + 3, IN1 - IN0 + 1, .5, WOOD[0]);
    for (const x of [IN0 + 8, VX - 1, IN1 - 10]) { rect(x, LM.crown, 2, 4, IRON[2]); dot(x + .5, LM.crown + 1.5, IRON[4]); }
    // the warp runs up from the spools over the crown
    for (let i = 0; i < 14; i++) { const x = IN0 + 2 + i * (IN1 - IN0 - 4) / 13; alpha(.5, () => line(x, LM.crown + 3.5, x + (VX - x) * .05, LM.top, i % 2 ? '#8c7a68' : '#6e5e50')); }
    // the warp beam the spools sit on
    rect(IN0 - 1, LM.top + 7, IN1 - IN0 + 2, 3.5, WOOD[1]); rect(IN0 - 1, LM.top + 7, IN1 - IN0 + 2, .5, WOOD[2]);
    for (const x of [IN0 + 1, VX, IN1 - 2]) rect(x, LM.top + 6.5, 1.5, 4.5, IRON[2]);
    rect(IN0, LM.beam - .5, IN1 - IN0, 1.5, IRON[1]);
    for (let i = 0; i < 3; i++) spool(i, LM.spools[i], LM.top + .5, Q, R, HPS);
    // dark behind the warp, so the eye and the souls stand out against it
    if (!sil) rect(IN0, LM.beam + 1, IN1 - IN0, LM.fell - LM.beam - 1, '#14121c');
    warp(Q, R, dead);
    // the race the shuttle runs on, out past the posts to a shuttle box at each end (as a fly-shuttle loom's), so the
    // eye's rail is wider than the frame and the shuttle runs into a box, not off the loom; and the reed with its comb
    const ey = eyeY(), BX = LM.box;
    rect(L0 - BX, ey + 4, R0 - L0 + 2 * BX, 2, IRON[2]); rect(L0 - BX, ey + 4, R0 - L0 + 2 * BX, .5, IRON[4]);
    for (let x = L0 - BX + 2; x < R0 + BX - 1; x += 6) dot(x, ey + 5, IRON[0]);
    for (const x of [L0 - BX + 1, R0 + BX - 2.5]) { rect(x, ey + 6, 1.5, 4, IRON[1]); dot(x + .5, ey + 7, IRON[3]); }   // its brackets
    rect(IN0, LM.reed, IN1 - IN0, 2.5, IRON[1]); rect(IN0, LM.reed, IN1 - IN0, .5, IRON[3]);
    for (let x = IN0 + .5; x < IN1; x += 1) dot(x, LM.reed + 2.5, IRON[2]);
    // the cloth: carpet coming off the loom, its pile in rows, gold stripes, a diamond, fringe on the fell
    rect(IN0, LM.fell, IN1 - IN0, LM.roll - LM.fell, '#9c2622');
    for (let y = LM.fell + .5; y < LM.roll; y += 1) rect(IN0, y, IN1 - IN0, .5, '#761c1e');
    for (const y of [LM.fell + 2, LM.roll - 2.5]) { rect(IN0, y, IN1 - IN0, 1, '#c87818'); rect(IN0, y, IN1 - IN0, .5, '#e8a028'); }
    const my = (LM.fell + LM.roll) / 2 + .5; for (let k = 0; k < 3; k++) for (let d = 0; d < 2.5; d += .5) { const cx = VX - 16 + k * 16; dot(cx - 2.5 + d, my - d, '#e8a028'); dot(cx + 2.5 - d, my - d, '#e8a028'); dot(cx - 2.5 + d, my + d, '#e8a028'); dot(cx + 2.5 - d, my + d, '#e8a028'); }
    // Loomy's cushion, now the breast beam: a fat roll of finished carpet
    rect(IN0 - 2, LM.roll, IN1 - IN0 + 4, LM.basket - LM.roll, '#761c1e');
    rect(IN0 - 2, LM.roll + .5, IN1 - IN0 + 4, 1, '#c43428'); rect(IN0 - 2, LM.roll + 1.5, IN1 - IN0 + 4, .5, '#e44a34');
    for (let x = IN0; x < IN1; x += 7) { line(x, LM.roll + 2, x + 3, LM.basket - 1, '#c87818'); }
    rect(IN0 - 2, LM.basket - 1, IN1 - IN0 + 4, 1, '#340e12');
    for (const x of [IN0 - 3, IN1 + 1]) { rect(x, LM.roll - .5, 2, LM.basket - LM.roll + 1, IRON[2]); dot(x + .5, LM.roll + 2, IRON[4]); }
    // the basket, mostly behind the roof's edge: wicker, woven on the slant, a braided rim
    rect(L0 - 1, LM.basket, R0 - L0 + 2, LM.base - LM.basket, '#2c2420');
    for (let y = LM.basket + 1.5; y < LM.base; y += 2) for (let x = L0; x < R0; x += 2) { const o = Math.round(y * 2) % 4 ? 1 : 0; dot(x + o, y, '#54463c'); dot(x + o + .5, y + .5, '#3e332c'); }
    rect(L0 - 1.5, LM.basket - .5, R0 - L0 + 3, 1.5, '#54463c'); for (let x = L0 - 1; x < R0 + 1; x += 1.5) dot(x, LM.basket, '#6e5e50');
    // the shuttle and its socket; the eye itself glows (drawEyeGlow)
    const sx = shuttleX(Q) + (Q.kick > 0 ? Math.round((Math.random() - .5) * 3) : 0) + (esc && !esc.gone ? esc.jitter : 0);
    shuttle(sx, ey, 1, Q, R, 'body');
    // the shuttle boxes at the race's ends, drawn over the shuttle's tips as it runs in
    for (const [x0, w] of [[L0 - BX, BX + 1], [R0 - 1, BX + 1]]) {
      rect(x0, ey - 5, w, 9.5, IRON[1]); rect(x0, ey - 5, w, .5, IRON[3]); rect(x0, ey + 4, w, .5, IRON[0]);
      rect(x0 + .5, ey - 3.5, w - 1, 6, IRON[2]);
      for (const yy of [ey - 3, ey + 2]) { dot(x0 + 1, yy, IRON[4]); dot(x0 + w - 1.5, yy, IRON[4]); }
    }
    shuttle(sx, ey, 1, Q, R, 'socket');
    if (esc && esc.gone) emptySocket(sx, ey, R.t);
    if (Q.round === 3 && /^round/.test(Q.state)) shuttle(PX(Q.twinU, ROOF.eyeZ), YH(ROOF.eyeZ, ROOF.eyeH - .08), .62, Q, R);
    // the weft trailing from the shuttle back to the post it last left
    if (!dead) { const sx = shuttleX(Q), side = (Q.eye.v || 0) < 0 || Q.eye.u > 0 ? IN1 : IN0; alpha(.6, () => line(sx + (side > sx ? 19 : -19), ey + .5, side, ey + 1.5, '#d8c8a8')); }
  }
  function drawEyeGlow(Q, R, bull) {
    const st = eyeState(Q, R), x = shuttleX(Q) + (Q.kick > 0 ? Math.round((Math.random() - .5) * 3) : 0) + (Q.round === 3 && /^round/.test(Q.state) ? Math.round((Math.random() - .5) * 1.2) : 0), y = eyeY();
    const flick = Q.state === 'wake' && Q.t < ROOF.rise.eyeFlicker && [0, 1, 0, 0, 1, 1, 0, 1][Math.floor(Q.t * 8)] === 0;
    const shut = ['elevator', 'walk', 'flash'].includes(Q.state) || flick;
    const gx = clamp((bull.u - Q.eye.u) * 2, -1, 1), gy = .5;
    const cracks = Math.min(1, Q.hits / (ROOF.spools * (ROOF.hitsPerSpool[0])) + (1 - Q.odds / ROOF.odds) * ((['lines', 'beam', 'run', 'one', 'snap', 'dawn', 'ending', 'clear'].includes(Q.state)) ? .9 : 0));
    if (st.open && !shut) {
      // open: hot, with a pulsing ring and a ring counting down what's left of the opening
      const pulse = .5 + .5 * Math.sin(R.t * 16);
      disc(x, y, 11 + pulse, 'rgba(255,212,74,.18)');
      if (Q.stall > 0) {
        const left = Q.stall / Math.max(.01, Q.stallMax || ROOF.fight.open);
        g.save(); g.lineWidth = .5; g.strokeStyle = 'rgba(255,255,255,' + (.45 + .5 * pulse) + ')'; g.beginPath(); g.arc(x, y, 12 + pulse * 1.5, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 1; g.strokeStyle = '#ffd44a'; g.beginPath(); g.arc(x, y, 14.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.stroke(); g.restore();
      }
    }
    // with the beam on it, the cracks heat up as the odds fall: red, then gold, then white-hot
    const heat = ['lines', 'beam', 'run', 'one'].includes(Q.state) ? 1 - Q.odds / ROOF.odds : 0;
    bigEye(g, x, y, 9, .5, { iris: shut ? 'dead' : st.iris, gx: st.open ? 0 : gx, gy: st.open ? 0 : gy, cracks, crackGlow: !st.dead && cracks > .2, heat, lid: shut ? 1 : Q.slam > 0 ? Math.min(1, Q.slam * 4) : 0, pupil: st.open ? .35 + .1 * Math.sin(R.t * 30) : Q.atk && Q.atk.stage === 'run' ? .65 : 1, t: R.t });
    if (shut && !flick && Q.state !== 'elevator' && Q.state !== 'walk') line(x - 6, y, x + 6, y, '#c87818');
    if (Q.round === 3 && /^round/.test(Q.state)) {
      const tx = PX(Q.twinU, ROOF.eyeZ), ty = YH(ROOF.eyeZ, ROOF.eyeH - .08), firing = Q.atk.stage === 'run' && Q.atk.list.some(l => l.twin);
      bigEye(g, tx, ty, 5.5, .5, { iris: firing ? 'fire' : 'watch', gx: clamp((bull.u - Q.twinU) * 2, -1, 1), gy: .5, pupil: firing ? .6 : 1 });
    }
  }

  // ---------- the tiles, closer ----------
  // a slab's texture: a lit far edge, a darker near edge, specks of grit, now and then a hairline crack; worked out
  // per tile from its number, so it holds still
  const tileQ = (c, r, u0, u1, z0, z1) => {
    const TW = 2 * ROOF.aisle / GR.cols, uu = roof.tileU(c) - TW / 2, zz = GR.z0 + r * GR.depth;
    return [[PX(uu + u0 * TW, zz + z0 * GR.depth), FY(zz + z0 * GR.depth)], [PX(uu + u1 * TW, zz + z0 * GR.depth), FY(zz + z0 * GR.depth)], [PX(uu + u1 * TW, zz + z1 * GR.depth), FY(zz + z1 * GR.depth)], [PX(uu + u0 * TW, zz + z1 * GR.depth), FY(zz + z1 * GR.depth)]];
  };
  const at = (c, r, u, z) => { const TW = 2 * ROOF.aisle / GR.cols, uu = roof.tileU(c) - TW / 2 + u * TW, zz = GR.z0 + (r + z) * GR.depth; return [PX(uu, zz), FY(zz)]; };
  function slab(c, r) {
    quad('#8a8696', tileQ(c, r, .04, .96, .9, .96));
    quad('#625e70', tileQ(c, r, .04, .96, .04, .1));
    const n = c * 7 + r * 31;
    for (let k = 0; k < 16; k++) { const [x, y] = at(c, r, .08 + hash(n, k) * .84, .12 + hash(k, n) * .76); dot(x, y, hash(n + 1, k) < .5 ? '#5a5668' : '#8e8a9c'); }
    if (hash(n, 99) < .4) { const [x0, y0] = at(c, r, .2 + hash(n, 3) * .3, .2), [x1, y1] = at(c, r, .5 + hash(n, 4) * .3, .55), [x2, y2] = at(c, r, .45 + hash(n, 5) * .4, .85); line(x0, y0, x1, y1, '#4e4a5c'); line(x1, y1, x2, y2, '#4e4a5c'); }
  }
  function carpet(c, r) {
    for (let k = 1; k < 12; k++) { const p = tileQ(c, r, .08, .92, k / 12, k / 12 + .02); quad('#9c2128', p); }
    quad('#e0b040', tileQ(c, r, .08, .11, .08, .92)); quad('#e0b040', tileQ(c, r, .89, .92, .08, .92));
    const [cx, cy] = at(c, r, .5, .5), s = sc(GR.z0 + (r + .5) * GR.depth);
    for (let d = 0; d <= 3 * s; d += .5) { dot(cx - 3 * s + d, cy - d * .45, '#e0b040'); dot(cx + 3 * s - d, cy - d * .45, '#e0b040'); dot(cx - 3 * s + d, cy + d * .45, '#e0b040'); dot(cx + 3 * s - d, cy + d * .45, '#e0b040'); }
  }

  // ---------- the beam ----------
  // The fused souls: as wide as he is at the gun and still thick at the eye; a dark-orange edge that crackles,
  // orange, gold, a white-hot core that wobbles; two white strands twisting round the core, rings of light running up
  // it, souls streaming inside it, sparks spitting off its edge, a sunburst at the gun and a flare where it lands.
  const BEAM_SOULS = Array.from({ length: 14 }, (_, i) => ({ k: hash(i, 3), sp: .55 + hash(i, 4) * .5, off: hash(i, 5) * 2 - 1 }));
  function beamPoints(pts0) {
    pts0.forEach((p, i) => {
      const a = pts0[Math.max(0, i - 1)], b = pts0[Math.min(pts0.length - 1, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
      p.nx = -ty / l; p.ny = tx / l;
    });
    return pts0;
  }
  function ribbon(pts, mul, col, a, t, wob) {
    g.save(); g.globalAlpha *= a; g.fillStyle = col; g.beginPath();
    const n = pts.length - 1;
    for (let k = 0; k <= n; k++) { const p = pts[k], w = p.hw * mul * (1 + wob * Math.sin(t * 52 + k * 1.7)); k ? g.lineTo(p.x + p.nx * w, p.y + p.ny * w) : g.moveTo(p.x + p.nx * w, p.y + p.ny * w); }
    for (let k = n; k >= 0; k--) { const p = pts[k], w = p.hw * mul * (1 + wob * Math.sin(t * 47 + k * 2.3)); g.lineTo(p.x - p.nx * w, p.y - p.ny * w); }
    g.closePath(); g.fill(); g.restore();
  }
  const along = (pts, k) => { const f = clamp(k, 0, 1) * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), e = f - i, a = pts[i], b = pts[i + 1]; return { x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e, hw: a.hw + (b.hw - a.hw) * e, nx: a.nx, ny: a.ny }; };
  // the bow: how far (roof units) the beam's middle swings the other way while he walks; eased, so it lags and settles
  const BOW = { u: null, t: 0, v: 0, a: 0 };
  function beamBow(u, t) {
    const dt = t - BOW.t;
    if (BOW.u === null || dt <= 0 || dt > .2) { BOW.u = u; BOW.t = t; return BOW.a; }
    const v = (u - BOW.u) / dt; BOW.u = u; BOW.t = t;
    BOW.v += (v - BOW.v) * Math.min(1, dt * 10);
    BOW.a += (clamp(-BOW.v * .16, -.18, .18) - BOW.a) * Math.min(1, dt * 7);
    return BOW.a;
  }
  // scraps of thread torn off the loom while the beam is on the eye: cream warp and red-and-gold cloth, flung out and
  // falling, curling as they go (drawn only; their own clock)
  const SCRAPS = [], SCRAP_COLS = ['#d8c8a8', '#b0a088', '#c43428', '#e8a028', '#d8c8a8'];
  let scrapT = null, scrapDue = 0;
  function scraps(t, on, eye) {
    const dt = scrapT === null ? 0 : clamp(t - scrapT, 0, .1); scrapT = t;
    if (on && eye) {
      scrapDue += dt * 48;
      while (scrapDue >= 1) {
        scrapDue--;
        const a = -Math.PI / 2 + (Math.random() - .5) * 3, v = 30 + Math.random() * 55;
        SCRAPS.push({ x: eye.x + (Math.random() - .5) * 26, y: eye.y + (Math.random() - .5) * 18, vx: Math.cos(a) * v, vy: Math.sin(a) * v, len: 2.5 + Math.random() * 4, ang: Math.random() * 6, spin: (Math.random() - .5) * 14, life: 0, dur: .9 + Math.random() * .8, col: SCRAP_COLS[Math.floor(Math.random() * SCRAP_COLS.length)] });
      }
    } else scrapDue = 0;
    for (const s of SCRAPS) { s.life += dt; s.vy += 70 * dt; s.vx *= 1 - dt * .8; s.x += s.vx * dt; s.y += s.vy * dt; s.ang += s.spin * dt; }
    for (let i = SCRAPS.length - 1; i >= 0; i--) if (SCRAPS[i].life >= SCRAPS[i].dur || SCRAPS.length > 120 && i < SCRAPS.length - 120) SCRAPS.splice(i, 1);
    for (const s of SCRAPS) {
      const k = s.life / s.dur, c = Math.cos(s.ang) * s.len, sn = Math.sin(s.ang) * s.len, bend = Math.sin(s.life * 9) * .8;
      alpha(1 - k * k, () => { line(s.x - c / 2, s.y - sn / 2, s.x + bend, s.y + bend * .5, s.col); line(s.x + bend, s.y + bend * .5, s.x + c / 2, s.y + sn / 2, s.col); });
    }
  }
  // pts: the centre line from the gun (0) to the eye (end), each with hw (its half width); onEye: it's landing on it;
  // eye: where the eye is, for the scraps torn off round it
  function drawBeam(pts, t, onEye, eye) {
    beamPoints(pts);
    const n = pts.length - 1;
    ribbon(pts, 2.6, '#761c1e', .3, t, .2);
    ribbon(pts, 1.8, '#c43428', .55, t, .16);
    ribbon(pts, 1.35, '#e44a34', 1, t, .12);
    ribbon(pts, .98, '#f8a030', 1, t, .1);
    ribbon(pts, .6, '#f8cc50', 1, t, .08);
    // the core flickers between white and pale gold
    ribbon(pts, .26, Math.floor(t * 30) % 3 ? '#ffffff' : '#fff6e0', 1, t, .25);
    // crackle: dark-orange specks off the edge, moving up the beam
    for (let k = 0; k < 40; k++) {
      const q = ((k / 40) + t * 1.3) % 1, p = along(pts, q), side = k % 2 ? 1 : -1, w = p.hw * (1.35 + .5 * hash(k, Math.floor(t * 20)));
      dot(p.x + p.nx * w * side, p.y + p.ny * w * side, hash(k, Math.floor(t * 15)) < .5 ? '#ff6e4a' : '#ffd44a');
    }
    // two strands twisting round the core
    for (const ph of [0, Math.PI]) {
      let last = null;
      for (let k = 0; k <= 40; k++) {
        const q = k / 40, p = along(pts, q), w = Math.sin(q * 18 - t * 16 + ph) * p.hw * .7, x = p.x + p.nx * w, y = p.y + p.ny * w;
        if (last && Math.cos(q * 18 - t * 16 + ph) > -.2) line(last[0], last[1], x, y, '#ffffff');
        last = [x, y];
      }
    }
    // rings of light running up it
    for (let k = 0; k < 4; k++) {
      const q = ((k / 4) + t * 2.2) % 1, p = along(pts, q), w = p.hw * 1.5;
      alpha(.75 * (1 - q * .5), () => line(p.x + p.nx * w, p.y + p.ny * w, p.x - p.nx * w, p.y - p.ny * w, '#fff6e0'));
    }
    // the souls in it, streaming to the eye
    for (const s of BEAM_SOULS) {
      const q = (s.k + t * s.sp) % 1, p = along(pts, q), w = p.hw * .45 * s.off, sz = clamp(p.hw / 16, .16, .34), img = tinted(A.GHOST, '#fff6e0');
      alpha(.55 * Math.sin(q * Math.PI), () => g.drawImage(img, p.x + p.nx * w - A.uw(A.GHOST) * sz / 2, p.y + p.ny * w - A.uh(A.GHOST) * sz / 2, A.uw(A.GHOST) * sz, A.uh(A.GHOST) * sz));
    }
    // sparks off its edge
    for (let k = 0; k < 10; k++) {
      const q = hash(k, Math.floor(t * 12)), p = along(pts, q), side = hash(k + 3, Math.floor(t * 12)) < .5 ? 1 : -1, life = (t * 12) % 1;
      const sx = p.x + p.nx * p.hw * side * (1.2 + life * 2), sy = p.y + p.ny * p.hw * side * (1.2 + life * 2) + life * 3;
      dot(sx, sy, '#fff09a');
    }
    // a sunburst at the gun, a flare where it lands
    const g0 = pts[0], e = pts[n], fl = Math.floor(t * 30) % 2;
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + t * 3, l = (k % 2 ? 7 : 11) + fl * 2; alpha(.6, () => line(g0.x, g0.y, g0.x + Math.cos(a) * l, g0.y + Math.sin(a) * l * .7, '#ffd44a')); }
    disc(g0.x, g0.y, 6 + fl, '#ffd44a'); disc(g0.x, g0.y, 3.5, '#ffffff');
    const er = onEye ? 5.5 + fl : 5 + fl;
    alpha(onEye ? .2 : .35, () => disc(e.x, e.y, er * 1.8, '#ff9628'));
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2 - t * 4, l = er * (k % 2 ? 1.3 : 2.1); alpha(.7, () => line(e.x, e.y, e.x + Math.cos(a) * l, e.y + Math.sin(a) * l, onEye ? '#ffffff' : '#ffd44a')); }
    disc(e.x, e.y, er, onEye ? '#fff09a' : '#ff9628'); disc(e.x, e.y, er * .5, '#ffffff');
    if (onEye) for (let k = 0; k < 8; k++) { const a = hash(k, Math.floor(t * 10)) * Math.PI * 2, l = 6 + ((t * 10 + k * .13) % 1) * 14; dot(e.x + Math.cos(a) * l, e.y + Math.sin(a) * l, k % 2 ? '#d8c8a8' : '#fff09a'); }
    scraps(t, onEye, eye);
  }

  // ---------- the elevator: inside the car, the doors open on the storm; then he steps out past us ----------
  // k: how far the doors are open (0..1); out: how far the camera has followed him out (0..1); t: time in the car
  // The long ride's car (elevator.js) seen from behind him: walnut panels, the brass rail over a dark wainscot, the
  // coffered ceiling and its brass cornice, the RugCo carpet with gold diamonds, the sconces, the bronze doors with
  // their sunburst and windows in a bronze frame, the dial over them at R, and the operator on his stool by his panel.
  // Drawn as it lights itself (the glow layer).
  const CAR = { dl: 64, dr: 176, dt: 30, db: 122, ceil: 18, floor: 124 };
  function wallQuad(side, f0, f1, y0f, y1f) {
    // a band of the side wall between depths f0 and f1 (0 at the screen's edge, 1 at the doorway) and heights given as
    // functions of f (top and bottom on screen)
    const x = f => side < 0 ? -30 + (CAR.dl + 30) * f : W + 30 - (W + 30 - CAR.dr) * f;
    return [[x(f0), y0f(f0)], [x(f1), y0f(f1)], [x(f1), y1f(f1)], [x(f0), y1f(f0)]];
  }
  const lerp = (a, b, k) => a + (b - a) * k;
  const wTop = f => lerp(-22, CAR.dt - 4, f), wBot = f => lerp(H + 22, CAR.db, f);
  const atH = (f, h) => lerp(wBot(f), wTop(f), h);   // h: 0 at the floor, 1 at the ceiling, along the wall
  // where the outside shows through the doorway (for the rain), with the car's slide past us
  function carOpening(out) { const s2 = 1 + out * out * 1.6, T = v => (v - VX) * s2 + VX, TY = v => (v - H / 2) * s2 + H / 2; return [T(CAR.dl), TY(CAR.dt), (CAR.dr - CAR.dl) * s2, (CAR.db - CAR.dt) * s2]; }
  function drawElevator(k, out, t) {
    if (out >= 1) return;
    const sc2 = 1 + out * out * 1.6;   // the car slides past us as he walks out
    g.save(); g.globalAlpha = 1 - out * out; g.translate(VX, H / 2); g.scale(sc2, sc2); g.translate(-VX, -H / 2);
    const { dl, dr, dt, db } = CAR;
    // the ceiling: dark, coffered, a brass cornice where it meets the walls
    quad('#171012', [[-30, -22], [W + 30, -22], [dr, dt - 4], [dl, dt - 4]]);
    for (let i = 0; i < 3; i++) {
      const f0 = i / 3 + .04, f1 = (i + 1) / 3 - .04;
      for (let j = 0; j < 4; j++) {
        const u0 = j / 4 + .03, u1 = (j + 1) / 4 - .03, X = (u, f) => lerp(lerp(-30, W + 30, u), lerp(dl, dr, u), f), Y = f => lerp(-22, dt - 4, f);
        quad('#1f1517', [[X(u0, f0), Y(f0)], [X(u1, f0), Y(f0)], [X(u1, f1), Y(f1)], [X(u0, f1), Y(f1)]]);
      }
    }
    // the carpet: RugCo red, a gold border, rows of diamonds running to the door
    quad('#5e1614', [[-30, H + 22], [W + 30, H + 22], [dr, db], [dl, db]]);
    for (let r = 0; r < 6; r++) {
      const f = 1 - Math.pow((r + .5) / 6, 1.5), y = lerp(H + 22, db, f), wd = lerp(W + 60, dr - dl, f) / 7;
      for (let c = 0; c < 7; c++) { const x = lerp(-30, dl, f) + (c + .5) * wd, s = (1 - f) * 3 + 1; quad('#7a1d1a', [[x, y - s], [x + s * 1.6, y], [x, y + s], [x - s * 1.6, y]]); dot(x, y, '#c9962e'); }
    }
    for (const side of [-1, 1]) {
      // the walnut wall, its raised panels and grain
      quad('#3a2118', wallQuad(side, 0, 1, wTop, wBot));
      for (let i = 0; i < 2; i++) {
        const f0 = .06 + i * .48, f1 = f0 + .4, top = f => atH(f, .9), bot = f => atH(f, .46);
        quad('#2a170f', wallQuad(side, f0, f1, top, bot));
        quad('#4a2a1c', wallQuad(side, f0 + .02, f1 - .02, f => atH(f, .885), f => atH(f, .475)));
        quad('#5e3a26', wallQuad(side, f0 + .02, f1 - .02, f => atH(f, .885), f => atH(f, .87)));
        for (let k2 = 1; k2 < 6; k2++) { const f = f0 + (f1 - f0) * k2 / 6, x = side < 0 ? -30 + (dl + 30) * f : W + 30 - (W + 30 - dr) * f; line(x, atH(f, .86), x, atH(f, .5), '#43251a'); }
      }
      // the wainscot under the rail, and the brass rail
      quad('#2e1912', wallQuad(side, 0, 1, f => atH(f, .4), wBot));
      for (let k2 = 0; k2 < 14; k2++) { const f = k2 / 14, x = side < 0 ? -30 + (dl + 30) * f : W + 30 - (W + 30 - dr) * f; line(x, atH(f, .38), x, atH(f, .03), '#24130d'); }
      quad('#8a6420', wallQuad(side, 0, 1, f => atH(f, .44), f => atH(f, .4)));
      quad('#ffd44a', wallQuad(side, 0, 1, f => atH(f, .44), f => atH(f, .43)));
      // the cornice, brass
      quad('#c9962e', wallQuad(side, 0, 1, f => atH(f, 1), f => atH(f, .96)));
      quad('#ffd44a', wallQuad(side, 0, 1, f => atH(f, .965), f => atH(f, .955)));
      // the sconce between the panels, lit
      const sf = .5, sx = side < 0 ? -30 + (dl + 30) * sf : W + 30 - (W + 30 - dr) * sf, sy = atH(sf, .72);
      alpha(.14, () => disc(sx, sy, 9, '#ffcf7a')); alpha(.22, () => disc(sx, sy, 5, '#ffcf7a'));
      rect(sx - 1.5, sy, 3, 5, '#8a6420'); rect(sx - 1, sy, 2, .5, '#ffd44a'); disc(sx, sy - 1, 1.6, '#fff0c0');
    }
    // the bronze frame round the doorway, and the dial's plate over it
    for (const [d, c] of [[6, '#2a170f'], [5, '#6a4a18'], [4, '#c9962e'], [3, '#8a6420']]) { rect(dl - d, dt - d + 1, dr - dl + 2 * d, d, c); rect(dl - d, dt, d, db - dt, c); rect(dr, dt, d, db - dt, c); }
    g.fillStyle = '#8a6420'; g.beginPath(); g.arc(VX, dt - 5, 15, Math.PI, 0); g.fill();
    g.fillStyle = '#c9962e'; g.beginPath(); g.arc(VX, dt - 5, 14, Math.PI, 0); g.fill();
    g.fillStyle = '#f2e6c8'; g.beginPath(); g.arc(VX, dt - 5, 12, Math.PI, 0); g.fill();
    for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; line(VX + Math.cos(a) * 10, dt - 5 + Math.sin(a) * 10, VX + Math.cos(a) * 11.5, dt - 5 + Math.sin(a) * 11.5, '#3a2a1a'); }
    A.txt(g, 'G', VX - 9, dt - 13, '#3a2a1a'); A.txt(g, 'R', VX + 6, dt - 13, '#c8302a');
    line(VX, dt - 5.5, VX + 9, dt - 6.5, '#c8302a'); disc(VX, dt - 5.5, 1, '#3a2a1a');
    // the doors: bronze leaves with the deco sunburst fanning from the seam and a window each; they part and slide away
    const half = (dr - dl) / 2, open = k * half;
    g.save(); g.beginPath(); g.rect(dl, dt, dr - dl, db - dt); g.clip();
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? dl - open : VX + open, seam = side < 0 ? x0 + half : x0;
      rect(x0, dt, half, db - dt, '#2a170f'); rect(x0 + .5, dt + .5, half - 1, db - dt - 1, '#7a5a2e');
      g.save(); g.beginPath(); g.rect(x0 + .5, dt + .5, half - 1, db - dt - 1); g.clip();
      for (let i = 0; i < 7; i++) { const a = .25 + i * .2; line(seam, db - 2, seam + side * Math.sin(a) * 30, db - 2 - Math.cos(a) * 70, '#8a6634'); }
      g.restore();
      rect(x0 + .5, dt + .5, half - 1, 1, '#a07a3e');
      const wx = x0 + half / 2 - 2.5; rect(wx - .5, dt + 11, 6, 42, '#2a170f'); rect(wx, dt + 11.5, 5, 41, '#0e0a0c');
    }
    if (k <= 0) rect(VX - .5, dt, 1, db - dt, '#2a170f');
    g.restore();
    // the threshold
    quad('#8a6420', [[dl - 4, db], [dr + 4, db], [dr + 8, db + 4], [dl - 8, db + 4]]); rect(dl - 4, db, dr - dl + 8, .5, '#ffd44a');
    // the operator on his stool by his panel, in his bellhop's cap and jacket
    rect(W - 26, 54, 9, 26, '#5a3a12'); rect(W - 25, 55, 7, 24, '#c9962e');
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) rect(W - 24 + j * 3.2, 57.5 + i * 4.3, 2, 2, i === 0 && j === 1 ? '#ffd44a' : '#f2e6c8');
    const ox = W - 58, oy = 64 + Math.round(Math.sin(t * 2) * .5);
    rect(ox + 2, oy + 31, 18, 2.5, '#c9962e'); rect(ox + 2, oy + 31, 18, .5, '#ffd44a'); rect(ox + 9.5, oy + 33.5, 3, 18, '#8a6420'); rect(ox + 4, oy + 51, 14, 2, '#6a4a18');
    g.save(); g.translate(ox, oy); g.scale(.62, .62);
    const S = A.GHOST, cy = 4;
    g.drawImage(S, 0, 0, S.width * 2, S.height * 2);
    g.fillStyle = '#1a1418'; g.fillRect(7, cy - 6, 22, 10); g.fillStyle = '#c8302a'; g.fillRect(8, cy - 5, 20, 8); g.fillStyle = '#e8483a'; g.fillRect(8, cy - 5, 20, 2); g.fillStyle = '#ffd44a'; g.fillRect(8, cy + 1, 20, 2);
    g.fillStyle = '#1a1418'; g.fillRect(26, cy + 3, 6, 2); g.fillRect(4, 30, 28, 12);
    g.fillStyle = '#a8261e'; g.fillRect(5, 30, 26, 11); g.fillStyle = '#d63428'; g.fillRect(5, 30, 26, 1);
    g.fillStyle = '#ffd44a'; for (const bx of [12, 23]) for (const by of [33, 37]) g.fillRect(bx, by, 2, 2);
    g.restore();
    g.restore();
  }

  // his bolts on the roof, as the core draws them but at the picture's pixel: a fading tail, a head, a soft ring
  function drawShot(s, t) {
    const k = sc(s.z), z0 = Math.max(-.07, s.z - .1), z1 = Math.max(-.07, s.z - .045), x = PX(s.u, s.z), y = YH(s.z, s.h);
    const u0 = s.u - (s.du || 0) * .045, r = Math.max(.75, 2.2 * k), gold = s.spread;
    alpha(.6, () => line(PX(u0 - (s.du || 0) * .05, z0), YH(z0, s.h), PX(u0, z1), YH(z1, s.h), gold ? '#b0701a' : '#2a7aa6'));
    line(PX(u0, z1), YH(z1, s.h), x, y, gold ? '#ff9628' : '#46aad4');
    if (Math.floor(t * 30 + s.z * 10) % 2) alpha(.4, () => disc(x, y, r + .75, gold ? '#ffd44a' : '#86d6f0'));
    disc(x, y, r, gold ? '#ffd44a' : '#86d6f0'); dot(x, y - .5, '#ffffff');
  }

  // ---------- p(Loom)'s eye up close (the ending's dead-eye shot uses it too) ----------
  // Picture pixels on a 480 x 270 canvas: the eye in its riveted socket on the shuttle, slack threads across the top,
  // the rug along the bottom. o: bigEye's options, plus light ('storm': the eye's own glow and cold rain light;
  // 'dawn': warm light raking in from the upper left), blue (0..1, Loomy's light in the pupil), sparks, shake.
  // The parts that never move are baked once each (per light): the shuttle and its socket, the rivets, the rug.
  const BAKED = {};
  function baked(key, draw) {
    if (!BAKED[key]) { const cv = A.canvas(480, 270), prev = g; g = cv.getContext('2d'); draw(); g = prev; BAKED[key] = cv; }
    return BAKED[key];
  }
  function closeUp(gx2, t, o) {
    const prev = g; g = gx2; g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    const dawn = o.light === 'dawn', sx = o.shake ? Math.round((Math.random() - .5) * o.shake) : 0, sy = o.shake ? Math.round((Math.random() - .5) * o.shake * .6) : 0;
    g.translate(sx, sy);
    const R1 = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const D1 = (x, y, r, c) => { g.fillStyle = c; for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r - dy * dy + r * .5)); g.fillRect(Math.round(x - w), Math.round(y + dy), 2 * w + 1, 1); } };
    const RING = (x, y, r0, r1, c) => { g.fillStyle = c; for (let dy = -r1; dy <= r1; dy++) { const wo = Math.floor(Math.sqrt(r1 * r1 - dy * dy + r1 * .5)); const wi = Math.abs(dy) < r0 ? Math.floor(Math.sqrt(r0 * r0 - dy * dy + r0 * .5)) : -1; if (wi < 0) g.fillRect(x - wo, y + dy, 2 * wo + 1, 1); else { g.fillRect(x - wo, y + dy, wo - wi, 1); g.fillRect(x + wi + 1, y + dy, wo - wi, 1); } } };
    const cx = 240, cy = 126, L = dawn ? 'dawn' : 'storm';
    g.drawImage(baked('back-' + L, () => {
      // behind: the warp, dark, and the frame's shadow
      R1(0, 0, 480, 270, dawn ? '#1e1430' : '#08070c');
      for (let x = 4; x < 480; x += 6) R1(x, 0, 1, 270, dawn ? '#2e2048' : '#14121c');
      // the shuttle: a long boat of dark wood across the frame, banded with iron
      const top = 78, bot = 178;
      R1(0, top, 480, bot - top, '#3a2014');
      for (let y = top + 3; y < bot; y += 5) for (let x = 0; x < 480; x += 3) if (hash(x, y) < .3) R1(x, y + Math.round(hash(y, x) * 3), 2 + Math.round(hash(x + 1, y) * 6), 1, hash(x, y + 1) < .5 ? '#2c2420' : '#5a3420');
      R1(0, top, 480, 3, dawn ? '#c87146' : '#5a3420'); R1(0, bot - 3, 480, 3, '#1c1614');
      for (const bx of [22, 96, 384, 458]) {
        R1(bx - 7, top - 4, 14, bot - top + 8, '#3b3a48'); R1(bx - 7, top - 4, 2, bot - top + 8, dawn ? '#d8a070' : '#5e5e6c'); R1(bx + 5, top - 4, 2, bot - top + 8, '#1a1824');
        for (let y = top + 6; y < bot - 2; y += 18) { D1(bx, y, 3, '#24222f'); D1(bx - 1, y - 1, 2, dawn ? '#e8b080' : '#76788a'); }
      }
      // the socket: a heavy iron ring with big rivets, its inner lip, the eye's glow on it
      RING(cx, cy, 82, 106, '#3b3a48'); RING(cx, cy, 82, 87, '#24222f'); RING(cx, cy, 103, 106, '#1a1824');
      if (dawn) { g.save(); g.beginPath(); g.arc(cx, cy, 106, Math.PI * .95, Math.PI * 1.65); g.arc(cx, cy, 92, Math.PI * 1.65, Math.PI * .95, true); g.clip(); RING(cx, cy, 92, 105, '#a86848'); g.restore(); }
    }), 0, 0);
    const glowC = { watch: 'rgba(255,110,74,', fire: 'rgba(228,74,52,', hot: 'rgba(255,240,154,', dead: null, blue: 'rgba(70,170,212,' }[o.iris];
    if (glowC) { g.save(); g.beginPath(); g.arc(cx, cy, 106, 0, Math.PI * 2); g.arc(cx, cy, 82, 0, Math.PI * 2, true); g.clip(); const gr = g.createRadialGradient(cx, cy, 80, cx, cy, 108); gr.addColorStop(0, glowC + '.45)'); gr.addColorStop(1, glowC + '0)'); g.fillStyle = gr; g.fillRect(cx - 108, cy - 108, 216, 216); g.restore(); }
    g.drawImage(baked('rivets-' + L, () => {
      for (let k = 0; k < 16; k++) {
        const a = k / 16 * Math.PI * 2 + .2, x = Math.round(cx + Math.cos(a) * 95), y = Math.round(cy + Math.sin(a) * 95);
        D1(x + 1, y + 2, 5, '#110f18'); D1(x, y, 5, '#4b4a58'); D1(x - 2, y - 2, 2, dawn && Math.cos(a) < .3 && Math.sin(a) < .3 ? '#e8b080' : '#76788a'); R1(x - 2, y - 3, 1, 1, '#d2d4dc');
      }
    }), 0, 0);
    // the eye itself, Loomy's, at this size
    bigEye(g, cx, cy, 80, 1, o);
    // Loomy's light: a tiny blue spark in the dead pupil, and its glow
    if (o.blue > 0) {
      g.save(); g.globalAlpha = o.blue; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, 26); gr.addColorStop(0, 'rgba(134,214,240,.9)'); gr.addColorStop(1, 'rgba(70,170,212,0)'); g.fillStyle = gr; g.fillRect(cx - 26, cy - 26, 52, 52);
      D1(cx, cy, 3, '#46aad4'); D1(cx, cy, 1, '#c8f4ff'); g.restore();
    }
    // slack threads across the top, some snapped and hanging, swaying
    for (let i = 0; i < 9; i++) {
      const y0 = 6 + i * 7, sag = 18 + hash(i, 2) * 26, broke = hash(i, 5) < .35, end = broke ? 120 + hash(i, 6) * 240 : 480;
      g.fillStyle = i % 2 ? '#b0a088' : '#d8c8a8';
      for (let x = 0, run = 0, ry = null; x <= end; x++) {
        const k = x / 480, y = x < end ? Math.round(y0 + Math.sin(k * Math.PI) * sag + Math.sin(t * 1.3 + i + k * 3) * 1.5) : null;
        if (y !== ry) { if (run) g.fillRect(x - run, ry, run, 1); run = 0; ry = y; }
        run++;
      }
      if (broke) { const k = end / 480, y = y0 + Math.sin(k * Math.PI) * sag; for (let d = 0; d < 26; d++) g.fillRect(Math.round(end + Math.sin(t * 1.7 + i) * d * .25), Math.round(y + d), 1, 1); }
    }
    // the rug along the bottom: pile in rows, gold stripes, a fringe
    g.drawImage(baked('rug', () => {
      R1(0, 238, 480, 32, '#761c1e');
      for (let y = 240; y < 270; y += 2) R1(0, y, 480, 1, '#5a1418');
      for (const y of [243, 263]) { R1(0, y, 480, 3, '#c87818'); R1(0, y, 480, 1, '#e8a028'); }
      for (let x = 12; x < 480; x += 36) for (let d = 0; d < 5; d++) { R1(x + d, 254 - d, 1, 1, '#e8a028'); R1(x + 9 - d, 254 - d, 1, 1, '#e8a028'); R1(x + d, 254 + d, 1, 1, '#e8a028'); R1(x + 9 - d, 254 + d, 1, 1, '#e8a028'); }
      for (let x = 0; x < 480; x += 2) R1(x, 236 - (x % 4 ? 1 : 3), 1, x % 4 ? 2 : 4, '#f4e6c4');
    }), 0, 0);
    // sparks from the cracks when it comes back red
    if (o.sparks) for (let k = 0; k < 18; k++) { const a = hash(k, Math.floor(t * 14)) * Math.PI * 2, l = 40 + ((t * 9 + k * .19) % 1) * 80; R1(cx + Math.cos(a) * l, cy + Math.sin(a) * l, 2, 2, k % 3 ? '#ffd44a' : '#ffffff'); }
    // the light: cold from the rain, or the dawn raking in warm from the upper left
    const sh = g.createLinearGradient(0, 0, 480, 270);
    if (dawn) { sh.addColorStop(0, 'rgba(252,226,137,.16)'); sh.addColorStop(.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(8,7,12,.45)'); }
    else { sh.addColorStop(0, 'rgba(134,214,240,.06)'); sh.addColorStop(1, 'rgba(8,7,12,.35)'); }
    g.fillStyle = sh; g.fillRect(0, 0, 480, 270);
    if (!dawn) { g.fillStyle = 'rgba(150,152,168,.35)'; for (let i = 0; i < 70; i++) { const x = (hash(i, 1) * 560 + t * 60) % 560 - 40, y = (hash(i, 2) * 300 + t * 420 * (.8 + hash(i, 3) * .4)) % 300 - 15; g.fillRect(Math.round(x - y * .22), Math.round(y), 1, 6); } }
    g.restore(); g = prev;
  }

  return { gust, wind, strike, drawWind, use, carOpening, beamBow, backdrop, drawSet, drawPropGlow, drawRain, drawLoom, drawEyeGlow, bigEye, closeUp, drawShot, slab, carpet, drawBeam, drawElevator, edgeTop, IRIS };
};
