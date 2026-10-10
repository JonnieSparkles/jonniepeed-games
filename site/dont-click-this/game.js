// Don't click this: two phones, anywhere, find each other (docs/games/dont-click-this.md).
// The match link carries a random room code after the #. Both phones connect to that room on the rooms
// Worker (rooms/, docs/guides/05-rooms.md), which passes each one's messages to the other. Each phone
// sends where its dot is; when the two dots touch, both phones burst.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const SOUND = window.DontClickSound;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const ROOMS = local ? 'ws://localhost:8788' : 'wss://rooms.jonniepeed.games';
  const CODE = /^[a-z0-9]{8,32}$/;
  const R = 0.05;                     // dot radius, as a share of the play square
  const START = { 1: [0.28, 0.5], 2: [0.72, 0.5] };

  const canvas = $('c'), g = canvas.getContext('2d');
  const banner = $('banner'), hint = $('hint'), frLabel = $('frLabel'), pingEl = $('ping');
  const titleCard = $('titleCard'), shareCard = $('shareCard'), msgCard = $('msgCard');

  function randomCode() {
    const abc = 'abcdefghijkmnpqrstuvwxyz23456789', bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => abc[b % abc.length]).join('');
  }
  const me = randomCode();           // this visit, so a reconnect gets its own seat back

  let code = null, ws = null, seat = 0, friendHere = false, phase = 'title';
  let retries = 0, retryTimer = null, pingAt = 0, rtt = 0, theirRtt = 0, pingTimer = null;
  const you = { x: 0.28, y: 0.5, down: false, moved: false };
  const them = { x: 0.72, y: 0.5, tx: 0.72, ty: 0.5, down: false, seen: false, trail: [] };
  let armed = true, lastBoom = -1e9, booms = 0, sentAt = 0, sendQueued = false;
  const parts = [];
  let flash = 0;

  // ---------- connection ----------
  function connect() {
    clearTimeout(retryTimer);
    if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} }
    try { ws = new WebSocket(`${ROOMS}/room/${code}?me=${me}`); } catch (e) { scheduleRetry(); return; }
    ws.onmessage = e => onMessage(e.data);
    ws.onclose = e => {
      ws = null; clearInterval(pingTimer);
      if (e.code === 4001) return showMessage('This match is full', 'Two people are already playing here. Start your own and send the link to a friend.');
      if (e.code === 4002) return;     // replaced by this same page's newer connection
      setFriend(false, true);
      if (phase !== 'full') { hint.textContent = 'Reconnecting…'; scheduleRetry(); }
    };
  }
  function scheduleRetry() {
    retries++;
    retryTimer = setTimeout(connect, Math.min(5000, 600 * retries));
  }
  function send(data) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(data)); }

  function onMessage(raw) {
    if (raw === 'pong') { rtt = rtt ? rtt * 0.7 + (performance.now() - pingAt) * 0.3 : performance.now() - pingAt; showPing(); return; }
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.t === 'hello') {
      retries = 0; seat = m.seat;
      if (!you.moved) [you.x, you.y] = START[seat];
      const other = START[3 - seat];
      if (!them.seen) { them.x = them.tx = other[0]; them.y = them.ty = other[1]; }
      pingTimer = setInterval(ping, 2000); ping();
      if (m.others) setFriend(true); else waiting();
    } else if (m.t === 'full') {
      phase = 'full';
    } else if (m.t === 'join') {
      setFriend(true);
    } else if (m.t === 'leave') {
      setFriend(false);
    } else if (m.t === 'p') {
      if (!friendHere) setFriend(true);
      them.tx = clamp(+m.x); them.ty = clamp(+m.y); them.down = !!m.d; them.seen = true;
      if (m.r) theirRtt = +m.r;
    } else if (m.t === 'boom') {
      if (performance.now() - lastBoom > 800) boom(false);
    }
  }
  function ping() { if (ws && ws.readyState === 1) { pingAt = performance.now(); ws.send('ping'); } }
  function showPing() {
    // One way, phone to phone, is about half of each phone's round trip to the room.
    pingEl.textContent = friendHere && theirRtt ? `~${Math.round(rtt / 2 + theirRtt / 2)} ms apart` : '';
  }

  // ---------- what the players see ----------
  function hideCards() { titleCard.hidden = shareCard.hidden = msgCard.hidden = true; }
  function waiting() {
    phase = 'waiting';
    hideCards();
    shareCard.hidden = false;
    $('link').value = location.href;
    hint.textContent = '';
  }
  function setFriend(here, quiet) {
    if (here === friendHere) return;
    friendHere = here;
    frLabel.classList.toggle('away', !here);
    if (here) {
      phase = 'together';
      hideCards();
      sendPos(true);
      SOUND.play('join');
      buzz([60, 60, 120]);
      say(booms ? 'Friend is back' : 'Friend is here!', 'Drag your dot into theirs.', 2600);
      hint.textContent = 'Drag your dot into theirs';
    } else {
      them.down = false; them.trail.length = 0;
      showPing();
      if (!quiet && phase === 'together') {
        SOUND.play('leave');
        say('Friend left', 'They can come back with the same link.', 2600);
        hint.textContent = 'Waiting for your friend to come back';
      }
    }
  }
  let sayTimer = null;
  function say(text, small, ms) {
    banner.innerHTML = '';
    banner.append(text);
    if (small) { const s = document.createElement('small'); s.textContent = small; banner.append(s); }
    banner.classList.add('show');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => banner.classList.remove('show'), ms || 2000);
  }
  function showMessage(title, text) {
    phase = 'full';
    hideCards();
    $('msgTitle').textContent = title; $('msgText').textContent = text;
    msgCard.hidden = false;
    hint.textContent = '';
  }
  function buzz(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }

  // ---------- the moment the dots touch ----------
  function boom(mine) {
    lastBoom = performance.now(); armed = false; booms++;
    if (mine) send({ t: 'boom' });
    const big = booms === 1;
    const cx = (you.x + them.x) / 2, cy = (you.y + them.y) / 2;
    for (let i = 0; i < (big ? 140 : 60); i++) {
      const a = Math.random() * Math.PI * 2, v = (0.15 + Math.random() * (big ? 0.9 : 0.5));
      parts.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col: i % 2 ? '#39e1ff' : '#ff8a3d' });
    }
    flash = big ? 1 : 0.5;
    SOUND.play('boom', big);
    buzz(big ? [200, 80, 300] : [120]);
    if (big) say('WE DID IT', 'Two phones. One page. Across the internet.', 3600);
    else say(`×${booms}`, '', 900);
    hint.textContent = big ? 'Do it again' : `${booms} high fives`;
  }

  // ---------- input ----------
  let square = { x: 0, y: 0, s: 1 };
  function toUnit(px, py) { return [clamp((px - square.x) / square.s), clamp((py - square.y) / square.s)]; }
  function clamp(v) { return Math.max(R, Math.min(1 - R, isFinite(v) ? v : 0.5)); }
  function sendPos(force) {
    const now = performance.now();
    if (!force && now - sentAt < 33) {   // about 30 a second at most
      if (!sendQueued) { sendQueued = true; setTimeout(() => { sendQueued = false; sendPos(true); }, 33 - (now - sentAt)); }
      return;
    }
    sentAt = now;
    send({ t: 'p', x: +you.x.toFixed(4), y: +you.y.toFixed(4), d: you.down ? 1 : 0, r: Math.round(rtt) });
  }
  let pointerId = null;
  canvas.addEventListener('pointerdown', e => {
    if (pointerId !== null) return;
    pointerId = e.pointerId; canvas.setPointerCapture(e.pointerId);
    SOUND.init();
    [you.x, you.y] = toUnit(e.clientX, e.clientY); you.down = true; you.moved = true;
    sendPos(true);
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== pointerId) return;
    [you.x, you.y] = toUnit(e.clientX, e.clientY);
    sendPos();
  });
  function up(e) { if (e.pointerId !== pointerId) return; pointerId = null; you.down = false; sendPos(true); }
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  const keys = {};
  addEventListener('keydown', e => {
    if (e.key === 'f' || e.key === 'F') return toggleFull();
    if (e.key === 'm' || e.key === 'M') return toggleSound();
    if (e.key.startsWith('Arrow')) { keys[e.key] = true; e.preventDefault(); }
  });
  addEventListener('keyup', e => { delete keys[e.key]; });

  // ---------- buttons ----------
  $('startBtn').addEventListener('click', () => {
    SOUND.init(); SOUND.play('tap');
    code = randomCode();
    history.replaceState(null, '', '#' + code);
    waiting();
    connect();
  });
  $('msgBtn').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    location.reload();
  });
  const shareText = "Play with me. Don't click this.";
  $('shareBtn').addEventListener('click', () => {
    SOUND.init();
    if (navigator.share) navigator.share({ title: "Don't click this", text: shareText, url: location.href }).catch(() => {});
    else copy();
  });
  $('copyBtn').addEventListener('click', () => { SOUND.init(); copy(); });
  function copy() {
    const btn = $('copyBtn'), done = () => { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy link'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(location.href).then(done, fallback);
    else fallback();
    function fallback() { const l = $('link'); l.focus(); l.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
  }
  function toggleSound() { SOUND.init(); const m = SOUND.toggle(); $('snd').setAttribute('aria-pressed', String(!m)); $('snd').textContent = m ? 'Muted' : 'Sound'; }
  $('snd').addEventListener('click', toggleSound);
  if (SOUND.muted) { $('snd').setAttribute('aria-pressed', 'false'); $('snd').textContent = 'Muted'; }

  // Full screen: the Fullscreen API where it exists; elsewhere (iPhone) the page already fills the window.
  const gameEl = $('game'), fsBtn = $('fs');
  const nativeFull = () => document.fullscreenElement || document.webkitFullscreenElement;
  function toggleFull() {
    try {
      if (nativeFull()) { const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (r && r.catch) r.catch(() => {}); }
      else { const req = gameEl.requestFullscreen || gameEl.webkitRequestFullscreen; if (req) { const r = req.call(gameEl); if (r && r.catch) r.catch(() => {}); } }
    } catch (e) {}
  }
  function syncFull() { fsBtn.setAttribute('aria-pressed', String(!!nativeFull())); fsBtn.textContent = nativeFull() ? 'Exit full screen' : 'Full screen'; }
  document.addEventListener('fullscreenchange', syncFull);
  document.addEventListener('webkitfullscreenchange', syncFull);
  fsBtn.hidden = !(gameEl.requestFullscreen || gameEl.webkitRequestFullscreen);
  fsBtn.addEventListener('click', toggleFull);

  // Back from the background (a locked phone, another app): reconnect at once if the connection dropped.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && code && !ws && phase !== 'full') { retries = 0; connect(); }
  });

  // ---------- drawing ----------
  let W = 0, H = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const s = Math.max(120, Math.min(W - 32, H - 120));
    square = { x: (W - s) / 2, y: (H - s) / 2 + 6, s };
  }
  addEventListener('resize', resize);
  resize();

  function dot(x, y, col, label, down, alpha) {
    const px = square.x + x * square.s, py = square.y + y * square.s, r = R * square.s;
    g.globalAlpha = alpha;
    const glow = g.createRadialGradient(px, py, r * 0.2, px, py, r * (down ? 3 : 2.2));
    glow.addColorStop(0, col); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(px, py, r * (down ? 3 : 2.2), 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
    if (down) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(px, py, r * (1.5 + 0.3 * Math.sin(performance.now() / 120)), 0, Math.PI * 2); g.stroke(); }
    g.fillStyle = '#e8ecff'; g.font = "12px 'Silkscreen', monospace"; g.textAlign = 'center';
    g.fillText(label, px, py + r + 18);
    g.globalAlpha = 1;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // keyboard
    const kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), ky = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
    if (kx || ky) { you.x = clamp(you.x + kx * dt * 0.6); you.y = clamp(you.y + ky * dt * 0.6); you.moved = true; sendPos(); }
    // their dot glides toward where it was last reported
    const k = 1 - Math.exp(-dt * 18);
    them.x += (them.tx - them.x) * k; them.y += (them.ty - them.y) * k;
    if (friendHere) { them.trail.push([them.x, them.y]); if (them.trail.length > 14) them.trail.shift(); }
    // contact
    const dist = Math.hypot(you.x - them.x, you.y - them.y);
    if (friendHere && phase === 'together') {
      if (armed && dist < R * 2 && performance.now() - lastBoom > 800) boom(true);
      if (!armed && dist > R * 5) armed = true;
    }
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt * 0.9; }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    flash = Math.max(0, flash - dt * 1.5);

    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0b0d14'; g.fillRect(0, 0, W, H);
    // the grid
    g.strokeStyle = '#1a2033'; g.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const o = square.s * i / 10;
      g.beginPath(); g.moveTo(square.x + o, square.y); g.lineTo(square.x + o, square.y + square.s); g.stroke();
      g.beginPath(); g.moveTo(square.x, square.y + o); g.lineTo(square.x + square.s, square.y + o); g.stroke();
    }
    g.strokeStyle = friendHere ? '#3a4a78' : '#262e48'; g.lineWidth = 2;
    g.strokeRect(square.x, square.y, square.s, square.s);
    // a line between the dots while you're both here
    if (friendHere) {
      g.strokeStyle = 'rgba(232,236,255,0.12)'; g.setLineDash([4, 8]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(square.x + you.x * square.s, square.y + you.y * square.s); g.lineTo(square.x + them.x * square.s, square.y + them.y * square.s); g.stroke();
      g.setLineDash([]);
      them.trail.forEach(([x, y], i) => {
        g.globalAlpha = i / them.trail.length * 0.3; g.fillStyle = '#ff8a3d';
        g.beginPath(); g.arc(square.x + x * square.s, square.y + y * square.s, R * square.s * (0.3 + 0.5 * i / them.trail.length), 0, Math.PI * 2); g.fill();
      });
      g.globalAlpha = 1;
    }
    if (them.seen || friendHere) dot(them.x, them.y, '#ff8a3d', 'friend', them.down, friendHere ? 1 : 0.25);
    if (phase !== 'title') dot(you.x, you.y, '#39e1ff', 'you', you.down, 1);
    for (const p of parts) {
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.col;
      g.fillRect(square.x + p.x * square.s - 2, square.y + p.y * square.s - 2, 4, 4);
    }
    g.globalAlpha = 1;
    if (flash) { g.fillStyle = `rgba(255,255,255,${flash * 0.35})`; g.fillRect(0, 0, W, H); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- start ----------
  const fromLink = location.hash.slice(1).toLowerCase();
  if (CODE.test(fromLink)) {
    // Opened from a friend's link: join straight away.
    code = fromLink;
    hideCards();
    phase = 'joining';
    hint.textContent = 'Joining your friend…';
    connect();
  }
})();
