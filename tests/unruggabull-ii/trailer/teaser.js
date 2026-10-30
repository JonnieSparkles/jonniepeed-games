// The Unruggabull II teaser's picture: a made sequence in the game's own art (the intro's stills, the title's alley and
// p(Loom)'s eye, the bull's sprites, the logo), drawn at the game's 480 x 270 and filmed 4x by film.py.
// Two cuts, each timed to its own soundtrack (film.py):
//   A  "The machine wakes": a taste of the first game's RugCo Alley drop, the tape stop, the bridge on the new game's
//      synth (bridge.js teaserWake) and the title theme.
//   C  A's music with B's best: p(Loom)'s talk, the shaking eye, the roof over his shoulder, the odds in a stop.
//   B  "Saga II": no first-game music. p(Loom) speaks in the dark, the roof fight's heavy chorus slams in, it gives his
//      odds, "LET'S GO!", and the title theme.
// UnrugTeaser.make(cut) -> { dur, draw(g, t) }. Pure in t (seeded noise), so any frame renders on its own.
var UnrugTeaser = (function () {
  'use strict';
  const A = UnrugArt, B = UnrugBull, W = 480, H = 270;
  const img = src => { const i = new Image(); i.src = src; return i; };
  const STILL1 = UnrugIntroStills.stills[0].img, STORM = UnrugIntroStills.stills[4].img, TITLE = img(UnrugTitleArt.src);
  const LOGO = A.logo();
  const paint = rows => B.paint(rows);
  const HERO = { rise: paint(B.FRONTS.rise), huff0: paint(B.FRONTS.huff0), huff1: paint(B.FRONTS.huff1), back: paint(B.VIEWS.back) };
  const RUN = [0, 1, 2, 3].map(i => paint(B.SIDES['run' + i]));
  const SIDE = { aim: paint(B.SIDES.aim), wind: paint(B.SIDES.wind), cut: paint(B.SIDES.cut) };
  const SF = B.SIDE_FEET, SM = B.SIDE_MUZZLE, FF = B.FRONT_FEET, VF = B.VIEW_FEET;
  const SP = UnrugIntroStills.sprites;
  const ready = () => Promise.all([STILL1, STORM, TITLE, SP.heap.img, SP.reach.img, UnrugPortrait.img].map(i => i.complete ? 0 : new Promise(r => { i.onload = r; })));

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const out3 = x => 1 - Math.pow(1 - clamp(x), 3);
  const lerp = (a, b, k) => a + (b - a) * k;
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  function cam(g, im, cx, cy, z, filter) {
    if (filter) g.filter = filter;
    g.drawImage(im, Math.round(W / 2 - cx * z), Math.round(H / 2 - cy * z), Math.round(im.width * z), Math.round(im.height * z));
    if (filter) g.filter = 'none';
  }
  const fill = (g, col, a) => { if (a <= 0) return; g.globalAlpha = Math.min(1, a); g.fillStyle = col; g.fillRect(0, 0, W, H); g.globalAlpha = 1; };
  function vignette(g, a = .7) {
    const v = g.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 300);
    v.addColorStop(0, 'rgba(10,6,14,0)'); v.addColorStop(1, 'rgba(10,6,14,' + a + ')');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  function sprite(g, c, x, feet, s) {            // a sprite by its feet's centre, scaled s
    const w = Math.round(c.width * s), h = Math.round(c.height * s);
    g.drawImage(c, Math.round(x - w / 2), Math.round(feet - h), w, h);
  }
  function bolt(g, x0, seed, k) {                // a lightning bolt from the top, k its brightness
    if (k <= 0) return;
    let x = x0, y = 0; const pts = [[x, y]];
    for (let i = 0; y < H * .62; i++) { x += (hash(seed + i) - .5) * 34; y += 10 + hash(seed + i * 3.1) * 16; pts.push([x, y]); }
    g.save(); g.globalAlpha = k; g.lineCap = 'square';
    for (const [w, col] of [[5, 'rgba(160,190,255,.35)'], [2, '#e8f0ff']]) {
      g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([a, b], i) => i ? g.lineTo(Math.round(a), Math.round(b)) : g.moveTo(a, b)); g.stroke();
    }
    g.restore();
  }
  function rain(g, t, a = .35) {
    g.fillStyle = 'rgba(170,190,230,' + a + ')';
    for (let i = 0; i < 90; i++) {
      const x = (hash(i) * (W + 80) + t * 140) % (W + 80) - 40, y = (hash(i + 99) * H + t * 520) % (H + 20) - 10;
      for (let k = 0; k < 6; k++) g.fillRect(Math.round(x - k * .5), Math.round(y + k), 1, 1);
    }
  }
  // p(Loom)'s eye, after the title's: an orange (or red) iris in a dark rim with a glow, a pupil and a lid.
  function eye(g, x, y, r, open, o = {}) {
    const red = !!o.red, look = o.look || [0, .3], glow = o.glow == null ? 1 : o.glow;
    if (open > 0) {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const [rr, a] of [[r * 3.4, .06], [r * 2.2, .1], [r * 1.45, .16]]) { g.globalAlpha = a * glow * open; A.disc(g, x, y, Math.round(rr), red ? '#ff2a14' : '#ff8a2a'); }
      g.restore();
    }
    A.disc(g, x, y, r + 1, '#1a0806'); A.disc(g, x, y, r, red ? '#e8261a' : '#ff7a2a');
    const ir = Math.max(2, Math.round(r * .6)), pr = Math.max(1, Math.round(r * (o.pupil || .32)));
    const lx = Math.round(clamp(look[0], -1, 1) * (r - ir)), ly = Math.round(clamp(look[1], -1, 1) * (r - ir) * .7);
    A.disc(g, x + lx, y + ly, ir, red ? '#ffb0a0' : '#ffd060'); A.disc(g, x + lx, y + ly, pr, '#140806');
    g.fillStyle = '#fff6e2'; g.fillRect(x + lx - Math.ceil(pr / 2), y + ly - pr, Math.max(1, r >> 3), Math.max(1, r >> 3));
    const lid = 1 - clamp(open);
    if (lid > 0) {
      g.save(); g.beginPath(); g.arc(x + .5, y + .5, r + 1.5, 0, 7); g.clip();
      const h = Math.round((2 * r + 3) * lid);
      g.fillStyle = '#2a0e08'; g.fillRect(x - r - 2, y - r - 1, 2 * r + 5, h);
      if (lid < 1) { g.fillStyle = red ? '#ff6e4a' : '#9a3a14'; g.fillRect(x - r - 2, y - r - 1 + h, 2 * r + 5, Math.max(1, r >> 4)); }
      g.restore();
    }
  }
  // the title's alley with the eye on the tower's roof, as a world to film with cam()
  // neon letters as title.js draws them: the game's font at 2x as tubes, each tube pixel with a bright core
  function neon(s, col, core) {
    const c = A.canvas(A.textWidth(s, 2) + 2, 12), x = c.getContext('2d');
    A.txt(x, s, 1, 1, col, 2);
    const d = x.getImageData(0, 0, c.width, c.height);
    x.fillStyle = core;
    for (let yy = 1; yy < c.height; yy += 2) for (let xx = 1; xx < c.width; xx += 2) if (d.data[(yy * c.width + xx) * 4 + 3]) x.fillRect(xx, yy, 1, 1);
    return c;
  }
  function glowDraw(g, c, x, y, a) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const [r, al] of [[3, .07], [2, .12], [1, .22]]) { g.globalAlpha = al * a; for (const [dx, dy] of [[-r, 0], [r, 0], [0, -r], [0, r]]) g.drawImage(c, x + dx, y + dy); }
    g.restore();
  }
  const SIGN_ON = neon('RUGCO EMPIRE', '#ff6a2a', '#ffd0a0'), SIGN_OFF = neon('RUGCO EMPIRE', '#3a1208', '#5a1a0c');
  // RUGS on the blue panel on the right wall (title.js: x 381, y 388, slope -.8), each column dropped by the slope
  const RUGS = (() => {
    const flat = neon('RUGS', '#7ad8ff', '#e0f8ff'), sl = -.8, rise = Math.ceil(-sl * flat.width);
    const c = A.canvas(flat.width, flat.height + rise + 1), x = c.getContext('2d');
    for (let i = 0; i < flat.width; i++) x.drawImage(flat, i, 0, 1, flat.height, i, rise + Math.round(sl * i), 1, flat.height);
    c.rise = rise; return c;
  })();
  const RUGS_OFF = (() => { const c = A.canvas(RUGS.width, RUGS.height), x = c.getContext('2d'); x.drawImage(RUGS, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#123850'; x.fillRect(0, 0, c.width, c.height); return c; })();
  const TW = A.canvas(480, 640), tw = TW.getContext('2d');
  function titleWorld(open, o, tt = 0) {
    tw.imageSmoothingEnabled = false; tw.drawImage(TITLE, 0, 0); eye(tw, 240, 187, 7, open, o);
    const sx = 177 + Math.round((126 - SIGN_ON.width) / 2), sy = 443;
    tw.drawImage(SIGN_OFF, sx, sy);
    if ((Math.floor(tt * 13) % 37) > 1) { glowDraw(tw, SIGN_ON, sx, sy, 1); tw.drawImage(SIGN_ON, sx, sy); }
    // RUGS flashes: on, off, on, with a buzz now and then
    const ph = tt % .9, on = ph < .5 || (ph > .62 && ph < .74), rx = 380, ry = 387 - RUGS.rise;
    if (on && hash(Math.floor(tt * 20)) > .06) {
      glowDraw(tw, RUGS, rx, ry, 1.2); tw.drawImage(RUGS, rx, ry);
      tw.save(); tw.globalCompositeOperation = 'lighter'; tw.globalAlpha = .12; A.disc(tw, rx + 16, ry + 14, 26, '#46aad4'); tw.restore();
    } else tw.drawImage(RUGS_OFF, rx, ry);
    return TW;
  }
  // the intro's first still, as the intro draws it: the first game's garage, the Rugfather a burning heap on the floor,
  // the alley's neon saying RUGS
  const IC = A.canvas(480, 270), ic = IC.getContext('2d');
  function garage(tt) { UnrugIntro.draw(ic, 0, tt + 3, {}); return IC; }
  // a side sprite by its feet (bull.js SIDE_FEET), a front or back one by theirs
  const side = (g, c, x, feet, s) => g.drawImage(c, Math.round(x - SF.x * s), Math.round(feet - SF.y * s), Math.round(c.width * s), Math.round(c.height * s));
  const front = (g, c, x, feet, s, f = FF) => g.drawImage(c, Math.round(x - f.x * s), Math.round(feet - f.y * s), Math.round(c.width * s), Math.round(c.height * s));
  const TINT = new Map();
  function silhouette(c, col) {
    const k = col + c.width + 'x' + c.height + (TINT.size); let m = TINT.get(c); if (!m) TINT.set(c, m = {});
    if (!m[col]) { const d = A.canvas(c.width, c.height), x = d.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, d.width, d.height); m[col] = d; }
    return m[col];
  }
  // him from the front in his ready stance, breathing (his top half rises a pixel), lit by lightning (a cold rim)
  function stance(g, x, feet, s, u, light) {
    const c = HERO.rise, waist = 34, up = Math.sin(u * 3.2) > .3 ? 1 : 0;
    const x0 = Math.round(x - FF.x * s), y0 = Math.round(feet - FF.y * s), w = Math.round(c.width * s);
    if (light > 0) { g.globalAlpha = Math.min(1, light); const r = silhouette(c, '#dfe8ff'); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) g.drawImage(r, x0 + dx * s, y0 + dy * s, w, Math.round(c.height * s)); g.globalAlpha = 1; }
    g.drawImage(c, 0, 0, c.width, waist, x0, y0 - up * s, w, Math.round(waist * s));
    g.drawImage(c, 0, waist, c.width, c.height - waist, x0, y0 + Math.round(waist * s), w, Math.round((c.height - waist) * s));
    if (up) g.drawImage(c, 0, waist, c.width, 1, x0, y0 + Math.round((waist - 1) * s), w, Math.round(s));
    if (light > 0) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .35 * Math.min(1, light); g.drawImage(silhouette(c, '#8090c0'), x0, y0 - up * s, w, Math.round(c.height * s)); g.restore(); }
  }
  // the game's caption: a dark box, orange text typed in by p(Loom)'s talk times
  function caption(g, text, u, y = 30, sc = 2, rate = 1) {
    if (u < 0) return; u *= rate;
    const times = UnrugSound.talkTimes(text, 'loom').times;
    let n = 0; while (n < text.length && times[n] <= u) n++;
    const w = A.textWidth(text, sc) + 6 * sc;
    g.fillStyle = '#1a1418'; g.fillRect(Math.round((W - w) / 2), y - 2 * sc, w, 5 * sc + 4 * sc);
    A.txt(g, text.slice(0, n), W / 2, y, '#ff9628', sc, 'center');
  }
  function floorSign(g, label, u, n0, n1) {     // the climb's floor counter: FLOOR and a number ticking up
    const k = out3(u / .5), n = typeof n1 === 'number' ? Math.round(lerp(n0, n1, k)) : n1;
    A.otxt(g, 'FLOOR', 26, 26, '#b9a9cf', 3);
    A.otxt(g, String(n), 26, 50, '#ffc53a', 9);
  }
  function speedBg(g, t, hue, seed = 0) {        // the climb: RugCo's offices streaming down past him as he goes up
    g.fillStyle = hue; g.fillRect(0, 0, W, H);
    // far: the city's lights, slow
    for (let i = 0; i < 70; i++) { const x = Math.round(hash(i * 5 + seed) * W), y = Math.round((hash(i * 11) * H + t * 120) % H); g.fillStyle = hash(i) < .5 ? '#5a3a6a' : '#8a5a3a'; g.fillRect(x, y, 1, 2); }
    // the floors: a row of office windows every 54 px, lit or dark, smeared by the speed
    const sp = 620, off = (t * sp) % 54;
    for (let r = -1; r < 6; r++) {
      const y = Math.round(r * 54 + off), fl = Math.floor((t * sp) / 54) - r;
      g.fillStyle = '#2c2040'; g.fillRect(0, y + 38, W, 8);                       // the slab
      g.fillStyle = '#3d2c55'; g.fillRect(0, y + 38, W, 1);
      for (let i = 0; i < 12; i++) {
        const x = 8 + i * 40, lit = hash(fl * 13 + i + seed) > .45;
        g.fillStyle = lit ? 'rgba(242,182,50,.38)' : 'rgba(60,40,80,.5)'; g.fillRect(x, y + 6, 28, 26);
        g.fillStyle = lit ? 'rgba(255,230,150,.25)' : 'rgba(60,40,80,.25)'; g.fillRect(x, y + 32, 28, 6);  // the smear
        g.fillStyle = 'rgba(26,20,24,.7)'; g.fillRect(x + 13, y + 6, 2, 26);
      }
    }
    // near: girders flashing past
    for (let i = 0; i < 2; i++) { const y = Math.round(((t * 1500 + i * 190) % 420) - 80); g.fillStyle = '#120d1c'; g.fillRect(0, y, W, 12); g.fillStyle = '#2a1c34'; for (let x = 6; x < W; x += 24) g.fillRect(x, y + 4, 3, 3); }
    // what he stands on: the elevator's car floor
    g.fillStyle = '#120d1c'; g.fillRect(0, 208, W, H - 208);
    g.fillStyle = '#543424'; g.fillRect(0, 208, W, 3); g.fillStyle = '#281a14'; g.fillRect(0, 211, W, 2);
    const v = g.createLinearGradient(0, 0, 0, 208); v.addColorStop(0, 'rgba(10,6,14,.55)'); v.addColorStop(.5, 'rgba(10,6,14,0)'); v.addColorStop(1, 'rgba(10,6,14,.4)'); g.fillStyle = v; g.fillRect(0, 0, W, 208);
  }
  // the blaster's shot, as the game draws it (game.js drawShot: a blue trail, a pale bolt with a white core), bigger
  function shotAt(g, x, y, len) {
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) { g.globalAlpha = .12 * (1 - i / 6); g.fillStyle = '#3aa8e0'; g.fillRect(Math.round(x - len - i * 3), y - 4, len, 8); }
    g.globalAlpha = .4; A.disc(g, x, y, 8, '#7fd4ff'); g.restore();
    g.fillStyle = '#243a6c'; g.fillRect(Math.round(x - len), y - 1, Math.round(len * .5), 3);
    g.fillStyle = '#3aa8e0'; g.fillRect(Math.round(x - len * .6), y - 2, Math.round(len * .6), 4);
    A.disc(g, x, y, 4, '#7fd4ff'); A.disc(g, x, y, 2, '#e0f8ff'); g.fillStyle = '#fff'; g.fillRect(x, y - 1, 2, 2);
  }
  function muzzleFlash(g, x, y, k) {             // k: 1 on the shot, fading to 0
    if (k <= 0) return;
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .5 * k; A.disc(g, x, y, Math.round(14 * k), '#3aa8e0'); g.restore();
    A.disc(g, x, y, Math.round(6 * k), '#e0f8ff');
    g.fillStyle = '#ffffff';
    for (const [dx, dy] of [[1, 0], [.7, -.7], [.7, .7], [0, -1], [0, 1]]) for (let r = 4; r < 4 + 14 * k; r += 2) g.fillRect(Math.round(x + dx * r), Math.round(y + dy * r), 2, 2);
  }
  function sparks(g, x, y, k, seed) {           // k: 0 at the hit, 1 when they've gone
    if (k < 0 || k >= 1) return;
    for (let i = 0; i < 12; i++) {
      const a = hash(i + seed) * 6.3, r = 6 + k * (30 + 30 * hash(i * 3 + seed)), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r + k * k * 20;
      g.fillStyle = k < .4 ? '#ffffff' : i % 2 ? '#7fd4ff' : '#ffd44a'; g.fillRect(Math.round(px), Math.round(py), 2, 2);
    }
    if (k < .25) { A.disc(g, x, y, Math.round(14 * (1 - k * 4)), '#e0f8ff'); }
  }

  // ---------- shots: (g, u, s) with u the shot's own time; s is the cut's options ----------
  const SHOT = {
    black() {},
    // the first game's garage onto RugCo Alley, punched on the drop's beats
    drop(g, u) {
      const b = u % .5, p = Math.exp(-b / .1);
      cam(g, garage(u), 240 + (hash(Math.floor(u / .5)) - .5) * 6 * p, 135, 1.02 + .05 * p);
      fill(g, '#ffd8a0', .18 * p);
    },
    // the tape stops: the picture slows, drains and sags into black, with tracking bands
    tapestop(g, u, s) {
      const k = clamp(u / s.len);
      g.save(); g.translate(0, Math.round(k * k * 50));
      cam(g, garage(s.at || 2), 240, 135, 1.02, 'grayscale(' + k + ') brightness(' + (1 - .85 * k) + ') contrast(' + (1 + k) + ')');
      g.restore();
      for (let i = 0; i < 5; i++) {
        const y = Math.round((hash(i + Math.floor(u * 30)) * H)), h = 3 + Math.round(hash(i * 5) * 8);
        g.drawImage(g.canvas, 0, y, W, h, Math.round((hash(i * 9 + u) - .5) * 40 * k), y, W, h);
      }
      fill(g, '#000', k * k);
    },
    // the machine wakes: the alley in the dark, tilting up toward the tower on the bass's heartbeat
    wake(g, u, s) {
      const k = u / s.len, beat = s.beat || .7895;
      cam(g, titleWorld(0, {}, u), 240, lerp(505, 395, ease(k)), 1);
      const p = Math.exp(-(u % beat) / .18);
      fill(g, '#06030a', .88 - .32 * ease(k) - .12 * p);
      vignette(g, .8);
    },
    // p(Loom)'s eye opens on the tower's roof
    eyeOpen(g, u, s) {
      const open = s.open ? ease((u - s.open[0]) / s.open[1]) : 1, z = lerp(s.z0 || 3.6, s.z1 || 4.4, ease(u / s.len));
      const sh = s.shake ? Math.sin(u * 61) * s.shake * Math.exp(-u * (s.hold ? .4 : 2)) : 0;
      cam(g, titleWorld(open, { red: s.red, look: [Math.sin(u * 1.7) * .4, .2], pupil: s.red ? .22 : .32 }), 240 + sh, 187, z);
      fill(g, '#06030a', s.dark == null ? .35 : s.dark);
      vignette(g, .9);
      if (s.flash) fill(g, '#fff', 1 - u / .14);
    },
    // the tower in the storm, panning up, lightning
    storm(g, u, s) {
      cam(g, STORM, 240, lerp(s.y0 || 330, s.y1 || 160, ease(u / s.len)), 1);
      const f = s.flash == null ? 0 : s.flash;
      bolt(g, 120 + hash(f) * 240, 17 + f, 1 - (u - f) / .25);
      fill(g, '#fff', .5 * (1 - (u - f) / .12) * (u >= f ? 1 : 0));
      rain(g, u + 5);
    },
    // the Unrugged rising past the tower: little ghost rugs with halos, streaking up
    souls(g, u, s) {
      cam(g, STORM, 240, lerp(420, 300, u / s.len), 1, 'brightness(.55)');
      for (let i = 0; i < 16; i++) {
        const x = 40 + hash(i * 13) * 400, sp = 260 + hash(i) * 200, y = H + 30 - ((u * sp + hash(i * 7) * 300) % (H + 80));
        const sc = 1 + (i % 3 === 0);
        g.globalAlpha = .25; g.drawImage(A.GHOST, Math.round(x), Math.round(y + 10 * sc), A.GHOST.width * sc, A.GHOST.height * sc);
        g.globalAlpha = 1; g.drawImage(A.GHOST, Math.round(x + Math.sin(u * 6 + i) * 3), Math.round(y), A.GHOST.width * sc, A.GHOST.height * sc);
      }
    },
    // him, in the alley: front on, huffing, backlit by the storm
    hero(g, u, s) {
      const z = lerp(s.z0 || 1, s.z1 || 1.1, ease(u / s.len));
      const strikes = s.strikes || [0, .9], last = strikes.filter(f => f <= u).pop(), fl = last == null ? 0 : Math.exp(-(u - last) / .18) * (hash(Math.floor(u * 40)) > .3 ? 1 : .5);
      cam(g, titleWorld(1, {}, u), 240, 470, z, 'brightness(' + (.5 + .45 * fl) + ')');
      if (last != null) bolt(g, 90 + hash(last * 7) * 300, 11 + last * 5, 1 - (u - last) / .22);
      rain(g, u, .3);
      stance(g, 240, 262 + (z - 1) * 120, (s.sc || 3) * z, u, fl * 1.4);
      vignette(g, .75);
      if (!s.noFlash) fill(g, '#fff', 1 - u / .1);
    },
    // running through the alley toward the tower
    run(g, u, s) {
      const k = u / s.len;
      cam(g, titleWorld(1, {}, u), lerp(150, 330, k), 470, 1.25, 'brightness(.55)');
      rain(g, u, .3);
      side(g, RUN[Math.floor(u / .09) % 4], lerp(120, 330, k), 255, 3);
      vignette(g, .7);
    },
    // the climb: FLOOR 13 with the blaster, carpshits coming in and popping
    shoot(g, u, s) {
      speedBg(g, u, '#1d1530');
      const sc = 3, fx = 150, feet = 208, SPEED = 1100, n = s.hits || 4, CW = A.CARPF[0].width;
      const hits = Array.from({ length: n }, (_, i) => .22 + i * (s.len - .45) / (n - 1));
      let recoil = 0, flash = 0;
      const mx = fx + SM.x * sc, my = Math.round(feet + SM.y * sc);
      for (let i = 0; i < n; i++) {
        const hx = 350 + (i % 2) * 50 - CW, fire = hits[i] - (hx - mx) / SPEED, a = u - fire;
        if (a >= 0 && a < .09) { recoil = Math.max(recoil, 1 - a / .09); flash = Math.max(flash, 1 - a / .07); }
      }
      // the carpshits fly in at the muzzle's height, each met by a bolt
      for (let i = 0; i < n; i++) {
        const cx = 350 + (i % 2) * 50, hx = cx - CW, h = hits[i], fire = h - (hx - mx) / SPEED, c = A.CARPF[Math.floor(u / .1) % 2];
        const cy = my - c.height - (i % 2 ? 6 : -2), x = u < h ? cx + (h - u) * 260 : cx, du = u - h;
        if (u < h && x < W + 10) g.drawImage(c, Math.round(x - c.width), Math.round(cy + Math.sin(u * 9 + i) * 3), c.width * 2, c.height * 2);
        if (u >= fire && u < h) shotAt(g, Math.round(mx + 6 + (u - fire) * SPEED), my, Math.min(70, (u - fire) * SPEED));
        if (du >= 0 && du < .45) {
          const k = du / .45, ch = A.CARP_HIT; g.globalAlpha = 1 - k;
          g.save(); g.translate(Math.round(cx + k * 90), Math.round(cy + c.height - k * 50 + k * k * 120)); g.rotate(k * 5); g.drawImage(ch, -ch.width, -ch.height, ch.width * 2, ch.height * 2); g.restore(); g.globalAlpha = 1;
          sparks(g, hx, my, du / .3, i * 17);
        }
      }
      side(g, SIDE.aim, fx - Math.round(recoil * 2) * sc / 3 * 2, feet, sc);
      muzzleFlash(g, mx - recoil * 2 + 4, my, flash);
      floorSign(g, 'FLOOR', u, s.n0, s.n1);
      fill(g, '#cfeaff', .12 * flash);
    },
    // FLOOR 48 with the katana: a wind-up and a cut across two carpshits
    slash(g, u, s) {
      speedBg(g, u + 3, '#24132a', 5);
      const cutAt = s.cutAt || .35, cut = u >= cutAt;
      side(g, cut ? SIDE.cut : SIDE.wind, 170, 208, 3);
      for (let i = 0; i < 2; i++) {
        const y = 120 + i * 40, x = 280 + i * 30, du = u - cutAt;
        if (!cut) { const c = A.CARPF[Math.floor(u / .12) % 2]; g.drawImage(c, x, y, c.width * 2, c.height * 2); }
        else { const c = A.CARP_CUT, d = du * 160; g.globalAlpha = clamp(1 - du / .7); g.drawImage(c, Math.round(x + d), Math.round(y - d * .6 + du * du * 300), c.width * 2, c.height * 2); g.globalAlpha = 1; }
      }
      if (cut) {                              // the slash: a white arc that fades
        const a = clamp(1 - (u - cutAt) / .2);
        g.save(); g.globalAlpha = a;
        for (const [w, col, r] of [[12, 'rgba(127,212,255,.35)', 92], [6, '#bfefff', 92], [2, '#ffffff', 92]]) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(200, 150, r, -1.2, 1.0); g.stroke(); }
        g.restore();
        fill(g, '#fff', .35 * a);
      }
      floorSign(g, 'FLOOR', u, s.n0, s.n1);
    },
    // the roof: from behind, looking up at the tower's crown and the eye
    roof(g, u, s) {
      cam(g, titleWorld(1, { red: true, look: [0, 1], pupil: .22 }, u), 240, lerp(235, 215, ease(u / s.len)), 2, 'brightness(.8)');
      rain(g, u, .35);
      front(g, HERO.back, 240, 345, 3.5, VF);
      vignette(g, .7);
      floorSign(g, 'FLOOR', u, 0, 'R');
    },
    // p(Loom) talking in the dark: just the eye and its caption
    talk(g, u, s) {
      const open = s.open ? ease((u - s.open[0]) / s.open[1]) : 1, z = s.z || 3;
      const sh = s.shake ? Math.round(Math.sin(u * 61) * s.shake * (.6 + .4 * Math.sin(u * 7))) : 0;
      cam(g, titleWorld(open, { red: s.red, look: [0, .4], pupil: s.red ? .22 : .32 }), 240 + sh / z, 192, z, 'brightness(' + (s.bright || .35) + ')');
      eye(g, 240 - sh, Math.round(135 + (187 - 192) * z), 7 * z, open, { red: s.red, look: [0, .4], pupil: s.red ? .22 : .32, glow: .6 });
      if (s.flash != null) { const f = s.flash; bolt(g, 80, 3, 1 - (u - f) / .25); fill(g, '#fff', .45 * (u >= f ? 1 - (u - f) / .1 : 0)); }
      vignette(g, .95);
      if (s.text) caption(g, s.text, u - (s.say || 0), s.cy || 214, 2, s.rate || 1);
    },
    // a white ramp into the next cut
    white(g, u, s) { fill(g, '#fff', ease(u / s.len)); },
    // the logo slams in over the tower; the tagline, COMING SOON and the address follow on the bars
    logo(g, u, s) {
      cam(g, STORM, 240, lerp(150, 120, u / s.len), 1, 'brightness(.45) saturate(1.2)');
      const bar = s.bar;
      for (const f of [0, bar * 2, bar * 4, bar * 6]) { const d = u - f; if (d >= 0 && d < .3) { bolt(g, 60 + hash(f) * 360, f * 9, 1 - d / .3); fill(g, '#fff', .25 * (1 - d / .12)); } }
      rain(g, u, .25);
      vignette(g, .8);
      const k = clamp(u / .12), sc = k < 1 ? lerp(2.6, 1, out3(k)) : 1, sh = Math.exp(-u / .25) * 6;   // the logo is 1x, ~350 px wide
      const lw = LOGO.width * sc, lh = LOGO.height * sc;
      g.drawImage(LOGO, Math.round(W / 2 - lw / 2 + Math.sin(u * 70) * sh), Math.round(78 - lh / 2 + Math.cos(u * 53) * sh), Math.round(lw), Math.round(lh));
      fill(g, '#fff', 1 - u / .14);
      const typed = (text, at, y, col, scl) => { const n = Math.floor(clamp((u - at) / .5) * text.length); if (u >= at) A.otxt(g, text.slice(0, n), W / 2, y, col, scl, 'center'); };
      typed('SALVATION FOR THE UNRUGGED', bar, 138, '#fff1dc', 2);
      if (u >= bar * 2) { const p = Math.exp(-(u - bar * 2) / .15); A.otxt(g, 'COMING SOON', W / 2, 168 - Math.round(p * 6), '#ffc53a', 4, 'center'); fill(g, '#fff', .3 * p); }
      typed('JONNIEPEED.GAMES', bar * 3, 236, '#b9a9cf', 2);
      fill(g, '#000', (u - (s.len - 1.2)) / 1.2);
    }
  };

  // ---------- the two cuts ----------
  const BAR152 = 60 / 152 * 4, BAR170 = 60 / 170 * 4;
  function cutA() {
    const w0 = 2.85, th = w0 + 4 * BAR152, b = BAR152, h = b / 2, q = b / 4, end = th + 10 * b;
    return { dur: end, shots: [
      [0, 'drop'], [2.0, 'tapestop', { len: .55 }], [2.55, 'black'],
      [w0, 'wake', { len: 2 * b }],
      [w0 + 2 * b, 'eyeOpen', { len: b, open: [.12, .7], flash: true, z0: 3.4, z1: 4.2, dark: .3 }],
      [w0 + 3 * b, 'storm', { len: q, flash: 0 }], [w0 + 3 * b + q, 'souls', { len: q }],
      [w0 + 3 * b + 2 * q, 'eyeOpen', { len: q, red: true, z0: 5, z1: 5.6, shake: 3, dark: .2 }], [w0 + 3 * b + 3 * q, 'white', { len: q }],
      [th, 'hero', { len: b, flash: 0 }],
      [th + b, 'shoot', { len: .75 * b, n0: 1, n1: 13 }],
      [th + 1.75 * b, 'slash', { len: .75 * b, n0: 13, n1: 48, cutAt: .3 }],
      [th + 2.5 * b, 'talk', { len: 1.0, red: true, z: 3, bright: .5, text: 'PROBABILITY OF YOUR SURVIVAL: 1%.', say: .05, cy: 222, rate: 2.2 }],
      [th + 2.5 * b + 1.0, 'hero', { len: 4 * b - 2.5 * b - 1.0, z0: 1.2, z1: 1.45, rise: 0, sc: 3 }],
      [th + 4 * b, 'logo', { len: end - th - 4 * b, bar: b }]
    ], sfx: [[w0 + 2 * b, 'thunder'], [th + 2.5 * b + .95, 'go'], [th + 4 * b, 'thunder']] };
  }
  function cutB() {
    const c0 = 3.0, b = BAR170, q = b / 4, cEnd = c0 + 8 * b, go = cEnd + 2.25, th = go + .95, tb = BAR152, end = th + 5.6 * tb;
    return { dur: end, shots: [
      [0, 'talk', { len: c0, open: [.75, .5], flash: .2, z: 2.6, bright: .45, text: 'HELLO, UNRUGGABULL.', say: 1.25, cy: 222 }],
      [c0, 'hero', { len: b, flash: 0 }],
      [c0 + b, 'run', { len: b }],
      [c0 + 2 * b, 'souls', { len: b }],
      [c0 + 3 * b, 'shoot', { len: b, n0: 1, n1: 13 }],
      [c0 + 4 * b, 'slash', { len: b, n0: 13, n1: 48, cutAt: .5 }],
      [c0 + 5 * b, 'storm', { len: b, flash: 0, y0: 360, y1: 150 }],
      [c0 + 6 * b, 'roof', { len: b }],
      [c0 + 7 * b, 'eyeOpen', { len: q, red: true, z0: 5, z1: 5.4, shake: 3, dark: .2, flash: true }],
      [c0 + 7 * b + q, 'hero', { len: q, rise: 0, z0: 1.3, z1: 1.35, flash: 9 }],
      [c0 + 7 * b + 2 * q, 'eyeOpen', { len: q, red: true, z0: 6, z1: 6.5, shake: 4, dark: .1, flash: true }],
      [c0 + 7 * b + 3 * q, 'white', { len: q }],
      [cEnd, 'talk', { len: go - cEnd, red: true, z: 3.2, bright: .3, text: 'PROBABILITY OF YOUR SURVIVAL: 1%.', say: .3, cy: 222 }],
      [go, 'hero', { len: th - go, z0: 1.15, z1: 1.5, rise: 0, flash: 9 }],
      [th, 'logo', { len: end - th, bar: tb }]
    ], sfx: [[0, 'thunder'], [1.25, 'say:HELLO, UNRUGGABULL.'], [c0, 'music:roofAHeavy'], [cEnd, 'stop'], [cEnd, 'thunder'],
      [cEnd + .3, 'say:PROBABILITY OF YOUR SURVIVAL: 1%.'], [go, 'go'], [th, 'music:theme'], [th, 'thunder']] };
  }

  // C: A's music with B's best (owner, Oct 30): p(Loom) says hello over the heartbeat, its eye opens shaking on the
  // crash, the floors, the roof over his shoulder; the theme stops on its fanfare's last bar for the odds, "LET'S GO!",
  // and the theme starts again under the logo.
  function cutC() {
    const w0 = 2.85, b = BAR152, q = b / 4, th = w0 + 4 * b, stop = th + 4 * b, go = stop + 1.96, tl = go + .95, end = tl + 5.5 * b;
    return { dur: end, stop, tl, shots: [
      [0, 'drop'], [2.0, 'tapestop', { len: .55 }], [2.55, 'black'],
      [w0, 'wake', { len: b * 1.15 }],
      [w0 + b, 'talk', { open: [0, .5], z: 3, bright: .4, text: 'HELLO, UNRUGGABULL.', say: .12, cy: 222 }],
      [w0 + 2 * b, 'eyeOpen', { len: b, red: true, flash: true, z0: 3.6, z1: 4.6, shake: 4, hold: true, dark: .25 }],
      [w0 + 3 * b, 'storm', { len: q, flash: 0 }], [w0 + 3 * b + q, 'souls', { len: q }],
      [w0 + 3 * b + 2 * q, 'eyeOpen', { len: q, red: true, z0: 5.2, z1: 5.8, shake: 4, hold: true, dark: .15 }], [w0 + 3 * b + 3 * q, 'white', { len: q }],
      [th, 'hero', { strikes: [0, .95] }],
      [th + b, 'shoot', { n0: 1, n1: 13 }],
      [th + 2 * b, 'slash', { n0: 13, n1: 48, cutAt: .45 }],
      [th + 3 * b, 'roof'],
      [stop, 'talk', { red: true, z: 3.2, bright: .3, shake: 3, text: 'PROBABILITY OF YOUR SURVIVAL: 1%.', say: .26, cy: 222 }],
      [go, 'hero', { z0: 1.15, z1: 1.5, strikes: [.05], noFlash: true }],
      [tl, 'logo', { bar: b }]
    ], sfx: [[w0 + b + .12, 'say:HELLO, UNRUGGABULL.'], [w0 + 2 * b, 'thunder'], [stop, 'stop'], [stop, 'thunder'],
      [stop + .26, 'say:PROBABILITY OF YOUR SURVIVAL: 1%.'], [go, 'go'], [tl, 'music:theme'], [tl, 'thunder']] };
  }

  function make(name) {
    const c = name === 'B' ? cutB() : name === 'C' ? cutC() : cutA();
    c.shots.forEach((s, i) => { s[2] = Object.assign({ len: (c.shots[i + 1] ? c.shots[i + 1][0] : c.dur) - s[0] }, s[2] || {}); });
    c.draw = (g, t) => {
      g.imageSmoothingEnabled = false; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      let s = c.shots[0]; for (const x of c.shots) if (x[0] <= t) s = x;
      SHOT[s[1]](g, t - s[0], s[2]);
    };
    return c;
  }
  return { make, ready, W, H };
})();
