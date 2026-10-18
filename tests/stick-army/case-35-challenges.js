// Challenges (challenges.js): the list over the title, a challenge's fixed setup, its stars kept on this device, the
// end card, a failed one, and Arcade untouched afterwards.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var KEY = 'stickarmy.challenges', ON = 'stickarmy.challenges.on', kept = localStorage.getItem(KEY), keptOn = localStorage.getItem(ON);
  localStorage.removeItem(KEY);
  try {
    var L = CHALLENGES.LIST;
    check(L.length === 8 && L.every(function (x) { return x.stars.length === 3; }), 'eight challenges, three stars each');
    check(CHALLENGES.stars() === 0, 'no stars on a fresh device');

    // Hidden until unlocked on the device (#challenges): Start alone, as before.
    localStorage.removeItem(ON); titleScene();
    var cbtn = document.getElementById('challengesBtn'), sbtn = document.getElementById('startBtn');
    check(cbtn.hidden && sbtn.textContent === 'Start' && !sbtn.parentNode.classList.contains('t-two') && !CHALLENGES.unlocked(), 'hidden until unlocked');
    localStorage.setItem(ON, 'true'); titleScene();
    check(!cbtn.hidden && sbtn.textContent === 'Arcade' && sbtn.parentNode.classList.contains('t-two'), 'unlocked: Arcade beside Challenges');

    // The list: over the title, the hard ones locked until enough stars.
    titleScene();
    document.getElementById('challengesBtn').click();
    var page = document.getElementById('chPage');
    check(!page.hidden && page.querySelectorAll('.ch-item').length === 8, 'the Challenges button opens the list');
    check(page.querySelectorAll('.ch-item[disabled]').length === L.filter(function (x) { return x.need > 0; }).length, 'the locked ones are locked');
    document.getElementById('chBack').click();
    check(page.hidden && S.mode === 'title', 'and back to the title');

    // A fixed setup: its wave, squad, kit and wall, the same every time.
    CHALLENGES.start('stand');
    var ch = CHALLENGES.cur();
    check(S.game === 'challenge' && RUN.game === 'arcade' && S.wave === ch.wave && S.mode === 'play', 'a challenge plays its own wave (' + S.game + ' ' + S.wave + ')');
    check(S.recruits.length === ch.squad.length && S.mods.slots === ch.slots && S.turrets[0].mods.fire === ch.kit.fire, 'with its squad and kit');
    update(1 / 60);
    check(S.wallHP === Math.round(S.mods.maxHP * CHALLENGES.STAND.WALL), 'Last stand starts with the wall low');
    var cfg = JSON.stringify(S.spawn.cfg), seed = RUN.seed;
    CHALLENGES.start('stand');
    check(JSON.stringify(S.spawn.cfg) === cfg && RUN.seed === seed, 'and plays the same again');

    // The big one, popped quickly with the wall untouched: three stars, kept, and the card says so.
    CHALLENGES.start('big');
    S.mods.maxHP = S.wallHP = 1e6;
    for (var k = 0; k < 60 * 200 && S.mode !== 'over'; k++) {
      S.troopers.forEach(function (t) { if (!t.dead) killTrooper(t, 'player'); });
      var b = S.ch.big;
      if (b && !b.gone) rules().shot({ x: b.x, y: CHALLENGES.BIG.Y, owner: 'player' });
      update(1 / 60);
    }
    var card = document.getElementById('chCard');
    check(S.mode === 'over' && !card.hidden, 'the end card shows (' + S.mode + ')');
    check(S.ch.k.big && CHALLENGES.records().big.stars === 3, 'three stars, kept on this device');
    check(card.querySelectorAll('.ch-goals li.miss').length === 0 && document.getElementById('chRetry') && document.getElementById('chList'), 'every goal ticked, with Retry and List');
    check(CHALLENGES.stars() === 3, 'the total counts them');

    // A failed one: the pilots left alone are lost, three ends it, no stars, the record keeps what it had.
    CHALLENGES.start('pilots');
    check(card.hidden, 'a new go hides the card');
    for (k = 0; k < 60 * 240 && S.mode !== 'over'; k++) update(1 / 60);
    check(S.mode === 'over' && S.ch.k.pilotsLost >= 3 && S.ch.cause, 'three pilots lost fails it (' + S.ch.cause + ')');
    check(!CHALLENGES.records().pilots || CHALLENGES.records().pilots.stars === 0, 'with no stars');
    check(!document.getElementById('chNext'), 'and no Next until it is done');
    document.getElementById('chList').click();
    check(!page.hidden && S.mode === 'title', 'List goes back to the list');

    // Quit from pause goes to the list too.
    CHALLENGES.start('bombs');
    togglePause();
    document.getElementById('pauseQuitBtn').click();
    check(!page.hidden && S.mode === 'title', 'Quit from pause: the list');
    document.getElementById('chBack').click();

    // Arcade is Arcade again.
    RUN.force = 31; newGame(); RUN.force = null;
    check(S.game === 'arcade' && !S.ch && rules() === MODES.arcade, 'Arcade afterwards');
  } finally {
    if (kept == null) localStorage.removeItem(KEY); else localStorage.setItem(KEY, kept);
    if (keptOn == null) localStorage.removeItem(ON); else localStorage.setItem(ON, keptOn);
  }
  titleScene();
  return 'ok';
})();
