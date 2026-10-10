// Rooms: a relay for phones playing together over the internet (docs/guides/05-rooms.md).
// A room is a Durable Object named by the code in the share link. Each phone opens a WebSocket to
// /room/<code>; whatever one sends, the others receive, tagged with who sent it. The room knows nothing
// about any game: it seats players, says who the host is, and passes JSON along. Games build on top with
// site/assets/rooms.js.
//
// The only thing stored is the room's settings (size, game) from when it was opened; they're cleared after
// a week. Opening a new room takes the secret; joining one that's already open doesn't.

const VERSION = 2;
const MAX_CAP = 8;                 // the most seats any room can have
const DEFAULT_MAX = 4;             // rooms opened without a size (pages from before sizes existed)
const MAX_MESSAGE = 16 * 1024;     // characters per message; plenty for a snapshot of a busy game
const CODE = /^[a-z0-9]{8,32}$/;
const GAME = /^[a-z0-9-]{1,40}$/;
const SECRET = 'meatball';         // it's always a meatball
const OPEN_FOR = 7 * 24 * 60 * 60 * 1000;
const GHOST_MS = 15000;            // a phone silent this long (no ping, no message) has gone; GHOST_MS var overrides for tests
const SWEEP_EVERY = 5000;          // how often an active room looks for silent phones
const RATE = 120, BURST = 240;     // messages per second per phone, sustained and in a burst
const FLOOD = 600;                 // messages dropped in 10 s before a phone is disconnected
const GRACE_MS = 3000;             // a phone that closes and comes straight back (a reload, a wifi blip) isn't announced as gone; LEAVE_GRACE_MS overrides

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return json({ ok: true, service: 'rooms', version: VERSION, maxPlayers: MAX_CAP, maxMessage: MAX_MESSAGE });
    const match = /^\/room\/([^/]+)$/.exec(url.pathname);
    if (!match || !CODE.test(match[1])) return json({ ok: false, error: 'not found' }, 404);
    if (request.headers.get('Upgrade') !== 'websocket') return json({ ok: false, error: 'websocket only' }, 426);
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  }
};

const seatOf = ws => { try { return ws.deserializeAttachment()?.seat || 0; } catch (e) { return 0; } };
const lowest = seats => seats.length ? Math.min(...seats) : 0;
const say = (ws, data) => { try { ws.send(typeof data === 'string' ? data : JSON.stringify(data)); } catch (e) {} };

