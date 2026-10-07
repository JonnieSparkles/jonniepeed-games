// Thimbleful: a tiny explorer catches drips from a leaking watering can to grow a sunflower.
// States: title (live windowsill scene) -> intro (first play only: plant the seed in the big pot) -> play -> over.
// "Just watch" puts the scene in a passive mode with no game on top.
const BOARD = 2;   // 2: wider catch to match the bigger drops
const c = document.getElementById('c'), g = c.getContext('2d');
const W = 96, H = 72, MAXSPILL = 5, SUN_X = 10, SUN_BASE = 36, PLANT_STAND = 21, CAN_HOME = 52, CAN_AWAY = -14;
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
let best = +store.get('thimbleful-best-' + BOARD) || 0;
let introSeen = store.get('thimbleful-intro-seen') === '1';

let state = 'title', score = 0, spills = 0, el = 0, ex = 32, target = null, walk = 0, moved = false, flash = 0, time = 0, dropT = 1.2;
let pose = 'seed';                         // seed: holding the seed, thimble on back | back: thimble on back | up: thimble held overhead
const plant = { planted: false, size: 0 }; // the sunflower grown in the big pot on the left
let facing = 1, hop = 0, wander = { next: 3, to: null };
const keys = { l: false, r: false }, can = { x: CAN_AWAY, tx: 60, want: CAN_AWAY };
let drops = [], parts = [], wet = [], intro = null, seedFall = null;

const sky = [[5, '#46569a'], [12, '#6767ab'], [18, '#9676b2'], [24, '#cf8ca6'], [30, '#eea78b'], [36, '#f7c88c']];
const far = [[9, 8, 6], [17, 6, 9], [23, 10, 5], [33, 7, 8], [40, 9, 4], [49, 6, 10], [55, 11, 6], [66, 8, 7], [74, 6, 9], [80, 7, 5]];
const near = [[9, 12, 3], [24, 9, 4], [38, 14, 2], [57, 10, 3], [72, 15, 3]];
const lit = [[19, 39], [35, 40], [51, 38], [68, 41], [76, 39]];
const clouds = [[0, 10, 2.2], [40, 16, 1.4], [70, 8, 1.8]];


