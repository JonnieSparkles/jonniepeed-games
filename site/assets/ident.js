// Pixel version of the Jonniepeed logo: a stick figure sends a rainbow arc across the shelf.
// Splashes land on the ground line and leave colour stains that fade. Tap or press Enter for a big splash.
(function () {
  const cv = document.getElementById('ident');
  if (!cv) return;
  const g = cv.getContext('2d');
  const H = 48, GROUND = 44;
  const BANDS = ['#ec188c', '#ffcc00', '#1e9bf0'];
  const COLORS = ['#ec188c', '#ff7a14', '#ffcc00', '#5fbf1e', '#1e9bf0', '#8a2be2'];
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 120, scale = 3, time = 0, last = 0, running = false, visible = true;
  let parts = [], stains = new Map(), surge = 0;

  function size() {
    const cw = cv.parentElement.clientWidth;
    scale = cw >= 600 ? 4 : 3;
    W = Math.max(80, Math.floor(cw / scale));
    cv.width = W; cv.height = H;
    cv.style.width = W * scale + 'px';
    cv.style.height = H * scale + 'px';
    if (calm) draw();
  }

  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
  function line(x0, y0, x1, y1, c, t) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
    for (let i = 0; i <= n; i++) { const u = i / n; R(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, t, t, c); }
  }
  function tokens() {
    const s = getComputedStyle(document.documentElement);
    return { ink: s.getPropertyValue('--ink').trim() || '#17141f', line: s.getPropertyValue('--line').trim() || '#e8e4f0' };
  }

  // stream cycle: 7.5s flowing, 1.5s off
  function phase(t) {
    const c = t % 9;
    if (c < 0.4) return { grow: c / 0.4, cut: 0, on: false };
    if (c < 7.5) return { grow: 1, cut: 0, on: true };
    if (c < 8) return { grow: 1, cut: (c - 7.5) / 0.5, on: false };
    return { grow: 0, cut: 1, on: false };
  }

  function figure(fx, sway, ink) {
    const b = fx + sway;
    // legs and feet stay planted
    line(fx + 6, 33, fx + 1, GROUND - 1, ink, 2);
    line(fx + 7, 33, fx + 11, GROUND - 1, ink, 2);
    R(fx - 1, GROUND - 1, 3, 2, ink); R(fx + 11, GROUND - 1, 3, 2, ink);
    // torso and hands-on-hips arms
    R(b + 5, 22, 2, 12, ink);
    line(b + 5, 24, b + 1, 28, ink, 1); line(b + 1, 28, b + 5, 31, ink, 1);
    line(b + 7, 24, b + 11, 28, ink, 1); line(b + 11, 28, b + 7, 31, ink, 1);
    // head with cap and brim, cap line cut through
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= 18) R(b + 6 + i, 17 + j, 1, 1, ink);
    R(b + 3, 11, 6, 2, ink); R(b + 2, 12, 9, 3, ink); R(b + 10, 14, 4, 1, ink); R(b + 5, 10, 1, 1, ink);
    g.clearRect(b + 2, 15, 9, 1);
  }

  function draw() {
    const { ink, line: ground } = tokens();
    g.clearRect(0, 0, W, H);
    R(0, GROUND + 1, W, 1, ground);
    for (const [x, s] of stains) { g.globalAlpha = Math.min(1, s.life / 2); R(x, GROUND, 1, 1, s.c); if (s.big) R(x, GROUND - 1, 1, 1, s.c); }
    g.globalAlpha = 1;

    const fx = 6, sway = calm ? 0 : Math.round(Math.sin(time * 2.2) * 0.6);
    const ph = calm ? { grow: 1, cut: 0, on: true } : phase(time);
    const ox = fx + 9 + sway, oy = 31;
    const reach = Math.min(W - ox - 8, 150) * (0.5 + 0.32 * (0.5 + 0.5 * Math.sin(time * 0.8)) + 0.18 * surge);
    const tx = ox + reach, peak = 18 + 6 * surge + 2 * Math.sin(time * 1.3);
    const n = Math.ceil(reach * 1.6);
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      if (u > ph.grow || u < ph.cut) continue;
      const x = ox + (tx - ox) * u, y = oy + (GROUND - oy) * u - peak * 4 * u * (1 - u);
      // three rainbow bands, with a bright glint that runs along the stream
      const glint = ((i - Math.floor(time * 60)) % 24 + 24) % 24 === 0;
      R(x, y - 1, 1, 1, glint ? '#ffffff' : BANDS[0]);
      R(x, y, 1, 1, BANDS[1]);
      R(x, y + 1, 1, 1, BANDS[2]);
    }
    figure(fx, sway, ink);
    for (const p of parts) R(p.x, p.y, 1, 1, p.c);
    return { tx, on: ph.on };
  }

  function burst(x, n, power) {
    for (let i = 0; i < n; i++) parts.push({ x, y: GROUND - 1, vx: (Math.random() - 0.4) * 40 * power, vy: -(12 + Math.random() * 30) * power, c: COLORS[(Math.random() * 6) | 0] });
  }

  function tick(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; time += dt;
    surge = Math.max(0, surge - dt * 1.2);
    const { tx, on } = draw();
    if (on && Math.random() < dt * 45) burst(tx, 1, 1);
    for (const p of parts) { p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    parts = parts.filter(p => {
      if (p.y < GROUND) return p.x > -2 && p.x < W + 2;
      const x = Math.round(p.x);
      if (x >= 0 && x < W && Math.random() < 0.5) { const s = stains.get(x); stains.set(x, { c: p.c, life: 5, big: !!s }); }
      return false;
    });
    for (const [x, s] of stains) { s.life -= dt; if (s.life <= 0) stains.delete(x); }
    requestAnimationFrame(tick);
  }
  function start() { if (calm || running || !visible || document.hidden) return; running = true; last = performance.now(); requestAnimationFrame(tick); }
  function stop() { running = false; }

  function splash() {
    surge = 1;
    const ox = 15, reach = Math.min(W - ox - 8, 150);
    burst(ox + reach * 0.85, 40, 1.3);
    if (calm) { for (let i = 0; i < 20; i++) stains.set(Math.round(ox + reach * (0.6 + Math.random() * 0.4)), { c: COLORS[(Math.random() * 6) | 0], life: 5 }); parts = []; draw(); }
  }
  cv.addEventListener('click', splash);
  cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); splash(); } });

  new ResizeObserver(size).observe(cv.parentElement);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(cv);
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  size(); draw(); start();
})();
