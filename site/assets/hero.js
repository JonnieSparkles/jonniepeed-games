// Interactive pixel version of the JonniePeed logo.
// The lettering is drawn in code from Pixelify Sans, thresholded to hard pixels and shaded like the paint letters
// in the logo. The stick figure aims his rainbow wherever you point (hover, tap or drag); paint splats and drips
// on the letters, confetti squares pop when hit, and when nobody is aiming he sweeps across the letters on his own.
(function () {
  const cv = document.getElementById('hero');
  if (!cv) return;
  const g = cv.getContext('2d');
  const H = 88, GROUND = 84;
  const BANDS = ['#ec188c', '#ffcc00', '#1e9bf0'];
  const PAINT = ['#1e9bf0', '#63b81c', '#ff8a1f', '#ec188c', '#8a2be2', '#ffcc00'];
  const SHADES = {
    blue: ['#1e9bf0', '#8fd0ff', '#0c5c9e'], green: ['#63b81c', '#acdf62', '#367209'],
    orange: ['#ff8a1f', '#ffc477', '#b85300'], pink: ['#ec188c', '#ff86c4', '#980a57'], purple: ['#8a2be2', '#bd92f6', '#53139a']
  };
  const WORD = 'JonniePeed';
  const LETTER_COLORS = ['blue', 'green', 'orange', 'pink', 'purple', 'blue', 'green', 'orange', 'pink', 'purple'];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 180, scale = 2, time = 0, last = 0, running = false, visible = true;
  let layer = null, mask = null, box = { x: 0, y: 6, w: 0, h: 0 };
  let parts = [], drips = [], stains = new Map(), puddles = new Map(), confetti = [];
  let aim = null, lastInput = -99, surge = 0, hop = 0, fx = 40;

  // ---------- lettering ----------
  function buildLetters() {
    const target = Math.min(W - 10, 172);
    const font = sz => `600 ${sz}px "Pixelify Sans", ui-monospace, monospace`;
    const probe = document.createElement('canvas').getContext('2d');
    probe.font = font(20);
    const fs = Math.max(14, Math.floor(20 * target / probe.measureText(WORD).width));
    const off = document.createElement('canvas'), lw = W, lh = 48, STRETCH = 1.45;
    off.width = lw; off.height = lh;
    const o = off.getContext('2d');
    o.font = font(fs); o.textBaseline = 'alphabetic';
    const tw = o.measureText(WORD).width, x0 = Math.round((W - tw) / 2), base = Math.round((fs * 0.8 + 3) / STRETCH) + 1;
    o.setTransform(1, 0, 0, STRETCH, 0, 0);
    // draw each letter in its own index colour so we know which letter owns each pixel
    const owner = new Int8Array(lw * lh).fill(-1);
    for (let i = 0; i < WORD.length; i++) {
      o.clearRect(0, 0, lw, lh / STRETCH + 1);
      o.fillStyle = '#000';
      o.fillText(WORD[i], x0 + o.measureText(WORD.slice(0, i)).width, base);
      const d = o.getImageData(0, 0, lw, lh).data;
      for (let p = 0; p < lw * lh; p++) if (d[p * 4 + 3] > 120 && owner[p] < 0) owner[p] = i;
    }
    // fatten strokes sideways by a pixel so the letters read as chunky paint; sideways only, so the holes in e, o and P stay open
    const fat = owner.slice();
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      if (owner[y * lw + x] >= 0) continue;
      const n = [[1, 0], [-1, 0]].map(([dx, dy]) => (x + dx >= 0 && x + dx < lw && y + dy >= 0 && y + dy < lh) ? owner[(y + dy) * lw + x + dx] : -1).find(v => v >= 0);
      if (n !== undefined) fat[y * lw + x] = n;
    }
    owner.set(fat);
    mask = new Uint8Array(W * H);
    const lay = document.createElement('canvas'); lay.width = W; lay.height = H;
    const l = lay.getContext('2d');
    const at = (x, y) => (x >= 0 && y >= 0 && x < lw && y < lh) ? owner[y * lw + x] : -1;
    let minX = W, maxX = 0, minY = lh, maxY = 0;
    // fill, with a light top edge, a dark bottom edge and a drop shadow down and to the right
    const shine = new Set();
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const i = at(x, y); if (i < 0) continue;
      const sh = SHADES[LETTER_COLORS[i]];
      let c = sh[0];
      if (at(x, y - 1) < 0) c = sh[1];
      else if (at(x, y + 1) < 0 || at(x + 1, y) < 0 && at(x + 1, y + 1) < 0) c = sh[2];
      l.fillStyle = c; l.fillRect(x, y, 1, 1);
      mask[y * W + x] = i + 1;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      // glossy highlight: first solid pixel one row below the top edge of each letter
      if (!shine.has(i) && at(x, y - 1) >= 0 && at(x, y - 2) < 0 && at(x - 1, y) >= 0 && at(x + 1, y) >= 0) { shine.add(i); l.fillStyle = '#ffffff'; l.fillRect(x, y, 1, 1); }
    }
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      if (at(x, y) >= 0 || at(x - 1, y - 1) < 0) continue;
      l.fillStyle = 'rgba(40,20,60,0.28)'; l.fillRect(x, y, 1, 1);
    }
    // a few painted drips hanging off the bottoms of letters, like the logo
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let x = 0; x < lw; x++) {
      for (let y = lh - 1; y > 0; y--) {
        const i = at(x, y);
        if (i < 0) continue;
        if (at(x, y + 1) < 0 && at(x - 1, y) >= 0 && at(x + 1, y) >= 0 && rnd() < 0.16) {
          const len = 2 + Math.floor(rnd() * 5), sh = SHADES[LETTER_COLORS[i]];
          l.fillStyle = sh[0]; l.fillRect(x, y + 1, 1, len);
          l.fillStyle = sh[2]; l.fillRect(x, y + len, 1, 1);
          if (len > 3) { l.fillStyle = sh[0]; l.fillRect(x - 1, y + len, 3, 1); l.fillRect(x, y + len + 1, 1, 1); }
          for (let k = 1; k <= len; k++) mask[(y + k) * W + x] = i + 1;
        }
        break;
      }
    }
    box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
    layer = lay;
  }

  // ---------- sizing ----------
  function size() {
    const cw = cv.parentElement.clientWidth;
    scale = Math.max(2, Math.min(4, Math.floor(cw / 150)));
    W = Math.max(120, Math.floor(cw / scale));
    cv.width = W; cv.height = H;
    cv.style.width = W * scale + 'px'; cv.style.height = H * scale + 'px';
    buildLetters();
    fx = Math.round(box.x + box.w * 0.3 - 6);
    stains.clear(); puddles.clear(); drips = []; parts = [];
    seedConfetti();
    draw();
  }

  function seedConfetti() {
    confetti = [];
    for (let i = 0; i < 5; i++) confetti.push(newConfetti(true));
  }
  function newConfetti(anywhere) {
    const y = 4 + Math.random() * 40;
    return { x: anywhere ? Math.random() * W : (Math.random() < 0.5 ? -4 : W + 4), y, vx: (Math.random() - 0.5) * 4 || 1, ph: Math.random() * 6, c: PAINT[(Math.random() * PAINT.length) | 0], wait: 0 };
  }

  // ---------- drawing helpers ----------
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function line(x0, y0, x1, y1, c, t) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    for (let i = 0; i <= n; i++) { const u = i / n; R(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, t, t, c); }
  }
  function tokens() {
    const s = getComputedStyle(document.documentElement);
    return { ink: s.getPropertyValue('--ink').trim() || '#17141f', ground: s.getPropertyValue('--line').trim() || '#e8e4f0' };
  }

  function figure(x, ink) {
    const Y = GROUND - 44, sway = calm ? 0 : Math.round(Math.sin(time * 2.2) * 0.6), b = x + sway, up = hop > 0 ? -2 : 0;
    g.save(); g.translate(0, up);
    line(x + 6, Y + 33, x + 1, Y + 43, ink, 2); line(x + 7, Y + 33, x + 11, Y + 43, ink, 2);
    R(x - 1, Y + 43, 3, 2, ink); R(x + 11, Y + 43, 3, 2, ink);
    R(b + 5, Y + 22, 2, 12, ink);
    line(b + 5, Y + 24, b + 1, Y + 28, ink, 1); line(b + 1, Y + 28, b + 5, Y + 31, ink, 1);
    line(b + 7, Y + 24, b + 11, Y + 28, ink, 1); line(b + 11, Y + 28, b + 7, Y + 31, ink, 1);
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= 18) R(b + 6 + i, Y + 17 + j, 1, 1, ink);
    R(b + 3, Y + 11, 6, 2, ink); R(b + 2, Y + 12, 9, 3, ink); R(b + 10, Y + 14, 4, 1, ink); R(b + 5, Y + 10, 1, 1, ink);
    g.clearRect(b + 2, Y + 15, 9, 1);
    g.restore();
    return { ox: b + 9, oy: Y + 31 + up };
  }

  // where the stream is pointed: the visitor's aim, or an idle sweep across the letters
  function target() {
    if (aim && time - lastInput < 3) return aim;
    const u = 0.5 + 0.5 * Math.sin(time * 0.55);
    return { x: box.x + box.w * (0.42 + 0.52 * u), y: box.y + box.h * (0.45 + 0.2 * Math.sin(time * 1.3)) };
  }
  function streamOn() {
    if (calm || (aim && time - lastInput < 3)) return 1;
    const c = time % 10;                       // idle rhythm: flow, stop, start again
    if (c < 0.4) return c / 0.4;
    if (c < 8.6) return 1;
    return 0;
  }

  function draw() {
    if (!layer) return null;
    const { ink, ground } = tokens();
    g.clearRect(0, 0, W, H);
    R(0, GROUND + 1, W, 1, ground);
    g.drawImage(layer, 0, 0);
    for (const [k, s] of stains) { g.globalAlpha = Math.min(1, s.life / 2); R(k % W, (k / W) | 0, 1, 1, s.c); }
    for (const [x, s] of puddles) { g.globalAlpha = Math.min(1, s.life / 2); R(x, GROUND, 1, 1, s.c); if (s.n > 2) R(x, GROUND - 1, 1, 1, s.c); }
    g.globalAlpha = 1;
    for (const d of drips) R(d.x, d.y, 1, d.falling ? 2 : 1, d.c);
    for (const cf of confetti) {
      if (cf.wait > 0) continue;
      const tilt = Math.floor((time * 1.5 + cf.ph) % 2);
      if (tilt) { R(cf.x, cf.y - 2, 1, 1, cf.c); R(cf.x - 1, cf.y - 1, 3, 1, cf.c); R(cf.x - 2, cf.y, 5, 1, cf.c); R(cf.x - 1, cf.y + 1, 3, 1, cf.c); R(cf.x, cf.y + 2, 1, 1, cf.c); }
      else R(cf.x - 1, cf.y - 1, 3, 3, cf.c);
    }

    const t = target(), on = streamOn();
    const sway = calm ? 0 : Math.round(Math.sin(time * 2.2) * 0.6);
    const o = { ox: fx + sway + 9, oy: GROUND - 44 + 31 + (hop > 0 ? -2 : 0) };
    let end = null;
    if (on > 0) {
      const tx = Math.max(2, Math.min(W - 2, t.x)), ty = Math.max(2, Math.min(GROUND - 4, t.y));
      // always leave him going forward, so aiming behind him loops up and over rather than through his head
      const cx = Math.max((o.ox + tx) / 2 - (tx - o.ox) * 0.15, o.ox + 8), cy = Math.min(o.oy, ty) - 16 - Math.abs(tx - o.ox) * 0.12 - 8 * surge;
      const len = Math.hypot(tx - o.ox, ty - o.oy) + 30, n = Math.ceil(len * 1.4);
      for (let i = 0; i <= n * on; i++) {
        const u = i / n, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c2 = u * u;
        const x = a * o.ox + b * cx + c2 * tx, y = a * o.oy + b * cy + c2 * ty;
        const dx = 2 * (1 - u) * (cx - o.ox) + 2 * u * (tx - cx), dy = 2 * (1 - u) * (cy - o.oy) + 2 * u * (ty - cy);
        const m = Math.hypot(dx, dy) || 1, nx = -dy / m, ny = dx / m;
        const glint = ((i - Math.floor(time * 60)) % 26 + 26) % 26 === 0;
        R(x - nx, y - ny, 1, 1, glint ? '#ffffff' : BANDS[0]); R(x, y, 1, 1, BANDS[1]); R(x + nx, y + ny, 1, 1, BANDS[2]);
      }
      if (on >= 1) end = { x: tx, y: ty };
    }
    figure(fx, ink);
    for (const p of parts) R(p.x, p.y, 1, 1, p.c);
    return end;
  }

  // ---------- simulation ----------
  const inMask = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[(y | 0) * W + (x | 0)] > 0;
  function splat(x, y, n) {
    for (let i = 0; i < n; i++) {
      const sx = Math.round(x + (Math.random() - 0.5) * 6), sy = Math.round(y + (Math.random() - 0.5) * 5);
      if (inMask(sx, sy)) stains.set(sy * W + sx, { c: PAINT[(Math.random() * PAINT.length) | 0], life: 7 + Math.random() * 4 });
    }
  }
  function spray(x, y, n, power) {
    for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - 0.5) * 50 * power, vy: -(8 + Math.random() * 28) * power, c: PAINT[(Math.random() * PAINT.length) | 0] });
  }

  function step(dt) {
    surge = Math.max(0, surge - dt * 1.4); hop = Math.max(0, hop - dt);
    const end = draw();
    if (end) {
      if (Math.random() < dt * 30) spray(end.x, end.y, 1, 1);
      if (inMask(end.x, end.y)) {
        if (Math.random() < dt * 22) splat(end.x, end.y, 2);
        if (Math.random() < dt * 2.5) drips.push({ x: Math.round(end.x), y: Math.round(end.y), c: PAINT[(Math.random() * PAINT.length) | 0], falling: false, vy: 0, crawl: 0 });
      }
      for (const cf of confetti) if (cf.wait <= 0 && Math.abs(cf.x - end.x) < 4 && Math.abs(cf.y - end.y) < 4) pop(cf);
    }
    for (const cf of confetti) {
      if (cf.wait > 0) { cf.wait -= dt; if (cf.wait <= 0) Object.assign(cf, newConfetti(false)); continue; }
      cf.x += cf.vx * dt; cf.y += Math.sin(time * 1.2 + cf.ph) * 3 * dt;
      if (cf.x < -6 || cf.x > W + 6) Object.assign(cf, newConfetti(false));
    }
    for (const p of parts) { p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter(p => {
      if (inMask(p.x, p.y) && p.vy > 0) { if (Math.random() < 0.5) stains.set((p.y | 0) * W + (p.x | 0), { c: p.c, life: 6 }); return false; }
      if (p.y < GROUND) return p.x > -2 && p.x < W + 2;
      puddle(Math.round(p.x), p.c); return false;
    });
    // drips crawl down through the letter, then fall to the ground
    for (const d of drips) {
      if (!d.falling) {
        d.crawl += dt * 7;
        while (d.crawl >= 1) {
          d.crawl -= 1; stains.set(d.y * W + d.x, { c: d.c, life: 6 });
          if (inMask(d.x, d.y + 1)) d.y++; else { d.falling = true; break; }
        }
      } else { d.vy += 120 * dt; d.y += d.vy * dt; }
    }
    drips = drips.filter(d => { if (d.falling && d.y >= GROUND) { puddle(d.x, d.c); return false; } return true; });
    for (const [k, s] of stains) { s.life -= dt; if (s.life <= 0) stains.delete(k); }
    for (const [k, s] of puddles) { s.life -= dt; if (s.life <= 0) puddles.delete(k); }
  }
  function puddle(x, c) {
    if (x < 0 || x >= W) return;
    const s = puddles.get(x);
    puddles.set(x, { c, life: 6, n: s ? s.n + 1 : 1 });
  }
  function pop(cf) {
    for (let i = 0; i < 14; i++) parts.push({ x: cf.x, y: cf.y, vx: (Math.random() - 0.5) * 70, vy: -(10 + Math.random() * 40), c: cf.c });
    cf.wait = 1.5 + Math.random() * 2;
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; time += dt;
    step(dt);
    requestAnimationFrame(tick);
  }
  function start() { if (calm || running || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(tick); }
  function stop() { running = false; }

  // ---------- input: hover or touch to aim, tap for a big splash ----------
  function toLogical(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
  function aimAt(e) { aim = toLogical(e); lastInput = time; }
  cv.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || e.buttons) aimAt(e); });
  cv.addEventListener('pointerdown', e => {
    aimAt(e); surge = 1;
    const p = aim;
    if (Math.abs(p.x - (fx + 6)) < 9 && p.y > GROUND - 46) { hop = 0.2; return; }
    spray(p.x, p.y, 18, 1.2);
    if (inMask(p.x, p.y)) splat(p.x, p.y, 10);
    if (calm) draw();
  });
  cv.addEventListener('pointerleave', () => { lastInput = time - 2; });
  cv.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-4, 0], ArrowRight: [4, 0], ArrowUp: [0, -3], ArrowDown: [0, 3] }[e.key];
    if (k) { e.preventDefault(); const t = aim && time - lastInput < 3 ? aim : target(); aim = { x: t.x + k[0], y: t.y + k[1] }; lastInput = time; if (calm) draw(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const t = target(); surge = 1; spray(t.x, t.y, 18, 1.2); if (inMask(t.x, t.y)) splat(t.x, t.y, 10); }
  });

  function boot() {
    new ResizeObserver(() => { const before = W; size(); if (before !== W && !running) draw(); }).observe(cv.parentElement);
    if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(cv);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    size(); start();
  }
  const ready = document.fonts && document.fonts.load ? document.fonts.load('600 20px "Pixelify Sans"').catch(() => {}) : Promise.resolve();
  ready.then(boot);
})();
