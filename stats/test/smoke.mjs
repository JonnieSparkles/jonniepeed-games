// Smoke test for the play stats Worker.
// Live (BASE=https://stats.jonniepeed.games): writes a few rows for the hidden "test" game and checks the
// dashboards don't answer without Cloudflare Access.
// Local (default, against the dev command in docs/guides/03-play-stats.md): also writes real-game runs to the
// local database and checks the dashboard numbers move as they should, including initials from a saved score.
import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import { forge, LOCAL_SECRET } from '../../scores/test/tokens.mjs';

const BASE = (process.env.BASE || 'http://localhost:8789').replace(/\/$/, '');
const SCORES = (process.env.SCORES_BASE || 'http://localhost:8787').replace(/\/$/, '');
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE);
const LOCAL_ONLY = 'needs the local Worker';
// Cloudflare's bot protection can refuse unnamed clients, so every request says what it is.
const UA = { 'User-Agent': 'jonniepeed-games-stats-smoke/1' };
let failures = 0, cases = 0, skipped = 0;
async function test(name, fn, skip) {
  cases++;
  if (skip) { skipped++; console.log(`SKIP ${name}: ${skip}`); return; }
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
// Locally each request can claim its own connection, so the rate limit stays out of the way.
const randomIp = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
async function send(path, body, ip = LOCAL ? randomIp() : undefined) {
  const response = await fetch(BASE + path, {
    method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { ...UA, 'Content-Type': 'text/plain;charset=UTF-8', ...(ip ? { 'cf-connecting-ip': ip } : {}) },
    signal: AbortSignal.timeout(10000)
  });
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  return { status: response.status, data: await response.json() };
}
const ok = async (path, body) => { const r = await send(path, body); assert.equal(r.status, 200, JSON.stringify(r.data)); assert.deepEqual(r.data, { ok: true }); };
const refused = async (path, body, error) => { const r = await send(path, body); assert.equal(r.status, 400); assert.deepEqual(r.data, { ok: false, error }); };
const visit = randomUUID();
const start = (changes = {}) => ({ run: randomUUID(), visit, game: 'test', device: 'phone', orientation: 'portrait', host: 'localhost', ...changes });
const end = (run, changes = {}) => ({ ...run, outcome: 'over', time_ms: 61000, score: 12, input: 'touch', stats: { wave: 3, cause: 'bomb', won: false }, ...changes });
async function dash(path) {
  const response = await fetch(BASE + path, { headers: UA, signal: AbortSignal.timeout(10000) });
  return { status: response.status, data: response.headers.get('content-type')?.includes('json') ? await response.json() : null };
}
const detail = async game => { const r = await dash(`/dash/api/game?game=${game}&days=1`); assert.equal(r.status, 200); return r.data; };

await test('preflight answers any origin', async () => {
  const response = await fetch(BASE + '/v1/start', { method: 'OPTIONS', headers: UA });
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
});
await test('a test run starts and ends', async () => {
  const run = start({ from: 'news.example.com', board: 3 });
  await ok('/v1/start', run);
  await ok('/v1/start', run); // a repeat is harmless
  await ok('/v1/end', end(run, { score_run: randomUUID() }));
});
await test('an end without its start is still recorded', () => ok('/v1/end', end(start())));
await test('the largest valid report fits', async () => {
  // 24 keys of 32 characters, each with 40 characters that JSON escapes or encodes as several bytes.
  const stats = Object.fromEntries(Array.from({ length: 24 }, (_, i) => ['k' + String(i).padStart(31, '_'), (i % 2 ? '\u0001' : '漢').repeat(40)]));
  const body = end(start({ host: 'a'.repeat(100), from: 'b'.repeat(100) }), { stats, score: Number.MAX_SAFE_INTEGER, score_run: randomUUID() });
  assert.ok(new TextEncoder().encode(JSON.stringify(body)).length > 4096);
  await ok('/v1/end', body);
});
await test('bad starts are refused by field', async () => {
  await refused('/v1/start', start({ run: 'nope' }), 'bad_run');
  await refused('/v1/start', start({ visit: 42 }), 'bad_visit');
  await refused('/v1/start', start({ game: 'pebble-hop' }), 'bad_game');
  await refused('/v1/start', start({ board: 1.5 }), 'bad_board');
  await refused('/v1/start', start({ device: 'watch' }), 'bad_device');
  await refused('/v1/start', start({ orientation: 'up' }), 'bad_orientation');
  await refused('/v1/start', start({ host: 'Not A Host' }), 'bad_host');
  await refused('/v1/start', start({ from: '[::1]' }), 'bad_from');
});
await test('bad ends are refused by field', async () => {
  const run = start();
  await refused('/v1/end', end(run, { outcome: 'paused' }), 'bad_outcome');
  await refused('/v1/end', end(run, { time_ms: -1 }), 'bad_time');
  await refused('/v1/end', end(run, { time_ms: 86400001 }), 'bad_time');
  await refused('/v1/end', end(run, { score: 2.5 }), 'bad_score');
  await refused('/v1/end', end(run, { input: 'gamepad' }), 'bad_input');
  await refused('/v1/end', end(run, { score_run: 'abc' }), 'bad_score_run');
  await refused('/v1/end', end(run, { stats: { nested: { a: 1 } } }), 'bad_stats');
  await refused('/v1/end', end(run, { stats: { Wave: 1 } }), 'bad_stats');
  await refused('/v1/end', end(run, { stats: { note: 'x'.repeat(41) } }), 'bad_stats');
  await refused('/v1/end', end(run, { stats: Object.fromEntries(Array.from({ length: 25 }, (_, i) => ['k' + i, i])) }), 'bad_stats');
});
await test('bodies are checked', async () => {
  await refused('/v1/start', 'not json', 'bad_json');
  await refused('/v1/start', '[]', 'bad_json');
  await refused('/v1/start', JSON.stringify({ pad: 'x'.repeat(8200) }), 'body_too_large');
  const r = await fetch(BASE + '/v1/nothing', { method: 'POST', body: '{}', headers: UA });
  assert.equal(r.status, 404);
});

if (!LOCAL) {
  await test('dashboards are closed without Access', async () => {
    for (const path of ['/dash/', '/dash/api/overview']) {
      const response = await fetch(BASE + path, { redirect: 'manual', headers: UA, signal: AbortSignal.timeout(10000) });
      // Access answers with its login redirect; a Worker not yet behind Access answers 403 or 503 (locked).
      assert.ok([302, 401, 403, 503].includes(response.status), `${path} answered ${response.status}`);
    }
  });
}

await test('quits, finishes and wins count once per run', async () => {
  const game = 'stick-army', before = (await detail(game)).summary;
  const quitOnly = start({ game }), quitThenOver = start({ game }), overThenQuit = start({ game }), won = start({ game }), open = start({ game });
  for (const run of [quitOnly, quitThenOver, overThenQuit, won, open]) await ok('/v1/start', run);
  await ok('/v1/end', end(quitOnly, { outcome: 'quit', time_ms: 5000 }));
  await ok('/v1/end', end(quitThenOver, { outcome: 'quit', time_ms: 5000 }));
  await ok('/v1/end', end(quitThenOver, { outcome: 'over', time_ms: 90000 }));   // came back and finished
  await ok('/v1/end', end(overThenQuit, { outcome: 'over' }));
  await ok('/v1/end', end(overThenQuit, { outcome: 'quit' }));                     // a late quit changes nothing
  await ok('/v1/end', end(won, { outcome: 'won', stats: { wave: 15, won_at: 15 } }));
  const after = (await detail(game)).summary;
  assert.equal(after.runs - before.runs, 5);
  assert.equal(after.visits - before.visits, 1); // all five share this test's visit
  assert.equal(after.quit - before.quit, 1);
  assert.equal(after.finished - before.finished, 3);
  assert.equal(after.won - before.won, 1);
}, LOCAL ? null : LOCAL_ONLY);

await test('test runs never show on the dashboards', async () => {
  const before = (await dash('/dash/api/overview?days=1')).data;
  await ok('/v1/end', end(start()));
  const after = (await dash('/dash/api/overview?days=1')).data;
  const total = d => Object.values(d.games).reduce((t, g) => t + g.runs, 0);
  assert.equal(total(after), total(before));
  assert.ok(!('test' in after.games));
}, LOCAL ? null : LOCAL_ONLY);

await test('sources add up to every run, with the long tail folded into one row', async () => {
  for (let i = 0; i < 14; i++) await ok('/v1/start', start({ game: 'stick-army', from: `site${i}.example.com` }));
  const data = (await dash('/dash/api/overview?days=1')).data;
  const runs = Object.values(data.games).reduce((t, g) => t + g.runs, 0);
  assert.equal(data.sources.reduce((t, s) => t + s.n, 0), runs);
  assert.ok(data.sources.length <= 14 && data.sources.at(-1).other === true, JSON.stringify(data.sources.at(-1)));
  // Direct traffic keeps its own row, however many sites outrank it.
  for (let i = 0; i < 3; i++) await ok('/v1/start', start({ game: 'stick-army' }));
  assert.ok((await dash('/dash/api/overview?days=1')).data.sources.some(s => s.source == null && !s.other));
  const game = await detail('stick-army');
  assert.equal(game.sources.reduce((t, s) => t + s.n, 0), game.summary.runs);
}, LOCAL ? null : LOCAL_ONLY);

await test('windows start at Eastern midnight', async () => {
  const eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const today = Date.parse(eastern.format(new Date()).slice(0, 10) + 'T00:00:00Z');
  for (const days of [1, 7, 30]) {
    const { since } = (await dash(`/dash/api/overview?days=${days}`)).data;
    const at = eastern.format(new Date(since));
    assert.match(at, /, 00:00$/, `${days} days starts at ${at}`);
    assert.equal(Date.parse(at.slice(0, 10) + 'T00:00:00Z'), today - (days - 1) * 86400000, `${days} days starts on ${at}`);
  }
}, LOCAL ? null : LOCAL_ONLY);

await test('a game page narrows to one board', async () => {
  const game = 'dont-step-on-a-crack';
  for (const board of [7, 7, 8]) { const run = start({ game, board }); await ok('/v1/start', run); await ok('/v1/end', end(run)); }
  const all = await detail(game);
  const seven = (await dash(`/dash/api/game?game=${game}&days=1&board=7`)).data;
  assert.equal(seven.board, 7);
  assert.equal(seven.summary.runs, all.boards.find(b => b.board === 7).runs);
  assert.ok(seven.summary.runs >= 2 && seven.summary.runs < all.summary.runs);
  assert.ok(all.boards.some(b => b.board === 8 && b.runs >= 1 && b.median_ms != null));
  assert.equal((await dash(`/dash/api/game?game=${game}&days=1&board=0`)).status, 400);
  assert.equal((await dash(`/dash/api/game?game=${game}&days=1&board=x`)).status, 400);
}, LOCAL ? null : LOCAL_ONLY);

await test('a saved run shows its initials', async () => {
  // Save a score on a negative test board of the local scores Worker, then report the run with its token's run ID.
  const board = -randomInt(1, 2 ** 40), token = forge(process.env.RUN_SECRET || LOCAL_SECRET, 'thimbleful', board);
  const saved = await fetch(SCORES + '/v2/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': randomIp() },
    body: JSON.stringify({ game: 'thimbleful', board, token, name: 'ZQX', score: 9, input: 'keys', meta: { time_ms: 600000 } }) }).then(r => r.json());
  assert.equal(saved.ok, true, JSON.stringify(saved));
  const run = start({ game: 'thimbleful', board });
  await ok('/v1/start', run);
  await ok('/v1/end', end(run, { score: 9, score_run: token.split('.')[0], stats: { golds: 1, spills: 5, earned: 0, storm: 0 } }));
  const before = (await detail('thimbleful')).summary;
  const row = (await detail('thimbleful')).recent.find(r => r.score === 9 && r.name === 'ZQX');
  assert.ok(row, 'run with initials not found');
  assert.equal(row.saved, true);
  assert.deepEqual(row.stats, { golds: 1, spills: 5, earned: 0, storm: 0 });
  // Saves count only runs the dashboard saw, never more than the runs themselves.
  assert.ok(before.saves >= 1 && before.saves <= before.runs, JSON.stringify(before));
}, LOCAL ? null : LOCAL_ONLY);