// Hibernatable WebSockets: the object sleeps between messages, so an idle room costs nothing.
export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.ghostMs = Number(env && env.GHOST_MS) || GHOST_MS;
    this.sweepEvery = Math.min(SWEEP_EVERY, this.ghostMs / 3);
    this.graceMs = Number(env && env.LEAVE_GRACE_MS) || GRACE_MS;
    // Phones that closed cleanly in the last GRACE_MS, by identity: their seat is held and nobody's been told yet.
    // (A pending timer keeps the room awake, so this survives until it fires.)
    this.pending = new Map();
    this.lastSweep = 0;
    this.meta = undefined;           // the room's settings, read from storage once per wake
    this.traffic = new WeakMap();    // per connection: rate bucket and last message time (lost when the room sleeps, which is fine)
    // Keep-alive pings are answered without waking the room; the runtime notes when each phone last pinged.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  seated() { return this.ctx.getWebSockets().filter(seatOf); }
  // Seats that count as here: connected, plus anyone within the grace period after closing.
  heldSeats(exceptMe) {
    return [...this.seated().map(seatOf), ...[...this.pending].filter(([me]) => me !== exceptMe).map(([, p]) => p.seat)];
  }

  async settings() {
    if (this.meta !== undefined) return this.meta;
    const room = await this.ctx.storage.get('room');
    if (room) return (this.meta = room);
    // Rooms opened by the first version only stored when they opened.
    if (await this.ctx.storage.get('open')) return (this.meta = { max: DEFAULT_MAX, game: null });
    return (this.meta = null);
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const params = new URL(request.url).searchParams;
    // "me" is a random id the page keeps for this room (rooms.js keeps it across reloads). A phone that
    // reconnects replaces its own old connection, which the room may not have noticed is dead, and keeps its seat.
    const me = (params.get('me') || '').slice(0, 40);
    const game = GAME.test(params.get('game') || '') ? params.get('game') : null;
    // Accept, then close with a reason the page can read: a refused upgrade just looks like a network error.
    const refuse = (t, code, extra) => {
      server.accept();
      server.send(JSON.stringify({ t, ...extra }));
      server.close(code, t);
      return new Response(null, { status: 101, webSocket: client });
    };

    this.sweep(Date.now(), me);   // not this phone's own old connection: it's about to be replaced, not lost
    let meta = await this.settings();
    if (!meta) {
      // A room nobody has opened yet only opens with the secret. The opener's page sets its size and game.
      if ((params.get('s') || '').toLowerCase() !== SECRET) return refuse('nope', 4003);
      const asked = Math.round(Number(params.get('max')));
      meta = { max: Math.max(2, Math.min(MAX_CAP, asked || DEFAULT_MAX)), game, at: Date.now() };
      await this.ctx.storage.put('room', meta);
      await this.ctx.storage.setAlarm(Date.now() + OPEN_FOR);
      this.meta = meta;
    } else if (meta.game && game && meta.game !== game) {
      return refuse('wrong-game', 4004, { game: meta.game });
    }

    const seated = this.seated();
    const mine = seated.filter(ws => me && ws.deserializeAttachment().me === me);
    const others = seated.filter(ws => !mine.includes(ws));
    const held = me ? this.pending.get(me) : null;
    const taken = this.heldSeats(me).filter(s => !mine.some(ws => seatOf(ws) === s));
    let seat = mine.length ? seatOf(mine[0]) : held ? held.seat : 0;
    // A page coming back (say, after a reload) asks for the seat it had, so it keeps its color; it gets it if it's free.
    const want = Math.round(Number(params.get('seat')));
    if (!seat && want >= 1 && want <= meta.max && !taken.includes(want)) seat = want;
    if (!seat) seat = Array.from({ length: meta.max }, (_, i) => i + 1).find(s => !taken.includes(s)) || 0;
    if (!seat) return refuse('full', 4001, { max: meta.max });
    for (const old of mine) {
      try { old.serializeAttachment({}); } catch (e) {}   // no seat: its close won't announce a leave
      try { old.close(4002, 'replaced'); } catch (e) {}
    }
    if (held) { clearTimeout(held.timer); this.pending.delete(me); }   // back within the grace period: nobody was told it left

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ seat, me, at: Date.now() });
    const host = lowest([...taken, seat]);
    server.send(JSON.stringify({ t: 'hello', seat, host, max: meta.max, game: meta.game || null, seats: taken, others: taken.length }));
    for (const ws of others) say(ws, { t: 'join', seat, host });
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    const seat = seatOf(ws);
    if (!seat || typeof message !== 'string') return;
    const now = Date.now();
    const t = this.traffic.get(ws) || { tokens: BURST, at: now, dropped: 0, window: now, warned: 0, last: now };
    this.traffic.set(ws, t);
    t.tokens = Math.min(BURST, t.tokens + (now - t.at) / 1000 * RATE); t.at = now; t.last = now;
    if (now - t.window > 10000) { t.window = now; t.dropped = 0; }
    if (now - this.lastSweep > this.sweepEvery) this.sweep(now);
    if (t.tokens < 1) {
      t.dropped++;
      if (t.dropped > FLOOD) return this.drop(ws, 4005, 'too many messages');
      if (now - t.warned > 1000) { t.warned = now; say(ws, { t: 'error', reason: 'too fast', limit: RATE }); }
      return;
    }
    t.tokens--;
    // Errors go back to the sender only, so a mistake in a game shows up while it's being built.
    if (message.length > MAX_MESSAGE) return say(ws, { t: 'error', reason: 'too big', limit: MAX_MESSAGE });
    let data;
    try { data = JSON.parse(message); } catch (e) { return say(ws, { t: 'error', reason: 'not json' }); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return say(ws, { t: 'error', reason: 'not an object' });
    // The room adds "f", the sender's seat. With "to", only that seat gets it; otherwise everyone else does.
    data.f = seat;
    let to = 0;
    if (data.to !== undefined) {
      // A private message must never fall back to everyone.
      to = Number(data.to);
      if (!Number.isInteger(to) || to < 1) return say(ws, { t: 'error', reason: 'bad to' });
      data.to = to;
    }
    const out = JSON.stringify(data);
    for (const other of this.seated()) {
      if (other === ws) continue;
      if (to && seatOf(other) !== to) continue;
      say(other, out);
    }
  }

  // Silent phones: a phone that dropped off without closing (lost signal, a tab the phone killed) can look
  // connected for minutes. Anyone who hasn't pinged or sent anything for GHOST_MS is let go.
  sweep(now, exceptMe) {
    this.lastSweep = now;
    for (const ws of this.seated()) {
      const a = ws.deserializeAttachment();
      if (exceptMe && a.me === exceptMe) continue;
      let pinged = 0;
      try { const d = this.ctx.getWebSocketAutoResponseTimestamp(ws); pinged = d ? d.getTime() : 0; } catch (e) {}
      const t = this.traffic.get(ws);
      const last = Math.max(a.at || 0, pinged, t ? t.last : 0);
      if (now - last > this.ghostMs) this.drop(ws, 4006, 'timed out');
    }
  }

  drop(ws, code, reason) {
    const seat = seatOf(ws);
    try { ws.serializeAttachment({}); } catch (e) {}
    try { ws.close(code, reason); } catch (e) {}
    if (seat) this.left(seat);
  }

  left(seat) {
    const host = lowest(this.heldSeats());
    for (const ws of this.seated()) say(ws, { t: 'leave', seat, host });
  }

  webSocketClose(ws, code) {
    let a = {};
    try { a = ws.deserializeAttachment() || {}; } catch (e) {}
    if (!a.seat) return;
    try { ws.serializeAttachment({}); } catch (e) {}   // announced once, even if an error and a close both arrive
    try { ws.close(code === 1005 || code === 1006 || code === 1015 ? 1000 : code, 'bye'); } catch (e) {}
    if (!a.me) return this.left(a.seat);
    // Hold the seat briefly: a reload or a blip comes back with the same identity and nobody sees it go.
    const prev = this.pending.get(a.me);
    if (prev) clearTimeout(prev.timer);
    const timer = setTimeout(() => {
      if (this.pending.get(a.me)?.timer !== timer) return;
      this.pending.delete(a.me);
      this.left(a.seat);
    }, this.graceMs);
    this.pending.set(a.me, { seat: a.seat, timer });
  }

  webSocketError(ws) { this.webSocketClose(ws, 1011); }

  // A week after opening, the room forgets its settings; its link then needs the secret again.
  async alarm() { await this.ctx.storage.deleteAll(); this.meta = null; }
}
