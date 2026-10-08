// Round 6 squad life: earned names and ranks, wounded crew, and the one-bed field hospital.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var seen = [];
  emitHook = function (type) { seen.push(type); };
  // Clear the current wave with nothing left on the field, then start the next one without the shop.
  function clearWave() {
    S.mode = 'play'; S.waveState = 'active'; S.planes = []; S.bombs = []; S.troopers = []; S.tanks = []; S.enemyShots = [];
    S.spawn = { cfg: waveCfg(S.wave), planes: 0, bombers: 0, boss: 0, rushes: 0, cargo: 0, timer: 99, rushT: 99, cargoT: 99, bossT: 99 };
    updateWave(0.01);
    check(S.waveState === 'clear', 'the wave clears');
  }
  function nextWave() { S.shop = null; shopScreen.hidden = true; S.mode = 'play'; startWave(S.wave + 1); }

  // Three waves served earn a name and a stripe; more waves, more stripes. Ranks add health and a quicker trigger.
  RUN.force = 21; newGame(); startWave(1);
  var vet = makeRecruit(0, 'rifle'), rookie = makeRecruit(4, 'engineer'); S.recruits = [vet, rookie];
  var baseMax = crewMax(vet);
  clearWave(); nextWave(); clearWave(); nextWave();
  check(!vet.name && vet.waves === 2, 'two waves in, still a rookie');
  clearWave();
  check(vet.rank === 1 && vet.name && SQUAD.NAMES.indexOf(vet.name) >= 0 && crewMax(vet) === baseMax + RANK.HP, 'three waves earn a name and a stripe');
  check(rookie.name && rookie.name !== vet.name, 'names are unique within a run');
  check(S.news.some(function (n) { return n.indexOf(rankName(vet)) >= 0; }) && seen.indexOf('rank_up') >= 0, 'the promotion is news');
  openShop();
  check(!document.getElementById('shopNews').hidden && document.getElementById('shopNews').textContent.indexOf(vet.name) >= 0, 'the shop tells the story');
  var firstName = vet.name;
  RUN.force = 21; newGame(); startWave(1); var again = makeRecruit(0, 'rifle'); again.id = vet.id; S.recruits = [again];
  for (var k = 0; k < 3; k++) { clearWave(); nextWave(); }
  check(again.name === firstName, 'the same seed and recruit give the same name');
  S.recruits[0].waves = 5; clearWave();
  check(S.recruits[0].rank === 2 && /Cpl\./.test(rankName(S.recruits[0])), 'six waves make corporal');

  // Zero health knocks a recruit down instead of killing him. He stops working, snipers ignore him and their shots
  // fly over, but any more damage finishes him.
  RUN.force = 22; newGame(); startWave(4); S.mods.maxHP = S.wallHP = 1e6;
  var a = makeRecruit(0, 'rifle'), b = makeRecruit(1, 'rifle'); S.recruits = [a, b];
  hurtRecruit(a, 99, 'bomb');
  check(a.down && !a.dead && a.hp === 0 && seen.indexOf('recruit_down') >= 0, 'zero health means down, not dead');
  spawnTrooper(18, GROUND - 33); var sn = S.troopers[0]; sn.type = 'sniper'; land(sn);
  updateSniper(sn, 0.01);
  check(Math.abs(Math.atan2(GROUND - 22 - (sn.y + 11), b.x - sn.x) - sn.aim) < 1e-6, 'snipers aim past the wounded at the next man standing');
  S.enemyShots = [{ x: a.x - 10, y: GROUND - 22, vx: 400, vy: 0, life: 1 }]; b.x = 300; updateEnemyShots(0.05);
  check(!a.dead, 'sniper shots fly over the wounded');
  hurtRecruit(a, 0.1, 'lander');
  check(a.dead, 'one more hit finishes him');

  // A medic gets the wounded back up; so does a pizza.
  RUN.force = 23; newGame(); startWave(4);
  var hurt = makeRecruit(0, 'rifle'), doc = makeRecruit(1, 'medic'); S.recruits = [hurt, doc]; doc.cd = 0;
  hurtRecruit(hurt, 99, 'bomb');
  for (var i = 0; i < 600 && hurt.down; i++) updateRecruits(1 / 60);
  check(!hurt.down && hurt.hp >= 1 && seen.indexOf('recruit_revived') >= 0, 'a medic gets the wounded back up');
  hurtRecruit(hurt, 99, 'bomb'); doc.dead = true;
  S.delivery = { x: 199, phase: 'arrive', wait: 0 }; updateDelivery(0.1);
  check(!hurt.down, 'a pizza gets the wounded back up too');

  // Without the field hospital, anyone still down when the wave clears is lost; named soldiers join the fallen.
  RUN.force = 24; newGame(); startWave(4);
  var named = makeRecruit(0, 'rifle'); named.rank = 2; named.name = 'Squiggle'; named.waves = 7; S.recruits = [named];
  hurtRecruit(named, 99, 'bomb'); clearWave();
  check(named.dead && S.fallen.length === 1 && S.fallen[0].name === 'Cpl. Squiggle' && S.fallen[0].waves === 7, 'no tent: the wounded are lost and remembered');
  check(S.news.some(function (n) { return /didn't make it/.test(n); }), 'the shop says so');

  // With the field hospital, the most decorated wounded soldier gets the one bed (first down on a tie), sits out
  // the next wave in the tent with his slot kept, and comes back at full health. Everyone else still down is lost.
  RUN.force = 25; newGame(); startWave(4); ITEMS.find(function (it) { return it.id === 'hospital'; }).apply(S);
  var pvt = makeRecruit(0, 'rifle'), sgt = makeRecruit(1, 'bazooka'), rook = makeRecruit(4, 'rifle');
  pvt.rank = 1; pvt.name = 'Inky'; sgt.rank = 3; sgt.name = 'Doodle'; S.recruits = [pvt, sgt, rook];
  hurtRecruit(pvt, 99, 'bomb'); S.t += 1; hurtRecruit(sgt, 99, 'bomb'); S.t += 1; hurtRecruit(rook, 99, 'bomb');
  clearWave();
  check(S.bed && S.bed.r === sgt && S.recruits.indexOf(sgt) < 0, 'the sergeant gets the bed');
  check(pvt.dead && rook.dead && seen.indexOf('recruit_saved') >= 0, 'everyone else still down is lost');
  var fillers = unlockedSlots().filter(function (slot) { return slot !== sgt.slot; }).map(function (slot) { return makeRecruit(slot, 'rifle'); });
  S.recruits = S.recruits.filter(function (r) { return !r.dead; }).concat(fillers);
  check(freeSlot(0) === -1 && freeSlot(1) === -1, 'the patient keeps his slot');
  S.recruits = S.recruits.filter(function (r) { return fillers.indexOf(r) < 0; });
  render();
  nextWave(); clearWave();
  check(!S.bed && S.recruits.indexOf(sgt) >= 0 && sgt.hp === crewMax(sgt) && !sgt.down, 'he is back after sitting out a wave');
  check(seen.indexOf('recruit_back') >= 0 && S.news.some(function (n) { return /back from the tent/.test(n); }), 'and the shop says so');

  // A tie goes to whoever went down first.
  RUN.force = 26; newGame(); startWave(4); S.mods.hospital = true;
  var first = makeRecruit(0, 'rifle'), second = makeRecruit(1, 'rifle'); S.recruits = [first, second];
  hurtRecruit(first, 99, 'bomb'); S.t += 1; hurtRecruit(second, 99, 'bomb'); clearWave();
  check(S.bed && S.bed.r === first, 'first down, first in on a tie');

  // The pause card names the squad; the game-over card lists the fallen.
  RUN.force = 27; newGame(); startWave(4);
  var star = makeRecruit(0, 'rifle'); star.rank = 1; star.name = 'Nib'; star.waves = 4; S.recruits = [star, makeRecruit(4, 'rifle')];
  togglePause();
  check(/Pfc\. Nib \(4\)/.test(document.getElementById('pauseSquad').textContent) && /1 rookie/.test(document.getElementById('pauseSquad').textContent), 'the pause card names the squad');
  togglePause();
  S.fallen = [{ name: 'Sgt. Doodle', waves: 12 }]; hurtWall(S.wallHP + 1, 'bomb'); update(1 / 60);
  for (var j = 0; j < 200 && S.mode !== 'over'; j++) update(1 / 60);
  check(/Sgt\. Doodle \(12 waves\)/.test(document.getElementById('overFallen').textContent) && !document.getElementById('overFallen').hidden, 'the game-over card lists the fallen');
  overScreen.hidden = true;

  // Drawn in: as a wave starts, what you just bought is sketched onto the page one piece at a time.
  RUN.force = 28; newGame(); S.wave = 8; S.coins = 999; openShop();
  ['auto', 'hospital'].forEach(function (id) { var it = ITEMS.find(function (x) { return x.id === id; }); it.apply(S); S.shop.bought[id] = true; });
  takeItem('hire-rifle'); var hire = S.recruits[S.recruits.length - 1];
  continueWave(); S.spawn.timer = 99;
  check(S.sketches.map(function (k) { return k.key; }).join() === 'auto,hospital,r' + hire.id && !hire.fresh, 'purchases and hires queue up to be drawn');
  check(sketchProgress('auto') === 0 && sketchProgress('hospital') === 0 && sketchProgress('wire') === 1, 'nothing is drawn yet; what was never bought is not waiting');
  for (var s1 = 0; s1 < 20; s1++) update(1 / 60);
  check(sketchProgress('auto') > 0 && sketchProgress('auto') < 1 && sketchProgress('hospital') === 0, 'one at a time');
  render();
  for (s1 = 0; s1 < 120; s1++) update(1 / 60);
  check(!S.sketches.length && sketchProgress('r' + hire.id) === 1, 'all drawn within a couple of seconds');
  // Called planes are sketched in at the page edge, then fly.
  S.calls.bomber = 1; callStrike(); var x0 = S.strike.x;
  update(0.2); check(S.strike.x === x0 && x0 > 0, 'the bomber is drawn in place first');
  for (s1 = 0; s1 < 30; s1++) update(1 / 60);
  check(S.strike.x > x0, 'then it flies');
  render();

  check(ICONS.hospital, 'icon for the field hospital');
  emitHook = null; RUN.force = null; reset(); render();
})();
