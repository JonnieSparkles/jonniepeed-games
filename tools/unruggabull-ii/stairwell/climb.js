// The stairwell, playable: three one-screen sections of stairs from the garage to the 13th Floor, joined by quick
// whips up with the floor numbers rolling. Section 1 (G to 1) with the blaster; section 2 (6 to 7) with the
// Rugmergency halfway up, then the katana and a first deflect; section 3 (12 to 13) with carpshits tumbling down the
// stairs, then the side door: brace, kick, the door at the camera, the band on the kick, THE 13TH FLOOR.
// Design page only. The art, sounds and music come from mock.js (window.StairArt) and the game's own files.
(function () {
  'use strict';
  const S = window.StairArt, A = UnrugArt, Snd = UnrugSound, M = UnrugStairsMusic;
  const { W, H, clamp, lerp, ease, span, drawSide, SIDE, BARE, MOVE, RAISED, BACK, SF, MF, RF, SM, CW, CH, FX } = S;
  const $ = id => document.getElementById(id);
  const cv = $('c'), out = cv.getContext('2d'); out.imageSmoothingEnabled = false;
  const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return c; };

  // ---------- tuning (picture pixels and seconds) ----------
  const TUNE = {
    run: 200, jumpH: 62, jumpT: .62, bodyH: 64, crouchH: 38, hearts: 5, inv: 1.4, knock: 160,
    fireEvery: .2, charges: 20, recharge: .5, shot: 560, deflectCharge: 3,
    slashT: .3, slashLive: .2, slashReach: 72, slashHigh: 48, slashEvery: .36,
    fly: { enter: 150, drift: 80, keep: [110, 190], bob: 4, swoopEvery: [3.4, 5], swoopT: 1.0, throwFirst: [1.4, 2.4], throwEvery: [2.6, 4], hit: [17, 15] },
    paper: 150, paperBack: 420, roll: 150, rollH: 12, cue: 'flight'
  };

  // ---------- the three sections ----------
  // The ground is a line through these points (x ascending); the stairs are its slopes. dir is the way up.
  const SECTIONS = [
    { n: 1, dir: 1, low: 'G', high: '1', path: [[0, 246], [110, 246], [250, 176], [330, 176], [450, 106], [480, 106]], lamp: 300, big: '1', bigX: 40,
      script: [['wait', .9], ['fly', 1, 34], ['clear'], ['fly', 1, 34], ['fly', -1, 84, { prompt: 'JUMP' }], ['clear'], ['fly', 1, 36, { thrower: true }], ['wait', 1.2], ['fly', 1, 40], ['clear'], ['fly', -1, 36], ['clear'], ['fly', 1, 84], ['wait', 1.4], ['fly', 1, 36, { thrower: true }], ['clear']] },
    { n: 2, dir: -1, low: '6', high: '7', path: [[0, 126], [40, 126], [150, 186], [300, 186], [400, 246], [480, 246]], lamp: 230, big: '7', bigX: 330,
      cab: { x: 150, floor: 186 },
      tape: { x: 38, floor: 126 },   // caution tape across the way up: slash it to leave (the katana's first job)
      // on the way up to the cabinet, still blaster only; the glass can't break until they're done
      pre: [['wait', .8], ['fly', -1, 36], ['wait', 1.4], ['fly', -1, 84], ['wait', 1.2], ['fly', 1, 36, { thrower: true }], ['clear'], ['prompt', 'SHOOT THE GLASS']],
      script: [['wait', .7], ['fly', -1, 36, { swoopy: true }], ['prompt', 'SLASH'], ['clear'], ['fly', -1, 36, { thrower: true, throwFirst: .9 }], ['clear'], ['fly', -1, 34], ['fly', 1, 40], ['clear']] },
    { n: 3, dir: 1, low: '12', high: '13', path: [[0, 246], [90, 246], [210, 186], [480, 186]], lamp: 260, big: '13', bigX: 120, door: true,
      script: [['wait', .6], ['roll'], ['wait', .7], ['roll'], ['wait', 1.1], ['fly', 1, 36], ['roll'], ['clear'], ['roll'], ['wait', .5], ['roll'], ['wait', .5], ['roll'], ['fly', 1, 84], ['clear']] }
  ];
  function groundAt(sec, x) {
    const p = sec.path; x = clamp(x, p[0][0], p[p.length - 1][0]);
    for (let i = 1; i < p.length; i++) if (x <= p[i][0]) { const [x0, y0] = p[i - 1], [x1, y1] = p[i]; return lerp(y0, y1, (x - x0) / (x1 - x0 || 1)); }
    return p[p.length - 1][1];
  }
  const topY = sec => Math.min(...sec.path.map(q => q[1]));
  const entryX = sec => sec.dir > 0 ? 24 : W - 24;
  const exitX = sec => sec.dir > 0 ? W - 10 : 10;

  // the section's backdrop, drawn once: block walls and the red dado, the lamp, the floor's number stencilled big,
  // the stairs (a step every 16 px with a yellow nosing) and landings, rails up the flights, the floor plates
  const BGS = {};
  function backdrop(sec) {
    if (BGS[sec.n]) return BGS[sec.n];
    const c = canvas(W, H), g = c.getContext('2d');
    S.blocks(g, 0, 0, W, 150, '#3d3b47', '#2c2a34', '#46444f');
    S.blocks(g, 0, 150, W, H, '#5a2128', '#43171d', '#64262d');
    g.fillStyle = '#b88a2a'; g.fillRect(0, 147, W, 4); g.fillStyle = '#7a5a1c'; g.fillRect(0, 151, W, 1);
    S.stencil(g, sec.big, sec.bigX, 14, 11, '#e8dcc0', .2);
    const lx = sec.lamp;
    g.fillStyle = '#22202a'; g.fillRect(lx - 7, 10, 14, 4); g.fillStyle = '#4a4a5a'; for (const dx of [-5, -1, 3]) g.fillRect(lx + dx, 14, 1, 9);
    // the ground: concrete below the line; landings as slabs, flights as steps
    const p = sec.path;
    g.fillStyle = '#25232c'; g.beginPath(); g.moveTo(0, H); for (const [x, y] of p) g.lineTo(x, y + 4); g.lineTo(W, H); g.closePath(); g.fill();
    for (let i = 1; i < p.length; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i];
      if (y0 === y1) { g.fillStyle = '#5c5966'; g.fillRect(x0, y0, x1 - x0, 6); g.fillStyle = '#c9a227'; g.fillRect(x0, y0, x1 - x0, 2); continue; }
      for (let x = x0; x < x1; x += 16) {
        const y = Math.round(Math.min(groundAt(sec, x), groundAt(sec, Math.min(x1, x + 16))));
        g.fillStyle = '#5c5966'; g.fillRect(x, y, 16, 4); g.fillStyle = '#c9a227'; g.fillRect(x, y, 16, 1); g.fillStyle = '#25232c'; g.fillRect(x, y + 4, 16, H - y);
      }
      g.fillStyle = '#8a93a6'; for (let x = x0; x < x1; x += 2) g.fillRect(x, groundAt(sec, x) - 42, 2, 2);
      for (let x = x0 + 8; x < x1; x += 56) { g.fillStyle = '#5a6070'; g.fillRect(x, groundAt(sec, x) - 42, 2, 42); }
      const topX = y1 < y0 ? x1 : x0, topYg = Math.min(y0, y1), dirX = y1 < y0 ? 1 : -1;
      g.fillStyle = '#8a93a6'; g.fillRect(Math.min(topX, topX + dirX * 14), topYg - 42, 14, 2);
      g.fillStyle = '#6a7284'; g.fillRect(topX + dirX * 14 - (dirX < 0 ? 0 : 2), topYg - 42, 3, 42);
    }
    // the floor plates on the landings' walls: the low floor and the high one
    const plate = (txt, x, y) => S.words(g, () => { A.rect(g, x / 2 - 12, y / 2, 24, 9, '#1a1418'); A.rect(g, x / 2 - 11, y / 2 + 1, 22, 7, '#d8d0b8'); A.txt(g, txt, x / 2, y / 2 + 2, '#1a1418', 1, 'center'); });
    const lowX = sec.dir > 0 ? 50 : W - 50, highX = sec.dir > 0 ? W - 40 : 136;   // clear of the way-up arrow, the tape and the HUD
    plate('FL ' + sec.low, lowX, groundAt(sec, lowX) - 110);
    if (!sec.door) plate('FL ' + sec.high, highX, sec.dir < 0 ? 30 : Math.max(36, groundAt(sec, highX) - 100));   // up by the lamp's bracket, clear of the cabinet's plate   // the 13th's is the door's own sign
    BGS[sec.n] = c; return c;
  }

  // ---------- the top landing: the end wall turning toward us, the door in it, its sign and lamp ----------
  function doorEnd(g, gl, floor, open) {
    const quad = (pts, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(...pts[0]); for (const q of pts.slice(1)) g.lineTo(...q); g.closePath(); g.fill(); };
    // the wall, its blocks running in perspective, the red dado and the gold stripe carried round the corner
    quad([[428, 0], [W, 0], [W, floor + 8], [428, floor]], '#34323d');
    for (let y = 6; y < floor; y += 12) quad([[428, y], [W, y - 4], [W, y - 3], [428, y + 1]], '#2a2832');
    quad([[428, 150], [W, 146], [W, floor + 8], [428, floor]], '#4e1c22');
    quad([[428, 147], [W, 143], [W, 147], [428, 151]], '#b88a2a');
    g.fillStyle = '#1c1a22'; g.fillRect(426, 0, 3, floor + 2);   // the corner
    // the landing runs into the wall; a light pool in front of the door
    g.fillStyle = '#5c5966'; g.fillRect(380, floor, 50, 6); g.fillStyle = '#c9a227'; g.fillRect(380, floor, 50, 2);
    const d = { x0: 438, x1: 466, t0: floor - 100, t1: floor - 108, b0: floor, b1: floor + 6 };
    // the frame, pale steel, then the opening
    quad([[d.x0 - 4, d.t0 - 5], [d.x1 + 4, d.t1 - 6], [d.x1 + 4, d.b1], [d.x0 - 4, d.b0]], '#a8a296');
    quad([[d.x0 - 1, d.t0 - 2], [d.x1 + 1, d.t1 - 3], [d.x1 + 1, d.b1], [d.x0 - 1, d.b0]], '#14121a');
    if (open > 0) {
      gl.fillStyle = '#fff1c0'; gl.beginPath(); gl.moveTo(d.x0, d.t0); gl.lineTo(d.x1, d.t1); gl.lineTo(d.x1, d.b1); gl.lineTo(d.x0, d.b0); gl.closePath(); gl.fill();
    }
    const k = 1 - clamp(open, 0, 1), lx = lerp(d.x0 + 2, d.x1, k);
    if (k > .02) {
      // the leaf: steel blue, a lit wire-glass window, a push bar, the 13 plate
      const tTop = lerp(d.t0 - 6, d.t1, k), tBot = lerp(d.b0 + 2, d.b1, k), at = (u, v) => [lerp(d.x0, lx, u), lerp(lerp(d.t0, tTop, u), lerp(d.b0, tBot, u), v)];
      quad([at(0, 0), at(1, 0), at(1, 1), at(0, 1)], '#5f6c8e');
      quad([at(.15, .1), at(.85, .1), at(.85, .38), at(.15, .38)], '#9fd8ff');
      quad([at(.15, .24), at(.85, .24), at(.85, .26), at(.15, .26)], '#4a6a8a');
      quad([at(.2, .45), at(.8, .45), at(.8, .54), at(.2, .54)], '#d8d0b8');
      quad([at(.05, .6), at(.95, .6), at(.95, .63), at(.05, .63)], '#c4ccda');
      quad([at(0, 0), at(.08, 0), at(.08, 1), at(0, 1)], '#7f8aa8');
    }
    // the sign on the back wall beside it, and a caged lamp over the door lighting it
    S.doorSign(g, 150, Math.round((floor - 132) / 2));
    const lx2 = 410, ly = floor - 128;
    g.fillStyle = '#22202a'; g.fillRect(lx2 - 6, ly, 12, 3); g.fillStyle = '#4a4a5a'; g.fillRect(lx2 - 4, ly + 3, 1, 7); g.fillRect(lx2 + 3, ly + 3, 1, 7);
    gl.fillStyle = '#fff0b8'; gl.fillRect(lx2 - 3, ly + 3, 6, 6); S.glow(gl, lx2, ly + 5, 16, '#fff4c8', .7);
    // a mat on the landing: it can say WELCOME
    g.fillStyle = '#3a2418'; g.fillRect(392, floor - 1, 34, 3); g.fillStyle = '#6e4a2c'; g.fillRect(394, floor - 1, 30, 1);
  }

  // ---------- the run ----------
  let R, P;
  const rnd = (a, b) => a + (b - a) * Math.random();
  function newRun(at = 0) {
    R = { si: at, t: 0, st: 'play', stT: 0, souls: 0, time: 0, deaths: 0, glass: Infinity, taken: Infinity, enemies: [], papers: [], bolts: [], fx: [],
      script: 0, scriptT: 0, exitOpen: false, prompt: null, promptT: 0, said: {}, whip: null, cut: null, katana: at >= 2, started: R ? R.started : false };
    P = { x: entryX(SECTIONS[at]), jh: 0, vj: 0, face: SECTIONS[at].dir, crouch: false, slash: -1, slashCd: 0, swing: 0, cd: 0, aimT: 0, inv: 0, hurtT: 0,
      hearts: TUNE.hearts, charge: TUNE.charges, chargeT: 0, step: 0, kick: 0, moving: false, empty: 0 };
    if (at === 2) R.katana = true;
    startSection(at, true);
  }
  function startSection(i, music) {
    const sec = SECTIONS[i];
    R.si = i; R.sec = sec; R.preDone = false; R.tapeCut = null; R.enemies = []; R.papers = []; R.bolts = []; R.script = 0; R.scriptT = 0; R.exitOpen = false; R.secT = 0;
    if (i === 1 && R.glass !== Infinity) { R.katana = true; }
    P.x = entryX(sec); P.jh = 0; P.vj = 0; P.face = sec.dir; P.hearts = TUNE.hearts;
    if (music) {
      if (i === 0) S.playCue(TUNE.cue, 1, true);
      if (i === 1) S.playCue(TUNE.cue, R.katana ? 2 : 1, true);
      if (i === 2) S.playCue(TUNE.cue, 3, true);
    } else if (i === 2) S.playCue(TUNE.cue, 3, false);
  }
  function say(text, delay = 0) { if (R.said[text]) return; R.said[text] = true; R.prompt = text; R.promptT = -delay; }

  // ---------- input: keys, the stick and the two buttons ----------
  const IN = { left: false, right: false, down: false, shoot: false, jump: false, slash: false, stickX: 0, stickY: 0, flick: false };
  const KEY = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', KeyC: 'down',
    ShiftLeft: 'shoot', ShiftRight: 'shoot', KeyJ: 'shoot', KeyZ: 'shoot', Quote: 'shoot' };
  addEventListener('keydown', e => {
    begin();
    if (KEY[e.code]) { IN[KEY[e.code]] = true; e.preventDefault(); }
    if (['ArrowUp', 'KeyW', 'Space'].includes(e.code) && !e.repeat) { IN.jump = true; e.preventDefault(); }
    if (['Enter', 'KeyK', 'KeyX'].includes(e.code) && !e.repeat) { IN.slash = true; e.preventDefault(); }
  });
  addEventListener('keyup', e => { if (KEY[e.code]) IN[KEY[e.code]] = false; });
  // the stick floats: wherever the thumb lands is the centre; slide to move, flick up to jump, hold down to crouch
  const stick = $('stick'), knob = $('knob');
  let sid = null, sx0 = 0, sy0 = 0, flicked = false;
  stick.addEventListener('pointerdown', e => { begin(); sid = e.pointerId; sx0 = e.clientX; sy0 = e.clientY; flicked = false; stick.setPointerCapture(sid); showKnob(0, 0); e.preventDefault(); });
  stick.addEventListener('pointermove', e => {
    if (e.pointerId !== sid) return;
    let dx = e.clientX - sx0, dy = e.clientY - sy0; const d = Math.hypot(dx, dy), max = 46;
    if (d > max * 1.6) { sx0 += dx * (1 - max * 1.6 / d); sy0 += dy * (1 - max * 1.6 / d); dx = e.clientX - sx0; dy = e.clientY - sy0; }
    IN.stickX = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
    IN.stickY = dy > 34 && Math.abs(dx) < dy * .8 ? 1 : 0;
    if (IN.stickY) IN.stickX = 0;
    if (dy < -26 && !flicked) { IN.jump = true; flicked = true; }
    if (dy > -10) flicked = false;
    showKnob(clamp(dx, -max, max), clamp(dy, -max, max));
  });
  const endStick = e => { if (e.pointerId !== sid) return; sid = null; IN.stickX = 0; IN.stickY = 0; showKnob(0, 0, true); };
  stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick); stick.addEventListener('lostpointercapture', endStick);
  function letGo() { IN.left = IN.right = IN.down = IN.shoot = IN.shootBtn = false; IN.stickX = IN.stickY = 0; sid = null; showKnob(0, 0, true); for (const b of document.querySelectorAll('.big')) b.classList.remove('down'); }
  addEventListener('blur', letGo); document.addEventListener('visibilitychange', () => { if (document.hidden) letGo(); });
  function showKnob(x, y, rest) { knob.style.transform = `translate(${x}px, ${y}px)`; knob.classList.toggle('rest', !!rest); }
  const hold = (el, on, off) => {
    el.addEventListener('pointerdown', e => { begin(); el.setPointerCapture(e.pointerId); el.classList.add('down'); on(); e.preventDefault(); });
    const up = () => { el.classList.remove('down'); off && off(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  };
  hold($('shoot'), () => { IN.shootBtn = true; }, () => { IN.shootBtn = false; });
  hold($('slash'), () => { IN.slash = true; });
  function begin() { if (R.started) return; R.started = true; Snd.init(); FX.init(); S.playCue(TUNE.cue, R.si === 2 ? 3 : R.katana ? 2 : 1, true); }

  // ---------- the bull ----------
  const sec = () => R.sec;
  const feetY = () => groundAt(sec(), P.x) - P.jh;
  const locked = () => R.st !== 'play';
  function hurt(cause, from) {
    if (P.inv > 0 || locked()) return false;
    P.hearts--; P.inv = TUNE.inv; P.hurtT = .35; P.kick = (Math.sign(P.x - from) || -P.face) * TUNE.knock; Snd.play('hurt');
    if (P.hearts <= 0) { R.st = 'dead'; R.stT = 0; R.deaths++; Snd.music(null, { hard: true }); Snd.play('over'); }
    return true;
  }
  function stepBull(dt) {
    P.inv = Math.max(0, P.inv - dt); P.hurtT = Math.max(0, P.hurtT - dt); P.cd = Math.max(0, P.cd - dt); P.aimT = Math.max(0, P.aimT - dt); P.slashCd = Math.max(0, P.slashCd - dt);
    P.chargeT += dt; if (P.chargeT >= TUNE.recharge) { P.chargeT = 0; if (P.charge < TUNE.charges) { P.charge++; if (P.charge === TUNE.charges && P.empty) { P.empty = 0; Snd.play('ready'); } } }
    if (P.slash >= 0) { P.slash += dt; if (P.slash >= TUNE.slashT) P.slash = -1; }
    const L = IN.left || IN.stickX < 0, Rt = IN.right || IN.stickX > 0;
    P.crouch = (IN.down || IN.stickY > 0) && P.jh === 0;
    const mv = P.crouch ? 0 : (Rt ? 1 : 0) - (L ? 1 : 0);
    P.moving = !!mv; if (mv) P.face = mv;
    P.x += (mv * TUNE.run + P.kick) * dt; P.kick *= Math.pow(.002, dt); if (Math.abs(P.kick) < 4) P.kick = 0;
    if (mv) P.step += dt * 11;
    // the edges: the way on opens when the section's cleared
    const tape = sec().tape && R.tapeCut == null ? sec().tape : null;
    const lo = tape ? tape.x + 10 : R.exitOpen && sec().dir < 0 && !sec().door ? -20 : 10, hi = R.exitOpen && sec().dir > 0 && !sec().door ? W + 20 : W - 10;
    P.x = clamp(P.x, lo, hi);
    if (IN.jump && P.jh === 0) { P.vj = 4 * TUNE.jumpH / TUNE.jumpT; Snd.play('jump'); }
    IN.jump = false;
    if (P.vj || P.jh > 0) { P.jh += P.vj * dt; P.vj -= 8 * TUNE.jumpH / (TUNE.jumpT * TUNE.jumpT) * dt; if (P.jh <= 0) { P.jh = 0; P.vj = 0; } }
    // the blaster: hold to keep firing, five a second, on charges
    // crouched he fires too, from lower down (the crouch pose holds the blaster 7 px lower), as on the rides
    if ((IN.shoot || IN.shootBtn) && P.cd <= 0 && P.slash < 0) {
      if (P.charge >= 1) {
        P.charge--; P.cd = TUNE.fireEvery; P.aimT = .2;
        R.bolts.push({ x: P.x + P.face * (SM.x + (P.crouch ? 2 : 0)), y: feetY() + SM.y + (P.crouch ? 7 : 0), vx: P.face * TUNE.shot, px: P.x }); Snd.play('shot');
        if (P.charge === 0) { P.empty = 1; Snd.play('empty'); }
      } else { P.cd = .25; Snd.play('drained'); }
    }
    // the katana, from the Rugmergency on
    if (IN.slash) {
      IN.slash = false;
      if (R.katana && P.slashCd <= 0) { P.slash = 0; P.slashCd = TUNE.slashEvery; P.swing++; Snd.play('slash'); }
    }
  }
  // a slash reaches ahead of him, from his feet to over his head
  function inSlash(x, y) {
    if (P.slash < 0 || P.slash > TUNE.slashLive) return false;
    const ahead = (x - P.x) * P.face, cy = feetY() - 34;
    return ahead > -14 && ahead < TUNE.slashReach && Math.abs(y - cy) < TUNE.slashHigh;
  }
  const touches = (x, y, rx = 16) => Math.abs(x - P.x) < rx && y > feetY() - (P.crouch ? TUNE.crouchH : TUNE.bodyH) && y < feetY() + 2;

  // ---------- carpshits ----------
  function spawnFly(side, hover, o = {}) {
    const x = side > 0 ? W + 30 : -30;
    R.enemies.push({ k: 'fly', x, y: groundAt(sec(), clamp(x, 0, W)) - hover, hover, side, st: 'enter', keep: rnd(...TUNE.fly.keep), ph: rnd(0, 6),
      thrower: !!o.thrower, throwT: o.throwFirst || rnd(...TUNE.fly.throwFirst), swoopT: o.swoopy ? 1.6 : rnd(...TUNE.fly.swoopEvery), t: 0 });
    if (o.prompt) say(o.prompt, .8);
  }
  function spawnRoll() {
    // from the top of the flight, tumbling down toward the bottom of the screen
    const s = sec(), x = s.dir > 0 ? W + 20 : -20;
    R.enemies.push({ k: 'roll', x, y: groundAt(s, clamp(x, 0, W)) - TUNE.rollH, dir: -s.dir, spin: 0, t: 0 });
  }
  function kill(e, by) {
    if (e.dead) return; e.dead = true; R.souls++;
    Snd.play('poof');
    R.fx.push({ k: by === 'slash' ? 'halves' : 'pop', x: e.x, y: e.y, t: 0, dur: .6 }, { k: 'soul', x: e.x, y: e.y, t: 0, dur: 1 });
  }
  function stepEnemies(dt) {
    const F = TUNE.fly;
    for (const e of R.enemies) {
      if (e.dead) continue;
      e.t += dt;
      if (e.k === 'roll') {
        e.x += e.dir * TUNE.roll * dt; e.spin += e.dir * dt * 9;
        e.y = groundAt(sec(), clamp(e.x, 0, W)) - TUNE.rollH - Math.abs(Math.sin(e.t * 9)) * 6;
        if (inSlash(e.x, e.y)) { kill(e, 'slash'); continue; }
        if (touches(e.x, e.y, 18)) hurt('roll', e.x);
        if (e.x < -40 || e.x > W + 40) e.gone = true;
        continue;
      }
      if (e.st === 'swoop') {
        const w = e.sw; w.t += dt; const k = Math.min(1, w.t / F.swoopT), a = (1 - k) * (1 - k), b = 2 * k * (1 - k), c = k * k;
        e.x = a * w.x0 + b * w.cx + c * w.x1; e.y = a * w.y0 + b * w.cy + c * w.y1;
        if (k >= 1) { e.st = 'hover'; e.swoopT = rnd(...F.swoopEvery); e.side = Math.sign(e.x - P.x) || 1; }
      } else {
        const side = Math.sign(e.x - P.x) || e.side, tx = clamp(P.x + side * e.keep, 24, W - 24);
        const ty = groundAt(sec(), tx) - e.hover + Math.sin(e.t * 3.4 + e.ph) * F.bob;
        const sp = e.st === 'enter' ? F.enter : F.drift, dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (d > 1) { e.x += dx / d * Math.min(d, sp * dt); e.y += dy / d * Math.min(d, sp * 1.4 * dt); }
        if (e.st === 'enter' && e.x > 0 && e.x < W && d < 30) e.st = 'hover';
        if (e.st === 'hover') {
          e.swoopT -= dt; e.throwT -= dt;
          if (e.swoopT <= 0) {
            // a dive through where he stands, chest high, and up the far side
            const cy = feetY() - 34, x1 = clamp(P.x - side * 120, 24, W - 24);
            e.st = 'swoop'; e.sw = { t: 0, x0: e.x, y0: e.y, x1, y1: groundAt(sec(), x1) - e.hover, cx: 2 * P.x - .5 * (e.x + x1), cy: 2 * cy - .5 * (e.y + groundAt(sec(), x1) - e.hover) };
            Snd.play('swoop');
          } else if (e.throwT <= 0 && (e.thrower || Math.random() < .5)) {
            e.throwT = rnd(...F.throwEvery);
            const ty2 = feetY() - (P.crouch ? 20 : 36), dx2 = P.x - e.x, dy2 = ty2 - e.y, d2 = Math.hypot(dx2, dy2) || 1;
            R.papers.push({ x: e.x, y: e.y, vx: dx2 / d2 * TUNE.paper, vy: dy2 / d2 * TUNE.paper, src: e, r: 0 }); Snd.play('wadThrow');
            if (R.si === 1 && R.katana) say('SLASH IT BACK');
          } else if (e.throwT <= 0) e.throwT = rnd(...F.throwEvery);
        }
      }
      if (inSlash(e.x, e.y)) { kill(e, 'slash'); continue; }
      if (touches(e.x, e.y + 8)) { if (hurt('flyer', e.x) && e.st === 'swoop') { e.st = 'hover'; e.swoopT = rnd(...F.swoopEvery); } }
    }
    R.enemies = R.enemies.filter(e => !e.dead && !e.gone);
  }
  function stepShots(dt) {
    for (const b of R.bolts) {
      const ox = b.x; b.x += b.vx * dt;
      // the cabinet's glass, halfway up
      const cab = sec().cab;
      if (cab && R.glass === Infinity && R.st === 'play' && R.preDone) {
        const gx0 = cab.x + 6, gx1 = cab.x + 54, gy0 = cab.floor - 62, gy1 = cab.floor - 10;
        if (Math.min(ox, b.x) < gx1 && Math.max(ox, b.x) > gx0 && b.y > gy0 && b.y < gy1) { b.dead = true; breakGlass(); continue; }
      }
      for (const e of R.enemies) if (!e.dead && Math.min(ox, b.x) - 14 < e.x && Math.max(ox, b.x) + 14 > e.x && Math.abs(b.y - e.y) < (e.k === 'roll' ? 30 : TUNE.fly.hit[1])) { b.dead = true; kill(e, 'shot'); break; }
      if (b.x < -30 || b.x > W + 30) b.dead = true;
    }
    R.bolts = R.bolts.filter(b => !b.dead);
    for (const p of R.papers) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.r += dt * 12;
      if (p.back) { for (const e of R.enemies) if (!e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 18) { p.dead = true; kill(e, 'deflect'); break; } }
      else if (inSlash(p.x, p.y)) {
        // knocked back at whoever threw it
        const t = p.src && !p.src.dead ? p.src : null, dx = t ? t.x - p.x : P.face, dy = t ? t.y - p.y : 0, d = Math.hypot(dx, dy) || 1;
        p.back = true; p.vx = dx / d * TUNE.paperBack; p.vy = dy / d * TUNE.paperBack;
        P.charge = Math.min(TUNE.charges, P.charge + TUNE.deflectCharge); Snd.play('deflect'); R.fx.push({ k: 'pop', x: p.x, y: p.y, t: 0, dur: .3, blue: true });
        R.prompt = null;
      } else if (touches(p.x, p.y, 10)) { if (hurt('paper', p.x)) p.dead = true; }
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) p.dead = true;
    }
    R.papers = R.papers.filter(p => !p.dead);
  }
  function stepScript(dt) {
    const pre = sec().cab && !R.katana, sc = pre ? sec().pre : sec().script;
    if (pre && R.preDone) return;
    R.scriptT += dt;
    while (R.script < sc.length) {
      const s = sc[R.script];
      if (s[0] === 'wait') { if (R.scriptT < s[1]) return; R.scriptT = 0; R.script++; continue; }
      if (s[0] === 'clear') { if (R.enemies.length) return; R.scriptT = 0; R.script++; continue; }
      if (s[0] === 'fly') spawnFly(s[1], s[2], s[3] || {});
      if (s[0] === 'roll') spawnRoll();
      if (s[0] === 'prompt') say(s[1], .6);
      R.script++;
    }
    if (pre) { if (!R.enemies.length) R.preDone = true; return; }
    if (!R.exitOpen && !R.enemies.length && (!sec().cab || R.katana)) { R.exitOpen = true; if (sec().tape && R.tapeCut == null) say('SLASH THE TAPE', .2); else if (!sec().door) say('UP!', .2); else say('THE DOOR', .2); }
  }

  // ---------- the Rugmergency ----------
  // the glass breaks: the music stops dead, he steps up to the cabinet, turns to us with the katana up to the fanfare,
  // and the cue slams back in a layer up
  let FAN = null, FANL = 0;
  function breakGlass() {
    R.glass = R.secT; R.st = 'rug'; R.stT = 0; Snd.music(null, { hard: true }); FX.glass(); R.prompt = null;
    R.enemies.forEach(e => kill(e, 'shot')); R.papers = [];
    FAN = M.FANFARES[3](M.KEYSHIFT[TUNE.cue]); FANL = M.seconds(FAN);
  }
  const RUG = { walk: .3, grab: .62, raise: .78 };
  function stepRug(dt) {
    const k = R.stT, cab = sec().cab, cx = cab.x + 30, from = R.rugFrom == null ? (R.rugFrom = P.x) : R.rugFrom;
    if (k >= RUG.walk && k < RUG.grab) { P.x = lerp(from, cx + 26, ease(span(k, RUG.walk, RUG.grab))); P.face = Math.sign(cx - from) || -1; P.step += dt * 11; }
    if (k >= RUG.grab && !R.grabbed) { R.grabbed = true; R.taken = R.secT; FX.shing(); }
    if (k >= RUG.raise && !R.fanfared) { R.fanfared = true; Snd.registerTrack('stairFanfare', FAN); Snd.music('stairFanfare', { slam: true }); }
    if (k >= RUG.raise + FANL) {
      R.st = 'play'; R.katana = true; R.rugFrom = null; P.x = cx + 26; R.script = 0; R.scriptT = 0;
      S.playCue(TUNE.cue, 2, true); say('SLASH', .3); R.said.SLASH = true;
    }
  }

  // ---------- the door ----------
  // at the door: he walks up, catches his breath, "OK... HERE WE GO.", braces and kicks
