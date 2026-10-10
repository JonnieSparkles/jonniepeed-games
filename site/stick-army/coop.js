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
  // ['v', [say's arguments]]. A full resend starts with ['k', every mark on the page], so a guest joining or coming back
  // gets the page's ink too.
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
    if (host.fresh) {
      enc.reset(); host.fresh = false;
      // Marks, washes and clears since the last message are already in the history this replaces them with.
      host.fx = host.fx.filter(function (f) { return f[0] !== 'd' && f[0] !== 'w' && f[0] !== 'x'; });
      host.fx.unshift(['k', w.decals().slice()]);
    }
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
    msg.n = host.seq = (msg.r ? 0 : host.seq) + 1;
    if (host.send) pieces(msg).forEach(host.send);
    return msg;
  }

  // The guest's aim and trigger, on the host: its barrel (the second) turns and fires as told.
  function hostInput(msg) {
    var t = w.S.turrets && w.S.turrets[1];
    if (!t || msg.t !== 'in') return;
    if (typeof msg.a === 'number' && isFinite(msg.a)) t.aim = Math.max(w.AIM_MIN, Math.min(w.AIM_MAX, msg.a));
    t.firing = !!msg.d;
  }

  // ---------- the guest: draws the host's field ----------
  // buf: the latest snapshots with the host's clock (h). The guest draws DELAY behind the newest, easing between the
  // two around that moment. Effects and new particles wait in `due` until the drawing reaches their moment.
  var guest = null;
  function startGuest() { guest = { dec: Decoder(), buf: [], due: [], off: null, parts: [], aim: null, firing: false, n: 0, lost: false }; }
  function stopGuest() { guest = null; }
  // False when a message was missed (a gap in n), or didn't fit: the guest then needs the whole field again (resync).
  function receive(msg, now) {
    if (!guest || msg.t !== 'f') return true;
    if (!msg.r && (guest.lost || (msg.n != null && msg.n !== guest.n + 1))) { guest.lost = true; return false; }
    var dec = guest.dec, state, o = msg.h - now;
    try { state = dec.take(msg); } catch (err) { guest.lost = true; return false; }
    guest.n = msg.n; guest.lost = false;
    // The host's clock against ours: the quickest message sets it, easing down slowly so drift is followed.
    guest.off = guest.off == null || o > guest.off ? o : guest.off - 0.5;
    if (msg.r) guest.buf = [];
    guest.buf.push({ h: msg.h, s: state });
    if (guest.buf.length > 8) guest.buf.shift();
    if (msg.b || msg.e) guest.due.push({ h: msg.h, b: msg.b ? dec.decode(msg.b) : null, e: msg.e ? msg.e.map(function (f) { return f.length > 1 ? [f[0], dec.decode(f[1])] : f; }) : null });
    return true;
  }
  function play(item) {
    if (item.b) guest.parts.push.apply(guest.parts, item.b);
    (item.e || []).forEach(function (f) {
      var snd = w.sound;
      if (f[0] === 'd') w.addDecal(f[1]);
      else if (f[0] === 'w') w.washDecals(f[1]);
      else if (f[0] === 'x') w.clearInk();
      else if (f[0] === 'k') { w.clearInk(); (f[1] || []).forEach(function (d) { w.addDecal(d); }); }
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
    // The shop's items travel as data; the guest's shop works with its own copies of them (same code, same list).
    if (view.shop) ['items', 'hire'].forEach(function (k) { view.shop[k] = (view.shop[k] || []).map(function (e) { return w.ITEMS.find(function (q) { return q.id === e.id; }) || e; }); });
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
    guestScreens(view.mode);
    guestShop(view);
    return true;
  }
  // What the guest sends: its barrel's aim (a) and whether the trigger is down (d). (The room adds f, the sender.)
  function guestInput() { return guest && guest.aim != null ? { t: 'in', a: Math.round(guest.aim * 1000) / 1000, d: guest.firing || w.keys.fire ? 1 : 0 } : null; }

  // ---------- the match: a room (site/assets/rooms.js, docs/guides/05-rooms.md) ----------
  // Seat 1 opened the match and runs the game; seat 2 is the guest. "Play with a friend" on the title asks for the
  // rooms secret, opens a room and shows the link; a friend opening the link waits on the title until the host taps
  // Start. If the guest drops, its barrel goes quiet and play goes on; if the host drops, the guest waits AWAY_END
  // seconds for it to come back, then the match is over.
  // TIMING.AWAY_END: seconds a guest waits for its host before calling the match over (tests shorten it).
  var GAME = 'stick-army', HOST_SEAT = 1, TIMING = { AWAY_END: 60 };
  // The guest sends its aim when it changes, at most every IN_EVERY ms, and at least every IN_BEAT ms; the host lets
  // go of the guest's trigger after IN_LOST ms without word (a phone gone to sleep mid-burst).
  var IN_EVERY = 50, IN_BEAT = 400, IN_LOST = 1200;
  var DECOYS = ['Pickle', 'Waffle', 'Taco', 'Pretzel', 'Dumpling', 'Burrito', 'Noodle', 'Nugget', 'Pancake', 'Crouton', 'Biscuit', 'Tater tot'];
  var room = null, role = null, friend = false, started = false, awaySince = 0, joinPieces = Joiner();
  var lastIn = 0, sentIn = null, sentInAt = 0, askedAt = -1e9, shownMode = null, flashT = 0, ui = null, netPaused = false, netResumed = false;
  var store = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  function now() { return performance.now(); }
  function ask(type, k) { if (room) room.send(k === undefined ? { t: type } : { t: type, k: k }); }
  function hostSend(m) { if (!room || !room.send(m)) resend(); }   // dropped while reconnecting: everything next time

  var CSS = [
    '.t-chips.coop-four { gap: 6px; }',
    '.t-chips.coop-four .t-chip { padding: 2px 7px; font-size: 14.5px; white-space: nowrap; }',
    '.coop-card .btn { font-size: 24px; min-height: 46px; padding: 4px 18px 6px; }',
    '.coop-card .btn:disabled { opacity: .45; cursor: default; }',
    '.coop-card .nope { color: var(--enemy); }',
    '.coop-link { margin: 0; font-size: 15px; line-height: 1.2; color: var(--ink-soft); word-break: break-all; user-select: all; }',
    '.coop-table { width: 100%; border-collapse: collapse; font-size: 19px; }',
    '.coop-table th { font-weight: 400; text-align: right; }',
    '.coop-table th.blue { color: var(--ally); } .coop-table th.red { color: var(--enemy); }',
    '.coop-table td { color: var(--ink-soft); padding: 1px 0; } .coop-table td.n { color: var(--ink); text-align: right; font-variant-numeric: tabular-nums; }',
    '.coop-ready { margin: 0 8px 0 auto; align-self: center; font-size: 17px; color: var(--ink-soft); }',
    '.coop-status { position: absolute; left: 50%; top: 106px; transform: translateX(-50%) rotate(-1deg); margin: 0; padding: 2px 10px 3px; font: 17px var(--font-hand);',
    '  color: var(--ink); background: var(--paper); border: 2px solid var(--ink); border-radius: 12px 5px 12px 5px; pointer-events: none; white-space: nowrap; }'
  ].join('\n');
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function buildUI() {
    var chips = document.querySelector('.t-chips'), stage = document.getElementById('stage');
    if (ui || !chips || !stage) return;
    var style = el('style'); style.textContent = CSS; document.head.appendChild(style);
    var chip = el('button', 't-chip', 'Play with a friend'); chip.type = 'button'; chip.id = 'coopBtn';
    chips.appendChild(chip); chips.classList.add('coop-four');
    var overlay = el('div', 'overlay'); overlay.id = 'coopScreen'; overlay.hidden = true;
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    var card = el('div', 'card coop-card'); overlay.appendChild(card); stage.appendChild(overlay);
    var status = el('p', 'coop-status'); status.id = 'coopStatus'; status.hidden = true; status.setAttribute('role', 'status'); stage.appendChild(status);
    ui = { chip: chip, overlay: overlay, card: card, status: status };
    chip.addEventListener('click', function () { if (w.sound.init) w.sound.init(); askSecret(false); });
  }
  // A card: a title (its second part in blue pen), lines, and buttons ({ label, fn, ghost, off }).
  function showCard(title, lines, buttons, kind) {
    if (!ui) return;
    var c = ui.card; c.textContent = '';
    var h = el('h2', null, title[0]); if (title[1]) h.appendChild(el('span', 'pen', title[1])); c.appendChild(h);
    (lines || []).forEach(function (l) { if (!l) return; c.appendChild(typeof l === 'string' ? el('p', 'tag', l) : l); });
    var row = el('div', 'row');
    (buttons || []).forEach(function (b) {
      var btn = el('button', 'btn' + (b.ghost ? ' ghost' : ''), b.label); btn.type = 'button'; btn.disabled = !!b.off;
      if (b.id) btn.id = b.id;
      btn.addEventListener('click', function () { if (w.sound.play) w.sound.play('click'); b.fn(); });
      row.appendChild(btn);
    });
    if (row.children.length) c.appendChild(row);
    ui.overlay.hidden = false; ui.kind = kind || null;
    var first = row.querySelector('button:not(:disabled)'); if (first) first.focus({ preventScroll: true });
  }
  function hideCard() { if (ui) { ui.overlay.hidden = true; ui.kind = null; } }
  function status(text) { if (ui) { ui.status.textContent = text || ''; ui.status.hidden = !text; } }
  function forget() { history.replaceState(null, '', location.pathname + location.search); }

  // ---------- starting a match (the host) ----------
  function askSecret(wrong) {
    leaveRoom();
    var line = el('p', 'tag' + (wrong ? ' nope' : ''), wrong ? "Nope. That's not the secret." : 'Starting a match takes the secret word.');
    var pool = DECOYS.slice(), picks = ['Meatball'];
    while (picks.length < 3) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    picks.sort(function () { return Math.random() - 0.5; });
    showCard(['Play with a ', 'friend'], [line], picks.map(function (word) { return { label: word, ghost: true, fn: function () { openRoom(word); } }; })
      .concat([{ label: 'Cancel', ghost: true, fn: cancel }]), 'secret');
  }
  function openRoom(word) {
    showCard(['Play with a ', 'friend'], ['Checking the secret…'], [], 'checking');
    role = 'host';
    var r = Rooms.open({ game: GAME, max: 2, secret: word.toLowerCase() });
    store.set('stickarmy.coop.host.' + r.code, '1');
    use(r);
  }
  function invite() {
    if (role !== 'host' || started) return;
    var link = el('p', 'coop-link', room ? room.link : '');
    var share = navigator.share ? { label: 'Send link', fn: function () { Rooms.share({ title: 'Stick Army', text: 'Defend the page with me.', url: room.link }); } }
      : { label: 'Copy link', fn: function () { Rooms.copy(room.link).then(function (r) { if (r === 'copied') status('Link copied'); setTimeout(function () { status(''); }, 1500); }); } };
    share.ghost = friend;
    showCard(['Send the ', 'link'], [link, friend ? 'Your friend is here!' : 'Waiting for your friend…',
      'You get the blue barrel, your friend the red one. You play ' + w.lv().NAME + ', your pick.'],
      [share, { label: 'Start', fn: startMatch, off: !friend, id: 'coopStart' }, { label: 'Cancel', ghost: true, fn: cancel }], 'invite');
  }
  function startMatch() {
    if (role !== 'host' || !friend) return;
    hideCard();
    w.RUN.players = 2; w.me = 0;
    w.newGame();
    started = true;
    startHost(hostSend);
    fx('x');   // a fresh page for the guest too
    lastIn = now();
  }
  function cancel() { leaveRoom(); forget(); hideCard(); status(''); }
  function leaveRoom() {
    if (room) { room.leave(); room = null; }
    role = null; friend = false; started = false; awaySince = 0;
    if (host) { stopHost(); w.RUN.players = 1; }
    if (guest) { stopGuest(); w.me = 0; }
  }

  // ---------- the room's events ----------
  function use(r) {
    room = r;
    r.on('ready', function () {
      friend = r.others.length > 0;
      if (role === 'host') { if (!started) invite(); else resend(); }
      else { if (!started) showCard(['Waiting for your ', 'friend'], ["You're in. Your friend starts the match.", 'You get the red barrel.'], [{ label: 'Leave', ghost: true, fn: leaveToTitle }], 'waiting'); ask('hi'); }
    });
    r.on('join', function (seat) {
      if (role === 'host') { friend = true; if (started) { resend(); flash('Your friend is back'); } else invite(); }
      else if (seat === HOST_SEAT) { awaySince = 0; if (ui && (ui.kind === 'away' || ui.kind === 'ended')) hideCard(); status(''); ask('hi'); }
    });
    r.on('leave', function (seat) {
      if (role === 'host') {
        friend = false;
        if (started) {
          var t = w.S.turrets && w.S.turrets[1]; if (t) t.firing = false; status('Your friend dropped out');
          // Waiting at the supply table for a friend who's gone: on without them.
          if (w.S.mode === 'shop' && w.S.shop && w.S.shop.ready && w.S.shop.ready[0]) w.continueWave(); else if (w.S.mode === 'shop') w.renderShop();
        } else invite();
      } else if (seat === HOST_SEAT) {
        if (started) { awaySince = now(); away(); }
        else showCard(['Waiting for your ', 'friend'], ['Your friend left. They can come back with the same link.'], [{ label: 'Leave', ghost: true, fn: leaveToTitle }], 'waiting');
      }
    });
    // A host that loses the room pauses its game (netPause, every frame); it plays on once it's back, unless someone
    // paused it meanwhile (netPaused is only the pause the connection made).
    r.on('status', function (st) {
      if (st === 'reconnecting') status('Reconnecting…');
      else if (st === 'connected') {
        status(role === 'host' && started && !friend ? 'Your friend dropped out' : '');
        if (role === 'host') { resend(); if (netPaused && w.S.mode === 'paused') w.togglePause(); netPaused = netResumed = false; } else ask('hi');
      }
    });
    r.on('refused', function (reason) {
      if (reason === 'nope') return askSecret(true);
      started = false;
      var why = reason === 'full' ? 'Two people are already playing this match.' : reason === 'replaced' ? 'This match is open in another tab or window.'
        : reason === 'wrong-game' ? "That link is for a different game." : "Ask your friend to start a new one and send you the link.";
      showCard([reason === 'replaced' ? 'Open somewhere ' : "This match isn't ", reason === 'replaced' ? 'else' : 'open'], [why], [{ label: 'OK', fn: leaveToTitle }], 'refused');
    });
    r.on('message', function (m, from) {
      if (role === 'host') {
        if (m.t === 'in') { lastIn = now(); hostInput(m); }
        else if (m.t === 'call' && w.S.mode === 'play') { if (m.k === 'bomber') w.callStrike(); else if (m.k === 'fighter') w.callFighter(); }
        else if (m.t === 'pause' && (w.S.mode === 'play' || w.S.mode === 'paused')) { netPaused = false; w.togglePause(); }
        else if (m.t === 'hi') resend();
        else if (m.t === 'shop' && m.k && w.S.mode === 'shop') {
          if (m.k.a === 'take') w.takeItem(String(m.k.id), 1);
          else if (m.k.a === 'back') w.putBack(String(m.k.id), 1);
          else if (m.k.a === 'undo') w.undo(1);
        } else if (m.t === 'ready') markReady(1);
      } else if (from === HOST_SEAT) {
        var whole = joinPieces(m);
        if (!whole || whole.t !== 'f') return;
        if (!guest) beginGuest();
        if (!receive(whole, now()) && now() - askedAt > 500) { askedAt = now(); ask('hi'); }
      }
    });
  }
  function flash(text) { status(text); flashT = now() + 2000; }
  function leaveToTitle() { leaveRoom(); forget(); location.reload(); }
  function away() {
    var left = Math.max(0, Math.ceil(TIMING.AWAY_END - (now() - awaySince) / 1000));
    if (left <= 0) {
      // Still in the room: if the host does come back, its game resumes and this guest rejoins it (join, below).
      var S = w.S;
      showCard(['The match is ', 'over'], ['Your friend didn\'t come back.', S && S.score != null ? 'Score: ' + Number(S.score).toLocaleString('en-US') + ', wave ' + S.wave + '.' : '',
        "If they do, you'll rejoin."], [{ label: 'Back to the title', fn: leaveToTitle }], 'ended');
      awaySince = 0;
      return;
    }
    if (!ui || ui.kind !== 'away' || ui.left !== left) {
      showCard(['Waiting for your ', 'friend'], ['Your friend dropped out. The game waits for them.', left + ' s'], [{ label: 'Leave', ghost: true, fn: leaveToTitle }], 'away');
      ui.left = left;
    }
  }
  // The guest's first snapshot: from now on this page draws the host's game.
  function beginGuest() {
    startGuest();
    w.me = 1; started = true; shownMode = null;
    hideCard();
    var sc = w.screens();
    sc.title.hidden = true; sc.pauseBtn.hidden = false;
    // Only the host starts runs over.
    ['restartBtn', 'againBtn', 'winAgainBtn', 'keepBtn'].forEach(function (id) { var b = document.getElementById(id); if (b) b.hidden = true; });
    w.fit();
  }
  // The guest's cards follow the host's game.
  function guestScreens(mode) {
    if (mode === shownMode) return;
    var sc = w.screens(), was = shownMode;
    shownMode = mode;
    if (was === null) w.fit();   // the title's open notebook closes to the single page
    sc.pause.hidden = mode !== 'paused';
    if (mode === 'paused') w.fillPause();
    sc.pauseBtn.hidden = mode !== 'play';
    if (mode === 'over' || mode === 'won') {
      var S = w.S, big = el('p', 'big-score', Number(S.score).toLocaleString('en-US'));
      showCard(mode === 'won' ? ['The page is ', 'yours!'] : ['Wall ', 'down!'], [big, 'Wave ' + S.wave + ' together.', sideBySide(S), 'Waiting for your friend to play again.'],
        [{ label: 'Leave', ghost: true, fn: leaveToTitle }], 'end');
    } else if (was === 'over' || was === 'won') { if (ui && ui.kind === 'end') hideCard(); }
  }
  // The two players side by side: points, planes, catches and Red Cross planes hit, in their barrels' colors.
  var ROWS = [['Points', 'score'], ['Planes', 'planes'], ['Captured', 'captured'], ['Red Cross', 'redCross']];
  function sideBySide(S) {
    var t = el('table', 'coop-table'), me = w.me, head = el('tr');
    head.appendChild(el('th'));
    [0, 1].forEach(function (i) { var th = el('th', i ? 'red' : 'blue', i === me ? 'You' : 'Friend'); head.appendChild(th); });
    t.appendChild(head);
    ROWS.forEach(function (r) {
      if (r[1] === 'redCross' && !(S.players[0].redCross || S.players[1].redCross)) return;
      var tr = el('tr'); tr.appendChild(el('td', null, r[0]));
      [0, 1].forEach(function (i) { tr.appendChild(el('td', 'n', Number(S.players[i][r[1]] || 0).toLocaleString('en-US'))); });
      t.appendChild(tr);
    });
    return t;
  }
  // The guest's supply table: the host's shop, drawn here and redrawn when it changes; taps go to the host (shop.js).
  // A tap held on the shop holds back redrawing, so a button isn't replaced between finger down and up (no click).
  var shopShown = '', pressing = false, pressHooked = false;
  function guestShop(S) {
    var sc = w.screens();
    if (!pressHooked) {
      pressHooked = true;
      sc.shop.addEventListener('pointerdown', function () { pressing = true; }, true);
      ['pointerup', 'pointercancel'].forEach(function (n) { addEventListener(n, function () { setTimeout(function () { pressing = false; }, 0); }, true); });
    }
    if (S.mode !== 'shop' || !S.shop) { if (shopShown) { sc.shop.hidden = true; shopShown = ''; } return; }
    if (pressing) return;
    var key = JSON.stringify([S.coins, S.wave, S.wallHP, S.pizzaOrder, S.calls, S.mods, S.turrets.map(function (t) { return t.mods; }), S.recruits.length, S.bed && S.bed.r && S.bed.r.id,
      S.shop.bought, S.shop.log, S.shop.giftTaken, S.shop.who, S.shop.ready, friend]);
    if (key === shopShown) return;
    var first = !shopShown;
    shopShown = key;
    sc.shop.hidden = false;
    w.renderShop();
    if (first) { sc.shop.scrollTop = 0; var stock = sc.shop.querySelector('.shop-stock'); if (stock) stock.scrollTop = 0; }
  }
  // Ready: the next wave waits for both players at the supply table (game.js asks before continuing).
  function ready() {
    if (guest) { ask('ready'); return true; }
    if (!host || !w.S.players || w.S.mode !== 'shop' || !w.S.shop) return false;
    markReady(0);
    return true;
  }
  function markReady(i) {
    var S = w.S;
    if (!host || S.mode !== 'shop' || !S.shop) return;
    S.shop.ready = S.shop.ready || {};
    S.shop.ready[i] = true;
    if (S.shop.ready[0] && (S.shop.ready[1] || !friend)) w.continueWave(); else w.renderShop();
  }
  // After the shop draws: Ready instead of Continue, and who's ready.
  function afterShop() {
    var S = w.S, btn = document.getElementById('continueBtn');
    if (!S.players || !S.shop || !btn) return;
    var r = S.shop.ready || {}, me = w.me, other = 1 - me, line = document.getElementById('coopReady');
    if (!line) { line = el('p', 'coop-ready'); line.id = 'coopReady'; line.setAttribute('role', 'status'); btn.parentNode.insertBefore(line, btn); }
    btn.textContent = r[me] ? 'Ready ✓' : 'Ready for wave ' + (S.wave + 1);
    var away = role === 'host' && !friend;
    line.textContent = (r[me] ? 'You ✓' : 'You …') + ' · ' + (away ? 'Friend away' : r[other] ? 'Friend ✓' : 'Friend …');
  }
  w.afterShop = afterShop;
  // The host's own end cards get the two players side by side under the score.
  var endShown = null;
  function hostEnd() {
    var S = w.S, mode = S.mode;
    if (mode === endShown) return;
    endShown = mode;
    ['over', 'win'].forEach(function (k) { var old = document.getElementById('coopTable-' + k); if (old) old.remove(); });
    if (!S.players || (mode !== 'over' && mode !== 'won')) return;
    var card = (mode === 'won' ? w.screens().win : w.screens().over).querySelector('.big-score');
    if (!card) return;
    var t = sideBySide(S); t.id = 'coopTable-' + (mode === 'won' ? 'win' : 'over');
    card.parentNode.insertBefore(t, card.nextSibling);
  }
  // While the host's room is down, its game doesn't play: any play (a wave started from the shop, a resume) pauses at
  // once. A host who resumes by hand while still offline (netResumed) plays on alone.
  function netPause() {
    if (!host || !room || room.status === 'connected' || w.S.mode !== 'play' || netResumed) return;
    if (netPaused) { netResumed = true; return; }
    w.togglePause(); netPaused = true;
  }
  // Each frame: the guest's aim to the host, the host letting go of a silent guest's trigger, the status line.
  function tick(t) {
    netPause();
    if (flashT && t > flashT) { flashT = 0; status(role === 'host' && started && !friend ? 'Your friend dropped out' : ''); }
    if (guest && room) {
      if (awaySince) away();
      var m = guestInput();
      if (m) {
        var changed = !sentIn || Math.abs(m.a - sentIn.a) > 0.002 || m.d !== sentIn.d;
        if ((changed && t - sentInAt >= IN_EVERY) || t - sentInAt >= IN_BEAT) { if (room.send(m)) { sentIn = m; sentInAt = t; } }
      }
    }
    if (host) { var g = w.S.turrets && w.S.turrets[1]; if (g && g.firing && t - lastIn > IN_LOST) g.firing = false; hostEnd(); }
  }

  // Opened from a friend's link: join it. A host whose page reloaded comes back as the host, with the link card.
  function init() {
    if (!window.Rooms) return;
    buildUI();
    var code = Rooms.codeFromLink();
    if (!code) return;
    role = store.get('stickarmy.coop.host.' + code) ? 'host' : 'guest';
    var r = Rooms.join({ game: GAME });
    if (!r) { role = null; return; }
    showCard([role === 'host' ? 'Back to your ' : 'Joining your ', 'friend'], ['Connecting…'], [{ label: 'Cancel', ghost: true, fn: leaveToTitle }], 'joining');
    use(r);
  }

  return {
    Encoder: Encoder, Decoder: Decoder, lerp: lerp, LEAVE: LEAVE, EVERY: EVERY, DELAY: DELAY, pieces: pieces, Joiner: Joiner,
    startHost: startHost, stopHost: stopHost, resend: resend, fx: fx, hostTick: hostTick, hostInput: hostInput,
    startGuest: startGuest, stopGuest: stopGuest, receive: receive, guestFrame: guestFrame, guestInput: guestInput,
    init: init, tick: tick, ask: ask, ready: ready, startMatch: startMatch, TIMING: TIMING, get room() { return room; }, get role() { return role; },
    get host() { return !!host; }, get guest() { return !!guest; }
  };
};
