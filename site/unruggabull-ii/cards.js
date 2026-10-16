// Unruggabull II: the level-end cards and the pause card (docs/games/unruggabull-ii/cards-plan.md).
// Clear and rugged are p(Loom)'s messages, in the caption style it already speaks through on the 48th Floor; the pause
// card is the same frame in the game's own gold and purple. Each is a strip: sideways (and on a desktop) over the bottom
// of the picture, upright in the controls' space under it. Drawn on their own canvas at the picture's pixel scale, with
// HTML buttons over it, so the game's picture is never drawn on. game.js decides what a card says (show) and what its
// buttons do (actions); this file only lays it out and draws it.
var UnrugCards = (function () {
  'use strict';
  // p(Loom)'s line and odds per stage (a gag: the odds fall as he climbs); its eye steadies, twitches, then goes red
  const LINES = {
    stairs: { rug: 'AS PROJECTED.', p: 99, eye: 'calm' },
    floor13: { win: 'ANOMALY LOGGED.', rug: 'CORRECTED.', p: 91, eye: 'calm' },
    shredo: { rug: 'SHRED-O IS WAITING.', p: 91, eye: 'calm' },
    // the 48th's clear invites him up (owner, Oct 16: why he goes to the roof); it glitches as RECALCULATING. did
    floor48: { win: 'COME UP, THEN.', rug: 'FINALLY.', p: 38, eye: 'twitch', glitch: ['COME', 'C0ME'] },
    elevator: { rug: 'STAY. DOWN.', p: 22, eye: 'twitch' },
    roof: { win: 'UNLIKELY.', rug: 'PLEASE STAY DOWN.', p: 4, eye: 'red' }
  };
  const CAP = { bg: '#140806', rule: '#ff7a2a', ink: '#ffd060', label: '#ff7a2a', val: '#fff6e2', dim: '#9a5a2a', warn: '#ff7050', edge: '#140806' };
  const PZ = { bg: '#16112a', rule: '#ffd44a', ink: '#ffd44a', text: '#fff6e2', dim: '#a89cc4' };
  const PIC_W = 480, PIC_H = 270, BAND = 102, NOTE_BAND = 120, SAVE_BAND = 158;   // NOTE_BAND: 112 left its line touching the buttons (owner, Oct 16)
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  // 2ND, 312TH: the game's font has no #
  const ord = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : n % 10 === 1 ? 'ST' : n % 10 === 2 ? 'ND' : n % 10 === 3 ? 'RD' : 'TH');
  const commas = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const runClock = ms => { const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = String(s % 60).padStart(2, '0'); return h ? h + ':' + String(m).padStart(2, '0') + ':' + ss : m + ':' + ss; };

  function make(o) {
    const A = o.A, act = o.actions, arena = o.arena, stageEl = o.stage;
    const root = document.createElement('div'); root.className = 'lcard'; root.hidden = true;
    const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
    const btns = document.createElement('div'); btns.className = 'lbtns';
    const say = document.createElement('p'); say.className = 'sr'; say.setAttribute('aria-live', 'polite');
    root.append(cv, btns, say); arena.append(root);
    const g = cv.getContext('2d');
    let info = null, t0 = 0, confirm = null, buttons = [], upright = false, cw = PIC_W, ch = BAND, zones = [];
    // the board step (info.lb, from game.js): a roof clear checks the board, offers initials and saves them; a rugged
    // or retried run gets a line saying why it isn't processed. lbs is the clear's step: st check, offer, pick, busy,
    // saved, skipped or off, since at (seconds into the card), the board it found (data), the save's answer (result)
    let lbs = null;

    const ease = k => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
    const count = (v, t, s, d = .6) => Math.round(v * ease((t - s) / d));
    const typed = (s, t, at, cps) => s.slice(0, Math.max(0, Math.floor((t - at) * cps)));
    const clock = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
    const now = () => performance.now() / 1000;
    const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const tw = (s, sc) => A.textWidth(s, sc);
    function txt(s, x, y, col, sc, align, edge) { if (edge) A.otxt(g, s, x, y, col, sc, align || 'left', edge); else A.txt(g, s, x, y, col, sc, align || 'left'); }
    function wrap(s, max) { const out = []; let line = ''; for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > max) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); } if (line) out.push(line); return out; }

    // p(Loom)'s eye: the 48th Floor's three discs; steady, twitching, or red
    function eye(cx, cy, mood, t) {
      const red = mood === 'red', blink = (t % 3.2) > 3.05;
      let dx = 0; if (mood === 'twitch' && (t % 1.7) > 1.5) dx = (Math.floor(t * 20) % 2) * 2 - 1; if (red) dx = Math.round(Math.sin(t * 9));
      A.disc(g, cx, cy, 6, red ? '#ff3020' : '#ff7a2a');
      if (blink) { R(cx - 6, cy - 1, 13, 2, CAP.bg); return; }
      A.disc(g, cx, cy, 3, red ? '#ffb0a0' : '#ffd060'); A.disc(g, cx + dx, cy, 2, CAP.bg);
    }
    function chip(x, y, s, bg, fg) { const w = tw(s, 2) + 8; R(x, y, w, 14, bg); txt(s, x + 4, y + 2, fg, 2); return w; }
    function header(x, y, w, L, t) {
      eye(x + 7, y + 6, L.eye, t);
      txt('P(LOOM)', x + 18, y + 2, CAP.label, 2);
      txt(L.p + '%', x + w, y + 2, CAP.dim, 2, 'right');
      return x + 18 + tw('P(LOOM)', 2) + 10;
    }
    // the run's mode, small and dim, ahead of the flags (item 29)
    const MODE_NAMES = { baby: 'BABY BULL', regular: 'REGULAR BULL', raging: 'RAGING BULL', impossibull: 'IMPOSSIBULL' };
    function flags(x, y, t) {
      const mode = MODE_NAMES[info.mode];
      if (mode) { txt(mode, x, y + 2, CAP.dim, 2); x += tw(mode, 2) + 8; }
      if (t < 1.4) return;
      if (info.best) x += chip(x, y, 'NEW BEST', Math.floor(t * 3) % 2 ? CAP.rule : CAP.ink, CAP.bg) + 6;
      if (info.retried && info.kind === 'clear') chip(x, y, 'RETRIED', '#d63428', '#fff6e2');
    }
    function mood(L) { return info.kind === 'rugged' ? L.rug : L.win; }
    function moodLine(L, x, y, t) {
      let s = mood(L); if (!s) return;
      if (L.glitch && info.kind === 'clear' && Math.floor(t * 7) % 9 === 0) s = s.replace(L.glitch[0], L.glitch[1]);
      txt(typed(s, t, .9, 30), x, y, CAP.ink, 2, 'left', CAP.edge);
    }
    function title() { return info.kind === 'rugged' ? 'UNIT RUGGED.' : info.dept + ': OFFLINE.'; }
    function rows(t) {
      if (info.kind === 'clear') return [['SOULS FREED', 'SOULS', String(count(info.souls, t, 1.1))], ['TIME', 'TIME', clock(count(info.time, t, 1.25))], ['RUN TOTAL', 'RUN', String(count(info.run, t, 1.4))]];
      const n = count(info.lost, t, 1.1);
      return [['SOULS LOST', 'SOULS', n ? '-' + n : '0'], ['BACK TO', 'BACK TO', info.back]];
    }

    // ---- the board step ----
    const saving = () => !!(info && info.lb && info.lb.kind === 'save');
    const noting = () => !!(info && info.lb && (info.lb.kind === 'rugged' || info.lb.kind === 'retried'));
    const hatAt = (kind, x, y, sc, th) => UnrugHats.beside(g, kind, x, y, sc, th);   // the run's hat, left of its initials (hats.js)
    function inputIcon(kind, x, y, col) {
      if (kind === 'touch') { R(x + 1, y, 5, 9, col); R(x + 2, y + 1, 3, 6, CAP.bg); }
      else { R(x, y + 2, 9, 6, col); for (const [a, b] of [[1, 3], [4, 3], [7, 3], [2, 5], [5, 5]]) R(x + a, y + b, 1, 1, CAP.bg); }
    }
    function crossedTrophy(x, y) {   // the HUD's flag after a retry
      const col = CAP.dim;
      R(x, y, 9, 1, col); R(x + 1, y + 1, 7, 4, col); R(x, y + 1, 1, 2, col); R(x + 8, y + 1, 1, 2, col); R(x + 3, y + 5, 3, 2, col); R(x + 2, y + 7, 5, 1, col);
      for (let i = 0; i < 11; i++) R(x - 1 + i, y + 8 - i, 1, 2, CAP.warn);
    }
    // a rugged or retried full run: one line why it isn't processed
    function note(x, y, t, wide) {
      if (info.lb.kind === 'rugged') {
        if (wide) txt(typed('ONLY COMPLETED UNITS ARE PROCESSED.', t, .4, 40), x, y, CAP.dim, 2);
        else { txt(typed('ONLY COMPLETED UNITS', t, .4, 40), x, y, CAP.dim, 2); txt(typed('ARE PROCESSED.', t, .9, 40), x, y + 14, CAP.dim, 2); }
        return;
      }
      crossedTrophy(x, y);
      txt('OFF THE RECORD.', x + 16, y + 1, CAP.warn, 2);
      if (wide) txt(typed('RETRIED RUNS ARE NOT PROCESSED.', t, .3, 40), x + 16 + tw('OFF THE RECORD.', 2) + 8, y + 1, CAP.dim, 2);
      else txt(typed('RETRIED RUNS ARE NOT PROCESSED.', t, .3, 40), x, y + 16, CAP.dim, 2);
    }
    // up to n of a board's rows from y, yours highlighted: rank, the hat beside the initials, souls, time, input
    function boardRows(list, x, y, w, n) {
      list.slice(0, n).forEach((e, i) => {
        const ry = y + i * 17;
        if (e.me) { R(x - 4, ry - 3, w + 6, 14, '#3a1a0c'); R(x - 4, ry - 3, 2, 14, CAP.rule); }
        txt(e.rank + '.', x + 30, ry, e.me ? CAP.ink : CAP.dim, 2, 'right');
        if (e.hat) hatAt(e.hat, x + 35, ry, 2);
        txt(e.name, x + 53, ry, e.me || e.rank === 1 ? CAP.ink : CAP.val, 2);
        txt(String(e.score), x + w - 92, ry, CAP.val, 2, 'right');
        if (e.time != null) txt(runClock(e.time), x + w - 16, ry, CAP.val, 2, 'right');
        inputIcon(e.input, x + w - 10, ry - 2, CAP.dim);
      });
    }
    // the five rows a saved or skipped run shows: the top five, or the top four and yours
    function fiveRows() {
      const lb = info.lb, saved = lbs.st === 'saved', d = saved ? lbs.result : lbs.data;
      if (!d) return [];
      const rows = d.rows.map(e => Object.assign({}, e));
      if (saved) {
        const rank = d.rank || d.position, mine = rows.find(e => e.rank === rank && e.name === lbs.name && e.score === lb.score);
        if (mine) mine.me = true;
        if (!mine || rank > 5) return rows.slice(0, 4).concat(mine && rank > 5 ? [mine] : [{ rank, name: lbs.name, score: lb.score, hat: lb.hat, time: lb.time * 1000, input: lb.input, me: true }]);
      }
      return rows.slice(0, 5);
    }
    function offerLines() {
      const d = lbs.data;
      return [d.placement ? 'NEW HIGH SCORE. ' + ord(d.placement) + '.' : "YOU'D BE " + ord(d.position) + ' OF ' + commas(d.total) + '.', 'SUBMIT INITIALS FOR PROCESSING.'];
    }
    // what the step says now, line by line, with each line's colour
    function stepLines(t) {
      const s = t - lbs.at, d = lbs.data;
      if (lbs.st === 'check') return [[typed('CHECKING THE BOARD...', s, .1, 30), CAP.dim]];
      if (lbs.st === 'off') return [[typed('BOARD OFFLINE.', s, 0, 40), CAP.dim], [typed('UNPROCESSED.', s, .4, 40), CAP.dim]];
      if (lbs.st === 'offer') { const [a, b] = offerLines(); return [[typed(a, s, 0, 40), CAP.val], [typed(b, s, .5, 40), CAP.ink]]; }
      if (lbs.st === 'pick' || lbs.st === 'busy') return [[lbs.st === 'busy' ? 'PROCESSING...' : lbs.msg || 'INITIALS', lbs.msg && lbs.st === 'pick' ? CAP.warn : CAP.label]];
      if (lbs.st === 'saved') { const r = lbs.result; return [['PROCESSED. ' + ord(r.position || r.rank) + ' OF ' + commas(r.total) + '.', CAP.val]]; }
      return [['UNPROCESSED. IT WOULD BE ' + ord(d.placement || d.position) + '.', CAP.dim]];
    }
    // the three letters: an arrow above and below each, the slot you're on lit, the run's hat over them
    function picker(x0, y0, sw, ah, bh, gap) {
      for (let j = 0; j < 3; j++) {
        const sx = x0 + j * (sw + gap), on = j === lbs.slot;
        arrowBox(sx, y0, sw, ah, true);
        R(sx, y0 + ah + 4, sw, bh, on ? '#3a1a0c' : '#22140e'); R(sx, y0 + ah + bh + 2, sw, 2, on ? CAP.rule : CAP.dim);
        const sc = bh >= 40 ? 5 : 4;
        txt(ABC[lbs.letters[j]], sx + sw / 2, y0 + ah + 4 + Math.round((bh - 5 * sc) / 2), on ? CAP.ink : CAP.val, sc, 'center', CAP.edge);
        arrowBox(sx, y0 + ah + bh + 8, sw, ah, false);
      }
      if (info.lb.hat) hatAt(info.lb.hat, x0 - 7 * (upright ? 3 : 2) - (upright ? 8 : 4), y0 + ah + 4, upright ? 3 : 2, bh);   // the run's hat, left of the letters
    }
    function arrowBox(x, y, w, h, up) {   // drawn: the font has no ^
      R(x, y, w, h, '#22140e'); R(x, y, w, 1, CAP.dim); R(x, y + h - 1, w, 1, CAP.dim); R(x, y, 1, h, CAP.dim); R(x + w - 1, y, 1, h, CAP.dim);
      const cx = Math.round(x + w / 2), cy = Math.round(y + h / 2);
      for (let i = 0; i < 5; i++) R(cx - 1 - i * 2, up ? cy - 4 + i * 2 : cy + 3 - i * 2, 2 + i * 4, 2, CAP.val);
    }
    // the clear that goes on the board: the run's souls and time (what it posts), then the step
    function drawSave(t, L, fx) {
      const x = 12, right = cw - 12, w = right - x, st = lbs.st, pick = st === 'pick' || st === 'busy';
      const lb = info.lb, rows = st === 'saved' || st === 'skipped' ? fiveRows() : st === 'offer' && !upright || pick && !upright ? (lbs.data ? lbs.data.rows.slice(0, 5) : []) : [];
      if (upright) {
        const tall = ch >= 290;   // room for the picker under the numbers; a short panel gives it the card
        if (!pick || tall) {
          flags(x, 64, t);
          txt(typed(title(), t, .3, 30), x, 30, CAP.ink, 3, 'left', CAP.edge);
          moodLine(L, x, 51, t);
          totals(t, right, 30);
          R(x, 82, w, 1, '#3a1a0c');
        }
        const top = pick && !tall ? 28 : 90;
        stepLines(t).forEach(([s, c], i) => txt(s, x, top + i * 14, c, 2));
        if (pick) picker(Math.round((cw - 3 * 56 - 2 * 14) / 2), top + 16, 56, 38, 40, 14);
        else boardRows(rows, x, 124, w, Math.max(0, Math.min(5, Math.floor((ch - 52 - 8 - 124) / 17) + 1)));
        return;
      }
      flags(fx, 5, t);
      if (pick) {
        picker(24, 22, 52, 34, 36, 8);
        let n = 0;
        for (const [s, c] of stepLines(t)) for (const l of wrap(s, 14)) txt(l, 352, 30 + 14 * n++, c, 2);
        return;
      }
      txt(typed(title(), t, .3, 30), x, 26, CAP.ink, 3, 'left', CAP.edge);
      moodLine(L, x, 46, t);
      totals(t, right, 26);
      R(x, 64, w, 1, '#3a1a0c');
      let n = 0;   // the left column, clear of the rows
      for (const [s, c] of stepLines(t)) for (const l of wrap(s, 28)) txt(l, x, 74 + 14 * n++, c, 2);
      boardRows(rows, 252, 75, right - 252, 5);
    }
    // the roof's souls and time, and the run's TOTAL under them (what posts, in gold), right of the title
    function totals(t, right, y) {
      const rows = [['ROOF', info.souls, info.time, CAP.val], ['TOTAL', info.lb.score, info.lb.time, CAP.ink]];
      rows.forEach(([label, souls, time, col], i) => {
        const at = 1 + i * .2, ry = y + i * 14;
        if (t < at) return;
        txt(label, right - 112, ry, CAP.label, 2);
        txt(String(count(souls, t, at)), right - 40, ry, col, 2, 'right');
        txt(clock(count(time, t, at + .15)), right, ry, col, 2, 'right');
      });
    }

    // ---- sideways and desktop: a band over the bottom of the picture ----
    function drawBand(t) {
      const L = LINES[info.who] || LINES.floor13;
      const by = info.kind === 'pause' ? Math.round((1 - ease(t / .2)) * ch) : Math.round((1 - ease(t / .3)) * ch / 2) * 2;
      g.clearRect(0, 0, cw, ch);
      if (info.kind === 'pause') return drawPauseBand(t, by);
      R(0, by, cw, ch - by, CAP.bg); R(0, by, cw, 2, CAP.rule);
      if (by) return false;
      const x = 12, right = cw - 12, fx = header(x, 6, right - x, L, t), y = 26;
      flags(fx, 5, t);
      if (confirm) {
        txt('RETRY?', x, y, CAP.ink, 3, 'left', CAP.edge);
        if (info.unlock) {
          // a Raging Bull run that could still open Impossibull says so too (owner, Oct 16), beside RETRY? to clear the buttons
          const wx = x + tw('RETRY?', 3) + 12;
          txt(typed('YOUR RETRY WILL NOT COUNT ON THE LEADERBOARD', t, confirm.at, 70), wx, y + 1, CAP.warn, 2);
          txt(typed('OR UNLOCK IMPOSSIBULL.', t, confirm.at + .6, 70), wx, y + 14, CAP.warn, 2);
        } else txt(typed('YOUR RETRY WILL NOT COUNT ON THE LEADERBOARD.', t, confirm.at, 70), x, y + 20, CAP.warn, 2);
        return true;
      }
      if (saving()) { drawSave(t, L, fx); return true; }
      txt(typed(title(), t, .3, 30), x, y, CAP.ink, 3, 'left', CAP.edge);
      moodLine(L, x, y + 20, t);
      const r = rows(t), xs = r.length === 3 ? [right - 136, right - 66, right] : [right - 126, right];
      r.forEach(([, short, v], i) => {
        if (t < 1 + i * .15) return;
        const long = v.length > 5;
        txt(v, xs[i], y + (long ? 3 : 0), CAP.val, long ? 2 : 3, 'right', CAP.edge);
        txt(short, xs[i], y + 20, CAP.label, 2, 'right');
      });
      if (noting()) note(x, 62, t, true);
      return true;
    }
    function drawPauseBand(t, by) {
      R(0, by, cw, ch - by, PZ.bg); R(0, by, cw, 2, PZ.rule);
      if (by) return false;
      pauseHead(12, 8, cw - 24, 56);
      return true;
    }
    function pauseHead(x, y, w, max) {
      R(x, y, 3, 10, PZ.ink); R(x + 6, y, 3, 10, PZ.ink);
      txt('PAUSED', x + 16, y + 1, PZ.ink, 2);
      txt(info.dept, x + w, y + 1, PZ.dim, 2, 'right');
      wrap(info.line || '', max).forEach((l, i) => txt(l, x, y + 20 + i * 12, PZ.text, 2));
    }

    // ---- upright: the panel under the picture ----
    function drawPanel(t) {
      const L = LINES[info.who] || LINES.floor13;
      const sh = Math.round(ch * ease(t / .25));
      g.clearRect(0, 0, cw, ch);
      const pz = info.kind === 'pause';
      R(0, 0, cw, sh, pz ? PZ.bg : CAP.bg); R(0, 0, cw, 2, pz ? PZ.rule : CAP.rule);
      if (sh < ch) return false;
      const x = 12, w = cw - 24;
      if (pz) { pauseHead(x, 8, w, 34); return true; }
      header(x, 6, w, L, t);
      let y = 32;
      if (confirm) {
        txt('RETRY?', x, y, CAP.ink, 3, 'left', CAP.edge); y += 21;
        txt(typed('YOUR RETRY WILL NOT COUNT', t, confirm.at, 70), x, y, CAP.warn, 2);
        txt(typed(info.unlock ? 'ON THE LEADERBOARD' : 'ON THE LEADERBOARD.', t, confirm.at + .4, 70), x, y + 13, CAP.warn, 2);
        if (info.unlock) txt(typed('OR UNLOCK IMPOSSIBULL.', t, confirm.at + .7, 70), x, y + 26, CAP.warn, 2);
        return true;
      }
      if (saving()) { drawSave(t, L); return true; }
      txt(typed(title(), t, .3, 30), x, y, CAP.ink, 3, 'left', CAP.edge); y += 21;
      moodLine(L, x, y, t); y += 22;
      rows(t).forEach(([label, , v], i) => {
        const at = 1 + i * .2;
        txt(typed(label, t, at, 50), x, y + 3, CAP.label, 2);
        if (t > at + .2) txt(v, x + w, y, CAP.val, v.length > 9 ? 2 : 3, 'right', CAP.edge);
        y += 25;
      });
      flags(x, y + 4, t);
      if (noting()) note(x, y + 26, t, false);
      return true;
    }

    // ---- where the card and its buttons go ----
    function place() {
      const a = arena.getBoundingClientRect(), s = stageEl.getBoundingClientRect();
      upright = a.width < a.height;
      const st = root.style;
      if (upright) {
        const top = s.bottom - a.top, h = a.bottom - s.bottom;
        st.left = '0px'; st.top = top + 'px'; st.width = a.width + 'px'; st.height = h + 'px';
        cw = 320; ch = Math.max(200, Math.round(h * 320 / a.width));
      } else {
        const band = info.kind === 'pause' ? pauseBand() : saving() ? SAVE_BAND : noting() ? NOTE_BAND : BAND, k = s.width / PIC_W;
        st.left = (s.left - a.left) + 'px'; st.top = (s.bottom - a.top - band * k) + 'px'; st.width = s.width + 'px'; st.height = band * k + 'px';
        cw = PIC_W; ch = band;
      }
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
      // the buttons, in the canvas's pixels
      const n = buttons.length;
      // The buttons are drawn here in the game's pixel font, sized to their labels, on the text's 12-pixel gutter with
      // 8 between them (owner, Oct 16: the HTML buttons were big boxes with small text, and the spacing was off).
      if (!n) zones = [];
      else if (upright) {
        // thumbs: the main button full width at the bottom (40 CSS px on a 360 px phone), the rest in pairs above it,
        // Quit furthest from it
        const full = cw - 24, half = (full - 8) / 2, rest = buttons.map((b, i) => i).slice(1).sort((a, b) => quitFirst(a) - quitFirst(b));
        zones = []; let y = ch - 12 - 32; zones[0] = { x: 12, y, w: full, h: 32 };
        const rows = []; for (let i = 0; i < rest.length; i += 2) rows.push(rest.slice(i, i + 2));
        for (let r = rows.length - 1; r >= 0; r--) {
          y -= 8 + 26;
          rows[r].forEach((bi, j) => { zones[bi] = { x: rows[r].length === 1 ? 12 : 12 + j * (half + 8), y, w: rows[r].length === 1 ? full : half, h: 26 }; });
        }
      } else if (info.kind === 'pause') {
        // two rows under the line, sized to their labels
        let x = 12, y = pauseTop();
        zones = buttons.map((b, i) => { if (i === 3) { x = 12; y += 24 + 8; } const z = { x, y, w: labelW(b), h: 24 }; x += z.w + 8; return z; });
      } else {
        // level-end cards: one row at the bottom right, under the numbers, ending on their right edge
        let x = cw - 12; zones = [];
        for (let i = n - 1; i >= 0; i--) { const w = labelW(buttons[i]); x -= w; zones[i] = { x, y: ch - 12 - 24, w, h: 24 }; x -= 8; }
      }
      zones = zones.map((z, i) => buttons[i].z ? buttons[i].z() : z);   // the board step places its own
      const kx = root.clientWidth / cw, ky = root.clientHeight / ch;
      // the drawn buttons can be smaller than a finger: each target is at least 44 CSS px, centred on what's drawn
      buttons.forEach((b, i) => {
        const z = zones[i], bs = b.el.style, mh = Math.max(z.h, 44 / ky), mw = Math.max(z.w, 44 / kx);
        const y = Math.max(0, Math.min(ch - mh, z.y - (mh - z.h) / 2)), x = z.x - (mw - z.w) / 2;
        bs.left = x * kx + 'px'; bs.top = y * ky + 'px'; bs.width = mw * kx + 'px'; bs.height = mh * ky + 'px';
      });
    }

    const labelW = b => tw(b.label, 2) + 24;
    const quitFirst = i => buttons[i] && buttons[i].label === 'Quit' ? -1 : 0;
    // the pause card sideways: the line, then the buttons 10 below it, two rows of 24, and 12 under them
    const pauseLines = () => wrap(info.line || '', 56).length;
    const pauseTop = () => 28 + pauseLines() * 12 + 10;
    const pauseBand = () => pauseTop() + 24 + 8 + 24 + 12;
    function setButtons(list) {
      btns.textContent = '';
      buttons = list.map(b => {
        const el = document.createElement('button'); el.type = 'button'; el.className = b.pk ? 'lpk' : 'lb' + (b.sec ? ' sec' : '');
        el.textContent = b.label; if (b.id) el.id = b.id; if (b.aria) el.setAttribute('aria-label', b.aria);
        if (lbs && lbs.st === 'busy') el.disabled = true;
        if (b.slot != null) el.addEventListener('focus', () => { if (lbs) lbs.slot = b.slot; });
        const me = Object.assign({ el, on: false, down: false }, b);
        // what the drawn button shows: lit while it has the focus (the mouse over it gives it the focus, so keys and
        // mouse agree), pressed while held; a move makes a tick, a press a pick (Resume's close is the game's)
        el.addEventListener('focus', () => { me.on = true; if (!quietFocus && !b.pk) sfx('move'); });
        el.addEventListener('blur', () => { me.on = false; me.down = false; });
        el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && document.activeElement !== el && el.style.visibility !== 'hidden') try { el.focus({ preventScroll: true }); } catch (x) {} });
        el.addEventListener('pointerdown', () => { me.down = true; });
        for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, () => { me.down = false; });
        el.addEventListener('click', () => { if (!b.pk && b.go !== act.resume) sfx('pick'); b.go(); });
        btns.append(el);
        return me;
      });
    }
    let quietFocus = false;
    const sfx = name => { if (act.sfx) act.sfx(name); };
    // the buttons, drawn on the card in the game's pixel font (the HTML buttons over them are clear, for touch,
    // the keyboard and screen readers); the pause card's come in one after another as it lands
    function drawButtons(t) {
      const pz = info.kind === 'pause', C = pz ? PZ : CAP;
      buttons.forEach((b, i) => {
        const z = zones[i]; if (b.pk || !z || b.el.style.visibility === 'hidden') return;
        const a = pz ? Math.max(0, Math.min(1, (t - .18 - i * .025) / .12)) : 1; if (a <= 0) return;
        g.save(); g.globalAlpha = a * (b.el.disabled ? .55 : 1);
        const dy = b.down ? 2 : 0, x = z.x, y = z.y + dy, w = z.w, h = z.h, ty = y + Math.round((h - 10) / 2);
        const gold = pz ? PZ.ink : CAP.rule, back = pz ? PZ.bg : CAP.bg, deep = pz ? '#b8861a' : '#8a3a10';
        if (!b.sec) {
          if (!b.down) R(x, y + 2, w, h, deep);
          R(x, y, w, h, b.on ? '#fff6e2' : gold); R(x + 1, y + 1, w - 2, h - 2, gold);
          txt(b.label, x + w / 2, ty, back, 2, 'center');
        } else {
          R(x, y, w, h, b.on ? gold : pz ? '#3a2f58' : '#5a2a14'); R(x + 1, y + 1, w - 2, h - 2, b.on ? (pz ? '#221a3a' : '#22100a') : back);
          txt(b.label, x + w / 2, ty, b.on ? gold : b.label === 'Quit' ? C.dim : pz ? PZ.text : CAP.val, 2, 'center');
        }
        g.restore();
      });
    }
    function buttonsFor() {
      if (info.kind === 'pause') return [
        { label: 'Resume', go: act.resume }, { label: 'Restart floor', sec: true, go: act.restart }, { label: 'Controls', sec: true, go: act.controls },
        { label: act.soundLabel(), sec: true, id: 'lSnd', go: () => { act.sound(); relabel(); } },
        ...(act.canFull() ? [{ label: act.fullLabel(), sec: true, id: 'lFs', go: () => { act.full(); relabel(); } }] : []),
        { label: 'Quit', sec: true, go: act.quit }];
      if (info.kind === 'clear' && saving()) return saveButtons();
      if (info.kind === 'clear') return [{ label: 'Continue', go: act.next }];
      if (confirm) return [{ label: 'Retry', go: act.retry }, { label: 'Back', sec: true, go: () => { confirm = null; setButtons(buttonsFor()); place(); focus(); } }];
      return [{ label: 'Retry', go: () => { if (info.ranked) { confirm = { at: now() - t0 }; setButtons(buttonsFor()); place(); focus(); say.textContent = 'Retry? Your retry will not count on the leaderboard' + (info.unlock ? ' or unlock Impossibull.' : '.'); } else act.retry(); } }, { label: 'Quit', sec: true, go: act.quit }];
    }
    function relabel() { for (const b of buttons) { if (b.id === 'lSnd') b.el.textContent = b.label = act.soundLabel(); if (b.id === 'lFs') b.el.textContent = b.label = act.fullLabel(); } }
    function focus() { const b = lbs && lbs.st === 'pick' ? buttons.find(x => x.slot === lbs.slot) : buttons[0]; if (b && b.el.style.visibility !== 'hidden') { quietFocus = true; try { b.el.focus({ preventScroll: true }); } catch (e) {} quietFocus = false; } }

    // ---- the board step's buttons and moves ----
    function saveButtons() {
      const st = lbs.st, U = () => upright;
      if (st === 'check') return [];
      if (st === 'offer') return [
        { label: 'Enter initials', go: () => step('pick'), z: () => U() ? { x: 12, y: ch - 52, w: 200, h: 40 } : { x: 12, y: ch - 42, w: 140, h: 38 } },
        { label: 'Skip', sec: true, go: () => step('skipped'), z: () => U() ? { x: 216, y: ch - 52, w: 92, h: 40 } : { x: 158, y: ch - 42, w: 78, h: 38 } }];
      if (st === 'pick' || st === 'busy') {
        // where the picker draws (drawSave): upright under the step's line, sideways at the band's left
        const geo = () => U() ? { x0: Math.round((cw - 3 * 56 - 2 * 14) / 2), y0: (ch >= 290 ? 90 : 28) + 16, sw: 56, ah: 38, bh: 40, gap: 14 } : { x0: 24, y0: 22, sw: 52, ah: 34, bh: 36, gap: 8 };
        const list = [];
        for (let j = 0; j < 3; j++) {
          const col = g => g.x0 + j * (g.sw + g.gap);
          list.push({ pk: true, label: '', aria: 'Next character for initial ' + (j + 1), go: () => cycle(j, 1), z: () => { const g = geo(); return { x: col(g), y: g.y0, w: g.sw, h: g.ah }; } });
          list.push({ pk: true, label: '', aria: 'Initial ' + (j + 1) + ': ' + ABC[lbs.letters[j]], slot: j, go: () => { lbs.slot = j; }, z: () => { const g = geo(); return { x: col(g), y: g.y0 + g.ah + 4, w: g.sw, h: g.bh }; } });
          list.push({ pk: true, label: '', aria: 'Previous character for initial ' + (j + 1), go: () => cycle(j, -1), z: () => { const g = geo(); return { x: col(g), y: g.y0 + g.ah + g.bh + 8, w: g.sw, h: g.ah }; } });
        }
        list.push({ label: 'OK', go: ok, z: () => U() ? { x: 12, y: ch - 52, w: 200, h: 40 } : { x: 212, y: 24, w: 120, h: 50 } });
        list.push({ label: 'Skip', sec: true, go: () => step('skipped'), z: () => U() ? { x: 216, y: ch - 52, w: 92, h: 40 } : { x: 212, y: 84, w: 120, h: 40 } });
        return list;
      }
      // processed, unprocessed or offline: the card's own button, beside the rows sideways
      return [{ label: 'Continue', go: act.next, z: () => U() ? { x: 12, y: ch - 52, w: cw - 24, h: 40 } : { x: 12, y: ch - 42, w: 140, h: 38 } }];
    }
    function step(st) {
      if (!lbs || lbs.st === 'busy' && st !== 'saved' && st !== 'skipped' && st !== 'pick') return;
      if (st === 'pick' && lbs.st !== 'busy') lbs.msg = '';
      lbs.st = st; lbs.at = now() - t0; info.focused = false;
      setButtons(buttonsFor()); place();
      const d = lbs.data;
      say.textContent = st === 'offer' ? offerLines().join(' ') : st === 'pick' ? (lbs.msg ? 'Try other initials.' : 'Enter your initials.')
        : st === 'saved' ? 'Processed. ' + ord(lbs.result.position || lbs.result.rank) + ' of ' + commas(lbs.result.total) + '.'
        : st === 'skipped' && d ? 'Unprocessed. It would be ' + ord(d.placement || d.position) + '.' : st === 'off' ? 'Board offline.' : say.textContent;
    }
    function cycle(j, dv) { if (lbs.st !== 'pick') return; lbs.letters[j] = (lbs.letters[j] + dv + ABC.length) % ABC.length; lbs.slot = j; relabelSlots(); }
    function relabelSlots() { for (const b of buttons) if (b.slot != null) b.el.setAttribute('aria-label', 'Initial ' + (b.slot + 1) + ': ' + ABC[lbs.letters[b.slot]]); }
    function ok() {
      if (lbs.st !== 'pick') return;
      const lb = info.lb, name = lbs.letters.map(i => ABC[i]).join('');
      lbs.name = name; step('busy');
      lb.submit(name).then(r => {
        if (!info || info.lb !== lb) return;   // the card moved on
        if (r && r.ok) { lbs.result = r; step('saved'); }
        else if (r && r.error === 'name_not_allowed') { lbs.msg = 'TRY OTHER INITIALS.'; step('pick'); }
        else step('skipped');   // refused or failed: the board without the row, saying nothing more
      });
    }
    // keys for the step (game.js asks first while a card is up): Escape skips the offer; the picker takes letters and
    // digits, the arrows, Backspace, Enter (OK, or Skip when it has focus) and Escape, and keeps the game's shortcuts out
    function key(e) {
      if (!info) return false;
      // the arrows step through the buttons (owner, Oct 16), except on the initials picker, which uses them itself
      const arrows = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };
      if (arrows[e.key] && !(lbs && (lbs.st === 'pick' || lbs.st === 'busy'))) {
        const list = buttons.filter(b => !b.pk && b.el.style.visibility !== 'hidden'); if (!list.length) return true;
        const at = list.findIndex(b => b.el === document.activeElement), n = list.length;
        const next = list[at < 0 ? 0 : (at + arrows[e.key] + n) % n];
        try { next.el.focus({ preventScroll: true }); } catch (x) {}
        return true;
      }
      if (!saving() || !lbs || e.repeat && lbs.st !== 'pick') return false;
      const k = e.key;
      if (lbs.st === 'offer') { if (k === 'Escape') { step('skipped'); return true; } return false; }
      if (lbs.st === 'busy') return k !== 'Tab';
      if (lbs.st !== 'pick') return false;
      if (k === 'Tab' || k === ' ') return false;
      if (/^[a-z0-9]$/i.test(k)) { lbs.letters[lbs.slot] = ABC.indexOf(k.toUpperCase()); lbs.slot = (lbs.slot + 1) % 3; relabelSlots(); }
      else if (k === 'ArrowLeft' || k === 'Backspace') lbs.slot = (lbs.slot + 2) % 3;
      else if (k === 'ArrowRight') lbs.slot = (lbs.slot + 1) % 3;
      else if (k === 'ArrowUp') cycle(lbs.slot, 1);
      else if (k === 'ArrowDown') cycle(lbs.slot, -1);
      else if (k === 'Enter') { const skip = buttons[buttons.length - 1]; if (document.activeElement === skip.el) step('skipped'); else ok(); }
      else if (k === 'Escape') step('skipped');
      return true;
    }

    function show(kind, data) {
      info = Object.assign({ kind }, data); confirm = null; t0 = now();
      lbs = null;
      if (saving()) {
        const lb = info.lb, init = /^[A-Z0-9]{3}$/.test(lb.initials) ? lb.initials : 'AAA';
        // CHECKING THE BOARD... comes in once the numbers have counted up, and stays a beat even when the board answers at once
        lbs = { st: 'check', at: 1.2, letters: init.split('').map(c => ABC.indexOf(c)), slot: 0, loaded: false, data: null };
        const mine = lbs;
        lb.ready.then(d => { if (lbs === mine) { mine.data = d; mine.loaded = true; } });
      }
      root.hidden = false; root.classList.toggle('pz', kind === 'pause');
      setButtons(buttonsFor());
      place(); frame();
      if (kind === 'pause') { for (const b of buttons) b.el.style.visibility = 'visible'; info.focused = true; focus(); }   // the pause card is there at once
      say.textContent = kind === 'pause' ? 'Paused. ' + (info.line || '') : kind === 'clear' ? title() + ' ' + info.souls + ' souls freed.' : 'Rugged. ' + info.lost + ' souls lost. Retry goes back to ' + info.back.toLowerCase() + '.';
    }
    function hide() { if (root.hidden) return; root.hidden = true; info = null; confirm = null; lbs = null; btns.textContent = ''; buttons = []; }
    function frame() {
      if (!info) return;
      if (lbs && lbs.st === 'check' && lbs.loaded && now() - t0 - lbs.at >= 1.2) step(lbs.data ? 'offer' : 'off');
      place();
      const t = now() - t0, ready = upright ? drawPanel(t) : drawBand(t);
      // the board step's buttons wait for what they answer; a note's for its line
      const since = lbs ? t - lbs.at : 0;
      const on = info.kind === 'pause' || (ready && t > (noting() ? 1.2 : .6) && (!lbs || lbs.st === 'pick' || lbs.st === 'busy' || since > (lbs.st === 'offer' ? .9 : .3)));
      for (const b of buttons) b.el.style.visibility = on ? 'visible' : 'hidden';
      if (on && ready) drawButtons(t);
      if (on && !info.focused) { info.focused = true; focus(); }   // the main button takes the keyboard once it shows
    }
    // for the tests: what the card says and its buttons by label
    const labels = () => buttons.map(b => b.el.textContent);
    function press(label) { const b = buttons.find(x => x.el.textContent === label); if (!b) throw new Error('no ' + label + ' button: ' + labels().join(', ')); b.el.click(); }
    return { show, hide, frame, focus, key, labels, press, get info() { return info; }, get open() { return !!info; }, get kind() { return info && info.kind; }, get confirming() { return !!confirm; },
      get step() { return lbs ? lbs.st : null; }, get initials() { return lbs ? lbs.letters.map(i => ABC[i]).join('') : null; }, get slot() { return lbs ? lbs.slot : null; },
      get stepLines() { return lbs ? stepLines(99).map(l => l[0]) : null; } };
  }
  return { make, LINES };
})();
