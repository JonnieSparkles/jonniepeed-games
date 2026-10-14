// Sending a soldier home from the shop (round 20): half a rifleman's hire, one a visit, a freed slot to hire into,
// put back and undo like anything else (a hire into the freed slot goes back too), and the end cards' line.
(function () {
  function check(ok, why) { if (!ok) throw new Error(why); }
  function slotBtn(r) { return document.querySelector('#shopSquadRow [data-recruit="' + r.id + '"]'); }
  RUN.force = 77; newGame(); S.wave = 9;
  var vet = makeRecruit(0, 'rifle'); vet.rank = 2; vet.name = 'Doodle'; vet.waves = 7; vet.kills = 12;
  var rook = makeRecruit(4, 'engineer');
  S.recruits = [vet, rook, makeRecruit(1, 'medic'), makeRecruit(5, 'rifle')]; // the four starting slots (SLOT_ORDER)
  S.players[0].tags = 300; openShop();
  var rifle = ITEMS.find(function (it) { return it.id === 'hire-rifle'; });
  var cost = SHOP.sendCost();
  check(cost % 5 === 0 && Math.abs(cost - price(rifle) / 2) <= 2.5, 'it costs half a rifleman: ' + cost + ' of ' + price(rifle));
  check(freeSlot(0) < 0 && /send someone home/.test(document.getElementById('hireNote').textContent), 'a full squad says how to make room');
  check(/send em home/.test(document.getElementById('squadHint').textContent), 'the hint');

  // Tap a soldier: their card and the button.
  var before = S.players[0].tags;
  slotBtn(vet).click();
  var box = document.getElementById('sendBox');
  check(S.players[0].tags === before && document.getElementById('shopCoins').textContent === before + ' → ' + (before - cost) + ' dog tags', 'picking spends nothing, and the tags show what it would leave');
  check(!box.hidden && /Cpl\. Doodle/.test(box.textContent) && /Rifleman · 7 waves, 12 kills/.test(box.textContent), 'the picked soldier: ' + box.textContent);
  check(/hand in their kit/.test(document.getElementById('squadHint').textContent), 'what happens');
  slotBtn(vet).click();
  check(box.hidden && document.getElementById('shopCoins').textContent === before + ' dog tags', 'tap again to let them be');

  // Send the rookie engineer home: tags, the slot, the chip, one a visit.
  var tags = S.players[0].tags, hiredBefore = S.mods.hired, priceBefore = price(rifle);
  slotBtn(rook).click(); box.querySelector('.send-home').click();
  check(S.players[0].tags === tags - cost && !S.recruits.some(function (r) { return r.id === rook.id; }), 'sent home and paid for');
  check(freeSlot(0) === 4 && S.mods.hired === hiredBefore && price(rifle) === priceBefore, 'the slot is free; hiring costs the same');
  check(/Rookie engineer ↩/.test(box.textContent) && /bring them back/.test(document.getElementById('squadHint').textContent), 'the chip');
  check(!SHOP.canSend(vet) && document.querySelector('#shopSquadRow button.squad-slot').disabled, 'one a visit');
  check(!takeItem(SHOP.SEND + vet.id), 'a second one is refused');
  check(S.sentHome.length === 0, 'a rookie has no name to list');

  // Hire into the freed slot, then bring the engineer back: the hire goes back too, with the tags.
  takeItem('hire-bazooka');
  var baz = S.recruits.find(function (r) { return r.type === 'bazooka' && r.slot === 4; });
  check(baz, 'hired into the freed slot');
  // Someone hired this visit can't be sent home (their chip under Hire puts them back for the full price).
  check(slotBtn(baz).disabled && baz.fresh && !SHOP.canSend(baz), 'a fresh hire stays');
  box.querySelector('.sent-chip').click();
  check(S.players[0].tags === tags && S.recruits.some(function (r) { return r.id === rook.id; }) && !S.recruits.some(function (r) { return r.type === 'bazooka'; }), 'back, and the hire with them');
  check(!SHOP.sentNow() && /send em home/.test(document.getElementById('squadHint').textContent), 'and you can pick again');

  // Undo takes it back too; a named soldier sent home is on the end cards.
  takeItem(SHOP.SEND + vet.id);
  check(/Undo send home/.test(document.getElementById('undoBtn').textContent) && S.sentHome.length === 1, 'undo names it, and a vet is listed');
  SHOP.undo();
  check(S.sentHome.length === 0 && S.recruits.some(function (r) { return r.id === vet.id; }), 'undo brings them back');
  takeItem(SHOP.SEND + vet.id); continueWave();
  check(S.sentHome[0].name === 'Cpl. Doodle', 'kept after the visit');
  // On the field, they salute at their old place, say goodbye, and walk off the nearer edge.
  var l = S.leavers[0];
  check(S.leavers.length === 1 && l.id === vet.id && l.x === 154 && S.bubbles.length >= 1, 'a goodbye on the field');
  for (var i = 0; i < 60; i++) update(1 / 60);
  check(S.leavers[0].x === 154, 'saluting first');
  for (i = 0; i < 60 * 8; i++) update(1 / 60);
  check(!S.leavers.length, 'then gone off the page');
  S.score = 10; showOver();
  check(/Sent home: Cpl\. Doodle \(7 waves, 12 kills\)\./.test(document.getElementById('overFallen').textContent), 'the game-over card: ' + document.getElementById('overFallen').textContent);
  overScreen.hidden = true; LBOARD.clear();

  // A fresh hire, with nobody sent home yet: greyed, refused; the others can still go.
  newGame(); S.recruits = [makeRecruit(0, 'rifle')]; S.players[0].tags = 500; openShop(); takeItem('hire-sniper');
  var fresh = S.recruits.find(function (r) { return r.type === 'sniper'; });
  check(!SHOP.sentNow() && slotBtn(fresh).disabled && !SHOP.canSend(fresh) && !takeItem(SHOP.SEND + fresh.id), 'a fresh hire stays');
  check(!slotBtn(S.recruits[0]).disabled && SHOP.canSend(S.recruits[0]), 'the others can still go');
  shopScreen.hidden = true; S.shop = null;

  // Not enough tags: the button says how many more.
  newGame(); S.recruits = [makeRecruit(0, 'rifle')]; openShop(); S.players[0].tags = 0; renderShop();
  document.querySelector('#shopSquadRow button.squad-slot').click();
  check(document.querySelector('.send-home').disabled && /need \d+ more/.test(document.querySelector('.send-home').textContent), 'short of tags');
  shopScreen.hidden = true; S.shop = null; RUN.force = null; reset(); S.mode = 'title';
})();
