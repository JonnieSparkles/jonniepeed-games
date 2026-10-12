(() => {
'use strict';
const A = UnrugArt, B = UnrugBull;
const { rect, px, line, disc } = A;
const W = 480, H = 270, FLOOR_Y = 240, DT = 1 / 60;
const cv = document.getElementById('stage'), g = cv.getContext('2d');
g.imageSmoothingEnabled = false;
const txt = (s, x, y, col, sc = 2, al = 'left') => A.txt(g, s, x, y, col, sc, al);
const otxt = (s, x, y, col, sc = 2, al = 'left') => A.otxt(g, s, x, y, col, sc, al);
const tw = (s, sc = 2) => String(s).length * 4 * sc - sc;

/* ---------- the beats (seconds) ---------- */
const BEATS = [
  { id: 'ask', t: 0, title: '\u201cFloor?\u201d', d: 'Doors close on the 13th Floor. Please Hold, the muzak, starts.' },
  { id: 'climb', t: 2, title: 'The climb', d: 'Nothing but the muzak, the shaft sliding past, and small talk with the operator. A breather.' },
  { id: 'eye', t: 16.0, title: 'p(Loom) takes the dial', d: 'The lights brown out and the muzak sags. The floor dial turns into its eye: \u201cProbability of arrival: zero percent.\u201d' },
  { id: 'cut', t: 18.2, title: 'Above the car', d: 'A cut-in up the shaft: its threads wind around the cable and take it. The cable glows orange: it is p(Loom)\u2019s thread now. Then it goes slack.' },
  { id: 'fall', t: 20.3, title: 'The drop', d: 'p(Loom) lets the car fall. Lights out, red emergency light. The dial swings back and the shaft races upward past the door windows.' },
  { id: 'brake', t: 21.8, title: 'The brakes catch', d: 'Sparks off both sides, a screech, a hard stop.' },
  { id: 'hush', t: 22.6, title: 'Silence', d: 'Dust from the hatch. The operator, still on his stool: \u201c\u2026Floor?\u201d' },
  { id: 'threads', t: 24.0, title: 'The threads come in', d: 'The hatch bursts. Its thread comes through and hooks the car: \u201cRecalculating. Bring him up.\u201d' },
  { id: 'reel', t: 25.8, title: 'Reeled up: Horns Up', d: 'The car rockets up. Horns Up turns heavy and carpshits slide down the threads. \u201cHere I come, p(Loom).\u201d' },
  { id: 'armor', t: 34.8, title: 'Armor', d: 'Armored carpshits join the waves. The first hit knocks the helmet off.' },
  { id: 'last', t: 46.8, title: 'The last floors', d: 'Three at a time down the threads, more of them armored, all the way to the top.' },
  { id: 'arrive', t: 55.8, title: 'The top', d: 'The threads let go, the car slams to a stop, the lights come back. Ding.' },
  { id: 'doors', t: 57.2, title: 'The roof', d: 'The doors open on the storm and p(Loom). The operator slides the supply crate over: \u201cFloor?\u201d' },
];
const END = 63;
const T_EYE = 16.0, T_CUT = 18.2, T_SNAP = 19.45, T_FALL = 20.3, T_BRAKE = 21.8, T_HUSH = 22.6, T_THREAD = 24.0, T_HOOK = 24.9, T_REEL = 25.8, T_ARRIVE = 55.8, T_DOORS = 57.2, T_CRATE = 59.2, T_ARMOR = 34.8, T_LAST = 46.8;
const beatAt = t => { let b = BEATS[0]; for (const x of BEATS) if (t >= x.t) b = x; return b; };

const CAR_L = 40, CAR_R = 440;   // the car's walls; the shaft shows either side
/* ---------- curves ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = k => k * k * (3 - 2 * k);
function floorAt(t) {
  if (t < 2) return 13;
  if (t < T_EYE) return lerp(13, 52, (t - 2) / (T_EYE - 2));
  if (t < T_FALL) return 52 + (t > T_EYE + .8 ? Math.sin(t * 37) * .4 : 0);
  if (t < T_BRAKE) { const k = (t - T_FALL) / (T_BRAKE - T_FALL); return 52 - 13 * k * k; }
  if (t < T_REEL) return 39;
  if (t < T_ARRIVE) return lerp(39, 99, ease((t - T_REEL) / (T_ARRIVE - T_REEL)));
  return 99;
}
// shaft speed past the windows, landings per second (negative: falling)
function speedAt(t) {
  if (t < 2) return 0;
  if (t < T_EYE) return 1.4;
  if (t < T_EYE + 2) return lerp(1.4, .3, (t - T_EYE) / 2);
  if (t < T_FALL) return t < T_SNAP + .1 ? .3 : 0;
  if (t < T_BRAKE) return -lerp(2, 16, (t - T_FALL) / (T_BRAKE - T_FALL));
  if (t < T_REEL) return 0;
  if (t < T_ARRIVE) return lerp(5, 11, clamp((t - T_REEL) / 3, 0, 1));
  return 0;
}
function shakeAt(t) {
  const pulse = (t0, dur, amp) => (t >= t0 && t < t0 + dur) ? amp * (1 - (t - t0) / dur) : 0;
  let s = 0;
  if (t > T_EYE + .6 && t < T_CUT) s += .6;
  if (t >= T_FALL && t < T_BRAKE) s += 2.4;
  s += pulse(T_FALL, .4, 6) + pulse(T_BRAKE, .7, 9) + pulse(T_HOOK, .4, 4) + pulse(T_REEL, .6, 7) + pulse(T_ARRIVE, .6, 8);
  if (t >= T_REEL && t < T_ARRIVE) s += 1.1;
  return s;
}
const lightsOut = t => t >= T_FALL && t < T_ARRIVE;

/* ---------- seeded randomness (outcomes) ---------- */
let seed = 7;
const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let x = seed; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const rr = (a, b) => a + (b - a) * rnd();

/* ---------- sprites ---------- */
const SIDE = B.paint(B.VIEWS.side), VF = B.VIEW_FEET, GUN = B.paint(B.BLASTER);
const CARP = A.CARPF, SOUL = A.GHOST, HEART = A.HEART, SPREAD = A.SPREAD;
const CW = Math.round(CARP[0].width * .72), CH = Math.round(CARP[0].height * .72);

/* ---------- state ---------- */
let S;
const CRATE_SOULS = 20, HEARTS = 5, CHARGES = 20, RECHARGE = .5, FIRE_EVERY = .2, DEFLECT_CHARGE = 3;   // the game's blaster: 20 shots, one back every half second
function reset() {
  seed = 7;
  S = {
    t: 0, shown: 142, start: 142, shaft: 0, charge: CHARGES, rechargeT: 0, dry: false, empty: 0, chargeFlash: 0, over: null, hurtShake: 0, lost: 0, pop: null,
    bull: { x: 130, y: 0, vy: 0, face: 1, step: 0, slash: -1, cd: 0, cd2: 0, recoil: 0, flash: 0, inv: 0, kb: 0, crouch: false, hearts: HEARTS, out: 0, land: 0 },
    op: { lift: 0, cap: 0 },
    foes: [], bolts: [], wads: [], fx: [], souls: [], dust: [], drops: [],
    nextSpawn: 2.6, wave: 0, hatch: 0, crate: null, fired: new Set(),
  };
}

/* ---------- input: keys and the touch pad ---------- */
const keys = { left: false, right: false, down: false, shoot: false };
const press = { jump: 0, slash: 0 };
const KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', KeyC: 'down',
  ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ShiftLeft: 'shoot', ShiftRight: 'shoot', Quote: 'shoot', KeyJ: 'shoot', KeyZ: 'shoot', NumpadEnter: 'slash', KeyK: 'slash', KeyX: 'slash', Enter: 'slash' };
function setKey(k, on) { if (k === 'jump' || k === 'slash') { if (on) press[k] = .15; } else keys[k] = on; }
addEventListener('keydown', e => { const k = KEYMAP[e.code]; if (!k || !playing) return; e.preventDefault(); if (!e.repeat || k in keys) setKey(k, true); });
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) setKey(k, false); });
document.querySelectorAll('[data-k]').forEach(el => {
  const k = el.dataset.k;
  const on = e => { e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (_) {} el.classList.add('down'); setKey(k, true); };
  const off = () => { el.classList.remove('down'); setKey(k, false); };
  el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
  el.addEventListener('contextmenu', e => e.preventDefault());
});
function clearInput() { for (const k in keys) keys[k] = false; press.jump = press.slash = 0; document.querySelectorAll('[data-k].down').forEach(el => el.classList.remove('down')); }

