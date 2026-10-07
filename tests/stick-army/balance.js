// Stick Army balance adapter (SPEC-005). tools/balance/run.py evaluates this inside game.js's scope through a
// test-only bridge injected into the response; nothing here ships. It implements the hook contract:
// start, step, observe, act, status and drain on window.__balance.
(function () {
  var log = [];
  // One entry per event. Per-frame streams (lander wall damage, crew repairs) are coalesced per source and wave.
  function record(type, data) {
    var last = log[log.length - 1];
    if (last && last.ev === type && (type === 'wall_damage' || type === 'wall_repair') && last.source === data.source && last.wave === S.wave) {
      last.amount += data.amount; return;
    }
    var e = { ev: type, wave: S.wave, t: Math.round(S.t * 100) / 100 };
    for (var k in data) e[k] = data[k];
    log.push(e);
  }
  // The harness drives the game, so the page's own frame loop stops for good (run.py waits out the frame
  // already scheduled) and sound stays off.
  var NOOP = function () {};
  loop = NOOP;
  sound = { init: NOOP, play: NOOP, ambience: NOOP, muted: true };
  // Fast mode also skips cosmetic effects. Runs with effects on put the originals back; run.py --verify and
  // case-10-seeds.js check that effects and drawing never change outcomes.
  var EFFECTS = { addDecal: addDecal, puff: puff, burst: burst, killFx: killFx, addText: addText, flyTags: flyTags };
  function effects(on) {
    addDecal = on ? EFFECTS.addDecal : NOOP; puff = on ? EFFECTS.puff : NOOP; burst = on ? EFFECTS.burst : NOOP;
    killFx = on ? EFFECTS.killFx : NOOP; addText = on ? EFFECTS.addText : NOOP; flyTags = on ? EFFECTS.flyTags : NOOP;
  }
  function item(it) {
    var cost = costNow(it), bought = it.tier !== 'hire' && !!S.shop.bought[it.id]; // hiring repeats
    return { id: it.id, name: it.name, tier: it.tier, cost: cost, gift: onHouse(it), bought: bought, can: !bought && eligible(it) && S.coins >= cost };
  }
  window.__balance = {
    game: 'stick-army',
    start: function (seed, options) {
      options = options || {};
      effects(options.fast === false);
      log = []; emitHook = record;
      RUN.force = seed; newGame(); RUN.force = null;
    },
    // Game logic only, mirroring what the frame loop would run in each mode. Never draws.
    step: function (dt) {
      if (S.mode === 'play' || S.mode === 'dying') update(dt);
    },
    observe: function () {
      var o = {
        mode: S.mode, t: S.t, wave: S.wave, score: S.score, coins: S.coins, wall: S.wallHP, maxWall: S.mods.maxHP,
        heat: S.heat, overheat: S.overheat, aim: S.aim, turret: { x: TUR.x, y: TUR.y }, bulletSpeed: 700,
        aimMin: AIM_MIN, aimMax: AIM_MAX, ground: GROUND, bunker: { x1: BK.x1, x2: BK.x2, top: BK.top },
        captureSpeed: CAPTURE_SPEED, slotsFree: freeSlot(0) >= 0, slots: S.mods.slots,
        mats: activeTramps().map(function (m) { return { x1: m.x1, x2: m.x2, y: m.y }; }),
        troopers: [], planes: [], bombs: [], recruits: [], shop: null,
        tanks: S.tanks.map(function (tk) { return { id: tk.id, x: tk.x, y: tk.y, state: tk.state, dir: tk.dir, hp: tk.hp }; }),
        calls: { bomber: S.calls.bomber, fighter: S.calls.fighter }, strikeActive: !!S.strike, fighterActive: !!S.fighter
      };
      S.troopers.forEach(function (t) {
        if (!t.dead) o.troopers.push({ id: t.id, x: t.x, y: t.y, state: t.state, type: t.type, open: t.open, fall: t.fall, vy: t.vy });
      });
      S.planes.forEach(function (p) {
        o.planes.push({ id: p.id, kind: p.kind, x: p.x, y: p.y, vx: p.state === 'fly' ? (p.face || p.dir) * p.speed : 0, state: p.state, hw: p.hw, hh: p.hh, hp: p.hp });
      });
      S.bombs.forEach(function (m) { if (!m.dead) o.bombs.push({ id: m.id, x: m.x, y: m.y, vx: m.vx, vy: m.vy }); });
      S.recruits.forEach(function (r) { if (!r.dead) o.recruits.push({ id: r.id, type: r.type, x: r.x, hp: r.hp, max: crewMax(r) }); });
      if (S.mode === 'shop' && S.shop) {
        o.shop = { items: S.shop.items.map(item), hire: S.shop.hire.map(item), gift: S.shop.gift };
        o.mods = JSON.parse(JSON.stringify(S.mods));
      }
      return o;
    },
    // Player input paths only: aimAt is the pointer's aim, keys.fire the fire key, takeItem the shop buttons
    // (pizza included) and continueWave the continue button.
    act: function (a) {
      if (!a) return;
      if (S.mode === 'play') {
        if (a.aimAt) aimAt(a.aimAt);
        if ('fire' in a) keys.fire = !!a.fire;
        if (a.strike) callStrike(); // the bomber button and B key call this
        if (a.fighter) callFighter(); // the fighter button and C key call this
      } else if (S.mode === 'shop') {
        (a.take || []).forEach(function (id) { if (S.mode === 'shop') takeItem(id); });
        if (a.continue && S.mode === 'shop') continueWave();
      }
    },
    status: function () { return { over: S.mode === 'dying' || S.mode === 'over', wave: S.wave, score: S.score, t: S.t, mode: S.mode }; },
    drain: function () { var out = log; log = []; return out; }
  };
})();
