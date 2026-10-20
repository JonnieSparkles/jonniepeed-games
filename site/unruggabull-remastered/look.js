// Unruggabull: RugCo Alley Remastered, the touched look: the 2025 game's HUD, platforms, shots, banners and cards,
// redrawn. The alley, the sprites and every number are the 2025 game's. Display type is Bungee (the RugCo
// Empire sign), the HUD and menus are Jersey 15.
var LOOK = {
  logo: px => px + 'px Bungee, "Arial Black", Impact, sans-serif',
  pix: px => px + 'px "Jersey 15", "Courier New", monospace',
  gold: { ex: '#4a1405', ol: '#140402', g: [[0, '#fff3b0'], [0.38, '#ffc53a'], [0.72, '#ff8a1f'], [1, '#e2460e']] },
  red: { ex: '#3a0505', ol: '#140202', g: [[0, '#ffd2c8'], [0.4, '#ff5a44'], [1, '#b0110d']] },
  cream: '#f4e4d0', ash: '#cdb8a8', ember: '#ff6a1a', amber: '#ffc53a'
};

function lookSpacing(ctx, px) {
  if ('letterSpacing' in ctx) ctx.letterSpacing = px + 'px';
}
function lookOutlined(ctx, text, x, y, fill, stroke, w) {
  ctx.lineJoin = 'round'; ctx.lineWidth = w; ctx.strokeStyle = stroke; ctx.strokeText(text, x, y);
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}
// The wordmark style: a fire gradient over a dark outline and a short extrude.
function lookLogo(ctx, text, x, y, size, align, pal) {
  pal = pal || LOOK.gold;
  ctx.save();
  ctx.font = LOOK.logo(size); ctx.textAlign = align || 'center'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  const d = Math.max(2, Math.round(size * 0.075));
  ctx.lineWidth = Math.max(3, size * 0.12); ctx.strokeStyle = pal.ol;
  ctx.strokeText(text, x + d * 0.35, y + d);
  ctx.fillStyle = pal.ex;
  for (let i = d; i >= 1; i--) ctx.fillText(text, x + i * 0.35, y + i);
  ctx.strokeText(text, x, y);
  const g = ctx.createLinearGradient(0, y - size * 0.78, 0, y);
  pal.g.forEach(s => g.addColorStop(s[0], s[1]));
  ctx.fillStyle = g; ctx.fillText(text, x, y);
  ctx.restore();
}
function lookFitLogo(ctx, text, maxW, maxSize) {
  ctx.save(); ctx.font = LOOK.logo(100); const w = ctx.measureText(text).width; ctx.restore();
  return Math.min(maxSize, maxW / w * 100);
}
function lookRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// Platforms: fire-escape grates, lit on top by the fire.
function lookPlatforms(ctx, list) {
  for (const p of list) {
    const x = p.x, y = p.y, w = p.width, h = p.height;
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(x + 6, y + h, w - 12, 5);
    ctx.fillStyle = '#2c1f1b'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#100909'; for (let i = x + 6; i < x + w - 5; i += 7) ctx.fillRect(i, y + 4, 3, h - 7);
    ctx.fillStyle = '#4b332b'; ctx.fillRect(x, y + h - 3, w, 2);
    ctx.fillStyle = '#b8572a'; ctx.fillRect(x, y, w, 2);
    ctx.fillStyle = '#ffae6b'; ctx.fillRect(x + 10, y, 38, 1);
    ctx.fillStyle = '#6b4a3f'; ctx.fillRect(x + 2, y + 6, 2, 2); ctx.fillRect(x + w - 4, y + 6, 2, 2);
  }
}

// The bull's shot: a hot pellet with a short glowing trail (2025: a plain yellow dot).
function lookShot(ctx, b) {
  const dir = Math.sign(b.vx) || 1, len = 34;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(b.x - dir * len, 0, b.x, 0);
  g.addColorStop(0, 'rgba(255,140,30,0)'); g.addColorStop(1, 'rgba(255,190,60,0.85)');
  ctx.fillStyle = g; ctx.fillRect(Math.min(b.x, b.x - dir * len), b.y - 3, len, 6);
  ctx.restore();
  ctx.fillStyle = '#fff6c4'; ctx.fillRect(Math.round(b.x) - 4, Math.round(b.y) - 3, 8, 6);
}
function lookMuzzle(ctx, x, y) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,170,40,0.6)'; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#fff4c0'; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
}