/* ---------- online arcade board ---------- */
let lbRun = null, lbEntry = null;
const lbBox = $('board');
function clearLeaderboard() {
  if (lbEntry) lbEntry.destroy();
  lbEntry = null; lbRun = null; lbBox.replaceChildren(); lbBox.hidden = true;
  lbBox.parentElement.classList.remove('lb-entering');
}
function resetLeaderboard() {
  clearLeaderboard();
  if (window.Leaderboard) lbRun = { id: Leaderboard.newRunId(), input: 'keys', data: null, shown: false };
}
function loadLeaderboard(score, meta) {
  const run = lbRun;
  if (!run || !window.Leaderboard) return;
  run.score = score; run.meta = meta;
  Leaderboard.load('thimbleful', BOARD, score, meta).then(data => {
    if (lbRun !== run || !(state === 'over')) return;
    run.data = data;
    showLeaderboard();
  });
}
function showLeaderboard() {
  const run = lbRun;
  if (!run || !run.data || run.shown || !(state === 'over')) return;
  run.shown = true;
  const data = run.data;
  lbBox.hidden = false;
  if (typeof data.placement !== 'number') { drawLeaderboard(data.scores); return; }
  const heading = document.createElement('h3'); heading.textContent = 'New high score!';
  const message = document.createElement('p'); message.className = 'lb-message'; message.setAttribute('role', 'status');
  message.textContent = `You're #${data.placement}. Enter your initials.`;
  lbBox.append(heading, message);
  // one decision at a time: the game's own buttons come back after OK or Skip
  lbBox.parentElement.classList.add('lb-entering');
  const finish = (rows, rank) => {
    lbEntry.destroy(); lbEntry = null; lbBox.parentElement.classList.remove('lb-entering');
    try { go.focus({ preventScroll: true }); } catch (_) {}
    drawLeaderboard(rows, rank);
  };
  lbEntry = Leaderboard.entry(lbBox, {
    initials: Leaderboard.initials(),
    async onDone(name) {
      const picker = lbEntry;
      if (!picker || run.busy) return;
      run.busy = true; picker.setBusy(true); message.textContent = 'Saving…';
      Leaderboard.saveInitials(name);
      const result = await Leaderboard.submit({game:'thimbleful',board:BOARD,run_id:run.id,name,
        score:run.score,input:run.input,meta:run.meta});
      if (lbRun !== run || !(state === 'over')) return;
      run.busy = false;
      if (result?.error === 'name_not_allowed') {
        message.textContent = 'Try other initials'; picker.setBusy(false); return;
      }
      finish(result?.ok ? result.scores : data.scores, result?.ok ? result.rank : null);
    },
    onSkip() { if (run.busy) return; finish(data.scores, null); }
  });
}
function drawLeaderboard(scores, highlight = null, all = false) {
  // Top 10 shows in full (no inner scroll). "See all" shows all 50 in a scrolling list.
  // Your row is scrolled into view either way.
  lbBox.replaceChildren();
  const cols = [['Rank', '#'], ['Name', 'Name'], ['Drops', 'Drops'], ['Input', '']];
  const title = document.createElement('h3'); title.textContent = 'High scores';
  const list = document.createElement('div'); list.className = all ? 'lb-list lb-all' : 'lb-list';
  if (all) { list.tabIndex = 0; list.setAttribute('role', 'region'); list.setAttribute('aria-label', 'All high scores, scroll to see more'); }
  const table = document.createElement('table'); table.className = 'lb-table';
  const head = table.createTHead().insertRow();
  for (const [label, short] of cols) {
    const cell = document.createElement('th'); cell.scope = 'col';
    if (short === '') { const s = document.createElement('span'); s.className = 'lb-sr'; s.textContent = label; cell.append(s); }
    else { cell.textContent = short; if (short !== label) cell.setAttribute('aria-label', label); }
    head.append(cell);
  }
  const body = table.createTBody();
  let you = null;
  const addRow = row => {
    const tr = body.insertRow(); if (row.rank === highlight) { tr.className = 'lb-you'; you = tr; }
    for (const value of [String(row.rank), row.name, String(row.score)]) { const cell = tr.insertCell(); cell.textContent = value; }
    const iconCell = tr.insertCell();
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 20 20'); icon.setAttribute('class', 'lb-input');
    icon.setAttribute('role', 'img'); icon.setAttribute('aria-label', row.input === 'touch' ? 'touch' : 'keyboard');
    const path = document.createElementNS(icon.namespaceURI, 'path');
    path.setAttribute('d', row.input === 'touch' ? 'M8 17L4 11L6 10L8 12V3H11V9L16 10V16L14 18H9Z' : 'M2 5H18V15H2ZM5 8H6M9 8H10M13 8H14M5 11H6M9 11H15');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5'); icon.append(path); iconCell.append(icon);
  };
  (all ? scores : scores.slice(0, 10)).forEach(addRow);
  if (!all && highlight > 10) {
    const player = scores.find(row => row.rank === highlight);
    if (player) { const gap = body.insertRow(); gap.className = 'lb-gap'; const cell = gap.insertCell(); cell.colSpan = cols.length; cell.textContent = '⋯'; addRow(player); }
  }
  list.append(table); lbBox.append(title, list);
  if (scores.length > 10) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'lb-more';
    button.textContent = all ? 'Show top 10' : `See all ${scores.length}`;
    button.addEventListener('click', () => { drawLeaderboard(scores, highlight, !all); lbBox.querySelector('.lb-more').focus({ preventScroll: true }); });
    lbBox.append(button);
  }
  if (you) requestAnimationFrame(() => you.scrollIntoView({ block: 'nearest' }));
}

// ---------- UI ----------
function hud() {
  scoreEl.textContent = score; bestEl.textContent = best; pips.innerHTML = '';
  for (let i = 0; i < MAXSPILL; i++) { const p = document.createElement('i'); if (i < spills) p.className = 'gone'; pips.appendChild(p); }
}
function showCard(title, text, goLabel) {
  ovTitle.textContent = title; ovText.textContent = text; go.textContent = goLabel; syncIntroBtn();
  overlay.hidden = false; skipBtn.hidden = true; leaveBtn.hidden = true;
}

