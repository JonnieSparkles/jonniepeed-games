// Don't click this: up to four phones, anywhere, find each other (docs/games/dont-click-this.md).
// The match link carries a random room code after the #. Every phone connects to that room on the rooms
// Worker (rooms/, docs/guides/05-rooms.md), which passes each one's messages to the others, tagged with the
// sender's seat. Each phone sends where its dot is; when two dots touch they burst, and when three or four
// pile up together, everyone's phone goes off.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const SOUND = window.DontClickSound;
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  const ROOMS = local ? 'ws://localhost:8788' : 'wss://rooms.jonniepeed.games';
  const CODE = /^[a-z0-9]{8,32}$/;
  const SEATS = 4;
  const R = 0.05;                     // dot radius, as a share of the play square
  // Each seat keeps its color on every phone, so "I'm green" means the same thing to everyone.
  const SEAT = {
    1: { name: 'Blue', col: '#39e1ff', at: [0.28, 0.5] },
    2: { name: 'Orange', col: '#ff8a3d', at: [0.72, 0.5] },
    3: { name: 'Green', col: '#7dff6a', at: [0.5, 0.28] },
    4: { name: 'Pink', col: '#ff5fd2', at: [0.5, 0.72] }
  };

  const canvas = $('c'), g = canvas.getContext('2d');
  const banner = $('banner'), hint = $('hint'), roster = $('roster'), pingEl = $('ping');
  const titleCard = $('titleCard'), secretCard = $('secretCard'), shareCard = $('shareCard'), msgCard = $('msgCard');
  const inviteBtn = $('inviteBtn'), backBtn = $('backBtn');
  // Opening a match asks for the secret. It's always a meatball; the other two are random.
  const DECOYS = ['Pickle', 'Waffle', 'Taco', 'Pretzel', 'Dumpling', 'Burrito', 'Noodle', 'Nugget', 'Pancake', 'Crouton', 'Biscuit', 'Tater tot'];

  function randomCode() {
    const abc = 'abcdefghijkmnpqrstuvwxyz23456789', bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => abc[b % abc.length]).join('');
  }
  const me = randomCode();           // this visit, so a reconnect gets its own seat back

  let code = null, ws = null, seat = 0, phase = 'title', secret = '';
  let retries = 0, retryTimer = null, pingAt = 0, rtt = 0, pingTimer = null;
  const you = { x: 0.28, y: 0.5, down: false, moved: false };
  // Everyone else, by seat: where they are, where they were last reported, and whether they're here now.
  const players = {};
  function player(s) {
    if (!players[s]) {
      const [x, y] = SEAT[s].at;
      players[s] = { x, y, tx: x, ty: y, down: false, seen: false, here: false, rtt: 0, trail: [] };
    }
    return players[s];
  }
  const here = () => Object.keys(players).map(Number).filter(s => players[s].here);
  // Touches: one per pair of dots, re-armed once the two move apart. A pile-up needs three or more.
  const pairs = {};                   // "a-b" -> { armed, at }
  const pairKey = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
  let booms = 0, pileArmed = true, lastPile = -1e9, sentAt = 0, sendQueued = false;
  const parts = [];
  let flash = 0;

  // ---------- connection ----------
  function connect() {
    clearTimeout(retryTimer);
    if (ws) { ws.onclose = null; try { ws.close(); } catch (e) {} }
    const s = secret ? '&s=' + encodeURIComponent(secret) : '';
    try { ws = new WebSocket(`${ROOMS}/room/${code}?me=${me}${s}`); } catch (e) { scheduleRetry(); return; }
    ws.onmessage = e => onMessage(e.data);
    ws.onclose = e => {
      ws = null; clearInterval(pingTimer);
      if (e.code === 4001) return showMessage('This match is full', 'Four people are already playing here. Start your own and send the link to your friends.');
      if (e.code === 4002) return;     // replaced by this same page's newer connection
      if (e.code === 4003) {
        if (secret) return askSecret(true);
        return showMessage("This match isn't open", 'Ask your friend to start a new one and send you the link.');
      }
      // Everyone looks away until the room says who's still here.
      for (const s of here()) setHere(s, false, true);
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
    const from = SEAT[m.f] ? m.f : 0;
    if (m.t === 'hello') {
      retries = 0; seat = m.seat;
      if (!you.moved) [you.x, you.y] = SEAT[seat].at;
      pingTimer = setInterval(ping, 2000); ping();
      const others = (m.seats || []).filter(s => SEAT[s] && s !== seat);
      others.forEach(s => setHere(s, true, true));
      drawRoster();
      if (others.length) together(others.length === 1 ? `${SEAT[others[0]].name} is here!` : `${others.length} friends are here!`);
      else waiting();
    } else if (m.t === 'join') {
      if (SEAT[m.seat] && m.seat !== seat) setHere(m.seat, true);
    } else if (m.t === 'leave') {
      if (SEAT[m.seat] && m.seat !== seat) setHere(m.seat, false);
    } else if (m.t === 'p' && from) {
      const p = player(from);
      if (!p.here) setHere(from, true);
      p.tx = clamp(+m.x); p.ty = clamp(+m.y); p.down = !!m.d; p.seen = true;
      if (m.r) p.rtt = +m.r;
    } else if (m.t === 'boom' && from && SEAT[m.w]) {
      // Whoever's dot touched another says so; everyone plays it unless they already did.
      touch(from, m.w, false);
    } else if (m.t === 'all' && from) {
      if (performance.now() - lastPile > 2000) pile(false);
    }
  }
  function ping() { if (ws && ws.readyState === 1) { pingAt = performance.now(); ws.send('ping'); } }
  function showPing() {
    // One way, phone to phone, is about half of each phone's round trip to the room. Shows the slowest friend.
    const worst = Math.max(0, ...here().map(s => players[s].rtt));
    pingEl.textContent = worst && rtt ? `~${Math.round(rtt / 2 + worst / 2)} ms apart` : '';
  }

  // ---------- what the players see ----------
  function hideCards() { titleCard.hidden = secretCard.hidden = shareCard.hidden = msgCard.hidden = true; }
  function askSecret(wrong) {
    phase = 'secret'; secret = ''; code = null;
    clearTimeout(retryTimer);
    history.replaceState(null, '', location.pathname);
    hideCards();
    secretCard.hidden = false;
    hint.textContent = '';
    const text = $('secretText');
    text.textContent = wrong ? "Nope. That's not the secret." : 'Pick one.';
    text.classList.toggle('nope', !!wrong);
    if (wrong) {
      SOUND.play('leave'); buzz([80]);
      const card = secretCard.firstElementChild;
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
    }
    const pool = DECOYS.slice(), picks = ['Meatball'];
    while (picks.length < 3) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    picks.sort(() => Math.random() - 0.5);
    const box = $('choices');
    box.textContent = '';
    picks.forEach(word => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ghost'; b.textContent = word;
      b.addEventListener('click', () => pickSecret(word));
      box.append(b);
    });
    box.firstElementChild.focus({ preventScroll: true });
  }
  function pickSecret(word) {
    SOUND.init(); SOUND.play('tap');
    // The room checks it: the answer isn't in this page.
    secret = word.toLowerCase();
    code = randomCode();
    history.replaceState(null, '', '#' + code);
    hideCards();
    phase = 'checking';
    hint.textContent = 'Checking the secret…';
    retries = 0;
    connect();
  }
  // The share card: alone, it waits for the first friend; with friends, it's the Invite card and closes again.
  function showShare() {
    hideCards();
    shareCard.hidden = false;
    $('link').value = location.href;
    const alone = !here().length;
    $('waitText').hidden = !alone;
    backBtn.hidden = alone;
  }
  function waiting() {
    phase = 'waiting';
    showShare();
    hint.textContent = '';
    syncInvite();
  }
  function together(title) {
    phase = 'together';
    hideCards();
    sendPos(true);
    SOUND.play('join');
    buzz([60, 60, 120]);
    say(title, 'Drag your dot into theirs.', 2600);
    syncHint(); syncInvite();
  }
  function setHere(s, isHere, quiet) {
    const p = player(s);
    if (p.here === isHere) return;
    p.here = isHere;
    drawRoster(); showPing(); syncInvite();
    if (isHere) {
      if (quiet) return;
      if (phase !== 'together') return together(`${SEAT[s].name} is here!`);
      sendPos(true);
      SOUND.play('join'); buzz([60, 60, 120]);
      const n = here().length + 1;
      say(p.seen ? `${SEAT[s].name} is back` : `${SEAT[s].name} joined`, `${n} of you now.`, 2200);
      if (!shareCard.hidden && !backBtn.hidden) showShare();
      syncHint();
    } else {
      p.down = false; p.trail.length = 0;
      if (quiet || phase !== 'together') return;
      SOUND.play('leave');
      say(`${SEAT[s].name} left`, 'They can come back with the same link.', 2600);
      syncHint();
    }
  }
  function syncHint() {
    const n = here().length;
    if (phase !== 'together') return;
    hint.textContent = n === 0 ? 'Waiting for your friends to come back'
      : n === 1 ? 'Drag your dot into theirs'
      : 'Touch a friend, or all pile into the middle';
  }
  function syncInvite() { inviteBtn.hidden = !(phase === 'together' && here().length + 1 < SEATS); }
  function drawRoster() {
    roster.textContent = '';
    if (!seat) return;
    for (let s = 1; s <= SEATS; s++) {
      const mine = s === seat, on = mine || (players[s] && players[s].here);
      if (!on && !(players[s] && players[s].seen)) continue;
      const span = document.createElement('span');
      span.className = (mine ? 'me' : '') + (on ? '' : ' away');
      span.style.setProperty('--c', SEAT[s].col);
      span.dataset.seat = s;
      span.title = mine ? `You (${SEAT[s].name})` : SEAT[s].name + (on ? '' : ' (away)');
      span.setAttribute('aria-label', span.title);
      span.append(document.createElement('i'));
      if (mine) span.append('You');
      roster.append(span);
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
    syncInvite();
  }
  function buzz(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {} }

  // ---------- the moment dots touch ----------
  const pos = s => s === seat ? you : player(s);
  function burst(x, y, n, speed, cols) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 0.15 + Math.random() * speed;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, col: cols[i % cols.length] });
    }
  }
  function touch(a, b, mine) {
    const key = pairKey(a, b), pair = pairs[key] || (pairs[key] = { armed: true, at: -1e9 });
    if (performance.now() - pair.at < 800) return;
    pair.at = performance.now(); pair.armed = false;
    if (mine) send({ t: 'boom', w: b });
    const A = pos(a), B = pos(b), cx = (A.x + B.x) / 2, cy = (A.y + B.y) / 2;
    const involved = a === seat || b === seat;
    if (!involved) {
      // Two friends touched: a smaller burst where they are.
      burst(cx, cy, 40, 0.4, [SEAT[a].col, SEAT[b].col]);
      SOUND.play('boom', false);
      return;
    }
    booms++;
    const big = booms === 1;
    burst(cx, cy, big ? 140 : 60, big ? 0.9 : 0.5, [SEAT[a].col, SEAT[b].col]);
    flash = big ? 1 : 0.5;
    SOUND.play('boom', big);
    buzz(big ? [200, 80, 300] : [120]);
    if (big) say('WE DID IT', 'Different phones. One page. Across the internet.', 3600);
    else if (performance.now() - lastPile > 3000) say(`×${booms}`, '', 900);   // don't cover EVERYONE!
  }
  function pile(mine) {
    lastPile = performance.now(); pileArmed = false;
    if (mine) send({ t: 'all' });
    const seats = [seat, ...here()];
    const cx = seats.reduce((t, s) => t + pos(s).x, 0) / seats.length, cy = seats.reduce((t, s) => t + pos(s).y, 0) / seats.length;
    burst(cx, cy, 220, 1.2, seats.map(s => SEAT[s].col));
    flash = 1;
    SOUND.play('boom', true);
    buzz([300, 100, 300, 100, 400]);
    say('EVERYONE!', `${seats.length} phones. One pile.`, 3600);
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
    askSecret(false);
  });
  $('msgBtn').addEventListener('click', () => {
    history.replaceState(null, '', location.pathname);
    location.reload();
  });
  inviteBtn.addEventListener('click', () => { SOUND.init(); SOUND.play('tap'); showShare(); });
  backBtn.addEventListener('click', () => { SOUND.play('tap'); hideCards(); });
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

  const px = x => square.x + x * square.s, py = y => square.y + y * square.s;
  function dot(x, y, col, down, alpha) {
    const cx = px(x), cy = py(y), r = R * square.s;
    g.globalAlpha = alpha;
    const glow = g.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * (down ? 3 : 2.2));
    glow.addColorStop(0, col); glow.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(cx, cy, r * (down ? 3 : 2.2), 0, Math.PI * 2); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
    if (down) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r * (1.5 + 0.3 * Math.sin(performance.now() / 120)), 0, Math.PI * 2); g.stroke(); }
    g.globalAlpha = 1;
  }
  // Names go under the dots, yours first; a name that would land on top of another is left out.
  function labels(list) {
    const shown = [];
    g.fillStyle = '#e8ecff'; g.font = "12px 'Silkscreen', monospace"; g.textAlign = 'center';
    for (const { x, y, label, alpha } of list) {
      if (shown.some(p => Math.abs(p.x - x) < R * 3 && Math.abs(p.y - y) < R * 1.2)) continue;
      shown.push({ x, y });
      g.globalAlpha = alpha;
      g.fillText(label, px(x), py(y) + R * square.s + 18);
    }
    g.globalAlpha = 1;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    // keyboard
    const kx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), ky = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
    if (kx || ky) { you.x = clamp(you.x + kx * dt * 0.6); you.y = clamp(you.y + ky * dt * 0.6); you.moved = true; sendPos(); }
    // friends' dots glide toward where they were last reported
    const k = 1 - Math.exp(-dt * 18), present = here();
    for (const s of Object.keys(players)) {
      const p = players[s];
      p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k;
      if (p.here) { p.trail.push([p.x, p.y]); if (p.trail.length > 14) p.trail.shift(); }
    }
    if (phase === 'together' && seat) {
      // Each phone judges its own dot's touches and tells the others.
      for (const s of present) {
        const key = pairKey(seat, s), pair = pairs[key] || (pairs[key] = { armed: true, at: -1e9 });
        const d = Math.hypot(you.x - players[s].x, you.y - players[s].y);
        if (pair.armed && d < R * 2) touch(seat, s, true);
        else if (!pair.armed && d > R * 5) pair.armed = true;
      }
      // A pile-up: three or more, all close together at once.
      if (present.length >= 2) {
        const all = [you, ...present.map(s => players[s])];
        const cx = all.reduce((t, p) => t + p.x, 0) / all.length, cy = all.reduce((t, p) => t + p.y, 0) / all.length;
        const spread = Math.max(...all.map(p => Math.hypot(p.x - cx, p.y - cy)));
        if (pileArmed && spread < R * 2.5 && now - lastPile > 2000) pile(true);
        else if (!pileArmed && spread > R * 6) pileArmed = true;
      }
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
    g.strokeStyle = present.length ? '#3a4a78' : '#262e48'; g.lineWidth = 2;
    g.strokeRect(square.x, square.y, square.s, square.s);
    // a faint line from your dot to each friend, and their trails
    for (const s of present) {
      const p = players[s];
      g.strokeStyle = 'rgba(232,236,255,0.12)'; g.setLineDash([4, 8]); g.lineWidth = 1;
      g.beginPath(); g.moveTo(px(you.x), py(you.y)); g.lineTo(px(p.x), py(p.y)); g.stroke();
      g.setLineDash([]);
      p.trail.forEach(([x, y], i) => {
        g.globalAlpha = i / p.trail.length * 0.3; g.fillStyle = SEAT[s].col;
        g.beginPath(); g.arc(px(x), py(y), R * square.s * (0.3 + 0.5 * i / p.trail.length), 0, Math.PI * 2); g.fill();
      });
      g.globalAlpha = 1;
    }
    const names = [];
    if (phase !== 'title' && seat) names.push({ x: you.x, y: you.y, label: 'you', alpha: 1 });
    for (const s of Object.keys(players)) {
      const p = players[s];
      if (!(p.seen || p.here)) continue;
      dot(p.x, p.y, SEAT[s].col, p.down, p.here ? 1 : 0.25);
      names.push({ x: p.x, y: p.y, label: SEAT[s].name.toLowerCase(), alpha: p.here ? 1 : 0.25 });
    }
    if (phase !== 'title' && seat) dot(you.x, you.y, SEAT[seat].col, you.down, 1);
    labels(names);
    for (const p of parts) {
      g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.col;
      g.fillRect(px(p.x) - 2, py(p.y) - 2, 4, 4);
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
    hint.textContent = 'Joining your friends…';
    connect();
  }
})();
