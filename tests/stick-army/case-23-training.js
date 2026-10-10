// Training (campaign.md): five stripes, Boot Camp and Elite Training in the shop's rotation. Each level gives everyone in
// the squad a stripe now and every new soldier, hired or caught, starts with it; the ones who've served longest
// always have the most.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var seen = [];
  emitHook = function (type) { seen.push(type); };
  function item(id) { return ITEMS.find(function (it) { return it.id === id; }); }
  function closeShop() { shopScreen.hidden = true; S.shop = null; S.mode = 'play'; }
  // Open the shop with the item on offer (the rotation decides whether it shows; here it always does).
  function shopWith(id) { openShop(); if (!S.shop.items.some(function (it) { return it.id === id; })) S.shop.items.unshift(item(id)); S.shop.gift = null; renderShop(); }

  // Five stripes: serving adds one at 3, 6, 10, 14 and 18 waves; the top is Master Sergeant.
  check(SQUAD.RANKS.length === 6 && SQUAD.RANKS[4].waves === 14 && SQUAD.RANKS[5].waves === 18, 'five stripes');
  RUN.force = 130; newGame();
  var og = makeRecruit(0, 'rifle'); S.recruits = [og];
  for (var i = 0; i < 14; i++) SQUAD.serveWave([]);
  check(og.rank === 4 && /^SSgt\. /.test(rankName(og)) && crewMax(og) === ENEMIES.rifle.hp + 4 * RANK.HP, 'fourteen waves make staff sergeant: ' + rankName(og));
  for (i = 0; i < 6; i++) SQUAD.serveWave([]);
  check(og.rank === 5 && /^MSgt\. /.test(rankName(og)), 'eighteen make master sergeant, the top');
  render();

  // Boot Camp is in the rotation from wave 5; Elite Training from 10, once Boot Camp is done. Neither before.
  RUN.force = 131; newGame(); S.wave = 4;
  check(!eligible(item('bootcamp')) && !eligible(item('elite')), 'no training before wave 5');
  S.wave = 5;
  check(eligible(item('bootcamp')) && !eligible(item('elite')) && price(item('bootcamp')) === 60, 'Boot Camp from wave 5, 60 tags');
  var shown = false;
  for (var v = 0; v < 12 && !shown; v++) { openShop(); shown = S.shop.items.some(function (it) { return it.id === 'bootcamp'; }); closeShop(); S.wave++; }
  check(shown, 'it comes up in the rotation');
  S.wave = 10; check(!eligible(item('elite')), 'Elite Training waits for Boot Camp');

  // Boot Camp: everyone in the squad gets a stripe now, the soldier in the tent too, and rookies get their names.
  RUN.force = 132; newGame(); S.wave = 6; S.coins = 2000; S.mods.slots = 6; S.mods.hospital = true;
  var vet = makeRecruit(0, 'rifle'), rook = makeRecruit(4, 'engineer'), patient = makeRecruit(1, 'bazooka');
  vet.waves = 7; vet.rank = 2; vet.name = 'Doodle';
  patient.down = true; patient.hp = 0; S.bed = { r: patient, since: 6 };
  S.recruits = [vet, rook];
  var vetMax = crewMax(vet), rookHP = rook.hp;
  shopWith('bootcamp');
  check(takeItem('bootcamp') && S.mods.training === 1, 'bought');
  check(vet.rank === 3 && crewMax(vet) === vetMax + RANK.HP && /^Sgt\. Doodle/.test(rankName(vet)), 'the corporal makes sergeant');
  check(rook.rank === 1 && rook.name && rook.hp === rookHP + RANK.HP, 'the rookie gets a stripe and a name');
  check(patient.rank === 1 && patient.name && patient.hp === 0, 'the one in the tent too (his health comes back when he does)');
  // New soldiers start with one: a hire now, and a paratrooper caught later.
  takeItem('hire-rifle');
  var hire = S.recruits[S.recruits.length - 1];
  check(hire.rank === 1 && hire.trained === 1 && hire.name, 'a new hire arrives with a stripe');
  // Put back: the stripes and the names go back with it.
  SHOP.putBack('bootcamp');
  check(!S.mods.training && S.recruits[0].rank === 2 && !S.recruits[1].rank && !S.recruits[1].name && !S.bed.r.rank && !S.bed.r.name, 'put back, the stripes and names go back');
  check(S.recruits.length === 3 && !S.recruits[2].rank, 'and the hire stays, without his stripe');
  takeItem('bootcamp');
  check(S.mods.training === 1 && S.recruits.every(function (r) { return r.rank >= 1; }), 'and bought again');
  closeShop();
  startWave(7); S.spawn.timer = 99;
  var t = spawnTrooper(57, 400); t.state = 'land'; t.slot = freeSlot(0); becomeRecruit(t);
  var caught = S.recruits.find(function (r) { return r.id === t.id; });
  check(caught && caught.rank === 1 && caught.name, 'a soldier caught on the mat arrives with a stripe');
  render();

  // Elite Training: everyone gets one more stripe (not two), and new soldiers start with two. Service still counts,
  // and nobody passes five.
  S.wave = 10; S.mode = 'shop';
  var sgt = S.recruits[0], sgtRank = sgt.rank, caughtRank = caught.rank;
  shopWith('elite');
  check(eligible(item('elite')) && takeItem('elite') && S.mods.training === 2, 'Elite Training bought');
  check(sgt.rank === sgtRank + 1 && caught.rank === caughtRank + 1, 'one more stripe each, not two');
  takeItem('hire-bazooka');
  var fresh = S.recruits[S.recruits.length - 1];
  check(fresh.rank === 2 && /^Cpl\. /.test(rankName(fresh)), 'new soldiers start with two');
  closeShop();
  // The OG who has served longest stays ahead: service and training add up, capped at five.
  var top = makeRecruit(3, 'rifle'); top.waves = 13; top.trained = 2; top.rank = SQUAD.stripes(top); top.name = 'Inky';
  check(top.rank === 5, 'thirteen waves and both trainings: five');
  top.waves = 20; check(SQUAD.stripes(top) === 5, 'never more than five');
  fresh.waves = 2; S.recruits = [fresh]; SQUAD.serveWave([]);
  check(fresh.rank === 3 && fresh.waves === 3, 'a trained soldier still earns his service stripes');
  S.recruits = [fresh, top]; render();

  emitHook = null; RUN.force = null; reset(); titleScene(); render();
})();
