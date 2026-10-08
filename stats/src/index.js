// Play stats (SPEC-009). Games report each run here; the private dashboards at /dash/ read it back.
// Writes are open to any page, like the scores API. Reads sit behind Cloudflare Access (see access.js).
import games from '../games.json';
import page from './dash.html';
import { checkAccess } from './access.js';

const TEST = 'test';                      // accepted for smoke tests and deploy checks, never shown on a dashboard
const MAX_BODY = 8192;                    // above the largest valid report (24 long keys, 40 escaped characters each)
const MAX_TIME = 24 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const REPORT_CAP = 2000;                  // runs a per-game dashboard reads for its spreads
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const HOST = /^[a-z0-9](?:[a-z0-9.-]{0,98}[a-z0-9])?$/;
const STAT_KEY = /^[a-z][a-z0-9_]{0,31}$/;
const ONE_OF = {
  device: ['phone', 'tablet', 'desktop'], orientation: ['portrait', 'landscape'],
  outcome: ['over', 'won', 'quit'], input: ['touch', 'keys']
};
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

const own = (obj, key) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(obj, key);
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// The write API answers any origin, like the scores API. No cookies.
const API_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store'
};
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: API_HEADERS });
const fail = (error, status = 400) => reply({ ok: false, error }, status);

// The dashboards are same-origin only and never cached or indexed.
const PRIVATE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'self'; " +
  "base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...PRIVATE, 'Content-Type': 'application/json; charset=utf-8' } });
const html = (body, status = 200) => new Response(body, { status, headers: { ...PRIVATE, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': CSP } });
const note = (title, text) => `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;margin:2rem;max-width:36rem"><h1 style="font-size:1.3rem">${title}</h1><p>${text}</p>`;

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return { error: 'bad_json' };
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); return { error: 'body_too_large' }; }
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

// A game's own numbers: up to 24 short keys, each a finite number, a boolean or text of up to 40 characters.
function goodStats(stats) {
  if (!object(stats)) return false;
  const entries = Object.entries(stats);
  return entries.length <= 24 && entries.every(([key, value]) => STAT_KEY.test(key) && (
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e12) ||
    (typeof value === 'string' && value.length <= 40)));
}

// Returns the name of the first field that's wrong, or null.
function check(data, end) {
  if (typeof data.run !== 'string' || !UUID.test(data.run)) return 'bad_run';
  if (typeof data.visit !== 'string' || !UUID.test(data.visit)) return 'bad_visit';
  if (data.game !== TEST && !own(games, data.game)) return 'bad_game';
  if (data.board != null && !Number.isSafeInteger(data.board)) return 'bad_board';
  if (!ONE_OF.device.includes(data.device)) return 'bad_device';
  if (!ONE_OF.orientation.includes(data.orientation)) return 'bad_orientation';
  if (typeof data.host !== 'string' || !HOST.test(data.host)) return 'bad_host';
  if (data.from != null && (typeof data.from !== 'string' || !HOST.test(data.from))) return 'bad_from';
  if (!end) return null;
  if (!ONE_OF.outcome.includes(data.outcome)) return 'bad_outcome';
  if (!Number.isSafeInteger(data.time_ms) || data.time_ms < 0 || data.time_ms > MAX_TIME) return 'bad_time';
  if (data.score != null && (!Number.isSafeInteger(data.score) || data.score < 0)) return 'bad_score';
  if (data.input != null && !ONE_OF.input.includes(data.input)) return 'bad_input';
  if (data.score_run != null && (typeof data.score_run !== 'string' || !UUID.test(data.score_run))) return 'bad_score_run';
  if (data.stats != null && !goodStats(data.stats)) return 'bad_stats';
  return null;
}

function recordStart(db, d) {
  return db.prepare(`INSERT INTO runs (run_key, visit, game, board, device, orientation, host, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(run_key) DO NOTHING`)
    .bind(d.run, d.visit, d.game, d.board ?? null, d.device, d.orientation, d.host, d.from ?? null).run();
}

