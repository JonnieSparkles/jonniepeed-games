// Unruggabull: RugCo Alley Remastered, the polish: light, particles and sprite touches drawn around the 2025 art.
// Every frame drawn is still the 2025 art; nothing here changes a number the game keeps (health, shots, waves,
// times). Pieces of things (dust, smoke, flames, torn carpshits) are pixel art on a 3 px grid with stepped colours,
// no rotation. Particles step with the game clock (fxStep runs once per game step), so pausing stops them.
var FX_GRID = 3;
var FX_FLAME = ['#fff3a0', '#ffc43c', '#ff8a1f', '#e2461a', '#8a2410'];
var FX_SMOKE = ['#6a5a56', '#4e413e', '#372d2b', '#241d1c'];
var FX_STEAM = ['#e8ddd6', '#c9bdb6', '#a2958f', '#766a65'];
var FX_DUST = ['#8a7468', '#6e5c53', '#54453e', '#3a302b'];
var FX_THREAD = ['#ffc43c', '#e2481c', '#8a2410', '#221a2c'];
var fxRnd = (a, b) => a + Math.random() * (b - a);
var fxClamp = (v, a, b) => Math.max(a, Math.min(b, v));
// the fire's flicker, 0.1 to 1, from the game clock (ms)
var fxFire = t => 0.55 + 0.45 * Math.abs(Math.sin(t * 0.0091) * Math.sin(t * 0.0053 + 1));

// ---------- hit-stop and slow motion (game.js's loop reads these; real milliseconds) ----------
var fxTime = { hold: 0, slow: 0, rate: 1 };
function fxHitStop(ms) { fxTime.hold = Math.max(fxTime.hold, ms); }
function fxSlowMo(ms, rate) { fxTime.slow = ms; fxTime.rate = rate; }

// ---------- sprite caches ----------
var fxWhiteCache = new Map(), fxTintCache = new Map();
function fxWhite(img) { return fxTint(img, '#fff', fxWhiteCache); }
function fxTint(img, col, cache) {
  cache = cache || fxTintCache;
  const key = cache === fxWhiteCache ? img : img.src + col;
  if (cache.has(key)) return cache.get(key);
  if (!img.complete || !img.naturalWidth) return img;
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
  cache.set(key, c); return c;
}

// ---------- pixel particles ----------
var fxParts = [];
function fxPix(x, y, vx, vy, life, cols, s, grav, drag) {
  fxParts.push({ x, y, vx, vy, age: 0, life, cols, s: s || FX_GRID, grav: grav || 0, drag: drag || 1 });
}
function fxDust(x, y, n, spread, up) {
  for (let i = 0; i < n; i++) fxPix(x + fxRnd(-spread, spread), y, fxRnd(-1.6, 1.6), fxRnd(-(up || 1), -0.1), fxRnd(350, 700), FX_DUST, 3, 0.02, 0.94);
}
function fxDrawParts(ctx) {
  for (const p of fxParts) {
    const k = p.age / p.life;
    if (k > 0.75 && Math.floor(p.age / 50) % 2) continue;
    ctx.fillStyle = p.cols[Math.min(p.cols.length - 1, Math.floor(k * p.cols.length))];
    ctx.fillRect(Math.round(p.x / FX_GRID) * FX_GRID, Math.round(p.y / FX_GRID) * FX_GRID, p.s, p.s);
  }
}

// ---------- 1. firelight on the alley and the neon in the wet floor ----------
function fxFirelight(ctx, now) {
  const f = fxFire(now);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(470, 150, 0, 470, 150, 560);
  g.addColorStop(0, 'rgba(255,110,30,' + (0.05 + 0.08 * f) + ')'); g.addColorStop(1, 'rgba(255,110,30,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
  ctx.save(); ctx.translate(470, 505); ctx.scale(1, 0.2);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 340);
  g.addColorStop(0, 'rgba(255,130,40,' + (0.1 + 0.1 * f) + ')'); g.addColorStop(1, 'rgba(255,130,40,0)');
  ctx.fillStyle = g; ctx.fillRect(-340, -340, 680, 680); ctx.restore();
  // the two RUGS signs, rippling in the puddles under them
  if (bgSprite.complete) {
    for (const [sx, sy, sw, sh, dy] of [[712, 82, 84, 78, 452], [724, 186, 56, 86, 470]]) {
      for (let r = 0; r < sh; r += 2) {
        ctx.globalAlpha = 0.22 * (1 - r / sh);
        const off = Math.sin(r * 0.35 + now * 0.004) * 2.2;
        ctx.drawImage(bgSprite, sx, sy + sh - r - 2, sw, 2, sx + off, dy + r * 0.55, sw, 1.2);
      }
    }
  }
  ctx.restore();
}

