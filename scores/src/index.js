import games from '../games.json';
import blocklist from '../blocklist.json';

const LIMIT = 50;
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
  if (request.method === 'GET' && url.pathname === '/v1/top') {
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
    }
    return reply(result);
  }
  if (request.method === 'POST' && url.pathname === '/v1/submit') {
    const body = await readBody(request);
    if (body.error) return fail(body.error);
    const data = body.data;
    const error = validate(data.game, data.board, data.score, data.meta, true);
    if (error) return fail(error);
    if (typeof data.run_id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(data.run_id)) return fail('bad_run_id');
    if (typeof data.name !== 'string' || !/^[A-Z0-9]{3}$/.test(data.name)) return fail('bad_name');
    if (blocklist.includes(data.name)) return fail('name_not_allowed');
    if (!['touch', 'keys'].includes(data.input)) return fail('bad_input');
    await env.DB.prepare(`INSERT INTO scores (game, board, run_id, name, score, input, meta)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_id) DO NOTHING`)
      .bind(data.game, data.board, data.run_id, data.name, data.score, data.input,
        data.meta === undefined ? null : JSON.stringify(data.meta)).run();
    const row = await env.DB.prepare('SELECT id, game, board FROM scores WHERE run_id = ?').bind(data.run_id).first();
    const rows = await top(env.DB, row.game, row.board);
    return reply({ ok: true, id: row.id, rank: rows.find(r => r.id === row.id)?.rank ?? null, scores: publicRows(rows) });
  }
  return fail('not_found', 404);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (_) { return fail('unavailable', 503); }
  }
};
