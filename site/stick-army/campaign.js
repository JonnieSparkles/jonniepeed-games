// Stick Army: Campaign, the second way to play (docs/games/stick-army/campaign.md). A tour of operations with one
// squad you keep and can lose; each operation is a few short missions, each with its own goal. Released so far: Boot
// Camp (round 1, with the frame), Recruitment Drive (round 2: deploy, weather, intel, straw dummies and the radio
// operator), Balloon Season (round 3: barrage balloons and the machine gunner) and First Zeppelin (round 4: boss
// missions, the armory and the heavy gun). This file is the mode: the operations and missions, the goals, the tour and its
// code, saving (the tour save, the wave save and the save link) and play stats. Its screens are campaign-screens.js.
// Classic script; load before game.js, which calls StickArmyCampaign(world, game) once, after the flow, and gets
// nothing back but the entry this adds to MODES. Arcade never reaches anything here.
var StickArmyCampaign = function (world, game) {
  'use strict';
  var RUN = world.RUN, SQUAD = world.SQUAD, load = world.load, save = world.save;
  var BLUE = world.BLUE;

  // ---------- operations ----------
  // The ten operations with their forks (campaign.md), in map order. Only released ones can be played; the rest are
  // pencilled on the map. An operation's index is its place in this list, which saves and links use: append only.
  // Each has its deploy slots, its gold star (`star`, and what earns it: `starKind`, lose no one, catch no dummies, or
  // pop STAR_BALLOONS bomb balloons away from the bunker, or catch a downed boss zeppelin's whole crew),
  // its share of straw dummies among the troopers (`dummies`), and its missions: `fixed`, in order, then `last` (a
  // boss mission).
  var OPS = [
    { id: 'boot-camp', name: 'Boot Camp', slots: 3, star: 'Lose no one.', starKind: 'losses', released: true, fixed: ['first-contact', 'downed-pilot', 'hold-the-radio'] },
    { id: 'recruitment-drive', name: 'Recruitment Drive', slots: 3, star: 'Catch no dummies.', starKind: 'dummies', dummies: 0.25, released: true,
      fixed: ['dummy-drop', 'supply-drop', 'the-officer'] },
    { id: 'balloon-season', name: 'Balloon Season', slots: 4, star: 'Pop 10 bomb balloons away from the bunker.', starKind: 'balloons', released: true,
      fixed: ['cable-cutters', 'spotter-balloon', 'the-big-one'] },
    { id: 'first-zeppelin', name: 'First Zeppelin', slots: 5, star: 'Catch all 3 of the big zeppelin\'s crew.', starKind: 'crew', released: true, gun: 'heavy',
      fixed: ['bay-doors', 'recon-run', 'last-stand'], last: ['the-zeppelin'] },
    { id: 'mercy-flight', name: 'Mercy Flight', fork: 1 },
    { id: 'chopper-country', name: 'Chopper Country', fork: 1 },
    { id: 'supply-line', name: 'Supply Line' },
    { id: 'the-long-hold', name: 'The Long Hold' },
    { id: 'tank-road', name: 'Tank Road', fork: 2 },
    { id: 'dive-bombers', name: 'Dive Bombers', fork: 2 },
    { id: 'night-raid', name: 'Night Raid' },
    { id: 'the-landship', name: 'The Landship', fork: 3 },
    { id: 'the-air-armada', name: 'The Air Armada', fork: 3 }
  ];
  var RELEASE = 4;   // the release this is: a newer one puts the "new" tag back on the title's Campaign button

  // ---------- missions ----------
  // A mission plays as Arcade waves (`as`: one entry a wave, which sets the wave's recipe, prices and rewards), with
  // its recipe edited from Arcade's (waveCfg), and a goal. Goals are data, one of:
  //   survive        hold out to the end of the last wave
  //   catch n        catch n soldiers (a goal met ends the mission: the enemy surrenders)
  //   pop n          pop n barrage balloons
  //   boss n         down n zeppelins (a boss mission); it ends once their bailed crews are down or caught
  // or a set piece's own (`piece`, PIECES): pilots, radio, crates, officers, spotter, big, bay, recon, stand.
  // A goal with a count that isn't met by the end of the last wave loses the mission. Saves name missions by id.
  // `shop: false`: no shop between the mission's waves (the first mission has none: there's nothing to buy with yet).
  // `dummies`: the mission's share of straw dummies, if not its operation's. `threats`: what the mission shows the
  // squad, which later operations' intel can bring back (INTEL). `hint`: the hint card on its first attempt.
  function zep(c) { c.boss = 1; c.bossKind = 'zeppelin'; }
  var MISSIONS = {
    // Boot Camp: Arcade waves 1 to 3. No trampoline in the first (`noMats`): just you and the gun.
    'first-contact': { name: 'First contact', goal: { kind: 'survive' }, as: [1, 2], text: 'No trampoline yet: just you and the gun. Survive two waves.', shop: false, noMats: true, threats: ['low'],
      recipe: function (c, n) { c.bombers = 0; c.planes = n === 1 ? 10 : 13; } },
    'downed-pilot': { name: 'Downed pilot', goal: { kind: 'pilots', n: 3 }, as: [2], piece: 'pilot', hint: true, threats: ['bombers'],
      text: 'Enemy fighters are shooting down our planes. Shoot each fighter before it gets the pilot, then catch him on the mat: he\'ll join your squad. Save 3.',
      recipe: function (c) { c.noDrops = true; c.planes = 0; c.bombers = 3; c.rushes = 0; } },
    'hold-the-radio': { name: 'Hold the radio', goal: { kind: 'radio' }, as: [3], piece: 'radio', threats: ['snipers'],
      text: 'Keep the radio mast standing until the call to HQ goes through.',
      recipe: function (c) { c.planes = 30; c.bombers = 1; } },
    // Recruitment Drive: Arcade waves 3 and 4, with straw dummies.
    'dummy-drop': { name: 'Dummy drop', goal: { kind: 'catch', n: 5 }, as: [3, 4], text: 'Catch 5 real soldiers. Straw dummies are mixed in.', dummies: 0.35, threats: ['dummies'],
      recipe: function (c, n) { c.planes = n === 3 ? 24 : 26; c.bombers = 0; c.maxDrops = 3; c.fall *= 0.75; } },
    'supply-drop': { name: 'Supply drop', goal: { kind: 'crates', n: 3 }, as: [3, 4], piece: 'supply', threats: ['bombers'],
      text: 'HQ\'s planes are bringing supplies. Get 3 crates in, and don\'t shoot the blue-ringed planes.',
      recipe: function (c) { c.crates = 2; c.planes = 14; c.bombers = 1; } },
    'the-officer': { name: 'The officer', goal: { kind: 'officers', n: 3 }, as: [4], piece: 'officer', threats: ['rushes'],
      text: 'Three officers are jumping in. Catch them for intel, or shoot them, but don\'t let one land.',
      recipe: function (c) { noBoss(c, 4); c.planes = 18; c.bombers = 1; } },
    // Balloon Season: Arcade waves 5 to 7, without wave 5's zeppelin or wave 7's helicopters (Chopper Country's), and
    // barrage balloons (`c.barrage` a wave, BARRAGE).
    'cable-cutters': { name: 'Cable cutters', goal: { kind: 'pop', n: 4 }, as: [5, 6], text: 'Pop 4 barrage balloons. Their cables stop your bullets.', threats: ['barrage'],
      recipe: function (c, n) { noBoss(c, n); c.planes = n === 5 ? 12 : 14; c.bombers = 2; c.barrage = 3; } },
    'spotter-balloon': { name: 'Spotter balloon', goal: { kind: 'spotter' }, as: [6], piece: 'spotter', threats: ['barrage'],
      text: 'An enemy spotter is marking targets for their guns. Pop his balloon before the shells find your squad.',
      recipe: function (c, n) { noBoss(c, n); c.helis = 0; c.planes = 12; c.bombers = 1; c.barrage = 2; } },
    'the-big-one': { name: 'The big one', goal: { kind: 'big' }, as: [7], piece: 'bigone', threats: ['balloons'],
      text: 'A giant bomb balloon is drifting in. Pop it before it reaches the bunker.',
      recipe: function (c, n) { noBoss(c, n); c.helis = 0; c.planes = 12; c.bombers = 1; c.balloons = 4; } },
    // First Zeppelin: Arcade waves 7 to 10 without helicopters, a zeppelin brought into chosen waves (`zep`), and the
    // armored one of wave 10 as the boss mission, always last.
    'bay-doors': { name: 'Bomb bay', goal: { kind: 'bay', n: 5 }, as: [7], piece: 'bay', threats: ['bombers'],
      text: 'The zeppelin opens its bomb bay before each run. Hit it in the open bay 5 times.',
      recipe: function (c) { zep(c); c.helis = 0; c.planes = 5; c.bombers = 0; c.rushes = 0; } },
    'recon-run': { name: 'Recon run', goal: { kind: 'recon', n: 3 }, as: [8], piece: 'recon', threats: ['low'],
      text: 'Our recon plane is photographing the zeppelin. Get it across 3 times, and don\'t hit it.',
      recipe: function (c) { zep(c); c.helis = 0; c.planes = 8; c.bombers = 0; c.rushes = 0; } },
    'last-stand': { name: 'Last stand', goal: { kind: 'stand' }, as: [9], piece: 'stand', threats: ['rushes'],
      text: 'The wall is at 40% and the engineers are pinned down. Hold for 45 seconds.',
      recipe: function (c) { c.helis = 0; c.planes = 14; c.bombers = 0; c.balloons = 1; } },
    'the-zeppelin': { name: 'The Zeppelin', goal: { kind: 'boss', n: 1 }, as: [10], text: 'Down the armored zeppelin. Strip its plates, then hit the gondola.', threats: [],
      recipe: function (c) { c.helis = 0; c.planes = 6; c.rushes = 0; c.balloons = 0; c.cargo = 0; } }
  };
  // A wave Arcade gives a zeppelin (5), played outside a zeppelin mission, is an ordinary one, with Arcade's plane count.
  function noBoss(c, n) {
    if (!c.boss) return;
    c.boss = 0; c.bossKind = null; c.twin = false;
    c.planes = Math.round(5 + world.BALANCE.PLANES_PER_WAVE * n); c.bombers = Math.min(5, n - 1);
  }
  // Intel (from the second operation): one surprise per operation, named on the briefing, from the threats the tour
  // has already met (the missions it played in earlier operations), added to one of the operation's missions. Both
  // come from the tour code, so a save or a link needs nothing more.
  var INTEL = {
    bombers: { text: 'extra bombers', apply: function (c) { c.bombers += 3; } },
    snipers: { text: 'snipers', apply: function (c) { c.sniperChance = Math.max(c.sniperChance, 0.3); } },
    low: { text: 'planes flying low', apply: function (c) { c.low = Math.max(c.low, 0.6); } },
    dummies: { text: 'more dummies', apply: function (c) { c.dummiesMore = 0.15; } },
    rushes: { text: 'rushers on foot', apply: function (c) { c.rushes += 2; c.rushSize = Math.max(c.rushSize, 3); } },
    balloons: { text: 'bomb balloons', apply: function (c) { c.balloons = (c.balloons || 0) + 2; } },
    barrage: { text: 'barrage balloons', apply: function (c) { c.barrage = (c.barrage || 0) + 2; } }
  };
  function metThreats(t, uptoOp) {
    var met = [];
    for (var o = 0; o < uptoOp; o++) missionsFor(t, o).forEach(function (id) { (MISSIONS[id].threats || []).forEach(function (x) { if (met.indexOf(x) < 0 && INTEL[x]) met.push(x); }); });
    return met;
  }
  function intelFor(t, op) {
    if (op < 1) return null;
    var met = metThreats(t, op);
    if (!met.length) return null;
    var h = game.mix(tourSeed(t), 0x1e7e1 + op), n = missionsFor(t, op).length;
    return { threat: met[h % met.length], m: (h >>> 8) % n };
  }
  // Weather (campaign.md): rolled for each operation from the tour code and shown on its briefing. Boot Camp is always
  // Clear; Night Raid never rolls Dusk.
  var WEATHER = {
    clear: { name: 'Clear', text: 'Clear skies.' },
    wind: { name: 'Wind', text: 'Wind: chutes drift with it.' },
    rain: { name: 'Rain', text: 'Rain: the gun cools faster, chutes fall faster.' },
    fog: { name: 'Fog', text: 'Fog: the high sky is hidden.' },
    dusk: { name: 'Dusk', text: 'Dusk: half dark.' }
  };
  function weatherFor(t, op) {
    if (op < 1) return 'clear';
    var list = ['clear', 'wind', 'rain', 'fog', 'dusk'].filter(function (w) { return !(w === 'dusk' && OPS[op].id === 'night-raid'); });
    return list[game.mix(tourSeed(t), 0x3ea7 + op) % list.length];
  }
  function windDir(t, op) { return game.mix(tourSeed(t), 0x31d + op) & 1 ? 1 : -1; }
  // What the HUD shows under the wave, and the short goal for cards.
  // Enemy planes and bombers still to come in the mission: this wave's yet to fly, those in the air, and the later
  // waves' (S.cm.planesBy, from their recipes at the start). A zeppelin's escort comes on top while it's up.
  function planesLeft(S) {
    var c = S.cm, sp = S.spawn, n = 0, i;
    if (!c || !c.planesBy) return null;
    if (sp && S.waveState === 'active') n += sp.planes + sp.bombers;
    n += S.planes.filter(function (p) { return p.state === 'fly' && (p.kind === 'plane' || p.kind === 'bomber'); }).length;
    for (i = Math.max(0, c.wi + (S.waveState === 'active' ? 1 : c.wi < 0 ? 0 : 1)); i < c.planesBy.length; i++) n += c.planesBy[i];
    return n;
  }
  function progress(M, k) {
    var g = M.goal;
    if (g.kind === 'catch') return { sub: 'caught ' + Math.min(k.caught, g.n) + '/' + g.n, done: k.caught >= g.n };
    if (g.kind === 'boss') return { sub: k.zeps >= g.n ? 'zeppelin down!' : 'down the zeppelin', done: k.zeps >= g.n };
    if (g.kind === 'pop') return { sub: 'popped ' + Math.min(k.barrage, g.n) + '/' + g.n, done: k.barrage >= g.n };
    if (g.kind === 'spotter') return { sub: k.spotter ? 'spotter down!' : 'pop the spotter · ' + (k.shellHits || 0) + '/' + SPOT.LOSE + ' hit', done: !!k.spotter };
    if (g.kind === 'big') return { sub: k.big ? 'popped!' : 'pop the big one', done: !!k.big };
    if (g.kind === 'bay') return { sub: 'bay hits ' + Math.min(k.bay, g.n) + '/' + g.n, done: k.bay >= g.n || k.zeps > 0 };
    if (g.kind === 'recon') return { sub: 'photos ' + Math.min(k.recon, g.n) + '/' + g.n, done: k.recon >= g.n };
    if (g.kind === 'stand') return { sub: 'hold ' + Math.max(0, Math.ceil(STAND.TIME - (k.stand || 0))) + 's', done: (k.stand || 0) >= STAND.TIME };
    if (g.kind === 'pilots') return { sub: 'pilots safe ' + Math.min(k.pilots, g.n) + '/' + g.n, done: k.pilots >= g.n };
    if (g.kind === 'radio') return { sub: 'call to HQ ' + Math.min(100, Math.round(100 * (k.radio || 0) / RADIO_CALL.NEED)) + '%', done: (k.radio || 0) >= RADIO_CALL.NEED };
    if (g.kind === 'crates') return { sub: 'crates in ' + Math.min(k.crates, g.n) + '/' + g.n, done: k.crates >= g.n };
    if (g.kind === 'officers') return { sub: 'officers ' + Math.min(k.officers, g.n) + '/' + g.n + (k.intel ? ' · intel ' + k.intel : ''), done: k.officers >= g.n };
    if (g.kind === 'survive') return { sub: 'survive ' + (M.as.length > 1 ? 'all ' + M.as.length + ' waves' : 'the wave') };
    return { sub: '' };
  }
  // The pause card's line: the mission, its goal and how it's going, and the weather.
  // only: just how it's going (the results card's line).
  function pauseLine(S, only) {
    var M = MISSIONS[S.cm.mission], g = M.goal, k = S.cm.count, how;
    if (g.kind === 'catch') how = 'Caught ' + Math.min(k.caught, g.n) + ' of ' + g.n + (k.dummies ? ', ' + k.dummies + (k.dummies === 1 ? ' dummy' : ' dummies') : '') + '.';
    else if (g.kind === 'spotter') how = k.spotter ? 'The spotter is down.' : 'The spotter is up; ' + (k.shellHits || 0) + ' of ' + SPOT.LOSE + ' shells have hit the squad.';
    else if (g.kind === 'big') how = k.big ? 'It\'s popped.' : 'It\'s still coming.';
    else if (g.kind === 'bay') how = Math.min(k.bay, g.n) + ' of ' + g.n + ' hits in the bay.';
    else if (g.kind === 'recon') how = Math.min(k.recon, g.n) + ' of ' + g.n + ' passes made.';
    else if (g.kind === 'stand') how = Math.max(0, Math.ceil(STAND.TIME - (k.stand || 0))) + ' seconds to hold.';
    else if (g.kind === 'pilots') how = Math.min(k.pilots, g.n) + ' of ' + g.n + ' pilots safe' + (k.pilotsLost ? ', one lost: lose another and the mission fails.' : '.');
    else if (g.kind === 'radio') how = 'The call is ' + Math.min(100, Math.round(100 * (k.radio || 0) / RADIO_CALL.NEED)) + '% through. The mast is ' + Math.max(0, Math.round(S.cm.mast ? S.cm.mast.hp : 0)) + '% standing.';
    else if (g.kind === 'crates') how = Math.min(k.crates, g.n) + ' of ' + g.n + ' crates in; ' + k.hqHit + ' of 2 supply planes hit.';
    else if (g.kind === 'officers') how = Math.min(k.officers, g.n) + ' of ' + g.n + ' officers dealt with, ' + k.intel + ' caught for intel.';
    else if (g.kind === 'boss') how = k.zeps >= g.n ? 'The zeppelin is down. Catch its crew!' : 'The zeppelin is still up.';
    else if (g.kind === 'pop') how = 'Popped ' + Math.min(k.barrage, g.n) + ' of ' + g.n + '.';
    else how = 'Wave ' + (S.cm.wi + 1) + ' of ' + S.cm.waves.length + '.';
    if (only) return how;
    var w = S.cm.weather && S.cm.weather !== 'clear' ? ' ' + WEATHER[S.cm.weather].name + '.' : '', left = planesLeft(S);
    if (counted(g) && g.kind !== 'boss' && !M.piece && left != null && !met(S)) how += ' ' + left + (left === 1 ? ' plane' : ' planes') + ' still to come.';
    return M.name + ': ' + goalLine(M) + '. ' + how + w;
  }

  // ---------- the tour's numbers ----------
  // A tour code is 30 bits shown as six Crockford base-32 characters, "K7Q-MR2": no I, L, O or U, and typing is
  // forgiving (O reads as 0, I and L as 1, any case, dashes and spaces ignored).
  var B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function b32Val(ch) {
    ch = ch.toUpperCase();
    if (ch === 'O') ch = '0'; else if (ch === 'I' || ch === 'L') ch = '1';
    return B32.indexOf(ch);
  }
  function cleanCode(s) { return String(s || '').replace(/[\s-]/g, ''); }
  function codeText(v) { var s = ''; for (var i = 5; i >= 0; i--) s += B32[(v >>> (i * 5)) & 31]; return s; }
  function codeValue(s) {
    s = cleanCode(s);
    if (s.length !== 6) return -1;
    var v = 0;
    for (var i = 0; i < 6; i++) { var d = b32Val(s[i]); if (d < 0) return -1; v = v * 32 + d; }
    return v;
  }
  function showCode(code) { return code.slice(0, 3) + '-' + code.slice(3); }
  function newCodeValue() { return Math.floor(Math.random() * 1073741824); }
  function tourSeed(t) { return game.mix(codeValue(t.code), 0x70); }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // The missions a tour plays in an operation: its fixed ones, then its last (a boss mission).
  function missionsFor(t, op) { var o = OPS[op]; return (o.fixed || []).concat(o.last || []); }
  // A mission's run seed: the same every attempt, so Retry plays the same waves.
  function missionSeed(t) { return game.mix(tourSeed(t), hashStr(OPS[t.op].id + '/' + t.missions[t.m])); }

  // ---------- the armory ----------
  // Guns by index (links): append only. The standard gun is always there; an operation with `gun` hands that one over
  // on its briefing, and it stays for the tour, so the armory is what the operations reached have handed over. The
  // pick (`tour.gun`) is made on the deploy screen before each mission.
  var GUNS = ['standard', 'heavy'];
  var GUN_TEXT = { standard: { name: 'Standard', text: 'quick, cool' }, heavy: { name: 'Heavy', text: 'one-hit planes, hot' } };
  function armory(t) {
    var out = ['standard'];
    for (var i = 0; i <= t.op && OPS[i]; i++) if (OPS[i].gun && out.indexOf(OPS[i].gun) < 0) out.push(OPS[i].gun);
    return out;
  }
  function gunFor(t) { return armory(t).indexOf(t.gun) >= 0 ? t.gun : 'standard'; }
  // Whether the deploy screen comes before a mission: more soldiers than slots, or more than one gun.
  function needsDeploy(t) { return t.squad.length > OPS[t.op].slots || armory(t).length > 1; }

  // ---------- soldiers ----------
  // Roles by index (saves and links): the five Arcade has, then Campaign's own (append only).
  var ROLES = ['rifle', 'engineer', 'bazooka', 'sniper', 'medic', 'radio', 'mg'];
  var ROLE_NAME = { rifle: 'rifleman', engineer: 'engineer', bazooka: 'bazooka', sniper: 'sniper', medic: 'medic', radio: 'radio operator', mg: 'machine gunner' };
  var TRAITS = ['lucky', 'quick', 'steady', 'tough', 'brave'];
  var TRAIT_TEXT = { lucky: 'Lucky: shrugs off one hit a mission.', quick: 'Quick: a faster trigger.', steady: 'Steady: tighter aim.',
    tough: 'Tough: +1 health.', brave: 'Brave: stays up the first time he would fall.' };
  var BARRACKS = 12, MAX_STRIPES = SQUAD.RANKS.length - 1;
  // Names and traits come with the first stripe, from the tour code and the soldier's id, never from a game stream.
  // Everyone ever named on the tour (the squad, the fallen, those sent home) takes a name in id order, skipping names
  // already taken, so the same soldiers always get the same names, from a save or a link.
  function nameAll(t) {
    var seed = tourSeed(t), used = {}, names = SQUAD.NAMES;
    t.squad.concat(t.fallen, t.gone).filter(function (s) { return s.stripes > 0; }).sort(function (a, b) { return a.id - b.id; }).forEach(function (s) {
      var h = (Math.imul(seed ^ 0x4e414d45, 31) + Math.imul(s.id, 2654435761)) >>> 0;
      s.name = null;
      for (var k = 0; k < names.length && !s.name; k++) if (!used[names[(h + k) % names.length]]) s.name = names[(h + k) % names.length];
      if (!s.name) s.name = names[h % names.length] + ' ' + (s.id % 90 + 10);
      used[s.name] = true;
      s.trait = TRAITS[game.mix(seed, s.id) % TRAITS.length];
    });
    t.squad.concat(t.fallen, t.gone).forEach(function (s) { if (!(s.stripes > 0)) { s.name = null; s.trait = null; } });
  }
  function rankName(s) { return s.stripes > 0 ? SQUAD.RANKS[Math.min(s.stripes, MAX_STRIPES)].short + ' ' + s.name : 'a rookie'; }
  // Who goes out: the most stripes, then the most kills, then who's been here longest.
  function deployOrder(list) { return list.slice().sort(function (a, b) { return b.stripes - a.stripes || b.kills - a.kills || a.id - b.id; }); }

  // ---------- the shelf and the requisition tree ----------
  // The shop builds up over a tour. Each operation puts a few basics on the shelf (SHELF, by operation reached) and
  // the hires it brings (HIRES_AT); the rest come from the requisition tree (TREE): three rows of four, one pick after
  // each operation (and a bonus pick for a gold star), each step on the row after the last. What's unlocked is on the
  // shelf for the rest of the tour, still bought with tags each visit.
  var SHELF = [['repair', 'mat', 'aim', 'cool', 'pizza'], ['tramp', 'strike', 'fighter'], ['flag'], ['pierce']];
  var HIRES_AT = { rifle: 0, engineer: 0, medic: 1, sniper: 1, radio: 1, bazooka: 2, mg: 2 };
  var TREE = [
    { id: 'gun', name: 'Gun', steps: ['double', 'spread', 'flak', 'rockets'] },
    { id: 'defenses', name: 'Defenses', steps: ['sandbags', 'wire', 'mines', 'auto'] },
    { id: 'squad', name: 'Squad', steps: ['helmet', 'trench', 'hospital', 'catcher'] }
  ];
  var TREE_IDS = TREE.reduce(function (a, r) { return a.concat(r.steps); }, []);
  function onShelf(t, it) {
    if (!t) return true;
    if (it.tier === 'hire') return HIRES_AT[it.role] == null || HIRES_AT[it.role] <= t.op;
    for (var i = 0; i <= t.op && i < SHELF.length; i++) if (SHELF[i].indexOf(it.id) >= 0) return true;
    return t.tree.indexOf(it.id) >= 0;
  }
  function hireable(t, type) { return HIRES_AT[type] <= t.op; }
  // Each row's next step (null once the row is done).
  function treeNext(t) { return TREE.map(function (r) { return r.steps.find(function (id) { return t.tree.indexOf(id) < 0; }) || null; }); }
  // The bots' tree (balance.js): n picks, round the rows in turn (12: every step).
  function autoTree(n) { var out = []; for (var i = 0; i < n; i++) { var r = TREE[i % 3]; out.push(r.steps[Math.floor(i / 3)]); } return out; }
  // A gold star's bonus after the tree pick: another pick, a veteran recruit (a role with a stripe), or a medal (+1
  // stripe for the top gun).
  function bonusFor(t) {
    var rnd = world.mulberry(game.mix(tourSeed(t), 0x5eaf00 + t.op)), out = [{ kind: 'pick', name: 'Another requisition', text: 'One more step on the tree.' }];
    var roles = ROLES.filter(function (r) { return HIRES_AT[r] <= t.op + 1; });
    var role = roles[Math.floor(rnd() * roles.length)], top = t.squad.slice().sort(function (a, b) { return b.kills - a.kills || a.id - b.id; })[0];
    if (t.squad.length < BARRACKS) out.push({ kind: 'veteran', type: role, name: 'Veteran ' + ROLE_NAME[role], text: 'A ' + ROLE_NAME[role] + ' with one stripe joins.' });
    if (top && top.stripes < MAX_STRIPES) out.push({ kind: 'medal', id: top.id, name: 'Medal', text: '+1 stripe for ' + rankName(top) + ', your top gun.' });
    return out;
  }

  // ---------- the tour ----------
  // One tour per device, saved as plain JSON (TOUR_KEY) at the start of every mission and whenever a soldier dies,
  // so closing the page can't undo a death. `at` is where the tour stands, which is where Continue goes:
  //   map, briefing     before an operation's first mission
  //   mission           in a mission (the wave save, if it's still good, brings back the last shop)
  //   between, lost     after a mission won or lost
  //   debrief, barracks after an operation
  //   end               after the last released operation ("To be continued")
  // The squad lists everyone alive (deployed or in a bunk), the fallen everyone who died, `gone` named soldiers sent
  // home (kept for their names). Gear is the operation's shop stacks and radio calls, as of the mission's start; it
  // starts empty with each new operation. `bank` is the tour's dog tags between missions. `tree` is the requisition
  // tree's steps taken.
  var TOUR_KEY = 'stickarmy.campaign.tour', WAVE_KEY = 'stickarmy.campaign.wave', STARS_KEY = 'stickarmy.campaign.stars', SEEN_KEY = 'stickarmy.campaign.seen';
  var VERSION = 1, tour = null;
  function freshTour(code) {
    var t = { v: VERSION, code: code, op: 0, m: 0, attempt: 0, at: 'map', missions: [], squad: [], fallen: [], gone: [], bank: 0, nextId: 1,
      opLosses: 0, opDummies: 0, opBalloons: 0, opCrew: 0, hired: 0, gun: 'standard', tree: [], gear: null, deploy: null, stars: {}, debrief: null, last: null };
    t.missions = missionsFor(t, 0);
    return t;
  }
  // A saved tour, or null if it isn't one this build can read (it's then dropped, and the title offers a new tour).
  function readTour(o) {
    if (!o || typeof o !== 'object' || o.v !== VERSION || codeValue(o.code) < 0 || !Array.isArray(o.tree) || !Array.isArray(o.squad)) return null;
    var t = freshTour(cleanCode(o.code).toUpperCase());
    ['op', 'm', 'attempt', 'bank', 'nextId', 'opLosses', 'opDummies', 'opBalloons', 'opCrew', 'hired'].forEach(function (k) { if (Number.isFinite(o[k])) t[k] = o[k]; });
    if (typeof o.at === 'string') t.at = o.at;
    if (GUNS.indexOf(o.gun) >= 0) t.gun = o.gun;
    t.tree = o.tree.filter(function (id) { return TREE_IDS.indexOf(id) >= 0; });
    ['squad', 'fallen', 'gone'].forEach(function (k) { if (Array.isArray(o[k])) t[k] = o[k].map(function (s) { return typeof s === 'object' ? Object.assign({}, s) : s; }); });
    t.gear = o.gear && typeof o.gear === 'object' ? JSON.parse(JSON.stringify(o.gear)) : null;
    t.stars = o.stars && typeof o.stars === 'object' ? Object.assign({}, o.stars) : {};
    t.debrief = o.debrief || null; t.last = o.last || null;
    if (t.at === 'debrief' && !(t.debrief && t.debrief.picks != null)) return null;
    t.deploy = Array.isArray(o.deploy) ? o.deploy.filter(Number.isFinite) : null;
    if (!OPS[t.op] || !OPS[t.op].released) return null;
    t.missions = missionsFor(t, t.op);
    carryOn(t);
    nameAll(t);
    return t;
  }
  // A tour waiting at "To be continued" carries on into an operation released since.
  function carryOn(t) {
    if (t.at !== 'end' || !OPS[t.op + 1] || !OPS[t.op + 1].released) return;
    enterOp(t, t.op + 1);
  }
  function enterOp(t, op) {
    t.op = op; t.m = 0; t.attempt = 0; t.opLosses = 0; t.opDummies = 0; t.opBalloons = 0; t.opCrew = 0; t.gear = null; t.missions = missionsFor(t, op); t.at = 'map';
  }
  function writeTour() { if (tour) save(TOUR_KEY, tour); }
  function savedTour() {
    var o = load(TOUR_KEY, null), t = readTour(o);
    if (o && !t) { try { localStorage.removeItem(TOUR_KEY); } catch (e) { /* ignore */ } }
    return t;
  }
  // Gold stars are the device's: a new tour keeps them.
  function deviceStars() { var s = load(STARS_KEY, {}); return s && typeof s === 'object' ? s : {}; }
  function addStar(id) { var s = deviceStars(); s[id] = true; save(STARS_KEY, s); }

  // ---------- the wave save ----------
  // At each shop inside a mission, a save.js snapshot (WAVE_KEY), so closing the page mid-mission comes back at the
  // last shop. It's tied to the tour's place and to this build of the game: the ?v= stamps of every script on the
  // page, so a change to any of them drops it, and the tour resumes at that mission's start.
  function build() {
    var v = [];
    Array.prototype.forEach.call(document.querySelectorAll('script[src]'), function (s) {
      var m = /[?&]v=([^&#]+)/.exec(s.getAttribute('src') || ''); if (m) v.push(m[1]);
    });
    return hashStr(v.join('.')).toString(36);
  }
  function place(t) { return t.code + '/' + t.op + '/' + t.m + '/' + t.attempt; }
  function writeWaveSave() {
    var snap = game.snapshotRun();
    if (snap && tour) save(WAVE_KEY, { v: VERSION, build: build(), place: place(tour), snap: snap });
  }
  function dropWaveSave() { try { localStorage.removeItem(WAVE_KEY); } catch (e) { /* ignore */ } }
  function goodWaveSave() {
    var w = load(WAVE_KEY, null);
    return w && w.v === VERSION && tour && w.place === place(tour) && w.build === build() ? w : null;
  }

  // ---------- the save link ----------
  // The tour at a mission's start in about 100 characters: Crockford base 32 of a few bytes (a version, the code,
  // the place, stars, tags, the squad, the fallen, the operation's gear and the tree), with a check byte so a
  // mistyped code is caught. Names and traits come from the code. Lists below are append-only.
  var KIT_IDS = ['fire', 'cool', 'mat', 'aim', 'sandbags', 'wire', 'double', 'trench', 'helmet', 'tramp', 'spread', 'flak', 'rockets', 'pierce', 'mines', 'auto', 'hospital', 'flag', 'catcher'];
  function bytesOut() {
    var b = [];
    return { b: b, byte: function (n) { b.push(n & 255); }, num: function (n) { n = Math.max(0, Math.floor(n) || 0); do { var x = n % 128; n = Math.floor(n / 128); b.push(x | (n ? 128 : 0)); } while (n); } };
  }
  function check8(b) { var h = 0x5a; b.forEach(function (x) { h = (Math.imul(h ^ x, 31) + 7) & 255; }); return h; }
  // Only this version reads; a link from another isn't a tour.
  var LINK = 1;
  function linkCode(t) {
    var o = bytesOut(), v = codeValue(t.code);
    o.byte(LINK); o.byte(v >>> 24); o.byte(v >>> 16); o.byte(v >>> 8); o.byte(v);
    o.byte(t.op); o.byte(t.m);
    var stars = 0; OPS.forEach(function (op, i) { if (t.stars[op.id]) stars += Math.pow(2, i); }); o.num(stars);
    o.num(t.bank); o.num(t.nextId); o.num(t.opLosses); o.num(t.hired);
    var g = t.gear;
    if (!g) o.byte(0);
    else {
      o.byte(1);
      var kit = KIT_IDS.filter(function (id) { return (g.stacks[id] || 0) > 0; });
      o.byte(kit.length); kit.forEach(function (id) { o.byte(KIT_IDS.indexOf(id)); o.byte(g.stacks[id]); });
      o.byte(g.calls.bomber); o.byte(g.calls.fighter); o.num(g.hired);
    }
    function soldier(s) { o.num(s.id); o.byte(ROLES.indexOf(s.type) * 8 + Math.min(7, s.stripes)); o.num(s.kills); }
    o.num(t.squad.length); t.squad.forEach(soldier);
    o.num(t.fallen.length); t.fallen.forEach(function (s) { soldier(s); o.byte(s.op * 16 + s.m); });
    o.num(t.gone.length); t.gone.forEach(function (s) { o.num(s.id); o.byte(Math.min(7, s.stripes)); });
    // The deployed, as places in the squad list; the operation's dummies caught, bomb balloons popped, gun and crew
    // caught; and the tree's steps, as bits.
    var dep = (t.deploy || []).map(function (id) { return t.squad.findIndex(function (q) { return q.id === id; }); }).filter(function (i) { return i >= 0; });
    o.num(dep.length); dep.forEach(function (i) { o.num(i); }); o.num(t.opDummies || 0);
    o.num(t.opBalloons || 0);
    o.byte(Math.max(0, GUNS.indexOf(t.gun))); o.num(t.opCrew || 0);
    o.num(t.tree.reduce(function (m, id) { return m + Math.pow(2, TREE_IDS.indexOf(id)); }, 0));
    o.byte(check8(o.b));
    // Bits to base 32, five at a time.
    var out = '', acc = 0, bits = 0;
    o.b.forEach(function (x) { acc = acc * 256 + x; bits += 8; while (bits >= 5) { bits -= 5; out += B32[Math.floor(acc / Math.pow(2, bits)) & 31]; acc %= Math.pow(2, bits); } });
    if (bits) out += B32[(acc * Math.pow(2, 5 - bits)) & 31];
    return out;
  }
  // A link or its code back to a tour (at that mission's start), or null if it isn't one.
  function readLink(text) {
    var s = String(text || '').trim(), m = /[#&]tour=([0-9A-Za-z-]+)/.exec(s);
    if (m) s = m[1];
    s = cleanCode(s);
    if (s.length < 20) return null;
    var bytes = [], acc = 0, bits = 0;
    for (var i = 0; i < s.length; i++) {
      var d = b32Val(s[i]); if (d < 0) return null;
      acc = acc * 32 + d; bits += 5;
      if (bits >= 8) { bits -= 8; bytes.push(Math.floor(acc / Math.pow(2, bits)) & 255); acc %= Math.pow(2, bits); }
    }
    if (bytes.length < 2 || check8(bytes.slice(0, -1)) !== bytes[bytes.length - 1]) return null;
    var p = 0, bad = false;
    function byte() { if (p >= bytes.length - 1) { bad = true; return 0; } return bytes[p++]; }
    function num() { var n = 0, k = 1, x; do { x = byte(); n += (x & 127) * k; k *= 128; } while (x & 128 && !bad); return n; }
    if (byte() !== LINK) return null;
    var v = ((byte() << 24) | (byte() << 16) | (byte() << 8) | byte()) >>> 0;
    var t = freshTour(codeText(v));
    t.op = byte(); t.m = byte();
    if (!OPS[t.op] || !OPS[t.op].released) return null;
    t.missions = missionsFor(t, t.op);
    var stars = num(); OPS.forEach(function (op, i) { if (Math.floor(stars / Math.pow(2, i)) % 2) t.stars[op.id] = true; });
    t.bank = num(); t.nextId = num(); t.opLosses = num(); t.hired = num();
    if (byte()) {
      var g = { stacks: {}, calls: {}, hired: 0 };
      for (var k = byte(); k > 0; k--) { var id = KIT_IDS[byte()], c = byte(); if (id) g.stacks[id] = c; }
      g.calls.bomber = byte(); g.calls.fighter = byte(); g.hired = num();
      t.gear = g;
    }
    function soldier() { var id = num(), x = byte(); return { id: id, type: ROLES[x >> 3] || 'rifle', stripes: x & 7, kills: num() }; }
    for (var q = num(); q > 0 && !bad; q--) t.squad.push(soldier());
    for (var f = num(); f > 0 && !bad; f--) { var s = soldier(), w = byte(); s.op = w >> 4; s.m = w & 15; t.fallen.push(s); }
    for (var h = num(); h > 0 && !bad; h--) t.gone.push({ id: num(), stripes: byte() });
    var dep = [];
    for (var d = num(); d > 0 && !bad; d--) { var sq = t.squad[num()]; if (sq) dep.push(sq.id); }
    t.deploy = dep.length ? dep : null; t.opDummies = num();
    t.opBalloons = num();
    t.gun = GUNS[byte()] || 'standard'; t.opCrew = num();
    var tm = num(); t.tree = TREE_IDS.filter(function (id, i) { return Math.floor(tm / Math.pow(2, i)) % 2; });
    if (bad || p !== bytes.length - 1) return null;
    t.at = t.m >= t.missions.length ? 'end' : t.m > 0 ? 'between' : 'map';
    carryOn(t);
    nameAll(t);
    return t;
  }
  function linkFor(t) { return location.href.replace(/#.*$/, '') + '#tour=' + linkCode(t); }

  // ---------- a mission ----------
  // A mission's own state lives in S (S.cm), so the wave save brings it back: which mission, its waves (`waves`, as
  // Arcade waves) and the one playing (`wi`), the goal's counts, the soldiers in the barracks (`bench`: the squad not
  // deployed, and catches with no slot), who has died, and how it ended.
  var OPEN = 'tour';
  var cur = null, statsRun = null, hidRestart = false;
  function op() { return OPS[tour.op]; }
  function mission() { return MISSIONS[world.S.cm.mission]; }
  function cm() { var S = world.S; return S && S.game === 'campaign' ? S.cm : null; }
  function startMission(opts) {
    opts = opts || {};
    var t = tour, M = MISSIONS[t.missions[t.m]], o = op();
    world.sound.init();
    dropWaveSave();
    t.at = 'mission'; t.last = null;
    writeTour();
    RUN.game = 'campaign'; RUN.players = 1;
    game.seedRun(missionSeed(t));
    game.reset();
    RUN.game = 'arcade';
    var S = world.S;
    cur = S;
    S.level = 'soldier';
    // Ids go on from the tour's, so every attempt at a mission numbers its soldiers and enemies the same.
    game.setIds({ next: t.nextId, bubble: game.ids().bubble });
    // The operation's gear, as shop stacks: whatever was bought since its start.
    applyGear(S, t.gear || { stacks: {}, calls: { bomber: 0, fighter: 0 }, hired: 0 });
    S.mods.slots = o.slots; S.wallHP = S.mods.maxHP; S.flagUp = S.mods.flag ? 1 : 0;
    game.resizeMats();
    if (t.bank) game.gainTags(t.bank, true);
    var order = deployed(t), field = order.slice(0, o.slots);
    field.forEach(function (s, i) {
      var r = world.makeRecruit(game.SLOT_ORDER[i], s.type, s.id);
      r.name = s.stripes > 0 ? s.name : undefined; r.trait = s.stripes > 0 ? s.trait : undefined; r.kills = s.kills;
      if (s.stripes > 0) SQUAD.train(r, s.stripes);
      if (r.trait === 'tough') r.hp += 1;
      S.recruits.push(r);
    });
    var weather = weatherFor(t, t.op), intel = intelFor(t, t.op);
    S.cm = { op: o.id, mission: t.missions[t.m], m: t.m, attempt: t.attempt, waves: M.as.slice(), wi: -1,
      count: { caught: 0, dummies: 0, barrage: 0, popped: 0, awayPops: 0, zeps: 0, crew: 0, pilots: 0, pilotsLost: 0, radio: 0, crates: 0, hqHit: 0, officers: 0, intel: 0, officerLanded: 0, spotter: 0, shellHits: 0, big: 0, bigLanded: 0, bay: 0, recon: 0, reconLost: 0, stand: 0 }, cleared: false, bench: order.slice(o.slots).map(function (s) { return s.id; }),
      caught: [], dead: {}, cause: null, start: t.squad.map(function (s) { return s.id; }),
      dummies: M.dummies != null ? M.dummies : o.dummies || 0, weather: weather, intel: intel && intel.m === t.m ? intel.threat : null };
    S.cm.planesBy = M.as.map(function (n) { var c = world.MODES.campaign.wave(n); return (c.planes || 0) + (c.bombers || 0); });
    // The weather, in S so a wave save keeps it: wind pushes chutes (px/s), rain cools the gun, dusk is half dark.
    if (weather === 'wind') S.wind = 16 * windDir(t, t.op);
    if (weather === 'rain') S.coolMore = 1.5;
    if (weather === 'dusk') S.dusk = 0.5;
    // A radio operator on the field brings a free call (a fighter, or a bomber on odd missions) if the radio has room.
    if (S.recruits.some(function (r) { return r.type === 'radio'; }) && S.calls.bomber + S.calls.fighter < 2) { if (t.m % 2) S.calls.bomber++; else S.calls.fighter++; S.cm.freeCall = true; }
    // The gun picked at deploy (the armory).
    S.cm.gun = gunFor(t); S.turrets[0].heavy = S.cm.gun === 'heavy' || undefined;
    // The "pop his chute over the mat" hint: the mission that brings the trampoline (`hint`), the first time.
    S.mode = 'play'; S.hint = !!M.hint && t.attempt === 0;
    statsRun = window.PlayStats ? PlayStats.start('stick-army', { progress: report }) : null;
    var sc = world.screens();
    sc.title.hidden = sc.pause.hidden = sc.over.hidden = sc.win.hidden = sc.shop.hidden = true;
    SCREENS.hide();
    hideRestart(true);
    world.fit();
    if (opts.shop) { S.wave = 0; game.seedWave(100); sc.pauseBtn.hidden = true; game.openShop(); }
    else { sc.pauseBtn.hidden = false; world.sound.ambience(game.ambienceState()); game.startWave(S.cm.waves[0]); }
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  // Who goes out: those picked on the deploy screen (still alive), then the rest by deployOrder.
  function deployed(t) {
    var pick = (t.deploy || []).map(function (id) { return t.squad.find(function (s) { return s.id === id; }); }).filter(Boolean);
    return pick.concat(deployOrder(t.squad.filter(function (s) { return pick.indexOf(s) < 0; })));
  }
  function applyGear(S, g) {
    var turret = {}; world.TURRET_MODS.forEach(function (id) { turret[id] = true; });
    KIT_IDS.forEach(function (id) {
      var it = world.ITEMS.find(function (x) { return x.id === id; }), n = g.stacks[id] || 0;
      for (var k = 0; k < n; k++) it.apply(turret[id] ? { mods: S.turrets[0].mods } : S);
      if (n) (turret[id] ? S.turrets[0].mods.stacks : S.mods.stacks)[id] = n;
    });
    S.calls = { bomber: g.calls.bomber || 0, fighter: g.calls.fighter || 0 };
    S.mods.hired = g.hired || 0;
  }
  function gearNow(S) {
    var g = { stacks: {}, calls: { bomber: S.calls.bomber, fighter: S.calls.fighter }, hired: S.mods.hired };
    KIT_IDS.forEach(function (id) { var n = (S.mods.stacks[id] || 0) + (S.turrets[0].mods.stacks[id] || 0); if (n) g.stacks[id] = n; });
    return g;
  }
  function hideRestart(on) {
    var b = document.getElementById('restartBtn');
    if (on && !b.hidden) { b.hidden = true; hidRestart = true; }
    else if (!on && hidRestart) { b.hidden = false; hidRestart = false; }
  }

  // The goal, read from the counts. met(): its count is reached. failed(): lost now.
  function met(S) {
    var g = MISSIONS[S.cm.mission].goal, k = S.cm.count;
    return g.kind === 'catch' ? k.caught >= g.n :
      g.kind === 'spotter' ? !!k.spotter : g.kind === 'big' ? !!k.big : g.kind === 'bay' ? k.bay >= g.n || k.zeps > 0 : g.kind === 'recon' ? k.recon >= g.n :
      g.kind === 'stand' ? (k.stand || 0) >= STAND.TIME : g.kind === 'pilots' ? k.pilots >= g.n : g.kind === 'radio' ? (k.radio || 0) >= RADIO_CALL.NEED : g.kind === 'crates' ? k.crates >= g.n : g.kind === 'officers' ? k.officers >= g.n :
      g.kind === 'boss' ? k.zeps >= g.n : g.kind === 'pop' ? k.barrage >= g.n : false;
  }
  function counted(g) { return ['catch', 'pop', 'boss', 'pilots', 'radio', 'crates', 'officers', 'spotter', 'big', 'bay', 'recon', 'stand'].indexOf(g.kind) >= 0; }
  // A downed zeppelin's crew still in the air or on the ground: a boss mission waits for them before it ends.
  function crewOut(S) { return S.troopers.some(function (t) { return t.crew && !t.dead; }); }
  function failed(S) {
    var g = MISSIONS[S.cm.mission].goal, k = S.cm.count;
    if (S.wallHP <= 0) return 'wall';
    if (S.cm.cleared) return null;
    if (g.kind === 'pilots' && k.pilotsLost >= PILOT.LOSE) return 'pilot';
    if (g.kind === 'spotter' && (k.shellHits || 0) >= SPOT.LOSE) return 'shells';
    if (g.kind === 'big' && k.bigLanded) return 'big';
    if (g.kind === 'recon' && k.reconLost) return 'recon';
    if (g.kind === 'radio' && S.cm.mast && S.cm.mast.hp <= 0) return 'mast';
    if (g.kind === 'crates' && k.hqHit >= 2) return 'hq';
    if (g.kind === 'officers' && k.officerLanded) return 'officer';
    return null;
  }
  var CAUSE = { wall: 'The wall came down.', goal: 'The planes stopped coming before the goal was met.', pilot: 'Two pilots were lost.', mast: 'The radio mast came down.', hq: 'Two supply planes were shot down.',
    officer: 'An officer landed and called in his guns.', shells: 'The spotter\'s shells hit the squad three times.',
    big: 'The big one reached the bunker.', recon: 'The recon plane went down.' };
  function lastWave(S) { return S.cm.wi >= S.cm.waves.length - 1; }

  // ---------- Campaign's entry in MODES ----------
  world.MODES.campaign = {
    wave: function (n) {
      var c = game.waveCfg(n), S = world.S, cm = S.cm;
      MISSIONS[cm.mission].recipe(c, n);
      if (cm.intel) INTEL[cm.intel].apply(c);
      if (cm.weather === 'rain') c.fall *= 1.2;
      c.dummies = Math.min(0.6, (cm.dummies || 0) + (c.dummiesMore || 0));
      return c;
    },
    trooper: function (kit, rnd, c) {
      if (!c || !c.dummies || kit.type === 'sniper' || kit.gunner) return;
      if (rnd() < c.dummies) { kit.dummy = true; kit.type = 'rifle'; kit.armor = 0; }
    },
    callFast: function () { return world.S.recruits.some(function (r) { return r.type === 'radio' && !r.dead && !r.down; }); },
    pauseLine: function () { return pauseLine(world.S); },
    draw: function (G) { drawWeather(world.S, G); var pc = world.S.cm && PIECES[MISSIONS[world.S.cm.mission].piece]; if (pc && pc.draw) pc.draw(world.S, G); },
    drawSky: function (G) { drawBarrage(world.S, G); },
    shot: function (b) { var S = world.S, pc = S.cm && PIECES[MISSIONS[S.cm.mission].piece]; return shotBarrage(S, b) || !!(pc && pc.shot && pc.shot(S, b)); },
    tick: function (dt) { tickBarrage(world.S, dt); tickZeps(world.S, dt); var pc = world.S.cm && PIECES[MISSIONS[world.S.cm.mission].piece]; if (pc) pc.tick(world.S, dt); },
    held: function () { var S = world.S, pc = S.cm && PIECES[MISSIONS[S.cm.mission].piece]; return !!(pc && pc.held && pc.held(S)); },
    rescue: function (t) { var pc = PIECES[MISSIONS[world.S.cm.mission].piece]; if (pc && pc.rescue) pc.rescue(world.S, t); else t.dead = true; },
    walk: function (t, dt) { var pc = PIECES[MISSIONS[world.S.cm.mission].piece]; return !!(pc && pc.walk && pc.walk(world.S, t, dt)); },
    won: function () { var S = world.S; return S.cm.cleared || lastWave(S); },
    win: function () { var S = world.S; if (counted(MISSIONS[S.cm.mission].goal) && !met(S)) missionLost('goal'); else missionWon(); },
    lost: function () { return !!failed(world.S); },
    lose: function () {
      var S = world.S, why = failed(S);
      S.cm.cause = why;
      if (why === 'wall') { game.die(); return; }
      S.cm.ended = true; world.emit('mission_end', { result: 'lost', cause: why });
      S.mode = 'dying'; S.dieT = 1.4; world.screens().pauseBtn.hidden = true;
      S.turrets.forEach(function (t) { t.firing = false; });
      S.banner = { s: 'mission failed', sub: (CAUSE[why] || '').replace(/\.$/, '').toLowerCase(), t: 0, dur: 1.6 };
      world.sound.play('over');
    },
    over: function () { missionLost(world.S.cm.cause || 'wall'); },
    cleared: function () {
      var S = world.S, g = MISSIONS[S.cm.mission].goal;
      if (S.cm.cleared || !counted(g) || !met(S) || (g.kind === 'boss' && crewOut(S))) return false;
      S.cm.cleared = true; return true;
    },
    // The squad and the sentry hold fire on a chute over a mat until it's nearly down (SPARE px above the mat), so a
    // catch is the player's to make; one let through still gets shot before it lands. (With Catcher training they pop
    // the low ones onto it, as in Arcade.)
    spare: function (t) {
      if (t.pilot) return true;
      if (t.state !== 'chute' || (world.S.mods.catcher && t.y > 475)) return false;
      return world.activeTramps().some(function (q) { return t.x > q.x1 + 4 && t.x < q.x2 - 4 && t.y < q.y - SPARE; });
    },
    caught: function (t) {
      var S = world.S; if (!S.cm) return;
      if (t.crew && MISSIONS[S.cm.mission].goal.kind === 'boss') S.cm.count.crew++;
      var pc = PIECES[MISSIONS[S.cm.mission].piece]; if (pc && pc.caught) pc.caught(S, t);
    },
    begin: function () { world.S.cm.wi++; },
    seedKey: function () { return world.S.cm.wi + 1; },
    next: function () { var S = world.S, n = S.cm.waves[S.cm.wi + 1]; return n == null ? S.wave + 1 : n; },
    // A mission's waves are numbered from 1 ("Wave 2 of 2"); a one-wave mission goes by its name. n is the wave
    // playing or the next one (a mission's waves play as different Arcade waves, so n says which).
    waveName: function (n) {
      var S = world.S, c = S.cm, k = n !== S.wave && n === c.waves[c.wi + 1] ? c.wi + 1 : c.wi;
      return c.waves.length > 1 ? 'Wave ' + (Math.max(0, k) + 1) + ' of ' + c.waves.length : MISSIONS[c.mission].name;
    },
    shopLine: function () { var S = world.S; return S.cm.wi < 0 ? 'Before ' + MISSIONS[S.cm.mission].name.toLowerCase() : world.waveName(S.wave) + ' survived'; },
    banner: function (n, sub) {
      var S = world.S, M = MISSIONS[S.cm.mission], first = S.cm.wi === 0;
      return { s: first ? M.name.toLowerCase() : 'wave ' + (S.cm.wi + 1), sub: first ? goalLine(M) : sub, t: 0, dur: first ? 3 : 2.2 };
    },
    endBanner: function () {
      var S = world.S, ok = !counted(MISSIONS[S.cm.mission].goal) || met(S);
      return ok ? { s: 'mission won!', sub: MISSIONS[S.cm.mission].name.toLowerCase(), t: 0, dur: 2.8 } : { s: 'too late!', sub: 'the goal was missed', t: 0, dur: 2.8 };
    },
    hud: function () {
      var S = world.S, M = MISSIONS[S.cm.mission], p = progress(M, S.cm.count), of = S.cm.waves.length, left = planesLeft(S);
      // A counted goal races the planes: how many are still to come, until it's met.
      // (A set-piece mission's clock is its set piece: no plane count.)
      var clock = counted(M.goal) && M.goal.kind !== 'boss' && !M.piece && !p.done && left != null ? ' · ' + left + ' planes left' : '';
      return { wave: of > 1 ? 'wave ' + Math.max(1, S.cm.wi + 1) + '/' + of : 'mission ' + (S.cm.m + 1), sub: p.sub + clock, done: p.done };
    },
    on: function (type, data) {
      var S = world.S, k = S.cm && S.cm.count;
      if (!k || S.mode === 'title') return;
      // A catch counts even with the barracks full (he just can't stay).
      if (type === 'capture') k.caught++;
      else if (type === 'plane_down' && data.kind === 'zeppelin') k.zeps++;
      else if (type === 'plane_down' && data.kind === 'balloon') { k.popped++; if (data.x == null || Math.abs(data.x - world.BK.x) > STAR_BALLOONS.NEAR) k.awayPops++; }
      else if (type === 'crate_caught') k.crates++;
      else if (type === 'hq_hit') k.hqHit++;
      else if (type === 'dummy_caught') k.dummies++;
      else if (type === 'recruit_lost') noteDeaths(S);
      else if (type === 'shop_offer') writeWaveSave();
    },
    bench: function (t) {
      var S = world.S;
      if (bunksUsed(S) >= BARRACKS) return false;
      S.cm.caught.push({ id: t.id, type: t.type }); S.cm.bench.push(t.id);
      S.stats.captured++;
      world.emit('capture', { type: t.type, bench: true });
      world.award(25, 200, 470, 'to the barracks!', BLUE, true);
      world.sound.play('recruit');
      return true;
    },
    skipShop: function () { return MISSIONS[world.S.cm.mission].shop === false; },
    sells: function (it) { return it.id !== 'slot' && it.id !== 'bootcamp' && it.id !== 'elite' && onShelf(tour, it); },
    room: function () { return bunksUsed(world.S) < BARRACKS; },
    promotes: false,
    quitLabel: 'Save and quit',
    noMats: function () { var S = world.S; return !!(S.cm && MISSIONS[S.cm.mission].noMats); }
  };
  var SPARE = 70;
  function goalLine(M) { return M.text.replace(/\.$/, '').toLowerCase(); }
  function bunksUsed(S) { return S.recruits.filter(function (r) { return !r.dead; }).length + (S.bed ? 1 : 0) + S.cm.bench.length; }
  // A death stands at once: the tour save drops him from the squad and adds him to the fallen.
  function noteDeaths(S) {
    S.recruits.forEach(function (r) {
      if (!r.dead || S.cm.dead[r.id]) return;
      S.cm.dead[r.id] = true;
      var s = tour.squad.find(function (q) { return q.id === r.id; });
      tour.fallen.push({ id: r.id, type: r.type, stripes: s ? s.stripes : 0, kills: r.kills || 0, op: tour.op, m: tour.m, name: s ? s.name : null });
      tour.squad = tour.squad.filter(function (q) { return q.id !== r.id; });
      tour.opLosses++;
      tour.nextId = Math.max(tour.nextId, game.ids().next);
      nameAll(tour);
      writeTour();
    });
  }

  // ---------- how a mission ends ----------
  function missionWon() {
    var S = world.S, t = tour;
    S.mode = 'between';
    world.screens().pauseBtn.hidden = true;
    world.sound.play('victory');
    // Who's left: the field (and the tent), then the barracks. Soldiers from the start who aren't here and didn't die
    // were sent home from the shop.
    var byId = {}; t.squad.forEach(function (s) { byId[s.id] = s; });
    var here = S.recruits.filter(function (r) { return !r.dead; }).concat(S.bed ? [S.bed.r] : []), next = [], seen = {};
    here.forEach(function (r) { var s = byId[r.id]; seen[r.id] = true; next.push({ id: r.id, type: r.type, stripes: s ? s.stripes : 0, kills: r.kills || 0 }); });
    S.cm.bench.forEach(function (id) {
      if (seen[id]) return; seen[id] = true;
      var s = byId[id], c = S.cm.caught.find(function (q) { return q.id === id; });
      if (s) next.push({ id: s.id, type: s.type, stripes: s.stripes, kills: s.kills });
      else if (c) next.push({ id: c.id, type: c.type, stripes: 0, kills: 0 });
    });
    t.squad.forEach(function (s) { if (!seen[s.id] && !S.cm.dead[s.id]) t.gone.push({ id: s.id, stripes: s.stripes }); });
    var fresh = next.filter(function (s) { return !byId[s.id]; }).length;
    t.squad = next.slice(0, BARRACKS);
    t.bank = game.tagsOf(0);
    t.gear = gearNow(S);
    t.opDummies = (t.opDummies || 0) + (S.cm.count.dummies || 0);
    t.opBalloons = (t.opBalloons || 0) + (S.cm.count.awayPops || 0);
    if (MISSIONS[S.cm.mission].goal.kind === 'boss') t.opCrew = Math.max(t.opCrew || 0, S.cm.count.crew || 0);
    if (t.deploy) t.deploy = t.deploy.filter(function (id) { return next.some(function (q) { return q.id === id; }); });
    t.nextId = Math.max(t.nextId, game.ids().next);
    var M = MISSIONS[t.missions[t.m]];
    t.last = { won: true, mission: M.name, result: M.goal.kind === 'survive' ? 'Survived ' + (M.as.length > 1 ? 'all ' + M.as.length + ' waves.' : 'the wave.') : pauseLine(S, true), caught: S.stats.captured - (S.cm.count.pilots || 0), planes: S.stats.planes, time: Math.round(S.played), fresh: fresh,
      fell: t.fallen.filter(function (f) { return f.op === t.op && f.m === t.m; }).map(function (f) { return f.id; }), dummies: S.cm.count.dummies || 0 };
    endStats(true, 'won');
    S.cm.ended = true; world.emit('mission_end', { result: 'won' });
    t.m++; t.attempt = 0;
    if (t.m >= t.missions.length) finishOperation(); else t.at = 'between';
    nameAll(t);
    writeTour();
    dropWaveSave();
    if (t.at === 'debrief') SCREENS.debrief(); else SCREENS.between();
  }
  function missionLost(why) {
    var S = world.S, t = tour;
    S.mode = 'between';
    world.screens().pauseBtn.hidden = true;
    t.at = 'lost';
    t.last = { won: false, mission: MISSIONS[t.missions[t.m]].name, cause: CAUSE[why] || CAUSE.wall,
      fell: t.fallen.filter(function (f) { return f.op === t.op && f.m === t.m; }).map(function (f) { return f.id; }) };
    endStats(false, 'lost', why);
    if (!S.cm.ended) { S.cm.ended = true; world.emit('mission_end', { result: 'lost', cause: why }); }
    writeTour();
    dropWaveSave();
    SCREENS.lost();
  }
  function retry() {
    // The lost attempt's report becomes "retried"; the new attempt is a run of its own.
    if (statsRun && cur) { PlayStats.end(statsRun, report('retried')); statsRun = null; }
    tour.attempt++;
    startMission();
  }
  // The operation's done: one stripe for everyone left, the gold star if earned, and the requisition tree's pick. All
  // decided now and saved, so a reload shows the same debrief.
  function finishOperation() {
    var t = tour, o = op(), star = o.starKind === 'dummies' ? !t.opDummies : o.starKind === 'balloons' ? (t.opBalloons || 0) >= STAR_BALLOONS.N : o.starKind === 'crew' ? (t.opCrew || 0) >= 3 : t.opLosses === 0, promoted = [];
    t.squad.forEach(function (s) { if (s.stripes < MAX_STRIPES) { s.stripes++; promoted.push({ id: s.id, named: s.stripes === 1 }); } });
    nameAll(t);
    if (star) { t.stars[o.id] = true; addStar(o.id); }
    // The debrief: a pick from the requisition tree, and with a gold star a bonus (another pick, a veteran or a medal).
    t.debrief = { op: t.op, star: star, promoted: promoted, picks: 1, bonus: star ? bonusFor(t) : null };
    t.gear = null; t.deploy = null;
    t.at = 'debrief';
  }
  // A step on the tree (id, one of treeNext). Returns what's left to do: 'pick' (another step), 'bonus' (the gold
  // star's slips), or 'done' (on to the barracks).
  function takeStep(id) {
    var t = tour, d = t.debrief;
    if (!d || !d.picks || treeNext(t).indexOf(id) < 0) return null;
    t.tree.push(id); d.picks--;
    (d.took = d.took || []).push(id);
    return debriefLeft();
  }
  function takeBonus(i) {
    var t = tour, d = t.debrief, r = d && d.bonus && d.bonus[i];
    if (!r || d.picks) return null;
    d.bonus = null;
    if (r.kind === 'pick') { d.picks++; writeTour(); return debriefLeft(); }
    if (r.kind === 'veteran' && t.squad.length < BARRACKS) t.squad.push({ id: t.nextId++, type: r.type, stripes: 1, kills: 0 });
    else if (r.kind === 'medal') { var s = t.squad.find(function (q) { return q.id === r.id; }); if (s) s.stripes = Math.min(MAX_STRIPES, s.stripes + 1); }
    nameAll(t);
    return debriefLeft();
  }
  function debriefLeft() {
    var t = tour, d = t.debrief;
    if (d.picks > 0 && treeNext(t).some(Boolean)) { writeTour(); return 'pick'; }
    d.picks = 0;
    if (d.bonus) { writeTour(); return 'bonus'; }
    t.debrief = null; t.at = 'barracks';
    writeTour();
    return 'done';
  }
  // After the barracks: the next operation, or "To be continued" when it isn't out yet.
  // The operation the squad goes out on next: after an operation's last mission (the debrief and the barracks), the
  // next one if it's out.
  function nextOp() {
    var t = tour, done = t.m >= t.missions.length && (t.at === 'debrief' || t.at === 'barracks');
    return done && OPS[t.op + 1] && OPS[t.op + 1].released ? OPS[t.op + 1] : OPS[t.op];
  }
  function leaveBarracks() {
    var t = tour;
    if (t.at === 'barracks') {
      var next = t.op + 1;
      if (OPS[next] && OPS[next].released) enterOp(t, next);
      else t.at = 'end';
      writeTour();
    }
    return t.at;
  }
  // Recruiting in the barracks, with the tour's tags: Arcade's hire prices before war prices, and each hire on the
  // tour raises the next by 15.
  var HIRE = { rifle: 35, engineer: 40, bazooka: 55, sniper: 50, medic: 55, radio: 50, mg: 60 };
  // Balloon Season's gold star: N bomb balloons popped more than NEAR px from the bunker, through the operation.
  var STAR_BALLOONS = { N: 10, NEAR: 70 };
  // Campaign's own hires in the shop too (`only`, shop.js), priced as Arcade prices its hires.
  function campaignHire(type, name, desc) {
    world.ITEMS.push({ id: 'hire-' + type, role: type, name: name, desc: desc, tier: 'hire', only: 'campaign', maxStacks: Infinity,
      cost: function () { return Math.max(5, Math.round((HIRE[type] + 15 * world.S.mods.hired) * game.SHOP.war(game.SHOP.WAR.HIRE) / 5) * 5); },
      available: function () { return world.freeSlot(0) >= 0 && world.MODES.campaign.room(); },
      apply: function (s) { s.mods.hired++; var r = world.makeRecruit(world.freeSlot(0), type); r.fresh = true; s.recruits.push(r); } });
  }
  campaignHire('mg', 'Machine gunner', 'Bursts at chutes, landers and low planes. Runs hot and rests.');
  world.ITEMS.push({ id: 'hire-radio', role: 'radio', name: 'Radio operator', desc: 'A free radio call each mission, and calls come in sooner while he stands.',
    tier: 'hire', only: 'campaign', maxStacks: Infinity,
    cost: function () { return Math.max(5, Math.round((HIRE.radio + 15 * world.S.mods.hired) * game.SHOP.war(game.SHOP.WAR.HIRE) / 5) * 5); },
    available: function () { return world.freeSlot(0) >= 0 && world.MODES.campaign.room(); },
    apply: function (s) { s.mods.hired++; var r = world.makeRecruit(world.freeSlot(0), 'radio'); r.fresh = true; s.recruits.push(r); } });

  // ---------- the weather, drawn ----------
  // Over the field, under the labels (game.js render, MODES draw). Cosmetic only: positions come from the time and
  // fixed offsets, never a random stream. Fog hides the high sky; rain falls in pencil strokes; wind blows marks
  // across; dusk is the night raid's dark at half (sky.js).
  // The bots' view of a set piece (balance.js): things to shoot (`targets`) and friends not to (`friends`).
  function pieceView(kind) { var S = world.S, pc = S.cm && PIECES[MISSIONS[S.cm.mission].piece]; return pc && pc[kind] ? pc[kind](S) : []; }
  // ---------- set pieces (round 5) ----------
  // A mission's own thing on the page. Each runs from MODES tick (and draw); its state is in S.cm, so a wave save
  // keeps it. Times are seconds into the mission's wave (S.cm.pt); places come from the mats, not a random stream, so
  // the waves play as they would without it.
  function matMid() { var m = world.activeTramps()[0]; return (m.x1 + m.x2) / 2; }
  function ring(G, x, y, r, color) { G.save(); G.setLineDash([6, 5]); G.lineWidth = 2; G.strokeStyle = color; G.beginPath(); G.arc(x, y, r, 0, Math.PI * 2); G.stroke(); G.restore(); }
  function waveTime(S, dt) { if (S.waveState === 'active') S.cm.pt = (S.cm.pt || 0) + dt; return S.cm.pt || 0; }
  // Downed pilot (Boot Camp's second mission, where the trampoline arrives): PILOT.BAILS blue planes of ours cross,
  // one every PILOT.EVERY seconds from the mat's far side, already hit and smoking, each with an enemy fighter sitting
  // PILOT.GAP behind it. Ours goes down PILOT.BAIL px short of the mat (at least PILOT.EDGE in from the page's edge)
  // whatever you do, and its pilot bails out, falling clear for PILOT.FREE seconds before his blue chute opens, then
  // drifting to be over the mat about PILOT.LOW px down, where he stays. The fighter goes for him: within PILOT.NEAR it
  // pulls up PILOT.SIDE px beside him on the turret's side (so a shot at it misses him) and fires, and PILOT.STRAFE
  // seconds of that hit him. Shoot the fighter, then catch him: he joins the squad. Hit, splatted or landed, he's lost,
  // and PILOT.LOSE lost fails it. No round, blast or falling plane hurts a pilot (the turret can only pop his chute),
  // and the squad and the sentry don't aim at one (spare).
  var PILOT = { FIRST: 3, EVERY: 8, Y: [200, 160, 230, 180], SPEED: 55, CHASE: 1.25, GAP: 72, BAIL: 60, EDGE: 40, NEAR: 90, SIDE: 64, STRAFE: 2.2, FREE: 0.7, LOW: 480, BAILS: 4, LOSE: 2 };
  function bail(S, b, why) {
    var c = S.cm, mid = matMid();
    b.state = 'fall'; b.vy = 0; c.bailed++;
    world.addText(why, b.x, b.y - 24, why === 'friendly fire!' ? world.RED : world.INK, 20, 'minor'); world.sound.play('boom');
    world.burst(b.x, b.y, 8, world.INK, 140);
    var p = world.spawnTrooper(b.x, b.y + 22, { type: 'rifle', fall: 0.95, sway: 0, armor: 0 });
    p.pilot = true; p.ff = PILOT.FREE;
    p.drift = Math.max(-40, Math.min(40, (mid - p.x) / Math.max(1, (PILOT.LOW - p.y - PILOT.FREE * 180) / p.fall)));
    (c.pilotIds = c.pilotIds || []).push(p.id);
    b.pilot = p.id;
    world.addText('pilot bailing out!', p.x, p.y - 40, BLUE, 20, 'story');
  }
  function chaserOf(S, b) { return S.planes.find(function (p) { return p.id === b.chaser && p.state === 'fly'; }); }
  // Hold the radio: a mast between the mat and the bunker; landers walking past stop and wreck it (MAST.HURT a
  // second each). The call to HQ takes RADIO_CALL.NEED seconds of mast standing; then an air strike comes in.
  var MAST = { HURT: 9, HP: 100 }, RADIO_CALL = { NEED: 45 };
  // The officer: OFFICER.AT seconds in, an officer in a peaked cap and a vest (one hit to knock it off) jumps with
  // the troopers. Caught: intel (tags).
  // Shot: dealt with. Landed: he calls in his guns (OFFICER.SHELL off the wall) and the mission is lost.
  var OFFICER = { AT: [6, 20, 34], Y: 120, TAGS: 60, SHELL: 20 };
  var PIECES = {
    pilot: {
      tick: function (S, dt) {
        var c = S.cm, k = c.count, t = waveTime(S, dt);
        c.blues = c.blues || []; c.bailed = c.bailed || 0; c.settled = c.settled || {};
        if (!c.toldMat) { c.toldMat = true; world.addText('HQ sent you a trampoline!', 200, 470, BLUE, 22, 'story'); }
        // Our planes: one every PILOT.EVERY seconds, PILOT.BAILS in all.
        if (S.waveState === 'active' && (c.bluesOut || 0) < PILOT.BAILS && t >= (c.nextBlue == null ? PILOT.FIRST : c.nextBlue)) {
          // From the far side of the mat, so its fighter stays between the pilot and the turret, never past him.
          var n = c.bluesOut = (c.bluesOut || 0) + 1, dir = matMid() < world.W / 2 ? -1 : 1, y = PILOT.Y[n % PILOT.Y.length], x0 = dir > 0 ? -40 : world.W + 40;
          // It goes down PILOT.BAIL short of the mat, so its pilot drifts the rest of the way (never past the page's edges).
          var bailX = Math.max(PILOT.EDGE, Math.min(world.W - PILOT.EDGE, matMid() - dir * PILOT.BAIL));
          c.blues.push({ id: world.id(), x: x0, x0: x0, bailX: bailX, y: y, dir: dir, state: 'fly', vy: 0, chaser: null, pilot: null });
          c.nextBlue = t + PILOT.EVERY;
        }
        c.blues.forEach(function (b) {
          b.firing = false; b.strafing = false;
          if (b.gone) return fighterHunts(S, b);
          if ((b.smoke = (b.smoke || 0) - dt) <= 0) { b.smoke = b.state === 'fall' ? 0.07 : 0.16; world.puff(b.x - b.dir * 18, b.y, 4, 0.7); }
          var f = chaserOf(S, b);
          // Its fighter comes in at the edge just behind it (a plane further out would be off the page), drops back to
          // PILOT.GAP and sits on its tail.
          if (b.chaser == null) {
            f = world.makePlane('plane', b.dir, b.x0 - b.dir * 45, b.y);
            f.speed = PILOT.SPEED * PILOT.CHASE; f.chases = b.id; b.chaser = f.id;
            S.planes.push(f);
          }
          if (f && b.state === 'fly') { var gap = (b.x - f.x) * b.dir; f.speed = PILOT.SPEED * (gap > PILOT.GAP + 8 ? PILOT.CHASE : gap < PILOT.GAP - 8 ? 0.8 : 1); }
          if (b.state === 'fall') {
            b.vy += 220 * dt; b.y += b.vy * dt; b.x += b.dir * PILOT.SPEED * 0.5 * dt;
            if (b.y >= world.GROUND - 10) { b.gone = true; world.pow(b.x, world.GROUND - 10, 30); world.sound.play('boom'); }
          } else {
            b.x += b.dir * PILOT.SPEED * dt;
            b.firing = !!f && (b.x - f.x) * b.dir > 0;
            if ((b.x - b.bailX) * b.dir >= 0) bail(S, b, 'shot down!');
          }
          fighterHunts(S, b);
        });
        function fighterHunts(S, b) {
          // The fighter goes for the pilot: near him, it pulls up beside him and fires.
          var f = chaserOf(S, b), q = b.pilot != null && !c.settled[b.pilot] && S.troopers.find(function (x) { return x.id === b.pilot && !x.dead && x.state === 'chute'; });
          if (f) {
            if (q && Math.abs(q.x - f.x) < PILOT.NEAR) {
              // It holds beside him on the turret's side, so a shot at it doesn't pass through him.
              var at = q.x + (q.x < world.W / 2 ? 1 : -1) * PILOT.SIDE;
              f.speed = 0; f.x += Math.max(-70 * dt, Math.min(70 * dt, at - f.x));
              b.strafing = Math.abs(at - f.x) < 12 && !(q.ff > 0); if (b.strafing) f.strafe = (f.strafe || 0) + dt;
              if (f.strafe >= PILOT.STRAFE) {
                q.dead = true; world.burst(q.x, q.y + 14, 8, BLUE, 120); world.sound.play('hit');
                world.addText('pilot hit!', q.x, q.y - 20, world.RED, 22, 'alert'); world.emit('pilot_lost', { how: 'hit' });
              }
            } else if (b.state !== 'fly') f.speed = PILOT.SPEED * PILOT.CHASE;
          }
        }
        // A blue plane's record stays while its pilot is out, so its fighter keeps after him.
        c.blues = c.blues.filter(function (b) { return !b.gone || (b.pilot != null && !c.settled[b.pilot]); });
        // Each pilot out until he's settled: caught (he joins the squad), or lost: landed off the mat, or gone (hit by
        // the fighter, splatted, shot by your turret; the dead leave S.troopers).
        (c.pilotIds || []).forEach(function (id) {
          if (c.settled[id]) return;
          var q = S.troopers.find(function (x) { return x.id === id; });
          // He falls clear of the planes for PILOT.FREE seconds before his chute opens, then drifts toward the mat.
          if (q && !q.dead && q.state === 'chute' && q.ff > 0) { q.ff -= dt; q.open = 0; q.y += 85 * dt; }
          else if (q && !q.dead && q.state === 'chute') { var mid = matMid(); q.x += q.drift * dt; if ((q.x - mid) * q.drift >= 0) { q.x = q.drift ? mid : q.x; q.drift = 0; } }
          if (q && !q.dead && q.state === 'ground') { q.dead = true; world.addText('pilot captured!', q.x, world.GROUND - 60, world.RED, 24, 'alert'); world.emit('pilot_lost', { how: 'landed' }); }
          if (!q || (q.dead && !c.settled[id])) { if (!q || q.state !== 'bounce') { c.settled[id] = 'lost'; k.pilotsLost++; } }
        });
      },
      // A round from your turret into one of ours brings it down too: its pilot still bails out.
      shot: function (S, bl) {
        if (bl.owner !== 'player') return false;
        var b = (S.cm.blues || []).find(function (q) { return q.state === 'fly' && Math.abs(bl.x - q.x) < 30 && Math.abs(bl.y - q.y) < 11; });
        if (!b) return false;
        bl.dead = true; bail(S, b, 'friendly fire!');
        return true;
      },
      caught: function (S, q) {
        if (!q.pilot) return;
        S.cm.settled[q.id] = 'saved'; S.cm.count.pilots++;
        world.addText('pilot safe! he joins up', q.x, world.GROUND - 80, BLUE, 22, 'story');
      },
      held: function (S) { var c = S.cm; return (c.bailed || 0) < PILOT.BAILS && !met(S) || S.troopers.some(function (q) { return q.pilot && !q.dead; }); },
      targets: function (S) { return S.planes.filter(function (p) { return p.chases && p.state === 'fly' && p.x > 20 && p.x < world.W - 20; }).map(function (p) { return { id: p.id, x: p.x, y: p.y, vx: p.vx || p.dir * p.speed, rank: 420 }; }); },
      friends: function (S) { return (S.cm.blues || []).filter(function (b) { return b.state === 'fly'; }).map(function (b) { return { x: b.x, y: b.y, vx: b.dir * PILOT.SPEED, hw: 30, hh: 12 }; }); },
      draw: function (S, G) {
        (S.cm.blues || []).forEach(function (b) {
          // Ours: the fighter's blue body, nose down once it's going down.
          if (!b.gone) world.drawAllyPlane(b.id, b.x, b.y, b.dir, b.state === 'fall' ? 0.5 : 0);
          var f = chaserOf(S, b), q = b.strafing && S.troopers.find(function (x) { return x.id === b.pilot; });
          if (f && (b.firing || q) && Math.floor(S.t * 12) % 2) {
            G.save(); G.setLineDash([4, 5]); G.strokeStyle = world.RED; G.lineWidth = 1.6; G.beginPath(); G.moveTo(f.x + f.dir * 20, f.y + 4);
            if (q) G.lineTo(q.x, q.y - 4); else G.lineTo(b.x - b.dir * 22, b.y); G.stroke(); G.restore();
          }
        });
        S.troopers.forEach(function (q) { if (q.pilot && !q.dead && q.state === 'chute') ring(G, q.x, q.y - 10, 34, BLUE); });
      }
    },
    radio: {
      tick: function (S, dt) {
        var c = S.cm, k = c.count;
        if (!c.mast) { var m = world.activeTramps()[0], left = m.x1 < 200; c.mast = { x: left ? m.x2 + 34 : m.x1 - 34, hp: MAST.HP }; }
        if (S.waveState === 'active' && c.mast.hp > 0 && !c.cleared) {
          k.radio = Math.min(RADIO_CALL.NEED, (k.radio || 0) + dt);
          if (k.radio >= RADIO_CALL.NEED && !c.called) {
            c.called = true;
            world.addText('call through! air strike inbound', 200, 300, BLUE, 24, 'story');
            S.calls.bomber++; world.callStrike();
          }
        }
      },
      held: function (S) { return !S.cm.called && S.cm.mast && S.cm.mast.hp > 0; },
      walk: function (S, q, dt) {
        var mast = S.cm.mast;
        if (!mast || mast.hp <= 0) return false;
        var ahead = (mast.x - q.x) * q.dir;
        if (ahead > 10 || ahead < -4 || (world.BK.x - mast.x) * q.dir < 0) return false;
        q.atWall = true; q.attacking = null; q.x = mast.x - q.dir * 8;
        mast.hp = Math.max(0, mast.hp - MAST.HURT * dt);
        q.thump -= dt;
        if (q.thump <= 0) { q.thump = 0.6; world.sound.play('thump'); }
        if (mast.hp <= 0) { world.burst(mast.x, world.GROUND - 40, 12, world.INK, 160); world.addText('the mast is down!', mast.x, world.GROUND - 110, world.RED, 24, 'alert'); }
        return true;
      },
      draw: function (S, G) {
        var mast = S.cm.mast, k = S.cm.count; if (!mast) return;
        var x = mast.x, g = world.GROUND, up = mast.hp > 0;
        G.save(); G.strokeStyle = world.INK; G.lineWidth = 2.4; G.lineCap = 'round';
        if (up) {
          G.beginPath(); G.moveTo(x - 12, g); G.lineTo(x, g - 92); G.lineTo(x + 12, g); G.moveTo(x - 8, g - 30); G.lineTo(x + 8, g - 30); G.moveTo(x - 4, g - 60); G.lineTo(x + 4, g - 60); G.moveTo(x, g - 92); G.lineTo(x, g - 104); G.stroke();
          if (k.radio < RADIO_CALL.NEED) { var ph = (S.t * 1.6) % 1; G.strokeStyle = BLUE; G.globalAlpha = 1 - ph; G.beginPath(); G.arc(x, g - 104, 8 + ph * 18, Math.PI * 1.15, Math.PI * 1.85); G.stroke(); G.globalAlpha = 1; }
        } else { G.beginPath(); G.moveTo(x - 12, g); G.lineTo(x + 30, g - 18); G.lineTo(x + 70, g - 4); G.stroke(); }
        // The call's bar and the mast's health, above it.
        var bx = x - 36, by = g - 140;
        G.fillStyle = world.PAPER; G.fillRect(bx, by, 72, 9); G.fillStyle = BLUE; G.fillRect(bx + 1, by + 1, 70 * Math.min(1, (k.radio || 0) / RADIO_CALL.NEED), 7); G.strokeStyle = world.INK; G.lineWidth = 1.6; G.strokeRect(bx, by, 72, 9);
        G.fillStyle = world.PAPER; G.fillRect(bx, by + 13, 72, 6); G.fillStyle = mast.hp > 40 ? '#2e8b4a' : world.RED; G.fillRect(bx + 1, by + 14, 70 * mast.hp / MAST.HP, 4); G.strokeRect(bx, by + 13, 72, 6);
        G.fillStyle = BLUE; G.font = '16px Schoolbell, cursive'; G.textAlign = 'center'; G.fillText(k.radio >= RADIO_CALL.NEED ? 'call through!' : 'calling HQ…', x, by - 6);
        G.restore();
      }
    },
    // Supply drop: HQ's supply planes (sky.js, `c.crates` a wave) are the set piece; crate_caught and hq_hit count.
    supply: { tick: function () {} },
    officer: {
      tick: function (S, dt) {
        var c = S.cm, k = c.count, t = waveTime(S, dt), sp = S.spawn;
        c.officersOut = c.officersOut || 0;
        var due = c.officersOut < OFFICER.AT.length && (t >= OFFICER.AT[c.officersOut] || (sp && sp.planes + sp.bombers === 0));
        if (due && S.waveState === 'active') {
          var m = world.activeTramps()[0], x = c.officersOut % 2 ? (m.x1 < 200 ? 300 : 100) : matMid();
          var o = world.spawnTrooper(x, OFFICER.Y, { type: 'rifle', fall: 0.9, sway: c.officersOut * 2, armor: 1 });
          o.officer = true; o.prize = true;
          (c.officerIds = c.officerIds || []).push(o.id);
          c.officersOut++;
          world.addText('an officer!', x, OFFICER.Y - 40, world.RED, 22, 'alert');
          world.sound.play('horn');
        }
        // Each officer until he's settled: caught (rescue), landed, or gone from the field any other way (shot).
        c.settled = c.settled || {};
        (c.officerIds || []).forEach(function (id) {
          if (c.settled[id]) return;
          var q = S.troopers.find(function (x) { return x.id === id; });
          if (q && !q.dead && q.state === 'ground') {
            c.settled[id] = 'landed'; q.dead = true; k.officerLanded++;
            world.addText('he calls in his guns!', q.x, world.GROUND - 70, world.RED, 24, 'alert');
            world.pow(world.BK.x, world.BK.top + 6, 40); world.sound.play('boom'); world.hurtWall(OFFICER.SHELL, 'bomb');
          } else if (!q || q.dead) { c.settled[id] = 'shot'; k.officers++; }
        });
      },
      held: function (S) { return (S.cm.officersOut || 0) < OFFICER.AT.length; },
      rescue: function (S, q) {
        q.dead = true; (S.cm.settled = S.cm.settled || {})[q.id] = 'caught'; S.cm.count.officers++; S.cm.count.intel++;
        game.gainTags(OFFICER.TAGS); world.award(80, q.x, world.GROUND - 70, 'captured! intel +' + OFFICER.TAGS + ' tags', BLUE, true);
        world.sound.play('recruit');
      },
      draw: function (S, G) {
        S.troopers.forEach(function (q) { if (q.officer && !q.dead && (q.state === 'chute' || q.state === 'free')) ring(G, q.x, q.y - 10, 34, world.RED); });
      }
    }
  };

  // ---------- set pieces for Balloon Season and First Zeppelin (round 6) ----------
  function ellipseHit(b, x, y, rx, ry) { var dx = (b.x - x) / rx, dy = (b.y - y) / ry; return dx * dx + dy * dy < 1; }
  function bulletDmg(b) { return b.kind === 'rocket' ? 3 : b.heavy ? 4 : 1; }
  function bar(G, x, y, w, frac, color) {
    G.fillStyle = world.PAPER; G.fillRect(x, y, w, 8); G.fillStyle = color; G.fillRect(x + 1, y + 1, (w - 2) * Math.max(0, Math.min(1, frac)), 6);
    G.strokeStyle = world.INK; G.lineWidth = 1.6; G.strokeRect(x, y, w, 8);
  }
  // A shell landing at x: a blast, hurting soldiers within SPOT.R and the wall if it's at the bunker.
  function shell(S, x, hits) {
    world.pow(x, world.GROUND - 8, 34); world.burst(x, world.GROUND - 6, 10, world.INK, 160); world.sound.play('boom');
    S.shake = Math.max(S.shake || 0, 0.3);
    var hit = 0;
    S.recruits.forEach(function (r) { if (!r.dead && !r.down && Math.abs(r.x - x) < SPOT.R) { world.hurtRecruit(r, SPOT.HURT, 'shell'); hit++; } });
    if (Math.abs(x - world.BK.x) < 46) world.hurtWall(SPOT.WALL, 'bomb');
    if (hit && hits) hits.n++;
    return hit;
  }
  // Spotter balloon: an enemy observation balloon on a cable (SPOT.X from the mat's side), two barrage balloons
  // beside it. Every SPOT.EVERY seconds its spotter marks a spot (a soldier, the bunker, the mat in turn) with a red X;
  // SPOT.FUSE seconds later a shell lands there. SPOT.HP hits pop it; SPOT.LOSE soldiers hit loses the mission.
  var SPOT = { HP: 14, Y: 118, EVERY: 5.5, FUSE: 4, R: 26, HURT: 1.4, WALL: 10, LOSE: 3, RX: 30, RY: 15 };
  // The big one: a bomb balloon BIG.R across, BIG.HP hits, drifting from the page's edge to the bunker over BIG.TIME
  // seconds.
  var BIG = { HP: 70, R: 46, Y: 150, TIME: 50, AT: 3 };
  // Bomb bay: the zeppelin's bay opens BAY.OPEN seconds before each bomb run; BAY.N hits inside it wins, and each one
  // stops that run.
  var BAY = { OPEN: 3, R: 17, N: 5 };
  // Recon run: our recon plane crosses RECON.PASSES times at RECON.Y; enemy planes within RECON.NEAR wear it down
  // (RECON.CHIP a second), and so do the zeppelin's gunners while it's within RECON.GUNS of it.
  var RECON = { HP: 30, Y: 128, SPEED: 34, PASSES: 3, NEAR: 60, CHIP: 1.6, GUNS: 90, GUN_CHIP: 0.8, FRIENDLY: 3, GAP: 4, AT: 3, HW: 34, HH: 12 };
  // Last stand: the wall starts at STAND.WALL of full and can't be repaired; survive STAND.TIME seconds.
  var STAND = { WALL: 0.4, TIME: 45 };
  Object.assign(PIECES, {
    spotter: {
      tick: function (S, dt) {
        var c = S.cm, k = c.count, t = waveTime(S, dt);
        if (!c.spot) {
          var m = world.activeTramps()[0], x = m.x1 < 200 ? 300 : 100;
          c.spot = { x: x, hp: SPOT.HP, flash: 0, next: 3, turn: 0, marks: [], hits: { n: 0 } };
        }
        var sp = c.spot;
        // Its guards: the wave's barrage balloons, moved to either side of it.
        if (S.barrage && S.barrage.length && !c.guarded) { c.guarded = true; var side = sp.x < 200 ? 1 : -1; S.barrage[0].x = sp.x + side * 60; S.barrage[0].y = 168; if (S.barrage[1]) { S.barrage[1].x = sp.x - side * 50; S.barrage[1].y = 186; } }
        sp.flash = Math.max(0, sp.flash - dt);
        k.shellHits = sp.hits.n;
        sp.marks.forEach(function (q) { q.t -= dt; if (q.t <= 0 && !q.done) { q.done = true; shell(S, q.x, sp.hits); } });
        sp.marks = sp.marks.filter(function (q) { return !q.done; });
        if (sp.hp <= 0 || S.waveState !== 'active' || c.cleared) return;
        if (t >= sp.next) {
          sp.next = t + SPOT.EVERY;
          var live = S.recruits.filter(function (r) { return !r.dead; }), m2 = world.activeTramps()[0];
          var picks = [live.length ? live[sp.turn % live.length].x : world.BK.x, world.BK.x, (m2.x1 + m2.x2) / 2];
          sp.marks.push({ x: picks[sp.turn % 3], t: SPOT.FUSE });
          sp.turn++;
          world.addText('spotted!', sp.x, SPOT.Y - 34, world.RED, 18, 'minor');
        }
      },
      shot: function (S, b) {
        var sp = S.cm.spot;
        if (!sp || sp.hp <= 0 || !ellipseHit(b, sp.x, SPOT.Y, SPOT.RX + 3, SPOT.RY + 6)) return false;
        sp.hp -= bulletDmg(b); sp.flash = 0.15; b.dead = true;
        world.burst(b.x, b.y, 3, world.INK, 90); world.sound.play('clank');
        if (sp.hp <= 0) {
          S.cm.count.spotter = 1; sp.marks = [];
          world.pow(sp.x, SPOT.Y, 40); world.award(150, sp.x, SPOT.Y + 30, 'spotter down!', b.owner === 'ally' ? BLUE : world.INK, true); world.sound.play('pop');
        }
        return true;
      },
      held: function (S) { return !S.cm.spot || S.cm.spot.hp > 0; },
      targets: function (S) { var sp = S.cm.spot; return sp && sp.hp > 0 ? [{ id: 'spotter', x: sp.x, y: SPOT.Y, rank: 330 }] : []; },
      draw: function (S, G) {
        var sp = S.cm.spot; if (!sp) return;
        var g = world.GROUND;
        sp.marks.forEach(function (q) {
          var f = 1 - q.t / SPOT.FUSE, s = 7 + 5 * f;
          G.save(); G.strokeStyle = world.RED; G.lineWidth = 2 + 2 * f; G.globalAlpha = 0.5 + 0.5 * f;
          G.beginPath(); G.moveTo(q.x - s, g - 4 - s); G.lineTo(q.x + s, g - 4 + s); G.moveTo(q.x + s, g - 4 - s); G.lineTo(q.x - s, g - 4 + s); G.stroke(); G.restore();
        });
        if (sp.hp <= 0) return;
        var y = SPOT.Y + Math.sin(S.t * 1.2) * 2;
        G.save(); G.strokeStyle = world.INK; G.lineWidth = 1.2; G.beginPath(); G.moveTo(sp.x, y + SPOT.RY + 14); G.lineTo(sp.x, g); G.stroke();
        G.translate(sp.x, y);
        G.beginPath(); G.ellipse(0, 0, SPOT.RX, SPOT.RY, 0, 0, Math.PI * 2); G.fillStyle = sp.flash > 0 ? world.PAPER : 'rgba(200,67,58,0.3)'; G.fill(); G.lineWidth = 2.2; G.strokeStyle = world.RED; G.stroke();
        // The basket and the spotter with his binoculars.
        G.beginPath(); G.moveTo(-8, SPOT.RY); G.lineTo(-5, SPOT.RY + 8); G.moveTo(8, SPOT.RY); G.lineTo(5, SPOT.RY + 8); G.strokeStyle = world.INK; G.lineWidth = 1.2; G.stroke();
        G.fillStyle = world.PAPER; G.fillRect(-7, SPOT.RY + 8, 14, 7); G.strokeRect(-7, SPOT.RY + 8, 14, 7);
        G.beginPath(); G.arc(0, SPOT.RY + 3, 3, 0, Math.PI * 2); G.strokeStyle = world.RED; G.lineWidth = 1.8; G.stroke();
        G.restore();
        bar(G, sp.x - 30, SPOT.Y - 30, 60, sp.hp / SPOT.HP, world.RED);
      }
    },
    bigone: {
      tick: function (S, dt) {
        var c = S.cm, k = c.count, t = waveTime(S, dt);
        if (!c.big && t >= BIG.AT && S.waveState === 'active') {
          // In over the far side from the mat, already most of the way onto the page.
          var m = world.activeTramps()[0], from = m.x1 < 200 ? world.W - BIG.R + 16 : BIG.R - 16;
          c.big = { x: from, from: from, hp: BIG.HP, flash: 0, gone: false };
          world.addText('the big one!', 200, 120, world.RED, 30, 'alert'); world.sound.play('horn');
        }
        var b = c.big; if (!b || b.gone) return;
        b.flash = Math.max(0, b.flash - dt);
        if (b.hp > 0) {
          var dir = b.from < world.BK.x ? 1 : -1;
          b.x += dir * Math.abs(world.BK.x - b.from) / BIG.TIME * dt;
          if ((world.BK.x - b.x) * dir <= 0) {
            b.gone = true; k.bigLanded = 1;
            world.pow(world.BK.x, world.BK.top, 70); world.sound.play('boom'); S.shake = Math.max(S.shake || 0, 0.8);
            world.hurtWall(S.mods.maxHP * 0.5, 'balloon');
            world.addText('it dropped its bomb!', 200, 400, world.RED, 26, 'alert');
          }
        }
      },
      shot: function (S, bl) {
        var b = S.cm.big;
        if (!b || b.gone || b.hp <= 0 || !ellipseHit(bl, b.x, BIG.Y, BIG.R, BIG.R * 1.12)) return false;
        b.hp -= bulletDmg(bl); b.flash = 0.12; bl.dead = true;
        world.burst(bl.x, bl.y, 3, world.RED, 90);
        if (b.hp <= 0) {
          b.gone = true; S.cm.count.big = 1;
          world.pow(b.x, BIG.Y, 80); world.sound.play('pop'); S.shake = Math.max(S.shake || 0, 0.5);
          world.award(300, b.x, BIG.Y + 40, 'the big one is down!', bl.owner === 'ally' ? BLUE : world.INK, true);
        }
        return true;
      },
      held: function (S) { return !S.cm.big || !S.cm.big.gone; },
      targets: function (S) { var b = S.cm.big; return b && !b.gone && b.x > 20 && b.x < world.W - 20 ? [{ id: 'big', x: b.x, y: BIG.Y, rank: 345 }] : []; },
      draw: function (S, G) {
        var b = S.cm.big; if (!b || b.gone) return;
        var x = b.x, y = BIG.Y + Math.sin(S.t * 0.9) * 3, r = BIG.R;
        G.save();
        G.beginPath(); G.moveTo(x - 8, y + r); G.lineTo(x - 14, y + r + 26); G.moveTo(x + 8, y + r); G.lineTo(x + 14, y + r + 26); G.strokeStyle = world.INK; G.lineWidth = 1.6; G.stroke();
        G.beginPath(); G.ellipse(x, y + r + 40, 13, 18, 0, 0, Math.PI * 2); G.fillStyle = world.INK; G.fill();
        G.beginPath(); G.ellipse(x, y, r, r * 1.12, 0, 0, Math.PI * 2); G.fillStyle = world.PAPER; G.fill(); G.fillStyle = b.flash > 0 ? 'rgba(200,67,58,0.15)' : 'rgba(200,67,58,0.35)'; G.fill();
        G.strokeStyle = world.RED; G.lineWidth = 3; G.stroke();
        G.beginPath(); G.arc(x - r * 0.35, y - r * 0.45, r * 0.25, Math.PI * 1.1, Math.PI * 1.6); G.strokeStyle = world.PAPER; G.lineWidth = 3; G.stroke();
        G.restore();
        bar(G, 120, 92, 160, b.hp / BIG.HP, world.RED);
      }
    },
    bay: {
      tick: function (S, dt) {
        var c = S.cm, z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; });
        c.bayOpen = !!(z && !z.leaving && z.x > 40 && z.x < world.W - 40 && z.bombT < BAY.OPEN);
        if (c.bayOpen && !c.wasOpen) world.addText('bay doors open!', z.x, z.y + z.hh + 34, world.RED, 20, 'minor');
        c.wasOpen = c.bayOpen;
      },
      shot: function (S, b) {
        var c = S.cm; if (!c.bayOpen || b.owner !== 'player') return false;
        var z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; });
        if (!z || Math.hypot(b.x - (z.x + z.face * 34), b.y - (z.y + z.hh - 2)) > BAY.R) return false;
        b.dead = true; c.count.bay++; c.bayOpen = false;
        z.bombT = Math.max(z.bombT, 6);
        world.award(60, z.x, z.y + z.hh + 40, 'right in the bay! ' + Math.min(c.count.bay, BAY.N) + '/' + BAY.N, world.INK, true);
        world.pow(z.x + z.face * 34, z.y + z.hh, 26); world.sound.play('boom');
        return true;
      },
      held: function (S) { return S.cm.count.bay < BAY.N && !S.cm.count.zeps; },
      targets: function (S) {
        var z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; });
        return S.cm.bayOpen && z ? [{ id: 'bay' + Math.round(z.bombT * 10), x: z.x + z.face * 34, y: z.y + z.hh - 2, vx: z.face * z.speed, rank: 480 }] : [];
      },
      draw: function (S, G) {
        if (!S.cm.bayOpen) return;
        var z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; }); if (!z) return;
        var x = z.x + z.face * 34, y = z.y + z.hh - 2;
        G.save(); G.fillStyle = 'rgba(242,194,48,0.85)'; G.fillRect(x - 14, y - 5, 28, 10); G.strokeStyle = world.RED; G.lineWidth = 2; G.strokeRect(x - 14, y - 5, 28, 10);
        ring(G, x, y, 24, world.RED); G.restore();
      }
    },
    recon: {
      tick: function (S, dt) {
        var c = S.cm, k = c.count, t = waveTime(S, dt);
        if (!c.recon) c.recon = { hp: RECON.HP, x: 0, dir: 1, flying: false, next: RECON.AT, passes: 0, flash: 0 };
        var r = c.recon;
        r.flash = Math.max(0, r.flash - dt);
        if (r.hp <= 0) return;
        if (!r.flying && r.passes < RECON.PASSES && t >= r.next && S.waveState === 'active') {
          r.flying = true; r.dir = r.passes % 2 ? -1 : 1; r.x = r.dir > 0 ? -50 : world.W + 50;
          world.addText('recon plane coming through!', 200, RECON.Y - 34, BLUE, 20, 'story'); world.sound.play('fighter');
        }
        if (!r.flying) return;
        r.x += r.dir * RECON.SPEED * dt;
        var chip = 0;
        S.planes.forEach(function (p) { if (p.state === 'fly' && p.kind !== 'zeppelin' && Math.hypot(p.x - r.x, p.y - RECON.Y) < RECON.NEAR) chip += RECON.CHIP; });
        var z = S.planes.find(function (p) { return p.kind === 'zeppelin' && p.state === 'fly'; });
        if (z && Math.abs(z.x - r.x) < RECON.GUNS) chip += RECON.GUN_CHIP;
        if (chip) { r.hp -= chip * dt; if (Math.random() < dt * 6) world.puff(r.x - r.dir * 20, RECON.Y, 3, 0.6); }
        if (r.hp <= 0) { r.flying = false; k.reconLost = 1; world.pow(r.x, RECON.Y, 40); world.addText('recon plane down!', r.x, RECON.Y + 30, world.RED, 24, 'alert'); world.sound.play('crash'); return; }
        if (r.x < -60 || r.x > world.W + 60) { r.flying = false; r.passes++; k.recon = r.passes; r.next = t + RECON.GAP; world.addText('photos ' + r.passes + '/' + RECON.PASSES + '!', 200, RECON.Y + 20, BLUE, 22, 'story'); }
      },
      shot: function (S, b) {
        var r = S.cm.recon;
        if (!r || !r.flying || b.owner !== 'player' || Math.abs(b.x - r.x) > RECON.HW || Math.abs(b.y - RECON.Y) > RECON.HH) return false;
        b.dead = true; r.hp -= RECON.FRIENDLY; r.flash = 0.2;
        world.addText('friendly fire!', r.x, RECON.Y + 34, world.RED, 22, 'alert'); world.sound.play('wrong');
        return true;
      },
      held: function (S) { var r = S.cm.recon; return !r || (r.hp > 0 && r.passes < RECON.PASSES); },
      friends: function (S) { var r = S.cm.recon; return r && r.flying ? [{ x: r.x, y: RECON.Y, vx: r.dir * RECON.SPEED, hw: RECON.HW, hh: RECON.HH }] : []; },
      draw: function (S, G) {
        var r = S.cm.recon; if (!r || !r.flying) return;
        G.save(); G.translate(r.x, RECON.Y); G.scale(r.dir, 1);
        G.beginPath(); G.moveTo(-30, 2); G.lineTo(22, -4); G.lineTo(32, 2); G.lineTo(-26, 10); G.closePath();
        G.fillStyle = r.flash > 0 ? 'rgba(200,67,58,0.3)' : world.PAPER; G.fill(); G.strokeStyle = BLUE; G.lineWidth = 2.2; G.stroke();
        G.beginPath(); G.moveTo(-6, 4); G.lineTo(-14, 16); G.lineTo(4, 16); G.closePath(); G.fillStyle = BLUE; G.fill();
        G.beginPath(); G.arc(8, 6, 4, 0, Math.PI * 2); G.fillStyle = world.PAPER; G.fill(); G.strokeStyle = world.INK; G.lineWidth = 1.5; G.stroke();
        G.restore();
        bar(G, r.x - 30, RECON.Y - 26, 60, r.hp / RECON.HP, '#2e8b4a');
      }
    },
    stand: {
      tick: function (S, dt) {
        var c = S.cm, k = c.count;
        if (c.standCap == null) { c.standCap = S.wallHP = Math.round(S.mods.maxHP * STAND.WALL); }
        // No repairs: the wall never goes back up.
        if (S.wallHP > c.standCap) S.wallHP = c.standCap; else c.standCap = S.wallHP;
        if (S.waveState === 'active' && !c.cleared) k.stand = Math.min(STAND.TIME, (k.stand || 0) + dt);
      },
      held: function (S) { return (S.cm.count.stand || 0) < STAND.TIME; },
      draw: function (S, G) {
        var left = Math.max(0, Math.ceil(STAND.TIME - (S.cm.count.stand || 0)));
        if (S.cm.cleared) return;
        G.save(); G.globalAlpha = 0.55; G.fillStyle = world.RED; G.font = '700 54px "Cabin Sketch", cursive'; G.textAlign = 'center';
        G.fillText('0:' + (left < 10 ? '0' : '') + left, 200, 210); G.restore();
      }
    }
  });

  // Campaign's zeppelins (ZEPS): each comes with ZEPS.HP of Arcade's health (BOSS_HP in a boss mission), for a squad
  // without Arcade's run of upgrades. One still up when the enemy surrenders leaves (`leaving`, units.js: for the
  // nearer edge).
  var ZEPS = { HP: 0.6, BOSS_HP: 0.6 };
  function tickZeps(S, dt) {
    if (!S.cm) return;
    var boss = MISSIONS[S.cm.mission].goal.kind === 'boss';
    S.planes.forEach(function (p) {
      if (p.kind !== 'zeppelin' || p.state !== 'fly') return;
      if (!p.cmHp) { p.cmHp = true; p.maxHp = Math.max(1, Math.round(p.maxHp * (boss ? ZEPS.BOSS_HP : ZEPS.HP))); p.hp = Math.min(p.hp, p.maxHp); }
      if (!p.leaving && S.cm.cleared) p.leaving = p.x < world.W / 2 ? -1 : 1;
    });
  }

  // ---------- barrage balloons (Balloon Season) ----------
  // A wave's `c.barrage` blimps rise on cables from the ground to their places as it starts and float off when it
  // clears. A cable stops the turret's bullets ("ting!"; flak, rockets and the squad's fire pass), so lanes of the sky
  // are shut until a balloon is popped: HP hits, then its cable falls. Their places come from the mission and the wave, not a random stream, so
  // the waves play the same with or without them. They live in S.barrage, so a wave save keeps them.
  var BARRAGE = { HP: 3, HW: 21, HH: 10, RISE: 2.2, TAGS: 60, X: [70, 330, 125, 275, 98, 302], Y: [168, 196, 150, 214, 182, 160] };
  function barrageFor(S) {
    var c = S.spawn && S.spawn.cfg, n = c && c.barrage || 0, out = [];
    for (var i = 0; i < n; i++) {
      var k = (S.cm.wi * 2 + S.cm.m + i) % BARRAGE.X.length;
      out.push({ x: BARRAGE.X[k], y: BARRAGE.Y[(k + S.cm.wi) % BARRAGE.Y.length], hp: BARRAGE.HP, rise: 0, flash: 0, state: 'fly', drop: 0, bob: k });
    }
    return out;
  }
  function tickBarrage(S, dt) {
    if (!S.cm) return;
    if (S.waveState === 'active' && S.cm.barrageWave !== S.cm.wi) { S.cm.barrageWave = S.cm.wi; S.barrage = barrageFor(S); }
    var list = S.barrage || [];
    list.forEach(function (b) {
      b.flash = Math.max(0, b.flash - dt); b.cy = barrageY(b);
      if (b.state === 'fly') { b.rise = Math.min(1, b.rise + dt / BARRAGE.RISE); if (S.waveState !== 'active') b.state = 'away'; }
      else if (b.state === 'away') { b.y -= 60 * dt; if (b.y < 40) b.gone = true; }
      else { b.drop += dt; if (b.drop > 1.2) b.gone = true; }
    });
    S.barrage = list.filter(function (b) { return !b.gone; });
  }
  // Where a balloon is now: rising from the ground to its place.
  function barrageY(b) { return world.GROUND - (world.GROUND - b.y) * b.rise; }
  function shotBarrage(S, b) {
    var list = S.barrage, i;
    if (!list || !list.length) return false;
    var lx = b.cx, plain = b.kind !== 'rocket' && !b.flak && b.owner === 'player';
    b.cx = b.x;
    for (i = 0; i < list.length; i++) {
      var q = list[i], y = barrageY(q);
      if (q.state !== 'fly') continue;
      if (Math.abs(b.x - q.x) < BARRAGE.HW && Math.abs(b.y - y) < BARRAGE.HH) { hurtBarrage(S, q, b.owner); if (b.kind !== 'rocket') b.dead = true; return b.dead; }
      // The cable, from under the balloon to the ground: a bullet that crossed it since its last step.
      if (plain && lx != null && b.y > y + BARRAGE.HH && (lx - q.x) * (b.x - q.x) <= 0 && lx !== b.x) {
        b.dead = true;
        world.addText('ting!', q.x, b.y - 8, world.INK2, 14, 'minor', TING);
        world.burst(q.x, b.y, 2, world.INK2, 60); world.sound.play('tink');
        return true;
      }
    }
    return false;
  }
  var TING = { key: 'ting', pts: 0, fmt: function () { return 'ting!'; } };
  function hurtBarrage(S, q, owner) {
    q.hp--; q.flash = 0.15;
    world.burst(q.x, barrageY(q), 3, world.INK, 90);
    if (q.hp > 0) { world.sound.play('clank'); return; }
    q.state = 'cut';
    S.cm.count.barrage++;
    world.emit('barrage_down', { by: owner === 'ally' ? 'crew' : 'player' });
    world.pow(q.x, barrageY(q), 26);
    world.award(BARRAGE.TAGS, q.x, barrageY(q) + 24, 'balloon popped!', owner === 'ally' ? BLUE : world.INK, true);
    world.sound.play('pop');
  }
  function drawBarrage(S, G) {
    (S.barrage || []).forEach(function (q) {
      var y = barrageY(q) + Math.sin(S.t * 1.3 + q.bob) * 2, gy = world.GROUND;
      G.save();
      G.strokeStyle = world.INK; G.lineWidth = 1.2;
      if (q.state === 'cut') {
        // The cable falls slack and the envelope is gone.
        var f = Math.min(1, q.drop / 0.6), top = y + BARRAGE.HH + (gy - y) * f;
        G.globalAlpha = 1 - Math.max(0, q.drop - 0.6) / 0.6;
        G.beginPath(); G.moveTo(q.x, gy); G.quadraticCurveTo(q.x + 14 * f, (top + gy) / 2, q.x + 6 * f, top); G.stroke();
        G.restore(); return;
      }
      G.beginPath(); G.moveTo(q.x, y + BARRAGE.HH); G.lineTo(q.x, gy); G.stroke();
      G.translate(q.x, y);
      // The blimp: envelope, three fins at the back, a little highlight. It faces into the wind.
      if (S.wind < 0) G.scale(-1, 1);
      G.beginPath(); G.moveTo(-15, -3); G.lineTo(-23, -10); G.lineTo(-20, 0); G.lineTo(-23, 10); G.lineTo(-15, 3); G.closePath();
      G.fillStyle = world.PAPER; G.fill(); G.lineWidth = 1.6; G.stroke();
      G.beginPath(); G.ellipse(0, 0, BARRAGE.HW - 2, BARRAGE.HH - 1, 0, 0, Math.PI * 2);
      G.fillStyle = q.flash > 0 ? world.PAPER : '#d6d2c8'; G.fill(); G.lineWidth = 2; G.stroke();
      G.beginPath(); G.moveTo(-8, -5); G.quadraticCurveTo(0, -8, 8, -5); G.strokeStyle = world.PAPER; G.lineWidth = 1.6; G.stroke();
      // Hits taken, as patches.
      G.fillStyle = world.INK;
      for (var h = 0; h < BARRAGE.HP - q.hp; h++) G.fillRect(-6 + h * 5, 1, 3, 3);
      G.restore();
    });
  }
  function drawWeather(S, G) {
    var w = S.cm && S.cm.weather;
    if (!w || w === 'clear' || w === 'dusk') return;
    G.save();
    if (w === 'fog') {
      var f = G.createLinearGradient(0, 96, 0, 290);
      f.addColorStop(0, 'rgba(236,236,232,0.97)'); f.addColorStop(0.55, 'rgba(236,236,232,0.88)'); f.addColorStop(1, 'rgba(236,236,232,0)');
      G.fillStyle = f; G.fillRect(0, 96, 400, 194);
    } else if (w === 'rain') {
      G.strokeStyle = 'rgba(47,111,220,0.28)'; G.lineWidth = 1.2; G.beginPath();
      for (var i = 0; i < 46; i++) {
        var x = (i * 89 + S.t * 40) % 420 - 10, y = 100 + ((i * 137 + S.t * 420) % 500);
        G.moveTo(x, y); G.lineTo(x - 4, y + 14);
      }
      G.stroke();
    } else if (w === 'wind') {
      var dir = S.wind > 0 ? 1 : -1;
      G.strokeStyle = 'rgba(93,90,85,0.35)'; G.lineWidth = 1.6; G.beginPath();
      for (var k = 0; k < 7; k++) {
        var p = ((k * 61 + S.t * 70) % 460) - 30, wx = dir > 0 ? p : 400 - p, wy = 150 + k * 52;
        G.moveTo(wx, wy); G.quadraticCurveTo(wx + dir * 14, wy - 6, wx + dir * 28, wy);
      }
      G.stroke();
    }
    G.restore();
  }
  function hirePrice(type) { return HIRE[type] + 15 * tour.hired; }
  function hire(type) {
    var t = tour, cost = hirePrice(type);
    if (!HIRE[type] || t.squad.length >= BARRACKS || t.bank < cost) return false;
    t.bank -= cost; t.hired++;
    t.squad.push({ id: t.nextId++, type: type, stripes: 0, kills: 0 });
    writeTour();
    return true;
  }

  // ---------- play stats ----------
  // Each mission is a run of its own, tagged campaign, with the operation, the mission, the attempt and how it ended:
  // won, lost, or retried (a loss whose Retry was pressed). No board, and nothing from the device (no tour code).
  function report(result, why) {
    var S = cur, c = S && S.cm;
    if (!c) return {};
    var st = { campaign: true, operation: c.op, mission: c.mission, attempt: c.attempt + 1, wave: Math.max(1, c.wi + 1),
      kills: S.stats.kills, captured: S.stats.captured, planes: S.stats.planes, wall_damage: Math.round(S.stats.wallDamage), shots: S.stats.shots,
      crew: S.recruits.filter(function (r) { return !r.dead; }).length + (S.bed ? 1 : 0), fallen: tour ? tour.fallen.length : 0,
      tags: S.players[0].tags, dummies: c.count.dummies || 0, barrage: c.count.barrage || 0, gun: c.gun || 'standard' };
    if (c.weather) st.weather = c.weather;
    if (c.intel) st.intel = c.intel;
    if (typeof result === 'string') st.result = result;
    var cause = why || c.cause;
    if (cause) st.cause = cause;
    return { score: S.score, time_ms: Math.round(S.played * 1000), won: result === 'won', input: S.input, stats: st };
  }
  function endStats(won, result, why) {
    if (!statsRun) return;
    PlayStats.end(statsRun, report(result, why));
    // A won run is done with; a lost one may still become "retried".
    if (won) statsRun = null;
  }

  // ---------- coming back ----------
  // Continue: the tour where it stands. In a mission, the wave save if it's still good, else the mission's start.
  function resume() {
    var t = tour;
    if (t.at === 'mission') {
      var w = goodWaveSave();
      if (w && game.restoreRun(w.snap)) {
        cur = world.S;
        statsRun = window.PlayStats ? PlayStats.start('stick-army', { progress: report }) : null;
        SCREENS.hide(); hideRestart(true);
        return;
      }
      dropWaveSave();
      startMission();
      return;
    }
    showWhere();
  }
  function showWhere() {
    var t = tour, at = t.at;
    if (at === 'between') SCREENS.between();
    else if (at === 'lost') SCREENS.lost();
    else if (at === 'debrief') SCREENS.debrief();
    else if (at === 'barracks') SCREENS.barracks();
    else if (at === 'end') SCREENS.end();
    else if (at === 'briefing') SCREENS.briefing();
    else SCREENS.map();
  }
  // The title's button: start a tour, or continue the saved one.
  var news = null;
  function openCampaign() {
    // A release since this device last opened Campaign: the map says what's new, once.
    var seen = load(SEEN_KEY, 0);
    news = seen && seen < RELEASE ? 'Operation ' + OPS.filter(function (o) { return o.released; }).slice(-1)[0].name + ' is live' : null;
    save(SEEN_KEY, RELEASE);
    world.sound.init();
    tour = savedTour();
    if (!tour) { tour = freshTour(codeText(newCodeValue())); writeTour(); }
    resume();
  }
  // Ending a tour: its save and its wave save are gone, so the title offers a new Campaign. Gold stars stay.
  function endTour() {
    dropWaveSave();
    try { localStorage.removeItem(TOUR_KEY); } catch (e) { /* ignore */ }
    tour = null;
  }
  function newTour(code) {
    dropWaveSave();
    tour = freshTour(code || codeText(newCodeValue()));
    writeTour();
    return tour;
  }
  // A pasted save link or code continues that tour; a six-character tour code starts that tour fresh.
  function loadCode(text) {
    var t = readLink(text);
    if (t) { dropWaveSave(); tour = t; writeTour(); return 'tour'; }
    if (codeValue(text) >= 0) { newTour(cleanCode(text).toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1')); return 'code'; }
    return null;
  }
  // Leaving to the title from a mission's pause card: the run is quit, and the tour waits at the mission.
  document.getElementById('pauseQuitBtn').addEventListener('click', function () {
    if (statsRun) { PlayStats.quit(statsRun); statsRun = null; }
    hideRestart(false);
  }, true);
  // The tour's place on the page, while a Campaign screen is up: nothing runs underneath.
  function standBy() { var S = world.S; if (S.mode === 'title' || S.mode === 'play') S.mode = 'between'; }

  // A save link opened on this device (#tour=...): the token is taken out of the address at once, keeping any others
  // (#seed=, #tune), so a reload doesn't load it again and nothing else in the game ever sees it. It isn't a practice
  // run: nothing about it fixes a seed or touches the boards.
  // Campaign is hidden until it's unlocked on the device: #campaign (or a save link) shows its button on the title
  // from then on, and #campaign=off hides it again (UNLOCK_KEY). Like #tour=, the token leaves the address at once.
  var pending = null, UNLOCK_KEY = 'stickarmy.campaign.on';
  function takeLink() {
    var tokens = game.hashTokens(), hit = tokens.find(function (x) { return /^tour=/.test(x); }), ours = /^(tour=|campaign(=off)?$)/;
    if (tokens.indexOf('campaign') >= 0 || hit) save(UNLOCK_KEY, true);
    if (tokens.indexOf('campaign=off') >= 0) { try { localStorage.removeItem(UNLOCK_KEY); } catch (e) { /* ignore */ } }
    if (!tokens.some(function (x) { return ours.test(x); })) return null;
    if (hit) pending = hit.slice(5);
    var rest = tokens.filter(function (x) { return x && !ours.test(x); }).join('&');
    try { history.replaceState(null, '', location.pathname + location.search + (rest ? '#' + rest : '')); } catch (e) { /* ignore */ }
    return pending;
  }
  takeLink();

  var api = {
    OPS: OPS, MISSIONS: MISSIONS, ROLES: ROLES, ROLE_NAME: ROLE_NAME, TRAIT_TEXT: TRAIT_TEXT, BARRACKS: BARRACKS, RELEASE: RELEASE,
    tour: function () { return tour; }, op: op, nextOp: nextOp, TREE: TREE, SHELF: SHELF, treeNext: treeNext, takeStep: takeStep, takeBonus: takeBonus,
    onShelf: onShelf, hireable: hireable, autoTree: autoTree, pieceView: pieceView, showCode: showCode, rankName: rankName, deployOrder: deployOrder, progress: progress,
    open: openCampaign, resume: resume, startMission: startMission, retry: retry, leaveBarracks: leaveBarracks,
    hire: hire, hirePrice: hirePrice, newTour: newTour, endTour: endTour, loadCode: loadCode, readLink: readLink, linkFor: linkFor, linkCode: linkCode,
    savedTour: savedTour, setTour: function (t) { tour = t; writeTour(); }, write: writeTour, standBy: standBy, showWhere: showWhere,
    seen: function () { return load(SEEN_KEY, 0) >= RELEASE; }, unlocked: function () { return !!load(UNLOCK_KEY, false); }, stars: deviceStars, hideRestart: hideRestart,
    pending: function () { var p = pending; pending = null; return p; }, takeLink: takeLink, news: function () { var n = news; news = null; return n; },
    WEATHER: WEATHER, INTEL: INTEL, weatherFor: weatherFor, intelFor: intelFor, deployed: deployed, pauseLine: pauseLine,
    // For the harness and the bots.
    codeText: codeText, codeValue: codeValue, missionsFor: missionsFor, freshTour: freshTour, readTour: readTour, nameAll: nameAll,
    build: build, goodWaveSave: goodWaveSave, report: report, bonusFor: bonusFor, BARRAGE: BARRAGE, GUNS: GUNS, GUN_TEXT: GUN_TEXT, armory: armory, needsDeploy: needsDeploy, keys: { tour: TOUR_KEY, wave: WAVE_KEY, stars: STARS_KEY, seen: SEEN_KEY, unlock: UNLOCK_KEY }
  };
  var SCREENS = window.StickArmyCampaignScreens ? StickArmyCampaignScreens(world, game, api) : { hide: function () {}, map: function () {}, briefing: function () {},
    between: function () {}, lost: function () {}, debrief: function () {}, barracks: function () {}, end: function () {} };
  api.screens = SCREENS;
  world.campaign = api;
  return api;
};