// An end creates the row if its start was lost. A provisional quit (sent when the page was hidden mid-run)
// never replaces a real end, and a real end always replaces a quit: the player came back and finished.
function recordEnd(db, d) {
  const started = new Date(Date.now() - d.time_ms).toISOString();
  return db.prepare(`INSERT INTO runs (run_key, visit, game, board, device, orientation, host, source, started_at,
      ended_at, outcome, time_ms, score, input, score_run, stats)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?10, ?11, ?12, ?13, ?14, ?15)
    ON CONFLICT(run_key) DO UPDATE SET
      ended_at = excluded.ended_at, outcome = excluded.outcome, time_ms = excluded.time_ms, score = excluded.score,
      input = COALESCE(excluded.input, runs.input), score_run = COALESCE(excluded.score_run, runs.score_run), stats = excluded.stats
    WHERE runs.game = excluded.game AND (excluded.outcome <> 'quit' OR runs.outcome IS NULL OR runs.outcome = 'quit')`)
    .bind(d.run, d.visit, d.game, d.board ?? null, d.device, d.orientation, d.host, d.from ?? null, started,
      d.outcome, d.time_ms, d.score ?? null, d.input ?? null, d.score_run ?? null, d.stats == null ? null : JSON.stringify(d.stats))
    .run();
}

async function report(request, env, end) {
  const body = await readBody(request);
  if (body.error) return fail(body.error);
  const error = check(body.data, end);
  if (error) return fail(error);
  // Keyed on the connection in memory only; the IP is never stored.
  if (env.REPORTS) {
    const { success } = await env.REPORTS.limit({ key: request.headers.get('cf-connecting-ip') || 'unknown' });
    if (!success) return fail('rate_limited', 429);
  }
  await (end ? recordEnd : recordStart)(env.DB, body.data);
  return reply({ ok: true });
}

/* ---------- dashboards ---------- */

const gameNames = () => Object.fromEntries(Object.entries(games).map(([id, g]) => [id, g.name]));
function windowFor(url) {
  const asked = Number(url.searchParams.get('days'));
  const days = Number.isInteger(asked) && asked >= 1 && asked <= 365 ? asked : 30;
  return { days, since: new Date(Date.now() - days * DAY).toISOString() };
}
// Referring sites, most first. Past the top 12 the rest fold into one row, so the shares still add up to every run.
function topSources(rows) {
  const top = rows.slice(0, 12), rest = rows.slice(12).reduce((t, r) => t + r.n, 0);
  return rest ? top.concat({ source: null, other: true, n: rest }) : top;
}
const parseStats = text => { try { const v = JSON.parse(text); return object(v) ? v : null; } catch (_) { return null; } };
const all = async statement => (await statement.all()).results;

// Counts in one place so the overall and per-game views agree. Finished means the run reached its end screen.
const TALLY = `COUNT(*) AS runs, COUNT(DISTINCT visit) AS visits, COALESCE(SUM(outcome IN ('over', 'won')), 0) AS finished,
  COALESCE(SUM(outcome = 'won'), 0) AS won, COALESCE(SUM(outcome = 'quit'), 0) AS quit, COALESCE(SUM(time_ms), 0) AS time_ms`;
const HOURLY = `substr(started_at, 1, 13) AS hour, COUNT(*) AS runs, COALESCE(SUM(outcome IN ('over', 'won')), 0) AS finished,
  COALESCE(SUM(outcome = 'won'), 0) AS won, COALESCE(SUM(outcome = 'quit'), 0) AS quit`;
// The middle value of time_ms per group, with window functions so it's one pass.
const median = (where, by) => `SELECT ${by ? by + ', ' : ''}time_ms FROM (
    SELECT ${by ? by + ', ' : ''}time_ms, ROW_NUMBER() OVER (${by ? 'PARTITION BY ' + by + ' ' : ''}ORDER BY time_ms) AS r,
      COUNT(*) OVER (${by ? 'PARTITION BY ' + by : ''}) AS c
    FROM runs WHERE ${where} AND time_ms IS NOT NULL) WHERE r = (c + 1) / 2`;

