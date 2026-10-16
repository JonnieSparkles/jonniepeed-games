// Unruggabull: RugCo Alley Remastered, the phone shell: fitting the 960 x 540 alley to the window, the touch
// controls, pause, full screen, the portrait screen and the 2025 title's start flow.
(function () {
  const $ = id => document.getElementById(id);
  const stage = $('stage'), cv = $('gameCanvas'), hud = $('hud'), hctx = hud.getContext('2d');
  const titleEl = $('title');
  const pauseBtn = $('pause-btn'), pauseCard = $('pause'), fsBtn = $('fs-btn'), fs2Btn = $('fs2-btn');
  const soundBtn = $('sound-btn'), rotateEl = $('rotate'), rotateArt = $('rotate-art');
  const coarse = matchMedia('(pointer: coarse)');

  // ---------- touch or keyboard ----------
  // The touch controls show on touch screens, and from the first touch on anything else.
  let touchMode = coarse.matches;
  window.usingTouch = () => touchMode;

  // ---------- layout ----------
  // Full height, as in 2025: the alley keeps its 16:9 and the window's extra width becomes dark bars, where the
  // pad and the fire button sit. A window narrower than 16:9 gets bars above and below instead.
  let W = 0, H = 0, gx = 0, gy = 0, gw = 0, gh = 0, dpr = 1, safe = { l: 0, r: 0, t: 0, b: 0 };
  function readSafe() {
    const s = getComputedStyle($('safe'));
    safe = { l: parseFloat(s.paddingLeft) || 0, r: parseFloat(s.paddingRight) || 0, t: parseFloat(s.paddingTop) || 0, b: parseFloat(s.paddingBottom) || 0 };
  }
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    const k = Math.min(W / 960, H / 540);
    gw = 960 * k; gh = 540 * k; gx = (W - gw) / 2; gy = (H - gh) / 2;
    cv.style.width = gw + 'px'; cv.style.height = gh + 'px';
    cv.style.left = gx + 'px'; cv.style.top = gy + 'px';
    dpr = Math.min(3, window.devicePixelRatio || 1);
    hud.width = Math.round(W * dpr); hud.height = Math.round(H * dpr);
    readSafe();
    UnrugTitle.layout(W, H, dpr, safe);
    UnrugRun.layout({ W, H, gx, gy, gw, gh });
    checkRotate();
  }
  addEventListener('resize', layout);
  addEventListener('orientationchange', () => setTimeout(layout, 120));

  // Where the controls go, in CSS pixels. The pad's arms and the fire button are sized from the screen's height.
  function controls() {
    const u = Math.min(H, W * 0.6);
    return {
      pad: { x: safe.l + 0.23 * u, y: H - safe.b - 0.3 * u, r: 0.19 * u },
      fire: { x: W - safe.r - 0.23 * u, y: H - safe.b - 0.27 * u, r: 0.15 * u }
    };
  }

  // ---------- touch input ----------
  // Left half: the pad. Up and the up-diagonals jump, and held they keep jumping, like a held jump key; a press up
  // just before landing still jumps when he lands. Down crouches. Right half: fire, one shot per tap.
  const touches = new Map();
  let jumpUntil = -1, fireTap = false;
  const padDirs = p => {
    const c = controls().pad, dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
    const o = { l: false, r: false, u: false, d: false };
    if (d > c.r * 0.22 && d < c.r * 2.6) {
      o.l = dx / d < -0.38; o.r = dx / d > 0.38;
      o.u = dy / d < -0.5; o.d = dy / d > 0.6;
    }
    return o;
  };
  const inGame = () => titleEl.hidden;
  const blocked = e => !inGame() || gamePaused || !rotateEl.hidden || !$('end').hidden || (e.target && e.target.closest && e.target.closest('button, a, .card-wrap, #end'));
  function track(e, down) {
    const r = stage.getBoundingClientRect(), p = { x: e.clientX - r.left, y: e.clientY - r.top };
    const prev = touches.get(e.pointerId);
    const side = prev ? prev.side : (p.x < W / 2 ? 'pad' : 'fire');
    const t = { x: p.x, y: p.y, side, up: false };
    if (side === 'pad') {
      t.up = padDirs(p).u;
      if (t.up && !(prev && prev.up)) jumpUntil = gameNow() + 120;
    } else if (down) fireTap = true;
    touches.set(e.pointerId, t);
    UnrugRun.touched();
  }
  stage.addEventListener('pointerdown', e => {
    UnrugSound.init();
    if (e.pointerType === 'touch' || e.pointerType === 'pen') touchMode = true;
    if (e.pointerType === 'mouse' || blocked(e)) return;
    try { stage.setPointerCapture(e.pointerId); } catch (er) {}
    track(e, true);
  });
  stage.addEventListener('pointermove', e => { if (touches.has(e.pointerId)) track(e, false); });
  const lift = e => touches.delete(e.pointerId);
  stage.addEventListener('pointerup', lift);
  stage.addEventListener('pointercancel', lift);
  stage.addEventListener('lostpointercapture', lift);
  stage.addEventListener('contextmenu', e => e.preventDefault());

  // Called by the game loop (game.js) before each step.
  window.beforeGameStep = function () {
    let l = false, r = false, d = false, u = false, f = fireTap;
    for (const t of touches.values()) {
      if (t.side === 'pad') { const o = padDirs(t); l = l || o.l; r = r || o.r; d = d || o.d; u = u || o.u; }
      else f = true;
    }
    fireTap = false;
    touchKeys.left = l; touchKeys.right = r; touchKeys.crouch = d;
    touchKeys.jump = u || gameNow() < jumpUntil;
    touchKeys.fire = f;
  };
  function releaseAll() {
    touches.clear(); fireTap = false; jumpUntil = -1;
    for (const k in touchKeys) touchKeys[k] = false;
    for (const k in keys) keys[k] = false;
  }
  addEventListener('blur', releaseAll);

  // ---------- drawing the controls ----------
  const BASE = 'rgba(14,9,9,0.46)', RING = 'rgba(255,197,58,0.6)', HOT = 'rgba(255,106,26,0.66)';
  function crossPath(x, y, r, a) {
    const h = a / 2, pts = [[x - h, y - r], [x + h, y - r], [x + h, y - h], [x + r, y - h], [x + r, y + h], [x + h, y + h], [x + h, y + r], [x - h, y + r], [x - h, y + h], [x - r, y + h], [x - r, y - h], [x - h, y - h]];
    const c = a * 0.22, n = pts.length, mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    hctx.beginPath();
    const m0 = mid(pts[n - 1], pts[0]); hctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) { const p = pts[i], m = mid(p, pts[(i + 1) % n]); hctx.arcTo(p[0], p[1], m[0], m[1], c); }
    hctx.closePath();
  }
  function tri(x, y, s, dir) {
    hctx.beginPath();
    if (dir === 'l') { hctx.moveTo(x - s, y); hctx.lineTo(x + s * 0.7, y - s); hctx.lineTo(x + s * 0.7, y + s); }
    if (dir === 'r') { hctx.moveTo(x + s, y); hctx.lineTo(x - s * 0.7, y - s); hctx.lineTo(x - s * 0.7, y + s); }
    if (dir === 'u') { hctx.moveTo(x, y - s); hctx.lineTo(x - s, y + s * 0.7); hctx.lineTo(x + s, y + s * 0.7); }
    if (dir === 'd') { hctx.moveTo(x, y + s); hctx.lineTo(x - s, y - s * 0.7); hctx.lineTo(x + s, y - s * 0.7); }
    hctx.closePath(); hctx.fill();
  }
  function drawControls() {
    const c = controls(), p = c.pad, a = p.r * 0.68, lw = Math.max(1.5, H * 0.006);
    let l = false, r = false, u = false, d = false, f = false;
    for (const t of touches.values()) {
      if (t.side === 'pad') { const o = padDirs(t); l = l || o.l; r = r || o.r; u = u || o.u; d = d || o.d; }
      else f = true;
    }
    crossPath(p.x, p.y, p.r, a); hctx.fillStyle = BASE; hctx.fill();
    hctx.save(); crossPath(p.x, p.y, p.r, a); hctx.clip(); hctx.fillStyle = HOT;
    if (l) hctx.fillRect(p.x - p.r, p.y - a / 2, p.r - a / 2, a);
    if (r) hctx.fillRect(p.x + a / 2, p.y - a / 2, p.r - a / 2, a);
    if (u) hctx.fillRect(p.x - a / 2, p.y - p.r, a, p.r - a / 2);
    if (d) hctx.fillRect(p.x - a / 2, p.y + a / 2, a, p.r - a / 2);
    hctx.restore();
    crossPath(p.x, p.y, p.r, a); hctx.lineWidth = lw; hctx.strokeStyle = RING; hctx.stroke();
    hctx.fillStyle = 'rgba(244,228,208,0.85)';
    const ts = a * 0.2, o = p.r * 0.62;
    tri(p.x - o, p.y, ts, 'l'); tri(p.x + o, p.y, ts, 'r'); tri(p.x, p.y - o, ts, 'u'); tri(p.x, p.y + o, ts, 'd');
    hctx.beginPath(); hctx.arc(p.x, p.y, a * 0.16, 0, 7); hctx.fillStyle = 'rgba(244,228,208,0.18)'; hctx.fill();

    const b = c.fire;
    hctx.beginPath(); hctx.arc(b.x, b.y, b.r, 0, 7); hctx.fillStyle = f ? HOT : BASE; hctx.fill();
    hctx.lineWidth = lw * 1.2; hctx.strokeStyle = 'rgba(255,106,26,0.85)'; hctx.stroke();
    hctx.beginPath(); hctx.arc(b.x, b.y, b.r * 0.8, 0, 7); hctx.lineWidth = lw * 0.6; hctx.strokeStyle = 'rgba(244,228,208,0.14)'; hctx.stroke();
    if (blasterIcon.complete && blasterIcon.naturalWidth) {
      hctx.imageSmoothingEnabled = false;
      const s = b.r * 0.78; hctx.drawImage(blasterIcon, b.x - s / 2, b.y - s * 0.7, s, s);
    }
    hctx.fillStyle = 'rgba(244,228,208,0.92)'; hctx.textAlign = 'center'; hctx.textBaseline = 'middle';
    hctx.font = LOOK.pix(Math.round(b.r * 0.42));
    hctx.fillText('FIRE', b.x, b.y + b.r * 0.42);
  }

  // The bars beside the alley: its own edges, stretched and darkened, so the alley seems to carry on.
  function drawBars() {
    if (!bgSprite.complete || !bgSprite.naturalWidth) return;
    hctx.imageSmoothingEnabled = true;
    if (gx > 1) {
      hctx.drawImage(bgSprite, 0, 0, 30, 540, 0, gy, gx, gh);
      hctx.drawImage(bgSprite, 930, 0, 30, 540, W - gx, gy, gx, gh);
    }
    if (gy > 1) {
      hctx.drawImage(bgSprite, 0, 0, 960, 20, gx, 0, gw, gy);
      hctx.drawImage(bgSprite, 0, 520, 960, 20, gx, H - gy, gw, gy);
    }
    hctx.fillStyle = 'rgba(0,0,0,0.74)';
    if (gx > 1) { hctx.fillRect(0, 0, gx, H); hctx.fillRect(W - gx, 0, gx, H); }
    if (gy > 1) { hctx.fillRect(gx, 0, gw, gy); hctx.fillRect(gx, H - gy, gw, gy); }
  }

  // ---------- pause ----------
  const PAUSABLE = ['controls', 'playing', 'dying', 'bossExit', 'bossExitDoorClosing'];
  const canPause = () => inGame() && PAUSABLE.includes(gameState);
  function pauseGame() {
    if (gamePaused || !canPause()) return;
    gamePaused = true;
    releaseAll();
    UnrugSfx.pick();
    UnrugSound.setPaused(true);
    pauseCard.hidden = false;
    $('resume-btn').focus({ preventScroll: true });
  }
  function resumeGame() {
    if (!gamePaused) return;
    if (!rotateEl.hidden) return;
    pauseCard.hidden = true;
    gamePaused = false;
    UnrugSound.setPaused(false);
    UnrugSound.init();
    UnrugSfx.back();
  }
  pauseBtn.addEventListener('click', pauseGame);
  $('resume-btn').addEventListener('click', resumeGame);
  $('quit-btn').addEventListener('click', () => { UnrugRun.quit(); location.reload(); });
  function showSound() { soundBtn.textContent = UnrugSound.muted ? 'Sound: off' : 'Sound: on'; soundBtn.setAttribute('aria-pressed', String(!UnrugSound.muted)); }
  soundBtn.addEventListener('click', () => { UnrugSound.muted = !UnrugSound.muted; showSound(); });
  showSound();
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
  addEventListener('keydown', e => {
    UnrugSound.init();
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      if (gamePaused) resumeGame(); else pauseGame();
    }
  });

  // ---------- full screen ----------
  const root = document.documentElement;
  const canFull = !!(root.requestFullscreen || root.webkitRequestFullscreen);
  const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function enterFull() {
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!req || isFull()) return;
    try {
      const r = req.call(root, { navigationUI: 'hide' });
      if (r && r.then) r.then(() => {
        try { const l = screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'); if (l && l.catch) l.catch(() => {}); } catch (e) {}
      }).catch(() => {});
    } catch (e) {}
  }
  function exitFull() {
    const ex = document.exitFullscreen || document.webkitExitFullscreen;
    if (ex && isFull()) { try { const r = ex.call(document); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  }
  const toggleFull = () => (isFull() ? exitFull() : enterFull());
  function showFull() {
    const on = isFull();
    for (const b of [fsBtn, fs2Btn]) { b.textContent = on ? 'Exit full screen' : 'Full screen'; b.setAttribute('aria-pressed', String(on)); }
    setTimeout(layout, 60);
  }
  fsBtn.addEventListener('click', toggleFull);
  fs2Btn.addEventListener('click', toggleFull);
  document.addEventListener('fullscreenchange', showFull);
  document.addEventListener('webkitfullscreenchange', showFull);
  if (!canFull) { fsBtn.hidden = true; fs2Btn.hidden = true; }
  window.unrugEnterFull = enterFull;

  // ---------- portrait ----------
  // Landscape only: on a touch screen held upright the game pauses and waits on this screen.
  function checkRotate() {
    const upright = coarse.matches && H > W;
    rotateEl.hidden = !upright;
    if (upright) pauseGame();
  }
  const rctx = rotateArt.getContext('2d');
  function drawRotate(t) {
    const s = 240, p = (t / 3400) % 1;
    const ease = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
    let ang = 0;
    if (p < 0.3) ang = 0; else if (p < 0.55) ang = -ease((p - 0.3) / 0.25) * Math.PI / 2; else if (p < 0.88) ang = -Math.PI / 2; else ang = -Math.PI / 2 * (1 - ease((p - 0.88) / 0.12));
    rctx.clearRect(0, 0, s, s);
    rctx.save(); rctx.translate(s / 2, s / 2); rctx.rotate(ang);
    const pw = 84, ph = 172;
    rctx.beginPath(); rctx.roundRect ? rctx.roundRect(-pw / 2, -ph / 2, pw, ph, 14) : rctx.rect(-pw / 2, -ph / 2, pw, ph);
    rctx.fillStyle = '#1c1416'; rctx.fill(); rctx.lineWidth = 4; rctx.strokeStyle = '#ffd700'; rctx.stroke();
    rctx.rotate(-ang);
    if (playerMasterSprite.complete && playerMasterSprite.naturalWidth) {
      rctx.imageSmoothingEnabled = false;
      const k = 1 + 0.3 * Math.min(1, -ang / (Math.PI / 2));
      rctx.drawImage(playerMasterSprite, 0, 0, 64, 96, -32 * k, -48 * k, 64 * k, 96 * k);
    }
    rctx.restore();
  }

  // ---------- every frame: the controls, the pause button, the portrait art ----------
  function frame(t) {
    hctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hctx.clearRect(0, 0, W, H);
    const playing = inGame() && !gamePaused && PAUSABLE.includes(gameState);
    pauseBtn.hidden = !(inGame() && PAUSABLE.includes(gameState)) || gamePaused;
    if (UnrugTitle.visible()) UnrugTitle.draw(t);
    else if (gx > 1 || gy > 1) drawBars();
    if (touchMode && playing && gameState !== 'controls') drawControls();
    if (!rotateEl.hidden) drawRotate(t);
    requestAnimationFrame(frame);
  }

  layout();
  requestAnimationFrame(frame);
})();
