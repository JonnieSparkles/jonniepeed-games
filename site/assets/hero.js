// Interactive pixel version of the JonniePeed logo.
// Arched lettering is built in code from Pixelify Sans and shaded like the paint letters in the logo.
// Letters start pale; the rainbow paints them in. Hold to spray (the longer you hold, the stronger it gets)
// and slide left or right to swing the direction. He turns and leans with the stream.
// When nobody is playing he puts on the show himself, then the paint slowly fades and he starts again.
(function () {
  const cv = document.getElementById('hero');
  if (!cv) return;
  const g = cv.getContext('2d');
  const H = 136, GROUND = 132, S = 2.05, GRAV = 150;
  const BANDS = ['#ec188c', '#ffcc00', '#1e9bf0'];
  const PAINT = ['#1e9bf0', '#63b81c', '#ff8a1f', '#ec188c', '#8a2be2', '#ffcc00'];
  const SHADES = {
    blue: ['#1e9bf0', '#8fd0ff', '#0c5c9e'], green: ['#63b81c', '#acdf62', '#367209'],
    orange: ['#ff8a1f', '#ffc477', '#b85300'], pink: ['#ec188c', '#ff86c4', '#980a57'], purple: ['#8a2be2', '#bd92f6', '#53139a']
  };
  const WORD = 'JonniePeed';
  const LETTER_COLORS = ['blue', 'green', 'orange', 'pink', 'purple', 'blue', 'green', 'orange', 'pink', 'purple'];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const darkQ = matchMedia('(prefers-color-scheme: dark)');

  let W = 180, scale = 2, time = 0, last = 0, running = false, visible = true;
  let letters = [], box = { x: 0, y: 0, w: 0, h: 0 };
  let parts = [], drops = [], puddles = new Map(), confetti = [];
  // control state
  let holding = false, aimDir = 0.5, power = 0, lastInput = -99, facing = 1, hop = 0, cheer = 0;
  let figX = 60, allPaintedAt = -1, fading = -1;

  // ---------- theme ----------
  function isDark() {
    const t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : darkQ.matches;
  }
  const pale = () => isDark() ? ['#36304a', '#453e5c', '#29243a'] : ['#e7e3ef', '#f5f3f9', '#d3cde0'];
  function ink() { return getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#17141f'; }
  function groundColor() { return getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#e8e4f0'; }

  // ---------- lettering ----------
  function shadeGlyph(owner, w, h, sh, ctx, withDrips, seedBase) {
    const at = (x, y) => (x >= 0 && y >= 0 && x < w && y < h) ? owner[y * w + x] : 0;
    let shine = false;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      let c = sh[0];
      if (!at(x, y - 1)) c = sh[1];
      else if (!at(x, y + 1) || (!at(x + 1, y) && !at(x + 1, y + 1))) c = sh[2];
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
      if (!shine && at(x, y - 1) && !at(x, y - 2) && at(x - 1, y) && at(x + 1, y)) { shine = true; ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); }
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!at(x, y) && at(x - 1, y - 1)) { ctx.fillStyle = 'rgba(40,20,60,0.25)'; ctx.fillRect(x, y, 1, 1); }
    if (!withDrips) return;
    let seed = seedBase;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let x = 1; x < w - 1; x++) for (let y = h - 1; y > 0; y--) {
      if (!at(x, y)) continue;
      if (!at(x, y + 1) && at(x - 1, y) && at(x + 1, y) && rnd() < 0.18) {
        const len = 2 + Math.floor(rnd() * 5);
        ctx.fillStyle = sh[0]; ctx.fillRect(x, y + 1, 1, len);
        if (len > 3) { ctx.fillRect(x - 1, y + len, 3, 1); ctx.fillRect(x, y + len + 1, 1, 1); }
        ctx.fillStyle = sh[2]; ctx.fillRect(x, y + len, 1, 1);
      }
      break;
    }
  }

  function buildLetters() {
    const keep = letters.map(l => l.painted);
    const target = Math.min(W - 10, 210);
    const font = sz => `600 ${sz}px "Pixelify Sans", ui-monospace, monospace`;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font(20);
    const fs = Math.max(14, Math.floor(20 * target / probe.measureText(WORD).width));
    probe.font = font(fs);
    const STRETCH = 1.45, gh = Math.ceil(fs * STRETCH) + 10;
    const total = probe.measureText(WORD).width, x0 = (W - total) / 2;
    const ARCH = Math.round(Math.min(20, W * 0.085));
    letters = [];
    for (let i = 0; i < WORD.length; i++) {
      const adv = probe.measureText(WORD.slice(0, i)).width, cw = probe.measureText(WORD[i]).width;
      const gw = Math.ceil(cw) + 6;
      const off = document.createElement('canvas'); off.width = gw; off.height = gh;
      const o = off.getContext('2d');
      o.setTransform(1, 0, 0, STRETCH, 0, 0); o.font = font(fs); o.fillStyle = '#000';
      o.fillText(WORD[i], 3, Math.round(fs * 0.82));
      const d = o.getImageData(0, 0, gw, gh).data;
      const raw = new Uint8Array(gw * gh);
      for (let p = 0; p < gw * gh; p++) raw[p] = d[p * 4 + 3] > 120 ? 1 : 0;
      // fatten sideways by a pixel: chunky paint strokes, holes in e, o and P stay open
      const m = raw.slice();
      for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) if (!raw[y * gw + x] && ((x > 0 && raw[y * gw + x - 1]) || (x < gw - 1 && raw[y * gw + x + 1]))) m[y * gw + x] = 1;
      const col = document.createElement('canvas'); col.width = gw; col.height = gh + 8;
      shadeGlyph(m, gw, gh, SHADES[LETTER_COLORS[i]], col.getContext('2d'), true, 11 + i * 97);
      const pl = document.createElement('canvas'); pl.width = gw; pl.height = gh;
      shadeGlyph(m, gw, gh, pale(), pl.getContext('2d'), false, 0);
      const u = (adv + cw / 2) / total;
      const lx = Math.round(x0 + adv - 3), ly = 6 + Math.round(ARCH - ARCH * Math.sin(Math.PI * u));
      letters.push({ i, x: lx, y: ly, w: gw, h: gh, mask: m, col, pale: pl, painted: keep[i] ?? calm, bounce: 0, stains: new Map(), color: SHADES[LETTER_COLORS[i]][0] });
    }
    let minX = W, maxX = 0, minY = H, maxY = 0;
    for (const l of letters) for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) if (l.mask[y * l.w + x]) {
      minX = Math.min(minX, l.x + x); maxX = Math.max(maxX, l.x + x); minY = Math.min(minY, l.y + y); maxY = Math.max(maxY, l.y + y);
    }
    box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }
  function letterAt(x, y) {
    for (const l of letters) {
      const lx = Math.floor(x - l.x), ly = Math.floor(y - l.y + (l.bounce > 0 ? 2 : 0));
      if (lx >= 0 && ly >= 0 && lx < l.w && ly < l.h && l.mask[ly * l.w + lx]) return { l, lx, ly };
    }
    return null;
  }

  // ---------- sizing ----------
  function size() {
    const cw = cv.parentElement.clientWidth;
    scale = Math.max(2, Math.min(4, Math.floor(cw / 150)));
    W = Math.max(130, Math.floor(cw / scale));
    cv.width = W; cv.height = H;
    cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
    buildLetters();
    figX = Math.round(box.x + box.w * 0.3);
    puddles.clear(); drops = []; parts = [];
    confetti = []; for (let i = 0; i < 4; i++) confetti.push(newConfetti(true));
    draw();
  }
  function newConfetti(anywhere) {
    return { x: anywhere ? 8 + Math.random() * (W - 16) : (Math.random() < 0.5 ? -4 : W + 4), y: 8 + Math.random() * 52, vx: (Math.random() - 0.5) * 5 || 1.5, ph: Math.random() * 6, c: PAINT[(Math.random() * PAINT.length) | 0], wait: 0 };
  }

  // ---------- drawing helpers ----------
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function line(x0, y0, x1, y1, c, t) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2) || 1, h = (t - 1) / 2;
    for (let i = 0; i <= n; i++) { const u = i / n; R(x0 + (x1 - x0) * u - h, y0 + (y1 - y0) * u - h, t, t, c); }
  }

  // The figure is the original small stick figure, scaled up, mirrored to face the stream,
  // and leaned: the upper body tilts back as the stream gets stronger.
  function figurePose(pw = power, face = facing, still = false) {
    const lean = (calm ? 0.4 : 0.3 + pw * 1.1) * -1;               // lean back, in local units at the shoulders
    const bob = still ? 0 : hop > 0 ? -3 : cheer > 0 ? -Math.abs(Math.sin(cheer * 18)) * 3 : 0;
    const sway = calm || still ? 0 : Math.sin(time * 2.2) * 0.25;
    return (x, y) => {
      const k = y < 33 ? (33 - y) / 23 : 0;
      return { x: figX + ((x - 6.5) + (lean + sway) * k) * S * face, y: GROUND - (44 - y) * S + bob };
    };
  }
  function figure(color) {
    const L = figurePose(), seg = (a, b, t) => { const p = L(a[0], a[1]), q = L(b[0], b[1]); line(p.x, p.y, q.x, q.y, color, t); };
    seg([6, 33], [1, 43], 3); seg([7, 33], [12, 43], 3);
    const f1 = L(1, 43.6), f2 = L(12, 43.6);
    line(f1.x, f1.y, f1.x + 3 * facing, f1.y, color, 2); line(f2.x, f2.y, f2.x + 3 * facing, f2.y, color, 2);
    seg([6.5, 22], [6.5, 33.5], 3);
    seg([5.5, 24], [1, 28], 2); seg([1, 28], [5.5, 31], 2);
    seg([7.5, 24], [12, 28], 2); seg([12, 28], [7.5, 31], 2);
    const hc = L(6.5, 17), r = 4.4 * S;
    for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) if (i * i + j * j <= r * r) R(hc.x + i, hc.y + j, 1, 1, color);
    const b0 = L(10, 14.6), b1 = L(14.5, 14.6);
    line(b0.x, b0.y, b1.x, b1.y, color, 2);
    const knob = L(6.5, 12.4); R(knob.x - 1, knob.y - 1, 2, 2, color);
    // cap line
    const c0 = L(2.6, 15.6), c1 = L(10.6, 15.6);
    const n = Math.ceil(Math.abs(c1.x - c0.x)) + 1;
    for (let i = 0; i <= n; i++) { const u = i / n; g.clearRect(Math.round(c0.x + (c1.x - c0.x) * u), Math.round(c0.y + (c1.y - c0.y) * u), 1, 1); }
    return L(9.5, 31);
  }

  // ---------- the stream: a real arc from his hip ----------
  function trace(o, aim = aimDir, pw = power) {
    const ang = (5 + Math.abs(aim) * 66) * Math.PI / 180;             // from straight up
    const v = 60 + pw * 135;
    let vx = Math.sin(ang) * v * Math.sign(aim || 1), vy = -Math.cos(ang) * v, x = o.x, y = o.y;
    const pts = [];
    for (let k = 0; k < 900; k++) {
      const dt = 0.0035;
      x += vx * dt; y += vy * dt; vy += GRAV * dt;
      pts.push({ x, y });
      if (k > 6 && letterAt(x, y)) return { pts, hit: { x, y } };
      if (y >= GROUND || x < -2 || x > W + 2) return { pts, hit: y >= GROUND ? { x, y: GROUND, ground: true } : null };
    }
    return { pts, hit: null };
  }

  function draw() {
    if (!letters.length) return null;
    const color = ink();
    g.clearRect(0, 0, W, H);
    R(0, GROUND + 1, W, 1, groundColor());
    for (const l of letters) {
      const dy = l.bounce > 0 ? -2 : 0;
      g.drawImage(l.painted ? l.col : l.pale, l.x, l.y + dy);
      for (const [k, s] of l.stains) { g.globalAlpha = Math.min(1, s.life / 2); R(l.x + k % l.w, l.y + dy + ((k / l.w) | 0), 1, 1, s.c); }
      g.globalAlpha = 1;
    }
    for (const [x, s] of puddles) { g.globalAlpha = Math.min(1, s.life / 2); R(x, GROUND, 1, 1, s.c); if (s.n > 2) R(x, GROUND - 1, 1, 1, s.c); g.globalAlpha = 1; }
    for (const d of drops) R(d.x, d.y, 1, 2, d.c);
    for (const cf of confetti) {
      if (cf.wait > 0) continue;
      if (Math.floor((time * 1.5 + cf.ph) % 2)) { R(cf.x, cf.y - 2, 1, 1, cf.c); R(cf.x - 1, cf.y - 1, 3, 1, cf.c); R(cf.x - 2, cf.y, 5, 1, cf.c); R(cf.x - 1, cf.y + 1, 3, 1, cf.c); R(cf.x, cf.y + 2, 1, 1, cf.c); }
      else R(cf.x - 1, cf.y - 1, 3, 3, cf.c);
    }
    const o = figure(color);
    let res = null;
    if (power > 0.04) {
      res = trace(o);
      const pts = res.pts;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m;
        const glint = ((i - Math.floor(time * 220)) % 70 + 70) % 70 < 2;
        const thin = power < 0.25 && i > pts.length * 0.6;
        R(b.x - nx, b.y - ny, 1, 1, glint ? '#ffffff' : BANDS[0]); R(b.x, b.y, 1, 1, BANDS[1]); if (!thin) R(b.x + nx, b.y + ny, 1, 1, BANDS[2]);
      }
    }
    for (const p of parts) R(p.x, p.y, 1, 1, p.c);
    return res;
  }

  // ---------- simulation ----------
  function spray(x, y, n, power2, colors, spark) {
    for (let i = 0; i < n; i++) parts.push({ x, y, spark, vx: (Math.random() - 0.5) * 60 * power2, vy: -(10 + Math.random() * 32) * power2, c: colors ? colors[(Math.random() * colors.length) | 0] : PAINT[(Math.random() * PAINT.length) | 0] });
  }
  function puddle(x, c) { if (x < 0 || x >= W) return; const s = puddles.get(x); puddles.set(x, { c, life: 6, n: s ? s.n + 1 : 1 }); }
  function paintLetter(l) {
    if (l.painted) return;
    l.painted = true; l.bounce = 0.22;
    spray(l.x + l.w / 2, l.y + l.h / 2, 14, 1.1, [l.color, '#ffffff', l.color], true);
    if (letters.every(k => k.painted)) celebrate();
  }
  function celebrate() {
    allPaintedAt = time; cheer = 1.2;
    for (let i = 0; i < 70; i++) parts.push({ spark: true, x: box.x + Math.random() * box.w, y: box.y + Math.random() * box.h, vx: (Math.random() - 0.5) * 90, vy: -(20 + Math.random() * 60), c: PAINT[(Math.random() * PAINT.length) | 0] });
    for (const cf of confetti) if (cf.wait <= 0) pop(cf);
  }
  function pop(cf) {
    for (let i = 0; i < 16; i++) parts.push({ spark: true, x: cf.x, y: cf.y, vx: (Math.random() - 0.5) * 80, vy: -(10 + Math.random() * 45), c: cf.c });
    cf.wait = 1.5 + Math.random() * 2.5;
  }

  // idle show: he paints the word in from left to right, then plays across it; short pauses in between.
  // Each new target letter gets a quick search for an aim and strength whose arc actually lands on it.
  const auto = { goalAim: 0.5, goalPow: 0.7, next: 0, idx: 0, skip: new Set() };
  function solveFor(l) {
    let bestScore = Infinity, best = null;
    const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
    for (let a = -1; a <= 1.001; a += 0.06) {
      if (Math.abs(a) < 0.03) continue;
      for (let pw = 0.3; pw <= 1.001; pw += 0.07) {
        const o = figurePose(pw, Math.sign(a), true)(9.5, 31);
        const r = trace(o, a, pw);
        if (!r.hit || r.hit.ground) continue;
        const hl = letterAt(r.hit.x, r.hit.y);
        if (!hl) continue;
        const sc = (hl.l === l ? 0 : 1000) + Math.hypot(r.hit.x - cx, r.hit.y - cy) + Math.abs(a - aimDir) * 4;
        if (sc < bestScore) { bestScore = sc; best = { a, pw, direct: hl.l === l }; }
      }
    }
    return best;
  }
  function autopilot(dt) {
    if (time >= auto.next) {
      const unpainted = letters.filter(l => !l.painted && !auto.skip.has(l));
      if (!unpainted.length) auto.skip.clear();
      const l = unpainted.length ? unpainted[0] : letters[(auto.idx = (auto.idx + 1 + Math.floor(Math.random() * 3)) % letters.length)];
      const sol = solveFor(l);
      if (sol && !sol.direct && !l.painted) auto.skip.add(l);
      if (sol) { auto.goalAim = sol.a; auto.goalPow = sol.pw; }
      auto.next = time + (unpainted.length ? 0.55 : 1.1 + Math.random() * 0.8);
    }
    aimDir += (auto.goalAim - aimDir) * Math.min(1, dt * 5);
    const c = time % 14;
    return c < 12.6 ? auto.goalPow : 0;
  }

  function step(dt) {
    const user = time - lastInput < 4;
    let want;
    if (user) want = holding ? Math.min(1, power + dt * 1.1) : 0;
    else want = autopilot(dt);
    power += (want - power) * Math.min(1, dt * (want > power ? (user ? 30 : 6) : 6));
    if (Math.abs(aimDir) > 0.02) facing = Math.sign(aimDir);
    hop = Math.max(0, hop - dt); cheer = Math.max(0, cheer - dt);
    for (const l of letters) l.bounce = Math.max(0, l.bounce - dt);

    // after a good while fully painted with nobody around, the paint fades and the show restarts
    if (allPaintedAt >= 0 && !user && time - allPaintedAt > 18 && fading < 0) fading = time;
    if (fading >= 0) {
      const n = Math.floor((time - fading) / 0.12);
      for (let i = 0; i < letters.length && i <= n; i++) letters[letters.length - 1 - i].painted = false;
      if (n >= letters.length) { fading = -1; allPaintedAt = -1; }
    }

    const res = draw();
    if (res && res.hit) {
      const h = res.hit;
      if (Math.random() < dt * 28) spray(h.x, h.y, 1, h.ground ? 0.6 : 1);
      const hit = h.ground ? null : letterAt(h.x, h.y);
      if (hit) {
        paintLetter(hit.l);
        if (Math.random() < dt * 24) for (let k = 0; k < 2; k++) {
          const sx = hit.lx + Math.round((Math.random() - 0.5) * 6), sy = hit.ly + Math.round((Math.random() - 0.5) * 5);
          if (sx >= 0 && sy >= 0 && sx < hit.l.w && sy < hit.l.h && hit.l.mask[sy * hit.l.w + sx]) hit.l.stains.set(sy * hit.l.w + sx, { c: PAINT[(Math.random() * PAINT.length) | 0], life: 6 + Math.random() * 4 });
        }
        if (Math.random() < dt * 2) drops.push({ x: Math.round(h.x), y: Math.round(h.y), c: PAINT[(Math.random() * PAINT.length) | 0], vy: 0, crawl: true });
      } else if (h.ground && Math.random() < dt * 20) puddle(Math.round(h.x), PAINT[(Math.random() * PAINT.length) | 0]);
      for (const cf of confetti) if (cf.wait <= 0) for (let i = 0; i < res.pts.length; i += 3) { const p = res.pts[i]; if (Math.abs(p.x - cf.x) < 3 && Math.abs(p.y - cf.y) < 3) { pop(cf); break; } }
    }
    for (const cf of confetti) {
      if (cf.wait > 0) { cf.wait -= dt; if (cf.wait <= 0) Object.assign(cf, newConfetti(false)); continue; }
      cf.x += cf.vx * dt; cf.y += Math.sin(time * 1.2 + cf.ph) * 3 * dt;
      if (cf.x < -6 || cf.x > W + 6) Object.assign(cf, newConfetti(false));
    }
    for (const p of parts) { p.vy += GRAV * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter(p => {
      if (p.vy > 0 && !p.spark) { const h = letterAt(p.x, p.y); if (h) { if (!h.l.painted && Math.random() < 0.35) paintLetter(h.l); else h.l.stains.set(h.ly * h.l.w + h.lx, { c: p.c, life: 5 }); return false; } }
      if (p.y < GROUND) return p.x > -2 && p.x < W + 2;
      puddle(Math.round(p.x), p.c); return false;
    });
    // drips slide down the letter they landed on, then fall
    for (const d of drops) {
      if (d.crawl) { d.y += dt * 9; if (!letterAt(d.x, d.y + 1)) d.crawl = false; }
      else { d.vy += GRAV * dt; d.y += d.vy * dt; }
    }
    drops = drops.filter(d => { if (!d.crawl && d.y >= GROUND) { puddle(d.x, d.c); return false; } return d.y < H; });
    for (const l of letters) for (const [k, s] of l.stains) { s.life -= dt; if (s.life <= 0) l.stains.delete(k); }
    for (const [k, s] of puddles) { s.life -= dt; if (s.life <= 0) puddles.delete(k); }
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; time += dt;
    step(dt);
    requestAnimationFrame(tick);
  }
  function start() { if (calm || running || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(tick); }
  function stop() { running = false; }

  // ---------- controls: hold to spray, slide left or right to aim ----------
  function steer(e) {
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W;
    aimDir = Math.max(-1, Math.min(1, (x - figX) / (W * 0.42)));
    if (Math.abs(aimDir) < 0.06) aimDir = 0.06 * (facing || 1);
    lastInput = time;
  }
  cv.addEventListener('pointerdown', e => {
    steer(e); holding = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
    if (Math.abs(x - figX) < 10 && y > GROUND - 60) hop = 0.25;
    if (calm) { power = 0.8; draw(); }
  });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointermove', e => { if (holding || e.pointerType === 'mouse') steer(e); });
  const release = () => { holding = false; lastInput = time; if (calm) { power = 0.8; draw(); } };
  cv.addEventListener('pointerup', release);
  cv.addEventListener('pointercancel', release);
  cv.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); lastInput = time;
      aimDir = Math.max(-1, Math.min(1, aimDir + (e.key === 'ArrowLeft' ? -0.12 : 0.12)));
      if (Math.abs(aimDir) < 0.06) aimDir = e.key === 'ArrowLeft' ? -0.06 : 0.06;
      if (calm) draw();
    } else if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); holding = true; lastInput = time; }
  });
  cv.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { holding = false; lastInput = time; } });
  cv.addEventListener('blur', () => { holding = false; });

  function boot() {
    let lastW = -1;
    new ResizeObserver(() => { const cw = cv.parentElement.clientWidth; if (cw !== lastW) { lastW = cw; size(); } }).observe(cv.parentElement);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(cv);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    const rebuild = () => { buildLetters(); draw(); };
    darkQ.addEventListener?.('change', rebuild);
    new MutationObserver(rebuild).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (calm) { power = 0.8; aimDir = 0.55; }
    size(); start();
  }
  const ready = document.fonts && document.fonts.load ? document.fonts.load('600 20px "Pixelify Sans"').catch(() => {}) : Promise.resolve();
  ready.then(boot);
})();