/* ---------- the fight ---------- */
const MUZZLE_H = 36, CROUCH_H = 29, HX = 150;   // bolt heights above his feet; the hatch's centre
const inControl = t => !S.over && !(t >= T_CUT && t < T_HOOK) && !(S.bull && S.bull.out > 0);
function spawn(kind, armored, viaThread) {
  const lanes = [HX - 60, HX + 4, HX + 120, 300, 360];
  let tx = viaThread ? lanes[Math.floor(rnd() * lanes.length)] : HX + rr(-12, 12);
  for (let tries = 0; tries < 5 && S.foes.some(o => o.drop && Math.abs(o.x - tx) < CW); tries++) tx = lanes[(lanes.indexOf(tx) + 1) % lanes.length];
  kind = 'flyer';   // nothing scuttles on the floor: every carpshit flies, at his height or above it
  S.foes.push({ kind, armored, x: tx, y: 30, px: tx, drop: true, dir: rnd() < .5 ? -1 : 1, age: 0, spin: rr(-1, 1),
    hover: FLOOR_Y - (rnd() < .65 ? rr(30, 44) : rr(64, 84)), dead: false, hit: 0, throwT: rr(1.6, 2.6), swoopT: rr(2.2, 4), swoop: null, ph: rnd() * 6, keep: rr(60, 190) });
}
function stepFight(t) {
  const warm = false, heavy = t >= T_REEL + .6 && t < T_ARRIVE - .5;
  if ((warm || heavy) && S.foes.length < (heavy ? 7 : 3)) {
    S.nextSpawn -= DT;
    if (S.nextSpawn <= 0) {
      const n = heavy ? (t > T_LAST ? 3 : 2) : 1;
      for (let i = 0; i < n; i++) spawn((S.wave + i) % 2 ? 'flyer' : 'crawler', heavy && ((t > T_ARMOR && i === 0 && S.wave % 2 === 1) || (t > T_LAST && i === 1)), heavy);
      S.wave++; S.nextSpawn = heavy ? (t > T_LAST ? 1.5 : 1.8) : 2.4;
    }
  }
  const b = S.bull, chest = FLOOR_Y - b.y - (b.crouch ? 22 : 34);
  for (const e of S.foes) {
    if (e.dead) continue;
    if (!e.drop && !e.swoop) for (const o of S.foes) {
      if (o === e || o.dead || o.drop || o.swoop) continue;
      const ddx = e.x - o.x, ddy = e.y - o.y;
      if (Math.abs(ddx) < CW * 1.05 && Math.abs(ddy) < CH * 1.4) {
        const push = 1 - Math.abs(ddx) / (CW * 1.05);
        e.x += (Math.sign(ddx) || (e.ph > o.ph ? 1 : -1)) * (60 + 220 * push) * DT;
        if (e.x < CAR_L + 30 || e.x > CAR_R - 30) e.hover += (Math.sign(ddy) || (e.ph > o.ph ? 1 : -1)) * 120 * DT;   // pinned at a wall: spread up and down instead
        e.hover += (Math.sign(ddy) || (e.ph > o.ph ? 1 : -1)) * 60 * push * DT;
      }
    }
    e.hover = clamp(e.hover, FLOOR_Y - 92, FLOOR_Y - 28);
    e.age += DT; e.hit = Math.max(0, e.hit - DT);
    if (e.drop) { e.y += (t >= T_REEL ? 140 : 110) * DT; if (e.y >= e.hover) { e.y = e.hover; e.drop = false; e.age = 0; } continue; }
    const dx = b.x - e.x, side = Math.sign(dx) || e.dir;
    if (e.kind === 'crawler') e.x += side * (heavy ? 54 : 44) * DT;
    else {
      // flyers keep a little distance, bob, and throw paper
      e.px = e.x;
      if (e.swoop) {
        // a dive: down through where he's standing and back up the other side
        const w = e.swoop; w.t += DT; const k = Math.min(1, w.t / 1.05);
        e.x = lerp(w.sx, w.tx, k); e.y = lerp(w.sy, w.ey, k) + Math.sin(k * Math.PI) * (w.ty - (w.sy + w.ey) / 2);
        if (k >= 1) { e.swoop = null; e.swoopT = rr(3.2, 5); e.hover = w.ey; }
      } else {
        const want = Math.abs(dx) > e.keep + 25 ? 1 : Math.abs(dx) < e.keep - 25 ? -1 : 0;
        e.x += side * want * 40 * DT; e.y = e.hover + Math.sin(e.age * 3.4 + e.ph) * 5;
        e.swoopT -= DT;
        if (e.swoopT < .4) e.y -= (.4 - Math.max(0, e.swoopT)) * 20;     // the wind-up: it rears back before it dives
        if (e.swoopT <= 0 && !S.over) { e.swoop = { t: 0, sx: e.x, sy: e.y, tx: clamp(b.x + side * 70, CAR_L + 20, CAR_R - 20), ty: chest + 6, ey: FLOOR_Y - (rnd() < .5 ? rr(30, 44) : rr(64, 84)) }; cue('swoop'); }
      }
      e.throwT -= DT;
      if (e.throwT <= 0 && !S.over && !e.swoop) {
        e.throwT = rr(2.6, 4);
        const ddx = b.x - e.x, ddy = chest - e.y, len = Math.max(1, Math.hypot(ddx, ddy));
        S.wads.push({ x: e.x, y: e.y, vx: ddx / len * 120, vy: ddy / len * 120, src: e, friendly: false, r: 0 });
        cue('throw');
      }
    }
    e.x = clamp(e.x, CAR_L + 14, CAR_R - 14);
    // contact
    if (Math.abs(e.x - b.x) < 18 && e.y > FLOOR_Y - b.y - (b.crouch ? 44 : 66) && e.y < FLOOR_Y - b.y + 4) { if (hurt(Math.sign(b.x - e.x) || 1)) e.x -= (Math.sign(b.x - e.x) || 1) * 34; }
  }
  // bolts
  for (const s of S.bolts) {
    const ox = s.x; s.x += s.vx * DT; s.y += (s.vy || 0) * DT;
    for (const e of S.foes) if (!e.dead && !e.drop && Math.abs(e.y - s.y) < (e.kind === 'crawler' ? 30 : 18) && e.x - CW / 2 < Math.max(ox, s.x) && e.x + CW / 2 > Math.min(ox, s.x)) { s.dead = true; hit(e, s.vx > 0 ? 1 : -1); break; }
    if (s.x < 0 || s.x > W) s.dead = true;
  }
  S.bolts = S.bolts.filter(s => !s.dead);
  // paper: hurts him, or, knocked back with the katana, takes out whatever it hits
  for (const p of S.wads) {
    p.x += p.vx * DT; p.y += p.vy * DT; p.r += DT * 12;
    if (p.friendly) { for (const e of S.foes) if (!e.dead && !e.drop && Math.abs(e.x - p.x) < CW / 2 && Math.abs(e.y - p.y) < 12) { p.dead = true; hit(e, Math.sign(p.vx) || 1); break; } }
    else if (Math.abs(p.x - b.x) < 12 && p.y > FLOOR_Y - b.y - (b.crouch ? 44 : 66) && p.y < FLOOR_Y - b.y) { if (hurt(Math.sign(p.vx) || 1)) p.dead = true; }
    if (p.x < -10 || p.x > W + 10 || p.y > FLOOR_Y || p.y < 20) p.dead = true;
  }
  S.wads = S.wads.filter(p => !p.dead);
  S.foes = S.foes.filter(e => !e.dead);
}
function stepBull(t) {
  const b = S.bull, can = inControl(t) && live;
  b.cd -= DT; b.cd2 -= DT; b.recoil = Math.max(0, b.recoil - DT); b.flash = Math.max(0, b.flash - DT); b.inv = Math.max(0, b.inv - DT);
  press.jump = Math.max(0, press.jump - DT); press.slash = Math.max(0, press.slash - DT);
  if (b.slash >= 0) { b.slash += DT; if (b.slash > .2) b.slash = -1; }
  const dir = can ? (keys.right ? 1 : 0) - (keys.left ? 1 : 0) : 0;
  b.crouch = can && keys.down && b.y <= 0;
  if (dir) b.face = dir;
  b.moving = !!dir && !b.crouch;
  b.still = (dir || keys.shoot || b.y > 0 || b.slash >= 0 || b.crouch || !can) ? 0 : (b.still || 0) + DT;
  if (!b.crouch) b.x += dir * 120 * DT;
  b.x += b.kb * DT; b.kb *= .86; b.x = clamp(b.x, CAR_L + 12, CAR_R - 12);
  if (dir && b.y <= 0 && !b.crouch) b.step += DT * 12;
  if (t >= T_FALL && t < T_BRAKE) { b.y = Math.min(14, b.y + 40 * DT); b.vy = 0; }
  else {
    if (can && press.jump > 0 && b.y <= 0) { b.vy = 320; b.y = .1; press.jump = 0; cue('jump'); }
    if (b.y > 0 || b.vy > 0) { b.y += b.vy * DT; b.vy -= 950 * DT; if (b.y <= 0) { b.y = 0; b.vy = 0; b.land = .12; for (let i = 0; i < 4; i++) S.fx.push({ k: 'puffs', x: b.x + rr(-10, 10), y: FLOOR_Y - 2, vx: rr(-30, 30), vy: rr(-20, -5), t: 0, dur: .3 }); } }
  }
  b.land = Math.max(0, b.land - DT);
  if (can && press.slash > 0 && b.cd2 <= 0) { press.slash = 0; b.slash = 0; b.cd2 = .26; slashAt(b); }
  if (can && keys.shoot && b.cd <= 0 && b.slash < 0) b.cd = fire(b) ? FIRE_EVERY : .25;
}
function hurt(dir) {
  const b = S.bull;
  if (!live || b.inv > 0 || S.over) return false;
  b.hearts--; S.lost++; b.inv = 1.3; b.kb = dir * 220; S.hurtShake = .25; cue('hurt');
  S.fx.push({ k: 'puff', x: b.x, y: FLOOR_Y - b.y - 34, t: 0, dur: .2 });
  if (b.hearts <= 0) { S.over = 'rugged'; S.overT = S.t; cue('rugged'); }
  return true;
}
function fire(b) {
  if (S.charge < 1) { S.empty = .2; cue('empty'); return false; }
  S.charge--;
  if (S.charge < 1) { S.dry = true; cue('drained'); S.pop = { text: 'EMPTY', x: b.x, y: FLOOR_Y - b.y - 84, t: 0, col: '#ff7050' }; }
  const h = b.crouch ? CROUCH_H : MUZZLE_H;
  S.bolts.push({ x: b.x + b.face * (B.SIDE_MUZZLE.x + 2), y: FLOOR_Y - b.y - h, vx: b.face * 430 });
  b.recoil = .07; b.flash = .05; cue('shot');
  return true;
}
function slashAt(b) {
  cue('slash');
  const cy = FLOOR_Y - b.y - (b.crouch ? 16 : 26);
  for (const e of S.foes) if (!e.dead && !e.drop && (e.x - b.x) * b.face > -8 && (e.x - b.x) * b.face < 60 && Math.abs(e.y - cy) < 38) hit(e, b.face, 'slash');
  for (const p of S.wads) if (!p.friendly && (p.x - b.x) * b.face > -10 && (p.x - b.x) * b.face < 62 && Math.abs(p.y - cy) < 36) {
    p.friendly = true; cue('deflect'); S.charge = Math.min(CHARGES, S.charge + DEFLECT_CHARGE); S.chargeFlash = .3;
    const tgt = p.src && !p.src.dead ? p.src : null, dx = tgt ? tgt.x - p.x : b.face * 100, dy = tgt ? tgt.y - p.y : 0, len = Math.max(1, Math.hypot(dx, dy));
    p.vx = dx / len * 360; p.vy = dy / len * 360;
    S.pop = { text: 'DEFLECT!', x: p.x, y: p.y - 10, t: 0 };
  }
}
function hit(e, dir, by) {
  if (e.armored) {
    e.armored = false; e.hit = .15; e.x += dir * 10; cue('clank');
    S.drops.push({ x: e.x, y: e.y - 8, vx: dir * 70, vy: -140, r: 0 });
    for (let i = 0; i < 10; i++) S.fx.push({ k: 'spark', x: e.x, y: e.y - 8, vx: rr(-90, 90), vy: rr(-140, -20), t: 0, dur: .35 });
    return;
  }
  kill(e, by);
}
function kill(e, by) {
  if (e.dead) return;
  e.dead = true; cue('poof');
  if (by === 'slash') for (const s2 of [-1, 1]) S.fx.push({ k: 'half', x: e.x, y: e.y + s2 * 4, vx: rr(-40, 40), vy: s2 * 60 - 40, r: 0, vr: s2 * 6, top: s2 < 0, t: 0, dur: .6 });
  S.fx.push({ k: 'puff', x: e.x, y: e.y, t: 0, dur: .35 });
  for (let i = 0; i < 5; i++) S.fx.push({ k: 'spark', x: e.x, y: e.y, vx: rr(-70, 70), vy: rr(-90, 10), t: 0, dur: .3 });
  S.souls.push({ x: e.x, y: e.y, t: 0 });
}
function stepFx() {
  for (const f of S.fx) { f.t += DT; if (f.vx != null) { f.x += f.vx * DT; f.y += f.vy * DT; if (f.k === 'spark' || f.k === 'half') f.vy += 300 * DT; if (f.k === 'half') f.r += f.vr * DT; } }
  S.fx = S.fx.filter(f => f.t < f.dur);
  for (const s of S.souls) s.t += DT;
  S.souls = S.souls.filter(s => { if (s.t >= 1.1) { S.shown++; return false; } return true; });
  S.drops = S.drops.filter(d => (d.age = (d.age || 0) + DT) < 2.2);
  for (const d of S.drops) { d.x += d.vx * DT; d.y += d.vy * DT; d.vy += 500 * DT; d.r += DT * 9; if (d.y > FLOOR_Y - 4) { d.y = FLOOR_Y - 4; d.vy *= -.3; d.vx *= .6; } }
  for (const d of S.dust) { d.y += d.vy * DT; d.t += DT; }
  S.dust = S.dust.filter(d => d.t < d.dur);
  if (S.pop) { S.pop.t += DT; S.pop.y -= 20 * DT; if (S.pop.t > .8) S.pop = null; }
  S.hurtShake = Math.max(0, S.hurtShake - DT);
  S.empty = Math.max(0, S.empty - DT); S.chargeFlash = Math.max(0, S.chargeFlash - DT);
  if (S.charge < CHARGES) { S.rechargeT += DT; while (S.rechargeT >= RECHARGE && S.charge < CHARGES) { S.rechargeT -= RECHARGE; S.charge++; } }
  else { S.rechargeT = 0; if (S.dry) { S.dry = false; cue('ready'); } }
}