// ---------- 4. the garage: red light out of the opening, embers blowing out of it ----------
function fxGarageOpen(now) {
  if (getBossExitDoorClosing()) return Math.max(0, 1 - (now - getBossExitDoorStartTime()) / CLOSE_TRANSITION_DURATION);
  if (getBossTransition()) return fxClamp((now - getBossTransitionStartTime() - 2000) / 11000, 0, 1);
  if (getBackgroundFlickerMode() === 'doorOpenFlicker') return 1;
  return 0;
}
function fxGarageGlow(ctx, now) {
  const open = fxGarageOpen(now);
  if (open <= 0) return;
  const f = 0.8 + 0.2 * fxFire(now);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(465, 400, 0, 465, 400, 80 + 300 * open);
  g.addColorStop(0, 'rgba(255,60,20,' + (0.32 * open * f) + ')'); g.addColorStop(1, 'rgba(255,60,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
  ctx.beginPath(); ctx.moveTo(347, 440); ctx.lineTo(583, 440); ctx.lineTo(720, 540); ctx.lineTo(210, 540); ctx.closePath();
  g = ctx.createLinearGradient(0, 440, 0, 540); g.addColorStop(0, 'rgba(255,80,30,' + (0.22 * open * f) + ')'); g.addColorStop(1, 'rgba(255,80,30,0)');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
}

// ---------- 5. vignette and grain, under the HUD ----------
var fxGrain = null, fxGrainN = 0;
function fxGrit(ctx) {
  if (!fxGrain) {
    fxGrain = [0, 1, 2].map(() => {
      const c = document.createElement('canvas'); c.width = 240; c.height = 135;
      const x = c.getContext('2d'), d = x.createImageData(240, 135);
      for (let i = 0; i < d.data.length; i += 4) { const v = Math.random() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); return c;
    });
  }
  ctx.save();
  const g = ctx.createRadialGradient(480, 290, 260, 480, 290, 640);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);
  ctx.globalAlpha = 0.07; ctx.globalCompositeOperation = 'overlay'; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(fxGrain[(fxGrainN++ >> 1) % 3], 0, 0, 960, 540);
  ctx.restore();
}

// ---------- shake (on top of the 2025 shake) and the defeat's white-out ----------
var fxShakeState = { until: 0, amp: 0 }, fxFlashUntil = 0;
function fxShake(amp, ms) { fxShakeState.amp = amp; fxShakeState.until = gameNow() + ms; }
function fxShakeOffset() {
  if (gameNow() >= fxShakeState.until) return null;
  return { x: (Math.random() * 2 - 1) * fxShakeState.amp, y: (Math.random() * 2 - 1) * fxShakeState.amp };
}
function fxScreenFlash(ctx) {
  const left = fxFlashUntil - performance.now();
  if (left <= 0) return;
  ctx.save(); ctx.fillStyle = 'rgba(255,244,230,' + (0.3 * Math.min(1, left / 400)) + ')'; ctx.fillRect(0, 0, 960, 540); ctx.restore();
}

