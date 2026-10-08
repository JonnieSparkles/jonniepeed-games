/* Play stats (SPEC-009): each run reports how it went to the studio's private dashboards.
   Nothing is stored on the device, the game never waits for a report, and a failure here never reaches the game.
   See docs/guides/03-play-stats.md. */
(() => {
  'use strict';
  const API = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:8789' : 'https://stats.jonniepeed.games';
  // Automated browsers (the harnesses and balance bots) and file:// previews report nothing.
  const off = navigator.webdriver === true || location.protocol === 'file:';
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const HOST = /^[a-z0-9](?:[a-z0-9.-]{0,98}[a-z0-9])?$/;
  const KEY = /^[a-z][a-z0-9_]{0,31}$/;
  const DAY_MS = 24 * 60 * 60 * 1000;

  function uuid() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (_) {}
    const b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  // One per page load, so runs can be grouped into sittings. It lives in memory only and is gone when the page closes.
  const visit = uuid();
  const hostOf = text => { try { const h = new URL(text).hostname.toLowerCase(); return HOST.test(h) ? h : undefined; } catch (_) { return undefined; } };
  function device() {
    try {
      if (!matchMedia('(pointer: coarse)').matches) return 'desktop';
      return Math.min(screen.width, screen.height) < 600 ? 'phone' : 'tablet';
    } catch (_) { return 'desktop'; }
  }
  const whole = v => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : undefined);
  // The game's own numbers. Anything the Worker would refuse is dropped here, so one bad stat never loses the run.
  function clean(stats) {
    if (!stats || typeof stats !== 'object') return undefined;
    const out = {};
    let n = 0;
    for (const [key, value] of Object.entries(stats)) {
      if (n >= 24 || !KEY.test(key)) continue;
      if (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e12) out[key] = value;
      else if (typeof value === 'boolean') out[key] = value;
      else if (typeof value === 'string') out[key] = value.slice(0, 40);
      else continue;
      n++;
    }
    return n ? out : undefined;
  }

  function post(path, body) {
    if (off) return;
    try {
      const text = JSON.stringify(body);
      // A beacon outlives the page, so a run reported as the tab closes still arrives.
      if (navigator.sendBeacon && navigator.sendBeacon(API + path, text)) return;
      fetch(API + path, { method: 'POST', body: text, keepalive: true }).catch(() => {});
    } catch (_) { /* never reaches the game */ }
  }
  const base = run => ({ run: run.id, visit, game: run.game, board: run.board, device: run.device,
    orientation: run.orientation, host: run.host, from: run.from });

  function report(run, data, outcome) {
    data = data || {};
    const body = base(run);
    body.outcome = data.won ? 'won' : outcome;
    const time = whole(data.time_ms);
    body.time_ms = Math.min(DAY_MS, time !== undefined ? time : whole(performance.now() - run.t0) || 0);
    const score = whole(data.score);
    if (score !== undefined) body.score = score;
    body.input = data.input === 'touch' || data.input === 'keys' ? data.input : run.input;
    // The leaderboard token starts with its run ID; the board's saved row carries the same ID.
    const id = typeof run.token === 'string' ? run.token.split('.')[0] : '';
    if (UUID.test(id)) body.score_run = id;
    const stats = clean(data.stats);
    if (stats) body.stats = stats;
    post('/v1/end', body);
  }
  function progress(run) {
    try { return (run.progress && run.progress()) || {}; } catch (_) { return {}; }
  }

  let active = null;
  const api = {
    // Call when real play begins (never for demos or watch modes). options:
    //   board     the game's BOARD, if it has one
    //   token     the promise from Leaderboard.start, so a saved run can be matched to its row
    //   progress  a function returning { score, time_ms, won, stats } for a run left mid-way
    // A run still open from before is reported as quit first.
    start(game, options) {
      try {
        options = options || {};
        if (active && !active.ended) api.quit(active);
        const run = {
          id: uuid(), game, board: Number.isSafeInteger(options.board) ? options.board : undefined,
          device: device(), orientation: innerWidth >= innerHeight ? 'landscape' : 'portrait',
          host: location.hostname.toLowerCase(), from: document.referrer ? hostOf(document.referrer) : undefined,
          progress: typeof options.progress === 'function' ? options.progress : null,
          input: 'keys', token: null, waiting: null, t0: performance.now(), ended: false, quitAt: -1e9
        };
        if (typeof options.token === 'string') run.token = options.token;
        else if (options.token && typeof options.token.then === 'function') {
          run.waiting = Promise.resolve(options.token).then(t => { run.token = t; }, () => {});
        }
        active = run;
        post('/v1/start', base(run));
        return run;
      } catch (_) { return null; }
    },
    // Call at game over with { score, time_ms, input, won, stats }. It can be called again for the same run,
    // as when a winner keeps playing: the last report wins.
    end(run, data) {
      try {
        if (!run) return;
        run.ended = true;
        if (active === run) active = null;
        if (run.token !== null || !run.waiting) { report(run, data, 'over'); return; }
        // The board's token normally arrived long ago; give a late one a moment, then report without it.
        let sent = false;
        const send = () => { if (!sent) { sent = true; report(run, data, 'over'); } };
        run.waiting.then(send, send);
        setTimeout(send, 1500);
      } catch (_) { /* never reaches the game */ }
    },
    // Call when the player leaves a run without finishing it, such as back to the title from pause.
    quit(run) {
      try {
        if (!run || run.ended) return;
        run.ended = true;
        if (active === run) active = null;
        report(run, progress(run), 'quit');
      } catch (_) { /* never reaches the game */ }
    }
  };

  // Hidden mid-run (tab closed, phone locked, another app): report a provisional quit with the progress so far.
  // If the player comes back and finishes, the real end replaces it.
  function hidden() {
    const run = active;
    if (!run || run.ended || performance.now() - run.quitAt < 1000) return;
    run.quitAt = performance.now();
    report(run, progress(run), 'quit');
  }
  try {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hidden(); });
    addEventListener('pagehide', hidden);
    // A touch during a run marks it as played by touch, for games that don't say themselves.
    addEventListener('pointerdown', e => { if (active && (e.pointerType === 'touch' || e.pointerType === 'pen')) active.input = 'touch'; }, true);
  } catch (_) {}

  window.PlayStats = api;
})();
