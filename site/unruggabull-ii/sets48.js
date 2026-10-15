// The 48th Floor's set: p(Loom)'s soul-reclamation factory, drawn in code at the picture's full size (picture pixels,
// world coordinates; floor48.js shifts by the camera). The room is painted once (the floor plates, the back wall, the
// walkways); the machines, belts, the soul main and the monitors are drawn each frame from the floor's state.
// Machines are boxes seen from above at a tilt: a top face lifted by the machine's height, and a front face below it.
// Everything here is cosmetic: hashes of position stand in for randomness, so drawing never touches the run.
var UnrugSets48 = (function () {
  'use strict';
  const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const C = {
    plate: '#2c2a35', plate2: '#312f3b', seam: '#1c1a22', rivet: '#4a4756', grime: '#24222b', oil: '#1a1820',
    wall: '#211e29', wallRib: '#2b2834', wallLit: '#3a3746', pipe: '#4a4250', pipeHi: '#6a6270', pipeLo: '#2a2430',
    hazard: '#e8b030', hazardDk: '#1a1418', walk: '#8a7a3a',
    body: '#34323f', bodyHi: '#4c4a5a', bodyLo: '#22202a', edge: '#0c0a10', red: '#a8261e', redHi: '#d63428', redLo: '#6a160f',
    brass: '#c9962e', brassHi: '#ffd44a', brassLo: '#6a4a18', glass: '#1d3a48', glassHi: '#4a8aa8',
    soul: '#bfefff', soulGold: '#ffd44a', thread: '#ff7a2a', threadHi: '#ffd060', char: '#17151b', ember: '#ff7a2a'
  };
  const R2 = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };

  // ---------- the room, painted once ----------
  // The floor: steel plates 32 px square with seams, rivets at the corners, a diamond tread on some, grime and oil; yellow
  // walkway lines between the lines; hazard stripes around each line's bed. The back wall: corrugated steel, a pipe run,
  // the floor's name stencilled, and frames for four monitors (their screens are drawn live).
  function paintRoom(W, H, L) {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d');
    R2(g, 0, 0, W, H, C.plate);
    for (let ty = 0; ty * 32 < H; ty++) for (let tx = 0; tx * 32 < W; tx++) {
      const x = tx * 32, y = L.wallH + ty * 32 - 6, h = hash(tx, ty);
      R2(g, x, y, 32, 32, h < .5 ? C.plate : C.plate2);
      if (h > .62) for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2 === 0) R2(g, x + 3 + i * 5, y + 3 + j * 5, 3, 1, '#3a3844');
      R2(g, x, y, 32, 1, C.seam); R2(g, x, y, 1, 32, C.seam); R2(g, x + 1, y + 1, 30, 1, '#3a3846');
      for (const [rx, ry] of [[3, 3], [28, 3], [3, 28], [28, 28]]) { R2(g, x + rx, y + ry, 2, 2, C.rivet); R2(g, x + rx, y + ry, 1, 1, '#6a6878'); }
    }
    // grime and oil
    for (let i = 0; i < 900; i++) { const x = hash(i, 7) * W, y = L.wallH + hash(i, 9) * (H - L.wallH); R2(g, x, y, 1 + (hash(i, 3) * 3 | 0), 1, C.grime); }
    for (let i = 0; i < 14; i++) {
      const x = hash(i, 41) * W, y = L.wallH + 20 + hash(i, 43) * (H - L.wallH - 30), r = 6 + hash(i, 47) * 12;
      g.fillStyle = C.oil; g.globalAlpha = .55; g.beginPath(); g.ellipse(x, y, r, r * .5, 0, 0, 6.29); g.fill(); g.globalAlpha = 1;
      R2(g, x - r * .3, y - 1, r * .5, 1, '#3a3a4e');
    }
    // each line's bed: a hazard-striped border round the belt's run
    for (const ln of L.lines) {
      const y0 = ln.y - L.bedH / 2 - 6, y1 = ln.y + L.bedH / 2 + 6;
      for (const yy of [y0, y1 - 4]) for (let x = L.lineX0 - 14; x < L.lineX1 + 10; x += 8) R2(g, x, yy, 4, 4, Math.floor(x / 8) % 2 ? C.hazard : C.hazardDk);
      R2(g, L.lineX0 - 14, y0 + 4, L.lineX1 - L.lineX0 + 24, y1 - y0 - 8, '#211f28');
    }
    // walkways between the lines: dashed yellow
    for (let k = 0; k < L.lines.length + 1; k++) {
      const y = k === 0 ? L.lines[0].y - 52 : k === L.lines.length ? L.lines[k - 1].y + 52 : (L.lines[k - 1].y + L.lines[k].y) / 2;
      for (let x = 60; x < W - 40; x += 18) R2(g, x, y, 10, 2, C.walk);
    }
    // the front wall, seen from above: its top edge and a hazard band, with the elevator door he came in by
    const fy = H - 32;
    R2(g, 0, fy, W, H - fy, '#16131b'); R2(g, 0, fy, W, 3, '#3a3442'); R2(g, 0, fy, W, 1, '#5a5266');
    for (let x = 0; x < W; x += 8) R2(g, x, fy + 6, 4, 4, Math.floor(x / 8) % 2 ? C.hazard : C.hazardDk);
    for (let x = 0; x < W; x += 6) R2(g, x, fy + 14, 2, H - fy - 14, '#1e1a24');
    R2(g, L.door.x - 30, fy, 60, H - fy, '#0c0a10'); R2(g, L.door.x - 32, fy, 2, H - fy, C.brass); R2(g, L.door.x + 30, fy, 2, H - fy, C.brass);
    R2(g, L.door.x - 30, fy + 4, 29, H - fy - 4, '#6a4a18'); R2(g, L.door.x + 1, fy + 4, 29, H - fy - 4, '#6a4a18'); R2(g, L.door.x - 1, fy + 4, 2, H - fy - 4, '#2a170f');
    stencil(g, '48', L.door.x - 12, fy + 12, '#c9962e');
    // the back wall
    R2(g, 0, 0, W, L.wallH, C.wall);
    for (let x = 0; x < W; x += 6) { R2(g, x, 8, 2, L.wallH - 8, C.wallRib); R2(g, x, 8, 1, L.wallH - 8, '#34313e'); }
    R2(g, 0, 0, W, 8, '#16131b');
    R2(g, 0, L.wallH - 6, W, 6, '#3a3442'); R2(g, 0, L.wallH - 6, W, 1, '#5a5266'); R2(g, 0, L.wallH, W, 3, '#0c0a10');
    // a pipe run along the wall, with valves
    R2(g, 0, 46, W, 5, C.pipe); R2(g, 0, 46, W, 1, C.pipeHi); R2(g, 0, 50, W, 1, C.pipeLo);
    for (let x = 40; x < W; x += 96) { R2(g, x, 43, 6, 11, C.pipeLo); R2(g, x + 1, 44, 4, 9, C.pipe); R2(g, x - 2, 40, 10, 3, C.redLo); R2(g, x - 1, 40, 8, 1, C.red); }
    // stencils
    stencil(g, 'RECLAMATION', 88, 22, '#4a4252');
    stencil(g, 'FLOOR 48', W - 170, 22, '#4a4252');
    // the dispatch bay at the lines' ends: a painted box and its name on the floor
    g.strokeStyle = C.hazard; g.globalAlpha = .55; g.lineWidth = 2; g.strokeRect(660, 92, 128, 300); g.globalAlpha = 1;
    stencil(g, 'DISPATCH', 676, 400, '#4a4428');
    // monitor frames (screens drawn live)
    for (const m of L.monitors) { R2(g, m.x - 2, m.y - 2, m.w + 4, m.h + 4, '#0c0a10'); R2(g, m.x - 1, m.y - 1, m.w + 2, m.h + 2, '#4a4456'); R2(g, m.x + m.w / 2 - 3, m.y + m.h + 2, 6, 6, '#2a2630'); }
    return cv;
  }
  // big blocky stencil letters, 3x5 font doubled
  const FONT = { D: '110101101101110', S: '011100010001110', P: '110101110100100', H: '101101111101101', R: '110101110101101', E: '111100110100111', C: '111100100100111', L: '100100100100111', A: '010101111101101', M: '101111111101101',
    T: '111010010010010', I: '111010010010111', O: '111101101101111', N: '101111111111101', F: '111100110100100', '4': '101101111001001', '8': '111101111101111', ' ': '000000000000000' };
  function stencil(g, text, x, y, col) {
    let cx = x;
    for (const ch of text) { const f = FONT[ch] || FONT[' ']; for (let i = 0; i < 15; i++) if (f[i] === '1') R2(g, cx + (i % 3) * 3, y + Math.floor(i / 3) * 3, 3, 3, col); cx += 12; }
  }

  // ---------- machines ----------
  // m: { kind, x0, y0, x1, y1 (footprint), H (height), hp, max, flash, dead, deadT, wob } ; t: seconds; p: panic 0..2
  function box(g, m, top, front, hi, lo) {
    const w = m.x1 - m.x0, d = m.y1 - m.y0;
    R2(g, m.x0 - 1, m.y0 - m.H - 1, w + 2, d + m.H + 2, C.edge);
    R2(g, m.x0, m.y1 - m.H, w, m.H, front);       // front face
    R2(g, m.x0, m.y0 - m.H, w, d, top);           // top face
    R2(g, m.x0, m.y0 - m.H, w, 1, hi); R2(g, m.x0, m.y1 - m.H, w, 1, lo);
    R2(g, m.x0, m.y1 - m.H + 1, 1, m.H - 1, hi); R2(g, m.x1 - 1, m.y1 - m.H + 1, 1, m.H - 1, lo);
  }
  function damageMarks(g, m, t) {
    const k = m.hp / m.max, w = m.x1 - m.x0;
    if (k < .66) for (let i = 0; i < 3; i++) { const x = m.x0 + 4 + hash(m.id, i) * (w - 8), y = m.y1 - m.H + 4 + hash(i, m.id) * (m.H - 8); for (let j = 0; j < 4; j++) R2(g, x + j, y + (j % 2), 1, 1, C.edge); }
    if (k < .33) for (let i = 0; i < 4; i++) { const x = m.x0 + 3 + hash(m.id, i + 9) * (w - 6), y = m.y0 - m.H + 3 + hash(i + 9, m.id) * (m.y1 - m.y0 - 4); R2(g, x, y, 3, 2, C.char); }
  }
  // the wreck of a broken machine: charred, slumped, glowing at the seams
  function wreck(g, m, t) {
    const w = m.x1 - m.x0, d = m.y1 - m.y0, h = Math.max(6, m.H * .45);
    R2(g, m.x0 - 2, m.y1 - h - 1, w + 4, h + 2, C.edge);
    R2(g, m.x0, m.y1 - h, w, h, '#1e1b22');
    R2(g, m.x0, m.y0 - h, w, d, '#29262e');
    for (let i = 0; i < 6; i++) { const x = m.x0 + hash(m.id, i) * w, y = m.y0 - h + hash(i, m.id) * d; R2(g, x, y, 4, 2, C.char); }
    for (let i = 0; i < 3; i++) { const x = m.x0 + 4 + hash(m.id + 3, i) * (w - 8); R2(g, x, m.y1 - h - 4 - hash(i, 5) * 6, 2, 6, '#3a3640'); }
  }
  function tank(g, m, t, glowG) {
    if (m.dead) { wreck(g, m, t); R2(g, m.x0 + 2, m.y1 - 6, m.x1 - m.x0 - 4, 2, '#4a8aa8'); return; }
    const cx = (m.x0 + m.x1) / 2, w = m.x1 - m.x0, top = m.y0 - m.H, bot = m.y1;
    // base and cap in brass, glass between
    R2(g, m.x0 - 1, bot - 8, w + 2, 9, C.edge); R2(g, m.x0, bot - 7, w, 7, C.brassLo); R2(g, m.x0, bot - 7, w, 1, C.brass);
    R2(g, m.x0 + 1, top + 6, w - 2, bot - top - 13, C.glass);
    for (let y = top + 8; y < bot - 8; y += 9) R2(g, m.x0 + 1, y, w - 2, 1, '#2a5a70');
    R2(g, m.x0 + 3, top + 7, 2, bot - top - 15, C.glassHi);
    R2(g, m.x0 - 1, top, w + 2, 8, C.edge); R2(g, m.x0, top + 1, w, 6, C.brassLo); R2(g, m.x0, top + 1, w, 2, C.brass);
    R2(g, cx - 3, top - 4, 6, 5, C.pipe);
    damageMarks(g, m, t);
    if (glowG) {
      // the souls inside, swirling (drawn with the glow so they shine through the glass)
      const n = Math.max(2, Math.round(6 * m.hp / m.max));
      for (let i = 0; i < n; i++) { const a = t * 1.4 + i * 1.7 + m.id, x = cx + Math.sin(a) * (w / 2 - 6), y = top + 14 + ((i * 9 + t * 8 + m.id * 5) % (bot - top - 26)); glowG.fillStyle = C.soul; glowG.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); glowG.fillStyle = C.soulGold; glowG.fillRect(Math.round(x) - 1, Math.round(y) - 3, 3, 1); }
    }
  }
  function spinner(g, m, t, glowG, speed) {
    if (m.dead) { wreck(g, m, t); return; }
    box(g, m, C.body, C.bodyLo, C.bodyHi, C.edge);
    const cx = (m.x0 + m.x1) / 2, cy = (m.y0 + m.y1) / 2 - m.H, r = (m.y1 - m.y0) / 2 - 1;
    // the drum on top, spokes turning
    g.fillStyle = C.edge; g.beginPath(); g.ellipse(cx, cy, r + 4, r * .8 + 2, 0, 0, 6.29); g.fill();
    g.fillStyle = C.redLo; g.beginPath(); g.ellipse(cx, cy, r + 3, r * .8 + 1, 0, 0, 6.29); g.fill();
    g.fillStyle = C.red; g.beginPath(); g.ellipse(cx, cy - 1, r + 2, r * .8, 0, 0, 6.29); g.fill();
    const a0 = t * 7 * speed;
    for (let i = 0; i < 4; i++) { const a = a0 + i * Math.PI / 2; g.strokeStyle = C.redLo; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - 1); g.lineTo(cx + Math.cos(a) * (r + 1), cy - 1 + Math.sin(a) * r * .8); g.stroke(); }
    R2(g, cx - 2, cy - 3, 4, 4, C.brass);
    // a panel and a gauge on the front
    R2(g, m.x0 + 4, m.y1 - m.H + 5, 10, 7, '#1a1820'); R2(g, m.x0 + 6, m.y1 - m.H + 7, 2 + Math.round(4 * (.5 + .5 * Math.sin(t * 3 + m.id))), 3, '#3aa86a');
    damageMarks(g, m, t);
    if (glowG) { glowG.fillStyle = C.threadHi; glowG.fillRect(Math.round(cx) - 1, Math.round(cy) - 2, 3, 3); }
  }
  // The loom: the line's heart. A frame of posts with p(Loom)'s orange threads strung as a warp, a shuttle running
  // across, and the cloth (the rug) growing on its front roller.
  function loom(g, m, t, glowG, speed) {
    if (m.dead) { wreck(g, m, t); return; }
    // seen from above at a tilt, its top inside the old height (owner, Oct 14: drawn taller, the three looms touched)
    const dT = 12, w = m.x1 - m.x0, d = m.y1 - m.y0, top = m.y0 - m.H + dT;
    // base
    R2(g, m.x0 - 1, m.y1 - 14, w + 2, 15, C.edge); R2(g, m.x0, m.y1 - 13, w, 13, C.bodyLo); R2(g, m.x0, m.y1 - 13, w, 1, C.bodyHi);
    R2(g, m.x0, m.y0 - 14, w, d, C.body);
    // seen from above at a tilt (owner, Oct 14: it read a little like a side view): the top of the frame shows, a back beam
    // and the side rails running back to it, the warp strung across between them and its glow running back too
    R2(g, m.x0 + 1, top - 3 - dT, w - 2, 5, C.edge); R2(g, m.x0 + 2, top - 2 - dT, w - 4, 3, C.redLo); R2(g, m.x0 + 2, top - 2 - dT, w - 4, 1, C.red);
    R2(g, m.x0 + 8, top - dT + 1, w - 16, dT - 1, '#16131a');
    for (const x of [m.x0 + 2, m.x1 - 6]) { R2(g, x - 1, top - 2 - dT, 6, dT + 2, C.edge); R2(g, x, top - 1 - dT, 4, dT, C.brassLo); R2(g, x, top - 1 - dT, 4, 1, C.brass); }
    // the frame: four posts, a beam across the top
    for (const x of [m.x0 + 2, m.x1 - 6]) { R2(g, x - 1, top, 6, m.y1 - top - 12, C.edge); R2(g, x, top + 1, 4, m.y1 - top - 14, C.brassLo); R2(g, x, top + 1, 1, m.y1 - top - 14, C.brass); }
    R2(g, m.x0, top - 2, w, 7, C.edge); R2(g, m.x0 + 1, top - 1, w - 2, 5, C.redLo); R2(g, m.x0 + 1, top - 1, w - 2, 2, C.red);
    // the warp: dark here, its glow drawn with the glow layer
    const x0 = m.x0 + 8, x1 = m.x1 - 8, wy0 = top + 6, wy1 = m.y1 - 16;
    R2(g, x0, wy0, x1 - x0, wy1 - wy0, '#16131a');
    // the cloth on the front roller: rug red with a gold border, growing as it weaves
    const grow = (t * .25 * speed + m.id * .37) % 1, ch = 4 + Math.round(grow * 8);
    R2(g, x0 - 2, m.y1 - 14 - ch, x1 - x0 + 4, ch, '#7a1d1a'); R2(g, x0 - 2, m.y1 - 14 - ch, x1 - x0 + 4, 1, C.brass);
    for (let x = x0; x < x1; x += 6) R2(g, x + 2, m.y1 - 12 - ch + 2, 2, Math.max(1, ch - 4), '#5e1614');
    R2(g, x0 - 3, m.y1 - 15, x1 - x0 + 6, 3, C.brassLo);
    // the shuttle
    const sx = x0 + (x1 - x0 - 8) * (.5 + .5 * Math.sin(t * 5 * speed + m.id));
    R2(g, sx - 1, wy0 + (wy1 - wy0) * .55 - 1, 10, 5, C.edge); R2(g, sx, wy0 + (wy1 - wy0) * .55, 8, 3, C.brass);
    // its gauge: a ring of lamps, red as it's hurt
    const lamps = 6, lit = Math.ceil(lamps * m.hp / m.max);
    for (let i = 0; i < lamps; i++) R2(g, m.x0 + 6 + i * 6, m.y1 - 8, 4, 3, i < lit ? (m.hp / m.max < .34 ? '#d63428' : '#3aa86a') : '#1a1418');
    damageMarks(g, m, t);
    if (glowG) {
      glowG.save(); glowG.globalAlpha = .9;
      for (let i = 0; i <= 8; i++) {
        const x = x0 + 2 + i * (x1 - x0 - 4) / 8, wob = Math.sin(t * 9 * speed + i) * .8;
        glowG.fillStyle = i % 2 ? C.thread : C.threadHi; glowG.fillRect(Math.round(x + wob), wy0 + 1, 1, wy1 - wy0 - 2);
        glowG.globalAlpha = .55; glowG.fillRect(Math.round(x), top - dT + 1, 1, dT - 3); glowG.globalAlpha = .9;
      }
      glowG.restore();
    }
  }
  // The press: two pillars either side of the belt and a heavy head that slams down onto it. m.slam: 0 up .. 1 down;
  // m.warn: 0..1 its shadow growing on the belt before it falls.
  function press(g, m, t, glowG, beltY, bedH) {
    const w = m.x1 - m.x0;
    if (m.dead) { wreck(g, { id: m.id, x0: m.x0, x1: m.x0 + 8, y0: m.y0, y1: m.y1, H: m.H }, t); wreck(g, { id: m.id + 1, x0: m.x1 - 8, x1: m.x1, y0: m.y0, y1: m.y1, H: m.H }, t); R2(g, m.x0 + 6, beltY - 6, w - 12, 10, '#29262e'); return; }
    const hy = beltY - bedH / 2 - 26 + Math.round((m.slam || 0) * 22);
    for (const x of [m.x0, m.x1 - 8]) { R2(g, x - 1, m.y0 - m.H - 1, 10, m.y1 - m.y0 + m.H + 2, C.edge); R2(g, x, m.y0 - m.H, 8, m.y1 - m.y0 + m.H, C.body); R2(g, x, m.y0 - m.H, 2, m.y1 - m.y0 + m.H, C.bodyHi);
      for (let y = m.y0 - m.H + 4; y < m.y1 - 2; y += 6) R2(g, x + 2, y, 4, 2, Math.floor(y / 6) % 2 ? C.hazard : C.hazardDk); }
    R2(g, m.x0, m.y0 - m.H - 6, w, 8, C.edge); R2(g, m.x0 + 1, m.y0 - m.H - 5, w - 2, 6, C.redLo); R2(g, m.x0 + 1, m.y0 - m.H - 5, w - 2, 2, C.red);
    // the ram and its head
    R2(g, m.x0 + w / 2 - 3, m.y0 - m.H + 1, 6, Math.max(1, hy - (m.y0 - m.H)), '#8a8494');
    R2(g, m.x0 + 7, hy - 1, w - 14, 12, C.edge); R2(g, m.x0 + 8, hy, w - 16, 10, C.bodyHi); R2(g, m.x0 + 8, hy + 8, w - 16, 2, C.brass);
    damageMarks(g, { id: m.id, hp: m.hp, max: m.max, x0: m.x0, x1: m.x1, y1: m.y0, y0: m.y0 - m.H, H: 0 }, t);
  }
  // the warning under a press: its shadow on the belt, darker and wider as it's about to fall
  function pressShadow(g, m, beltY, bedH) {
    if (m.dead || !(m.warn > 0)) return;
    const w = m.x1 - m.x0 - 14;
    g.save(); g.globalAlpha = .25 + .45 * m.warn; g.fillStyle = '#07050a';
    g.fillRect(Math.round(m.x0 + 7 + (1 - m.warn) * 4), Math.round(beltY - bedH / 2 + 1), Math.round(w - (1 - m.warn) * 8), bedH - 2); g.restore();
    if (m.warn > .5 && Math.floor(m.warn * 12) % 2) { g.save(); g.strokeStyle = '#ff5a4a'; g.lineWidth = 1; g.strokeRect(Math.round(m.x0 + 7) + .5, Math.round(beltY - bedH / 2) + .5, w - 1, bedH - 1); g.restore(); }
  }
  // The animator: two coils either side of the belt; an arc jumps between them as a rug passes and comes alive.
  function animator(g, m, t, glowG, zap) {
    if (m.dead) { wreck(g, { id: m.id, x0: m.x0, x1: m.x0 + 10, y0: m.y0, y1: m.y1, H: m.H * .6 }, t); wreck(g, { id: m.id + 2, x0: m.x1 - 10, x1: m.x1, y0: m.y0, y1: m.y1, H: m.H * .6 }, t); return; }
    for (const x of [m.x0, m.x1 - 10]) {
      R2(g, x - 1, m.y1 - 8, 12, 9, C.edge); R2(g, x, m.y1 - 7, 10, 7, C.bodyLo);
      for (let i = 0; i < 6; i++) { const y = m.y1 - 10 - i * 5; R2(g, x + 1, y - 1, 8, 5, C.edge); R2(g, x + 2, y, 6, 3, i % 2 ? C.brass : C.brassLo); }
      R2(g, x + 2, m.y1 - m.H - 2, 6, 6, C.edge); R2(g, x + 3, m.y1 - m.H - 1, 4, 4, '#8a93a6');
    }
    damageMarks(g, m, t);
    if (glowG && zap > 0) {
      const xa = m.x0 + 5, xb = m.x1 - 5, y = m.y1 - m.H + 1;
      glowG.strokeStyle = '#bfefff'; glowG.lineWidth = 2; glowG.beginPath(); glowG.moveTo(xa, y);
      for (let i = 1; i < 8; i++) glowG.lineTo(xa + (xb - xa) * i / 8, y + (Math.random() - .5) * 10 + i % 2 * 4);
      glowG.lineTo(xb, y); glowG.stroke();
      glowG.strokeStyle = '#ffffff'; glowG.lineWidth = 1; glowG.stroke();
    }
  }
  // The belt: a dark band with rails either side and treads that scroll at its speed (stopped and burnt when the line's
  // down). x0..x1 along y; off: how far it has moved.
  function belt(g, x0, x1, y, h, off, down) {
    R2(g, x0, y - h / 2 - 2, x1 - x0, h + 4, C.edge);
    R2(g, x0, y - h / 2, x1 - x0, h, down ? '#1c1a1e' : '#25232b');
    const o = ((off % 8) + 8) % 8;
    for (let x = x0 + o; x < x1; x += 8) R2(g, Math.round(x), y - h / 2 + 1, 2, h - 2, down ? '#201e22' : '#33313b');
    for (const yy of [y - h / 2 - 2, y + h / 2]) { R2(g, x0, yy, x1 - x0, 2, down ? '#3a3640' : '#5a5868'); R2(g, x0, yy, x1 - x0, 1, down ? '#4a4650' : '#7a7888'); }
    for (let x = x0 + 10; x < x1; x += 22) for (const yy of [y - h / 2 - 3, y + h / 2 + 1]) R2(g, x, yy, 3, 2, C.rivet);
  }
  // what rides the belt: a spool of glowing thread before the loom, a rug after it, stamped after the press
  function item(g, it, y, glowG) {
    const x = Math.round(it.x);
    if (it.kind === 'thread') { R2(g, x - 4, y - 4, 8, 8, C.edge); R2(g, x - 3, y - 3, 6, 6, C.brassLo); if (glowG) { glowG.fillStyle = C.threadHi; glowG.fillRect(x - 2, y - 2, 4, 4); } return; }
    const stamped = it.kind === 'rug2';
    R2(g, x - 9, y - 6, 18, 12, C.edge); R2(g, x - 8, y - 5, 16, 10, stamped ? C.redHi : C.red);
    R2(g, x - 8, y - 5, 16, 1, C.brass); R2(g, x - 8, y + 4, 16, 1, C.brass);
    if (stamped) { R2(g, x - 3, y - 2, 2, 2, '#1a1418'); R2(g, x + 2, y - 2, 2, 2, '#1a1418'); R2(g, x - 2, y + 1, 5, 1, '#1a1418'); }
    for (let i = 0; i < 4; i++) { R2(g, x - 10, y - 4 + i * 3, 1, 2, '#fff6e2'); R2(g, x + 9, y - 4 + i * 3, 1, 2, '#fff6e2'); }
  }
  // The soul main: a glass pipe down the left wall with branches to each line's tank, full of souls flowing down.
  // flow: how bright and fast (Production Panic sends more down it); burst: the collapse.
  function soulMain(g, L, t, flow, glowG, burst, down) {
    const x = L.main.x, y0 = L.wallH - 2, y1 = L.main.y1;
    R2(g, x - 1, y0, 14, y1 - y0, C.edge); R2(g, x, y0, 12, y1 - y0, burst ? '#1e1b22' : C.glass); R2(g, x + 2, y0, 2, y1 - y0, burst ? '#2a2630' : C.glassHi);
    for (let y = y0 + 20; y < y1; y += 40) { R2(g, x - 2, y, 16, 4, C.brassLo); R2(g, x - 2, y, 16, 1, C.brass); }
    L.lines.forEach((ln, i) => {
      const tk = ln.tankX0;
      R2(g, x + 12, ln.y - 26, tk - x - 12, 8, C.edge); R2(g, x + 12, ln.y - 25, tk - x - 12, 6, down[i] ? '#1e1b22' : C.glass); R2(g, x + 12, ln.y - 25, tk - x - 12, 1, C.glassHi);
    });
    if (!glowG || burst) return;
    const n = Math.round(10 + flow * 8), sp = 30 + flow * 26;
    for (let i = 0; i < n; i++) { const y = y0 + ((i * 37 + t * sp) % (y1 - y0)); glowG.fillStyle = i % 3 ? C.soul : C.soulGold; glowG.fillRect(x + 4 + (i % 3) * 2, Math.round(y), 2, 3); }
    L.lines.forEach((ln, i) => {
      if (down[i]) return;
      for (let k = 0; k < 4; k++) { const xx = x + 12 + ((k * 13 + t * (sp * .8)) % (ln.tankX0 - x - 12)); glowG.fillStyle = C.soul; glowG.fillRect(Math.round(xx), ln.y - 23, 2, 2); }
    });
  }
  // the monitors on the back wall: each line's output as a bar chart; PANIC flashes; at the end, p(Loom)'s eye
  function monitors(g, L, t, state) {
    for (const m of L.monitors) {
      const eye = state.eye > 0, panic = state.panic;
      R2(g, m.x, m.y, m.w, m.h, eye ? '#140806' : '#0a1612');
      if (eye) {
        const cx = m.x + m.w / 2, cy = m.y + m.h / 2, k = Math.min(1, state.eye), p = .5 + .5 * Math.sin(t * 8);
        g.fillStyle = '#ff7a2a'; g.beginPath(); g.ellipse(cx, cy, 9 * k, 6 * k, 0, 0, 6.29); g.fill();
        g.fillStyle = '#ffd060'; g.beginPath(); g.ellipse(cx, cy, 6 * k, 4 * k, 0, 0, 6.29); g.fill();
        g.fillStyle = '#140806'; g.beginPath(); g.ellipse(cx, cy, (2 + p) * k, (2 + p) * k, 0, 0, 6.29); g.fill();
        continue;
      }
      for (let i = 0; i < 3; i++) {
        const live = !state.down[i], hgt = live ? 4 + Math.round((m.h - 10) * (.4 + .3 * Math.sin(t * (2 + panic) + i * 2 + m.x))) * (1 + panic * .15) : 2;
        R2(g, m.x + 4 + i * 9, m.y + m.h - 3 - Math.min(m.h - 6, hgt), 6, Math.min(m.h - 6, hgt), live ? (panic > 1 ? '#ff5a4a' : panic ? '#ffd44a' : '#3aa86a') : '#3a1a1a');
      }
      if (panic && Math.floor(t * 4) % 2) R2(g, m.x + 2, m.y + 2, m.w - 4, 3, panic > 1 ? '#d63428' : '#e8b030');
    }
  }
  // the warning beacons on posts at each line's end: still at first, turning amber in the panic, red at its height
  function beacon(g, x, y, t, level, glowG) {
    R2(g, x - 2, y - 30, 4, 30, C.edge); R2(g, x - 1, y - 30, 2, 30, C.pipe);
    R2(g, x - 4, y - 36, 8, 7, C.edge); R2(g, x - 3, y - 35, 6, 5, level ? (level > 1 ? '#7a1a14' : '#6a4a18') : '#2a2630');
    if (glowG && level) {
      const a = t * (level > 1 ? 9 : 6), col = level > 1 ? '#ff3a2a' : '#ffb040';
      glowG.fillStyle = col; glowG.fillRect(x - 3 + Math.round(Math.cos(a) * 2), y - 35, 3, 5);
    }
  }
  return { C, hash, paintRoom, box, tank, spinner, loom, press, pressShadow, animator, belt, item, soulMain, monitors, beacon, wreck, stencil };
})();
