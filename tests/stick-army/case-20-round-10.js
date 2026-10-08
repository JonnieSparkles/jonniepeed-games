// Round 10 playtest fixes: shop put-back and undo, the Red Cross penalty you feel, a hotter gun late, armored cargo
// and tanks that land, and speech bubbles.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  function item(id) { return ITEMS.find(function (it) { return it.id === id; }); }

  // The shop: a packed supply goes back with a tap, and the tags come back. Undo puts back the last thing taken,
  // hires included. Putting back a slot also puts back the hire that needed it.
  RUN.force = 81; newGame(); S.wave = 5; S.coins = 500; S.mods.slots = 4; S.recruits = [makeRecruit(0, 'rifle'), makeRecruit(4, 'rifle'), makeRecruit(1, 'rifle')];
  openShop(); var coins0 = S.coins, wall0 = S.wallHP;
  var pick = S.shop.items.find(function (it) { return it.id !== 'pizza' && it.id !== S.shop.gift && eligible(it) && costNow(it) <= S.coins; });
  check(takeItem(pick.id) && S.coins === coins0 - price(pick), 'buy a supply');
  var row = document.querySelector('#supplyItems [data-item="' + pick.id + '"]');
  check(!row.disabled && /put back/.test(row.textContent) && !document.getElementById('undoBtn').hidden, 'it can go back');
  row.click();
  check(S.coins === coins0 && !S.shop.bought[pick.id] && !(S.mods.stacks[pick.id]) && document.getElementById('undoBtn').hidden, 'put back: tags refunded, nothing packed');
  takeItem('hire-rifle'); var hired = S.recruits.length;
  check(hired === 4 && S.mods.hired === 1, 'hire one');
  document.getElementById('undoBtn').click();
  check(S.recruits.length === 3 && S.mods.hired === 0 && S.coins === coins0, 'undo puts the hire back');
  // Room for one more, then a hire into it: putting back the slot puts back the hire too.
  S.shop.items.push(item('slot'));
  takeItem('slot'); takeItem('hire-rifle'); takeItem('hire-engineer');
  check(S.mods.slots === 5 && S.recruits.length === 5, 'a slot and two hires');
  SHOP.putBack('slot');
  check(S.mods.slots === 4 && S.recruits.length === 4 && S.coins === coins0 - (35 + 0), 'without the slot only one hire fits: ' + S.coins);
  check(S.wallHP === wall0, 'the wall is as it was');
  shopScreen.hidden = true; S.shop = null; S.mode = 'play';

  // The Red Cross plane: the tags fly out of the counter, which flashes red, and late in the run it costs more.
  RUN.force = 82; newGame(); startWave(12); S.coins = 200; S.combo = 4; S.comboT = 1; S.parts = [];
  check(waveCfg(9).medevac === 1 && waveCfg(10).medevac === 2 && waveCfg(13).medevac === 3, 'more Red Cross planes late');
  var med = SKY.spawnMedevac(RW); med.x = 200;
  hitTest({ x: med.x, y: med.y, vx: 0, vy: -1, owner: 'player', kind: 'bullet', life: 1, dead: false });
  check(S.coins === 200 - SKY.medevacTags(12) && SKY.medevacTags(12) > SKY.MEDEVAC.TAGS && S.tagLoss > 0 && S.parts.some(function (q) { return q.k === 'tagout'; }), 'tags fly out of the counter');
  render(); run(0.3); render();

  // The gun runs hotter from wave 10, so holding the trigger stops working late.
  RUN.force = 83; newGame(); startWave(4); S.heat = 0; S.fireCD = 0; fireVolley(); var early = S.heat;
  startWave(15); S.heat = 0; S.fireCD = 0; fireVolley();
  check(S.heat > early * 1.25 && heatScale(9) === 1, 'the gun runs hotter late: ' + early + ' -> ' + S.heat);

  // Tanks: armored cargo planes, and a tank on its chutes shrugs off bullets.
  RUN.force = 84; newGame(); startWave(12); S.spawn.timer = S.spawn.cargoT = S.spawn.roadT = S.spawn.rushT = 99;
  spawnCargo(); var cargo = S.planes[S.planes.length - 1];
  check(cargo.hp === UNITS.cargoHP(12) && cargo.hp >= 8, 'cargo planes are armored');
  damagePlane(cargo, 1, 'player'); render();
  S.tanks.push({ id: 9100, x: 300, y: 300, state: 'chute', dir: -1, hp: 20, maxHp: 20, shellT: 1, hitFlash: 0, tread: 0, dead: false });
  var tk = S.tanks[S.tanks.length - 1], b = { x: tk.x, y: tk.y, vx: 0, vy: -1, owner: 'player', kind: 'bullet', life: 1, dead: false };
  hitTest(b);
  check(b.dead && tk.hp === 20, 'bullets ping off a tank on its chutes');
  tk.state = 'roll'; b = { x: tk.x, y: tk.y, vx: 0, vy: -1, owner: 'player', kind: 'bullet', life: 1, dead: false }; hitTest(b);
  check(tk.hp < 20, 'and chip it once it lands');

  // Speech bubbles: over the soldier speaking (following him), or at a spot for the enemy.
  RUN.force = 85; newGame(); startWave(6); S.bubbles = [];
  var r = makeRecruit(0, 'rifle'); S.recruits = [r];
  world.say('medic!', r.id);
  world.say('charge!', 999, true, 0, 40, GROUND - 60);
  world.say('nobody', 12345);
  check(S.bubbles.length === 2 && S.bubbles[0].s === 'Medic!' && S.bubbles[0].rid === r.id && S.bubbles[1].enemy, 'a bubble for each speaker');
  r.x += 30; run(0.1);
  check(S.bubbles[0].x === r.x, 'it follows him');
  render(); run(BUBBLE.LIFE + 0.1);
  check(!S.bubbles.length, 'and goes');

  // The title card: the record sits on one line under the keys.
  try { localStorage.setItem('stickarmy.wins', '1'); localStorage.setItem('stickarmy.bestWave', '17'); } catch (e) { /* ignore */ }
  best = 1234; titleScene();
  check(!document.getElementById('recordLine').hidden && /1,234/.test(document.getElementById('bestLine').textContent) && /Won once/.test(document.getElementById('winLine').textContent), 'the title card shows the record');
  try { localStorage.removeItem('stickarmy.wins'); localStorage.removeItem('stickarmy.bestWave'); } catch (e) { /* ignore */ }
  best = 0;

  RUN.force = null; reset(); titleScene(); render();
})();
