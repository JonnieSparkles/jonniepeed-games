// Unruggabull: RugCo Alley Remastered, the win picture (Jonnie's pick, take C of
// https://claude.ai/artifact/GDzyMEgNE2aEsYpRDvY84x): the 2025 congratulations art with its baked serif lettering
// covered and redrawn in the game's type (CONGRATULATIONS! in the wordmark style, YOU HAVE DEFEATED in the HUD face,
// THE RUGFATHER in GAME OVER's red), lit by firelight; then he burns out: his eyes gutter and go dark, and a ragged
// line of embers on the 3 px grid climbs from his hem and leaves cold ash, embers drifting off him. Drawn on the end
// card's #end-art canvas (end.js starts it with the card and stops it when the card goes).
window.UnrugWon = (function () {
  const W = 960, H = 540, GRID = 3;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const img = new Image(); img.src = 'art/congrats.webp';
  let cv = null, ctx = null, t0 = 0, last = 0, raf = 0, ash = null, eyes = null, solid = null, embers = [];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // the burn line's ragged edge, fixed so it doesn't shimmer
  const jag = Array.from({ length: W / GRID }, (_, i) => (Math.sin(i * 0.9) * 2 + Math.sin(i * 0.37 + 1) * 3 + (i * 7919 % 5) - 2) * GRID);
  const COLS = ['#fff3a0', '#ffc43c', '#ff8a1f', '#e2461a', '#8a2410'];

  function prep() {
    if (ash || !img.complete || !img.naturalWidth) return !!ash;
    const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    let px;
    try { px = x.getImageData(0, 0, W, H).data; } catch (e) { return false; }
    solid = px;
    // the ash: the figure greyed and dimmed with a faint warm cast; the dark backdrop as it is
    const a = x.createImageData(W, H);
    for (let i = 0; i < px.length; i += 4) {
      a.data[i + 3] = 255;
      if (px[i] + px[i + 1] < 70) { a.data[i] = px[i]; a.data[i + 1] = px[i + 1]; a.data[i + 2] = px[i + 2]; continue; }
      const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
      a.data[i] = l * 0.62 + 8; a.data[i + 1] = l * 0.56 + 6; a.data[i + 2] = l * 0.55 + 6;
    }
    ash = document.createElement('canvas'); ash.width = W; ash.height = H; ash.getContext('2d').putImageData(a, 0, 0);
    // the eyes: their brightest pixels
    const e = x.createImageData(W, H);
    for (const [x0, y0, x1, y1] of [[430, 158, 472, 192], [478, 158, 522, 192]])
      for (let y = y0; y < y1; y++) for (let xx = x0; xx < x1; xx++) {
        const k = (y * W + xx) * 4;
        if (px[k] > 215 && px[k + 1] > 110) { e.data[k] = 255; e.data[k + 1] = 190; e.data[k + 2] = 90; e.data[k + 3] = 255; }
      }
    eyes = document.createElement('canvas'); eyes.width = W; eyes.height = H; eyes.getContext('2d').putImageData(e, 0, 0);
    return true;
  }
  const onFigure = (x, y) => { if (!solid || x < 0 || y < 0 || x >= W || y >= H) return false; const k = (Math.round(y) * W + Math.round(x)) * 4; return solid[k] + solid[k + 1] > 70; };

  function lettering(t) {
    // the baked lettering is covered: the title sits on the dark backdrop, the lower lines over his robe
    ctx.fillStyle = '#010208'; ctx.fillRect(130, 22, 700, 82);
    const g = ctx.createLinearGradient(0, 300, 0, 540); g.addColorStop(0, 'rgba(2,2,5,0)'); g.addColorStop(0.25, 'rgba(2,2,5,0.985)'); g.addColorStop(1, 'rgba(2,2,5,1)');
    ctx.fillStyle = g; ctx.fillRect(0, 300, 960, 240);
    const a = clamp((t - 0.2) / 0.5, 0, 1), sc = 1 + 0.25 * (1 - clamp((t - 0.2) / 0.25, 0, 1));
    ctx.save(); ctx.globalAlpha = a; ctx.translate(480, 88); ctx.scale(sc, sc); lookLogo(ctx, 'CONGRATULATIONS!', 0, 0, 62, 'center'); ctx.restore();
    ctx.save(); ctx.globalAlpha = clamp((t - 0.7) / 0.5, 0, 1); ctx.font = LOOK.pix(36); ctx.textAlign = 'center'; lookSpacing(ctx, 6);
    lookOutlined(ctx, 'YOU HAVE DEFEATED', 480, 432, LOOK.cream, '#1a0a06', 5); ctx.restore();
    const c = clamp((t - 1.1) / 0.4, 0, 1);
    ctx.save(); ctx.globalAlpha = c; ctx.translate(480, 500); ctx.scale(1 + 0.3 * (1 - c), 1 + 0.3 * (1 - c)); lookLogo(ctx, 'THE RUGFATHER', 0, 0, 58, 'center', LOOK.red); ctx.restore();
  }
  function emit(x, y, up) { embers.push({ x: x + rnd(-6, 6), y, vx: rnd(-0.5, 0.5), vy: -rnd(0.6, up), age: 0, life: rnd(0.7, 1.6) }); }

  function draw(t, dt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0);
    if (!prep()) { lettering(9); return; }
    const k = RM ? 1 : clamp((t - 1.6) / 4.2, 0, 1), line = 520 - k * 470;
    // firelight, dying with him
    const f = 0.55 + 0.45 * Math.abs(Math.sin(t * 9.1) * Math.sin(t * 5.3 + 1));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const fg = ctx.createRadialGradient(480, 260, 0, 480, 260, 420);
    fg.addColorStop(0, 'rgba(255,110,30,' + (0.1 + 0.1 * f) * (1 - k * 0.8) + ')'); fg.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H); ctx.restore();
    // his eyes flare, gutter and go dark
    const out = RM ? 1 : clamp((t - 2.4) / 1.6, 0, 1);
    const flick = out > 0 && out < 1 && Math.random() < 0.3 ? 0.1 : 1;
    const glow = (0.6 - 0.6 * out) * flick;
    if (glow > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glow; ctx.shadowColor = '#ff6a10'; ctx.shadowBlur = 18; ctx.drawImage(eyes, 0, 0); ctx.restore(); }
    if (out > 0) { ctx.save(); ctx.globalAlpha = out * 0.8; ctx.filter = 'brightness(0.25)'; ctx.drawImage(eyes, 0, 0); ctx.restore(); }
    // ash below the ragged line, embers along it
    if (k > 0) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, H);
      for (let i = 0; i < jag.length; i++) ctx.lineTo(i * GRID, Math.round((line + jag[i]) / GRID) * GRID);
      ctx.lineTo(W, H); ctx.closePath(); ctx.clip(); ctx.drawImage(ash, 0, 0); ctx.restore();
      if (k < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < jag.length; i++) {
          const x = i * GRID, y = Math.round((line + jag[i]) / GRID) * GRID;
          if (!onFigure(x, y + 2) && !onFigure(x, y - 4)) continue;
          const hot = Math.random();
          ctx.fillStyle = hot < 0.3 ? '#fff0a0' : hot < 0.7 ? '#ff9a2a' : '#c4300c';
          ctx.fillRect(x, y - GRID, GRID, GRID * (hot < 0.5 ? 2 : 1));
          if (Math.random() < 0.05) emit(x, y - 3, 2.2);
        }
        ctx.restore();
        if (Math.random() < 0.4) { const x = rnd(220, 740), y = rnd(Math.max(110, line - 160), line); if (onFigure(x, y)) emit(x, y, 1.4); }
      }
    }
    if (k >= 1 && !RM && Math.random() < 0.15) { const x = rnd(240, 720), y = rnd(140, 500); if (onFigure(x, y)) emit(x, y, 0.8); }
    for (let i = embers.length - 1; i >= 0; i--) {
      const p = embers[i]; p.age += dt; if (p.age > p.life) { embers.splice(i, 1); continue; }
      p.x += p.vx + Math.sin(p.age * 5 + p.y * 0.05) * 0.3; p.y += p.vy;
      const q = p.age / p.life; if (q > 0.75 && Math.floor(p.age * 20) % 2) continue;
      ctx.fillStyle = COLS[Math.min(4, Math.floor(q * 5))];
      ctx.fillRect(Math.round(p.x / GRID) * GRID, Math.round(p.y / GRID) * GRID, GRID, GRID);
    }
    lettering(RM ? 9 : t);
    const v = ctx.createRadialGradient(480, 290, 260, 480, 290, 640); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    draw((now - t0) / 1000, dt);
    raf = requestAnimationFrame(tick);
  }
  return {
    start(canvas) {
      cv = canvas; ctx = cv.getContext('2d'); embers = [];
      t0 = last = performance.now();
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    },
    stop() { cancelAnimationFrame(raf); raf = 0; }
  };
})();
