// What decides a run (MODES in game.js): its waves, when it's won and what winning does, and when it's lost. Arcade
// is the default and only kind; a kind put in its place here (and taken out again) decides all four.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  check(Object.keys(MODES).join() === 'arcade', 'Arcade is the only kind of run');
  RUN.force = 31; newGame(); RUN.force = null;
  check(S.game === 'arcade' && rules() === MODES.arcade, 'and every run is Arcade');
  check(JSON.stringify(S.spawn.cfg) === JSON.stringify(waveCfg(1)) && JSON.stringify(world.waveCfg(5)) === JSON.stringify(waveCfg(5)), "Arcade's waves are waveCfg's");

  // A stand-in kind: two planes and nothing else, won when wave 1 clears (its own win), lost after 3 wall damage.
  var won = 0;
  MODES.test = {
    wave: function (n) { var c = waveCfg(n); c.planes = 2; c.bombers = c.rushes = c.cargo = c.road = c.boss = 0; c.medevac = c.balloons = c.crates = c.divers = c.helis = c.heavies = 0; c.night = false; return c; },
    won: function () { return S.wave >= 1; },
    win: function () { won++; S.mode = 'won'; },
    lost: function () { return S.stats.wallDamage >= 3; }
  };
  try {
    RUN.game = 'test'; RUN.force = 31; newGame(); RUN.force = null; RUN.game = 'arcade';
    check(S.game === 'test' && S.spawn.planes === 2 && S.spawn.bombers === 0, 'its wave 1 is its own');
    S.mods.maxHP = S.wallHP = 1e6;
    for (var k = 0; k < 60 * 120 && S.mode === 'play'; k++) {
      S.troopers.forEach(function (t) { if (!t.dead) killTrooper(t, 'player'); });
      update(1 / 60);
    }
    check(won === 1 && S.mode === 'won' && S.wave === 1, 'it decides the wave won the run, and what that does (' + S.mode + ')');
    RUN.game = 'test'; RUN.force = 32; newGame(); RUN.force = null; RUN.game = 'arcade';
    hurtWall(3, 'bomb'); update(1 / 60);
    check(S.mode === 'dying' && S.wallHP === 0, 'and when it is lost, with 97 of the wall still standing');
  } finally { delete MODES.test; RUN.game = 'arcade'; }
  newGame();
  check(S.game === 'arcade', 'Arcade again');
  return 'ok';
})();
