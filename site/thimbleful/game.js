// Thimbleful: a tiny explorer catches drips from a leaking watering can to grow a sunflower.
// States: title (live windowsill scene) -> intro (first play only: plant the seed) -> play -> over.
// "Just watch" puts the scene in a passive mode with no game on top.
const c = document.getElementById('c'), g = c.getContext('2d');
const W = 96, H = 72, MAXSPILL = 5, POT_X = 45, CAN_HOME = 52, CAN_AWAY = -14;
const R = (a, b, w, h, k) => { g.fillStyle = k; g.fillRect(Math.round(a), Math.round(b), w, h); };
const P = (a, b, k) => R(a, b, 1, 1, k);
function disc(cx, cy, r, k) { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) P(cx + i, cy + j, k); }
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = id => document.getElementById(id);
const main = document.querySelector('main');
const scoreEl = $('score'), bestEl = $('best'), pips = $('pips'), overlay = $('overlay'), go = $('go'),
  ovTitle = $('ovTitle'), ovText = $('ovText'), watchBtn = $('watchBtn'), skipBtn = $('skip'), leaveBtn = $('leave'), hint = $('hint');
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
let best = +store.get('thimbleful-best') || 0;
let introSeen = store.get('thimbleful-intro-seen') === '1';

let state = 'title', score = 0, spills = 0, el = 0, ex = 32, target = null, walk = 0, moved = false, flash = 0, time = 0, dropT = 1.2;
let pose = 'seed';                         // seed: holding the seed, thimble on back | back: thimble on back | up: thimble held overhead
const plant = { planted: false, size: 0 }; // the sunflower grown in the middle pot
const keys = { l: false, r: false }, can = { x: CAN_AWAY, tx: 60, want: CAN_AWAY };
let drops = [], parts = [], wet = [], intro = null, seedFall = null;

const sky = [[5, '#46569a'], [12, '#6767ab'], [18, '#9676b2'], [24, '#cf8ca6'], [30, '#eea78b'], [36, '#f7c88c']];
const far = [[9, 8, 6], [17, 6, 9], [23, 10, 5], [33, 7, 8], [40, 9, 4], [49, 6, 10], [55, 11, 6], [66, 8, 7], [74, 6, 9], [80, 7, 5]];
const near = [[9, 12, 3], [24, 9, 4], [38, 14, 2], [57, 10, 3], [72, 15, 3]];
const lit = [[19, 39], [35, 40], [51, 38], [68, 41], [76, 39]];
const clouds = [[0, 10, 2.2], [40, 16, 1.4], [70, 8, 1.8]];

// ---------- UI ----------
function hud() {
  scoreEl.textContent = score; bestEl.textContent = best; pips.innerHTML = '';
  for (let i = 0; i < MAXSPILL; i++) { const p = document.createElement('i'); if (i < spills) p.className = 'gone'; pips.appendChild(p); }
}
function showCard(title, text, goLabel) {
  ovTitle.textContent = title; ovText.textContent = text; go.textContent = goLabel;
  overlay.hidden = false; skipBtn.hidden = true; leaveBtn.hidden = true;
}

function start() {
  ThimbleSound.start();
  score = 0; spills = 0; el = 0; target = null; drops = []; parts = []; wet = []; flash = 0; hud();
  overlay.hidden = true; main.classList.remove('watching');
  if (!introSeen) {
    // first play: walk to the pot, plant the seed, the can slides in, thimble goes up
    plant.planted = false; plant.size = 0; pose = 'seed';
    state = 'intro'; intro = { t: 0, planted: false };
    can.x = Math.min(can.x, CAN_AWAY); can.want = CAN_HOME;
    skipBtn.hidden = false;
  } else {
    plant.planted = true; plant.size = 0; pose = 'up';
    can.want = null; if (can.x < 8) can.x = CAN_AWAY;
    state = 'play'; dropT = can.x < 8 ? 1.6 : 1.1;
  }
}
function finishIntro() {
  if (state !== 'intro') return;
  introSeen = true; store.set('thimbleful-intro-seen', '1');
  plant.planted = true; seedFall = null; pose = 'up'; flash = 0.3;
  can.want = null; if (can.x < 20) can.x = CAN_HOME;
  skipBtn.hidden = true; state = 'play'; dropT = 0.9;
}
function end() {
  state = 'over'; drops = []; ThimbleSound.over();
  if (score > best) { best = score; store.set('thimbleful-best', String(best)); }
  hud(); can.want = can.x;
  showCard('The sill is soaked', `You caught ${score} drop${score === 1 ? '' : 's'} and grew your sunflower. Best: ${best}.`, 'Play again');
  go.focus();
}
function watch() {
  state = 'watch'; drops = []; target = null;
  overlay.hidden = true; skipBtn.hidden = true; leaveBtn.hidden = false;
  main.classList.add('watching');
  pose = plant.planted ? 'back' : 'seed'; can.want = CAN_AWAY;
  hint.textContent = 'Just watching. Tap Play in the corner to get back to the game.';
}
function leaveWatch() {
  main.classList.remove('watching'); leaveBtn.hidden = true;
  hint.textContent = 'Drag anywhere on the scene to move. On a keyboard, use the arrow keys, and M to mute.';
  state = 'title';
  showCard('Catch the drips', plant.planted
    ? 'Plant a new seed and catch the drips to grow it. Five spills ends the game.'
    : 'Plant the seed, then catch the drips in your thimble to make it grow. Five spills ends the game.', 'Start');
  if (location.hash === '#watch') history.replaceState(null, '', location.pathname);
}