// Leaderboard rows, read-only. AAA is the picker's default, so it's left out of name counts: it's likely many people.
async function boardNames(env, since, game) {
  if (!env.SCORES) return null;
  try {
    const where = `board > 0 AND created_at >= ?1${game ? ' AND game = ?2' : ''}`;
    const bind = s => game ? s.bind(since, game) : s.bind(since);
    const [saves, names, people] = await env.SCORES.batch([
      bind(env.SCORES.prepare(`SELECT game, COUNT(*) AS saves FROM scores WHERE ${where} GROUP BY game`)),
      bind(env.SCORES.prepare(`SELECT game, name, COUNT(*) AS runs, COUNT(DISTINCT substr(created_at, 1, 10)) AS days,
        MAX(created_at) AS last, MAX(score) AS best FROM scores WHERE ${where} GROUP BY game, name`)),
      // Each set of initials across every game: saved on how many dates, in how many games.
      bind(env.SCORES.prepare(`SELECT name, COUNT(DISTINCT substr(created_at, 1, 10)) AS days, COUNT(DISTINCT game) AS games
        FROM scores WHERE ${where} AND name <> 'AAA' GROUP BY name`))
    ]);
    return { saves: saves.results, names: names.results, people: people.results };
  } catch (_) { return null; }
}

async function overview(env, url) {
  const { days, since } = windowFor(url);
  const where = `started_at >= ?1 AND game <> '${TEST}'`;
  const [hourly, perGame, devices, sources, medians, overall] = (await env.DB.batch([
    env.DB.prepare(`SELECT game, ${HOURLY} FROM runs WHERE ${where} GROUP BY hour, game`).bind(since),
    env.DB.prepare(`SELECT game, ${TALLY} FROM runs WHERE ${where} GROUP BY game`).bind(since),
    env.DB.prepare(`SELECT device, orientation, COUNT(*) AS n FROM runs WHERE ${where} GROUP BY device, orientation`).bind(since),
    env.DB.prepare(`SELECT source, COUNT(*) AS n FROM runs WHERE ${where} GROUP BY source ORDER BY n DESC`).bind(since),
    env.DB.prepare(median(where, 'game')).bind(since),
    env.DB.prepare(median(where)).bind(since)
  ])).map(r => r.results);
  const board = await boardNames(env, since);
  const games = {};
  for (const id of Object.keys(gameNames())) games[id] = { runs: 0, visits: 0, finished: 0, won: 0, quit: 0, time_ms: 0, median_ms: null };
  for (const row of perGame) games[row.game] = { ...games[row.game], ...row, game: undefined };
  for (const row of medians) if (games[row.game]) games[row.game].median_ms = row.time_ms;
  let names = null;
  if (board) {
    for (const row of board.saves) if (games[row.game]) games[row.game].saves = row.saves;
    for (const row of board.names) {
      if (!games[row.game] || row.name === 'AAA') continue;
      const g = games[row.game]; g.names = (g.names || 0) + 1; if (row.days > 1) g.returning = (g.returning || 0) + 1;
    }
    names = { total: board.people.length, returning: board.people.filter(p => p.days > 1).length,
      several: board.people.filter(p => p.games > 1).length };
  }
  return { ok: true, days, since, names: gameNames(), hourly, games, devices, sources: topSources(sources),
    median_ms: overall[0]?.time_ms ?? null, people: names };
}

