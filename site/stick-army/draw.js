// Stick Army's drawing: the page (paper and its pen), the stick figures and their kit, the field (planes, bombs,
// the bunker, the mats, the defenses and the flagpole), effects and labels, the HUD and the squad on the cards.
// Nothing here changes the game; it draws S. Classic script; load before game.js, which calls StickArmyDraw(world)
// once, before the other files that draw with its figures (units.js takes stick and tube), and link() once
// everything is made. Live values (state S, canvas G, line boil, this device's barrel me) come through world's
// getters, so this file never reaches into game.js's scope. The harness stubs medicHelmet and drawFlagpole in
// game.js's scope, so this file calls those two through world.
var StickArmyDraw = function (world) {
  'use strict';
  var W = world.W, H = world.H, GROUND = world.GROUND, BK = world.BK, TUR = world.TUR;
  var INK = world.INK, INK2 = world.INK2, RED = world.RED, BLUE = world.BLUE, HAT = world.HAT, GREEN = world.GREEN, PAPER = world.PAPER;
  var RED_FILL = world.RED_FILL, INK_FILL = world.INK_FILL, EMPTY = world.EMPTY;
  var HAND = world.HAND, DISPLAY = world.DISPLAY, REDUCED = world.REDUCED, HL = world.HL, TEXT = world.TEXT, TAG_HUD = world.TAG_HUD;
  var L = world.L, SP = world.SP, Ci = world.Ci, ink = world.ink, pen = world.pen, jt = world.jt, clamp = world.clamp, mulberry = world.mulberry;
  var crewMax = world.crewMax, standing = world.standing, tagsOf = world.tagsOf, gun = world.gun, sketchProgress = world.sketchProgress;
  var bgx = world.bgx, THEME = world.THEME;
  // Made after this file (the units, the sky, the squad, the Dreadnought, the icons, the flagpole, the sentry and
  // sending soldiers home): link() picks them up before anything is drawn.
  var SKY, ICONS, DREAD, FLAG, LEAVE, SENTRY, chevrons, drawSticker, drawPlate;
  function link() {
    SKY = world.SKY; ICONS = world.ICONS; DREAD = world.DREAD; FLAG = world.FLAG; LEAVE = world.LEAVE; SENTRY = world.SENTRY;
    chevrons = world.SQUAD.chevrons; drawSticker = world.drawSticker; drawPlate = world.drawPlate;
  }

  // ---------- the page ----------
  // The paper (game.js THEME), drawn once into the page's canvas on every fit.
  function drawPaper() {
    var g = bgx, P = THEME, rnd = mulberry(P.GRAIN.SEED), i, y;
    g.fillStyle = P.PAPER; g.fillRect(0, 0, W, H);
    g.fillStyle = P.GRAIN.COLOR;
    for (i = 0; i < P.GRAIN.N; i++) g.fillRect(rnd() * W, rnd() * H, 0.6 + rnd(), 0.6);
    g.strokeStyle = P.RULE; g.lineWidth = P.LINES.WIDTH; g.beginPath();
    for (y = P.LINES.TOP; y < H; y += P.LINES.GAP) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
    g.stroke();
    g.strokeStyle = P.MARGIN; g.lineWidth = P.MARGIN_LINE.WIDTH; g.beginPath(); g.moveTo(P.MARGIN_LINE.X, 0); g.lineTo(P.MARGIN_LINE.X, H); g.stroke();
    P.HOLES.Y.forEach(function (hy) {
      g.beginPath(); g.arc(P.HOLES.X, hy, P.HOLES.R, 0, Math.PI * 2); g.fillStyle = P.HOLES.FILL; g.fill();
      g.beginPath(); g.arc(P.HOLES.X, hy, P.HOLES.R, Math.PI * 0.9, Math.PI * 1.9); g.strokeStyle = P.HOLES.RIM; g.lineWidth = 1.5; g.stroke();
    });
    g.fillStyle = P.GROUND_TINT; g.fillRect(0, GROUND, W, H - GROUND);
  }

  // ---------- drawn in: the pen ----------
  // Draws fn inside box [x0, y0, x1, y1], revealed bottom-up ('up') or left to right ('right'), with the pen at the
  // edge of what's drawn so far.
  function sketched(key, box, dir, fn) { sketchReveal(sketchProgress(key), box, dir, fn); }
  function sketchReveal(p, box, dir, fn) { var S = world.S, G = world.G;
    if (p >= 1) { fn(); return; }
    if (p <= 0) return;
    var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3], px, py, wob = Math.sin(S.t * 38) * 0.5 + 0.5;
    G.save(); G.beginPath();
    if (dir === 'up') { var top = y1 - (y1 - y0) * p; G.rect(x0 - 6, top, x1 - x0 + 12, y1 - top + 6); px = x0 + (x1 - x0) * wob; py = top; }
    else { var edge = x0 + (x1 - x0) * p; G.rect(x0 - 6, y0 - 6, edge - x0 + 6, y1 - y0 + 12); px = edge; py = y0 + (y1 - y0) * wob; }
    G.clip(); fn(); G.restore();
    drawPen(px, py);
  }
  // A blue ballpoint, the same ink as your army: steel tip, blue grip, clear barrel showing the ink tube, cap and clip.
  function drawPen(x, y) { var G = world.G;
    G.save(); G.translate(x, y); G.rotate(-0.7);
    G.beginPath(); G.moveTo(0, 0); G.lineTo(4, -1.4); G.lineTo(4, 1.4); G.closePath(); G.fillStyle = '#b9bcc4'; G.fill();
    G.beginPath(); G.moveTo(4, -1.4); G.lineTo(9, -2.6); G.lineTo(9, 2.6); G.lineTo(4, 1.4); G.closePath(); G.fillStyle = BLUE; G.fill();
    G.fillStyle = PAPER; G.fillRect(9, -2.6, 16, 5.2);
    G.beginPath(); G.moveTo(9, 0); G.lineTo(25, 0); ink(BLUE, 1.3); G.stroke();
    G.fillStyle = BLUE; G.fillRect(25, -2.6, 4, 5.2);
    G.beginPath(); G.moveTo(0, 0); G.lineTo(4, -1.4); G.lineTo(9, -2.6); G.lineTo(29, -2.6); G.lineTo(29, 2.6); G.lineTo(9, 2.6); G.lineTo(4, 1.4); G.closePath(); ink(INK, 1.1); G.stroke();
    G.beginPath(); G.moveTo(27, -2.6); G.lineTo(27, -4); G.lineTo(17, -4); ink(BLUE, 1.4); G.stroke();
    G.beginPath(); G.arc(0.6, 0, 0.9, 0, Math.PI * 2); G.fillStyle = BLUE; G.fill();
    G.restore();
  }
  function drawBodyPart(q) { var G = world.G;
    pen(q.id || q.seed); G.save(); G.translate(q.x, q.y); G.rotate(q.rot);
    G.beginPath(); if (q.head) Ci(0, 0, 4.5); else L(-q.len / 2, 0, q.len / 2, 0, 0.35);
    ink(q.c || RED, 2.3); G.stroke(); G.restore();
  }

  // ---------- the stick figures and the field ----------
  function stick(x, y, p, col, w) { var G = world.G;
    G.beginPath(); G.arc(x, y, 5, 0, Math.PI * 2); G.fillStyle = PAPER; G.fill();
    ink(col, w || 2.4);
    G.beginPath();
    Ci(x, y, 5.2);
    L(x, y + 5.2, x, y + 21);
    L(x, y + 9.5, x + p[0], y + p[1]);
    L(x, y + 9.5, x + p[2], y + p[3]);
    L(x, y + 21, x + p[4], y + p[5]);
    L(x, y + 21, x + p[6], y + p[7]);
    G.stroke();
  }
  function tube(x1, y1, x2, y2) { var G = world.G;
    var a = x1 + jt(0.5), b = y1 + jt(0.5), c = x2 + jt(0.5), d = y2 + jt(0.5);
    G.beginPath(); G.moveTo(a, b); G.lineTo(c, d);
    ink(INK, 6.5); G.stroke(); ink(PAPER, 3); G.stroke();
  }
  function hat(x, y) { var G = world.G;
    G.beginPath(); G.moveTo(x - 7, y - 1); G.quadraticCurveTo(x - 7, y - 10, x, y - 10); G.quadraticCurveTo(x + 7, y - 10, x + 7, y - 1); G.closePath();
    G.fillStyle = HAT; G.fill(); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(x - 9.5, y - 1, x + 9.5, y - 1, 0.4); ink(INK, 2); G.stroke();
  }
  // A small stamped-metal dog tag with its chain hole, drawn once into a cached sprite.
  var tagSprite = null;
  function dogTag(x, y, rot, sc) { var G = world.G;
    if (!tagSprite) {
      tagSprite = document.createElement('canvas'); tagSprite.width = tagSprite.height = 64;
      var previous = G; G = world.G = tagSprite.getContext('2d'); G.setTransform(4, 0, 0, 4, 0, 0); G.translate(8, 8);
      try { drawTagShape(); } finally { G = world.G = previous; }
    }
    G.save(); G.translate(x, y); G.rotate(rot || 0); G.scale(sc || 1, sc || 1);
    G.drawImage(tagSprite, -8, -8, 16, 16);
    G.restore();
  }
  function drawTagShape() { var G = world.G;
    G.beginPath(); G.moveTo(-4, -6); G.lineTo(4, -6); G.quadraticCurveTo(6, -6, 6, -3); G.lineTo(6, 4); G.quadraticCurveTo(6, 7, 3, 7); G.lineTo(-3, 7); G.quadraticCurveTo(-6, 7, -6, 4); G.lineTo(-6, -3); G.quadraticCurveTo(-6, -6, -4, -6); G.closePath();
    G.fillStyle = '#cfd5dc'; G.fill(); G.lineWidth = 1.4; G.strokeStyle = '#56606b'; G.stroke();
    G.beginPath(); G.arc(0, -3, 1.3, 0, Math.PI * 2); G.stroke();
    G.beginPath(); G.moveTo(-3, 1); G.lineTo(3, 1); G.moveTo(-3, 4); G.lineTo(2, 4); G.lineWidth = 1; G.stroke();
  }
  function helmet(x, y) { var G = world.G;
    G.beginPath(); G.moveTo(x - 7.5, y - 1); G.quadraticCurveTo(x - 7, y - 10, x, y - 10); G.quadraticCurveTo(x + 7, y - 10, x + 7.5, y - 1); G.closePath();
    G.fillStyle = '#7d8a64'; G.fill(); ink(INK, 1.5); G.stroke();
    G.beginPath(); L(x - 10, y - 0.5, x + 10, y - 0.5, 0.4); ink(INK, 2); G.stroke();
  }
  // Medics wear a white helmet with a red cross on the front.
  function medicHelmet(x, y) { var G = world.G;
    G.beginPath(); G.moveTo(x - 7.5, y - 1); G.quadraticCurveTo(x - 7, y - 10.5, x, y - 10.5); G.quadraticCurveTo(x + 7, y - 10.5, x + 7.5, y - 1); G.closePath();
    G.fillStyle = PAPER; G.fill(); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(x - 10, y - 0.5, x + 10, y - 0.5, 0.4); ink(INK, 2); G.stroke();
    G.beginPath(); L(x - 2.8, y - 5.5, x + 2.8, y - 5.5); L(x, y - 8.3, x, y - 2.7); ink(RED, 2); G.stroke();
  }
  // Enemy armor: a grey flak vest over the chest, and a steel helmet on heavies. Both flash pale when hit.
  function vest(x, y, flash) { var G = world.G;
    G.beginPath(); SP([x - 4.5, y + 7, x + 4.5, y + 7, x + 4, y + 19, x - 4, y + 19], true, 0.3);
    G.fillStyle = flash ? PAPER : '#8a8f96'; G.fill(); ink(INK, 1.5); G.stroke();
  }
  // The Dreadnought's captain (dreadnought.js): a peaked officer's cap, dark with a red band, a gold badge and a visor.
  function captainCap(x, y, d) { var G = world.G;
    G.beginPath(); G.moveTo(x - 5.5, y - 3); G.lineTo(x - 8.5, y - 9); G.quadraticCurveTo(x, y - 12.5, x + 8.5, y - 9); G.lineTo(x + 5.5, y - 3); G.closePath();
    G.fillStyle = '#3b3f4a'; G.fill(); ink(INK, 1.4); G.stroke();
    G.beginPath(); L(x - 5.8, y - 4.6, x + 5.8, y - 4.6, 0.2); ink(RED, 2); G.stroke();
    G.beginPath(); L(x + d * 1, y - 3, x + d * 9.5, y - 1.2, 0.2); ink(INK, 2.4); G.stroke();
    G.beginPath(); G.arc(x, y - 8, 1.5, 0, Math.PI * 2); G.fillStyle = HAT; G.fill();
  }
  function steelPot(x, y) { var G = world.G;
    G.beginPath(); G.moveTo(x - 7.5, y - 1); G.quadraticCurveTo(x - 7, y - 10, x, y - 10); G.quadraticCurveTo(x + 7, y - 10, x + 7.5, y - 1); G.closePath();
    G.fillStyle = '#6b6f75'; G.fill(); ink(INK, 1.5); G.stroke();
  }
  function hammer(hx, hy, d, idle) { var G = world.G;
    var ex = hx + d * (idle ? 1 : 4), ey = hy - 9;
    G.beginPath(); L(hx, hy, ex, ey, 0.3); ink(INK, 2.2); G.stroke();
    G.beginPath(); L(ex - 4, ey - 1, ex + 4, ey + 1, 0.3); ink(INK, 4.5); G.stroke();
  }
  function chute(t) { var G = world.G;
    var x = t.x, y = t.y, s = 0.35 + 0.65 * t.open, w = 21 * s, base = y - 22, top = base - 22 * s;
    G.beginPath();
    G.moveTo(x - w + jt(0.6), base + jt(0.6));
    G.bezierCurveTo(x - w + jt(1), top + jt(1), x + w + jt(1), top + jt(1), x + w + jt(0.6), base + jt(0.6));
    G.quadraticCurveTo(x + w * 0.66, base - 5 * s, x + w / 3, base);
    G.quadraticCurveTo(x, base - 5 * s, x - w / 3, base);
    G.quadraticCurveTo(x - w * 0.66, base - 5 * s, x - w, base);
    G.closePath();
    // Campaign's downed pilot (t.pilot) comes down under one of ours: blue.
    var c = t.pilot ? BLUE : RED;
    G.fillStyle = t.pilot ? 'rgba(47,111,220,0.16)' : RED_FILL; G.fill(); ink(c, 2.2); G.stroke();
    G.beginPath(); L(x - w / 3, base, x, top + 4 * s, 0.5); L(x + w / 3, base, x, top + 4 * s, 0.5); ink(c, 1.3); G.stroke();
    G.beginPath(); L(x - w, base, x - 5, y + 2, 0.5); L(x + w, base, x + 5, y + 2, 0.5); ink(c, 1.4); G.stroke();
  }
  function drawTrooper(t) { var S = world.S, G = world.G;
    pen(t.id);
    var x = t.x, y = t.y, pose, s;
    G.save();
    if (t.rot) { G.translate(x, y + 14); G.rotate(t.rot); G.translate(-x, -(y + 14)); }
    // Sneaking in under the Dreadnought's smoke (dreadnought.js sneak): crouched, leaning into it.
    if (t.sneak && t.state === 'ground' && !t.attacking && !t.atWall) { G.translate(x, y + 33); G.rotate(t.dir * 0.5); G.translate(-x, -(y + 33)); }
    if (t.state === 'chute') { chute(t); pose = [-5, 1, 5, 1, -4, 33, 4, 33]; }
    else if (t.state === 'rope') pose = [-1, -6, 1, -9, -3, 33, 3, 32];
    else if (t.state === 'free' || t.state === 'bounce') { s = Math.sin(S.t * 22 + t.id); pose = [-11, 1 + s * 4, 11, 1 - s * 4, -7 + s * 3, 32, 7 + s * 3, 31]; }
    else if (t.attacking || t.atWall) { s = Math.max(0, Math.sin(S.t * 13 + t.id)); pose = [t.dir * (6 + 7 * s), 8, t.dir * 5, 17, -5, 33, 6, 33]; }
    else { s = Math.sin(t.walk); pose = [-s * 5, 19, s * 5, 19, s * 6, 33, -s * 6, 33]; }
    // Campaign's straw dummy (t.dummy): straw-yellow, straw at the hands and stitched X eyes, no gun.
    if (t.dummy) { stick(x, y, pose, world.STRAW); strawMan(x, y, pose); G.restore(); return; }
    // Campaign's downed pilot: blue, in a flying helmet, no gun.
    if (t.pilot) { stick(x, y, pose, BLUE); G.beginPath(); G.arc(x, y - 6, 6.5, Math.PI * 1.05, Math.PI * 1.95); ink(INK, 2.4); G.stroke(); G.restore(); return; }
    if (t.type === 'bazooka') tube(x - 10, y + 20, x + 9, y + 4);
    stick(x, y, pose, RED);
    if (t.type === 'rifle') { G.beginPath(); L(x - 7, y + 17, x + 7, y + 8, 0.4); ink(INK, 2); G.stroke(); }
    if (t.gunner && t.flash > 0) { G.beginPath(); G.arc(x + 8, y + 8, 4, 0, Math.PI * 2); G.fillStyle = 'rgba(255,214,38,0.95)'; G.fill(); }
    if (t.armor > 0) vest(x, y, S.t - t.pingT < 0.12);
    if (t.captain || t.officer) captainCap(x, y, t.state === 'ground' ? t.dir : 1);
    else if (t.type === 'engineer') hat(x, y);
    else if (t.armor > 1) steelPot(x, y);
    if (t.type === 'sniper') { drawScope(x, y, t.state === 'ground' ? t.dir : 1);
      if (t.state === 'ground' && t.shotCD < 0.8 && S.recruits.some(standing)) { G.save(); G.globalAlpha = 0.28; G.setLineDash([3, 5]); G.beginPath(); L(x + t.dir * 16, y + 11, x + t.dir * 160, y + 11); ink(RED, 1); G.stroke(); G.restore(); }
    }
    G.restore();
  }
  function strawMan(x, y, pose) { var G = world.G;
    G.beginPath();
    for (var k = 0; k < 2; k++) { var hx = x + pose[k * 2], hy = y + pose[k * 2 + 1]; L(hx, hy, hx - 3, hy + 4, 0.2); L(hx, hy, hx + 3, hy + 4, 0.2); L(hx, hy, hx, hy + 5, 0.2); }
    ink(world.STRAW, 1.6); G.stroke();
    G.beginPath(); L(x - 4, y - 2, x - 1, y + 1, 0.1); L(x - 1, y - 2, x - 4, y + 1, 0.1); L(x + 1, y - 2, x + 4, y + 1, 0.1); L(x + 4, y - 2, x + 1, y + 1, 0.1); ink(INK, 1.3); G.stroke();
  }
  // Campaign's radio operator: a pack on his back with its whip antenna.
  function radioPack(x, y, side) { var G = world.G;
    G.fillStyle = INK; G.fillRect(x - side * 7 - 3, y + 10, 6, 8);
    G.beginPath(); L(x - side * 7, y + 10, x - side * 10, y - 8, 0.2); ink(INK, 1.4); G.stroke();
    G.beginPath(); G.arc(x - side * 10, y - 9, 1.6, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
  }
  // Campaign's machine gunner: a heavy gun on a little tripod at his side, and a heat ring over him while it's hot.
  function mgTripod(x, y, ca, sa, r) { var G = world.G;
    var gx = x + 8, gy = y + 20;
    G.beginPath(); L(gx, gy, gx - 5, y + 33, 0.2); L(gx, gy, gx + 5, y + 33, 0.2); L(gx, gy, gx, y + 33, 0.2); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(gx - 4, gy, gx + 18 * ca, gy + 18 * sa, 0.2); ink(INK, 3.6); G.stroke();
    G.fillStyle = INK; G.fillRect(gx - 4, gy - 3, 7, 6);
    if (r && (r.heat > 0.15 || r.rest > 0)) { var h = r.rest > 0 ? 1 : r.heat; G.beginPath(); G.arc(x, y - 12, 5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * h); ink(h > 0.8 ? RED : HAT, 2); G.stroke(); }
  }
  // A wounded recruit lies on the ground, away from the bunker, under a pulsing red cross.
  function drawDowned(r) { var S = world.S, G = world.G;
    pen(r.id + 5000);
    var side = r.homeX < 200 ? -1 : 1;
    G.save(); G.globalAlpha = 0.8; G.translate(r.x, GROUND - 3); G.rotate(side * Math.PI / 2);
    stick(0, -30, [-4, 21, 4, 21, -5, 30, 5, 30], r.hurt > 0 && Math.floor(S.t * 18) % 2 ? RED : BLUE, 2.4);
    G.restore();
    G.save(); G.globalAlpha = 0.55 + 0.35 * Math.sin(S.t * 5);
    G.beginPath(); L(r.x - 4, GROUND - 22, r.x + 4, GROUND - 22); L(r.x, GROUND - 26, r.x, GROUND - 18); ink(RED, 2.6); G.stroke();
    G.restore();
  }
  function drawRecruit(r) { var S = world.S, G = world.G;
    if (r.down) { drawDowned(r); return; }
    pen(r.id + 5000);
    var x = r.x, y = GROUND - 33, moving = Math.abs(r.x - r.tx) > 0.8, side = r.homeX < 200 ? 1 : -1;
    var col = r.hurt > 0 && Math.floor(S.t * 18) % 2 ? RED : BLUE;
    var ca = Math.cos(r.aim), sa = Math.sin(r.aim), pose, tool = null, s;
    // Everyone not busy salutes the flag (repairing, healing and fetching carry on).
    // A soldier sent home salutes before walking off (sendOff).
    var saluting = r.leaving != null ? r.leaving < LEAVE.SALUTE : !moving && S.saluteT > 0 && r.role !== 'repair' && r.role !== 'heal' && r.role !== 'fetch';
    if (moving) { s = Math.sin(r.walk); pose = [-s * 5, 19, s * 5, 19, s * 6, 33, -s * 6, 33]; }
    else if (r.role === 'repair') {
      s = Math.sin(S.t * 12 + r.id);
      var hx = side * (8 + s * 2), hy = 7 + s * 5;
      pose = [hx, hy, side * 3, 18, -5, 33, 5, 33]; tool = { hx: x + hx, hy: y + hy, idle: false };
    } else if (saluting) { pose = [side * 10, 6, -side * 4, 20, -2, 33, 2, 33]; }
    else if (r.type === 'engineer') { pose = [7, 17, -6, 19, -5, 33, 5, 33]; tool = { hx: x + 7, hy: y + 17, idle: true }; }
    else pose = [ca * 9, 9.5 + sa * 9, ca * 15, 9.5 + sa * 15, -5, 33, 5, 33];
    // Saluting the flag (FLAG), at attention: heels together, the elbow out and the hand at the brow (the forearm drawn
    // below), the weapon upright at the other side.
    var aiming = !moving && r.role === 'shoot' && !saluting;
    if (r.type === 'bazooka') { if (aiming) tube(x - ca * 9, y + 8 - sa * 9, x + ca * 16, y + 8 + sa * 16); else tube(x - 9, y + 19, x + 8, y + 5); }
    stick(x, y, pose, col);
    if (saluting) { G.beginPath(); L(x + side * 10, y + 6, x + side * 6, y - 4, 0.2); L(x + side * 6, y - 4, x + side * 1, y - 5, 0.2); ink(col, 2.4); G.stroke(); }
    if (r.type === 'radio') radioPack(x, y, side);
    if (r.type === 'mg') mgTripod(x, y, ca, sa, r);
    if (r.type === 'rifle' || r.type === 'radio') {
      G.beginPath();
      if (aiming) L(x + ca * 4, y + 9.5 + sa * 4, x + ca * 20, y + 9.5 + sa * 20, 0.3);
      else if (saluting) L(x - side * 6, y + 4, x - side * 6, y + 28, 0.2);
      else L(x - 7, y + 17, x + 7, y + 8, 0.4);
      ink(INK, aiming ? 2.6 : 2); G.stroke();
    }
    if (tool) hammer(tool.hx, tool.hy, side, tool.idle);
    if (r.type === 'engineer') hat(x, y);
    else if (r.type === 'medic') world.medicHelmet(x, y);
    else if (S.mods.helmet > 0) helmet(x, y);
    if (r.type === 'sniper') drawScope(x, y, Math.cos(r.aim) < 0 ? -1 : 1);
    chevrons(x - 7, y + 9, r.rank || 0);
    // Crew health makes the cost of leaving a sniper alive visible.
    if (r.leaving != null) return;
    G.fillStyle = 'rgba(46,46,51,0.15)'; G.fillRect(x-6, GROUND+4, 12, 2);
    G.fillStyle = r.hp < 1 ? RED : BLUE; G.fillRect(x-6, GROUND+4, 12 * Math.max(0,r.hp) / crewMax(r), 2);
  }
  function drawScope(x, y, dir) { var G = world.G;
    G.beginPath(); SP([x - 7, y - 4, x - 3, y - 10, x + 7, y - 7, x + 6, y - 3], true, 0.3); G.fillStyle = INK; G.fill();
    G.beginPath(); L(x, y + 11, x + dir * 22, y + 11); L(x + dir * 8, y + 7, x + dir * 16, y + 7); ink(INK, 2.4); G.stroke();
  }
  var PLANE_PTS = [-38, 2, -36, -7, -24, -10, 26, -8, 36, -10, 42, -21, 50, -21, 48, 1, 20, 7, -28, 8];
  var BOMBER_PTS = [-46, 4, -44, -11, -30, -15, 30, -13, 42, -15, 50, -30, 60, -30, 58, 2, 24, 13, -34, 14];
  function drawPlane(p) { var G = world.G;
    pen(p.id);
    var sc = p.sc, bomber = p.kind === 'bomber' || p.kind === 'cargo';
    G.save();
    G.translate(p.x, p.y); G.scale(-p.dir * sc, sc); if (p.rot) G.rotate(-p.rot);
    G.beginPath(); SP(bomber ? BOMBER_PTS : PLANE_PTS, true, 0.6);
    G.fillStyle = PAPER; G.fill();
    G.fillStyle = p.hitFlash > 0 ? 'rgba(200,67,58,0.3)' : INK_FILL; G.fill();
    ink(INK, 2.4 / sc); G.stroke();
    G.beginPath();
    if (bomber) { L(-16, 4, 22, 6); } else { L(-12, 2, 14, 4); }
    ink(INK, 3 / sc); G.stroke();
    G.beginPath(); SP(bomber ? [-32, -12, -26, -20, -16, -20, -12, -13] : [-26, -9, -20, -16, -12, -16, -8, -9], false, 0.4); ink(INK, 2 / sc); G.stroke();
    G.beginPath(); G.arc(bomber ? 18 : 14, bomber ? -3 : -2, bomber ? 4.5 : 3.6, 0, Math.PI * 2); G.fillStyle = RED; G.fill();
    var pl = world.boil % 2 ? 10 : 6, nx = bomber ? -50 : -42;
    G.beginPath(); L(nx, -pl, nx, pl, 0.4); ink(INK, 2 / sc); G.stroke();
    if (bomber) {
      G.beginPath(); Ci(2, 8, 5); ink(INK, 2 / sc); G.stroke();
      G.beginPath(); L(-6, 13, 10, 13, 0.4); ink(INK, 1.6 / sc); G.stroke();
      if (p.hp < 3) { G.beginPath(); SP([30, -12, 26, -6, 31, -1], false, 0.3); if (p.hp < 2) SP([-20, -14, -16, -7, -21, -2], false, 0.3); ink(INK, 1.6 / sc); G.stroke(); }
      // Cargo planes carry a crated tank under the belly until the drop.
      if (p.kind === 'cargo' && p.tankX != null) {
        G.beginPath(); L(-8, 13, -6, 20, 0.2); L(8, 13, 6, 20, 0.2); ink(INK, 1.4 / sc); G.stroke();
        G.beginPath(); G.rect(-14, 20, 28, 13); G.fillStyle = '#e7dcc0'; G.fill(); ink(INK, 2 / sc); G.stroke();
        G.beginPath(); L(-14, 20, 14, 33, 0.2); L(14, 20, -14, 33, 0.2); ink(INK2, 1.2 / sc); G.stroke();
      }
    }
    if (p.state === 'fly') {
      G.globalAlpha = 0.5; G.beginPath();
      var tx = bomber ? 66 : 56;
      if (p.kind === 'cargo' && p.maxHp && p.hp < p.maxHp) {
        // An armored cargo plane shows its health once hit, like a tank.
        G.globalAlpha = 1; var f = Math.max(0, p.hp / p.maxHp);
        G.fillStyle = PAPER; G.fillRect(-18, -38, 36, 5); G.fillStyle = 'rgba(200,67,58,0.55)'; G.fillRect(-17, -37, 34 * f, 3);
        G.beginPath(); L(-18, -38, 18, -38, 0.2); L(-18, -33, 18, -33, 0.2); ink(INK, 1 / sc); G.stroke(); G.globalAlpha = 0.5; G.beginPath();
      }
      L(tx, -10, tx + 14, -10); L(tx + 2, -2, tx + 20, -2); L(tx, 6, tx + 10, 6);
      ink(INK2, 1.5 / sc); G.stroke(); G.globalAlpha = 1;
    }
    G.restore();
  }
  function drawBomb(m) { var G = world.G;
    pen(m.id);
    var a = Math.atan2(m.vy, m.vx) - Math.PI / 2;
    G.save(); G.translate(m.x, m.y); G.rotate(a); if (m.heavy) G.scale(1.45, 1.45);
    if (m.shell) { G.beginPath(); G.ellipse(0, 0, 3, 5, 0, 0, Math.PI * 2); G.fillStyle = INK; G.fill(); G.restore(); return; }
    G.beginPath(); G.ellipse(0, 0, 4.5, 7.5, 0, 0, Math.PI * 2); G.fillStyle = INK; G.fill();
    // An armored bomb (from a Dreadnought sortie): steel bands, and bullets pass it by.
    if (m.armored) { G.beginPath(); L(-4.5, -1, 4.5, -1, 0.1); L(-4, 3, 4, 3, 0.1); ink('#9aa0a8', 1.8); G.stroke(); }
    G.beginPath(); L(-4, -6, -6, -12, 0.3); L(4, -6, 6, -12, 0.3); L(-6, -12, 6, -12, 0.3); ink(INK, 1.8); G.stroke();
    G.restore();
  }
  function drawGround() { var G = world.G;
    pen(777);
    G.beginPath(); SP([0, 612, 70, 611, 140, 613, 210, 611.5, 280, 612.5, 350, 611, 400, 612], false, 0.4); ink(INK, 2.4); G.stroke();
    G.beginPath();
    L(14, 612, 12, 605, 0.4); L(18, 612, 21, 605, 0.4); L(102, 612, 99, 606, 0.4); L(105, 612, 107, 605, 0.4);
    L(300, 612, 298, 606, 0.4); L(303, 612, 305, 605, 0.4); L(384, 612, 381, 605, 0.4); L(388, 612, 390, 606, 0.4);
    ink(INK, 1.6); G.stroke();
  }
  function drawDefenses() { var S = world.S, G = world.G;
    pen(880);
    if (S.mods.wire) [104, 296].forEach(function (x) {
      sketched('wire', [x - 14, GROUND - 11, x + 14, GROUND + 1], 'right', function () {
        G.beginPath(); L(x-12,GROUND-5,x+12,GROUND-5); for(var j=-8;j<=8;j+=8) { L(x+j-3,GROUND-9,x+j+3,GROUND-1); L(x+j-3,GROUND-1,x+j+3,GROUND-9); } ink(INK2,1.3); G.stroke();
      });
    });
    S.mines.forEach(function (m) { if (!m.armed) return; G.beginPath(); Ci(m.x,GROUND-2,4); ink(INK,1.6); G.stroke(); G.beginPath(); L(m.x-2,GROUND-7,m.x+2,GROUND-7); ink(RED,2); G.stroke(); });
    for (var row = 0; row < S.mods.trench; row++) {
      [[98, 162], [238, 302]].forEach(function (span) {
        // Only the newest row is drawn in; older rows are already on the page.
        var draw = function () {
          for (var bx = span[0] + row * 5; bx <= span[1]; bx += 11) {
            var by = GROUND - 3 - row * 6;
            G.beginPath(); SP([bx - 6, by, bx - 4, by - 4, bx + 4, by - 4, bx + 6, by, bx + 4, by + 3, bx - 4, by + 3], true, 0.3);
            G.fillStyle = '#e7dcc0'; G.fill(); ink(INK2, 1.3); G.stroke();
          }
        };
        if (row === S.mods.trench - 1) sketched('trench', [span[0] - 7, GROUND - 10 - row * 6, span[1] + 7, GROUND + 3], 'right', draw); else draw();
      });
    }
    drawSandbags();
  }
  // Sandbags (round 14: they raised the wall's health but drew nothing): stacked against the front of the bunker, a
  // layer per stack (BAGS: each layer's bags, five, then four, three and two on top), the newest layer sketched in.
  // First tried piled against its sides, where the crew standing beside the bunker hid them.
  var BAGS = [[176, 188, 200, 212, 224], [182, 194, 206, 218], [188, 200, 212], [194, 206]];
  function drawSandbags() { var S = world.S, G = world.G;
    var n = Math.min(S.mods.stacks.sandbags || 0, BAGS.length);
    pen(886);
    for (var row = 0; row < n; row++) {
      var draw = (function (row) {
        return function () {
          var by = GROUND - 3 - row * 6;
          BAGS[row].forEach(function (bx) {
            G.beginPath(); SP([bx - 6, by, bx - 4, by - 4, bx + 4, by - 4, bx + 6, by, bx + 4, by + 3, bx - 4, by + 3], true, 0.3);
            G.fillStyle = '#ddcfa8'; G.fill(); ink(INK, 1.4); G.stroke();
            G.beginPath(); L(bx - 2, by - 2, bx + 1, by + 1, 0.15); ink(INK2, 1); G.stroke();
          });
        };
      })(row);
      if (row === n - 1) sketched('sandbags', [BK.x1 - 2, GROUND - 10 - row * 6, BK.x2 + 2, GROUND + 3], 'up', draw); else draw();
    }
  }
  function drawTramp(tr, i) { var G = world.G;
    pen(500 + i);
    var a = tr.x1, b = tr.x2, y = tr.y, mid = (a + b) / 2, sag = 3 + tr.dip;
    G.beginPath(); L(a + 6, y, a + 1, GROUND, 0.5); L(b - 6, y, b - 1, GROUND, 0.5); L(a + 16, y + 2, a + 12, GROUND, 0.5); L(b - 16, y + 2, b - 12, GROUND, 0.5);
    ink(INK, 2.2); G.stroke();
    G.beginPath(); G.moveTo(a + jt(0.5), y + jt(0.5)); G.quadraticCurveTo(mid + jt(1), y + sag * 2, b + jt(0.5), y + jt(0.5)); ink(INK, 3.4); G.stroke();
    G.beginPath(); G.rect(a - 5, y - 4, 9, 7); G.rect(b - 4, y - 4, 9, 7); G.fillStyle = BLUE; G.fill(); ink(INK, 1.6); G.stroke();
  }
  // Two barrels (co-op) each wear their player's color as a band behind the muzzle: the host blue, the guest green.
  var GUN_COLORS = [BLUE, GREEN];
  function drawBarrel(t) { var S = world.S, G = world.G;
    if (t.heavy) { drawHeavyBarrel(t); return; }
    var len = 31 - t.recoil * 6, hot = clamp((t.heat - 0.35) / 0.65, 0, 1);
    if (t.overheat > 0) hot = Math.floor(S.t * 8) % 2 ? 1 : 0.6;
    G.save(); G.translate(t.x, TUR.y); G.rotate(t.aim);
    G.fillStyle = PAPER; G.fillRect(2, -4, len - 2, 8);
    if (hot > 0) { G.globalAlpha = 0.45 * hot; G.fillStyle = RED; G.fillRect(2, -4, len - 2, 8); G.globalAlpha = 1; }
    if (S.turrets.length > 1) { G.fillStyle = GUN_COLORS[t.gun] || INK; G.fillRect(len - 11, -4, 5, 8); }
    G.beginPath(); L(2, -4, len, -4, 0.4); L(2, 4, len, 4, 0.4); L(len, -4.5, len, 4.5, 0.3); ink(hot > 0.7 ? RED : INK, 2.4); G.stroke();
    G.restore();
  }
  // Campaign's heavy gun: a short, fat barrel with a muzzle brake (two bars across the end).
  function drawHeavyBarrel(t) { var S = world.S, G = world.G;
    var len = 26 - t.recoil * 8, hot = clamp((t.heat - 0.35) / 0.65, 0, 1);
    if (t.overheat > 0) hot = Math.floor(S.t * 8) % 2 ? 1 : 0.6;
    G.save(); G.translate(t.x, TUR.y); G.rotate(t.aim);
    G.fillStyle = PAPER; G.fillRect(2, -6.5, len - 2, 13);
    if (hot > 0) { G.globalAlpha = 0.45 * hot; G.fillStyle = RED; G.fillRect(2, -6.5, len - 2, 13); G.globalAlpha = 1; }
    G.beginPath(); L(2, -6.5, len, -6.5, 0.4); L(2, 6.5, len, 6.5, 0.4); ink(hot > 0.7 ? RED : INK, 2.6); G.stroke();
    G.beginPath(); L(len - 6, -9.5, len - 6, 9.5, 0.3); L(len, -9.5, len, 9.5, 0.3); ink(hot > 0.7 ? RED : INK, 3.4); G.stroke();
    G.restore();
  }
  // A thin gauge arcing over the dome: fills left to right as the gun heats, blinks red when locked. With two barrels,
  // the guest's gauge sits outside the host's.
  function drawHeatRing(t, i) { var S = world.S, G = world.G;
    if (S.mode !== 'play' || (t.heat < 0.03 && t.overheat <= 0)) return;
    var r = 25 + i * 5, start = Math.PI * 1.08, span = Math.PI * 0.84, end = start + span * t.heat;
    G.save();
    G.setLineDash([2, 4]); G.beginPath(); G.arc(BK.x, BK.top, r, start, start + span); ink('rgba(46,46,51,0.25)', 1.5); G.stroke(); G.setLineDash([]);
    var col = t.overheat > 0 ? (Math.floor(S.t * 8) % 2 ? RED : INK) : t.heat > 0.7 ? RED : INK;
    G.beginPath(); G.arc(BK.x, BK.top, r, start, end); ink(col, 3); G.stroke();
    G.restore();
  }
  function drawSentry() { var S = world.S, G = world.G;
    if (!S.mods.auto) return;
    pen(9050);
    var x = SENTRY.x, y = SENTRY.y, top = y + 6;
    // Splayed lattice legs on the ground beside the bunker, out of reach of the main barrel.
    G.beginPath(); L(x - 8, GROUND, x - 4, top, 0.4); L(x + 8, GROUND, x + 4, top, 0.4);
    for (var k = 0; k < 3; k++) { var y1 = GROUND - 4 - k * 26, y2 = y1 - 24, w1 = 7.5 - k * 1.3, w2 = 6.2 - k * 1.3; L(x - w1, y1, x + w2, y2, 0.3); L(x + w1, y1, x - w2, y2, 0.3); }
    ink(INK, 1.8); G.stroke();
    G.beginPath(); L(x - 10, top, x + 10, top, 0.3); ink(INK, 2.8); G.stroke();
    G.save(); G.translate(x, y); G.rotate(S.autoAim);
    G.fillStyle = PAPER; G.fillRect(0, -2.5, 14, 5);
    G.beginPath(); L(0, -2.5, 14, -2.5, 0.2); L(0, 2.5, 14, 2.5, 0.2); L(14, -3, 14, 3, 0.2); ink(INK, 2); G.stroke();
    G.restore();
    G.beginPath(); G.moveTo(x - 7, y + 5); G.arc(x, y + 5, 7, Math.PI, 0); G.closePath(); G.fillStyle = BLUE; G.fill(); ink(INK, 2); G.stroke();
  }
  function drawBunker() { var S = world.S, G = world.G;
    pen(9001);
    var i, dipping = function (t) { return t.aim > -0.05 || t.aim < -Math.PI + 0.05; };
    // Tipped down, a barrel leans out over the wall, so it draws in front of the bunker.
    S.turrets.forEach(function (t) { if (!dipping(t)) drawBarrel(t); });
    var dome = [];
    for (i = 0; i <= 10; i++) { var an = Math.PI + (i / 10) * Math.PI; dome.push(BK.x + Math.cos(an) * 19, BK.top + Math.sin(an) * 19); }
    G.beginPath(); G.moveTo(BK.x - 19, BK.top); G.arc(BK.x, BK.top, 19, Math.PI, 0); G.closePath(); G.fillStyle = PAPER; G.fill();
    G.beginPath(); SP(dome, false, 0.5); ink(INK, 2.6); G.stroke();
    G.beginPath(); L(BK.x - 8, BK.top - 6, BK.x + 8, BK.top - 6, 0.4); ink(INK, 1.4); G.stroke();
    var body = [168, 612, 168, 583, 175, 576, 225, 576, 232, 583, 232, 612];
    G.beginPath(); G.moveTo(body[0], body[1]);
    for (i = 2; i < body.length; i += 2) G.lineTo(body[i], body[i + 1]);
    G.closePath(); G.fillStyle = PAPER; G.fill(); G.fillStyle = INK_FILL; G.fill();
    G.beginPath(); for (i = 0; i < body.length - 2; i += 2) L(body[i], body[i + 1], body[i + 2], body[i + 3], 0.6); ink(INK, 2.6); G.stroke();
    G.beginPath();
    L(169, 590, 231, 590, 0.4); L(169, 601, 231, 601, 0.4); L(186, 577, 186, 590, 0.4); L(212, 577, 212, 590, 0.4);
    L(176, 590, 176, 601, 0.4); L(198, 590, 198, 601, 0.4); L(220, 590, 220, 601, 0.4); L(187, 601, 187, 611, 0.4); L(209, 601, 209, 611, 0.4);
    ink('rgba(46,46,51,0.32)', 1.5); G.stroke();
    var hp = S.wallHP / S.mods.maxHP * 100;
    G.beginPath();
    if (hp < 80) SP([173, 584, 179, 591, 175, 597, 181, 605], false, 0.3);
    if (hp < 55) SP([227, 580, 221, 588, 227, 596, 222, 604], false, 0.3);
    if (hp < 15) SP([193, 578, 197, 586, 192, 593, 199, 600, 195, 610], false, 0.3);
    ink(INK, 1.8); G.stroke();
    if (hp < 30) {
      var ch = [210, 575, 226, 575, 233, 583, 233, 595, 226, 590, 219, 586, 214, 581];
      G.beginPath(); G.moveTo(ch[0], ch[1]); for (i = 2; i < ch.length; i += 2) G.lineTo(ch[i], ch[i + 1]); G.closePath(); G.fillStyle = PAPER; G.fill();
      G.beginPath(); SP([232, 595, 226, 590, 219, 586, 214, 581, 210, 576], false, 0.3); ink(INK, 2.2); G.stroke();
    }
    S.turrets.forEach(function (t) { if (dipping(t)) drawBarrel(t); });
    S.turrets.forEach(drawHeatRing);
  }
  function drawFlagpole() { var S = world.S, G = world.G;
    pen(7070);
    var px = FLAG.X, top = GROUND - FLAG.TALL, low = GROUND - 40 - FLAG.H, up = S.flagUp == null ? 1 : S.flagUp;
    G.beginPath(); L(px, GROUND, px, top, 0.4); ink(INK, 2.6); G.stroke();
    G.beginPath(); G.arc(px, top - 3, 3, 0, Math.PI * 2); G.fillStyle = HAT; G.fill(); ink(INK, 1.6); G.stroke();
    G.beginPath(); L(px + 2 * FLAG.DIR, top + 2, px + 2 * FLAG.DIR, GROUND - 40, 0.2); ink('rgba(46,46,51,0.35)', 1); G.stroke();
    drawFlagCloth(px, low + (top + 2 - low) * up, S.t);
  }
  // The flag itself, rippling in the wind (flying FLAG.DIR of the pole): blue pen with a white star.
  function drawFlagCloth(px, y0, t) { var G = world.G;
    var w = FLAG.W * FLAG.DIR, h = FLAG.H, n = 8, pts = [], i, k;
    for (i = 0; i <= n; i++) { k = i / n; pts.push(px + k * w, y0 + Math.sin(t * 6 - k * 5) * 3.2 * k); }
    for (i = n; i >= 0; i--) { k = i / n; pts.push(px + k * w, y0 + h + Math.sin(t * 6 - k * 5 + 0.6) * 3.2 * k - k * 2); }
    G.beginPath(); G.moveTo(pts[0], pts[1]); for (i = 2; i < pts.length; i += 2) G.lineTo(pts[i], pts[i + 1]); G.closePath();
    G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(47,111,220,0.28)'; G.fill(); ink(BLUE, 2.4); G.stroke();
    var cx = px + w * 0.42, cy = y0 + h / 2 + Math.sin(t * 6 - 2.1) * 1.4, st = [];
    for (i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 3.6 : 8.4; st.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    G.beginPath(); G.moveTo(st[0], st[1]); for (i = 2; i < st.length; i += 2) G.lineTo(st[i], st[i + 1]); G.closePath();
    G.fillStyle = PAPER; G.fill(); ink(BLUE, 1.6); G.stroke();
  }
  // Brought down with the wall: the pole lies across the rubble, the flag crumpled at its end.
  function drawFallenFlag() { var G = world.G;
    pen(7071);
    G.beginPath(); L(150, GROUND - 4, 252, GROUND - 14, 0.4); ink(INK, 2.6); G.stroke();
    G.beginPath(); SP([252, GROUND - 14, 268, GROUND - 22, 282, GROUND - 12, 272, GROUND - 4, 258, GROUND - 6], true, 0.6);
    G.fillStyle = PAPER; G.fill(); G.fillStyle = 'rgba(47,111,220,0.28)'; G.fill(); ink(BLUE, 2); G.stroke();
  }
  function drawRubble() { var G = world.G;
    pen(9002);
    var pts = [164, 612, 170, 601, 179, 604, 188, 592, 198, 598, 207, 589, 216, 600, 226, 595, 236, 612];
    G.beginPath(); G.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) G.lineTo(pts[i], pts[i + 1]); G.closePath();
    G.fillStyle = PAPER; G.fill(); G.fillStyle = INK_FILL; G.fill();
    G.beginPath(); SP(pts, false, 0.6); ink(INK, 2.6); G.stroke();
    G.beginPath(); L(178, 606, 190, 606, 0.5); L(196, 603, 210, 604, 0.5); L(214, 607, 224, 606, 0.5); ink('rgba(46,46,51,0.4)', 1.6); G.stroke();
    G.save(); G.translate(222, 596); G.rotate(-0.4);
    G.fillStyle = PAPER; G.fillRect(0, -4, 28, 8);
    G.beginPath(); L(0, -4, 28, -4, 0.4); L(0, 4, 28, 4, 0.4); L(28, -4.5, 28, 4.5, 0.3); ink(INK, 2.4); G.stroke();
    G.restore();
  }
  function drawBullets() { var S = world.S, G = world.G;
    S.enemyShots.forEach(function (b) { var sp = Math.hypot(b.vx, b.vy) || 1; G.beginPath(); L(b.x, b.y, b.x - b.vx / sp * 12, b.y - b.vy / sp * 12, 0.3); ink(RED, 2); G.stroke(); });
    S.bullets.forEach(function (b) {
      var sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
      G.beginPath();
      if (b.kind === 'rocket') { G.moveTo(b.x - ux * 9, b.y - uy * 9); G.lineTo(b.x, b.y); ink(INK, 6); G.stroke(); ink(BLUE, 3); G.stroke(); }
      else if (b.heavy) { G.arc(b.x, b.y, 4, 0, Math.PI * 2); G.fillStyle = INK; G.fill(); }
      else if (b.tracer) { G.moveTo(b.x - ux * 20, b.y - uy * 20); G.lineTo(b.x, b.y); ink('#d99a00', 3); G.stroke(); ink(HAT, 1.4); G.stroke(); }
      else { G.moveTo(b.x - ux * 7, b.y - uy * 7); G.lineTo(b.x, b.y); ink(b.owner === 'ally' ? BLUE : INK, 2.6); G.stroke(); }
    });
  }
  function drawParts() { var S = world.S, G = world.G;
    S.parts.forEach(function (q) {
      var a = Math.max(0, q.life / q.max);
      pen(q.id);
      G.save(); G.globalAlpha = a;
      if (q.k === 'body') { G.globalAlpha = 0.85; drawBodyPart(q); }
      else if (q.k === 'tag') { G.globalAlpha = 1; dogTag(q.x, q.y, q.rot, 1); }
      else if (q.k === 'tagout') { if (q.t >= 0) { G.globalAlpha = 1 - 0.6 * clamp(q.t / q.dur, 0, 1); dogTag(q.x, q.y, q.rot, 1.1); } }
      else if (q.k === 'spatter') { G.globalAlpha = a * 0.6; G.beginPath(); G.arc(q.x, q.y, q.r, 0, Math.PI * 2); G.fillStyle = q.c; G.fill(); }
      else if (q.k === 'fleck') { G.beginPath(); G.moveTo(q.x, q.y); G.lineTo(q.x - q.vx * 0.02, q.y - q.vy * 0.02); ink(q.c, 2); G.stroke(); }
      else if (q.k === 'shred') { G.translate(q.x, q.y); G.rotate(q.rot); G.beginPath(); G.arc(0, 0, 6, Math.PI, Math.PI * 1.8); ink(RED, 1.8); G.stroke(); }
      else if (q.k === 'puff') { G.globalAlpha = a * 0.55; G.beginPath(); Ci(q.x, q.y, q.r, 0.6); ink(INK, 1.6); G.stroke(); }
      else if (q.k === 'star') {
        G.globalAlpha = 1; G.beginPath();
        for (var i = 0; i < 6; i++) { var an = (q.a != null ? q.a : S.turrets[0].aim) + i * Math.PI / 3; L(q.x + Math.cos(an) * 2, q.y + Math.sin(an) * 2, q.x + Math.cos(an) * 7, q.y + Math.sin(an) * 7, 0.5); }
        ink(INK, 2); G.stroke();
      } else if (q.k === 'deflate') { G.beginPath(); SP([q.x - 14, q.y, q.x - 8, q.y - 6, q.x - 2, q.y - 2, q.x + 4, q.y - 7, q.x + 10, q.y - 2, q.x + 15, q.y], false, 0.5); G.fillStyle = RED_FILL; G.fill(); ink(RED, 1.8); G.stroke(); }
      else if (q.k === 'tink') { G.beginPath(); L(q.x, q.y, q.x + 6, q.y - 5, 0.4); L(q.x, q.y, q.x + 7, q.y + 2, 0.4); L(q.x, q.y, q.x - 6, q.y - 6, 0.4); L(q.x, q.y, q.x - 5, q.y + 3, 0.4); ink(q.c === HAT ? '#d29a00' : q.c, 2); G.stroke(); }
      else if (q.k === 'ring') { G.beginPath(); Ci(q.x, q.y, 8 + (1 - a) * 24, 0.6); ink(BLUE, 2.4); G.stroke(); }
      else if (q.k === 'scrap') {
        // A scrap of torn paper.
        G.translate(q.x, q.y); G.rotate(q.rot); G.beginPath(); G.moveTo(-q.s, -q.s * 0.6); G.lineTo(q.s, -q.s * 0.3); G.lineTo(q.s * 0.2, q.s * 0.7); G.closePath();
        G.fillStyle = q.c || PAPER; G.fill(); ink(INK2, 1.1); G.stroke();
      } else if (q.k === 'sticker') { G.globalAlpha = Math.min(1, q.life); drawSticker(q.x, q.y, 1, q.rot, q.flat); }
      else if (q.k === 'plate') { G.globalAlpha = Math.min(1, q.life); drawPlate(q.x, q.y, 1, q.rot, q.flat, q.dents); }
      else if (q.k === 'flash') { if (!REDUCED) { G.globalAlpha = a * a * 0.6; G.fillStyle = '#fffdf2'; G.fillRect(-20, -20, W + 40, H + 40); } }
      else if (q.k === 'flag') {
        // A white flag: surrender.
        var up = (1 - a) * 14; G.globalAlpha = Math.min(1, a * 2);
        G.beginPath(); L(q.x, q.y - up, q.x, q.y - up - 18, 0.2); ink(INK, 1.6); G.stroke();
        G.beginPath(); G.moveTo(q.x, q.y - up - 18); G.lineTo(q.x + 11, q.y - up - 15 + Math.sin(S.t * 9) * 1.5); G.lineTo(q.x, q.y - up - 11); G.closePath();
        G.fillStyle = PAPER; G.fill(); ink(INK, 1.2); G.stroke();
      } else if (q.k === 'pow') {
        // A comic starburst that pops out fast, then fades.
        var out = q.r * (0.55 + 0.45 * Math.min(1, (1 - a) * 5)), spikes = 9;
        G.globalAlpha = Math.min(1, a * 2); G.translate(q.x, q.y); G.rotate(q.rot); G.beginPath();
        for (var j = 0; j < spikes * 2; j++) {
          var an = j / (spikes * 2) * Math.PI * 2, rad = j % 2 ? out * 0.48 : out * (0.82 + 0.18 * ((q.id + j) % 3) / 2);
          if (j) G.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); else G.moveTo(rad, 0);
        }
        G.closePath(); G.globalCompositeOperation = 'multiply'; G.fillStyle = HL.POW; G.fill();
        G.globalCompositeOperation = 'source-over'; ink(INK, 1.4); G.stroke();
      }
      G.restore();
    });
  }
  // A highlighter swipe behind a label, drawn left to right as u goes from 0 to 1, with a slightly uneven edge.
  function highlight(w, size, u, seed) { var G = world.G;
    var x0 = -w / 2 - 6, x1 = x0 + (w + 12) * u, top = -size * 0.72, bot = size * 0.12, j = (seed % 5) * 0.4;
    G.save(); G.globalCompositeOperation = 'multiply'; G.fillStyle = HL.COLOR;
    G.beginPath(); G.moveTo(x0, top + 2); G.lineTo(x1, top - 1 + j); G.lineTo(x1 - 2, bot + 1); G.lineTo(x0 + 1, bot - j); G.closePath(); G.fill();
    G.restore();
  }
  function drawTexts() { var S = world.S, G = world.G;
    S.texts.slice().sort(function (a, b) { return TEXT.ORDER[a.kind] - TEXT.ORDER[b.kind]; }).forEach(function (q) {
      var age = q.max - q.life, a = Math.min(1, q.life / 0.3), sc = age < 0.1 ? 1 + (0.1 - age) * 5 : 1;
      G.save(); G.globalAlpha = a; G.translate(q.x, q.y); G.rotate(q.rot); G.scale(sc, sc);
      G.font = q.size + 'px ' + HAND; G.textAlign = 'center';
      if (q.hl) highlight(G.measureText(q.s).width, q.size, Math.min(1, (S.t - q.hlT) / HL.SWIPE), q.id || q.size0);
      G.lineWidth = 4; G.lineJoin = 'round'; G.strokeStyle = PAPER; G.strokeText(q.s, 0, 0);
      G.fillStyle = q.color; G.fillText(q.s, 0, 0);
      G.restore();
    });
  }
  function drawBubbles() { var S = world.S, G = world.G;
    S.bubbles.forEach(function (b) {
      if (b.t < 0) return;
      var a = Math.min(1, b.life / 0.3, b.t / 0.08 + 0.2), col = b.enemy ? RED : BLUE;
      G.save(); G.globalAlpha = a; G.font = '16px ' + HAND;
      var tw = G.measureText(b.s).width, bw = tw + 14, bh = 22, cx = clamp(b.x, bw / 2 + 4, W - bw / 2 - 4), top = Math.max(TEXT.TOP, b.y - bh - 10);
      pen(b.id);
      G.beginPath(); SP([cx - bw / 2, top, cx + bw / 2, top, cx + bw / 2, top + bh, b.x + 6, top + bh, b.x, top + bh + 8, b.x - 3, top + bh, cx - bw / 2, top + bh], true, 0.4);
      G.fillStyle = PAPER; G.fill(); ink(col, 1.8); G.stroke();
      G.fillStyle = col; G.textAlign = 'center'; G.fillText(b.s, cx, top + 16);
      G.restore();
    });
  }
  // Only this device's barrel gets the guide.
  function drawAimGuide() { var G = world.G;
    var t = gun(), c = Math.cos(t.aim), s = Math.sin(t.aim);
    G.save(); G.setLineDash([2, 8]);
    G.beginPath(); G.moveTo(t.x + c * 40, TUR.y + s * 40); G.lineTo(t.x + c * 125, TUR.y + s * 125);
    ink('rgba(46,46,51,0.28)', 2); G.stroke();
    G.restore();
  }
  function drawHint() { var S = world.S, G = world.G;
    G.save(); G.globalAlpha = 0.6 + 0.3 * Math.sin(S.t * 4);
    G.fillStyle = INK; G.textAlign = 'center'; G.font = '19px ' + HAND;
    // Over the first mat, whichever side it's on.
    var m = function (x) { return S.matRight ? W - x : x; };
    G.fillText('pop his chute', m(80), 468); G.fillText('over the mat!', m(80), 490);
    G.setLineDash([2, 6]); G.beginPath(); G.moveTo(m(64), 538); G.lineTo(m(58), 580); ink(INK, 2); G.stroke(); G.setLineDash([]);
    G.beginPath(); G.moveTo(m(52), 573); G.lineTo(m(58), 582); G.lineTo(m(64), 573); G.stroke();
    G.restore();
  }
  // The squad row doubles as a health readout: a bar under each figure, wounded crew slouch with a bandage, and
  // badly hurt crew droop further, fade and get a red cross. Figures are drawn near field size so roles read.
  var MINI = 0.95;
  function miniFig(x, y, r, i, inBed) { var S = world.S, G = world.G;
    pen(7000 + i);
    G.save(); G.translate(x, y); G.scale(MINI, MINI);
    if (r && (r.down || inBed)) {
      // Wounded: flat on the ground with a red cross. In the tent: resting on a cot, bandaged.
      G.save(); G.globalAlpha = 0.6; G.translate(0, 33); G.rotate(-Math.PI / 2 + 0.12); G.translate(0, -33);
      stick(0, 12, [-3, 21, 3, 21, -5, 33, 5, 33], BLUE, 2.4); G.restore();
      if (inBed) { G.beginPath(); L(-14, 38, 14, 38, 0.2); L(-13, 38, -13, 42, 0.1); L(13, 38, 13, 42, 0.1); ink(INK, 2); G.stroke(); }
      G.beginPath(); L(-3, 20, 3, 20); L(0, 17, 0, 23); ink(RED, 2.4); G.stroke();
    } else if (r) {
      var h = clamp(r.hp / crewMax(r), 0, 1), state = h < 0.4 ? 2 : h < 0.7 ? 1 : 0;
      var col = r.hurt > 0 && Math.floor(S.t * 18) % 2 ? RED : hud.BLUE;
      G.fillStyle = 'rgba(46,46,51,0.15)'; G.fillRect(-8, 37, 16, 3);
      G.fillStyle = h < 0.4 ? RED : BLUE; G.fillRect(-8, 37, 16 * h, 3);
      G.save();
      if (state) { G.translate(0, 33); G.rotate(state === 2 ? 0.4 : 0.2); G.translate(0, -33); }
      if (state === 2) G.globalAlpha = 0.5;
      var pose = state ? [-3, 21, 3, 21, -5, 33, 5, 33] : [-6, 19, 6, 19, -5, 33, 5, 33];
      if (r.type === 'bazooka') tube(-8, 18, 7, 5);
      stick(0, 0, pose, col, 2.6);
      if (r.type === 'rifle' || r.type === 'sniper') { G.beginPath(); L(-7, 17, 8, 7, 0.3); ink(hud.INK, 2.2); G.stroke(); }
      if (r.type === 'sniper') { G.beginPath(); SP([-7, -4, -3, -10, 7, -7, 6, -3], true, 0.3); G.fillStyle = hud.INK; G.fill(); }
      if (r.type === 'engineer') hat(0, 0);
      if (r.type === 'medic') world.medicHelmet(0, 0);
      if (r.type === 'radio') radioPack(0, 0, 1);
      if (r.type === 'mg') mgTripod(0, 0, 1, -0.3, null);
      if (state) { G.beginPath(); L(-5.5, -2, 5.5, 1, 0.2); ink(INK, 4.4); G.stroke(); ink(PAPER, 2.4); G.stroke(); }
      chevrons(-8, 9, r.rank || 0);
      G.restore();
      if (state === 2) { G.beginPath(); L(9, 2, 15, 2); L(12, -1, 12, 5); ink(RED, 2.6); G.stroke(); }
    } else {
      G.setLineDash([2, 4]); stick(0, 0, [-6, 19, 6, 19, -5, 33, 5, 33], EMPTY, 2.2); G.setLineDash([]);
    }
    G.restore();
  }
  // Calls held on the radio, drawn under the score so they're in sight on any screen (the buttons beside pause are
  // easy to miss on a desktop). Click or tap one to make the call; B and C still work, and the key shows where there's
  // a keyboard. A call already flying is greyed.
  var CALL_CHIP = { X: 58, Y: 66, W: 44, H: 24, GAP: 3 }; // clear of the combo counter in the middle
  var KEYS_SHOWN = !(window.matchMedia && window.matchMedia('(hover: none)').matches);
  function callChips() { var S = world.S;
    var out = [], x = CALL_CHIP.X;
    [['bomber', 'strike', 'B', S.calls.bomber, !!S.strike], ['fighter', 'fighter', 'C', S.calls.fighter, !!S.fighter]].forEach(function (c) {
      if (c[3] <= 0) return;
      out.push({ kind: c[0], icon: c[1], key: c[2], n: c[3], busy: c[4], x: x, y: CALL_CHIP.Y });
      x += CALL_CHIP.W + CALL_CHIP.GAP;
    });
    return out;
  }
  function callChipAt(p) {
    return callChips().find(function (c) { return p.x >= c.x - 4 && p.x <= c.x + CALL_CHIP.W + 4 && p.y >= c.y - 4 && p.y <= c.y + CALL_CHIP.H + 4; }) || null;
  }
  function drawCallChips() { var S = world.S, G = world.G;
    if (S.mode !== 'play' && S.mode !== 'paused') return;
    callChips().forEach(function (c) {
      var x = c.x, y = c.y, cw = CALL_CHIP.W, ch = CALL_CHIP.H;
      G.save(); G.globalAlpha = c.busy ? 0.4 : 1; pen(c.icon.length * 77);
      G.fillStyle = PAPER; G.fillRect(x, y, cw, ch); G.fillStyle = 'rgba(47,111,220,0.1)'; G.fillRect(x, y, cw, ch);
      G.beginPath(); L(x, y, x + cw, y, 0.3); L(x + cw, y, x + cw, y + ch, 0.3); L(x + cw, y + ch, x, y + ch, 0.3); L(x, y + ch, x, y, 0.3); ink(BLUE, 1.6); G.stroke();
      G.save(); G.translate(x + 1, y + 1); G.scale(22 / 44, 22 / 44); ICONS[c.icon](G); G.restore();
      G.fillStyle = BLUE; G.font = '14px ' + HAND; G.textAlign = 'left'; G.fillText((KEYS_SHOWN ? c.key : '') + '×' + c.n, x + 23, y + 17);
      G.restore();
    });
  }
  // On the night raid and under the Dreadnought's smoke the page goes dark, so the HUD is written in chalk. Each part
  // of it takes its pen from the dark right under it (sky.js smokeAt), blended in between, so the pens fade over as the
  // night falls or the smoke rolls across, and back as it blows off one side, instead of flipping all at once. The
  // pens, the chalk and where it turns over are the paper's (game.js THEME).
  var CHALK = THEME.CHALK;
  var PENS = { INK: THEME.INK, INK2: THEME.INK2, TAGS: THEME.TAGS, BLUE: THEME.BLUE, RED: THEME.RED, GREEN: THEME.GREEN };
  var hud = PENS;
  var HUD_GAP = 8;
  function rgbOf(h) { var m = /^#([0-9a-f]{6})$/i.exec(h); if (!m) return null; var n = parseInt(m[1], 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  // The pen turns over late and quickly (PEN_TURN): ink reads on paper that's only greyed, chalk once it's truly dark,
  // and a half-and-half pen on half-dark paper reads on neither.
  var PEN_TURN = THEME.PEN_TURN;
  function pensAt(x, y) { var S = world.S;
    var d = S.mode === 'title' ? 0 : SKY.smokeAt(x, y), out = { dark: d };
    var k = clamp((d - PEN_TURN[0]) / (PEN_TURN[1] - PEN_TURN[0]), 0, 1); k = k * k * (3 - 2 * k);
    Object.keys(PENS).forEach(function (key) {
      var a = rgbOf(PENS[key]), b = rgbOf(CHALK[key]);
      out[key] = k <= 0.02 ? PENS[key] : k >= 0.98 ? CHALK[key] :
        a && b ? 'rgb(' + a.map(function (v, i) { return Math.round(v + (b[i] - v) * k); }).join(',') + ')' : k < 0.5 ? PENS[key] : CHALK[key];
    });
    return out;
  }
  function drawHUD() { var S = world.S, G = world.G;
    pen(4242);
    var c = pensAt(100, 44);
    hud = c;
    G.save();
    G.textAlign = 'left';
    if (S.mode !== 'title') {
      G.fillStyle = c.INK2; G.font = '16px ' + HAND; G.fillText('score', 58, 28);
      // Co-op: each player's own points beside the label, in their barrel's color.
      if (S.coop) {
        var px = 100, ps = S.players.map(function (p) { return p.score.toLocaleString('en-US'); });
        G.font = '15px ' + HAND;
        var pw = G.measureText(ps.join(' · ')).width;
        if (pw > 84) G.font = Math.max(10, Math.floor(15 * 84 / pw)) + 'px ' + HAND;
        G.fillStyle = c.BLUE; G.fillText(ps[0], px, 28); px += G.measureText(ps[0]).width;
        G.fillStyle = c.INK2; G.fillText(' · ', px, 28); px += G.measureText(' · ').width;
        G.fillStyle = c.GREEN; G.fillText(ps[1], px, 28);
      }
      // A long score shrinks to stop short of the wave label (round 14: six digits ran into "wave 10").
      var sc = S.score.toLocaleString('en-US');
      // A kind of run can name its own wave and the line under it (game.js MODES hud; Campaign's goal).
      var own = world.rules().hud ? world.rules().hud() : null, waveLabel = own ? own.wave : 'wave ' + Math.max(1, S.wave);
      G.font = '26px ' + HAND; var room = 200 - G.measureText(waveLabel).width / 2 - HUD_GAP - 58;
      G.font = '34px ' + HAND; var sw = G.measureText(sc).width;
      if (sw > room) G.font = Math.max(16, Math.floor(34 * room / sw)) + 'px ' + HAND;
      G.fillStyle = c.INK; G.fillText(sc, 58, 58);
      drawCallChips(); pen(4242);
      c = pensAt(310, 44);
      G.fillStyle = c.TAGS; G.font = '16px ' + HAND; G.fillText('dog tags', 280, 28);
      dogTag(TAG_HUD.x, TAG_HUD.y, -0.25, 1.3);
      var lose = S.tagLoss > 0 && (S.tagLossBy == null || S.tagLossBy === world.me), jig = lose ? Math.sin(S.t * 60) * 2.5 * Math.min(1, S.tagLoss) : 0;
      G.save(); G.translate(302 + jig, 58); var pulse = 1 + (S.tagPulse || 0) * 0.9; G.scale(pulse, pulse);
      G.fillStyle = lose ? c.RED : c.TAGS; G.font = '34px ' + HAND; G.textAlign = 'left'; G.fillText(String(tagsOf(world.me)), 0, 0); G.restore();
      if (lose && S.tagLost) { G.save(); G.globalAlpha = Math.min(1, S.tagLoss); G.fillStyle = c.RED; G.font = '22px ' + HAND; G.textAlign = 'left'; G.fillText('-' + S.tagLost, 304, 84); G.restore(); }
      c = pensAt(200, 52);
      G.fillStyle = c.INK;
      G.textAlign = 'center'; G.font = '26px ' + HAND; G.fillText(waveLabel, 200, 50);
      // Veteran wears its three stripes over the wave.
      if (S.level === 'veteran') { G.beginPath(); for (var vs = 0; vs < 3; vs++) { L(191, 20 + vs * 5, 200, 15 + vs * 5, 0.2); L(200, 15 + vs * 5, 209, 20 + vs * 5, 0.2); } ink(c.BLUE, 2.2); G.stroke(); }
      // In co-op the combo shown is this player's own.
      var cb = S.coop ? S.players[world.me] || S : S;
      if (cb.combo >= 2 && cb.comboT > 0) {
        G.fillStyle = c.BLUE; G.font = '22px ' + HAND; G.fillText('combo x' + Math.min(5, cb.combo), 200, 76);
        var cw = 70 * (cb.comboT / 1.4);
        G.beginPath(); L(200 - cw / 2, 82, 200 + cw / 2, 82, 0.4); ink(c.BLUE, 2.4); G.stroke();
      } else if (own && own.sub) { G.fillStyle = own.done ? c.BLUE : c.RED; G.font = '17px ' + HAND; G.fillText(own.sub, 200, 73); }
      else if (S.endless) { G.fillStyle = c.BLUE; G.font = '17px ' + HAND; G.fillText('endless', 200, 73); }
      else if (S.wave === DREAD.WAVE) { G.fillStyle = c.RED; G.font = '17px ' + HAND; G.fillText('final wave', 200, 73); }
    }
    // The title uses the bottom of the page for Start and the chips.
    if (S.mode === 'title') { G.restore(); hud = PENS; return; }
    // Down here each label, the bar, each little soldier and each count takes its own pen, since the smoke blows off
    // one side and these rows run nearly the width of the page.
    var y1 = 648, bx = 112, bw = 186, hp = Math.max(0, S.wallHP);
    c = pensAt(80, y1);
    G.textAlign = 'left'; G.fillStyle = c.INK; G.font = '21px ' + HAND; G.fillText('wall', 58, y1 + 7);
    c = pensAt(bx + bw / 2, y1);
    G.fillStyle = hp < 30 ? THEME.WALL_BAR.LOW : c.dark > THEME.WALL_BAR.DARK ? THEME.WALL_BAR.CHALK : THEME.WALL_BAR.INK;
    G.fillRect(bx + 2, y1 - 8, (bw - 4) * hp / S.mods.maxHP, 16);
    G.beginPath(); L(bx, y1 - 10, bx + bw, y1 - 10, 0.5); L(bx + bw, y1 - 10, bx + bw, y1 + 10, 0.5); L(bx + bw, y1 + 10, bx, y1 + 10, 0.5); L(bx, y1 + 10, bx, y1 - 10, 0.5);
    ink(c.INK, 2.4); G.stroke();
    c = pensAt(bx + bw + 40, y1);
    G.fillStyle = c.INK2; G.font = '17px ' + HAND; G.fillText(Math.ceil(hp) + '/' + S.mods.maxHP, bx + bw + 10, y1 + 6);
    var y2 = 690;
    c = pensAt(84, y2);
    G.fillStyle = c.INK; G.font = '21px ' + HAND; G.fillText('squad', 58, y2 + 6);
    var live = S.recruits.filter(function (r) { return !r.dead; }).sort(function (a, b) { return a.slot - b.slot; });
    if (S.bed) live.push(S.bed.r);
    for (var i = 0; i < S.mods.slots; i++) { hud = pensAt(124 + i * 24, y2 - 6); miniFig(124 + i * 24, y2 - 20, live[i], i, !!(S.bed && live[i] === S.bed.r)); }
    c = pensAt(bx + bw + 24, y2);
    G.fillStyle = c.INK2; G.font = '17px ' + HAND; G.textAlign = 'left'; G.fillText(live.length + "/" + S.mods.slots, bx + bw + 10, y2 + 6);
    G.restore();
    hud = PENS;
  }
  var BANNER_W = 350;
  function bannerLines(G, text) {
    if (G.measureText(text).width <= BANNER_W) return [text];
    var words = text.split(' '), lines = [], line = '';
    words.forEach(function (w) { var t = line ? line + ' ' + w : w; if (line && G.measureText(t).width > BANNER_W) { lines.push(line); line = w; } else line = t; });
    if (line) lines.push(line);
    return lines;
  }
  function drawBanner() { var S = world.S, G = world.G;
    var b = S.banner, a = Math.min(1, b.t / 0.25, (b.dur - b.t) / 0.4);
    if (a <= 0) return;
    G.save(); G.globalAlpha = a; G.textAlign = 'center';
    G.font = '700 ' + (b.s.length > 8 ? 46 : 56) + 'px ' + DISPLAY;
    // A long title (Campaign's mission names) shrinks to fit the page.
    var tw = G.measureText(b.s).width; if (tw > BANNER_W) G.font = '700 ' + Math.floor(46 * BANNER_W / tw) + 'px ' + DISPLAY;
    G.lineWidth = 6; G.lineJoin = 'round'; G.strokeStyle = PAPER; G.strokeText(b.s, 200, 300);
    G.fillStyle = INK; G.fillText(b.s, 200, 300);
    pen(31337); G.beginPath(); SP([120, 316, 160, 320, 200, 314, 240, 320, 280, 315], false, 0.8); ink(BLUE, 3); G.stroke();
    if (b.sub) {
      // A sub line wider than the page (Campaign's mission goals) wraps onto more lines under it.
      G.font = '24px ' + HAND; G.strokeStyle = PAPER; G.lineWidth = 4; G.fillStyle = BLUE;
      bannerLines(G, b.sub).forEach(function (line, i) { G.strokeText(line, 200, 348 + i * 28); G.fillText(line, 200, 348 + i * 28); });
    }
    G.restore();
  }

  // ---------- the squad on the cards ----------
  // The squad as the HUD's row shows it, in order: each soldier ({ r, bed: in the tent }), then, with slots, every
  // empty slot ({ r: null }).
  function squadSlots(slots) { var S = world.S;
    var live = S.recruits.filter(function (r) { return !r.dead; }).sort(function (a, b) { return a.slot - b.slot; });
    if (S.bed) live.push(S.bed.r);
    var n = slots ? Math.max(S.mods.slots, live.length) : live.length, out = [];
    for (var i = 0; i < n; i++) out.push({ r: live[i] || null, bed: !!(S.bed && live[i] === S.bed.r) });
    return out;
  }
  // The squad as it stood, drawn like the HUD's squad row onto a card's canvas (the game-over card, the pause card).
  // slots: every squad slot, the empty ones dotted, as in the HUD.
  function drawSquadRow(canvas, slots) {
    var list = squadSlots(slots), n = list.length;
    if (!n) return false;
    var k = 2, cw = 24 * n + 12, g = canvas.getContext('2d'), previous = world.G;
    canvas.width = cw * k; canvas.height = 52 * k; canvas.style.width = cw + 'px';
    world.G = g; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, cw, 52);
    // Low enough that hard hats and helmets clear the top edge.
    try { for (var i = 0; i < n; i++) miniFig(12 + i * 24, 11, list[i].r, i, list[i].bed); } finally { world.G = previous; }
    return true;
  }
  // One slot of that row on its own canvas (the shop's squad, where each soldier is a button), drawn at 3× for a
  // figure shown half again as big.
  function drawSquadFig(canvas, slot, i) {
    var k = 3, g = canvas.getContext('2d'), previous = world.G;
    canvas.width = 24 * k; canvas.height = 52 * k;
    world.G = g; g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, 24, 52);
    try { miniFig(12, 11, slot.r, i, slot.bed); } finally { world.G = previous; }
  }

  return { link: link, drawPaper: drawPaper, sketched: sketched, sketchReveal: sketchReveal, drawPen: drawPen,
    drawBodyPart: drawBodyPart, stick: stick, tube: tube, hat: hat, dogTag: dogTag, drawTagShape: drawTagShape,
    helmet: helmet, medicHelmet: medicHelmet, vest: vest, captainCap: captainCap, steelPot: steelPot, hammer: hammer,
    chute: chute, drawTrooper: drawTrooper, drawDowned: drawDowned, drawRecruit: drawRecruit, drawScope: drawScope,
    PLANE_PTS: PLANE_PTS, BOMBER_PTS: BOMBER_PTS, drawPlane: drawPlane, drawBomb: drawBomb, drawGround: drawGround,
    drawDefenses: drawDefenses, BAGS: BAGS, drawSandbags: drawSandbags, drawTramp: drawTramp, GUN_COLORS: GUN_COLORS,
    drawBarrel: drawBarrel, drawHeatRing: drawHeatRing, drawSentry: drawSentry, drawBunker: drawBunker,
    drawFlagpole: drawFlagpole, drawFlagCloth: drawFlagCloth, drawFallenFlag: drawFallenFlag, drawRubble: drawRubble,
    drawBullets: drawBullets, drawParts: drawParts, highlight: highlight, drawTexts: drawTexts,
    drawBubbles: drawBubbles, drawAimGuide: drawAimGuide, drawHint: drawHint, MINI: MINI, miniFig: miniFig,
    CALL_CHIP: CALL_CHIP, KEYS_SHOWN: KEYS_SHOWN, callChips: callChips, callChipAt: callChipAt,
    drawCallChips: drawCallChips, CHALK: CHALK, PENS: PENS, HUD_GAP: HUD_GAP, rgbOf: rgbOf, PEN_TURN: PEN_TURN,
    pensAt: pensAt, drawHUD: drawHUD, drawBanner: drawBanner, squadSlots: squadSlots, drawSquadRow: drawSquadRow,
    drawSquadFig: drawSquadFig };
};
