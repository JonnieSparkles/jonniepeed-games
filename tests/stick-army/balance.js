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
  var EFFECTS = { addDecal: addDecal, puff: puff, burst: burst, pow: pow, killFx: killFx, addText: addText, flyTags: flyTags };
  function effects(on) {
    addDecal = on ? EFFECTS.addDecal : NOOP; puff = on ? EFFECTS.puff : NOOP; burst = on ? EFFECTS.burst : NOOP; pow = on ? EFFECTS.pow : NOOP;
    killFx = on ? EFFECTS.killFx : NOOP; addText = on ? EFFECTS.addText : NOOP; flyTags = on ? EFFECTS.flyTags : NOOP;
  }
  // g: whose shop it is in co-op (a turret upgrade is each barrel's own).
  function item(it, g) {
    var cost = costNow(it), bought = it.tier !== 'hire' && SHOP.bought(it, g); // hiring repeats
    return { id: it.id, name: it.name, tier: it.tier, cost: cost, gift: onHouse(it), bought: bought, can: !bought && eligible(it, g) && S.coins >= cost };
  }
  // Co-op (options.coop, run.py --option coop=1): a second bot plays the guest's barrel (the second), with the same
  // profile, its own seed and the same reaction delay; it buys only its own barrel's upgrades, the first bot the rest.
  var bot2 = null, buf2 = [], steps2 = 0, lag2 = 0, shopped2 = -1;
  function act2(a) {
    var t = S.turrets[1];
    if (!a || !t) return;
    if (a.aimAt) { var ang = Math.atan2(a.aimAt.y - TUR.y, a.aimAt.x - t.x); if (ang > Math.PI / 2) ang -= Math.PI * 2; t.aim = clamp(ang, AIM_MIN, AIM_MAX); }
    if ('fire' in a) t.firing = !!a.fire;
    if (a.strike) callStrike();
    if (a.fighter) callFighter();
  }
  window.__balance = {
    game: 'stick-army',
    start: function (seed, options, profile) {
      options = options || {};
      effects(options.fast === false);
      log = []; emitHook = record;
      // options.level: 'soldier' (the default) or 'veteran' (run.py --option level=veteran).
      level = LEVELS[options.level] ? options.level : 'soldier';
      var coop = !!options.coop && options.coop !== '0';
      RUN.players = coop ? 2 : 1; me = 0;
      RUN.force = seed; newGame(); RUN.force = null; RUN.players = 1;
      bot2 = coop && profile && window.__balanceBot ? window.__balanceBot(profile, (seed ^ 0x2b7e1516) >>> 0) : null;
      buf2 = []; steps2 = 0; shopped2 = -1; lag2 = profile ? Math.round(profile.reaction_ms / 1000 * 60 / 2) : 0;
    },
    // Game logic only, mirroring what the frame loop would run in each mode. Never draws.
    step: function (dt) {
      if (bot2 && S.mode === 'play' && steps2++ % 2 === 0) {
        buf2.push(this.observe(1));
        if (buf2.length > lag2 + 1) buf2.shift();
        act2(bot2.decide(buf2[0]));
      }
      if (S.mode === 'play' || S.mode === 'dying') update(dt);
    },
    // g: which barrel's view (co-op's second bot sees its own barrel).
    observe: function (g) {
      var gt = S.turrets[g || 0] || S.turrets[0], gmods = gt.mods || S.mods;
      var o = {
        mode: S.mode, t: S.t, wave: S.wave, score: S.score, coins: S.coins, wall: S.wallHP, maxWall: S.mods.maxHP,
        heat: gt.heat, overheat: gt.overheat, aim: gt.aim, turret: { x: gt.x, y: TUR.y }, bulletSpeed: 700,
        aimMin: AIM_MIN, aimMax: AIM_MAX, ground: GROUND, bunker: { x1: BK.x1, x2: BK.x2, top: BK.top },
        captureSpeed: CAPTURE_SPEED, slotsFree: freeSlot(0) >= 0, slots: S.mods.slots,
        mats: activeTramps().map(function (m) { return { x1: m.x1, x2: m.x2, y: m.y }; }),
        troopers: [], planes: [], bombs: [], recruits: [], shop: null,
        tanks: S.tanks.map(function (tk) { return { id: tk.id, x: tk.x, y: tk.y, state: tk.state, dir: tk.dir, hp: tk.hp }; }),
        calls: { bomber: S.calls.bomber, fighter: S.calls.fighter }, strikeActive: !!S.strike, fighterActive: !!S.fighter, spread: !!gmods.spread,
        // The Red Cross plane (sky.js), not to be hit.
        medevac: S.medevac.filter(function (m) { return !m.hit; }).map(function (m) { return { x: m.x, y: m.y, vx: m.dir * m.speed, hw: SKY.MEDEVAC.HW, hh: SKY.MEDEVAC.HH }; })
      };
      S.troopers.forEach(function (t) {
        if (!t.dead) o.troopers.push({ id: t.id, x: t.x, y: t.y, state: t.state, type: t.type, open: t.open, fall: t.fall, vy: t.vy });
      });
      S.planes.forEach(function (p) {
        if (p.kind === 'dread') return; // seen through its parts below
        var fly = p.state === 'fly';
        o.planes.push({ id: p.id, kind: p.kind, x: p.x, y: p.y, vx: fly ? (p.vx != null ? p.vx : (p.face || p.dir) * p.speed) : 0, vy: fly && p.vy ? p.vy : 0,
          state: p.state, phase: p.phase || null, armed: !!p.armed, hw: p.hw, hh: p.hh, hp: p.hp });
      });
      // The Dreadnought: its guns over the page (the one aiming first) and, once exposed, its bridge.
      // marking: false, or a tag for this aim (when it started), so each new aim is a new thing to notice.
      o.dread = dreadTargets().map(function (q) { return { id: q.id, part: q.part, x: q.x, y: q.y, vx: q.vx, marking: q.marking ? 'm' + Math.round((S.t - q.markT) * 10) : false }; });
      S.bombs.forEach(function (m) { if (!m.dead && !m.armored) o.bombs.push({ id: m.id, x: m.x, y: m.y, vx: m.vx, vy: m.vy }); });
      S.recruits.forEach(function (r) { if (!r.dead) o.recruits.push({ id: r.id, type: r.type, x: r.x, hp: r.hp, max: crewMax(r) }); });
      if (S.mode === 'shop' && S.shop) {
        var mine = function (it) { return item(it, g); };
        o.shop = { items: S.shop.items.map(mine), hire: S.shop.hire.map(mine), gift: S.shop.gift, hireStep: Math.round(15 * SHOP.war(SHOP.WAR.HIRE)) };
        // The second bot shops for its own barrel only.
        if (g) { o.shop.items = o.shop.items.filter(function (it) { return SHOP.own(it); }); o.shop.hire = []; o.shop.gift = null; }
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
        if (bot2 && shopped2 !== S.wave && S.mode === 'shop') {
          shopped2 = S.wave;
          (bot2.shop(this.observe(1)).take || []).forEach(function (id) { if (S.mode === 'shop') takeItem(id, 1); });
        }
        if (a.continue && S.mode === 'shop') continueWave();
      }
    },
    // A win ends the run too (the victory card); the bot doesn't play on into endless.
    status: function () { return { over: S.mode === 'dying' || S.mode === 'over' || S.mode === 'won', wave: S.wave, score: S.score, t: S.t, mode: S.mode }; },
    drain: function () { var out = log; log = []; return out; }
  };
})();
