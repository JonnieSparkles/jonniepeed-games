(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  newGame(); var before=S.coins; award(10,50,300,'test',INK,true); award(10,50,300,'test',INK,true);
  check(S.coins>before && S.score===30,'coins separate from combo score');
  openShop(); check(S.shop.items.length===4 && S.shop.items[3].id==='pizza','three rotating supplies and pizza');
  check(S.shop.items.slice(0,3).some(it=>it.id===S.shop.gift) && costNow(ITEMS.find(it=>it.id===S.shop.gift))===0,'one supply is on the house');
  check(S.shop.hire.length===5 && S.shop.hire.every(it=>eligible(it)),'every role for hire while a slot is free');
  var pick=S.shop.gift, other=S.shop.items.find(it=>it.id!==pick && it.id!=='pizza').id, purse=S.coins;
  check(takeItem(pick) && S.coins===purse,'the gift is free'); check(!takeItem(pick),'each supply once per visit');
  check(costNow(ITEMS.find(it=>it.id===pick))===price(ITEMS.find(it=>it.id===pick)),'only one gift a visit');
  S.coins=0; check(!takeItem(other),'other supplies cost tags');
  S.coins=0; check(!takeItem('pizza'),'cannot overspend');
  S.coins=100; S.wallHP=50; var r=makeRecruit(0,'medic'); r.hp=1; S.recruits=[r]; // a medic never repairs, so only pizza moves the wall
  var coins=S.coins;
  check(takeItem('pizza') && S.mode==='shop' && !shopScreen.hidden && S.pizzaOrder,'ordering pizza keeps the shop open');
  check(S.wallHP===50 && S.coins===coins-25 && !takeItem('pizza'),'no heal yet, and one order a visit');
  check(/On its way/.test(document.querySelector('[data-item="pizza"]').textContent),'the shop says it is on its way');
  continueWave(); check(S.mode==='play' && S.wave===2 && shopScreen.hidden && S.delivery && !S.pizzaOrder,'next wave, and the courier sets off');
  S.spawn.timer=S.spawn.rushT=S.spawn.cargoT=99; S.planes=[]; // keep the wave quiet but running
  for(var i=0;i<1000 && S.delivery;i++) update(1/120);
  check(!S.delivery && S.wallHP===75 && r.hp===2,'the pizza lands during the wave: wall and crew healed once');
  newGame();
  check(S.coins===0 && S.mods.slots===4 && !S.mods.stacks[pick] && S.recruits.length===0, 'new run resets progression');
  ITEMS.filter(it=>it.maxStacks!==Infinity).forEach(it=>S.mods.stacks[it.id]=it.maxStacks);
  openShop(); check(S.shop.items.length>=2 && S.shop.items.some(it=>it.id==='repair'),'endless run still offers repairs and pizza');
  newGame(); openShop(); continueWave(); check(S.mode==='play' && S.wave===2,'leaving without buying is fine');
  reset(); shopScreen.hidden=true; render();
})();
