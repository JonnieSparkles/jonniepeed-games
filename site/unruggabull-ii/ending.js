// Unruggabull II: the ending after dawn (ending-plan.md). Classic script, before roof.js, which makes it once and
// plays it as its `ending` state, between dawn and the clear card. Six shots, about 27 seconds: two in the game (the
// roof as it is), three still pictures and the final card. The stills are drawn over everything, the HUD included,
// through the roof's cut seam (cutActive and drawCut). Stand-in drawing throughout, to be replaced in Part B; the
// tower is the owner's picture (ending-stills.js). Nothing here touches the run's outcome: it starts after the fight.
var UnrugEnding = function (core, roof) {
  'use strict';
  const { A, Snd, txt, textWidth, W, H, PW, PH, PIC, clamp, live } = core;
  // The shots in order: id, length in seconds, and whether it's a picture (drawn over everything) or the game's roof.
  // Every time is a starting point (the owner settles timing, transitions, music and skip later).
  const SHOTS = [
    { id: 'breathe', dur: 2.5, still: false },   // dawn breathes: the roof's own dawn, held a moment longer; the HUD fades
    { id: 'tower', dur: 6, still: true },        // RugCo Tower at sunrise, the souls leaving its broken roof (his picture)
    { id: 'eye', dur: 5.4, still: true },        // the dead eye; a blue light blinks once; it floods red
    { id: 'escape', dur: 4, still: false },      // back on the roof: it tears itself loose and is gone
    { id: 'reaction', dur: 3.8, still: true },   // the reverse angle: a beat, then OH, COME ON.
    { id: 'card', dur: 5, still: true }          // fade to black: ... TO BE CONTINUED... MAYBE.
  ];
  const E = {
    hudFade: 1.2,                                // the HUD fades out over the first shot
    pan: 210,                                    // the tower pans up its picture this far (480 x 540), the reverse of intro still 5
    eye: { blue: [1.6, 2], blink: [2.5, 2.72], red: 3.3 },
    escape: { aim: [.15, 3.1], shake: .4, cables: [.6, .8, 1, 1.2], tear: 1.3, gone: 2.1, rise: 90 },
    speck: [.3, 1.7], line: 1.8,                 // the reaction: p(Loom) falls far off behind him, then his line
    card: { fade: .8, at: 1.1, beat: .55, first: '... TO BE CONTINUED...', last: 'MAYBE.' }
  };
  const LIGHT_BLUE = '#86d6f0', BLUE_HI = '#c8f4ff';
  let S = null;   // the ending in progress: the shot (i), seconds into it (t), the cues fired, the card's timing

  // ---------- small helpers (game units, drawn at half a unit: the picture's own pixels) ----------
  const half = v => Math.round(v * 2) / 2;
  const hr = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(half(x), half(y), Math.max(.5, half(w)), Math.max(.5, half(h))); };
  function ln(g, x0, y0, x1, y1, c, w = .5) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); g.fillStyle = c;
    for (let i = 0; i <= n; i++) { const k = i / n; g.fillRect(half(x0 + (x1 - x0) * k) - (w > .5 ? w / 2 : 0), half(y0 + (y1 - y0) * k) - (w > .5 ? w / 2 : 0), w, w); }
  }
  function disc(g, x, y, r, c) { g.fillStyle = c; for (let dy = -r; dy <= r; dy += .5) { const w = Math.sqrt(Math.max(0, r * r - dy * dy)); g.fillRect(half(x - w), half(y + dy), half(w * 2) + .5, .5); } }
  function oval(g, x, y, rx, ry, c) { g.fillStyle = c; for (let dy = -ry; dy <= ry; dy += .5) { const w = rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)); g.fillRect(half(x - w), half(y + dy), half(w * 2) + .5, .5); } }
  function poly(g, c, pts) { g.fillStyle = c; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); }
  const alpha = (g, a, f) => { g.save(); g.globalAlpha = a; f(); g.restore(); };
  const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const hx = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  const mix = (a, b, k) => { const p = hx(a), q = hx(b); return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const ease = k => k * k * (3 - 2 * k);
  const span = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const tri = (t, a, b) => { const m = (a + b) / 2; return t < a || t > b ? 0 : t < m ? (t - a) / (m - a) : (b - t) / (b - m); };
  const calm = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- the timeline ----------
  // cues: [shot, seconds into it, what happens], fired once each as the ending passes them (sound and screen-reader text)
  const CUES = [
    ['tower', 0, () => live('RugCo Tower at sunrise. The freed souls drift up out of its broken roof into the dawn.')],
    ['eye', 0, () => live("Close on p(Loom)'s wrecked eye, dark and cracked.")],
    ['eye', E.eye.blue[0], () => live('A tiny blue light in it. It blinks once.')],
    ['eye', E.eye.blink[0], () => Snd.play('armorClank')],            // Loomy's blink in the intro (still 2)
    ['eye', E.eye.red, () => { Snd.play('zap'); Snd.play('rumble'); live('It flashes red.'); }],
    ['escape', 0, () => live('The eye tears itself out of the loom and flies off over the roof.')],
    ...E.escape.cables.map(at => ['escape', at, () => Snd.play('cableSnap')]),
    ['escape', E.escape.tear, () => { Snd.play('snap'); Snd.play('machineBreak'); roof.flash(.12); roof.shake(5, .6); }],
    ['escape', E.escape.tear + .1, () => Snd.play('swoop')],
    ['reaction', 0, () => { Snd.play('gust'); live('Unruggabull stares after it.'); }],
    ['reaction', E.line, () => core.bark('comeOn', true)],
    ['card', E.card.at, () => Snd.say(E.card.first, 'narrator')],
    ['card', 0, () => live('To be continued. Maybe.')]
  ];
  function start() {
    load();
    // the card's two parts type out with the narrator's blips; MAYBE. comes a beat after the first part is said
    const firstT = Snd.talkTimes(E.card.first, 'narrator'), lastT = Snd.talkTimes(E.card.last, 'narrator');
    S = { i: 0, t: 0, fired: new Set(), firstT, lastT, lastAt: E.card.at + firstT.total + E.card.beat };
    S.cues = CUES.concat([['card', S.lastAt, () => Snd.say(E.card.last, 'narrator')]]);
    SHOTS[SHOTS.length - 1].dur = Math.max(5, S.lastAt + lastT.total + 1.6);
    cues();
  }
  function cues() {
    const id = SHOTS[S.i].id;
    S.cues.forEach((c, k) => { if (c[0] === id && S.t >= c[1] && !S.fired.has(k)) { S.fired.add(k); c[2](); } });
  }
  function tick(dt) {
    if (!S || S.i >= SHOTS.length) return;
    S.t += dt;
    while (S.i < SHOTS.length && S.t >= SHOTS[S.i].dur) { S.t -= SHOTS[S.i].dur; S.i++; if (S.i < SHOTS.length) { core.emit('ending_shot', { shot: SHOTS[S.i].id }); cues(); } }
    if (S.i < SHOTS.length) cues();
    // in the escape he raises the blaster by reflex when the eye goes red, and lowers it once it's gone
    const sh = shot();
    if (sh && sh.id === 'escape') roof.bull().aimT = S.t >= E.escape.aim[0] && S.t < E.escape.aim[1] ? .15 : 0;
  }
  const shot = () => S && S.i < SHOTS.length ? SHOTS[S.i] : null;
  const done = () => !!S && S.i >= SHOTS.length;
  const still = () => { const s = shot(); return !!s && s.still; };
  // the HUD fades out over the first shot and stays away, behind the clear card too
  const hudAlpha = () => !S ? 1 : S.i > 0 ? 0 : 1 - span(S.t, 0, E.hudFade);

  // ---------- the painted still's data: loaded when the roof starts (about 60 KB) ----------
  function load() {
    if (window.UnrugEndingStills || typeof document === 'undefined' || document.getElementById('endingStills')) return;
    const meta = document.querySelector('meta[name="ending-stills"]'), s = document.createElement('script');
    s.id = 'endingStills'; s.src = meta ? meta.content : 'ending-stills.js';
    document.head.append(s);
  }

  // ---------- the roof shots: drawn into the roof's own frame ----------
  // The eye, where the roof would draw it. Returns true when the ending drew it (or it's gone).
  function drawEye(g, x, y) {
    const s = shot(); if (!done() && (!s || s.id !== 'escape')) return false;
    const C = E.escape, t = done() ? C.gone : S.t;
    if (t >= C.tear) { disc(g, x, y, 7, '#08060a'); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.28; ln(g, x + Math.cos(a) * 6, y + Math.sin(a) * 6, x + Math.cos(a) * 9, y + Math.sin(a) * 9, '#4a4252'); } return true; }
    const j = jitter(t);
    hr(g, x + j - 12, y - 3, 24, 6, '#3b3a48'); disc(g, x + j, y, 9, '#1a1824');
    redEye(g, x + j, y, 6);
    return true;
  }
  // it thrashes in its shuttle from E.escape.shake until it tears out
  const jitter = t => { const C = E.escape; return t > C.shake && t < C.tear ? Math.round(Math.sin(t * 40) * 3 * span(t, C.shake, C.shake + .3) * 2) / 2 : 0; };
  function redEye(g, x, y, r) {
    disc(g, x, y, r, '#ff3430'); disc(g, x, y, r * .35, '#140c08');
    const R = rng(19);
    for (let c = 0; c < 6; c++) { const a = c * 1.05 + R() * .4; ln(g, x + Math.cos(a) * r * .4, y + Math.sin(a) * r * .4, x + Math.cos(a + .3) * r, y + Math.sin(a + .3) * r, '#fff0aa'); }
  }
  // the cables tearing, the burst and the eye leaving: lit (the cables) and glow (the eye, sparks, the flash)
  function drawRoof(g, layer, x0, y0, LM) {
    const s = shot(); if (!s || s.id !== 'escape') return;
    const C = E.escape, t = S.t, gone = t >= C.tear, j = jitter(t);
    if (layer === 'lit') {
      const ends = [[LM.left + LM.frame, y0 - 7], [LM.right - LM.frame, y0 - 7], [x0 - 6, LM.beam], [x0 + 6, LM.beam]];
      ends.forEach(([cx, cy], i) => {
        const sx = x0 + j + (i % 2 ? 12 : -12), sy = y0 - 2, at = C.cables[i];
        if (t < at) { ln(g, sx, sy, cx, cy, '#4b4a58', 1); ln(g, sx, sy - .5, cx, cy - .5, '#9496a8'); return; }
        const w = Math.sin((t - at) * 14) * 3 * Math.exp(-(t - at) * 3);
        ln(g, cx, cy, cx + (sx - cx) * .3, cy + 8 + w, '#76788a', 1);
        if (!gone) ln(g, sx, sy, sx - (sx - cx) * .15 + w, sy + 7, '#76788a', 1);
      });
      // after it's gone, the thread it pulled out swings in the empty socket
      if (t > C.gone + .3) { const sw = Math.sin(t * 5) * 4 * Math.exp(-(t - C.gone) * .8); ln(g, x0, y0, x0 + sw, y0 + 14, '#e2d6b8'); }
      return;
    }
    if (!gone) {
      if (t > C.shake) sparkle(g, t, C.shake, C.tear, [[x0 + j - 8, y0], [x0 + j + 8, y0], [x0 + j, y0 - 7]], 3, 24);
      alpha(g, .55, () => disc(g, x0 + j, y0, 7, '#c42010'));
      return;
    }
    const k = span(t, C.tear, C.gone), ex = x0 + Math.sin(k * 3) * 6, ey = y0 - C.rise * k * k;
    if (k < 1) {
      ln(g, x0, y0, ex, ey + 6, '#e2d6b8');
      for (let i = 1; i < 6; i++) alpha(g, .4 - i * .07, () => disc(g, ex, ey + i * 5, 5 - i * .6, '#c42010'));
      disc(g, ex, ey, 9, '#1a1824'); redEye(g, ex, ey, 6);
    }
    const b = span(t, C.tear, C.tear + .6), R = rng(15);
    if (b < 1) for (let i = 0; i < 30; i++) { const a = R() * 6.28, v = 10 + R() * 40, x = x0 + Math.cos(a) * v * b, y = y0 + Math.sin(a) * v * b * .7 + 20 * b * b; ln(g, x, y, x + Math.cos(a) * 3, y + Math.sin(a) * 3, R() < .5 ? '#e2d6b8' : '#ffd44a'); }
    if (t < C.tear + .15) { disc(g, x0, y0, 18, '#ff8a3a'); disc(g, x0, y0, 10, '#ffffff'); }
  }
  // where the eye's red light is now (in the picture's game units), or null
  function eyeLight(x0, y0) {
    const s = shot(); if (!s || s.id !== 'escape') return null;
    const C = E.escape, t = S.t;
    if (t < C.tear) return { x: x0, y: y0, k: 1 };
    const k = span(t, C.tear, C.gone);
    return k < 1 ? { x: x0 + Math.sin(k * 3) * 6, y: y0 - C.rise * k * k, k: 1 - k * .5 } : null;
  }
  function sparkle(g, t, t0, t1, origins, seed, n) {
    const R = rng(seed);
    for (let i = 0; i < n; i++) {
      const st = t0 + R() * (t1 - t0), o = origins[i % origins.length], a = -1.6 + (R() - .5) * 3.4, v = 20 + R() * 40, life = .35 + R() * .3, dt = t - st;
      if (dt < 0 || dt > life) continue;
      const x = o[0] + Math.cos(a) * v * dt, y = o[1] + Math.sin(a) * v * dt + 60 * dt * dt;
      ln(g, x, y, x - Math.cos(a) * 2, y - Math.sin(a) * 2 - 1, R() < .5 ? '#ffd44a' : '#ff8a3a');
    }
  }

  // ---------- the stills: drawn over everything ----------
  // The code-drawn stills go through a renderer of their own (flat, like the side views), so they get the game's
  // light, bloom, dither and 64 colours like everything else.
  let FLAT = null, LIT = null, GLOW = null;
  function layers() {
    if (FLAT) return;
    FLAT = core.flatRenderer();
    const mk = () => { const c = document.createElement('canvas'); c.width = PW; c.height = PH; const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingEnabled = false; return x; };
    LIT = mk(); GLOW = mk();
  }
  function lit(draw, ambient, lights) {
    layers();
    for (const x of [LIT, GLOW]) { x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, PW, PH); x.setTransform(PIC, 0, 0, PIC, 0, 0); }
    LIT.fillStyle = '#000'; LIT.fillRect(0, 0, W, H);
    draw(LIT, GLOW);
    for (const l of lights || []) FLAT.light(l.x * PIC, l.y * PIC, 0, l.r, l.g, l.b);
    FLAT.frame(0, { ambient });
    FLAT.layer(LIT.getImageData(0, 0, PW, PH).data, GLOW.getImageData(0, 0, PW, PH).data);
  }
  // Draws the current still into g (the page's picture). Returns false when there's no still to draw.
  function drawStill(g) {
    const s = shot(); if (!s || !s.still) return false;
    const t = S.t;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    if (s.id === 'tower') drawTower(g, t);
    else if (s.id === 'eye') { lit((L, G) => drawEyeShot(L, G, t), .78, eyeLights(t)); FLAT.present(g, shakeX(t), 0); }
    else if (s.id === 'reaction') { lit((L, G) => drawReaction(L, G, t), .95, []); FLAT.present(g, 0, 0); g.setTransform(PIC, 0, 0, PIC, 0, 0); caption(g); }
    else drawCard(g, t);
    g.restore();
    return true;
  }
  // shot 2: the owner's picture, panned up from the roof to the sky, souls drawn over it in its own pixels
  function drawTower(g, t) {
    g.fillStyle = '#25224a'; g.fillRect(0, 0, PW, PH);
    const st = window.UnrugEndingStills && UnrugEndingStills.tower, pan = Math.round(E.pan * (1 - ease(span(t, 0, SHOTS[1].dur))));
    if (st && st.img.complete && st.img.naturalWidth) g.drawImage(st.img, 0, pan, PW, PH, 0, 0, PW, PH);
    const R = rng(8), img = A.GHOST;
    for (let i = 0; i < 22; i++) {
      const v = 22 + R() * 22, off = R() * 360, x0 = 190 + R() * 100, drift = -20 + R() * 60, big = .55 + R() * .45;
      const k = ((t * v + off) % 360) / 360, iy = 292 - k * 360, ix = x0 + k * drift + Math.sin(t * 1.3 + i) * 3;
      const y = iy - pan, a = clamp(k * 8, 0, 1) * clamp((1 - k) * 5, 0, 1) * clamp((iy + 10) / 40, 0, 1);
      if (a < .03 || y < -30 || y > PH + 20) continue;
      const w = Math.round(A.uw(img) * PIC * big), h = Math.round(A.uh(img) * PIC * big);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = .22 * a;
      const r = w * 1.1, gr = g.createRadialGradient(ix, y, 0, ix, y, r); gr.addColorStop(0, '#ffe8b0'); gr.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = gr; g.fillRect(ix - r, y - r, r * 2, r * 2);
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = .9 * a;
      g.drawImage(img, Math.round(ix - w / 2), Math.round(y - h / 2), w, h);
    }
    g.globalAlpha = 1;
  }
  // shot 3: p(Loom)'s wrecked eye, close. Nothing, then a tiny blue light (Loomy's, from the intro), one blink, then red.
  const redAt = t => t > E.eye.red ? span(t, E.eye.red, E.eye.red + .12) * (.85 + .15 * Math.sin(t * 24)) : 0;
  const shakeX = t => { if (t < E.eye.red || calm()) return 0; const a = 2.2 * Math.exp(-(t - E.eye.red) * 1.6) + .35; return Math.round(a * Math.sin(t * 61)) * PIC; };
  function eyeLights(t) {
    const out = [{ x: 30, y: 0, r: .5, g: .35, b: .2 }];
    if (t > E.eye.blue[0] && t < E.eye.red) { const k = span(t, E.eye.blue[0], E.eye.blue[1]) * (1 - tri(t, E.eye.blink[0], E.eye.blink[1])); out.push({ x: 120, y: 62, r: .05 * k, g: .3 * k, b: .45 * k }); }
    if (t > E.eye.red) { const k = redAt(t); out.push({ x: 120, y: 62, r: 1.1 * k, g: .1 * k, b: .05 * k }); }
    return out;
  }
  function drawEyeShot(L, G, t) {
    const red = redAt(t);
    ['#3a2c50', '#5a3a5c', '#8a4c5a', '#c06a50'].forEach((c, i) => hr(L, -4, -4 + i * 8, W + 8, 8.5, c));
    for (let x = 6; x < W; x += 9) { const brk = (x * 7) % 5; hr(L, x, -4, .5, 18 + brk * 4, '#8a8070'); if (brk > 2) ln(L, x, 14 + brk * 4, x + 3, 22 + brk * 3, '#8a8070'); }
    hr(L, -4, 26, W + 8, 66, '#2a2632'); hr(L, -4, 26, W + 8, 1.5, '#5a5262'); hr(L, -4, 90, W + 8, 2, '#18161e');
    for (let x = 4; x < W; x += 14) { hr(L, x, 30, 1.5, 1.5, '#6a6274'); hr(L, x, 85, 1.5, 1.5, '#6a6274'); }
    hr(L, -4, 92, W + 8, 8, '#141218'); hr(L, -4, 92, W + 8, .5, '#5a4a40');
    hr(L, -4, 100, W + 8, 40, '#4a1412'); for (let y = 103; y < 140; y += 5) hr(L, -4, y, W + 8, 1, '#7a5420');
    for (const [a, b] of [[30, 150], [70, 210], [150, 40], [200, 120]]) ln(L, a, -4, b, 30, '#a89a80');
    const ends = bigEye(L, G, 120, 62, 40, { red, blue: t < E.eye.red ? span(t, E.eye.blue[0], E.eye.blue[1]) : 0, blink: 1 - tri(t, E.eye.blink[0], E.eye.blink[1]) });
    const R = rng(4);
    for (let i = 0; i < 14; i++) { const x = (R() * 200 + t * (2 + R() * 3)) % 220 + 10, y = 20 + R() * 80 + Math.sin(t + i) * 2; hr(L, x, y, .5, .5, '#f0d8b0'); }
    if (t > E.eye.red) sparkle(G, t, E.eye.red, SHOTS[2].dur, ends, 9, 50);
  }
  // p(Loom)'s eye at any size: riveted socket, cracked dark iris, a chunk gone; red floods it; blue is the tiny light
  function bigEye(L, G, x, y, r, o) {
    const red = o.red || 0;
    disc(L, x, y, r * 1.1, '#141218'); disc(L, x, y, r, '#34303e');
    for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; hr(L, x + Math.cos(a) * r * .92 - .5, y + Math.sin(a) * r * .92 - .5, 1, 1, '#6a6274'); }
    disc(L, x, y, r * .78, '#141016');
    disc(L, x, y, r * .74, red ? mix('#2a2026', '#7a2a10', red) : '#2a2026');
    if (red) { disc(L, x, y, r * .64, mix('#2a2026', '#ff4030', red)); alpha(G, red, () => disc(G, x, y, r * .64, '#c42010')); }
    const R = rng(19), ends = [];
    for (let c = 0; c < 7; c++) {
      let a = c * .9 + R() * .5, px = x + Math.cos(a) * r * .26, py = y + Math.sin(a) * r * .26;
      for (let s = 0; s < 5; s++) {
        a += (R() - .5) * .7; const l = r * (.1 + R() * .08), nx = px + Math.cos(a) * l, ny = py + Math.sin(a) * l;
        ln(L, px, py, nx, ny, red ? '#2a0806' : '#0a0808', 1);
        if (red) alpha(G, red, () => ln(G, px, py, nx, ny, '#ff6a4a', 1));
        px = nx; py = ny;
      }
      ends.push([px, py]);
    }
    poly(L, '#0c0a10', [[x + r * .5, y - r * .5], [x + r * .72, y - r * .3], [x + r * .62, y - r * .12]]);   // a chunk gone
    disc(L, x, y, r * .27, '#0a0606'); disc(G, x, y, r * .27, '#000000');
    const b = o.blue || 0;
    if (b > 0) {
      const sq = o.blink == null ? 1 : o.blink, br = Math.max(1, r * .04);
      alpha(G, b, () => { oval(G, x, y, br * 2.2, Math.max(.25, br * 2.2 * sq), '#1a5076'); oval(G, x, y, br, Math.max(.25, br * sq), BLUE_HI); });
      alpha(L, b, () => oval(L, x, y, br, Math.max(.25, br * sq), LIGHT_BLUE));
    }
    return ends;
  }
  // shot 5: the reverse angle from the loom's end. He faces us the whole time. Far off behind him, p(Loom) falls as a
  // tiny red speck and drops out of sight beyond the roof; he never sees it. Then his line.
  const FRONT = (() => { let c = null; return () => c || (c = UnrugBull.paint(UnrugBull.VIEWS.front)); })();
  function drawReaction(L, G, t) {
    ['#141a40', '#1c2450', '#28305e', '#3a3a6a', '#584a72', '#7a5a78'].forEach((c, i) => hr(L, 0, i * 12, W, 12.5, c));
    const R = rng(6); for (let i = 0; i < 18; i++) { const x = R() * W, y = R() * 40; hr(L, x, y, .5, .5, '#c8c4e0'); if (R() < .3) hr(G, x, y, .5, .5, '#3a3a5a'); }
    const hz = 72;
    const sk = span(t, E.speck[0], E.speck[1]);
    if (sk > 0 && sk < 1) { const x = 66 + 20 * sk, y = 6 + 60 * sk * sk; ln(L, x - 1.2, y - 2.5, x, y, '#7a2a20'); disc(L, x, y, 1.5, '#7a2020'); hr(L, x - .5, y - .5, 1, 1, '#ff4030'); disc(G, x, y, .8, '#c42010'); }
    const C = rng(13); for (let x = 0; x < W; x += 4 + C() * 6 | 0) { if (x > 128 && x < 182) continue; hr(L, x, hz - 4 - (2 + C() * 6), 3 + C() * 6, 10, '#221c34'); }
    hr(L, 0, hz - 4, W, 4, '#2a2432');
    hr(L, 132, 36, 46, hz - 36, '#4a3a40'); hr(L, 130, 33, 50, 4, '#5a4a4e'); hr(L, 132, 36, 46, 1, '#7a6058');
    hr(L, 146, 46, 18, hz - 46, '#2a2228'); hr(L, 146, 46, 18, .5, '#9a7a60'); hr(L, 154.5, 46, .5, hz - 46, '#1a1418');
    for (const lx of [36, 54]) hr(L, lx, 40, 2, hz - 40, '#2a2226');
    hr(L, 30, 14, 30, 26, '#4a3a40'); poly(L, '#5a4446', [[28, 14], [62, 14], [45, 4]]); for (let k = 0; k < 4; k++) hr(L, 30, 18 + k * 6, 30, .5, '#3a2c30');
    hr(L, 92, 56, 5, hz - 56, '#3a3036'); hr(L, 90, 54, 9, 3, '#4a3e42');
    // the roof's tiles, lit from behind the camera by the sunrise, running back to the housing
    poly(L, '#5a4640', [[0, hz], [W, hz], [W, H], [0, H]]);
    for (let k = 0; k < 7; k++) { const y = hz + 2 + k * k * 1.3; hr(L, 0, y, W, .5, '#4a3a36'); }
    for (let k = -6; k <= 6; k++) ln(L, 120 + k * 9, hz, 120 + k * 46, H, '#4a3a36');
    for (const [x, y, w] of [[30, 100, 22], [200, 90, 18], [214, 124, 26]]) { oval(L, x, y, w, 2.5, '#8a6a40'); oval(G, x, y, w * .7, 1.2, '#5a3a10'); }
    alpha(L, .55, () => poly(L, '#1a0c0c', [[114, 126], [126, 126], [140, 86], [134, 86]]));
    const F = FRONT(), VF = UnrugBull.VIEW_FEET;
    L.drawImage(F, 120 - VF.x, 126 - VF.y, F.width, F.height);
  }
  // his caption, as the core draws his lines (top left, typed with the blips), over the still
  function caption(g) {
    const K = roof.R().bark; if (!K) return;
    let n = 0; while (n < K.text.length && K.times[n] <= K.t) n++;
    const w = textWidth(K.text) + 8, y = 21;
    g.save(); g.globalAlpha = .75; g.fillStyle = '#0a0810'; g.fillRect(2, y, w, 9); g.restore();
    g.fillStyle = '#ffd44a'; g.fillRect(2, y, 1, 9);
    txt(g, K.text.slice(0, n), 6, y + 2, '#fff6e2');
  }
  // shot 6: the reaction fades to black, then the card, typed in the game's lettering with the narrator's blips
  function drawCard(g, t) {
    const C = E.card;
    if (t < C.fade) {
      lit((L, G) => drawReaction(L, G, SHOTS[4].dur), .95, []); FLAT.present(g, 0, 0);
      g.save(); g.setTransform(PIC, 0, 0, PIC, 0, 0); caption(g); g.restore();
      g.fillStyle = 'rgba(0,0,0,' + Math.ceil(t / C.fade * 6) / 6 + ')'; g.fillRect(0, 0, PW, PH);
      return;
    }
    g.fillStyle = '#000'; g.fillRect(0, 0, PW, PH);
    const typed = (text, plan, at) => { let n = 0; while (n < text.length && plan.times[n] <= t - at) n++; return text.slice(0, n); };
    const a = typed(C.first, S.firstT, C.at), b = t >= S.lastAt ? typed(C.last, S.lastT, S.lastAt) : '';
    const whole = C.first + ' ' + C.last, sc = 3, w = textWidth(whole, sc), x = Math.round((PW - w) / 2), y = Math.round(PH / 2 - 7);
    txt(g, a, x, y, '#fff6e2', sc);
    if (b) txt(g, b, x + textWidth(C.first + ' ', sc) + sc, y, '#fff6e2', sc);
  }

  return { SHOTS, E, start, reset: () => { S = null; }, tick, done, still, shot, hudAlpha, drawEye, drawRoof, eyeLight, drawStill, load, at: () => S && { i: S.i, t: S.t } };
};