/* ---------- the scripted moments ---------- */
function stepScript(t) {
  const b = S.bull, op = S.op;
  if (t >= T_FALL && t < T_BRAKE) { op.lift = Math.min(8, op.lift + 30 * DT); op.cap = Math.min(16, op.cap + 50 * DT); }
  else { op.lift = Math.max(0, op.lift - 60 * DT); op.cap = Math.max(0, op.cap - 40 * DT); }
  if ((t >= T_CUT && t < T_CUT + DT * 1.5) || (t >= T_ARRIVE && t < T_ARRIVE + DT * 1.5)) { for (const e of S.foes) kill(e); S.wads = []; }
  if (t >= T_BRAKE && t < T_BRAKE + .7) for (let i = 0; i < 3; i++) {
    const side = rnd() < .5 ? 0 : 1;
    S.fx.push({ k: 'spark', x: side ? rr(462, 476) : rr(4, 18), y: rr(150, 240), vx: (side ? -1 : 1) * rr(20, 140), vy: rr(-200, -40), t: 0, dur: rr(.3, .6) });
  }
  if (t >= T_HUSH && t < T_HUSH + .8 && rnd() < .5) S.dust.push({ x: HX + rr(-24, 24), y: 38, vy: rr(30, 70), t: 0, dur: 1.6 });
  S.hatch = t < T_THREAD ? 0 : clamp((t - T_THREAD) / .25, 0, 1);
  if (t >= T_THREAD && t < T_THREAD + .3) for (let i = 0; i < 3; i++) S.dust.push({ x: HX + rr(-28, 28), y: 40, vy: rr(60, 140), t: 0, dur: 1 });
  // the top: the crate slides over from the operator and waits; the roof is through the doors
  if (t >= T_CRATE && !S.crate) { S.crate = { x: 344, got: false }; cue('crate'); }
  if (S.crate && !S.crate.got) {
    S.crate.x = Math.max(Math.max(200, b.x + 24), S.crate.x - 150 * DT);
    if (Math.abs(S.crate.x - b.x) < 26 && b.y < 20) {
      S.crate.got = true; cue('power');
      if (b.hearts < HEARTS) { S.crate.gave = 'hearts'; b.hearts = HEARTS; S.pop = { text: 'FULL HEARTS', x: b.x, y: FLOOR_Y - 84, t: 0 }; }
      else { S.crate.gave = 'souls'; S.pop = { text: '+' + CRATE_SOULS + ' SOULS', x: b.x, y: FLOOR_Y - 84, t: 0 }; for (let i = 0; i < CRATE_SOULS; i++) S.souls.push({ x: S.crate.x + rr(-14, 14), y: FLOOR_Y - 14 - rr(0, 10), t: -i * .04 }); }
    }
  }
  if (!S.over && (b.out > 0 || (t > T_DOORS + 1.2 && b.x > 222 && b.x < 258 && b.y <= 0))) {
    b.out = Math.min(1, b.out + DT * 1.1); b.x += (240 - b.x) * .1; b.step += DT * 8;
    if (b.out >= 1) { S.over = 'clear'; S.overT = t; }
  }
}

/* ---------- sound cues: fire once when crossed during real play ---------- */
let live = false;   // false while fast-forwarding a seek
const CUES = [
  [0.35, () => say('operator', 'Floor?')],
  [4.0, () => say('bull', 'You ever get off?')],
  [6.4, () => say('operator', 'Floor?')],
  [9.6, () => say('bull', '...The roof.')],
  [11.8, () => say('operator', 'Very good, sir.')],
  [T_DOORS + 3.1, () => say('bull', 'Roof.')],
  [T_EYE, () => Music.brownout()],
  [T_EYE + .4, () => say('ploom', 'Probability of arrival: zero percent.', 'Probability of arrival. Zero percent.')],
  [T_CUT, () => Music.stop()],
  [T_CUT + .3, () => Sfx.creak()],
  [T_CUT + .6, () => Sfx.wind()],
  [T_SNAP, () => Sfx.slack()],
  [T_FALL, () => Sfx.fall()],
  [T_BRAKE, () => Sfx.brake()],
  [T_HUSH + .5, () => say('operator', '...Floor?')],
  [T_THREAD, () => Sfx.burst()],
  [T_THREAD + .35, () => say('ploom', 'Recalculating. Bring him up.', 'Recalculating. Bring him up.')],
  [T_HOOK, () => { Sfx.hook(); Sfx.reel(); }],
  [T_REEL, () => Music.heavy(0)],
  [T_REEL + .6, () => say('bull', 'Here I come, p(Loom).')],
  [T_ARRIVE, () => { Music.stop(); Sfx.slam(); }],
  [T_ARRIVE + .5, () => Sfx.ding()],
  [T_DOORS, () => Sfx.doors()],
  [T_DOORS + 1.6, () => Sfx.thunder()],
  [T_DOORS + 1.3, () => say('operator', 'Floor?')],
];
function cue(name) { if (live) Sfx[name] && Sfx[name](); }

/* ---------- captions ---------- */
const TALK = [];
function sayVisual(who, text, t0) { TALK.push({ who, text, t0 }); }
const SCRIPT_TALK = [
  ['bull', 'YOU EVER GET OFF?', 4.0, 2.0], ['operator', 'FLOOR?', 6.4, 1.8], ['bull', '...THE ROOF.', 9.6, 1.8], ['operator', 'VERY GOOD, SIR.', 11.8, 1.8], 
  ['operator', 'FLOOR?', 0.35, 1.8], ['ploom', 'PROBABILITY OF ARRIVAL: 0%', T_EYE + .4, 2.2], ['operator', '...FLOOR?', T_HUSH + .5, 1.3],
  ['ploom', 'RECALCULATING. BRING HIM UP.', T_THREAD + .35, 1.8], ['bull', 'HERE I COME, P(LOOM).', T_REEL + .6, 2.2], ['operator', 'FLOOR?', T_DOORS + 1.3, 1.6], ['bull', 'ROOF.', T_DOORS + 3.1, 1.4],
];
/* ---------- drawing: the car ---------- */
const BG = document.createElement('canvas'); BG.width = W; BG.height = H;
(function paintCar() {
  const c = BG.getContext('2d');
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  // walnut wall
  R(0, 38, W, 202, '#3a2118');
  for (let x = 0; x < W; x += 3) if ((x * 7) % 11 < 2) R(x, 38, 1, 202, '#341d15');
  const panel = (x, y, w, h) => { R(x, y, w, h, '#2a170f'); R(x + 2, y + 2, w - 4, h - 4, '#4a2a1c'); R(x + 2, y + 2, w - 4, 2, '#5e3a26'); R(x + 2, y + 2, 2, h - 4, '#5a3624');
    for (let i = 0; i < 6; i++) R(x + 8 + i * Math.floor((w - 16) / 6), y + 8, 1, h - 16, '#43251a'); };
  for (const x of [8, 84, 322, 398]) panel(x, 50, 74, 116);
  // wainscot under the rail
  R(0, 182, W, 58, '#2e1912'); for (let x = 6; x < W; x += 14) R(x, 186, 2, 50, '#24130d'); R(0, 182, W, 2, '#4a2a1c');
  // brass rail
  for (const [x0, x1] of [[6, 160], [320, 474]]) { R(x0, 172, x1 - x0, 5, '#8a6420'); R(x0, 172, x1 - x0, 1, '#ffd44a'); R(x0, 173, x1 - x0, 1, '#e0a93a');
    for (const x of [x0 + 6, x1 - 10]) R(x, 177, 4, 8, '#6a4a18'); }
  // ceiling, coffered, with a brass cornice
  R(0, 0, W, 36, '#171012');
  for (let x = 6; x < W; x += 52) { R(x, 6, 44, 22, '#1f1517'); R(x + 3, 9, 38, 16, '#241a1c'); }
  R(0, 32, W, 2, '#6a4a18'); R(0, 34, W, 3, '#c9962e'); R(0, 34, W, 1, '#ffd44a'); R(0, 37, W, 2, '#5a3a12');
  // carpet: RugCo red with gold diamonds
  R(0, FLOOR_Y, W, 30, '#5e1614'); R(0, FLOOR_Y, W, 2, '#c9962e'); R(0, FLOOR_Y + 2, W, 2, '#3a0c0a');
  for (let x = -12; x < W + 24; x += 24) for (let k = 0; k < 6; k++) { R(x + 12 - k, FLOOR_Y + 9 + k, k * 2 + 1, 1, '#7a1d1a'); R(x + 12 - k, FLOOR_Y + 21 - k, k * 2 + 1, 1, '#7a1d1a'); }
  for (let x = 0; x < W; x += 24) R(x + 11, FLOOR_Y + 14, 3, 3, '#c9962e');
  // door frame (bronze)
  R(160, 70, 160, 170, '#2a170f'); R(162, 72, 156, 168, '#6a4a18'); R(164, 74, 152, 166, '#c9962e'); R(166, 76, 148, 164, '#8a6420');
  // the dial's plate
  c.fillStyle = '#8a6420'; c.beginPath(); c.arc(240, 70, 30, Math.PI, 0); c.fill();
  c.fillStyle = '#c9962e'; c.beginPath(); c.arc(240, 70, 28, Math.PI, 0); c.fill();
  // the operator's panel and stool
  R(400, 108, 22, 66, '#5a3a12'); R(402, 110, 18, 62, '#c9962e'); R(402, 110, 18, 1, '#ffd44a');
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { R(405 + j * 8, 116 + i * 10, 5, 5, '#3a2a1a'); R(406 + j * 8, 117 + i * 10, 3, 3, '#f2e6c8'); }
  R(336, 204, 40, 5, '#c9962e'); R(336, 204, 40, 1, '#ffd44a'); R(338, 209, 36, 2, '#6a4a18');
  R(353, 211, 6, 26, '#8a6420'); R(342, 236, 28, 4, '#6a4a18');
  // sconces
  for (const x of [118, 362]) { R(x - 3, 92, 6, 12, '#8a6420'); R(x - 2, 92, 4, 1, '#ffd44a'); }
  // cut the car out of the shaft: open sides, and the car's steel frame
  c.clearRect(0, 0, CAR_L, H); c.clearRect(CAR_R, 0, W - CAR_R, H);
  for (const x of [CAR_L - 6, CAR_R]) { R(x, 0, 6, H, '#1c181e'); R(x + 1, 0, 1, H, '#4a4250'); R(x + 4, 0, 1, H, '#0c0a0e'); for (let y = 8; y < H; y += 24) R(x + 2, y, 2, 2, '#6a6270'); }
  R(CAR_L - 6, H - 6, CAR_R - CAR_L + 12, 6, '#1c181e'); R(CAR_L - 6, H - 6, CAR_R - CAR_L + 12, 1, '#4a4250');
})();

