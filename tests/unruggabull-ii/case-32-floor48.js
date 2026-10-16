// The 48th Floor: the twin-stick factory, its cables, power-ups, shags and hazards, Production Panic, the whip and
// p(Loom)'s beat, the lobby and the long ride from 48.
(function () {
  const check = (ok, msg) => { if (!ok) throw new Error(msg); };
  const tick = seconds => { for (let i = 0; i < Math.ceil(seconds * 60); i++) update(1 / 60); };
  const F = floors.floor48, F48 = F.F48, td = F.td;
  const fresh = () => { travelHook = null; RUN.force = 42; newRun(null, 'floor48'); RUN.force = null; setState('play'); clearHeld(); input.jump = input.slash = input.shoot = 0; twin.aiming = false; twin.padX = twin.padY = 0; };
  const Q = () => R.f48;
  const machine = (line, kind) => Q().machines.find(m => m.line === line && m.kind === kind);
  const enemy = (kind, dx, dy) => { const e = td.spawn(kind, { x: bull.x + dx, y: bull.y + dy }); e.spawning = 0; if (kind === 'armored') e.nextThrow = 99; if (kind === 'roll') e.st = 'aim', e.t = -99; return e; };
  try {
    fresh();
    check(R.stage === 'floor48' && floor.twin() && Q().machines.length === 15 && Q().down.every(d => !d), 'three lines of five machines, all running');
    check(R.td.enemies.length === 0 && Q().items.every(list => list.length === 1), 'one rug on each belt to start, no carpshits yet');
    tick(.1); twinClass(); check(document.body.classList.contains('twin'), 'the page shows the twin sticks');
    // moving and aiming on two sticks
    const x0 = bull.x; twin.padX = 1; tick(.5); twin.padX = 0;
    check(bull.x > x0 + 30, 'the move stick moves him');
    twin.kb.aimUp = 1; tick(.05); check(bull.ay < -.9 && R.shots.length > 0 && R.shots[0].vy < 0, 'the arrow keys aim and fire'); twin.kb.aimUp = 0; tick(1); R.shots = [];
    // a belt carries him along the line
    bull.x = 205; bull.y = F.LINES[2].y; bull.vx = bull.vy = 0; const bx = bull.x; bull.inv = 1e9; tick(.5);
    check(bull.x > bx + 8, 'the belt carries him');
    bull.inv = 0;
    // the blaster on a carpshit, the katana on armor, a bobbin knocked back
    fresh(); bull.x = 330; bull.y = 420; bull.inv = 1e9;
    const f1 = enemy('flyer', 0, -90); twin.aiming = true; twin.aimX = 0; twin.aimY = -1; tick(.4); twin.aiming = false;
    check(f1.dead && R.souls >= 1, 'a bolt frees a carpshit\'s soul');
    const a1 = enemy('armored', 30, 0); input.slash = 0; twin.flick = { x: 1, y: 0 }; press('slash'); tick(.05);
    check(a1.dead, 'one slash cuts an armored carpshit, helmet and all');
    const a2 = enemy('armored', 160, 0); const charge = R.charge = 5;
    R.td.thrown.push({ x: bull.x + 30, y: bull.y, h: 18, vx: -100, vy: 0, src: a2, friendly: false, dead: false, r: 0, t: 0 });
    bull.cd = 0; twin.flick = { x: 1, y: 0 }; press('slash'); tick(.05);
    check(R.td.thrown[0] && R.td.thrown[0].friendly && R.charge === charge + TUNE.deflectCharge, 'the katana knocks a bobbin back for charges');
    tick(1.2); check(a2.dead, 'the bobbin goes back to whoever threw it');
    // deflects made easier (owner, Oct 13): a bobbin close behind him is caught by a slash aimed the other way, and a tap
    // (no direction) slashes at the nearest bobbin
    R.td.thrown.length = 0; td.clearThreats('test');
    const pb = { x: bull.x - 40, y: bull.y, h: 18, vx: 100, vy: 0, src: null, friendly: false, dead: false, r: 0, t: 0 }; R.td.thrown.push(pb);
    bull.cd = 0; twin.flick = { x: 1, y: 0 }; press('slash'); tick(.03);
    check(pb.friendly, 'a slash catches a bobbin close behind him');
    R.td.thrown.length = 0;
    const tb = { x: bull.x - 30, y: bull.y - 30, h: 18, vx: 70, vy: 70, src: null, friendly: false, dead: false, r: 0, t: 0 }; R.td.thrown.push(tb);
    bull.cd = 0; twin.flick = { auto: true }; press('slash'); tick(.03);
    check(tb.friendly && bull.sx < 0 && bull.sy < 0, 'a tap slashes at the nearest bobbin');
    R.td.thrown.length = 0; tick(.4); bull.x = 330; bull.y = 420; bull.kx = bull.ky = 0;
    // bolts pass through bobbins: only the katana answers them; a thrower winds up first
    const a3 = enemy('armored', 0, -140); a3.nextThrow = 0; R.td.thrown = []; tick(.1);
    check(a3.wind > 0 && !R.td.thrown.length, 'an armored carpshit winds up before it throws');
    tick(.5); check(R.td.thrown.length === 1, 'then throws');
    const bob = R.td.thrown[0]; R.shots.push({ x: bob.x, y: bob.y + 20, h: bob.h, vx: 0, vy: -360, t: 0, a: -1.57, dead: false }); tick(.1);
    check(!bob.dead && R.td.thrown.includes(bob), 'a bolt goes straight through a bobbin');
    R.td.thrown = []; td.clearThreats('test');
    // a spinner's thread tangles him (no heart lost); the katana cuts it
    const h0 = R.hearts; bull.inv = 0; td.flingThread(bull.x + 60, bull.y, 20, Math.PI); tick(.6);
    check(bull.tangle > 0 && R.hearts === h0, 'a thread tangles him: slower, but no heart');
    bull.tangle = 0; td.flingThread(bull.x + 50, bull.y, 20, Math.PI); tick(.1); bull.cd = 0; twin.flick = { x: 1, y: 0 }; press('slash'); tick(.05);
    check(!R.td.thrown.length && !(bull.tangle > 0), 'the katana cuts a thread out of the air'); bull.inv = 1e9;
    // the shag: tough, staggered by the katana, splits into two flyers
    const sh = td.spawn('shag', { x: bull.x + 30, y: bull.y }); sh.spawning = 0; sh.next = 99;
    for (let i = 0; i < 6; i++) { R.shots.push({ x: sh.x - 20, y: sh.y, h: 14, vx: 360, vy: 0, t: 0, a: 0, dead: false }); tick(.05); }
    check(!sh.dead, 'the shag shrugs off a few bolts');
    R.shots = []; sh.hp = td.TD.shag.hp; const hpBefore = sh.hp; bull.cd = 0; input.slash = 0; twin.flick = { x: 1, y: 0 }; press('slash'); update(1 / 60);
    check(sh.hp === hpBefore - td.TD.shag.slash, 'one cut does ' + td.TD.shag.slash + ' (' + hpBefore + ' -> ' + sh.hp + ')');
    check(sh.stag > 0 && !sh.dead, 'a cut staggers it');
    for (let i = 0; i < 4 && !sh.dead; i++) { tick(.4); sh.x = bull.x + 30; sh.y = bull.y; bull.cd = 0; twin.flick = { x: 1, y: 0 }; press('slash'); tick(.05); }
    check(sh.dead && R.td.enemies.filter(e => e.kind === 'flyer').length >= 2, 'it splits into two flyers when it dies');
    td.clearThreats('test');
    // power-ups: walk over one to take it
    for (const [k, key] of [['rapid', 'rapid'], ['pierce', 'pierce'], ['spread', 'spread']]) { td.addPickup(k, bull.x, bull.y); tick(.05); check(R[key] > 0, k + ' is taken and runs'); }
    const pf = enemy('flyer', 0, -60), pf2 = enemy('flyer', 0, -100); pf.hp = pf2.hp = 1; R.spread = 0; twin.aiming = true; twin.aimX = 0; twin.aimY = -1; tick(.3); twin.aiming = false;
    check(pf.dead && pf2.dead, 'a piercing bolt goes through one carpshit into the next'); R.rapid = R.pierce = R.spread = 0;
    const r1 = enemy('roll', 0, -80), xl = bull.x; tick(.02); bull.cd = 0; twin.flick = { x: 0, y: -1 }; press('slash'); tick(.12);
    check(bull.y < 420 - 3 && bull.y > 420 - 12, 'the slash lunges a little');
    // which line makes what is the run's: the same seed, the same lines; another seed can differ
    fresh(); const k42 = Q().kinds.join(); fresh(); check(Q().kinds.join() === k42 && Q().kinds.slice().sort().join() === 'armored,flyer,roll', 'the lines are shuffled by the seed');
    let other = false; for (let sd = 1; sd < 12 && !other; sd++) { RUN.force = sd; newRun(null, 'floor48'); RUN.force = null; other = Q().kinds.join() !== k42; }
    check(other, 'other seeds shuffle them differently');
    // the cables: the katana cuts them; bolts don't
    fresh(); bull.inv = 1e9; tick(.1);
    const L0 = F.LINES[0].y, fseg = { x: (F48.feed.x0 + F48.feed.x1) / 2, y: L0 + F48.feed.dy };
    bull.x = fseg.x; bull.y = fseg.y - 26; R.shots.push({ x: fseg.x, y: fseg.y + 10, h: 10, vx: 0, vy: -360, t: 0, a: -1.57, dead: false }); tick(.1);
    check(!Q().feedCut[0], 'a bolt doesn\'t cut a cable');
    const sF = R.souls; bull.cd = 0; twin.flick = { x: 0, y: 1 }; press('slash'); tick(.05);
    check(Q().feedCut[0] && R.souls >= sF + F48.feed.souls, 'the katana cuts a soul feed: its souls spill free');
    const pseg = F.cables().find(c => c.line === 0 && c.kind === 'power'); bull.x = pseg.x0; bull.y = pseg.y1 + 20; bull.cd = 0; twin.flick = { x: 0, y: -1 }; press('slash'); tick(.05);
    check(Q().powerCut[0] > 0 && !F.cables().some(c => c.line === 0), 'and a power cable');
    // the cue: SLASH THE CABLES once, near one
    fresh(); bull.inv = 1e9; tick(5.2); R.banner = null; const fs1 = F.cables().find(c => c.kind === 'feed'); bull.x = fs1.x0 + 20; bull.y = fs1.y0 - 30; tick(.1);
    check(R.banner && R.banner.text === 'SLASH THE CABLES', 'near a cable: SLASH THE CABLES');
    // a cut power cable: the line's rugs come out limp, souls free, until p(Loom) splices it back
    fresh(); bull.inv = 1e9; let limp = 0, made = 0; emitHook = (t) => { if (t === 'f48_limp') limp++; if (t === 'td_spawn') made++; };
    F.cutCable(F.cables().find(c => c.line === 1 && c.kind === 'power')); tick(F48.power.down - .2);
    check(limp > 0 && Q().powerCut[1] > 0, 'an unpowered line sends out limp rugs');
    tick(.4); check(Q().powerCut[1] === 0 && Q().patched[1] === 1, 'then p(Loom) splices the cable back'); emitHook = null;
    // the hazards: the Heavy line's crane, the Bulk line's reverse in the panic
    fresh(); bull.inv = 0; const hv = Q().kinds.indexOf('armored'), hy = F.LINES[hv].y + F48.crane.dy;
    Q().crane[hv].next = 0; bull.x = 400; bull.y = hy; let hit = false; for (let i = 0; i < 60 * 3 && !hit; i++) { update(1 / 60); bull.x = 400; bull.y = hy; hit = R.lastCause === 'crane'; }
    check(hit, 'the crane hook sweeps the walkway below the Heavy line');
    fresh(); bull.inv = 1e9; const bk = Q().kinds.indexOf('roll'), other1 = [0, 1, 2].find(i => i !== bk); F.breakMachine(machine(other1, 'loom'), 'shot'); tick(.1);
    Q().reverseT[bk] = .1; tick(.2); check(Q().reverse[bk] > 0, 'in the panic the Bulk line\'s belt runs backwards');
    // in the panic the big ones come out now and then
    let shags = 0; emitHook = (t, d) => { if (t === 'td_spawn' && d.kind === 'shag') shags++; };
    for (let i = 0; i < 60 * 40 && !shags; i++) { update(1 / 60); if (R.td.enemies.length > 8) td.clearThreats('test'); }
    emitHook = null; check(shags > 0, 'in the panic a shag comes off a line');
    // machines: damage, the chain to the loom, a loom down
    fresh(); bull.inv = 1e9;
    const tank = machine(1, 'tank'), loom = machine(1, 'loom'), hp0 = loom.hp;
    F.breakMachine(tank, 'shot'); tick(.5);
    check(tank.dead && loom.hp <= hp0 - F48.toLoom && R.souls >= F48.souls.tank, 'a part breaking frees its souls and hurts its loom');
    const spinner = machine(1, 'spinner'); check(spinner.hp < spinner.max, 'the tank\'s blast reaches the spinner next to it');
    const made0 = R.td.enemies.length;
    F.breakMachine(loom, 'shot'); tick(.1);
    check(Q().down[1] && Q().panic === 1 && R.banner && R.banner.text === 'PRODUCTION PANIC', 'the loom takes its line down: Production Panic');
    tick(1.5); check(Q().machines.filter(m => m.line === 1).every(m => m.dead), 'the rest of the line goes down end to end');
    check(checkpoint && checkpoint.stage === 'floor48' && !checkpoint.down.some(Boolean) && checkpoint.souls === 0, 'the checkpoint stays the floor\'s start (item 26)');
    // the clutter: canisters set each other off, crates hold power-ups, a console hurts its line's loom
    fresh(); bull.inv = 1e9;
    const cans = Q().props.filter(p => p.kind === 'canister'), c0 = cans[0], c1 = cans[1], s1 = R.souls;
    F.hurtProp(c0, 99, 'shot'); tick(.5);
    check(c0.dead && c1.dead && R.souls >= s1 + 2 * F48.propSouls.canister, 'a canister bursts, frees its souls and sets off the one beside it');
    R.td.pickups.length = 0;
    const crate = Q().props.find(p => p.kind === 'crate'); F.hurtProp(crate, 99, 'slash'); tick(.05);
    check(crate.dead && R.td.pickups.length === 1 && R.td.pickups[0].kind === 'spread', 'a crate holds a power-up, one not seen yet first');
    const con = Q().props.find(p => p.kind === 'console'), cl = F.loomOf(con.line), clh = cl.hp;
    F.hurtProp(con, 99, 'shot'); tick(.5);
    check(con.dead && cl.hp <= clh - F48.console.loom, 'smashing a console hurts its line\'s loom');
    fresh(); bull.inv = 1e9; R.td.pickups.length = 0;
    F.breakMachine(machine(0, 'press'), 'shot'); tick(.05);
    check(R.td.pickups.some(p => p.kind === 'rapid'), 'the first press broken always drops Rapid');
    // chain reactions: a line going down end to end is a chain, called out, and pays its bonus when it ends
    fresh(); bull.inv = 1e9;
    F.breakMachine(machine(1, 'loom'), 'shot');
    let called = 0; for (let i = 0; i < 120; i++) { update(1 / 60); if (Q().callout) called = Math.max(called, Q().callout.n); }
    check(called >= F48.combo.min, 'a line coming down end to end is called out as a chain (x' + called + ')');
    tick(1);
    check(!Q().combo && Q().bestChain >= F48.combo.min, 'the chain ends and its best is kept for the card');
    // p(Loom)'s QUALITY CONTROL: after a line goes down, a laser sweeps with a gap; in the gap it passes him
    const clearAll = () => { td.clearThreats('test'); R.td.thrown.length = 0; };
    tick(F48.qc.delay - 1.6);
    check(Q().qc && Q().qc.dir === 'x' && R.talk && R.talk.text === 'QUALITY CONTROL.', 'a line down: p(Loom) calls quality control');
    bull.inv = 0; R.hearts = 5; bull.x = 640;
    for (let i = 0; i < 60 * 12 && Q().qc; i++) { bull.y = (Q().qc.g0 + Q().qc.g1) / 2; clearAll(); update(1 / 60); }
    check(!Q().qc && R.hearts === 5, 'standing in the gap, the sweep passes him');
    // the second line: the laser comes down the room; out of the gap it costs a heart
    const ln2 = [0, 2].find(i => !Q().down[i]); F.breakMachine(machine(ln2, 'loom'), 'shot'); bull.inv = 1e9;
    for (let i = 0; i < 60 * 4 && !Q().qc; i++) { clearAll(); update(1 / 60); }
    check(Q().qc && Q().qc.dir === 'y', 'the second sweep comes down the room');
    bull.inv = 0; R.hearts = 5; bull.y = 420;
    for (let i = 0; i < 60 * 12 && Q().qc && R.hearts === 5; i++) { const L = Q().qc; bull.x = L.g1 + 60 < 780 ? L.g1 + 60 : L.g0 - 60; bull.y = 420; clearAll(); update(1 / 60); }
    check(R.hearts === 4 && R.lastCause === 'laser', 'out of the gap, the laser costs a heart');
    check(state === 'play', 'still playing');
    // the reactor (owner, Oct 14, option D): when the last line is left its loom is shielded, after that line's laser
    // has passed; two vessels at the far right, one high and one low, feed the shield; burst both and it's down
    // they stand there from the start, dormant under shields of their own (owner, Oct 14)
    fresh(); bull.inv = 1e9;
    { const v0 = Q().reactor.vessels[0]; check(Q().reactor.st === 'dormant' && Q().reactor.vessels.length === 2 && F.vessels().length === 0, 'the vessels stand from the start, dormant');
      bull.x = v0.x; bull.y = v0.y + 70; twin.aiming = true; twin.aimX = 0; twin.aimY = -1; R.charge = 24;
      for (let i = 0; i < 60; i++) { R.td.enemies.length = 0; R.td.thrown.length = 0; bull.x = v0.x; bull.y = v0.y + 70; update(1 / 60); }
      twin.aiming = false;
      check(v0.hp === v0.max && v0.ping >= 0 && !v0.dead, 'dormant, its own shield takes the bolts'); }
    F.breakMachine(machine(0, 'loom'), 'shot'); F.breakMachine(machine(1, 'loom'), 'shot'); tick(.5);
    let last = machine(2, 'loom');
    check(Q().reactor.st === 'on' && Q().reactor.calm && F.shielded(last) && R.banner && R.banner.sub === 'ITS LOOM IS SHIELDED', 'the last line left: its loom is shielded at once (owner: split it)');
    let sawQC = false, firedEarly = false;
    for (let i = 0; i < 60 * 20 && Q().reactor.calm; i++) { clearAll(); if (Q().qc) { sawQC = true; bull.y = Q().qc.dir === 'y' ? 440 : (Q().qc.g0 + Q().qc.g1) / 2; } if (Q().reactor.vessels.some(v => v.zap)) firedEarly = true; bull.x = 720; update(1 / 60); }
    check(sawQC && !firedEarly, 'the vessels hold fire while the laser comes and sweeps');
    check(!Q().qc && !Q().reactor.calm && F.shielded(last) && R.banner && R.banner.text === 'BURST THE VESSELS', 'once it has passed they turn on him: BURST THE VESSELS');
    const vs = F.vessels();
    check(vs.length === 2 && vs[0].x > 680 && vs[1].x > 680 && vs[1].y - vs[0].y > 200, 'two vessels, both far right, one high and one low');
    { const h = last.hp; F.hurtMachine(last, 50, 'shot'); check(last.hp === h, 'the shield takes the damage'); }
    // shoot the high one from below it
    { const v = vs[0], s0 = R.souls; bull.x = v.x; bull.y = v.y + 70; twin.aiming = true; twin.aimX = 0; twin.aimY = -1;
      for (let i = 0; i < 60 * 6 && !v.dead; i++) { R.td.enemies.length = 0; R.td.thrown.length = 0; bull.x = v.x; bull.y = v.y + 70; update(1 / 60); }
      twin.aiming = false; tick(.3);
      check(v.dead && R.souls >= s0 + F48.reactor.souls && F.shielded(last), 'bolts burst a vessel and free its souls; the shield holds on the other'); }
    // two slashes burst the low one
    { const v = vs[1]; const cut = () => { bull.x = v.x; bull.y = v.y - 24; bull.cd = 0; tick(.05); input.slash = 0; twin.flick = { x: 0, y: 1 }; press('slash'); tick(.05); };
      cut(); check(!v.dead && v.hp === v.max - F48.reactor.slash, 'a slash cracks a vessel'); R.td.enemies.length = 0; cut();
      check(v.dead, 'a second slash bursts it'); }
    tick(.3);
    check(Q().reactor.st === 'down' && !F.shielded(last) && R.banner && R.banner.text === 'SHIELD DOWN', 'both burst: SHIELD DOWN');
    // awake, a vessel fights back: it marks the floor under him, then arcs to the mark; it sends out carpshits
    fresh(); bull.inv = 1e9;
    F.breakMachine(machine(0, 'loom'), 'shot'); F.breakMachine(machine(1, 'loom'), 'shot');
    Q().qc = null; Q().qcPending = null; F.startReactor();
    { const v = Q().reactor.vessels[0], Z = F48.reactor.zap; bull.inv = 0; R.hearts = 5;
      bull.x = v.x; bull.y = v.y + 60;
      for (let i = 0; i < 60 * 3 && !v.zap; i++) { R.td.enemies.length = 0; clearAll(); bull.x = v.x; bull.y = v.y + 60; update(1 / 60); }
      check(v.zap && !v.zap.fired, 'close to an awake vessel, it marks the floor under him');
      for (let i = 0; i < 60 * 2 && v.zap; i++) { clearAll(); update(1 / 60); }
      check(R.hearts === 4 && R.lastCause === 'vessel', 'standing on the mark, the arc costs a heart');
      bull.inv = 0; R.hearts = 5; v.zapT = 0;
      for (let i = 0; i < 60 * 3 && !v.zap; i++) { clearAll(); bull.x = v.x; bull.y = v.y + 60; update(1 / 60); }
      bull.x = v.x - 50; for (let i = 0; i < 60 * 2 && v.zap; i++) { clearAll(); bull.x = v.x - 50; update(1 / 60); }
      check(R.hearts === 5, 'stepping off the mark, it misses');
      v.spawnT = 0; R.td.enemies.length = 0; update(1 / 60);
      check(R.td.enemies.length === 1 && R.td.enemies[0].kind === 'flyer' && R.td.enemies[0].x > 650, 'it sends out a carpshit'); }
    // and while the shield is up the last line makes faster
    { Q().t = Math.max(Q().t, F48.firstAt + 1); Q().reverse[2] = 0; Q().reverseT[2] = 99; Q().next[2] = 10; Q().feedCut[2] = false; const n0 = Q().next[2]; update(1 / 60); const fast = n0 - Q().next[2]; Q().reactor.st = 'down'; Q().reverse[2] = 0; const n1 = Q().next[2]; update(1 / 60); const slow = n1 - Q().next[2];
      check(fast > 0 && slow > 0 && Math.abs(fast / slow - F48.reactor.rush) < .01, 'the shielded last line makes ' + F48.reactor.rush + ' times as fast'); }
    // the canister cart along the bottom: optional, now and then; a hit pops its canisters down the cart and drops a power-up
    fresh(); bull.inv = 1e9;
    check(!Q().cart && Q().cartNext === F48.cart.first, 'the cart comes ' + F48.cart.first + ' s in');
    Q().cartNext = 0; tick(.05);
    check(Q().cart && Q().cart.full && Q().cartNext === F48.cart.every, 'it rolls along the bottom, then again every ' + F48.cart.every + ' s');
    for (let i = 0; i < 600 && Q().cart.x < 300; i++) update(1 / 60);
    { R.td.pickups.length = 0; const s0 = R.souls; F.hitCart('shot'); tick(F48.cart.gap * F48.cart.load + .2);
      check(!Q().cart.full && R.souls >= s0 + F48.cart.load * F48.cart.souls && R.td.pickups.length === 1 && Q().combo && Q().combo.n >= F48.cart.load, 'a hit pops the cart down its length (a chain) and drops a power-up'); }
    // the last loom overloads: double damage, and chunks blow off it at 75/50/25%
    fresh(); bull.inv = 1e9;
    F.breakMachine(machine(0, 'loom'), 'shot'); F.breakMachine(machine(1, 'loom'), 'shot'); tick(.5);
    Q().qc = null; Q().qcPending = null; Q().reactor = { st: 'down', t: 0 };
    last = machine(2, 'loom'); const sl0 = R.souls; last.hp = last.max;
    { const hp1 = last.hp; F.hurtMachine(last, 1, 'shot'); check(last.hp === hp1 - F48.overload.mult, 'the last loom takes double damage'); }
    last.hp = Math.round(last.max * .76); F.hurtMachine(last, 4, 'shot');
    check(last.stage === 1 && R.souls >= sl0 + F48.overload.souls, 'a chunk blows off it at 75%, freeing souls');
    last.hp = Math.round(last.max * .3); F.hurtMachine(last, 30, 'shot');
    check(last.stage === 3, 'two stages passed in one hit both go');
    check(machine(0, 'loom').dead && !Q().machines.filter(m => m.kind === 'loom' && m.line !== 2).some(m => m.stage), 'only the last loom breaks up in stages');
    // p(Loom)'s beat framed on him wherever he stands (owner, Oct 14: low in the room he ended up off screen)
    fresh(); bull.inv = 1e9;
    for (const i of [0, 1, 2]) F.breakMachine(machine(i, 'loom'), 'shot');
    tick(F48.collapse.firstSoul + F48.collapse.soulEvery + .9);
    bull.x = 640; bull.y = 430; F.startPloom();
    for (let i = 0; i < 60 * 2; i++) update(1 / 60);
    { const sy = bull.y - R.td.cam.y, ey = Q().collapse.eye.y - R.td.cam.y;
      check(sy > 40 && sy < 270 - 30 && ey > 0 && ey < sy - 60, 'low in the room, he and the eye are both on screen (him ' + Math.round(sy) + ', the eye ' + Math.round(ey) + ')'); }
    // the presses: the shadow, then the slam
    fresh(); const pr = machine(0, 'press'); bull.x = (pr.x0 + pr.x1) / 2; bull.y = F.LINES[0].y; bull.inv = 0; R.hearts = 5;
    let warned = false; for (let i = 0; i < 60 * 3 && R.hearts === 5; i++) { update(1 / 60); bull.x = (pr.x0 + pr.x1) / 2; bull.y = F.LINES[0].y; if (pr.warn > 0) warned = true; }
    check(warned && R.hearts === 4 && R.lastCause === 'press', 'a press warns with its shadow, then flattens him');
    // production: carpshits leave the end of each line, faster in the panic
    fresh(); bull.inv = 1e9; tick(12);
    const bulk = Q().kinds.indexOf('roll');
    check(R.events.made > 2 && R.td.enemies.some(e => e.line === bulk && (e.kind === 'roll' || e.kind === 'flyer')), 'the lines make carpshits, the bulk line rolls');
    // rugged and continue: the whole floor again, every line running, the failed try's souls gone (item 26, soul audit)
    fresh(); const kinds0 = Q().kinds.join(); F.breakMachine(machine(0, 'loom'), 'shot'); tick(.1);
    check(R.souls > 0, 'souls freed in this try'); bull.inv = 0; hurtBull(5, 'test'); tick(3);
    check(state === 'over' && !checkpoint.down[0] && checkpoint.souls === 0 && Cards.info.back === 'THE START' && Cards.info.lost === R.souls, 'rugged in the factory: back to the start, this try\'s souls lost');
    Cards.press('Retry'); if (Cards.confirming) Cards.press('Retry');
    check(R.stage === 'floor48' && !Q().down.some(Boolean) && R.souls === 0 && Q().kinds.join() === kinds0 && R.hearts === 5 && R.continues === 1, 'continue: the whole floor, full hearts, the same line kinds, no souls kept');
    // the end: the collapse, two souls and two bells, the streams whip across the reserve and bend in, p(Loom)'s beat
    fresh(); bull.inv = 1e9;
    for (const i of [0, 1, 2]) F.breakMachine(machine(i, 'loom'), 'shot');
    check(Q().st === 'collapse' && R.td.enemies.length === 0 && Q().collapse.reserve.length === F48.collapse.reserve, 'the last loom brings the factory down, with the reserve behind the wall');
    const C = F48.collapse, bells = [], play = Snd.play; Snd.play = function (n, a) { if (n === 'bell') bells.push(a); return play.apply(this, arguments); };
    try {
      tick(C.firstSoul + C.soulEvery + .9);
      check(R.td.streams === 2 && R.gold && bells.join() === '0,1', 'two souls come to the blaster, a bell each (D, F)');
      check(Q().collapse.phase === 'whip' && R.banner && R.banner.text === 'CRACK THE RESERVE', 'the whip: CRACK THE RESERVE');
      // sweep the streams across the reserve from below it
      bull.x = 400; bull.y = 140; twin.aiming = true; let a = 0, s0 = R.souls;
      for (let i = 0; i < 60 * 2.5; i++) { a += .05; twin.aimX = Math.sin(a) * .95; twin.aimY = -Math.sqrt(1 - twin.aimX * twin.aimX); update(1 / 60); }
      twin.aiming = false;
      check(Q().collapse.cracked > 2 && R.souls >= s0 + Q().collapse.cracked * C.reserveSouls && R.td.bend > 0, 'sweeping streams crack reserve tanks, free their souls and bend in (' + Q().collapse.cracked + ')');
      // the bolt alone doesn't crack the reserve
      const before = Q().collapse.cracked; R.td.streams = 0; bull.x = Q().collapse.reserve.find(k => !k.broken).x; twin.aiming = true; twin.aimX = 0; twin.aimY = -1; tick(.5); twin.aiming = false; R.td.streams = 2;
      check(Q().collapse.cracked === before, 'only the streams crack it');
      F.startPloom();
      check(R.td.locked && Snd.track === null, 'p(Loom): no control, the music stops');
      const P8 = F48.ploom, to = pt => { while (Q().st === 'collapse' && Q().collapse.pt < pt) update(1 / 60); };
      to(P8.say + .1);
      check(R.td.cam.y < 20 && Q().eye > 0 && R.talk && R.talk.text === 'NOT ON MY FLOOR.', 'the camera goes up to the wall, the eye opens, its line');
      to(P8.snap - .05); check(Q().threads > .4, 'its threads come down to the gun');
      to(P8.snap + .1); check(R.td.scatter, 'the streams snap apart');
      to(P8.snap + .5); check(R.td.streams === 0 && !R.gold, 'back to normal');
      to(P8.salute + .1); check(Q().collapse.yank && Q().collapse.yank.every(s => s.salute) && bells.length === 3, 'the souls tear free and salute');
      for (let i = 0; i < 600 && state !== 'over'; i++) update(1 / 60);
      check(state === 'over' && cardKind === 'clear' && card.hidden && Cards.kind === 'clear' && Cards.info.dept === 'RECLAMATION' && Cards.labels().join() === 'Continue', 'white, then the clear card');
      check(Cards.info.run === R.souls && Cards.info.souls === R.souls - R.floorStart && R.phase === 'win' && R.endT > 0, 'the card has the run\'s numbers');
      Cards.press('Continue'); check(state === 'play' && card.hidden && !Cards.open && Q().st === 'lobby' && !floor.twin(), 'Take the elevator: the lobby, side on');
    } finally { Snd.play = play; }
    // the lobby: the portrait, the ding, the doors, and in
    tick(F48.lobby.walkIn + .1);
    keys.kbRight = true; tick(1.6); keys.kbRight = false;
    check(R.events.said && R.events.said.portrait, 'passing the portrait he has a word for it');
    tick(F48.lobby.dingAt + F48.lobby.doorsT + .5 - Q().lobby.t);
    check(Q().lobby.ding && Snd.track === 'pleaseHold', 'DING, the doors and Please Hold');
    const souls = R.souls;
    for (let i = 0; i < 600 && R.stage === 'floor48'; i++) { keys.kbRight = bull.u < F48.lobby.doorU - .03; keys.kbLeft = bull.u > F48.lobby.doorU + .03; update(1 / 60); }
    keys.kbRight = keys.kbLeft = false;
    check(R.stage === 'elevator' && R.elevator.fight && R.elevator.from === 48 && R.souls === souls, 'into the long ride from 48 with the run');
    // direct entry to the lobby
    location.hash = '#stage=floor48&at=lobby'; fresh(); check(Q().st === 'lobby', '#at=lobby starts in the lobby'); location.hash = '';
  } finally { twin.aiming = false; twin.padX = twin.padY = 0; for (const k in twin.kb) twin.kb[k] = 0; keys.kbRight = keys.kbLeft = false; travelHook = null; checkpoint = null; RUN.force = null; emitHook = null; newRun(); setState('title'); showCard('title'); }
})();
// A complete run through player inputs is identical with and without drawing.
(function () {
  const check = (ok, why) => { if (!ok) throw new Error(why); };
  const random = Math.random;
  const run = draws => {
    window.__balanceDriver.begin({ seed: 3, skill: 'expert', profile: window.roofProfiles.expert, options: { stage: 'floor48', fast: !draws }, cap: 300 });
    let done = false;
    for (let i = 0; i < 30 && !done; i++) { done = window.__balanceDriver.run(300).done; if (draws && state === 'play') draw(); }
    return JSON.stringify({ record: window.__balanceDriver.result(), seed });
  };
  try {
    const plain = run(false);
    let k = 17; Math.random = () => (k = (k * 16807) % 2147483647) / 2147483647;
    const drawn = run(true);
    check(plain === drawn, 'drawing never changes a run');
    check(JSON.parse(plain).record.end.cause === 'cleared', 'an expert clears the 48th Floor through its inputs');
  } finally { Math.random = random; travelHook = null; checkpoint = null; emitHook = null; newRun(); setState('title'); showCard('title'); }
})();
