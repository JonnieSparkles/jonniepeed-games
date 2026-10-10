// Veteran (docs/games/stick-army/veteran.md): Soldier unchanged; Veteran's prices, waves from 10, Dreadnought, smoke
// and spread shot; the picker, records, boards and play stats per level.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function run(sec) { for (var i = 0; i < Math.ceil(sec * 60); i++) update(1 / 60); }
  var KEYS = ['stickarmy.level', 'stickarmy.veteran.seen', 'stickarmy.veteran.best', 'stickarmy.veteran.wins', 'stickarmy.veteran.bestWave', 'stickarmy.best.3'];
  var saved = KEYS.map(function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } });
  function as(name) { level = name; RUN.force = 5; newGame(); RUN.force = null; }

  // Soldier is the game as it was: no multipliers anywhere.
  var L = LEVELS.soldier;
  check(L.PRICE === 1 && L.FROM === Infinity && L.PLANES === 1 && L.ARMOR === 0 && L.DREAD === 1 && L.SMOKE === 1 && L.GRAZE === 1 && L.BOARD === BOARD, 'Soldier changes nothing');
  check(LEVELS.veteran.BOARD === VETERAN_BOARD && VETERAN_BOARD !== BOARD, 'Veteran has its own board');

  // Waves: the same up to wave 9 and on boss waves; more planes and armor from 10.
  as('soldier');
  var soldier = [9, 11, 12, 15, 19, 20].map(waveCfg), pizza = ITEMS.find(function (it) { return it.id === 'pizza'; }), fire = ITEMS.find(function (it) { return it.id === 'fire'; });
  S.wave = 1; var soldierFirst = SHOP.price(fire);
  S.wave = 12; var soldierPrice = SHOP.price(fire), soldierPizza = SHOP.price(pizza), soldierGun = CAMPAIGN.turretHP(20);
  as('veteran');
  var vet = [9, 11, 12, 15, 19, 20].map(waveCfg);
  check(vet[0].planes === soldier[0].planes && vet[0].armorChance === soldier[0].armorChance, 'wave 9 is the same');
  check(vet[1].planes === Math.round(soldier[1].planes * 1.2) && vet[2].planes > soldier[2].planes && vet[4].planes > soldier[4].planes, 'more planes from wave 10 (11: 10 is a boss wave)');
  check(vet[2].armorChance > soldier[2].armorChance && vet[4].armorChance <= 0.75, 'more armor from wave 10');
  check(vet[3].planes === soldier[3].planes && vet[5].planes === soldier[5].planes, 'boss waves keep their shape');
  S.wave = 1;
  check(SHOP.price(fire) === soldierFirst && SHOP.price(pizza) === 25, 'no markup on wave 1');
  S.wave = 12;
  check(SHOP.price(fire) > soldierPrice && SHOP.price(fire) % 5 === 0, 'prices are up by wave 10, still in fives');
  check(soldierPizza === 25 && SHOP.price(pizza) === 35, 'the pizza too, by wave 10');
  check(CAMPAIGN.turretHP(20) === Math.round(soldierGun * LEVELS.veteran.DREAD), "the Dreadnought's health follows DREAD");
  SKY.smokeStart(1); S.smoke.t = 12; SKY.smokeClear();
  check(S.smoke.linger === 18, 'the smoke lingers half again as long');
  S.smoke = null;

  // Spread shot's side bullets only graze the Dreadnought on Veteran (GRAZE of the damage), and hurt it fully on Soldier.
  function gunTest(name) {
    as(name); S.recruits = []; S.mods.maxHP = S.wallHP = 1e6;
    startWave(DREAD.WAVE); S.spawn.teaser = false; S.spawn.planes = S.spawn.bombers = 0;
    var p = null;
    for (var i = 0; i < 60 * 60 && !(p && p.phase === 'guns' && !(p.hold > 0)); i++) { update(1 / 60); S.wallHP = 1e6; S.bombs = []; p = CAMPAIGN.dread(); }
    check(p && p.phase === 'guns', 'the Dreadnought is in the fight');
    var at = dreadTargets().filter(function (q) { return q.part === 'gun'; })[0];
    function guns() { return p.turrets.reduce(function (sum, t) { return sum + t.hp; }, 0); }
    function bullet(side) { return { x: at.x, y: at.y, vx: 0, vy: -700, owner: 'player', kind: 'bullet', flak: false, pierce: 1, hits: [], life: 1, dead: false, side: side }; }
    var hp = guns(); hitTest(bullet(true));
    var sideHurt = hp - guns(); hp = guns(); hitTest(bullet(false));
    return { side: sideHurt, middle: hp - guns(), told: !!S.grazeTold };
  }
  var v = gunTest('veteran'), s = gunTest('soldier');
  check(Math.abs(v.side - v.middle * LEVELS.veteran.GRAZE) < 1e-9 && v.side < v.middle && v.told, 'Veteran: the side bullet grazes it and says so; the middle one hurts in full');
  check(s.side === s.middle && s.side > 0 && !s.told, 'Soldier: every bullet hurts the same');

  // The picker: remembered, ticked, and the "new" tag goes once Veteran is picked.
  try { localStorage.removeItem('stickarmy.veteran.seen'); } catch (e) { /* ignore */ }
  level = 'soldier'; titleScene();
  check(!document.getElementById('vetNew').hidden, 'Veteran wears a new tag');
  document.querySelector('.t-rank[data-level="veteran"]').click();
  check(level === 'veteran' && S.level === 'veteran' && load('stickarmy.level', '') === 'veteran', 'picked and remembered');
  check(document.querySelector('.t-rank[data-level="veteran"]').getAttribute('aria-checked') === 'true' && document.getElementById('vetNew').hidden, 'ticked, and no longer new');
  check(world.levelBoard() === VETERAN_BOARD, 'the title shows the Veteran board');
  LBOARD.openScores();
  check(document.querySelector('#scoresScreen [aria-selected="true"]').dataset.level === 'veteran', 'High scores opens on the Veteran tab');
  document.querySelector('#scoresScreen [data-level="soldier"]').click();
  check(document.querySelector('#scoresScreen [aria-selected="true"]').dataset.level === 'soldier', 'and the Soldier tab works');
  LBOARD.closeScores();

  // A Veteran run: its own records, its badge, its board and its play stats.
  try { localStorage.setItem('stickarmy.best.3', '777'); localStorage.removeItem('stickarmy.veteran.best'); } catch (e) { /* ignore */ }
  level = 'veteran'; titleScene(); newGame();
  check(S.level === 'veteran' && world.levelBoard() === VETERAN_BOARD && runReport().stats.level === 'veteran', 'a Veteran run: board 2, reported as Veteran');
  S.score = 5000; S.wave = 7; showOver();
  check(load('stickarmy.veteran.best', 0) === 5000 && load('stickarmy.best.3', 0) === 777, 'its best is kept apart');
  check(load('stickarmy.veteran.bestWave', 0) === 7, 'and its best wave');
  check(!document.getElementById('overLevel').hidden, 'the card says Veteran');
  overScreen.hidden = true; LBOARD.clear();
  level = 'soldier'; newGame(); S.score = 10; showOver();
  check(document.getElementById('overLevel').hidden && !('level' in runReport().stats) && load('stickarmy.best.3', 0) === 777, 'a Soldier run is as before');
  overScreen.hidden = true; LBOARD.clear();

  KEYS.forEach(function (k, i) { try { if (saved[i] == null) localStorage.removeItem(k); else localStorage.setItem(k, saved[i]); } catch (e) { /* ignore */ } });
  level = 'soldier'; RUN.force = null; reset(); S.mode = 'title';
})();