go.addEventListener('click', start);
watchBtn.addEventListener('click', watch);
skipBtn.addEventListener('click', finishIntro);
leaveBtn.addEventListener('click', () => { leaveWatch(); go.focus(); });
const snd = $('snd');
function sndLabel() { const on = !ThimbleSound.muted; snd.setAttribute('aria-pressed', String(on)); snd.lastElementChild.textContent = on ? 'Sound on' : 'Sound off'; }
snd.addEventListener('click', () => { ThimbleSound.toggle(); sndLabel(); });
sndLabel();

// ---------- input ----------
function toLogical(e) { const r = c.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; }
let down = false;
c.addEventListener('pointerdown', e => { if (state !== 'play') return; down = true; try { c.setPointerCapture(e.pointerId); } catch (_) {} target = toLogical(e); });
c.addEventListener('pointermove', e => { if (state === 'play' && (down || e.pointerType === 'mouse')) target = toLogical(e); });
c.addEventListener('pointerup', () => { down = false; });
c.addEventListener('pointercancel', () => { down = false; });
const isL = k => k === 'ArrowLeft' || k === 'a' || k === 'A', isR = k => k === 'ArrowRight' || k === 'd' || k === 'D';
addEventListener('keydown', e => {
  if (isL(e.key)) { keys.l = true; target = null; }
  else if (isR(e.key)) { keys.r = true; target = null; }
  else if ((e.key === 'm' || e.key === 'M') && !e.repeat) { ThimbleSound.toggle(); sndLabel(); return; }
  else if (e.key === 'Escape' && state === 'watch') { leaveWatch(); go.focus(); return; }
  else if (e.key === 'Escape' && state === 'intro') { finishIntro(); return; }
  else return;
  if (state === 'play') e.preventDefault();
});
addEventListener('keyup', e => { if (isL(e.key)) keys.l = false; if (isR(e.key)) keys.r = false; });

// ---------- simulation ----------
function moveCan(dt, sp) {
  if (can.want !== null) { const d = can.want - can.x; can.x += Math.sign(d) * Math.min(Math.abs(d), 45 * dt); return; }
  const d = can.tx - can.x;
  if (Math.abs(d) < 1) can.tx = 14 + Math.random() * 74;
  else can.x += Math.sign(d) * Math.min(Math.abs(d), Math.max(sp, can.x < 10 ? 45 : 0) * dt);
}
function burst(x, y, n, spread, lift, col) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * spread, vy: -lift - Math.random() * lift, life: .4, c: col || '#9fdcff' }); }

function updateIntro(dt) {
  intro.t += dt;
  const standX = POT_X - 7;
  if (Math.abs(ex - standX) > 0.3) { ex += Math.sign(standX - ex) * Math.min(Math.abs(standX - ex), 22 * dt); moved = true; walk += dt; }
  else if (!intro.planted && !seedFall) { seedFall = { x: Math.round(ex) + 6, y: 42, t: 0 }; pose = 'back'; }
  if (seedFall) {
    seedFall.t += dt; seedFall.x += (POT_X - seedFall.x) * Math.min(1, dt * 10); seedFall.y += 14 * dt;
    if (seedFall.y >= 43) { seedFall = null; intro.planted = true; plant.planted = true; ThimbleSound.plant(); burst(POT_X, 42, 3, 14, 8, '#6b4a2c'); }
  }
  if (intro.planted && Math.abs(can.x - CAN_HOME) < 1 && intro.t > 1.6) finishIntro();
}

