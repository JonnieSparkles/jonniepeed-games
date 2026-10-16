// Unruggabull: RugCo Alley Remastered, a run from start to finish: its leaderboard token and play stats, the end
// of a clear (the 2025 congratulations art, the run's numbers, initials and the board) and getting rugged.
// The board ranks the fastest clear; health breaks ties; unrugged rides along. Every row's score is 1 (a clear):
// the order comes from time_ms, which the Worker checks against the run's token (docs/guides/00-leaderboards.md).
window.UnrugRun = (function () {
  const GAME = 'unruggabull-remastered';
  const $ = id => document.getElementById(id);
  const endEl = $('end'), art = $('end-art'), panel = $('end-panel'), stats = $('end-stats');
  const msg = $('end-msg'), boardBox = $('end-board'), buttons = $('end-buttons'), ruggedBox = $('end-rugged');
  const DEVICE_KEY = 'unruggabull-remastered-clears-' + BOARD;
  let run = null, picker = null, layoutBox = null;

  const time = ms => { const s = Math.max(0, ms) / 1000; return Math.floor(s / 60) + ':' + (s % 60).toFixed(1).padStart(4, '0'); };

  // ---------- this device's clears (the title shows its fastest; the board falls back to it offline) ----------
  function deviceRows() {
    try {
      const rows = JSON.parse(localStorage.getItem(DEVICE_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter(r => r && typeof r.name === 'string' && Number.isFinite(r.ms)) : [];
    } catch (e) { return []; }
  }
  const order = (a, b) => a.ms - b.ms || b.health - a.health;
  function saveDevice(row) {
    const rows = deviceRows().concat([row]).sort(order).slice(0, 10);
    try { localStorage.setItem(DEVICE_KEY, JSON.stringify(rows)); } catch (e) {}
    return rows.indexOf(row) + 1;
  }
  const asBoard = rows => rows.map((r, i) => ({ rank: i + 1, name: r.name, input: r.input, meta: { time_ms: r.ms, health: r.health, unrugged: r.unrugged } }));

  // ---------- the board table ----------
  function icon(input) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 20 20'); svg.setAttribute('class', 'lb-input');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', input === 'touch' ? 'touch' : 'keyboard');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', input === 'touch' ? 'M8 17L4 11L6 10L8 12V3H11V9L16 10V16L14 18H9Z' : 'M2 5H18V15H2ZM5 8H6M9 8H10M13 8H14M5 11H6M9 11H15');
    path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5');
    svg.append(path);
    return svg;
  }
  // Top 10 in full, your row under a gap when you're lower; "See all" scrolls all 50.
  function table(rows, highlight, all) {
    const wrap = document.createElement('div');
    wrap.className = all ? 'lb-list lb-all' : 'lb-list';
    if (all) { wrap.tabIndex = 0; wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'All fastest clears, scroll to see more'); }
    const t = document.createElement('table'); t.className = 'lb-table';
    const head = t.createTHead().insertRow();
    for (const [label, short] of [['Rank', '#'], ['Name', 'Name'], ['Time', 'Time'], ['Health', 'Health'], ['Unrugged', 'Unrugged'], ['Input', '']]) {
      const th = document.createElement('th'); th.scope = 'col';
      if (!short) { const s = document.createElement('span'); s.className = 'sr'; s.textContent = label; th.append(s); }
      else th.textContent = short;
      head.append(th);
    }
    const body = t.createTBody();
    let you = null;
    const add = r => {
      const tr = body.insertRow();
      if (highlight != null && r.rank === highlight) { tr.className = 'lb-you'; you = tr; }
      const m = r.meta || {};
      tr.insertCell().textContent = r.rank;
      tr.insertCell().textContent = r.name;
      tr.insertCell().textContent = time(m.time_ms);
      const h = tr.insertCell(); h.textContent = (m.health == null ? '' : m.health + '%');
      if (m.health === 100) { const heart = document.createElement('span'); heart.className = 'heart'; heart.title = 'Full health'; h.append(heart); }
      tr.insertCell().textContent = m.unrugged == null ? '' : m.unrugged;
      tr.insertCell().append(icon(r.input));
    };
    (all ? rows : rows.slice(0, 10)).forEach(add);
    if (!all && highlight > 10) {
      const mine = rows.find(r => r.rank === highlight);
      if (mine) { const gap = body.insertRow(); gap.className = 'lb-gap'; const c = gap.insertCell(); c.colSpan = 6; c.textContent = '⋯'; add(mine); }
    }
    wrap.append(t);
    if (you) requestAnimationFrame(() => you.scrollIntoView({ block: 'nearest' }));
    return wrap;
  }
  function drawBoard(box, rows, highlight, note) {
    box.replaceChildren();
    if (note) { const p = document.createElement('p'); p.className = 'lb-standing'; p.setAttribute('role', 'status'); p.textContent = note; box.append(p); }
    if (!rows.length) {
      const p = document.createElement('p'); p.className = 'lb-empty'; p.textContent = 'No clears yet. Beat the Rugfather to get on the board.';
      box.append(p);
      return;
    }
    let all = false;
    const list = table(rows, highlight, false);
    box.append(list);
    if (rows.length > 10) {
      const more = document.createElement('button'); more.type = 'button'; more.className = 'lb-more';
      more.textContent = 'See all ' + rows.length;
      more.addEventListener('click', () => {
        all = !all;
        box.replaceChild(table(rows, highlight, all), box.querySelector('.lb-list'));
        more.textContent = all ? 'Show top 10' : 'See all ' + rows.length;
      });
      box.append(more);
    }
  }

  // ---------- a run ----------
  // Called when real play begins: the controls screen is dismissed.
  function begin() {
    if (picker) { picker.destroy(); picker = null; }
    if (run && run.stats && !run.ended && window.PlayStats) PlayStats.quit(run.stats);
    const touch = window.usingTouch && window.usingTouch();
    run = { start: window.Leaderboard ? Leaderboard.start(GAME, BOARD) : Promise.resolve(null), input: touch ? 'touch' : 'keys', ended: false };
    run.stats = window.PlayStats ? PlayStats.start(GAME, { board: BOARD, token: run.start, progress: report }) : null;
    hideEnd();
  }
  function touched() { if (run && !run.ended) run.input = 'touch'; }
  // What the play stats get: how far he got, and what was left of the Rugfather.
  function report() {
    const boss = getBossBattleStarted() ? Math.max(0, __bossState.hp) : null;
    const s = { wave: Math.min(difficultyLevel, 6), health: Math.max(0, player.health), boss_fight: getBossBattleStarted() };
    if (boss !== null) s.boss_hp = boss;
    return { score: killCount, time_ms: Math.round(runMs()), input: run ? run.input : undefined, won: gameState === 'congrats', stats: s };
  }
  const runMs = () => (getGameStopTime() || gameNow()) - getGameStartTime();
  // Leaving a run from the pause menu.
  function quit() {
    if (run && !run.ended && run.stats && window.PlayStats) PlayStats.quit(run.stats);
    if (run) run.ended = true;
  }

  // ---------- the end card ----------
  function hideEnd() {
    endEl.hidden = true; endEl.className = '';
    panel.hidden = true; ruggedBox.hidden = true;
    art.classList.remove('split');
    boardBox.replaceChildren(); stats.replaceChildren(); msg.textContent = '';
  }
  function place() {
    // the end card covers the window; the art and the panel are laid out from its size
    if (!layoutBox || endEl.hidden) return;
    const { W, H, gx, gy, gw, gh } = layoutBox;
    endEl.style.setProperty('--u', (gh / 540) + 'px');
    const split = art.classList.contains('split');
    // the art: the full alley at first, then a picture on the left (or on top, in a narrow window)
    const wide = W / H > 1.45;
    const aw = split ? (wide ? Math.min(W * 0.5, H * 0.62 * 16 / 9) : Math.min(W * 0.86, H * 0.3 * 16 / 9)) : gw;
    const ah = aw * 9 / 16;
    const ax = split ? (wide ? Math.max(gx, 0) + W * 0.04 : (W - aw) / 2) : gx;
    const ay = split ? (wide ? (H - ah) / 2 - H * 0.06 : H * 0.04) : gy;
    art.style.width = aw + 'px'; art.style.height = ah + 'px';
    art.style.transform = 'translate(' + ax + 'px,' + ay + 'px)';
    if (wide) {
      panel.style.left = (ax + aw + W * 0.03) + 'px'; panel.style.right = (W * 0.03) + 'px';
      panel.style.top = (H * 0.05) + 'px'; panel.style.bottom = (H * 0.05) + 'px';
      buttons.style.left = ax + 'px'; buttons.style.width = aw + 'px'; buttons.style.top = (ay + ah + H * 0.04) + 'px';
    } else {
      panel.style.left = (W * 0.04) + 'px'; panel.style.right = (W * 0.04) + 'px';
      panel.style.top = (ay + ah + H * 0.02) + 'px'; panel.style.bottom = (H * 0.12) + 'px';
      buttons.style.left = (W * 0.04) + 'px'; buttons.style.width = (W * 0.92) + 'px'; buttons.style.top = (H * 0.89) + 'px';
    }
    ruggedBox.style.left = gx + 'px'; ruggedBox.style.width = gw + 'px'; ruggedBox.style.top = (gy + gh * 0.6) + 'px';
  }
  function layout(box) { layoutBox = box; place(); }

  function statRow(label, value) {
    const row = document.createElement('div'); row.className = 'stat';
    const dt = document.createElement('dt'); dt.textContent = label;
    const dd = document.createElement('dd'); dd.textContent = value;
    row.append(dt, dd); stats.append(row);
    return dd;
  }
  function countUp(dd, to, fmt, ms) {
    const t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / ms); dd.textContent = fmt(to * k); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  // A clear: the art fades in as in 2025, then it moves aside for the run's numbers and the board.
  async function cleared() {
    if (!run || run.ended) return;
    const ended = run;
    ended.ended = true;
    const result = { ms: Math.round(runMs()), health: Math.round(Math.max(0, player.health) / PLAYER_START_HEALTH * 100), unrugged: killCount };
    ended.result = result;
    if (ended.stats && window.PlayStats) PlayStats.end(ended.stats, report());
    endEl.hidden = false; endEl.className = 'cleared';
    art.classList.remove('split'); art.style.opacity = 0;
    place();
    requestAnimationFrame(() => { art.style.opacity = 1; });
    await wait(2600);
    if (run !== ended) return;
    art.classList.add('split'); place();
    panel.hidden = false; buttons.hidden = false;
    $('end-h').textContent = 'Your run';
    countUp(statRow('Time', '0:00.0'), result.ms, time, 800);
    countUp(statRow('Health', '0%'), result.health, v => Math.round(v) + '%', 800);
    countUp(statRow('Unrugged', '0'), result.unrugged, v => String(Math.round(v)), 800);
    await wait(900);
    if (run !== ended) return;
    offer(ended, result);
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function offer(ended, result) {
    const meta = { time_ms: result.ms, health: result.health, unrugged: result.unrugged };
    const local = () => ({ name: Leaderboard.initials(), ms: result.ms, health: result.health, unrugged: result.unrugged, input: ended.input });
    msg.textContent = 'Checking the board…';
    const token = window.Leaderboard ? await ended.start : null;
    const data = !window.Leaderboard ? null
      : token ? await Leaderboard.load(GAME, BOARD, 1, meta) : await Leaderboard.load(GAME, BOARD);
    if (run !== ended) return;
    // Offline, or no token: the board on this device.
    if (!data || !token) {
      const rows = deviceRows();
      const would = rows.filter(r => order(r, result) < 0).length + 1;
      msg.textContent = would <= 10 ? 'Fastest clears on this device: you\'d be #' + would + '. Enter your initials.' : 'Enter your initials to keep this clear on this device.';
      openPicker(ended, async name => {
        const rank = saveDevice(Object.assign(local(), { name }));
        msg.textContent = '';
        drawBoard(boardBox, asBoard(deviceRows()), rank, data ? null : 'The online board couldn’t be reached. Saved on this device.');
      }, () => { msg.textContent = ''; drawBoard(boardBox, data ? data.scores : asBoard(deviceRows()), null); });
      return;
    }
    const top = typeof data.placement === 'number';
    msg.textContent = top ? 'New fastest clear! You’re #' + data.placement + '. Enter your initials.'
      : 'You’d be #' + data.position + ' of ' + data.total + '. Enter your initials.';
    openPicker(ended, async name => {
      Leaderboard.saveInitials(name);
      saveDevice(Object.assign(local(), { name }));
      const res = await Leaderboard.submit({ game: GAME, board: BOARD, token, name, score: 1, input: ended.input, meta });
      if (run !== ended) return true;
      if (res && res.error === 'name_not_allowed') { msg.textContent = 'Try other initials.'; return false; }
      msg.textContent = '';
      const note = res && res.ok && !(res.rank && res.rank <= 50) && res.position ? 'Saved. You’re #' + res.position + ' of ' + res.total + '.' : null;
      drawBoard(boardBox, res && res.ok ? res.scores : data.scores, res && res.ok ? res.rank : null, note);
      return true;
    }, () => {
      msg.textContent = '';
      drawBoard(boardBox, data.scores, null, data.position ? 'This run would be #' + data.position + ' of ' + data.total + '.' : null);
    });
  }

  // The site's initials picker (site/assets/leaderboard.js). One decision at a time: Retry and Title wait.
  function openPicker(ended, onOk, onSkip) {
    if (!window.Leaderboard) { onSkip(); return; }
    endEl.classList.add('lb-entering');
    let busy = false;
    picker = Leaderboard.entry(boardBox, {
      initials: Leaderboard.initials(),
      async onDone(name) {
        if (busy) return;
        busy = true; picker.setBusy(true);
        const done = await onOk(name);
        if (run !== ended) return;
        busy = false;
        if (done === false) { picker.setBusy(false); return; }
        close();
      },
      onSkip() { if (busy) return; close(); onSkip(); }
    });
    function close() {
      if (picker) { picker.destroy(); picker = null; }
      endEl.classList.remove('lb-entering');
      $('retry-btn').focus({ preventScroll: true });
    }
  }

  // Rugged: the 2025 line on the canvas, and here how far he got, with Retry and Title.
  function rugged() {
    if (!run || run.ended) return;
    run.ended = true;
    if (run.stats && window.PlayStats) PlayStats.end(run.stats, report());
    endEl.hidden = false; endEl.className = 'rugged';
    ruggedBox.hidden = false; buttons.hidden = true;
    const boss = getBossBattleStarted();
    $('rugged-line').textContent = (boss ? 'THE RUGFATHER' : 'WAVE ' + Math.min(difficultyLevel, 5) + '/5') + '   ·   UNRUGGED ' + killCount + '   ·   ' + time(runMs());
    place();
    $('retry2-btn').focus({ preventScroll: true });
  }

  function retry() {
    hideEnd();
    window.startGame();
  }
  for (const id of ['retry-btn', 'retry2-btn']) $(id).addEventListener('click', retry);
  for (const id of ['title-btn', 'title2-btn']) $(id).addEventListener('click', () => location.reload());

  // ---------- the title's Leaderboard card ----------
  async function loadTitleBoard(box) {
    box.replaceChildren();
    const p = document.createElement('p'); p.className = 'lb-standing'; p.textContent = 'Checking the board…'; box.append(p);
    const data = window.Leaderboard ? await Leaderboard.load(GAME, BOARD) : null;
    if (data) drawBoard(box, data.scores, null);
    else drawBoard(box, asBoard(deviceRows()), null, deviceRows().length ? 'The online board couldn’t be reached. Clears on this device:' : null);
  }
  function best() {
    const rows = deviceRows().sort(order);
    return rows.length ? rows[0].name + ' ' + time(rows[0].ms) : null;
  }

  // The game's state changes (core.js calls this from setGameState).
  window.onGameState = function (s) {
    if (s === 'congrats') cleared();
    else if (s === 'gameover') rugged();
  };

  return { begin, touched, quit, layout, loadTitleBoard, best, time };
})();