async function gameDetail(env, url, game) {
  const { days, since } = windowFor(url);
  const where = 'game = ?1 AND started_at >= ?2';
  const [hourly, summary, devices, inputs, sources, mid, reports, recent] = (await env.DB.batch([
    env.DB.prepare(`SELECT ${HOURLY} FROM runs WHERE ${where} GROUP BY hour`).bind(game, since),
    env.DB.prepare(`SELECT ${TALLY}, COUNT(board) AS boarded FROM runs WHERE ${where}`).bind(game, since),
    env.DB.prepare(`SELECT device, orientation, COUNT(*) AS n FROM runs WHERE ${where} GROUP BY device, orientation`).bind(game, since),
    env.DB.prepare(`SELECT input, COUNT(*) AS n FROM runs WHERE ${where} AND outcome IS NOT NULL GROUP BY input`).bind(game, since),
    env.DB.prepare(`SELECT source, COUNT(*) AS n FROM runs WHERE ${where} GROUP BY source ORDER BY n DESC`).bind(game, since),
    env.DB.prepare(median(where)).bind(game, since),
    env.DB.prepare(`SELECT time_ms, score, outcome, stats FROM runs WHERE ${where} AND outcome IS NOT NULL
      ORDER BY started_at DESC LIMIT ${REPORT_CAP + 1}`).bind(game, since),
    env.DB.prepare(`SELECT started_at, device, orientation, source, outcome, time_ms, score, input, score_run, stats
      FROM runs WHERE ${where} ORDER BY started_at DESC LIMIT 50`).bind(game, since)
  ])).map(r => r.results);
  // A game without a leaderboard (no run reports a board, nothing saved) shows no board figures at all.
  const found = await boardNames(env, since, game);
  const board = found && (summary[0].boarded || found.saves.length) ? found : null;
  let names = null;
  if (board) {
    names = board.names.map(({ game: _, ...row }) => row)
      .sort((a, b) => b.days - a.days || b.runs - a.runs || (a.last < b.last ? 1 : -1)).slice(0, 100);
    // Initials for the recent runs that were saved, matched by the run ID from the leaderboard token.
    const ids = [...new Set(recent.map(r => r.score_run).filter(Boolean))];
    if (ids.length) {
      try {
        const saved = await all(env.SCORES.prepare(`SELECT run_id, name FROM scores WHERE run_id IN (${ids.map(() => '?').join(',')})`).bind(...ids));
        const byRun = new Map(saved.map(r => [r.run_id, r.name]));
        for (const r of recent) if (byRun.has(r.score_run)) r.name = byRun.get(r.score_run);
      } catch (_) { /* the runs still show, without initials */ }
    }
  }
  return {
    ok: true, game, days, since, names: gameNames(), hourly,
    summary: { ...summary[0], boarded: undefined, median_ms: mid[0]?.time_ms ?? null, saves: board ? board.saves[0]?.saves || 0 : null },
    devices, inputs, sources: topSources(sources),
    capped: reports.length > REPORT_CAP,
    reports: reports.slice(0, REPORT_CAP).map(r => [r.time_ms, r.score, r.outcome, parseStats(r.stats)]),
    recent: recent.map(({ score_run, stats, ...r }) => ({ ...r, saved: Boolean(score_run && r.name), stats: parseStats(stats) })),
    board_names: names
  };
}

async function allowed(request, env, url) {
  // Local development only: `wrangler dev --var DASH_OPEN:local-dev-only` opens the dashboards on localhost.
  if (env.DASH_OPEN === 'local-dev-only' && LOCAL_HOSTS.includes(url.hostname)) return { user: 'local' };
  return checkAccess(request, env);
}

async function dashboard(request, env, url) {
  const isApi = url.pathname.startsWith('/dash/api/');
  if (request.method !== 'GET') return json({ ok: false, error: 'not_found' }, 404);
  const gate = await allowed(request, env, url);
  if (gate.locked) return isApi ? json({ ok: false, error: 'locked' }, 503)
    : html(note('Play stats are locked', 'Cloudflare Access isn’t set up for this Worker yet. See docs/guides/03-play-stats.md.'), 503);
  if (!gate.user) return isApi ? json({ ok: false, error: 'forbidden' }, 403)
    : html(note('Sign in first', 'Open this page through Cloudflare Access.'), 403);
  if (url.pathname === '/dash') return Response.redirect(url.origin + '/dash/' + url.search, 302);
  if (url.pathname === '/dash/api/overview') return json(await overview(env, url));
  if (url.pathname === '/dash/api/game') {
    const game = url.searchParams.get('game');
    return own(games, game) ? json(await gameDetail(env, url, game)) : json({ ok: false, error: 'bad_game' }, 400);
  }
  const match = /^\/dash\/(?:([a-z0-9-]+)\/)?$/.exec(url.pathname);
  if (match && (!match[1] || own(games, match[1]))) return html(page);
  return html(note('Not found', 'No dashboard here.'), 404);
}

async function handle(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/dash' || url.pathname.startsWith('/dash/')) return dashboard(request, env, url);
  if (request.method === 'OPTIONS') return reply({ ok: true });
  if (request.method === 'POST' && url.pathname === '/v1/start') return report(request, env, false);
  if (request.method === 'POST' && url.pathname === '/v1/end') return report(request, env, true);
  return fail('not_found', 404);
}

export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch (_) { return fail('unavailable', 503); }
  }
};