function start(withIntro) {
  resetLeaderboard();
  if (withIntro === true) introSeen = false;
  ThimbleSound.start();
  score = 0; spills = 0; el = 0; target = null; drops = []; parts = []; wet = []; flash = 0; hud();
  overlay.hidden = true; main.classList.remove('watching');
  if (!introSeen) {
    // first play: walk to the pot, plant the seed, the can slides in, thimble goes up
    plant.planted = false; plant.size = 0; pose = 'seed';
    state = 'intro'; intro = { t: 0, planted: false }; ex = 32; facing = -1;
    can.x = Math.min(can.x, CAN_AWAY); can.want = CAN_HOME;
    skipBtn.hidden = false;
  } else {
    plant.planted = true; plant.size = 0; pose = 'up'; ex = 48; walk = 0; facing = 1;
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
  if (state !== 'play') return;
  state = 'over'; drops = []; ThimbleSound.over();
  if (score > best) { best = score; store.set('thimbleful-best-' + BOARD, String(best)); }
  hud(); can.want = can.x; facing = ex > SUN_X ? -1 : 1; wander.next = 4;
  showCard('The sill is soaked', `You caught ${score} drop${score === 1 ? '' : 's'} and grew your sunflower. Best: ${best}.`, 'Play again');
  go.focus();
  loadLeaderboard(score, { time_ms: Math.round(el * 1000) });
}
function watch() {
  clearLeaderboard();
  state = 'watch'; drops = []; target = null;
  overlay.hidden = true; skipBtn.hidden = true; leaveBtn.hidden = false;
  main.classList.add('watching');
  pose = plant.planted ? 'back' : 'seed'; can.want = CAN_AWAY; wander.next = 2;
  hint.textContent = 'Just watching. Tap Play in the corner to get back to the game.';
}
function leaveWatch() {
  main.classList.remove('watching'); leaveBtn.hidden = true;
  hint.textContent = 'Drag anywhere on the scene to move. On a keyboard, use the arrow keys, M to mute and F for full screen.';
  state = 'title';
  showCard('Catch the drips', plant.planted
    ? 'Plant a new seed and catch the drips to grow it. Five spills ends the game.'
    : 'Plant the seed, then catch the drips in your thimble to make it grow. Five spills ends the game.', 'Start');
  if (location.hash === '#watch') history.replaceState(null, '', location.pathname);
}

go.addEventListener('click', () => start());
const introBtn = $('introBtn');
introBtn.addEventListener('click', () => start(true));
function syncIntroBtn() { introBtn.hidden = !introSeen; }
watchBtn.addEventListener('click', watch);
skipBtn.addEventListener('click', finishIntro);
leaveBtn.addEventListener('click', () => { leaveWatch(); go.focus(); });
const snd = $('snd');
function sndLabel() { const on = !ThimbleSound.muted; snd.setAttribute('aria-pressed', String(on)); snd.lastElementChild.textContent = on ? 'Sound on' : 'Sound off'; }
snd.addEventListener('click', () => { ThimbleSound.toggle(); sndLabel(); });
sndLabel();

// ---------- full screen ----------
// Uses the Fullscreen API where it exists; on phones without it (iPhone) the game just fills the window.
const gameEl = $('game'), fsBtn = $('fs');
let wakeLock = null;
function setFull(on) {
  gameEl.classList.toggle('full', on); document.body.classList.toggle('locked', on);
  fsBtn.lastElementChild.textContent = on ? 'Exit full screen' : 'Full screen';
  fsBtn.setAttribute('aria-pressed', String(on));
  if (on && navigator.wakeLock) navigator.wakeLock.request('screen').then(l => { wakeLock = l; l.addEventListener('release', () => { wakeLock = null; }); }).catch(() => {});
  if (!on && wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
const isFull = () => gameEl.classList.contains('full');
function toggleFull() {
  const native = document.fullscreenElement || document.webkitFullscreenElement;
  if (isFull()) {
    if (native) { try { const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
    setFull(false);
  } else {
    setFull(true);
    const req = gameEl.requestFullscreen || gameEl.webkitRequestFullscreen;
    if (req) { try { const r = req.call(gameEl); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  }
}
function onNativeChange() { if (!(document.fullscreenElement || document.webkitFullscreenElement) && isFull()) setFull(false); }
document.addEventListener('fullscreenchange', onNativeChange);
document.addEventListener('webkitfullscreenchange', onNativeChange);
document.addEventListener('visibilitychange', () => { if (!document.hidden && isFull() && navigator.wakeLock && !wakeLock) setFull(true); });
fsBtn.addEventListener('click', toggleFull);

// ---------- input ----------
function toLogical(e) { const r = c.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; }
// the whole arena takes drags, so in portrait full screen the empty space under the scene is a thumb zone
let down = false;
const arena = document.querySelector('.arena');
arena.addEventListener('pointerdown', e => { if (state !== 'play' || e.target.closest('button')) return; if (lbRun && (e.pointerType === 'touch' || e.pointerType === 'pen')) lbRun.input = 'touch'; down = true; try { arena.setPointerCapture(e.pointerId); } catch (_) {} target = toLogical(e); });
arena.addEventListener('pointermove', e => { if (state === 'play' && (down || (e.pointerType === 'mouse' && e.target === c))) target = toLogical(e); });
arena.addEventListener('pointerup', () => { down = false; });
arena.addEventListener('pointercancel', () => { down = false; });
const isL = k => k === 'ArrowLeft' || k === 'a' || k === 'A', isR = k => k === 'ArrowRight' || k === 'd' || k === 'D';
addEventListener('keydown', e => {
  if (lbEntry) return;
  if (isL(e.key)) { keys.l = true; target = null; }
  else if (isR(e.key)) { keys.r = true; target = null; }
  else if ((e.key === 'm' || e.key === 'M') && !e.repeat) { ThimbleSound.toggle(); sndLabel(); return; }
  else if ((e.key === 'f' || e.key === 'F') && !e.repeat && !e.metaKey && !e.ctrlKey) { toggleFull(); return; }
  else if (e.key === 'Escape' && isFull() && !(document.fullscreenElement || document.webkitFullscreenElement)) { setFull(false); return; }
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
  if (Math.abs(ex - PLANT_STAND) > 0.3) { facing = Math.sign(PLANT_STAND - ex); ex += facing * Math.min(Math.abs(PLANT_STAND - ex), 22 * dt); moved = true; walk += dt; }
  else if (!intro.planted && !seedFall) {
    // she tosses the seed over her shoulder into the big pot
    facing = 1; hop = 0.18; pose = 'back';
    seedFall = { x0: Math.round(ex) + 4, y0: 41, t: 0, x: 0, y: 0 };
  }
  if (seedFall) {
    seedFall.t += dt; const u = Math.min(1, seedFall.t / 0.6);
    seedFall.x = seedFall.x0 + (SUN_X - seedFall.x0) * u; seedFall.y = seedFall.y0 + (SUN_BASE - seedFall.y0) * u - 14 * 4 * u * (1 - u);
    if (u >= 1) { seedFall = null; intro.planted = true; plant.planted = true; ThimbleSound.plant(); burst(SUN_X, SUN_BASE, 4, 14, 8, '#6b4a2c'); }
  }
  if (intro.planted && Math.abs(can.x - CAN_HOME) < 1 && intro.t > 1.6) finishIntro();
}

// in the title screen and watch mode she potters about the sill on her own
function idle(dt) {
  if (wander.to === null) {
    wander.next -= dt;
    if (wander.next <= 0 && !calm) wander.to = 22 + Math.random() * 52;
    return;
  }
  const d = wander.to - ex;
  if (Math.abs(d) < 0.4) { wander.to = null; wander.next = 4 + Math.random() * 5; if (Math.random() < 0.4) hop = 0.18; return; }
  facing = Math.sign(d); ex += facing * Math.min(Math.abs(d), 13 * dt); moved = true; walk += dt;
}

let shownState = '';
function update(dt) {
  if (shownState !== state) { shownState = state; gameEl.classList.toggle('playing', state === 'play'); }
  time += dt; flash = Math.max(0, flash - dt); moved = false;
  for (const p of parts) { p.vy += 140 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
  parts = parts.filter(p => p.life > 0);
  for (const w of wet) w.t -= dt;
  wet = wet.filter(w => w.t > 0);
  hop = Math.max(0, hop - dt);
  if (state === 'intro') { moveCan(dt, 0); updateIntro(dt); return; }
  if (state !== 'play') { moveCan(dt, 14); if (state === 'title' || state === 'watch') idle(dt); return; }
  el += dt; ThimbleSound.intensity(el);
  const interval = Math.max(0.48, 1.45 - el * 0.018), fall = Math.min(56, 20 + el * 0.55);
  moveCan(dt, 16 + el * 0.45);
  const before = ex, sp = 72;
  const mv = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  if (mv) ex += mv * sp * dt;
  else if (target !== null) { const d = target - ex; ex += Math.sign(d) * Math.min(Math.abs(d), sp * 1.2 * dt); }
  ex = Math.max(7, Math.min(89, ex));
  moved = Math.abs(ex - before) > 0.05; if (moved) { walk += dt; facing = ex > before ? 1 : -1; }
  dropT -= dt;
  if (dropT <= 0 && can.x > 6) { drops.push({ x: Math.round(can.x) - 4, y: 9, vy: fall }); dropT = interval * (0.75 + Math.random() * 0.5); }
  const mid = Math.round(ex);
  for (const d of drops) {
    const py = d.y; d.y += d.vy * dt;
    if (py < 38 && d.y >= 38 && Math.abs(d.x - mid) <= CATCH) {
      d.done = true; score++; plant.size = score; flash = 0.3; hop = 0.12; burst(d.x, 37, 4, 30, 20); hud();
      ThimbleSound.catch();
      if (score === 14 || score === 20 || score === 26) { const f = flowerPos(); burst(f.x, f.y, 10, 40, 22, '#ffd84a'); ThimbleSound.milestone(); }
      else if (score % 10 === 0) ThimbleSound.milestone();
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
  for (let i = 0; i < (state === 'play' ? 5 : 10); i++) { const mx = 12 + ((i * 29 + time * 1.2 * (1 + i % 3)) % 72), my = 8 + ((i * 17) % 30) + Math.sin(time * 0.8 + i) * 2; P(mx, my, 'rgba(255,246,216,0.75)'); }
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

function sunflowerTop() { return SUN_BASE - Math.min(26, 2 + Math.floor(plant.size * 1.1)); }
function flowerPos() {
  const sw = calm ? 0 : Math.sin(time * 1.2), top = sunflowerTop();
  return { x: SUN_X + Math.round(sw * (SUN_BASE - top) / 24 * 1.6), y: top - 2 };
}

function plants() {
  const sw = calm ? 0 : Math.sin(time * 1.2);
  // your sunflower, in the big pot on the left
  if (plant.planted) {
    const s = plant.size;
    if (s === 0) { R(SUN_X, SUN_BASE, 2, 1, '#6b4a2c'); P(SUN_X + 1, SUN_BASE - 1, '#5fa646'); }
    else {
      const top = sunflowerTop(), off = y => Math.round(sw * (SUN_BASE - y) / 24 * 1.6);
      for (let y = SUN_BASE; y >= top; y--) { R(SUN_X + off(y), y, 2, 1, '#4f8f3a'); P(SUN_X + off(y), y, '#67a84c'); }
      if (s < 4) { P(SUN_X - 1 + off(top), top, '#6cbf5f'); P(SUN_X + 2 + off(top), top, '#6cbf5f'); }
      for (let k = 5, side = -1; SUN_BASE - k > top + 3; k += 5, side = -side) leaf(side < 0 ? SUN_X - 1 + off(SUN_BASE - k) : SUN_X + 2 + off(SUN_BASE - k), SUN_BASE - k, side);
      const fx = SUN_X + off(top);
      if (s >= 14) {
        const r = Math.min(4, 2 + Math.floor((s - 14) / 6));
        flower(fx, top - r, r);
        // the head nods now and then
        if (!calm && (time % 7) < 0.4) P(fx, top - r * 2 - 1, '#f5c32c');
      } else if (s >= 8) { disc(fx, top - 1, 1, '#5fa646'); if (s >= 11) P(fx, top - 2, '#f5c32c'); }
    }
  } else R(SUN_X - 2, SUN_BASE, 6, 1, '#4a3322');
  pot(5, 37, 11, 13);

  // succulent in the middle pot
  R(42, 40, 7, 3, '#7fb89a'); R(43, 38, 5, 2, '#93c9ab'); P(45, 37, '#a8d8bd');
  P(42, 40, '#c97b8a'); P(48, 40, '#c97b8a'); P(44, 38, '#c97b8a');
  pot(41, 43, 9, 7);

  disc(62, 47, 3, '#3a5c9e'); disc(62, 47, 2, '#4f78c4'); P(61, 46, '#2a3f6e'); P(63, 46, '#2a3f6e'); P(61, 48, '#2a3f6e'); P(63, 48, '#2a3f6e');

  const vs = calm ? 0 : Math.sin(time * 0.9 + 1);
  for (let y = 41; y <= 63; y++) { const vx = 79 - Math.round((y - 41) / 9) + Math.round(vs * (y - 41) / 22 * 1.5); P(vx, y, '#3f7d3a'); if ((y - 41) % 4 === 0) { const s = ((y - 41) / 4) % 2 ? 1 : -2; R(vx + s, y, 2, 2, '#4e9a4e'); P(vx + s, y, '#6cbf5f'); } }
  pot(80, 39, 11, 11);
  R(80, 36, 4, 3, '#4e9a4e'); R(84, 35, 4, 3, '#5aab55'); R(87, 36, 4, 3, '#4e9a4e'); P(81, 36, '#6cbf5f'); P(85, 35, '#6cbf5f'); P(88, 36, '#6cbf5f');
}

// a butterfly drifts around the window when nobody is playing
function butterfly() {
  if (state === 'play' || state === 'intro') return;
  const t = time, x = Math.round(36 + 24 * Math.sin(t * 0.45) + 5 * Math.sin(t * 1.9)), y = Math.round(20 + 7 * Math.sin(t * 0.7) + 2 * Math.sin(t * 2.3));
  const up = !calm && Math.floor(t * 7) % 2 === 0;
  P(x, y, '#3a3550');
  if (up) { P(x - 1, y - 1, '#f6a6c8'); P(x + 1, y - 1, '#f6a6c8'); P(x - 2, y - 1, '#ffd2e4'); P(x + 2, y - 1, '#ffd2e4'); }
  else { P(x - 1, y, '#f6a6c8'); P(x + 1, y, '#f6a6c8'); P(x - 1, y + 1, '#ffd2e4'); P(x + 1, y + 1, '#ffd2e4'); }
}

let lastCanX = 0;
function wateringCan() {
  const cx = Math.round(can.x);
  const swinging = Math.abs(can.x - lastCanX) > 0.01 && !calm; lastCanX = can.x;
  if (cx < -10) return;
  g.save(); if (swinging && Math.floor(time * 5) % 2) g.translate(0, 1);
  P(cx + 3, 1, '#8f8f8f');
  R(cx + 1, 2, 5, 1, '#4f7f90'); P(cx + 1, 3, '#4f7f90'); P(cx + 5, 3, '#4f7f90');
  R(cx, 4, 7, 5, '#6f9fb0'); R(cx, 4, 7, 1, '#9cc6d4'); R(cx + 5, 5, 2, 4, '#557f8f');
  P(cx - 1, 7, '#6f9fb0'); P(cx - 2, 6, '#6f9fb0'); P(cx - 3, 6, '#6f9fb0'); R(cx - 4, 5, 1, 3, '#557f8f');
  if (state === 'play' && dropT < 0.3) { P(cx - 4, 8, '#5cc0f5'); P(cx - 4, 9, '#2f8fd0'); }
  g.restore();
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
  const idleBob = !moved && state !== 'play' && !calm && (time % 2.6) < 0.18;
  g.save();
  if (facing < 0) { g.translate(2 * Math.round(ex) + 1, 0); g.scale(-1, 1); }
  if (hop > 0 || idleBob) g.translate(0, -1);
  drawExplorer(L);
  g.restore();
}
function drawExplorer(L) {
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

// a 3x4 teardrop with a dark rim so it reads against the pale sky and the wall
// a drop counts when any part of it touches the thimble rim (rim is 7 wide, drop is 3)
const CATCH = 4.5;
function drop(x, y) {
  P(x, y - 1, '#bfe8ff');
  R(x - 1, y, 3, 2, '#5cc0f5'); P(x - 1, y, '#e8f8ff');
  P(x - 1, y + 1, '#2f8fd0'); P(x + 1, y + 1, '#2f8fd0');
  P(x, y + 2, '#1f6fa8');
}

function draw() {
  scene(); plants(); butterfly(); ladybug(); wateringCan();
  for (const d of drops) drop(d.x, Math.round(d.y));
  explorer();
  if (seedFall) { R(seedFall.x, seedFall.y, 2, 2, '#3b2c22'); }
  for (const p of parts) P(p.x, p.y, p.c);
}

let lastT = 0;
function loop(t) { const dt = Math.min(0.05, ((t - lastT) / 1000) || 0); lastT = t; update(dt); draw(); requestAnimationFrame(loop); }
hud(); syncIntroBtn();
if (location.hash === '#watch') watch();
requestAnimationFrame(loop);