const DOORT = { walk: .45, line: 1.05, brace: 2.15, kick: 2.5, impact: 2.83, hall: 2.91, banner: 3.07, end: 6.55 };
  function startDoor() { R.st = 'door'; R.stT = 0; R.doorFrom = P.x; Snd.music(null, { hard: true }); FX.hum(DOORT.kick); R.prompt = null; }
  function stepDoor() {
    const k = R.stT;
    if (k < DOORT.walk) { P.x = lerp(R.doorFrom, 392, ease(k / DOORT.walk)); P.face = 1; if (Math.abs(R.doorFrom - 392) > 4) P.step += 1 / 60 * 11; }
    if (k >= DOORT.line && !R.lined) { R.lined = true; try { Snd.say('OK... HERE WE GO.'); } catch (e) {} }
    if (k >= DOORT.brace && !R.braced) { R.braced = true; FX.creak(); }
    if (k >= DOORT.kick && !R.kicked) { R.kicked = true; FX.kick(); Snd.music('floorHall', { slam: true, stems: ['drums', 'bass', 'lead'] }); }
    if (k >= DOORT.impact && !R.impacted) { R.impacted = true; FX.impact(); }
    if (k >= DOORT.hall + .15 && !R.started13) { R.started13 = true; Snd.play('start'); }
    if (k >= DOORT.end && R.st === 'door') { R.st = 'clear'; R.stT = 0; showCard(); }
  }

  // ---------- the whip up between sections ----------
  const WHIP = .85;
  function startWhip() {
    const from = R.si, to = R.si + 1, a = +SECTIONS[from].high || 1, b = +SECTIONS[to].low;
    R.whip = { t: 0, from, to, a, b, img: canvas(W, H) };
    drawPlay(R.whip.img.getContext('2d'), true);
    FX.whoosh();
    startSection(to, false);
    R.st = 'whip';
  }

  // ---------- the loop ----------
  function step(dt) {
    if (!R.started) return;
    R.t += dt; R.stT += dt; R.secT += dt; R.promptT += dt;
    if (R.st === 'play' || R.st === 'rug' || R.st === 'door') R.time += dt;
    for (const f of R.fx) f.t += dt; R.fx = R.fx.filter(f => f.t < f.dur);
    if (R.st === 'whip') { R.whip.t += dt; if (R.whip.t >= WHIP) { R.whip = null; R.st = 'play'; } return; }
    if (R.st === 'dead') { if (R.stT > 1.8) restartSection(); return; }
    if (R.st === 'clear') return;
    if (R.st === 'rug') { stepRug(dt); stepShots(dt); return; }
    if (R.st === 'door') { stepDoor(); return; }
    stepBull(dt); stepEnemies(dt); stepShots(dt); stepScript(dt);
    const tp = sec().tape;
    if (tp && R.tapeCut == null && inSlash(tp.x, tp.floor - 40)) {
      R.tapeCut = R.secT; Snd.play('cut'); R.fx.push({ k: 'pop', x: tp.x - 8, y: tp.floor - 40, t: 0, dur: .3 });
      if (R.exitOpen) { R.prompt = null; R.said['UP!'] = false; say('UP!', .2); }
    }
    if (R.exitOpen) {
      const s = sec();
      if (s.door && P.x > 360 && P.jh === 0) startDoor();
      else if (!s.door && (s.dir > 0 ? P.x > W + 6 : P.x < -6)) startWhip();
    }
  }
  function restartSection() {
    const i = R.si, glass = R.glass;
    P.hearts = TUNE.hearts; P.charge = TUNE.charges; P.inv = 1; R.st = 'play'; R.stT = 0; R.fx = []; R.said = {};
    if (i === 1 && glass !== Infinity) R.katana = true;
    startSection(i, true);
  }

  // ---------- drawing, through the game's renderer ----------
  // As on the rides: everything is drawn into two layers, one lit by the light where each pixel stands (the stairwell,
  // him, the carpshits) and one that glows as it is (bulbs, bolts, paper, souls, the open door); the game's renderer,
  // in its flat mode, lights the first from a few point lights over an ambient fill, lays the second over it, and
  // finishes the picture with bloom, tone, vignette, dither and the 64-colour palette. Words and the HUD go on top, crisp.
  const R3 = UnrugRender.create(W, H, Object.assign({}, S.SET, { flat: true }));   // the hall's shape, flat, as the rides pass it
  const LITC = canvas(W, H), GLOC = canvas(W, H), OFF = canvas(W, H), OG = OFF.getContext('2d');
  const LG = LITC.getContext('2d', { willReadFrequently: true }), GG = GLOC.getContext('2d', { willReadFrequently: true });
  function pose() {
    const set = R.katana ? SIDE : BARE;
    if (P.hurtT > 0) return set.hurt;
    if (P.slash >= 0) return P.slash < .07 ? set.wind : set.cut;
    if (P.jh > 0) return set.jump;
    if (P.crouch) return set.crouch;
    if (P.moving) return set['run' + (Math.floor(P.step) % 4)];
    return set.aim;
  }
  const raising = () => R.st === 'rug' && R.stT >= RUG.raise && R.stT < RUG.raise + FANL;
  const muzzleAt = () => [P.x + P.face * (SM.x + (P.crouch ? 2 : 0)) - (P.face < 0 ? 4 : 0), feetY() + SM.y + (P.crouch ? 7 : 0)];
  function drawBull(g, gl) {
    if (R.st === 'dead') {
      const k = R.stT; if (k > 1.1 || (k > .8 && Math.floor(k * 30) % 2)) return;
      g.save(); g.globalAlpha = k > .8 ? .5 : 1; drawSide(g, (R.katana ? SIDE : BARE).hurt, P.x, feetY(), SF, P.face); g.restore(); return;
    }
    if (R.st === 'rug') {
      const k = R.stT, cab = sec().cab;
      if (raising()) {
        const hop = k - RUG.raise < .12 ? Math.round(Math.sin((k - RUG.raise) / .12 * Math.PI) * 6) : 0;
        drawSide(g, RAISED, cab.x + 30, cab.floor - hop, RF);
        const tipX = cab.x + 30 - 21, tipY = cab.floor - hop - RF.y + 2, tw = Math.sin(k * 14) * .5 + .5;
        S.glow(gl, tipX, tipY + 28 * (1 - (k * 1.4) % 1), 10, '#ffffff', .8);
        gl.fillStyle = '#ffffff'; gl.fillRect(tipX - 1, tipY - 6 - tw * 3, 2, 12 + tw * 6); gl.fillRect(tipX - 6 - tw * 3, tipY - 1, 12 + tw * 6, 2);
        return;
      }
      const img = k >= RUG.grab ? BARE.wind : k >= RUG.walk ? BARE['run' + (Math.floor(P.step) % 4)] : BARE.aim;
      drawSide(g, img, P.x, feetY(), SF, P.face); return;
    }
    if (R.st === 'door') {
      const k = R.stT, walking = k < DOORT.walk && Math.abs(R.doorFrom - 392) > 4;
      // catching his breath: the blaster lowered and raised with each heave, his shoulders rising a pixel
      const breath = !walking && k < DOORT.brace ? Math.floor((k - DOORT.walk) / .42) % 2 : 0;
      const img = k >= DOORT.kick ? MOVE.kick : k >= DOORT.brace ? MOVE.brace : walking ? SIDE['run' + (Math.floor(P.step) % 4)] : breath ? SIDE.idle : SIDE.aim;
      drawSide(g, img, P.x, feetY() + (breath ? 1 : 0), img === MOVE.kick || img === MOVE.brace ? MF : SF, 1);
      return;
    }
    g.save(); if (P.inv > 0 && Math.floor(R.t * 18) % 2) g.globalAlpha = .4;
    drawSide(g, pose(), P.x, feetY(), SF, P.face);
    g.restore();
    if (P.aimT > .1 && P.slash < 0) S.muzzle(gl, ...muzzleAt());
    if (P.slash >= 0) {
      const k = P.slash / TUNE.slashT, cx = P.x + P.face * 6, cy = feetY() - (P.crouch ? 16 : 30);
      gl.save(); gl.translate(cx, cy); gl.scale(P.face, 1);
      gl.strokeStyle = '#ffffff'; gl.lineWidth = 3; gl.beginPath(); gl.arc(0, 0, 36, -1.4 + k * .5, .9 + k * .5); gl.stroke();
      gl.strokeStyle = '#7fd4ff'; gl.lineWidth = 2; gl.beginPath(); gl.arc(0, 0, 31, -1.2 + k * .5, .7 + k * .5); gl.stroke(); gl.restore();
    }
  }
  function drawPaper(gl, p) {
    const col = p.back ? '#7fd4ff' : '#ff7050';
    S.glow(gl, p.x, p.y, 14, col, .7);
    gl.save(); gl.translate(Math.round(p.x), Math.round(p.y)); gl.rotate(p.r); A.rect(gl, -4, -4, 8, 8, '#1a1418'); A.rect(gl, -3, -3, 6, 6, p.back ? '#bfefff' : '#ffe0c8'); gl.restore();
  }
  function drawEnemies(g) {
    for (const e of R.enemies) {
      if (e.k === 'roll') { S.carp(g, e.x, e.y, R.t, e.dir, e.spin); continue; }
      const rear = e.st === 'hover' && e.swoopT < .4;
      g.save(); if (rear) g.filter = 'brightness(1.5) saturate(1.6)';
      S.carp(g, e.x + (rear ? Math.sin(R.t * 60) * 1.5 : 0), e.y, R.t + e.ph, P.x < e.x ? -1 : 1, e.st === 'swoop' ? (P.x < e.x ? -.4 : .4) : 0);
      g.restore();
    }
  }
  function drawFx(g, gl) {
    for (const f of R.fx) {
      const k = f.t / f.dur;
      if (f.k === 'soul') S.soul(gl, f.x, f.y, k);
      else if (f.k === 'halves') S.carpHalves(g, f.x, f.y, k);
      else if (f.k === 'pop') { S.glow(gl, f.x, f.y, 20 * (1 - k), f.blue ? '#7fd4ff' : '#fff6e2', 1 - k); }
    }
  }
  // the section's things into the lit layer (g) and the glow layer (gl)
  function drawLayers(g, gl) {
    const s = sec();
    g.drawImage(backdrop(s), 0, 0);
    gl.fillStyle = '#fff0b8'; gl.fillRect(s.lamp - 4, 14, 8, 8); S.glow(gl, s.lamp, 18, 22, '#fff4c8', .7);
    if (s.cab) { g.save(); g.translate(s.cab.x - 300, s.cab.floor - 240); S.cabinet(g, R.secT, R.glass, R.taken); S.shards(g, R.secT, R.glass); g.restore(); }
    if (s.door) doorEnd(g, gl, s.path[s.path.length - 1][1], doorOpen());
    if (s.cab && R.preDone && R.glass === Infinity && R.st === 'play') {
      // ready: the cabinet's frame glows red, pulsing, so you know to shoot it
      const pu = .5 + .5 * Math.sin(R.t * 6), x = s.cab.x, y = s.cab.floor - 70;
      gl.save(); gl.globalAlpha = .55 + .45 * pu; gl.strokeStyle = '#ff3a2a'; gl.lineWidth = 2; gl.strokeRect(x - 3, y - 1, 66, 67); gl.globalAlpha = .3 + .3 * pu; gl.strokeStyle = '#ff9a80'; gl.lineWidth = 1; gl.strokeRect(x - 5, y - 3, 70, 71); gl.restore();
      S.glow(gl, x + 30, y + 34, 60, '#ff4030', .18 * pu);
    }
    if (s.tape) drawTape(g, s.tape);
    drawEnemies(g);
    for (const b of R.bolts) S.bolt(gl, b.x, b.y, Math.sign(b.vx));
    for (const p of R.papers) drawPaper(gl, p);
    drawBull(g, gl);
    drawFx(g, gl);
    if (raising()) {
      // the item get: gold rays turning behind him, in the glow (the renderer dims the rest and lights him)
      const k = R.stT - RUG.raise, cx = s.cab.x + 30, cy = s.cab.floor - 90;
      gl.save(); gl.globalCompositeOperation = 'lighter'; gl.globalAlpha = .22 * Math.min(1, k / .2);
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + k * .6; gl.fillStyle = i % 2 ? '#ffd44a' : '#ff9a3a'; gl.beginPath(); gl.moveTo(cx, cy); gl.lineTo(cx + Math.cos(a - .1) * 400, cy + Math.sin(a - .1) * 400); gl.lineTo(cx + Math.cos(a + .1) * 400, cy + Math.sin(a + .1) * 400); gl.closePath(); gl.fill(); }
      gl.restore();
    }
  }
  // caution tape from a post at the top of the flight to the wall: whole, then cut and falling away
  // caution tape criss-crossed over the way up, from a post at the top of the flight to a bracket on the wall: whole,
  // then cut, each strip parting in the middle and dropping
  function drawTape(g, tp) {
    const x0 = 4, x1 = tp.x, yb = tp.floor - 6, yt = tp.floor - 58;
    g.fillStyle = '#5a6070'; g.fillRect(x1 - 1, yt - 2, 4, tp.floor - yt + 2); g.fillStyle = '#8a93a6'; g.fillRect(x1 - 2, yt - 4, 6, 3); g.fillRect(x1 - 3, tp.floor - 2, 8, 2);
    g.fillStyle = '#4a4a5a'; g.fillRect(x0 - 2, yt, 3, 6); g.fillRect(x0 - 2, yb - 6, 3, 6);
    const strip = (ax, ay, bx, by, alpha = 1) => {
      const len = Math.hypot(bx - ax, by - ay), rot = Math.atan2(by - ay, bx - ax);
      g.save(); g.globalAlpha = alpha; g.translate(ax, ay); g.rotate(rot);
      g.fillStyle = '#e8c020'; g.fillRect(0, -3, len, 6); g.fillStyle = '#1a1418'; for (let x = 3; x < len - 2; x += 8) g.fillRect(x, -3, 4, 6);
      g.restore();
    };
    if (R.tapeCut == null) { strip(x0, yb, x1, yt); strip(x0, yt, x1, yb); return; }
    const k = Math.min(1, (R.secT - R.tapeCut) / .5), mx = (x0 + x1) / 2, my = (yb + yt) / 2, sag = ease(k);
    // each half hangs from its end and swings down
    strip(x1, yt, lerp(mx, x1 - 4, sag), lerp(my, yt + 24, sag)); strip(x1, yb, lerp(mx, x1 - 8, sag), lerp(my, yb, sag));
    strip(x0, yb, lerp(mx, x0 + 6, sag), lerp(my, yb, sag)); strip(x0, yt, lerp(mx, x0 + 2, sag), lerp(my, yt + 26, sag));
  }
  const doorOpen = () => R.st === 'door' ? ease(span(R.stT, DOORT.kick, DOORT.kick + .14)) : 0;
  // the light in the stairwell this frame: the lamps, the open door, bolts and paper, the muzzle, freed souls
  function lights(r) {
    const s = sec(), L = (x, y, cr, cg, cb) => r.light(x, y, 0, cr, cg, cb);
    L(s.lamp, 26, 2.6, 2.1, 1.4);
    if (s.door) { const fl = s.path[s.path.length - 1][1]; L(410, fl - 118, 1.6, 1.3, .9); const o = doorOpen(); if (o) L(452, fl - 40, 3.2 * o, 2.9 * o, 2.2 * o); }
    if (s.cab && R.secT - R.glass < .25) L(s.cab.x + 30, s.cab.floor - 36, 2.5, 2.8, 3.2);
    if (s.cab && R.preDone && R.glass === Infinity) { const pu = .5 + .5 * Math.sin(R.t * 6); L(s.cab.x + 30, s.cab.floor - 36, .4 + 1.1 * pu, .08 + .1 * pu, .06); }
    for (const b of R.bolts.slice(0, 6)) L(b.x, b.y, .3, .55, .9);
    for (const p of R.papers) L(p.x, p.y, p.back ? .15 : .5, p.back ? .3 : .16, p.back ? .5 : .08);
    if (P.aimT > .1 && P.slash < 0 && R.st === 'play') { const [x, y] = muzzleAt(); L(x, y, .7, .55, .3); }
    for (const f of R.fx) if (f.k === 'soul') L(f.x, f.y - 50 * (f.t / f.dur), .12, .2, .3);
    if (raising()) L(s.cab.x + 30, s.cab.floor - 70, 2.4, 1.9, 1.0);
  }
  // one finished frame of the stairwell into ctx (putImageData: not transformed or blended)
  function render(ctx) {
    for (const x of [LG, GG]) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H); x.imageSmoothingEnabled = false; }
    drawLayers(LG, GG);
    lights(R3);
    R3.frame(R.t, { ambient: raising() ? lerp(.62, .2, Math.min(1, (R.stT - RUG.raise) / .15)) : .62 });
    R3.layer(LG.getImageData(0, 0, W, H).data, GG.getImageData(0, 0, W, H).data);
    R3.present(ctx, 0, 0);
  }
  function drawHud(g) {
    S.words(g, () => {
      for (let i = 0; i < TUNE.hearts; i++) g.drawImage(i < P.hearts ? A.HEART : A.HEART_EMPTY, 4 + i * (A.HEART.width / 2 + 2), 4, A.HEART.width / 2, A.HEART.height / 2);
      const bw = 40, f = P.charge / TUNE.charges;
      A.rect(g, 4, 14, bw + 2, 4, '#0a0810'); A.rect(g, 5, 15, Math.round(bw * f), 2, f < .25 ? '#d63428' : '#3aa8e0');
      A.otxt(g, 'SOULS ' + R.souls, 236, 4, '#fff6e2', 1, 'right');
      A.otxt(g, 'FL ' + sec().low + '-' + sec().high, 236, 12, '#ffd44a', 1, 'right');
    });
    if (R.prompt && R.promptT >= 0 && R.promptT < 2.4) S.prompt(g, R.prompt);
    if (R.exitOpen && R.st === 'play' && !sec().door && !(sec().tape && R.tapeCut == null)) {
      // the way up: an arrow at the top of the flight
      const s = sec(), x = s.dir > 0 ? W - 22 : 22, y = topY(s) - 86 + Math.sin(R.t * 6) * 3;
      S.words(g, () => A.otxt(g, s.dir > 0 ? 'UP >' : '< UP', x / 2, y / 2, '#ffd44a', 1, 'center'));
    }
  }
  // the words over the play picture: the HUD, his lines, the item get's banner
  function overlay(g, noHud) {
    if (!noHud) drawHud(g);
    if (R.st === 'rug' && R.stT < RUG.raise) S.bark(g, '!', 1);
    if (raising()) S.topBanner(g, 'RUGMERGENCY KATANA', span(R.stT - RUG.raise, .25, FANL - .05));
    if (R.st === 'door' && R.stT >= DOORT.line && R.stT < DOORT.kick + .2) S.bark(g, 'OK... HERE WE GO.', span(R.stT, DOORT.line, DOORT.line + 1.6));
  }
  function drawDoorCut(g) {
    const k = R.stT;
    if (k < DOORT.kick + .02) { render(g); overlay(g); return; }
    if (k < DOORT.hall) {
      render(g); overlay(g, true);
      const f = span(k, DOORT.kick + .02, DOORT.impact), ff = f * f, floor = sec().path[sec().path.length - 1][1];
      S.doorFront(g, lerp(452, 240, ff), lerp(floor - 48, 135, ff), lerp(28, 560, ff), lerp(100, 1100, ff), lerp(-.5, .08, f) + Math.sin(f * 9) * .05);
      if (k >= DOORT.impact) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H); }
      return;
    }
    const raise = k >= DOORT.hall + .15, img = S.hall(0, raise ? BACK.aim : BACK.stand);
    const [sx, sy] = S.shakeAt(k, DOORT.hall, .3, 6);
    g.fillStyle = '#07050a'; g.fillRect(0, 0, W, H); g.drawImage(img, sx, sy);
    if (k >= DOORT.banner && k < DOORT.banner + 1.6) S.topBanner(g, 'THE 13TH FLOOR', span(k, DOORT.banner, DOORT.banner + 1.6));
    else if (k >= DOORT.banner + 1.6 && k < DOORT.banner + 3.2) S.topBanner(g, 'FREE 90 SOULS', span(k, DOORT.banner + 1.6, DOORT.banner + 3.2));
  }
  function drawWhip(g) {
    const w = R.whip, k = ease(w.t / WHIP);
    // the camera whips up a few floors: the last section drops away, the next comes down from above
    g.fillStyle = '#0b0910'; g.fillRect(0, 0, W, H);
    g.drawImage(w.img, 0, Math.round(k * H * 1.1));
    render(OG);
    g.drawImage(OFF, 0, Math.round((k - 1) * H * 1.1));
    // the floors going by
    const n = Math.round(lerp(w.a, w.b, Math.min(1, w.t / (WHIP * .8))));
    S.words(g, () => { g.globalAlpha = Math.min(1, Math.sin(Math.PI * w.t / WHIP) * 2); A.rect(g, 92, 46, 56, 40, '#0a0810'); A.otxt(g, 'FL', 120, 50, '#fff6e2', 1, 'center'); A.otxt(g, String(n), 120, 60, '#ffd44a', 4, 'center'); });
  }
  // the whip's snapshot of the section it leaves: the finished picture, no words
  function drawPlay(g) { render(OG); g.drawImage(OFF, 0, 0); }
  function draw() {
    out.setTransform(1, 0, 0, 1, 0, 0);
    if (!R.started) {
      render(out);
      S.words(out, () => { out.globalAlpha = .8; A.rect(out, 50, 52, 140, 30, '#0a0810'); out.globalAlpha = 1; A.otxt(out, 'TAP TO START', 120, 58, '#ffd44a', 2, 'center'); A.otxt(out, 'SOUND ON', 120, 72, '#fff6e2', 1, 'center'); });
      return;
    }
    if (R.st === 'whip') drawWhip(out);
    else if (R.st === 'door' || R.st === 'clear') drawDoorCut(out);
    else { render(out); overlay(out); }
    if (R.st === 'dead' && R.stT > .9) S.words(out, () => { A.otxt(out, 'RUGGED', 120, 56, '#ff7050', 3, 'center'); A.otxt(out, 'BACK TO THE LANDING', 120, 74, '#fff6e2', 1, 'center'); });
    $('debug').textContent = `section ${R.si + 1} · ${R.time.toFixed(1)} s · ${R.st}`;
  }
  function showCard() {
    $('card').hidden = false;
    $('cardText').textContent = `The stairwell in ${R.time.toFixed(1)} s · ${R.souls} souls freed` + (R.deaths ? ` · rugged ${R.deaths}×` : '');
  }

  // the clock: steps of a sixtieth, drawn thirty times a second
  let last = performance.now(), acc = 0, drawn = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    acc += clamp((now - last) / 1000, 0, .1); last = Math.max(last, now);
    while (acc >= 1 / 60) { acc -= 1 / 60; try { step(1 / 60); } catch (e) { console.error(e); } }
    if (now - drawn >= 30) { drawn = now; try { draw(); } catch (e) { console.error(e); } }
  }
  // the page's buttons: start again from any section; sound on and off
  for (const b of document.querySelectorAll('[data-from]')) b.onclick = () => { $('card').hidden = true; const st = R.started; newRun(+b.dataset.from); R.started = st; if (st) begin2(); };
  function begin2() { Snd.init(); FX.init(); S.playCue(TUNE.cue, R.si === 2 ? 3 : R.katana ? 2 : 1, true); }
  $('again').onclick = () => { $('card').hidden = true; newRun(0); R.started = true; begin2(); };
  const showMute = () => { $('mute').textContent = Snd.muted ? 'Sound off' : 'Sound on'; $('mute').setAttribute('aria-pressed', Snd.muted); };
  $('mute').onclick = () => { Snd.toggle(); showMute(); }; showMute();
  newRun(0);
  requestAnimationFrame(loop);
  window.CLIMB = { get R() { return R; }, get P() { return P; }, IN, newRun, step, SECTIONS, TUNE, startWhip, breakGlass, render };
})();