// the shaft either side of the car: brick, guide rails and each floor's landing sliding past
function drawShaftSides(t) {
  const PXL = 96, pos = S.shaft * PXL, dark = lightsOut(t) && t < T_ARRIVE;
  for (const [x0, w] of [[0, CAR_L - 6], [CAR_R + 6, W - CAR_R - 6]]) {
    rect(g, x0, 0, w, H, '#0d0a0f');
    const off = ((pos % 16) + 16) % 16;
    for (let y = -16 + off; y < H; y += 8) { rect(g, x0, Math.round(y), w, 1, '#19141b'); for (let x = x0 + ((Math.round((y - off) / 8)) % 2 ? 6 : 0); x < x0 + w; x += 12) rect(g, x, Math.round(y), 1, 8, '#19141b'); }
    const rx = x0 < 100 ? x0 + w - 8 : x0 + 4; rect(g, rx, 0, 4, H, '#2a2430'); rect(g, rx, 0, 1, H, '#4a4250');
    // landings: a sill, a door's edge, a lamp and the floor's number
    const k0 = Math.floor(S.shaft) - 2;
    for (let k = k0; k < k0 + 5; k++) {
      const y = Math.round(H * .55 + (S.shaft - k) * PXL);
      if (y < -40 || y > H + 20) continue;
      rect(g, x0, y, w, 5, '#3a3440'); rect(g, x0, y, w, 1, '#6a6270');
      rect(g, x0, y - 70, w, 2, '#2a2430');
      const lx = x0 + (x0 < 100 ? 8 : w - 14);
      if (!dark) { glow(lx + 3, y - 60, 16, '#ffcf7a', .35); rect(g, lx, y - 62, 6, 3, '#ffcf7a'); }
      else rect(g, lx, y - 62, 6, 3, '#5a2a20');
      if (x0 < 100) A.txt(g, String(13 + ((k % 86) + 86) % 86), x0 + 4, y - 50, '#6a6270', 1);
    }
    if (Math.abs(speedAt(t)) > 3) for (let i = 0; i < 5; i++) { const yy = ((i * 61 + Math.round(pos * 1.7)) % H + H) % H; rect(g, x0 + 3 + i * 6 % Math.max(1, w - 4), yy, 1, 22, '#2e2834'); }
  }
}
function drawDial(t) {
  const f = floorAt(t), eye = t >= T_EYE + .5 && t < T_ARRIVE;
  // face
  g.fillStyle = eye ? '#140806' : '#f2e6c8'; g.beginPath(); g.arc(240, 70, 24, Math.PI, 0); g.fill();
  if (!eye) {
    for (let i = 0; i <= 10; i++) { const a = Math.PI + i / 10 * Math.PI; line(g, 240 + Math.cos(a) * 20, 70 + Math.sin(a) * 20, 240 + Math.cos(a) * 23, 70 + Math.sin(a) * 23, '#3a2a1a'); }
    A.txt(g, '13', 222, 62, '#3a2a1a', 1); A.txt(g, 'R', 255, 62, '#c8302a', 1);
    const a = Math.PI + clamp((f - 13) / 86, 0, 1) * Math.PI;
    line(g, 240, 69, 240 + Math.cos(a) * 19, 69 + Math.sin(a) * 19, '#c8302a');
    line(g, 241, 69, 241 + Math.cos(a) * 18, 69 + Math.sin(a) * 18, '#c8302a');
    disc(g, 240, 69, 2, '#3a2a1a');
  } else {
    // p(Loom)'s eye fills the dial
    const k = clamp((t - T_EYE - .5) / .5, 0, 1), pulse = .5 + .5 * Math.sin(t * 6);
    g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .35 * k;
    disc(g, 240, 66, 16, '#ff7a2a'); g.restore();
    disc(g, 240, 62, Math.round(14 * k), '#ff7a2a'); disc(g, 240, 62, Math.round(10 * k), '#ffd060');
    disc(g, 240, 62, Math.round(4 + pulse * 2) * (k > .5 ? 1 : 0), '#140806');
  }
  rect(g, 216, 70, 48, 3, '#6a4a18');
}

function drawRoof(t) {
  // the view through the open doors: the storm on the roof and p(Loom) far off
  rect(g, 168, 76, 144, 164, '#0c0a18');
  for (let i = 0; i < 6; i++) rect(g, 168, 76 + i * 14, 144, 14, ['#0b0916', '#100c20', '#151028', '#1c1230', '#241436', '#2b1638'][i]);
  const flash = t > T_DOORS + 1.6 && t < T_DOORS + 1.9 ? 1 : 0;
  if (flash) rect(g, 168, 76, 144, 90, '#6a5a9a');
  // p(Loom): a dark loom-spider shape on the far edge, one orange eye
  g.fillStyle = '#07060c'; g.beginPath(); g.moveTo(206, 172); g.lineTo(222, 128); g.lineTo(258, 128); g.lineTo(274, 172); g.closePath(); g.fill();
  for (const [x0, x1] of [[222, 196], [228, 206], [252, 274], [258, 284]]) line(g, x0, 140, x1, 176, '#07060c');
  disc(g, 240, 140, 4, '#ff7a2a'); disc(g, 240, 140, 2, '#ffd060');
  // the deck
  rect(g, 168, 176, 144, 64, '#1a1820'); for (let y = 180; y < 240; y += 8) rect(g, 168, y, 144, 1, '#24222c');
  rect(g, 168, 176, 144, 2, '#3a3444');
  // rain
  for (let i = 0; i < 40; i++) { const x = 168 + ((i * 37 + Math.floor(t * 300) * 3) % 144), y = 76 + ((i * 53 + Math.floor(t * 600)) % 164); line(g, x, y, x - 2, y + 6, '#5a6a9a'); }
}

function drawDoors(t) {
  const open = t < T_DOORS ? 0 : clamp((t - T_DOORS) / 1.2, 0, 1);
  if (open > 0) drawRoof(t);
  const lw = Math.round(72 * (1 - open));
  if (lw <= 0) return;
  // windows: the shaft rushing past
  for (const [x, leafX] of [[168, 0], [312 - lw, 1]]) {
    rect(g, x, 76, lw, 164, '#2a170f'); rect(g, x + 1, 77, lw - 2, 162, '#7a5a2e');
    // art-deco sunburst
    const cx = leafX ? x : x + lw;
    for (let i = 0; i < 7; i++) { const a = (leafX ? -1 : 1) * (.25 + i * .2); line(g, cx, 236, cx - Math.sin(a) * 60 * (leafX ? -1 : 1) * -1, 236 - Math.cos(a) * 140, '#8a6634'); }
    rect(g, x + 1, 77, lw - 2, 2, '#a07a3e');
    const wx = x + Math.round(lw / 2) - 5;
    if (lw > 16) {
      rect(g, wx - 1, 99, 12, 84, '#2a170f'); rect(g, wx, 100, 10, 82, '#0e0a0c');
      for (let k = 0; k < 4; k++) {
        const y = 100 + ((((S.shaft * 40 + k * 26) % 104) + 104) % 104) - 10;
        if (y > 100 && y < 180) { rect(g, wx, y, 10, 2, lightsOut(t) && t < T_REEL ? '#5a2a20' : '#ffcf7a'); rect(g, wx, y + 2, 10, 1, '#3a2a1a'); }
      }
      const moving = Math.abs(speedAt(t)) > 4;
      if (moving) for (let k = 0; k < 6; k++) { const y = 100 + ((k * 13 + Math.floor(S.t * 90)) % 82); rect(g, wx + 2 + (k % 3) * 3, y, 1, 8, '#4a3a3a'); }
    }
  }
  rect(g, 239, 76, 2, 164, '#2a170f');
}

function drawHatch(t) {
  const x0 = HX - 28;
  rect(g, x0 - 2, 20, 60, 18, '#5a3a12'); rect(g, x0, 22, 56, 14, '#0c0808');
  if (S.hatch <= 0) { for (let x = x0 + 2; x < x0 + 56; x += 6) rect(g, x, 22, 2, 14, '#4a3e3a'); return; }
  // burst open: the grate hangs from one hinge, threads come through
  const fl = Math.round(22 * S.hatch);
  g.fillStyle = '#4a3e3a'; g.beginPath(); g.moveTo(x0, 36); g.lineTo(x0 + 6, 36 + fl); g.lineTo(x0 + 20, 36 + fl + 4); g.lineTo(x0 + 14, 36); g.fill();
}

