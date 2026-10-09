// Stick Army's online high scores (docs/guides/00-leaderboards.md). Classic script; load after
// ../assets/leaderboard.js and before game.js, which calls StickArmyBoard(world) once.
//
// The campaign is the score that counts: a run is saved when the Dreadnought goes down on wave 20 (the victory card)
// or at game over if it ended before that. A winner who keeps going plays on for fun; the endless game over shows the
// board without offering initials again (the run's token saves one row, ever). Seeded (#seed=) and tuning (#tune)
// runs never get a token. The rows show initials, score, the wave reached (a star for a win) and touch or keyboard.
//
// At the end of a run the card shows, one step at a time (Thimbleful's pattern):
//   checking  "Checking the scores…" where the card's buttons go, for at least BEAT ms
//   asking    "New high score! You're #N" (top 50) or "Save your run? You'd be #N of M", with Enter initials and Skip
//   entering  the initials picker, with the card's own buttons hidden
//   done      the buttons come back and the board sits below them, so nothing moves under a finger
// If the scores take longer than WAIT ms the buttons come back anyway and a late answer offers initials in the board.
var StickArmyBoard = function (w) {
  'use strict';
  var GAME = 'stick-army', BEAT = 600, WAIT = 2500, LB = window.Leaderboard || null;
  var run = null, picker = null, current = null;

  function count(v) { return Number(v).toLocaleString('en-US'); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  // Each end card gets a step row before its buttons and a board after them.
  function slots(card) {
    if (card.lb) return card.lb;
    var row = card.querySelector('.row'), step = el('div', 'lb-step'), wait = el('p', 'lb-wait', 'Checking the scores…');
    var ask = el('div', 'lb-ask'), note = el('p', 'lb-note'), btns = el('div', 'row');
    var enter = el('button', 'btn', 'Enter initials'), skip = el('button', 'lb-skipq', 'Skip');
    enter.type = skip.type = 'button';
    note.setAttribute('role', 'status');
    btns.append(enter, skip); ask.append(note, btns); step.append(wait, ask);
    var box = el('section', 'lb'); box.hidden = true; box.setAttribute('aria-label', 'Online high scores');
    row.before(step); row.after(box);
    card.lb = { card: card, row: row, note: note, enter: enter, skip: skip, box: box };
    enter.addEventListener('click', function () { if (run && run.data && current === card.lb) openPicker(card.lb); });
    skip.addEventListener('click', function () { if (!run || !run.data || current !== card.lb) return; skipped(); back(); draw(card.lb.box, run.data.scores); });
    return card.lb;
  }
  function phase(name) {
    if (!current) return;
    current.card.classList.remove('lb-checking', 'lb-asking', 'lb-entering');
    if (name) current.card.classList.add('lb-' + name);
  }
  function back() {
    phase(null);
    var main = current && current.row.querySelector('.btn');
    if (main) main.focus({ preventScroll: true });
  }

  // ---------- a run ----------
  // Real play begins: ask for the run's token in the background. Play never waits for it.
  function begin(practice) {
    clear();
    run = LB && !practice ? { start: LB.start(GAME, w.BOARD), token: null, input: 'keys', used: false } : null;
    return run ? run.start : null;
  }
  function touched() { if (run) run.input = 'touch'; }
  // The run is over (won: the victory card; otherwise the game-over card).
  function finish(cardEl, won) {
    var S = w.S;
    if (picker) { picker.destroy(); picker = null; }
    current = slots(cardEl); current.box.replaceChildren(); current.box.hidden = true;
    if (!LB) return;
    var r = run;
    if (!r || r.used) {
      // Practice, or the endless game over after a win: just the board.
      LB.load(GAME, w.BOARD).then(function (data) { if (data && data.scores.length && current && current.card === cardEl && !run_changed(r)) draw(current.box, data.scores); });
      return;
    }
    r.used = true; r.score = S.score; r.meta = { time_ms: Math.round(S.played * 1000), wave: Math.max(1, S.wave), won: won ? 1 : 0 };
    var began = performance.now();
    phase('checking');
    r.waitTimer = setTimeout(function () { if (run === r && !r.shown) { r.late = true; back(); } }, WAIT);
    r.start.then(function (token) {
      r.token = token;
      return token ? LB.load(GAME, w.BOARD, r.score, r.meta) : LB.load(GAME, w.BOARD);
    }).then(function (data) {
      setTimeout(function () {
        if (run !== r || current.card !== cardEl) return;
        clearTimeout(r.waitTimer);
        if (!data) { if (!r.late) back(); return; }
        r.data = data; show();
      }, Math.max(0, BEAT - (performance.now() - began)));
    });
  }
  function run_changed(r) { return run !== r; }
  function canSave(data) { return typeof data.placement === 'number' || (run.token && typeof data.position === 'number'); }
  function standing(data) { return typeof data.placement === 'number' ? "You're #" + data.placement + '.' : "You'd be #" + count(data.position) + ' of ' + count(data.total) + '.'; }
  function show() {
    var data = run.data;
    if (run.shown) return;
    run.shown = true;
    if (!canSave(data)) { back(); if (data.scores.length) draw(current.box, data.scores); return; }
    if (run.late) { draw(current.box, data.scores, null, false, function () { openPicker(current); }); return; }
    current.note.textContent = typeof data.placement === 'number' ? "New high score! You're #" + data.placement + '.' : 'Save your run? ' + standing(data);
    phase('asking');
    current.enter.focus({ preventScroll: true });
  }
  function skipped() {
    var data = run.data;
    if (typeof data.placement !== 'number' && typeof data.position === 'number') run.note = 'This run would be #' + count(data.position) + ' of ' + count(data.total) + '.';
  }
  function openPicker(at) {
    var r = run, data = r.data, placed = typeof data.placement === 'number';
    at.box.replaceChildren(); at.box.hidden = false;
    var msg = el('p', 'lb-message', standing(data) + ' Enter your initials.');
    msg.setAttribute('role', 'status');
    at.box.append(el('h3', null, placed ? 'New high score!' : 'Save your run'), msg);
    phase('entering');
    function done(rows, rank) { picker.destroy(); picker = null; back(); draw(at.box, rows, rank); }
    picker = LB.entry(at.box, {
      initials: LB.initials(),
      onDone: function (name) {
        var p = picker;
        if (!p || r.busy) return;
        r.busy = true; p.setBusy(true); msg.textContent = 'Saving…';
        LB.saveInitials(name);
        LB.submit({ game: GAME, board: w.BOARD, token: r.token, name: name, score: r.score, input: r.input, meta: r.meta }).then(function (res) {
          if (run !== r || picker !== p) return;
          r.busy = false;
          if (res && res.error === 'name_not_allowed') { msg.textContent = 'Try other initials.'; p.setBusy(false); return; }
          if (res && res.ok && res.rank == null && typeof res.position === 'number') r.note = "Saved. You're #" + count(res.position) + ' of ' + count(res.total) + '.';
          done(res && res.ok ? res.scores : data.scores, res && res.ok ? res.rank : null);
        });
      },
      onSkip: function () { if (r.busy) return; skipped(); done(data.scores, null); }
    });
  }
  // Leaving an end card (play again, keep going, back to the title): forget the board, keep the run's token spent.
  function clear() {
    if (picker) { picker.destroy(); picker = null; }
    if (run) clearTimeout(run.waitTimer);
    if (current) { phase(null); current.box.replaceChildren(); current.box.hidden = true; }
    current = null;
  }

  // ---------- drawing ----------
  var ICON = { touch: 'M8 17L4 11L6 10L8 12V3H11V9L16 10V16L14 18H9Z', keys: 'M2 5H18V15H2ZM5 8H6M9 8H10M13 8H14M5 11H6M9 11H15' };
  function icon(input) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), path = document.createElementNS(svg.namespaceURI, 'path');
    svg.setAttribute('viewBox', '0 0 20 20'); svg.setAttribute('class', 'lb-input'); svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', input === 'touch' ? 'touch' : 'keyboard');
    path.setAttribute('d', input === 'touch' ? ICON.touch : ICON.keys); path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.5'); svg.append(path);
    return svg;
  }
  function waveText(row) { var m = row.meta || {}; return m.wave ? String(m.wave) + (m.won ? ' ★' : '') : ''; }
  function waveLabel(row) { var m = row.meta || {}; return m.won ? 'won at wave ' + m.wave : m.wave ? 'wave ' + m.wave : 'no wave'; }
  // The top 10 in full, "See all" for the 50 in a scrolling list; your row highlighted and scrolled into view.
  function draw(box, scores, highlight, all, addInitials) {
    box.replaceChildren(); box.hidden = false;
    var list = el('div', all ? 'lb-list lb-all' : 'lb-list');
    if (all) { list.tabIndex = 0; list.setAttribute('role', 'region'); list.setAttribute('aria-label', 'All high scores, scroll to see more'); }
    var table = el('table', 'lb-table'), head = table.createTHead().insertRow(), body = table.createTBody(), you = null;
    [['Rank', '#'], ['Name', 'Name'], ['Score', 'Score'], ['Wave', 'Wave'], ['Input', '']].forEach(function (c) {
      var th = el('th'); th.scope = 'col';
      if (!c[1]) th.append(el('span', 'lb-sr', c[0])); else { th.textContent = c[1]; if (c[1] !== c[0]) th.setAttribute('aria-label', c[0]); }
      head.append(th);
    });
    function add(row) {
      var tr = body.insertRow();
      if (row.rank === highlight) { tr.className = 'lb-you'; you = tr; }
      [String(row.rank), row.name, count(row.score)].forEach(function (v) { tr.insertCell().textContent = v; });
      var wc = tr.insertCell(); wc.textContent = waveText(row); wc.setAttribute('aria-label', waveLabel(row));
      tr.insertCell().append(icon(row.input));
    }
    (all ? scores : scores.slice(0, 10)).forEach(add);
    if (!all && highlight > 10) {
      var mine = scores.find(function (row) { return row.rank === highlight; });
      if (mine) { var gap = body.insertRow(); gap.className = 'lb-gap'; var c = gap.insertCell(); c.colSpan = 5; c.textContent = '⋯'; add(mine); }
    }
    box.append(el('h3', null, 'High scores'));
    if (run && run.note && current && box === current.box) { var n = el('p', 'lb-message lb-standing', run.note); n.setAttribute('role', 'status'); box.append(n); }
    if (addInitials && run && run.data) { var a = el('button', 'lb-more lb-add', standing(run.data) + ' Add your initials'); a.type = 'button'; a.addEventListener('click', addInitials); box.append(a); }
    if (!scores.length) box.append(el('p', 'lb-message', 'No scores yet. Be the first!'));
    else { list.append(table); box.append(list); }
    if (scores.length > 10) {
      var more = el('button', 'lb-more', all ? 'Show top 10' : 'See all ' + scores.length); more.type = 'button';
      more.addEventListener('click', function () { draw(box, scores, highlight, !all, addInitials); box.querySelector('.lb-more:not(.lb-add)').focus({ preventScroll: true }); });
      box.append(more);
    }
    if (you) requestAnimationFrame(function () { you.scrollIntoView({ block: 'nearest' }); });
  }

  // ---------- the title ----------
  // High scores: a card over the title with the board (scoresScreen); the open notebook's facing page lists the top
  // five (facingRows).
  var scoresScreen = document.getElementById('scoresScreen'), scoresBox = document.getElementById('scoresBox'), scoresReq = 0;
  function say(box, text) { var p = el('p', 'lb-message', text); p.setAttribute('role', 'status'); box.replaceChildren(p); box.hidden = false; }
  function openScores() {
    if (!LB) return;
    var req = ++scoresReq;
    scoresScreen.hidden = false;
    say(scoresBox, 'Loading the scores…');
    document.getElementById('scoresClose').focus({ preventScroll: true });
    LB.load(GAME, w.BOARD).then(function (data) {
      if (req !== scoresReq || scoresScreen.hidden) return;
      if (!data) say(scoresBox, 'Couldn’t load the scores. Try again in a moment.');
      else draw(scoresBox, data.scores);
    });
  }
  function closeScores() {
    if (scoresScreen.hidden) return false;
    scoresReq++; scoresScreen.hidden = true; scoresBox.replaceChildren();
    var b = document.getElementById('titleScoresBtn'); if (b) b.focus({ preventScroll: true });
    return true;
  }
  document.getElementById('scoresClose').addEventListener('click', closeScores);
  function titleRows() {
    var ol = document.getElementById('facingRows');
    function empty(text) { var li = el('li', 'empty', text); ol.replaceChildren(li); }
    if (!LB) { empty('High scores are online only.'); return; }
    empty('Loading…');
    LB.load(GAME, w.BOARD).then(function (data) {
      if (!data) { empty('Couldn’t load the scores.'); return; }
      if (!data.scores.length) { empty('Be the first on the page.'); return; }
      ol.replaceChildren.apply(ol, data.scores.slice(0, 5).map(function (row) {
        var li = el('li'); li.append(el('span', 'rk', row.rank + '.'), el('span', null, row.name), el('span', 'sc', count(row.score)));
        var wv = el('span', 'won', (row.meta && row.meta.won) ? '★' : ''); wv.setAttribute('aria-label', waveLabel(row)); li.append(wv);
        return li;
      }));
    });
  }

  return { begin: begin, touched: touched, finish: finish, clear: clear, openScores: openScores, closeScores: closeScores, titleRows: titleRows,
    get picking() { return !!picker; }, available: !!LB };
};
