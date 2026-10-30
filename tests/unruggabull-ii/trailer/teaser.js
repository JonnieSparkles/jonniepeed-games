// The Unruggabull II teaser's picture: a made sequence in the game's own art (the intro's stills, the title's alley and
// p(Loom)'s eye, the bull's sprites, the logo), drawn at the game's 480 x 270 and filmed 4x by film.py.
// Two cuts, each timed to its own soundtrack (film.py):
//   A  "The machine wakes": a taste of the first game's RugCo Alley drop, the tape stop, the bridge on the new game's
//      synth (bridge.js teaserWake) and the title theme.
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
  const ready = () => Promise.all([STILL1, STORM, TITLE].map(i => i.complete ? 0 : new Promise(r => { i.onload = r; })));

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
  const TW = A.canvas(480, 640), tw = TW.getContext('2d');
  function titleWorld(open, o) { tw.imageSmoothingEnabled = false; tw.drawImage(TITLE, 0, 0); eye(tw, 240, 187, 7, open, o); return TW; }
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
  function speedBg(g, t, hue) {                 // the climb: a dark shaft with streaks falling past
    g.fillStyle = hue; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const x = Math.round(hash(i * 7) * W), y = (hash(i * 3) * H + t * 900) % (H + 60) - 60;
      g.fillStyle = 'rgba(255,200,120,' + (.06 + .1 * hash(i)) + ')'; g.fillRect(x, Math.round(y), 1 + (i % 2), 40);
    }
    g.fillStyle = '#120d1c'; g.fillRect(0, 208, W, H - 208);
    g.fillStyle = '#2c2040'; g.fillRect(0, 208, W, 2);
  }

  // ---------- shots: (g, u, s) with u the shot's own time; s is the cut's options ----------
  const SHOT = {
    black() {},
    // the first game's garage onto RugCo Alley, punched on the drop's beats
    drop(g, u) {
      const b = u % .5, p = Math.exp(-b / .1);
      cam(g, STILL1, 240 + (hash(Math.floor(u / .5)) - .5) * 6 * p, 135, 1.02 + .05 * p);
      fill(g, '#ffd8a0', .18 * p);
    },
    // the tape stops: the picture slows, drains and sags into black, with tracking bands
    tapestop(g, u, s) {
      const k = clamp(u / s.len);
      g.save(); g.translate(0, Math.round(k * k * 50));
      cam(g, STILL1, 240, 135, 1.02, 'grayscale(' + k + ') brightness(' + (1 - .85 * k) + ') contrast(' + (1 + k) + ')');
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
      cam(g, titleWorld(0), 240, lerp(505, 395, ease(k)), 1);
      const p = Math.exp(-(u % beat) / .18);
      fill(g, '#06030a', .88 - .32 * ease(k) - .12 * p);
      vignette(g, .8);
    },
    // p(Loom)'s eye opens on the tower's roof
    eyeOpen(g, u, s) {
      const open = s.open ? ease((u - s.open[0]) / s.open[1]) : 1, z = lerp(s.z0 || 3.6, s.z1 || 4.4, ease(u / s.len));
      const sh = s.shake ? Math.sin(u * 61) * s.shake * Math.exp(-u * 2) : 0;
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
      cam(g, titleWorld(1), 240, 470, z, 'brightness(.5)');
      const f = s.flash == null ? 0 : s.flash, fl = u >= f ? Math.exp(-(u - f) / .2) : 0;
      fill(g, '#cfd8ff', .35 * fl);
      rain(g, u, .3);
      const pose = u < (s.rise || .35) ? HERO.rise : (Math.floor(u / .4) % 2 ? HERO.huff1 : HERO.huff0);
      const sc = s.sc || 3;
      sprite(g, pose, 240, 262 + (z - 1) * 120, sc * z);
      vignette(g, .75);
      fill(g, '#fff', 1 - u / .1);
    },
    // running through the alley toward the tower
    run(g, u, s) {
      const k = u / s.len;
      cam(g, titleWorld(1), lerp(150, 330, k), 470, 1.25, 'brightness(.55)');
      rain(g, u, .3);
      sprite(g, RUN[Math.floor(u / .09) % 4], lerp(120, 330, k), 255, 3);
      vignette(g, .7);
    },
    // the climb: FLOOR 13 with the blaster, carpshits coming in and popping
    shoot(g, u, s) {
      speedBg(g, u, '#1d1530');
      floorSign(g, 'FLOOR', u, s.n0, s.n1);
      sprite(g, SIDE.aim, 150, 208, 3);
      for (let i = 0; i < 4; i++) {           // carpets fly in from the right, each popped by a bolt
        const t0 = i * s.len / 4, du = u - t0; if (du < 0) continue;
        const y = 130 + (i % 2) * 34, x = lerp(470, 300, clamp(du / .25));
        if (du < .25) {
          g.fillStyle = '#ffd44a'; const bx = lerp(200, x, clamp(du / .25)); g.fillRect(Math.round(bx), 150, 18, 3);
          const c = A.CARPF[Math.floor(u / .12) % 2]; g.drawImage(c, Math.round(x), y, c.width * 2, c.height * 2);
        } else if (du < .5) {
          g.globalAlpha = 1 - (du - .25) / .25; const c = A.CARP_HIT; g.drawImage(c, Math.round(x + (du - .25) * 120), Math.round(y - (du - .25) * 60), c.width * 2, c.height * 2); g.globalAlpha = 1;
          A.disc(g, Math.round(x + 10), y + 10, Math.round(12 * (1 - (du - .25) / .25)), '#fff1dc');
        }
      }
    },
    // FLOOR 48 with the katana: a wind-up and a cut across two carpshits
    slash(g, u, s) {
      speedBg(g, u + 3, '#24132a');
      floorSign(g, 'FLOOR', u, s.n0, s.n1);
      const cutAt = s.cutAt || .35, cut = u >= cutAt;
      sprite(g, cut ? SIDE.cut : SIDE.wind, 190, 208, 3);
      for (let i = 0; i < 2; i++) {
        const y = 120 + i * 40, x = 280 + i * 30, du = u - cutAt;
        if (!cut) { const c = A.CARPF[Math.floor(u / .12) % 2]; g.drawImage(c, x, y, c.width * 2, c.height * 2); }
        else { const c = A.CARP_CUT, d = du * 160; g.globalAlpha = clamp(1 - du / .7); g.drawImage(c, Math.round(x + d), Math.round(y - d * .6 + du * du * 300), c.width * 2, c.height * 2); g.globalAlpha = 1; }
      }
      if (cut) {                              // the slash: a white arc that fades
        const a = clamp(1 - (u - cutAt) / .2);
        g.save(); g.globalAlpha = a; g.strokeStyle = '#fff6e2'; g.lineWidth = 4; g.beginPath(); g.arc(200, 150, 90, -1.1, .9); g.stroke(); g.restore();
        fill(g, '#fff', .4 * a);
      }
    },
    // the roof: from behind, looking up at the tower's crown and the eye
    roof(g, u, s) {
      cam(g, titleWorld(1, { red: true, look: [0, 1], pupil: .22 }), 240, lerp(235, 215, ease(u / s.len)), 2, 'brightness(.8)');
      rain(g, u, .35);
      sprite(g, HERO.back, 240, 345, 3.5);
      vignette(g, .7);
      floorSign(g, 'FLOOR', u, 0, 'R');
    },
    // p(Loom) talking in the dark: just the eye and its caption
    talk(g, u, s) {
      const open = s.open ? ease((u - s.open[0]) / s.open[1]) : 1;
      cam(g, titleWorld(open, { red: s.red, look: [0, .4], pupil: s.red ? .22 : .32 }), 240, 192, s.z || 3, 'brightness(' + (s.bright || .35) + ')');
      eye(g, 240 + Math.round((240 - 240) * (s.z || 3)), Math.round(135 + (187 - 192) * (s.z || 3)), 7 * (s.z || 3), open, { red: s.red, look: [0, .4], pupil: s.red ? .22 : .32, glow: .6 });
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

  function make(name) {
    const c = name === 'B' ? cutB() : cutA();
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
