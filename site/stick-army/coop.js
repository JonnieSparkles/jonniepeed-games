// Stick Army co-op (docs/games/stick-army/coop.md): two players on one bunker over a room (docs/guides/05-rooms.md).
// An add-on: everything about playing together lives here, and game.js has only small hooks (search it for COOP).
// Take this file and those hooks out and the game is single player again.
//
// The host runs the game; the guest sends its aim and trigger and draws the host's field. The field is sent
// generally, not from a list: everything in S except LEAVE, matched entry by entry and sent only where it changed
// (Snap). Particles go once and the guest animates them itself; ink, sounds and voices travel as effects (fx).
window.StickArmyCoop = function (w) {
  'use strict';

  // ---------- the field, sent generally ----------
  // LEAVE: what of S never travels. parts: particles go once each, as they're born, and the guest animates them.
  var LEAVE = { parts: 1 };
  var EVERY = 1000 / 15;   // a snapshot about 15 times a second
  var DELAY = 120;         // the guest draws this far behind the newest snapshot, so it always has two to ease between

  // Numbers are rounded for the wire: two decimals under 10 (angles, timers, fractions), one above (positions).
  function round(v) {
    if (v === Math.floor(v)) return v;
    if (!isFinite(v)) return null;
    return Math.abs(v) < 10 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10;
  }
  function plain(v) { if (!v || typeof v !== 'object') return false; var p = Object.getPrototypeOf(v); return p === Object.prototype || p === null; }
  // A list of things (planes, troopers, bullets, labels): its entries are matched by id, or by a hidden tag.
  function things(a) { return Array.isArray(a) && a.length > 0 && a.every(plain); }
  function keyOf(e) { return e.id != null ? 'i' + e.id : '$' + e.$; }

  // The host's side: turns S into messages. clean() makes the drawable copy; diff() what changed since the last one.
  function Encoder() {
    var dict = {}, n = 0, fresh = [], prev, tags = new WeakMap(), tagN = 0;
    function k(name) { if (!(name in dict)) { dict[name] = (n++).toString(36); fresh.push(name); } return dict[name]; }
    function clean(v) {
      if (typeof v === 'number') return round(v);
      if (typeof v === 'string' || typeof v === 'boolean' || v === null) return v;
      if (Array.isArray(v)) {
        return v.map(function (e) {
          var c = clean(e);
          if (plain(c) && c.id == null) { var t = tags.get(e); if (!t) { t = ++tagN; tags.set(e, t); } c.$ = t; }
          return c === undefined ? null : c;
        });
      }
      if (plain(v)) { var o = {}; for (var key in v) { var c = clean(v[key]); if (c !== undefined) o[key] = c; } return o; }
      return undefined;   // functions, canvases and the like stay home
    }
    function full(v) {
      if (Array.isArray(v)) return v.map(full);
      if (plain(v)) { var o = {}; for (var key in v) o[k(key)] = full(v[key]); return o; }
      return v;
    }
    function diff(p, c) {
      if (!c || typeof c !== 'object') return p === c ? undefined : c;
      if (Array.isArray(c)) {
        if (things(c) && Array.isArray(p)) {
          var at = {}, same = c.length === p.length;
          p.forEach(function (e, i) { if (plain(e)) at[keyOf(e)] = i; });
          var out = c.map(function (e, j) {
            var i = at[keyOf(e)];
            if (i === undefined) { same = false; return full(e); }
            var d = diff(p[i], e);
            if (d !== undefined || i !== j) same = false;
            return d === undefined ? i : [i, d];
          });
          return same ? undefined : { '~': out };
        }
        if (Array.isArray(p) && p.length === c.length && c.every(function (e, i) { return diff(p[i], e) === undefined; })) return undefined;
        return full(c);
      }
      if (!plain(p)) return full(c);
      var o = {}, any = false, key, d;
      for (key in c) { d = diff(p[key], c[key]); if (d !== undefined) { o[k(key)] = d; any = true; } }
      for (key in p) if (!(key in c)) { o[k(key)] = { '-': 1 }; any = true; }
      return any ? o : undefined;
    }
    return {
      clean: clean,
      full: full,
      // Start over: the next message carries everything (a guest joining or coming back).
      reset: function () { dict = {}; n = 0; fresh = []; prev = undefined; },
      // The changes since the last call (the whole field after a reset), with the key names new since the last
      // message (k), for the guest's dictionary. Encode anything else for the same message (full) before this.
      next: function (cur) {
        var r = prev === undefined, d = r ? full(cur) : diff(prev, cur);
        var msg = { r: r ? 1 : 0, d: d, k: fresh };
        fresh = []; prev = cur;
        return msg;
      }
    };
  }

  // The guest's side: rebuilds each snapshot. Nothing is changed in place, so older snapshots stay as they were.
  function Decoder() {
    var names = [], state;
    function name(code) { return names[parseInt(code, 36)]; }
    function decode(v) {
      if (Array.isArray(v)) return v.map(decode);
      if (plain(v)) { var o = {}; for (var code in v) o[name(code)] = decode(v[code]); return o; }
      return v;
    }
    function patch(cur, d) {
      if (Array.isArray(d)) return decode(d);
      if (!plain(d)) return d;
      if ('~' in d) {
        return d['~'].map(function (e) { return typeof e === 'number' ? cur[e] : Array.isArray(e) ? patch(cur[e[0]], e[1]) : decode(e); });
      }
      if (!plain(cur)) return decode(d);
      var o = {}, key;
      for (key in cur) o[key] = cur[key];
      for (var code in d) {
        key = name(code);
        if (plain(d[code]) && '-' in d[code]) delete o[key];
        else o[key] = patch(cur[key], d[code]);
      }
      return o;
    }
    return {
      // Called with each message in order. Key names come first, so the message's other parts decode too.
      take: function (msg) {
        if (msg.r) { names = []; state = undefined; }
        names.push.apply(names, msg.k || []);
        state = msg.r ? decode(msg.d) : msg.d === undefined ? state : patch(state, msg.d);
        return state;
      },
      decode: decode
    };
  }

  // Eases between two snapshots: numbers in step, the newer one for everything else. Things are matched by id or tag,
  // so a plane eases from where it was; anything new appears as it is. Always a fresh tree: the game may write to it.
  function lerp(a, b, t) {
    if (typeof b === 'number') return typeof a === 'number' ? a + (b - a) * t : b;
    if (Array.isArray(b)) {
      if (things(b) && Array.isArray(a)) {
        var at = {};
        a.forEach(function (e) { if (plain(e)) at[keyOf(e)] = e; });
        return b.map(function (e) { return lerp(at[keyOf(e)], e, t); });
      }
      return b.map(function (e, i) { return lerp(Array.isArray(a) ? a[i] : undefined, e, t); });
    }
    if (plain(b)) {
      var o = {}, same = plain(a);
      for (var key in b) o[key] = lerp(same ? a[key] : undefined, b[key], t);
      return o;
    }
    return b;
  }

  // ---------- pieces ----------
  // A room message is at most 16 KB. The whole field (a guest joining a busy page) can be more, so a long message goes
  // in pieces ({ t: 'pc', id, i, n, s }) and is put back together on arrival. Messages arrive in order, so pieces do.
  var PIECE = 7000, pieceN = 0;   // characters of JSON a piece; escaped inside a piece, they stay under 16 KB
  function pieces(msg) {
    var text = JSON.stringify(msg);
    if (text.length <= PIECE) return [msg];
    var out = [], id = ++pieceN, n = Math.ceil(text.length / PIECE);
    for (var i = 0; i < n; i++) out.push({ t: 'pc', id: id, i: i, n: n, s: text.slice(i * PIECE, (i + 1) * PIECE) });
    return out;
  }
  function Joiner() {
    var got = null;
    return function (msg) {
      if (msg.t !== 'pc') return msg;
      if (!got || got.id !== msg.id || msg.i === 0) got = { id: msg.id, parts: [] };
      got.parts[msg.i] = msg.s;
      if (got.parts.length === msg.n && msg.i === msg.n - 1) { var text = got.parts.join(''); got = null; return JSON.parse(text); }
      return null;
    };
  }

  // ---------- the host: sends the field ----------
  // fx: effects that don't live in S, noted where they happen (game.js hooks addDecal, washDecals and the ink cleared
  // for a new run; sounds and voices are caught here): ['d', decal], ['w', fade], ['x'] (clear the ink), ['s', sound],
  // ['v', [say's arguments]].
  var host = null, QUIET = { click: 1, press: 1 };
  function startHost(send) {
    host = { enc: Encoder(), seen: new WeakSet(), fx: [], last: -1e9, send: send, fresh: true };
    // Every part already on the page stays here; only new ones travel.
    w.S.parts.forEach(function (q) { host.seen.add(q); });
    catchSound();
  }
  function stopHost() { host = null; }
  // A guest joining or coming back gets the whole field next time.
  function resend() { if (host) host.fresh = true; }
  function fx(type, data) { if (host) host.fx.push(data === undefined ? [type] : [type, data]); }
  // Sounds and voices played on the host go to the guest too (menu clicks stay home). Wrapped once per sound object.
  function catchSound() {
    var snd = w.sound;
    if (!snd || snd.coopCaught) return;
    var play = snd.play, say = snd.say;
    snd.play = function (name) { if (host && !QUIET[name]) fx('s', name); return play.apply(snd, arguments); };
    if (say) snd.say = function () { if (host) fx('v', Array.prototype.slice.call(arguments)); return say.apply(snd, arguments); };
    snd.coopCaught = true;
  }
  // The field as it stands, in a message. Called every frame; sends about EVERY ms (force: now).
  function hostTick(now, force) {
    if (!host || (!force && now - host.last < EVERY)) return null;
    host.last = now;
    var S = w.S, enc = host.enc, pick = {}, key;
    if (host.fresh) { enc.reset(); host.fresh = false; }
    for (key in S) if (!LEAVE[key]) pick[key] = S[key];
    pick._tramps = w.TRAMPS.map(function (t) { return t.dip; });
    var born = S.parts.filter(function (q) { return !host.seen.has(q); });
    born.forEach(function (q) { host.seen.add(q); });
    var b = born.length ? enc.full(enc.clean(born)) : null;
    var e = host.fx.length ? host.fx.map(function (f) { return f.length > 1 ? [f[0], enc.full(enc.clean(f[1]))] : f; }) : null;
    host.fx = [];
    var msg = enc.next(enc.clean(pick));
    if (msg.d === undefined && !b && !e && !msg.r && now - (host.sent || 0) < 1000) return null;   // nothing new; still a beat every second
    msg.t = 'f'; msg.h = Math.round(now);
    if (b) msg.b = b;
    if (e) msg.e = e;
    if (!msg.k.length) delete msg.k;
    host.sent = now;
    if (host.send) pieces(msg).forEach(host.send);
    return msg;
  }

  // The guest's aim and trigger, on the host: its barrel (the second) turns and fires as told.
  function hostInput(msg) {
    var t = w.S.turrets && w.S.turrets[1];
    if (!t || msg.t !== 'in') return;
    if (typeof msg.a === 'number' && isFinite(msg.a)) t.aim = Math.max(w.AIM_MIN, Math.min(w.AIM_MAX, msg.a));
    t.firing = !!msg.f;
  }

  // ---------- the guest: draws the host's field ----------
  // buf: the latest snapshots with the host's clock (h). The guest draws DELAY behind the newest, easing between the
  // two around that moment. Effects and new particles wait in `due` until the drawing reaches their moment.
  var guest = null;
  function startGuest() { guest = { dec: Decoder(), buf: [], due: [], off: null, parts: [], aim: null, firing: false }; }
  function stopGuest() { guest = null; }
  function receive(msg, now) {
    if (!guest || msg.t !== 'f') return;
    var dec = guest.dec, state = dec.take(msg), o = msg.h - now;
    // The host's clock against ours: the quickest message sets it, easing down slowly so drift is followed.
    guest.off = guest.off == null || o > guest.off ? o : guest.off - 0.5;
    if (msg.r) guest.buf = [];
    guest.buf.push({ h: msg.h, s: state });
    if (guest.buf.length > 8) guest.buf.shift();
    if (msg.b || msg.e) guest.due.push({ h: msg.h, b: msg.b ? dec.decode(msg.b) : null, e: msg.e ? msg.e.map(function (f) { return f.length > 1 ? [f[0], dec.decode(f[1])] : f; }) : null });
  }
  function play(item) {
    if (item.b) guest.parts.push.apply(guest.parts, item.b);
    (item.e || []).forEach(function (f) {
      var snd = w.sound;
      if (f[0] === 'd') w.addDecal(f[1]);
      else if (f[0] === 'w') w.washDecals(f[1]);
      else if (f[0] === 'x') w.clearInk();
      else if (f[0] === 's') snd.play(f[1]);
      else if (f[0] === 'v' && snd.say) snd.say.apply(snd, f[1]);
    });
  }
  // One frame on the guest, instead of update(): the field at the drawing's moment, this device's barrel where its
  // player has it, and the particles moving here. False until the first snapshot arrives.
  function guestFrame(dt, now) {
    if (!guest || !guest.buf.length) return false;
    var S = w.S, me = w.me, keys = w.keys, buf = guest.buf;
    // This device's barrel answers at once; the host hears about it (and the next snapshot agrees).
    var mine = S.turrets && S.turrets[me];
    if (mine) { guest.aim = mine.aim; guest.firing = !!mine.firing; }
    if (guest.aim != null) {
      if (keys.left) guest.aim = Math.max(w.AIM_MIN, guest.aim - 2.3 * dt);
      if (keys.right) guest.aim = Math.min(w.AIM_MAX, guest.aim + 2.3 * dt);
    }
    var at = now + guest.off - DELAY;
    while (guest.due.length && guest.due[0].h <= at) play(guest.due.shift());
    var view, j = buf.length - 1;
    while (j > 0 && buf[j - 1].h > at) j--;
    // j: the first snapshot at or after the drawing's moment (or the oldest, or the newest).
    if (j === 0 || at >= buf[buf.length - 1].h) view = lerp(null, buf[at >= buf[buf.length - 1].h ? buf.length - 1 : 0].s, 0);
    else view = lerp(buf[j - 1].s, buf[j].s, Math.max(0, Math.min(1, (at - buf[j - 1].h) / Math.max(1, buf[j].h - buf[j - 1].h))));
    view.parts = guest.parts;
    if (view.turrets && view.turrets[me] && guest.aim != null) { view.turrets[me].aim = guest.aim; view.turrets[me].firing = guest.firing; }
    (view._tramps || []).forEach(function (dip, i) { if (w.TRAMPS[i]) w.TRAMPS[i].dip = dip; });
    w.setState(view);
    w.resizeMats();
    // Particles move here. What else updateParts touches (the labels, the tag counter's pulse) stays the host's.
    var texts = view.texts, pulse = view.tagPulse;
    view.texts = [];
    w.updateParts(dt);
    guest.parts = w.S.parts;   // updateParts keeps the live ones
    w.S.texts = texts; w.S.tagPulse = pulse;
    if (view.mode === 'play') w.fadeInk(dt);
    return true;
  }
  // What the guest sends: its barrel's aim and trigger.
  function guestInput() { return guest && guest.aim != null ? { t: 'in', a: Math.round(guest.aim * 1000) / 1000, f: guest.firing || w.keys.fire ? 1 : 0 } : null; }

  return {
    Encoder: Encoder, Decoder: Decoder, lerp: lerp, LEAVE: LEAVE, EVERY: EVERY, DELAY: DELAY, pieces: pieces, Joiner: Joiner,
    startHost: startHost, stopHost: stopHost, resend: resend, fx: fx, hostTick: hostTick, hostInput: hostInput,
    startGuest: startGuest, stopGuest: stopGuest, receive: receive, guestFrame: guestFrame, guestInput: guestInput,
    get host() { return !!host; }, get guest() { return !!guest; }
  };
};