function drawThreads(t) {
  if (t >= T_REEL && t < T_ARRIVE && Math.floor(t * 30) % 3 === 0) { const ex = [HX - 70, HX + 4, HX + 150][Math.floor(t * 7) % 3], ey = ex === HX + 4 ? 64 : 40; for (let i = 0; i < 2; i++) S.fx.push({ k: 'spark', x: ex, y: ey, vx: (Math.random() - .5) * 120, vy: Math.random() * -60, t: 0, dur: .3 }); }
  if (t < T_THREAD || t >= T_ARRIVE + .4) return;
  const k = clamp((t - T_THREAD) / (T_HOOK - T_THREAD), 0, 1), taut = t >= T_HOOK, gone = t >= T_ARRIVE ? (t - T_ARRIVE) / .4 : 0;
  const ends = [[HX - 70, 40], [HX + 4, 64], [HX + 150, 40]];
  for (const [i, [ex, ey]] of ends.entries()) {
    const wob = taut ? Math.sin(t * 40 + i) * 1.5 : 12 * (1 - k);
    const pts = [];
    for (let s2 = 0; s2 <= 16; s2++) {
      const u = s2 / 16, reach = Math.min(u, k);
      const x = lerp(HX - 8 + i * 8, ex, reach) + Math.sin(u * 9 + t * 7 + i) * wob * (1 - u * .4);
      const y = lerp(-4, ey, reach) - gone * 80 * u;
      pts.push([x, y]);
    }
    glow(pts[16][0], pts[16][1], 10, '#ff7a2a', .5);
    for (let j = 1; j < pts.length; j++) { const [a, b2] = [pts[j - 1], pts[j]]; line(g, a[0] - 1, a[1], b2[0] - 1, b2[1], '#a8401a'); line(g, a[0], a[1], b2[0], b2[1], '#ff7a2a'); line(g, a[0] + 1, a[1], b2[0] + 1, b2[1], '#ffd060'); }
    if (k >= 1 && !gone) { disc(g, ex, ey, 3, '#ff7a2a'); disc(g, ex, ey, 1, '#fff0c0'); }
  }
}
function glow(x, y, r, col, a) {
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore();
}

/* ---------- drawing: the cast ---------- */
function drawOperator(t) {
  const talking = SCRIPT_TALK.some(([w, , t0, d]) => w === 'operator' && t >= t0 && t < t0 + d);
  const lift = Math.round(S.op.lift), x = 338, y = 160 - lift - (talking && Math.floor(t * 8) % 2 ? 1 : 0);
  // a soul at twice the size: one of the Unrugged, on the job since 1987
  g.drawImage(SOUL, x, y, SOUL.width * 2, SOUL.height * 2);
  // bellhop cap: red pillbox, gold band, black visor; it floats on the drop
  const cy = y + 4 - Math.round(S.op.cap);
  rect(g, x + 7, cy - 6, 22, 10, '#1a1418'); rect(g, x + 8, cy - 5, 20, 8, '#c8302a'); rect(g, x + 8, cy - 5, 20, 2, '#e8483a'); rect(g, x + 8, cy + 1, 20, 2, '#ffd44a');
  rect(g, x + 26, cy + 3, 6, 2, '#1a1418');
  // the bellhop's jacket: red, gold buttons, over the lower half of him
  rect(g, x + 4, y + 30, 28, 12, '#1a1418'); rect(g, x + 5, y + 30, 26, 11, '#a8261e'); rect(g, x + 5, y + 30, 26, 1, '#d63428');
  for (const bx of [x + 12, x + 23]) for (const by of [y + 33, y + 37]) rect(g, bx, by, 2, 2, '#ffd44a');
  rect(g, x + 17, y + 30, 2, 11, '#7a1a14');
  // bow tie
  rect(g, x + 14, y + 30, 3, 4, '#c8302a'); rect(g, x + 19, y + 30, 3, 4, '#c8302a'); rect(g, x + 17, y + 31, 2, 2, '#961e16');
}
function drawHelmet(x, y) {
  // a riveted steel pot: dark rim, bright crown, two rivets
  rect(g, x - 15, y - 10, 30, 3, '#1a1418'); rect(g, x - 14, y - 9, 28, 1, '#7c8494');
  rect(g, x - 11, y - 18, 22, 9, '#1a1418'); rect(g, x - 10, y - 17, 20, 8, '#8a93a6'); rect(g, x - 8, y - 16, 10, 2, '#e8edf6');
  px(g, x - 6, y - 12, '#1a1418'); px(g, x + 5, y - 12, '#1a1418');
}
function drawFoes(t) {
  for (const e of S.foes) {
    const flap = Math.sin(t * 18 + e.ph), img = CARP[flap > 0 ? 0 : 1];
    const vx = (e.x - (e.px ?? e.x)) / DT, rearing = !e.swoop && e.swoopT < .4 && !e.drop;
    g.save(); g.translate(Math.round(e.x), Math.round(e.y + (rearing ? Math.sin(t * 60) * 1.5 : 0)));
    const face = e.swoop ? Math.sign(e.swoop.tx - e.swoop.sx) || 1 : (S.bull.x < e.x ? 1 : -1) * -1;
    let rot = clamp(vx * .0025, -.5, .5) + Math.sin(t * 5 + e.ph) * .07;
    if (e.drop) rot = Math.sin(e.age * 9) * .35 + e.spin * .2;
    if (e.swoop) rot = Math.atan2(Math.cos(Math.min(1, e.swoop.t / 1.05) * Math.PI), 1.6) * face * .9;
    g.rotate(rot); g.scale(face < 0 ? -1 : 1, 1);
    g.scale(1 + flap * .06, 1 - flap * .1 + (e.drop ? .12 : 0));
    if (e.hit > 0 || rearing) g.filter = rearing ? 'brightness(1.5) saturate(1.6)' : 'brightness(2.4)';
    g.drawImage(img, -CW / 2, -CH / 2, CW, CH);
    g.restore();
    // a few loose fringe threads trail when it moves fast
    if (Math.abs(vx) > 80 && Math.floor(t * 30 + e.ph) % 4 === 0) S.fx.push({ k: 'fringe', x: e.x - Math.sign(vx) * CW / 2, y: e.y + rr(-4, 4), vx: -vx * .1, vy: 10, t: 0, dur: .4 });
    if (e.armored) drawHelmet(Math.round(e.x), Math.round(e.y - CH / 2 + 12));
  }
  for (const d of S.drops) { g.save(); g.translate(d.x, d.y); g.rotate(d.r); drawHelmet(0, 8); g.restore(); }
}
function drawCrate(t) {
  if (!S.crate || S.crate.got) return;
  const x = Math.round(S.crate.x);
  rect(g, x - 14, FLOOR_Y - 22, 28, 22, '#1a1418'); rect(g, x - 13, FLOOR_Y - 21, 26, 20, '#8c6a44'); rect(g, x - 13, FLOOR_Y - 12, 26, 2, '#6a4a2a');
  rect(g, x - 1, FLOOR_Y - 21, 2, 20, '#6a4a2a'); g.drawImage(HEART, x - Math.round(HEART.width / 2), FLOOR_Y - 12 - Math.round(HEART.height / 2));
}
function drawFx(t) {
  for (const s of S.bolts) { const d = Math.sign(s.vx), x0 = Math.min(s.x, s.x - d * 22);
    rect(g, x0, s.y - 3, 22, 6, '#1f6fa8'); rect(g, x0, s.y - 2, 22, 4, '#3aa8e0'); rect(g, Math.min(s.x, s.x - d * 18), s.y - 1, 18, 2, '#bfefff'); rect(g, s.x - (d > 0 ? 4 : 0), s.y - 2, 4, 4, '#ffffff'); }
  for (const f of S.fx) {
    const k = f.t / f.dur;
    if (f.k === 'spark') { px(g, f.x, f.y, k < .5 ? '#ffd060' : '#ff7a2a'); px(g, f.x + 1, f.y, '#ffd060'); }
    if (f.k === 'fringe') { g.save(); g.globalAlpha = 1 - k; rect(g, f.x, f.y, 3, 1, '#ff9628'); g.restore(); }
    if (f.k === 'puffs') { g.save(); g.globalAlpha = 1 - k; disc(g, f.x, f.y, 2, '#8a8094'); g.restore(); }
    if (f.k === 'half') { g.save(); g.globalAlpha = 1 - k * k; g.translate(f.x, f.y); g.rotate(f.r); g.beginPath(); g.rect(-CW / 2, f.top ? -CH / 2 : 0, CW, CH / 2); g.clip(); g.drawImage(CARP[0], -CW / 2, -CH / 2, CW, CH); g.restore(); }
    if (f.k === 'puff') { g.save(); g.globalAlpha = 1 - k; disc(g, f.x, f.y, Math.round(6 + k * 10), '#fff6e2'); g.restore(); }
  }
  for (const d of S.dust) { g.save(); g.globalAlpha = 1 - d.t / d.dur; px(g, d.x, d.y, '#8a8094'); g.restore(); }
  for (const s of S.souls) {
    if (s.t < 0) continue;
    const k = ease(Math.min(1, s.t / 1.1));
    g.save(); g.globalAlpha = .85; g.drawImage(SOUL, Math.round(lerp(s.x, 436, k)) - 9, Math.round(lerp(s.y, 8, k)) - 11); g.restore();
  }
}
function drawLight(t) {
  // warm by default; browning out; dark and red on the drop; orange threadlight on the reel; back on at the top
  let dark = 0, red = 0;
  if (t >= T_EYE && t < T_FALL) dark = .12 + (Math.floor(t * 14) % 5 === 0 ? .22 : 0) + clamp((t - T_EYE) / 3, 0, 1) * .1;
  if (lightsOut(t)) { const fight = t >= T_REEL; dark = fight ? .08 : .3; red = (fight ? .16 : .3) + (Math.floor(t * 2) % 2 ? .06 : 0); }
  if (t >= T_ARRIVE && t < T_ARRIVE + .3) dark = .2;
  if (dark) { g.save(); g.globalAlpha = dark; rect(g, 0, 0, W, H, '#05030a'); g.restore(); }
  if (red) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = red; rect(g, 0, 0, W, H, '#ff3a2a'); g.restore();
    disc(g, 240, 8, 4, Math.floor(t * 2) % 2 ? '#ff3a2a' : '#7a1a14'); }
  const flick = t >= T_EYE && t < T_FALL && Math.floor(t * 14) % 5 === 0;
  if (!lightsOut(t) && !flick) for (const x of [118, 362]) { glow(x, 86, 46, '#ffcf7a', .35); disc(g, x, 88, 4, '#fff0c0'); }
  if (lightsOut(t)) glow(240, 8, 220, '#ff3a2a', (t >= T_REEL ? .22 : .16) + (Math.floor(t * 2) % 2 ? .08 : 0));
  if (t >= T_THREAD && t < T_ARRIVE) glow(HX, 30, 110, '#ff7a2a', .28 + .08 * Math.sin(t * 9));
  if (t >= T_EYE + .5 && t < T_ARRIVE) glow(240, 64, 44, '#ff7a2a', .45);
  if (t >= T_BRAKE && t < T_BRAKE + .7) { glow(10, 200, 70, '#ffb040', .5); glow(470, 200, 70, '#ffb040', .5); }
  for (const s of S.bolts) glow(s.x, s.y, 12, '#7fd4ff', .5);
}

