// Isolated local integration test: historical boards and newest-rule test boards.
// Uses an ephemeral Worker/D1 copy. It never contacts a deployed Worker.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { forge } from './tokens.mjs';

const root = new URL('../', import.meta.url);
const fixture = await mkdtemp(join(tmpdir(), 'jpg-board-versions-'));
const wrangler = process.env.WRANGLER || 'wrangler';
const env = { ...process.env, CLOUDFLARE_SEND_METRICS: 'false' };
const secret = randomBytes(24).toString('base64url');
let worker;
function command(args) {
  const child = spawn(wrangler, args, { cwd: fixture, env, detached: true });
  let output = '';
  child.stdout.on('data', chunk => { output = (output + chunk).slice(-8000); });
  child.stderr.on('data', chunk => { output = (output + chunk).slice(-8000); });
  const done = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(`Wrangler exited ${code}: ${output}`)));
  });
  return { child, done, output: () => output };
}

try {
  for (const file of ['src', 'schema.sql', 'blocklist.json']) await cp(new URL(file, root), join(fixture, file), { recursive: true });
  // Exercise filtering without adding names to the production policy.
  await writeFile(join(fixture, 'blocklist.json'), JSON.stringify(['TST']));
  const games = JSON.parse(await readFile(new URL('games.json', root)));
  // The newest real board becomes a historical board once a synthetic next board is added.
  const CURRENT = Math.max(...Object.keys(games.thimbleful.boards).map(Number));
  const NEXT = CURRENT + 1;
  const currentRules = structuredClone(games.thimbleful.boards[String(CURRENT)]);
  assert.ok(currentRules.plausible, `thimbleful board ${CURRENT} needs a score cap`);
  assert.equal(games.thimbleful.boards['1'].plausible, undefined, 'board 1 is expected to be read-only');
  // a synthetic board one past the newest real one, with deliberately different rules
  games.thimbleful.boards[String(NEXT)] = {
    higherIsBetter: false, maxScore: 100,
    meta: { time_ms: { min: 0, max: 100 }, extra: { min: 0, max: 10 } },
    tieBreak: [['time_ms', 'desc']],
    plausible: { perSecond: 1, grace: 100 }
  };
  await writeFile(join(fixture, 'games.json'), JSON.stringify(games));
  await writeFile(join(fixture, 'wrangler.jsonc'), JSON.stringify({
    name: 'jpg-version-test', main: 'src/index.js', compatibility_date: '2026-10-06',
    d1_databases: [{ binding: 'DB', database_name: 'version-test', database_id: 'LOCAL_TEST_ONLY' }]
  }));
  await command(['d1', 'execute', 'version-test', '--local', '--file=schema.sql']).done;
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  const dev = command(['dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--log-level', 'error', '--var', `RUN_SECRET:${secret}`]);
  worker = dev.child;
  let exited = null;
  dev.done.catch(error => { exited = error; });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (exited) throw exited;
    try { const r = await fetch(base + '/v2/top?game=thimbleful&board=1', { signal: AbortSignal.timeout(500) }); if (r.ok) { ready = true; break; } } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Worker failed to start: ${dev.output()}`);
  const blocklist = JSON.parse(await readFile(join(fixture, 'blocklist.json')));
  const name = ['AAA', 'JON', 'TST', '123'].find(s => !blocklist.includes(s));
  assert.ok(name, 'Need an allowed fixture name');
  const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  // Ten minutes of play keeps every score used on the current board under its cap.
  async function submit(board, score, meta = { time_ms: 600000 }, initials = name) {
    const token = forge(secret, 'thimbleful', board);
    const response = await fetch(base + '/v2/submit', post({ game: 'thimbleful', board, token, name: initials, score, input: 'keys', meta }));
    return { status: response.status, data: await response.json() };
  }
  async function top(board, score, meta) {
    const query = new URLSearchParams({ game: 'thimbleful', board });
    if (score !== undefined) query.set('score', score);
    if (meta !== undefined) query.set('meta', JSON.stringify(meta));
    const response = await fetch(base + '/v2/top?' + query); assert.equal(response.status, 200);
    return response.json();
  }
  async function start(board) {
    const response = await fetch(base + '/v2/start', post({ game: 'thimbleful', board }));
    return { status: response.status, data: await response.json() };
  }
  assert.deepEqual(games.thimbleful.boards[String(CURRENT)], currentRules);
  const refused = await submit(CURRENT, 38, undefined, 'TST');
  assert.equal(refused.status, 400); assert.equal(refused.data.error, 'name_not_allowed');
  console.log('PASS blocklist validation with an isolated test-only name');
  assert.equal((await start(1)).data.error, 'bad_board');
  assert.equal((await submit(1, 38)).data.error, 'bad_board');
  assert.ok(Array.isArray((await top(1)).scores));
  assert.equal((await start(CURRENT)).status, 200);
  assert.equal((await start(NEXT)).status, 200);
  console.log('PASS a board without a score cap stays readable but takes no new runs');
  assert.equal((await submit(CURRENT, 101)).status, 200);
  assert.equal((await submit(NEXT, 101, { time_ms: 50 })).data.error, 'bad_score');
  assert.equal((await submit(NEXT, 50, { time_ms: 999 })).data.error, 'bad_meta');
  assert.equal((await submit(CURRENT, 50, { time_ms: 600000, extra: 1 })).data.error, 'bad_meta');
  assert.equal((await submit(NEXT, 50, { time_ms: 50, extra: 1 })).status, 200);
  assert.equal((await submit(CURRENT, 3000, { time_ms: 600000 })).data.error, 'rejected');   // over its own cap
  assert.equal((await submit(NEXT, 90, { time_ms: 50 })).status, 200);                       // under NEXT's
  console.log(`PASS board ${CURRENT} retains its score, meta and cap rules after board ${NEXT} is added`);
  await submit(CURRENT, 40); await submit(CURRENT, 50);
  assert.deepEqual((await top(CURRENT)).scores.map(row => row.score), [101, 50, 40]);
  assert.equal((await top(CURRENT, 102)).placement, 1);
  assert.equal((await top(CURRENT, 0)).placement, 4);
  console.log('PASS historical board keeps descending order and candidate placement');
  for (let i = 1; i <= 50; i++) assert.equal((await submit(NEXT, 40, { time_ms: i })).status, 200);
  const rows = (await top(NEXT)).scores;
  assert.equal(rows.length, 50); assert.equal(rows[0].meta.time_ms, 50); assert.equal(rows[49].meta.time_ms, 1);
  assert.equal((await top(NEXT, 39)).placement, 1);
  assert.equal((await top(NEXT, 40, { time_ms: 51 })).placement, 1);
  assert.equal((await top(NEXT, 40, { time_ms: 1 })).placement, null);
  assert.equal((await top(NEXT, 40)).placement, null);
  assert.equal((await submit(NEXT, 40, { time_ms: 51 })).data.rank, 1);
  console.log(`PASS board ${NEXT} uses ascending scores, descending meta and matching SQL/JS boundary rules`);
  for (const board of [0, -987654321]) {
    assert.equal((await submit(board, 101, { time_ms: 50 })).data.error, 'bad_score');
    assert.equal((await submit(board, 50, { time_ms: 50, extra: 1 })).status, 200);
    await submit(board, 40, { time_ms: 12 });
    assert.deepEqual((await top(board)).scores.map(row => row.score), [40, 50]);
    assert.equal((await top(board, 39)).placement, 1);
  }
  console.log('PASS zero and negative test boards use the newest positive board rules');
} finally {
  if (worker) {
    try { process.kill(-worker.pid, 'SIGTERM'); } catch (_) {}
    await new Promise(resolve => { if (worker.exitCode !== null) resolve(); else { worker.once('close', resolve); setTimeout(resolve, 3000).unref(); } });
  }
  await rm(fixture, { recursive: true, force: true });
}
