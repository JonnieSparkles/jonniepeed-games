// The flagpole: "It boosts morale." Sold once a run, in the rotating supplies; sketched in, hoisted, saluted at every
// wave start, and the squad fires FLAG.FIRE faster while it flies.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  var flag = ITEMS.find(function (it) { return it.id === 'flag'; });
  check(flag && flag.tier === 'supply' && flag.maxStacks === 1 && flag.desc === 'It boosts morale.', 'the flagpole is a one-off supply that boosts morale');
  check(!flag.flat, 'it takes war prices like any supply');

  // In the rotation: across seeds, the flagpole turns up among the offers.
  var seen = false;
  for (var seed = 1; seed <= 40 && !seen; seed++) {
    RUN.force = seed; newGame(); RUN.force = null; S.wave = 3; openShop();
    if (S.shop.items.some(function (it) { return it.id === 'flag'; })) seen = true;
    S.mode = 'play'; S.shop = null; shopScreen.hidden = true;
  }
  check(seen, 'the flagpole is in the rotating supplies');

  // Bought: it goes up in its own scene before the next wave (after a pizza): the pole sketched in with the flag low,
  // then hoisted, then a salute, then the wave starts.
  newGame(); S.recruits = [makeRecruit(0, 'rifle'), makeRecruit(4, 'rifle')];
  openShop(); S.pizzaOrder = true; flag.apply(S); S.mods.stacks.flag = 1;
  check(S.mods.flag === true && S.flagUp === 0, 'bought: flag on, not yet up');
  check(!eligible(flag), 'never offered again once bought');
  var wave = S.wave; continueWave();
  check(S.waveState === 'pizza', 'the pizza comes first');
  for (var i = 0; i < 60 * 8 && S.waveState === 'pizza'; i++) update(1 / 60);
  check(S.waveState === 'flag' && S.wave === wave, 'then the flag goes up, before the wave');
  update(1 / 60); render();
  check(S.flagUp === 0, 'the flag starts low while the pole is drawn');
  for (i = 0; i < 60 * 8 && S.flagUp < 1; i++) update(1 / 60);
  check(S.flagUp >= 1 && S.saluteT > 0 && S.waveState === 'flag', 'hoisted to the top, then saluted');
  for (i = 0; i < 60 * 3 && S.waveState === 'flag'; i++) update(1 / 60);
  check(S.waveState === 'active' && S.wave === wave + 1, 'then the wave starts');
  check(S.saluteT > 0, 'and the wave start brings a salute');
  for (i = 0; i < 60 * 3; i++) update(1 / 60);
  check(S.saluteT === 0, 'the salute ends');
  // A later shop visit: no second ceremony.
  openShop(); continueWave();
  check(S.waveState === 'active', 'once up, waves start straight away');
  render();

  // Morale: the crew's trigger is FLAG.FIRE quicker (updateRecruits scales each soldier's cooldown by it).
  check(FLAG.FIRE < 1 && FLAG.FIRE >= 0.95, 'the morale boost is a few percent');

  // At game over the pole lies across the rubble.
  S.mods.flag = true; hurtWall(S.wallHP + 1, 'bomb'); update(1 / 60);
  for (i = 0; i < 120 && S.mode !== 'over'; i++) update(1 / 60);
  render();
  check(S.mode === 'over', 'game over draws with the fallen flag');
  RUN.force = null; reset(); S.mode = 'title';
})();
