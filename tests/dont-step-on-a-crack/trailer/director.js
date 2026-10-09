// Don't Step on a Crack: the trailer's scripted player. Evaluated in the game's scope after tools/trailer/harness.js.
// It plays through the same input path as a person (press, the held side, keyJump, the arrow keys) and adds the
// plan items the takes in takes.json use:
//   walk   {n | until | dur, pace, taps, opt}   clean steps: a quick tap when the tap lands clean, else hold and aim
//   crack  {kind: crack|line|hole|any, n, until} step onto a crack (n counts vertebrae, not steps)
//   shoes  {kind, near}                          walk to the next pair (re-dealt to that kind); `near` stops short
//   roll   {freq}                                weave in heelies until they stop
//   jump   {prefD}                               jump; in the air, steer to a clean landing (moon shoes: prefD ahead)
// Staging switches, set from `js` items: D.autoJump (hop skateboards and balls), D.floorHp (Mom can't drop below
// it, for long walks that aren't filmed), D.noDad (no Dad visits).
(() => {
  const D = window.__D, E = (0, eval);

  // sharper canvases at 1080p and above: a bigger Mom Cam backing store, no cap on the main canvas's pixels
  camSetup = E('(' + camSetup.toString().replace('Math.min(2.5,window.devicePixelRatio||1)', '5.5') + ')');
  layout = E('(' + layout.toString().replace('2.2e6', '4e7') + ')');
  layout();

  D.nowFrom = args => args[1];                 // update(dt, now)
  // title-screen state that startGame() doesn't reset: when the next bird sings, and which frames redraw the Mom Cam
  D.start = () => { nextBird = 0; camTick = 0; startGame(); };
  D.state = () => ({ slab: slabIdx(front.d), hp, phase, mode });
  Object.assign(D, { active: false, nextAt: 0, tx: 0, ta: 0, n: 0 });
  D.onItem = it => { it.n0 = D.n; it.hp0 = hp; };
  D.markCalls(['breakVertebra', 'startDad', 'herd', 'startPower', 'endPower', 'startle', 'gameOver', 'showOver', 'hitBy', 'cleared', 'stumble', 'beginJump', 'landJump', 'takeCoupon', 'snapBack'],
    (name) => name === 'breakVertebra' && drop ? { it: D.it && D.it.type, tap: D.tap, tx: +D.tx.toFixed(2), ta: +D.ta.toFixed(2), dx: +drop.x.toFixed(2), dd: +drop.d.toFixed(2), jump: !!drop.jump, stumble: !!drop.stumble } : null);

  // markers for things that just happen
  let prevDog = 'off', prevSq = null, prevObs = null, prevStage = 0;
  D.watch.push(() => {
    if (dog.state !== prevDog) { D.mark('dog:' + dog.state); prevDog = dog.state; }
    if (!!squirrel !== !!prevSq) { D.mark(squirrel ? 'squirrel' : 'squirrel:gone'); prevSq = squirrel; }
    const ok = obs ? obs.kind + ':' + obs.state : null;
    if (ok !== prevObs) { D.mark('obs:' + ok); prevObs = ok; }
    if (lastStage !== prevStage) { D.mark('street:' + lastStage); prevStage = lastStage; }
  });

  D.stage.push(now => {
    if (mode === 'play' && D.floorHp && hp < D.floorHp) { hp = D.floorHp; kinks = kinks.slice(0, MAXHP - hp); updateHUD(); camLabel(); }
    if (mode === 'play' && D.noDad && streak >= STREAK_EVERY - 1) streak = 0;
    // hop whatever comes rolling at you, like a player would
    if (D.autoJump && mode === 'play' && obs && obs.state === 'go' && !obs.cleared && (obs.kind === 'board' || obs.kind === 'ball') && (phase === 'idle' || (phase === 'swing' && sw.t < 0.12))) {
      let eta = 9;
      if (obs.kind === 'board') eta = (obs.d - Math.max(feet[0].d, feet[1].d) - 0.9) / obs.v;
      else eta = (Math.min(...feet.map(f => Math.abs(f.x - obs.x))) - 0.5) / obs.v;
      if (eta < 0.32) { if (phase === 'swing') { input.bot = 0; D.active = false; } keyJump(); D.mark('autojump'); }
    }
    // a leash across the path: wait for it
    if (mode === 'play' && obs && obs.kind === 'leash' && phase === 'idle' && D.it && (D.it.type === 'walk' || D.it.type === 'shoes')) D.nextAt = Math.max(D.nextAt, now + 0.1);
  });

  // ---------- picking where to put a foot
  function constrainX(x, ahead, side, other, lat) {
    const gap = Math.abs(ahead) < 1.06 ? 0.6 : 0.45;
    lat = lat || LAT;
    x = side < 0 ? Math.min(x, other.x - gap) : Math.max(x, other.x + gap);
    return clamp(x, Math.max(R + 0.05, other.x - lat), Math.min(WS - R - 0.05, other.x + lat));
  }
  // footHits' bounding-box test ignores the margin along the walk, so probe around the spot instead
  function safe(x, d, tip, m) {
    m = m === undefined ? 0.1 : m;
    for (const [ox, od] of [[0, 0], [0, m], [0, -m], [m, 0], [-m, 0], [0, 2 * m]]) if (footHits(x + ox, d + od, slabsNear(d + od), 0.03, tip).length) return false;
    return true;
  }
  // after this foot lands at (x, d), can the other foot make a step of the wanted kind?
  function canNext(x, d, want) {
    const other = { x, d }, side = front.side, tip = tiptoe(), dmax = tip ? TIP.dmax : DMAX;
    for (let i = 0; i < 48; i++) {
      const ahead = DMIN + 0.1 + Math.random() * (dmax - DMIN - 0.2);
      const nx = constrainX(other.x + side * (0.6 + Math.random() * 0.6), ahead, side, other), nd = d + ahead;
      if (want === 'clean' ? safe(nx, nd, tip) : footHits(nx, nd, slabsNear(nd), 0, tip).length) return true;
    }
    return false;
  }
  function hitKind(hits) { return hits.some(h => h.h) ? 'hole' : hits.some(h => h.c && h.c.kind === 'line') ? 'line' : 'crack'; }
  function pick(want, opt) {
    let r = pick1(want, opt);
    if (!r && want === 'clean') r = pick1(want, Object.assign({}, opt, { lo: DMIN + 0.08, hi: DMAX - 0.03, wide: true }));
    return r;
  }
  function pick1(want, opt) {
    opt = opt || {};
    const f = back, other = front, side = f.side, tip = tiptoe(), dmax = opt.giant ? GIANT.dmax : tip ? TIP.dmax : DMAX, lat = opt.giant ? GIANT.lat : LAT;
    const lo = opt.lo || 0.95, hi = Math.min(opt.hi || 2.0, dmax - 0.08);
    let best = null;
    for (let i = 0; i < 260; i++) {
      const ahead = lo + Math.random() * (hi - lo);
      let x = other.x + side * (0.6 + Math.random() * 0.55) + (Math.random() - 0.5) * 0.4;
      if (opt.bx !== undefined) x += (opt.bx - x) * 0.5;
      x = constrainX(x, ahead, side, other, lat);
      const d = other.d + ahead, near = slabsNear(d);
      const hits = footHits(x, d, near, 0, tip);
      let score;
      if (want === 'clean') {
        if (hits.length || !safe(x, d, tip)) continue;
        score = Math.abs(x - 2.5) * 0.25 + Math.abs(ahead - (opt.pref || 1.45)) + Math.random() * 0.15;
        if (opt.bx !== undefined) score += Math.abs(x - opt.bx) * 0.6;
        if (opt.maxD !== undefined && d > opt.maxD) continue;
        if (best && score >= best.score) continue;
        if (!canNext(x, d, opt.next || 'clean')) score += opt.next ? 3 : 6;
      } else {
        if (!hits.length) continue;
        if (want !== 'any' && hitKind(hits) !== want) continue;
        score = Math.abs(ahead - (opt.pref || 1.35)) + Math.abs(x - 2.5) * 0.3 + Math.random() * 0.1;
      }
      if (!best || score < best.score) best = { x, ahead, score };
    }
    return best;
  }
  function findBox() {
    let b = null;
    for (const sl of slabs.values()) if (sl.box && !sl.box.taken && sl.box.d > front.d - 0.3) if (!b || sl.box.d < b.d) b = sl.box;
    return b;
  }
  // a step onto the pair itself, if this foot can reach it
  function pickBox(b) {
    const other = front, side = back.side, tip = tiptoe(), dmax = tip ? TIP.dmax : DMAX;
    let best = null;
    for (let i = 0; i < 200; i++) {
      const tx = b.x + (Math.random() - 0.5) * 0.5, td = b.d + (Math.random() - 0.5) * 0.5, ahead = td - other.d;
      if (ahead < DMIN + 0.15 || ahead > dmax - 0.08) continue;
      const x = constrainX(tx, ahead, side, other);
      if (psd(b.x, b.d, x, td - 0.5 + R, x, td + 0.5 - R) > R + 0.26) continue;
      const bad = safe(x, td, tip) ? 0 : 3;
      const score = bad + Math.hypot(x - b.x, td - b.d) + Math.random() * 0.05;
      if (!best || score < best.score) best = { x, ahead, score };
    }
    return best;
  }

  function stepTo(p, now) {
    D.tx = p.x; D.ta = p.ahead; D.active = true; D.side = back.side; D.tap = !!p.tap; D.tapUntil = now + 0.06 + Math.random() * 0.03;
    input.bot = D.side; press(D.side);
  }
  // where a quick tap would put the back foot (the same rule as tapStep)
  function tapLanding() {
    const o = front, side = back.side;
    let x = o.x + side * 0.95; x += (WS / 2 - (x + o.x) / 2) * 0.3;
    x = side < 0 ? clamp(x, o.x - 1.35, o.x - 0.6) : clamp(x, o.x + 0.6, o.x + 1.35);
    x = clamp(x, R + 0.05, WS - R - 0.05);
    const ahead = tiptoe() ? TIP.stride : TAP_STRIDE, d = o.d + ahead;
    const clean = safe(x, d, tiptoe()) && canNext(x, d, 'clean');
    return { x, ahead, d, clean, tap: true };
  }
  // true when it's time to choose the next step; otherwise keeps the current one going
  function stepping(now, pace) {
    if (phase === 'swing' && D.active) {
      if (D.tap) { if (now >= D.tapUntil) { input.bot = 0; D.active = false; D.nextAt = now + pace[0] * 0.5 + Math.random() * (pace[1] - pace[0]) * 0.5; D.n++; } return false; }
      sw.x = D.tx;
      if (sw.ahead >= D.ta - 0.01 && sw.t >= TAP) { input.bot = 0; D.active = false; D.nextAt = now + pace[0] + Math.random() * (pace[1] - pace[0]); D.n++; }
      return false;
    }
    if (D.active && phase !== 'swing' && phase !== 'idle') return false;
    if (D.active && phase === 'idle' && input.q.length === 0 && !held(D.side)) D.active = false;
    return phase === 'idle' && !D.active && now >= D.nextAt;
  }
  const fallback = () => ({ x: constrainX(front.x + back.side * 0.8, 1.2, back.side, front), ahead: 1.2 });

  function walk(it, now) {
    const pace = it.pace || [0.12, 0.28];
    const want = it.type === 'crack' ? (it.kind || 'any') : 'clean';
    const count = it.type === 'crack' ? (it.n || 1) : it.n;
    if (mode !== 'play') { it.fin = true; return; }
    if (!stepping(now, pace)) return;
    const done = it.type === 'crack' ? it.hp0 - hp >= count : count !== undefined && D.n - it.n0 >= count;
    if (done || (it.until && it._until(now, D)) || (it.dur !== undefined && now - it.t0 >= it.dur)) { it.fin = true; return; }
    let p = null;
    if (want === 'clean' && it.taps !== false) { const tl = tapLanding(); if (tl.clean && (!it.opt || it.opt.maxD === undefined || tl.d <= it.opt.maxD)) p = tl; }
    if (!p) p = pick(want, it.opt);
    if (!p && want !== 'clean') p = pick('clean', Object.assign({}, it.opt, { next: want }));   // set one up for the next step
    if (!p && want !== 'clean') p = pick('any', it.opt);
    if (!p && want === 'clean' && giant > 0) {          // cornered: "Mother, may I?"
      p = pick1('clean', Object.assign({}, it.opt, { giant: true, lo: 1.6, hi: GIANT.dmax - 0.1 }));
      if (p) { if (!armed) toggleGiant(); D.mark('giant'); }
    }
    stepTo(p || fallback(), now);
  }
  D.items.walk = walk;
  D.items.crack = walk;

  D.items.shoes = (it, now) => {
    if (pow && pow.kind === it.kind) { it.fin = true; return; }
    if (mode !== 'play') { it.fin = true; return; }
    if (!stepping(now, it.pace || [0.12, 0.28])) return;
    const b = findBox();
    if (b && b.kind !== it.kind && !b.seen) b.kind = it.kind;      // the pair is dealt before it can be seen
    if (it.near && b && b.d - front.d < it.near) { it.fin = true; return; }
    let p = null;
    if (b) { b.seen = b.kind === it.kind; p = pickBox(b); }
    if (!p) p = pick('clean', b ? { bx: b.x, maxD: b.d - 0.75, lo: 0.7 } : it.opt);
    if (!p) p = pick('clean');
    stepTo(p || fallback(), now);
  };

  D.items.roll = (it, now) => {
    if (phase !== 'roll' && now - it.t0 > 0.3) { input.keys.l = input.keys.r = false; it.fin = true; return; }
    let w = Math.sin((now - it.t0) * (it.freq || 1.6));
    const b = findBox();
    if (rl && b && b.d - rl.d < 5 && b.d > rl.d - 0.5 && Math.abs(b.x - rl.x) < 1.5) w = b.x > rl.x ? -1 : 1;   // don't roll over the next pair
    input.keys.r = w > 0.35; input.keys.l = w < -0.35;
  };

  D.items.jump = (it, now) => {
    if (it.k === 0) { if (phase === 'idle') { keyJump(); it.k = 1; } return; }
    if (phase === 'jump' && jp && !jp.herd) {
      if (!it.aim) {
        // choose a clean landing once in the air
        let best = null;
        const lo = jp.moon ? jp.base + MOON.near : jp.to[0].d, hi = jp.moon ? jp.base + MOON.far : jp.to[0].d;
        for (let i = 0; i < 300; i++) {
          const d = lo + Math.random() * (hi - lo), cx = jp.moon ? 0.75 + Math.random() * (WS - 1.5) : clamp(jp.cx0 + (Math.random() - 0.5) * 1.2, 0.75, WS - 0.75);
          if (!safe(cx - 0.45, d, false) || !safe(cx + 0.45, d, false)) continue;
          const score = Math.abs(d - (it.prefD !== undefined ? jp.base + it.prefD : (lo + hi) / 2)) * 0.5 + Math.abs(cx - 2.5) * 0.2;
          if (!best || score < best.score) best = { cx, d, score };
        }
        it.aim = best || { cx: (jp.to[0].x + jp.to[1].x) / 2, d: jp.to[0].d };
      }
      const cx = (jp.to[0].x + jp.to[1].x) / 2, dt = 1 / 60;
      nudge(clamp(it.aim.cx - cx, -2.6 * dt * 2, 2.6 * dt * 2));
      if (jp.moon) nudgeDepth(clamp(it.aim.d - jp.to[0].d, -MOON.aim * dt * 2, MOON.aim * dt * 2));
    } else if (phase === 'idle') { it.fin = true; D.nextAt = now + 0.15; }
  };
})();