// ---------- the bull ----------
// take-off and landing squash, the fire kick, a white frame, knockback and a quick blink when hit, and a rim of
// firelight on the side that faces the burning sign
var fxBull = { take: 0, land: 0, flash: 0, kb: 0, pg: true };
var fxBullCanvas = null, fxRimCanvas = null;
function fxBullStep(p) {
  if (fxBull.pg && !p.grounded && p.vy < 0) fxBull.take = 140;
  if (!fxBull.pg && p.grounded) { fxBull.land = 140; fxDust(p.x + 32, p.feetY - 3, 6, 12, 0.7); UnrugSfx.tap(0.22); }
  fxBull.pg = p.grounded;
  if (fxBull.kb) {
    p.x = fxClamp(p.x + fxBull.kb, 0, 960 - PLAYER_WIDTH);
    fxBull.kb *= 0.8; if (Math.abs(fxBull.kb) < 0.2) fxBull.kb = 0;
  }
}
function fxBullHit(fromX) {
  fxBull.flash = 80;
  UnrugSfx.hurt();
  if (player.health > 0) fxBull.kb = (player.x + 32 < fromX ? -1 : 1) * 7;
}
function fxBullAlpha(now) { return Math.floor(now / 60) % 2 ? 0.25 : 1; }
// Draws one frame of the bull where the 2025 code drew it: ctx is at the sprite's top left (scaled).
function fxDrawBull(ctx, img, frame, srcY, fw, fh, mirror, p, now) {
  if (!fxBullCanvas) {
    fxBullCanvas = document.createElement('canvas'); fxBullCanvas.width = 64; fxBullCanvas.height = 96;
    fxRimCanvas = document.createElement('canvas'); fxRimCanvas.width = 64; fxRimCanvas.height = 96;
  }
  const bx = fxBullCanvas.getContext('2d'), rx = fxRimCanvas.getContext('2d');
  const whiteNow = fxBull.flash > 0;
  bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, 64, 96); bx.imageSmoothingEnabled = false;
  if (mirror) { bx.translate(fw, 0); bx.scale(-1, 1); }
  bx.drawImage(whiteNow ? fxWhite(img) : img, frame * fw, srcY, fw, fh, 0, 0, fw, fh);
  bx.setTransform(1, 0, 0, 1, 0, 0);
  let rim = 0;
  if (!whiteNow) {
    const cx = p.x + 32, cy = p.feetY - 50, lx = 470 - cx, ly = 130 - cy, L = Math.hypot(lx, ly) || 1;
    const dx = Math.round(lx / L * 2), dy = Math.round(ly / L * 2);
    rx.globalCompositeOperation = 'source-over'; rx.clearRect(0, 0, 64, 96); rx.drawImage(fxBullCanvas, 0, 0);
    rx.globalCompositeOperation = 'source-in'; rx.fillStyle = '#ffb455'; rx.fillRect(0, 0, 64, 96);
    rx.globalCompositeOperation = 'destination-out'; rx.drawImage(fxBullCanvas, -dx, -dy);
    rx.globalCompositeOperation = 'source-over';
    rim = (0.75 + 0.25 * fxFire(now)) * fxClamp(1.3 - L / 650, 0.6, 1);
  }
  let sx = 1, sy = 1;
  if ((p.scale === undefined || p.scale === 1) && p.controlEnabled) {
    if (fxBull.take > 0) { const k = fxBull.take / 140; sx = 1 - 0.12 * k; sy = 1 + 0.14 * k; }
    else if (fxBull.land > 0) { const k = fxBull.land / 140; sx = 1 + 0.16 * k; sy = 1 - 0.14 * k; }
  }
  const ox = p.muzzleFlashTimer > 0 ? -p.facing * 3 : 0;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(32 + ox), 96); ctx.scale(sx, sy);
  ctx.drawImage(fxBullCanvas, -32, -96);
  if (rim) { const a = ctx.globalAlpha; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * rim; ctx.drawImage(fxRimCanvas, -32, -96); }
  ctx.restore();
}
// the fire kick: a star-shaped flash at the blaster (the 2025 round flash stays under it)
function fxMuzzleStar(ctx, x, y, dir) {
  x -= dir * 3;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 22); g.addColorStop(0, 'rgba(255,200,90,0.75)'); g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 22, y - 22, 44, 44);
  ctx.fillStyle = 'rgba(255,236,170,0.95)';
  ctx.fillRect(dir > 0 ? x : x - 22, y - 1.5, 22, 3);
  ctx.fillRect(x - 1.5, y - 9, 3, 18);
  ctx.restore();
}

