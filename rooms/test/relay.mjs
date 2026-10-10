// Checks the rooms Worker: the secret, room size and game, seats and host, relaying to everyone or one seat,
// errors back to the sender, the rate limit, silent phones, reconnecting and leaving.
//
// Locally, from rooms/:  wrangler dev --local --port 8788 --var GHOST_MS:6000 --var LEAVE_GRACE_MS:500
// then from the repo root:  GHOST_MS=6000 LEAVE_GRACE_MS=500 node rooms/test/relay.mjs
//
// ROOMS_URL points it elsewhere (the deploy workflow checks wss://rooms.jonniepeed.games). GHOST_MS and
// LEAVE_GRACE_MS must match the Worker's; the silent-phone check only runs when GHOST_MS is set (the live one waits 15 s).
const BASE = process.env.ROOMS_URL || 'ws://localhost:8788';
const GHOST = Number(process.env.GHOST_MS) || 0;
const GRACE = Number(process.env.LEAVE_GRACE_MS) || 3000;   // a clean close is announced this long after it happens
const LEAVE_WAIT = GRACE + 3000;
const newCode = () => 'test' + Math.random().toString(36).slice(2, 12);

function open(code, me, opts = {}) {
  const q = new URLSearchParams({ me });
  for (const k of ['s', 'max', 'game', 'seat']) if (opts[k] !== undefined) q.set(k, opts[k]);
  const ws = new WebSocket(`${BASE}/room/${code}?${q}`);
  const inbox = [], waiters = [];
  ws.onmessage = e => { inbox.push(e.data); waiters.splice(0).forEach(w => w()); };
  ws.closed = new Promise(r => { ws.onclose = e => r(e.code); });
  ws.next = async (ms = 3000) => {
    const end = Date.now() + ms;
    while (!inbox.length) {
      if (Date.now() > end) throw new Error(`${me}: nothing arrived`);
      await new Promise(r => { waiters.push(r); setTimeout(r, 50); });
    }
    const raw = inbox.shift();
    try { return JSON.parse(raw); } catch (e) { return raw; }
  };
  // Waits for a message of type t, skipping others.
  ws.until = async (t, ms = 3000) => { for (;;) { const m = await ws.next(ms); if (m.t === t || m === t) return m; } };
  ws.quiet = async (ms = 300) => { await new Promise(r => setTimeout(r, ms)); return inbox.length === 0; };
  ws.drain = async (ms = 300) => { await new Promise(r => setTimeout(r, ms)); inbox.length = 0; };
  ws.json = data => ws.send(JSON.stringify(data));
  return new Promise((resolve, reject) => {
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error(`could not connect to ${BASE}/room/${code} as ${me}`));
  });
}
const check = (ok, what) => { if (!ok) throw new Error('FAIL ' + what); console.log('ok', what); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- the Worker itself ----------
console.log('rooms Worker at', BASE, '· node', process.version);
const health = await (await fetch(BASE.replace(/^ws/, 'http') + '/')).json();
check(health.ok && health.version === 2 && health.maxPlayers === 8, 'the Worker answers at / with its version and limits');
check((await fetch(BASE.replace(/^ws/, 'http') + '/room/BAD!')).status === 404, 'a bad room code is refused');

// ---------- opening: secret, size, game ----------
let code = newCode();
const wrong = await open(code, 'x1', { s: 'pickle' });
check((await wrong.next()).t === 'nope' && (await wrong.closed) === 4003, 'the wrong secret is refused');
const early = await open(code, 'x2');
check((await early.next()).t === 'nope' && (await early.closed) === 4003, 'a new room needs the secret');

const a = await open(code, 'aaa', { s: 'meatball', max: 3, game: 'test-game' });
let m = await a.next();
check(m.t === 'hello' && m.seat === 1 && m.host === 1 && m.max === 3 && m.game === 'test-game' && m.seats.length === 0, 'the opener sets size and game, gets seat 1 and is host');
const other = await open(code, 'x3', { game: 'other-game' });
m = await other.next();
check(m.t === 'wrong-game' && m.game === 'test-game' && (await other.closed) === 4004, 'a page for a different game is refused');

const b = await open(code, 'bbb', { game: 'test-game' });
m = await b.next();
check(m.t === 'hello' && m.seat === 2 && m.host === 1 && m.seats[0] === 1, 'second in gets seat 2 and knows seat 1 is host');
m = await a.next();
check(m.t === 'join' && m.seat === 2 && m.host === 1, 'the host hears the join');

// ---------- relaying ----------
a.json({ t: 'p', x: 0.25 });
m = await b.next();
check(m.t === 'p' && m.x === 0.25 && m.f === 1, 'a message reaches the other phone, tagged with its seat');
b.json({ t: 'p', x: 0.5, f: 99 });
m = await a.next();
check(m.x === 0.5 && m.f === 2, 'and back, with the sender tag set by the room, not the phone');

const c = await open(code, 'ccc');
m = await c.next();
check(m.seat === 3 && m.max === 3, 'a page that doesn\'t say its game still joins');
await a.until('join'); await b.until('join');
const d = await open(code, 'ddd');
check((await d.next()).t === 'full' && (await d.closed) === 4001, 'the room is full at the size its opener chose');

a.json({ t: 'snap', to: 3, n: 1 });
check((await c.next()).n === 1, 'a message with "to" reaches that seat');
check(await b.quiet(), 'and nobody else');
c.json({ t: 'p', x: 0.3 });
check((await a.next()).f === 3 && (await b.next()).f === 3, 'without "to", everyone else gets it');

const big = 'x'.repeat(15000);
a.json({ t: 'big', big });
check((await b.next()).big.length === 15000, 'a 15 KB message goes through');
a.json({ t: 'big', big: big + big });
m = await a.next();
check(m.t === 'error' && m.reason === 'too big', 'a message over 16 KB comes back to the sender as an error');
a.send('not json');
check((await a.next()).reason === 'not json', 'so does something that isn\'t JSON');
a.send('[1,2]');
check((await a.next()).reason === 'not an object', 'or isn\'t an object');
check(await b.quiet(), 'and none of those reach anyone else');

a.send('ping');
check((await a.next()) === 'pong', 'ping is answered');

// ---------- host changes ----------
a.close();
m = await b.until('leave', LEAVE_WAIT);
check(m.seat === 1 && m.host === 2, 'when the host leaves, the next seat becomes host');
await c.until('leave', LEAVE_WAIT);
const a2 = await open(code, 'aaa');
m = await a2.next();
check(m.seat === 1 && m.host === 1, 'a returning phone gets its seat back, and seat 1 is host again');
check((await b.until('join')).host === 1, 'everyone hears the host change back');
await c.until('join');

// ---------- reconnecting replaces the old connection ----------
const b2 = await open(code, 'bbb');
m = await b2.next();
check(m.t === 'hello' && m.seat === 2, 'a reconnect takes back its own seat');
check((await b.closed) === 4002, 'the old connection is closed as replaced');
check((await a2.until('join')).seat === 2, 'the others hear it rejoin, with no leave in between');

// ---------- a reload or a blip: closing and coming straight back ----------
b2.close(); await b2.closed;
const b3 = await open(code, 'bbb');
check((await b3.next()).seat === 2, 'closing and coming straight back keeps the seat');
m = await a2.next();
check(m.t === 'join' && m.seat === 2, 'and the others never see it leave');
await new Promise(r => setTimeout(r, GRACE + 300));
check(await a2.quiet(), 'not even after the grace period');
await c.drain();

// ---------- "to" must name a seat ----------
a2.json({ t: 'x', to: 'two' });
check((await a2.next()).reason === 'bad to', 'a "to" that isn\'t a seat comes back as an error, not to everyone');
a2.json({ t: 'x', to: '2' });
m = await b3.next();
check(m.t === 'x' && m.to === 2, 'a seat number written as text still reaches only that seat');
check(await c.quiet(), 'and not the others');

// ---------- rate limit ----------
// 600 at once: the room lets about 240 through, plus 120 for each second it takes, and tells the sender at most
// once a second. (Fewer than the 600 drops that would disconnect it.) Bounds allow for a slow test machine.
const spamStart = Date.now();
for (let i = 0; i < 600; i++) b3.json({ t: 'spam', i });
let got = 0, errors = 0;
for (;;) {
  let msg; try { msg = await a2.next(500); } catch (e) { break; }
  if (msg.t === 'spam') got++;
}
for (;;) { let msg; try { msg = await b3.next(300); } catch (e) { break; } if (msg.reason === 'too fast') errors++; }
const spamSecs = (Date.now() - spamStart) / 1000;
check(got >= 200 && got < 600 && got <= 240 + 120 * spamSecs + 20, `a burst is capped (${got} of 600 got through)`);
check(errors >= 1 && errors <= Math.ceil(spamSecs) + 1, `the sender is told, at most once a second (${errors} times)`);
await c.quiet(800);

// ---------- silent phones ----------
if (GHOST) {
  // c never pings; a2 and b3 do. After GHOST_MS, the next sweep lets c go and tells the others.
  const keep = setInterval(() => { a2.send('ping'); b3.send('ping'); }, GHOST / 3);
  await sleep(GHOST + 500);
  a2.json({ t: 'p', x: 0.1 });   // any message (or a join) makes the room look
  check((await c.closed) === 4006, 'a phone that goes silent is let go');
  m = await b3.until('leave');
  check(m.seat === 3, 'and the others are told it left');
  clearInterval(keep);
} else {
  console.log('skip silent phones (set GHOST_MS to match the Worker)');
}
a2.close(); b3.close(); c.close();

// ---------- asking for a seat back ----------
code = newCode();
const s1 = await open(code, 's1', { s: 'meatball' });
await s1.next();
const s2 = await open(code, 's2');
await s2.next();
s2.close(); await s1.until('leave', LEAVE_WAIT);
const s3 = await open(code, 's3', { seat: 3 });
check((await s3.next()).seat === 3, 'a page can ask for the seat it had, and gets it when it\'s free');
const s4 = await open(code, 's4', { seat: 3 });
check((await s4.next()).seat === 2, 'when it isn\'t, it gets the lowest free seat');
const s5 = await open(code, 's5', { seat: 9 });
check((await s5.next()).seat === 4, 'a seat past the room\'s size is ignored');
for (const ws of [s1, s3, s4, s5]) ws.close();

// ---------- rooms opened by the first version, and the week-long open link ----------
code = newCode();
const legacy = await open(code, 'l1', { s: 'meatball' });
m = await legacy.next();
check(m.max === 4 && m.game === null, 'a page that doesn\'t give a size gets four seats, like the first version');
legacy.close(); await legacy.closed;
const back = await open(code, 'l2');
check((await back.next()).t === 'hello', 'an open room takes its link without the secret, even when empty');
back.close();

console.log('PASS rooms relay');
process.exit(0);