/* ---------- drawing: the bull, the paper ---------- */
const SP = {}; for (const k in B.SIDES) SP[k] = B.paint(B.SIDES[k]);
const SF = B.SIDE_FEET, SM = B.SIDE_MUZZLE;
const BACKS = [B.paint(B.POSES.runA), B.paint(B.POSES.runB)], FRONT = B.paint(B.VIEWS.front);
function bullPose(t) {
  const b = S.bull;
  if (b.out > 0) return 'back';
  if (S.over === 'rugged' || b.inv > 1.05) return 'hurt';
  if (b.slash >= 0) return b.slash < .07 ? 'wind' : 'cut';
  if (b.y > 0) return 'jump';
  if (b.crouch) return 'crouch';
  if (b.moving) return 'run' + (Math.floor(b.step / 1.6) % 4);
  if (b.still > 6 && (b.still % 8) < 1.4 && t > T_EYE) return 'front';       // a glance at you now and then
  if (b.still > 2.5 && ((b.still - 2.5) % 5) < 1.35) return 'twirl' + (Math.floor(b.still * 12) % 4);   // spins the blaster on his finger
  if (b.still > .7) return Math.floor(b.still * 1.3) % 2 ? 'idle' : 'aim';   // breathing: the blaster dips and comes back up
  return 'aim';
}
function drawBull(t) {
  const b = S.bull;
  if (b.out >= 1 || S.over === 'clear') return;
  const pose = bullPose(t), y = FLOOR_Y - Math.round(b.y);
  if (pose === 'back' || pose === 'front') {
    // walking out he turns to face the roof (from behind, as the roof shows him); idle, he glances at you
    const back = pose === 'back', img = back ? BACKS[Math.floor(b.step / 1.6) % 2] : FRONT, f = back ? B.FEET : B.VIEW_FEET, k = back ? 1 - b.out * .35 : 1;
    g.save(); if (back) g.globalAlpha = Math.min(1, 1.6 - b.out * 1.6);
    g.translate(Math.round(b.x), y - Math.round(b.out * 10)); g.scale(k, k); g.drawImage(img, -f.x, -f.y); g.restore();
    return;
  }
  const img = SP[pose];
  g.save();
  if (b.out > 0) g.globalAlpha = 1 - b.out;
  if (b.inv > 0 && Math.floor(t * 18) % 2) g.globalAlpha *= .35;
  g.translate(Math.round(b.x - b.recoil * 30 * b.face), y); g.scale(b.face, 1);
  if (S.over === 'rugged') g.rotate(-1.35 * Math.min(1, (S.t - S.overT) * 3));
  if (b.land > 0 && pose !== 'jump') g.scale(1.04, .94);
  g.drawImage(img, -SF.x, -SF.y);
  if (b.flash > 0) { const my = SM.y + (b.crouch ? 7 : 0); disc(g, SM.x + 2, my, 4, '#fff6e2'); disc(g, SM.x + 2, my, 2, '#7fd4ff'); }
  g.restore();
  if (b.slash >= 0) {
    const k = b.slash / .2, cx = b.x + b.face * 6, cy = FLOOR_Y - b.y - (b.crouch ? 16 : 30);
    g.save(); g.translate(cx, cy); g.scale(b.face, 1);
    g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 36, -1.4 + k * .5, .9 + k * .5); g.stroke();
    g.strokeStyle = '#7fd4ff'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 31, -1.2 + k * .5, .7 + k * .5); g.stroke();
    g.restore();
  }
}
function drawWads() {
  for (const p of S.wads) {
    g.save(); g.translate(Math.round(p.x), Math.round(p.y)); g.rotate(p.r);
    rect(g, -4, -4, 8, 8, '#1a1418'); rect(g, -3, -3, 6, 6, p.friendly ? '#bfefff' : '#ffe0c8'); px(g, -1, -1, p.friendly ? '#7fd4ff' : '#b8b4a8'); px(g, 1, 1, p.friendly ? '#7fd4ff' : '#b8b4a8');
    g.restore();
    const col = p.friendly ? '#7fd4ff' : '#ff7050', sp = Math.hypot(p.vx, p.vy) || 1;
    for (let i = 1; i <= 3; i++) { g.save(); g.globalAlpha = .45 / i; rect(g, p.x - p.vx / sp * i * 5 - 2, p.y - p.vy / sp * i * 5 - 2, 4, 4, col); g.restore(); }
    glow(p.x, p.y, 16, col, .7); glow(p.x, p.y, 7, '#fff0c0', .5);
  }
}
function drawExit(t) {
  if (t < T_DOORS + 1.2 || S.over) return;
  const bob = Math.round(Math.sin(t * 5) * 2);
  otxt('ROOF', 240, 92 + bob, '#ffd44a', 2, 'center');
  rect(g, 236, 106 + bob, 9, 3, '#ffd44a'); rect(g, 238, 109 + bob, 5, 2, '#ffd44a'); px(g, 240, 111 + bob, '#ffd44a');
}

/* ---------- the cut-ins: above the car ---------- */
const CUT = { x0: 70, y0: 18, w: 340, h: 160 };
function drawShaft(o) {
  const { x0, y0, w, h } = CUT, base = y0 + 118, cwBase = y0 + 62, wx = 240, wy = y0 + 28, R = 18;
  g.save(); g.globalAlpha = .6; rect(g, 0, 0, W, H, '#05030a'); g.restore();
  rect(g, x0 - 4, y0 - 4, w + 8, h + 8, '#1a1418'); rect(g, x0 - 2, y0 - 2, w + 4, h + 4, '#c9962e');
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
  rect(g, x0, y0, w, h, '#120e14');
  const off = ((Math.round(o.scroll) % 16) + 16) % 16;
  for (let y = y0 - 16 + off; y < y0 + h; y += 8) { rect(g, x0, y, w, 1, '#1e1820'); for (let x = x0 + ((Math.floor((y - off) / 8)) % 2 ? 12 : 0); x < x0 + w; x += 24) rect(g, x, y, 1, 8, '#1e1820'); }
  if (Math.abs(o.speed) > .5) for (let i = 0; i < 10; i++) { const y = y0 + ((i * 37 + Math.round(o.scroll * 3)) % h + h) % h; rect(g, x0 + 10 + i * 31, y, 1, 14, '#3a3040'); }
  for (const rx of [126, 318]) { rect(g, rx, y0, 6, h, '#2e2830'); rect(g, rx, y0, 1, h, '#4a4250'); }
  // the machine beam and the sheave
  rect(g, x0, y0, w, 8, '#2e2830'); rect(g, x0, y0 + 8, w, 1, '#4a4250'); rect(g, wx - 3, y0 + 8, 6, wy - y0 - 8, '#2e2830');
  const cab = o.taken >= 1 ? '#ff7a2a' : '#9a9aa4', cabHi = o.taken >= 1 ? '#ffd060' : '#d8d8e0';
  // the cable over the wheel
  g.strokeStyle = o.taken > .25 ? '#ff7a2a' : '#9a9aa4'; g.lineWidth = 3; g.beginPath(); g.arc(wx, wy, R, Math.PI, 0); g.stroke();
  disc(g, wx, wy, R - 2, '#3a3438'); disc(g, wx, wy, R - 5, '#26222a');
  for (let i = 0; i < 4; i++) { const a = o.angle + i * Math.PI / 2; line(g, wx, wy, wx + Math.cos(a) * (R - 3), wy + Math.sin(a) * (R - 3), '#8a8494'); }
  disc(g, wx, wy, 3, '#c9962e');
  // the car's side of the cable (left), the counterweight's side (right)
  const lx = wx - R, rx2 = wx + R, carTop = o.roofY - 8;
  const takenTo = lerp(wy, carTop, clamp(o.taken, 0, 1));
  for (let y = wy; y < Math.min(carTop, y0 + h); y += 2) {
    const mine = y <= takenTo, wob = o.slack ? Math.sin(y * .08 + o.t * 18) * o.slack : 0;
    rect(g, lx - 1 + wob, y, 3, 2, mine && o.taken > 0 ? '#ff7a2a' : '#9a9aa4'); rect(g, lx - 1 + wob, y, 1, 2, mine && o.taken > 0 ? '#ffd060' : '#d8d8e0');
  }
  for (let y = wy; y < Math.min(o.cwY, y0 + h); y += 2) { rect(g, rx2 - 1, y, 3, 2, o.taken > .25 ? '#ff7a2a' : '#9a9aa4'); }
  // the coils: p(Loom)'s thread wound down the cable
  if (o.taken > 0 && o.taken < 1.5) for (let y = wy + 4; y < takenTo; y += 6) { const ph = Math.floor((y + o.t * 80) / 6) % 2; line(g, lx - 5, y, lx + 5, y + 3, ph ? '#ffd060' : '#ff7a2a'); }
  // the counterweight
  rect(g, rx2 - 11, o.cwY, 22, 34, '#1a1418'); rect(g, rx2 - 10, o.cwY + 1, 20, 32, '#4a4250'); for (let i = 0; i < 4; i++) rect(g, rx2 - 10, o.cwY + 4 + i * 8, 20, 1, '#2e2830');
  // the car's roof: crosshead, hatch, and the RugCo plate
  const cx = lx;
  rect(g, cx - 82, o.roofY, 164, 60, '#2a1d18'); rect(g, cx - 82, o.roofY, 164, 3, '#c9962e'); rect(g, cx - 82, o.roofY + 3, 164, 1, '#6a4a18');
  rect(g, cx - 16, carTop, 32, 8, '#3a3030'); rect(g, cx - 4, carTop - 4, 8, 4, '#4a4250');
  rect(g, cx - 66, o.roofY + 8, 40, 10, '#0c0808'); for (let x = cx - 64; x < cx - 26; x += 6) rect(g, x, o.roofY + 8, 2, 10, '#3a3030');
  // p(Loom) itself, up on the roof: its eye glowing at the top of the shaft, and its threads running down from it
  const EX = x0 + w - 44, EY = y0 + 22, pulse = .5 + .5 * Math.sin(o.t * (o.taut ? 14 : 6));
  rect(g, EX - 26, y0, 52, 8, '#0c0a10');
  glow(EX, EY, 34, '#ff7a2a', .35 + .3 * pulse);
  disc(g, EX, EY, 9, '#3a1408'); disc(g, EX, EY, 7, '#ff7a2a'); disc(g, EX, EY, 5, '#ffd060'); disc(g, EX, EY, Math.round(2 + pulse), '#140806');
  otxt('P(LOOM)', EX, EY + 13, '#ff9a3c', 1, 'center');
  if (o.taut) { otxt('ON THE ROOF', EX, y0 + 2, '#ff9a3c', 1, 'center'); }
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const sx = EX - 4 + i * 4, sy = EY + 4;   // every thread runs back to p(Loom), up on the roof
    const ex = o.taut ? wx + Math.cos(-.6 - i * .5) * R : lx + 2, ey = o.taut ? wy + Math.sin(-.6 - i * .5) * R : wy + 18 + i * 10;
    const reach = o.threads;
    let px0 = sx, py0 = sy;
    for (let sgm = 1; sgm <= 22; sgm++) {
      const u = sgm / 22; if (u > reach) break;
      const wv = o.taut ? Math.sin(u * 30 + o.t * 60) * .8 : Math.sin(u * 10 + o.t * 7 + i) * 6 * (1 - u);
      const x = lerp(sx, ex, u), y = lerp(sy, ey, u) + wv;
      line(g, px0, py0, x, y, '#ff7a2a'); line(g, px0, py0 + 1, x, y + 1, '#a8401a'); px0 = x; py0 = y;
    }
  }
  if (o.flare) glow(lx, wy + 40, 50, '#ff7a2a', o.flare);
  g.restore();
  g.restore();
  otxt('ABOVE THE CAR', x0 + 10, y0 + 14, '#c9962e', 2);
  if (o.caption) otxt(o.caption, x0 + w / 2, y0 + h - 18, o.capCol || '#ffd060', 2, 'center');
  if (o.arrow) { const ax = wx - R - 34, ay = y0 + 72 + Math.round(Math.sin(o.t * 14) * 4);
    for (let i = 0; i < 3; i++) { const yy = ay + i * 10; for (let r = 0; r < 6; r++) rect(g, ax - (o.arrow > 0 ? 6 - r : r), yy + r, (o.arrow > 0 ? 6 - r : r) * 2 + 1, 1, i === Math.floor(o.t * 10) % 3 ? '#ffd060' : '#a8401a'); } }
}
function drawCut(t) {
  const base = CUT.y0 + 118, cwBase = CUT.y0 + 62;
  if (t >= T_CUT && t < T_FALL) {
    const k = t - T_CUT, let_ = k >= T_SNAP - T_CUT, d = let_ ? k - (T_SNAP - T_CUT) : 0;
    drawShaft({ t, roofY: base + d * d * 520, cwY: cwBase - d * d * 520, angle: let_ ? 1.4 - d * d * 26 : k * 1.2,
      taken: clamp((k - .55) / .55, 0, 1), threads: clamp((k - .15) / .45, 0, 1), slack: let_ ? 2 : 0, taut: false,
      scroll: let_ ? -d * d * 520 : k * 12, speed: let_ ? 9 : 0, flare: let_ && d < .25 ? .7 * (1 - d / .25) : 0,
      caption: k < .15 ? '' : !let_ ? 'P(LOOM) TAKES THE CABLE' : 'AND LETS GO', capCol: !let_ ? '#ff9a3c' : '#ffd060', arrow: let_ ? 1 : 0 });
  } else if (t >= T_HOOK && t < T_REEL + .15) {
    const k = clamp((t - T_HOOK) / (T_REEL - T_HOOK), 0, 1), e = ease(k);
    drawShaft({ t, roofY: lerp(CUT.y0 + CUT.h + 40, base, e), cwY: lerp(CUT.y0 - 40, cwBase, e), angle: k * k * 30,
      taken: 1, threads: 1, slack: 0, taut: true, scroll: e * 160, speed: 9, flare: .3,
      caption: 'AND REELS YOU IN', capCol: '#ffd060', arrow: -1 });
  }
}

