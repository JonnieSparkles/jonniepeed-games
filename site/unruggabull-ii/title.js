// Unruggabull II: the title screen (docs/games/unruggabull-ii/title-plan.md).
// The first game's view down RugCo Alley, a night later: the owner's painting (title-art.js), with what lives on it drawn
// here (the garage's neon, RUGS, the carpet band on the tower, smoke, souls, p(Loom)'s eye in the pavilion, him), the
// logo, and an elevator panel with the difficulty picker: a call button per mode with a Doom-style bull face, a readout,
// the mode's board, Start, sound, full screen and Exit. Upright the painting fills the screen above the panel; sideways and on a
// desktop it's a 16:9 window that pans up from him to the eye, with the panel as a band over its bottom, like the cards.
// It draws on its own canvas over the arena, with transparent buttons over what it draws, so the game's picture is never
// touched. game.js says what the buttons do (actions); this file lays out, draws and remembers the mode.
var UnrugTitle = (function () {
  'use strict';
  const MODES = [
    { id: 'baby', name: 'BABY BULL', short: 'BABY', line: 'EXTRA HEALTH.' },
    { id: 'regular', name: 'REGULAR BULL', short: 'REGULAR', line: 'REGULAR HEALTH.' },
    { id: 'raging', name: 'RAGING BULL', short: 'RAGING', line: 'NO HEALTH RESETS.' },
    // owner, Oct 16: five hearts for the whole climb, nothing gives one back; locked until a full run is cleared on Raging Bull without a retry
    { id: 'impossibull', name: 'IMPOSSIBULL', short: 'IMPOSSI', line: 'NO HEALING.' }
  ];
  const MODE_KEY = 'unruggabull-ii-mode';
  // The painting, 480 x 640 picture pixels, and where things are on it.
  const AW = 480, AH = 640, WIN = 270, BAND_TOP = 188, BAND_H = 82, GRID = 320, PANEL_H = 290;
  const ART = {
    eye: { x: 240, y: 187, r: 7 },                    // in the pavilion on the tower's roof
    bull: 586, sideBull: 552,                          // his feet: in front of the shutter upright, at it for the pan
    safe: [30, 596],                                   // the logo's sky down to his feet: always on screen upright
    skyTo: 176,                                        // the bottom of the sky the logo sits in (the pavilion's top)
    pan: [370, 94], panLogo: 104,                      // sideways: the window's top row at the start and end of the pan
    board: { x: 177, y: 441, w: 126, h: 16 },          // the RUGCO EMPIRE board over the shutter
    carpet: { x: 202, y: 213, w: 79, h: 18 },          // the zig-zag rug band at the top of the tower
    rugs: { x: 381, y: 388, slope: -.8 },              // the blue sign panel on the right wall, drawn at a slant
    roof: 433,                                         // the garage's roof, where the smoke comes off
    souls: [[90, 590], [390, 600], [160, 500], [320, 510], [60, 380], [430, 350]]
  };
  const mod1 = v => ((v % 1) + 1) % 1;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = k => { k = clamp(k, 0, 1); return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; };
  const hash2 = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

  // ---------- the bull faces, one per mode (left halves, mirrored; E is an eye's white, its pupil drawn per frame) ----------
  const FACES = {
    baby: { half: ['..........', '..pP......', '..PPbbbbbb', '...bBBBFFF', '..bBBBBFFF', '.bBBEEEEBB', '.bBBEEEEBB', '.bBBEEEEBB', '.bBBBBBBBB', '..bBBSSSSS', '..bBSSnnSS', '..bBSSSSSS', '...bSSSSSS', '....bbSSSS', '......bbbb'],
      pal: { P: '#f2eee2', p: '#b8b4a8', B: '#a8724a', F: '#c8925e', b: '#6a4228', S: '#f0b8a0', n: '#c86070', E: '#ffffff' } },
    regular: { half: ['PP.........', '.PPP.......', '..pPPP..bbb', '....pPPbBBB', '......bBFFF', '.....bBBFFF', '....bBBBBFF', '..bbBBEEEBB', '.bBBBBEEEBB', '..bBBBBBBBB', '...bBBBBBBB', '....bBBSSSS', '....bBSSSSS', '....bSSnSSS', '....bSSnSSS', '....bSSSSmm', '.....bSSSSS', '......bbbbb'],
      pal: { P: '#f2eee2', p: '#b8b4a8', B: '#7a4a2c', F: '#9a6a40', b: '#4a2a18', S: '#ce8e60', n: '#2a1410', m: '#3a1a10', E: '#ffffff' } },
    raging: { half: ['P..........', 'PP.........', '.PP........', '..pPP..bbbb', '....pPPbBBB', '......bBBFF', '....bKKKBBF', '..bbBBEEKBB', '.bBBBBEEEBB', '..bBBBBBBBB', '...bBBBBBBB', '....bBBSSSS', '....bBSSSSS', '....bSnnSSS', '....bSnnSSS', '....bSMMMMM', '.....bSSSSS', '......bbbbb'],
      pal: { P: '#fff6e2', p: '#c8b8a8', B: '#6a2a1c', F: '#8a3a24', b: '#3a140c', S: '#b06a48', n: '#1a0806', M: '#fff6e2', K: '#140806', E: '#ffd0c0' } },
    // charcoal, cracked horns, eyes that glow, a gold ring through the nose, and fire where Raging has steam
    impossibull: { half: ['P..........', 'PP.........', 'PPk........', '.PPk...bbbb', '..pPPPbbBBB', '....pPbBBFF', '....bKKKBBF', '..bbBKEEKBB', '.bBBBBEEEBB', '..bBBBBBBBB', '...bBBBBBBB', '....bBBSSSS', '....bBSSSSS', '....bSnnSSS', '....bSnnSSS', '....bSSRSSS', '.....bSSRRR', '......bbbbb'],
      pal: { P: '#e8e0d0', p: '#a89c8c', k: '#3a3038', B: '#2e2228', F: '#44323a', b: '#100a0e', S: '#5a3a40', n: '#05030a', K: '#000000', E: '#fff6c8', R: '#ffd44a' } }
  };

  function make(o) {
    const A = o.A, act = o.actions, arena = o.arena, stageEl = o.stage;
    const cv = (w, h) => A.canvas(w, h);
    const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const T = (g, s, x, y, c, sc, al) => A.txt(g, s, x, y, c, sc || 1, al || 'left');
    const tw = (s, sc) => A.textWidth(s, sc);
    const now = () => performance.now() / 1000;
    const still = matchMedia('(prefers-reduced-motion: reduce)');

    // ---- the page: a canvas over the arena, and a button over each thing you can press ----
    const root = document.createElement('div'); root.className = 'ttl'; root.hidden = true;
    const screen = document.createElement('canvas'); screen.setAttribute('aria-hidden', 'true');
    const btnBox = document.createElement('div'); btnBox.className = 'tbtns';
    const say = document.createElement('p'); say.className = 'sr'; say.setAttribute('aria-live', 'polite');
    root.append(screen, btnBox, say); arena.append(root);
    const sg = screen.getContext('2d');
    const BUTTONS = {};
    const button = (id, label, go) => {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'tb'; el.setAttribute('aria-label', label); el.dataset.label = label;
      el.addEventListener('click', e => { e.stopPropagation(); go(); });
      btnBox.append(el); BUTTONS[id] = el; return el;
    };
    MODES.forEach((m, i) => button('mode' + i, m.name, () => pick(i)));
    button('start', 'Start', () => { press('start'); beep('start'); act.start(MODES[mode].id); });
    button('board', 'Top runs', () => { press('board'); beep('tick'); board = true; });
    button('back', 'Back', () => { press('back'); beep('tick'); board = false; });
    button('sound', 'Sound', () => { press('sound'); act.sound(); beep('tick'); }).classList.add('tsnd');
    // full screen (owner, Oct 15): hidden where the browser can't do it, like the pause card's
    button('full', 'Full screen', () => { press('full'); beep('tick'); act.full(); });
    button('exit', 'Exit to JonniePeed Games', () => { press('exit'); beep('tick'); act.exit(); });

    // ---- state ----
    const locked = i => !!(act.locked && act.locked(MODES[i].id));
    let mode = 1;
    try { const v = localStorage.getItem(MODE_KEY), i = MODES.findIndex(m => m.id === v); if (i >= 0 && !locked(i)) mode = i; } catch (e) {}
    let deniedAt = -9;   // a locked mode was pressed: the readout says what it is and how to get it
    let board = false, t0 = now(), pan0 = t0, changedAt = -9, pressed = null, pressedAt = -9, shapeKey = '', zones = [];
    const t = () => now() - t0;
    function press(id) { pressed = id; pressedAt = t(); }
    // button sounds (owner, Oct 15): a tick for every press, the elevator's chirp when the mode changes, the start
    // jingle on Start; quiet until the browser lets sound start, like the rest of the game
    const beep = name => { if (act.play) act.play(name); };
    function pick(i) {
      if (locked(i)) { press('mode' + i); beep('empty'); deniedAt = t(); say.textContent = MODES[i].name + ', locked. ' + MODES[i].line + ' Beat Raging Bull.'; return; }
      press('mode' + i); beep('tick'); deniedAt = -9;
      faceSt[MODES[i].id].react = t();
      if (i === mode) return;
      beep('ready');
      mode = i; changedAt = t(); board = false;
      MODES.forEach((m, j) => BUTTONS['mode' + j].setAttribute('aria-pressed', String(j === mode)));
      try { localStorage.setItem(MODE_KEY, MODES[i].id); } catch (e) {}
      if (act.picked) act.picked(MODES[i].id);
      say.textContent = MODES[i].name + '. ' + MODES[i].line;
    }

    // ---- the painting ----
    let art = null;
    const img = new Image();
    img.onload = () => { art = cv(AW, AH); art.getContext('2d').drawImage(img, 0, 0); };
    img.src = window.UnrugTitleArt ? UnrugTitleArt.src : '';
    const comp = cv(AW, AH), cg = comp.getContext('2d');

    // him, from behind, three quarters of his size in play, the neon's warm light outlining him
    const bullImg = (() => { const src = A.POSES.stand, w = Math.round(src.width * .75), h = Math.round(src.height * .75), c = cv(w, h), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, w, h); return c; })();
    const rim = (() => { const c = cv(bullImg.width, bullImg.height), x = c.getContext('2d'); x.drawImage(bullImg, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffc870'; x.fillRect(0, 0, c.width, c.height); return c; })();
    const FEETX = Math.round(A.POSE_FEET.x * .75), FEETY = Math.round(A.POSE_FEET.y * .75);
    function drawBull(g, feet) { const bx = 240 - FEETX, by = feet - FEETY; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) g.drawImage(rim, bx + dx, by + dy); g.drawImage(bullImg, bx, by); }

    // neon letters: the game's font at 2x as tubes, each tube pixel with a bright core
    function neon(s, col, core) {
      const w = tw(s, 2), c = cv(w + 2, 12), x = c.getContext('2d');
      A.txt(x, s, 1, 1, col, 2);
      const d = x.getImageData(0, 0, c.width, c.height);
      for (let yy = 1; yy < c.height; yy += 2) for (let xx = 1; xx < c.width; xx += 2) if (d.data[(yy * c.width + xx) * 4 + 3]) R(x, xx, yy, 1, 1, core);
      return c;
    }
    const glowDraw = (g, c, x, y, a) => { g.save(); g.globalCompositeOperation = 'lighter'; for (const [r, al] of [[2, .1], [1, .2]]) { g.globalAlpha = al * a; for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r]]) g.drawImage(c, x + dx, y + dy); } g.restore(); };
    // RUGCO EMPIRE, with a P that won't stay lit
    const SIGN = 'RUGCO EMPIRE', P_AT = 1 + SIGN.indexOf('P') * 8;   // 2x letters are 8 pixels apart
    const signOn = neon(SIGN.replace('P', ' '), '#ff6a2a', '#ffd0a0');
    const signP = (() => { const c = neon(SIGN, '#ff6a2a', '#ffd0a0'), x = c.getContext('2d'); x.globalCompositeOperation = 'destination-in'; R(x, P_AT, 0, 6, 12, '#000'); return c; })();
    const signDead = neon(SIGN, '#3a1208', '#5a1a0c');
    function drawSign(g, tt) {
      const b = ART.board, x = Math.round(b.x + (b.w - signOn.width) / 2), y = b.y + 2;
      const buzz = (Math.floor(tt * 13) % 97) < 2, pOn = (Math.floor(tt * 9) % 23) > 5 && (Math.floor(tt * 30) % 4 !== 0 || (tt % 6) > 3);
      g.drawImage(signDead, x, y);
      if (!buzz) {
        // its light on the board's face and down the shutter
        g.save(); g.globalCompositeOperation = 'lighter';
        g.globalAlpha = .1; R(g, b.x, b.y, b.w, b.h, '#ff5a1a');
        for (let i = 0; i < 18; i++) { g.globalAlpha = .07 * (1 - i / 18); R(g, b.x + 8, b.y + b.h + 4 + i * 2, b.w - 16, 2, '#ff6a2a'); }
        g.restore();
        glowDraw(g, signOn, x, y, 1); g.drawImage(signOn, x, y);
      }
      if (pOn && !buzz) { glowDraw(g, signP, x, y, 1); g.drawImage(signP, x, y); }
    }
    // RUGS on the blue panel, slanted to its frame: each column of the letters dropped by the panel's slope
    const rugsFlat = neon('RUGS', '#7ad8ff', '#e0f8ff');
    const rugs = (() => {
      const s = ART.rugs.slope, rise = Math.ceil(-s * rugsFlat.width), c = cv(rugsFlat.width, rugsFlat.height + rise + 1), x = c.getContext('2d');
      for (let i = 0; i < rugsFlat.width; i++) x.drawImage(rugsFlat, i, 0, 1, rugsFlat.height, i, rise + Math.round(s * i), 1, rugsFlat.height);
      c.rise = rise; return c;
    })();
    function drawRugs(g, tt) {
      const on = (Math.floor(tt * 7) % 43) > 2, x = ART.rugs.x - 1, y = ART.rugs.y - 1 - rugs.rise;
      if (!on) return;
      glowDraw(g, rugs, x, y, .8); g.drawImage(rugs, x, y);
    }
    // the carpet band on the tower: a woven rug lit from inside, its zig-zags creeping along as if it's still being
    // woven, a fringe at each end
    function drawCarpet(g, tt) {
      const c = ART.carpet, sh = still.matches ? 0 : tt * 5;
      R(g, c.x, c.y, c.w, c.h, '#4a0c10');
      R(g, c.x, c.y + 1, c.w, 1, '#c87818'); R(g, c.x, c.y + c.h - 2, c.w, 1, '#c87818');
      for (let x = 0; x < c.w; x++) {
        const p = ((x + sh) % 16 + 16) % 16, z = Math.abs(p - 8) | 0;
        const yg = c.y + 4 + Math.round(z * .62), yo = yg + 5;
        R(g, c.x + x, yg, 1, 2, '#ffd060'); R(g, c.x + x, yg + 2, 1, 1, '#8a3a14');
        R(g, c.x + x, yo, 1, 2, '#ff7a2a');
        if (p === 0 || p === 8) R(g, c.x + x, p ? yg - 2 : yo + 3, 1, 1, '#fff6e2');
      }
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .12 + .03 * Math.sin(tt * 2); R(g, c.x - 2, c.y - 2, c.w + 4, c.h + 4, '#ff5a1a'); g.restore();
      for (const [x0, dir] of [[c.x - 5, -1], [c.x + c.w + 4, 1]]) for (let y = c.y + 2; y < c.y + c.h - 1; y += 2) {
        const len = 3 + ((y * 7) % 2), sw = Math.round(Math.sin(tt * 2.2 + y) * .6);
        for (let k = 0; k < len; k++) R(g, x0 + dir * k, y + (k > 1 ? sw : 0), 1, 1, k === len - 1 ? '#a89070' : '#f2e6c4');
      }
    }
    function drawSmoke(g, tt) {
      g.save();
      for (let i = 0; i < 9; i++) { const k = mod1(tt * .12 + i / 9), x = 198 + (i * 37 % 90) + Math.sin(tt * .8 + i) * 4 + k * 14; g.globalAlpha = .18 * (1 - k) * Math.min(1, k * 6); A.disc(g, x, ART.roof - k * 70, 3 + Math.round(k * 9), '#6a5a78'); }
      g.restore();
    }
    function drawSouls(g, tt) {
      const { x: ex, y: ey } = ART.eye, list = ART.souls;
      g.save();
      list.forEach(([x, y], i) => {
        const k = mod1(tt * .1 + i / list.length);
        g.globalAlpha = .8 * Math.min(1, (1 - k) * 4);
        g.drawImage(A.GHOST, Math.round(x + (ex - 8 - x) * k + Math.sin(tt * 2 + i) * 3), Math.round(y + (ey - 10 - y) * k));
      });
      g.restore();
    }

    // ---- p(Loom)'s eye: one big eye, orange idle, red when it means it ----
    // Baby: half-lidded and drifting; Regular: it watches him; Raging: red, locked on him, trembling. After a pick it
    // glances down at the panel for a moment.
    // Impossibull: red and wide open, not a blink, and still
    const mood = () => ({ baby: 'bored', raging: 'red', impossibull: 'wide' })[MODES[mode].id] || 'watch';
    // a pick lights the tower up for the eye (owner, Oct 16: all three): the windows black out and light back up floor by
    // floor, bottom to top, in the mode's colour; then the pavilion blazes and throws rays; and the eye swells
    const tint = cv(200, 280), tg = tint.getContext('2d');
    let mask = null;   // the painting's bright pixels (the lit windows) as an alpha mask, made once
    function bright(x0, y0, w, h) {
      if (!mask) {
        mask = cv(AW, AH); const mg = mask.getContext('2d'); mg.drawImage(art, 0, 0);
        const d = mg.getImageData(0, 0, AW, AH), px = d.data;
        for (let i = 0; i < px.length; i += 4) { const l = (px[i] * .3 + px[i + 1] * .55 + px[i + 2] * .15) / 255, a = clamp((l - .42) / .3, 0, 1); px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = Math.round(a * 255); }
        mg.putImageData(d, 0, 0);
      }
      tg.globalCompositeOperation = 'source-over'; tg.clearRect(0, 0, 200, 280); tg.drawImage(mask, x0, y0, w, h, 0, 0, w, h);
    }
    function dark(g, x0, y0, w, h, a) {   // the windows in this box go dark
      if (a <= 0 || h <= 0) return;
      bright(x0, y0, w, h); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = '#0a0608'; tg.fillRect(0, 0, w, h);
      g.save(); g.globalAlpha = Math.min(1, a); g.drawImage(tint, 0, 0, w, h, x0, y0, w, h); g.drawImage(tint, 0, 0, w, h, x0, y0, w, h); g.restore();
    }
    function lit(g, x0, y0, w, h, a, col) {   // the painting's own pixels in this box, tinted and added: windows light, dark stays dark
      if (a <= 0 || h <= 0) return;
      bright(x0, y0, w, h);
      tg.globalCompositeOperation = 'source-in'; tg.fillStyle = col; tg.fillRect(0, 0, w, h);
      g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, a); g.drawImage(tint, 0, 0, w, h, x0, y0, w, h); if (a > 1) { g.globalAlpha = a - 1; g.drawImage(tint, 0, 0, w, h, x0, y0, w, h); } g.restore();
    }
    // part 'tower' goes right on the painting, under everything that moves (the souls, smoke, carpet, signs); part
    // 'blaze' goes over them, just under the eye
    function eyeFx(g, tt, part) {
      const pk = tt - changedAt;
      if (!art || still.matches || pk < 0 || pk > 2) return;
      const col = FIRE[MODES[mode].id].glow, { x, y } = ART.eye;
      if (part === 'tower') {
        // the windows black out, then light back up floor by floor, bottom to top, into the eye
        const k = (pk - .12) / .6, by = Math.round(432 - (432 - 176) * clamp(k, 0, 1));
        if (k < 1) dark(g, 150, 176, 180, by - 176, .92);
        if (k > 0 && k < 1.25) lit(g, 150, by, 180, Math.min(26, 432 - by), 1.7 * (k < 1 ? 1 : (1.25 - k) * 4), col);
      }
      if (part === 'blaze') {   // the pavilion blazes and throws rays as the light reaches it
        const k = pk - .55, fl = k < 0 ? 0 : Math.max(0, 1 - k / 1.2) * Math.min(1, k / .08);
        if (fl > 0) {
          lit(g, 196, 168, 88, 64, 1.8 * fl, col);
          g.save(); g.globalCompositeOperation = 'lighter';
          for (const [rr, a] of [[46, .08], [30, .14], [18, .22]]) { g.globalAlpha = a * fl; A.disc(g, x, y, Math.round(rr * (.7 + .3 * fl)), col); }
          g.globalAlpha = .55 * fl;
          for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + tt * .6, L = 18 + 26 * fl; for (let q = 10; q < L; q += 1.5) R(g, x + Math.cos(a) * q, y + Math.sin(a) * q * .8, 1, 1, i % 2 ? col : '#fff6e2'); }
          g.restore();
        }
      }
    }
    function drawEye(g, tt, feet) {
      let { x, y, r } = ART.eye;
      { const pk0 = tt - changedAt, f0 = still.matches ? 0 : Math.max(0, 1 - pk0 / 1.4);   // it swells on a pick
        if (f0 > 0 && pk0 >= 0) r = Math.round(r + 5 * Math.min(1, pk0 / .2) * f0); }
      const md = mood(), wide = md === 'wide', red = md === 'red' || wide, blink = !wide && (tt % 4.1) > 3.95;
      // a pick: it glances down at the panel, flares, then reacts to the mode (Baby: rolls its eye; Regular: narrows
      // on him; Raging: flares red and shakes; Impossibull: goes wide, its pupil shrinks to a dot, and it shakes)
      const pk = tt - changedAt, flare = still.matches ? 0 : Math.max(0, 1 - pk / 1.1), react = pk < 1.6;
      if (red && !wide && !still.matches) x += Math.round(Math.sin(tt * 31) * (.6 + 1.6 * flare));
      if (wide && react && !still.matches) { x += Math.round(Math.sin(tt * 47) * 1.4 * (1 - pk / 1.6)); y += Math.round(Math.cos(tt * 39) * .8 * (1 - pk / 1.6)); }
      let look;
      if (pk < .35) look = [0, 1];
      else if (react && md === 'bored') { const a = (pk - .35) / 1.25 * Math.PI * 2 + Math.PI / 2; look = [Math.cos(a), Math.sin(a) * .8 - .2]; }
      else if (md === 'bored') look = [Math.sin(tt * .6) * .9, .3 + .3 * Math.sin(tt * .37)];
      else { const dx = 0, dy = feet - 40 - y, d = Math.hypot(dx, dy) || 1; look = [dx / d + (md === 'watch' ? .25 * Math.sin(tt * .5) : 0), dy / d]; }
      g.save(); g.globalCompositeOperation = 'lighter';
      const pulse = (1 + .15 * Math.sin(tt * (red ? 7 : 2.5))) * (1 + 2.2 * flare);
      for (const [rr, a] of [[r * 3.2, .06], [r * 2.1, .1], [r * 1.4, .16]]) { g.globalAlpha = a * pulse; A.disc(g, x, y, Math.round(rr), red ? '#ff2a14' : '#ff8a2a'); }
      g.restore();
      A.disc(g, x, y, r + 1, '#1a0806'); A.disc(g, x, y, r, red ? '#e8261a' : '#ff7a2a');
      const ir = Math.max(2, Math.round(r * .6)), pr = wide && react && pk > .35 ? 1 : red && flare > .4 ? Math.round(r * .45) : Math.max(1, Math.round(r * .32));
      const lx = Math.round(clamp(look[0], -1, 1) * (r - ir)), ly = Math.round(clamp(look[1], -1, 1) * (r - ir) * .7);
      A.disc(g, x + lx, y + ly, ir, red ? '#ffb0a0' : '#ffd060'); A.disc(g, x + lx, y + ly, pr, '#140806');
      R(g, x + lx - Math.ceil(pr / 2), y + ly - pr, 1, 1, '#fff6e2');
      const lid = blink ? 1 : md === 'bored' ? (react && pk > .35 ? .3 : .5 + .08 * Math.sin(tt * .9)) : wide ? 0 : red ? .18 * (1 - flare) : md === 'watch' && react && pk > .35 ? .32 * Math.sin(Math.min(1, (pk - .35) / 1.25) * Math.PI) + .08 : .08;
      g.save(); g.beginPath(); g.arc(x + .5, y + .5, r + 1.5, 0, 7); g.clip();
      const h = Math.round((2 * r + 2) * lid);
      R(g, x - r - 2, y - r - 1, 2 * r + 5, h, '#2a0e08');
      if (!blink) R(g, x - r - 2, y - r - 1 + h, 2 * r + 5, 1, red ? '#ff6e4a' : '#9a3a14');
      g.restore();
    }

    // ---- the logo, and the subtitle under it on a dark band ----
    const LOGO = A.logo(), LH = LOGO.base + 18;
    function drawLogo(g, y, tt, alpha) {
      const x = Math.round(240 - LOGO.width / 2);
      g.save(); g.globalAlpha = alpha;
      g.drawImage(LOGO, x, y);
      const gl = LOGO.glint;
      if (gl) { const gx = x + gl.x, gy = y + gl.y; R(g, gx + 1, gy + 1, 1, 1, '#ffffff'); if ((tt % 3) < .25) { R(g, gx, gy + 2, 3, 1, '#ffffff'); R(g, gx + 1, gy + 3, 1, 1, '#ffffff'); g.globalAlpha = alpha * .5; R(g, gx - 2, gy + 2, 7, 1, '#ffffff'); R(g, gx + 1, gy - 1, 1, 7, '#ffffff'); g.globalAlpha = alpha; } }
      const s = 'SALVATION FOR THE UNRUGGED', sy = y + LOGO.base + 2, w = tw(s, 2);
      g.globalAlpha = alpha * .6; R(g, 240 - w / 2 - 5, sy - 3, w + 10, 16, '#0a080d'); g.globalAlpha = alpha;
      A.otxt(g, s, 240, sy, '#fff6e2', 2, 'center', '#0a080d');
      g.restore();
    }

    // ---- the faces: they look around and blink; the one you pick reacts ----
    const FACEC = {}, faceSt = {};
    for (const id in FACES) {
      const f = FACES[id], rows = f.half.map(h => h + h.split('').reverse().join('')), w = rows[0].length + 2, h = rows.length + 2;
      const c = cv(w, h), x = c.getContext('2d');
      x.fillStyle = '#0a080d';
      rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) x.fillRect(i + 1 + dx, y + 1 + dy, 1, 1); });
      rows.forEach((r, y) => { for (let i = 0; i < r.length; i++) if (r[i] !== '.') { x.fillStyle = f.pal[r[i]] || '#1a1418'; x.fillRect(i + 1, y + 1, 1, 1); } });
      f.rows = rows; f.w = w; f.h = h; FACEC[id] = c;
    }
    MODES.forEach((m, i) => faceSt[m.id] = { gaze: 0, next: 1 + i * .4, blinkAt: 2 + i * 1.3, react: -9 });
    function drawFace(g, id, cx, cy, sc, dim, tt) {
      const f = FACES[id], s = faceSt[id];
      if (tt > s.next) { s.gaze = [-1, 0, 1, 0][Math.floor(hash2(Math.floor(tt * 10), id.length) * 4)]; s.next = tt + .8 + hash2(id.length, Math.floor(tt)) * 1.4; }
      if (tt > s.blinkAt + .14) s.blinkAt = tt + 2.2 + hash2(Math.floor(tt), 7) * 2.5;
      const ww = f.w * sc, hh = f.h * sc, x0 = Math.round(cx - ww / 2), y0 = Math.round(cy - hh / 2);
      const react = tt - s.react < 1, blink = tt > s.blinkAt && tt < s.blinkAt + .14, W = f.rows[0].length, mir = (x, w) => W - x - w;
      const P = (x, y, w, h, col) => R(g, x0 + (x + 1) * sc, y0 + (y + 1) * sc, w * sc, h * sc, col);
      g.save(); if (dim) g.globalAlpha = .5;
      g.drawImage(FACEC[id], x0, y0, ww, hh);
      const gz = react ? 0 : s.gaze;
      if (id === 'regular') {
        for (const ex of [6, mir(6, 3)]) { if (blink) { P(ex, 7, 3, 2, f.pal.B); P(ex, 8, 3, 1, '#1a1418'); } else P(ex + 1 + gz, 7, 1, 2, '#1a1418'); }
        if (react) { P(8, 15, 6, 1, '#fff6e2'); P(7, 15, 1, 1, '#1a1418'); P(14, 15, 1, 1, '#1a1418'); }
      } else if (id === 'baby') {
        for (const ex of [4, mir(4, 4)]) {
          if (blink || react) { P(ex, 5, 4, 3, f.pal.B); P(ex, 6, 1, 1, '#1a1418'); P(ex + 1, 5, 2, 1, '#1a1418'); P(ex + 3, 6, 1, 1, '#1a1418'); }
          else { P(ex + 1 + gz, 6, 2, 2, '#1a1418'); P(ex + 1 + gz, 6, 1, 1, '#ffffff'); }
        }
        P(8, 11, 4, 3, '#ff8ab4'); P(9, 12, 2, 1, '#e03a78'); P(7, 12, 1, 1, '#ff8ab4'); P(12, 12, 1, 1, '#ff8ab4');   // the pacifier
        if (react && !dim) for (const [hx, d] of [[2, 0], [17, .25]]) {   // picked: two little hearts float up
          const k = (tt - s.react - d) / .75; if (k < 0 || k > 1) continue;
          g.globalAlpha = 1 - k; const hy = 3 - Math.round(k * 7);
          P(hx, hy, 1, 1, '#ff5a8a'); P(hx + 2, hy, 1, 1, '#ff5a8a'); P(hx, hy + 1, 3, 1, '#ff5a8a'); P(hx + 1, hy + 2, 1, 1, '#ff5a8a');
          g.globalAlpha = dim ? .5 : 1;
        }
      } else if (id === 'impossibull') {
        P(5, 5, 1, 1, '#8a4a50'); P(6, 6, 1, 1, '#8a4a50'); P(7, 9, 1, 1, '#8a4a50'); P(8, 10, 1, 1, '#8a4a50');   // a scar through his left eye
        for (const ex of [6, mir(6, 3)]) {
          if (blink) { P(ex, 7, 3, 2, f.pal.B); P(ex, 8, 3, 1, '#000000'); continue; }
          if (!dim) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = react ? .6 : .35; A.disc(g, x0 + (ex + 2.5) * sc, y0 + 9 * sc, Math.max(1, Math.round(sc * (react ? 2 : 1.2))), '#ffb02a'); g.restore(); }
          P(ex + 1, 8, 1, 1, '#ffffff');
        }
        if (react) { P(8, 16, 6, 1, '#05030a'); P(8, 15, 1, 1, '#05030a'); P(13, 15, 1, 1, '#05030a'); }
        if (!dim) for (const [nx, d] of [[6, -1], [mir(6, 2) + 1, 1]]) for (let i = 0, n = react ? 7 : 3; i < n; i++) {   // fire from the nostrils
          const k = mod1(tt * (react ? 4 : 2.4) + i / n + (d > 0 ? .5 : 0)), L = react ? 7 : 3;
          g.globalAlpha = 1 - k; P(nx + d * Math.round(k * L), 15 + Math.round(k * (react ? 3 : 2)), react && k < .5 ? 2 : 1, 1, k < .4 ? '#fff0a0' : k < .7 ? '#ffb02a' : '#e8261a');
        }
      } else {
        for (const [ex, rx] of [[6, 7], [mir(6, 3), mir(7, 1)]]) { if (blink) { P(ex, 7, 3, 2, f.pal.B); P(ex, 8, 3, 1, '#140806'); } else P(rx + gz, 8, 1, 1, '#ff2a14'); }
        if (react) { P(7, 15, 8, 2, '#3a0806'); P(7, 15, 8, 1, '#fff6e2'); }
        if (!dim) { const k0 = react ? 1.8 : 1; for (let i = 0; i < 2; i++) { const k = mod1(tt * 1.6 * k0 + i * .5); g.globalAlpha = .6 * (1 - k); A.disc(g, cx + (i ? 4 : -4) * sc + (i ? 1 : -1) * k * 5 * sc, y0 + 15 * sc + k * 2 * sc, Math.max(1, Math.round(sc * (1 + k * 1.6 * k0))), '#c8c0d8'); } }   // it snorts
      }
      g.restore();
    }

    // ---- the panel: a RugCo elevator panel ----
    const P = { bg: '#1b1d24', ink: '#e8e4d8', dim: '#8a8a9c', faint: '#3a3c48', gold: '#ffd44a', val: '#ffb060', btn: '#ffd44a', btnEdge: '#b88a1a', btnInk: '#1b1d24', ghost: '#22252e', line: '#4a4c5a', led: '#2a0806', ledInk: '#ff8a3a', ledDim: '#5a1a0c' };
    const panelC = cv(GRID, PANEL_H), pgx = panelC.getContext('2d'), bandC = cv(AW, BAND_H), bgx = bandC.getContext('2d');
    for (const g of [pgx, bgx, sg, cg]) g.imageSmoothingEnabled = false;
    let gz = [];   // this frame's zones, in the grid being drawn
    const zone = (x, y, w, h, id) => gz.push([x, y, w, h, id]);
    const down = id => pressed === id && t() - pressedAt < .15;
    const typed = (s, since, cps, tt) => s.slice(0, Math.max(0, Math.floor((tt - since) * cps)));
    function steel(g, w, h) {
      R(g, 0, 0, w, h, P.bg);
      for (let x = 0; x < w; x += 3) { const k = hash2(x, 5); if (k < .4) R(g, x, 2, 1, h, k < .15 ? '#22252e' : '#1e2028'); }
      R(g, 0, 0, w, 2, '#c9a24a'); R(g, 0, 2, w, 1, '#6a5426');
    }
    function led(g, x, y, w, h, tt) {
      R(g, x - 1, y - 1, w + 2, h + 2, '#0a0b0e'); R(g, x, y, w, h, P.led);
      const m = MODES[mode], dn = tt - deniedAt, lk = dn < 3.2 ? MODES.find((mm, i) => locked(i)) : null;
      const rows = lk ? [[lk.name, P.ledInk, 7], [dn < 1.4 ? typed(lk.line, deniedAt, 50, tt) : typed('BEAT RAGING BULL.', deniedAt + 1.4, 50, tt), '#ffb070', 24]]
        : [[m.name, P.ledInk, 7], [typed(m.line, changedAt, 50, tt), '#ffb070', 24]];
      for (const [s, c, yy] of rows) { g.save(); g.globalAlpha = .35; T(g, s, x + 7, y + yy + 1, P.ledDim, 2); g.restore(); T(g, s, x + 6, y + yy, c, 2); }
      for (let yy = y + 1; yy < y + h; yy += 2) { g.save(); g.globalAlpha = .22; R(g, x, yy, w, 1, '#000000'); g.restore(); }
    }
    function bigButton(g, x, y, w, h, label, main, id, sc) {
      if (main) { R(g, x, y, w, h, P.btn); R(g, x, y + h - 2, w, 2, P.btnEdge); }
      else { R(g, x, y, w, h, P.ghost); R(g, x, y, w, 1, P.line); R(g, x, y + h - 1, w, 1, P.line); R(g, x, y, 1, h, P.line); R(g, x + w - 1, y, 1, h, P.line); }
      if (down(id)) { g.save(); g.globalAlpha = .25; R(g, x, y, w, h, '#ffffff'); g.restore(); }
      T(g, label, x + w / 2, y + Math.round((h - 5 * sc) / 2) + (down(id) ? 1 : 0), main ? P.btnInk : P.ink, sc, 'center');
      zone(x, y, w, h, id);
    }
    function speaker(g, cx, cy, on, col) {
      const Q = (x, y, w, h) => R(g, cx + x * 2, cy + y * 2, w * 2, h * 2, col);
      Q(-6, -2, 2, 4); Q(-4, -3, 1, 6); Q(-3, -4, 1, 8); Q(-2, -5, 1, 10);
      if (on) { Q(0, -2, 1, 4); Q(2, -4, 1, 8); Q(1, -3, 1, 1); Q(1, 2, 1, 1); } else for (let i = 0; i < 5; i++) { Q(i, -2 + i, 1, 1); Q(4 - i, -2 + i, 1, 1); }
    }
    // four corners: pointing out to go full screen, in to leave it
    function fullIcon(g, cx, cy, on, col) {
      const Q = (x, y, w, h) => R(g, cx + x * 2, cy + y * 2, w * 2, h * 2, col);
      if (!on) { Q(-5, -5, 3, 1); Q(-5, -5, 1, 3); Q(2, -5, 3, 1); Q(4, -5, 1, 3); Q(-5, 4, 3, 1); Q(-5, 2, 1, 3); Q(2, 4, 3, 1); Q(4, 2, 1, 3); }
      else { Q(-5, -2, 4, 1); Q(-2, -5, 1, 4); Q(1, -2, 4, 1); Q(1, -5, 1, 4); Q(-5, 1, 4, 1); Q(-2, 1, 1, 4); Q(1, 1, 4, 1); Q(1, 1, 1, 4); }
    }
    const canFull = () => !!(act.canFull && act.canFull());
    function steelKey(g, x, y, w, h, id) {
      R(g, x - 1, y - 1, w + 2, h + 2, '#0a0b0e'); R(g, x, y, w, h, down(id) ? '#3a3c48' : '#262830'); R(g, x, y, w, 1, '#5a5c6a'); R(g, x, y + h - 1, w, 1, '#101116');
      zone(x, y, w, h, id);
    }
    function trophy(g, x, y, col) { R(g, x, y, 9, 1, col); R(g, x + 1, y + 1, 7, 4, col); R(g, x, y + 1, 1, 2, col); R(g, x + 8, y + 1, 1, 2, col); R(g, x + 3, y + 5, 3, 2, col); R(g, x + 2, y + 7, 5, 1, col); }
    // zh: the tap zone's height in grid pixels, so the line is a 44 px target on a phone (40 upright, 34 in the band)
    function boardLine(g, x, y, max, zh) {
      const list = act.board ? act.board(MODES[mode].id) : null;
      if (!list) return;   // no board: no line
      const top = list[0], s = top ? 'TOP ' + top[0] + ' ' + top[1] : 'NO RUNS YET';
      trophy(g, x, y + 1, P.gold); T(g, s, x + 13, y, P.dim, 2); T(g, '>', x + 13 + tw(s, 2) + 6, y, P.dim, 2);
      if (top && top[2] && UnrugHats.of(MODES[mode].id)) UnrugHats.board(g, UnrugHats.of(MODES[mode].id), x + 13 + tw('TOP ', 2) + 2 + tw(top[0], 2) / 2, y, 1);
      zone(x, y - 14, Math.max(max || 0, 13 + tw(s, 2) + 14), zh, 'board');
    }
    function padlock(g, cx, cy, s, col) {
      R(g, cx - 4 * s, cy - 8 * s, 8 * s, 2 * s, col); R(g, cx - 4 * s, cy - 7 * s, 2 * s, 6 * s, col); R(g, cx + 2 * s, cy - 7 * s, 2 * s, 6 * s, col);
      R(g, cx - 6 * s, cy - 1 * s, 12 * s, 9 * s, col); R(g, cx - 1 * s, cy + 2 * s, 2 * s, 3 * s, '#101116');
    }
    // the picked button's ring is on fire, hotter up the modes (Baby's a candle, Impossibull's crimson and white-hot), and it flares on a pick
    const FIRE = {
      baby: { c: ['#fff6c8', '#ffe08a', '#ffb02a'], h: [2, 5], v: 9, glow: '#ffb02a' },
      regular: { c: ['#fff0a0', '#ffb02a', '#ff5a14'], h: [3, 9], v: 11, glow: '#ff9a2a' },
      raging: { c: ['#ffd0a0', '#ff5a14', '#c81a0a'], h: [4, 13], v: 14, glow: '#ff4a1a' },
      impossibull: { c: ['#ffffff', '#ff2a1a', '#7a0606'], h: [5, 15], v: 16, glow: '#ff1a10' }
    };
    function fireRing(g, cx, cy, r, id, tt, boost) {
      const F = FIRE[id], k = r / 30, n = Math.round(Math.PI * 2 * r / 3.2), px = r > 24 ? 2 : 1;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let j = 0; j < n; j++) {
        const a = j / n * Math.PI * 2, ux = Math.cos(a), uy = Math.sin(a), up = Math.max(0, -uy);
        let dx = ux, dy = uy < 0 ? uy - 1.2 * up : uy; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
        const fl = .5 + .5 * Math.sin(tt * F.v + j * 1.7 + Math.sin(tt * 3.1 + j) * 2);
        const h = Math.round(k * (F.h[0] + (F.h[1] - F.h[0]) * fl) * (.3 + .7 * up) * (1 + 1.6 * boost));
        const sway = Math.sin(tt * 5 + j * .9) * .8;
        for (let q = 0; q < h; q++) {
          const f = q / h; g.globalAlpha = (1 - f) * .9;
          R(g, cx + ux * (r + 1) + dx * q - px / 2 + sway * f * 2, cy + uy * (r + 1) + dy * q - px / 2, px, px, F.c[f < .3 ? 0 : f < .65 ? 1 : 2]);
        }
      }
      // embers off the top, more on a pick
      for (let e = 0, ne = Math.round((2 + 6 * boost) * k + (id === 'raging' || id === 'impossibull' ? 2 : 0)); e < ne; e++) {
        const life = mod1(tt * .9 + hash2(e, id.length)), ex = cx + (hash2(e, 3) - .5) * r * 1.4 + Math.sin(tt * 3 + e) * 2;
        g.globalAlpha = (1 - life) * .9; R(g, ex, cy - r - 2 - life * r * .9, px, px, F.c[life < .5 ? 1 : 2]);
      }
      g.restore();
    }
    function callButton(g, cx, cy, r, i, tt, labelY) {
      const on = i === mode, m = MODES[i];
      if (locked(i)) {
        const sh = tt - deniedAt < .35 ? Math.round(Math.sin(tt * 70) * 2) : 0;
        A.disc(g, cx + sh, cy, r + 2, '#0a0b0e'); A.disc(g, cx + sh, cy, r + 1, '#3a3c48'); A.disc(g, cx + sh, cy, r - 1, '#16171c');
        padlock(g, cx + sh, cy + 1, Math.max(1, Math.round(r / 15)), '#4a4c5a');
        if (labelY != null) T(g, m.short, cx, labelY, P.faint, 2, 'center');
        zone(cx - r - 6, cy - r - 6, r * 2 + 12, labelY != null ? labelY - cy + r + 18 : r * 2 + 12, 'mode' + i);
        return;
      }
      // a pick: the button jumps, and on Raging and Impossibull it shakes
      const pk = tt - faceSt[m.id].react, boost = on && !still.matches ? Math.max(0, 1 - pk / .8) : 0;
      if (boost) { cy -= Math.round(Math.sin(Math.min(1, pk / .3) * Math.PI) * 3); if (m.id === 'raging' || m.id === 'impossibull') cx += Math.round(Math.sin(tt * 60) * 1.5 * boost); }
      if (on) { g.save(); g.globalCompositeOperation = 'lighter'; for (const [rr, a] of [[r + 12, .06], [r + 7, .09], [r + 3, .14]]) { g.globalAlpha = a * (1 + .2 * Math.sin(tt * 4)) * (1 + 1.5 * boost); A.disc(g, cx, cy, rr, FIRE[m.id].glow); } g.restore(); }
      A.disc(g, cx, cy, r + 2, '#0a0b0e'); A.disc(g, cx, cy, r + 1, on ? '#ffd44a' : '#5a5c6a'); A.disc(g, cx, cy, r - 1, on ? '#3a2a10' : '#262830');
      if (on) { g.save(); g.globalAlpha = .3; A.disc(g, cx, cy, r - 3, '#ffb02a'); g.restore(); if (!still.matches) fireRing(g, cx, cy, r, m.id, tt, boost); }
      R(g, cx - Math.round(r * .6), cy - Math.round(r * .75), 3, 1, on ? '#fff6c8' : '#6a6c7a');
      drawFace(g, m.id, cx, cy + 1, Math.max(1, Math.floor((r * 2 - 6) / 22)), !on, tt);
      if (labelY != null) T(g, m.short, cx, labelY, on ? P.gold : P.dim, 2, 'center');
      zone(cx - r - 6, cy - r - 6, r * 2 + 12, labelY != null ? labelY - cy + r + 18 : r * 2 + 12, 'mode' + i);
    }
    function boardView(g, w, h, band) {
      const m = MODES[mode], list = (act.board && act.board(m.id)) || [];
      const rows = (x, y, ww, n, cols) => {
        const per = Math.ceil(n / cols);
        for (let i = 0; i < n; i++) {
          const c = Math.floor(i / per), r = i % per, cx = x + c * (ww / cols), cy = y + r * 16, e = list[i];
          T(g, (i + 1) + '.', cx + 16, cy, P.dim, 2, 'right');
          T(g, e ? e[0] : '---', cx + 22, cy, e ? (i === 0 ? P.gold : P.ink) : P.faint, 2);
          if (e && e[2] && UnrugHats.of(m.id)) UnrugHats.board(g, UnrugHats.of(m.id), cx + 22 + tw(e[0], 2) / 2, cy, 1);   // the hat it won, over its name
          if (e) T(g, String(e[1]), cx + ww / cols - 14, cy, P.val, 2, 'right');
        }
      };
      if (band) { T(g, 'TOP RUNS: ' + m.name, 12, 8, P.gold, 2); rows(12, 24, w - 160, 8, 2); bigButton(g, w - 132, 10, 120, 40, 'BACK', false, 'back', 2); }
      else { T(g, 'TOP RUNS: ' + m.name, 14, 14, P.gold, 2); rows(14, 36, w - 28, Math.min(10, Math.floor((h - 124) / 16)), 1); bigButton(g, 10, h - 50 - FOOT, w - 20, 50, 'BACK', false, 'back', 2); }
    }
    // upright: under the painting, 320 wide, only as tall as what it shows (owner, Oct 16: the room goes to the
    // painting): the readout, the buttons and Start; the board line adds a row when the boards exist (item 29)
    const panelH = () => act.board && act.board(MODES[mode].id) ? 290 : 246;
    const FOOT = 26;   // under Start: clear of a phone's rounded corners in full screen (owner, Oct 16)
    function drawPanel(g, tt) {
      const w = GRID, h = panelH();
      steel(g, w, h); gz = [];
      if (board) { boardView(g, w, h, false); return; }
      const keys = canFull() ? 3 : 2;
      led(g, 14, 14, w - 28 - 48 * keys + 6, 42, tt);
      if (keys === 3) { steelKey(g, w - 14 - 42 - 48, 14, 42, 42, 'full'); fullIcon(g, w - 14 - 42 - 48 + 21, 14 + 21, act.fullOn(), act.fullOn() ? P.gold : P.dim); }
      const sx = w - 14 - 42 - 48 * (keys - 1);
      steelKey(g, sx, 14, 42, 42, 'sound'); speaker(g, sx + 21, 14 + 21, act.soundOn(), act.soundOn() ? P.gold : P.dim);
      steelKey(g, w - 14 - 42, 14, 42, 42, 'exit'); T(g, 'EXIT', w - 14 - 21, 14 + 16, P.dim, 2, 'center');
      MODES.forEach((m, i) => callButton(g, 46 + i * 76, 104, 30, i, tt, 146));
      boardLine(g, 14, 178, w - 28, 40);
      bigButton(g, 10, h - 50 - FOOT, w - 20, 50, 'START', true, 'start', 3);
    }
    // sideways and on a desktop: a band over the picture's bottom, 480 wide
    function drawBand(g, tt) {
      const w = AW, h = BAND_H;
      steel(g, w, h); gz = [];
      if (board) { boardView(g, w, h, true); return; }
      led(g, 12, 8, 150, 40, tt);
      MODES.forEach((m, i) => callButton(g, 190 + i * 44, 28, 19, i, tt));
      boardLine(g, 12, 62, 0, 34);
      bigButton(g, w - 128, 10, 116, 40, 'START', true, 'start', 3);
    }

    // ---- composing the painting with what lives on it ----
    function compose(tt, feet, logoY, logoA) {
      cg.clearRect(0, 0, AW, AH);
      if (art) cg.drawImage(art, 0, 0); else R(cg, 0, 0, AW, AH, '#0b0920');
      eyeFx(cg, tt, 'tower');
      drawCarpet(cg, tt); drawSign(cg, tt); drawRugs(cg, tt); drawSmoke(cg, tt); drawSouls(cg, tt);
      eyeFx(cg, tt, 'blaze'); drawEye(cg, tt, feet);
      drawBull(cg, feet);
      if (logoA > 0) drawLogo(cg, logoY, tt, logoA);
    }

    // ---- a frame: lay out, draw, and put the buttons over what was drawn ----
    let lay = null;
    function frame() {
      if (root.hidden) return;
      const W = arena.clientWidth, H = arena.clientHeight, dpr = Math.min(3, window.devicePixelRatio || 1);
      if (!W || !H) return;
      if (screen.width !== Math.round(W * dpr) || screen.height !== Math.round(H * dpr)) { screen.width = Math.round(W * dpr); screen.height = Math.round(H * dpr); sg.imageSmoothingEnabled = false; }
      const upright = W < H, key = upright + ',' + W + ',' + H;
      if (key !== shapeKey) { shapeKey = key; pan0 = now(); }
      const tt = t(), f = dpr;
      const blit = (src, sx, sy, sw, sh, dx, dy, dw, dh) => sg.drawImage(src, sx, sy, sw, sh, Math.round(dx * f), Math.round(dy * f), Math.round(dw * f), Math.round(dh * f));
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.fillStyle = '#08070c'; sg.fillRect(0, 0, screen.width, screen.height);
      zones = [];
      const out = { upright };
      if (upright) {
        // the panel takes what it needs, centred on a tablet; the painting gets the rest, as wide as the screen and
        // anchored to the panel, cropping sky first, shrinking (dark sides) only if its safe zone wouldn't fit
        const PH = panelH(), k2 = Math.min(W / GRID, 1.5), ph = PH * k2, sy = H - ph, sw = GRID * k2, px2 = (W - sw) / 2;
        const k = Math.min(W / AW, sy / (ART.safe[1] - ART.safe[0])), vis = Math.min(AH, sy / k), y0 = Math.max(0, Math.min(AH - vis, ART.safe[0]));
        const dw = AW * k, dx = (W - dw) / 2, top = sy - vis * k;
        const lTop = Math.round(y0 + 8 / k), logoY = lTop + Math.max(0, Math.round((ART.skyTo - lTop - LH) / 2));
        compose(tt, ART.bull, logoY, 1);
        if (top > 0) blit(comp, 0, 0, AW, 1, dx, 0, dw, top + 1);   // a tall screen: the top row of sky carries on up
        blit(comp, 0, y0, AW, vis, dx, top, dw, vis * k);
        if (dx > 0) { sg.save(); sg.setTransform(f, 0, 0, f, 0, 0); for (let i = 0; i < 12; i++) { sg.fillStyle = `rgba(8,7,12,${(1 - i / 12) * .85})`; sg.fillRect(dx + i * 2, 0, 2, sy); sg.fillRect(dx + dw - (i + 1) * 2, 0, 2, sy); } sg.restore(); }
        pgx.clearRect(0, 0, GRID, PANEL_H); drawPanel(pgx, tt);
        if (px2 > 0) { sg.fillStyle = P.bg; sg.fillRect(0, Math.round(sy * f), screen.width, screen.height); sg.fillStyle = '#c9a24a'; sg.fillRect(0, Math.round(sy * f), screen.width, Math.ceil(2 * k2 * f)); }
        blit(panelC, 0, 0, GRID, PH, px2, sy, sw, ph);
        zones = gz.map(([x, y, w, h, id]) => [px2 + x * k2, sy + y * k2, w * k2, h * k2, id]);
        out.safe = [top + (ART.safe[0] - y0) * k, top + (ART.safe[1] - y0) * k]; out.logo = [top + (logoY - y0) * k, top + (logoY + LH - y0) * k];
      } else {
        // the picture is play's 16:9 rectangle (layoutPlay places the stage); a window into the painting that pans up
        const a = arena.getBoundingClientRect(), s = stageEl.getBoundingClientRect();
        const px = s.left - a.left, py = s.top - a.top, pw = s.width, kp = pw / AW;
        const kk = still.matches ? 1 : ease((now() - pan0 - .8) / 4.2), y0 = Math.round(ART.pan[0] + (ART.pan[1] - ART.pan[0]) * kk);
        const la = still.matches ? 1 : clamp((now() - pan0 - 3.2) / .6, 0, 1);
        compose(tt, ART.sideBull, ART.panLogo, la);
        blit(comp, 0, y0, AW, WIN, px, py, pw, WIN * kp);
        bgx.clearRect(0, 0, AW, BAND_H); drawBand(bgx, tt);
        blit(bandC, 0, 0, AW, BAND_H, px, py + BAND_TOP * kp, pw, BAND_H * kp);
        zones = gz.map(([x, y, w, h, id]) => [px + x * kp, py + (BAND_TOP + y) * kp, w * kp, h * kp, id]);
        // sound, full screen and Exit, Ghost style, where Pause sits in play: the side band on a phone, the band above on a desktop
        const sideBand = W - (px + pw) >= 50;
        const ix = sideBand ? W - (W - px - pw) / 2 : Math.min(px + pw, W - 8) - 20, iy = sideBand ? 28 : Math.max(4, (py - 40) / 2) + 20;
        const fs = canFull(), fx = sideBand ? ix : ix - 50, fy = sideBand ? iy + 50 : iy;
        const ex = sideBand ? ix : (fs ? fx : ix) - 76, ey = sideBand ? (fs ? fy : iy) + 50 : iy;
        sg.save(); sg.setTransform(f, 0, 0, f, 0, 0);
        sg.fillStyle = 'rgba(9,7,11,.55)'; sg.strokeStyle = 'rgba(255,246,226,.35)'; sg.lineWidth = 2;
        sg.beginPath(); sg.arc(ix, iy, 20, 0, 7); sg.fill(); sg.beginPath(); sg.arc(ix, iy, 19, 0, 7); sg.stroke();
        sg.beginPath(); sg.roundRect ? sg.roundRect(ex - 25, ey - 14, 50, 28, 14) : sg.rect(ex - 25, ey - 14, 50, 28); sg.fill(); sg.stroke();
        speaker(sg, ix, iy, act.soundOn(), '#fff6e2');
        A.txt(sg, 'EXIT', ex, ey - 5, 'rgba(255,246,226,.9)', 2, 'center');
        if (fs) { sg.fillStyle = 'rgba(9,7,11,.55)'; sg.beginPath(); sg.arc(fx, fy, 20, 0, 7); sg.fill(); sg.beginPath(); sg.arc(fx, fy, 19, 0, 7); sg.stroke(); fullIcon(sg, fx, fy, act.fullOn(), '#fff6e2'); }
        sg.restore();
        zones.push([ix - 24, iy - 24, 48, 48, 'sound'], [ex - 27, ey - 22, 54, 44, 'exit']);
        if (fs) zones.push([fx - 24, fy - 24, 48, 48, 'full']);
        out.safe = [py, py + BAND_TOP * kp]; out.logo = [py + (ART.panLogo - ART.pan[1]) * kp, py + (ART.panLogo - ART.pan[1] + LH) * kp];
      }
      // the buttons over what was drawn
      const shown = new Set();
      for (const [x, y, w, h, id] of zones) {
        const el = BUTTONS[id]; if (!el) continue;
        shown.add(id);
        const st = el.style; st.left = x + 'px'; st.top = y + 'px'; st.width = w + 'px'; st.height = h + 'px';
      }
      for (const id in BUTTONS) BUTTONS[id].hidden = !shown.has(id);
      MODES.forEach((m, i) => { BUTTONS['mode' + i].setAttribute('aria-pressed', String(i === mode)); BUTTONS['mode' + i].setAttribute('aria-label', locked(i) ? m.name + ', locked' : m.name); });
      BUTTONS.sound.setAttribute('aria-label', act.soundOn() ? 'Sound on' : 'Sound off');
      BUTTONS.full.setAttribute('aria-label', act.fullOn && act.fullOn() ? 'Exit full screen' : 'Full screen');
      out.buttons = zones.map(([x, y, w, h, id]) => ({ id, label: BUTTONS[id].dataset.label, x, y, w, h }));
      lay = out;
    }

    function show() {
      root.hidden = false; board = false; t0 = now(); pan0 = t0; shapeKey = '';
      frame();
      say.textContent = 'Unruggabull II: Salvation for the Unrugged. ' + MODES[mode].name + '.';
    }
    function hide() { root.hidden = true; board = false; }
    // keys while the title is up; true when the key was the title's
    function key(e) {
      if (root.hidden || e.repeat) return false;
      const k = e.key;
      if (board) { if (k === 'Escape' || k === 'b' || k === 'B' || k === 'Enter' || k === ' ') { press('back'); beep('tick'); board = false; return true; } return false; }
      if (['ArrowLeft', 'ArrowUp', 'a', 'A', 'w', 'W'].includes(k)) { pick(Math.max(0, mode - 1)); return true; }
      if (['ArrowRight', 'ArrowDown', 'd', 'D', 's', 'S'].includes(k)) { pick(Math.min(MODES.length - 1, mode + 1)); return true; }
      if ((k === 'b' || k === 'B') && act.board && act.board(MODES[mode].id)) { press('board'); beep('tick'); board = true; return true; }
      if (k === 'Enter' || k === ' ') { BUTTONS.start.click(); return true; }
      return false;
    }
    // for the tests
    const labels = () => Object.keys(BUTTONS).filter(id => !BUTTONS[id].hidden).map(id => BUTTONS[id].dataset.label);
    function pressLabel(label) { const id = Object.keys(BUTTONS).find(i => BUTTONS[i].dataset.label === label && !BUTTONS[i].hidden); if (!id) throw new Error('no ' + label + ' button: ' + labels().join(', ')); BUTTONS[id].click(); }
    return { show, hide, frame, key, labels, press: pressLabel, get mode() { return MODES[mode].id; }, get open() { return !root.hidden; }, get layout() { return lay; }, get board() { return board; }, MODES, el: root };
  }
  return { make, MODES };
})();