function update(dt) {
  time += dt; flash = Math.max(0, flash - dt); moved = false;
  for (const p of parts) { p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const w of wet) w.t -= dt;
  wet = wet.filter(w => w.t > 0);
  if (state === 'intro') { moveCan(dt, 0); updateIntro(dt); return; }
  if (state !== 'play') { moveCan(dt, 14); return; }
  el += dt; ThimbleSound.intensity(el);
  const interval = Math.max(0.48, 1.45 - el * 0.018), fall = Math.min(56, 20 + el * 0.55);
  moveCan(dt, 16 + el * 0.45);
  const before = ex, sp = 72;
  const mv = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  if (mv) ex += mv * sp * dt;
  else if (target !== null) { const d = target - ex; ex += Math.sign(d) * Math.min(Math.abs(d), sp * 1.2 * dt); }
  ex = Math.max(7, Math.min(89, ex));
  moved = Math.abs(ex - before) > 0.05; if (moved) walk += dt;
  dropT -= dt;
  if (dropT <= 0 && can.x > 6) { drops.push({ x: Math.round(can.x) - 4, y: 9, vy: fall }); dropT = interval * (0.75 + Math.random() * 0.5); }
  const mid = Math.round(ex);
  for (const d of drops) {
    const py = d.y; d.y += d.vy * dt;
    if (py < 38 && d.y >= 38 && Math.abs(d.x - mid) <= 3.5) {
      d.done = true; score++; plant.size = score; flash = 0.3; burst(d.x, 37, 4, 30, 20); hud();
      ThimbleSound.catch(); if (score % 10 === 0) ThimbleSound.milestone();
    } else if (d.y >= 48) {
      d.done = true; spills++; wet.push({ x: d.x, t: 3 }); burst(d.x, 47, 5, 36, 14); hud();
      if (spills >= MAXSPILL) { end(); break; }
      ThimbleSound.spill();
    }
  }
  drops = drops.filter(d => !d.done);
}

// ---------- drawing ----------
function pot(x, y, w, h) { R(x - 1, y + 1, w + 2, 3, '#c8643c'); R(x - 1, y + 1, w + 2, 1, '#e08a5c'); R(x, y, w, 1, '#3d2a1c'); R(x, y + 4, w, h - 4, '#b0532f'); R(x + w - 2, y + 4, 2, h - 4, '#8e4024'); R(x + 1, y + 5, 1, h - 6, '#c8643c'); }
function leaf(x, y, dir) { R(dir > 0 ? x : x - 4, y, 4, 2, '#5fa646'); P(dir > 0 ? x + 4 : x - 5, y, '#5fa646'); R(dir > 0 ? x : x - 3, y + 1, 3, 1, '#4b8a37'); }

function scene() {
  R(0, 0, W, H, '#e7d6b8');
  for (let j = 2; j < H; j += 6) for (let i = (j % 12 ? 0 : 3); i < W; i += 6) P(i, j, '#dcc8a6');
  R(6, 3, 84, 45, '#8a5a3b'); R(8, 4, 80, 43, '#b57b52');
  g.save(); g.beginPath(); g.rect(9, 5, 78, 41); g.clip();
  for (let s = 0; s < sky.length; s++) { const y0 = sky[s][0], y1 = s < sky.length - 1 ? sky[s + 1][0] : 46; R(9, y0, 78, y1 - y0, sky[s][1]); if (s > 0) for (let i = 9; i < 87; i += 2) P(i, y0 - 1, sky[s][1]); }
  disc(64, 37, 6, '#ffe0a0'); disc(64, 37, 5, '#fff0c2');
  for (const [x0, y, sp] of clouds) { const a = 9 + ((x0 + (calm ? 0 : time * sp)) % 100) - 14; R(a, y, 12, 2, '#fde6e3'); R(a + 3, y - 2, 6, 2, '#fde6e3'); R(a + 1, y + 2, 10, 1, '#e8b8c8'); }
  for (const [bx, bw, bh] of far) R(bx, 46 - bh, bw, bh, '#6e5788');
  for (const [lx, ly] of lit) P(lx, ly, (Math.floor(time * 0.7 + lx) % 5) ? '#ffd98a' : '#6e5788');
  for (const [bx, bw, bh] of near) R(bx, 46 - bh, bw, bh, '#4f3f68');
  if (state !== 'play') for (let i = 0; i < 10; i++) { const mx = 12 + ((i * 29 + time * 1.2 * (1 + i % 3)) % 72), my = 8 + ((i * 17) % 30) + Math.sin(time * 0.8 + i) * 2; P(mx, my, 'rgba(255,246,216,0.75)'); }
  g.restore();
  R(47, 5, 2, 41, '#b57b52'); R(49, 5, 1, 41, '#8a5a3b'); R(9, 24, 78, 2, '#b57b52'); R(9, 26, 78, 1, '#8a5a3b');
  R(4, 1, 88, 1, '#c9a24a'); R(3, 0, 2, 3, '#a5832f'); R(91, 0, 2, 3, '#a5832f');
  R(4, 46, 88, 5, '#d4a06c'); R(4, 46, 88, 1, '#ecc08a'); R(2, 51, 92, 4, '#a8703f'); R(2, 51, 92, 1, '#c48a55'); R(4, 55, 88, 1, '#cbb593');
  for (const w of wet) { g.globalAlpha = Math.min(1, w.t / 1.5) * 0.7; R(w.x - 1, 48, 3, 1, '#7a4a28'); g.globalAlpha = 1; }
}

