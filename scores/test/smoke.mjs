import assert from 'node:assert/strict';
import { randomUUID, randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const BASE = (process.env.BASE || 'http://localhost:8787').replace(/\/$/, '');
const blocked = JSON.parse(await readFile(new URL('../blocklist.json', import.meta.url)));
const TEST_BOARD = -randomInt(1, 2 ** 48 - 1);
let failures = 0, cases = 0, skipped = 0;
async function test(name, fn) {
  cases++;
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
async function request(path, options) {
  const response = await fetch(BASE + path, { ...options, signal: AbortSignal.timeout(10000) });
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  return { response, data: await response.json() };
}
const top = (game, score, meta) => {
  const query = new URLSearchParams({ game, board: TEST_BOARD });
  if (score !== undefined) query.set('score', score);
  if (meta !== undefined) query.set('meta', JSON.stringify(meta));
  return request('/v1/top?' + query).then(({ response, data }) => { assert.equal(response.status, 200); return data; });
};
const run = (game = 'thimbleful', changes = {}) => ({ game, board: TEST_BOARD, run_id: randomUUID(), name: 'JON', score: 38, input: 'keys', ...changes });
const submit = data => request('/v1/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const accepted = async payload => {
  const { response, data } = await submit(payload);
  assert.equal(response.status, 200); assert.equal(data.ok, true); assert.ok(Number.isInteger(data.id)); return data;
};

await test('preflight on any path', async () => {
  const { response } = await request('/anything', { method: 'OPTIONS' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'Content-Type');
});
await test('empty test boards (required before this run)', async () => {
  for (const game of ['thimbleful', 'dont-step-on-the-crack']) {
    const data = await top(game);
    assert.deepEqual(data.scores, [], `${game} random negative test board must start empty`);
    assert.equal('placement' in data, false);
    assert.equal((await top(game, 0)).placement, 1);
  }
});
if (failures) process.exit(1); // Never delete remote scores to prepare a test.

let original, originalPayload;
await test('Thimbleful keys submit and idempotent retry', async () => {
  const payload = run('thimbleful', { meta: { time_ms: 61000 } });
  originalPayload = payload;
  original = await accepted(payload);
  const again = await accepted(payload);
  assert.equal(again.id, original.id); assert.equal(again.rank, original.rank);
  assert.equal(again.scores.length, 1); assert.equal(again.scores[0].input, 'keys');
});
await test('Crack touch submit', async () => {
  const data = await accepted(run('dont-step-on-the-crack', { score: 412, input: 'touch', meta: { time_ms: 93000, steps: 410, streak: 61 } }));
  assert.equal(data.rank, 1); assert.equal(data.scores[0].input, 'touch'); assert.equal(data.scores[0].meta.streak, 61);
});
await test('submit without meta', async () => {
  const data = await accepted(run('thimbleful', { name: 'OLD', score: 11 }));
  assert.equal(data.scores.find(row => row.name === 'OLD').meta, null);
});
await test('Crack time tie-break, absent time last, earlier exact tie wins', async () => {
  await accepted(run('dont-step-on-the-crack', { name: 'NON', score: 700 }));
  await accepted(run('dont-step-on-the-crack', { name: 'SLW', score: 700, meta: { time_ms: 2000 } }));
  await accepted(run('dont-step-on-the-crack', { name: 'FST', score: 700, meta: { time_ms: 1000 } }));
  await accepted(run('dont-step-on-the-crack', { name: 'TIE', score: 700, meta: { time_ms: 1000 } }));
  const data = await top('dont-step-on-the-crack');
  assert.deepEqual(data.scores.slice(0, 4).map(row => row.name), ['FST', 'TIE', 'SLW', 'NON']);
  assert.equal((await top('dont-step-on-the-crack', 700, { time_ms: 1500 })).placement, 3);
  assert.equal((await top('dont-step-on-the-crack', 700)).placement, 5);
});
await test('full board: winning, losing, exact 50th tie, and rank outside 50', async () => {
  for (let i = 0; i < 50; i++) await accepted(run('thimbleful', { score: 500 + i }));
  const full = await top('thimbleful'); assert.equal(full.scores.length, 50);
  assert.equal((await top('thimbleful', 10000)).placement, 1);
  assert.equal((await top('thimbleful', 0)).placement, null);
  assert.equal((await top('thimbleful', full.scores[49].score)).placement, null);
  const tied = await accepted(run('thimbleful', { score: full.scores[49].score })); assert.equal(tied.rank, null);
  const outside = await accepted(run('thimbleful', { score: 0 }));
  assert.equal(outside.rank, null);
  const retry = await accepted(originalPayload);
  assert.equal(retry.id, original.id); assert.equal(retry.rank, null);
});
await test('SQL and candidate comparator agree at Crack 50th boundary', async () => {
  for (let i = 0; i < 50; i++) await accepted(run('dont-step-on-the-crack', { score: 900, meta: { time_ms: 1000 + i } }));
  const full = await top('dont-step-on-the-crack'); assert.equal(full.scores.length, 50);
  assert.equal((await top('dont-step-on-the-crack', 900, { time_ms: 1048 })).placement, 50);
  assert.equal((await top('dont-step-on-the-crack', 900, { time_ms: 1049 })).placement, null);
  assert.equal((await top('dont-step-on-the-crack', 900)).placement, null);
  const winning = await accepted(run('dont-step-on-the-crack', { score: 900, meta: { time_ms: 1048 } }));
  assert.equal(winning.rank, 50);
});

for (const [code, changes] of [
  ['bad_game', { game: 'missing' }], ['bad_game', { game: 'toString' }],
  ['bad_board', { board: 999 }], ['bad_board', { board: '0' }],
  ['bad_run_id', { run_id: 'short' }], ['bad_run_id', { run_id: 'x'.repeat(65) }],
  ['bad_name', { name: 'ab!' }], ['bad_score', { score: 1.5 }], ['bad_score', { score: -1 }],
  ['bad_score', { score: 10001 }], ['bad_input', { input: 'mouse' }],
  ['bad_meta', { meta: null }], ['bad_meta', { meta: [] }], ['bad_meta', { meta: { unknown: 1 } }],
  ['bad_meta', { meta: { time_ms: -1 } }], ['bad_meta', { meta: { time_ms: 86400001 } }],
  ['bad_meta', { meta: { time_ms: 1.5 } }]
]) await test(`validation ${code} ${JSON.stringify(changes)}`, async () => {
  const { response, data } = await submit(run('thimbleful', changes));
  assert.equal(response.status, 400); assert.deepEqual(data, { ok: false, error: code });
});
if (blocked.length) {
  await test('blocklisted name', async () => {
    const { response, data } = await submit(run('thimbleful', { name: blocked[0] }));
    assert.equal(response.status, 400); assert.equal(data.error, 'name_not_allowed');
  });
} else {
  cases++; skipped++;
  console.log('SKIP blocklisted name: blocklist is intentionally empty');
}
await test('query validation and malformed meta', async () => {
  for (const [query, code] of [
    ['game=thimbleful&board=', 'bad_board'], [`game=thimbleful&board=${TEST_BOARD}&score=1.5`, 'bad_score'],
    [`game=thimbleful&board=${TEST_BOARD}&meta=oops`, 'bad_meta'], [`game=thimbleful&board=${TEST_BOARD}&meta=null`, 'bad_meta']
  ]) { const { response, data } = await request('/v1/top?' + query); assert.equal(response.status, 400); assert.equal(data.error, code); }
});
await test('malformed JSON and body over 2 KB', async () => {
  for (const [body, code] of [['{', 'bad_json'], ['null', 'bad_json'], ['[]', 'bad_json'], [' '.repeat(2049), 'body_too_large']]) {
    const { response, data } = await request('/v1/submit', { method: 'POST', body });
    assert.equal(response.status, 400); assert.equal(data.error, code);
  }
});
await test('unknown path', async () => {
  const { response, data } = await request('/v1/missing'); assert.equal(response.status, 404); assert.equal(data.error, 'not_found');
});
console.log(`${cases - failures - skipped} passed, ${failures} failed, ${skipped} skipped; test board ${TEST_BOARD} only at ${BASE}`);
process.exitCode = failures ? 1 : 0;
