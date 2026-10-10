// Rooms: play together over the internet, from a link (docs/guides/05-rooms.md).
// The page side of the rooms Worker (rooms/). It connects, stays connected (pings, reconnects after a drop or a
// locked phone, keeps your seat across a reload) and turns the room's messages into events, so a game only
// writes its game.
//
//   const room = Rooms.open({ game: 'pong', max: 2, secret: 'meatball' });  // new match: makes the link
//   const room = Rooms.join({ game: 'pong' });                              // from a link: the code is after the #
//   room.on('ready', () => …); room.on('join', seat => …); room.on('message', (msg, from) => …);
//   room.send({ t: 'aim', x }); room.sendTo(2, { t: 'state', … });
//
// Shared code: it only grows. Add functions and options; don't rename or change what an existing one does
// unless the same change updates every page that loads it (README, "Shared code stays compatible").
window.Rooms = (function () {
  'use strict';
  const local = typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname);
  const DEFAULT_URL = local ? 'ws://localhost:8788' : 'wss://rooms.jonniepeed.games';
  const CODE = /^[a-z0-9]{8,32}$/;
  const PING_EVERY = 2500;   // the room lets a phone go after 15 s without a ping or a message
  const DEAD_AFTER = 8000;   // no pong this long: the connection is dead even if the browser hasn't noticed

  function newCode() {
    const abc = 'abcdefghijkmnpqrstuvwxyz23456789', bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => abc[b % abc.length]).join('');
  }
  function codeFromLink() {
    const c = (location.hash || '').slice(1).toLowerCase();
    return CODE.test(c) ? c : null;
  }
  // A repeating timer that keeps time in a background tab. Browsers slow a hidden tab's own timers (Chrome to
  // once a minute after five minutes), which would get a desktop player dropped from the match while they're in
  // another tab, say pasting the link into a chat. A worker's timers aren't slowed that way, so pings keep going.
  // Falls back to setInterval where a worker can't start.
  function steady(fn, ms) {
    try {
      const src = 'setInterval(function () { postMessage(0); }, ' + ms + ');';
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const w = new Worker(url);
      URL.revokeObjectURL(url);
      w.onmessage = fn;
      return () => w.terminate();
    } catch (e) {
      const t = setInterval(fn, ms);
      return () => clearInterval(t);
    }
  }
  const store = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };

  // Shares the link with the phone's share sheet, or copies it. Resolves 'shared', 'copied' or 'failed'.
  function share(opts) {
    const url = (opts && opts.url) || location.href;
    if (navigator.share) {
      return navigator.share({ title: opts && opts.title, text: opts && opts.text, url })
        .then(() => 'shared', e => e && e.name === 'AbortError' ? 'cancelled' : copy(url));
    }
    return copy(url);
  }
  function copy(text) {
    const fallback = () => {
      const el = document.createElement('textarea');
      el.value = text; el.setAttribute('readonly', ''); el.style.position = 'fixed'; el.style.opacity = '0';
      document.body.appendChild(el); el.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      el.remove();
      return ok ? 'copied' : 'failed';
    };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(() => 'copied', fallback);
    return Promise.resolve(fallback());
  }

  // Opens a new match: makes a code, puts it in the page's link (after the #) and connects with the secret.
  function open(opts) {
    const code = newCode();
    if (opts.updateLink !== false) history.replaceState(null, '', location.pathname + location.search + '#' + code);
    return connect(Object.assign({}, opts, { code }));
  }
  // Joins the match in the page's link (or opts.code). Returns null when there's no code to join.
  function join(opts) {
    const code = String((opts && opts.code) || codeFromLink() || '').toLowerCase();
    return CODE.test(code) ? connect(Object.assign({}, opts, { code })) : null;
  }

  function connect(opts) {
    const code = opts.code;
    const base = opts.url || DEFAULT_URL;
    const meKey = 'rooms.me.' + code, seatKey = 'rooms.seat.' + code;
    // Kept for this tab, so a reload comes back as the same player.
    let me = store.get(meKey);
    if (!me) { me = newCode() + newCode(); store.set(meKey, me); }

    const handlers = {};
    let ws = null, retries = 0, retryTimer = null, stopPings = null, lastPong = 0, pingAt = 0, ready = false, done = false;
    let kicks = 0, helloAt = 0;   // times the room let us go (too many messages, or silent) without a long stay in between
    const present = new Set();
    const room = {
      code, game: opts.game || null,
      seat: 0, host: 0, max: 0, rtt: 0,
      status: 'connecting',
      get isHost() { return room.seat !== 0 && room.seat === room.host; },
      get players() { return [...present, ...(room.seat ? [room.seat] : [])].sort((a, b) => a - b); },
      get others() { return [...present].sort((a, b) => a - b); },
      get link() { return location.origin + location.pathname + location.search + '#' + code; },
      on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); return room; },
      off(name, fn) { handlers[name] = (handlers[name] || []).filter(f => f !== fn); return room; },
      // Everyone else gets it. Returns false (and drops it) while not connected.
      send(data) { return raw(data); },
      // Only that seat gets it.
      sendTo(seat, data) { return raw(Object.assign({}, data, { to: Number(seat) })); },
      leave() { done = true; stop(); setStatus('left'); }
    };
    function emit(name, ...args) {
      for (const fn of handlers[name] || []) { try { fn(...args); } catch (e) { setTimeout(() => { throw e; }); } }
    }
    function setStatus(s) { if (room.status !== s) { room.status = s; emit('status', s); } }
    function raw(data) {
      if (!ws || ws.readyState !== 1 || !ready) return false;
      try { ws.send(JSON.stringify(data)); return true; } catch (e) { return false; }
    }
    function setHost(h) { if (h !== room.host) { room.host = h; emit('host', h); } }

    function dial() {
      clearTimeout(retryTimer);
      if (done) return;
      if (ws) { ws.onclose = ws.onmessage = ws.onerror = null; try { ws.close(); } catch (e) {} }
      lastPong = 0;
      const q = new URLSearchParams({ me });
      if (room.game) q.set('game', room.game);
      if (opts.secret) q.set('s', opts.secret);
      if (opts.max) q.set('max', opts.max);
      const had = Number(store.get(seatKey)) || room.seat;
      if (had) q.set('seat', had);
      setStatus(ready ? 'reconnecting' : 'connecting');
      let sock;
      try { sock = new WebSocket(base + '/room/' + code + '?' + q); } catch (e) { return later(); }
      ws = sock;
      sock.onmessage = e => onMessage(e.data);
      sock.onclose = e => { if (ws === sock) onClose(e.code); };
    }
    function later(ms) {
      retries++;
      // The first retry is quick, inside the room's grace period, so a blip doesn't show as leaving.
      retryTimer = setTimeout(dial, ms != null ? ms : retries === 1 ? 200 : Math.min(8000, 500 * Math.pow(2, retries - 2)));
    }
    function stop() {
      clearTimeout(retryTimer); if (stopPings) { stopPings(); stopPings = null; }
      if (ws) { const s = ws; ws = null; s.onclose = s.onmessage = null; try { s.close(1000); } catch (e) {} }
    }
    function ping() {
      if (!ws || ws.readyState !== 1) return;
      if (lastPong && performance.now() - lastPong > DEAD_AFTER) { onClose(0); return; }
      pingAt = performance.now();
      try { ws.send('ping'); } catch (e) {}
    }

    function onMessage(data) {
      if (data === 'pong') {
        lastPong = performance.now();
        const sample = lastPong - pingAt;
        room.rtt = room.rtt ? Math.round(room.rtt * 0.7 + sample * 0.3) : Math.round(sample);
        emit('rtt', room.rtt);
        return;
      }
      let m; try { m = JSON.parse(data); } catch (e) { return; }
      if (m.f) return emit('message', m, m.f);
      if (m.t === 'hello') {
        retries = 0; lastPong = helloAt = performance.now();
        const oldSeat = room.seat;
        room.seat = m.seat; room.max = m.max || 0; store.set(seatKey, String(m.seat));
        if (!stopPings) stopPings = steady(ping, PING_EVERY);
        ping();
        // After a reconnect, catch up on who came and went while we were away.
        const now = new Set(m.seats || []);
        for (const s of [...present]) if (!now.has(s)) { present.delete(s); if (ready) emit('leave', s); }
        for (const s of now) if (!present.has(s)) { present.add(s); if (ready) emit('join', s); }
        if (ready && oldSeat && oldSeat !== m.seat) emit('seat', m.seat);   // rare: our seat was taken while we were away
        setStatus('connected');
        if (!ready) { ready = true; room.host = m.host || 0; emit('ready', { seat: room.seat, host: room.host, max: room.max, players: room.players }); }
        else setHost(m.host || 0);
      } else if (m.t === 'join') {
        if (!present.has(m.seat)) { present.add(m.seat); emit('join', m.seat); }
        setHost(m.host || 0);
      } else if (m.t === 'leave') {
        if (present.delete(m.seat)) emit('leave', m.seat);
        setHost(m.host || 0);
      } else if (m.t === 'error') {
        console.warn('[rooms]', m.reason, m.limit ? '(limit ' + m.limit + ')' : '');
        emit('error', m);
      }
      // 'full', 'nope' and 'wrong-game' arrive just before the room closes the connection; handled in onClose.
    }

    function onClose(code) {
      if (ws) { ws.onclose = ws.onmessage = null; try { ws.close(); } catch (e) {} ws = null; }
      if (done) return;
      const refuse = reason => { done = true; setStatus('refused'); emit('refused', reason); };
      if (code === 4001) return refuse('full');
      if (code === 4002) return refuse('replaced');         // this match was opened again in another tab
      if (code === 4003) return refuse(opts.secret && !ready ? 'nope' : 'closed');
      if (code === 4004) return refuse('wrong-game');
      setStatus('reconnecting');
      if (code === 4005 || code === 4006) {
        // Let go by the room. Come straight back the first time; if it keeps happening, back off, so a game stuck
        // sending too much doesn't keep everyone seeing it leave and rejoin.
        if (performance.now() - helloAt > 60000) kicks = 0;
        kicks++;
        return later(kicks === 1 && code === 4006 ? 0 : Math.min(30000, 2000 * Math.pow(2, kicks - 1)));
      }
      later();
    }

    // Back from the background or back online: reconnect now rather than waiting out the backoff.
    function wake() { if (!done && document.visibilityState !== 'hidden' && (!ws || ws.readyState > 1)) { retries = 0; dial(); } }
    document.addEventListener('visibilitychange', wake);
    addEventListener('online', wake);
    addEventListener('pagehide', () => { if (ws) try { ws.close(1000); } catch (e) {} });   // leaving the page: tell the room now
    addEventListener('pageshow', e => { if (e.persisted) wake(); });                       // back from the browser's page cache

    dial();
    return room;
  }

  return { open, join, newCode, codeFromLink, share, copy, url: DEFAULT_URL };
})();
