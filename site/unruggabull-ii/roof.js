// Unruggabull II: the roof. Classic script, after roof-effects.js and before game.js.
// Outcomes use the core's seeded stream. Drawing is replaceable and never advances the fight.
// The fight (roof-rework-plan.md): MAXIMIZE CARPETS. A 5x3 grid of tiles in front of him; p(Loom)'s eye fires warp
// (columns) and weft (rows) that stitch carpet; after each real attack the eye overheats and he shoots it; he slashes
// carpet back before it pulls the rug. Each spool is a phase with a set piece; the crescendo is as built.
var UnrugRoof = function (core) {
  'use strict';
  // All roof tuning lives here. Times are starting points; phases end on damage, not a clock.
  const ROOF = {
    time: { elevator: 4, walk: 25.4, flash: 3.2, wake: 3.5, odds: 8, quiet: 2, return: 4.5,
      flood: 3, pinch: 1, fusion: 0, lines: 4.5, beam: 2.5, one: 2, snap: 0, dawn: 5, ending: 0, clear: 0 },
    aisle: .84, parapetH: .09, hitsPerSpool: [40, 40, 40],
    eyeZ: .86, eyeH: .71, eyeLimit: .55, eyeFollow: 1.3, eyeHit: .15, aimCone: 2,   // open, the eye draws his shots from anywhere on the roof
    flyHP: 1, flyH: .05, recharge: .35,
    odds: 99, minimum: 1, drain: 10, creep: 3, beamHit: .25, dragSteer: 4,
    returnGap: 1.5,
    // the eye glides on its rail in the beam fight, as on the finale mockup (a smooth wave, not a bounce)
    eyeSwing: .47, eyeSwingRate: .75,
    // the beam fight lasts through Saga II heavy's solo (its first 16 bars at 170 BPM; owner, Oct 15: the solo "doesn't
    // play long enough"). The countdown runs with the music, no hold: the odds can't fall below a line from 99 when the
    // beam first lands to 1% at the solo's end, so on the eye they ride it and off it they creep back; the 1% lands on
    // a bar line (barSlack: reaching it this close after one counts as on it)
    soloEnd: 16 * 240 / 170, bar: 240 / 170, barSlack: .1,
    // before the beam the souls' streams lean toward the eye (streamLean at most) and clang off its armour, cracking it
    // (armourCracks hits crack it all the way); the beam opens it (owner, Oct 15)
    streamLean: .2, streamHit: .12, armourCracks: 70,
    // the beam fight, as on the finale mockup: he walks, the beam's far end follows with a lag (so it curves) and no aim
    // assist (owner, Oct 15: it stuck to p(Loom) too easily); carpshits pour off the cloth, some heavy, and the beam melts them (a fixed number, so no farming)
    beamMove: 1.25, beamDepth: .5, beamBull: .78, beamFollow: 3.2, beamBend: 1.6, beamWidth: .075, beamMelt: 30,
    beamFlyGap: [.35, .65], beamFlies: 40, beamHeavy: .25, heavyHP: 4, returnFly: 1.2, rushGap: .055,
    initialCaught: 100, recalculatingGap: 5,
    freeze: .14, lightningFrame: 1 / 30,
    eyeHitZ: .04, eyeHitH: .15, spoolFlash: .6, beamFlash: .1, aimHold: .15,
    fightBanner: 1, warmAmbient: .25, darkAmbient: .1, flashAmbient: .7, fightAmbient: .5,   // the fight's roof is lit to read; the storm stays in the sky
    deadWait: 2.8, spools: 3, hitCost: 1,
    // The roof in front of him: 5 tiles across the aisle, 3 deep from the near edge. Rows step .15 of the hall.
    grid: { cols: 5, rows: 3, z0: -.05, depth: .15 },
    step: { first: .2, repeat: .14, slideU: 3.6, slideZ: 1.6 },
    fight: {
      open: 2.2, setOpen: [1.8, 1.8, 2], grace: .45,             // the white-hot window; set pieces give a longer one
      warn: 1.2, warnK: [1, .96, .88], fire: .55, stitch: .28,     // warning, then a beam sweeps (or a needle stitches)
      gap: [1.5, 1.2, .9], firstWait: 2.6, nextWait: 1.4, setWait: 1.3, fakeWait: .6,
      setAt: .45, bpm: 152, floorOdds: 55,                        // set piece at 45% of a spool left; odds 99 to 55
      grip: 1, gripDecay: 3, pullPin: .35, settle: .3,            // carpet under him pulls after a second
      spread: [5.2, 4, 3], spreadAge: 1.2, cap: [6, 8, 10],
      hatch: [4, 6, 8], hatchEvery: [6.5, 5.2, 4.2], hatchFirst: 2.5, hatchWarn: .7, hatchAge: .6, hatchRetry: .5, fakeCarp: [0, .39, .45], fakeSpeed: .34,
      reach: 1, whiff: .5, reclaimFreeze: .045,
      snapT: 2.8, lastSnapT: .9, thunderAt: .45, whipAt: .8, whipT: .7, lightDecay: 2.5,
      twin: 1.4, tipT: 2.6
    },
    // the walk opens with his arrival: he steps out of the elevator (arrive seconds, from startZ) while the floodlights
    // clunk on row by row (lights, near row first); then the runner unrolls
    walk: { arrive: 1.2, startZ: -.16, lights: [.5, .9, 1.3], rows: [3, 5, 7], carpAt: 9.4, carpZ: .3, carpH: .22 },
    // p(Loom) rises from behind the roof's far edge in the flash state: rumbling from riseFrom, up by riseTo, the
    // lightning at bolt; the eye flickers before it opens (wake, eyeFlicker seconds)
    rise: { from: .3, to: 2.7, bolt: 1.9, shakeEvery: .35, eyeFlicker: 1 },
    reset: { stitchAfter: .3, stitch: 1.8, respoolAfter: 2.3, respool: 3, after: .5, relay: 1.2 },   // relay: a reclaimed tile is woven again after this long
    effects: { jitterX: 5, jitterY: 3, sway: 1.2, bob: .8, curve: 32, captureLift: 14,
      walkAlpha: .055, wakeRise: 1.3, arrivalPulse: .35, pullLoose: .22, departSpan: 1, flightLift: 16, trailGap: .025,
      dawnStagger: 1.2, dawnSway: 4, dawnWarm: 2, distant: [2.2, 5.4], flashDecay: .06,
      pinchBuild: .5, snapDecay: 1.9, hitStop: .05, soulLights: 8, soulLight: .12, beamLights: 6, respoolFly: .5,
      shake: { spool: 3, pinch: 2.5, fusion: 6, beam: .55, beamEye: 1.1, snap: 7, slam: 2, set: 1.5 } },
    // the loom stands on the roof's far end and is no wider than the roof there (owner, Oct 14: "the loom seems wider
    // than the roof"); its spools sit below the HUD
    art: { left: 84, right: 156, top: 22, beam: 31, rail: 53, cloth: 64, base: 81, frame: 6,
      spools: [101, 120, 139], spoolW: 16, rain: 55, beamMuzzle: 16, beamEnd: 5,
      warpColumns: 10, warpRows: 5, soulScale: .3, soulOverlap: .5, trappedAlpha: .5, flightCap: 96 }
  };
  const {
    A, Snd, poly, txt, otxt, textWidth, W, H, PX, FY, YH, sc, clamp, TUNE, quadF, tinted, VX,
    rnd, rr, emit, updateBull, updateFlies, updateShots, updateFx, muzzleXY, hurtBull, free, keys, sparks, poof,
    popText, talk, live, endRun, drawBull, drawFly, drawShot, drawFx, drawSoulsCounter, world, moveDir, setCheckpoint
  } = core;
  // The roof draws its shapes at the picture's full size (480 x 270, half a game pixel), not whole game pixels like
  // the core's helpers, so the loom, the eye and the spools aren't chunky (owner, Oct 14: "it feels really chunky").
  const half = v => Math.round(v * 2) / 2;
  const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(half(x), half(y), half(w), half(h)); };
  function line(g, x0, y0, x1, y1, c) {
    g.fillStyle = c; x0 = Math.round(x0 * 2); y0 = Math.round(y0 * 2); x1 = Math.round(x1 * 2); y1 = Math.round(y1 * 2);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1; let err = dx + dy;
    for (;;) { g.fillRect(x0 / 2, y0 / 2, .5, .5); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
  }
  function disc(g, x, y, r, c) {
    g.fillStyle = c; x = half(x); y = half(y); const r2 = Math.round(r * 2);
    for (let dy = -r2; dy <= r2; dy++) { const w = Math.floor(Math.sqrt(r2 * r2 - dy * dy)); g.fillRect(x - w / 2, y + dy / 2, w + .5, .5); }
  }
  const LM = ROOF.art, GR = ROOF.grid, F = ROOF.fight, HPS = ROOF.hitsPerSpool[0], BEAT = 60 / F.bpm;
  const TW = 2 * ROOF.aisle / GR.cols;
  const tileU = c => (c - (GR.cols - 1) / 2) * TW, tileZ = r => GR.z0 + (r + .5) * GR.depth;
  let R, bull, Q, g = core.g, musicChoice = 'a', musicCut = false, rushAt = -Infinity;
  const effects = UnrugRoofEffects(core, ROOF, soulSpot);
  // The ending after dawn (ending.js): played as the `ending` state, between dawn and the clear card.
  const ending = UnrugEnding(core, { R: () => R, bull: () => bull, shake: (k, s) => effects.shake(k, s), flash: s => { R.white = Math.max(R.white || 0, s); } });
  const AFTER = ['dawn', 'ending', 'clear'];   // the fight is over: the eye dead, the storm gone, the sun up
  const isRound = () => /^round[123]$/.test(Q.state);
  const beamActive = () => ['lines', 'beam', 'run', 'one'].includes(Q.state);
  const stageNames = { 10: 'roof_lead', 11: 'roof_round1', 12: 'roof_round2', 13: 'roof_round3', 14: 'roof_crescendo', 15: 'roof_cleared' };
  const PHASES = ['WARP', 'HALLUCINATING', 'MAXIMUM'];
  const LINES = ['MAXIMIZE CARPETS.', 'I AM CONFIDENT. I AM CONFIDENT.', 'MAXIMUM. MAXIMUM. MAXIMUM.'];
  function stageNo() {
    if (R.phase === 'dead') return R.statsStage || 11;
    if (Q.state === 'clear' || Q.state === 'ending' || R.phase === 'win') return 15;
    if (isRound()) return 10 + Q.round;
    return ['elevator', 'walk', 'flash', 'wake', 'odds'].includes(Q.state) ? 10 : 14;
  }
  function say(text) {
    const duration = talk(text, 'loom');
    R.talk.readout = true;
    emit('roof_line', { text });
    return duration;
  }
  const talkDone = () => !R.talk || R.talk.t >= R.talk.total - 1.3;
  // First-time prompts: once a run (kept across continues), one at a time, between the loom and the roof.
  function tip(key, text) {
    const seen = R.events.tips || (R.events.tips = {});
    if (seen[key]) return;
    seen[key] = true; Q.tips.push({ text, t: 0 }); live(text);
  }
  const oddsAt = hits => ROOF.odds - (ROOF.odds - F.floorOdds) * hits / (ROOF.spools * HPS);
  // Saved as a phase or the quiet begins, never at a rugging, so a continue loses the failed try's souls (the souls he
  // freed and the ones p(Loom) caught from them) as everywhere else. Re-entering a round restores its intact spool at full health.
  function checkpoint() {
    // Save outcomes, not cosmetic positions.
    setCheckpoint({ stage: 'roof', roofState: isRound() ? Q.state : stageNo() === 10 ? 'round1' : 'quiet',
      broken: Q.broken, caught: (isRound() ? Q.caught : Q.capturedTotal) + R.fx.filter(f => f.caught).length, capturedTotal: Q.capturedTotal + R.fx.filter(f => f.caught).length, souls: R.souls, t: R.t, continues: R.continues,
      bestStreak: R.bestStreak, events: Object.assign({}, R.events) });
  }
  // A rugging before phase 1 (in the walk): back to phase 1 with what he came onto the roof with.
  function deathCheckpoint() {
    if (core.checkpoint()) return;
    setCheckpoint({ stage: 'roof', roofState: 'round1', broken: 0, caught: Q.entryCaught, capturedTotal: Q.entryCaught, souls: R.floorStart, t: R.t,
      continues: R.continues, bestStreak: R.bestStreak, events: Object.assign({}, R.events) });
  }
  function clearThreats() {
    R.flies = []; R.shots = []; Q.fakes = []; Q.hatching = []; Q.stall = 0; Q.slam = 0;
    Q.atk = { stage: 'idle', t: 0, wait: F.nextWait, list: [], end: 0, set: false, real: false, open: F.open };
  }
  function enter(name) {
    const previous = Q.state;
    if (previous && STATES[previous].exit) STATES[previous].exit();
    Q.state = name; Q.t = 0; R.phaseT = 0;
    Q.history.push(name);
    R.speed = 0;
    // the ending is a scene of its own: no low-health heartbeat (the core's check looks for 'boss'), no win pose yet
    R.phase = ['elevator', 'walk', 'flash', 'wake', 'odds'].includes(name) ? 'wake' : name === 'clear' ? 'win' : name === 'ending' ? 'scene' : 'boss';
    emit('roof_state', { state: name });
    if (STATES[name].entry) STATES[name].entry();
    effects.entry(name, Q, R);
  }
  function newTiles() { return Array.from({ length: GR.cols * GR.rows }, () => ({ carpet: false, age: 0, grip: 0, flip: 0, tick: 0 })); }
  const T = (c, r) => Q.tiles[r * GR.cols + c];
  function placeBull(c, r) { Q.at = { c, r }; bull.u = tileU(c); bull.bz = tileZ(r); }
  function roundEntry(n) {
    Q.intermission = 0; Q.pendingRound = 0; Q.snapping = false; Q.whip = -1;
    Q.round = n; Q.broken = n - 1; Q.hp = HPS; Q.hits = (n - 1) * HPS; Q.odds = Q.realOdds = oddsAt(Q.hits);
    Q.roundStart = R.t; Q.recalc = 0; Q.atkN = 0; Q.spPending = false;
    Q.spDone = [0, 1, 2].map(i => i < n - 1);
    Q.hatchLeft = F.hatch[n - 1]; Q.hatchT = F.hatchFirst; Q.spreadT = F.spread[n - 1];
    Q.tiles = newTiles(); clearThreats(); Q.atk.wait = n === 1 ? F.firstWait : F.nextWait;
    if (!Q.at || Q.history.length <= 1) placeBull(2, 0);
    if (n === 1 || Q.history.length <= 1) Q.beat0 = R.t;   // attacks land on Saga II's beat, counted from the fight's start
    Snd.roofCue(n === 1 ? 'fight' : 'round' + n, { candidate: musicChoice });
    if (n > 1) R.banner = { text: PHASES[n - 1], t: 0, dur: 1.4, y: 58 };
    say(LINES[n - 1]);
    checkpoint();
  }
  function roundExit() { emit('roof_round_time', { amount: Math.round((R.t - Q.roundStart) * 100) / 100 }); R.flies = []; R.shots = []; Q.fakes = []; Q.hatching = []; Q.stall = 0; }
  const STATES = {
    elevator: { entry() { Snd.roofCue('lead', { candidate: musicChoice }); Snd.play('storm'); } },
    walk: { entry: walkEntry, tick: walkTick, ready: walkReady, exit() { Q.walkCarp = null; Q.tiles = newTiles(); } },
    flash: { entry() { Snd.play('slam'); Q.bolted = false; Q.shakeT = 0; }, tick(dt) {
      // it rises from behind the far edge of the roof, rumbling, and the lightning catches it on the way up
      const C = ROOF.rise;
      if (Q.t > C.from && Q.t < C.to && (Q.shakeT -= dt) <= 0) { Q.shakeT = C.shakeEvery; effects.shake(1.6, .25); Snd.play('carpetSpread'); }
      if (!Q.bolted && Q.t >= C.bolt) { Q.bolted = true; Snd.play('thunder', 1); }
    } },
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
    // ALL SOULS ACCOUNTED FOR: the roof goes wall to wall, the music cuts on the last word, the bar is stitched back to
    // 99 over the damage, and it winds new spools from the souls it caught. Then the quiet.
    reset: { entry() {
      clearThreats(); Q.realOdds = Q.odds; Q.stitch = 0; Q.respool = 0; Q.rline = 0; Q.resetT = 0; Q.wave = 0;
      musicCut = false; Q.silenced = false;
      Q.accounted = say('ALL SOULS ACCOUNTED FOR.');
    }, tick(dt) {
      const C = ROOF.reset;
      Q.eye.u += clamp(-Q.eye.u, -ROOF.eyeFollow * dt, ROOF.eyeFollow * dt);
      Q.wave += dt;
      for (let r = GR.rows - 1; r >= 0; r--) for (let c = 0; c < GR.cols; c++) {
        const tl = T(c, r);
        if (!tl.carpet && tl.age > ROOF.reset.relay && Q.wave > .3 + (GR.rows - 1 - r) * .22 + Math.abs(c - 2) * .06) { tl.carpet = true; tl.flip = 1; tl.age = 0; Snd.play('carpetSpread'); }
        tl.age += dt;
      }
      if (!musicCut && R.talk && R.talk.t >= R.talk.times[R.talk.text.length - 1]) { musicCut = true; Snd.roofCue('cut'); }
      if (!Q.silenced && (!R.talk || R.talk.t >= Q.accounted)) { Q.silenced = true; Snd.music(null); }
      if (!Q.silenced) return;
      if (!Q.resetT) tip('reset', 'SLASH IT BACK!');
      Q.resetT += dt;
      Q.stitch = clamp((Q.resetT - C.stitchAfter) / C.stitch, 0, 1);
      Q.odds = Q.realOdds + (ROOF.odds - Q.realOdds) * Q.stitch;
      if (Q.stitch > 0 && Q.stitch < 1 && Math.floor(Q.resetT * 30) % 3 === 0) Snd.play('stitchBlip');
      if (Q.rline === 0 && Q.resetT >= C.respoolAfter) { Q.rline = 1; Q.respoolT = 0; say('REPLACEMENT SPOOLS ORDERED.'); effects.respoolStart(Q); }
      if (Q.rline >= 1) { Q.respoolT += dt; Q.respool = clamp(Q.respoolT / C.respool, 0, 1); }
      if (Q.rline === 1 && Q.respool >= 1 && talkDone()) { Q.rline = 2; Q.lastT = 0; say('PROBABILITY OF YOUR SURVIVAL: 1%.'); }
      if (Q.rline === 2) Q.lastT += dt;
    }, ready: () => Q.rline === 2 && talkDone() && Q.lastT >= ROOF.reset.after },
    quiet: { entry() {
      clearThreats(); Q.odds = ROOF.odds; R.gold = false; R.beam = false;
      // A continue replays this act from here, including his reply; retain the other recorded outcomes.
      if (R.events.said) { R.events.said = Object.assign({}, R.events.said); delete R.events.said.odds; }
      if (!(Q.respool >= 1)) { Q.respool = 1; Q.stitch = 1; Q.realOdds = oddsAt(ROOF.spools * HPS); effects.respoolAll(Q); }
      if (!Q.tiles.some(t => t.carpet)) for (const t of Q.tiles) t.carpet = true;
      Q.silenced = true; Snd.music(null); Q.quietT = 0; Q.armour = 0;
      emit('roof_quiet', { amount: Q.caught + R.fx.filter(f => f.caught).length });
      emit('roof_quiet_score', { amount: R.souls });
      checkpoint();
    }, tick(dt) {
      Q.eye.u += clamp(-Q.eye.u, -ROOF.eyeFollow * dt, ROOF.eyeFollow * dt);
      Q.quietT += dt;
    }, ready: () => Q.quietT >= ROOF.time.quiet },
    return: { entry() {
      R.gold = true; R.hot = false; R.charge = TUNE.charges; Q.returned = 0; Q.returnT = 0;
      Q.flights = Array.from({ length: Math.min(ROOF.spools, Q.caught) }, (_, i) => soulFlight(Q.caught - 1 - i, i * ROOF.returnGap));
      say('ERROR. ERR.');
    }, tick(dt) {
      Q.returnT += dt;
      while (Q.returned < Q.flights.length && Q.returnT >= Q.returned * ROOF.returnGap + ROOF.returnFly) {
        const n = Q.returned++; Q.caught = Math.max(0, Q.caught - 1); Snd.play('bell', n); emit('roof_return', { amount: 1 });
      }
    } },
    flood: { entry() {
      Q.floodFrom = Q.caught; rushAt = -Infinity;
      Q.flights = Array.from({ length: Q.floodFrom }, (_, i) => soulFlight(Q.floodFrom - 1 - i,
        i / Math.max(1, Q.floodFrom - 1) * (ROOF.time.flood - ROOF.returnFly)));
      Snd.roofCue('flood', { seconds: ROOF.time.flood + ROOF.time.pinch });
    }, tick() {
      const due = Q.flights.filter(f => Q.t + 1e-9 >= f.delay + ROOF.returnFly).length;
      const returned = Q.floodFrom - Q.caught;
      if (due > returned) {
        emit('roof_return', { amount: due - returned }); Q.caught = Q.floodFrom - due;
        // Each soul landing in the gun plays a note climbing the scale, at most one every ROOF.rushGap seconds.
        if (R.t - rushAt >= ROOF.rushGap) { rushAt = R.t; Snd.play('rush', Math.floor(12 * due / Math.max(1, Q.floodFrom))); }
      }
    }, exit() { Q.caught = 0; } },
    pinch: { entry() { Snd.play('pinch', ROOF.time.pinch); } },
    // the fusion burns the carpet off the roof
    fusion: { entry() { Q.fusedAt = R.t; Q.endAt = 0; Q.swingT = 0; R.freeze = ROOF.freeze; R.white = ROOF.freeze; Snd.play('beam'); for (const t of Q.tiles) { t.carpet = false; t.grip = 0; } }, tick() { Snd.roofCue('fusion'); } },
    // the beam opens the eye the moment it lands: the countdown starts while they talk
    lines: { entry() { R.beam = true; Q.beamU = Q.beamBase = bull.u; Q.line = 0; Q.beamLeft = 0; Q.lineFrom = R.t - (Q.fusedAt || 0); say('THAT OUTCOME WAS NOT IN THE MODEL.'); }, tick(dt) {
      if (!Q.line && (!R.talk || R.talk.t >= R.talk.total)) { Q.line = 1; core.bark('odds', true); }
      beamTick(dt);
    }, ready: () => Q.line === 1 && !R.bark },
    beam: { entry() { R.gold = true; R.beam = true; Q.eye.u = 0; Q.nextFly = ROOF.beamFlyGap[1]; Q.beamLeft = ROOF.beamFlies; }, tick: beamTick },
    run: { entry() { Q.eye.dir = 1; Q.swingT = Math.asin(clamp(Q.eye.u / ROOF.eyeSwing, -1, 1)) / ROOF.eyeSwingRate; Q.onEye = false; say('PROBABILITY OF CAPTURE: ZERO.'); }, tick: beamTick },
    one: { entry() { clearThreats(); Q.odds = ROOF.minimum; Snd.roofCue('one', { seconds: ROOF.time.one }); say('UNLIKELY.'); }, ready: () => Q.t >= ROOF.time.one && !R.talk },
    snap: { entry() { R.beam = false; clearThreats(); Snd.play('snap'); Snd.roofCue('snap'); } },
    dawn: { entry() {
      R.gold = false; R.beam = false; Snd.roofSound(null); Snd.roofCue('dawn', { continueChord: true });
      Object.assign(bull, { aimT: 0, slash: -1, jh: 0, jv: 0, crouch: false, sq: 0, stag: 0 });
      Q.dawnCount = Q.capturedTotal;
      for (let i = 0; i < Q.dawnCount; i++) {
        R.fx.push(effects.dawnSoul(i, Q.dawnCount));
      }
    } },
    // the ending (ending.js): the run's time stops where it starts, as it did at the clear card before there was one
    ending: { entry() {
      Q.endingFrom = R.t; clearThreats(); Object.assign(bull, { aimT: 0, slash: -1 });
      ending.start();
    }, tick(dt) { ending.tick(dt); }, ready: () => ending.done() },
    clear: { entry() { R.endT = Q.endingFrom != null ? Q.endingFrom : R.t; endRun('clear'); } }
  };
  // Every state offers the same entry/tick/exit seam, including states with no extra work yet.
  for (const st of Object.values(STATES)) { st.entry = st.entry || (() => {}); st.exit = st.exit || (() => {}); }
  const ORDER = Object.keys(STATES);
  function newRun(r, b, at) {
    R = r; bull = b; R.speed = 0; ending.reset();
    const chosenMusic = new URLSearchParams(location.hash.slice(1)).get('music');
    musicChoice = /^[abc]$/.test(chosenMusic) ? chosenMusic : 'a';
    Q = R.roof = { state: null, t: 0, round: 1, broken: 0, hp: HPS, hits: 0, odds: 0, realOdds: ROOF.odds,
      eye: { u: 0, z: ROOF.eyeZ, h: ROOF.eyeH, eye: true }, caught: ROOF.initialCaught, twinU: 0,
      capturedTotal: ROOF.initialCaught, history: [], stall: 0, slam: 0, hot: 0, cut: null, recalc: 0, closedAt: -9,
      tiles: newTiles(), at: null, step: { cd: 0, last: '' }, fakes: [], hatching: [], tips: [], light: 0, lurch: 0, whip: -1,
      atk: { stage: 'idle', t: 0, wait: F.firstWait, list: [], end: 0, set: false, real: false, open: F.open }, atkN: 0,
      spDone: [false, false, false], spPending: false, stitch: 0, respool: 0, beat0: 0, drag: null };
    placeBull(2, 0);
    if (at && at.transfer) { Q.caught = Q.capturedTotal = at.souls; Q.fromRide = !!at.ride; }
    Q.entryCaught = Q.caught;
    effects.reset(at && !at.transfer ? at.capturedTotal + Math.max(0, at.caught - at.capturedTotal) : Q.caught);
    if (at && !at.transfer) {
      Object.assign(R, { t: at.t, souls: at.souls, shown: at.souls, continues: at.continues + 1, bestStreak: at.bestStreak });
      Object.assign(R.events, at.events);
      Q.broken = at.broken; Q.caught = at.caught; Q.capturedTotal = at.capturedTotal;
      enter(at.roofState);
    } else if (/(^|&)at=ending(&|$)/.test(location.hash.replace(/^#/, ''))) {
      // #stage=roof&at=ending: straight to dawn with the fight won, to review the ending
      R.souls = R.shown = Q.caught; Q.broken = ROOF.spools; Q.round = 3; Q.odds = ROOF.minimum; enter('dawn');
    } else { R.souls = R.shown = Q.caught; enter('elevator'); }
    ending.load();   // the ending's picture, in good time
  }
  function cutIn(name, seconds) { Q.cut = { name, left: seconds, seconds }; emit('roof_cut', { name }); }
  function hold(dt) {
    effects.tick(dt, Q, R, beamActive());
    if (!Q.cut) return false;
    Q.cut.left -= dt;
    if (Q.cut.left <= 0) Q.cut = null;
    return true;   // even this final tick belongs to the cut; inputs and all game timers are untouched
  }
  // from the first soul's return to the end he walks freely, as on the finale mockup: no grid, no lock while it talks
  const freeMove = () => ['return', 'flood', 'pinch', 'lines', 'beam', 'run'].includes(Q.state);
  function walkFree(dt) {
    const dir = moveDir(), lim = ROOF.beamBull;
    if (dir) bull.u = clamp(bull.u + dir * ROOF.beamMove * dt, -lim, lim);
    else if (Q.drag !== null && Q.drag !== undefined) bull.u += clamp(clamp(Q.drag, -lim, lim) - bull.u, -ROOF.dragSteer * dt, ROOF.dragSteer * dt);
    bull.aimT = ROOF.aimHold;
    if (!R.beam) return;
    // the beam's far end trails him: the curve, and the aim (no assist, as on the finale mockup)
    Q.beamBase += (bull.u - Q.beamBase) * Math.min(1, dt * ROOF.beamFollow);
    Q.beamU = Q.beamBase;
  }
  // the souls' streams: once the first soul is back, the blaster fires on its own, a stream more for each soul (1, 2, 3,
  // 4, then 5 with the flood), bending together in the pinch. Cosmetic: they hit nothing.
  const PATTERN = [null, [[0, 0]], [[-.04, 0], [.04, 0]], [[0, 0], [-.045, -.16], [.045, .16]],
    [[-.03, -.08], [.03, .08], [-.06, -.3], [.06, .3]], [[0, 0], [-.035, -.14], [.035, .14], [-.06, -.38], [.06, .38]]];
  function streamTick(dt) {
    if (!['return', 'flood', 'pinch'].includes(Q.state)) { Q.vol = null; return; }
    const v = Q.vol || (Q.vol = { cd: 0, shots: [] }), pinch = Q.state === 'pinch';
    const level = Q.state === 'return' ? Math.min(4, 1 + Q.returned) : 5;
    v.squeeze = pinch ? 1 - (k => k * k * (3 - 2 * k))(clamp(Q.t / ROOF.time.pinch, 0, 1)) : 1;
    v.cd -= dt;
    if (v.cd <= 0) {
      v.cd = pinch ? .06 : .17; const lean = clamp(Q.eye.u - bull.u, -ROOF.streamLean, ROOF.streamLean);
      for (const [o, d] of PATTERN[level]) v.shots.push({ base: bull.u, o, d, lean, z: 0 });
      Snd.play('shot', 'soft');
    }
    for (const sh of v.shots) {
      sh.z += 1.6 * dt;
      if (sh.z < 1) continue;
      // the far end: off the eye's armour with a clang and sparks, a crack more each time; nothing else
      if (Math.abs(streamU(sh, 1, v) - Q.eye.u) > ROOF.streamHit) continue;
      Q.armour = (Q.armour || 0) + 1;
      if (R.t - (Q.clangAt || -9) > .12) { Q.clangAt = R.t; sparks(Q.eye.u + (Math.random() - .5) * .08, ROOF.eyeZ, ROOF.eyeH, '#9aa0b8'); Snd.play('clang'); }
    }
    v.shots = v.shots.filter(sh => sh.z < 1);
  }
  // where a stream is across the roof, z of the way to the eye: its spread, squeezed in the pinch, and its lean
  const streamU = (sh, z, v) => sh.base + (sh.o + sh.d * z) * v.squeeze + (sh.lean || 0) * z * z;
  const deadBlaster = () => Q.state === 'quiet' || Q.state === 'reset' && Q.silenced;
  function controlled() { return !['flash', 'wake', 'odds', 'fusion', 'snap', 'dawn', 'ending', 'clear'].includes(Q.state) && (Q.state !== 'elevator' || Q.t >= ROOF.time.elevator); }
  function update(dt) {
    if (R.phase === 'dead') { updateBull(dt); updateFx(dt); if (R.phaseT > ROOF.deadWait) endRun('rugged'); return; }
    Q.t += dt; Q.hot = Math.max(0, Q.hot - dt); Q.recalc = Math.max(0, Q.recalc - dt);
    Q.light = Math.max(0, Q.light - dt * F.lightDecay); if (Q.yank && (Q.yank.t += dt) > .5) Q.yank = null; Q.lurch = Math.max(0, Q.lurch - dt * 1.4); Q.kick = Math.max(0, (Q.kick || 0) - dt);
    updateTips(dt);
    if (!isRound() && Q.state !== 'walk') for (const tl of Q.tiles) tl.flip = tl.flip > 0 ? Math.max(0, tl.flip - dt * 4) : Math.min(0, tl.flip + dt * 4);
    const st = STATES[Q.state];
    if (freeMove() && controlled()) walkFree(dt);
    if (st.tick) st.tick(dt);
    streamTick(dt);
    if (R.phase === 'dead') return;
    if (controlled()) updateBull(dt);
    // out of his hands (the cut to p(Loom), the fusion): a swing already started still finishes, not frozen mid-cut
    else if (bull.slash >= 0) { bull.slash += dt; if (bull.slash >= TUNE.slashT) bull.slash = -1; }
    if (R.gold) { R.charge = TUNE.charges; R.empty = 0; R.dry = false; }
    // from the silence after ALL SOULS ACCOUNTED FOR to the first soul back the blaster is dead: a dry click and smoke,
    // nothing he does matters, until the souls come back as its ammo (owner, Oct 15). blasterOff() tells the core too:
    // Shoot gives its dry sputter, the Shoot pad greys and the charge bar hides, as wherever else the blaster is off
    else if (deadBlaster()) { R.charge = 0; R.hot = true; }
    if (isRound() || Q.state === 'beam' || Q.state === 'run') { updateFlies(dt); updateShots(dt); }
    else if (Q.state === 'walk' || Q.state === 'reset' || (R.gold && !R.beam)) updateShots(dt);
    updateFx(dt);
    if (R.phase === 'dead') return;
    if (!['round1', 'round2', 'round3', 'run', 'clear'].includes(Q.state)) {
      const ready = st.ready ? st.ready() : Q.t >= ROOF.time[Q.state];
      if (ready) enter(ORDER[ORDER.indexOf(Q.state) + 1]);
    }
  }
  function updateTips(dt) {
    if (!Q.tips.length) return;
    Q.tips[0].t += dt;
    if (Q.tips[0].t > F.tipT) Q.tips.shift();
  }

  // ---------- moving on the grid ----------
  // The core calls this every controlled tick with up/down; left/right come from moveDir(). One tile a step,
  // repeating while held; he slides to the tile's middle. Crouched or rooted he stays put; with the beam he walks freely.
  function depthMove(dt, depthDir) {
    const s = Q.step; s.cd -= dt;
    let dx = moveDir(), dy = depthDir;
    if (dx && dy) dy = 0;
    if (bull.crouch || bull.pin > 0 || freeMove() || beamActive() || Q.state === 'elevator' || Q.state === 'walk' && Q.t < ROOF.walk.arrive) dx = dy = 0;
    const key = dx + ',' + dy;
    if ((dx || dy) && (key !== s.last || s.cd <= 0)) {
      const c = clamp(Q.at.c + dx, 0, GR.cols - 1), r = clamp(Q.at.r + dy, 0, GR.rows - 1);
      if (c !== Q.at.c || r !== Q.at.r) { Q.at = { c, r }; emit('roof_step'); }
      s.cd = key !== s.last ? ROOF.step.first : ROOF.step.repeat;
    }
    s.last = dx || dy ? key : '';
    // from the first soul back he walks freely (walkFree), up and down the roof too (owner, Oct 15)
    if (Q.state === 'elevator' || Q.state === 'walk' && Q.t < ROOF.walk.arrive) return;   // stepping out of the elevator (walkTick)
    if (freeMove() || beamActive()) { if (depthDir) bull.bz = clamp(bull.bz + depthDir * ROOF.beamDepth * dt, tileZ(0), tileZ(GR.rows - 1)); return; }
    bull.u += clamp(tileU(Q.at.c) - bull.u, -ROOF.step.slideU * dt, ROOF.step.slideU * dt);
    bull.bz += clamp(tileZ(Q.at.r) - bull.bz, -ROOF.step.slideZ * dt, ROOF.step.slideZ * dt);
  }
  const settled = () => Math.abs(bull.u - tileU(Q.at.c)) < TW * .3 && Math.abs(bull.bz - tileZ(Q.at.r)) < GR.depth * .3;

  // ---------- the walk: the runner unrolls toward him, a row at a time; nothing can hurt him ----------
  function walkEntry() { bull.bz = ROOF.walk.startZ; Q.tiles = newTiles(); Q.walkRows = [false, false, false]; Q.litRows = [false, false, false]; Q.arrived = false; Q.walkCarp = null; Q.walkDone = false; }
  function walkTick(dt) {
    const C = ROOF.walk;
    // he steps out of the elevator onto the dark roof, and the floodlights clunk on, a row at a time
    if (Q.t < C.arrive) { bull.bz = C.startZ + (tileZ(0) - C.startZ) * clamp(Q.t / C.arrive, 0, 1); bull.step = (bull.step || 0) + dt * 8; }
    else if (!Q.arrived) { Q.arrived = true; bull.bz = tileZ(0); }
    C.lights.forEach((at, r) => { if (Q.t >= at && !Q.litRows[r]) { Q.litRows[r] = true; Snd.play('slam'); effects.shake(.8, .1); } });
    for (const tl of Q.tiles) { tl.age += dt; tl.flip = tl.flip > 0 ? Math.max(0, tl.flip - dt * 4) : Math.min(0, tl.flip + dt * 4); }
    if (Q.t > C.arrive + .3) tip('move', 'MOVE: THE STICK OR ARROWS');
    C.rows.forEach((at, i) => {
      const r = GR.rows - 1 - i;
      if (Q.t >= at && !Q.walkRows[r]) {
        Q.walkRows[r] = true; Snd.play('carpetSpread');
        for (let c = 0; c < GR.cols; c++) { const tl = T(c, r); tl.carpet = true; tl.flip = 1; tl.age = 0; tl.grip = 0; }
        if (r === 0) tip('walkSlash', 'CARPET UNDER YOU: SLASH IT');
      }
    });
    const under = T(Q.at.c, Q.at.r);
    for (const tl of Q.tiles) if (tl !== under) tl.grip = Math.max(0, tl.grip - dt * F.gripDecay);
    if (under.carpet) under.grip = Math.min(F.grip * .95, under.grip + dt);   // it flickers its warning but never pulls here
    if (Q.walkRows[0] && !under.carpet && Q.tiles.some(t => t.carpet)) tip('walkClear', 'CLEAR THE ROOF: MOVE UP AND SLASH');
    if (Q.t >= C.carpAt && !Q.walkCarp && !Q.walkDone) {
      Q.walkCarp = { u: 0, z: C.carpZ, h: C.carpH, hp: 1, ph: 0, hit: 0, dead: false, t: 0 };
      tip('walkShoot', 'A CARPSHIT: SHOOT IT');
    }
    const wc = Q.walkCarp;
    if (wc) { wc.t += dt; wc.hit = Math.max(0, wc.hit - dt); wc.u = Math.sin(wc.t * .9) * .5; }
  }
  function killWalkCarp(how) {
    const wc = Q.walkCarp; if (!wc || wc.dead) return;
    wc.dead = true; Q.walkDone = true; Q.walkCarp = null;
    const x = PX(wc.u, wc.z), y = YH(wc.z, wc.h);
    if (how === 'slash') R.fx.push({ k: 'half', x, y, s: sc(wc.z), t: 0, dur: .5, img: A.CARP_CUT }); else poof(wc.u, wc.z, wc.h);
    free(x, y - 4, 'carpshit', how);
  }
  function walkReady() { return Q.t >= ROOF.time.walk || (Q.walkRows[0] && Q.walkDone && !Q.tiles.some(t => t.carpet)); }

  // ---------- the fight ----------
  // A pattern is a list of lasers on one timeline: each has its own warning (t0) and firing time (t1), so a set piece
  // can chain waves. k: col (warp, sweeping the column from the far row), row (weft, across a row), tile (a needle
  // stitching one tile) and gap (a set piece's gold safe tile, drawn only). Every attack is dodged by stepping.
  const pick = list => list[Math.floor(rnd() * list.length)];
  function beatWait(min) { const now = R.t - Q.beat0; return Math.ceil((now + min) / BEAT - 1e-9) * BEAT - now; }
  const beatGap = s => Math.max(1, Math.round(s / (BEAT / 2))) * BEAT / 2;
  function laser(k, i, real, t0, t1, o) { return Object.assign({ k, i, real, t0, t1, dir: rnd() < .5 ? 1 : -1, done: -1, fired: false, told: false, lay: true }, o || {}); }
  const lenOf = l => l.k === 'tile' || l.k === 'gap' ? F.stitch : F.fire;
  function pathOf(l) {
    if (l.k === 'tile' || l.k === 'gap') return [{ c: l.c, r: l.r }];
    if (l.k === 'col') return [2, 1, 0].map(r => ({ c: l.i, r }));
    return (l.dir > 0 ? [0, 1, 2, 3, 4] : [4, 3, 2, 1, 0]).map(c => ({ c, r: l.i }));
  }
  function patternNormal() {
    const b = Q.at, ph = Q.round - 1, n = Q.atkN++, list = [];
    const t1 = beatWait(F.warn * F.warnK[ph]);
    const col = (c, real = true, o) => list.push(laser('col', c, real, 0, t1, o));
    const weft = (r, real = true, o = {}) => list.push(laser('row', r, real, 0, t1, o));
    const near = c => [c - 1, c + 1].filter(x => x >= 0 && x < GR.cols);
    if (ph === 0) {
      // WARP: a column through him; from the third attack, warp and weft crossing on his tile (step diagonally)
      if (n < 2 || rnd() < .4) col(b.c);
      else { col(b.c); weft(b.r); }
    } else if (ph === 1) {
      // HALLUCINATING: a weft through him with a fake warp beside, crosses with one fake arm, fakes where he'd dodge to
      const r = rnd();
      if (r < .3) { weft(b.r); col(pick(near(b.c)), false); }
      else if (r < .65) { const fakeWarp = rnd() < .5; col(b.c, !fakeWarp); weft(b.r, fakeWarp); }
      else { col(b.c); weft(b.r); col(pick(near(b.c)), false); }
    } else {
      // MAXIMUM: the twin shuttle fires the weft while the eye fires the warp; sometimes two warps
      const r = rnd();
      if (r < .45) { col(b.c); weft(b.r, true, { twin: true }); }
      else { col(b.c); col(b.c + (b.c <= 1 ? 2 : b.c >= 3 ? -2 : pick([-2, 2]))); weft(b.r, true, { twin: true }); }
      if (rnd() < .6) { const free = [0, 1, 2, 3, 4].filter(c => !list.some(l => l.k === 'col' && l.i === c)); col(pick(free), false); }
    }
    return { list, open: F.open };
  }
  function patternSet(ph) {
    const b = Q.at, list = [], first = beatWait(1.5), sp = beatGap(.27);
    if (ph === 0) {
      // FIRST PASS: the warp fires left to right with one gap, then back right to left with another
      let g1 = clamp(b.c + pick([-2, -1, 1, 2]), 0, GR.cols - 1); if (g1 === b.c) g1 = b.c ? b.c - 1 : 1;
      [0, 1, 2, 3, 4].filter(c => c !== g1).forEach((c, k) => list.push(laser('col', c, true, 0, first + k * sp, { lay: false })));
      const endA = first + 3 * sp + F.fire, g2 = g1 + (g1 >= 2 ? -2 : 2), t0B = endA - .2, t1B = t0B + beatGap(1.15);
      list.push(laser('gap', 0, false, 0, endA - F.stitch, { c: g1, r: -1 }));
      [4, 3, 2, 1, 0].filter(c => c !== g2).forEach((c, k) => list.push(laser('col', c, true, t0B, t1B + k * sp, { lay: false })));
      list.push(laser('gap', 0, false, t0B, t1B + 3 * sp + F.fire - F.stitch, { c: g2, r: -1 }));
      return { name: 'FIRST PASS', line: 'OPTIMIZING.', list, open: F.open * F.setOpen[0] };
    }
    if (ph === 1) {
      // TWILL: needles on two of every three diagonals; the safe diagonal steps over each wave, fakes from the third
      let k = ((b.c - b.r) % 3 + 3) % 3, t = first, prev = 0; const dir = pick([1, -1]);
      for (let w = 0; w < 6; w++) {
        if (w) k = (k + dir + 3) % 3;
        for (let r = 0; r < GR.rows; r++) for (let c = 0; c < GR.cols; c++) {
          const d = ((c - r) % 3 + 3) % 3;
          if (d !== k) list.push(laser('tile', 0, true, prev, t, { c, r, lay: false }));
          else if (w >= 2 && rnd() < .3) list.push(laser('tile', 0, false, prev, t, { c, r }));
        }
        prev = t; t += beatGap(.95);
      }
      return { name: 'TWILL', line: 'I AM VERY CONFIDENT.', list, open: F.open * F.setOpen[1] };
    }
    // FULL WEAVE: every tile but one; the gap moves a tile each wave. The last wave lays carpet everywhere else.
    let gc = b.c, gr = b.r, t = first, prev = 0;
    for (let w = 0; w < 8; w++) {
      if (w) { const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([x, y]) => [gc + x, gr + y]).filter(([c, r]) => c >= 0 && c < GR.cols && r >= 0 && r < GR.rows); [gc, gr] = pick(opts); }
      for (let r = 0; r < GR.rows; r++) for (let c = 0; c < GR.cols; c++) if (c !== gc || r !== gr) list.push(laser('tile', 0, true, prev, t, { c, r, lay: w === 7 }));
      list.push(laser('gap', 0, false, prev, t, { c: gc, r: gr }));
      prev = t; t += beatGap(.8);
    }
    return { name: 'FULL WEAVE', line: 'MAXIMUM CARPET. MAXIMUM CARPET.', list, open: F.open * F.setOpen[2] };
  }
  function layCarpet(c, r) { const tl = T(c, r); if (!tl.carpet) { tl.carpet = true; tl.age = 0; tl.flip = 1; tl.grip = 0; } }
  function updateAttack(dt) {
    const a = Q.atk, me = Q.at;
    a.t += dt;
    if (a.stage === 'idle') {
      if (a.t < a.wait) return;
      const set = Q.spPending, p = set ? patternSet(Q.round - 1) : patternNormal();
      if (set) {
        Q.spPending = false; Q.spDone[Q.round - 1] = true; R.banner = { text: p.name, t: 0, dur: 1.6, y: 58 };
        say(p.line); Snd.play('setPiece'); effects.shake(ROOF.effects.shake.set, .3); emit('roof_set', { kind: p.name });
      }
      Object.assign(a, { stage: 'run', t: 0, list: p.list, open: p.open, set, real: p.list.some(l => l.real) });
      a.end = Math.max(...p.list.map(l => l.t1 + lenOf(l)));
      emit('roof_attack', { kind: set ? 'set' : 'normal' });
      return;
    }
    if (a.stage === 'run') {
      let warned = false, fake = false, fired = false, stitched = false;
      for (const l of a.list) {
        if (!l.told && a.t >= l.t0) { l.told = true; if (l.k !== 'gap') { warned = true; if (!l.real) fake = true; } }
        if (a.t < l.t1 || l.k === 'gap') continue;
        if (!l.fired) { l.fired = true; if (l.real) { if (l.k === 'tile') stitched = true; else fired = true; } }
        if (l.k === 'tile') {
          if (l.real && a.t <= l.t1 + F.stitch) {
            if (l.lay && !l.laid) { l.laid = true; layCarpet(l.c, l.r); }
            if (me.c === l.c && me.r === l.r) hurtBull(ROOF.hitCost, 'stitch');
          }
          continue;
        }
        const path = pathOf(l), p = clamp((a.t - l.t1) / lenOf(l), 0, 1), idx = Math.min(path.length - 1, Math.floor(p * path.length));
        while (l.done < idx) { l.done++; const tt = path[l.done]; if (l.real && l.lay) layCarpet(tt.c, tt.r); }
        if (l.real && a.t <= l.t1 + lenOf(l)) {
          // the whole lit length of the beam hurts, not only its tip
          for (let i = 0; i <= idx; i++) if (path[i].c === me.c && path[i].r === me.r) hurtBull(ROOF.hitCost, 'laser');
        }
        if (R.phase === 'dead') return;
      }
      if (warned) {
        Snd.play('laserWarn'); if (fake) Snd.play('laserWarnFake');
        if (a.set) { if (a.list.some(l => l.k === 'gap')) tip('gap', 'FIND THE GOLD GAP'); }
        else {
          if (fake) tip('fake', 'DOTTED AND SHAKING = NOT REAL');
          if (a.list.some(l => l.k === 'col') && a.list.some(l => l.real && l.k === 'row')) tip('cross', 'WARP AND WEFT: STEP DIAGONALLY');
          tip('warn', 'STEP OFF THE RED');
        }
      }
      if (fired) Snd.play('laser'); if (stitched) Snd.play('stitch');
      if (a.t >= a.end) {
        a.t = 0;
        if (a.real) {
          a.stage = 'heat'; Q.stall = Q.stallMax = a.open; Q.heatHits = 0; Snd.play('eyeOpen'); emit('roof_stall');
          popText(a.set ? 'OVERHEATED!' : 'OPEN', PX(Q.eye.u, ROOF.eyeZ), YH(ROOF.eyeZ, ROOF.eyeH) - 14, '#ffffff');
          if (a.set) say('ERR.');
          tip('open', "IT'S OPEN: SHOOT IT!");
        } else { a.stage = 'idle'; a.wait = F.fakeWait; }
      }
      return;
    }
    if (a.stage === 'heat' && Q.stall <= 0) { a.stage = 'idle'; a.t = 0; a.wait = F.gap[Q.round - 1]; }
  }
  function updateTiles(dt) {
    const ph = Q.round - 1, under = T(Q.at.c, Q.at.r);
    for (const tl of Q.tiles) { tl.age += dt; tl.flip = tl.flip > 0 ? Math.max(0, tl.flip - dt * 4) : Math.min(0, tl.flip + dt * 4); if (tl !== under) tl.grip = Math.max(0, tl.grip - dt * F.gripDecay); }
    // carpet spreads to a neighbour now and then, up to the phase's cap
    Q.spreadT -= dt;
    if (Q.spreadT <= 0) {
      Q.spreadT = F.spread[ph];
      if (Q.tiles.filter(t => t.carpet).length < F.cap[ph]) {
        const options = [];
        for (let r = 0; r < GR.rows; r++) for (let c = 0; c < GR.cols; c++) {
          if (T(c, r).carpet) continue;
          if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([x, y]) => c + x >= 0 && c + x < GR.cols && r + y >= 0 && r + y < GR.rows && T(c + x, r + y).carpet && T(c + x, r + y).age > F.spreadAge)) options.push([c, r]);
        }
        if (options.length) { const [c, r] = pick(options); layCarpet(c, r); Snd.play('carpetSpread'); }
      }
    }
    // carpet under him pulls the rug after a second: it flickers and its tassels stand up first
    if (under.carpet && bull.inv <= 0 && settled()) {
      under.grip += dt; under.tick += dt;
      tip('grip', 'CARPET UNDER YOU: SLASH IT OR STEP OFF');
      if (under.tick > .22) { under.tick = 0; Snd.play('grip'); }
      if (under.grip >= F.grip) {
        under.carpet = false; under.grip = 0; under.flip = -1; Snd.play('rugPull'); emit('roof_pull');
        Q.yank = { c: Q.at.c, r: Q.at.r, u: bull.u, t: 0 };   // drawn: the rug whips out from under him (drawYank)
        effects.shake(2, .2); bull.pin = F.pullPin;
        popText('RUG PULL', PX(bull.u, bull.bz), YH(bull.bz, .42), '#ff7050');
        hurtBull(ROOF.hitCost, 'pull');
      }
    }
  }
  // Carpshits hatch out of the carpet: a carpet tile bulges for a moment (hatchWarn), then the carpshit peels up out of
  // it and the tile is bare roof again. A fixed number a phase, so stalling earns nothing; with no carpet down, none come
  // until some is. Tiles further up the roof first, never his own. From the second phase some are hallucinations:
  // harmless, six-legged, and they leave the carpet where it was.
  function updateHatch(dt) {
    const ph = Q.round - 1;
    for (const h of Q.hatching) {
      h.t -= dt;
      if (h.t > 0) continue;
      h.done = true;
      const tl = T(h.c, h.r);
      if (!tl.carpet) continue;   // reclaimed before it hatched: nothing comes out
      if (h.fake) { Q.fakes.push({ u: tileU(h.c), z: tileZ(h.r), h: .01, ph: rnd() * 6, t: 0 }); continue; }
      tl.carpet = false; tl.grip = 0; tl.flip = -.6;
      R.flies.push({ u: tileU(h.c), z: tileZ(h.r), h: .01, hp: ROOF.flyHP, form: false, ph: rnd() * 6, hit: 0, dead: false, cause: 'carp' });
      poof(tileU(h.c), tileZ(h.r), .03, 5); Snd.play('carpetSpread');
      emit('roof_hatch');
      tip('carp', 'CARPSHIT: SHOOT OR SLASH IT');
    }
    Q.hatching = Q.hatching.filter(h => !h.done);
    Q.hatchT -= dt;
    if (Q.hatchT > 0 || Q.hatchLeft <= 0) return;
    const busy = (c, r) => Q.hatching.some(h => h.c === c && h.r === r);
    const ok = [];
    for (let r = 0; r < GR.rows; r++) for (let c = 0; c < GR.cols; c++) {
      const tl = T(c, r);
      if (!tl.carpet || tl.age < F.hatchAge || busy(c, r) || (c === Q.at.c && r === Q.at.r)) continue;
      if (r > Q.at.r) ok.push([c, r]);
    }
    // only from further up the roof than him, the furthest row with carpet first: one hatched beside him only flew
    // past him and off the screen (owner, Oct 15)
    const top = Math.max(...ok.map(t => t[1])), from = ok.filter(t => t[1] === top);
    if (!from.length) { Q.hatchT = F.hatchRetry; return; }
    Q.hatchLeft--; Q.hatchT = F.hatchEvery[ph];
    const [c, r] = pick(from);
    Q.hatching.push({ c, r, t: F.hatchWarn });
    if (rnd() < F.fakeCarp[ph]) {
      const other = from.filter(([x, y]) => x !== c || y !== r);
      if (other.length) { const [fc, fr] = pick(other); Q.hatching.push({ c: fc, r: fr, t: F.hatchWarn, fake: true }); }
    }
  }
  function updateFakes(dt) {
    for (const f of Q.fakes) {
      f.t += dt; f.z -= F.fakeSpeed * dt;
      f.u = clamp(f.u + clamp(bull.u - f.u, -.3, .3) * dt * .9, -.75, .75);
      if (f.z < .45) f.h += (.12 - f.h) * Math.min(1, dt * 2.5);
      if (Math.abs(f.z - bull.bz) < .045 && Math.abs(f.u - bull.u) < .12) popFake(f);
      if (f.z < bull.bz - .12) f.gone = true;
    }
    Q.fakes = Q.fakes.filter(f => !f.gone);
  }
  function popFake(f) {
    if (f.gone) return;
    f.gone = true; Snd.play('fakePop'); poof(f.u, f.z, f.h, 4);
    popText('NOT REAL', PX(f.u, f.z), YH(f.z, f.h) - 8, '#c8b8ff');
  }
  function roundTick(dt) {
    const wasOpen = Q.stall > 0;
    Q.stall = Math.max(0, Q.stall - dt); Q.slam = Math.max(0, Q.slam - dt);
    if (wasOpen && Q.stall <= 0) Q.closedAt = R.t;
    const locked = Q.stall > 0 || Q.atk.stage === 'run';
    if (!locked) {
      Q.eye.u += clamp(bull.u - Q.eye.u, -ROOF.eyeFollow * dt, ROOF.eyeFollow * dt);
      Q.twinU = clamp(Q.eye.u + (Q.eye.u > 0 ? -F.twin : F.twin), -ROOF.eyeLimit, ROOF.eyeLimit);
    }
    updateTiles(dt); if (R.phase === 'dead') return;
    updateHatch(dt); updateFakes(dt);
    updateAttack(dt);
  }
  // Slash: the blade reclaims carpet on his row (his tile and the tiles either side), cuts carpshits and pops fakes.
  // On bare roof with nothing to cut it whiffs and roots him for half a second, so spamming Slash doesn't pay.
  function slash(near) {
    const wc = Q.walkCarp;
    if (wc && !wc.dead && near(wc.u, wc.z)) killWalkCarp('slash');
    for (const f of Q.fakes) if (near(f.u, f.z)) popFake(f);
    if (bull.slash !== 0 || Q.slashAt === R.t) return;
    Q.slashAt = R.t;
    if (!isRound() && !['walk', 'reset', 'quiet'].includes(Q.state)) return;
    let n = 0;
    for (let c = Q.at.c - F.reach; c <= Q.at.c + F.reach; c++) {
      if (c < 0 || c >= GR.cols) continue;
      const tl = T(c, Q.at.r);
      if (!tl.carpet) continue;
      tl.carpet = false; tl.grip = 0; tl.flip = -1; tl.age = 0; Snd.play('reclaim', n); n++;
      const x = PX(tileU(c), tileZ(Q.at.r)), y = FY(tileZ(Q.at.r));
      for (let i = 0; i < 6; i++) sparks(tileU(c) + (i - 2.5) * .03, tileZ(Q.at.r), .04, i % 2 ? '#ffd44a' : '#d63428');
      R.fx.push({ k: 'poof', x, y, s: sc(tileZ(Q.at.r)), n: 8, t: 0, dur: .35 });
    }
    if (n) {
      emit('roof_reclaim', { amount: n }); R.freeze = Math.max(R.freeze, F.reclaimFreeze); effects.shake(1 + n * .4, .15);
      popText(n > 1 ? 'RECLAIMED x' + n : 'RECLAIMED', PX(bull.u, bull.bz), YH(bull.bz, .45), '#bfefff');
    } else if (isRound() && !R.flies.some(f => !f.dead && near(f.u, f.z))) {
      bull.pin = F.whiff; Snd.play('whiff'); emit('roof_whiff');
      popText('WHIFF', PX(bull.u, bull.bz), YH(bull.bz, .45), '#a89cc4');
      tip('whiff', 'SLASH ONLY ON CARPET');
    }
  }
  function shotHits(s) {
    const wc = Q.walkCarp;
    if (wc && !wc.dead && Math.abs(s.u - wc.u) < .11 && Math.abs(s.z - wc.z) < .06) {
      s.dead = true; wc.hp--; wc.hit = .1; Snd.play('hit'); sparks(wc.u, wc.z, wc.h);
      if (wc.hp <= 0) killWalkCarp('shot');
      return true;
    }
    if (s.z < ROOF.eyeZ - ROOF.eyeHitZ || Math.abs(s.u - Q.eye.u) >= ROOF.eyeHit || Math.abs(s.h - ROOF.eyeH) > ROOF.eyeHitH) return false;
    s.dead = true;
    const open = Q.stall > 0 || R.t - Q.closedAt < F.grace, i = Q.broken, th = Math.round(HPS * F.setAt);
    if (isRound() && open && !Q.intermission) {
      if (!Q.spDone[i] && Q.hp <= th) { sparks(Q.eye.u, ROOF.eyeZ, ROOF.eyeH, '#9aa0b8'); return true; }
      Q.hp--; Q.hits++; Q.heatHits = (Q.heatHits || 0) + 1; Q.odds = Q.realOdds = oddsAt(Q.hits); Q.kick = .12;
      emit('roof_spool_damage', { amount: 1 }); Snd.play('eyeHit', Math.min(14, Q.heatHits));
      for (let k = 0; k < 2; k++) sparks(Q.eye.u, ROOF.eyeZ, ROOF.eyeH, k ? '#ffffff' : '#ffd44a');
      if (Q.heatHits % 4 === 1) popText(Math.ceil(Q.odds) + '%', PX(Q.eye.u, ROOF.eyeZ) + (Math.random() - .5) * 20, YH(ROOF.eyeZ, ROOF.eyeH) - 10, '#ff7050');
      if (!Q.spDone[i] && Q.hp <= th) {
        // it panics before the spool can go: the eye slams shut and it runs its set piece
        Q.stall = 0; Q.closedAt = -9; Q.atk = { stage: 'idle', t: 0, wait: F.setWait, list: [], end: 0, set: false, real: false, open: F.open };
        Q.spPending = true; Q.slam = .5; effects.shake(ROOF.effects.shake.slam, .3); Snd.play('slam'); say('NOT YET.');
        R.shots = [];
      } else if (Q.hp <= 0) snapSpool();
    } else {
      // the armour: a clang and sparks, nothing more
      sparks(s.u, ROOF.eyeZ, s.h, '#9aa0b8'); Snd.play('clang');
      if (Q.state === 'reset') popText('NO CHANGE.', PX(Q.eye.u, ROOF.eyeZ), YH(ROOF.eyeZ, ROOF.eyeH) - 12, '#9aa0b8');
      if (isRound()) { tip('armour', 'ARMOURED: WAIT FOR IT TO OPEN'); if (Q.recalc <= 0) { say('RECALCULATING.'); Q.recalc = ROOF.recalculatingGap; } }
    }
    return true;
  }
  function snapSpool() {
    effects.spool(); Snd.play('spoolSnap'); Snd.roofCue('spool'); Q.broken++; Q.hot = ROOF.spoolFlash; emit('roof_spool', { amount: 1 });
    R.shots = []; Q.stall = 0; Q.lurch = 1;
    Q.atk = { stage: 'idle', t: 0, wait: 99, list: [], end: 0, set: false, real: false, open: F.open };
    if (Q.round < 3) { say('NO CHANGE.'); Q.pendingRound = Q.round + 1; Q.intermission = Math.max(R.talk.total, F.snapT); }
    else { say('NO CH'); Q.pendingRound = 0; Q.intermission = F.lastSnapT; }
    Q.snapT = 0; Q.whip = -1; Q.thundered = false;
  }
  // A broken spool is a moment: hit-stop, the loom lurches, lightning, and the loose thread whips across the roof,
  // cutting away every carpet tile and carpshit (a free reclaim). Then the next phase (or the reset).
  function afterSpool(dt) {
    if (R.phase === 'dead' || !(Q.intermission > 0)) return false;
    Q.intermission -= dt; Q.snapT += dt; Q.light = Math.max(0, Q.light - dt * F.lightDecay); Q.lurch = Math.max(0, Q.lurch - dt * 1.4);
    updateTips(dt);
    if (Q.pendingRound) {
      if (Q.snapT >= F.thunderAt && !Q.thundered) { Q.thundered = true; Q.light = .5; Snd.play('thunder', .8); effects.shake(4, .4); }
      if (Q.snapT >= F.whipAt && Q.whip < 0) { Q.whip = 0; Snd.play('whip'); }
      if (Q.whip >= 0 && Q.whip < 1.2) {
        const before = Q.whip; Q.whip += dt / F.whipT;
        for (let r = GR.rows - 1; r >= 0; r--) {
          const at = (GR.rows - 1 - r) / GR.rows + .1;
          if (before >= at || Q.whip < at) continue;
          let n = 0;
          for (let c = 0; c < GR.cols; c++) { const tl = T(c, r); if (tl.carpet) { tl.carpet = false; tl.grip = 0; tl.flip = -1; Snd.play('reclaim', n++); } }
          for (const f of R.flies) if (!f.dead && Math.abs(f.z - tileZ(r)) < GR.depth) core.killFly(f, 'whip');
          for (const f of Q.fakes) if (Math.abs(f.z - tileZ(r)) < GR.depth) popFake(f);
          if (n) { emit('roof_reclaim', { amount: n, by: 'whip' }); popText('CUT LOOSE', PX(0, tileZ(r)), YH(tileZ(r), .2), '#bfefff'); }
        }
      }
    }
    if (Q.intermission <= 0) enter(Q.pendingRound ? 'round' + Q.pendingRound : 'reset');
    else updateFx(dt);
    return true;
  }
  function soulFreed(f, source, by) {
    if (!isRound() || by === 'clear') return;
    f.to = { x: PX(Q.eye.u, ROOF.eyeZ), y: LM.beam + 15 }; f.caught = true; effects.capture(f);
    popText('CAUGHT', f.to.x, f.to.y, '#ffd44a');
  }
  function soulLanded(f) { if (f.caught) { effects.landed(f); Q.caught++; Q.capturedTotal++; emit('roof_caught', { amount: 1 }); } }
  // where the beam is across the roof at depth z: from his gun, bending toward its tip with distance
  function beamAt(z) {
    const k = clamp((z - bull.bz) / (ROOF.eyeZ - bull.bz), 0, 1);
    return bull.u + (Q.beamU - bull.u) * Math.pow(k, ROOF.beamBend);
  }
  function beamTick(dt) {
    // the eye glides along its rail in a smooth wave; he walks the beam under it (walkFree)
    if (Q.state === 'run') {
      Q.swingT = (Q.swingT || 0) + dt;
      const w = ROOF.eyeSwingRate, u = ROOF.eyeSwing * Math.sin(w * Q.swingT);
      Q.eye.v = ROOF.eyeSwing * w * Math.cos(w * Q.swingT); Q.eye.u = u;
    }
    const on = Math.abs(Q.beamU - Q.eye.u) < ROOF.beamHit, music = R.t - (Q.fusedAt || 0);
    if (on) {
      Q.odds = Math.max(oddsLine(music), Q.odds - ROOF.drain * dt); Q.hot = ROOF.beamFlash;
      if (!Q.onEye && Q.state === 'run' && Q.recalc <= 0) { say('RECALCULATING.'); Q.recalc = ROOF.recalculatingGap; }
    } else Q.odds = Math.min(ROOF.odds, Q.odds + ROOF.creep * dt);
    Q.onEye = on;
    Q.nextFly -= dt;
    if (Q.nextFly <= 0 && Q.beamLeft > 0) { spawnCarp(); Q.beamLeft--; Q.nextFly = rr(ROOF.beamFlyGap[0], ROOF.beamFlyGap[1]); }
    // the beam melts what's in it; heavies take a moment
    for (const f of R.flies) {
      if (f.dead || Math.abs(f.u - beamAt(f.z)) > ROOF.beamWidth + (f.heavy ? .13 : .1)) continue;
      f.hp -= ROOF.beamMelt * dt; f.hit = .05;
      if (f.hp <= 0) { core.killFly(f, 'beam'); R.freeze = 0; }   // the beam melts through them without a hitch
    }
    // at 1% it waits for the next bar line of the music
    if (Q.odds <= ROOF.minimum && !Q.endAt) Q.endAt = (Q.fusedAt || 0) + Math.ceil((music - ROOF.barSlack) / ROOF.bar) * ROOF.bar;
    if (Q.endAt && R.t >= Q.endAt && Q.state !== 'lines') enter('one');
  }
  // the lowest the odds can be this far into the music: 99 when the beam first lands, 1% at the end of the solo
  function oddsLine(music) {
    const from = Q.lineFrom || 0, k = clamp((music - from) / Math.max(.01, ROOF.soloEnd - from), 0, 1);
    return ROOF.odds - (ROOF.odds - ROOF.minimum) * k;
  }
  function spawnCarp() {
    const heavy = rnd() < ROOF.beamHeavy;
    R.flies.push({ u: rr(-ROOF.aisle + .12, ROOF.aisle - .12), z: 1, h: .35, hp: heavy ? ROOF.heavyHP : ROOF.flyHP, heavy, form: false, ph: rnd() * 6, hit: 0, dead: false, cause: 'carp' });
  }
  function eyeAt() { return Q.eye; }
  function aim(consider) {
    if (isRound() && Q.stall > 0 && !Q.intermission) consider(Q.eye, Q.eye, ROOF.aimCone);
    if (Q.walkCarp && !Q.walkCarp.dead) consider(Q.walkCarp, Q.walkCarp, .3);
  }
  function view() {
    return { scroll: R.dist * core.WZ, rug: R.dist * core.WZ, power: 0, house: 0, dark: false,
      ambient: (lightRoof() ? (Q.state === 'walk' ? ROOF.darkAmbient + (ROOF.fightAmbient - ROOF.darkAmbient) * (Q.litRows || []).filter(Boolean).length / GR.rows : ROOF.fightAmbient) : ROOF.darkAmbient) + (effects.flash(Q) + Q.light) * ROOF.flashAmbient + (beamActive() ? ROOF.warmAmbient : 0),
      dawn: Q.state === 'clear' || Q.state === 'ending' ? 1 : Q.state === 'dawn' ? Math.min(1, Q.t / ROOF.effects.dawnWarm) : 0,
      look: { ti: [.14, .13, .17], sh: .45 }, edge: null };
  }
  const lightRoof = () => isRound() || ['walk', 'flash', 'wake', 'odds', 'reset', 'quiet', 'return', 'flood', 'pinch', 'lines', 'beam', 'run', 'one'].includes(Q.state);
  function eyeColor() { return Q.stall > 0 || Q.onEye ? [1.5, 1.5, 1.4] : Q.atk.stage === 'run' ? [1.1, .05, .025] : [.9, .32, .06]; }
  function lights(r) {
    if (!['elevator', 'walk', 'flash', 'snap', ...AFTER].includes(Q.state)) r.light(...world(Q.eye.u, ROOF.eyeZ, ROOF.eyeH), ...eyeColor());
    if (Q.state === 'ending') {   // the eye, red again, then leaving
      const e = ending.eyeLight(PX(Q.eye.u, ROOF.eyeZ), YH(ROOF.eyeZ, ROOF.eyeH));
      if (e) { const z = ROOF.eyeZ, u = (e.x - VX) / (112 * sc(z)), h = (FY(z) - e.y) / (FY(z) - YH(z, 1)); r.light(...world(u, z, h), 1.2 * e.k, .06 * e.k, .03 * e.k); }
    }
    if (Q.round === 3 && isRound()) r.light(...world(Q.twinU, ROOF.eyeZ, ROOF.eyeH - .08), .5, .08, .04);
    // real lasers light the roof where they burn; hallucinations give no light
    if (isRound() && Q.atk.stage === 'run') {
      let n = 0;
      for (const l of Q.atk.list) {
        if (!l.real || l.k === 'gap' || Q.atk.t < l.t1 || Q.atk.t > l.t1 + lenOf(l) || n >= 4) continue;
        const tip = laserTip(l); r.light(...world(tip.u, tip.z, .05), .8, .12, .06); n++;
      }
    }
    if (beamActive()) {
      const flicker = .9 + .1 * Math.sin(R.t * 71);
      for (let i = 0; i < ROOF.effects.beamLights; i++) {
        const k = i / (ROOF.effects.beamLights - 1);
        r.light(...world(beamAt(bull.bz + (ROOF.eyeZ - bull.bz) * k), bull.bz + (ROOF.eyeZ - bull.bz) * k, .3 + (ROOF.eyeH - .3) * k),
          .6 * flicker, .45 * flicker, .12 * flicker);
      }
    }
    effects.soulLights(r, Q);
  }
  // where a sweeping beam's point is now, in roof units
  function laserTip(l) {
    if (l.k === 'tile') return { u: tileU(l.c), z: tileZ(l.r) };
    const p = clamp((Q.atk.t - l.t1) / lenOf(l), 0, 1);
    if (l.k === 'col') return { u: tileU(l.i), z: GR.z0 + GR.rows * GR.depth - p * GR.rows * GR.depth };
    return { u: l.dir > 0 ? -ROOF.aisle + p * 2 * ROOF.aisle : ROOF.aisle - p * 2 * ROOF.aisle, z: tileZ(l.i) };
  }

  // ---------- replaceable stand-in drawing ----------
  function drawSpool(i) {
    const x = LM.spools[i], broken = i < Q.broken;
    if (broken && Q.respool > 0 && !['pinch', 'fusion', 'lines', 'beam', 'run', 'one', 'snap', ...AFTER].includes(Q.state)) {
      // a replacement spool wound from souls: pale and glowing, each wrap a soul; it unwinds as they leave
      const left = ['return', 'flood'].includes(Q.state) ? Q.caught / Math.max(1, Q.capturedTotal) : 1;
      const w = Math.max(2, (LM.spoolW - 2) * Q.respool * left), shake = i === 1 && Q.state === 'quiet' ? Math.sin(R.t * 40) * Math.min(2, Q.quietT) : 0;
      const hw = LM.spoolW / 2; rect(g, x - hw - 1, LM.top - 1, 1, 9, '#4b4a58'); rect(g, x + hw, LM.top - 1, 1, 9, '#4b4a58');
      rect(g, x - w / 2, LM.top + 1, w, 7, '#dfeeff');
      for (let y = LM.top + 2; y < LM.top + 8; y += 2) rect(g, x - w / 2, y, w, 1, '#a8c4e8');
      if (i === 1 && Q.state === 'quiet') rect(g, x - 2 + shake, LM.top - 1 - Math.min(4, Q.quietT * 2), 4, 5, '#ffffff');
      return;
    }
    rect(g, x - LM.spoolW / 2, LM.top + 1, LM.spoolW, 7, broken ? '#24222f' : '#b0a088');
    if (broken) line(g, x - 6, LM.top + 8, x + 5, LM.top + 14, '#9496a8');
    else if (i === Q.round - 1) {
      const cracks = Math.floor((1 - Q.hp / HPS) * 6), j = Q.kick > 0 ? Math.round((Math.random() - .5) * 2) : 0;
      for (let k = 0; k < cracks; k++) line(g, x - 6 + k * 2.4 + j, LM.top + 1, x - 5 + k * 2.4 + j, LM.top + 8, '#1a1824');
    }
  }
  function soulSpot(i) {
    // All captives are drawn: sixty thread gaps, with shallow overlapping stacks as the warp fills.
    const slots = LM.warpColumns * LM.warpRows, slot = i % slots, layer = Math.floor(i / slots);
    return { x: LM.left + LM.frame + 3 + slot % LM.warpColumns * (LM.right - LM.left - 2 * LM.frame - 8) / LM.warpColumns + layer * LM.soulOverlap,
      y: LM.beam + 3 + Math.floor(slot / LM.warpColumns) * (LM.cloth - LM.beam - 8) / LM.warpRows + layer * LM.soulOverlap };
  }
  function soulFlight(i, delay) { return Object.assign({ delay }, soulSpot(i)); }
  function drawWarp(layer = 'all') {
    if (layer !== 'souls') for (let i = 0; i < 30; i++) {
      const x = LM.left + LM.frame + 2 + i * (LM.right - LM.left - 2 * LM.frame - 4) / 30, broken = Math.floor(i / 10) < Q.broken;
      const dead = ['snap', ...AFTER].includes(Q.state);
      line(g, x, LM.beam, x + (broken ? Math.sin(R.t + i) * 2 : 0), dead || broken ? LM.beam + 5 : LM.cloth, '#4e4552');
    }
    if (layer !== 'threads') effects.drawWarp(g, Q);
  }
  function drawEye() {
    const x = PX(Q.eye.u, ROOF.eyeZ) + (Q.kick > 0 ? Math.round((Math.random() - .5) * 3) : 0) + (Q.round === 3 && isRound() ? Math.round((Math.random() - .5) * 1.2) : 0), y = YH(ROOF.eyeZ, ROOF.eyeH);
    rect(g, x - 12, y - 3, 24, 6, '#3b3a48'); disc(g, x, y, 9, '#1a1824');
    // waking, it flickers before it opens: dark, orange, dark
    const flick = Q.state === 'wake' && Q.t < ROOF.rise.eyeFlicker && [0, 1, 0, 0, 1, 1, 0, 1][Math.floor(Q.t * 8)] === 0;
    if ((Q.state === 'ending' || Q.state === 'clear') && ending.drawEye(g, x, y)) return;   // gone, once the ending has played
    const dead = ['snap', ...AFTER].includes(Q.state), shut = ['elevator', 'walk', 'flash'].includes(Q.state) || flick;
    if (shut) { line(g, x - 6, y, x + 6, y, '#c87818'); return; }
    const open = Q.stall > 0 || Q.onEye;
    if (Q.stall > 0) {
      // the opening: a pulsing white ring and a ring counting down what's left of it
      const pulse = .5 + .5 * Math.sin(R.t * 16), left = Q.stall / Math.max(.01, Q.stallMax || F.open);
      g.save(); g.strokeStyle = 'rgba(255,255,255,' + (.45 + .5 * pulse) + ')'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 10.5 + pulse * 1.5, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#ffd44a'; g.beginPath(); g.arc(x, y, 13.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.stroke(); g.restore();
    }
    // never white on white: open, it's a hot yellow with a white core inside its dark ring; shut, orange with a pupil
    disc(g, x, y, 6, dead ? '#2f2d3b' : open ? '#ffc23a' : Q.atk.stage === 'run' ? '#ff3430' : '#ff9628');
    if (!dead && open) disc(g, x, y, 2.5 + Math.sin(R.t * 30) * .5, '#ffffff');
    if (!dead && !open) disc(g, x + clamp(bull.u - Q.eye.u, -2, 2), y, 2, '#110f18');
    // damage stays on the eye: cracks for the hits it has taken, and for the odds the beam takes
    const cracks = Math.min(8, Math.floor(8 * Q.hits / (ROOF.spools * HPS)) + Math.floor((1 - Q.odds / ROOF.odds) * 6 * (beamActive() || ['one', 'snap'].includes(Q.state) ? 1 : 0)));
    for (let i = 0; i < cracks; i++) line(g, x, y, x + Math.cos(i * 2.1 + .3) * 7, y + Math.sin(i * 2.1 + .3) * 7, open ? '#9a8a70' : '#1a1418');
    // before the beam, the streams crack its armour ring: pale splits from the rim inward, more with every clang
    if (['return', 'flood', 'pinch'].includes(Q.state)) {
      const k = Math.min(1, (Q.armour || 0) / ROOF.armourCracks), n = Math.floor(k * 9);
      for (let i = 0; i < n; i++) {
        const a = i * 2.4 + 1.1, r0 = 9, r1 = 9 - 2.5 - k * 3 - (i % 3);
        line(g, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a + .25) * r1, y + Math.sin(a + .25) * r1, '#c8ccd8');
      }
      if (Q.state === 'pinch' && k >= 1) disc(g, x, y, 2 + Math.sin(R.t * 40), '#ffffff');   // light through the cracks before it opens
    }
    if (Q.slam > 0) { const k = Math.min(1, Q.slam * 4); rect(g, x - 7, y - 7, 14, Math.round(7 * k), '#3b3a48'); rect(g, x - 7, y + 7 - Math.round(7 * k), 14, Math.round(7 * k), '#3b3a48'); }
    if (Q.round === 3 && isRound()) {
      // the twin shuttle that fires the weft
      const tx = PX(Q.twinU, ROOF.eyeZ), ty = YH(ROOF.eyeZ, ROOF.eyeH - .08), firing = Q.atk.stage === 'run' && Q.atk.list.some(l => l.twin);
      rect(g, tx - 8, ty - 2, 16, 4, '#3b3a48'); disc(g, tx, ty, 6, '#1a1824'); disc(g, tx, ty, 4, firing ? '#ff3430' : '#c86a28');
    }
  }
  // how far p(Loom) has risen from behind the roof's far edge: not at all before the flash, all the way after it
  function loomRise() {
    if (['elevator', 'walk'].includes(Q.state)) return 0;
    if (Q.state !== 'flash') return 1;
    const k = clamp((Q.t - ROOF.rise.from) / (ROOF.rise.to - ROOF.rise.from), 0, 1); return k * k * (3 - 2 * k);
  }
  // draw part of the loom as risen: moved down by what's left to rise and cut off at the roof's far edge
  function withLoom(fn) {
    const k = loomRise(); if (k <= 0) return;
    if (k >= 1) { fn(); return; }
    g.save(); g.beginPath(); g.rect(0, -H, W, H + LM.base + 1); g.clip(); g.translate(0, Math.round((1 - k) * (LM.base - LM.top + 4) * 2) / 2);
    fn(); g.restore();
  }
  function drawLoom() { withLoom(drawLoomRisen); }
  function drawLoomRisen() {
    g.save();
    if (Q.lurch > 0) g.translate(Math.round(Math.sin(R.t * 31) * Q.lurch * 2), Math.round(Q.lurch * 2));
    rect(g, LM.left + LM.frame, LM.beam, LM.right - LM.left - 2 * LM.frame, LM.cloth - LM.beam, '#1c1822');   // dark behind the warp, so the eye stands out
    for (const x of [LM.left, LM.right - LM.frame]) rect(g, x, LM.top, LM.frame, LM.base - LM.top, '#4b4a58');
    rect(g, LM.left, LM.top, LM.right - LM.left, LM.beam - LM.top, '#3b3a48');
    for (let i = 0; i < 5; i++) line(g, LM.left + 8 + i * 14, LM.top, LM.left + 8 + i * 14 + (i - 2) * 10, 0, '#5e5e6c');
    for (let i = 0; i < 3; i++) drawSpool(i);
    drawWarp('threads'); rect(g, LM.left + LM.frame, LM.rail - 1.5, LM.right - LM.left - 2 * LM.frame, 3, '#4b4a58');
    rect(g, LM.left + LM.frame, LM.cloth, LM.right - LM.left - 2 * LM.frame, LM.base - LM.cloth, '#761c1e');
    drawEye(); g.restore();
  }
  // the roof's tiles: carpet in the hall's light; the grid, warnings and lasers glow so they read in the dark
  const tileQuad = (c, r, inset = 0) => {
    const u0 = tileU(c) - TW / 2 + inset * TW, u1 = tileU(c) + TW / 2 - inset * TW, z0 = GR.z0 + r * GR.depth + inset * GR.depth, z1 = GR.z0 + (r + 1) * GR.depth - inset * GR.depth;
    return [[PX(u0, z0), FY(z0)], [PX(u1, z0), FY(z0)], [PX(u1, z1), FY(z1)], [PX(u0, z1), FY(z1)]];
  };
  function path(pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
  // Every tile is drawn solid: a pale roof slab with dark seams, or carpet over it. Nothing see-through on the floor.
  const SLAB = ['#7a7586', '#726d7e'], SEAM = '#2c2836';
  const gridShown = () => !!Q.tiles && (isRound() || ['walk', 'flash', 'wake', 'odds', 'reset', 'quiet', 'return', 'flood', 'pinch', 'fusion', 'lines', 'beam', 'run', 'one'].includes(Q.state));
  function drawTiles() {
    if (!gridShown()) return;
    for (let r = GR.rows - 1; r >= 0; r--) for (let c = 0; c < GR.cols; c++) {
      const tl = T(c, r), q = tileQuad(c, r);
      // before its floodlight clunks on (the walk's arrival), a row is dark roof
      if (Q.state === 'walk' && Q.litRows && !Q.litRows[r]) { poly(g, SEAM, q); poly(g, '#2e2b38', tileQuad(c, r, .04)); continue; }
      poly(g, SEAM, q); poly(g, SLAB[(c + r) & 1], tileQuad(c, r, .04));
      // a tile just cleared flashes white, under him in the lit layer (drawn over him, it cut him off at the tile)
      if (!tl.carpet && tl.flip < 0) { g.save(); g.globalAlpha = -tl.flip * .8; poly(g, '#ffffff', tileQuad(c, r, .04)); g.restore(); }
      if (!tl.carpet) continue;
      const k = tl.flip > 0 ? 1 - tl.flip : 1;
      poly(g, '#b8262c', tileQuad(c, r, .04 + (.46 - .46 * k)));
      if (k > .8) {
        for (const f of [.3, .7]) { const z = GR.z0 + (r + f) * GR.depth; line(g, PX(tileU(c) - TW * .44, z), FY(z), PX(tileU(c) + TW * .44, z), FY(z), '#e0b040'); }
        const z = GR.z0 + r * GR.depth + GR.depth * .04, x0 = PX(tileU(c) - TW * .46, z), x1 = PX(tileU(c) + TW * .46, z);
        for (let x = x0 + 1; x < x1 - 1; x += 2) rect(g, x, FY(z), 1, 1, '#f0d8a8');
      }
    }
    // a carpshit about to hatch: the carpet heaves up in a lump that grows and wriggles
    for (const h of Q.hatching || []) {
      if (!T(h.c, h.r).carpet) continue;
      const k = 1 - clamp(h.t / F.hatchWarn, 0, 1), z = tileZ(h.r), x = PX(tileU(h.c), z) + Math.sin(R.t * 30) * k, y = FY(z), s = sc(z);
      const w = (8 + 6 * k) * s, hh = (2 + 6 * k) * s;
      g.save(); g.fillStyle = '#7c161c'; g.beginPath(); g.ellipse(x, y, w, hh, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#d23a3a'; g.beginPath(); g.ellipse(x, y - hh * .2, w * .7, hh * .7, 0, Math.PI, 0); g.fill(); g.restore();
    }
  }
  function drawGrid() {
    if (!Q.tiles || !(isRound() || Q.state === 'walk' || Q.state === 'reset')) return;
    g.save(); g.strokeStyle = 'rgba(255,212,74,.6)'; g.lineWidth = .5; path(tileQuad(Q.at.c, Q.at.r, .06)); g.stroke(); g.restore();
    for (let r = 0; r < GR.rows; r++) for (let c = 0; c < GR.cols; c++) {
      const tl = T(c, r);
      if (!tl.carpet || tl.grip <= 0) continue;
      // the warning: the tile's edge flickers white and its tassels stand up, faster as it's about to pull
      const k2 = clamp(tl.grip / F.grip, 0, 1), on = Math.sin(tl.grip * (10 + 26 * k2)) > 0;
      g.save(); g.strokeStyle = on ? '#ffffff' : '#ff6e5a'; g.lineWidth = .5 + k2; path(tileQuad(c, r, .03)); g.stroke(); g.restore();
      const z = GR.z0 + r * GR.depth, x0 = PX(tileU(c) - TW / 2, z), x1 = PX(tileU(c) + TW / 2, z);
      for (let x = x0 + 2; x < x1 - 1; x += 3) rect(g, x, FY(z) - 3 * k2, 1, 3 * k2, '#efe3c4');
    }
  }
  // one warning look for every real target, readable on bare roof and on carpet: darken, hazard stripes, a bright edge
  function warnTile(q, soon, pulse, layer) {
    if (layer === 'lit') {
      g.save(); path(q); g.fillStyle = 'rgba(8,4,10,' + (.72 + .2 * soon) + ')'; g.fill(); g.clip();
      const xs = q.map(p => p[0]), ys = q.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      const off = (R.t * 12) % 4;
      g.strokeStyle = soon > .6 && pulse > .5 ? '#ffffff' : '#ff8a6a'; g.lineWidth = 1.2;
      g.beginPath(); for (let x = x0 - (y1 - y0) - 4 + off; x < x1 + 4; x += 4) { g.moveTo(x, y1); g.lineTo(x + (y1 - y0), y0); } g.stroke();
      g.restore(); return;
    }
    g.save(); g.lineWidth = 1; g.strokeStyle = pulse > .5 ? '#fff0e6' : '#ff4a3a'; path(q); g.stroke(); g.restore();
  }
  function fakeTile(q) { g.save(); g.lineWidth = 1; g.strokeStyle = '#d8ccff'; g.setLineDash([1.5, 1.5]); path(q); g.stroke(); g.restore(); }
  const eyeSrc = l => l.twin ? [PX(Q.twinU, ROOF.eyeZ), YH(ROOF.eyeZ, ROOF.eyeH - .08)] : [PX(Q.eye.u, ROOF.eyeZ), YH(ROOF.eyeZ, ROOF.eyeH)];
  function drawWarnings(layer) {
    const a = Q.atk; if (!isRound() || a.stage !== 'run') return;
    const pulse = Math.pow(1 - (((R.t - Q.beat0) / BEAT) % 1 + 1) % 1, 3);
    for (const l of a.list) {
      if (a.t < l.t0 || a.t >= l.t1 + (l.k === 'gap' ? F.stitch : 0)) continue;
      const soon = clamp(1 - (l.t1 - a.t) / 1.2, 0, 1), j = l.real ? 0 : Math.round(Math.sin(R.t * 31 + l.i + (l.c || 0)) * 1);
      if (layer === 'lit' && (l.k === 'gap' || !l.real)) continue;
      if (l.k === 'gap') {
        const rows = l.r < 0 ? [0, 1, 2] : [l.r];
        g.save(); g.strokeStyle = '#ffd44a'; g.lineWidth = 1; for (const r of rows) { path(tileQuad(l.c, r, .06)); g.stroke(); } g.restore();
        const r = l.r < 0 ? 1 : l.r; otxt(g, 'SAFE', PX(tileU(l.c), tileZ(r)), FY(tileZ(r)) - 4, '#ffd44a', 1, 'center');
        continue;
      }
      g.save(); g.translate(j, 0);
      for (const t of pathOf(l)) {
        // his own tile's edge is drawn under him (lit layer); the rest glow over everything
        const q = tileQuad(t.c, t.r, .05), mine = t.c === Q.at.c && t.r === Q.at.r;
        if (!l.real) { if (layer !== 'lit') fakeTile(q); continue; }
        if (layer === 'lit') { warnTile(q, soon, pulse, 'lit'); if (mine) warnTile(q, soon, pulse, 'edge'); }
        else if (!mine) warnTile(q, soon, pulse, layer);
      }
      if (layer === 'lit') { g.restore(); continue; }
      // the aim line from the eye (or the twin) to where the attack starts
      const [ex, ey] = eyeSrc(l), first = pathOf(l)[0], fz = l.k === 'col' ? GR.z0 + GR.rows * GR.depth : tileZ(first.r);
      const fu = l.k === 'row' ? (l.dir > 0 ? -ROOF.aisle : ROOF.aisle) : tileU(first.c);
      g.strokeStyle = l.real ? 'rgba(255,74,58,.7)' : 'rgba(216,204,255,.7)'; g.lineWidth = .5; if (!l.real) g.setLineDash([1, 2]);
      g.beginPath(); g.moveTo(ex, ey); g.lineTo(PX(fu, fz), YH(fz, 0)); g.stroke(); g.setLineDash([]);
      g.restore();
    }
  }
  function drawLasers() {
    const a = Q.atk; if (!isRound() || a.stage !== 'run') return;
    for (const l of a.list) {
      if (l.k === 'gap' || a.t < l.t1 || a.t > l.t1 + lenOf(l)) continue;
      const [ex, ey] = eyeSrc(l);
      if (l.k === 'tile') {
        // a stitch: a needle of light straight down onto the tile
        const z = tileZ(l.r), x = PX(tileU(l.c), z), y = FY(z), k = (a.t - l.t1) / F.stitch, s = sc(z);
        if (l.real) {
          g.save(); g.strokeStyle = 'rgba(255,52,48,.5)'; g.lineWidth = 3 * s; g.beginPath(); g.moveTo(x, y - 34 * s); g.lineTo(x, y); g.stroke();
          g.strokeStyle = '#fff3d8'; g.lineWidth = 1; g.stroke(); g.restore();
          g.save(); g.globalAlpha = .6 * (1 - k); poly(g, '#ff5a3a', tileQuad(l.c, l.r, .1)); g.restore();
        } else { g.save(); g.strokeStyle = '#d8ccff'; g.setLineDash([1, 1.5]); g.beginPath(); g.moveTo(x, y - 28 * s); g.lineTo(x, y); g.stroke(); g.restore(); }
        continue;
      }
      const tp = laserTip(l), h = 0, tx = PX(tp.u, tp.z), ty = YH(tp.z, h);
      g.save();
      if (l.real) {
        g.strokeStyle = 'rgba(255,52,48,.45)'; g.lineWidth = 3.5; g.beginPath(); g.moveTo(ex, ey); g.lineTo(tx, ty); g.stroke();
        g.strokeStyle = '#ff5a3a'; g.lineWidth = 1.5; g.stroke(); g.strokeStyle = '#fff3d8'; g.lineWidth = .5; g.stroke();
        // the lit length stays burning on the roof behind its point
        const sz = l.k === 'col' ? GR.z0 + GR.rows * GR.depth : tp.z, su = l.k === 'col' ? tp.u : l.dir > 0 ? -ROOF.aisle : ROOF.aisle;
        g.strokeStyle = '#ff5a3a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(PX(su, sz), YH(sz, h)); g.lineTo(tx, ty); g.stroke();
        disc(g, tx, ty, Math.max(1.5, 4 * sc(tp.z)), 'rgba(255,90,58,.6)');
        if (Math.random() < .5) R.fx.push({ k: 'spark', x: tx, y: ty, s: Math.max(.5, sc(tp.z)), col: '#ffd44a', t: 0, dur: .22, a: Math.random() * 6 });
      } else {
        // a hallucination: dotted, shaking, no light on the roof, breaking into static
        const j = Math.sin(R.t * 40 + l.i) * 1;
        g.strokeStyle = '#d8ccff'; g.setLineDash([1, 2]); g.lineWidth = 1; g.beginPath(); g.moveTo(ex + j, ey); g.lineTo(tx + j, ty); g.stroke(); g.setLineDash([]);
        for (let i = 0; i < 3; i++) rect(g, tx + (Math.random() - .5) * 8, ty + (Math.random() - .5) * 4, 1, 1, Math.random() < .5 ? '#c8b8ff' : '#5a4f80');
      }
      g.restore();
    }
  }
  function drawWhip() {
    if (!(Q.whip >= 0 && Q.whip < 1.2)) return;
    const z = GR.z0 + GR.rows * GR.depth + .02 - Q.whip * (GR.rows * GR.depth + .1), l = PX(-ROOF.aisle - .05, z), r = PX(ROOF.aisle + .05, z), y = YH(z, .03), sp = LM.spools[Q.broken - 1] || 120;
    g.save(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(l, y); g.quadraticCurveTo(VX, y + Math.sin(R.t * 40) * 3, r, y); g.stroke();
    g.strokeStyle = '#efe3c4'; g.lineWidth = 1; g.stroke();
    g.lineWidth = .5; g.beginPath(); g.moveTo(sp, LM.top + 8); g.quadraticCurveTo(sp + 20, LM.beam + 10, VX, y); g.stroke(); g.restore();
  }
  // a heavy carpshit (the beam fight): a bigger, darker, gold-edged rug behind the usual one
  function drawHeavy(f) {
    const src = A.CARPF[Math.floor(R.t * 8 + f.ph) % 2], s = sc(f.z), x = PX(f.u, f.z), y = YH(f.z, f.h);
    for (const [k, col] of [[1.75, '#c99a2e'], [1.6, '#4a0c12']]) {
      const img = tinted(src, col), w = img.width * img.k * s * k, h = img.height * img.k * s * k;
      g.drawImage(img, x - w / 2, y - h / 2 + Math.sin(R.t * 6 + f.ph) * s, w, h);
    }
  }
  function drawFake(f) {
    // a hallucinated carpshit: pale violet, flickering, scanlined, six legs
    const img = tinted(A.CARPF[Math.floor(R.t * 8 + f.ph) % 2], '#c8b8ff'), s = sc(f.z), w = img.width * img.k * s, h = img.height * img.k * s;
    const x = PX(f.u, f.z) + Math.sin(R.t * 37 + f.ph) * s, y = YH(f.z, f.h);
    g.save(); g.globalAlpha = Math.sin(R.t * 22 + f.ph) > 0 ? .85 : .45;
    g.drawImage(img, x - w / 2, y - h / 2, w, h);
    for (let i = 0; i < 6; i++) rect(g, x - w / 2 + (i + .5) * w / 6, y + h / 2 - 1, .5, 2 * s + 1, '#efe3c4');
    g.globalAlpha = .5; for (let yy = y - h / 2; yy < y + h / 2; yy += 1.5) rect(g, x - w / 2, yy, w, .5, '#0a0810');
    g.restore();
  }
  // The carpet under him grabs: while it grips, it heaves up around his feet in a lump, its corners curl up his legs and
  // its fringe reaches for him, faster and higher as it's about to pull (owner, Oct 15: you took a hit and didn't know
  // why). The lump behind his feet is drawn before him, the curling corners and fringe after, so they wrap him.
  function drawGrab(side) {
    if (!isRound() || !Q.tiles) return;
    const tl = T(Q.at.c, Q.at.r); if (!tl.carpet || tl.grip <= 0) return;
    const k = clamp(tl.grip / F.grip, 0, 1), z = bull.bz, s = sc(z), x = PX(bull.u, z), y = FY(z), wob = Math.sin(R.t * (14 + 30 * k)) * k;
    const w = TW * .5 * 112 * s;
    if (side === 'back') {
      g.save(); g.fillStyle = '#7c161c'; g.beginPath(); g.ellipse(x, y, w * 1.2, (2 + 9 * k) * s, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#b8262c'; g.beginPath(); g.ellipse(x, y - k * s, w * .8, (1.5 + 5.5 * k) * s, 0, Math.PI, 0); g.fill(); g.restore();
      return;
    }
    // the two front corners curl up his shins, and the fringe stands up and reaches in
    for (const d of [-1, 1]) {
      const bx = x + d * w * 1.05, tx = x + d * w * (.6 - .35 * k), ty = y - (5 + 22 * k) * s + wob * 2 * s;
      poly(g, '#a01f26', [[bx, y + s], [x + d * w * .45, y + s], [tx, ty], [bx + d * 1.5 * s, ty + 4 * s]]);
      line(g, bx, y + s, tx, ty, '#e0b040');
    }
    for (let i = 0; i < 7; i++) {
      const fx = x - w * .8 + i * w * .27, h = (3 + 9 * k) * s * (1 + .3 * Math.sin(R.t * 40 + i * 1.7)), lean = (x - fx) * .35 * k;
      line(g, fx, y + 1.5 * s, fx + lean, y + 1.5 * s - h, '#f0d8a8');
    }
  }
  // the rug pulled: the tile's carpet whips up from under him and flies off up the roof, flapping
  function drawYank() {
    const yk = Q.yank; if (!yk) return;
    const k = yk.t / .5, z0 = tileZ(yk.r) + k * .55, h = Math.sin(k * Math.PI) * .22, s = sc(z0), x = PX(yk.u, z0), y = YH(z0, h);
    const w = TW * .5 * 112 * s * (1 - .3 * k), flap = Math.sin(yk.t * 40) * 3 * s;
    g.save(); g.globalAlpha = 1 - k * .6;
    poly(g, '#b8262c', [[x - w, y + flap], [x + w, y - flap], [x + w * .8, y + 6 * s - flap], [x - w * .8, y + 6 * s + flap]]);
    line(g, x - w, y + 2 * s + flap, x + w, y + 2 * s - flap, '#e0b040');
    g.restore();
  }
  function drawRain() {
    if (AFTER.includes(Q.state)) return;
    for (let i = 0; i < LM.rain; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      line(g, x, y, x + .8, y + 4, '#76788a');
    }
  }
  // the mega stream: one thick ribbon from the gun to the eye that bends as he moves, in layers (a soft orange halo, then
  // orange, gold and a white-hot core), rippling, with sparks running up it and a flare at each end
  function drawBeam() {
    const m = muzzleXY(), N = 24, t = R.t, pts = [], z0 = bull.bz, mh = .3;
    const base = { x: PX(bull.u, z0), y: YH(z0, mh) };
    for (let i = 0; i <= N; i++) {
      const k = i / N, z = z0 + (ROOF.eyeZ - z0) * k, h = mh + (ROOF.eyeH - mh) * k, near = (1 - k) * (1 - k);
      pts.push({ x: PX(beamAt(z), z) + (m.x - base.x) * near, y: YH(z, h) + (m.y - base.y) * near, hw: Math.max(1, ROOF.beamWidth * 112 * sc(z)) });
    }
    pts.forEach((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
      p.nx = -ty / l; p.ny = tx / l;
    });
    for (const [mul, col, alpha] of [[2.2, '#ff9628', .25], [1.35, '#ff7a1c', 1], [.9, '#ffd44a', 1], [.4, '#fff0aa', 1]]) {
      g.save(); g.globalAlpha = alpha; g.fillStyle = col; g.beginPath();
      pts.forEach((p, k) => { const w = p.hw * mul * (1 + .14 * Math.sin(t * 52 + k * 1.7)); k ? g.lineTo(p.x + p.nx * w, p.y + p.ny * w) : g.moveTo(p.x + p.nx * w, p.y + p.ny * w); });
      for (let k = N; k >= 0; k--) { const p = pts[k], w = p.hw * mul * (1 + .14 * Math.sin(t * 47 + k * 2.3)); g.lineTo(p.x - p.nx * w, p.y - p.ny * w); }
      g.closePath(); g.fill(); g.restore();
    }
    for (let k = 0; k < 6; k++) { const p = pts[Math.floor(((k / 6 + t * 1.9) % 1) * N)], sz = Math.max(1, Math.round(p.hw * .5)); rect(g, Math.round(p.x - sz / 2), Math.round(p.y - sz / 2), sz, sz, '#ffffff'); }
    const e = pts[N], fl = Math.floor(t * 30) % 2;
    disc(g, e.x, e.y, Q.onEye ? 10 : fl ? 5 : 4, Q.onEye ? '#fff09a' : '#ff9628'); disc(g, e.x, e.y, fl ? 3 : 2, '#ffffff');
    disc(g, pts[0].x, pts[0].y, fl ? 6 : 5, '#ffd44a'); disc(g, pts[0].x, pts[0].y, 3, '#ffffff');
  }
  function drawStreams() {
    if (!['return', 'flood', 'pinch'].includes(Q.state)) return;
    if (Q.state !== 'pinch') effects.drawFlights(g, Q);
    const v = Q.vol; if (!v) return;
    const m = muzzleXY(), base = { x: PX(bull.u, bull.bz), y: YH(bull.bz, .13) }, hot = Q.state === 'pinch';
    for (const sh of v.shots) {
      const z = bull.bz + (ROOF.eyeZ - bull.bz) * sh.z, u = streamU(sh, sh.z, v), near = (1 - sh.z) * (1 - sh.z);
      const x = PX(u, z) + (m.x - base.x) * near, y = YH(z, .13 + (ROOF.eyeH - .13) * sh.z) + (m.y - base.y) * near, r = Math.max(.8, (hot ? 2.2 : 1.8) * sc(z));
      disc(g, x, y + .5, r + .5, '#ff9628'); disc(g, x, y, r, hot ? '#ffffff' : '#fff0aa');
    }
  }
  function draw() {
    drawLoom();
    if (Q.state === 'ending') ending.drawRoof(g, 'lit', PX(Q.eye.u, ROOF.eyeZ), YH(ROOF.eyeZ, ROOF.eyeH), LM);
    // Walk props are intentionally boxes and a tank, with no collision in the aisle.
    if (['elevator', 'walk'].includes(Q.state)) for (const [u, z, h] of [[-.74, .55, .12], [.74, .75, .1], [-.9, .95, .35]]) {
      const x = PX(u, z), y = YH(z, h); rect(g, x - 7, y, 14, FY(z) - y, '#3b3a48');
    }
    drawTiles(); drawGrid(); drawWarnings('lit');
    if (Q.walkCarp && !Q.walkCarp.dead) drawFly(Q.walkCarp);
    for (const f of R.flies) { if (f.heavy) drawHeavy(f); drawFly(f); }
    drawGrab('back'); drawBull(); drawGrab('front'); drawYank(); drawFx('lit');
  }
  // the replacement spools glow, so they read past the HUD that sits over the loom's top beam
  function drawSpoolGlow() {
    if (!(Q.respool > 0) || !['reset', 'quiet', 'return', 'flood'].includes(Q.state)) return;
    const left = ['return', 'flood'].includes(Q.state) ? Q.caught / Math.max(1, Q.capturedTotal) : 1;
    for (let i = 0; i < Q.broken; i++) {
      g.save(); g.globalAlpha = (.25 + .1 * Math.sin(R.t * 4 + i)) * Q.respool * left;
      disc(g, LM.spools[i], LM.top + 4.5, 8, '#cfe8ff'); g.globalAlpha *= 1.6; disc(g, LM.spools[i], LM.top + 4.5, 4, '#ffffff'); g.restore();
    }
  }
  function glows() {
    withLoom(() => { drawSpoolGlow(); drawWarp('souls'); drawEye(); });
    drawWarnings(); drawLasers(); drawWhip();
    for (const f of Q.fakes) drawFake(f);
    if (beamActive()) drawBeam();
    if (Q.state === 'ending') ending.drawRoof(g, 'glow', PX(Q.eye.u, ROOF.eyeZ), YH(ROOF.eyeZ, ROOF.eyeH), LM);
    drawStreams();
    for (const s of R.shots) drawShot(s);
    drawFx('glow'); drawRain();
  }
  const flashShape = A.canvas(W, H), flashInk = flashShape.getContext('2d');
  function drawFlashLoom() {
    // Reuse the stand-in geometry, then mask it to a silhouette after the scene flash.
    const previous = g; flashInk.clearRect(0, 0, W, H); g = flashInk;
    drawLoom(); effects.drawWarp(g, Q); g = previous;
    flashInk.globalCompositeOperation = 'source-in'; flashInk.fillStyle = '#6b6871'; flashInk.fillRect(0, 0, W, H);
    g.drawImage(flashShape, -.5, 0); g.drawImage(flashShape, .5, 0);
    flashInk.fillStyle = '#13111c'; flashInk.fillRect(0, 0, W, H); g.drawImage(flashShape, 0, 0);
    flashInk.globalCompositeOperation = 'source-over';
  }
  function overlay() {
    const flash = effects.flash(Q) + Q.light;
    if (flash > .01) { g.save(); g.globalAlpha = Math.min(1, flash) * .5; rect(g, 0, 0, W, H, '#ffffff'); g.restore(); }
    if (Q.state === 'flash' && effects.flash(Q) > .3) drawFlashLoom();   // the lightning catches it as a silhouette
    if (Q.state !== 'elevator') return;
    const opening = Q.fromRide ? 1 : clamp(Q.t / ROOF.time.elevator, 0, 1), half = W / 2 * (1 - opening);
    rect(g, 0, 0, half, H, '#24222f'); rect(g, W - half, 0, half, H, '#24222f');
    if (half > 10) txt(g, 'R', W / 2, 10, '#ffd44a', 2, 'center');
  }
  function drawCut(name) {
    if (!Q.cut && Q.state === 'ending' && ending.drawStill(g)) return;
    rect(g, 0, 0, W, H, '#000000'); txt(g, (name || Q.cut.name).toUpperCase(), W / 2, H / 2, '#ffffff', 2, 'center');
  }
  function displayedCount() { return effects.displayedCount(Q, R); }
  function hud() {
    drawSoulsCounter(displayedCount());
    if (Q.tips.length && (isRound() || Q.state === 'walk' || Q.state === 'reset')) {
      // a first-time prompt, under the HUD, clear of the roof and the eye
      const k = Q.tips[0], w = textWidth(k.text) + 10, y = 16;
      g.save(); g.globalAlpha = clamp(Math.min(k.t * 6, (F.tipT - k.t) * 4), 0, 1);
      rect(g, (W - w) / 2, y - 3, w, 11, '#0a0810'); rect(g, (W - w) / 2, y - 3, w, 1, '#ffd44a');
      txt(g, k.text, W / 2, y, Math.floor(k.t * 4) % 2 ? '#ffffff' : '#ffd44a', 1, 'center'); g.restore();
    }
    if (['elevator', 'walk', 'flash'].includes(Q.state)) return;
    otxt(g, 'P(LOOM)', 56, 5, '#ffd44a');
    rect(g, 86, 4, 90, 7, '#1a1824'); rect(g, 87, 5, 88, 5, '#2e2048');
    // the odds: the damage stays on the bar as a torn stretch, and the reset stitches over it rather than healing it
    const real = Math.min(Q.realOdds == null ? ROOF.odds : Q.realOdds, Q.odds), fill = 88 * real / 100;
    rect(g, 87, 5, fill, 5, Q.hot > 0 && Math.floor(R.t * 20) % 2 ? '#ffffff' : '#e44a34');
    if (real < ROOF.odds && !['snap', 'one', ...AFTER].includes(Q.state)) {
      const tw = 88 * (ROOF.odds - real) / 100;
      for (let x = 0; x < tw; x += 2) rect(g, 87 + fill + x, 5 + (x / 2 % 2 ? 3 : 1), 1, 1, '#5a2a3a');
      rect(g, 87 + fill, 3, 1, 9, '#ffffff');
      const stitched = 88 * (Q.odds - real) / 100;
      if (stitched > .5) {
        g.save(); g.globalAlpha = .85; rect(g, 87 + fill, 6, stitched, 3, '#9a2a2a'); g.restore();
        for (let x = 0; x < stitched; x += 2) rect(g, 87 + fill + x, x / 2 % 2 ? 9 : 5, 1, 1, '#ffb0a0');
      }
    }
    otxt(g, Math.ceil(Q.odds) + '%', 179, 5, '#fff6e0');
    for (let i = 0; i < 3; i++) {
      const broken = i < Q.broken, pale = broken && Q.respool > 0 && !beamActive() && !['pinch', 'fusion', 'snap', ...AFTER].includes(Q.state);
      rect(g, 91 + i * 9, 13, 6, 3, broken ? '#3b3a48' : '#ffd44a');
      if (pale) rect(g, 91 + i * 9, 13, Math.round(6 * Q.respool), 3, '#dfeeff');
    }
    if (R.talk && R.talk.readout) {
      const T = R.talk; let n = 0; while (n < T.text.length && T.times[n] <= T.t) n++;
      const w = textWidth(T.text) + 8;
      rect(g, (W - w) / 2, 23, w, 11, '#1a1418'); txt(g, T.text.slice(0, n), W / 2, 26, Q.round >= 2 && isRound() && Math.random() < .03 * Q.round ? '#c8b8ff' : '#ff9628', 1, 'center');
    }
  }
  // Beam drag (touch): the core hands over the finger's x in the game's picture, or null when it lifts.
  function steer(x) { if (Q) Q.drag = x === null ? null : (x - VX) / (112 * sc(bull.bz)); }   // where on the roof under the finger he walks to
  const noop = () => {};
  return {
    id: 'roof', tune: { scroll: 0, aisle: ROOF.aisle, bossHP: ROOF.spools, recharge: ROOF.recharge, move: 0 }, set: { openAir: true, parapet: ROOF.parapetH * core.world(0, 0, 1)[1], reflectZ: core.world(0, 1, 0)[2], rug: 0, rugEdge: 0 },
    lines: { low: false, odds: "LET'S DISCUSS THOSE ODDS." }, label: 'Unruggabull on the open roof of RugCo Tower in a storm, facing p(Loom) across a grid of roof tiles.',
    stageNo, stageNames, newRun, opening: noop, resume: noop, checkpoint: deathCheckpoint,
    update(dt) { if (!afterSpool(dt)) update(dt); }, hold, use: x => { g = x; }, view, lights, draw, glows, overlay, hud,
    aim, shotHits, shotFar: () => false, posOf: o => o, slash, depthMove, blasterOff: () => !!Q && deadBlaster(), dragSteer: () => !!Q && (freeMove() || beamActive()), steer,
    hurt: noop, blasterBack: noop, bonusBy: () => null,
    endPull: noop, cutRug: noop, draggedIn: noop, blowUp: noop, soulFreed, soulLanded,
    cutActive: () => !!Q.cut || Q.state === 'ending' && ending.still(), cutIn, drawCut,
    scene: () => !!Q && Q.state === 'ending',
    hudAlpha: () => Q && (Q.state === 'ending' || Q.state === 'clear') ? ending.hudAlpha() : 1,
    frameHeld: effects.frameHeld, shakeOffset: () => effects.offset(R), wispMotion: effects.wispMotion, riseMotion: effects.riseMotion, drawRise: effects.drawRise,
    pauseText: 'The loom waits.', continueText: () => 'Continue from ' + (isRound() ? 'phase ' + Q.round : 'the quiet') + ' with full hearts?',
    clearCard(extra, best, clock) { return { title: 'Roof clear', text: 'The Unrugged drift up into the dawn.',
      rows: [['Souls freed (including dawn)', String(displayedCount())], ['Time', clock(R.endT)], ['Continues', String(R.continues)], ['Best', best.souls + ' souls']], note: '' }; },
    // Test bridge / Part B seams. No shipped controls can call these.
    displayedCount, ROOF, STATES, enter, ending, eyeAt, beamActive, drawLoom, drawEye, drawSpool, drawWarp, soulSpot, effects,
    patternNormal, patternSet, tileU, tileZ, pathOf, lenOf, placeBull, oddsAt, beamAt
  };
};
