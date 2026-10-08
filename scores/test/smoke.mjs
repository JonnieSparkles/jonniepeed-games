// Smoke test for the scores Worker. Writes only to a new random negative test board.
// Live (BASE=https://scores.jonniepeed.games): checks real runs end to end with a handful of saved rows.
// Local (default, against `wrangler dev --var RUN_SECRET:local-dev-only`): also signs its own backdated
// tokens to fill boards and test ranking, expiry and the rate limit.
import assert from 'node:assert/strict';
import { randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { forge, LOCAL_SECRET } from './tokens.mjs';

const BASE = (process.env.BASE || 'http://localhost:8787').replace(/\/$/, '');
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE);
const SECRET = LOCAL ? process.env.RUN_SECRET || LOCAL_SECRET : null;
const LOCAL_ONLY = 'needs the local Worker (signs its own tokens)';
const blocked = JSON.parse(await readFile(new URL('../blocklist.json', import.meta.url)));
const TEST_BOARD = -randomInt(1, 2 ** 48 - 1);
const TOKEN = /^[0-9a-f-]{36}\.\d{13}\.[A-Za-z0-9_-]{43}$/;
let failures = 0, cases = 0, skipped = 0;
async function test(name, fn, skip) {
  cases++;
  if (skip) { skipped++; console.log(`SKIP ${name}: ${skip}`); return; }
  try { await fn(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// Locally, each request can claim its own connection so the rate limit stays out of the way.
// Cloudflare replaces this header in production.
const randomIp = () => `10.${randomInt(256)}.${randomInt(256)}.${randomInt(1, 255)}`;
async function request(path, options = {}, ip = LOCAL ? randomIp() : undefined) {
  const headers = { ...options.headers, ...(ip ? { 'cf-connecting-ip': ip } : {}) };
  const response = await fetch(BASE + path, { ...options, headers, signal: AbortSignal.timeout(10000) });
  assert.equal(response.headers.get('access-control-allow-origin'), '*');
  return { response, data: await response.json() };
}
const post = data => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const top = (game, score, meta) => {
  const query = new URLSearchParams({ game, board: TEST_BOARD });
  if (score !== undefined) query.set('score', score);
  if (meta !== undefined) query.set('meta', JSON.stringify(meta));
  return request('/v2/top?' + query).then(({ response, data }) => { assert.equal(response.status, 200); return data; });
};
async function start(game, board = TEST_BOARD) {
  const { response, data } = await request('/v2/start', post({ game, board }));
  assert.equal(response.status, 200); assert.match(data.token, TOKEN);
  return data.token;
}
// A finished run on the test board. Ten minutes of play keeps every score used here under the cap.
const run = (game = 'thimbleful', changes = {}) => ({
  game, board: TEST_BOARD, name: 'JON', score: 38, input: 'keys', meta: { time_ms: 600000 },
  token: SECRET ? forge(SECRET, game, TEST_BOARD) : null, ...changes
});
const submit = (data, ip) => request('/v2/submit', post(data), ip);
const accepted = async (payload, ip) => {
  const { response, data } = await submit(payload, ip);
  assert.equal(response.status, 200, JSON.stringify(data)); assert.equal(data.ok, true); assert.ok(Number.isInteger(data.id)); return data;
};
const rejected = async payload => {
  const { response, data } = await submit(payload);
  assert.equal(response.status, 400); assert.deepEqual(data, { ok: false, error: 'rejected' });
};

await test('preflight on any path', async () => {
  const { response } = await request('/anything', { method: 'OPTIONS' });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-methods'), 'GET, POST, OPTIONS');
  assert.equal(response.headers.get('access-control-allow-headers'), 'Content-Type');
});
await test('v1 is retired', async () => {
  for (const [path, options] of [['/v1/top?game=thimbleful&board=1', {}], ['/v1/submit', post({})], ['/v1/missing', {}]]) {
    const { response, data } = await request(path, options);
    assert.equal(response.status, 410); assert.deepEqual(data, { ok: false, error: 'gone' });
  }
});
await test('empty test boards (required before this run)', async () => {
  for (const game of ['thimbleful', 'dont-step-on-a-crack']) {
    const data = await top(game);
    assert.deepEqual(data.scores, [], `${game} random negative test board must start empty`);
    assert.equal('placement' in data, false);
    assert.equal((await top(game, 0)).placement, 1);
  }
});
if (failures) process.exit(1); // Never delete remote scores to prepare a test.

await test('start issues tokens only for boards that take new scores', async () => {
  await start('thimbleful'); await start('dont-step-on-a-crack');
  for (const [body, code] of [
    [{ game: 'thimbleful', board: 1 }, 'bad_board'], [{ game: 'thimbleful', board: '0' }, 'bad_board'],
    [{ game: 'missing', board: TEST_BOARD }, 'bad_game']
  ]) {
    const { response, data } = await request('/v2/start', post(body));
    assert.equal(response.status, 400); assert.deepEqual(data, { ok: false, error: code });
  }
});
let original, originalPayload;
await test('a real run saves once', async () => {
  const token = await start('thimbleful');
  await sleep(1500);
  originalPayload = { game: 'thimbleful', board: TEST_BOARD, token, name: 'JON', score: 19, input: 'keys', meta: { time_ms: 1000 } };
  original = await accepted(originalPayload);
  assert.equal(original.rank, 1); assert.equal(original.scores[0].input, 'keys');
  const again = await accepted(originalPayload);
  const changed = await accepted({ ...originalPayload, score: 5 });
  assert.equal(again.id, original.id); assert.equal(changed.id, original.id);
  assert.equal(changed.scores.length, 1); assert.equal(changed.scores[0].score, 19);
});
await test('refused runs say only "rejected"', async () => {
  const token = await start('thimbleful');
  const fresh = { game: 'thimbleful', board: TEST_BOARD, token, name: 'BAD', score: 10, input: 'keys', meta: { time_ms: 1000 } };
  await rejected({ ...fresh, token: undefined });
  await rejected({ ...fresh, token: 'not-a-token' });
  const flip = (text, i) => text.slice(0, i) + (text[i] === 'A' ? 'B' : 'A') + text.slice(i + 1);
  await rejected({ ...fresh, token: flip(token, token.length - 10) });        // altered signature
  await rejected({ ...fresh, token: token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A') }); // non-canonical last character
  await rejected({ ...fresh, game: 'dont-step-on-a-crack' });                // signed for another game
  await rejected({ ...fresh, board: TEST_BOARD - 1 });                       // signed for another board
  await rejected({ ...fresh, meta: { time_ms: 60000 } });                    // longer than the token has existed
  await rejected({ ...fresh, score: 20 });                                   // over 4.5 points/s + 15
  assert.equal((await top('thimbleful')).scores.length, 1);
});
await test('expired token', async () => {
  await rejected(run('thimbleful', { token: forge(SECRET, 'thimbleful', TEST_BOARD, { age: 25 * 60 * 60 * 1000 }) }));
}, !SECRET && LOCAL_ONLY);
await test('Crack touch submit', async () => {
  const data = await accepted(run('dont-step-on-a-crack', { score: 50, input: 'touch', meta: { time_ms: 93000, steps: 410, streak: 61 } }));
  assert.equal(data.rank, 1); assert.equal(data.scores[0].input, 'touch'); assert.equal(data.scores[0].meta.streak, 61);
}, !SECRET && LOCAL_ONLY);
await test('Crack time tie-break, earlier exact tie wins', async () => {
  await accepted(run('dont-step-on-a-crack', { name: 'SLW', score: 100, meta: { time_ms: 2000 } }));
  await accepted(run('dont-step-on-a-crack', { name: 'FST', score: 100, meta: { time_ms: 1000 } }));
  await accepted(run('dont-step-on-a-crack', { name: 'TIE', score: 100, meta: { time_ms: 1000 } }));
  const data = await top('dont-step-on-a-crack');
  assert.deepEqual(data.scores.slice(0, 4).map(row => row.name), ['FST', 'TIE', 'SLW', 'JON']);
  assert.equal((await top('dont-step-on-a-crack', 100, { time_ms: 1500 })).placement, 3);
  assert.equal((await top('dont-step-on-a-crack', 100)).placement, 4);
}, !SECRET && LOCAL_ONLY);
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
}, !SECRET && LOCAL_ONLY);
await test('SQL and candidate comparator agree at Crack 50th boundary', async () => {
  for (let i = 0; i < 50; i++) await accepted(run('dont-step-on-a-crack', { score: 102, meta: { time_ms: 1000 + i } }));
  const full = await top('dont-step-on-a-crack'); assert.equal(full.scores.length, 50);
  assert.equal((await top('dont-step-on-a-crack', 102, { time_ms: 1048 })).placement, 50);
  assert.equal((await top('dont-step-on-a-crack', 102, { time_ms: 1049 })).placement, null);
  assert.equal((await top('dont-step-on-a-crack', 102)).placement, null);
  const winning = await accepted(run('dont-step-on-a-crack', { score: 102, meta: { time_ms: 1048 } }));
  assert.equal(winning.rank, 50);
}, !SECRET && LOCAL_ONLY);
await test('rate limit: 20 saved runs a minute per connection, refusals not counted', async () => {
  const ip = randomIp();
  let saved = 0, limited = null;
  // Up to 41 tries, in case the burst straddles the limiter's one-minute window.
  for (let i = 0; i < 41 && !limited; i++) {
    const { response, data } = await submit(run('thimbleful', { score: 1 }), ip);
    if (response.status === 200) saved++;
    else limited = { status: response.status, data };
  }
  assert.ok(saved >= 20, `only ${saved} saved before the limit`);
  assert.deepEqual(limited, { status: 429, data: { ok: false, error: 'rate_limited' } });
  const { response, data } = await submit(run('thimbleful', { token: 'not-a-token' }), ip);
  assert.equal(response.status, 400); assert.equal(data.error, 'rejected');
}, !SECRET && LOCAL_ONLY);

for (const [code, changes] of [
  ['bad_game', { game: 'missing' }], ['bad_game', { game: 'toString' }],
  ['bad_board', { board: 999 }], ['bad_board', { board: '0' }], ['bad_board', { board: 1 }],
  ['bad_name', { name: 'ab!' }], ['bad_score', { score: 1.5 }], ['bad_score', { score: -1 }],
  ['bad_score', { score: 10001 }], ['bad_input', { input: 'mouse' }],
  ['bad_meta', { meta: undefined }], ['bad_meta', { meta: {} }],
  ['bad_meta', { meta: null }], ['bad_meta', { meta: [] }], ['bad_meta', { meta: { time_ms: 1000, unknown: 1 } }],
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
  ]) { const { response, data } = await request('/v2/top?' + query); assert.equal(response.status, 400); assert.equal(data.error, code); }
});
await test('malformed JSON and body over 2 KB', async () => {
  for (const path of ['/v2/start', '/v2/submit']) {
    for (const [body, code] of [['{', 'bad_json'], ['null', 'bad_json'], ['[]', 'bad_json'], [' '.repeat(2049), 'body_too_large']]) {
      const { response, data } = await request(path, { method: 'POST', body });
      assert.equal(response.status, 400); assert.equal(data.error, code);
    }
  }
});
await test('unknown path', async () => {
  for (const path of ['/v2/missing', '/v3/top']) {
    const { response, data } = await request(path); assert.equal(response.status, 404); assert.equal(data.error, 'not_found');
  }
});
console.log(`${cases - failures - skipped} passed, ${failures} failed, ${skipped} skipped; test board ${TEST_BOARD} only at ${BASE}`);
process.exitCode = failures ? 1 : 0;
