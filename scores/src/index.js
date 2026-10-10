import games from '../games.json';
import blocklist from '../blocklist.json';

const LIMIT = 50;
const TOKEN_TTL = 24 * 60 * 60 * 1000; // a token is good for one run of up to a day
const TIME_SLACK = 5000;               // covers a start request retried a few seconds into the run
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
const fail = (error, status = 400) => reply({ ok: false, error }, status);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const owns = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

function rulesFor(game, board) {
  const boards = games[game].boards;
  // Test boards follow the latest positive board without changing historical rules.
  const number = board <= 0 ? Math.max(...Object.keys(boards).map(Number)) : board;
  return boards[number];
}
// Only boards with a score cap take new runs. Older boards stay readable.
const accepting = rules => object(rules.plausible) && owns(rules.meta, 'time_ms');

// Run tokens: "<run_id>.<issued ms>.<HMAC>", signed for one game and board. Nothing is stored.
const encoder = new TextEncoder();
// The signature's last character must be canonical (its two spare bits zero), so each token has exactly one spelling.
const TOKEN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(\d{13})\.([A-Za-z0-9_-]{42}[AEIMQUYcgkosw048])$/;
const hmacKey = secret => crypto.subtle.importKey('raw', encoder.encode(secret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
const signed = (game, board, runId, issued) => encoder.encode(`${game}|${board}|${runId}|${issued}`);
const toBase64Url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = text => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function issueToken(secret, game, board) {
  const runId = crypto.randomUUID(), issued = Date.now();
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret), signed(game, board, runId, issued));
  return `${runId}.${issued}.${toBase64Url(sig)}`;
}

// Returns the run ID, or the name of the check that failed.
async function checkRun(secret, data, rules) {
  const match = typeof data.token === 'string' && TOKEN.exec(data.token);
  if (!match) return { reason: 'token' };
  const [, runId, issuedText, sig] = match, issued = Number(issuedText);
  // verify() compares in constant time
  if (!await crypto.subtle.verify('HMAC', await hmacKey(secret), fromBase64Url(sig), signed(data.game, data.board, runId, issued))) {
    return { reason: 'token' };
  }
  const age = Date.now() - issued, ms = data.meta.time_ms, cap = rules.plausible;
  if (age > TOKEN_TTL) return { reason: 'expired' };
  if (age < ms - TIME_SLACK) return { reason: 'time' };   // the run can't outlast its token
  if (data.score > cap.perSecond * ms / 1000 + cap.grace) return { reason: 'score' };
  return { runId };
}

function validate(game, board, score, meta, withScore) {
  if (typeof game !== 'string' || !owns(games, game)) return 'bad_game';
  if (!Number.isSafeInteger(board) || (board > 0 && !owns(games[game].boards, board))) return 'bad_board';
  const rules = rulesFor(game, board);
  if (withScore && (!Number.isInteger(score) || score < 0 || score > rules.maxScore)) return 'bad_score';
  if (meta !== undefined && (!object(meta) || Object.entries(meta).some(([key, value]) =>
    !owns(rules.meta, key) || !Number.isInteger(value) ||
    value < rules.meta[key].min || value > rules.meta[key].max))) return 'bad_meta';
  return null;
}

// Only trusted rules contribute SQL. Equal entries stay in their original order.
function order(rules) {
  const fields = [`score ${rules.higherIsBetter ? 'DESC' : 'ASC'}`];
  for (const [key, direction] of rules.tieBreak) {
    if (!owns(rules.meta, key) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || !['asc', 'desc'].includes(direction)) {
      throw new Error('Invalid tieBreak configuration');
    }
    fields.push(`json_extract(meta, '$.${key}') ${direction.toUpperCase()} NULLS LAST`);
  }
  return [...fields, 'created_at ASC', 'id ASC'].join(', ');
}

// Negative means a ranks ahead of b. A prospective run loses every exact tie.
function compare(a, b, rules) {
  const score = rules.higherIsBetter ? b.score - a.score : a.score - b.score;
  if (score) return score;
  for (const [key, direction] of rules.tieBreak) {
    const av = a.meta?.[key], bv = b.meta?.[key];
    if (av == null && bv != null) return 1;
    if (av != null && bv == null) return -1;
    if (av != null && bv != null && av !== bv) return direction === 'asc' ? av - bv : bv - av;
  }
  return 0;
}