await test('a game page shows its leaderboard, ranked as in the game', async () => {
  const lb = (await detail('dont-step-on-a-crack')).leaderboard;
  assert.ok(lb && Number.isInteger(lb.board) && lb.total >= lb.rows.length && lb.rows.length <= 50);
  for (let i = 1; i < lb.rows.length; i++) assert.ok(lb.rows[i - 1].score >= lb.rows[i].score, 'scores in order');
  assert.equal((await detail('stick-army')).leaderboard, null);   // no board, no card
}, LOCAL ? null : LOCAL_ONLY);

await test('a save play stats never saw shows as board only, on the game page and the homepage', async () => {
  // Save a Crack walk straight to the local scores Worker on a real board, with no stats report: what a blocker does.
  const board = 2, token = forge(process.env.RUN_SECRET || LOCAL_SECRET, 'dont-step-on-a-crack', board);
  const before = (await detail('dont-step-on-a-crack')).unseen;
  const saved = await fetch(SCORES + '/v2/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': randomIp() },
    body: JSON.stringify({ game: 'dont-step-on-a-crack', board, token, name: 'BLK', score: 3, input: 'touch', meta: { time_ms: 600000, steps: 3, streak: 1 } }) }).then(r => r.json());
  assert.equal(saved.ok, true, JSON.stringify(saved));
  const page = await detail('dont-step-on-a-crack');
  assert.equal(page.unseen, before + 1);
  const row = page.recent.find(r => r.board_only && r.name === 'BLK');
  assert.ok(row, 'board-only run not listed');
  assert.equal(row.time_ms, 600000); assert.equal(row.input, 'touch');
  const home = (await dash('/dash/api/overview?days=1')).data;
  assert.ok(home.recent.some(r => r.board_only && r.name === 'BLK' && r.game === 'dont-step-on-a-crack'));
  assert.ok(home.unseen >= page.unseen);
  // A run play stats did see, and saved, is never counted as unseen.
  assert.ok(!home.recent.some(r => r.board_only && r.name === 'ZQX'));
}, LOCAL ? null : LOCAL_ONLY);

await test('the overview and game pages load', async () => {
  for (const path of ['/dash/', '/dash/thimbleful/', '/dash/stick-army/']) {
    const response = await fetch(BASE + path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  }
  assert.equal((await fetch(BASE + '/dash/pebble-hop/')).status, 404);
  assert.equal((await dash('/dash/api/game?game=test')).status, 400);
}, LOCAL ? null : LOCAL_ONLY);

await test('one connection is rate limited', async () => {
  const ip = randomIp();
  let last;
  for (let i = 0; i < 121; i++) last = await send('/v1/start', start(), ip);
  assert.equal(last.status, 429);
  assert.deepEqual(last.data, { ok: false, error: 'rate_limited' });
}, LOCAL ? null : LOCAL_ONLY);

console.log(`${cases - failures - skipped} passed, ${failures} failed, ${skipped} skipped`);
process.exit(failures ? 1 : 0);
