// Elevator lobbies, side on, with the arena's bull (arena.js). He walks in from the left, the car comes (the dial over
// the doors counts to this floor), DING, the doors open on the operator, Please Hold, "GOING UP?", and he walks into the
// doorway himself to board. Two use it: the 48th Floor's lobby (floor48.js, with the Rugfather's portrait) and the
// 13th Floor's (elevator.js, before the quiet ride). F holds a lobby's numbers and its own touches:
//   floor, dialFrom, dingAt, walkIn, doorsT, doorU, doorway, walkOut     the beats and places
//   look ('48' marble and cream, '13' Accounting's carpet and drab), events { ding, board }, smoke (he's singed)
//   bark { u, key } a line as he passes u, wall() / wallGlows() drawn over the room (the portrait), white() a fade
var UnrugLobby = function (core, arena, F) {
  'use strict';
  const { A, Snd, rect, txt, otxt, textWidth, clamp, fxr, emit, updateFx } = core;
  const W = 480, H = 270;
  let g = core.g, R, bull, L = null;
  const dx = () => 2 * arena.X(F.doorU);

  // ---------- the beats ----------
  function start(r, b) {
    R = r; bull = b;
    arena.newRun(R, bull); R.arena.outShrink = false; bull.u = -1.05; bull.facing = 1; bull.jh = 0; bull.slash = -1; R.shots = [];
    L = { t: 0, said: false, ding: false, out: 0, smoke: 0 };
    R.banner = null; R.talk = null;
    Snd.music(null, { hard: true });
    return L;
  }
  const dialAt = t => Math.round(F.dialFrom - (F.dialFrom - F.floor) * clamp(t / F.dingAt, 0, 1));
  const doorsOpen = () => L && L.ding ? clamp((L.t - F.dingAt - .4) / F.doorsT, 0, 1) : 0;
  function say(who, text, dur) { core.talk(text, who); Object.assign(R.talk, { readout: true, speaker: who, total: dur }); }
  // One tick. Returns true the moment he has boarded (the caller takes him on to the ride).
  function step(dt) {
    L.t += dt;
    if (F.white) F.white(dt);
    if (L.t < F.walkIn) { R.arena.locked = true; bull.u = -1.05 + (L.t / F.walkIn) * .35; bull.step += dt * 8; bull.facing = 1; }
    else R.arena.locked = L.out > 0;
    if (F.bark && !L.said && bull.u > F.bark.u - .05) { L.said = true; core.bark(F.bark.key); }
    if (!L.ding && L.t >= F.dingAt) { L.ding = true; Snd.play('rideDing'); emit(F.events.ding); }
    if (L.ding && !L.doorSnd && L.t >= F.dingAt + .4) { L.doorSnd = true; Snd.play('rideDoors'); }
    if (L.ding && !L.muzak && L.t >= F.dingAt + .9) { L.muzak = true; Snd.music('pleaseHold', { slam: true }); }
    if (L.ding && !L.going && L.t >= F.dingAt + 1.6) { L.going = true; say('operator', 'GOING UP?', 1.8); }
    // a little smoke still coming off him
    if (F.smoke) { L.smoke -= dt; if (L.smoke <= 0) { L.smoke = .35; R.fx.push({ k: 'smoke', x: arena.X(bull.u) + fxr(-3, 3), y: arena.Y(bull.jh + .2), t: 0, dur: 1.2 }); } }
    const open = doorsOpen();
    if (open >= 1 && L.out <= 0 && Math.abs(bull.u - F.doorU) < F.doorway && bull.jh <= 0) { L.out = .0001; emit(F.events.board); }
    if (L.out > 0) {
      L.out = Math.min(1, L.out + dt / F.walkOut); R.arena.out = L.out; bull.u += (F.doorU - bull.u) * (1 - Math.pow(.002, dt)); bull.step += dt * 8;
      if (L.out >= 1) return true;
    }
    arena.update(dt, false);
    updateFx(dt);
    return false;
  }

  // ---------- the room ----------
  let ROOM = null;
  function paintRoom() {
    const cv = A.canvas(W, H), c = cv.getContext('2d'), P = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
    if (F.look === '13') {
      // Accounting's lobby (placeholder dressing): drab panelled walls, a grey rail, office carpet tiles
      P(0, 0, W, 240, '#c8c2a6');
      for (let x = 0; x < W; x += 4) if ((x * 7) % 13 < 2) P(x, 0, 1, 180, '#bfb99c');
      P(0, 0, W, 18, '#3a3a36'); P(0, 18, W, 3, '#8a8a7a'); P(0, 18, W, 1, '#aeae9c'); P(0, 21, W, 2, '#5a5a50');
      for (const x of [14, 120, 320, 426]) { P(x, 40, 40, 110, '#bdb79a'); P(x + 2, 42, 36, 106, '#c8c2a6'); P(x + 2, 42, 36, 1, '#d8d2b8'); }
      P(0, 176, W, 64, '#4a4a44'); P(0, 176, W, 3, '#8a8a7a'); P(0, 176, W, 1, '#aeae9c');
      for (let x = 8; x < W; x += 24) { P(x, 184, 18, 48, '#40403a'); P(x + 1, 185, 16, 1, '#5a5a52'); }
      for (let y = 240; y < H; y += 10) for (let x = 0; x < W; x += 10) P(x, y, 10, 10, ((x + y) / 10) % 2 ? '#4a5060' : '#444a58');
      P(0, 240, W, 2, '#8a8a7a');
      // a cork board where the 48th hangs its portrait (blank memos; the gag pass can fill it)
      P(148, 52, 140, 96, '#4a3420'); P(151, 55, 134, 90, '#a8743a');
      for (let i = 0; i < 60; i++) P(152 + (i * 53) % 132, 56 + (i * 29) % 88, 1, 1, i % 2 ? '#94632e' : '#b8844a');
      for (const [x, y, w, h, col] of [[160, 62, 26, 32, '#f2eee6'], [194, 70, 22, 18, '#f6e27a'], [226, 60, 30, 38, '#f2eee6'], [264, 76, 16, 16, '#9ad0e8'], [170, 104, 34, 26, '#f2eee6'], [216, 108, 22, 30, '#f6e27a'], [248, 104, 28, 22, '#f2eee6']]) {
        P(x, y, w, h, col); P(x + 1, y + 1, w - 2, 1, '#ffffff'); P(x + Math.round(w / 2) - 1, y - 1, 3, 3, '#c8302a');
        for (let ly = y + 6; ly < y + h - 3; ly += 4) P(x + 3, ly, w - 6, 1, '#c8c2ba');
      }
    } else {
      // cream panelled walls with a gold rail, dark wainscot
      P(0, 0, W, 240, '#e8dcc0');
      for (let x = 0; x < W; x += 4) if ((x * 7) % 13 < 2) P(x, 0, 1, 180, '#e2d4b4');
      P(0, 0, W, 18, '#3a2a1e'); P(0, 18, W, 3, '#c9962e'); P(0, 18, W, 1, '#ffd44a'); P(0, 21, W, 2, '#8a6420');
      for (const x of [14, 120, 320, 426]) { P(x, 40, 40, 110, '#ddd0b0'); P(x + 2, 42, 36, 106, '#e8dcc0'); P(x + 2, 42, 36, 1, '#f6eedc'); }
      P(0, 176, W, 64, '#3a2118'); P(0, 176, W, 3, '#c9962e'); P(0, 176, W, 1, '#ffd44a');
      for (let x = 8; x < W; x += 24) { P(x, 184, 18, 48, '#2e1912'); P(x + 1, 185, 16, 1, '#4a2a1c'); }
      // the marble floor: white and black squares with grey veins, polished
      for (let y = 240; y < H; y += 10) for (let x = 0; x < W; x += 10) P(x, y, 10, 10, ((x + y) / 10) % 2 ? '#f2eee6' : '#24202a');
      for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = 242 + (i * 13) % 26; P(x, y, 6, 1, i % 2 ? '#c8c2ba' : '#3a3440'); }
      P(0, 240, W, 2, '#c9962e');
    }
    // the runner rug to the doors
    P(60, 246, 360, 14, '#7a1d1a'); P(60, 246, 360, 2, '#c9962e'); P(60, 258, 360, 2, '#c9962e');
    for (let x = 70; x < 412; x += 14) P(x, 251, 4, 4, '#c9962e');
    // potted ferns
    for (const x of [44, 268]) { P(x - 9, 214, 18, 26, '#3a2a1e'); P(x - 8, 215, 16, 24, '#8a6420'); P(x - 8, 215, 16, 2, '#c9962e');
      for (let i = 0; i < 9; i++) { const a = -2.6 + i * .3; for (let r = 0; r < 22; r += 2) P(Math.round(x + Math.cos(a) * r), Math.round(214 + Math.sin(a) * r * .9), 2, 2, r > 14 ? '#3aa86a' : '#1f6a40'); } }
    // sconces
    for (const x of [100]) { P(x - 3, 70, 6, 14, '#8a6420'); P(x - 2, 70, 4, 1, '#ffd44a'); }
    // the elevator: the same bronze frame, arch and doorway as the car's (elevator.js), the call buttons beside it
    const d = dx();
    P(d - 80, 70, 160, 170, '#2a170f'); P(d - 78, 72, 156, 168, '#6a4a18'); P(d - 76, 74, 152, 166, '#c9962e'); P(d - 74, 76, 148, 164, '#8a6420');
    c.fillStyle = '#8a6420'; c.beginPath(); c.arc(d, 70, 30, Math.PI, 0); c.fill();
    c.fillStyle = '#c9962e'; c.beginPath(); c.arc(d, 70, 28, Math.PI, 0); c.fill();
    P(d + 86, 140, 10, 22, '#2a170f'); P(d + 87, 141, 8, 20, '#c9962e');
    for (const yy of [145, 154]) { P(d + 89, yy, 4, 4, '#3a2a1a'); P(d + 90, yy + 1, 2, 2, '#f2e6c8'); }
    // the floor number on a brass plate beside the doors, over the call buttons (Accounting's placeholder dressing)
    if (F.look === '13') {
      const s = String(F.floor), w = textWidth(s) * 2 + 10, x = d + 91 - Math.round(w / 2);
      P(x - 1, 109, w + 2, 22, '#5a3a12'); P(x, 110, w, 20, '#c9962e'); P(x, 110, w, 1, '#ffe68a');
      txt(c, s, x + 5, 115, '#2a1d14', 2);
    }
    return cv;
  }
  // The room, drawn at the picture's full size (the caller has scaled by half); ends by drawing him (arena.draw).
  function draw() {
    if (!ROOM) ROOM = paintRoom();
    g.drawImage(ROOM, 0, 0);
    if (F.wall) F.wall(g);
    const d = dx();
    // the dial over the doors, as in the car: the car counting to this floor on the tower dial, G to R
    const floorNo = dialAt(L.t);
    g.fillStyle = '#f2e6c8'; g.beginPath(); g.arc(d, 70, 24, Math.PI, 0); g.fill();
    const a = Math.PI + clamp(floorNo / 99, 0, 1) * Math.PI;
    for (let i = 0; i <= 10; i++) { const b = Math.PI + i / 10 * Math.PI; core.line(g, d + Math.cos(b) * 20, 70 + Math.sin(b) * 20, d + Math.cos(b) * 23, 70 + Math.sin(b) * 23, '#3a2a1a'); }
    core.line(g, d, 69, d + Math.cos(a) * 19, 69 + Math.sin(a) * 19, '#c8302a'); core.line(g, d + 1, 69, d + 1 + Math.cos(a) * 18, 69 + Math.sin(a) * 18, '#c8302a');
    core.disc(g, d, 69, 2, '#3a2a1a');
    const label = floorNo ? String(floorNo) : 'G';
    txt(g, label, Math.round(d - textWidth(label) / 2), 56, '#3a2a1a', 1);
    rect(g, d - 24, 70, 48, 3, '#6a4a18');
    // the doors, as the car's: two bronze leaves with a sunburst and a window each, opening on the car and its operator
    const open = doorsOpen(), lw = Math.round(72 * (1 - open)), here = L.t > F.dingAt - 1.2;
    rect(g, d - 72, 76, 144, 164, '#3a2118');
    if (open > 0) {
      rect(g, d - 72, 76, 144, 100, '#4a2a1c'); rect(g, d - 72, 76, 144, 3, '#6a4a18'); rect(g, d - 72, 176, 144, 64, '#5e1614'); rect(g, d - 72, 176, 144, 2, '#c9962e');
      const S2 = A.GHOST, ox = d + 30, oy = 150; g.drawImage(S2, ox, oy, S2.width * 2, S2.height * 2);
      rect(g, ox + 7, oy - 2, 22, 10, '#1a1418'); rect(g, ox + 8, oy - 1, 20, 8, '#c8302a'); rect(g, ox + 8, oy + 5, 20, 2, '#ffd44a');
      rect(g, ox + 4, oy + 30, 28, 12, '#1a1418'); rect(g, ox + 5, oy + 30, 26, 11, '#a8261e');
    }
    for (const [x, right] of [[d - 72, 0], [d + 72 - lw, 1]]) {
      if (lw <= 0) break;
      rect(g, x, 76, lw, 164, '#2a170f'); rect(g, x + 1, 77, lw - 2, 162, '#7a5a2e');
      // the sunburst, as the car's: half on each leaf from the seam, kept inside its leaf as it slides away
      const cx = right ? x : x + lw, sx = right ? 1 : -1;
      g.save(); g.beginPath(); g.rect(x + 1, 77, lw - 2, 162); g.clip();
      for (let i = 0; i < 7; i++) { const b = .25 + i * .2; core.line(g, cx, 236, cx + sx * Math.sin(b) * 60, 236 - Math.cos(b) * 140, '#8a6634'); }
      g.restore();
      rect(g, x + 1, 77, lw - 2, 2, '#a07a3e');
      if (lw > 16) {
        // the window: the shaft, dark, until the car's light comes up behind it
        const wx = x + Math.round(lw / 2) - 5;
        rect(g, wx - 1, 99, 12, 84, '#2a170f'); rect(g, wx, 100, 10, 82, here ? '#5a3a20' : '#0e0a0c');
        if (here) rect(g, wx, 100, 10, 2, '#ffcf7a');
      }
    }
    if (lw >= 72) rect(g, d - 1, 76, 2, 164, '#2a170f');   // the seam, only while they're shut
    if (L.t > F.dingAt + .4 + F.doorsT && L.out <= 0) {
      const bob = Math.round(Math.sin(R.t * 5) * 2);
      otxt(g, 'GOING UP', d, 34 + bob, '#ffd44a', 1, 'center');
    }
    g.restore(); arena.draw(); g.save(); g.scale(.5, .5);
  }
  function glows() {
    g.save(); g.scale(.5, .5);
    for (const x of [100]) { arena.glow(x, 76, 40, '#ffcf7a', .35); core.disc(g, x, 76, 3, '#fff0c0'); }
    if (F.wallGlows) F.wallGlows(g);
    g.restore();
    arena.glows();
  }
  // where the operator's bubble goes: beside him in the open doors (picture pixels)
  const talkAt = () => ({ x: dx() + 48, y: 120 });
  return { F, start, step, draw, glows, doorsOpen, dialAt, talkAt, get L() { return L; }, use(x) { g = x; } };
};
