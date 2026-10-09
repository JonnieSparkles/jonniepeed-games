// Thimbleful: the trailer's scripted player. Evaluated in the game's scope after tools/trailer/harness.js.
// It plays through the same input path as a person dragging on the scene (pointer events on the canvas) and adds
// one plan item for takes.json:
//   catch  {until | dur}   chase the drop that lands first, or wait under the can's spout when none is falling
// Staging switch, set from a `js` item: D.maxSpills (spills never go above it, so a long run reaches the storm;
// the spill pips are outside the canvas, so it never shows).
(() => {
  const D = window.__D;

  D.start = () => start();
  D.state = () => ({ score, spills, el: +el.toFixed(2), edge: +edge.toFixed(3), x: +ex.toFixed(1), cx: +can.x.toFixed(1), st: state });

  // ---------- input: a finger on the scene, like a player dragging
  let down = false, aimed = null;
  function pointer(type, x) {
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: r.left + (x + 0.5) / W * r.width, clientY: r.top + r.height * 0.62 }));
  }
  function aim(x) {
    x = Math.max(7, Math.min(89, x));
    if (!down) { pointer('pointerdown', x); down = true; }
    if (aimed === null || Math.abs(x - aimed) > 0.4) { pointer('pointermove', x); aimed = x; }
  }

  // ---------- markers
  const SOUNDS = new Set(['plant', 'catch', 'gold', 'milestone', 'spill', 'earn', 'thunder']);
  let seen = 0, prev = { score: 0, dart: 0, bolt: 0, manic: false, storm: false, state: '', planted: false };
  D.watch.push(() => {
    const log = window.__snd;
    for (; seen < log.length; seen++) if (SOUNDS.has(log[seen].m)) D.mark('snd:' + log[seen].m);
    if (state !== prev.state) { D.mark('state:' + state); prev.state = state; }
    for (const n of [8, 14, 20, 26, 35, 45, 65, 90]) if (prev.score < n && score >= n) D.mark('score:' + n);
    prev.score = score;
    if (can.dart > prev.dart + 0.1) D.mark('feint');
    prev.dart = can.dart;
    if (boltT > prev.bolt + 0.1) D.mark('bolt', { boltX });
    prev.bolt = boltT;
    if (!prev.storm && edgeShown > 0.3) { D.mark('storm'); prev.storm = true; }
    if (!prev.manic && edgeShown > 0.55) { D.mark('manic'); prev.manic = true; }
  });

  D.stage.push(() => {
    if (state === 'play' && D.maxSpills !== undefined && spills > D.maxSpills) { spills = D.maxSpills; hud(); }
  });

  // ---------- catching
  const RIM = 38;
  D.items.catch = (it, now) => {
    if ((it.until && it._until(now, D)) || (it.dur !== undefined && now - it.t0 >= it.dur)) { it.fin = true; return; }
    if (state !== 'play') return;
    const falling = drops.filter(d => !d.done && d.y < RIM).map(d => ({ d, eta: (RIM - d.y) / d.vy })).sort((a, b) => a.eta - b.eta);
    if (falling.length) {
      // the first to land, unless it can't be reached in time and the next one can
      const reach = f => Math.abs(f.d.x - ex) / 86 <= f.eta + 0.03;
      const pick = falling.find(reach) || falling[0];
      aim(pick.d.x);
    } else if (can.x > 6) aim(Math.round(can.x) - 4);   // where the next drip will fall
  };
})();