// ---------- carpshits ----------
// a soft shadow that shrinks with height; a tilt with their swoop and a slight flutter; wind streaks and a glint
// as a swooper rises to the top of its dive; and when one is unrugged, a white frame and then its own frame torn
// into three ragged bands that fly apart, land and blink out
function fxDrawCarpshit(ctx, c) {
  const now = gameNow();
  if (!c.alive) {
    if (c.killedAt != null) {
      if (now - c.killedAt < 70) ctx.drawImage(fxWhite(carpshitSprite), (c.tearFrame || 0) * 64, 0, 64, 64, c.x, c.y, 64, 64);
      else if (!c.torn) { c.torn = true; fxTear(c); }
      return;
    }
    // one that fell without being shot (the defeat scene): as in 2025
    ctx.drawImage(carpshitSprite, 3 * 64, 0, 64, 64, c.x, c.onFloor ? c.y + 12 : c.y, 64, 64);
    return;
  }
  const floor = levels_default[getCurrentLevelKey()].floorY;
  const k = fxClamp(1 - (floor - (c.y + 50)) / 420, 0.25, 1);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.38 * k) + ')';
  ctx.beginPath(); ctx.ellipse(c.x + 32, floor - 3, 24 * k, 5 * k, 0, 0, 7); ctx.fill();
  let dy = 0, warn = -1;
  if (c.swoop) {
    const t = now - c.swoopStart, w = t / c.swoopPeriod * 2 * Math.PI;
    dy = Math.cos(w) * c.swoopAmplitude * 2 * Math.PI / c.swoopPeriod * STEP_MS;
    const ph = (t / c.swoopPeriod) % 1;
    if (ph >= 0.55 && ph < 0.75) {
      warn = (ph - 0.55) / 0.2;
      const cycle = Math.floor(t / c.swoopPeriod);
      if (c.warnCycle !== cycle) { c.warnCycle = cycle; UnrugSfx.whoosh(((c.x + 32) / 480 - 1) * 0.7); }
    }
  }
  const rot = fxClamp(dy / Math.max(0.5, Math.abs(c.vx)) * 0.5, -0.45, 0.45) * (c.vx < 0 ? -1 : 1) + Math.sin(now / 111 + c.x * 0.01) * 0.04;
  if (warn >= 0) {
    const back = -Math.sign(c.vx) || 1, a = 0.6 * Math.min(1, warn / 0.25);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,236,210,' + a + ')'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const y = c.y + 18 + i * 12, x0 = c.x + 32 + back * (30 + ((warn * 90 + i * 17) % 22)), len = 16 + i * 6;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + back * len, y + 3); ctx.stroke();
    }
    const gx = c.x + 32 - back * 30, gy = c.y + 26, gs = 6 + 4 * Math.sin(warn * 12);
    ctx.fillStyle = 'rgba(255,250,230,' + a + ')'; ctx.fillRect(gx - gs, gy - 1, gs * 2, 2); ctx.fillRect(gx - 1, gy - gs, 2, gs * 2);
    ctx.restore();
  }
  ctx.save(); ctx.translate(Math.round(c.x + 32), Math.round(c.y + 32)); ctx.rotate(rot);
  ctx.drawImage(carpshitSprite, c.frame * 64, 0, 64, 64, -32, -32, 64, 64);
  ctx.restore();
}
var fxBands = [];
function fxTear(c) {
  if (!carpshitSprite.complete) return;
  const src = document.createElement('canvas'); src.width = 64; src.height = 64;
  src.getContext('2d').drawImage(carpshitSprite, (c.tearFrame || 0) * 64, 0, 64, 64, 0, 0, 64, 64);
  // the tears wander 3 px up or down every 2 or 3 columns: ragged, not a comb
  const cut1 = [], cut2 = [];
  let y1 = 24, y2 = 39;
  const pick = () => [-3, 0, 3][Math.floor(Math.random() * 3)];
  for (let i = 0; i < 22; i++) {
    if (i % (2 + (i % 2)) === 0) { y1 = fxClamp(y1 + pick(), 18, 30); y2 = fxClamp(y2 + pick(), 36, 45); }
    cut1.push(y1); cut2.push(y2);
  }
  const dir = Math.sign(c.vx) || -1, vx0 = c.vx * 0.45;
  const bands = [[() => 0, i => cut1[i], -1.6, -2.6], [i => cut1[i], i => cut2[i], 0.2, -1.2], [i => cut2[i], () => 64, 1.6, 0.2]];
  for (const [top, bot, push, vy] of bands) {
    const b = document.createElement('canvas'); b.width = 64; b.height = 64; const bx = b.getContext('2d');
    let low = 0;
    for (let i = 0; i < 22; i++) {
      const t0 = top(i), t1 = bot(i); if (t1 <= t0) continue;
      bx.drawImage(src, i * 3, t0, 3, t1 - t0, i * 3, t0, 3, t1 - t0);
    }
    try {
      const d = bx.getImageData(0, 0, 64, 64).data;
      for (let r = 63; r >= 0 && !low; r--) for (let i = 0; i < 64; i++) if (d[(r * 64 + i) * 4 + 3] > 40) { low = r + 1; break; }
    } catch (e) { low = 50; }
    fxBands.push({ img: b, low: low || 50, x: c.x, y: c.y, vx: vx0 + push * dir, vy, age: 0, life: 1900, landed: false });
  }
  for (let i = 0; i < 7; i++) {
    const col = Math.floor(fxRnd(2, 20));
    fxPix(c.x + col * 3, c.y + (i % 2 ? cut1[col] : cut2[col]), fxRnd(-1.5, 1.5) + c.vx * 0.3, fxRnd(-2, 0), fxRnd(600, 1100), FX_THREAD, 3, 0.08);
  }
}
function fxDrawBands(ctx) {
  for (const b of fxBands) {
    if (b.life - b.age < 400 && Math.floor(b.age / 66) % 2) continue;
    ctx.drawImage(b.img, Math.round(b.x / FX_GRID) * FX_GRID, Math.round(b.y / FX_GRID) * FX_GRID);
  }
}

