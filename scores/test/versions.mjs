// Isolated local integration test: historical boards and newest-rule test boards.
// Uses an ephemeral Worker/D1 copy. It never contacts a deployed Worker.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';

const root = new URL('../', import.meta.url);
const fixture = await mkdtemp(join(tmpdir(), 'jpg-board-versions-'));
const wrangler = process.env.WRANGLER || 'wrangler';
const env = { ...process.env, CLOUDFLARE_SEND_METRICS: 'false' };
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
  const oldRules = structuredClone(games.thimbleful.boards['1']);
  games.thimbleful.boards['2'] = {
    higherIsBetter: false, maxScore: 100,
    meta: { time_ms: { min: 0, max: 100 }, extra: { min: 0, max: 10 } },
    tieBreak: [['time_ms', 'desc']]
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
  const dev = command(['dev', '--local', '--ip', '127.0.0.1', '--port', String(port), '--log-level', 'error']);
  worker = dev.child;
  let exited = null;
  dev.done.catch(error => { exited = error; });
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (exited) throw exited;
    try { const r = await fetch(base + '/v1/top?game=thimbleful&board=1', { signal: AbortSignal.timeout(500) }); if (r.ok) { ready = true; break; } } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Worker failed to start: ${dev.output()}`);
  const blocklist = JSON.parse(await readFile(join(fixture, 'blocklist.json')));
  const name = ['AAA', 'JON', 'TST', '123'].find(s => !blocklist.includes(s));
  assert.ok(name, 'Need an allowed fixture name');
  async function submit(board, score, meta, initials = name) {
    const response = await fetch(base + '/v1/submit', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: 'thimbleful', board, run_id: randomUUID(), name: initials, score, input: 'keys', ...(meta === undefined ? {} : { meta }) })
    });
    return { status: response.status, data: await response.json() };
  }
  async function top(board, score, meta) {
    const query = new URLSearchParams({ game: 'thimbleful', board });
    if (score !== undefined) query.set('score', score);
    if (meta !== undefined) query.set('meta', JSON.stringify(meta));
    const response = await fetch(base + '/v1/top?' + query); assert.equal(response.status, 200);
    return response.json();
  }
  assert.deepEqual(games.thimbleful.boards['1'], oldRules);
  const refused = await submit(1, 38, undefined, 'TST');
  assert.equal(refused.status, 400); assert.equal(refused.data.error, 'name_not_allowed');
  console.log('PASS blocklist validation with an isolated test-only name');
  assert.equal((await submit(1, 101, { time_ms: 999 })).status, 200);
  assert.equal((await submit(2, 101)).data.error, 'bad_score');
  assert.equal((await submit(2, 50, { time_ms: 999 })).data.error, 'bad_meta');
  assert.equal((await submit(1, 50, { extra: 1 })).data.error, 'bad_meta');
  assert.equal((await submit(2, 50, { extra: 1 })).status, 200);
  console.log('PASS board 1 retains its score and meta validation after board 2 is added');
  await submit(1, 40); await submit(1, 50);
  assert.deepEqual((await top(1)).scores.map(row => row.score), [101, 50, 40]);
  assert.equal((await top(1, 102)).placement, 1);
  assert.equal((await top(1, 0)).placement, 4);
  console.log('PASS historical board keeps descending order and candidate placement');
  for (let i = 1; i <= 50; i++) assert.equal((await submit(2, 40, { time_ms: i })).status, 200);
  const rows = (await top(2)).scores;
  assert.equal(rows.length, 50); assert.equal(rows[0].meta.time_ms, 50); assert.equal(rows[49].meta.time_ms, 1);
  assert.equal((await top(2, 39)).placement, 1);
  assert.equal((await top(2, 40, { time_ms: 51 })).placement, 1);
  assert.equal((await top(2, 40, { time_ms: 1 })).placement, null);
  assert.equal((await top(2, 40)).placement, null);
  assert.equal((await submit(2, 40, { time_ms: 51 })).data.rank, 1);
  console.log('PASS board 2 uses ascending scores, descending meta and matching SQL/JS boundary rules');
  for (const board of [0, -987654321]) {
    assert.equal((await submit(board, 101)).data.error, 'bad_score');
    assert.equal((await submit(board, 50, { extra: 1 })).status, 200);
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
