// Stick Army: Campaign, the second way to play (docs/games/stick-army/campaign.md). A tour of operations with one
// squad you keep and can lose; each operation is a few short missions, each with its own goal. Round 1 has the frame
// and the first operation, Boot Camp. This file is the mode: the operations and missions, the goals, the tour and its
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
  // Each has its deploy slots, its gold star, and its missions: `fixed` always played first, then `draw` more from
  // `pool`, picked by the tour code.
  var OPS = [
    { id: 'boot-camp', name: 'Boot Camp', slots: 3, star: 'Lose no one.', released: true, fixed: ['first-contact'], pool: ['fill-the-ranks', 'hold-the-line', 'target-practice', 'bomb-alley'], draw: 2 },
    { id: 'recruitment-drive', name: 'Recruitment Drive' },
    { id: 'balloon-season', name: 'Balloon Season' },
    { id: 'first-zeppelin', name: 'First Zeppelin' },
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
  var RELEASE = 1;   // the release this is: a newer one puts the "new" tag back on the title's Campaign button

  // ---------- missions ----------
  // A mission plays as Arcade waves (`as`: one entry a wave, which sets the wave's recipe, prices and rewards), with
  // its recipe edited from Arcade's (waveCfg), and a goal. Goals are data, one of:
  //   survive        hold out to the end of the last wave
  //   catch n        catch n soldiers (a goal met ends the mission: the enemy surrenders)
  //   wall above k   keep the wall above k of its maximum to the end; below it, the mission is lost
  //   down n, away m down n planes before m get across
  //   bombs n        shoot n bombs out of the air
  // A goal with a count that isn't met by the end of the last wave loses the mission. Ids are kept for good, since
  // saves name missions by them.
  var MISSIONS = {
    'first-contact': { name: 'First contact', goal: { kind: 'survive' }, as: [1, 2], text: 'Survive two waves of planes.',
      recipe: function (c, n) { c.bombers = 0; c.planes = n === 1 ? 10 : 13; } },
    'fill-the-ranks': { name: 'Fill the ranks', goal: { kind: 'catch', n: 4 }, as: [2], text: 'Catch 4 before the planes stop coming.',
      recipe: function (c) { c.bombers = 0; c.planes = 26; c.maxDrops = 3; c.interval = 1.6; c.fall *= 0.75; } },
    'hold-the-line': { name: 'Hold the line', goal: { kind: 'wall', above: 0.5 }, as: [2, 3], text: 'Bombers only. Keep the wall above half.',
      recipe: function (c, n) { c.planes = 0; c.bombers = n === 2 ? 5 : 6; c.bombCount = 4; c.interval = 2.4; } },
    'target-practice': { name: 'Target practice', goal: { kind: 'down', n: 12, away: 5 }, as: [3], text: 'Down 12 planes before 5 get across.',
      recipe: function (c) { c.planes = 24; c.bombers = 0; c.maxDrops = 2; c.interval = 1.9; c.speed *= 0.72; c.low = 0; } },
    'bomb-alley': { name: 'Bomb alley', goal: { kind: 'bombs', n: 8 }, as: [3], text: 'Shoot 8 bombs out of the air before they land.',
      recipe: function (c) { c.planes = 2; c.bombers = 10; c.bombCount = 3; c.interval = 2.4; c.low = 0; } }
  };
  // What the HUD shows under the wave, and the short goal for cards.
  function progress(M, k) {
    var g = M.goal;
    if (g.kind === 'catch') return { sub: 'caught ' + Math.min(k.caught, g.n) + '/' + g.n, done: k.caught >= g.n };
    if (g.kind === 'down') return { sub: 'downed ' + Math.min(k.planes, g.n) + '/' + g.n + ' · across ' + k.away + '/' + g.away, done: k.planes >= g.n };
    if (g.kind === 'bombs') return { sub: 'bombs shot ' + Math.min(k.bombs, g.n) + '/' + g.n, done: k.bombs >= g.n };
    if (g.kind === 'wall') return { sub: 'keep the wall above half', mark: g.above };
    return { sub: '' };
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
  // The missions a tour plays in an operation: its fixed ones, then `draw` from its pool, shuffled by the tour code.
  function missionsFor(t, op) {
    var o = OPS[op], pool = (o.pool || []).slice(), rnd = world.mulberry(game.mix(tourSeed(t), hashStr(o.id)));
    for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
    return (o.fixed || []).concat(pool.slice(0, o.draw || 0));
  }
  // A mission's run seed: the same every attempt, so Retry plays the same waves.
  function missionSeed(t) { return game.mix(tourSeed(t), hashStr(OPS[t.op].id + '/' + t.missions[t.m])); }

  // ---------- soldiers ----------
  // Roles by index (saves and links), the five Arcade has.
  var ROLES = ['rifle', 'engineer', 'bazooka', 'sniper', 'medic'];
  var ROLE_NAME = { rifle: 'rifleman', engineer: 'engineer', bazooka: 'bazooka', sniper: 'sniper', medic: 'medic' };
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

  // ---------- rewards ----------
  // After an operation, pick one of three: a veteran recruit (a role with a stripe), a medal (+1 stripe for the top
  // gun), or a lasting supply for the rest of the tour. Lasting supplies are shop stacks every operation starts with.
  var LASTING = [
    { id: 'helmets', item: 'helmet', name: 'Helmets for the tour', text: 'Every soldier +1 health, every operation.' },
    { id: 'sandbags', item: 'sandbags', name: 'Sandbags for the tour', text: '+25 wall health, every operation.' },
    { id: 'fins', item: 'cool', name: 'Cooling fins for the tour', text: 'The gun heats 20% less, every operation.' }
  ];
  function offersFor(t) {
    var rnd = world.mulberry(game.mix(tourSeed(t), 0x5eaf00 + t.op)), out = [];
    var supplies = LASTING.filter(function (l) { return t.lasting.indexOf(l.id) < 0; });
    for (var i = supplies.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), x = supplies[i]; supplies[i] = supplies[j]; supplies[j] = x; }
    var role = ROLES[Math.floor(rnd() * ROLES.length)], top = t.squad.slice().sort(function (a, b) { return b.kills - a.kills || a.id - b.id; })[0];
    if (t.squad.length < BARRACKS) out.push({ kind: 'veteran', type: role, name: 'Veteran ' + ROLE_NAME[role], text: 'A ' + ROLE_NAME[role] + ' with one stripe joins.' });
    if (top && top.stripes < MAX_STRIPES) out.push({ kind: 'medal', id: top.id, name: 'Medal', text: '+1 stripe for ' + rankName(top) + ', your top gun.' });
    while (out.length < 3 && supplies.length) { var l = supplies.shift(); out.push({ kind: 'supply', id: l.id, name: l.name, text: l.text }); }
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
  // resets to the lasting supplies with each new operation. `bank` is the tour's dog tags between missions.
  var TOUR_KEY = 'stickarmy.campaign.tour', WAVE_KEY = 'stickarmy.campaign.wave', STARS_KEY = 'stickarmy.campaign.stars', SEEN_KEY = 'stickarmy.campaign.seen';
  var VERSION = 1, tour = null;
  function freshTour(code) {
    var t = { v: VERSION, code: code, op: 0, m: 0, attempt: 0, at: 'map', missions: [], squad: [], fallen: [], gone: [], bank: 0, nextId: 1,
      opLosses: 0, hired: 0, lasting: [], gear: null, stars: {}, debrief: null, last: null };
    t.missions = missionsFor(t, 0);
    return t;
  }
  // A saved tour from any release, or null. Missions come from the code, so a tour always draws the same ones.
  function readTour(o) {
    if (!o || typeof o !== 'object' || o.v !== 1 || codeValue(o.code) < 0) return null;
    var t = freshTour(cleanCode(o.code).toUpperCase());
    ['op', 'm', 'attempt', 'bank', 'nextId', 'opLosses', 'hired'].forEach(function (k) { if (Number.isFinite(o[k])) t[k] = o[k]; });
    if (typeof o.at === 'string') t.at = o.at;
    ['squad', 'fallen', 'gone', 'lasting'].forEach(function (k) { if (Array.isArray(o[k])) t[k] = o[k].map(function (s) { return typeof s === 'object' ? Object.assign({}, s) : s; }); });
    t.gear = o.gear && typeof o.gear === 'object' ? JSON.parse(JSON.stringify(o.gear)) : null;
    t.stars = o.stars && typeof o.stars === 'object' ? Object.assign({}, o.stars) : {};
    t.debrief = o.debrief || null; t.last = o.last || null;
    if (!OPS[t.op] || !OPS[t.op].released) return null;
    t.missions = missionsFor(t, t.op);
    nameAll(t);
    return t;
  }
  function writeTour() { if (tour) save(TOUR_KEY, tour); }
  function savedTour() { return readTour(load(TOUR_KEY, null)); }
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
  // the place, stars, tags, the squad, the fallen, the rewards and the operation's gear), with a check byte so a
  // mistyped code is caught. Names and traits come from the code. Lists below are append-only, like the versions.
  var KIT_IDS = ['fire', 'cool', 'mat', 'aim', 'sandbags', 'wire', 'double', 'trench', 'helmet', 'tramp', 'spread', 'flak', 'rockets', 'pierce', 'mines', 'auto', 'hospital', 'flag', 'catcher'];
  function bytesOut() {
    var b = [];
    return { b: b, byte: function (n) { b.push(n & 255); }, num: function (n) { n = Math.max(0, Math.floor(n) || 0); do { var x = n % 128; n = Math.floor(n / 128); b.push(x | (n ? 128 : 0)); } while (n); } };
  }
  function check8(b) { var h = 0x5a; b.forEach(function (x) { h = (Math.imul(h ^ x, 31) + 7) & 255; }); return h; }
  function linkCode(t) {
    var o = bytesOut(), v = codeValue(t.code);
    o.byte(VERSION); o.byte(v >>> 24); o.byte(v >>> 16); o.byte(v >>> 8); o.byte(v);
    o.byte(t.op); o.byte(t.m);
    var stars = 0; OPS.forEach(function (op, i) { if (t.stars[op.id]) stars += Math.pow(2, i); }); o.num(stars);
    o.num(t.bank); o.num(t.nextId); o.num(t.opLosses); o.num(t.hired);
    o.byte(t.lasting.length); t.lasting.forEach(function (id) { o.byte(LASTING.findIndex(function (l) { return l.id === id; })); });
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
    if (byte() !== 1) return null;
    var v = ((byte() << 24) | (byte() << 16) | (byte() << 8) | byte()) >>> 0;
    var t = freshTour(codeText(v));
    t.op = byte(); t.m = byte();
    if (!OPS[t.op] || !OPS[t.op].released) return null;
    t.missions = missionsFor(t, t.op);
    var stars = num(); OPS.forEach(function (op, i) { if (Math.floor(stars / Math.pow(2, i)) % 2) t.stars[op.id] = true; });
    t.bank = num(); t.nextId = num(); t.opLosses = num(); t.hired = num();
    for (var n = byte(); n > 0; n--) { var l = LASTING[byte()]; if (l) t.lasting.push(l.id); }
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
    if (bad || p !== bytes.length - 1) return null;
    t.at = t.m >= t.missions.length ? 'end' : t.m > 0 ? 'between' : 'map';
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
    // The operation's gear, as shop stacks: the lasting supplies at its start, then whatever was bought since.
    applyGear(S, t.gear || lastingGear(t));
    S.mods.slots = o.slots; S.wallHP = S.mods.maxHP; S.flagUp = S.mods.flag ? 1 : 0;
    game.resizeMats();
    if (t.bank) game.gainTags(t.bank, true);
    var order = deployOrder(t.squad), field = order.slice(0, o.slots);
    field.forEach(function (s, i) {
      var r = world.makeRecruit(game.SLOT_ORDER[i], s.type, s.id);
      r.name = s.stripes > 0 ? s.name : undefined; r.trait = s.stripes > 0 ? s.trait : undefined; r.kills = s.kills;
      if (s.stripes > 0) SQUAD.train(r, s.stripes);
      if (r.trait === 'tough') r.hp += 1;
      S.recruits.push(r);
    });
    S.cm = { op: o.id, mission: t.missions[t.m], m: t.m, attempt: t.attempt, waves: M.as.slice(), wi: -1,
      count: { caught: 0, planes: 0, away: 0, bombs: 0 }, cleared: false, bench: order.slice(o.slots).map(function (s) { return s.id; }),
      caught: [], dead: {}, cause: null, start: t.squad.map(function (s) { return s.id; }) };
    S.mode = 'play'; S.hint = t.op === 0 && t.m === 0 && t.attempt === 0;
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
  function lastingGear(t) {
    var g = { stacks: {}, calls: { bomber: 0, fighter: 0 }, hired: 0 };
    t.lasting.forEach(function (id) { var l = LASTING.find(function (x) { return x.id === id; }); if (l) g.stacks[l.item] = (g.stacks[l.item] || 0) + 1; });
    return g;
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
    return g.kind === 'catch' ? k.caught >= g.n : g.kind === 'down' ? k.planes >= g.n : g.kind === 'bombs' ? k.bombs >= g.n : false;
  }
  function counted(g) { return g.kind === 'catch' || g.kind === 'down' || g.kind === 'bombs'; }
  function failed(S) {
    var g = MISSIONS[S.cm.mission].goal, k = S.cm.count;
    if (S.wallHP <= 0) return 'wall';
    if (S.cm.cleared) return null;
    if (g.kind === 'wall' && S.wallHP < S.mods.maxHP * g.above) return 'mark';
    if (g.kind === 'down' && k.away >= g.away) return 'away';
    return null;
  }
  var CAUSE = { wall: 'The wall came down.', mark: 'The wall dropped below half.', away: 'Five planes got across.', goal: 'The planes stopped coming before the goal was met.' };
  function lastWave(S) { return S.cm.wi >= S.cm.waves.length - 1; }

  // ---------- Campaign's entry in MODES ----------
  world.MODES.campaign = {
    wave: function (n) { var c = game.waveCfg(n), S = world.S; MISSIONS[S.cm.mission].recipe(c, n); return c; },
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
      S.banner = { s: 'mission failed', sub: why === 'mark' ? 'the wall is below half' : 'they got across', t: 0, dur: 1.6 };
      world.sound.play('over');
    },
    over: function () { missionLost(world.S.cm.cause || 'wall'); },
    cleared: function () { var S = world.S; if (S.cm.cleared || !counted(MISSIONS[S.cm.mission].goal) || !met(S)) return false; S.cm.cleared = true; return true; },
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
      var S = world.S, M = MISSIONS[S.cm.mission], p = progress(M, S.cm.count), of = S.cm.waves.length;
      return { wave: of > 1 ? 'wave ' + Math.max(1, S.cm.wi + 1) + '/' + of : 'mission ' + (S.cm.m + 1), sub: p.sub, done: p.done, mark: p.mark };
    },
    on: function (type, data) {
      var S = world.S, k = S.cm && S.cm.count;
      if (!k || S.mode === 'title') return;
      if (type === 'capture' && !data.full) k.caught++;
      else if (type === 'plane_down' && (data.kind === 'plane' || data.kind === 'bomber' || data.kind == null)) k.planes++;
      else if (type === 'plane_away' && (data.kind === 'plane' || data.kind === 'bomber') && !S.cm.cleared) k.away++;
      else if (type === 'bomb_intercepted') k.bombs++;
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
    sells: function (it) { return it.id !== 'slot' && it.id !== 'bootcamp' && it.id !== 'elite'; },
    room: function () { return bunksUsed(world.S) < BARRACKS; },
    promotes: false
  };
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
    t.nextId = Math.max(t.nextId, game.ids().next);
    var M = MISSIONS[t.missions[t.m]];
    t.last = { won: true, mission: M.name, caught: S.stats.captured, planes: S.stats.planes, time: Math.round(S.played), fresh: fresh,
      fell: t.fallen.filter(function (f) { return f.op === t.op && f.m === t.m; }).map(function (f) { return f.id; }) };
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
  // The operation's done: one stripe for everyone left, the gold star if no one was lost, and three rewards to pick
  // from. All decided now and saved, so a reload shows the same debrief.
  function finishOperation() {
    var t = tour, o = op(), star = t.opLosses === 0, promoted = [];
    t.squad.forEach(function (s) { if (s.stripes < MAX_STRIPES) { s.stripes++; promoted.push({ id: s.id, named: s.stripes === 1 }); } });
    nameAll(t);
    if (star) { t.stars[o.id] = true; addStar(o.id); }
    t.debrief = { op: t.op, star: star, promoted: promoted, offers: offersFor(t) };
    t.gear = null;
    t.at = 'debrief';
  }
  function takeReward(i) {
    var t = tour, d = t.debrief, r = d && d.offers[i];
    if (!r) return false;
    if (r.kind === 'veteran' && t.squad.length < BARRACKS) { t.squad.push({ id: t.nextId++, type: r.type, stripes: 1, kills: 0 }); }
    else if (r.kind === 'medal') { var s = t.squad.find(function (q) { return q.id === r.id; }); if (s) s.stripes = Math.min(MAX_STRIPES, s.stripes + 1); }
    else if (r.kind === 'supply' && t.lasting.indexOf(r.id) < 0) t.lasting.push(r.id);
    nameAll(t);
    t.taken = r; t.debrief = null; t.at = 'barracks';
    writeTour();
    return true;
  }
  // After the barracks: the next operation, or "To be continued" when it isn't out yet.
  function leaveBarracks() {
    var t = tour;
    if (t.at === 'barracks') {
      var next = t.op + 1;
      if (OPS[next] && OPS[next].released) { t.op = next; t.m = 0; t.attempt = 0; t.opLosses = 0; t.missions = missionsFor(t, next); t.at = 'map'; }
      else t.at = 'end';
      writeTour();
    }
    return t.at;
  }
  // Recruiting in the barracks, with the tour's tags: Arcade's hire prices before war prices, and each hire on the
  // tour raises the next by 15.
  var HIRE = { rifle: 35, engineer: 40, bazooka: 55, sniper: 50, medic: 55 };
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
      tags: S.players[0].tags };
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
  function openCampaign() {
    save(SEEN_KEY, RELEASE);
    world.sound.init();
    tour = savedTour();
    if (!tour) { tour = freshTour(codeText(newCodeValue())); writeTour(); }
    resume();
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
  var pending = null;
  function takeLink() {
    var tokens = game.hashTokens(), hit = tokens.find(function (x) { return /^tour=/.test(x); });
    if (!hit) return null;
    pending = hit.slice(5);
    var rest = tokens.filter(function (x) { return x && !/^tour=/.test(x); }).join('&');
    try { history.replaceState(null, '', location.pathname + location.search + (rest ? '#' + rest : '')); } catch (e) { /* ignore */ }
    return pending;
  }
  takeLink();

  var api = {
    OPS: OPS, MISSIONS: MISSIONS, ROLES: ROLES, ROLE_NAME: ROLE_NAME, TRAIT_TEXT: TRAIT_TEXT, BARRACKS: BARRACKS, LASTING: LASTING, RELEASE: RELEASE,
    tour: function () { return tour; }, op: op, showCode: showCode, rankName: rankName, deployOrder: deployOrder, progress: progress,
    open: openCampaign, resume: resume, startMission: startMission, retry: retry, takeReward: takeReward, leaveBarracks: leaveBarracks,
    hire: hire, hirePrice: hirePrice, newTour: newTour, loadCode: loadCode, readLink: readLink, linkFor: linkFor, linkCode: linkCode,
    savedTour: savedTour, setTour: function (t) { tour = t; writeTour(); }, write: writeTour, standBy: standBy, showWhere: showWhere,
    seen: function () { return load(SEEN_KEY, 0) >= RELEASE; }, stars: deviceStars, hideRestart: hideRestart,
    pending: function () { var p = pending; pending = null; return p; }, takeLink: takeLink,
    // For the harness and the bots.
    codeText: codeText, codeValue: codeValue, missionsFor: missionsFor, freshTour: freshTour, readTour: readTour, nameAll: nameAll,
    build: build, goodWaveSave: goodWaveSave, report: report, keys: { tour: TOUR_KEY, wave: WAVE_KEY, stars: STARS_KEY, seen: SEEN_KEY }
  };
  var SCREENS = window.StickArmyCampaignScreens ? StickArmyCampaignScreens(world, game, api) : { hide: function () {}, map: function () {}, briefing: function () {},
    between: function () {}, lost: function () {}, debrief: function () {}, barracks: function () {}, end: function () {} };
  api.screens = SCREENS;
  world.campaign = api;
  return api;
};