// ---------- the Rugfather ----------
// standing: his chest rises 3 px on a slow breath, the bright parts of his fire flicker, pixel flames lick off the
// top of it, and he lights the floor under him. A red pulse and steam when the phase changes, smoke and sparks
// below 30%, a dust ring when the spin-jump lands, a flare in his hand before a throw, and on the last hit a
// freeze, a white-out and a second of slow motion before his 2025 defeat.
var fxRf = { pulse: 0, breath: 0, flick: 0, flickT: 0, defeatAt: -1, rings: [] };
var fxRfBright = null, fxRfEdge = [], fxRfCanvas = null;
function fxRfPrep(img) {
  if (fxRfBright || !img.complete || !img.naturalWidth) return;
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.drawImage(img, 3 * 256, 0, 256, 256, 0, 0, 256, 256);
  let px;
  try { px = x.getImageData(0, 0, 256, 256).data; } catch (e) { fxRfBright = c; return; }
  const bright = (i, j) => { const k = (j * 256 + i) * 4; return px[k + 3] > 200 && px[k] > 225 && px[k + 1] > 140; };
  for (let j = 0; j < 140; j += 3) for (let i = 0; i < 256; i += 3) if (bright(i, j) && (j < 3 || px[((j - 3) * 256 + i) * 4 + 3] < 60)) fxRfEdge.push([i, j]);
  const out = x.createImageData(256, 256);
  for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) if (bright(i, j)) { const k = (j * 256 + i) * 4; out.data[k] = 255; out.data[k + 1] = 220; out.data[k + 2] = 120; out.data[k + 3] = 255; }
  x.clearRect(0, 0, 256, 256); x.putImageData(out, 0, 0); fxRfBright = c;
}
// his standing frame (frame 3) with the breath and the flicker, as a 256 × 256 canvas
function fxRfStanding(img) {
  fxRfPrep(img);
  if (!fxRfCanvas) { fxRfCanvas = document.createElement('canvas'); fxRfCanvas.width = 256; fxRfCanvas.height = 256; }
  const x = fxRfCanvas.getContext('2d');
  x.clearRect(0, 0, 256, 256);
  if (fxRf.breath) {
    x.drawImage(img, 3 * 256, 140, 256, 116, 0, 140, 256, 116);
    x.drawImage(img, 3 * 256, 0, 256, 143, 0, -3, 256, 143);
  } else x.drawImage(img, 3 * 256, 0, 256, 256, 0, 0, 256, 256);
  if (fxRfBright && fxRf.flick) {
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.3 * fxRf.flick;
    x.drawImage(fxRfBright, 0, 0, 256, 143, 0, -3 * fxRf.breath, 256, 143); x.restore();
  }
  return fxRfCanvas;
}
function fxRfPool(ctx, s, now) {
  const f = fxFire(now * 1.3 + 2000), floor = levels_default[getCurrentLevelKey()].floorY;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(s.x + 128 * s.scale, floor - 2); ctx.scale(1, 0.16);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 170 * s.scale);
  g.addColorStop(0, 'rgba(255,120,40,' + (0.16 + 0.14 * f) + ')'); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.fillRect(-180, -180, 360, 360); ctx.restore();
}
function fxRfHand(s) { return { x: s.facing < 0 ? s.x + BOSS_WIDTH * 0.2 : s.x + BOSS_WIDTH * 0.8, y: s.y + BOSS_HEIGHT * 0.65 }; }
// the beat before a throw (the throw's timing is the 2025 one)
function fxRfTell(s) {
  if (s.sprite !== 'attack' || s.attackAnimationStartTime == null) return -1;
  const el = gameNow() - s.attackAnimationStartTime;
  return el >= 300 && el < 900 ? (el - 300) / 600 : -1;
}
function fxDrawRfTell(ctx, s) {
  const k = fxRfTell(s); if (k < 0) return;
  const h = fxRfHand(s), floor = levels_default[getCurrentLevelKey()].floorY, pul = 0.6 + 0.4 * Math.abs(Math.sin(gameNow() / 33));
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 30 + 40 * k);
  g.addColorStop(0, 'rgba(255,220,120,' + (0.55 * pul) + ')'); g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g; ctx.fillRect(h.x - 80, h.y - 80, 160, 160);
  ctx.translate(h.x + s.facing * 40, floor - 3); ctx.scale(1, 0.16);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 90 + 60 * k); g.addColorStop(0, 'rgba(255,150,60,' + (0.35 * k * pul) + ')'); g.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = g; ctx.fillRect(-150, -150, 300, 300); ctx.restore();
}
function fxBossPhase(s) {
  fxRf.pulse = 900;
  for (let i = 0; i < 18; i++) fxPix(s.x + 128 * s.scale + fxRnd(-50, 50), s.y + 80 + fxRnd(-10, 10), fxRnd(-2.2, 2.2), fxRnd(-2.6, -0.8), fxRnd(600, 900), FX_STEAM, 6, 0, 0.97);
}
function fxBossLand(s) {
  const floor = levels_default[getCurrentLevelKey()].floorY, cx = s.x + 128 * s.scale;
  fxRf.rings.push({ x: cx, y: floor - 4, age: 0 });
  for (let i = 0; i < 26; i++) { const d = Math.random() < 0.5 ? -1 : 1; fxPix(cx + d * fxRnd(20, 90), floor - 4, d * fxRnd(1.5, 5), fxRnd(-2.2, -0.3), fxRnd(500, 900), FX_DUST, 3, 0.05, 0.95); }
  fxShake(13, 350);
  UnrugSfx.thump();
}
function fxBossDefeat(s) {
  fxRf.defeatAt = s.deathStart;
  fxHitStop(300);
  fxSlowMo(1000, 0.3);
  fxFlashUntil = performance.now() + 700;
  fxShake(10, 400);
  UnrugSfx.defeat(bgMusic);
  rugfatherOwSfx.playbackRate = 0.7; rugfatherOwSfx.currentTime = 0; rugfatherOwSfx.play();
}
function fxDrawRfPulse(ctx, blit, img) {
  if (fxRf.pulse <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#ff2a10'; ctx.shadowBlur = 28;
  blit(fxTint(img, '#ff3018'), 0.75 * Math.abs(Math.sin((900 - fxRf.pulse) / 900 * Math.PI * 3)));
  ctx.restore();
}
function fxDrawRings(ctx) {
  for (const r of fxRf.rings) {
    const k = r.age / 550, rx = 40 + 270 * k, ry = 6 + 22 * k;
    ctx.fillStyle = k < 0.5 ? FX_DUST[0] : FX_DUST[1];
    for (let a = 0; a < 6.283; a += 0.06) {
      if (k > 0.7 && Math.floor(r.age / 50) % 2) break;
      ctx.fillRect(Math.round((r.x + Math.cos(a) * rx) / FX_GRID) * FX_GRID, Math.round((r.y + Math.sin(a) * ry) / FX_GRID) * FX_GRID, 3, 3);
    }
  }
}

// ---------- the flaming carpets ----------
// a flare before the throw (above), a pixel trail instead of the 2025 soft glows, light on the alley as one passes,
// a white frame and a jolt back on the first shot, and pixel smoke and embers with the 2025 burst when it's out
function fxCarpetLight(ctx, c) {
  const floor = levels_default[getCurrentLevelKey()].floorY, f2 = 0.8 + 0.2 * Math.random();
  let a = c.getScale();
  if (c.hit) a = Math.max(0, 1 - (gameNow() - (c.hitAt || gameNow())) / 200);
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, 140);
  g.addColorStop(0, 'rgba(255,130,40,' + (0.2 * f2 * a) + ')'); g.addColorStop(1, 'rgba(255,130,40,0)');
  ctx.fillStyle = g; ctx.fillRect(c.x - 140, c.y - 140, 280, 280);
  ctx.translate(c.x, floor - 3); ctx.scale(1, 0.18);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, 110); g.addColorStop(0, 'rgba(255,140,50,' + (0.3 * f2 * a) + ')'); g.addColorStop(1, 'rgba(255,140,50,0)');
  ctx.fillStyle = g; ctx.fillRect(-110, -110, 220, 220); ctx.restore();
}
function fxCarpetStep(c) {
  if (c.jolt) { c.x += c.jolt * 0.3; c.jolt *= 0.7; if (Math.abs(c.jolt) < 0.3) c.jolt = 0; }
  if (c.hit) {
    if (c.hitAt == null) {
      c.hitAt = gameNow();
      UnrugSfx.sizzle((c.x / 480 - 1) * 0.7);
      for (let i = 0; i < 14; i++) fxPix(c.x + fxRnd(-24, 24), c.y + fxRnd(-14, 14), fxRnd(-1.2, 1.2), fxRnd(-1.6, -0.4), fxRnd(600, 1100), FX_SMOKE, 6, 0, 0.98);
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.283, v = fxRnd(1.5, 4); fxPix(c.x, c.y, Math.cos(a) * v, Math.sin(a) * v - 1, fxRnd(300, 600), FX_FLAME, 3, 0.04); }
    }
    return;
  }
  if (c.getScale() >= 1) {
    const back = c.vx < 0 ? 1 : -1;
    for (let n = 0; n < 2; n++) fxPix(c.x + back * fxRnd(18, 40), c.y + fxRnd(-22, 10), back * fxRnd(0.4, 1.4), fxRnd(-1, 0.2), fxRnd(250, 500), FX_FLAME, 3, -0.01);
  }
}

