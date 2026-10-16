// Campaign (campaign.js, campaign-screens.js), round 1: the tour code and the missions it draws, a tour through a won
// and a lost mission (deaths stand after Retry, and Retry plays the same waves), the tour save and the wave save
// restored, the save link round trip, a tour saved by an earlier release still loading (fixtures/), the #tour= link
// in the address, Campaign hidden on the title until #campaign unlocks it, and none of it touching Arcade's board or
// its play stats run.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var camp = world.campaign, K = camp.keys;
  function clear() { [K.tour, K.wave, K.stars, K.seen, K.unlock].forEach(function (k) { localStorage.removeItem(k); }); }
  // Plays the mission to its end card: every trooper popped over a mat or shot, planes shot down. win: false lets
  // the wall fall instead.
  var shops = 0;
  function play(win, most) {
    for (var k = 0; k < 60 * (most || 600) && (S.mode === 'play' || S.mode === 'dying' || S.mode === 'shop'); k++) {
      if (S.mode === 'shop') { shops++; continueWave(); continue; }
      if (win) {
        S.wallHP = S.mods.maxHP;
        S.planes.forEach(function (p) { if (p.state === 'fly' && p.kind !== 'zeppelin' && p.x > 30 && p.x < 370 && !p.drops.length) damagePlane(p, 99, 'player', p.x, p.y, true); });
        S.troopers.forEach(function (t) { if (!t.dead && t.state === 'ground') killTrooper(t, 'player'); });
        S.bombs.forEach(function (b) { b.dead = true; });
      } else hurtWall(5, 'bomb');
      update(1 / 60);
    }
  }
  // Every Arcade board and stats call is counted while Campaign plays.
  var calls = [], board = world.board, real = { begin: board.begin, finish: board.finish };
  board.begin = function () { calls.push('begin'); return real.begin.apply(board, arguments); };
  board.finish = function () { calls.push('finish'); return real.finish.apply(board, arguments); };
  try {
    clear();
    // ---------- the code ----------
    check(camp.codeText(camp.codeValue('K7QMR2')) === 'K7QMR2' && camp.codeValue('k7q-mr2') === camp.codeValue('K7QMR2'), 'a code reads back, in any case, with a dash');
    check(camp.codeValue('O1L') < 0 && camp.codeValue('OIL0OO') === camp.codeValue('011000'), 'typing is forgiving: O is 0, I and L are 1');
    var a = camp.missionsFor(camp.freshTour('K7QMR2'), 0), b = camp.missionsFor(camp.freshTour('K7QMR2'), 0);
    check(a.length === 3 && a[0] === 'first-contact' && a.join() === b.join(), 'a code always draws the same three missions, First contact first (' + a + ')');
    check(a[1] !== a[2] && camp.OPS[0].pool.indexOf(a[1]) >= 0 && camp.OPS[0].pool.indexOf(a[2]) >= 0, 'and two different ones from the pool');
    var draws = {}; for (var v = 0; v < 40; v++) draws[camp.missionsFor(camp.freshTour(camp.codeText(v * 7919)), 0).join()] = true;
    check(Object.keys(draws).length >= 6, 'different codes draw different missions (' + Object.keys(draws).length + ' draws)');

    // ---------- hidden until #campaign ----------
    titleScene();
    check(document.getElementById('campaignBtn').hidden && document.getElementById('startBtn').textContent === 'Start', 'the title is Arcade\'s alone, with Start');
    history.replaceState(null, '', location.pathname + '#tune&campaign');
    camp.takeLink(); titleScene();
    check(location.hash === '#tune' && !document.getElementById('campaignBtn').hidden && document.getElementById('startBtn').textContent === 'Arcade', '#campaign shows Arcade and Campaign, and leaves the address');
    history.replaceState(null, '', location.pathname + '#campaign=off');
    camp.takeLink(); titleScene();
    check(location.hash === '' && document.getElementById('campaignBtn').hidden, '#campaign=off hides it again');
    history.replaceState(null, '', location.pathname + '#campaign');
    camp.takeLink();

    // ---------- a new tour from the title ----------
    titleScene();
    check(document.getElementById('campaignLabel').textContent === 'Campaign' && !document.getElementById('campaignNew').hidden, 'the title offers a new Campaign, tagged new');
    document.getElementById('campaignBtn').click();
    var t = camp.tour();
    check(t && t.squad.length === 0 && t.op === 0 && t.at === 'map' && !document.getElementById('cMap').hidden, 'Campaign opens a tour on the map, with nobody');
    t = camp.newTour('K7QMR2');
    check(JSON.parse(localStorage.getItem(K.tour)).code === t.code, 'and saves it');
    t.missions = ['first-contact', 'fill-the-ranks', 'hold-the-line']; camp.write();
    document.getElementById('cMapGo').click();
    check(!document.getElementById('cBrief').hidden && /Boot/.test(document.getElementById('cBriefTitle').textContent), 'the briefing');
    document.getElementById('cBriefGo').click();
    check(S.game === 'campaign' && S.mode === 'play' && S.mods.slots === 3 && S.cm.mission === 'first-contact' && S.wave === 1, 'First contact plays as Arcade wave 1, with three slots');
    check(world.rules().promotes === false && !SHOP.offer(99, []).some(function (it) { return it.id === 'slot' || it.id === 'bootcamp'; }), 'no stripes for waves, no extra slot or training in the shop');
    // Catches on a full field go to the barracks.
    for (var i = 0; i < 3; i++) S.recruits.push(makeRecruit(SLOT_ORDER[i], 'rifle'));
    var tr = spawnTrooper(200, 300); bounce(tr, TRAMPS[0]); joinSquad(tr);
    check(S.cm.bench.length === 1 && S.cm.count.caught === 1, 'a catch with no slot goes to a bunk');
    S.recruits.splice(0, 3);
    shops = 0; play(true);
    check(shops === 0 && S.wave === 2, 'First contact has no shop between its waves');
    check(S.mode === 'between' && t.at === 'between' && t.m === 1 && !document.getElementById('cCard').hidden, 'won: the card between missions (' + S.mode + ', ' + t.at + ')');
    check(t.squad.length === 1 && t.squad[0].stripes === 0, 'the soldier in the bunk is on the tour');
    check(localStorage.getItem(K.wave) === null, 'the wave save is gone once the mission is over');

    // ---------- a lost mission, Retry ----------
    t.squad.push({ id: t.nextId++, type: 'engineer', stripes: 0, kills: 3 }); camp.write();
    camp.startMission();
    check(S.cm.mission === 'fill-the-ranks' && S.recruits.length === 2, 'the squad goes out (' + S.recruits.length + ')');
    var spawns = [], log = function (type, d) { if (type === 'plane_spawn') spawns.push(JSON.stringify(d)); };
    emitHook = log;
    for (var f = 0; f < 60 * 8; f++) update(1 / 60);
    var first = spawns.slice(0, 4); spawns = [];
    var victim = S.recruits[0], vid = victim.id;
    recruitDie(victim, 'bomb');
    check(!t.squad.some(function (s) { return s.id === vid; }) && t.fallen.some(function (s) { return s.id === vid; }), 'a death stands at once');
    check(JSON.parse(localStorage.getItem(K.tour)).fallen.some(function (s) { return s.id === vid; }), 'and is saved at once');
    play(false);
    check(S.mode === 'between' && t.at === 'lost' && document.getElementById('cRetry') && !document.getElementById('cCard').hidden, 'lost: the card with Retry');
    document.getElementById('cRetry').click();
    check(t.attempt === 1 && S.recruits.length === 1 && !S.recruits.some(function (r) { return r.id === vid; }), 'Retry: the fallen stay fallen');
    // With the same squad, a retry plays exactly as the try before it.
    function attempt() { spawns = []; var all = []; emitHook = function (type, d) { all.push(type + JSON.stringify(d)); }; for (var f = 0; f < 60 * 20; f++) update(1 / 60); emitHook = null; return all; }
    first = attempt();
    play(false); document.getElementById('cRetry').click();
    var second = attempt();
    check(first.length > 50 && first.join('|') === second.join('|'), 'and the waves play the same, event for event (' + first.length + ' / ' + second.length + ')');
    emitHook = null;
    var rep = camp.report('lost');
    check(rep.stats.campaign === true && rep.stats.operation === 'boot-camp' && rep.stats.mission === 'fill-the-ranks' && rep.stats.result === 'lost' && rep.stats.attempt === t.attempt + 1, 'play stats: a campaign run, with its mission');

    // ---------- the tour save and the wave save ----------
    var before = JSON.stringify(t);
    var back = camp.readTour(JSON.parse(localStorage.getItem(K.tour)));
    check(back && back.code === t.code && back.m === t.m && back.fallen.length === t.fallen.length && back.squad.length === t.squad.length && back.at === 'mission', 'the tour save reads back');
    t.missions[1] = 'hold-the-line'; camp.write();
    camp.startMission();
    for (f = 0; f < 60 * 300 && S.mode !== 'shop'; f++) { S.wallHP = S.mods.maxHP; S.troopers.forEach(function (q) { q.dead = true; }); update(1 / 60); }
    var ws = JSON.parse(localStorage.getItem(K.wave));
    check(S.mode === 'shop' && ws && ws.build === camp.build() && ws.snap && ws.snap.S, 'a wave save at the shop');
    var shopRun = JSON.stringify(snapshotRun());
    titleScene();
    check(document.getElementById('campaignLabel').textContent === 'Continue', 'the title says Continue');
    document.getElementById('campaignBtn').click();
    // A stream's state reads back as the same 32 bits, signed (save.js), so states are compared as such.
    function same(x) { return JSON.stringify(x).replace(/"\$rng":(-?\d+)/g, function (m, v) { return '"$rng":' + (Number(v) | 0); }); }
    var now = snapshotRun(), was = JSON.parse(shopRun), diff = now ? Object.keys(was).filter(function (k) { return same(was[k]) !== same(now[k]); }) : ['all'];
    check(S.mode === 'shop' && S.game === 'campaign' && S.cm.wi === 0 && !diff.length, 'Continue: back at the shop, as it was (' + diff.join() + ')');
    ws.build = 'older'; localStorage.setItem(K.wave, JSON.stringify(ws));
    titleScene(); document.getElementById('campaignBtn').click();
    check(S.mode === 'play' && S.cm.wi === 0 && S.wave === S.cm.waves[0] && localStorage.getItem(K.wave) === null, 'a wave save from another build is dropped: the mission starts again');
    check(camp.tour().code === JSON.parse(before).code, 'the same tour');

    // ---------- the save link ----------
    t = camp.tour();
    t.squad = [{ id: 7, type: 'sniper', stripes: 2, kills: 41 }, { id: 9, type: 'medic', stripes: 0, kills: 0 }, { id: 300, type: 'bazooka', stripes: 1, kills: 130 }];
    t.fallen = [{ id: 4, type: 'rifle', stripes: 1, kills: 12, op: 0, m: 1 }]; t.gone = [{ id: 5, stripes: 1 }];
    t.bank = 1234; t.nextId = 301; t.hired = 2; t.lasting = ['fins']; t.stars = { 'boot-camp': true }; t.opLosses = 1; t.m = 2; t.at = 'between';
    t.gear = { stacks: { cool: 2, helmet: 1, tramp: 1 }, calls: { bomber: 1, fighter: 0 }, hired: 3 };
    camp.nameAll(t); camp.write();
    var code = camp.linkCode(t), link = camp.linkFor(t), got = camp.readLink(link);
    check(code.length <= 110, 'a save code is about 100 characters (' + code.length + ')');
    check(got && camp.linkCode(got) === code, 'the link reads back to the same tour');
    check(got.squad.map(function (s) { return s.id + s.type + s.stripes + s.kills + s.name + s.trait; }).join() === t.squad.map(function (s) { return s.id + s.type + s.stripes + s.kills + s.name + s.trait; }).join(), 'the same soldiers, names and traits');
    check(got.bank === 1234 && got.lasting.join() === 'fins' && got.stars['boot-camp'] && got.gear.stacks.cool === 2 && got.gear.calls.bomber === 1 && got.fallen[0].m === 1 && got.at === 'between', 'tags, rewards, stars, gear and the fallen');
    check(camp.readLink(code.toLowerCase().replace(/(.{5})/g, '$1-')) !== null, 'a pasted code can be lowercase, with dashes');
    var bad = code.slice(0, 10) + (code[10] === 'A' ? 'B' : 'A') + code.slice(11);
    check(camp.readLink(bad) === null && camp.readLink('hello') === null, 'a mistyped code is refused');
    check(camp.loadCode('ZZZ-ZZZ') === 'code' && camp.tour().code === 'ZZZZZZ' && camp.tour().squad.length === 0, "a friend's tour code starts that tour");

    // ---------- an earlier release's tour ----------
    Object.keys(armyFixtures).filter(function (k) { return /^campaign-/.test(k); }).forEach(function (name) {
      var fx = armyFixtures[name], old = camp.readTour(fx.tour);
      check(old && old.code === fx.tour.code && old.squad.length === fx.tour.squad.length, name + ': its tour save loads');
      check(old.missions.join() === fx.missions.join(), name + ': and draws the same missions');
      var fromLink = camp.readLink(fx.link);
      check(fromLink && fromLink.code === fx.tour.code && fromLink.squad.length === fx.tour.squad.length, name + ': its save link loads');
      if (fx.tour.deploy) check(fromLink.deploy && fromLink.deploy.join() === fx.tour.deploy.join() && old.deploy.join() === fx.tour.deploy.join(), name + ': with its deploy pick');
      localStorage.setItem(K.tour, JSON.stringify(fx.tour));
      titleScene(); document.getElementById('campaignBtn').click();
      check(camp.tour().code === fx.tour.code, name + ': Continue opens it');
    });

    // ---------- a link in the address ----------
    history.replaceState(null, '', location.pathname + '#seed=5&tour=' + code + '&tune');
    check(camp.takeLink() === code && location.hash === '#seed=5&tune', 'the #tour= token comes out of the address, the others stay');
    history.replaceState(null, '', location.pathname + '#tour=' + code);
    camp.takeLink();
    check(location.hash === '' && hashSeed() === null && hashTokens().indexOf('tune') < 0, 'leaving nothing that makes an Arcade run practice');
    clear();
    titleScene();
    check(camp.tour() && camp.tour().code === camp.readLink(code).code && !document.getElementById('cCard').hidden, 'the title opens the tour from the link');
    check(camp.pending() === null, 'once');
    check(calls.length === 0, 'Campaign never touched the board (' + calls.join() + ')');
  } finally {
    board.begin = real.begin; board.finish = real.finish; emitHook = null;
    clear(); RUN.game = 'arcade'; titleScene();
  }
  newGame();
  check(S.game === 'arcade' && !document.getElementById('restartBtn').hidden, 'Arcade again, with its Restart');
  return 'ok';
})();