/* ---------- HUD, captions, cards ---------- */
function drawHud(t) {
  const b = S.bull;
  // the charge bar under the hearts, as in the game: blue, red when low, white when a deflect tops it up
  const ch = S.charge / CHARGES, blink = Math.floor(S.t * 10) % 2, inCut = (t >= T_CUT && t < T_FALL) || (t >= T_HOOK && t < T_REEL + .15);
  if (!inCut) {
  rect(g, 6, 30, 102, 8, '#1a1418'); rect(g, 8, 32, 98, 4, '#2a2230');
  rect(g, 8, 32, Math.round(98 * ch), 4, S.chargeFlash > 0 ? '#ffffff' : ch < .25 ? '#ff7050' : '#7fd4ff');
  if (S.charge < 1 && (S.empty > 0 || blink)) rect(g, 8, 32, 98, 4, '#d63428');
  }
  for (let i = 0; i < HEARTS; i++) g.drawImage(i < b.hearts ? HEART : (A.HEART_EMPTY || HEART), 8 + i * (HEART.width + 4), 8);
  g.drawImage(SOUL, 412, 4); otxt(String(S.shown), 434, 10, '#fff6e2', 2);
  if (S.pop) otxt(S.pop.text, S.pop.x, S.pop.y, S.pop.col || '#ffd44a', 2, 'center');
}
function bubble(text, x, y, tailX) {
  const w = tw(text) + 12, h = 20; x = clamp(Math.round(x - w / 2), 4, W - w - 4);
  rect(g, x - 2, y - 2, w + 4, h + 4, '#1a1418'); rect(g, x, y, w, h, '#fff6e2'); txt(text, x + 6, y + 5, '#1a1418', 2);
  rect(g, tailX - 3, y + h, 8, 2, '#1a1418'); rect(g, tailX - 1, y + h, 4, 2, '#fff6e2'); rect(g, tailX - 1, y + h + 2, 4, 2, '#1a1418');
}
function drawTalk(t) {
  for (const [who, text, t0, dur] of SCRIPT_TALK) {
    if (t < t0 || t > t0 + dur) continue;
    const n = Math.min(text.length, Math.floor((t - t0) * 22) + 1), s = text.slice(0, n);
    if (who === 'ploom') {
      rect(g, 0, H - 30, W, 30, '#140806'); rect(g, 0, H - 30, W, 2, '#ff7a2a');
      disc(g, 18, H - 15, 7, '#ff7a2a'); disc(g, 18, H - 15, 4, '#ffd060'); disc(g, 18, H - 15, 2, '#140806');
      otxt('P(LOOM)', 34, H - 22, '#ff7a2a', 1); otxt(s, 34, H - 14, '#ffd060', 2);
    } else if (who === 'operator') bubble(s, 356, 128 - Math.round(S.op.lift) - Math.round(S.op.cap), 356);
    else bubble(s, S.bull.x, 132 - Math.round(S.bull.y), Math.round(S.bull.x));
  }
}

