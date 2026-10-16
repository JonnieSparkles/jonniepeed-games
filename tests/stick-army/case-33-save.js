// Saving a run at the shop (save.js), for Campaign to save after every wave: a snapshot is plain JSON, it reads the
// run without changing it, and restored, even after another run in between, the next wave plays exactly as it did in
// the run that wasn't interrupted. Only at the shop; and Arcade never calls it.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function source(name) { var x = new XMLHttpRequest(); x.open('GET', name, false); x.send(); check(x.status === 200, 'read ' + name); return x.responseText; }
  function aimBot() {
    var target = S.troopers.filter(function (t) { return !t.dead && (t.state === 'chute' || t.state === 'free'); }).sort(function (a, b) { return b.y - a.y; })[0];
    var plane = S.planes.find(function (p) { return p.state === 'fly' && p.x > 20 && p.x < 380; });
    if (target) aimAt({ x: target.x, y: target.y + 12 + (target.state === 'chute' ? target.fall : target.vy) * Math.hypot(target.x - TUR.x, target.y - TUR.y) / 700 });
    else if (plane) aimAt({ x: plane.x + (plane.face || plane.dir) * plane.speed * Math.hypot(plane.x - TUR.x, plane.y - TUR.y) / 700, y: plane.y });
    keys.fire = !!(target || plane);
  }
  // Until the next shop, or the end of the run.
  function play() { for (var k = 0; k < 60 * 600 && (S.mode === 'play' || S.mode === 'dying'); k++) { aimBot(); update(1 / 60); } clearInput(); }
  // The same shopping every visit: tags to spend, the gift, every offer, two hires and a pizza (so the next wave
  // opens with the courier).
  function shopping() {
    S.players[0].tags += 600;
    var gift = S.shop.items.find(function (it) { return onHouse(it); });
    if (gift) takeItem(gift.id);
    S.shop.items.forEach(function (it) { if (it.id !== 'pizza') takeItem(it.id); });
    takeItem('hire-rifle'); takeItem('hire-engineer'); takeItem('pizza');
  }
  // Everything that happens, and the run as it ends up: at the next shop, its own snapshot.
  var log = [];
  function listen() { log = []; emitHook = function (type, data) { log.push(type + ' ' + JSON.stringify(data)); }; }
  function after() {
    return { mode: S.mode, wave: S.wave, events: log.slice(), run: S.mode === 'shop' ? JSON.stringify(snapshotRun()) : JSON.stringify([SAVE.encode(S, []), nextId]) };
  }
  // From the snapshot on, both runs get the same cosmetic randomness too, so even the particles (and the ids they
  // take) match, and the comparison can be of everything.
  var realRandom = Math.random, realR = R;
  function cosmetic() { Math.random = mulberry(99); R = mulberry(98); }

  try {
    // Only at the shop.
    RUN.force = 2024; newGame(); RUN.force = null;
    check(snapshotRun() === null, 'no snapshot during a wave');
    check(restoreRun(null) === false && restoreRun({ v: 0 }) === false, 'and nothing to restore from a non-snapshot');

    // Run A: to the shop after wave 3, the snapshot, then wave 4 to the next shop.
    for (var w = 0; w < 3; w++) { play(); check(S.mode === 'shop', 'the run reaches the shop after wave ' + S.wave); if (S.wave < 3) { shopping(); continueWave(); } }
    check(S.mode === 'shop' && S.wave === 3, 'at the shop after wave 3');
    var snap = snapshotRun();
    check(snap && snap.v === SAVE.VERSION && Array.isArray(snap.lost) && !snap.lost.length, 'a snapshot at the shop, with nothing left out: ' + (snap && snap.lost));
    var text = JSON.stringify(snap);
    check(JSON.stringify(snapshotRun()) === text, 'taking a snapshot changes nothing');
    check(JSON.stringify(JSON.parse(text)) === text, 'it is plain JSON');
    check(text.indexOf('"$item"') > 0 && text.indexOf('"$rng"') > 0, 'the shop\'s offers and the streams kept in S are written as references');
    cosmetic(); listen();
    shopping(); continueWave(); play();
    var a = after();
    check(a.mode === 'shop' && a.wave === 4 && a.events.length > 100, 'run A plays wave 4 to the shop (' + a.mode + ' ' + a.wave + ')');

    // Something else in between: another run, a while into its first wave.
    Math.random = realRandom; R = realR;
    RUN.force = 7; newGame(); RUN.force = null;
    for (var k = 0; k < 60 * 20; k++) { aimBot(); update(1 / 60); }
    clearInput();

    // Run B: restored from the snapshot (as JSON), the same shopping, then wave 4.
    check(restoreRun(JSON.parse(text)) === true, 'the snapshot restores');
    check(S.mode === 'shop' && S.wave === 3 && !shopScreen.hidden && titleScreen.hidden && pauseBtn.hidden, 'back at the shop after wave 3, its screen open');
    check(JSON.stringify(snapshotRun()) === text, 'restored, the run reads back exactly as it was saved');
    check(RUN.seed === 2024 && S.shop.items.every(function (it) { return ITEMS.indexOf(it) >= 0; }), 'its seed, and the offers are the shop\'s own items');
    cosmetic(); listen();
    shopping(); continueWave(); play();
    var b = after();
    check(a.events.length === b.events.length && a.events.every(function (e, i) { return e === b.events[i]; }),
      'wave 4 plays the same, event for event (first difference: ' + (function () { for (var i = 0; i < a.events.length; i++) if (a.events[i] !== b.events[i]) return i + ': ' + a.events[i] + ' / ' + b.events[i]; return 'lengths'; })() + ')');
    check(a.run === b.run, 'and ends at the next shop exactly as the run that wasn\'t interrupted');
  } finally {
    Math.random = realRandom; R = realR; emitHook = null;
  }

  // Arcade never calls it: only game.js (which makes it) and save.js mention it.
  ['flow.js', 'shop.js', 'shop-screen.js', 'dreadnought.js', 'units.js', 'sky.js', 'squad.js', 'draw.js', 'coop.js', 'board.js'].forEach(function (name) {
    check(!/snapshotRun|restoreRun/.test(source(name)), name + ' calls the save');
  });
  return 'ok';
})();
