// Unruggabull II: the ending after dawn (ending-plan.md). Classic script, before roof.js, which makes it once and
// plays it as its `ending` state, between dawn and the clear card. Six shots, about 27 seconds: two in the game (the
// roof as it is), three still pictures and the final card. The stills are drawn over everything, the HUD included,
// through the roof's cut seam (cutActive and drawCut). The eye, the loom and the roof are the roof's Part B art
// (roof-art.js: bigEye, closeUp), handed over as roof.art(); the tower is the owner's picture (ending-stills.js).
// Nothing here touches the run's outcome: it starts after the fight.
var UnrugEnding = function (core, roof) {
  'use strict';
  const { A, Snd, txt, textWidth, W, H, PW, PH, PIC, clamp, live } = core;
  // The shots in order: id, length in seconds, and whether it's a picture (drawn over everything) or the game's roof.
  // The times are his (settled Oct 17, ending-plan.md); the music (music-roof.js's `ending`) is written to the first two
  // shots' 8.5 s and the dawn before them, so retime those with it.
  const SHOTS = [
    { id: 'breathe', dur: 2.5, still: false },   // dawn breathes: the roof's own dawn, held a moment longer; the HUD fades
    { id: 'tower', dur: 6, still: true },        // RugCo Tower at sunrise, the souls leaving its broken roof (his picture)
    { id: 'eye', dur: 6.9, still: true },        // the dead eye; a blue light blinks once; it floods red
    { id: 'escape', dur: 4, still: false },      // back on the roof: it tears itself loose and is gone
    { id: 'reaction', dur: 3.8, still: true },   // the reverse angle: a beat, then OH, COME ON.
    { id: 'card', dur: 5, still: true }          // fade to black: ... TO BE CONTINUED... MAYBE.
  ];
  const E = {
    hudFade: 1.2,                                // the HUD fades out over the first shot
    pan: 210,                                    // the tower pans up its picture this far (480 x 540), the reverse of intro still 5
    eye: { blue: [3.1, 3.5], blink: [4, 4.22], red: 4.8 },   // dark a beat and a half longer (owner, Oct 16)
    escape: { aim: [.15, 3.1], shake: .4, cables: [.6, .8, 1, 1.2], tear: 1.3, gone: 2.1, rise: 90 },
    speck: [.3, 1.7], line: 1.8,                 // the reaction: p(Loom) falls far off behind him, then his line
    card: { fade: .8, at: 1.1, beat: .55, first: '... TO BE CONTINUED...', last: 'MAYBE.' }
  };
  const BLUE_HI = '#c8f4ff';
  // Skip (owner, Oct 17): only once the ending has been watched to the end on this device; a press shows SKIP for
  // SKIP.hint seconds and a second press while it shows goes straight to the clear card.
  const SKIP = { key: 'unruggabull-ii-ending-seen', hint: 2 };
  const seen = () => { try { return localStorage.getItem(SKIP.key) === '1'; } catch (e) { return false; } };
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
    S = { i: 0, t: 0, fired: new Set(), firstT, lastT, lastAt: E.card.at + firstT.total + E.card.beat, hint: -1, skipped: false };
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
    if (S.hint >= 0 && (S.hint += dt) > SKIP.hint) S.hint = -1;
    while (S.i < SHOTS.length && S.t >= SHOTS[S.i].dur) { S.t -= SHOTS[S.i].dur; S.i++; if (S.i < SHOTS.length) { core.emit('ending_shot', { shot: SHOTS[S.i].id }); cues(); } }
    if (S.i >= SHOTS.length) { try { localStorage.setItem(SKIP.key, '1'); } catch (e) {} }   // watched to the end
    if (S.i < SHOTS.length) cues();
    // in the escape he raises the blaster by reflex when the eye goes red, and lowers it once it's gone
    const sh = shot();
    if (sh && sh.id === 'escape') roof.bull().aimT = S.t >= E.escape.aim[0] && S.t < E.escape.aim[1] ? .15 : 0;
  }
  // a tap or a key in the ending: nothing until it's been seen; then SKIP, and a second press while that shows skips
  function press() {
    if (!S || S.i >= SHOTS.length || !seen()) return false;
    if (S.hint < 0) { S.hint = 0; live('Press again to skip.'); return true; }
    S.i = SHOTS.length; S.t = 0; S.skipped = true; S.hint = -1;
    roof.bull().aimT = 0; Snd.hush();
    core.emit('ending_skip', {}); live('Skipped.');
    return true;
  }
  // SKIP, bottom right, while a press can skip (game units, over the picture or the roof)
  function drawSkip(g) {
    if (!S || S.hint < 0 || S.i >= SHOTS.length) return;
    const a = Math.min(1, (SKIP.hint - S.hint) / .3), x = W - 33, y = H - 15;
    alpha(g, a, () => {
      hr(g, x, y, 29, 11, '#140806'); hr(g, x, y, 29, .5, '#ff7a2a'); hr(g, x, y + 10.5, 29, .5, '#ff7a2a'); hr(g, x, y, .5, 11, '#ff7a2a'); hr(g, x + 28.5, y, .5, 11, '#ff7a2a');
      txt(g, 'SKIP', x + 3, y + 3, '#ffd060', 1);
      poly(g, '#ffd060', [[x + 21, y + 3], [x + 21, y + 8], [x + 24, y + 5.5]]); poly(g, '#ffd060', [[x + 24, y + 3], [x + 24, y + 8], [x + 27, y + 5.5]]);
    });
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
  // The eye, where the roof would draw it, with the glows. Returns true when the ending drew it (or it's gone: the
  // empty socket is the loom's, roof-art.js, from escape() below).
  function drawEye(g, x, y) {
    const s = shot(); if (!done() && (!s || s.id !== 'escape')) return false;
    const C = E.escape, t = done() ? C.gone : S.t;
    if (t >= C.tear) return true;
    const j = jitter(t);
    alpha(g, .35 + .15 * Math.sin(t * 30), () => disc(g, x + j, y, 12, '#c42010'));
    redEye(g, x + j, y, t);
    return true;
  }
  // the escape, for the loom's drawing: the shuttle thrashing with the eye, and whether the eye has gone
  function escape() {
    const s = shot(); if (!done() && (!s || s.id !== 'escape')) return null;
    const t = done() ? E.escape.gone : S.t;
    return { jitter: jitter(t), gone: t >= E.escape.tear };
  }
  // it thrashes in its shuttle from E.escape.shake until it tears out
  const jitter = t => { const C = E.escape; return t > C.shake && t < C.tear ? Math.round(Math.sin(t * 40) * 3 * span(t, C.shake, C.shake + .3) * 2) / 2 : 0; };
  // p(Loom)'s eye gone red: Loomy's eye (roof-art.js) with the red iris, its cracks glowing, darting about
  function redEye(g, x, y, t) {
    roof.art().bigEye(g, x, y, 9, .5, { iris: 'fire', gx: Math.sin(t * 13) * .6, gy: Math.sin(t * 9) * .4, cracks: .9, crackGlow: true, heat: .2, pupil: .55, t });
  }
  // the cables tearing, the burst and the eye leaving: lit (the cables) and glow (the eye, sparks, the flash)
  function drawRoof(g, layer, x0, y0, LM) {
    const s = shot(); if (!s || s.id !== 'escape') return;
    const C = E.escape, t = S.t, gone = t >= C.tear, j = jitter(t);
    if (layer === 'lit') {
      const ends = [[LM.left + LM.frame, y0 - 7], [LM.right - LM.frame, y0 - 7], [x0 - 6, LM.beam], [x0 + 6, LM.beam]];
      // the eye's cables, from its socket to the posts and the warp beam: taut and black, each snapping in turn
      ends.forEach(([cx, cy], i) => {
        const sx = x0 + j + (i % 2 ? 10 : -10), sy = y0 - 3, at = C.cables[i];
        if (t < at) { ln(g, sx, sy, cx, cy, '#1a1824', 1); ln(g, sx, sy - .5, cx, cy - .5, '#5e5e6c'); return; }
        const w = Math.sin((t - at) * 14) * 3 * Math.exp(-(t - at) * 3);
        ln(g, cx, cy, cx + (sx - cx) * .3, cy + 8 + w, '#3b3a48', 1); ln(g, cx + (sx - cx) * .3, cy + 8 + w, cx + (sx - cx) * .3 + .5, cy + 9.5 + w, '#ff6e4a');
        if (!gone) ln(g, sx, sy, sx - (sx - cx) * .15 + w, sy + 7, '#3b3a48', 1);
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
      // it takes its iron ring with it
      disc(g, ex, ey, 11, '#3b3a48'); disc(g, ex, ey, 10, '#24222f'); redEye(g, ex, ey, t);
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
    else if (s.id === 'eye') { lit((L, G) => drawEyeShot(L, G, t), .95, eyeLights(t)); FLAT.present(g, shakeX(t), 0); }
    else if (s.id === 'reaction') { lit((L, G) => drawReaction(L, G, t), .9, [{ x: 120, y: 175, r: .55, g: .38, b: .22 }]); FLAT.present(g, 0, 0); g.setTransform(PIC, 0, 0, PIC, 0, 0); caption(g); }
    else drawCard(g, t);
    g.restore();
    return true;
  }
  // Little touches on the picture's loom (the wreck on the pavilion, LOOM: where its parts are in the picture's pixels):
  // smoke curling off its top in the wind, a few loose threads swaying off its side, embers drifting up, and the sun
  // sliding once across the glass of its dead eye. Over the owner's picture, in its own pixels.
  const LOOM = { smoke: [255, 154], threads: [[196, 204, 15], [203, 207, 12], [210, 203, 17], [281, 258, 9]], eye: [262, 220, 11], embers: [[232, 168], [262, 180], [246, 196]] };
  function loomTouches(g, t, pan) {
    const R = rng(23), px = v => Math.round(v);
    g.save();
    for (let i = 0; i < 26; i++) {   // the smoke: soft grey puffs rising and leaning away from the sun
      const k = ((t * .22 + R()) % 1), x = LOOM.smoke[0] - k * 34 + Math.sin(t * 1.3 + i) * 3 * k, y = LOOM.smoke[1] - pan - k * 78;
      g.globalAlpha = .22 * Math.sin(k * Math.PI) * (.6 + R() * .4); g.fillStyle = i % 3 ? '#6a6274' : '#8a8094';
      const r = 1 + k * 4; g.fillRect(px(x - r), px(y - r * .6), px(r * 2), px(r * 1.2));
    }
    g.globalAlpha = 1;
    for (const [x, y, len] of LOOM.threads) {   // loose threads, swaying in the wind
      g.fillStyle = '#d8c8a8';
      for (let d = 0; d < len; d++) g.fillRect(px(x + Math.sin(t * 2.1 + x) * d * .12 - d * .05), px(y - pan + d), 1, 1);
    }
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {   // embers off the wreck
      const o = LOOM.embers[i % 3], k = (t * .35 + i / 6) % 1;
      g.globalAlpha = (1 - k) * .8; g.fillStyle = k < .4 ? '#ffd44a' : '#ff8a3a';
      g.fillRect(px(o[0] - k * 18 + Math.sin(t * 4 + i) * 2), px(o[1] - pan - k * 40), 1, 1);
    }
    // the sunrise sliding across the dead eye's glass, once, early in the shot
    const gk = span(t, 1.2, 2.4);
    if (gk > 0 && gk < 1) {
      const [ex, ey, er] = LOOM.eye, a = -2.4 + gk * 1.6;
      g.globalAlpha = Math.sin(gk * Math.PI) * .7; g.fillStyle = '#fce289';
      for (let d = -2; d <= 2; d++) g.fillRect(px(ex + Math.cos(a) * er * .75 + d * .4), px(ey - pan + Math.sin(a) * er * .75 + d), 1, 1);
    }
    g.restore();
  }
  // shot 2: the owner's picture, panned up from the roof to the sky, souls drawn over it in its own pixels
  function drawTower(g, t) {
    g.fillStyle = '#25224a'; g.fillRect(0, 0, PW, PH);
    const st = window.UnrugEndingStills && UnrugEndingStills.tower, pan = Math.round(E.pan * (1 - ease(span(t, 0, SHOTS[1].dur))));
    if (st && st.img.complete && st.img.naturalWidth) { g.drawImage(st.img, 0, pan, PW, PH, 0, 0, PW, PH); loomTouches(g, t, pan); }
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
  // The roof's close-up (roof-art.js closeUp, picture pixels) in the dawn light; its glows go on the glow layer.
  function drawEyeShot(L, G, t) {
    const red = redAt(t), lid = tri(t, E.eye.blink[0], E.eye.blink[1]);
    const blue = t < E.eye.red ? span(t, E.eye.blue[0], E.eye.blue[1]) * (1 - lid) : 0;
    roof.art().closeUp(L, t, { iris: red > 0 ? 'fire' : 'dead', cracks: 1, crackGlow: red > 0, heat: red * .5, lid, pupil: red > 0 ? .6 : 1, blue, sparks: red > 0, light: 'dawn' });
    G.save(); G.setTransform(1, 0, 0, 1, 0, 0);
    const glow = (r, c, a) => { G.globalAlpha = a; const gr = G.createRadialGradient(240, 126, 0, 240, 126, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); G.fillStyle = gr; G.fillRect(240 - r, 126 - r, 2 * r, 2 * r); };
    if (blue > 0) { glow(14, '#46aad4', blue); G.globalAlpha = blue; G.fillStyle = BLUE_HI; G.fillRect(239, 125, 3, 3); }
    if (red > 0) { glow(70, '#c42010', red * .8); glow(20, '#ffd44a', red * .5); }
    G.restore();
  }
  // shot 5: the reverse angle from the loom's end. He faces us the whole time. Far off behind him, p(Loom) falls as a
  // tiny red speck and drops out of sight beyond the roof; he never sees it. Then his line.
  const FRONT = (() => { let c = null; return () => c || (c = UnrugBull.paint(UnrugBull.VIEWS.front)); })();
  // The roof as the game draws it (roof-art.js), turned round: the sky away from the sunrise still night blue over
  // the city's towers, the low parapet, the head-house he came out of with the car's bronze doors, the water tank and
  // the mast, the wet membrane running back to him, its puddles holding the sky; the sun low behind the camera.
  // Everything but the speck, the mast's light and him stands still, so it's baked once: the sky (behind the speck),
  // the rest (in front of it) and the rest's glows.
  let REACT = null;
  function drawReaction(L, G, t) {
    if (!REACT) {
      const mk = () => { const c = A.canvas(PW, PH), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.setTransform(PIC, 0, 0, PIC, 0, 0); return [c, x]; };
      const [sky, sx] = mk(), [front, fx] = mk(), [glow, gx] = mk();
      reactionSky(sx); reactionFront(fx, gx); REACT = { sky, front, glow };
    }
    L.drawImage(REACT.sky, 0, 0, W, H);
    // p(Loom)'s eye, a tiny red speck dropping out of sight beyond the roof, far off behind him
    const sk = span(t, E.speck[0], E.speck[1]);
    if (sk > 0 && sk < 1) { const x = 66 + 20 * sk, y = 6 + 60 * sk * sk; ln(L, x - 1.2, y - 2.5, x, y, '#5c1430'); disc(L, x, y, 1, '#9c2622'); hr(L, x - .5, y - .5, 1, 1, '#ff6e4a'); disc(G, x, y, 1.2, '#c42010'); }
    L.drawImage(REACT.front, 0, 0, W, H); G.drawImage(REACT.glow, 0, 0, W, H);
    if (Math.floor(t * 1.6) % 2 === 0) { hr(L, 212, 11, 1, 1, '#ff3430'); disc(G, 212.5, 11.5, 1.5, '#9c2622'); }
    const F = FRONT(), VF = UnrugBull.VIEW_FEET;
    L.drawImage(F, 120 - VF.x, 126 - VF.y, F.width, F.height);
    if (core.hat()) { L.save(); L.translate(120 - VF.x, 126 - VF.y); UnrugHats.drawOn(L, core.hat(), 'front', UnrugBull.VIEWS.front, t); L.restore(); }   // still wearing what he won on the ride
  }
  function reactionSky(L) {
    ['#0c1020', '#141a3a', '#1e1e46', '#25224a', '#3b2d56', '#4e3458', '#613c5a'].forEach((c, i) => hr(L, 0, i * 10.5, W, 11, c));
    const R = rng(6); for (let i = 0; i < 22; i++) { const x = R() * W, y = R() * 34; hr(L, x, y, .5, .5, i % 4 ? '#5e5e7c' : '#c8c4e0'); }
    // thin cloud, its undersides catching the sunrise behind us
    for (const [x, y, w] of [[18, 22, 60], [150, 14, 70], [96, 40, 50], [190, 46, 44]]) { hr(L, x, y, w, 1.5, '#2e2048'); hr(L, x + 4, y + 1.5, w - 10, .5, '#965050'); }
  }
  function reactionFront(L, G) {
    const hz = 70;
    // the city's towers, lower than this one, a few windows still lit, a red light on two of them
    const C = rng(13);
    for (let x = -4; x < W; ) {
      const w = 6 + C() * 12, h = 8 + C() * 18, top = hz - h;
      hr(L, x, top, w, h, C() < .5 ? '#110f18' : '#1e1430'); hr(L, x, top, w, .5, '#3b2d56');
      if (C() < .4) hr(L, x + w * .3, top - 3, w * .4, 3, '#110f18');
      for (let y = top + 2; y < hz - 2; y += 2.5) for (let wx = x + 1; wx < x + w - 1; wx += 2) if (C() < .07) hr(L, wx, y, .5, .5, '#e8a028');
      if (C() < .2) { hr(L, x + w / 2, top - 1, .5, .5, '#ff3430'); disc(G, x + w / 2, top - .8, .8, '#9c2622'); }
      x += w + C() * 3;
    }
    // the parapet: its coping lit warm along the top by the sun behind us, its face dark
    hr(L, 0, hz - 3, W, 4, '#2a2836'); hr(L, 0, hz - 3.5, W, 1, '#5e5e6c'); hr(L, 0, hz - 3.5, W, .5, '#c87146');
    for (let x = 6; x < W; x += 16) hr(L, x, hz - 2.5, .5, 3, '#1e1c28');
    // the head-house: concrete, a cornice, the car's bronze doors (shut behind him) with the sunburst, the dial over them
    const hx0 = 132, hx1 = 186, ht = 30;
    hr(L, hx0, ht, hx1 - hx0, hz - ht, '#2f2d3b'); hr(L, hx0 - 2, ht - 3, hx1 - hx0 + 4, 3, '#4b4a58'); hr(L, hx0 - 2, ht - 3, hx1 - hx0 + 4, .5, '#e8a070');
    for (let y = ht + 4; y < hz; y += 5) hr(L, hx0, y, hx1 - hx0, .5, '#24222f');
    hr(L, hx0, ht, 1, hz - ht, '#5e5e6c');
    const dx0 = 146, dx1 = 172, dt = 40;
    for (const [d, c] of [[2.5, '#2a170f'], [2, '#6a4a18'], [1.5, '#c9962e'], [1, '#8a6420']]) { hr(L, dx0 - d, dt - d, dx1 - dx0 + 2 * d, d, c); hr(L, dx0 - d, dt, d, hz - dt, c); hr(L, dx1, dt, d, hz - dt, c); }
    hr(L, dx0, dt, dx1 - dx0, hz - dt, '#7a5a2e');
    const mid = (dx0 + dx1) / 2;
    for (let i = 0; i < 6; i++) { const a = .3 + i * .22; for (const sd of [-1, 1]) ln(L, mid, hz - 1, mid + sd * Math.sin(a) * 12, hz - 1 - Math.cos(a) * 28, '#8a6634'); }
    hr(L, dx0, dt, dx1 - dx0, .5, '#a07a3e'); hr(L, mid - .25, dt, .5, hz - dt, '#2a170f');
    for (const wx of [dx0 + 4.5, dx1 - 7.5]) { hr(L, wx - .5, dt + 4, 3.5, 15, '#2a170f'); hr(L, wx, dt + 4.5, 2.5, 14, '#0e0a0c'); }
    hr(L, mid - 4, dt - 7, 8, 4, '#8a6420'); oval(L, mid, dt - 5, 3, 1.6, '#c9962e'); ln(L, mid, dt - 5, mid + 1.6, dt - 6, '#2a170f');
    // the water tank on its legs, left; the mast with its red light, right
    for (const lx of [30, 40, 50]) { hr(L, lx, 40, 1, hz - 40, '#24222f'); }
    ln(L, 30, 46, 51, 58, '#24222f'); ln(L, 51, 46, 30, 58, '#24222f');
    hr(L, 26, 18, 30, 22, '#3b3a48'); hr(L, 26, 18, 2, 22, '#5e5e6c'); poly(L, '#4b4a58', [[24, 18], [58, 18], [41, 8]]); ln(L, 24, 18, 41, 8, '#e8a070');
    for (let k = 0; k < 4; k++) hr(L, 26, 21 + k * 5.5, 30, .5, '#24222f');
    hr(L, 212, 12, 1, hz - 12, '#3b3a48'); for (let y = 16; y < hz - 4; y += 6) { ln(L, 210, y, 215, y + 6, '#2a2836'); ln(L, 215, y, 210, y + 6, '#2a2836'); }
    // the roof: the wet membrane in sheets running back to the parapet, lit warm low on our side
    poly(L, '#2f2d3b', [[0, hz + 1], [W, hz + 1], [W, H], [0, H]]);
    for (let k = 0; k < 8; k++) { const y = hz + 2 + k * k * 1.05; hr(L, 0, y, W, .5, '#24222f'); }
    for (let k = -8; k <= 8; k++) ln(L, 120 + k * 12, hz + 1, 120 + k * 52, H, '#24222f');
    for (let y = 108; y < H; y += 2) alpha(L, (y - 108) / 60, () => hr(L, 0, y, W, 2, '#5a3a3a'));
    // puddles: the sky in them, a streak of the sun's colour at their near edge
    for (const [x, y, w] of [[34, 96, 22], [196, 88, 16], [208, 120, 28], [80, 112, 14]]) { oval(L, x, y, w, 2 + w * .06, '#2a2840'); oval(L, x, y - .5, w * .7, 1 + w * .03, '#3b2d56'); hr(L, x - w * .4, y + 1.5, w * .8, .5, '#c87146'); oval(G, x, y, w * .5, 1, '#1e1430'); }
    // his long shadow, away from us
    alpha(L, .6, () => poly(L, '#110f18', [[113, 126], [127, 126], [138, hz + 4], [132, hz + 4]]));
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

  return { SHOTS, E, SKIP, start, reset: () => { S = null; }, tick, done, still, shot, hudAlpha, drawEye, escape, drawRoof, eyeLight, drawStill, load, press, drawSkip, seen, skipped: () => !!S && S.skipped, at: () => S && { i: S.i, t: S.t, hint: S.hint } };
};