/* ---------- one frame ---------- */
function draw() {
  const t = S.t, sh = shakeAt(t) + S.hurtShake * 16;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  rect(g, 0, 0, W, H, '#000');
  const ox = sh ? Math.round(Math.sin(t * 71) * sh) : 0, oy = sh ? Math.round(Math.cos(t * 53) * sh) : 0;
  g.translate(ox, oy);
  drawShaftSides(t); g.drawImage(BG, 0, 0);
  drawDial(t); drawDoors(t); drawHatch(t);
  drawOperator(t); drawCrate(t); drawFoes(t); drawBull(t); drawWads(); drawFx(t);
  drawLight(t); drawThreads(t); drawExit(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  drawCut(t);
  drawHud(t); drawTalk(t);
  if (S.over) { g.save(); g.globalAlpha = clamp((t - S.overT) / .6, 0, .78); rect(g, 0, 0, W, H, '#000'); g.restore(); }
}
function step() {
  if (S.over) { S.t += DT; stepFx(); if (S.t - S.overT > .7) showCard(); return; }
  const t = S.t;
  for (const [ct, fn] of CUES) if (!S.fired.has(ct) && t >= ct) { S.fired.add(ct); if (live && t - ct < .25) fn(); }
  S.shaft += speedAt(t) * DT;
  stepScript(t); stepBull(t); stepFight(t); stepFx();
  S.t += DT;
}

/* ---------- audio: the storyboard's chip synth ---------- */
let soundOn = true;
const HORNS = TRACKS.horns.sections.map(compile);
HORNS[1].onStart = null;   // the cable already snapped; the reel starts on the power chords
const Music = {
  si: 0, step: 0, next: 0, timer: 0, out: null, lp: null, drive: null, hold: false,
  start(si, hold) {
    audio(); if (!AC || !soundOn) return; this.stop();
    this.si = si; this.step = 0; this.hold = hold; this.next = AC.currentTime + .05;
    this.out = AC.createGain(); this.lp = AC.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 9000;
    this.out.connect(this.lp).connect(musicBus);
    this.drive = AC.createGain(); this.drive.gain.value = 8;
    const sh = AC.createWaveShaper(), cu = new Float32Array(1024); for (let i = 0; i < 1024; i++) cu[i] = Math.tanh(4 * (i / 511.5 - 1)); sh.curve = cu;
    const post = AC.createGain(); post.gain.value = .26; const cab = AC.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = 3800;
    this.drive.connect(sh).connect(cab).connect(post).connect(this.out);
    this.timer = setInterval(() => this.pump(), 25); this.pump();
  },
  pump() {
    if (!this.out) return;
    if (this.next < AC.currentTime - .1) this.next = AC.currentTime + .05;
    while (this.next < AC.currentTime + .12) {
      const Sx = HORNS[this.si], t = this.next;
      for (const ch of Sx.chans) { const evs = ch.byStep[this.step]; if (evs) for (const e of evs) osc(ch.drive ? this.drive : this.out, ch.wave, hz(e.m), t, e.len * Sx.stepDur * (e.g || ch.gate || .9), ch.vol, { vib: ch.vib }); }
      const d = Sx.drums[this.step]; if (DRUM[d]) DRUM[d](t, this.out);
      if (Sx.crash.has(this.step)) DRUM.c(t, this.out);
      this.next += Sx.stepDur; this.step++;
      if (this.step >= Sx.steps) { this.step = 0; if (!this.hold) this.si = this.si + 1 < HORNS.length ? this.si + 1 : 2; }
    }
  },
  stop() { clearInterval(this.timer); this.timer = 0; if (this.out) { const o = this.out; o.gain.setTargetAtTime(0, AC.currentTime, .015); setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 300); } this.out = null; },
  brownout() { if (!this.out) return; const n = AC.currentTime; this.lp.frequency.setValueAtTime(9000, n); this.lp.frequency.exponentialRampToValueAtTime(380, n + 2.3); this.out.gain.setValueAtTime(1, n); this.out.gain.linearRampToValueAtTime(.55, n + 2.3); },
  heavy(at) { this.start(1, false); },
  muzak() { this.start(0, true); },
};
const Sfx = {
  shot() { const t = AC.currentTime; osc(musicBus, 'p25', 1400, t, .07, .05, { to: 500 }); },
  slash() { const t = AC.currentTime; noiseHit(musicBus, t, .12, .12, 'highpass', 3200); },
  clank() { const t = AC.currentTime; noiseHit(musicBus, t, .1, .25, 'highpass', 2800); osc(musicBus, 'square', 780, t, .14, .06, { to: 720 }); osc(musicBus, 'square', 1170, t, .1, .04); },
  poof() { const t = AC.currentTime; noiseHit(musicBus, t, .18, .1, 'bandpass', 1200, 1); osc(musicBus, 'triangle', 600, t, .2, .06, { to: 1200 }); },
  power() { const t = AC.currentTime; [523, 659, 784, 1046].forEach((f, i) => osc(musicBus, 'p25', f, t + i * .06, .12, .07)); },
  creak() { const t = AC.currentTime; osc(musicBus, 'sawtooth', 70, t, 1, .05, { to: 55 }); noiseHit(musicBus, t, .9, .05, 'bandpass', 400, 6); },
  snap() { const t = AC.currentTime; SFX.snap(t, musicBus); noiseHit(musicBus, t, .3, .5, 'lowpass', 800); },
  wind() { const t = AC.currentTime; for (let i = 0; i < 6; i++) osc(musicBus, 'p25', 220 + i * 40, t + i * .1, .09, .05, { to: 330 + i * 40 }); },
  slack() { const t = AC.currentTime; osc(musicBus, 'sawtooth', 420, t, .6, .12, { to: 60 }); noiseHit(musicBus, t, .5, .2, 'bandpass', 700, 3); },
  fall() { const t = AC.currentTime; osc(musicBus, 'p50', 900, t, 1.8, .06, { to: 120, sustain: 1 }); for (let i = 0; i < 18; i++) noiseHit(musicBus, t + i * .1, .08, .12, 'bandpass', 600 + (i % 3) * 300, 2);
    for (let i = 0; i < 4; i++) osc(musicBus, 'square', 1100, t + i * .4, .2, .05); },
  brake() { const t = AC.currentTime; noiseHit(musicBus, t, .8, .4, 'bandpass', 3400, 4); osc(musicBus, 'sawtooth', 1800, t, .7, .05, { to: 1300 }); osc(musicBus, 'sine', 90, t + .55, .4, .8, { to: 30 }); noiseHit(musicBus, t + .55, .4, .5, 'lowpass', 500); },
  burst() { const t = AC.currentTime; noiseHit(musicBus, t, .3, .4, 'lowpass', 1200); SFX.slide(t + .1, musicBus); },
  hook() { const t = AC.currentTime; for (let i = 0; i < 3; i++) { osc(musicBus, 'p25', 300 + i * 80, t + i * .09, .1, .1, { to: 90 }); noiseHit(musicBus, t + i * .09, .06, .2, 'highpass', 3000); } },
  jump() { const t = AC.currentTime; osc(musicBus, 'p50', 260, t, .12, .06, { to: 520 }); },
  hurt() { const t = AC.currentTime; osc(musicBus, 'square', 220, t, .22, .1, { to: 90 }); noiseHit(musicBus, t, .15, .2, 'lowpass', 900); },
  empty() { const t = AC.currentTime; osc(musicBus, 'square', 140, t, .05, .05); },
  drained() { const t = AC.currentTime; osc(musicBus, 'p25', 520, t, .25, .07, { to: 130 }); },
  ready() { const t = AC.currentTime; osc(musicBus, 'p25', 660, t, .08, .06); osc(musicBus, 'p25', 990, t + .08, .1, .06); },
  swoop() { const t = AC.currentTime; noiseHit(musicBus, t, .45, .1, 'bandpass', 900, 1.5); osc(musicBus, 'p25', 700, t, .4, .04, { to: 260 }); },
  throw() { const t = AC.currentTime; noiseHit(musicBus, t, .08, .06, 'bandpass', 2400, 2); },
  deflect() { const t = AC.currentTime; osc(musicBus, 'p25', 880, t, .12, .08, { to: 1760 }); noiseHit(musicBus, t, .06, .12, 'highpass', 4000); },
  crate() { const t = AC.currentTime; noiseHit(musicBus, t, .8, .08, 'lowpass', 500); },
  rugged() { const t = AC.currentTime; [392, 330, 262, 196].forEach((f, i) => osc(musicBus, 'p50', f, t + i * .16, .2, .08)); },
  reel() { const t = AC.currentTime; osc(musicBus, 'sawtooth', 60, t, .9, .12, { to: 420 }); for (let i = 0; i < 8; i++) noiseHit(musicBus, t + i * .1, .06, .1, 'bandpass', 900 + i * 150, 3); },
  slam() { const t = AC.currentTime; osc(musicBus, 'sine', 110, t, .5, .9, { to: 30 }); noiseHit(musicBus, t, .5, .5, 'lowpass', 600); },
  ding() { const t = AC.currentTime; osc(musicBus, 'sine', 1318, t, 1.4, .18, { sustain: .2 }); osc(musicBus, 'triangle', 1046, t + .25, 1.6, .14, { sustain: .2 }); },
  doors() { const t = AC.currentTime; noiseHit(musicBus, t, 1.2, .08, 'lowpass', 300); noiseHit(musicBus, t + .4, 3, .06, 'bandpass', 5000, .3); },
  thunder() { const t = AC.currentTime; noiseHit(musicBus, t + .1, 1.6, .4, 'lowpass', 380, .8); osc(musicBus, 'sine', 58, t + .15, 1.2, .2, { to: 27 }); },
};
for (const k of Object.keys(Sfx)) { const f = Sfx[k]; Sfx[k] = (...a) => { if (!AC || !soundOn) return; try { f(...a); } catch (e) {} }; }
const BLIP = { operator: { f: 300, wave: 'p25', ms: 52 }, bull: { f: 165, wave: 'p50', ms: 46 } };
let samVoice = null;
function say(who, text, samText) {
  if (!AC || !soundOn) return;
  if (who === 'ploom' && window.SamJs) {
    try {
      samVoice = samVoice || new window.SamJs({ speed: 62, pitch: 52, throat: 190, mouth: 190 });
      const b = samVoice.buf32(samText || text);
      if (b && b.length) { const ab = AC.createBuffer(1, b.length, 22050); ab.copyToChannel(b, 0); const s = AC.createBufferSource(); s.buffer = ab; s.playbackRate.value = 1.06; s.connect(voiceBus); s.start(); return; }
    } catch (e) {}
  }
  const V = BLIP[who] || { f: 880, wave: 'p12', ms: 30 };
  let t = AC.currentTime + .03;
  for (const ch of text) { if (/[a-z0-9]/i.test(ch)) { const k = (ch.toLowerCase().charCodeAt(0) * 7) % 5; osc(voiceBus, V.wave, V.f * (1 + k * .08), t, V.ms / 1000 * .75, .085, { sustain: .6 }); t += V.ms / 1000; } else if (/[.,!?:]/.test(ch)) t += .2; else t += .035; }
}
// music for wherever the scene is
function musicFor(t) {
  if (!AC || !soundOn) return;
  Music.stop();
  if (t < T_CUT) { Music.muzak(); if (t >= T_EYE) Music.brownout(); }
  else if (t >= T_REEL && t < T_ARRIVE) Music.heavy();
}

/* ---------- playback, cards, controls ---------- */
const clockEl = document.getElementById('clock'), nowEl = document.getElementById('now');
const playBtn = document.getElementById('play'), startBtn = document.getElementById('start'), sndBtn = document.getElementById('snd');
const beatsEl = document.getElementById('beats'), card = document.getElementById('card'), cardTitle = document.getElementById('cardTitle'), cardText = document.getElementById('cardText');
const retryBtn = document.getElementById('retry'), againBtn = document.getElementById('again');
const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
BEATS.forEach(b => {
  const li = document.createElement('li'); li.dataset.id = b.id;
  li.innerHTML = `<button type="button"><span class="tm">${fmt(b.t)}</span><span><span class="bt"></span><span class="bd"></span></span></button>`;
  li.querySelector('.bt').textContent = b.title; li.querySelector('.bd').textContent = b.d;
  li.querySelector('button').addEventListener('click', () => { seek(b.t); play(); document.getElementById('stage').scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  beatsEl.appendChild(li);
});
let playing = false, last = 0, acc = 0, lastBeat = null, shown = false;
function seek(t) {
  live = false; reset(); hideCard(); clearInput();
  while (S.t < t) step();
  live = true; acc = 0; draw(); ui();
  if (playing) musicFor(S.t);
}
function ui() {
  clockEl.textContent = fmt(S.t);
  const b = beatAt(S.t);
  if (b !== lastBeat) { lastBeat = b; nowEl.textContent = b.title; beatsEl.querySelectorAll('li').forEach(li => li.classList.toggle('on', li.dataset.id === b.id)); }
}
function frame(now) {
  if (!playing) return;
  const dt = Math.min(.1, (now - last) / 1000); last = now; acc += dt;
  while (acc >= DT) { acc -= DT; step(); }
  draw(); ui();
  if (playing) requestAnimationFrame(frame);
}
function play() {
  startBtn.hidden = true; audio();
  if (!playing) { playing = true; last = performance.now(); if (!S.over) musicFor(S.t); requestAnimationFrame(frame); }
  playBtn.textContent = 'Pause';
}
function pause() { playing = false; Music.stop(); clearInput(); playBtn.textContent = 'Play'; }
function showCard() {
  if (shown) return; shown = true; Music.stop();
  if (S.over === 'rugged') {
    cardTitle.textContent = 'Rugged.';
    cardText.textContent = 'Back to the threads with full hearts, or the whole ride from the top?';
    retryBtn.hidden = false; retryBtn.textContent = 'Try the fight again';
  } else {
    const freed = S.shown - S.start;
    cardTitle.textContent = 'The roof';
    cardText.textContent = `${freed} souls freed on the way up. ${S.lost ? S.lost + (S.lost === 1 ? ' heart' : ' hearts') + ' lost.' : 'Not a scratch.'}${!S.crate || !S.crate.got ? ' You left the crate behind.' : S.crate.gave === 'souls' ? ' The crate had ' + CRATE_SOULS + ' more in it.' : ' Topped up for the roof.'}`;
    retryBtn.hidden = true;
  }
  card.hidden = false; (retryBtn.hidden ? againBtn : retryBtn).focus({ preventScroll: true });
}
function hideCard() { card.hidden = true; shown = false; }
retryBtn.addEventListener('click', () => { seek(T_THREAD); play(); });
againBtn.addEventListener('click', () => { seek(0); play(); });
startBtn.addEventListener('click', () => { seek(0); play(); try { document.querySelector('.stage').scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} });
playBtn.addEventListener('click', () => { if (playing) pause(); else play(); });
document.getElementById('restart').addEventListener('click', () => { seek(0); play(); });
sndBtn.addEventListener('click', () => { soundOn = !soundOn; sndBtn.setAttribute('aria-pressed', String(soundOn)); sndBtn.textContent = soundOn ? 'Sound on' : 'Sound off'; if (!soundOn) Music.stop(); else if (playing && !S.over) { audio(); musicFor(S.t); } });
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });

// at rest: a still from the heavy part of the ride, so the page reads before anyone presses play
reset(); live = false; while (S.t < 33) step(); live = true; draw(); ui(); playBtn.textContent = 'Play';
window.__ride = { seek, get S() { return S; }, draw, keys, press, step, get live() { return live; } };

})();