function flower(fx, fy, r) {
  if (r >= 3) for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; P(Math.round(fx + Math.cos(a) * (r + 1)), Math.round(fy + Math.sin(a) * (r + 1)), '#e0a01c'); }
  disc(fx, fy, r, '#f5c32c'); disc(fx, fy, Math.max(1, r - 2), '#6b3f1f');
  if (r >= 3) { P(fx - 1, fy - 1, '#4a2a14'); P(fx + 1, fy, '#4a2a14'); }
}

function plants() {
  const sw = calm ? 0 : Math.sin(time * 1.2);
  // the old sunflower on the left, already in full bloom
  const off = y => Math.round(sw * (36 - y) / 24 * 1.6);
  for (let y = 36; y >= 12; y--) { R(10 + off(y), y, 2, 1, '#4f8f3a'); P(10 + off(y), y, '#67a84c'); }
  leaf(9 + off(31), 31, -1); leaf(12 + off(25), 25, 1); leaf(9 + off(19), 19, -1);
  flower(10 + off(12), 8, 4);
  pot(5, 37, 11, 13);

  // the seed pot in the middle: grows with every catch
  const base = 42;
  if (plant.planted) {
    const s = plant.size;
    if (s === 0) { P(POT_X, base, '#6b4a2c'); P(POT_X - 1, base, '#5a3d24'); }
    else {
      const h = Math.min(24, 1 + Math.floor(s * 0.9)), top = base - h;
      const o2 = y => Math.round(sw * (base - y) / 24 * 1.4);
      for (let y = base; y >= top; y--) P(POT_X + o2(y), y, '#5a9a3f');
      if (h <= 3) { P(POT_X - 1 + o2(top), top, '#6cbf5f'); P(POT_X + 1 + o2(top), top, '#6cbf5f'); }
      for (let k = 4, side = -1; base - k > top + 3; k += 5, side = -side) leaf(side < 0 ? POT_X - 1 + o2(base - k) : POT_X + 1 + o2(base - k), base - k, side);
      const fx = POT_X + o2(top);
      if (s >= 14) flower(fx, top - 2, Math.min(4, 2 + Math.floor((s - 14) / 6)));
      else if (s >= 8) { disc(fx, top - 1, 1, '#5fa646'); if (s >= 11) P(fx, top - 2, '#f5c32c'); }
    }
  }
  pot(POT_X - 4, 43, 9, 7);

  disc(62, 47, 3, '#3a5c9e'); disc(62, 47, 2, '#4f78c4'); P(61, 46, '#2a3f6e'); P(63, 46, '#2a3f6e'); P(61, 48, '#2a3f6e'); P(63, 48, '#2a3f6e');

  const vs = calm ? 0 : Math.sin(time * 0.9 + 1);
  for (let y = 41; y <= 63; y++) { const vx = 79 - Math.round((y - 41) / 9) + Math.round(vs * (y - 41) / 22 * 1.5); P(vx, y, '#3f7d3a'); if ((y - 41) % 4 === 0) { const s = ((y - 41) / 4) % 2 ? 1 : -2; R(vx + s, y, 2, 2, '#4e9a4e'); P(vx + s, y, '#6cbf5f'); } }
  pot(80, 39, 11, 11);
  R(80, 36, 4, 3, '#4e9a4e'); R(84, 35, 4, 3, '#5aab55'); R(87, 36, 4, 3, '#4e9a4e'); P(81, 36, '#6cbf5f'); P(85, 35, '#6cbf5f'); P(88, 36, '#6cbf5f');
}

