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
  // the splits of this device's fastest clear: { waves, clear } in ms
  const SPLITS_KEY = 'unruggabull-remastered-splits-' + BOARD;
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
  const asBoard = rows => rows.map((r, i) => ({ rank: i + 1, name: r.name, input: r.input, meta: { time_ms: r.ms, health: r.health, unrugged: r.unrugged, ran_dry: r.ran_dry } }));
  function bestSplits() { try { const s = JSON.parse(localStorage.getItem(SPLITS_KEY) || '{}'); return s && typeof s === 'object' ? s : {}; } catch (e) { return {}; } }

  // ---------- medals: on the end card and beside each clear on the board ----------
  // Flawless: a clear at full health. Under 2:30: a clear in under two and a half minutes (a perfect run with average spawns is about 2:00). Never ran dry: the blaster never ran
  // out of shots (older rows don't know, so they don't show it).
  const MEDALS = [
    ['heart', 'Flawless', m => m.health === 100],
    ['watch', 'Under 2:30', m => m.time_ms < 150000],
    ['blaster', 'Never ran dry', m => m.ran_dry === 0]
  ];
  function medalIcons(m) {
    const span = document.createElement('span'); span.className = 'lb-medals';
    for (const [cls, label, has] of MEDALS) if (has(m)) { const i = document.createElement('i'); i.className = 'mi ' + cls; i.title = label; i.setAttribute('role', 'img'); i.setAttribute('aria-label', label); span.append(i); }
    return span;
  }

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
      if (highlight != null && r.rank === highlight) { tr.className = 'lb-you'; you = tr; UnrugSfx.ok(); }
      const m = r.meta || {};
      tr.insertCell().textContent = r.rank;
      const nm = tr.insertCell(); nm.textContent = r.name; nm.append(medalIcons(m));
      tr.insertCell().textContent = time(m.time_ms);
      tr.insertCell().textContent = (m.health == null ? '' : m.health + '%');
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
    run = { start: window.Leaderboard ? Leaderboard.start(GAME, BOARD) : Promise.resolve(null), input: touch ? 'touch' : 'keys', ended: false, splits: {}, shown: null };
    run.stats = window.PlayStats ? PlayStats.start(GAME, { board: BOARD, token: run.start, progress: report }) : null;
    hideEnd();
  }
  function touched() { if (run && !run.ended) run.input = 'touch'; }
  // What the play stats get: how far he got, and what was left of the Rugfather.
  function report() {
    const boss = getBossBattleStarted() ? Math.max(0, __bossState.hp) : null;
    const s = { wave: Math.min(difficultyLevel, 6), health: Math.max(0, player.health), boss_fight: getBossBattleStarted(),
      shots: runShots, hits: runHits, ran_dry: runRanDry };
    if (boss !== null) s.boss_hp = boss;
    return { score: killCount, time_ms: Math.round(runMs()), input: run ? run.input : undefined, won: gameState === 'congrats', stats: s };
  }
  const runMs = () => (getGameStopTime() || gameNow()) - getGameStartTime();
  // A split (the waves done, the Rugfather down), shown on the HUD for 3 s against this device's fastest clear.
  function split(name) {
    if (!run || run.ended || run.splits[name] != null) return;
    const ms = Math.round(runMs());
    run.splits[name] = ms;
    let ref = bestSplits()[name];
    if (name === 'clear' && ref == null) { const rows = deviceRows(); if (rows.length) ref = Math.min(...rows.map(r => r.ms)); }
    run.shown = { label: name === 'waves' ? 'WAVES' : 'CLEAR', ms, delta: ref == null ? null : ms - ref, at: gameNow() };
  }
  function shownSplit() {
    if (!run || !run.shown) return null;
    const age = gameNow() - run.shown.at;
    return age > 3000 ? null : Object.assign({ age }, run.shown);
  }
  const ms = () => (run ? Math.round(runMs()) : 0);
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
    UnrugWon.stop();
    boardBox.replaceChildren(); stats.replaceChildren(); msg.textContent = '';
    const medals = $('end-medals'); if (medals) medals.remove();
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
    const result = { ms: Math.round(runMs()), health: Math.round(Math.max(0, player.health) / PLAYER_START_HEALTH * 100), unrugged: killCount, ranDry: runRanDry ? 1 : 0 };
    ended.result = result;
    // a new fastest clear on this device keeps its splits for the next run to race
    const fastest = deviceRows().reduce((m, r) => Math.min(m, r.ms), Infinity);
    if (result.ms < fastest) { try { localStorage.setItem(SPLITS_KEY, JSON.stringify({ waves: ended.splits.waves, clear: result.ms })); } catch (e) {} }
    if (ended.stats && window.PlayStats) PlayStats.end(ended.stats, report());
    endEl.hidden = false; endEl.className = 'cleared';
    art.classList.remove('split'); art.style.opacity = 0;
    UnrugWon.start(art);
    place();
    requestAnimationFrame(() => { art.style.opacity = 1; });
    await wait(2600);
    if (run !== ended) return;
    art.classList.add('split'); place();
    panel.hidden = false; buttons.hidden = false;
    $('end-h').textContent = 'Your run';
    [0, 0.12, 0.24].forEach(d => setTimeout(() => UnrugSfx.move(4), d * 1000));
    countUp(statRow('Time', '0:00.0'), result.ms, time, 800);
    countUp(statRow('Health', '0%'), result.health, v => Math.round(v) + '%', 800);
    countUp(statRow('Unrugged', '0'), result.unrugged, v => String(Math.round(v)), 800);
    // the medals, lit one by one when earned
    const row = document.createElement('div'); row.id = 'end-medals';
    const meta = { time_ms: result.ms, health: result.health, ran_dry: result.ranDry };
    const lit = [];
    for (const [cls, label, has] of MEDALS) {
      const b = document.createElement('span'); b.className = 'medal off';
      const i = document.createElement('i'); i.className = 'mi ' + cls; i.setAttribute('aria-hidden', 'true');
      b.append(i, label); row.append(b);
      if (has(meta)) lit.push(b); else b.setAttribute('aria-label', label + ', not earned');
    }
    stats.after(row);
    lit.forEach((b, k) => setTimeout(() => { b.classList.remove('off'); b.classList.add('pop'); UnrugSfx.move(5 + k * 3); setTimeout(() => b.classList.remove('pop'), 250); }, 900 + k * 260));
    await wait(900 + lit.length * 260);
    if (run !== ended) return;
    offer(ended, result);
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function offer(ended, result) {
    // ran_dry goes with the saved clear; the standing check leaves it out (it doesn't change the order)
    const meta = { time_ms: result.ms, health: result.health, unrugged: result.unrugged };
    const full = Object.assign({ ran_dry: result.ranDry }, meta);
    const local = () => ({ name: Leaderboard.initials(), ms: result.ms, health: result.health, unrugged: result.unrugged, ran_dry: result.ranDry, input: ended.input });
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
      let res = await Leaderboard.submit({ game: GAME, board: BOARD, token, name, score: 1, input: ended.input, meta: full });
      // a Worker deployed before ran_dry existed turns it away; the clear still counts without it
      if (res && res.error === 'bad_meta') res = await Leaderboard.submit({ game: GAME, board: BOARD, token, name, score: 1, input: ended.input, meta });
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
    const entry = boardBox.querySelector('.lb-entry');
    const watch = entry ? new MutationObserver(ms => {
      if (ms.some(m => m.target.closest && m.target.closest('.lb-letter') || (m.target.parentElement && m.target.parentElement.closest('.lb-letter')))) UnrugSfx.move(Math.floor(Math.random() * 5));
    }) : null;
    if (watch) watch.observe(entry, { subtree: true, childList: true, characterData: true });
    // OK's sound comes with the row landing on the board (drawBoard); Skip sounds like closing a card
    const sounds = e => { if (e.target.closest && e.target.closest('.lb-skip')) UnrugSfx.back(); };
    if (entry) entry.addEventListener('click', sounds, true);
    function close() {
      if (watch) watch.disconnect();
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
    UnrugSfx.pick();
    hideEnd();
    window.startGame();
  }
  for (const id of ['retry-btn', 'retry2-btn']) $(id).addEventListener('click', retry);
  for (const id of ['title-btn', 'title2-btn']) $(id).addEventListener('click', () => { UnrugSfx.pick(); setTimeout(() => location.reload(), 120); });

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
    if (s !== 'playing') UnrugSfx.heartbeat(false);
    if (s === 'dying') { UnrugSfx.windDown(bgMusic); UnrugSfx.crackle(0.4, 1.5); }
    if (s === 'congrats') { UnrugSfx.fanfare(); UnrugSfx.crackle(0.4, 2); cleared(); }
    else if (s === 'gameover') rugged();
  };

  return { begin, touched, quit, layout, loadTitleBoard, best, time, split, shownSplit, ms };
})();
