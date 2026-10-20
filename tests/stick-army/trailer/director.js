// Stick Army's trailer director. Evaluated in game.js's scope (trailer.json's bridge, as the balance bots get), so it
// reads S and calls the game's own functions.
//
// The game's expert balance bot plays every take (tests/stick-army/bot.js through the balance adapter balance.js;
// trailer.json "scripts"), two of them in co-op, one on each barrel. Later waves are reached off screen: `ff` plays
// the run on in fixed steps inside a frame or two, silently, with the wall held up, then hands back to the page's own
// loop at the wave's start (the guide's staging rule: nothing staged is seen).
//
// The trailer has its own music, so the game's (the title's bugle march, the wave march, the Dreadnought's) is
// silenced at its one bus; the effects and voices play as in the game.
//
// Plan items for takes.json:
//   ff     {wave, until, shop}   play on off screen until wave `wave` has started (and `until`, a condition, holds);
//                         with `shop`, until the shop after wave `wave` opens. Every shop passed leaves a marker.
//   click  {sel | text}    click an element, by selector or by its text
//   room   {}              the co-op room, faked (there's no network): Play with a friend opens it, with no one there
//   join   {}              the friend arrives in the faked room
//   pick   {id}            with D.manualShop, tap a shop row (a supply or a hire) by its item id
//   go     {}              the shop's continue button
// Before `start`, a `js` item sets D.opts: {run: the run's seed, coop: two barrels, button: start from this button
// instead of the adapter}.
(() => {
  const D = window.__D, SC = window.__trailerScripts;
  const PROFILE = JSON.parse(SC.profiles).expert, LAG = 4, DT = 1 / 60;

  // ---------- the bot, through the balance adapter (it stops the page's loop and sound for its own runs: put them back)
  const L = loop, SND = sound;
  eval(SC.bot);
  eval(SC.balance);
  loop = L; sound = SND;
  const B = window.__balance;

  // ---------- sound: quiet while playing on off screen; the game's music silenced for good
  let quiet = false, drums = null, gains = null;
  const AC0 = window.AudioContext;
  window.AudioContext = window.webkitAudioContext = function () {
    const c = new AC0();
    if (!c.__trailer) {
      c.__trailer = true;
      const cg = c.createGain.bind(c);
      c.createGain = function () { const g = cg(); if (gains) gains.push(g); return g; };
    }
    return c;
  };
  for (const k of ['play', 'say']) { const f = SND[k]; SND[k] = function () { if (!quiet) return f.apply(this, arguments); }; }
  const amb0 = SND.ambience;
  SND.ambience = function () {
    if (quiet) return;
    // The ambience's first call with sound on builds its bus: the bus, then the music's gain (all music goes there),
    // then the propeller drones'. The music's gain is the second made.
    if (!drums) gains = [];
    const r = amb0.apply(this, arguments);
    if (!drums && gains.length >= 2) { drums = gains[1]; drums.gain.value = 0; }
    gains = null;
    return r;
  };

  // ---------- markers
  const SKIP = new Set(['kill', 'coins', 'trooper_spawn', 'wall_damage', 'wall_repair', 'bomb_dropped', 'bomb_intercepted', 'land', 'splat', 'armor_hit']);
  function hook() {
    emitHook = (type, data) => {
      if (quiet || SKIP.has(type)) return;   // nothing off screen: the cut looks for what was filmed
      if (type === 'wave_start') D.mark('wave:' + S.wave);
      const sub = data && (type === 'chute_pop' ? (data.overMat ? 'mat' : 'air') : data.kind || data.by);
      D.mark('ev:' + type + (sub ? ':' + sub : ''));
    };
  }
  D.state = () => ({ wave: S.wave, mode: S.mode });
  hook();   // the title's demo too
  // The Dreadnought coming: spawned (off the page, rumbling), its name across the page, its bow on the page.
  let dread = null;
  D.watch.push(() => {
    const p = S.planes && S.planes.find(q => q.kind === 'dread');
    if (!p) return;
    if (p !== dread) { dread = p; p.__m = {}; D.mark('dread:spawn'); }
    const m = p.__m;
    if (!m.named && p.phase === 'arrive' && !(p.wait > 0)) { m.named = true; D.mark('dread:named'); }
    if (p.phase === 'arrive' && !(p.wait > 0)) D.mark('dread:pos', { x: +p.x.toFixed(1), y: +p.y.toFixed(1), dir: p.dir, hw: p.hw, hh: p.hh });
    const bow = p.x + p.dir * p.hw;
    if (!m.in && (p.dir > 0 ? bow > 0 : bow < W)) { m.in = true; D.mark('dread:in'); }
  });

  // ---------- playing
  let bot = null, bot2 = null, buf = [], buf2 = [], on = false;
  // The second barrel (co-op's guest), as the adapter's second bot drives it. In the faked room its aim and trigger
  // reach the host as the friend's messages, the way a real friend's do (a host lets go of a silent friend's trigger).
  const g2 = { aim: 0, fire: false };
  function act2(a) {
    const t = S.turrets[1];
    if (!a || !t) return;
    if (a.aimAt) { let ang = Math.atan2(a.aimAt.y - TUR.y, a.aimAt.x - t.x); if (ang > Math.PI / 2) ang -= Math.PI * 2; g2.aim = clamp(ang, AIM_MIN, AIM_MAX); }
    if ('fire' in a) g2.fire = !!a.fire;
    if (room) room.fire('message', { t: 'in', a: Math.round(g2.aim * 1000) / 1000, d: g2.fire ? 1 : 0 }, 2);
    else { t.aim = g2.aim; t.firing = g2.fire; }
    if (a.strike) callStrike();
    if (a.fighter) callFighter();
  }
  function think() {
    if (S.mode === 'play') {
      buf.push(B.observe()); if (buf.length > LAG + 1) buf.shift();
      B.act(bot.decide(buf[0]));
      if (bot2 && S.turrets[1]) { buf2.push(B.observe(1)); if (buf2.length > LAG + 1) buf2.shift(); act2(bot2.decide(buf2[0])); }
    } else if (S.mode === 'shop' && !D.manualShop) {
      buf = []; buf2 = [];
      B.act(bot.shop(B.observe()));   // the adapter shops for co-op's second bot too, and continues
    }
  }
  // Live: the bots think every frame, seeing what was there LAG frames ago (the expert's reaction time).
  D.stage.push(() => { if (on) think(); });

  D.start = () => {
    const o = D.opts || {}, run = o.run || 7;
    bot = window.__balanceBot(PROFILE, run); buf = []; buf2 = [];
    if (o.button) document.querySelector(o.button).click();   // the player's own Start
    else B.start(run, { fast: false, coop: o.coop ? '1' : '0' }, PROFILE);
    bot2 = S.players && S.players.length > 1 ? window.__balanceBot(PROFILE, (run ^ 0x2b7e1516) >>> 0) : null;
    hook(); on = true;
  };

  // ---------- off screen: play on in fixed steps (the adapter's step, as the balance runs), silently
  function ff(it) {
    quiet = true;
    let shops = 0;
    for (let i = 0; i < 3000; i++) {
      if (it.shop ? S.wave >= it.wave && S.mode === 'shop' : S.wave >= it.wave && S.mode === 'play' && (!it._c || it._c(0, D))) { it.fin = true; break; }
      if (S.mode === 'shop') {
        // every shop passed, with what it offered (shops are seeded, so a take can be pointed at the one it wants)
        if (shops === 0) D.mark('shop:' + S.wave, { items: S.shop.items.map(q => q.id), tags: tagsOf(0), owned: Object.keys(S.mods).filter(k => S.mods[k] === true) });
        if (++shops > 20) throw new Error('ff: stuck in the shop');
        buf = []; B.act(bot.shop(B.observe())); continue;
      }
      shops = 0;
      if (S.mode === 'play' && i % 2 === 0) {
        buf.push(B.observe()); if (buf.length > LAG + 1) buf.shift();
        B.act(bot.decide(buf[0]));
      }
      B.step(DT);
      if (S.wallHP < S.mods.maxHP * 0.7) S.wallHP = S.mods.maxHP * 0.7;   // held up off screen
      if (S.mode !== 'play' && S.mode !== 'shop') throw new Error('ff: the run ended (' + S.mode + ')');
    }
    quiet = false; buf = []; buf2 = [];
  }

  // ---------- the co-op room, faked: no network here, so the link card is filmed with a room that answers locally
  let room = null;
  function fakeRoom() {
    const h = {};
    room = { code: 'k7qf2m9xbt4w', link: 'https://jonniepeed.games/stick-army/#k7qf2m9xbt4w', others: [], seat: 1, status: 'connected',
      on: (ev, f) => { h[ev] = f; }, send: () => true, sendTo: () => true, leave: () => {}, fire: (ev, a) => h[ev] && h[ev](a) };
    return room;
  }

  D.items.ff = (it) => { if (it.until && !it._c) it._c = D.cond(it.until); ff(it); };
  D.items.click = (it) => {
    const el = it.sel ? document.querySelector(it.sel) : [...document.querySelectorAll('button')].find(b => b.textContent.trim() === it.text && b.offsetParent);
    if (!el) throw new Error('click: nothing matches ' + (it.sel || it.text));
    el.click(); it.fin = true;
  };
  // The shop by hand (D.manualShop): a supply or a hire tapped through its own button, scrolled into view first as a
  // finger would; `go` taps the continue button.
  D.items.pick = (it) => {
    const el = document.querySelector('#shopScreen [data-item="' + it.id + '"]');
    if (!el) throw new Error('pick: ' + it.id + ' is not in this shop');
    el.scrollIntoView({ block: 'center' }); el.click(); D.mark('pick:' + it.id); it.fin = true;
  };
  D.items.go = (it) => { document.getElementById('continueBtn').click(); D.mark('go'); it.fin = true; };
  D.items.room = (it) => { Rooms.open = fakeRoom; it.fin = true; };
  D.items.ready = (it) => { room.fire('ready'); it.fin = true; };
  D.items.join = (it) => { room.others = [{ seat: 2 }]; room.fire('join', 2); it.fin = true; };
})();
