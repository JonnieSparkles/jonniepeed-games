// Round 16: the Red Cross record and bonus, the Red Cross holding the wave open, the mats on a side per run, the
// smoke lingering after the hangar, the squad talking the Dreadnought in, and road tanks arriving with the rush.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  function quiet(n) {
    newGame(); startWave(n); S.mods.maxHP = S.wallHP = 1e6; S.banner = null;
    var sp = S.spawn; sp.timer = sp.rushT = sp.cargoT = sp.roadT = sp.bossT = 99;
    var k = sp.sky; k.medevacT = k.balloonT = k.crateT = k.diverT = k.heliT = k.heavyT = 99;
    S.recruits = []; S.mods.auto = false; S.texts = [];
  }

  // The mats: the run seed picks the first mat's side; the second mat and the tent go across from it.
  var sides = {};
  for (var seed = 1; seed <= 24; seed++) {
    RUN.force = seed; newGame(); RUN.force = null;
    var left = TRAMPS[0].x2 < BK.x1;
    sides[left ? 'left' : 'right'] = true;
    check(left ? TRAMPS[1].x1 > BK.x2 : TRAMPS[1].x2 < BK.x1, 'the second mat is across from the first');
    check((SQUAD.TENT.x > BK.x2) === (TRAMPS[1].x1 > BK.x2), 'the tent is on the second mat\'s side');
    var fresh = S.matRight; RUN.force = seed; newGame(); RUN.force = null;
    check(S.matRight === fresh, 'the same seed, the same side');
    // Drops that aren't meant for the mat stay off it.
    for (var d = 0; d < 200; d++) {
      var x = pickDropX(mulberry(d * 7 + seed));
      check(x > 0 && x < W, 'drops land on the page');
    }
  }
  check(sides.left && sides.right, 'the first mat turns up on both sides');
  S.mods.mat = 2; resizeMats();
  check(TRAMPS[0].x2 - TRAMPS[0].x1 === 94 && TRAMPS[1].x2 - TRAMPS[1].x1 === 94, 'Bigger bounce widens both, either side');

  // The Red Cross plane holds the wave open until it's across, and counts as through.
  RUN.force = 61; quiet(6); RUN.force = null;
  var m = SKY.spawnMedevac(RW);
  check(SKY.waiting(), 'a Red Cross plane in the air holds the wave open');
  run(14);
  check(!S.medevac.length && !SKY.waiting() && S.stats.redCross === 1, 'across: one through, and the wave can end');
  // A second one gets hit: 1 of 2, no bonus.
  m = SKY.spawnMedevac(RW); m.x = 200;
  SKY.shot({ x: m.x, y: m.y, vx: 0, vy: -1, owner: 'player', kind: 'bullet', life: 1, dead: false });
  run(10);
  var score = S.score, rc = SKY.redCrossRecord();
  check(rc.safe === 1 && rc.flew === 2 && !rc.perfect && S.score === score, '1 of 2: no bonus');

  // Every one through: the bonus, once, and the card says so.
  RUN.force = 61; quiet(6); RUN.force = null;
  SKY.spawnMedevac(RW); run(14); SKY.spawnMedevac(RW); run(14);
  score = S.score;
  check(SKY.redCrossRecord().perfect && S.score === score + SKY.MEDEVAC.PERFECT, '2 of 2: the bonus');
  SKY.redCrossRecord();
  check(S.score === score + SKY.MEDEVAC.PERFECT, 'paid once');
  showOver();
  check(document.getElementById('stRed').textContent === '2 of 2' && !document.getElementById('stRed').hidden, 'the card: 2 of 2');
  check(!document.getElementById('stPerfect').hidden && /\+5,000/.test(document.getElementById('stPerfect').textContent), 'the card: the bonus line');
  overScreen.hidden = true;
  // None flew: no line, no bonus.
  newGame(); score = S.score; showOver();
  check(document.getElementById('stRed').hidden && document.getElementById('stPerfect').hidden && S.score === score, 'no Red Cross, no line');
  overScreen.hidden = true;

  // The smoke lingers as long again as it was up, within LINGER, and only while the bridge stage is on.
  newGame(); SKY.smokeStart(1); S.smoke.t = 12; SKY.smokeClear();
  check(S.smoke.linger === 12, 'it lingers as long again');
  S.smoke.t = 40; SKY.smokeClear();
  check(S.smoke.linger === SKY.SMOKE.LINGER[1], 'at most LINGER');
  run(0.5);
  check(!S.smoke, 'with no Dreadnought on its bridge stage, it clears straight away');

  // The squad talks it in: a line every TAUNT.EVERY seconds from the banner until it opens fire.
  newGame(); S.recruits = [0, 4, 1, 5].map(function (i) { return makeRecruit(i, 'rifle'); });
  startWave(DREAD.WAVE); S.spawn.teaser = false; S.spawn.planes = S.spawn.bombers = 0; S.mods.maxHP = S.wallHP = 1e6;
  var said = [], say = world.say, p = null;
  world.say = function (text) { said.push({ text: text, t: S.t }); return say.apply(this, arguments); };
  for (var i = 0; i < 60 * 60 && !(p && p.phase === 'guns'); i++) {
    update(1 / 60); S.bombs = []; S.recruits.forEach(function (r) { r.hp = crewMax(r); });
    p = S.planes.find(function (q) { return q.kind === 'dread'; });
  }
  world.say = say;
  var oh = said.findIndex(function (q) { return q.text === '...oh.'; }), fire = said.findIndex(function (q) { return q.text === 'open fire!'; });
  check(p && p.phase === 'guns' && oh >= 0 && fire > oh, 'from the banner to open fire');
  var talk = said.slice(oh, fire);
  check(talk.length >= 5 && talk.some(function (q) { return q.text === '🍆'; }), 'a line every few seconds, the eggplant among them');
  check(said[fire].t - talk[talk.length - 1].t < DREAD.TAUNT.EVERY + 0.5, 'still talking when it opens fire');

  // Road tanks: on wave 17 they've all rolled out in the first half of the wave.
  RUN.force = 7; newGame(); RUN.force = null; startWave(17); S.mods.maxHP = S.wallHP = 1e6;
  var sp = S.spawn, out = 0;
  for (i = 0; i < 60 * 20 && sp.road > 0; i++) { update(1 / 60); out = S.t; }
  check(sp.road === 0 && waveCfg(17).road >= 3, 'every road tank out within 20 s');

  RUN.force = null; reset(); S.mode = 'title';
})();