// ---------- once per game step ----------
function fxStep() {
  const dt = STEP_MS, now = gameNow();
  UnrugSfx.heartbeat(gameState === 'playing' && player.health > 0 && player.health <= 4);
  for (const k of ['take', 'land', 'flash']) if (fxBull[k] > 0) fxBull[k] -= dt;
  if (fxRf.pulse > 0) fxRf.pulse -= dt;
  for (let i = fxParts.length - 1; i >= 0; i--) {
    const p = fxParts[i]; p.age += dt; if (p.age > p.life) { fxParts.splice(i, 1); continue; }
    p.vy += p.grav; p.vx *= p.drag; p.vy *= p.drag < 1 ? p.drag : 1; p.x += p.vx; p.y += p.vy;
  }
  const floor = levels_default[getCurrentLevelKey()].floorY;
  for (let i = fxBands.length - 1; i >= 0; i--) {
    const b = fxBands[i]; b.age += dt; if (b.age > b.life) { fxBands.splice(i, 1); continue; }
    if (b.landed) continue;
    b.vy = Math.min(b.vy + 0.16, 7); b.vx *= 0.97; b.x += b.vx; b.y += b.vy;
    if (b.y + b.low >= floor - 2) { b.y = floor - 2 - b.low; b.landed = true; b.life = Math.min(b.life, b.age + 700); fxDust(b.x + 32, floor - 4, 3, 16, 0.5); }
  }
  for (let i = fxRf.rings.length - 1; i >= 0; i--) { fxRf.rings[i].age += dt; if (fxRf.rings[i].age > 550) fxRf.rings.splice(i, 1); }
  // the garage's embers
  const open = fxGarageOpen(now);
  const out = getBossActive() && __bossState.sprite !== 'blink';
  if (open > 0 && !out && Math.random() < 0.9 * open) fxPix(fxRnd(355, 575), fxRnd(330, 435), fxRnd(-1.6, 1.6), fxRnd(-2.4, -0.6), fxRnd(800, 1600), FX_FLAME, Math.random() < 0.5 ? 2 : 3, -0.01);
  // the Rugfather
  const s = __bossState;
  if (getBossActive() && s.active && !s.dying) {
    if (s.entering && s.sprite === 'spin' && Math.random() < 0.5) { const a = Math.random() * 6.283, v = fxRnd(1.5, 3.5); fxPix(s.x + 128 * s.scale + Math.cos(a) * 90 * s.scale, s.y + 150 * s.scale + Math.sin(a) * 90 * s.scale, Math.cos(a) * v, Math.sin(a) * v - 1, fxRnd(250, 500), FX_FLAME, 3, 0.12); }
    if (!s.entering) {
      fxRf.breath = Math.sin(now / 2600 * 6.283) > 0.15 ? 1 : 0;
      if ((fxRf.flickT -= dt) <= 0) { fxRf.flickT = 80; fxRf.flick = [0, 0.5, 1, 0.3][Math.floor(Math.random() * 4)]; }
      if (s.sprite === 'idle' && fxRfEdge.length && Math.random() < 0.9) {
        const mirror = s.facing > 0;
        for (let n = 0; n < 2; n++) {
          const [i, j] = fxRfEdge[Math.floor(Math.random() * fxRfEdge.length)];
          fxPix(s.x + (mirror ? 256 - i : i) * s.scale, s.y + (j - 3 * fxRf.breath) * s.scale, -s.facing * fxRnd(0.2, 0.9), fxRnd(-1.6, -0.6), fxRnd(250, 550), FX_FLAME, 3, -0.01);
        }
      }
      if (getBossBattleStarted() && s.hp < MAX_HP * 0.3) {
        if (Math.random() < 0.35) fxPix(s.x + fxRnd(100, 160), s.y + fxRnd(50, 100), fxRnd(-0.4, 0.4), fxRnd(-0.9, -0.3), fxRnd(1000, 1500), FX_SMOKE, 6, 0, 0.99);
        if (Math.random() < 0.04) { const x = s.x + fxRnd(90, 170), y = s.y + fxRnd(60, 160); for (let i = 0; i < 5; i++) fxPix(x, y, fxRnd(-2, 2), fxRnd(-3, -0.5), fxRnd(200, 400), FX_FLAME, 3, 0.15); }
      }
      if (fxRfTell(s) >= 0 && Math.random() < 0.5) { const h = fxRfHand(s); fxPix(h.x + fxRnd(-8, 8), h.y + fxRnd(-8, 8), fxRnd(-1, 1), fxRnd(-2, -0.6), fxRnd(200, 400), FX_FLAME, 3, -0.01); }
    }
  }
}
// the bands, rings and particles, over the sprites
function fxDrawWorld(ctx) {
  ctx.save(); ctx.imageSmoothingEnabled = false;
  fxDrawBands(ctx); fxDrawRings(ctx); fxDrawParts(ctx);
  ctx.restore();
}
function fxReset() {
  fxParts.length = 0; fxBands.length = 0; fxRf.rings.length = 0;
  fxTime.hold = 0; fxTime.slow = 0; fxFlashUntil = 0; fxShakeState.until = 0;
  Object.assign(fxBull, { take: 0, land: 0, flash: 0, kb: 0, pg: true });
  Object.assign(fxRf, { pulse: 0, defeatAt: -1 });
}
