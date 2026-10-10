// Checks the room relay against a local Worker: the secret, seats, relaying, the four-player cap, leaving and reconnecting.
// From rooms/: `wrangler dev --local --port 8788`, then from the repo root: `node rooms/test/relay.mjs`.
// ROOMS_URL overrides the address (default ws://localhost:8788).
const BASE = process.env.ROOMS_URL || 'ws://localhost:8788';
const code = 'test' + Math.random().toString(36).slice(2, 12);

function open(me, secret) {
  const ws = new WebSocket(`${BASE}/room/${code}?me=${me}` + (secret ? `&s=${secret}` : ''));
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

const wrong = await open('xxx', 'pickle');
check((await wrong.next()).t === 'nope' && (await wrong.closed) === 4003, 'the wrong secret is refused');
const early = await open('yyy');
check((await early.next()).t === 'nope' && (await early.closed) === 4003, 'a new room needs the secret');

const a = await open('aaa', 'meatball');
let m = await a.next();
check(m.t === 'hello' && m.seat === 1 && m.others === 0, 'first in gets seat 1, alone');
const b = await open('bbb');
m = await b.next();
check(m.t === 'hello' && m.seat === 2 && m.others === 1 && m.seats[0] === 1, 'second in gets seat 2 and sees seat 1');
check((await a.next()).t === 'join', 'the first hears the second join');

a.send(JSON.stringify({ t: 'p', x: 0.25, y: 0.75 }));
m = await b.next();
check(m.t === 'p' && m.x === 0.25 && m.f === 1, 'a message reaches the other phone, tagged with its seat');
b.send(JSON.stringify({ t: 'p', x: 0.5, y: 0.5 }));
m = await a.next();
check(m.x === 0.5 && m.f === 2, 'and back');
b.send('not json');
a.send(JSON.stringify({ t: 'p', x: 0.1 }));
check((await b.next()).x === 0.1, 'anything that isn\'t a JSON object is dropped');

a.send('ping');
check((await a.next()) === 'pong', 'ping is answered');

const c = await open('ccc');
m = await c.next();
check(m.t === 'hello' && m.seat === 3 && m.others === 2, 'a third phone gets seat 3');
const d = await open('ddd');
check((await d.next()).seat === 4, 'a fourth gets seat 4');
for (const ws of [a, a, b, b, c]) check((await ws.next()).t === 'join', 'joins are announced to everyone already in');
c.send(JSON.stringify({ t: 'p', x: 0.3 }));
for (const ws of [a, b, d]) check((await ws.next()).f === 3, 'one phone reaches all the others');
const e = await open('eee');
check((await e.next()).t === 'full' && (await e.closed) === 4001, 'a fifth phone is told the room is full');
c.close(); d.close();
for (const ws of [a, a, b, b]) check((await ws.next()).t === 'leave', 'leaves are announced');

const b2 = await open('bbb');
m = await b2.next();
check(m.t === 'hello' && m.seat === 2, 'a reconnect takes back its own seat');
check((await b.closed) === 4002, 'the old connection is closed as replaced');
check((await a.next()).t === 'join', 'the other phone hears it rejoin');

b2.close();
m = await a.next();
check(m.t === 'leave' && m.seat === 2, 'leaving is announced');
a.close();
await a.closed;
const back = await open('fff');
check((await back.next()).t === 'hello', 'an open room takes its link without the secret, even when empty');
back.close();
console.log('PASS rooms relay');
process.exit(0);