// Sparks when a carpshit is unrugged. Their paths are worked out from their age on the game clock.
var lookSparks = [];
function lookAddSparks(x, y) {
  const born = gameNow();
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * 6.283, v = 1 + Math.random() * 2.5;
    lookSparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, born, life: 250 + Math.random() * 250 });
  }
}
function lookDrawSparks(ctx) {
  const now = gameNow();
  lookSparks = lookSparks.filter(s => now - s.born < s.life);
  for (const s of lookSparks) {
    const age = now - s.born, f = age / STEP_MS;
    ctx.globalAlpha = Math.max(0, 1 - age / s.life);
    ctx.fillStyle = age < s.life * 0.4 ? '#ffd27a' : '#ff6a1a';
    ctx.fillRect(Math.round(s.x + s.vx * f), Math.round(s.y + s.vy * f + 0.075 * f * f), 3, 3);
  }
  ctx.globalAlpha = 1;
}

// HUD: health in 20 segments, the blaster's 30 shots in cells, and the unrugged count with the wave under it.
function lookHud(ctx, p, kills, wave, maxWaves, showCount, now) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(12,7,7,0.6)'; lookRoundRect(ctx, 12, 14, 262, 68, 8); ctx.fill();
  ctx.drawImage(heartIcon, 18, 18, 30, 30);
  const hp = Math.max(0, p.health);
  for (let i = 0; i < 20; i++) {
    const x = 54 + i * 10;
    ctx.fillStyle = i < hp ? '#ff4a3a' : '#3a1a18'; ctx.fillRect(x, 25, 8, 15);
    if (i < hp) { ctx.fillStyle = '#ffb3a8'; ctx.fillRect(x, 25, 8, 3); }
  }
  ctx.drawImage(blasterIcon, 18, 49, 30, 30);
  for (let i = 0; i < 30; i++) { ctx.fillStyle = i < p.blasterEnergy ? '#3fe6ff' : '#123039'; ctx.fillRect(54 + i * 7, 57, 5, 15); }
  if (p.blasterEmptyFlashEndTime > now) {
    ctx.globalAlpha = (p.blasterEmptyFlashEndTime - now) / BLASTER_EMPTY_FLASH_DURATION;
    ctx.fillStyle = '#ff2a2a'; ctx.fillRect(54, 57, 208, 15); ctx.globalAlpha = 1;
  }
  if (showCount) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = LOOK.pix(19); lookSpacing(ctx, 3); lookOutlined(ctx, 'UNRUGGED', 480, 28, LOOK.ash, 'rgba(12,6,5,0.9)', 4);
    lookSpacing(ctx, 0); ctx.font = LOOK.pix(46); lookOutlined(ctx, String(kills), 480, 66, '#fff0d8', '#1a0a06', 6);
    if (wave <= maxWaves) { ctx.font = LOOK.pix(19); lookSpacing(ctx, 3); lookOutlined(ctx, 'WAVE ' + wave + '/' + maxWaves, 480, 88, LOOK.amber, 'rgba(12,6,5,0.9)', 4); }
  }
  ctx.restore();
}

