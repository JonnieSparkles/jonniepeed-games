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
    floor48: { win: 'RECALCULATING.', rug: 'FINALLY.', p: 38, eye: 'twitch', glitch: true },
    elevator: { rug: 'STAY. DOWN.', p: 22, eye: 'twitch' },
    roof: { win: 'UNLIKELY.', rug: 'PLEASE STAY DOWN.', p: 4, eye: 'red' }
  };
  const CAP = { bg: '#140806', rule: '#ff7a2a', ink: '#ffd060', label: '#ff7a2a', val: '#fff6e2', dim: '#9a5a2a', warn: '#ff7050', edge: '#140806' };
  const PZ = { bg: '#16112a', rule: '#ffd44a', ink: '#ffd44a', text: '#fff6e2', dim: '#a89cc4' };
  const PIC_W = 480, PIC_H = 270, BAND = 102, PAUSE_BAND = 158;

  function make(o) {
    const A = o.A, act = o.actions, arena = o.arena, stageEl = o.stage;
    const root = document.createElement('div'); root.className = 'lcard'; root.hidden = true;
    const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true');
    const btns = document.createElement('div'); btns.className = 'lbtns';
    const say = document.createElement('p'); say.className = 'sr'; say.setAttribute('aria-live', 'polite');
    root.append(cv, btns, say); arena.append(root);
    const g = cv.getContext('2d');
    let info = null, t0 = 0, confirm = null, buttons = [], upright = false, cw = PIC_W, ch = BAND, zones = [];

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
      if (L.glitch && info.kind === 'clear' && Math.floor(t * 7) % 9 === 0) s = s.replace('CAL', 'C4L');
      txt(typed(s, t, .9, 30), x, y, CAP.ink, 2, 'left', CAP.edge);
    }
    function title() { return info.kind === 'rugged' ? 'UNIT RUGGED.' : info.dept + ': OFFLINE.'; }
    function rows(t) {
      if (info.kind === 'clear') return [['SOULS FREED', 'SOULS', String(count(info.souls, t, 1.1))], ['TIME', 'TIME', clock(count(info.time, t, 1.25))], ['RUN TOTAL', 'RUN', String(count(info.run, t, 1.4))]];
      const n = count(info.lost, t, 1.1);
      return [['SOULS LOST', 'SOULS', n ? '-' + n : '0'], ['BACK TO', 'BACK TO', info.back]];
    }

    // ---- sideways and desktop: a band over the bottom of the picture ----
    function drawBand(t) {
      const L = LINES[info.who] || LINES.floor13;
      const by = Math.round((1 - ease(t / .3)) * ch / 2) * 2;
      g.clearRect(0, 0, cw, ch);
      if (info.kind === 'pause') return drawPauseBand(t, by);
      R(0, by, cw, ch - by, CAP.bg); R(0, by, cw, 2, CAP.rule);
      if (by) return false;
      const x = 12, right = cw - 12, fx = header(x, 6, right - x, L, t), y = 26;
      flags(fx, 5, t);
      if (confirm) {
        txt('RETRY?', x, y, CAP.ink, 3, 'left', CAP.edge);
        txt(typed('YOUR RETRY WILL NOT COUNT ON THE LEADERBOARD.', t, confirm.at, 70), x, y + 20, CAP.warn, 2);
        return true;
      }
      txt(typed(title(), t, .3, 30), x, y, CAP.ink, 3, 'left', CAP.edge);
      moodLine(L, x, y + 20, t);
      const r = rows(t), xs = r.length === 3 ? [right - 136, right - 66, right] : [right - 126, right];
      r.forEach(([, short, v], i) => {
        if (t < 1 + i * .15) return;
        const long = v.length > 5;
        txt(v, xs[i], y + (long ? 3 : 0), CAP.val, long ? 2 : 3, 'right', CAP.edge);
        txt(short, xs[i], y + 20, CAP.label, 2, 'right');
      });
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
        txt(typed('ON THE LEADERBOARD.', t, confirm.at + .4, 70), x, y + 13, CAP.warn, 2);
        return true;
      }
      txt(typed(title(), t, .3, 30), x, y, CAP.ink, 3, 'left', CAP.edge); y += 21;
      moodLine(L, x, y, t); y += 22;
      rows(t).forEach(([label, , v], i) => {
        const at = 1 + i * .2;
        txt(typed(label, t, at, 50), x, y + 3, CAP.label, 2);
        if (t > at + .2) txt(v, x + w, y, CAP.val, v.length > 9 ? 2 : 3, 'right', CAP.edge);
        y += 25;
      });
      flags(x, y + 4, t);
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
        const band = info.kind === 'pause' ? PAUSE_BAND : BAND, k = s.width / PIC_W;
        st.left = (s.left - a.left) + 'px'; st.top = (s.bottom - a.top - band * k) + 'px'; st.width = s.width + 'px'; st.height = band * k + 'px';
        cw = PIC_W; ch = band;
      }
      if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
      // the buttons, in the canvas's pixels
      const n = buttons.length;
      if (upright) {
        const bh = 40, gap = info.kind === 'pause' ? 5 : 8, y0 = ch - 12 - n * bh - (n - 1) * gap;   // 45 CSS px on a 360 px phone
        zones = buttons.map((_, i) => ({ x: 12, y: y0 + i * (bh + gap), w: cw - 24, h: bh }));
      } else if (info.kind === 'pause') {
        zones = buttons.map((_, i) => ({ x: [80, 240, 400][i % 3] - 70, y: [56, 100][Math.floor(i / 3)], w: 140, h: 34 }));
      } else {
        const w = 112, h = 34, xs = n > 1 ? [240 - 8 - w, 240 + 8] : [240 - w / 2];   // 45 CSS px on a phone sideways
        zones = buttons.map((_, i) => ({ x: xs[i], y: ch - 37, w, h }));
      }
      const kx = root.clientWidth / cw, ky = root.clientHeight / ch;
      buttons.forEach((b, i) => { const z = zones[i], bs = b.el.style; bs.left = z.x * kx + 'px'; bs.top = z.y * ky + 'px'; bs.width = z.w * kx + 'px'; bs.height = z.h * ky + 'px'; bs.fontSize = Math.max(11, Math.min(16, z.h * ky * .36)) + 'px'; });
    }

    function setButtons(list) {
      btns.textContent = '';
      buttons = list.map(b => {
        const el = document.createElement('button'); el.type = 'button'; el.className = 'lb' + (b.sec ? ' sec' : '');
        el.textContent = b.label; if (b.id) el.id = b.id;
        el.addEventListener('click', b.go);
        btns.append(el);
        return Object.assign({ el }, b);
      });
    }
    function buttonsFor() {
      if (info.kind === 'pause') return [
        { label: 'Resume', go: act.resume }, { label: 'Restart floor', sec: true, go: act.restart }, { label: 'Controls', sec: true, go: act.controls },
        { label: act.soundLabel(), sec: true, id: 'lSnd', go: () => { act.sound(); relabel(); } },
        ...(act.canFull() ? [{ label: act.fullLabel(), sec: true, id: 'lFs', go: () => { act.full(); relabel(); } }] : []),
        { label: 'Quit', sec: true, go: act.quit }];
      if (info.kind === 'clear') return [{ label: 'Continue', go: act.next }];
      if (confirm) return [{ label: 'Retry', go: act.retry }, { label: 'Back', sec: true, go: () => { confirm = null; setButtons(buttonsFor()); place(); focus(); } }];
      return [{ label: 'Retry', go: () => { if (info.ranked) { confirm = { at: now() - t0 }; setButtons(buttonsFor()); place(); focus(); say.textContent = 'Retry? Your retry will not count on the leaderboard.'; } else act.retry(); } }, { label: 'Quit', sec: true, go: act.quit }];
    }
    function relabel() { for (const b of buttons) { if (b.id === 'lSnd') b.el.textContent = act.soundLabel(); if (b.id === 'lFs') b.el.textContent = act.fullLabel(); } }
    function focus() { const b = buttons[0]; if (b && b.el.style.visibility !== 'hidden') try { b.el.focus({ preventScroll: true }); } catch (e) {} }

    function show(kind, data) {
      info = Object.assign({ kind }, data); confirm = null; t0 = now();
      root.hidden = false; root.classList.toggle('pz', kind === 'pause');
      setButtons(buttonsFor());
      place(); frame();
      if (kind === 'pause') { for (const b of buttons) b.el.style.visibility = 'visible'; info.focused = true; focus(); }   // the pause card is there at once
      say.textContent = kind === 'pause' ? 'Paused. ' + (info.line || '') : kind === 'clear' ? title() + ' ' + info.souls + ' souls freed.' : 'Rugged. ' + info.lost + ' souls lost. Retry goes back to ' + info.back.toLowerCase() + '.';
    }
    function hide() { if (root.hidden) return; root.hidden = true; info = null; confirm = null; btns.textContent = ''; buttons = []; }
    function frame() {
      if (!info) return;
      place();
      const t = now() - t0, ready = upright ? drawPanel(t) : drawBand(t);
      const on = info.kind === 'pause' || (ready && t > .6);
      for (const b of buttons) b.el.style.visibility = on ? 'visible' : 'hidden';
      if (on && !info.focused) { info.focused = true; focus(); }   // the main button takes the keyboard once it shows
    }
    // for the tests: what the card says and its buttons by label
    const labels = () => buttons.map(b => b.el.textContent);
    function press(label) { const b = buttons.find(x => x.el.textContent === label); if (!b) throw new Error('no ' + label + ' button: ' + labels().join(', ')); b.el.click(); }
    return { show, hide, frame, focus, labels, press, get info() { return info; }, get open() { return !!info; }, get kind() { return info && info.kind; }, get confirming() { return !!confirm; } };
  }
  return { make, LINES };
})();
