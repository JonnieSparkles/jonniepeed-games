// Checks the room relay against a local Worker: seats, relaying, the two-player cap, leaving and reconnecting.
// From rooms/: `wrangler dev --local --port 8788`, then from the repo root: `node rooms/test/relay.mjs`.
// ROOMS_URL overrides the address (default ws://localhost:8788).
const BASE = process.env.ROOMS_URL || 'ws://localhost:8788';
const code = 'test' + Math.random().toString(36).slice(2, 12);

function open(me) {
  const ws = new WebSocket(`${BASE}/room/${code}?me=${me}`);
  const inbox = [], waiters = [];
  ws.onmessage = e => { inbox.push(e.data); waiters.splice(0).forEach(w => w()); };
  ws.closed = new Promise(r => { ws.onclose = e => r(e.code); });
  ws.next = async (ms = 3000) => {
    const end = Date.now() + ms;
    while (!inbox.length) {
      if (Date.now() > end) throw new Error(`${me}: nothing arrived`);
      await new Promise(r => { waiters.push(r); setTimeout(r, 100); });
    }
    const raw = inbox.shift();
    try { return JSON.parse(raw); } catch (e) { return raw; }
  };
  return new Promise((resolve, reject) => { ws.onopen = () => resolve(ws); ws.onerror = reject; });
}
const check = (ok, what) => { if (!ok) throw new Error('FAIL ' + what); console.log('ok', what); };

const health = await (await fetch(BASE.replace(/^ws/, 'http') + '/')).json();
check(health.ok, 'the Worker answers at /');
check((await fetch(BASE.replace(/^ws/, 'http') + '/room/BAD!')).status === 404, 'a bad room code is refused');

const a = await open('aaa');
let m = await a.next();
check(m.t === 'hello' && m.seat === 1 && m.others === 0, 'first in gets seat 1, alone');
const b = await open('bbb');
m = await b.next();
check(m.t === 'hello' && m.seat === 2 && m.others === 1, 'second in gets seat 2 and sees one other');
check((await a.next()).t === 'join', 'the first hears the second join');

a.send(JSON.stringify({ t: 'p', x: 0.25, y: 0.75 }));
m = await b.next();
check(m.t === 'p' && m.x === 0.25, 'a message reaches the other phone');
b.send(JSON.stringify({ t: 'p', x: 0.5, y: 0.5 }));
check((await a.next()).x === 0.5, 'and back');

a.send('ping');
check((await a.next()) === 'pong', 'ping is answered');

const c = await open('ccc');
check((await c.next()).t === 'full' && (await c.closed) === 4001, 'a third phone is told the room is full');

const b2 = await open('bbb');
m = await b2.next();
check(m.t === 'hello' && m.seat === 2, 'a reconnect takes back its own seat');
check((await b.closed) === 4002, 'the old connection is closed as replaced');
check((await a.next()).t === 'join', 'the other phone hears it rejoin');

b2.close();
m = await a.next();
check(m.t === 'leave' && m.seat === 2, 'leaving is announced');
a.close();
console.log('PASS rooms relay');
process.exit(0);