// The run's time, under the health and shots, with a pixel stopwatch; and for 3 s after the waves end and after
// the Rugfather goes down, that split beside it, green when it's ahead of this device's best and red when behind.
var LOOK_WATCH = ["..XXX....", "....X....", "..XXXXX..", ".X.....X.", "X...X...X", "X...X...X", "X....XX.X", "X.......X", ".X.....X.", "..XXXXX.."];
function lookWatch(ctx, x, y, px, col) {
  ctx.fillStyle = col;
  LOOK_WATCH.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'X') ctx.fillRect(x + i * px, y + j * px, px, px); });
}
function lookClock(ms) { const s = Math.max(0, ms) / 1000; return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0'); }
function lookTimer(ctx, ms, split) {
  ctx.save();
  ctx.imageSmoothingEnabled = false; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = LOOK.pix(28); lookSpacing(ctx, 1);
  const text = lookClock(ms), w = Math.max(124, 52 + ctx.measureText(text).width + 12);
  ctx.fillStyle = 'rgba(12,7,7,0.6)'; lookRoundRect(ctx, 12, 86, w, 34, 8); ctx.fill();
  lookWatch(ctx, 21, 88, 3, LOOK.amber);
  lookOutlined(ctx, text, 54, 112, '#fff0d8', '#1a0a06', 4);
  if (split) {
    ctx.globalAlpha = split.age < 2600 ? 1 : Math.max(0, 1 - (split.age - 2600) / 400);
    const d = split.delta;
    const val = d == null ? lookClock(split.ms) : (d < 0 ? '\u2212' : '+') + (Math.abs(d) / 1000).toFixed(1);
    const col = d == null ? LOOK.amber : d < 0 ? '#6dff8a' : '#ff6a55';
    ctx.font = LOOK.pix(19); lookSpacing(ctx, 3); const lw = ctx.measureText(split.label).width;
    ctx.font = LOOK.pix(28); lookSpacing(ctx, 1); const vw = ctx.measureText(val).width;
    const x = 12 + w + 6, pw = lw + vw + 30;
    ctx.fillStyle = 'rgba(12,7,7,0.6)'; lookRoundRect(ctx, x, 86, pw, 34, 8); ctx.fill();
    ctx.font = LOOK.pix(19); lookSpacing(ctx, 3); lookOutlined(ctx, split.label, x + 10, 109, LOOK.ash, 'rgba(12,6,5,0.9)', 4);
    ctx.font = LOOK.pix(28); lookSpacing(ctx, 1); lookOutlined(ctx, val, x + 20 + lw, 112, col, '#1a0a06', 4);
  }
  ctx.restore();
}

// "WAVE 2/5" and "FIGHT!": they pop in, hold and fade over the original's one second.
function lookBanner(ctx, text, elapsed) {
  if (elapsed > 1000) return;
  const a = elapsed < 120 ? elapsed / 120 : elapsed > 760 ? (1000 - elapsed) / 240 : 1;
  const sc = elapsed < 140 ? 1.35 - 0.35 * (elapsed / 140) : 1;
  ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.translate(480, 230); ctx.scale(sc, sc);
  lookLogo(ctx, text, 0, 0, 78, 'center');
  ctx.restore();
}

// The Rugfather's health: a segmented bar under his name (2025: a thin red bar).
function lookBossBar(ctx, hp, max) {
  ctx.save();
  const n = 30, w = 300, x0 = 480 - w / 2, y = 22, cell = w / n;
  ctx.fillStyle = 'rgba(12,7,7,0.6)'; lookRoundRect(ctx, x0 - 10, 8, w + 20, 46, 8); ctx.fill();
  ctx.font = LOOK.pix(17); ctx.textAlign = 'center'; lookSpacing(ctx, 3);
  lookOutlined(ctx, 'THE RUGFATHER', 480, y + 2, LOOK.ash, 'rgba(12,6,5,0.9)', 4);
  const left = Math.max(0, hp) / max * n;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i < left ? (i < n / 3 ? '#ff3b20' : i < 2 * n / 3 ? '#ff7a1a' : '#ffb028') : '#2c1410';
    ctx.fillRect(Math.round(x0 + i * cell), y + 10, Math.ceil(cell) - 2, 14);
  }
  ctx.restore();
}

// The controls screen, before the first wave.
function lookControlsScreen(ctx, touch) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,4,4,0.86)'; ctx.fillRect(0, 0, 960, 540);
  lookLogo(ctx, 'CONTROLS', 480, 130, 64, 'center');
  if (touch) {
    // by touch, the two control pictures (phone.js, #ctl-pick) fill the middle
    ctx.font = LOOK.pix(34); lookSpacing(ctx, 4); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    lookOutlined(ctx, 'TAP TO START', 480, 478, '#fff0d8', '#1a0a06', 5);
    ctx.restore();
    return;
  }
  const rows = [['MOVE', 'A / D or the arrows'], ['JUMP', 'W, Space or up'], ['CROUCH', 'S, C or down'], ['FIRE', 'F, J or Enter'], ['PAUSE', 'Escape or P']];
  ctx.textBaseline = 'alphabetic';
  let y = 205;
  for (const [k, v] of rows) {
    ctx.font = LOOK.pix(30); lookSpacing(ctx, 3); ctx.textAlign = 'right'; ctx.fillStyle = LOOK.amber; ctx.fillText(k, 400, y);
    lookSpacing(ctx, 0); ctx.textAlign = 'left'; ctx.fillStyle = LOOK.cream; ctx.fillText(v, 430, y);
    y += 44;
  }
  ctx.font = LOOK.pix(34); lookSpacing(ctx, 4); ctx.textAlign = 'center';
  lookOutlined(ctx, 'PRESS ANY KEY TO START', 480, y + 34, '#fff0d8', '#1a0a06', 5);
  ctx.restore();
}

// Rugged: the 2025 line, in the new type.
function lookGameOver(ctx) {
  lookLogo(ctx, 'GAME OVER!', 480, 230, 80, 'center', LOOK.red);
  ctx.save(); ctx.font = LOOK.pix(44); lookSpacing(ctx, 4); ctx.textAlign = 'center';
  lookOutlined(ctx, 'YOU GOT RUGGED!', 480, 290, '#fff0e6', '#2a0505', 7);
  ctx.restore();
}
