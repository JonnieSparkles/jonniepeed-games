// The Unruggabull II teaser's picture: a made sequence in the game's own art (the title's alley, tower and p(Loom)'s
// eye, the intro's storm, the bull's sprites, the logo), drawn at the game's 480 x 270 and filmed 4x by film.py.
// Timed to its soundtrack (film.py): the machine waking on the new game's synth (bridge.js), p(Loom)'s hello, the
// title theme's build under the climb, a stop for the odds and LET'S GO, and the theme's verse under the logo.
//   0:00  one camera move: up the dark tower on the heartbeat, p(Loom) says hello, its eye opens red on the crash,
//         then a whip back down through the rising souls onto him in the alley
//   0:06  the theme: him in the alley, the climb (1 to 99, blaster then katana), the roof over his shoulder
//   0:13  the music stops: the odds, LET'S GO
//   0:15  the logo on the theme's verse, SALVATION FOR THE UNRUGGED, COMING SOON, jonniepeed.games
// Made over several rounds with the owner (Oct 29-30): one move instead of quick cuts ("the flow is a little jumpy"),
// no first-game music in front, the logo landing on the verse rather than restarting the theme, no label on the roof.
// UnrugTeaser.make() -> { dur, stop, tl, sfx, shots, draw(g, t) }. Pure in t (seeded noise): any frame renders alone.
var UnrugTeaser = (function () {
  'use strict';
  const A = UnrugArt, B = UnrugBull, W = 480, H = 270;
  const img = src => { const i = new Image(); i.src = src; return i; };
  const STORM = UnrugIntroStills.stills[4].img, TITLE = img(UnrugTitleArt.src);
  const LOGO = A.logo();
  const paint = rows => B.paint(rows);
  const HERO = { rise: paint(B.FRONTS.rise), back: paint(B.VIEWS.back) };
  const SIDE = { aim: paint(B.SIDES.aim), wind: paint(B.SIDES.wind), cut: paint(B.SIDES.cut) };
  const SF = B.SIDE_FEET, SM = B.SIDE_MUZZLE, FF = B.FRONT_FEET, VF = B.VIEW_FEET;
  const ready = () => Promise.all([STORM, TITLE].map(i => i.complete ? 0 : new Promise(r => { i.onload = r; })));

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
  // the title's alley with the eye on the tower's roof and its signs lit, as a world to film with cam()
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
  // a side sprite by its feet (bull.js SIDE_FEET), a front or back one by theirs
  const side = (g, c, x, feet, s) => g.drawImage(c, Math.round(x - SF.x * s), Math.round(feet - SF.y * s), Math.round(c.width * s), Math.round(c.height * s));
  const front = (g, c, x, feet, s, f = FF) => g.drawImage(c, Math.round(x - f.x * s), Math.round(feet - f.y * s), Math.round(c.width * s), Math.round(c.height * s));
  const TINT = new Map();
  function silhouette(c, col) {
    let m = TINT.get(c); if (!m) TINT.set(c, m = {});
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
  // ---------- the climb ----------
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

  // a whip: the frame smeared along y by px (up is negative), as a fast camera move blurs it
  const TMP = A.canvas(W, H), tmp = TMP.getContext('2d');
  function smear(g, px) {
    if (Math.abs(px) < 1) return;
    tmp.clearRect(0, 0, W, H); tmp.drawImage(g.canvas, 0, 0);
    for (let i = 1; i <= 6; i++) { g.globalAlpha = .2; g.drawImage(TMP, 0, Math.round(px * i / 6)); }
    g.globalAlpha = 1;
  }
  // the title world filmed at (cx, cy, z), dimmed to `bright`, with p(Loom)'s eye drawn crisp over it
  function towerCam(g, cx, cy, z, bright, open, eo, tt) {
    cam(g, titleWorld(open, eo, tt), cx, cy, z, 'brightness(' + bright.toFixed(3) + ')');
    const ex = Math.round(W / 2 + (240 - cx) * z), ey = Math.round(H / 2 + (187 - cy) * z), r = Math.round(7 * z);
    if (open > 0 && ey > -3 * r && ey < H + 3 * r) eye(g, ex, ey, r, open, Object.assign({ glow: .4 + .6 * open }, eo));
  }

  // ---------- shots: (g, u, s) with u the shot's own time; s is the cut's options ----------
  const SHOT = {
    // him, in the alley: front on in his ready stance, lit by lightning; leaves on a whip up into the climb
    hero(g, u, s) {
      const z = lerp(s.z0 || 1, s.z1 || 1.1, ease(u / s.len));
      const strikes = s.strikes || [0, .9], last = strikes.filter(f => f <= u).pop(), fl = last == null ? 0 : Math.exp(-(u - last) / .18) * (hash(Math.floor(u * 40)) > .3 ? 1 : .5);
      cam(g, titleWorld(1, {}, u), 240, 470, z, 'brightness(' + (.5 + .45 * fl) + ')');
      if (last != null) bolt(g, 90 + hash(last * 7) * 300, 11 + last * 5, 1 - (u - last) / .22);
      rain(g, u, .3);
      stance(g, 240, 262 + (z - 1) * 120, (s.sc || 3) * z, u, fl * 1.4);
      vignette(g, .75);
      if (s.whipOut) smear(g, -ease((u - (s.len - s.whipOut)) / s.whipOut) * 60);
    },
    // the climb's first bar: the blaster, carpshits flying in at the muzzle's height, each met by a bolt
    shoot(g, u, s) {
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
      fill(g, '#cfeaff', .12 * flash);
    },
    // its second bar: the katana, a wind-up and a cut across two carpshits
    slash(g, u, s) {
      const cutAt = s.cutAt, cut = u >= cutAt;
      side(g, cut ? SIDE.cut : SIDE.wind, 150, 208, 3);
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
        fill(g, '#fff', .12 * a);
      }
    },
    // one camera move over the whole machine waking (owner, Oct 30: "the flow is a little jumpy"). From the alley it
    // tilts up the tower on the heartbeat to the crown, where p(Loom) says hello; on the crash it pushes into the eye
    // as it opens red and shaking; on the roll it whips back down the tower through the rising souls and lands on him.
    tower(g, u, s) {
      const b = s.bar, beat = b / 2;
      let cy, z, br, open, sh = 0, blur = 0;
      if (u < 2 * b) {                         // up the tower: the alley, then faster, then easing onto the crown
        const k = ease(u / (2 * b));
        cy = lerp(505, 187, k); z = lerp(1, 2.6, Math.pow(k, 2.2));
        br = lerp(.14, .55, k) + .12 * Math.exp(-(u % beat) / .18);
        open = clamp((u - b + .3) / .8) * .55;    // it half-opens as it speaks
        blur = (ease((u + .03) / (2 * b)) - ease(u / (2 * b))) * 318 / .03 * z / 30 * .02;
      } else if (u < 3 * b) {                  // the crash: it opens red, shaking, and the camera pushes in
        const v = u - 2 * b;
        cy = 187; z = lerp(2.6, 4.6, ease(v / b)); br = .62 + .3 * Math.exp(-v / .2);
        open = lerp(.55, 1, ease(v / .25)); sh = Math.sin(u * 61) * 4 * Math.exp(-v * .5);
      } else {                                 // the whip back down to the alley, through the souls
        const v = u - 3 * b, k = ease(v / b);
        cy = lerp(187, 470, k); z = lerp(4.6, 1, Math.pow(k, .6)); br = lerp(.62, .5, k); open = 1;
        sh = Math.sin(u * 61) * 3 * (1 - k);
        blur = (lerp(187, 470, ease((v + .03) / b)) - cy) * z * .5;
      }
      const red = u >= 2 * b;
      towerCam(g, 240 + sh / z, cy, z, br, open, { red, look: red ? [Math.sin(u * 1.7) * .4, .2] : [0, .4], pupil: red ? .22 : .32 }, u);
      if (u >= 3 * b) {                        // the Unrugged streaming up past the camera
        const v = u - 3 * b;
        for (let i = 0; i < 18; i++) {
          const x = 20 + hash(i * 13) * 440, sp = 500 + hash(i) * 400, y = H + 40 - ((v * sp + hash(i * 7) * 320) % (H + 120));
          const sc = 1 + (i % 3 === 0);
          g.globalAlpha = .3; g.drawImage(A.GHOST, Math.round(x), Math.round(y + 14 * sc), A.GHOST.width * sc, A.GHOST.height * sc);
          g.globalAlpha = 1; g.drawImage(A.GHOST, Math.round(x + Math.sin(v * 6 + i) * 3), Math.round(y), A.GHOST.width * sc, A.GHOST.height * sc);
        }
        // him, in the foreground, rising into view as the camera lands (the hero shot's framing at the end)
        const feet = 262 + (470 - cy) * z * 1.6;
        if (feet - 65 * 3 < H) stance(g, 240, feet, 3 * (1 + (z - 1) * .08), u, 0);
      }
      if (u >= 2 * b && u < 2 * b + .25) bolt(g, 70, 5, 1 - (u - 2 * b) / .25);
      if (u > b * 1.6) rain(g, u, .25);
      if (Math.abs(blur) > 1) smear(g, -blur);
      vignette(g, .85);
      fill(g, '#000', 1 - u / 1.2);             // up from black on the first heartbeats
      if (u < s.textUntil) caption(g, s.text, u - s.say, 222, 2);
    },
    // the climb as one shot: the counter runs 1 to 99 while RugCo's floors stream past; the blaster for a bar, then
    // the katana. It arrives and leaves on a whip.
    climb(g, u, s) {
      const b = s.bar;
      speedBg(g, u, '#1d1530');
      if (u < b) SHOT.shoot(g, u, { len: b });
      else SHOT.slash(g, u - b, { len: b, cutAt: .45 });
      const n = Math.max(1, Math.round(lerp(1, 99, ease(u / (s.len - .35)))));   // owner, Oct 30: up to 99
      A.otxt(g, 'FLOOR', 26, 26, '#b9a9cf', 3); A.otxt(g, String(n), 26, 50, '#ffc53a', 9);
      smear(g, 60 * (1 - ease(u / .2)) - 60 * ease((u - s.len + .2) / .2));
    },
    // the roof to the end: over his shoulder at the eye; the music stops and the camera creeps in as it gives the
    // odds, shaking; lightning on LET'S GO
    roofEnd(g, u, s) {
      const { stop, go } = s, p = ease((u - stop) / (go - stop + .6));
      const z = lerp(2, 2.7, p), cy = lerp(lerp(235, 220, ease(u / stop)), 205, p);
      const shaking = u >= stop ? 3 * (.6 + .4 * Math.sin(u * 7)) : 0, sh = Math.sin(u * 61) * shaking;
      const strikes = [stop, go], last = strikes.filter(f => f <= u).pop(), fl = last == null ? 0 : Math.exp(-(u - last) / .2) * (hash(Math.floor(u * 40)) > .3 ? 1 : .5);
      towerCam(g, 240 + sh / z, cy, z, .8 + .4 * fl, 1, { red: true, look: [0, 1], pupil: .22 }, u);
      if (last != null) bolt(g, 100 + hash(last) * 280, last * 3, 1 - (u - last) / .25);
      rain(g, u, .35);
      const sc = 3.5 * (1 + .2 * p), feet = 345 + 50 * p, x0 = Math.round(240 - VF.x * sc), y0 = Math.round(feet - VF.y * sc);
      if (fl > 0) { g.globalAlpha = Math.min(1, fl * 1.4); const r = silhouette(HERO.back, '#dfe8ff'); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1]]) g.drawImage(r, x0 + dx * 3, y0 + dy * 3, Math.round(HERO.back.width * sc), Math.round(HERO.back.height * sc)); g.globalAlpha = 1; }
      front(g, HERO.back, 240, feet, sc, VF);
      vignette(g, .7);
      // no label: p(Loom) in the shot says where he is (owner, Oct 30)
      caption(g, s.text, u - stop - s.say, 16, 2);
      smear(g, 60 * (1 - ease(u / .2)));
    },
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

  // ---------- the cut: one bar of the theme is 60 / 152 * 4 s ----------
  const BAR = 60 / 152 * 4;
  function make() {
    const b = BAR, th = 4 * b, stop = th + 4 * b, go = stop + 1.96, tl = go + .95, end = tl + 5.5 * b;
    const c = { dur: end, stop, tl, shots: [
      [0, 'tower', { bar: b, text: 'HELLO, UNRUGGABULL.', say: b + .12, textUntil: 2 * b + .4 }],
      [th, 'hero', { strikes: [0, .95], z0: 1, z1: 1.08, whipOut: .2 }],
      [th + b, 'climb', { bar: b }],
      [th + 3 * b, 'roofEnd', { stop: b, go: b + 1.96, text: 'PROBABILITY OF YOUR SURVIVAL: 1%.', say: .26 }],
      [tl, 'logo', { bar: b }]
    ], sfx: [[b + .12, 'say:HELLO, UNRUGGABULL.'], [2 * b, 'thunder'], [stop, 'thunder'],
      [stop + .26, 'say:PROBABILITY OF YOUR SURVIVAL: 1%.'], [go, 'go'], [tl, 'thunder']] };
    c.shots.forEach((s, i) => { s[2] = Object.assign({ len: (c.shots[i + 1] ? c.shots[i + 1][0] : c.dur) - s[0] }, s[2]); });
    c.draw = (g, t) => {
      g.imageSmoothingEnabled = false; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      let s = c.shots[0]; for (const x of c.shots) if (x[0] <= t) s = x;
      SHOT[s[1]](g, t - s[0], s[2]);
    };
    return c;
  }
  return { make, ready, W, H, BAR };
})();
