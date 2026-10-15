// Roof presentation only. This pool never uses the outcome stream or changes fight timers.
var UnrugRoofEffects = function (core, tuning, spot) {
  'use strict';
  const { A, clamp, disc, line, world, PX, FY, YH, sc, muzzleXY } = core;
  const C = tuning.effects, LM = tuning.art;
  let souls = [], clock = 0, kick = 0, decay = 1, heldUntil = 0, flashes = 0, dawnBase = 0, dawnStarts = [], spool = null;
  const flights = new WeakMap(), wisps = new WeakMap();
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  const silhouette = A.canvas(A.GHOST.width, A.GHOST.height), ink = silhouette.getContext('2d');
  ink.drawImage(A.GHOST, 0, 0); ink.globalCompositeOperation = 'source-in';
  ink.fillStyle = '#13111c'; ink.fillRect(0, 0, silhouette.width, silhouette.height);
  function add() {
    const i = souls.length, p = spot(i), row = Math.floor(i % (LM.warpRows * LM.warpColumns) / LM.warpColumns);
    const s = { x: p.x + (Math.random() - .5) * C.jitterX, y: p.y + (Math.random() - .5) * C.jitterY,
      phase: Math.random() * Math.PI * 2, rate: .65 + Math.random() * .45,
      bend: (Math.random() - .5) * C.curve, size: LM.soulScale * (.8 + row * .045),
      bright: .62 + row * .055, arrived: -10 };
    souls.push(s); return i;
  }
  function reset(n) { souls = []; clock = 0; kick = 0; heldUntil = 0; flashes = 0; dawnBase = 0; dawnStarts = []; spool = null; while (souls.length < n) add(); }
  // The reset: it winds three new spools from the souls it caught. Each soul leaves its slot in turn and flies up into
  // a spool; the last three go to the middle, left and right spools, the ones that tear loose for the bells.
  function respoolStart(Q) { spool = { start: clock, n: Q.capturedTotal }; }
  function respoolAll(Q) { spool = { start: clock - 99, n: Q.capturedTotal }; }
  function spoolOf(i) { const j = spool.n - 1 - i; return j === 0 ? 1 : j === 1 ? 0 : j === 2 ? 2 : i % 3; }
  function spoolPoint(i) { const k = spoolOf(i); return { x: LM.spools[k] - LM.spoolW / 2 + 2 + (i * 7) % (LM.spoolW - 4), y: LM.top + 1 + (i * 3) % 5 }; }
  function spoolTime(i) {
    const span = tuning.reset.respool - C.respoolFly, dep = spool.start + i / Math.max(1, spool.n - 1) * span;
    return { dep, arr: dep + C.respoolFly };
  }
  const spooled = i => spool && i < spool.n && clock >= spoolTime(i).arr;
  function slot(i, t = clock) {
    const s = souls[i];
    if (!s) return spot(i);
    return { x: s.x + Math.sin(t * s.rate + s.phase) * C.sway,
      y: s.y + Math.sin(t * s.rate * .8 + s.phase * 1.7) * C.bob };
  }
  function shake(intensity, seconds) { if (intensity > kick) { kick = intensity; decay = intensity / seconds; } }
  function tick(dt, Q, R, beam) {
    clock += dt; if (!Q.cut) kick = Math.max(0, kick - dt * decay);
    if (Q.state === 'walk') while (flashes < C.distant.length && Q.t >= C.distant[flashes]) { flashes++; core.Snd.play('thunder', .35); }
    if (Q.state === 'pinch') shake(Math.min(1, Q.t / C.pinchBuild) * C.shake.pinch, .12);
    if (beam) shake(Q.onEye ? C.shake.beamEye : C.shake.beam, .1);
    core.Snd.roofSound({ storm: !['dawn', 'ending', 'clear'].includes(Q.state) && R.phase !== 'dead', beam: beam && R.phase !== 'dead', onEye: !!Q.onEye,
      gust: Q.gust ? clamp(Q.gust.t / tuning.gustTell, 0, 1) : 0 });
  }
  function offset(R) {
    const k = Math.max(kick, Math.min(1, R.shake * 4) * 3) * (reduced && reduced.matches ? .5 : 1);
    return [Math.round((Math.random() - .5) * k * 2), Math.round((Math.random() - .5) * k)];
  }
  function entry(name, Q, R) {
    if (name === 'dawn') dawnBase = R.shown;
    if (name === 'fusion') shake(C.shake.fusion, .55);
    if (name === 'snap') shake(C.shake.snap, C.snapDecay);
    if (name === 'return' || name === 'flood') Q.flights.forEach((f, j) => {
      const i = (name === 'return' ? Q.caught : Q.floodFrom) - 1 - j;
      flights.set(f, { i, from: spooled(i) ? spoolPoint(i) : slot(i), start: name === 'flood' ? ((i % (LM.warpRows * LM.warpColumns) * 37 % (LM.warpRows * LM.warpColumns)) / (LM.warpRows * LM.warpColumns - 1) * .9 + souls[i].phase / (Math.PI * 2) * .1) * C.departSpan : f.delay,
        end: f.delay + tuning.returnFly });
    });
  }
  function flash(Q) {
    if (Q.state === 'flash') return Q.t < tuning.rise.bolt ? 0 : Math.exp(-(Q.t - tuning.rise.bolt) / C.flashDecay);   // the lightning as it rises
    if (Q.state !== 'walk') return 0;
    return C.distant.reduce((v, t) => Q.t >= t ? Math.max(v, .3 * Math.exp(-(Q.t - t) / C.flashDecay)) : v, 0);
  }
  function capture(f) { const i = add(); wisps.set(f, i); f.to = slot(i); }
  function landed(f) { const i = wisps.get(f); if (i !== undefined) souls[i].arrived = clock; }
  function wispMotion(f) {
    const i = wisps.get(f); if (i === undefined) return false;
    const k = clamp(f.t / f.dur, 0, 1), e = k * k * (3 - 2 * k), to = slot(i), s = souls[i];
    f.x = f.sx + (to.x - f.sx) * e + Math.sin(k * Math.PI) * s.bend;
    f.y = f.sy + (to.y - f.sy) * e - Math.sin(k * Math.PI) * C.captureLift; return true;
  }
  function departure(Q, i) {
    if (!['return', 'flood'].includes(Q.state)) return null;
    const j = (Q.state === 'return' ? Q.capturedTotal : Q.floodFrom) - 1 - i;
    const f = (Q.flights || [])[j]; return f && flights.get(f);
  }
  function drawSoul(g, i, p, alpha, dark = false, size) {
    const s = souls[i]; if (!s) return;
    g.save(); g.globalAlpha = clamp(alpha, 0, 1);
    const k = size || s.size;
    g.drawImage(dark ? silhouette : A.GHOST, p.x, p.y, A.uw(A.GHOST) * k, A.uh(A.GHOST) * k); g.restore();
  }
  function drawWarp(g, Q) {
    if (['pinch', 'fusion', 'lines', 'beam', 'run', 'one', 'snap', 'dawn', 'ending', 'clear'].includes(Q.state)) return;
    // During departures iterate the original slots, not the shrinking arrival count.
    const n = Q.state === 'return' ? Q.capturedTotal : Q.state === 'flood' ? Q.floodFrom : Q.caught;
    const time = Q.state === 'return' ? Q.returnT : Q.t;
    for (let i = 0; i < n; i++) {
      const s = souls[i], d = departure(Q, i); if (!s || d && time >= d.start || spooled(i)) continue;
      const p = slot(i);
      if (spool && i < spool.n && clock >= spoolTime(i).dep) {
        // on its way up into a spool
        const k = clamp((clock - spoolTime(i).dep) / C.respoolFly, 0, 1), e = k * k * (3 - 2 * k), to = spoolPoint(i);
        drawSoul(g, i, { x: p.x + (to.x - p.x) * e + Math.sin(k * Math.PI) * s.bend * .4, y: p.y + (to.y - p.y) * e - Math.sin(k * Math.PI) * 6 }, .85, false, s.size * .8);
        continue;
      }
      if (d && time > d.start - C.pullLoose) p.x += Math.sin(time * 90 + s.phase) * 1.2;
      if (['elevator', 'walk'].includes(Q.state) && flash(Q) < .06) {
        g.save(); g.globalAlpha = C.walkAlpha * s.bright; disc(g, p.x + 2, p.y + 2, 2, '#ffe4a1'); g.restore(); continue;
      }
      const pulse = Q.state === 'quiet' ? .65 + .25 * Math.sin(clock * s.rate * 2 + s.phase) : .82;
      const wake = Q.state === 'wake' ? clamp(Q.t / C.wakeRise, .15, 1) : 1;
      const arrival = Math.max(0, 1 - (clock - s.arrived) / C.arrivalPulse);
      // trapped souls stay dim, so the eye in front of them is the brightest thing on the loom
      drawSoul(g, i, p, Q.state === 'flash' ? 1 : (pulse + arrival * .35) * s.bright * wake * (Q.state === 'quiet' ? 1 : LM.trappedAlpha), Q.state === 'flash' || flash(Q) > .06, s.size * (1 + arrival * .2));
    }
  }
  function flightPoint(f, time, m) {
    const d = flights.get(f); if (!d) return null;
    const k = (time - d.start) / (d.end - d.start); if (k < 0 || k >= 1) return null;
    const e = k * k, s = souls[d.i];
    return { x: d.from.x + (m.x - d.from.x) * e + Math.sin(k * Math.PI) * s.bend,
      y: d.from.y + (m.y - d.from.y) * e - Math.sin(k * Math.PI) * C.flightLift, i: d.i, k };
  }
  function drawFlights(g, Q) {
    const time = Q.state === 'return' ? Q.returnT : Q.t, m = muzzleXY(); let drawn = 0;
    for (const f of Q.flights || []) {
      const p = flightPoint(f, time, m); if (!p || drawn >= LM.flightCap) continue; drawn++;
      for (let j = 3; j > 0; j--) { const tail = flightPoint(f, time - j * C.trailGap, m); if (tail) drawSoul(g, tail.i, tail, .035 * (4 - j)); }
      drawSoul(g, p.i, p, .85, false, .65);
    }
  }
  function dawnSoul(i, count) {
    const p = slot(i), s = souls[i];
    const delay = (i / Math.max(1, count - 1) * .7 + s.phase / (Math.PI * 2) * .3) * C.dawnStagger;
    dawnStarts[i] = { y: p.y, delay };
    return { k: 'rise', x: p.x, y: p.y, sx: p.x, sy: p.y, ph: s.phase, vy: -12, t: 0, dur: tuning.time.dawn,
      roofRise: true, size: s.size * 1.2, delay };
  }
  function riseMotion(f) {
    if (!f.roofRise) return false;
    const t = Math.max(0, f.t - f.delay), k = t / (f.dur - f.delay);
    f.x = f.sx + Math.sin(t * 1.7 + f.ph) * C.dawnSway;
    f.y = f.sy - k * (f.sy + 16); f.alpha = t ? clamp((f.y + 12) / 20, 0, 1) : .7; return true;
  }
  function drawRise(f, g) {
    if (!f.roofRise) return false;
    g.save(); g.globalAlpha = f.alpha === undefined ? .7 : f.alpha;
    g.drawImage(A.GHOST, f.x, f.y, A.uw(A.GHOST) * f.size, A.uh(A.GHOST) * f.size); g.restore(); return true;
  }
  function lightAtScreen(r, p, z, strength) {
    const u = (p.x - 120) / (112 * sc(z)), h = (FY(z) - p.y) / (FY(z) - YH(z, 1));
    r.light(...world(u, z, h), strength, strength * .65, strength * .25);
  }
  function soulLights(r, Q) {
    if (!['return', 'flood'].includes(Q.state)) return;
    const m = muzzleXY(), time = Q.state === 'return' ? Q.returnT : Q.t;
    // Eight distributed lights represent the whole population; all flights still exist and count.
    const list = (Q.flights || []).map(f => flightPoint(f, time, m)).filter(Boolean), stride = Math.max(1, Math.ceil(list.length / C.soulLights));
    for (let i = 0; i < list.length; i += stride) lightAtScreen(r, list[i], tuning.eyeZ * (1 - list[i].k), C.soulLight);
  }
  return { reset, respoolStart, respoolAll, spooled: i => !!spooled(i), tick, entry, slot, flash, capture, landed, wispMotion, riseMotion, dawnSoul, drawWarp, drawFlights, soulLights,
    shake, offset, drawRise, spool() { shake(C.shake.spool, .3); heldUntil = clock + C.hitStop; }, frameHeld: () => clock < heldUntil,
    displayedCount(Q, R) { return ['dawn', 'ending', 'clear'].includes(Q.state) ? dawnBase + Math.max(0, R.shown - dawnBase) + released(Q) : Math.min(R.souls, R.shown); }
  };
  function released(Q) {
      let n = 0;
      for (let i = 0; i < Q.dawnCount; i++) {
        const s = dawnStarts[i]; if (!s) continue;
        const delay = s.delay;
        const time = Q.state === 'dawn' ? Q.t : tuning.time.dawn;
        const k = Math.max(0, (time - delay) / (tuning.time.dawn - delay));
        if (s.y - k * (s.y + 16) <= 4) n++;
      }
      return n;
  }
};
