// Rooms: a relay for up to four phones playing together over the internet (docs/guides/05-rooms.md).
// A room is a Durable Object named by the code in the share link. Each phone opens a WebSocket to
// /room/<code>; whatever one sends, the others receive, tagged with who sent it. Opening a new room takes the secret; joining a
// room that's already open doesn't. The only thing stored is that a room is open, for a week.

const MAX_PLAYERS = 4;
const MAX_MESSAGE = 1024;          // characters; game messages are a few numbers
const CODE = /^[a-z0-9]{8,32}$/;
const SECRET = 'meatball';         // it's always a meatball
const OPEN_FOR = 7 * 24 * 60 * 60 * 1000;
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/') return json({ ok: true, service: 'rooms' });
    const match = /^\/room\/([^/]+)$/.exec(url.pathname);
    if (!match || !CODE.test(match[1])) return json({ ok: false, error: 'not found' }, 404);
    if (request.headers.get('Upgrade') !== 'websocket') return json({ ok: false, error: 'websocket only' }, 426);
    return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  }
};

// Hibernatable WebSockets: the object sleeps between messages, so an idle room costs nothing.
export class Room {
  constructor(ctx) {
    this.ctx = ctx;
    // Keep-alive pings are answered without waking the room.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    // "me" is a random id per page visit. A phone that reconnects (say, wifi to mobile data) replaces its
    // own old connection, which the server may not have noticed is dead yet, and keeps its seat.
    const params = new URL(request.url).searchParams;
    const me = (params.get('me') || '').slice(0, 32);
    let others = this.ctx.getWebSockets().filter(ws => ws.deserializeAttachment()?.seat);
    let seat;
    for (const old of others.filter(ws => me && ws.deserializeAttachment().me === me)) {
      seat = old.deserializeAttachment().seat;
      old.serializeAttachment({});   // no seat: its close won't announce a leave
      try { old.close(4002, 'replaced'); } catch (e) {}
    }
    others = others.filter(ws => ws.deserializeAttachment()?.seat);
    const taken = others.map(ws => ws.deserializeAttachment().seat);
    seat = seat || Array.from({ length: MAX_PLAYERS }, (_, i) => i + 1).find(s => !taken.includes(s));
    // Accept, then close with a reason the page can read: a refused upgrade just looks like a network error.
    const refuse = (t, code) => {
      server.accept();
      server.send(JSON.stringify({ t }));
      server.close(code, t);
      return new Response(null, { status: 101, webSocket: client });
    };
    if (others.length >= MAX_PLAYERS || !seat) return refuse('full', 4001);
    // A room nobody has opened yet only opens with the secret. Once open, its link works for a week.
    if (!await this.ctx.storage.get('open')) {
      if ((params.get('s') || '').toLowerCase() !== SECRET) return refuse('nope', 4003);
      await this.ctx.storage.put('open', Date.now());
      await this.ctx.storage.setAlarm(Date.now() + OPEN_FOR);
    }
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ seat, me });
    server.send(JSON.stringify({ t: 'hello', seat, others: others.length, seats: taken }));
    for (const ws of others) { try { ws.send(JSON.stringify({ t: 'join', seat })); } catch (e) {} }
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, message) {
    if (typeof message !== 'string' || message.length > MAX_MESSAGE) return;
    const seat = ws.deserializeAttachment()?.seat;
    if (!seat) return;
    // Games send JSON objects. The room adds "f", the sender's seat, so the others know who it's from.
    let data;
    try { data = JSON.parse(message); } catch (e) { return; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    data.f = seat;
    const out = JSON.stringify(data);
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws && other.deserializeAttachment()?.seat) { try { other.send(out); } catch (e) {} }
    }
  }

  webSocketClose(ws, code) {
    const seat = ws.deserializeAttachment()?.seat;
    if (!seat) return;
    for (const other of this.ctx.getWebSockets()) {
      if (other !== ws && other.deserializeAttachment()?.seat) { try { other.send(JSON.stringify({ t: 'leave', seat })); } catch (e) {} }
    }
    try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch (e) {}
  }

  webSocketError(ws) { this.webSocketClose(ws, 1011); }

  // A week after opening, the room forgets it was open; its link then needs the secret again.
  async alarm() { await this.ctx.storage.deleteAll(); }
}
