// Trailer harness: runs inside the game page under Playwright's fake clock. Game-agnostic; capture.py injects it
// after load, then evaluates the game's director (tests/<slug>/trailer/director.js) through window.__trailerEval.
//
// 1. CSS animations and transitions follow the fake clock (__stepAnims), so overlays, pops and fades play at the
//    same speed as the canvas.
// 2. Every top-level call into the game's sound object is logged with its time and the object's state flags, so
//    sound.py can replay them into an OfflineAudioContext later; or, for games that play <audio> elements, every
//    play, pause and seek, for media.py.
// 3. A plan runner (__D) plays a list of items once per game frame: core items here, game items from the director.
//    Markers (__D.mark) and capture windows go into take.json and drive the edit.
(() => {
  'use strict';
  const cfg = window.__trailerConfig, E = window.__trailerEval;

  // ---------- one timeline for every run
  // Under CPU load the page can boot a little earlier or later on the fake clock, which shifts every time the game
  // sees. Then floating-point ties (a timer set exactly 6 s ahead) break differently and runs drift apart. So the
  // page's clock is re-based on the first animation frame after this point: that frame reads 100 s, every run.
  const clockNow = performance.now.bind(performance), raf = window.requestAnimationFrame.bind(window);
  let shift = null;
  performance.now = () => clockNow() + (shift || 0);
  window.requestAnimationFrame = cb => raf(t => { if (shift === null) shift = 100000 - t; cb(t + shift); });
  const nowS = () => performance.now() / 1000;

  // ---------- CSS animations follow the fake clock
  window.__stepAnims = (dt) => {
    for (const a of document.getAnimations()) {
      if (a.__done) continue;
      if (a.__v === undefined) { a.__v = 0; try { a.pause(); } catch (e) {} }
      else a.__v += dt;
      let end = Infinity;
      try { end = a.effect.getComputedTiming().endTime; } catch (e) {}
      if (end !== Infinity && a.__v >= end) { a.__done = true; try { a.finish(); } catch (e) {} continue; }
      try { a.currentTime = a.__v; } catch (e) {}
    }
  };

  // ---------- sound log
  const LOG = window.__snd = [];
  if (cfg.audio.media) {
    // Games that play <audio> elements (new Audio(...).play()): log each element's plays, pauses, seeks, rate and
    // volume changes. media.py mixes the files back in from the log. Positions are tracked here, not read from the
    // element, because real playback doesn't follow the fake clock.
    const M = HTMLMediaElement.prototype, ids = new WeakMap();
    let nextId = 0;
    const id = el => { if (!ids.has(el)) ids.set(el, nextId++); return ids.get(el); };
    const src = el => { const u = el.currentSrc || el.src || el.getAttribute('src') || ''; try { return decodeURI(new URL(u, location.href).pathname); } catch (e) { return u; } };
    const rec = (el, ev, extra) => LOG.push(Object.assign({ t: nowS(), ev, id: id(el), src: src(el), v: +el.volume.toFixed(3), loop: el.loop, r: window.__rngN }, extra || {}));
    const play = M.play, pause = M.pause;
    M.play = function () { rec(this, 'play', { rate: this.playbackRate }); const p = play.apply(this, arguments); return p && p.catch ? p.catch(() => {}) : p; };
    M.pause = function () { rec(this, 'pause'); return pause.apply(this, arguments); };
    for (const [prop, ev] of [['currentTime', 'seek'], ['playbackRate', 'rate'], ['volume', 'vol'], ['src', 'srcset']]) {
      const d = Object.getOwnPropertyDescriptor(M, prop);
      Object.defineProperty(M, prop, { configurable: true, enumerable: d.enumerable, get: d.get,
        set(v) { d.set.call(this, v); rec(this, ev, { val: prop === 'src' ? src(this) : +v }); } });
    }
  } else {
    // Games with a sound object (CrackSound.crack()): every top-level call (a sound calling the object's own
    // helpers is one call), with the state flags at that moment and any stop handle a call returns
    const S = E(cfg.audio.object), stateKeys = cfg.audio.state || [];
    let depth = 0;
    for (const k of Object.keys(S)) {
      const f = S[k];
      if (typeof f !== 'function') continue;
      S[k] = function (...args) {
        const top = depth === 0;
        let id = -1;
        if (top) {
          const st = {}; for (const s of stateKeys) st[s] = S[s];
          id = LOG.length; LOG.push({ t: nowS(), m: k, a: args, s: st, r: window.__rngN });
        }
        depth++;
        let r;
        try { r = f.apply(this, args); } finally { depth--; }
        if (top && typeof r === 'function') { const rr = r; r = () => { LOG.push({ t: nowS(), stop: id }); return rr(); }; }
        return r;
      };
    }
  }

  // ---------- the plan runner
  const D = window.__D = {
    plan: [], i: -1, it: null, capture: false, done: false, marks: [], windows: [],
    items: {},             // director item types: name -> function (it, now)
    watch: [],             // run every frame, before anything else (markers for things that just happen)
    stage: [],             // run every frame while the plan runs, before the current item
    state: () => ({}),     // extra fields stored with every marker
    onItem: () => {},      // called when an item starts
    nowFrom: () => nowS(), // the time the director sees, from the hooked function's arguments
    start: () => { throw new Error('the director must set __D.start'); },
  };
  D.mark = (name, extra) => D.marks.push(Object.assign({ name, t: nowS() }, D.state(), extra || {}));
  D.fn = src => E('(function (now, D) { ' + src + '\n})');
  D.cond = src => D.fn('return (' + src + ');');
  // wrap game functions so calling them leaves a marker; `extra(args)` may add fields
  D.markCalls = (names, extra) => {
    for (const name of names) {
      const f = E(name);
      window.__trailerWrapped = function (...a) { D.mark(name + (typeof a[0] === 'string' ? ':' + a[0] : ''), extra ? extra(name, a) : null); return f.apply(this, a); };
      E(name + ' = window.__trailerWrapped');
    }
    delete window.__trailerWrapped;
  };

  const CORE = {
    start: (it) => { window.__trailerReseed(); D.start(); it.fin = true; },   // from here on every run repeats exactly
    capture: (it, now) => {
      D.capture = !!it.on; it.fin = true;
      if (it.on) D.windows.push([now, null]);
      else if (D.windows.length) D.windows[D.windows.length - 1][1] = now;
    },
    js: (it, now) => { D.fn(it.code)(now, D); it.fin = true; },
    mark: (it) => { it.fin = true; },
    end: (it) => { D.done = true; it.fin = true; },
    wait: (it, now) => { if ((it.until && it._until(now, D)) || (it.dur !== undefined && now - it.t0 >= it.dur)) it.fin = true; },
  };

  D.rng = [];
  D.tick = (now) => {
    D.rng.push([now, window.__rngN]);
    for (const f of D.watch) f(now);
    if (D.done) return;
    for (const f of D.stage) f(now);
    if (!D.it || D.it.fin) {
      D.i++;
      if (D.i >= D.plan.length) { D.done = true; D.mark('plan:end'); return; }
      D.it = Object.assign({}, D.plan[D.i]); D.it.t0 = now; D.it.k = 0;
      if (D.it.until) D.it._until = D.cond(D.it.until);
      D.onItem(D.it);
      if (D.it.name) D.mark(D.it.name);
    }
    const it = D.it, run = CORE[it.type] || D.items[it.type];
    if (run) run(it, now); else { console.error('trailer: unknown plan item ' + it.type); it.fin = true; }
  };

  // run the plan from the game's per-frame function, before the game's own logic
  window.__trailerTick = function (args) {
    try { D.tick(D.nowFrom(args)); } catch (e) { console.error('trailer director', e && e.stack || e); }
  };
  // hook "@frame": games whose loop only runs during play (or isn't reachable) get the plan from an animation frame
  // of its own instead, every frame from now on, title screens included
  if (cfg.hook === '@frame') { const loop = () => { window.__trailerTick([]); window.requestAnimationFrame(loop); }; window.requestAnimationFrame(loop); }
  else E('(() => { const f = ' + cfg.hook + '; ' + cfg.hook + ' = function () { window.__trailerTick(arguments); return f.apply(this, arguments); }; })()');
})();