// Where a run stands on the whole board, not just the top 50: how many saved rows rank ahead of it, by the same
// rules as order() and compare(). A run that hasn't been saved yet (no id) loses every exact tie, as in placement;
// a saved row is behind exact ties saved before it. Only trusted rules contribute SQL; values are bound.
function aheadOf(rules, score, meta, saved) {
  const binds = [];
  const level = i => {
    if (i === rules.tieBreak.length) {
      if (!saved) return '1';
      binds.push(saved.created_at, saved.created_at, saved.id);
      return '(created_at < ? OR (created_at = ? AND id < ?))';
    }
    const [key, direction] = rules.tieBreak[i];
    if (!owns(rules.meta, key) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) throw new Error('Invalid tieBreak configuration');
    const col = `json_extract(meta, '$.${key}')`, value = meta?.[key];
    if (value == null) return `(${col} IS NOT NULL OR (${col} IS NULL AND ${level(i + 1)}))`;
    binds.push(value, value);
    return `(${col} IS NOT NULL AND (${col} ${direction === 'asc' ? '<' : '>'} ? OR (${col} = ? AND ${level(i + 1)})))`;
  };
  binds.push(score, score);
  const sql = `(score ${rules.higherIsBetter ? '>' : '<'} ? OR (score = ? AND ${level(0)}))`;
  return { sql, binds };
}
// Resolves to { position, total }: the run's standing (1 = first) and how many runs the board holds,
// counting the run itself when it isn't saved yet.
async function standing(db, game, board, score, meta, saved) {
  const ahead = aheadOf(rulesFor(game, board), score, meta, saved);
  const row = await db.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(${ahead.sql}), 0) AS ahead
    FROM scores WHERE game = ? AND board = ?`).bind(...ahead.binds, game, board).first();
  return { position: row.ahead + 1, total: row.total + (saved ? 0 : 1) };
}

async function top(db, game, board) {
  const { results } = await db.prepare(`SELECT id, name, score, input, meta FROM scores
    WHERE game = ? AND board = ? ORDER BY ${order(rulesFor(game, board))} LIMIT ${LIMIT}`)
    .bind(game, board).all();
  return results.map((row, i) => ({ ...row, meta: row.meta === null ? null : JSON.parse(row.meta), rank: i + 1 }));
}
const publicRows = rows => rows.map(({ id, ...row }) => row);

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return { error: 'bad_json' };
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) { await reader.cancel(); return { error: 'body_too_large' }; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return object(data) ? { data } : { error: 'bad_json' };
  } catch (_) { return { error: 'bad_json' }; }
}

async function handle(request, env) {
  if (request.method === 'OPTIONS') return reply({ ok: true });
  const url = new URL(request.url);
  // v1 is retired. Old copies of leaderboard.js treat this like the Worker being down: the game carries on without a board.
  if (url.pathname.startsWith('/v1/')) return fail('gone', 410);
  if (request.method === 'GET' && url.pathname === '/v2/top') {
    const q = url.searchParams, game = q.get('game');
    const board = /^-?\d+$/.test(q.get('board') || '') ? Number(q.get('board')) : NaN;
    const withScore = q.has('score');
    const score = /^\d+$/.test(q.get('score') || '') ? Number(q.get('score')) : NaN;
    let meta;
    if (q.has('meta')) {
      try { meta = JSON.parse(q.get('meta')); } catch (_) { return fail('bad_meta'); }
    }
    const error = validate(game, board, score, meta, withScore);
    if (error) return fail(error);
    const rows = await top(env.DB, game, board);
    const result = { ok: true, game, board, scores: publicRows(rows) };
    if (withScore) {
      const index = rows.findIndex(row => compare({ score, meta }, row, rulesFor(game, board)) < 0);
      result.placement = index >= 0 ? index + 1 : rows.length < LIMIT ? rows.length + 1 : null;
      // Where the run would stand on the whole board if saved, so any run can be offered initials.
      Object.assign(result, await standing(env.DB, game, board, score, meta));
    }
    return reply(result);
  }
  if (request.method === 'POST' && url.pathname === '/v2/start') {
    const body = await readBody(request);
    if (body.error) return fail(body.error);
    const { game, board } = body.data;
    const error = validate(game, board, undefined, undefined, false);
    if (error) return fail(error);
    if (!accepting(rulesFor(game, board))) return fail('bad_board');
    if (!env.RUN_SECRET) return fail('unavailable', 503);
    return reply({ ok: true, token: await issueToken(env.RUN_SECRET, game, board) });
  }
  if (request.method === 'POST' && url.pathname === '/v2/submit') {
    const body = await readBody(request);
    if (body.error) return fail(body.error);
    const data = body.data;
    const error = validate(data.game, data.board, data.score, data.meta, true);
    if (error) return fail(error);
    const rules = rulesFor(data.game, data.board);
    if (!accepting(rules)) return fail('bad_board');
    if (!Number.isInteger(data.meta?.time_ms)) return fail('bad_meta');
    if (typeof data.name !== 'string' || !/^[A-Z0-9]{3}$/.test(data.name)) return fail('bad_name');
    if (blocklist.includes(data.name)) return fail('name_not_allowed');
    if (!['touch', 'keys'].includes(data.input)) return fail('bad_input');
    if (!env.RUN_SECRET) return fail('unavailable', 503);
    const run = await checkRun(env.RUN_SECRET, data, rules);
    if (run.reason) {
      // The player isn't told why. The log is for Jonnie; it never includes the IP.
      console.log(JSON.stringify({ rejected: run.reason, game: data.game, board: data.board, score: data.score, time_ms: data.meta.time_ms }));
      return fail('rejected');
    }
    const saved = () => env.DB.prepare('SELECT id, game, board, score, meta, created_at FROM scores WHERE run_id = ?').bind(run.runId).first();
    // A repeat of a saved run (say, a retry after a lost response) returns that row and costs nothing.
    let row = await saved();
    if (!row) {
      // Counted only for new rows, keyed on the connection in memory only.
      if (env.SUBMITS) {
        const { success } = await env.SUBMITS.limit({ key: request.headers.get('cf-connecting-ip') || 'unknown' });
        if (!success) return fail('rate_limited', 429);
      }
      await env.DB.prepare(`INSERT INTO scores (game, board, run_id, name, score, input, meta)
        VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO NOTHING`)
        .bind(data.game, data.board, run.runId, data.name, data.score, data.input, JSON.stringify(data.meta)).run();
      row = await saved();
    }
    const rows = await top(env.DB, row.game, row.board);
    const where = await standing(env.DB, row.game, row.board, row.score, row.meta === null ? null : JSON.parse(row.meta), row);
    return reply({ ok: true, id: row.id, rank: rows.find(r => r.id === row.id)?.rank ?? null, ...where, scores: publicRows(rows) });
  }
  return fail('not_found', 404);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (_) { return fail('unavailable', 503); }
  }
};