function wateringCan() {
  const cx = Math.round(can.x);
  if (cx < -10) return;
  P(cx + 3, 1, '#8f8f8f');
  R(cx + 1, 2, 5, 1, '#4f7f90'); P(cx + 1, 3, '#4f7f90'); P(cx + 5, 3, '#4f7f90');
  R(cx, 4, 7, 5, '#6f9fb0'); R(cx, 4, 7, 1, '#9cc6d4'); R(cx + 5, 5, 2, 4, '#557f8f');
  P(cx - 1, 7, '#6f9fb0'); P(cx - 2, 6, '#6f9fb0'); P(cx - 3, 6, '#6f9fb0'); R(cx - 4, 5, 1, 3, '#557f8f');
  if (state === 'play' && dropT < 0.3) P(cx - 4, 8, '#bfe8ff');
}

function legs(L) {
  const step = moved ? Math.floor(walk * 10) % 2 : -1;
  R(L + 2, 49, 1, step === 0 ? 1 : 2, '#3a3550'); R(L + 4, 49, 1, step === 1 ? 1 : 2, '#3a3550');
}
function face(L) {
  R(L + 2, 42, 3, 1, '#3f8f5a'); R(L + 1, 43, 5, 3, '#3f8f5a'); P(L + 4, 41, '#3f8f5a'); R(L + 2, 44, 3, 2, '#f2c9a0');
  const blink = (time % 4) < 0.15;
  P(L + 2, 44, blink ? '#f2c9a0' : '#2a1f1a'); P(L + 4, 44, blink ? '#f2c9a0' : '#2a1f1a');
}
function explorer() {
  const L = Math.round(ex) - 3;
  if (pose === 'up') {
    R(L, 38, 7, 1, '#d4d8de'); R(L + 1, 39, 5, 2, '#b8bcc4'); P(L + 2, 39, '#8d929c'); P(L + 4, 39, '#8d929c'); P(L + 3, 40, '#8d929c');
    if (flash > 0) R(L + 1, 38, 5, 1, '#7fd0ff');
    P(L, 40, '#f2c9a0'); P(L + 6, 40, '#f2c9a0'); R(L, 41, 1, 5, '#d9733b'); R(L + 6, 41, 1, 5, '#d9733b');
    face(L); R(L + 1, 46, 5, 3, '#d9733b'); legs(L);
    return;
  }
  // thimble worn as a backpack, as in the windowsill scene
  R(L - 2, 46, 3, 3, '#b8bcc4'); R(L - 1, 45, 2, 1, '#b8bcc4'); P(L - 2, 47, '#8d929c'); P(L, 46, '#8d929c'); P(L - 1, 48, '#8d929c');
  face(L); R(L + 1, 46, 5, 3, '#d9733b'); legs(L);
  R(L + 6, 46, 1, 2, '#d9733b'); P(L + 6, 45, '#f2c9a0');
  if (pose === 'seed') { R(L + 6, 42, 2, 3, '#3b2c22'); P(L + 6, 43, '#e6dccb'); }
}

function ladybug() {
  const per = 24, ph = (time % per) / per, dir = ph < 0.5 ? 1 : -1, lx = Math.round(8 + (ph < 0.5 ? ph * 2 : 2 - ph * 2) * 76);
  R(lx, 52, 3, 2, '#d23a2a'); P(lx + 1, 52, '#1e1a1a'); P(dir > 0 ? lx + 3 : lx - 1, 53, '#1e1a1a'); P(lx + ((Math.floor(time * 6) % 2) ? 0 : 2), 54, '#1e1a1a');
}

function draw() {
  scene(); plants(); ladybug(); wateringCan();
  for (const d of drops) { P(d.x, d.y, '#d9f3ff'); P(d.x, d.y + 1, '#7fd0ff'); }
  explorer();
  if (seedFall) { R(seedFall.x, seedFall.y, 2, 2, '#3b2c22'); }
  for (const p of parts) P(p.x, p.y, p.c);
}

let lastT = 0;
function loop(t) { const dt = Math.min(0.05, ((t - lastT) / 1000) || 0); lastT = t; update(dt); draw(); requestAnimationFrame(loop); }
hud();
if (location.hash === '#watch') watch();
requestAnimationFrame(loop);
