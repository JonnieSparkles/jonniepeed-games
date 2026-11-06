// Unruggabull II's trailer director (the full trailer, tools/trailer/make.py; the teaser is film.py). Evaluated in
// game.js's scope through trailer.json's bridge, as the balance bots get, so it reads R, bull and floor and calls the
// game's own functions.
//
// The game's expert balance bot plays every take (tests/unruggabull-ii/bot.js through the balance adapter balance.js;
// trailer.json "scripts"), live, one think a drawn frame, seeing what was there its reaction time ago. Later moments
// (SHRED-O, the roof's rounds) are reached off screen: `ff` plays on in fixed 1/60 s steps inside a frame, silently,
// and hands back to the page's own loop (the guide's staging rule: nothing staged is seen).
//
// The trailer lays the game's music in itself (music.py), so the music bus is cut from every take; the effects and
// voices (his chip voice, p(Loom)'s) play as in the game.
//
// Plan items for takes.json:
//   (start)  with D.opts = {stage, mode, hearts, from, fight, destination} set by a `js` item first: a fresh run of
//            that stage (the adapter's start: no story, no card), the bot playing
//   ff       {until, max}   play on off screen until `until` (a condition in the game's scope) holds
// Staging, from `js` items: D.minHearts (his hearts never drop below it, so a take isn't lost to a rugging).
(() => {
  const D = window.__D, SC = window.__trailerScripts;
  const PROFILE = JSON.parse(SC.profiles).expert, DT = 1 / 60;
  const LAG = Math.round(PROFILE.reaction_ms / 1000 * 30);

  // ---------- sound: the game's own context (audio.live), the music bus cut; quiet while playing on off screen
  const AC0 = window.AudioContext;
  let gains = null;
  window.AudioContext = window.webkitAudioContext = function () {
    const c = new AC0();
    const cg = c.createGain.bind(c);
    c.createGain = function () { const g = cg(); if (gains) gains.push(g); return g; };
    return c;
  };
  gains = [];
  Snd.init();
  // init makes the master, then the music bus: every track plays through the music bus
  if (gains[1]) gains[1].disconnect();
  gains = null;
  let quiet = false;
  for (const k of ['play', 'say', 'voice', 'loomVoice', 'ui', 'roofCue', 'riser']) {
    const f = Snd[k]; if (typeof f !== 'function') continue;
    Snd[k] = function () { if (!quiet) return f.apply(this, arguments); };
  }

  // ---------- the bot, through the balance adapter (it stops the page's loop for its own runs: put it back)
  eval(SC.bot);
  eval(SC.balance);
  looping = true;
  const B = window.__balance;

  // ---------- markers: the game's own events (the adapter's emit hook), and what each stage is doing
  const SKIP = new Set(['roof_step', 'td_step', 'arena_spawn', 'td_spawn', 'roof_pull', 'roof_line', 'roof_round_time']);
  function hook() {
    emitHook = (type, data) => {
      if (quiet || SKIP.has(type)) return;
      const sub = data && (data.kind || data.by || data.cause || data.state || data.item);
      D.mark('ev:' + type + (sub ? ':' + sub : ''));
    };
  }
  D.state = () => R ? { stage: R.stage, phase: R.phase, hearts: R.hearts, souls: R.souls } : {};
  const prev = {};
  D.watch.push(() => {
    if (!R || quiet) return;
    const now = {
      phase: R.phase, beat: R.beat, event: R.event ? R.event.kind : null, boss: R.boss && R.boss.st,
      roof: R.roof && R.roof.state, ride: R.elevator && (R.elevator.fight ? 'fight' : 'quiet'), f48: R.f48 && R.f48.st,
      talk: R.talk ? R.talk.text : null
    };
    for (const k in now) if (now[k] !== prev[k]) { if (now[k] != null) D.mark(k + ':' + now[k]); prev[k] = now[k]; }
  });

  // ---------- staging
  D.minHearts = 0;
  const guard = () => { if (D.minHearts && R && R.hearts < D.minHearts) R.hearts = D.minHearts; };

  // ---------- playing: the bot thinks once a drawn frame, seeing what was there LAG frames ago
  let bot = null, buf = [], on = false;
  function think() {
    if (state !== 'play') return;
    buf.push(B.observe()); if (buf.length > LAG + 1) buf.shift();
    B.act(bot.decide(buf[0]));
  }
  D.stage.push(() => { guard(); if (on) think(); });

  D.start = () => {
    const o = D.opts || {}, run = o.run || 7;
    bot = window.__balanceBot(PROFILE, run); buf = [];
    B.start(run, Object.assign({ fast: false }, o), PROFILE);
    hook(); on = true;
  };

  // ---------- off screen: play on in fixed steps (the adapter's own step, as the balance runs), silently
  function ff(it) {
    quiet = true;
    const max = (it.max || 300) / DT;
    let i = 0;
    for (; i < max; i++) {
      if (it._c(0, D)) break;
      if (i % 2 === 0) { buf.push(B.observe()); if (buf.length > LAG + 1) buf.shift(); B.act(bot.decide(buf[0])); }
      B.step(DT); guard();
      if (state !== 'play' || R.phase === 'dead') { quiet = false; throw new Error('ff: the run ended (' + state + ', ' + R.phase + ')'); }
    }
    quiet = false;
    if (i >= max) throw new Error('ff: ' + it.until + ' never held');
    D.mark('ff:' + (it.label || 'done'));
    it.fin = true;
  }
  D.items.ff = (it) => { it._c = D.cond(it.until); ff(it); };
})();
