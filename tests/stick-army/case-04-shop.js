(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  newGame(); var before=S.coins; award(10,50,300,'test',INK,true); award(10,50,300,'test',INK,true);
  check(S.coins>before && S.score===30,'coins separate from combo score');
  openShop(); check(S.shop.free.length===2 && S.shop.premium.length===2,'two free / two premium offers');
  check(S.shop.premium.some(it=>it.id==='pizza'),'pizza always orderable');
  continueWave(); check(S.mode==='shop','must choose a free item');
  var pick=S.shop.free[0].id, other=S.shop.free[1].id;
  check(takeItem(pick),'take free'); check(!takeItem(other) && !takeItem(pick),'exactly one free choice');
  S.coins=0; check(!takeItem('pizza'),'cannot overspend');
  S.coins=100; S.wallHP=50; var r=makeRecruit(0,'rifle'); r.hp=1; S.recruits=[r];
  var coins=S.coins, spawnTimer=S.spawn.timer;
  check(takeItem('pizza') && S.mode==='delivery' && shopScreen.hidden,'courier intermission starts');
  check(S.wallHP===50,'heal only at handoff');
  for(var i=0;i<700 && S.mode==='delivery';i++) updateDelivery(1/120);
  check(S.mode==='shop' && !shopScreen.hidden,'return to same shop');
  check(S.wallHP===75 && r.hp===2 && S.coins===coins-25,'pizza restores wall and crew once');
  check(S.spawn.timer===spawnTimer && !takeItem('pizza'),'delivery freezes combat; no duplicate order');
  continueWave(); check(S.mode==='play' && S.wave===2 && shopScreen.hidden,'next wave');
  newGame();
  check(S.coins===0 && S.mods.slots===4 && !S.mods.stacks[pick] && S.recruits.length===0, 'new run resets progression');
  ITEMS.filter(it=>it.maxStacks!==Infinity).forEach(it=>S.mods.stacks[it.id]=it.maxStacks);
  openShop(); check(S.shop.free.length===2,'endless run still has two free choices');
  reset(); shopScreen.hidden=true; render();
})();
