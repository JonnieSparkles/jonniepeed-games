// Unruggabull II: the roof framework. Classic script, after floor13.js and before game.js.
// Outcomes use the core's seeded stream. Drawing is replaceable and never advances the fight.
var UnrugRoof = function (core) {
  'use strict';
  // All roof tuning lives here. Times are starting points for Part B; rounds end on damage, not a clock.
  const ROOF = {
    time: { elevator: 4, walk: 8, flash: .55, wake: 3.5, odds: 8, quiet: 2, return: 4.5,
      flood: 3, pinch: 1, fusion: 0, lines: 4.5, beam: 2.5, one: 2, snap: 0, dawn: 5, clear: 0 },
    cuts: { soul: 1, beam: .65, snap: 1.5 },
    walkSpeed: .1, aisle: .84, parapetH: .09,
    roundLengths: [30, 40, 45], openings: [2, 2, 2], volleyEvery: [6, 6, 6], stall: 2.3, hitsPerSpool: [10, 10, 10],
    eyeZ: .86, eyeH: .71, eyeLimit: .95, eyeFollow: 1.3, eyeHit: .15, aimCone: .5,
    flyEvery: [2.8, 2.5, 2.0], flyGroup: [2, 3, 4], flySpread: .12, flyHP: 1, flyH: .35, recharge: .35,
    ringOdds: [[75, 21, 4], [81, 16, 3], [90, 9, 1]], ringLanes: [-.58, 0, .58],
    ringTell: 1.4, orbGap: .35, orbFly: .85, ringRadius: .19, ringDepth: .16, ringZ: .28, depthMax: .36, depthSpeed: .45, orbH: .1,
    snareEvery: [0, 9, 6], snareFly: 1.1, snareSpeed: .24, snareHook: .18, reelEnd: .7, flinch: 1,
    gustEvery: [0, 12, 9], gustTell: .8, gustT: 1.2, gustForce: 1.2,
    odds: 99, minimum: 1, drain: 10, creep: 3, beamSteer: 1.8, beamLimit: 1.1, beamHit: .2,
    eyeRun: .4, eyeAccel: .55, beamFlyEvery: 4, returnGap: 1.5, returnFly: 1.2,
    initialCaught: 100, recalculatingGap: 5,
    freeze: .14, lightningFrame: 1 / 30, reelJump: .12, throwPin: .4,
    eyeHitZ: .04, eyeHitH: .15, spoolFlash: .6, beamFlash: .1, aimHold: .15,
    firstFly: 1, fightBanner: 1, warmAmbient: .25, darkAmbient: .1, flashAmbient: .7,
    deadWait: 1.9, glowOdds: 100, spools: 3, hitCost: 1, otherRingChance: .5,
    art: { left: 52, right: 188, top: 4, beam: 12, rail: 47, cloth: 60, base: 79,
      spools: [80, 120, 160], rain: 55, beamMuzzle: 16, beamEnd: 5,
      warpColumns: 10, warpRows: 6, soulScale: .45, soulOverlap: .65, flightCap: 96 }
  };
  const {
    A, Snd, rect, line, disc, poly, txt, otxt, textWidth, W, H, PX, FY, YH, sc, clamp, TUNE,
    rnd, rr, emit, updateBull, updateFlies, updateShots, updateFx, muzzleXY, hurtBull, free,
    popText, talk, live, endRun, drawBull, drawFly, drawShot, drawFx, drawSoulsCounter, world, moveDir, setCheckpoint
  } = core;
  const LM = ROOF.art;
  let R, bull, Q, g = core.g;
  const isRound = () => /^round[123]$/.test(Q.state);
  const beamActive = () => ['lines', 'beam', 'run', 'one'].includes(Q.state);
  const stageNames = { 10: 'roof_lead', 11: 'roof_round1', 12: 'roof_round2', 13: 'roof_round3', 14: 'roof_crescendo', 15: 'roof_cleared' };
  function stageNo() {
    if (R.phase === 'dead') return R.statsStage || 11;
    if (Q.state === 'clear' || R.phase === 'win') return 15;
    if (isRound()) return 10 + Q.round;
    return ['elevator', 'walk', 'flash', 'wake', 'odds'].includes(Q.state) ? 10 : 14;
  }
  function say(text) {
    const duration = talk(text, 'loom');
    R.talk.readout = true;
    emit('roof_line', { text });
    return duration;
  }
  function checkpoint() {
    // Save outcomes, not cosmetic positions. Re-entering a round restores its intact spool at full health.
    setCheckpoint({ stage: 'roof', roofState: isRound() ? Q.state : stageNo() === 10 ? 'round1' : 'quiet',
      broken: Q.broken, caught: (isRound() ? Q.caught : Q.capturedTotal) + R.fx.filter(f => f.caught).length, capturedTotal: Q.capturedTotal + R.fx.filter(f => f.caught).length, souls: R.souls, t: R.t, continues: R.continues,
      bestStreak: R.bestStreak, events: Object.assign({}, R.events) });
  }
  function clearThreats() { R.flies = []; R.shots = []; Q.volley = null; Q.rings = []; Q.snare = null; Q.gust = null; }
  function enter(name) {
    const previous = Q.state;
    if (previous && STATES[previous].exit) STATES[previous].exit();
    Q.state = name; Q.t = 0; R.phaseT = 0;
    Q.history.push(name);
    R.speed = name === 'walk' ? ROOF.walkSpeed : 0;
    R.phase = ['elevator', 'walk', 'flash', 'wake', 'odds'].includes(name) ? 'wake' : name === 'clear' ? 'win' : 'boss';
    emit('roof_state', { state: name });
    if (STATES[name].entry) STATES[name].entry();
  }
  function roundEntry(n) {
    Q.intermission = 0; Q.pendingRound = 0;
    Q.round = n; Q.broken = n - 1; Q.hp = ROOF.hitsPerSpool[n - 1]; Q.odds = ROOF.odds;
    Q.roundStart = R.t; Q.stall = 0; Q.flinch = 0; Q.nextVolley = ROOF.volleyEvery[n - 1];
    Q.nextOpening = ROOF.roundLengths[n - 1] / ROOF.openings[n - 1];
    Q.nextFly = ROOF.firstFly; Q.nextSnare = ROOF.snareEvery[n - 1]; Q.nextGust = ROOF.gustEvery[n - 1];
    Q.recalc = 0; clearThreats(); bull.bz = 0;
    Snd.music('roof');
    checkpoint();
  }
  function roundExit() { emit('roof_round_time', { amount: Math.round((R.t - Q.roundStart) * 100) / 100 }); clearThreats(); Q.stall = 0; }
  const STATES = {
    elevator: { entry() { Snd.music(null); Snd.play('storm'); } },
    walk: {},
    flash: { entry() { Snd.play('thunder'); } },
    wake: { tick(dt) { Q.eye.u += clamp(-Q.eye.u, -ROOF.eyeFollow * dt, ROOF.eyeFollow * dt); }, entry() { Q.eye.u = -ROOF.eyeLimit; R.banner = { text: 'P(LOOM)', sub: "RUGCO'S AI. IT HAS RUN THE NUMBERS.", t: 0, dur: ROOF.time.wake, y: 96 }; } },
    odds: { entry() { Q.odds = 0; Q.line = 0; say('HELLO, UNRUGGABULL.'); }, tick() {
      Q.eye.u = bull.u; bull.aimT = ROOF.aimHold;
      Q.odds = Math.min(ROOF.odds, ROOF.odds * Q.t / ROOF.time.odds);
      if (Q.line === 0 && (!R.talk || R.talk.t >= R.talk.total)) { Q.line++; say('I HAVE MODELED THIS MEETING.'); }
      else if (Q.line === 1 && (!R.talk || R.talk.t >= R.talk.total)) { Q.line++; say('PROBABILITY OF YOUR SURVIVAL: 1%.'); }
    }, ready() { return Q.t >= ROOF.time.odds && Q.line === 2 && (!R.talk || R.talk.t >= R.talk.total); }, exit() {
      R.banner = { text: 'FIGHT', t: 0, dur: ROOF.fightBanner, pull: true }; Q.odds = ROOF.odds;
    } },
    round1: { entry: () => roundEntry(1), tick: roundTick, exit: roundExit },
    round2: { entry: () => roundEntry(2), tick: roundTick, exit: roundExit },
    round3: { entry: () => roundEntry(3), tick: roundTick, exit: roundExit },
    quiet: { entry() {
      clearThreats(); Q.odds = ROOF.odds; Q.stall = 0; R.gold = false; R.beam = false;
      // A continue replays this act, including his reply; retain the other recorded outcomes.
      if (R.events.said) { R.events.said = Object.assign({}, R.events.said); delete R.events.said.odds; }
      // The last round's line finishes before its last word cuts the music.
      Q.accounted = say('ALL SOULS ACCOUNTED FOR.'); Q.silenced = false; Q.quietT = 0;
      emit('roof_quiet', { amount: Q.caught + R.fx.filter(f => f.caught).length });
      emit('roof_quiet_score', { amount: R.souls });
      checkpoint();
    }, tick(dt) {
      Q.eye.u += clamp(-Q.eye.u, -ROOF.eyeFollow * dt, ROOF.eyeFollow * dt);
      if (!Q.silenced && (!R.talk || R.talk.t >= Q.accounted)) { Q.silenced = true; Snd.music(null); }
      if (Q.silenced) Q.quietT += dt;
    }, ready: () => Q.quietT >= ROOF.time.quiet, exit() { cutIn('soul', ROOF.cuts.soul); } },
    return: { entry() {
      R.gold = true; R.charge = TUNE.charges; Q.returned = 0; Q.returnT = 0;
      Q.flights = Array.from({ length: Math.min(ROOF.spools, Q.caught) }, (_, i) => soulFlight(Q.caught - 1 - i, i * ROOF.returnGap));
      say('ERROR. ERR.');
    }, tick(dt) {
      Q.returnT += dt;
      while (Q.returned < Q.flights.length && Q.returnT >= Q.returned * ROOF.returnGap + ROOF.returnFly) {
        const n = Q.returned++; Q.caught = Math.max(0, Q.caught - 1); Snd.play('bell', n); emit('roof_return', { amount: 1 });
      }
    } },
    flood: { entry() {
      Q.floodFrom = Q.caught;
      Q.flights = Array.from({ length: Q.floodFrom }, (_, i) => soulFlight(Q.floodFrom - 1 - i,
        i / Math.max(1, Q.floodFrom - 1) * (ROOF.time.flood - ROOF.returnFly)));
      Snd.music('roofHeavy');
    }, tick() {
      const due = Q.flights.filter(f => Q.t + 1e-9 >= f.delay + ROOF.returnFly).length;
      const returned = Q.floodFrom - Q.caught;
      if (due > returned) { emit('roof_return', { amount: due - returned }); Q.caught = Q.floodFrom - due; }
    }, exit() { Q.caught = 0; } },
    pinch: {},
    fusion: { entry() { R.freeze = ROOF.freeze; R.white = ROOF.freeze; Snd.play('beam'); Snd.music('roofHeavy'); }, exit() { cutIn('beam', ROOF.cuts.beam); } },
    lines: { entry() { R.beam = true; Q.beamU = 0; Q.line = 0; say('THAT OUTCOME WAS NOT IN THE MODEL.'); }, tick() {
      if (!Q.line && (!R.talk || R.talk.t >= R.talk.total)) { Q.line = 1; core.bark('odds', true); }
    }, ready: () => Q.line === 1 && !R.bark },
    beam: { entry() { R.gold = true; R.beam = true; Q.eye.u = 0; Q.nextFly = ROOF.beamFlyEvery; }, tick: beamTick },
    run: { entry() { Q.eye.dir = 1; Q.onEye = false; say('PROBABILITY OF CAPTURE: ZERO.'); }, tick: beamTick },
    one: { entry() { clearThreats(); Q.odds = ROOF.minimum; say('UNLIKELY.'); }, ready: () => Q.t >= ROOF.time.one && !R.talk },
    snap: { entry() { R.beam = false; clearThreats(); Snd.play('snap'); cutIn('snap', ROOF.cuts.snap); } },
    dawn: { entry() {
      R.gold = false; R.beam = false; Snd.music(null); Snd.play('chord');
      Object.assign(bull, { aimT: 0, slash: -1, jh: 0, jv: 0, crouch: false, sq: 0, stag: 0 });
      Q.dawnCount = Q.capturedTotal;
      for (let i = 0; i < Q.dawnCount; i++) {
        R.fx.push({ k: 'rise', x: 60 + Math.random() * 120, y: 20 + Math.random() * 50, vy: -12, ph: Math.random() * 6, t: 0, dur: ROOF.time.dawn });
      }
    } },
    clear: { entry() { R.endT = R.t; endRun('clear'); } }
  };
  // Every state offers the same entry/tick/exit seam, including states with no extra work yet.
  for (const st of Object.values(STATES)) { st.entry = st.entry || (() => {}); st.exit = st.exit || (() => {}); }
  const ORDER = Object.keys(STATES);
  function newRun(r, b, at) {
    R = r; bull = b; R.speed = 0;
    Q = R.roof = { state: null, t: 0, round: 1, broken: 0, hp: ROOF.hitsPerSpool[0], odds: 0,
      eye: { u: 0, z: ROOF.eyeZ, h: ROOF.eyeH, eye: true }, caught: ROOF.initialCaught,
      capturedTotal: ROOF.initialCaught, history: [], rings: [], stall: 0, flinch: 0, hot: 0, cut: null, recalc: 0 };
    if (at) {
      Object.assign(R, { t: at.t, souls: at.souls, shown: at.souls, continues: at.continues + 1, bestStreak: at.bestStreak });
      Object.assign(R.events, at.events);
      Q.broken = at.broken; Q.caught = at.caught; Q.capturedTotal = at.capturedTotal;
      enter(at.roofState);
    } else { R.souls = R.shown = ROOF.initialCaught; enter('elevator'); }
  }
  function cutIn(name, seconds) { Q.cut = { name, left: seconds, seconds }; emit('roof_cut', { name }); }
  function hold(dt) {
    if (!Q.cut) return false;
    Q.cut.left -= dt;
    if (Q.cut.left <= 0) Q.cut = null;
    return true;   // even this final tick belongs to the cut; inputs and all game timers are untouched
  }
  function controlled() { return !['flash', 'wake', 'odds', 'fusion', 'snap', 'dawn', 'clear'].includes(Q.state) && (Q.state !== 'elevator' || Q.t >= ROOF.time.elevator); }
  function update(dt) {
    if (R.phase === 'dead') { updateBull(dt); updateFx(dt); if (R.phaseT > ROOF.deadWait) endRun('rugged'); return; }
    Q.t += dt; Q.hot = Math.max(0, Q.hot - dt); Q.recalc = Math.max(0, Q.recalc - dt);
    const st = STATES[Q.state];
    if (st.tick) st.tick(dt);
    if (R.phase === 'dead') return;
    if (controlled()) updateBull(dt);
    if (R.gold) { R.charge = TUNE.charges; R.empty = 0; R.dry = false; }
    if (isRound() || Q.state === 'beam' || Q.state === 'run') { updateFlies(dt); updateShots(dt); }
    else if (R.gold && !R.beam) updateShots(dt);
    updateFx(dt);
    if (R.phase === 'dead') return;
    if (!['round1', 'round2', 'round3', 'run', 'clear'].includes(Q.state)) {
      const ready = st.ready ? st.ready() : Q.t >= ROOF.time[Q.state];
      if (ready) enter(ORDER[ORDER.indexOf(Q.state) + 1]);
    }
  }
  function spawnCarp(count = 1) {
    const u = rr(-ROOF.aisle + ROOF.flySpread, ROOF.aisle - ROOF.flySpread);
    for (let i = 0; i < count; i++) R.flies.push({ u: clamp(u + (i - (count - 1) / 2) * ROOF.flySpread, -ROOF.aisle, ROOF.aisle),
      z: 1, h: ROOF.flyH, hp: ROOF.flyHP, form: count > 1, ph: (count > 1 ? Math.random() : rnd()) * 6, hit: 0, dead: false, cause: 'carp' });
  }
  function volley() {
    const likely = ROOF.ringLanes.reduce((a, u, i) => Math.abs(u - bull.u) < Math.abs(ROOF.ringLanes[a] - bull.u) ? i : a, 0);
    const others = [0, 1, 2].filter(i => i !== likely);
    if (rnd() < ROOF.otherRingChance) others.reverse();
    const odds = ROOF.ringOdds[Q.round - 1], lanes = [likely, ...others];
    Q.rings = lanes.map((i, k) => ({ u: ROOF.ringLanes[i], z: ROOF.ringZ, odds: odds[k] }));
    const weighted = () => { let n = rnd() * ROOF.glowOdds; for (let i = 0; i < odds.length; i++) { n -= odds[i]; if (n < 0) return i; } return 2; };
    Q.volley = { t: 0, orbs: [0, weighted(), weighted()].map((target, i) => ({ target, delay: ROOF.ringTell + i * ROOF.orbGap, landed: false })) };
    emit('roof_volley');
  }
  function updateVolley(dt) {
    const v = Q.volley;
    if (!v) return;
    v.t += dt;
    for (const o of v.orbs) {
      if (o.landed || v.t < o.delay + ROOF.orbFly) continue;
      o.landed = true;
      const r = Q.rings[o.target];
      if (o.target === 2) say('VARIANCE.');
      if (Math.abs(bull.u - r.u) < ROOF.ringRadius && Math.abs(bull.bz - r.z) < ROOF.ringDepth && bull.jh < ROOF.orbH) hurtBull(ROOF.hitCost, 'orb');
      if (R.phase === 'dead') return;
    }
    if (v.orbs.every(o => o.landed)) {
      Q.volley = null; Q.rings = [];
      if (Q.t >= Q.nextOpening) {
        Q.stall = ROOF.stall; Q.nextOpening += ROOF.roundLengths[Q.round - 1] / ROOF.openings[Q.round - 1]; emit('roof_stall');
      }
    }
  }
  function launchSnare() {
    Q.snare = { u: bull.u, z: bull.bz, t: 0, hooked: false }; Snd.play('snare'); emit('roof_snare');
  }
  function updateSnare(dt) {
    const s = Q.snare;
    if (!s) return;
    s.t += dt;
    if (!s.hooked && s.t >= ROOF.snareFly) {
      if (Math.abs(bull.u - s.u) < ROOF.snareHook && Math.abs(bull.bz - s.z) < ROOF.ringDepth && bull.jh < ROOF.reelJump) s.hooked = true;
      else { Q.snare = null; return; }
    }
    if (s.hooked) {
      bull.bz += ROOF.snareSpeed * dt;
      if (bull.bz >= ROOF.reelEnd) { Q.snare = null; hurtBull(ROOF.hitCost, 'snare'); bull.bz = 0; bull.pin = ROOF.throwPin; }
    }
  }
  function depthMove(dt, dir) {
    if (Q.snare && Q.snare.hooked) return;
    bull.bz = clamp(bull.bz + (bull.pin > 0 ? 0 : dir) * ROOF.depthSpeed * dt, 0, ROOF.depthMax);
  }
  function startGust() { Q.gust = { t: 0, dir: rnd() < ROOF.otherRingChance ? -1 : 1, blown: false }; emit('roof_gust'); }
  function updateGust(dt) {
    const gust = Q.gust;
    if (!gust) return;
    gust.t += dt;
    if (gust.t >= ROOF.gustTell) {
      if (!gust.blown) { gust.blown = true; Snd.play('gust'); }
      bull.u = clamp(bull.u + gust.dir * ROOF.gustForce * dt, -ROOF.aisle, ROOF.aisle);
    }
    if (gust.t >= ROOF.gustTell + ROOF.gustT) Q.gust = null;
  }
  function roundTick(dt) {
    Q.stall = Math.max(0, Q.stall - dt); Q.flinch = Math.max(0, Q.flinch - dt);
    if (Q.stall <= 0 && Q.flinch <= 0) Q.eye.u += clamp(bull.u - Q.eye.u, -ROOF.eyeFollow * dt, ROOF.eyeFollow * dt);
    Q.nextFly -= dt;
    if (Q.nextFly <= 0) { spawnCarp(ROOF.flyGroup[Q.round - 1]); Q.nextFly = ROOF.flyEvery[Q.round - 1]; }
    Q.nextVolley -= dt;
    if (Q.nextVolley <= 0 && !Q.volley && Q.stall <= 0) { volley(); Q.nextVolley = ROOF.volleyEvery[Q.round - 1]; }
    updateVolley(dt);
    if (R.phase === 'dead') return;
    if (Q.round >= 2) {
      Q.nextSnare -= dt; Q.nextGust -= dt;
      if (Q.nextSnare <= 0 && !Q.snare && Q.stall <= 0) { launchSnare(); Q.nextSnare = ROOF.snareEvery[Q.round - 1]; }
      if (Q.nextGust <= 0 && !Q.gust) { startGust(); Q.nextGust = ROOF.gustEvery[Q.round - 1]; }
      updateSnare(dt); updateGust(dt);
    }
  }
  function slash(near) {
    if (!Q.snare) return;
    const s = Q.snare, p = Math.min(1, s.t / ROOF.snareFly), z = ROOF.eyeZ + (s.z - ROOF.eyeZ) * p;
    if (s.hooked || near(s.u, z)) {
      Q.snare = null; Q.flinch = ROOF.flinch; say('RECALCULATING.'); emit('roof_snare_cut');
      popText('CUT', PX(bull.u, bull.bz), YH(bull.bz, .3), '#bfefff');
    }
  }
  function shotHits(s) {
    if (s.z < ROOF.eyeZ - ROOF.eyeHitZ || Math.abs(s.u - Q.eye.u) >= ROOF.eyeHit || Math.abs(s.h - ROOF.eyeH) > ROOF.eyeHitH) return false;
    s.dead = true;
    if (isRound() && Q.stall > 0 && !Q.intermission) {
      Q.hp--; emit('roof_spool_damage', { amount: 1 });
      if (Q.hp <= 0) {
        Q.broken++; Q.hot = ROOF.spoolFlash; Q.odds = ROOF.odds; say('NO CHANGE.'); emit('roof_spool', { amount: 1 });
        if (Q.round < 3) { Q.pendingRound = Q.round + 1; Q.intermission = R.talk.total; clearThreats(); }
        else { clearThreats(); Q.pendingRound = 0; Q.intermission = R.talk.total; }
      }
    } else if (isRound() && Q.recalc <= 0) { say('RECALCULATING.'); Q.recalc = ROOF.recalculatingGap; }
    return true;
  }
  // A broken spool holds NO CHANGE. long enough to hear it, then the next round (or the last line and quiet).
  function afterSpool(dt) {
    if (R.phase === 'dead' || !(Q.intermission > 0)) return false;
    Q.intermission -= dt;
    if (Q.intermission <= 0) enter(Q.pendingRound ? 'round' + Q.pendingRound : 'quiet');
    else updateFx(dt);
    return true;
  }
  function soulFreed(f, source, by) {
    if (!isRound() || by === 'clear') return;
    f.to = { x: PX(Q.eye.u, ROOF.eyeZ), y: LM.beam + 15 }; f.caught = true;
    popText('CAUGHT', f.to.x, f.to.y, '#ffd44a');
  }
  function soulLanded(f) { if (f.caught) { Q.caught++; Q.capturedTotal++; emit('roof_caught', { amount: 1 }); } }
  function beamTick(dt) {
    Q.beamU = clamp(Q.beamU + moveDir() * ROOF.beamSteer * dt, -ROOF.beamLimit, ROOF.beamLimit);
    bull.aimT = ROOF.aimHold;
    if (Q.state === 'run') {
      const speed = ROOF.eyeRun + ROOF.eyeAccel * (1 - Q.odds / ROOF.odds);
      Q.eye.u += Q.eye.dir * speed * dt;
      if (Math.abs(Q.eye.u) >= ROOF.eyeLimit) { Q.eye.u = clamp(Q.eye.u, -ROOF.eyeLimit, ROOF.eyeLimit); Q.eye.dir *= -1; }
    }
    const on = Math.abs(Q.beamU - Q.eye.u) < ROOF.beamHit;
    if (on) {
      Q.odds = Math.max(ROOF.minimum, Q.odds - ROOF.drain * dt); Q.hot = ROOF.beamFlash;
      if (!Q.onEye && Q.state === 'run' && Q.recalc <= 0) { say('RECALCULATING.'); Q.recalc = ROOF.recalculatingGap; }
    } else Q.odds = Math.min(ROOF.odds, Q.odds + ROOF.creep * dt);
    Q.onEye = on;
    Q.nextFly -= dt;
    if (Q.nextFly <= 0) { spawnCarp(); Q.nextFly = ROOF.beamFlyEvery; }
    for (const f of R.flies) if (!f.dead && Math.abs(f.u - Q.beamU) < ROOF.beamHit) core.killFly(f, 'beam');
    if (Q.odds <= ROOF.minimum) enter('one');
  }
  function eyeAt() { return Q.eye; }
  function aim(consider) { if (isRound() && Q.stall > 0 && !Q.intermission) consider(Q.eye, Q.eye, ROOF.aimCone); }
  function view() {
    return { scroll: R.dist * core.WZ, rug: R.dist * core.WZ, power: 0, house: 0, dark: false,
      ambient: Q.state === 'flash' ? ROOF.flashAmbient : beamActive() ? ROOF.warmAmbient : ROOF.darkAmbient,
      dawn: Q.state === 'clear' ? 1 : Q.state === 'dawn' ? Math.min(1, Q.t / ROOF.time.dawn) : 0,
      look: { ti: [.08, .08, .12], sh: .7 }, edge: null };
  }
  function lights(r) {
    const [x, y, z] = world(Q.eye.u, ROOF.eyeZ, ROOF.eyeH);
    if (!['elevator', 'walk'].includes(Q.state)) r.light(x, y, z, .8, .35, .08);
    if (beamActive()) { const m = world(bull.u, bull.bz, .3); r.light(...m, 1.4, 1.1, .45); r.light(x, y, z, 1.4, 1.1, .45); }
  }
  // ---------- replaceable stand-in drawing ----------
  function drawSpool(i) {
    const x = LM.spools[i], broken = i < Q.broken;
    rect(g, x - 12, LM.top, 24, 9, broken ? '#24222f' : '#b0a088');
    if (broken) line(g, x - 10, LM.top + 9, x + 8, LM.top + 17, '#9496a8');
    else if (i === Q.round - 1) {
      const cracks = Math.floor((1 - Q.hp / ROOF.hitsPerSpool[i]) * 4);
      for (let j = 0; j < cracks; j++) line(g, x - 8 + j * 5, LM.top, x - 5 + j * 5, LM.beam, '#1a1824');
    }
  }
  function soulSpot(i) {
    // All captives are drawn: sixty thread gaps, with shallow overlapping stacks as the warp fills.
    const slots = LM.warpColumns * LM.warpRows, slot = i % slots, layer = Math.floor(i / slots);
    return { x: LM.left + 15 + slot % LM.warpColumns * (LM.right - LM.left - 34) / LM.warpColumns + layer * LM.soulOverlap,
      y: LM.beam + 5 + Math.floor(slot / LM.warpColumns) * (LM.cloth - LM.beam - 12) / LM.warpRows + layer * LM.soulOverlap };
  }
  function soulFlight(i, delay) { return Object.assign({ delay }, soulSpot(i)); }
  function drawWarp(layer = 'all') {
    if (layer !== 'souls') for (let i = 0; i < 42; i++) {
      const x = LM.left + 14 + i * 2.5, broken = Math.floor(i / 14) < Q.broken;
      const dead = ['snap', 'dawn', 'clear'].includes(Q.state);
      line(g, x, LM.beam, x + (broken ? Math.sin(R.t + i) * 2 : 0), dead || broken ? LM.beam + 5 : LM.cloth, '#8c7a68');
    }
    if (layer !== 'threads') for (let i = 0; i < Q.caught; i++) {
      const { x, y } = soulSpot(i);
      g.save(); g.globalAlpha = ['elevator', 'walk'].includes(Q.state) ? .2 : Q.state === 'quiet' ? .5 + .4 * Math.sin(Q.t * 3) : .8;
      g.drawImage(A.GHOST, x, y, A.uw(A.GHOST) * LM.soulScale, A.uh(A.GHOST) * LM.soulScale); g.restore();
    }
  }
  function drawEye() {
    const x = PX(Q.eye.u, ROOF.eyeZ), y = YH(ROOF.eyeZ, ROOF.eyeH);
    rect(g, x - 12, y - 3, 24, 6, '#3b3a48'); disc(g, x, y, 9, '#1a1824');
    const dead = ['snap', 'dawn', 'clear'].includes(Q.state), shut = ['elevator', 'walk', 'flash'].includes(Q.state);
    if (shut) { line(g, x - 6, y, x + 6, y, '#c87818'); return; }
    disc(g, x, y, 6, dead ? '#2f2d3b' : Q.stall > 0 || Q.onEye ? '#ffffff' : '#ff6e4a');
    if (!dead && Q.stall <= 0 && !Q.onEye) disc(g, x + clamp(bull.u - Q.eye.u, -2, 2), y, 2, '#110f18');
    if (Q.odds < ROOF.odds) for (let i = 0; i < Math.floor((1 - Q.odds / ROOF.odds) * 6); i++) line(g, x, y, x + Math.cos(i * 2.1) * 8, y + Math.sin(i * 2.1) * 8, '#ffffff');
  }
  function drawLoom() {
    const dark = ['elevator', 'walk'].includes(Q.state);
    g.save(); if (dark) g.globalAlpha = .25;
    for (const x of [LM.left, LM.right - 12]) rect(g, x, LM.top, 12, LM.base - LM.top, '#4b4a58');
    rect(g, LM.left, LM.top, LM.right - LM.left, LM.beam - LM.top, '#3b3a48');
    for (let i = 0; i < 9; i++) line(g, LM.left + 10 + i * 15, LM.top, LM.left + 10 + i * 15 + (i - 4) * 6, 0, '#5e5e6c');
    for (let i = 0; i < 3; i++) drawSpool(i);
    drawWarp('threads'); rect(g, LM.left + 12, LM.rail - 2, LM.right - LM.left - 24, 4, '#4b4a58');
    rect(g, LM.left + 12, LM.cloth, LM.right - LM.left - 24, LM.base - LM.cloth, '#761c1e');
    drawEye(); g.restore();
  }
  function drawRain() {
    if (['dawn', 'clear'].includes(Q.state)) return;
    const lean = Q.gust ? Q.gust.dir * (Q.gust.t < ROOF.gustTell ? 1 : 2) : .2;
    for (let i = 0; i < LM.rain; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      line(g, x, y, x + lean * 4, y + 4, '#76788a');
    }
  }
  function drawRings() {
    for (const r of Q.rings) {
      for (let j = 0; j < 20; j++) { const a = j / 20 * Math.PI * 2; rect(g, PX(r.u, r.z) + Math.cos(a) * 14, FY(r.z) + Math.sin(a) * 3, 1, 1, '#ff6e4a'); }
      otxt(g, r.odds + '%', PX(r.u, r.z), FY(r.z) - 9, '#ff6e4a', 1, 'center');
    }
    if (Q.volley) for (const o of Q.volley.orbs) {
      const k = clamp((Q.volley.t - o.delay) / ROOF.orbFly, 0, 1), r = Q.rings[o.target];
      if (k <= 0 || o.landed) continue;
      disc(g, PX(Q.eye.u, ROOF.eyeZ) + (PX(r.u, r.z) - PX(Q.eye.u, ROOF.eyeZ)) * k,
        YH(ROOF.eyeZ, ROOF.eyeH) + (FY(r.z) - YH(ROOF.eyeZ, ROOF.eyeH)) * k, 4, '#ff6e4a');
    }
  }
  function drawBeam() {
    const m = muzzleXY(), x = PX(Q.beamU, ROOF.eyeZ), y = YH(ROOF.eyeZ, ROOF.eyeH);
    poly(g, '#ffd44a', [[m.x - LM.beamMuzzle, m.y], [x - LM.beamEnd, y], [x + LM.beamEnd, y], [m.x + LM.beamMuzzle, m.y]]);
    poly(g, '#ffffff', [[m.x - 3, m.y], [x - 2, y], [x + 2, y], [m.x + 3, m.y]]);
    disc(g, x, y, Q.onEye ? 10 : 5, '#fff09a');
  }
  function drawStreams() {
    if (!['return', 'flood', 'pinch'].includes(Q.state)) return;
    const m = muzzleXY(), n = Q.state === 'return' ? 3 : 5, pinch = Q.state === 'pinch' ? Math.min(1, Q.t / ROOF.time.pinch) : 0;
    let drawn = 0;
    const time = Q.state === 'return' ? Q.returnT : Q.state === 'flood' ? Q.t : ROOF.time.flood;
    for (const f of Q.flights || []) {
      const k = (time - f.delay) / ROOF.returnFly;
      if (k < 0 || k >= 1 || drawn >= LM.flightCap) continue;
      drawn++;
      g.drawImage(A.GHOST, f.x + (m.x - f.x) * k - 4,
        f.y + (m.y - f.y) * k - Math.sin(k * Math.PI) * 15 - 5, A.uw(A.GHOST), A.uh(A.GHOST));
    }
    for (let i = 0; i < n; i++) {
      const endX = PX(Q.eye.u, ROOF.eyeZ) + (i - (n - 1) / 2) * 5 * (1 - pinch);
      g.strokeStyle = '#fff09a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(m.x, m.y);
      g.quadraticCurveTo((m.x + endX) / 2 + (i - 2) * 8 * (1 - pinch), (m.y + LM.rail) / 2, endX, LM.rail); g.stroke();
    }
  }
  function draw() {
    drawLoom();
    // Walk props are intentionally boxes and a tank, with no collision in the aisle.
    if (['elevator', 'walk'].includes(Q.state)) for (const [u, z, h] of [[-.74, .25, .12], [.74, .55, .1], [-.9, .85, .35]]) {
      const x = PX(u, z), y = YH(z, h); rect(g, x - 7, y, 14, FY(z) - y, '#3b3a48');
    }
    for (const f of R.flies) drawFly(f);
    drawBull(); drawFx('lit');
  }
  function glows() {
    drawWarp('souls');
    if (!['elevator', 'walk'].includes(Q.state)) drawEye();
    drawRings();
    if (Q.snare) {
      const s = Q.snare, m = muzzleXY(), k = Math.min(1, s.t / ROOF.snareFly);
      line(g, PX(Q.eye.u, ROOF.eyeZ), LM.rail, s.hooked ? m.x : PX(s.u, s.z) * k + PX(Q.eye.u, ROOF.eyeZ) * (1 - k), s.hooked ? m.y : LM.rail + (FY(s.z) - LM.rail) * k, '#f4e6c4');
    }
    if (beamActive()) drawBeam();
    drawStreams();
    for (const s of R.shots) drawShot(s);
    drawFx('glow'); drawRain();
  }
  function overlay() {
    if (Q.state === 'flash' && Q.t < ROOF.lightningFrame) rect(g, 0, 0, W, H, '#ffffff');
    if (Q.state !== 'elevator') return;
    const opening = clamp(Q.t / ROOF.time.elevator, 0, 1), half = W / 2 * (1 - opening);
    rect(g, 0, 0, half, H, '#24222f'); rect(g, W - half, 0, half, H, '#24222f');
    if (half > 10) txt(g, 'R', W / 2, 10, '#ffd44a', 2, 'center');
  }
  function drawCut(name = Q.cut.name) { rect(g, 0, 0, W, H, '#000000'); txt(g, name.toUpperCase(), W / 2, H / 2, '#ffffff', 2, 'center'); }
  function hud() {
    drawSoulsCounter();
    if (['elevator', 'walk', 'flash'].includes(Q.state)) return;
    otxt(g, 'P(LOOM)', 56, 5, '#ffd44a');
    rect(g, 86, 4, 90, 7, '#1a1824'); rect(g, 87, 5, 88, 5, '#2e2048');
    rect(g, 87, 5, 88 * Q.odds / 100, 5, Q.hot > 0 && Math.floor(R.t * 20) % 2 ? '#ffffff' : '#e44a34');
    otxt(g, Math.ceil(Q.odds) + '%', 179, 5, '#fff6e0');
    for (let i = 0; i < 3; i++) rect(g, 91 + i * 9, 13, 6, 3, i < Q.broken ? '#3b3a48' : '#ffd44a');
    if (R.talk && R.talk.readout) {
      const T = R.talk; let n = 0; while (n < T.text.length && T.times[n] <= T.t) n++;
      const w = textWidth(T.text) + 8;
      rect(g, (W - w) / 2, 23, w, 11, '#1a1418'); txt(g, T.text.slice(0, n), W / 2, 26, '#ff9628', 1, 'center');
    }
  }
  const noop = () => {};
  return {
    id: 'roof', tune: { scroll: 0, aisle: ROOF.aisle, bossHP: ROOF.spools, recharge: ROOF.recharge }, set: { openAir: true, parapet: ROOF.parapetH * core.world(0, 0, 1)[1], reflectZ: core.world(0, 1, 0)[2] },
    lines: { low: false, odds: "LET'S DISCUSS THOSE ODDS." }, label: 'Unruggabull on the open roof of RugCo Tower in a storm, facing p(Loom) and its three spools.',
    stageNo, stageNames, newRun, opening: noop, resume: noop, checkpoint,
    update(dt) { if (!afterSpool(dt)) update(dt); }, hold, use: x => { g = x; }, view, lights, draw, glows, overlay, hud,
    aim, shotHits, shotFar: () => false, posOf: o => o, slash, depthMove, hurt: noop, blasterBack: noop, bonusBy: () => null,
    endPull: noop, cutRug: noop, draggedIn: noop, blowUp: noop, soulFreed, soulLanded,
    cutActive: () => !!Q.cut, cutIn, drawCut,
    pauseText: 'The loom waits.', continueText: () => 'Continue from ' + (isRound() ? 'round ' + Q.round : 'the quiet') + ' with full hearts?',
    clearCard(extra, best, clock) { return { title: 'Roof clear', text: 'The Unrugged drift up into the dawn.',
      rows: [['Souls freed', String(R.souls)], ['Time', clock(R.endT)], ['Continues', String(R.continues)], ['Best', best.souls + ' souls']], note: '' }; },
    // Test bridge / Part B seams. No shipped controls can call these.
    ROOF, STATES, enter, eyeAt, volley, launchSnare, startGust, beamActive, drawLoom, drawEye, drawSpool, drawWarp, soulSpot
  };
};
