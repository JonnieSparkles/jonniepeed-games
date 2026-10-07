// In-page driver for tools/balance/run.py (SPEC-005). Game-agnostic: it plays one run at a time through the
// game's window.__balance adapter and window.__balanceBot brain, in chunks of fixed 1/60 s steps, and folds the
// event log into one plain record per run.
window.__balanceDriver = (function () {
  'use strict';
  var DT = 1 / 60, KEYS = ['by', 'cause', 'source', 'reason', 'kind', 'type', 'item'];
  var B, bot, cfg, buf, steps, rec, shopVisits;

  function bump(obj, key, n) { obj[key] = (obj[key] || 0) + n; }
  // Per wave: a count per event, amount sums, and breakdowns by the usual detail keys (cause, source, ...).
  function absorb(events) {
    events.forEach(function (e) {
      var w = rec.waves[e.wave] || (rec.waves[e.wave] = {});
      var amount = typeof e.amount === 'number' ? e.amount : typeof e.cost === 'number' ? e.cost : null; // purchases carry cost
      bump(w, e.ev, 1);
      if (amount !== null) bump(w, e.ev + '.amount', amount);
      KEYS.forEach(function (k) {
        if (typeof e[k] !== 'string') return;
        bump(w, e.ev + ':' + k + '=' + e[k], 1);
        if (amount !== null) bump(w, e.ev + '.amount:' + k + '=' + e[k], amount);
      });
      if (e.ev === 'game_over') rec.end = { wave: e.wave, score: e.score, cause: e.cause };
      else if (e.ev === 'shop_offer') rec.offers.push(e.items || (e.free || []).concat(e.premium || []));
      else if (e.ev === 'purchase') rec.purchases.push({ item: e.item, cost: e.cost, wave: e.wave });
    });
  }

  return {
    begin: function (c) {
      cfg = c; B = window.__balance; B.start(c.seed, c.options || {});
      bot = window.__balanceBot(c.profile, c.seed);
      buf = []; steps = 0; shopVisits = 0;
      rec = { seed: c.seed, skill: c.skill, waves: {}, offers: [], purchases: [], end: null };
    },
    // Plays up to maxSteps. The bot thinks every `think` steps and sees observations reaction_ms old;
    // shops are frozen, so shop choices use the current state.
    run: function (maxSteps) {
      var think = cfg.think || 2, lag = Math.round(cfg.profile.reaction_ms / 1000 / DT / think), st;
      for (var i = 0; i < maxSteps; i++) {
        st = B.status();
        if (st.over || st.t >= cfg.cap) break;
        if (st.mode === 'shop') {
          // A bot that never leaves the shop would freeze the clock; after a few tries, flag it and move on.
          if (++shopVisits > 20) { rec.stuck = true; break; }
          B.act(bot.shop(B.observe())); buf = [];
          continue;
        }
        shopVisits = 0;
        if (st.mode === 'play' && steps % think === 0) {
          buf.push(B.observe());
          if (buf.length > lag + 1) buf.shift();
          B.act(bot.decide(buf[0]));
        }
        B.step(DT); steps++;
        if (steps % 600 === 0) absorb(B.drain());
      }
      absorb(B.drain());
      st = B.status();
      return { done: !!(st.over || st.t >= cfg.cap || rec.stuck), t: st.t, wave: st.wave };
    },
    result: function () {
      var st = B.status();
      rec.wave = st.wave; rec.score = st.score; rec.t = Math.round(st.t * 10) / 10;
      rec.over = st.over; rec.timeout = !st.over && st.t >= cfg.cap;
      if (!rec.end && rec.over) rec.end = { wave: st.wave, score: st.score, cause: 'unknown' };
      return rec;
    }
  };
})();
